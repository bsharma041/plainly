// Round 9 (Grok audit, Oct 2026) and the rule authoring kit.
// Kit: every new rule must have RULE_INFO, examples that fire, examples that stay silent,
// and fixes that pass the no-AI guard on their own (before guardSuggestion can strip them).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { runChecks, runGuidance, applyFix, checkFix, RULE_INFO } from '../src/engine/index.js';
import { ROUND9_RULES, ROUND9_IDS, syllabusRules } from '../src/engine/rules/syllabus.js';
import { DOC2_IDS } from '../src/engine/rules/document2.js';
import { tagOf, isFiniteVerb, chunkSentences } from '../src/engine/chunk.js';

const fx = (p) => readFileSync(new URL(`./fixtures/${p}`, import.meta.url), 'utf8');
const ex = (e) => (typeof e === 'string' ? { text: e, opts: {} } : e);
const NEW = new Set([...ROUND9_IDS, ...DOC2_IDS]);
const isSplit = (c) => c.rule === 'long-sentence' && c.fixes[0]?.label === 'Split into two sentences';
const hits = (id, text, opts) => runChecks(text, opts).filter((c) => c.rule === id || (id === 'with-clause' && isSplit(c)));

// ---------- the kit ----------
for (const r of ROUND9_RULES) {
  test(`kit ${r.id}: has RULE_INFO with an example`, () => {
    const info = RULE_INFO[r.id];
    assert.ok(info && info.name && info.explanation && info.example?.wrong && info.example?.right, r.id);
  });
  test(`kit ${r.id}: every flag example fires`, () => {
    assert.ok(r.flag.length >= 1);
    for (const e of r.flag.map(ex)) assert.ok(hits(r.id, e.text, e.opts).length, `${r.id} missed: ${e.text}`);
  });
  test(`kit ${r.id}: every pass example stays silent`, () => {
    assert.ok(r.pass.length >= 2, `${r.id} needs at least two must-not-flag examples`);
    for (const e of r.pass.map(ex)) assert.equal(hits(r.id, e.text, e.opts).length, 0, `${r.id} false alarm: ${e.text}`);
  });
  test(`kit ${r.id}: raw fixes pass the guard without help`, () => {
    for (const e of r.flag.map(ex)) {
      for (const c of syllabusRules(e.text, e.opts).filter((x) => x.rule === r.id)) {
        for (const f of c.fixes) {
          const v = checkFix(e.text, f);
          assert.ok(v.ok, `${r.id} fix "${f.text}" on "${e.text}" fails the guard: ${v.reason}`);
        }
      }
    }
  });
}

test('kit: every document-guidance rule has RULE_INFO', () => {
  for (const id of DOC2_IDS) assert.ok(RULE_INFO[id]?.example, id);
});

// ---------- precise fixes ----------
const fixed = (text, opts, id) => {
  const c = hits(id, text, opts)[0];
  assert.ok(c, `${id} on ${text}`);
  return applyFix(text, c.fixes[0]);
};

test('fixes: each new rule makes the expected small edit', () => {
  assert.equal(fixed('The meeting ended early we went home.', {}, 'fused-sentence'), 'The meeting ended early. We went home.');
  assert.equal(fixed('The officer whom is in charge will reply.', {}, 'who-whom'), 'The officer who is in charge will reply.');
  assert.equal(fixed('If I was you, I would wait.', {}, 'subjunctive'), 'If I were you, I would wait.');
  assert.equal(fixed('There were not much people at the hearing.', {}, 'much-many'), 'There were not many people at the hearing.');
  assert.equal(fixed('We do not have many information on costs.', {}, 'much-many'), 'We do not have much information on costs.');
  assert.equal(fixed('The plan is not only cheap and also fast to build.', {}, 'not-only'), 'The plan is not only cheap but also fast to build.');
  assert.equal(fixed('Please intimate us of the date.', { domain: 'business' }, 'register-office'), 'Please inform us of the date.');
  assert.equal(fixed('He passed out of college in 2010.', { domain: 'business' }, 'register-office'), 'He graduated from college in 2010.');
  assert.equal(fixed('Please reply today itself.', { domain: 'business' }, 'register-office'), 'Please reply today.');
  assert.equal(fixed('The color of the report which was published last year is gray.', { dialect: 'us' }, 'that-which'), 'The color of the report that was published last year is gray.');
});

test('with-clause: the split keeps the main clause tense and agreement', () => {
  const present = 'The state has relied on other states and central thermal stations for most of its supply over the last two decades of rapid growth in demand, with thermal power comprising a bulk of the power it buys each year.';
  assert.match(fixed(present, {}, 'with-clause'), /demand\. Thermal power comprises a bulk/);
  const past = 'The state relied on other states and central thermal stations for most of its supply over the two decades of rapid growth in demand before 2020, with thermal stations accounting for a bulk of the power it bought each year.';
  assert.match(fixed(past, {}, 'with-clause'), /2020\. Thermal stations accounted for a bulk/);
  // The split joins the long-sentence card: no second card, and the card no longer says there is no clean break.
  const cards = runChecks(present);
  assert.equal(cards.filter((c) => c.rule === 'with-clause').length, 0);
  assert.doesNotMatch(cards.find(isSplit).message, /no clean break/);
});

