# SAT Ustoz: SAT practice site

A static site for GitHub Pages. No build step, no server except the optional Cloudflare Workers (AI and payments).

```
index.html              Landing page (EN / UZ / RU)
practice.html           Practice hub: dashboard, practice sets, skill drills, AI practice, tests
test.html               Adaptive practice test in the digital SAT format (test.html?id=<test-id>)
login.html              Sign in / register with Google, plus a short first-time profile form
builder.html            Question builder for your team (not linked from the site, hidden from Google)
admin.html              Approve card-transfer payments, for you only (not linked from the site, hidden from Google)
404.html                Branded "page not found" page (GitHub Pages uses it automatically)
assets/sh.css           Brand styles (colours and fonts at the top)
assets/sh.js            Shared code. SETTINGS block at the top: AI_ENDPOINT, FIREBASE, REQUIRE_LOGIN, PLANS, PAYMENTS_ENDPOINT, TESTS_ENDPOINT, MANUAL_PAY, contacts
data/catalog.json       List of every practice set and practice test
data/sets/*.json        Practice sets
data/tests/*.json       Practice tests 1 to 3 and the mini diagnostic (Pro Tests 4 to 10 belong in a private repository, section 6)
worker/ai-worker.js     Cloudflare Worker that holds the AI key (not used by the pages directly)
worker/payments-worker.js  Cloudflare Worker for Payme payments, monthly renewals and the Pro test files
firestore.rules         Database security rules to paste into Firebase
tools/check_test.py     Checks a test file before you upload it (no need to upload this folder)
robots.txt, sitemap.xml
```

## 1. Deploy

1. On GitHub, open the repository and choose **Add file → Upload files**.
2. Drag in everything from this folder (the `assets`, `data` and `worker` folders too) and commit.
   Uploading replaces `index.html`, `robots.txt` and `sitemap.xml`.
3. **Keep `CNAME`.** It is not in this folder and keeps your domain working.
   The old `logo.jpg` is no longer used. The logo now lives in `assets/brand/`, and you can delete
   `logo.jpg` from the repository.
5. Wait a minute or two, then open satustoz.academy and run through: practice set, the mini
   diagnostic test, and the language switch.

The site works fully at this point. Until step 2, the AI practice tab shows a "not switched on yet" note and the
AI tutor buttons stay hidden.

## 2. Switch on the AI (about 10 minutes, free tier is enough)

The AI key must never be in the website. Anything in a page is public, the same problem the old
Telegram bot token had. The Worker keeps the key on Cloudflare's side.

1. Create an API key at console.anthropic.com and set a monthly spend limit there.
2. Follow the steps at the top of `worker/ai-worker.js`: create a Worker, paste the file, add the key as
   a **Secret**, add `ALLOWED_ORIGINS`, and (recommended) bind a KV namespace as `RATE_LIMIT` so each
   student gets a daily limit.
3. Put the Worker URL in `AI_ENDPOINT` at the top of `assets/sh.js` and upload that one file again.

Models: question writing uses `claude-sonnet-5-5`, the tutor uses `claude-haiku-5-5` (cheaper, fast).
Change them with the `GEN_MODEL` and `TUTOR_MODEL` variables in Cloudflare, no code change needed.

## Brand files

```
assets/brand/logo-horizontal.svg  Mark and "SATUstoz" side by side, used in every page header
assets/brand/mark.svg             The rounded-square mark on its own (narrow phones, icons)
assets/brand/wordmark.svg         "SATUstoz" lettering on its own
assets/brand/logo-full.svg        Mark above lettering, for print and social posts
favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png   Browser tab and phone home-screen icons
og-image.png                The preview card Telegram, Instagram and WhatsApp show when the link is shared
site.webmanifest            Lets students add the site to their phone's home screen
```

The SVGs were traced from the logo image you sent. When your designer sends the original vector files,
replace these with them, keeping the same file names, and every page picks them up.

Colours (top of `assets/sh.css`), taken from the logo: leaf and lettering green `#2D5038` for buttons, links and
selected answers; frame green `#557A48` for the big hero panel; darker `#1F3828` for the footer; gold `#C8A86E`
for thin accents only, because it is too light for text on white.
Typefaces: Jost for headings (its geometric capitals echo the logo), Source Sans 3 for reading. Both cover
Uzbek Latin and Russian Cyrillic.

## Moving to a new domain

1. In GitHub: **Settings → Pages → Custom domain**, enter the new domain, then tick **Enforce HTTPS**
   once it is offered. This rewrites `CNAME` for you.
