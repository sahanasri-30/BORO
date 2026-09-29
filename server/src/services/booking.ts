import {Booking,Equipment,RentalLog,Notification} from '../models/index.js';
export const blocking=['PENDING','CONFIRMED','PICKUP_READY','ACTIVE','OVERDUE'];
export const hasDateConflict=(aStart:Date,aEnd:Date,bStart:Date,bEnd:Date)=>aStart<bEnd&&aEnd>bStart;
export async function availability(equipmentId:string,start:Date,end:Date,excludeId?:string){
  if(!(start<end))throw new Error('End date must be after start date');
  const asset=await Equipment.findById(equipmentId).select('status');
  if(!asset||asset.status==='MAINTENANCE')return false;
  const query:any={equipmentId,status:{$in:blocking},startDate:{$lt:end},endDate:{$gt:start}};
  if(excludeId)query._id={$ne:excludeId};
  return !(await Booking.exists(query));
}
const flow:Record<string,string[]>={PENDING:['CONFIRMED','REJECTED','CANCELLED'],CONFIRMED:['PICKUP_READY','CANCELLED'],PICKUP_READY:['ACTIVE'],ACTIVE:['RETURNED','OVERDUE'],OVERDUE:['RETURNED'],RETURNED:['INSPECTION'],INSPECTION:['COMPLETED','MAINTENANCE'],MAINTENANCE:['COMPLETED'],COMPLETED:[],REJECTED:[],CANCELLED:[]};
export const isValidTransition=(from:string,to:string)=>Boolean(flow[from]?.includes(to));
export async function transition(booking:any,status:string,notes=''){
  if(!isValidTransition(booking.status,status))throw new Error(`Cannot change ${booking.status} to ${status}`);
  const session=await Booking.startSession();
  try{await session.withTransaction(async()=>{
    booking.status=status;
    if(status==='PICKUP_READY')booking.pickupStatus='READY';
    if(status==='RETURNED')booking.returnStatus='RETURNED';
    await booking.save({session});
    await RentalLog.create([{bookingId:booking._id,equipmentId:booking.equipmentId,status,notes}],{session});
    const occupied=['CONFIRMED','PICKUP_READY','ACTIVE','OVERDUE'].includes(status);
    const equipmentStatus=occupied?(status==='ACTIVE'?'ACTIVE':status):status==='INSPECTION'?'INSPECTION':status==='MAINTENANCE'?'MAINTENANCE':status==='RETURNED'?'RETURNED':'AVAILABLE';
    await Equipment.findByIdAndUpdate(booking.equipmentId,{status:equipmentStatus},{session});
    await Notification.create([{userId:booking.customerId,type:'BOOKING',title:'Rental update',message:`Your rental status is now ${status}.`}],{session});
  });return booking;}finally{await session.endSession();}
}
export async function processOverdueRentals(now=new Date()){
  const due=await Booking.find({status:'ACTIVE',endDate:{$lt:now}}).limit(100);
  let updated=0;
  for(const booking of due){try{await transition(booking,'OVERDUE','Automatically marked overdue after the return date.');updated++;}catch{/* Concurrent lifecycle update; next sweep will recheck. */}}
  return updated;
}
