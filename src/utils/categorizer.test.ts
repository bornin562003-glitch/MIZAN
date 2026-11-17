import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDailyHabitHeatmap,
  simulateOcrReceiptParse,
  suggestCategorization,
  validateSplits,
} from './categorizer';
import { createSeedDataForProfile } from '../store/seedData';

test('suggestCategorization matches Shell and PSO to Fuel & Commute', () => {
  const data = createSeedDataForProfile('personal');
  const shell = suggestCategorization('Shell Station DHA', data.envelopes);
  const pso = suggestCategorization('PSO Highway Pump', data.envelopes);
  const bakery = suggestCategorization('Roastery Coffee & Bakery', data.envelopes);

  assert.equal(shell.matchedRule, true);
  assert.equal(shell.envelopeId, 'env-commute');
  assert.equal(pso.envelopeId, 'env-commute');
  assert.equal(bakery.envelopeId, 'env-food');
});

test('validateSplits enforces exact split sum matching total amount', () => {
  const ok = validateSplits(1000, [
    { id: '1', envelopeId: 'env-food', amount: 700 },
    { id: '2', envelopeId: 'env-household', amount: 300 },
  ]);
  assert.equal(ok.valid, true);
  assert.equal(ok.difference, 0);

  const mismatch = validateSplits(1000, [
    { id: '1', envelopeId: 'env-food', amount: 650 },
    { id: '2', envelopeId: 'env-household', amount: 300 },
  ]);
  assert.equal(mismatch.valid, false);
  assert.equal(mismatch.difference, 50);
});

test('simulateOcrReceiptParse extracts line items mapped to existing envelopes', () => {
  const data = createSeedDataForProfile('personal');
  const parsed = simulateOcrReceiptParse('handwritten-diary.jpg', data.envelopes, '2026-11-17');
  assert.equal(parsed.merchant, 'Handwritten Daily Diary');
  assert.equal(parsed.items.length, 3);
  assert.ok(parsed.items.every((item) => item.envelopeId.length > 0 && item.amount > 0));
});

test('buildDailyHabitHeatmap classifies days into none/safe/moderate/high statuses', () => {
  const data = createSeedDataForProfile('personal');
  const heatmap = buildDailyHabitHeatmap(data, new Date());
  assert.ok(heatmap.length >= 28);
  assert.ok(heatmap.some((d) => d.status !== 'none'));
});
