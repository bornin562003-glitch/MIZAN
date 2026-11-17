import { AccountKind, Envelope, ProfileData, Transaction } from '../types/finance';
import { getWeekdayShort } from './formatters';
import { UpcomingRecurringEvent, calculateRemainingMonthRecurring } from './recurringEngine';

export interface EnvelopeSummary {
  envelope: Envelope;
  spent: number;
  remaining: number;
  percentUsed: number;
  isOverspent: boolean;
}

export interface BudgetAlert {
  envelopeId: string;
  envelopeName: string;
  severity: 'warning' | 'critical';
  threshold: 80 | 100;
  percentUsed: number;
  spent: number;
  assigned: number;
  remaining: number;
}

export interface BudgetMetrics {
  netWorth: number;
  liquidCash: number;
  vaultTotal: number;
  receivables: number;
  debt: number;
  trackedDebtTotal: number;
  totalAssigned: number;
  unassignedCash: number;
  monthlyIncome: number;
  monthlySpend: number;
  monthlyNetSavings: number;
  monthlySavingsGoal: number;
  savingsRatePercent: number;
  dailyLivingAssigned: number;
  dailyLivingSpent: number;
  dailyLivingRemaining: number;
  daysInMonth: number;
  dayOfMonth: number;
  daysRemaining: number;
  safeDailyPace: number;
  actualDailyBurnRate: number;
  upcomingRecurringIncome: number;
  upcomingRecurringSpend: number;
  upcomingRecurringEvents: UpcomingRecurringEvent[];
  projectedMonthEndSpend: number;
  projectedMonthEndBalance: number;
  budgetHealthScore: number;
  healthStatus: 'Balanced' | 'Tight' | 'Overspent';
  overspentEnvelopes: EnvelopeSummary[];
  budgetAlerts: BudgetAlert[];
  envelopeSummaries: EnvelopeSummary[];
}