test('goa abstract: the 48-word ", with" sentence now splits, card count unchanged', () => {
  const goa = fx('goa-abstract.txt');
  const cards = runChecks(goa);
  assert.equal(cards.length, 14);
  const split = cards.find(isSplit);
  assert.ok(split);
  assert.match(applyFix(goa, split.fixes[0]), /electricity demand\. Thermal power comprises a bulk \(80 per cent\) of the procured power\./);
});

// ---------- document guidance ----------
test('data-number: mixed "data is/are" gets a guarded fix toward the majority', () => {
  const t = 'The data are clear on peaks.\n\nThe data show a rise in summer.\n\nThe data is weaker for winter.';
  const g = runGuidance(t).find((x) => x.rule === 'data-number');
  assert.ok(g);
  const fix = g.instances.find((i) => i.fixes.length).fixes[0];
  assert.equal(applyFix(t, fix), t.replace('data is', 'data are'));
  assert.ok(runChecks(t).some((c) => c.rule === 'data-number'));
  // Consistent use stays silent; academic singular use gets advice only.
  assert.ok(!runGuidance('The data are clear. The data show a rise.').some((x) => x.rule === 'data-number'));
  const adv = runGuidance('The data is clear. The data shows a rise.', { domain: 'academic' }).find((x) => x.rule === 'data-number');
  assert.ok(adv && adv.instances.every((i) => !i.fixes.length));
});

test('acronym-unused: defined once, never used again; advice only', () => {
  const g = runGuidance('We use Time of Day (ToD) pricing in the model.').find((x) => x.rule === 'acronym-unused');
  assert.ok(g && !g.instances[0].fixes.length);
  assert.ok(!runGuidance('We use Time of Day (ToD) pricing. ToD rates rise at night.').some((x) => x.rule === 'acronym-unused'));
});

test('paragraph rhythm: equal-length run is flagged, varied lengths are not', () => {
  const s = 'The utility buys most of its power from central thermal stations in the region today.';
  const flat = [s, s.replace('today', 'now'), s.replace('region', 'west'), s.replace('most', 'much')].join(' ');
  assert.ok(runGuidance(flat).some((x) => x.rule === 'paragraph-rhythm'));
  const varied = `${s} Prices rose. ${s} It works.`;
  assert.ok(!runGuidance(varied).some((x) => x.rule === 'paragraph-rhythm'));
});

// ---------- precision: the must-not-flag corpus and every existing fixture ----------
const OPTION_SETS = [{}, { domain: 'academic' }, { domain: 'business' }, { goals: { formality: 'formal' } }, { dialect: 'us' }, { dialect: 'uk' }];

test('must-not-flag corpus: no round 9 inline card under any option set', () => {
  const t = fx('round9/must-not-flag.txt');
  for (const o of OPTION_SETS) {
    const bad = runChecks(t, o).filter((c) => ROUND9_IDS.includes(c.rule));
    assert.deepEqual(bad.map((c) => `${c.rule}: ${c.original}`), [], JSON.stringify(o));
    for (const g of runGuidance(t, o)) assert.ok(!NEW.has(g.rule), `${g.rule} under ${JSON.stringify(o)}`);
  }
});

test('existing fixtures: round 9 inline rules add nothing except known true positives', () => {
  const root = new URL('./fixtures/', import.meta.url);
  const files = [];
  const walk = (u) => { for (const f of readdirSync(u)) { const p = new URL(f, u); if (statSync(p).isDirectory()) walk(new URL(`${f}/`, u)); else if (f.endsWith('.txt') && !u.href.endsWith('/round9/')) files.push(p); } };
  walk(root);
  const ALLOWED = new Set(['register-office|till date']); // p5-indian.txt really says "till date"
  for (const f of files) {
    const t = readFileSync(f, 'utf8');
    for (const o of OPTION_SETS) {
      const extra = runChecks(t, o).filter((c) => ROUND9_IDS.includes(c.rule) && !ALLOWED.has(`${c.rule}|${c.original}`));
      assert.deepEqual(extra.map((c) => `${c.rule}: ${c.original}`), [], `${f.pathname.split('/').slice(-2).join('/')} ${JSON.stringify(o)}`);
    }
  }
});

// ---------- the chunker ----------
test('chunker: closed-list tags and clause breaks', () => {
  assert.equal(tagOf('the'), 'DET');
  assert.equal(tagOf('we'), 'PRON');
  assert.equal(tagOf('whom'), 'OBJ');
  assert.equal(tagOf('because'), 'SUB');
  assert.equal(tagOf('reviewing'), 'ING');
  assert.equal(tagOf('reviewed'), 'PART');
  assert.ok(isFiniteVerb('has') && isFiniteVerb('wrote') && !isFiniteVerb('quickly'));
  const [s] = chunkSentences('After lunch, we left.');
  assert.equal(s.toks[2].gap, ', ');
});

