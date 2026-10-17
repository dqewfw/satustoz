// Local stand-ins for everything the payments Worker talks to, built from the
// public docs: Cloudflare KV, Firestore REST, Google OAuth, Firebase's JWKS,
// Payme's Subscribe API (with Merchant API callbacks back to the Worker),
// the public site and the GitHub contents API.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const subtle = globalThis.crypto.subtle;
export const SITE_DIR = process.env.SITE_DIR;
export const PROJECT = 'satustoz';

/* ---------------- time control ---------------- */
const realNow = Date.now.bind(Date);
let offset = 0;
Date.now = () => realNow() + offset;
export const clock = { advance(ms) { offset += ms; }, reset() { offset = 0; } };

/* ---------------- KV ---------------- */
export class MemoryKV {
  constructor() { this.m = new Map(); this.writes = 0; }
  _live(k) { const e = this.m.get(k); if (!e) return null; if (e.exp && e.exp <= Date.now()) { this.m.delete(k); return null; } return e; }
  async get(k) { const e = this._live(k); return e ? e.v : null; }
  async put(k, v, o = {}) { this.writes++; this.m.set(k, { v: String(v), exp: o.expirationTtl ? Date.now() + o.expirationTtl * 1000 : 0, meta: o.metadata || null }); }
  async delete(k) { this.m.delete(k); }
  async list({ prefix = '', cursor } = {}) {
    const all = [...this.m.keys()].filter(k => k.startsWith(prefix) && this._live(k)).sort();
    const start = cursor ? Number(cursor) : 0, page = all.slice(start, start + 3); // tiny pages to exercise cursors
    const done = start + 3 >= all.length;
    return { keys: page.map(name => ({ name, metadata: this.m.get(name).meta })), list_complete: done, cursor: done ? undefined : String(start + 3) };
  }
}

/* ---------------- keys ---------------- */
const b64url = buf => Buffer.from(buf).toString('base64url');
async function rsa() { return subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']); }
export const keys = {};
export async function setupKeys() {
  keys.firebase = await rsa();
  keys.firebaseJwk = Object.assign(await subtle.exportKey('jwk', keys.firebase.publicKey), { kid: 'test-kid', alg: 'RS256', use: 'sig' });
  keys.sa = await rsa();
  const pkcs8 = Buffer.from(await subtle.exportKey('pkcs8', keys.sa.privateKey)).toString('base64');
  keys.saJson = JSON.stringify({
    type: 'service_account', project_id: PROJECT, private_key_id: 'sa-key-1',
    private_key: '-----BEGIN PRIVATE KEY-----\n' + pkcs8.match(/.{1,64}/g).join('\n') + '\n-----END PRIVATE KEY-----\n',
    client_email: 'pay-worker@' + PROJECT + '.iam.gserviceaccount.com', token_uri: 'https://oauth2.googleapis.com/token'
  });
}
export async function idToken(uid, email, opts = {}) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', kid: opts.kid || 'test-kid', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ iss: 'https://securetoken.google.com/' + (opts.project || PROJECT), aud: opts.project || PROJECT, sub: uid, email, iat: now, exp: now + (opts.ttl || 3600), auth_time: now }));
  const sig = await subtle.sign('RSASSA-PKCS1-v1_5', keys.firebase.privateKey, new TextEncoder().encode(head + '.' + body));
  return head + '.' + body + '.' + b64url(sig);
}