export interface CategorySlice {
  id: string;
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export interface WeeklyTrendPoint {
  label: string;
  dailyLiving: number;
  fixedExpenses: number;
  savingsAndOther: number;
  total: number;
}

export interface MultiMonthTrendPoint {
  monthKey: string;
  label: string;
  income: number;
  spend: number;
  savings: number;
}

export interface VelocityPoint {
  day: number;
  label: string;
  actualDaily: number | null;
  rolling3DayAvg: number | null;
  actualCumulative: number | null;
  idealCumulative: number;
}

export type CalendarIntensity = 'none' | 'low' | 'moderate' | 'high' | 'peak';

export interface CalendarDayCell {
  dateIso: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  totalSpend: number;
  totalIncome: number;
  intensity: CalendarIntensity;
  transactions: Transaction[];
}

export interface CalendarSummaryStats {
  monthTotalSpent: number;
  avgPerActiveDay: number;
  highSpendDays: number;
  peakSpendingDay: { dateIso: string; amount: number } | null;
}

export type OverviewWindowMode = 'month' | 'range' | 'day';

export interface WindowFilterOptions {
  accountId: string; // 'all' or specific accountId
  windowMode: OverviewWindowMode;
  dayIso: string;
  rangeStartIso: string;
  rangeEndIso: string;
  monthPrefix: string;
}

export interface DailyTrackerRow {
  dayNumber: number;
  dateIso: string;
  weekday: string;
  target: number;
  spent: number;
  diff: number;
  cumulativeCushion: number;
  isFuture: boolean;
}

export interface PaceInsights {
  rows: DailyTrackerRow[];
  streakDays: number;
  adaptiveDailyRate: number;
  weekdayAvg: number;
  weekendAvg: number;
  bufferRunwayDays: number;
  totalCashRunwayDays: number;
  monthlyEssentialRunRate: number;
  emergencyReserveTotal: number;
  emergencyMonthsCovered: number;
}

const CHART_PALETTE = [
  '#0D9488', // Teal
  '#2563EB', // Blue
  '#D97706', // Amber
  '#7C3AED', // Violet
  '#059669', // Emerald
  '#E11D48', // Rose
  '#475569', // Slate
];

export function getMonthPrefix(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function computeBudgetMetrics(
  data: ProfileData,
  referenceDate: Date = new Date(),
): BudgetMetrics {
  const year = referenceDate.getFullYear();
  const monthIndex = referenceDate.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const dayOfMonth = Math.min(Math.max(1, referenceDate.getDate()), daysInMonth);
  const daysRemaining = Math.max(1, daysInMonth - dayOfMonth + 1);
  const monthPrefix = getMonthPrefix(referenceDate);

  let liquidCash = 0;
  let vaultTotal = 0;
  let receivables = 0;
  let debt = 0;
  let netWorth = 0;

  for (const acc of data.accounts) {
    netWorth += acc.balance;
    const kind: AccountKind = acc.kind;
    if (kind === 'cash' || kind === 'bank') {
      liquidCash += acc.balance;
    } else if (kind === 'vault') {
      vaultTotal += acc.balance;
    } else if (kind === 'card') {
      if (acc.balance < 0) debt += Math.abs(acc.balance);
      else liquidCash += acc.balance;
    } else if (kind === 'receivable') {
      receivables += acc.balance;
    } else if (kind === 'debt') {
      debt += Math.abs(acc.balance);
    }
  }

  const monthTransactions = data.transactions.filter((tx) => tx.date.startsWith(monthPrefix));

  let monthlyIncome = 0;
  let monthlySpend = 0;
  const spentByEnvelope: Record<string, number> = {};

  for (const tx of monthTransactions) {
    if (tx.type === 'income') {
      monthlyIncome += tx.amount;
    } else if (tx.type === 'spend') {
      monthlySpend += tx.amount;
      if (tx.splits.length > 0) {
        for (const split of tx.splits) {
          spentByEnvelope[split.envelopeId] = (spentByEnvelope[split.envelopeId] ?? 0) + split.amount;
        }
      }
    }
  }

  const envelopeSummaries: EnvelopeSummary[] = data.envelopes.map((envelope) => {
    const spent = spentByEnvelope[envelope.id] ?? 0;
    const remaining = envelope.assigned - spent;
    const percentUsed =
      envelope.assigned > 0 ? Math.round((spent / envelope.assigned) * 100) : spent > 0 ? 100 : 0;
    return {
      envelope,
      spent,
      remaining,
      percentUsed,
      isOverspent: spent > envelope.assigned,
    };
  });

  const overspentEnvelopes = envelopeSummaries.filter((e) => e.isOverspent);
  const budgetAlerts: BudgetAlert[] = envelopeSummaries
    .filter((s) => s.envelope.assigned > 0 && s.percentUsed >= 80)
    .map((s): BudgetAlert => {
      const isCritical = s.percentUsed >= 100 || s.isOverspent;
      return {
        envelopeId: s.envelope.id,
        envelopeName: s.envelope.name,
        severity: isCritical ? 'critical' : 'warning',
        threshold: isCritical ? 100 : 80,
        percentUsed: s.percentUsed,
        spent: s.spent,
        assigned: s.envelope.assigned,
        remaining: s.remaining,
      };
    })
    .sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
      return b.percentUsed - a.percentUsed;
    });

  const totalAssigned = data.envelopes.reduce((sum, env) => sum + env.assigned, 0);
  const unassignedCash = liquidCash - totalAssigned;

  const dailyLivingSummaries = envelopeSummaries.filter(
    (s) => s.envelope.group === 'daily_living',
  );
  const dailyLivingAssigned = dailyLivingSummaries.reduce((sum, s) => sum + s.envelope.assigned, 0);
  const dailyLivingSpent = dailyLivingSummaries.reduce((sum, s) => sum + s.spent, 0);
  const dailyLivingRemaining = Math.max(0, dailyLivingAssigned - dailyLivingSpent);

  const safeDailyPace =
    dailyLivingRemaining > 0
      ? Math.round(dailyLivingRemaining / daysRemaining)
      : Math.max(0, Math.round((totalAssigned - monthlySpend) / daysRemaining));

  const recurringProjection = calculateRemainingMonthRecurring(
    data.recurringTransactions ?? [],
    referenceDate,
  );
  const upcomingRecurringIncome = recurringProjection.upcomingIncome;
  const upcomingRecurringSpend = recurringProjection.upcomingBills;

  const actualDailyBurnRate = Math.round(dailyLivingSpent / dayOfMonth);
  const baseProjectedSpend = Math.round((monthlySpend / dayOfMonth) * daysInMonth);
  const projectedMonthEndSpend = baseProjectedSpend + upcomingRecurringSpend;
  const projectedMonthEndBalance = Math.round(
    liquidCash +
      upcomingRecurringIncome -
      Math.max(0, projectedMonthEndSpend - monthlySpend),
  );

