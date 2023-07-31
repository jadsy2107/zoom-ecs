# Zoom External Contacts Sync 

## Overview
This tool is designed to synchronize contact data from a CSV file on a Samba server with the external contacts in a Zoom account. It retrieves all external contacts from Zoom, compares them with the data in the CSV file, and performs updates or additions as necessary. If any changes are made, it sends an email report summarizing the changes.

## Installation
1. Clone the repository:
```
git clone https://github.com/ngn-au/zoom-ecs-ts.git
```
2. Navigate to the project directory and install dependencies:
```
cd zoom-ecs-ts
npm install
```

## Environment Variables
Create a `.env` file in the project root and populate the following environment variables:

```
ZOOM_APP_CLIENT_ID=your_zoom_app_client_id
ZOOM_APP_CLIENT_SECRET=your_zoom_app_client_secret
ZOOM_APP_ACCOUNT_ID=your_zoom_app_account_id
SMTP_SERVER=your_smtp_server
SMTP_PORT=your_smtp_server_port
EMAIL_SENDER=your_email_sender
EMAIL_RECIPIENT=your_email_recipient
SAMBA_ADDRESS=your_samba_address
SAMBA_USERNAME=your_samba_username
SAMBA_PASSWORD=your_samba_password
SAMBA_DOMAIN=your_samba_domain
```

## Running the Script
Run the script with the following command:
```
ts-node-script main.ts
```
This will start the process, which is scheduled to run every hour.

## Key Functionalities
1. **Fetch and Store External Contacts**: Fetches all external contacts from the Zoom account and stores them in a local SQLite database.
2. **Retrieve CSV from Samba Server**: Connects to the specified Samba server, retrieves the CSV file containing the contact data, and stores it locally.
3. **Process CSV and Update Contacts**: Reads the CSV file, compares the contact data with the Zoom contacts data stored in the local SQLite database, and makes necessary updates or additions to the Zoom contacts.
4. **Send Notification Email**: If any updates or additions are made, the tool sends a summary report via email to the specified recipient.

## Technical Requirements
- Node.js >= 14.0.0
- Access to a Samba server
- A Zoom account with API access
- SMTP server for email notifications

## Dependencies
- axios
- sqlite3
- dotenv
- csv-parse
- fs
- samba-client
- nodemailer
- node-cron

## Contributing
Please submit issues and/or pull requests if you have suggestions or changes you'd like to make.

## License
This project is licensed under the MIT License.

