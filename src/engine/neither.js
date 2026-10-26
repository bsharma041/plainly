// Shared scope test for "neither … or" -> "nor" (round 4, F1). Used by the R2b rule
// (rules/usage2.js) and by the guard's one negation exception (guard.js), so the
// exception can never be wider than the rule.
import { DET_POSS, SUBJECT_PRONOUNS, ADJ_SUFFIX, ADJ_LIST } from './data/usage-lists.js';

const CLAUSE_BREAK = /[,;:(—–]/;
const CLAUSE_WORDS = new Set(['but', 'so', 'yet', 'and', 'because', 'while', 'although', 'which', 'that', 'who', 'whereas']);
const OBJ_PRONOUNS = new Set(['me', 'us', 'him', 'her', 'them', 'it', 'you', 'this', 'that', 'these', 'those']);

/**
 * Is "neither" at `nStart` (whose word ends at `nEnd`) paired with the "or" at `orStart` in one clause?
 * (a) "neither" is not a determiner: the next word is a determiner/possessive (not each/every/no), a pronoun,
 *     a capitalised name, or an adjective/participle; a bare noun ("neither study") means determiner use.
 * (b) No clause break between them: no , ; : ( — and none of but so yet and because while although which that who whereas.
 * (c) At most 8 words between them.
 */
export function neitherPairsWithOr(text, nEnd, orStart) {
  const between = text.slice(nEnd, orStart);
  if (CLAUSE_BREAK.test(between)) return false;
  const toks = between.match(/[A-Za-z][A-Za-z'’-]*/g) || [];
  if (toks.length === 0 || toks.length > 8) return false;
  if (toks.some((t) => CLAUSE_WORDS.has(t.toLowerCase()) || t.toLowerCase() === 'nor')) return false;
  const next = toks[0];
  const low = next.toLowerCase();
  if (low === 'of') return false;
  const notDeterminer = (DET_POSS.has(low) && !['each', 'every', 'no'].includes(low))
    || SUBJECT_PRONOUNS.has(low) || OBJ_PRONOUNS.has(low)
    || /^[A-Z]/.test(next)
    || /(ed|ing)$/.test(low) || ADJ_SUFFIX.test(low) || ADJ_LIST.has(low);
  return notDeterminer;
}
