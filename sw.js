// v5 - network only, no caching to prevent lag
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
// Always fetch from network, never cache
self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request));
});
