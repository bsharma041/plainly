// One test per finding from the third (Opus) REVIEW round.
import test from 'node:test';
import assert from 'node:assert/strict';
import { passiveToActive, splitSentence } from '../src/engine/rewrite.js';
import { runChecks } from '../src/engine/index.js';

const active = (s, o) => passiveToActive(s, o).map((x) => x.text);
const splits = (s) => splitSentence(s).map((x) => x.text);
const none = (t, rule, o) => assert.equal(runChecks(t, o).filter((x) => x.rule === rule).length, 0, t);

test('modal + have been', () => {
  assert.deepEqual(active('The order should not have been placed by the clerk.'), ['The clerk should not have placed the order.']);
  assert.deepEqual(active('The plan could have been approved by the board.'), ['The board could have approved the plan.']);
});

test('refused: unsafe passive shapes', () => {
  for (const s of [
    'The report was reviewed by the board and sent to the CEO.',
    'The committee was made up of five members.',
    'The equipment was looked after by volunteers.',
    'The issue was dealt with by the manager.',
    'The case was looked into by the regulator.',
    'The task was completed by the deadline.',
    'Customers are charged by the hour.',
    'The vendor is paid by the 15th of each month.',
    'Costs were reduced by ten percent.',
    'The gap was narrowed by a factor of two.',
    'Jones was hired by Google in 2019.',
    'The budget was approved by the board (in March).',
    'The method was proposed by Smith et al.',
    'The meeting is set for Monday.',
    'Was the report written by the team?',
  ]) assert.deepEqual(active(s), [], s);
});

test('IT the department is not "it"', () => {
  assert.deepEqual(active('Access is granted by IT on request.', { kind: () => 'common' }), ['IT grants access on request.']);
  assert.ok(!active('Access is granted by IT on request.').some((t) => /^It /.test(t)));
});

test('split refusals', () => {
  for (const s of [
    'Sales rose sharply in the final quarter of the year — the strongest growth since 2015 — and the board expects more next year.',
    'If the board approves the budget at its meeting next week, and the funding arrives on time, we will start the pilot in June.',
    'Not only did the team finish the project two weeks early, but they also came in well under the agreed budget.',
    'Dr. Smith, who led the study over the past five years, and her colleagues found a clear link between the two.',
    'The meeting was moved to the larger hall on the second floor, so that the whole team could attend in person.',
    'He said "we will finish the work on time, and the client will be happy with the result" before he left.',
    'The ageing of the population has driven a rise in costs over the decade, which the authors attribute to longer lives.',
    'We chose the vendor not because it was the cheapest option on the list but because its support team was excellent.',
  ]) {
    for (const out of splits(s)) {
      assert.ok(!/(If|Not only|so that|"we will finish|who led)[^.]*\. /.test(out) || out === s, `bad split: ${out}`);
    }
  }
  assert.deepEqual(splits('If the board approves the budget at its meeting next week, and the funding arrives on time, we will start the pilot in June.'), []);
  assert.ok(!splits('We chose the vendor not because it was the cheapest option on the list but because its support team was excellent.').some((t) => /but\. This/.test(t)));
});

test('grammar false positives', () => {
  none('They each have their own office.', 'agreement');
  none('He took an X-ray of the arm.', 'a-an');
  none('She is a Ukrainian citizen with a usable passport.', 'a-an');
  none('We signed more longer-term contracts this year.', 'double-comparative');
  none('However the money is spent, the board must approve it.', 'intro-comma');
  none('If prices are higher then demand falls.', 'confusion');
  none('The rate rose.  It then fell.', 'double-space');
  none('Our team uses monday.com for planning.', 'capitalize');
  none('Close the dialog and save the colour settings.', 'dialect');
});

test('formal goal participles and confident "just"', () => {
  const fix = (t, rule, o) => { const s = runChecks(t, o).find((x) => x.rule === rule); return s.fixes[0].text; };
  const formal = { goals: { formality: 'formal' } };
  assert.equal(fix("It's gone well.", 'formality', formal), 'It has');
  assert.equal(fix("I'd seen it before.", 'formality', formal), 'I had');
  assert.equal(fix("She's left the firm.", 'formality', formal), 'She has');
  none('We want a just and fair process.', 'hedge', { goals: { confident: true } });
});