  const trackedDebtTotal = (data.debts ?? []).reduce(
    (sum, item) => sum + Math.max(0, item.currentBalance),
    0,
  );

  const monthlyNetSavings = monthlyIncome - monthlySpend;
  const monthlySavingsGoal = data.monthlySavingsGoal ?? 0;
  const savingsRatePercent =
    monthlyIncome > 0 ? Math.round((monthlyNetSavings / monthlyIncome) * 100) : 0;

  // Zero-Based Budget Health Score (0-100)
  let score = 100;
  score -= Math.min(45, overspentEnvelopes.length * 18);
  if (unassignedCash < 0) {
    score -= 25;
  } else if (liquidCash > 0 && unassignedCash > liquidCash * 0.6 && totalAssigned === 0) {
    score -= 20;
  }
  const savingsAssigned = data.envelopes
    .filter((e) => e.group === 'savings')
    .reduce((sum, e) => sum + e.assigned, 0);
  if (totalAssigned > 0 && savingsAssigned === 0) {
    score -= 8;
  }
  if (dailyLivingAssigned > 0 && dailyLivingSpent > (dailyLivingAssigned / daysInMonth) * dayOfMonth * 1.25) {
    score -= 12;
  }

  const budgetHealthScore = Math.max(0, Math.min(100, Math.round(score)));
  const healthStatus: BudgetMetrics['healthStatus'] =
    overspentEnvelopes.length > 0 || unassignedCash < 0
      ? 'Overspent'
      : budgetHealthScore < 75
        ? 'Tight'
        : 'Balanced';

  return {
    netWorth,
    liquidCash,
    vaultTotal,
    receivables,
    debt,
    trackedDebtTotal,
    totalAssigned,
    unassignedCash,
    monthlyIncome,
    monthlySpend,
    monthlyNetSavings,
    monthlySavingsGoal,
    savingsRatePercent,
    dailyLivingAssigned,
    dailyLivingSpent,
    dailyLivingRemaining,
    daysInMonth,
    dayOfMonth,
    daysRemaining,
    safeDailyPace,
    actualDailyBurnRate,
    upcomingRecurringIncome,
    upcomingRecurringSpend,
    upcomingRecurringEvents: recurringProjection.upcomingEvents,
    projectedMonthEndSpend,
    projectedMonthEndBalance,
    budgetHealthScore,
    healthStatus,
    overspentEnvelopes,
    budgetAlerts,
    envelopeSummaries,
  };
}

export function filterTransactionsByWindow(
  transactions: Transaction[],
  filter: WindowFilterOptions,
): Transaction[] {
  return transactions.filter((tx) => {
    if (filter.accountId !== 'all') {
      const matchesAccount = tx.accountId === filter.accountId || tx.toAccountId === filter.accountId;
      if (!matchesAccount) return false;
    }

    if (filter.windowMode === 'day') {
      return tx.date === filter.dayIso;
    }
    if (filter.windowMode === 'range') {
      const start = filter.rangeStartIso <= filter.rangeEndIso ? filter.rangeStartIso : filter.rangeEndIso;
      const end = filter.rangeStartIso <= filter.rangeEndIso ? filter.rangeEndIso : filter.rangeStartIso;
      return tx.date >= start && tx.date <= end;
    }
    return tx.date.startsWith(filter.monthPrefix);
  });
}

export function buildCategoryBreakdown(
  data: ProfileData,
  referenceDate: Date = new Date(),
  overrideTransactions?: Transaction[],
): CategorySlice[] {
  const monthPrefix = getMonthPrefix(referenceDate);
  const envelopeMap = new Map(data.envelopes.map((e) => [e.id, e]));
  const totals: Record<string, { name: string; value: number }> = {};
  const source = overrideTransactions ?? data.transactions.filter((tx) => tx.date.startsWith(monthPrefix));

  for (const tx of source) {
    if (tx.type !== 'spend') continue;
    if (tx.splits.length === 0) {
      totals.uncategorized = totals.uncategorized ?? { name: 'Uncategorized', value: 0 };
      totals.uncategorized.value += tx.amount;
      continue;
    }
    for (const split of tx.splits) {
      const env = envelopeMap.get(split.envelopeId);
      const key = env?.id ?? 'uncategorized';
      const name = env?.name ?? 'Uncategorized';
      totals[key] = totals[key] ?? { name, value: 0 };
      totals[key].value += split.amount;
    }
  }

  const sorted = Object.entries(totals)
    .map(([id, item]) => ({ id, ...item }))
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value);

  const grandTotal = sorted.reduce((sum, item) => sum + item.value, 0);
  if (grandTotal === 0) return [];

  return sorted.map((item, idx) => ({
    id: item.id,
    name: item.name,
    value: item.value,
    color: CHART_PALETTE[idx % CHART_PALETTE.length],
    percentage: Math.round((item.value / grandTotal) * 100),
  }));
}

