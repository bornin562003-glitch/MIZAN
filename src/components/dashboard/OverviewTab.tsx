import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Bell,
  CalendarClock,
  CalendarRange,
  Check,
  FileText,
  HandCoins,
  Landmark,
  Pencil,
  Target,
  TrendingUp,
  X,
} from 'lucide-react';
import { useMizanStore } from '../../store/useMizanStore';
import {
  OverviewWindowMode,
  buildCategoryBreakdown,
  buildDailyVelocitySeries,
  buildMultiMonthTrends,
  buildSpendingTrends,
  computeBudgetMetrics,
  filterTransactionsByWindow,
  getMonthPrefix,
} from '../../utils/budgetEngine';
import { formatCurrency, formatShortDate, getTodayIso } from '../../utils/formatters';
import { TransactionType } from '../../types/finance';
import { AnimatedAmount } from './AnimatedAmount';
import { BudgetHealthCard } from './BudgetHealthCard';
import { DebtTrackingSection } from './DebtTrackingSection';
import { FloatingQuickAdd } from './FloatingQuickAdd';
import { OverviewCharts } from './OverviewCharts';
import { QuickSpendCard } from './QuickSpendCard';
import { RecentLedger } from './RecentLedger';
import { BudgetWarningsBanner } from '../notifications/BudgetWarningsBanner';

const QUICK_ACTIONS: {
  type: TransactionType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}[] = [
  {
    type: 'spend',
    label: 'Spend',
    icon: ArrowUpRight,
    tone: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  },
  {
    type: 'income',
    label: 'Income',
    icon: ArrowDownLeft,
    tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    type: 'transfer',
    label: 'Transfer',
    icon: ArrowLeftRight,
    tone: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    type: 'borrow',
    label: 'Borrow',
    icon: Landmark,
    tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    type: 'lend',
    label: 'Lend',
    icon: HandCoins,
    tone: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  },
];

