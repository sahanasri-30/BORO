import mongoose from 'mongoose';
import {Booking,Category,Equipment,Review,User} from '../models/index.js';
const CLOSED=['COMPLETED','RETURNED','INSPECTION'];
const RENTED=['ACTIVE','RETURNED','INSPECTION','COMPLETED','OVERDUE'];

export async function ownerAnalytics(ownerId:string){
  const owner=new mongoose.Types.ObjectId(ownerId);
  const match={ownerId:owner};
  const [revenue,statuses,assets,top,categories,trends,weekdays]=await Promise.all([
    Booking.aggregate([{$match:{ownerId:owner,status:{$in:CLOSED}}},{$group:{_id:null,total:{$sum:'$totalAmount'},count:{$sum:1},avgDays:{$avg:{$divide:[{$subtract:['$endDate','$startDate']},86400000]}}}}]),
    Booking.aggregate([{$match:{ownerId:owner}},{$group:{_id:'$status',count:{$sum:1}}}]),
    Equipment.aggregate([
      {$match:match},
      {$lookup:{from:'bookings',localField:'_id',foreignField:'equipmentId',pipeline:[{$match:{status:{$in:RENTED},startDate:{$lt:new Date()},endDate:{$gt:new Date(Date.now()-30*86400000)}}},{$project:{startDate:1,endDate:1}}],as:'recentRentals'}},
      {$lookup:{from:'bookings',localField:'_id',foreignField:'equipmentId',pipeline:[{$match:{status:{$in:CLOSED},endDate:{$lte:new Date()}}},{$group:{_id:null,lastRentalEnd:{$max:'$endDate'}}}],as:'history'}},
      {$project:{
        name:1,categoryId:1,pricePerDay:1,status:1,createdAt:1,
        rentalCount:{$size:'$recentRentals'},
        daysRented:{$sum:{$map:{input:'$recentRentals',as:'r',in:{$divide:[
          {$subtract:[{$min:['$$r.endDate',new Date()]},{$max:['$$r.startDate',new Date(Date.now()-30*86400000)]}]},86400000
        ]}}}},
        lastRentalEnd:{$ifNull:[{$arrayElemAt:['$history.lastRentalEnd',0]},'$createdAt']}
      }},
      {$addFields:{utilization30:{$min:[100,{$multiply:[{$divide:['$daysRented',30]},100]}]},idleDays:{$cond:[{$in:['$status',['ACTIVE','OVERDUE']]},0,{$divide:[{$subtract:[new Date(),'$lastRentalEnd']},86400000]}]}}},
      {$sort:{utilization30:-1}}
    ]),
    Booking.aggregate([{$match:{ownerId:owner,status:{$in:CLOSED}}},{$group:{_id:'$equipmentId',rentals:{$sum:1},revenue:{$sum:'$totalAmount'}}},{$sort:{rentals:-1}},{$limit:5},{$lookup:{from:'equipment',localField:'_id',foreignField:'_id',as:'equipment'}},{$unwind:'$equipment'},{$project:{name:'$equipment.name',rentals:1,revenue:1,pricePerDay:'$equipment.pricePerDay'}}]),
    Equipment.aggregate([{$match:match},{$lookup:{from:'categories',localField:'categoryId',foreignField:'_id',as:'category'}},{$unwind:'$category'},{$group:{_id:'$category.name',assets:{$sum:1},avgPrice:{$avg:'$pricePerDay'}}},{$sort:{assets:-1}}]),
    Booking.aggregate([{$match:{ownerId:owner}},{$group:{_id:{$dateToString:{format:'%Y-%m',date:'$createdAt'}},bookings:{$sum:1},revenue:{$sum:{$cond:[{$in:['$status',CLOSED]},'$totalAmount',0]}}}},{$sort:{_id:-1}},{$limit:12},{$sort:{_id:1}}]),
    Booking.aggregate([{$match:{ownerId:owner,status:{$in:CLOSED}}},{$group:{_id:{$dayOfWeek:'$startDate'},bookings:{$sum:1}}},{$sort:{_id:1}}])
  ]);
  const activeRentals=await Booking.countDocuments({ownerId,status:{$in:['ACTIVE','OVERDUE']}});
  return {revenue:revenue[0]||{total:0,count:0,avgDays:0},statuses,assets,top,categories,trends,weekdays,activeRentals};
}

