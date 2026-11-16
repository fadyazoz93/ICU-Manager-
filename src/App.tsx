/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { Header } from './components/Header';
import { EntryView } from './components/EntryView';
import { DashboardView } from './components/DashboardView';
import { HistoryView } from './components/HistoryView';
import { ReportsView } from './components/ReportsView';
import { PatientDetailsModal } from './components/PatientDetailsModal';
import { getStoredRecords, resetToDemoData } from './services/storage';
import { PatientRecord } from './types/icu';

interface ErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Waheed ICU Manager runtime error:', error, info);
  }

  handleRecover = () => {
    try {
      resetToDemoData();
    } catch {
      // Ignore storage error during recovery
    }
    this.setState({ hasError: false });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div dir="rtl" className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg max-w-md w-full p-6 text-center space-y-4">
            <h2 className="text-lg font-bold text-slate-900">حدث خطأ غير متوقع في عرض البيانات</h2>
            <p className="text-sm text-slate-600">
              يمكنك استعادة البيانات المحفوظة وإعادة تحميل التطبيق بأمان.
            </p>
            <button
              type="button"
              onClick={this.handleRecover}
              className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition"
            >
              إعادة تحميل واستعادة البيانات
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const [currentView, setCurrentView] = useState<'entry' | 'dashboard' | 'history' | 'reports'>('history');
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [activeCount, setActiveCount] = useState<number>(0);
  const [prefilledMedicalNo, setPrefilledMedicalNo] = useState<string>('');
  const [prefilledRecordId, setPrefilledRecordId] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);

  const updateActiveCount = () => {
    const list = getStoredRecords();
    const active = list.filter((r) => r.status === 'Active');
    setActiveCount(active.length);
  };

  useEffect(() => {
    updateActiveCount();

    const handleRecordChange = () => {
      updateActiveCount();
    };

    window.addEventListener('icu-records-changed', handleRecordChange);
    return () => {
      window.removeEventListener('icu-records-changed', handleRecordChange);
    };
  }, []);

  const handleDischargePatient = (medicalNo: string, recordId?: string) => {
    setPrefilledMedicalNo(medicalNo);
    setPrefilledRecordId(recordId || '');
    setCurrentView('entry');
  };

  const handleToggleLang = () => {
    setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  const isAr = lang === 'ar';

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className={`min-h-screen bg-slate-100 text-slate-800 font-sans pb-24 md:pb-12 antialiased selection:bg-teal-500 selection:text-white print:bg-white print:p-0 print:m-0 print:pb-0 ${
        isAr ? 'font-arabic' : ''
      }`}
    >
      <div id="app" className="max-w-6xl mx-auto p-3 sm:p-5 print:max-w-none print:p-0 print:m-0">
        {/* Header Navigation */}
        <Header
          currentView={currentView}
          onSelectView={(v) => {
            setCurrentView(v);
            if (v !== 'entry') {
              setPrefilledMedicalNo('');
              setPrefilledRecordId('');
            }
          }}
          lang={lang}
          onToggleLang={handleToggleLang}
          activeCount={activeCount}
        />

        {/* Dynamic Views */}
        <main className="transition-all duration-200">
          {currentView === 'entry' && (
            <div id="view-entry">
              <EntryView
                lang={lang}
                prefilledMedicalNo={prefilledMedicalNo}
                prefilledRecordId={prefilledRecordId}
                onPatientSaved={() => {
                  updateActiveCount();
                  setPrefilledMedicalNo('');
                  setPrefilledRecordId('');
                }}
                onGoToHistory={() => setCurrentView('history')}
              />
            </div>
          )}

          {currentView === 'dashboard' && (
            <div id="view-dashboard">
              <DashboardView lang={lang} />
            </div>
          )}

          {currentView === 'history' && (
            <div id="view-history">
              <HistoryView
                lang={lang}
                onDischargePatient={handleDischargePatient}
                onViewPatientDetails={(p) => setSelectedPatient(p)}
              />
            </div>
          )}

          {currentView === 'reports' && (
            <div id="view-reports">
              <ReportsView lang={lang} />
            </div>
          )}
        </main>
      </div>

      {/* Patient Details Modal */}
      {selectedPatient && (
        <PatientDetailsModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          lang={lang}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}
