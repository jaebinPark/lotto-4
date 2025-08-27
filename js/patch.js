
// === PATCH 0.002 RUNTIME ===
(function(){
  const $ = (sel,root=document)=>root.querySelector(sel);
  const h = (tag, cls, text)=>{ const el=document.createElement(tag); if(cls) el.className=cls; if(text!=null) el.textContent=text; return el; };
  const KRW = n => (n==null ? '-' : Number(n).toLocaleString('ko-KR')+'원');
  const NUM = n => (n==null ? '-' : Number(n).toLocaleString('ko-KR')+'명');
  const ok600 = ()=> Array.isArray(window.Data?.draws) && window.Data.draws.length >= 600;

  // Chip helpers
  function chipGroup(n){ n=Number(n); if(n<=10) return 'g1'; if(n<=20) return 'g2'; if(n<=30) return 'g3'; if(n<=40) return 'g4'; return 'g5'; }
  function makeChip(n){ const el=h('div','chip '+chipGroup(n), String(n)); el.setAttribute('aria-label',`번호 ${n}`); return el; }
  function makeBonusChip(n){ const el=h('div','chip bonus', String(n)); el.setAttribute('aria-label',`보너스 번호 ${n}`); return el; }
  function makeSavedChip(n, extra='saved-chip'){ const el=h('div', extra, String(n)); return el; }

  // Win card (shared)
  window.Render = window.Render || {};
  window.Render.winCard = function(draw){
    if(!draw) return h('div');
    const card=h('div','win-card');
    const round=h('div','win-round'); round.textContent = `제 ${draw.no}회 (${draw.date})`;
    const chips=h('div','win-chips');
    (draw.nums||[]).forEach(n=> chips.appendChild(makeChip(n)));
    chips.appendChild(makeBonusChip(draw.bnus));
    const tiers=h('div','win-tiers');
    tiers.innerHTML = `
      <div class="win-tier-line"><span class="win-tier-label">1등</span><span class="win-tier-value">${KRW(draw.first?.amount)} / ${NUM(draw.first?.winners)}</span></div>
      <div class="win-tier-line"><span class="win-tier-label">2등</span><span class="win-tier-value">${KRW(draw.second?.amount)} / ${NUM(draw.second?.winners)}</span></div>
      <div class="win-tier-line"><span class="win-tier-label">3등</span><span class="win-tier-value">${KRW(draw.third?.amount)} / ${NUM(draw.third?.winners)}</span></div>
    `;
    card.append(round, chips, tiers);
    return card;
  };

  // FAB Top
  function initFabTop(root){
    let fab = root.querySelector('#fabTop');
    if(!fab){
      fab = h('button','fab-top hide','▲'); fab.id='fabTop'; fab.setAttribute('aria-label','맨 위로');
      root.appendChild(fab);
    }
    const onScroll = ()=>{ if(window.scrollY>200) fab.classList.remove('hide'); else fab.classList.add('hide'); };
    window.addEventListener('scroll', onScroll);
    fab.onclick = ()=> window.scrollTo({top:0, behavior:'smooth'});
    onScroll();
  }

  // Data helpers
  window.Data = window.Data || {};
  window.Data.isDrawPublished = function(round){
    const list = (this.draws || this.draws50 || []);
    return !!list.find(d=> Number(d.no) === Number(round));
  };
  window.Data.latest = window.Data.latest || function(){
    const list = (this.draws && this.draws.length ? this.draws : this.draws50)||[];
    return list[list.length-1];
  };
  window.Data.nextRoundNo = window.Data.nextRoundNo || function(){
    const last = this.latest(); return last ? Number(last.no) + 1 : null;
  };

  // Store guards (persist)
  (function ensureStore(){
    try {
      if(localStorage.getItem('savedSets')==null) localStorage.setItem('savedSets','[]');
      if(localStorage.getItem('excludeSet')==null) localStorage.setItem('excludeSet','[]');
    } catch(e){}
  })();

  // Save 30 games per block
  window.savePortfolioForRound = function(round, sets30){
    const blockId = Date.now().toString();
    const all = JSON.parse(localStorage.getItem('savedSets')||'[]');
    const pack = sets30.map(nums => ({ nums, round, blockId, createdAt: Date.now() }));
    localStorage.setItem('savedSets', JSON.stringify(all.concat(pack)));
  };

  // HOME: no scroll + patch tag
  function initHome(root){
    root.classList.add('home-root');
    // patch tag
    let tag = root.querySelector('.patch-tag');
    if(!tag){
      tag = h('div','patch-tag','patch_0.002');
      tag.style.cssText = 'text-align:center;margin-top:10px;opacity:.6;font-size:12px;';
      root.appendChild(tag);
    } else { tag.textContent = 'patch_0.002'; }
  }

  // RECO page
  function initRecoPage(root){
    // remove top replicate of excludes
    const topRep = root.querySelector('.exclude-top'); if(topRep) topRep.remove();

    // actions
    let actions = root.querySelector('.reco-actions');
    if(!actions){
      actions = h('div','reco-actions');
      const reset = h('button','btn-secondary','리셋'); reset.id='btn-exclude-reset';
      const gen   = h('button','btn-primary','추천(30세트)'); gen.id='btn-reco';
      actions.append(reset, gen); root.appendChild(actions);
    }
    let list = root.querySelector('#recoList'); if(!list){ list = h('div','reco-list'); list.id='recoList'; root.appendChild(list); }

    // persist exclude selections
    const eKey='excludeSet'; const excl = new Set(JSON.parse(localStorage.getItem(eKey) || '[]'));
    root.addEventListener('click', ev=>{
      const t = ev.target;
      if(t && t.matches && t.matches('.exclude-grid .num')){
        const n = Number(t.dataset.num);
        if(excl.has(n)) excl.delete(n); else excl.add(n);
        localStorage.setItem(eKey, JSON.stringify([...excl]));
        t.classList.toggle('active');
      }
    });

    $('#btn-exclude-reset', root).onclick = ()=>{ excl.clear(); localStorage.setItem(eKey, JSON.stringify([]));
      root.querySelectorAll('.exclude-grid .num.active').forEach(el=>el.classList.remove('active'));
    };
    $('#btn-reco', root).onclick = ()=>{
      const listEl = $('#recoList', root); listEl.innerHTML='';
      listEl.classList.add('reco-blocks');
      const engine = window.Reco && window.Reco.generate ? window.Reco.generate : (opts)=>{
        const ex = new Set(opts?.exclude || []);
        function genOne(){
          const arr=[]; while(arr.length<6){ const n = 1+Math.floor(Math.random()*45);
            if(ex.has(n)||arr.includes(n)) continue; arr.push(n); }
          return arr.sort((a,b)=>a-b);
        }
        return Array.from({length:30}, _=>genOne());
      };
      const sets30 = engine({ exclude:[...excl] });

      const round = window.Data.nextRoundNo();
      if(round) window.savePortfolioForRound(round, sets30);

      const ok = ok600();
      // chunk into 6 blocks of 5 rows
      const blocks = []; for(let i=0;i<sets30.length;i+=5){ blocks.push(sets30.slice(i,i+5)); }
      blocks.forEach(group=>{
        const blk = h('section','reco-block');
        group.forEach(nums=>{
          const row = h('div','reco-row');
          row.appendChild(h('div','warn-chip '+(ok?'blue':'red'), ok?'OK':'WARN'));
          nums.forEach(n=> row.appendChild(h('div','reco-chip', String(n))));
          const p = Math.max(1, Math.min(100, Math.round(100*Math.random())));
          row.appendChild(h('div','reco-prob', p+'%'));
          blk.appendChild(row);
        });
        listEl.appendChild(blk);
      });
    };

    initFabTop(root);
  }

  // SAVED page
  function initSavedPage(root){
    const container = root.querySelector('.saved-root') || root;
    const all = JSON.parse(localStorage.getItem('savedSets')||'[]');
    const byRound = {};
    all.forEach(g=>{
      if(!byRound[g.round]) byRound[g.round]={round:g.round, items:[], blockIds:new Set()};
      byRound[g.round].items.push(g);
      byRound[g.round].blockIds.add(g.blockId);
    });
    const rounds = Object.keys(byRound).map(Number).sort((a,b)=>b-a).slice(0,3);
    container.innerHTML='';
    rounds.forEach(r=>{
      const sec = h('section','saved-block'); sec.dataset.round=String(r); sec.dataset.blockId=[...byRound[r].blockIds][0]||'';
      sec.appendChild(h('div','saved-title', `제 ${r}회 예상번호`));
      const ok = ok600();
      byRound[r].items.forEach(item=>{
        const row = h('div','saved-row');
        row.appendChild(h('div','warn-chip '+(ok?'blue':'red'), ok?'OK':'WARN'));
        (item.nums||[]).forEach(n=> row.appendChild(h('div','saved-chip', String(n))));
        const status = h('div','saved-status');
        if(!window.Data.isDrawPublished(r)) status.textContent='미추첨';
        else status.textContent = item.rank ? `${item.rank}등 당첨` : '낙첨';
        row.appendChild(status);
        sec.appendChild(row);
      });
      if(!window.Data.isDrawPublished(r)){
        const btn = h('button','saved-reset','이 30게임 삭제');
        btn.onclick = function(e){
          e.preventDefault();
          const round = r; const blockId = sec.dataset.blockId;
          if(!confirm(`제 ${round}회차의 이 30게임을 삭제할까요?`)) return;
          const next = JSON.parse(localStorage.getItem('savedSets')||'[]')
            .filter(it=> !(Number(it.round)===Number(round) && String(it.blockId)===String(blockId)));
          localStorage.setItem('savedSets', JSON.stringify(next));
          sec.remove();
        };
        sec.appendChild(btn);
      }
      container.appendChild(sec);
    });
    initFabTop(root);
  }

  // WINS page
  function initWinsPage(root){
    const latest = window.Data.latest && window.Data.latest();
    const top = root.querySelector('.wins-top') || root;
    if(latest){
      const card = window.Render.winCard(latest);
      const target = top.querySelector('.wins-top-card') || top;
      if(target) target.innerHTML='', target.appendChild(card);
    }
    const list = (window.Data.draws && window.Data.draws.length ? window.Data.draws : window.Data.draws50)||[];
    const last50 = list.slice(-50).reverse();
    const listBox = root.querySelector('.wins-list') || root;
    last50.forEach(d=> listBox.appendChild(window.Render.winCard(d)));
    initFabTop(root);
  }

  // ANALYTICS page
  async function initAnalytics(root){
    const list = (window.Data.draws && window.Data.draws.length ? window.Data.draws : window.Data.draws50)||[];
    const first = list[0], last = list[list.length-1];
    const rangeCard = h('div','analytics-card');
    rangeCard.innerHTML = `
      <div class="analytics-title">수집 범위</div>
      <div class="analytics-row"><span>회차</span><span>제 ${first?.no||'-'}회 ~ 제 ${last?.no||'-'}회</span></div>
      <div class="analytics-row"><span>총 건수</span><span>${list.length.toLocaleString('ko-KR')}건</span></div>
      <div class="analytics-row"><span>최종 업데이트</span><span>${new Date(document.lastModified).toLocaleString('ko-KR')}</span></div>
    `;
    root.appendChild(rangeCard);

    const card = h('div','analytics-card state-card');
    card.innerHTML = `
      <div class="analytics-title">수집 상태</div>
      <div class="analytics-row"><span>상태</span><span id="st-ok">-</span></div>
      <div class="analytics-row"><span>실패 회차</span><span id="st-failed">-</span></div>
      <div class="analytics-row small"><span>원인 추정</span><span id="st-reason">-</span></div>
      <div class="analytics-row small"><span>기준시각(UTC)</span><span id="st-ts">-</span></div>
    `;
    root.appendChild(card);
    try {
      const r = await fetch('./scripts/status.json',{cache:'no-store'});
      if(!r.ok) throw new Error('no status.json');
      const s = await r.json();
      const ok = s.ok === true;
      card.classList.add(ok?'state-ok':'state-bad');
      $('#st-ok',card).textContent = ok ? '정상' : '오류';
      $('#st-failed',card).textContent = (s.failed_count>0 ? s.failed_draws.join(', ') : '없음');
      $('#st-ts',card).textContent = s.timestamp || '-';
      let reason='정상';
      if(!ok){
        if (s.failed_count>0 && (s.fetched||0)===0) reason='네트워크/접근 차단(타임아웃·차단 등)';
        else if (s.failed_count>0) reason='일부 회차 응답 지연/변동';
        else reason='스크립트 오류 또는 형식 변경';
      }
      $('#st-reason',card).textContent = reason;
    } catch(e){
      card.classList.add('state-bad');
      $('#st-ok',card).textContent='상태 미확인';
      $('#st-failed',card).textContent='-';
      $('#st-ts',card).textContent='-';
      $('#st-reason',card).textContent='status.json 없음 (최초 실행 전/Actions 미동작)';
    }
  }

  // Router hook
  if(window.Router && Router.reg){
    const orig = Router.reg.bind(Router);
    Router.reg = function(name, fn){
      if(name.includes('홈')){
        return orig(name, function(root){ fn && fn(root); try{ initHome(root);}catch(e){} });
      } else if(name.includes('추천')){
        return orig(name, function(root){ fn && fn(root); try{ initRecoPage(root);}catch(e){} });
      } else if(name.includes('저장')){
        return orig(name, function(root){ fn && fn(root); try{ initSavedPage(root);}catch(e){} });
      } else if(name.includes('당첨번호')){
        return orig(name, function(root){ fn && fn(root); try{ initWinsPage(root);}catch(e){} });
      } else if(name.includes('분석')){
        return orig(name, function(root){ fn && fn(root); try{ initAnalytics(root);}catch(e){} });
      }
      return orig(name, fn);
    };
  }
})();  

