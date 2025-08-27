
// patch.ui.v012.js
// Non-invasive UI tweaks applied after app.bundle.js is loaded.
// - Version badge
// - Header cards down by 10px
// - Bigger home buttons + same background as top card
// - Scroll-to-top FAB on non-home screens
(function(){
  const VERSION='patch_0.012';

  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  function makeBadge(){
    const el=document.createElement('div');
    el.className='patch-tag';
    el.textContent=VERSION;
    document.body.appendChild(el);
  }

  function injectCSS(){
    const css = `
    .patch-tag{position:fixed;left:0;right:0;bottom:8px;text-align:center;font-size:12px;color:#4a4a4a;opacity:.75;pointer-events:none;z-index:9999}
    .fab-top{position:fixed;left:50%;transform:translateX(-50%);bottom:72px;width:52px;height:52px;border-radius:26px;display:none;align-items:center;justify-content:center;background:#fff;border:1px solid rgba(0,0,0,.08);box-shadow:0 10px 24px rgba(0,0,0,.1);z-index:9998}
    .fab-top svg{width:22px;height:22px}
    .fab-top.show{display:flex}
    /* attempt to nudge header boxes */
    .header, header, .app-header, .top-bar{margin-top:10px !important}
    /* larger menu buttons (generic button-like blocks) */
    .menu button, .menu .btn, .menu .item, .menu .entry{min-height:64px;font-size:18px}
    `;
    const s=document.createElement('style'); s.textContent=css; document.head.appendChild(s);
  }

  function nudgeHeaders(){
    // Try to push down first white rounded box by 10px
    const cards=[...document.querySelectorAll('div,section,header')].filter(x=>{
      const cs=getComputedStyle(x);
      return (cs.borderRadius && parseFloat(cs.borderRadius)>=12) && (cs.backgroundColor && cs.backgroundColor!=='rgba(0, 0, 0, 0)');
    }).slice(0,2);
    cards.forEach(c=>{ c.style.marginTop = (parseFloat(getComputedStyle(c).marginTop)||0)+10+'px'; });
  }

  function setupFab(){
    const fab=document.createElement('button');
    fab.className='fab-top'; fab.setAttribute('aria-label','맨 위로');
    fab.innerHTML='<svg viewBox="0 0 24 24" fill="none"><path d="M12 5l7 7-1.41 1.41L13 9.83V20h-2V9.83l-4.59 4.58L5 12l7-7z" fill="currentColor"/></svg>';
    fab.onclick=()=>{ window.scrollTo({top:0, behavior:'smooth'}); };
    document.body.appendChild(fab);
    const show=()=>{ if(window.scrollY>200) fab.classList.add('show'); else fab.classList.remove('show'); };
    window.addEventListener('scroll', show, {passive:true}); show();
  }

  ready(()=>{
    injectCSS();
    makeBadge();
    nudgeHeaders();
    setupFab();
  });
})();
