// Round 1 usage rules (spec docs/review/round-1-spec.md, R1–R8):
// compound-subject agreement, "both … and" parallelism, wordy purpose phrases,
// preposition pairings, list parallelism, fixed article idioms, vague phrases
// and nominalisations. Every fix is the writer's own words, re-inflected by
// morph.js, plus words from data/usage-lists.js. Nothing is generated.
import {
  DET_POSS, PREPOSITIONS, MODALS, BE, SUBJECT_PRONOUNS, RELATIVES, ADJ_SUFFIX, ADJ_LIST, NOUN_SUFFIX, NOUN_LIST,
  SINGULAR_S, UNIT_BINOMIALS, BASE_VERBS, COLLOCATIONS, ARTICLE_IDIOMS, WORDY_ADVICE, PURPOSE_PHRASES,
  NOMINALISATIONS, NOMINALISATIONS_US, CAPABILITY_VERBS, COLLOCATION_SKIP_NEXT, DEMAND_HEAD_NOUNS,
} from '../data/usage-lists.js';
import { STOPWORDS } from '../data/lists.js';
import { RULE_INFO } from '../data/rule-info.js';
import { matchCase, splitSentences, escapeRegex, isSentenceStart } from '../text.js';
import { baseFromIng, pluralize, pluralVerb, ingForm } from '../morph.js';
import { wantsAn, detectDialect } from './correctness.js';
import { phraseFix } from './clarity.js';

function make(rule, category, severity, start, end, original, fixes, title, message, extra = {}) {
  return {
    rule, category, severity, ruleName: extra.ruleName || RULE_INFO[rule]?.name || title,
    title, message, start, end, original, scope: 'word',
    fixes: fixes.map((f) => (typeof f === 'string' ? { text: f, start, end } : f)),
  };
}

