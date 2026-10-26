// Round 2 rules (docs/review/round-1-review.md §4.2): other correlatives (R2b),
// "one of the + singular" (R6b), serial comma consistency (R9), title
// capitalisation (R10), hyphenation (R11) and verb patterns (R12). As in
// usage.js, every fix is the writer's words, re-inflected by morph.js or
// re-punctuated, plus words from data/usage-lists.js.
import {
  BE, MODALS, SUBJECT_PRONOUNS, PREPOSITIONS, BASE_VERBS, NOUN_SUFFIX, NOUN_LIST, ADJ_SUFFIX, ADJ_LIST,
  COUNT_NOUNS, UNCOUNTABLE, COMPOUND_MODIFIERS, HYPHEN_NOUNS, PARTICIPLE_HEADS, LY_NOT_ADVERB,
  GERUND_VERBS, TO_GERUND_FRAMES, TITLE_MINOR, SUBORDINATORS, DET_POSS, NOUN_VERBS,
} from '../data/usage-lists.js';
import { STOPWORDS, IRREGULAR } from '../data/lists.js';
import { RULE_INFO } from '../data/rule-info.js';
import { matchCase, splitSentences, words, paragraphs, escapeRegex, isSentenceStart, capitalize } from '../text.js';
import { baseFromIng, pluralize, ingForm } from '../morph.js';
import { PAST_TO_BASE } from './grammar.js';
import { neitherPairsWithOr } from '../neither.js';

function make(rule, category, severity, start, end, original, fixes, title, message) {
  return {
    rule, category, severity, ruleName: RULE_INFO[rule]?.name || title,
    title, message, start, end, original, scope: 'word',
    fixes: fixes.map((f) => (typeof f === 'string' ? { text: f, start, end } : f)),
  };
}

