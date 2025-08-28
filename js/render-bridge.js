/* patch_0.041 - render-bridge.js
 * Provides safe mounting + ensures #app exists even if not rendered yet.
 * Keeps backward-compat with existing app.bundle.js by being passive.
 */
(function(){"use strict";
  const VER="patch_0.041";
  function ensureAppContainer(){
    let el = document.getElementById('app');
    if(!el){
      el = document.createElement('div');
      el.id='app';
      el.className='container';
      document.body.appendChild(el);
      try { console.log('render-bridge: created #app'); } catch(_e){}
    }
    return el;
  }
  function html(h){
    const el = document.createElement('div'); el.innerHTML = h; return el.firstElementChild || el;
  }
  const bridge = {
    ver: VER,
    mount(renderFn){
      const host = ensureAppContainer();
      // If renderFn provided, use it; otherwise no-op.
      if(typeof renderFn==='function'){
        let node = null;
        window.$safe.try('rb:mount', ()=>{ node = renderFn(); });
        if(node){
          host.innerHTML = '';
          if(typeof node === 'string') host.appendChild(html(node));
          else host.appendChild(node);
        }
      }
      return host;
    },
    host: ensureAppContainer
  };
  window.$render = window.$render || bridge;
})();
