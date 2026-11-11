import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { MonthlyReportData } from '../types/icu';
import { getMonthlyReport } from '../services/storage';
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
} from 'lucide-react';

interface ReportsViewProps {
  lang: 'en' | 'ar';
}

export const ReportsView: React.FC<ReportsViewProps> = ({ lang }) => {
  const isAr = lang === 'ar';

  const [month, setMonth] = useState(() => {
    return new Date().toISOString().slice(0, 7);
  });

  const [reportData, setReportData] = useState<MonthlyReportData | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'table';
  });

  useEffect(() => {
    handleLoadReport();
  }, []);

  const handleLoadReport = () => {
    if (!month) return;
    const data = getMonthlyReport(month);
    setReportData(data);
    setGeneratedAt(new Date().toLocaleString());
  };

  const handleDownloadExcel = () => {
    if (!reportData) return;
    const monthVal = reportData.month;
    const data = reportData;

    // 1. Prepare Data Array matching original structure
    const ws_data: any[][] = [
      [`Waheed ICU Monthly Report - ${monthVal}`],
      [`Generated on: ${new Date().toLocaleString()}`],
      [],
      ["SUMMARY STATISTICS"],
      ["Total Admissions", data.admissions],
      ["Total Discharges", data.discharges],
      ["Total Patient Days", data.totalDays],
      [],
      ["DISCHARGE BREAKDOWN"],
      ["DIS", data.breakdown.DIS],
      ["TRANS", data.breakdown.TRANS],
      ["DAMA", data.breakdown.DAMA],
      ["DIED", data.breakdown.DIED],
      [],
      ["DETAILED PATIENT LOG"],
      [
        "Medical No",
        "Patient Name",
        "Admission Date",
        "Diagnosis",
        "PU or Wounds",
        "Discharge Date",
        "Discharge Status",
        "Transfer To",
        "Discharge Reason",
        "Days in Month"
      ]
    ];

    // 2. Add Patient Rows
    data.records.forEach(r => {
      ws_data.push([
        r.medicalNo,
        r.patientName,
        r.admissionDate,
        r.diagnosis,
        r.pu || "",
        r.dischargeDate || "Active",
        r.dischargeStatus || "",
        r.transferLocation || "",
        r.dischargeReason || "",
        r.reportDays
      ]);
    });

    // 3. Generate Worksheet & Workbook
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    ws['!cols'] = [
      { wch: 14 },
      { wch: 25 },
      { wch: 15 },
      { wch: 35 },
      { wch: 15 },
      { wch: 15 },
      { wch: 16 },
      { wch: 20 },
      { wch: 35 },
      { wch: 14 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monthly Report");
    XLSX.writeFile(wb, `Waheed_ICU_Report_${monthVal}.xlsx`);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Selection & Action Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-200 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
            <Calendar className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
            {isAr ? 'اختر شهر التقرير (Select Month)' : 'Select Month'}
          </label>
          <input
            type="month"
            id="reportMonth"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white font-medium text-slate-800 text-sm"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleLoadReport}
            className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md shadow-teal-600/20 transition flex items-center justify-center gap-2 text-sm"
          >
            <Activity className="w-4 h-4" />
            <span>{isAr ? 'توليد التقرير' : 'Generate'}</span>
          </button>

          {reportData && (
            <button
              onClick={handleDownloadExcel}
              id="btn-excel"
              className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2 text-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isAr ? 'تصدير إكسيل (.xlsx)' : 'Download Excel'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Generated Report Content */}
      {reportData && (
        <div id="report-content" className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm border border-slate-200 space-y-5 sm:space-y-6">
          {/* Header Title */}
          <div className="border-b border-slate-200 pb-4 flex justify-between items-start sm:items-center flex-wrap gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900" id="report-title">
                {isAr ? `تقرير العناية المركزة لشهر: ${reportData.month}` : `ICU Report: ${reportData.month}`}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5" id="report-subtitle">
                {isAr ? `تاريخ الإصدار: ${generatedAt}` : `Generated on ${generatedAt}`}
              </p>
            </div>
            <span className="bg-slate-100 text-slate-700 text-xs px-3 py-1 rounded-full font-bold border border-slate-200">
              {reportData.records.length} {isAr ? 'حالة في التعداد' : 'Patients in Census'}
            </span>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-blue-50/80 border border-blue-100 p-3.5 sm:p-4 rounded-xl text-center shadow-xs">
              <div className="text-[11px] sm:text-xs text-blue-700 font-bold uppercase tracking-wider">
                {isAr ? 'حالات الدخول' : 'Admissions'}
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1" id="stat-adm">
                {reportData.admissions}
              </div>
            </div>

            <div className="bg-orange-50/80 border border-orange-100 p-3.5 sm:p-4 rounded-xl text-center shadow-xs">
              <div className="text-[11px] sm:text-xs text-orange-700 font-bold uppercase tracking-wider">
                {isAr ? 'حالات الخروج' : 'Discharges'}
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1" id="stat-dis">
                {reportData.discharges}
              </div>
            </div>

            <div className="bg-teal-50/80 border border-teal-100 p-3.5 sm:p-4 rounded-xl text-center shadow-xs">
              <div className="text-[11px] sm:text-xs text-teal-700 font-bold uppercase tracking-wider">
                {isAr ? 'أيام المرضى' : 'Patient Days'}
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1" id="stat-days">
                {reportData.totalDays}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 sm:p-4 rounded-xl text-left text-xs col-span-2 md:col-span-1">
              <div className="font-bold text-slate-700 mb-1.5 border-b border-slate-200 pb-1 flex justify-between">
                <span>{isAr ? 'تفصيل الخروج' : 'Breakdown'}</span>
              </div>
              <div className="space-y-0.5 font-mono text-[11px] sm:text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-sans">DIS:</span>
                  <span id="count-dis" className="font-bold text-slate-900">{reportData.breakdown.DIS}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-sans">TRANS:</span>
                  <span id="count-trans" className="font-bold text-blue-700">{reportData.breakdown.TRANS}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-sans">DAMA:</span>
                  <span id="count-dama" className="font-bold text-amber-700">{reportData.breakdown.DAMA}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-sans">DIED:</span>
                  <span id="count-died" className="font-bold text-red-600">{reportData.breakdown.DIED}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Census Section */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
            <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
              <div>
                <span className="font-bold text-slate-800 text-sm sm:text-base">
                  {isAr ? 'التعداد الشهري المفصل للمرضى (Census)' : 'Detailed Monthly Census'}
                </span>
                <span className="text-xs font-normal text-slate-500 block sm:inline-block sm:ml-2">
                  {isAr ? 'أيام الإقامة الفعلية خلال هذا الشهر' : 'Days in ICU during this specific month'}
                </span>
              </div>

              {/* View mode toggle */}
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 self-end sm:self-auto">
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

            {reportData.records.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                {isAr ? 'لا يوجد نشاط مسجل في هذا الشهر.' : 'No activity found for this month.'}
              </div>
            ) : viewMode === 'cards' ? (
              /* Census Cards for Mobile */
              <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/50">
                {reportData.records.map((r) => {
                  const isDischarged = r.status === 'Discharged';
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
                          <span className="text-[10px] text-slate-400 uppercase block">{isAr ? 'أيام الشهر' : 'Days'}</span>
                          <span className="text-base font-extrabold text-teal-700 font-mono">
                            {r.reportDays} {isAr ? 'يوم' : 'd'}
                          </span>
                        </div>
                      </div>

                      <div className="p-2 bg-slate-50 rounded-lg text-slate-700">
                        <span className="font-semibold text-slate-400 text-[10px] block uppercase">{isAr ? 'التشخيص:' : 'Diagnosis:'}</span>
                        <p className="line-clamp-2">{r.diagnosis}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div>
                          <span className="text-slate-400 block">{isAr ? 'الدخول:' : 'Admission:'}</span>
                          <span className="font-mono text-slate-800">{r.admissionDate}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">{isAr ? 'الخروج:' : 'Discharge:'}</span>
                          <span className="font-mono text-slate-800">
                            {r.dischargeDate || (
                              <span className="text-teal-600 font-bold">{isAr ? 'منوم' : 'Active'}</span>
                            )}
                          </span>
                        </div>
                        {isDischarged && (
                          <div className="col-span-2 flex items-center justify-between pt-1 border-t border-slate-100">
                            <span className="text-slate-400">{isAr ? 'الحالة:' : 'Status:'}</span>
                            <span
                              className={`font-bold px-1.5 py-0.5 rounded ${
                                r.dischargeStatus === 'DIED' ? 'text-red-600 bg-red-50' : 'text-slate-800 bg-slate-100'
                              }`}
                            >
                              {r.dischargeStatus} {r.transferLocation ? `→ ${r.transferLocation}` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Census Table */
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">{isAr ? 'المريض' : 'Patient'}</th>
                      <th className="px-4 py-3">{isAr ? 'تاريخ الدخول' : 'Admission'}</th>
                      <th className="px-4 py-3">{isAr ? 'التشخيص' : 'Diagnosis'}</th>
                      <th className="px-4 py-3">{isAr ? 'قرح الفراش' : 'PU or Wounds'}</th>
                      <th className="px-4 py-3">{isAr ? 'تاريخ الخروج' : 'Discharge Date'}</th>
                      <th className="px-4 py-3">{isAr ? 'حالة الخروج' : 'Discharge Status'}</th>
                      <th className="px-4 py-3">{isAr ? 'ملاحظات الخروج' : 'Discharge Reason'}</th>
                      <th className="px-4 py-3 text-right">{isAr ? 'أيام الشهر' : 'Days (Month)'}</th>
                    </tr>
                  </thead>

                  <tbody id="report-body" className="divide-y divide-slate-100">
                    {reportData.records.map((r) => {
                      const isDischarged = r.status === 'Discharged';
                      return (
                        <tr key={r.id} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{r.patientName}</div>
                            <div className="text-xs text-slate-500 font-mono">#{r.medicalNo}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                            {r.admissionDate}
                          </td>
                          <td className="px-4 py-3 text-slate-600 truncate max-w-[170px]" title={r.diagnosis}>
                            {r.diagnosis}
                          </td>
                          <td className="px-4 py-3 text-slate-600 truncate max-w-[110px]">
                            {r.pu || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                            {r.dischargeDate || (
                              <span className="text-teal-700 text-xs font-bold bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                                {isAr ? 'منوم' : 'Active'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isDischarged ? (
                              <div className="flex flex-col">
                                <span
                                  className={`font-bold text-xs ${
                                    r.dischargeStatus === 'DIED' ? 'text-red-600' : 'text-slate-800'
                                  }`}
                                >
                                  {r.dischargeStatus}
                                </span>
                                {r.dischargeStatus === 'Trans' && r.transferLocation && (
                                  <div className="text-xs text-blue-600 font-medium">
                                    → {r.transferLocation}
                                  </div>
                                )}
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs italic truncate max-w-[150px]" title={r.dischargeReason || ''}>
                            {isDischarged && r.dischargeReason ? r.dischargeReason : '-'}
                          </td>
                          <td className="px-4 py-3 font-extrabold text-slate-900 text-right font-mono text-base">
                            {r.reportDays}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
