import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {randomBytes} from 'node:crypto';
import {User} from './models/index.js';
import {router} from './routes.js';

test('admin login signs a JWT for the matching bcrypt password and rejects an incorrect password',async()=>{
  const password=randomBytes(36).toString('base64url');
  const incorrectPassword=randomBytes(36).toString('base64url');
  const jwtSecret=randomBytes(48).toString('hex');
  const accountId=randomBytes(12).toString('hex');
  const passwordHash=await bcrypt.hash(password,4);
  const account={id:accountId,email:'admin@boro.demo',role:'ADMIN',password:passwordHash};
  const originalFindOne=(User as any).findOne;
  const originalJwtSecret=process.env.JWT_SECRET;
  (User as any).findOne=()=>({select:async()=>account});
  process.env.JWT_SECRET=jwtSecret;

  const app=express();
  app.use(express.json());
  app.use('/api',router);
  const server=app.listen(0,'127.0.0.1');
  await once(server,'listening');
  const address=server.address();
  assert.ok(address&&typeof address!=='string');
  const url=`http://127.0.0.1:${address.port}/api/auth/login`;

  try{
    const success=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'ADMIN@BORO.DEMO',password})});
    const successBody=await success.json() as any;
    assert.equal(success.status,200);
    assert.equal(successBody.data.user.role,'ADMIN');
    assert.equal((jwt.verify(successBody.data.token,jwtSecret) as any).id,accountId);

    const rejected=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'admin@boro.demo',password:incorrectPassword})});
    assert.equal(rejected.status,401);
  }finally{
    (User as any).findOne=originalFindOne;
    if(originalJwtSecret===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=originalJwtSecret;
    server.closeAllConnections();
    await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  }
});
