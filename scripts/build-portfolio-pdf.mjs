import puppeteer from 'puppeteer';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

// Print portfolio.html after the Mermaid diagrams render, so the PDF matches the page.
export async function buildPortfolioPdf(browser, lang='ko') {
  const dir=lang==='en'?'site/en':'site';
  const name=lang==='en'?'Jaehyeong Kim · Portfolio':'김재형 · 포트폴리오';
  const page=await browser.newPage();
  await page.setViewport({width:1200,height:1600});
  const warnings=[];page.on('console',m=>{if(m.type()==='warn'||m.type()==='error')warnings.push(m.text());});
  // The diagrams load from a CDN, so retry a transient failure before giving up.
  let diagrams;
  for(let attempt=0;attempt<3&&diagrams!=='ready';attempt++){
    await page.goto(pathToFileURL(resolve(dir,'portfolio.html')).href,{waitUntil:'load'});
    await page.waitForFunction(()=>document.documentElement.dataset.diagrams,{timeout:30000});
    diagrams=await page.evaluate(()=>document.documentElement.dataset.diagrams);
  }
  if(diagrams!=='ready')throw Error('Mermaid diagrams did not render for the portfolio PDF: '+warnings.join(' | '));
  // Point page-relative links at the public site; same-page anchors stay inside the PDF.
  await page.$$eval('a[href]',(links,base)=>links.forEach(a=>{const href=a.getAttribute('href');if(!href.startsWith('#'))a.href=new URL(href,base).href;}),'https://martinel2.github.io/'+(lang==='en'?'en/':''));
  await page.$$eval('img',async imgs=>{for(const img of imgs)img.loading='eager';await Promise.all(imgs.map(img=>img.decode().catch(()=>{})));});
  await page.evaluate(()=>document.fonts.ready);
  await page.emulateMediaType('print');
  await page.pdf({path:dir+'/portfolio.pdf',format:'A4',printBackground:true,tagged:true,
    margin:{top:'14mm',bottom:'16mm',left:'14mm',right:'14mm'},displayHeaderFooter:true,headerTemplate:'<span></span>',
    footerTemplate:`<div style="width:100%;font-size:7px;color:#7d8da3;padding:0 14mm;display:flex;justify-content:space-between;font-family:sans-serif"><span>${name}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`});
  await page.close();
  console.log(`Built ${dir}/portfolio.pdf with rendered diagrams.`);
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
  const browser=await puppeteer.launch({headless:true,args:process.env.CI?['--no-sandbox']:[]});
  try{for(const lang of ['ko','en'])await buildPortfolioPdf(browser,lang);}finally{await browser.close();}
}
