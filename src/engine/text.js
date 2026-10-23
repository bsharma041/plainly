// Text helpers shared by every rule. Pure functions, no DOM.

const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'vs', 'etc', 'e.g', 'i.e',
  'inc', 'ltd', 'co', 'no', 'fig', 'figs', 'approx', 'dept', 'govt', 'u.s', 'u.k',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
  'al', 'cf', 'p', 'pp', 'vol', 'ed', 'eds', 'rs', 'mt', 'ft', 'est',
]);

/** Split text into sentences with absolute offsets. Newlines always end a sentence. */
export function splitSentences(text) {
  const out = [];
  let start = 0;
  const push = (end) => {
    let s = start;
    while (s < end && /\s/.test(text[s])) s++;
    let e = end;
    while (e > s && /\s/.test(text[e - 1])) e--;
    if (e > s) out.push({ start: s, end: e, text: text.slice(s, e) });
    start = end;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\n') {
      push(i);
      continue;
    }
    if (ch !== '.' && ch !== '!' && ch !== '?') continue;

    let j = i + 1;
    while (j < text.length && /[.!?"'”’)\]]/.test(text[j])) j++;
    if (j < text.length && !/\s/.test(text[j])) continue; // "3.5", "e.g.x", URLs

    if (ch === '.' && j === i + 1) {
      // Look back at the word before the period.
      let k = i - 1;
      while (k >= 0 && /[A-Za-z.]/.test(text[k])) k--;
      const word = text.slice(k + 1, i).toLowerCase();
      const nextNonSpace = text.slice(j).match(/^\s*(\S)/);
      const nextIsLower = nextNonSpace && /[a-z]/.test(nextNonSpace[1]) && (word.length <= 3 || word.includes('.'));
      if (ABBREVIATIONS.has(word) || /^[a-z]$/i.test(word) || nextIsLower) {
        if (!(j < text.length && text[j] === '\n')) continue;
      }
    }
    push(j);
    i = j - 1;
  }
  push(text.length);
  return out;
}

/** Words with offsets. Apostrophes and inner hyphens stay inside the word. */
export function words(text, offset = 0) {
  const out = [];
  const re = /[A-Za-z][A-Za-z'’]*(?:-[A-Za-z]+)*/g;
  let m;
  while ((m = re.exec(text))) {
    out.push({ start: offset + m.index, end: offset + m.index + m[0].length, text: m[0] });
  }
  return out;
}

/** Paragraphs split on blank lines or single newlines, with offsets. */
export function paragraphs(text) {
  const out = [];
  const re = /[^\n]+/g;
  let m;
  while ((m = re.exec(text))) out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  return out;
}

/** Apply the casing pattern of `original` to `replacement`. */
export function matchCase(original, replacement) {
  if (!replacement) return replacement;
  if (original.length > 1 && original === original.toUpperCase() && /[A-Z]/.test(original)) {
    return replacement.toUpperCase();
  }
  if (/^[A-Z]/.test(original)) return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
}

/** True if `candidate` has the same ending (-ing, -ed, -s) as `word`, so a swap keeps the tense/number. */
export function sameInflection(word, candidate) {
  const w = word.toLowerCase();
  const head = candidate.toLowerCase().split(' ')[0];
  if (w.endsWith('ing')) return head.endsWith('ing');
  if (w.endsWith('ed')) return head.endsWith('ed');
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) return head.endsWith('s');
  if (head.endsWith('ing')) return false;
  return true;
}

export function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True if offset `pos` sits at the start of a sentence (ignoring leading quotes/brackets). */
export function isSentenceStart(text, pos) {
  let k = pos - 1;
  while (k >= 0 && /["'“‘(\[]/.test(text[k])) k--;
  while (k >= 0 && text[k] === ' ') k--;
  if (k < 0) return true;
  return /[.!?\n]/.test(text[k]);
}

/** Rough syllable count for readability scores. */
export function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const trimmed = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}
