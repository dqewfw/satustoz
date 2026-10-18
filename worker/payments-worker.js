/**
 * SAT Ustoz — Payments (Cloudflare Worker) for Payme Business
 * ------------------------------------------------------------------
 * Takes Pro payments with Payme, renews Pro every month from a saved card,
 * and hands out the Pro practice tests only to students whose plan allows it.
 * Your Payme key and Google service account live here, never in the website.
 *
 * Endpoints for the website (the student must be signed in with Google):
 *   POST /checkout      -> { orderId, amount, url, card }   start a Pro purchase
 *   POST /card/start    { orderId, number, expire }        card form: Payme sends an SMS code
 *   POST /card/resend   {}                                 send the SMS code again
 *   POST /card/verify   { code }                           pay with the card and save it for renewals
 *   POST /status        -> { plan, until, source, renew }  current plan and auto-renewal
 *   POST /cancel        {}                                 stop auto-renewal (Pro stays until it ends)
 *   GET  /test?id=...   Pro test file, only for students with Pro
 * For Payme:
 *   POST /payme         Payme Merchant API (CheckPerformTransaction, CreateTransaction, ...)
 * Every day (Cron Trigger): charges saved cards whose month ends within a day.
 *
 * ONE-TIME SETUP (dashboard only). README "6. Plans and payments" has the
 * same steps with more detail.
 *  1. Cloudflare -> Workers & Pages -> KV -> Create namespace "sh-payments".
 *  2. Workers & Pages -> Create -> Create Worker, name it "scholarshub-pay",
 *     Deploy -> Edit code, replace everything with THIS file, Deploy.
 *  3. Worker -> Settings -> Bindings -> Add -> KV namespace:
 *       variable name PAYMENTS, namespace sh-payments.
 *  4. Worker -> Settings -> Variables and Secrets -> Add:
 *       FIREBASE_PROJECT_ID     (Text)    e.g. satustoz
 *       GOOGLE_SERVICE_ACCOUNT  (Secret)  the whole JSON file from Firebase ->
 *                                         Project settings -> Service accounts ->
 *                                         Generate new private key
 *       ALLOWED_ORIGINS         (Text)    https://satustoz.academy,https://www.satustoz.academy
 *       SITE_URL                (Text)    https://satustoz.academy
 *       PRO_PRICE               (Text)    Pro price in so'm, e.g. 79000
 *       PAYME_MERCHANT_ID       (Text)    your Payme web kassa ID
 *       PAYME_TEST_KEY          (Secret)  the kassa's TEST_KEY (sandbox)
 *       PAYME_KEY               (Secret)  the kassa's real key (when you go live)
 *       PAYME_TEST              (Text)    true while testing, false when live
 *     Optional:
 *       PAYME_CARDS_ID / PAYME_CARDS_KEY  (Text / Secret) a separate kassa for card
 *                               payments (the "virtual terminal" from Payme's test
 *                               cabinet while testing). Default: the web kassa.
 *       PAYME_CARDS             (Text)    false hides "Pay by card, renews monthly"
 *       PAYME_ACCOUNT_FIELD     (Text)    default order_id (the account field set up
 *                                         in your kassa)
 *       PAYME_IKPU, PAYME_PACKAGE_CODE, PAYME_VAT_PERCENT, PAYME_ITEM_TITLE
 *                               (Text)    fiscal receipt details from your accountant
 *       PRO_DAYS                (Text)    default 30
 *       RENEW_ATTEMPTS          (Text)    default 3 (daily tries before auto-renewal stops)
 *       PAYME_IP_CHECK          (Text)    true = accept /payme only from Payme's servers
 *                                         (turn on after going live)
 *       ADMIN_KEY               (Secret)  lets you run renewals by hand while testing
 *       PRO_TESTS_REPO          (Text)    e.g. yourname/satustoz-pro-tests (private repo)
 *       PRO_TESTS_DIR           (Text)    folder inside that repo, default none
 *       GITHUB_TOKEN            (Secret)  read-only token for that repo
 *  5. Worker -> Settings -> Triggers -> Cron Triggers -> Add: 0 4 * * *
 *     (every day at 09:00 Tashkent time).
 *  6. Payme cabinet -> your kassa -> developer settings -> Endpoint URL:
 *     https://scholarshub-pay.<you>.workers.dev/payme
 *  7. Put the Worker URL in PAYMENTS_ENDPOINT at the top of assets/sh.js.
 *
 * PRO TESTS ONLY, before Payme is ready (README "Moving the Pro tests off
 * GitHub Pages"): steps 1 to 3, then in step 4 only FIREBASE_PROJECT_ID,
 * GOOGLE_SERVICE_ACCOUNT, ALLOWED_ORIGINS, SITE_URL, PRO_TESTS_REPO and
 * GITHUB_TOKEN. Skip steps 5 and 6, and put the Worker URL in TESTS_ENDPOINT,
 * not PAYMENTS_ENDPOINT. Without the Payme keys, /checkout and /payme refuse
 * every request; add them later and nothing else changes.
 *
 * Card numbers pass through this Worker on their way to Payme (Payme's API
 * cannot be called from a browser) and are never stored or logged. Payme
 * returns a card token; only the token is kept, here, in KV.
 */

const DAY = 86400000;
const PAYME_TIMEOUT = 43200000; // Payme cancels unfinished transactions after 12 hours
const ORDER_TTL = 3 * 86400;    // unpaid orders are forgotten after 3 days
const PAYME_IPS = Array.from({ length: 15 }, (_, i) => '185.234.113.' + (i + 1));
const PAYME_TERMS = 'https://cdn.payme.uz/terms/main.html';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (path === '/payme') return payme(request, env);
    if (path.startsWith('/admin/')) return admin(request, env, url, path);

    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || 'https://satustoz.academy,https://www.satustoz.academy')
      .split(',').map(s => s.trim()).filter(Boolean);
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, authorization',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const handler = ROUTES[request.method + ' ' + path];
    if (!handler) return json({ error: 'Not found.' }, 404);
    if (!allowed.includes(origin)) return json({ error: 'This site is not allowed to use the payment service.' }, 403);
    if (!env.PAYMENTS || !env.FIREBASE_PROJECT_ID || !env.GOOGLE_SERVICE_ACCOUNT) return json({ error: 'Online payment is not switched on yet.' }, 503);

    let body = {};
    if (request.method === 'POST') {
      try {
        const text = await request.text();
        if (text.length > 4000) return json({ error: 'Request is too large.' }, 413);
        body = text ? JSON.parse(text) : {};
        if (!body || typeof body !== 'object') body = {};
      } catch (e) { return json({ error: 'Invalid request.' }, 400); }
    }

    const m = (request.headers.get('Authorization') || '').match(/^Bearer\s+(.+)$/i);
    let student = null;
    try { student = m ? await verifyFirebaseToken(m[1], env.FIREBASE_PROJECT_ID) : null; } catch (e) { student = null; }
    if (!student) return json({ error: 'Please sign in with Google first.', code: 'auth' }, 401);

    try {
      const out = await handler({ env, url, body, student, lang: pickLang(body.lang) });
      if (out instanceof Response) {
        const r = new Response(out.body, out);
        Object.entries(cors).forEach(([k, v]) => r.headers.set(k, v));
        return r;
      }
      return json(out);
    } catch (e) {
      if (e instanceof PublicError) return json({ error: e.publicMessage, code: e.code }, e.status);
      console.log('payments error', path, e && e.stack || e);
      return json({ error: 'The payment service had a problem. Please try again in a minute.' }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(renewDue(env).then(r => console.log('renewals', JSON.stringify(r))).catch(e => console.log('renewals failed', e && e.stack || e)));
  }
};

