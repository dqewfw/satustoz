// End-to-end checks of worker/payments-worker.js against the local mocks.
// Run: SITE_DIR=<site> WORKER=<site>/worker/payments-worker.js node e2e.mjs
import assert from 'node:assert/strict';
import { MemoryKV, setupKeys, keys, idToken, firestore, payme, github, installFetch, clock, net, PROJECT } from './mocks.mjs';

await setupKeys();
installFetch();
const worker = (await import(process.env.WORKER)).default;

const ORIGIN = 'https://scholarshub.academy';
const DAY = 86400000;
function makeEnv(over = {}) {
  return Object.assign({
    PAYMENTS: new MemoryKV(), FIREBASE_PROJECT_ID: PROJECT, GOOGLE_SERVICE_ACCOUNT: keys.saJson,
    ALLOWED_ORIGINS: ORIGIN + ',https://www.scholarshub.academy', SITE_URL: ORIGIN, PRO_PRICE: '79 000',
    PAYME_MERCHANT_ID: payme.merchant, PAYME_TEST_KEY: payme.key, PAYME_KEY: 'PROD-KEY-not-for-tests-000000000000', PAYME_TEST: 'true',
    ADMIN_KEY: 'admin-secret'
  }, over);
}
let env = makeEnv();
const pending = [];
const ctx = { waitUntil: p => pending.push(p) };
const call = req => worker.fetch(req, env, ctx);
payme.workerFetch = call;
payme.merchantKey = payme.key;
const bodies = []; // every response body the website could see

async function api(method, path, uid, body, opts = {}) {
  const headers = { origin: opts.origin === undefined ? ORIGIN : opts.origin };
  if (uid) headers.authorization = 'Bearer ' + (opts.token || await idToken(uid, uid + '@example.com'));
  if (body) headers['content-type'] = 'application/json';
  const res = await call(new Request('https://pay.test' + path, { method, headers, body: body ? JSON.stringify(body) : undefined }));
  const text = await res.text();
  bodies.push(text);
  let data; try { data = JSON.parse(text); } catch (e) { data = text; }
  return { status: res.status, data, headers: res.headers };
}
let rpcId = 1;
async function rpc(method, params, opts = {}) {
  const headers = { 'content-type': 'application/json' };
  if (opts.auth !== false) headers.authorization = 'Basic ' + btoa((opts.login || 'Paycom') + ':' + (opts.key || payme.key));
  if (opts.ip) headers['cf-connecting-ip'] = opts.ip;
  const id = rpcId++;
  const res = await call(new Request('https://pay.test/payme', { method: opts.method || 'POST', headers, body: opts.raw !== undefined ? opts.raw : (opts.method === 'GET' ? undefined : JSON.stringify({ method, params, id })) }));
  assert.equal(res.status, 200, 'Merchant API must always answer HTTP 200');
  const data = await res.json();
  if (opts.raw === undefined && opts.method !== 'GET') assert.equal(data.id, id);
  return data;
}
async function cron() { await worker.scheduled({ cron: '0 4 * * *', scheduledTime: Date.now() }, env, ctx); await Promise.all(pending.splice(0)); }
const user = uid => firestore.get('users/' + uid);
const untilOf = uid => { const u = user(uid); return u && u.fields.planUntil ? Date.parse(u.fields.planUntil.timestampValue) : 0; };
const near = (a, b, ms = 5000) => Math.abs(a - b) <= ms;
const orderOf = url => Buffer.from(url.split('/').pop(), 'base64').toString().match(/ac\.order_id=([A-Z0-9]+)/)[1];
const kvJson = async k => JSON.parse(await env.PAYMENTS.get(k));
const hex24 = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n       ')); }
}
const AMOUNT = 7900000; // 79 000 so'm in tiyin

