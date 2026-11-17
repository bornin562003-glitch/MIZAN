import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDebtAnalytics,
  computePortfolioDebtSummary,
  simulateDebtPayoff,
} from './debtEngine';
import { DebtItem } from '../types/finance';

test('simulateDebtPayoff handles 0% APR and standard APR amortization accurately', () => {
  const refDate = new Date(2026, 0, 1); // Jan 2026

  const zeroApr = simulateDebtPayoff(12000, 0, 1000, refDate);
  assert.equal(zeroApr.canPayOff, true);
  assert.equal(zeroApr.monthsToPayoff, 12);
  assert.equal(zeroApr.totalProjectedInterest, 0);
  assert.equal(zeroApr.expectedPayoffIso, '2027-01');

  const withInterest = simulateDebtPayoff(100000, 12, 10000, refDate);
  assert.equal(withInterest.canPayOff, true);
  assert.equal(withInterest.monthsToPayoff, 11);
  assert.ok(withInterest.totalProjectedInterest > 5000);
});

test('simulateDebtPayoff guards against monthly payment <= monthly interest charge', () => {
  // 100,000 at 24% APR = 2,000 interest/month
  const stalled = simulateDebtPayoff(100000, 24, 1500);
  assert.equal(stalled.canPayOff, false);
  assert.equal(stalled.monthsToPayoff, Infinity);
  assert.equal(stalled.expectedPayoffIso, null);
});

test('computeDebtAnalytics and computePortfolioDebtSummary calculate extra-payment savings', () => {
  const debts: DebtItem[] = [
    {
      id: 'd1',
      name: 'Auto Loan',
      lender: 'Bank A',
      principalOriginal: 200000,
      currentBalance: 100000,
      annualInterestRate: 12,
      monthlyPayment: 10000,
      createdAt: '',
    },
    {
      id: 'd2',
      name: 'Device Installment',
      lender: 'Store',
      principalOriginal: 40000,
      currentBalance: 20000,
      annualInterestRate: 0,
      monthlyPayment: 5000,
      createdAt: '',
    },
  ];

  const analytics = computeDebtAnalytics(debts[0], 5000, new Date(2026, 0, 1));
  assert.equal(analytics.repaidAmount, 100000);
  assert.equal(analytics.repaidPercent, 50);
  assert.equal(analytics.monthlyInterestCharge, 1000);
  assert.equal(analytics.principalPortionNextMonth, 9000);
  assert.ok(analytics.monthsSaved > 0);
  assert.ok(analytics.interestSaved > 0);

  const summary = computePortfolioDebtSummary(debts, 5000, new Date(2026, 0, 1));
  assert.equal(summary.totalRemainingBalance, 120000);
  assert.equal(summary.totalRepaid, 120000);
  assert.equal(summary.overallRepaidPercent, 50);
  assert.equal(summary.weightedApr, 10);
  assert.equal(summary.totalMonthlyCommitment, 15000);
  assert.ok(summary.totalInterestSavedWithExtra > 0);
});
