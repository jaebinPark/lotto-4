(()=>{
  const VERSION='patch_0.026'; window.VERSION=VERSION;

  // ---------- helpers ----------
  const qs=(s,el=document)=>el.querySelector(s);
  const el=(tag,attrs={},children=[])=>{
    const e=document.createElement(tag);
    for(const[k,v]of Object.entries(attrs||{})){
      if(k==='class') e.className=v;
      else if(k==='text') e.textContent=v;
      else if(k.startsWith('on')&&typeof v==='function') e.addEventListener(k.slice(2),v);
      else e.setAttribute(k,v);
    }
    for(const c of (Array.isArray(children)?children:[children])){ if(c) e.appendChild(typeof c==='string'?document.createTextNode(c):c); }
    return e;
  };
  const nfmt=new Intl.NumberFormat('ko-KR');

  function ball(n){
    let g='g1'; if(n>=11&&n<=20) g='g2'; else if(n>=21&&n<=30) g='g3'; else if(n>=31&&n<=40) g='g4'; else if(n>=41) g='g5';
    return el('div',{class:'ball '+g}, n);
  }

  // ---------- data ----------
  async function loadDraws(){
    let data=null;
    try{ const a=await fetch('./data/draws.json',{cache:'no-store'}); if(a.ok) data=await a.json(); }catch{}
    if(!data){
      try{ const b=await fetch('./data/draws50.json',{cache:'no-store'}); if(b.ok) data=await b.json(); }catch{}
    }
    return data||{ draws:[] };
  }

  function latestInfo(ds){
    const arr=(ds.draws||[]).slice().sort((a,b)=>(b.turn||0)-(a.turn||0));
    const d=arr[0];
    if(!d) return null;
    const nums=d.numbers||d.main||[]; const bn= d.bonus??d.bonusNumber;
    const date=d.date || d.drawDate || '';
    const prize=d.prize || {};
    return {turn:d.turn||d.drwtNo1?d.turn: (d.round||null), date, nums, bonus:bn, prize};
  }

  // ---------- views ----------
  const Views={};

  Views.header=(title)=>el('div',{class:'header'},
    [ el('button',{class:'h-btn',onClick:()=>navigate('home')}, '🏠'),
      el('div',{class:'h-title',text:title}),
      el('button',{class:'h-btn',onClick:()=>history.back()}, '←')
    ]);

  Views.home=async (root)=>{
    root.innerHTML='';
    root.appendChild(el('div',{class:'top-gap'}));

    const draws=await loadDraws();
    const li=latestInfo(draws);
    const card=el('div',{class:'card'});
    if(li){
      const meta=el('div',{class:'meta'},[ el('div',{class:'subtitle',text:`${li.turn}회차`}), el('span',{text: li.date || ''}) ]);
      const balls=el('div',{class:'chips'});
      (li.nums||[]).forEach(n=>balls.appendChild(ball(n)));
      if(li.bonus!=null){
        const b=ball(li.bonus); b.style.opacity='.75'; balls.appendChild(b);
      }
      const p1=(li.prize?.first)||li.prize?.p1;
      const p2=(li.prize?.second)||li.prize?.p2;
      const p3=(li.prize?.third)||li.prize?.p3;

      const pWrap=el('div',{class:'prizes'});
      const fmt=(p,rank)=> p? ` ${rank}등 ${nfmt.format(p.amount||p.money||0)}원 / ${nfmt.format(p.winners||p.count||0)}명`: `${rank}등 - / -명`;
      pWrap.appendChild(el('div',{class:'p'}, fmt(p1,1)));
      pWrap.appendChild(el('div',{class:'p'}, fmt(p2,2)));
      pWrap.appendChild(el('div',{class:'p'}, fmt(p3,3)));

      card.appendChild(meta); card.appendChild(balls); card.appendChild(pWrap);
    }else{
      card.appendChild(el('div',{class:'subtitle',text:'최근 회차 정보 없음'}));
      card.appendChild(el('div',{text:'데이터 수집 전입니다.'}));
    }
    root.appendChild(card);

    // buttons
    root.appendChild(el('button',{class:'btn',onClick:()=>navigate('prizes'),text:'당첨번호'}));
    root.appendChild(el('button',{class:'btn',onClick:()=>navigate('saved'),text:'저장번호'}));
    root.appendChild(el('button',{class:'btn',onClick:()=>navigate('recommend'),text:'추천'}));
    root.appendChild(el('button',{class:'btn',onClick:()=>navigate('analysis'),text:'분석'}));

    root.appendChild(el('div',{class:'note'},`patch ${VERSION}`));
    root.appendChild(el('div',{class:'bottom-gap'}));
  };

  Views.prizes=async(root)=>{
    root.innerHTML='';
    root.appendChild(Views.header('당첨번호'));
    const draws=await loadDraws();
    const arr=(draws.draws||[]).slice().sort((a,b)=>(b.turn||0)-(a.turn||0)).slice(0,50);
    if(arr.length===0){
      root.appendChild(el('div',{class:'card'},[el('div',{text:'수집된 회차가 없습니다.'})]));
      return;
    }
    arr.forEach(d=>{
      const nums=d.numbers||d.main||[]; const bn=d.bonus??d.bonusNumber;
      const card=el('div',{class:'card'});
      card.appendChild(el('div',{class:'meta'},[el('div',{class:'subtitle',text:`${d.turn}회차`}), el('span',{text:d.date||''})]));
      const balls=el('div',{class:'chips'});
      nums.forEach(n=>balls.appendChild(ball(n)));
      if(bn!=null){ const b=ball(bn); b.style.opacity='.75'; balls.appendChild(b); }
      card.appendChild(balls);
      root.appendChild(card);
    });
  };

  Views.saved=(root)=>{
    root.innerHTML='';
    root.appendChild(Views.header('저장번호'));
    root.appendChild(el('div',{class:'card'},[ el('div',{text:'저장된 번호가 없습니다.'}) ]));
  };

  Views.recommend=(root)=>{
    root.innerHTML='';
    root.appendChild(Views.header('추천'));
    const card=el('div',{class:'card'},[ el('div',{text:'추천 엔진 준비됨. 제외수 선택 UI는 다음 패치에서 연결.'}) ]);
    root.appendChild(card);
  };

  Views.analysis=(root)=>{
    root.innerHTML='';
    root.appendChild(Views.header('분석'));
    root.appendChild(el('div',{class:'card'},[ el('div',{text:'수집/분석 리포트 영역.'}) ]));
  };

  // ---------- router ----------
  function navigate(path){
    location.hash='#/'+path;
    render();
  }
  async function render(){
    let path=location.hash.replace(/^#\//,'')||'home';
    let app=document.getElementById('app');
    if(!app){ app=document.createElement('div'); app.id='app'; document.body.appendChild(app); }
    if(Views[path]) await Views[path](app); else await Views.home(app);
  }

  window.addEventListener('hashchange',render);
  window.addEventListener('DOMContentLoaded',render);
  console.log('VERSION', VERSION);
})();