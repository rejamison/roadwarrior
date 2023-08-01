const { google } = require('googleapis');
const keys = require('./keys/key.json');
const sheets = google.sheets('v4');
const drive = google.drive('v3');
const fs = require('fs');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'];

async function getAuthToken() {
    const auth = new google.auth.GoogleAuth({
        scopes: SCOPES
    });
    const authToken = await auth.fromJSON(keys);
    return authToken;
}

async function getSheet(spreadsheetId, auth) {
    const res = await sheets.spreadsheets.get({
        spreadsheetId,
        auth,
    });
    return res;
}

async function getSheetValues(spreadsheetId, sheetName, auth) {
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        auth,
        range: sheetName
    });
    return res;
}

async function download(id, auth, callback) {
    try {
        const res = await drive.files.get({fileId : id, auth: auth});
        const path = 'tmp/' + res.data.name;
        const f = fs.createWriteStream(path);
        const res2 = await drive.files.get({fileId: id, alt: 'media', auth: auth}, {responseType: 'stream'});
        return await new Promise((resolve, reject) => {
            res2.data.on('end', () => {
                console.log("Downloaded: " + path);
                f.close(() => {
                    resolve(path)
                });
            }).on('error', (err) => {
                console.error("Failed to download file with ID: " + id);
                reject(err);
            }).pipe(f);
        });
    } catch(err) {
        console.error("Failed to download file with ID: " + id);
        console.error(err);
    }
}

module.exports = {
    getAuthToken,
    getSheet,
    getSheetValues,
    download
}