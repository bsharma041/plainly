// The no-AI-text guarantee, tested two ways: the guard rejects generated text,
// and every fix every rule produces on realistic writing passes the guard.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runChecks, checkFix, applyFix } from '../src/engine/index.js';
import { passiveToActive, splitSentence } from '../src/engine/rewrite.js';
import { splitSentences } from '../src/engine/text.js';

const T = 'The report was written by the policy team.';
const whole = (text) => ({ start: 0, end: T.length, text });

test('guard rejects generated or AI-styled text', () => {
  assert.equal(checkFix(T, whole('The policy team delved into the report.')).ok, false, 'AI word');
  assert.equal(checkFix(T, whole('The policy team meticulously crafted the report.')).ok, false, 'outside words');
  assert.equal(checkFix(T, whole('The policy team wrote the report, showcasing its expertise.')).ok, false, 'added flourish');
  assert.equal(checkFix(T, whole('The report serves as the policy team output.')).ok, false, 'new AI phrase');
  assert.equal(checkFix(T, whole('The policy team wrote the report — a pivotal moment.')).ok, false, 'em dash');
  assert.equal(checkFix(T, whole('The policy team, which is a vibrant and dynamic group of seasoned experts, wrote it.')).ok, false, 'padding');
});

test('AI words are caught in any form', async () => {
  const { isAiWord } = await import('../src/engine/guard.js');
  for (const w of ['delve', 'delved', 'delving', 'leveraging', 'showcased', 'fostering', 'tapestry', 'pivotal', 'seamlessly', 'utilizing']) assert.ok(isAiWord(w), w);
  for (const w of ['deliver', 'delivery', 'team', 'report', 'show', 'build', 'level', 'shows', 'use']) assert.ok(!isAiWord(w), w);
  assert.equal(checkFix(T, whole('The policy team delved the report.')).ok, false);
});

test('guard accepts the tool\'s own rule-based fixes', () => {
  assert.equal(checkFix(T, whole('The policy team wrote the report.')).ok, true);
  assert.equal(checkFix('This sentnce.', { start: 5, end: 12, text: 'sentence' }).ok, true, 'typo fix');
  assert.equal(checkFix('We organize.', { start: 3, end: 11, text: 'organise' }).ok, true, 'spelling variant');
});

const SAMPLE = `i think their is a error in the the second section of the report. The report was written by the policy team. In order to make a decision, we must of looked at a large number of options. It is important to note that the data was very important.

Our analysis serves as a testament to the hard work of the team, and it shows how the scheme has changed the way discoms bill consumers, but the gains are uneven across regions and the rural divisions still lag behind on collection efficiency. The tariff was revised by the commission in March, which raised the average bill by nearly twelve per cent in the first year alone for most households.

He don't agree with the conclusion, it was written too quickly. However we should organise a meeting to discuss it, and we can also organize a field visit. Mistakes were made. There is many reasons for this. He has went home. We need less people. I dont know. The meters are installed by the discom. Wages have increased in most districts. Prices increased too. Rents increased as well.`;

test('every fix produced on realistic text passes the guard', () => {
  const opts = [{}, { goals: { formality: 'formal', confident: true } }, { dialect: 'us' }, { dialect: 'uk' }];
  let checked = 0;
  for (const o of opts) {
    for (const s of runChecks(SAMPLE, o)) {
      for (const f of s.fixes) {
        const r = checkFix(SAMPLE, f);
        assert.ok(r.ok, `${s.rule} "${s.original}" -> "${f.text}": ${r.reason}`);
        checked++;
      }
    }
  }
  for (const s of splitSentences(SAMPLE)) {
    for (const opt of [...passiveToActive(s.text, { weWriter: true, kind: () => 'common' }), ...splitSentence(s.text)]) {
      const r = checkFix(s.text, { start: 0, end: s.text.length, text: opt.text });
      assert.ok(r.ok, `rewrite "${opt.text}": ${r.reason}`);
      checked++;
    }
  }
  assert.ok(checked > 30, `checked ${checked} fixes`);
});