/* ---------------- Firestore REST ---------------- */
export const firestore = {
  docs: new Map(), tick: 0, tokens: new Set(), calls: [],
  stamp() { this.tick++; return new Date(Date.now()).toISOString().replace('Z', '') + String(this.tick).padStart(6, '0').slice(-6) + 'Z'; },
  set(p, fields) { const t = this.stamp(); const old = this.docs.get(p); this.docs.set(p, { fields: JSON.parse(JSON.stringify(fields)), createTime: old ? old.createTime : t, updateTime: t }); },
  get(p) { return this.docs.get(p) || null; }
};
const BASE = 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents';
const NAME = 'projects/' + PROJECT + '/databases/(default)/documents/';
function fsErr(code, status, message) { return Response.json({ error: { code, status, message } }, { status: code }); }
async function firestoreFetch(url, init) {
  const auth = (init.headers && (init.headers.authorization || init.headers.Authorization)) || '';
  if (!firestore.tokens.has(auth.replace(/^Bearer /, ''))) return fsErr(401, 'UNAUTHENTICATED', 'bad token');
  if (url === BASE + ':commit' && init.method === 'POST') {
    const { writes } = JSON.parse(init.body);
    firestore.calls.push({ commit: writes });
    if (firestore.beforeCommit) { const f = firestore.beforeCommit; firestore.beforeCommit = null; f(); }
    for (const w of writes) {
      if (!w.update.name.startsWith(NAME)) return fsErr(400, 'INVALID_ARGUMENT', 'bad name ' + w.update.name);
      const p = w.update.name.slice(NAME.length), cur = firestore.get(p), pre = w.currentDocument;
      if (pre && pre.exists === false && cur) return fsErr(409, 'ALREADY_EXISTS', 'Document already exists: ' + w.update.name);
      if (pre && pre.exists === true && !cur) return fsErr(404, 'NOT_FOUND', 'No document to update');
      if (pre && pre.updateTime && (!cur || cur.updateTime !== pre.updateTime)) return fsErr(400, 'FAILED_PRECONDITION', 'the stored version does not match the required base version');
    }
    for (const w of writes) {
      const p = w.update.name.slice(NAME.length), cur = firestore.get(p);
      let fields;
      if (w.updateMask) { fields = Object.assign({}, cur ? cur.fields : {}); for (const f of w.updateMask.fieldPaths) { if (f in w.update.fields) fields[f] = w.update.fields[f]; else delete fields[f]; } }
      else fields = w.update.fields;
      firestore.set(p, fields);
    }
    return Response.json({ writeResults: writes.map(() => ({ updateTime: firestore.stamp() })), commitTime: firestore.stamp() });
  }
  if (url.startsWith(BASE + '/') && (!init.method || init.method === 'GET')) {
    const p = url.slice(BASE.length + 1).split('?')[0];
    firestore.calls.push({ get: p });
    const d = firestore.get(p);
    if (!d) return fsErr(404, 'NOT_FOUND', 'Document not found');
    return Response.json({ name: NAME + p, fields: d.fields, createTime: d.createTime, updateTime: d.updateTime });
  }
  return fsErr(400, 'INVALID_ARGUMENT', 'unexpected firestore call ' + url);
}

async function googleTokenFetch(init) {
  const body = new URLSearchParams(init.body);
  if (body.get('grant_type') !== 'urn:ietf:params:oauth:grant-type:jwt-bearer') return Response.json({ error: 'unsupported_grant_type' }, { status: 400 });
  const [h, c, s] = body.get('assertion').split('.');
  const ok = await subtle.verify('RSASSA-PKCS1-v1_5', keys.sa.publicKey, Buffer.from(s, 'base64url'), new TextEncoder().encode(h + '.' + c));
  const claims = JSON.parse(Buffer.from(c, 'base64url'));
  const header = JSON.parse(Buffer.from(h, 'base64url'));
  if (!ok || header.alg !== 'RS256' || claims.aud !== 'https://oauth2.googleapis.com/token' || !String(claims.scope).includes('datastore') || claims.iss !== JSON.parse(keys.saJson).client_email || claims.exp - claims.iat > 3600)
    return Response.json({ error: 'invalid_grant' }, { status: 400 });
  const token = 'ya29.test-' + Math.random().toString(36).slice(2);
  firestore.tokens.add(token);
  return Response.json({ access_token: token, expires_in: 3599, token_type: 'Bearer' });
}