const ROUTES = {
  'POST /checkout': checkout,
  'POST /card/start': cardStart,
  'POST /card/resend': cardResend,
  'POST /card/verify': cardVerify,
  'POST /status': status,
  'POST /cancel': cancelRenewal,
  'GET /test': proTest
};

class PublicError extends Error {
  constructor(msg, status, code) { super(msg); this.publicMessage = msg; this.status = status || 400; this.code = code; }
}

function cfg(env) {
  const test = String(env.PAYME_TEST || '').toLowerCase() === 'true';
  const merchant = String(env.PAYME_MERCHANT_ID || '').trim();
  const key = test ? (env.PAYME_TEST_KEY || '') : (env.PAYME_KEY || '');
  return {
    test, merchant, key,
    cardsId: String(env.PAYME_CARDS_ID || '').trim() || merchant,
    cardsKey: env.PAYME_CARDS_KEY || key,
    cards: String(env.PAYME_CARDS || '').toLowerCase() !== 'false',
    field: String(env.PAYME_ACCOUNT_FIELD || 'order_id').trim(),
    amount: Math.round(Number(String(env.PRO_PRICE || '').replace(/[^0-9]/g, '')) * 100), // tiyin
    days: Number(env.PRO_DAYS) > 0 ? Number(env.PRO_DAYS) : 30,
    attempts: Number(env.RENEW_ATTEMPTS) > 0 ? Number(env.RENEW_ATTEMPTS) : 3,
    checkoutUrl: test ? 'https://test.paycom.uz' : 'https://checkout.paycom.uz',
    apiUrl: test ? 'https://checkout.test.paycom.uz/api' : 'https://checkout.paycom.uz/api',
    site: (env.SITE_URL || 'https://satustoz.academy').replace(/\/+$/, '')
  };
}
const pickLang = l => (['uz', 'ru', 'en'].includes(l) ? l : 'en');

/* ------------------------------------------------------------------
   Small storage helpers (KV)
   ------------------------------------------------------------------ */
async function kvGet(env, key) {
  const v = await env.PAYMENTS.get(key);
  return v ? JSON.parse(v) : null;
}
const kvPut = (env, key, val, opts) => env.PAYMENTS.put(key, JSON.stringify(val), opts);
const getOrder = (env, id) => (id && /^[A-Z0-9]{6,20}$/.test(String(id)) ? kvGet(env, 'order:' + id) : null);
// Unpaid orders expire; once Payme or a card payment touches an order it is kept.
const putOrder = (env, order, keep) => kvPut(env, 'order:' + order.id, order, keep ? undefined : { expirationTtl: ORDER_TTL });
const getTxn = (env, id) => kvGet(env, 'txn:' + id);
async function putTxn(env, t, isNew) {
  await kvPut(env, 'txn:' + t.id, t);
  // Index by Payme's creation time, for GetStatement.
  if (isNew) await env.PAYMENTS.put('tday:' + new Date(t.time).toISOString().slice(0, 10) + ':' + String(t.time).padStart(13, '0') + ':' + t.id, '');
}
const saveSub = (env, uid, sub) => kvPut(env, 'sub:' + uid, sub, { metadata: { status: sub.status, until: sub.until || 0, pending: !!sub.pendingOrder } });

function newId(n) {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(n)), x => a[x % a.length]).join('');
}

// A few tries a day per student, so nobody can use the card form to test stolen cards.
async function limit(env, key, max) {
  const k = 'rl:' + key + ':' + new Date().toISOString().slice(0, 10);
  const n = Number(await env.PAYMENTS.get(k) || 0);
  if (n >= max) throw new PublicError('Too many tries today. Please try again tomorrow, or message us on Telegram.', 429);
  await env.PAYMENTS.put(k, String(n + 1), { expirationTtl: 172800 });
}

/* ------------------------------------------------------------------
   Website endpoints
   ------------------------------------------------------------------ */
async function checkout({ env, student, lang }) {
  const c = cfg(env);
  if (!c.merchant || !c.amount || !c.key) throw new PublicError('Online payment is not switched on yet.', 503);
  await limit(env, 'checkout:' + student.sub, 20);
  const order = { id: newId(10), uid: student.sub, email: student.email || '', amount: c.amount, kind: 'new', state: 'new', createdAt: Date.now() };
  await putOrder(env, order);
  // Payme's GET checkout: base64 of "key=value;key=value". The return URL has no ";" or "=".
  const back = c.site + '/practice.html?paid#plans';
  const params = ['m=' + c.merchant, 'ac.' + c.field + '=' + order.id, 'a=' + c.amount, 'l=' + lang, 'c=' + back].join(';');
  return { orderId: order.id, amount: c.amount / 100, url: c.checkoutUrl + '/' + btoa(params), card: c.cards, terms: PAYME_TERMS };
}

