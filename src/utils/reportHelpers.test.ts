import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeedDataForProfile } from '../store/seedData';
import { buildMonthlyReportData, getAvailableReportMonths } from './reportHelpers';

test('getAvailableReportMonths always includes reference month and sorts descending', () => {
  const data = createSeedDataForProfile('personal');
  const months = getAvailableReportMonths(data, new Date('2026-11-17T00:00:00Z'));
  assert.ok(months.includes('2026-11'));
  assert.equal(months[0], '2026-11');
});

test('buildMonthlyReportData isolates transactions to selected YYYY-MM and computes net cash flow', () => {
  const data = createSeedDataForProfile('personal');
  data.transactions.push({
    id: 'tx-prev-month',
    type: 'spend',
    amount: 9999,
    date: '2026-10-15',
    merchant: 'Prior Month Merchant',
    accountId: data.accounts[0].id,
    splits: [{ id: 's-prev', envelopeId: data.envelopes[0].id, amount: 9999 }],
    tags: [],
    createdAt: '2026-10-15T10:00:00Z',
  });

  const novReport = buildMonthlyReportData(data, '2026-11');
  const octReport = buildMonthlyReportData(data, '2026-10');

  assert.equal(novReport.monthLabel, 'November 2026');
  assert.equal(novReport.transactions.some((t) => t.id === 'tx-prev-month'), false);
  assert.equal(novReport.netCashFlow, novReport.monthlyInflow - novReport.monthlyOutflow);

  assert.equal(octReport.transactions.length, 1);
  assert.equal(octReport.monthlyOutflow, 9999);
});
