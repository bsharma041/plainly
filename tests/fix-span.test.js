import test from 'node:test';
import assert from 'node:assert/strict';
import { isApplicableFix } from '../src/engine/fix-span.js';

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
  const text = 'The report is ready.';
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
