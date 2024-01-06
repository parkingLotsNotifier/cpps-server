const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

class GDriveUploader {
    constructor() {
        // Hardcoded credentials and token for testing
        this.credentials = {
            installed: {
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                redirect_uris: [process.env.REDIRECT_URIS]
            }
        };
        this.token = {
            access_token: process.env.ACCESS_TOKEN,
            refresh_token: process.env.REFRESH_TOKEN,
            scope: process.env.SCOPE,
            token_type: process.env.TOKEN_TYPE,
            expiry_date: true
        };
        this.auth = null;
    }

    async authenticate() {
        const { client_secret, client_id, redirect_uris } = this.credentials.installed;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        this.drive = google.drive({ version: 'v3', auth: oAuth2Client });

        // Set the token directly
        oAuth2Client.setCredentials(this.token);
        this.auth = oAuth2Client;
    }

    async createFolder(name, parentId = null) {
        const fileMetadata = {
            name: name,
            mimeType: 'application/vnd.google-apps.folder',
            ...(parentId && { parents: [parentId] }),
        };

        try {
            const response = await this.drive.files.create({
                resource: fileMetadata,
                fields: 'id',
            });
            return response.data.id;
        } catch (error) {
            throw new Error(`Error creating folder: ${error.message}`);
        }
    }

    async uploadFolder(localFolderPath, parentFolderId = null) {
        const folderName = path.basename(localFolderPath);
        console.log(`folder name : ${folderName}`);
        console.log(`folder path : ${localFolderPath}`);
        const newFolderId = await this.createFolder(folderName, parentFolderId);

        const files = fs.readdirSync(localFolderPath);
        for (const file of files) {
            const fullPath = path.join(localFolderPath, file);
            const stat = fs.statSync(fullPath);

            if (stat.isFile()) {
                await this.uploadFile(fullPath, newFolderId);
            } else if (stat.isDirectory()) {
                await this.uploadFolder(fullPath, newFolderId);
            }
        }
    }

    async uploadFile(filePath, parentFolderId = null) {
        const fileMetadata = {
            name: path.basename(filePath),
            ...(parentFolderId && { parents: [parentFolderId] }),
        };
        const media = {
            mimeType: mime.lookup(filePath), // Automatically detect the mime type
            body: fs.createReadStream(filePath), // Read the file stream
        };
    
        try {
            const response = await this.drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id',
            });
    
            console.log(`File uploaded: ${filePath} with id: ${response.data.id}`);
            return response.data.id;
        } catch (error) {
            throw new Error(`Error uploading file ${filePath}: ${error.message}`);
        }
    }
}

module.exports = GDriveUploader;
