import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:320,height:780}}),page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
let exists=true,deletes=0,logins=0;
const name='projects/classroom-diary-098bae6e/databases/(default)/documents/teacherHubFeedback/issue-1/comments/11111111-1111-4111-8111-111111111111';
try{
 await page.route('https://identitytoolkit.googleapis.com/**',async route=>{assert.ok(route.request().url().includes('signInWithPassword'));logins++;const body=route.request().postDataJSON();await route.fulfill(body.password==='synthetic-delete'?{json:{idToken:'synthetic-moderator'}}:{status:400,json:{error:{message:'INVALID_LOGIN_CREDENTIALS'}}});});
 await page.route('https://firestore.googleapis.com/**',async route=>{
  if(route.request().method()==='DELETE'){deletes++;assert.equal(route.request().headers().authorization,'Bearer synthetic-moderator');assert.ok(route.request().url().endsWith(name));exists=false;await route.fulfill({status:204,body:''});}
  else await route.fulfill({json:exists?[{document:{name,fields:{body:{stringValue:'삭제 동작 확인용 합성 의견입니다.'},createdAt:{timestampValue:'2026-10-01T00:00:00Z'}}}}]:[]});
 });
 await page.goto(process.argv[3]||'http://127.0.0.1:4188/');await page.locator('.feedback-open').first().click();await page.locator('.feedback-delete').first().click();
 assert.equal(await page.locator('#feedback-delete-password').getAttribute('type'),'password');
 await page.locator('#feedback-delete-password').fill('wrong-synthetic');await page.locator('#feedback-delete-confirm').click();await page.waitForFunction(()=>document.querySelector('#feedback-delete-status').textContent.includes('올바르지'));
 assert.equal(deletes,0);assert.equal(await page.locator('#feedback-delete-password').inputValue(),'');
 await page.locator('#feedback-delete-cancel').click();assert.equal(await page.locator('.feedback-entry').count(),1);
 await page.locator('.feedback-delete').click();await page.locator('#feedback-delete-password').fill('synthetic-delete');await page.locator('#feedback-delete-confirm').click();
 await page.waitForFunction(()=>document.querySelector('#feedback-status').textContent.includes('삭제했습니다'));
 await page.waitForFunction(()=>document.querySelectorAll('.feedback-entry').length===0);
 assert.equal(deletes,1);assert.equal(logins,2);assert.equal(await page.locator('#feedback-delete-dialog').evaluate(e=>e.open),false);
 assert.deepEqual(await page.evaluate(()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage)})),{local:[],session:[]});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 console.log('PASS: password deletion dialog, wrong password rejection, cancellation, cleared password, authenticated deletion, refreshed list and mobile');
}finally{await context.close();await browser.close();}
