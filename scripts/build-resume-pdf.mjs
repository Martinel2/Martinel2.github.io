import {buildResumeDocx} from './build-resume-docx.mjs';
import puppeteer from 'puppeteer';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const browser=await puppeteer.launch({headless:true,args:process.env.CI?['--no-sandbox']:[]});
try{
 for (const lang of ['ko','en']) {
 const dir=lang==='en'?'site/en':'site';
 const suffix=lang==='en'?'-en':'';
 const name=lang==='en'?'Jaehyeong Kim':'김재형';
 const page=await browser.newPage();
 await page.goto(pathToFileURL(resolve(dir,'resume.html')).href,{waitUntil:'load'});
 const sheets=await page.evaluate(({name,lang})=>{
  const sections=[...document.querySelectorAll('.resume-section')];
  const copy=el=>el.cloneNode(true);
  const html=el=>{el.querySelectorAll('a').forEach(a=>a.href=new URL(a.getAttribute('href'),'https://martinel2.github.io/'+(lang==='en'?'en/':'')).href);el.querySelectorAll('.resume-download,.resume-section>h2>span').forEach(e=>e.remove());return el.outerHTML;};
  const section=(title,body)=>`<section><h2>${title}</h2>${body}</section>`;
  const hero=copy(document.querySelector('.resume-hero'));
  hero.querySelector('.eyebrow').textContent=name+' · Backend / AI Application Developer';
  hero.querySelectorAll('p:not(.eyebrow):not(.resume-role)').forEach(e=>e.remove());
  hero.querySelectorAll('h1 br').forEach(e=>e.replaceWith(document.createTextNode(' ')));
  const summary=copy(sections[0].querySelector('.resume-content'));summary.querySelectorAll('p').forEach(e=>e.remove());
  const projects=[...document.querySelectorAll('.resume-project')];
  const first=copy(projects[0]),continued=copy(projects[0]);
  // Keep topic blocks intact across pages instead of shrinking the expanded labels.
  [...first.querySelectorAll('.resume-topic')].slice(2).forEach(e=>e.remove());
  const firstTopics=first.querySelectorAll('.resume-topic');
  for(let node=firstTopics[firstTopics.length-1].nextElementSibling;node;){const next=node.nextElementSibling;node.remove();node=next;}
  const continuedTopics=[...continued.querySelectorAll('.resume-topic')];
  for(const child of [...continued.children]){
    if(child.matches('.resume-project-title'))continue;
    if(child===continuedTopics[2])break;
    child.remove();
  }
  continued.querySelector('h3').textContent+=lang==='en'?' — continued':' — 계속';
  return [
   html(hero)+section('SUMMARY',html(summary))+section('PROJECTS & EXPERIENCE',html(first)),
   section('PROJECTS & EXPERIENCE',html(continued)),
   section('PROJECTS & EXPERIENCE',html(copy(projects[1])))+html(copy(sections[2])),
   html(copy(sections[3]))+html(copy(sections[5]))+html(copy(sections[4]))
  ];
 },{name,lang});
 const css=await readFile('templates/resume-pdf.css','utf8');
 const base=pathToFileURL(resolve(dir)+'/').href;
 const html=`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><base href="${base}"><style>${lang==='en'?css.replaceAll("url('assets/","url('../assets/"):css}</style></head><body>${sheets.map((body,i)=>`<article class="sheet"><div class="sheet-content">${body}</div><footer>${name} · Backend / AI Application Developer <span>${i+1} / ${sheets.length}</span></footer></article>`).join('')}</body></html>`;
 await mkdir('artifacts',{recursive:true});await writeFile(`artifacts/resume-pdf${suffix}.html`,html);
 await page.setContent(html,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
 await page.$$eval('img',async imgs=>{for(const img of imgs)img.loading='eager';await Promise.all(imgs.map(img=>img.decode()));});
 await page.emulateMediaType('print');
 const overflow=await page.$$eval('.sheet',sheets=>sheets.map((s,i)=>({page:i+1,bottom:s.querySelector('.sheet-content').getBoundingClientRect().bottom,limit:s.querySelector('footer').getBoundingClientRect().top})).filter(s=>s.bottom>s.limit-10));
 if(overflow.length)throw Error('Resume content exceeds page: '+JSON.stringify(overflow));
 await page.pdf({path:dir+'/resume.pdf',format:'A4',printBackground:true,preferCSSPageSize:true,tagged:true});
 console.log(`Built ${sheets.length}-page ${dir}/resume.pdf; all content fits.`);
 await buildResumeDocx(page, lang);
 await page.close();
 }
}finally{await browser.close();}
