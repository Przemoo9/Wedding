/**
 * Google Apps Script — Wedding RSVP Response Handler
 * Deploy as a Web App to receive form submissions from your site.
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com
 * 2. Create a new project
 * 3. Paste this entire file into the Code.gs editor
 * 4. Save the project (give it a name like "Wedding RSVP")
 * 5. Run the `createSheet` function once to set up the spreadsheet
 *    (You'll need to authorize it — it creates a new sheet in your Google Drive)
 * 6. Deploy > New deployment > Web App
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 7. Copy the Web App URL and paste it into scripts.js
 */

// ----- CONFIGURATION -----
// If you already have a spreadsheet, paste its ID here.
// Otherwise, run createSheet() to auto-create one.
const SPREADSHEET_ID = '1SEVtXba5_FdMeIuuKR_PZjG5fQup6DnLOYXbfOBHB3w';
const SHEET_NAME = 'RSVP Responses';

// ----- SHARED: Process form data and write to sheet -----
function processFormData(params) {
  const ss = getOrCreateSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  const headers = sheet.getDataRange().getValues()[0];

  const fullName = params.fullName || '';
  const attendance = params.attendance === 'accepts'
    ? 'Joyfully Accepts / Z radością przybędę'
    : 'Regretfully Declines / Z żalem odmawiam';
  const dietary = params.dietary || '';
  const song = params.song || '';

  const now = new Date();
  const rowData = [now, fullName, attendance, dietary, song];

  // Ensure headers exist
  if (headers.length === 0 || headers[0] !== 'Timestamp') {
    sheet.getRange(1, 1, 1, 5).setValues([[
      'Timestamp',
      'Full Name / Imię i Nazwisko',
      'Attendance / Obecność',
      'Dietary Restrictions / Dieta i Alergie',
      'Song Request / Piosenka'
    ]]);
  }

  // Append the row
  sheet.appendRow(rowData);
  return { success: true, message: 'RSVP received!' };
}

// ----- DO_POST: Receives navigator.sendBeacon JSON POST -----
function doPost(e) {
  try {
    let params;
    if (e && e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      params = e.parameter;
    } else {
      throw new Error('No data received');
    }

    const result = processFormData(params);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ----- DO_GET: Receives GET fallback with ?data=JSON -----
function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.data) {
      const parsed = JSON.parse(e.parameter.data);
      const result = processFormData(parsed);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'OK', message: 'Wedding RSVP endpoint is running.' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ----- CREATE SPREADSHEET (run once manually) -----
function createSheet() {
  const ss = SpreadsheetApp.create('Wedding RSVP Responses');
  const sheet = ss.getActiveSheet();
  sheet.setName(SHEET_NAME);
  sheet.getRange(1, 1, 1, 5).setValues([[
    'Timestamp',
    'Full Name / Imię i Nazwisko',
    'Attendance / Obecność',
    'Dietary Restrictions / Dieta i Alergie',
    'Song Request / Piosenka'
  ]]);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 5);
  Logger.log('Spreadsheet created! ID: ' + ss.getId());
  Logger.log('URL: ' + ss.getUrl());
  return ss;
}

// ----- HELPER: Get or create spreadsheet -----
function getOrCreateSpreadsheet() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } else {
    const existing = DriveApp.getFilesByName('Wedding RSVP Responses');
    if (existing.hasNext()) {
      return SpreadsheetApp.open(existing.next());
    }
    return createSheet();
  }
}

// ----- RESET: Clear all responses (keep headers) -----
function resetResponses() {
  const ss = getOrCreateSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (sheet) {
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
    }
  }
}