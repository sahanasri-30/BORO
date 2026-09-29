import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {User,Category,Equipment,Booking,Review,RentalLog,Notification} from '../models/index.js';
import {requireSeedCredentials} from '../services/seedCredentials.js';
const {adminPassword,demoPassword}=requireSeedCredentials(process.env);
const uri=process.env.MONGODB_URI||'mongodb://127.0.0.1:27017/boro';
await mongoose.connect(uri);
await Promise.all([User.deleteMany({}),Category.deleteMany({}),Equipment.deleteMany({}),Booking.deleteMany({}),Review.deleteMany({}),RentalLog.deleteMany({}),Notification.deleteMany({})]);
const adminPasswordHash=await bcrypt.hash(adminPassword,12);
const demoPasswordHash=await bcrypt.hash(demoPassword,12);
const [admin,owner,secondOwner,customer,secondCustomer]=await User.create([
 {name:'BORO Admin',email:'admin@boro.demo',password:adminPasswordHash,role:'ADMIN'},
 {name:'Alex Morgan',email:'owner@boro.demo',password:demoPasswordHash,role:'OWNER'},
 {name:'Riley Park',email:'riley@boro.demo',password:demoPasswordHash,role:'OWNER'},
 {name:'Jamie Chen',email:'customer@boro.demo',password:demoPasswordHash,role:'CUSTOMER'},
 {name:'Taylor Reed',email:'taylor@boro.demo',password:demoPasswordHash,role:'CUSTOMER'}
]);
const categories=await Category.create([
 {name:'Photography',description:'Cameras, lenses and lighting'},
 {name:'Construction',description:'Tools and jobsite equipment'},
 {name:'Audio',description:'Sound and recording gear'},
 {name:'Outdoor',description:'Camping and outdoor equipment'}
]);
const records=[
 {ownerId:owner.id,categoryId:categories[0].id,name:'Sony FX3 Cinema Camera',description:'Full frame cinema camera with 4K 120p recording, ideal for documentary and commercial shoots.',images:['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1000'],pricePerDay:12000,location:'Brooklyn, NY',features:['4K 120fps','Full frame','2 batteries']},
 {ownerId:owner.id,categoryId:categories[0].id,name:'Canon EOS R6 Mark II',description:'Hybrid mirrorless camera with excellent autofocus and 4K video for events and travel.',images:['https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1000'],pricePerDay:8000,location:'Brooklyn, NY',features:['24MP','4K 60fps','RF mount']},
 {ownerId:owner.id,categoryId:categories[2].id,name:'Rode Wireless PRO Kit',description:'Professional dual channel wireless microphone system with onboard recording.',images:['https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=1000'],pricePerDay:2500,location:'Manhattan, NY',features:['Two transmitters','32-bit float','Charging case']},
 {ownerId:owner.id,categoryId:categories[1].id,name:'DeWalt 20V Impact Driver Set',description:'Compact cordless impact driver with battery, charger and a complete bit set.',images:['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1000'],pricePerDay:1200,location:'Queens, NY',features:['Brushless motor','Battery included','Bit set']},
 {ownerId:owner.id,categoryId:categories[3].id,name:'Big Agnes Copper Spur Tent',description:'Lightweight three season backpacking tent with room for two and full rainfly.',images:['https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=1000'],pricePerDay:1800,location:'Brooklyn, NY',features:['2 person','Ultralight','Rainfly included']},
 {ownerId:secondOwner.id,categoryId:categories[0].id,name:'Aputure 300D Lighting Kit',description:'Daylight balanced LED fixture with softbox and stand for location production.',images:['https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1000'],pricePerDay:6000,location:'Jersey City, NJ',features:['300W LED','Softbox','Light stand']}
];
const items=await Equipment.create(records);
const day=(n:number)=>{const d=new Date();d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()+n);return d;};
const makeBooking=(equipmentId:any,customerId:any,ownerId:any,start:number,end:number,status:string)=>{const i=items.findIndex(x=>String(x._id)===String(equipmentId));return {equipmentId,customerId,ownerId,startDate:day(start),endDate:day(end),totalAmount:(end-start)*records[i].pricePerDay,status,paymentStatus:status==='COMPLETED'?'PAID':'UNPAID',returnStatus:status==='COMPLETED'?'RETURNED':'NOT_RETURNED'};};
const bookings=await Booking.create([
 makeBooking(items[0]._id,customer._id,owner._id,-35,-32,'COMPLETED'),
 makeBooking(items[0]._id,customer._id,owner._id,7,10,'CONFIRMED'),
 makeBooking(items[1]._id,secondCustomer._id,owner._id,-15,-12,'COMPLETED'),
 makeBooking(items[2]._id,customer._id,owner._id,0,3,'ACTIVE'),
 makeBooking(items[3]._id,secondCustomer._id,owner._id,-8,-5,'OVERDUE'),
 makeBooking(items[5]._id,secondCustomer._id,secondOwner._id,-25,-23,'COMPLETED')
]);
await Equipment.findByIdAndUpdate(items[2]._id,{status:'ACTIVE'});
await Equipment.findByIdAndUpdate(items[3]._id,{status:'OVERDUE'});
await Review.create([
 {equipmentId:items[0]._id,customerId:customer._id,bookingId:bookings[0]._id,rating:5,comment:'Clear communication and excellent kit.'},
 {equipmentId:items[1]._id,customerId:secondCustomer._id,bookingId:bookings[2]._id,rating:5,comment:'Great camera, exactly as described.'},
 {equipmentId:items[5]._id,customerId:secondCustomer._id,bookingId:bookings[5]._id,rating:4,comment:'Bright, easy to set up, and carefully packed.'}
]);
const ratingStats=await Review.aggregate([{$group:{_id:'$equipmentId',rating:{$avg:'$rating'},reviewCount:{$sum:1}}}]);
for(const r of ratingStats)await Equipment.findByIdAndUpdate(r._id,{rating:r.rating,reviewCount:r.reviewCount});
for(const b of bookings)await RentalLog.create({bookingId:b._id,equipmentId:b.equipmentId,status:b.status,notes:'Seeded demo rental history'});
await Notification.create({userId:owner._id,type:'BOOKING',title:'Demo workspace ready',message:'Explore rental lifecycle, analytics, and rule-based opportunities.'});
console.log('Seed complete. Demo account passwords are configured locally in server/.env.');
console.log('Admin admin@boro.demo · Owner owner@boro.demo · Customer customer@boro.demo');
await mongoose.disconnect();
