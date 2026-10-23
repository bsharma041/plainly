// Findings from the final (Opus) verification pass.
import test from 'node:test';
import assert from 'node:assert/strict';
import { passiveToActive, splitSentence } from '../src/engine/rewrite.js';
import { runChecks } from '../src/engine/index.js';

const active = (s, o) => passiveToActive(s, o).map((x) => x.text);
const none = (t, rule) => assert.equal(runChecks(t).filter((x) => x.rule === rule).length, 0, t);

test('leading conjunction stays in front', () => {
  assert.deepEqual(active('The work began in May, and the budget was approved by the board in June.'), ['The work began in May, and the board approved the budget in June.']);
  assert.deepEqual(active('We moved in 2023, yet the old lease was renewed by the landlord.'), ['We moved in 2023, yet the landlord renewed the old lease.']);
});

test('more dates and amounts are not actors', () => {
  for (const s of ['The goal was reached by Christmas.', 'The forms must be submitted by Easter.', 'The project will be delivered by Q3.',
    'The houses were built by the 1990s.', 'The vote was won by a large margin.', 'The deadline was extended by a fortnight.',
    'The proposal was rejected by twelve votes to three.', 'The matter was looked in to by the auditors.']) assert.deepEqual(active(s), [], s);
});

test('names take a singular verb', () => {
  assert.deepEqual(active('The fund is managed by Lazard Freres.'), ['Lazard Freres manages the fund.']);
  assert.deepEqual(active('The fund is managed by Jones and Smith.'), ['Jones and Smith manage the fund.']);
});

test('no splits inside single quotes', () => {
  for (const s of ['The chair said ‘we will review the policy in detail next month, but the board must agree first’ and then closed the meeting.',
    "The chair said 'we will review the policy in detail next month, but the board must agree first' and then closed the meeting."]) {
    assert.ok(!splitSentence(s).some((o) => /policy in detail next month\. But/.test(o.text)), s);
  }
});

test('fix-all corruptions removed', () => {
  none('We should of course check the figures.', 'confusion');
  none('Your welcome pack is attached.', 'confusion');
  assert.equal(runChecks('Thanks! Your welcome.').filter((x) => x.rule === 'confusion').length, 1);
});
