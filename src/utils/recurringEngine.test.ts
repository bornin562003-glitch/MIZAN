import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceRecurringDate,
  calculateRemainingMonthRecurring,
  processDueRecurringTransactions,
} from './recurringEngine';
import { ProfileData } from '../types/finance';

test('advanceRecurringDate advances daily, weekly, and monthly with month-end clamping', () => {
  assert.equal(advanceRecurringDate('2026-03-10', 'daily'), '2026-03-11');
  assert.equal(advanceRecurringDate('2026-03-10', 'weekly'), '2026-03-17');
  assert.equal(advanceRecurringDate('2026-01-31', 'monthly'), '2026-02-28');
  assert.equal(advanceRecurringDate('2024-01-31', 'monthly'), '2024-02-29'); // leap year
});

test('processDueRecurringTransactions auto-posts due active rules and updates account balances', () => {
  const data: ProfileData = {
    profileId: 'test',
    monthlyIncomeTarget: 100000,
    accounts: [{ id: 'bank-1', name: 'Bank', kind: 'bank', balance: 50000, updatedAt: '' }],
    envelopes: [{ id: 'env-bills', name: 'Bills', group: 'fixed_expenses', assigned: 10000, isEssential: true }],
    transactions: [],
    recurringTransactions: [
      {
        id: 'rec-salary',
        title: 'Monthly Salary',
        type: 'income',
        amount: 25000,
        frequency: 'monthly',
        accountId: 'bank-1',
        nextRunDate: '2026-05-01',
        active: true,
        autoPost: true,
        tags: ['salary'],
      },
      {
        id: 'rec-net',
        title: 'Fiber Internet',
        type: 'spend',
        amount: 4000,
        frequency: 'weekly',
        accountId: 'bank-1',
        envelopeId: 'env-bills',
        nextRunDate: '2026-05-01',
        active: true,
        autoPost: true,
        tags: ['bill'],
      },
      {
        id: 'rec-paused',
        title: 'Paused Gym',
        type: 'spend',
        amount: 3000,
        frequency: 'monthly',
        accountId: 'bank-1',
        nextRunDate: '2026-05-01',
        active: false,
        autoPost: true,
      },
    ],
    reflections: {},
  };

  // On 2026-05-10: Salary runs once (May 1 -> Jun 1), Fiber runs twice (May 1, May 8 -> May 15), Paused is skipped
  const { updatedData, postedTransactions } = processDueRecurringTransactions(data, '2026-05-10');

  assert.equal(postedTransactions.length, 3);
  assert.equal(updatedData.transactions.length, 3);
  // 50000 + 25000 - 4000 - 4000 = 67000
  assert.equal(updatedData.accounts[0].balance, 67000);

  const salaryRule = updatedData.recurringTransactions?.find((r) => r.id === 'rec-salary');
  const fiberRule = updatedData.recurringTransactions?.find((r) => r.id === 'rec-net');
  assert.equal(salaryRule?.nextRunDate, '2026-06-01');
  assert.equal(salaryRule?.lastRunDate, '2026-05-01');
  assert.equal(fiberRule?.nextRunDate, '2026-05-15');
  assert.equal(fiberRule?.lastRunDate, '2026-05-08');
});

test('calculateRemainingMonthRecurring projects remaining monthly inflows and outflows accurately', () => {
  const refDate = new Date(2026, 4, 15); // May 15, 2026
  const projection = calculateRemainingMonthRecurring(
    [
      {
        id: 'r1',
        title: 'Weekly Allowance',
        type: 'spend',
        amount: 1000,
        frequency: 'weekly',
        accountId: 'a1',
        nextRunDate: '2026-05-18', // May 18, May 25 -> 2 occurrences left in May
        active: true,
        autoPost: true,
      },
      {
        id: 'r2',
        title: 'End-of-Month Bonus',
        type: 'income',
        amount: 15000,
        frequency: 'monthly',
        accountId: 'a1',
        nextRunDate: '2026-05-28', // May 28 -> 1 occurrence left
        active: true,
        autoPost: true,
      },
    ],
    refDate,
  );

  assert.equal(projection.upcomingIncome, 15000);
  assert.equal(projection.upcomingBills, 2000);
  assert.equal(projection.upcomingNet, 13000);
  assert.equal(projection.upcomingEvents.length, 3);
});
