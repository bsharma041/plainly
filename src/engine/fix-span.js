/**
 * Validate a suggestion's edit against the current document before applying it.
 * Word-level suggestions normally may edit only their own span. Some explicit
 * sentence previews (notably passive-to-active rewrites) highlight a verb but
 * replace the whole sentence. Those expanded edits are allowed only when the
 * complete source sentence still matches the snapshot used to build the preview.
 */
export function isApplicableFix(text, suggestion, fix) {
  if (typeof text !== 'string' || !suggestion || !fix || typeof fix.text !== 'string') return false;
  const { start, end, original } = suggestion;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)
    || start < 0 || end < start || end > text.length
    || typeof original !== 'string' || text.slice(start, end) !== original) return false;

  if (!Number.isSafeInteger(fix.start) || !Number.isSafeInteger(fix.end)
    || fix.start < 0 || fix.end < fix.start || fix.end > text.length) return false;

  // Ordinary edits must stay inside the highlighted suggestion.
  if (fix.start >= start && fix.end <= end) return true;

  // An intentional sentence rewrite may expand beyond a word-level highlight,
  // but it must cover that highlight and match its exact original sentence.
  return fix.start <= start
    && fix.end >= end
    && fix.preview === fix.text
    && typeof fix.sourceText === 'string'
    && text.slice(fix.start, fix.end) === fix.sourceText;
}
