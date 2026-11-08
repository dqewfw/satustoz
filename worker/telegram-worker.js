/**
 * SAT Ustoz — Telegram reports (Cloudflare Worker)
 * ------------------------------------------------------------------
 * A Telegram bot that sends each student a weekly progress report every
 * Sunday at 19:00 Tashkent time, short review reminders on Pro and Max, and
 * on Max a simpler weekly report for parents. It also works out each
 * question's median answer time every night (stats/questionTimes), which the
 * site uses to tell rushed mistakes from stuck ones.
 *
 * Endpoints:
 *   POST /telegram     Telegram webhook (checked with the secret token header)
 *   GET  /go?n=&to=&c= button links: records the click, then opens the site
 *                      with utm_source=telegram&utm_campaign=<c>
 *   GET  /setup?key=   sets the webhook and the bot's command menu (run once)
 * Cron Triggers (both needed):
 *   *\/15 * * * *      reminders and streak savers, the parent inactivity alert
 *                      (10:00), and the nightly question times (03:00)
 *   * 14 * * SUN       Sundays 19:00 to 19:59 Tashkent: the weekly reports,
 *                      a few each minute (Telegram allows about 30 messages a second)
 *
 * ONE-TIME SETUP (README "9. Score gap, Mistake Bank and Telegram"):
 *  1. Telegram -> @BotFather -> /newbot. Keep the token it gives you secret.
 *  2. Cloudflare -> Workers & Pages -> KV -> Create namespace "sh-telegram".
 *  3. Create Worker "satustoz-tg" -> Edit code -> paste THIS file -> Deploy.
 *  4. Worker -> Settings -> Bindings -> KV namespace: variable TG_STATE, namespace sh-telegram.
 *  5. Worker -> Settings -> Variables and Secrets:
 *       TELEGRAM_BOT_TOKEN      (Secret)  the token from @BotFather
 *       TG_WEBHOOK_SECRET       (Secret)  a long random string you make up (letters and digits)
 *       ADMIN_KEY               (Secret)  another random string, for /setup
 *       GOOGLE_SERVICE_ACCOUNT  (Secret)  same JSON as the payments Worker
 *       FIREBASE_PROJECT_ID     (Text)    e.g. satustoz
 *       SITE_URL                (Text)    https://satustoz.academy
 *       WORKER_URL              (Text)    this Worker's address, for click tracking
 *     Optional: WEEKLY_CHUNK (Text, default 15) reports per minute on Sunday.
 *  6. Worker -> Settings -> Triggers -> Cron Triggers: add  *\/15 * * * *  and  * 14 * * SUN
 *  7. Open https://satustoz-tg.<you>.workers.dev/setup?key=<ADMIN_KEY> once.
 *  8. In assets/sh.js, fill TELEGRAM: { BOT: 'YourBotName', ENDPOINT: '<Worker URL>' }.
 *
 * Cost: the free Workers plan allows 50 outgoing requests per run, which is
 * enough for a handful of students per minute. With more than about 50 linked
 * students, use Workers Paid ($5 a month).
 */

const DAY = 86400000;
const TZ_MS = 5 * 3600000; // Tashkent is UTC+5, no daylight saving
const QUIET_FROM = 22, QUIET_TO = 8;
const MEDIAN_MIN = 30;
const TARGETS = { dash: 'practice.html#home', review: 'practice.html#review', drill: 'practice.html#fix', plans: 'practice.html#plans', daily: 'daily.html', settings: 'practice.html#settings' };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    try {
      if (path === '/telegram' && request.method === 'POST') {
        if (!env.TG_WEBHOOK_SECRET || !safeEqual(request.headers.get('X-Telegram-Bot-Api-Secret-Token') || '', env.TG_WEBHOOK_SECRET)) return new Response('forbidden', { status: 403 });
        const update = await request.json().catch(() => null);
        if (update) ctx.waitUntil(onUpdate(env, update).catch(e => console.log('update failed', e && e.stack || e)));
        return new Response('ok');
      }
      if (path === '/go') return go(env, url, ctx);
      if (path === '/setup') return setup(env, url);
    } catch (e) {
      console.log('fetch failed', path, e && e.stack || e);
      return new Response('error', { status: 500 });
    }
    return new Response('Not found', { status: 404 });
  },

  async scheduled(event, env, ctx) {
    const job = event.cron === '* 14 * * SUN' ? weekly(env, event.scheduledTime) : quarterHour(env, event.scheduledTime);
    ctx.waitUntil(job.then(r => console.log(event.cron, JSON.stringify(r))).catch(e => console.log(event.cron, 'failed', e && e.stack || e)));
  }
};

/* ------------------------------------------------------------------
   Time in Tashkent
   ------------------------------------------------------------------ */
const local = ts => new Date(ts + TZ_MS);
const dayKey = ts => local(ts).toISOString().slice(0, 10);
const dayNum = ts => Math.floor((ts + TZ_MS) / DAY);
// Monday 00:00 Tashkent of the week ts falls in (the same as weekStart in assets/sh.js).
function weekStart(ts) { const d = dayNum(ts), dow = (d + 3) % 7; return (d - dow) * DAY - TZ_MS; }
const hhmm = ts => local(ts).toISOString().slice(11, 16);
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ------------------------------------------------------------------
   Messages (Uzbek by default, English and Russian)
   ------------------------------------------------------------------ */
