import { createHash, randomBytes } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { authenticated, databaseUrl, equal, setSession } from '../lib/auth.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
 if(!databaseUrl()||!process.env.APP_PASSWORD)return res.status(503).json({error:'Workspace is unavailable.'});
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).end();}
 const origin=req.headers.origin;
 if(origin&&origin!==`https://${req.headers.host}`&&origin!==`http://${req.headers.host}`)return res.status(403).json({error:'Invalid origin.'});
 try{
  const body=req.body||{};
  if(body.action==='create-link'){
   if(!authenticated(req))return res.status(401).json({error:'Sign in required.'});
   const sql=neon(databaseUrl());
   await sql`CREATE TABLE IF NOT EXISTS termjobs_access_links (token_hash TEXT PRIMARY KEY, expires_at TIMESTAMPTZ NOT NULL)`;
   await sql`DELETE FROM termjobs_access_links WHERE expires_at < NOW()`;
   const token=randomBytes(32).toString('base64url');const hash=createHash('sha256').update(token).digest('hex');
   await sql`INSERT INTO termjobs_access_links (token_hash,expires_at) VALUES (${hash},NOW()+INTERVAL '30 minutes')`;
   return res.json({accessToken:token});
  }
  if(body.accessToken){
   if(typeof body.accessToken!=='string'||body.accessToken.length>100)return res.status(401).json({error:'Invalid access link.'});
   const hash=createHash('sha256').update(body.accessToken).digest('hex');const sql=neon(databaseUrl());
   const rows=await sql`DELETE FROM termjobs_access_links WHERE token_hash=${hash} AND expires_at>NOW() RETURNING token_hash`;
   if(!rows.length)return res.status(401).json({error:'Access link has expired or was already used. Sign in with your workspace password.'});
  }else if(!equal(body.password,process.env.APP_PASSWORD))return res.status(401).json({error:'Incorrect workspace password.'});
  setSession(res);return res.json({ok:true});
 }catch{return res.status(500).json({error:'Could not sign in. Please try again.'});}
}
