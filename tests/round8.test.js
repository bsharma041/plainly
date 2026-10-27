// Round 8 (docs/review/round-7-review.md): R8-1 to R8-4, ruling 1 negatives,
// the round8 key and acceptance criteria I-1 to I-5.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runChecks, runGuidance, applyFix, checkFix } from '../src/engine/index.js';

const dir = (r) => new URL(`./fixtures/${r}/`, import.meta.url);
const read = (r, name) => readFileSync(new URL(name, dir(r)), 'utf8');
const GOA = readFileSync(new URL('./fixtures/goa-abstract.txt', import.meta.url), 'utf8');
const KEY = JSON.parse(read('round8', 'key.json'));
const overlaps = (a, s, e) => a.start < e && a.end > s;

function everything(text, opts) {
  const cards = runChecks(text, opts);
  const guide = runGuidance(text, opts);
  const spans = cards.map((c) => ({ rule: c.rule, start: c.start, end: c.end, fixes: c.fixes }));
  for (const g of guide) {
    const fixable = g.instances.filter((i) => i.fixes.length);
    for (const i of (fixable.length ? fixable : g.instances)) spans.push({ rule: g.rule, start: i.start, end: i.end, fixes: i.fixes });
  }
  return { spans, allFixes: [...cards.flatMap((c) => c.fixes), ...guide.flatMap((g) => g.instances.flatMap((i) => i.fixes))] };
}

// ---------- I-2: the round8 key, 0 problems ----------
test('I-2 round8 key: 0 problems under all three option sets', () => {
  const problems = [];
  for (const [file, spec] of Object.entries(KEY.files)) {
    const text = read('round8', file);
    for (const opts of KEY.options) {
      const { spans, allFixes } = everything(text, opts);
      for (const bad of spec.forbidFix || []) {
        for (const f of allFixes) if (applyFix(text, f).includes(bad) && !text.includes(bad)) problems.push(`${file} ${JSON.stringify(opts)}: fix gives "${bad}"`);
      }
      for (const fr of spec.forbidRule || []) {
        for (const x of spans.filter((y) => y.rule === fr.rule)) {
          let hit = fr.match === '*';
          for (let at = text.indexOf(fr.match); !hit && at >= 0; at = text.indexOf(fr.match, at + 1)) hit = overlaps(x, at, at + fr.match.length);
          if (hit) problems.push(`${file} ${JSON.stringify(opts)}: ${fr.rule} on "${fr.match}"`);
        }
      }
    }
  }
  assert.deepEqual(problems, []);
});

const cards = (t, rule, opts) => runChecks(t, opts).filter((s) => s.rule === rule);
const guide = (t, rule, opts) => runGuidance(t, opts).filter((g) => g.rule === rule);

// ---------- R8-1 ----------
test('R8-1: a year starting a wrapped line is not a list item', () => {
  for (const f of ['p1-pdf.txt', 'p6-wrapped-years.txt']) {
    const t = read('round8', f);
    assert.equal(cards(t, 'paragraph-end').length + guide(t, 'paragraph-end').length, 0, f);
  }
  const list = 'Next steps\n\nThe report lists three steps for the department to take this year:\n1. Map roofs in every taluka.\n2. Offer loans to small consumers.';
  assert.equal(cards(list, 'paragraph-end').length, 0);
  const noStop = 'Next steps\n\nThe report lists three steps for the department to take this year:\n1. Map roofs in every taluka\n2. Offer loans to small consumers';
  assert.equal(cards(noStop, 'paragraph-end').length, 0, 'list items are never paragraphs');
  const end = (r, name, opts, want) => assert.equal(cards(read(r, name), 'paragraph-end', opts)[0]?.fixes[0].text, want, name);
  end('round6', 'policy-brief.errors.txt', { goals: { formality: 'formal' } }, 'billing.');
  end('round6', 'exec-summary.errors.txt', { domain: 'business' }, 'law.');
  end('round6', 'business-email.errors.txt', { domain: 'business', goals: { formality: 'formal' } }, 'attached.');
});