export function buildSpendingTrends(
  data: ProfileData,
  referenceDate: Date = new Date(),
  overrideTransactions?: Transaction[],
): WeeklyTrendPoint[] {
  const monthPrefix = getMonthPrefix(referenceDate);
  const envelopeGroupMap = new Map(data.envelopes.map((e) => [e.id, e.group]));
  const source = overrideTransactions ?? data.transactions.filter((tx) => tx.date.startsWith(monthPrefix));

  const buckets: WeeklyTrendPoint[] = [
    { label: 'Wk 1', dailyLiving: 0, fixedExpenses: 0, savingsAndOther: 0, total: 0 },
    { label: 'Wk 2', dailyLiving: 0, fixedExpenses: 0, savingsAndOther: 0, total: 0 },
    { label: 'Wk 3', dailyLiving: 0, fixedExpenses: 0, savingsAndOther: 0, total: 0 },
    { label: 'Wk 4+', dailyLiving: 0, fixedExpenses: 0, savingsAndOther: 0, total: 0 },
  ];

  for (const tx of source) {
    if (tx.type !== 'spend') continue;
    const day = Number(tx.date.slice(8, 10)) || 1;
    const weekIdx = Math.min(3, Math.floor((day - 1) / 7));
    const bucket = buckets[weekIdx];

    if (tx.splits.length === 0) {
      bucket.savingsAndOther += tx.amount;
      bucket.total += tx.amount;
      continue;
    }

    for (const split of tx.splits) {
      const group = envelopeGroupMap.get(split.envelopeId);
      if (group === 'daily_living') {
        bucket.dailyLiving += split.amount;
      } else if (group === 'fixed_expenses') {
        bucket.fixedExpenses += split.amount;
      } else {
        bucket.savingsAndOther += split.amount;
      }
      bucket.total += split.amount;
    }
  }

  return buckets;
}

export function buildMultiMonthTrends(
  transactions: Transaction[],
  monthsCount: 3 | 6 | 'all',
  referenceDate: Date = new Date(),
): MultiMonthTrendPoint[] {
  const map = new Map<string, { income: number; spend: number }>();

  for (const tx of transactions) {
    const mk = tx.date.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(mk)) continue;
    const curr = map.get(mk) ?? { income: 0, spend: 0 };
    if (tx.type === 'income') curr.income += tx.amount;
    else if (tx.type === 'spend') curr.spend += tx.amount;
    map.set(mk, curr);
  }

  let keys: string[];
  if (monthsCount === 'all') {
    keys = Array.from(map.keys()).sort();
    if (keys.length === 0) {
      keys = [getMonthPrefix(referenceDate)];
    }
  } else {
    keys = [];
    for (let offset = monthsCount - 1; offset >= 0; offset--) {
      const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - offset, 1);
      keys.push(getMonthPrefix(d));
    }
  }

  return keys.map((mk) => {
    const [y, m] = mk.split('-').map(Number);
    const label =
      y && m ? new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' }) : mk;
    const entry = map.get(mk) ?? { income: 0, spend: 0 };
    return {
      monthKey: mk,
      label,
      income: entry.income,
      spend: entry.spend,
      savings: entry.income - entry.spend,
    };
  });
}

