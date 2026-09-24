const $ = selector => document.querySelector(selector);
const labels = {updated:'최종 수정일',overview:'첫 화면',title:'제목',eyebrow:'상단 설명',description:'소개',experience1Title:'주요 경험 1 · 제목',experience1Description:'주요 경험 1 · 설명',experience2Title:'주요 경험 2 · 제목',experience2Description:'주요 경험 2 · 설명',experience3Title:'주요 경험 3 · 제목',experience3Description:'주요 경험 3 · 설명',profileRole:'직무',profileLine1:'프로필 소개 · 첫 줄',profileLine2:'프로필 소개 · 둘째 줄',label:'구분 / 링크 이름',short:'목차 이름',category:'분야',period:'기간',role:'역할',summary:'요약',tags:'기술 태그',problem:'문제 상황',ownership:'내가 맡은 부분',options:'해결 방안 비교',decision:'선택 이유',implementation:'구현 내용',diagram:'구조도 · Mermaid 원문',diagramCaption:'구조도 설명',resultTitle:'결과 제목',result:'결과',metrics:'성과 수치',comparison:'결과 비교표',columns:'열 제목',rows:'비교 내용',note:'비교 조건 / 주의점',tradeoff:'결과 범위와 한계',next:'다음 검증',source:'근거',links:'관련 링크',url:'링크 주소',href:'페이지 내 연결',contributions:'담당 범위와 협업',gallery:'프로젝트 사진',image:'사례 사진',alt:'이미지 대체 설명',caption:'사진 설명',fields:'본문',writings:'블로그 글'};
const locked = new Set(['id','project','name','src','width','height']);
const matrixLabels = {options:['해결 방안','기대 효과','실험 결과','채택 여부와 이유'],metrics:['항목','수치','설명'],contributions:['담당 구분','기여 내용']};
let data, original, sha, canSave=false, busy=false, active=0, sections=[];
const fieldLabels=new Map();
function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function status(message,error=false){$('#status').textContent=message;$('#status').setAttribute('role',error?'alert':'status');}
function changed(a=data,b=original,path=[]){if(!a||!b)return [];if(typeof a==='string')return a===b?[]:[{path,before:b,after:a}];if(typeof a!=='object')return [];return Object.keys(a).flatMap(k=>changed(a[k],b[k],[...path,k]));}
function refresh(){const count=changed().length;$('#dirty').textContent=count?`${count}개 항목 수정됨 · 아직 저장하지 않았습니다.`:'저장된 내용과 같습니다.';$('#review').disabled=busy||!canSave||!count;$('#reload').disabled=busy||!data;$('#backup').disabled=busy||!data;$('#save').disabled=busy;$('#cancel').disabled=busy;document.querySelectorAll('#fields textarea,#menu button').forEach(n=>n.disabled=busy);}
function valueAt(path){return path.reduce((v,k)=>v[k],data);}
function setAt(path,value){const parent=valueAt(path.slice(0,-1));parent[path.at(-1)]=value;refresh();}
function field(value,path,parent,label){const key=path.at(-1);if(locked.has(key))return;
 if(typeof value==='string'){
  const wrap=el('div',undefined,'field'),id='field-'+path.join('-'),name=label||labels[key]||(/text\d+/.test(key)?`문장 ${Object.keys(parent).indexOf(key)+1}`:key);
  const input=el('textarea');input.id=id;input.value=value;input.rows=Math.min(12,Math.max(2,Math.ceil(value.length/65)));input.maxLength=30000;
  const heading=el('label',name);heading.htmlFor=id;wrap.append(heading,input);fieldLabels.set(path.join('.'),sections[active].title+' / '+name);
  input.addEventListener('input',()=>setAt(path,input.value));return wrap;
 }
 if(value&&typeof value==='object'){
  const group=el('section',undefined,'group');group.append(el('h3',label||labels[key]||`항목 ${Number(key)+1}`));
  if(value.src){const img=el('img');img.src=new URL(value.src,'https://martinel2.github.io/').href;img.alt=value.alt||'';img.className='image';group.append(img);}
  Object.entries(value).forEach(([k,v])=>{let name;
   if(Array.isArray(value))name=matrixLabels[path.at(-2)]?.[Number(k)]||`항목 ${Number(k)+1}`;
   const child=field(v,[...path,k],value,name);if(child)group.append(child);
  });return group;
 }
}
function show(index){active=index;const section=sections[index];$('#section-title').textContent=section.title;$('#fields').replaceChildren();document.querySelectorAll('#menu button').forEach((b,i)=>b.setAttribute('aria-current',String(i===index)));
 const obj=valueAt(section.path);Object.entries(obj).forEach(([k,v])=>{if(section.kind==='resume'&&k==='title')return;const f=field(v,[...section.path,k],obj);if(f)$('#fields').append(f);});refresh();
}
function render(){sections=[{group:'포트폴리오',title:'첫 화면 소개',path:['overview']}];
 data.projects.forEach((p,i)=>sections.push({group:'프로젝트 소개',title:p.name,path:['projects',String(i)]}));
 data.cases.forEach((c,i)=>sections.push({group:'상세 경험',title:c.short,path:['cases',String(i)]}));
 data.resume.forEach((r,i)=>sections.push({group:'이력서',title:r.title,path:['resume',String(i)],kind:'resume'}));
 data.writings.forEach((w,i)=>sections.push({group:'블로그 링크',title:w.title,path:['writings',String(i)]}));
 $('#menu').replaceChildren();let group='';sections.forEach((s,i)=>{if(s.group!==group){$('#menu').append(el('h2',s.group));group=s.group;}const button=el('button',s.title);button.addEventListener('click',()=>show(i));$('#menu').append(button);});show(Math.min(active,sections.length-1));
}
async function load(){if(data&&changed().length&&!confirm('저장하지 않은 변경을 버리고 다시 불러올까요?'))return;busy=true;refresh();status('최신 내용을 불러오는 중입니다.');try{
 const res=await fetch('/admin/api/content',{cache:'no-store'});if(res.status===401)throw Error('로그인이 만료됐습니다. 새로고침해 다시 로그인해 주세요.');const body=await res.json();if(!res.ok)throw Error(body.error);
 if(!body.data.overview||!body.data.resume)throw Error('관리자 편집용 사이트 업데이트를 기다리고 있습니다. 잠시 후 다시 불러와 주세요.');
 data=body.data;original=structuredClone(data);sha=body.sha;canSave=body.canSave;render();status(canSave?'최신 내용을 불러왔습니다.':'내용 편집과 백업은 가능합니다. 저장 기능은 아직 연결되지 않았습니다.');
 }catch(e){status(e.message,true);}finally{busy=false;refresh();$('#reload').disabled=false;}}
