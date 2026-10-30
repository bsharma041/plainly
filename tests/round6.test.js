// Round 6 (docs/review/round-6-spec.md): deeper proofing (B1–B4), document guidance
// (D1–D6, D8a), N6/N7, the docVariant guard, "Make consistent", and F1–F9.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runChecks, runGuidance, applyFix, checkFix, composeFixes, RULE_INFO } from '../src/engine/index.js';

const dir = new URL('./fixtures/round6/', import.meta.url);
const read = (name) => readFileSync(new URL(name, dir), 'utf8');
const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const GOA = fixture('goa-abstract.txt');
const CLEAN = fixture('clean-academic.txt');
const KEYS = readdirSync(dir).filter((f) => f.endsWith('.key.json')).map((f) => JSON.parse(read(f)));

// P1 key entries built this round (round-6-impl.md, F10). BE15 is not: see the notes (it merges with BE14's card).
const BUILT_P1 = new Set(['BE5', 'BE6', 'BE9', 'BE10', 'BE12', 'BE13', 'BE14', 'BE16']); // round 7: BE15 merged into BE14 (ruling Q1)

const nth = (text, match, n) => {
  let at = -1;
  for (let k = 0; k < n; k++) { at = text.indexOf(match, at + 1); if (at < 0) return -1; }
  return at;
};
const overlaps = (a, s, e) => a.start < e && a.end > s;

/** Every flagged span with its rule: cards, plus guidance instances (fixable ones, or all of them for advice). */
function flagged(text, opts) {
  const out = [];
  for (const c of runChecks(text, opts)) out.push({ rule: c.rule, category: c.category, start: c.start, end: c.end, fixes: c.fixes, src: 'card' });
  for (const g of runGuidance(text, opts)) {
    const fixable = g.instances.filter((i) => i.fixes.length);
    for (const i of (fixable.length ? fixable : g.instances)) out.push({ rule: g.rule, category: g.category, start: i.start, end: i.end, fixes: i.fixes, src: 'guidance' });
  }
  return out;
}
const fixMatches = (text, f, key, occ) => f.text === key.fix
  || applyFix(text, f).slice(occ, occ + key.match.length + 20).includes(key.fix);
const ruleMatches = (pattern, rule) => pattern === '*' || pattern === rule || (pattern.endsWith('*') && rule.startsWith(pattern.slice(0, -1)));

// ---------- F2 / F3: key-driven recall and precision ----------
for (const key of KEYS) {
  test(`F2/F3 ${key.doc}: every P0 and existing mustFlag entry, no mustNotFlag, no stray correctness card`, () => {
    const text = read(key.doc);
    const all = flagged(text, key.options);
    for (const e of key.mustFlag) {
      if (e.priority === 'P1' && !BUILT_P1.has(e.id)) continue;
      const occ = nth(text, e.match, e.occurrence);
      assert.ok(occ >= 0, `${e.id}: "${e.match}" #${e.occurrence} not in the document`);
      const hits = all.filter((x) => x.rule === e.rule && overlaps(x, occ, occ + e.match.length));
      assert.ok(hits.length, `${e.id}: no ${e.rule} on "${e.match}"`);
      if (e.fix != null) {
        assert.ok(hits.some((h) => h.fixes[0] && fixMatches(text, h.fixes[0], e, occ)),
          `${e.id}: first fix should give "${e.fix}", got ${JSON.stringify(hits.map((h) => h.fixes[0]?.text))}`);
      }
    }
    for (const n of key.mustNotFlag) {
      let occ = text.indexOf(n.match);
      while (occ >= 0) {
        const bad = all.filter((x) => ruleMatches(n.rule, x.rule) && overlaps(x, occ, occ + n.match.length));
        assert.equal(bad.length, 0, `mustNotFlag "${n.match}" (${n.why}): ${JSON.stringify(bad.map((b) => b.rule))}`);
        occ = text.indexOf(n.match, occ + 1);
      }
    }
    const keySpans = key.mustFlag.map((e) => { const o = nth(text, e.match, e.occurrence); return { start: o, end: o + e.match.length }; });
    for (const c of runChecks(text, key.options).filter((x) => x.category === 'correctness')) {
      assert.ok(keySpans.some((k) => overlaps(c, k.start, k.end)), `stray correctness card ${c.rule} on "${c.original}"`);
    }
  });
  const p1 = key.mustFlag.filter((e) => e.priority === 'P1' && !BUILT_P1.has(e.id));
  if (p1.length) test.todo(`F10 ${key.doc}: P1 entries ${p1.map((e) => e.id).join(', ')} (not built this round)`);
}

