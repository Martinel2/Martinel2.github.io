const $ = selector => document.querySelector(selector);
const labels = {tagline:'홈 인사말 아래 소개 문구',role:'직무',links:'연락처 링크 이름',blog:'블로그 링크',detailLabel:'포트폴리오 상세 링크 이름',groups:'프로젝트',org:'프로젝트 이름과 소속',dates:'기간',cases:'사례',rows:'문제·판단·결과',extrasTitle:'그 밖의 활동 제목',extras:'그 밖의 프로젝트와 활동',badge:'기간',desc:'설명',skillsTitle:'기술 제목',skills:'기술',category:'분류',items:'목록',educationTitle:'학력 제목',education:'학력',year:'연도',description:'설명',certificationsTitle:'자격증 제목',certifications:'자격증',awardsTitle:'수상 제목',awards:'수상',affiliation:'소속',dialogTitle:'이력서 선택창 제목',pdfLabel:'PDF 보기 버튼 이름',docxLabel:'Word 다운로드 버튼 이름',hero:'인사말',greeting:'인사말 첫 줄',nameLine:'이름과 인사',about:'소개',actions:'소개 아래 버튼',resume:'이력서 버튼',portfolio:'포트폴리오 버튼',linkedin:'LinkedIn 버튼',github:'GitHub 버튼',skillsEyebrow:'기술 영문 표기',projectsEyebrow:'프로젝트 영문 표기',projectsTitle:'프로젝트 섹션 제목',writingsEyebrow:'회고록 영문 표기',writingsTitle:'회고록 제목',writingsLinkLabel:'블로그 전체 링크 이름',writingsUrl:'블로그 전체 주소',homeLabel:'홈 탭',aboutLabel:'소개 탭',skillsLabel:'기술 탭',projectsLabel:'프로젝트 탭',activitiesLabel:'활동 탭',affiliationLabel:'소속 항목 이름',roleLabel:'역할 항목 이름',detailsLabel:'프로젝트 팝업 열기 문구',updated:'최종 수정일',overview:'첫 화면',title:'제목',eyebrow:'상단 설명',description:'소개',experience1Title:'주요 경험 1 · 제목',experience1Description:'주요 경험 1 · 설명',experience2Title:'주요 경험 2 · 제목',experience2Description:'주요 경험 2 · 설명',experience3Title:'주요 경험 3 · 제목',experience3Description:'주요 경험 3 · 설명',profileRole:'직무',profileLine1:'프로필 소개 · 첫 줄',profileLine2:'프로필 소개 · 둘째 줄',label:'구분 / 링크 이름',short:'목차 이름',category:'분야',period:'기간',role:'역할',summary:'요약',tags:'기술 태그',problem:'문제 상황',expected:'해결하면 얻는 것',ownership:'내가 맡은 부분',processTitle:'과정 섹션 제목',experiments:'진행 과정',designSteps:'판단과 구현 과정',judgment:'판단',verification:'확인한 결과',options:'해결 방안 비교',decision:'선택 이유',implementation:'구현 내용',diagram:'구조도 · Mermaid 원문',diagramCaption:'구조도 설명',resultTitle:'결과 제목',result:'결과',metrics:'성과 수치',comparison:'결과 비교표',columns:'열 제목',rows:'비교 내용',note:'비교 조건 / 주의점',tradeoff:'결과 범위와 한계',next:'다음 검증',source:'근거',links:'관련 링크',url:'링크 주소',href:'페이지 내 연결',contributions:'내 주요 개발',origin:'시작 계기',goal:'풀고 싶었던 문제',myRole:'내 역할',team:'팀 구성',cover:'프로젝트 표지',gallery:'프로젝트 사진',image:'사례 사진',alt:'이미지 대체 설명',caption:'사진 설명',fields:'본문',writings:'블로그 글'};
const locked = new Set(['id','project','name','src','width','height']);
const matrixLabels = {rows:['라벨','내용'],tagline:['앞부분','뒷부분'],about:['첫 문단','둘째 문단'],experiments:['단계 제목','문제 상황','시도와 결과','판단'],options:['해결 방안','기대 효과','실험 결과','채택 여부와 이유'],metrics:['항목','수치','설명'],contributions:['개발 항목','내용'],team:['역할','담당 내용']};
// 페이지에 보이는 순서대로 칸을 보여 준다. 목록에 없는 칸은 뒤에 붙인다.
const caseOrder=['title','short','category','period','summary','tags','problem','expected','processTitle','experiments','designSteps','options','decision','implementation','diagram','diagramCaption','image','resultTitle','result','metrics','comparison','tradeoff','next','source','links'];
const stepOrder=['title','problem','judgment','implementation','verification'];
function ordered(obj,order){const keys=Object.keys(obj);return [...order.filter(k=>keys.includes(k)),...keys.filter(k=>!order.includes(k))];}
let language="ko";
let data, original, sha, canSave=false, busy=false, active=0, sections=[];
const fieldLabels=new Map();
function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function status(message,error=false){$('#status').textContent=message;$('#status').setAttribute('role',error?'alert':'status');$('#save-status').textContent=message;}
function changed(a=data,b=original,path=[]){if(!a||!b)return [];if(typeof a==='string')return a===b?[]:[{path,before:b,after:a}];if(typeof a!=='object')return [];return Object.keys(a).flatMap(k=>changed(a[k],b[k],[...path,k]));}
function refresh(){$('#content-language').disabled=busy;const intro=data&&(sections[active]?.path.join('.')==='home.hero'||sections[active]?.kind==='resume');$('#intro-preview').hidden=!intro;if(intro){const f=data.resume.tagline;$('#intro-preview').textContent=(data.home?.hero.greeting||'안녕하세요,')+'\n'+(data.home?.hero.nameLine||'김재형입니다.')+'\n\n'+f[0]+'\n'+f[1];}const count=changed().length;$('#dirty').textContent=count?`${count}개 항목 수정됨 · 아직 저장하지 않았습니다.`:'저장된 내용과 같습니다.';$('#review').disabled=busy||!canSave||!count;$('#reload').disabled=busy||!data;$('#backup').disabled=busy||!data;$('#save').disabled=busy;$('#save').textContent=busy?'저장 중…':'저장하고 배포';$('#cancel').disabled=busy;document.querySelectorAll('#fields textarea,#menu button').forEach(n=>n.disabled=busy);}
function valueAt(path){return path.reduce((v,k)=>v[k],data);}
function setAt(path,value){const parent=valueAt(path.slice(0,-1));parent[path.at(-1)]=value;refresh();}
function field(value,path,parent,label){const key=path.at(-1);if(locked.has(key))return;
 if(typeof value==='string'){
  const wrap=el('div',undefined,'field'),id='field-'+path.join('-'),name=label||labels[key]||key;
  const input=el('textarea');input.id=id;input.value=value;input.rows=Math.min(12,Math.max(2,Math.ceil(value.length/65)));input.maxLength=30000;
  const heading=el('label',name);heading.htmlFor=id;wrap.append(heading,input);fieldLabels.set(path.join('.'),sections[active].title+' / '+name);
  input.addEventListener('input',()=>setAt(path,input.value));return wrap;
 }
 if(value&&typeof value==='object'){
  const group=el('section',undefined,'group');group.append(el('h3',label||labels[key]||`항목 ${Number(key)+1}`));
  if(value.src){const img=el('img');img.src=new URL(value.src,'https://martinel2.github.io/').href;img.alt=value.alt||'';img.className='image';group.append(img);}
  let target=group;
  const keys=('judgment' in value&&'implementation' in value)?ordered(value,stepOrder):Object.keys(value);
  keys.map(k=>[k,value[k]]).forEach(([k,v])=>{let name;
   if(Array.isArray(value))name=matrixLabels[path.at(-2)]?.[Number(k)]||`항목 ${Number(k)+1}`;
   const child=field(v,[...path,k],value,name);if(child)target.append(child);
  });return group;
 }
}
function show(index){active=index;const section=sections[index];$('#section-title').textContent=section.title;$('#fields').replaceChildren();$('#section-help').textContent=section.help||'내용을 수정한 뒤 변경 내용을 확인하고 저장하세요.';document.querySelectorAll('#menu button').forEach((b,i)=>b.setAttribute('aria-current',String(i===index)));
 const obj=valueAt(section.path);const keys=section.path[0]==='cases'?ordered(obj,caseOrder):Object.keys(obj);keys.map(k=>[k,obj[k]]).forEach(([k,v])=>{if(section.kind==='resume'&&section.path.length===1&&Array.isArray(v)&&typeof v[0]==='object')return;const f=field(v,[...section.path,k],obj,k==='problem'?'경험 전체 배경':obj.experiments&&k==='decision'?'개선 과정에서 확인한 점':undefined);if(f)$('#fields').append(f);});refresh();
}
function render(){sections=[];
 if(data.home)for(const [key,title,help] of [
  ['hero','홈 인사말','인사말과 이름, 상단 직무 문구를 수정합니다. 아래 개발자 소개 문구는 홈·이력서의 소개에서 수정하세요.'],
  ['about','홈 소개 제목·마지막 문단','소개 제목과 마지막 문단입니다. 앞의 두 문단은 홈·이력서의 소개에서 수정하세요.'],
  ['actions','이력서·포트폴리오·SNS 버튼','버튼 이름과 LinkedIn·GitHub 주소를 수정합니다. 이력서와 포트폴리오 버튼은 사이트 내부 페이지로 연결됩니다.'],
  ['navigation','상단 메뉴 이름','모든 페이지 상단에 표시되는 메뉴 이름입니다.'],
  ['sections','기술·프로젝트·회고록 제목','섹션 제목과 영문 표기, 블로그 전체 링크를 수정합니다. 기술 제목은 홈·이력서의 기술에서 수정하세요.'],
  ['projectLabels','프로젝트 카드 안내 문구','소속·역할 항목 이름과 팝업을 여는 문구입니다. 실제 소속은 아래 프로젝트 카드·상세 소개의 소속 칸에서, 역할은 프로젝트 팝업에서 수정하세요.']
 ])sections.push({group:'홈 화면',title,path:['home',key],help});
 for(const [path,title,help] of [
  [['resume'],'이력서 머리말과 소개','이름, 직무, 연락처 링크 이름, 다운로드 버튼과 홈 인사말 아래 소개 문구입니다. 아래 프로젝트와 활동은 각 항목에서 수정하세요.'],
  ...data.resume.groups.map((g,i)=>[['resume','groups',String(i)],'이력서 프로젝트: '+(g.id==='fruition'?'Fruition':'Pilltip'),'홈의 프로젝트 팝업과 이력서에 함께 반영됩니다. 역할의 마지막 부분은 홈 카드에도 표시됩니다.']),
  [['resume','extras'],'그 밖의 프로젝트와 활동','홈과 이력서에 함께 반영됩니다.'],
  [['resume','skills'],'기술','홈의 기술 섹션과 이력서에 함께 반영됩니다.'],
  [['resume','education'],'학력','홈과 이력서에 함께 반영됩니다.'],
  [['resume','certifications'],'자격증','홈과 이력서에 함께 반영됩니다.'],
  [['resume','awards'],'수상','홈과 이력서에 함께 반영됩니다.'],
 ])sections.push({group:'홈·이력서',title,path,kind:'resume',help});
 data.projects.forEach((p,i)=>sections.push({group:'프로젝트 카드·상세 소개',title:p.name,path:['projects',String(i)],help:'소속, 표지와 서비스 소개, 저장소 링크는 홈 카드에 표시됩니다. 담당 범위와 서비스 사진은 상세 포트폴리오에 표시됩니다.'}));
 data.writings.forEach((w,i)=>sections.push({group:'팀의 의사결정과 회고',title:w.title,path:['writings',String(i)]}));
 sections.push({group:'포트폴리오',title:'상세 포트폴리오 소개',path:['overview'],help:'상세 포트폴리오의 첫 화면입니다. 홈 인사말은 홈·이력서의 소개에서 수정하세요.'});
 data.cases.forEach((c,i)=>sections.push({group:'상세 경험',title:c.short,path:['cases',String(i)]}));
 $('#menu').replaceChildren();let group='';sections.forEach((s,i)=>{if(s.group!==group){$('#menu').append(el('h2',s.group));group=s.group;}const button=el('button',s.title);button.dataset.path=s.path.join('.');button.addEventListener('click',()=>show(i));$('#menu').append(button);});show(Math.min(active,sections.length-1));
}
async function load(nextLanguage=language){if(data&&changed().length&&!confirm('저장하지 않은 변경을 버리고 다시 불러올까요?')){$('#content-language').value=language;return;}busy=true;refresh();status('최신 내용을 불러오는 중입니다.');try{
 const res=await fetch('/admin/api/content?lang='+nextLanguage,{cache:'no-store',signal:AbortSignal.timeout(35000)});if(res.status===401)throw Error('로그인이 만료됐습니다. 새로고침해 다시 로그인해 주세요.');const body=await res.json();if(!res.ok)throw Error(body.error);
 if(!body.data.overview||!body.data.resume)throw Error('관리자 편집용 사이트 업데이트를 기다리고 있습니다. 잠시 후 다시 불러와 주세요.');
 language=nextLanguage;$('#content-language').value=language;data=body.data;original=structuredClone(data);sha=body.sha;canSave=body.canSave;render();status(canSave?(language==='en'?'영문 내용을 불러왔습니다. 한국어 수정은 자동 번역되지 않습니다.':'한국어 내용을 불러왔습니다. 영문은 편집할 언어에서 별도로 수정하세요.'):'내용 편집과 백업은 가능합니다. 저장 기능은 아직 연결되지 않았습니다.');
 }catch(e){status(e.name==='TimeoutError'?'불러오기가 지연되고 있습니다. 잠시 후 다시 시도해 주세요.':e.message,true);}finally{$('#content-language').value=language;busy=false;refresh();$('#reload').disabled=false;}}
