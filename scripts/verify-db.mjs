import assert from 'node:assert/strict';
import { randomUUID, randomInt } from 'node:crypto';
import handler from '../api/leads.js';
const base = process.argv[2];
assert.ok(process.env.APP_PASSWORD || process.env.VERIFY_COOKIE, 'Workspace authentication must be configured');
async function request(method, lead) {
  if(base){
    const response=await fetch(new URL('/api/leads'+(method==='DELETE'?'?id='+encodeURIComponent(lead.id):''),base),{method,headers:{...(process.env.VERIFY_COOKIE?{Cookie:process.env.VERIFY_COOKIE}:{Authorization:`Bearer ${process.env.APP_PASSWORD}`}), 'Content-Type':'application/json'},body:method==='PUT'?JSON.stringify(lead):undefined});
    return {status:response.status,body:await response.json()};
  }
  const res={statusCode:200,setHeader(){},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;},end(){return this;}};
  await handler({method,headers:{authorization:`Bearer ${process.env.APP_PASSWORD}`},body:lead,query:{id:lead?.id}},res);
  return {status:res.statusCode,body:res.body};
}
const initial=await request('GET');assert.equal(initial.status,200,'Database read failed');assert.ok(Array.isArray(initial.body));
let phone;do{phone=String(randomInt(1000000000,9999999999));}while(initial.body.some(l=>l.phone.replace(/\D/g,'').slice(-10)===phone));
const id='connection-check-'+randomUUID();
const lead={id,company:'Connection check (temporary)',phone,status:'Not called',notes:'Temporary database verification record',callback:'',created:new Date().toISOString(),updated:new Date().toISOString()};
try {
  assert.equal((await request('PUT',lead)).status,200,'Database insert failed');
  assert.ok((await request('GET')).body.some(l=>l.id===id),'Inserted record could not be read');
  lead.notes='Update confirmed';lead.status='Picked up';
  assert.equal((await request('PUT',lead)).status,200,'Database update failed');
  const found=(await request('GET')).body.find(l=>l.id===id);assert.equal(found.notes,'Update confirmed');assert.equal(found.status,'Picked up');
  assert.equal((await request('PUT',{...lead,id:'duplicate-'+id})).status,409,'Duplicate phone protection failed');
} finally {
  assert.equal((await request('DELETE',{id})).status,200,'Temporary record cleanup failed');
  await request('DELETE',{id:'duplicate-'+id});
}
assert.ok(!(await request('GET')).body.some(l=>l.id===id),'Temporary record was not deleted');
console.log('PASS: read, create, update, duplicate-phone protection, delete, and cleanup.');
