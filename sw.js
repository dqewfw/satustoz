/* SAT Ustoz offline support and fast start.
   - This site's own pages and files: network first, so students get the newest
     version. If the network hasn't answered in NET_WAIT ms and a saved copy
     exists, the saved copy is shown (the network answer still updates the cache
     for next time). This is what makes the home-screen app open fast on a slow
     mobile connection instead of waiting 10+ seconds.
   - Files from other sites whose address includes a version number (Firebase
     13.0.0, KaTeX 0.16.9, Google Fonts files) never change, so they come from the
     cache once saved. The Google Fonts stylesheet is shown from the cache and
     refreshed in the background.
   - The vocabulary trainer is saved ahead of time, so word review works offline.
   Change VERSION when you change the PRECACHE list. Change the version numbers in
   CDN_IMMUTABLE when you upgrade Firebase or KaTeX (sh.js FB_VERSION). */
const VERSION = 'sh-offline-v4';
const CDN_CACHE = 'sh-cdn-v1'; // kept across VERSION changes: its files never change
const NET_WAIT = 3500;
const PRECACHE = [
  'practice.html', 'test.html', 'vocab.html', 'data/vocab.json', 'data/catalog.json',
  'assets/sh.css', 'assets/sh.js',
  'assets/brand/logo-horizontal.svg', 'assets/brand/mark.svg',
  'assets/brand/logo-horizontal-dark.svg', 'assets/brand/mark-dark.svg', 'favicon.ico', 'icon-192.png'
];
const CDN_IMMUTABLE = [
  /^https:\/\/www\.gstatic\.com\/firebasejs\/\d+\.\d+\.\d+\//,
  /^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/[^/]+\/\d+[^/]*\//,
  /^https:\/\/fonts\.gstatic\.com\//
];
const CDN_REFRESH = [/^https:\/\/fonts\.googleapis\.com\/css2\?/];

self.addEventListener('install', e => {
  // One failed file must not stop the rest from being saved.
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(PRECACHE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== CDN_CACHE).map(k => caches.delete(k)))),
    self.registration.navigationPreload ? self.registration.navigationPreload.enable().catch(() => {}) : null
  ]).then(() => self.clients.claim()));
});

// Saved CDN files: ok responses, or opaque ones (a <script>/<link> without crossorigin).
const cacheable = res => res && (res.ok || res.type === 'opaque');

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;

  if (CDN_IMMUTABLE.some(r => r.test(url))) {
    e.respondWith(caches.open(CDN_CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (cacheable(res)) c.put(req, res.clone());
      return res;
    }))));
    return;
  }
  if (CDN_REFRESH.some(r => r.test(url))) {
    e.respondWith(caches.open(CDN_CACHE).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { if (cacheable(res)) c.put(req, res.clone()); return res; });
      if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
      return net;
    })));
    return;
  }

  const u = new URL(url);
  // Firebase, PostHog and the Workers go straight to the network.
  // The sign-in page always does too: it must never come from the offline copy.
  if (u.origin !== self.location.origin || /\/login\.html$/.test(u.pathname)) return;

  const isNav = req.mode === 'navigate';
  const network = (isNav && e.preloadResponse ? e.preloadResponse.then(p => p || fetch(req)) : fetch(req)).then(res => {
    if (res.ok && (res.type === 'basic' || res.type === 'default')) {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(req, copy));
    }
    return res;
  });
  e.waitUntil(network.catch(() => {}));
  const saved = () => caches.match(req, { ignoreSearch: isNav });

  e.respondWith(new Promise(resolve => {
    let done = false;
    const finish = r => { if (!done && r) { done = true; resolve(r); } };
    // Slow network: the saved copy, if there is one.
    const t = setTimeout(() => saved().then(finish), NET_WAIT);
    network.then(res => { clearTimeout(t); finish(res); }, () => {
      clearTimeout(t);
      // Offline: the saved copy of this same page. Only the vocabulary trainer falls back to its
      // precached copy; any other page shows a short offline note instead of a different page.
      saved().then(hit => {
        if (hit) return finish(hit);
        if (!isNav) return finish(Response.error());
        if (/\/vocab\.html$/.test(u.pathname)) return caches.match('vocab.html').then(v => finish(v || offlinePage()));
        finish(offlinePage());
      });
    });
  }));
});

function offlinePage() {
  return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline | SAT Ustoz</title>' +
    '<body style="font-family:system-ui,sans-serif;max-width:32em;margin:15vh auto;padding:0 20px;color:#1D2A20"><h1>No connection</h1>' +
    '<p>This page could not load. Check your internet, then <a href="" style="color:#2D5038">try again</a>. The <a href="vocab.html" style="color:#2D5038">vocabulary trainer</a> works offline.</p></body>',
    { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } });
}
