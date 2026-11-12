import React from 'react';
import { PatientRecord } from '../types/icu';
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  Activity,
  Bed,
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

  const isDischarged = patient.status === 'Discharged';
  const statusMeta = getDischargeStatusLabel(patient.dischargeStatus, lang);
  const stayDays = isDischarged
    ? patient.lengthOfStay || 1
    : calculateActiveStayDays(patient.admissionDate);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
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

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* Identity & Status */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-4">
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
              <div className="text-xs text-teal-800 font-bold mt-1.5 font-mono">
                {isAr ? 'مدة الإقامة:' : 'Length of Stay:'} {formatStayDuration(stayDays, lang)}
              </div>
            </div>
          </div>

          {/* Admission Info */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 uppercase mb-3 flex items-center gap-1.5 border-b border-slate-200/80 pb-1.5">
              <Calendar className="w-4 h-4 text-teal-700" />
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

          {/* Discharge Info (if discharged) */}
          {isDischarged ? (
            <div className="bg-orange-50/60 p-4 rounded-xl border border-orange-200">
              <h4 className="text-xs font-bold text-orange-950 uppercase mb-3 flex items-center gap-1.5 border-b border-orange-200/80 pb-1.5">
                <CheckCircle2 className="w-4 h-4 text-orange-600" />
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
                  <span className={`px-2.5 py-0.5 rounded text-xs font-bold border inline-block mt-0.5 ${statusMeta.badgeClass}`}>
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
            <div className="bg-teal-50/70 p-3.5 rounded-xl border border-teal-200 text-xs text-teal-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600 flex-shrink-0 animate-pulse" />
              <span className="font-semibold">
                {isAr
                  ? `المريض منوم حالياً بالعناية المركزة ويتلقى الرعاية الفائقة منذ ${formatStayDuration(stayDays, 'ar')}.`
                  : `Patient is actively receiving care in the ICU for ${formatStayDuration(stayDays, 'en')}.`}
              </span>
            </div>
          )}
        </div>

        {/* Footer (Close button only) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end items-center">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
