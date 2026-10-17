#!/usr/bin/env python3
"""Check a full-length practice test file before uploading it.

    python3 tools/check_test.py data/tests/practice-test-2.json

Checks the structure the test page expects (Module 1 plus an easier and a
harder Module 2 per section), question counts and timing, skill names,
answer formats, letter balance, and duplicates against the other tests.
It cannot check that an answer is actually right: that is still on you.
This folder does not need to be uploaded to GitHub.
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

TAXONOMY = {
    'rw': ['Central Ideas and Details', 'Command of Evidence: Textual', 'Command of Evidence: Quantitative', 'Inferences',
           'Words in Context', 'Text Structure and Purpose', 'Cross-Text Connections',
           'Rhetorical Synthesis', 'Transitions', 'Boundaries', 'Form, Structure, and Sense'],
    'math': ['Linear equations in one variable', 'Linear functions', 'Linear equations in two variables',
             'Systems of two linear equations in two variables', 'Linear inequalities in one or two variables',
             'Nonlinear functions', 'Nonlinear equations in one variable and systems of equations in two variables',
             'Equivalent expressions', 'Ratios, rates, proportional relationships, and units', 'Percentages',
             'One-variable data: distributions and measures of center and spread', 'Two-variable data: models and scatterplots',
             'Probability and conditional probability', 'Inference from sample statistics and margin of error',
             'Evaluating statistical claims: observational studies and experiments',
             'Area and volume', 'Lines, angles, and triangles', 'Right triangles and trigonometry', 'Circles'],
}
SHAPE = {'rw': (27, 32), 'math': (22, 35)}
LETTERS = 'ABCD'
SPR_RE = re.compile(r'^-?(\d+/\d+|\d+\.?\d*|\.\d+)$')

errors, warnings = [], []


def err(msg): errors.append(msg)
def warn(msg): warnings.append(msg)


def unescaped_dollars(s):
    """Count $ signs that are math delimiters (not written as \\$)."""
    return len(re.findall(r'(?<!\\)\$', s or ''))


def norm(s):
    return re.sub(r'\W+', ' ', (s or '').lower()).strip()


def check_question(q, where, section):
    qid = q.get('id', '')
    w = f'{where} {qid or "(no id)"}'
    if not qid:
        err(f'{w}: missing id')
    if q.get('section') != section:
        err(f'{w}: section must be "{section}"')
    if q.get('skill') not in TAXONOMY[section]:
        err(f'{w}: unknown skill "{q.get("skill")}"')
    if q.get('difficulty') not in ('easy', 'medium', 'hard'):
        err(f'{w}: difficulty must be easy, medium or hard')
    if not str(q.get('prompt', '')).strip():
        err(f'{w}: missing prompt')
    if not str(q.get('explanation', '')).strip():
        err(f'{w}: missing explanation')
    for field in ('passage', 'prompt', 'explanation'):
        if unescaped_dollars(q.get(field)) % 2:
            err(f'{w}: odd number of $ in {field} (write a money sign as \\$)')
    choices = q.get('choices')
    if choices is not None:
        if not isinstance(choices, list) or len(choices) != 4 or not all(str(c).strip() for c in choices):
            err(f'{w}: multiple choice needs exactly 4 non-empty choices (for "no punctuation", repeat the word itself)')
        elif len({str(c).strip() for c in choices}) < 4:
            err(f'{w}: two choices are the same')
        for c in choices or []:
            if unescaped_dollars(str(c)) % 2:
                warn(f'{w}: odd number of $ in a choice (write a money sign as \\$)')
        if q.get('answer') not in list(LETTERS):
            err(f'{w}: answer must be one letter A to D')
    else:
        if section == 'rw':
            err(f'{w}: Reading and Writing questions must be multiple choice')
        ans = q.get('answer')
        if not isinstance(ans, list) or not ans:
            err(f'{w}: typed-answer question needs "answer": ["..."]')
        else:
            for a in ans:
                a = str(a)
                if not SPR_RE.match(a):
                    err(f'{w}: typed answer "{a}" must be a plain number or fraction like 7/2')
                elif len(a.lstrip('-')) > 5:
                    err(f'{w}: typed answer "{a}" is longer than 5 characters')
    if section == 'rw' and not (q.get('passage') or q.get('table')):
        err(f'{w}: Reading and Writing questions need a passage')
    t = q.get('table')
    if t is not None:
        if not isinstance(t.get('rows'), list) or not t['rows']:
            err(f'{w}: table needs rows')
        head = t.get('head') or []
        for r in t.get('rows', []):
            if head and len(r) != len(head):
                err(f'{w}: a table row has {len(r)} cells but the header has {len(head)}')


def check_module(mod, where, section, kind):
    n, minutes = SHAPE[section]
    qs = (mod or {}).get('questions')
    if not isinstance(qs, list):
        err(f'{where}: missing questions list')
        return []
    if len(qs) != n:
        err(f'{where}: has {len(qs)} questions, needs {n}')
    if (mod or {}).get('minutes') != minutes:
        err(f'{where}: minutes must be {minutes}')
    for q in qs:
        check_question(q, where, section)
    diff = Counter(q.get('difficulty') for q in qs)
    if kind == 'module1' and (diff['easy'] < 3 or diff['medium'] < 8 or diff['hard'] < 5):
        warn(f'{where}: Module 1 should mix difficulties (Test 1 has about 5 easy, 12 medium, 8 hard); got {dict(diff)}')
    if kind == 'easier' and diff['hard']:
        warn(f'{where}: the easier Module 2 should have no hard questions; got {dict(diff)}')
    if kind == 'harder' and diff['hard'] < len(qs) - 2:
        warn(f'{where}: the harder Module 2 should be almost all hard; got {dict(diff)}')
    mc = [q.get('answer') for q in qs if q.get('choices') is not None]
    letters = Counter(mc)
    if mc:
        lo, hi = min(letters.get(L, 0) for L in LETTERS), max(letters.values())
        if hi - lo > 3:
            warn(f'{where}: answer letters are unbalanced {dict(sorted(letters.items()))}')
    if section == 'math':
        spr = sum(1 for q in qs if q.get('choices') is None)
        if not 4 <= spr <= 7:
            warn(f'{where}: {spr} typed-answer questions; aim for 5 or 6')
    skills = Counter(q.get('skill') for q in qs)
    if section == 'rw':
        for s in ('Words in Context', 'Boundaries', 'Transitions', 'Rhetorical Synthesis'):
            if skills.get(s, 0) < 2:
                warn(f'{where}: only {skills.get(s, 0)} "{s}" questions')
    return qs


def main(path):
    p = Path(path)
    try:
        d = json.loads(p.read_text(encoding='utf-8'))
    except Exception as e:
        print(f'FAIL: {p} is not valid JSON: {e}')
        return 1
    m = re.match(r'practice-test-(\d+)\.json$', p.name)
    if m and d.get('id') != f'practice-test-{m.group(1)}':
        err(f'top level: id must be "practice-test-{m.group(1)}"')
    for k in ('id', 'title', 'description'):
        if not str(d.get(k, '')).strip():
            err(f'top level: missing {k}')
    if (d.get('routing') or {}).get('threshold') != 0.6:
        err('top level: routing.threshold should be 0.6')
    if d.get('breakMinutes') != 10:
        err('top level: breakMinutes should be 10')
    secs = d.get('sections') or []
    if [s.get('id') for s in secs] != ['rw', 'math']:
        err('top level: sections must be [rw, math] in that order')
    all_qs = []
    for s in secs:
        sid = s.get('id')
        if sid not in SHAPE:
            continue
        all_qs += check_module(s.get('module1'), f'{sid} module1', sid, 'module1')
        m2 = s.get('module2') or {}
        all_qs += check_module(m2.get('easier'), f'{sid} module2.easier', sid, 'easier')
        all_qs += check_module(m2.get('harder'), f'{sid} module2.harder', sid, 'harder')
    ids = Counter(q.get('id') for q in all_qs)
    for i, c in ids.items():
        if c > 1:
            err(f'duplicate id inside this test: {i}')
    # Duplicates against every other test file
    other_ids, other_text = {}, {}
    for f in sorted(p.parent.glob('*.json')):
        if f.resolve() == p.resolve():
            continue
        try:
            o = json.loads(f.read_text(encoding='utf-8'))
        except Exception:
            continue
        for s in o.get('sections', []):
            mods = [s.get('module1')] + list((s.get('module2') or {}).values())
            for mod in mods:
                for q in (mod or {}).get('questions', []):
                    other_ids[q.get('id')] = f.name
                    key = norm(q.get('passage')) or norm(q.get('prompt'))
                    if len(key) > 40:
                        other_text[key] = f.name
    for q in all_qs:
        if q.get('id') in other_ids:
            err(f'id {q.get("id")} is already used in {other_ids[q.get("id")]}')
        key = norm(q.get('passage')) or norm(q.get('prompt'))
        if len(key) > 40 and key in other_text:
            err(f'{q.get("id")}: same passage or prompt as a question in {other_text[key]}')
    seen = {}
    for q in all_qs:
        key = norm(q.get('passage'))
        if len(key) > 40:
            if key in seen:
                warn(f'{q.get("id")}: same passage as {seen[key]}')
            seen[key] = q.get('id')

    print(f'{p}: {len(all_qs)} questions checked')
    for w in warnings:
        print('  warning:', w)
    for e in errors:
        print('  ERROR:', e)
    if errors:
        print(f'FAIL: {len(errors)} error(s), {len(warnings)} warning(s)')
        return 1
    print(f'OK: no errors, {len(warnings)} warning(s)')
    return 0


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
