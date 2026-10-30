// Round 9: a small rule-based chunker for the new rules only (rules/syllabus.js,
// rules/document2.js). Older detectors keep their own regexes and are not changed.
// Every tag comes from a closed word list or a spelling ending. No statistics, no model.
import { BE, MODALS, PREPOSITIONS, BASE_VERBS, DET_POSS } from './data/usage-lists.js';
import { IRREGULAR } from './data/lists.js';
import { IRREGULAR_BASE } from './morph.js';
import { PAST_TO_BASE } from './rules/grammar.js';
import { words, splitSentences } from './text.js';

const set = (s) => new Set(s.trim().split(/\s+/));

export const NOM_PRONOUNS = set('i we he she they');
export const OBJ_PRONOUNS = set('me us him her them whom');
export const COORD = set('and but or nor yet so');
export const SUBORD = set('if when whenever because although though while whereas unless since once until before after as whether that which who whom whose where');
export const DO_HAVE = set('do does did has have had');
const PAST_FORMS = new Set([...Object.values(IRREGULAR), ...Object.keys(PAST_TO_BASE)]);
const PARTICIPLES = new Set([...Object.keys(IRREGULAR), ...Object.keys(IRREGULAR_BASE)]);

/** Is this lower-case word a finite verb form (by closed lists or a regular ending on a known base)? */
export function isFiniteVerb(w) {
  if (BE.has(w) && !['be', 'been', 'being'].includes(w)) return true;
  if (MODALS.has(w) || DO_HAVE.has(w) || PAST_FORMS.has(w)) return true;
  if (/^[a-z]{3,}ed$/.test(w) && (BASE_VERBS.has(w.slice(0, -2)) || BASE_VERBS.has(w.slice(0, -1)) || BASE_VERBS.has(w.slice(0, -3)))) return true;
  if (/^[a-z]{3,}s$/.test(w) && !/ss$/.test(w) && (BASE_VERBS.has(w.slice(0, -1)) || BASE_VERBS.has(w.replace(/es$/, '')) || BASE_VERBS.has(w.replace(/ies$/, 'y')))) return true;
  return BASE_VERBS.has(w);
}

/** Past participle by closed lists or a regular -ed ending. */
export function isParticiple(w) {
  return PARTICIPLES.has(w) || /^[a-z]{3,}ed$/.test(w);
}

/** Tag one word. Tags: DET PRON OBJ PREP COORD SUB BE MODAL AUX VERB ING PART ADV NUM WORD. */
export function tagOf(w) {
  if (/^\d/.test(w)) return 'NUM';
  if (DET_POSS.has(w)) return 'DET';
  if (NOM_PRONOUNS.has(w) || w === 'it' || w === 'you') return 'PRON';
  if (OBJ_PRONOUNS.has(w)) return 'OBJ';
  if (COORD.has(w)) return 'COORD';
  if (SUBORD.has(w)) return 'SUB';
  if (PREPOSITIONS.has(w)) return 'PREP';
  if (BE.has(w)) return 'BE';
  if (MODALS.has(w)) return 'MODAL';
  if (DO_HAVE.has(w)) return 'AUX';
  if (/^[a-z]{3,}ing$/.test(w)) return 'ING';
  if (isParticiple(w)) return 'PART';
  if (isFiniteVerb(w)) return 'VERB';
  if (/^[a-z]{4,}ly$/.test(w)) return 'ADV';
  return 'WORD';
}

/**
 * Tokens of one sentence with offsets, tags and the punctuation that comes before each token.
 * @returns {Array<{text, low, start, end, tag, gap}>}
 */
export function tokens(sentence) {
  const ws = words(sentence.text, sentence.start);
  return ws.map((w, i) => {
    const prevEnd = i ? ws[i - 1].end : sentence.start;
    const gap = sentence.text.slice(prevEnd - sentence.start, w.start - sentence.start);
    const low = w.text.toLowerCase().replace(/’/g, "'");
    return { ...w, low, tag: tagOf(low), gap };
  });
}

/** Sentences of the text, each with its tokens. */
export function chunkSentences(text) {
  return splitSentences(text).map((s) => ({ ...s, toks: tokens(s) }));
}

/** True if any punctuation that breaks a clause (, ; : ( — –) sits before token i. */
export const breaksBefore = (t) => /[,;:()—–]/.test(t.gap);

/** True if the offset sits inside double quotes on its line (quoted speech is left alone). */
export function insideQuotes(text, index) {
  const lineStart = text.lastIndexOf('\n', index - 1) + 1;
  const before = text.slice(lineStart, index);
  return (before.match(/"/g) || []).length % 2 === 1 || (before.match(/“/g) || []).length > (before.match(/”/g) || []).length;
}