console.log('\nWebsite endpoints: access');
await test('CORS preflight answers for the site', async () => {
  const r = await call(new Request('https://pay.test/checkout', { method: 'OPTIONS', headers: { origin: ORIGIN } }));
  assert.equal(r.status, 204); assert.equal(r.headers.get('access-control-allow-origin'), ORIGIN);
});
await test('other sites are refused', async () => { assert.equal((await api('POST', '/checkout', 'stuA', {}, { origin: 'https://evil.example' })).status, 403); });
await test('no token, wrong project, expired token: 401', async () => {
  assert.equal((await api('POST', '/checkout', null, {})).status, 401);
  assert.equal((await api('POST', '/checkout', 'stuA', {}, { token: await idToken('stuA', 'a@x', { project: 'other' }) })).status, 401);
  assert.equal((await api('POST', '/checkout', 'stuA', {}, { token: await idToken('stuA', 'a@x', { ttl: -10 }) })).status, 401);
  assert.equal((await api('POST', '/checkout', 'stuA', {}, { token: await idToken('stuA', 'a@x', { kid: 'unknown' }) })).status, 401);
});
await test('unknown path: 404', async () => { assert.equal((await api('POST', '/nope', 'stuA', {})).status, 404); });

console.log('\n/checkout: Payme checkout URL');
let orderA;
await test('returns a test.paycom.uz URL carrying the order and the Pro price', async () => {
  const r = await api('POST', '/checkout', 'stuA', { lang: 'ru' });
  assert.equal(r.status, 200);
  assert.equal(r.data.amount, 79000); assert.equal(r.data.card, true);
  assert.ok(r.data.url.startsWith('https://test.paycom.uz/'));
  orderA = orderOf(r.data.url);
  assert.equal(Buffer.from(r.data.url.split('/').pop(), 'base64').toString(), 'm=' + payme.merchant + ';ac.order_id=' + orderA + ';a=' + AMOUNT + ';l=ru;c=https://scholarshub.academy/practice.html?paid#plans');
  const order = await kvJson('order:' + orderA);
  assert.equal(order.uid, 'stuA'); assert.equal(order.amount, AMOUNT); assert.equal(order.state, 'new');
});