// ---------- F4: clean documents are silent ----------
test('F4: clean fixtures give 0 correctness cards and 0 guidance findings', () => {
  for (const key of KEYS) {
    const text = read(key.clean);
    for (const opts of [key.options, {}]) {
      assert.deepEqual(runChecks(text, opts).filter((c) => c.category === 'correctness').map((c) => [c.rule, c.original]), [], `${key.clean} ${JSON.stringify(opts)}`);
      assert.deepEqual(runGuidance(text, opts).map((g) => [g.rule, g.original]), [], `${key.clean} ${JSON.stringify(opts)}`);
      for (const c of runChecks(text, opts)) assert.equal(c.fixes.length, 0, `${key.clean}: ${c.rule} offers a fix`);
    }
  }
  for (const opts of [{}, { domain: 'academic' }, { domain: 'academic', goals: { formality: 'formal', confident: true } }]) {
    assert.equal(runChecks(CLEAN, opts).length, 0);
    assert.equal(runGuidance(CLEAN, opts).length, 0);
  }
});

// ---------- F5: goa-abstract guidance ----------
test('F5: goa-abstract gets exactly one guidance finding, study-tense', () => {
  for (const opts of [{}, { domain: 'academic' }]) {
    const g = runGuidance(GOA, opts);
    assert.deepEqual(g.map((f) => f.rule), ['study-tense']);
    assert.deepEqual(g[0].instances.map((i) => i.original).sort(), ['examines', 'is aimed', 'will also help', 'will use']);
    assert.equal(runChecks(GOA, opts).filter((c) => c.rule === 'unsupported-claim').length, 0);
  }
});

// ---------- F1: no regressions on the abstract ----------
test('F1: goa-abstract inline cards unchanged', () => {
  assert.deepEqual(runChecks(GOA).map((s) => [s.rule, s.fixes[0]?.text ?? null]), [
    ['title-case', 'power'], ['compound-subject', 'are'], ['plain-word', 'shows'], ['long-sentence', '. Thermal power comprises'], ['serial-comma', 'ecosystem, and'], // round 9: ', with' split (round-8 backlog)
    ['article-idiom', 'the'], ['long-sentence', null], ['both-and', 'both centralised and decentralised approaches'], ['long-sentence', null],
    ['wordy-purpose', 'aims to identify'], ['vague-phrase', null], ['preposition', 'suitable for'], ['list-parallel', 'able to support'],
    ['nominalisation', 'how to decarbonise']]);
});

// ---------- F6: unit tests from §3 ----------
const hits = (t, rule, opts) => runChecks(t, opts).filter((s) => s.rule === rule);
const guide = (t, rule, opts) => runGuidance(t, opts).filter((s) => s.rule === rule);
function expect(t, rule, original, fix, opts) {
  const s = hits(t, rule, opts).find((x) => x.original === original);
  assert.ok(s, `expected ${rule} on "${original}" in: ${t}\n got ${JSON.stringify(runChecks(t, opts).map((x) => [x.rule, x.original]))}`);
  assert.equal(s.fixes[0]?.text, fix, t);
}

test('B1 compound subjects mid-sentence', () => {
  expect('Uptake has been slow, and the cost and complexity of approvals has deterred many buyers.', 'compound-subject', 'has', 'have');
  expect('The state refused raising tariffs in 2023, and the cost and timing of new plants depends on the budget.', 'compound-subject', 'depends', 'depend');
  expect('We met them, and the size and age of each dwelling was recorded.', 'compound-subject', 'was', 'were');
  expect('Bills rose because the cost and availability of coal has changed.', 'compound-subject', 'has', 'have');
  for (const t of ['Costs rose, and the planning and design team is small.', 'Costs rose, and the research and development budget is small.',
    'We said that the health and safety of workers is the first priority.', 'Prices moved, and the rise and fall of tariffs reflects fuel prices.',
    'Plans exist, and the cost and timing of each phase are published.', 'Costs rose, while the analysis of cost and timing is complex.',
    'It works, and the bread and butter of the firm is consulting.']) assert.equal(hits(t, 'compound-subject').length, 0, t);
});

test('B2 verb + -ing -> to-infinitive', () => {
  expect('In 2022 the state decided offering a smaller subsidy.', 'verb-pattern', 'decided offering', 'decided to offer');
  expect('The state refused raising tariffs in 2023.', 'verb-pattern', 'refused raising', 'refused to raise');
  expect('We managed collecting a survey of 412 of these households.', 'verb-pattern', 'managed collecting', 'managed to collect');
  expect('They agreed sharing the data.', 'verb-pattern', 'agreed sharing', 'agreed to share');
  for (const t of ['They decided funding was short.', 'The board agreed pricing rules last week.', 'We failed testing.', 'She tried using solar.',
    'The scheme aims at reducing losses.']) assert.equal(hits(t, 'verb-pattern').length, 0, t);
});

