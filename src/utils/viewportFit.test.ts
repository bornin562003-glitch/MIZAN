import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeViewportFit,
  DESKTOP_LOGICAL_HEIGHT,
  DESKTOP_LOGICAL_WIDTH,
  MOBILE_LOGICAL_HEIGHT,
  MOBILE_LOGICAL_WIDTH,
} from './viewportFit';

test('auto mode remains unframed at 100% scale', () => {
  const res = computeViewportFit({ mode: 'auto', windowWidth: 1440, windowHeight: 900 });
  assert.equal(res.framed, false);
  assert.equal(res.scale, 1);
});

test('mobile mode fits 390x844 phone frame cleanly inside 1440x900 desktop screen', () => {
  const res = computeViewportFit({ mode: 'mobile', windowWidth: 1440, windowHeight: 900 });
  assert.equal(res.framed, true);
  assert.equal(res.frameWidth, MOBILE_LOGICAL_WIDTH);
  assert.equal(res.frameHeight, MOBILE_LOGICAL_HEIGHT);
  assert.ok(res.frameWidth * res.scale <= 1440);
  assert.ok(res.frameHeight * res.scale <= 900 - 44);
});

test('mobile mode renders unframed on actual 390x844 mobile viewport', () => {
  const res = computeViewportFit({ mode: 'mobile', windowWidth: 390, windowHeight: 844 });
  assert.equal(res.framed, false);
  assert.equal(res.scale, 1);
});

test('desktop mode scales 1280x800 16:10 stage proportionately inside 390x844 mobile screen', () => {
  const res = computeViewportFit({ mode: 'desktop', windowWidth: 390, windowHeight: 844 });
  assert.equal(res.framed, true);
  assert.equal(res.frameWidth, DESKTOP_LOGICAL_WIDTH);
  assert.equal(res.frameHeight, DESKTOP_LOGICAL_HEIGHT);
  assert.ok(res.scale > 0.25 && res.scale < 0.35);
  assert.ok(res.frameWidth * res.scale <= 390);
  assert.ok(res.frameHeight * res.scale <= 844);
});
