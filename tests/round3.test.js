// Round 3 (docs/review/round-2-review.md): F1–F7, ruling P (agentless template),
// Q1/Q2, stress-clean-2.txt and acceptance criteria C1–C7.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runChecks, applyFix, checkFix, sentenceGroups, isBulkSafe } from '../src/engine/index.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const GOA = fixture('goa-abstract.txt');
const STRESS1 = fixture('stress-clean.txt').split('\n').filter((l) => l.trim());
const STRESS2 = fixture('stress-clean-2.txt').split('\n').filter((l) => l.trim());

const hits = (t, rule, opts) => runChecks(t, opts).filter((s) => s.rule === rule);
function expect(t, rule, original, fixes, opts) {
  const s = hits(t, rule, opts).find((x) => x.original === original);
  assert.ok(s, `expected ${rule} on "${original}" in: ${t}\n got: ${JSON.stringify(runChecks(t, opts).map((x) => [x.rule, x.original, x.fixes.map((f) => f.text)]))}`);
  assert.deepEqual(s.fixes.map((f) => f.text), fixes, t);
  return s;
}
const none = (t, rule, opts) => assert.equal(hits(t, rule, opts).length, 0, `${rule} on: ${t}`);

// ---------- C3: stress-clean-2.txt line by line ----------
const C3_RULES = new Set(['verb-pattern', 'hyphenation', 'one-of-plural', 'correlative', 'serial-comma']);
for (const [label, opts] of [['default', {}], ['academic', { domain: 'academic' }]]) {
  test(`C3 stress-clean-2.txt, ${label}`, () => {
    assert.equal(STRESS2.length, 32);
    for (const line of STRESS2) {
      for (const s of runChecks(line, opts)) {
        assert.ok(!C3_RULES.has(s.rule), `${s.rule} on: ${line}`);
        assert.notEqual(s.category, 'correctness', `correctness card ${s.rule} on: ${line}`);
      }
    }
  });
}

// ---------- findings ----------
test('F1: passive "be used to" + infinitive is left alone', () => {
  none('The funds are used to build schools.', 'verb-pattern');
  none('Diesel is used to generate backup power.', 'verb-pattern');
  expect('We got used to work late.', 'verb-pattern', 'work', ['working']);
  expect('They became used to pay more.', 'verb-pattern', 'pay', ['paying']);
});

test('F2: no hyphen when the head is the clause\'s verb', () => {
  for (const t of ['The community led protests against the plant.', 'The state owned land near the coast.', 'The state led reforms in 2005.', 'The utility funded projects in three districts.']) none(t, 'hyphenation');
  expect('The project led changes were welcome.', 'hyphenation', 'project led', ['project-led']);
  expect('Community led protests grew.', 'hyphenation', 'Community led', ['Community-led']);
  expect('Evidence based approaches work.', 'hyphenation', 'Evidence based', ['Evidence-based']);
});

test('F3: silent-e only for content words of 4+ letters', () => {
  assert.equal(checkFix('See the plan.', { start: 4, end: 7, text: 'thing' }).ok, false);
  assert.equal(checkFix('We raise it.', { start: 3, end: 8, text: 'raising' }).ok, true);
  assert.equal(checkFix('We are storing it.', { start: 7, end: 14, text: 'store' }).ok, true);
  assert.equal(checkFix('We use it.', { start: 3, end: 6, text: 'using' }).ok, true);
});

test('F5: an -s word ending its item is a noun', () => {
  expect('We study land, water, and labour. We then compare costs, risks and benefits.', 'serial-comma', 'risks and', ['risks, and']);
  none('Costs rose, prices fell and demand grew.', 'serial-comma');
});

test('F6: short-line runs are lists, not headings', () => {
  none('Shopping\nBread and Eggs\nMilk and Tea\nRice and Dal\n', 'title-case');
  none('Agenda for Monday\nBudget Review\nStaff Hiring\nAny other Business', 'title-case');
  // A set-off heading still counts.
  expect('Intro\n\nSolar Policy For Small States\n\nThis paper looks at solar policy in small states and what they can learn.', 'title-case', 'For', ['for']);
});

test('F7: "by"-agent passives with regular verbs rewrite again', () => {
  const t = 'The meeting was chaired by the secretary.';
  assert.equal(applyFix(t, hits(t, 'passive')[0].fixes[0]), 'The secretary chaired the meeting.');
  const u = 'The tariff is unaffected by the change.';
  assert.ok(hits(u, 'passive').every((s) => s.fixes.length === 0));
});

