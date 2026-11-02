/* SAT Ustoz offline support.
   Network first for every page and file on this site, so students always get
   the newest version; the last copy is kept for when they are offline. The
   vocabulary trainer is saved ahead of time, so word review works on a phone
   with no connection. Change VERSION when you change the PRECACHE list. */
const VERSION = 'sh-offline-v2';
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
  // The sign-in page always does too: it must never come from the offline copy.
  if (req.method !== 'GET' || url.origin !== self.location.origin || /\/login\.html$/.test(url.pathname)) return;
  e.respondWith(fetch(req).then(res => {
    if (res.ok && res.type === 'basic') {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(req, copy));
    }
    return res;
  // Offline: the saved copy of this same page. Only the vocabulary trainer falls back to its
  // precached copy; any other page shows a short offline note instead of a different page.
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => {
    if (hit) return hit;
    if (req.mode !== 'navigate') return Response.error();
    if (/\/vocab\.html$/.test(url.pathname)) return caches.match('vocab.html');
    return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline | SAT Ustoz</title>' +
      '<body style="font-family:system-ui,sans-serif;max-width:32em;margin:15vh auto;padding:0 20px;color:#1D2A20"><h1>No connection</h1>' +
      '<p>This page could not load. Check your internet, then <a href="" style="color:#2D5038">try again</a>. The <a href="vocab.html" style="color:#2D5038">vocabulary trainer</a> works offline.</p></body>',
      { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } });
  })));
});
