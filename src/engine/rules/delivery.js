// Goal-driven delivery checks. These only run when the writer picks a goal
// (formal writing, sounding confident), so casual writing is never "corrected"
// unless the writer asked for it.
import { matchCase, isSentenceStart } from '../text.js';
import { IRREGULAR } from '../data/lists.js';
import { phraseFix } from './clarity.js';

const CAT = 'voice';

const EXPAND = {
  "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "can't": 'cannot', "won't": 'will not',
  "wouldn't": 'would not', "couldn't": 'could not', "shouldn't": 'should not', "isn't": 'is not',
  "aren't": 'are not', "wasn't": 'was not', "weren't": 'were not', "haven't": 'have not', "hasn't": 'has not',
  "hadn't": 'had not', "i'm": 'I am', "i've": 'I have', "i'll": 'I will', "i'd": 'I would', "we're": 'we are',
  "we've": 'we have', "we'll": 'we will', "they're": 'they are', "they've": 'they have', "they'll": 'they will',
  "you're": 'you are', "you've": 'you have', "you'll": 'you will', "it's": 'it is', "that's": 'that is',
  "there's": 'there is', "what's": 'what is', "let's": 'let us', "he's": 'he is', "she's": 'she is',
};
const EXPAND_RE = new RegExp(`\\b(${Object.keys(EXPAND).map((k) => k.replace("'", "['’]")).join('|')})(?![A-Za-z])`, 'gi');

const INFORMAL = [
  ['gonna', 'going to'], ['wanna', 'want to'], ['gotta', 'have to'], ['kinda', 'somewhat'], ['sorta', 'somewhat'],
  ['yeah', 'yes'], ['nope', 'no'], ['lots of', 'many'], ['a lot of', 'many'], ['tons of', 'many'],
  ['kids', 'children'], ['pretty much', 'largely'], ['stuff', null], ['things like', 'such as'], ['okay', 'acceptable'],
  ['awesome', 'excellent'], ['super', 'very'], ['get rid of', 'remove'], ['figure out', 'determine'], ['find out', 'learn'],
  ['big deal', 'significant matter'], ['totally', 'completely'], ['anyway', null], ['basically', null],
];

const HEDGES = [
  ['I think that', ''], ['I think', ''], ['I believe that', ''], ['I believe', ''], ['I feel that', ''], ['I feel like', ''],
  ['I guess', ''], ['in my opinion,', ''], ['in my opinion', ''], ['maybe', null], ['perhaps', null], ['probably', null],
  ['sort of', ''], ['kind of', ''], ['somewhat', ''], ['a bit', ''], ['a little bit', ''], ['seems to', null],
  ['appears to', null], ['just', ''], ['hopefully', null], ['I hope', null], ['might', null], ['to some extent', ''],
];

const re = (phrase) => new RegExp(`(?<![A-Za-z])${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['’]")}(?![A-Za-z])`, 'gi');
const INFORMAL_RE = INFORMAL.map(([f, t]) => ({ re: re(f), f, t }));
const HEDGE_RE = [...HEDGES].sort((a, b) => b[0].length - a[0].length).map(([f, t]) => ({ re: re(f), f, t }));