const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const RU_MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function dateText(ts, lang) {
  const d = local(ts), n = d.getUTCDate(), m = d.getUTCMonth();
  return lang === 'uz' ? n + '-' + UZ_MONTHS[m] : lang === 'ru' ? n + ' ' + RU_MONTHS[m] : EN_MONTHS[m] + ' ' + n;
}
function timeText(min, lang) {
  const h = Math.floor(min / 60), m = min % 60;
  const u = { en: ['h', 'min'], uz: ['soat', 'daqiqa'], ru: ['ч', 'мин'] }[lang];
  return (h ? h + ' ' + u[0] + (m ? ' ' : '') : '') + (m || !h ? m + ' ' + u[1] : '');
}
const TEXT = {
  en: {
    connected: 'Connected. You’ll get your first report on Sunday.',
    parentConnected: 'Connected. You’ll get {name}’s weekly report every Sunday at 19:00.',
    parentAlertQ: 'Would you like one message if {name} doesn’t practice for 7 days?',
    yes: 'Yes', no: 'No', alertOn: 'Done: you’ll hear from us after 7 quiet days.', alertOff: 'OK, no inactivity alerts.',
    howTo: 'To connect, open SAT Ustoz, go to Settings and tap “Connect Telegram”:',
    badToken: 'This link has expired or was already used. Make a new one in Settings on the site:',
    parentMax: 'Parent reports are part of the Max plan.',
    stopped: 'All messages are off. Your account stays linked. Send /start to turn them back on.',
    restarted: 'Messages are back on. Next report: Sunday at 19:00.',
    head: '<b>SAT Ustoz weekly report, {from} to {to}</b>',
    week: 'This week: {q} questions, {time}, {t} full test{ts}, {s} day streak',
    weekShort: 'This week: {q} questions, {time}',
    est: 'Estimated score: <b>{e}</b>{c}', estChange: ' ({c} vs last week)',
    target: 'Target: {t}{d}. Gap: {g} points', by: ' by {d}', reached: 'Target: {t}. Reached! Time for a stretch goal.',
    improved: 'Most improved: {k} ({a}% to {b}%)',
    biggest: 'Biggest gap: {k}, about {p} points',
    bank: 'Mistake Bank: {r} reviewed, {m} mastered, {d} due next week',
    next: 'Next week: 2 {k} drills plus your daily reviews.', nextPlain: 'Next week: a full practice test plus your daily reviews.',
    comeback: '<b>We missed you this week.</b>\n{gap}\nTen minutes is enough to start.', comebackGap: 'Your gap: {g} points to {t} (estimate {e}).', comebackNone: 'Your target: {t}. One short drill gets you going again.',
    dash: 'Open my dashboard', review: 'Start review', drill: 'Do a 10 minute drill', pro: 'See your full breakdown',
    parent: '<b>{name} this week</b>: {time} of practice, {t} full test{ts}\nEstimated score: {e}{c}. Target: {target}\nStreak: {s} days',
    parentAlert: '{name} hasn’t practiced on SAT Ustoz for 7 days.',
    remind: 'Today’s review: {n} question{ns}, about {m} minutes.',
    streak: 'Your {n}-day streak ends tonight. One question keeps it going.', practice: 'Practice now',
    tooMany: 'Too many reminders?', keep: 'Keep daily', alt: 'Every other day', weeklyOnly: 'Weekly report only', cadenceSaved: 'Saved.',
    stats: 'Estimated score: <b>{e}</b>\nTarget: {t}\nGap: {g} points\nTop weakness: {k}', noData: 'No score yet. Take the mini diagnostic or a practice set first.',
    today: '{n} review{ns} due today.', todayNone: 'Nothing due today. Nice work.',
    proOnly: 'This is part of Pro. Free gets the weekly summary on Sundays.',
    notLinked: 'This chat isn’t connected to an SAT Ustoz account yet.',
    settings: '<b>Settings</b>\nLanguage: {lang}\nReminders: {rem}\nReminder time: {time}', on: 'on', off: 'off',
    remOn: 'Reminders on', remOff: 'Reminders off',
    help: '/stats your estimate, target and gap\n/today reviews due today\n/settings language and reminders\n/stop turn off all messages'
  },
  uz: {
    connected: 'Ulandi. Birinchi hisobotni yakshanba kuni olasiz.',
    parentConnected: 'Ulandi. {name}ning haftalik hisobotini har yakshanba soat 19:00 da olasiz.',
    parentAlertQ: '{name} 7 kun mashq qilmasa, sizga bitta xabar yuboraylikmi?',
    yes: 'Ha', no: 'Yoʻq', alertOn: 'Tayyor: 7 kun faollik boʻlmasa xabar beramiz.', alertOff: 'Xoʻp, bunday xabar yuborilmaydi.',
    howTo: 'Ulash uchun SAT Ustoz saytida Sozlamalarga kirib, “Connect Telegram” tugmasini bosing:',
    badToken: 'Bu havolaning muddati tugagan yoki u allaqachon ishlatilgan. Saytdagi Sozlamalarda yangisini yarating:',
    parentMax: 'Ota-onalar uchun hisobot Max tarifiga kiradi.',
    stopped: 'Barcha xabarlar oʻchirildi. Hisobingiz ulangan holda qoladi. Qayta yoqish uchun /start yuboring.',
    restarted: 'Xabarlar qayta yoqildi. Keyingi hisobot: yakshanba, 19:00.',
    head: '<b>SAT Ustoz haftalik hisobot, {from} – {to}</b>',
    week: 'Bu hafta: {q} ta savol, {time}, {t} ta toʻliq test, {s} kunlik streak',
    weekShort: 'Bu hafta: {q} ta savol, {time}',
    est: 'Taxminiy ball: <b>{e}</b>{c}', estChange: ' (oʻtgan haftaga nisbatan {c})',
    target: 'Maqsad: {d}{t}. Farq: {g} ball', by: '{d}gacha ', reached: 'Maqsad: {t}. Erishildi! Endi yuqoriroq maqsad qoʻying.',
    improved: 'Eng koʻp oʻsish: {k} ({a}% dan {b}% gacha)',
    biggest: 'Eng katta boʻshliq: {k}, taxminan {p} ball',
    bank: 'Xatolar banki: {r} ta takrorlandi, {m} tasi oʻzlashtirildi, keyingi haftada {d} ta',
    next: 'Keyingi hafta: 2 ta {k} mashqi va har kungi takrorlash.', nextPlain: 'Keyingi hafta: bitta toʻliq test va har kungi takrorlash.',
    comeback: '<b>Bu hafta sizni sogʻindik.</b>\n{gap}\nBoshlash uchun oʻn daqiqa yetarli.', comebackGap: 'Farq: {t} gacha {g} ball (taxminiy ball {e}).', comebackNone: 'Maqsadingiz: {t}. Bitta qisqa mashq bilan qaytadan boshlang.',
    dash: 'Dashboardni ochish', review: 'Takrorlashni boshlash', drill: '10 daqiqalik mashq', pro: 'Toʻliq tahlilni koʻrish',
    parent: '<b>{name} bu hafta</b>: {time} mashq, {t} ta toʻliq test\nTaxminiy ball: {e}{c}. Maqsad: {target}\nStreak: {s} kun',
    parentAlert: '{name} 7 kundan beri SAT Ustozda mashq qilmadi.',
    remind: 'Bugungi takrorlash: {n} ta savol, taxminan {m} daqiqa.',
    streak: '{n} kunlik streakingiz bugun kechqurun tugaydi. Bitta savol uni saqlab qoladi.', practice: 'Hozir mashq qilish',
    tooMany: 'Eslatmalar juda koʻpmi?', keep: 'Har kuni', alt: 'Kun ora', weeklyOnly: 'Faqat haftalik hisobot', cadenceSaved: 'Saqlandi.',
    stats: 'Taxminiy ball: <b>{e}</b>\nMaqsad: {t}\nFarq: {g} ball\nEng zaif joy: {k}', noData: 'Hali ball yoʻq. Avval mini diagnostika yoki mashq toʻplamini bajaring.',
    today: 'Bugun {n} ta takrorlash bor.', todayNone: 'Bugun takrorlash yoʻq. Barakalla.',
    proOnly: 'Bu Pro tarifiga kiradi. Free tarifida yakshanba kunlari haftalik xulosa keladi.',
    notLinked: 'Bu chat hali SAT Ustoz hisobiga ulanmagan.',
    settings: '<b>Sozlamalar</b>\nTil: {lang}\nEslatmalar: {rem}\nEslatma vaqti: {time}', on: 'yoqilgan', off: 'oʻchirilgan',
    remOn: 'Eslatmalarni yoqish', remOff: 'Eslatmalarni oʻchirish',
    help: '/stats taxminiy ball, maqsad va farq\n/today bugungi takrorlashlar\n/settings til va eslatmalar\n/stop barcha xabarlarni oʻchirish'
  },
  ru: {
    connected: 'Подключено. Первый отчёт придёт в воскресенье.',
    parentConnected: 'Подключено. Еженедельный отчёт ({name}) будет приходить каждое воскресенье в 19:00.',
    parentAlertQ: 'Прислать одно сообщение, если {name} не занимается 7 дней?',
    yes: 'Да', no: 'Нет', alertOn: 'Готово: напишем после 7 дней без занятий.', alertOff: 'Хорошо, без таких сообщений.',
    howTo: 'Чтобы подключиться, откройте SAT Ustoz, зайдите в Настройки и нажмите «Connect Telegram»:',
    badToken: 'Срок действия ссылки истёк или она уже использована. Создайте новую в Настройках на сайте:',
    parentMax: 'Отчёты для родителей входят в тариф Max.',
    stopped: 'Все сообщения выключены. Аккаунт остаётся подключён. Отправьте /start, чтобы включить их снова.',
    restarted: 'Сообщения снова включены. Следующий отчёт: воскресенье, 19:00.',
    head: '<b>Еженедельный отчёт SAT Ustoz, {from} – {to}</b>',
    week: 'На этой неделе: вопросов — {q}, {time}, полных тестов — {t}, серия — {s} дн.',
    weekShort: 'На этой неделе: вопросов — {q}, {time}',
    est: 'Примерный балл: <b>{e}</b>{c}', estChange: ' ({c} к прошлой неделе)',
    target: 'Цель: {t}{d}. Разница: {g} баллов', by: ' к {d}', reached: 'Цель: {t}. Достигнута! Пора поставить цель выше.',
    improved: 'Больше всего вырос: {k} (с {a}% до {b}%)',
    biggest: 'Самый большой пробел: {k}, около {p} баллов',
    bank: 'Банк ошибок: повторено — {r}, усвоено — {m}, на следующей неделе — {d}',
    next: 'На следующей неделе: 2 тренировки по теме {k} и ежедневные повторения.', nextPlain: 'На следующей неделе: один полный тест и ежедневные повторения.',
    comeback: '<b>Мы скучали по вам на этой неделе.</b>\n{gap}\nДля начала хватит десяти минут.', comebackGap: 'Разница: {g} баллов до {t} (примерный балл {e}).', comebackNone: 'Ваша цель: {t}. Одна короткая тренировка, и вы снова в деле.',
    dash: 'Открыть кабинет', review: 'Начать повторение', drill: 'Тренировка на 10 минут', pro: 'Посмотреть полный разбор',
    parent: '<b>{name} на этой неделе</b>: {time} занятий, полных тестов — {t}\nПримерный балл: {e}{c}. Цель: {target}\nСерия: {s} дн.',
    parentAlert: '{name} не занимается на SAT Ustoz уже 7 дней.',
    remind: 'Повторение на сегодня: вопросов — {n}, около {m} мин.',
    streak: 'Ваша серия ({n} дн.) прервётся сегодня вечером. Один вопрос её сохранит.', practice: 'Заниматься',
    tooMany: 'Слишком много напоминаний?', keep: 'Каждый день', alt: 'Через день', weeklyOnly: 'Только отчёт', cadenceSaved: 'Сохранено.',
    stats: 'Примерный балл: <b>{e}</b>\nЦель: {t}\nРазница: {g} баллов\nСлабое место: {k}', noData: 'Балла пока нет. Сначала пройдите мини-диагностику или набор вопросов.',
    today: 'Повторений на сегодня: {n}.', todayNone: 'На сегодня повторений нет. Отлично.',
    proOnly: 'Это входит в Pro. На Free по воскресеньям приходит краткая сводка.',
    notLinked: 'Этот чат ещё не подключён к аккаунту SAT Ustoz.',
    settings: '<b>Настройки</b>\nЯзык: {lang}\nНапоминания: {rem}\nВремя напоминания: {time}', on: 'вкл.', off: 'выкл.',
    remOn: 'Включить напоминания', remOff: 'Выключить напоминания',
    help: '/stats балл, цель и разница\n/today повторения на сегодня\n/settings язык и напоминания\n/stop выключить все сообщения'
  }
};
const LANGS = { en: 'English', uz: 'Oʻzbekcha', ru: 'Русский' };
const pickLang = l => (TEXT[l] ? l : 'uz');
function t(lang, key, vars) {
  let s = (TEXT[lang] || TEXT.uz)[key];
  if (s == null) s = TEXT.en[key] || key;
  Object.keys(vars || {}).forEach(k => { s = s.split('{' + k + '}').join(vars[k]); });
  return s;
}
const escHtml = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';

