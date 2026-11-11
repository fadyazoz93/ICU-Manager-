import React, { useState, useEffect } from 'react';
import {
  exportRecordsAsJson,
  importRecordsFromJson,
  resetToDemoData,
  getStoredRecords,
  saveStoredRecords,
} from '../services/storage';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
} from '../services/googleAuth';
import {
  DEFAULT_SPREADSHEET_ID,
  DEFAULT_SPREADSHEET_URL,
  getSavedSpreadsheetId,
  saveSpreadsheetId,
  readRecordsFromSheet,
  writeAllRecordsToSheet,
} from '../services/googleSheets';
import { GoogleSignInButton } from './GoogleSignInButton';
import { User } from 'firebase/auth';
import {
  X,
  Download,
  Upload,
  RotateCcw,
  Database,
  Check,
  AlertTriangle,
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  LogOut,
  Sparkles,
  CloudUpload,
  CloudDownload,
} from 'lucide-react';

interface DataModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ar';
  onDataChanged: () => void;
}

export const DataModal: React.FC<DataModalProps> = ({
  isOpen,
  onClose,
  lang,
  onDataChanged,
}) => {
  const isAr = lang === 'ar';

  const [activeTab, setActiveTab] = useState<'sheets' | 'local'>('sheets');
  const [importText, setImportText] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Google Sheets state
  const [user, setUser] = useState<User | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sheetInput, setSheetInput] = useState(() => getSavedSpreadsheetId() || DEFAULT_SPREADSHEET_URL);

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = initAuth(
      (currentUser) => {
        setUser(currentUser);
      },
      () => {
        setUser(null);
      }
    );
    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setMsg(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setMsg({
          type: 'success',
          text: isAr
            ? `تم تسجيل الدخول بحساب Google بنجاح: ${res.user.displayName || res.user.email}`
            : `Signed in successfully as ${res.user.displayName || res.user.email}`,
        });
      }
    } catch (err: any) {
      console.error(err);
      setMsg({
        type: 'error',
        text: err?.message || 'فشل تسجيل الدخول بحساب Google',
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setUser(null);
    setMsg({
      type: 'info',
      text: isAr ? 'تم تسجيل الخروج من حساب Google' : 'Signed out from Google account',
    });
  };

  // Restore records from Google Sheet
  const handleRestoreFromSheet = async () => {
    setMsg(null);
    const token = await getAccessToken();
    if (!token) {
      setMsg({
        type: 'error',
        text: isAr ? 'يرجى تسجيل الدخول بحساب Google أولاً' : 'Please sign in with Google first',
      });
      return;
    }

    const sheetId = saveSpreadsheetId(sheetInput);
    setIsSyncing(true);

    try {
      const { records, sheetTitle } = await readRecordsFromSheet(sheetId, token);
      if (records.length === 0) {
        setMsg({
          type: 'info',
          text: isAr
            ? `ورقة العمل (${sheetTitle}) فارغة أو لا تحتوي على صفوف بيانات`
            : `Sheet (${sheetTitle}) is empty or has no data rows`,
        });
      } else {
        saveStoredRecords(records);
        onDataChanged();
        setMsg({
          type: 'success',
          text: isAr
            ? `تم استعادة وتحديث ${records.length} سجلاً بنجاح من Google Sheet (${sheetTitle})!`
            : `Successfully loaded and restored ${records.length} records from Google Sheet (${sheetTitle})!`,
        });
      }
    } catch (err: any) {
      console.error(err);
      setMsg({
        type: 'error',
        text: err?.message || 'فشل القراءة من جدول بيانات Google',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Save / Sync all current records to Google Sheet with mandatory confirmation
  const handleSaveToSheet = async () => {
    setMsg(null);
    const token = await getAccessToken();
    if (!token) {
      setMsg({
        type: 'error',
        text: isAr ? 'يرجى تسجيل الدخول بحساب Google أولاً' : 'Please sign in with Google first',
      });
      return;
    }

    const currentRecords = getStoredRecords();

    // Mandatory user confirmation for updating/mutating user data
    const confirmMessage = isAr
      ? `هل تريد بالتأكيد مزامنة وحفظ ${currentRecords.length} سجلاً في جدول بيانات Google Sheets؟\nسيتم تحديث ورقة العمل ببيانات العناية المركزة.`
      : `Are you sure you want to save and sync ${currentRecords.length} records to your Google Sheet?\nThe spreadsheet will be updated with your ICU records.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    const sheetId = saveSpreadsheetId(sheetInput);
    setIsSyncing(true);

    try {
      const res = await writeAllRecordsToSheet(sheetId, token, currentRecords);
      setMsg({
        type: 'success',
        text: isAr
          ? `تم حفظ ومزامنة ${res.count} سجلاً بنجاح في Google Sheet!`
          : `Successfully saved and synced ${res.count} records to Google Sheet!`,
      });
    } catch (err: any) {
      console.error(err);
      setMsg({
        type: 'error',
        text: err?.message || 'فشل حفظ البيانات في جدول Google',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Local JSON Export
  const handleExport = () => {
    const json = exportRecordsAsJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waheed_icu_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg({
      type: 'success',
      text: isAr ? 'تم تصدير النسخة الاحتياطية بنجاح' : 'Backup JSON exported successfully',
    });
  };

  // Local JSON Import
  const handleImport = () => {
    if (!importText.trim()) return;
    const res = importRecordsFromJson(importText);
    if (res.success) {
      setMsg({
        type: 'success',
        text: isAr ? `تم استيراد ${res.count} سجلاً بنجاح` : `Successfully imported ${res.count} records`,
      });
      setImportText('');
      onDataChanged();
    } else {
      setMsg({
        type: 'error',
        text: res.error || 'Import failed',
      });
    }
  };

  const handleReset = () => {
    if (
      window.confirm(
        isAr
          ? 'هل تريد بالتأكيد إعادة تعيين البيانات إلى السجلات التجريبية الافتراضية؟'
          : 'Are you sure you want to reset all data to default ICU records?'
      )
    ) {
      resetToDemoData();
      setMsg({
        type: 'success',
        text: isAr ? 'تم استعادة البيانات الافتراضية بنجاح' : 'Reset to demo dataset successfully',
      });
      onDataChanged();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600/30 text-teal-400 flex items-center justify-center border border-teal-500/40">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                {isAr ? 'حفظ واستعادة البيانات (Google Sheets)' : 'Google Sheets & Data Management'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isAr ? 'المزامنة السحابية وقواعد البيانات' : 'Cloud Sync & Database Backup'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('sheets')}
            className={`py-2 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'sheets'
                ? 'border-teal-600 text-teal-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{isAr ? 'Google Sheets المزامنة المباشرة' : 'Google Sheets Live Sync'}</span>
          </button>

          <button
            onClick={() => setActiveTab('local')}
            className={`py-2 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'local'
                ? 'border-teal-600 text-teal-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4 text-slate-600" />
            <span>{isAr ? 'نسخ احتياطي محلي (JSON)' : 'Local Backup & Reset'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* Status Message */}
          {msg && (
            <div
              className={`p-3 rounded-xl text-xs sm:text-sm font-medium border flex items-center gap-2 ${
                msg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : msg.type === 'info'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {msg.type === 'success' ? (
                <Check className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{msg.text}</span>
            </div>
          )}

          {activeTab === 'sheets' ? (
            /* GOOGLE SHEETS LIVE SYNC */
            <div className="space-y-4">
              {/* Authentication Status Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1.5">
                    <span>{isAr ? 'حالة الحساب المعتمد' : 'Google Authentication Status'}</span>
                  </div>

                  {user ? (
                    <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {isAr ? 'متصل ومصرح' : 'Connected'}
                    </span>
                  ) : (
                    <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                      {isAr ? 'غير مسجل' : 'Not Connected'}
                    </span>
                  )}
                </div>

                {user ? (
                  <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt="avatar"
                          className="w-9 h-9 rounded-full border border-slate-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-sm">
                          {user.displayName?.charAt(0) || user.email?.charAt(0) || 'G'}
                        </div>
                      )}
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {user.displayName || 'Google User'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate">
                          {user.email}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleGoogleLogout}
                      className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition border border-red-200 flex items-center gap-1 flex-shrink-0"
                      title={isAr ? 'تسجيل الخروج' : 'Sign out'}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{isAr ? 'خروج' : 'Sign out'}</span>
                    </button>
                  </div>
                ) : (
                  <div>
                    <GoogleSignInButton
                      onClick={handleGoogleLogin}
                      isLoading={isSigningIn}
                      text={isAr ? 'تسجيل الدخول باستخدام Google' : 'Sign in with Google'}
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                      {isAr
                        ? 'مطلوب للمصادقة وتفويض قراءة وكتابة البيانات في Google Sheets'
                        : 'Required to authorize reading and writing to your Google Sheet'}
                    </p>
                  </div>
                )}
              </div>

              {/* Target Spreadsheet Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    {isAr ? 'رابط أو معرّف جدول بيانات Google' : 'Google Spreadsheet Link or ID'}
                  </label>
                  <a
                    href={sheetInput.startsWith('http') ? sheetInput : `https://docs.google.com/spreadsheets/d/${sheetInput}/edit`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
                  >
                    <span>{isAr ? 'فتح الملف' : 'Open Sheet'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <input
                  type="text"
                  value={sheetInput}
                  onChange={(e) => setSheetInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1xEBExHwdTPIBouJKDTC_zZePXRCTtn_A6AoFaxmSCTk/edit..."
                  className="w-full p-2.5 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white"
                />
                <p className="text-[11px] text-slate-400">
                  {isAr
                    ? 'تم تعيين رابط ملفك افتراضياً، يمكنك تغييره لأي جدول آخر في أي وقت.'
                    : 'Your requested spreadsheet URL is set by default.'}
                </p>
              </div>

              {/* Sync Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                {/* Restore / Read from Sheet */}
                <button
                  onClick={handleRestoreFromSheet}
                  disabled={isSyncing}
                  className="py-3 px-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-teal-600/20 transition cursor-pointer"
                >
                  <CloudDownload className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                  <span>{isAr ? 'استعادة البيانات من الشيت' : 'Restore from Sheet'}</span>
                </button>

                {/* Save / Write to Sheet */}
                <button
                  onClick={handleSaveToSheet}
                  disabled={isSyncing}
                  className="py-3 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/20 transition cursor-pointer"
                >
                  <CloudUpload className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                  <span>{isAr ? 'حفظ ومزامنة في الشيت' : 'Save & Sync to Sheet'}</span>
                </button>
              </div>

              {/* Info Note */}
              <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {isAr
                    ? 'يتم ترتيب الأعمدة تلقائياً (الرقم الطبي، اسم المريض، تاريخ الدخول، التشخيص، تاريخ الخروج، مدة الإقامة...) بما يتطابق تماماً مع هيكل التعداد الطبي.'
                    : 'Columns are automatically mapped and structured with your ICU census data.'}
                </p>
              </div>
            </div>
          ) : (
            /* LOCAL BACKUP TAB */
            <div className="space-y-4">
              {/* Export JSON */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800 text-sm">
                    {isAr ? 'تصدير نسخة احتياطية (JSON)' : 'Export Backup (JSON)'}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {isAr ? 'احفظ نسخة من كافة السجلات على جهازك' : 'Download all ICU records as a JSON file'}
                  </div>
                </div>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>{isAr ? 'تصدير' : 'Export'}</span>
                </button>
              </div>

              {/* Import JSON */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  {isAr ? 'استيراد سجلات من JSON' : 'Import Records (Paste JSON)'}
                </label>
                <textarea
                  rows={3}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={isAr ? 'الصق محتوى ملف JSON هنا...' : 'Paste JSON array here...'}
                  className="w-full p-2.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
                />
                <button
                  onClick={handleImport}
                  disabled={!importText.trim()}
                  className="w-full py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isAr ? 'استيراد البيانات' : 'Import JSON'}</span>
                </button>
              </div>

              {/* Reset to Demo */}
              <div className="p-4 rounded-xl border border-red-200 bg-red-50/50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-red-900 text-sm">
                    {isAr ? 'استعادة البيانات التجريبية الافتراضية' : 'Reset to Demo Records'}
                  </div>
                  <div className="text-xs text-red-700/80 mt-0.5">
                    {isAr ? 'إعادة شحن 14 حالة ICU نموذجية' : 'Reload 14 realistic sample ICU patients'}
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{isAr ? 'استعادة' : 'Reset'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs sm:text-sm font-semibold transition"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
