import { correctnessRules, detectDialect } from './rules/correctness.js';
import { clarityRules } from './rules/clarity.js';
import { engagementRules } from './rules/engagement.js';
import { voiceRules } from './rules/voice.js';
import { grammarRules } from './rules/grammar.js';
import { deliveryRules } from './rules/delivery.js';
import { guardSuggestion } from './guard.js';

export { checkFix, isSafeFix, guardSuggestion } from './guard.js';

export { detectDialect };
export { remap } from './remap.js';
export { stats, overallScore, readabilityLabel } from './score.js';
export { detectTone, TONE_INFO } from './tone.js';

const PRIORITY = { correctness: 0, clarity: 1, voice: 2, engagement: 3 };

export const DEFAULT_OPTIONS = {
  dialect: 'auto',        // auto | us | uk
  longSentence: 30,       // words
  plainWords: true,       // offer plainer words for formal ones
  goals: { formality: 'neutral', confident: false },
  categories: { correctness: true, clarity: true, engagement: true, voice: true },
};

/** Stable key used for "dismiss" so a dismissed card stays gone after edits. */
export function suggestionKey(s) {
  return `${s.rule}|${s.original.toLowerCase()}`;
}

/**
 * Merge, sort and drop overlapping word-level suggestions.
 * Sentence-level ones (long sentence) may overlap anything.
 */
export function mergeSuggestions(lists) {
  const all = lists.flat().filter((s) => s.end > s.start);
  all.sort((a, b) => PRIORITY[a.category] - PRIORITY[b.category]
    || (a.source === 'local' ? 0 : 1) - (b.source === 'local' ? 0 : 1)
    || a.start - b.start
    || (b.end - b.start) - (a.end - a.start));
  const kept = [];
  const words = [];
  for (const s of all) {
    if (s.scope === 'sentence') { kept.push(s); continue; }
    if (words.some((w) => s.start < w.end && s.end > w.start)) continue;
    words.push(s);
    kept.push(s);
  }
  kept.sort((a, b) => a.start - b.start || PRIORITY[a.category] - PRIORITY[b.category]);
  return kept;
}

/** Run every local rule. Pure and synchronous. */
export function runChecks(text, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options, categories: { ...DEFAULT_OPTIONS.categories, ...(options.categories || {}) } };
  const lists = [];
  if (opts.categories.correctness) lists.push(correctnessRules(text, opts), grammarRules(text, opts));
  if (opts.categories.clarity) lists.push(clarityRules(text, opts));
  if (opts.categories.engagement) lists.push(engagementRules(text, opts));
  if (opts.categories.voice) lists.push(voiceRules(text, opts), deliveryRules(text, opts.goals || {}));
  // Every fix passes the no-AI-text guard before it can be shown.
  const merged = mergeSuggestions(lists.map((l) => l.map((s) => guardSuggestion(text, { ...s, source: 'local' }))));
  return merged.map((s) => ({ ...s, id: `L:${s.start}:${s.end}:${s.rule}` }));
}

/** Apply one fix to text. Returns the new text. */
export function applyFix(text, fix) {
  return text.slice(0, fix.start) + fix.text + text.slice(fix.end);
}
