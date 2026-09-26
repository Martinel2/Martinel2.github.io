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
 // One continuous flow: every project, then skills, activities, education and awards.
 // Chrome paginates it, so nothing is held back for a fixed page layout.
 await page.goto(pathToFileURL(resolve(dir,'resume.html')).href,{waitUntil:'load'});
 const body=await page.evaluate(({name,lang})=>{
  const sections=[...document.querySelectorAll('.resume-section')];
  const copy=el=>el.cloneNode(true);
  const html=el=>{el.querySelectorAll('a').forEach(a=>a.href=new URL(a.getAttribute('href'),'https://martinel2.github.io/'+(lang==='en'?'en/':'')).href);el.querySelectorAll('.resume-download,.resume-section>h2>span').forEach(e=>e.remove());return el.outerHTML;};
  const section=(title,body)=>`<section><h2>${title}</h2>${body}</section>`;
  const hero=copy(document.querySelector('.resume-hero'));
  hero.querySelector('.eyebrow').textContent=name+' · Backend / AI Application Developer';
  hero.querySelectorAll('p:not(.eyebrow):not(.resume-role)').forEach(e=>e.remove());
  hero.querySelectorAll('h1 br').forEach(e=>e.replaceWith(document.createTextNode(' ')));
  const summary=copy(sections[0].querySelector('.resume-content'));summary.querySelectorAll('p').forEach(e=>e.remove());
  const projects=[...document.querySelectorAll('.resume-project')].map(p=>{
   // Keep the closing notes and links with the project's last topic instead of alone on a new page.
   const el=copy(p),topics=el.querySelectorAll('.resume-topic'),last=topics[topics.length-1];
   const tail=document.createElement('div');tail.className='resume-tail';
   for(let node=last.nextElementSibling;node;){const next=node.nextElementSibling;tail.append(node);node=next;}
   const lastItem=last.querySelector(':scope>ul>li:last-child');
   if(lastItem){const wrap=document.createElement('div');wrap.className='resume-tail';last.replaceWith(wrap);wrap.append(last,...tail.childNodes);}
   else el.append(tail);
   return html(el);
  }).join('');
  return html(hero)+section('SUMMARY',html(summary))+section('PROJECTS & EXPERIENCE',projects)
   +[2,3,5,4].map(i=>html(copy(sections[i]))).join('');
 },{name,lang});
 const css=await readFile('templates/resume-pdf.css','utf8');
 const base=pathToFileURL(resolve(dir)+'/').href;
 const flow='@page{size:A4;margin:13mm 14mm 16mm}.resume-project{box-decoration-break:clone;-webkit-box-decoration-break:clone}.resume-topic li,.experience-row,.skill-rows>div,.award-list>div,.profile-list{break-inside:avoid}h2,h3,h4,.resume-project-title,.topic-intro{break-after:avoid}.resume-tail{break-inside:avoid}';
 const html=`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><base href="${base}"><style>${lang==='en'?css.replaceAll("url('assets/","url('../assets/"):css}${flow}</style></head><body>${body}</body></html>`;
 await mkdir('artifacts',{recursive:true});await writeFile(`artifacts/resume-pdf${suffix}.html`,html);
 await page.setContent(html,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
 await page.$$eval('img',async imgs=>{for(const img of imgs)img.loading='eager';await Promise.all(imgs.map(img=>img.decode()));});
 await page.emulateMediaType('print');
 await page.pdf({path:dir+'/resume.pdf',format:'A4',printBackground:true,preferCSSPageSize:true,tagged:true,displayHeaderFooter:true,headerTemplate:'<span></span>',
  footerTemplate:`<div style="width:100%;font-size:8px;color:#7d8da3;padding:0 14mm;display:flex;justify-content:space-between;font-family:Helvetica,Arial,sans-serif"><span>${name} · Backend / AI Application Developer</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`});
 console.log(`Built ${dir}/resume.pdf as one continuous flow.`);
 await buildResumeDocx(page, lang);
 await page.close();
 }
}finally{await browser.close();}
