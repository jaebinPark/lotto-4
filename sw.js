// sw.js (fail-safe)
const REV = '{{BUILD}}';
const CACHE = 'lotto-app-' + REV;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async ()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Network-first for navigations (HTML)
  if (req.mode === 'navigate') {
    event.respondWith((async ()=>{
      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, net.clone());
        return net;
      } catch {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);
        return cached || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // Stale-while-revalidate for others
  event.respondWith((async ()=>{
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const prom = fetch(req).then(res=>{ cache.put(req, res.clone()); return res; }).catch(()=>cached);
    return cached || prom;
  })());
});
