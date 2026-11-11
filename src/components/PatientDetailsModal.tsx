import React, { useEffect } from 'react';
import { PatientRecord } from '../types/icu';
import {
  X,
  Printer,
  Calendar,
  Clock,
  CheckCircle2,
  Activity,
  User,
  FileText,
  Building2,
  Stethoscope,
  HeartPulse,
} from 'lucide-react';
import {
  formatDate,
  formatTime,
  formatStayDuration,
  getDischargeStatusLabel,
  calculateActiveStayDays,
} from '../utils/dateFormatter';

interface PatientDetailsModalProps {
  patient: PatientRecord | null;
  onClose: () => void;
  lang: 'en' | 'ar';
}

export const PatientDetailsModal: React.FC<PatientDetailsModalProps> = ({
  patient,
  onClose,
  lang,
}) => {
  if (!patient) return null;
  const isAr = lang === 'ar';

  // Mark body when modal is open so print media styles can hide #app and unclip this modal
  useEffect(() => {
    document.body.classList.add('patient-modal-active');
    return () => {
      document.body.classList.remove('patient-modal-active');
    };
  }, [patient]);

  const handlePrint = () => {
    // Add specific print class and trigger print
    document.body.classList.add('patient-modal-active');
    // Small timeout to allow browser layout calculation before opening print dialog
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const isDischarged = patient.status === 'Discharged';
  const statusMeta = getDischargeStatusLabel(patient.dischargeStatus, lang);
  const stayDays = isDischarged
    ? patient.lengthOfStay || 1
    : calculateActiveStayDays(patient.admissionDate);

  const printDateStr = formatDate(new Date().toISOString().slice(0, 10), lang, { withWeekday: true });
  const printTimeStr = formatTime(new Date().toTimeString().slice(0, 5), lang);

  return (
    <div
      className="patient-modal-backdrop fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 print:p-0 print:m-0 print:bg-white print:static print:inset-auto"
      data-html2pdf-ignore={false}
    >
      <div className="patient-modal-card bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col print:border-none print:shadow-none print:max-h-none print:h-auto print:overflow-visible print:m-0 print:p-0 print:static">
        
        {/* ======================================================== */}
        {/* SCREEN TOP HEADER (Hidden during Print)                  */}
        {/* ======================================================== */}
        <div
          className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between no-print"
          data-html2pdf-ignore
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600/30 border border-teal-500/40 flex items-center justify-center text-teal-300 flex-shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">
                {isAr ? 'ملف المريض بالعناية المركزة' : 'ICU Patient Record'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                #{patient.medicalNo}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* OFFICIAL PRINT LETTERHEAD (Always visible in Print)      */}
        {/* ======================================================== */}
        <div className="hidden print:block p-4 border-b-2 border-slate-900 mb-4 bg-white">
          <div className="flex justify-between items-center pb-2">
            <div>
              <div className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">
                {isAr ? 'وزارة الصحة • قسم الرعاية المركزة والحرجة' : 'Ministry of Health • Intensive Care Department'}
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                {isAr ? 'بطاقة وسجل إقامة مريض بالعناية المركزة' : 'ICU Patient Stay & Clinical Slip'}
              </h1>
              <div className="text-[10px] text-slate-500 font-medium">
                {isAr ? 'ملخص الدخول ومخرجات الخروج السريرية المعتمدة' : 'Official Admission & Discharge Clinical Summary'}
              </div>
            </div>

            <div className="text-right text-xs font-mono text-slate-700 space-y-0.5 border-r pr-3 border-slate-300 rtl:border-r-0 rtl:border-l rtl:pr-0 rtl:pl-3">
              <div className="font-bold text-slate-900 text-sm">MRN: #{patient.medicalNo}</div>
              <div className="text-[10px] text-slate-500">
                {printDateStr} • {printTimeStr}
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SCROLLABLE MODAL CONTENT / PRINTABLE SLIP BODY           */}
        {/* ======================================================== */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 print:p-2 print:overflow-visible print:space-y-4">
          
          {/* Identity & Status Box */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-4 print:pb-3">
            <div>
              <div className="text-xs text-slate-400 uppercase font-semibold">
                {isAr ? 'اسم المريض' : 'Patient Name'}
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                {patient.patientName}
              </div>
              <div className="text-xs text-slate-600 font-mono mt-1">
                {isAr ? 'رقم السجل الطبي (MRN):' : 'Medical Record No:'}{' '}
                <span className="font-bold text-slate-900 text-sm">#{patient.medicalNo}</span>
              </div>
            </div>

            <div className="text-right">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border inline-block ${
                  patient.status === 'Active'
                    ? 'bg-teal-50 text-teal-800 border-teal-300 print:bg-white print:border-slate-400'
                    : 'bg-slate-100 text-slate-700 border-slate-300 print:bg-white print:border-slate-400'
                }`}
              >
                {patient.status === 'Active'
                  ? isAr
                    ? 'منوم حالياً (Active)'
                    : 'Currently Active'
                  : isAr
                  ? 'تم الخروج (Discharged)'
                  : 'Discharged'}
              </span>
              <div className="text-xs text-teal-800 font-bold mt-1.5 font-mono print:text-slate-900">
                {isAr ? 'مدة الإقامة:' : 'Length of Stay:'} {formatStayDuration(stayDays, lang)}
              </div>
            </div>
          </div>

          {/* Admission Info Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-white print:border print:border-slate-300 print:p-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase mb-3 flex items-center gap-1.5 border-b border-slate-200/80 pb-1.5">
              <Calendar className="w-4 h-4 text-teal-700 no-print" />
              <span>{isAr ? 'بيانات وتفاصيل الدخول' : 'Admission Details'}</span>
            </h4>
            <div className="grid grid-cols-2 gap-3.5 text-xs sm:text-sm">
              <div>
                <span className="text-xs text-slate-400 block font-medium">
                  {isAr ? 'تاريخ وتوقيت الدخول:' : 'Admission Date & Time:'}
                </span>
                <span className="font-bold text-slate-900">
                  {formatDate(patient.admissionDate, lang, { withWeekday: true })}
                </span>
                {patient.admissionTime && (
                  <span className="text-xs text-slate-500 block font-mono mt-0.5">
                    {formatTime(patient.admissionTime, lang)}
                  </span>
                )}
              </div>

              <div>
                <span className="text-xs text-slate-400 block font-medium">
                  {isAr ? 'محول من (جهة الدخول):' : 'Admitted From:'}
                </span>
                <span className="font-bold text-slate-900">
                  {patient.fromLocation || '-'}
                </span>
              </div>

              <div className="col-span-2">
                <span className="text-xs text-slate-400 block font-medium">
                  {isAr ? 'التشخيص الطبي عند الدخول:' : 'Primary Medical Diagnosis:'}
                </span>
                <p className="font-bold text-slate-900 mt-0.5 leading-relaxed">
                  {patient.diagnosis}
                </p>
              </div>

              <div className="col-span-2">
                <span className="text-xs text-slate-400 block font-medium">
                  {isAr ? 'قرح الفراش والجروح (PU / Wounds):' : 'Pressure Ulcers / Wounds:'}
                </span>
                <span className="font-semibold text-slate-800">
                  {patient.pu && patient.pu !== 'None' ? patient.pu : (isAr ? 'لا يوجد (None)' : 'None')}
                </span>
              </div>
            </div>
          </div>

          {/* Discharge Info Box (if discharged) */}
          {isDischarged ? (
            <div className="bg-orange-50/60 p-4 rounded-xl border border-orange-200 print:bg-white print:border print:border-slate-300 print:p-3">
              <h4 className="text-xs font-bold text-orange-950 uppercase mb-3 flex items-center gap-1.5 border-b border-orange-200/80 pb-1.5">
                <CheckCircle2 className="w-4 h-4 text-orange-600 no-print" />
                <span>{isAr ? 'بيانات ومخرجات الخروج' : 'Discharge Details & Outcomes'}</span>
              </h4>
              <div className="grid grid-cols-2 gap-3.5 text-xs sm:text-sm">
                <div>
                  <span className="text-xs text-slate-500 block font-medium">
                    {isAr ? 'تاريخ وتوقيت الخروج:' : 'Discharge Date & Time:'}
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatDate(patient.dischargeDate, lang, { withWeekday: true })}
                  </span>
                  {patient.dischargeTime && (
                    <span className="text-xs text-slate-500 block font-mono mt-0.5">
                      {formatTime(patient.dischargeTime, lang)}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-xs text-slate-500 block font-medium">
                    {isAr ? 'حالة الخروج:' : 'Outcome Status:'}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded text-xs font-bold border inline-block mt-0.5 ${statusMeta.badgeClass} print:bg-white print:border-slate-400`}>
                    {statusMeta.code} - {statusMeta.name}
                  </span>
                  {patient.dischargeStatus === 'Trans' && patient.transferLocation && (
                    <div className="text-xs text-blue-700 font-semibold mt-1">
                      {isAr ? 'محول إلى:' : 'Transferred to:'} {patient.transferLocation}
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-xs text-slate-500 block font-medium">
                    {isAr ? 'إجمالي أيام الإقامة الفعلية:' : 'Total Length of Stay:'}
                  </span>
                  <span className="font-black text-slate-900 font-mono text-base">
                    {formatStayDuration(patient.lengthOfStay, lang)}
                  </span>
                </div>

                {patient.dischargeReason && (
                  <div className="col-span-2">
                    <span className="text-xs text-slate-500 block font-medium">
                      {isAr ? 'سبب وملاحظات الخروج والتوصيات:' : 'Discharge Notes & Clinical Remarks:'}
                    </span>
                    <p className="font-medium text-slate-900 text-xs mt-0.5 leading-relaxed">
                      {patient.dischargeReason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-teal-50/70 p-3.5 rounded-xl border border-teal-200 text-xs text-teal-900 flex items-center gap-2 print:bg-white print:border-slate-300">
              <Activity className="w-4 h-4 text-teal-600 flex-shrink-0 animate-pulse no-print" />
              <span className="font-semibold">
                {isAr
                  ? `المريض منوم حالياً بالعناية المركزة ويتلقى الرعاية الفائقة منذ ${formatStayDuration(stayDays, 'ar')}.`
                  : `Patient is actively receiving care in the ICU for ${formatStayDuration(stayDays, 'en')}.`}
              </span>
            </div>
          )}

          {/* ======================================================== */}
          {/* OFFICIAL SIGNATURE & STAMP BLOCK (Visible in Print)      */}
          {/* ======================================================== */}
          <div className="hidden print:block pt-6 border-t-2 border-slate-300 mt-6 print-avoid-break">
            <div className="grid grid-cols-3 gap-6 text-center text-xs text-slate-800">
              {/* Attending Physician */}
              <div className="border border-dashed border-slate-300 p-3 rounded-lg space-y-3">
                <div className="font-bold text-slate-900 text-xs">
                  {isAr ? 'طبيب العناية المركزة المعالج' : 'Attending ICU Physician'}
                </div>
                <div className="text-[10px] text-slate-400 italic">
                  {isAr ? 'الاسم والتوقيع' : 'Name & Signature'}
                </div>
                <div className="pt-8 border-b border-slate-300" />
                <div className="text-[10px] text-slate-500">
                  {isAr ? 'التاريخ: .... / .... / 2026' : 'Date: .... / .... / 2026'}
                </div>
              </div>

              {/* ICU Charge Nurse */}
              <div className="border border-dashed border-slate-300 p-3 rounded-lg space-y-3">
                <div className="font-bold text-slate-900 text-xs">
                  {isAr ? 'تمريض العناية المركزة' : 'ICU Charge Nurse'}
                </div>
                <div className="text-[10px] text-slate-400 italic">
                  {isAr ? 'الاسم والتوقيع' : 'Name & Signature'}
                </div>
                <div className="pt-8 border-b border-slate-300" />
                <div className="text-[10px] text-slate-500">
                  {isAr ? 'التاريخ: .... / .... / 2026' : 'Date: .... / .... / 2026'}
                </div>
              </div>

              {/* Department Stamp */}
              <div className="border border-dashed border-slate-300 p-3 rounded-lg space-y-2 flex flex-col items-center justify-between">
                <div className="font-bold text-slate-900 text-xs">
                  {isAr ? 'اعتماد رئيس القسم والختم' : 'Head of ICU & Stamp'}
                </div>
                <div className="w-14 h-14 rounded-full border-2 border-slate-300 flex items-center justify-center text-[9px] font-bold text-slate-400">
                  {isAr ? 'الختم الرسمي' : 'Official Stamp'}
                </div>
                <div className="text-[10px] text-slate-500">
                  {isAr ? 'التاريخ: .... / .... / 2026' : 'Date: .... / .... / 2026'}
                </div>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400 mt-4 border-t pt-2">
              Waheed ICU Management System • Medical Records & Census Archive
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SCREEN FOOTER BUTTONS (Hidden in Print)                  */}
        {/* ======================================================== */}
        <div
          className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center no-print"
          data-html2pdf-ignore
        >
          <button
            onClick={handlePrint}
            id="btn-print-patient-slip"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-md shadow-slate-900/20 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-teal-400" />
            <span>{isAr ? 'طباعة بطاقة المريض' : 'Print Slip'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-800 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
