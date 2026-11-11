/**
 * Google Sheets API Integration Service for Waheed ICU Manager
 */

import { PatientRecord, PatientStatus, DischargeStatus } from '../types/icu';

export const DEFAULT_SPREADSHEET_ID = '1xEBExHwdTPIBouJKDTC_zZePXRCTtn_A6AoFaxmSCTk';
export const DEFAULT_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1xEBExHwdTPIBouJKDTC_zZePXRCTtn_A6AoFaxmSCTk/edit?usp=drivesdk';

const SPREADSHEET_ID_KEY = 'waheed_icu_custom_sheet_id';

export function getSavedSpreadsheetId(): string {
  return localStorage.getItem(SPREADSHEET_ID_KEY) || DEFAULT_SPREADSHEET_ID;
}

export function saveSpreadsheetId(idOrUrl: string): string {
  const extracted = extractSpreadsheetId(idOrUrl);
  localStorage.setItem(SPREADSHEET_ID_KEY, extracted);
  return extracted;
}

export function extractSpreadsheetId(input: string): string {
  if (!input) return DEFAULT_SPREADSHEET_ID;
  const trimmed = input.trim();
  // Check if it's a URL
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * Get spreadsheet details and list of sheet/tab titles
 */
export async function getSpreadsheetDetails(
  spreadsheetId: string,
  accessToken: string
): Promise<{ title: string; sheets: string[] }> {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to fetch spreadsheet details (${res.status})`);
  }

  const data = await res.json();
  const title = data.properties?.title || 'ICU Spreadsheet';
  const sheets = (data.sheets || []).map((s: any) => s.properties?.title || 'Sheet1');
  return { title, sheets };
}

/**
 * Standard column headers
 */
export const ICU_SHEET_HEADERS = [
  'Medical No',
  'Patient Name',
  'Status',
  'Admission Date',
  'Admission Time',
  'Admitted From',
  'Diagnosis',
  'PU or Wounds',
  'Discharge Date',
  'Discharge Time',
  'Discharge Status',
  'Transfer Location',
  'Discharge Reason',
  'Length of Stay',
];

/**
 * Read all patient records from Google Sheet
 */
export async function readRecordsFromSheet(
  spreadsheetId: string,
  accessToken: string
): Promise<{ records: PatientRecord[]; sheetTitle: string }> {
  // 1. Get first sheet name
  const meta = await getSpreadsheetDetails(spreadsheetId, accessToken);
  const targetSheet = meta.sheets[0] || 'Sheet1';

  // 2. Read all values
  const range = encodeURIComponent(`${targetSheet}!A1:Z`);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to read values (${res.status})`);
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  if (rows.length <= 1) {
    // Empty or only header
    return { records: [], sheetTitle: targetSheet };
  }

  // 3. Find column indices from header row
  const headerRow = rows[0].map((h: any) => String(h || '').trim().toLowerCase());
  
  const colIndex = {
    medicalNo: headerRow.findIndex(h => h.includes('medical') || h.includes('رقم')),
    patientName: headerRow.findIndex(h => h.includes('name') || h.includes('اسم') || h.includes('patient')),
    status: headerRow.findIndex(h => h.includes('status') || h.includes('حالة')),
    admissionDate: headerRow.findIndex(h => h.includes('adm') && h.includes('date') || h.includes('تاريخ الدخول')),
    admissionTime: headerRow.findIndex(h => h.includes('adm') && h.includes('time') || h.includes('وقت الدخول')),
    fromLocation: headerRow.findIndex(h => h.includes('from') || h.includes('admitted from') || h.includes('جهة')),
    diagnosis: headerRow.findIndex(h => h.includes('diagnosis') || h.includes('تشخيص')),
    pu: headerRow.findIndex(h => h.includes('pu') || h.includes('wound') || h.includes('قرح')),
    dischargeDate: headerRow.findIndex(h => h.includes('dis') && h.includes('date') || h.includes('تاريخ الخروج')),
    dischargeTime: headerRow.findIndex(h => h.includes('dis') && h.includes('time') || h.includes('وقت الخروج')),
    dischargeStatus: headerRow.findIndex(h => h.includes('discharge status') || h.includes('حالة الخروج')),
    transferLocation: headerRow.findIndex(h => h.includes('transfer') || h.includes('محول')),
    dischargeReason: headerRow.findIndex(h => h.includes('reason') || h.includes('ملاحظات')),
    lengthOfStay: headerRow.findIndex(h => h.includes('stay') || h.includes('إقامة') || h.includes('length')),
  };

  // Fallbacks if headers weren't named identically
  const getCol = (idx: number, fallback: number) => (idx !== -1 ? idx : fallback);
  const idxMno = getCol(colIndex.medicalNo, 0);
  const idxName = getCol(colIndex.patientName, 1);
  const idxStatus = getCol(colIndex.status, 2);
  const idxAdmDate = getCol(colIndex.admissionDate, 3);
  const idxAdmTime = getCol(colIndex.admissionTime, 4);
  const idxFrom = getCol(colIndex.fromLocation, 5);
  const idxDiag = getCol(colIndex.diagnosis, 6);
  const idxPu = getCol(colIndex.pu, 7);
  const idxDisDate = getCol(colIndex.dischargeDate, 8);
  const idxDisTime = getCol(colIndex.dischargeTime, 9);
  const idxDisStatus = getCol(colIndex.dischargeStatus, 10);
  const idxTransLoc = getCol(colIndex.transferLocation, 11);
  const idxDisReason = getCol(colIndex.dischargeReason, 12);
  const idxStay = getCol(colIndex.lengthOfStay, 13);

  const parsedRecords: PatientRecord[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const mno = String(row[idxMno] || '').trim();
    const name = String(row[idxName] || '').trim();
    if (!mno && !name) continue;

    const rawStatus = String(row[idxStatus] || '').trim();
    const status: PatientStatus = rawStatus.toLowerCase() === 'active' || rawStatus === 'منوم' ? 'Active' : 'Discharged';
    const admDate = String(row[idxAdmDate] || '').trim();
    const disDate = String(row[idxDisDate] || '').trim();
    const rawStay = String(row[idxStay] || '').replace(/[^0-9]/g, '');

    parsedRecords.push({
      id: 'sheet-' + (mno || i),
      medicalNo: mno,
      patientName: name,
      status: status,
      admissionDate: admDate,
      admissionTime: String(row[idxAdmTime] || '12:00').trim(),
      fromLocation: String(row[idxFrom] || '').trim(),
      diagnosis: String(row[idxDiag] || '').trim(),
      pu: String(row[idxPu] || 'None').trim(),
      dischargeDate: disDate || undefined,
      dischargeTime: String(row[idxDisTime] || '').trim() || undefined,
      dischargeStatus: (String(row[idxDisStatus] || '').trim() as any) || undefined,
      transferLocation: String(row[idxTransLoc] || '').trim() || undefined,
      dischargeReason: String(row[idxDisReason] || '').trim() || undefined,
      lengthOfStay: rawStay ? parseInt(rawStay, 10) : undefined,
    });
  }

  return { records: parsedRecords, sheetTitle: targetSheet };
}

