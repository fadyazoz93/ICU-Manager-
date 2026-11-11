import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { getDashboardData } from '../services/storage';
import { DashboardMonthData } from '../types/icu';
import { BarChart3, TrendingUp, Download, Calendar, Users, Activity, HeartCrack, Bed } from 'lucide-react';
import { formatYearMonth } from '../utils/dateFormatter';

Chart.register(...registerables, ChartDataLabels);

interface DashboardViewProps {
  lang: 'en' | 'ar';
}

export const DashboardView: React.FC<DashboardViewProps> = ({ lang }) => {
  const isAr = lang === 'ar';

  // Date range state
  const [startMonth, setStartMonth] = useState(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    return d.toISOString().slice(0, 7);
  });
  const [endMonth, setEndMonth] = useState(() => {
    return new Date().toISOString().slice(0, 7);
  });

  const [dashboardData, setDashboardData] = useState<DashboardMonthData[]>([]);

  // Chart canvas refs
  const volumeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const outcomesCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Chart instances
  const chartVolumeRef = useRef<Chart | null>(null);
  const chartOutcomesRef = useRef<Chart | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = () => {
    if (!startMonth || !endMonth) return;
    if (startMonth > endMonth) {
      alert(isAr ? 'تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية' : 'Start month cannot be after end month');
      return;
    }

    const data = getDashboardData(startMonth, endMonth);
    setDashboardData(data);
    renderCharts(data);
  };

  const renderCharts = (data: DashboardMonthData[]) => {
    const labels = data.map(d => formatYearMonth(d.month, lang));

    const commonDataLabels = {
      display: function (context: any) {
        return context.dataset.data[context.dataIndex] > 0;
      },
      font: {
        size: 13,
        weight: 'bold' as const,
      },
    };

    // Chart 1: Unit Activity (Mixed: Line for Patient Days, Bars for Adm & Dis)
    if (volumeCanvasRef.current) {
      if (chartVolumeRef.current) {
        chartVolumeRef.current.destroy();
      }

      const ctxVol = volumeCanvasRef.current.getContext('2d');
      if (ctxVol) {
        chartVolumeRef.current = new Chart(ctxVol, {
          data: {
            labels: labels,
            datasets: [
              {
                type: 'line',
                label: isAr ? 'إجمالي أيام المرضى (Patient Days)' : 'Total Patient Days',
                data: data.map(d => d.totalDays),
                borderColor: 'rgba(20, 184, 166, 1)',
                backgroundColor: 'rgba(20, 184, 166, 0.2)',
                borderWidth: 3,
                tension: 0.2,
                pointRadius: 5,
                pointBackgroundColor: 'rgba(20, 184, 166, 1)',
                yAxisID: 'y',
                datalabels: {
                  ...commonDataLabels,
                  color: '#0d9488',
                  anchor: 'end',
                  align: 'top',
                  offset: 4,
                },
              },
              {
                type: 'bar',
                label: isAr ? 'حالات الدخول (Admissions)' : 'Admissions',
                data: data.map(d => d.admissions),
                backgroundColor: 'rgba(59, 130, 246, 0.75)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderRadius: 4,
                yAxisID: 'y1',
                datalabels: {
                  ...commonDataLabels,
                  color: '#ffffff',
                  anchor: 'center',
                  align: 'center',
                },
              },
              {
                type: 'bar',
                label: isAr ? 'حالات الخروج (Discharges)' : 'Discharges',
                data: data.map(d => d.discharges),
                backgroundColor: 'rgba(249, 115, 22, 0.75)',
                borderColor: 'rgba(249, 115, 22, 1)',
                borderRadius: 4,
                yAxisID: 'y1',
                datalabels: {
                  ...commonDataLabels,
                  color: '#ffffff',
                  anchor: 'center',
                  align: 'center',
                },
              },
            ] as any,
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                type: 'linear',
                position: 'left',
                beginAtZero: true,
                title: {
                  display: true,
                  text: isAr ? 'إجمالي أيام المرضى' : 'Total Patient Days',
                  font: { weight: 'bold' },
                },
              },
              y1: {
                type: 'linear',
                beginAtZero: true,
                position: 'right',
                grid: { drawOnChartArea: false },
                title: {
                  display: true,
                  text: isAr ? 'العدد (دخول / خروج)' : 'Count (Adm / Dis)',
                  font: { weight: 'bold' },
                },
              },
            },
            plugins: {
              legend: {
                position: 'top',
                labels: { font: { weight: 'bold' } },
              },
            },
          },
        });
      }
    }

    // Chart 2: Discharge Outcomes (Stacked Bar)
    if (outcomesCanvasRef.current) {
      if (chartOutcomesRef.current) {
        chartOutcomesRef.current.destroy();
      }

      const ctxOut = outcomesCanvasRef.current.getContext('2d');
      if (ctxOut) {
        chartOutcomesRef.current = new Chart(ctxOut, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [
              {
                label: isAr ? 'DIS (خروج للمنزل)' : 'DIS',
                data: data.map(d => d.breakdown.DIS),
                backgroundColor: 'rgba(100, 116, 139, 0.85)',
                datalabels: { color: 'white' },
              },
              {
                label: isAr ? 'TRANS (تحويل)' : 'TRANS',
                data: data.map(d => d.breakdown.TRANS),
                backgroundColor: 'rgba(59, 130, 246, 0.85)',
                datalabels: { color: 'white' },
              },
              {
                label: isAr ? 'DAMA (ضد النصح)' : 'DAMA',
                data: data.map(d => d.breakdown.DAMA),
                backgroundColor: 'rgba(245, 158, 11, 0.85)',
                datalabels: { color: 'white' },
              },
              {
                label: isAr ? 'DIED (وفاة)' : 'DIED',
                data: data.map(d => d.breakdown.DIED),
                backgroundColor: 'rgba(239, 68, 68, 0.85)',
                datalabels: { color: 'white' },
              },
            ] as any,
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { stacked: true },
              y: {
                stacked: true,
                beginAtZero: true,
                title: {
                  display: true,
                  text: isAr ? 'عدد الحالات' : 'Number of Discharges',
                  font: { weight: 'bold' },
                },
              },
            },
            plugins: {
              datalabels: commonDataLabels,
              legend: {
                position: 'top',
                labels: { font: { weight: 'bold' } },
              },
            },
          },
        });
      }
    }
  };

  // Clean up charts on unmount
  useEffect(() => {
    return () => {
      chartVolumeRef.current?.destroy();
      chartOutcomesRef.current?.destroy();
    };
  }, []);

  const handlePrintOrPdf = () => {
    window.print();
  };

  // Aggregate metrics
  const totalAdm = dashboardData.reduce((acc, cur) => acc + cur.admissions, 0);
  const totalDis = dashboardData.reduce((acc, cur) => acc + cur.discharges, 0);
  const totalDays = dashboardData.reduce((acc, cur) => acc + cur.totalDays, 0);
  const totalDeaths = dashboardData.reduce((acc, cur) => acc + cur.breakdown.DIED, 0);
  const mortalityRate = totalDis > 0 ? ((totalDeaths / totalDis) * 100).toFixed(1) : '0.0';
  const alos = totalDis > 0 ? (totalDays / totalDis).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Date Filter & Export Bar */}
      <div
        className="bg-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-200 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-stretch sm:items-end"
        data-html2pdf-ignore
      >
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
            <Calendar className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
            {isAr ? 'شهر البداية (Start Month)' : 'Start Month'}
          </label>
          <input
            type="month"
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-white font-medium focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
            <Calendar className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
            {isAr ? 'شهر النهاية (End Month)' : 'End Month'}
          </label>
          <input
            type="month"
            value={endMonth}
            onChange={(e) => setEndMonth(e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-white font-medium focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={loadDashboard}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-indigo-600/20 transition flex items-center justify-center gap-1.5"
          >
            <TrendingUp className="w-4 h-4" />
            <span>{isAr ? 'تحديث الرسوم' : 'Update'}</span>
          </button>

          <button
            onClick={handlePrintOrPdf}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-red-600/20 transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>{isAr ? 'طباعة / PDF' : 'PDF / Print'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase">{isAr ? 'حالات الدخول' : 'Admissions'}</div>
            <div className="text-xl font-bold text-slate-900">{totalAdm}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase">{isAr ? 'حالات الخروج' : 'Discharges'}</div>
            <div className="text-xl font-bold text-slate-900">{totalDis}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
            <Bed className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase">{isAr ? 'أيام المرضى' : 'Patient Days'}</div>
            <div className="text-xl font-bold text-slate-900">{totalDays}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <HeartCrack className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase">{isAr ? 'نسبة الوفيات' : 'Mortality Rate'}</div>
            <div className="text-xl font-bold text-red-600">{mortalityRate}%</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 col-span-2 md:col-span-1">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase">{isAr ? 'متوسط الإقامة' : 'Avg Stay (ALOS)'}</div>
            <div className="text-xl font-bold text-indigo-600">{alos} {isAr ? 'يوم' : 'days'}</div>
          </div>
        </div>
      </div>

      {/* Charts Area */}
      <div id="dashboard-content" className="space-y-6">
        {/* CHART 1: Unit Activity & Patient Days */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <TrendingUp className="w-5 h-5" />
              </span>
              <span>{isAr ? 'نشاط وحدة العناية وأيام المرضى (Unit Activity & Patient Days)' : 'Unit Activity & Patient Days'}</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              {startMonth} → {endMonth}
            </span>
          </div>

          <div className="w-full h-80 relative">
            <canvas ref={volumeCanvasRef} id="chart-volume"></canvas>
          </div>
        </div>

        {/* CHART 2: Discharge Outcomes */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 break-before-page">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <BarChart3 className="w-5 h-5" />
              </span>
              <span>{isAr ? 'مخرجات ونتائج الخروج (Discharge Outcomes)' : 'Discharge Outcomes'}</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              {isAr ? 'تصنيف تراكمي شهري' : 'Monthly Stacked'}
            </span>
          </div>

          <div className="w-full h-80 relative">
            <canvas ref={outcomesCanvasRef} id="chart-outcomes"></canvas>
          </div>
        </div>
      </div>
    </div>
  );
};
