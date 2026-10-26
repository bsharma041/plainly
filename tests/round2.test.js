// Round 2 (docs/review/round-1-review.md): findings F1–F11, rulings Q1/Q4/Q5,
// P1 rules (R2b, R6b, R9, R10, R11, R12, R16, U3), the stress-clean fixture
// and acceptance criteria B1–B8.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  runChecks, applyFix, checkFix, sentenceGroups, composeSentence, RULE_INFO, overallScore, guardSuggestion, mergeSuggestions,
} from '../src/engine/index.js';
import { usageRules } from '../src/engine/rules/usage.js';
import { usageRules2 } from '../src/engine/rules/usage2.js';
import { passiveToActive } from '../src/engine/rewrite.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const GOA = fixture('goa-abstract.txt');
const CLEAN = fixture('clean-academic.txt');
const STRESS = fixture('stress-clean.txt').split('\n').filter((l) => l.trim());

const hits = (t, rule, opts) => runChecks(t, opts).filter((s) => s.rule === rule);
const rawRules = (t, opts = {}) => [...usageRules(t, { categories: {}, goals: {}, ...opts }), ...usageRules2(t, { categories: {}, goals: {}, ...opts })];
const ruleOnly = (t, opts = {}) => mergeSuggestions([rawRules(t, opts).map((s) => guardSuggestion(t, s))]);

function expect(t, rule, original, fixes, opts) {
  let s = hits(t, rule, opts).find((x) => x.original === original);
  if (!s && runChecks(t, opts).some((x) => x.rule === 'sentence-case' && x.start === 0)) s = ruleOnly(t, opts).find((x) => x.rule === rule && x.original === original);
  assert.ok(s, `expected ${rule} on "${original}" in: ${t}\n got: ${JSON.stringify(runChecks(t, opts).map((x) => [x.rule, x.original, x.fixes.map((f) => f.text)]))}`);
  assert.deepEqual(s.fixes.map((f) => f.text), fixes, `fixes for "${original}" in: ${t}`);
  return s;
}
function quiet(t, rule, opts) {
  const all = runChecks(t, opts);
  assert.equal(all.filter((s) => s.rule === rule).length, 0, `${rule} should not fire on: ${t}: ${JSON.stringify(all.filter((s) => s.rule === rule).map((s) => [s.original, s.fixes.map((f) => f.text)]))}`);
  const wrong = all.filter((s) => s.category === 'correctness' && s.rule !== 'sentence-case');
  assert.equal(wrong.length, 0, `unexpected correctness card on: ${t}: ${JSON.stringify(wrong.map((s) => [s.rule, s.original]))}`);
}

// ---------- B4: stress-clean.txt line by line ----------
const NO_CARD = new Set(['compound-subject', 'both-and', 'wordy-purpose', 'preposition', 'article-idiom', 'nominalisation']);
const ADVICE_ONLY = new Set(['list-parallel', 'vague-phrase', 'passive']);
const FORBIDDEN = ['Someone', 'unprecedents', 'unaffects', 'unmatches', 'able to rise', 'able to catch', 'able to vary', 'to respect to', 'In rising', 'demand for power plants'];

for (const [label, opts] of [['default', {}], ['academic', { domain: 'academic' }]]) {
  test(`B4 stress-clean.txt, ${label}: every line stays clean`, () => {
    assert.equal(STRESS.length, 46);
    for (const line of STRESS) {
      const all = runChecks(line, opts);
      for (const s of all) {
        assert.notEqual(s.category, 'correctness', `correctness card ${s.rule} on: ${line}`);
        assert.ok(!NO_CARD.has(s.rule), `${s.rule} on: ${line}`);
        if (ADVICE_ONLY.has(s.rule)) {
          // Round 3 (ruling P / C1): a passive card may carry the "we" rewrite or the flagged "[who]" template.
          const okPassive = s.rule === 'passive' && s.fixes.every((f) => f.label === 'Rewrite with "we" as the actor' || f.template === true);
          assert.ok(s.fixes.length === 0 || okPassive, `${s.rule} offers a fix on: ${line}: ${JSON.stringify(s.fixes.map((f) => f.text))}`);
        }
        for (const f of s.fixes) {
          const out = f.preview || f.text;
          for (const bad of FORBIDDEN) assert.ok(!out.includes(bad), `forbidden "${bad}" in fix for: ${line}`);
          if (out.includes('[who]')) assert.equal(f.template, true, `"[who]" outside a template on: ${line}`);
        }
      }
    }
  });
}

