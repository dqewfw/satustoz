# Scholar's Hub · SAT practice site

A static site for GitHub Pages. No build step, no server except the optional AI Worker.

```
index.html              Landing page (EN / UZ / RU)
practice.html           Practice hub: dashboard, practice sets, skill drills, AI practice, tests
test.html               Adaptive practice test in the digital SAT format (test.html?id=<test-id>)
login.html              Sign in / register with Google, plus a short first-time profile form
builder.html            Question builder for your team (not linked from the site, hidden from Google)
404.html                Branded "page not found" page (GitHub Pages uses it automatically)
assets/sh.css           Brand styles (colours and fonts at the top)
assets/sh.js            Shared code. SETTINGS block at the top: AI_ENDPOINT, FIREBASE, REQUIRE_LOGIN, contacts
data/catalog.json       List of every practice set and practice test
data/sets/*.json        Practice sets
data/tests/*.json       Practice tests
worker/ai-worker.js     Cloudflare Worker that holds the AI key (not used by the pages directly)
firestore.rules         Database security rules to paste into Firebase
robots.txt, sitemap.xml
```

## 1. Deploy

1. On GitHub, open the repository and choose **Add file → Upload files**.
2. Drag in everything from this folder (the `assets`, `data` and `worker` folders too) and commit.
   Uploading replaces `index.html`, `robots.txt` and `sitemap.xml`.
3. **Keep `CNAME` and `logo.jpg`.** They are not in this folder. `CNAME` keeps scholarshub.academy
   working, and every page uses `logo.jpg`.
4. Optional: if you want to keep the old FLEX/UWC page, rename the old `index.html` to something like
   `programs-2026.html` before you upload.
5. Wait a minute or two, then open scholarshub.academy and run through: practice set, the mini
   diagnostic test, and the language switch.

The site works fully at this point. AI practice and the tutor show a "not switched on yet" note until step 2.

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
4. **Authentication → Settings → Authorized domains → Add domain:** `scholarshub.academy`
   (add `www.scholarshub.academy` too).
5. **Build → Firestore Database → Create database.** Pick a location close to Uzbekistan
   (for example `europe-west`), start in **production mode**, then open the **Rules** tab, replace
   everything with the contents of `firestore.rules`, and click **Publish**.
6. **Project settings → General → Public-facing name:** `Scholar's Hub`. This is the name students see
   in the Google window.
7. Upload the updated `assets/sh.js` to GitHub. Open scholarshub.academy/login.html and sign in once to test.
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

1. Open `scholarshub.academy/builder.html`.
2. Choose **Practice set** or **Practice test**, give it an ID and title, write the questions.
   The right-hand panel shows exactly what students will see and lists anything missing.
3. Click **Download JSON**. Upload the file to `data/sets/` or `data/tests/`.
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