2. Find and replace `satustoz.academy` with the new domain in: `index.html`, `practice.html`,
   `login.html`, `sitemap.xml`, `robots.txt`, `worker/ai-worker.js` and `worker/payments-worker.js`.
3. Firebase: **Authentication → Settings → Authorized domains**, add the new domain (and `www.`).
4. Cloudflare Workers (once the AI or payments are on): add the new domain to `ALLOWED_ORIGINS`, and in the payments
   Worker change `SITE_URL` to it.
5. Keep the old domain pointing at GitHub Pages for a few months so old links still work.

## Domain security checks (HSTS and DMARC)

Some website checkers flag these. Neither is a code change.

- **DMARC (email spoofing protection).** You only forward email through Namecheap and don't send mail from
  the domain, so the strictest setting is safe. In Namecheap: **Domain List → Manage → Advanced DNS → Add new
  record**: type `TXT`, host `_dmarc`, value `v=DMARC1; p=reject; adkim=s; aspf=s`. If you ever start sending
  email from the domain (Google Workspace, Zoho), change `p=reject` to `p=none` until that service is set up.
- **HSTS (always use https).** GitHub Pages can redirect to https (tick **Enforce HTTPS** in Settings → Pages)
  but cannot send the HSTS header itself. To get it, put the free Cloudflare plan in front of the site:
  add the domain in Cloudflare, switch the nameservers in Namecheap to Cloudflare's, set **SSL/TLS** to
  **Full**, then **SSL/TLS → Edge Certificates → HTTP Strict Transport Security → Enable**
  (max-age 6 months, include subdomains). This is optional; the site is already served over https.

## Test-day tools (built in)

- **Keyboard shortcuts** in tests: A–D choose, ←/→ previous/next, M mark for review, X eliminator, Esc closes menus.
  In practice sets: A–D choose, Enter checks the answer, Enter again goes to the next question.
- **More menu** in tests: text size (90% to 130%, remembered on the device), a line reader, help, save and exit.
- **Leaving a module asks first**, and says how many questions are still blank, because students can't go back.
- **Progress line** under the test header fills as questions are answered; the navigator shows answered and marked counts.
- **Results** show the score on a 400–1600 scale with the student's goal marked, and filter counts (incorrect, marked, blank).
- While `AI_ENDPOINT` is empty, the "Ask the AI tutor" and "AI questions" buttons are hidden so students don't hit
  dead ends. They come back on their own once the Worker URL is filled in. The landing page still describes the AI tutor.

## 3. Calculator

Built in, nothing to set up. Math questions (in tests and in practice) have a Calculator button that
opens the College Board version of the Desmos graphing calculator, the same one Bluebook uses, in a
panel students can drag and resize. The panel also has a "New window" link as a backup.

## 4. Google sign-in (Firebase, free, about 15 minutes)

Until you do this, the site works without accounts and shows no sign-in buttons.

1. Go to console.firebase.google.com and click **Create a project**. Name it e.g. `scholarshub-sat`.
   Google Analytics is optional; you can turn it off.
2. On the project home page click the **Web** icon (`</>`) to add an app. Nickname: `website`.
   Don't tick Firebase Hosting. Firebase then shows a `firebaseConfig` block. Copy `apiKey`,
   `authDomain`, `projectId` and `appId` into `FIREBASE` at the top of `assets/sh.js`.
   These values are designed to be public, unlike the AI key.
3. **Build → Authentication → Get started → Sign-in method → Google → Enable.** Pick your email as the
   support email and save.
4. **Authentication → Settings → Authorized domains → Add domain:** `satustoz.academy`
   (add `www.satustoz.academy` too).
5. **Build → Firestore Database → Create database.** Pick a location close to Uzbekistan
   (for example `europe-west`), start in **production mode**, then open the **Rules** tab, replace
   everything with the contents of `firestore.rules`, and click **Publish**.
6. **Project settings → General → Public-facing name:** `SAT Ustoz`. This is the name students see
   in the Google window.
7. Upload the updated `assets/sh.js` to GitHub. Open satustoz.academy/login.html and sign in once to test.
8. In your Cloudflare Worker, add a Text variable `FIREBASE_PROJECT_ID` with your project ID. From then on
   only signed-in students can use the AI, and the daily limit counts per student.

**Where to see your students**
- Authentication → Users: every registered email, sign-up date and last sign-in.
- Firestore Database → `users`: name, grade, target score, test date, and a `stats` summary
  (questions answered, accuracy, best test score, tests taken) for each student.

