import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { mkdir } from 'node:fs/promises';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const prefix='projects/classroom-diary-098bae6e/databases/(default)/documents';
let submitted,writerRead=0,commitRead=0,signup=0,queries=0;
const row=(body,i)=>({document:{name:`${prefix}/teacherHubFeedback/issue-1/comments/${String(i).padStart(36,'0')}`,fields:{body:{stringValue:body},createdAt:{timestampValue:'2026-10-01T00:00:00Z'}}}});
try{
 await page.route('https://identitytoolkit.googleapis.com/**',async route=>{signup++;await route.fulfill({json:{idToken:'synthetic-token',refreshToken:'synthetic-refresh',localId:'synthetic-ui',expiresIn:'3600'}});});
 await page.route('https://firestore.googleapis.com/**',async route=>{
  const url=route.request().url();
  if(url.endsWith(':runQuery')){queries++;const q=route.request().postDataJSON().structuredQuery;assert.equal(q.limit,21);const rows=submitted?[row(submitted,99)]:q.startAt?[row('이전 의견입니다.',22)]:Array.from({length:21},(_,i)=>row(i===0?'<img src=x onerror=alert(1)>':'수업 활용에 도움이 됩니다.',i+1));await route.fulfill({json:rows});}
  else if(url.endsWith(':commit')){commitRead++;const writes=route.request().postDataJSON().writes;assert.equal(writes.length,3);assert.deepEqual(Object.keys(writes[0].update.fields),['body']);if(commitRead===1)await route.fulfill({status:409,json:{error:{status:'ABORTED'}}});else{submitted=writes[0].update.fields.body.stringValue;await route.fulfill({json:{commitTime:new Date().toISOString()}});}}
  else if(url.includes('teacherHubFeedbackWriters')){writerRead++;await route.fulfill(writerRead>2?{json:{fields:{updatedAt:{timestampValue:new Date().toISOString()}},updateTime:new Date().toISOString()}}:{status:404,json:{error:{status:'NOT_FOUND'}}});}
  else await route.fulfill({status:404,json:{error:{status:'NOT_FOUND'}}});
 });
 await page.goto(process.argv[3]||'http://127.0.0.1:4188/');await page.locator('.feedback-open').first().click();
 await page.waitForFunction(()=>document.querySelectorAll('.feedback-entry').length===20);
 assert.equal(await page.locator('#feedback-dialog').evaluate(e=>e.open),true);
 assert.equal(await page.locator('#feedback-list img').count(),0);
 assert.match(await page.locator('#feedback-list').innerText(),/<img/);
 assert.equal(signup,0);
 await page.locator('#feedback-more').click();await page.waitForFunction(()=>document.querySelectorAll('.feedback-entry').length===21);
 assert.equal(await page.locator('#feedback-more').isHidden(),true);
 await page.locator('#feedback-body').fill('synthetic@example.invalid');await page.locator('#feedback-submit').click();await page.waitForFunction(()=>document.querySelector('#feedback-status').textContent.includes('이메일'));
 assert.equal(signup,0);
 await page.locator('#feedback-body').fill('직접 사용해 보니 수업에 활용하기 편리했습니다.');await page.locator('#feedback-submit').click();await page.waitForFunction(()=>document.querySelector('#feedback-status').textContent.includes('공개되었습니다'));
 assert.equal(commitRead,2);assert.equal(signup,1);assert.equal(await page.locator('#feedback-body').inputValue(),'');
 await page.waitForFunction(()=>document.querySelectorAll('.feedback-entry').length===1);
 await page.locator('#feedback-body').fill('추가 의견입니다.');await page.locator('#feedback-submit').click();await page.waitForFunction(()=>document.querySelector('#feedback-status').textContent.includes('5초'));
 assert.equal(await page.locator('#feedback-body').inputValue(),'추가 의견입니다.');assert.equal(commitRead,2);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#feedback-dialog').evaluate(e=>e.open),false);
 await page.setViewportSize({width:320,height:780});await page.locator('.feedback-open').first().click();
 await page.waitForFunction(()=>document.querySelectorAll('.feedback-entry').length===1);
 assert.equal(await page.locator('#feedback-body').inputValue(),'');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.equal(await page.locator('#feedback-dialog').evaluate(e=>e.scrollWidth>e.clientWidth),false);
 assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);
 assert.deepEqual(errors,[]);
 await mkdir('qa',{recursive:true});await page.screenshot({path:'qa/feedback-mobile.png'});
 console.log('PASS: feedback UI, pagination, safe text, validation, conflict retry, cooldown, memory-only session, keyboard and mobile');
}finally{await context.close();await browser.close();}