export const OverviewTab: React.FC = () => {
  const profiles = useMizanStore((s) => s.profiles);
  const activeProfileId = useMizanStore((s) => s.activeProfileId);
  const activeData = useMizanStore((s) => s.activeData);
  const searchQuery = useMizanStore((s) => s.searchQuery);
  const discreetMode = useMizanStore((s) => s.discreetMode);
  const openEntrySheet = useMizanStore((s) => s.openEntrySheet);
  const openEditTransaction = useMizanStore((s) => s.openEditTransaction);
  const openReportModal = useMizanStore((s) => s.openReportModal);
  const setActiveTab = useMizanStore((s) => s.setActiveTab);
  const deleteTransaction = useMizanStore((s) => s.deleteTransaction);
  const bulkDeleteTransactions = useMizanStore((s) => s.bulkDeleteTransactions);
  const setMonthlySavingsGoal = useMizanStore((s) => s.setMonthlySavingsGoal);
  const dismissEveningNudgeForToday = useMizanStore((s) => s.dismissEveningNudgeForToday);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
  const currency = activeProfile?.currency ?? 'PKR';

  const todayIso = getTodayIso();
  const currentMonthPrefix = getMonthPrefix(new Date());

  // Account & Date Window Controls
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [windowMode, setWindowMode] = useState<OverviewWindowMode>('month');
  const [dayIso, setDayIso] = useState<string>(todayIso);
  const [rangeStartIso, setRangeStartIso] = useState<string>(`${currentMonthPrefix}-01`);
  const [rangeEndIso, setRangeEndIso] = useState<string>(todayIso);

  // Projections toggle & Savings goal inline edit
  const [showProjections, setShowProjections] = useState(true);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');

  const metrics = useMemo(() => computeBudgetMetrics(activeData), [activeData]);

  const scopedTransactions = useMemo(
    () =>
      filterTransactionsByWindow(activeData.transactions, {
        accountId: accountFilter,
        windowMode,
        dayIso,
        rangeStartIso,
        rangeEndIso,
        monthPrefix: currentMonthPrefix,
      }),
    [activeData.transactions, accountFilter, windowMode, dayIso, rangeStartIso, rangeEndIso, currentMonthPrefix],
  );

  const categories = useMemo(
    () => buildCategoryBreakdown(activeData, new Date(), scopedTransactions),
    [activeData, scopedTransactions],
  );
  const trends = useMemo(
    () => buildSpendingTrends(activeData, new Date(), scopedTransactions),
    [activeData, scopedTransactions],
  );
  const multiMonth3 = useMemo(() => buildMultiMonthTrends(activeData.transactions, 3), [activeData.transactions]);
  const multiMonth6 = useMemo(() => buildMultiMonthTrends(activeData.transactions, 6), [activeData.transactions]);
  const multiMonthAll = useMemo(() => buildMultiMonthTrends(activeData.transactions, 'all'), [activeData.transactions]);
  const velocity = useMemo(
    () => buildDailyVelocitySeries(activeData, new Date(), scopedTransactions),
    [activeData, scopedTransactions],
  );

  // Evening check-in nudge eligibility
  const prefs = activeData.preferences;
  const loggedTodayCount = activeData.transactions.filter((tx) => tx.date === todayIso).length;
  const showEveningNudge = Boolean(
    prefs?.eveningNudgeEnabled &&
      prefs.nudgeDismissedDate !== todayIso &&
      loggedTodayCount === 0,
  );

  const fixedSummaries = metrics.envelopeSummaries.filter((s) => s.envelope.group === 'fixed_expenses');
  const fixedAssigned = fixedSummaries.reduce((s, x) => s + x.envelope.assigned, 0);
  const fixedPaid = fixedSummaries.reduce((s, x) => s + x.spent, 0);
  const fixedUpcoming = Math.max(0, fixedAssigned - fixedPaid);

  const showDailyPaceKpi = prefs?.enabledTrackers.dailyPaceKpi ?? true;

  const windowDescription =
    windowMode === 'day'
      ? `Outflow on ${formatShortDate(dayIso)}`
      : windowMode === 'range'
        ? `${formatShortDate(rangeStartIso)} – ${formatShortDate(rangeEndIso)}`
        : "This month's envelope outflow";

  const savingsPct =
    metrics.monthlySavingsGoal > 0
      ? Math.max(0, Math.min(100, Math.round((metrics.monthlyNetSavings / metrics.monthlySavingsGoal) * 100)))
      : 0;

  const isScoped = accountFilter !== 'all' || windowMode !== 'month';
  const scopedOutflow = useMemo(
    () => scopedTransactions.filter((t) => t.type === 'spend').reduce((s, t) => s + t.amount, 0),
    [scopedTransactions],
  );
  const scopedInflow = useMemo(
    () => scopedTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [scopedTransactions],
  );
  const scopedAccountName =
    accountFilter === 'all'
      ? 'All Accounts'
      : activeData.accounts.find((a) => a.id === accountFilter)?.name ?? 'Account';
  const nextRecurringEvent = metrics.upcomingRecurringEvents[0];

  return (
    <>
      <motion.div
        key={`overview-${activeProfileId}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="space-y-6"
      >
      {/* Evening Check-In Nudge */}
      {showEveningNudge && (
        <div
          role="region"
          aria-label="Evening check-in reminder"
          className="rounded-2xl border border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/25 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Evening Check-In ({prefs?.eveningNudgeTime ?? '21:00'})
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                No entries recorded today yet. Capture small daily cash spends before winding down.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => openEntrySheet('spend')}
              className="min-h-[36px] px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium"
            >
              Log Today&apos;s Spend
            </button>
            <button
              type="button"
              onClick={dismissEveningNudgeForToday}
              aria-label="Dismiss reminder for today"
              className="min-h-[36px] px-2.5 rounded-xl border border-amber-300/60 dark:border-amber-700/60 text-xs text-slate-600 dark:text-slate-300 hover:bg-amber-100/50 dark:hover:bg-amber-900/30"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Header + Window/Projections Controls */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {activeProfile?.name} Command Center
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {metrics.daysRemaining} days remaining this month · {currency} zero-based ledger
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowProjections((v) => !v)}
            aria-pressed={showProjections}
            className={`h-[40px] px-3.5 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              showProjections
                ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span>Projections</span>
          </button>

          <button
            type="button"
            onClick={openReportModal}
            className="h-[40px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap"
          >
            <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>Export PDF Report</span>
          </button>
        </div>
      </div>

      {/* Real-Time Budget 80% / 100% Warnings Banner */}
      <BudgetWarningsBanner
        alerts={metrics.budgetAlerts}
        currency={currency}
        onAction={() => setActiveTab('envelopes')}
      />

      {/* Account Scope & Date Window Toolbar */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-3 sm:p-4 space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <button
              type="button"
              onClick={() => setAccountFilter('all')}
              className={`h-[36px] px-3 rounded-xl text-xs font-medium inline-flex items-center whitespace-nowrap transition-colors ${
                accountFilter === 'all'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
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
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {acc.name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto lg:justify-end">
            <div
              role="group"
              aria-label="Date window mode"
              className="inline-flex h-[40px] items-center gap-1 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800 shrink-0"
            >
              {(
                [
                  { id: 'month', label: 'Month' },
                  { id: 'range', label: 'Range' },
                  { id: 'day', label: 'Day' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setWindowMode(opt.id)}
                  className={`h-[30px] px-3 rounded-lg text-xs font-medium inline-flex items-center justify-center whitespace-nowrap transition-colors ${
                    windowMode === opt.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {windowMode === 'day' && (
              <input
                type="date"
                aria-label="Selected day"
                value={dayIso}
                onChange={(e) => setDayIso(e.target.value)}
                className="h-[40px] min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs"
              />
            )}

            {windowMode === 'range' && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs w-full sm:w-auto">
                <CalendarRange className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="date"
                  aria-label="Range start date"
                  value={rangeStartIso}
                  onChange={(e) => setRangeStartIso(e.target.value)}
                  className="h-[40px] flex-1 sm:flex-initial min-w-[125px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 text-xs"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  aria-label="Range end date"
                  value={rangeEndIso}
                  onChange={(e) => setRangeEndIso(e.target.value)}
                  className="h-[40px] flex-1 sm:flex-initial min-w-[125px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 text-xs"
                />
              </div>
            )}
          </div>
        </div>

        {isScoped && (
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-slate-100">{scopedAccountName}</span>
              {' · '}
              <span>{windowDescription}</span>
              {' · '}
              <span className="font-mono-num">
                {scopedTransactions.length} {scopedTransactions.length === 1 ? 'entry' : 'entries'}
              </span>
              {' · '}
              <span className="font-mono-num text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(scopedInflow, currency, true, discreetMode)}
              </span>
              {' / '}
              <span className="font-mono-num text-rose-600 dark:text-rose-400">
                -{formatCurrency(scopedOutflow, currency, true, discreetMode)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setAccountFilter('all');
                setWindowMode('month');
              }}
              className="text-teal-600 dark:text-teal-400 font-medium hover:underline"
            >
              Reset filter
            </button>
          </div>
        )}
      </div>

      {/* End-of-Month Projections, Recurring Forecast & Fixed Bills */}
      {showProjections && (
        <section
          aria-label="Month-end projections and recurring forecast"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Projected Month-End Spend
            </div>
            <div className="mt-1.5 text-xl font-bold font-mono-num text-slate-900 dark:text-slate-100">
              {formatCurrency(metrics.projectedMonthEndSpend, currency, false, discreetMode)}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Burn {formatCurrency(metrics.actualDailyBurnRate, currency, true, discreetMode)}/day +{' '}
              {formatCurrency(metrics.upcomingRecurringSpend, currency, true, discreetMode)} scheduled
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Projected Liquid Cash
            </div>
            <div className="mt-1.5 text-xl font-bold font-mono-num text-teal-700 dark:text-teal-400">
              {formatCurrency(metrics.projectedMonthEndBalance, currency, false, discreetMode)}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Includes +{formatCurrency(metrics.upcomingRecurringIncome, currency, true, discreetMode)} recurring inflows
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <CalendarClock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Upcoming Recurring</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('envelopes')}
                className="text-[11px] font-medium text-teal-600 dark:text-teal-400 hover:underline"
              >
                Manage
              </button>
            </div>
            <div className="mt-1.5 text-base font-bold font-mono-num text-slate-900 dark:text-slate-100">
              <span className="text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(metrics.upcomingRecurringIncome, currency, true, discreetMode)}
              </span>
              <span className="text-slate-400 mx-1">/</span>
              <span className="text-rose-600 dark:text-rose-400">
                -{formatCurrency(metrics.upcomingRecurringSpend, currency, true, discreetMode)}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
              {nextRecurringEvent
                ? `Next: ${nextRecurringEvent.title} (${formatShortDate(nextRecurringEvent.date)})`
                : 'No more due this month'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Fixed Bills Forecast
            </div>
            <div className="mt-1.5 text-xl font-bold font-mono-num text-slate-900 dark:text-slate-100">
              {formatCurrency(fixedUpcoming, currency, false, discreetMode)}{' '}
              <span className="text-xs font-normal text-slate-400">upcoming</span>
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Paid {formatCurrency(fixedPaid, currency, true, discreetMode)} of{' '}
              {formatCurrency(fixedAssigned, currency, true, discreetMode)}
            </div>
          </div>
        </section>
      )}

      {/* Primary KPI Grid */}
      <div className={`grid grid-cols-1 ${showDailyPaceKpi ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
        {showDailyPaceKpi && (
          <div className="rounded-2xl border border-teal-600/30 dark:border-teal-500/30 bg-white dark:bg-slate-900/80 p-5">
            <div className="text-xs font-medium text-teal-700 dark:text-teal-400">
              Safe Daily Pace
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
              <AnimatedAmount value={metrics.safeDailyPace} currency={currency} />
            </div>
            <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Per day across {metrics.daysRemaining} remaining days
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Unassigned Cash
          </div>
          <div
            className={`mt-2 text-2xl sm:text-3xl font-bold ${
              metrics.unassignedCash < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            <AnimatedAmount value={metrics.unassignedCash} currency={currency} />
          </div>
          <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between gap-2">
            <span>Liquid {formatCurrency(metrics.liquidCash, currency, true, discreetMode)}</span>
            <button
              type="button"
              onClick={() => setActiveTab('envelopes')}
              className="text-teal-600 dark:text-teal-400 font-medium hover:underline"
            >
              Assign
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Net Worth
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            <AnimatedAmount value={metrics.netWorth} currency={currency} />
          </div>
          <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Inflow {formatCurrency(metrics.monthlyIncome, currency, true, discreetMode)} · Outflow{' '}
            {formatCurrency(metrics.monthlySpend, currency, true, discreetMode)}
          </div>
        </div>
      </div>

      {/* Monthly Savings Goal Progress Card */}
      <section
        aria-label="Monthly savings goal"
        className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 sm:p-5 space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4" />
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Monthly Savings Goal
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Net surplus {formatCurrency(metrics.monthlyNetSavings, currency, false, discreetMode)} ·{' '}
                Savings rate {metrics.savingsRatePercent}%
              </div>
            </div>
          </div>

          {editingGoal ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setMonthlySavingsGoal(Number(goalDraft) || 0);
                setEditingGoal(false);
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="number"
                min="0"
                step="any"
                autoFocus
                aria-label="Monthly savings goal target"
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                className="w-32 min-h-[36px] rounded-xl border border-teal-500 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs font-mono-num"
              />
              <button
                type="submit"
                aria-label="Save savings goal"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl bg-teal-600 text-white"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setEditingGoal(false)}
                aria-label="Cancel goal edit"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono-num text-slate-700 dark:text-slate-200 font-semibold">
                Target: {formatCurrency(metrics.monthlySavingsGoal, currency, false, discreetMode)}
              </span>
              <button
                type="button"
                onClick={() => {
                  setGoalDraft(String(metrics.monthlySavingsGoal));
                  setEditingGoal(true);
                }}
                aria-label="Edit monthly savings goal"
                className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              metrics.monthlyNetSavings < 0 ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${savingsPct}%` }}
          />
        </div>
      </section>

      {/* Quick Actions */}
      <section aria-label="Quick actions">
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.type}
                type="button"
                onClick={() => openEntrySheet(action.type)}
                className="min-h-[68px] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 hover:bg-slate-50 dark:hover:bg-slate-800/80 p-2.5 flex flex-col items-center justify-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${action.tone}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Hybrid Inline Quick Daily Spending Log + One-Tap Presets */}
      <QuickSpendCard />

      {/* Zero-Based Budget Health */}
      <BudgetHealthCard
        metrics={metrics}
        currency={currency}
        onOpenEnvelopes={() => setActiveTab('envelopes')}
      />

      {/* Debt & Loan Repayment Tracker */}
      <DebtTrackingSection />

      {/* Interactive Recharts Suite */}
      <OverviewCharts
        categories={categories}
        trends={trends}
        multiMonth3={multiMonth3}
        multiMonth6={multiMonth6}
        multiMonthAll={multiMonthAll}
        velocity={velocity}
        currency={currency}
        windowLabel={windowDescription}
        onAddSpend={() => openEntrySheet('spend')}
      />

      {/* Recent Transactions */}
      <RecentLedger
        transactions={scopedTransactions}
        envelopes={activeData.envelopes}
        currency={currency}
        searchQuery={searchQuery}
        onEdit={openEditTransaction}
        onDelete={deleteTransaction}
        onBulkDelete={bulkDeleteTransactions}
        onAddEntry={() => openEntrySheet('spend')}
      />
      </motion.div>

      <FloatingQuickAdd />
    </>
  );
};