**Settings in `assets/sh.js`**
- `REQUIRE_LOGIN: false` lets anyone practice, and signing in saves progress. Set it to `true` to make
  every student sign in before practicing or taking a test.
- `AI_REQUIRES_LOGIN: true` keeps the AI tutor and AI questions for signed-in students.

**Good to know**
- Google blocks sign-in inside the Instagram, Facebook and TikTok in-app browsers, and sometimes Telegram's.
  The login page detects this and tells students to open the page in Chrome or Safari, with a copy-link button.
- Progress practiced before signing in is merged into the account on first sign-in. Signing out clears the
  device, so the next person on a shared computer starts fresh.
- The free Firebase plan easily covers hundreds of students a day.

## 5. Adding your own questions

1. Open `satustoz.academy/builder.html`.
2. Choose **Practice set** or **Practice test**, give it an ID and title, write the questions.
   The right-hand panel shows exactly what students will see and lists anything missing.
3. Click **Download JSON**. Upload the file to `data/sets/` or `data/tests/`. A Pro test goes to your private
   `satustoz-pro-tests` repository instead, once you have moved the Pro tests there (section 6).
4. Edit `data/catalog.json` on GitHub and paste the entry the builder shows you.

To edit an existing file, use **Open a JSON file** in the builder, change it, download, and upload it
over the old one.

### Text formatting inside questions

| You type | Students see |
|---|---|
| blank line | new paragraph |
| `**bold**`, `*italic*`, `__underline__` | bold, italic, underline |
| `______` (6 underscores) | a fill-in blank |
| `$3x^2 + 1$` | math (LaTeX) |
| `$$...$$` | math on its own line |
| `\$15` | a real dollar sign |

### Question fields (for editing JSON by hand)

```json
{
  "id": "unique-id",
  "section": "rw" or "math",
  "skill": "Words in Context",
  "difficulty": "easy" | "medium" | "hard",
  "passage": "optional stimulus text",
  "table": { "title": "optional", "head": ["Year", "Value"], "rows": [["2020", "5"]] },
  "image": "data/img/graph1.png", "imageAlt": "description for screen readers",
  "prompt": "The question",
  "choices": ["A text", "B text", "C text", "D text"],
  "answer": "B",
  "explanation": "Why B is right"
}
```

For a typed-answer math question, leave out `choices` and give `"answer": ["7/2", "3.5"]`.
Equivalent values are accepted automatically, and so are SAT-style rounded decimals (2/3 accepts .6666,
.6667, 0.666, 0.667). Skill names must match the official list in `assets/sh.js` (the builder gives you
a dropdown) so that progress tracking groups them correctly.

### Full-length tests

A full-length test needs, for each section, Module 1 plus an easier and a harder Module 2:
27 questions per Reading and Writing module (32 min) and 22 per Math module (35 min).
That is 81 + 66 = 147 questions per test. In the builder, set the minutes to 32 and 35.

`routing.threshold` (default 0.6) is the share of Module 1 a student must get right to be routed to the
harder Module 2. The College Board does not publish its real rule, so this is an estimate you can tune.

## 6. Plans and payments

### What each plan opens

| Plan | Opens | Price |
|---|---|---|
| Free | Practice Tests 1 to 3, mini diagnostic, practice sets, progress | 0 |
| Pro | All 10 practice tests | `PRO_PRICE` a month |
| Max | Everything, including the AI Tutor. Shown as "Coming soon" and can't be bought yet | `MAX_PRICE` a month |

- Prices are in `PLANS` at the top of `assets/sh.js`. **79 000 and 149 000 so'm are placeholders.** Put your real prices there.
  Once online payment is on, also change `PRO_PRICE` in the payments Worker: that is the amount students are charged.
- Which plan a test needs is the `"plan"` field on each test in `data/catalog.json` (`"free"` or `"pro"`).
  To make Test 4 free, change its `"plan"` to `"free"`.
- The pricing cards appear on the landing page (`index.html#pricing`, in EN / UZ / RU) and on `practice.html#plans`.

### Publish the new database rules (do this once)

`firestore.rules` changed: students can no longer write the `plan` fields on their own account. Without this, anyone
could give themselves Pro from the browser console. First put your email in `adminEmails()` near the top of the file
(see "Payment by card transfer" below). Then Firebase console → **Firestore Database → Rules**, replace everything
with the new `firestore.rules`, **Publish**.

### Payment by card transfer (until Payme is set up)

Students transfer the Pro price to your Uzcard or Humo card from any banking app, and you switch Pro on by hand.

**Switch it on (once)**

