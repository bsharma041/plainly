// Round 10: Grammarly paid-tier gap closers, built from closed lists. Same kit as round 9:
// RULE_INFO, examples that fire, examples that stay silent, raw fixes that pass the guard.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { runChecks, runGuidance, applyFix, checkFix, guardSuggestion, RULE_INFO } from '../src/engine/index.js';
import { ROUND10_RULES, ROUND10_IDS, parityRules } from '../src/engine/rules/parity.js';
import { styleGuideRules } from '../src/engine/rules/styleguide.js';

const ex = (e) => (typeof e === 'string' ? { text: e, opts: {} } : e);
const NEW = new Set([...ROUND10_IDS, 'citation-style', 'style-guide']);
const hits = (id, text, opts) => runChecks(text, opts).filter((c) => c.rule === id);
const fixed = (text, opts, id, n = 0) => {
  const c = hits(id, text, opts)[0];
  assert.ok(c, `${id} on ${text}`);
  return applyFix(text, c.fixes[n]);
};

for (const r of ROUND10_RULES) {
  test(`kit ${r.id}: has RULE_INFO with an example`, () => {
    const info = RULE_INFO[r.id];
    assert.ok(info && info.name && info.explanation && info.example?.wrong && info.example?.right, r.id);
  });
  test(`kit ${r.id}: every flag example fires`, () => {
    for (const e of r.flag.map(ex)) assert.ok(hits(r.id, e.text, e.opts).length, `${r.id} missed: ${e.text}`);
  });
  test(`kit ${r.id}: every pass example stays silent`, () => {
    assert.ok(r.pass.length >= 2);
    for (const e of r.pass.map(ex)) assert.equal(hits(r.id, e.text, e.opts).length, 0, `${r.id} false alarm: ${e.text}`);
  });
  test(`kit ${r.id}: raw fixes pass the guard without help`, () => {
    for (const e of r.flag.map(ex)) {
      for (const c of parityRules(e.text, e.opts).filter((x) => x.rule === r.id)) {
        for (const f of c.fixes) {
          const v = checkFix(e.text, f);
          assert.ok(v.ok, `${r.id} fix "${f.text}" on "${e.text}" fails the guard: ${v.reason}`);
        }
      }
    }
  });
}

test('kit: citation-style and style-guide have RULE_INFO', () => {
  for (const id of ['citation-style', 'style-guide']) assert.ok(RULE_INFO[id]?.example, id);
});

test('fixes: each new rule makes the expected small edit', () => {
  assert.equal(fixed('The chairman opened the meeting.', {}, 'inclusive-language'), 'The chair opened the meeting.');
  assert.equal(fixed('Each student must bring his or her book.', {}, 'inclusive-language'), 'Each student must bring their book.');
  assert.equal(fixed('The elderly need more support.', {}, 'inclusive-language'), 'Older people need more support.');
  assert.equal(fixed('You need to send the report by Friday.', { domain: 'business' }, 'polite-tone'), 'Please send the report by Friday.');
  assert.equal(fixed('I need you to send the file.', { domain: 'business' }, 'polite-tone'), 'Please send the file.');
  assert.equal(fixed('Send it ASAP.', { goals: { polite: true } }, 'polite-tone'), 'Send it as soon as possible.');
  assert.equal(fixed('Please explain me the rule.', {}, 'fluency'), 'Please explain to me the rule.');
  assert.equal(fixed('According to me, the plan is weak.', {}, 'fluency'), 'In my opinion, the plan is weak.');
  assert.equal(fixed('I am agree with you.', {}, 'fluency'), 'I agree with you.');
  assert.equal(fixed('Could you give me an advice on this.', {}, 'fluency'), 'Could you give me advice on this.');
  assert.equal(fixed('I did a mistake in the form.', {}, 'fluency'), 'I made a mistake in the form.');
  assert.equal(fixed('He said me to wait.', {}, 'fluency'), 'He told me to wait.');
  assert.equal(fixed('At the end of the day, cost matters.', {}, 'cliche'), 'In the end, cost matters.');
});

test('he or she: advice only, because the verb would have to change', () => {
  const c = hits('inclusive-language', 'Each member said he or she would vote.', {})[0];
  assert.equal(c.fixes.length, 0);
});

test('dull-word: fires from the third use and offers closed-list words only', () => {
  const t = 'The plan had a good start in the north.\n\nThe team did good work on the survey.\n\nIt was a good year for sales.';
  const c = hits('dull-word', t, {});
  assert.equal(c.length, 1);
  assert.deepEqual(c[0].fixes.map((f) => f.text), ['sound', 'strong', 'useful']);
  assert.equal(hits('dull-word', t, { domain: 'casual' }).length, 0);
});

test('list-to-bullets: only moves the writer\'s own words, and the result is clean', () => {
  const t = 'The plan needs four things: a budget for the first year; a named owner in each district; a review date before the end of March; and a short report to the board.';
  const out = fixed(t, {}, 'list-to-bullets');
  assert.equal(out, 'The plan needs four things:\n- a budget for the first year\n- a named owner in each district\n- a review date before the end of March\n- a short report to the board.');
  const words = (s) => s.toLowerCase().match(/[a-z]+/g);
  const before = words(t);
  for (const w of words(out)) assert.ok(before.includes(w), w);
  assert.deepEqual(runChecks(out).map((c) => c.rule), []);
  // One card for the sentence: the list card replaces the long-sentence card.
  assert.equal(hits('long-sentence', t, {}).length, 0);
  // No fix when more text follows in the same paragraph.
  assert.equal(hits('list-to-bullets', `${t} We start in May.`, {})[0].fixes.length, 0);
});

