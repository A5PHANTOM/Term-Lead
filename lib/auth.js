import { neon } from '@neondatabase/serverless';
import { randomBytes, randomUUID, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export const adminEmail = (process.env.ADMIN_EMAIL || 'admin@gmail.com').trim().toLowerCase();
export const publicUser = u => ({id:u.id,name:u.name,email:u.email,role:u.role,active:u.active});
export const digest = value => createHash('sha256').update(value).digest('hex');
let cachedUrl,cachedSql;
const schemas=new WeakMap();
export function db() {
 const url = process.env.DATABASE_URL || process.env.termleads_DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw Object.assign(Error('Cloud storage is not configured.'),{status:503});
 if(cachedUrl!==url){cachedUrl=url;cachedSql=neon(url);}
 return cachedSql;
}
export async function schema(sql) {
 if(!schemas.has(sql))schemas.set(sql,initialize(sql).catch(error=>{schemas.delete(sql);throw error;}));
 return schemas.get(sql);
}
async function initialize(sql) {
 await sql`CREATE TABLE IF NOT EXISTS termjobs_users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','staff')), active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
 await sql`CREATE TABLE IF NOT EXISTS termjobs_sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES termjobs_users(id), expires_at TIMESTAMPTZ NOT NULL)`;
 await sql`CREATE TABLE IF NOT EXISTS termjobs_login_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, started_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
 await sql`CREATE TABLE IF NOT EXISTS termjobs_leads (id TEXT PRIMARY KEY, data JSONB NOT NULL)`;
 await sql`CREATE TABLE IF NOT EXISTS termjobs_activity (id TEXT PRIMARY KEY, lead_id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES termjobs_users(id), kind TEXT NOT NULL, company TEXT NOT NULL, phone TEXT NOT NULL, status TEXT, previous_status TEXT, notes TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
 await sql`CREATE INDEX IF NOT EXISTS termjobs_activity_time ON termjobs_activity (created_at DESC)`;
 await sql`CREATE INDEX IF NOT EXISTS termjobs_activity_lead_time ON termjobs_activity (lead_id,created_at DESC)`;
}
export async function hashPassword(password,minLength=10) {
 if (typeof password !== 'string' || password.length < minLength || password.length > 128) throw Object.assign(Error(`Use a password between ${minLength} and 128 characters.`),{status:400});
 const salt = randomBytes(16).toString('hex');
 const hash = await scrypt(password,salt,64);
 return `${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password,stored) {
 if (typeof password !== 'string' || password.length > 128) return false;
 const [salt,hex] = stored.split(':');
 const actual = await scrypt(password,salt,64);
 const expected = Buffer.from(hex,'hex');
 return actual.length === expected.length && timingSafeEqual(actual,expected);
}
export function sameOrigin(req) {
 if (['GET','HEAD'].includes(req.method)) return;
 // Older WebKit can omit Origin on same-origin form requests. A verified
 // Referer is a fallback only when Origin is absent, never when it is invalid.
 const origin = req.headers.origin === undefined ? req.headers.referer : req.headers.origin;
 const host = req.headers.host;
 let allowed=false;try{allowed=!!origin&&!!host&&new URL(origin).host===host&&['http:','https:'].includes(new URL(origin).protocol);}catch{}
 if (!allowed) throw Object.assign(Error('Request origin is not allowed.'),{status:403});
}
export function cookieToken(req) {
 const match = (req.headers.cookie || '').match(/(?:^|;\s*)tj_session=([a-f0-9]{64})(?:;|$)/);
 return match ? match[1] : null;
}
function cookie(req,token,maxAge) {
 return `tj_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${process.env.VERCEL || req.headers['x-forwarded-proto']==='https' ? '; Secure' : ''}`;
}
export async function session(sql,req,res,userId) {
 const token = randomBytes(32).toString('hex');
 await sql`INSERT INTO termjobs_sessions (token_hash,user_id,expires_at) VALUES (${digest(token)},${userId},NOW()+INTERVAL '7 days')`;
 res.setHeader('Set-Cookie',cookie(req,token,604800));
}
export async function requireUser(sql,req,admin=false) {
 const token = cookieToken(req);
 if (!token) throw Object.assign(Error('Please sign in.'),{status:401});
 const rows = await sql`SELECT u.* FROM termjobs_users u JOIN termjobs_sessions s ON s.user_id=u.id WHERE s.token_hash=${digest(token)} AND s.expires_at>NOW() AND u.active=TRUE`;
 if (!rows[0]) throw Object.assign(Error('Your session expired. Please sign in.'),{status:401});
 if (admin && rows[0].role!=='admin') throw Object.assign(Error('Admin access is required.'),{status:403});
 return rows[0];
}
export async function logout(sql,req,res) {
 const token=cookieToken(req);
 if(token) await sql`DELETE FROM termjobs_sessions WHERE token_hash=${digest(token)}`;
 res.setHeader('Set-Cookie',cookie(req,'',0));
}
export function respondError(res,error) {
 if(error.code==='23505') return res.status(409).json({error:'That email or phone number already exists.'});
 return res.status(error.status || 500).json({error:error.status ? error.message : 'Service unavailable. Please retry.'});
}
export { randomUUID };