1. At the top of `assets/sh.js`, fill `MANUAL_PAY`: `CARD` (your card number) and `CARD_HOLDER` (the name the bank
   app shows when someone transfers to it). Check `PRO_PRICE` in `PLANS` too: that is the amount students are told to send.
2. In `firestore.rules`, find `adminEmails()` near the top and replace `REPLACE-WITH-YOUR-GOOGLE-EMAIL` with the
   Google email you will use on the admin page, in lowercase: `['you@gmail.com']`. For more than one person:
   `['you@gmail.com', 'partner@gmail.com']`. While the placeholder is there, nobody can use the admin page.
3. Publish the new `firestore.rules` (Firebase console → **Firestore Database → Rules** → paste → **Publish**).
   It adds `payRequests`, where students leave their payment details, and lets only the emails in `adminEmails()`
   approve them.
4. Upload `admin.html`, `assets/sh.js`, `assets/sh.css` and `firestore.rules` to GitHub.

Anyone can read the files in a public GitHub repository, including the email in `firestore.rules`. That is safe:
being an admin takes signing in to that Google account. To keep the email private anyway, leave the placeholder in
the GitHub copy and type your email only in the Firebase console before you publish.

**What the student sees**

1. "Upgrade to Pro" (after signing in) shows your card, the name on it and the price, each with a Copy button.
2. After paying they tap "I've paid" and enter the last 4 digits of the card they paid from, plus the receipt number
   if they have one. This is saved in Firestore as `payRequests/<their uid>`.
3. Last step: "Send receipt on Telegram" opens a chat with `CONTACT_TELEGRAM`, with a message already written
   (price, account email, card ending). They attach the receipt screenshot. **This message is how you hear about the payment.**
4. If they open "Upgrade to Pro" again within 7 days, it says the payment is being checked instead of showing the card.
   Pro students get a "Pay for another month" link under their plan, which opens the same steps.

**Checking a payment and switching Pro on**

1. When the Telegram message comes in, open `satustoz.academy/admin.html` and sign in with your admin Google account.
   It lists every payment waiting to be checked, newest first: the student's name and email, amount, the last 4 digits
   of the card they paid from, receipt number, when they sent it, and their plan right now.
2. In your bank app, find the incoming transfer: same amount, sender card ending in those 4 digits, around that time.
3. **Approve** switches Pro on and takes the payment off the list. Pro runs for 30 days from today, or for 30 days
   after their current Pro ends if they are renewing early, so they don't lose days. Each payment shows the new end
   date before you click. The student reloads the site and Tests 4 to 10 open.
4. **Reject**, when no transfer matches, only takes the payment off the list. Pro stays off. Tell them why on Telegram.

The admin page is not linked from the site and Google doesn't index it, so bookmark it. Anyone else who opens it gets
nothing: the database refuses the list to every account that is not in `adminEmails()`.

- *"This account can't open the payment list"*: the email you signed in with is not in `adminEmails()` in the rules
  you published, or the new rules are not published yet.
- A student who already has Pro with no end date (your team, for example) keeps it: Approve only clears the payment.
  A student with Max keeps Max, with 30 more days.
- Approve sets the same fields you would set by hand: `plan` = `pro`, `planUntil` (a timestamp) and
  `planSource` = `manual` on `users/<their uid>`. It also deletes `payRequests/<their uid>`. Both happen together or
  not at all.

**Without the admin page (fallback)**

If the admin page doesn't work for you, do the same in the Firebase console:

1. Firebase console → **Firestore Database → payRequests**: each document has the student's
   `email`, `amount`, `last4`, `receiptId` and `createdAt`.
2. In your bank app, find the incoming transfer: same amount, sender card ending in `last4`, around `createdAt`.
3. Switch Pro on in `users/<the same uid>` as described in the next section. Use the end of their current month as
   `planUntil` when they are renewing, so they don't lose days. Optionally add `planSource`, type *string*, `manual`.
4. Delete the `payRequests` document, so the list holds only payments you haven't checked yet.

If no transfer matches, reply on Telegram and leave Pro off. Writing a `payRequests` note never switches Pro on by
itself: only an admin (on the admin page) or you (in the console) can set the plan fields.

When Payme is ready, fill `PAYMENTS_ENDPOINT` and the card-transfer steps disappear by themselves.

### Giving a student Pro by hand (works with or without online payment)

While `PAYMENTS_ENDPOINT` and `MANUAL_PAY.CARD` are both empty, "Upgrade to Pro" tells the student to message you on
Telegram and shows the email of their account. After they pay you, or after you match a card transfer:

