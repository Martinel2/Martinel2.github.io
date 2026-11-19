import {buildResumeDocx} from './build-resume-docx.mjs';
import puppeteer from 'puppeteer';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const browser=await puppeteer.launch({headless:true,args:process.env.CI?['--no-sandbox']:[]});
try{
 // RESUME_DIR/RESUME_LANGS let a local build reuse this layout for an extra section.
 for (const lang of (process.env.RESUME_LANGS||'ko,en').split(',')) {
 const dir=process.env.RESUME_DIR||(lang==='en'?'site/en':'site');
 const suffix=lang==='en'?'-en':'';
 const name=lang==='en'?'Jaehyeong Kim':'김재형';
 const page=await browser.newPage();
 // The page already holds the resume in reading order; print it with the case-style sheet.
 await page.goto(pathToFileURL(resolve(dir,'resume.html')).href,{waitUntil:'load'});
 const body=await page.evaluate(lang=>{
  const el=document.querySelector('.resume-shell').cloneNode(true);
  el.querySelectorAll('.cv-actions').forEach(e=>e.remove());
  // A cover-letter build adds .resume-lead sections; they read right after the name and contacts.
  el.querySelector('.cv-header').after(...el.querySelectorAll('.resume-lead'));
  el.querySelectorAll('a').forEach(a=>a.href=new URL(a.getAttribute('href'),'https://martinel2.github.io/'+(lang==='en'?'en/':'')).href);
  return el.outerHTML;
 },lang);
 const css=await readFile('templates/resume-pdf.css','utf8');
 const base=pathToFileURL(resolve(dir)+'/').href;
 const extra=process.env.RESUME_EXTRA_CSS||''; // a local build can tighten print spacing only
 const html=`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><base href="${base}"><style>${lang==='en'?css.replaceAll("url('assets/","url('../assets/"):css}${extra}</style></head><body>${body}</body></html>`;
 await mkdir('artifacts',{recursive:true});await writeFile(`artifacts/resume-pdf${suffix}.html`,html);
 await page.setContent(html,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
 await page.$$eval('img',async imgs=>{for(const img of imgs)img.loading='eager';await Promise.all(imgs.map(img=>img.decode()));});
 await page.emulateMediaType('print');
 await page.pdf({path:dir+'/resume.pdf',format:'A4',printBackground:true,preferCSSPageSize:true,tagged:true,displayHeaderFooter:true,headerTemplate:'<span></span>',
  footerTemplate:`<div style="width:100%;font-size:8px;color:#7d8da3;padding:0 14mm;display:flex;justify-content:space-between;font-family:Helvetica,Arial,'Noto Sans CJK KR',sans-serif"><span>${name} | AI Engineer</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`});
 console.log(`Built ${dir}/resume.pdf with the case-style layout.`);
 await buildResumeDocx(page, lang);
 await page.close();
 }
}finally{await browser.close();}
