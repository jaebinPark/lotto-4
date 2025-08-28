(()=>{
  const VERSION='patch_0.028'; window.VERSION=VERSION;

  // ---------- utils
  const qs=(s,el=document)=>el.querySelector(s);
  const el=(tag,attrs={},children=[])=>{const e=document.createElement(tag);
    for(const[k,v]of Object.entries(attrs||{})){
      if(k==='class') e.className=v;
      else if(k==='html') e.innerHTML=v;
      else if(k.startsWith('on') && typeof v==='function') e.addEventListener(k.slice(2),v);
      else e.setAttribute(k,v);
    }
    (Array.isArray(children)?children:[children]).filter(Boolean).forEach(c=>e.append(c.nodeType?c:document.createTextNode(c)));
    return e;
  };
  const fmt=(n)=>n==null?'-':n.toLocaleString('ko-KR');

  // ---------- data (draws + persistence)
  const KEYS={
    saved:'lotto:savedSets',
    excluded:'lotto:excludeNumbers',
    recommended:'lotto:recommendedSets',
  };
  function loadLS(key, dflt){ try{ const v=localStorage.getItem(key); return v?JSON.parse(v):dflt; }catch{return dflt} }
  function saveLS(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch{} }

  const store={
    saved: loadLS(KEYS.saved, []),
    excluded: loadLS(KEYS.excluded, []),
    recommended: loadLS(KEYS.recommended, []),
    save(){ saveLS(KEYS.saved,this.saved); saveLS(KEYS.excluded,this.excluded); saveLS(KEYS.recommended,this.recommended); }
  };

  async function fetchJSON(url){
    try{
      const r=await fetch(url,{cache:'no-store'});
      if(!r.ok) throw new Error('HTTP '+r.status);
      return await r.json();
    }catch(e){ return null; }
  }

  async function loadDraws(){
    // Try full draws first, fallback to draws50
    let full = await fetchJSON('./data/draws.json');
    if(!full){ full = await fetchJSON('./data/draws50.json'); }
    if(!full){ return { draws:[], latest:null }; }
    const arr = Array.isArray(full) ? full : (full.draws||[]);
    const sorted = arr.slice().sort((a,b)=>(b.round||b.drwNo||0)-(a.round||a.drwNo||0));
    const latest = sorted[0] || null;
    return { draws:sorted.slice(0,50), latest };
  }

  // ---------- render helpers
  function ball(num){
    const n=Number(num);
    const cls = n<=10?'g1':n<=20?'g2':n<=30?'g3':n<=40?'g4':'g5';
    return el('div',{class:'ball '+cls}, String(n).padStart(2,'0'));
  }
  function prizeLine(label, amount, count){
    return el('div',{class:'p'}, `${label} ${amount?fmt(amount)+'원':'-'} / ${count?fmt(count)+'명':'-'}`);
  }

  // ---------- views
  const Views={};

  Views.home=async(root)=>{
    const {draws, latest}=await loadDraws();
    root.append(el('div',{class:'top-gap'}));
    const card=el('div',{class:'card'});
    if(latest){
      const round=latest.round||latest.drwNo||'-';
      const date=latest.date||latest.drwNoDate||'';
      const nums = latest.numbers||latest.drwtNo||latest.nums||[latest.drwtNo1,latest.drwtNo2,latest.drwtNo3,latest.drwtNo4,latest.drwtNo5,latest.drwtNo6].filter(Boolean);
      const bonus = latest.bonus||latest.bnusNo;
      card.append(el('div',{class:'subtitle'}, `${round}회차 ${date||''}`));
      const row=el('div',{class:'chips'});
      (nums||[]).forEach(n=>row.append(ball(n)));
      if(bonus) row.append(ball(bonus));
      card.append(row);
      // prizes
      const pwrap=el('div',{class:'prizes'});
      // map prize fields (flexible)
      const p1a=latest.prize1_amount||latest.firstWinAmount||latest.first_amount;
      const p1c=latest.prize1_count||latest.firstWinCount||latest.first_count;
      const p2a=latest.prize2_amount||latest.secondWinAmount||latest.second_amount;
      const p2c=latest.prize2_count||latest.secondWinCount||latest.second_count;
      const p3a=latest.prize3_amount||latest.thirdWinAmount||latest.third_amount;
      const p3c=latest.prize3_count||latest.thirdWinCount||latest.third_count;
      pwrap.append(prizeLine('1등',p1a,p1c));
      pwrap.append(prizeLine('2등',p2a,p2c));
      pwrap.append(prizeLine('3등',p3a,p3c));
      card.append(pwrap);
    }else{
      card.append(el('div',{class:'subtitle'},'최근 회차 정보 없음'));
      card.append(el('div',{},'데이터 수집 전입니다.'));
    }
    root.append(card);

    // buttons
    root.append(el('button',{class:'btn',onclick:()=>route('prizes')},'당첨번호'));
    root.append(el('button',{class:'btn',onclick:()=>route('saved')},'저장번호'));
    root.append(el('button',{class:'btn',onclick:()=>route('recommend')},'추천'));
    root.append(el('button',{class:'btn',onclick:()=>route('analysis')},'분석'));
    root.append(el('div',{class:'note center'},`patch ${VERSION}`));
    root.append(el('div',{class:'bottom-gap'}));
  };

  Views.header=(title)=>{
    const h=el('div',{class:'header'});
    const homeBtn=el('button',{class:'h-btn',onclick:()=>route('home')},'🏠');
    const backBtn=el('button',{class:'h-btn',onclick:()=>history.length>1?history.back():route('home')},'←');
    h.append(homeBtn, el('div',{class:'h-title'},title), backBtn);
    return h;
  };

  Views.prizes=async(root)=>{
    root.append(Views.header('당첨번호'));
    const {draws}=await loadDraws();
    if(!draws.length){
      root.append(el('div',{class:'card'},[el('div',{class:'subtitle'},'데이터가 아직 없습니다.'), el('div',{},'토요일 20:35 이후 자동 수집됩니다.') ]));
      return;
    }
    draws.slice(0,50).forEach(d=>{
      const card=el('div',{class:'card'});
      const round=d.round||d.drwNo||'-';
      const date=d.date||d.drwNoDate||'';
      card.append(el('div',{class:'subtitle'},`${round}회차 ${date||''}`));
      const nums = d.numbers||d.drwtNo||d.nums||[d.drwtNo1,d.drwtNo2,d.drwtNo3,d.drwtNo4,d.drwtNo5,d.drwtNo6].filter(Boolean);
      const bonus = d.bonus||d.bnusNo;
      const row=el('div',{class:'chips'});
      (nums||[]).forEach(n=>row.append(ball(n)));
      if(bonus) row.append(ball(bonus));
      card.append(row);
      const pwrap=el('div',{class:'prizes'});
      const p1a=d.prize1_amount||d.firstWinAmount||d.first_amount;
      const p1c=d.prize1_count||d.firstWinCount||d.first_count;
      const p2a=d.prize2_amount||d.secondWinAmount||d.second_amount;
      const p2c=d.prize2_count||d.secondWinCount||d.second_count;
      const p3a=d.prize3_amount||d.thirdWinAmount||d.third_amount;
      const p3c=d.prize3_count||d.thirdWinCount||d.third_count;
      pwrap.append(prizeLine('1등',p1a,p1c));
      pwrap.append(prizeLine('2등',p2a,p2c));
      pwrap.append(prizeLine('3등',p3a,p3c));
      card.append(pwrap);
      root.append(card);
    });
  };

  Views.saved=(root)=>{
    root.append(Views.header('저장번호'));
    const card=el('div',{class:'card'});
    card.append(el('div',{class:'subtitle'},`저장된 세트 ${store.saved.length}개`));
    if(!store.saved.length) card.append(el('div',{},'저장번호가 없습니다. 추천에서 저장해 보세요.'));
    root.append(card);
  };

  Views.recommend=(root)=>{
    root.append(Views.header('추천'));
    const card=el('div',{class:'card'});
    card.append(el('div',{class:'subtitle'},'추천 준비됨'));
    const btn=el('button',{class:'btn',onclick:()=>{
      // dummy add one recommended set to prove persistence
      const r = Array.from({length:6},()=>Math.floor(Math.random()*45)+1).sort((a,b)=>a-b);
      store.recommended.push(r);
      store.save();
      card.append(el('div',{},'추천 1세트 저장됨: '+r.join(', ')));
    }},'추천 1세트 만들기');
    card.append(btn);
    const note=el('div',{class:'note'},`현재 추천 세트: ${store.recommended.length}개 (업데이트해도 유지)`);
    card.append(note);
    root.append(card);
  };

  Views.analysis=(root)=>{
    root.append(Views.header('분석'));
    const card=el('div',{class:'card'});
    card.append(el('div',{class:'subtitle'},'분석 화면'));
    card.append(el('div',{},'추가 지표는 다음 패치에서가 아니라, 요청 주시면 즉시 반영하여 새 ZIP으로 드립니다.'));
    root.append(card);
  };

  // ---------- router
  const routes={home:Views.home, prizes:Views.prizes, saved:Views.saved, recommend:Views.recommend, analysis:Views.analysis};
  async function route(name){
    const root = qs('#app'); root.innerHTML='';
    if(routes[name]) await routes[name](root); else await routes.home(root);
    history.replaceState({name},'',location.pathname+'#'+name);
  }
  window.addEventListener('popstate',()=>{
    const name=(location.hash||'#home').slice(1);
    route(name);
  });
  // boot
  route((location.hash||'#home').slice(1));
})();