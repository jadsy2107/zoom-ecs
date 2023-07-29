import axios from 'axios'
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import dotenv from 'dotenv'; // Import dotenv for loading environment variables from .env file
import { parse } from 'csv-parse';
import fs from 'fs';
import SambaClient from 'samba-client';

dotenv.config() // Load environment variables from .env file

const CREDENTIALS_HEADER = {
    headers: { Accept: 'application/json',
              Authorization: 'Basic '+btoa(process.env.ZOOM_APP_CLIENT_ID+':'+process.env.ZOOM_APP_CLIENT_SECRET) 
    },
}

const logLocaleOptions: Intl.DateTimeFormatOptions = {
    second: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour12: true,
};
  
function timestampLog(message: any) {
    const timestamp = new Date().toLocaleString('en-AU', logLocaleOptions)
    console.log(`${timestamp} - ${message}`);
}

function contactsAreEqual(a: any, b: any) {
    return a.id === b.id
        && a.name === b.name
        && a.email === b.email
        && a.description === b.description
        && JSON.stringify(JSON.parse(a.phone_numbers)) === JSON.stringify(b.phone_numbers) // parsing `a.phone_numbers` to an array before comparison
        && a.auto_call_recorded === b.auto_call_recorded
}

async function updateContact(externalContactId: any, contact: any) {
    try {
        const response = await axios.post(
            'https://zoom.us/oauth/token?grant_type=account_credentials&account_id='+process.env.ZOOM_APP_ACCOUNT_ID, 
            '', 
            CREDENTIALS_HEADER
        );

        const access_token = response.data.access_token;

        const AUTHORIZED_HEADER = { 
            headers: { 
                Accept: 'application/json',
                Authorization: 'Bearer '+access_token,
                'Content-Type': 'application/json',
            },
        };

        const patchResponse = await axios.patch(
            `https://api.zoom.us/v2/phone/external_contacts/${externalContactId}`, 
            contact, 
            AUTHORIZED_HEADER
        );

        if (patchResponse.status === 204) {
            timestampLog(`Updated Zoom record for ${contact.id}: ${contact.name}`)
            return true;
        } else {
            timestampLog(`Failed to update ${contact.id}: ${contact.name} to Zoom. Status code: ${patchResponse.status}`);
            return false;
        }
    } catch (error: any) {
        if (error.response) {
            timestampLog(`Failed to update ${contact.id}: ${contact.name} to Zoom. ${error.response.data.message}`)
        } else {
            timestampLog(`Failed to update ${contact.id}: ${contact.name} to Zoom. ${error.message}`)
        }
        return false;
    }
}


async function addContact(contact: any) {
    try {
        const response = await axios.post(
            'https://zoom.us/oauth/token?grant_type=account_credentials&account_id='+process.env.ZOOM_APP_ACCOUNT_ID, 
            '', 
            CREDENTIALS_HEADER
        );

        const access_token = response.data.access_token;

        const AUTHORIZED_HEADER = { 
            headers: { 
                Accept: 'application/json',
                Authorization: 'Bearer '+access_token,
                'Content-Type': 'application/json',
            },
        };

        const postResponse = await axios.post(
            'https://api.zoom.us/v2/phone/external_contacts', 
            contact, 
            AUTHORIZED_HEADER
        );

        if (postResponse.status === 201) {
            timestampLog(`${contact.id}: ${contact.name} added to Zoom.`)
            return true;
        } else {
            timestampLog(`Failed to add ${contact.id}: ${contact.name} to Zoom. Status code: ${postResponse.status}`);
            return false;
        }
    } catch (error: any) {
        if (error.response) {
            timestampLog(`Failed to add ${contact.id}: ${contact.name} to Zoom. ${error.response.data.message}`)
        } else {
            timestampLog(`Failed to add ${contact.id}: ${contact.name} to Zoom. ${error.message}`)
        }
        return false;
    }    
}

async function fetchAndStoreExternalContacts() {
    let access_token = await axios
    .post('https://zoom.us/oauth/token?grant_type=account_credentials&account_id='+process.env.ZOOM_APP_ACCOUNT_ID, '', CREDENTIALS_HEADER)
    .then((response) => {
        return response.data.access_token
    })
    .catch((e) => {
        console.error(e)
    })
    // Create authorized header using the access_token
    const AUTHORIZED_HEADER = { 
        headers: { Accept: 'application/json',
                    Authorization: 'Bearer '+access_token
        },
    }
    // Open the SQLite database
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database,
    });

    // Create the table if it doesn't exist already
    await db.run(`
        CREATE TABLE IF NOT EXISTS external_contacts(
            name TEXT,
            email TEXT,
            description TEXT,
            external_contact_id TEXT,
            id TEXT PRIMARY KEY,
            routing_path TEXT,
            phone_numbers TEXT,
            auto_call_recorded INTEGER
        );
    `);

    let nextPageToken: string | null = null;
    let record_count = 0;

    do {
        // Make the API call
        const response: any = await axios.get('https://api.zoom.us/v2/phone/external_contacts', {
            params: {
                page_size: 300,
                next_page_token: nextPageToken,
            },
            headers: AUTHORIZED_HEADER.headers
        });

        const { data } = response;
        // Store the contacts in the database
        for (const contact of data.external_contacts) {
            await db.run(
                `
                    INSERT OR REPLACE INTO external_contacts
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                `,
                contact.name,
                contact.email,
                contact.description,
                contact.external_contact_id,
                contact.id,
                contact.routing_path,
                JSON.stringify(contact.phone_numbers),
                contact.auto_call_recorded ? 1 : 0
            );
        }

        // Update nextPageToken to fetch the next set of results
        nextPageToken = data.next_page_token;
        timestampLog(`Retrieved ${record_count + 1} - ${record_count + data.external_contacts.length} of ${data.total_records}`);
        record_count += data.external_contacts.length;

    } while (nextPageToken);

    await db.close();
}

