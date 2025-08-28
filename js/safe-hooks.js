/* patch_0.041 - safe-hooks.js
 * Global safety helpers + event bus + route change hooks.
 * Namespace: window.$safe, window.$bus
 */
(function(){"use strict";
  const VER="patch_0.041";
  function log(...a){ try{ console.log(...a); }catch(_e){} }
  function warn(...a){ try{ console.warn(...a); }catch(_e){} }
  const handlers = { error: [] };
  const $safe = {
    ver: VER,
    try(label, fn){
      try{ return fn(); }
      catch(e){ handlers.error.forEach(h=>{try{h(e,label)}catch(_e){}}); warn("SAFE:",label,e); return null; }
    },
    onError(h){ handlers.error.push(h); },
    log, warn
  };
  window.$safe = window.$safe || $safe;

  // Tiny event bus
  class Bus {
    constructor(){ this.m = new Map(); }
    on(evt, fn){ const a=this.m.get(evt)||[]; a.push(fn); this.m.set(evt,a); return ()=>this.off(evt,fn); }
    off(evt, fn){ const a=this.m.get(evt)||[]; const i=a.indexOf(fn); if(i>=0) a.splice(i,1); this.m.set(evt,a); }
    emit(evt, data){ const a=this.m.get(evt)||[]; a.slice().forEach(f=>{ try{f(data)}catch(_e){} }); }
  }
  window.$bus = window.$bus || new Bus();

  // Route change hook (pushState/replaceState/popstate)
  (function routeHook(){
    const bus = window.$bus;
    function emit(){
      bus.emit('routechange', { href: location.href, ts: Date.now() });
    }
    ['pushState','replaceState'].forEach(m=>{
      const orig = history[m];
      history[m] = function(...args){ const r = orig.apply(history,args); emit(); return r; };
    });
    window.addEventListener('popstate', emit);
  })();
})();
