// The "no AI text" guard. Every fix, from the built-in rules or from deep check,
// passes through isSafeFix() before the writer ever sees it. A fix is dropped
// (the card stays as advice only) unless every word it adds is:
//   - one of the writer's own words in the replaced span, or a form of one
//     (organise/organize, reviewed/reviews, written/wrote, sentnce/sentence), or
//   - from the tool's fixed, reviewed vocabulary (the lists in ./data).
// It is also dropped if it adds AI-filler vocabulary, creates a new AI-sounding
// phrase, adds an em dash, or grows the text by more than a few words.

import { CONFUSIONS, WORDY, REDUNDANCY, PLAIN_WORDS, VERY_PAIRS, AI_PHRASES, AI_VOCAB, IRREGULAR, STOPWORDS } from './data/lists.js';
import { THESAURUS } from './data/thesaurus.js';
import { SPELLING } from './data/spelling.js';
import { IRREGULAR_BASE } from './morph.js';
import { USAGE_INSERTS, NOMINALISATIONS, NOMINALISATIONS_US } from './data/usage-lists.js';
import { neitherPairsWithOr } from './neither.js';
import { words } from './text.js';

const lower = (s) => s.toLowerCase().replace(/[’]/g, "'");
const tokens = (s) => words(s).map((w) => lower(w.text));

// Closed vocabulary: everything the rules are allowed to add.
const CLOSED = new Set();
const addAll = (s) => { for (const t of tokens(String(s || ''))) CLOSED.add(t); };
for (const [from, to] of [...WORDY, ...REDUNDANCY]) { addAll(from); addAll(to); }
for (const [, to] of AI_PHRASES) addAll(to); // only the plain replacements, never the AI phrases
Object.values(PLAIN_WORDS).forEach(addAll);
Object.values(VERY_PAIRS).forEach(addAll);
Object.values(THESAURUS).flat().forEach(addAll);
Object.entries(IRREGULAR).flat().forEach(addAll);
Object.entries(IRREGULAR_BASE).flat().forEach(addAll);
for (const [w, v] of SPELLING) { addAll(w); addAll(v.other); }
STOPWORDS.forEach((w) => CLOSED.add(w));
for (const c of CONFUSIONS) addAll(c.title);
// Round 1 usage rules: every word they can insert (data/usage-lists.js).
addAll(USAGE_INSERTS);
Object.values(NOMINALISATIONS).flat().forEach(addAll);
Object.values(NOMINALISATIONS_US).flat().forEach(addAll);
addAll(`I me we us he him she her they them it you someone whom who
  am is are was were be been being has have had do does did done not cannot
  will would shall should can could may might must
  a an the this that these those there their they're it's its than then
  and but so yet or nor because however contrast this is
  have of to too lose effect affect regarding supposed used whose itself lot
  don't doesn't didn't isn't aren't wasn't weren't couldn't shouldn't wouldn't haven't hasn't hadn't won't can't
  i'm i've i'll i'd you're you've you'll they're they've they'll we're we've we'll that's what's there's let's he's she's
  going want kind sort somewhat yes no many children largely such as acceptable excellent very completely remove determine learn significant matter
  advise advice fewer monday tuesday wednesday thursday friday saturday sunday january february april june july september october november december
  english hindi french spanish german chinese japanese arabic bengali tamil telugu marathi gujarati urdu punjabi russian portuguese italian
  indian american british european african asian australian canadian
  gone come run seen eaten written broken taken given begun chosen driven spoken stolen drunk swum rung sung flown grown known thrown drawn forgotten hidden ridden shaken woken frozen torn worn fallen become
  go see eat write take give make know get find think tell buy bring say leave feel keep begin break choose speak pay send spend build hear mean meet sell teach understand win hold stand sit
  were was has does doing`);

// AI-filler words in any form: delve, delved, delving; leverage, leveraging.
const AI_STEMS = [...AI_VOCAB].filter((w) => w.length >= 5).map((w) => w.replace(/(e|s|es|ing|ed)$/, ''));
export function isAiWord(w) {
  const x = lower(w);
  return AI_VOCAB.has(x) || AI_STEMS.some((stem) => x.startsWith(stem) && x.length - stem.length <= 4);
}
for (const w of [...CLOSED]) if (isAiWord(w)) CLOSED.delete(w);

