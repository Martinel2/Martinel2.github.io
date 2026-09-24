import assert from 'node:assert/strict';
import {readFileSync, mkdirSync} from 'node:fs';
import {createServer} from 'node:http';
import puppeteer from 'puppeteer';
import worker from './worker.mjs';
import {validate} from './editor.mjs';
const content=JSON.parse(readFileSync(new URL('../content.json',import.meta.url),'utf8'));
validate(content,content);
const changed=structuredClone(content);changed.cases[0].id='bad';assert.throws(()=>validate(changed,content));
changed.cases[0].id=content.cases[0].id;changed.writings[0].url='javascript:alert(1)';assert.throws(()=>validate(changed,content));
const badHome=structuredClone(content);badHome.home.sections.writingsUrl='javascript:alert(1)';assert.throws(()=>validate(badHome,content));
let stored=structuredClone(content),sha='abc',writes=0,fail=false;
const nativeFetch=globalThis.fetch;
globalThis.fetch=async(url,options={})=>{
 if(String(url).startsWith('https://raw.githubusercontent.com/'))return new Response(JSON.stringify(stored));
 assert.match(String(url),/^https:\/\/api.github.com\/repos\/Martinel2\/Martinel2.github.io\/contents\/content.json/);
 if(fail)return new Response('{}',{status:403});
 if(options.method==='PUT'){
  const body=JSON.parse(options.body);assert.equal(body.sha,sha);assert.equal(body.branch,'main');
  stored=JSON.parse(Buffer.from(body.content,'base64').toString());sha='next'+(++writes);
  return Response.json({content:{sha},commit:{html_url:'https://github.com/Martinel2/Martinel2.github.io/commit/test'}});
 }
 return Response.json({sha,content:Buffer.from(JSON.stringify(stored)).toString('base64')});
};
const password='test-password-for-admin-at-least-32-characters';
const env={ADMIN_PASSWORD:password,GITHUB_TOKEN:'test-only',ASSETS:{async fetch(request){return new Response(readFileSync(new URL('./public'+new URL(request.url).pathname,import.meta.url)),{headers:{'Content-Type':request.url.endsWith('.js')?'text/javascript':'text/html'}});}}};
const auth='Basic '+Buffer.from('admin:'+password).toString('base64');
async function call(path,options={}){return worker.fetch(new Request('https://editor.test'+path,options),env,{});}
for(const path of ['/admin','/admin/index.html','/admin/editor.js','/admin/api/content'])assert.equal((await call(path)).status,401);
assert.equal((await call('/admin/api/content',{method:'POST',headers:{Authorization:auth,Origin:'https://evil.test','X-Editor-Action':'save','Content-Type':'application/json'},body:'{}'})).status,403);
const postHeaders={Authorization:auth,Origin:'https://editor.test','X-Editor-Action':'save','Content-Type':'application/json'};
assert.equal((await call('/admin/api/content',{method:'POST',headers:postHeaders,body:JSON.stringify({sha:'stale',data:content})})).status,409);
assert.equal(writes,0);
const missing={...env,GITHUB_TOKEN:undefined};
const readOnly=await worker.fetch(new Request('https://editor.test/admin/api/content',{headers:{Authorization:auth}}),missing,{});
assert.equal(readOnly.status,200);const publicRead=await readOnly.json();assert.equal(publicRead.canSave,false);assert.match(publicRead.sha,/^[a-f0-9]{40}$/);assert.equal(publicRead.data.overview.title,content.overview.title);
assert.equal((await worker.fetch(new Request('https://editor.test/admin/api/content',{method:'POST',headers:postHeaders,body:'{}'}),missing,{})).status,503);
const server=createServer(async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const response=await worker.fetch(new Request('http://127.0.0.1:'+server.address().port+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})}),env,{});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(e){res.writeHead(500);res.end(String(e));}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await puppeteer.launch({headless:true});
try{
 const page=await browser.newPage();await page.authenticate({username:'admin',password});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/admin`);
 await page.waitForSelector('#field-home-hero-greeting');
 assert.match(await page.$eval('#intro-preview',e=>e.textContent),/안녕하세요,[\s\S]*김재형입니다/);
 assert.ok(await page.$('[data-path="home.actions"]'));
 await page.$eval('#field-home-hero-greeting',input=>{input.value='반갑습니다,';input.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.match(await page.$eval('#intro-preview',e=>e.textContent),/반갑습니다,/);
 // Resume editing order must follow the visible template, independently of text IDs.
 const template=readFileSync(new URL('../templates/resume.html',import.meta.url),'utf8');
 const order=[...template.matchAll(/@@(text\d+)@@/g)].map(m=>m[1]);
 for(let i=0;i<content.resume.length;i++){
  const fields=content.resume[i].fields;
  await page.click(`[data-path="resume.${i}"]`);
  const actual=await page.$$eval('#fields textarea',inputs=>inputs.map(input=>({key:input.id.split('-').at(-1),value:input.value})));
  assert.deepEqual(actual,order.filter(k=>k in fields).map(key=>({key,value:fields[key]})));
 }
 const projectIndex=content.resume.findIndex(s=>'text21' in s.fields);
 await page.click(`[data-path="resume.${projectIndex}"]`);
 assert.match(await page.$eval('label[for$="-text54"]',e=>e.textContent),/비용 산정 기준/);
 assert.equal(await page.$$eval('#fields .group > .group',groups=>groups.length),11);
 await page.click('[data-path="overview"]');

 await page.$eval('#field-overview-title',input=>{input.value='테스트 소개 <안전>';input.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.click('#review');await page.waitForSelector('dialog[open]');
 assert.match(await page.$eval('#changes',e=>e.textContent),/테스트 소개 <안전>/);
 await page.click('#save');await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('저장됐습니다'));
 assert.equal(stored.home.hero.greeting,'반갑습니다,');assert.equal(stored.overview.title,'테스트 소개 <안전>');assert.equal(writes,1);
 await page.$eval('#field-overview-title',input=>{input.value='충돌 시 보존할 문장';input.dispatchEvent(new Event('input',{bubbles:true}));});
 sha='changed-elsewhere';await page.click('#review');await page.click('#save');
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('다른 곳에서'));
 assert.equal(await page.$eval('#field-overview-title',e=>e.value),'충돌 시 보존할 문장');assert.equal(writes,1);
 // A stalled save must stop blocking the editor without losing the draft.
 await page.setRequestInterception(true);
 page.on('request',request=>{if(request.method()!=='POST')request.continue();});
 await page.evaluate(()=>{AbortSignal.timeout=()=>{const c=new AbortController();setTimeout(()=>c.abort(new DOMException('Timed out','TimeoutError')),500);return c.signal;};});
 await page.click('#review');await page.click('#save');
 assert.equal(await page.$eval('#save',e=>e.disabled),true);
 assert.match(await page.$eval('#save-status',e=>e.textContent),/저장 중/);
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('대기를 중단'));
 assert.equal(await page.$eval('#field-overview-title',e=>e.value),'충돌 시 보존할 문장');
 assert.equal(await page.$eval('#review',e=>e.disabled),false);
 assert.equal(await page.$eval('#backup',e=>e.disabled),false);
 assert.equal(writes,1);
 await page.setViewport({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 mkdirSync(new URL('../artifacts',import.meta.url),{recursive:true});await page.screenshot({path:new URL('../artifacts/admin-mobile.png',import.meta.url).pathname,fullPage:true});
 await page.setViewport({width:1440,height:960});await page.screenshot({path:new URL('../artifacts/admin-desktop.png',import.meta.url).pathname});
 assert.deepEqual(errors,[]);
 fail=true;assert.equal((await call('/admin/api/content',{headers:{Authorization:auth}})).status,502);
 console.log('PASS: admin authentication, CSRF, immutable identifiers/URLs, missing token, GitHub save, stale edit conflict, retained draft, stalled-save timeout and visible progress, responsive UI, escaped review, upstream errors');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));globalThis.fetch=nativeFetch;}
