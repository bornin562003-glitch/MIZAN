import React, { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useMizanStore } from '../../store/useMizanStore';
import {
  CategorySlice,
  MultiMonthTrendPoint,
  VelocityPoint,
  WeeklyTrendPoint,
} from '../../utils/budgetEngine';
import { formatCurrency } from '../../utils/formatters';
import { EmptyState } from '../layout/EmptyState';

interface OverviewChartsProps {
  categories: CategorySlice[];
  trends: WeeklyTrendPoint[];
  multiMonth3: MultiMonthTrendPoint[];
  multiMonth6: MultiMonthTrendPoint[];
  multiMonthAll: MultiMonthTrendPoint[];
  velocity: VelocityPoint[];
  currency: string;
  windowLabel?: string;
  onAddSpend: () => void;
}

export const OverviewCharts: React.FC<OverviewChartsProps> = ({
  categories,
  trends,
  multiMonth3,
  multiMonth6,
  multiMonthAll,
  velocity,
  currency,
  windowLabel = "This month's envelope outflow",
  onAddSpend,
}) => {
  const discreetMode = useMizanStore((s) => s.discreetMode);
  const [trendRange, setTrendRange] = useState<'weekly' | '3m' | '6m' | 'all'>('weekly');
  const [velocityMode, setVelocityMode] = useState<'cumulative' | 'daily'>('cumulative');

  const totalCategorySpend = categories.reduce((sum, c) => sum + c.value, 0);
  const hasTrends = trends.some((t) => t.total > 0);
  const activeMultiData =
    trendRange === '3m' ? multiMonth3 : trendRange === '6m' ? multiMonth6 : multiMonthAll;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* 1. Category Breakdown Donut */}
      <section
        aria-label="Category breakdown chart"
        className="lg:col-span-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5 min-w-0"
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Category Breakdown
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{windowLabel}</p>
          </div>
          <span className="text-xs font-mono-num font-medium text-slate-600 dark:text-slate-300">
            {formatCurrency(totalCategorySpend, currency, true, discreetMode)}
          </span>
        </div>

        {categories.length === 0 ? (
          <EmptyState
            title="No spending recorded"
            description="Log an expense or widen the window filter to see envelope distribution."
            actionLabel="Log Spend"
            onAction={onAddSpend}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-3">
            <div className="h-52 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {categories.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => formatCurrency(Number(val ?? 0), currency, false, discreetMode)}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2.5 min-w-0">
              {categories.slice(0, 5).map((cat) => (
                <div key={cat.id} className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-slate-700 dark:text-slate-300 truncate">{cat.name}</span>
                  </div>
                  <span className="font-mono-num text-slate-500 dark:text-slate-400 shrink-0">
                    {cat.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 2. Spending Trends (Weekly or Multi-Month 3M / 6M / All) */}
      <section
        aria-label="Spending trends chart"
        className="lg:col-span-7 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5 min-w-0"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {trendRange === 'weekly' ? 'Weekly Spending Trends' : 'Income vs. Spend Trends'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {trendRange === 'weekly'
                ? 'Daily living vs. fixed expenses by week'
                : 'Monthly cash inflow compared to total spending'}
            </p>
          </div>

          <div
            role="group"
            aria-label="Trend range"
            className="inline-flex h-[38px] items-center gap-1 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800 self-start sm:self-auto"
          >
            {(
              [
                { id: 'weekly', label: 'Weekly' },
                { id: '3m', label: '3M' },
                { id: '6m', label: '6M' },
                { id: 'all', label: 'All' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTrendRange(opt.id)}
                className={`h-[28px] px-3 rounded-lg text-xs font-medium inline-flex items-center justify-center whitespace-nowrap transition-colors ${
                  trendRange === opt.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-52 w-full min-w-0">
          {trendRange === 'weekly' ? (
            !hasTrends ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Weekly breakdown appears as transactions are logged in this window.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) =>
                      discreetMode ? '••' : v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`
                    }
                  />
                  <Tooltip
                    formatter={(val) => formatCurrency(Number(val ?? 0), currency, false, discreetMode)}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="dailyLiving" name="Daily Living" stackId="a" fill="#14B8A6" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="fixedExpenses" name="Fixed Expenses" stackId="a" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeMultiData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    discreetMode ? '••' : v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`
                  }
                />
                <Tooltip
                  formatter={(val) => formatCurrency(Number(val ?? 0), currency, false, discreetMode)}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spend" name="Spend" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* 3. Daily Velocity Gradient Area / Daily + 3-Day Rolling Chart */}
      <section
        aria-label="Daily spending velocity chart"
        className="lg:col-span-12 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-5 min-w-0"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Daily Living Velocity
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {velocityMode === 'cumulative'
                ? 'Cumulative daily living outflow compared against your steady monthly pace'
                : 'Daily spend bars overlaid with a 3-day rolling pace'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              role="group"
              aria-label="Velocity display mode"
              className="inline-flex h-[38px] items-center gap-1 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800"
            >
              <button
                type="button"
                onClick={() => setVelocityMode('cumulative')}
                className={`h-[28px] px-3 rounded-lg text-xs font-medium inline-flex items-center justify-center whitespace-nowrap transition-colors ${
                  velocityMode === 'cumulative'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Cumulative
              </button>
              <button
                type="button"
                onClick={() => setVelocityMode('daily')}
                className={`h-[28px] px-3 rounded-lg text-xs font-medium inline-flex items-center justify-center whitespace-nowrap transition-colors ${
                  velocityMode === 'daily'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Daily + 3-Day Avg
              </button>
            </div>
          </div>
        </div>

        <div className="h-56 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            {velocityMode === 'cumulative' ? (
              <AreaChart data={velocity} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="mizanVelocityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    discreetMode ? '••' : v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`
                  }
                />
                <Tooltip
                  formatter={(val) => formatCurrency(Number(val ?? 0), currency, false, discreetMode)}
                  labelFormatter={(day) => `Day ${day}`}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="idealCumulative"
                  name="Ideal Pace"
                  stroke="#94A3B8"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  fill="none"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="actualCumulative"
                  name="Actual Spend"
                  stroke="#14B8A6"
                  strokeWidth={2.2}
                  fill="url(#mizanVelocityGrad)"
                  connectNulls={false}
                />
              </AreaChart>
            ) : (
              <ComposedChart data={velocity} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    discreetMode ? '••' : v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`
                  }
                />
                <Tooltip
                  formatter={(val) => formatCurrency(Number(val ?? 0), currency, false, discreetMode)}
                  labelFormatter={(day) => `Day ${day}`}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="actualDaily" name="Daily Spend" fill="#14B8A6" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="rolling3DayAvg"
                  name="3-Day Rolling Avg"
                  stroke="#D97706"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};