async function retrieveCsv() {
    // define samba share credentials
    const client = new SambaClient({
        address: process.env.SAMBA_ADDRESS ?? '', 
        username: process.env.SAMBA_USERNAME ?? '', 
        password: process.env.SAMBA_PASSWORD ?? '', 
        domain: process.env.SAMBA_DOMAIN ?? '', 
        maxProtocol: 'SMB3', 
        maskCmd: true, 
    });

    try {
        // define the remote path
        const remotePath = '/PE contacts.csv'; // replace this with the actual path
        const localPath = './contacts.csv'; // local file path

        // download the file
        await client.getFile(remotePath, localPath);
        // console.log(await client.dir('/'))
        // console.log('File downloaded successfully.');
    } catch (error) {
        console.error('Error downloading file:', error);
    }
}


async function processCSVAndUpdateContacts() {
    return new Promise<void>(async (resolve, reject) => {
        const input = fs.readFileSync('./contacts.csv', 'utf8');
        const records: any = [];

        // Initialize the parser
        const parser = parse({
            delimiter: ',',
            columns: true,
            skip_empty_lines: true
        });

        // Use the readable stream API to consume records
        parser.on('readable', function() {
            let record;
            while ((record = parser.read()) !== null) {
                records.push(record);
            }
        });

        // Catch any error
        parser.on('error', function(err: any) {
            console.error(err.message);
        });

        // Once the parsing is finished, process the records
        parser.on('end', async function() {
            const db = await open({
                filename: './database.sqlite',
                driver: sqlite3.Database,
            });

            for (const record of records) {
                const result = await db.get('SELECT * FROM external_contacts WHERE id = ?', record.ID);
                const csvContact = {
                    id: record.ID,
                    name: record['Name (Required)'].trim(),
                    email: record.Email.trim(),
                    phone_numbers: record['Phone Number'].split(',').map((phone: string) => phone.trim().replace(/\s/g, '')),
                    description: record.Description.trim(),
                    auto_call_recorded: record['Automatic Call Recording'] === 'Yes' ? 1 : 0
                };
                if (result) {
                    // The contact exists in the database, now compare it with the CSV version     
                    if (!contactsAreEqual(result, csvContact)) {
                        timestampLog(`Changes with contact ${result.id}: ${result.name}, Updating...`)
                        console.log("From: ", result)
                        console.log("To: ", csvContact)
                        if (await updateContact(result.external_contact_id, csvContact)) {
                            await db.run(
                                `
                                    UPDATE external_contacts SET name = ?, email = ?, description = ?, phone_numbers = ?, auto_call_recorded = ? WHERE id = ?
                                `,
                                csvContact.name,
                                csvContact.email,
                                csvContact.description,
                                JSON.stringify(csvContact.phone_numbers),
                                csvContact.auto_call_recorded,
                                csvContact.id
                            ).then((res) => {
                                if (res.changes === 1) {
                                    timestampLog(`Updated SQLite record for ${csvContact.id}: ${csvContact.name} `)
                                }
                            });
                        }

                    }
                } else {
                    // If the result is null, the contact does not exist in the SQLite database. Add the new contact.
                    timestampLog(`New contact ${csvContact.id}: ${csvContact.name}, Adding...`)
                    if (await addContact(csvContact)) {
                        await db.run(
                            `
                                INSERT INTO external_contacts (id, name, email, description, phone_numbers, auto_call_recorded) VALUES (?, ?, ?, ?, ?, ?)
                            `,
                            csvContact.id,
                            csvContact.name,
                            csvContact.email,
                            csvContact.description,
                            JSON.stringify(csvContact.phone_numbers),
                            csvContact.auto_call_recorded
                        ).then((res) => {
                            if (res.changes === 1) {
                                timestampLog(`Added SQLite record for ${csvContact.id}: ${csvContact.name} `)
                            }
                        });
                    }
                }
            }
            
            await db.close();
            resolve(records.length);
        });

        // Write data to the stream
        parser.write(input);
        // Close the readable stream
        parser.end();
    })
}

async function run() {
    timestampLog(`------ START CONTACT IMPORT --------`)
    timestampLog(`Retrieving external contacts from Zoom`)
    await fetchAndStoreExternalContacts()
    timestampLog(`Retrieving CSV file from ${process.env.SAMBA_ADDRESS}`)
    await retrieveCsv()
    timestampLog(`Reading CSV data and comparing with Zoom data`)
    timestampLog(`${await processCSVAndUpdateContacts()} records processed from CSV.`) // add await here
    timestampLog(`------ END CONTACT IMPORT ----------`)
}

run()
