/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { EntryView } from './components/EntryView';
import { DashboardView } from './components/DashboardView';
import { HistoryView } from './components/HistoryView';
import { ReportsView } from './components/ReportsView';
import { PatientDetailsModal } from './components/PatientDetailsModal';
import { DataModal } from './components/DataModal';
import { getStoredRecords, syncFromGoogleSheetLive } from './services/storage';
import { PatientRecord } from './types/icu';

export default function App() {
  const [currentView, setCurrentView] = useState<'entry' | 'dashboard' | 'history' | 'reports'>('history');
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [activeCount, setActiveCount] = useState<number>(0);
  const [prefilledMedicalNo, setPrefilledMedicalNo] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);

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

  const handleDischargePatient = (medicalNo: string) => {
    setPrefilledMedicalNo(medicalNo);
    setCurrentView('entry');
  };

  const handleToggleLang = () => {
    setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  const isAr = lang === 'ar';

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className={`min-h-screen bg-slate-100 text-slate-800 font-sans pb-24 md:pb-12 antialiased selection:bg-teal-500 selection:text-white ${
        isAr ? 'font-arabic' : ''
      }`}
    >
      <div id="app" className="max-w-6xl mx-auto p-3 sm:p-5">
        {/* Header Navigation */}
        <Header
          currentView={currentView}
          onSelectView={(v) => {
            setCurrentView(v);
            if (v !== 'entry') setPrefilledMedicalNo('');
          }}
          lang={lang}
          onToggleLang={handleToggleLang}
          activeCount={activeCount}
          onOpenDataModal={() => setIsDataModalOpen(true)}
        />

        {/* Dynamic Views */}
        <main className="transition-all duration-200">
          {currentView === 'entry' && (
            <div id="view-entry">
              <EntryView
                lang={lang}
                prefilledMedicalNo={prefilledMedicalNo}
                onPatientSaved={() => {
                  updateActiveCount();
                  setPrefilledMedicalNo('');
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

      {/* Patient Details / Slip Modal */}
      {selectedPatient && (
        <PatientDetailsModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          lang={lang}
        />
      )}

      {/* Database & Backup Modal */}
      {isDataModalOpen && (
        <DataModal
          isOpen={isDataModalOpen}
          onClose={() => setIsDataModalOpen(false)}
          lang={lang}
          onDataChanged={() => {
            updateActiveCount();
          }}
        />
      )}
    </div>
  );
}
