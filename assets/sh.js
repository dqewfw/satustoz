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
    AI_ENDPOINT: 'https://satustoz-ai.azizbeekk7.workers.dev',

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
    // "Continue with Apple" on the sign-in page. Needs an Apple Developer
    // account and Apple switched on in Firebase (README "Sign in with Apple").
    APPLE_SIGNIN: false,

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
      FREE_CHANGED_AT: '2026-10-19',
      // Launch offer: true opens Practice Tests 1 to 10 to everyone (Pro keeps the
      // skill breakdown, question review, skill sets and drills). Tests marked
      // "proOnly" in data/catalog.json (11 to 15) stay Pro either way. Set it to
      // false to go back to Tests 4 to 15 (and 2 and 3 for new students) being Pro.
      // While it's true, keep every test file in data/tests/ (don't use
      // TESTS_ENDPOINT): students without Pro load the tests from there.
      TESTS_FREE_FOR_LAUNCH: true
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
    // Your learning center, offered after the free diagnostic to students who
    // want a teacher (a free 15-minute call or a trial lesson). Empty URL: the
    // offer opens a Telegram message to CONTACT_TELEGRAM instead.
    LEARNING_CENTER: { NAME: 'Be Student', URL: '' },
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
  // Study data kept together in users/<uid>/data/study: the mistake notebook,
  // vocabulary progress, question of the day, saved drills, study plan, classes and lesson checks.
  const STUDY_KEYS = ['mistakes', 'vocab', 'daily', 'drills', 'studyPlan', 'classes', 'lessons'];
  const SYNCED_KEYS = ['attempts', 'testHistory', 'profile'].concat(STUDY_KEYS);
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
    const raw = meta.plan && meta.plan !== 'free' && !meta.legacyFree && (!CONFIG.PLANS.TESTS_FREE_FOR_LAUNCH || meta.proOnly) && pay.testsEnabled() ? await loadProTest(meta) : await getJSON(meta.file);
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
  const PROFILE_DEFAULTS = { name: '', target: 1400, testDate: '', grade: '', region: '', school: '', onboarded: false, updatedAt: 0 };
  function getProfile() { return Object.assign({}, PROFILE_DEFAULTS, store.get('profile', {})); }
  function setProfile(p) { store.set('profile', Object.assign(getProfile(), p, { updatedAt: Date.now() })); }
  function getTestHistory() { return store.get('testHistory', []); }
  function addTestHistory(rec) { store.set('testHistory', [rec].concat(getTestHistory()).slice(0, 40)); }
  // Regions of Uzbekistan for the national mock leaderboard and the profile.
  const REGIONS = ['Tashkent city', 'Tashkent region', 'Andijan', 'Bukhara', 'Fergana', 'Jizzakh', 'Kashkadarya', 'Khorezm', 'Namangan', 'Navoi', 'Samarkand', 'Surkhandarya', 'Syrdarya', 'Karakalpakstan', 'Outside Uzbekistan'];

  /* ------------------------------------------------------------------
     Days in Tashkent time (daily question, streaks, weekly plan)
     ------------------------------------------------------------------ */
  const TZ_MS = 5 * 3600000;
  const dayKey = ts => new Date((ts == null ? Date.now() : ts) + TZ_MS).toISOString().slice(0, 10);
  const dayNum = ts => Math.floor(((ts == null ? Date.now() : ts) + TZ_MS) / 86400000);
  // Monday 00:00 Tashkent time of the week ts falls in.
  function weekStart(ts) {
    const d = dayNum(ts), dow = (d + 3) % 7; // day 0 (1970-01-01) was a Thursday
    return (d - dow) * 86400000 - TZ_MS;
  }

  /* ------------------------------------------------------------------
     Study data maps: { id: { ..., t } }. Merging two copies (this device
     and the account) keeps the newer version of each item; a removed item
     stays as { deleted: true, t } so the other copy doesn't bring it back.
     ------------------------------------------------------------------ */
  function mergeStudy(cloud, local) {
    if (local === undefined || local === null) return cloud === null ? undefined : cloud;
    if (cloud === undefined || cloud === null) return local;
    const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
    if (isObj(cloud) && isObj(local)) {
      if (typeof cloud.t === 'number' || typeof local.t === 'number') return (local.t || 0) >= (cloud.t || 0) ? local : cloud;
      const out = {};
      Object.keys(cloud).concat(Object.keys(local)).forEach(k => { if (!(k in out)) out[k] = mergeStudy(cloud[k], local[k]); });
      return out;
    }
    return local;
  }
  const live = map => Object.keys(map || {}).map(k => map[k]).filter(v => v && !v.deleted);

  /* ------------------------------------------------------------------
     Mistake notebook: every wrong answer, by skill. Answering it right
     twice in a row (FIX_AFTER) marks it fixed. A Words in Context miss also
     puts the right word into the vocabulary "from your mistakes" deck.
     ------------------------------------------------------------------ */
  const FIX_AFTER = 2;
  const MAX_MISTAKES = 600;
  const mistakes = {
    map() { return store.get('mistakes', {}) || {}; },
    all() { return live(this.map()); },
    open() { return this.all().filter(e => !e.fixed); },
    // src: { type: 'set' | 'test' | 'ai', id: set or test id, where: a label for the list }
    record(q, ok, src) { this.recordMany([{ q, ok, src }]); },
    // One save for many answers (a finished practice test).
    recordMany(items) {
      const m = Object.assign({}, this.map());
      let changed = false;
      items.forEach(it => { if (this._apply(m, it.q, it.ok, it.src)) changed = true; });
      if (!changed) return;
      const now = Date.now();
      // Keep the notebook small enough for one Firestore document: fixed ones go first.
      const ids = Object.keys(m).filter(k => !m[k].deleted);
      if (ids.length > MAX_MISTAKES) {
        ids.sort((a, b) => (m[b].fixed ? 1 : 0) - (m[a].fixed ? 1 : 0) || m[a].t - m[b].t)
          .slice(0, ids.length - MAX_MISTAKES).forEach(k => { m[k] = { deleted: true, t: now }; });
      }
      store.set('mistakes', m);
    },
    _apply(m, q, ok, src) {
      if (!q || !q.id || !src) return false;
      const now = Date.now();
      const had = m[q.id] && !m[q.id].deleted ? Object.assign({}, m[q.id]) : null;
      if (!ok) {
        const e = Object.assign(had || { qid: q.id, first: now, misses: 0 }, {
          ref: src.type === 'ai' ? { type: 'ai', id: '' } : { type: src.type, id: String(src.id || '') },
          where: String(src.where || '').slice(0, 80), section: q.section, skill: q.skill || 'Other',
          difficulty: q.difficulty || 'medium', streak: 0, fixed: false, t: now,
          // A few words of the question, so the notebook list is readable.
          p: String(q.passage || q.prompt || '').replace(/_{3,}/g, '…').replace(/\$\$?|\*\*|__|\*/g, '').replace(/\s+/g, ' ').trim().slice(0, 110)
        });
        e.misses = (e.misses || 0) + 1;
        delete e.fixedAt;
        // AI questions exist nowhere else, so the notebook keeps their text.
        if (src.type === 'ai') e.q = JSON.parse(JSON.stringify(q));
        m[q.id] = e;
        vocab.fromMiss(q);
      } else if (had && !had.fixed) {
        had.streak = (had.streak || 0) + 1; had.t = now;
        if (had.streak >= FIX_AFTER) { had.fixed = true; had.fixedAt = now; }
        m[q.id] = had;
      } else return false;
      return true;
    },
    remove(qid) { const m = Object.assign({}, this.map()); m[qid] = { deleted: true, t: Date.now() }; store.set('mistakes', m); },
    // The questions behind notebook entries, loaded from their sets and tests.
    async questions(entries) {
      const want = {}, found = {};
      entries.forEach(e => { if (e.ref && e.ref.type !== 'ai' && e.ref.id) { const k = e.ref.type + ':' + e.ref.id; (want[k] = want[k] || []).push(e.qid); } });
      await Promise.all(Object.keys(want).map(async k => {
        const [type, id] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)];
        try {
          if (type === 'set') { const s = await loadSet(id); s.questions.forEach(q => { found[q.id] = Object.assign({ setId: s.id }, q); }); }
          else if (type === 'test') {
            const t = await loadTest(id);
            t.sections.forEach(s => [s.module1, s.module2.easier, s.module2.harder].forEach(m => m.questions.forEach(q => { found[q.id] = Object.assign({ testId: t.id }, q); })));
          }
        } catch (e) { console.warn('[SAT Ustoz] Could not load ' + k + ' for the mistake notebook:', e); }
      }));
      return entries.map(e => e.ref && e.ref.type === 'ai' ? (e.q ? normalizeQuestion(e.q).q : null) : found[e.qid]).filter(Boolean);
    }
  };

  /* ------------------------------------------------------------------
     Vocabulary progress (vocab.html): spaced repetition boxes per word,
     the student's own words, words from missed questions, review days.
     ------------------------------------------------------------------ */
  const vocab = {
    get() { const v = store.get('vocab', {}) || {}; return { cards: v.cards || {}, mine: v.mine || {}, missed: v.missed || {}, days: v.days || {} }; },
    save(v) { store.set('vocab', v); },
    // Words in Context: the right answer is the word worth learning.
    fromMiss(q) {
      if (!q || q.type !== 'mc' || q.skill !== 'Words in Context') return;
      const word = String(q.choices[LETTERS.indexOf(q.answer)] || '').replace(/[*_$]/g, '').trim();
      if (!/^[A-Za-z][A-Za-z' -]{1,40}$/.test(word) || word.split(/\s+/).length > 3) return;
      const key = word.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
      if (!key) return;
      const ctx = String(q.passage || '').replace(/_{3,}/g, '**' + word + '**').replace(/\s+/g, ' ').slice(0, 320);
      const v = this.get();
      v.missed = Object.assign({}, v.missed, { [key]: { w: word, ctx, qid: q.id, t: Date.now() } });
      this.save(v);
    }
  };

  /* ------------------------------------------------------------------
     Question of the day: one question from the practice sets, the same
     for everyone on the same Tashkent day, Reading and Writing and Math
     taking turns. The streak counts days in a row with an answer.
     ------------------------------------------------------------------ */
  function seededShuffle(arr, seed) {
    const a = arr.slice();
    let s = seed >>> 0;
    const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const daily = {
    today: () => dayKey(),
    // Question number N counts from the site's first daily question.
    number: () => dayNum() - dayNum(Date.parse('2026-10-22T00:00:00+05:00')) + 1,
    async question(day) {
      const bank = await loadAllBank();
      const byId = (a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      const rw = seededShuffle(bank.filter(q => q.section === 'rw').sort(byId), 2026);
      const math = seededShuffle(bank.filter(q => q.section === 'math').sort(byId), 1530);
      const order = [];
      for (let i = 0; i < Math.max(rw.length, math.length); i++) { if (rw[i]) order.push(rw[i]); if (math[i]) order.push(math[i]); }
      if (!order.length) return null;
      const n = day == null ? dayNum() : day;
      return order[((n % order.length) + order.length) % order.length];
    },
    days() { return (store.get('daily', {}) || {}).days || {}; },
    answered(day) { return this.days()[day || dayKey()] || null; },
    answer(q, response, ok) {
      const d = store.get('daily', {}) || {};
      const key = dayKey();
      if (d.days && d.days[key]) return;
      store.set('daily', Object.assign({}, d, { days: Object.assign({}, d.days, { [key]: { qid: q.id, r: String(response == null ? '' : response).slice(0, 8), ok: !!ok, t: Date.now() } }) }));
      recordAttempts([{ qid: q.id, section: q.section, domain: q.domain, skill: q.skill, difficulty: q.difficulty, correct: ok, source: 'daily' }]);
      mistakes.record(q, ok, { type: 'set', id: q.setId, where: 'Question of the day' });
    },
    streak() {
      const days = this.days();
      let n = dayNum(), cur = 0;
      if (!days[dayKey()]) n -= 1; // today's isn't answered yet: the streak still stands from yesterday
      while (days[dayKey(n * 86400000 - TZ_MS)]) { cur++; n--; }
      const sorted = Object.keys(days).sort();
      let best = 0, run = 0, prev = null;
      sorted.forEach(k => { const d = Math.round(Date.parse(k + 'T00:00:00Z') / 86400000); run = prev != null && d === prev + 1 ? run + 1 : 1; prev = d; best = Math.max(best, run); });
      return { current: cur, best: Math.max(best, cur), total: sorted.length };
    }
  };

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
        if (!res.ok) {
          const err = new Error((data && data.error) || ('The AI service returned an error (' + res.status + ').'));
          // 'auth', 'max' (AI questions are Max) or 'free_limit' (today's free tutor questions are used up)
          err.code = (data && data.code) || (res.status === 401 ? 'auth' : '');
          throw err;
        }
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
    log.addEventListener('click', e => { if (e.target.closest('[data-get-max]')) { close(); plan.upgrade('max'); } });
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
    // Free and Pro: a few tutor questions a day (FREE_DAILY_AI in the AI Worker). Max: unlimited.
    const maxBtn = '<button type="button" class="link-btn" data-get-max>Get unlimited with Max</button>';
    const hasMax = plan.allows('max');
    if (!hasMax) bubble('sys', 'Free and Pro include 3 AI tutor questions a day. ' + maxBtn);
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
        if (!hasMax && data && data.left != null) bubble('sys', (data.left === 0 ? 'That was your last free tutor question today. ' : data.left + ' free tutor question' + (data.left === 1 ? '' : 's') + ' left today. ') + maxBtn);
      } catch (e) {
        wait.className = 'bubble sys';
        if (e.code === 'auth') wait.innerHTML = esc(e.message) + ' <a href="' + esc(loginUrl()) + '">Sign in</a>';
        else if (e.code === 'free_limit') wait.innerHTML = 'You’ve used today’s free tutor questions. They come back tomorrow. ' + maxBtn;
        else if (e.code === 'max') wait.innerHTML = esc(e.message) + ' ' + maxBtn;
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
  // Uzbek first: the student's own choice, else their browser's language when
  // it's Uzbek or Russian, else Uzbek for anyone in Uzbekistan's time zone.
  function pickLang() {
    const saved = store.get('lang', null);
    if (saved === 'en' || saved === 'uz' || saved === 'ru') return saved;
    const nav = (navigator.language || '').slice(0, 2).toLowerCase();
    if (nav === 'uz' || nav === 'ru') return nav;
    let tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* ignore */ }
    return /^Asia\/(Tashkent|Samarkand)$/.test(tz) ? 'uz' : 'en';
  }
  // A date in the page language, Tashkent time: "22-oktabr", "22 октября", "22 October".
  // Browsers often lack Uzbek month names, so Uzbek is written out here.
  // opts: { weekday: true, year: true }
  const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
  const UZ_DAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
  function dateText(ts, opts, lang) {
    opts = opts || {}; lang = lang || langNow();
    const d = new Date((ts == null ? Date.now() : +ts) + TZ_MS);
    if (lang === 'uz') return (opts.weekday ? UZ_DAYS[d.getUTCDay()] + ', ' : '') + d.getUTCDate() + '-' + UZ_MONTHS[d.getUTCMonth()] + (opts.year ? ' ' + d.getUTCFullYear() + '-yil' : '');
    const o = { day: 'numeric', month: 'long', timeZone: 'Asia/Tashkent' };
    if (opts.weekday) o.weekday = 'long';
    if (opts.year) o.year = 'numeric';
    try { return new Date(+ts || Date.now()).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', o); } catch (e) { return fmtDate(ts); }
  }
  // t = SH.i18n({ en: {...}, uz: {...}, ru: {...} }); t('key', { n: 3 }) fills {n}.
  function i18n(T) {
    return (k, vars) => {
      const l = langNow();
      let s = T[l] && T[l][k] != null ? T[l][k] : T.en[k] != null ? T.en[k] : k;
      if (vars) Object.keys(vars).forEach(v => { s = String(s).split('{' + v + '}').join(vars[v]); });
      return s;
    };
  }
  // Header and footer words on the trilingual pages (vocab, lessons, daily,
  // mock, score calculator): <a data-nav="vocab">Vocabulary</a>.
  const NAV_TEXT = {
    en: { dash: 'Dashboard', sets: 'Sets', tests: 'Tests', vocab: 'Vocabulary', lessons: 'Lessons', plans: 'Plans', daily: 'Question of the day', calc: 'Score calculator', mock: 'National mock', teach: 'For teachers', practice: 'Practice', contact: 'Contact', channel: 'Telegram channel', feedback: 'Send feedback', skip: 'Skip to content',
      tag: 'Digital SAT practice built by someone who has taken the test, for students in Uzbekistan and beyond.',
      legal: 'SAT® is a trademark registered by the College Board, which is not affiliated with, and does not endorse, this website. All practice questions on this site are written by SAT Ustoz.' },
    uz: { dash: 'Sahifam', sets: 'Toʻplamlar', tests: 'Testlar', vocab: 'Lugʻat', lessons: 'Darslar', plans: 'Tariflar', daily: 'Kun savoli', calc: 'Ball kalkulyatori', mock: 'Milliy sinov imtihoni', teach: 'Oʻqituvchilar uchun', practice: 'Mashq', contact: 'Aloqa', channel: 'Telegram kanal', feedback: 'Fikr bildirish', skip: 'Asosiy qismga oʻtish',
      tag: 'Imtihonni oʻzi topshirgan inson tomonidan Oʻzbekiston va boshqa mamlakatlardagi oʻquvchilar uchun yaratilgan Digital SAT mashqlari.',
      legal: 'SAT® College Board tomonidan roʻyxatdan oʻtkazilgan savdo belgisidir. College Board ushbu sayt bilan bogʻliq emas va uni qoʻllab-quvvatlamaydi. Saytdagi barcha mashq savollari SAT Ustoz tomonidan yozilgan.' },
    ru: { dash: 'Кабинет', sets: 'Наборы', tests: 'Тесты', vocab: 'Словарь', lessons: 'Уроки', plans: 'Тарифы', daily: 'Вопрос дня', calc: 'Калькулятор баллов', mock: 'Национальный пробный экзамен', teach: 'Для преподавателей', practice: 'Практика', contact: 'Контакты', channel: 'Telegram-канал', feedback: 'Оставить отзыв', skip: 'Перейти к содержанию',
      tag: 'Практика Digital SAT от того, кто сам сдавал тест, для учеников в Узбекистане и не только.',
      legal: 'SAT® является зарегистрированным товарным знаком College Board, которая не связана с этим сайтом и не одобряет его. Все тренировочные вопросы на сайте написаны SAT Ustoz.' }
  };
  // EN / UZ / RU buttons (any [data-lang] on the page). onChange(lang) redraws.
  function langSwitch(onChange) {
    const paint = lang => {
      document.documentElement.lang = lang;
      $$('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
      $$('[data-nav]').forEach(el => { el.textContent = (NAV_TEXT[lang] || NAV_TEXT.en)[el.dataset.nav] || NAV_TEXT.en[el.dataset.nav] || el.textContent; });
    };
    $$('[data-lang]').forEach(b => b.addEventListener('click', () => {
      store.set('lang', b.dataset.lang); paint(b.dataset.lang); renderAuthSlots();
      if (onChange) onChange(b.dataset.lang);
    }));
    const lang = pickLang();
    paint(lang);
    return lang;
  }

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
    signInWithGoogle() {
      return this._popup('google', authMod => { const p = new authMod.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' }); return p; });
    },
    // Apple (CONFIG.APPLE_SIGNIN): Apple shares the name only on the first sign-in.
    signInWithApple() {
      return this._popup('apple', authMod => { const p = new authMod.OAuthProvider('apple.com'); p.addScope('email'); p.addScope('name'); return p; });
    },
    async _popup(method, makeProvider) {
      await this.ready();
      if (!this.fb) throw new Error('Sign-in could not load. Check your connection and refresh the page.');
      const { authMod, auth: a } = this.fb;
      let cred;
      try { cred = await authMod.signInWithPopup(a, makeProvider(authMod)); }
      catch (e) { const err = new Error(friendlyAuthError(e)); err.code = e && e.code; throw err; }
      const u = cred.user;
      this.user = { uid: u.uid, name: u.displayName || '', email: u.email || '', photo: u.photoURL || '' };
      analytics.identify(u.uid);
      await sync.start();
      analytics.track('signed_in', { method, new_account: !sync.cloudProfile });
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
      this.dirty[STUDY_KEYS.indexOf(key) > -1 ? 'study' : key] = true;
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
      // data/study needs the newer firestore.rules; until they're published it stays on this device.
      const snaps = await Promise.all([fs.getDoc(ref()), fs.getDoc(ref('data', 'attempts')), fs.getDoc(ref('data', 'tests')),
        fs.getDoc(ref('data', 'study')).catch(e => { console.warn('[SAT Ustoz] Could not read study data. Are the new firestore.rules published?', e); return null; })]);
      if (uid !== this.uid) return;
      const userDoc = snaps[0].exists() ? snaps[0].data() : null;
      const cloudAttempts = snaps[1].exists() ? (snaps[1].data().items || []) : [];
      const cloudTests = snaps[2].exists() ? (snaps[2].data().items || []) : [];
      this.studyOk = !!snaps[3];
      const cloudStudy = snaps[3] && snaps[3].exists() ? snaps[3].data() : {};
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
      const local = mine ? getProfile() : Object.assign({}, PROFILE_DEFAULTS);
      const cloudP = userDoc ? { name: userDoc.name || '', target: userDoc.target || 1400, testDate: userDoc.testDate || '', grade: userDoc.grade || '', region: userDoc.region || '', school: userDoc.school || '', onboarded: !!userDoc.onboarded, updatedAt: userDoc.profileUpdatedAt || 0 } : null;
      let profile = cloudP && cloudP.updatedAt >= (local.updatedAt || 0) ? cloudP : local;
      if (!profile.name && auth.user) profile = Object.assign({}, profile, { name: auth.user.name });
      if (cloudP && cloudP.onboarded) profile.onboarded = true;
      // This device's plan for this account before the sync (null: none known here yet).
      const planWas = owner === uid ? plan.current() : null;
      this.applying = true;
      store.set('attempts', attempts); store.set('testHistory', tests); store.set('profile', profile); store.set('owner', uid);
      let studyLocal = false;
      STUDY_KEYS.forEach(k => {
        const here = mine ? store.get(k, undefined) : undefined;
        if (here !== undefined) studyLocal = true;
        const v = mergeStudy(cloudStudy[k], here);
        if (v === undefined) store.del(k); else store.set(k, v);
      });
      // Who invited this student (?ref= link), and whether the reward note was sent.
      if (userDoc && userDoc.referredBy) store.set('referredBy', String(userDoc.referredBy)); else store.del('referredBy');
      // The plan is read-only here: only you (Firebase console) or a payment
      // webhook can set it, and firestore.rules stops students writing it.
      if (userDoc && userDoc.plan) {
        const u = userDoc.planUntil;
        store.set('plan', { id: String(userDoc.plan), until: u && typeof u.toMillis === 'function' ? u.toMillis() : (Number(u) || 0), source: String(userDoc.planSource || '') });
      } else store.del('plan');
      // Whether this account already used its one 48-hour unlock (manual.unlock).
      if (userDoc && userDoc.trialUsedAt) store.set('trialUsed', true); else store.del('trialUsed');
      // When the account was created: decides whether the student keeps Tests 2 and 3 (plan.legacy).
      const made = userDoc && userDoc.createdAt;
      if (made && typeof made.toMillis === 'function') store.set('since', made.toMillis()); else store.del('since');
      this.applying = false;
      analytics.planSynced(planWas, 'sync');
      this.dirty = { attempts: attempts.length !== cloudAttempts.length, testHistory: tests.length !== cloudTests.length, profile: true, study: studyLocal && this.studyOk };
      await this.push(true);
      await notices.load(uid);
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
      const stats = { questions: attempts.length, accuracy: attempts.length ? Math.round(right / attempts.length * 100) : 0, bestScore: best, tests: tests.length };
      const userData = {
        name: p.name || auth.user.name, email: auth.user.email, photo: auth.user.photo,
        grade: p.grade || '', target: p.target || 1400, testDate: p.testDate || '', onboarded: !!p.onboarded,
        region: p.region || '', school: p.school || '',
        profileUpdatedAt: p.updatedAt || 0, stats
      };
      const userDoc = clean(userData);
      userDoc.lastSeenAt = fs.serverTimestamp();
      if (first && this.isNew) {
        userDoc.createdAt = fs.serverTimestamp();
        // Invited by a friend's link (referral.capture): saved once, on the new account.
        const r = store.get('ref', null);
        if (r && r.code && r.code !== uid) { userDoc.referredBy = r.code; store.set('referredBy', r.code); }
      }
      const jobs = [fs.setDoc(ref(), userDoc, { merge: true })];
      if (d.attempts) jobs.push(fs.setDoc(ref('data', 'attempts'), { items: clean(attempts.slice(-1500)), updatedAt: fs.serverTimestamp() }));
      if (d.testHistory) jobs.push(fs.setDoc(ref('data', 'tests'), { items: clean(tests), updatedAt: fs.serverTimestamp() }));
      try { await Promise.all(jobs); this.isNew = false; }
      catch (e) { Object.assign(this.dirty, d); console.warn('[SAT Ustoz] Could not save progress to your account:', e); }
      // Study data and class rosters are saved on their own, so older database
      // rules that refuse them never block the progress above.
      if (d.study) {
        const study = {};
        STUDY_KEYS.forEach(k => { const v = store.get(k, undefined); if (v !== undefined) study[k] = v; });
        try { await fs.setDoc(ref('data', 'study'), Object.assign(clean(study), { updatedAt: fs.serverTimestamp() })); }
        catch (e) { console.warn('[SAT Ustoz] Could not save study data. Are the new firestore.rules published?', e); }
      }
      if (d.attempts || d.testHistory || d.profile) classes.pushStats(stats).catch(e => console.warn('[SAT Ustoz] Could not update your class:', e));
    },
    async flush() { if (this.uid && Object.keys(this.dirty).length) await this.push(); },
    clearLocal() {
      SYNCED_KEYS.forEach(k => store.del(k));
      store.del('owner'); store.del('plan'); store.del('since'); store.del('waitlist'); store.del('trialUsed');
      store.del('referredBy'); store.del('refSent'); store.del('notices');
      try { Object.keys(localStorage).filter(k => k.indexOf(PREFIX + 'run.') === 0).forEach(k => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
    }
  };
  hooks.change = key => sync.markDirty(key);
  const fsTime = t => !t ? 0 : typeof t.toMillis === 'function' ? t.toMillis() : Number(t) || 0;

  /* ------------------------------------------------------------------
     Notices from the team, like "Your report on question X was fixed".
     admin.html writes users/<uid>/notices/<id>; the student dismisses them.
     ------------------------------------------------------------------ */
  const notices = {
    list() { return store.get('notices', []) || []; },
    async load(uid) {
      try {
        const fs = await sync._lib();
        const snap = await fs.getDocs(fs.query(fs.collection(sync.db, 'users', uid, 'notices'), fs.limit(20)));
        if (uid !== sync.uid) return;
        store.set('notices', snap.docs.map(d => { const x = d.data(); return { id: d.id, kind: x.kind || '', qid: x.qid || '', where: x.where || '', text: x.text || '', at: fsTime(x.createdAt) }; }).sort((a, b) => b.at - a.at));
      } catch (e) { console.warn('[SAT Ustoz] Could not read notices. Are the new firestore.rules published?', e); }
    },
    async dismiss(id) {
      store.set('notices', this.list().filter(n => n.id !== id));
      if (!auth.user) return;
      const fs = await sync._lib();
      await fs.deleteDoc(fs.doc(sync.db, 'users', auth.user.uid, 'notices', id));
    }
  };

  /* ------------------------------------------------------------------
     Invite a friend: satustoz.academy/?ref=<uid>. The new account keeps who
     invited it (users.referredBy). When the friend finishes the free
     diagnostic, referrals/<friend uid> is written, and admin.html has a
     button that gives the inviter 7 days of Pro.
     ------------------------------------------------------------------ */
  const referral = {
    link() { return auth.user ? 'https://satustoz.academy/?ref=' + encodeURIComponent(auth.user.uid) : ''; },
    capture() {
      let code = '';
      try { code = new URLSearchParams(location.search).get('ref') || ''; } catch (e) { /* ignore */ }
      if (!/^[A-Za-z0-9]{10,40}$/.test(code)) return;
      if (!store.get('ref', null)) { store.set('ref', { code, t: Date.now() }); analytics.track('referral_landed', {}); }
    },
    async complete(testId) {
      const by = store.get('referredBy', '');
      if (!by || !auth.user || store.get('refSent', false) || by === auth.user.uid) return;
      try {
        const fs = await sync._lib();
        await fs.setDoc(fs.doc(sync.db, 'referrals', auth.user.uid), {
          uid: auth.user.uid, referrer: by, name: (getProfile().name || auth.user.name || '').slice(0, 100), email: auth.user.email || '',
          testId: String(testId).slice(0, 60), createdAt: fs.serverTimestamp()
        });
        store.set('refSent', true);
        analytics.track('referral_completed', { test_id: testId });
      } catch (e) { console.warn('[SAT Ustoz] Could not record the referral. Are the new firestore.rules published?', e); }
    },
    async mine() {
      if (!auth.user) return [];
      const fs = await sync._lib();
      const snap = await fs.getDocs(fs.query(fs.collection(sync.db, 'referrals'), fs.where('referrer', '==', auth.user.uid), fs.limit(100)));
      return snap.docs.map(d => d.data());
    }
  };

  /* ------------------------------------------------------------------
     "Took the real SAT?": a student's real score next to their practice
     scores (realScores/<uid>), so you can publish how close the estimates
     are (admin.html, data/calibration.json).
     ------------------------------------------------------------------ */
  const realScore = {
    async get() {
      if (!auth.user) return null;
      const fs = await sync._lib();
      const s = await fs.getDoc(fs.doc(sync.db, 'realScores', auth.user.uid));
      return s.exists() ? s.data() : null;
    },
    async save(r) {
      const fs = await sync._lib();
      const full = getTestHistory().filter(h => h.total != null && h.testId !== 'diagnostic-mini').sort((a, b) => b.finishedAt - a.finishedAt);
      const last3 = full.slice(0, 3);
      await fs.setDoc(fs.doc(sync.db, 'realScores', auth.user.uid), {
        uid: auth.user.uid, name: (getProfile().name || auth.user.name || '').slice(0, 100), email: auth.user.email || '',
        total: r.total, rw: r.rw, math: r.math, month: r.month,
        practiceBest: full.reduce((m, h) => Math.max(m, h.total), 0), practiceLast: full.length ? full[0].total : 0,
        practiceAvg3: last3.length ? Math.round(last3.reduce((n, h) => n + h.total, 0) / last3.length / 10) * 10 : 0,
        practiceTests: full.length, createdAt: fs.serverTimestamp()
      });
      analytics.track('real_score_shared', {});
    }
  };

  /* ------------------------------------------------------------------
     Classes (teacher.html): a student joins with the class code, sees the
     homework on the dashboard, and each finished set, drill, lesson check
     or test that matches an assignment is sent to the teacher as a result.
     ------------------------------------------------------------------ */
  const classes = {
    mine() { return live(store.get('classes', {}) || {}); },
    async join(code) {
      code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (code.length < 5) { const e = new Error('Enter the class code your teacher gave you.'); e.code = 'nocode'; throw e; }
      const fs = await sync._lib();
      const s = await fs.getDoc(fs.doc(sync.db, 'classCodes', code));
      if (!s.exists()) { const e = new Error('No class has the code ' + code + '. Check it with your teacher.'); e.code = 'nocode'; throw e; }
      const c = s.data();
      await fs.setDoc(fs.doc(sync.db, 'classes', c.classId, 'members', auth.user.uid), {
        uid: auth.user.uid, name: (getProfile().name || auth.user.name || '').slice(0, 100), email: auth.user.email || '',
        stats: memberStats(), joinedAt: fs.serverTimestamp(), updatedAt: fs.serverTimestamp()
      });
      const m = Object.assign({}, store.get('classes', {}));
      m[c.classId] = { id: c.classId, name: c.name || '', teacher: c.teacher || '', center: c.center || '', t: Date.now() };
      store.set('classes', m);
      store.del('classTasks');
      analytics.track('class_joined', {});
      return m[c.classId];
    },
    async leave(id) {
      const fs = await sync._lib();
      await fs.deleteDoc(fs.doc(sync.db, 'classes', id, 'members', auth.user.uid));
      const m = Object.assign({}, store.get('classes', {}));
      m[id] = { deleted: true, t: Date.now() };
      store.set('classes', m);
      store.del('classTasks');
    },
    // Every class's assignments, newest first, each with this student's result.
    async tasks() {
      const list = this.mine();
      if (!list.length || !auth.user) return [];
      const fs = await sync._lib();
      const out = [];
      await Promise.all(list.map(async c => {
        try {
          const [as, rs] = await Promise.all([
            fs.getDocs(fs.query(fs.collection(sync.db, 'classes', c.id, 'assignments'), fs.orderBy('createdAt', 'desc'), fs.limit(30))),
            fs.getDocs(fs.query(fs.collection(sync.db, 'classes', c.id, 'results'), fs.where('uid', '==', auth.user.uid), fs.limit(100)))
          ]);
          const done = {};
          rs.docs.forEach(d => { done[d.data().aid] = d.data(); });
          as.docs.forEach(d => out.push(Object.assign({}, d.data(), { id: d.id, classId: c.id, className: c.name, result: done[d.id] || null, at: fsTime(d.data().createdAt) })));
        } catch (e) { console.warn('[SAT Ustoz] Could not load the homework of ' + c.name + ':', e); }
      }));
      out.sort((a, b) => b.at - a.at);
      store.set('classTasks', out.map(x => ({ id: x.id, classId: x.classId, kind: x.kind, ref: x.ref, done: !!x.result })));
      return out;
    },
    // match: { kind: 'set' | 'test' | 'lesson', ref: its id } or { aid, classId } for an assigned drill.
    // res: { title, correct, count, score?, rw?, math? }
    async submit(match, res) {
      if (!auth.user || !this.mine().length) return;
      let tasks = store.get('classTasks', null);
      if (!tasks) { await this.tasks(); tasks = store.get('classTasks', []) || []; }
      const hits = tasks.filter(x => !x.done && (match.aid ? x.id === match.aid && x.classId === match.classId : x.kind === match.kind && x.ref === match.ref));
      if (!hits.length) return;
      const fs = await sync._lib();
      const name = (getProfile().name || auth.user.name || '').slice(0, 100);
      await Promise.all(hits.map(x => fs.setDoc(fs.doc(sync.db, 'classes', x.classId, 'results', x.id + '_' + auth.user.uid),
        Object.assign(clean(res), { aid: x.id, uid: auth.user.uid, name, finishedAt: fs.serverTimestamp() }))));
      store.set('classTasks', tasks.map(x => hits.indexOf(x) > -1 ? Object.assign({}, x, { done: true }) : x));
      analytics.track('assignment_done', { kind: match.kind || 'drill' });
    },
    // The summary the teacher sees on the roster and in the parent report.
    async pushStats(stats) {
      const list = this.mine();
      if (!list.length || !auth.user) return;
      const fs = await sync._lib();
      const s = Object.assign(memberStats(), stats || {});
      await Promise.all(list.map(c => fs.setDoc(fs.doc(sync.db, 'classes', c.id, 'members', auth.user.uid),
        { name: (getProfile().name || auth.user.name || '').slice(0, 100), stats: clean(s), updatedAt: fs.serverTimestamp() }, { merge: true })));
    }
  };
  function memberStats() {
    const attempts = getAttempts(), right = attempts.filter(a => a.correct).length;
    const hist = getTestHistory().filter(h => h.total != null).sort((a, b) => b.finishedAt - a.finishedAt);
    return {
      questions: attempts.length, accuracy: attempts.length ? Math.round(right / attempts.length * 100) : 0,
      bestScore: hist.reduce((m, h) => Math.max(m, h.total), 0), tests: hist.length,
      lastTest: hist[0] ? { title: hist[0].title, total: hist[0].total, at: hist[0].finishedAt } : null,
      weak: weakSkills(3, 3).map(w => w.skill), open: mistakes.open().length, target: getProfile().target || 1400, testDate: getProfile().testDate || ''
    };
  }

  /* ------------------------------------------------------------------
     National mock (mock.html): admin.html schedules mocks/<id> (one test,
     one time window for everyone). A finished mock writes
     mockResults/<mock id>_<uid>, once; the leaderboard reads them all.
     ------------------------------------------------------------------ */
  const mock = {
    _doc(d) { const x = d.data(); return { id: d.id, title: x.title || '', testId: x.testId || '', prize: x.prize || '', startsAt: fsTime(x.startsAt), endsAt: fsTime(x.endsAt) }; },
    async list() {
      await auth.ready();
      const fs = await sync._lib();
      const snap = await fs.getDocs(fs.query(fs.collection(sync.db, 'mocks'), fs.orderBy('startsAt', 'desc'), fs.limit(24)));
      return snap.docs.map(d => this._doc(d));
    },
    async get(id) {
      await auth.ready();
      const fs = await sync._lib();
      const s = await fs.getDoc(fs.doc(sync.db, 'mocks', id));
      return s.exists() ? this._doc(s) : null;
    },
    isOpen(m) { const now = Date.now(); return !!m && now >= m.startsAt && now <= m.endsAt; },
    // "Azizbek T." from the profile name; "A student" for anyone who hides their name.
    shortName(full) { const w = String(full || '').trim().split(/\s+/).filter(Boolean); return w.length ? w[0] + (w[1] ? ' ' + w[1][0].toUpperCase() + '.' : '') : 'A student'; },
    async submit(m, rec, showName) {
      const fs = await sync._lib();
      const p = getProfile();
      await fs.setDoc(fs.doc(sync.db, 'mockResults', m.id + '_' + auth.user.uid), {
        mockId: m.id, uid: auth.user.uid, name: showName ? this.shortName(p.name || auth.user.name).slice(0, 40) : 'A student',
        region: REGIONS.indexOf(p.region) > -1 ? p.region : '', school: String(p.school || '').slice(0, 80),
        total: rec.total, rw: rec.sections.rw ? rec.sections.rw.score : 0, math: rec.sections.math ? rec.sections.math.score : 0,
        finishedAt: fs.serverTimestamp()
      });
      analytics.track('mock_finished', { mock_id: m.id, total: rec.total });
    },
    async results(id) {
      await auth.ready();
      const fs = await sync._lib();
      const snap = await fs.getDocs(fs.query(fs.collection(sync.db, 'mockResults'), fs.where('mockId', '==', id), fs.limit(2000)));
      return snap.docs.map(d => Object.assign({}, d.data(), { at: fsTime(d.data().finishedAt) })).sort((a, b) => b.total - a.total || a.at - b.at);
    }
  };

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
    // "legacyFree" tests stay open for students from before the change, and
    // "proOnly" tests stay Pro even during the launch offer.
    opens(meta) { return !!meta && ((!!CONFIG.PLANS.TESTS_FREE_FOR_LAUNCH && !meta.proOnly) || this.allows(meta.plan) || (!!meta.legacyFree && this.legacy())); },
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
    async send(last4, receiptId, lang, months, planId) {
      const { fs, ref } = await this._ref();
      const max = planId === 'max';
      await fs.setDoc(ref, {
        uid: auth.user.uid, email: auth.user.email, name: (auth.user.name || '').slice(0, 100), plan: max ? 'max' : 'pro',
        amount: somNumber(months > 1 ? CONFIG.PLANS.PASS_PRICE : max ? CONFIG.PLANS.MAX_PRICE : CONFIG.PLANS.PRO_PRICE), months: months > 1 ? months : 1,
        last4, receiptId, lang, createdAt: fs.serverTimestamp()
      });
    }
  };
  // The 48-hour unlock right after "I've paid": the plan switches on at once while
  // you check the transfer. Once per account, only with no plan running, only
  // just after a payment note for the same plan (firestore.rules checks all of it).
  // Approving on admin.html turns it into the full period; rejecting ends it.
  manual.canUnlock = () => manual.canSave() && plan.current() === 'free' && !store.get('trialUsed', false);
  manual.unlock = async planId => {
    const fs = await sync._lib();
    const until = Date.now() + 47 * 3600000; // a little under 48 hours, so a fast device clock still passes the rule
    await fs.setDoc(fs.doc(sync.db, 'users', auth.user.uid),
      { plan: planId, planUntil: fs.Timestamp.fromMillis(until), planSource: 'pending', trialUsedAt: fs.serverTimestamp() }, { merge: true });
    store.set('plan', { id: planId, until, source: 'pending' });
    store.set('trialUsed', true);
    try { document.dispatchEvent(new CustomEvent('sh:synced')); } catch (e) { /* ignore */ }
    return until;
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
      pro_f: ['All 15 full-length adaptive practice tests', 'Your score broken down by skill', 'Review every question with explanations', 'Drills built from your weakest skills', 'A study plan to your test date'],
      max_f: ['Everything in Pro', 'AI tutor: ask about any question, any time', 'Your study plan re-made every week', 'A monthly live group session with Azizbek'],
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
      pay_ok_t: 'Pro is on', pay_ok: 'Pro is on until {d}. All 15 practice tests are open.',
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
      mp_tg_msg: 'Hi! I paid {price} for SAT Ustoz {plan}. Account: {email}. Card ending {card}. Receipt:',
      mp_pending: 'We got your payment details on {d} and are checking them. Pro switches on within 2 hours (9:00 to 23:00 Tashkent time); reload the page then.',
      mp_pending_tg: 'Haven’t sent the receipt screenshot yet? Send it on Telegram so we find your payment faster.',
      mp_again: 'I made a new payment',
      mp_unlocked_t: '{plan} is on', mp_unlocked: 'You can use {plan} right now, for 48 hours, while we confirm your payment. Once it’s confirmed (within 2 hours, 9:00 to 23:00 Tashkent time), you get the full period you paid for. Send us the receipt so we can confirm it faster.',
      pending_note: 'Confirming your payment: the full period starts once it’s confirmed.',
      mp_trust: 'Payments go to {name}, the founder of SAT Ustoz. Questions? Message {tg} on Telegram.', mp_instant: 'Your plan switches on as soon as you tap “I’ve paid”.',
      launch_tests: 'Practice Tests 1 to 10 (free for our launch)', pro_tests_launch: 'Practice Tests 11 to 15, only in Pro', pro_sets: 'Practice sets for the most-missed skills',
      ai_daily: '3 AI tutor questions a day', ai_max: 'Unlimited AI tutor and new AI practice questions',
      bill_pass: 'Prices in Uzbek so’m. Pay for one month at a time, or for 3 months until your test.',
      pass_line: 'or {price} for 3 months, until your test',
      mp_choose: 'How long do you want Pro?', mp_month_t: 'One month', mp_pass_t: '3 months, until your test', mp_pass_d: '{price}: 3 months for the price of 2.5',
      pitch_lead: 'Pro gives you:', pitch_later: 'Not now', lock_btn: 'Unlock with Pro',
      cta_wait: 'Join the Max waitlist', cta_wait_on: 'You’re on the waitlist', wl_title: 'Max waitlist',
      wl_intro: 'Max adds the AI tutor, a study plan re-made every week and a monthly live group session with Azizbek. Leave your Telegram username and we’ll message you first when it opens.',
      wl_label: 'Telegram username', wl_bad: 'Enter your Telegram username, like @satustoz.', wl_join: 'Join the waitlist',
      wl_done_t: 'You’re on the list', wl_done: 'We’ll message {tg} on Telegram the day Max opens.',
      wl_signin: 'Sign in first, so we know who to message when Max opens.',
      wl_failed: 'Could not save. Check your connection and try again, or message us on Telegram.', wl_change: 'Change username',
      rp_title: 'Report a mistake', rp_intro: 'What’s wrong with this question? A wrong answer key, a typo, an unclear explanation: tell us and we’ll fix it.',
      rp_label: 'What’s wrong', rp_send: 'Send', rp_done: 'Thanks. We read every report, fix what’s wrong, and tell you on your dashboard when it’s fixed.', rp_empty: 'Write a few words about the problem.',
      rp_tg: 'You’re not signed in, so this opens Telegram with your message ready to send.', rp_tg_btn: 'Send on Telegram', rp_tg_msg: 'Mistake in {where}, question {qid}: ',
      fb_title: 'Tell us what you think', fb_intro: 'What helps you most? What’s missing? Azizbek reads every message.', fb_label: 'Your message',
      fb_quote: 'You may show my words on the site (first name only, never changed)', fb_done: 'Thank you! We read every message.'
    },
    uz: {
      free_name: 'Bepul', pro_name: 'Pro', max_name: 'Max',
      free_for: 'Haqiqiy test formatini sinab koʻring.', pro_for: 'Barcha testlar va ballaringiz qayerda yoʻqolayotgani.', max_for: 'Pro, AI ustoz va jonli darslar bilan.',
      free_f: ['Mini diagnostika testi', '1-sinov testi', 'Boshlangʻich savollar toʻplamlari', 'Umumiy ballingiz'],
      pro_f: ['Barcha 15 ta toʻliq adaptiv sinov testi', 'Koʻnikmalar boʻyicha ball tahlili', 'Har bir savolni izohlari bilan koʻrib chiqish', 'Eng zaif koʻnikmalaringiz boʻyicha mashqlar', 'Imtihon sanangizgacha oʻqish rejasi'],
      max_f: ['Pro tarifidagi hamma narsa', 'AI ustoz: istalgan savol boʻyicha istalgan vaqtda soʻrang', 'Oʻqish rejangiz har hafta yangilanadi', 'Azizbek bilan oylik jonli guruh darsi'],
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
      pay_ok_t: 'Pro yoqildi', pay_ok: 'Pro {d} gacha faol. Barcha 15 ta sinov testi ochiq.',
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
      mp_tg_msg: 'Salom! SAT Ustoz {plan} uchun {price} toʻladim. Hisob: {email}. Karta oxiri: {card}. Chek:',
      mp_pending: '{d} kuni toʻlov maʼlumotlaringizni oldik va tekshiryapmiz. Pro 2 soat ichida (Toshkent vaqti bilan 9:00–23:00) yoqiladi, keyin sahifani yangilang.',
      mp_pending_tg: 'Chek skrinshotini hali yubormadingizmi? Toʻlovingizni tezroq topishimiz uchun uni Telegramda yuboring.',
      mp_again: 'Yangi toʻlov qildim',
      mp_unlocked_t: '{plan} yoqildi', mp_unlocked: 'Toʻlovingizni tasdiqlagunimizcha {plan} tarifidan hoziroq, 48 soat davomida foydalanishingiz mumkin. Tasdiqlangach (Toshkent vaqti bilan 9:00–23:00, 2 soat ichida) toʻlagan muddatingiz toʻliq ochiladi. Tezroq tasdiqlashimiz uchun chekni yuboring.',
      pending_note: 'Toʻlovingiz tasdiqlanmoqda: toʻliq muddat tasdiqlangach boshlanadi.',
      mp_trust: 'Toʻlovlar SAT Ustoz asoschisi {name} kartasiga tushadi. Savollar boʻlsa, Telegramda {tg} ga yozing.', mp_instant: '“Toʻladim” tugmasini bosishingiz bilan tarif darhol yoqiladi.',
      launch_tests: '1–10-sinov testlari (ishga tushish munosabati bilan bepul)', pro_tests_launch: '11–15-sinov testlari, faqat Pro tarifida', pro_sets: 'Eng koʻp xato qilinadigan koʻnikmalar boʻyicha toʻplamlar',
      ai_daily: 'Kuniga 3 ta AI ustoz savoli', ai_max: 'Cheksiz AI ustoz va yangi AI mashq savollari',
      bill_pass: 'Narxlar soʻmda. Bir oyga yoki imtihoningizgacha 3 oyga toʻlang.',
      pass_line: 'yoki imtihoningizgacha 3 oyga {price}',
      mp_choose: 'Pro qancha muddatga kerak?', mp_month_t: 'Bir oy', mp_pass_t: 'Imtihoningizgacha 3 oy', mp_pass_d: '{price}: 2,5 oy narxiga 3 oy',
      pitch_lead: 'Pro sizga beradi:', pitch_later: 'Hozir emas', lock_btn: 'Pro bilan ochish',
      cta_wait: 'Max kutish roʻyxatiga yozilish', cta_wait_on: 'Siz kutish roʻyxatidasiz', wl_title: 'Max kutish roʻyxati',
      wl_intro: 'Max AI ustoz, har hafta yangilanadigan oʻqish rejasi va Azizbek bilan oylik jonli guruh darsini qoʻshadi. Telegram foydalanuvchi nomingizni qoldiring, Max ochilganda birinchi boʻlib sizga yozamiz.',
      wl_label: 'Telegram foydalanuvchi nomi', wl_bad: 'Telegram nomingizni kiriting, masalan @satustoz.', wl_join: 'Roʻyxatga yozilish',
      wl_done_t: 'Siz roʻyxatdasiz', wl_done: 'Max ochilgan kuni {tg} ga Telegramda yozamiz.',
      wl_signin: 'Avval kiring, shunda Max ochilganda kimga yozishni bilamiz.',
      wl_failed: 'Saqlab boʻlmadi. Internetni tekshirib, qayta urinib koʻring yoki Telegramda yozing.', wl_change: 'Nomni oʻzgartirish',
      rp_title: 'Xato haqida xabar berish', rp_intro: 'Bu savolda nima notoʻgʻri? Notoʻgʻri javob kaliti, imlo xatosi yoki tushunarsiz izoh: yozing, tuzatamiz.',
      rp_label: 'Nima notoʻgʻri', rp_send: 'Yuborish', rp_done: 'Rahmat. Har bir xabarni oʻqiymiz, xatoni tuzatamiz va tuzatilgach sahifangizda xabar beramiz.', rp_empty: 'Muammo haqida bir necha soʻz yozing.',
      rp_tg: 'Siz hisobga kirmagansiz, shuning uchun xabaringiz Telegramda tayyor holda ochiladi.', rp_tg_btn: 'Telegramda yuborish', rp_tg_msg: 'Xato: {where}, savol {qid}: ',
      fb_title: 'Fikringizni yozing', fb_intro: 'Sizga eng koʻp nima yordam beryapti? Nima yetishmayapti? Har bir xabarni Azizbek oʻqiydi.', fb_label: 'Xabaringiz',
      fb_quote: 'Soʻzlarimni saytda koʻrsatishingiz mumkin (faqat ismim bilan, oʻzgartirmasdan)', fb_done: 'Rahmat! Har bir xabarni oʻqiymiz.'
    },
    ru: {
      free_name: 'Бесплатно', pro_name: 'Pro', max_name: 'Max',
      free_for: 'Попробуйте настоящий формат теста.', pro_for: 'Все тесты и то, где вы теряете баллы.', max_for: 'Pro плюс ИИ-репетитор и живые занятия.',
      free_f: ['Мини-диагностика', 'Пробный тест 1', 'Стартовые наборы вопросов', 'Ваш общий балл'],
      pro_f: ['Все 15 полных адаптивных пробных тестов', 'Разбор балла по навыкам', 'Разбор каждого вопроса с объяснениями', 'Тренировки по вашим самым слабым навыкам', 'План подготовки до даты экзамена'],
      max_f: ['Всё из тарифа Pro', 'ИИ-репетитор: спрашивайте о любом вопросе в любое время', 'План подготовки, обновляемый каждую неделю', 'Ежемесячное живое групповое занятие с Азизбеком'],
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
      pay_ok_t: 'Pro включён', pay_ok: 'Pro активен до {d}. Все 15 пробных тестов открыты.',
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
      mp_tg_msg: 'Здравствуйте! Я оплатил(а) {price} за SAT Ustoz {plan}. Аккаунт: {email}. Карта на {card}. Чек:',
      mp_pending: '{d} мы получили данные о вашем платеже и проверяем их. Pro включится в течение 2 часов (с 9:00 до 23:00 по Ташкенту), затем обновите страницу.',
      mp_pending_tg: 'Ещё не отправили скриншот чека? Отправьте его в Telegram, так мы быстрее найдём платёж.',
      mp_again: 'Я сделал(а) новый платёж',
      mp_unlocked_t: '{plan} включён', mp_unlocked: 'Пользуйтесь {plan} прямо сейчас, 48 часов, пока мы подтверждаем оплату. После подтверждения (в течение 2 часов, с 9:00 до 23:00 по Ташкенту) откроется весь оплаченный срок. Отправьте чек, чтобы мы подтвердили быстрее.',
      pending_note: 'Подтверждаем оплату: полный срок начнётся после подтверждения.',
      mp_trust: 'Платежи поступают основателю SAT Ustoz, {name}. Вопросы? Напишите {tg} в Telegram.', mp_instant: 'Тариф включится сразу, как только вы нажмёте «Я оплатил(а)».',
      launch_tests: 'Пробные тесты 1–10 (бесплатно в честь запуска)', pro_tests_launch: 'Пробные тесты 11–15, только в Pro', pro_sets: 'Наборы по навыкам, где ошибаются чаще всего',
      ai_daily: '3 вопроса ИИ-репетитору в день', ai_max: 'Безлимитный ИИ-репетитор и новые ИИ-вопросы',
      bill_pass: 'Цены в узбекских сумах. Платите за месяц или сразу за 3 месяца до экзамена.',
      pass_line: 'или {price} за 3 месяца, до экзамена',
      mp_choose: 'На какой срок нужен Pro?', mp_month_t: 'Один месяц', mp_pass_t: '3 месяца, до экзамена', mp_pass_d: '{price}: 3 месяца по цене 2,5',
      pitch_lead: 'Pro даёт вам:', pitch_later: 'Не сейчас', lock_btn: 'Открыть с Pro',
      cta_wait: 'В лист ожидания Max', cta_wait_on: 'Вы в листе ожидания', wl_title: 'Лист ожидания Max',
      wl_intro: 'Max добавит ИИ-репетитора, план подготовки с еженедельным обновлением и ежемесячное живое групповое занятие с Азизбеком. Оставьте свой username в Telegram, и мы первыми напишем вам, когда Max откроется.',
      wl_label: 'Username в Telegram', wl_bad: 'Введите username в Telegram, например @satustoz.', wl_join: 'Записаться',
      wl_done_t: 'Вы в списке', wl_done: 'Мы напишем {tg} в Telegram в день запуска Max.',
      wl_signin: 'Сначала войдите, чтобы мы знали, кому написать, когда Max откроется.',
      wl_failed: 'Не удалось сохранить. Проверьте интернет и попробуйте ещё раз или напишите нам в Telegram.', wl_change: 'Изменить username',
      rp_title: 'Сообщить об ошибке', rp_intro: 'Что не так с этим вопросом? Неверный ключ, опечатка, непонятное объяснение: напишите, и мы исправим.',
      rp_label: 'Что не так', rp_send: 'Отправить', rp_done: 'Спасибо. Мы читаем каждое сообщение, исправляем ошибки и сообщим в вашем кабинете, когда исправим.', rp_empty: 'Напишите пару слов о проблеме.',
      rp_tg: 'Вы не вошли в аккаунт, поэтому сообщение откроется в Telegram, готовое к отправке.', rp_tg_btn: 'Отправить в Telegram', rp_tg_msg: 'Ошибка: {where}, вопрос {qid}: ',
      fb_title: 'Расскажите, что думаете', fb_intro: 'Что помогает больше всего? Чего не хватает? Каждое сообщение читает Азизбек.', fb_label: 'Ваше сообщение',
      fb_quote: 'Можно показать мои слова на сайте (только имя, без изменений)', fb_done: 'Спасибо! Мы читаем каждое сообщение.'
    }
  };
  function planText(k, lang) {
    const d = PLAN_TEXT[lang || langNow()] || PLAN_TEXT.en;
    return d[k] != null ? d[k] : PLAN_TEXT.en[k];
  }
  function priceText(amount, lang) {
    return amount + ' ' + (CONFIG.PLANS.CURRENCY[lang] || CONFIG.PLANS.CURRENCY.en);
  }
  // What each plan card lists. During the launch offer every test is free, so
  // Free lists Tests 1 to 10, and Pro lists Tests 11 to 15 and its skill sets. With the AI on, Free and Pro
  // list their daily tutor questions and Max its unlimited AI.
  function planFeatures(id, T) {
    const f = T(id + '_f').slice();
    if (CONFIG.PLANS.TESTS_FREE_FOR_LAUNCH) { if (id === 'free') f[1] = T('launch_tests'); if (id === 'pro') f.splice(0, 1, T('pro_tests_launch'), T('pro_sets')); }
    if (!ai.enabled()) return f;
    if (id === 'max') f[1] = T('ai_max'); else f.push(T('ai_daily'));
    return f;
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
      (cur !== 'free' && (store.get('plan', {}) || {}).source === 'pending' ? '<p class="plan-until">' + esc(T('pending_note')) + '</p>' : '') +
      (cur !== 'free' && pay.enabled() && auth.user ? '<p class="plan-until"><button type="button" class="link-btn" data-manage>' + esc(T('manage')) + '</button></p>' : '') +
      (cur !== 'free' && manual.enabled() && auth.user && (cur === 'pro' || ai.enabled()) && (store.get('plan', {}) || {}).source !== 'pending' ? '<p class="plan-until"><button type="button" class="link-btn" data-upgrade="' + cur + '">' + esc(T('m_more')) + '</button></p>' : '');
    const included = '<button class="btn btn-ghost" type="button" disabled>' + esc(T('cta_included')) + '</button>';
    const freeCta = cur !== 'free' ? included
      : opts.context === 'landing' ? '<a class="btn btn-ghost" href="practice.html">' + esc(T('cta_free')) + '</a>' : current();
    const proCta = cur === 'pro' ? current() : cur === 'max' ? included
      : '<button class="btn btn-primary" type="button" data-upgrade="pro">' + esc(T('cta_pro')) + '</button>';
    // Until Max launches, its card collects a waitlist (Telegram usernames).
    const maxCta = cur === 'max' ? current()
      : ai.enabled() && (manual.enabled() || !auth.enabled()) ? '<button class="btn btn-primary" type="button" data-upgrade="max">' + esc(T('cta_max')) + '</button>'
      : '<button class="btn btn-ghost" type="button" data-waitlist>' + esc(T(store.get('waitlist', null) ? 'cta_wait_on' : 'cta_wait')) + '</button>' +
        '<p class="plan-until"><span class="soon-badge">' + esc(T('soon')) + '</span></p>';
    const passOn = passEnabled();
    const passLine = passOn && cur === 'free' ? '<p class="plan-pass">' + esc(T('pass_line').replace('{price}', priceText(CONFIG.PLANS.PASS_PRICE, lang))) + '</p>' : '';
    const card = (id, cls, flag, amount, monthly, cta, extra) => '<article class="plan' + cls + (cur === id ? ' is-current' : '') + '">' +
      (flag ? '<span class="plan-flag">' + esc(flag) + '</span>' : '') +
      '<h3>' + esc(T(id + '_name')) + '</h3><p class="plan-for">' + esc(T(id + '_for')) + '</p>' +
      price(amount, monthly) + (extra || '') + list(planFeatures(id, T)) + '<div class="plan-cta">' + cta + '</div></article>';
    host.innerHTML = '<div class="plans">' +
      card('free', '', '', '0', false, freeCta) +
      card('pro', ' is-featured', T('popular'), CONFIG.PLANS.PRO_PRICE, true, proCta, passLine) +
      card('max', ' plan-max', '', CONFIG.PLANS.MAX_PRICE, true, maxCta) +
      '</div><p class="plan-note">' + T('note') + '</p><p class="plan-bill">' + esc(T(passOn ? 'bill_pass' : 'bill')) + '</p>';
    $$('[data-upgrade]', host).forEach(b => b.addEventListener('click', () => plan.upgrade(b.dataset.upgrade)));
    $$('[data-waitlist]', host).forEach(b => b.addEventListener('click', openWaitlist));
    $$('[data-manage]', host).forEach(b => b.addEventListener('click', openManage));
  }
  // id: 'pro' (default) or 'max'. Max is sold once the AI tutor is on; until then its card collects a waitlist.
  function openUpgrade(id) {
    const want = id === 'max' ? 'max' : 'pro';
    if (want === 'max' && !ai.enabled()) { openWaitlist(); return; }
    const lang = langNow(), T = k => planText(k, lang);
    analytics.track('upgrade_opened', { sheet: 'upgrade', step: auth.enabled() && !auth.user ? 'sign_in' : pay.enabled() ? 'payme' : manual.enabled() ? 'card_transfer' : 'telegram' });
    if (auth.enabled() && !auth.user) {
      modal({
        title: T(want === 'max' ? 'cta_max' : 'up_title'), html: '<p>' + esc(T('up_signin')) + '</p>',
        actions: [{ label: T('close'), kind: 'ghost' }, { label: T('up_signin_btn'), kind: 'primary', onClick: () => { location.href = loginUrl('practice.html#plans'); } }]
      });
      return;
    }
    // The Payme Worker sells Pro only; Max goes through card transfer.
    if (pay.enabled() && want === 'pro') { openCheckout(); return; }
    if (manual.enabled()) { openManualPay(want); return; }
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
        '<ul class="plan-list">' + planFeatures('pro', T).map(i => '<li>' + esc(i) + '</li>').join('') + '</ul>' +
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

  // "Report a mistake" on a question (kind 'mistake') and "Send feedback"
  // (kind 'feedback'). Signed in: saved to reports/<auto id>, listed on
  // admin.html. Signed out: the same message opens on Telegram, ready to send.
  function openNote(kind, opts) {
    opts = opts || {};
    const lang = langNow(), T = k => planText(k, lang);
    const mistake = kind === 'mistake', P = mistake ? 'rp_' : 'fb_';
    const canSave = manual.canSave();
    const prefix = mistake ? T('rp_tg_msg').replace('{where}', opts.where || '-').replace('{qid}', opts.qid || '-') : '';
    const ui = stepModal(T(P + 'title'), lang);
    const { show, row, closeBtn } = ui;
    function form(msg, text) {
      show('<form class="pay-card" novalidate><p>' + esc(T(P + 'intro')) + '</p>' +
        '<div class="field"><label for="nt-text">' + esc(T(P + 'label')) + '</label><textarea id="nt-text" class="input" rows="4" maxlength="1000">' + esc(text || '') + '</textarea></div>' +
        (!mistake && canSave ? '<label class="nt-quote"><input type="checkbox" id="nt-quote"> ' + esc(T('fb_quote')) + '</label>' : '') +
        (canSave ? '' : '<p class="muted small">' + esc(T('rp_tg')) + '</p>') +
        '<p class="pay-err" role="alert"' + (msg ? '' : ' hidden') + '>' + esc(msg || '') + '</p>' +
        row(closeBtn() + '<button type="submit" class="btn btn-primary">' + esc(T(canSave ? 'rp_send' : 'rp_tg_btn')) + '</button>') + '</form>', '#nt-text');
      const f = $('form', ui.box), ta = $('#nt-text', f), err = $('.pay-err', f);
      f.addEventListener('submit', async e => {
        e.preventDefault();
        const body = ta.value.trim().slice(0, 1000);
        if (body.length < 3) { err.textContent = T('rp_empty'); err.hidden = false; ta.focus(); return; }
        if (!canSave) { window.open(CONFIG.CONTACT_TELEGRAM + '?text=' + encodeURIComponent(prefix + body), '_blank', 'noopener'); ui.m.close(); return; }
        const quote = $('#nt-quote', f);
        const quoteOk = !!(quote && quote.checked);
        $$('button, textarea, input', f).forEach(el => { el.disabled = true; });
        try {
          const fs = await sync._lib();
          await fs.addDoc(fs.collection(sync.db, 'reports'), {
            uid: auth.user.uid, email: auth.user.email || '', name: (auth.user.name || '').slice(0, 100), kind,
            qid: String(opts.qid || '').slice(0, 100), where: String(opts.where || '').slice(0, 120),
            text: body, quoteOk, lang, page: (location.pathname.split('/').pop() || 'index.html').slice(0, 60), createdAt: fs.serverTimestamp()
          });
          show('<p class="pay-ok">' + esc(T(P + 'done')) + '</p>' + row(closeBtn()), '[data-close]');
        } catch (ex) {
          console.warn('[SAT Ustoz] Could not save the message. Are the new firestore.rules published?', ex);
          form(T('wl_failed'), body);
        }
      });
    }
    form();
  }

  function copyText(text, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast(msg), () => toast(text));
    else toast(text);
  }

  // Card transfer: the card and price, then the last 4 digits of the student's
  // card, then the receipt screenshot on Telegram (that message is how you hear
  // about it). A note from the last 7 days means we are still checking it.
  function openManualPay(planId) {
    planId = planId === 'max' ? 'max' : 'pro';
    const lang = langNow(), T = k => planText(k, lang);
    const ui = stepModal(T(planId === 'max' ? 'cta_max' : 'up_title'), lang);
    const base = planId === 'max' ? CONFIG.PLANS.MAX_PRICE : CONFIG.PLANS.PRO_PRICE;
    const withPass = () => planId === 'pro' && passEnabled();
    const { show, row, closeBtn } = ui;
    const digits = manual.card(), holder = String(CONFIG.MANUAL_PAY.CARD_HOLDER || '').trim();
    // One month, or the "until your test" pass (chosen on the first screen when it is on).
    const passMonths = Number(CONFIG.PLANS.PASS_MONTHS) || 0;
    let months = 1, amount = base, price = priceText(amount, lang);
    const pick = m => { months = m; amount = m > 1 ? CONFIG.PLANS.PASS_PRICE : base; price = priceText(amount, lang); };
    const email = auth.user ? auth.user.email : '';
    const tgLink = last4 => CONFIG.CONTACT_TELEGRAM + '?text=' + encodeURIComponent(T('mp_tg_msg').replace('{plan}', planText(planId + '_name', lang)).replace('{price}', price).replace('{email}', email || '-').replace('{card}', last4 || '----'));
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

    function start() { if (withPass()) choose(); else details(); }

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
        '</div><p class="mp-note">' + esc(T('mp_note')) + (manual.canUnlock() ? ' ' + esc(T('mp_instant')) : '') + '</p>' +
        (holder ? '<p class="mp-note">' + esc(T('mp_trust').replace('{name}', holder).replace('{tg}', '@' + String(CONFIG.CONTACT_TELEGRAM).replace(/\/+$/, '').split('/').pop())) + '</p>' : '') +
        row((withPass() ? '<button type="button" class="btn btn-ghost" data-back>' + esc(T('pay_back')) + '</button>' : closeBtn()) +
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
          try { await manual.send(l4, rec.value.trim().slice(0, 60), lang, months, planId); saved = true; }
          catch (ex) { console.warn('[SAT Ustoz] Could not save the payment note. Are the new firestore.rules published?', ex); }
        }
        analytics.track('pay_note_sent', { months, amount: somNumber(amount), saved });
        let unlocked = false;
        if (saved && manual.canUnlock()) {
          try { await manual.unlock(planId); unlocked = true; }
          catch (ex) { console.warn('[SAT Ustoz] Could not switch the plan on for 48 hours. Are the new firestore.rules published?', ex); }
        }
        sent(l4, unlocked);
      });
    }

    function sent(l4, unlocked) {
      const name = planText(planId + '_name', lang);
      show((unlocked
        ? '<p class="pay-ok">' + esc(T('mp_unlocked_t').replace('{plan}', name)) + '</p><p>' + esc(T('mp_unlocked').replace('{plan}', name)) + '</p>'
        : '<p class="pay-ok">' + esc(T('mp_sent_t')) + '</p><p>' + esc(T('mp_sent')) + '</p>') +
        (email ? '<p class="up-email"><span>' + esc(T('mp_account')) + ' <b>' + esc(email) + '</b></span><button type="button" class="link-btn" data-copy="email">' + esc(T('up_copy')) + '</button></p>' : '') +
        row((unlocked ? '<a class="btn btn-ghost" href="practice.html#tests" data-close>' + esc(T('open_tests')) + '</a>' : closeBtn()) + tgBtn(l4)), 'a.btn-primary');
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
    referral.capture();
    // Offline support (sw.js): vocabulary review keeps working without a connection.
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      navigator.serviceWorker.register('sw.js').catch(e => console.warn('[SAT Ustoz] Offline mode is off:', e));
    }
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
    // <button data-report data-qid="…" data-where="Practice Test 1"> and <a data-feedback>
    document.addEventListener('click', e => {
      const r = e.target.closest && e.target.closest('[data-report], [data-feedback]');
      if (!r) return;
      e.preventDefault();
      if (r.hasAttribute('data-report')) openNote('mistake', { qid: r.dataset.qid, where: r.dataset.where });
      else openNote('feedback');
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
    ai, toast, modal, openTutor, makePanel, calculator, CALC_ICON, copyText,
    auth, sync, authReady, renderAuthSlots, requireLogin, loginUrl, safeNext, inAppBrowser,
    plan, renderPlans, pay, lockBox, analytics, track,
    pickLang, langNow, i18n, langSwitch, dateText, REGIONS, dayKey, dayNum, weekStart, seededShuffle,
    mistakes, vocab, daily, notices, referral, realScore, classes, mock, FIX_AFTER
  };
})();
