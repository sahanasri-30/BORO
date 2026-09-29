import test from 'node:test'; import assert from 'node:assert/strict'; import {Booking,Equipment,Review,User} from '../models/index.js'; import {ownerAnalytics,platformStats} from './analytics.js';
test('analytics builders issue aggregate pipelines over persisted records',async()=>{
 const originals={bookingAgg:(Booking as any).aggregate,bookingCount:(Booking as any).countDocuments,equipmentAgg:(Equipment as any).aggregate,equipmentCount:(Equipment as any).countDocuments,reviewCount:(Review as any).countDocuments,userCount:(User as any).countDocuments};
 const bookingPipelines:any[]=[],equipmentPipelines:any[]=[];
 try{
  (Booking as any).aggregate=async(p:any[])=>{bookingPipelines.push(p);return []};
  (Equipment as any).aggregate=async(p:any[])=>{equipmentPipelines.push(p);return []};
  (Booking as any).countDocuments=async()=>0;(Equipment as any).countDocuments=async()=>0;(Review as any).countDocuments=async()=>0;(User as any).countDocuments=async()=>0;
  const ownerId='64b000000000000000000001';
  const owner=await ownerAnalytics(ownerId);assert.equal(owner.revenue.total,0);assert.ok(bookingPipelines.length>=4);assert.ok(equipmentPipelines.length>=2);
  const ownerMatch=bookingPipelines[0][0].$match.ownerId;assert.equal(String(ownerMatch),ownerId);
  assert.ok(equipmentPipelines.some(p=>JSON.stringify(p).includes('$lookup')&&JSON.stringify(p).includes('recentRentals')));
  assert.ok(bookingPipelines.some(p=>JSON.stringify(p).includes('$dayOfWeek')));
  const platform=await platformStats();assert.equal(platform.bookings,0);assert.ok(Array.isArray(platform.monthly));
  assert.ok(bookingPipelines.some(p=>JSON.stringify(p).includes('$dateToString')));
 }finally{(Booking as any).aggregate=originals.bookingAgg;(Booking as any).countDocuments=originals.bookingCount;(Equipment as any).aggregate=originals.equipmentAgg;(Equipment as any).countDocuments=originals.equipmentCount;(Review as any).countDocuments=originals.reviewCount;(User as any).countDocuments=originals.userCount;}
});
