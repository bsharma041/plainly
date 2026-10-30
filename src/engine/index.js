import { correctnessRules, detectDialect } from './rules/correctness.js';
import { clarityRules } from './rules/clarity.js';
import { engagementRules } from './rules/engagement.js';
import { voiceRules } from './rules/voice.js';
import { grammarRules } from './rules/grammar.js';
import { deliveryRules } from './rules/delivery.js';
import { usageRules } from './rules/usage.js';
import { usageRules2 } from './rules/usage2.js';
import { analyseDocument } from './rules/document.js';
import { usageRules3 } from './rules/usage3.js';
import { syllabusRules } from './rules/syllabus.js';
import { analyseDocument2 } from './rules/document2.js';
import { sectionModel } from './sections.js';
import { guardSuggestion } from './guard.js';
import { RULE_INFO } from './data/rule-info.js';
import { severityOf, SEVERITY_RANK } from './severity.js';

export { severityOf } from './severity.js';

export { checkFix, isSafeFix, guardSuggestion } from './guard.js';

export { detectDialect };
export { remap } from './remap.js';
export { stats, overallScore, readabilityLabel } from './score.js';
export { detectTone, TONE_INFO } from './tone.js';
export { sentenceGroups, composeSentence, applyFixes, composeFixes } from './compose.js';
export { RULE_INFO, ruleInfo } from './data/rule-info.js';
export { isBulkSafe, BULK_SAFE } from './bulk.js';
export { runGuidance, GUIDANCE_GROUPS } from './guidance.js';
export { paragraphStats } from './paragraphs.js';

const PRIORITY = { correctness: 0, clarity: 1, voice: 2, engagement: 3 };
export const DEFAULT_OPTIONS = {
  dialect: 'auto',        // auto | us | uk
  longSentence: 30,       // words
  plainWords: true,       // offer plainer words for formal ones
  repetition: true,       // flag a word repeated in a few lines
  domain: 'general',      // general | academic | technical | business | casual | creative
  serialComma: 'auto',    // auto (follow the document's majority) | always | never
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
  // Overlapping word-level cards: the more severe one wins, then the category order.
  all.sort((a, b) => SEVERITY_RANK[severityOf(a)] - SEVERITY_RANK[severityOf(b)]
    || PRIORITY[a.category] - PRIORITY[b.category]
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

/** Options after the writing domain is applied (U4): academic and technical prose keeps topic terms and formal words. */
export function effectiveOptions(options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options, categories: { ...DEFAULT_OPTIONS.categories, ...(options.categories || {}) } };
  if (opts.domain === 'academic' || opts.domain === 'technical') {
    opts.repetition = false;
    opts.plainWords = false;
    opts.longSentence = Math.max(opts.longSentence || 30, 38);
  }
  return opts;
}

/** Run every local rule. Pure and synchronous. */
export function runChecks(text, options = {}) {
  const opts = effectiveOptions(options);
  const lists = [];
  if (opts.categories.correctness) lists.push(correctnessRules(text, opts), grammarRules(text, opts));
  if (opts.categories.clarity) lists.push(clarityRules(text, opts));
  if (opts.categories.correctness || opts.categories.clarity) lists.push(usageRules(text, opts), usageRules2(text, opts), usageRules3(text, opts));
  // Round 6: mechanical document findings (consistency, numbers, redefined acronyms, missing full stops) and claim advice as inline cards.
  lists.push(analyseDocument(text, opts).inline.filter((s) => opts.categories[s.category] !== false));
  // Round 9: new rules on the shared chunker, and new document findings. Older rules are unchanged.
  lists.push(syllabusRules(text, opts).filter((s) => opts.categories[s.category] !== false));
  lists.push(analyseDocument2(text, opts).inline.filter((s) => opts.categories[s.category] !== false));
  if (opts.categories.engagement) lists.push(engagementRules(text, opts));
  if (opts.categories.voice) lists.push(voiceRules(text, opts), deliveryRules(text, opts.goals || {}));
  // Round 7 (M4): style rules don't judge the title, headings or the Keywords line.
  const model = sectionModel(text);
  const quiet = new Set(['plain-word', 'repetition', 'wordy', 'passive']);
  const filtered = lists.map((l) => l.filter((s) => !(quiet.has(s.rule) && ['title', 'heading', 'keywords'].includes(model.kindAt(s.start)))));
  // Every fix passes the no-AI-text guard before it can be shown.
  const merged = mergeSuggestions(filtered.map((l) => l.map((s) => guardSuggestion(text, { ...s, source: 'local' }))));
  const out = merged.map((s) => ({
    ...s,
    severity: severityOf(s),
    ruleName: s.ruleName || RULE_INFO[s.rule]?.name || s.title,
    id: `L:${s.start}:${s.end}:${s.rule}`,
  }));
  // A long sentence with no clean split: point to the fixes inside it (N2).
  for (const s of out) {
    if (s.rule !== 'long-sentence' || s.fixes.length) continue;
    const inner = out.filter((x) => x.scope !== 'sentence' && x.fixes.length && x.start >= s.start && x.end <= s.end).length;
    if (inner >= 2) s.message += ` It has ${inner} smaller fixes marked inside; "Improve this sentence" applies them together.`;
  }
  // Round 9: a ", with …" split joins the long-sentence card for that sentence instead of adding a second card.
  for (const w of out.filter((x) => x.rule === 'with-clause')) {
    const ls = out.find((x) => x.rule === 'long-sentence' && x.start <= w.start && x.end >= w.end);
    if (!ls) continue;
    if (!ls.fixes.length && w.fixes.length) {
      ls.fixes = w.fixes;
      ls.message = `${ls.message.replace(/ There's no clean break to split at automatically; try ending the sentence after the main point\./, '')} It splits cleanly at ", with": the fix makes two sentences from your own words.`;
    }
    out.splice(out.indexOf(w), 1);
  }
  return out;
}

/** Apply one fix to text. Returns the new text. */
export function applyFix(text, fix) {
  return text.slice(0, fix.start) + fix.text + text.slice(fix.end);
}
