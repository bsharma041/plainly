// Round 1 spec (docs/review/round-1-spec.md): P0 rules R1–R8, noise removal,
// "Improve this sentence" composition and acceptance criteria A1–A10.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runChecks, applyFix, checkFix, sentenceGroups, composeSentence, applyFixes, RULE_INFO } from '../src/engine/index.js';
import { usageRules } from '../src/engine/rules/usage.js';
import { guardSuggestion, mergeSuggestions } from '../src/engine/index.js';
import { baseFromIng, pluralize } from '../src/engine/morph.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const GOA = fixture('goa-abstract.txt');
const CLEAN = fixture('clean-academic.txt');

const USAGE = new Set(['compound-subject', 'both-and', 'wordy-purpose', 'preposition', 'list-parallel', 'article-idiom', 'vague-phrase', 'nominalisation']);

const hits = (t, rule, opts) => runChecks(t, opts).filter((s) => s.rule === rule);
// Many spec examples are lowercase fragments: there the sentence-case card at offset 0 wins the
// overlap, so the rule's own (guarded) output is checked instead.
const ruleOnly = (t, opts = {}) => mergeSuggestions([usageRules(t, { categories: {}, goals: {}, ...opts }).map((s) => guardSuggestion(t, s))]);

/** The rule fires on `original` and offers exactly `fixes` (in order). */
function expect(t, rule, original, fixes, opts) {
  let s = hits(t, rule, opts).find((x) => x.original === original);
  if (!s && runChecks(t, opts).some((x) => x.rule === 'sentence-case' && x.start === 0)) s = ruleOnly(t, opts).find((x) => x.rule === rule && x.original === original);
  assert.ok(s, `expected ${rule} on "${original}" in: ${t}\n got: ${JSON.stringify(runChecks(t, opts).map((x) => [x.rule, x.original]))}`);
  assert.deepEqual(s.fixes.map((f) => f.text), fixes, `fixes for "${original}" in: ${t}`);
  return s;
}

/** Negative case: the target rule stays quiet, and no correctness card appears
 *  (sentence-case is ignored: many spec negatives are lowercase fragments). */
function quiet(t, rule, opts) {
  const all = runChecks(t, opts);
  assert.equal(all.filter((s) => s.rule === rule).length, 0, `${rule} should not fire on: ${t}`);
  const wrong = all.filter((s) => s.category === 'correctness' && s.rule !== 'sentence-case');
  assert.equal(wrong.length, 0, `unexpected correctness card on: ${t}: ${JSON.stringify(wrong.map((s) => [s.rule, s.original]))}`);
}

// ---------- morphology helpers ----------
test('baseFromIng and pluralize', () => {
  const table = { identifying: 'identify', reducing: 'reduce', planning: 'plan', improving: 'improve', making: 'make', assessing: 'assess', analysing: 'analyse', using: 'use', building: 'build', meeting: 'meet', getting: 'get', decarbonising: 'decarbonise', transforming: 'transform', offering: 'offer', visiting: 'visit', controlling: 'control', being: 'be' };
  for (const [ing, base] of Object.entries(table)) assert.equal(baseFromIng(ing), base, ing);
  const plurals = { approach: 'approaches', policy: 'policies', sector: 'sectors', route: 'routes', school: 'schools', analysis: 'analyses', criterion: 'criteria', person: 'people' };
  for (const [one, many] of Object.entries(plurals)) assert.equal(pluralize(one), many, one);
});

// ---------- R1 ----------
test('R1 compound-subject agreement: positives', () => {
  expect('The planning and implementation of this transition is particularly challenging for resource-constrained states.', 'compound-subject', 'is', ['are']);
  expect('The design and construction of the plant was delayed.', 'compound-subject', 'was', ['were']);
  expect('The cost and complexity of storage has risen.', 'compound-subject', 'has', ['have']);
  expect('In this context, the planning and implementation of the policy is difficult.', 'compound-subject', 'is', ['are']);
  expect('The planning and the implementation of the scheme remains slow.', 'compound-subject', 'remains', ['remain']);
});

test('R1 compound-subject agreement: negatives', () => {
  for (const t of [
    'The economic and social impact of the policy is large.',
    'The research and development budget is small.',
    'Research and development is a priority for the state.',
    'Each policy and programme is reviewed annually.',
    'The planning and design team is based in Panaji.',
    'The planning and implementation of this transition are particularly challenging.',
    'The analysis of planning and implementation is complex.',
    'The planning and implementation of the scheme, which is run by the state, are slow.',
    'The supply and demand of electricity is balanced hourly.',
  ]) quiet(t, 'compound-subject');
});

