import test from 'node:test';
import assert from 'node:assert/strict';
import {equipmentWriteRequest} from './equipmentWriteRequest.js';

test('equipment creation posts to the collection without an id',()=>{
  const request=equipmentWriteRequest(undefined,{name:'Camera'});
  assert.equal(request.path,'/equipment');
  assert.equal(request.method,'POST');
  assert.equal(request.path.includes('undefined'),false);
});

test('equipment editing puts to the supplied existing id',()=>{
  const existingId='existing-equipment-id';
  const request=equipmentWriteRequest(existingId,{name:'Updated camera'});
  assert.equal(request.path,`/equipment/${existingId}`);
  assert.equal(request.method,'PUT');
});
