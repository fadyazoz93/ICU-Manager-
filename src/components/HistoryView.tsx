import React, { useState, useEffect } from 'react';
import { PatientRecord } from '../types/icu';
import { getStoredRecords, deleteRecord, syncFromGoogleSheetLive } from '../services/storage';
import {
  Search,
  Filter,
  RefreshCw,
  Trash2,
  ExternalLink,
  LogOut,
  FileText,
  LayoutGrid,
  Table as TableIcon,
  Calendar,
  Clock,
  Bed,
  MapPin,
  Stethoscope,
  FileSpreadsheet,
} from 'lucide-react';

interface HistoryViewProps {
  lang: 'en' | 'ar';
  onDischargePatient: (medicalNo: string) => void;
  onViewPatientDetails: (patient: PatientRecord) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  lang,
  onDischargePatient,
  onViewPatientDetails,
}) => {
  const isAr = lang === 'ar';

  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Responsive mode: 'cards' on mobile screens by default, 'table' on desktop
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'table';
  });

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = () => {
    const list = getStoredRecords();
    setRecords(list);
  };

  const handleSyncSheet = async () => {
    setIsSyncing(true);
    try {
      const res = await syncFromGoogleSheetLive();
      if (res.success) {
        const list = getStoredRecords();
        setRecords(list);
      } else {
        alert(isAr ? `فشل التحديث: ${res.error}` : `Sync failed: ${res.error}`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    const confirmMsg = isAr
      ? `هل أنت متأكد من حذف سجل المريض: ${name}؟ لا يمكن التراجع عن هذا الإجراء.`
      : `Are you sure you want to delete the record for ${name}? This action cannot be undone.`;

    if (window.confirm(confirmMsg)) {
      deleteRecord(id);
      loadRecords();
    }
  };

  // Filter Logic matching original Apps Script logic
  const filteredRecords = records.filter((r) => {
    const term = search.toLowerCase().trim();
    const matchesSearch =
      !term ||
      r.medicalNo.toLowerCase().includes(term) ||
      r.patientName.toLowerCase().includes(term) ||
      (r.diagnosis && r.diagnosis.toLowerCase().includes(term));

    let matchesFilter = true;
    if (filter === 'Active') {
      matchesFilter = r.status === 'Active';
    } else if (filter === 'Discharged') {
      matchesFilter = r.status === 'Discharged';
    } else if (['DIS', 'TRANS', 'DAMA', 'DIED'].includes(filter)) {
      const status = r.dischargeStatus ? r.dischargeStatus.toUpperCase() : '';
      matchesFilter = status === filter;
    }

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-4">
      {/* Control & Filter Toolbar */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-4 sm:p-5 space-y-3 sm:space-y-4">
        {/* Title and View Switcher */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-800 text-lg sm:text-xl">
                {isAr ? 'سجل وأرشيف المرضى' : 'Patient Records'}
              </h2>
              <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-slate-200">
                {filteredRecords.length} {isAr ? 'حالة' : 'records'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAr ? 'إدارة وتتبع سجلات الدخول والخروج بالعناية المركزة' : 'Manage admission and discharge history'}
            </p>
          </div>

          {/* View Mode Toggle (Cards vs Table) */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('cards')}
              title={isAr ? 'عرض بطاقات' : 'Card View'}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'cards'
                  ? 'bg-white text-teal-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{isAr ? 'بطاقات' : 'Cards'}</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              title={isAr ? 'عرض جدول' : 'Table View'}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'table'
                  ? 'bg-white text-teal-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>{isAr ? 'جدول' : 'Table'}</span>
            </button>
          </div>
        </div>

        {/* Search, Filter & Refresh Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1 border-t border-slate-100">
          {/* Search Input */}
          <div className="sm:col-span-6 relative">
            <input
              type="text"
              id="histSearch"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAr ? 'بحث بالاسم، الرقم الطبي، أو التشخيص...' : 'Search Name, Medical No, Diagnosis...'}
              className="pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 w-full bg-white font-medium"
            />
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-5">
            <select
              id="histFilter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full py-2 px-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white font-medium text-slate-700"
            >
              <option value="All">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
              <option value="Active">{isAr ? 'منوم حالياً (Active)' : 'Active (Admitted)'}</option>
              <option value="Discharged">{isAr ? 'جميع حالات الخروج' : 'All Discharged'}</option>
              <option value="DIS">{isAr ? 'DIS خروج منزل' : 'DIS Only'}</option>
              <option value="TRANS">{isAr ? 'TRANS تحويل' : 'Transferred Only'}</option>
              <option value="DAMA">{isAr ? 'DAMA ضد النصح' : 'DAMA Only'}</option>
              <option value="DIED">{isAr ? 'DIED وفيات' : 'DIED Only'}</option>
            </select>
          </div>

          {/* Sync & Refresh Buttons */}
          <div className="sm:col-span-1 flex items-center justify-end gap-1.5">
            <button
              onClick={handleSyncSheet}
              disabled={isSyncing}
              className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl transition flex items-center justify-center shadow-xs"
              title={isAr ? 'مزامنة حية من Google Sheet' : 'Live Sync from Google Sheet'}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
            <button
              onClick={loadRecords}
              className="p-2 bg-slate-50 border border-slate-300 rounded-xl hover:bg-slate-100 text-slate-600 transition flex items-center justify-center shadow-xs"
              title={isAr ? 'إعادة تحميل محلي' : 'Reload'}
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center text-slate-400">
          <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2.5" />
          <p className="font-semibold text-slate-700">
            {isAr ? 'لم يتم العثور على أي سجلات مطابقة للبحث' : 'No matching records found'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? 'جرب تغيير شروط البحث أو الفلتر' : 'Try clearing your search query or status filter'}
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* CARDS VIEW: Perfect for Mobile & Tablet */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredRecords.map((r) => {
            const isDischarged = r.status === 'Discharged';
            return (
              <div
                key={r.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm hover:shadow-md transition space-y-3.5 flex flex-col justify-between"
              >
                {/* Card Top: Name, MRN, and Status */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-snug">
                        {r.patientName}
                      </h3>
                      <div className="text-xs font-mono text-slate-500 font-semibold mt-0.5">
                        #{r.medicalNo}
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 flex-shrink-0 ${
                        r.status === 'Active'
                          ? 'bg-teal-50 text-teal-800 border border-teal-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          r.status === 'Active' ? 'bg-teal-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      {r.status}
                    </span>
                  </div>

                  {/* Diagnosis */}
                  <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700">
                    <span className="font-bold text-slate-500 block mb-0.5 flex items-center gap-1">
                      <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                      {isAr ? 'التشخيص الطبي:' : 'Diagnosis:'}
                    </span>
                    <p className="line-clamp-2 leading-relaxed">{r.diagnosis}</p>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">
                        {isAr ? 'تاريخ الدخول:' : 'Admission:'}
                      </span>
                      <span className="font-medium text-slate-800 font-mono">
                        {r.admissionDate} <span className="text-[10px] text-slate-400">{r.admissionTime}</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">
                        {isAr ? 'جهة الدخول:' : 'From:'}
                      </span>
                      <span className="font-medium text-slate-800 truncate block">
                        {r.fromLocation || '-'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">
                        {isAr ? 'قرح الفراش:' : 'PU / Wounds:'}
                      </span>
                      <span className="font-medium text-slate-800 truncate block">
                        {r.pu || 'None'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">
                        {isAr ? 'مدة الإقامة:' : 'Total Stay:'}
                      </span>
                      <span className="font-bold text-teal-700 font-mono">
                        {r.lengthOfStay ? `${r.lengthOfStay}d` : '-'}
                      </span>
                    </div>

                    {/* Discharge status info if discharged */}
                    {isDischarged && (
                      <div className="col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">
                            {isAr ? 'تاريخ وحالة الخروج:' : 'Discharge:'}
                          </span>
                          <span className="font-mono text-slate-700">
                            {r.dischargeDate}
                          </span>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold inline-block ${
                              r.dischargeStatus === 'DIED'
                                ? 'bg-red-100 text-red-700'
                                : r.dischargeStatus === 'DAMA'
                                ? 'bg-amber-100 text-amber-800'
                                : r.dischargeStatus === 'Trans'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {r.dischargeStatus}
                          </span>
                          {r.dischargeStatus === 'Trans' && r.transferLocation && (
                            <div className="text-[11px] text-blue-600 font-medium">
                              → {r.transferLocation}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onViewPatientDetails(r)}
                      className="p-2 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition flex items-center gap-1 text-xs font-semibold"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{isAr ? 'الملف' : 'Details'}</span>
                    </button>
                    <button
                      onClick={() => handleDelete(r.id, r.patientName)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                      title={isAr ? 'حذف السجل' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {r.status === 'Active' && (
                    <button
                      onClick={() => onDischargePatient(r.medicalNo)}
                      className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{isAr ? 'تسجيل خروج' : 'Discharge'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW: Classic Full Spreadsheet View with Horizontal Scrolling */
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-slate-500 uppercase bg-slate-100/90 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5 font-bold">{isAr ? 'الرقم الطبي' : 'Medical No'}</th>
                  <th className="px-4 py-3.5 font-bold">{isAr ? 'اسم المريض' : 'Name'}</th>
                  <th className="px-4 py-3.5 font-bold">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3.5 font-bold">{isAr ? 'تاريخ الدخول' : 'Admission'}</th>
                  <th className="px-4 py-3.5 font-bold">{isAr ? 'التشخيص' : 'Diagnosis'}</th>
                  <th className="px-4 py-3.5 font-bold">{isAr ? 'قرح الفراش' : 'PU or Wounds'}</th>
                  <th className="px-4 py-3.5 font-bold">{isAr ? 'تاريخ الخروج' : 'Discharge Date'}</th>
                  <th className="px-4 py-3.5 font-bold">{isAr ? 'حالة الخروج' : 'Discharge Status'}</th>
                  <th className="px-4 py-3.5 font-bold">{isAr ? 'سبب / ملاحظات' : 'Discharge Reason'}</th>
                  <th className="px-4 py-3.5 font-bold">{isAr ? 'مدة الإقامة' : 'Total Stay'}</th>
                  <th className="px-4 py-3.5 font-bold text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>

              <tbody id="history-body" className="divide-y divide-slate-100">
                {filteredRecords.map((r) => {
                  const isDischarged = r.status === 'Discharged';
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-700">
                        {r.medicalNo}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {r.patientName}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                            r.status === 'Active'
                              ? 'bg-teal-100 text-teal-800 border border-teal-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              r.status === 'Active' ? 'bg-teal-500 animate-pulse' : 'bg-slate-400'
                            }`}
                          />
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="font-medium text-slate-800">{r.admissionDate}</div>
                        <div className="text-xs text-slate-400 font-mono">{r.admissionTime}</div>
                      </td>
                      <td
                        className="px-4 py-3 text-slate-600 truncate max-w-[160px]"
                        title={r.diagnosis}
                      >
                        {r.diagnosis}
                      </td>
                      <td
                        className="px-4 py-3 text-slate-600 truncate max-w-[110px]"
                        title={r.pu || '-'}
                      >
                        {r.pu || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {isDischarged ? (
                          r.dischargeDate
                        ) : (
                          <span className="text-teal-600 font-medium text-xs bg-teal-50 px-2 py-0.5 rounded">
                            {isAr ? 'منوم حالياً' : 'In ICU'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isDischarged ? (
                          <div className="flex flex-col">
                            <span
                              className={`font-bold text-xs px-2 py-0.5 rounded w-fit ${
                                r.dischargeStatus === 'DIED'
                                  ? 'bg-red-100 text-red-700'
                                  : r.dischargeStatus === 'DAMA'
                                  ? 'bg-amber-100 text-amber-800'
                                  : r.dischargeStatus === 'Trans'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {r.dischargeStatus}
                            </span>
                            {r.dischargeStatus === 'Trans' && r.transferLocation && (
                              <span className="text-xs text-blue-600 mt-0.5 font-medium">
                                → {r.transferLocation}
                              </span>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td
                        className="px-4 py-3 text-slate-600 text-xs italic max-w-[150px] truncate"
                        title={r.dischargeReason || ''}
                      >
                        {isDischarged ? r.dischargeReason || '-' : '-'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 font-mono">
                        {r.lengthOfStay ? `${r.lengthOfStay}d` : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {r.status === 'Active' && (
                            <button
                              onClick={() => onDischargePatient(r.medicalNo)}
                              className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition"
                              title={isAr ? 'تسجيل الخروج' : 'Discharge Patient'}
                            >
                              <LogOut className="w-3 h-3" />
                              <span>{isAr ? 'خروج' : 'Discharge'}</span>
                            </button>
                          )}

                          <button
                            onClick={() => onViewPatientDetails(r)}
                            className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                            title={isAr ? 'عرض تفاصيل الملف' : 'View Details'}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(r.id, r.patientName)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title={isAr ? 'حذف السجل' : 'Delete Record'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