// ---------- R2 ----------
test('R2 both … and: positives', () => {
  expect('considering both a centralised and decentralised approach, for the state', 'both-and', 'both a centralised and decentralised approach',
    ['both centralised and decentralised approaches', 'both a centralised and a decentralised approach']);
  expect('The fund supports both an urban and rural school.', 'both-and', 'both an urban and rural school', ['both urban and rural schools', 'both an urban and a rural school']);
  expect('We tested both a short and long route.', 'both-and', 'both a short and long route', ['both short and long routes', 'both a short and a long route']);
});

test('R2 both … and: negatives', () => {
  for (const t of [
    'considering both centralised and decentralised approaches',
    'considering both a centralised and a decentralised approach',
    'She was both a mentor and friend.',
    'both a teacher and a parent',
    'both a cause and effect of growth',
    'both a public and private sector and a regulator',
  ]) quiet(t, 'both-and');
});

// ---------- R3 ----------
test('R3 wordy purpose: positives', () => {
  expect('The analysis is aimed at identifying a mix of technologies', 'wordy-purpose', 'is aimed at identifying', ['aims to identify']);
  expect('These measures are aimed at reducing losses.', 'wordy-purpose', 'are aimed at reducing', ['aim to reduce']);
  expect('The scheme was aimed at improving access.', 'wordy-purpose', 'was aimed at improving', ['aimed to improve']);
  expect('We changed the tariff with the aim of reducing demand.', 'wordy-purpose', 'with the aim of reducing', ['to reduce']);
  expect('in an effort to cut costs', 'wordy-purpose', 'in an effort to', ['to']);
});

test('R3 wordy purpose: negatives, and the passive rule stays off it (N5)', () => {
  for (const t of [
    'The campaign is aimed at young voters.',
    'a policy aimed at improving access',
    'The analysis aims to identify a mix of technologies.',
    'The gun was aimed at the target.',
  ]) quiet(t, 'wordy-purpose');
  assert.equal(hits('The analysis is aimed at identifying a mix of technologies.', 'passive').length, 0);
});

// ---------- R4 ----------
test('R4 prepositions: positives', () => {
  expect("suitable to Goa's geography", 'preposition', 'suitable to', ['suitable for', 'suited to']);
  expect('The plan comprises of three phases.', 'preposition', 'comprises of', ['comprises']);
  expect('We discussed about the tariff.', 'preposition', 'discussed about', ['discussed']);
  expect('The report emphasises on cost.', 'preposition', 'emphasises on', ['emphasises']);
  expect('The scheme is consistent to national policy.', 'preposition', 'consistent to', ['consistent with']);
  expect('The firm is capable to deliver it.', 'preposition', 'capable to', ['able to']);
  expect('The outage resulted into losses.', 'preposition', 'resulted into', ['resulted in']);
  expect('demand of electricity rose', 'preposition', 'demand of', ['demand for']);
});

test('R4 prepositions: negatives', () => {
  for (const t of [
    'The land is suitable for solar.',
    'The land is suitable to cultivate.',
    'the dependence of Goa on imports',
    'a request for funds',
    'the stress on the grid',
    'the demand of the users',
    'It contributes in many ways.',
    'return on investment',
    'The board discussed the tariff.',
  ]) quiet(t, 'preposition');
});

// ---------- R5 ----------
test('R5 list parallelism: positives', () => {
  expect("a mix of technologies that are financially feasible in terms of levelised cost, suitable to Goa's geography, and can support the state", 'list-parallel', 'can support', ['able to support', 'that can support']);
  expect('The tool is fast, accurate, and can handle large files.', 'list-parallel', 'can handle', ['able to handle']);
  expect('Options that are cheap, reliable and could scale quickly', 'list-parallel', 'could scale', ['that could scale']);
});

test('R5 list parallelism: negatives', () => {
  for (const t of [
    'The plan is cheap, simple, and it can be built quickly.',
    'The options are cheap and can be deployed fast.',
    'Solar is cheap, abundant and scalable.',
    'The technologies are feasible, suitable, and able to support the state.',
    'It is cheap, and we can build it.',
  ]) quiet(t, 'list-parallel');
});

