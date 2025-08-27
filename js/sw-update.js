
// Force-refresh helper for PWA caches & service workers
(function(){
  const BUILD = '0.009';
  try{
    const prev = localStorage.getItem('APP_BUILD');
    if(prev !== BUILD){
      // Clear caches
      if('caches' in window){
        caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k))));
      }
      // Unregister SWs
      if('serviceWorker' in navigator){
        navigator.serviceWorker.getRegistrations().then(regs=>{
          regs.forEach(r=>r.unregister());
        });
      }
      localStorage.setItem('APP_BUILD', BUILD);
      // Give a short delay then reload once
      setTimeout(()=>location.reload(true), 300);
    }
  }catch(e){/* ignore */}
})();
