/* Work Town service worker. Everything the games need is precached on install,
   so after the first visit the app runs with no internet at all, computer
   players included: they live on the device, not on a server.
   VERSION is stamped by scripts/postbuild.mjs on every build. */
const VERSION = 'worktown-__BUILD__';
const SCOPE = self.registration.scope;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    const list = await (await fetch(SCOPE + 'precache.json', { cache: 'no-store' })).json();
    await cache.addAll(list.map(p => SCOPE + p));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data === 'skip-waiting') self.skipWaiting(); });

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(SCOPE)) return;
  const url = new URL(req.url);
  if (url.pathname.endsWith('/version.json')) return;            // always from the network
  if (url.pathname.includes('/downloads/')) return;              // print files need the internet
  if (req.mode === 'navigate') {                                  // any page: the app shell
    event.respondWith((async () => {
      try { return await fetch(req); }
      catch {
        // a cached REDIRECT cannot answer a navigation, so rebuild a clean response
        const hit = (await caches.match(SCOPE)) || (await caches.match(SCOPE + 'index.html'));
        if (!hit) return Response.error();
        return new Response(await hit.blob(), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') (await caches.open(VERSION)).put(req, res.clone());
      return res;
    } catch { return new Response('', { status: 504 }); }
  })());
});
