// Which suggestions may join "Accept all". Only rules whose single fix is near-certain.
// Heuristic ones (a/an, agreement, comma splices, intro commas, comparatives) need a look first,
// and a "[who]" template always needs the writer.
export const BULK_SAFE = new Set(['lowercase-i', 'repeated-word', 'sentence-case', 'space-before-punct', 'space-after-comma', 'double-punct', 'apostrophe', 'capitalize', 'confusion', 'dialect', 'verb-form', 'double-space', 'article-idiom']);

export function isBulkSafe(s) {
  return s.category === 'correctness' && s.scope === 'word' && s.fixes.length === 1 && !s.fixes[0].preview
    && !s.fixes.some((f) => f.template)
    // Deep-check matches join only when they're plain spelling fixes with one candidate.
    && (BULK_SAFE.has(s.rule) || (s.source === 'languagetool' && Boolean(s.spelling)));
}
