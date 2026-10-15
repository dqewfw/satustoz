# Scholar's Hub · SAT practice site

A static site for GitHub Pages. No build step, no server except the optional AI Worker.

```
index.html              Landing page (EN / UZ / RU)
practice.html           Practice hub: dashboard, practice sets, skill drills, AI practice, tests
test.html               Adaptive practice test in the digital SAT format (test.html?id=<test-id>)
builder.html            Question builder for your team (not linked from the site, hidden from Google)
assets/sh.css           Brand styles (colours and fonts at the top)
assets/sh.js            Shared code. SETTINGS block at the top: AI_ENDPOINT, DESMOS_URL, contacts
data/catalog.json       List of every practice set and practice test
data/sets/*.json        Practice sets
data/tests/*.json       Practice tests
worker/ai-worker.js     Cloudflare Worker that holds the AI key (not used by the pages directly)
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

## 4. Adding your own questions

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
- Student progress lives in each student's browser (localStorage). No accounts, no personal data sent
  anywhere except the question text sent to the AI when a student uses the tutor.
- Brand colours are at the top of `assets/sh.css`. If the maroon on the old site was a slightly different
  shade, change `--maroon` and `--maroon-deep` there.
