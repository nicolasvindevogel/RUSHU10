const CACHE = 'u10-herseaux-v14-install-onboarding';
const ASSETS = ['./','./index.html','./styles.css','./app.js','./config.js','./manifest.webmanifest','./logo.png',
  './assets/logo.png','./assets/icons/icon-192.png','./assets/icons/icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
    const clone = resp.clone();
    if (new URL(e.request.url).origin === location.origin) caches.open(CACHE).then(c => c.put(e.request, clone));
    return resp;
  }).catch(() => caches.match('./index.html'))));
});


self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(list => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});
