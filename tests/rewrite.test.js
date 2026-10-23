import test from 'node:test';
import assert from 'node:assert/strict';
import { passiveToActive, splitSentence } from '../src/engine/rewrite.js';
import { baseForm, thirdPerson, isPluralSubject } from '../src/engine/morph.js';
import { runChecks, applyFix, detectTone } from '../src/engine/index.js';

const active = (s, o) => passiveToActive(s, o).map((x) => x.text);

test('passive to active across tenses', () => {
  const cases = {
    'The report was written by the policy team.': 'The policy team wrote the report.',
    'In 2020, the report was written by the policy team.': 'In 2020, the policy team wrote the report.',
    'The tariff was revised by the commission in March.': 'The commission revised the tariff in March.',
    'The meters are installed by the discom.': 'The discom installs the meters.',
    'The meters are installed by contractors.': 'Contractors install the meters.',
    'The data has been reviewed by our analysts.': 'Our analysts have reviewed the data.',
    'The data has been reviewed by the board.': 'The board has reviewed the data.',
    'The plan will be approved by the board.': 'The board will approve the plan.',
    'The bill is not paid by most consumers.': 'Most consumers do not pay the bill.',
    'The roads were being repaired by the contractors.': 'The contractors were repairing the roads.',
    'The cake was eaten by me.': 'I ate the cake.',
    'Our findings were carefully checked by two reviewers.': 'Two reviewers carefully checked our findings.',
    'The proposal was given to the minister by the team.': 'The team gave the proposal to the minister.',
    'The amount should not be spent by the department.': 'The department should not spend the amount.',
    'The scheme was not approved by the cabinet.': 'The cabinet did not approve the scheme.',
  };
  for (const [from, to] of Object.entries(cases)) assert.deepEqual(active(from), [to], from);
});

test('passive without an actor offers "we" (if the writer uses it) and a placeholder', () => {
  assert.deepEqual(active('Mistakes were made.', { weWriter: true, kind: () => 'common' }), ['We made mistakes.', 'Someone made mistakes.']);
  assert.deepEqual(active('Mistakes were made.'), [], 'no evidence the capital is not a name: no rewrite');
  assert.deepEqual(active('The survey was conducted in 12 districts.'), ['Someone conducted the survey in 12 districts.']);
});

test('passive shapes we refuse to touch', () => {
  for (const s of [
    'It was decided that we leave.',
    'Prices are expected to rise.',
    'Yesterday the report was written by the team.',
    'The plan, which was drafted in May, was approved by the board.',
    'The report was written by using a template.',
  ]) assert.deepEqual(active(s), [], s);
});

test('verb morphology', () => {
  assert.equal(baseForm('created'), 'create');
  assert.equal(baseForm('reviewed'), 'review');
  assert.equal(baseForm('planned'), 'plan');
  assert.equal(baseForm('studied'), 'study');
  assert.equal(baseForm('monitored'), 'monitor');
  assert.equal(thirdPerson('approve'), 'approves');
  assert.equal(thirdPerson('finish'), 'finishes');
  assert.equal(thirdPerson('study'), 'studies');
  assert.equal(isPluralSubject('the discom'), false);
  assert.equal(isPluralSubject('contractors'), true);
  assert.equal(isPluralSubject('the head of the departments'), false);
  assert.equal(isPluralSubject('the news'), false);
});

test('sentence splitting keeps every word and only adds fixed openers', () => {
  const t = 'The commission approved a new tariff for agricultural consumers in the state, which raised the average bill by nearly twelve per cent in the first year alone.';
  const [opt] = splitSentence(t);
  assert.equal(opt.text, 'The commission approved a new tariff for agricultural consumers in the state. This raised the average bill by nearly twelve per cent in the first year alone.');
  assert.deepEqual(splitSentence('We studied billing, collection, metering and losses across all the districts in the state over five years.'), [], 'lists are not clauses');
});

test('new grammar rules', () => {
  const fix = (t, rule) => { const s = runChecks(t).find((x) => x.rule === rule); assert.ok(s, `${rule}: ${t}`); return applyFix(t, s.fixes[0]); };
  assert.equal(fix('He left early, it was raining.', 'comma-splice'), 'He left early; it was raining.');
  assert.equal(runChecks('When we arrived, it was raining.').filter((x) => x.rule === 'comma-splice').length, 0);
  assert.equal(fix('There is many reasons.', 'agreement'), 'There are many reasons.');
  assert.equal(fix('Everyone are welcome.', 'agreement'), 'Everyone is welcome.');
  assert.equal(fix('She has went home.', 'verb-form'), 'She has gone home.');
  assert.equal(fix('He did not came back.', 'verb-form'), 'He did not come back.');
  assert.equal(fix('This is more better.', 'double-comparative'), 'This is better.');
  assert.equal(fix('We need less people.', 'fewer-less'), 'We need fewer people.');
  assert.equal(fix('See you on monday.', 'capitalize'), 'See you on Monday.');
  assert.equal(fix('I dont know.', 'apostrophe'), "I don't know.");
  assert.equal(fix('Wait,, what?', 'double-punct'), 'Wait, what?');
  assert.equal(fix('I advice you to stop.', 'confusion'), 'I advise you to stop.');
  assert.equal(runChecks('We may go in May.').filter((x) => x.rule === 'capitalize').length, 0);
});

test('goals switch on formality and hedging checks only when asked', () => {
  const t = "I think we can't stop now, it's maybe too late.";
  assert.equal(runChecks(t).filter((x) => ['formality', 'hedge'].includes(x.rule)).length, 0);
  const formal = runChecks(t, { goals: { formality: 'formal' } }).filter((x) => x.rule === 'formality');
  assert.deepEqual(formal.map((x) => x.fixes[0].text), ['cannot', 'it is']);
  const hedges = runChecks(t, { goals: { confident: true } }).filter((x) => x.rule === 'hedge');
  assert.deepEqual(hedges.map((x) => x.original), ['I think', 'maybe']);
});

test('tone detection', () => {
  const tones = detectTone('AT&C losses stood at 22 per cent in FY 2021. Losses declined because the discom improved billing and collection. The data shows a clear trend.').map((t) => t.tone);
  assert.ok(tones.includes('Analytical'));
  const casual = detectTone("Hey, thanks so much! I'm gonna be there, it's gonna be awesome and you're the best!").map((t) => t.tone);
  assert.ok(casual.includes('Informal') || casual.includes('Friendly'));
});