// === PATCH 0.003: QR scan overlay UX ===
(function(){
  const $ = (sel,root=document)=>root.querySelector(sel);
  const h = (t,c,txt)=>{ const el=document.createElement(t); if(c) el.className=c; if(txt!=null) el.textContent=txt; return el; };

  function showOverlay(url, root){
    // root: camera container if available
    const host = (root && root.appendChild) ? root : document.body;
    // optional: add blur to known camera root
    if(root) root.classList.add('qr-camera','blurred');

    // overlay
    const ov = h('div','qr-overlay');
    // button with URL text
    const btn = h('button','qr-go', '확인하러가기');
    btn.setAttribute('aria-label','확인하러가기');
    btn.onclick = (e)=>{ e.stopPropagation(); try{ window.location.href = url; }catch(_){} };
    // center
    ov.appendChild(btn);
    // click outside => cancel
    ov.addEventListener('click', ()=>{
      if(root) root.classList.remove('blurred');
      ov.remove();
    });
    host.appendChild(ov);
  }

  // Public API so 기존 스캐너 성공 콜백에서 호출 가능
  window.QRUX = window.QRUX || {};
  window.QRUX.show = showOverlay;

  // 이벤트 훅: window.dispatchEvent(new CustomEvent('qr:scanned',{detail:{url, root}}))
  window.addEventListener('qr:scanned', (e)=>{
    const d = e.detail||{};
    if(d.url) showOverlay(d.url, d.root);
  });

  // 흔히 쓰는 라이브러리(onDecode/onScanSuccess)를 보조 래핑(가능할 때만)
  // 1) html5-qrcode 스타일 훅
  if(!window.__qr_html5_wrapped && window.Html5QrcodeScanner){
    try{
      const C = window.Html5QrcodeScanner;
      const orig = C.prototype.render;
      C.prototype.render = function(onScanSuccess, onScanFailure){
        const self=this;
        return orig.call(this, function(decodedText, decodedResult){
          try{
            // root element
            const root = document.getElementById(self.elementId) || document.body;
            window.QRUX.show(decodedText, root);
          }catch(_){}
          if(onScanSuccess) onScanSuccess(decodedText, decodedResult);
        }, onScanFailure);
      };
      window.__qr_html5_wrapped = true;
    }catch(_){}
  }
  // 2) jsQR/qr-scanner 사용자 정의 글로벌 콜백 래핑
  if(!window.onQrDecoded){
    window.onQrDecoded = function(url, root){ window.QRUX.show(url, root); };
  } else {
    // 이미 있다면 체이닝
    const orig = window.onQrDecoded;
    window.onQrDecoded = function(url, root){ try{ window.QRUX.show(url, root);}catch(_){ } try{ orig(url, root);}catch(_){ } };
  }
})(); 
