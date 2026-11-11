import React, { useState, useEffect } from 'react';
import { PatientRecord } from '../types/icu';
import { findActivePatient, saveAdmission, saveDischarge, getStoredRecords } from '../services/storage';
import { Search, CheckCircle2, AlertTriangle, ArrowRight, BedDouble, UserCheck, Clock, Calendar, LogIn, LogOut, Check } from 'lucide-react';
import { formatDate, formatStayDuration, calculateActiveStayDays } from '../utils/dateFormatter';

interface EntryViewProps {
  lang: 'en' | 'ar';
  prefilledMedicalNo?: string;
  onPatientSaved: () => void;
  onGoToHistory: () => void;
}

export const EntryView: React.FC<EntryViewProps> = ({
  lang,
  prefilledMedicalNo,
  onPatientSaved,
  onGoToHistory,
}) => {
  const isAr = lang === 'ar';

  // State
  const [medicalNo, setMedicalNo] = useState(prefilledMedicalNo || '');
  const [patientName, setPatientName] = useState('');
  const [activePatient, setActivePatient] = useState<PatientRecord | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);

  // Admission Form Fields
  const [admissionDate, setAdmissionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [admissionTime, setAdmissionTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [fromLocation, setFromLocation] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [pu, setPu] = useState('');

  // Discharge Form Fields
  const [dischargeDate, setDischargeDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dischargeTime, setDischargeTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [dischargeStatus, setDischargeStatus] = useState<string>('DIS');
  const [transferLocation, setTransferLocation] = useState('');
  const [dischargeReason, setDischargeReason] = useState('');

  // List of currently active patients for quick selection
  const [activeList, setActiveList] = useState<PatientRecord[]>([]);

  useEffect(() => {
    refreshActiveList();
  }, []);

  useEffect(() => {
    if (prefilledMedicalNo) {
      setMedicalNo(prefilledMedicalNo);
      handleCheckStatus(prefilledMedicalNo);
    }
  }, [prefilledMedicalNo]);

  const refreshActiveList = () => {
    const all = getStoredRecords();
    const active = all.filter(r => r.status === 'Active');
    setActiveList(active);
  };

  const handleCheckStatus = (targetNo?: string) => {
    const mno = (targetNo || medicalNo).trim();
    if (!mno) {
      setFeedback({
        type: 'warning',
        message: isAr ? 'يرجى إدخال الرقم الطبي للمريض' : 'Please enter Medical No'
      });
      return;
    }

    const patient = findActivePatient(mno);
    setHasChecked(true);

    if (patient) {
      // Patient is ACTIVE -> prepare discharge
      setActivePatient(patient);
      setPatientName(patient.patientName);
      
      const now = new Date();
      setDischargeDate(now.toISOString().slice(0, 10));
      setDischargeTime(now.toTimeString().slice(0, 5));
      setDischargeStatus('DIS');
      setTransferLocation('');
      setDischargeReason('');

      setFeedback({
        type: 'warning',
        message: isAr
          ? `⚠️ المريض منوم حالياً في العناية المركزة منذ ${formatDate(patient.admissionDate, 'ar')} (${formatStayDuration(calculateActiveStayDays(patient.admissionDate), 'ar')})`
          : `⚠️ Patient is currently ACTIVE in ICU since ${formatDate(patient.admissionDate, 'en')} (${formatStayDuration(calculateActiveStayDays(patient.admissionDate), 'en')})`
      });
    } else {
      // Patient is NOT ACTIVE -> prepare admission
      setActivePatient(null);
      // If we clicked from elsewhere or medicalNo is new, allow editing patient name
      const now = new Date();
      setAdmissionDate(now.toISOString().slice(0, 10));
      setAdmissionTime(now.toTimeString().slice(0, 5));
      setFromLocation('');
      setDiagnosis('');
      setPu('');

      setFeedback({
        type: 'info',
        message: isAr
          ? '✅ المريض غير منوم حالياً. يمكنك تسجيل دخول جديد.'
          : '✅ Patient is not currently admitted. You can admit them.'
      });
    }
  };

  const handleSelectActivePatient = (patient: PatientRecord) => {
    setMedicalNo(patient.medicalNo);
    setPatientName(patient.patientName);
    setActivePatient(patient);
    setHasChecked(true);

    const now = new Date();
    setDischargeDate(now.toISOString().slice(0, 10));
    setDischargeTime(now.toTimeString().slice(0, 5));
    setDischargeStatus('DIS');
    setTransferLocation('');
    setDischargeReason('');

    setFeedback({
      type: 'warning',
      message: isAr
        ? `⚠️ تم اختيار المريض المنوم: ${patient.patientName} (دخول: ${formatDate(patient.admissionDate, 'ar')} - إقامة: ${formatStayDuration(calculateActiveStayDays(patient.admissionDate), 'ar')})`
        : `⚠️ Selected active patient: ${patient.patientName} (Admitted: ${formatDate(patient.admissionDate, 'en')} - Stay: ${formatStayDuration(calculateActiveStayDays(patient.admissionDate), 'en')})`
    });
  };

  const handleSubmitAdmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicalNo || !patientName || !admissionDate || !fromLocation || !diagnosis) {
      setFeedback({
        type: 'error',
        message: isAr ? 'يرجى تعبئة جميع الحقول الإلزامية' : 'Please fill all required fields'
      });
      return;
    }

    const res = saveAdmission({
      medicalNo,
      patientName,
      admissionDate,
      admissionTime,
      fromLocation,
      diagnosis,
      pu: pu || 'None',
    });

    if (res.success) {
      setFeedback({
        type: 'success',
        message: isAr ? res.message : `Admission saved successfully for ${patientName}`
      });
      // reset form
      setMedicalNo('');
      setPatientName('');
      setHasChecked(false);
      setActivePatient(null);
      refreshActiveList();
      onPatientSaved();
    } else {
      setFeedback({
        type: 'error',
        message: res.message
      });
    }
  };

  const handleSubmitDischarge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicalNo || !dischargeDate) {
      setFeedback({
        type: 'error',
        message: isAr ? 'يرجى استكمال بيانات الخروج' : 'Discharge date and medical no required'
      });
      return;
    }

    if (dischargeStatus === 'Trans' && !transferLocation.trim()) {
      setFeedback({
        type: 'error',
        message: isAr ? 'يرجى تحديد جهة التحويل (Transferred To)' : 'Please specify Transfer Destination'
      });
      return;
    }

    const res = saveDischarge({
      medicalNo,
      dischargeDate,
      dischargeTime,
      dischargeStatus,
      transferLocation,
      dischargeReason,
    });

    if (res.success) {
      setFeedback({
        type: 'success',
        message: isAr ? res.message : `Patient successfully discharged (${dischargeStatus})`
      });
      setMedicalNo('');
      setPatientName('');
      setHasChecked(false);
      setActivePatient(null);
      refreshActiveList();
      onPatientSaved();
    } else {
      setFeedback({
        type: 'error',
        message: res.message
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Active Beds */}
      {activeList.length > 0 && (
        <div className="bg-gradient-to-r from-teal-900/40 via-slate-800 to-slate-900 p-4 rounded-xl border border-teal-800/40 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-teal-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {isAr ? 'المرضى المنومون حالياً بالعناية المركزة' : 'Currently Active ICU Patients'}
              </h3>
              <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs px-2 py-0.5 rounded-full font-bold">
                {activeList.length}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {isAr ? 'اضغط لتسجيل الخروج مباشرة' : 'Click to quickly prepare discharge'}
            </span>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
            {activeList.map(pat => (
              <button
                key={pat.id}
                onClick={() => handleSelectActivePatient(pat)}
                className={`flex-shrink-0 text-left px-3.5 py-2 rounded-lg border transition-all text-xs flex items-center gap-3 ${
                  activePatient?.id === pat.id
                    ? 'bg-teal-600 text-white border-teal-400 shadow-md ring-2 ring-teal-400/50'
                    : 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-700 text-slate-200'
                }`}
              >
                <div>
                  <div className="font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                    {pat.patientName}
                  </div>
                  <div className="text-[11px] opacity-80">
                    #{pat.medicalNo} • {formatDate(pat.admissionDate, lang)} ({formatStayDuration(calculateActiveStayDays(pat.admissionDate), lang)})
                  </div>
                </div>
                <LogOut className="w-4 h-4 opacity-70 ml-2" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Entry Card */}
      <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8 border border-slate-200">
        {/* Patient Identification */}
        <div className="mb-6 border-b border-slate-100 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-teal-600" />
              {isAr ? 'التحقق وتحديد المريض' : 'Patient Identification'}
            </h2>
            <button
              onClick={onGoToHistory}
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
            >
              {isAr ? 'عرض الأرشيف الكامل' : 'Browse All Records'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {isAr ? 'الرقم الطبي (Medical No)' : 'Medical No'} <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={medicalNo}
                  onChange={(e) => setMedicalNo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckStatus()}
                  placeholder={isAr ? 'مثال: 123456' : 'e.g. 123456'}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-mono text-slate-900 bg-white"
                />
                <button
                  type="button"
                  onClick={() => handleCheckStatus()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-lg font-medium transition flex items-center gap-1.5 shadow-sm shadow-blue-600/20"
                >
                  <Search className="w-4 h-4" />
                  <span>{isAr ? 'فحص' : 'Check'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isAr
                  ? 'أدخل الرقم الطبي ثم اضغط "فحص" للتحقق مما إذا كان المريض منوماً حالياً أم جديداً'
                  : 'Enter Medical No and click Check to verify active status or prepare admission'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {isAr ? 'اسم المريض بالكامل' : 'Patient Name'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                readOnly={!!activePatient}
                placeholder={isAr ? 'اسم المريض الثلاثي أو الرباعي' : 'Full Patient Name'}
                className={`w-full p-2.5 border rounded-lg font-medium ${
                  activePatient
                    ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed'
                    : 'bg-white text-slate-900 border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500'
                }`}
              />
              {activePatient && (
                <p className="text-xs text-amber-600 mt-1">
                  {isAr ? 'اسم المريض مقفل لأن الحالة منومة بالفعل' : 'Name is locked because patient is active'}
                </p>
              )}
            </div>
          </div>

          {/* Feedback & Status Alert */}
          {feedback && (
            <div
              className={`mt-4 p-3.5 rounded-xl text-sm font-medium flex items-center gap-2.5 border ${
                feedback.type === 'warning'
                  ? 'bg-orange-50 text-orange-800 border-orange-200'
                  : feedback.type === 'error'
                  ? 'bg-red-50 text-red-800 border-red-200'
                  : feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-teal-50 text-teal-800 border-teal-200'
              }`}
            >
              {feedback.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-orange-600" />
              ) : feedback.type === 'error' ? (
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
              ) : (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-teal-600" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}
        </div>

        {/* ADMISSION FORM (Shown when patient is NOT currently active) */}
        {hasChecked && !activePatient && (
          <form onSubmit={handleSubmitAdmission} className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-teal-50 p-3.5 rounded-xl border border-teal-200 text-teal-900 font-bold flex items-center gap-2">
              <LogIn className="w-5 h-5 text-teal-700" />
              <span>{isAr ? 'تفاصيل دخول العناية المركزة (ADMISSION DETAILS)' : 'ADMISSION DETAILS'}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1 text-slate-500" />
                  {isAr ? 'تاريخ الدخول (Admission Date)' : 'Admission Date'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={admissionDate}
                  onChange={(e) => setAdmissionDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Clock className="w-4 h-4 inline mr-1 text-slate-500" />
                  {isAr ? 'وقت الدخول (Admission Time)' : 'Admission Time'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={admissionTime}
                  onChange={(e) => setAdmissionTime(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {isAr ? 'جهة الدخول / محول من (Admitted From)' : 'Admitted From'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fromLocation}
                  onChange={(e) => setFromLocation(e.target.value)}
                  placeholder={isAr ? 'مثال: ER (طوارئ), OT (عمليات), CCU, Ward 3...' : 'ER, OT, Ward, Cath Lab...'}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {isAr ? 'التشخيص الطبي (Diagnosis)' : 'Diagnosis'} <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder={isAr ? 'التشخيص الطبي وسبب الدخول للعناية المركزة...' : 'Clinical diagnosis, underlying conditions, reason for ICU admission...'}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {isAr ? 'قرح الفراش والجروح (PU or Wounds)' : 'PU or Wounds'}
                </label>
                <input
                  type="text"
                  value={pu}
                  onChange={(e) => setPu(e.target.value)}
                  placeholder={isAr ? 'None أو Stage 1, Stage 2 Sacral, etc.' : 'None or Stage 1 / Stage 2 Sacral...'}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3.5 rounded-xl transition duration-150 shadow-lg shadow-teal-600/30 flex items-center justify-center gap-2 mt-4"
            >
              <Check className="w-5 h-5" />
              <span>{isAr ? 'حفظ تسجيل الدخول' : 'Save Admission'}</span>
            </button>
          </form>
        )}

        {/* DISCHARGE FORM (Shown when patient IS currently active) */}
        {hasChecked && activePatient && (
          <form onSubmit={handleSubmitDischarge} className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-orange-50 p-3.5 rounded-xl border border-orange-200 text-orange-900 font-bold flex items-center gap-2">
              <LogOut className="w-5 h-5 text-orange-700" />
              <span>{isAr ? 'تفاصيل خروج المريض (DISCHARGE DETAILS)' : 'DISCHARGE DETAILS'}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1 text-slate-500" />
                  {isAr ? 'تاريخ الخروج (Discharge Date)' : 'Discharge Date'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  min={activePatient.admissionDate}
                  value={dischargeDate}
                  onChange={(e) => setDischargeDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                />
                <p className="text-xs text-orange-600 mt-1 font-medium">
                  {isAr
                    ? `تاريخ الدخول الأصلي: ${activePatient.admissionDate}`
                    : `Admission Date: ${activePatient.admissionDate}`}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Clock className="w-4 h-4 inline mr-1 text-slate-500" />
                  {isAr ? 'وقت الخروج (Discharge Time)' : 'Discharge Time'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={dischargeTime}
                  onChange={(e) => setDischargeTime(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {isAr ? 'حالة الخروج (Discharge Status)' : 'Status'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={dischargeStatus}
                  onChange={(e) => setDischargeStatus(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white font-medium text-slate-800"
                >
                  <option value="DIS">{isAr ? 'DIS (خروج وتحسن للمنزل)' : 'DIS (Discharged Home)'}</option>
                  <option value="Trans">{isAr ? 'Trans (تحويل لقسم آخر / مستشفى)' : 'Trans (Transferred)'}</option>
                  <option value="DAMA">{isAr ? 'DAMA (خروج ضد النصح الطبي)' : 'DAMA (Discharge Against Medical Advice)'}</option>
                  <option value="DIED">{isAr ? 'DIED (وفاة رحمه الله)' : 'DIED'}</option>
                </select>
              </div>

              {dischargeStatus === 'Trans' && (
                <div className="md:col-span-2 animate-in fade-in duration-150">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {isAr ? 'تم التحويل إلى (Transferred To)' : 'Transferred To'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={transferLocation}
                    onChange={(e) => setTransferLocation(e.target.value)}
                    placeholder={isAr ? 'مثال: Ward 4 (جراحة), CCU, مستشفى كذا...' : 'Ward 4B, Intermediate Care, External Hospital...'}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {isAr ? 'ملاحظات / سبب الخروج (Discharge Reason - Optional)' : 'Discharge Reason (Optional)'}
                </label>
                <textarea
                  rows={2}
                  value={dischargeReason}
                  onChange={(e) => setDischargeReason(e.target.value)}
                  placeholder={isAr ? 'استقرار العلامات الحيوية، فك جهاز التنفس، خطة العلاج بعد الخروج...' : 'Clinical stability, post-extubation progress, treatment discharge summary...'}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-xl transition duration-150 shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 mt-4"
            >
              <LogOut className="w-5 h-5" />
              <span>{isAr ? 'حفظ تسجيل الخروج' : 'Save Discharge'}</span>
            </button>
          </form>
        )}

        {/* Prompt when not checked yet */}
        {!hasChecked && (
          <div className="text-center py-10 text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
            <UserCheck className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="font-medium text-slate-600">
              {isAr ? 'أدخل الرقم الطبي للمريض واضغط "فحص" للمتابعة' : 'Enter Medical No above and click Check to start'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {isAr ? 'سيحدد النظام تلقائياً ما إذا كان المريض يحتاج لتسجيل دخول أم خروج' : 'The system will automatically detect admission vs discharge mode'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