console.log('\nPayme sandbox, scenario 1: create and cancel an unconfirmed transaction');
const T1 = hex24(), T2 = hex24();
await test('wrong login/password: -32504 on every method', async () => {
  for (const m of ['CheckPerformTransaction', 'CreateTransaction', 'PerformTransaction', 'CancelTransaction', 'CheckTransaction', 'GetStatement'])
    assert.equal((await rpc(m, { id: T1, time: Date.now(), amount: AMOUNT, account: { order_id: orderA }, reason: 1, from: 0, to: Date.now() }, { key: 'wrong-key' })).error.code, -32504);
  assert.equal((await rpc('CheckPerformTransaction', { amount: AMOUNT, account: { order_id: orderA } }, { auth: false })).error.code, -32504);
});
await test('JSON-RPC protocol errors: -32300, -32700, -32600, -32601', async () => {
  assert.equal((await rpc('x', {}, { method: 'GET' })).error.code, -32300);
  assert.equal((await rpc('x', {}, { raw: '{not json' })).error.code, -32700);
  assert.equal((await rpc('x', {}, { raw: JSON.stringify({ id: 1, method: 'CheckTransaction' }) })).error.code, -32600);
  const r = await rpc('ChangePassword', { password: 'x' });
  assert.equal(r.error.code, -32601); assert.equal(r.error.data, 'ChangePassword');
});
await test('wrong amount: -31001 from CheckPerformTransaction and CreateTransaction', async () => {
  assert.equal((await rpc('CheckPerformTransaction', { amount: AMOUNT + 100, account: { order_id: orderA } })).error.code, -31001);
  assert.equal((await rpc('CreateTransaction', { id: hex24(), time: Date.now(), amount: 100, account: { order_id: orderA } })).error.code, -31001);
});
await test('non-existent account: -31050 with data "order_id" and a localized message', async () => {
  const r = await rpc('CheckPerformTransaction', { amount: AMOUNT, account: { order_id: 'NOSUCHORDER' } });
  assert.equal(r.error.code, -31050); assert.equal(r.error.data, 'order_id'); assert.ok(r.error.message.ru && r.error.message.uz && r.error.message.en);
  assert.equal((await rpc('CreateTransaction', { id: hex24(), time: Date.now(), amount: AMOUNT, account: {} })).error.code, -31050);
});
await test('CheckPerformTransaction: allow', async () => { assert.deepEqual((await rpc('CheckPerformTransaction', { amount: AMOUNT, account: { order_id: orderA } })).result, { allow: true }); });
let t1create;
await test('CreateTransaction, then the same call again gives the same answer', async () => {
  const time = Date.now();
  const a = await rpc('CreateTransaction', { id: T1, time, amount: AMOUNT, account: { order_id: orderA } });
  assert.equal(a.result.state, 1); assert.ok(a.result.transaction); assert.ok(String(a.result.create_time).length === 13);
  const b = await rpc('CreateTransaction', { id: T1, time, amount: AMOUNT, account: { order_id: orderA } });
  assert.deepEqual(b.result, a.result);
  t1create = a.result;
});
await test('CheckTransaction after create', async () => {
  const r = (await rpc('CheckTransaction', { id: T1 })).result;
  assert.deepEqual(r, { create_time: t1create.create_time, perform_time: 0, cancel_time: 0, transaction: t1create.transaction, state: 1, reason: null });
});
await test('a second transaction for the same waiting order: -31008', async () => {
  assert.equal((await rpc('CreateTransaction', { id: T2, time: Date.now(), amount: AMOUNT, account: { order_id: orderA } })).error.code, -31008);
  assert.equal((await rpc('CheckPerformTransaction', { amount: AMOUNT, account: { order_id: orderA } })).error.code, -31099);
});
await test('CancelTransaction on the unconfirmed transaction, twice, then CheckTransaction', async () => {
  const a = (await rpc('CancelTransaction', { id: T1, reason: 3 })).result;
  assert.equal(a.state, -1); assert.ok(a.cancel_time > 0);
  assert.deepEqual((await rpc('CancelTransaction', { id: T1, reason: 3 })).result, a);
  const c = (await rpc('CheckTransaction', { id: T1 })).result;
  assert.equal(c.state, -1); assert.equal(c.reason, 3);
  assert.equal((await rpc('PerformTransaction', { id: T1 })).error.code, -31008);
  assert.equal(user('stuA'), null, 'no plan for a cancelled payment');
});
await test('unknown transaction: -31003 from Perform, Cancel and Check', async () => {
  for (const m of ['PerformTransaction', 'CancelTransaction', 'CheckTransaction']) assert.equal((await rpc(m, { id: hex24(), reason: 1 })).error.code, -31003);
});
await test('after a cancel the order can be paid again (CheckPerformTransaction allows)', async () => {
  assert.deepEqual((await rpc('CheckPerformTransaction', { amount: AMOUNT, account: { order_id: orderA } })).result, { allow: true });
});