// ---------- findings ----------
test('F1: no passive rewrite for un-/mis- adjectives; plain passives still rewrite', () => {
  for (const t of ['The results are unprecedented.', 'The tariff is unaffected by the change.', 'His knowledge and experience of the sector are unmatched.', 'The emphasis on cost is misplaced.']) {
    for (const s of runChecks(t)) assert.equal(s.rule === 'passive' ? s.fixes.length : 0, 0, t);
    for (const o of passiveToActive(t)) assert.fail(`rewrite offered for ${t}: ${o.text}`);
  }
  const t = 'The report was written by the policy team.';
  assert.equal(applyFix(t, hits(t, 'passive')[0].fixes[0]), 'The policy team wrote the report.');
  // A real un- verb still rewrites.
  const u = 'The plan was undermined by the board.';
  assert.equal(applyFix(u, hits(u, 'passive')[0].fixes[0]), 'The board undermined the plan.');
});

test('F2 (as revised in round 3): academic passive is style, no "someone"; "we" first, then the template', () => {
  const t = 'Both centralised and decentralised options were tested.';
  const [s] = hits(t, 'passive', { domain: 'academic' });
  assert.equal(s.severity, 'style');
  assert.ok(s.fixes.every((f) => f.template === true));
  const we = 'We ran the model. We checked the data. The options were tested.';
  const [w] = hits(we, 'passive', { domain: 'academic' });
  assert.deepEqual(w.fixes.map((f) => f.label), ['Rewrite with "we" as the actor', 'Active-voice template: type who did it']);
});

test('F3: "similar with respect to" gives no card; "similar with ours" still fixed', () => {
  assert.equal(runChecks('The two plans are similar with respect to cost.').length, 0);
  expect('The two plans are similar with ours.', 'preposition', 'similar with', ['similar to']);
  assert.equal(runChecks('The figures are consistent with regard to timing.').filter((s) => s.rule !== 'sentence-case').length, 0);
});

test('F4: "able to" only for capability verbs', () => {
  expect('Solar is cheap, modular, and can scale quickly.', 'list-parallel', 'can scale', ['able to scale']);
  expect('Old cables are dangerous, unreliable, and can catch fire.', 'list-parallel', 'can catch', []);
  expect('Prices are unpredictable, seasonal, and can rise sharply.', 'list-parallel', 'can rise', []);
});

test('F5: "demand of" only before a bare listed noun', () => {
  expect('The demand of power is rising.', 'preposition', 'demand of', ['demand for']);
  quiet('The demand of power plants for coal is falling.', 'preposition');
  quiet('The demand of water utilities is high.', 'preposition');
});

test('F6: "in the context of" is advice only', () => {
  expect('In the context of rising demand, Goa must act.', 'vague-phrase', 'In the context of', []);
});

test('F7: R8(a) for/in only, no ergative nouns', () => {
  expect('We need funds for the implementation of the policy.', 'nominalisation', 'the implementation of', ['implementing']);
  expect('Delays in the implementation of the scheme raised costs.', 'nominalisation', 'the implementation of', ['implementing']);
  quiet('The book is about the development of the city.', 'nominalisation');
  quiet('Costs fell by the reduction of losses.', 'nominalisation');
  quiet('We set targets for the expansion of the port.', 'nominalisation');
  quiet('The report on the implementation of the scheme is due.', 'nominalisation');
  expect('Investors plan the expansion of the port.', 'nominalisation', 'the expansion of', ['how to expand']);
});

test('F8: "each" after a preposition is not the subject', () => {
  assert.equal(hits('The cost and timing of each are published in the annex.', 'agreement').length, 0);
  assert.equal(hits('The data for each are shown in Table 2.', 'agreement').length, 0);
  assert.equal(hits('Each of the states are different.', 'agreement').length, 1);
  assert.equal(hits('Each are different.', 'agreement').length, 1);
});

test('F9: more unit binomials', () => {
  quiet('The coming and going of staff is disruptive.', 'compound-subject');
  quiet('The ebb and flow of the tide is regular.', 'compound-subject');
  quiet('The rise and fall of prices is cyclical.', 'compound-subject');
});

