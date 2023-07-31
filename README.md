# Zoom External Contacts Sync 

The Zoom Contact Importer is a Node.js application that synchronizes a CSV contact list with Zoom external contact list. The application fetches contacts from a CSV file on a Samba share, compares the contact information with existing Zoom data, and performs updates on Zoom as necessary. The application also sends an email report detailing the updates performed.

## Features

- CSV contact import from a Samba share
- Contact synchronization with Zoom external contacts
- Email reporting of updates performed
- Hourly scheduling of contact synchronization and reporting

## Prerequisites

- Node.js
- An available Samba share with CSV contact list
- A Zoom account with API access
- An SMTP server for email notifications

## Environment Setup

Create a `.env` file in the project root with the following environment variables:

```dotenv
ZOOM_APP_CLIENT_ID=<Zoom client id>
ZOOM_APP_CLIENT_SECRET=<Zoom client secret>
ZOOM_APP_ACCOUNT_ID=<Zoom account id>
SAMBA_ADDRESS=<Samba server address>
SAMBA_USERNAME=<Samba server username>
SAMBA_PASSWORD=<Samba server password>
SAMBA_DOMAIN=<Samba server domain>
SMTP_SERVER=<SMTP server address>
SMTP_PORT=<SMTP server port>
EMAIL_SENDER=<Email sender>
EMAIL_RECIPIENT=<Email recipient>
```

## Installation

```bash
npm install
```

## Usage

Run the script using Node.js:

```bash
ts-node-script main.ts
```

The application will now run at the start of every hour, synchronizing the CSV contact list from the Samba share with the Zoom external contact list and sending an email report of the updates performed.

## Libraries Used

- [axios](https://www.npmjs.com/package/axios): Promise-based HTTP client for Node.js
- [dotenv](https://www.npmjs.com/package/dotenv): Zero-dependency module that loads environment variables from a `.env` file
- [csv-parse](https://www.npmjs.com/package/csv-parse): CSV file parsing module with comprehensive support for RFC4180 specification
- [fs](https://nodejs.dev/learn/the-nodejs-fs-module): Built-in Node.js module for working with the file system
- [samba-client](https://www.npmjs.com/package/samba-client): A simple samba client for node.js
- [nodemailer](https://www.npmjs.com/package/nodemailer): A module for Node.js to send emails
- [node-cron](https://www.npmjs.com/package/node-cron): Task scheduler in pure JavaScript for Node.js based on the cron syntax

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the terms of the MIT license. See [LICENSE](LICENSE) for more details.
