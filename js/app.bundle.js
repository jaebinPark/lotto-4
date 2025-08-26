// Integrated client app (full version)
const Store={get(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}},set(k,v){localStorage.setItem(k,JSON.stringify(v))}};

const COLORS={cls(n){if(n<=9)return'n1';if(n<=19)return'n2';if(n<=29)return'n3';if(n<=39)return'n4';return'n5';}};
const chip=(n,style='num')=>{const el=document.createElement('div'); el.className='chip'+(style==='num'?' num '+COLORS.cls(n):''); el.textContent=n; return el;};
const chipRow=(nums,style='num',cls='chips left')=>{const row=document.createElement('div'); row.className=cls; nums.forEach(n=>row.appendChild(chip(n,style))); return row;};

async function fetchJSON(paths){for(const u of paths){try{const r=await fetch(u,{cache:'no-store'}); if(r.ok)return r.json()}catch{}} return null}

const Data={
  async init(){
    this.draws=await fetchJSON(['./data/draws.json?v={{BUILD}}','./draws.json?v={{BUILD}}','data/draws.json','draws.json'])||[];
    this.draws50=await fetchJSON(['./data/draws50.json?v={{BUILD}}','./draws50.json?v={{BUILD}}','data/draws50.json','draws50.json'])||this.draws.slice(-50);
    return this;
  },
  latest(){ // {no, nums, bnus}
    const d=this.draws?.at(-1)||this.draws?.[0]; if(!d) return {no:0, nums:[], bnus:0};
    if(d.nums) return d; // {no,date,nums,bnus}
    if(Array.isArray(d)) return {no:0, nums:d.slice(0,6), bnus:0};
    const keys=Object.keys(d).filter(k=>k!=='round'&&k!=='bonus');
    return {no:d.no||0, nums:keys.map(k=>d[k]).filter(x=>typeof x==='number').slice(0,6).sort((a,b)=>a-b), bnus:d.bnus||0};
  }
};