1. Firebase console → **Firestore Database → users**. Find the student's document (each one has an `email` field).
2. **Add field** `plan`, type *string*, value `pro`.
3. **Add field** `planUntil`, type *timestamp*, set to the day their month ends (for example 30 days from today).
4. The student reloads the site and Tests 4 to 10 open. When `planUntil` passes, they lock again by themselves.
   To extend, change `planUntil`. To end Pro early, delete `plan`.

Leave out `planUntil` to give Pro with no end date (for your own team, for example). The payment Worker never charges a
student whose Pro has no end date.

### Taking payments online with Payme

Stripe does not accept businesses registered in Uzbekistan, and most students pay with Uzcard or Humo, so the site uses
**Payme Business**. Once it is switched on, "Upgrade to Pro" offers students two ways to pay:

- **Pay by card, renews monthly.** A card form on your site (Uzcard or Humo). Payme sends an SMS code, the first month is
  charged, and Payme keeps the card. Every month after that the card is charged automatically until the student stops it
  under **Plans → Manage payment**.
- **Pay once on Payme.** Opens Payme's own payment page (Payme app, QR code or any card) for one month, with no automatic
  renewal.

Either way Pro switches on by itself within seconds: Payme tells your payments Worker, and the Worker writes `plan`,
`planUntil` (30 days ahead) and `planSource: payme` on the student's account. Your Payme key and Google key live in the
Worker on Cloudflare, never in the website. Tests 4 to 10 are then handed out by the same Worker, only to students whose
account allows them (see **Moving the Pro tests off GitHub Pages** below).

#### A. Get your Payme account ready (paperwork, no code)

1. Apply for **Payme Business**. Expect to need a registered business (an LLC or an individual entrepreneur) and a
   business bank account; ask them for the exact documents. They usually check the site before approving it: prices,
   contact details, a public offer (terms of sale) and a refund policy should be visible.
2. In the Payme Business cabinet add a **web kassa** (Веб-касса). Ask Payme's technical specialist for:
   - an account field named `order_id`, type **one-time** (одноразовый счёт),
   - **recurring payments (Subscribe API)** switched on for the same kassa, so card payments also report back to your
     Worker,
   - the kassa ID (Merchant ID) and the **TEST_KEY** for the sandbox. The real key comes when you go live.
   - For testing card payments, Payme's docs use a separate test cabinet: log in at test.paycom.uz with your phone number,
     password `qwerty`, SMS code `666666`, create a business and a "Virtual terminal" kassa, and ask Payme's technical
     specialist for its key.
3. Ask your accountant for the **IKPU code** (from tasnif.soliq.uz), the **package code** and the **VAT percent** for
   "SAT Ustoz Pro, one month of online practice tests". Payme needs them for fiscal receipts.
4. One question to ask Payme: their API can't be called from a browser, so card numbers typed into your card form pass
   through your Cloudflare Worker on their way to Payme (the Worker never stores or logs them). Their docs ask that card
   data not reach the merchant, so get their written OK for this. If they say no, set `PAYME_CARDS` to `false` and
   students use the Payme page only, with no automatic renewal.

#### B. Make a Google key for the Worker (Firebase console, 3 minutes)

The Worker needs this key to write the plan on a student's account.

1. Firebase console → ⚙ **Project settings → Service accounts → Generate new private key → Generate key**. A `.json`
   file downloads.
2. Treat this file like a password to your whole database: paste it only into Cloudflare (next step), never into the
   website, GitHub or a chat, and delete the downloaded file once it is in Cloudflare.

#### C. Create the payments Worker (Cloudflare dashboard, about 15 minutes)

1. **Workers & Pages → KV → Create namespace**, name it `sh-payments`.
2. **Workers & Pages → Create → Create Worker**, name it `scholarshub-pay` → **Deploy → Edit code**. Delete the sample
   code, paste the whole of `worker/payments-worker.js`, click **Deploy**.