test('F11: possessive determiners and more verbs', () => {
  expect('His knowledge and experience of the sector is unmatched.', 'compound-subject', 'is', ['are']);
  expect('The selection and training of staff takes time.', 'compound-subject', 'takes', ['take']);
  expect('Their design and testing of the tool shows promise.', 'compound-subject', 'shows', ['show']);
  quiet('His knowledge and experience of the sector are unmatched.', 'compound-subject');
  quiet('The selection and training of staff, which takes time, are costly.', 'compound-subject');
});

test('Q1: a composed preview with one outside word fails the guard', () => {
  const all = runChecks(GOA);
  const g = sentenceGroups(GOA, all).find((x) => x.text.startsWith('The analysis is aimed at'));
  const c = composeSentence(GOA, g);
  assert.ok(c.ok);
  const growth = g.items.reduce((n, i) => n + Math.max(0, i.fix.text.split(/\s+/).length - GOA.slice(i.fix.start, i.fix.end).split(/\s+/).length), 0);
  const tampered = c.preview.replace('a mix of', 'a giraffe mix of');
  const r = checkFix(GOA, { start: g.start, end: g.end, text: tampered }, { maxGrowth: growth + 1 });
  assert.equal(r.ok, false);
  assert.match(r.reason, /outside word "giraffe"/);
  // The raised limit never applies to deep-check fixes.
  assert.equal(checkFix('a b c d e', { start: 0, end: 9, text: 'a b c d e a b c d e' }, { remote: true, maxGrowth: 10 }).ok, false);
});

test('Q4: topic-term suppression only from 150 words', () => {
  const t = 'The report covers tariffs. The report was long, and the report had errors. We sent the report back.';
  assert.ok(hits(t, 'repetition').length >= 1);
  assert.equal(hits(GOA, 'repetition').length, 0);
});

// ---------- P1 rules ----------
test('R2b other correlatives', () => {
  // Round 3 (Q2): the guard's named neither…nor exception lets this fix through.
  expect('Neither the state or the centre pays.', 'correlative', 'or', ['nor']);
  expect('Either solar nor wind is enough.', 'correlative', 'nor', ['or']);
  expect('a choice between solar or wind', 'correlative', 'or', ['and']);
  expect('both solar as well as wind', 'correlative', 'as well as', ['and']);
  for (const t of ['Neither the state nor the centre pays.', 'between 2020 and 2030', 'Either solar or wind is enough.', 'Not only is it cheap, but it is also clean.']) quiet(t, 'correlative');
});

test('R6b one of the + singular', () => {
  expect('It is one of the most important factor.', 'one-of-plural', 'factor', ['factors']);
  expect('one of the main reason for delay', 'one-of-plural', 'reason', ['reasons']);
  for (const t of ['one of the main reasons', 'one of the research outputs', 'one of the best', 'one of the power stations']) quiet(t, 'one-of-plural');
});

test('R9 serial comma consistency', () => {
  const g = hits(GOA, 'serial-comma');
  assert.equal(g.length, 1);
  assert.equal(g[0].original, 'ecosystem and');
  assert.deepEqual(g[0].fixes.map((f) => f.text), ['ecosystem, and']);
  expect('We need land, water, and labour. We also need roads, ports and rail.', 'serial-comma', 'ports and', ['ports, and']);
  for (const t of ['In 2020, the state grew and prices fell.', 'Goa, for example, imports power, and its land is scarce.',
    'We need land, water, and labour. We need roads, ports, and rail.', 'We need land, water and labour. We need roads, ports and rail.']) quiet(t, 'serial-comma');
  assert.equal(hits(CLEAN, 'serial-comma').length, 0);
  // Setting overrides the majority.
  expect('We need land, water and labour.', 'serial-comma', 'water and', ['water, and'], { serialComma: 'always' });
  expect('We need land, water, and labour.', 'serial-comma', 'water, and', ['water and'], { serialComma: 'never' });
});

