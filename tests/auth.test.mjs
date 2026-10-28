import test from 'node:test';
import assert from 'node:assert/strict';
import {hashPassword,verifyPassword,sameOrigin,publicUser} from '../lib/auth.js';

test('passwords are salted and verified without storing plaintext',async()=>{
 const a=await hashPassword('a secure test password'),b=await hashPassword('a secure test password');
 assert.notEqual(a,b);assert.ok(!a.includes('a secure'));
 assert.equal(await verifyPassword('a secure test password',a),true);
 assert.equal(await verifyPassword('wrong password',a),false);
 assert.equal(await verifyPassword(null,a),false);
 await assert.rejects(hashPassword('short'),/10 and 128/);
});
test('writes reject foreign, absent and malformed origins',()=>{
 for(const origin of [undefined,'https://attacker.example','bad url'])assert.throws(()=>sameOrigin({method:'POST',headers:{host:'term-lead.vercel.app',origin}}),error=>error.status===403);
 assert.doesNotThrow(()=>sameOrigin({method:'POST',headers:{host:'term-lead.vercel.app',origin:'https://term-lead.vercel.app'}}));
});
test('public account data excludes credentials',()=>{
 assert.deepEqual(publicUser({id:'1',name:'Admin',email:'admin@example.com',role:'admin',active:true,password_hash:'secret'}),{id:'1',name:'Admin',email:'admin@example.com',role:'admin',active:true});
});

test('member passwords accept one character but cannot be empty',async()=>{
 const hash=await hashPassword('a',1);
 assert.equal(await verifyPassword('a',hash),true);
 await assert.rejects(hashPassword('',1),/1 and 128/);
});

test('older WebKit writes accept an exact same-host Referer when Origin is absent',()=>{
 const headers={host:'term-lead.vercel.app',referer:'https://term-lead.vercel.app/'};
 assert.doesNotThrow(()=>sameOrigin({method:'POST',headers}));
 for(const referer of ['https://attacker.example/','https://term-lead.vercel.app.attacker.example/','bad url',undefined])assert.throws(()=>sameOrigin({method:'POST',headers:{...headers,referer}}),error=>error.status===403);
 for(const origin of ['null','https://attacker.example','bad url'])assert.throws(()=>sameOrigin({method:'POST',headers:{...headers,origin}}),error=>error.status===403);
});
