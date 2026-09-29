/* Offline support: the app shell is cached; same-origin requests try the network first
   so updates arrive when there is signal, and fall back to the cache when there is none. */
const CACHE = 'gazgal-driver-v2.4';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './vendor/pdf.min.js', './vendor/pdf.worker.min.js', './vendor/html2canvas.min.js', './vendor/jspdf.umd.min.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
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
    e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
    return;
  }
  if (u.host.endsWith('googleapis.com') || u.host.endsWith('gstatic.com')) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return res; })));
  }
});