$('#reload').addEventListener('click',load);
$('#backup').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'}));const a=el('a');a.href=url;a.download='portfolio-content-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('#review').addEventListener('click',()=>{$('#changes').replaceChildren();for(const c of changed()){const row=el('div',undefined,'change');row.append(el('strong',fieldLabels.get(c.path.join('.'))||c.path.join(' / ')),el('p','이전: '+c.before,'before'),el('p','변경: '+c.after,'after'));$('#changes').append(row);}$('#review-dialog').showModal();});
$('#cancel').addEventListener('click',()=>$('#review-dialog').close());
$('#review-dialog').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
$('#save').addEventListener('click',async()=>{busy=true;refresh();status('저장 중입니다. 창을 닫지 마세요.');try{
 const res=await fetch('/admin/api/content',{method:'POST',headers:{'Content-Type':'application/json','X-Editor-Action':'save'},body:JSON.stringify({sha,data})});const result=await res.json();if(!res.ok)throw Error(result.error||'저장하지 못했습니다.');sha=result.sha;original=structuredClone(data);$('#review-dialog').close();status(result.unchanged?'변경된 내용이 없습니다.':'저장됐습니다. 사이트 배포가 시작됩니다. 반영 완료 여부는 배포 상태에서 확인하세요.');
 if(result.deployment){const a=el('a',' 배포 상태 확인 ↗');a.href=result.deployment;a.target='_blank';a.rel='noopener';$('#status').append(a);}
 }catch(e){$('#review-dialog').close();status(e.message+' 입력 내용은 유지됩니다.',true);}finally{busy=false;refresh();}});
window.addEventListener('beforeunload',e=>{if(changed().length||busy){e.preventDefault();e.returnValue='';}});
load();