3. Worker → **Settings → Bindings → Add → KV namespace**: variable name `PAYMENTS`, namespace `sh-payments`.
4. Worker → **Settings → Variables and Secrets → Add** each of these:

   | Name | Type | Value |
   |---|---|---|
   | `FIREBASE_PROJECT_ID` | Text | your Firebase project ID, e.g. `satustoz` |
   | `GOOGLE_SERVICE_ACCOUNT` | Secret | open the `.json` file from step B in a text editor and paste all of it |
   | `ALLOWED_ORIGINS` | Text | `https://satustoz.academy,https://www.satustoz.academy` |
   | `SITE_URL` | Text | `https://satustoz.academy` |
   | `PRO_PRICE` | Text | the Pro price in so'm, digits only, e.g. `79000`. This is what students are charged |
   | `PAYME_MERCHANT_ID` | Text | the web kassa ID |
   | `PAYME_TEST_KEY` | Secret | the kassa's TEST_KEY |
   | `PAYME_TEST` | Text | `true` (while testing) |
   | `ADMIN_KEY` | Secret | a long random password you make up, for the tests in step E |
   | `PAYME_CARDS_ID` | Text | while testing only: the ID of the "Virtual terminal" kassa from the test cabinet |
   | `PAYME_CARDS_KEY` | Secret | while testing only: that kassa's key |
   | `PAYME_IKPU`, `PAYME_PACKAGE_CODE`, `PAYME_VAT_PERCENT` | Text | the fiscal details from your accountant |

   When you add the fiscal details, tell Payme's technical specialist that your billing returns a `detail` object.
5. Worker → **Settings → Triggers → Cron Triggers → Add Cron Trigger**: `0 4 * * *` (every day at 09:00 Tashkent time).
   This is the daily renewal run.
6. Copy the Worker's address (`https://scholarshub-pay.<your-name>.workers.dev`).

#### D. Connect Payme and the website

1. Payme cabinet → your web kassa → developer settings → **Endpoint URL**: the Worker address followed by `/payme`, e.g.
   `https://scholarshub-pay.<your-name>.workers.dev/payme`.
2. In `assets/sh.js`, put the Worker address in `PAYMENTS_ENDPOINT` and make `PRO_PRICE` in `PLANS` show the same price as
   the Worker's `PRO_PRICE` (the cards show `PLANS`; the Worker charges its own). Upload `assets/sh.js` to GitHub.

#### E. Test everything in the Payme sandbox (before real money)

Sign in on the site with your own Google account. Your user ID is the name of your document in Firestore → `users`.

1. **Payme's sandbox checks.** On the site: **Plans → Upgrade to Pro → Pay once on Payme**. You land on test.paycom.uz
   with your order filled in. Run Payme's tests there, in this order, and check each answer:
   - *Неверные данные → Неверная авторизация*: error `-32504`.
   - *Неверная сумма*: error `-31001`. *Несуществующий счёт*: error `-31050`.
   - *Платежные запросы*: CheckPerformTransaction allowed, CreateTransaction (twice, same answer), CheckTransaction,
     a second CreateTransaction for the same order gives `-31008`, CancelTransaction works.
   - Then start a new order from the site and run the second scenario: create, PerformTransaction (twice, same answer),
     CheckTransaction, CancelTransaction.
2. **Pro switches on.** After a PerformTransaction, open Firestore → `users` → your document: `plan` is `pro`,
   `planUntil` is 30 days ahead and `planSource` is `payme`. Firestore → `payments` has one document for the order.
   Reload the site: Tests 4 to 10 open. Cancelling that performed transaction (a refund) takes the 30 days back off.
