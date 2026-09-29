import test from 'node:test'; import assert from 'node:assert/strict'; import {Booking,Equipment} from '../models/index.js'; import {availability,hasDateConflict,isValidTransition} from './booking.js';
const date=(day:number)=>new Date(`2026-10-${String(day).padStart(2,'0')}T00:00:00.000Z`);
test('Conflict Shield uses half-open intervals',async t=>{
 await t.test('Oct 10–15 vs Oct 13–18 conflicts',()=>assert.equal(hasDateConflict(date(10),date(15),date(13),date(18)),true));
 await t.test('Oct 10–15 vs Oct 16–20 is available',()=>assert.equal(hasDateConflict(date(10),date(15),date(16),date(20)),false));
 await t.test('same dates conflict',()=>assert.equal(hasDateConflict(date(10),date(15),date(10),date(15)),true));
 await t.test('Oct 10–15 vs Oct 5–9 is available',()=>assert.equal(hasDateConflict(date(10),date(15),date(5),date(9)),false));
});
test('availability service constructs the indexed conflict query',async()=>{
 const originalFind=(Equipment as any).findById,originalExists=(Booking as any).exists;
 const sample={equipmentId:'asset-1',status:'CONFIRMED',startDate:date(10),endDate:date(15)};
 try{
  (Equipment as any).findById=()=>({select:async()=>({status:'AVAILABLE'})});
  (Booking as any).exists=async(query:any)=>sample.equipmentId===query.equipmentId&&query.status.$in.includes(sample.status)&&sample.startDate<query.startDate.$lt&&sample.endDate>query.endDate.$gt?{_id:'booking'}:null;
  assert.equal(await availability('asset-1',date(13),date(18)),false);
  assert.equal(await availability('asset-1',date(16),date(20)),true);
  assert.equal(await availability('asset-1',date(10),date(15)),false);
  assert.equal(await availability('asset-1',date(5),date(9)),true);
  (Equipment as any).findById=()=>({select:async()=>({status:'MAINTENANCE'})});
  assert.equal(await availability('asset-1',date(16),date(20)),false);
 }finally{(Equipment as any).findById=originalFind;(Booking as any).exists=originalExists;}
});
test('rental lifecycle only permits declared transitions',async t=>{
 await t.test('request can be confirmed',()=>assert.equal(isValidTransition('PENDING','CONFIRMED'),true));
 await t.test('pickup-ready can become active',()=>assert.equal(isValidTransition('PICKUP_READY','ACTIVE'),true));
 await t.test('return and inspection can complete',()=>assert.equal(isValidTransition('RETURNED','INSPECTION')&&isValidTransition('INSPECTION','COMPLETED'),true));
 await t.test('completed rentals cannot reopen',()=>assert.equal(isValidTransition('COMPLETED','ACTIVE'),false));
});