async function cardStart({ env, student, body, lang }) {
  const c = cfg(env);
  if (!c.cards) throw new PublicError('Card payments are not switched on.', 503);
  const order = await getOrder(env, body.orderId);
  if (!order || order.uid !== student.sub || order.state !== 'new') throw new PublicError('This payment has expired. Please start again.', 409, 'expired');
  const number = String(body.number || '').replace(/\D/g, '');
  const expire = String(body.expire || '').replace(/\D/g, '');
  if (!/^\d{16,19}$/.test(number)) throw new PublicError(T(lang, 'badCard'), 400, 'card');
  if (!/^(0[1-9]|1[0-2])\d{2}$/.test(expire)) throw new PublicError(T(lang, 'badExpire'), 400, 'expire');
  await limit(env, 'card:' + student.sub, 8);
  const created = await subscribe(env, 'cards.create', { card: { number, expire }, save: true }, false, lang);
  const card = created.card || {};
  if (!card.token) throw new PublicError(T(lang, 'payme'), 502);
  if (card.recurrent === false) throw new PublicError(T(lang, 'noRecurrent'), 400, 'card');
  const sent = await subscribe(env, 'cards.get_verify_code', { token: card.token }, false, lang);
  // The token stays on the server. The browser only learns where the SMS went.
  await kvPut(env, 'pending:' + student.sub, { token: card.token, number: card.number || '', expire: card.expire || '', orderId: order.id }, { expirationTtl: 900 });
  return { phone: sent.phone || '', wait: Number(sent.wait) || 60000 };
}

async function cardResend({ env, student, lang }) {
  const p = await kvGet(env, 'pending:' + student.sub);
  if (!p) throw new PublicError(T(lang, 'codeExpired'), 409, 'expired');
  await limit(env, 'sms:' + student.sub, 6);
  const sent = await subscribe(env, 'cards.get_verify_code', { token: p.token }, false, lang);
  return { phone: sent.phone || '', wait: Number(sent.wait) || 60000 };
}

async function cardVerify({ env, student, body, lang }) {
  const uid = student.sub;
  const p = await kvGet(env, 'pending:' + uid);
  if (!p) throw new PublicError(T(lang, 'codeExpired'), 409, 'expired');
  const code = String(body.code || '').replace(/\D/g, '');
  if (!/^\d{4,8}$/.test(code)) throw new PublicError(T(lang, 'badCode'), 400, 'code');
  await limit(env, 'code:' + uid, 10);
  const verified = (await subscribe(env, 'cards.verify', { token: p.token, code }, false, lang)).card || {};
  if (!verified.verify) throw new PublicError(T(lang, 'badCode'), 400, 'code');
  const token = verified.token || p.token;
  await env.PAYMENTS.delete('pending:' + uid);

  const order = await getOrder(env, p.orderId);
  if (!order || order.uid !== uid || order.state !== 'new') throw new PublicError('This payment has expired. Please start again.', 409, 'expired');
  order.kind = 'card';
  const r = await chargeCard(env, order, token, lang);
  if (r.state === 'failed') {
    await removeCard(env, token);
    throw new PublicError(r.error || T(lang, 'declined'), 402, 'declined');
  }
  // Keep the card for monthly renewals (only Payme's token, never the number).
  const old = await kvGet(env, 'sub:' + uid);
  if (old && old.token && old.token !== token) await removeCard(env, old.token);
  const sub = {
    status: 'active', token, number: verified.number || p.number, expire: verified.expire || p.expire,
    email: student.email || '', since: Date.now(), until: r.until || 0, failures: 0,
    lastAttempt: Date.now(), pendingOrder: r.state === 'pending' ? order.id : null
  };
  await saveSub(env, uid, sub);
  return { state: r.state, until: r.until || 0, card: sub.number };
}

async function status({ env, student }) {
  const user = await fsGet(env, 'users/' + student.sub);
  const f = user ? user.fields : {};
  const sub = await kvGet(env, 'sub:' + student.sub);
  const c = cfg(env);
  return {
    plan: str(f.plan) || null,
    until: tsMs(f.planUntil),
    source: str(f.planSource),
    renew: sub && sub.status === 'active' ? { card: sub.number || '', amount: c.amount / 100, pending: !!sub.pendingOrder } : null
  };
}

async function cancelRenewal({ env, student }) {
  const sub = await kvGet(env, 'sub:' + student.sub);
  if (sub && sub.token) await removeCard(env, sub.token);
  if (sub) await env.PAYMENTS.delete('sub:' + student.sub);
  return { ok: true };
}

/* ------------------------------------------------------------------
   Pro test files: only for students whose plan opens them
   ------------------------------------------------------------------ */
const PLAN_RANK = { free: 0, pro: 1, max: 2 };
function planAllows(fields, need) {
  const plan = str(fields && fields.plan), until = tsMs(fields && fields.planUntil);
  if (!(plan in PLAN_RANK) || (until && until < Date.now())) return (PLAN_RANK[need] || 0) === 0;
  return PLAN_RANK[plan] >= (PLAN_RANK[need] || 0);
}

let catalogCache = { list: null, until: 0 };
async function catalog(env) {
  if (catalogCache.list && Date.now() < catalogCache.until) return catalogCache.list;
  const res = await fetch(cfg(env).site + '/data/catalog.json', { cf: { cacheTtl: 300 } });
  if (!res.ok) throw new PublicError('Could not load the list of tests. Please try again.', 502);
  const data = await res.json();
  catalogCache = { list: Array.isArray(data.tests) ? data.tests : [], until: Date.now() + 300000 };
  return catalogCache.list;
}