// ---------- R6 ----------
test('R6 fixed article idioms: positives', () => {
  const t = 'with thermal power comprising a bulk (80 per cent) of the procured power';
  const s = expect(t, 'article-idiom', 'a', ['the']);
  assert.equal(applyFix(t, s.fixes[0]), 'with thermal power comprising the bulk (80 per cent) of the procured power');
  expect('a bulk of the funds', 'article-idiom', 'a bulk of', ['the bulk of']);
  expect('In a long run, costs fall.', 'article-idiom', 'In a long run', ['In the long run']);
  expect('the most of the states rely on imports', 'article-idiom', 'the most of the', ['most of the']);
});

test('R6 fixed article idioms: negatives', () => {
  for (const t of ['the bulk of the funds', 'We make the most of the sun.', 'a bulk carrier', 'in the long run', 'bulk purchases']) quiet(t, 'article-idiom');
});

// ---------- R7 ----------
test('R7 vague phrases', () => {
  const s = expect('financially feasible in terms of levelised cost', 'vague-phrase', 'in terms of', []);
  assert.equal(s.ruleName, 'Vague phrase');
  assert.equal(s.title, 'Vague phrase: "in terms of"');
  expect('with regard to tariffs', 'vague-phrase', 'with regard to', ['on', 'about']);
  for (const t of ['Output is measured in terms of energy delivered.', 'The sum is expressed in terms of x.', 'in the long term']) quiet(t, 'vague-phrase');
});

// ---------- R8 ----------
test('R8 nominalisation: positives', () => {
  expect('help other resource-constrained states plan the decarbonisation of their power sector.', 'nominalisation', 'the decarbonisation of', ['how to decarbonise']);
  expect('funds for the implementation of the plan', 'nominalisation', 'the implementation of', ['implementing']);
  // Round 2 (F7): "by" and ergative nouns like "reduction" are out of (a).
  expect('Delays in the implementation of the scheme raised costs.', 'nominalisation', 'the implementation of', ['implementing']);
});

test('R8 nominalisation: negatives', () => {
  for (const t of [
    'Decarbonisation of the Power sector in a resource-constrained geography',
    'The implementation of the plan was slow.',
    'for the rapid decarbonisation of the grid',
    'Keywords: Power sector decarbonisation',
    'an analysis of demand',
  ]) quiet(t, 'nominalisation');
});

// ---------- acceptance criteria ----------
const spanOf = (needle, from = 0) => {
  const start = GOA.indexOf(needle, from);
  assert.ok(start >= 0, needle);
  return { start, end: start + needle.length };
};
const overlapping = (list, span) => list.filter((s) => s.start < span.end && s.end > span.start && s.scope !== 'sentence');

test('A1: overlaps 8 of the 16 Grammarly spans with the exact first fix', () => {
  const all = runChecks(GOA);
  const first = (needle, from) => {
    const [s] = overlapping(all, spanOf(needle, from));
    assert.ok(s, `nothing on "${needle}"`);
    return s;
  };
  assert.equal(first('The planning and implementation of this transition is').fixes[0].text, 'are'); // #4
  assert.equal(first('a centralised').fixes[0].text, 'both centralised and decentralised approaches'); // #6
  assert.equal(first('approach,', GOA.indexOf('a centralised')).fixes[0].text, 'both centralised and decentralised approaches'); // #7
  assert.equal(first('is aimed at identifying').fixes[0].text, 'aims to identify'); // #10
  const vague = first('in terms of'); // #11
  assert.equal(vague.ruleName, 'Vague phrase');
  assert.equal(vague.fixes.length, 0);
  assert.equal(first('suitable to').fixes[0].text, 'suitable for'); // #12
  assert.equal(first('can support').fixes[0].text, 'able to support'); // #13
  assert.equal(first('the decarbonisation of').fixes[0].text, 'how to decarbonise'); // #15
});

test('A2: flags "a bulk" (beyond Grammarly)', () => {
  const [s] = overlapping(runChecks(GOA), spanOf('a bulk'));
  assert.equal(s.rule, 'article-idiom');
  assert.equal(s.fixes[0].text, 'the');
});

test('A3: no repetition noise, at most 14 cards', () => {
  const all = runChecks(GOA);
  assert.equal(all.filter((s) => s.rule === 'repetition').length, 0);
  assert.ok(all.length <= 14, `${all.length} cards`);
});

test('A4: zero suggestions on clean academic prose', () => {
  assert.deepEqual(runChecks(CLEAN).map((s) => [s.rule, s.original]), []);
  const goals = { formality: 'formal', confident: true };
  for (const audience of [{ longSentence: 30, plainWords: true }, { longSentence: 38, plainWords: false }]) {
    const opts = { domain: 'academic', goals, ...audience };
    assert.deepEqual(runChecks(CLEAN, opts).map((s) => [s.rule, s.original]), [], JSON.stringify(opts));
  }
});

