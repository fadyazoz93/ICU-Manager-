/**
 * Data Storage and Analytics Service for Waheed ICU Manager
 */

import { PatientRecord, MonthlyReportData, PeriodReportData, DashboardMonthData, DischargeStatus, PatientStatus } from '../types/icu';
import * as XLSX from 'xlsx';
import sheetData from './sheetData.json';

const STORAGE_KEY = 'waheed_icu_records_v1';

// Real ICU records directly from Google Sheet (777 records)
const INITIAL_RECORDS: PatientRecord[] = sheetData as PatientRecord[];

export function getStoredRecords(): PatientRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_RECORDS));
      return INITIAL_RECORDS;
    }
    const parsed = JSON.parse(raw);
    // If user has old small sample data (e.g. fewer than 50 records), automatically load the real 777 Google Sheet records!
    if (Array.isArray(parsed) && parsed.length < 50 && INITIAL_RECORDS.length > 50) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_RECORDS));
      return INITIAL_RECORDS;
    }
    return Array.isArray(parsed) ? parsed : INITIAL_RECORDS;
  } catch (err) {
    console.error('Failed to load ICU records from localStorage:', err);
    return INITIAL_RECORDS;
  }
}

export function saveStoredRecords(records: PatientRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    // Dispatch custom event for cross-component reactive updates
    window.dispatchEvent(new CustomEvent('icu-records-changed', { detail: records }));
  } catch (err) {
    console.error('Failed to save ICU records:', err);
  }
}