function formality(text, out) {
  let m;
  EXPAND_RE.lastIndex = 0;
  while ((m = EXPAND_RE.exec(text))) {
    const key = m[0].toLowerCase().replace('’', "'");
    let full = EXPAND[key];
    const next = text.slice(m.index + m[0].length);
    // 's / 'd before been/got/had means has/had, not is/would.
    const nextWord = (next.match(/^\s+([a-z]+)/i) || [])[1]?.toLowerCase() || '';
    const participle = /(ed|en)$/.test(nextWord) || Object.prototype.hasOwnProperty.call(IRREGULAR, nextWord) || ['been', 'got', 'gone', 'done', 'seen', 'had'].includes(nextWord);
    // 's / 'd before a past participle means has / had: "It's gone well", "I'd seen it".
    // "'s" + participle is "has" only when an object or "been/got/gone/done" follows ("She's left the firm").
    // "It's based on", "He's tired" are "is" + adjective: offer no rewrite rather than guess.
    const thenObject = /^\s+[a-z]+\s+(the|a|an|his|her|their|our|my|your|its|this|that|these|those|me|us|him|them|it|some|many|no|any|\d)\b/i.test(next);
    let advise = false;
    if (key.endsWith("'s") && participle) {
      if (/^(been|got|gone|done|had)$/.test(nextWord) || thenObject) full = `${key.slice(0, -2)} has`;
      else advise = true;
    }
    if (key === "let's") advise = true; // "Let us meet" changes the tone
    if (key.endsWith("'d") && (participle || /^(better|already|never)$/.test(nextWord))) full = `${key.slice(0, -2)} had`;
    if (key.startsWith("i'")) full = `I${full.slice(1)}`;
    const fix = key.startsWith("i'") ? full : matchCase(m[0], full);
    out.push({
      rule: 'formality', category: CAT, scope: 'word', start: m.index, end: m.index + m[0].length, original: m[0],
      title: 'Formal goal: spell it out', message: `You set this document to formal. "${fix}" reads more formally than "${m[0]}".`,
      fixes: advise ? [] : [{ text: fix, start: m.index, end: m.index + m[0].length }],
    });
  }
  for (const { re: r, f, t: target } of INFORMAL_RE) {
    r.lastIndex = 0;
    while ((m = r.exec(text))) {
      if (/^[A-Z]/.test(m[0]) && !isSentenceStart(text, m.index)) continue; // "Super Bowl"
      let t = target;
      // "lots of time" can't become "many time": only offer "many" before a plural.
      if (t === 'many' && !/^\s+[a-z]+s\b/i.test(text.slice(m.index + m[0].length))) t = null;
      if (f === 'okay' && /^\s*[,.!?]/.test(text.slice(m.index + m[0].length))) t = null;
      out.push({
        rule: 'informal-word', category: CAT, scope: 'word', start: m.index, end: m.index + m[0].length, original: m[0],
        title: 'Formal goal: informal word', message: t ? `"${m[0]}" is casual for a formal document. "${t}" fits better.` : `"${m[0]}" is casual for a formal document.`,
        fixes: t ? [{ text: matchCase(m[0], t), start: m.index, end: m.index + m[0].length }] : [],
      });
    }
  }
}

function confidence(text, out) {
  const taken = [];
  for (const { re: r, t } of HEDGE_RE) {
    r.lastIndex = 0;
    let m;
    while ((m = r.exec(text))) {
      const start = m.index, end = start + m[0].length;
      if (taken.some(([a, b]) => start < b && end > a)) continue;
      taken.push([start, end]);
      const after = text.slice(end);
      const low = m[0].toLowerCase();
      if (low === 'just' && (/^\s+[a-z]+ed\b/i.test(after) || /\b(have|has|had|I've|we've|they've)\s+$/i.test(text.slice(Math.max(0, start - 10), start)))) continue; // "we just finished" = recently
      if (low === 'just' && /\b(a|an|the|more|most|very|so)\s+$/i.test(text.slice(Math.max(0, start - 6), start))) continue; // "a just process"
      if (low === 'just' && /^\s+(as|like|because|in time|now|then|after|before|one|a|an|the|\d|two|three|four|five|ten|over|under|about|enough)\b/i.test(after)) continue; // "just one" = "only one"
      if ((low === 'a bit' || low === 'a little bit') && /^\s+of\b/i.test(after)) continue; // "a bit of a problem"
      if ((low === 'kind of' || low === 'sort of') && /\b(what|which|this|that|the|a|any|every|some|same|other|one|no|each)\s+$/i.test(text.slice(Math.max(0, start - 12), start))) continue; // "what kind of data"
      out.push({
        rule: 'hedge', category: CAT, scope: 'word', start, end, original: m[0],
        title: 'Confident goal: hedging', message: t === '' ? `"${m[0]}" softens your point. Cutting it makes you sound surer.` : `"${m[0]}" softens your point. Keep it only where you really are unsure.`,
        fixes: t === '' ? [phraseFix(text, start, end, '')] : [],
      });
    }
  }
}

/** goals: { formality: 'informal'|'neutral'|'formal', confident: boolean } */
export function deliveryRules(text, goals = {}) {
  const out = [];
  if (goals.formality === 'formal') formality(text, out);
  if (goals.confident) confidence(text, out);
  return out;
}
