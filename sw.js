/* SAT Ustoz offline support.
   Network first for every page and file on this site, so students always get
   the newest version; the last copy is kept for when they are offline. The
   vocabulary trainer is saved ahead of time, so word review works on a phone
   with no connection. Change VERSION when you change the PRECACHE list. */
const VERSION = 'sh-offline-v1';
const PRECACHE = [
  'vocab.html', 'data/vocab.json', 'assets/sh.css', 'assets/sh.js',
  'assets/brand/logo-horizontal.svg', 'assets/brand/mark.svg', 'favicon.ico', 'icon-192.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  // Only this site's own files. Firebase, PostHog, fonts and the Workers go straight to the network.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(fetch(req).then(res => {
    if (res.ok && res.type === 'basic') {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(req, copy));
    }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match('vocab.html') : Response.error()))));
});
