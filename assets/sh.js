/* ==========================================================================
   Scholar's Hub · SAT Practice — shared core
   Loaded by practice.html, test.html and builder.html (after KaTeX).
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     SETTINGS — the only part of this file you normally edit
     ------------------------------------------------------------------ */
  const CONFIG = {
    // Paste your Cloudflare Worker URL here (see worker/ai-worker.js).
    // Leave empty and the AI features show a friendly "not switched on" note.
    // Example: 'https://scholarshub-ai.yourname.workers.dev'
    AI_ENDPOINT: '',

    // The College Board version of the Desmos graphing calculator, the same
    // one Bluebook uses. No key needed. If Desmos ever moves it, change this
    // to 'https://www.desmos.com/calculator'.
    DESMOS_URL: 'https://www.desmos.com/testing/cb-digital-sat/graphing',

    CONTACT_TELEGRAM: 'https://t.me/scholars_hub7',
    CHANNEL_TELEGRAM: 'https://t.me/scholars_hubprograms',
    INSTAGRAM: 'https://www.instagram.com/_scholarshub',
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
      try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; } catch (e) { return false; }
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
    if (n.errors.length) console.warn('[Scholar\'s Hub] Skipped questions in ' + meta.file + ':\n' + n.errors.join('\n'));
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
    const raw = await getJSON(meta.file);
    const errors = [];
    const test = {
      id: meta.id,
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
    if (errors.length) console.warn('[Scholar\'s Hub] Problems in ' + meta.file + ':\n' + errors.join('\n'));
    return test;
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
  function getProfile() { return Object.assign({ name: '', target: 1400, testDate: '' }, store.get('profile', {})); }
  function setProfile(p) { store.set('profile', Object.assign(getProfile(), p)); }
  function getTestHistory() { return store.get('testHistory', []); }
  function addTestHistory(rec) { store.set('testHistory', [rec].concat(getTestHistory()).slice(0, 40)); }

  /* ------------------------------------------------------------------
     AI client (talks to your Cloudflare Worker, never to the API directly)
     ------------------------------------------------------------------ */
  const ai = {
    enabled() { return !!CONFIG.AI_ENDPOINT; },
    async call(path, payload) {
      if (!this.enabled()) throw new Error('AI is not switched on yet.');
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 90000);
      try {
        const res = await fetch(CONFIG.AI_ENDPOINT.replace(/\/+$/, '') + path, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload), signal: ctrl.signal
        });
        let data = null;
        try { data = await res.json(); } catch (e) { /* ignore */ }
        if (!res.ok) throw new Error((data && data.error) || ('The AI service returned an error (' + res.status + ').'));
        return data;
      } catch (e) {
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
  function toast(msg, ms) {
    const el = document.createElement('div');
    el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), ms || 2600);
  }
  function modal(opts) {
    const prev = document.activeElement;
    const back = document.createElement('div');
    back.className = 'modal-backdrop';
    back.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mdl-t"><h2 id="mdl-t">' + esc(opts.title || '') + '</h2><div class="modal-body">' + (opts.html || '') + '</div><div class="modal-actions"></div></div>';
    const actions = back.querySelector('.modal-actions');
    function close(val) {
      back.remove(); document.removeEventListener('keydown', onKey);
      if (prev && prev.focus) prev.focus();
      if (opts.onClose) opts.onClose(val);
    }
    function onKey(e) { if (e.key === 'Escape' && opts.dismissable !== false) close(null); }
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
        wait.className = 'bubble sys'; wait.textContent = e.message;
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
      if (e.target.closest('button, a')) return;
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
  const calculator = {
    panel: null, btn: null,
    sync() { if (this.btn) this.btn.setAttribute('aria-pressed', String(!!(this.panel && this.panel.isConnected && !this.panel.hidden))); },
    toggle(btn, side) {
      if (btn) this.btn = btn;
      if (this.panel && this.panel.isConnected) { this.panel.hidden = !this.panel.hidden; this.sync(); return; }
      const url = CONFIG.DESMOS_URL;
      this.panel = makePanel('Calculator', 480, 560, '<a href="' + esc(url) + '" target="_blank" rel="noopener">New window</a>', side);
      this.panel.querySelector('[data-a="close"]').addEventListener('click', () => { this.panel.hidden = true; this.sync(); });
      this.panel.querySelector('.fpanel-body').innerHTML = '<iframe src="' + esc(url) + '" title="Desmos graphing calculator" allow="clipboard-read; clipboard-write"></iframe>';
      this.sync();
    },
    close() { if (this.panel) this.panel.remove(); this.panel = null; this.sync(); }
  };
  const CALC_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2.5" width="14" height="19" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="8" y="5.5" width="8" height="4" rx=".6" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="13" r="1" fill="currentColor"/><circle cx="12" cy="13" r="1" fill="currentColor"/><circle cx="15" cy="13" r="1" fill="currentColor"/><circle cx="9" cy="17" r="1" fill="currentColor"/><circle cx="12" cy="17" r="1" fill="currentColor"/><circle cx="15" cy="17" r="1" fill="currentColor"/></svg>';

  /* ------------------------------------------------------------------
     Page chrome: mobile nav, footer year
     ------------------------------------------------------------------ */
  function initChrome() {
    const btn = $('.menu-btn'), nav = $('.nav');
    if (btn && nav) {
      const set = open => { nav.classList.toggle('open', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); };
      btn.addEventListener('click', () => set(!nav.classList.contains('open')));
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { set(false); btn.focus(); } });
      document.addEventListener('click', e => { if (nav.classList.contains('open') && !nav.contains(e.target) && !btn.contains(e.target)) set(false); });
      $$('a', nav).forEach(a => a.addEventListener('click', () => set(false)));
    }
    $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
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
    ai, toast, modal, openTutor, makePanel, calculator, CALC_ICON
  };
})();