function insideQuotes(text, index) {
  const lineStart = text.lastIndexOf('\n', index - 1) + 1;
  const before = text.slice(lineStart, index);
  return (before.match(/"/g) || []).length % 2 === 1 || (before.match(/“/g) || []).length > (before.match(/”/g) || []).length;
}
const lineOf = (text, i) => {
  const s = text.lastIndexOf('\n', i - 1) + 1;
  const e = text.indexOf('\n', i);
  return text.slice(s, e < 0 ? text.length : e);
};
const isKeywords = (line) => /^\s*key\s*words\s*:/i.test(line);
const skip = (text, i) => insideQuotes(text, i) || isKeywords(lineOf(text, i));

function wordAfter(text, end) {
  const m = text.slice(end, end + 40).match(/^ +([A-Za-z0-9][A-Za-z0-9'’-]*)/);
  return m ? { text: m[1], lower: m[1].toLowerCase(), start: end + m[0].length - m[1].length, end: end + m[0].length } : null;
}
function wordBefore(text, start) {
  if (isSentenceStart(text, start)) return '';
  const m = text.slice(Math.max(0, start - 40), start).match(/([A-Za-z0-9'’-]+)\s*$/);
  return m ? m[1].toLowerCase() : '';
}
const HAVE_DO = new Set(['has', 'have', 'had', 'do', 'does', 'did']);
const PASTS = new Set([...Object.values(IRREGULAR), ...Object.keys(PAST_TO_BASE)]);

// ---------- R2b other correlatives ----------
const NUMBER_WORDS = new Set(`a an one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen
  seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million billion lakh crore
  few several dozen half`.trim().split(/\s+/));
const isNumberWord = (w) => /^\d/.test(w) || NUMBER_WORDS.has(w.toLowerCase());
function correlatives(text, out) {
  // Round 5: no correlative card on a heading line set off above a paragraph ("Neither Study A or Study B").
  const paras = paragraphs(text);
  const heads = headingParagraphs(text, paras).filter((h) => paras.indexOf(h) < paras.length - 1);
  for (const sent of splitSentences(text)) {
    if (skip(text, sent.start)) continue;
    if (heads.some((h) => sent.start >= h.start && sent.start < h.end)) continue;
    const ws = words(sent.text, sent.start);
    const low = ws.map((w) => w.text.toLowerCase());
    for (let i = 0; i < ws.length; i++) {
      // neither … or -> "nor" (the guard's one named negation exception), only within one clause and
      // only when "neither" isn't a determiner ("Neither study controls for income or region").
      if (low[i] === 'neither') {
        for (let j = i + 1; j < Math.min(ws.length, i + 10); j++) {
          if (low[j] === 'nor') break;
          if (low[j] === 'or') {
            if (neitherPairsWithOr(text, ws[i].end, ws[j].start)) {
              out.push(make('correlative', 'correctness', 'advanced', ws[j].start, ws[j].end, ws[j].text, [matchCase(ws[j].text, 'nor')],
                'Use "nor" after "neither"', '"Neither" pairs with "nor": "neither X nor Y".'));
            }
            break;
          }
        }
      }
      // either … nor -> "or"
      if (low[i] === 'either') {
        for (let j = i + 1; j < Math.min(ws.length, i + 13); j++) {
          if (low[j] === 'or') break;
          if (low[j] === 'nor') {
            out.push(make('correlative', 'correctness', 'advanced', ws[j].start, ws[j].end, ws[j].text, [matchCase(ws[j].text, 'or')],
              'Use "or" after "either"', '"Either" pairs with "or": "either X or Y".'));
            break;
          }
        }
      }
      // between X or Y -> "and" (X at most 4 words; not "between X and Y or Z")
      if (low[i] === 'between') {
        for (let j = i + 2; j < Math.min(ws.length, i + 6); j++) {
          if (low[j] === 'and') break;
          if (low[j] === 'or') {
            const gap = sent.text.slice(ws[i].end - sent.start, ws[j].start - sent.start);
            if (/[,;:.]/.test(gap)) break;
            // Round 5 (G1): "between one or two projects" is an approximate number, not a choice. Skip when the
            // words on both sides of "or" are numerals or number words.
            const left = sent.text.slice(0, ws[j].start - sent.start).match(/([A-Za-z0-9]+)\s*$/);
            const right = sent.text.slice(ws[j].end - sent.start).match(/^\s*([A-Za-z0-9]+)/);
            if (left && right && isNumberWord(left[1]) && isNumberWord(right[1])) break;
            out.push(make('correlative', 'correctness', 'advanced', ws[j].start, ws[j].end, ws[j].text, [matchCase(ws[j].text, 'and')],
              '"Between" takes "and"', 'A choice "between" two things joins them with "and": "between X and Y".'));
            break;
          }
        }
      }
    }
    // both X as well as Y -> "and"
    const re = /\bboth\s+((?:[A-Za-z'’-]+\s+){1,6}?)as well as\b/gi;
    let m;
    while ((m = re.exec(sent.text))) {
      const at = sent.start + m.index + m[0].length - 'as well as'.length;
      const original = text.slice(at, at + 10);
      out.push(make('correlative', 'correctness', 'advanced', at, at + 10, original, [matchCase(original, 'and')],
        '"Both" takes "and"', '"Both" pairs with "and": "both X and Y". "As well as" doesn\'t complete it.'));
    }
  }
}

// ---------- R6b one of the + singular ----------
const R6B = /\bone of the\s+((?:[a-z-]+\s+){0,2}?)([a-z]+)\b(?=\s+(?:that|which|who|is|was|in|for|of|to)\b|\s*[,.;!?])/gi;

function oneOfThe(text, out) {
  R6B.lastIndex = 0;
  let m;
  while ((m = R6B.exec(text))) {
    const n = m[2].toLowerCase();
    if (skip(text, m.index)) continue;
    if (/s$/.test(n) || /(est|ing|ly)$/.test(n) || UNCOUNTABLE.has(n) || STOPWORDS.has(n)) continue;
    if (!(COUNT_NOUNS.has(n) || ((NOUN_SUFFIX.test(n) || NOUN_LIST.has(n)) && !ADJ_SUFFIX.test(n)))) continue;
    const start = m.index + m[0].length - m[2].length;
    const fix = matchCase(m[2], pluralize(m[2]));
    out.push(make('one-of-plural', 'correctness', 'advanced', start, start + m[2].length, m[2], [fix],
      `Use the plural "${fix}"`, `"One of the" picks one from a group, so the noun is plural: "one of the … ${fix}".`));
  }
}

// ---------- R9 serial comma consistency ----------
function itemTokens(s) {
  return (s.match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g) || []);
}
function validItem(s, { first = false, max = 6 } = {}) {
  let toks = itemTokens(s);
  if (first) {
    // The first item may follow a preposition or a participle: "With limited land resources", "considering solar potential".
    while (toks.length && (PREPOSITIONS.has(toks[0].toLowerCase()) || (/ing$/i.test(toks[0]) && BASE_VERBS.has(baseFromIng(toks[0]))))) toks = toks.slice(1);
  }
  if (!toks.length || toks.length > max) return false;
  const low = toks.map((t) => t.toLowerCase());
  if (!low.some((t) => /[a-z]/.test(t))) return false;
  if (SUBORDINATORS.has(low[0])) return false;
  for (const [ti, t] of low.entries()) {
    if (BE.has(t) || MODALS.has(t) || HAVE_DO.has(t) || PASTS.has(t) || SUBJECT_PRONOUNS.has(t)) return false;
    if (t === 'both' || t === 'either' || t === 'neither' || t === 'between') return false;
    if (/ing$/.test(t) && BASE_VERBS.has(baseFromIng(t))) return false;
    // "this paper examines the pathway": a third-person verb makes it a clause, not an item.
    const stem = t.replace(/(es|s)$/, '');
    // Round 3 (F5): an -s word ending its item is a plural noun ("costs, risks and benefits"); a verb would take an object.
    if (/s$/.test(t) && !/ss$/.test(t) && t !== low[0] && ti !== low.length - 1 && (BASE_VERBS.has(stem) || BASE_VERBS.has(t.slice(0, -1))) && !NOUN_LIST.has(stem) && !NOUN_LIST.has(t.slice(0, -1))) return false;
  }
  return true;
}

const isStopper = (t) => SUBJECT_PRONOUNS.has(t) || BE.has(t) || MODALS.has(t) || HAVE_DO.has(t) || PASTS.has(t)
  || PREPOSITIONS.has(t) || BASE_VERBS.has(t) || (/s$/.test(t) && BASE_VERBS.has(t.replace(/e?s$/, ''))) || (/ed$/.test(t));
/** The words after the last verb, pronoun or preposition: "We model hourly demand" -> "hourly demand". */
function trailingNP(s) {
  const toks = itemTokens(s);
  let i = toks.length;
  // The item's own last word may end in -s or -ed as a noun ("compare costs"); only a pronoun, auxiliary,
  // preposition or base verb stops it there.
  const hardStop = (t) => SUBJECT_PRONOUNS.has(t) || BE.has(t) || MODALS.has(t) || HAVE_DO.has(t) || PREPOSITIONS.has(t) || BASE_VERBS.has(t);
  while (i > 0 && !(i === toks.length ? hardStop(toks[i - 1].toLowerCase()) : isStopper(toks[i - 1].toLowerCase()))) i--;
  return i === toks.length || i === 0 ? '' : toks.slice(i).join(' ');
}

function findLists(text) {
  const lists = [];
  for (const sent of splitSentences(text)) {
    if (skip(text, sent.start)) continue;
    const segs = [];
    const re = /[,;:](?=\s)/g;
    let last = 0, left = '^', m;
    while ((m = re.exec(sent.text))) { segs.push({ s: last, e: m.index, left }); left = m[0]; last = m.index + 1; }
    segs.push({ s: last, e: sent.text.length, left });
    for (let k = 1; k < segs.length; k++) {
      const seg = segs[k];
      const raw = sent.text.slice(seg.s, seg.e);
      const serial = raw.match(/^(\s+)(and|or)\s+([\s\S]*)$/i);
      let kind, lastItem, priorNeeded, span;
      if (serial) {
        if (seg.left !== ',') continue;
        kind = 'serial';
        lastItem = serial[3];
        priorNeeded = 2;
        // "potential, and" -> "potential and"
        const prev = sent.text.slice(segs[k - 1].s, segs[k - 1].e);
        const lw = prev.match(/([A-Za-z0-9'’)-]+)\s*$/);
        if (!lw) continue;
        const start = sent.start + segs[k - 1].e - lw[0].length + (lw[0].length - lw[1].length);
        const end = sent.start + seg.s + serial[1].length + serial[2].length;
        span = { start, end, coord: serial[2] };
      } else {
        const open = raw.match(/^(\s*)([^]+?)\s+(and|or)\s+([\s\S]+)$/i);
        if (!open) continue;
        if (!validItem(open[2])) continue;
        kind = 'open';
        lastItem = open[4];
        priorNeeded = 1;
        const lw = open[2].match(/([A-Za-z0-9'’)-]+)$/);
        const coordAt = sent.start + seg.s + open[1].length + open[2].length;
        const after = sent.text.slice(coordAt - sent.start).match(/^\s+(and|or)/i);
        span = { start: coordAt - lw[1].length, end: coordAt + after[0].length, coord: open[3] };
      }
      const lastClean = lastItem.replace(/[.!?)"”’]+\s*$/, '');
      if (!validItem(lastClean, { max: 10 })) continue;
      let prior = 0;
      for (let j = k - 1; j >= 0; j--) {
        let t = sent.text.slice(segs[j].s, segs[j].e);
        const isFirst = segs[j].left !== ',';
        // "We need land, water, and labour": the first item is the noun phrase after the verb.
        if (isFirst && !validItem(t, { first: true })) t = trailingNP(t);
        if (!validItem(t, { first: isFirst })) break;
        prior++;
        if (isFirst) break;
      }
      if (prior < priorNeeded) continue;
      lists.push({ kind, ...span });
    }
  }
  return lists;
}

function serialComma(text, out, opts) {
  const lists = findLists(text);
  if (!lists.length) return;
  const mode = opts.serialComma || 'auto';
  const serial = lists.filter((l) => l.kind === 'serial');
  const open = lists.filter((l) => l.kind === 'open');
  let flag = [];
  if (mode === 'always') flag = open;
  else if (mode === 'never') flag = serial;
  else if (serial.length && open.length) flag = serial.length < open.length ? serial : open; // tie: serial is the default
  for (const l of flag) {
    const original = text.slice(l.start, l.end);
    if (l.kind === 'open') {
      const fix = original.replace(/\s+(and|or)$/i, (mm, c) => `, ${c}`);
      out.push(make('serial-comma', 'correctness', 'style', l.start, l.end, original, [fix], 'Serial comma',
        mode === 'always' ? `Your setting puts a comma before the final "${l.coord}" in a list.`
          : `Elsewhere you put a comma before the final "${l.coord}" in a list. Do the same here for consistency.`));
    } else {
      const fix = original.replace(/,\s+(and|or)$/i, (mm, c) => ` ${c}`);
      out.push(make('serial-comma', 'correctness', 'style', l.start, l.end, original, [fix], 'Serial comma',
        mode === 'never' ? `Your setting leaves out the comma before the final "${l.coord}" in a list.`
          : `Elsewhere you leave out the comma before the final "${l.coord}" in a list. Do the same here for consistency.`));
    }
  }
}

// ---------- R10 title capitalisation ----------
/** Heading lines (round 3, F6): the first line of the document, or a set-off short line followed by a
 *  line of 8+ words. Runs of 3+ consecutive short lines are lists. Each entry has `hasNext`. */
function headingParagraphs(text, paras = paragraphs(text)) {
  // Round 3 (F6): a heading is set off: the first line of the document, or a line with a blank line (or the
  // start) above and a line of 8+ words below. Runs of 3+ consecutive short lines are lists, not headings.
  const short = (p) => { const n = words(p.text).length; return n >= 1 && n <= 20 && !/[.!?]["'”’)]*\s*$/.test(p.text); };
  return paras.filter((p, i) => {
    const ws = words(p.text);
    if (!(ws.length >= 2 && short(p)) || isKeywords(p.text)) return false;
    const prev = paras[i - 1], next = paras[i + 1];
    const adjacent = (a, b) => a && b && !/\n\s*\n/.test(text.slice(a.end, b.start));
    let run = 1;
    for (let j = i - 1; j >= 0 && short(paras[j]) && adjacent(paras[j], paras[j + 1]); j--) run++;
    for (let j = i + 1; j < paras.length && short(paras[j]) && adjacent(paras[j - 1], paras[j]); j++) run++;
    if (run >= 3) return false;
    if (i === 0) return true;
    const blankAbove = /\n\s*\n/.test(text.slice(prev.end, p.start));
    return blankAbove && next && words(next.text).length >= 8;
  });
}

function titleCase(text, out) {
  const paras = paragraphs(text);
  const headings = headingParagraphs(text, paras);
  if (!headings.length) return;
  const body = paras.filter((p) => !headings.includes(p)).map((p) => p.text).join('\n');
  for (const h of headings) {
    const ws = words(h.text, h.start);
    const content = [];
    ws.forEach((w, i) => {
      const t = w.text;
      if (i === 0) return;
      if (/:\s*$/.test(text.slice(Math.max(h.start, w.start - 3), w.start))) return; // first word after a colon
      if (t.length > 1 && t === t.toUpperCase()) return; // acronym
      if (/^[A-Z]$/.test(t)) return; // a single capital is a label: "Study A", "Scenario B"
      if (/^.+[A-Z]/.test(t.replace(/-.*/, ''))) return; // internal capitals: iPhone, McKinsey
      content.push(w);
    });
    const esc = (t) => escapeRegex(t);
    const isProper = (t) => new RegExp(`[a-z,;]\\s+${esc(t)}\\b`).test(body);
    const counted = content.filter((w) => !TITLE_MINOR.has(w.text.toLowerCase()) && !(/^[A-Z]/.test(w.text) && isProper(w.text)));
    if (counted.length < 2) continue;
    const caps = counted.filter((w) => /^[A-Z]/.test(w.text)).length;
    const ratioLower = 1 - caps / counted.length;
    if (ratioLower >= 0.7) {
      for (const w of counted) {
        if (!/^[A-Z]/.test(w.text)) continue;
        const lower = w.text.toLowerCase();
        if (!new RegExp(`\\b${esc(lower)}\\b`).test(body)) continue;
        const fix = lower;
        out.push(make('title-case', 'correctness', 'style', w.start, w.end, w.text, [fix], `Lowercase "${fix}"`,
          `This heading is in sentence case, and "${fix}" is lowercase elsewhere in your text, so it isn't a name.`));
      }
    } else if (caps / counted.length >= 0.7) {
      for (const w of content) {
        const low = w.text.toLowerCase();
        if (TITLE_MINOR.has(low)) {
          if (/^[A-Z]/.test(w.text)) {
            out.push(make('title-case', 'correctness', 'style', w.start, w.end, w.text, [low], `Lowercase "${low}"`,
              `In title case, short words like "${low}" stay lowercase.`));
          }
        } else if (/^[a-z]/.test(w.text)) {
          const fix = capitalize(w.text);
          out.push(make('title-case', 'correctness', 'style', w.start, w.end, w.text, [fix], `Capitalise "${fix}"`,
            'This heading is in title case, so main words start with a capital.'));
        }
      }
    }
  }
}

// ---------- R11 hyphenation ----------
const nounLike = (w) => w && /^[a-z]/i.test(w.text) && !STOPWORDS.has(w.lower) && !PREPOSITIONS.has(w.lower)
  && !BE.has(w.lower) && !MODALS.has(w.lower) && !/ly$/.test(w.lower) && !/ed$/.test(w.lower);
const COMPOUND_RE = new RegExp(`\\b(${COMPOUND_MODIFIERS.map((c) => c.replace(/ /g, '\\s')).join('|')})\\b(?!-)`, 'gi');

const SINGULAR_DET = new Set(['the', 'a', 'an', 'this', 'that', 'its', 'their', 'our', 'his', 'her', 'my', 'your', 'each', 'every', 'no', 'any']);
const PAST_HEADS = new Set(['led', 'owned', 'based', 'driven', 'funded', 'focused', 'related', 'linked', 'connected', 'constrained', 'oriented']);
function finiteVerbAfter(text, from, head) {
  const rest = text.slice(from).split(/[.!?;\n]/)[0].toLowerCase();
  return (rest.match(/[a-z]+/g) || []).some((t) => BE.has(t) || MODALS.has(t) || HAVE_DO.has(t) || PASTS.has(t) || (/ed$/.test(t) && t !== head));
}

function hyphenation(text, out) {
  let m;
  COMPOUND_RE.lastIndex = 0;
  while ((m = COMPOUND_RE.exec(text))) {
    const start = m.index, end = start + m[0].length;
    if (text[start - 1] === '-' || skip(text, start)) continue;
    const next = wordAfter(text, end);
    if (!nounLike(next)) continue;
    const before = text.slice(Math.max(0, start - 14), start).toLowerCase();
    if (/\b(in|over|on|at|for|into)\s+(the\s+|a\s+)?$/.test(before)) continue; // "in the long term"
    // "The long term looks": with a determiner before, a following -s word may be the verb.
    if (/\b(the|a|an)\s+$/.test(before) && /[^s]s$/.test(next.lower)) continue;
    const fix = m[0].replace(/\s+/g, '-');
    out.push(make('hyphenation', 'correctness', 'advanced', start, end, m[0], [fix], `Hyphenate "${fix}"`,
      `Before a noun, "${m[0]}" works as one describing word, so it takes hyphens: "${fix} ${next.text}".`));
  }
  const NB = /\b([a-z]+)\s([a-z]+)\b(?!-)/gi;
  NB.lastIndex = 0;
  while ((m = NB.exec(text))) {
    const w1 = m[1].toLowerCase(), w2 = m[2].toLowerCase();
    if (!PARTICIPLE_HEADS.has(w2)) { NB.lastIndex = m.index + m[1].length + 1; continue; }
    if (!(HYPHEN_NOUNS.has(w1) || NOUN_LIST.has(w1) || NOUN_SUFFIX.test(w1)) || /ly$/.test(w1) || /ing$/.test(w1)) continue;
    const start = m.index, end = start + m[0].length;
    if (text[start - 1] === '-' || skip(text, start)) continue;
    const next = wordAfter(text, end);
    if (!nounLike(next)) continue;
    // Round 3 (F2): "The community led protests against the plant": after a determiner, a past-tense head may
    // be the clause's only verb. Hyphenate only if another finite verb follows the noun in the same sentence.
    // Plural quantifiers ("many resource constrained states") can't head a singular subject, so they don't trigger this.
    if (PAST_HEADS.has(w2) && SINGULAR_DET.has(wordBefore(text, start)) && !finiteVerbAfter(text, next.end, w2)) continue;
    const fix = `${m[1]}-${m[2]}`;
    out.push(make('hyphenation', 'correctness', 'advanced', start, end, m[0], [fix], `Hyphenate "${fix}"`,
      `Before a noun, "${m[0]}" works as one describing word, so it takes a hyphen: "${fix} ${next.text}".`));
  }
  const LY = /\b([a-z]+ly)-([a-z]+)\b/gi;
  while ((m = LY.exec(text))) {
    if (LY_NOT_ADVERB.has(m[1].toLowerCase()) || skip(text, m.index)) continue;
    const fix = `${m[1]} ${m[2]}`;
    out.push(make('hyphenation', 'correctness', 'advanced', m.index, m.index + m[0].length, m[0], [fix], `No hyphen after "${m[1]}"`,
      `An adverb ending in -ly already links to the next word, so it takes no hyphen: "${fix}".`));
  }
}

// ---------- R12 verb patterns ----------
const GERUND_RE = new RegExp(`\\b(${GERUND_VERBS.map((v) => `${v}|${v}s|${v}d|${v}ed|${v}es`).join('|')})\\s+to\\s+([a-z]+)\\b`, 'gi');
const FRAME_RE = new RegExp(`\\b(${TO_GERUND_FRAMES.map((f) => f.replace(/ /g, '\\s+')).join('|')}|(?:get|gets|got|become|becomes|became)\\s+used\\s+to)\\s+([a-z]+)\\b`, 'gi');
const NOUN_FRAMES = [
  { re: /\b(ability|opportunity) of ([a-z]+ing)\b/gi, build: (m, base) => `${m[1]} to ${base}` },
  { re: /\b(in an attempt) of ([a-z]+ing)\b/gi, build: (m, base) => `${m[1]} to ${base}` },
];

const VERB_FOLLOWERS = new Set(['late', 'early', 'hard', 'harder', 'more', 'less', 'longer', 'overtime', 'it', 'them', 'this', 'that', 'these', 'those', 'the', 'a', 'an', 'our', 'their', 'his', 'her', 'its', 'my', 'your']);

function verbPatterns(text, out) {
  let m;
  GERUND_RE.lastIndex = 0;
  while ((m = GERUND_RE.exec(text))) {
    const base = m[2].toLowerCase();
    if (!BASE_VERBS.has(base) || skip(text, m.index)) continue;
    const prev = wordBefore(text, m.index);
    if (/^consider/i.test(m[1]) && BE.has(prev)) continue; // "is considered to be"
    if (DET_POSS.has(prev)) continue; // noun use: "the practice to …"
    const ing = ingForm(base, base);
    const fix = `${m[1]} ${matchCase(m[2], ing)}`;
    out.push(make('verb-pattern', 'correctness', 'advanced', m.index, m.index + m[0].length, m[0], [fix],
      `Use "${fix}"`, `"${m[1]}" is followed by an -ing form, not "to" + verb.`));
  }
  FRAME_RE.lastIndex = 0;
  while ((m = FRAME_RE.exec(text))) {
    const base = m[2].toLowerCase();
    if (!BASE_VERBS.has(base) || skip(text, m.index)) continue;
    // "in addition to cost", "key to growth": a word that is also a noun is read as the noun. Only after
    // "got/became used to" with an adverb or object next ("got used to work late") is it read as the verb.
    if (NOUN_VERBS.has(base) || NOUN_LIST.has(base)) {
      const nx = wordAfter(text, m.index + m[0].length);
      if (!/used\s+to$/i.test(m[1]) || !nx || !VERB_FOLLOWERS.has(nx.lower)) continue;
    }
    const at = m.index + m[0].length - m[2].length;
    const ing = matchCase(m[2], ingForm(base, base));
    out.push(make('verb-pattern', 'correctness', 'advanced', at, at + m[2].length, m[2], [ing],
      `Use "to ${ing}"`, `In "${m[1].replace(/\s+/g, ' ')}", "to" is a preposition, so the verb takes -ing: "to ${ing}".`));
  }
  for (const f of NOUN_FRAMES) {
    f.re.lastIndex = 0;
    while ((m = f.re.exec(text))) {
      const base = baseFromIng(m[2]);
      if (!BASE_VERBS.has(base) || skip(text, m.index)) continue;
      const fix = matchCase(m[0], f.build(m, base));
      out.push(make('verb-pattern', 'correctness', 'advanced', m.index, m.index + m[0].length, m[0], [fix],
        `Use "${fix}"`, `"${m[1]}" is followed by "to" + verb.`));
    }
  }
  // interest to V -> interest in V-ing (not "of interest to")
  const INT = /\binterest to ([a-z]+)\b/gi;
  while ((m = INT.exec(text))) {
    const base = m[1].toLowerCase();
    if (!BASE_VERBS.has(base) || skip(text, m.index)) continue;
    if (wordBefore(text, m.index) === 'of') continue;
    const fix = `interest in ${ingForm(base, base)}`;
    out.push(make('verb-pattern', 'correctness', 'advanced', m.index, m.index + m[0].length, m[0], [matchCase(m[0], fix)],
      `Use "${fix}"`, '"Interest" takes "in" + -ing.'));
  }
}

export function usageRules2(text, opts = {}) {
  const out = [];
  if ((opts.categories || {}).correctness === false) return out;
  correlatives(text, out);
  oneOfThe(text, out);
  serialComma(text, out, opts);
  titleCase(text, out);
  hyphenation(text, out);
  verbPatterns(text, out);
  return out;
}