async function proTest({ env, url, student }) {
  const id = url.searchParams.get('id') || '';
  if (!/^[a-z0-9-]{1,64}$/.test(id)) throw new PublicError('Unknown test.', 404);
  const meta = (await catalog(env)).find(t => t.id === id);
  if (!meta) throw new PublicError('Unknown test.', 404);
  const need = meta.plan || 'free';
  if (need !== 'free') {
    const user = await fsGet(env, 'users/' + student.sub);
    const ok = planAllows(user && user.fields, need);
    // A student keeps access to tests they opened while on Pro, so they can
    // review their results after the plan ends.
    const seenKey = 'seen:' + student.sub + ':' + id;
    const seen = await env.PAYMENTS.get(seenKey);
    if (!ok && !seen) throw new PublicError(meta.title + ' is part of Pro.', 403, 'plan');
    if (ok && !seen) await env.PAYMENTS.put(seenKey, String(Date.now()));
  }
  const text = await testFile(env, meta);
  return new Response(text, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store' } });
}

const testCache = new Map();
async function testFile(env, meta) {
  const hit = testCache.get(meta.id);
  if (hit && Date.now() < hit.until) return hit.text;
  const name = String(meta.file || meta.id + '.json').split('/').pop();
  let text = null;
  // 1. A KV namespace bound as PRO_TESTS, one entry per test ID.
  if (env.PRO_TESTS) text = await env.PRO_TESTS.get(meta.id);
  // 2. A private GitHub repository.
  if (!text && env.PRO_TESTS_REPO && env.GITHUB_TOKEN) {
    const dir = String(env.PRO_TESTS_DIR || '').replace(/^\/+|\/+$/g, '');
    const path = (dir ? dir + '/' : '') + name;
    const res = await fetch('https://api.github.com/repos/' + env.PRO_TESTS_REPO + '/contents/' + path.split('/').map(encodeURIComponent).join('/'), {
      headers: { authorization: 'Bearer ' + env.GITHUB_TOKEN, accept: 'application/vnd.github.raw+json', 'user-agent': 'satustoz-payments', 'x-github-api-version': '2022-11-28' }
    });
    if (res.ok) text = await res.text();
    else console.log('github test file', path, res.status);
  }
  // 3. Still on the public site (before you move the files).
  if (!text && meta.file) {
    const res = await fetch(cfg(env).site + '/' + String(meta.file).replace(/^\/+/, ''));
    if (res.ok) text = await res.text();
  }
  if (!text) throw new PublicError('This test could not be loaded. Please try again later.', 502);
  testCache.set(meta.id, { text, until: Date.now() + 600000 });
  return text;
}

/* ------------------------------------------------------------------
   Payme Subscribe API (we call Payme): cards and receipts
   ------------------------------------------------------------------ */
async function subscribe(env, method, params, backend, lang) {
  const c = cfg(env);
  if (!c.cardsId || (backend && !c.cardsKey)) throw new PublicError('Card payments are not switched on.', 503);
  let res, data;
  try {
    res = await fetch(c.apiUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-auth': backend ? c.cardsId + ':' + c.cardsKey : c.cardsId },
      body: JSON.stringify({ id: Date.now(), method, params })
    });
    data = await res.json();
  } catch (e) {
    const err = new PublicError(T(lang, 'payme'), 502);
    err.network = true;
    throw err;
  }
  if (data && data.error) {
    const msg = data.error.message;
    const text = typeof msg === 'string' ? msg : msg && (msg[lang] || msg.en || msg.ru || msg.uz);
    console.log('payme', method, JSON.stringify(data.error).slice(0, 300));
    const err = new PublicError('Payme: ' + (text || T(lang, 'declined')), 400, 'payme');
    err.payme = data.error;
    throw err;
  }
  return (data && data.result) || {};
}

async function removeCard(env, token) {
  try { await subscribe(env, 'cards.remove', { token }, true); } catch (e) { console.log('cards.remove failed', e.publicMessage || e); }
}

function fiscalDetail(env, amount) {
  if (!env.PAYME_IKPU) return null;
  return {
    receipt_type: 0,
    items: [{
      title: env.PAYME_ITEM_TITLE || 'SAT Ustoz Pro (1 month)', price: amount, count: 1,
      code: String(env.PAYME_IKPU), package_code: String(env.PAYME_PACKAGE_CODE || ''), vat_percent: Number(env.PAYME_VAT_PERCENT || 0)
    }]
  };
}

const RECEIPT_BUSY = [1, 2, 3, 5, 6, 20, 30]; // Payme is still working on it
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Charge a saved card for one order. Returns { state: 'paid' | 'pending' | 'failed' }.
async function chargeCard(env, order, token, lang) {
  const c = cfg(env);
  order.state = 'paying';
  await putOrder(env, order, true);
  let receipt;
  try {
    const params = { amount: order.amount, account: { [c.field]: order.id }, description: 'SAT Ustoz Pro, ' + c.days + ' days' };
    const detail = fiscalDetail(env, order.amount);
    if (detail) params.detail = detail;
    receipt = (await subscribe(env, 'receipts.create', params, true, lang)).receipt;
    if (!receipt || !receipt._id) throw new PublicError(T(lang, 'payme'), 502);
    order.receipt = receipt._id;
    await putOrder(env, order, true);
    receipt = (await subscribe(env, 'receipts.pay', { id: order.receipt, token, payer: { id: order.uid } }, true, lang)).receipt;
  } catch (e) {
    if (!(e instanceof PublicError)) throw e;
    // No answer after asking Payme to pay: the money may have moved. Check later.
    if (e.network && order.receipt) return { state: 'pending' };
    order.state = 'failed'; order.error = e.publicMessage;
    await putOrder(env, order, true);
    return { state: 'failed', error: e.publicMessage };
  }
  return settleReceipt(env, order, receipt && receipt.state, lang);
}

async function settleReceipt(env, order, state, lang) {
  for (let i = 0; i < 3 && RECEIPT_BUSY.includes(state); i++) {
    await sleep(1500);
    try { state = (await subscribe(env, 'receipts.check', { id: order.receipt }, true)).state; } catch (e) { /* try again */ }
  }
  if (state === 4) {
    // Payme's PerformTransaction may have updated this order meanwhile.
    Object.assign(order, (await getOrder(env, order.id)) || {});
    if (order.state !== 'paid') { order.state = 'paid'; order.paidAt = Date.now(); await putOrder(env, order, true); }
    let g = null;
    try { g = await grantMonth(env, order, 'receipt:' + order.receipt); } catch (e) { console.log('grant failed', order.id, e && e.message); }
    if (!g) return { state: 'pending' };
    if (!order.granted) { order.granted = true; await putOrder(env, order, true); }
    return { state: 'paid', until: g.until };
  }
  if (RECEIPT_BUSY.includes(state)) return { state: 'pending' };
  order.state = 'failed'; order.error = 'receipt state ' + state;
  await putOrder(env, order, true);
  return { state: 'failed', error: T(lang, 'declined') };
}

// For a payment whose result was not known yet.
async function settleOrder(env, orderId) {
  const order = await getOrder(env, orderId);
  if (!order) return { state: 'failed' };
  if (order.state === 'paid' && order.granted) {
    const pay = await fsGet(env, 'payments/' + order.id);
    return { state: 'paid', until: pay ? tsMs(pay.fields.planUntil) : 0 };
  }
  if (order.state === 'failed' || order.state === 'refunded') return { state: 'failed' };
  if (!order.receipt) return order.state === 'paid' ? settleReceipt(env, order, 4) : { state: 'failed' };
  let st;
  try { st = (await subscribe(env, 'receipts.check', { id: order.receipt }, true)).state; } catch (e) { return { state: 'pending' }; }
  return settleReceipt(env, order, st);
}

/* ------------------------------------------------------------------
   Monthly renewals (Cron Trigger)
   ------------------------------------------------------------------ */