function editDistance(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 99;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

const INFLECTION = /^(s|es|ed|d|ing|er|ers|est|ly|n|en|'s|’s)?$/;

/** Is `w` a form of one of the writer's own words (inflection, spelling variant or typo fix)? */
function isFormOf(w, own) {
  for (const o of own) {
    if (w === o) return true;
    if (IRREGULAR[o] === w || IRREGULAR_BASE[o] === w) return true; // written -> wrote / write
    // Inflection of a short word: cut -> cutting, ban -> banned
    // Silent-e inflection: raise -> raising, use -> used.
    // Only for content words of 4+ letters: "the" -> "thing" must not pass (round 3, F3).
    if (o.length >= 4 && !STOPWORDS.has(o) && o.endsWith('e') && w.startsWith(o.slice(0, -1)) && /^(ing|ed|er|est)$/.test(w.slice(o.length - 1))) return true;
    if (w.length >= 4 && !STOPWORDS.has(w) && w.endsWith('e') && o.startsWith(w.slice(0, -1)) && /^(ing|ed)$/.test(o.slice(w.length - 1))) return true; // storing -> store
    if (o.length >= 3 && w.startsWith(o) && INFLECTION.test(w.slice(o.length).replace(/^(.)\1?/, (m) => (m.length === 2 && m[0] === m[1] ? '' : m)))) return true;
    if (o.length >= 3 && o.startsWith(w) && o.length - w.length <= 3) return true; // approved -> approve
    // Same stem and nearly the same word: organise/organize, reviewed/reviews, travelled/traveled
    if (w.length >= 5 && o.length >= 5 && w.slice(0, 5) === o.slice(0, 5) && editDistance(w, o) <= 3) return true;
    // Typo fix: one letter off for short words, two for longer ones (sentnce -> sentence)
    if (editDistance(w, o) <= (Math.min(w.length, o.length) < 6 ? 1 : 2)) return true;
  }
  return false;
}

const NEGATION = /^(not|never|no|none|nobody|nothing|neither|nor|cannot|without|dont|doesnt|didnt|isnt|arent|wasnt|werent|cant|couldnt|shouldnt|wouldnt|havent|hasnt|hadnt|wont|aint|neednt|mustnt)$|n't$/;
const negations = (list) => list.filter((w) => NEGATION.test(w)).length;

// Phrases the "Delivery" checks flag as AI-sounding; a fix must not create one.
const AI_PHRASE_RE = new RegExp(`(?<![A-Za-z])(${AI_PHRASES.map(([p]) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['’]")).join('|')})(?![A-Za-z])`, 'gi');
const countAiPhrases = (s) => (s.match(AI_PHRASE_RE) || []).length;

/** True only for replacing exactly "or" with "nor" when an earlier "neither" pairs with it in the same
 *  clause, by the same test the R2b rule uses (neither.js): no clause break, at most 8 words, not a determiner. */
export function isNeitherNorSwap(text, fix) {
  if (text.slice(fix.start, fix.end).toLowerCase() !== 'or' || fix.text.toLowerCase() !== 'nor') return false;
  const before = text.slice(0, fix.start);
  const m = before.match(/\bneither\b(?![\s\S]*\bneither\b)/i);
  if (!m) return false;
  return neitherPairsWithOr(text, m.index + m[0].length, fix.start);
}

/**
 * @param {string} text full document text
 * @param {{start:number,end:number,text:string}} fix
 * @returns {{ ok: boolean, reason?: string }}
 */
export function checkFix(text, fix, { remote = false, maxGrowth = 4 } = {}) {
  const before = text.slice(fix.start, fix.end);
  const after = fix.text;
  const beforeTokens = tokens(before);
  const afterTokens = tokens(after);
  // Hyphenation joins or splits the writer's own words: "long term" <-> "long-term".
  const own = new Set([...beforeTokens, ...beforeTokens.flatMap((t) => (t.includes('-') ? t.split('-') : []))]);
  const added = afterTokens.filter((w) => !own.has(w));

  // A fix may never flip meaning by adding a negation ("approved" -> "did not approve").
  // One named exception (round 3, Q2): "neither … or" -> "neither … nor" keeps the polarity "neither" already set.
  if (negations(afterTokens) > negations(beforeTokens) && !isNeitherNorSwap(text, fix)) return { ok: false, reason: 'adds a negation' };
  // Outside (deep-check) fixes stay small and local: no rephrasing of whole clauses.
  if (remote && (beforeTokens.length > 4 || added.length > 2)) return { ok: false, reason: 'remote fix too large' };

  for (const w of added) {
    if (isAiWord(w)) return { ok: false, reason: `adds AI-filler word "${w}"` };
    if (w.includes('-') && w.split('-').every((p) => own.has(p))) continue;
    if (!CLOSED.has(w) && !isFormOf(w, own)) return { ok: false, reason: `adds outside word "${w}"` };
  }
  // maxGrowth is raised only for a composed sentence preview (U1), whose parts each passed with the
  // default limit; it never applies to deep-check fixes.
  const growth = remote ? 4 : Math.max(4, maxGrowth);
  if (tokens(after).length > tokens(before).length + growth) return { ok: false, reason: 'adds too many words' };
  if ((after.match(/—/g) || []).length > (before.match(/—/g) || []).length) return { ok: false, reason: 'adds an em dash' };
  // Look at the surrounding sentence so phrases spanning the edit are caught.
  const lo = Math.max(0, fix.start - 80);
  const hi = Math.min(text.length, fix.end + 80);
  const windowBefore = text.slice(lo, hi);
  const windowAfter = text.slice(lo, fix.start) + after + text.slice(fix.end, hi);
  if (countAiPhrases(windowAfter) > countAiPhrases(windowBefore)) return { ok: false, reason: 'creates an AI-sounding phrase' };
  return { ok: true };
}

export const isSafeFix = (text, fix, opts) => checkFix(text, fix, opts).ok;

/** Strip unsafe fixes from a suggestion. A suggestion with none left becomes advice only. */
export function guardSuggestion(text, s) {
  const remote = s.source === 'languagetool';
  const fixes = s.fixes.filter((f) => isSafeFix(text, f, { remote }));
  return fixes.length === s.fixes.length ? s : { ...s, fixes };
}