export function buildDailyVelocitySeries(
  data: ProfileData,
  referenceDate: Date = new Date(),
  overrideTransactions?: Transaction[],
): VelocityPoint[] {
  const year = referenceDate.getFullYear();
  const monthIndex = referenceDate.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const currentDay = Math.min(Math.max(1, referenceDate.getDate()), daysInMonth);
  const monthPrefix = getMonthPrefix(referenceDate);

  const dailyLivingIds = new Set(
    data.envelopes.filter((e) => e.group === 'daily_living').map((e) => e.id),
  );
  const dailyBudgetTotal = data.envelopes
    .filter((e) => e.group === 'daily_living')
    .reduce((sum, e) => sum + e.assigned, 0);

  const source = overrideTransactions ?? data.transactions.filter((tx) => tx.date.startsWith(monthPrefix));
  const spendByDay: Record<number, number> = {};
  for (const tx of source) {
    if (tx.type !== 'spend') continue;
    const day = Number(tx.date.slice(8, 10));
    if (!day) continue;
    const dailySpend =
      tx.splits.length > 0
        ? tx.splits.filter((s) => dailyLivingIds.has(s.envelopeId)).reduce((sum, s) => sum + s.amount, 0)
        : tx.amount;
    spendByDay[day] = (spendByDay[day] ?? 0) + dailySpend;
  }

  const points: VelocityPoint[] = [];
  let running = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const daySpend = spendByDay[day] ?? 0;
    running += daySpend;
    const ideal = Math.round((dailyBudgetTotal / daysInMonth) * day);
    const windowDays = [
      spendByDay[day - 2] ?? 0,
      spendByDay[day - 1] ?? 0,
      daySpend,
    ];
    const windowCount = Math.min(3, day);
    const rolling = Math.round(windowDays.slice(3 - windowCount).reduce((s, v) => s + v, 0) / windowCount);

    points.push({
      day,
      label: `${day}`,
      actualDaily: day <= currentDay ? daySpend : null,
      rolling3DayAvg: day <= currentDay ? rolling : null,
      actualCumulative: day <= currentDay ? running : null,
      idealCumulative: ideal,
    });
  }

  return points;
}