export async function opportunities(ownerId:string){
  const stats=await ownerAnalytics(ownerId);
  const averageUtil=stats.assets.length?stats.assets.reduce((n:number,a:any)=>n+(a.utilization30||0),0)/stats.assets.length:0;
  const demand=await Booking.aggregate([{$match:{ownerId:new mongoose.Types.ObjectId(ownerId),status:{$in:CLOSED},startDate:{$gte:new Date(Date.now()-90*86400000)}}},{$group:{_id:{equipmentId:'$equipmentId',day:{$dayOfWeek:'$startDate'}},count:{$sum:1}}}]);
  const categoryPrices=await Equipment.aggregate([{$match:{ownerId:new mongoose.Types.ObjectId(ownerId)}},{$group:{_id:'$categoryId',avgPrice:{$avg:'$pricePerDay'},assets:{$sum:1}}}]);
  const priceByCategory=new Map(categoryPrices.map((x:any)=>[String(x._id),x.avgPrice]));
  return stats.assets.flatMap((a:any)=>{
    const results:any[]=[];
    if(a.utilization30<15)results.push({type:'LOW_UTILIZATION',message:`Only ${Math.round(a.utilization30)}% utilization in the last 30 days. Consider a weekday promotion.`});
    if(a.idleDays>30)results.push({type:'IDLE_ASSET',message:`No rental ended in ${Math.floor(a.idleDays)} days. Consider promoting this listing.`});
    if(a.rentalCount>=3&&a.utilization30>averageUtil+15)results.push({type:'HIGH_DEMAND',message:'Rental activity is above your portfolio average. Consider reviewing this listing price.'});
    const assetDays=demand.filter((d:any)=>String(d._id.equipmentId)===String(a._id));const weekend=assetDays.filter((d:any)=>d._id.day===1||d._id.day===7).reduce((n:number,d:any)=>n+d.count,0);const weekdays=assetDays.filter((d:any)=>d._id.day>=2&&d._id.day<=6).reduce((n:number,d:any)=>n+d.count,0);if(weekend>=4&&weekend/2>(weekdays/5)*1.5)results.push({type:'WEEKEND_DEMAND',message:'Weekend bookings run at least 50% higher per day than weekday bookings in the last 90 days. Consider weekend pricing.'});
    const market=priceByCategory.get(String(a.categoryId));
    if(market&&a.pricePerDay<market*.8&&a.utilization30>50)results.push({type:'PRICING',message:`This asset rents often and is priced below the category average of $${Math.round(market)}/day. A rate review may be worthwhile.`});
    return results.map(x=>({equipmentId:a._id,name:a.name,...x,classification:'RULE_BASED'}));
  });
}

export async function platformStats(){
  const [users,equipment,bookings,revenue,reviews,activity,monthly,categories]=await Promise.all([
    User.countDocuments(),Equipment.countDocuments(),Booking.countDocuments(),
    Booking.aggregate([{$match:{status:{$in:CLOSED}}},{$group:{_id:null,total:{$sum:'$totalAmount'}}}]),
    Review.countDocuments(),
    Booking.aggregate([{$group:{_id:'$status',count:{$sum:1}}},{$sort:{count:-1}}]),
    Booking.aggregate([{$group:{_id:{$dateToString:{format:'%Y-%m',date:'$createdAt'}},bookings:{$sum:1},revenue:{$sum:{$cond:[{$in:['$status',CLOSED]},'$totalAmount',0]}}}},{$sort:{_id:1}},{$limit:12}]),
    Equipment.aggregate([{$lookup:{from:'categories',localField:'categoryId',foreignField:'_id',as:'category'}},{$unwind:'$category'},{$group:{_id:'$category.name',assets:{$sum:1},avgPrice:{$avg:'$pricePerDay'}}},{$sort:{assets:-1}}])
  ]);
  return {users,equipment,bookings,revenue:revenue[0]?.total||0,reviews,activity,monthly,categories};
}
