/**
 * Data Storage and Analytics Service for Waheed ICU Manager
 */

import { PatientRecord, MonthlyReportData, PeriodReportData, DashboardMonthData, DischargeStatus, PatientStatus } from '../types/icu';
import * as XLSX from 'xlsx';
import sheetData from './sheetData.json';
import {
  getLocalTodayDate,
  getLocalCurrentMonth,
  normalizeDateStr,
  normalizeTimeStr,
  parseYMD,
} from '../utils/dateFormatter';

const STORAGE_KEY = 'waheed_icu_records_v1';

// In-memory cache ensures operations succeed even on browsers/WebViews where localStorage is blocked or full
let memoryRecords: PatientRecord[] | null = null;

function safeLocalStorageGet(key: string): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function cleanMedicalNo(mno?: string | number | null): string {
  return String(mno ?? '').trim().replace(/^#+/, '').trim().toLowerCase();
}

function normalizeDischargeStatusValue(val?: string | null): DischargeStatus | 'Trans' | undefined {
  const s = String(val ?? '').trim();
  if (!s) return undefined;
  const upper = s.toUpperCase();
  if (upper === 'DIED') return 'DIED';
  if (upper.startsWith('TRANS')) return 'Trans';
  if (upper.startsWith('DAMA')) return 'DAMA';
  if (upper === 'DIS') return 'DIS';
  return s as DischargeStatus;
}

export function normalizeRecord(raw: any, index = 0): PatientRecord | null {
  if (!raw || typeof raw !== 'object') return null;

  const medicalNo = String(raw.medicalNo ?? '').trim().replace(/^#+/, '').trim();
  const patientName = String(raw.patientName ?? '').trim();
  if (!medicalNo && !patientName) return null;

  const rawStatus = String(raw.status ?? '').trim().toLowerCase();
  const status: PatientStatus =
    rawStatus === 'active' || rawStatus === 'منوم' ? 'Active' : 'Discharged';

  const admissionDate = normalizeDateStr(raw.admissionDate) || String(raw.admissionDate ?? '').trim();
  const admissionTime = normalizeTimeStr(raw.admissionTime, '12:00');
  const dischargeDate = status === 'Discharged'
    ? (normalizeDateStr(raw.dischargeDate) || String(raw.dischargeDate ?? '').trim() || undefined)
    : undefined;
  const dischargeTime = status === 'Discharged'
    ? (normalizeTimeStr(raw.dischargeTime) || undefined)
    : undefined;

  const parsedStay = typeof raw.lengthOfStay === 'number' && !isNaN(raw.lengthOfStay)
    ? raw.lengthOfStay
    : parseInt(String(raw.lengthOfStay ?? '').replace(/[^0-9]/g, ''), 10);

  return {
    id: String(raw.id || `icu-${medicalNo || index}-${index}`),
    medicalNo: medicalNo || `UNKNOWN-${index}`,
    patientName: patientName || (medicalNo ? `Patient #${medicalNo}` : 'Unknown'),
    status,
    admissionDate,
    admissionTime,
    fromLocation: String(raw.fromLocation ?? '').trim(),
    diagnosis: String(raw.diagnosis ?? '').trim(),
    pu: String(raw.pu ?? 'None').trim() || 'None',
    dischargeDate,
    dischargeTime,
    dischargeStatus: status === 'Discharged' ? normalizeDischargeStatusValue(raw.dischargeStatus) : undefined,
    transferLocation: String(raw.transferLocation ?? '').trim() || undefined,
    dischargeReason: String(raw.dischargeReason ?? '').trim() || undefined,
    lengthOfStay: !isNaN(parsedStay) && parsedStay > 0 ? parsedStay : undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

function normalizeRecordsList(list: any[]): PatientRecord[] {
  const result: PatientRecord[] = [];
  for (let i = 0; i < list.length; i++) {
    const norm = normalizeRecord(list[i], i);
    if (norm) result.push(norm);
  }
  return result;
}

// Real ICU records directly from Google Sheet (777 records), pre-normalized
const INITIAL_RECORDS: PatientRecord[] = normalizeRecordsList(Array.isArray(sheetData) ? sheetData : []);

export function getStoredRecords(): PatientRecord[] {
  if (memoryRecords && memoryRecords.length > 0) {
    return memoryRecords;
  }

  try {
    const raw = safeLocalStorageGet(STORAGE_KEY);
    if (!raw) {
      memoryRecords = [...INITIAL_RECORDS];
      safeLocalStorageSet(STORAGE_KEY, JSON.stringify(memoryRecords));
      return memoryRecords;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      memoryRecords = [...INITIAL_RECORDS];
      safeLocalStorageSet(STORAGE_KEY, JSON.stringify(memoryRecords));
      return memoryRecords;
    }

    const normalized = normalizeRecordsList(parsed);
    // If user has old small sample data (e.g. fewer than 50 records), automatically load the real 777 Google Sheet records!
    if (normalized.length < 50 && INITIAL_RECORDS.length > 50) {
      memoryRecords = [...INITIAL_RECORDS];
      safeLocalStorageSet(STORAGE_KEY, JSON.stringify(memoryRecords));
      return memoryRecords;
    }

    memoryRecords = normalized;
    return memoryRecords;
  } catch (err) {
    console.error('Failed to load ICU records from localStorage, falling back to bundled dataset:', err);
    memoryRecords = [...INITIAL_RECORDS];
    return memoryRecords;
  }
}

export function saveStoredRecords(records: PatientRecord[]): boolean {
  const normalized = normalizeRecordsList(records);
  memoryRecords = normalized;
  const persisted = safeLocalStorageSet(STORAGE_KEY, JSON.stringify(normalized));
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('icu-records-changed', { detail: normalized }));
    }
  } catch {
    // Ignore event dispatch failure on restricted environments
  }
  return persisted;
}

export function calculateDaysBetween(startDateStr: string, endDateStr: string): number {
  const s = parseYMD(startDateStr);
  const e = parseYMD(endDateStr);
  if (!s || !e) return 0;
  const startUTC = Date.UTC(s.year, s.month - 1, s.day);
  const endUTC = Date.UTC(e.year, e.month - 1, e.day);
  const diffDays = Math.round((endUTC - startUTC) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

/**
 * Find the most recent YYYY-MM in stored records (used when device clock has no matching records)
 */
export function getLatestRecordMonth(): string {
  const records = getStoredRecords();
  let latest = '';
  for (const r of records) {
    const admM = normalizeDateStr(r.admissionDate).slice(0, 7);
    if (admM && admM > latest) latest = admM;
    if (r.dischargeDate) {
      const disM = normalizeDateStr(r.dischargeDate).slice(0, 7);
      if (disM && disM > latest) latest = disM;
    }
  }
  return latest || getLocalCurrentMonth();
}

/**
 * Find active patient record by Medical No or exact record ID
 */
export function findActivePatient(medicalNo: string, recordId?: string): PatientRecord | null {
  const records = getStoredRecords();
  if (recordId) {
    const byId = records.find(r => r.id === recordId && r.status === 'Active');
    if (byId) return byId;
  }

  const cleanMno = cleanMedicalNo(medicalNo);
  if (!cleanMno) return null;

  // Prefer most recent active admission if duplicate MRNs exist
  const matches = records.filter(r => r.status === 'Active' && cleanMedicalNo(r.medicalNo) === cleanMno);
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];
  return [...matches].sort((a, b) => (b.admissionDate || '').localeCompare(a.admissionDate || ''))[0];
}

/**
 * Save new admission
 */
export function saveAdmission(data: {
  medicalNo: string;
  patientName: string;
  admissionDate: string;
  admissionTime: string;
  fromLocation: string;
  diagnosis: string;
  pu?: string;
}): { success: boolean; message: string; record?: PatientRecord } {
  const records = getStoredRecords();
  const cleanMno = cleanMedicalNo(data.medicalNo);
  const normalizedAdmDate = normalizeDateStr(data.admissionDate) || getLocalTodayDate();
  const normalizedAdmTime = normalizeTimeStr(data.admissionTime, '12:00');

  // Check if patient already active
  const existingActive = records.find(
    r => r.status === 'Active' && cleanMedicalNo(r.medicalNo) === cleanMno
  );
  if (existingActive) {
    return {
      success: false,
      message: `المريض مسجل كحالة نشطة بالفعل (Medical No: ${existingActive.medicalNo}) منذ ${existingActive.admissionDate}`
    };
  }

  const newRecord: PatientRecord = {
    id: 'icu-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    medicalNo: String(data.medicalNo || '').trim().replace(/^#+/, '').trim(),
    patientName: String(data.patientName || '').trim(),
    status: 'Active',
    admissionDate: normalizedAdmDate,
    admissionTime: normalizedAdmTime,
    fromLocation: String(data.fromLocation || '').trim(),
    diagnosis: String(data.diagnosis || '').trim(),
    pu: String(data.pu || '').trim() || 'None',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updated = [newRecord, ...records];
  saveStoredRecords(updated);

  return {
    success: true,
    message: `تم تسجيل دخول المريض بنجاح: ${newRecord.patientName} (رقم: ${newRecord.medicalNo})`,
    record: newRecord
  };
}

/**
 * Save discharge for active patient (supports matching by exact recordId OR medicalNo)
 */
export function saveDischarge(data: {
  recordId?: string;
  medicalNo: string;
  dischargeDate: string;
  dischargeTime: string;
  dischargeStatus: string;
  transferLocation?: string;
  dischargeReason?: string;
}): { success: boolean; message: string; record?: PatientRecord } {
  const records = [...getStoredRecords()];
  const cleanMno = cleanMedicalNo(data.medicalNo);

  let idx = -1;
  if (data.recordId) {
    idx = records.findIndex(r => r.id === data.recordId && r.status === 'Active');
  }
  if (idx === -1 && cleanMno) {
    // Pick matching active record (if duplicates exist, pick newest or first active)
    idx = records.findIndex(r => r.status === 'Active' && cleanMedicalNo(r.medicalNo) === cleanMno);
  }

  if (idx === -1) {
    return {
      success: false,
      message: `لم يتم العثور على مريض منوم حالياً برقم الملف: ${data.medicalNo}`
    };
  }

  const existing = records[idx];
  const normAdmDate = normalizeDateStr(existing.admissionDate) || existing.admissionDate;
  const normDisDate = normalizeDateStr(data.dischargeDate);

  if (!normDisDate) {
    return {
      success: false,
      message: `تاريخ الخروج غير صالح (${data.dischargeDate}). يرجى اختيار تاريخ صحيح.`
    };
  }

  // Validation: discharge date cannot be before admission date
  if (normAdmDate && normDisDate < normAdmDate) {
    return {
      success: false,
      message: `تاريخ الخروج (${normDisDate}) لا يمكن أن يكون قبل تاريخ الدخول (${normAdmDate})`
    };
  }

  const stayDays = calculateDaysBetween(normAdmDate, normDisDate);
  const normDisTime = normalizeTimeStr(data.dischargeTime, '12:00');
  const normStatus = normalizeDischargeStatusValue(data.dischargeStatus) || 'DIS';
  const isTransfer = String(normStatus).toUpperCase() === 'TRANS';

  const updatedRecord: PatientRecord = {
    ...existing,
    status: 'Discharged',
    dischargeDate: normDisDate,
    dischargeTime: normDisTime,
    dischargeStatus: normStatus,
    transferLocation: isTransfer ? (String(data.transferLocation || '').trim() || undefined) : undefined,
    dischargeReason: String(data.dischargeReason || '').trim(),
    lengthOfStay: stayDays,
    updatedAt: new Date().toISOString()
  };

  records[idx] = updatedRecord;
  saveStoredRecords(records);

  return {
    success: true,
    message: `تم تسجيل خروج المريض بنجاح: ${updatedRecord.patientName} - الحالة: ${updatedRecord.dischargeStatus} (${stayDays} يوم)`,
    record: updatedRecord
  };
}

/**
 * Delete a record
 */
export function deleteRecord(id: string): boolean {
  const records = getStoredRecords();
  const filtered = records.filter(r => r.id !== id);
  if (filtered.length !== records.length) {
    saveStoredRecords(filtered);
    return true;
  }
  return false;
}

/**
 * Reset data to initial sheet records
 */
export function resetToDemoData(): void {
  saveStoredRecords([...INITIAL_RECORDS]);
}

/**
 * Export records as JSON
 */
export function exportRecordsAsJson(): string {
  return JSON.stringify(getStoredRecords(), null, 2);
}

/**
 * Import records from JSON
 */
export function importRecordsFromJson(jsonString: string): { success: boolean; count: number; error?: string } {
  try {
    const data = JSON.parse(jsonString);
    if (!Array.isArray(data)) {
      return { success: false, count: 0, error: 'الملف لا يحتوي على مصفوفة بيانات صالحة' };
    }
    const valid = normalizeRecordsList(data);
    if (valid.length === 0) {
      return { success: false, count: 0, error: 'لم يتم العثور على سجلات مرضى صالحة' };
    }
    saveStoredRecords(valid);
    return { success: true, count: valid.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || 'خطأ في تنسيق ملف JSON' };
  }
}

/**
 * Get Monthly Census & Statistics Report
 * Month format: 'YYYY-MM' (e.g. '2026-11')
 */
export function getMonthlyReport(monthStr: string): MonthlyReportData {
  const records = getStoredRecords();
  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
    monthStr = getLocalCurrentMonth();
  }

  const [yearStr, mStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(mStr, 10); // 1-indexed

  // Month range
  const monthStart = `${yearStr}-${mStr.padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${yearStr}-${mStr.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const todayStr = getLocalTodayDate();

  let admissionsCount = 0;
  let dischargesCount = 0;
  let totalDaysCount = 0;

  const breakdown = {
    DIS: 0,
    TRANS: 0,
    DAMA: 0,
    DIED: 0
  };

  const monthlyRecords: (PatientRecord & { reportDays: number })[] = [];

  records.forEach(r => {
    const admDate = normalizeDateStr(r.admissionDate);
    if (!admDate) return;

    const disDate = normalizeDateStr(r.dischargeDate);
    const isDischarged = r.status === 'Discharged';
    const effectiveDischarge = isDischarged && disDate ? disDate : '9999-99-99';

    // A patient was present in the ICU during this month if:
    // admissionDate <= monthEnd AND (not discharged OR dischargeDate >= monthStart)
    const wasInICU = admDate <= monthEnd && effectiveDischarge >= monthStart;

    if (wasInICU) {
      // 1. Admission in this month?
      if (admDate.startsWith(monthStr)) {
        admissionsCount++;
      }

      // 2. Discharge in this month?
      if (isDischarged && disDate && disDate.startsWith(monthStr)) {
        dischargesCount++;
        const st = String(r.dischargeStatus || '').toUpperCase();
        if (st.startsWith('TRANS')) breakdown.TRANS++;
        else if (st.startsWith('DAMA')) breakdown.DAMA++;
        else if (st === 'DIED') breakdown.DIED++;
        else breakdown.DIS++;
      }

      // 3. Compute Patient Days spent inside this month
      const stayStart = admDate > monthStart ? admDate : monthStart;

      let stayEnd: string;
      if (isDischarged && disDate) {
        stayEnd = disDate < monthEnd ? disDate : monthEnd;
      } else {
        const activeCeil = todayStr < monthEnd ? todayStr : monthEnd;
        stayEnd = activeCeil >= stayStart ? activeCeil : stayStart;
      }

      let daysInMonth = calculateDaysBetween(stayStart, stayEnd);
      if (daysInMonth < 1) daysInMonth = 1;

      totalDaysCount += daysInMonth;

      monthlyRecords.push({
        ...r,
        reportDays: daysInMonth
      });
    }
  });

  // Sort: active first, then newest admission date
  monthlyRecords.sort((a, b) => {
    if (a.status === 'Active' && b.status !== 'Active') return -1;
    if (a.status !== 'Active' && b.status === 'Active') return 1;
    return String(b.admissionDate || '').localeCompare(String(a.admissionDate || ''));
  });

  const mortalityRate = dischargesCount > 0 ? parseFloat(((breakdown.DIED / dischargesCount) * 100).toFixed(1)) : 0;
  const alos = dischargesCount > 0 ? parseFloat((totalDaysCount / dischargesCount).toFixed(1)) : 0;
  const activeCount = monthlyRecords.filter(r => r.status === 'Active').length;

  return {
    month: monthStr,
    admissions: admissionsCount,
    discharges: dischargesCount,
    totalDays: totalDaysCount,
    breakdown,
    mortalityRate,
    alos,
    activeCount,
    records: monthlyRecords
  };
}

/**
 * Get Comprehensive Census Report for any custom date range (From Date -> To Date)
 */
export function getPeriodReport(startDate: string, endDate: string, customTitle?: string): PeriodReportData {
  const records = getStoredRecords();
  const todayStr = getLocalTodayDate();

  const sDate = normalizeDateStr(startDate) || todayStr;
  const eDate = normalizeDateStr(endDate) || todayStr;
  const minDate = sDate <= eDate ? sDate : eDate;
  const maxDate = sDate <= eDate ? eDate : sDate;

  let admissionsCount = 0;
  let dischargesCount = 0;
  let totalDaysCount = 0;

  const breakdown = {
    DIS: 0,
    TRANS: 0,
    DAMA: 0,
    DIED: 0
  };

  const periodRecords: (PatientRecord & { reportDays: number })[] = [];

  records.forEach(r => {
    const admDate = normalizeDateStr(r.admissionDate);
    if (!admDate) return;

    const disDate = normalizeDateStr(r.dischargeDate);
    const isDischarged = r.status === 'Discharged';
    const effectiveDischarge = isDischarged && disDate ? disDate : '9999-99-99';

    // In ICU during this window if admissionDate <= maxDate AND effectiveDischarge >= minDate
    const wasInICU = admDate <= maxDate && effectiveDischarge >= minDate;

    if (wasInICU) {
      if (admDate >= minDate && admDate <= maxDate) {
        admissionsCount++;
      }

      if (isDischarged && disDate && disDate >= minDate && disDate <= maxDate) {
        dischargesCount++;
        const st = String(r.dischargeStatus || '').toUpperCase();
        if (st.startsWith('TRANS')) breakdown.TRANS++;
        else if (st.startsWith('DAMA')) breakdown.DAMA++;
        else if (st === 'DIED') breakdown.DIED++;
        else breakdown.DIS++;
      }

      const stayStart = admDate > minDate ? admDate : minDate;
      let stayEnd: string;
      if (isDischarged && disDate) {
        stayEnd = disDate < maxDate ? disDate : maxDate;
      } else {
        const activeCeil = todayStr < maxDate ? todayStr : maxDate;
        stayEnd = activeCeil >= stayStart ? activeCeil : stayStart;
      }

      let daysInWindow = calculateDaysBetween(stayStart, stayEnd);
      if (daysInWindow < 1) daysInWindow = 1;
      totalDaysCount += daysInWindow;

      periodRecords.push({
        ...r,
        reportDays: daysInWindow
      });
    }
  });

  // Sort: active first, then newest admission date
  periodRecords.sort((a, b) => {
    if (a.status === 'Active' && b.status !== 'Active') return -1;
    if (a.status !== 'Active' && b.status === 'Active') return 1;
    return String(b.admissionDate || '').localeCompare(String(a.admissionDate || ''));
  });

  const mortalityRate = dischargesCount > 0 ? parseFloat(((breakdown.DIED / dischargesCount) * 100).toFixed(1)) : 0;
  const alos = dischargesCount > 0 ? parseFloat((totalDaysCount / dischargesCount).toFixed(1)) : 0;
  const activeCount = periodRecords.filter(r => r.status === 'Active').length;

  return {
    title: customTitle || `${minDate} - ${maxDate}`,
    startDate: minDate,
    endDate: maxDate,
    admissions: admissionsCount,
    discharges: dischargesCount,
    totalDays: totalDaysCount,
    breakdown,
    mortalityRate,
    alos,
    activeCount,
    records: periodRecords
  };
}

/**
 * Get Dashboard Multi-Month Trend Data
 */
export function getDashboardData(startMonth: string, endMonth: string): DashboardMonthData[] {
  if (!startMonth || !endMonth) return [];

  const results: DashboardMonthData[] = [];

  const [startY, startM] = startMonth.split('-').map(Number);
  const [endY, endM] = endMonth.split('-').map(Number);
  if (isNaN(startY) || isNaN(startM) || isNaN(endY) || isNaN(endM)) return [];

  let curY = startY;
  let curM = startM;
  let guard = 0;

  while ((curY < endY || (curY === endY && curM <= endM)) && guard < 120) {
    guard++;
    const monthKey = `${curY}-${String(curM).padStart(2, '0')}`;
    const report = getMonthlyReport(monthKey);

    const dateObj = new Date(curY, curM - 1, 1);
    const monthName = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    results.push({
      month: monthKey,
      label: monthName,
      admissions: report.admissions,
      discharges: report.discharges,
      totalDays: report.totalDays,
      breakdown: report.breakdown
    });

    curM++;
    if (curM > 12) {
      curM = 1;
      curY++;
    }
  }

  return results;
}

const GAS_URL_KEY = 'waheed_icu_gas_url';
export const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycby_35lnosnD9_tNBXdCtqaq6d8uHOoUShHq9SFow-PxHZHUC3uKwp28SzrxiL473uY3Vw/exec';

export function getGoogleScriptUrl(): string {
  return safeLocalStorageGet(GAS_URL_KEY) || DEFAULT_GAS_URL;
}

export function setGoogleScriptUrl(url: string): void {
  safeLocalStorageSet(GAS_URL_KEY, url.trim());
}

/**
 * Cross-origin JSONP reader for public Google Sheets (works on static Vercel/mobile browsers without CORS proxy)
 */
function fetchGoogleSheetGvizJsonp(sheetId: string): Promise<any[][]> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('DOM unavailable'));
      return;
    }

    const cbName = `__icuGvizCb_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const script = document.createElement('script');
    let settled = false;

    const cleanup = () => {
      try {
        delete (window as any)[cbName];
      } catch {
        (window as any)[cbName] = undefined;
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Timeout connecting to Google Sheet'));
    }, 10000);

    (window as any)[cbName] = (payload: any) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();

      if (!payload || payload.status === 'error' || !payload.table) {
        reject(new Error(payload?.errors?.[0]?.detailed_message || 'Invalid Google Sheet response'));
        return;
      }

      const cols = (payload.table.cols || []).map((c: any) => c.label || c.id || '');
      const rawRows = (payload.table.rows || []).map((row: any) =>
        (row.c || []).map((cell: any) => {
          if (!cell) return '';
          if (cell.f !== undefined && cell.f !== null && String(cell.f).trim() !== '') return String(cell.f);
          return cell.v !== undefined && cell.v !== null ? String(cell.v) : '';
        })
      );

      resolve([cols, ...rawRows]);
    };

    script.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      reject(new Error('Network error loading Google Sheet'));
    };

    script.src = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:json;responseHandler:${cbName}`;
    document.head.appendChild(script);
  });
}

/**
 * Fetch and live-sync all patient records directly from Google Sheet
 */
export async function syncFromGoogleSheetLive(
  sheetIdOrUrl = '1xEBExHwdTPIBouJKDTC_zZePXRCTtn_A6AoFaxmSCTk'
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const match = sheetIdOrUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const id = match ? match[1] : sheetIdOrUrl.trim();
    let rows: any[][] = [];

    // 1. Try local Vite server proxy first (dev environment)
    try {
      const proxyRes = await fetch('/api/sync-sheet');
      const contentType = proxyRes.headers.get('content-type') || '';
      if (proxyRes.ok && !contentType.includes('text/html')) {
        const text = await proxyRes.text();
        if (text && (text.includes('Medical No') || text.includes('Patient Name'))) {
          const wb = XLSX.read(text, { type: 'string' });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        }
      }
    } catch {
      // Proxy unavailable in static hosting
    }

    // 2. Try cross-origin gviz JSONP (works on Vercel / mobile browsers without CORS!)
    if (!rows || rows.length <= 1) {
      try {
        rows = await fetchGoogleSheetGvizJsonp(id);
      } catch {
        // Fallback to direct CSV if CORS allows
      }
    }

    // 3. Fallback direct CSV fetch
    if (!rows || rows.length <= 1) {
      try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
        const res = await fetch(csvUrl);
        if (res.ok) {
          const csvText = await res.text();
          if (csvText && !csvText.trim().startsWith('<')) {
            const wb = XLSX.read(csvText, { type: 'string' });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
          }
        }
      } catch {
        // Direct browser fetch blocked
      }
    }

    if (!rows || rows.length <= 1) {
      return {
        success: false,
        count: 0,
        error: 'تعذر الوصول المباشر إلى Google Sheet من المتصفح، يتم عرض البيانات المحفوظة محلياً.',
      };
    }

    const parsedList: PatientRecord[] = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 3) continue;
      const uid = String(r[0] || '').trim() || `icu-${i}`;
      const mno = String(r[1] || '').trim();
      const name = String(r[2] || '').trim();
      if (!mno && !name) continue;

      const rawStatus = String(r[3] || '').trim().toLowerCase();
      const status: PatientStatus =
        rawStatus === 'active' || rawStatus === 'منوم' ? 'Active' : 'Discharged';

      const norm = normalizeRecord({
        id: uid,
        medicalNo: mno,
        patientName: name,
        status,
        admissionDate: r[4],
        admissionTime: r[5] || '12:00',
        fromLocation: r[6],
        diagnosis: r[7],
        pu: r[8] || 'None',
        dischargeDate: r[9],
        dischargeTime: r[10],
        dischargeStatus: r[11],
        transferLocation: r[12],
        dischargeReason: r[13],
        lengthOfStay: r[14],
      }, i);

      if (norm) parsedList.push(norm);
    }

    if (parsedList.length > 0) {
      saveStoredRecords(parsedList);
      return { success: true, count: parsedList.length };
    } else {
      return { success: false, count: 0, error: 'لم يتم العثور على صفوف مرضى صالحة في الشيت' };
    }
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || 'Failed to sync from Sheet' };
  }
}
