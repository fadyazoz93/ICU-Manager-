/**
 * Comprehensive Date & Time Localization Utility for ICU Manager
 * Provides elegant Arabic & English formatting for dates, times, durations, and periods.
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
  if (!dateStr || dateStr === 'Active' || dateStr.trim() === '') {
    return lang === 'ar' ? 'منوم حالياً' : 'Active (In ICU)';
  }

  // Parse YYYY-MM-DD
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length !== 3) {
    return dateStr;
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 0 || month > 11) {
    return dateStr;
  }

  const dateObj = new Date(year, month, day);
  const dayOfWeek = dateObj.getDay();

  const formattedDay = String(day).padStart(2, '0');
  const includeYear = options?.includeYear !== false;

  if (lang === 'ar') {
    const monthName = ARABIC_MONTHS[month];
    let res = `${formattedDay} ${monthName}${includeYear ? ` ${year}` : ''}`;
    if (options?.withWeekday) {
      res = `${ARABIC_WEEKDAYS[dayOfWeek]}، ${res}`;
    }
    return res;
  } else {
    const monthName = ENGLISH_MONTHS_SHORT[month];
    let res = `${monthName} ${formattedDay}${includeYear ? `, ${year}` : ''}`;
    if (options?.withWeekday) {
      res = `${ENGLISH_WEEKDAYS[dayOfWeek]}, ${res}`;
    }
    return res;
  }
}

/**
 * Format 24h time string (HH:mm) into 12h time with AM/PM
 * E.g., '14:30' -> '02:30 م' or '02:30 PM'
 */
export function formatTime(timeStr?: string | null, lang: 'ar' | 'en' = 'ar'): string {
  if (!timeStr || !timeStr.includes(':')) {
    return timeStr || '';
  }

  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);

  if (isNaN(h) || isNaN(m)) {
    return timeStr;
  }

  const isPM = h >= 12;
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;

  const hDisplay = String(h).padStart(2, '0');
  const mDisplay = String(m).padStart(2, '0');

  if (lang === 'ar') {
    const period = isPM ? 'م' : 'ص';
    return `${hDisplay}:${mDisplay} ${period}`;
  } else {
    const period = isPM ? 'PM' : 'AM';
    return `${hDisplay}:${mDisplay} ${period}`;
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
  const count = typeof days === 'number' ? days : 0;
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
 * Calculate live duration in days from admission date until today
 */
export function calculateActiveStayDays(admissionDate: string): number {
  if (!admissionDate) return 0;
  const start = new Date(admissionDate);
  const today = new Date();
  const diffTime = today.getTime() - start.getTime();
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, days);
}

/**
 * Format Year-Month (e.g. '2026-03') to localized month title
 * E.g., '2026-03' -> 'مارس 2026' or 'March 2026'
 */
export function formatYearMonth(yearMonthStr: string, lang: 'ar' | 'en' = 'ar'): string {
  if (!yearMonthStr || !yearMonthStr.includes('-')) return yearMonthStr;
  const [yStr, mStr] = yearMonthStr.split('-');
  const year = parseInt(yStr, 10);
  const monthIdx = parseInt(mStr, 10) - 1;

  if (monthIdx >= 0 && monthIdx <= 11) {
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
  const normalized = (status || '').toUpperCase();
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