/* ------------------------------------------------------------------
   Plans and student data
   ------------------------------------------------------------------ */
const RANK = { free: 0, pro: 1, max: 2 };
function planOf(user, now) {
  const p = user && user.plan;
  if (!p || !(p in RANK)) return 'free';
  if (user.planUntil && user.planUntil < now) return 'free';
  return p;
}
// Old notebook cards (no box yet) read like the site reads them.
function card(e) {
  if (!e || e.deleted) return null;
  if (e.box) return e;
  return Object.assign({}, e, e.fixed ? { box: 4, st: 'mastered', mAt: e.fixedAt || e.t } : { box: 1, st: 'active', due: (e.t || 0) + DAY, kind: 'miss' });
}
async function loadStudents(env, uids) {
  const out = {};
  uids = Array.from(new Set(uids));
  for (let i = 0; i < uids.length; i += 30) {
    const part = uids.slice(i, i + 30);
    const [main, att, study] = await Promise.all([
      fsBatchGet(env, part.flatMap(u => ['users/' + u, 'users/' + u + '/data/tests'])),
      fsBatchGet(env, part.map(u => 'users/' + u + '/data/attempts'), ['items']),
      fsBatchGet(env, part.map(u => 'users/' + u + '/data/study'), ['mistakes', 'gap', 'daily', 'xp'])
    ]);
    part.forEach(u => {
      out[u] = {
        uid: u, user: main['users/' + u] || null,
        tests: ((main['users/' + u + '/data/tests'] || {}).items) || [],
        attempts: ((att['users/' + u + '/data/attempts'] || {}).items) || [],
        study: study['users/' + u + '/data/study'] || {}
      };
    });
  }
  return out;
}
const isFullTest = h => h && h.total != null && h.testId !== 'diagnostic-mini';
function activeDays(d) {
  const days = new Set(d.attempts.map(a => dayKey(a.ts)));
  Object.keys((d.study.daily && d.study.daily.days) || {}).forEach(k => days.add(k));
  return days;
}
// The site's one streak for all study (SH.xp in sh.js) leaves a summary in study.xp.sum:
// cur (the streak on its last active day), last (that day), frz (freezes held).
// Missed days the student still has freezes for keep the streak: the site uses them on the next visit.
function xpSum(d) { const s = d.study && d.study.xp && d.study.xp.sum; return s && typeof s.cur === 'number' && s.last ? s : null; }
function studiedToday(d, now) {
  const s = xpSum(d);
  if (s) return s.done === dayKey(now);
  return d.attempts.some(a => dayKey(a.ts) === dayKey(now));
}
function streakOf(d, now) {
  const s = xpSum(d);
  if (s) {
    const lastN = Math.round(Date.parse(s.last + 'T00:00:00Z') / DAY), missed = dayNum(now) - 1 - lastN;
    return missed <= 0 || missed <= (Number(s.frz) || 0) ? s.cur : 0;
  }
  const days = activeDays(d);
  let n = dayNum(now), cur = 0;
  if (!days.has(dayKey(now))) n -= 1;
  while (days.has(dayKey(n * DAY - TZ_MS + 12 * 3600000))) { cur++; n--; }
  return cur;
}
const lastActivity = d => d.attempts.reduce((m, a) => Math.max(m, a.ts || 0), 0);
function bankOf(d) {
  const m = d.study.mistakes || {};
  return Object.keys(m).map(k => card(m[k])).filter(e => e && e.st !== 'archived');
}
function dueToday(d, now) {
  const end = (dayNum(now) + 1) * DAY - TZ_MS;
  return bankOf(d).filter(e => e.st === 'active' && e.kind !== 'speed' && (e.due || 0) <= end).length;
}
function weekData(d, now) {
  const w0 = weekStart(now);
  const att = d.attempts.filter(a => a.ts >= w0);
  const gap = d.study.gap || {}, weeks = gap.weeks || {};
  const cur = weeks[String(w0)] || gap.cur || null, prev = weeks[String(w0 - 7 * DAY)] || null;
  let improved = null;
  if (cur && prev && cur.acc && prev.acc) {
    Object.keys(cur.acc).forEach(k => {
      const a = prev.acc[k], b = cur.acc[k];
      if (!a || !b || a[1] < 10 || b[1] < 10) return;
      if (b[0] - a[0] >= 3 && (!improved || b[0] - a[0] > improved.b - improved.a)) improved = { k: k.split('|')[1], a: a[0], b: b[0] };
    });
  }
  const bank = bankOf(d);
  return {
    w0, questions: att.length, minutes: Math.round(att.reduce((s, a) => s + (a.ms || 0), 0) / 60000),
    tests: d.tests.filter(h => isFullTest(h) && h.finishedAt >= w0).length, streak: streakOf(d, now),
    cur, change: cur && prev && cur.estimate && prev.estimate ? cur.estimate - prev.estimate : null, improved,
    reviewed: att.filter(a => a.source === 'review' || a.source === 'mistakes').length,
    mastered: bank.filter(e => e.st === 'mastered' && (e.mAt || 0) >= w0).length,
    dueNext: bank.filter(e => e.st === 'active' && e.kind !== 'speed' && (e.due || 0) < now + 7 * DAY).length
  };
}
const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);

