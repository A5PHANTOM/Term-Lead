import { createHmac, timingSafeEqual } from 'node:crypto';
export const databaseUrl=()=>process.env.DATABASE_URL||process.env.termleads_DATABASE_URL||process.env.POSTGRES_URL;
const signature=value=>createHmac('sha256',process.env.APP_PASSWORD).update(value).digest('base64url');
export function equal(a,b){if(typeof a!=='string'||typeof b!=='string')return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export function authenticated(req){
 if(!process.env.APP_PASSWORD)return false;
 if(equal(req.headers.authorization,`Bearer ${process.env.APP_PASSWORD}`))return true;
 const cookie=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('tj_session='))?.slice(11);
 if(!cookie)return false;
 const [expiry,mac,...rest]=cookie.split('.');
 return !rest.length&&/^\d+$/.test(expiry)&&Number(expiry)>Date.now()&&equal(mac,signature(expiry));
}
export function setSession(res){const expiry=String(Date.now()+365*24*60*60*1000);res.setHeader('Set-Cookie',`tj_session=${expiry}.${signature(expiry)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000`);}
