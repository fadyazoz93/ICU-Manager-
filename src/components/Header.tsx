import React from 'react';
import { Activity, ShieldCheck, Database, Globe, FileSpreadsheet, PlusCircle } from 'lucide-react';

interface HeaderProps {
  currentView: 'entry' | 'dashboard' | 'history' | 'reports';
  onSelectView: (view: 'entry' | 'dashboard' | 'history' | 'reports') => void;
  lang: 'en' | 'ar';
  onToggleLang: () => void;
  activeCount: number;
  onOpenDataModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onSelectView,
  lang,
  onToggleLang,
  activeCount,
  onOpenDataModal,
}) => {
  const isAr = lang === 'ar';

  const navItems = [
    {
      id: 'entry' as const,
      label: isAr ? 'الدخول / الخروج' : 'Entry',
      mobileLabel: isAr ? 'الدخول' : 'Entry',
      icon: PlusCircle,
      badge: activeCount > 0 ? activeCount : null,
    },
    {
      id: 'dashboard' as const,
      label: isAr ? 'المؤشرات' : 'Dashboard',
      mobileLabel: isAr ? 'المؤشرات' : 'Dashboard',
      icon: Activity,
      badge: null,
    },
    {
      id: 'history' as const,
      label: isAr ? 'السجل والأرشيف' : 'History',
      mobileLabel: isAr ? 'السجل' : 'History',
      icon: ShieldCheck,
      badge: null,
    },
    {
      id: 'reports' as const,
      label: isAr ? 'التقارير الشهرية' : 'Reports',
      mobileLabel: isAr ? 'التقارير' : 'Reports',
      icon: FileSpreadsheet,
      badge: null,
    },
  ];

  return (
    <>
      {/* Top Header for Desktop & Mobile Header Bar */}
      <header
        className="bg-slate-900 text-white p-3.5 sm:p-5 rounded-2xl shadow-xl mb-4 sm:mb-6 flex justify-between items-center flex-wrap gap-3 border border-slate-800"
        data-html2pdf-ignore
      >
        {/* Brand & System Status */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20 text-white font-bold flex-shrink-0">
            <Activity className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-white font-sans leading-tight">
                Waheed ICU Manager
              </h1>
              <span className="hidden xs:inline-flex text-[11px] sm:text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                {isAr ? 'متصل' : 'Connected'}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 sm:gap-2">
              <span className="truncate max-w-[170px] sm:max-w-none">
                {isAr ? 'نظام العناية المركزة' : 'ICU Management System'}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-teal-400 font-semibold whitespace-nowrap">
                {isAr ? `${activeCount} منوم حالياً` : `${activeCount} Active Beds`}
              </span>
            </p>
          </div>
        </div>

        {/* Desktop Navigation Tabs (Hidden on mobile) */}
        <div className="hidden md:flex items-center gap-2">
          <nav className="bg-slate-800/90 p-1 rounded-xl border border-slate-700 flex gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectView(item.id)}
                  id={`btn-${item.id}`}
                  className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 relative ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge !== null && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-teal-400 text-slate-900 font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Auxiliary tools: Google Sheets, Data manager & Language switch */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onOpenDataModal}
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 hover:text-white rounded-lg sm:rounded-xl border border-emerald-600/50 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            title={isAr ? 'حفظ واستعادة من Google Sheets' : 'Save & Restore from Google Sheets'}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xs:inline">{isAr ? 'Google Sheets' : 'Google Sheets'}</span>
          </button>

          <button
            onClick={onOpenDataModal}
            title={isAr ? 'إدارة واستعادة البيانات' : 'Manage Data / Backup'}
            className="p-2 sm:p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg sm:rounded-xl border border-slate-700 transition"
            aria-label="Database Settings"
          >
            <Database className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleLang}
            title={isAr ? 'Switch to English' : 'التحويل للغة العربية'}
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg sm:rounded-xl border border-slate-700 text-xs font-bold transition flex items-center gap-1"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isAr ? 'EN' : 'العربية'}</span>
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Visible only on mobile screens < md) */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-1.5 shadow-2xl safe-area-pb"
        data-html2pdf-ignore
      >
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all relative ${
                  isActive
                    ? 'text-teal-400 font-bold scale-105'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div
                  className={`p-1 rounded-lg ${
                    isActive ? 'bg-teal-500/20 text-teal-300' : 'text-slate-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] leading-tight tracking-tight">
                  {item.mobileLabel}
                </span>

                {item.badge !== null && (
                  <span className="absolute top-1 right-1/4 -translate-y-1 w-4 h-4 rounded-full bg-teal-500 text-slate-950 text-[10px] font-black flex items-center justify-center shadow">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