test('R10 title capitalisation', () => {
  const [p] = hits(GOA, 'title-case');
  assert.equal(p.original, 'Power');
  assert.equal(p.fixes[0].text, 'power');
  assert.equal(hits(GOA, 'title-case').length, 1);
  const t1 = 'Assessing The Grid Plan For Small States\n\nWe study grids.';
  assert.deepEqual(hits(t1, 'title-case').map((s) => [s.original, s.fixes[0].text]), [['The', 'the'], ['For', 'for']]);
  expect('Grid planning for small states and Island economies\n\nThe island has a grid.', 'title-case', 'Island', ['island']);
  for (const t of ['Decarbonisation of the power sector in a resource-constrained geography: Assessing the pathway for Goa\n\nGoa is small.',
    'Grid Planning in Goa\n\nWe plan grids in Goa.', 'Keywords: Power sector decarbonisation, renewable potential',
    'Renewable Energy Policy in India\n\nIndia has renewable energy.', 'Solar Policy in small States\n\nThe states are small.']) quiet(t, 'title-case');
});

test('R11 hyphenation', () => {
  expect('Many resource constrained states struggle.', 'hyphenation', 'resource constrained', ['resource-constrained']);
  expect('We signed long term contracts.', 'hyphenation', 'long term', ['long-term']);
  expect('We need evidence based policy.', 'hyphenation', 'evidence based', ['evidence-based']);
  expect('We set a net zero target.', 'hyphenation', 'net zero', ['net-zero']);
  expect('We have a highly-skilled workforce.', 'hyphenation', 'highly-skilled', ['highly skilled']);
  expect('It is an environmentally-sensitive coast.', 'hyphenation', 'environmentally-sensitive', ['environmentally sensitive']);
  for (const t of ['In the long term, costs fall.', 'Costs fall over the long term.', 'We build on a large scale.', 'The states are resource constrained.',
    'It is a family-owned firm.', 'It is an early-stage project.', 'We need a climate change policy.', 'We met renewable energy targets.',
    'India aims for net zero by 2070.', 'The long term looks bright.']) quiet(t, 'hyphenation');
  assert.equal(hits(GOA, 'hyphenation').length, 0);
});

test('R12 gerund vs infinitive', () => {
  expect('We avoid to use diesel.', 'verb-pattern', 'avoid to use', ['avoid using']);
  expect('They avoided to raise tariffs.', 'verb-pattern', 'avoided to raise', ['avoided raising']);
  expect('We look forward to hear from you.', 'verb-pattern', 'hear', ['hearing']);
  expect('The state is committed to reduce emissions.', 'verb-pattern', 'reduce', ['reducing']);
  expect('the ability of storing energy is key', 'verb-pattern', 'ability of storing', ['ability to store']);
  for (const t of ['It is considered to be safe.', 'We suggest to the board that it acts.', 'This contributes to growth.', 'I used to live there.',
    'They decided funding was short.', 'the planning of the grid is slow', 'We keep to the schedule.']) quiet(t, 'verb-pattern');
});

test('R16 redundancy list', () => {
  const pairs = [['Past experience shows this.', 'Past experience', 'Experience'], ['The future prospects are good.', 'future prospects', 'prospects'],
    ['We value mutual cooperation.', 'mutual cooperation', 'cooperation'], ['It is the exact same plan.', 'exact same', 'same'],
    ['We will combine together the files.', 'combine together', 'combine'], ['The problem still remains.', 'still remains', 'remains'],
    ['The reason is because costs rose.', 'reason is because', 'reason is that'], ['There is general consensus.', 'general consensus', 'consensus'],
    ['It lasted a short period of time.', 'period of time', 'period'], ['We met in the year 2020.', 'in the year', 'in']];
  for (const [t, orig, fix] of pairs) expect(t, 'redundancy', orig, [fix]);
  for (const t of ['The past experiences of reform vary.', 'The prospects are good.', 'We met in the year that followed.', 'The time period was short.']) quiet(t, 'redundancy');
});

test('U3: severity weights and advice-only style tips cost nothing', () => {
  const t = 'Some clean words here for the score test to use as a base text.';
  const card = (severity, fixes = [{ text: 'x', start: 0, end: 1 }]) => ({ rule: 'x', category: 'clarity', severity, fixes, start: 0, end: 1, original: 'S' });
  assert.equal(overallScore(t, [card('style', [])]), 100);
  const crit = overallScore(t, [card('critical')]);
  const adv = overallScore(t, [card('advanced')]);
  const sty = overallScore(t, [card('style')]);
  assert.ok(crit < adv && adv < sty && sty < 100, `${crit} ${adv} ${sty}`);
});