/* ---------------- Payme Subscribe API (+ Merchant API callbacks) ---------------- */
// Test cards from https://developer.help.paycom.uz/protokol-subscribe-api
const TEST_CARDS = {
  '8600069195406311': { ok: true }, '8600495473316478': { ok: true },
  '8600060921090842': { sms: false }, '3333336415804657': { expired: true }, '4444445987459073': { blocked: true },
  '8600143417770323': { system: true }, '8600134301849596': { payFails: true }
};
const hex24 = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');
export const payme = {
  merchant: 'aaaaaaaaaaaaaaaaaaaaaaaa', key: 'TEST-KEY-1234567890abcdefghijklmnopqr',
  billing: true,            // web kassa with Merchant API: receipts trigger callbacks to /payme
  workerFetch: null, merchantKey: null, cards: new Map(), receipts: new Map(), log: [], callbacks: [],
  async merchant_call(method, params) {
    const res = await this.workerFetch(new Request('https://pay.test/payme', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Basic ' + btoa('Paycom:' + this.merchantKey) },
      body: JSON.stringify({ id: Math.floor(Math.random() * 1e6), method, params })
    }));
    const data = await res.json();
    this.callbacks.push({ method, params, data });
    return data;
  }
};
function rpcErr(id, code, message, data) { return Response.json({ jsonrpc: '2.0', id, error: { code, message, data: data == null ? {} : data } }); }
function rpcOk(id, result) { return Response.json({ jsonrpc: '2.0', id, result }); }
async function paymeFetch(init) {
  const auth = init.headers['x-auth'] || init.headers['X-Auth'] || '';
  const req = JSON.parse(init.body), { id, method, params } = req;
  payme.log.push({ method, auth: auth.includes(':') ? 'backend' : 'frontend', params: method === 'cards.create' ? { card: { number: '****', expire: '****' } } : params });
  const [mid, mkey] = auth.split(':');
  if (mid !== payme.merchant) return rpcErr(id, -32504, 'Access denied.', 'invalid_id');
  const backendOnly = !method.startsWith('cards.') || method === 'cards.check' || method === 'cards.remove';
  if (backendOnly && mkey !== payme.key) return rpcErr(id, -32504, 'Access denied.', 'invalid_password');
  const byToken = t => [...payme.cards.values()].find(c => c.token === t && !c.removed);
  switch (method) {
    case 'cards.create': {
      const n = params.card && params.card.number, info = TEST_CARDS[n];
      if (!info) return rpcErr(id, -31300, 'Неверный номер карты.');
      if (info.expired) return rpcErr(id, -31301, 'Срок действия карты истёк.');
      if (info.blocked) return rpcErr(id, -31302, 'Карта заблокирована.');
      if (info.system) return rpcErr(id, -31001, 'Неизвестная системная ошибка.');
      const c = { number: n.slice(0, 6) + '******' + n.slice(-4), expire: '03/99', token: 'tok-' + hex24(), recurrent: params.save !== false, verify: false, info };
      payme.cards.set(c.token, c);
      return rpcOk(id, { card: { number: c.number, expire: c.expire, token: c.token, recurrent: c.recurrent, verify: false } });
    }
    case 'cards.get_verify_code': {
      const c = byToken(params.token);
      if (!c) return rpcErr(id, -31400, 'Карта не найдена.');
      if (c.info.sms === false) return rpcErr(id, -31110, 'SMS-информирование не подключено.');
      return rpcOk(id, { sent: true, phone: '99890*****31', wait: 60000 });
    }
    case 'cards.verify': {
      const c = byToken(params.token);
      if (!c) return rpcErr(id, -31400, 'Карта не найдена.');
      if (params.code !== '666666') return rpcErr(id, -31103, 'Неверный код.');
      // As in Payme's docs example, the token changes after verification.
      c.removed = true;
      const v = Object.assign({}, c, { token: 'tok-' + hex24(), verify: true, removed: false });
      payme.cards.set(v.token, v);
      return rpcOk(id, { card: { number: v.number, expire: v.expire, token: v.token, recurrent: v.recurrent, verify: true } });
    }
    case 'cards.check': { const c = byToken(params.token); return c ? rpcOk(id, { card: { number: c.number, expire: c.expire, token: c.token, recurrent: c.recurrent, verify: c.verify } }) : rpcErr(id, -31400, 'Карта не найдена.'); }
    case 'cards.remove': { const c = byToken(params.token); if (c) c.removed = true; return c ? rpcOk(id, { success: true }) : rpcErr(id, -31400, 'Карта не найдена.'); }
    case 'receipts.create': {
      if (payme.billing) {
        const r = await payme.merchant_call('CheckPerformTransaction', { amount: params.amount, account: params.account });
        if (r.error) return rpcErr(id, r.error.code, r.error.message, r.error.data);
      }
      const rc = { _id: hex24(), create_time: Date.now(), pay_time: 0, cancel_time: 0, state: 0, amount: params.amount, account: Object.entries(params.account || {}).map(([name, value]) => ({ name, value })), detail: params.detail || null, raw: params };
      payme.receipts.set(rc._id, rc);
      return rpcOk(id, { receipt: rc });
    }
    case 'receipts.pay': {
      const rc = payme.receipts.get(params.id);
      if (!rc) return rpcErr(id, -31602, 'Чек не найден.');
      if (rc.state === 4) return rpcErr(id, -31611, 'Чек уже оплачен.');
      const c = byToken(params.token);
      if (!c || !c.verify) return rpcErr(id, -31400, 'Карта не найдена.');
      if (c.info.payFails) { await new Promise(r => setTimeout(r, 200)); return rpcErr(id, -31630, 'Недостаточно средств на карте.'); }
      if (payme.billing) {
        const account = Object.fromEntries(rc.account.map(a => [a.name, a.value]));
        const txnId = hex24();
        const cr = await payme.merchant_call('CreateTransaction', { id: txnId, time: Date.now(), amount: rc.amount, account });
        if (cr.error) return rpcErr(id, cr.error.code, cr.error.message);
        if (payme.dropFirstPerform) { payme.dropFirstPerform = false; rc.state = 30; rc.txnId = txnId; rc.card = c.number; return rpcOk(id, { receipt: rc }); }
        const pr = await payme.merchant_call('PerformTransaction', { id: txnId });
        if (pr.error) { rc.state = 30; rc.txnId = txnId; return rpcOk(id, { receipt: rc }); }
        rc.txnId = txnId;
      }
      rc.state = 4; rc.pay_time = Date.now(); rc.card = c.number;
      if (payme.loseNextPayResponse) { payme.loseNextPayResponse = false; throw new TypeError('network connection lost'); }
      return rpcOk(id, { receipt: rc });
    }
    case 'receipts.check': {
      const rc = payme.receipts.get(params.id);
      if (!rc) return rpcErr(id, -31602, 'Чек не найден.');
      // A receipt stuck closing in billing finishes the next time Payme retries PerformTransaction.
      if (rc.state === 30 && payme.billing) { const pr = await payme.merchant_call('PerformTransaction', { id: rc.txnId }); if (!pr.error) rc.state = 4; }
      return rpcOk(id, { state: rc.state });
    }
    case 'receipts.cancel': { const rc = payme.receipts.get(params.id); if (!rc) return rpcErr(id, -31602, 'Чек не найден.'); rc.state = 21; return rpcOk(id, { receipt: rc }); }
    default: return rpcErr(id, -32601, 'Method not found.', method);
  }
}