test('B3 light-verb nominalisations keep the tense', () => {
  expect('The department should conduct an assessment of rooftop potential.', 'nominalisation', 'conduct an assessment of', 'assess');
  expect('The state government would need to carry out an evaluation of each project.', 'nominalisation', 'carry out an evaluation of', 'evaluate');
  expect('We conducted an analysis of demand.', 'nominalisation', 'conducted an analysis of', 'analysed');
  expect('We conducted an analysis of demand.', 'nominalisation', 'conducted an analysis of', 'analyzed', { dialect: 'us' });
  expect('The team has carried out a review of tariffs.', 'nominalisation', 'carried out a review of', 'reviewed');
  for (const t of ['We conducted a detailed assessment of demand.', 'The assessment of risk was conducted in 2022.', 'We made an assessment last year.',
    'The audit of the utility found gaps.']) assert.equal(hits(t, 'nominalisation').length, 0, t);
});

test('B4 pronoun–antecedent number', () => {
  expect('The utility must clear their backlog before the subsidy starts.', 'pronoun-agreement', 'their', 'its');
  expect('The state must publish their progress report every year.', 'pronoun-agreement', 'their', 'its');
  for (const t of ['The states must publish their reports.', 'The government have set their targets.', 'The state and its utilities cut their costs.',
    'Each researcher submits their data.', 'The state relies on utilities, and they cut costs.']) assert.equal(hits(t, 'pronoun-agreement').length, 0, t);
});

test('D1 consistency negatives', () => {
  assert.equal(runGuidance(GOA).filter((g) => g.group === 'consistency').length, 0);
  for (const t of ['We signed long-term contracts last year. Prices fall in the long term, as the board expects.',
    'The author is well known in the state. She is a well-known author of policy papers on energy.',
    'We wrote to the Goa Electricity Department about tariffs. The department replied in a week, as expected.']) {
    assert.equal(runGuidance(t).filter((g) => g.group === 'consistency').length, 0, t);
    assert.equal(runChecks(t).filter((c) => c.rule.startsWith('consistency')).length, 0, t);
  }
});

test('D2 acronym negatives', () => {
  const t = 'The plant adds 60 MW of capacity and 3 kW rooftop systems at ₹9,000 each. The UN and the EU agreed.';
  assert.equal(runGuidance(t).filter((g) => g.group === 'acronyms').length, 0);
  const scoped = 'Title of the paper on power\n\nAbstract\n\nThe Goa Electricity Department (GED) supplies power. GED buys coal.\n\nMethods\n\nThe Goa Electricity Department (GED) provided data. GED also shared the survey for each district.';
  assert.equal(runGuidance(scoped).filter((g) => g.group === 'acronyms').length, 0, 'separate scopes');
  assert.equal(runGuidance(GOA).filter((g) => g.group === 'acronyms').length, 0);
});

test('D3a number negatives', () => {
  for (const t of ['Data run from 2019 to 2023 under the Companies Act, 2013 and ISO 9001, as shown in Table 2 of the annex.',
    'There were 1,240 applications.', 'The utility has 6,50,000 consumers and will add 2,40,000 more by 2030.', 'A further 2450 meters were excluded.']) {
    assert.equal(runGuidance(t).filter((g) => g.group === 'numbers').length, 0, t);
  }
});

test('D4 study-tense negatives', () => {
  assert.equal(guide(read('methods.clean.txt'), 'study-tense', { domain: 'academic' }).length, 0);
  assert.equal(guide(CLEAN, 'study-tense').length, 0);
  assert.equal(guide('The government will publish rules. This study examines them. This study uses data. We find gaps.', 'study-tense').length, 0);
  assert.equal(guide('This study will examine tariffs. We will use survey data. The analysis will estimate demand.', 'study-tense').length, 0);
});

test('D5 unsupported-claim negatives', () => {
  const opts = { domain: 'academic' };
  for (const t of ['Demand rose significantly, by 12 per cent.', 'Studies show (Sen, 1999) that tariffs matter.', 'The rise was dramatic: 40 per cent in a year.',
    'The data are clearly labelled.']) assert.equal(hits(t, 'unsupported-claim', opts).length, 0, t);
  assert.equal(hits('Clearly, this works.', 'unsupported-claim').length, 0, 'off under the general domain');
  assert.equal(hits('Clearly, this works.', 'unsupported-claim', opts).length, 1);
});

test('D6 paragraph negatives', () => {
  const email = read('business-email.clean.txt');
  assert.equal(guide(email, 'paragraph-end').length, 0);
  assert.equal(guide('Three actions matter most. First, the government should act. Second, it should reform rules. Third, it should tender storage.', 'paragraph-same-start').length, 0);
  assert.equal(guide(read('methods.clean.txt'), 'paragraph-same-start').length, 0);
  // A hard-wrapped paragraph is one paragraph, not several without full stops.
  assert.equal(hits('The utility reported higher losses in the first quarter\nof the year because of meter faults and theft.', 'paragraph-end').length, 0);
});