test('A6: every usage fix passes the guard and none is dropped', () => {
  const SAMPLE = readFileSync(new URL('./guard.test.js', import.meta.url), 'utf8').match(/const SAMPLE = `([\s\S]*?)`;/)[1];
  const positives = [
    'The planning and implementation of this transition is particularly challenging for resource-constrained states.',
    'The design and construction of the plant was delayed.', 'The cost and complexity of storage has risen.',
    'The planning and the implementation of the scheme remains slow.',
    'considering both a centralised and decentralised approach, for the state', 'The fund supports both an urban and rural school.',
    'The analysis is aimed at identifying a mix of technologies', 'We changed the tariff with the aim of reducing demand.', 'in an effort to cut costs',
    "suitable to Goa's geography", 'The plan comprises of three phases.', 'The report emphasises on cost.', 'The firm is capable to deliver it.',
    'The outage resulted into losses.', 'demand of electricity rose', 'They insisted to deliver it.',
    'The tool is fast, accurate, and can handle large files.', 'Options that are cheap, reliable and could scale quickly',
    'a bulk of the funds', 'In a long run, costs fall.', 'the most of the states rely on imports', 'with regard to tariffs',
    'help other resource-constrained states plan the decarbonisation of their power sector.', 'funds for the implementation of the plan',
    'Delays in the implementation of the scheme raised costs.', 'We use a number of models.', 'This has the potential to cut costs.', 'We study it in the context of trade.',
    'It is clear that costs fell.',
  ];
  let checked = 0;
  for (const t of [GOA, CLEAN, SAMPLE, ...positives]) {
    for (const opts of [{}, { domain: 'academic', goals: { formality: 'formal' } }, { dialect: 'us' }]) {
      const raw = usageRules(t, { categories: {}, goals: {}, ...opts });
      for (const s of raw) for (const f of s.fixes) {
        const r = checkFix(t, f);
        assert.ok(r.ok, `${s.rule} fix "${f.text}" for "${s.original}" rejected: ${r.reason}`);
        checked++;
      }
      // Nothing silently dropped: the shown cards keep every fix the rule made.
      const shown = runChecks(t, opts);
      for (const s of raw) {
        const c = shown.find((x) => x.rule === s.rule && x.start === s.start && x.end === s.end);
        if (c) assert.equal(c.fixes.length, s.fixes.length, `${s.rule} on "${s.original}"`);
      }
    }
  }
  assert.ok(checked > 40, `only ${checked} fixes checked`);
});

test('A7: "Improve this sentence" composes the analysis sentence exactly, in any order', () => {
  const all = runChecks(GOA);
  const groups = sentenceGroups(GOA, all);
  const g = groups.find((x) => x.text.startsWith('The analysis is aimed at'));
  assert.ok(g, 'no group for the analysis sentence');
  const c = composeSentence(GOA, g);
  assert.equal(c.preview, "The analysis aims to identify a mix of technologies that are financially feasible in terms of levelised cost, suitable for Goa's geography, and able to support the state in reducing its reliance on thermal and outside-the-state procurement.");
  assert.equal(c.count, 3);
  assert.ok(c.ok, 'composed sentence fails the guard');
  assert.match(c.label, /^Built from 3 rule fixes in this sentence\. No new wording\.$/);
  assert.ok(g.tips.some((s) => s.rule === 'vague-phrase'), '"in terms of" listed as a tip');
  assert.ok(g.tips.some((s) => s.rule === 'long-sentence'), 'sentence-level card listed as an alternative');
  // The single edit gives the same document as the preview.
  const whole = GOA.slice(0, g.start) + c.preview + GOA.slice(g.end);
  assert.equal(applyFix(GOA, c.edit), whole);
  // Order independence: apply the fixes one at a time, in every order, shifting offsets.
  const fixes = g.items.map((i) => i.fix);
  const perms = (xs) => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));
  for (const order of perms(fixes)) {
    let text = GOA;
    const done = [];
    for (const f of order) {
      const shift = done.filter((d) => d.start < f.start).reduce((n, d) => n + d.text.length - (d.end - d.start), 0);
      text = applyFix(text, { ...f, start: f.start + shift, end: f.end + shift });
      done.push(f);
    }
    assert.equal(text, whole);
  }
  assert.equal(applyFixes(GOA, [...fixes].reverse()), whole);
  // Unticking a change rebuilds the preview without it.
  const without = composeSentence(GOA, g, (i) => i.suggestion.rule !== 'preposition');
  assert.match(without.preview, /suitable to Goa's/);
  assert.equal(without.count, 2);
});