/**
 * Write/Sync all records to Google Sheet
 */
export async function writeAllRecordsToSheet(
  spreadsheetId: string,
  accessToken: string,
  records: PatientRecord[]
): Promise<{ success: boolean; count: number }> {
  // 1. Get first sheet name
  const meta = await getSpreadsheetDetails(spreadsheetId, accessToken);
  const targetSheet = meta.sheets[0] || 'Sheet1';

  // 2. Prepare rows
  const rows: any[][] = [ICU_SHEET_HEADERS];

  records.forEach((r) => {
    rows.push([
      r.medicalNo,
      r.patientName,
      r.status,
      r.admissionDate,
      r.admissionTime || '',
      r.fromLocation || '',
      r.diagnosis || '',
      r.pu || 'None',
      r.dischargeDate || '',
      r.dischargeTime || '',
      r.dischargeStatus || '',
      r.transferLocation || '',
      r.dischargeReason || '',
      r.lengthOfStay ? `${r.lengthOfStay}d` : '',
    ]);
  });

  // 3. Clear existing values
  const clearRange = encodeURIComponent(`${targetSheet}!A1:Z`);
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearRange}:clear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  // 4. Write new values
  const writeRange = encodeURIComponent(`${targetSheet}!A1`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${writeRange}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `${targetSheet}!A1`,
        majorDimension: 'ROWS',
        values: rows,
      }),
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to update spreadsheet (${res.status})`);
  }

  return { success: true, count: records.length };
}

/**
 * Append single patient admission to Google Sheet
 */
export async function appendAdmissionToSheet(
  spreadsheetId: string,
  accessToken: string,
  patient: PatientRecord
): Promise<void> {
  const meta = await getSpreadsheetDetails(spreadsheetId, accessToken);
  const targetSheet = meta.sheets[0] || 'Sheet1';

  const row = [
    patient.medicalNo,
    patient.patientName,
    patient.status,
    patient.admissionDate,
    patient.admissionTime || '',
    patient.fromLocation || '',
    patient.diagnosis || '',
    patient.pu || 'None',
    '',
    '',
    '',
    '',
    '',
    '',
  ];

  const range = encodeURIComponent(`${targetSheet}!A:N`);
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [row],
      }),
    }
  );
}
