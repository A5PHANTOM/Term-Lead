import assert from 'node:assert/strict';
import { randomUUID, randomInt } from 'node:crypto';
import handler from '../api/leads.js';
import authHandler from '../api/auth.js';
const base = process.argv[2];
const origin=base?new URL(base).origin:'http://localhost';
let cookie='';
if(!process.env.VERIFY_EMAIL||!process.env.VERIFY_PASSWORD)throw Error('Set VERIFY_EMAIL and VERIFY_PASSWORD to an admin account.');
const loginBody={action:'login',email:process.env.VERIFY_EMAIL,password:process.env.VERIFY_PASSWORD};
if(base){const response=await fetch(new URL('/api/auth',base),{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(loginBody)});assert.equal(response.status,200,'Admin login failed');cookie=(response.headers.get('set-cookie')||'').split(';')[0];}
else{const response={setHeader(k,v){if(k==='Set-Cookie')cookie=v.split(';')[0];},status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;},end(){}};await authHandler({method:'POST',headers:{host:'localhost',origin},body:loginBody},response);assert.equal(response.body?.user?.role,'admin','Admin login failed');}
async function request(method, lead) {
  if(base){
    const response=await fetch(new URL('/api/leads'+(method==='DELETE'?'?id='+encodeURIComponent(lead.id):''),base),{method,headers:{'Content-Type':'application/json',Cookie:cookie,Origin:origin},body:method==='PUT'?JSON.stringify(lead):undefined});
    return {status:response.status,body:await response.json()};
  }
  const res={statusCode:200,setHeader(){},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;},end(){return this;}};
  await handler({method,headers:{host:'localhost',origin,cookie},body:lead,query:{id:lead?.id}},res);
  return {status:res.statusCode,body:res.body};
}
const initial=await request('GET');assert.equal(initial.status,200,'Database read failed');assert.ok(Array.isArray(initial.body));
let phone;do{phone=String(randomInt(1000000000,9999999999));}while(initial.body.some(l=>l.phone.replace(/\D/g,'').slice(-10)===phone));
const id='connection-check-'+randomUUID();
const lead={id,company:'Connection check (temporary)',phone,status:'Not called',notes:'Temporary database verification record',callback:'',created:new Date().toISOString(),updated:new Date().toISOString()};
try {
  assert.equal((await request('PUT',lead)).status,200,'Database insert failed');
  assert.ok((await request('GET')).body.some(l=>l.id===id),'Inserted record could not be read');
  lead.notes='Update confirmed';lead.status='Busy';
  assert.equal((await request('PUT',lead)).status,200,'Database update failed');
  const found=(await request('GET')).body.find(l=>l.id===id);assert.equal(found.notes,'Update confirmed');assert.equal(found.status,'Busy');
  assert.equal((await request('PUT',{...lead,id:'duplicate-'+id})).status,409,'Duplicate phone protection failed');
} finally {
  assert.equal((await request('DELETE',{id})).status,200,'Temporary record cleanup failed');
  await request('DELETE',{id:'duplicate-'+id});
}
assert.ok(!(await request('GET')).body.some(l=>l.id===id),'Temporary record was not deleted');
console.log('PASS: read, create, update, duplicate-phone protection, delete, and cleanup.');
