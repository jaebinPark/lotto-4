
// patch 0.011: refactor - only hard-refresh on demand, no auto-run
(function(){
  const FLAG='APP_BUILD'; // kept for backward compatibility
  function clearCaches(){
    if(!('caches' in window)) return Promise.resolve();
    return caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))).catch(()=>{});
  }
  function unregisterSW(){
    if(!('serviceWorker' in navigator)) return Promise.resolve();
    return navigator.serviceWorker.getRegistrations()
      .then(regs=>Promise.all(regs.map(r=>r.unregister())))
      .catch(()=>{});
  }
  function hardReload(){
    setTimeout(function(){
      const base = location.href.split('#')[0].split('?')[0];
      location.replace(base + '?v=' + Date.now());
    }, 200);
  }
  function force(){
    unregisterSW().then(clearCaches).then(hardReload);
  }
  // Expose manual trigger
  window.__LOTTO_FORCE_REFRESH = force;
})();  