$('#reload').addEventListener('click',()=>load());
$('#content-language').addEventListener('change',event=>load(event.target.value));
$('#backup').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'}));const a=el('a');a.href=url;a.download=`portfolio-content-${language}-backup.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('#review').addEventListener('click',()=>{$('#changes').replaceChildren();for(const c of changed()){const row=el('div',undefined,'change');row.append(el('strong',fieldLabels.get(c.path.join('.'))||c.path.join(' / ')),el('p','이전: '+c.before,'before'),el('p','변경: '+c.after,'after'));$('#changes').append(row);}$('#review-dialog').showModal();});
$('#cancel').addEventListener('click',()=>$('#review-dialog').close());
$('#review-dialog').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
$('#save').addEventListener('click',async()=>{busy=true;refresh();status('저장 중입니다. 창을 닫지 마세요.');try{
 const res=await fetch('/admin/api/content?lang='+language,{method:'POST',signal:AbortSignal.timeout(35000),headers:{'Content-Type':'application/json','X-Editor-Action':'save'},body:JSON.stringify({sha,data})});const result=await res.json();if(!res.ok)throw Error(result.error||'저장하지 못했습니다.');sha=result.sha;original=structuredClone(data);$('#review-dialog').close();status(result.unchanged?'변경된 내용이 없습니다.':'저장됐습니다. 사이트 배포가 시작됩니다. 반영 완료 여부는 배포 상태에서 확인하세요.');
 if(result.deployment){const a=el('a',' 배포 상태 확인 ↗');a.href=result.deployment;a.target='_blank';a.rel='noopener';$('#status').append(a);}
 }catch(e){$('#review-dialog').close();status((e.name==='TimeoutError'?'저장 응답이 지연되어 대기를 중단했습니다. 저장이 완료됐을 수도 있으므로 배포 상태를 확인해 주세요.':e.message)+' 입력 내용은 유지됩니다.',true);}finally{busy=false;refresh();$('#status').scrollIntoView({block:'center'});}});
window.addEventListener('beforeunload',e=>{if(changed().length||busy){e.preventDefault();e.returnValue='';}});
load();
