import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {Document, Packer, Paragraph, TextRun, Tab, ExternalHyperlink, ImageRun, Footer, PageNumber, TabStopType, BorderStyle} from 'docx';

// 이력서 데이터(content.json의 resume)를 당근 이력서와 같은 짜임의 편집 가능한 Word로 만든다.
const NAVY='2B3F6B',GRAY='6B7482',LABEL='8A93A2',INK='22262E';
const RIGHT=9638; // A4 본문 폭(좌우 여백 14mm)의 오른쪽 탭
const SITE='https://martinel2.github.io/';

export async function buildResumeDocx(page, lang = 'ko') {
  const dir=process.env.RESUME_DIR||(lang==='en'?'site/en':'site');
  const suffix=lang==='en'?'-en':'';
  const R=JSON.parse(await readFile(lang==='en'?'content.en.json':'content.json','utf8')).resume;
  const base=SITE+(lang==='en'?'en/':'');
  // 테스트가 Word 글자를 웹 이력서 글자와 맞춰 보도록, 페이지에 보이는 글자를 그대로 남긴다.
  const source=await page.browser().newPage();
  await source.goto(pathToFileURL(resolve(dir,'resume.html')).href,{waitUntil:'load'});
  const {text,lead,photo}=await source.$eval('.resume-shell',el=>{const c=el.cloneNode(true);c.querySelectorAll('.cv-actions,.resume-photo').forEach(e=>e.remove());
    c.querySelector('.cv-header').after(...c.querySelectorAll('.resume-lead'));
    // A cover-letter build (scripts/build-cover-letter.mjs) adds a photo and .resume-lead sections to the page.
    return {text:[c.textContent],photo:el.querySelector('.resume-photo')?.src||'',
      lead:[...el.querySelectorAll('.resume-lead')].map(s=>({title:s.querySelector('h2').textContent,items:[...s.querySelectorAll('p,li')].map(e=>({text:e.textContent,li:e.tagName==='LI'}))}))};});
  await source.close();
  await writeFile(`artifacts/resume-docx-source${suffix}.json`,JSON.stringify(text));

  const run=(text,o={})=>new TextRun({text,color:INK,...o});
  const link=(text,url,o={})=>new ExternalHyperlink({link:url,children:[run(text,{color:NAVY,bold:true,underline:{},...o})]});
  const P=(children,o={})=>new Paragraph({children,...o});
  const h2=t=>P([run(t,{bold:true,size:27,color:NAVY})],{spacing:{before:300,after:120},keepNext:true,border:{bottom:{style:BorderStyle.SINGLE,size:6,color:'D5DBE4',space:3}}});
  const right=(left,date,o={})=>P([...left,run('\t'+(date||''),{color:GRAY,size:20})],{tabStops:[{type:TabStopType.RIGHT,position:RIGHT}],...o});
  const body=[];

  if(photo)body.push(P([new ImageRun({type:'jpg',data:await readFile(fileURLToPath(photo)),transformation:{width:70,height:93},
    floating:{horizontalPosition:{relative:'margin',align:'right'},verticalPosition:{relative:'margin',align:'top'},wrap:{type:1}}})]));
  body.push(P([run(R.name,{bold:true,size:48,color:NAVY})]));
  body.push(P([run(R.role,{bold:true,size:25,color:NAVY})],{spacing:{after:60}}));
  const contacts=[['kkuldangi2@gmail.com','mailto:kkuldangi2@gmail.com'],[R.links.portfolio,base+'portfolio.html'],[R.links.github,'https://github.com/Martinel2'],
    [R.links.blog,'https://velog.io/@kkuldangi3/posts'],[R.links.linkedin,'https://www.linkedin.com/in/%EC%9E%AC%ED%98%95-%EA%B9%80-b75920345/']];
  body.push(P(contacts.flatMap(([t,u],i)=>[...(i?[run('  |  ',{color:'B6BDC8'})]:[]),link(t,u)]),
    {spacing:{after:160},border:{bottom:{style:BorderStyle.SINGLE,size:12,color:NAVY,space:6}}}));

  for(const l of lead){
    body.push(h2(l.title));
    for(const x of l.items)body.push(P([run(x.text,{size:21})],{spacing:{after:60},...(x.li?{bullet:{level:0}}:{})}));
  }
  body.push(h2(R.projectsTitle));
  for(const g of R.groups){
    body.push(right([run(g.org,{bold:true,size:26,color:'1D2230'})],g.dates,{spacing:{before:160},keepNext:true}));
    body.push(P([run(g.role+' ',{bold:true,size:22,color:'39404D'}),link(R.detailLabel,base+'portfolio/'+g.id+'.html',{underline:undefined,size:20})],{keepNext:true}));
    for(const k of g.cases){
      body.push(P([run(k.title,{bold:true,size:24,color:NAVY})],{spacing:{before:200,after:60},keepNext:true}));
      for(const [lab,txt] of k.rows)body.push(P([run(lab,{bold:true,size:19,color:LABEL}),new TextRun({children:[new Tab()]}),run(txt,{size:21})],
        {indent:{left:680,hanging:680},tabStops:[{type:TabStopType.LEFT,position:680}],spacing:{after:40}}));
    }
  }
  body.push(h2(R.extrasTitle));
  for(const x of R.extras){
    body.push(right([run(x.title,{bold:true,size:22,color:NAVY})],x.badge,{keepNext:true}));
    body.push(P([run(x.desc,{size:21})],{spacing:{after:100}}));
  }
  body.push(h2(R.skillsTitle));
  for(const s of R.skills)body.push(P([run(s.category+'  ',{bold:true,size:21,color:NAVY}),run(s.items,{size:21})]));
  body.push(h2(R.educationTitle));
  for(const e of R.education){
    body.push(right([run(e.title,{bold:true,size:21}),run(' '+e.org,{size:21})],e.year,{keepNext:true}));
    if(e.description)body.push(P([run(e.description,{size:21,color:'5C6574'})]));
  }
  body.push(h2(R.certificationsTitle));
  for(const c of R.certifications)body.push(right([run(c.title,{size:21}),run(' '+c.org,{size:21,color:'5C6574'})],c.year));
  body.push(h2(R.awardsTitle));
  for(const a of R.awards)body.push(P([run(a,{size:21})]));

  const footer=new Footer({children:[new Paragraph({tabStops:[{type:TabStopType.RIGHT,position:RIGHT}],children:[
    new TextRun({text:R.name+' | '+R.role,size:16,color:'7D8DA3'}),new TextRun({children:[new Tab()]}),
    new TextRun({children:[PageNumber.CURRENT,' / ',PageNumber.TOTAL_PAGES],size:16,color:'7D8DA3'})]})]});
  const doc=new Document({creator:R.name,title:R.name+(lang==='en'?' Resume':' 이력서'),
    styles:{default:{document:{run:{font:{ascii:'Malgun Gothic',hAnsi:'Malgun Gothic',eastAsia:'Malgun Gothic',cs:'Malgun Gothic'},size:21,color:INK,
      language:{value:lang==='en'?'en-US':'ko-KR',eastAsia:'ko-KR'}},paragraph:{spacing:{line:312}}}}},
    sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:737,bottom:850,left:794,right:794,footer:454}}},footers:{default:footer},children:body}]});
  await writeFile(dir+'/resume.docx',await Packer.toBuffer(doc));
  console.log(`Built editable ${dir}/resume.docx from the resume data.`);
}
