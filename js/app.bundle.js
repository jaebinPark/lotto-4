/* Lotto PWA patch 0.020 — Full UI(1:1) + 0.019 hotfix + beige palette */
(function(){
  const VERSION = 'patch_0.020';
  const $ = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const fmt = Intl.NumberFormat('ko-KR');

  const store={ get(k,d){ try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;} },
                set(k,v){ try{localStorage.setItem(k,JSON.stringify(v));}catch(e){} } };

  const LS={ SAVED:'lotto.saved.byRound', EXCL:'lotto.recommend.exclusions', HILITE:'lotto.saved.hilite', PATCHLOG:'lotto.patch.log' };

  const Data={ draws:[], draws50:[], latest(){return this.draws[this.draws.length-1]||null;}, nextRound(){const lt=this.latest();return lt?(lt.no+1):1;}, collectedCount(){return (this.draws50||[]).length;} };

  function goldCrown(){
    return `<span class="crown" aria-label="1등 당첨 확인" role="img">
      <svg viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 36 L16 18 L32 30 L48 12 L58 36 Z" fill="#D4AF37" stroke="#B0892E" stroke-width="2"/>
        <rect x="8" y="34" width="48" height="8" rx="2" fill="#D4AF37" stroke="#B0892E" stroke-width="2"/>
        <text x="32" y="32" text-anchor="middle" font-size="16" fill="#2E2A26">1등</text>
      </svg>
    </span>`;
  }

  function chip(n, type='num'){
    const el=document.createElement('div');
    const cls=['chip'];
    if(type==='num'){ cls.push('chip-num'); }
    else{
      cls.push('chip-lt');
      if(n<=10) cls.push('lt-1-10');
      else if(n<=20) cls.push('lt-11-20');
      else if(n<=30) cls.push('lt-21-30');
      else if(n<=40) cls.push('lt-31-40');
      else cls.push('lt-41-45');
    }
    el.className=cls.join(' ');
    el.textContent=n;
    return el;
  }
  function chipRow(nums, toColorSet=null){
    const wrap=document.createElement('div'); wrap.className='chips';
    const colorSet = toColorSet? new Set(toColorSet): null;
    nums.forEach(n=>{
      const t = colorSet && colorSet.has(n) ? 'lt' : 'num';
      wrap.appendChild(chip(n, t));
    });
    return wrap;
  }

  function drawBox(d){
    const box=document.createElement('div'); box.className='card draw-box';
    const title=document.createElement('div'); title.className='kv';
    title.innerHTML=`<b>${d.no}회차</b> <span class="small">${d.date||''}</span>`;
    box.appendChild(title);
    const line=chipRow(d.nums, new Set(d.nums));
    const bn=chip(d.bnus,'lt'); bn.classList.add('bonus'); line.appendChild(bn); box.appendChild(line);
    const m=document.createElement('div'); m.className='meta13';
    const f1=d.first||{}, s2=d.second||{}, t3=d.third||{};
    m.innerHTML=`<div>1등 ${f1.amount?fmt.format(f1.amount)+'원':'-'} / ${f1.winners?fmt.format(f1.winners):'-'}명</div>
                 <div>2등 ${s2.amount?fmt.format(s2.amount)+'원':'-'} / ${s2.winners?fmt.format(s2.winners):'-'}명</div>
                 <div>3등 ${t3.amount?fmt.format(t3.amount)+'원':'-'} / ${t3.winners?fmt.format(t3.winners):'-'}명</div>`;
    box.appendChild(m);
    return box;
  }

  function secondsToNextSat2035(){
    const now=new Date();
    const day = now.getDay();
    const daysUntilSat = (6 - day + 7) % 7;
    const target = new Date(now);
    target.setDate(now.getDate() + daysUntilSat);
    target.setHours(20,35,0,0);
    if(target <= now){ target.setDate(target.getDate()+7); }
    const diff = target - now;
    return Math.ceil(diff / (1000*60*60*24));
  }

  function matchRank(set, draw){
    if(!draw) return '미추첨';
    const S=new Set(set); let hit=0; (draw.nums||[]).forEach(n=>{ if(S.has(n)) hit++; });
    const bonus=S.has(draw.bnus);
    if(hit===6) return '1등'; if(hit===5 && bonus) return '2등'; if(hit===5) return '3등'; if(hit===4) return '4등'; if(hit===3) return '5등'; return '미당첨';
  }

  function autoFitRow(row){
    const chips = row.querySelector('.chips');
    if(!chips) return;
    const tryClasses=['','small','xs','xx'];
    for(const cls of tryClasses){
      chips.classList.remove('small','xs','xx');
      if(cls) chips.classList.add(cls);
      if(chips.scrollWidth <= chips.clientWidth + 1){ break; }
    }
  }

  // 공용 모달
  function showModal(title, html){
    const ov=document.createElement('div'); ov.className='overlay';
    const md=document.createElement('div'); md.className='modal';
    md.innerHTML = `<h3>${title}</h3><div class="content">${html}</div>
      <div class="actions"><button class="btn ghost">닫기</button></div>`;
    ov.appendChild(md);
    ov.addEventListener('click', (e)=>{ if(e.target===ov) ov.remove(); });
    md.querySelector('.btn').onclick=()=>ov.remove();
    document.body.appendChild(ov);
  }

  // QR 오버레이
  function showQROverlay(urlText){
    const ov=document.createElement('div'); ov.className='overlay';
    const md=document.createElement('div'); md.className='modal';
    const href = urlText || '#';
    md.innerHTML = `<div style="text-align:center;">
      <p class="small" style="margin-bottom:12px">스캔 완료</p>
      <a class="qr-go" href="${href}" target="_blank" rel="noopener">확인하러가기<br><span style="font-size:12px;opacity:.8">${href}</span></a>
      <div class="small" style="margin-top:12px;opacity:.8">주변을 터치하면 닫힙니다</div>
    </div>`;
    ov.appendChild(md);
    ov.addEventListener('click', (e)=>{ if(e.target===ov) ov.remove(); });
    document.body.appendChild(ov);
  }

  function header(title, opts={}){
    const h=document.createElement('div'); h.className='app-header';
    const nav=document.createElement('div'); nav.className='nav-row';
    if(opts.home){
      const left=document.createElement('div'); left.className='nav-btn nav-left'; left.innerHTML=`<svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`;
      left.onclick=()=>{ location.hash='#home'; };
      nav.appendChild(left);
    }
    if(opts.back){
      const right=document.createElement('div'); right.className='nav-btn nav-right'; right.innerHTML=`<svg viewBox="0 0 24 24"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>`;
      right.onclick=()=>{ history.back(); };
      nav.appendChild(right);
    }
    const ttl=document.createElement('h1'); ttl.textContent=title;
    h.appendChild(nav); h.appendChild(ttl);
    h.appendChild(Object.assign(document.createElement('div'),{className:'top-gap'}));
    return h;
  }

  // 페이지들
  function pageHome(){
    const root=document.createElement('div'); root.id='home'; root.className='section active';
    root.appendChild(Object.assign(document.createElement('div'),{className:'home-spacer'}));
    const c=document.createElement('div'); c.className='container';
    const lt=Data.latest(); if(lt) c.appendChild(drawBox(lt));

    const menu=document.createElement('div'); menu.className='menu-vertical';

    function makeWinningBtn(label){
      const b=document.createElement('button'); b.className='btn lg btn-winning';
      b.innerHTML= `${goldCrown()} <span>${label}</span>`;
      b.onclick=()=>{ location.hash='#saved'; };
      return b;
    }
    const btnDraws=document.createElement('button'); btnDraws.className='btn lg'; btnDraws.textContent='당첨번호'; btnDraws.onclick=()=>location.hash='#draws';
    const btnSaved=document.createElement('button'); btnSaved.className='btn lg'; btnSaved.textContent='저장번호'; btnSaved.onclick=()=>location.hash='#saved';
    const btnRec=document.createElement('button'); btnRec.className='btn lg'; btnRec.textContent='추천'; btnRec.onclick=()=>location.hash='#recommend';
    const btnAnal=document.createElement('button'); btnAnal.className='btn lg'; btnAnal.textContent='분석'; btnAnal.onclick=()=>location.hash='#analytics';

    try{
      const saved=store.get(LS.SAVED,{}); const curRound=Data.latest()?.no;
      if(curRound && saved[curRound]){
        const blocks = saved[curRound]||[];
        let anyWin=false;
        const draw=Data.draws.find(d=>d.no===curRound);
        blocks.forEach(b=> (b.games||[]).forEach(g=>{ const r=matchRank(g, draw); if(r && r!=='미당첨' && r!=='미추첨') anyWin=true; }));
        if(anyWin){
          const winBtn = makeWinningBtn('당첨 확인');
          menu.appendChild(btnDraws); menu.appendChild(winBtn); menu.appendChild(btnRec); menu.appendChild(btnAnal);
        }else{
          menu.appendChild(btnDraws); menu.appendChild(btnSaved); menu.appendChild(btnRec); menu.appendChild(btnAnal);
        }
      }else{
        menu.appendChild(btnDraws); menu.appendChild(btnSaved); menu.appendChild(btnRec); menu.appendChild(btnAnal);
      }
    }catch(e){
      menu.appendChild(btnDraws); menu.appendChild(btnSaved); menu.appendChild(btnRec); menu.appendChild(btnAnal);
    }

    c.appendChild(menu);
    const badge=document.createElement('div'); badge.className='footer-badge'; badge.textContent=VERSION;
    root.appendChild(c); root.appendChild(badge);
    document.body.classList.add('no-scroll');
    return root;
  }

  function pageDraws(){
    const root=document.createElement('div'); root.id='draws'; root.className='section';
    root.appendChild(header('당첨번호', {home:true, back:true}));
    const c=document.createElement('div'); c.className='container';
    const lt=Data.latest(); if(lt) c.appendChild(drawBox(lt));
    const q=document.createElement('button'); q.className='btn lg'; q.textContent='QR코드로 확인하기';
    q.onclick=()=>{ showQROverlay('https://dhlottery.co.kr/common.do?method=main'); };
    c.appendChild(q);
    const wrap=document.createElement('div'); wrap.className='grid'; Data.draws.slice(-50).reverse().forEach(d=>wrap.appendChild(drawBox(d))); c.appendChild(wrap);
    root.appendChild(c);
    const fab=document.createElement('button'); fab.className='fab'; fab.textContent='↑';
    fab.onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
    const show=()=>{ if(window.scrollY>200) fab.classList.add('show'); else fab.classList.remove('show'); };
    window.addEventListener('scroll', show, {passive:true}); show();
    document.body.appendChild(fab);
    document.body.classList.remove('no-scroll');
    return root;
  }

  function pageSaved(){
    const root=document.createElement('div'); root.id='saved'; root.className='section';
    root.appendChild(header('저장번호', {home:true, back:true}));
    const c=document.createElement('div'); c.className='container';

    const saved=store.get(LS.SAVED,{});
    const hilite=store.get(LS.HILITE,{});
    const rounds=Object.keys(saved).map(n=>parseInt(n,10)).sort((a,b)=>b-a).slice(0,3);

    if(rounds.length===0){
      const empty=document.createElement('div'); empty.className='card center';
      empty.innerHTML='<div class="hint">아직 저장된 번호가 없습니다. 추천에서 30세트를 받아보세요.</div>';
      c.appendChild(empty);
    }else{
      rounds.forEach(rn=>{
        const blocks=saved[rn]||[];
        const draw=Data.draws.find(d=>d.no===rn)||null;

        const title=document.createElement('h2');
        if(draw){ title.textContent = `${rn}회차`; } else { title.textContent = `${rn}회차 예상번호 · D-day ${secondsToNextSat2035()}`; }
        c.appendChild(title);
        if(draw){ c.appendChild(drawBox(draw)); delete hilite[rn]; }

        blocks.forEach((block, bi)=>{
          const card=document.createElement('div'); card.className='card';
          (block.games||[]).forEach((g, gi)=>{
            const row=document.createElement('div'); row.className='inline-row';
            const key = rn;
            const map = hilite[key] = hilite[key] || {};
            const arr = map[block.blockId] = map[block.blockId] || Array((block.games||[]).length).fill(false);
            if(arr[gi]) row.classList.add('hl');
            row.onclick=()=>{
              arr[gi]=!arr[gi];
              if(arr[gi]) row.classList.add('hl'); else row.classList.remove('hl');
              store.set(LS.HILITE, hilite);
            };
            const warn=document.createElement('div'); warn.className='warnbar '+(Data.collectedCount()<600?'red':'blue');
            const colorSet = draw? new Set(draw.nums): null;
            const chips = chipRow(g, colorSet);
            const status=document.createElement('div'); status.className='status'; status.textContent= matchRank(g, draw);
            row.appendChild(warn); row.appendChild(chips); row.appendChild(status);
            card.appendChild(row);
            setTimeout(()=>autoFitRow(row),0);
          });
          // 5게임마다 구분선
          const children = Array.from(card.children);
          children.forEach((el, idx)=>{
            if((idx+1)%5===0 && (idx+1)<children.length){
              const hr=document.createElement('hr'); card.insertBefore(hr, children[idx+1]);
            }
          });
          // 발표 전만 리셋 버튼(해당 30게임 삭제)
          if(!draw){
            const reset=document.createElement('button'); reset.className='btn ghost'; reset.style.marginTop='10px'; reset.textContent='리셋(이 30게임 삭제)';
            reset.onclick=()=>{ const cur=store.get(LS.SAVED,{}); (cur[rn]||[]).splice(bi,1); store.set(LS.SAVED,cur); location.reload(); };
            card.appendChild(reset);
          }
          c.appendChild(card);
        });
      });
    }
    store.set(LS.HILITE, hilite);
    const fab=document.createElement('button'); fab.className='fab'; fab.textContent='↑';
    fab.onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
    const show=()=>{ if(window.scrollY>200) fab.classList.add('show'); else fab.classList.remove('show'); };
    window.addEventListener('scroll', show, {passive:true}); show();
    document.body.appendChild(fab);
    document.body.classList.remove('no-scroll');
    return root;
  }

  function pageRecommend(){
    const root=document.createElement('div'); root.id='recommend'; root.className='section';
    root.appendChild(header('추천', {home:true, back:true}));
    const c=document.createElement('div'); c.className='container';

    const grid=document.createElement('div'); grid.className='exclude';
    const excl=new Set(store.get(LS.EXCL,[]));
    function isExcluded(n){ return excl.has(n); }
    function renderChip(n){
      const type = isExcluded(n)? 'lt' : 'num';
      const ch = chip(n, type);
      if(isExcluded(n)) ch.setAttribute('data-excluded','1'); else ch.removeAttribute('data-excluded');
      ch.style.cursor='pointer';
      ch.onclick=()=>{
        if(isExcluded(n)) excl.delete(n); else excl.add(n);
        store.set(LS.EXCL, Array.from(excl));
        const repl = chip(n, isExcluded(n)?'lt':'num');
        repl.onclick = ch.onclick;
        grid.replaceChild(repl, ch);
      };
      return ch;
    }
    for(let n=1;n<=45;n++){ grid.appendChild(renderChip(n)); }
    c.appendChild(grid);

    const r=document.createElement('div'); r.className='row'; r.style.marginTop='10px';
    const bReset=document.createElement('button'); bReset.className='btn ghost'; bReset.textContent='제외수 리셋';
    const bGo=document.createElement('button'); bGo.className='btn'; bGo.style.flex=1; bGo.textContent='추천';
    r.appendChild(bReset); r.appendChild(bGo); c.appendChild(r);

    const out=document.createElement('div'); out.className='grid'; out.style.marginTop='10px'; c.appendChild(out);

    bReset.onclick=()=>{ store.set(LS.EXCL,[]); location.reload(); };

    function rng(){ let s=(Date.now()%2147483647); return ()=> (s=(s*48271)%2147483647)/2147483647; }
    function generateSet(exclArr){ const arr=[]; const ex=new Set(exclArr||[]); const all=[]; for(let n=1;n<=45;n++){ if(!ex.has(n)) all.push(n); } if(all.length<6) return [1,2,3,4,5,6]; const r=rng(); while(arr.length<6){ const idx=Math.floor(r()*all.length); arr.push(all.splice(idx,1)[0]); } return arr.sort((a,b)=>a-b); }
    function prob(){ return clamp(Math.floor(1+Math.random()*100),1,100); } // 1~100

    bGo.onclick=()=>{
      out.innerHTML='';

      // 알림: 최근 600 미만 수집 시
      if(Data.collectedCount()<600){
        showModal('알림', '<div class="small">최근 600회 추첨 데이터가 모두 수집되지 않았습니다. (시각화: 빨간 경고 막대)</div>');
      }

      // 30게임(5×6) 블록 생성
      const sets=[]; const exclArr=Array.from(excl);
      for(let i=0;i<30;i++){ sets.push(generateSet(exclArr)); }

      // 저장번호에 다음 회차로 누적 저장
      const up=Data.nextRound(); const cur=store.get(LS.SAVED,{});
      cur[up]=cur[up]||[]; const blockId=Date.now(); cur[up].push({ blockId, games:sets }); store.set(LS.SAVED,cur);

      // 카드 하나에 30줄 그리고 5줄마다 구분선
      const card=document.createElement('div'); card.className='card';
      sets.forEach((g, idx)=>{
        const row=document.createElement('div'); row.className='inline-row';
        const warn=document.createElement('div'); warn.className='warnbar '+(Data.collectedCount()<600?'red':'blue');
        const chips=chipRow(g, new Set(g));
        const status=document.createElement('div'); status.className='status'; status.textContent=prob()+'%';
        row.appendChild(warn); row.appendChild(chips); row.appendChild(status);
        card.appendChild(row);
        setTimeout(()=>autoFitRow(row),0);
        if((idx+1)%5===0 && (idx+1)<sets.length){ const hr=document.createElement('hr'); card.appendChild(hr); }
      });
      out.appendChild(card);
      window.scrollTo({top:0,behavior:'smooth'});
    };

    const fab=document.createElement('button'); fab.className='fab'; fab.textContent='↑';
    fab.onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
    const show=()=>{ if(window.scrollY>200) fab.classList.add('show'); else fab.classList.remove('show'); };
    window.addEventListener('scroll', show, {passive:true}); show();
    document.body.appendChild(fab);
    document.body.classList.remove('no-scroll');
    return root;
  }

  function pageAnalytics(){
    const root=document.createElement('div'); root.id='analytics'; root.className='section';
    root.appendChild(header('분석', {home:true, back:true}));
    const c=document.createElement('div'); c.className='container';
    const minNo=Data.draws[0]?.no||0; const maxNo=Data.latest()?.no||0;
    const statusText = Data.draws.length===0 || Data.draws50.length===0
      ? '데이터 로드 실패(네트워크/경로)'
      : (Data.collectedCount()>=600?'정상 수집':'최근 600회 미만 (데이터 보강 필요)');
    const card1=document.createElement('div'); card1.className='card'; card1.innerHTML=`<h3>수집 범위</h3><div class="small">${minNo}회차 ~ ${maxNo}회차 (총 ${Data.draws.length}개)</div>`;
    const card2=document.createElement('div'); card2.className='card'; card2.innerHTML=`<h3>상태</h3><div class="small">${statusText}</div>`;
    const btn=document.createElement('button'); btn.className='btn'; btn.textContent='프롬프트'; btn.onclick=()=>{
      const logs=store.get(LS.PATCHLOG,[]);
      const html = `<div class="small">${(new Date()).toLocaleString()}</div><ul>${logs.map(x=>`<li>${x}</li>`).join('')}</ul>`;
      showModal('패치 프롬프트 로그', html || '기록 없음');
    };
    c.appendChild(card1); c.appendChild(card2); c.appendChild(btn);
    root.appendChild(c);

    const fab=document.createElement('button'); fab.className='fab'; fab.textContent='↑';
    fab.onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
    const show=()=>{ if(window.scrollY>200) fab.classList.add('show'); else fab.classList.remove('show'); };
    window.addEventListener('scroll', show, {passive:true}); show();
    document.body.appendChild(fab);
    document.body.classList.remove('no-scroll');
    return root;
  }

  function mount(){
    const app=document.querySelector('#app'); app.innerHTML='';
    const hash=location.hash||'#home';
    let el=null;
    if(hash==='#home'){ el=pageHome(); }
    else if(hash==='#draws'){ el=pageDraws(); }
    else if(hash==='#saved'){ el=pageSaved(); }
    else if(hash==='#recommend'){ el=pageRecommend(); }
    else if(hash==='#analytics'){ el=pageAnalytics(); }
    else { el=pageHome(); }
    el.classList.add('active'); // 0.019 핫픽스 포함
    app.appendChild(el);
  }

  async function loadData(){
    async function fetchJSON(p){ try{ const r=await fetch(p+'?v='+(window.APP_BUILD||VERSION)+'_'+Date.now(), {cache:'no-cache'}); if(!r.ok) throw 0; return await r.json(); }catch(e){ return []; } }
    Data.draws = await fetchJSON('data/draws.json');
    Data.draws50 = await fetchJSON('data/draws50.json');
  }

  // 패치 로그 기록
  (function logPatch(){
    const logs=store.get(LS.PATCHLOG,[]);
    const entry=`${VERSION} — UI full(1:1) + active hotfix + beige palette`;
    if(!logs.includes(entry)){ logs.unshift(entry); store.set(LS.PATCHLOG, logs.slice(0,20)); }
  })();

  window.addEventListener('hashchange', mount);
  (async function(){ await loadData(); mount(); })();
})();