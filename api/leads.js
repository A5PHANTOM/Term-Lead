import { neon } from '@neondatabase/serverless';
import { authenticated, setSession } from '../lib/auth.js';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const databaseUrl = process.env.DATABASE_URL || process.env.termleads_DATABASE_URL || process.env.POSTGRES_URL;
  if (!databaseUrl || !process.env.APP_PASSWORD) return res.status(503).json({error:'Cloud storage is not configured.'});
  if (!authenticated(req)) return res.status(401).json({error:'Enter your workspace password to connect.'});
  setSession(res);
  const sql = neon(databaseUrl);
  try {
    await sql`CREATE TABLE IF NOT EXISTS termjobs_leads (id TEXT PRIMARY KEY, data JSONB NOT NULL)`;
    if (req.method === 'GET') { const rows = await sql`SELECT data FROM termjobs_leads`; return res.json(rows.map(r=>r.data)); }
    if (req.method === 'PUT') {
      const lead=req.body;
      if (!lead || typeof lead.id!=='string' || typeof lead.company!=='string' || !lead.company.trim() || !['Not called','Picked up','Hung up','Not attended','Interested','Not interested','Call back later'].includes(lead.status) || typeof lead.phone!=='string' || !/^\+?[\d\s()-]{7,22}$/.test(lead.phone) || lead.company.length>200 || String(lead.notes||'').length>10000) return res.status(400).json({error:'Invalid lead.'});
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS termjobs_unique_phone ON termjobs_leads ((right(regexp_replace(data->>'phone', '[^0-9]', '', 'g'), 10)))`;
      await sql`INSERT INTO termjobs_leads (id,data) VALUES (${lead.id},${JSON.stringify(lead)}::jsonb) ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data`;
      return res.json({ok:true});
    }
    if (req.method === 'DELETE') { const id=req.query.id; if(typeof id!=='string')return res.status(400).json({error:'Missing ID'}); await sql`DELETE FROM termjobs_leads WHERE id=${id}`; return res.json({ok:true}); }
    res.setHeader('Allow','GET, PUT, DELETE');return res.status(405).end();
  } catch (error) { if(error.code==='23505') return res.status(409).json({error:'This phone number already exists.'}); return res.status(500).json({error:'Storage unavailable. Please try again.'}); }
}
