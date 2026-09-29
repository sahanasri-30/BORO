import type {Request,Response,NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import {User} from '../models/index.js';
export type Role='CUSTOMER'|'OWNER'|'ADMIN';
export interface AuthedRequest extends Request {user?:{id:string;role:Role}}
export async function auth(req:AuthedRequest,res:Response,next:NextFunction){
 const token=req.headers.authorization?.replace(/^Bearer\s+/i,'');
 if(!token)return res.status(401).json({ok:false,error:'Authentication required'});
 let claims:{id?:string};
 try{
  claims=jwt.verify(token,process.env.JWT_SECRET!) as {id?:string};
 }catch{return res.status(401).json({ok:false,error:'Invalid or expired token'});}
 if(!claims.id)return res.status(401).json({ok:false,error:'Invalid or expired token'});
 try{const user=await User.findById(claims.id).select('_id role');if(!user)return res.status(401).json({ok:false,error:'Account no longer exists'});req.user={id:user.id,role:user.role as Role};next();}catch(error){next(error);}
}
export const allow=(...roles:Role[])=>(req:AuthedRequest,res:Response,next:NextFunction)=>{if(!req.user||!roles.includes(req.user.role))return res.status(403).json({ok:false,error:'Insufficient permissions'});next()};
