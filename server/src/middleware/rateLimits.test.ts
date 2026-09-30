import test from 'node:test';
import assert from 'node:assert/strict';
import {isBookingFlowPath,shouldApplyGeneralApiLimit} from './rateLimits.js';

test('general API throttling leaves health and auth endpoints to their own handling',()=>{
  assert.equal(shouldApplyGeneralApiLimit('/health'),false);
  assert.equal(shouldApplyGeneralApiLimit('/auth/login'),false);
  assert.equal(shouldApplyGeneralApiLimit('/auth/register'),false);
  assert.equal(shouldApplyGeneralApiLimit('/equipment/asset-1/availability'),false);
  assert.equal(shouldApplyGeneralApiLimit('/bookings/check-availability'),false);
  assert.equal(shouldApplyGeneralApiLimit('/bookings'),false);
  assert.equal(shouldApplyGeneralApiLimit('/equipment'),true);
});

test('booking and availability routes remain inside a separate bounded rate limit',()=>{
  assert.equal(isBookingFlowPath('/equipment/asset-1/availability'),true);
  assert.equal(isBookingFlowPath('/bookings/check-availability'),true);
  assert.equal(isBookingFlowPath('/bookings'),true);
  assert.equal(isBookingFlowPath('/equipment'),false);
});
