#!/usr/bin/env python3
"""Build the Question Bank data (data/bank/) from the practice tests.

Reads every full practice test in data/catalog.json (the mini diagnostic is
left out so it stays a fair first measure), collects all questions from
module 1 and both module 2 variants, and writes:

  data/bank/index.json       small: per-skill counts + question ids
  data/bank/<skill-slug>.json  the questions of one skill, in test order

The site derives which test a question came from out of its id (t5-m1-03 ->
Practice Test 5), so nothing else is stored. Rerun this after adding or
editing a practice test:  python3 tools/build_qbank.py
"""
import json, os, re, sys, hashlib, time, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'data', 'bank')

# Official content-domain taxonomy — keep identical to TAXONOMY in assets/sh.js.
TAXONOMY = {
    'rw': {
        'Information and Ideas': ['Central Ideas and Details', 'Command of Evidence: Textual', 'Command of Evidence: Quantitative', 'Inferences'],
        'Craft and Structure': ['Words in Context', 'Text Structure and Purpose', 'Cross-Text Connections'],
        'Expression of Ideas': ['Rhetorical Synthesis', 'Transitions'],
        'Standard English Conventions': ['Boundaries', 'Form, Structure, and Sense'],
    },
    'math': {
        'Algebra': ['Linear equations in one variable', 'Linear functions', 'Linear equations in two variables', 'Systems of two linear equations in two variables', 'Linear inequalities in one or two variables'],
        'Advanced Math': ['Nonlinear functions', 'Nonlinear equations in one variable and systems of equations in two variables', 'Equivalent expressions'],
        'Problem-Solving and Data Analysis': ['Ratios, rates, proportional relationships, and units', 'Percentages', 'One-variable data: distributions and measures of center and spread', 'Two-variable data: models and scatterplots', 'Probability and conditional probability', 'Inference from sample statistics and margin of error', 'Evaluating statistical claims: observational studies and experiments'],
        'Geometry and Trigonometry': ['Area and volume', 'Lines, angles, and triangles', 'Right triangles and trigonometry', 'Circles'],
    },
}

def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-')

def content_key(q):
    """Hash of the visible content, to catch the same question pasted into two tests."""
    parts = [str(q.get(k, '')) for k in ('passage', 'prompt')]
    parts += [str(c) for c in (q.get('choices') or [])]
    text = re.sub(r'\s+', ' ', ' '.join(parts)).strip().lower()
    return hashlib.sha1(text.encode()).hexdigest()

def main():
    catalog = json.load(open(os.path.join(ROOT, 'data', 'catalog.json')))
    tests = [t for t in catalog['tests'] if t.get('kind') != 'mini' and t['id'] != 'diagnostic-mini']

    by_skill = {}          # skill key (section|skill) -> [questions]
    seen_ids, seen_content = set(), {}
    dup_ids, dup_content, unknown_skill, bad_ids = [], [], [], []
    n_total = 0

    for meta in tests:
        data = json.load(open(os.path.join(ROOT, meta['file'])))
        for sec in data.get('sections', []):
            section = 'math' if sec.get('id') == 'math' else 'rw'
            modules = [sec.get('module1'), (sec.get('module2') or {}).get('easier'), (sec.get('module2') or {}).get('harder')]
            for mod in modules:
                for q in (mod or {}).get('questions', []):
                    qid = str(q.get('id', '')).strip()
                    if not re.match(r'^t\d+-', qid):
                        bad_ids.append((meta['id'], qid)); continue
                    if qid in seen_ids:
                        dup_ids.append(qid); continue
                    ck = content_key(q)
                    if ck in seen_content:
                        dup_content.append((qid, seen_content[ck])); continue
                    seen_ids.add(qid); seen_content[ck] = qid
                    skill = str(q.get('skill', '')).strip()
                    if skill not in TAXONOMY[section].get(q.get('domain', ''), []) and \
                       not any(skill in sk for sk in TAXONOMY[section].values()):
                        unknown_skill.append((qid, skill)); continue
                    qq = dict(q)
                    qq['section'] = section
                    by_skill.setdefault(section + '|' + skill, []).append(qq)
                    n_total += 1

    os.makedirs(OUT, exist_ok=True)
    index = {'built': time.strftime('%Y-%m-%d'), 'total': n_total, 'tests': len(tests), 'skills': []}
    for section in ('rw', 'math'):
        for domain, skills in TAXONOMY[section].items():
            for skill in skills:
                qs = by_skill.get(section + '|' + skill, [])
                sl = slug(skill)
                diff = {'easy': 0, 'medium': 0, 'hard': 0}
                for q in qs:
                    d = str(q.get('difficulty', 'medium')).lower()
                    d = {'e': 'easy', 'h': 'hard'}.get(d, d)
                    diff[d if d in diff else 'medium'] += 1
                index['skills'].append({'section': section, 'domain': domain, 'skill': skill,
                                        'slug': sl, 'n': len(qs), 'diff': diff,
                                        'ids': [q['id'] for q in qs]})
                if qs:
                    with open(os.path.join(OUT, sl + '.json'), 'w') as f:
                        json.dump({'skill': skill, 'section': section, 'questions': qs}, f, ensure_ascii=False, separators=(',', ':'))
    with open(os.path.join(OUT, 'index.json'), 'w') as f:
        json.dump(index, f, ensure_ascii=False, separators=(',', ':'))

    print(f'Question Bank: {n_total} questions from {len(tests)} tests -> data/bank/ ({sum(1 for s in index["skills"] if s["n"])} skill files)')
    rw = sum(s['n'] for s in index['skills'] if s['section'] == 'rw')
    print(f'  Reading & Writing {rw} · Math {n_total - rw}')
    if dup_ids: print(f'  WARNING {len(dup_ids)} duplicate ids skipped: {dup_ids[:5]}')
    if dup_content:
        print(f'  WARNING {len(dup_content)} questions with identical content skipped (kept the first):')
        for a, b in dup_content[:10]: print(f'    {a} = {b}')
    if unknown_skill: print(f'  WARNING {len(unknown_skill)} questions with a skill outside the taxonomy skipped: {unknown_skill[:5]}')
    if bad_ids: print(f'  WARNING {len(bad_ids)} questions with ids not matching tN-: {bad_ids[:5]}')
    return 0

if __name__ == '__main__':
    sys.exit(main())
