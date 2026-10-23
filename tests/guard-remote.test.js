// Final provenance review: guard tightening and the deep-check path end to end.
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkFix, guardSuggestion, remap } from '../src/engine/index.js';
import { checkWithLanguageTool } from '../src/services/languagetool.js';

const B = 'The budget was approved by the board.';
const all = (text) => ({ start: 0, end: B.length, text });

test('guard blocks same-length swaps, negations and loose word matches', () => {
  assert.equal(checkFix(B, all('The board did not approve the budget.')).ok, false, 'negation');
  assert.equal(checkFix('Sales rose.', { start: 6, end: 10, text: 'did not rise' }).ok, false);
  assert.equal(checkFix('the report', { start: 4, end: 10, text: 'reportedly' }).ok, false);
  assert.equal(checkFix('quarterly', { start: 0, end: 9, text: 'quartz' }).ok, false);
  assert.equal(checkFix('I dont know.', { start: 2, end: 6, text: "don't" }).ok, true, 'apostrophe fix keeps its negation');
  assert.equal(checkFix('He was not approved.', { start: 0, end: 20, text: 'Someone did not approve him.' }).ok, true);
});

test('remote fixes must stay small', () => {
  const s = { source: 'languagetool', start: 0, end: B.length, original: B, fixes: [{ start: 0, end: B.length, text: 'The board approved the budget.' }] };
  assert.equal(guardSuggestion(B, s).fixes.length, 0, 'no whole-clause rephrasing from deep check');
});

test('deep-check path: premium/AI rules and long replacements are dropped, offsets survive edits', async () => {
  const text = 'This sentnce is fine. They goes home.';
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true, status: 200,
    json: async () => ({ matches: [
      { offset: 5, length: 7, message: 'Spelling', replacements: [{ value: 'sentence' }], rule: { id: 'MORFOLOGIK_RULE_EN_US', issueType: 'misspelling' } },
      { offset: 27, length: 4, message: 'Agreement', replacements: [{ value: 'go' }], rule: { id: 'HE_VERB_AGR', issueType: 'grammar' } },
      { offset: 0, length: 21, message: 'Rephrase', replacements: [{ value: 'This line reads well.' }], rule: { id: 'AI_EN_LECTOR_REPHRASE', isPremium: true, issueType: 'style' } },
      { offset: 22, length: 15, message: 'Rewrite', replacements: [{ value: 'They head back to their homes now.' }], rule: { id: 'SOME_STYLE', issueType: 'style' } },
    ] }),
  });
  try {
    const found = (await checkWithLanguageTool(text, { language: 'en-US' })).map((s) => guardSuggestion(text, s));
    assert.deepEqual(found.filter((s) => s.fixes.length).map((s) => s.fixes[0].text), ['sentence', 'go']);
    assert.ok(!found.some((s) => s.rule.includes('AI_')), 'AI_* rule dropped');
    const edited = `Hi. ${text}`;
    const moved = remap(found, text, edited);
    assert.equal(moved.find((s) => s.fixes[0]?.text === 'go').start, 31);
  } finally {
    globalThis.fetch = realFetch;
  }
});
