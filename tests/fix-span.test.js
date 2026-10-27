import test from 'node:test';
import assert from 'node:assert/strict';
import { isApplicableFix } from '../src/engine/fix-span.js';
import { runChecks, applyFix } from '../src/engine/index.js';

test('accepts a valid word-level edit', () => {
  const text = 'The report are ready.';
  const suggestion = { start: 11, end: 14, original: 'are' };
  assert.equal(isApplicableFix(text, suggestion, { start: 11, end: 14, text: 'is' }), true);
});

test('accepts a smaller fix inside an unchanged sentence-level suggestion', () => {
  const text = 'The report are ready.';
  const suggestion = { start: 0, end: text.length, original: text };
  assert.equal(isApplicableFix(text, suggestion, { start: 11, end: 14, text: 'is' }), true);
});

test('rejects a stale suggestion after its source text changes', () => {
  const text = 'The report was ready.';
  const suggestion = { start: 0, end: 21, original: 'The report are ready.' };
  assert.equal(isApplicableFix(text, suggestion, { start: 11, end: 14, text: 'is' }), false);
});

test('rejects fix spans outside the highlighted suggestion', () => {
  const text = 'Keep this. Change that.';
  const suggestion = { start: 0, end: 10, original: 'Keep this' };
  assert.equal(isApplicableFix(text, suggestion, { start: 11, end: 16, text: 'edit' }), false);
});

test('rejects invalid, negative and out-of-document offsets', () => {
  const text = 'A short line.';
  const suggestion = { start: 0, end: 1, original: 'A' };
  assert.equal(isApplicableFix(text, suggestion, { start: -1, end: 1, text: 'B' }), false);
  assert.equal(isApplicableFix(text, suggestion, { start: 0, end: 99, text: 'B' }), false);
  assert.equal(isApplicableFix(text, suggestion, { start: 0.5, end: 1, text: 'B' }), false);
  assert.equal(isApplicableFix(text, suggestion, { start: 0, end: 1, text: null }), false);
});


test('accepts passive-to-active sentence rewrites only while the full source sentence is unchanged', () => {
  const text = 'The report was written by the team.';
  const suggestion = runChecks(text).find((s) => s.rule === 'passive');
  assert.ok(suggestion, 'passive suggestion is available');
  const fix = suggestion.fixes.find((f) => f.text === 'The team wrote the report.');
  assert.ok(fix, 'active rewrite is offered');
  assert.equal(isApplicableFix(text, suggestion, fix), true);
  assert.equal(applyFix(text, fix), 'The team wrote the report.');

  // The passive verb is unchanged, but another edit in the sentence makes the
  // cached full-sentence preview stale and it must not overwrite the user's text.
  const edited = 'The report was written by the team yesterday.';
  assert.equal(isApplicableFix(edited, suggestion, fix), false);
  assert.equal(isApplicableFix(text, suggestion, { ...fix, sourceText: undefined }), false);
});