// ---------- ruling P: agentless template ----------
test('P: "[who]" template, selected, flagged, never first when "we" exists', () => {
  const t = 'Mistakes were made.';
  const [s] = hits(t, 'passive');
  const f = s.fixes.find((x) => x.template);
  assert.ok(f, 'template offered');
  assert.equal(applyFix(t, f), '[who] made mistakes.');
  assert.equal(f.template, true);
  assert.equal(f.label, 'Active-voice template: type who did it');
  assert.equal(f.preview.slice(f.select[0], f.select[1]), '[who]');
  assert.ok(checkFix(t, f).ok, 'template passes the guard');

  const we = 'We cleaned the data. The data were checked.';
  const [w] = hits(we, 'passive');
  assert.equal(w.fixes[0].label, 'Rewrite with "we" as the actor');
  assert.equal(applyFix(we, w.fixes[0]), 'We cleaned the data. We checked the data.');
  assert.equal(w.fixes[1].template, true);

  for (const x of ['The tariff is unaffected.', 'The results are unprecedented.']) {
    for (const c of runChecks(x)) assert.ok(!c.fixes.some((y) => y.template), x);
  }
  // Never in Accept all, never in "Improve this sentence".
  const doc = 'Mistakes were made in order to save time. i think so.';
  const all = runChecks(doc);
  for (const c of all) if (c.fixes.some((y) => y.template)) assert.equal(isBulkSafe(c), false);
  for (const g of sentenceGroups(doc, all)) for (const it of g.items) assert.ok(!it.fix.template);
  // Under academic: offered as a later option on a style card.
  const [a] = hits(t, 'passive', { domain: 'academic' });
  assert.equal(a.severity, 'style');
  assert.ok(a.fixes.some((x) => x.template));
  assert.match(a.message, /normal in academic writing/);
});

test('Q1: academic allows the named-agent rewrite at style severity', () => {
  const t = 'The data were collected by the team.';
  const [s] = hits(t, 'passive', { domain: 'academic' });
  assert.equal(s.severity, 'style');
  assert.equal(applyFix(t, s.fixes[0]), 'The team collected the data.');
});

test('Q2 / C5: the guard\'s neither…nor exception is narrow', () => {
  const t = 'Neither the state or the centre has acted.';
  const at = t.indexOf(' or ') + 1;
  assert.equal(checkFix(t, { start: at, end: at + 2, text: 'nor' }).ok, true);
  expect(t, 'correlative', 'or', ['nor']);
  const u = 'The state or the centre has acted.';
  const at2 = u.indexOf(' or ') + 1;
  assert.equal(checkFix(u, { start: at2, end: at2 + 2, text: 'nor' }).ok, false);
  // "nor" already between: no second one.
  const v = 'Neither the state nor the centre or the city acted.';
  const at3 = v.indexOf(' or ') + 1;
  assert.equal(checkFix(v, { start: at3, end: at3 + 2, text: 'nor' }).ok, false);
  // Other added negations still fail, even after "neither".
  assert.equal(checkFix(t, { start: at, end: at + 2, text: 'or not' }).ok, false);
  assert.equal(checkFix('Neither works. We approved it.', { start: 18, end: 26, text: 'did not approve' }).ok, false);
  assert.equal(checkFix('He was approved.', { start: 7, end: 15, text: 'never approved' }).ok, false);
});

// ---------- acceptance ----------
test('C2: goa-abstract has the same 14 cards and no passive card', () => {
  const all = runChecks(GOA);
  assert.equal(all.length, 14);
  assert.equal(all.filter((s) => s.rule === 'passive').length, 0);
  assert.deepEqual(all.map((s) => s.rule), ['title-case', 'compound-subject', 'plain-word', 'long-sentence', 'serial-comma', 'article-idiom',
    'long-sentence', 'both-and', 'long-sentence', 'wordy-purpose', 'vague-phrase', 'preposition', 'list-parallel', 'nominalisation']);
});

test('C4: agentless passive cards offer "we" or a "[who]" template, never "Someone"', () => {
  const sentences = [...STRESS1, ...STRESS2, 'Mistakes were made.', 'The proposal was rejected.', 'The survey was conducted in 12 districts.',
    'The budget will be approved next week.', 'The forms have been submitted.'];
  let templated = 0;
  for (const opts of [{}, { domain: 'academic' }]) {
    for (const line of sentences) {
      for (const s of hits(line, 'passive', opts)) {
        for (const f of s.fixes) {
          assert.ok(!/someone/i.test(f.preview || f.text), `Someone in ${line}`);
          if ((f.preview || f.text).includes('[who]')) assert.equal(f.template, true);
        }
        const agentless = !/\bby\s/i.test(line);
        if (agentless && s.fixes.length) {
          assert.ok(s.fixes.every((f) => f.template || f.label === 'Rewrite with "we" as the actor'), line);
          templated++;
        }
      }
    }
  }
  assert.ok(templated >= 8, `${templated}`);
  assert.equal(hits('The proposal was rejected.', 'passive')[0].fixes[0].text, '[who] rejected the proposal.');
});

test('C7: 2,000 words p95 under 50 ms', () => {
  const words = GOA.split(/\s+/).length;
  const text = Array.from({ length: Math.ceil(2000 / words) }, () => GOA).join('\n\n');
  runChecks(text);
  const times = [];
  for (let i = 0; i < 20; i++) {
    const t0 = performance.now();
    runChecks(text);
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  assert.ok(times[18] < 50, `p95 ${times[18].toFixed(1)} ms`);
});
