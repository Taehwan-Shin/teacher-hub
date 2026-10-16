import test from 'node:test';
import assert from 'node:assert/strict';
import {submitHub} from '../site/register-hub.mjs';
const hub={title:'합성 허브',description:'공개 도구 모음',url:'https://synthetic.github.io/tools/',category:'수업 도구',symbol:'sun'};
async function mocked(mode){
 const native=globalThis.fetch,print=console.log;let commits=0,readBack=0,writes;
 globalThis.fetch=async (url,options={})=>{
  if(url.includes('identitytoolkit.'))return Response.json({idToken:'synthetic-token',localId:'synthetic-owner'});
  if(url.endsWith(':commit')){commits++;writes=JSON.parse(options.body).writes;if(mode==='lost')throw new Error('synthetic response loss');return Response.json({error:{}},{status:403});}
  if(url.includes('/teacherHubRequests/')){readBack++;return mode==='lost'?Response.json({fields:{state:{stringValue:'queued'}}}):Response.json({error:{}},{status:404});}
  return Response.json({error:{}},{status:404});
 };
 console.log=()=>{};
 try{return {result:await submitHub(hub),commits:()=>commits,readBack:()=>readBack,writes};}
 finally{globalThis.fetch=native;console.log=print;}
}
test('lost commit response is confirmed with the same receipt, without a second write',async()=>{const r=await mocked('lost');assert.equal(r.result.state,'queued');assert.equal(r.commits(),1);assert.equal(r.readBack(),1);assert.equal(r.writes.length,3);});
test('server rejection never reports successful registration',async()=>{await assert.rejects(mocked('denied'),/접수 제한/);});
