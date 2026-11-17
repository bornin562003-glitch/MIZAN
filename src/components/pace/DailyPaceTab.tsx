import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Bike, Flame, Gauge, Plus, ShieldCheck, SlidersHorizontal, TrendingUp } from 'lucide-react';
import { useMizanStore } from '../../store/useMizanStore';
import { buildDailyPaceInsights, computeBudgetMetrics } from '../../utils/budgetEngine';
import { buildDailyHabitHeatmap } from '../../utils/categorizer';
import { formatCurrency, formatShortDate } from '../../utils/formatters';
import { MonthlyHeatmap } from './MonthlyHeatmap';
import { MonthReflections } from './MonthReflections';

export const DailyPaceTab: React.FC = () => {
  const profiles = useMizanStore((s) => s.profiles);
  const activeProfileId = useMizanStore((s) => s.activeProfileId);
  const activeData = useMizanStore((s) => s.activeData);
  const discreetMode = useMizanStore((s) => s.discreetMode);
  const saveReflection = useMizanStore((s) => s.saveReflection);
  const openEntrySheet = useMizanStore((s) => s.openEntrySheet);
  const logCommuteTrip = useMizanStore((s) => s.logCommuteTrip);
  const updateCommuteConfig = useMizanStore((s) => s.updateCommuteConfig);

  const currency = profiles.find((p) => p.id === activeProfileId)?.currency ?? 'PKR';
  const metrics = useMemo(() => computeBudgetMetrics(activeData), [activeData]);
  const heatmapDays = useMemo(() => buildDailyHabitHeatmap(activeData), [activeData]);
  const insights = useMemo(() => buildDailyPaceInsights(activeData), [activeData]);

  const [showTrackerTable, setShowTrackerTable] = useState(true);
  const [editingCommute, setEditingCommute] = useState(false);
  const commute = activeData.commuteTracker ?? { kmPerTrip: 10, savingsPerTrip: 120, trips: [] };
  const [kmDraft, setKmDraft] = useState(String(commute.kmPerTrip));
  const [savDraft, setSavDraft] = useState(String(commute.savingsPerTrip));

  const showCommute = activeData.preferences?.enabledTrackers.commuteSavings ?? true;

  const dailyHabits = metrics.envelopeSummaries.filter(
    (s) => s.envelope.group === 'daily_living',
  );

  const burnStatus =
    metrics.actualDailyBurnRate <= metrics.safeDailyPace
      ? { label: 'On Track', tone: 'text-emerald-600 dark:text-emerald-400' }
      : metrics.actualDailyBurnRate <= metrics.safeDailyPace * 1.15
        ? { label: 'Approaching Limit', tone: 'text-amber-600 dark:text-amber-400' }
        : { label: 'Over Burn Rate', tone: 'text-rose-600 dark:text-rose-400' };

  const totalCommuteKm = commute.trips.reduce((s, t) => s + t.km, 0);
  const totalCommuteSaved = commute.trips.reduce((s, t) => s + t.saved, 0);

  const emergencyPct = Math.min(100, Math.round((insights.emergencyMonthsCovered / 6) * 100));

  return (
    <motion.div
      key={`pace-${activeProfileId}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Daily Pace & Habit Tracker
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Monitor food, commute, streaks, and emergency runway against your monthly burn rate
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs self-start sm:self-auto">
          <div className="h-[38px] inline-flex items-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 font-medium text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
            <span className="font-mono-num font-bold mr-1">{insights.streakDays}d</span> under-target streak
          </div>
          <div className="h-[38px] inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
            Adaptive rate:{' '}
            <strong className="font-mono-num text-slate-900 dark:text-slate-100 ml-1">
              {formatCurrency(insights.adaptiveDailyRate, currency, false, discreetMode)}/day
            </strong>
          </div>
        </div>
      </div>

      {/* Spending Velocity Tracker */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Gauge className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Current Daily Burn</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono-num text-slate-900 dark:text-slate-100">
            {formatCurrency(metrics.actualDailyBurnRate, currency, false, discreetMode)}
          </div>
          <div className={`mt-1 text-xs font-medium ${burnStatus.tone}`}>
            {burnStatus.label} · Safe cap {formatCurrency(metrics.safeDailyPace, currency, false, discreetMode)}/day
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Projected Month-End</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono-num text-slate-900 dark:text-slate-100">
            {formatCurrency(metrics.projectedMonthEndSpend, currency, false, discreetMode)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            vs. {formatCurrency(metrics.totalAssigned, currency, false, discreetMode)} assigned total
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Daily Living Cushion</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono-num text-slate-900 dark:text-slate-100">
            {formatCurrency(metrics.dailyLivingRemaining, currency, false, discreetMode)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Remaining for {metrics.daysRemaining} days
          </div>
        </div>
      </div>

      {/* Spending Patterns, Runway & Emergency Fund Milestones */}
      <section
        aria-label="Spending patterns and emergency fund runway"
        className="grid grid-cols-1 lg:grid-cols-12 gap-4"
      >
        <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Spending Patterns & Cash Runway
          </h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Weekday Avg</span>
              <div className="mt-0.5 text-base font-bold font-mono-num text-slate-900 dark:text-slate-100">
                {formatCurrency(insights.weekdayAvg, currency, false, discreetMode)}
              </div>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Weekend Avg</span>
              <div className="mt-0.5 text-base font-bold font-mono-num text-slate-900 dark:text-slate-100">
                {formatCurrency(insights.weekendAvg, currency, false, discreetMode)}
              </div>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Buffer Runway</span>
              <div className="mt-0.5 text-base font-bold font-mono-num text-teal-600 dark:text-teal-400">
                {insights.bufferRunwayDays} days
              </div>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Total Cash Runway</span>
              <div className="mt-0.5 text-base font-bold font-mono-num text-slate-900 dark:text-slate-100">
                {insights.totalCashRunwayDays} days
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Emergency Fund Milestones (1 / 3 / 6 Months)
              </h2>
            </div>
            <span className="text-xs font-mono-num font-semibold text-emerald-600 dark:text-emerald-400">
              {insights.emergencyMonthsCovered} mo covered
            </span>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono-num">
            Reserves {formatCurrency(insights.emergencyReserveTotal, currency, false, discreetMode)} ·
            Essential monthly baseline {formatCurrency(insights.monthlyEssentialRunRate, currency, false, discreetMode)}
          </div>

          <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${emergencyPct}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] font-mono-num text-slate-500 dark:text-slate-400">
            <span>1 mo ({insights.emergencyMonthsCovered >= 1 ? 'Reached' : 'In progress'})</span>
            <span>3 mo ({insights.emergencyMonthsCovered >= 3 ? 'Reached' : 'Next'})</span>
            <span>6 mo ({insights.emergencyMonthsCovered >= 6 ? 'Reached' : 'Goal'})</span>
          </div>
        </div>
      </section>

      {/* Commute Savings Tracker */}
      {showCommute && (
        <section
          aria-label="Commute savings tracker"
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5 space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <Bike className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Commute Savings Tracker
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {commute.kmPerTrip} km/trip ·{' '}
                  {formatCurrency(commute.savingsPerTrip, currency, false, discreetMode)} saved vs ride-share
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setKmDraft(String(commute.kmPerTrip));
                  setSavDraft(String(commute.savingsPerTrip));
                  setEditingCommute((v) => !v);
                }}
                aria-label="Configure commute trip metrics"
                className="h-[38px] w-[38px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={logCommuteTrip}
                className="h-[38px] px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Log {commute.kmPerTrip} km Trip</span>
              </button>
            </div>
          </div>

          {editingCommute && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateCommuteConfig(Number(kmDraft) || 10, Number(savDraft) || 0);
                setEditingCommute(false);
              }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 items-end"
            >
              <div>
                <label htmlFor="commute-km" className="block text-[11px] text-slate-500 mb-1">
                  Distance per trip (km)
                </label>
                <input
                  id="commute-km"
                  type="number"
                  min="1"
                  value={kmDraft}
                  onChange={(e) => setKmDraft(e.target.value)}
                  className="w-full min-h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-mono-num"
                />
              </div>
              <div>
                <label htmlFor="commute-sav" className="block text-[11px] text-slate-500 mb-1">
                  Estimated savings / trip ({currency})
                </label>
                <input
                  id="commute-sav"
                  type="number"
                  min="0"
                  value={savDraft}
                  onChange={(e) => setSavDraft(e.target.value)}
                  className="w-full min-h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-mono-num"
                />
              </div>
              <button
                type="submit"
                className="min-h-[38px] rounded-xl bg-teal-600 text-white text-xs font-medium"
              >
                Save Settings
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
              <div className="text-slate-500 dark:text-slate-400">Logged Trips</div>
              <div className="mt-0.5 text-base font-bold font-mono-num text-slate-900 dark:text-slate-100">
                {commute.trips.length}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
              <div className="text-slate-500 dark:text-slate-400">Distance Covered</div>
              <div className="mt-0.5 text-base font-bold font-mono-num text-slate-900 dark:text-slate-100">
                {totalCommuteKm} km
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
              <div className="text-slate-500 dark:text-slate-400">Total Fuel Saved</div>
              <div className="mt-0.5 text-base font-bold font-mono-num text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalCommuteSaved, currency, false, discreetMode)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Daily Habit Allowance Cards */}
      <section aria-label="Daily habit allowances" className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Daily Habit Allowances
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {dailyHabits.map((item) => {
            const dailyTarget =
              item.envelope.dailyHabitTarget ??
              Math.round(item.envelope.assigned / metrics.daysInMonth);
            const avgDaily = Math.round(item.spent / metrics.dayOfMonth);
            const pct = dailyTarget > 0 ? Math.min(100, Math.round((avgDaily / dailyTarget) * 100)) : 0;
            const overDaily = avgDaily > dailyTarget && dailyTarget > 0;

            return (
              <div
                key={item.envelope.id}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {item.envelope.name}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      overDaily
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {overDaily ? 'High' : 'Healthy'}
                  </span>
                </div>

                <div>
                  <div className="text-lg font-bold font-mono-num text-slate-900 dark:text-slate-100">
                    {formatCurrency(avgDaily, currency, false, discreetMode)}
                    <span className="text-xs font-normal text-slate-400"> / day avg</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                    Target {formatCurrency(dailyTarget, currency, false, discreetMode)}/day
                  </div>
                </div>

                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${overDaily ? 'bg-rose-500' : 'bg-teal-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Color-Coded Monthly Heatmap */}
      <MonthlyHeatmap days={heatmapDays} currency={currency} />

      {/* 30-Day Daily Tracker Ledger Table */}
      <section
        aria-label="Daily pace breakdown table"
        className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5 space-y-3"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Day-by-Day Cushion Tracker
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Daily allowance variance and cumulative rolling cushion across the month
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowTrackerTable((v) => !v)}
            className="h-[36px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0"
          >
            {showTrackerTable ? 'Collapse Table' : 'Show Table'}
          </button>
        </div>

        {showTrackerTable && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 px-2 font-medium">Day</th>
                  <th className="py-2 px-2 font-medium text-right">Target</th>
                  <th className="py-2 px-2 font-medium text-right">Spent</th>
                  <th className="py-2 px-2 font-medium text-right">Diff</th>
                  <th className="py-2 px-2 font-medium text-right">Cushion</th>
                  <th className="py-2 pl-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {insights.rows
                  .filter((r) => !r.isFuture)
                  .slice(-14)
                  .reverse()
                  .map((row) => (
                    <tr key={row.dateIso} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-2 pr-3 font-mono-num text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {formatShortDate(row.dateIso)}
                      </td>
                      <td className="py-2 px-2 text-slate-500 dark:text-slate-400">{row.weekday}</td>
                      <td className="py-2 px-2 text-right font-mono-num text-slate-500 dark:text-slate-400">
                        {formatCurrency(row.target, currency, false, discreetMode)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono-num font-medium text-slate-900 dark:text-slate-100">
                        {formatCurrency(row.spent, currency, false, discreetMode)}
                      </td>
                      <td
                        className={`py-2 px-2 text-right font-mono-num font-semibold ${
                          row.diff >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {discreetMode
                          ? '••••'
                          : `${row.diff >= 0 ? '+' : ''}${formatCurrency(row.diff, currency)}`}
                      </td>
                      <td className="py-2 px-2 text-right font-mono-num text-slate-700 dark:text-slate-200">
                        {formatCurrency(row.cumulativeCushion, currency, false, discreetMode)}
                      </td>
                      <td className="py-2 pl-2 text-right">
                        <button
                          type="button"
                          onClick={() => openEntrySheet('spend', row.dateIso)}
                          className="h-[30px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 whitespace-nowrap"
                        >
                          + Log
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Month-End Reflections */}
      <MonthReflections reflections={activeData.reflections} onSave={saveReflection} />
    </motion.div>
  );
};
