
/* Lotto 6/45 PWA - Full bundle with UI/UX spec (patch_0.014) */
(function(){
  const VERSION = (window.APP_BUILD||'patch_0.014');

  const $ = (sel,root=document)=>root.querySelector(sel);
  const $$ = (sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const clamp = (n, a, b)=> Math.max(a, Math.min(b, n));
  const fmt = Intl.NumberFormat('ko-KR');

  const store = {
    get(k, d){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } },
    set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} },
  };

  const LS = {
    SAVED: "lotto.saved.byRound",
    EXCL:  "lotto.recommend.exclusions",
  };

  const Data = {
    draws: [],
    draws50: [],
    latest(){ return this.draws[this.draws.length-1] || null; },
    nextRound(){ const lt=this.latest(); return lt? (lt.no+1) : 1; },
    collectedCount(){ return (this.draws50||[]).length; }
  };

  function rng(){
    let s = (Date.now() % 2147483647);
    return ()=> (s = (s*48271) % 2147483647) / 2147483647;
  }
  function generateSet(excl){
    const arr=[]; const ex = new Set(excl||[]);
    const all=[]; for(let n=1;n<=45;n++){ if(!ex.has(n)) all.push(n); }
    if(all.length<6){ return [1,2,3,4,5,6]; }
    const r = rng();
    while(arr.length<6){ const idx = Math.floor(r()*all.length); const n=all.splice(idx,1)[0]; arr.push(n); }
    arr.sort((a,b)=>a-b); return arr;
  }
  function calcProbPlaceholder(){ return clamp(Math.floor(35 + Math.random()*50),1,100); }

  function chip(n, cls=''){ const d=document.createElement('div'); d.className='chip'+(cls?(' '+cls):''); d.textContent=n; return d; }
  function drawBox(d){
    const box=document.createElement('div'); box.className='card draw-box';
    const title=document.createElement('div'); title.className='kv'; title.innerHTML=`<b>${d.no}회차</b> <span class="small">${d.date||''}</span>`; box.appendChild(title);
    const line=document.createElement('div'); line.className='chips'; (d.nums||[]).forEach(n=>line.appendChild(chip(n))); line.appendChild(chip(d.bnus,'bonus')); box.appendChild(line);
    const m=document.createElement('div'); m.className='meta13';
    const f1=d.first||{}, s2=d.second||{}, t3=d.third||{};
    m.innerHTML=`<div>1등 ${f1.amount?fmt.format(f1.amount)+'원':'-'} / ${f1.winners?fmt.format(f1.winners):'-'}명</div>
                 <div>2등 ${s2.amount?fmt.format(s2.amount)+'원':'-'} / ${s2.winners?fmt.format(s2.winners):'-'}명</div>
                 <div>3등 ${t3.amount?fmt.format(t3.amount)+'원':'-'} / ${t3.winners?fmt.format(t3.winners):'-'}명</div>`;
    box.appendChild(m);
    return box;
  }
  function header(title){ const h=document.createElement('div'); h.className='app-header'; h.innerHTML=`<h1>${title}</h1><div class="top-gap"></div>`; return h; }
  function section(id){ const s=document.createElement('div'); s.id=id; s.className='section'; return s; }

  function pageHome(){
    const root=section('home'); root.appendChild(header('홈'));
    const c=document.createElement('div'); c.className='container';
    const lt=Data.latest(); if(lt) c.appendChild(drawBox(lt));
    const menu=document.createElement('div'); menu.className='menu'; c.appendChild(menu);
    [['당첨번호','#draws'],['저장번호','#saved'],['추천','#recommend'],['분석','#analytics']].forEach(([label,href])=>{
      const b=document.createElement('button'); b.className='btn lg'; b.textContent=label; b.onclick=()=>location.hash=href; menu.appendChild(b);
    });
    const badge=document.createElement('div'); badge.className='footer-badge'; badge.textContent=window.APP_BUILD||'patch_0.014'; root.appendChild(c); root.appendChild(badge);
    return root;
  }

  function pageDraws(){
    const root=section('draws'); root.appendChild(header('당첨번호'));
    const c=document.createElement('div'); c.className='container';
    const lt=Data.latest(); if(lt) c.appendChild(drawBox(lt));
    const wrap=document.createElement('div'); wrap.className='grid'; Data.draws.slice(-50).reverse().forEach(d=>wrap.appendChild(drawBox(d))); c.appendChild(wrap); root.appendChild(c); return root;
  }

  function getSaved(){ return store.get(LS.SAVED, {}); }
  function setSaved(v){ store.set(LS.SAVED, v); }

  function matchRank(set, draw){
    if(!draw) return '미추첨';
    const bn = draw.bnus; const S=new Set(set); let hit=0; draw.nums.forEach(n=>{ if(S.has(n)) hit++; });
    const bonus=S.has(bn);
    if(hit===6) return '1등 당첨'; if(hit===5 && bonus) return '2등 당첨'; if(hit===5) return '3등 당첨'; if(hit===4) return '4등'; if(hit===3) return '5등'; return '미당첨';
  }

  function pageSaved(){
    const root=section('saved'); root.appendChild(header('저장번호'));
    const c=document.createElement('div'); c.className='container';
    const saved=getSaved();
    const rounds=Object.keys(saved).map(n=>parseInt(n,10)).sort((a,b)=>b-a).slice(0,3);
    if(rounds.length===0){ const empty=document.createElement('div'); empty.className='card center'; empty.innerHTML='<div class="hint">아직 저장된 번호가 없습니다. 추천에서 30세트를 받아보세요.</div>'; c.appendChild(empty); }
    else{
      rounds.forEach(rn=>{
        const title=document.createElement('h2'); title.textContent=rn+'회차 예상번호'; c.appendChild(title);
        const blocks=saved[rn]||[];
        blocks.forEach((block,bi)=>{
          const draw = Data.draws.find(d=>d.no===rn);
          if(draw){ block.closed=true; block.resultLabel=''; }
          const card=document.createElement('div'); card.className='card';
          block.games.forEach(g=>{
            const row=document.createElement('div'); row.className='inline-row';
            const warn=document.createElement('div'); warn.className='warnbar '+(Data.collectedCount()<600?'red':'blue');
            const chips=document.createElement('div'); chips.className='chips'; g.forEach(n=>chips.appendChild(chip(n)));
            const status=document.createElement('div'); status.className='status'; status.textContent=draw?matchRank(g,draw):'미추첨';
            row.appendChild(warn); row.appendChild(chips); row.appendChild(status); card.appendChild(row);
          });
          if(!draw){
            const reset=document.createElement('button'); reset.className='btn ghost'; reset.style.marginTop='10px'; reset.textContent='리셋(이 30게임 삭제)';
            reset.onclick=()=>{ const cur=getSaved(); cur[rn].splice(bi,1); setSaved(cur); location.reload(); };
            card.appendChild(reset);
          }
          c.appendChild(card);
        });
      });
    }
    root.appendChild(c); return root;
  }

  function getExclusions(){ return store.get(LS.EXCL, []); }
  function setExclusions(v){ store.set(LS.EXCL, v); }

  function pageRecommend(){
    const root=section('recommend'); root.appendChild(header('추천'));
    const c=document.createElement('div'); c.className='container';
    const hint=document.createElement('div'); hint.className='hint'; hint.textContent='제외수를 선택하세요 (10열 고정). 리셋으로 초기화합니다.'; c.appendChild(hint);
    const grid=document.createElement('div'); grid.className='exclude'; const excl=new Set(getExclusions());
    for(let n=1;n<=45;n++){ const d=chip(n); d.style.cursor='pointer'; if(excl.has(n)) d.style.opacity=.35, d.style.filter='grayscale(1)';
      d.onclick=()=>{ if(excl.has(n)) excl.delete(n); else excl.add(n); setExclusions(Array.from(excl)); d.style.opacity=excl.has(n)?.35:1; d.style.filter=excl.has(n)?'grayscale(1)':'none'; };
      grid.appendChild(d);
    }
    c.appendChild(grid);
    const row=document.createElement('div'); row.className='row'; row.style.marginTop='10px';
    const btnReset=document.createElement('button'); btnReset.className='btn ghost'; btnReset.textContent='제외수 리셋';
    const btnRec=document.createElement('button'); btnRec.className='btn'; btnRec.style.flex=1; btnRec.textContent='추천 30세트';
    row.appendChild(btnReset); row.appendChild(btnRec); c.appendChild(row);
    const out=document.createElement('div'); out.className='grid'; out.style.marginTop='10px'; c.appendChild(out);
    btnReset.onclick=()=>{ setExclusions([]); location.reload(); };
    btnRec.onclick=()=>{
      out.innerHTML='';
      const sets=[]; for(let i=0;i<30;i++){ sets.push(generateSet(Array.from(excl))); }
      const up=Data.nextRound(); const cur=getSaved(); cur[up]=cur[up]||[]; cur[up].push({ blockId:Date.now(), games:sets, closed:false }); setSaved(cur);
      sets.forEach(g=>{ const row=document.createElement('div'); row.className='inline-row'; const warn=document.createElement('div'); warn.className='warnbar '+(Data.collectedCount()<600?'red':'blue'); const chips=document.createElement('div'); chips.className='chips'; g.forEach(n=>chips.appendChild(chip(n))); const prob=document.createElement('div'); prob.className='status'; prob.textContent=calcProbPlaceholder()+'%'; row.appendChild(warn); row.appendChild(chips); row.appendChild(prob); out.appendChild(row); });
      window.scrollTo({top:0,behavior:'smooth'});
    };
    root.appendChild(c); return root;
  }

  function pageAnalytics(){
    const root=section('analytics'); root.appendChild(header('분석'));
    const c=document.createElement('div'); c.className='container';
    const minNo = Data.draws[0]?.no || 0; const maxNo = Data.latest()?.no || 0;
    const card1=document.createElement('div'); card1.className='card'; card1.innerHTML=`<h3>수집 범위</h3><div class="small">${minNo}회차 ~ ${maxNo}회차 (총 ${Data.draws.length}개)</div>`;
    const card2=document.createElement('div'); card2.className='card'; card2.innerHTML=`<h3>상태</h3><div class="small">${Data.collectedCount()>=600?'정상 수집':'최근 600회 미만 (데이터 보강 필요)'}</div>`;
    c.appendChild(card1); c.appendChild(card2); root.appendChild(c); return root;
  }

  function mount(){
    const app=$("#app"); app.innerHTML=''; const hash=location.hash||'#home';
    const pages={'#home':pageHome,'#draws':pageDraws,'#saved':pageSaved,'#recommend':pageRecommend,'#analytics':pageAnalytics};
    const el=(pages[hash]||pages['#home'])(); el.classList.add('active'); el.classList.add('section'); app.appendChild(el);
    if(hash!=='#home'){ const fab=document.createElement('button'); fab.className='fab'; fab.textContent='↑'; fab.onclick=()=>window.scrollTo({top:0,behavior:'smooth'}); const show=()=>{ if(window.scrollY>200) fab.classList.add('show'); else fab.classList.remove('show'); }; window.addEventListener('scroll', show, {passive:true}); show(); document.body.appendChild(fab); document.body.classList.remove('no-scroll'); } else { document.body.classList.add('no-scroll'); }
  }

  async function loadData(){
    async function fetchJSON(p){ try{ const r=await fetch(p+'?v='+Date.now(), {cache:'no-cache'}); if(!r.ok) throw 0; return await r.json(); }catch(e){ return []; } }
    Data.draws = await fetchJSON('data/draws.json'); Data.draws50 = await fetchJSON('data/draws50.json');
  }
  window.addEventListener('hashchange', mount);
  (async function(){ await loadData(); mount(); })();
})();