test('citation-style: minority forms move to the majority, with guarded fixes', () => {
  const t = 'Earlier work agrees (Smith, 2020). Later work agrees (Jones 2021). A third study agrees (Rao, 2019).';
  const g = runGuidance(t).filter((f) => f.rule === 'citation-style');
  assert.equal(g.length, 1);
  const c = hits('citation-style', t, {});
  assert.equal(c.length, 1);
  assert.equal(applyFix(t, c[0].fixes[0]), t.replace('Jones 2021', 'Jones, 2021'));
  const amp = 'One study (Smith & Jones, 2020) and two more (Rao and Lee, 2021) and (Das and Roy, 2022).';
  assert.equal(fixed(amp, {}, 'citation-style'), amp.replace('Smith & Jones', 'Smith and Jones'));
  const etal = 'First (Rao et al, 2019) and then (Lee et al., 2018) and (Das et al., 2020).';
  assert.equal(fixed(etal, {}, 'citation-style'), etal.replace('et al,', 'et al.,'));
  const mixed = 'One [1] and two [2] and (Smith, 2020) and (Rao, 2019).';
  const adv = runGuidance(mixed).filter((f) => f.rule === 'citation-style');
  assert.equal(adv.length, 1);
  assert.ok(adv[0].instances.every((i) => i.fixes.length === 0));
  assert.equal(runGuidance('One study (Smith, 2020) and another (Rao, 2019).').filter((f) => f.rule === 'citation-style').length, 0);
});

test('style-guide: the writer\'s own replacement passes; nothing else gains from it', () => {
  const sg = [{ flag: 'log in', suggest: 'sign in' }, { flag: 'synergy', suggest: '' }, { flag: 'e-mail', suggest: 'email', note: 'House style.' }];
  const t = 'Please log in to read the e-mail about synergy.';
  const cards = runChecks(t, { styleGuide: sg }).filter((c) => c.rule === 'style-guide');
  assert.equal(cards.length, 3);
  assert.equal(applyFix(t, cards[0].fixes[0]), 'Please sign in to read the e-mail about synergy.');
  assert.equal(cards.find((c) => c.original === 'synergy').fixes.length, 0);
  assert.equal(cards.find((c) => c.original === 'e-mail').message, 'House style.');
  assert.equal(runChecks(t).filter((c) => c.rule === 'style-guide').length, 0);
  // The writer's words do not excuse AI filler, a negation or another rule's fix.
  const raw = styleGuideRules('We use the tool.', { styleGuide: [{ flag: 'use', suggest: 'leverage' }] })[0];
  assert.equal(guardSuggestion('We use the tool.', raw).fixes.length, 0);
  const neg = styleGuideRules('We approved it.', { styleGuide: [{ flag: 'approved', suggest: 'did not approve' }] })[0];
  assert.equal(guardSuggestion('We approved it.', neg).fixes.length, 0);
  const spoof = { rule: 'wordy', fixes: [{ text: 'zebra', start: 3, end: 6 }], writerWords: ['zebra'] };
  assert.equal(guardSuggestion('We use the tool.', spoof).fixes.length, 0);
  const remote = { rule: 'style-guide', source: 'languagetool', fixes: [{ text: 'zebra', start: 3, end: 6 }], writerWords: ['zebra'] };
  assert.equal(guardSuggestion('We use the tool.', remote).fixes.length, 0);
  assert.equal(checkFix('We use the tool.', { text: 'zebra', start: 3, end: 6 }).ok, false);
});

// ---------- precision: every existing fixture, under every option set ----------
const OPTION_SETS = [{}, { domain: 'academic' }, { domain: 'business' }, { goals: { formality: 'formal' } }, { goals: { polite: true } }, { dialect: 'us' }, { dialect: 'uk' }];

test('existing fixtures: round 10 rules add no card', () => {
  const files = [];
  const walk = (u) => { for (const f of readdirSync(u)) { const p = new URL(f, u); if (statSync(p).isDirectory()) walk(new URL(`${f}/`, u)); else if (f.endsWith('.txt')) files.push(p); } };
  walk(new URL('./fixtures/', import.meta.url));
  assert.ok(files.length >= 8);
  const seen = [];
  for (const p of files) {
    const t = readFileSync(p, 'utf8');
    for (const o of OPTION_SETS) {
      for (const c of runChecks(t, o)) if (NEW.has(c.rule)) seen.push(`${p.pathname.split('/fixtures/')[1]} ${JSON.stringify(o)} ${c.rule}: ${c.original}`);
      for (const f of runGuidance(t, o)) if (NEW.has(f.rule)) seen.push(`${p.pathname.split('/fixtures/')[1]} guidance ${f.title}`);
    }
  }
  assert.deepEqual(seen, []);
});
