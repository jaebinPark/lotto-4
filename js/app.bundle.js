
// --- patch_0.029 core ---
const VERSION = 'patch_0.029';
console.log('VERSION', VERSION);

// Force-unregister old service workers & kill caches
(async ()=>{
  if ('serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) await r.unregister();
    } catch(e){ console.warn('sw unregister fail', e); }
  }
  if (window.caches) {
    try {
      const names = await caches.keys();
      await Promise.all(names.map(n=>caches.delete(n)));
    } catch(e){ console.warn('cache cleanup fail', e); }
  }
})();

const KEYS = {
  saved:'lotto:savedSets',
  excluded:'lotto:excludeNumbers',
  recommended:'lotto:recommendedSets'
};

// utilities
const $ = (q,el=document)=>el.querySelector(q);
const $$= (q,el=document)=>Array.from(el.querySelectorAll(q));
const h = (tag, attrs={}, ...children)=>{
  const e = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs||{})) {
    if (k==='class') e.className = v;
    else if (k==='html') e.innerHTML = v;
    else e.setAttribute(k,v);
  }
  for (const c of children) {
    if (c==null) continue;
    e.appendChild(typeof c==='string'? document.createTextNode(c) : c);
  }
  return e;
};

function loadJSONSafely(url){
  return fetch(url, {cache:'no-store'}).then(r=>{
    if (!r.ok) return null;
    return r.json();
  }).catch(_=>null);
}

function getLocal(key, def){
  try{ const v = localStorage.getItem(key); return v? JSON.parse(v): def; }catch(_){ return def; }
}
function setLocal(key, val){
  try{ localStorage.setItem(key, JSON.stringify(val)); }catch(_){}
}

