/* The technician app works offline: its own small cache, under /tech/ only. Network first for the page (it is a
   prototype that changes often), the cache when there is no signal. */
const CACHE = 'gazgal-tech-v0.1';
const SHELL = ['./', './index.html', './manifest.webmanifest', '../icon-192.png', '../vendor/pdf.min.js', '../vendor/pdf.worker.min.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' }))))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('gazgal-tech-') && k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return r; })
    .catch(() => caches.match(e.request).then(h => h || (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined))));
});
