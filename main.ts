import axios from 'axios'
import dotenv from 'dotenv'; // Import dotenv for loading environment variables from .env file
import { parse } from 'csv-parse';
import fs from 'fs';
import SambaClient from 'samba-client';
import nodemailer from 'nodemailer';
import cron from 'node-cron';

dotenv.config() // Load environment variables from .env file

let emailContent = '';
const externalContacts = new Map();

const CREDENTIALS_HEADER = {
    headers: { Accept: 'application/json',
              Authorization: 'Basic '+btoa(process.env.ZOOM_APP_CLIENT_ID+':'+process.env.ZOOM_APP_CLIENT_SECRET) 
    },
}

async function getAccessToken() {
    try {
        const response = await axios.post(
            'https://zoom.us/oauth/token?grant_type=account_credentials&account_id='+process.env.ZOOM_APP_ACCOUNT_ID, 
            '', 
            CREDENTIALS_HEADER
        );
        return response.data.access_token;
    } catch (error) {
        console.error('Error fetching access token:', error);
        throw error;
    }
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
        && JSON.stringify(JSON.parse(a.phone_numbers)) === JSON.stringify(b.phone_numbers)
        && a.auto_call_recorded === b.auto_call_recorded
}

async function deleteContact(externalContactId: any) {
    try {
        const access_token = await getAccessToken();

        const AUTHORIZED_HEADER = { 
            headers: { 
                Accept: 'application/json',
                Authorization: 'Bearer '+access_token,
                'Content-Type': 'application/json',
            },
        };

        const deleteResponse = await axios.delete(
            `https://api.zoom.us/v2/phone/external_contacts/${externalContactId}`, 
            AUTHORIZED_HEADER
        );

        if (deleteResponse.status === 204) {
            let message = `Deleted Zoom record with external ID ${externalContactId}`;
            timestampLog(message);
            emailContent += message + '<br>';
            return true;
        } else {
            let message = `Error deleting Zoom record with external ID ${externalContactId}: ${deleteResponse.data}`;
            timestampLog(message);
            emailContent += message + '<br>';
            return false;
        }
    } catch (error: any) {
        let message;
        if (error.response) {
            message = `Failed to delete Zoom record with external ID ${externalContactId}. ${error.response.data.message}`;
        } else {
            message = `Failed to delete Zoom record with external ID ${externalContactId}. ${error.message}`;
        }
        timestampLog(message);
        emailContent += message + '<br>';
        return false;
    }
}

async function updateContact(externalContactId: any, contact: any) {
    console.log(contact.phone_numbers)
    try {
        const access_token = await getAccessToken();

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
            let message = `Updated Zoom record for ${contact.id}: ${contact.name}`;
            timestampLog(message);
            emailContent += message + '<br>';
            return true;
        } else {
            let message = `Error updating Zoom record for ${contact.id}: ${contact.name}: ${patchResponse.data}`;
            timestampLog(message);
            emailContent += message + '<br>';
            return false;
        }
    } catch (error: any) {
        let message;
        if (error.response) {
            message = `Failed to update ${contact.id}: ${contact.name} to Zoom. ${error.response.data.message}`;
        } else {
            message = `Failed to update ${contact.id}: ${contact.name} to Zoom. ${error.message}`;
        }
        timestampLog(message);
        emailContent += message + '<br>';
        return false;
    }
}

async function addContact(contact: any) {
    try {
        const access_token = await getAccessToken();

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
            let message = `${contact.id}: ${contact.name} added to Zoom.`;
            timestampLog(message);
            emailContent += message + '<br>';
            return true;
        } else {
            let message = `Error adding ${contact.id}: ${contact.name} to Zoom: ${postResponse.data}`;
            timestampLog(message);
            emailContent += message + '<br>';
            return false;
        }
    } catch (error: any) {
        let message;
        if (error.response) {
            message = `Failed to add ${contact.id}: ${contact.name} to Zoom. ${error.response.data.message}`;
        } else {
            message = `Failed to add ${contact.id}: ${contact.name} to Zoom. ${error.message}`;
        }
        timestampLog(message);
        emailContent += message + '<br>';
        return false;
    }
}

async function sendNotificationEmail() {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_SERVER,
        port: Number(process.env.SMTP_PORT || 25),
        secure: false,
    });

    const mailOptions = {
        from: process.env.EMAIL_SENDER,
        to: process.env.EMAIL_RECIPIENT,
        subject: 'Zoom Contacts Update Report',
        html: emailContent,
    };

    try {
        await transporter.sendMail(mailOptions);
        timestampLog(`Report email sent to: ${process.env.EMAIL_RECIPIENT}`);
    } catch (err) {
        timestampLog('Error sending email');
    }
}

