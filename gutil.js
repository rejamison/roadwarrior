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
        const res = await drive.files.get({fileId : id, auth: auth, fields: 'name, modifiedTime, size'});
        const path = 'tmp/' + res.data.name;

        // check if the cloud file is newer
        const cloudTime = Date.parse(res.data.modifiedTime);
        const cloudSize = res.data.size;
        let localTime = 0;
        let localSize = 0;
        if(fs.existsSync(path)) {
            const localStats = fs.statSync(path);
            localTime = localStats.mtimeMs;
            localSize = localStats.size;
        }

        if(cloudTime > localTime || cloudSize != localSize) {
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
        } else {
            console.log("Using Cached: " + path);
            return Promise.resolve(path);
        }
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