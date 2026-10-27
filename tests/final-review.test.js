// Findings from the final Opus correctness review.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runChecks, applyFix } from '../src/engine/index.js';

const hits = (t, rule, o) => runChecks(t, o).filter((x) => x.rule === rule);
const formal = { goals: { formality: 'formal' } };
const confident = { goals: { confident: true } };

test('formal goal: \'s + adjective is not "has"', () => {
  for (const t of ["It's based on billing data.", "She's interested.", "He's tired.", "That's expected."]) {
    const s = hits(t, 'formality', formal)[0];
    assert.ok(!s || s.fixes.length === 0 || !/has/.test(s.fixes[0].text), t);
  }
  assert.equal(hits("She's left the firm.", 'formality', formal)[0].fixes[0].text, 'She has');
  assert.equal(hits("Let's meet.", 'formality', formal)[0].fixes.length, 0);
});

test('plain-word and wordy fixes keep grammar', () => {
  assert.equal(hits('The purchase of new laptops.', 'plain-word').length, 0);
  const s = hits('The trial has demonstrated a clear benefit.', 'plain-word')[0];
  assert.equal(applyFix('The trial has demonstrated a clear benefit.', s.fixes[0]), 'The trial has shown a clear benefit.');
  assert.equal(hits('Projects are evaluated with respect to cost.', 'wordy').length, 0);
  assert.equal(hits('Energy use rose in relation to household income.', 'wordy').length, 0);
});

test('grammar false positives', () => {
  assert.equal(hits('Everything we had came from local donations.', 'verb-form').length, 0);
  assert.equal(hits('The ideas I have came from my team.', 'verb-form').length, 0);
  assert.equal(hits('She has went home.', 'verb-form').length, 1);
  const rose = 'The water has rose.';
  assert.equal(applyFix(rose, { start: hits(rose, 'verb-form')[0].start, end: hits(rose, 'verb-form')[0].end, text: typeof hits(rose, 'verb-form')[0].fixes[0] === 'string' ? hits(rose, 'verb-form')[0].fixes[0] : hits(rose, 'verb-form')[0].fixes[0].text }), 'The water has risen.');
  const blew = 'The wind has blew all day.';
  assert.equal(applyFix(blew, { start: hits(blew, 'verb-form')[0].start, end: hits(blew, 'verb-form')[0].end, text: typeof hits(blew, 'verb-form')[0].fixes[0] === 'string' ? hits(blew, 'verb-form')[0].fixes[0] : hits(blew, 'verb-form')[0].fixes[0].text }), 'The wind has blown all day.');
  const arose = 'Prices have arose again.';
  assert.equal(applyFix(arose, { start: hits(arose, 'verb-form')[0].start, end: hits(arose, 'verb-form')[0].end, text: typeof hits(arose, 'verb-form')[0].fixes[0] === 'string' ? hits(arose, 'verb-form')[0].fixes[0] : hits(arose, 'verb-form')[0].fixes[0].text }), 'Prices have arisen again.');
  assert.equal(hits('The water has risen.', 'verb-form').length, 0, 'do not flag a correct participle');

  assert.equal(hits('Will ran the meeting.', 'verb-form').length, 0);
  assert.equal(hits('Costs increased sharply, it seems.', 'comma-splice').length, 0);
  assert.equal(hits('We just finished the quarterly report.', 'hedge', confident).length, 0);
  assert.equal(hits('The printer is fixed now.', 'passive').length, 0);
});

test('"dont" offers "doesn\'t" for a singular subject', () => {
  assert.deepEqual(hits('The library dont have it.', 'apostrophe')[0].fixes.map((f) => f.text), ["doesn't", "don't"]);
  assert.deepEqual(hits('I dont know.', 'apostrophe')[0].fixes.map((f) => f.text), ["don't"]);
});
