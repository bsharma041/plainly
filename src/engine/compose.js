// "Improve this sentence" (spec U1): a sentence preview built only by
// composing the sentence's own rule fixes. No new wording: each change is the
// first fix of one suggestion, the fixes don't overlap, and they are applied
// right to left so the result doesn't depend on the order they were picked.
import { checkFix } from './guard.js';
import { splitSentences, words } from './text.js';

/** Apply non-overlapping fixes ({start,end,text}) to text, right to left. */
export function applyFixes(text, fixes) {
  let out = text;
  for (const f of [...fixes].sort((a, b) => b.start - a.start)) out = out.slice(0, f.start) + f.text + out.slice(f.end);
  return out;
}

const tokenCount = (s) => words(s).length;

/**
 * Sentences with two or more composable word-level fixes.
 * @returns {Array<{start,end,text,items:Array<{suggestion,fix}>,tips:Array}>}
 */
export function sentenceGroups(text, suggestions) {
  const groups = [];
  for (const sent of splitSentences(text)) {
    const inside = suggestions.filter((s) => s.start >= sent.start && s.end <= sent.end);
    if (inside.length < 2) continue;
    const candidates = inside
      .filter((s) => s.scope !== 'sentence' && s.fixes.length && !s.fixes[0].preview && !s.fixes[0].template
        && s.fixes[0].start >= sent.start && s.fixes[0].end <= sent.end)
      .map((s) => ({ suggestion: s, fix: s.fixes[0] }))
      .sort((a, b) => a.fix.start - b.fix.start || a.fix.end - b.fix.end);
    const items = [];
    for (const c of candidates) {
      const last = items[items.length - 1];
      if (last && c.fix.start < last.fix.end) continue; // overlapping: keep the first
      items.push(c);
    }
    if (items.length < 2) continue;
    const used = new Set(items.map((i) => i.suggestion));
    groups.push({ start: sent.start, end: sent.end, text: sent.text, items, tips: inside.filter((s) => !used.has(s)) });
  }
  return groups;
}

/** Default selection: every change except style-only ones. */
export const defaultOn = (item) => (item.suggestion.severity || 'advanced') !== 'style';

/**
 * Compose the preview for one group.
 * @param {string} text full document
 * @param {object} group from sentenceGroups
 * @param {(item) => boolean} isOn which changes are ticked
 */
export function composeSentence(text, group, isOn = defaultOn) {
  const chosen = group.items.filter(isOn);
  const local = chosen.map((i) => ({ text: i.fix.text, start: i.fix.start - group.start, end: i.fix.end - group.start }));
  const preview = applyFixes(group.text, local);
  const growth = chosen.reduce((n, i) => n + Math.max(0, tokenCount(i.fix.text) - tokenCount(text.slice(i.fix.start, i.fix.end))), 0);
  const ok = chosen.length > 0 && checkFix(text, { start: group.start, end: group.end, text: preview }, { maxGrowth: growth }).ok;
  // The smallest range covering the chosen fixes, so accepting replaces only that (one undo step).
  const lo = chosen.length ? Math.min(...chosen.map((i) => i.fix.start)) : group.start;
  const hi = chosen.length ? Math.max(...chosen.map((i) => i.fix.end)) : group.start;
  const rangeText = applyFixes(text.slice(lo, hi), chosen.map((i) => ({ text: i.fix.text, start: i.fix.start - lo, end: i.fix.end - lo })));
  return {
    preview, ok, count: chosen.length,
    edit: { start: lo, end: hi, text: rangeText },
    label: `Built from ${chosen.length} rule fix${chosen.length === 1 ? '' : 'es'} in this sentence. No new wording.`,
  };
}

/**
 * "Make consistent" (round 6, G1): apply several independent fixes as one edit (one undo step).
 * Each fix must pass the guard on its own; the composed range is re-checked with maxGrowth = the sum of the parts.
 */
export function composeFixes(text, fixes, { docVariant = false } = {}) {
  const sorted = [...fixes].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) if (sorted[i].start < sorted[i - 1].end) return { ok: false, count: 0 };
  if (!sorted.length) return { ok: false, count: 0 };
  const each = sorted.every((f) => checkFix(text, f, { docVariant }).ok);
  const lo = sorted[0].start;
  const hi = sorted[sorted.length - 1].end;
  const rangeText = applyFixes(text.slice(lo, hi), sorted.map((f) => ({ text: f.text, start: f.start - lo, end: f.end - lo })));
  const growth = sorted.reduce((n, f) => n + Math.max(0, tokenCount(f.text) - tokenCount(text.slice(f.start, f.end))), 0);
  const edit = { start: lo, end: hi, text: rangeText };
  const ok = each && checkFix(text, edit, { maxGrowth: growth, docVariant }).ok;
  return { ok, edit, count: sorted.length };
}
