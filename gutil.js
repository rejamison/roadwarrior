const { google } = require('googleapis');
const keys = require('./keys/gapi_key.json');
const sheets = google.sheets('v4');
const drive = google.drive('v3');
const fs = require('fs');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'];

/**
 *
 * @returns {Promise<JWT|Object>}
 */
async function getAuthToken() {
    const auth = new google.auth.GoogleAuth({
        scopes: SCOPES
    });
    return auth.fromJSON(keys);
}

/**
 *
 * @param {string} spreadsheetId
 * @param {JWT} auth
 * @returns {Promise<Object>}
 */
async function getSheet(spreadsheetId, auth) {
    return await sheets.spreadsheets.get({
        spreadsheetId,
        auth,
    });
}

/**
 *
 * @param {string} spreadsheetId
 * @param {string} sheetName
 * @param {JWT} auth
 * @returns {Promise<Object>}
 */
async function getSheetValues(spreadsheetId, sheetName, auth) {
    return await sheets.spreadsheets.values.get({
        spreadsheetId,
        auth,
        range: sheetName
    });
}

/**
 *
 * @param {string} id
 * @param {JWT} auth
 * @returns {Promise<string>}
 */
async function download(id, auth) {
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

        if(cloudTime > localTime || parseInt(cloudSize) !== localSize) {
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

async function upload(folderId, path, auth) {
    try {
        let name = path.lastIndexOf('/') > 0 ? path.slice(path.lastIndexOf('/') + 1) : path;
        // see if there's a file already there with this name
        const resList = await drive.files.list({
            q: 'name="' + name + '" and "' + folderId + '" in parents',
            auth: auth
        });

        if(resList.data.files.length === 0) {
            const res = await drive.files.create({
                resource: {
                    name: name,
                    parents: [folderId]
                },
                media: {
                    mimeType: 'image/png',
                    body: fs.createReadStream(path)
                },
                fields: 'id',
                auth: auth
            });
            console.log("Uploaded: " + path);
            return Promise.resolve(res.data.id);
        } else {
            const res = await drive.files.update({
                fileId: resList.data.files[0].id,
                media: {
                    mimeType: 'image/png',
                    body: fs.createReadStream(path)
                },
                fields: 'id',
                auth: auth
            });
            console.log("Updated: " + path);
            return Promise.resolve(res.data.id);
        }
    } catch(err) {
        console.error("Failed to upload file: " + path);
        console.error(err);
    }
}


module.exports = {
    getAuthToken,
    getSheet,
    getSheetValues,
    download,
    upload
}