// ---------- acceptance criteria ----------
test('B2: goa-abstract keeps round-1 cards and adds R10 and R9; at most 14', () => {
  const all = runChecks(GOA);
  const got = all.map((s) => `${s.rule}|${s.original.slice(0, 30)}|${s.fixes[0]?.text ?? ''}`);
  for (const want of ['compound-subject|is|are', 'article-idiom|a|the', 'both-and|both a centralised and decentr|both centralised and decentralised approaches',
    'wordy-purpose|is aimed at identifying|aims to identify', 'vague-phrase|in terms of|', 'preposition|suitable to|suitable for',
    'list-parallel|can support|able to support', 'nominalisation|the decarbonisation of|how to decarbonise', 'plain-word|demonstrates|shows',
    'title-case|Power|power', 'serial-comma|ecosystem and|ecosystem, and']) assert.ok(got.includes(want), `missing ${want}\n${got.join('\n')}`);
  assert.equal(all.filter((s) => s.rule === 'long-sentence').length, 3);
  assert.ok(all.length <= 14, `${all.length} cards`);
  // With R9's comma ticked, the U1 preview of the 52-word sentence matches the spec.
  const g = sentenceGroups(GOA, all).find((x) => x.text.startsWith('With limited land'));
  const c = composeSentence(GOA, g, () => true);
  assert.equal(c.preview, 'With limited land resources, an environmentally sensitive ecosystem, and inconsistent wind resources throughout the year, Goa has traditionally relied on other states and central thermal power stations to meet around 75 per cent of its electricity demand, with thermal power comprising the bulk (80 per cent) of the procured power.');
});

test('B3: clean-academic still gives 0 under all option sets', () => {
  for (const opts of [{}, { domain: 'academic' }, { domain: 'academic', goals: { formality: 'formal', confident: true } },
    { domain: 'academic', goals: { formality: 'formal', confident: true }, longSentence: 38, plainWords: false }, { domain: 'technical' }]) {
    assert.deepEqual(runChecks(CLEAN, opts).map((s) => [s.rule, s.original]), [], JSON.stringify(opts));
  }
});

test('B6: every fix on goa, clean, stress and positives passes the guard', () => {
  const positives = ['Either solar nor wind is enough.', 'a choice between solar or wind', 'both solar as well as wind', 'It is one of the most important factor.',
    'We need land, water, and labour. We also need roads, ports and rail.', 'Assessing The Grid Plan For Small States\n\nWe study grids.',
    'Many resource constrained states struggle.', 'We signed long term contracts.', 'We have a highly-skilled workforce.', 'We set a net zero target.',
    'We avoid to use diesel.', 'They avoided to raise tariffs.', 'We look forward to hear from you.', 'the ability of storing energy is key',
    'Past experience shows this.', 'The reason is because costs rose.', 'We met in the year 2020.', 'The selection and training of staff takes time.',
    'Solar is cheap, modular, and can scale quickly.', 'The demand of power is rising.', 'Investors plan the expansion of the port.'];
  let n = 0;
  for (const t of [GOA, CLEAN, ...STRESS, ...positives]) {
    for (const opts of [{}, { domain: 'academic' }, { serialComma: 'always' }, { serialComma: 'never' }]) {
      for (const s of rawRules(t, opts)) for (const f of s.fixes) {
        const r = checkFix(t, f);
        assert.ok(r.ok, `${s.rule} fix "${f.text}" for "${s.original}" rejected: ${r.reason}`);
        n++;
      }
      for (const s of runChecks(t, opts)) for (const f of s.fixes) assert.ok(checkFix(t, f).ok, `${s.rule}: ${f.text}`);
    }
  }
  assert.ok(n > 40, `${n}`);
});

test('B7: rule-info for the round-2 rules', () => {
  for (const r of ['correlative', 'one-of-plural', 'serial-comma', 'title-case', 'hyphenation', 'verb-pattern', 'redundancy']) {
    const i = RULE_INFO[r];
    assert.ok(i && i.name && i.explanation && i.example?.wrong && i.example?.right, r);
  }
});

test('B8: 2,000 words p95 under 50 ms', () => {
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
  const p95 = times[Math.floor(times.length * 0.95) - 1];
  assert.ok(p95 < 50, `p95 ${p95.toFixed(1)} ms`);
});
