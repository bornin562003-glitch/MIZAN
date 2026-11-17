import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCalendarDays,
  buildCalendarSummaryStats,
  buildCategoryBreakdown,
  buildDailyPaceInsights,
  buildDailyVelocitySeries,
  buildMultiMonthTrends,
  buildSpendingTrends,
  computeBudgetMetrics,
  filterTransactionsByWindow,
} from './budgetEngine';
import { createSeedDataForProfile } from '../store/seedData';
import { ProfileData } from '../types/finance';

test('computeBudgetMetrics calculates Net Worth, Vaults, Assigned, and Safe Daily Pace accurately', () => {
  const now = new Date();
  const data = createSeedDataForProfile('personal');
  const metrics = computeBudgetMetrics(data, now);

  assert.equal(metrics.netWorth, 365000);
  assert.equal(metrics.vaultTotal, 95000);
  assert.equal(metrics.totalAssigned, 153500);
  assert.equal(metrics.liquidCash, 261500);
  assert.equal(metrics.unassignedCash, 108000);
  assert.ok(metrics.safeDailyPace > 0);
  assert.equal(metrics.overspentEnvelopes.length, 0);
  assert.equal(metrics.healthStatus, 'Balanced');
});

test('computeBudgetMetrics flags overspent envelopes and drops Budget Health Score', () => {
  const refDate = new Date(2026, 10, 15); // 2026-11-15
  const overspentProfile: ProfileData = {
    profileId: 'test',
    monthlyIncomeTarget: 50000,
    accounts: [{ id: 'a1', name: 'Bank', kind: 'bank', balance: 40000, updatedAt: '' }],
    envelopes: [
      { id: 'e1', name: 'Food', group: 'daily_living', assigned: 5000, isEssential: true },
    ],
    transactions: [
      {
        id: 't1',
        type: 'spend',
        amount: 8500,
        date: '2026-11-10',
        merchant: 'Grocery Run',
        accountId: 'a1',
        splits: [{ id: 's1', envelopeId: 'e1', amount: 8500 }],
        tags: [],
        createdAt: '',
      },
    ],
    reflections: {},
  };

  const metrics = computeBudgetMetrics(overspentProfile, refDate);
  assert.equal(metrics.overspentEnvelopes.length, 1);
  assert.equal(metrics.overspentEnvelopes[0].envelope.name, 'Food');
  assert.equal(metrics.healthStatus, 'Overspent');
  assert.ok(metrics.budgetHealthScore < 90);
});

test('chart builders produce non-empty category slices, 4 weekly trend buckets, and full month velocity', () => {
  const now = new Date();
  const data = createSeedDataForProfile('personal');

  const categories = buildCategoryBreakdown(data, now);
  assert.ok(categories.length > 0);
  const pctSum = categories.reduce((s, c) => s + c.percentage, 0);
  assert.ok(pctSum >= 98 && pctSum <= 102);

  const trends = buildSpendingTrends(data, now);
  assert.equal(trends.length, 4);

  const velocity = buildDailyVelocitySeries(data, now);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  assert.equal(velocity.length, daysInMonth);

  const multi = buildMultiMonthTrends(data.transactions, 3, now);
  assert.equal(multi.length, 3);
});

test('buildCalendarDays and buildCalendarSummaryStats compute intensity and peak day', () => {
  const now = new Date();
  const data = createSeedDataForProfile('personal');
  const cells = buildCalendarDays(data, now.getFullYear(), now.getMonth());
  const currentMonthCells = cells.filter((c) => c.inCurrentMonth);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  assert.equal(currentMonthCells.length, daysInMonth);

  const stats = buildCalendarSummaryStats(cells);
  assert.ok(stats.monthTotalSpent > 0);
  assert.ok(stats.peakSpendingDay !== null);
});

test('filterTransactionsByWindow scopes by account and day/range/month', () => {
  const data = createSeedDataForProfile('personal');
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const walletOnly = filterTransactionsByWindow(data.transactions, {
    accountId: 'per-wallet',
    windowMode: 'month',
    dayIso: `${monthPrefix}-01`,
    rangeStartIso: `${monthPrefix}-01`,
    rangeEndIso: `${monthPrefix}-28`,
    monthPrefix,
  });
  assert.ok(walletOnly.length > 0);
  assert.ok(walletOnly.every((t) => t.accountId === 'per-wallet'));
});