3. **Card payment.** **Upgrade to Pro → Pay by card**: card `8600 0691 9540 6311`, expiry `03/99`, SMS code `666666`
   (Payme's test card). Pro switches on and **Plans → Manage payment** shows the card and automatic renewal.
4. **Renewal.** In Firestore change your `planUntil` to tomorrow. Open this address in the browser (with your
   `ADMIN_KEY` and user ID):
   `https://scholarshub-pay.<your-name>.workers.dev/admin/renew?key=ADMIN_KEY&uid=YOUR_USER_ID&force=1`
   It answers `"state": "paid"`, and `planUntil` moves 30 days on from tomorrow.
5. **A failed renewal.** Open `.../admin/drop-card?key=ADMIN_KEY&uid=YOUR_USER_ID` (this deletes the saved card at Payme
   but leaves automatic renewal on). Set `planUntil` to tomorrow again and open the `admin/renew` address three times.
   Each answer says `"state": "failed"`; after the third, `"status": "stopped"`. `planUntil` doesn't change, so Pro
   ends tomorrow on its own and Tests 4 to 10 lock again.
6. **Stopping.** Pay by card once more, then **Plans → Manage payment → Stop automatic renewal**. Pro stays until
   `planUntil`.

`.../admin/sub?key=ADMIN_KEY&uid=YOUR_USER_ID` shows what the Worker has stored for a student (never the card number).

#### F. Go live

1. Ask Payme to move the kassa to production and send the real key.
2. In the Worker: add `PAYME_KEY` (Secret) with the real key, change `PAYME_TEST` to `false`, delete `PAYME_CARDS_ID`
   and `PAYME_CARDS_KEY` (live card payments use the web kassa), add `PAYME_IP_CHECK` = `true` (only Payme's servers
   may then call `/payme`), and delete `ADMIN_KEY` (add it back if you ever need the test addresses again).
3. Make one real payment yourself with your own card, check Firestore as in E2, then refund it from the Payme cabinet.

#### How renewals work

- Every morning the Worker charges the saved cards of students whose Pro ends within a day. The new month starts where
  the old one ends, so nobody loses days.
- If a charge fails (no money on the card, card blocked), the plan is left alone and Pro simply ends at `planUntil`. The
  Worker tries again the next two mornings; a student who tops up their card gets Pro back. After 3 failed tries
  (`RENEW_ATTEMPTS`), automatic renewal stops and the card is removed at Payme; the student can pay again any time.
- A refund from the Payme cabinet takes that month back off `planUntil` and stops automatic renewal.
- Giving Pro by hand still works. If you set a `planUntil`, a student with a saved card is charged when it ends.

#### What is kept where

- Firestore `users/<uid>`: `plan`, `planUntil`, `planSource` (`payme` when the Worker set it). Students can read but
  never change these.
- Firestore `payments/<order>`: one document per payment (email, amount, `kind`: `new`, `card` or `renewal`, date,
  `planUntil`, `revoked` after a refund). Students can't see this collection. It is your payment history.
- Cloudflare KV `sh-payments`: orders, Payme transactions, and Payme's card token for each student with automatic renewal.
  Card numbers are never stored anywhere on your side.
- The free Cloudflare plan is enough to start. The limit you would reach first is about 1 000 KV writes a day, which is
  roughly 50 to 100 payments a day. Beyond that, Workers Paid costs about $5 a month.

### Moving the Pro tests off GitHub Pages

Until you do this, `data/tests/practice-test-4.json` to `-10.json` are public files. The site shows Tests 4 to 10 as
locked, but anyone can open `satustoz.academy/test.html?id=practice-test-7`, or the file itself, without paying. The fix:
the Pro files move to a private GitHub repository, and the payments Worker hands them out only to students whose account
has Pro. The Worker reads `plan` and `planUntil` from Firestore itself, so nothing a student changes in their browser
opens a test.

**You don't need Payme for this.** It works with card transfer and with Pro given by hand. Tests 1 to 3 and the mini
diagnostic keep loading straight from GitHub Pages, exactly as before. Do the parts in this order: if you delete the files
first, Pro students can't open Tests 4 to 10 until the rest is done.

**1. Put the Pro tests in a private repository (GitHub, 5 minutes)**

1. GitHub → **New repository**, name `satustoz-pro-tests`, choose **Private**, create. **Add file → Upload files**: drag in
   `practice-test-4.json` to `practice-test-10.json` from `data/tests/`, commit.
2. GitHub → your photo → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new
   token**. Name `satustoz-pay`, expiration 1 year (put a reminder in your calendar), **Only select repositories** →
   `satustoz-pro-tests`, **Permissions → Repository permissions → Contents: Read-only**. Generate and copy the token.

**2. Set up the Worker (Cloudflare, about 15 minutes)**

If you already created the payments Worker for Payme (step C above), only add `PRO_TESTS_REPO` and `GITHUB_TOKEN` from
item 4 and go on to part 3.

1. Make the Google key: step B above.
2. Cloudflare → **Workers & Pages → KV → Create namespace**, name it `sh-payments`.
3. **Workers & Pages → Create → Create Worker**, name it `scholarshub-pay` → **Deploy → Edit code**. Delete the sample
   code, paste the whole of `worker/payments-worker.js`, click **Deploy**. Then Worker → **Settings → Bindings → Add → KV
   namespace**: variable name `PAYMENTS`, namespace `sh-payments`.
4. Worker → **Settings → Variables and Secrets → Add** each of these:

   | Name | Type | Value |
   |---|---|---|
   | `FIREBASE_PROJECT_ID` | Text | your Firebase project ID, e.g. `satustoz` |
   | `GOOGLE_SERVICE_ACCOUNT` | Secret | open the `.json` file from step B in a text editor and paste all of it |
   | `ALLOWED_ORIGINS` | Text | `https://satustoz.academy,https://www.satustoz.academy` |
   | `SITE_URL` | Text | `https://satustoz.academy` |
   | `PRO_TESTS_REPO` | Text | `your-github-name/satustoz-pro-tests` |
   | `GITHUB_TOKEN` | Secret | the token from part 1 |

   If you put the files in a folder inside that repository, also add `PRO_TESTS_DIR` (Text) with the folder name.
   Leave out the Payme variables and the Cron Trigger for now. Without them the payment parts of the Worker refuse every
   request, and the site keeps showing your card-transfer steps.
5. Copy the Worker's address (`https://scholarshub-pay.<your-name>.workers.dev`).

**3. Point the site at the Worker**

At the top of `assets/sh.js`, put the Worker address in `TESTS_ENDPOINT`. Not in `PAYMENTS_ENDPOINT`: that one also
switches "Upgrade to Pro" over to Payme. Upload `assets/sh.js` to GitHub. (If `PAYMENTS_ENDPOINT` is already set, skip
this part: Pro tests already go through the Worker.)

**4. Check it before deleting anything**

1. Give your own account Pro by hand (see **Giving a student Pro by hand** above), reload the site and open Practice
   Test 7. It loads.
2. Sign in with an account without Pro and open `satustoz.academy/test.html?id=practice-test-7`: it says "Practice Test 7
   is part of Pro". Practice Test 1 and the mini diagnostic open as before.

If Test 7 doesn't load, the message on screen says why: "Please sign in with Google first" means `FIREBASE_PROJECT_ID` is
wrong; "This site is not allowed..." means `ALLOWED_ORIGINS`; "Online payment is not switched on yet" means the `PAYMENTS`
binding or `GOOGLE_SERVICE_ACCOUNT` is missing. Cloudflare → your Worker → **Logs** shows more.

**5. Delete the public copies**

In your website repository, delete these 7 files:

```
data/tests/practice-test-4.json
data/tests/practice-test-5.json
data/tests/practice-test-6.json
data/tests/practice-test-7.json
data/tests/practice-test-8.json
data/tests/practice-test-9.json
data/tests/practice-test-10.json
```

Keep `practice-test-1.json` to `-3.json` and `diagnostic-mini.json`. Keep the entries of all tests in `data/catalog.json`
exactly as they are: the site draws the locked cards from them, and the Worker uses them to know which plan a test needs
and which file to read from the private repository.

About 15 minutes later (GitHub Pages and the Worker each keep a copy for up to 10 minutes), check again: in a private
window, `satustoz.academy/data/tests/practice-test-7.json` shows GitHub's "404" page, and your Pro account still opens
Test 7, now from the private repository. If it says "This test could not be loaded", check `PRO_TESTS_REPO` and
`GITHUB_TOKEN`; until you fix them, Tests 4 to 10 don't open for anyone.

Good to know:

- Changes to a Pro test reach students within 10 minutes (the Worker keeps a copy that long).
- To edit a Pro test, download it from the private repository, open it in `builder.html` (**Open a JSON file**), and
  upload the new file to the private repository, not to `data/tests/`.
- When the GitHub token expires, Tests 4 to 10 stop opening ("This test could not be loaded"). Make a new token as in
  part 1 and replace `GITHUB_TOKEN` in the Worker.
- When Payme is ready, use this same Worker: add the Payme variables and the Cron Trigger from step C, then put its
  address in `PAYMENTS_ENDPOINT` as in step D. `TESTS_ENDPOINT` can stay as it is.
- Deleting the files stops downloads from the site, but anyone who looks through your public website repository's history
  on GitHub can still find the old versions, and anyone who downloaded them keeps them. Tests you add from now on stay
  private.
- A student who took a Pro test can still open its review after Pro ends; the Worker remembers which tests they opened.
- The free Cloudflare plan is plenty: opening a test is one Worker request.

## About official College Board questions

The site does not include questions from the College Board's SAT Question Bank or Bluebook tests.
They are the College Board's copyrighted material, and republishing them on a commercial site without
permission risks a takedown of the whole domain. The engine runs any question set you have the rights
to. Students are pointed to Bluebook and the Question Bank from the Practice tests page, which is the
legitimate way for them to get official practice.

## Notes

- Scores are estimates. The real SAT uses item response theory; the site weights Module 2 by its
  difficulty and caps the easier route at about 640 per section. The results page says this to students.
- Without sign-in, progress lives in each student's browser (localStorage). With sign-in, it is also saved
  in your Firestore database under the student's account. The AI only receives the question text and the
  student's messages, never their email.
- Brand colours are at the top of `assets/sh.css`. If the maroon on the old site was a slightly different
  shade, change `--maroon` and `--maroon-deep` there.
