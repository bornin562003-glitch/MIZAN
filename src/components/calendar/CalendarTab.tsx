import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMizanStore } from '../../store/useMizanStore';
import {
  CalendarIntensity,
  buildCalendarDays,
  buildCalendarSummaryStats,
} from '../../utils/budgetEngine';
import { formatCurrency, formatShortDate, getTodayIso } from '../../utils/formatters';
import { EmptyState } from '../layout/EmptyState';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const INTENSITY_DOT: Record<CalendarIntensity, string> = {
  none: 'bg-slate-300 dark:bg-slate-700',
  low: 'bg-emerald-500',
  moderate: 'bg-teal-500',
  high: 'bg-amber-500',
  peak: 'bg-rose-500',
};

export const CalendarTab: React.FC = () => {
  const profiles = useMizanStore((s) => s.profiles);
  const activeProfileId = useMizanStore((s) => s.activeProfileId);
  const activeData = useMizanStore((s) => s.activeData);
  const discreetMode = useMizanStore((s) => s.discreetMode);
  const openEntrySheet = useMizanStore((s) => s.openEntrySheet);
  const openEditTransaction = useMizanStore((s) => s.openEditTransaction);
  const deleteTransaction = useMizanStore((s) => s.deleteTransaction);

  const currency = profiles.find((p) => p.id === activeProfileId)?.currency ?? 'PKR';

  const today = new Date();
  const [cursorYear, setCursorYear] = useState(today.getFullYear());
  const [cursorMonth, setCursorMonth] = useState(today.getMonth());
  const [selectedIso, setSelectedIso] = useState(getTodayIso());
  const [accountFilter, setAccountFilter] = useState<string>('all');

  const cells = useMemo(
    () => buildCalendarDays(activeData, cursorYear, cursorMonth, accountFilter),
    [activeData, cursorYear, cursorMonth, accountFilter],
  );

  const summary = useMemo(() => buildCalendarSummaryStats(cells), [cells]);

  const monthLabel = new Date(cursorYear, cursorMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const selectedCell = cells.find((c) => c.dateIso === selectedIso) ?? {
    dateIso: selectedIso,
    dayNumber: Number(selectedIso.slice(8, 10)),
    inCurrentMonth: true,
    totalSpend: 0,
    totalIncome: 0,
    intensity: 'none' as CalendarIntensity,
    transactions: [],
  };

  const shiftMonth = (delta: number) => {
    const next = new Date(cursorYear, cursorMonth + delta, 1);
    setCursorYear(next.getFullYear());
    setCursorMonth(next.getMonth());
  };

  return (
    <motion.div
      key={`calendar-${activeProfileId}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Monthly Calendar
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Inspect daily cashflow intensity and edit entries on any date
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="h-[40px] w-[40px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="min-w-[140px] text-center px-3 text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="h-[40px] w-[40px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Account Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
        <button
          type="button"
          onClick={() => setAccountFilter('all')}
          className={`h-[36px] px-3 rounded-xl text-xs font-medium inline-flex items-center whitespace-nowrap transition-colors ${
            accountFilter === 'all'
              ? 'bg-teal-600 text-white'
              : 'bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          All Accounts
        </button>
        {activeData.accounts.map((acc) => (
          <button
            key={acc.id}
            type="button"
            onClick={() => setAccountFilter(acc.id)}
            className={`h-[36px] px-3 rounded-xl text-xs font-medium inline-flex items-center whitespace-nowrap transition-colors ${
              accountFilter === acc.id
                ? 'bg-teal-600 text-white'
                : 'bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {acc.name}
          </button>
        ))}
      </div>

      {/* 4 Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Month Total Spent</div>
          <div className="mt-1 text-lg font-bold font-mono-num text-slate-900 dark:text-slate-100">
            {formatCurrency(summary.monthTotalSpent, currency, false, discreetMode)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Avg / Active Day</div>
          <div className="mt-1 text-lg font-bold font-mono-num text-slate-900 dark:text-slate-100">
            {formatCurrency(summary.avgPerActiveDay, currency, false, discreetMode)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">High-Spend Days</div>
          <div className="mt-1 text-lg font-bold font-mono-num text-amber-600 dark:text-amber-400">
            {summary.highSpendDays} {summary.highSpendDays === 1 ? 'day' : 'days'}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Peak Spending Day</div>
          <div className="mt-1 text-lg font-bold font-mono-num text-rose-600 dark:text-rose-400">
            {summary.peakSpendingDay
              ? formatCurrency(summary.peakSpendingDay.amount, currency, true, discreetMode)
              : 'No spend'}
          </div>
          {summary.peakSpendingDay && (
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {formatShortDate(summary.peakSpendingDay.dateIso)}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Calendar Grid */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-3 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Spend intensity tiers</span>
            <div className="flex items-center gap-3">
              {(['none', 'low', 'moderate', 'high', 'peak'] as const).map((tier) => (
                <span key={tier} className="inline-flex items-center gap-1 capitalize">
                  <span className={`w-2 h-2 rounded-full ${INTENSITY_DOT[tier]}`} />
                  {tier}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1 text-center text-[11px] font-medium text-slate-400">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {cells.map((cell) => {
              const isSelected = cell.dateIso === selectedIso;
              const hasActivity = cell.transactions.length > 0;
              return (
                <button
                  key={cell.dateIso}
                  type="button"
                  onClick={() => setSelectedIso(cell.dateIso)}
                  className={`min-h-[56px] sm:min-h-[68px] p-1 sm:p-1.5 rounded-xl border text-left flex flex-col justify-between transition-colors ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/70 dark:bg-teal-950/40 dark:border-teal-500'
                      : cell.inCurrentMonth
                        ? 'border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        : 'border-transparent opacity-35'
                  }`}
                >
                  <div className="w-full flex items-center justify-between gap-1">
                    <span className="text-xs font-mono-num font-medium text-slate-700 dark:text-slate-300">
                      {cell.dayNumber}
                    </span>
                    {cell.inCurrentMonth && cell.intensity !== 'none' && (
                      <span className={`w-1.5 h-1.5 rounded-full ${INTENSITY_DOT[cell.intensity]}`} />
                    )}
                  </div>

                  {hasActivity && (
                    <div className="space-y-0.5 w-full overflow-hidden">
                      {cell.totalIncome > 0 && (
                        <div className="text-[10px] font-mono-num text-emerald-600 dark:text-emerald-400 truncate">
                          {discreetMode
                            ? '+••'
                            : `+${cell.totalIncome >= 1000 ? `${(cell.totalIncome / 1000).toFixed(cell.totalIncome % 1000 === 0 ? 0 : 1)}k` : Math.round(cell.totalIncome)}`}
                        </div>
                      )}
                      {cell.totalSpend > 0 && (
                        <div className="text-[10px] font-mono-num text-rose-600 dark:text-rose-400 truncate">
                          {discreetMode
                            ? '-••'
                            : `-${cell.totalSpend >= 1000 ? `${(cell.totalSpend / 1000).toFixed(cell.totalSpend % 1000 === 0 ? 0 : 1)}k` : Math.round(cell.totalSpend)}`}
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Drilldown */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {formatShortDate(selectedCell.dateIso)}
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {selectedCell.transactions.length}{' '}
                {selectedCell.transactions.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {selectedCell.transactions.length === 0 ? (
                <EmptyState
                  title="Quiet day"
                  description="No spending or income was recorded on this date."
                  actionLabel="Log on This Date"
                  onAction={() => openEntrySheet('spend', selectedCell.dateIso)}
                />
              ) : (
                selectedCell.transactions.map((tx) => {
                  const isInflow = tx.type === 'income' || tx.type === 'borrow';
                  return (
                    <div
                      key={tx.id}
                      className="py-2.5 border-b border-slate-100 dark:border-slate-800/80 last:border-0 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {tx.merchant}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                          {tx.type}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <div
                          className={`text-sm font-mono-num font-semibold mr-1 ${
                            isInflow
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {isInflow ? '+' : '-'}
                          {formatCurrency(tx.amount, currency, false, discreetMode)}
                        </div>
                        <button
                          type="button"
                          onClick={() => openEditTransaction(tx)}
                          aria-label={`Edit ${tx.merchant}`}
                          className="h-[34px] w-[34px] flex items-center justify-center rounded-lg text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTransaction(tx.id)}
                          aria-label={`Delete ${tx.merchant}`}
                          className="h-[34px] w-[34px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => openEntrySheet('spend', selectedCell.dateIso)}
            className="w-full min-h-[44px] rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Entry ({formatShortDate(selectedCell.dateIso)})</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
