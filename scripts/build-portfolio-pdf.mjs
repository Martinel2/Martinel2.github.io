import puppeteer from 'puppeteer';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

// Build a 16:9 slide deck from the rendered portfolio page, so wording, translations
// and Mermaid diagrams stay identical to the site: cover, contents, then per project an
// overview and screens, and per case an opener, process, diagram and result slides.
export async function buildPortfolioPdf(browser, lang='ko') {
  const dir=lang==='en'?'site/en':'site';
  const en=lang==='en';
  const page=await browser.newPage();
  await page.setViewport({width:1280,height:720});
  const warnings=[];page.on('console',m=>{if(m.type()==='warn'||m.type()==='error')warnings.push(m.text());});
  // The diagrams load from a CDN, so retry a transient failure before giving up.
  let diagrams;
  for(let attempt=0;attempt<3&&diagrams!=='ready';attempt++){
    await page.goto(pathToFileURL(resolve(dir,'portfolio.html')).href,{waitUntil:'load'});
    await page.waitForFunction(()=>document.documentElement.dataset.diagrams,{timeout:30000});
    diagrams=await page.evaluate(()=>document.documentElement.dataset.diagrams);
  }
  if(diagrams!=='ready')throw Error('Mermaid diagrams did not render for the portfolio PDF: '+warnings.join(' | '));

  const data=await page.evaluate(base=>{
    const text=(root,sel)=>root.querySelector(sel)?.textContent.trim()??'';
    const link=a=>({label:a.textContent.trim(),url:a.getAttribute('href').startsWith('#')?a.getAttribute('href'):new URL(a.getAttribute('href'),base).href});
    const ov=document.querySelector('.portfolio-overview');
    const overview={eyebrow:text(ov,'.overview-main .eyebrow'),title:text(ov,'h1'),description:text(ov,'.overview-description'),
      highlights:[...ov.querySelectorAll('.experience-index a')].map(a=>({title:text(a,'strong'),text:text(a,'span')})),
      name:text(ov,'.engineering-profile h2'),role:text(ov,'.profile-role'),email:text(ov,'.profile-email'),
      summary:ov.querySelector('.profile-summary').innerText.trim()};
    const contents=[...document.querySelectorAll('.toc nav a:not(.toc-extra)')].map(a=>({project:text(a,'small'),title:a.querySelector('span:nth-child(2)').lastChild.textContent.trim()}));
    const items=[];
    for(const el of document.querySelector('.cases').children){
      if(el.matches('.project-context')){
        const h3=el.querySelectorAll('h3');
        items.push({type:'project',eyebrow:text(el,'.eyebrow'),name:text(el,'h2'),description:el.querySelector('h2+p').textContent.trim(),
          originTitle:h3[0]?.textContent.trim(),origin:text(el,'.project-origin'),
          teamTitle:h3[1]?.textContent.trim(),roleLabel:text(el,'.project-role strong'),myRole:el.querySelector('.project-role')?.lastChild.textContent.trim()??'',
          team:[...el.querySelectorAll('.team-list>div')].map(d=>[text(d,'dt'),text(d,'dd')]),
          workTitle:h3[2]?.textContent.trim(),contributions:[...el.querySelectorAll('.work-list>div')].map(d=>[text(d,'dt'),text(d,'dd')]),
          links:[...el.querySelectorAll(':scope>.text-link')].map(link),galleryTitle:h3[3]?.textContent.trim(),
          gallery:[...el.querySelectorAll('.project-figure')].map(f=>{const img=f.querySelector('img');return {src:img.src,caption:text(f,'figcaption'),ratio:img.width/img.height||(+img.getAttribute('width'))/(+img.getAttribute('height'))};})});
      }else if(el.matches('.case')){
        const parts=el.querySelectorAll('.case-part');
        const heading=p=>p.querySelector('h3').lastChild.textContent.trim();
        const result=parts[3];
        items.push({type:'case',kicker:[...el.querySelectorAll('.case-kicker span')].map(s=>s.textContent.trim()),title:text(el,'h2'),
          summary:text(el,'.case-summary'),meta:text(el,'.case-meta'),tags:[...el.querySelectorAll('.tags span')].map(s=>s.textContent.trim()),
          backgroundTitle:heading(parts[0]),background:text(parts[0],'p'),
          processTitle:heading(parts[1]),steps:[...parts[1].querySelectorAll('.experiment-timeline>li')].map(li=>({title:text(li,'h4'),
            fields:[...li.querySelectorAll('p')].map(p=>[p.querySelector('strong')?.textContent.trim()??'',p.textContent.replace(p.querySelector('strong')?.textContent??'','').trim()])})),
          processTable:parts[1].querySelector('table')?.outerHTML??'',
          diagramTitle:heading(parts[2]),svg:parts[2].querySelector('.mermaid svg')?.outerHTML??'',diagramCaption:text(parts[2],'.diagram-caption'),
          image:parts[2].querySelector('.project-figure img')?.src??'',
          resultHeading:heading(result),resultTitle:text(result,'h4'),result:[...result.querySelectorAll(':scope>p:not(.next):not(.source)')].map(p=>p.textContent.trim()),
          metrics:[...result.querySelectorAll('.result-metrics>div')].map(d=>[text(d,'span'),text(d,'strong'),text(d,'small')]),
          comparison:result.querySelector('table')?.outerHTML??'',
          limitsTitle:text(result,'.limits strong'),limits:text(result,'.limits p'),links:[...result.querySelectorAll(':scope>.text-link')].map(link)});
      }
    }
    const more=document.querySelector('.more-work:not(.writings)');
    const writings=document.querySelector('.more-work.writings');
    const closing={eyebrow:text(more,'.eyebrow'),title:text(more,'h2'),
      items:[...more.querySelectorAll('.more-grid>div')].map(d=>({title:text(d,'h3'),text:text(d,'p'),links:[...d.querySelectorAll('a.text-link')].map(link)})),
      writingsEyebrow:text(writings,'.eyebrow'),writingsTitle:text(writings,'h2'),
      writings:[...writings.querySelectorAll('.more-grid>a')].map(a=>({kicker:text(a,'span').replace(' ↗',''),title:text(a,'h3'),text:text(a,'p'),url:a.href})),
      more:link(writings.querySelector('.writings-heading a'))};
    return {overview,contents,items,closing};
  },'https://martinel2.github.io/'+(en?'en/':''));

  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const L=en?{contents:'Contents',cases:'Case studies',screens:'Screens and scope',contact:'Contact',portfolio:'Portfolio',continued:'continued'}
    :{contents:'목차',cases:'프로젝트 사례',screens:'담당 기능과 서비스 화면',contact:'Contact',portfolio:'포트폴리오',continued:'계속'};
  const slide=(cls,section,body)=>`<section class="slide ${cls}" data-section="${esc(section)}"><div class="body">${body}</div><footer><span>${esc(data.overview.name)} · ${L.portfolio}</span><span class="section">${esc(section)}</span><span class="num"></span></footer></section>`;
  const links=list=>list.map(l=>`<a href="${esc(l.url)}">${esc(l.label)}</a>`).join('');
  const o=data.overview;
  const slides=[];
  slides.push(slide('dark cover','',`<div class="intro"><p class="eyebrow">${esc(o.eyebrow)}</p><h1>${esc(o.title)}</h1><p>${esc(o.description)}</p>
    <div class="who"><strong>${esc(o.name)}</strong>${esc(o.role)}<br><span class="muted">${esc(o.email)} · martinel2.github.io</span><p class="muted" style="margin-top:10px;white-space:pre-line">${esc(o.summary)}</p></div></div>
    <div class="highlights">${o.highlights.map(h=>`<div><strong>${esc(h.title)}</strong><span>${esc(h.text)}</span></div>`).join('')}</div>`));
  slides.push(slide('contents',L.contents,`<p class="eyebrow">${L.cases}</p><h2 class="slide-title">${L.contents}</h2>
    <div class="groups">${[...new Set(data.contents.map(c=>c.project))].map(project=>`<div><p class="group">${esc(project)}</p><ol>${data.contents.map((c,i)=>c.project===project?`<li><b>${String(i+1).padStart(2,'0')}</b><span>${esc(c.title)}</span></li>`:'').join('')}</ol></div>`).join('')}</div>`));
  let caseNo=0;
  for(const it of data.items){
    if(it.type==='project'){
      slides.push(slide('dark project fit',it.name,`<div class="left"><p class="eyebrow">${esc(it.eyebrow)}</p><h2>${esc(it.name)}</h2><p>${esc(it.description)}</p>
        <div class="origin"><span>${esc(it.originTitle)}</span><p>${esc(it.origin)}</p></div>
        <div class="team"><span class="label">${esc(it.teamTitle)}</span><dl>${it.team.map(([t,d])=>`<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('')}</dl></div>
        ${it.links.length?`<div class="links">${links(it.links)}</div>`:''}</div>
        <div class="work-list"><span class="label">${esc(it.workTitle)}</span>${it.contributions.map(([t,d])=>`<div><b>${esc(t)}</b><p>${esc(d)}</p></div>`).join('')}</div>`));
      const figure=g=>{const [head,...rest]=g.caption.split(' — ');return `<figure><img src="${esc(g.src)}"><figcaption>${rest.length?`<b>${esc(head)}</b>${esc(rest.join(' — '))}`:esc(g.caption)}</figcaption></figure>`;};
      const wide=it.gallery.filter(g=>g.ratio>=1.5), tall=it.gallery.filter(g=>g.ratio<1.5);
      for(let i=0;i<wide.length;i+=4){
        const group=wide.slice(i,i+4);
        slides.push(slide('gallery',it.name,`<p class="eyebrow">${esc(it.name)}</p><h2 class="slide-title">${esc(it.galleryTitle||L.screens)}</h2>
          <div class="grid${group.length>2?' quad':''}" style="--cols:${Math.min(group.length,2)}">${group.map(figure).join('')}</div>`));
      }
      for(const g of tall){
        const [head,...rest]=g.caption.split(' — ');
        slides.push(slide('gallery tall',it.name,`<p class="eyebrow">${esc(it.name)}</p><h2 class="slide-title">${esc(rest.length?head:it.galleryTitle)}</h2>
          <div class="row"><img src="${esc(g.src)}"><p class="caption">${esc(rest.length?rest.join(' — '):g.caption)}</p></div>`));
      }
      continue;
    }
    caseNo++;
    const tag=`CASE ${String(caseNo).padStart(2,'0')}`;
    const section=`${tag} · ${it.kicker[1]?.split(' / ')[0]??''}`;
    const stats=it.metrics.slice(0,3);
    slides.push(slide('dark case-open',section,`<div class="left"><div class="kicker"><b>${tag}</b><span>${esc(it.kicker[1]??'')}</span></div><h2>${esc(it.title)}</h2>
      <p class="summary">${esc(it.summary)}</p><p class="meta">${esc(it.meta)}</p><div class="tags">${it.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div></div>
      <div class="right"><div class="background"><span>${esc(it.backgroundTitle)}</span><p>${esc(it.background)}</p></div>
      ${stats.length?`<div class="stat">${stats.map(([l,v])=>`<div><small>${esc(l)}</small><strong>${esc(v)}</strong></div>`).join('')}</div>`:''}</div>`));
    if(it.steps.length)slides.push(slide('process',section,`<p class="eyebrow">${tag}</p><h2 class="slide-title">${esc(it.processTitle)}</h2>
      <div class="steps">${it.steps.map((s,i)=>`<article class="step"><h4><b>${i+1}</b><span>${esc(s.title)}</span></h4>${s.fields.map(([l,t])=>`<p><strong>${esc(l)}</strong>${esc(t)}</p>`).join('')}</article>`).join('')}</div>`));
    else if(it.processTable)slides.push(slide('process result',section,`<p class="eyebrow">${tag}</p><h2 class="slide-title">${esc(it.processTitle)}</h2>${it.processTable}`));
    const metricCards=it.metrics.map(([l,v,n])=>`<div><small>${esc(l)}</small><strong>${esc(v)}</strong><em>${esc(n)}</em></div>`).join('');
    if(it.svg&&!it.image){
      slides.push(slide('analysis fit',section,`<p class="eyebrow">${tag} · ${esc(it.diagramTitle)} · ${esc(it.resultHeading)}</p>
        <div class="row"><div class="chart">${it.svg}</div><div class="summary"><h3>${esc(it.resultTitle)}</h3>
        ${metricCards?`<div class="metrics">${metricCards}</div>`:''}${it.result.map(p=>`<p>${esc(p)}</p>`).join('')}${it.comparison}
        <div class="limits"><strong>${esc(it.limitsTitle)}</strong><p>${esc(it.limits)}</p></div>${it.links.length?`<div class="links">${links(it.links)}</div>`:''}</div></div>`));
      continue;
    }
    if(it.svg)slides.push(slide('diagram',section,`<p class="eyebrow">${tag}</p><h2 class="slide-title">${esc(it.diagramTitle)}</h2>
      <div class="row"><div class="chart">${it.svg}</div><div class="side">${it.image?`<img src="${esc(it.image)}">`:''}<p${it.image?' class="caption"':''}>${esc(it.diagramCaption)}</p></div></div>`));
    slides.push(slide('result',section,`<p class="eyebrow">${tag} · ${esc(it.resultHeading)}</p>
      <div class="row" style="margin-top:10px"><div class="left"><h3>${esc(it.resultTitle)}</h3>${it.result.map(p=>`<p>${esc(p)}</p>`).join('')}${it.comparison}
      <div class="limits"><strong>${esc(it.limitsTitle)}</strong><p>${esc(it.limits)}</p></div>${it.links.length?`<div class="links">${links(it.links)}</div>`:''}</div>
      ${it.metrics.length?`<div class="metrics">${it.metrics.map(([l,v,n])=>`<div><small>${esc(l)}</small><strong>${esc(v)}</strong><em>${esc(n)}</em></div>`).join('')}</div>`:''}</div>`));
  }
  const c=data.closing;
  slides.push(slide('beyond',c.title,`<p class="eyebrow">${esc(c.eyebrow)}</p><h2 class="slide-title">${esc(c.title)}</h2>
    <div class="cards">${c.items.map(i=>`<div class="item"><b>${esc(i.title)}</b><p>${esc(i.text)}</p>${links(i.links.filter(l=>!l.url.includes('#')))}</div>`).join('')}</div>`));
  slides.push(slide('closing',c.writingsTitle,`<div class="col"><p class="eyebrow">${esc(c.writingsEyebrow)}</p><h2>${esc(c.writingsTitle)}</h2>
    ${c.writings.map(w=>`<div class="item"><a href="${esc(w.url)}"><small class="muted">${esc(w.kicker)}</small><b>${esc(w.title)}</b></a><p>${esc(w.text)}</p></div>`).join('')}
    <a href="${esc(c.more.url)}" style="font-size:13px">${esc(c.more.label)}</a></div>
    <div class="col"><p class="eyebrow">${L.contact}</p><h2>${esc(o.name)}</h2><div class="contact" style="margin-top:0">${esc(o.role)}<br>${esc(o.email)}<br><a href="https://martinel2.github.io/${en?'en/':''}">martinel2.github.io</a><br><a href="https://github.com/Martinel2">github.com/Martinel2</a><p class="muted" style="margin-top:14px;white-space:pre-line;font-size:14px">${esc(o.summary)}</p></div></div>`));

  const css=await readFile('templates/portfolio-deck.css','utf8');
  const baseHref=pathToFileURL(resolve(dir)+'/').href;
  await page.setContent(`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><base href="${baseHref}"><style>${en?css.replaceAll("url('assets/","url('../assets/"):css}</style></head><body>${slides.join('')}</body></html>`,{waitUntil:'load'});
  await page.evaluate(()=>document.fonts.ready);
  await page.$$eval('img',imgs=>Promise.all(imgs.map(img=>img.decode().catch(()=>{}))));

  // Split process slides that overflow: at most two step cards side by side per slide,
  // then tighten the type only when a single card still does not fit.
  const overflow=await page.evaluate(label=>{
    const fits=s=>{const b=s.querySelector(':scope>.body');return b.scrollHeight<=b.clientHeight+1;};
    for(const s of [...document.querySelectorAll('.slide.process')]){
      const grid=s.querySelector('.steps');if(!grid)continue;
      const cards=[...grid.children];grid.replaceChildren();
      let cur=s,g=grid;
      const next=()=>{const n=s.cloneNode(true);n.classList.remove('dense','denser');n.querySelector('.slide-title').textContent=s.querySelector('.slide-title').textContent+` (${label})`;
        g=n.querySelector('.steps');g.replaceChildren();cur.after(n);cur=n;};
      for(const card of cards){
        if(g.children.length===2)next();
        g.append(card);g.style.setProperty('--cols',g.children.length);
        if(!fits(cur)&&g.children.length>1){card.remove();g.style.setProperty('--cols',g.children.length);next();g.append(card);g.style.setProperty('--cols',1);}
        if(!fits(cur))cur.classList.add('dense');
        if(!fits(cur))cur.classList.add('denser');
      }
    }
    for(const s of document.querySelectorAll('.slide.fit')){
      if(!fits(s))s.classList.add('dense');
      if(!fits(s))s.classList.add('denser');
    }
    const slides=[...document.querySelectorAll('.slide')];
    slides.forEach((s,i)=>s.querySelector('.num').textContent=`${i+1} / ${slides.length}`);
    return slides.map((s,i)=>fits(s)?null:`${i+1}:${s.dataset.section}`).filter(Boolean);
  },L.continued);
  await page.pdf({path:dir+'/portfolio.pdf',width:'1280px',height:'720px',printBackground:true,tagged:true,preferCSSPageSize:true});
  if(overflow.length)throw Error('Portfolio slides overflow: '+overflow.join(', '));
  const count=await page.$$eval('.slide',s=>s.length);
  await page.close();
  console.log(`Built ${count}-slide ${dir}/portfolio.pdf.`);
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
  const browser=await puppeteer.launch({headless:true,args:process.env.CI?['--no-sandbox']:[]});
  try{for(const lang of ['ko','en'])await buildPortfolioPdf(browser,lang);}finally{await browser.close();}
}