export function calculateDaysBetween(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 0;
  const [sY, sM, sD] = startDateStr.split('-').map(Number);
  const [eY, eM, eD] = endDateStr.split('-').map(Number);
  if (!sY || !sM || !sD || !eY || !eM || !eD) return 0;
  const startUTC = Date.UTC(sY, sM - 1, sD);
  const endUTC = Date.UTC(eY, eM - 1, eD);
  const diffDays = Math.round((endUTC - startUTC) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

/**
 * Find active patient record by Medical No
 */
export function findActivePatient(medicalNo: string): PatientRecord | null {
  if (!medicalNo) return null;
  const cleanMno = medicalNo.trim().toLowerCase();
  const records = getStoredRecords();
  const found = records.find(r => r.status === 'Active' && r.medicalNo.trim().toLowerCase() === cleanMno);
  return found || null;
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
  
  // Check if patient already active
  const existingActive = records.find(
    r => r.status === 'Active' && r.medicalNo.trim().toLowerCase() === data.medicalNo.trim().toLowerCase()
  );
  if (existingActive) {
    return {
      success: false,
      message: `المريض مسجل كحالة نشطة بالفعل (Medical No: ${data.medicalNo}) منذ ${existingActive.admissionDate}`
    };
  }

  const newRecord: PatientRecord = {
    id: 'icu-' + Date.now(),
    medicalNo: data.medicalNo.trim(),
    patientName: data.patientName.trim(),
    status: 'Active',
    admissionDate: data.admissionDate,
    admissionTime: data.admissionTime || '12:00',
    fromLocation: data.fromLocation.trim(),
    diagnosis: data.diagnosis.trim(),
    pu: data.pu?.trim() || 'None',
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
 * Save discharge for active patient
 */
export function saveDischarge(data: {
  medicalNo: string;
  dischargeDate: string;
  dischargeTime: string;
  dischargeStatus: string;
  transferLocation?: string;
  dischargeReason?: string;
}): { success: boolean; message: string; record?: PatientRecord } {
  const records = getStoredRecords();
  const cleanMno = data.medicalNo.trim().toLowerCase();
  
  const idx = records.findIndex(r => r.status === 'Active' && r.medicalNo.trim().toLowerCase() === cleanMno);
  if (idx === -1) {
    return {
      success: false,
      message: `لم يتم العثور على مريض منوم حالياً برقم الملف: ${data.medicalNo}`
    };
  }

  const existing = records[idx];
  
  // Validation: discharge date cannot be before admission date
  if (data.dischargeDate < existing.admissionDate) {
    return {
      success: false,
      message: `تاريخ الخروج (${data.dischargeDate}) لا يمكن أن يكون قبل تاريخ الدخول (${existing.admissionDate})`
    };
  }

  const stayDays = calculateDaysBetween(existing.admissionDate, data.dischargeDate);

  const updatedRecord: PatientRecord = {
    ...existing,
    status: 'Discharged',
    dischargeDate: data.dischargeDate,
    dischargeTime: data.dischargeTime || '12:00',
    dischargeStatus: (data.dischargeStatus as DischargeStatus | 'Trans') || 'DIS',
    transferLocation: data.dischargeStatus === 'Trans' ? (data.transferLocation || '') : undefined,
    dischargeReason: data.dischargeReason || '',
    lengthOfStay: stayDays,
    updatedAt: new Date().toISOString()
  };

  records[idx] = updatedRecord;
  saveStoredRecords([...records]);

  return {
    success: true,
    message: `تم تسجيل خروج المريض بنجاح: ${updatedRecord.patientName} - الحالة: ${updatedRecord.dischargeStatus}`,
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
 * Reset data to initial demo data
 */
export function resetToDemoData(): void {
  saveStoredRecords(INITIAL_RECORDS);
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
    // Simple schema validation
    const valid = data.filter(d => d.medicalNo && d.patientName && d.admissionDate);
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
  if (!monthStr || !monthStr.includes('-')) {
    const now = new Date();
    monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  const [yearStr, mStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(mStr, 10); // 1-indexed

  // Month range
  const monthStart = `${yearStr}-${mStr.padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${yearStr}-${mStr.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const todayStr = new Date().toISOString().slice(0, 10);

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
    const isDischarged = r.status === 'Discharged';
    const effectiveDischarge = isDischarged && r.dischargeDate ? r.dischargeDate : '9999-99-99';

    // A patient was present in the ICU during this month if:
    // admissionDate <= monthEnd AND (not discharged OR dischargeDate >= monthStart)
    const wasInICU = r.admissionDate <= monthEnd && effectiveDischarge >= monthStart;

    if (wasInICU) {
      // 1. Admission in this month?
      if (r.admissionDate.startsWith(monthStr)) {
        admissionsCount++;
      }

      // 2. Discharge in this month?
      if (isDischarged && r.dischargeDate && r.dischargeDate.startsWith(monthStr)) {
        dischargesCount++;
        const st = (r.dischargeStatus || '').toUpperCase();
        if (st === 'TRANS') breakdown.TRANS++;
        else if (st === 'DAMA') breakdown.DAMA++;
        else if (st === 'DIED') breakdown.DIED++;
        else breakdown.DIS++;
      }

      // 3. Compute Patient Days spent inside this month
      // start of patient stay in this month = max(admissionDate, monthStart)
      const stayStart = r.admissionDate > monthStart ? r.admissionDate : monthStart;
      
      // end of patient stay in this month = min(dischargeDate or today, monthEnd)
      let stayEnd: string;
      if (isDischarged && r.dischargeDate) {
        stayEnd = r.dischargeDate < monthEnd ? r.dischargeDate : monthEnd;
      } else {
        // Active patient: up to today (or monthEnd if month is past)
        const activeCeil = todayStr < monthEnd ? todayStr : monthEnd;
        stayEnd = activeCeil >= stayStart ? activeCeil : stayStart;
      }

      let daysInMonth = calculateDaysBetween(stayStart, stayEnd);
      // Ensure at least 1 day if patient was admitted in that month
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
    return b.admissionDate.localeCompare(a.admissionDate);
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
  const todayStr = new Date().toISOString().slice(0, 10);

  // Normalize dates
  const sDate = startDate || todayStr;
  const eDate = endDate || todayStr;
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
    const isDischarged = r.status === 'Discharged';
    const effectiveDischarge = isDischarged && r.dischargeDate ? r.dischargeDate : '9999-99-99';

    // In ICU during this window if admissionDate <= maxDate AND effectiveDischarge >= minDate
    const wasInICU = r.admissionDate <= maxDate && effectiveDischarge >= minDate;

    if (wasInICU) {
      // 1. Admission in this window?
      if (r.admissionDate >= minDate && r.admissionDate <= maxDate) {
        admissionsCount++;
      }

      // 2. Discharge in this window?
      if (isDischarged && r.dischargeDate && r.dischargeDate >= minDate && r.dischargeDate <= maxDate) {
        dischargesCount++;
        const st = (r.dischargeStatus || '').toUpperCase();
        if (st === 'TRANS') breakdown.TRANS++;
        else if (st === 'DAMA') breakdown.DAMA++;
        else if (st === 'DIED') breakdown.DIED++;
        else breakdown.DIS++;
      }

      // 3. Compute Patient Days spent inside this specific window
      const stayStart = r.admissionDate > minDate ? r.admissionDate : minDate;
      let stayEnd: string;
      if (isDischarged && r.dischargeDate) {
        stayEnd = r.dischargeDate < maxDate ? r.dischargeDate : maxDate;
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
    return b.admissionDate.localeCompare(a.admissionDate);
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

  let curY = startY;
  let curM = startM;

  while (curY < endY || (curY === endY && curM <= endM)) {
    const monthKey = `${curY}-${String(curM).padStart(2, '0')}`;
    const report = getMonthlyReport(monthKey);

    // Format human label e.g. "Nov 2026" or "2026-11"
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
  return localStorage.getItem(GAS_URL_KEY) || DEFAULT_GAS_URL;
}

export function setGoogleScriptUrl(url: string): void {
  localStorage.setItem(GAS_URL_KEY, url.trim());
}

/**
 * Fetch and live-sync all patient records directly from Google Sheet CSV endpoint
 */
export async function syncFromGoogleSheetLive(
  sheetIdOrUrl = '1xEBExHwdTPIBouJKDTC_zZePXRCTtn_A6AoFaxmSCTk'
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    let csvText = '';

    // 1. Try local Vite server proxy first (avoids browser CORS)
    try {
      const proxyRes = await fetch('/api/sync-sheet');
      if (proxyRes.ok) {
        const text = await proxyRes.text();
        if (text && text.includes('Medical No')) {
          csvText = text;
        }
      }
    } catch {
      // Proxy unavailable in static hosting
    }

    // 2. Fallback to direct URL if proxy was not used
    if (!csvText) {
      try {
        const match = sheetIdOrUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        const id = match ? match[1] : sheetIdOrUrl.trim();
        const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
        const res = await fetch(csvUrl);
        if (res.ok) {
          csvText = await res.text();
        }
      } catch {
        // Direct browser fetch blocked by CORS; handled gracefully below
      }
    }

    if (!csvText) {
      return {
        success: false,
        count: 0,
        error: 'Unable to reach Google Sheet directly from browser without authentication.',
      };
    }

    const wb = XLSX.read(csvText, { type: 'string' });
    const firstSheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

    if (!rows || rows.length <= 1) {
      return { success: false, count: 0, error: 'Google Sheet is empty or has only headers' };
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
      const admDate = String(r[4] || '').trim();
      const admTime = String(r[5] || '12:00').trim();
      const fromLoc = String(r[6] || '').trim();
      const diag = String(r[7] || '').trim();
      const pu = String(r[8] || 'None').trim();
      const disDate = String(r[9] || '').trim();
      const disTime = String(r[10] || '').trim();
      let disStatus = String(r[11] || '').trim();

      if (disStatus.toUpperCase() === 'DIED') disStatus = 'DIED';
      else if (disStatus.toUpperCase().startsWith('TRANS')) disStatus = 'Trans';
      else if (disStatus.toUpperCase().startsWith('DAMA')) disStatus = 'DAMA';
      else if (disStatus.toUpperCase() === 'DIS') disStatus = 'DIS';

      const transLoc = String(r[12] || '').trim();
      const disReason = String(r[13] || '').trim();
      const rawStay = String(r[14] || '').replace(/[^0-9]/g, '');
      const stay = rawStay ? parseInt(rawStay, 10) : undefined;

      parsedList.push({
        id: uid,
        medicalNo: mno,
        patientName: name,
        status,
        admissionDate: admDate,
        admissionTime: admTime,
        fromLocation: fromLoc,
        diagnosis: diag,
        pu: pu || 'None',
        dischargeDate: disDate || undefined,
        dischargeTime: disTime || undefined,
        dischargeStatus: (disStatus as any) || undefined,
        transferLocation: transLoc || undefined,
        dischargeReason: disReason || undefined,
        lengthOfStay: stay,
      });
    }

    if (parsedList.length > 0) {
      saveStoredRecords(parsedList);
      return { success: true, count: parsedList.length };
    } else {
      return { success: false, count: 0, error: 'No valid patient rows found' };
    }
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || 'Failed to sync from Sheet' };
  }
}