// ---------- R8-2 ----------
test('R8-2: percentage points and confidence intervals are not per cent variants', () => {
  assert.equal(guide(read('round8', 'p3-academic.txt'), 'consistency-percent').length, 0);
  assert.equal(guide('Uptake rose 9 percentage points; the response rate was 81 per cent.', 'consistency-percent').length, 0);
  assert.equal(guide('The 90th percentile is high; the response rate was 81 per cent.', 'consistency-percent').length, 0);
  assert.equal(guide('The effect was 3 points (95% CI: 1 to 5); the response rate was 81 per cent.', 'consistency-percent').length, 0);
  assert.equal(guide('The effect was 12 (p < 0.05, 5% level); the response rate was 81 per cent.', 'consistency-percent').length, 0);
  // Real variants still count.
  assert.equal(guide('Costs rose 4 per cent, then 20 percent, then 6 per cent.', 'consistency-percent').length, 1);
});

// ---------- R8-3, R8-4 ----------
test('R8-3: MU and other power units are not acronyms', () => {
  assert.equal(guide('The department purchased 4,672 MU and 2 BU over 120 ckm at 33 kVA.', 'acronym-undefined').length, 0);
});
test('R8-4: no repetition cards on per cent and crore', () => {
  const t = read('round8', 'p4-report.txt');
  assert.ok(cards(t, 'repetition').every((c) => !/^(cent|crore)$/i.test(c.original)));
});

// ---------- ruling 1 negatives ----------
test('Ruling 1: hyphenated names are never lowercased', () => {
  for (const t of ['India joined the Indo-Pacific Economic Framework in 2022. The indo-pacific trade has grown since then.',
    'The turbines come from Rolls-Royce plc in Derby. A rolls-royce engine powers the plant.']) {
    assert.equal(cards(t, 'consistency-case').length, 0, t);
    assert.ok(guide(t, 'consistency-case').every((g) => g.instances.every((i) => !i.fixes.length)), t);
  }
  // The safe tie case still gets its fix.
  const ok = 'We reformed the net-metering rules. Households now export under the Net-Metering rules at a fair price.';
  assert.equal(cards(ok, 'consistency-case')[0]?.fixes[0].text, 'net-metering');
});

// ---------- I-3, I-4, I-5 ----------
test('I-3: every fix on every fixture passes the guard', () => {
  const docs = [];
  for (const r of ['round6', 'round7', 'round8']) for (const f of readdirSync(dir(r)).filter((x) => x.endsWith('.txt'))) docs.push(read(r, f));
  for (const f of readdirSync(new URL('./fixtures/', import.meta.url)).filter((x) => x.endsWith('.txt'))) docs.push(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8'));
  let n = 0;
  for (const text of docs) {
    for (const opts of KEY.options) {
      for (const c of runChecks(text, opts)) for (const f of c.fixes) { assert.ok(checkFix(text, f, { docVariant: /^(consistency|number|date)/.test(c.rule) }).ok, c.rule); n++; }
      for (const g of runGuidance(text, opts)) for (const i of g.instances) for (const f of i.fixes) { assert.ok(checkFix(text, f, { docVariant: true }).ok, g.rule); n++; }
    }
  }
  assert.ok(n > 80, `${n}`);
});

test('I-4: goa-abstract has 14 cards with the same first fixes and one study-tense finding', () => {
  assert.deepEqual(runChecks(GOA).map((s) => [s.rule, s.fixes[0]?.text ?? null]), [
    ['title-case', 'power'], ['compound-subject', 'are'], ['plain-word', 'shows'], ['long-sentence', null], ['serial-comma', 'ecosystem, and'],
    ['article-idiom', 'the'], ['long-sentence', null], ['both-and', 'both centralised and decentralised approaches'], ['long-sentence', null],
    ['wordy-purpose', 'aims to identify'], ['vague-phrase', null], ['preposition', 'suitable for'], ['list-parallel', 'able to support'],
    ['nominalisation', 'how to decarbonise']]);
  assert.deepEqual(runGuidance(GOA).map((g) => g.rule), ['study-tense']);
});

test('I-5: checks + guidance on 2,000 words, p95 under 60 ms', () => {
  const base = ['p1-pdf.txt', 'p3-academic.txt', 'p4-report.txt'].map((f) => read('round8', f)).join('\n\n');
  const text = Array.from({ length: Math.ceil(2000 / base.split(/\s+/).length) }, () => base).join('\n\n');
  runChecks(text); runGuidance(text);
  const times = [];
  for (let i = 0; i < 20; i++) {
    const x = text + ' '.repeat(i % 3);
    const t0 = performance.now();
    runChecks(x, { domain: 'academic' }); runGuidance(x, { domain: 'academic' });
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const budget = process.env.CI ? 150 : 60;
  assert.ok(times[18] < budget, `p95 ${times[18].toFixed(1)} ms (budget ${budget} ms)`);
});
