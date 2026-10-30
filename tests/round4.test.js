// Round 4 (docs/review/round-3-review.md): F1–F5, ruling 1–2, stress-clean-3.txt, D1–D5.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runChecks, applyFix, checkFix } from '../src/engine/index.js';
import { isNeitherNorSwap } from '../src/engine/guard.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const GOA = fixture('goa-abstract.txt');
const STRESS3 = fixture('stress-clean-3.txt').split('\n').filter((l) => l.trim());

const hits = (t, rule, opts) => runChecks(t, opts).filter((s) => s.rule === rule);
const passiveFixes = (t, opts) => hits(t, 'passive', opts).flatMap((s) => s.fixes.map((f) => applyFix(t, f)));
const orAt = (t, nth = 0) => {
  let i = -1;
  for (let k = 0; k <= nth; k++) i = t.indexOf(' or ', i + 1);
  return { start: i + 1, end: i + 3, text: 'nor' };
};

// ---------- D3 ----------
const FORBIDDEN = ['income nor', 'solar nor', 'taxes nor', 'A team based wrote', 'A society registered manages', 'roads and maintained',
  'samples and analysed', 'shows the results in Table', 'Someone'];
for (const [label, opts] of [['default', {}], ['academic', { domain: 'academic' }]]) {
  test(`D3 stress-clean-3.txt, ${label}`, () => {
    assert.equal(STRESS3.length, 30);
    for (const line of STRESS3) {
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

// ---------- F1 ----------
test('F1: neither … or only within one clause, never after determiner "neither"', () => {
  for (const t of ['Neither the state or the centre has acted.', 'The proposal was neither approved or rejected.']) {
    const [s] = hits(t, 'correlative');
    assert.ok(s, t);
    assert.deepEqual(s.fixes.map((f) => f.text), ['nor']);
  }
  for (const t of ['Neither study controls for income or region.', 'Neither plan worked, so we tried solar or wind.',
    'Neither option is ideal, but solar or wind could work.', 'Neither firm reported profits; both cited taxes or duties.']) {
    assert.equal(hits(t, 'correlative').length, 0, t);
  }
  const g = 'Neither plan worked, so we tried solar or wind.';
  assert.equal(isNeitherNorSwap(g, orAt(g)), false);
});

test('D5: isNeitherNorSwap applies each of the rule\'s limits', () => {
  const ok = 'Neither the state or the centre has acted.';
  assert.equal(isNeitherNorSwap(ok, orAt(ok)), true);
  // (a) determiner use: bare noun after "neither"
  const det = 'Neither study controls for income or region.';
  assert.equal(isNeitherNorSwap(det, orAt(det)), false);
  // (b) punctuation breaks: comma, semicolon, colon, bracket, dash
  for (const t of ['Neither the state acted, or the centre.', 'Neither the state acted; or the centre.', 'Neither the state acted: or the centre.',
    'Neither the state (acted) or the centre.', 'Neither the state acted — or the centre.']) assert.equal(isNeitherNorSwap(t, orAt(t)), false, t);
  // (b) clause words
  for (const w of ['but', 'so', 'yet', 'and', 'because', 'while', 'although', 'which', 'that', 'who', 'whereas']) {
    const t = `Neither the state ${w} the city or the centre acted.`;
    assert.equal(isNeitherNorSwap(t, orAt(t)), false, w);
  }
  // (c) at most 8 words between
  const far = 'Neither the state government of the small coastal western region or the centre acted.';
  assert.equal(isNeitherNorSwap(far, orAt(far)), false);
  const near = 'Neither the state government of the region or the centre acted.';
  assert.equal(isNeitherNorSwap(near, orAt(near)), true);
  // Never without "neither", never after an existing "nor", never anything but "or" -> "nor".
  const plain = 'The state or the centre has acted.';
  assert.equal(checkFix(plain, orAt(plain)).ok, false);
  const nor = 'Neither the state nor the city or the centre acted.';
  assert.equal(isNeitherNorSwap(nor, orAt(nor)), false);
  assert.equal(checkFix(ok, { ...orAt(ok), text: 'nor not' }).ok, false);
  // The rule and the guard agree on every sentence here.
  for (const t of [ok, det, far, near, plain, nor, 'The proposal was neither approved or rejected.', 'Neither option is ideal, but solar or wind could work.']) {
    const ruled = hits(t, 'correlative').some((s) => s.original === 'or');
    const i = t.lastIndexOf(' or ') + 1;
    assert.equal(ruled, i > 0 && isNeitherNorSwap(t, { start: i, end: i + 2, text: 'nor' }), t);
  }
});

// ---------- F2 ----------
test('F2: the agent keeps its reduced relative clause, or no rewrite', () => {
  assert.deepEqual(passiveFixes('The report was written by a team based in Delhi.'), ['A team based in Delhi wrote the report.']);
  assert.deepEqual(passiveFixes('The scheme is managed by a society registered under the Societies Act.'), ['A society registered under the Societies Act manages the scheme.']);
  assert.deepEqual(passiveFixes('The plant is run by a company owned by the state.'), []);
  assert.deepEqual(passiveFixes('The data were checked by two analysts working independently.'), ['Two analysts working independently checked the data.']);
});

// ---------- F3 ----------
test('F3: coordinated participles share the object, or no rewrite', () => {
  assert.deepEqual(passiveFixes('The roads were built and maintained by the state.'), ['The state built and maintained the roads.']);
  assert.deepEqual(passiveFixes('The samples were collected and analysed.'), ['[who] collected and analysed the samples.']);
  assert.deepEqual(passiveFixes('The roads were built and the bridges were repaired.'), []);
  assert.deepEqual(passiveFixes('The plan has been drafted and approved by the board.'), ['The board has drafted and approved the plan.']);
  assert.deepEqual(passiveFixes('The data were collected, cleaned and analysed by the team.'), []);
});

// ---------- F4 ----------
test('F4: no template for presentation passives', () => {
  const [s] = hits('The results are shown in Table 3.', 'passive');
  assert.ok(s);
  assert.deepEqual(s.fixes, []);
  for (const t of ['The findings are summarised below.', 'The method is described in Section 2.', 'Details are given in the annex.']) {
    assert.ok(hits(t, 'passive').every((c) => !c.fixes.some((f) => f.template)), t);
  }
  assert.deepEqual(passiveFixes('The houses were built in 1990.'), ['[who] built the houses in 1990.']);
});

// ---------- F5 ----------
test('F5: trailing time adverbials stay at the end', () => {
  assert.deepEqual(passiveFixes('The tariff is set by the commission every year.'), ['The commission sets the tariff every year.']);
  assert.deepEqual(passiveFixes('Tariffs are revised by the commission annually.'), ['The commission revises tariffs annually.']);
});

// ---------- rulings ----------
test('Ruling 1: a plural N1 never triggers the verb-reading hyphen check', () => {
  assert.equal(hits('The two farmers owned land near the coast.', 'hyphenation').length, 0);
});

test('Ruling 2: a quoted "We" does not make the writer a we-writer', () => {
  const t = '"We will fix it," the minister said. The roads were repaired.';
  const [s] = hits(t, 'passive');
  assert.ok(s.fixes.every((f) => f.label !== 'Rewrite with "we" as the actor'));
  const u = 'We will fix it. The roads were repaired.';
  assert.equal(hits(u, 'passive')[0].fixes[0].label, 'Rewrite with "we" as the actor');
});

// ---------- D2 ----------
test('D2: goa-abstract has the same 14 cards and first fixes', () => {
  const all = runChecks(GOA);
  assert.deepEqual(all.map((s) => [s.rule, s.fixes[0]?.text ?? null]), [
    ['title-case', 'power'], ['compound-subject', 'are'], ['plain-word', 'shows'], ['long-sentence', '. Thermal power comprises'], ['serial-comma', 'ecosystem, and'], // round 9: ', with' split (round-8 backlog)
    ['article-idiom', 'the'], ['long-sentence', null], ['both-and', 'both centralised and decentralised approaches'], ['long-sentence', null],
    ['wordy-purpose', 'aims to identify'], ['vague-phrase', null], ['preposition', 'suitable for'], ['list-parallel', 'able to support'],
    ['nominalisation', 'how to decarbonise']]);
});
