// Browser harness: serves the site on :8791 with PAYMENTS_ENDPOINT pointed at
// the real payments Worker code running on :8792 against the local mocks.
// Sign-in is replaced by a test student (the Worker still checks a real RS256
// Firebase-style token, signed by a local key its mocked JWKS publishes).
// Usage: node server.mjs <siteDir> <workerFile>
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const [siteDir, workerFile] = process.argv.slice(2);
process.env.SITE_DIR = siteDir;
const { MemoryKV, setupKeys, keys, idToken, firestore, payme, installFetch, clock, PROJECT } = await import('./mocks.mjs');
await setupKeys();
installFetch();
const worker = (await import(workerFile)).default;
const SITE = 'http://localhost:8791', API = 'http://localhost:8792';
const env = {
  PAYMENTS: new MemoryKV(), FIREBASE_PROJECT_ID: PROJECT, GOOGLE_SERVICE_ACCOUNT: keys.saJson,
  ALLOWED_ORIGINS: SITE, SITE_URL: 'https://satustoz.academy', PRO_PRICE: '79000',
  PAYME_MERCHANT_ID: payme.merchant, PAYME_TEST_KEY: payme.key, PAYME_TEST: 'true', ADMIN_KEY: 'admin-secret'
};
const pending = [];
const ctx = { waitUntil: p => pending.push(p) };
payme.workerFetch = req => worker.fetch(req, env, ctx);
payme.merchantKey = payme.key;

async function toRequest(req, base) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  return new Request(base + req.url, { method: req.method, headers: req.headers, body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body });
}
async function send(res, r) {
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
}

const HARNESS = `
  (function harness() {
    var uid = localStorage.getItem('harness.uid') || 'browserStu';
    var u = { uid: uid, name: 'Test Student', email: uid + '@example.com', photo: '' };
    auth.user = u; auth.settled = true; auth.failed = false;
    auth.ready = async function () { return u; };
    auth.token = async function () { return (await fetch('/__token?uid=' + encodeURIComponent(uid))).text(); };
  })();
`;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };

http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, SITE);
    if (u.pathname === '/__token') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end(await idToken(u.searchParams.get('uid'), u.searchParams.get('uid') + '@example.com')); }
    if (u.pathname === '/__state') {
      const uid = u.searchParams.get('uid');
      const doc = firestore.get('users/' + uid), sub = await env.PAYMENTS.get('sub:' + uid);
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ user: doc && doc.fields, sub: sub && Object.assign(JSON.parse(sub), { token: '(saved)' }), payments: [...firestore.docs.keys()].filter(k => k.startsWith('payments/')), callbacks: payme.callbacks.map(c => c.method), receipts: payme.receipts.size }, null, 2));
    }
    if (u.pathname === '/__advance') { clock.advance(Number(u.searchParams.get('ms'))); res.writeHead(200); return res.end(new Date(Date.now()).toISOString()); }
    if (u.pathname === '/__cron') { await worker.scheduled({}, env, ctx); const r = await Promise.all(pending.splice(0)); res.writeHead(200); return res.end('ok'); }
    // Stand-in for Payme's hosted page: decode the checkout URL, then make the
    // Merchant API calls Payme makes when the student pays, then send them back.
    if (u.pathname === '/__paypage') {
      const params = Object.fromEntries(Buffer.from(u.searchParams.get('b64'), 'base64').toString().split(';').map(kv => [kv.slice(0, kv.indexOf('=')), kv.slice(kv.indexOf('=') + 1)]));
      const account = { order_id: params['ac.order_id'] }, amount = Number(params.a), id = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');
      const steps = [await payme.merchant_call('CheckPerformTransaction', { amount, account }), await payme.merchant_call('CreateTransaction', { id, time: Date.now(), amount, account })];
      steps.push(await payme.merchant_call('PerformTransaction', { id }));
      const back = params.c.replace('https://satustoz.academy', SITE);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end('<!doctype html><meta charset="utf-8"><title>Payme (test stand-in)</title><body style="font:16px sans-serif;padding:24px"><h1>Payme test page</h1><p>Merchant: ' + params.m + '<br>Order: ' + account.order_id + '<br>Amount: ' + amount + ' tiyin<br>Language: ' + params.l + '</p><pre>' + JSON.stringify(steps.map(s => s.result || s.error), null, 1) + '</pre><p><a id="back" href="' + back + '">Return to the site</a></p></body>');
    }
    if (u.pathname === '/__drop') { const r = await worker.fetch(new Request(API + '/admin/drop-card?key=admin-secret&uid=' + u.searchParams.get('uid')), env, ctx); return send(res, r); }
    let p = decodeURIComponent(u.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(siteDir, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
    if (!file.startsWith(siteDir)) { res.writeHead(403); return res.end(); }
    let data = await readFile(file);
    if (p === '/assets/sh.js') {
      let s = data.toString();
      s = s.replace("PAYMENTS_ENDPOINT: '',", "PAYMENTS_ENDPOINT: '" + API + "',");
      s = s.replace("  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initChrome); else initChrome();", HARNESS + "  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initChrome); else initChrome();");
      // Send "Pay once on Payme" to the local stand-in instead of test.paycom.uz.
      s = s.replace("location.href = co.url;", "location.href = co.url.replace('https://test.paycom.uz/', '/__paypage?b64=');");
      if (!s.includes(API) || !s.includes('function harness') || !s.includes('/__paypage')) throw new Error('could not patch sh.js');
      data = Buffer.from(s);
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  } catch (e) {
    res.writeHead(e.code === 'ENOENT' ? 404 : 500, { 'content-type': 'text/plain' });
    res.end(String(e && e.message || e));
  }
}).listen(8791, () => console.log('site with payments on ' + SITE));

http.createServer(async (req, res) => {
  try { await send(res, await worker.fetch(await toRequest(req, API), env, ctx)); }
  catch (e) { console.error(e); res.writeHead(500); res.end(String(e)); }
}).listen(8792, () => console.log('payments Worker on ' + API));
