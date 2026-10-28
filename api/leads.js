import { db as defaultDb,schema,requireUser,sameOrigin,randomUUID,respondError } from '../lib/auth.js';
const statuses=['Not called','Picked up','Hung up','Not attended','Interested','Not interested','Call back later','Busy'];
export function createHandler({db=defaultDb}={}) {
return async function handler(req,res) {
 res.setHeader('Cache-Control','no-store');
 try {
  sameOrigin(req);const sql=db();await schema(sql);const user=await requireUser(sql,req);
  if(req.method==='GET') {
   if(typeof req.query?.history==='string'){
    const rows=await sql`SELECT a.*,u.name AS user_name FROM termjobs_activity a JOIN termjobs_users u ON u.id=a.user_id WHERE a.lead_id=${req.query.history} ORDER BY a.created_at DESC LIMIT 100`;
    return res.json(rows);
   }
   const rows=await sql`SELECT CASE WHEN l.data ? 'lastStatusChangedBy' THEN l.data ELSE l.data || COALESCE((
    SELECT jsonb_build_object('lastStatusChangedBy',a.user_id,'lastStatusChangedByName',u.name,'lastStatusChangedAt',a.created_at)
    FROM termjobs_activity a JOIN termjobs_users u ON u.id=a.user_id
    WHERE a.lead_id=l.id AND a.kind IN ('create','update','outcome') AND a.status IS DISTINCT FROM a.previous_status
    ORDER BY a.created_at DESC LIMIT 1
   ),'{}'::jsonb) END AS data FROM termjobs_leads l`;return res.json(rows.map(r=>r.data));
  }
  const lead=req.body;
  if(req.method==='PUT') {
   if(!lead || typeof lead.id!=='string' || lead.id.length>100 || typeof lead.company!=='string' || !lead.company.trim() || lead.company.length>200 || !statuses.includes(lead.status) || typeof lead.phone!=='string' || !/^\+?[\d\s()-]{7,22}$/.test(lead.phone) || typeof lead.notes!=='string' || lead.notes.length>10000 || typeof lead.callback!=='string' || (lead.callback && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(lead.callback)) || (lead.status==='Call back later'&&!lead.callback))return res.status(400).json({error:'Enter a valid company, phone, status and callback time.'});
   const now=new Date().toISOString();
   const values={company:lead.company.trim(),phone:lead.phone,status:lead.status,callback:lead.callback,notes:lead.notes,id:lead.id,updated:now,updatedBy:user.id,updatedByName:user.name};
   const statusActor={lastStatusChangedBy:user.id,lastStatusChangedByName:user.name,lastStatusChangedAt:now};
   const outcome=lead.recordOutcome===true && lead.status!=='Not called';
   if(outcome){values.lastOutcomeBy=user.id;values.lastOutcomeByName=user.name;values.lastOutcomeAt=now;}
   await sql`CREATE UNIQUE INDEX IF NOT EXISTS termjobs_unique_phone ON termjobs_leads ((right(regexp_replace(data->>'phone', '[^0-9]', '', 'g'), 10)))`;
   // Read, write and activity entry are atomic; caller identity is always server-owned.
   const rows=await sql`WITH previous AS (SELECT data FROM termjobs_leads WHERE id=${lead.id}), saved AS (
    INSERT INTO termjobs_leads (id,data) VALUES (${lead.id},${JSON.stringify({...values,...statusActor,created:now,createdBy:user.id,createdByName:user.name})}::jsonb)
    ON CONFLICT(id) DO UPDATE SET data=termjobs_leads.data || ${JSON.stringify(values)}::jsonb || CASE WHEN termjobs_leads.data->>'status' IS DISTINCT FROM EXCLUDED.data->>'status' THEN ${JSON.stringify(statusActor)}::jsonb ELSE '{}'::jsonb END RETURNING data
   ), logged AS (
    INSERT INTO termjobs_activity (id,lead_id,user_id,kind,company,phone,status,previous_status,notes)
    SELECT ${randomUUID()},${lead.id},${user.id},CASE WHEN ${outcome} THEN 'outcome' WHEN EXISTS(SELECT 1 FROM previous) THEN 'update' ELSE 'create' END,${values.company},${values.phone},${lead.status},(SELECT data->>'status' FROM previous),${lead.notes} FROM saved
   ) SELECT data FROM saved`;
   return res.json({lead:rows[0].data});
  }
  if(req.method==='PATCH'){
   if(!lead || typeof lead.id!=='string' || lead.action!=='call')return res.status(400).json({error:'Invalid call event.'});
   const call={lastCalledBy:user.id,lastCalledByName:user.name,lastCalledAt:new Date().toISOString()};
   const rows=await sql`WITH called AS (UPDATE termjobs_leads SET data=data || ${JSON.stringify(call)}::jsonb WHERE id=${lead.id} RETURNING data), logged AS (
    INSERT INTO termjobs_activity (id,lead_id,user_id,kind,company,phone,status)
    SELECT ${randomUUID()},${lead.id},${user.id},'call',data->>'company',data->>'phone',data->>'status' FROM called
   ) SELECT data FROM called`;
   if(!rows.length)return res.status(404).json({error:'Lead not found.'});
   return res.json({lead:rows[0].data});
  }
  if(req.method==='DELETE'){
   if(user.role!=='admin')return res.status(403).json({error:'Only admins can delete leads.'});
   const id=req.query?.id;if(typeof id!=='string')return res.status(400).json({error:'Missing ID.'});
   await sql`WITH removed AS (DELETE FROM termjobs_leads WHERE id=${id} RETURNING data)
    INSERT INTO termjobs_activity (id,lead_id,user_id,kind,company,phone,status)
    SELECT ${randomUUID()},${id},${user.id},'delete',data->>'company',data->>'phone',data->>'status' FROM removed`;
   return res.json({ok:true});
  }
  res.setHeader('Allow','GET, PUT, PATCH, DELETE');return res.status(405).end();
 }catch(error){return respondError(res,error);}
};
}
export default createHandler();
