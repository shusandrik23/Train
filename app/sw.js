// Кэш для офлайн-работы. Меняйте VERSION при каждом обновлении файлов.
const VERSION = 'v6';
const FILES = ['./', 'index.html', 'styles.css', 'data.js', 'reflex.js', 'content.js', 'app.js', 'daily.js', 'tools.js', 'profile.js', 'main.js', 'icon.svg', 'manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => f + (f.endsWith('.js') || f.endsWith('.css') ? '?v=6' : '')))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Сначала сеть (чтобы обновления приходили сразу), при офлайне — кэш
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: false }).then(r => r || caches.match('index.html'))));
});