async function renewDue(env, opts) {
  opts = opts || {};
  const now = Date.now();
  const results = [];
  let cursor;
  do {
    const page = await env.PAYMENTS.list({ prefix: 'sub:', cursor });
    for (const k of page.keys) {
      const uid = k.name.slice(4), m = k.metadata || {};
      if (opts.uid && uid !== opts.uid) continue;
      // Skip cards whose month is not ending yet, without reading them.
      if (!opts.force && m.status === 'active' && !m.pending && m.until && m.until - now > DAY) continue;
      results.push(await renewOne(env, uid, opts.force).catch(e => ({ uid, error: String(e && e.message || e) })));
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  return results;
}

async function renewOne(env, uid, force) {
  const c = cfg(env);
  const sub = await kvGet(env, 'sub:' + uid);
  if (!sub || sub.status !== 'active') return { uid, skipped: 'auto-renewal is off' };
  if (sub.pendingOrder) {
    const done = await settleOrder(env, sub.pendingOrder);
    if (done.state === 'pending') return { uid, pending: sub.pendingOrder };
    sub.pendingOrder = null;
    if (done.state === 'paid') {
      Object.assign(sub, { until: done.until, failures: 0, lastError: null });
      await saveSub(env, uid, sub);
      return { uid, state: 'paid', until: done.until, note: 'earlier payment confirmed' };
    }
  }
  const user = await fsGet(env, 'users/' + uid);
  const f = user ? user.fields : {};
  const until = tsMs(f.planUntil);
  if (str(f.plan) && !until) { await saveSub(env, uid, sub); return { uid, skipped: 'plan has no end date' }; }
  if (!force && until && until - Date.now() > DAY) {
    sub.until = until;
    await saveSub(env, uid, sub);
    return { uid, skipped: 'not due yet', until };
  }
  if (!force && sub.lastAttempt && Date.now() - sub.lastAttempt < 20 * 3600000) return { uid, skipped: 'already tried today' };

  const order = { id: newId(10), uid, email: sub.email || '', amount: c.amount, kind: 'renewal', state: 'new', createdAt: Date.now() };
  sub.lastAttempt = Date.now();
  const r = await chargeCard(env, order, sub.token, 'en');
  if (r.state === 'paid') Object.assign(sub, { until: r.until, failures: 0, lastError: null, lastChargeAt: Date.now() });
  else if (r.state === 'pending') sub.pendingOrder = order.id;
  else {
    // The plan is not touched: Pro simply ends at planUntil.
    sub.failures = (sub.failures || 0) + 1;
    sub.lastError = r.error || 'declined';
    if (sub.failures >= c.attempts) {
      sub.status = 'stopped';
      await removeCard(env, sub.token);
      sub.token = null;
    }
  }
  await saveSub(env, uid, sub);
  return { uid, order: order.id, state: r.state, until: r.until, error: r.error, failures: sub.failures, status: sub.status };
}

// For testing renewals without waiting a day:
//   /admin/renew?key=ADMIN_KEY            charge everyone who is due now
//   /admin/renew?key=ADMIN_KEY&uid=...&force=1   charge this student now
//   /admin/sub?key=ADMIN_KEY&uid=...      what is stored for this student
//   /admin/drop-card?key=ADMIN_KEY&uid=...  delete the card at Payme but keep
//                                           auto-renewal on, so the next charge fails
async function admin(request, env, url, path) {
  const out = (obj, status = 200) => new Response(JSON.stringify(obj, null, 2), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  const given = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
  if (!env.ADMIN_KEY || !safeEqual(given, env.ADMIN_KEY)) return out({ error: 'Not found.' }, 404);
  const uid = url.searchParams.get('uid') || '';
  try {
    if (path === '/admin/renew') return out({ results: await renewDue(env, { uid: uid || null, force: url.searchParams.get('force') === '1' && !!uid }) });
    if (path === '/admin/sub' && uid) {
      const sub = await kvGet(env, 'sub:' + uid);
      if (sub && sub.token) sub.token = '(saved)';
      const user = await fsGet(env, 'users/' + uid);
      const f = user ? user.fields : {};
      return out({ sub, plan: str(f.plan), planUntil: tsMs(f.planUntil) ? new Date(tsMs(f.planUntil)).toISOString() : null, planSource: str(f.planSource) });
    }
    if (path === '/admin/drop-card' && uid) {
      const sub = await kvGet(env, 'sub:' + uid);
      if (!sub || !sub.token) return out({ error: 'No saved card for this student.' }, 404);
      await removeCard(env, sub.token);
      return out({ ok: true, note: 'The card was deleted at Payme. Auto-renewal is still on, so the next charge will fail.' });
    }
  } catch (e) { return out({ error: e.publicMessage || String(e && e.message || e) }, 500); }
  return out({ error: 'Not found.' }, 404);
}

/* ------------------------------------------------------------------
   Payme Merchant API (Payme calls us). JSON-RPC 2.0, always HTTP 200.
   https://developer.help.paycom.uz/protokol-merchant-api/
   ------------------------------------------------------------------ */
const MSG = {
  post: { ru: 'Метод запроса должен быть POST.', uz: 'Soʻrov POST usulida boʻlishi kerak.', en: 'The request method must be POST.' },
  parse: { ru: 'Ошибка разбора JSON.', uz: 'JSON xato.', en: 'JSON parse error.' },
  invalid: { ru: 'Неверный RPC-запрос.', uz: 'Notoʻgʻri RPC soʻrov.', en: 'Invalid RPC request.' },
  method: { ru: 'Метод не найден.', uz: 'Usul topilmadi.', en: 'Method not found.' },
  auth: { ru: 'Недостаточно привилегий для выполнения метода.', uz: 'Usulni bajarish uchun ruxsat yetarli emas.', en: 'Insufficient privileges to perform this method.' },
  system: { ru: 'Системная ошибка.', uz: 'Tizim xatosi.', en: 'System error.' },
  amount: { ru: 'Неверная сумма.', uz: 'Notoʻgʻri summa.', en: 'Incorrect amount.' },
  order: { ru: 'Заказ не найден.', uz: 'Buyurtma topilmadi.', en: 'Order not found.' },
  paid: { ru: 'Заказ уже оплачен или отменён.', uz: 'Buyurtma allaqachon toʻlangan yoki bekor qilingan.', en: 'This order is already paid or cancelled.' },
  busy: { ru: 'По этому заказу уже идёт другая оплата.', uz: 'Bu buyurtma boʻyicha boshqa toʻlov amalga oshirilmoqda.', en: 'Another payment for this order is in progress.' },
  txn: { ru: 'Транзакция не найдена.', uz: 'Tranzaksiya topilmadi.', en: 'Transaction not found.' },
  state: { ru: 'Невозможно выполнить операцию.', uz: 'Amalni bajarib boʻlmaydi.', en: 'Unable to perform this operation.' }
};
class RpcError extends Error {
  constructor(code, msg, data) { super(msg.en); this.rpc = { code, message: msg, data: data === undefined ? null : data }; }
}

async function payme(request, env) {
  const reply = (id, body) => new Response(JSON.stringify(Object.assign({ jsonrpc: '2.0', id }, body)), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } });
  const fail = (id, code, msg, data) => reply(id, { error: { code, message: msg, data: data === undefined ? null : data } });
  if (request.method !== 'POST') return fail(null, -32300, MSG.post);
  let rpc;
  try { rpc = JSON.parse(await request.text()); } catch (e) { return fail(null, -32700, MSG.parse); }
  const id = rpc && rpc.id !== undefined ? rpc.id : null;
  const ipOk = String(env.PAYME_IP_CHECK || '').toLowerCase() !== 'true' || PAYME_IPS.includes(request.headers.get('CF-Connecting-IP') || '');
  if (!ipOk || !paymeAuthOk(request, env)) return fail(id, -32504, MSG.auth);
  if (!rpc || typeof rpc.method !== 'string' || !rpc.params || typeof rpc.params !== 'object') return fail(id, -32600, MSG.invalid);
  const fn = Object.prototype.hasOwnProperty.call(MERCHANT, rpc.method) ? MERCHANT[rpc.method] : null;
  if (!fn) return fail(id, -32601, MSG.method, rpc.method);
  if (!env.PAYMENTS) return fail(id, -32400, MSG.system);
  try {
    return reply(id, { result: await fn(env, rpc.params) });
  } catch (e) {
    if (e.rpc) return reply(id, { error: e.rpc });
    console.log('payme', rpc.method, e && e.stack || e);
    return fail(id, -32400, MSG.system);
  }
}

function paymeAuthOk(request, env) {
  const key = cfg(env).key;
  const m = (request.headers.get('Authorization') || '').match(/^Basic\s+(\S+)$/i);
  if (!key || !m) return false;
  let decoded;
  try { decoded = atob(m[1]); } catch (e) { return false; }
  const i = decoded.indexOf(':');
  return i > -1 && safeEqual(decoded.slice(i + 1), key);
}

function safeEqual(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

const isExpired = t => Date.now() - t.create_time > PAYME_TIMEOUT;
const needId = p => { if (typeof p.id !== 'string' || !p.id) throw new RpcError(-32600, MSG.invalid, 'id'); };

async function orderFor(env, p) {
  const field = cfg(env).field;
  if (!Number.isInteger(p.amount) || p.amount <= 0) throw new RpcError(-31001, MSG.amount);
  const oid = p.account && p.account[field];
  const order = oid ? await getOrder(env, String(oid)) : null;
  if (!order) throw new RpcError(-31050, MSG.order, field);
  if (p.amount !== order.amount) throw new RpcError(-31001, MSG.amount);
  return order;
}

// Can this order take a payment? `forTxn` is the Payme transaction asking.
async function checkPayable(env, order, forTxn, creating) {
  const field = cfg(env).field;
  if (order.state !== 'new' && order.state !== 'paying') throw new RpcError(-31051, MSG.paid, field);
  if (order.txn && order.txn !== forTxn) {
    const other = await getTxn(env, order.txn);
    if (other && other.state === 1 && !isExpired(other)) throw creating ? new RpcError(-31008, MSG.state) : new RpcError(-31099, MSG.busy, field);
    if (other && other.state === 1) await cancelTxn(env, other, 4);
    if (other && other.state === 2) throw new RpcError(-31051, MSG.paid, field);
  }
}

async function cancelTxn(env, t, reason) {
  t.state = -1; t.cancel_time = Date.now(); t.reason = reason;
  await putTxn(env, t);
  const order = await getOrder(env, t.orderId);
  // Nothing was paid, so the order can be paid again.
  if (order && order.txn === t.id && order.state !== 'paid') { order.txn = null; if (order.state === 'paying' && !order.receipt) order.state = 'new'; await putOrder(env, order, true); }
}

const MERCHANT = {
  async CheckPerformTransaction(env, p) {
    const order = await orderFor(env, p);
    await checkPayable(env, order, null, false);
    const result = { allow: true };
    const detail = fiscalDetail(env, order.amount);
    if (detail) result.detail = detail;
    return result;
  },

  async CreateTransaction(env, p) {
    needId(p);
    let t = await getTxn(env, p.id);
    if (t) {
      if (t.state !== 1) throw new RpcError(-31008, MSG.state);
      if (isExpired(t)) { await cancelTxn(env, t, 4); throw new RpcError(-31008, MSG.state); }
      return { create_time: t.create_time, transaction: t.transaction, state: t.state };
    }
    const order = await orderFor(env, p);
    await checkPayable(env, order, p.id, true);
    if (Number(p.time) && Date.now() - Number(p.time) > PAYME_TIMEOUT) throw new RpcError(-31008, MSG.state);
    t = {
      id: p.id, time: Number(p.time) || Date.now(), amount: p.amount, account: p.account,
      orderId: order.id, uid: order.uid, create_time: Date.now(), perform_time: 0, cancel_time: 0,
      transaction: order.id + '-' + newId(4), state: 1, reason: null
    };
    await putTxn(env, t, true);
    order.txn = t.id;
    await putOrder(env, order, true);
    return { create_time: t.create_time, transaction: t.transaction, state: t.state };
  },

  async PerformTransaction(env, p) {
    needId(p);
    const t = await getTxn(env, p.id);
    if (!t) throw new RpcError(-31003, MSG.txn);
    if (t.state === 2) return { transaction: t.transaction, perform_time: t.perform_time, state: t.state };
    if (t.state !== 1) throw new RpcError(-31008, MSG.state);
    if (isExpired(t)) { await cancelTxn(env, t, 4); throw new RpcError(-31008, MSG.state); }
    const order = await getOrder(env, t.orderId);
    if (!order) throw new Error('order missing for ' + t.id);
    await grantMonth(env, order, 'payme:' + t.id); // throws -> -32400, and Payme retries
    t.state = 2; t.perform_time = Date.now();
    await putTxn(env, t);
    Object.assign(order, { state: 'paid', paidAt: t.perform_time, granted: true, paymeId: t.id });
    await putOrder(env, order, true);
    return { transaction: t.transaction, perform_time: t.perform_time, state: t.state };
  },

  async CancelTransaction(env, p) {
    needId(p);
    const t = await getTxn(env, p.id);
    if (!t) throw new RpcError(-31003, MSG.txn);
    const reason = Number.isInteger(p.reason) ? p.reason : null;
    if (t.state === 1) await cancelTxn(env, t, reason);
    else if (t.state === 2) {
      // Refund: take the month back and stop charging the card.
      const order = await getOrder(env, t.orderId);
      if (order) {
        await revokeMonth(env, order);
        order.state = 'refunded';
        await putOrder(env, order, true);
        const sub = await kvGet(env, 'sub:' + order.uid);
        if (sub && sub.status === 'active') {
          if (sub.token) await removeCard(env, sub.token);
          await saveSub(env, order.uid, Object.assign(sub, { status: 'stopped', token: null, lastError: 'refunded' }));
        }
      }
      t.state = -2; t.cancel_time = Date.now(); t.reason = reason;
      await putTxn(env, t);
    }
    return { transaction: t.transaction, cancel_time: t.cancel_time, state: t.state };
  },

  async CheckTransaction(env, p) {
    needId(p);
    const t = await getTxn(env, p.id);
    if (!t) throw new RpcError(-31003, MSG.txn);
    return { create_time: t.create_time, perform_time: t.perform_time, cancel_time: t.cancel_time, transaction: t.transaction, state: t.state, reason: t.reason == null ? null : t.reason };
  },

  async GetStatement(env, p) {
    const from = Number(p.from), to = Number(p.to);
    if (!from || !to || to < from) throw new RpcError(-32600, MSG.invalid, 'from');
    const ids = [];
    const start = Date.UTC(new Date(from).getUTCFullYear(), new Date(from).getUTCMonth(), new Date(from).getUTCDate());
    for (let d = start, n = 0; d <= to && n < 93; d += DAY, n++) {
      const prefix = 'tday:' + new Date(d).toISOString().slice(0, 10) + ':';
      let cursor;
      do {
        const page = await env.PAYMENTS.list({ prefix, cursor });
        for (const k of page.keys) {
          const [, , time, id] = k.name.split(':');
          if (Number(time) >= from && Number(time) <= to) ids.push(id);
        }
        cursor = page.list_complete ? null : page.cursor;
      } while (cursor);
    }
    const list = (await Promise.all(ids.map(id => getTxn(env, id)))).filter(Boolean).sort((a, b) => a.time - b.time);
    return {
      transactions: list.map(t => ({
        id: t.id, time: t.time, amount: t.amount, account: t.account,
        create_time: t.create_time, perform_time: t.perform_time, cancel_time: t.cancel_time,
        transaction: t.transaction, state: t.state, reason: t.reason == null ? null : t.reason, receivers: null
      }))
    };
  },

  // Optional in Payme's docs: fiscal receipt details after a payment. Kept for your records.
  async SetFiscalData(env, p) {
    if (typeof p.id !== 'string' || !p.fiscal_data) throw new RpcError(-32602, MSG.invalid, 'fiscal_data');
    const key = 'fiscal:' + p.id;
    const rec = (await kvGet(env, key)) || {};
    rec[p.type === 'CANCEL' ? 'cancel_data' : 'perform_data'] = p.fiscal_data;
    await kvPut(env, key, rec);
    return { success: true };
  }
};

/* ------------------------------------------------------------------
   The plan itself lives in Firestore (users/<uid>), written with a
   Google service account. Each paid order also gets payments/<orderId>,
   created at most once, so a payment can never extend Pro twice.
   ------------------------------------------------------------------ */
async function grantMonth(env, order, ref) {
  const c = cfg(env);
  for (let attempt = 0; attempt < 4; attempt++) {
    const done = await fsGet(env, 'payments/' + order.id);
    if (done) return { until: tsMs(done.fields.planUntil), already: true };
    const user = await fsGet(env, 'users/' + order.uid);
    const f = user ? user.fields : {};
    const now = Date.now(), plan = str(f.plan), curUntil = tsMs(f.planUntil);
    const active = (plan === 'pro' || plan === 'max') && (!curUntil || curUntil > now);
    const payment = {
      uid: order.uid, email: order.email || '', kind: order.kind || '', provider: 'payme', ref,
      amount: order.amount / 100, currency: 'UZS', paidAt: ts(now), revoked: false
    };
    const writes = [];
    let until = 0;
    if (active && !curUntil) {
      writes.push({ update: { name: docName(env, 'payments/' + order.id), fields: enc(payment) }, currentDocument: { exists: false } });
    } else {
      until = (active ? Math.max(now, curUntil) : now) + c.days * DAY;
      payment.planUntil = ts(until);
      writes.push({ update: { name: docName(env, 'payments/' + order.id), fields: enc(payment) }, currentDocument: { exists: false } });
      writes.push({
        update: { name: docName(env, 'users/' + order.uid), fields: enc({ plan: active && plan === 'max' ? 'max' : 'pro', planUntil: ts(until), planSource: 'payme' }) },
        updateMask: { fieldPaths: ['plan', 'planUntil', 'planSource'] },
        currentDocument: user ? { updateTime: user.updateTime } : { exists: false }
      });
    }
    const r = await fsCommit(env, writes);
    if (r.ok) return { until };
    if (!r.conflict) throw new Error('firestore commit ' + r.status + ' ' + r.text.slice(0, 300));
  }
  throw new Error('firestore stayed busy');
}

async function revokeMonth(env, order) {
  const c = cfg(env);
  for (let attempt = 0; attempt < 4; attempt++) {
    const pay = await fsGet(env, 'payments/' + order.id);
    if (!pay || pay.fields.revoked && pay.fields.revoked.booleanValue) return;
    const writes = [{
      update: { name: docName(env, 'payments/' + order.id), fields: enc({ revoked: true, revokedAt: ts(Date.now()) }) },
      updateMask: { fieldPaths: ['revoked', 'revokedAt'] },
      currentDocument: { updateTime: pay.updateTime }
    }];
    const user = await fsGet(env, 'users/' + order.uid);
    const until = user ? tsMs(user.fields.planUntil) : 0;
    if (user && until && tsMs(pay.fields.planUntil)) {
      writes.push({
        update: { name: docName(env, 'users/' + order.uid), fields: enc({ planUntil: ts(until - c.days * DAY) }) },
        updateMask: { fieldPaths: ['planUntil'] },
        currentDocument: { updateTime: user.updateTime }
      });
    }
    const r = await fsCommit(env, writes);
    if (r.ok) return;
    if (!r.conflict) throw new Error('firestore commit ' + r.status + ' ' + r.text.slice(0, 300));
  }
  throw new Error('firestore stayed busy');
}

const fsBase = env => 'https://firestore.googleapis.com/v1/projects/' + env.FIREBASE_PROJECT_ID + '/databases/(default)/documents';
const docName = (env, path) => 'projects/' + env.FIREBASE_PROJECT_ID + '/databases/(default)/documents/' + path;
async function fsGet(env, path) {
  const res = await fetch(fsBase(env) + '/' + path, { headers: { authorization: 'Bearer ' + await googleToken(env) } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('firestore get ' + res.status + ' ' + (await res.text()).slice(0, 300));
  const d = await res.json();
  return { fields: d.fields || {}, updateTime: d.updateTime };
}
async function fsCommit(env, writes) {
  const res = await fetch(fsBase(env) + ':commit', {
    method: 'POST', headers: { authorization: 'Bearer ' + await googleToken(env), 'content-type': 'application/json' },
    body: JSON.stringify({ writes })
  });
  if (res.ok) return { ok: true };
  const text = await res.text();
  return { ok: false, status: res.status, text, conflict: res.status === 409 || /FAILED_PRECONDITION|ALREADY_EXISTS|ABORTED/.test(text) };
}
const ts = ms => ({ timestampValue: new Date(ms).toISOString() });
function enc(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v && v.timestampValue ? v
      : typeof v === 'string' ? { stringValue: v }
      : typeof v === 'boolean' ? { booleanValue: v }
      : Number.isInteger(v) ? { integerValue: String(v) }
      : typeof v === 'number' ? { doubleValue: v } : { nullValue: null };
  }
  return out;
}
const str = v => (v && typeof v.stringValue === 'string' ? v.stringValue : '');
function tsMs(v) {
  if (!v) return 0;
  if (v.timestampValue) return Date.parse(v.timestampValue) || 0;
  if (v.integerValue) return Number(v.integerValue) || 0;
  return Number(v.doubleValue) || 0;
}

// Google access token from the service account (RS256 JWT, WebCrypto).
let googleTok = { token: null, until: 0 };
async function googleToken(env) {
  if (googleTok.token && Date.now() < googleTok.until) return googleTok.token;
  let sa;
  try { sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT); } catch (e) { throw new Error('GOOGLE_SERVICE_ACCOUNT is not the JSON file from Firebase'); }
  const now = Math.floor(Date.now() / 1000);
  const part = obj => b64url(new TextEncoder().encode(JSON.stringify(obj)));
  const unsigned = part({ alg: 'RS256', typ: 'JWT', kid: sa.private_key_id }) + '.' +
    part({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const der = b64Bytes(String(sa.private_key || '').replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, ''));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + unsigned + '.' + b64url(new Uint8Array(sig))
  });
  if (!res.ok) throw new Error('google token ' + res.status + ' ' + (await res.text()).slice(0, 200));
  const d = await res.json();
  googleTok = { token: d.access_token, until: Date.now() + (Number(d.expires_in || 3600) - 300) * 1000 };
  return googleTok.token;
}
function b64url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64Bytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* ------------------------------------------------------------------
   Firebase ID token check (RS256, Google's published keys)
   ------------------------------------------------------------------ */
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let jwksCache = { keys: null, until: 0 };
async function googleKeys() {
  if (jwksCache.keys && Date.now() < jwksCache.until) return jwksCache.keys;
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error('jwks ' + res.status);
  const age = Number(((res.headers.get('cache-control') || '').match(/max-age=(\d+)/) || [])[1] || 3600);
  jwksCache = { keys: (await res.json()).keys || [], until: Date.now() + age * 1000 };
  return jwksCache.keys;
}
const b64urlJSON = s => JSON.parse(new TextDecoder().decode(b64Bytes(s)));
async function verifyFirebaseToken(token, projectId) {
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  const header = b64urlJSON(parts[0]), payload = b64urlJSON(parts[1]);
  if (header.alg !== 'RS256' || !header.kid) return null;
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId || payload.iss !== 'https://securetoken.google.com/' + projectId) return null;
  if (!payload.sub || typeof payload.sub !== 'string' || payload.exp <= now || payload.iat > now + 300 || (payload.auth_time && payload.auth_time > now + 300)) return null;
  let jwk = (await googleKeys()).find(k => k.kid === header.kid);
  if (!jwk) { jwksCache.until = 0; jwk = (await googleKeys()).find(k => k.kid === header.kid); }
  if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64Bytes(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
  return ok ? payload : null;
}

/* ------------------------------------------------------------------
   Messages students see from this Worker
   ------------------------------------------------------------------ */
const TEXT = {
  en: {
    badCard: 'Check the card number: it should be 16 digits.',
    badExpire: 'Check the expiry date: month and year, like 03/29.',
    badCode: 'That code is not right. Check the SMS and try again.',
    codeExpired: 'The SMS code has expired. Please enter your card again.',
    noRecurrent: 'This card cannot be charged monthly. Try another card, or pay once on Payme’s page.',
    declined: 'Payme could not take the payment. Check the card balance or try another card.',
    payme: 'Payme did not answer. Please try again in a minute.'
  },
  uz: {
    badCard: 'Karta raqamini tekshiring: 16 ta raqam boʻlishi kerak.',
    badExpire: 'Amal qilish muddatini tekshiring: oy va yil, masalan 03/29.',
    badCode: 'Kod notoʻgʻri. SMSni tekshirib, qaytadan kiriting.',
    codeExpired: 'SMS kodning muddati tugadi. Kartani qaytadan kiriting.',
    noRecurrent: 'Bu kartadan har oy toʻlov olib boʻlmaydi. Boshqa kartani sinang yoki Payme sahifasida bir martalik toʻlang.',
    declined: 'Payme toʻlovni amalga oshira olmadi. Karta balansini tekshiring yoki boshqa kartani sinang.',
    payme: 'Payme javob bermadi. Bir daqiqadan soʻng qayta urinib koʻring.'
  },
  ru: {
    badCard: 'Проверьте номер карты: в нём должно быть 16 цифр.',
    badExpire: 'Проверьте срок действия: месяц и год, например 03/29.',
    badCode: 'Неверный код. Проверьте SMS и попробуйте ещё раз.',
    codeExpired: 'Срок действия SMS-кода истёк. Введите карту ещё раз.',
    noRecurrent: 'С этой карты нельзя списывать оплату ежемесячно. Попробуйте другую карту или оплатите один раз на странице Payme.',
    declined: 'Payme не смог провести оплату. Проверьте баланс карты или попробуйте другую карту.',
    payme: 'Payme не ответил. Попробуйте ещё раз через минуту.'
  }
};
const T = (lang, k) => (TEXT[lang] || TEXT.en)[k] || TEXT.en[k];
