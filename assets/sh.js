/* ==========================================================================
   SAT Ustoz · SAT Practice — shared core
   Loaded by practice.html, test.html and builder.html (after KaTeX).
   ========================================================================== */
(function () {
  'use strict';
  const SCRIPT = document.currentScript; // its data-analytics attribute switches analytics on for the page

  /* ------------------------------------------------------------------
     SETTINGS — the only part of this file you normally edit
     ------------------------------------------------------------------ */
  const CONFIG = {
    // Paste your Cloudflare Worker URL here (see worker/ai-worker.js).
    // Leave empty and the AI features show a friendly "not switched on" note.
    // Example: 'https://satustoz-ai.yourname.workers.dev'
    AI_ENDPOINT: '',

    // The College Board version of the Desmos graphing calculator, the same
    // one Bluebook uses. No key needed. If Desmos ever moves it, change this
    // to 'https://www.desmos.com/calculator'.
    DESMOS_URL: 'https://www.desmos.com/testing/cb-digital-sat/graphing',

    // Google sign-in (Firebase). Paste the config object from
    // Firebase console -> Project settings -> Your apps -> Web app.
    // These values are meant to be public; security comes from the
    // Firestore rules in firestore.rules. Leave apiKey empty and the site
    // works exactly as before, with no sign-in anywhere.
    FIREBASE: {
      apiKey: 'AIzaSyAAxqdRhKtMr7Iwloe75MaMtFbTQFt4wxY',
      authDomain: 'satustoz.firebaseapp.com',
      projectId: 'satustoz',
      appId: '1:1096969960371:web:64454d3b4101a3170a69c6'
    },
    // true = students must sign in before practicing or taking tests.
    // false = anyone can practice; signing in saves progress across devices.
    REQUIRE_LOGIN: false,
    // true = the AI tutor and AI questions need a signed-in student
    // (recommended: it stops strangers from spending your AI budget).
    AI_REQUIRES_LOGIN: true,

    // Product analytics with PostHog (README "7. Analytics"): which pages
    // students visit and where they stop on the way to Pro. KEY is the Project
    // API key from PostHog -> Project settings (starts with phc_, meant to be
    // public). HOST is where your project lives: 'https://eu.i.posthog.com'
    // (EU cloud) or 'https://us.i.posthog.com' (US cloud).
    // Leave KEY empty and nothing is tracked or loaded.
    ANALYTICS: {
      KEY: 'phc_kxKGXFqUGtjpBJ26Kf5HsNprEQpGzSBBhH3zzU42Jej6',
      HOST: 'https://eu.i.posthog.com'
    },

    // Plans shown on the pricing section (index.html#pricing, practice.html#plans).
    // Prices are shown exactly as written; replace these placeholders with your own.
    // Which tests each plan opens is the "plan" field on each test in data/catalog.json.
    // A student's plan lives on their account (Firestore users/<uid>: plan, planUntil);
    // see README, "Plans and payments".
    PLANS: {
      CURRENCY: { en: 'so’m', uz: 'soʻm', ru: 'сум' },
      PRO_PRICE: '79 000',
      MAX_PRICE: '149 000',
      // "Until your test" pass: PASS_MONTHS of Pro for PASS_PRICE, offered next to
      // the monthly price while payment is by card transfer (MANUAL_PAY).
      // Empty PASS_PRICE hides it.
      PASS_MONTHS: 3,
      PASS_PRICE: '197 500',
      // The day Free changed: Tests 2 and 3 moved to Pro, and the skill breakdown,
      // question review and skill drills became Pro. Students who used the site
      // before this day (Tashkent time) keep Tests 2 and 3, and the full results
      // of tests they finished before it. Set it to the day you upload this version.
      FREE_CHANGED_AT: '2026-10-19'
    },

    // Online payment with Payme. Paste your payments Worker URL here
    // (see worker/payments-worker.js and README "6. Plans and payments").
    // Empty: "Upgrade to Pro" uses MANUAL_PAY below (or, without a card there,
    // the Telegram steps). Set: students pay by card or on Payme's page, Pro
    // switches on by itself, and Pro tests load through the Worker. MANUAL_PAY
    // is then ignored.
    // Example: 'https://satustoz-pay.yourname.workers.dev'
    PAYMENTS_ENDPOINT: '',

    // Pro tests through the payments Worker before Payme is ready (README
    // "Moving the Pro tests off GitHub Pages"). Paste the Worker URL here and
    // Tests 4 to 10 load through it, only for students whose plan opens them,
    // while "Upgrade to Pro" keeps using MANUAL_PAY.
    // Empty: same as PAYMENTS_ENDPOINT. With both empty, every test loads from
    // data/tests/ and anyone can download Tests 4 to 10.
    TESTS_ENDPOINT: '',

    // Payment by card transfer, checked by you (README "Payment by card transfer").
    // Fill CARD and "Upgrade to Pro" shows this card and the Pro price, then asks
    // the student for the last 4 digits of their card and the receipt. You match
    // it in your bank app and switch Pro on in Firebase.
    // Leave CARD empty to keep the "message us on Telegram" steps.
    MANUAL_PAY: {
      CARD: '9860 3501 4987 8463',          // Uzcard or Humo card number
      CARD_HOLDER: "Azizbek To'rabayev"     // name as the bank app shows it
    },

    CONTACT_TELEGRAM: 'https://t.me/azizbek7_t',
    CHANNEL_TELEGRAM: 'https://t.me/satustoz_off',
    INSTAGRAM: 'https://www.instagram.com/satustoz',
    PHONE: '+998 97 055 00 33',
    CATALOG_URL: 'data/catalog.json'
  };

  /* ------------------------------------------------------------------
     Official content-domain taxonomy (structure of the digital SAT)
     ------------------------------------------------------------------ */
  const TAXONOMY = {
    rw: {
      label: 'Reading and Writing',
      domains: {
        'Information and Ideas': ['Central Ideas and Details', 'Command of Evidence: Textual', 'Command of Evidence: Quantitative', 'Inferences'],
        'Craft and Structure': ['Words in Context', 'Text Structure and Purpose', 'Cross-Text Connections'],
        'Expression of Ideas': ['Rhetorical Synthesis', 'Transitions'],
        'Standard English Conventions': ['Boundaries', 'Form, Structure, and Sense']
      }
    },
    math: {
      label: 'Math',
      domains: {
        'Algebra': ['Linear equations in one variable', 'Linear functions', 'Linear equations in two variables', 'Systems of two linear equations in two variables', 'Linear inequalities in one or two variables'],
        'Advanced Math': ['Nonlinear functions', 'Nonlinear equations in one variable and systems of equations in two variables', 'Equivalent expressions'],
        'Problem-Solving and Data Analysis': ['Ratios, rates, proportional relationships, and units', 'Percentages', 'One-variable data: distributions and measures of center and spread', 'Two-variable data: models and scatterplots', 'Probability and conditional probability', 'Inference from sample statistics and margin of error', 'Evaluating statistical claims: observational studies and experiments'],
        'Geometry and Trigonometry': ['Area and volume', 'Lines, angles, and triangles', 'Right triangles and trigonometry', 'Circles']
      }
    }
  };
  function domainOf(section, skill) {
    const d = TAXONOMY[section] && TAXONOMY[section].domains;
    if (!d) return '';
    for (const k in d) if (d[k].indexOf(skill) > -1) return k;
    return '';
  }

  /* ------------------------------------------------------------------
     Storage (never throws; falls back to memory in private mode)
     ------------------------------------------------------------------ */
  const PREFIX = 'sh.v1.';
  const SYNCED_KEYS = ['attempts', 'testHistory', 'profile'];
  const hooks = { change: null };
  function onLocalChange(key) { if (hooks.change) hooks.change(key); }
  const mem = {};
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(PREFIX + key);
        return raw == null ? (key in mem ? mem[key] : fallback) : JSON.parse(raw);
      } catch (e) { return key in mem ? mem[key] : fallback; }
    },
    set(key, value) {
      mem[key] = value;
      let ok = true;
      try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { ok = false; }
      if (SYNCED_KEYS.indexOf(key) > -1) onLocalChange(key);
      return ok;
    },
    del(key) {
      delete mem[key];
      try { localStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ }
    }
  };

  /* ------------------------------------------------------------------
     Small helpers
     ------------------------------------------------------------------ */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function uid(prefix) { return (prefix || 'id') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function fmtClock(totalSec) {
    totalSec = Math.max(0, Math.round(totalSec));
    const h = Math.floor(totalSec / 3600), m = Math.floor((totalSec % 3600) / 60), s = totalSec % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
  }
  function fmtDate(ts) {
    try { return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; }
  }
  function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }
  const LETTERS = ['A', 'B', 'C', 'D', 'E'];

  /* ------------------------------------------------------------------
     Rich text: **bold**, *italic*, __underline__, $math$, $$display$$,
     blank line = new paragraph, \$ = a literal dollar sign.
     ------------------------------------------------------------------ */
  function renderMath(tex, display) {
    if (window.katex && typeof window.katex.renderToString === 'function') {
      try { return window.katex.renderToString(tex, { throwOnError: false, displayMode: !!display, output: 'htmlAndMathml' }); }
      catch (e) { /* fall through */ }
    }
    return '<span class="math-fallback">' + esc(tex) + '</span>';
  }
  function renderRich(src, opts) {
    opts = opts || {};
    if (src == null || src === '') return '';
    const s = String(src);
    const maths = [];
    let text = '';
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === '\\' && s[i + 1] === '$') { text += '\u0002'; i += 2; continue; }
      if (c === '$') {
        const display = s[i + 1] === '$';
        const open = display ? 2 : 1;
        const close = s.indexOf(display ? '$$' : '$', i + open);
        if (close > i + open - 1 && close !== -1) {
          maths.push(renderMath(s.slice(i + open, close), display));
          text += '\u0001' + (maths.length - 1) + '\u0001';
          i = close + open;
          continue;
        }
      }
      text += c; i++;
    }
    let html = esc(text)
      .replace(/_{3,}/g, '\u0003') // fill-in-the-blank lines stay literal
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<u>$1</u>')
      .replace(/(^|[^\w*])\*(?=\S)(.+?)\*(?!\w)/g, '$1<em>$2</em>');
    if (opts.inline) {
      html = html.replace(/\n/g, '<br>');
    } else {
      html = html.split(/\n\s*\n/).map(p => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('');
    }
    html = html.replace(/\u0001(\d+)\u0001/g, (_, n) => maths[+n]).replace(/\u0002/g, '$')
      .replace(/\u0003/g, '<span class="blank" role="img" aria-label="blank">______</span>');
    return html;
  }
  function renderTable(t) {
    if (!t || !Array.isArray(t.rows)) return '';
    let h = '<div class="sh-table-wrap"><table class="sh-table">';
    if (t.title) h += '<caption>' + renderRich(t.title, { inline: true }) + '</caption>';
    if (Array.isArray(t.head) && t.head.length) {
      h += '<thead><tr>' + t.head.map(c => '<th scope="col">' + renderRich(c, { inline: true }) + '</th>').join('') + '</tr></thead>';
    }
    h += '<tbody>' + t.rows.map(r => '<tr>' + (Array.isArray(r) ? r : [r]).map(c => '<td>' + renderRich(c, { inline: true }) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
    return h;
  }
  function safeSrc(src) {
    src = String(src || '').trim();
    if (/^https:\/\//i.test(src) || /^[\w./-]+$/.test(src)) return src;
    return '';
  }
  function renderFigure(q) {
    const src = safeSrc(q.image);
    if (!src) return '';
    return '<figure class="q-figure"><img src="' + esc(src) + '" alt="' + esc(q.imageAlt || 'Figure for this question') + '" loading="lazy"></figure>';
  }
  /* The "stimulus": passage + table + figure */
  function renderStimulus(q) {
    return (q.passage ? renderRich(q.passage) : '') + renderTable(q.table) + renderFigure(q);
  }

  /* ------------------------------------------------------------------
     Question model
     ------------------------------------------------------------------ */
  function normDifficulty(d) {
    d = String(d || '').trim().toLowerCase();
    if (d === 'e' || d === 'easy') return 'easy';
    if (d === 'h' || d === 'hard') return 'hard';
    return 'medium';
  }
  function normalizeQuestion(raw, ctx) {
    const errors = [];
    const q = Object.assign({}, raw || {});
    const where = (ctx ? ctx + ' ' : '') + (q.id ? '"' + q.id + '"' : '(no id)');
    q.id = String(q.id || '').trim();
    if (!q.id) errors.push(where + ': missing id');
    q.section = String(q.section || '').toLowerCase() === 'math' ? 'math' : (String(q.section || '').toLowerCase() === 'rw' ? 'rw' : '');
    if (!q.section) errors.push(where + ': section must be "rw" or "math"');
    q.difficulty = normDifficulty(q.difficulty);
    q.skill = String(q.skill || '').trim();
    q.domain = String(q.domain || '').trim() || domainOf(q.section, q.skill);
    if (!q.prompt || !String(q.prompt).trim()) errors.push(where + ': missing prompt');
    if (Array.isArray(q.choices) && q.choices.length) {
      q.type = 'mc';
      q.choices = q.choices.map(c => String(c == null ? '' : c));
      if (q.choices.length < 2 || q.choices.length > 5) errors.push(where + ': choices must have 2 to 5 options');
      let a = q.answer;
      if (typeof a === 'number') a = LETTERS[a];
      a = String(a || '').trim().toUpperCase();
      if (LETTERS.indexOf(a) < 0 || LETTERS.indexOf(a) >= q.choices.length) errors.push(where + ': answer must be a choice letter (A, B, C...)');
      q.answer = a;
    } else {
      q.type = 'spr';
      delete q.choices;
      let a = q.answer;
      if (!Array.isArray(a)) a = (a == null || a === '') ? [] : [a];
      q.answer = a.map(x => String(x).trim()).filter(Boolean);
      if (!q.answer.length) errors.push(where + ': student-produced response needs at least one accepted answer');
      if (q.section === 'rw') errors.push(where + ': Reading and Writing questions must be multiple choice');
    }
    return { q, errors };
  }
  function normalizeList(list, ctx) {
    const out = [], errors = [];
    (Array.isArray(list) ? list : []).forEach((raw, i) => {
      const r = normalizeQuestion(raw, ctx + ' #' + (i + 1));
      if (r.errors.length) errors.push(...r.errors); else out.push(r.q);
    });
    return { questions: out, errors };
  }

  /* ------------------------------------------------------------------
     Answer checking (SAT student-produced response rules)
     ------------------------------------------------------------------ */
  function parseNum(s) {
    s = String(s == null ? '' : s).trim().replace(/\s+/g, '').replace(/[−–]/g, '-');
    if (/^-?\d+\/\d+$/.test(s)) { const p = s.replace('-', '').split('/').map(Number); const v = p[1] === 0 ? NaN : p[0] / p[1]; return s[0] === '-' ? -v : v; }
    if (/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return Number(s);
    return NaN;
  }
  function cleanSpr(s) { return String(s == null ? '' : s).trim().replace(/\s+/g, '').replace(/[−–]/g, '-'); }
  function isCorrect(q, response) {
    if (response == null || response === '') return false;
    if (q.type === 'mc') return String(response).toUpperCase() === q.answer;
    const r = cleanSpr(response);
    const v = parseNum(r);
    for (const a of q.answer) {
      if (cleanSpr(a) === r) return true;
      const t = parseNum(a);
      if (isNaN(t) || isNaN(v)) continue;
      if (Math.abs(v - t) < 1e-9) return true;
      // Decimal that fills every available space (5 chars, 6 if negative) and
      // is the truncated or rounded value, e.g. 2/3 -> .6666 .6667 0.666 0.667
      const m = r.match(/^-?\d*\.(\d+)$/);
      if (m && r.replace(/^-/, '').length >= 5 && Math.abs(v - t) < Math.pow(10, -m[1].length)) return true;
    }
    return false;
  }
  function sprSanitize(value) {
    let v = String(value || '').replace(/[^0-9./-]/g, '');
    v = v.replace(/(?!^)-/g, '');
    const max = v[0] === '-' ? 6 : 5;
    return v.slice(0, max);
  }
  function sprPreview(value) {
    const v = cleanSpr(value);
    if (!v) return '';
    if (/^-?\d+\/\d+$/.test(v)) { const neg = v[0] === '-'; const p = v.replace('-', '').split('/'); return renderMath((neg ? '-' : '') + '\\frac{' + p[0] + '}{' + p[1] + '}'); }
    return esc(v);
  }
  function answerLabel(q) {
    if (q.type === 'mc') return q.answer;
    return q.answer.join(', ');
  }

  /* ------------------------------------------------------------------
     Data loading
     ------------------------------------------------------------------ */
  async function getJSON(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error('Could not load ' + url + ' (' + res.status + ')');
    return res.json();
  }
  let catalogP = null;
  function loadCatalog() {
    if (!catalogP) catalogP = getJSON(CONFIG.CATALOG_URL).then(c => ({ sets: c.sets || [], tests: c.tests || [] }));
    return catalogP;
  }
  const setCache = {};
  async function loadSet(id) {
    if (setCache[id]) return setCache[id];
    const cat = await loadCatalog();
    const meta = cat.sets.find(s => s.id === id);
    if (!meta) throw new Error('Practice set "' + id + '" is not in data/catalog.json');
    const raw = await getJSON(meta.file);
    const n = normalizeList(raw.questions, meta.id);
    const set = Object.assign({}, meta, { title: raw.title || meta.title, description: raw.description || meta.description, questions: n.questions, errors: n.errors });
    if (n.errors.length) console.warn('[SAT Ustoz] Skipped questions in ' + meta.file + ':\n' + n.errors.join('\n'));
    setCache[id] = set;
    return set;
  }
  async function loadAllBank() {
    const cat = await loadCatalog();
    const sets = await Promise.all(cat.sets.map(s => loadSet(s.id).catch(e => { console.warn(e); return null; })));
    const all = [];
    sets.forEach(s => { if (s) s.questions.forEach(q => all.push(Object.assign({ setId: s.id }, q))); });
    return all;
  }
  async function loadTest(id) {
    const cat = await loadCatalog();
    const meta = cat.tests.find(t => t.id === id);
    if (!meta) throw new Error('Practice test "' + id + '" is not in data/catalog.json');
    // Paid tests come from the payments Worker, which checks the plan first.
    // "legacyFree" tests (Tests 2 and 3) stay in data/tests/ for students from
    // before Free changed, who have no Pro for the Worker to check.
    const raw = meta.plan && meta.plan !== 'free' && !meta.legacyFree && pay.testsEnabled() ? await loadProTest(meta) : await getJSON(meta.file);
    const errors = [];
    const test = {
      id: meta.id,
      plan: meta.plan || 'free',
      title: raw.title || meta.title,
      description: raw.description || meta.description || '',
      routing: Object.assign({ threshold: 0.6 }, raw.routing || {}),
      scoring: Object.assign({ m2HardWeight: 1.4, m2EasyWeight: 0.75 }, raw.scoring || {}),
      breakMinutes: raw.breakMinutes == null ? 10 : Number(raw.breakMinutes),
      sections: []
    };
    (raw.sections || []).forEach(sec => {
      const id2 = sec.id === 'math' ? 'math' : 'rw';
      const mk = (mod, label) => {
        const n = normalizeList(mod && mod.questions, meta.id + ' ' + id2 + ' ' + label);
        errors.push(...n.errors);
        n.questions.forEach(q => { q.section = id2; });
        return { minutes: Number(mod && mod.minutes) || (id2 === 'math' ? 35 : 32), questions: n.questions };
      };
      test.sections.push({
        id: id2,
        title: sec.title || TAXONOMY[id2].label,
        module1: mk(sec.module1, 'module 1'),
        module2: {
          easier: mk(sec.module2 && sec.module2.easier, 'module 2 easier'),
          harder: mk(sec.module2 && sec.module2.harder, 'module 2 harder')
        }
      });
    });
    test.errors = errors;
    if (errors.length) console.warn('[SAT Ustoz] Problems in ' + meta.file + ':\n' + errors.join('\n'));
    return test;
  }
  async function loadProTest(meta) {
    await auth.ready();
    const token = await auth.token();
    if (!token) throw new Error('Sign in with Google to open ' + meta.title + '.');
    let res;
    try { res = await fetch(pay.testsUrl('/test?id=' + encodeURIComponent(meta.id)), { headers: { authorization: 'Bearer ' + token }, cache: 'no-store' }); }
    catch (e) { throw new Error('Could not reach the server. Check your connection and try again.'); }
    if (!res.ok) {
      let d = null;
      try { d = await res.json(); } catch (e) { /* ignore */ }
      const err = new Error((d && d.error) || ('Could not load ' + meta.title + ' (' + res.status + ').'));
      err.code = d && d.code; // 'plan': the Worker says this account has no Pro
      throw err;
    }
    return res.json();
  }

  /* ------------------------------------------------------------------
     Progress & stats (kept on this device)
     ------------------------------------------------------------------ */
  function getAttempts() { return store.get('attempts', []); }
  function recordAttempts(list) {
    const all = getAttempts().concat(list.map(a => ({
      qid: a.qid, section: a.section, domain: a.domain || domainOf(a.section, a.skill), skill: a.skill || 'Other',
      difficulty: a.difficulty, correct: !!a.correct, source: a.source || 'practice', ms: a.ms || 0, ts: a.ts || Date.now()
    })));
    store.set('attempts', all.slice(-3000));
  }
  function skillStats() {
    const map = {};
    getAttempts().forEach(a => {
      const k = a.section + '|' + a.skill;
      if (!map[k]) map[k] = { section: a.section, domain: a.domain, skill: a.skill, n: 0, correct: 0 };
      map[k].n++; if (a.correct) map[k].correct++;
    });
    return Object.values(map).map(s => Object.assign(s, { acc: s.n ? s.correct / s.n : 0 }));
  }
  // Weakest skills first. Smoothed accuracy keeps one unlucky miss from
  // outranking a skill missed again and again.
  function weakSkills(limit, minAttempts) {
    const smooth = s => (s.correct + 1) / (s.n + 2);
    return skillStats().filter(s => s.n >= (minAttempts || 1) && s.acc < 1 && s.skill !== 'Other')
      .sort((a, b) => smooth(a) - smooth(b) || b.n - a.n).slice(0, limit || 3);
  }
  function getProfile() { return Object.assign({ name: '', target: 1400, testDate: '', grade: '', onboarded: false, updatedAt: 0 }, store.get('profile', {})); }
  function setProfile(p) { store.set('profile', Object.assign(getProfile(), p, { updatedAt: Date.now() })); }
  function getTestHistory() { return store.get('testHistory', []); }
  function addTestHistory(rec) { store.set('testHistory', [rec].concat(getTestHistory()).slice(0, 40)); }

  /* ------------------------------------------------------------------
     AI client (talks to your Cloudflare Worker, never to the API directly)
     ------------------------------------------------------------------ */
  const ai = {
    enabled() { return !!CONFIG.AI_ENDPOINT; },
    needsLogin() { return CONFIG.AI_REQUIRES_LOGIN && auth.enabled() && !auth.user; },
    async call(path, payload) {
      if (!this.enabled()) throw new Error('AI is not switched on yet.');
      if (auth.enabled()) await auth.ready();
      if (this.needsLogin()) { const e = new Error('Sign in with Google to use the AI.'); e.code = 'auth'; throw e; }
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 90000);
      try {
        const headers = { 'content-type': 'application/json' };
        const token = await auth.token();
        if (token) headers.authorization = 'Bearer ' + token;
        const res = await fetch(CONFIG.AI_ENDPOINT.replace(/\/+$/, '') + path, {
          method: 'POST', headers, body: JSON.stringify(payload), signal: ctrl.signal
        });
        let data = null;
        try { data = await res.json(); } catch (e) { /* ignore */ }
        if (!res.ok) { const err = new Error((data && data.error) || ('The AI service returned an error (' + res.status + ').')); if (res.status === 401) err.code = 'auth'; throw err; }
        return data;
      } catch (e) {
        if (e.code) throw e;
        if (e.name === 'AbortError') throw new Error('The AI took too long to answer. Please try again.');
        if (e instanceof TypeError) throw new Error('Could not reach the AI service. Check your connection and try again.');
        throw e;
      } finally { clearTimeout(timer); }
    },
    async generate(opts) {
      const data = await this.call('/generate', opts);
      const raw = (Array.isArray(data && data.questions) ? data.questions : []).map(q => Object.assign({}, q, { id: uid('ai') }));
      const n = normalizeList(raw, 'AI');
      n.questions.forEach(q => { q.ai = true; });
      if (!n.questions.length) throw new Error('The AI returned questions in a format we could not use. Please try again.');
      return n.questions;
    },
    tutor(payload) { return this.call('/tutor', payload); }
  };

  /* ------------------------------------------------------------------
     UI helpers: toast, modal
     ------------------------------------------------------------------ */
  let toastEl = null, toastT = null;
  function toast(msg, ms) {
    // One toast at a time: a new message replaces the old one instead of stacking.
    if (toastEl) toastEl.remove();
    clearTimeout(toastT);
    const el = toastEl = document.createElement('div');
    el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg;
    document.body.appendChild(el);
    toastT = setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, 200); }, ms || 2800);
  }
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  let modalSeq = 0;
  function modal(opts) {
    const prev = document.activeElement;
    const back = document.createElement('div');
    const tid = 'mdl-t' + (++modalSeq);
    back.className = 'modal-backdrop';
    back.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="' + tid + '"><h2 id="' + tid + '">' + esc(opts.title || '') + '</h2><div class="modal-body">' + (opts.html || '') + '</div><div class="modal-actions"></div></div>';
    const actions = back.querySelector('.modal-actions');
    let closed = false;
    function close(val) {
      if (closed) return; closed = true;
      back.remove(); document.removeEventListener('keydown', onKey);
      if (prev && prev.focus && document.contains(prev)) prev.focus({ preventScroll: true });
      if (opts.onClose) opts.onClose(val);
    }
    function onKey(e) {
      // Only the top-most modal reacts
      const all = document.querySelectorAll('.modal-backdrop');
      if (all[all.length - 1] !== back) return;
      if (e.key === 'Escape' && opts.dismissable !== false) { e.stopPropagation(); close(null); return; }
      if (e.key === 'Tab') {
        // Keep keyboard focus inside the dialog
        const f = Array.prototype.filter.call(back.querySelectorAll(FOCUSABLE), el => el.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        else if (!back.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      }
    }
    (opts.actions || [{ label: 'Close', kind: 'primary' }]).forEach(a => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn btn-' + (a.kind || 'ghost'); b.textContent = a.label;
      b.addEventListener('click', () => { const keep = a.onClick && a.onClick(back) === false; if (!keep) close(a.value); });
      actions.appendChild(b);
    });
    back.addEventListener('click', e => { if (e.target === back && opts.dismissable !== false) close(null); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(back);
    const first = actions.querySelector('.btn-primary') || actions.querySelector('button');
    if (first) first.focus();
    return { close, el: back };
  }

  /* ------------------------------------------------------------------
     AI tutor drawer
     ------------------------------------------------------------------ */
  function compactQuestion(q) {
    return {
      section: q.section, domain: q.domain, skill: q.skill, difficulty: q.difficulty,
      passage: q.passage || '', table: q.table || null, prompt: q.prompt,
      choices: q.type === 'mc' ? q.choices : null, type: q.type,
      answer: q.type === 'mc' ? q.answer : q.answer.join(' or '),
      explanation: q.explanation || ''
    };
  }
  let tutorOpen = null;
  function openTutor(opts) {
    if (tutorOpen) tutorOpen.close();
    const q = opts.question;
    const reveal = opts.revealAnswer !== false;
    const prev = document.activeElement;
    const history = [];
    const wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="tutor-backdrop"></div>' +
      '<aside class="tutor" role="dialog" aria-modal="true" aria-labelledby="tutor-t">' +
      '<div class="tutor-head"><span class="tag tag-ai">AI</span><h3 id="tutor-t">SAT tutor</h3><button class="x" type="button" aria-label="Close tutor">&times;</button></div>' +
      '<div class="tutor-log" aria-live="polite"></div>' +
      '<div class="tutor-quick"></div>' +
      '<form class="tutor-form"><label class="sr-only" for="tutor-in">Your question</label><textarea id="tutor-in" rows="1" placeholder="Ask anything about this question..."></textarea><button class="btn btn-primary btn-sm" type="submit">Send</button></form>' +
      '</aside>';
    document.body.appendChild(wrap);
    const log = wrap.querySelector('.tutor-log');
    const input = wrap.querySelector('textarea');
    const form = wrap.querySelector('form');
    const quick = wrap.querySelector('.tutor-quick');
    function bubble(kind, html) {
      const b = document.createElement('div'); b.className = 'bubble ' + kind; b.innerHTML = html; log.appendChild(b);
      log.scrollTop = log.scrollHeight; return b;
    }
    function close() {
      wrap.remove(); document.removeEventListener('keydown', onKey); tutorOpen = null;
      if (prev && prev.focus) prev.focus();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    wrap.querySelector('.x').addEventListener('click', close);
    wrap.querySelector('.tutor-backdrop').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    tutorOpen = { close };

    if (ai.enabled() && ai.needsLogin()) {
      bubble('sys', 'Sign in with Google to chat with the AI tutor. It\u2019s free and saves your progress too.');
      bubble('sys', '<a class="btn btn-primary btn-sm" href="' + esc(loginUrl()) + '">Sign in</a>');
      if (q.explanation) bubble('ai', '<p><strong>Explanation</strong></p>' + renderRich(q.explanation));
      form.hidden = true;
      return tutorOpen;
    }
    if (!ai.enabled()) {
      bubble('sys', 'The AI tutor is not switched on for this site yet.');
      if (q.explanation) bubble('ai', '<p><strong>Explanation</strong></p>' + renderRich(q.explanation));
      bubble('sys', 'Questions? Message us on <a href="' + esc(CONFIG.CONTACT_TELEGRAM) + '" target="_blank" rel="noopener">Telegram</a>.');
      form.hidden = true;
      return tutorOpen;
    }
    const studentAnswer = opts.response == null || opts.response === '' ? '(no answer)' : String(opts.response);
    bubble('sys', reveal
      ? 'The tutor can see this question, your answer (' + esc(studentAnswer) + ') and the correct answer.'
      : 'Hint mode: the tutor will guide you without giving away the answer.');
    const prompts = reveal
      ? (opts.correct ? ['Is there a faster way?', 'Why are the other choices wrong?', 'Give me a similar question'] : ['Why is my answer wrong?', 'Explain step by step', 'What should I look for next time?'])
      : ['Give me a hint', 'What is this question testing?', 'Where do I start?'];
    prompts.concat(['O‘zbekcha tushuntiring', 'Объясни по-русски']).forEach(p => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = p;
      b.addEventListener('click', () => send(p)); quick.appendChild(b);
    });
    let busy = false;
    async function send(text) {
      text = String(text || '').trim();
      if (!text || busy) return;
      busy = true;
      bubble('me', esc(text).replace(/\n/g, '<br>'));
      history.push({ role: 'user', content: text.slice(0, 1500) });
      input.value = '';
      const wait = bubble('ai', '<span class="typing" aria-label="Tutor is typing"><i></i><i></i><i></i></span>');
      try {
        const data = await ai.tutor({
          question: compactQuestion(q), studentAnswer, revealAnswer: reveal,
          messages: history.slice(-12), weakSkills: weakSkills(3).map(s => s.skill)
        });
        const reply = String((data && data.reply) || '').trim() || 'Sorry, I did not get that. Could you ask again?';
        wait.innerHTML = renderRich(reply);
        history.push({ role: 'assistant', content: reply.slice(0, 4000) });
      } catch (e) {
        wait.className = 'bubble sys';
        if (e.code === 'auth') wait.innerHTML = esc(e.message) + ' <a href="' + esc(loginUrl()) + '">Sign in</a>';
        else wait.textContent = e.message;
        history.pop();
      } finally { busy = false; log.scrollTop = log.scrollHeight; }
    }
    form.addEventListener('submit', e => { e.preventDefault(); send(input.value); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); } });
    input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(140, input.scrollHeight) + 'px'; });
    if (opts.firstMessage) send(opts.firstMessage); else input.focus();
    return tutorOpen;
  }

  /* ------------------------------------------------------------------
     Google sign-in (Firebase Auth) and cloud sync of progress (Firestore)
     ------------------------------------------------------------------ */
  const FB_VERSION = '13.0.0';
  const fbUrl = name => 'https://www.gstatic.com/firebasejs/' + FB_VERSION + '/firebase-' + name + '.js';
  function langNow() { const l = (document.documentElement.lang || store.get('lang', 'en') || 'en').slice(0, 2); return l === 'uz' || l === 'ru' ? l : 'en'; }
  const AUTH_TEXT = {
    signIn: { en: 'Sign in', uz: 'Kirish', ru: 'Войти' },
    signOut: { en: 'Sign out', uz: 'Chiqish', ru: 'Выйти' },
    dashboard: { en: 'My dashboard', uz: 'Mening sahifam', ru: 'Мой кабинет' },
    synced: { en: 'Progress saved to your account', uz: 'Natijalar hisobingizga saqlanadi', ru: 'Прогресс сохраняется в аккаунте' }
  };
  const tr = k => (AUTH_TEXT[k] && AUTH_TEXT[k][langNow()]) || AUTH_TEXT[k].en;

  function safeNext(raw) {
    raw = String(raw || '').replace(/^\/+/, '');
    return /^[a-z0-9_-]+\.html([?#][^\s<>"']*)?$/i.test(raw) ? raw : 'practice.html';
  }
  function loginUrl(next) {
    const here = next || ((location.pathname.split('/').pop() || 'index.html') + location.search + location.hash);
    return 'login.html?next=' + encodeURIComponent(safeNext(here));
  }
  function inAppBrowser() {
    const ua = navigator.userAgent || '';
    if (/Instagram/i.test(ua)) return 'Instagram';
    if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return 'Facebook';
    if (/Telegram/i.test(ua)) return 'Telegram';
    if (/TikTok|musical_ly|Bytedance/i.test(ua)) return 'TikTok';
    if (/\bLine\//i.test(ua)) return 'Line';
    if (/; wv\)/.test(ua)) return 'app';
    return '';
  }
  function friendlyAuthError(e) {
    const code = (e && e.code) || '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' || code === 'auth/user-cancelled') return '';
    if (code === 'auth/popup-blocked') return 'Your browser blocked the Google window. Allow pop-ups for this site, then try again.';
    if (code === 'auth/network-request-failed') return 'No connection to Google. Check your internet and try again.';
    if (code === 'auth/unauthorized-domain' || code === 'auth/operation-not-allowed' || code === 'auth/invalid-api-key' || code === 'auth/configuration-not-found') {
      console.warn('[SAT Ustoz] Sign-in setup problem (' + code + '). See README: Firebase setup, steps 3 and 4.');
      return 'Sign-in is not set up correctly yet. Please message us on Telegram.';
    }
    if (code === 'auth/web-storage-unsupported' || code === 'auth/internal-error' || code === 'auth/operation-not-supported-in-this-environment') return 'Sign-in does not work in this browser. Open the site in Chrome or Safari and try again.';
    return 'Could not sign in. Please try again.';
  }

  const auth = {
    user: null,
    fb: null,
    failed: false,
    settled: false,
    _ready: null,
    _subs: [],
    enabled() { const f = CONFIG.FIREBASE; return !!(f && f.apiKey && f.projectId); },
    ready() { if (!this._ready) this._ready = this._init(); return this._ready; },
    onChange(cb) { this._subs.push(cb); },
    async _init() {
      if (!this.enabled()) return null;
      try {
        const mods = await Promise.all([import(fbUrl('app')), import(fbUrl('auth'))]);
        const appMod = mods[0], authMod = mods[1];
        const app = appMod.initializeApp(CONFIG.FIREBASE);
        const a = authMod.getAuth(app);
        if (window.SH_FIREBASE_EMULATOR && window.SH_FIREBASE_EMULATOR.auth) authMod.connectAuthEmulator(a, window.SH_FIREBASE_EMULATOR.auth, { disableWarnings: true });
        this.fb = { app, auth: a, authMod };
        await new Promise(resolve => {
          let first = true;
          authMod.onAuthStateChanged(a, u => {
            this.user = u ? { uid: u.uid, name: u.displayName || '', email: u.email || '', photo: u.photoURL || '' } : null;
            if (u) analytics.identify(u.uid);
            const done = u ? sync.start() : Promise.resolve(sync.stop());
            if (first) { first = false; done.then(resolve, resolve); }
            this._emit();
          });
        });
      } catch (e) {
        this.failed = true;
        console.warn('[SAT Ustoz] Sign-in could not load:', e);
      }
      this.settled = true;
      renderAuthSlots();
      return this.user;
    },
    _emit() {
      this._subs.forEach(cb => { try { cb(this.user); } catch (e) { console.error(e); } });
      renderAuthSlots();
    },
    async signInWithGoogle() {
      await this.ready();
      if (!this.fb) throw new Error('Sign-in could not load. Check your connection and refresh the page.');
      const { authMod, auth: a } = this.fb;
      const provider = new authMod.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      let cred;
      try { cred = await authMod.signInWithPopup(a, provider); }
      catch (e) { const err = new Error(friendlyAuthError(e)); err.code = e && e.code; throw err; }
      const u = cred.user;
      this.user = { uid: u.uid, name: u.displayName || '', email: u.email || '', photo: u.photoURL || '' };
      analytics.identify(u.uid);
      await sync.start();
      analytics.track('signed_in', { method: 'google', new_account: !sync.cloudProfile });
      return this.user;
    },
    async signOut() {
      await sync.flush();
      if (this.fb) await this.fb.authMod.signOut(this.fb.auth);
      sync.clearLocal();
      analytics.reset();
      this.user = null;
      this._emit();
    },
    async token() {
      const u = this.fb && this.fb.auth.currentUser;
      try { return u ? await u.getIdToken() : null; } catch (e) { return null; }
    }
  };

  const clean = v => JSON.parse(JSON.stringify(v == null ? null : v)); // Firestore rejects undefined
  const sync = {
    uid: null, fs: null, db: null, dirty: {}, timer: null, applying: false, isNew: false, _start: null, cloudProfile: null,
    markDirty(key) {
      if (this.applying || !this.uid) return;
      this.dirty[key] = true;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.push(), 1500);
    },
    start() {
      const u = auth.user;
      if (!u) return Promise.resolve();
      if (this.uid === u.uid && this._start) return this._start;
      this.uid = u.uid;
      this._start = this._pull().catch(e => { console.warn('[SAT Ustoz] Could not sync progress:', e); });
      return this._start;
    },
    stop() { clearTimeout(this.timer); this.uid = null; this._start = null; this.dirty = {}; },
    async _lib() {
      if (!this.fs) {
        this.fs = await import(fbUrl('firestore'));
        this.db = this.fs.getFirestore(auth.fb.app);
        if (window.SH_FIREBASE_EMULATOR && window.SH_FIREBASE_EMULATOR.firestore && this.fs.connectFirestoreEmulator) {
          const f = window.SH_FIREBASE_EMULATOR.firestore; this.fs.connectFirestoreEmulator(this.db, f.host, f.port);
        }
      }
      return this.fs;
    },
    async _pull() {
      const fs = await this._lib();
      const uid = this.uid;
      const ref = (...p) => fs.doc(this.db, 'users', uid, ...p);
      const snaps = await Promise.all([fs.getDoc(ref()), fs.getDoc(ref('data', 'attempts')), fs.getDoc(ref('data', 'tests'))]);
      if (uid !== this.uid) return;
      const userDoc = snaps[0].exists() ? snaps[0].data() : null;
      const cloudAttempts = snaps[1].exists() ? (snaps[1].data().items || []) : [];
      const cloudTests = snaps[2].exists() ? (snaps[2].data().items || []) : [];
      this.isNew = !userDoc;
      this.cloudProfile = userDoc;
      // Local data that belongs to nobody (practiced before signing in) is merged
      // into the account. Data left by a different account is not.
      const owner = store.get('owner', null);
      const mine = !owner || owner === uid;
      const seen = {};
      const attempts = cloudAttempts.concat(mine ? getAttempts() : []).filter(a => {
        const k = a.qid + '|' + a.ts; if (seen[k]) return false; seen[k] = true; return true;
      }).sort((a, b) => a.ts - b.ts).slice(-3000);
      const byId = {};
      cloudTests.concat(mine ? getTestHistory() : []).forEach(t => { if (t && t.id) byId[t.id] = t; });
      const tests = Object.values(byId).sort((a, b) => b.finishedAt - a.finishedAt).slice(0, 40);
      const local = mine ? getProfile() : { name: '', target: 1400, testDate: '', grade: '', onboarded: false, updatedAt: 0 };
      const cloudP = userDoc ? { name: userDoc.name || '', target: userDoc.target || 1400, testDate: userDoc.testDate || '', grade: userDoc.grade || '', onboarded: !!userDoc.onboarded, updatedAt: userDoc.profileUpdatedAt || 0 } : null;
      let profile = cloudP && cloudP.updatedAt >= (local.updatedAt || 0) ? cloudP : local;
      if (!profile.name && auth.user) profile = Object.assign({}, profile, { name: auth.user.name });
      if (cloudP && cloudP.onboarded) profile.onboarded = true;
      // This device's plan for this account before the sync (null: none known here yet).
      const planWas = owner === uid ? plan.current() : null;
      this.applying = true;
      store.set('attempts', attempts); store.set('testHistory', tests); store.set('profile', profile); store.set('owner', uid);
      // The plan is read-only here: only you (Firebase console) or a payment
      // webhook can set it, and firestore.rules stops students writing it.
      if (userDoc && userDoc.plan) {
        const u = userDoc.planUntil;
        store.set('plan', { id: String(userDoc.plan), until: u && typeof u.toMillis === 'function' ? u.toMillis() : (Number(u) || 0) });
      } else store.del('plan');
      // When the account was created: decides whether the student keeps Tests 2 and 3 (plan.legacy).
      const made = userDoc && userDoc.createdAt;
      if (made && typeof made.toMillis === 'function') store.set('since', made.toMillis()); else store.del('since');
      this.applying = false;
      analytics.planSynced(planWas, 'sync');
      this.dirty = { attempts: attempts.length !== cloudAttempts.length, testHistory: tests.length !== cloudTests.length, profile: true };
      await this.push(true);
      try { document.dispatchEvent(new CustomEvent('sh:synced')); } catch (e) { /* ignore */ }
    },
    async push(first) {
      clearTimeout(this.timer);
      if (!this.uid || !auth.user) return;
      const fs = await this._lib();
      const uid = this.uid, d = this.dirty;
      this.dirty = {};
      const ref = (...p) => fs.doc(this.db, 'users', uid, ...p);
      const p = getProfile();
      const attempts = getAttempts();
      const tests = getTestHistory();
      const right = attempts.filter(a => a.correct).length;
      const best = tests.reduce((m, t) => Math.max(m, t.total || 0), 0);
      const userData = {
        name: p.name || auth.user.name, email: auth.user.email, photo: auth.user.photo,
        grade: p.grade || '', target: p.target || 1400, testDate: p.testDate || '', onboarded: !!p.onboarded,
        profileUpdatedAt: p.updatedAt || 0,
        stats: { questions: attempts.length, accuracy: attempts.length ? Math.round(right / attempts.length * 100) : 0, bestScore: best, tests: tests.length }
      };
      const userDoc = clean(userData);
      userDoc.lastSeenAt = fs.serverTimestamp();
      if (first && this.isNew) userDoc.createdAt = fs.serverTimestamp();
      const jobs = [fs.setDoc(ref(), userDoc, { merge: true })];
      if (d.attempts) jobs.push(fs.setDoc(ref('data', 'attempts'), { items: clean(attempts.slice(-1500)), updatedAt: fs.serverTimestamp() }));
      if (d.testHistory) jobs.push(fs.setDoc(ref('data', 'tests'), { items: clean(tests), updatedAt: fs.serverTimestamp() }));
      try { await Promise.all(jobs); this.isNew = false; }
      catch (e) { Object.assign(this.dirty, d); console.warn('[SAT Ustoz] Could not save progress to your account:', e); }
    },
    async flush() { if (this.uid && Object.keys(this.dirty).length) await this.push(); },
    clearLocal() {
      SYNCED_KEYS.forEach(k => store.del(k));
      store.del('owner'); store.del('plan'); store.del('since'); store.del('waitlist');
      try { Object.keys(localStorage).filter(k => k.indexOf(PREFIX + 'run.') === 0).forEach(k => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
    }
  };
  hooks.change = key => sync.markDirty(key);

  // Header account slot: <div data-auth-slot></div>
  function renderAuthSlots() {
    const slots = $$('[data-auth-slot]');
    if (!slots.length) return;
    slots.forEach(slot => {
      if (!auth.enabled() || auth.failed || !auth.settled) { slot.innerHTML = ''; return; }
      const u = auth.user;
      if (!u) {
        slot.innerHTML = '<a class="btn btn-ghost btn-sm auth-in" href="' + esc(loginUrl()) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" fill="none" stroke="currentColor" stroke-width="2"/></svg><span>' + tr('signIn') + '</span></a>';
        return;
      }
      const p = getProfile();
      const name = p.name || u.name || u.email;
      const initials = name.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
      slot.innerHTML = '<div class="acct"><button type="button" class="acct-btn" aria-haspopup="true" aria-expanded="false" aria-label="Account: ' + esc(name) + '">' +
        (u.photo ? '<img src="' + esc(u.photo) + '" alt="" referrerpolicy="no-referrer" width="34" height="34">' : '<span>' + esc(initials) + '</span>') + '</button>' +
        '<div class="acct-menu" hidden><div class="acct-who"><b>' + esc(name) + '</b><span>' + esc(u.email) + '</span><small>' + tr('synced') + '</small></div>' +
        '<a href="practice.html#home">' + tr('dashboard') + '</a><button type="button" data-signout>' + tr('signOut') + '</button></div></div>';
      const btn = slot.querySelector('.acct-btn'), menu = slot.querySelector('.acct-menu');
      const set = open => { menu.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
      btn.addEventListener('click', e => { e.stopPropagation(); set(menu.hidden); });
      document.addEventListener('click', e => { if (!slot.contains(e.target)) set(false); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
      slot.querySelector('[data-signout]').addEventListener('click', async () => {
        set(false);
        await auth.signOut();
        location.href = 'index.html';
      });
    });
  }
  // Wait for the sign-in state, but never hold the page up for long.
  function authReady(ms) {
    if (!auth.enabled()) return Promise.resolve(null);
    return Promise.race([auth.ready(), new Promise(r => setTimeout(r, ms || 5000))]);
  }
  // Pages call this when CONFIG.REQUIRE_LOGIN is on.
  async function requireLogin() {
    if (!CONFIG.REQUIRE_LOGIN || !auth.enabled()) return true;
    await auth.ready();
    if (auth.user || auth.failed) return true;
    location.replace(loginUrl());
    return false;
  }

  /* ------------------------------------------------------------------
     Plans: Free, Pro, Max
     The pages use this to decide what to show. With TESTS_ENDPOINT or
     PAYMENTS_ENDPOINT set, the Worker also checks the plan before it hands
     out a Pro test file.
     ------------------------------------------------------------------ */
  const PLAN_RANK = { free: 0, pro: 1, max: 2 };
  const freeChangedAt = () => Date.parse(String(CONFIG.PLANS.FREE_CHANGED_AT || '') + 'T00:00:00+05:00') || 0;
  const knownPlan = id => Object.prototype.hasOwnProperty.call(PLAN_RANK, id);
  const plan = {
    current() {
      if (!auth.enabled() || !auth.user) return 'free';
      const p = store.get('plan', null);
      if (!p || !knownPlan(p.id)) return 'free';
      if (p.until && p.until < Date.now()) return 'free';
      return p.id;
    },
    until() { const p = store.get('plan', null); return this.current() !== 'free' && p ? p.until || 0 : 0; },
    allows(required) { return PLAN_RANK[this.current()] >= (knownPlan(required) ? PLAN_RANK[required] : 0); },
    // Used the site before Free changed (account created, or anything practiced
    // or finished, before CONFIG.PLANS.FREE_CHANGED_AT).
    legacy() {
      const cut = freeChangedAt();
      if (!cut) return false;
      const since = store.get('since', 0);
      if (since && since < cut) return true;
      return getAttempts().some(a => a.ts && a.ts < cut) || getTestHistory().some(h => h.finishedAt && h.finishedAt < cut);
    },
    // Can this student open this test? meta is its entry in data/catalog.json;
    // "legacyFree" tests stay open for students from before the change.
    opens(meta) { return !!meta && (this.allows(meta.plan) || (!!meta.legacyFree && this.legacy())); },
    // Skill breakdown, question review and skill drills are Pro. A test record
    // finished before the change keeps its full results.
    insights(rec) { return this.allows('pro') || (!!(rec && rec.finishedAt) && rec.finishedAt < freeChangedAt()); },
    pitch(opts) { openPitch(opts || {}); },
    label(id) { return planText((id || this.current()) + '_name'); },
    upgrade(id) { openUpgrade(id || 'pro'); },
    // Ask the payments Worker for the plan (right after paying, before the
    // next Firestore sync), then let the page redraw.
    async refresh() {
      if (!pay.enabled() || !auth.user) return this.current();
      const s = await pay.call('/status');
      const was = this.current();
      if (s.plan) store.set('plan', { id: String(s.plan), until: Number(s.until) || 0 }); else store.del('plan');
      analytics.planSynced(was, 'payme');
      try { document.dispatchEvent(new CustomEvent('sh:synced')); } catch (e) { /* ignore */ }
      return this.current();
    }
  };

  // Talks to the payments Worker (worker/payments-worker.js).
  const pay = {
    enabled() { return !!CONFIG.PAYMENTS_ENDPOINT && auth.enabled(); },
    url(path) { return CONFIG.PAYMENTS_ENDPOINT.replace(/\/+$/, '') + path; },
    // Pro test files (GET /test), which can come from the Worker before payments do.
    testsEnabled() { return !!(CONFIG.TESTS_ENDPOINT || CONFIG.PAYMENTS_ENDPOINT) && auth.enabled(); },
    testsUrl(path) { return (CONFIG.TESTS_ENDPOINT || CONFIG.PAYMENTS_ENDPOINT).replace(/\/+$/, '') + path; },
    async call(path, body) {
      await auth.ready();
      const token = await auth.token();
      if (!token) { const e = new Error(planText('up_signin')); e.code = 'auth'; throw e; }
      let res, data = null;
      try {
        res = await fetch(this.url(path), {
          method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
          body: JSON.stringify(Object.assign({ lang: langNow() }, body || {}))
        });
      } catch (e) { throw new Error(planText('pay_offline')); }
      try { data = await res.json(); } catch (e) { /* ignore */ }
      if (!res.ok) { const err = new Error((data && data.error) || planText('pay_failed')); err.status = res.status; err.code = data && data.code; throw err; }
      return data || {};
    }
  };
  // Payment by card transfer (CONFIG.MANUAL_PAY), while online payment is off.
  // The student's "I paid" note goes to payRequests/<uid>, one per student.
  // You match it in your bank app, switch Pro on in users/<uid>, then delete
  // the note (README "Payment by card transfer").
  const manual = {
    card() { return String((CONFIG.MANUAL_PAY && CONFIG.MANUAL_PAY.CARD) || '').replace(/\D/g, ''); },
    enabled() { return !pay.enabled() && this.card().length >= 16; },
    canSave() { return auth.enabled() && !!auth.user && !!auth.fb; },
    async _ref() { const fs = await sync._lib(); return { fs, ref: fs.doc(sync.db, 'payRequests', auth.user.uid) }; },
    async get() {
      const { fs, ref } = await this._ref();
      const s = await fs.getDoc(ref);
      return s.exists() ? s.data() : null;
    },
    async send(last4, receiptId, lang, months) {
      const { fs, ref } = await this._ref();
      await fs.setDoc(ref, {
        uid: auth.user.uid, email: auth.user.email, name: (auth.user.name || '').slice(0, 100), plan: 'pro',
        amount: somNumber(months > 1 ? CONFIG.PLANS.PASS_PRICE : CONFIG.PLANS.PRO_PRICE), months: months > 1 ? months : 1,
        last4, receiptId, lang, createdAt: fs.serverTimestamp()
      });
    }
  };
  const somNumber = v => Number(String(v || '').replace(/\D/g, '')) || 0;
  // The "until your test" pass is offered only with card transfer, which you check by hand.
  const passEnabled = () => manual.enabled() && somNumber(CONFIG.PLANS.PASS_PRICE) > 0 && Number(CONFIG.PLANS.PASS_MONTHS) > 1;
  const PAYME_LOGO = 'https://cdn.payme.uz/logo/payme_color.svg';
  const PAYME_TERMS = 'https://cdn.payme.uz/terms/main.html';
  const fmtSom = n => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const PLAN_TEXT = {
    en: {
      free_name: 'Free', pro_name: 'Pro', max_name: 'Max',
      free_for: 'Try the real test format.', pro_for: 'Every test, and where your points go.', max_for: 'Pro, plus the AI tutor and live sessions.',
      free_f: ['Mini diagnostic test', 'Practice Test 1', 'Starter practice sets', 'Your total score'],
      pro_f: ['All 10 full-length adaptive practice tests', 'Your score broken down by skill', 'Review every question with explanations', 'Drills built from your weakest skills'],
      max_f: ['Everything in Pro', 'AI tutor: ask about any question, any time', 'A study plan to your test date', 'A monthly live group session with Azizbek'],
      per_month: '/ month', popular: 'Recommended', soon: 'Coming soon',
      cta_free: 'Start free', cta_current: 'Your current plan', cta_included: 'Included in your plan', cta_pro: 'Upgrade to Pro', cta_max: 'Get Max',
      active_until: 'Active until {d}',
      note: '<b>Free, Pro or Max?</b> Free shows your total score. Pro shows why: every skill, every question, and drills for the skills that cost you points. Max adds the AI tutor and live sessions with Azizbek.',
      bill: 'Prices in Uzbek so’m. Pro is paid monthly, and you can stop any time.',
      up_title: 'Upgrade to Pro', up_signin: 'Sign in first, so Pro is linked to your account and works on every device.', up_signin_btn: 'Sign in with Google',
      up_intro: 'Online card payment is on its way. Until then, we switch Pro on by hand within 2 hours, 9:00 to 23:00 Tashkent time:',
      up_steps: ['Message us on Telegram and say you want Pro.', 'We send you how to pay {price} for the month.', 'We switch Pro on for your account:'],
      up_tg: 'Message us on Telegram', up_copy: 'Copy', copied: 'Email copied', close: 'Close',
      pay_preparing: 'Getting your payment ready…', pay_choose: 'Pro costs {price} a month. Choose how to pay:',
      pay_card_t: 'Pay by card, renews monthly', pay_card_d: 'Uzcard or Humo. We charge {price} each month until you stop it.',
      pay_page_t: 'Pay once on Payme', pay_page_d: 'Payme app, QR code or any card. One month, no automatic renewal.',
      pay_num: 'Card number', pay_exp: 'Expiry (MM/YY)',
      pay_safe: 'Payme saves your card, not SAT Ustoz. We never store your card number.',
      pay_terms: 'Pro renews every month for {price} until you stop it on the Plans page. By continuing you accept {terms}.', pay_terms_link: 'Payme’s terms',
      pay_continue: 'Continue', pay_back: 'Back', cancel: 'Cancel', pay_powered: 'Powered by',
      pay_sent: 'Payme sent an SMS code to {phone}.', pay_sent_nophone: 'Payme sent an SMS code to the phone linked to your card.',
      pay_code: 'SMS code', pay_resend: 'Send the code again', pay_resent: 'New code sent', pay_pay: 'Pay {price}',
      pay_ok_t: 'Pro is on', pay_ok: 'Pro is on until {d}. All 10 practice tests are open.',
      pay_ok_renew: 'Next month, {price} is charged to card {card} automatically. You can stop it on the Plans page any time.',
      pay_pending: 'Payme is still confirming your payment. Pro switches on within a few minutes; reload the page then.',
      pay_opening: 'Opening Payme…', pay_back_ok: 'Payment received. Pro is on until {d}.',
      pay_back_wait: 'We have not received the payment yet. If you paid, Pro switches on within a few minutes.',
      pay_failed: 'The payment did not go through. Please try again.',
      pay_offline: 'Could not reach the payment service. Check your connection and try again.',
      pay_bad_num: 'Enter the 16-digit card number.', pay_bad_exp: 'Enter the expiry date like 03/29.', pay_bad_code: 'Enter the code from the SMS.',
      open_tests: 'Open practice tests', tg_help: 'Problem paying? Message us on Telegram.',
      manage: 'Manage payment', manage_t: 'Your Pro plan', m_loading: 'Loading…', m_until: 'Pro is on until {d}.',
      m_renew: 'Renews automatically: {price} from card {card}, one day before it ends.',
      m_renew_pending: 'Your last payment is still being confirmed by Payme.',
      m_off: 'Automatic renewal is off. Pro ends on that day unless you pay for another month.',
      m_stop: 'Stop automatic renewal', m_stop_q: 'Stop automatic renewal? Pro stays on until {d}, and your card is removed.',
      m_stopped: 'Automatic renewal stopped', m_more: 'Pay for another month',
      mp_intro: 'Transfer {price} to this card from any banking app (Click, Payme, Uzum or your bank’s app):',
      mp_card: 'Card', mp_name: 'Name', mp_amount: 'Amount', mp_card_copied: 'Card number copied', mp_amount_copied: 'Amount copied',
      mp_note: 'Send the exact amount and keep the receipt. You need it in the next step.',
      mp_paid: 'I’ve paid', mp_form: 'So we can find your payment:',
      mp_last4: 'Last 4 digits of the card you paid from', mp_receipt: 'Receipt or transaction number (optional)',
      mp_send: 'Continue', mp_bad_last4: 'Enter the last 4 digits of your card.',
      mp_sent_t: 'Almost done',
      mp_sent: 'Last step: send the receipt screenshot to us on Telegram. We check it and switch Pro on within 2 hours, 9:00 to 23:00 Tashkent time.',
      mp_account: 'Your account:', mp_tg: 'Send receipt on Telegram',
      mp_tg_msg: 'Hi! I paid {price} for SAT Ustoz Pro. Account: {email}. Card ending {card}. Receipt:',
      mp_pending: 'We got your payment details on {d} and are checking them. Pro switches on within 2 hours (9:00 to 23:00 Tashkent time); reload the page then.',
      mp_pending_tg: 'Haven’t sent the receipt screenshot yet? Send it on Telegram so we find your payment faster.',
      mp_again: 'I made a new payment',
      bill_pass: 'Prices in Uzbek so’m. Pay for one month at a time, or for 3 months until your test.',
      pass_line: 'or {price} for 3 months, until your test',
      mp_choose: 'How long do you want Pro?', mp_month_t: 'One month', mp_pass_t: '3 months, until your test', mp_pass_d: '{price}: 3 months for the price of 2.5',
      pitch_lead: 'Pro gives you:', pitch_later: 'Not now', lock_btn: 'Unlock with Pro',
      cta_wait: 'Join the Max waitlist', cta_wait_on: 'You’re on the waitlist', wl_title: 'Max waitlist',
      wl_intro: 'Max adds the AI tutor, a study plan to your test date and a monthly live group session with Azizbek. Leave your Telegram username and we’ll message you first when it opens.',
      wl_label: 'Telegram username', wl_bad: 'Enter your Telegram username, like @satustoz.', wl_join: 'Join the waitlist',
      wl_done_t: 'You’re on the list', wl_done: 'We’ll message {tg} on Telegram the day Max opens.',
      wl_signin: 'Sign in first, so we know who to message when Max opens.',
      wl_failed: 'Could not save. Check your connection and try again, or message us on Telegram.', wl_change: 'Change username'
    },
    uz: {
      free_name: 'Bepul', pro_name: 'Pro', max_name: 'Max',
      free_for: 'Haqiqiy test formatini sinab koʻring.', pro_for: 'Barcha testlar va ballaringiz qayerda yoʻqolayotgani.', max_for: 'Pro, AI ustoz va jonli darslar bilan.',
      free_f: ['Mini diagnostika testi', '1-sinov testi', 'Boshlangʻich savollar toʻplamlari', 'Umumiy ballingiz'],
      pro_f: ['Barcha 10 ta toʻliq adaptiv sinov testi', 'Koʻnikmalar boʻyicha ball tahlili', 'Har bir savolni izohlari bilan koʻrib chiqish', 'Eng zaif koʻnikmalaringiz boʻyicha mashqlar'],
      max_f: ['Pro tarifidagi hamma narsa', 'AI ustoz: istalgan savol boʻyicha istalgan vaqtda soʻrang', 'Imtihon sanangizgacha oʻqish rejasi', 'Azizbek bilan oylik jonli guruh darsi'],
      per_month: '/ oy', popular: 'Tavsiya etiladi', soon: 'Tez kunda',
      cta_free: 'Bepul boshlash', cta_current: 'Joriy tarifingiz', cta_included: 'Tarifingizga kiradi', cta_pro: 'Pro tarifiga oʻtish', cta_max: 'Max olish',
      active_until: '{d} gacha faol',
      note: '<b>Bepul, Pro yoki Max?</b> Bepul tarif umumiy ballingizni koʻrsatadi. Pro esa sababini koʻrsatadi: har bir koʻnikma, har bir savol va ball yoʻqotayotgan koʻnikmalaringiz uchun mashqlar. Max esa AI ustoz va Azizbek bilan jonli darslarni qoʻshadi.',
      bill: 'Narxlar soʻmda. Pro uchun toʻlov har oy amalga oshiriladi, istalgan vaqtda toʻxtatish mumkin.',
      up_title: 'Pro tarifiga oʻtish', up_signin: 'Avval tizimga kiring: shunda Pro hisobingizga bogʻlanadi va har qanday qurilmada ishlaydi.', up_signin_btn: 'Google orqali kirish',
      up_intro: 'Karta orqali onlayn toʻlov tez orada ishga tushadi. Shu paytgacha Pro tarifini qoʻlda yoqamiz: Toshkent vaqti bilan 9:00 dan 23:00 gacha 2 soat ichida:',
      up_steps: ['Telegramda bizga yozing va Pro kerakligini ayting.', 'Bir oylik {price} toʻlovni qanday amalga oshirishni yuboramiz.', 'Hisobingiz uchun Pro tarifini yoqamiz:'],
      up_tg: 'Telegramda yozish', up_copy: 'Nusxalash', copied: 'Email nusxalandi', close: 'Yopish',
      pay_preparing: 'Toʻlov tayyorlanmoqda…', pay_choose: 'Pro oyiga {price}. Toʻlov usulini tanlang:',
      pay_card_t: 'Karta orqali, har oy avtomatik', pay_card_d: 'Uzcard yoki Humo. Siz toʻxtatmaguningizcha har oy {price} yechiladi.',
      pay_page_t: 'Payme orqali bir martalik', pay_page_d: 'Payme ilovasi, QR kod yoki istalgan karta. Bir oy, avtomatik uzaytirishsiz.',
      pay_num: 'Karta raqami', pay_exp: 'Amal qilish muddati (OO/YY)',
      pay_safe: 'Kartangizni SAT Ustoz emas, Payme saqlaydi. Biz karta raqamingizni saqlamaymiz.',
      pay_terms: 'Pro har oy {price} evaziga uzaytiriladi, buni «Plans» sahifasida istalgan vaqtda toʻxtatishingiz mumkin. Davom etib, siz {terms}ni qabul qilasiz.', pay_terms_link: 'Payme ofertasi',
      pay_continue: 'Davom etish', pay_back: 'Orqaga', cancel: 'Bekor qilish', pay_powered: 'Powered by',
      pay_sent: 'Payme {phone} raqamiga SMS kod yubordi.', pay_sent_nophone: 'Payme kartangizga bogʻlangan telefon raqamiga SMS kod yubordi.',
      pay_code: 'SMS kod', pay_resend: 'Kodni qayta yuborish', pay_resent: 'Yangi kod yuborildi', pay_pay: '{price} toʻlash',
      pay_ok_t: 'Pro yoqildi', pay_ok: 'Pro {d} gacha faol. Barcha 10 ta sinov testi ochiq.',
      pay_ok_renew: 'Keyingi oy {card} kartasidan {price} avtomatik yechiladi. Buni «Plans» sahifasida istalgan vaqtda toʻxtatishingiz mumkin.',
      pay_pending: 'Payme toʻlovingizni hali tasdiqlamoqda. Pro bir necha daqiqada yoqiladi, keyin sahifani yangilang.',
      pay_opening: 'Payme ochilmoqda…', pay_back_ok: 'Toʻlov qabul qilindi. Pro {d} gacha faol.',
      pay_back_wait: 'Toʻlov hali bizga kelmadi. Agar toʻlagan boʻlsangiz, Pro bir necha daqiqada yoqiladi.',
      pay_failed: 'Toʻlov amalga oshmadi. Qaytadan urinib koʻring.',
      pay_offline: 'Toʻlov xizmatiga ulanib boʻlmadi. Internetni tekshirib, qayta urinib koʻring.',
      pay_bad_num: '16 xonali karta raqamini kiriting.', pay_bad_exp: 'Amal qilish muddatini 03/29 kabi kiriting.', pay_bad_code: 'SMSdagi kodni kiriting.',
      open_tests: 'Sinov testlarini ochish', tg_help: 'Toʻlovda muammo boʻldimi? Telegramda bizga yozing.',
      manage: 'Toʻlovni boshqarish', manage_t: 'Pro tarifingiz', m_loading: 'Yuklanmoqda…', m_until: 'Pro {d} gacha faol.',
      m_renew: 'Avtomatik uzaytiriladi: tugashidan bir kun oldin {card} kartasidan {price} yechiladi.',
      m_renew_pending: 'Oxirgi toʻlovingiz hali Payme tomonidan tasdiqlanmoqda.',
      m_off: 'Avtomatik uzaytirish oʻchirilgan. Yana bir oy uchun toʻlamasangiz, Pro shu kuni tugaydi.',
      m_stop: 'Avtomatik uzaytirishni toʻxtatish', m_stop_q: 'Avtomatik uzaytirish toʻxtatilsinmi? Pro {d} gacha faol qoladi, kartangiz esa oʻchiriladi.',
      m_stopped: 'Avtomatik uzaytirish toʻxtatildi', m_more: 'Yana bir oy uchun toʻlash',
      mp_intro: 'Istalgan bank ilovasi (Click, Payme, Uzum yoki bankingiz ilovasi) orqali quyidagi kartaga {price} oʻtkazing:',
      mp_card: 'Karta', mp_name: 'Egasi', mp_amount: 'Summa', mp_card_copied: 'Karta raqami nusxalandi', mp_amount_copied: 'Summa nusxalandi',
      mp_note: 'Aynan shu summani oʻtkazing va chekni saqlab qoʻying. U keyingi qadamda kerak boʻladi.',
      mp_paid: 'Toʻladim', mp_form: 'Toʻlovingizni topishimiz uchun:',
      mp_last4: 'Toʻlov qilgan kartangizning oxirgi 4 raqami', mp_receipt: 'Chek yoki tranzaksiya raqami (ixtiyoriy)',
      mp_send: 'Davom etish', mp_bad_last4: 'Kartangizning oxirgi 4 raqamini kiriting.',
      mp_sent_t: 'Deyarli tayyor',
      mp_sent: 'Oxirgi qadam: chek skrinshotini bizga Telegramda yuboring. Biz uni tekshirib, Toshkent vaqti bilan 9:00 dan 23:00 gacha 2 soat ichida Pro tarifini yoqamiz.',
      mp_account: 'Hisobingiz:', mp_tg: 'Chekni Telegramda yuborish',
      mp_tg_msg: 'Salom! SAT Ustoz Pro uchun {price} toʻladim. Hisob: {email}. Karta oxiri: {card}. Chek:',
      mp_pending: '{d} kuni toʻlov maʼlumotlaringizni oldik va tekshiryapmiz. Pro 2 soat ichida (Toshkent vaqti bilan 9:00–23:00) yoqiladi, keyin sahifani yangilang.',
      mp_pending_tg: 'Chek skrinshotini hali yubormadingizmi? Toʻlovingizni tezroq topishimiz uchun uni Telegramda yuboring.',
      mp_again: 'Yangi toʻlov qildim',
      bill_pass: 'Narxlar soʻmda. Bir oyga yoki imtihoningizgacha 3 oyga toʻlang.',
      pass_line: 'yoki imtihoningizgacha 3 oyga {price}',
      mp_choose: 'Pro qancha muddatga kerak?', mp_month_t: 'Bir oy', mp_pass_t: 'Imtihoningizgacha 3 oy', mp_pass_d: '{price}: 2,5 oy narxiga 3 oy',
      pitch_lead: 'Pro sizga beradi:', pitch_later: 'Hozir emas', lock_btn: 'Pro bilan ochish',
      cta_wait: 'Max kutish roʻyxatiga yozilish', cta_wait_on: 'Siz kutish roʻyxatidasiz', wl_title: 'Max kutish roʻyxati',
      wl_intro: 'Max AI ustoz, imtihon sanangizgacha oʻqish rejasi va Azizbek bilan oylik jonli guruh darsini qoʻshadi. Telegram foydalanuvchi nomingizni qoldiring, Max ochilganda birinchi boʻlib sizga yozamiz.',
      wl_label: 'Telegram foydalanuvchi nomi', wl_bad: 'Telegram nomingizni kiriting, masalan @satustoz.', wl_join: 'Roʻyxatga yozilish',
      wl_done_t: 'Siz roʻyxatdasiz', wl_done: 'Max ochilgan kuni {tg} ga Telegramda yozamiz.',
      wl_signin: 'Avval kiring, shunda Max ochilganda kimga yozishni bilamiz.',
      wl_failed: 'Saqlab boʻlmadi. Internetni tekshirib, qayta urinib koʻring yoki Telegramda yozing.', wl_change: 'Nomni oʻzgartirish'
    },
    ru: {
      free_name: 'Бесплатно', pro_name: 'Pro', max_name: 'Max',
      free_for: 'Попробуйте настоящий формат теста.', pro_for: 'Все тесты и то, где вы теряете баллы.', max_for: 'Pro плюс ИИ-репетитор и живые занятия.',
      free_f: ['Мини-диагностика', 'Пробный тест 1', 'Стартовые наборы вопросов', 'Ваш общий балл'],
      pro_f: ['Все 10 полных адаптивных пробных тестов', 'Разбор балла по навыкам', 'Разбор каждого вопроса с объяснениями', 'Тренировки по вашим самым слабым навыкам'],
      max_f: ['Всё из тарифа Pro', 'ИИ-репетитор: спрашивайте о любом вопросе в любое время', 'План подготовки до даты экзамена', 'Ежемесячное живое групповое занятие с Азизбеком'],
      per_month: '/ месяц', popular: 'Рекомендуем', soon: 'Скоро',
      cta_free: 'Начать бесплатно', cta_current: 'Ваш текущий тариф', cta_included: 'Входит в ваш тариф', cta_pro: 'Перейти на Pro', cta_max: 'Получить Max',
      active_until: 'Активен до {d}',
      note: '<b>Бесплатно, Pro или Max?</b> Бесплатный тариф показывает общий балл. Pro показывает, почему: каждый навык, каждый вопрос и тренировки по навыкам, на которых вы теряете баллы. Max добавит ИИ-репетитора и живые занятия с Азизбеком.',
      bill: 'Цены в узбекских сумах. Pro оплачивается помесячно, остановиться можно в любой момент.',
      up_title: 'Перейти на Pro', up_signin: 'Сначала войдите: так Pro привяжется к вашему аккаунту и будет работать на любом устройстве.', up_signin_btn: 'Войти через Google',
      up_intro: 'Онлайн-оплата картой скоро заработает. А пока мы включаем Pro вручную, в течение 2 часов, с 9:00 до 23:00 по Ташкенту:',
      up_steps: ['Напишите нам в Telegram, что хотите Pro.', 'Мы пришлём, как оплатить {price} за месяц.', 'Мы включим Pro для вашего аккаунта:'],
      up_tg: 'Написать в Telegram', up_copy: 'Скопировать', copied: 'Email скопирован', close: 'Закрыть',
      pay_preparing: 'Готовим оплату…', pay_choose: 'Pro стоит {price} в месяц. Выберите способ оплаты:',
      pay_card_t: 'Картой, с продлением каждый месяц', pay_card_d: 'Uzcard или Humo. Каждый месяц списываем {price}, пока вы не отключите.',
      pay_page_t: 'Один раз через Payme', pay_page_d: 'Приложение Payme, QR-код или любая карта. Один месяц, без автопродления.',
      pay_num: 'Номер карты', pay_exp: 'Срок действия (ММ/ГГ)',
      pay_safe: 'Вашу карту сохраняет Payme, а не SAT Ustoz. Мы не храним номер вашей карты.',
      pay_terms: 'Pro продлевается каждый месяц за {price}, пока вы не отключите продление на странице «Plans». Продолжая, вы принимаете {terms}.', pay_terms_link: 'оферту Payme',
      pay_continue: 'Продолжить', pay_back: 'Назад', cancel: 'Отмена', pay_powered: 'Powered by',
      pay_sent: 'Payme отправил SMS-код на номер {phone}.', pay_sent_nophone: 'Payme отправил SMS-код на телефон, привязанный к карте.',
      pay_code: 'SMS-код', pay_resend: 'Отправить код ещё раз', pay_resent: 'Новый код отправлен', pay_pay: 'Оплатить {price}',
      pay_ok_t: 'Pro включён', pay_ok: 'Pro активен до {d}. Все 10 пробных тестов открыты.',
      pay_ok_renew: 'В следующем месяце {price} спишется с карты {card} автоматически. Отключить можно на странице «Plans» в любой момент.',
      pay_pending: 'Payme ещё подтверждает оплату. Pro включится через несколько минут, затем обновите страницу.',
      pay_opening: 'Открываем Payme…', pay_back_ok: 'Оплата получена. Pro активен до {d}.',
      pay_back_wait: 'Мы ещё не получили оплату. Если вы оплатили, Pro включится через несколько минут.',
      pay_failed: 'Оплата не прошла. Попробуйте ещё раз.',
      pay_offline: 'Не удалось связаться с платёжным сервисом. Проверьте интернет и попробуйте ещё раз.',
      pay_bad_num: 'Введите 16-значный номер карты.', pay_bad_exp: 'Введите срок действия, например 03/29.', pay_bad_code: 'Введите код из SMS.',
      open_tests: 'Открыть пробные тесты', tg_help: 'Проблема с оплатой? Напишите нам в Telegram.',
      manage: 'Управление оплатой', manage_t: 'Ваш тариф Pro', m_loading: 'Загрузка…', m_until: 'Pro активен до {d}.',
      m_renew: 'Продлевается автоматически: за день до окончания с карты {card} спишется {price}.',
      m_renew_pending: 'Ваш последний платёж ещё подтверждается Payme.',
      m_off: 'Автопродление отключено. Pro закончится в этот день, если вы не оплатите ещё месяц.',
      m_stop: 'Отключить автопродление', m_stop_q: 'Отключить автопродление? Pro останется активным до {d}, а карта будет удалена.',
      m_stopped: 'Автопродление отключено', m_more: 'Оплатить ещё месяц',
      mp_intro: 'Переведите {price} на эту карту из любого банковского приложения (Click, Payme, Uzum или приложение вашего банка):',
      mp_card: 'Карта', mp_name: 'Получатель', mp_amount: 'Сумма', mp_card_copied: 'Номер карты скопирован', mp_amount_copied: 'Сумма скопирована',
      mp_note: 'Переведите точную сумму и сохраните чек. Он понадобится на следующем шаге.',
      mp_paid: 'Я оплатил(а)', mp_form: 'Чтобы мы нашли ваш платёж:',
      mp_last4: 'Последние 4 цифры карты, с которой вы платили', mp_receipt: 'Номер чека или транзакции (необязательно)',
      mp_send: 'Продолжить', mp_bad_last4: 'Введите последние 4 цифры карты.',
      mp_sent_t: 'Почти готово',
      mp_sent: 'Последний шаг: отправьте нам скриншот чека в Telegram. Мы проверим его и включим Pro в течение 2 часов, с 9:00 до 23:00 по Ташкенту.',
      mp_account: 'Ваш аккаунт:', mp_tg: 'Отправить чек в Telegram',
      mp_tg_msg: 'Здравствуйте! Я оплатил(а) {price} за SAT Ustoz Pro. Аккаунт: {email}. Карта на {card}. Чек:',
      mp_pending: '{d} мы получили данные о вашем платеже и проверяем их. Pro включится в течение 2 часов (с 9:00 до 23:00 по Ташкенту), затем обновите страницу.',
      mp_pending_tg: 'Ещё не отправили скриншот чека? Отправьте его в Telegram, так мы быстрее найдём платёж.',
      mp_again: 'Я сделал(а) новый платёж',
      bill_pass: 'Цены в узбекских сумах. Платите за месяц или сразу за 3 месяца до экзамена.',
      pass_line: 'или {price} за 3 месяца, до экзамена',
      mp_choose: 'На какой срок нужен Pro?', mp_month_t: 'Один месяц', mp_pass_t: '3 месяца, до экзамена', mp_pass_d: '{price}: 3 месяца по цене 2,5',
      pitch_lead: 'Pro даёт вам:', pitch_later: 'Не сейчас', lock_btn: 'Открыть с Pro',
      cta_wait: 'В лист ожидания Max', cta_wait_on: 'Вы в листе ожидания', wl_title: 'Лист ожидания Max',
      wl_intro: 'Max добавит ИИ-репетитора, план подготовки до даты экзамена и ежемесячное живое групповое занятие с Азизбеком. Оставьте свой username в Telegram, и мы первыми напишем вам, когда Max откроется.',
      wl_label: 'Username в Telegram', wl_bad: 'Введите username в Telegram, например @satustoz.', wl_join: 'Записаться',
      wl_done_t: 'Вы в списке', wl_done: 'Мы напишем {tg} в Telegram в день запуска Max.',
      wl_signin: 'Сначала войдите, чтобы мы знали, кому написать, когда Max откроется.',
      wl_failed: 'Не удалось сохранить. Проверьте интернет и попробуйте ещё раз или напишите нам в Telegram.', wl_change: 'Изменить username'
    }
  };
  function planText(k, lang) {
    const d = PLAN_TEXT[lang || langNow()] || PLAN_TEXT.en;
    return d[k] != null ? d[k] : PLAN_TEXT.en[k];
  }
  function priceText(amount, lang) {
    return amount + ' ' + (CONFIG.PLANS.CURRENCY[lang] || CONFIG.PLANS.CURRENCY.en);
  }
  // Pricing cards. opts.context: 'landing' (index.html) or 'app' (practice.html).
  function renderPlans(host, opts) {
    if (!host) return;
    opts = opts || {};
    const lang = langNow(), T = k => planText(k, lang);
    const cur = plan.current(), until = plan.until();
    const money = CONFIG.PLANS.CURRENCY[lang] || CONFIG.PLANS.CURRENCY.en;
    const price = (amount, monthly) => '<div class="plan-price"><b>' + esc(amount) + '</b><span>' + esc(money) + (monthly ? ' ' + esc(T('per_month')) : '') + '</span></div>';
    const list = items => '<ul class="plan-list">' + items.map(i => '<li>' + esc(i) + '</li>').join('') + '</ul>';
    const current = () => '<button class="btn btn-ghost" type="button" disabled>' + esc(T('cta_current')) + '</button>' +
      (cur !== 'free' && until ? '<p class="plan-until">' + esc(T('active_until').replace('{d}', fmtDate(until))) + '</p>' : '') +
      (cur !== 'free' && pay.enabled() && auth.user ? '<p class="plan-until"><button type="button" class="link-btn" data-manage>' + esc(T('manage')) + '</button></p>' : '') +
      (cur === 'pro' && manual.enabled() && auth.user ? '<p class="plan-until"><button type="button" class="link-btn" data-upgrade="pro">' + esc(T('m_more')) + '</button></p>' : '');
    const included = '<button class="btn btn-ghost" type="button" disabled>' + esc(T('cta_included')) + '</button>';
    const freeCta = cur !== 'free' ? included
      : opts.context === 'landing' ? '<a class="btn btn-ghost" href="practice.html">' + esc(T('cta_free')) + '</a>' : current();
    const proCta = cur === 'pro' ? current() : cur === 'max' ? included
      : '<button class="btn btn-primary" type="button" data-upgrade="pro">' + esc(T('cta_pro')) + '</button>';
    // Until Max launches, its card collects a waitlist (Telegram usernames).
    const maxCta = cur === 'max' ? current()
      : '<button class="btn btn-ghost" type="button" data-waitlist>' + esc(T(store.get('waitlist', null) ? 'cta_wait_on' : 'cta_wait')) + '</button>' +
        '<p class="plan-until"><span class="soon-badge">' + esc(T('soon')) + '</span></p>';
    const passOn = passEnabled();
    const passLine = passOn && cur === 'free' ? '<p class="plan-pass">' + esc(T('pass_line').replace('{price}', priceText(CONFIG.PLANS.PASS_PRICE, lang))) + '</p>' : '';
    const card = (id, cls, flag, amount, monthly, cta, extra) => '<article class="plan' + cls + (cur === id ? ' is-current' : '') + '">' +
      (flag ? '<span class="plan-flag">' + esc(flag) + '</span>' : '') +
      '<h3>' + esc(T(id + '_name')) + '</h3><p class="plan-for">' + esc(T(id + '_for')) + '</p>' +
      price(amount, monthly) + (extra || '') + list(T(id + '_f')) + '<div class="plan-cta">' + cta + '</div></article>';
    host.innerHTML = '<div class="plans">' +
      card('free', '', '', '0', false, freeCta) +
      card('pro', ' is-featured', T('popular'), CONFIG.PLANS.PRO_PRICE, true, proCta, passLine) +
      card('max', ' plan-max', '', CONFIG.PLANS.MAX_PRICE, true, maxCta) +
      '</div><p class="plan-note">' + T('note') + '</p><p class="plan-bill">' + esc(T(passOn ? 'bill_pass' : 'bill')) + '</p>';
    $$('[data-upgrade]', host).forEach(b => b.addEventListener('click', () => plan.upgrade(b.dataset.upgrade)));
    $$('[data-waitlist]', host).forEach(b => b.addEventListener('click', openWaitlist));
    $$('[data-manage]', host).forEach(b => b.addEventListener('click', openManage));
  }
  function openUpgrade() {
    const lang = langNow(), T = k => planText(k, lang);
    analytics.track('upgrade_opened', { sheet: 'upgrade', step: auth.enabled() && !auth.user ? 'sign_in' : pay.enabled() ? 'payme' : manual.enabled() ? 'card_transfer' : 'telegram' });
    if (auth.enabled() && !auth.user) {
      modal({
        title: T('up_title'), html: '<p>' + esc(T('up_signin')) + '</p>',
        actions: [{ label: T('close'), kind: 'ghost' }, { label: T('up_signin_btn'), kind: 'primary', onClick: () => { location.href = loginUrl('practice.html#plans'); } }]
      });
      return;
    }
    if (pay.enabled()) { openCheckout(); return; }
    if (manual.enabled()) { openManualPay(); return; }
    const email = auth.user ? auth.user.email : '';
    const steps = T('up_steps').map(s => esc(s.replace('{price}', priceText(CONFIG.PLANS.PRO_PRICE, lang))));
    if (email) steps[2] += '<span class="up-email"><b>' + esc(email) + '</b><button type="button" class="link-btn" data-copy>' + esc(T('up_copy')) + '</button></span>';
    else steps.pop();
    const m = modal({
      title: T('up_title'),
      html: '<p>' + esc(T('up_intro')) + '</p><ol class="up-steps">' + steps.map(s => '<li>' + s + '</li>').join('') + '</ol>',
      actions: [{ label: T('close'), kind: 'ghost' }, { label: T('up_tg'), kind: 'primary', onClick: () => { window.open(CONFIG.CONTACT_TELEGRAM, '_blank', 'noopener'); } }]
    });
    const cp = m.el.querySelector('[data-copy]');
    if (cp) cp.addEventListener('click', () => copyText(email, T('copied')));
  }
  // "Part of Pro" sheet: what Pro gives, the price, one button. Locked tests
  // and the blurred Pro previews (lockBox) open it.
  function openPitch(opts) {
    const lang = langNow(), T = k => planText(k, lang);
    const pass = passEnabled() ? '<p class="pitch-pass">' + esc(T('pass_line').replace('{price}', priceText(CONFIG.PLANS.PASS_PRICE, lang))) + '</p>' : '';
    analytics.track('upgrade_opened', { sheet: 'pitch', title: opts.title || '' });
    modal({
      title: opts.title || T('up_title'),
      html: (opts.text ? '<p>' + esc(opts.text) + '</p>' : '') + '<p class="muted">' + esc(T('pitch_lead')) + '</p>' +
        '<ul class="plan-list">' + T('pro_f').map(i => '<li>' + esc(i) + '</li>').join('') + '</ul>' +
        '<p class="pitch-price"><b>' + esc(priceText(CONFIG.PLANS.PRO_PRICE, lang)) + '</b> ' + esc(T('per_month')) + '</p>' + pass,
      actions: [{ label: T('pitch_later'), kind: 'ghost' }, { label: T('cta_pro'), kind: 'primary', onClick: () => { setTimeout(openUpgrade, 0); } }]
    });
  }
  // A blurred preview of a Pro-only part of a page, with one button that opens
  // the pitch sheet (any [data-pitch] element does; see initChrome).
  // feature names it in analytics: 'weak_skills', 'domains', 'review', 'drills'.
  function lockBox(inner, title, text, feature) {
    return '<div class="pro-lock"><div class="pro-lock-blur" aria-hidden="true" inert>' + inner + '</div>' +
      '<div class="pro-lock-over"><b>' + esc(title) + '</b>' + (text ? '<span>' + esc(text) + '</span>' : '') +
      '<button type="button" class="btn btn-primary btn-sm" data-pitch="' + esc(title) + '"' + (feature ? ' data-pitch-feature="' + esc(feature) + '"' : '') + '>' + esc(planText('lock_btn')) + '</button></div></div>';
  }

  // Max waitlist: waitlist/<uid> holds the student's Telegram username, so you
  // can message them the day Max opens (admin.html lists them).
  function openWaitlist() {
    const lang = langNow(), T = k => planText(k, lang);
    if (auth.enabled() && !auth.user) {
      modal({
        title: T('wl_title'), html: '<p>' + esc(T('wl_intro')) + '</p><p>' + esc(T('wl_signin')) + '</p>',
        actions: [{ label: T('close'), kind: 'ghost' }, { label: T('up_signin_btn'), kind: 'primary', onClick: () => { location.href = loginUrl('practice.html#plans'); } }]
      });
      return;
    }
    const ui = stepModal(T('wl_title'), lang);
    const { show, row, closeBtn } = ui;
    const canSave = manual.canSave();
    const docRef = async () => { const fs = await sync._lib(); return { fs, ref: fs.doc(sync.db, 'waitlist', auth.user.uid) }; };
    function done(tg) {
      store.set('waitlist', tg);
      $$('[data-waitlist]').forEach(b => { b.textContent = T('cta_wait_on'); });
      show('<p class="pay-ok">' + esc(T('wl_done_t')) + '</p><p>' + esc(T('wl_done').replace('{tg}', tg)) + '</p>' +
        row('<button type="button" class="btn btn-ghost" data-change>' + esc(T('wl_change')) + '</button>' + closeBtn()), '[data-close]');
      $('[data-change]', ui.box).addEventListener('click', () => form(tg));
    }
    function form(prefill, msg) {
      show('<form class="pay-card" novalidate><p>' + esc(T('wl_intro')) + '</p>' +
        '<div class="field"><label for="wl-tg">' + esc(T('wl_label')) + '</label>' +
        '<input id="wl-tg" class="input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="@username" maxlength="45" value="' + esc(prefill || '') + '"></div>' +
        '<p class="pay-err" role="alert"' + (msg ? '' : ' hidden') + '>' + esc(msg || '') + '</p>' +
        row(closeBtn() + '<button type="submit" class="btn btn-primary">' + esc(T('wl_join')) + '</button>') + '</form>', '#wl-tg');
      const f = $('form', ui.box), inp = $('#wl-tg', f), err = $('.pay-err', f);
      f.addEventListener('submit', async e => {
        e.preventDefault();
        const name = inp.value.trim().replace(/^(https?:\/\/)?t\.me\//i, '').replace(/^@/, '');
        if (!/^[A-Za-z0-9_]{5,32}$/.test(name)) { err.textContent = T('wl_bad'); err.hidden = false; inp.focus(); return; }
        const tg = '@' + name;
        $$('button, input', f).forEach(el => { el.disabled = true; });
        try {
          if (!canSave) throw new Error('Sign-in is not available');
          const { fs, ref } = await docRef();
          await fs.setDoc(ref, { uid: auth.user.uid, email: auth.user.email, name: (auth.user.name || '').slice(0, 100), telegram: tg, lang, createdAt: fs.serverTimestamp() });
          analytics.track('waitlist_joined', { plan: 'max', changed: !!prefill });
          done(tg);
        } catch (ex) {
          console.warn('[SAT Ustoz] Could not save the waitlist entry. Are the new firestore.rules published?', ex);
          form(tg, T('wl_failed'));
        }
      });
    }
    if (!canSave) { form(store.get('waitlist', '')); return; }
    docRef().then(({ fs, ref }) => fs.getDoc(ref))
      .then(s => { if (s.exists() && s.data().telegram) done(s.data().telegram); else { store.del('waitlist'); form(''); } })
      .catch(() => form(store.get('waitlist', '')));
  }

  function copyText(text, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast(msg), () => toast(text));
    else toast(text);
  }

  // Card transfer: the card and price, then the last 4 digits of the student's
  // card, then the receipt screenshot on Telegram (that message is how you hear
  // about it). A note from the last 7 days means we are still checking it.
  function openManualPay() {
    const lang = langNow(), T = k => planText(k, lang);
    const ui = stepModal(T('up_title'), lang);
    const { show, row, closeBtn } = ui;
    const digits = manual.card(), holder = String(CONFIG.MANUAL_PAY.CARD_HOLDER || '').trim();
    // One month, or the "until your test" pass (chosen on the first screen when it is on).
    const passMonths = Number(CONFIG.PLANS.PASS_MONTHS) || 0;
    let months = 1, amount = CONFIG.PLANS.PRO_PRICE, price = priceText(amount, lang);
    const pick = m => { months = m; amount = m > 1 ? CONFIG.PLANS.PASS_PRICE : CONFIG.PLANS.PRO_PRICE; price = priceText(amount, lang); };
    const email = auth.user ? auth.user.email : '';
    const tgLink = last4 => CONFIG.CONTACT_TELEGRAM + '?text=' + encodeURIComponent(T('mp_tg_msg').replace('{price}', price).replace('{email}', email || '-').replace('{card}', last4 || '----'));
    const tgBtn = last4 => '<a class="btn btn-primary" href="' + esc(tgLink(last4)) + '" target="_blank" rel="noopener">' + esc(T('mp_tg')) + '</a>';
    const line = (k, v, copy) => '<div class="mp-row"><span class="mp-k">' + esc(T(k)) + '</span><b>' + esc(v) + '</b>' +
      (copy ? '<button type="button" class="link-btn" data-copy="' + copy + '">' + esc(T('up_copy')) + '</button>' : '') + '</div>';
    const bindCopies = () => $$('[data-copy]', ui.box).forEach(b => b.addEventListener('click', () => {
      if (b.dataset.copy === 'card') copyText(digits, T('mp_card_copied'));
      else if (b.dataset.copy === 'amount') copyText(String(somNumber(amount)), T('mp_amount_copied'));
      else copyText(email, T('copied'));
    }));

    if (manual.canSave()) manual.get().then(r => {
      const at = r && r.createdAt && typeof r.createdAt.toMillis === 'function' ? r.createdAt.toMillis() : 0;
      if (at > Date.now() - 7 * 86400000) { if (r.months > 1) pick(r.months); pending(at, r.last4); } else start();
    }).catch(() => start());
    else start();

    function start() { if (passEnabled()) choose(); else details(); }

    function choose() {
      const opt = (m, title, desc) => '<button type="button" class="pay-opt" data-months="' + m + '"><b>' + esc(title) + '</b><span>' + esc(desc) + '</span></button>';
      show('<p>' + esc(T('mp_choose')) + '</p><div class="pay-options">' +
        opt(1, T('mp_month_t'), priceText(CONFIG.PLANS.PRO_PRICE, lang)) +
        opt(passMonths, T('mp_pass_t'), T('mp_pass_d').replace('{price}', priceText(CONFIG.PLANS.PASS_PRICE, lang))) +
        '</div>' + row(closeBtn()), '.pay-opt');
      $$('[data-months]', ui.box).forEach(b => b.addEventListener('click', () => { pick(Number(b.dataset.months)); details(); }));
    }

    function details() {
      show('<p>' + esc(T('mp_intro').replace('{price}', price)) + '</p><div class="mp-card">' +
        line('mp_card', digits.replace(/(\d{4})(?=\d)/g, '$1 '), 'card') +
        (holder ? line('mp_name', holder) : '') +
        line('mp_amount', price, 'amount') +
        '</div><p class="mp-note">' + esc(T('mp_note')) + '</p>' +
        row((passEnabled() ? '<button type="button" class="btn btn-ghost" data-back>' + esc(T('pay_back')) + '</button>' : closeBtn()) +
          '<button type="button" class="btn btn-primary" data-paid>' + esc(T('mp_paid')) + '</button>'), '[data-paid]');
      bindCopies();
      const back = $('[data-back]', ui.box); if (back) back.addEventListener('click', choose);
      $('[data-paid]', ui.box).addEventListener('click', form);
    }

    function form() {
      show('<form class="pay-card" novalidate><p>' + esc(T('mp_form')) + '</p>' +
        '<div class="field mp-last4"><label for="mp-last4">' + esc(T('mp_last4')) + '</label>' +
        '<input id="mp-last4" class="input" inputmode="numeric" autocomplete="off" placeholder="0000" maxlength="4"></div>' +
        '<div class="field"><label for="mp-receipt">' + esc(T('mp_receipt')) + '</label>' +
        '<input id="mp-receipt" class="input" autocomplete="off" maxlength="60"></div>' +
        '<p class="pay-err" role="alert" hidden></p>' +
        row('<button type="button" class="btn btn-ghost" data-back>' + esc(T('pay_back')) + '</button><button type="submit" class="btn btn-primary">' + esc(T('mp_send')) + '</button>') +
        '</form>', '#mp-last4');
      const f = $('form', ui.box), last = $('#mp-last4', f), rec = $('#mp-receipt', f), err = $('.pay-err', f);
      last.addEventListener('input', () => { last.value = last.value.replace(/\D/g, '').slice(0, 4); });
      $('[data-back]', f).addEventListener('click', details);
      f.addEventListener('submit', async e => {
        e.preventDefault();
        const l4 = last.value.replace(/\D/g, '');
        if (l4.length !== 4) { err.textContent = T('mp_bad_last4'); err.hidden = false; last.focus(); return; }
        err.hidden = true;
        $$('button, input', f).forEach(el => { el.disabled = true; });
        // If saving fails (new rules not published, no connection) the Telegram
        // message still reaches you, so the student is never stuck here.
        let saved = false;
        if (manual.canSave()) {
          try { await manual.send(l4, rec.value.trim().slice(0, 60), lang, months); saved = true; }
          catch (ex) { console.warn('[SAT Ustoz] Could not save the payment note. Are the new firestore.rules published?', ex); }
        }
        analytics.track('pay_note_sent', { months, amount: somNumber(amount), saved });
        sent(l4);
      });
    }

    function sent(l4) {
      show('<p class="pay-ok">' + esc(T('mp_sent_t')) + '</p><p>' + esc(T('mp_sent')) + '</p>' +
        (email ? '<p class="up-email"><span>' + esc(T('mp_account')) + ' <b>' + esc(email) + '</b></span><button type="button" class="link-btn" data-copy="email">' + esc(T('up_copy')) + '</button></p>' : '') +
        row(closeBtn() + tgBtn(l4)), 'a.btn-primary');
      bindCopies();
    }

    function pending(at, l4) {
      show('<p>' + esc(T('mp_pending').replace('{d}', fmtDate(at))) + '</p><p class="muted">' + esc(T('mp_pending_tg')) + '</p>' +
        row('<button type="button" class="btn btn-ghost" data-again>' + esc(T('mp_again')) + '</button>' + closeBtn() + tgBtn(l4)), '[data-close]');
      $('[data-again]', ui.box).addEventListener('click', () => { pick(1); start(); });
    }
  }

  // A modal whose body this code redraws step by step (it brings its own buttons).
  function stepModal(title, lang) {
    const T = k => planText(k, lang);
    const m = modal({ title, html: '<p class="muted" aria-live="polite">' + esc(T('pay_preparing')) + '</p>', actions: [] });
    m.el.querySelector('.modal-actions').remove();
    const box = m.el.querySelector('.modal-body');
    return {
      m, box,
      show(html, focusSel) {
        box.innerHTML = html;
        $$('[data-close]', box).forEach(b => b.addEventListener('click', () => m.close()));
        const f = focusSel && box.querySelector(focusSel);
        if (f) f.focus();
      },
      row: btns => '<div class="modal-actions">' + btns + '</div>',
      closeBtn: label => '<button type="button" class="btn btn-ghost" data-close>' + esc(label || T('close')) + '</button>'
    };
  }

  // Online payment: the card form (Pro renews every month) or Payme's own page (one month).
  function openCheckout() {
    const lang = langNow(), T = k => planText(k, lang);
    const ui = stepModal(T('up_title'), lang);
    const { show, row, closeBtn } = ui;
    const powered = '<p class="pay-powered">' + esc(T('pay_powered')) + ' <img src="' + PAYME_LOGO + '" alt="Payme" width="64" height="20"></p>';
    const help = '<p class="pay-help"><a href="' + esc(CONFIG.CONTACT_TELEGRAM) + '" target="_blank" rel="noopener">' + esc(T('tg_help')) + '</a></p>';
    const errorBox = (form, msg) => { const e = form.querySelector('.pay-err'); e.textContent = msg || ''; e.hidden = !msg; };
    const busy = (form, on) => { $$('button, input', form).forEach(el => { el.disabled = on; }); form.setAttribute('aria-busy', on ? 'true' : 'false'); };
    let co = null, price = '';

    // A new order (the old one expired or was used up), then straight back to the card form.
    function start(next, msg) {
      show('<p class="muted" aria-live="polite">' + esc(T('pay_preparing')) + '</p>');
      pay.call('/checkout').then(r => {
        co = r; price = priceText(fmtSom(r.amount), lang);
        next(msg);
      }).catch(e => show('<p>' + esc(e.message) + '</p>' + help + row(closeBtn()), '[data-close]'));
    }
    start(choose);

    function choose() {
      show('<p>' + esc(T('pay_choose').replace('{price}', price)) + '</p><div class="pay-options">' +
        (co.card ? '<button type="button" class="pay-opt" data-opt="card"><b>' + esc(T('pay_card_t')) + '</b><span>' + esc(T('pay_card_d').replace('{price}', price)) + '</span></button>' : '') +
        '<button type="button" class="pay-opt" data-opt="page"><b>' + esc(T('pay_page_t')) + '</b><span>' + esc(T('pay_page_d')) + '</span></button></div>' +
        powered + row(closeBtn()), '.pay-opt');
      $$('[data-opt]', ui.box).forEach(b => b.addEventListener('click', () => {
        if (b.dataset.opt === 'card') { cardForm(); return; }
        b.disabled = true;
        b.querySelector('span').textContent = T('pay_opening');
        location.href = co.url;
      }));
    }

    // Payme's rules for card forms: inputs without "name", a form without
    // "action", the Payme logo, a link to Payme's terms, and a note that the
    // card is kept by Payme.
    function cardForm(msg) {
      show('<form class="pay-card" novalidate>' +
        '<div class="pay-fields"><div class="field"><label for="pc-num">' + esc(T('pay_num')) + '</label>' +
        '<input id="pc-num" class="input" inputmode="numeric" autocomplete="cc-number" placeholder="0000 0000 0000 0000" maxlength="23"></div>' +
        '<div class="field pay-exp"><label for="pc-exp">' + esc(T('pay_exp')) + '</label>' +
        '<input id="pc-exp" class="input" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/YY" maxlength="5"></div></div>' +
        '<p class="pay-safe">' + esc(T('pay_safe')) + '</p>' +
        '<p class="pay-terms">' + esc(T('pay_terms').replace('{price}', price)).replace('{terms}', '<a href="' + PAYME_TERMS + '" target="_blank" rel="noopener">' + esc(T('pay_terms_link')) + '</a>') + '</p>' +
        powered + '<p class="pay-err" role="alert" hidden></p>' +
        row('<button type="button" class="btn btn-ghost" data-back>' + esc(T('pay_back')) + '</button><button type="submit" class="btn btn-primary">' + esc(T('pay_continue')) + '</button>') +
        '</form>', '#pc-num');
      const form = $('form', ui.box), num = $('#pc-num', form), exp = $('#pc-exp', form);
      if (msg) errorBox(form, msg);
      num.addEventListener('input', () => { num.value = num.value.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 '); });
      exp.addEventListener('input', () => { const d = exp.value.replace(/\D/g, '').slice(0, 4); exp.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; });
      $('[data-back]', form).addEventListener('click', choose);
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const number = num.value.replace(/\D/g, ''), expire = exp.value.replace(/\D/g, '');
        if (number.length < 16) { errorBox(form, T('pay_bad_num')); num.focus(); return; }
        if (!/^(0[1-9]|1[0-2])\d{2}$/.test(expire)) { errorBox(form, T('pay_bad_exp')); exp.focus(); return; }
        errorBox(form, ''); busy(form, true);
        try { codeForm((await pay.call('/card/start', { orderId: co.orderId, number, expire })).phone); }
        catch (err) { busy(form, false); if (err.code === 'expired') start(cardForm); else errorBox(form, err.message); }
      });
    }

    function codeForm(phone) {
      show('<form class="pay-card" novalidate><p>' + esc(phone ? T('pay_sent').replace('{phone}', phone) : T('pay_sent_nophone')) + '</p>' +
        '<div class="field pay-code"><label for="pc-code">' + esc(T('pay_code')) + '</label>' +
        '<input id="pc-code" class="input" inputmode="numeric" autocomplete="one-time-code" maxlength="8"></div>' +
        '<p><button type="button" class="link-btn" data-resend>' + esc(T('pay_resend')) + '</button></p>' +
        '<p class="pay-err" role="alert" hidden></p>' +
        row('<button type="button" class="btn btn-ghost" data-back>' + esc(T('pay_back')) + '</button><button type="submit" class="btn btn-primary">' + esc(T('pay_pay').replace('{price}', price)) + '</button>') +
        '</form>', '#pc-code');
      const form = $('form', ui.box), code = $('#pc-code', form);
      $('[data-back]', form).addEventListener('click', () => cardForm());
      $('[data-resend]', form).addEventListener('click', async ev => {
        const b = ev.currentTarget;
        b.disabled = true;
        try { await pay.call('/card/resend'); toast(T('pay_resent')); }
        catch (err) { if (err.code === 'expired') { start(cardForm, err.message); return; } errorBox(form, err.message); }
        setTimeout(() => { b.disabled = false; }, 30000);
      });
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const c = code.value.replace(/\D/g, '');
        if (c.length < 4) { errorBox(form, T('pay_bad_code')); code.focus(); return; }
        errorBox(form, ''); busy(form, true);
        try { done(await pay.call('/card/verify', { code: c })); }
        catch (err) {
          busy(form, false);
          // A declined card or an expired code needs the card form again, with a new order.
          if (err.code === 'expired' || err.code === 'declined') start(cardForm, err.message);
          else errorBox(form, err.message);
        }
      });
    }

    async function done(r) {
      if (r.state === 'pending') { show('<p>' + esc(T('pay_pending')) + '</p>' + row(closeBtn()), '[data-close]'); return; }
      try { await plan.refresh(); } catch (e) { /* the next sync picks it up */ }
      show('<p class="pay-ok">' + esc(T('pay_ok_t')) + '</p><p>' + esc(T('pay_ok').replace('{d}', fmtDate(r.until))) + '</p>' +
        '<p class="muted">' + esc(T('pay_ok_renew').replace('{price}', price).replace('{card}', r.card || '')) + '</p>' +
        row(closeBtn() + '<a class="btn btn-primary" href="practice.html#tests">' + esc(T('open_tests')) + '</a>'), '.btn-primary');
      $('a.btn-primary', ui.box).addEventListener('click', () => ui.m.close());
    }
  }

  // Plans page: when Pro ends, and stopping or restarting automatic renewal.
  function openManage() {
    const lang = langNow(), T = k => planText(k, lang);
    const ui = stepModal(T('manage_t'), lang);
    const { show, row, closeBtn } = ui;
    function load() {
      show('<p class="muted" aria-live="polite">' + esc(T('m_loading')) + '</p>');
      pay.call('/status').then(s => {
        const before = JSON.stringify(store.get('plan', null));
        if (s.plan) store.set('plan', { id: String(s.plan), until: Number(s.until) || 0 }); else store.del('plan');
        if (JSON.stringify(store.get('plan', null)) !== before) { try { document.dispatchEvent(new CustomEvent('sh:synced')); } catch (e) { /* ignore */ } }
        const d = s.until ? fmtDate(s.until) : '';
        let html = d ? '<p>' + esc(T('m_until').replace('{d}', d)) + '</p>' : '';
        if (s.renew) {
          html += '<p>' + esc(T('m_renew').replace('{price}', priceText(fmtSom(s.renew.amount), lang)).replace('{card}', s.renew.card)) + '</p>' +
            (s.renew.pending ? '<p class="muted">' + esc(T('m_renew_pending')) + '</p>' : '');
          show(html + row(closeBtn() + '<button type="button" class="btn btn-ghost pay-stop" data-stop>' + esc(T('m_stop')) + '</button>'), '[data-close]');
          $('[data-stop]', ui.box).addEventListener('click', () => confirmStop(d));
        } else {
          if (d) html += '<p class="muted">' + esc(T('m_off')) + '</p>';
          show(html + row(closeBtn() + '<button type="button" class="btn btn-primary" data-more>' + esc(T('m_more')) + '</button>'), '[data-more]');
          $('[data-more]', ui.box).addEventListener('click', () => { ui.m.close(); openCheckout(); });
        }
      }).catch(e => show('<p>' + esc(e.message) + '</p>' + row(closeBtn()), '[data-close]'));
    }
    function confirmStop(d) {
      show('<p>' + esc(T('m_stop_q').replace('{d}', d)) + '</p><p class="pay-err" role="alert" hidden></p>' +
        row('<button type="button" class="btn btn-ghost" data-back>' + esc(T('cancel')) + '</button><button type="button" class="btn btn-primary" data-yes>' + esc(T('m_stop')) + '</button>'), '[data-back]');
      $('[data-back]', ui.box).addEventListener('click', load);
      $('[data-yes]', ui.box).addEventListener('click', async ev => {
        const b = ev.currentTarget;
        b.disabled = true;
        try { await pay.call('/cancel'); toast(T('m_stopped')); load(); }
        catch (e) { const el = $('.pay-err', ui.box); el.textContent = e.message; el.hidden = false; b.disabled = false; }
      });
    }
    load();
  }

  // Back from Payme's page (practice.html?paid): wait for Payme to tell the Worker.
  async function paymentReturn() {
    let back = false;
    try { back = new URLSearchParams(location.search).has('paid'); } catch (e) { /* ignore */ }
    if (!back) return;
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* ignore */ }
    if (!pay.enabled()) return;
    await auth.ready();
    if (!auth.user) return;
    const before = plan.until();
    for (let i = 0; i < 5; i++) {
      try {
        if (await plan.refresh() !== 'free' && plan.until() > before) { toast(planText('pay_back_ok').replace('{d}', fmtDate(plan.until())), 6000); return; }
      } catch (e) { /* try again */ }
      await new Promise(r => setTimeout(r, 2500));
    }
    toast(planText('pay_back_wait'), 7000);
  }

  /* ------------------------------------------------------------------
     Floating panel (draggable, resizable) + Desmos calculator
     ------------------------------------------------------------------ */
  function makePanel(title, w, h, extraHead, side) {
    const p = document.createElement('div');
    p.className = 'fpanel'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', title);
    p.style.width = w + 'px'; p.style.height = h + 'px';
    p.style.top = (side === 'right' ? 150 : 90) + 'px';
    p.style.left = side === 'right' ? Math.max(8, window.innerWidth - w - 16) + 'px' : '16px';
    p.innerHTML = '<div class="fpanel-head"><b>' + esc(title) + '</b>' + (extraHead || '') +
      '<button type="button" data-a="size">Expand</button><button type="button" data-a="close" aria-label="Close ' + esc(title) + '">Close</button></div><div class="fpanel-body"></div>';
    document.body.appendChild(p);
    const head = p.querySelector('.fpanel-head');
    head.addEventListener('pointerdown', e => {
      if (e.target.closest('button, a') || p.hasAttribute('data-docked')) return;
      head.setPointerCapture(e.pointerId);
      p.classList.add('dragging');
      const sx = e.clientX, sy = e.clientY, ox = p.offsetLeft, oy = p.offsetTop;
      const move = ev => {
        p.style.left = Math.max(0, Math.min(window.innerWidth - 80, ox + ev.clientX - sx)) + 'px';
        p.style.top = Math.max(0, Math.min(window.innerHeight - 40, oy + ev.clientY - sy)) + 'px';
      };
      const up = () => { p.classList.remove('dragging'); head.removeEventListener('pointermove', move); head.removeEventListener('pointerup', up); head.removeEventListener('pointercancel', up); };
      head.addEventListener('pointermove', move); head.addEventListener('pointerup', up); head.addEventListener('pointercancel', up);
    });
    let big = false;
    p.querySelector('[data-a="size"]').addEventListener('click', e => {
      big = !big; e.currentTarget.textContent = big ? 'Collapse' : 'Expand';
      p.style.width = (big ? Math.min(window.innerWidth - 32, Math.round(w * 1.7)) : w) + 'px';
      p.style.height = (big ? Math.min(window.innerHeight - 110, Math.round(h * 1.3)) : h) + 'px';
      if (big) { p.style.left = Math.max(8, Math.min(p.offsetLeft, window.innerWidth - p.offsetWidth - 8)) + 'px'; p.style.top = Math.max(8, Math.min(p.offsetTop, window.innerHeight - p.offsetHeight - 8)) + 'px'; }
    });
    return p;
  }
  // On wide screens the calculator docks beside the question (like Bluebook)
  // instead of floating over it. Pages describe where with setDock().
  const calculator = {
    panel: null, btn: null, dock: null, big: false,
    isOpen() { return !!(this.panel && this.panel.isConnected && !this.panel.hidden); },
    sync() { if (this.btn) this.btn.setAttribute('aria-pressed', String(this.isOpen())); },
    setDock(cfg) { this.dock = cfg; this.layout(); },
    layout() {
      const p = this.panel, d = this.dock;
      const on = !!(d && this.isOpen() && window.innerWidth >= (d.minWidth || 1024));
      if (p) { if (on) p.setAttribute('data-docked', ''); else p.removeAttribute('data-docked'); p.classList.toggle('docked-flat', on && !!(d && d.flat)); }
      if (!d) return;
      if (!on) { d.apply(false, 0); return; }
      const g = d.geometry();
      const w = Math.round(this.big ? Math.min(760, window.innerWidth * 0.5) : Math.min(480, window.innerWidth * 0.38));
      Object.assign(p.style, {
        top: g.top + 'px', height: Math.max(240, g.bottom - g.top) + 'px', width: w + 'px',
        left: (d.side === 'left' ? g.gap : window.innerWidth - w - g.gap) + 'px'
      });
      d.apply(true, w + g.gap * 2);
    },
    toggle(btn, side) {
      if (btn) this.btn = btn;
      if (this.panel && this.panel.isConnected) { this.panel.hidden = !this.panel.hidden; this.sync(); this.layout(); return; }
      const url = CONFIG.DESMOS_URL;
      this.big = false;
      this.panel = makePanel('Calculator', 480, 560, '<a href="' + esc(url) + '" target="_blank" rel="noopener">New window</a>', side);
      this.panel.querySelector('[data-a="close"]').addEventListener('click', () => { this.panel.hidden = true; this.sync(); this.layout(); });
      this.panel.querySelector('[data-a="size"]').addEventListener('click', () => { this.big = !this.big; this.layout(); });
      this.panel.querySelector('.fpanel-body').innerHTML = '<iframe src="' + esc(url) + '" title="Desmos graphing calculator" allow="clipboard-read; clipboard-write"></iframe>';
      this.sync();
      this.layout();
    },
    close() { if (this.panel) this.panel.remove(); this.panel = null; this.sync(); this.layout(); }
  };
  let resizeT = null;
  window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => calculator.layout(), 100); });
  const CALC_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2.5" width="14" height="19" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="8" y="5.5" width="8" height="4" rx=".6" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="13" r="1" fill="currentColor"/><circle cx="12" cy="13" r="1" fill="currentColor"/><circle cx="15" cy="13" r="1" fill="currentColor"/><circle cx="9" cy="17" r="1" fill="currentColor"/><circle cx="12" cy="17" r="1" fill="currentColor"/><circle cx="15" cy="17" r="1" fill="currentColor"/></svg>';

  /* ------------------------------------------------------------------
     Product analytics (PostHog, CONFIG.ANALYTICS)
     Only on pages whose sh.js tag has data-analytics (index, practice,
     test, login; not admin or builder). Events and page views only: no
     session recording, no autocapture, nothing typed into a field. A
     signed-in student is known by their Firebase uid, never their email.
     ------------------------------------------------------------------ */
  const analytics = {
    on: false, who: null,
    enabled() { const a = CONFIG.ANALYTICS; return !!(a && a.KEY && a.HOST && SCRIPT && SCRIPT.hasAttribute('data-analytics')); },
    init() {
      if (this.on || !this.enabled()) return;
      this.on = true;
      const host = CONFIG.ANALYTICS.HOST.replace(/\/+$/, '');
      loadPosthog(host).init(CONFIG.ANALYTICS.KEY, {
        api_host: host,
        person_profiles: 'identified_only',
        capture_pageview: true, capture_pageleave: true,
        autocapture: false, rageclick: false, capture_dead_clicks: false, enable_heatmaps: false,
        disable_session_recording: true, disable_surveys: true,
        mask_all_text: true, mask_all_element_attributes: true, respect_dnt: true
      });
    },
    track(name, props) {
      if (!this.on) return;
      // The page language is read per event: index.html sets it after this file runs.
      try { window.posthog.capture(name, Object.assign({ lang: langNow() }, props)); } catch (e) { /* never break the page */ }
    },
    identify(id) {
      if (!this.on || !id || this.who === id) return;
      this.who = id;
      try { window.posthog.identify(id); } catch (e) { /* ignore */ }
    },
    reset() {
      if (!this.on) return;
      this.who = null;
      try { window.posthog.reset(); } catch (e) { /* ignore */ }
    },
    // After the plan is read from Firestore (or the payments Worker): the plan
    // goes on every event, and Free -> Pro on this device counts as "paid".
    // was is null when this device knew no plan for this account yet.
    planSynced(was, source) {
      if (!this.on) return;
      const now = plan.current();
      try {
        window.posthog.register({ plan: now });
        window.posthog.setPersonProperties({ plan: now });
      } catch (e) { /* ignore */ }
      if (was === 'free' && now !== 'free') {
        const until = plan.until();
        this.track('paid', { plan: now, source, days: until ? Math.round((until - Date.now()) / 86400000) : null });
      }
    }
  };
  // PostHog's loader, written out: a stand-in window.posthog queues calls until
  // array.js arrives from PostHog's CDN, which then replays them.
  function loadPosthog(host) {
    if (window.posthog) return window.posthog; // already on the page
    const ph = window.posthog = [];
    ph._i = []; ph.people = []; ph.__SV = 1;
    ['capture', 'identify', 'reset', 'register', 'setPersonProperties'].forEach(m => {
      ph[m] = function () { ph.push([m].concat(Array.prototype.slice.call(arguments))); };
    });
    ph.init = (key, opts) => { ph._i.push([key, opts, undefined]); };
    const s = document.createElement('script');
    s.async = true; s.crossOrigin = 'anonymous';
    s.src = host.replace('.i.posthog.com', '-assets.i.posthog.com') + '/static/array.js';
    document.head.appendChild(s);
    return ph;
  }
  analytics.init();
  const track = (name, props) => analytics.track(name, props);

  /* ------------------------------------------------------------------
     Page chrome: mobile nav, footer year
     ------------------------------------------------------------------ */
  function initChrome() {
    if (auth.enabled()) auth.ready();
    paymentReturn();
    const btn = $('.menu-btn'), nav = $('.nav');
    if (btn && nav) {
      const set = open => { nav.classList.toggle('open', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); };
      btn.addEventListener('click', () => set(!nav.classList.contains('open')));
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { set(false); btn.focus(); } });
      document.addEventListener('click', e => { if (nav.classList.contains('open') && !nav.contains(e.target) && !btn.contains(e.target)) set(false); });
      $$('a', nav).forEach(a => a.addEventListener('click', () => set(false)));
    }
    $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
    // Locked tests and blurred Pro previews: <button data-pitch="Sheet title">
    document.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('[data-pitch]');
      if (!b) return;
      e.preventDefault();
      // data-pitch-test="<test id>" on a locked test; data-pitch-feature on the other previews.
      if (b.dataset.pitchTest) track('locked_test_tapped', { test_id: b.dataset.pitchTest });
      else track('pro_preview_tapped', { feature: b.dataset.pitchFeature || 'other', title: b.dataset.pitch });
      plan.pitch({ title: b.dataset.pitch, text: b.dataset.pitchText || '' });
    });
    // Header gets a hairline and shadow once the page scrolls
    const hdr = $('.site-header');
    if (hdr) {
      let ticking = false;
      const paint = () => { hdr.classList.toggle('is-scrolled', window.scrollY > 6); ticking = false; };
      window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
      paint();
    }
    $$('[data-link="telegram"]').forEach(a => { a.href = CONFIG.CONTACT_TELEGRAM; });
    $$('[data-link="channel"]').forEach(a => { a.href = CONFIG.CHANNEL_TELEGRAM; });
    $$('[data-link="instagram"]').forEach(a => { a.href = CONFIG.INSTAGRAM; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initChrome); else initChrome();

  window.SH = {
    CONFIG, TAXONOMY, LETTERS, domainOf, store, $, $$, esc, uid, shuffle, fmtClock, fmtDate, pct,
    renderRich, renderMath, renderTable, renderStimulus, normalizeQuestion, normalizeList,
    isCorrect, sprSanitize, sprPreview, answerLabel, parseNum,
    getJSON, loadCatalog, loadSet, loadAllBank, loadTest,
    getAttempts, recordAttempts, skillStats, weakSkills, getProfile, setProfile, getTestHistory, addTestHistory,
    ai, toast, modal, openTutor, makePanel, calculator, CALC_ICON,
    auth, sync, authReady, renderAuthSlots, requireLogin, loginUrl, safeNext, inAppBrowser,
    plan, renderPlans, pay, lockBox, analytics, track
  };
})();
