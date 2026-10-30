// Round 5 (docs/review/round-4-review.md): G1, G2, the heading-line check for R2b,
// stress-clean-4.txt and acceptance criteria E1–E5.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runChecks, applyFix } from '../src/engine/index.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const GOA = fixture('goa-abstract.txt');
const CLEAN = fixture('clean-academic.txt');
const lines = (name) => fixture(name).split('\n').filter((l) => l.trim());
const STRESS4 = lines('stress-clean-4.txt');

const hits = (t, rule, opts) => runChecks(t, opts).filter((s) => s.rule === rule);
const passiveFixes = (t, opts) => hits(t, 'passive', opts).flatMap((s) => s.fixes.map((f) => applyFix(t, f)));

// ---------- E3 ----------
const FORBIDDEN = ['one and two', 'two and three', 'with links to the state.', 'the loan from Mumbai', 'the cables from Pune', 'Someone'];
for (const [label, opts] of [['default', {}], ['academic', { domain: 'academic' }]]) {
  test(`E3 stress-clean-4.txt, ${label}`, () => {
    assert.equal(STRESS4.length, 20);
    for (const line of STRESS4) {
      for (const s of runChecks(line, opts)) {
        assert.notEqual(s.rule, 'correlative', `correlative on: ${line}`);
        assert.notEqual(s.category, 'correctness', `correctness card ${s.rule} on: ${line}`);
        for (const f of s.fixes) {
          const out = f.preview || f.text;
          for (const bad of FORBIDDEN) assert.ok(!out.includes(bad), `forbidden "${bad}" in a fix for: ${line}`);
          if (out.includes('[who]')) assert.equal(f.template, true);
        }
      }
    }
  });
}

test('E3: the earlier stress fixtures still have no correctness card', () => {
  for (const name of ['stress-clean.txt', 'stress-clean-2.txt', 'stress-clean-3.txt']) {
    for (const opts of [{}, { domain: 'academic' }]) {
      for (const line of lines(name)) {
        for (const s of runChecks(line, opts)) {
          assert.notEqual(s.category, 'correctness', `${name}: ${s.rule} on: ${line}`);
          for (const f of s.fixes) assert.ok(!/Someone/.test(f.preview || f.text), line);
        }
      }
    }
  }
});

// ---------- G1 ----------
test('G1: "between N or M" is an approximate number, not a choice', () => {
  assert.equal(hits('Each team picks between one or two projects.', 'correlative').length, 0);
  assert.equal(hits('The panel could not decide between two or three options.', 'correlative').length, 0);
  assert.equal(hits('Losses fell to between 10 or 12 per cent.', 'correlative').length, 0);
  assert.equal(hits('They chose between a few or several sites.', 'correlative').length, 0);
  const [s] = hits('We face a choice between solar or wind.', 'correlative');
  assert.deepEqual(s.fixes.map((f) => f.text), ['and']);
});

// ---------- G2 ----------
test('G2: a from/with phrase after the agent is never moved; refuse instead', () => {
  for (const t of ['The study was funded by a trust with links to the state.', 'The loan was given by a bank from Mumbai.',
    'The cables were laid by a firm from Pune.', 'The data were downloaded by staff from the website.',
    'The plan was opposed by groups without funding.']) {
    assert.deepEqual(passiveFixes(t), [], t);
  }
  assert.deepEqual(passiveFixes('The road was built by a contractor in 2010.'), ['A contractor built the road in 2010.']);
  assert.deepEqual(passiveFixes('The report was written by a team based in Delhi.'), ['A team based in Delhi wrote the report.']);
  assert.deepEqual(passiveFixes('The tariff is set by the commission every year.'), ['The commission sets the tariff every year.']);
  // "near" and "of" are not cut points, so the phrase stays attached to the agent.
  assert.deepEqual(passiveFixes('The site was chosen by a firm near the coast.'), ['A firm near the coast chose the site.']);
  assert.deepEqual(passiveFixes('The report was written by the Bank of India.'), ['The Bank of India wrote the report.']);
});

// ---------- heading line ----------
test('R2b never fires on a heading line', () => {
  const t = 'Neither Study A or Study B\n\nThis paper compares two studies of tariffs in small states and what they found.';
  assert.equal(hits(t, 'correlative').length, 0);
  assert.equal(hits(t, 'title-case').length, 0, 'a single capital is a label, not the article');
  // The same words in a sentence are still fixed.
  const u = 'Neither Study A or Study B found an effect.';
  assert.deepEqual(hits(u, 'correlative')[0].fixes.map((f) => f.text), ['nor']);
});

// ---------- E2, E5 ----------
test('E2: goa-abstract has the same 14 cards and first fixes; clean-academic 0', () => {
  assert.deepEqual(runChecks(GOA).map((s) => [s.rule, s.fixes[0]?.text ?? null]), [
    ['title-case', 'power'], ['compound-subject', 'are'], ['plain-word', 'shows'], ['long-sentence', '. Thermal power comprises'], ['serial-comma', 'ecosystem, and'], // round 9: ', with' split (round-8 backlog)
    ['article-idiom', 'the'], ['long-sentence', null], ['both-and', 'both centralised and decentralised approaches'], ['long-sentence', null],
    ['wordy-purpose', 'aims to identify'], ['vague-phrase', null], ['preposition', 'suitable for'], ['list-parallel', 'able to support'],
    ['nominalisation', 'how to decarbonise']]);
  assert.equal(runChecks(CLEAN).length, 0);
  assert.equal(runChecks(CLEAN, { domain: 'academic', goals: { formality: 'formal', confident: true } }).length, 0);
});

test('E5: 2,000 words p95 under 50 ms', () => {
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