function insideQuotes(text, index) {
  const lineStart = text.lastIndexOf('\n', index - 1) + 1;
  const before = text.slice(lineStart, index);
  return (before.match(/"/g) || []).length % 2 === 1 || (before.match(/“/g) || []).length > (before.match(/”/g) || []).length;
}

function onKeywordsLine(text, index) {
  const lineStart = text.lastIndexOf('\n', index - 1) + 1;
  return /^\s*key\s*words\s*:/i.test(text.slice(lineStart, lineStart + 12));
}

const skip = (text, i) => insideQuotes(text, i) || onKeywordsLine(text, i);

/** The word right after `end` (only spaces between), or null. */
function wordAfter(text, end) {
  const m = text.slice(end, end + 40).match(/^ +([A-Za-z0-9][A-Za-z0-9'’-]*)/);
  return m ? { text: m[1], lower: m[1].toLowerCase(), start: end + m[0].length - m[1].length, end: end + m[0].length } : null;
}

/** The word right before `start` (lowercase), or '' at a sentence start. */
function wordBefore(text, start) {
  if (isSentenceStart(text, start)) return '';
  const m = text.slice(Math.max(0, start - 40), start).match(/([A-Za-z0-9'’-]+)[\s,]*$/);
  return m ? m[1].toLowerCase() : '';
}

const isNounish = (w) => (NOUN_SUFFIX.test(w) || NOUN_LIST.has(w))
  && (!/s$/.test(w) || SINGULAR_S.has(w))
  && (!ADJ_SUFFIX.test(w) || NOUN_SUFFIX.test(w));
const isAdj = (w) => !/ly$/.test(w) && (ADJ_SUFFIX.test(w) || ADJ_LIST.has(w));
const HAVE = new Set(['has', 'have', 'had']);

// ---------- R1 compound-subject agreement ----------
const R1_HEAD = /^(The|This|Its|Their|Our|Such|His|Her|My|Your)\s+([A-Za-z]+)\s+and\s+(?:(?:the|its|their)\s+)?([A-Za-z]+)\s+(of|for|in|on|at|to)\s+/i;

function compoundSubject(text, out) {
  for (const s of splitSentences(text)) {
    if (skip(text, s.start)) continue;
    let off = 0;
    let m = R1_HEAD.exec(s.text);
    if (!m) {
      const opener = s.text.match(/^[A-Z][^,]{0,50},\s+/);
      if (!opener) continue;
      off = opener[0].length;
      m = R1_HEAD.exec(s.text.slice(off));
      if (!m) continue;
    }
    const n1 = m[2].toLowerCase();
    const n2 = m[3].toLowerCase();
    if (!isNounish(n1) || !isNounish(n2)) continue;
    if (UNIT_BINOMIALS.has(`${n1} and ${n2}`)) continue;
    const restStart = off + m[0].length;
    const tok = /[A-Za-z][A-Za-z'’-]*|[,;:—–()]/g;
    tok.lastIndex = restStart;
    let t;
    let count = 0;
    while ((t = tok.exec(s.text)) && count < 12) {
      const w = t[0].toLowerCase();
      if (!/[a-z]/.test(w)) break; // punctuation first: the verb may belong to another clause
      count++;
      const plural = pluralVerb(w);
      if (plural) {
        const at = s.start + t.index;
        const fix = matchCase(t[0], plural);
        out.push(make('compound-subject', 'correctness', 'critical', at, at + t[0].length, t[0], [fix],
          'Subject–verb agreement',
          `Two nouns joined by "and" ("${n1} and ${n2}") form a plural subject, so the verb is plural. Keep "${t[0]}" only if you mean one combined process.`));
        break;
      }
      if (RELATIVES.has(w) || BE.has(w) || MODALS.has(w) || HAVE.has(w)) break;
    }
  }
}

// ---------- R2 "both a X and Y N" ----------
const R2_RE = /\b(both)\s+(a|an)\s+([a-z-]+)\s+and\s+(?!a\b|an\b|the\b)([a-z-]+)\s+([a-z-]+)\b/gi;

function bothAnd(text, out) {
  R2_RE.lastIndex = 0;
  let m;
  while ((m = R2_RE.exec(text))) {
    const [all, both, art, g2, g3, g4] = m;
    const a2 = g2.toLowerCase(), a3 = g3.toLowerCase(), n = g4.toLowerCase();
    if (skip(text, m.index)) continue;
    const adj3 = isAdj(a3) || a3 === `de${a2}` || a3 === `non-${a2}` || a3 === `un${a2}`;
    if (!isAdj(a2) || !adj3) { R2_RE.lastIndex = m.index + both.length; continue; }
    if (STOPWORDS.has(n) || /ly$/.test(n) || BASE_VERBS.has(n) || MODALS.has(n) || BE.has(n)) continue;
    if (/s$/.test(n) && !SINGULAR_S.has(n)) continue;
    const end = m.index + all.length;
    const next = wordAfter(text, end);
    if (next && (next.lower === 'and' || next.lower === 'or')) continue; // nested coordination
    if (next && /^[a-z]/.test(next.text) && !STOPWORDS.has(next.lower) && !PREPOSITIONS.has(next.lower)) continue; // g4 is a modifier
    const fix1 = `${both} ${g2} and ${g3} ${pluralize(g4)}`;
    const fix2 = `${both} ${art} ${g2} and ${wantsAn(g3) ? 'an' : 'a'} ${g3} ${g4}`;
    out.push(make('both-and', 'correctness', 'advanced', m.index, end, all, [fix1, fix2],
      'Make "both … and" parallel',
      `After "both", the two halves should match. "${art}" covers only "${g2}", so either repeat it or make the noun plural.`));
  }
}

// ---------- R3 wordy purpose constructions ----------
const R3_RE = /\b(is|are|was|were)\s+aimed\s+at\s+([a-z]+ing)\b/gi;
const AIM = { is: 'aims', are: 'aim', was: 'aimed', were: 'aimed' };

function wordyPurpose(text, out) {
  R3_RE.lastIndex = 0;
  let m;
  while ((m = R3_RE.exec(text))) {
    if (skip(text, m.index)) continue;
    const base = baseFromIng(m[2]);
    if (!BASE_VERBS.has(base)) continue;
    const fix = matchCase(m[0], `${AIM[m[1].toLowerCase()]} to ${base}`);
    out.push(make('wordy-purpose', 'clarity', 'advanced', m.index, m.index + m[0].length, m[0], [fix],
      'Wordy: use the active verb',
      `"${m[0]}" is a roundabout passive. "${fix}" says the same thing in fewer words.`));
  }
  for (const p of PURPOSE_PHRASES) {
    p.re.lastIndex = 0;
    while ((m = p.re.exec(text))) {
      if (skip(text, m.index)) continue;
      let to = 'to';
      if (p.ing) {
        const base = baseFromIng(m[1]);
        if (!BASE_VERBS.has(base)) continue;
        to = `to ${base}`;
      }
      const fix = matchCase(m[0], to);
      out.push(make('wordy-purpose', 'clarity', 'advanced', m.index, m.index + m[0].length, m[0], [fix],
        `Wordy: use "${fix}"`, `"${m[0]}" is a long way to say "${fix}".`));
    }
  }
}

// ---------- R4 prepositions and collocations ----------
const SUBJ_PREV = new Set([...SUBJECT_PRONOUNS, 'to', ...MODALS]);

function prepositions(text, out, opts) {
  let uk = null;
  const isUk = () => {
    if (uk == null) uk = opts.dialect === 'uk' || ((opts.dialect || 'auto') === 'auto' && detectDialect(text) === 'uk');
    return uk;
  };
  for (const row of COLLOCATIONS) {
    row.re.lastIndex = 0;
    let m;
    while ((m = row.re.exec(text))) {
      const start = m.index;
      let end = start + m[0].length;
      if (skip(text, start)) continue;
      if (row.ukOnly && !isUk()) continue;
      const prev = wordBefore(text, start);
      if (row.skipPrev && row.skipPrev.test(prev)) continue;
      const next = wordAfter(text, end);
      if (next && COLLOCATION_SKIP_NEXT.test(next.lower)) continue; // "similar with respect to"
      if (row.skipNext && next && row.skipNext.test(next.lower)) continue;
      if (row.nextIn && !(next && row.nextIn.test(next.lower))) continue;
      if (row.nextIn) {
        // "demand of power plants for coal": the listed noun modifies another noun, or "for" follows.
        const after = (text.slice(next.end, next.end + 60).match(/^[^.;:!?\n]*/)[0].toLowerCase().match(/[a-z]+/g) || []);
        if (after[0] && (DEMAND_HEAD_NOUNS.has(after[0]) || (/[^s]s$/.test(after[0]) && !PREPOSITIONS.has(after[0]) && !/^(is|was|has|does)$/.test(after[0])))) continue;
        if (after.slice(0, 4).includes('for')) continue;
      }
      if (row.next === 'np' && !(next && (DET_POSS.has(next.lower) || /^[A-Z]/.test(next.text) || /['’]s$/.test(next.text) || /^\d/.test(next.text)))) continue;
      if (row.next === 'base' && !(next && BASE_VERBS.has(next.lower))) continue;
      if (row.next === 'ing' && !(next && /ing$/.test(next.lower) && BASE_VERBS.has(baseFromIng(next.lower)))) continue;
      const head = (m[1] || m[0]).toLowerCase();
      const subjOk = prev === '' || SUBJ_PREV.has(prev);
      if (row.prev === 'subj-or-inflected' && !(subjOk || /(es|ed|ing)$/.test(head))) continue;
      if (row.prev === 'subj-or-past' && !(subjOk || /ed$/.test(head))) continue;
      let nextInfo = null;
      if (row.eatNext) {
        nextInfo = { ing: ingForm(next.lower, next.lower) };
        end = next.end;
      }
      const original = text.slice(start, end);
      const fixes = row.fix(m, nextInfo).map((f) => ({ text: matchCase(original, f), start, end }));
      const title = fixes.length ? `Preposition: "${fixes[0].text}"` : 'Preposition: "different from"';
      out.push(make('preposition', 'correctness', row.severity || 'advanced', start, end, original, fixes, title, row.msg,
        { ruleName: row.name || 'Preposition choice' }));
    }
  }
}

// ---------- R5 faulty parallelism in a series ending in a modal verb phrase ----------
const R5_RE = /\b(is|are|was|were|be|remain|remains)\s+((?:[a-z]+ly\s+)?([a-z-]+))\b([^,;:.!?\n]*),\s+((?:[a-z]+ly\s+)?([a-z-]+))\b([^,;:.!?\n]*?),?\s+and\s+(can|could|may|might|will|would)\s+([a-z]+)\b/gi;

function segmentOk(seg) {
  const ws = seg.toLowerCase().match(/[a-z][a-z'’-]*/g) || [];
  return !ws.some((w) => BE.has(w) || MODALS.has(w) || HAVE.has(w) || SUBJECT_PRONOUNS.has(w));
}

function listParallel(text, out) {
  R5_RE.lastIndex = 0;
  let m;
  while ((m = R5_RE.exec(text))) {
    const [all, be, , adj1, seg1, , adj2, seg2, modal, verb] = m;
    const retry = () => { R5_RE.lastIndex = m.index + be.length; };
    if (skip(text, m.index)) { retry(); continue; }
    if (!isAdj(adj1.toLowerCase()) || !isAdj(adj2.toLowerCase()) || !segmentOk(seg1) || !segmentOk(seg2)) { retry(); continue; }
    // A relative clause ("technologies that are …") allows "that can …". Only when "that"/"which"
    // sits right before the verb: in "suggest that the plan is …", "that" is not a relative.
    const relative = /\b(that|which)\s+$/i.test(text.slice(Math.max(0, m.index - 12), m.index));
    const start = m.index + all.search(/\b(can|could|may|might|will|would)\s+[a-z]+$/i);
    const end = m.index + all.length;
    const original = text.slice(start, end);
    const fixes = [];
    const lowModal = modal.toLowerCase();
    // "can" + a capability verb is ability; "can rise / can catch fire" is possibility, where "able to" changes the meaning.
    if (lowModal === 'can' && CAPABILITY_VERBS.has(verb.toLowerCase())) fixes.push(`able to ${verb}`);
    if (relative) fixes.push(`that ${modal} ${verb}`);
    // With no safe fix, the card is a clarity tip rather than a correctness error.
    out.push(make('list-parallel', fixes.length ? 'correctness' : 'clarity', fixes.length ? 'advanced' : 'style', start, end, original, fixes,
      'Keep the list parallel',
      fixes.some((f) => f.startsWith('able'))
        ? `The first items in this list are adjectives ("${adj1}", "${adj2}"), so the last one should be too: "able to ${verb}". Or make it a separate clause: "that ${modal} ${verb}".`
        : relative
          ? `The first items in this list are adjectives ("${adj1}", "${adj2}"), but the last is a verb phrase. Make it its own clause: "that ${modal} ${verb}".`
          : `The first items in this list are adjectives ("${adj1}", "${adj2}"), but the last is a verb phrase ("${modal} ${verb}"). Consider making it a separate clause or sentence.`));
  }
}

// ---------- R6 fixed article idioms ----------
const BULK_RE = /\b(a)\s+bulk\s*(\(([^()]*)\)\s*)?of\b/gi;
const MOST_RE = /\bthe most of (the|our|their|its|these|those)\b/gi;

function articleIdioms(text, out) {
  let m;
  const idiom = (start, end, original, fix, phrase, extra = '') => out.push(make('article-idiom', 'correctness', 'critical', start, end, original, [fix],
    `Fixed phrase: "${phrase}"`, `The idiom is "${phrase}"${extra}.`));
  BULK_RE.lastIndex = 0;
  while ((m = BULK_RE.exec(text))) {
    if (skip(text, m.index)) continue;
    const why = ' ("the bulk of" means "most of")';
    if (m[2]) {
      if ((m[3].match(/\S+/g) || []).length > 6) continue;
      idiom(m.index, m.index + 1, m[1], matchCase(m[1], 'the'), 'the bulk of', why);
    } else {
      idiom(m.index, m.index + m[0].length, m[0], matchCase(m[0], 'the bulk of'), 'the bulk of', why);
    }
  }
  for (const row of ARTICLE_IDIOMS) {
    row.re.lastIndex = 0;
    while ((m = row.re.exec(text))) {
      if (skip(text, m.index)) continue;
      idiom(m.index, m.index + m[0].length, m[0], matchCase(m[0], row.fix), row.fix);
    }
  }
  MOST_RE.lastIndex = 0;
  while ((m = MOST_RE.exec(text))) {
    if (skip(text, m.index)) continue;
    if (/^(make|makes|made|making|get|gets|got|getting)$/.test(wordBefore(text, m.index))) continue;
    idiom(m.index, m.index + m[0].length, m[0], matchCase(m[0], `most of ${m[1]}`), `most of ${m[1]}`);
  }
}

// ---------- R7 vague connectors ----------
const ADVICE_RE = WORDY_ADVICE.map((row) => ({ ...row, re: new RegExp(`\\b${escapeRegex(row.phrase)}\\b`, 'gi') }));

function vaguePhrases(text, out, opts) {
  const formal = opts.goals?.formality === 'formal' || opts.domain === 'academic';
  for (const row of ADVICE_RE) {
    if (row.formalOnly && !formal) continue;
    row.re.lastIndex = 0;
    let m;
    while ((m = row.re.exec(text))) {
      const start = m.index, end = start + m[0].length;
      if (skip(text, start)) continue;
      const prevWord = wordBefore(text, start);
      if (row.skipPrev && row.skipPrev.test(prevWord)) continue;
      // "similar with respect to cost": after an adjective the phrase is a fixed complement, not padding.
      if (row.skipAfterAdj && isAdj(prevWord)) continue;
      const fixes = row.fixes.map((f) => phraseFix(text, start, end, f));
      const first = row.fixes[0];
      const title = row.title || (first ? `Vague phrase: try "${first}"` : first === '' ? 'Vague phrase: remove' : `Vague phrase: "${row.phrase}"`);
      const message = row.msg || (first
        ? `"${m[0]}" is wordy. "${first}" says the same thing more directly.`
        : first === '' ? `"${m[0]}" adds words without adding meaning.` : `"${m[0]}" is vague. Say the specific relation you mean.`);
      out.push(make('vague-phrase', 'clarity', 'style', start, end, m[0], fixes, title, message));
    }
  }
}

// ---------- R8 nominalisation ----------
const NOM_KEYS = Object.keys(NOMINALISATIONS).join('|');
// "before/after/without the NOM of" are left out on purpose: "After introducing the tax, prices rose"
// would create a dangling modifier. "understand/learn the NOM of" are left out because "how to"
// changes the meaning ("learn the development of language" ≠ "learn how to develop language").
// Round 2 (F7): only "for" and "in", and only nouns whose "of" phrase is the object. Ergative nouns
// ("the development of the city" = the city develops) stay available to (b), where "plan" gives the agent.
const ERGATIVE = new Set(['development', 'expansion', 'transformation', 'integration', 'reduction', 'improvement']);
const NOM_A_KEYS = Object.keys(NOMINALISATIONS).filter((k) => !ERGATIVE.has(k)).join('|');
const NOM_A = new RegExp(`\\b(for|in)\\s+(the\\s+(${NOM_A_KEYS})\\s+of)\\s+(?=[A-Za-z])`, 'gi');
const NOM_B = new RegExp(`\\b(plan|plans|planned|planning|decide|decides|decided|deciding)\\s+(the\\s+(${NOM_KEYS})\\s+of)\\s+(?=[A-Za-z])`, 'gi');

function nominalisations(text, out, opts) {
  let us = null;
  const forms = (nom) => {
    const key = nom.toLowerCase();
    if (NOMINALISATIONS_US[key]) {
      if (us == null) us = opts.dialect === 'us' || ((opts.dialect || 'auto') === 'auto' && detectDialect(text) === 'us');
      if (us) return NOMINALISATIONS_US[key];
    }
    return NOMINALISATIONS[key];
  };
  for (const [re, build] of [[NOM_A, (f) => f[1]], [NOM_B, (f) => `how to ${f[0]}`]]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const start = m.index + m[0].indexOf(m[2], m[1].length);
      const end = start + m[2].length;
      if (skip(text, start)) continue;
      const next = wordAfter(text, end);
      if (next && /ing$/.test(next.lower)) continue; // "the analysis of measuring"
      const fix = build(forms(m[3]));
      out.push(make('nominalisation', 'clarity', 'advanced', start, end, m[2], [fix],
        'Use the verb, not the noun',
        `"${m[2]}" turns an action into a noun. "${fix}" is shorter and names the action.`));
    }
  }
}

export function usageRules(text, opts = {}) {
  const out = [];
  const cats = opts.categories || {};
  if (cats.correctness !== false) {
    compoundSubject(text, out);
    bothAnd(text, out);
    prepositions(text, out, opts);
    listParallel(text, out);
    articleIdioms(text, out);
  }
  if (cats.clarity !== false) {
    wordyPurpose(text, out);
    vaguePhrases(text, out, opts);
    nominalisations(text, out, opts);
  }
  return out;
}
