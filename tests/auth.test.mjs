import test from 'node:test';import assert from 'node:assert/strict';
import {authenticated,setSession} from '../lib/auth.js';
import session from '../api/session.js';
process.env.APP_PASSWORD='test-private-workspace';process.env.DATABASE_URL='postgresql://example.invalid/test';
function res(){return {code:200,headers:{},setHeader(k,v){this.headers[k]=v},status(code){this.code=code;return this},json(body){this.body=body;return this},end(){return this}};}
test('session cookie authenticates without exposing password',()=>{const r=res();setSession(r);const cookie=r.headers['Set-Cookie'];assert.ok(cookie.includes('HttpOnly; Secure; SameSite=Lax'));assert.ok(cookie.includes('Max-Age=2592000'));assert.ok(!cookie.includes(process.env.APP_PASSWORD));assert.ok(authenticated({headers:{cookie}}));assert.equal(authenticated({headers:{cookie:cookie.replace('tj_session=','tj_session=1')}}),false);});
test('missing and forged cookies cannot authenticate',()=>{assert.equal(authenticated({headers:{}}),false);assert.equal(authenticated({headers:{cookie:'tj_session=9999999999999.forged'}}),false);assert.equal(authenticated({headers:{authorization:'Bearer wrong'}}),false);});
test('password login issues persistent cookie',async()=>{const r=res();await session({method:'POST',headers:{},body:{password:process.env.APP_PASSWORD}},r);assert.equal(r.code,200);assert.ok(r.headers['Set-Cookie']);});
test('incorrect password and cross-origin login are rejected',async()=>{let r=res();await session({method:'POST',headers:{},body:{password:'wrong'}},r);assert.equal(r.code,401);r=res();await session({method:'POST',headers:{origin:'https://other.example',host:'term-lead.vercel.app'},body:{password:process.env.APP_PASSWORD}},r);assert.equal(r.code,403);});
