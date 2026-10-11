import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
const { chromium }=await import(pathToFileURL(process.argv[2]).href);
const base=process.argv[3]||'http://127.0.0.1:4188/';
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1536,height:1050}});
const page=await context.newPage();
const errors=[], external=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(!r.url().startsWith(base))external.push(r.url());});
await mkdir(new URL('../qa/',import.meta.url),{recursive:true});
const screenshot=async name=>page.screenshot({path:fileURLToPath(new URL(`../qa/${name}.png`,import.meta.url)),fullPage:true});
const check=(name,pass)=>{assert.ok(pass,name);console.log(name);};
try{
  const response=await page.goto(base);check('HTTPS/local page loads',response.status()===200);
  await page.waitForSelector('.hub-card:not(.invitation)');
  check('real hub card opens isolated new tab',await page.locator('.hub-card:not(.invitation)').first().getAttribute('rel')==='noopener noreferrer');
  check('desktop five columns',(await page.locator('.card-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length))===5);
  await screenshot('desktop');
  await page.locator('.hub-card:not(.invitation)').first().hover();
  await page.waitForTimeout(1500);
  check('slow 3D rotation',await page.locator('.hub-card:not(.invitation)').first().evaluate(e=>getComputedStyle(e).transform!=='none'&&getComputedStyle(e).transitionDuration.includes('2.8s')));
  await page.emulateMedia({reducedMotion:'reduce'});
  check('reduced motion disables rotation',await page.locator('.hub-card:not(.invitation)').first().evaluate(e=>getComputedStyle(e).transform==='none'));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('#search').fill('찾을수없는합성문구');check('empty search explained',await page.locator('#empty').isVisible());
  await page.locator('#search').fill('');await page.getByRole('button',{name:'교과 학습',exact:true}).click();check('category filters working',await page.locator('#empty').isVisible());
  await page.getByRole('button',{name:'전체',exact:true}).click();
  for(const [width,columns] of [[1100,4],[850,3],[390,2],[360,1]]){await page.setViewportSize({width,height:900});check(`responsive ${width}px ${columns} columns`,await page.locator('.card-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length)===columns);check(`no horizontal overflow ${width}px`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await page.setViewportSize({width:390,height:900});await screenshot('mobile');
  await page.locator('#copy-prompt').click();await page.waitForFunction(()=>document.getElementById('copy-status').textContent!=='');check('copy success or manual fallback available',await page.locator('#copy-status').innerText()!=='');
  const seed=JSON.parse(await readFile(new URL('../data/hubs.json',import.meta.url),'utf8'))[0];
  if(!seed)throw new Error('Browser test requires populated registry');
  const sample=Array.from({length:7},(_,i)=>({...seed,id:`sample-${i}`,title:`합성 허브 ${i+1}`,url:`https://sample.github.io/tools-${i}/`,symbol:['sun','moon','star','book','compass'][i%5]}));
  await page.route('**/hubs.json',route=>route.fulfill({json:sample}));await page.setViewportSize({width:1536,height:1050});await page.reload();await page.waitForSelector('.hub-card:not(.invitation)');check('additional cards extend into new rows',await page.locator('.hub-card:not(.invitation)').count()===7);await screenshot('synthetic-grid');
  await page.route('**/hubs.json',route=>route.fulfill({json:[{...seed,url:'javascript:alert(1)'}]}));await page.reload();check('unsafe manifest fails closed',await page.locator('#load-error').isVisible());
  check('no runtime errors',errors.length===0);check('no external resource requests',external.length===0);
}finally{await browser.close();}