console.log('\nPayme sandbox, scenario 2: create, perform, cancel a confirmed transaction');
const T3 = hex24();
let orderA2, t3perform;
await test('perform: users/stuA gets plan pro, planUntil +30 days, planSource payme', async () => {
  orderA2 = orderOf((await api('POST', '/checkout', 'stuA', {})).data.url);
  assert.equal((await rpc('CheckPerformTransaction', { amount: AMOUNT, account: { order_id: orderA2 } })).result.allow, true);
  assert.equal((await rpc('CreateTransaction', { id: T3, time: Date.now(), amount: AMOUNT, account: { order_id: orderA2 } })).result.state, 1);
  const p = (await rpc('PerformTransaction', { id: T3 })).result;
  assert.equal(p.state, 2); assert.ok(p.perform_time > 0);
  t3perform = p;
  const u = user('stuA').fields;
  assert.equal(u.plan.stringValue, 'pro'); assert.equal(u.planSource.stringValue, 'payme');
  assert.ok(near(untilOf('stuA'), Date.now() + 30 * DAY));
  const pay = firestore.get('payments/' + orderA2).fields;
  assert.equal(pay.uid.stringValue, 'stuA'); assert.equal(pay.amount.integerValue, '79000'); assert.equal(pay.revoked.booleanValue, false);
});
await test('PerformTransaction again: same answer, Pro not extended twice', async () => {
  const before = untilOf('stuA');
  assert.deepEqual((await rpc('PerformTransaction', { id: T3 })).result, t3perform);
  assert.equal(untilOf('stuA'), before);
  assert.equal((await rpc('CheckTransaction', { id: T3 })).result.state, 2);
  assert.equal((await rpc('CheckPerformTransaction', { amount: AMOUNT, account: { order_id: orderA2 } })).error.code, -31051);
});
await test('Pro tests open for stuA through /test; a Free student gets 403; free tests open for everyone', async () => {
  const r = await api('GET', '/test?id=practice-test-4', 'stuA');
  assert.equal(r.status, 200); assert.ok(Array.isArray(r.data.sections) && r.data.sections.length === 2);
  assert.equal(r.headers.get('cache-control'), 'private, no-store');
  assert.equal(r.headers.get('access-control-allow-origin'), ORIGIN);
  const b = await api('GET', '/test?id=practice-test-4', 'stuB');
  assert.equal(b.status, 403); assert.equal(b.data.code, 'plan');
  assert.equal((await api('GET', '/test?id=practice-test-1', 'stuB')).status, 200);
  assert.equal((await api('GET', '/test?id=../../etc', 'stuA')).status, 404);
  assert.equal((await api('GET', '/test?id=no-such-test', 'stuA')).status, 404);
});
await test('CancelTransaction after perform (refund): state -2, the month is taken back', async () => {
  const a = (await rpc('CancelTransaction', { id: T3, reason: 5 })).result;
  assert.equal(a.state, -2);
  assert.deepEqual((await rpc('CancelTransaction', { id: T3, reason: 5 })).result, a);
  assert.ok(untilOf('stuA') <= Date.now() + 5000, 'planUntil moved back');
  assert.equal(firestore.get('payments/' + orderA2).fields.revoked.booleanValue, true);
  const c = (await rpc('CheckTransaction', { id: T3 })).result;
  assert.equal(c.state, -2); assert.equal(c.reason, 5); assert.ok(c.perform_time > 0 && c.cancel_time > 0);
});
await test('after the refund: never-opened Pro tests are locked, a test opened while on Pro stays open for review', async () => {
  assert.equal((await api('GET', '/test?id=practice-test-5', 'stuA')).status, 403);
  assert.equal((await api('GET', '/test?id=practice-test-4', 'stuA')).status, 200);
});
await test('GetStatement lists created transactions in time order, not the refused one', async () => {
  const r = (await rpc('GetStatement', { from: Date.now() - DAY, to: Date.now() + 1000 })).result.transactions;
  assert.deepEqual(r.map(t => t.id), [T1, T3]);
  assert.equal(r[0].state, -1); assert.equal(r[1].state, -2); assert.equal(r[1].amount, AMOUNT);
  assert.deepEqual(r[1].account, { order_id: orderA2 });
  for (const k of ['id', 'time', 'amount', 'account', 'create_time', 'perform_time', 'cancel_time', 'transaction', 'state', 'reason', 'receivers']) assert.ok(k in r[1], k);
  assert.deepEqual((await rpc('GetStatement', { from: Date.now() - 10 * DAY, to: Date.now() - 9 * DAY })).result.transactions, []);
});
await test('12-hour timeout: an old CreateTransaction is refused; an expired one is cancelled with reason 4', async () => {
  const o = orderOf((await api('POST', '/checkout', 'stuA', {})).data.url);
  assert.equal((await rpc('CreateTransaction', { id: hex24(), time: Date.now() - 13 * 3600000, amount: AMOUNT, account: { order_id: o } })).error.code, -31008);
  const T5 = hex24();
  assert.equal((await rpc('CreateTransaction', { id: T5, time: Date.now(), amount: AMOUNT, account: { order_id: o } })).result.state, 1);
  clock.advance(12 * 3600000 + 60000);
  assert.equal((await rpc('PerformTransaction', { id: T5 })).error.code, -31008);
  const c = (await rpc('CheckTransaction', { id: T5 })).result;
  assert.equal(c.state, -1); assert.equal(c.reason, 4);
});
await test('SetFiscalData is accepted and stored', async () => {
  const r = await rpc('SetFiscalData', { id: T3, type: 'PERFORM', fiscal_data: { receipt_id: 121, status_code: 0, terminal_id: 'EP1', fiscal_sign: '8000', qr_code_url: 'u', date: '20261017' } });
  assert.deepEqual(r.result, { success: true });
  assert.equal((await kvJson('fiscal:' + T3)).perform_data.receipt_id, 121);
});

