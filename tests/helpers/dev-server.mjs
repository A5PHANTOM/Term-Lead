// Isolated full-stack UI test workspace; never points at the production database.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createServer} from 'vite';
import {testDatabase} from './postgres.mjs';
import {createHandler as authHandler} from '../../api/auth.js';
import {createHandler as leadsHandler} from '../../api/leads.js';
import {createHandler as adminHandler} from '../../api/admin.js';
if(!process.env.TEST_DATABASE_URL)throw Error('Set TEST_DATABASE_URL to an isolated local PostgreSQL server.');
process.env.ADMIN_SETUP_TOKEN='ui-test-setup-key';
const database=await testDatabase(process.env.TEST_DATABASE_URL);
const vite=process.env.TEST_PRODUCTION_BUILD?null:await createServer({server:{middlewareMode:true},appType:'spa'});
const handlers={'/api/auth':authHandler({db:()=>database.sql}),'/api/leads':leadsHandler({db:()=>database.sql}),'/api/admin':adminHandler({db:()=>database.sql})};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(!handlers[url.pathname]){
  if(vite){vite.middlewares(req,res);return;}
  const root=resolve('dist'),path=resolve(root,'.'+url.pathname);
  if(path!==root&&!path.startsWith(root+'/')){res.writeHead(403);res.end();return;}
  const file=url.pathname==='/'?resolve(root,'index.html'):path;
  try{const body=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[extname(file)]||'application/octet-stream');res.end(body);}
  catch{res.writeHead(404);res.end();}return;
 }
 req.query=Object.fromEntries(url.searchParams);
 let body='';for await(const chunk of req)body+=chunk;
 try{req.body=body?JSON.parse(body):undefined;}catch{res.writeHead(400);res.end();return;}
 res.status=code=>{res.statusCode=code;return res;};res.json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));return res;};
 await handlers[url.pathname](req,res);
});
server.listen(5175,'127.0.0.1',()=>console.log('Isolated UI workspace: http://127.0.0.1:5175'));
async function stop(){server.close();if(vite)await vite.close();await database.close();process.exit(0);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
