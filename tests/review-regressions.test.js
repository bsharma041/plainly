// One test per finding from the REVIEW agent, so the bugs stay fixed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runChecks, applyFix } from '../src/engine/index.js';

const rules = (t) => runChecks(t);
const fixed = (t, rule) => {
  const s = rules(t).find((x) => x.rule === rule);
  return s && s.fixes[0] ? applyFix(t, s.fixes[0]) : null;
};
const none = (t, rule, msg) => assert.equal(rules(t).filter((x) => x.rule === rule).length, 0, msg || t);

test('majority of keeps the article', () => {
  assert.equal(fixed('The majority of the committee members voted.', 'wordy'), 'Most of the committee members voted.');
  assert.equal(fixed('The majority of people agreed.', 'wordy'), 'Most people agreed.');
  assert.equal(fixed('We heard from a majority of the households.', 'wordy'), 'We heard from most of the households.');
});

test('no grammar-breaking plain-word swaps', () => {
  none('The aforementioned committee met.', 'plain-word');
  none('We need a sufficient number of households.', 'plain-word');
});

test('possessive "its" before adjectives is left alone', () => {
  none('Its important role is clear.', 'confusion');
  none('Its true cost is high.', 'confusion');
  assert.equal(fixed('Its been a long year.', 'confusion'), "It's been a long year.");
});

test('passive rewrite keeps opening phrases and refuses unclear ones', () => {
  assert.equal(fixed('In 2020, the report was written by the policy team.', 'passive'), 'In 2020, the policy team wrote the report.');
  const y = rules('Yesterday the report was written by the team.').find((x) => x.rule === 'passive');
  assert.equal(y.fixes.length, 0, 'opener without a comma: subject unclear, no rewrite');
});

test('repetition synonyms keep the tense', () => {
  const t = 'Wages have increased in most districts. Prices increased too. Rents increased as well.';
  const s = rules(t).find((x) => x.rule === 'repetition');
  assert.ok(s);
  for (const f of s.fixes) assert.match(f.text, /ed$/, `bad tense: ${f.text}`);
});

test('ordinary words are not flagged with meaning-changing fixes', () => {
  const foster = rules('Foster care reform is needed.').filter((x) => x.rule === 'ai-phrase');
  assert.ok(foster.every((x) => x.fixes.length === 0));
  const showcase = rules('The annual showcase opens next week.').filter((x) => x.rule === 'ai-phrase');
  assert.ok(showcase.every((x) => x.fixes.length === 0));
  const summary = rules('In summary, the scheme works.').filter((x) => x.rule === 'ai-phrase');
  assert.ok(summary.every((x) => x.fixes.length === 0));
});

test('capital A labels are not articles', () => {
  none('Vitamin A is essential.', 'a-an');
  none('We prefer Scenario A over the rest.', 'a-an');
  none('He rode a unicycle to work.', 'a-an');
  assert.equal(fixed('A apple fell.', 'a-an'), 'An apple fell.');
});

test('roman numeral list markers', () => {
  none('The policy has three goals: (i) expand access, (ii) reduce cost.', 'lowercase-i');
  none('(ii) reduce cost for all households in the region.', 'sentence-case');
});

test('subjunctive and dialogue', () => {
  none('This is, as it were, the plan we chose.', 'agreement');
  none('"They was robbed," he said.', 'agreement');
});

test('get-idioms are not passive', () => {
  none("Let's get started with the review.", 'passive');
  none('They got married in June.', 'passive');
});

test('deletion fixes carry a readable label', () => {
  const s = rules('It is important to note that the data is old.').find((x) => x.rule === 'wordy');
  assert.match(s.fixes[0].label, /^Remove/);
});

test('dialect pass skips proper names', () => {
  none('The Centre for Policy Research will analyze the program and color the maps.', 'dialect');
});

test('em dash rule needs a long text', () => {
  none('One — two — three — four words here and some more.', 'em-dash');
});

test('time colons', () => {
  none('The meeting is at 10 : 30 today.', 'space-before-punct');
});

test('headings and notes keep their casing', () => {
  none('Results below\nthe figures show growth in every district.', 'sentence-case');
  assert.ok(rules('It rained.\nthe figures show growth in every district.').some((x) => x.rule === 'sentence-case'));
});
