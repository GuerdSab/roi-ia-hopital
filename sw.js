// Service worker — ROI IA Hospitalière v8.0
const CACHE = 'roi-ia-v8-0';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icons/icon-32.png', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('benchmark.json')) { e.respondWith(fetch(e.request).catch(() => caches.match(e.request))); return; }
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then((cached) => {
    const net = fetch(e.request).then((res) => { if (res && res.status === 200) { const cl = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, cl)); } return res; }).catch(() => cached);
    return cached || net;
  }));
});