/* ------------------------------------------------------------------
   Building the messages
   ------------------------------------------------------------------ */
function button(env, logId, label, to, campaign) {
  const base = env.WORKER_URL ? env.WORKER_URL.replace(/\/+$/, '') + '/go?n=' + logId + '&to=' + to + '&c=' + campaign : siteLink(env, to, campaign);
  return { text: label, url: base };
}
function siteLink(env, to, campaign) {
  const p = TARGETS[to] || TARGETS.dash, h = p.indexOf('#');
  const site = (env.SITE_URL || 'https://satustoz.academy').replace(/\/+$/, '');
  return site + '/' + (h > -1 ? p.slice(0, h) : p) + '?utm_source=telegram&utm_campaign=' + encodeURIComponent(campaign) + (h > -1 ? p.slice(h) : '');
}
function studentReport(env, d, link, now, logId) {
  const lang = pickLang(link.language), plan = planOf(d.user, now), w = weekData(d, now);
  const user = d.user || {}, snap = w.cur || {};
  const B = (label, to) => button(env, logId, t(lang, label), to, 'weekly');
  const head = t(lang, 'head', { from: dateText(w.w0, lang), to: dateText(now, lang) });
  const est = snap.estimate ? t(lang, 'est', { e: snap.estimate, c: w.change != null ? t(lang, 'estChange', { c: signed(w.change) }) : '' }) : '';
  // Nothing this week: a short comeback message instead of a report full of zeros.
  if (!w.questions) {
    const gapLine = snap.estimate && snap.gap ? t(lang, 'comebackGap', { g: snap.gap, t: snap.target, e: snap.estimate }) : t(lang, 'comebackNone', { t: snap.target || user.target || 1400 });
    return { kind: 'comeback', text: t(lang, 'comeback', { gap: gapLine }), buttons: [[B('drill', 'drill')]] };
  }
  const time = timeText(w.minutes, lang);
  if (plan === 'free') {
    return { kind: 'weekly', text: [head, '', t(lang, 'weekShort', { q: w.questions, time }), est].filter(x => x !== '').join('\n'), buttons: [[B('pro', 'plans')]] };
  }
  const lines = [head, '', t(lang, 'week', { q: w.questions, time, t: w.tests, ts: w.tests === 1 ? '' : 's', s: w.streak })];
  if (est) lines.push(est);
  if (snap.target) {
    const testDay = user.testDate ? Date.parse(user.testDate + 'T08:00:00+05:00') : 0;
    if (snap.gap === 0) lines.push(t(lang, 'reached', { t: snap.target }));
    else if (snap.gap != null) lines.push(t(lang, 'target', { t: snap.target, g: snap.gap, d: testDay > now ? t(lang, 'by', { d: dateText(testDay, lang) }) : '' }));
  }
  if (w.improved) lines.push(t(lang, 'improved', { k: escHtml(w.improved.k), a: w.improved.a, b: w.improved.b }));
  const top = snap.top;
  if (top && (top.skillGap || top.gap)) lines.push(t(lang, 'biggest', { k: escHtml(top.skill || top.domain), p: top.skill ? top.skillGap : top.gap }));
  lines.push(t(lang, 'bank', { r: w.reviewed, m: w.mastered, d: w.dueNext }));
  lines.push(top ? t(lang, 'next', { k: escHtml(top.skill || top.domain) }) : t(lang, 'nextPlain'));
  return { kind: 'weekly', text: lines.join('\n'), buttons: [[B('dash', 'dash'), B('review', 'review')]], trend: plan === 'max' };
}
// Effort and progress only: never questions, reasons or notes.
function parentReport(env, d, link, now, logId) {
  const lang = pickLang(link.language), w = weekData(d, now), snap = w.cur || {}, user = d.user || {};
  const name = escHtml(firstName(user.name) || 'SAT Ustoz');
  return {
    kind: 'parent',
    text: t(lang, 'parent', { name, time: timeText(w.minutes, lang), t: w.tests, ts: w.tests === 1 ? '' : 's', e: snap.estimate || '–', c: w.change != null ? ' (' + signed(w.change) + ')' : '', target: snap.target || user.target || '–', s: w.streak }),
    buttons: [], trend: true
  };
}

/* ------------------------------------------------------------------
   Sending (Telegram allows about 30 messages a second, 1 a second per chat)
   ------------------------------------------------------------------ */
