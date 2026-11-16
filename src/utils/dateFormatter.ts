/**
 * Comprehensive Date & Time Localization Utility for ICU Manager
 * Uses local calendar dates (no UTC shift) and safe BiDi formatting for Arabic & English.
 */

export const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

export const ENGLISH_MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const ENGLISH_MONTHS_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const ARABIC_WEEKDAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

export const ENGLISH_WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Get current local date as YYYY-MM-DD (never shifts to UTC)
 */
export function getLocalTodayDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get current local month as YYYY-MM (never shifts to UTC)
 */
export function getLocalCurrentMonth(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Get current local time as 24h HH:mm
 */
export function getLocalCurrentTime(date: Date = new Date()): string {
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

/**
 * Get first day of local month as YYYY-MM-DD
 */
export function getLocalMonthStartDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/**
 * Normalize various date string formats (YYYY-MM-DD, YYYY/M/D, DD/MM/YYYY, ISO) into strict YYYY-MM-DD
 */
export function normalizeDateStr(input?: string | number | null): string {
  if (input === null || input === undefined) return '';
  const raw = String(input).trim();
  if (!raw || raw.toLowerCase() === 'active' || raw === '-') return '';

  // Strip time component if present (e.g. "2026-11-16T10:30:00Z" or "2026-11-16 10:30")
  const datePart = raw.split(/[T\s]/)[0].trim();

  // Match YYYY-M-D or YYYY/M/D
  let match = datePart.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // Match D/M/YYYY or D-M-YYYY (common in Egypt / Google Sheets display formats)
  match = datePart.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    const first = parseInt(match[1], 10);
    const second = parseInt(match[2], 10);
    const y = parseInt(match[3], 10);
    // Prefer DD/MM/YYYY unless second > 12 (MM/DD/YYYY)
    let d = first;
    let m = second;
    if (m > 12 && d <= 12) {
      m = first;
      d = second;
    }
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  return '';
}

/**
 * Normalize time strings like "1:06", "09:5", "14:30:00", "2:15 PM" into padded 24h "HH:mm"
 */
export function normalizeTimeStr(input?: string | null, fallback = ''): string {
  if (!input) return fallback;
  const raw = String(input).trim();
  if (!raw) return fallback;

  const amPmMatch = raw.match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?\s*(AM|PM|ص|م)$/i);
  if (amPmMatch) {
    let h = parseInt(amPmMatch[1], 10);
    const m = parseInt(amPmMatch[2], 10);
    const period = amPmMatch[3].toUpperCase();
    const isPM = period === 'PM' || period === 'م';
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  const timeMatch = raw.match(/(\d{1,2}):(\d{1,2})/);
  if (timeMatch) {
    const h = parseInt(timeMatch[1], 10);
    const m = parseInt(timeMatch[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  return fallback;
}

/**
 * Parse normalized YYYY-MM-DD into numeric parts safely without timezone drift
 */
export function parseYMD(dateStr?: string | null): { year: number; month: number; day: number } | null {
  const norm = normalizeDateStr(dateStr);
  if (!norm) return null;
  const [yStr, mStr, dStr] = norm.split('-');
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);
  const day = parseInt(dStr, 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

/**
 * Format date string into compact unambiguous DD/MM/YYYY
 */
export function formatNumericDate(dateStr?: string | null): string {
  const parsed = parseYMD(dateStr);
  if (!parsed) return dateStr ? String(dateStr) : '-';
  return `${String(parsed.day).padStart(2, '0')}/${String(parsed.month).padStart(2, '0')}/${parsed.year}`;
}

/**
 * Format date string (YYYY-MM-DD or ISO) into readable localized format
 * E.g., '2026-03-15' -> '15 مارس 2026' or 'Mar 15, 2026'
 */
export function formatDate(
  dateStr?: string | null,
  lang: 'ar' | 'en' = 'ar',
  options?: {
    withWeekday?: boolean;
    includeYear?: boolean;
  }
): string {
  if (!dateStr || dateStr === 'Active' || String(dateStr).trim() === '') {
    return lang === 'ar' ? 'منوم حالياً' : 'Active (In ICU)';
  }

  const parsed = parseYMD(dateStr);
  if (!parsed) {
    return String(dateStr);
  }

  const { year, month, day } = parsed;
  const monthIdx = month - 1;
  const dateObj = new Date(year, monthIdx, day);
  const dayOfWeek = dateObj.getDay();

  const formattedDay = String(day).padStart(2, '0');
  const includeYear = options?.includeYear !== false;

  if (lang === 'ar') {
    const monthName = ARABIC_MONTHS[monthIdx];
    let res = `${formattedDay} ${monthName}${includeYear ? ` ${year}` : ''}`;
    if (options?.withWeekday) {
      res = `${ARABIC_WEEKDAYS[dayOfWeek]}، ${res}`;
    }
    return res;
  } else {
    const monthName = ENGLISH_MONTHS_SHORT[monthIdx];
    let res = `${monthName} ${formattedDay}${includeYear ? `, ${year}` : ''}`;
    if (options?.withWeekday) {
      res = `${ENGLISH_WEEKDAYS[dayOfWeek]}, ${res}`;
    }
    return res;
  }
}

/**
 * Format 24h time string (HH:mm) into 12h time with AM/PM
 * Uses Unicode LTR isolate around HH:mm so digits never reorder in RTL containers.
 */
export function formatTime(timeStr?: string | null, lang: 'ar' | 'en' = 'ar'): string {
  const normalized = normalizeTimeStr(timeStr);
  if (!normalized || !normalized.includes(':')) {
    return timeStr ? String(timeStr) : '';
  }

  const [hStr, mStr] = normalized.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);

  if (isNaN(h) || isNaN(m)) {
    return String(timeStr || '');
  }

  const isPM = h >= 12;
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;

  const hDisplay = String(h).padStart(2, '0');
  const mDisplay = String(m).padStart(2, '0');
  const clockText = `\u2066${hDisplay}:${mDisplay}\u2069`;

  if (lang === 'ar') {
    const period = isPM ? 'م' : 'ص';
    return `${clockText} ${period}`;
  } else {
    const period = isPM ? 'PM' : 'AM';
    return `${clockText} ${period}`;
  }
}

/**
 * Format date & time together
 */
export function formatDateTime(
  dateStr?: string | null,
  timeStr?: string | null,
  lang: 'ar' | 'en' = 'ar'
): string {
  const fDate = formatDate(dateStr, lang);
  const fTime = formatTime(timeStr, lang);
  if (!fTime) return fDate;
  return `${fDate} • ${fTime}`;
}

/**
 * Format days of stay with proper Arabic grammar
 */
export function formatStayDuration(days: number | undefined | null, lang: 'ar' | 'en' = 'ar'): string {
  const count = typeof days === 'number' && !isNaN(days) ? days : 0;
  if (count <= 0) {
    return lang === 'ar' ? 'أقل من يوم' : '< 1 day';
  }

  if (lang === 'ar') {
    if (count === 1) return 'يوم واحد';
    if (count === 2) return 'يومان';
    if (count >= 3 && count <= 10) return `${count} أيام`;
    return `${count} يوماً`;
  } else {
    return count === 1 ? '1 day' : `${count} days`;
  }
}

/**
 * Calculate live duration in calendar days from admission date until local today
 */
export function calculateActiveStayDays(admissionDate: string): number {
  const start = parseYMD(admissionDate);
  if (!start) return 1;
  const today = parseYMD(getLocalTodayDate());
  if (!today) return 1;

  const startUTC = Date.UTC(start.year, start.month - 1, start.day);
  const todayUTC = Date.UTC(today.year, today.month - 1, today.day);
  const days = Math.round((todayUTC - startUTC) / (1000 * 60 * 60 * 24));
  return Math.max(1, days);
}

/**
 * Format Year-Month (e.g. '2026-03') to localized month title
 * E.g., '2026-03' -> 'مارس 2026' or 'March 2026'
 */
export function formatYearMonth(yearMonthStr: string, lang: 'ar' | 'en' = 'ar'): string {
  if (!yearMonthStr || !yearMonthStr.includes('-')) return String(yearMonthStr || '');
  const [yStr, mStr] = yearMonthStr.split('-');
  const year = parseInt(yStr, 10);
  const monthIdx = parseInt(mStr, 10) - 1;

  if (!isNaN(year) && monthIdx >= 0 && monthIdx <= 11) {
    if (lang === 'ar') {
      return `${ARABIC_MONTHS[monthIdx]} ${year}`;
    } else {
      return `${ENGLISH_MONTHS_FULL[monthIdx]} ${year}`;
    }
  }
  return yearMonthStr;
}

/**
 * Localized human labels for discharge statuses
 */
export function getDischargeStatusLabel(status?: string, lang: 'ar' | 'en' = 'ar'): {
  code: string;
  name: string;
  badgeClass: string;
} {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'DIED') {
    return {
      code: 'DIED',
      name: lang === 'ar' ? 'وفاة' : 'Deceased',
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
    };
  }
  if (normalized === 'TRANS') {
    return {
      code: 'TRANS',
      name: lang === 'ar' ? 'تحويل لقسم آخر' : 'Transferred',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }
  if (normalized === 'DAMA') {
    return {
      code: 'DAMA',
      name: lang === 'ar' ? 'خروج ضد النصح الطبي' : 'D.A.M.A',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  }
  return {
    code: 'DIS',
    name: lang === 'ar' ? 'خروج تحسن' : 'Discharged (Improved)',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  };
}
