// Kill-switch service worker.
//
// An earlier build shipped a caching worker (cache "koach-v1") that kept
// serving stale bundles. This file stays at /sw.js so browsers that already
// have the old worker fetch this one, which removes itself and every cache.
// Nothing in the app registers a service worker any more.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      // Reload every open tab once so it drops the stale bundle. After
      // unregister() no worker controls the page, so this cannot loop.
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      await Promise.all(clients.map((client) => client.navigate(client.url).catch(() => {})));
    })()
  );
});