async function tg(env, method, payload) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const isForm = typeof payload === 'function';
    const res = await fetch('https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/' + method, isForm
      ? { method: 'POST', body: payload() }
      : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    if (res.status === 429 && attempt === 0) {
      const wait = Number(data.parameters && data.parameters.retry_after) || 1;
      if (wait <= 20) { await sleep(wait * 1000); continue; }
    }
    return { ok: !!data.ok, status: res.status, data };
  }
  return { ok: false, status: 429, data: {} };
}
function sendText(env, chatId, text, buttons) {
  const body = { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true };
  if (buttons && buttons.length) body.reply_markup = { inline_keyboard: buttons };
  return tg(env, 'sendMessage', body);
}
const newId = () => { const b = new Uint8Array(12); crypto.getRandomValues(b); return Array.from(b, x => 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x % 62]).join(''); };
// Sends one message (and the Max trend image first) and returns the writes to log it.
async function deliver(env, link, msg, d, logId, now) {
  const writes = [];
  if (msg.trend) {
    const pts = (d.tests || []).filter(isFullTest).sort((a, b) => a.finishedAt - b.finishedAt).slice(-8);
    const target = (d.study.gap && d.study.gap.cur && d.study.gap.cur.target) || (d.user && d.user.target) || 0;
    if (pts.length >= 2) {
      try {
        const png = await trendPng(pts.map(h => h.total), target);
        const caption = pts.map(h => h.total).join(' → ') + (target ? '  ·  ' + target : '');
        await tg(env, 'sendPhoto', () => {
          const f = new FormData();
          f.append('chat_id', String(link.chatId));
          f.append('caption', caption.slice(0, 1000));
          f.append('photo', new Blob([png], { type: 'image/png' }), 'trend.png');
          return f;
        });
      } catch (e) { console.log('trend image failed', e && e.message); }
    }
  }
  const r = await sendText(env, link.chatId, msg.text, msg.buttons);
  if (r.status === 403) writes.push(upd('telegramLinks/' + link.id, { active: false, blocked: true }));
  writes.push(upd('tgLog/' + logId, { linkId: link.id, uid: link.uid, kind: msg.kind, sentAt: new Date(now), status: r.ok ? 'sent' : 'error ' + r.status }, true));
  return { ok: r.ok, writes };
}

/* ------------------------------------------------------------------
   Sunday 19:00: weekly and parent reports, a chunk each minute
   ------------------------------------------------------------------ */
async function weekly(env, ts) {
  const now = ts || Date.now();
  if (local(now).getUTCDay() !== 0) return { skipped: 'not Sunday' };
  const week = String(weekStart(now));
  const chunk = Math.max(1, Number(env.WEEKLY_CHUNK) || 15);
  let state = env.TG_STATE ? JSON.parse(await env.TG_STATE.get('weekly:' + week) || 'null') : null;
  if (!env.TG_STATE && local(now).getUTCMinutes() !== 0) return { skipped: 'no TG_STATE, runs once at 19:00' };
  if (!state) {
    const links = (await fsList(env, 'telegramLinks')).filter(l => l.active !== false);
    state = { ids: links.map(l => l.id).sort(), i: 0 };
  }
  if (state.i >= state.ids.length) return { done: true, total: state.ids.length };
  const ids = env.TG_STATE ? state.ids.slice(state.i, state.i + chunk) : state.ids;
  state.i += ids.length;
  if (env.TG_STATE) await env.TG_STATE.put('weekly:' + week, JSON.stringify(state), { expirationTtl: 3 * 86400 });
  const links = (await fsBatchGetList(env, ids.map(id => 'telegramLinks/' + id))).filter(l => l && l.active !== false);
  const data = await loadStudents(env, links.map(l => l.uid));
  const writes = [];
  let sent = 0;
  for (const link of links) {
    const d = data[link.uid];
    if (!d || !d.user) continue;
    if (link.role === 'parent' && planOf(d.user, now) !== 'max') continue;
    const logId = newId();
    const msg = link.role === 'parent' ? parentReport(env, d, link, now, logId) : studentReport(env, d, link, now, logId);
    const r = await deliver(env, link, msg, d, logId, now);
    writes.push(...r.writes);
    if (r.ok) sent++;
    await sleep(60);
  }
  if (writes.length) await fsCommit(env, writes);
  return { sent, of: links.length, progress: state.i + '/' + state.ids.length };
}

/* ------------------------------------------------------------------
   Every 15 minutes: reminders, streak savers, parent alerts, nightly times
   ------------------------------------------------------------------ */
async function quarterHour(env, ts) {
  const now = ts || Date.now();
  const time = hhmm(now), hour = +time.slice(0, 2), slot = time.slice(0, 3) + String(Math.floor(+time.slice(3) / 15) * 15).padStart(2, '0');
  const out = { slot };
  if (slot === '03:00') out.times = await questionTimes(env, now);
  if (hour < QUIET_TO || hour >= QUIET_FROM) return out;
  const inSlot = hm => { const [h, m] = String(hm || '').split(':').map(Number); return h * 60 + m >= +slot.slice(0, 2) * 60 + +slot.slice(3) && h * 60 + m < +slot.slice(0, 2) * 60 + +slot.slice(3) + 15; };
  const today = dayKey(now);
  const links = (await fsList(env, 'telegramLinks')).filter(l => l.active !== false);
  const students = links.filter(l => l.role === 'student' && l.remindersOn !== false && l.cadence !== 'weekly' && l.lastNudgeDay !== today &&
    (l.cadence !== 'alt' || !l.lastNudgeDay || dayNum(now) - dayNum(Date.parse(l.lastNudgeDay + 'T12:00:00+05:00')) >= 2) &&
    (inSlot(l.reminderTime || '18:00') || slot === '20:00'));
  const parents = slot === '10:00' ? links.filter(l => l.role === 'parent' && l.parentAlertOn) : [];
  if (!students.length && !parents.length) return out;
  const data = await loadStudents(env, students.concat(parents).map(l => l.uid));
  const writes = [];
  let sent = 0;
  for (const l of students) {
    const d = data[l.uid];
    if (!d || !d.user || planOf(d.user, now) === 'free') continue;
    const lang = pickLang(l.language);
    const doneToday = studiedToday(d, now);
    const reviewedToday = d.attempts.some(a => (a.source === 'review' || a.source === 'mistakes') && dayKey(a.ts) === today);
    const due = dueToday(d, now), streak = streakOf(d, now);
    const logId = newId();
    let msg = null;
    if (inSlot(l.reminderTime || '18:00') && due > 0 && !reviewedToday) msg = { kind: 'reminder', text: t(lang, 'remind', { n: due, ns: due === 1 ? '' : 's', m: Math.max(2, Math.round(Math.min(due, 20) * 75 / 60)) }), buttons: [[button(env, logId, t(lang, 'review'), 'review', 'reminder')]] };
    else if (slot === '20:00' && streak >= 3 && !doneToday) msg = { kind: 'streak', text: t(lang, 'streak', { n: streak }), buttons: [[button(env, logId, t(lang, 'practice'), 'daily', 'streak')]] };
    if (!msg) continue;
    // The last nudge went unanswered (no click, no practice since): count it.
    const ignored = l.lastNudgeAt && !l.lastClicked && lastActivity(d) < l.lastNudgeAt ? (l.ignored || 0) + 1 : 0;
    const r = await deliver(env, l, msg, d, logId, now);
    writes.push(...r.writes);
    const patch = { lastNudgeDay: today, lastNudgeAt: now, lastClicked: false, ignored };
    // After 3 ignored reminders in a row: every other day, and ask.
    if (r.ok && ignored >= 3 && (l.cadence || 'daily') === 'daily') {
      patch.cadence = 'alt'; patch.ignored = 0;
      await sendText(env, l.chatId, t(lang, 'tooMany'), [[{ text: t(lang, 'keep'), callback_data: 'cad:daily' }, { text: t(lang, 'alt'), callback_data: 'cad:alt' }], [{ text: t(lang, 'weeklyOnly'), callback_data: 'cad:weekly' }]]);
    }
    writes.push(upd('telegramLinks/' + l.id, patch));
    if (r.ok) sent++;
    await sleep(60);
  }
  // Parent alert (opt-in): one message after 7 days without practice.
  for (const l of parents) {
    const d = data[l.uid];
    if (!d || !d.user || planOf(d.user, now) !== 'max') continue;
    const last = lastActivity(d);
    if (!last || now - last < 7 * DAY || l.alertedFor === dayKey(last)) continue;
    const logId = newId();
    const r = await deliver(env, l, { kind: 'parent', text: t(pickLang(l.language), 'parentAlert', { name: escHtml(firstName(d.user.name) || 'SAT Ustoz') }), buttons: [] }, d, logId, now);
    writes.push(...r.writes, upd('telegramLinks/' + l.id, { alertedFor: dayKey(last) }));
    if (r.ok) sent++;
  }
  if (writes.length) await fsCommit(env, writes);
  out.sent = sent;
  return out;
}