/* ---------------- GitHub (private repo with the Pro tests) ---------------- */
export const github = { token: 'ghp_test', repo: 'owner/satustoz-pro-tests', files: new Map(), calls: 0 };

/* ---------------- one fetch to rule them all ---------------- */
export const net = { blocked: new Set(), log: [] };
export function installFetch() {
  globalThis.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if (typeof input !== 'string' && !init.method) init = { method: input.method, headers: Object.fromEntries(input.headers), body: await input.text() };
    const headers = init.headers instanceof Headers ? Object.fromEntries(init.headers) : (init.headers || {});
    init = Object.assign({}, init, { headers });
    const host = new URL(url).host;
    net.log.push(init.method ? init.method + ' ' + url : 'GET ' + url);
    if (net.blocked.has(host)) throw new TypeError('fetch failed (blocked in test)');
    if (url === 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
      return Response.json({ keys: [keys.firebaseJwk] }, { headers: { 'cache-control': 'public, max-age=20000' } });
    if (url === 'https://oauth2.googleapis.com/token') return googleTokenFetch(init);
    if (host === 'firestore.googleapis.com') return firestoreFetch(url, init);
    if (url === 'https://checkout.test.paycom.uz/api' || url === 'https://checkout.paycom.uz/api') { payme.lastApi = url; return paymeFetch(init); }
    if (host === 'scholarshub.academy') {
      const p = decodeURIComponent(new URL(url).pathname).replace(/^\/+/, '');
      if (p.includes('..') || !(p === 'data/catalog.json' || /^data\/tests\/[a-z0-9-]+\.json$/.test(p))) return new Response('Not found', { status: 404 });
      if (net.movedOff && p.startsWith('data/tests/') && p !== 'data/tests/practice-test-1.json') return new Response('Not found', { status: 404 });
      try { return new Response(await readFile(path.join(SITE_DIR, p)), { headers: { 'content-type': 'application/json' } }); }
      catch (e) { return new Response('Not found', { status: 404 }); }
    }
    if (host === 'api.github.com') {
      github.calls++;
      const m = new URL(url).pathname.match(/^\/repos\/([^/]+\/[^/]+)\/contents\/(.+)$/);
      if (!m || m[1] !== github.repo || headers.authorization !== 'Bearer ' + github.token) return new Response('{"message":"Not Found"}', { status: 404 });
      if (headers.accept !== 'application/vnd.github.raw+json' || !headers['user-agent']) return new Response('bad headers', { status: 400 });
      const f = github.files.get(decodeURIComponent(m[2]));
      return f ? new Response(f) : new Response('{"message":"Not Found"}', { status: 404 });
    }
    throw new Error('Unexpected network call in test: ' + url);
  };
}
