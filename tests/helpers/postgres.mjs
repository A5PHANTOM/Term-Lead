// Run API handlers against an isolated PostgreSQL schema in integration tests.
import pg from 'pg';
import { randomUUID } from 'node:crypto';
export async function testDatabase(url) {
 const schema='termjobs_test_'+randomUUID().replaceAll('-','');
 const root=new pg.Pool({connectionString:url});
 await root.query(`CREATE SCHEMA ${schema}`);
 const pool=new pg.Pool({connectionString:url,options:`-c search_path=${schema}`});
 const sql=(parts,...values)=>{
  const text=parts.reduce((s,part,i)=>s+(i?'$'+i:'')+part,'');
  return {text,values,then(resolve,reject){return pool.query(text,values).then(r=>r.rows).then(resolve,reject);}};
 };
 sql.transaction=async queries=>{
  const client=await pool.connect();
  try{await client.query('BEGIN');const rows=[];for(const query of queries)rows.push((await client.query(query.text,query.values)).rows);await client.query('COMMIT');return rows;}
  catch(error){await client.query('ROLLBACK');throw error;}
  finally{client.release();}
 };
 return {sql,pool,async close(){await pool.end();await root.query(`DROP SCHEMA ${schema} CASCADE`);await root.end();}};
}