// Median seconds per question from correct answers by students active in the
// last 30 days, for questions with at least 30 of them.
async function questionTimes(env, now) {
  const users = await fsQuery(env, 'users', 'lastSeenAt', 'GREATER_THAN_OR_EQUAL', { timestampValue: new Date(now - 30 * DAY).toISOString() }, []);
  const times = {};
  const ids = users.map(u => u.__id);
  for (let i = 0; i < ids.length; i += 100) {
    const got = await fsBatchGet(env, ids.slice(i, i + 100).map(u => 'users/' + u + '/data/attempts'), ['items']);
    Object.values(got).forEach(doc => (doc.items || []).forEach(a => {
      if (!a || !a.correct || !a.qid || !(a.ms > 1000) || a.ms > 15 * 60000 || a.source === 'review' || a.source === 'mistakes') return;
      (times[a.qid] = times[a.qid] || []).push(a.ms);
    }));
  }
  const m = {};
  Object.keys(times).forEach(q => {
    const v = times[q];
    if (v.length < MEDIAN_MIN) return;
    v.sort((a, b) => a - b);
    m[q] = Math.round((v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) / 1000);
  });
  await fsCommit(env, [upd('stats/questionTimes', { m, updatedAt: new Date(now), students: ids.length }, true)]);
  return { students: ids.length, questions: Object.keys(m).length };
}

/* ------------------------------------------------------------------
   The bot: /start <token>, /stats, /today, /settings, /stop, buttons
   ------------------------------------------------------------------ */
async function onUpdate(env, u) {
  if (u.callback_query) return onButton(env, u.callback_query);
  const m = u.message;
  if (!m || !m.text || !m.chat || m.chat.type !== 'private') return;
  const chatId = String(m.chat.id), text = m.text.trim();
  const [cmd, arg] = text.split(/\s+/, 2);
  const links = await fsQuery(env, 'telegramLinks', 'chatId', 'EQUAL', { stringValue: chatId });
  const me = links.find(l => l.role === 'student') || links[0] || null;
  const lang = pickLang(me ? me.language : (m.from && m.from.language_code || '').slice(0, 2));
  const settingsUrl = siteLink(env, 'settings', 'bot');
  if (cmd === '/start') {
    if (arg && /^[A-Za-z0-9]{32}$/.test(arg)) return link(env, m, chatId, arg);
    if (links.length && links.some(l => l.active === false)) {
      await fsCommit(env, links.map(l => upd('telegramLinks/' + l.id, { active: true, blocked: false })));
      return sendText(env, chatId, t(lang, 'restarted'));
    }
    if (links.length) return sendText(env, chatId, t(lang, 'help'));
    return sendText(env, chatId, t(lang, 'howTo') + '\n' + settingsUrl);
  }
  if (!me) return sendText(env, chatId, t(lang, 'notLinked') + '\n' + t(lang, 'howTo') + '\n' + settingsUrl);
  if (cmd === '/stop') {
    await fsCommit(env, links.map(l => upd('telegramLinks/' + l.id, { active: false })));
    return sendText(env, chatId, t(lang, 'stopped'));
  }
  if (cmd === '/settings') return sendSettings(env, chatId, me);
  if (cmd === '/stats' || cmd === '/today') {
    if (me.role !== 'student') return sendText(env, chatId, t(lang, 'help'));
    const d = (await loadStudents(env, [me.uid]))[me.uid];
    const now = Date.now(), plan = planOf(d.user, now);
    if (plan === 'free') return sendText(env, chatId, t(lang, 'proOnly'), [[{ text: t(lang, 'pro'), url: siteLink(env, 'plans', 'bot') }]]);
    if (cmd === '/today') {
      const n = dueToday(d, now);
      return sendText(env, chatId, n ? t(lang, 'today', { n, ns: n === 1 ? '' : 's' }) : t(lang, 'todayNone'), n ? [[{ text: t(lang, 'review'), url: siteLink(env, 'review', 'bot') }]] : []);
    }
    const s = (d.study.gap || {}).cur;
    if (!s || !s.estimate) return sendText(env, chatId, t(lang, 'noData'), [[{ text: t(lang, 'dash'), url: siteLink(env, 'dash', 'bot') }]]);
    return sendText(env, chatId, t(lang, 'stats', { e: s.estimate, t: s.target, g: s.gap || 0, k: escHtml(s.top ? s.top.skill || s.top.domain : '–') }), [[{ text: t(lang, 'dash'), url: siteLink(env, 'dash', 'bot') }]]);
  }
  return sendText(env, chatId, t(lang, 'help'));
}

