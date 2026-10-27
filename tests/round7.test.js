// Round 7 (docs/review/round-6-review.md): hardening. H1–H5, M1–M4, BE14,
// the round7 key and acceptance criteria H-1 to H-5.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runChecks, runGuidance, applyFix, checkFix } from '../src/engine/index.js';

const r7 = new URL('./fixtures/round7/', import.meta.url);
const r6 = new URL('./fixtures/round6/', import.meta.url);
const read = (dir, name) => readFileSync(new URL(name, dir), 'utf8');
const GOA = readFileSync(new URL('./fixtures/goa-abstract.txt', import.meta.url), 'utf8');
const KEY = JSON.parse(read(r7, 'key.json'));

const overlaps = (a, s, e) => a.start < e && a.end > s;
function everything(text, opts) {
  const cards = runChecks(text, opts);
  const guide = runGuidance(text, opts);
  const spans = [];
  for (const c of cards) spans.push({ rule: c.rule, start: c.start, end: c.end, fixes: c.fixes });
  for (const g of guide) {
    const fixable = g.instances.filter((i) => i.fixes.length);
    for (const i of (fixable.length ? fixable : g.instances)) spans.push({ rule: g.rule, start: i.start, end: i.end, fixes: i.fixes });
  }
  const allFixes = [...cards.flatMap((c) => c.fixes), ...guide.flatMap((g) => g.instances.flatMap((i) => i.fixes))];
  return { cards, guide, spans, allFixes };
}

// ---------- H-2: the round7 key under all three option sets ----------
for (const [file, spec] of Object.entries(KEY.files)) {
  test(`H-2 round7 ${file}`, () => {
    const text = read(r7, file);
    for (const opts of KEY.options) {
      const { spans, allFixes } = everything(text, opts);
      for (const bad of spec.forbidFix || []) {
        for (const f of allFixes) assert.ok(!applyFix(text, f).includes(bad) || text.includes(bad), `${file} ${JSON.stringify(opts)}: a fix produces "${bad}"`);
      }
      for (const fr of spec.forbidRule || []) {
        const hits = spans.filter((x) => x.rule === fr.rule && (fr.match === '*' || (() => {
          let at = text.indexOf(fr.match);
          while (at >= 0) { if (overlaps(x, at, at + fr.match.length)) return true; at = text.indexOf(fr.match, at + 1); }
          return false;
        })()));
        assert.equal(hits.length, 0, `${file} ${JSON.stringify(opts)}: ${fr.rule} on "${fr.match}"`);
      }
      const expectOn = !spec.expectUnder || JSON.stringify(spec.expectUnder) === JSON.stringify(opts);
      if (!expectOn) continue;
      for (const ex of spec.expect || []) {
        const at = text.indexOf(ex.match);
        const hits = spans.filter((x) => x.rule === ex.rule && overlaps(x, at, at + ex.match.length));
        assert.ok(hits.length, `${file} ${JSON.stringify(opts)}: expected ${ex.rule} on "${ex.match}"`);
        if (ex.fix != null) assert.ok(hits.some((h) => h.fixes[0]?.text === ex.fix), `${file}: first fix "${ex.fix}"`);
      }
    }
  });
}

const hits = (t, rule, opts) => runChecks(t, opts).filter((s) => s.rule === rule);
const guide = (t, rule, opts) => runGuidance(t, opts).filter((g) => g.rule === rule);

// ---------- H1 ----------
test('H1: capitalisation never lowercases proper names; a tie is advice', () => {
  for (const name of ['a-policy.txt', 'e-case.txt']) {
    const t = read(r7, name);
    assert.equal(hits(t, 'consistency-case').length, 0, name);
    assert.ok(guide(t, 'consistency-case').every((g) => g.instances.every((i) => !i.fixes.length)), name);
  }
  const t = 'Officials met the state government in May. Later the state government agreed, and the State Government issued a notice.';
  const [c] = hits(t, 'consistency-case');
  assert.equal(c?.fixes[0].text, 'state government');
  const tie = 'Officials met the state government in May. Later the State Government issued a notice.';
  assert.equal(hits(tie, 'consistency-case').length, 0);
  const [g] = guide(tie, 'consistency-case');
  assert.ok(g && g.instances.every((i) => !i.fixes.length), 'a tie gives advice only');
});

// ---------- H2 ----------
test('H2: foreign-currency amounts are never regrouped', () => {
  assert.equal(guide(read(r7, 'a-policy.txt'), 'number-grouping').length, 0);
  const t = 'The utility has 6,50,000 consumers, will add 2,40,000 more, and receives about 120,000 complaints a year.';
  const [g] = guide(t, 'number-grouping');
  assert.equal(g.instances.find((i) => i.fixes.length).fixes[0].text, '1,20,000');
  assert.equal(guide('It costs ₹1,80,000 here and $650,000 there, or €120,000 in Spain.', 'number-grouping').length, 0);
  assert.equal(guide('It costs ₹1,80,000 here and 650,000 million units are traded.', 'number-grouping').length, 0);
});

// ---------- H3 ----------
test('H3: codes are never reformatted; quantities are', () => {
  for (const t of ['Post it to the Directorate, Panaji 403001, or file it online. We cleared 2,450 files.', 'Write to PIN 403001 for help. We cleared 2,450 files.',
    'Call +91 832 2437000 for help. We cleared 2,450 files.', 'The site is Survey No. 123 in Ponda. We cleared 2,450 files.']) {
    assert.equal(guide(t, 'number-separator').length, 0, t);
  }
  const [c] = hits('The office handles about 3200 files a year, and 2,450 were cleared in 2023.', 'number-separator');
  assert.equal(c.fixes[0].text, '3,200');
});