console.log('\nCard payment, renews monthly (Subscribe API, web kassa with Merchant API callbacks)');
payme.callbacks.length = 0;
let orderC, subC;
await test('card form input checks and Payme card errors come back readable', async () => {
  orderC = (await api('POST', '/checkout', 'stuC', {})).data.orderId;
  let r = await api('POST', '/card/start', 'stuC', { orderId: orderC, number: '1234', expire: '0399' });
  assert.equal(r.status, 400); assert.equal(r.data.code, 'card');
  r = await api('POST', '/card/start', 'stuC', { orderId: orderC, number: '8600069195406311', expire: '1399' });
  assert.equal(r.data.code, 'expire');
  r = await api('POST', '/card/start', 'stuC', { orderId: orderC, number: '3333 3364 1580 4657', expire: '03/99' });
  assert.equal(r.status, 400); assert.match(r.data.error, /^Payme: Срок действия карты истёк/);
  r = await api('POST', '/card/start', 'stuB', { orderId: orderC, number: '8600069195406311', expire: '0399' });
  assert.equal(r.status, 409, 'another student cannot use this order');
});
await test('card start: Payme sends the SMS; the card token never reaches the browser', async () => {
  const r = await api('POST', '/card/start', 'stuC', { orderId: orderC, number: '8600 0691 9540 6311', expire: '03/99' });
  assert.equal(r.status, 200); assert.deepEqual(Object.keys(r.data).sort(), ['phone', 'wait']); assert.equal(r.data.phone, '99890*****31');
  assert.ok((await kvJson('pending:stuC')).token.startsWith('tok-'));
  const create = payme.log.find(l => l.method === 'cards.create');
  assert.equal(create.auth, 'frontend', 'cards.create uses X-Auth with the kassa ID only');
});
await test('wrong SMS code is refused, the right one pays and saves the card', async () => {
  let r = await api('POST', '/card/verify', 'stuC', { code: '123456' });
  assert.equal(r.status, 400); assert.match(r.data.error, /Неверный код/);
  r = await api('POST', '/card/verify', 'stuC', { code: '666666' });
  assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.state, 'paid'); assert.equal(r.data.card, '860006******6311');
  assert.ok(near(r.data.until, Date.now() + 30 * DAY));
  assert.deepEqual(payme.callbacks.map(c => c.method), ['CheckPerformTransaction', 'CreateTransaction', 'PerformTransaction']);
  assert.ok(payme.callbacks.every(c => c.data.result), 'every Merchant API callback succeeded');
  subC = await kvJson('sub:stuC');
  const verifiedTokens = [...payme.cards.values()].filter(c => c.verify && !c.removed).map(c => c.token);
  assert.ok(verifiedTokens.includes(subC.token), 'keeps the new token returned by cards.verify');
  assert.equal(subC.status, 'active'); assert.equal(await env.PAYMENTS.get('pending:stuC'), null);
});
await test('Merchant API and receipt both report the payment, Pro is extended once', async () => {
  assert.ok(near(untilOf('stuC'), Date.now() + 30 * DAY));
  const pays = [...firestore.docs.keys()].filter(k => k.startsWith('payments/') && firestore.get(k).fields.uid.stringValue === 'stuC');
  assert.equal(pays.length, 1);
  assert.equal(firestore.get(pays[0]).fields.kind.stringValue, 'card');
  const rc = [...payme.receipts.values()].pop();
  assert.equal(rc.raw.account.order_id, orderC); assert.equal(rc.amount, AMOUNT);
  assert.ok(payme.log.filter(l => l.method.startsWith('receipts.')).every(l => l.auth === 'backend'));
});
await test('/status shows the plan and auto-renewal', async () => {
  const r = (await api('POST', '/status', 'stuC', {})).data;
  assert.equal(r.plan, 'pro'); assert.equal(r.source, 'payme'); assert.ok(near(r.until, untilOf('stuC'), 1));
  assert.deepEqual(r.renew, { card: '860006******6311', amount: 79000, pending: false });
});

