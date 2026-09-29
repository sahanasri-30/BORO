import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {User} from '../models/index.js';
import {requireSeedCredentials} from '../services/seedCredentials.js';

const {adminPassword,demoPassword}=requireSeedCredentials(process.env);
const seededDemoAccounts=[
  {email:'owner@boro.demo',role:'OWNER'},
  {email:'riley@boro.demo',role:'OWNER'},
  {email:'customer@boro.demo',role:'CUSTOMER'},
  {email:'taylor@boro.demo',role:'CUSTOMER'}
];

await mongoose.connect(process.env.MONGODB_URI||'mongodb://127.0.0.1:27017/boro');
try {
  const admin=await User.findOne({email:'admin@boro.demo',role:'ADMIN'}).select('_id').lean();
  const demos=await User.find({$or:seededDemoAccounts}).select('_id email role').lean();
  if(!admin||demos.length!==seededDemoAccounts.length||seededDemoAccounts.some(account=>!demos.some(user=>user.email===account.email&&user.role===account.role))){
    throw new Error('Expected the five seeded BORO accounts; no credentials were changed.');
  }
  const [adminHash,demoHash]=await Promise.all([bcrypt.hash(adminPassword,12),bcrypt.hash(demoPassword,12)]);
  const result=await User.bulkWrite([
    {updateOne:{filter:{_id:admin._id},update:{$set:{password:adminHash}}}},
    ...demos.map(user=>({updateOne:{filter:{_id:user._id},update:{$set:{password:demoHash}}}}))
  ],{ordered:true});
  if(result.matchedCount!==5)throw new Error('Credential update did not match all five seeded accounts.');
  console.log('Updated credentials for 1 seeded admin and 4 seeded demo accounts.');
} finally {
  await mongoose.disconnect();
}
