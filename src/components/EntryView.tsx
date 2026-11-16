import React, { useState, useEffect, useMemo } from 'react';
import { PatientRecord } from '../types/icu';
import {
  findActivePatient,
  saveAdmission,
  saveDischarge,
  getStoredRecords,
  cleanMedicalNo,
} from '../services/storage';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BedDouble,
  UserCheck,
  Clock,
  Calendar,
  LogIn,
  LogOut,
  Check,
} from 'lucide-react';
import {
  formatDate,
  formatNumericDate,
  formatStayDuration,
  calculateActiveStayDays,
  getLocalTodayDate,
  getLocalCurrentTime,
  normalizeDateStr,
} from '../utils/dateFormatter';

interface EntryViewProps {
  lang: 'en' | 'ar';
  prefilledMedicalNo?: string;
  prefilledRecordId?: string;
  onPatientSaved: () => void;
  onGoToHistory: () => void;
}

export const EntryView: React.FC<EntryViewProps> = ({
  lang,
  prefilledMedicalNo,
  prefilledRecordId,
  onPatientSaved,
  onGoToHistory,
}) => {
  const isAr = lang === 'ar';

  // State
  const [medicalNo, setMedicalNo] = useState(prefilledMedicalNo || '');
  const [patientName, setPatientName] = useState('');
  const [activePatient, setActivePatient] = useState<PatientRecord | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [activeQuickSearch, setActiveQuickSearch] = useState('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    showHistoryBtn?: boolean;
  } | null>(null);

  // Admission Form Fields (local date & time, no UTC drift)
  const [admissionDate, setAdmissionDate] = useState(() => getLocalTodayDate());
  const [admissionTime, setAdmissionTime] = useState(() => getLocalCurrentTime());
  const [fromLocation, setFromLocation] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [pu, setPu] = useState('');

  // Discharge Form Fields (local date & time, no UTC drift)
  const [dischargeDate, setDischargeDate] = useState(() => getLocalTodayDate());
  const [dischargeTime, setDischargeTime] = useState(() => getLocalCurrentTime());
  const [dischargeStatus, setDischargeStatus] = useState<string>('DIS');
  const [transferLocation, setTransferLocation] = useState('');
  const [dischargeReason, setDischargeReason] = useState('');

  // List of currently active patients for quick selection
  const [activeList, setActiveList] = useState<PatientRecord[]>([]);

  const refreshActiveList = () => {
    const all = getStoredRecords();
    const active = all
      .filter((r) => r.status === 'Active')
      .sort((a, b) => String(b.admissionDate || '').localeCompare(String(a.admissionDate || '')));
    setActiveList(active);
  };

  useEffect(() => {
    refreshActiveList();
    const onChanged = () => refreshActiveList();
    window.addEventListener('icu-records-changed', onChanged);
    return () => window.removeEventListener('icu-records-changed', onChanged);
  }, []);

  useEffect(() => {
    if (prefilledRecordId || prefilledMedicalNo) {
      if (prefilledMedicalNo) setMedicalNo(prefilledMedicalNo);
      handleCheckStatus(prefilledMedicalNo, prefilledRecordId);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [prefilledMedicalNo, prefilledRecordId]);

  const filteredActiveList = useMemo(() => {
    const q = activeQuickSearch.trim().toLowerCase();
    if (!q) return activeList;
    return activeList.filter(
      (p) =>
        String(p.patientName || '').toLowerCase().includes(q) ||
        String(p.medicalNo || '').toLowerCase().includes(q) ||
        String(p.diagnosis || '').toLowerCase().includes(q)
    );
  }, [activeList, activeQuickSearch]);

  const prepareDischargeFormFor = (patient: PatientRecord) => {
    const todayLocal = getLocalTodayDate();
    const admNorm = normalizeDateStr(patient.admissionDate);
    // Ensure initial dischargeDate is valid (>= admissionDate) even on devices whose clock is behind 2026 records
    const safeDisDate = admNorm && todayLocal < admNorm ? admNorm : todayLocal;

    setActivePatient(patient);
    setMedicalNo(patient.medicalNo);
    setPatientName(patient.patientName);
    setHasChecked(true);
    setDischargeDate(safeDisDate);
    setDischargeTime(getLocalCurrentTime());
    setDischargeStatus('DIS');
    setTransferLocation('');
    setDischargeReason('');
  };

  const handleCheckStatus = (targetNo?: string, targetRecordId?: string) => {
    const rawMno = targetNo !== undefined ? targetNo : medicalNo;
    const mno = String(rawMno || '').trim().replace(/^#+/, '').trim();

    if (!mno && !targetRecordId) {
      setFeedback({
        type: 'warning',
        message: isAr ? 'يرجى إدخال الرقم الطبي للمريض' : 'Please enter Medical No',
      });
      return;
    }

    const patient = findActivePatient(mno, targetRecordId);
    setHasChecked(true);

    if (patient) {
      prepareDischargeFormFor(patient);
      const stayDays = calculateActiveStayDays(patient.admissionDate);
      setFeedback({
        type: 'warning',
        message: isAr
          ? `المريض منوم حالياً في العناية المركزة منذ ${formatDate(patient.admissionDate, 'ar')} (${formatStayDuration(stayDays, 'ar')})`
          : `Patient is currently ACTIVE in ICU since ${formatDate(patient.admissionDate, 'en')} (${formatStayDuration(stayDays, 'en')})`,
      });
    } else {
      setActivePatient(null);
      setMedicalNo(mno);
      setAdmissionDate(getLocalTodayDate());
      setAdmissionTime(getLocalCurrentTime());
      setFromLocation('');
      setDiagnosis('');
      setPu('');

      // Check if there is a previous discharged record for convenience (prefill patient name)
      const clean = cleanMedicalNo(mno);
      const prevRecord = getStoredRecords().find((r) => cleanMedicalNo(r.medicalNo) === clean);
      if (prevRecord) {
        if (!patientName) setPatientName(prevRecord.patientName);
        setFeedback({
          type: 'info',
          message: isAr
            ? `هذا الرقم الطبي لديه سجل خروج سابق (${formatDate(prevRecord.dischargeDate, 'ar')}). يمكنك تسجيل دخول جديد.`
            : `Previous stay was discharged on ${formatDate(prevRecord.dischargeDate, 'en')}. Ready for new admission.`,
        });
      } else {
        setFeedback({
          type: 'info',
          message: isAr
            ? 'المريض غير منوم حالياً. يمكنك تسجيل دخول جديد.'
            : 'Patient is not currently admitted. You can admit them.',
        });
      }
    }
  };

  const handleSelectActivePatient = (patient: PatientRecord) => {
    prepareDischargeFormFor(patient);
    const stayDays = calculateActiveStayDays(patient.admissionDate);
    setFeedback({
      type: 'warning',
      message: isAr
        ? `تم اختيار الحالة النشطة: ${patient.patientName} (دخول: ${formatDate(patient.admissionDate, 'ar')} - إقامة: ${formatStayDuration(stayDays, 'ar')})`
        : `Selected active patient: ${patient.patientName} (Admitted: ${formatDate(patient.admissionDate, 'en')} - Stay: ${formatStayDuration(stayDays, 'en')})`,
    });
  };

  const handleSubmitAdmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicalNo.trim() || !patientName.trim() || !admissionDate || !fromLocation.trim() || !diagnosis.trim()) {
      setFeedback({
        type: 'error',
        message: isAr ? 'يرجى تعبئة جميع الحقول الإلزامية' : 'Please fill all required fields',
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
        message: isAr ? res.message : `Admission saved successfully for ${patientName}`,
        showHistoryBtn: true,
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
        message: res.message,
      });
    }
  };

  const handleSubmitDischarge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient || !dischargeDate) {
      setFeedback({
        type: 'error',
        message: isAr ? 'يرجى استكمال بيانات الخروج' : 'Discharge date and patient selection required',
      });
      return;
    }

    const normAdm = normalizeDateStr(activePatient.admissionDate);
    const normDis = normalizeDateStr(dischargeDate);
    if (!normDis) {
      setFeedback({
        type: 'error',
        message: isAr ? 'يرجى إدخال تاريخ خروج صحيح' : 'Please enter a valid discharge date',
      });
      return;
    }

    if (normAdm && normDis < normAdm) {
      setFeedback({
        type: 'error',
        message: isAr
          ? `تاريخ الخروج (${formatNumericDate(normDis)}) لا يمكن أن يكون قبل تاريخ الدخول (${formatNumericDate(normAdm)})`
          : `Discharge date (${formatNumericDate(normDis)}) cannot be earlier than admission date (${formatNumericDate(normAdm)})`,
      });
      return;
    }

    if (dischargeStatus === 'Trans' && !transferLocation.trim()) {
      setFeedback({
        type: 'error',
        message: isAr ? 'يرجى تحديد جهة التحويل (Transferred To)' : 'Please specify Transfer Destination',
      });
      return;
    }

    const res = saveDischarge({
      recordId: activePatient.id,
      medicalNo: activePatient.medicalNo,
      dischargeDate: normDis,
      dischargeTime,
      dischargeStatus,
      transferLocation,
      dischargeReason,
    });

    if (res.success) {
      setFeedback({
        type: 'success',
        message: isAr
          ? res.message
          : `Patient ${activePatient.patientName} successfully discharged (${dischargeStatus})`,
        showHistoryBtn: true,
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
        message: res.message,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Active Beds */}
      {activeList.length > 0 && (
        <div className="bg-gradient-to-r from-teal-900/40 via-slate-800 to-slate-900 p-4 rounded-xl border border-teal-800/40 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-teal-400 flex-shrink-0" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {isAr ? 'المرضى المنومون حالياً بالعناية المركزة' : 'Currently Active ICU Patients'}
              </h3>
              <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs px-2 py-0.5 rounded-full font-bold">
                {activeList.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 rtl:left-auto rtl:right-2.5 top-2.5" />
                <input
                  type="text"
                  value={activeQuickSearch}
                  onChange={(e) => setActiveQuickSearch(e.target.value)}
                  placeholder={isAr ? 'بحث سريع في المنومين...' : 'Filter active patients...'}
                  className="w-full text-xs bg-slate-800/90 text-white placeholder:text-slate-400 border border-slate-700 rounded-lg py-1.5 pl-8 pr-2.5 rtl:pl-2.5 rtl:pr-8 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
            {filteredActiveList.length === 0 ? (
              <div className="text-xs text-slate-400 py-2 px-1">
                {isAr ? 'لا توجد حالة نشطة مطابقة للبحث' : 'No active patient matches your filter'}
              </div>
            ) : (
              filteredActiveList.map((pat) => (
                <button
                  key={pat.id}
                  type="button"
                  onClick={() => handleSelectActivePatient(pat)}
                  className={`flex-shrink-0 text-start px-3.5 py-2 rounded-lg border transition-all text-xs flex items-center gap-3 ${
                    activePatient?.id === pat.id
                      ? 'bg-teal-600 text-white border-teal-400 shadow-md ring-2 ring-teal-400/50'
                      : 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-700 text-slate-200'
                  }`}
                >
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />
                      <span>{pat.patientName}</span>
                    </div>
                    <div className="text-[11px] opacity-85 mt-0.5">
                      <span dir="ltr" className="font-mono inline-block">#{pat.medicalNo}</span> •{' '}
                      {formatDate(pat.admissionDate, lang)} ({formatStayDuration(calculateActiveStayDays(pat.admissionDate), lang)})
                    </div>
                  </div>
                  <LogOut className="w-4 h-4 opacity-70 flex-shrink-0" />
                </button>
              ))
            )}
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
              type="button"
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
                  dir="ltr"
                  value={medicalNo}
                  onChange={(e) => setMedicalNo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCheckStatus();
                    }
                  }}
                  placeholder={isAr ? 'مثال: GMC052848' : 'e.g. GMC052848'}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-mono text-slate-900 bg-white"
                />
                <button
                  type="button"
                  onClick={() => handleCheckStatus()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-lg font-medium transition flex items-center gap-1.5 shadow-sm shadow-blue-600/20 flex-shrink-0"
                >
                  <Search className="w-4 h-4" />
                  <span>{isAr ? 'فحص' : 'Check'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isAr
                  ? 'أدخل الرقم الطبي ثم اضغط "فحص" أو اختر المريض من الشريط بالأعلى'
                  : 'Enter Medical No and click Check, or pick an active patient above'}
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
              className={`mt-4 p-3.5 rounded-xl text-sm font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border ${
                feedback.type === 'warning'
                  ? 'bg-orange-50 text-orange-800 border-orange-200'
                  : feedback.type === 'error'
                  ? 'bg-red-50 text-red-800 border-red-200'
                  : feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-teal-50 text-teal-800 border-teal-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {feedback.type === 'warning' ? (
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-orange-600" />
                ) : feedback.type === 'error' ? (
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-teal-600" />
                )}
                <span>{feedback.message}</span>
              </div>

              {feedback.showHistoryBtn && (
                <button
                  type="button"
                  onClick={onGoToHistory}
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 self-start sm:self-auto flex-shrink-0"
                >
                  <span>{isAr ? 'عرض في السجل' : 'View in History'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ADMISSION FORM (Shown when patient is NOT currently active) */}
        {hasChecked && !activePatient && (
          <form onSubmit={handleSubmitAdmission} className="space-y-4">
            <div className="bg-teal-50 p-3.5 rounded-xl border border-teal-200 text-teal-900 font-bold flex items-center gap-2">
              <LogIn className="w-5 h-5 text-teal-700" />
              <span>{isAr ? 'تفاصيل دخول العناية المركزة (ADMISSION DETAILS)' : 'ADMISSION DETAILS'}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Calendar className="w-4 h-4 inline mx-1 text-slate-500" />
                  {isAr ? 'تاريخ الدخول (Admission Date)' : 'Admission Date'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  dir="ltr"
                  required
                  value={admissionDate}
                  onChange={(e) => setAdmissionDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Clock className="w-4 h-4 inline mx-1 text-slate-500" />
                  {isAr ? 'وقت الدخول (Admission Time)' : 'Admission Time'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  dir="ltr"
                  required
                  value={admissionTime}
                  onChange={(e) => setAdmissionTime(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white font-mono"
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
          <form onSubmit={handleSubmitDischarge} noValidate className="space-y-4">
            <div className="bg-orange-50 p-3.5 rounded-xl border border-orange-200 text-orange-900 font-bold flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <LogOut className="w-5 h-5 text-orange-700" />
                <span>{isAr ? 'تفاصيل خروج المريض (DISCHARGE DETAILS)' : 'DISCHARGE DETAILS'}</span>
              </div>
              <span className="text-xs font-medium text-orange-700">
                {formatDate(activePatient.admissionDate, lang)} ({formatNumericDate(activePatient.admissionDate)})
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Calendar className="w-4 h-4 inline mx-1 text-slate-500" />
                  {isAr ? 'تاريخ الخروج (Discharge Date)' : 'Discharge Date'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  dir="ltr"
                  required
                  value={dischargeDate}
                  onChange={(e) => setDischargeDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white font-mono"
                />
                <p className="text-xs text-orange-700 mt-1 font-medium">
                  {isAr
                    ? `تاريخ الدخول الأصلي: ${formatDate(activePatient.admissionDate, 'ar')} (${formatNumericDate(activePatient.admissionDate)})`
                    : `Admission Date: ${formatDate(activePatient.admissionDate, 'en')} (${formatNumericDate(activePatient.admissionDate)})`}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Clock className="w-4 h-4 inline mx-1 text-slate-500" />
                  {isAr ? 'وقت الخروج (Discharge Time)' : 'Discharge Time'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  dir="ltr"
                  required
                  value={dischargeTime}
                  onChange={(e) => setDischargeTime(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white font-mono"
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
                <div className="md:col-span-2">
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
              {isAr ? 'أدخل الرقم الطبي للمريض واضغط "فحص" أو اختر حالة من الشريط أعلاه' : 'Enter Medical No above and click Check, or pick a patient above'}
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
