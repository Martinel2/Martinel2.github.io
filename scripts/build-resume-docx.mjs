import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {Document, Packer, Paragraph, TextRun, ExternalHyperlink, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle, Footer, PageNumber, TabStopType} from 'docx';

// Read the already prepared PDF sheets so wording and page grouping have one source.
export async function buildResumeDocx(page) {
  await writeFile('artifacts/resume-docx-source.json', JSON.stringify(await page.$$eval('.sheet-content', els=>els.map(el=>el.innerText))));
  const sheets = await page.$$eval('.sheet-content', elements => {
    const inline = node => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim() ? [{text:node.textContent}] : [];
      if (node.nodeType !== Node.ELEMENT_NODE) return [];
      if (node.tagName === 'BR') return [{text:'\n'}];
      if (node.tagName === 'IMG') return [{image:node.src,width:node.naturalWidth,height:node.naturalHeight}];
      if (getComputedStyle(node).display === 'none') return [];
      return [...node.childNodes].flatMap(inline).map(run=>({...run,
        ...(node.tagName==='STRONG'?{bold:true}:{}),
        ...(node.tagName==='A'?{url:node.href}:{})}));
    };
    const blocks = node => {
      if (node.nodeType!==Node.ELEMENT_NODE) return [];
      if (node.tagName==='A' && node.previousElementSibling?.tagName==='A') return [];
      if (node.tagName==='A' && node.nextElementSibling?.tagName==='A') {
        const runs=[];for(let link=node;link?.tagName==='A';link=link.nextElementSibling)runs.push(...inline(link),{text:'   '});
        return [{style:'a',runs}];
      }
      if (node.matches('.resume-hero,.resume-project')) return [{box:true,hero:node.matches('.resume-hero'),children:[...node.children].flatMap(blocks)}];
      if (node.matches('.evidence-row,.experience-row,.skill-rows>div,.award-list>div,.resume-project-title')) {
        const widths=node.matches('.evidence-row')?[12,88]:node.matches('.resume-project-title')?[72,28]:[20,80];
        return [{columns:[...node.children].map(child=>blocks(child)),widths}];
      }
      if (node.matches('h1,h2,h3,h4,p,li,a,span,strong')&&!node.querySelector('p,div,ul')) {
        const style=node.matches('.eyebrow')?'name':node.tagName.toLowerCase();
        return [{style,note:node.matches('.scope-note,.topic-intro,.role'),runs:inline(node)}];
      }
      return [...node.children].flatMap(blocks);
    };
    return elements.map(el=>[...el.children].flatMap(blocks));
  });
  const noBorder={style:BorderStyle.NONE,size:0,color:'FFFFFF'};
  const border={style:BorderStyle.SINGLE,size:5,color:'DCE2EC'};
  const empty=()=>new Paragraph({spacing:{after:0,before:0,line:40},children:[]});
  async function paragraphs(blocks) {
    const result=[];
    for(const block of blocks) {
      if(block.box||block.columns) {
        const columns=block.columns||[block.children], widths=block.widths||[100];
        const cells=[];
        for(let i=0;i<columns.length;i++) {
          const children=await paragraphs(columns[i]);
          if(!children.length||children.at(-1) instanceof Table)children.push(empty());
          cells.push(new TableCell({children,width:{size:widths[i],type:WidthType.PERCENTAGE},
            margins:{top:block.box?100:20,bottom:block.box?100:20,left:block.box?140:40,right:block.box?140:40},
            ...(block.hero?{shading:{fill:'EFF3FC'}}:{})}));
        }
        result.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},
          borders:Object.fromEntries(['top','bottom','left','right','insideHorizontal','insideVertical'].map(k=>[k,block.box?border:noBorder])),
          rows:[new TableRow({children:cells})]}),empty());
        continue;
      }
      const heading=['name','h1','h2','h3','h4'].includes(block.style);
      const size={name:23,h1:25,h2:20,h3:23,h4:18,a:16,span:16}[block.style]||(block.note?15:16);
      const color=heading?'315CBB':block.note?'607089':'203047';
      const children=[];
      for(const run of block.runs) {
        let content;
        if(run.image) {
          const ratio=Math.min(56/run.width,68/run.height);
          content=[new ImageRun({type:run.image.endsWith('.png')?'png':'jpg',data:await readFile(fileURLToPath(run.image)),transformation:{width:Math.round(run.width*ratio),height:Math.round(run.height*ratio)}})];
        }else{
          content=run.text.split('\n').map((text,i)=>new TextRun({text,bold:heading||run.bold,size,color:run.url?'315CBB':color,...(i?{break:1}:{})}));
        }
        if(run.url)children.push(new ExternalHyperlink({link:run.url,children:content}));
        if(!run.url)children.push(...content);
      }
      result.push(new Paragraph({children,keepNext:heading,spacing:{before:block.style==='h2'?160:heading?60:0,after:heading?65:45,line:190},
        ...(block.style==='li'?{bullet:{level:0}}:{}),
        ...(block.style==='h2'?{border:{bottom:{style:BorderStyle.SINGLE,size:10,color:'6A80BD',space:4}}}:{})}));
    }
    return result;
  }
  const sections=[];
  for(const sheet of sheets)sections.push({properties:{page:{size:{width:11906,height:16838},margin:{top:737,bottom:907,left:794,right:794,footer:454}}},
    footers:{default:new Footer({children:[new Paragraph({tabStops:[{type:TabStopType.RIGHT,position:10318}],children:[new TextRun({text:'김재형 · Backend / AI Application Developer\t',size:14,color:'7D8DA3'}),new TextRun({children:[PageNumber.CURRENT,' / ',PageNumber.TOTAL_PAGES],size:14,color:'7D8DA3'})]})]})},
    children:await paragraphs(sheet)});
  const doc=new Document({creator:'김재형',title:'김재형 이력서',styles:{default:{document:{run:{font:{ascii:'Arial',hAnsi:'Arial',eastAsia:'맑은 고딕'},size:16,color:'203047',language:{value:'ko-KR',eastAsia:'ko-KR'}},paragraph:{spacing:{after:45,line:190}}}}},sections});
  await writeFile('site/resume.docx',await Packer.toBuffer(doc));
  console.log('Built editable site/resume.docx from the PDF sheets.');
}