test('D8a keyword negatives', () => {
  assert.equal(guide(GOA, 'keyword-unused').length, 0);
  assert.equal(guide(read('methods.clean.txt'), 'keyword-unused').length, 0);
});

test('N6 and N7', () => {
  assert.equal(hits(read('methods.clean.txt'), 'plain-word').length, 0);
  assert.equal(hits('Subject: Revised schedule for the Margao Substation Upgrade\n\nDear Ms Fernandes,\n\nThe revised schedule for the substation work is attached for your review.', 'title-case').length, 0);
});

// ---------- F7: guard ----------
test('F7: docVariant allows only words already in the document', () => {
  const t = 'We use per cent here: 4 per cent and 20 percent.';
  const at = t.indexOf('percent.');
  assert.equal(checkFix(t, { start: at, end: at + 7, text: 'per cent' }, { docVariant: true }).ok, true);
  assert.equal(checkFix(t, { start: at, end: at + 7, text: 'per mille' }, { docVariant: true }).ok, false, 'outside word');
  const u = 'Costs fell 20 percent.';
  const at2 = u.indexOf('percent');
  assert.equal(checkFix(u, { start: at2, end: at2 + 7, text: 'per cent' }, { docVariant: true }).ok, false, '"cent" is nowhere else in the document');
  assert.equal(checkFix('About 120,000 complaints.', { start: 6, end: 13, text: '1,20,000' }).ok, true, 'regrouping');
  // AI-word and negation checks run first.
  assert.equal(checkFix('A robust plan. A strong plan.', { start: 17, end: 23, text: 'robust' }, { docVariant: true }).ok, false);
  assert.equal(checkFix('It is not done. It is done.', { start: 22, end: 26, text: 'not done' }, { docVariant: true }).ok, false);
  // Every fix produced on every fixture passes.
  for (const key of KEYS) {
    for (const name of [key.doc, key.clean]) {
      const text = read(name);
      for (const c of runChecks(text, key.options)) for (const f of c.fixes) assert.ok(checkFix(text, f, { docVariant: c.rule.startsWith('consistency') || c.rule.startsWith('number') }).ok, `${name}: ${c.rule}`);
    }
  }
});

test('F7: "Make consistent" composes one edit that passes the guard', () => {
  const text = 'We use per cent: 4 per cent, 20 percent and 30 percent, then 12 per cent and 9 per cent.';
  const [g] = guide(text, 'consistency-percent');
  const fixes = g.instances.flatMap((i) => i.fixes);
  assert.equal(fixes.length, 2);
  const c = composeFixes(text, fixes, { docVariant: true });
  assert.ok(c.ok);
  assert.equal(applyFix(text, c.edit), 'We use per cent: 4 per cent, 20 per cent and 30 per cent, then 12 per cent and 9 per cent.');
  const doc = read('policy-brief.errors.txt');
  for (const f of runGuidance(doc, { goals: { formality: 'formal' } })) {
    const fx = f.instances.flatMap((i) => i.fixes);
    if (fx.length > 1) assert.ok(composeFixes(doc, fx, { docVariant: true }).ok, f.rule);
  }
});

// ---------- F8: explanations ----------
test('F8: rule-info for every new rule id', () => {
  for (const r of ['pronoun-agreement', 'consistency-spelling', 'consistency-hyphen', 'consistency-case', 'consistency-percent', 'acronym-before-definition',
    'acronym-undefined', 'acronym-redefined', 'number-grouping', 'number-separator', 'study-tense', 'unsupported-claim', 'paragraph-end',
    'paragraph-same-start', 'paragraph-long', 'keyword-unused']) {
    const i = RULE_INFO[r];
    assert.ok(i && i.name && i.explanation && i.example?.wrong && i.example?.right, r);
  }
});

// ---------- F9: performance ----------
test('F9: runChecks + runGuidance on 2,000 words, p95 under 60 ms', () => {
  const base = read('policy-brief.errors.txt');
  const text = Array.from({ length: Math.ceil(2000 / base.split(/\s+/).length) }, () => base).join('\n\n');
  runChecks(text); runGuidance(text);
  const times = [];
  for (let i = 0; i < 20; i++) {
    const t0 = performance.now();
    runChecks(`${text} `.slice(0, text.length + (i % 2)));
    runGuidance(`${text} `.slice(0, text.length + (i % 2)));
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  assert.ok(times[18] < 60, `p95 ${times[18].toFixed(1)} ms`);
});