const Router={el:null,routes:{},mount(el){this.el=el},reg(n,f){this.routes[n]=f},go(n){location.hash='#/'+n},async render(){const n=location.hash.replace(/^#\//,'')||'home'; this.el.innerHTML=''; await (this.routes[n]||this.routes.home)(this.el);}};
window.addEventListener('hashchange',()=>Router.render());

function header(title){
  const el=document.createElement('div'); el.className='bar'; el.innerHTML=`
    <div class="icon-btn" data-home>🏠</div>
    <div class="title">${title}</div>
    <div class="icon-btn" data-back>←</div>`;
  el.addEventListener('click',(e)=>{
    if(e.target.closest('[data-home]')) Router.go('home');
    if(e.target.closest('[data-back]')) history.length>1?history.back():Router.go('home');
  }); return el;
}

Router.reg('home', async root=>{
  root.appendChild(header('홈'));
  const latest=Data.latest();
  const top=document.createElement('div'); top.className='card'; top.innerHTML='<div class="section-title">최근 당첨번호</div>';
  if(latest.nums.length) top.appendChild(chipRow(latest.nums,'num'));
  root.appendChild(top);

  const nav=document.createElement('div'); nav.className='menu';
  [['당첨번호','draws'],['저장번호 / 당첨확인','saved'],['추천','reco'],['분석','analysis']].forEach(([t,route])=>{
    const a=document.createElement('a'); a.className='btn'; a.href='#/'+route; a.textContent=t; nav.appendChild(a);
  }); root.appendChild(nav);
});

Router.reg('draws', async root=>{
  const latest=Data.latest();
  root.appendChild(header('당첨번호'));
  const top=document.createElement('div'); top.className='card';
  top.innerHTML='<div class="section-title">최근 당첨번호 (회차 '+(latest.no||'?')+')</div>';
  if(latest.nums.length) top.appendChild(chipRow(latest.nums,'num'));
  root.appendChild(top);

  const qr=document.createElement('div'); qr.className='card'; qr.innerHTML=`
    <div class="row center">
      <button class="btn btn-strong" id="scan">QR로 당첨확인</button>
      <button class="btn" id="upload">QR 이미지 업로드</button>
    </div>
    <div id="qr-out" class="hint" style="margin-top:10px;text-align:center"></div>
    <div id="qr-cam" class="center" style="margin-top:10px;display:none">
      <video id="qr-video" playsinline style="max-width:100%;border-radius:12px"></video>
      <div><button class="btn" id="stop" style="margin-top:8px">스캔 중지</button></div>
    </div>`;
  root.appendChild(qr);

  const $=id=>qr.querySelector(id); let reader=null;
  $('#scan').onclick=async()=>{
    $('#qr-out').textContent='카메라 준비 중…'; $('#qr-cam').style.display='block';
    try{ const mod=await import('https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm');
      reader=new mod.BrowserMultiFormatReader(); const res=await reader.decodeOnceFromVideoDevice(undefined,$('#qr-video'));
      $('#qr-out').textContent='스캔 결과: '+res.getText();
    }catch(e){ $('#qr-out').textContent='스캔 실패: '+e.message }
  };
  $('#stop').onclick=()=>{ if(reader){try{reader.reset()}catch{}} $('#qr-cam').style.display='none' };
  $('#upload').onclick=()=>{
    const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*';
    inp.onchange=async()=>{ const f=inp.files?.[0]; if(!f) return; $('#qr-out').textContent='이미지 해석 중…';
      try{ const mod=await import('https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm');
        const r=await mod.BrowserQRCodeReader.decodeFromImageUrl(URL.createObjectURL(f)); $('#qr-out').textContent='스캔 결과: '+r.getText();
      }catch(e){ $('#qr-out').textContent='해석 실패: '+e.message }
    }; inp.click();
  };
});

Router.reg('saved', async root=>{
  const latest=Data.latest();
  root.appendChild(header('저장번호 / 당첨확인'));
  const wrap=document.createElement('div'); wrap.className='card';
  const saved=Store.get('savedSets', []); // [ [nums], ... ] or [ {nums, round}, ... ]
  wrap.innerHTML='<div class="row" style="justify-content:space-between"><div class="section-title">저장된 번호</div><div class="hint">'+saved.length+' 게임 · 기준 회차 '+(latest.no||'?')+'</div></div>';

  const perRow=5, perBlock=30;
  for(let i=0;i<saved.length;i+=perBlock){
    const block=document.createElement('div'); block.className='saved-block';
    const head=document.createElement('div'); head.className='row'; head.style.justifyContent='space-between';
    head.innerHTML='<div class="small">범위: '+(i+1)+' ~ '+Math.min(i+perBlock, saved.length)+' 게임</div>';
    block.appendChild(head);
    for(let r=0;r<perBlock/perRow;r++){
      const row=document.createElement('div'); row.className='saved-row';
      for(let g=0; g<perRow; g++){
        const idx=i+r*perRow+g; if(idx>=saved.length) break;
        const item=saved[idx];
        const nums=Array.isArray(item)?item.slice():item?.nums?.slice()||[];
        nums.sort((a,b)=>a-b);
        const setEl=document.createElement('div'); setEl.className='saved-set';
        // left label: 적중 개수
        const m=nums.filter(n=>latest.nums.includes(n)).length;
        const label=document.createElement('div'); label.className='small';
        const needBadge = (!Array.isArray(Data.draws50) || Data.draws50.length < 600) && (item && !Array.isArray(item));
        if (needBadge) {
          const badge=document.createElement('div');
          badge.style.cssText='align-self:stretch;width:4px;background:#e53935;border-radius:2px';
          setEl.appendChild(badge);
        }
         label.textContent='적중 '+m;
        const line=document.createElement('div'); line.className='chips left';
        nums.forEach(n=>line.appendChild(chip(n, latest.nums.includes(n)?'num':'plain')));
        setEl.appendChild(label); setEl.appendChild(line);
        setEl.onclick=()=>setEl.classList.toggle('on');
        row.appendChild(setEl);
      } block.appendChild(row);
    }
    const act=document.createElement('div'); act.className='block-actions row center';
    const btn=document.createElement('button'); btn.className='btn'; btn.style.width='100%'; btn.textContent='이 30게임 삭제(리셋)';
    btn.onclick=()=>{ const arr=Store.get('savedSets',[]); arr.splice(i, Math.min(perBlock, saved.length-i)); Store.set('savedSets',arr); Router.render(); };
    act.appendChild(btn); block.appendChild(act); wrap.appendChild(block);
  }
  if(saved.length===0) wrap.innerHTML+='<div class="hint">아직 저장된 번호가 없습니다. 추천 화면에서 저장해보세요.</div>';
  root.appendChild(wrap);
});

Router.reg('reco', async root=>{
  root.appendChild(header('추천'));
  const latest=Data.latest();
  const excluded=new Set(Store.get('excludedNumbers', []));
  const card=document.createElement('div'); card.className='card'; card.innerHTML='<div class="section-title">제외수 (선택 상태 저장됨)</div>';

  // excluded preview (7열 그리드, 왼쪽 정렬 느낌)
  const preview=document.createElement('div'); preview.className='chips grid-7';
  card.appendChild(preview);

  const box=document.createElement('div'); box.className='chips left';
  for(let i=1;i<=45;i++){
    const el=chip(i, excluded.has(i)?'num':'plain');
    el.onclick=()=>{
      if(excluded.has(i)) excluded.delete(i); else excluded.add(i);
      Store.set('excludedNumbers',[...excluded]);
      el.className='chip '+(excluded.has(i)?('num '+(COLORS.cls(i))):'');
      renderPreview();
    };
    box.appendChild(el);
  }
  function renderPreview(){
    preview.innerHTML='';
    [...excluded].sort((a,b)=>a-b).forEach(n=>preview.appendChild(chip(n,'num')));
  }
  renderPreview();
  card.appendChild(box);

  const ctrl=document.createElement('div'); ctrl.className='row center'; ctrl.style.marginTop='12px';
  const btn=document.createElement('button'); btn.className='btn'; btn.textContent='추천(30세트)'; ctrl.appendChild(btn); card.appendChild(ctrl);

  const out=document.createElement('div'); out.className='card'; out.innerHTML='<div class="section-title">추천 결과 · '+(latest.no||'?')+'회차 기준</div>'; const list=document.createElement('div'); out.appendChild(list);

  function generate(){
    const last50=Data.draws50||[]; const freq=Array(46).fill(1); const push=a=>a.slice(0,6).forEach(n=>freq[n]++);
    for(const r of last50){ if(Array.isArray(r)) push(r); else if(r?.nums) push(r.nums); else { const ks=Object.keys(r||{}).filter(k=>k!=='round'&&k!=='bonus'); push(ks.map(k=>r[k])); } }
    const pop=[]; for(let n=1;n<=45;n++){ if(excluded.has(n)) continue; for(let k=0;k<freq[n];k++) pop.push(n); }
    function draw(){ const s=new Set(); while(s.size<6 && pop.length) s.add(pop[Math.floor(Math.random()*pop.length)]); return [...s].sort((a,b)=>a-b); }
    return Array.from({length:30}, draw);
  }
  function renderSets(sets){
    list.innerHTML='';
    for(let row=0; row<sets.length; row+=5){
      const line=document.createElement('div'); line.className='saved-row';
      for(let g=row; g<Math.min(row+5, sets.length); g++){
        const wrap=document.createElement('div'); wrap.className='saved-set';
        const chips=document.createElement('div'); chips.className='chips left';
        sets[g].forEach(n=>chips.appendChild(chip(n,'num')));
        const save=document.createElement('button'); save.className='btn small'; save.textContent='저장';
        save.onclick=()=>{ const all=Store.get('savedSets',[]);
          // 저장 시 현재 회차 태깅
          all.push({nums:sets[g], round: latest.no||0}); Store.set('savedSets',all); save.textContent='저장됨'; };
        wrap.appendChild(chips); wrap.appendChild(save); line.appendChild(wrap);
      } list.appendChild(line);
    }
  }
  const last=Store.get('lastReco', null); if(last) renderSets(last);
  btn.onclick=()=>{
      if (!Array.isArray(Data.draws) || Data.draws.length < 600) {
        alert('최근 600회 당첨번호가 충분히 수집되지 않았습니다.\n추천 결과의 신뢰도가 낮을 수 있어요. 데이터 보강 후 다시 시도해 주세요.');
      }
     const sets=generate(); Store.set('lastReco', sets); renderSets(sets); };

  root.appendChild(card); root.appendChild(out);
});

Router.reg('analysis', async root=>{
  root.appendChild(header('분석'));
  const top=document.createElement('div'); top.className='card'; top.innerHTML='<div class="section-title">최근 50회 빈도 TOP10</div>';
  const low=document.createElement('div'); low.className='card'; low.innerHTML='<div class="section-title">최근 50회 저빈도 TOP10</div>';
  const freqTop=(bottom=false)=>{
    const cnt=new Map(); const push=a=>a.forEach(n=>cnt.set(n,(cnt.get(n)||0)+1));
    for(const r of (Data.draws50||[])){ if(Array.isArray(r)) push(r.slice(0,6)); else if(r?.nums) push(r.nums.slice(0,6));
      else{ const ks=Object.keys(r||{}).filter(k=>k!=='round'&&k!=='bonus'); push(ks.map(k=>r[k]).slice(0,6)); } }
    const all=Array.from({length:45},(_,i)=>i+1).map(n=>({n,c:cnt.get(n)||0}));
    all.sort((a,b)=> bottom?a.c-b.c : b.c-a.c); return all.slice(0,10).map(x=>x.n);
  };
  top.appendChild(chipRow(freqTop(false),'plain')); low.appendChild(chipRow(freqTop(true),'plain'));
  root.appendChild(top); root.appendChild(low);
});

(async function(){ await Data.init(); Router.mount(document.getElementById('app')); Router.render(); })();