// ---------- no-AI invariant over every new fix ----------
test('no-AI invariant: every round 9 fix on every example passes checkFix and adds no new word', () => {
  for (const r of ROUND9_RULES) {
    for (const e of r.flag.map(ex)) {
      for (const c of runChecks(e.text, e.opts).filter((x) => NEW.has(x.rule) || isSplit(x))) {
        for (const f of c.fixes) {
          assert.ok(checkFix(e.text, f).ok, `${c.rule}: ${f.text}`);
          assert.ok(!/—/.test(f.text), 'no em dash');
        }
      }
    }
  }
});

// ---------- per-paragraph statistics (Performance view) ----------
import { paragraphStats } from '../src/engine/index.js';
test('paragraphStats: one row per paragraph with counts only', () => {
  const rows = paragraphStats('Short one. Then a longer second sentence here.\n\nAnother paragraph of words.');
  assert.equal(rows.length, 2);
  assert.deepEqual([rows[0].words, rows[0].sentences, rows[0].longest], [8, 2, 6]);
  assert.equal(rows[1].start, 48);
  assert.ok(rows.every((r) => !('fixes' in r)));
});

// ---------- round 9 review (docs/review/round-9-review.md): every reported false flag stays silent ----------
const B = { domain: 'business' }, F = { goals: { formality: 'formal' } }, US = { dialect: 'us' };
const REVIEW_SILENT = [
  ['much-many', 'How much countries spend on health varies widely.', {}], ['much-many', 'How much households pay depends on the slab.', {}],
  ['much-many', 'How much farmers earn is unclear.', {}],
  ['fused-sentence', 'Prices will fall now we have more supply.', {}], ['fused-sentence', 'It was yesterday we learned of the change.', {}],
  ['fused-sentence', 'The night we got home we wrote the report.', {}],
  ['who-whom', 'The answer depends on who the final users are.', F], ['who-whom', 'Everyone pays the same regardless of who they are.', F],
  ['who-whom', 'This raises the question of who the beneficiaries are.', F], ['who-whom', 'They argued about who exactly is responsible.', F],
  ['subjunctive', 'If it was me who caused the error, I apologise.', F], ['subjunctive', 'If he was in your position last year, he did not say so.', F],
  ['that-which', 'The panel told the minister which plants would close.', US], ['that-which', 'The survey asked the respondents which they preferred.', US],
  ['register-office', 'Later surveys find the same.', B], ['register-office', 'The rate is the same as on 1 April.', B],
  ['register-office', 'Offices close on holidays such as on 15 August.', B], ['register-office', 'A late payment can damage your good name.', B],
  ['dangling-modifier', 'In spending terms, the state was ranked third in 2022.', {}], ['dangling-modifier', 'Pricing aside, the plan was approved quickly.', {}],
];
test('review: reported false flags stay silent', () => {
  for (const [id, text, o] of REVIEW_SILENT) assert.equal(hits(id, text, o).length, 0, `${id}: ${text}`);
  assert.ok(!runChecks('Big data is a growing field. The data are clear.').some((c) => c.rule === 'data-number'));
});
test('review: true positives near the false ones still fire', () => {
  assert.ok(hits('register-office', 'May I know your good name?', B).length);
  assert.ok(hits('subjunctive', 'If he was in charge, he would act.', F).length === 0); // not "in your place": left alone
  assert.ok(hits('subjunctive', 'If he was you, he would wait.', F).length);
  assert.ok(hits('who-whom', 'The award goes to the person with who I worked.', B).length);
});
test('review: with-clause past forms come from the writer\'s -ing word, never a misspelling', () => {
  const lead = 'Over the last two decades of rapid growth the state relied on other states and central stations for most of its supply in every season';
  const cases = [['dropping', 'dropped'], ['planning', 'planned'], ['occurring', 'occurred'], ['accounting', 'accounted']];
  for (const [ing, past] of cases) {
    const t = `${lead}, with prices ${ing} for the poorest buyers each year.`;
    const c = runChecks(t).find(isSplit);
    assert.ok(c, ing);
    assert.match(applyFix(t, c.fixes[0]), new RegExp(`\\. Prices ${past} for`));
  }
  // "carrying" -> "carried" is too far from the writer's word for the guard: no fix rather than a guess.
  const carry = runChecks(`${lead}, with prices carrying for the poorest buyers each year.`).find((c) => c.rule === 'long-sentence');
  assert.ok(carry && (!carry.fixes.length || /Prices carried/.test(carry.fixes[0].text)));
  // Mixed tenses (a present relative clause, a past main verb): no fix, and no "splits cleanly" message without one.
  const mixed = 'The plants that are now operating in the state were built between 1990 and 2010 with loans from two central banks and the state itself, with coal accounting for most of their fuel.';
  const ls = runChecks(mixed).find((c) => c.rule === 'long-sentence');
  assert.ok(!ls || (!ls.fixes.length && !/splits cleanly/.test(ls.message)));
});
