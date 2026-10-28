import { db as defaultDb,schema,adminEmail,publicUser,hashPassword,verifyPassword,sameOrigin,requireUser,session,logout,digest,randomUUID,respondError } from '../lib/auth.js';
export function createHandler({db=defaultDb}={}) {
return async function handler(req,res) {
 res.setHeader('Cache-Control','no-store');
 try {
  sameOrigin(req);
  const sql=db();await schema(sql);
  if(req.method==='GET') {
   const users=await sql`SELECT id FROM termjobs_users WHERE role='admin' LIMIT 1`;
   if(!users.length) return res.json({user:null,setupRequired:true,adminEmail});
   try{return res.json({user:publicUser(await requireUser(sql,req)),setupRequired:false});}
   catch(error){if(error.status===401)return res.json({user:null,setupRequired:false});throw error;}
  }
  if(req.method!=='POST') {res.setHeader('Allow','GET, POST');return res.status(405).end();}
  const body=req.body || {};
  if(body.action==='logout') {await logout(sql,req,res);return res.json({ok:true});}
  if(body.action==='password') {
   const current=await requireUser(sql,req);
   if(!await verifyPassword(body.currentPassword,current.password_hash))return res.status(400).json({error:'Current password is incorrect.'});
   const hash=await hashPassword(body.password,current.role==='staff'?1:10);
   await sql.transaction([sql`UPDATE termjobs_users SET password_hash=${hash} WHERE id=${current.id}`,sql`DELETE FROM termjobs_sessions WHERE user_id=${current.id}`]);
   await session(sql,req,res,current.id);return res.json({ok:true});
  }
  if(!['login','setup'].includes(body.action))return res.status(400).json({error:'Invalid action.'});
  const email=String(body.email||'').trim().toLowerCase();
  // Rate limit both the account and IP, including setup attempts.
  const ip=String(req.headers['x-forwarded-for']||'unknown').split(',')[0].trim();
  const keys=[digest('email:'+email),digest('ip:'+ip)];
  for(const key of keys){
   const attempts=await sql`INSERT INTO termjobs_login_attempts (key,attempts) VALUES (${key},1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN termjobs_login_attempts.started_at<NOW()-INTERVAL '15 minutes' THEN 1 ELSE termjobs_login_attempts.attempts+1 END,started_at=CASE WHEN termjobs_login_attempts.started_at<NOW()-INTERVAL '15 minutes' THEN NOW() ELSE termjobs_login_attempts.started_at END RETURNING attempts`;
   if(attempts[0].attempts>(key===keys[0]?20:100))return res.status(429).json({error:'Too many attempts. Try again in 15 minutes.'});
  }
  let user;
  if(body.action==='setup') {
   const token=process.env.ADMIN_SETUP_TOKEN;
   if(!token || typeof body.setupToken!=='string' || digest(body.setupToken)!==digest(token))return res.status(403).json({error:'Enter the setup key configured by your administrator.'});
   if(email!==adminEmail)return res.status(400).json({error:'Use the configured admin email.'});
   const name=String(body.name||'Admin').trim().slice(0,100)||'Admin';
   const hash=await hashPassword(body.password);
   // A transaction lock prevents two simultaneous first-admin registrations.
   const results=await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(74209183)`,
    sql`INSERT INTO termjobs_users (id,name,email,password_hash,role) SELECT ${randomUUID()},${name},${email},${hash},'admin' WHERE NOT EXISTS (SELECT 1 FROM termjobs_users WHERE role='admin') RETURNING *`,
   ]);
   user=results[1][0];
   if(!user)return res.status(409).json({error:'Admin setup is complete. Please sign in.'});
  } else {
   const rows=await sql`SELECT * FROM termjobs_users WHERE email=${email}`;
   // Use the same password work for unknown accounts to avoid email enumeration.
   const dummy='00000000000000000000000000000000:'+ '00'.repeat(64);
   const valid=await verifyPassword(body.password,rows[0]?.password_hash||dummy);
   if(!valid || !rows[0]?.active)return res.status(401).json({error:'Email or password is incorrect.'});
   user=rows[0];
  }
  await session(sql,req,res,user.id);
  await sql`DELETE FROM termjobs_login_attempts WHERE key=${keys[0]}`;
  return res.json({user:publicUser(user)});
 }catch(error){return respondError(res,error);}
};
}
export default createHandler();