// number helpers
const range = (a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
const colorClass = (n)=> n<=10?'y': (n<=20?'b': (n<=30?'r': (n<=40?'g':'gr')));

const State = {
  draws: [],
  draws50: [],
  last: null,
  loaded: false
};

async function initData(){
  const d1 = await loadJSONSafely('./data/draws.json');
  const d2 = await loadJSONSafely('./data/draws50.json');
  State.draws = Array.isArray(d1)? d1 : [];
  State.draws50 = Array.isArray(d2)? d2 : [];
  State.last = State.draws && State.draws[0] ? State.draws[0] : null; // assume descending by recent
  State.loaded = true;
}

function header(title, opts={home:true, back:false}){
  const row = h('div',{class:'row', style:'margin-bottom:12px'});
  const left = h('button',{class:'btn', style:'width:56px;height:56px'}, '🏠');
  const right= h('button',{class:'btn', style:'width:56px;height:56px'}, '←');
  if (!opts.home) left.classList.add('hidden');
  if (!opts.back) right.classList.add('hidden');
  left.addEventListener('click', ()=>navigate('home'));
  right.addEventListener('click', ()=>history.back());
  row.append(left, h('h1',{}, title), right);
  return row;
}

function cardLatest(draw){
  const card = h('div',{class:'card'});
  if (!draw){
    card.append(h('div',{class:'small'}, '최근 회차 정보 없음'), h('div',{class:'small'}, '데이터 수집 전입니다.'));
    return card;
  }
  const head = h('div',{class:'row'});
  head.append(h('h2',{}, `${draw.round}회차 ${draw.date||''}`));
  card.append(head);

  const nums = (draw.numbers||[]).slice(0,6);
  const bonus = draw.bonus;
  const balls = h('div',{class:'row',style:'gap:10px;flex-wrap:wrap'});
  nums.forEach(n=> balls.append(h('div',{class:`ball ${colorClass(n)}`}, String(n))));
  if (bonus!=null) {
    const b = h('div',{class:`ball ${colorClass(bonus)}`, style:'opacity:.8;position:relative'}, String(bonus));
    balls.append(b);
  }
  card.append(balls);

  const p1 = draw.prize1, p2=draw.prize2, p3=draw.prize3;
  const mk = (p,rank)=> h('div',{class:'small'}, `${rank}등 ${p&&p.amount? p.amount.toLocaleString()+'원':'-'} / ${p&&p.winners!=null? p.winners+'명':'-명'}`);
  card.append(mk(p1,1), mk(p2,2), mk(p3,3));
  return card;
}

function pageHome(){
  const root = $('#app'); root.innerHTML='';
  root.append(header(''));

  // top spacer 30px
  root.append(h('div',{style:'height:30px'}));

  root.append(cardLatest(State.last));

  const btn = (text, go)=>{
    const b = h('button',{class:'btn', style:'margin:14px 0'}, text);
    b.addEventListener('click', ()=>navigate(go));
    return b;
  };
  root.append(btn('당첨번호','wins'));
  root.append(btn('저장번호','saved'));
  root.append(btn('추천','recommend'));
  root.append(btn('분석','analysis'));

  root.append(h('div',{class:'footer'}, `patch ${VERSION}`));
}

function pageWins(){
  const root = $('#app'); root.innerHTML='';
  root.append(header('당첨번호',{home:true, back:true}));
  root.append(cardLatest(State.last));

  const listWrap = h('div',{class:'list'});
  const draws = (State.draws||[]).slice(0,50);
  draws.forEach(d=>{
    const c = cardLatest(d);
    listWrap.append(c);
  });
  root.append(listWrap);
}

function renderSetLine(set, warn=false){
  const line = h('div',{class:'set-line'});
  line.append(h('span',{class:`badge ${warn?'warn':'ok'}`}, warn?'WARN':'OK'));
  set.forEach(n=> line.append(h('div',{class:`ball ${colorClass(n)}`}, String(n))));
  return line;
}

function freqMap(draws){
  const m = new Map();
  for (const d of draws){
    for (const n of (d.numbers||[]).slice(0,6)){
      m.set(n, (m.get(n)||0)+1);
    }
  }
  return m;
}
function zScores(map){
  const all = range(1,45).map(n=> map.get(n)||0);
  const mean = all.reduce((a,b)=>a+b,0)/all.length;
  const sd = Math.sqrt(all.reduce((a,b)=>a+(b-mean)*(b-mean),0)/all.length)||1;
  const z = new Map();
  range(1,45).forEach(n=> z.set(n, ((map.get(n)||0)-mean)/sd));
  return z;
}

function recommend30(excluded, drawsAll){
  const out=[];
  const draws600 = (drawsAll||[]).slice(0,600);
  const last = drawsAll && drawsAll[0]? new Set(drawsAll[0].numbers||[]) : new Set();
  const fm = freqMap(drawsAll||[]);
  const zs = zScores(fm);
  // groups
  const G1 = last;
  const G2 = new Set(range(1,45).filter(n=> (zs.get(n)||0)>=1.0));
  const avg = [...fm.values()].reduce((a,b)=>a+b,0)/Math.max(fm.size,1);
  const counts = n=> fm.get(n)||0;
  // overdue approx: appear rarely
  const G3 = new Set(range(1,45).filter(n=> counts(n)<=avg));
  const G4 = new Set(range(1,45).filter(n=> !G1.has(n) && !G2.has(n) && !G3.has(n)));
  const W = {G1:0.40, G2:0.30, G3:0.15, G4:0.15};
  const groupOf = (n)=> G1.has(n)?'G1': (G2.has(n)?'G2': (G3.has(n)?'G3':'G4'));
  const baseWeight = (n)=>{
    const g = groupOf(n);
    return (W[g]||0.1) * (1 + 0.05*(fm.get(n)||0) + 0.04*(zs.get(n)||0));
  };
  const pop = range(1,45).filter(n=> !excluded.has(n));
  const weights = pop.map(n=> baseWeight(n));
  const sumW = weights.reduce((a,b)=>a+b,0) || 1;
  const prob = weights.map(w=> w/sumW);

  function sample6(){
    const picked=[]; const pickedSet=new Set();
    let g1count=0;
    const cand=pop.slice(); const p=prob.slice();
    function takeOne(){
      // weighted pick
      let r=Math.random(); let acc=0;
      for (let i=0;i<cand.length;i++){
        acc+=p[i];
        if (r<=acc){
          const n=cand.splice(i,1)[0]; const w=p.splice(i,1)[0];
          return n;
        }
      }
      return cand.pop();
    }
    while (picked.length<6 && cand.length){
      const n = takeOne();
      if (pickedSet.has(n)) continue;
      const isG1 = last.has(n);
      if (isG1 && g1count>=2) continue; // G1 편중 제한
      picked.push(n); pickedSet.add(n);
      if (isG1) g1count++;
    }
    picked.sort((a,b)=>a-b);
    return picked;
  }
  function overlaps4(set, d){
    const s=new Set(set);
    let c=0; for (const n of (d.numbers||[]).slice(0,6)) if (s.has(n)) c++;
    return c>=4;
  }
  function similar(a,b){
    const s=new Set(a); let c=0; for (const x of b) if (s.has(x)) c++;
    return c>=4; // avoid near-dup
  }
  while (out.length<30){
    const s = sample6();
    // constraints
    if (draws600.some(d=> overlaps4(s,d))) continue;
    if (out.some(t=> similar(s,t))) continue;
    out.push(s);
  }
  return out;
}

function pageRecommend(){
  const root = $('#app'); root.innerHTML='';
  root.append(header('추천',{home:true, back:true}));

  const excluded = new Set(getLocal(KEYS.excluded, []));
  const recSaved = getLocal(KEYS.recommended, []);

  const grid = h('div',{class:'card'});
  grid.append(h('div',{class:'small'}, '제외수 (눌러서 토글, 10열 고정)'));
  const g = h('div',{class:'grid-nums'});
  range(1,45).forEach(n=>{
    const active = excluded.has(n);
    const chip = active? h('div',{class:`ball ${colorClass(n)}`, 'data-n':n}, String(n))
                       : h('div',{class:'num-chip','data-n':n}, String(n));
    chip.addEventListener('click', ()=>{
      if (excluded.has(n)){ excluded.delete(n); }
      else { excluded.add(n); }
      setLocal(KEYS.excluded, Array.from(excluded));
      pageRecommend(); // re-render
    });
    g.append(chip);
  });
  grid.append(g);

  const row = h('div',{class:'row-buttons'});
  const btnReset = h('button',{class:'btn'}, '제외수 리셋');
  const btnGo = h('button',{class:'btn'}, '추천(30세트)');
  row.append(btnReset, btnGo);
  grid.append(row);

  const info = h('div',{class:'caption'}, `현재 추천 세트: ${recSaved.length}개`);
  grid.append(info);

  const list = h('div',{class:'list'});

  btnReset.addEventListener('click', ()=>{
    setLocal(KEYS.excluded, []);
    // 추천 세트는 그대로 둔다
    pageRecommend();
  });

  btnGo.addEventListener('click', ()=>{
    const sets = recommend30(excluded, State.draws);
    const all = recSaved.concat(sets);
    setLocal(KEYS.recommended, all);
    pageRecommend();
  });

  // if we just generated, show last 30 only
  if (recSaved.length){
    const recent = recSaved.slice(-30);
    const warn = (State.draws||[]).length<600;
    recent.forEach(s=> list.append(renderSetLine(s, warn)));
  }

  root.append(grid, list);
}

function pageSaved(){
  const root = $('#app'); root.innerHTML='';
  root.append(header('저장번호',{home:true, back:true}));
  const saved = getLocal(KEYS.saved, []);
  const card = h('div',{class:'card'});
  card.append(h('div',{class:'small'}, `현재 저장 세트: ${saved.length}개`));
  if (!saved.length) card.append(h('div',{class:'small'}, '아직 저장된 번호가 없습니다.'));
  else saved.slice(-30).forEach(s=> card.append(renderSetLine(s,false)));
  root.append(card);
}

function pageAnalysis(){
  const root = $('#app'); root.innerHTML='';
  root.append(header('분석',{home:true, back:true}));
  const len = (State.draws||[]).length;
  const card = h('div',{class:'card'});
  card.append(h('div',{}, `수집된 회차: ${len}회`));
  if (len<600) card.append(h('div',{class:'small'}, '경고: 600회 미만 데이터로 추천 정확도가 낮을 수 있습니다.'));
  root.append(card);
}

function navigate(where){
  if (where==='home') pageHome();
  else if (where==='wins') pageWins();
  else if (where==='saved') pageSaved();
  else if (where==='recommend') pageRecommend();
  else if (where==='analysis') pageAnalysis();
  history.replaceState({p:where},'', '#'+where);
}

window.addEventListener('popstate', ()=>{
  const p = (location.hash||'').replace('#','')||'home';
  navigate(p);
});

(async function main(){
  await initData();
  const p = (location.hash||'').replace('#','')||'home';
  navigate(p);
})();