export function buildCalendarDays(
  data: ProfileData,
  year: number,
  monthIndex: number,
  accountFilter: string = 'all',
): CalendarDayCell[] {
  const firstDay = new Date(year, monthIndex, 1);
  const startWeekday = firstDay.getDay(); // 0 = Sun
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const dailyTarget = Math.max(
    1,
    data.envelopes
      .filter((e) => e.group === 'daily_living')
      .reduce((sum, e) => sum + (e.dailyHabitTarget ?? Math.round(e.assigned / daysInMonth)), 0),
  );

  const filteredTransactions =
    accountFilter === 'all'
      ? data.transactions
      : data.transactions.filter(
          (tx) => tx.accountId === accountFilter || tx.toAccountId === accountFilter,
        );

  const cells: CalendarDayCell[] = [];

  for (let i = 0; i < startWeekday; i++) {
    const prevDate = new Date(year, monthIndex, i - startWeekday + 1);
    const iso = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
    cells.push({
      dateIso: iso,
      dayNumber: prevDate.getDate(),
      inCurrentMonth: false,
      totalSpend: 0,
      totalIncome: 0,
      intensity: 'none',
      transactions: [],
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const txs = filteredTransactions.filter((tx) => tx.date === iso);
    const totalSpend = txs.filter((t) => t.type === 'spend').reduce((s, t) => s + t.amount, 0);
    const totalIncome = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);

    let intensity: CalendarIntensity = 'none';
    if (totalSpend > 0) {
      const ratio = totalSpend / dailyTarget;
      if (ratio <= 0.6) intensity = 'low';
      else if (ratio <= 1.15) intensity = 'moderate';
      else if (ratio <= 2.2) intensity = 'high';
      else intensity = 'peak';
    }

    cells.push({
      dateIso: iso,
      dayNumber: day,
      inCurrentMonth: true,
      totalSpend,
      totalIncome,
      intensity,
      transactions: txs,
    });
  }

  return cells;
}

export function buildCalendarSummaryStats(cells: CalendarDayCell[]): CalendarSummaryStats {
  const monthCells = cells.filter((c) => c.inCurrentMonth);
  const spendDays = monthCells.filter((c) => c.totalSpend > 0);
  const monthTotalSpent = spendDays.reduce((s, c) => s + c.totalSpend, 0);
  const avgPerActiveDay = spendDays.length > 0 ? Math.round(monthTotalSpent / spendDays.length) : 0;
  const highSpendDays = monthCells.filter(
    (c) => c.intensity === 'high' || c.intensity === 'peak',
  ).length;

  let peakSpendingDay: CalendarSummaryStats['peakSpendingDay'] = null;
  for (const c of spendDays) {
    if (!peakSpendingDay || c.totalSpend > peakSpendingDay.amount) {
      peakSpendingDay = { dateIso: c.dateIso, amount: c.totalSpend };
    }
  }

  return {
    monthTotalSpent,
    avgPerActiveDay,
    highSpendDays,
    peakSpendingDay,
  };
}

export function buildDailyPaceInsights(
  data: ProfileData,
  referenceDate: Date = new Date(),
): PaceInsights {
  const year = referenceDate.getFullYear();
  const monthIndex = referenceDate.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const currentDay = Math.min(Math.max(1, referenceDate.getDate()), daysInMonth);
  const monthPrefix = getMonthPrefix(referenceDate);

  const dailyEnvelopes = data.envelopes.filter((e) => e.group === 'daily_living');
  const dailyIds = new Set(dailyEnvelopes.map((e) => e.id));
  const configuredDailyTarget = dailyEnvelopes.reduce(
    (sum, e) => sum + (e.dailyHabitTarget ?? Math.round(e.assigned / daysInMonth)),
    0,
  );
  const dailyTarget = Math.max(100, configuredDailyTarget);

  const spendByDay: Record<number, number> = {};
  for (const tx of data.transactions) {
    if (tx.type !== 'spend' || !tx.date.startsWith(monthPrefix)) continue;
    const day = Number(tx.date.slice(8, 10));
    if (!day) continue;
    const dailyPortion =
      tx.splits.length > 0
        ? tx.splits.filter((s) => dailyIds.has(s.envelopeId)).reduce((sum, s) => sum + s.amount, 0)
        : tx.amount;
    spendByDay[day] = (spendByDay[day] ?? 0) + dailyPortion;
  }

  const rows: DailyTrackerRow[] = [];
  let cumulativeCushion = 0;
  let weekdaySpendSum = 0;
  let weekdayCount = 0;
  let weekendSpendSum = 0;
  let weekendCount = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateIso = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const weekday = getWeekdayShort(dateIso);
    const isFuture = day > currentDay;
    const spent = spendByDay[day] ?? 0;
    const diff = dailyTarget - spent;
    if (!isFuture) {
      cumulativeCushion += diff;
      const dow = new Date(year, monthIndex, day).getDay();
      if (dow === 0 || dow === 6) {
        weekendSpendSum += spent;
        weekendCount += 1;
      } else {
        weekdaySpendSum += spent;
        weekdayCount += 1;
      }
    }

    rows.push({
      dayNumber: day,
      dateIso,
      weekday,
      target: dailyTarget,
      spent,
      diff,
      cumulativeCushion: isFuture ? 0 : cumulativeCushion,
      isFuture,
    });
  }

  let streakDays = 0;
  for (let day = currentDay; day >= 1; day--) {
    const row = rows[day - 1];
    if (row && row.spent <= row.target) {
      streakDays += 1;
    } else {
      break;
    }
  }

  const metrics = computeBudgetMetrics(data, referenceDate);
  const daysRemaining = Math.max(1, daysInMonth - currentDay + 1);
  const adaptiveDailyRate = Math.max(0, Math.round(metrics.dailyLivingRemaining / daysRemaining));

  const weekdayAvg = weekdayCount > 0 ? Math.round(weekdaySpendSum / weekdayCount) : 0;
  const weekendAvg = weekendCount > 0 ? Math.round(weekendSpendSum / weekendCount) : 0;

  const avgDailyTotalBurn = Math.max(1, Math.round(metrics.monthlySpend / currentDay));
  const bufferRunwayDays =
    metrics.dailyLivingRemaining > 0
      ? Math.round(metrics.dailyLivingRemaining / Math.max(1, metrics.actualDailyBurnRate || dailyTarget))
      : 0;
  const totalCashRunwayDays = Math.max(
    0,
    Math.round((metrics.liquidCash + metrics.vaultTotal) / avgDailyTotalBurn),
  );

  const fixedEssentialTotal = data.envelopes
    .filter((e) => e.group !== 'savings' && e.isEssential)
    .reduce((sum, e) => sum + e.assigned, 0);
  const monthlyEssentialRunRate = Math.max(1, fixedEssentialTotal || metrics.dailyLivingAssigned);

  const emergencyReserveTotal =
    metrics.vaultTotal +
    data.envelopes
      .filter((e) => e.group === 'savings')
      .reduce((sum, e) => sum + e.assigned, 0);
  const emergencyMonthsCovered =
    Math.round((emergencyReserveTotal / monthlyEssentialRunRate) * 10) / 10;

  return {
    rows,
    streakDays,
    adaptiveDailyRate,
    weekdayAvg,
    weekendAvg,
    bufferRunwayDays,
    totalCashRunwayDays,
    monthlyEssentialRunRate,
    emergencyReserveTotal,
    emergencyMonthsCovered,
  };
}
