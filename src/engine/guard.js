// The "no AI text" guard. Every fix, from the built-in rules or from deep check,
// passes through isSafeFix() before the writer ever sees it. A fix is dropped
// (the card stays as advice only) unless every word it adds is:
//   - one of the writer's own words in the replaced span, or a form of one
//     (organise/organize, reviewed/reviews, written/wrote, sentnce/sentence), or
//   - from the tool's fixed, reviewed vocabulary (the lists in ./data).
// It is also dropped if it adds AI-filler vocabulary, creates a new AI-sounding
// phrase, adds an em dash, or grows the text by more than a few words.

import { CONFUSIONS, WORDY, PLAIN_WORDS, VERY_PAIRS, AI_PHRASES, AI_VOCAB, IRREGULAR, STOPWORDS } from './data/lists.js';
import { THESAURUS } from './data/thesaurus.js';
import { SPELLING } from './data/spelling.js';
import { IRREGULAR_BASE } from './morph.js';
import { words } from './text.js';

const lower = (s) => s.toLowerCase().replace(/[’]/g, "'");
const tokens = (s) => words(s).map((w) => lower(w.text));

// Closed vocabulary: everything the rules are allowed to add.
const CLOSED = new Set();
const addAll = (s) => { for (const t of tokens(String(s || ''))) CLOSED.add(t); };
for (const [from, to] of WORDY) { addAll(from); addAll(to); }
for (const [, to] of AI_PHRASES) addAll(to); // only the plain replacements, never the AI phrases
Object.values(PLAIN_WORDS).forEach(addAll);
Object.values(VERY_PAIRS).forEach(addAll);
Object.values(THESAURUS).flat().forEach(addAll);
Object.entries(IRREGULAR).flat().forEach(addAll);
Object.entries(IRREGULAR_BASE).flat().forEach(addAll);
for (const [w, v] of SPELLING) { addAll(w); addAll(v.other); }
STOPWORDS.forEach((w) => CLOSED.add(w));
for (const c of CONFUSIONS) addAll(c.title);
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

/** Is `w` a form of one of the writer's own words (inflection, spelling variant or typo fix)? */
function isFormOf(w, own) {
  for (const o of own) {
    if (w === o) return true;
    const stem = Math.min(w.length, o.length) >= 4 ? 4 : 3;
    if (w.length >= 3 && o.length >= 3 && w.slice(0, stem) === o.slice(0, stem)) return true; // reviewed -> reviews, organise -> organize
    if (o.length >= 4 && editDistance(w, o) <= 2) return true; // sentnce -> sentence
    if (IRREGULAR[o] === w || IRREGULAR_BASE[o] === w) return true; // written -> wrote / write
  }
  return false;
}

// Phrases the "Delivery" checks flag as AI-sounding; a fix must not create one.
const AI_PHRASE_RE = new RegExp(`(?<![A-Za-z])(${AI_PHRASES.map(([p]) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['’]")).join('|')})(?![A-Za-z])`, 'gi');
const countAiPhrases = (s) => (s.match(AI_PHRASE_RE) || []).length;

/**
 * @param {string} text full document text
 * @param {{start:number,end:number,text:string}} fix
 * @returns {{ ok: boolean, reason?: string }}
 */
export function checkFix(text, fix) {
  const before = text.slice(fix.start, fix.end);
  const after = fix.text;
  const own = new Set(tokens(before));
  const added = tokens(after).filter((w) => !own.has(w));

  for (const w of added) {
    if (isAiWord(w)) return { ok: false, reason: `adds AI-filler word "${w}"` };
    if (!CLOSED.has(w) && !isFormOf(w, own)) return { ok: false, reason: `adds outside word "${w}"` };
  }
  if (tokens(after).length > tokens(before).length + 4) return { ok: false, reason: 'adds too many words' };
  if ((after.match(/—/g) || []).length > (before.match(/—/g) || []).length) return { ok: false, reason: 'adds an em dash' };
  // Look at the surrounding sentence so phrases spanning the edit are caught.
  const lo = Math.max(0, fix.start - 80);
  const hi = Math.min(text.length, fix.end + 80);
  const windowBefore = text.slice(lo, hi);
  const windowAfter = text.slice(lo, fix.start) + after + text.slice(fix.end, hi);
  if (countAiPhrases(windowAfter) > countAiPhrases(windowBefore)) return { ok: false, reason: 'creates an AI-sounding phrase' };
  return { ok: true };
}

export const isSafeFix = (text, fix) => checkFix(text, fix).ok;

/** Strip unsafe fixes from a suggestion. A suggestion with none left becomes advice only. */
export function guardSuggestion(text, s) {
  const fixes = s.fixes.filter((f) => isSafeFix(text, f));
  return fixes.length === s.fixes.length ? s : { ...s, fixes };
}
