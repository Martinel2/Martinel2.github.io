import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {Document, Packer, Paragraph, TextRun, Tab, ExternalHyperlink, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle, Footer, PageNumber, TabStopType, AlignmentType, TableLayoutType} from 'docx';

// Word flows freely, so read resume.html in reading order instead of the fixed PDF pages:
// every project first, then skills, activities, education and awards.
const LABEL_COLORS={'문제':'C0392B','Problem':'C0392B','해결':'1F6FEB','Solution':'1F6FEB','성과':'1E8449','Result':'1E8449','판단':'B9770E'};
// CSS px × 1.5 = half-points, so the Word text matches templates/resume-pdf.css exactly.
const SIZE={period:14,name:23,h1:26,role:15,h2:18,h3:18,h3big:26,h4:17,body:15,note:14,small:14};
const COLOR={text:'203047',accent:'315CBB',muted:'607089'};
const LINE=218;
// line-height 1.45 (1.4 for English) applied to each run's own size.
const lineFor=(size,lang)=>Math.round(size*(lang==='en'?14:14.5));

export async function buildResumeDocx(page, lang = 'ko') {
  const name=lang==='en'?'Jaehyeong Kim':'김재형';
  const dir=process.env.RESUME_DIR||(lang==='en'?'site/en':'site');
  const suffix=lang==='en'?'-en':'';
  const source=await page.browser().newPage();
  await source.goto(pathToFileURL(resolve(dir,'resume.html')).href,{waitUntil:'load'});
  await source.$$eval('img',imgs=>Promise.all(imgs.map(img=>{img.loading='eager';return img.decode();})));
  const {blocks,text}=await source.evaluate(({name,lang})=>{
    const base='https://martinel2.github.io/'+(lang==='en'?'en/':'');
    const root=document.querySelector('.resume-shell').cloneNode(true);
    root.querySelectorAll('.resume-download,.resume-end,.resume-section>h2>span,.evidence-thumb>span').forEach(e=>e.remove());
    root.querySelectorAll('a').forEach(a=>a.href=new URL(a.getAttribute('href'),base).href);
    const hero=root.querySelector('.resume-hero');
    hero.querySelector('.eyebrow').textContent=name+' · AI Application Developer / Backend Engineer';
    hero.querySelectorAll('p:not(.eyebrow)').forEach(e=>e.remove()); // the eyebrow already carries the title
    hero.querySelectorAll('h1 br').forEach(e=>e.replaceWith(document.createTextNode(' ')));
    root.querySelector('.resume-section .resume-content').querySelectorAll('p').forEach(e=>e.remove());
    // Same section order as the PDF: summary, projects, skills, activities, education, awards.
    const all=[...root.querySelectorAll(':scope>.resume-section')];
    const lead=all.filter(el=>el.classList.contains('resume-lead'));
    const sections=all.filter(el=>!el.classList.contains('resume-lead'));
    // No forced break before activities: the PDF flow stopped forcing one, so neither does Word.
    sections[0].querySelector('h2').textContent='SUMMARY';sections[1].querySelector('h2').textContent='PROJECTS & EXPERIENCE';
    const ordered=[hero,...lead,sections[0],sections[1],sections[2],sections[3],sections[5],sections[4],...sections.slice(6)];
    document.body.append(...ordered.map(el=>{const box=document.createElement('div');box.append(el);box.hidden=false;return box;}));

    const inline=node=>{
      if(node.nodeType===Node.TEXT_NODE)return node.textContent.trim()?[{text:node.textContent}]:(/\n/.test(node.textContent)?[{text:'\n'}]:node.textContent?[{text:' '}]:[]);
      if(node.nodeType!==Node.ELEMENT_NODE)return [];
      if(node.tagName==='BR')return [{text:'\n'}];
      if(node.tagName==='IMG')return [{image:node.src,width:node.naturalWidth,height:node.naturalHeight}];
      if(node.matches('.field-label'))return [{text:node.textContent,label:node.textContent.replace(':','')}];
      return [...node.childNodes].flatMap(inline).map(run=>({...run,
        ...(node.tagName==='STRONG'?{bold:true}:{}),
        ...(node.tagName==='A'?{url:node.href}:{})}));
    };
    const walk=node=>{
      if(node.nodeType!==Node.ELEMENT_NODE)return [];
      if(node.tagName==='A'&&node.previousElementSibling?.tagName==='A')return [];
      if(node.tagName==='A'&&node.nextElementSibling?.tagName==='A'){
        const runs=[];for(let link=node;link?.tagName==='A';link=link.nextElementSibling)runs.push(...inline(link),{text:'   '});
        return [{style:'links',runs}];
      }
      if(node.matches('.resume-hero'))return [{box:'hero',children:[...node.children].flatMap(walk)}];
      if(node.matches('.resume-project-title'))return [{columns:[[{style:'h3big',runs:inline(node.children[0])}],[{style:'period',align:'right',title:true,runs:inline(node.children[1])}]],widths:[78,22],title:true}];
      if(node.matches('.evidence-row'))return [{columns:[...node.children].map(walk),widths:[9,91]}];
      if(node.matches('.experience-row,.skill-rows>div,.award-list>div')){
        // Lead column widths follow the CSS grid: 105px, 95px and 70px of a 688px text column.
        const lead=node.matches('.award-list>div')?10:node.matches('.skill-rows>div')?14:15;
        const columns=[...node.children].map(walk);
        // Flatten an evidence image into this row; nested tables render poorly outside Word.
        const evidence=columns[1].length===1&&columns[1][0].widths?.length===2?columns[1][0]:null;
        return [{columns:evidence?[columns[0],...evidence.columns]:columns,widths:evidence?[lead,9,100-lead-9]:[lead,100-lead]}];
      }
      if(node.matches('h1,h2,h3,h4,p,li,a,span,strong')&&!node.querySelector('p,div,ul')){
        const style=node.matches('.eyebrow')?'name':node.matches('.resume-role')?'role':node.tagName.toLowerCase();
        return [{style,note:node.matches('.scope-note,.topic-intro,.role'),pageBreak:node.dataset.pageBreak==='1',runs:inline(node)}];
      }
      // A bare image outside an evidence row, such as the local build's profile photo.
      if(node.tagName==='IMG')return [{style:'p',runs:inline(node)}];
      if(node.tagName==='LI'){
        // One bullet paragraph per item, so its problem/solution/result lines share the bullet's indent.
        const parts=[...node.children].flatMap(walk), main=parts.filter(b=>!b.note);
        const plain=!!node.closest('.profile-list'); // list-style:none in the CSS
        return [{style:'li',plain,runs:main.flatMap((b,i)=>i?[{text:'\n'},...b.runs]:b.runs)},...parts.filter(b=>b.note).map(b=>({...b,indent:true}))];
      }
      return [...node.children].flatMap(walk);
    };
    const blocks=[...document.body.children].slice(-ordered.length).flatMap(box=>[...box.children].flatMap(walk));
    const text=[...document.body.children].slice(-ordered.length).map(box=>box.innerText).join('\n');
    return {blocks,text};
  },{name,lang});
  await source.close();
  await writeFile(`artifacts/resume-docx-source${suffix}.json`,JSON.stringify([text]));

  const noBorder={style:BorderStyle.NONE,size:0,color:'FFFFFF'};
  const rule={style:BorderStyle.SINGLE,size:4,color:'E3E8F0'};
  const pageWidth=11906-2*794; // 14mm side margins, as in the PDF
  const run=(text,opts)=>new TextRun({text,...opts});

  async function contents(block,size,color,heading) {
    const lines=[[]];
    for(const r of block.runs) {
      if(r.image) {
        const ratio=Math.min(60/r.width,60/r.height);
        lines.at(-1).push(new ImageRun({type:r.image.endsWith('.png')?'png':'jpg',data:await readFile(fileURLToPath(r.image)),transformation:{width:Math.round(r.width*ratio),height:Math.round(r.height*ratio)}}));
        continue;
      }
      r.text.split('\n').forEach((part,i)=>{
        if(i)lines.push([]);
        if(!part)return;
        const opts={bold:heading||r.bold,size:r.period?SIZE.small:size,color:r.url?COLOR.accent:r.period?COLOR.muted:color};
        if(r.label)Object.assign(opts,{bold:true,color:LABEL_COLORS[r.label]||COLOR.accent});
        const item=new TextRun({...opts,children:part.split('\t').flatMap((t,j)=>j?[new Tab(),t]:[t])});
        lines.at(-1).push(r.url?new ExternalHyperlink({link:r.url,children:[item]}):item);
      });
    }
    const filled=lines.filter(line=>line.length);
    return filled.length?filled:[[]];
  }

  async function paragraphs(blocks,width=pageWidth) {
    const result=[];
    for(const block of blocks) {
      if(block.box||block.columns) {
        const columns=block.columns||[block.children], widths=block.widths||[100], hero=block.box==='hero';
        const cells=[];
        for(let i=0;i<columns.length;i++) {
          const cellWidth=Math.round(width*widths[i]/100);
          const children=await paragraphs(columns[i],cellWidth-(hero?480:87));
          if(!children.length||children.at(-1) instanceof Table)children.push(new Paragraph({children:[]}));
          cells.push(new TableCell({children,width:{size:cellWidth,type:WidthType.DXA},
            margins:hero?{top:195,bottom:195,left:240,right:240}:block.title?{top:204,bottom:44,left:0,right:0}:{top:44,bottom:44,left:0,right:i?0:87},
            ...(hero?{shading:{fill:'EFF3FC'}}:{})}));
        }
        const inner=block.title;
        result.push(new Table({width:{size:width,type:WidthType.DXA},columnWidths:widths.map(w=>Math.round(width*w/100)),layout:TableLayoutType.FIXED,
          borders:{top:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder,bottom:hero||inner?noBorder:rule},
          rows:[new TableRow({cantSplit:true,children:cells})]}));
        continue;
      }
      const style=block.style, heading=['name','h1','h2','h3','h3big','h4'].includes(style);
      const size=block.note?SIZE.note:(SIZE[style]||SIZE.body);
      const color=style==='period'?COLOR.muted:style==='h4'||style==='h2'||style==='h1'||style==='name'?COLOR.accent:heading?COLOR.text:block.note||style==='role'?COLOR.muted:COLOR.text;
      const lines=await contents(block,size,color,heading);
      const children=lines.flatMap((line,i)=>i?[new TextRun({break:1}),...line]:line);
      const spacing={
        h1:{before:75,after:75},name:{before:0,after:0},role:{before:0,after:90},
        h2:{before:240,after:135},h3:{before:0,after:0},h3big:{before:0,after:0},h4:{before:105,after:45},
        links:{before:75,after:0},li:{before:0,after:75},
      }[style]||(block.note?{before:0,after:60}:{before:0,after:0});
      result.push(new Paragraph({children,keepNext:heading||block.title,pageBreakBefore:!!block.pageBreak,...(block.align==='right'?{alignment:AlignmentType.RIGHT}:{}),
        spacing:{...spacing,line:lineFor(size,lang)},
        ...(style==='li'&&!block.plain?{bullet:{level:0},indent:{left:195,hanging:195}}:{}),
        ...(block.indent?{indent:{left:195}}:{}),
        ...(style==='h2'?{border:{bottom:{style:BorderStyle.SINGLE,size:12,color:'6A80BD',space:4}}}:{})}));
    }
    return result;
  }

  // Bold the title line of each problem/solution/result item so it reads as a sub-heading.
  for(const block of blocks)if(block.style==='li'&&block.runs.some(r=>r.label)&&!block.runs[0].label){
    const cut=block.runs.findIndex(r=>r.text?.includes('\n'));
    for(let i=0;i<=cut;i++)if(i<cut||!block.runs[i].label)block.runs[i]={...block.runs[i],bold:true};
  }

  const footer=new Footer({children:[new Paragraph({tabStops:[{type:TabStopType.RIGHT,position:pageWidth}],children:[
    run(name+' · AI Application Developer / Backend Engineer',{size:12,color:'7D8DA3'}),new TextRun({children:[new Tab()]}),
    new TextRun({children:[PageNumber.CURRENT,' / ',PageNumber.TOTAL_PAGES],size:12,color:'7D8DA3'})]})]});
  const doc=new Document({creator:name,title:name+(lang==='en'?' Resume':' 이력서'),
    styles:{default:{document:{run:{font:{ascii:'Malgun Gothic',hAnsi:'Malgun Gothic',eastAsia:'Malgun Gothic',cs:'Malgun Gothic'},size:SIZE.body,color:COLOR.text,language:{value:lang==='en'?'en-US':'ko-KR',eastAsia:'ko-KR'}},paragraph:{spacing:{after:0,line:LINE}}}}},
    sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:737,bottom:907,left:794,right:794,footer:454}}},
      footers:{default:footer},children:await paragraphs(blocks)}]});
  await writeFile(dir+'/resume.docx',await Packer.toBuffer(doc));
  console.log(`Built editable ${dir}/resume.docx in reading order (projects → skills).`);
}