async function link(env, m, chatId, token) {
  const tok = await fsGetDoc(env, 'linkTokens/' + token);
  const guess = pickLang((m.from && m.from.language_code || '').slice(0, 2));
  const settingsUrl = siteLink(env, 'settings', 'bot');
  if (!tok || tok.usedAt || !tok.expiresAt || tok.expiresAt < Date.now()) return sendText(env, chatId, t(guess, 'badToken') + '\n' + settingsUrl);
  const lang = pickLang(tok.lang), role = tok.role === 'parent' ? 'parent' : 'student';
  const user = await fsGetDoc(env, 'users/' + tok.uid);
  if (!user) return sendText(env, chatId, t(lang, 'badToken') + '\n' + settingsUrl);
  const name = escHtml(firstName(user.name));
  if (role === 'parent' && planOf(user, Date.now()) !== 'max') return sendText(env, chatId, t(lang, 'parentMax'));
  const id = tok.uid + '_' + chatId + (role === 'parent' ? '_p' : '');
  await fsCommit(env, [
    upd('telegramLinks/' + id, {
      uid: tok.uid, chatId, role, username: (m.from && m.from.username) || '', name: (m.from && m.from.first_name) || '', language: lang,
      remindersOn: role === 'student', reminderTime: '18:00', parentAlertOn: false, active: true, blocked: false, cadence: 'daily', ignored: 0, linkedAt: new Date()
    }, true),
    { delete: docName(env, 'linkTokens/' + token) }
  ]);
  if (role === 'student') return sendText(env, chatId, t(lang, 'connected'));
  await sendText(env, chatId, t(lang, 'parentConnected', { name }));
  return sendText(env, chatId, t(lang, 'parentAlertQ', { name }), [[{ text: t(lang, 'yes'), callback_data: 'pa:1' }, { text: t(lang, 'no'), callback_data: 'pa:0' }]]);
}

function sendSettings(env, chatId, me) {
  const lang = pickLang(me.language), on = me.remindersOn !== false;
  const rows = [Object.keys(LANGS).map(l => ({ text: (l === lang ? '✓ ' : '') + LANGS[l], callback_data: 'lang:' + l }))];
  if (me.role === 'student') {
    rows.push([{ text: t(lang, on ? 'remOff' : 'remOn'), callback_data: 'rem:' + (on ? 'off' : 'on') }]);
    rows.push(['07:00', '16:00', '18:00', '20:00', '21:00'].map(x => ({ text: (x === (me.reminderTime || '18:00') ? '✓ ' : '') + x, callback_data: 'time:' + x })));
    rows.push([{ text: t(lang, 'keep'), callback_data: 'cad:daily' }, { text: t(lang, 'alt'), callback_data: 'cad:alt' }, { text: t(lang, 'weeklyOnly'), callback_data: 'cad:weekly' }]);
  }
  return sendText(env, chatId, t(lang, 'settings', { lang: LANGS[lang], rem: t(lang, on ? 'on' : 'off'), time: me.reminderTime || '18:00' }), rows);
}

async function onButton(env, q) {
  const chatId = String(q.message && q.message.chat && q.message.chat.id || '');
  const data = String(q.data || '');
  const links = chatId ? await fsQuery(env, 'telegramLinks', 'chatId', 'EQUAL', { stringValue: chatId }) : [];
  const student = links.find(l => l.role === 'student'), parent = links.find(l => l.role === 'parent');
  const me = student || parent;
  if (!me) return tg(env, 'answerCallbackQuery', { callback_query_id: q.id });
  let lang = pickLang(me.language), note = '';
  const [k, v] = [data.slice(0, data.indexOf(':')), data.slice(data.indexOf(':') + 1)];
  if (k === 'pa' && parent) {
    await fsCommit(env, links.filter(l => l.role === 'parent').map(l => upd('telegramLinks/' + l.id, { parentAlertOn: v === '1' })));
    note = t(lang, v === '1' ? 'alertOn' : 'alertOff');
  } else if (k === 'cad' && student && ['daily', 'alt', 'weekly'].indexOf(v) > -1) {
    await fsCommit(env, [upd('telegramLinks/' + student.id, { cadence: v, ignored: 0, remindersOn: v !== 'weekly' })]);
    note = t(lang, 'cadenceSaved');
  } else if (k === 'lang' && TEXT[v]) {
    await fsCommit(env, links.map(l => upd('telegramLinks/' + l.id, { language: v })));
    lang = v; note = t(lang, 'cadenceSaved');
  } else if (k === 'rem' && student) {
    await fsCommit(env, [upd('telegramLinks/' + student.id, { remindersOn: v === 'on' })]);
    note = t(lang, 'cadenceSaved');
  } else if (k === 'time' && student && /^\d\d:\d\d$/.test(v)) {
    await fsCommit(env, [upd('telegramLinks/' + student.id, { reminderTime: v })]);
    note = t(lang, 'cadenceSaved');
  }
  await tg(env, 'answerCallbackQuery', { callback_query_id: q.id, text: note });
  if (note && q.message) await tg(env, 'editMessageReplyMarkup', { chat_id: chatId, message_id: q.message.message_id, reply_markup: { inline_keyboard: [] } });
}

/* ------------------------------------------------------------------
   /go: count the click, then open the site with UTM tags
   ------------------------------------------------------------------ */
async function go(env, url, ctx) {
  const n = url.searchParams.get('n') || '', to = TARGETS[url.searchParams.get('to')] ? url.searchParams.get('to') : 'dash';
  const c = (url.searchParams.get('c') || 'weekly').replace(/[^a-z]/g, '').slice(0, 20) || 'weekly';
  if (/^[A-Za-z0-9]{12}$/.test(n) && env.GOOGLE_SERVICE_ACCOUNT) {
    ctx.waitUntil((async () => {
      const log = await fsGetDoc(env, 'tgLog/' + n);
      if (!log || log.clickedAt) return;
      const w = [upd('tgLog/' + n, { clickedAt: new Date() })];
      if (log.linkId) w.push(upd('telegramLinks/' + log.linkId, { lastClicked: true, ignored: 0 }));
      await fsCommit(env, w);
    })().catch(e => console.log('click log failed', e && e.message)));
  }
  return Response.redirect(siteLink(env, to, c), 302);
}

