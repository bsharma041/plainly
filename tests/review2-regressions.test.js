// One test per finding from the second REVIEW round.
import test from 'node:test';
import assert from 'node:assert/strict';
import { passiveToActive, splitSentence } from '../src/engine/rewrite.js';
import { ingForm, baseForm } from '../src/engine/morph.js';
import { runChecks, applyFix } from '../src/engine/index.js';

const active = (s, o) => passiveToActive(s, o).map((x) => x.text);
const rules = (t, o) => runChecks(t, o);
const none = (t, rule, o) => assert.equal(rules(t, o).filter((x) => x.rule === rule).length, 0, t);
const fixed = (t, rule, o) => { const s = rules(t, o).find((x) => x.rule === rule); return s && s.fixes[0] ? applyFix(t, s.fixes[0]) : null; };

test('"by" + time, amount or method is not an actor', () => {
  for (const s of [
    'The target will be met by 2030.', 'The form must be signed by March.', 'The tax was reduced by 5 percent.',
    'The report was written by hand.', 'The letter was sent by email to the council.', 'The item is sold by weight.',
    'The file was deleted by mistake last week.', 'The fee is waived by default.',
  ]) assert.deepEqual(active(s), [], s);
});

test('compound or trailing "by" phrases are refused', () => {
  for (const s of [
    'The plan is supported by the staff and by the public.',
    'The rates were increased by 3% and then reviewed by the board.',
    'The form was filled in by hand and sent by post.',
    'The rule was broken by the staff, who were warned.',
    'The rules are enforced by the agency, which reports annually.',
  ]) assert.deepEqual(active(s), [], s);
});

test('subject loses its sentence-start capital, or no rewrite', () => {
  assert.deepEqual(active('Ten cases were reported by hospitals.'), ['Hospitals reported ten cases.']);
  assert.deepEqual(active('Nothing was decided by the committee.'), ['The committee decided nothing.']);
  assert.deepEqual(active('Staff were trained by the vendor.'), [], 'unknown: name or noun?');
  const kind = (w) => (w === 'Staff' ? 'common' : null);
  assert.deepEqual(active('Staff were trained by the vendor.', { kind }), ['The vendor trained staff.']);
  assert.deepEqual(active('India was praised by the IMF.', { kind: () => 'proper' }), ['The IMF praised India.']);
});

test('-ing forms double consonants', () => {
  assert.equal(ingForm('cut', 'cut'), 'cutting');
  assert.equal(ingForm('banned', 'ban'), 'banning');
  assert.equal(ingForm('admitted', 'admit'), 'admitting');
  assert.equal(ingForm('referred', 'refer'), 'referring');
  assert.equal(ingForm('visited', 'visit'), 'visiting');
  assert.equal(ingForm('opened', 'open'), 'opening');
  assert.deepEqual(active('The tree is being cut by the crew.'), ['The crew is cutting the tree.']);
  assert.equal(baseForm('quoted'), 'quote');
});

test('split keeps names capitalised', () => {
  const t = 'The programme lost momentum in the second year of operation because Microsoft withdrew its funding at short notice.';
  assert.match(splitSentence(t)[0].text, /This is because Microsoft withdrew/);
  const t2 = 'The discom ran field trials across three districts over two years; iPhone users saw the biggest gains in uptake.';
  assert.match(splitSentence(t2)[0].text, /years\. iPhone users/);
});

test('grammar false positives', () => {
  none('Based on the data, we concluded that sales fell.', 'comma-splice');
  none('The school is used to saw logs.', 'verb-form');
  none('The team will found a new unit in May.', 'verb-form');
  none('Jony Ive spoke at the event.', 'apostrophe');
  none('Is it done? Yes!!', 'double-punct');
});

test('formal and confident goals', () => {
  const formal = { goals: { formality: 'formal' } };
  assert.equal(fixed("She's been the lead since May.", 'formality', formal), 'She has been the lead since May.');
  assert.equal(fixed("I'd had the report since May.", 'formality', formal), 'I had had the report since May.');
  const lots = rules('We have lots of time left.', formal).find((x) => x.rule === 'informal-word');
  assert.equal(lots.fixes.length, 0);
  none('The Super Bowl was held in March.', 'informal-word', formal);
  const confident = { goals: { confident: true } };
  none('It is a bit of a problem.', 'hedge', confident);
  none('What kind of data do we have?', 'hedge', confident);
  none('This is just one example.', 'hedge', confident);
});