async function fetchAndStoreExternalContacts() {
    const access_token = await getAccessToken();
    
    const AUTHORIZED_HEADER = { 
        headers: { Accept: 'application/json',
                    Authorization: 'Bearer '+access_token
        },
    }

    let nextPageToken: string | null = null;
    let record_count = 0;

    do {
        const response: any = await axios.get('https://api.zoom.us/v2/phone/external_contacts', {
            params: {
                page_size: 300,
                next_page_token: nextPageToken,
            },
            headers: AUTHORIZED_HEADER.headers
        });

        const { data } = response;
        for (const contact of data.external_contacts) {
            externalContacts.set(contact.id, {
                name: contact.name,
                email: contact.email,
                description: contact.description,
                external_contact_id: contact.external_contact_id,
                id: contact.id,
                routing_path: contact.routing_path,
                phone_numbers: JSON.stringify(contact.phone_numbers),
                auto_call_recorded: contact.auto_call_recorded ? 1 : 0
            });
        }

        nextPageToken = data.next_page_token;
        timestampLog(`Retrieved ${record_count + 1} - ${record_count + data.external_contacts.length} of ${data.total_records}`);
        record_count += data.external_contacts.length;

    } while (nextPageToken);
}

async function processCSVAndUpdateContacts() {
    return new Promise<Set<any>>(async (resolve, reject) => {
        const input = fs.readFileSync('./contacts.csv', 'utf8');
        const records: any = [];
        const csvIds: Set<any> = new Set();

        const parser = parse({
            delimiter: ',',
            columns: true,
            skip_empty_lines: true
        });

        parser.on('readable', function() {
            let record;
            while ((record = parser.read()) !== null) {
                records.push(record);
            }
        });

        parser.on('error', function(err: any) {
            console.error(err.message);
        });

        parser.on('end', async function() {
            for (const record of records) {
                const result = externalContacts.get(record.ID);
                const csvContact = {
                    id: record.ID,
                    name: record['Name (Required)'].trim(),
                    email: record.Email.trim(),
                    phone_numbers: record['Phone Number'].split(',').map((phone: string) => phone.trim().replace(/\s/g, '')),
                    description: record.Description.trim(),
                    auto_call_recorded: record['Automatic Call Recording'] === 'Yes' ? 1 : 0
                };

                if (result) {
                    if (!contactsAreEqual(result, csvContact)) {
                        timestampLog(`Changes with contact ${result.id}: ${result.name}, Updating...`)
                        console.log("From: ", result)
                        console.log("To: ", csvContact)
                        await updateContact(result.external_contact_id, csvContact)
                    }
                } else {
                    timestampLog(`New contact ${csvContact.id}: ${csvContact.name}, Adding...`)
                    await addContact(csvContact)
                }
                csvIds.add(record.ID);
            }

            resolve(csvIds);
        });

        parser.write(input);
        parser.end();
    })
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
        const remotePath = '/PE contacts.csv'; 
        const localPath = './contacts.csv';
        await client.getFile(remotePath, localPath);

    } catch (error) {
        console.error('Error downloading file:', error);
    }
}

const args = process.argv.slice(2); // This line gets the arguments passed in the command line

async function run() {
    try {
        emailContent = '';
        timestampLog(`------ START CONTACT IMPORT --------`)
        timestampLog(`Retrieving external contacts from Zoom`)
        await fetchAndStoreExternalContacts()
        timestampLog(`Retrieving CSV file from ${process.env.SAMBA_ADDRESS}`)
        await retrieveCsv()
        timestampLog(`Reading CSV data and comparing with Zoom data`)
        const csvIds = await processCSVAndUpdateContacts()
        timestampLog(`${csvIds.size} records processed from CSV.`)
        for (const [id, contact] of externalContacts.entries()) {
            if (!csvIds.has(id)) {
                timestampLog(`Contact ${id}: ${contact.name} not found in CSV, Deleting...`)
                await deleteContact(contact.external_contact_id)
            }
        }
        if (emailContent !== '') {
            timestampLog(`Sending report email`)
            await sendNotificationEmail();
        } else {
            timestampLog(`No changes found.`)
        }
        timestampLog(`------ END CONTACT IMPORT ----------`)
    } catch (error) {
        console.error('Error in main execution:', error);
    }
}

// If the first argument is '--now', the script will run immediately
if (args[0] === '--now') {
    run();
} else {
    // Otherwise, it will run on the cron schedule
    cron.schedule('0 * * * *', async () => {
        await run();
    });
}