test('buildDailyPaceInsights computes daily rows, streak, and emergency runway', () => {
  const data = createSeedDataForProfile('personal');
  const insights = buildDailyPaceInsights(data, new Date());
  assert.ok(insights.rows.length >= 28);
  assert.ok(insights.adaptiveDailyRate >= 0);
  assert.ok(insights.emergencyMonthsCovered > 0);
});

test('vault balances increase netWorth while preserving spendable liquidCash', () => {
  const data = createSeedDataForProfile('personal');
  const before = computeBudgetMetrics(data, new Date());
  data.accounts.push({
    id: 'vault-gold',
    name: 'Gold Reserve Vault',
    kind: 'vault',
    balance: 50000,
    updatedAt: '',
  });
  const after = computeBudgetMetrics(data, new Date());
  assert.equal(after.netWorth, before.netWorth + 50000);
  assert.equal(after.liquidCash, before.liquidCash);
});

test('computeBudgetMetrics emits 80% warning and 100% critical budgetAlerts', () => {
  const refDate = new Date(2026, 4, 15); // 2026-05-15
  const profile: ProfileData = {
    profileId: 'alert-test',
    monthlyIncomeTarget: 100000,
    accounts: [{ id: 'a1', name: 'Bank', kind: 'bank', balance: 100000, updatedAt: '' }],
    envelopes: [
      { id: 'e-warn', name: 'Dining', group: 'daily_living', assigned: 10000, isEssential: false },
      { id: 'e-crit', name: 'Fuel', group: 'daily_living', assigned: 10000, isEssential: true },
      { id: 'e-ok', name: 'Savings', group: 'savings', assigned: 20000, isEssential: false },
    ],
    transactions: [
      {
        id: 't1',
        type: 'spend',
        amount: 8500,
        date: '2026-05-05',
        merchant: 'Cafe',
        accountId: 'a1',
        splits: [{ id: 's1', envelopeId: 'e-warn', amount: 8500 }],
        tags: [],
        createdAt: '',
      },
      {
        id: 't2',
        type: 'spend',
        amount: 10000,
        date: '2026-05-06',
        merchant: 'Pump',
        accountId: 'a1',
        splits: [{ id: 's2', envelopeId: 'e-crit', amount: 10000 }],
        tags: [],
        createdAt: '',
      },
    ],
    reflections: {},
  };

  const metrics = computeBudgetMetrics(profile, refDate);
  assert.equal(metrics.budgetAlerts.length, 2);
  assert.equal(metrics.budgetAlerts[0].envelopeId, 'e-crit');
  assert.equal(metrics.budgetAlerts[0].severity, 'critical');
  assert.equal(metrics.budgetAlerts[0].threshold, 100);
  assert.equal(metrics.budgetAlerts[1].envelopeId, 'e-warn');
  assert.equal(metrics.budgetAlerts[1].severity, 'warning');
  assert.equal(metrics.budgetAlerts[1].threshold, 80);
});

test('computeBudgetMetrics folds upcoming recurring bills and salary into projections', () => {
  const refDate = new Date(2026, 4, 15); // 2026-05-15
  const base: ProfileData = {
    profileId: 'proj-test',
    monthlyIncomeTarget: 100000,
    accounts: [{ id: 'a1', name: 'Bank', kind: 'bank', balance: 50000, updatedAt: '' }],
    envelopes: [{ id: 'e1', name: 'Bills', group: 'fixed_expenses', assigned: 10000, isEssential: true }],
    transactions: [],
    recurringTransactions: [],
    reflections: {},
  };

  const withoutRec = computeBudgetMetrics(base, refDate);
  const withRec = computeBudgetMetrics(
    {
      ...base,
      recurringTransactions: [
        {
          id: 'r-in',
          title: 'Salary',
          type: 'income',
          amount: 40000,
          frequency: 'monthly',
          accountId: 'a1',
          nextRunDate: '2026-05-25',
          active: true,
          autoPost: true,
        },
        {
          id: 'r-out',
          title: 'Rent',
          type: 'spend',
          amount: 12000,
          frequency: 'monthly',
          accountId: 'a1',
          envelopeId: 'e1',
          nextRunDate: '2026-05-26',
          active: true,
          autoPost: true,
        },
      ],
    },
    refDate,
  );

  assert.equal(withRec.upcomingRecurringIncome, 40000);
  assert.equal(withRec.upcomingRecurringSpend, 12000);
  assert.equal(withRec.projectedMonthEndSpend, withoutRec.projectedMonthEndSpend + 12000);
  assert.equal(withRec.projectedMonthEndBalance, withoutRec.projectedMonthEndBalance + 40000 - 12000);
});

