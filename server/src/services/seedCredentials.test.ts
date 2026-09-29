import test from 'node:test';
import assert from 'node:assert/strict';
import {requireSeedCredentials} from './seedCredentials.js';

test('seed credentials require distinct, sufficiently long environment values',()=>{
  assert.throws(()=>requireSeedCredentials({}),/SEED_ADMIN_PASSWORD/);
  assert.throws(()=>requireSeedCredentials({SEED_ADMIN_PASSWORD:'admin-test-value-long-enough-123'}),/SEED_DEMO_PASSWORD/);
  assert.throws(()=>requireSeedCredentials({SEED_ADMIN_PASSWORD:'admin-test-value-long-enough-123',SEED_DEMO_PASSWORD:'admin-test-value-long-enough-123'}),/must be different/);
  const result=requireSeedCredentials({SEED_ADMIN_PASSWORD:'admin-test-value-long-enough-123',SEED_DEMO_PASSWORD:'demo-test-value-long-enough-456'});
  assert.equal(result.adminPassword,'admin-test-value-long-enough-123');
  assert.equal(result.demoPassword,'demo-test-value-long-enough-456');
});
