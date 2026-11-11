import React from 'react';
import { PatientRecord } from '../types/icu';
import { X, Printer, Bed, Calendar, Clock, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600/30 border border-teal-500/40 flex items-center justify-center text-teal-300">
              <Bed className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
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

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 print:p-0 overflow-y-auto flex-1">
          {/* Identity & Status */}
          <div className="flex justify-between items-start border-b border-slate-100 pb-4">
            <div>
              <div className="text-xs text-slate-400 uppercase font-semibold">
                {isAr ? 'اسم المريض' : 'Patient Name'}
              </div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">
                {patient.patientName}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                {isAr ? 'رقم الملف:' : 'Medical Record No:'} {patient.medicalNo}
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
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
          </div>

          {/* Admission Info */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase mb-3 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'بيانات الدخول' : 'Admission Details'}</span>
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-slate-400 block">{isAr ? 'التاريخ والوقت:' : 'Date & Time:'}</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {patient.admissionDate} • {patient.admissionTime}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">{isAr ? 'محول من:' : 'Admitted From:'}</span>
                <span className="font-semibold text-slate-800">
                  {patient.fromLocation}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-slate-400 block">{isAr ? 'التشخيص الطبي:' : 'Diagnosis:'}</span>
                <p className="font-medium text-slate-800 mt-0.5">
                  {patient.diagnosis}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-slate-400 block">{isAr ? 'قرح الفراش والجروح:' : 'PU / Wounds:'}</span>
                <span className="font-medium text-slate-800">
                  {patient.pu || (isAr ? 'لا يوجد (None)' : 'None')}
                </span>
              </div>
            </div>
          </div>

          {/* Discharge Info (if discharged) */}
          {patient.status === 'Discharged' && (
            <div className="bg-orange-50/60 p-4 rounded-xl border border-orange-200">
              <h4 className="text-xs font-bold text-orange-900 uppercase mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-orange-600" />
                <span>{isAr ? 'بيانات الخروج' : 'Discharge Details'}</span>
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">{isAr ? 'تاريخ الخروج:' : 'Discharge Date:'}</span>
                  <span className="font-semibold text-slate-900 font-mono">
                    {patient.dischargeDate} {patient.dischargeTime ? `• ${patient.dischargeTime}` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">{isAr ? 'حالة الخروج:' : 'Discharge Status:'}</span>
                  <span className="font-bold text-slate-900">
                    {patient.dischargeStatus}
                    {patient.dischargeStatus === 'Trans' && patient.transferLocation && (
                      <span className="text-xs text-blue-600 block">→ {patient.transferLocation}</span>
                    )}
                  </span>
                </div>
                {patient.lengthOfStay && (
                  <div>
                    <span className="text-xs text-slate-500 block">{isAr ? 'إجمالي أيام الإقامة:' : 'Total Length of Stay:'}</span>
                    <span className="font-bold text-slate-900">
                      {patient.lengthOfStay} {isAr ? 'أيام' : 'days'}
                    </span>
                  </div>
                )}
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
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center" data-html2pdf-ignore>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? 'طباعة بطاقة المريض' : 'Print Slip'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-sm font-medium transition"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
