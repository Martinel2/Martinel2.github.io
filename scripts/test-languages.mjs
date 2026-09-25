import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import puppeteer from 'puppeteer';
const root=resolve('site');
const server=createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname;
 const file=resolve(root,'.'+(path.endsWith('/')?path+'index.html':path));
 if(!file.startsWith(root+'/'))throw Error('Invalid path');
 res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');
 res.end(await readFile(file));
}catch{res.writeHead(404).end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await puppeteer.launch({headless:true,args:process.env.CI?['--no-sandbox']:[]});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [1440,390,320]){
  await page.setViewport({width,height:1000});
  for(const route of ['','portfolio.html','resume.html']){
   await page.goto(`${base}/en/${route}`,{waitUntil:'networkidle2'});
   assert.equal(await page.$eval('html',e=>e.lang),'en');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Overflow ${route} ${width}`);
   assert.equal(await page.evaluate(()=>/[가-힣]/.test(document.body.innerText.replaceAll('한국어',''))),false);
   const resources=await page.$$eval('a[href],img[src],link[href],script[src]',els=>els.map(e=>e.href||e.src).filter(url=>url.startsWith(location.origin)));
   for(const url of resources){const path=new URL(url).pathname;await stat(resolve(root,'.'+(path.endsWith('/')?path+'index.html':path)));}
   const documents=await page.$$eval('a[href*="resume.pdf"],a[href*="resume.docx"]',els=>els.map(e=>new URL(e.href).pathname));
   assert.ok(documents.length);assert.ok(documents.every(path=>path.startsWith('/en/')));
   if(route==='portfolio.html'){
    await page.waitForFunction(()=>document.documentElement.dataset.diagrams==='ready');
    assert.equal(await page.$$eval('.mermaid svg',els=>els.length),6);
   }
   if(route===''){
    await page.click('.home-actions a[href^="resume.pdf"]');
    assert.ok(await page.$eval('#resume-format-dialog',e=>e.open));
    assert.equal(await page.$eval('#resume-format-dialog a[download]',e=>e.download),'Jaehyeong_Kim_Resume.docx');
    await page.keyboard.press('Escape');
    await page.click('.project-cover');
    assert.ok(await page.$eval('#fruition-dialog',e=>e.open));
    assert.equal(await page.$eval('#fruition-dialog',e=>e.scrollWidth<=e.clientWidth+1),true);
    await page.keyboard.press('Escape');
   }
   const hash=route==='portfolio.html'?'#fruition-jev-evidence':route==='resume.html'?'#pilltip':'#skills';
   await page.evaluate(hash=>location.hash=hash,hash);
   await page.waitForFunction(hash=>document.querySelector('.language-switch').hash===hash,{},hash);
   await page.click('.language-switch');
   assert.equal(new URL(page.url()).pathname,'/'+route);assert.equal(new URL(page.url()).hash,hash);
   await page.click('.language-switch');
   assert.equal(new URL(page.url()).pathname,'/en/'+route);assert.equal(new URL(page.url()).hash,hash);
   await page.screenshot({path:`artifacts/en-${route||'home'}-${width}.png`});
  }
 }
 await page.setJavaScriptEnabled(false);await page.goto(base+'/en/');
 assert.equal(await page.$eval('html',e=>e.lang),'en');assert.ok(await page.$('a.language-switch[href="../"]'));
 assert.deepEqual(errors,[]);
 console.log('PASS: English pages, no untranslated text, links, assets, diagrams, dialogs, documents, responsive layout, language/anchor round trips and no-JS fallback');
}finally{await browser.close();await new Promise(done=>server.close(done));}
