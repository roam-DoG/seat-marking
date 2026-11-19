const $=id=>document.getElementById(id);
const STORE='seat-marking-projects-v1';
let projects=loadProjects(), currentProjectId=null, currentBlockId=null, currentIndex=0, direction='forward', showList=false;
function loadProjects(){try{return JSON.parse(localStorage.getItem(STORE)||'[]')}catch{return []}}
function persist(){localStorage.setItem(STORE,JSON.stringify(projects))}
function uid(){return Math.random().toString(36).slice(2,10)}
function defaultBlock(name='A'){
 return {id:uid(),name,start:0,pitch:0,columns:0,chairDepth:0,chairOffset:0,startMode:'manual',aisleAfter:0};
}
function defaultProject(){return {id:uid(),name:'',venue:'',date:'',blocks:[defaultBlock('A'),defaultBlock('B'),defaultBlock('C')],updated:Date.now()}}
function activeProject(){return projects.find(p=>p.id===currentProjectId)}
function activeBlock(){return activeProject()?.blocks.find(b=>b.id===currentBlockId)}
function number(v,def=0){const x=Number(v);return Number.isFinite(x)?x:def}
function blockRows(b){let start=number(b.start);return Array.from({length:Math.max(1,Math.min(500,number(b.columns,1)))},(_,i)=>{const mark=start+number(b.pitch)*i,front=mark+number(b.chairOffset),rear=front+number(b.chairDepth);return {col:i+1,mark,front,rear}})}
function effectiveStart(b){if(b.startMode!=='auto')return number(b.start);const ix=activeProject().blocks.findIndex(x=>x.id===b.id);if(ix<=0)return number(b.start);const prev=activeProject().blocks[ix-1], rows=blockRows({...prev,start:effectiveStart(prev)});return rows.at(-1).rear+number(prev.aisleAfter)}
const fmt=n=>Math.round(n).toLocaleString('ja-JP');
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));$(id).classList.add('active')}
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1900)}
function renderProjects(){const el=$('projectsList');if(!projects.length){el.innerHTML='<div class="empty">保存された公演はありません。<br>「新しい公演を作成」から始めてください。</div>';return}el.innerHTML=projects.sort((a,b)=>b.updated-a.updated).map(p=>`<div class="project-card"><div><h3>${esc(p.name||'名称未設定')}</h3><p>${esc(p.venue||'会場未設定')} ${p.date||''} · ${p.blocks.length}ブロック</p></div><button class="open-project" data-open="${p.id}">開く</button></div>`).join('');el.querySelectorAll('[data-open]').forEach(btn=>btn.onclick=()=>openProject(btn.dataset.open))}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function openProject(id){currentProjectId=id;const p=activeProject();$('eventName').value=p.name||'';$('venueName').value=p.venue||'';$('eventDate').value=p.date||'';$('projectTitle').textContent=p.name||'公演設定';renderBlocks();renderWorkBlocks();showScreen('editorScreen')}
function renderBlocks(){
 const p=activeProject();
 $('blocksEditor').innerHTML=p.blocks.map(b=>`<div class="block-form" data-block="${b.id}"><div class="block-form-top"><h3>${esc(b.name)}ブロック</h3><div class="block-form-actions"><button class="block-start-btn" data-start="${b.id}">スミ出し</button>${p.blocks.length>1?`<button class="remove-block" data-remove="${b.id}">削除</button>`:''}</div></div><div class="form-grid"><label class="wide">ブロック名<input data-key="name" value="${esc(b.name)}"></label><label>開始寸法 (mm)<input data-key="start" type="number" value="${b.start}"></label><label>開始位置方式<select data-key="startMode"><option value="manual" ${b.startMode==='manual'?'selected':''}>手動入力</option><option value="auto" ${b.startMode==='auto'?'selected':''}>前ブロックから自動</option></select></label><label>ピッチ (mm)<input data-key="pitch" type="number" value="${b.pitch}"></label><label>列数<input data-key="columns" type="number" min="0" max="500" value="${b.columns}"></label><label>椅子奥行 (mm)<input data-key="chairDepth" type="number" value="${b.chairDepth}"></label><label>椅子位置補正 (mm)<input data-key="chairOffset" type="number" value="${b.chairOffset}"></label></div><div class="aisle-box"><h4>${esc(b.name)} → 次ブロックの通路幅</h4><label>通路幅 (mm)<input data-key="aisleAfter" type="number" value="${b.aisleAfter}"></label><small style="color:var(--muted)">次ブロックを「前ブロックから自動」にすると、この幅を使って開始位置を計算します。</small></div></div>`).join('');
 $('blocksEditor').querySelectorAll('.block-form').forEach(form=>{
  const b=p.blocks.find(x=>x.id===form.dataset.block);
  form.querySelectorAll('[data-key]').forEach(inp=>{
   inp.onchange=()=>{const k=inp.dataset.key;b[k]=['start','pitch','columns','chairDepth','chairOffset','aisleAfter'].includes(k)?number(inp.value):inp.value;if(k==='name')form.querySelector('h3').textContent=b.name+'ブロック';renderWorkBlocks()};
  });
  form.querySelector('[data-start]')?.addEventListener('click',()=>startWork(b.id));
  form.querySelector('[data-remove]')?.addEventListener('click',()=>{p.blocks=p.blocks.filter(x=>x.id!==b.id);renderBlocks();renderWorkBlocks()});
 });
}
function renderWorkBlocks(){const p=activeProject();$('workBlocks').innerHTML=p.blocks.map(b=>{const rows=blockRows({...b,start:effectiveStart(b)});return `<div class="work-block-item"><div><strong>${esc(b.name)}ブロック</strong><small>${b.columns}列 · ピッチ ${fmt(b.pitch)}mm · 開始 ${fmt(effectiveStart(b))}mm</small></div><button data-work="${b.id}">スミ出し</button></div>`}).join('');$('workBlocks').querySelectorAll('[data-work]').forEach(btn=>btn.onclick=()=>startWork(btn.dataset.work))}
function saveProject(){const p=activeProject();p.name=$('eventName').value.trim();p.venue=$('venueName').value.trim();p.date=$('eventDate').value;p.updated=Date.now();persist();$('projectTitle').textContent=p.name||'公演設定';renderProjects();renderWorkBlocks();toast('公演データを保存しました')}
function startWork(blockId){currentBlockId=blockId;currentIndex=0;direction='forward';showList=false;$('dimensionsList').classList.add('hidden');updateWork();showScreen('workScreen')}
function orderedIndex(){const b=activeBlock(),n=blockRows({...b,start:effectiveStart(b)}).length;return direction==='forward'?currentIndex:n-1-currentIndex}
function updateWork(){const p=activeProject(),b=activeBlock();if(!p||!b)return;const rows=blockRows({...b,start:effectiveStart(b)}),idx=orderedIndex(),r=rows[idx];$('workProjectLabel').textContent=p.name+' · '+p.venue;$('workBlockLabel').textContent=b.name+'ブロック';$('currentRowLabel').textContent=r.col+'列目';$('rowProgress').textContent=(currentIndex+1)+' / '+rows.length;$('currentDimension').innerHTML=fmt(r.mark)+'<span>mm</span>';$('previousPitch').textContent=idx===0?'開始寸法':`前列から + ${fmt(b.pitch)} mm`;$('chairFront').textContent=fmt(r.front)+' mm';$('chairRear').textContent=fmt(r.rear)+' mm';$('progressFill').style.width=((currentIndex+1)/rows.length*100)+'%';$('prevRow').disabled=currentIndex<=0;$('nextRow').disabled=currentIndex>=rows.length-1;$('forwardMode').classList.toggle('active',direction==='forward');$('reverseMode').classList.toggle('active',direction==='reverse');renderDimensions(rows,idx)}
function renderDimensions(rows,selected){$('dimensionsList').innerHTML=rows.map((r,i)=>`<button class="dimension-row ${i===selected?'current':''}" data-row="${i}"><span>${r.col}列目</span><strong>${fmt(r.mark)} mm</strong><small>椅子後端 ${fmt(r.rear)}mm</small></button>`).join('');$('dimensionsList').querySelectorAll('[data-row]').forEach(btn=>btn.onclick=()=>{const row=Number(btn.dataset.row);currentIndex=direction==='forward'?row:rows.length-1-row;showList=false;$('dimensionsList').classList.add('hidden');updateWork()})}
$('newProjectBtn').onclick=()=>{const p=defaultProject();projects.unshift(p);currentProjectId=p.id;persist();openProject(p.id)};
$('backBtn').onclick=()=>{saveProject();showScreen('projectsScreen');renderProjects()};
$('workBackBtn').onclick=()=>showScreen('editorScreen');
$('saveBtn').onclick=()=>{if(activeProject()){saveProject();toast('保存しました')}else toast('公演を開いてください')};
$('saveProjectBtn').onclick=saveProject;
$('addBlockBtn').onclick=()=>{const p=activeProject(),name=String.fromCharCode(65+p.blocks.length);p.blocks.push(defaultBlock(name));renderBlocks();renderWorkBlocks()};
$('deleteProjectBtn').onclick=()=>{if(confirm('この公演データを削除しますか？')){projects=projects.filter(p=>p.id!==currentProjectId);persist();renderProjects();showScreen('projectsScreen')}};
['eventName','venueName','eventDate'].forEach(id=>$(id).onchange=()=>{const p=activeProject();p.name=$('eventName').value;p.venue=$('venueName').value;p.date=$('eventDate').value;$('projectTitle').textContent=p.name||'公演設定';p.updated=Date.now();persist();renderProjects()});
$('prevRow').onclick=()=>{currentIndex=Math.max(0,currentIndex-1);updateWork()};
$('nextRow').onclick=()=>{const b=activeBlock(),max=Math.max(1,Math.min(500,number(b.columns,1)));currentIndex=Math.min(max-1,currentIndex+1);updateWork()};
$('firstRow').onclick=()=>{currentIndex=0;updateWork()};
$('lastRow').onclick=()=>{const b=activeBlock();currentIndex=Math.max(0,Math.min(500,number(b.columns,1))-1);updateWork()};
$('forwardMode').onclick=()=>{direction='forward';currentIndex=0;updateWork()};
$('reverseMode').onclick=()=>{direction='reverse';currentIndex=0;updateWork()};
$('listToggle').onclick=()=>{showList=!showList;$('dimensionsList').classList.toggle('hidden',!showList);$('listToggle').textContent=showList?'一覧を閉じる':'寸法一覧'};
$('changeBlockBtn').onclick=()=>{showScreen('editorScreen');document.querySelector('.section-head:nth-of-type(2)')?.scrollIntoView({behavior:'smooth'})};
renderProjects();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