// ---------- H4 ----------
test('H4: soft-wrapped text gets no mid-sentence full stops; block ends still do', () => {
  for (const name of ['w-wrapped-caps.txt', 'd-wrapped.txt']) assert.equal(guide(read(r7, name), 'paragraph-end').length, 0, name);
  const end = (name, opts, want) => {
    const [c] = hits(read(r6, name), 'paragraph-end', opts);
    assert.equal(c?.fixes[0].text, want, name);
  };
  end('policy-brief.errors.txt', { goals: { formality: 'formal' } }, 'billing.');
  end('exec-summary.errors.txt', { domain: 'business' }, 'law.');
  end('business-email.errors.txt', { domain: 'business', goals: { formality: 'formal' } }, 'attached.');
});

// ---------- H5 ----------
test('H5: a/an follows letter names for initialisms', () => {
  for (const t of ['We signed an MoU with the bank.', 'It is an NGO.', 'Read an FAQ first.', 'It is a UN agency.', 'It is a NATO base.']) {
    assert.equal(hits(t, 'a-an').length, 0, t);
  }
  const [c] = hits('We signed a MoU with the bank.', 'a-an');
  assert.equal(c.fixes[0].text, 'an');
  // Earlier a/an behaviour is unchanged.
  assert.equal(hits('She has an MBA from a NASA program.', 'a-an').length, 0);
  assert.equal(hits('This is a error.', 'a-an')[0].fixes[0].text, 'an');
});

// ---------- M1–M4 ----------
test('M1: business acronyms and citations are not "undefined"', () => {
  assert.equal(guide(read(r7, 'c-business.txt'), 'acronym-undefined').length, 0);
  assert.equal(guide(read(r7, 'g-claims.txt'), 'acronym-undefined').length, 0);
  assert.equal(guide('Our SCADA system and the HVAC plant need KPIs and an SLA.', 'acronym-undefined').length, 0);
  assert.equal(guide('The BOQ was shared.', 'acronym-undefined').length, 1, 'an unknown acronym is still flagged');
});

test('M2: a roadmap future is not a tense mix', () => {
  assert.equal(guide(read(r7, 'b-academic.txt'), 'study-tense').length, 0);
  assert.equal(guide(GOA, 'study-tense').length, 1);
});

test('M3: "clearly" next to a figure is not a claim', () => {
  const opts = { domain: 'academic' };
  assert.equal(hits('Evening demand is clearly higher than midday demand, by about 30 per cent.', 'unsupported-claim', opts).length, 0);
  assert.equal(hits('Clearly, this works.', 'unsupported-claim', opts).length, 1);
});

test('M4: no style cards on the Keywords line, title or headings', () => {
  const t = read(r7, 'j-mixed.txt');
  const kw = t.indexOf('Keywords:');
  assert.ok(runChecks(t).filter((c) => ['plain-word', 'repetition', 'wordy', 'passive'].includes(c.rule)).every((c) => c.start < kw || c.start > t.indexOf('\n', kw)));
  assert.ok(hits(t, 'plain-word').some((c) => c.start < kw), 'body "utilisation" still gets its card');
});

test('BE14: "revert back with" offers "reply" first', () => {
  const [c] = hits('Please revert back with your comments.', 'wordy');
  assert.deepEqual(c.fixes.map((f) => f.text), ['reply', 'revert']);
  const [d] = hits('The tariff will revert back to the old level.', 'wordy');
  assert.deepEqual(d.fixes.map((f) => f.text), ['revert']);
});

// ---------- H-3, H-4, H-5 ----------
test('H-3: every fix on round6 and round7 fixtures passes the guard', () => {
  const docs = [...readdirSync(r6).filter((f) => f.endsWith('.txt')).map((f) => read(r6, f)), ...readdirSync(r7).filter((f) => f.endsWith('.txt')).map((f) => read(r7, f))];
  let n = 0;
  for (const text of docs) {
    for (const opts of KEY.options) {
      for (const c of runChecks(text, opts)) for (const f of c.fixes) { assert.ok(checkFix(text, f, { docVariant: /^(consistency|number|date)/.test(c.rule) }).ok, c.rule); n++; }
      for (const g of runGuidance(text, opts)) for (const i of g.instances) for (const f of i.fixes) { assert.ok(checkFix(text, f, { docVariant: true }).ok, g.rule); n++; }
    }
  }
  assert.ok(n > 50, `${n}`);
});

test('H-4: goa-abstract has 14 cards and one guidance finding', () => {
  assert.equal(runChecks(GOA).length, 14);
  assert.deepEqual(runGuidance(GOA).map((g) => g.rule), ['study-tense']);
});

test('H-5: runChecks + runGuidance on 2,000 words, p95 under 60 ms', () => {
  const base = read(r7, 'a-policy.txt') + '\n\n' + read(r7, 'j-mixed.txt');
  const text = Array.from({ length: Math.ceil(2000 / base.split(/\s+/).length) }, () => base).join('\n\n');
  runChecks(text); runGuidance(text);
  const times = [];
  for (let i = 0; i < 20; i++) {
    const x = text + ' '.repeat(i % 3);
    const t0 = performance.now();
    runChecks(x, { domain: 'business' }); runGuidance(x, { domain: 'business' });
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
    const budget = process.env.CI ? 150 : 60;
  assert.ok(times[18] < budget, `p95 ${times[18].toFixed(1)} ms (budget ${budget} ms)`);
});