async function setup(env, url) {
  if (!env.ADMIN_KEY || !safeEqual(url.searchParams.get('key') || '', env.ADMIN_KEY)) return new Response('forbidden', { status: 403 });
  const hook = await tg(env, 'setWebhook', { url: url.origin + '/telegram', secret_token: env.TG_WEBHOOK_SECRET, allowed_updates: ['message', 'callback_query'], drop_pending_updates: true });
  const cmds = {};
  for (const l of ['en', 'uz', 'ru']) {
    const desc = t(l, 'help').split('\n').map(x => { const i = x.indexOf(' '); return { command: x.slice(1, i), description: x.slice(i + 1) }; });
    cmds[l] = (await tg(env, 'setMyCommands', l === 'uz' ? { commands: desc } : { commands: desc, language_code: l })).ok;
  }
  return new Response(JSON.stringify({ webhook: hook.data, commands: cmds }, null, 2), { headers: { 'content-type': 'application/json' } });
}
function safeEqual(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/* ------------------------------------------------------------------
   Score trend image (Max): last 8 full tests and the target line, as a PNG
   ------------------------------------------------------------------ */
const DIGITS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111'];
async function trendPng(vals, target) {
  const W = 640, H = 320, L = 64, R = 28, T = 30, B = 30;
  const px = new Uint8Array(W * H * 3).fill(255);
  const GREEN = [45, 80, 56], GOLD = [125, 98, 32], GRID = [223, 229, 217], INK = [94, 106, 96];
  const set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 3; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; };
  const disc = (cx, cy, r, c) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * .5) set(cx + x, cy + y, c); };
  const line = (x0, y0, x1, y1, r, c, dash) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let i = 0; i <= n; i++) { if (dash && Math.floor(i / dash) % 2) continue; disc(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, r, c); } };
  const num = (str, x, y, s, c) => { String(str).split('').forEach((ch, k) => { const g = DIGITS[+ch]; if (!g) return; for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (g[r * 3 + q] === '1') for (let a = 0; a < s; a++) for (let b = 0; b < s; b++) set(x + k * 4 * s + q * s + a, y + r * s + b, c); }); };
  const all = vals.concat(target ? [target] : []);
  const lo = Math.max(400, Math.floor((Math.min.apply(null, all) - 60) / 100) * 100), hi = Math.min(1600, Math.ceil((Math.max.apply(null, all) + 60) / 100) * 100);
  const sy = v => T + (hi - v) / ((hi - lo) || 1) * (H - T - B), sx = i => L + (vals.length > 1 ? i / (vals.length - 1) : .5) * (W - L - R);
  for (let v = lo; v <= hi; v += 100) { line(L, sy(v), W - R, sy(v), 0, GRID); num(v, 8, sy(v) - 5, 2, INK); }
  if (target >= lo && target <= hi) line(L, sy(target), W - R, sy(target), 1, GOLD, 9);
  for (let i = 1; i < vals.length; i++) line(sx(i - 1), sy(vals[i - 1]), sx(i), sy(vals[i]), 2, GREEN);
  vals.forEach((v, i) => { disc(sx(i), sy(v), 7, GREEN); disc(sx(i), sy(v), 3, [255, 255, 255]); num(v, sx(i) - 15, sy(v) - 24, 2, GREEN); });
  // PNG: 8-bit RGB, one filter byte per row, zlib-compressed.
  const raw = new Uint8Array(H * (W * 3 + 1));
  for (let y = 0; y < H; y++) raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (W * 3 + 1) + 1);
  const z = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
  const ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer);
  dv.setUint32(0, W); dv.setUint32(4, H); ihdr[8] = 8; ihdr[9] = 2;
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', ihdr), pngChunk('IDAT', z), pngChunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0; parts.forEach(p => { out.set(p, o); o += p.length; });
  return out;
}
let CRC = null;
function crc32(buf) {
  if (!CRC) { CRC = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; } }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function pngChunk(type, data) {
  const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/* ------------------------------------------------------------------
   Firestore over REST, with the service account (skips firestore.rules)
   ------------------------------------------------------------------ */
const fsBase = env => 'https://firestore.googleapis.com/v1/projects/' + env.FIREBASE_PROJECT_ID + '/databases/(default)/documents';
const docName = (env, path) => 'projects/' + env.FIREBASE_PROJECT_ID + '/databases/(default)/documents/' + path;
const authHeaders = async env => ({ authorization: 'Bearer ' + await googleToken(env), 'content-type': 'application/json' });
function dec(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return Date.parse(v.timestampValue) || 0;
  if ('mapValue' in v) return decFields(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
  return null;
}
function decFields(f) { const o = {}; Object.keys(f || {}).forEach(k => { o[k] = dec(f[k]); }); return o; }
function encVal(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encVal) } };
  const f = {};
  Object.keys(v).forEach(k => { f[k] = encVal(v[k]); });
  return { mapValue: { fields: f } };
}
const fieldPath = k => /^[A-Za-z_][A-Za-z_0-9]*$/.test(k) ? k : '`' + k.replace(/[`\\]/g, c => '\\' + c) + '`';
// A write that sets these fields (whole: replace the document).
function upd(path, fields, whole) {
  const f = {};
  Object.keys(fields).forEach(k => { f[k] = encVal(fields[k]); });
  return Object.assign({ update: { name: path, fields: f } }, whole ? {} : { updateMask: { fieldPaths: Object.keys(fields).map(fieldPath) } });
}
async function fsCommit(env, writes) {
  for (let i = 0; i < writes.length; i += 400) {
    const part = writes.slice(i, i + 400).map(w => w.update ? Object.assign({}, w, { update: Object.assign({}, w.update, { name: docName(env, w.update.name) }) }) : w);
    const res = await fetch(fsBase(env) + ':commit', { method: 'POST', headers: await authHeaders(env), body: JSON.stringify({ writes: part }) });
    if (!res.ok) console.log('firestore commit', res.status, (await res.text()).slice(0, 300));
  }
}
async function fsGetDoc(env, path) {
  const res = await fetch(fsBase(env) + '/' + path, { headers: await authHeaders(env) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('firestore get ' + res.status + ' ' + (await res.text()).slice(0, 200));
  const d = await res.json();
  return Object.assign(decFields(d.fields), { __id: d.name.split('/').pop() });
}
// { 'users/x': {...} } for the documents that exist. mask: only these fields.
async function fsBatchGet(env, paths, mask) {
  const out = {};
  if (!paths.length) return out;
  const res = await fetch(fsBase(env) + ':batchGet', {
    method: 'POST', headers: await authHeaders(env),
    body: JSON.stringify(Object.assign({ documents: paths.map(p => docName(env, p)) }, mask ? { mask: { fieldPaths: mask } } : {}))
  });
  if (!res.ok) throw new Error('firestore batchGet ' + res.status + ' ' + (await res.text()).slice(0, 200));
  const prefix = docName(env, '');
  (await res.json()).forEach(r => { if (r.found) out[r.found.name.slice(prefix.length)] = Object.assign(decFields(r.found.fields), { __id: r.found.name.split('/').pop() }); });
  return out;
}
async function fsBatchGetList(env, paths) {
  const got = await fsBatchGet(env, paths);
  return paths.map(p => got[p] ? Object.assign(got[p], { id: got[p].__id }) : null);
}
async function fsList(env, collection) {
  const out = [];
  let token = '';
  do {
    const res = await fetch(fsBase(env) + '/' + collection + '?pageSize=300' + (token ? '&pageToken=' + encodeURIComponent(token) : ''), { headers: await authHeaders(env) });
    if (!res.ok) throw new Error('firestore list ' + res.status);
    const d = await res.json();
    (d.documents || []).forEach(doc => out.push(Object.assign(decFields(doc.fields), { id: doc.name.split('/').pop() })));
    token = d.nextPageToken || '';
  } while (token);
  return out;
}
// One equality or range filter on a top-level collection. select: field names to return ([] = names only).
async function fsQuery(env, collection, field, op, value, select) {
  const q = { from: [{ collectionId: collection }], where: { fieldFilter: { field: { fieldPath: field }, op, value } } };
  if (select) q.select = { fields: select.length ? select.map(f => ({ fieldPath: f })) : [{ fieldPath: '__name__' }] };
  const res = await fetch(fsBase(env) + ':runQuery', { method: 'POST', headers: await authHeaders(env), body: JSON.stringify({ structuredQuery: q }) });
  if (!res.ok) throw new Error('firestore query ' + res.status + ' ' + (await res.text()).slice(0, 200));
  return (await res.json()).filter(r => r.document).map(r => Object.assign(decFields(r.document.fields), { id: r.document.name.split('/').pop(), __id: r.document.name.split('/').pop() }));
}

// Google access token from the service account (RS256 JWT, WebCrypto). Same as worker/payments-worker.js.
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
