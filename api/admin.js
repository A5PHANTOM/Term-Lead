import {db as defaultDb,schema,requireUser,sameOrigin,publicUser,hashPassword,randomUUID,respondError} from '../lib/auth.js';
export function createHandler({db=defaultDb}={}) {
return async function handler(req,res) {
 res.setHeader('Cache-Control','no-store');
 try{
  sameOrigin(req);const sql=db();await schema(sql);const admin=await requireUser(sql,req,true);
  if(req.method==='GET'){
   const [users,activity,summary]=await Promise.all([
    sql`SELECT id,name,email,role,active FROM termjobs_users ORDER BY created_at`,
    sql`SELECT a.*,u.name AS user_name FROM termjobs_activity a JOIN termjobs_users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 200`,
    sql`SELECT u.id,u.name,COUNT(a.id) FILTER(WHERE a.kind='call')::int AS calls,COUNT(a.id) FILTER(WHERE a.kind='call' AND a.created_at>=(NOW() AT TIME ZONE 'Asia/Kolkata')::date AT TIME ZONE 'Asia/Kolkata')::int AS calls_today,COUNT(a.id) FILTER(WHERE a.kind='outcome')::int AS outcomes,COUNT(a.id) FILTER(WHERE a.kind='outcome' AND a.status='Interested')::int AS interested,MAX(a.created_at) AS last_activity FROM termjobs_users u LEFT JOIN termjobs_activity a ON a.user_id=u.id GROUP BY u.id ORDER BY calls DESC,u.name`,
   ]);
   return res.json({users:users.map(publicUser),activity,summary});
  }
  const body=req.body||{};
  if(req.method==='POST'){
   const name=String(body.name||'').trim(),email=String(body.email||'').trim().toLowerCase();
   if(!name || name.length>100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254)return res.status(400).json({error:'Enter a name and valid email.'});
   // New accounts are staff. Administrator privileges cannot be set by clients.
   const hash=await hashPassword(body.password,1);
   const rows=await sql`INSERT INTO termjobs_users (id,name,email,password_hash,role) VALUES (${randomUUID()},${name},${email},${hash},'staff') RETURNING id,name,email,role,active`;
   return res.status(201).json({user:publicUser(rows[0])});
  }
  if(req.method==='PATCH'){
   if(typeof body.id!=='string' || !['password','active'].includes(body.action))return res.status(400).json({error:'Invalid account change.'});
   const targets=await sql`SELECT id,role FROM termjobs_users WHERE id=${body.id}`;
   if(!targets.length)return res.status(404).json({error:'Account not found.'});
   if(targets[0].role==='admin' && body.id!==admin.id)return res.status(403).json({error:'You can only change your own admin password.'});
   if(body.action==='active'){
    if(targets[0].role==='admin' || typeof body.active!=='boolean')return res.status(400).json({error:'The admin account must stay active.'});
    await sql.transaction([sql`UPDATE termjobs_users SET active=${body.active} WHERE id=${body.id}`,sql`DELETE FROM termjobs_sessions WHERE user_id=${body.id}`]);
   }else{
    const hash=await hashPassword(body.password,targets[0].role==='staff'?1:10);
    await sql.transaction([sql`UPDATE termjobs_users SET password_hash=${hash} WHERE id=${body.id}`,sql`DELETE FROM termjobs_sessions WHERE user_id=${body.id}`]);
   }
   return res.json({ok:true});
  }
  res.setHeader('Allow','GET, POST, PATCH');return res.status(405).end();
 }catch(error){return respondError(res,error);}
};
}
export default createHandler();