console.log('\nCard payment on a virtual-terminal kassa (no Merchant API callbacks)');
await test('the receipt alone switches Pro on', async () => {
  payme.billing = false; payme.callbacks.length = 0;
  const o = (await api('POST', '/checkout', 'stuD', {})).data.orderId;
  assert.equal((await api('POST', '/card/start', 'stuD', { orderId: o, number: '8600495473316478', expire: '0399' })).status, 200);
  const r = await api('POST', '/card/verify', 'stuD', { code: '666666' });
  assert.equal(r.data.state, 'paid'); assert.equal(payme.callbacks.length, 0);
  assert.equal(user('stuD').fields.plan.stringValue, 'pro'); assert.ok(near(untilOf('stuD'), Date.now() + 30 * DAY));
  payme.billing = true;
});
await test('a card declined at payment: clear error, no plan, card removed at Payme, no auto-renewal', async () => {
  const o = (await api('POST', '/checkout', 'stuE', {})).data.orderId;
  assert.equal((await api('POST', '/card/start', 'stuE', { orderId: o, number: '8600134301849596', expire: '0399' })).status, 200);
  const r = await api('POST', '/card/verify', 'stuE', { code: '666666' });
  assert.equal(r.status, 402); assert.equal(r.data.code, 'declined'); assert.match(r.data.error, /Недостаточно средств/);
  assert.equal(user('stuE'), null); assert.equal(await env.PAYMENTS.get('sub:stuE'), null);
  assert.ok([...payme.cards.values()].filter(c => c.info.payFails).every(c => c.removed));
  assert.equal((await kvJson('order:' + o)).state, 'failed');
});
await test('a slow Payme (receipt still closing) settles by polling receipts.check', async () => {
  payme.dropFirstPerform = true;
  const o = (await api('POST', '/checkout', 'stuF', {})).data.orderId;
  await api('POST', '/card/start', 'stuF', { orderId: o, number: '8600069195406311', expire: '0399' });
  const r = await api('POST', '/card/verify', 'stuF', { code: '666666' });
  assert.equal(r.data.state, 'paid'); assert.ok(near(untilOf('stuF'), Date.now() + 30 * DAY));
});

console.log('\nMonthly renewal (Cron Trigger)');
await test('nothing is charged while the month still has more than a day left', async () => {
  const n = payme.receipts.size;
  await cron();
  assert.equal(payme.receipts.size, n);
});
let untilBefore;
await test('a day before planUntil the saved card is charged and Pro moves 30 days on', async () => {
  untilBefore = untilOf('stuC');
  clock.advance(untilBefore - Date.now() - 10 * 3600000);
  // A student's browser saving progress right before the Worker writes: the Worker must retry, not overwrite.
  firestore.beforeCommit = () => { const u = user('stuC'); firestore.set('users/stuC', Object.assign({}, u.fields, { lastSeenAt: { timestampValue: new Date().toISOString() } })); };
  payme.callbacks.length = 0;
  await cron();
  assert.equal(untilOf('stuC'), untilBefore + 30 * DAY);
  assert.ok(user('stuC').fields.lastSeenAt, 'the student write survived');
  const sub = await kvJson('sub:stuC');
  assert.equal(sub.until, untilBefore + 30 * DAY); assert.equal(sub.failures, 0);
  // Every saved card is due today in this simulation; each charge went through the Merchant API.
  assert.ok(payme.callbacks.length >= 3 && payme.callbacks.length % 3 === 0 && payme.callbacks.every(c => c.data.result));
  const renewals = [...firestore.docs.keys()].filter(k => k.startsWith('payments/') && firestore.get(k).fields.kind.stringValue === 'renewal');
  assert.ok(renewals.length >= 1);
});
await test('running the cron again does not charge twice', async () => {
  const n = payme.receipts.size;
  await cron();
  assert.equal(payme.receipts.size, n);
  assert.equal(untilOf('stuC'), untilBefore + 30 * DAY);
});
await test('a lost answer from receipts.pay is settled on the next run (no double charge)', async () => {
  const subs = ['stuC', 'stuD', 'stuF'];
  const u0 = Object.fromEntries(subs.map(u => [u, untilOf(u)]));
  clock.advance(Math.min(...Object.values(u0)) - Date.now() - 10 * 3600000);
  payme.loseNextPayResponse = true;
  const n = payme.receipts.size;
  await cron();
  const states = await Promise.all(subs.map(u => kvJson('sub:' + u)));
  const lost = subs.filter((u, i) => states[i].pendingOrder);
  assert.equal(lost.length, 1, 'exactly one charge lost its answer and is kept as pending');
  assert.equal(payme.receipts.size, n + subs.length, 'one receipt per student');
  await cron();
  const after = await kvJson('sub:' + lost[0]);
  assert.equal(after.pendingOrder, null);
  assert.equal(payme.receipts.size, n + subs.length, 'no second receipt for the pending one');
  for (const u of subs) assert.equal(untilOf(u), u0[u] + 30 * DAY, u + ' extended exactly once');
});
await test('admin endpoints need ADMIN_KEY', async () => {
  assert.equal((await call(new Request('https://pay.test/admin/renew'))).status, 404);
  assert.equal((await call(new Request('https://pay.test/admin/renew?key=wrong'))).status, 404);
  const r = await call(new Request('https://pay.test/admin/sub?uid=stuC', { headers: { 'x-admin-key': 'admin-secret' } }));
  const d = await r.json();
  assert.equal(d.sub.token, '(saved)'); assert.equal(d.plan, 'pro');
});

