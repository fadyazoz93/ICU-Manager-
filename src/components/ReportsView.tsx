import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { MonthlyReportData, MonthlyRecordItem } from '../types/icu';
import { getMonthlyReport, getPeriodReport } from '../services/storage';
import {
  formatDate,
  formatTime,
  formatYearMonth,
  formatStayDuration,
  getDischargeStatusLabel,
  ARABIC_MONTHS,
} from '../utils/dateFormatter';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Users,
  Activity,
  Bed,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  Table as TableIcon,
  Printer,
  Search,
  Filter,
  ArrowUpDown,
  Building2,
  ShieldCheck,
  TrendingUp,
  Percent,
  Clock,
  FileCheck,
} from 'lucide-react';

interface ReportsViewProps {
  lang: 'en' | 'ar';
}

type PeriodType = 'month' | 'custom';

export const ReportsView: React.FC<ReportsViewProps> = ({ lang }) => {
  const isAr = lang === 'ar';

  // Mode: single month or custom range
  const [periodType, setPeriodType] = useState<PeriodType>('month');

  // Month selector (default current month)
  const [month, setMonth] = useState(() => {
    return new Date().toISOString().slice(0, 7);
  });

  // Custom date range selectors
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Report state
  const [reportData, setReportData] = useState<MonthlyReportData | null>(null);
  const [reportTitle, setReportTitle] = useState<string>('');
  const [generatedAt, setGeneratedAt] = useState<string>('');

  // Table vs Cards
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'table';
  });

  // In-table search and filtering
  const [tableSearch, setTableSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'DIS' | 'TRANS' | 'DAMA' | 'DIED'>('ALL');
  const [sortBy, setSortBy] = useState<'days' | 'admission' | 'name'>('days');

  // Initial load
  useEffect(() => {
    handleGenerateMonthlyReport(month);
  }, []);

  const handleGenerateMonthlyReport = (selectedMonth: string) => {
    if (!selectedMonth) return;
    const data = getMonthlyReport(selectedMonth);
    setReportData(data);
    setReportTitle(formatYearMonth(selectedMonth, lang));
    setGeneratedAt(new Date().toISOString());
  };

  const handleGenerateCustomReport = () => {
    if (!startDate || !endDate) return;
    const data = getPeriodReport(startDate, endDate);
    // Adapt to MonthlyReportData structure
    setReportData({
      month: `${startDate} → ${endDate}`,
      admissions: data.admissions,
      discharges: data.discharges,
      totalDays: data.totalDays,
      breakdown: data.breakdown,
      mortalityRate: data.mortalityRate,
      alos: data.alos,
      activeCount: data.activeCount,
      records: data.records,
    });
    setReportTitle(
      isAr
        ? `الفترة من ${formatDate(startDate, 'ar')} إلى ${formatDate(endDate, 'ar')}`
        : `Period from ${formatDate(startDate, 'en')} to ${formatDate(endDate, 'en')}`
    );
    setGeneratedAt(new Date().toISOString());
  };

  // Quick preset shortcuts
  const applyPreset = (preset: 'thisMonth' | 'lastMonth' | 'last30' | 'thisYear') => {
    const today = new Date();
    if (preset === 'thisMonth') {
      const m = today.toISOString().slice(0, 7);
      setMonth(m);
      setPeriodType('month');
      handleGenerateMonthlyReport(m);
    } else if (preset === 'lastMonth') {
      const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const m = lastMonthDate.toISOString().slice(0, 7);
      setMonth(m);
      setPeriodType('month');
      handleGenerateMonthlyReport(m);
    } else if (preset === 'last30') {
      const start = new Date();
      start.setDate(today.getDate() - 30);
      const sStr = start.toISOString().slice(0, 10);
      const eStr = today.toISOString().slice(0, 10);
      setStartDate(sStr);
      setEndDate(eStr);
      setPeriodType('custom');
      const data = getPeriodReport(sStr, eStr, isAr ? 'آخر 30 يوماً' : 'Last 30 Days');
      setReportData({
        month: `${sStr} → ${eStr}`,
        admissions: data.admissions,
        discharges: data.discharges,
        totalDays: data.totalDays,
        breakdown: data.breakdown,
        mortalityRate: data.mortalityRate,
        alos: data.alos,
        activeCount: data.activeCount,
        records: data.records,
      });
      setReportTitle(isAr ? 'تقرير آخر 30 يوماً' : 'Last 30 Days Report');
      setGeneratedAt(new Date().toISOString());
    } else if (preset === 'thisYear') {
      const sStr = `${today.getFullYear()}-01-01`;
      const eStr = today.toISOString().slice(0, 10);
      setStartDate(sStr);
      setEndDate(eStr);
      setPeriodType('custom');
      const data = getPeriodReport(sStr, eStr, isAr ? `عام ${today.getFullYear()}` : `Year ${today.getFullYear()}`);
      setReportData({
        month: `${sStr} → ${eStr}`,
        admissions: data.admissions,
        discharges: data.discharges,
        totalDays: data.totalDays,
        breakdown: data.breakdown,
        mortalityRate: data.mortalityRate,
        alos: data.alos,
        activeCount: data.activeCount,
        records: data.records,
      });
      setReportTitle(isAr ? `تقرير عام ${today.getFullYear()}` : `Year ${today.getFullYear()} Report`);
      setGeneratedAt(new Date().toISOString());
    }
  };

  // Filtered and sorted records
  const filteredRecords = useMemo(() => {
    if (!reportData) return [];
    let list = [...reportData.records];

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.patientName.toLowerCase().includes(q) ||
          r.medicalNo.toLowerCase().includes(q) ||
          r.diagnosis.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'Active') {
        list = list.filter((r) => r.status === 'Active');
      } else {
        list = list.filter((r) => (r.dischargeStatus || '').toUpperCase() === statusFilter);
      }
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'days') {
        return b.reportDays - a.reportDays;
      } else if (sortBy === 'admission') {
        return b.admissionDate.localeCompare(a.admissionDate);
      } else {
        return a.patientName.localeCompare(b.patientName);
      }
    });

    return list;
  }, [reportData, tableSearch, statusFilter, sortBy]);

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Detailed Excel Export
  const handleDownloadExcel = () => {
    if (!reportData) return;
    const data = reportData;

    const ws_data: any[][] = [
      [`مستشفى العناية المركزة - تقرير النشاط والتعداد السريري (${reportTitle})`],
      [`Waheed ICU Manager - Clinical Activity & Census Report`],
      [`تاريخ وتوقيت الإصدار / Generated: ${formatDate(generatedAt, lang, { withWeekday: true })} - ${formatTime(generatedAt.slice(11, 16), lang)}`],
      [],
      ['المؤشرات الإحصائية والسريرية الرئيسية (CLINICAL & STATISTICAL INDICATORS)'],
      ['حالات الدخول الجديدة (Total Admissions)', data.admissions],
      ['حالات الخروج الإجمالية (Total Discharges)', data.discharges],
      ['إجمالي أيام المرضى المحسوبة (Total Patient Days)', data.totalDays],
      ['متوسط مدة الإقامة باليوم (Average Length of Stay - ALOS)', data.alos ?? (data.discharges > 0 ? (data.totalDays / data.discharges).toFixed(1) : 0)],
      ['معدل الوفيات الإجمالي (Mortality Rate %)', `${data.mortalityRate ?? (data.discharges > 0 ? ((data.breakdown.DIED / data.discharges) * 100).toFixed(1) : 0)}%`],
      [],
      ['تفصيل مخرجات الخروج (DISCHARGE OUTCOMES BREAKDOWN)'],
      ['خروج تحسن (DIS)', data.breakdown.DIS],
      ['تحويل لأقسام أخرى (TRANS)', data.breakdown.TRANS],
      ['خروج ضد النصح الطبي (DAMA)', data.breakdown.DAMA],
      ['حالات الوفاة (DIED)', data.breakdown.DIED],
      [],
      ['السجل التفصيلي للتعداد السريري للمرضى (DETAILED PATIENT CENSUS LOG)'],
      [
        'رقم الملف (MRN)',
        'اسم المريض (Patient Name)',
        'تاريخ الدخول (Admission Date)',
        'وقت الدخول (Time)',
        'التشخيص الطبي (Diagnosis)',
        'قرح الفراش والجروح (PU / Wounds)',
        'تاريخ الخروج (Discharge Date)',
        'حالة الخروج (Discharge Status)',
        'جهة التحويل (Transfer To)',
        'سبب وملاحظات الخروج (Discharge Reason)',
        'أيام الإقامة في التقرير (Days in Period)',
      ],
    ];

    data.records.forEach((r) => {
      ws_data.push([
        r.medicalNo,
        r.patientName,
        r.admissionDate,
        r.admissionTime || '',
        r.diagnosis,
        r.pu || 'None',
        r.dischargeDate || (isAr ? 'منوم حالياً' : 'Active'),
        r.dischargeStatus || '',
        r.transferLocation || '',
        r.dischargeReason || '',
        r.reportDays,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!cols'] = [
      { wch: 14 },
      { wch: 26 },
      { wch: 16 },
      { wch: 10 },
      { wch: 34 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 22 },
      { wch: 34 },
      { wch: 16 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ICU Census Report');
    const safeTitle = (reportTitle || 'Report').replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_');
    XLSX.writeFile(wb, `ICU_Census_${safeTitle}.xlsx`);
  };

  const calculatedMortality = reportData
    ? reportData.mortalityRate ??
      (reportData.discharges > 0 ? parseFloat(((reportData.breakdown.DIED / reportData.discharges) * 100).toFixed(1)) : 0)
    : 0;

  const calculatedAlos = reportData
    ? reportData.alos ??
      (reportData.discharges > 0 ? parseFloat((reportData.totalDays / reportData.discharges).toFixed(1)) : 0)
    : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Selection & Action Toolbar (Screen only - Hidden in print) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-200 space-y-4 no-print" data-html2pdf-ignore>
        {/* Top row: Tab Switcher (Monthly vs Custom) + Quick Presets */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setPeriodType('month')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                periodType === 'month'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'تقرير شهري' : 'Monthly Report'}</span>
            </button>
            <button
              onClick={() => setPeriodType('custom')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                periodType === 'custom'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'فترة مخصصة' : 'Custom Period'}</span>
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium hidden sm:inline">
              {isAr ? 'اختصارات سريعة:' : 'Quick Presets:'}
            </span>
            <button
              onClick={() => applyPreset('thisMonth')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
            >
              {isAr ? 'الشهر الحالي' : 'This Month'}
            </button>
            <button
              onClick={() => applyPreset('lastMonth')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
            >
              {isAr ? 'الشهر السابق' : 'Last Month'}
            </button>
            <button
              onClick={() => applyPreset('last30')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
            >
              {isAr ? 'آخر 30 يوماً' : 'Last 30 Days'}
            </button>
            <button
              onClick={() => applyPreset('thisYear')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
            >
              {isAr ? 'العام الحالي' : 'This Year'}
            </button>
          </div>
        </div>

        {/* Dynamic Controls based on Period Type */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          {periodType === 'month' ? (
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                <Calendar className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                {isAr ? 'اختر شهر التقرير' : 'Select Month'}
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  handleGenerateMonthlyReport(e.target.value);
                }}
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white font-medium text-slate-800 text-sm"
              />
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  {isAr ? 'من تاريخ:' : 'From Date:'}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white font-medium text-slate-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  {isAr ? 'إلى تاريخ:' : 'To Date:'}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white font-medium text-slate-800 text-sm"
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            <button
              onClick={() => {
                if (periodType === 'month') handleGenerateMonthlyReport(month);
                else handleGenerateCustomReport();
              }}
              className="flex-1 sm:flex-none bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md shadow-teal-600/20 transition flex items-center justify-center gap-2 text-sm"
            >
              <Activity className="w-4 h-4" />
              <span>{isAr ? 'تحديث التقرير' : 'Generate'}</span>
            </button>

            {reportData && (
              <>
                <button
                  onClick={handlePrint}
                  id="btn-print"
                  className="flex-1 sm:flex-none bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md shadow-slate-900/20 transition flex items-center justify-center gap-2 text-sm"
                  title={isAr ? 'طباعة التقرير الرسمي أو حفظ كـ PDF' : 'Print Official Report or Save as PDF'}
                >
                  <Printer className="w-4 h-4 text-teal-400" />
                  <span>{isAr ? 'طباعة التقرير (Print / PDF)' : 'Print Report'}</span>
                </button>

                <button
                  onClick={handleDownloadExcel}
                  id="btn-excel"
                  className="flex-1 sm:flex-none bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2 text-sm"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="hidden sm:inline">{isAr ? 'تصدير إكسيل (.xlsx)' : 'Export Excel'}</span>
                  <span className="sm:hidden">{isAr ? 'إكسيل' : 'Excel'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Generated Report Content Container */}
      {reportData && (
        <div
          id="report-printable-area"
          className="p-4 sm:p-7 bg-white rounded-2xl shadow-sm border border-slate-200 space-y-6 print:border-none print:shadow-none print:p-0"
        >
          {/* ======================================================== */}
          {/* OFFICIAL HOSPITAL PRINT HEADER (Visible on Screen & Print) */}
          {/* ======================================================== */}
          <div className="border-b-2 border-slate-800 pb-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              {/* Left/Right Hospital Emblem & Title */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-700 text-white flex items-center justify-center shadow-md flex-shrink-0 print:border print:border-slate-800">
                  <Activity className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-xs uppercase font-extrabold tracking-wider text-teal-700">
                    {isAr ? 'قسم العناية المركزة والرعاية الحرجة' : 'Intensive Care Unit (ICU)'}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {isAr ? 'تقرير التعداد السريري والإحصائي' : 'Clinical Census & Activity Report'}
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    {isAr ? 'مستشفى الرعاية المركزة - السجلات الطبية المعتمدة' : 'Medical Records & ICU Quality Department'}
                  </p>
                </div>
              </div>

              {/* Meta Box: Reference, Period & Date */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1 w-full sm:w-auto text-left sm:text-right print:bg-white print:border print:border-slate-300">
                <div className="flex justify-between sm:justify-end gap-3">
                  <span className="text-slate-400 font-semibold">{isAr ? 'فترة التقرير:' : 'Report Period:'}</span>
                  <span className="font-bold text-slate-900 font-mono">{reportTitle}</span>
                </div>
                <div className="flex justify-between sm:justify-end gap-3">
                  <span className="text-slate-400 font-semibold">{isAr ? 'تاريخ التقرير:' : 'Generated At:'}</span>
                  <span className="font-medium text-slate-800">
                    {formatDate(generatedAt, lang, { withWeekday: true })} • {formatTime(generatedAt.slice(11, 16), lang)}
                  </span>
                </div>
                <div className="flex justify-between sm:justify-end gap-3">
                  <span className="text-slate-400 font-semibold">{isAr ? 'الحالات في التعداد:' : 'Patients in Census:'}</span>
                  <span className="font-bold text-teal-700">{reportData.records.length} {isAr ? 'مريض' : 'patients'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* STATS & CLINICAL QUALITY INDICATORS                      */}
          {/* ======================================================== */}
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
              <span>{isAr ? 'المؤشرات السريرية والإحصائية الرئيسية' : 'Key Clinical & Operational Metrics'}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {/* Admissions */}
              <div className="bg-blue-50/80 border border-blue-200 p-3.5 rounded-xl text-center print:border print:border-slate-300 print:bg-white">
                <div className="text-[11px] text-blue-800 font-bold uppercase tracking-wider">
                  {isAr ? 'الدخول الجديد' : 'Admissions'}
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 font-mono">
                  {reportData.admissions}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {isAr ? 'حالة جديدة بالفترة' : 'New admissions'}
                </div>
              </div>

              {/* Discharges */}
              <div className="bg-orange-50/80 border border-orange-200 p-3.5 rounded-xl text-center print:border print:border-slate-300 print:bg-white">
                <div className="text-[11px] text-orange-800 font-bold uppercase tracking-wider">
                  {isAr ? 'حالات الخروج' : 'Discharges'}
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 font-mono">
                  {reportData.discharges}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {isAr ? 'إجمالي المنتهية إقامتهم' : 'Total discharges'}
                </div>
              </div>

              {/* Patient Days */}
              <div className="bg-teal-50/80 border border-teal-200 p-3.5 rounded-xl text-center print:border print:border-slate-300 print:bg-white">
                <div className="text-[11px] text-teal-800 font-bold uppercase tracking-wider">
                  {isAr ? 'أيام المرضى' : 'Patient Days'}
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 font-mono">
                  {reportData.totalDays}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {isAr ? 'أيام رعاية فعلية' : 'Calculated days'}
                </div>
              </div>

              {/* Average Length of Stay (ALOS) */}
              <div className="bg-purple-50/80 border border-purple-200 p-3.5 rounded-xl text-center print:border print:border-slate-300 print:bg-white">
                <div className="text-[11px] text-purple-800 font-bold uppercase tracking-wider">
                  {isAr ? 'متوسط الإقامة (ALOS)' : 'Avg Stay (ALOS)'}
                </div>
                <div className="text-2xl sm:text-3xl font-black text-purple-900 mt-1 font-mono">
                  {calculatedAlos} <span className="text-xs font-sans text-slate-600">{isAr ? 'يوم' : 'd'}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {isAr ? 'أيام / حالة خروج' : 'Days / Discharge'}
                </div>
              </div>

              {/* Mortality Rate */}
              <div className={`p-3.5 rounded-xl text-center border print:border print:border-slate-300 print:bg-white ${
                calculatedMortality > 15
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                <div className="text-[11px] font-bold uppercase tracking-wider">
                  {isAr ? 'معدل الوفيات' : 'Mortality Rate'}
                </div>
                <div className="text-2xl sm:text-3xl font-black mt-1 font-mono">
                  %{calculatedMortality}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {reportData.breakdown.DIED} {isAr ? 'وفيات مسجلة' : 'Deaths'}
                </div>
              </div>

              {/* Outcomes Breakdown mini-panel */}
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs col-span-2 md:col-span-1 print:border print:border-slate-300 print:bg-white">
                <div className="font-bold text-slate-700 mb-1 border-b border-slate-200 pb-0.5 flex justify-between">
                  <span>{isAr ? 'تفصيل الخروج' : 'Outcomes'}</span>
                </div>
                <div className="space-y-0.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">DIS (تحسن):</span>
                    <span className="font-bold text-slate-900">{reportData.breakdown.DIS}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">TRANS (تحويل):</span>
                    <span className="font-bold text-blue-700">{reportData.breakdown.TRANS}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">DAMA (نصح):</span>
                    <span className="font-bold text-amber-700">{reportData.breakdown.DAMA}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans">DIED (وفاة):</span>
                    <span className="font-bold text-red-600">{reportData.breakdown.DIED}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* CENSUS LOG TABLE / CARDS                                 */}
          {/* ======================================================== */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 print:border-none">
            {/* Header / Table Toolbar (Screen only controls) */}
            <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row gap-3 justify-between items-start lg:items-center no-print">
              <div>
                <span className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-600" />
                  <span>{isAr ? 'بيانات التعداد السريري المفصل' : 'Detailed Patient Census'}</span>
                </span>
                <span className="text-xs text-slate-500 block sm:inline-block sm:ml-2">
                  {isAr ? 'أيام الإقامة الفعلية داخل هذه الفترة المحددة' : 'Calculated days in ICU during this time window'}
                </span>
              </div>

              {/* Filter, Search & View Controls */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                {/* Search */}
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 rtl:left-auto rtl:right-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder={isAr ? 'بحث بالاسم أو الملف...' : 'Search patient...'}
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="w-full text-xs pl-8 rtl:pl-2 rtl:pr-8 pr-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="text-xs py-1.5 px-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-700"
                >
                  <option value="ALL">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
                  <option value="Active">{isAr ? 'منوم حالياً (Active)' : 'Active (In ICU)'}</option>
                  <option value="DIS">{isAr ? 'خروج تحسن (DIS)' : 'Discharged (DIS)'}</option>
                  <option value="TRANS">{isAr ? 'تحويل (TRANS)' : 'Transferred (TRANS)'}</option>
                  <option value="DAMA">{isAr ? 'خروج ضد النصح (DAMA)' : 'D.A.M.A'}</option>
                  <option value="DIED">{isAr ? 'وفاة (DIED)' : 'Deceased (DIED)'}</option>
                </select>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-xs py-1.5 px-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-700"
                >
                  <option value="days">{isAr ? 'الأكثر إقامة' : 'Most Days'}</option>
                  <option value="admission">{isAr ? 'تاريخ الدخول' : 'Admission Date'}</option>
                  <option value="name">{isAr ? 'الاسم' : 'Patient Name'}</option>
                </select>

                {/* Cards vs Table Switcher */}
                <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-lg border border-slate-200">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                      viewMode === 'cards' ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-600'
                    }`}
                  >
                    <LayoutGrid className="w-3 h-3" />
                    <span>{isAr ? 'بطاقات' : 'Cards'}</span>
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                      viewMode === 'table' ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-600'
                    }`}
                  >
                    <TableIcon className="w-3 h-3" />
                    <span>{isAr ? 'جدول' : 'Table'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Print Only Header Banner for Table */}
            <div className="hidden print:block mb-3 pt-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase">
                {isAr ? 'قائمة المرضى والتعداد التفصيلي' : 'Patient Census Listing'} ({filteredRecords.length} {isAr ? 'حالة' : 'records'})
              </h3>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                {isAr ? 'لا توجد سجلات تطابق البحث أو الفلاتر المحددة.' : 'No patient records found matching your filters.'}
              </div>
            ) : (
              <>
                {/* Mobile Cards (Shown when viewMode === 'cards' on screen, hidden in print) */}
                {viewMode === 'cards' && (
                  <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/50 print:hidden">
                    {filteredRecords.map((r) => {
                      const isDischarged = r.status === 'Discharged';
                      const statusMeta = getDischargeStatusLabel(r.dischargeStatus, lang);
                      return (
                        <div
                          key={r.id}
                          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{r.patientName}</div>
                              <div className="text-slate-500 font-mono text-[11px]">#{r.medicalNo}</div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 uppercase block">{isAr ? 'أيام الفترة' : 'Days'}</span>
                              <span className="text-lg font-extrabold text-teal-700 font-mono">
                                {formatStayDuration(r.reportDays, lang)}
                              </span>
                            </div>
                          </div>

                          <div className="p-2 bg-slate-50 rounded-lg text-slate-700">
                            <span className="font-semibold text-slate-400 text-[10px] block uppercase">
                              {isAr ? 'التشخيص الطبي:' : 'Diagnosis:'}
                            </span>
                            <p className="line-clamp-2">{r.diagnosis}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
                            <div>
                              <span className="text-slate-400 block">{isAr ? 'تاريخ الدخول:' : 'Admission:'}</span>
                              <span className="font-medium text-slate-800">
                                {formatDate(r.admissionDate, lang)}
                              </span>
                              {r.admissionTime && (
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {formatTime(r.admissionTime, lang)}
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="text-slate-400 block">{isAr ? 'تاريخ الخروج:' : 'Discharge:'}</span>
                              {isDischarged ? (
                                <>
                                  <span className="font-medium text-slate-800">
                                    {formatDate(r.dischargeDate, lang)}
                                  </span>
                                  {r.dischargeTime && (
                                    <span className="text-[10px] text-slate-400 block font-mono">
                                      {formatTime(r.dischargeTime, lang)}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block">
                                  {isAr ? 'منوم حالياً' : 'Active (In ICU)'}
                                </span>
                              )}
                            </div>
                          </div>

                          {isDischarged && (
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-slate-500">{isAr ? 'حالة الخروج:' : 'Outcome:'}</span>
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${statusMeta.badgeClass}`}>
                                {statusMeta.name} {r.transferLocation ? `→ ${r.transferLocation}` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Printable and Desktop Table View */}
                <div className={`overflow-x-auto ${viewMode === 'cards' ? 'hidden print:block' : 'block'}`}>
                  <table className="w-full text-sm text-left rtl:text-right whitespace-nowrap">
                    <thead className="text-xs text-slate-600 uppercase bg-slate-100 border-b border-slate-300">
                      <tr>
                        <th className="px-3.5 py-3 font-bold">{isAr ? 'رقم الملف' : 'MRN'}</th>
                        <th className="px-3.5 py-3 font-bold">{isAr ? 'اسم المريض' : 'Patient Name'}</th>
                        <th className="px-3.5 py-3 font-bold">{isAr ? 'تاريخ الدخول' : 'Admission Date'}</th>
                        <th className="px-3.5 py-3 font-bold">{isAr ? 'التشخيص الطبي' : 'Diagnosis'}</th>
                        <th className="px-3.5 py-3 font-bold">{isAr ? 'قرح الفراش' : 'PU / Wounds'}</th>
                        <th className="px-3.5 py-3 font-bold">{isAr ? 'تاريخ الخروج' : 'Discharge Date'}</th>
                        <th className="px-3.5 py-3 font-bold">{isAr ? 'حالة ومخرجات الخروج' : 'Outcome Status'}</th>
                        <th className="px-3.5 py-3 font-bold">{isAr ? 'ملاحظات الخروج' : 'Discharge Notes'}</th>
                        <th className="px-3.5 py-3 font-bold text-center">{isAr ? 'أيام الفترة' : 'Days in Period'}</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredRecords.map((r, idx) => {
                        const isDischarged = r.status === 'Discharged';
                        const statusMeta = getDischargeStatusLabel(r.dischargeStatus, lang);

                        return (
                          <tr
                            key={r.id}
                            className={`hover:bg-slate-50/80 transition print-avoid-break ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                            }`}
                          >
                            <td className="px-3.5 py-2.5 font-mono font-semibold text-slate-700">
                              #{r.medicalNo}
                            </td>
                            <td className="px-3.5 py-2.5 font-bold text-slate-900">
                              {r.patientName}
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-700">
                              <div>{formatDate(r.admissionDate, lang)}</div>
                              {r.admissionTime && (
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {formatTime(r.admissionTime, lang)}
                                </div>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-600 truncate max-w-[190px]" title={r.diagnosis}>
                              {r.diagnosis}
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-600 truncate max-w-[100px]">
                              {r.pu && r.pu !== 'None' ? r.pu : '-'}
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-700">
                              {isDischarged ? (
                                <>
                                  <div>{formatDate(r.dischargeDate, lang)}</div>
                                  {r.dischargeTime && (
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      {formatTime(r.dischargeTime, lang)}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span className="text-teal-700 font-bold bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1 text-[11px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse no-print" />
                                  {isAr ? 'منوم حالياً' : 'Active (In ICU)'}
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5">
                              {isDischarged ? (
                                <div>
                                  <span className={`px-2 py-0.5 rounded font-bold border text-[11px] inline-block ${statusMeta.badgeClass}`}>
                                    {statusMeta.code} - {statusMeta.name}
                                  </span>
                                  {r.dischargeStatus === 'Trans' && r.transferLocation && (
                                    <div className="text-[11px] text-blue-600 font-medium mt-0.5">
                                      → {r.transferLocation}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td
                              className="px-3.5 py-2.5 text-slate-500 text-[11px] italic truncate max-w-[150px]"
                              title={r.dischargeReason || ''}
                            >
                              {isDischarged && r.dischargeReason ? r.dischargeReason : '-'}
                            </td>
                            <td className="px-3.5 py-2.5 font-mono font-extrabold text-slate-900 text-center text-sm">
                              {r.reportDays}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* ======================================================== */}
          {/* OFFICIAL SIGNATURES & STAMP BLOCK (Visible on Print)    */}
          {/* ======================================================== */}
          <div className="report-signature-block pt-6 border-t border-slate-300 print-avoid-break">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center text-xs text-slate-700">
              {/* ICU Head */}
              <div className="p-4 rounded-xl border border-dashed border-slate-300 space-y-4">
                <div className="font-bold text-slate-900 text-sm">
                  {isAr ? 'رئيس قسم العناية المركزة' : 'Head of ICU Department'}
                </div>
                <div className="text-slate-400 italic text-[11px]">
                  {isAr ? 'التوقيع والاعتماد' : 'Signature & Approval'}
                </div>
                <div className="pt-6 border-b border-slate-300" />
                <div className="text-[10px] text-slate-400">
                  {isAr ? 'التاريخ: .... / .... / 2026 م' : 'Date: .... / .... / 2026'}
                </div>
              </div>

              {/* Medical Records / Census Officer */}
              <div className="p-4 rounded-xl border border-dashed border-slate-300 space-y-4">
                <div className="font-bold text-slate-900 text-sm">
                  {isAr ? 'مسؤول التعداد والسجلات الطبية' : 'Medical Records & Census Officer'}
                </div>
                <div className="text-slate-400 italic text-[11px]">
                  {isAr ? 'مراجعة وتدقيق البيانات' : 'Audited & Verified By'}
                </div>
                <div className="pt-6 border-b border-slate-300" />
                <div className="text-[10px] text-slate-400">
                  {isAr ? 'التاريخ: .... / .... / 2026 م' : 'Date: .... / .... / 2026'}
                </div>
              </div>

              {/* Medical Director & Stamp */}
              <div className="p-4 rounded-xl border border-dashed border-slate-300 space-y-4">
                <div className="font-bold text-slate-900 text-sm">
                  {isAr ? 'اعتماد المدير الطبي للمستشفى' : 'Medical Director Approval'}
                </div>
                <div className="w-16 h-16 mx-auto rounded-full border-2 border-slate-300 flex items-center justify-center text-slate-300 text-[10px] font-bold">
                  {isAr ? 'الختم الرسمي' : 'Official Stamp'}
                </div>
                <div className="pt-1 border-b border-slate-300" />
                <div className="text-[10px] text-slate-400">
                  {isAr ? 'التاريخ: .... / .... / 2026 م' : 'Date: .... / .... / 2026'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
