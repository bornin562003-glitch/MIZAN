import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPin, syncHashPin, verifyPin } from './pinCrypto';
import { createSeedDataForProfile } from '../store/seedData';

test('verifyPin succeeds with matching 4-digit PIN and rejects mismatch', async () => {
  const hash = await hashPin('4829');
  assert.equal(await verifyPin('4829', hash), true);
  assert.equal(await verifyPin('0000', hash), false);
});

test('syncHashPin verifies default Family demo PIN 1234', async () => {
  const hash = syncHashPin('1234');
  assert.equal(await verifyPin('1234', hash), true);
  assert.equal(await verifyPin('9999', hash), false);
});

test('profile seed datasets are strictly isolated by profileId', () => {
  const personal = createSeedDataForProfile('personal');
  const family = createSeedDataForProfile('family');
  const business = createSeedDataForProfile('business');

  assert.equal(personal.profileId, 'personal');
  assert.equal(family.profileId, 'family');
  assert.equal(business.profileId, 'business');
  assert.notEqual(personal.accounts[0].id, family.accounts[0].id);
  assert.notEqual(family.accounts[0].id, business.accounts[0].id);
});
