# Zoom External Contacts Sync 

This is a utility tool written in NodeJS which synchronizes contacts from a CSV file in a Samba share with Zoom's external contacts. The tool fetches external contacts from Zoom, downloads a CSV file containing contact data from a Samba share, compares the contacts, and then adds or updates the contact details on Zoom based on the data found in the CSV.

## Features

1. Fetches external contacts from Zoom API and stores in a local SQLite database.
2. Downloads a CSV file containing contact data from a Samba share.
3. Reads, processes and compares the CSV data with the local database.
4. Updates or adds contacts on Zoom based on the comparison result.

## Installation

**Note:** This tool requires Node.js 14.0 or higher.

```bash
# Clone the repository
git clone https://github.com/<Your_GitHub_Username>/contact-sync-tool.git

# Go to the project directory
cd contact-sync-tool

# Install the dependencies
npm install
```

## Configuration

Create a `.env` file in the root of the project and add your environment variables.

```env
ZOOM_APP_CLIENT_ID=<zoom_app_client_id>
ZOOM_APP_CLIENT_SECRET=<zoom_app_client_secret>
ZOOM_APP_ACCOUNT_ID=<zoom_app_account_id>
SAMBA_ADDRESS=<samba_address>
SAMBA_USERNAME=<samba_username>
SAMBA_PASSWORD=<samba_password>
SAMBA_DOMAIN=<samba_domain>
```

## Usage

```bash
# Run the tool
ts-node-script main.ts 
```

This will start the tool. It will fetch contacts from Zoom, download the CSV file from the Samba share, compare the contacts, and then update/add contacts on Zoom accordingly.

## How it works

The application is primarily split into the following main sections:

1. `timestampLog` function to log messages with timestamp.
2. `contactsAreEqual` function to compare if two contacts are equal.
3. `updateContact` and `addContact` functions to update and add contact to Zoom respectively.
4. `fetchAndStoreExternalContacts` function to fetch external contacts from Zoom and store them in SQLite.
5. `retrieveCsv` function to download the CSV file from the Samba share.
6. `processCSVAndUpdateContacts` function to process the CSV file and update/add contacts on Zoom.
7. The `run` function which is the main entry point of the application. It calls all the above functions in sequence.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
