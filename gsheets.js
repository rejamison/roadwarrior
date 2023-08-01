const { google } = require('googleapis');
const keys = require('./keys/key.json');
const sheets = google.sheets('v4');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

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

module.exports = {
    getAuthToken,
    getSheet,
    getSheetValues
}