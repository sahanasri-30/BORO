import test from 'node:test';
import assert from 'node:assert/strict';
import { safeBookingStatus } from './bookingPresentation.js';

test('booking presentation tolerates absent or malformed status values', () => {
  assert.equal(safeBookingStatus(undefined), 'UNKNOWN');
  assert.equal(safeBookingStatus(null), 'UNKNOWN');
  assert.equal(safeBookingStatus(''), 'UNKNOWN');
  assert.equal(safeBookingStatus(42), 'UNKNOWN');
});

test('booking presentation preserves valid lifecycle statuses', () => {
  assert.equal(safeBookingStatus('PICKUP_READY'), 'PICKUP_READY');
  assert.equal(safeBookingStatus('COMPLETED'), 'COMPLETED');
});
