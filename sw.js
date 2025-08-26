// minimal SW: 네비게이션은 네트워크 우선
self.addEventListener('install', e=>self.skipWaiting());
self.addEventListener('activate', e=>self.clients.claim());
self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET') return;
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
  }else{
    e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
  }
});
