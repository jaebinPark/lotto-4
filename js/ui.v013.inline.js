
/* === UI/UX PATCH v0.013 (append to app.bundle.js) === */
(function(){
  const VERSION = 'patch_0.013';
  // Helpers
  const $ = (sel, root=document)=>root.querySelector(sel);
  const $$ = (sel, root=document)=>Array.from(root.querySelectorAll(sel));
  const onReady = (fn)=>{
    if(document.readyState!=='loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  };
  function style(css){ const s=document.createElement('style'); s.textContent=css; document.head.appendChild(s); return s; }
  function makeBadge(){
    if ($('.patch-tag')) return;
    const b=document.createElement('div');
    b.className='patch-tag';
    b.textContent=VERSION;
    document.body.appendChild(b);
  }
  function scrollTopFab(){
    if ($('.fab-top')) return;
    const fab=document.createElement('button');
    fab.className='fab-top'; fab.setAttribute('aria-label','맨 위로');
    fab.innerHTML='<svg viewBox="0 0 24 24" fill="none"><path d="M12 5l7 7-1.41 1.41L13 9.83V20h-2V9.83l-4.59 4.58L5 12l7-7z" fill="currentColor"/></svg>';
    fab.onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
    document.body.appendChild(fab);
    const tick=()=>{ if(window.scrollY>200) fab.classList.add('show'); else fab.classList.remove('show'); };
    window.addEventListener('scroll', tick, {passive:true}); tick();
  }
  // Global styles
  onReady(()=>{
    style(`
      .patch-tag{position:fixed;left:0;right:0;bottom:8px;text-align:center;font-size:12px;color:#4a4a4a;opacity:.78;pointer-events:none;z-index:9999}
      .fab-top{position:fixed;left:50%;transform:translateX(-50%);bottom:72px;width:52px;height:52px;border-radius:26px;display:none;align-items:center;justify-content:center;background:#fff;border:1px solid rgba(0,0,0,.08);box-shadow:0 10px 24px rgba(0,0,0,.1);z-index:9998}
      .fab-top svg{width:22px;height:22px}
      .fab-top.show{display:flex}
      /* Header down 10px */
      header, .header, .top-bar, .app-header{margin-top:10px !important}
      /* Number chip sizing (mobile friendly) */
      .chip, .ball, .num-chip{width:42px;height:42px;min-width:42px;min-height:42px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:18px}
      /* Bonus chip smaller shade */
      .chip.bonus, .ball.bonus, .num-chip.bonus{opacity:.95;filter:saturate(.9)}
      /* Menu buttons: same bg as cards, bigger tap area */
      .menu .btn, .menu .item, .menu button{min-height:64px;font-size:18px}
      /* Exclusion grid 10 columns */
      .exclude-grid{display:grid;grid-template-columns:repeat(10, 1fr);gap:10px}
      .exclude-grid .chip{width:40px;height:40px;font-size:17px}
      /* One-line row: warn-card + chips + status/prob */
      .row-inline{display:flex;align-items:center;gap:10px;flex-wrap:nowrap;overflow:hidden}
      .row-inline .warn{width:8px;height:28px;border-radius:4px}
      .row-inline .warn.red{background:#ef4444}
      .row-inline .warn.blue{background:#3b82f6}
      .row-inline .chips{display:flex;gap:8px;flex:1;min-width:0}
      .row-inline .status{white-space:nowrap;font-weight:700;font-size:14px;margin-left:6px}
      /* Scroll lock for home */
      .home-scroll-lock{overflow:hidden;height:100vh}
    `);
    makeBadge();
    scrollTopFab();
  });

  // Screen-aware adjustments using MutationObserver
  function isScreen(title){
    const h = document.title || ($('header h1') && $('header h1').textContent) || '';
    return h.includes(title);
  }

  function applyHome(){
    try{
      document.body.classList.add('home-scroll-lock');
      // Change "저장번호 / 당첨확인" -> "저장번호"
      $$('.menu .item, .menu button, .menu .btn').forEach(el=>{
        if(/저장번호/.test(el.textContent)) el.textContent='저장번호';
      });
    }catch(e){}
  }

  function ensureBonusInBox(box){
    // Try to find 7th chip; if only 6, try append bonus from dataset if available
    const chips = $$('.chip, .ball, .num-chip', box);
    if (chips.length===6){
      const bonus = box.querySelector('[data-bonus], .bonus');
      if (bonus && !bonus.classList.contains('chip') && !bonus.classList.contains('ball')){
        const b=document.createElement('div'); b.className='chip bonus'; b.textContent=bonus.textContent.replace(/\D/g,'')||'B';
        box.appendChild(b);
      }
    }
  }

  function applyDrawBox(box){
    try{
      ensureBonusInBox(box);
      // add 1~3등 info if provided via data attrs
      const meta = box.querySelector('.meta13'); if(meta) return;
      const p1 = box.getAttribute('data-p1'), w1=box.getAttribute('data-w1');
      const p2 = box.getAttribute('data-p2'), w2=box.getAttribute('data-w2');
      const p3 = box.getAttribute('data-p3'), w3=box.getAttribute('data-w3');
      if (p1||p2||p3){
        const info=document.createElement('div'); info.className='meta13';
        info.style.cssText='display:flex;gap:12px;margin-top:8px;font-size:12px;opacity:.85;flex-wrap:wrap';
        function cell(rank, prize, winners){
          const d=document.createElement('div'); d.textContent = `${rank}등 ${prize||'-'} / ${winners||'-'}명`; return d;
        }
        info.appendChild(cell(1,p1,w1)); info.appendChild(cell(2,p2,w2)); info.appendChild(cell(3,p3,w3));
        box.appendChild(info);
      }
    }catch(e){}
  }

  function applySavedRow(row, warnRed){
    try{
      if (row.classList.contains('row-inline')) return;
      row.classList.add('row-inline');
      const chipsWrap=document.createElement('div'); chipsWrap.className='chips';
      const warn=document.createElement('div'); warn.className='warn '+(warnRed?'red':'blue');
      const status=document.createElement('div'); status.className='status'; status.textContent=row.getAttribute('data-status')||'미추첨';
      const chips=$$('.chip, .ball, .num-chip', row);
      chips.forEach(c=>chipsWrap.appendChild(c));
      row.textContent='';
      row.appendChild(warn); row.appendChild(chipsWrap); row.appendChild(status);
    }catch(e){}
  }

  function applyRecommendRow(row, warnRed){
    try{
      if (row.classList.contains('row-inline')) return;
      row.classList.add('row-inline');
      const chipsWrap=document.createElement('div'); chipsWrap.className='chips';
      const warn=document.createElement('div'); warn.className='warn '+(warnRed?'red':'blue');
      const prob=document.createElement('div'); prob.className='status'; prob.textContent=(row.getAttribute('data-prob')||'--')+'%';
      const chips=$$('.chip, .ball, .num-chip', row);
      chips.forEach(c=>chipsWrap.appendChild(c));
      row.textContent='';
      row.appendChild(warn); row.appendChild(chipsWrap); row.appendChild(prob);
    }catch(e){}
  }

  // Mutation observer to patch dynamic content
  onReady(()=>{
    const mo = new MutationObserver(()=>{
      // Home
      if (isScreen('홈')) applyHome();
      // Draw boxes across pages
      $$('.draw-box, .win-box, .card.draw, .recent-draw').forEach(applyDrawBox);
      // Saved rows
      $$('.saved-row, .myset-row, .saved .row').forEach(el=>{
        const needRed = (el.getAttribute('data-collected')||'')==='lt600';
        applySavedRow(el, needRed);
      });
      // Recommend rows
      $$('.rec-row, .recommend .row').forEach(el=>{
        const needRed = (el.getAttribute('data-collected')||'')==='lt600';
        applyRecommendRow(el, needRed);
      });
      // Exclusion grid normalize to 10 columns
      const ex = $('.exclude-grid, #exclude-grid, .grid-exclude');
      if (ex) ex.classList.add('exclude-grid');
    });
    mo.observe(document.body, {childList:true, subtree:true});
  });
})();
/* === end UI/UX PATCH v0.013 === */
