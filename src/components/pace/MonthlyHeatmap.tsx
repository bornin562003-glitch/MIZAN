import React, { useState } from 'react';
import { HeatmapDay } from '../../utils/categorizer';
import { formatCurrency, formatShortDate } from '../../utils/formatters';

interface MonthlyHeatmapProps {
  days: HeatmapDay[];
  currency: string;
}

export const MonthlyHeatmap: React.FC<MonthlyHeatmapProps> = ({ days, currency }) => {
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(
    () => days.find((d) => d.spend > 0) ?? days[0] ?? null,
  );

  const cellStyle = (status: HeatmapDay['status'], isSelected: boolean) => {
    const ring = isSelected ? 'ring-2 ring-slate-900 dark:ring-white' : '';
    if (status === 'safe') {
      return `bg-emerald-500/20 border-emerald-500/40 text-emerald-800 dark:text-emerald-200 ${ring}`;
    }
    if (status === 'moderate') {
      return `bg-amber-500/25 border-amber-500/45 text-amber-900 dark:text-amber-200 ${ring}`;
    }
    if (status === 'high') {
      return `bg-rose-500/25 border-rose-500/50 text-rose-900 dark:text-rose-200 ${ring}`;
    }
    return `bg-slate-100 dark:bg-slate-800/70 border-slate-200/70 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 ${ring}`;
  };

  const statusText = (status: HeatmapDay['status']) => {
    if (status === 'safe') return 'Safe pace';
    if (status === 'moderate') return 'Moderate spend';
    if (status === 'high') return 'High spend';
    return 'Zero daily spend';
  };

  return (
    <section
      aria-label="Monthly daily spend heatmap"
      className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5 sm:p-6 space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Monthly Pace Heatmap
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Daily living burn compared against your combined daily habit target
          </p>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300 flex-wrap">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500/40 border border-emerald-500/60" />
            Safe
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-500/40 border border-amber-500/60" />
            Moderate
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-rose-500/40 border border-rose-500/60" />
            High
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-11 gap-2">
        {days.map((day) => {
          const isSelected = selectedDay?.day === day.day;
          return (
            <button
              key={day.dateIso}
              type="button"
              onClick={() => setSelectedDay(day)}
              aria-label={`${formatShortDate(day.dateIso)}: ${statusText(day.status)}`}
              className={`min-h-[44px] rounded-xl border flex flex-col items-center justify-center transition-transform active:scale-95 ${cellStyle(
                day.status,
                isSelected,
              )}`}
            >
              <span className="text-xs font-mono-num font-semibold">{day.day}</span>
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="text-slate-700 dark:text-slate-200 font-medium">
            {formatShortDate(selectedDay.dateIso)} · {statusText(selectedDay.status)}
          </div>
          <div className="font-mono-num text-slate-500 dark:text-slate-400">
            Spent {formatCurrency(selectedDay.spend, currency)} / Target{' '}
            {formatCurrency(selectedDay.target, currency)}
          </div>
        </div>
      )}
    </section>
  );
};
