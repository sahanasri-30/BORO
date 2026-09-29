import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import {router} from './routes.js';
import {processOverdueRentals} from './services/booking.js';
const app=express();
app.use(helmet());
app.use(cors({origin:process.env.CLIENT_URL||'http://localhost:5173'}));
app.use(express.json({limit:'8mb'}));
app.use('/api',rateLimit({windowMs:15*60*1000,limit:300,standardHeaders:true,legacyHeaders:false}));
app.get('/api/health',(_req,res)=>res.json({ok:true,data:{service:'BORO API',database:mongoose.connection.readyState===1?'connected':'disconnected'}}));
app.use('/api',router);
app.use((err:any,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
  if(err?.code===11000)return res.status(409).json({ok:false,error:'A record with that unique value already exists.'});
  if(err instanceof mongoose.Error.ValidationError||err instanceof mongoose.Error.CastError)return res.status(400).json({ok:false,error:err.message});
  if(err.name==='ZodError')return res.status(400).json({ok:false,error:'Invalid request',details:err.issues});
  res.status(err.status||500).json({ok:false,error:err.status?err.message:'Internal server error'});
});
const port=Number(process.env.PORT||4000);
if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32||process.env.JWT_SECRET.startsWith('replace-with-a-long-random-secret')){
  console.error('Startup blocked: set JWT_SECRET in server/.env to a long random value.');process.exit(1);
}
mongoose.connect(process.env.MONGODB_URI||'mongodb://127.0.0.1:27017/boro',{serverSelectionTimeoutMS:10000})
  .then(()=>{void processOverdueRentals().catch(error=>console.error('Overdue rental sweep failed',error.message));setInterval(()=>void processOverdueRentals().catch(error=>console.error('Overdue rental sweep failed',error.message)),60_000);app.listen(port,()=>console.log(`BORO API connected to MongoDB and listening on ${port}`));})
  .catch(error=>{console.error(`MongoDB connection failed for ${process.env.MONGODB_URI?'MONGODB_URI':'mongodb://127.0.0.1:27017/boro'}. Check the URI, network access/IP allowlist, credentials, and that MongoDB is running.`,error.message);process.exit(1)});
