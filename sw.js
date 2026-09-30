/* Offline support + no surprise updates mid-round (FEEDBACK #18).
   The app shell is served from this version's cache (cache-first). A new version installs in the
   background and WAITS; the page activates it only when no round is open (applyUpdate in index.html).
   So a push to the site never swaps the app under a driver in the middle of a delivery day. */
const CACHE = 'gazgal-driver-v2.9';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './vendor/pdf.min.js', './vendor/pdf.worker.min.js', './vendor/html2canvas.min.js', './vendor/jspdf.umd.min.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))));
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== 'gazgal-share').map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  /* a WhatsApp message shared to the installed app (Android share sheet): keep the image and text for a moment, then open the app */
  if (e.request.method === 'POST' && new URL(e.request.url).pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      const f = await e.request.formData(), img = f.get('image'), text = [f.get('title'), f.get('text'), f.get('url')].filter(Boolean).join(' ');
      const c = await caches.open('gazgal-share');
      if (img && img.size) await c.put('shared-image', new Response(img, { headers: { 'content-type': img.type || 'image/jpeg' } }));
      await c.put('shared-text', new Response(text || ''));
      return Response.redirect(new URL('./?share=1', self.registration.scope).href, 303);
    })());
    return;
  }
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin === location.origin) {
    e.respondWith(caches.open(CACHE).then(async c => {
      /* every page load (including ?share=1) gets this version's index.html, never a newer one from the network */
      const hit = e.request.mode === 'navigate' ? await c.match('./index.html') : await c.match(e.request);
      if (hit) return hit;
      const r = await fetch(e.request);
      if (r.ok) c.put(e.request, r.clone());
      return r;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  if (u.host.endsWith('googleapis.com') || u.host.endsWith('gstatic.com')) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return res; })));
  }
});