console.log('\nLapse when the renewal charge fails');
await test('failed charges leave the plan alone; Pro ends at planUntil; auto-renewal stops after 3 tries', async () => {
  const d = await (await call(new Request('https://pay.test/admin/drop-card?key=admin-secret&uid=stuC'))).json();
  assert.equal(d.ok, true);
  const until = untilOf('stuC');
  clock.advance(until - Date.now() - 10 * 3600000);
  await cron();
  let sub = await kvJson('sub:stuC');
  assert.equal(sub.failures, 1); assert.equal(sub.status, 'active'); assert.match(sub.lastError, /Карта не найдена/);
  assert.equal(untilOf('stuC'), until, 'plan not touched');
  const n = payme.receipts.size;
  await cron();
  assert.equal(payme.receipts.size, n, 'one try per day');
  clock.advance(DAY);
  assert.ok(Date.now() > until, 'Pro has lapsed');
  assert.equal((await api('GET', '/test?id=practice-test-6', 'stuC')).status, 403, 'lapsed: Pro test locked');
  await cron();
  assert.equal((await kvJson('sub:stuC')).failures, 2);
  clock.advance(DAY);
  await cron();
  sub = await kvJson('sub:stuC');
  assert.equal(sub.failures, 3); assert.equal(sub.status, 'stopped'); assert.equal(sub.token, null);
  const m = payme.receipts.size;
  clock.advance(DAY);
  await cron();
  assert.equal(payme.receipts.size, m, 'no more charges after it stopped');
  const s = (await api('POST', '/status', 'stuC', {})).data;
  assert.equal(s.renew, null); assert.ok(s.until < Date.now());
});

console.log('\nStopping auto-renewal');
await test('/cancel removes the card at Payme and stops renewals; Pro stays until planUntil', async () => {
  const sub = await kvJson('sub:stuF');
  const u = untilOf('stuF');
  assert.deepEqual((await api('POST', '/cancel', 'stuF', {})).data, { ok: true });
  assert.equal(await env.PAYMENTS.get('sub:stuF'), null);
  assert.ok([...payme.cards.values()].find(c => c.token === sub.token).removed);
  assert.equal(untilOf('stuF'), u);
});

console.log('\nLimits');
await test('card form: 8 tries a day per student', async () => {
  const o = (await api('POST', '/checkout', 'stuG', {})).data.orderId;
  let last;
  for (let i = 0; i < 9; i++) last = await api('POST', '/card/start', 'stuG', { orderId: o, number: '4444445987459073', expire: '0399' });
  assert.equal(last.status, 429);
});

