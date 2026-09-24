import puppeteer from 'puppeteer';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const browser=await puppeteer.launch({headless:true,args:process.env.CI?['--no-sandbox']:[]});
try{
 const page=await browser.newPage();
 await page.goto(pathToFileURL(resolve('site/resume.html')).href,{waitUntil:'load'});
 const sheets=await page.evaluate(()=>{
  const sections=[...document.querySelectorAll('.resume-section')];
  const copy=el=>el.cloneNode(true);
  const html=el=>{el.querySelectorAll('a').forEach(a=>a.href=new URL(a.getAttribute('href'),'https://martinel2.github.io/').href);el.querySelectorAll('.print-button,.resume-section>h2>span').forEach(e=>e.remove());return el.outerHTML;};
  const section=(title,body)=>`<section><h2>${title}</h2>${body}</section>`;
  const hero=copy(document.querySelector('.resume-hero'));
  hero.querySelector('.eyebrow').textContent='김재형 · Backend / AI Application Developer';
  hero.querySelectorAll('p:not(.eyebrow):not(.resume-role)').forEach(e=>e.remove());
  hero.querySelectorAll('h1 br').forEach(e=>e.replaceWith(document.createTextNode(' ')));
  const summary=copy(sections[0].querySelector('.resume-content'));summary.querySelectorAll('p').forEach(e=>e.remove());
  const projects=[...document.querySelectorAll('.resume-project')];
  return [
   html(hero)+section('SUMMARY',html(summary))+section('PROJECTS & EXPERIENCE',html(copy(projects[0]))),
   section('PROJECTS & EXPERIENCE',html(copy(projects[1])))+html(copy(sections[3])),
   html(copy(sections[2]))+html(copy(sections[5]))+html(copy(sections[4]))
  ];
 });
 const css=await readFile('templates/resume-pdf.css','utf8');
 const base=pathToFileURL(resolve('site')+'/').href;
 const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><base href="${base}"><style>${css}</style></head><body>${sheets.map((body,i)=>`<article class="sheet"><div class="sheet-content">${body}</div><footer>김재형 · Backend / AI Application Developer <span>${i+1} / 3</span></footer></article>`).join('')}</body></html>`;
 await mkdir('artifacts',{recursive:true});await writeFile('artifacts/resume-pdf.html',html);
 await page.setContent(html,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
 await page.$$eval('img',async imgs=>{for(const img of imgs)img.loading='eager';await Promise.all(imgs.map(img=>img.decode()));});
 await page.emulateMediaType('print');
 const overflow=await page.$$eval('.sheet',sheets=>sheets.map((s,i)=>({page:i+1,bottom:s.querySelector('.sheet-content').getBoundingClientRect().bottom,limit:s.querySelector('footer').getBoundingClientRect().top})).filter(s=>s.bottom>s.limit-10));
 if(overflow.length)throw Error('Resume content exceeds page: '+JSON.stringify(overflow));
 await page.pdf({path:'site/resume.pdf',format:'A4',printBackground:true,preferCSSPageSize:true,tagged:true});
 console.log('Built 3-page site/resume.pdf; all content fits.');
}finally{await browser.close();}
