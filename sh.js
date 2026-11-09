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
      // "proOnly" in data/catalog.json (11 to 16) stay Pro either way. Set it to
      // false to go back to Tests 4 to 15 (and 2 and 3 for new students) being Pro.
      // While it's true, keep every test file in data/tests/ (don't use
      // TESTS_ENDPOINT): students without Pro load the tests from there.
      TESTS_FREE_FOR_LAUNCH: true,
      // Tests whose full results (score by module and domain, review of every
      // question with explanations) everyone sees, without Pro.
      FREE_RESULTS_TESTS: ['practice-test-1', 'practice-test-2', 'practice-test-3', 'practice-test-4', 'practice-test-5',
        'practice-test-6', 'practice-test-7', 'practice-test-8', 'practice-test-9', 'practice-test-10']
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

    // Weekly Telegram report (README "9. Score gap, Mistake Bank and Telegram").
    // BOT is your bot's username from @BotFather, without the @. ENDPOINT is
    // the Telegram Worker URL (worker/telegram-worker.js). Leave BOT empty and
    // the "Connect Telegram" button stays hidden.
    TELEGRAM: { BOT: 'Satustozbot', ENDPOINT: 'https://satustoz-tg.azizbeekk7.workers.dev' },

    // Official SAT dates students pick their test day from (goal setup).
    // Check them against collegeboard.org each year and add the next ones.
    SAT_DATES: ['2026-11-07', '2026-12-05', '2027-03-13', '2027-05-01', '2027-06-05'],

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
  // Study data kept together in users/<uid>/data/study: the Mistake Bank,
  // vocabulary progress, question of the day, saved drills, study plan, classes and lesson checks.
  // gap: the Score Gap Analyzer's latest snapshot and one per week (the weekly
  // Telegram report compares them). ai: Max's weekly AI study plan and mistake summary.
  // xp: the streak, XP, streak freezes and daily goal (xp below).
  const STUDY_KEYS = ['mistakes', 'vocab', 'daily', 'drills', 'studyPlan', 'classes', 'lessons', 'gap', 'ai', 'xp'];
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
      if (key === 'attempts' || key === 'testHistory' || key === 'vocab') xpSoon();
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
  // One row per answer. source is the session type: 'test', 'drill', 'set',
  // 'review' (Mistake Bank) and others; ch is the chosen answer, g "I guessed",
  // tid the practice test and mod its module (1 or 2).
  function recordAttempts(list) {
    const all = getAttempts().concat(list.map(a => {
      const r = {
        qid: a.qid, section: a.section, domain: a.domain || domainOf(a.section, a.skill), skill: a.skill || 'Other',
        difficulty: a.difficulty, correct: !!a.correct, source: a.source || 'practice', ms: a.ms || 0, ts: a.ts || Date.now()
      };
      if (a.ch != null && a.ch !== '') r.ch = String(a.ch).slice(0, 8);
      if (a.g) r.g = true;
      if (a.tid) { r.tid = String(a.tid); r.mod = a.mod || 1; }
      return r;
    }));
    store.set('attempts', all.slice(-3000));
  }
  // Mark answers already saved as guesses (test results page).
  function markGuessed(qids, ts) {
    const want = new Set(qids);
    store.set('attempts', getAttempts().map(a => want.has(a.qid) && a.ts >= ts ? Object.assign({}, a, { g: true }) : a));
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
  // targetRw / targetMath: optional section targets (0 = split the total).
  // focus: '' both sections, 'rw' or 'math' for a student who preps one section.
  const PROFILE_DEFAULTS = { name: '', target: 1400, targetRw: 0, targetMath: 0, focus: '', goalSet: false, testDate: '', grade: '', region: '', school: '', onboarded: false, updatedAt: 0 };
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
     Question times and error types. Each question's median time comes from
     correct answers by all students (stats/questionTimes, written nightly by
     the Telegram Worker once a question has 30 of them). Until then: the
     official pace, 71 seconds for Reading and Writing, 95 for Math.
     ------------------------------------------------------------------ */
  const PACE = { rw: 71, math: 95 };
  const DAY = 86400000;
  const qtimes = {
    _m: null,
    map() { if (!this._m) this._m = (store.get('qtimes', null) || {}).m || {}; return this._m; },
    async load() {
      const c = store.get('qtimes', null);
      if (c && Date.now() - c.at < DAY) return;
      try {
        await auth.ready();
        if (!auth.fb) return;
        const fs = await sync._lib();
        const s = await fs.getDoc(fs.doc(sync.db, 'stats', 'questionTimes'));
        store.set('qtimes', { at: Date.now(), m: s.exists() ? s.data().m || {} : {} });
        this._m = null;
      } catch (e) { console.warn('[SAT Ustoz] Could not load question times. Are the new firestore.rules published?', e); }
    },
    // Seconds.
    median(qid, section) { const v = Number(this.map()[qid]); return v > 0 ? v : PACE[section] || 80; }
  };
  // 'rushed' (wrong, under half the median), 'stuck' (wrong, over 1.5 x), 'normal'
  // (other misses), 'slow' (right, over 1.5 x) or 'ok'.
  function errorType(ok, ms, qid, section) {
    const med = qtimes.median(qid, section) * 1000;
    if (!ok) return !ms ? 'normal' : ms < .5 * med ? 'rushed' : ms > 1.5 * med ? 'stuck' : 'normal';
    return ms && ms > 1.5 * med ? 'slow' : 'ok';
  }
  // A question whose text names a choice by letter keeps its order on review.
  const LETTER_REF = /\b[Cc]hoices?\s+\(?[A-E]\)?(?![a-z])|\([A-E]\)|\b[Oo]ptions?\s+[A-E]\b/;
  function refersToLetter(q) {
    if (q.refersToChoiceLetter != null) return !!q.refersToChoiceLetter;
    return LETTER_REF.test([q.prompt, q.passage, q.explanation].concat(q.choices || []).join(' '));
  }
  // A copy of q with its choices in a new order (Mistake Bank reviews), so the
  // student can't remember "it was C". q.order[newIndex] = original index, q.base the original.
  function shuffledCopy(q) {
    if (q.type !== 'mc' || refersToLetter(q)) return q;
    let order = shuffle(q.choices.map((_, i) => i));
    if (order.every((o, i) => o === i)) order = order.slice(1).concat(order[0]);
    return Object.assign({}, q, { choices: order.map(i => q.choices[i]), answer: LETTERS[order.indexOf(LETTERS.indexOf(q.answer))], order, base: q });
  }
  // A letter picked in a shuffled copy, as the letter of the original order.
  const origLetter = (q, L) => q.order && LETTERS.indexOf(L) > -1 ? LETTERS[q.order[LETTERS.indexOf(L)]] : L;

  /* ------------------------------------------------------------------
     Raw to scaled, with the same estimator as the practice tests
     (sectionScore in test.html) for a full section: 54 Reading and Writing
     or 44 Math questions, split evenly across the two modules.
     ------------------------------------------------------------------ */
  const SECTION_Q = { rw: 54, math: 44 };
  const scale = {
    scaled(sec, raw) {
      const n = SECTION_Q[sec] / 2;
      raw = Math.max(0, Math.min(2 * n, Math.round(raw)));
      const c1 = Math.min(n, Math.ceil(raw / 2)), c2 = raw - c1;
      const w = c1 >= .6 * n ? 1.4 : .75;
      return Math.max(200, Math.min(800, Math.round((200 + 600 * (c1 + w * c2) / (n + 1.4 * n)) / 10) * 10));
    },
    // Fewest correct answers that reach this section score.
    rawFor(sec, score) { for (let r = 0; r <= SECTION_Q[sec]; r++) if (this.scaled(sec, r) >= score) return r; return SECTION_Q[sec]; },
    // Points one more right answer is worth near this raw score. The routing
    // step makes the slope jump around 60% of Module 1, so it is held to 8..20.
    perQuestion(sec, raw) {
      const a = Math.max(0, raw - 3), b = Math.min(SECTION_Q[sec], raw + 3);
      const p = b > a ? (this.scaled(sec, b) - this.scaled(sec, a)) / (b - a) : 10;
      return Math.max(8, Math.min(20, p || 10));
    }
  };

  /* ------------------------------------------------------------------
     Score Gap Analyzer: which points between the current score and the
     target are the cheapest to win back. Numbers as in the spec "SAT Ustoz:
     Top 3 Features": weighted accuracy per domain over its last 60 answers,
     expected misses per test against the misses the target allows, points
     per question from the conversion slope, priority by ease and effort.
     ------------------------------------------------------------------ */
  // Share of each section's questions (College Board test specs) and how slow
  // each domain is to improve (tune with real improvement data).
  const DOMAIN_SHARE = { 'Craft and Structure': .28, 'Information and Ideas': .26, 'Standard English Conventions': .26, 'Expression of Ideas': .20,
    'Algebra': .35, 'Advanced Math': .35, 'Problem-Solving and Data Analysis': .15, 'Geometry and Trigonometry': .15 };
  const DOMAIN_EFFORT = { 'Standard English Conventions': 1.0, 'Expression of Ideas': 1.2, 'Algebra': 1.2, 'Problem-Solving and Data Analysis': 1.3,
    'Geometry and Trigonometry': 1.3, 'Advanced Math': 1.6, 'Information and Ideas': 1.8, 'Craft and Structure': 2.0 };
  const GAP_WINDOW = 60, RANK_MIN = 15, CONFIDENT = 40;
  const isReviewSource = s => s === 'review' || s === 'mistakes';
  const isFullTest = h => h && h.total != null && h.testId !== 'diagnostic-mini';
  const round10 = v => Math.round(v / 10) * 10;
  // Whole numbers that add up exactly to total (largest remainder).
  function splitExact(weights, total) {
    const sum = weights.reduce((a, b) => a + b, 0);
    if (!sum || total <= 0) return weights.map(() => 0);
    const raw = weights.map(w => w / sum * total), out = raw.map(Math.floor);
    let left = Math.round(total) - out.reduce((a, b) => a + b, 0);
    raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { out[i]++; left--; } });
    return out;
  }
  const gap = {
    // opts.now (for tests of the numbers). Returns a snapshot.
    compute(opts) {
      opts = opts || {};
      const now = opts.now || Date.now();
      const p = getProfile();
      const focus = p.focus === 'rw' || p.focus === 'math' ? p.focus : '';
      const secs = focus ? [focus] : ['rw', 'math'];
      const weightOf = ts => { const age = (now - ts) / DAY; return age <= 14 ? 1 : age <= 45 ? .6 : .3; };
      // Untagged answers stay out of every number; they're counted for the content team.
      let untagged = 0;
      const byDomain = {};
      getAttempts().forEach(a => {
        if (isReviewSource(a.source)) return;
        const dom = domainOf(a.section, a.skill);
        if (!dom) { untagged++; return; }
        (byDomain[a.section + '|' + dom] = byDomain[a.section + '|' + dom] || []).push(a);
      });
      if (untagged) console.warn('[SAT Ustoz] ' + untagged + ' answers have no known skill and are left out of the score gap.');
      const stat = list => {
        let w = 0, wc = 0;
        const err = { rushed: 0, stuck: 0, normal: 0, slow: 0 };
        let misses = 0, easyMiss = 0;
        list.forEach(a => {
          const k = weightOf(a.ts); w += k; if (a.correct) wc += k;
          const t = errorType(a.correct, a.ms, a.qid, a.section);
          if (!a.correct) { misses++; err[t]++; if (a.difficulty !== 'hard') easyMiss++; } else if (t === 'slow') err.slow++;
        });
        return { n: list.length, acc: w ? wc / w : 0, misses, err, e: misses ? easyMiss / misses : 0, r: misses ? err.rushed / misses : 0 };
      };
      // Current estimate: the last 2 full practice tests, else domain accuracies.
      const hist = getTestHistory().filter(isFullTest).sort((a, b) => b.finishedAt - a.finishedAt).slice(0, 2);
      const domStats = {};
      secs.forEach(sec => Object.keys(TAXONOMY[sec].domains).forEach(dom => {
        const list = (byDomain[sec + '|' + dom] || []).sort((a, b) => b.ts - a.ts).slice(0, GAP_WINDOW);
        domStats[sec + '|' + dom] = Object.assign(stat(list), { list });
      }));
      const est = {};
      let estFrom = null;
      if (hist.length) {
        estFrom = 'tests';
        secs.forEach(sec => { const v = hist.map(h => h.sections && h.sections[sec] && h.sections[sec].score).filter(Boolean); est[sec] = v.length ? round10(v.reduce((a, b) => a + b, 0) / v.length) : null; });
      }
      secs.forEach(sec => {
        if (est[sec]) return;
        const doms = Object.keys(TAXONOMY[sec].domains), have = doms.filter(d => domStats[sec + '|' + d].n);
        if (!have.length) { est[sec] = null; return; }
        const mean = have.reduce((s, d) => s + domStats[sec + '|' + d].acc, 0) / have.length;
        const raw = doms.reduce((s, d) => s + DOMAIN_SHARE[d] * SECTION_Q[sec] * (domStats[sec + '|' + d].n ? domStats[sec + '|' + d].acc : mean), 0);
        est[sec] = scale.scaled(sec, raw);
        if (!estFrom) estFrom = 'practice';
      });
      const known = secs.every(s => est[s]);
      const estimate = known ? secs.reduce((s, x) => s + est[x], 0) : null;
      // Targets: the section targets if both are set, else the total split like the current scores.
      const total = Math.max(400, Math.min(1600, round10(+p.target || 1400)));
      const targets = {};
      if (p.targetRw && p.targetMath) { targets.rw = +p.targetRw; targets.math = +p.targetMath; }
      else {
        const share = est.rw && est.math ? est.rw / (est.rw + est.math) : .5;
        targets.rw = Math.max(200, Math.min(800, round10(total * share)));
        targets.math = Math.max(200, Math.min(800, total - targets.rw));
        targets.rw = Math.max(200, Math.min(800, total - targets.math));
      }
      const target = focus ? targets[focus] : total;
      const gapTotal = known ? Math.max(0, target - estimate) : null;
      // Per domain and skill.
      const perQ = {}, rawTarget = {};
      secs.forEach(sec => { perQ[sec] = scale.perQuestion(sec, scale.rawFor(sec, est[sec] || 500)); rawTarget[sec] = scale.rawFor(sec, targets[sec]); });
      const pts = (sec, w, acc) => {
        const miss = w * SECTION_Q[sec] * (1 - acc), allowed = w * (SECTION_Q[sec] - rawTarget[sec]);
        return { miss, raw: Math.max(0, miss - allowed) * perQ[sec] };
      };
      const conf = n => n < RANK_MIN ? 'none' : n < CONFIDENT ? 'low' : 'ok';
      const domains = [];
      secs.forEach(sec => Object.keys(TAXONOMY[sec].domains).forEach(dom => {
        const s = domStats[sec + '|' + dom], w = DOMAIN_SHARE[dom];
        const g = pts(sec, w, s.acc);
        const skillNames = TAXONOMY[sec].domains[dom];
        const skills = skillNames.map(sk => {
          const ss = stat(s.list.filter(a => a.skill === sk));
          const sg = pts(sec, w / skillNames.length, ss.acc);
          return { skill: sk, n: ss.n, acc: ss.acc, err: ss.err, e: ss.e, r: ss.r, conf: conf(ss.n), miss: sg.miss, raw: ss.n ? sg.raw : 0,
            priority: ss.n ? sg.raw * (1 + ss.e + .5 * ss.r) / DOMAIN_EFFORT[dom] : 0 };
        }).filter(x => x.n);
        domains.push({ section: sec, domain: dom, n: s.n, acc: s.acc, err: s.err, e: s.e, r: s.r, conf: conf(s.n), miss: g.miss, raw: s.n ? g.raw : 0,
          priority: s.n ? g.raw * (1 + s.e + .5 * s.r) / DOMAIN_EFFORT[dom] : 0, skills });
      }));
      // Every domain with answers shares the headline gap exactly, so the rows add
      // up to it. Domains under 15 answers aren't ranked; their points are shown as one line.
      const ranked = domains.filter(d => d.n > 0);
      const base = ranked.some(d => d.raw > 0) ? ranked.map(d => d.raw) : ranked.map(d => d.miss);
      splitExact(base, gapTotal || 0).forEach((v, i) => { ranked[i].gap = v; });
      domains.forEach(d => {
        if (d.gap == null) d.gap = 0;
        const rs = d.skills;
        const sb = rs.some(s => s.raw > 0) ? rs.map(s => s.raw) : rs.map(s => s.miss);
        splitExact(sb, d.gap).forEach((v, i) => { rs[i].gap = v; });
        d.skills.forEach(s => { if (s.gap == null) s.gap = 0; });
        d.skills.sort((a, b) => (b.conf !== 'none') - (a.conf !== 'none') || b.priority - a.priority || b.gap - a.gap);
      });
      domains.sort((a, b) => (b.conf !== 'none') - (a.conf !== 'none') || b.priority - a.priority || b.gap - a.gap);
      const topD = domains.find(d => d.conf !== 'none' && d.gap > 0) || null;
      const topS = topD ? (topD.skills.find(s => s.conf !== 'none' && s.gap > 0) || null) : null;
      const accOf = {};
      domains.forEach(d => { if (d.n >= 10) accOf[d.section + '|' + d.domain] = [Math.round(d.acc * 100), d.n]; d.skills.forEach(s => { if (s.n >= 10) accOf[d.section + '|' + s.skill] = [Math.round(s.acc * 100), s.n]; }); });
      domains.forEach(d => { delete d.raw; delete d.miss; d.skills.forEach(s => { delete s.raw; delete s.miss; }); });
      return {
        t: now, estimate, est, estFrom, target, targets, focus, gap: gapTotal, testDate: p.testDate || '', domains, untagged,
        top: topD ? { section: topD.section, domain: topD.domain, gap: topD.gap, skill: topS ? topS.skill : '', skillGap: topS ? topS.gap : 0 } : null, acc: accOf
      };
    },
    // Compute and keep the snapshot (study data 'gap': the latest and one per week).
    refresh(opts) {
      const snap = this.compute(opts);
      const g = store.get('gap', null) || {};
      const wk = String(weekStart(snap.t));
      const lite = { t: snap.t, estimate: snap.estimate, target: snap.target, gap: snap.gap, est: snap.est, top: snap.top, acc: snap.acc };
      const prev = g.cur || {};
      const same = prev.estimate === snap.estimate && prev.gap === snap.gap && JSON.stringify(prev.top) === JSON.stringify(snap.top) && JSON.stringify(prev.acc) === JSON.stringify(snap.acc);
      if (!same || !(g.weeks && g.weeks[wk]) || snap.t - (prev.t || 0) > 6 * 3600000) {
        const weeks = Object.assign({}, g.weeks, { [wk]: lite });
        Object.keys(weeks).sort().slice(0, -104).forEach(k => { delete weeks[k]; });
        store.set('gap', { cur: Object.assign({}, lite, { domains: snap.domains.map(d => ({ s: d.section, d: d.domain, g: d.gap, p: Math.round(d.priority * 10) / 10 })) }), weeks });
      }
      return snap;
    },
    weeks() { return (store.get('gap', null) || {}).weeks || {}; },
    // Max: a straight trend line through the full test totals of the last 60
    // days (at least 3 tests over at least 10 days) and the day it reaches the target.
    projection(snap) {
      const now = Date.now();
      const pts = getTestHistory().filter(h => isFullTest(h) && h.finishedAt >= now - 60 * DAY).sort((a, b) => a.finishedAt - b.finishedAt);
      if (pts.length < 3 || pts[pts.length - 1].finishedAt - pts[0].finishedAt < 10 * DAY) return { ok: false, need: Math.max(0, 3 - pts.length) };
      const xs = pts.map(h => (h.finishedAt - now) / DAY), ys = pts.map(h => h.total);
      const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
      const sxx = xs.reduce((s, x) => s + (x - mx) * (x - mx), 0);
      const slope = sxx ? xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / sxx : 0; // points a day
      const at = days => Math.max(400, Math.min(1600, my + slope * (days - mx)));
      const testDay = snap.testDate ? Date.parse(snap.testDate + 'T08:00:00+05:00') : 0;
      const byTest = testDay > now ? round10(at((testDay - now) / DAY)) : null;
      const out = { ok: true, slope, from: pts[0].finishedAt, line: [[pts[0].finishedAt, at(xs[0])]], byTest, testDay };
      if (slope <= .05) { out.flat = true; out.line.push([now + 30 * DAY, at(30)]); return out; }
      const days = (snap.target - (my - slope * mx)) / slope;
      const when = now + Math.max(0, days) * DAY;
      out.line.push([Math.min(when, now + 183 * DAY), at(Math.min(days, 183))]);
      if (days > 183) out.beyond = true; else out.when = when;
      out.late = !!(testDay > now && when > testDay);
      return out;
    }
  };

  /* ------------------------------------------------------------------
     Mistake Bank: every wrong answer, and every right one marked "I
     guessed", comes back on a schedule (Leitner boxes) until it's right
     several times in a row. A review counts as right only when it's also
     under 1.5 x the question's median time. Meeting the question again in a
     test or drill counts as a review. A Words in Context miss also puts the
     right word into the vocabulary "from your mistakes" deck.
     Card: { qid, ref, where, section, skill, difficulty, p (a few words of the
     question), box 1..4, due, st: 'active' | 'mastered' | 'archived',
     kind: 'miss' | 'speed', misses (times wrong), ch (their last wrong answer),
     tag / sug (error tag chosen / suggested from time), note, first (added),
     lr (last review), rv / rc (reviews / right reviews), mAt (mastered), t }
     ------------------------------------------------------------------ */
  const BOX_DAYS = [0, 1, 3, 7, 21];
  const DAILY_CAP = 20, FREE_BANK = 15;
  const MAX_MISTAKES = 600;
  const ERROR_TAGS = [
    ['unknown', 'Didn’t know it', 'Concept or rule not learned'],
    ['misread', 'Misread', 'Missed a word like NOT or EXCEPT, or the actual question'],
    ['calc', 'Calculation slip', 'Right method, wrong arithmetic'],
    ['torn', 'Torn between two', 'Narrowed it to two and picked the wrong one'],
    ['time', 'Ran out of time', 'Rushed or guessed because of the clock'],
    ['guess', 'Guessed', 'No idea at all']
  ];
  const tagLabel = id => (ERROR_TAGS.find(t => t[0] === id) || [, ''])[1];
  // Rushed suggests "Misread", stuck suggests "Didn't know it".
  const suggestTag = type => type === 'rushed' ? 'misread' : type === 'stuck' ? 'unknown' : '';
  const endOfToday = () => (dayNum() + 1) * DAY - TZ_MS;
  // Cards from the old notebook (streak / fixed) become Box 1, or mastered.
  function asCard(e) {
    if (!e || e.deleted || e.box) return e;
    const c = Object.assign({ kind: 'miss', rv: 0, rc: 0 }, e);
    if (c.fixed) { c.box = 4; c.st = 'mastered'; c.mAt = c.fixedAt || c.t; } else { c.box = 1; c.st = 'active'; c.due = (c.t || Date.now()) + DAY; }
    return c;
  }
  const mistakes = {
    map() {
      const m = store.get('mistakes', {}) || {};
      const out = {};
      Object.keys(m).forEach(k => { out[k] = asCard(m[k]); });
      return out;
    },
    all() { return live(this.map()).filter(e => e.st !== 'archived'); },
    open() { return this.all().filter(e => e.st === 'active'); },
    mastered() { return this.all().filter(e => e.st === 'mastered'); },
    // 'free': the last 15 mistakes, reviewed by hand. 'pro': unlimited with the
    // schedule (also students in a teacher's class, so reviews can be homework). 'max': + twins.
    level() { return plan.allows('max') ? 'max' : plan.allows('pro') || classes.mine().length ? 'pro' : 'free'; },
    // Cards a Free student sees: the newest 15 that aren't mastered.
    visible() {
      const list = this.open().filter(e => e.kind !== 'speed');
      if (this.level() !== 'free') return list;
      return list.filter(e => e.ref.type !== 'test' || plan.insights({ testId: e.ref.id })).sort((a, b) => (b.first || b.t) - (a.first || a.t)).slice(0, FREE_BANK);
    },
    // Today's review: due cards, lowest box first then most overdue, at most
    // 20 (the rest roll to tomorrow), with domains mixed rather than grouped.
    queue(skill) {
      const end = endOfToday();
      const due = this.open().filter(e => e.kind !== 'speed' && (e.due || 0) <= end && (!skill || e.skill === skill))
        .sort((a, b) => a.box - b.box || (a.due || 0) - (b.due || 0)).slice(0, DAILY_CAP);
      const groups = {};
      due.forEach(e => { const k = e.section + '|' + domainOf(e.section, e.skill); (groups[k] = groups[k] || []).push(e); });
      const lists = Object.values(groups).sort((a, b) => b.length - a.length), out = [];
      while (lists.some(l => l.length)) lists.forEach(l => { if (l.length) out.push(l.shift()); });
      return out;
    },
    dueCount() { return this.open().filter(e => e.kind !== 'speed' && (e.due || 0) <= endOfToday()).length; },
    // src: { type: 'set' | 'test' | 'ai', id, where }; info: { ms, ch, guessed, review }
    record(q, ok, src, info) { return this.recordMany([{ q, ok, src, info }]); },
    recordMany(items) {
      const m = this.map();
      const out = [];
      items.forEach(it => { const r = this._apply(m, it.q, it.ok, it.src, it.info || {}); if (r) out.push(r); });
      if (!out.length) return out;
      const now = Date.now();
      // Keep the bank small enough for one Firestore document: mastered ones go first.
      const ids = Object.keys(m).filter(k => !m[k].deleted);
      if (ids.length > MAX_MISTAKES) {
        ids.sort((a, b) => (m[a].st === 'active' ? 1 : 0) - (m[b].st === 'active' ? 1 : 0) || m[a].t - m[b].t)
          .slice(0, ids.length - MAX_MISTAKES).forEach(k => { m[k] = { deleted: true, t: now }; });
      }
      store.set('mistakes', m);
      return out;
    },
    // Returns what happened: { qid, was, box, result: 'added' | 'up' | 'back' | 'mastered' | 'slow' }.
    _apply(m, q, ok, src, info) {
      if (!q || !q.id || !src) return null;
      const now = Date.now();
      const had = m[q.id] && !m[q.id].deleted ? Object.assign({}, m[q.id]) : null;
      const type = errorType(ok, info.ms, q.id, q.section);
      const reviewing = had && had.st === 'active';
      const put = (e, box) => { e.box = box; e.due = now + BOX_DAYS[box] * DAY; e.t = now; };
      const info2 = (e, result, was) => ({ qid: q.id, was, box: e.box, result, type });
      if (!ok || info.guessed) {
        const e = Object.assign(had || { qid: q.id, first: now, misses: 0, rv: 0, rc: 0 }, {
          ref: src.type === 'ai' ? { type: 'ai', id: '' } : { type: src.type, id: String(src.id || '') },
          where: String(src.where || '').slice(0, 80), section: q.section, skill: q.skill || 'Other', difficulty: q.difficulty || 'medium',
          kind: 'miss', st: 'active', fixed: false,
          // A few words of the question, so the bank list is readable.
          p: String(q.passage || q.prompt || '').replace(/_{3,}/g, '…').replace(/\$\$?|\*\*|__|\*/g, '').replace(/\s+/g, ' ').trim().slice(0, 110)
        });
        const was = had ? had.box : 0;
        if (!ok) { e.misses = (e.misses || 0) + 1; if (info.ch != null && info.ch !== '') e.ch = String(info.ch).slice(0, 8); e.sug = suggestTag(type) || e.sug || ''; }
        else e.sug = 'guess';
        if (reviewing) { e.rv = (e.rv || 0) + 1; e.lr = now; }
        delete e.fixedAt; delete e.mAt;
        put(e, 1);
        // AI questions exist nowhere else, so the bank keeps their text.
        if (src.type === 'ai') e.q = JSON.parse(JSON.stringify(q));
        m[q.id] = e;
        if (!ok) vocab.fromMiss(q);
        return info2(e, had ? 'back' : 'added', was);
      }
      if (reviewing) {
        const e = had, was = e.box;
        e.rv = (e.rv || 0) + 1; e.lr = now;
        // Right but slow isn't mastery yet: back to Box 1.
        if (type === 'slow') { put(e, 1); m[q.id] = e; return info2(e, 'slow', was); }
        e.rc = (e.rc || 0) + 1;
        if (e.box >= 4) {
          e.st = 'mastered'; e.mAt = now; e.fixed = true; e.fixedAt = now; e.t = now; delete e.due;
          m[q.id] = e; return info2(e, 'mastered', was);
        }
        put(e, e.box + 1); m[q.id] = e;
        return info2(e, 'up', was);
      }
      // Pro and Max: a slow right answer goes to the Speed tab.
      if (!had && type === 'slow' && this.level() !== 'free' && src.type !== 'ai') {
        const e = { qid: q.id, first: now, misses: 0, rv: 0, rc: 0, kind: 'speed', st: 'active', fixed: false,
          ref: { type: src.type, id: String(src.id || '') }, where: String(src.where || '').slice(0, 80), section: q.section, skill: q.skill || 'Other',
          difficulty: q.difficulty || 'medium', p: String(q.passage || q.prompt || '').replace(/\$\$?|\*\*|__|\*/g, '').replace(/\s+/g, ' ').trim().slice(0, 110) };
        put(e, 1); m[q.id] = e;
        return info2(e, 'added', 0);
      }
      return null;
    },
    _edit(qid, fields) {
      const m = this.map();
      if (!m[qid] || m[qid].deleted) return;
      m[qid] = Object.assign({}, m[qid], fields, { t: Date.now() });
      store.set('mistakes', m);
    },
    setTag(qid, tag) { this._edit(qid, { tag: ERROR_TAGS.some(t => t[0] === tag) ? tag : '' }); track('mistake_tagged', { tag }); },
    setNote(qid, note) { this._edit(qid, { note: String(note || '').slice(0, 400) }); },
    remove(qid) { const m = this.map(); m[qid] = { deleted: true, t: Date.now() }; store.set('mistakes', m); },
    stats() {
      const all = this.all(), month = Date.parse(dayKey().slice(0, 7) + '-01T00:00:00+05:00');
      const rv = all.reduce((s, e) => s + (e.rv || 0), 0), rc = all.reduce((s, e) => s + (e.rc || 0), 0);
      const tags = {};
      all.forEach(e => { const t = e.tag || e.sug; if (t && e.kind !== 'speed') tags[t] = (tags[t] || 0) + 1; });
      const common = Object.keys(tags).sort((a, b) => tags[b] - tags[a])[0] || '';
      return { total: all.length, active: all.filter(e => e.st === 'active').length, masteredMonth: all.filter(e => e.st === 'mastered' && (e.mAt || 0) >= month).length,
        reviewAcc: rv ? rc / rv : null, reviews: rv, commonTag: common };
    },
    // The questions behind bank cards, loaded from their sets and tests. A card
    // whose question was removed from the site is archived silently.
    async questions(entries) {
      const want = {}, found = {}, loaded = {};
      entries.forEach(e => { if (e.ref && e.ref.type !== 'ai' && e.ref.id) { const k = e.ref.type + ':' + e.ref.id; (want[k] = want[k] || []).push(e.qid); } });
      await Promise.all(Object.keys(want).map(async k => {
        const [type, id] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)];
        try {
          if (type === 'set') { const s = await loadSet(id); s.questions.forEach(q => { found[q.id] = Object.assign({ setId: s.id }, q); }); }
          else if (type === 'test') {
            const t = await loadTest(id);
            t.sections.forEach(s => [s.module1, s.module2.easier, s.module2.harder].forEach(m => m.questions.forEach(q => { found[q.id] = Object.assign({ testId: t.id }, q); })));
          }
          loaded[k] = true;
        } catch (e) { console.warn('[SAT Ustoz] Could not load ' + k + ' for the Mistake Bank:', e); }
      }));
      const gone = entries.filter(e => e.ref && e.ref.type !== 'ai' && loaded[e.ref.type + ':' + e.ref.id] && !found[e.qid]);
      if (gone.length) gone.forEach(e => this._edit(e.qid, { st: 'archived' }));
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
      recordAttempts([{ qid: q.id, section: q.section, domain: q.domain, skill: q.skill, difficulty: q.difficulty, correct: ok, source: 'daily', ch: response }]);
      mistakes.record(q, ok, { type: 'set', id: q.setId, where: 'Question of the day' }, { ch: response });
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
     Streak and XP. Every kind of study counts toward one streak: practice
     sets, drills, Mistake Bank reviews, tests, lessons, AI questions, the
     question of the day and vocabulary. XP is worked out from what is
     already saved (answers, finished tests, vocabulary days), so nothing is
     counted twice and study from before this feature counts from day one.
     Study data 'xp' keeps:
       days  each past day's XP, sealed so it survives the 3,000-answer limit
       frz   days a streak freeze covered ({ on, t })
       inv   streak freezes held ({ n, wk: the week they were last given, t })
       goal  the daily goal ({ v, t })
       sum   a short summary the Telegram bot reads (streak, last active day, ...)
     ------------------------------------------------------------------ */
  const XP = {
    easy: 10, medium: 12, hard: 15,  // a right answer, by difficulty
    wrong: 3,                        // a wrong answer still counts as effort
    repeat: 1,                       // the same question again on the same day
    review: 5,                       // extra for a right Mistake Bank review
    daily: 10,                       // extra for the question of the day
    test: 100, short: 40,            // finishing a full test / the mini diagnostic or one section
    word: 2, wordCap: 120,           // each vocabulary card reviewed, at most 120 XP a day
    STREAK_MIN: 10,                  // XP that keeps the streak: one right answer, or the daily question
    GOALS: [20, 50, 100, 200], GOAL: 50
  };
  const XP_MILESTONES = [3, 7, 14, 30, 50, 100, 150, 200, 365, 500, 1000];
  const XP_TEXT = {
    en: {
      streak: 'day streak', streak1: 'day streak', best: 'Best: {n} days',
      st_done: 'Streak safe for today. Come back tomorrow for day {n}.',
      st_done_goal: 'Streak safe and daily goal reached. See you tomorrow.',
      st_keep: 'Earn {x} more XP today to keep your {n}-day streak. One right answer is enough.',
      st_start: 'Answer one question to start a streak.',
      st_lost: 'Your {b}-day streak ended. Answer one question to start a new one.',
      today: 'Today', goal_of: '{x} / {g} XP', goal_change: 'Change goal', level: 'Level {n}', total: '{x} XP in total',
      to_next: '{x} XP to level {n}', week: 'This week: {x} XP', frz: '{n} streak freeze', frzs: '{n} streak freezes', frz0: 'No streak freezes left',
      how: 'How it works', days: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
      d_on: 'studied', d_frz: 'covered by a streak freeze', d_miss: 'missed', d_future: 'still to come',
      goal_t: 'Your daily goal', goal_p: 'How much do you want to do each day? The streak needs only 10 XP. The goal is for you.',
      g20: 'Casual', g50: 'Regular', g100: 'Serious', g200: 'Intense', g_hint: 'about {n} questions',
      cancel: 'Cancel', ok: 'Got it', save: 'Save',
      how_t: 'Streak and XP',
      how_p: '<p>Everything you study counts: practice sets, drills, Mistake Bank reviews, tests, lessons, the question of the day and vocabulary.</p>' +
        '<ul><li><b>10 XP a day keeps your streak.</b> One right answer, or the question of the day, is enough.</li>' +
        '<li>A right answer: 10 XP (easy), 12 (medium), 15 (hard). A wrong one: 3 XP for the effort. The same question again that day: 1 XP.</li>' +
        '<li>Fixing a question in the Mistake Bank: 5 XP extra. Question of the day: 10 XP extra.</li>' +
        '<li>Finishing a full practice test: 100 XP. The mini diagnostic or one section: 40 XP.</li>' +
        '<li>Each vocabulary card you review: 2 XP (up to 120 a day).</li></ul>' +
        '<p><b>Streak freezes</b> cover a day you miss, so one busy day doesn’t end your streak. They are used for you the next time you open the site, only if you have one for every day missed. Free: 1 each Monday, hold 1. Pro and Max: 2 each Monday, hold up to 3.</p>',
      chip: '{n}-day streak. Today {x} of {g} XP',
      t_start: 'Streak started. Come back tomorrow to make it 2 days.',
      t_up: '{n}-day streak. Keep it going tomorrow.',
      t_mile: '{n} days in a row. That’s a real habit.',
      t_goal: 'Daily goal reached: {g} XP.',
      t_level: 'Level {n} reached.',
      t_frz: 'A streak freeze covered {d}. Your {n}-day streak is safe.',
      t_frz1: 'yesterday', t_frzn: '{n} days',
      saved: 'Daily goal set to {g} XP.'
    },
    uz: {
      streak: 'kunlik seriya', streak1: 'kunlik seriya', best: 'Eng uzun: {n} kun',
      st_done: 'Bugungi seriya saqlandi. {n}-kun uchun ertaga qayting.',
      st_done_goal: 'Seriya saqlandi va kunlik maqsad bajarildi. Ertaga koʻrishguncha.',
      st_keep: '{n} kunlik seriyani saqlash uchun bugun yana {x} XP toʻplang. Bitta toʻgʻri javob yetarli.',
      st_start: 'Seriyani boshlash uchun bitta savolga javob bering.',
      st_lost: '{b} kunlik seriyangiz tugadi. Yangisini boshlash uchun bitta savolga javob bering.',
      today: 'Bugun', goal_of: '{x} / {g} XP', goal_change: 'Maqsadni oʻzgartirish', level: '{n}-daraja', total: 'Jami {x} XP',
      to_next: '{n}-darajagacha {x} XP', week: 'Bu hafta: {x} XP', frz: '{n} ta seriya muzlatkichi', frzs: '{n} ta seriya muzlatkichi', frz0: 'Seriya muzlatkichi qolmadi',
      how: 'Qanday ishlaydi', days: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'],
      d_on: 'mashq qilindi', d_frz: 'muzlatkich bilan saqlandi', d_miss: 'oʻtkazib yuborildi', d_future: 'hali oldinda',
      goal_t: 'Kunlik maqsadingiz', goal_p: 'Har kuni qancha mashq qilmoqchisiz? Seriya uchun 10 XP kifoya. Maqsad oʻzingiz uchun.',
      g20: 'Yengil', g50: 'Oddiy', g100: 'Jiddiy', g200: 'Kuchli', g_hint: 'taxminan {n} ta savol',
      cancel: 'Bekor qilish', ok: 'Tushunarli', save: 'Saqlash',
      how_t: 'Seriya va XP',
      how_p: '<p>Hamma mashq hisoblanadi: savollar toʻplamlari, drillar, Xatolar banki, testlar, darslar, kun savoli va lugʻat.</p>' +
        '<ul><li><b>Kuniga 10 XP seriyani saqlaydi.</b> Bitta toʻgʻri javob yoki kun savoli yetarli.</li>' +
        '<li>Toʻgʻri javob: 10 XP (oson), 12 (oʻrta), 15 (qiyin). Notoʻgʻri javob: harakat uchun 3 XP. Oʻsha kuni xuddi shu savol yana: 1 XP.</li>' +
        '<li>Xatolar bankidagi savolni tuzatish: qoʻshimcha 5 XP. Kun savoli: qoʻshimcha 10 XP.</li>' +
        '<li>Toʻliq testni tugatish: 100 XP. Mini diagnostika yoki bitta boʻlim: 40 XP.</li>' +
        '<li>Har bir takrorlangan lugʻat kartasi: 2 XP (kuniga 120 gacha).</li></ul>' +
        '<p><b>Seriya muzlatkichi</b> oʻtkazib yuborilgan kunni yopadi, shuning uchun bitta band kun seriyani uzmaydi. Saytni keyingi ochganingizda, har bir oʻtkazilgan kun uchun muzlatkich boʻlsa, avtomatik ishlatiladi. Bepul: har dushanba 1 ta, koʻpi bilan 1 ta. Pro va Max: har dushanba 2 ta, koʻpi bilan 3 ta.</p>',
      chip: '{n} kunlik seriya. Bugun {x} / {g} XP',
      t_start: 'Seriya boshlandi. 2 kun boʻlishi uchun ertaga qayting.',
      t_up: '{n} kunlik seriya. Ertaga ham davom eting.',
      t_mile: 'Ketma-ket {n} kun. Bu haqiqiy odat.',
      t_goal: 'Kunlik maqsad bajarildi: {g} XP.',
      t_level: '{n}-darajaga chiqdingiz.',
      t_frz: 'Seriya muzlatkichi {d}ni yopdi. {n} kunlik seriyangiz saqlandi.',
      t_frz1: 'kechagi kun', t_frzn: '{n} kun',
      saved: 'Kunlik maqsad: {g} XP.'
    },
    ru: {
      streak: 'дней подряд', streak1: 'день подряд', best: 'Рекорд: {n} дн.',
      st_done: 'Серия на сегодня сохранена. Возвращайтесь завтра за днём {n}.',
      st_done_goal: 'Серия сохранена, дневная цель выполнена. До завтра.',
      st_keep: 'Наберите ещё {x} XP сегодня, чтобы сохранить серию ({n} дн.). Хватит одного верного ответа.',
      st_start: 'Ответьте на один вопрос, чтобы начать серию.',
      st_lost: 'Серия ({b} дн.) прервалась. Ответьте на один вопрос, чтобы начать новую.',
      today: 'Сегодня', goal_of: '{x} / {g} XP', goal_change: 'Изменить цель', level: 'Уровень {n}', total: 'Всего {x} XP',
      to_next: '{x} XP до уровня {n}', week: 'На этой неделе: {x} XP', frz: '{n} заморозка серии', frzs: 'Заморозок серии: {n}', frz0: 'Заморозок не осталось',
      how: 'Как это работает', days: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
      d_on: 'занимались', d_frz: 'сохранён заморозкой', d_miss: 'пропущен', d_future: 'ещё впереди',
      goal_t: 'Ваша дневная цель', goal_p: 'Сколько вы хотите заниматься каждый день? Для серии хватит 10 XP. Цель — для вас.',
      g20: 'Легко', g50: 'Обычно', g100: 'Серьёзно', g200: 'Интенсивно', g_hint: 'примерно {n} вопросов',
      cancel: 'Отмена', ok: 'Понятно', save: 'Сохранить',
      how_t: 'Серия и XP',
      how_p: '<p>Считается всё: наборы вопросов, дриллы, Банк ошибок, тесты, уроки, вопрос дня и словарь.</p>' +
        '<ul><li><b>10 XP в день сохраняют серию.</b> Хватит одного верного ответа или вопроса дня.</li>' +
        '<li>Верный ответ: 10 XP (лёгкий), 12 (средний), 15 (сложный). Неверный: 3 XP за старание. Тот же вопрос снова в тот же день: 1 XP.</li>' +
        '<li>Исправленный вопрос из Банка ошибок: ещё 5 XP. Вопрос дня: ещё 10 XP.</li>' +
        '<li>Полный пробный тест: 100 XP. Мини-диагностика или одна секция: 40 XP.</li>' +
        '<li>Каждая повторённая карточка словаря: 2 XP (до 120 в день).</li></ul>' +
        '<p><b>Заморозка серии</b> закрывает пропущенный день, чтобы один занятой день не обрывал серию. Она тратится сама, когда вы снова открываете сайт, если заморозок хватает на все пропущенные дни. Бесплатно: 1 каждый понедельник, максимум 1. Pro и Max: 2 каждый понедельник, максимум 3.</p>',
      chip: 'Серия {n} дн. Сегодня {x} из {g} XP',
      t_start: 'Серия началась. Возвращайтесь завтра, чтобы было 2 дня.',
      t_up: '{n} дней подряд. Продолжайте завтра.',
      t_mile: '{n} дней подряд. Это уже привычка.',
      t_goal: 'Дневная цель выполнена: {g} XP.',
      t_level: 'Новый уровень: {n}.',
      t_frz: 'Заморозка закрыла {d}. Серия ({n} дн.) сохранена.',
      t_frz1: 'вчерашний день', t_frzn: '{n} дн.',
      saved: 'Дневная цель: {g} XP.'
    }
  };
  const FLAME = '<svg class="xp-flame" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13.2 1.6c.5 3.1-1.2 5-2.9 6.8C8.6 10.2 6.6 12.2 6.6 15.4a5.6 5.6 0 0 0 11.2.2c0-2.7-1.2-4.6-2.6-6.3-.1 1.7-.8 2.9-2 3.4.9-3.6.5-7.6 0-11.1Zm-1.1 13.1c1.3 1.1 2.3 2.4 2.3 3.6a2.4 2.4 0 0 1-4.8 0c0-1.3 1-2.4 2.5-3.6Z" fill-rule="evenodd"/></svg>';
  const SNOW = '<svg class="xp-snow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2v20M4 6.5l16 11M20 6.5l-16 11M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const xpDayN = k => Math.round(Date.parse(k + 'T00:00:00Z') / DAY);
  const xpKeyOf = n => dayKey(n * DAY - TZ_MS);
  const xp = {
    XP,
    _last: null, _ticked: null,
    T(k, vars) { return i18n(XP_TEXT)(k, vars); },
    get() { const x = store.get('xp', null); return x && typeof x === 'object' ? x : {}; },
    save(x) { store.set('xp', x); },
    // XP per Tashkent day from the saved answers, tests and vocabulary.
    derived() {
      const out = {}, add = (k, n) => { out[k] = (out[k] || 0) + n; }, seen = {};
      getAttempts().slice().sort((a, b) => (a.ts || 0) - (b.ts || 0)).forEach(a => {
        if (!a || !a.ts) return;
        const k = dayKey(a.ts), s = k + '|' + a.qid;
        if (seen[s]) { add(k, XP.repeat); return; }
        seen[s] = 1;
        let n = a.correct ? (XP[a.difficulty] || XP.medium) : XP.wrong;
        if (a.correct && (a.source === 'review' || a.source === 'mistakes')) n += XP.review;
        if (a.source === 'daily') n += XP.daily;
        add(k, n);
      });
      getTestHistory().forEach(h => { if (h && h.finishedAt) add(dayKey(h.finishedAt), isFullTest(h) ? XP.test : XP.short); });
      const vd = (store.get('vocab', {}) || {}).days || {};
      Object.keys(vd).forEach(k => { const r = vd[k] && !vd[k].deleted ? Number(vd[k].r) || 0 : 0; if (r) add(k, Math.min(XP.wordCap, r * XP.word)); });
      return out;
    },
    // Sealed days and what the saved data gives, whichever is larger.
    days() {
      const sealed = this.get().days || {}, d = this.derived(), out = {};
      Object.keys(sealed).forEach(k => { const v = sealed[k]; if (v && v.x > 0) out[k] = v.x; });
      Object.keys(d).forEach(k => { out[k] = Math.max(out[k] || 0, d[k]); });
      return out;
    },
    frozen() { const f = this.get().frz || {}, o = {}; Object.keys(f).forEach(k => { if (f[k] && f[k].on) o[k] = true; }); return o; },
    goal() { const g = this.get().goal, v = g && Number(g.v); return XP.GOALS.indexOf(v) > -1 ? v : XP.GOAL; },
    setGoal(v) {
      v = Number(v); if (XP.GOALS.indexOf(v) < 0) return;
      const x = this.get(); x.goal = { v, t: Date.now() }; this.save(x);
      track('daily_goal_set', { goal: v });
      this.changed(true);
    },
    // Pro, Max and students in a class get more freezes.
    paid() { try { return mistakes.level() !== 'free'; } catch (e) { return false; } },
    cap() { return this.paid() ? 3 : 1; },
    grant() { return this.paid() ? 2 : 1; },
    // Level n starts at 50·n·(n−1) XP: level 2 at 100, 3 at 300, 4 at 600, 5 at 1,000, 10 at 4,500.
    levelOf(total) {
      let n = 1; while (50 * (n + 1) * n <= total) n++;
      const lo = 50 * n * (n - 1), hi = 50 * (n + 1) * n;
      return { n, lo, hi, into: total - lo, need: hi - lo, left: hi - total };
    },
    state(now) {
      now = now || Date.now();
      const days = this.days(), frz = this.frozen(), today = dayKey(now), t0 = dayNum(now);
      const real = k => (days[k] || 0) >= XP.STREAK_MIN, on = k => real(k) || !!frz[k];
      const todayXp = days[today] || 0, doneToday = real(today);
      // A frozen day keeps the streak going but doesn't add to it.
      let n = doneToday ? t0 : t0 - 1, cur = 0, last = '';
      while (on(xpKeyOf(n))) { if (real(xpKeyOf(n))) { cur++; if (!last) last = xpKeyOf(n); } n--; }
      if (!last) { for (let i = t0; i > t0 - 400; i--) if (real(xpKeyOf(i))) { last = xpKeyOf(i); break; } }
      const keys = Object.keys(days).filter(real).concat(Object.keys(frz));
      const nums = Array.from(new Set(keys.map(xpDayN))).sort((a, b) => a - b);
      let best = 0, run = 0, prev = null, prevRun = 0;
      nums.forEach(d => { const r = real(xpKeyOf(d)) ? 1 : 0; run = prev != null && d === prev + 1 ? run + r : r; prev = d; best = Math.max(best, run); });
      // The streak that ended most recently (for "your 12-day streak ended").
      if (!cur && nums.length && last && t0 - xpDayN(last) <= 14) { let i = nums.length - 1; prevRun = 0; while (i >= 0 && (i === nums.length - 1 || nums[i] === nums[i + 1] - 1)) { if (real(xpKeyOf(nums[i]))) prevRun++; i--; } }
      const total = Object.keys(days).reduce((s, k) => s + days[k], 0);
      const w0 = dayNum(weekStart(now) + 12 * 3600000), week = [];
      for (let i = 0; i < 7; i++) {
        const k = xpKeyOf(w0 + i);
        week.push({ k, x: days[k] || 0, on: real(k), frozen: !!frz[k] && !real(k), future: w0 + i > t0, today: w0 + i === t0 });
      }
      const inv = this.get().inv || {};
      return {
        cur, best: Math.max(best, cur), ended: prevRun, last, today: todayXp, doneToday, goal: this.goal(), total,
        level: this.levelOf(total), week, weekXp: week.reduce((s, d) => s + d.x, 0),
        freezes: Math.max(0, Number(inv.n) || 0), cap: this.cap(), days
      };
    },
    // Once a page has loaded (after the account's data has synced): the weekly
    // freezes, a refund for a frozen day that turned out to have study, and
    // freezes for missed days.
    tick() {
      if (this._ticked) return this._ticked;
      this._ticked = (async () => {
        await authReady(6000);
        if (auth.user && sync._start) { try { await sync._start; } catch (e) { /* ignore */ } }
        const now = Date.now(), x = this.get(), wk = weekStart(now), cap = this.cap();
        const inv = Object.assign({ n: 0, wk: 0 }, x.inv), frz = Object.assign({}, x.frz);
        let changed = false;
        if (inv.wk !== wk) { inv.n = Math.min(cap, Math.max(0, Number(inv.n) || 0) + this.grant()); inv.wk = wk; inv.t = now; changed = true; }
        const days = this.days(), real = k => (days[k] || 0) >= XP.STREAK_MIN;
        Object.keys(frz).forEach(k => { if (frz[k] && frz[k].on && real(k)) { frz[k] = { on: false, t: now }; inv.n = Math.min(cap, inv.n + 1); inv.t = now; changed = true; } });
        const t0 = dayNum(now), on = k => real(k) || (frz[k] && frz[k].on);
        let last = t0 - 1;
        while (last > t0 - 60 && !on(xpKeyOf(last))) last--;
        const missed = t0 - 1 - last;
        let used = 0;
        if (missed > 0 && last > t0 - 60 && missed <= inv.n) {
          for (let d = last + 1; d < t0; d++) frz[xpKeyOf(d)] = { on: true, t: now };
          inv.n -= missed; inv.t = now; used = missed; changed = true;
        }
        if (changed) { x.inv = inv; x.frz = frz; this.save(x); }
        this._last = null;
        const st = this.changed(true);
        if (used) {
          toast(this.T('t_frz', { d: used === 1 ? this.T('t_frz1') : this.T('t_frzn', { n: used }), n: st.cur }), 5000);
          track('streak_freeze_used', { days: used, streak: st.cur });
        }
      })();
      return this._ticked;
    },
    // After any study: seal past days, refresh the summary and the header,
    // and say so when the streak grows, the daily goal is met or a level is reached.
    changed(quiet) {
      const st = this.state(), x = this.get(), today = dayKey(), now = Date.now();
      let dirty = false;
      const sealed = Object.assign({}, x.days);
      Object.keys(st.days).forEach(k => { if (k < today && (!sealed[k] || (sealed[k].x || 0) < st.days[k])) { sealed[k] = { x: st.days[k], t: now }; dirty = true; } });
      const sum = { cur: st.cur, best: st.best, last: st.last, done: st.doneToday ? today : '', week: st.weekXp, total: st.total, lvl: st.level.n, frz: st.freezes };
      const old = x.sum || {};
      if (Object.keys(sum).some(k => old[k] !== sum[k])) { x.sum = Object.assign(sum, { t: now }); dirty = true; }
      if (dirty && !sync.applying) { x.days = sealed; this.save(x); }
      let prev = this._last;
      // A page left open past midnight: the new day starts with nothing done yet.
      if (prev && prev.day !== today) prev = Object.assign({}, prev, { day: today, done: false, goal: false });
      this._last = { day: today, total: st.total, lvl: st.level.n, done: st.doneToday, goal: st.today >= st.goal };
      if (!quiet && prev) {
        let msg = '';
        if (!prev.done && st.doneToday) {
          msg = st.cur <= 1 ? this.T('t_start') : XP_MILESTONES.indexOf(st.cur) > -1 ? this.T('t_mile', { n: st.cur }) : this.T('t_up', { n: st.cur });
          track('streak_extended', { streak: st.cur });
        } else if (st.level.n > prev.lvl) {
          msg = this.T('t_level', { n: st.level.n });
          track('level_up', { level: st.level.n });
        } else if (!prev.goal && st.today >= st.goal) {
          msg = this.T('t_goal', { g: st.goal });
          track('daily_goal_reached', { goal: st.goal });
        }
        if (msg) toast(msg, 3800);
      }
      this.paintChip(st, prev && st.total > prev.total);
      $$('[data-xp-card]').forEach(el => { el.outerHTML = this.cardHtml(st); });
      return st;
    },
    // The streak in the page header, for students who have studied at least once.
    paintChip(st, bump) {
      const slot = $('.site-header [data-auth-slot]');
      if (!slot || /(admin|builder|teacher|login)\.html$/.test(location.pathname)) return;
      let el = $('.site-header .xp-chip');
      if (!el && !st.total) return;
      if (!el) { el = document.createElement('a'); el.className = 'xp-chip'; el.href = 'practice.html#home'; slot.parentNode.insertBefore(el, slot); }
      el.classList.toggle('is-off', !st.doneToday);
      el.innerHTML = FLAME + '<b>' + st.cur + '</b>';
      const label = this.T('chip', { n: st.cur, x: st.today, g: st.goal });
      el.setAttribute('aria-label', label); el.title = label;
      if (bump) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    },
    // The dashboard card: <div data-xp-card></div> or xp.cardHtml().
    cardHtml(st) {
      st = st || this.state();
      const T = (k, v) => this.T(k, v), fmt = n => Number(n).toLocaleString('en-US').replace(/,/g, ' ');
      const status = st.doneToday ? (st.today >= st.goal ? T('st_done_goal') : T('st_done', { n: st.cur + 1 }))
        : st.cur ? T('st_keep', { x: XP.STREAK_MIN - st.today, n: st.cur })
        : st.ended >= 2 ? T('st_lost', { b: st.ended }) : T('st_start');
      const names = T('days');
      const week = st.week.map((d, i) => {
        const cls = d.on ? 'is-on' : d.frozen ? 'is-frz' : d.future || d.today ? 'is-future' : 'is-miss';
        const what = d.on ? T('d_on') + ', ' + d.x + ' XP' : d.frozen ? T('d_frz') : d.future || d.today ? T('d_future') : T('d_miss');
        return '<li class="' + cls + (d.today ? ' is-today' : '') + '" title="' + esc(fmtDate(xpDayN(d.k) * DAY + 6 * 3600000) + ': ' + what) + '"><i>' + (d.on ? FLAME : d.frozen ? SNOW : '') + '</i><small>' + esc(names[i]) + '</small><span class="sr-only">' + esc(what) + '</span></li>';
      }).join('');
      const gp = Math.min(100, Math.round(st.today / st.goal * 100)), lp = Math.min(100, Math.round(st.level.into / st.level.need * 100));
      return '<section class="card xp-card" data-xp-card aria-label="' + esc(T('how_t')) + '">' +
        '<div class="xp-main">' +
          '<div class="xp-big' + (st.doneToday ? '' : ' is-off') + '">' + FLAME + '<div><b>' + st.cur + '</b><span>' + esc(st.cur === 1 ? T('streak1') : T('streak')) + '</span></div></div>' +
          '<p class="xp-status">' + esc(status) + '</p>' +
          '<ol class="xp-week">' + week + '</ol>' +
          '<p class="small muted xp-meta">' + esc(T('best', { n: st.best })) + ' · ' + (st.freezes ? SNOW + ' ' + esc(T(st.freezes === 1 ? 'frz' : 'frzs', { n: st.freezes })) : esc(T('frz0'))) + ' · <button type="button" class="link-btn" data-xp-how>' + esc(T('how')) + '</button></p>' +
        '</div>' +
        '<div class="xp-side">' +
          '<div class="xp-row"><div class="xp-row-h"><b>' + esc(T('today')) + '</b><span>' + esc(T('goal_of', { x: fmt(st.today), g: st.goal })) + '</span></div>' +
            '<div class="bar' + (gp >= 100 ? ' is-full' : '') + '" role="progressbar" aria-valuemin="0" aria-valuemax="' + st.goal + '" aria-valuenow="' + Math.min(st.today, st.goal) + '" aria-label="' + esc(T('today')) + '"><i style="width:' + gp + '%"></i></div>' +
            '<button type="button" class="link-btn small" data-xp-goal>' + esc(T('goal_change')) + '</button></div>' +
          '<div class="xp-row"><div class="xp-row-h"><b>' + esc(T('level', { n: st.level.n })) + '</b><span>' + esc(T('total', { x: fmt(st.total) })) + '</span></div>' +
            '<div class="bar bar-gold" role="progressbar" aria-valuemin="0" aria-valuemax="' + st.level.need + '" aria-valuenow="' + st.level.into + '" aria-label="' + esc(T('level', { n: st.level.n })) + '"><i style="width:' + lp + '%"></i></div>' +
            '<span class="small muted">' + esc(T('to_next', { x: fmt(st.level.left), n: st.level.n + 1 })) + ' · ' + esc(T('week', { x: fmt(st.weekXp) })) + '</span></div>' +
        '</div></section>';
    },
    pickGoal() {
      const cur = this.goal(), T = (k, v) => this.T(k, v);
      const html = '<p class="muted">' + esc(T('goal_p')) + '</p><div class="xp-goals" role="radiogroup" aria-label="' + esc(T('goal_t')) + '">' +
        XP.GOALS.map(g => '<label class="xp-goal-opt"><input type="radio" name="xp-goal" value="' + g + '"' + (g === cur ? ' checked' : '') + '><span><b>' + esc(T('g' + g)) + '</b><small>' + g + ' XP · ' + esc(T('g_hint', { n: Math.max(2, Math.round(g / 11)) })) + '</small></span></label>').join('') + '</div>';
      modal({
        title: T('goal_t'), html,
        actions: [{ label: T('cancel'), kind: 'ghost' }, { label: T('save'), kind: 'primary', onClick: back => {
          const r = back.querySelector('input[name="xp-goal"]:checked');
          if (r && Number(r.value) !== cur) { this.setGoal(r.value); toast(T('saved', { g: r.value })); }
        } }]
      });
    },
    how() { modal({ title: this.T('how_t'), html: '<div class="xp-how">' + this.T('how_p') + '</div>', actions: [{ label: this.T('ok'), kind: 'primary' }] }); }
  };
  // Answers, finished tests and vocabulary reviews all go through store.set:
  // recompute once, after the page has finished saving.
  let xpQueued = false;
  function xpSoon() {
    try { if (xpQueued || sync.applying) return; } catch (e) { return; } // sync isn't set up yet while the page starts
    xpQueued = true;
    setTimeout(() => {
      xpQueued = false;
      try { xp.changed(); } catch (e) { console.warn('[SAT Ustoz] XP:', e); }
      try { mastery.changed(); } catch (e) { console.warn('[SAT Ustoz] Mastery:', e); }
    }, 0);
  }

  /* ------------------------------------------------------------------
     Skill mastery: a level for each official SAT skill (TAXONOMY), worked
     out from the student's own answers (nothing extra is saved). Recent
     answers decide it, so a level can also go down again.
       0 Not started  no answers yet
       1 Started      at least 1 answer
       2 Familiar     5+ answers, 6 of the last 10 right
       3 Proficient   10+ answers, 75% of the last 15 right, 3 of them medium or hard
       4 Mastered     20+ answers, 85% of the last 20 right, 8 of them medium or hard
     A right answer marked "I guessed" counts as a miss here.
     ------------------------------------------------------------------ */
  const MASTERY_RULES = [null, { n: 1 }, { n: 5, last: 10, acc: .6, mh: 0 }, { n: 10, last: 15, acc: .75, mh: 3 }, { n: 20, last: 20, acc: .85, mh: 8 }];
  const MASTERY_TEXT = {
    en: {
      levels: ['Not started', 'Started', 'Familiar', 'Proficient', 'Mastered'],
      up: '{s}: {l}',
      h0: 'Answer one question to start', h_n: '{k} more answer{ks} to {l}', h_acc: 'Get {k} of your last {m} right for {l}',
      h_mh: '{k} more medium or hard right for {l}', h_max: 'Stays while your recent answers stay strong'
    },
    uz: {
      levels: ['Boshlanmagan', 'Boshlangan', 'Tanish', 'Malakali', 'Oʻzlashtirilgan'],
      up: '{s}: {l}',
      h0: 'Boshlash uchun bitta savolga javob bering', h_n: '{l} uchun yana {k} ta javob', h_acc: '{l} uchun oxirgi {m} tadan {k} tasini toʻgʻri yeching',
      h_mh: '{l} uchun yana {k} ta oʻrta yoki qiyin savolni toʻgʻri yeching', h_max: 'Oxirgi javoblaringiz kuchli boʻlsa, daraja saqlanadi'
    },
    ru: {
      levels: ['Не начато', 'Начато', 'Знакомо', 'Уверенно', 'Освоено'],
      up: '{s}: {l}',
      h0: 'Ответьте на один вопрос, чтобы начать', h_n: 'Ещё {k} отв. до уровня «{l}»', h_acc: 'Решите верно {k} из последних {m} для уровня «{l}»',
      h_mh: 'Ещё {k} верных средних или сложных для уровня «{l}»', h_max: 'Уровень держится, пока последние ответы сильные'
    }
  };
  const mastery = {
    RULES: MASTERY_RULES,
    _last: null,
    T(k, vars) { return i18n(MASTERY_TEXT)(k, vars); },
    levelName(l) { return this.T('levels')[l] || ''; },
    // One skill from its answers, newest first.
    rate(list) {
      const ok = a => a.correct && !a.g, mh = a => a.difficulty === 'medium' || a.difficulty === 'hard';
      const stats = m => { const r = list.slice(0, m); return { right: r.filter(ok).length, mh: r.filter(a => ok(a) && mh(a)).length }; };
      const meets = l => {
        const R = MASTERY_RULES[l];
        if (list.length < R.n) return false;
        if (!R.last) return true;
        const s = stats(R.last);
        return s.right >= Math.ceil(R.acc * R.last) && s.mh >= R.mh;
      };
      let level = 0;
      while (level < 4 && meets(level + 1)) level++;
      // What it takes to reach the next level.
      const T = (k, v) => this.T(k, v);
      let hint = '';
      if (level === 4) hint = T('h_max');
      else if (level === 0) hint = T('h0');
      else {
        const R = MASTERY_RULES[level + 1], s = stats(R.last), name = this.levelName(level + 1), need = Math.ceil(R.acc * R.last);
        if (list.length < R.n) hint = T('h_n', { k: R.n - list.length, ks: R.n - list.length === 1 ? '' : 's', l: name });
        else if (s.right < need) hint = T('h_acc', { k: need, m: R.last, l: name });
        else hint = T('h_mh', { k: R.mh - s.mh, l: name });
      }
      const recent = list.slice(0, 20);
      return { level, n: list.length, acc: recent.length ? recent.filter(ok).length / recent.length : 0, hint };
    },
    // Every skill (only the student's section when they prepare for one), in the official order.
    compute() {
      const by = {};
      getAttempts().forEach(a => { if (a && a.skill) { const k = a.section + '|' + a.skill; (by[k] = by[k] || []).push(a); } });
      Object.keys(by).forEach(k => by[k].sort((a, b) => (b.ts || 0) - (a.ts || 0)));
      const focus = getProfile().focus, skills = [];
      ['rw', 'math'].forEach(section => {
        if (focus && focus !== section) return;
        const doms = TAXONOMY[section].domains;
        Object.keys(doms).forEach(domain => doms[domain].forEach(skill => {
          skills.push(Object.assign({ section, domain, skill }, this.rate(by[section + '|' + skill] || [])));
        }));
      });
      const count = [0, 0, 0, 0, 0];
      skills.forEach(s => count[s.level]++);
      const pct = skills.length ? Math.round(skills.reduce((t, s) => t + s.level, 0) / (skills.length * 4) * 100) : 0;
      return { skills, count, pct };
    },
    // After an answer: say so when a skill moves up to Familiar or higher.
    changed() {
      const m = this.compute(), now = {};
      m.skills.forEach(s => { now[s.section + '|' + s.skill] = s.level; });
      const prev = this._last; this._last = now;
      if (prev) {
        const ups = m.skills.filter(s => s.level >= 2 && s.level > (prev[s.section + '|' + s.skill] || 0)).sort((a, b) => b.level - a.level);
        if (ups.length) {
          const s = ups[0], msg = this.T('up', { s: s.skill, l: this.levelName(s.level) });
          track('skill_level_up', { skill: s.skill, section: s.section, level: s.level });
          // Let a streak message finish first.
          setTimeout(() => toast(msg, 3800), toastEl ? 3000 : 0);
        }
      }
      $$('[data-mastery]').forEach(el => { if (el._redraw) el._redraw(m); });
      return m;
    },
    // A ring of 4 segments, filled up to the level.
    ring(level, size) {
      size = size || 36;
      const r = 14, c = 2 * Math.PI * r, seg = c / 4, gap = 3.2;
      let h = '<svg class="mr mr-' + level + '" viewBox="0 0 36 36" width="' + size + '" height="' + size + '" aria-hidden="true" focusable="false">';
      for (let i = 0; i < 4; i++) {
        h += '<circle cx="18" cy="18" r="' + r + '" class="' + (i < level ? 'on' : 'off') + '" stroke-dasharray="' + (seg - gap).toFixed(2) + ' ' + (c - seg + gap).toFixed(2) + '" stroke-dashoffset="' + (-(i * seg) + c / 4 - gap / 2).toFixed(2) + '"/>';
      }
      if (level === 4) h += '<path d="m12.5 18.3 3.6 3.6 7.4-7.6" class="tick"/>';
      return h + '</svg>';
    }
  };

  /* ------------------------------------------------------------------
     Dark theme. Saved per device (store 'theme': 'light' or 'dark'); light
     is the default. A page can go dark only if its <head> has the one-line
     script that sets <html data-themeable> (and data-theme="dark" before
     the first paint). The header gets a moon / sun button; test.html has
     "Dark mode" in its More menu and calls SH.theme.toggle().
     ------------------------------------------------------------------ */
  const THEME_TEXT = {
    en: { dark: 'Dark mode', light: 'Light mode' },
    uz: { dark: 'Tungi rejim', light: 'Kunduzgi rejim' },
    ru: { dark: 'Тёмная тема', light: 'Светлая тема' }
  };
  const MOON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 14.6A8.4 8.4 0 0 1 9.4 4a8.4 8.4 0 1 0 10.6 10.6Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  const SUN = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const theme = {
    ok() { return document.documentElement.hasAttribute('data-themeable'); },
    get() { return store.get('theme', 'light') === 'dark' ? 'dark' : 'light'; },
    isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; },
    set(v) {
      store.set('theme', v === 'dark' ? 'dark' : 'light');
      this.apply();
      track('theme_changed', { theme: this.get() });
    },
    toggle() { this.set(this.isDark() ? 'light' : 'dark'); },
    apply() {
      if (!this.ok()) return;
      const dark = this.get() === 'dark', root = document.documentElement;
      if (dark) root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
      const meta = $('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', dark ? '#121714' : '#2D5038');
      // The logo's dark green lettering would vanish on a dark page.
      const swap = u => u && u.replace(/(logo-horizontal|mark)(-dark)?\.svg/, (m, n) => n + (dark ? '-dark' : '') + '.svg');
      $$('.brand img').forEach(i => { const s = swap(i.getAttribute('src')); if (s !== i.getAttribute('src')) i.setAttribute('src', s); });
      $$('.brand picture source').forEach(s => { const v = swap(s.getAttribute('srcset')); if (v !== s.getAttribute('srcset')) s.setAttribute('srcset', v); });
      this.paint();
      document.dispatchEvent(new CustomEvent('sh:theme', { detail: { theme: dark ? 'dark' : 'light' } }));
    },
    // The header button, left of the streak flame.
    paint() {
      const slot = $('.site-header [data-auth-slot]');
      if (!slot || !this.ok()) return;
      let b = $('.site-header .theme-btn');
      if (!b) {
        b = document.createElement('button');
        b.type = 'button'; b.className = 'theme-btn';
        b.addEventListener('click', () => this.toggle());
        const chip = $('.site-header .xp-chip');
        slot.parentNode.insertBefore(b, chip || slot);
      }
      const dark = this.isDark(), label = i18n(THEME_TEXT)(dark ? 'light' : 'dark');
      b.innerHTML = dark ? SUN : MOON;
      b.setAttribute('aria-label', label); b.title = label;
      b.setAttribute('aria-pressed', dark ? 'true' : 'false');
      // The same switch inside the menu, shown when the header is too full for the button.
      const nav = $('.site-header .nav');
      if (nav) {
        let n = $('.nav-theme', nav);
        if (!n) { n = document.createElement('button'); n.type = 'button'; n.className = 'nav-theme'; n.addEventListener('click', () => this.toggle()); nav.appendChild(n); }
        n.innerHTML = (dark ? SUN : MOON) + '<span>' + esc(label) + '</span>';
      }
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
    tutor(payload) { return this.call('/tutor', payload); },
    // Max, once a week each: a study plan from the score gap, and a short
    // summary of the patterns in the last 30 Mistake Bank cards.
    studyPlan(payload) { return this.call('/plan', payload); },
    patterns(payload) { return this.call('/patterns', payload); }
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
    // Never back to the sign-in page itself (that would loop).
    return /^[a-z0-9_-]+\.html([?#][^\s<>"']*)?$/i.test(raw) && !/^login\.html/i.test(raw) ? raw : 'practice.html';
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
      const cloudP = userDoc ? { name: userDoc.name || '', target: userDoc.target || 1400, targetRw: userDoc.targetRw || 0, targetMath: userDoc.targetMath || 0, focus: userDoc.focus || '', goalSet: !!userDoc.goalSet, testDate: userDoc.testDate || '', grade: userDoc.grade || '', region: userDoc.region || '', school: userDoc.school || '', onboarded: !!userDoc.onboarded, updatedAt: userDoc.profileUpdatedAt || 0 } : null;
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
        targetRw: p.targetRw || 0, targetMath: p.targetMath || 0, focus: p.focus || '', goalSet: !!p.goalSet,
        // The site language, so the Telegram report is in it too.
        lang: pickLang(),
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
  /* ------------------------------------------------------------------
     Telegram reports (worker/telegram-worker.js). "Connect Telegram" writes
     a one-time token (linkTokens/<token>, 15 minutes) and opens the bot with
     it; the bot matches it to the account and saves the chat in
     telegramLinks/<id>, which the student can read, adjust and delete.
     ------------------------------------------------------------------ */
  const TOKEN_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const telegram = {
    enabled() { return !!(CONFIG.TELEGRAM && CONFIG.TELEGRAM.BOT) && auth.enabled(); },
    bot() { return String(CONFIG.TELEGRAM.BOT || '').replace(/^@/, ''); },
    async links() {
      if (!auth.user) return [];
      const fs = await sync._lib();
      const snap = await fs.getDocs(fs.query(fs.collection(sync.db, 'telegramLinks'), fs.where('uid', '==', auth.user.uid), fs.limit(20)));
      return snap.docs.map(d => Object.assign({ id: d.id }, d.data(), { linkedAt: fsTime(d.data().linkedAt) }));
    },
    // role: 'student' (opens the bot) or 'parent' (Max: returns a link to send to a parent).
    async connect(role) {
      const fs = await sync._lib();
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      const token = Array.from(bytes, b => TOKEN_CHARS[b % TOKEN_CHARS.length]).join('');
      await fs.setDoc(fs.doc(sync.db, 'linkTokens', token), {
        uid: auth.user.uid, role: role === 'parent' ? 'parent' : 'student', lang: pickLang(),
        expiresAt: fs.Timestamp.fromMillis(Date.now() + 15 * 60000), createdAt: fs.serverTimestamp()
      });
      track('telegram_connect_tapped', { role });
      return 'https://t.me/' + this.bot() + '?start=' + token;
    },
    async disconnect(id) {
      const fs = await sync._lib();
      await fs.deleteDoc(fs.doc(sync.db, 'telegramLinks', id));
      track('telegram_disconnected', {});
    },
    // fields: remindersOn (bool), reminderTime ('18:00')
    async update(id, fields) {
      const fs = await sync._lib();
      await fs.updateDoc(fs.doc(sync.db, 'telegramLinks', id), fields);
    }
  };

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
    // finished before the change keeps its full results, and so does any test
    // in FREE_RESULTS_TESTS.
    insights(rec) {
      return this.allows('pro') || (!!(rec && rec.finishedAt) && rec.finishedAt < freeChangedAt()) ||
        (!!rec && (CONFIG.PLANS.FREE_RESULTS_TESTS || []).includes(rec.testId));
    },
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
      pro_f: ['All 16 full-length adaptive practice tests', 'Your score broken down by skill', 'Review every question with explanations', 'Drills built from your weakest skills', 'A study plan to your test date'],
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
      pay_ok_t: 'Pro is on', pay_ok: 'Pro is on until {d}. All 16 practice tests are open.',
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
      launch_tests: 'Practice Tests 1 to 10 (free for our launch)', launch_results: 'Full results for Tests 1 to 10: score by skill and every question explained', pro_results: 'Full results for Tests 11 to 16',
      note_launch: '<b>Free, Pro or Max?</b> Free gives you Tests 1 to 10 with full results: your score by skill and every question explained. Pro adds Tests 11 to 16, skill sets and drills for the skills that cost you points. Max adds the AI tutor and live sessions with Azizbek.', pro_tests_launch: 'Practice Tests 11 to 16, only in Pro', pro_sets: 'Practice sets for the most-missed skills',
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
      pro_f: ['Barcha 16 ta toʻliq adaptiv sinov testi', 'Koʻnikmalar boʻyicha ball tahlili', 'Har bir savolni izohlari bilan koʻrib chiqish', 'Eng zaif koʻnikmalaringiz boʻyicha mashqlar', 'Imtihon sanangizgacha oʻqish rejasi'],
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
      pay_ok_t: 'Pro yoqildi', pay_ok: 'Pro {d} gacha faol. Barcha 16 ta sinov testi ochiq.',
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
      launch_tests: '1–10-sinov testlari (ishga tushish munosabati bilan bepul)', launch_results: '1–10-testlar boʻyicha toʻliq natija: koʻnikmalar boʻyicha ball va har bir savolga izoh', pro_results: '11–16-testlar boʻyicha toʻliq natija',
      note_launch: '<b>Bepul, Pro yoki Max?</b> Bepul tarifda 1–10-testlar toʻliq natijasi bilan: koʻnikmalar boʻyicha ball va har bir savolga izoh. Pro 11–16-testlarni, koʻnikma toʻplamlari va ball yoʻqotayotgan koʻnikmalaringiz boʻyicha mashqlarni qoʻshadi. Max esa AI ustoz va Azizbek bilan jonli darslarni qoʻshadi.', pro_tests_launch: '11–16-sinov testlari, faqat Pro tarifida', pro_sets: 'Eng koʻp xato qilinadigan koʻnikmalar boʻyicha toʻplamlar',
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
      pro_f: ['Все 16 полных адаптивных пробных тестов', 'Разбор балла по навыкам', 'Разбор каждого вопроса с объяснениями', 'Тренировки по вашим самым слабым навыкам', 'План подготовки до даты экзамена'],
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
      pay_ok_t: 'Pro включён', pay_ok: 'Pro активен до {d}. Все 16 пробных тестов открыты.',
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
      launch_tests: 'Пробные тесты 1–10 (бесплатно в честь запуска)', launch_results: 'Полные результаты тестов 1–10: балл по навыкам и объяснение каждого вопроса', pro_results: 'Полные результаты тестов 11–16',
      note_launch: '<b>Бесплатно, Pro или Max?</b> Бесплатно: тесты 1–10 с полными результатами — балл по навыкам и объяснение каждого вопроса. Pro добавляет тесты 11–16, наборы по навыкам и тренировки по навыкам, на которых вы теряете баллы. Max добавит ИИ-репетитора и живые занятия с Азизбеком.', pro_tests_launch: 'Пробные тесты 11–16, только в Pro', pro_sets: 'Наборы по навыкам, где ошибаются чаще всего',
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
  // What each plan card lists. During the launch offer Tests 1 to 10 are free with
  // full results, so Free lists them, and Pro lists Tests 11 to 16, their results and its skill sets. With the AI on, Free and Pro
  // list their daily tutor questions and Max its unlimited AI.
  function planFeatures(id, T) {
    const f = T(id + '_f').slice();
    if (CONFIG.PLANS.TESTS_FREE_FOR_LAUNCH) { if (id === 'free') f.splice(1, 1, T('launch_tests'), T('launch_results')); if (id === 'pro') f.splice(0, 3, T('pro_tests_launch'), T('pro_results'), T('pro_sets')); }
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
      '</div><p class="plan-note">' + T(CONFIG.PLANS.TESTS_FREE_FOR_LAUNCH ? 'note_launch' : 'note') + '</p><p class="plan-bill">' + esc(T(passOn ? 'bill_pass' : 'bill')) + '</p>';
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
    try { theme.apply(); } catch (e) { console.warn('[SAT Ustoz] Theme:', e); }
    // Relabel the switch when the page language changes (EN / UZ / RU buttons).
    if (window.MutationObserver) new MutationObserver(() => theme.paint()).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    // The header: when its items don't fit on one row (the streak flame, the theme
    // button and the account button all take room), the links go into the menu button.
    const hdr0 = $('.site-header'), hwrap = hdr0 && $('.wrap', hdr0);
    if (hwrap && $('.menu-btn', hdr0)) {
      let fitting = false;
      const fit = () => {
        if (fitting) return; fitting = true;
        setTimeout(() => {
          hdr0.classList.remove('nav-collapsed', 'hdr-tight');
          hdr0.classList.add('hdr-measure'); // nothing but the links may shrink while measuring
          const over = () => hwrap.scrollWidth > hwrap.clientWidth + 1;
          if (window.innerWidth > 880 && over()) hdr0.classList.add('nav-collapsed');
          if (over()) hdr0.classList.add('nav-collapsed', 'hdr-tight');
          hdr0.classList.remove('hdr-measure');
          fitting = false;
        }, 0);
      };
      fit();
      window.addEventListener('resize', fit);
      if (window.MutationObserver) new MutationObserver(fit).observe(hwrap, { childList: true, subtree: true });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    }
    // Streak and XP: the header flame, the dashboard card's buttons, freezes once synced.
    try { xp.changed(true); } catch (e) { console.warn('[SAT Ustoz] XP:', e); }
    xp.tick();
    try { mastery.changed(); } catch (e) { console.warn('[SAT Ustoz] Mastery:', e); } // remembers the levels, so a level-up can be announced
    document.addEventListener('sh:synced', () => { xp._last = null; xp.changed(true); mastery._last = null; mastery.changed(); });
    document.addEventListener('click', e => {
      const g = e.target.closest && e.target.closest('[data-xp-goal], [data-xp-how]');
      if (!g) return;
      e.preventDefault();
      if (g.hasAttribute('data-xp-goal')) xp.pickGoal(); else xp.how();
    });
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
    getAttempts, recordAttempts, markGuessed, skillStats, weakSkills, getProfile, setProfile, getTestHistory, addTestHistory,
    qtimes, errorType, refersToLetter, shuffledCopy, origLetter, scale, gap, isFullTest, DOMAIN_SHARE, SECTION_Q, PACE,
    ERROR_TAGS, tagLabel, suggestTag, BOX_DAYS, DAILY_CAP, FREE_BANK, telegram,
    ai, toast, modal, openTutor, makePanel, calculator, CALC_ICON, copyText,
    auth, sync, authReady, renderAuthSlots, requireLogin, loginUrl, safeNext, inAppBrowser,
    plan, renderPlans, pay, lockBox, analytics, track,
    pickLang, langNow, i18n, langSwitch, dateText, REGIONS, dayKey, dayNum, weekStart, seededShuffle,
    mistakes, vocab, daily, xp, mastery, theme, notices, referral, realScore, classes, mock
  };
})();