test('A8: every P0 rule has a name, explanation and example', () => {
  for (const r of USAGE) {
    const info = RULE_INFO[r];
    assert.ok(info && info.name && info.explanation && info.example?.wrong && info.example?.right, r);
  }
  for (const s of runChecks(GOA)) assert.ok(s.ruleName && s.severity, s.rule);
});

test('A9: academic domain turns off repetition and plain-word', () => {
  const all = runChecks(GOA, { domain: 'academic' });
  assert.equal(all.filter((s) => s.rule === 'repetition' || s.rule === 'plain-word').length, 0);
  assert.equal(runChecks(GOA).filter((s) => s.rule === 'plain-word').length, 1, 'default still offers "shows"');
});

test('A10: 2,000 words stay fast (p95)', () => {
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
  assert.ok(p95 < 150, `p95 ${p95.toFixed(1)} ms`);
});

// ---------- noise (N1, N4) and one card per issue (U5) ----------
test('N1: repetition skips topic terms and gives one card per word per paragraph', () => {
  // 400 distinct filler words keep "increased" under the 1% topic-term threshold.
  const filler = Array.from({ length: 400 }, (_, i) => `w${'abcdefghij'[i % 10]}${'abcdefghij'[Math.floor(i / 10) % 10]}${'abcd'[Math.floor(i / 100)]}`.replace(/^w/, 'q')).join(' ');
  const t = `Wages have increased in most districts. Prices increased too. Rents increased as well. Costs increased again.\n${filler}.`;
  assert.equal(hits(t, 'repetition').length, 1);
  const term = 'The power sector is large. The power sector buys coal. Power prices rise with power demand.';
  assert.equal(hits(term, 'repetition').filter((s) => /power/i.test(s.original)).length, 0);
});

test('N4: the writer\'s own "ecosystem" is never flagged', () => {
  for (const opts of [{}, { domain: 'academic' }, { domain: 'technical' }, { goals: { formality: 'formal', confident: true } }]) {
    const at = GOA.indexOf('ecosystem');
    // Round 2: the serial-comma card spans "ecosystem and" to insert a comma; it doesn't flag the word.
    assert.equal(runChecks(GOA, opts).filter((s) => s.start <= at && s.end > at && s.scope !== 'sentence' && s.rule !== 'serial-comma').length, 0);
  }
});

test('U5: a word-level critical card beats an overlapping style card', async () => {
  const { mergeSuggestions } = await import('../src/engine/index.js');
  const crit = { rule: 'x', category: 'clarity', severity: 'critical', scope: 'word', start: 0, end: 5, original: 'abcde', fixes: [] };
  const style = { rule: 'y', category: 'correctness', severity: 'style', scope: 'word', start: 2, end: 8, original: 'cdefgh', fixes: [] };
  assert.deepEqual(mergeSuggestions([[style, crit]]).map((s) => s.rule), ['x']);
});

// ---------- implementer's extra false-positive guards (see docs/review/round-1-impl.md) ----------
test('extra negatives found while probing', () => {
  // "that" after "suggest" is a complementiser, not a relative: no "that will last".
  const s = hits('The results suggest that the plan is cheap, quick to build, and will last decades.', 'list-parallel')[0];
  assert.ok(!s || s.fixes.every((f) => !/^that /.test(f.text)));
  quiet('After the introduction of the tax, prices rose.', 'nominalisation'); // would dangle
  quiet('Students learn the development of language early.', 'nominalisation'); // "how to" changes meaning
  quiet('The result was consistent to within 2 per cent.', 'preposition');
  quiet('The impact over time was small.', 'preposition');
  quiet('The derivative with respect to x is zero.', 'vague-phrase');
  quiet('The cost and timing of the works, which is set by the board, are published.', 'compound-subject');
});

test('domain wiring keeps expert limits and the repetition toggle', () => {
  const long = `${'word '.repeat(34).trim()}.`;
  assert.equal(hits(long, 'long-sentence').length, 1);
  assert.equal(hits(long, 'long-sentence', { domain: 'academic' }).length, 0, 'academic limit is 38');
  const t = 'Wages have increased in most districts. Prices increased too. Rents increased as well.';
  assert.equal(hits(t, 'repetition', { repetition: false }).length, 0);
});
