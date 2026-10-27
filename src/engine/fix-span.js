/**
 * Validate a suggestion's edit against the current document before applying it.
 * Sentence-level cards may highlight a whole sentence while their fixes edit a
 * smaller span, so validate both the card's source text and the fix's bounds.
 */
export function isApplicableFix(text, suggestion, fix) {
  if (typeof text !== 'string' || !suggestion || !fix || typeof fix.text !== 'string') return false;
  const { start, end, original } = suggestion;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)
    || start < 0 || end < start || end > text.length
    || typeof original !== 'string' || text.slice(start, end) !== original) return false;
  if (!Number.isSafeInteger(fix.start) || !Number.isSafeInteger(fix.end)
    || fix.start < start || fix.end < fix.start || fix.end > end) return false;
  return true;
}
