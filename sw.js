// Increment this version number every time you deploy a new version
const CACHE='modstack-v4';
const FILES=['/','/app.html','/index.html','/manifest.json'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=>k!==CACHE).map(k=>{
        console.log('Deleting old cache:',k);
        return caches.delete(k);
      }))
    )
  );
  self.clients.claim();
});

// Network first — always try to get fresh version, fall back to cache
self.addEventListener('fetch',e=>{
  e.respondWith(
    fetch(e.request)
      .then(res=>{
        // Update cache with fresh version
        const clone=res.clone();
        caches.open(CACHE).then(c=>c.put(e.request,clone));
        return res;
      })
      .catch(()=>caches.match(e.request))
  );
});
