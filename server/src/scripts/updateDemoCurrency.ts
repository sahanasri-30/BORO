import 'dotenv/config';
import mongoose from 'mongoose';
import {Booking,Equipment,User} from '../models/index.js';

const rates=[
  {name:'Sony FX3 Cinema Camera',old:145,inr:12000},
  {name:'Canon EOS R6 Mark II',old:95,inr:8000},
  {name:'Rode Wireless PRO Kit',old:38,inr:2500},
  {name:'DeWalt 20V Impact Driver Set',old:25,inr:1200},
  {name:'Big Agnes Copper Spur Tent',old:32,inr:1800},
  {name:'Aputure 300D Lighting Kit',old:72,inr:6000}
];

async function main(){
  if(!process.env.MONGODB_URI)throw new Error('MONGODB_URI is required to update demo prices.');
  await mongoose.connect(process.env.MONGODB_URI);
  try{
    const owners=await User.find({email:{$in:['owner@boro.demo','riley@boro.demo']},role:'OWNER'}).select('_id');
    const customers=await User.find({email:{$in:['customer@boro.demo','taylor@boro.demo']},role:'CUSTOMER'}).select('_id');
    if(owners.length!==2||customers.length!==2)throw new Error('Expected seeded demo owners and customers were not found; no prices were changed.');
    const ownerIds=owners.map(user=>user._id);
    const customerIds=customers.map(user=>user._id);
    const equipmentRows=await Promise.all(rates.map(async rate=>{
      const equipment=await Equipment.findOne({name:rate.name,ownerId:{$in:ownerIds}});
      if(!equipment||(equipment.pricePerDay!==rate.old&&equipment.pricePerDay!==rate.inr))
        throw new Error(`Demo equipment "${rate.name}" is missing or has an unexpected price; no prices were changed.`);
      return {rate,equipment};
    }));
    const equipmentIds=equipmentRows.map(row=>row.equipment._id);
    const equipmentById=new Map(equipmentRows.map(row=>[String(row.equipment._id),row.rate]));
    const bookings=await Booking.find({equipmentId:{$in:equipmentIds},ownerId:{$in:ownerIds},customerId:{$in:customerIds}});
    const bookingUpdates=bookings.flatMap(booking=>{
      const rate=equipmentById.get(String(booking.equipmentId));
      if(!rate)return [];
      const days=Math.ceil((booking.endDate.getTime()-booking.startDate.getTime())/86400000);
      return booking.totalAmount===days*rate.old?[{booking,amount:days*rate.inr}]:[];
    });
    let equipmentUpdated=0;
    for(const {rate,equipment} of equipmentRows){
      if(equipment.pricePerDay===rate.old){equipment.pricePerDay=rate.inr;await equipment.save();equipmentUpdated++;}
    }
    for(const {booking,amount} of bookingUpdates){booking.totalAmount=amount;await booking.save();}
    console.log(`Demo INR price migration complete. Equipment rates changed: ${equipmentUpdated}; matching seeded booking totals changed: ${bookingUpdates.length}.`);
  }finally{await mongoose.disconnect();}
}

main().catch(error=>{console.error(`Demo INR price update failed: ${error.message}`);process.exitCode=1;});
