import React from 'react';
import { PatientRecord } from '../types/icu';
import {
  X,
  Printer,
  Bed,
  Calendar,
  Clock,
  AlertCircle,
  FileText,
  CheckCircle2,
  Activity,
  Building2,
  Stethoscope,
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

  const handlePrint = () => {
    window.print();
  };

  const isDischarged = patient.status === 'Discharged';
  const statusMeta = getDischargeStatusLabel(patient.dischargeStatus, lang);
  const stayDays = isDischarged
    ? patient.lengthOfStay || 1
    : calculateActiveStayDays(patient.admissionDate);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col print:border-none print:shadow-none print:max-h-none print:m-0 print:p-0">
        {/* Screen Header (Hidden on print) */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between no-print" data-html2pdf-ignore>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600/30 border border-teal-500/40 flex items-center justify-center text-teal-300">
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
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Official Hospital Header (Visible on print & top of document) */}
        <div className="hidden print:block p-4 border-b-2 border-slate-800 mb-2">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-teal-700 uppercase">
                {isAr ? 'قسم العناية المركزة والرعاية الحرجة' : 'Intensive Care Unit (ICU)'}
              </div>
              <h2 className="text-lg font-black text-slate-900">
                {isAr ? 'بطاقة مريض وسجل إقامة بالعناية المركزة' : 'Patient ICU Stay & Clinical Slip'}
              </h2>
            </div>
            <div className="text-right text-xs text-slate-500 font-mono">
              <div>MRN: #{patient.medicalNo}</div>
              <div>{new Date().toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 print:p-2 overflow-y-auto flex-1">
          {/* Identity & Status */}
          <div className="flex justify-between items-start border-b border-slate-100 pb-4">
            <div>
              <div className="text-xs text-slate-400 uppercase font-semibold">
                {isAr ? 'اسم المريض' : 'Patient Name'}
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                {patient.patientName}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                {isAr ? 'رقم السجل الطبي (MRN):' : 'Medical Record No:'} <span className="font-bold text-slate-800">#{patient.medicalNo}</span>
              </div>
            </div>

            <div className="text-right">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border inline-block ${
                  patient.status === 'Active'
                    ? 'bg-teal-50 text-teal-800 border-teal-300'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
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
              <div className="text-xs text-teal-700 font-bold mt-1">
                {isAr ? 'مدة الإقامة:' : 'Length of Stay:'} {formatStayDuration(stayDays, lang)}
              </div>
            </div>
          </div>

          {/* Admission Info */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase mb-3 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'بيانات الدخول' : 'Admission Details'}</span>
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-slate-400 block">{isAr ? 'تاريخ الدخول:' : 'Admission Date:'}</span>
                <span className="font-semibold text-slate-900">
                  {formatDate(patient.admissionDate, lang, { withWeekday: true })}
                </span>
                {patient.admissionTime && (
                  <span className="text-xs text-slate-500 block font-mono">
                    {formatTime(patient.admissionTime, lang)}
                  </span>
                )}
              </div>
              <div>
                <span className="text-xs text-slate-400 block">{isAr ? 'محول من (جهة الدخول):' : 'Admitted From:'}</span>
                <span className="font-semibold text-slate-800">
                  {patient.fromLocation || '-'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-slate-400 block">{isAr ? 'التشخيص الطبي:' : 'Medical Diagnosis:'}</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {patient.diagnosis}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-slate-400 block">{isAr ? 'قرح الفراش والجروح:' : 'PU / Wounds Status:'}</span>
                <span className="font-medium text-slate-800">
                  {patient.pu && patient.pu !== 'None' ? patient.pu : (isAr ? 'لا يوجد (None)' : 'None')}
                </span>
              </div>
            </div>
          </div>

          {/* Discharge Info (if discharged) */}
          {isDischarged ? (
            <div className="bg-orange-50/60 p-4 rounded-xl border border-orange-200">
              <h4 className="text-xs font-bold text-orange-900 uppercase mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-orange-600" />
                <span>{isAr ? 'بيانات ومخرجات الخروج' : 'Discharge Details & Outcomes'}</span>
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">{isAr ? 'تاريخ الخروج:' : 'Discharge Date:'}</span>
                  <span className="font-semibold text-slate-900">
                    {formatDate(patient.dischargeDate, lang, { withWeekday: true })}
                  </span>
                  {patient.dischargeTime && (
                    <span className="text-xs text-slate-500 block font-mono">
                      {formatTime(patient.dischargeTime, lang)}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">{isAr ? 'حالة الخروج:' : 'Outcome Status:'}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border inline-block ${statusMeta.badgeClass}`}>
                    {statusMeta.code} - {statusMeta.name}
                  </span>
                  {patient.dischargeStatus === 'Trans' && patient.transferLocation && (
                    <div className="text-xs text-blue-600 font-medium mt-1">
                      {isAr ? 'محول إلى:' : 'Transferred to:'} {patient.transferLocation}
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">{isAr ? 'إجمالي أيام الإقامة:' : 'Total Length of Stay:'}</span>
                  <span className="font-extrabold text-slate-900 font-mono text-base">
                    {formatStayDuration(patient.lengthOfStay, lang)}
                  </span>
                </div>
                {patient.dischargeReason && (
                  <div className="col-span-2">
                    <span className="text-xs text-slate-500 block">{isAr ? 'سبب وملاحظات الخروج:' : 'Discharge Notes:'}</span>
                    <p className="font-medium text-slate-800 text-xs mt-0.5">
                      {patient.dischargeReason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-teal-50/70 p-3.5 rounded-xl border border-teal-200 text-xs text-teal-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600 flex-shrink-0 animate-pulse no-print" />
              <span>
                {isAr
                  ? `المريض منوم حالياً بالعناية المركزة منذ ${formatStayDuration(stayDays, 'ar')}.`
                  : `Patient is actively receiving care in the ICU for ${formatStayDuration(stayDays, 'en')}.`}
              </span>
            </div>
          )}

          {/* Printable Signature space for slip */}
          <div className="hidden print:grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-xs text-slate-700">
            <div>
              <div className="font-bold text-slate-800">{isAr ? 'توقيع الطبيب المعالج:' : 'Attending Physician:'}</div>
              <div className="pt-8 border-b border-slate-300" />
            </div>
            <div>
              <div className="font-bold text-slate-800">{isAr ? 'توقيع تمريض العناية المركزة:' : 'ICU Charge Nurse:'}</div>
              <div className="pt-8 border-b border-slate-300" />
            </div>
          </div>
        </div>

        {/* Footer Buttons (Screen only) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center no-print" data-html2pdf-ignore>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4 text-teal-400" />
            <span>{isAr ? 'طباعة بطاقة المريض' : 'Print Slip'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-sm font-semibold transition"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