console.log('\nPro tests from a private GitHub repo (files moved off GitHub Pages)');
await test('served from the repo with the token; public copies gone', async () => {
  net.movedOff = true;
  env = makeEnv({ PRO_TESTS_REPO: github.repo, PRO_TESTS_DIR: 'tests', GITHUB_TOKEN: github.token, PAYMENTS: env.PAYMENTS });
  github.files.set('tests/practice-test-7.json', JSON.stringify({ title: 'Practice Test 7 (from private repo)', sections: [] }));
  // stuD still has Pro (renewed above).
  const r = await api('GET', '/test?id=practice-test-7', 'stuD');
  assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.title, 'Practice Test 7 (from private repo)');
  assert.equal(github.calls, 1);
  assert.equal((await api('GET', '/test?id=practice-test-7', 'stuD')).status, 200); assert.equal(github.calls, 1, 'cached');
  assert.equal((await api('GET', '/test?id=practice-test-8', 'stuD')).status, 502, 'missing everywhere');
  net.movedOff = false;
});

console.log('\nGoing live and hardening');
await test('PAYME_TEST=false: checkout.paycom.uz, and only the real key is accepted', async () => {
  env = makeEnv({ PAYME_TEST: 'false', PAYME_KEY: payme.key, PAYME_TEST_KEY: 'old-test-key', PAYMENTS: env.PAYMENTS });
  const r = await api('POST', '/checkout', 'stuH', {});
  assert.ok(r.data.url.startsWith('https://checkout.paycom.uz/'));
  assert.equal((await rpc('CheckPerformTransaction', { amount: AMOUNT, account: { order_id: r.data.orderId } }, { key: 'old-test-key' })).error.code, -32504);
  assert.equal((await rpc('CheckPerformTransaction', { amount: AMOUNT, account: { order_id: r.data.orderId } })).result.allow, true);
  await api('POST', '/card/start', 'stuH', { orderId: r.data.orderId, number: '8600069195406311', expire: '0399' });
  assert.equal(payme.lastApi, 'https://checkout.paycom.uz/api');
});
await test('PAYME_IP_CHECK=true: only Payme’s addresses get through', async () => {
  env = makeEnv({ PAYME_IP_CHECK: 'true', PAYMENTS: env.PAYMENTS });
  assert.equal((await rpc('GetStatement', { from: 1, to: 2 }, { ip: '203.0.113.9' })).error.code, -32504);
  assert.ok((await rpc('GetStatement', { from: 1, to: 2 }, { ip: '185.234.113.7' })).result);
});
await test('fiscal details (IKPU) go into CheckPerformTransaction and receipts.create', async () => {
  env = makeEnv({ PAYME_IKPU: '10399002001000000', PAYME_PACKAGE_CODE: '1501270', PAYME_VAT_PERCENT: '12', PAYMENTS: env.PAYMENTS });
  const o = (await api('POST', '/checkout', 'stuI', {})).data.orderId;
  const d = (await rpc('CheckPerformTransaction', { amount: AMOUNT, account: { order_id: o } })).result.detail;
  assert.deepEqual(d, { receipt_type: 0, items: [{ title: 'SAT Ustoz Pro (1 month)', price: AMOUNT, count: 1, code: '10399002001000000', package_code: '1501270', vat_percent: 12 }] });
  await api('POST', '/card/start', 'stuI', { orderId: o, number: '8600069195406311', expire: '0399' });
  await api('POST', '/card/verify', 'stuI', { code: '666666' });
  assert.equal([...payme.receipts.values()].pop().raw.detail.items[0].code, '10399002001000000');
});
await test('not configured: friendly 503 instead of a crash', async () => {
  env = makeEnv({ PAYME_MERCHANT_ID: '' });
  assert.equal((await api('POST', '/checkout', 'stuJ', {})).status, 503);
  env = makeEnv({ PAYMENTS: undefined });
  assert.equal((await api('POST', '/status', 'stuJ', {})).status, 503);
});
await test('no response ever contained a card token or card number', async () => {
  const all = bodies.join('\n');
  assert.ok(!/tok-[0-9a-f]{24}/.test(all), 'token leaked');
  assert.ok(!/8600069195406311|8600495473316478/.test(all), 'card number leaked');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
