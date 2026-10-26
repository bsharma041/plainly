import { CONFUSIONS, AGREEMENT, INTRO_WORDS, CLAUSE_STARTERS, A_BEFORE_VOWEL_LETTER, AN_BEFORE_CONSONANT_LETTER } from '../data/lists.js';
import { SPELLING } from '../data/spelling.js';
import { matchCase, splitSentences, words, capitalize, isSentenceStart } from '../text.js';

const CAT = 'correctness';

function make(rule, start, end, original, fixText, title, message, extra = {}) {
  return {
    rule, category: CAT, title, message, start, end, original, scope: 'word',
    fixes: fixText == null ? [] : [{ text: fixText, start, end }],
    ...extra,
  };
}

function precedingWord(text, index) {
  const m = text.slice(Math.max(0, index - 30), index).match(/([A-Za-z'’]+)\s*$/);
  return m ? m[1].toLowerCase() : '';
}

function insideQuotes(text, index) {
  const lineStart = text.lastIndexOf('\n', index - 1) + 1;
  const before = text.slice(lineStart, index);
  const straight = (before.match(/"/g) || []).length;
  const open = (before.match(/“/g) || []).length;
  const close = (before.match(/”/g) || []).length;
  return straight % 2 === 1 || open > close;
}

function repeatedWords(text, out) {
  const re = /\b([A-Za-z]+)(\s+)\1\b/gi;
  let m;
  while ((m = re.exec(text))) {
    const w = m[1].toLowerCase();
    if (w === 'had' || w === 'that' || w === 'is' || w === 'bye' || w === 'no' || w === 'very') continue;
    if (m[2].includes('\n')) continue;
    out.push(make('repeated-word', m.index, m.index + m[0].length, m[0], m[1], 'Remove repeated word', `"${m[1]}" appears twice in a row.`));
  }
}

export function wantsAn(word) {
  // "an X-ray", "an F-16", "a T-shirt": a single letter is read by its name.
  if (/^[a-z]-/i.test(word)) return /^[aefhilmnorsx]-/i.test(word);
  if (AN_BEFORE_CONSONANT_LETTER.test(word)) return true;
  if (A_BEFORE_VOWEL_LETTER.test(word)) return false;
  return /^[aeiou]/i.test(word);
}

function articles(text, out) {
  const re = /\b(a|an)\s+([A-Za-z][A-Za-z-]*)/gi;
  let m;
  while ((m = re.exec(text))) {
    const [, art, next] = m;
    if (next.length < 2) continue; // "a b c", "an A grade"
    if (next === next.toUpperCase()) continue; // acronyms: pronunciation varies
    const prev = text[m.index - 1];
    if (prev && /[A-Za-z'’-]/.test(prev)) continue;
    // "Vitamin A", "Scenario A is": a capital A mid-sentence is a label, not the article.
    if (art === 'A' && !isSentenceStart(text, m.index)) continue;
    // Words starting "uni" split between sounds (unicorn vs unimportant); stay quiet unless listed.
    if (/^uni/i.test(next) && !A_BEFORE_VOWEL_LETTER.test(next)) continue;
    const isAn = art.toLowerCase() === 'an';
    const shouldBeAn = wantsAn(next);
    if (isAn === shouldBeAn) continue;
    const fix = matchCase(art, shouldBeAn ? 'an' : 'a');
    out.push(make('a-an', m.index, m.index + art.length, art, fix, `Use "${fix.toLowerCase()}"`,
      shouldBeAn ? `Use "an" before a vowel sound ("${next}").` : `Use "a" before a consonant sound ("${next}").`));
    re.lastIndex = m.index + art.length;
  }
}

function lowercaseI(text, out) {
  const re = /(^|[^A-Za-z0-9'’.\-_/])i(?=$|[\s'’,;:!?)"]|\.(?![A-Za-z]))/g;
  let m;
  while ((m = re.exec(text))) {
    const at = m.index + m[1].length;
    if (text[at - 1] === '(' || text[at + 1] === ')') continue; // (i), i) list markers
    out.push(make('lowercase-i', at, at + 1, 'i', 'I', 'Capitalize "I"', 'The pronoun "I" is always capitalized.'));
  }
}

function sentenceCaps(text, out) {
  for (const s of splitSentences(text)) {
    const m = s.text.match(/^[\s"'“‘(\[]*([a-z][A-Za-z'’]*)/);
    if (!m) continue;
    const word = m[1];
    if (/[A-Z]/.test(word)) continue; // iPhone, eBay
    if (/^[ivxlcdm]+$/.test(word) || /^\s*\(/.test(s.text)) continue; // (ii) list markers
    // A line with no closing punctuation above it is a heading or note: leave its casing alone.
    if (s.start > 0) {
      let k = s.start - 1;
      while (k >= 0 && /\s/.test(text[k]) && text[k] !== '\n') k--;
      if (k >= 0 && text[k] === '\n') {
        while (k >= 0 && /\s/.test(text[k])) k--;
        if (k >= 0 && !/[.!?]/.test(text[k])) continue;
      }
    }
    if (words(s.text).length < 3) continue; // list items, fragments in notes
    const before = text.slice(Math.max(0, s.start - 4), s.start);
    if (/\.\.\.\s*$|…\s*$/.test(before)) continue;
    if (/^(e\.g|i\.e|etc|vs|http|www)/.test(s.text.slice(m.index))) continue;
    const at = s.start + m[0].length - word.length;
    out.push(make('sentence-case', at, at + word.length, word, capitalize(word), 'Capitalize sentence start', 'Sentences start with a capital letter.'));
  }
}

function spacing(text, out) {
  let m;
  const dbl = /(\S)( {2,})(?=\S)/g;
  while ((m = dbl.exec(text))) {
    if (/[.!?]/.test(m[1])) continue; // two spaces after a full stop is a style choice
    const at = m.index + 1;
    out.push(make('double-space', at, at + m[2].length, m[2], ' ', 'Remove extra space', 'There are extra spaces here.'));
  }
  const before = /([A-Za-z0-9)"”’])( +)([,;:!?]|\.(?![.\d]))(?=\s|$)/g;
  while ((m = before.exec(text))) {
    if (m[3] === ':' && /\d/.test(m[1]) && /^\s*\d/.test(text.slice(m.index + m[0].length))) continue; // 10 : 30
    const at = m.index + m[1].length;
    out.push(make('space-before-punct', at, at + m[2].length + m[3].length, m[2] + m[3], m[3], 'Remove space before punctuation', 'Punctuation sits right after the word.'));
  }
  const after = /([a-z]{2,}),(?=[A-Za-z]{2,})/g;
  while ((m = after.exec(text))) {
    const at = m.index + m[1].length;
    out.push(make('space-after-comma', at, at + 1, ',', ', ', 'Add a space after the comma', 'A comma is followed by a space.'));
  }
}

function confusions(text, out) {
  for (const c of CONFUSIONS) {
    c.re.lastIndex = 0;
    let m;
    while ((m = c.re.exec(text))) {
      // "If prices are higher then demand falls": "then" is right after an "if" clause.
      if (/ then$/i.test(m[0]) && /\bif\b[^.;!?]*$/i.test(text.slice(Math.max(0, m.index - 80), m.index))) continue;
      out.push(make('confusion', m.index, m.index + m[0].length, m[0], matchCase(m[0], c.fix(m)), c.title, c.message));
    }
  }
}

function agreement(text, out) {
  for (const a of AGREEMENT) {
    a.re.lastIndex = 0;
    let m;
    while ((m = a.re.exec(text))) {
      const prev = precedingWord(text, m.index);
      if (a.guard.includes(prev)) continue;
      if (insideQuotes(text, m.index)) continue; // dialogue: nonstandard grammar is often the point
      const fix = matchCase(m[0], a.fix(m));
      out.push(make('agreement', m.index, m.index + m[0].length, m[0], fix, 'Fix subject-verb agreement', `The verb doesn't agree with "${m[1] || 'I'}". Try "${fix}".`));
    }
  }
}

function introComma(text, out) {
  const re = new RegExp(`(^|[.!?]\\s+|\\n\\s*)(${INTRO_WORDS.join('|')}) ([A-Za-z]+)`, 'g');
  let m;
  while ((m = re.exec(text))) {
    if (!CLAUSE_STARTERS.has(m[3].toLowerCase())) continue;
    // "However the money is spent, …" means "in whatever way": no comma.
    if (m[2] === 'However') {
      const rest = text.slice(m.index + m[0].length - m[3].length);
      const sentenceRest = rest.split(/[.!?\n]/)[0];
      if (sentenceRest.includes(',') && !/^(we|i|you|they|he|she|it|this|there)\s+(should|will|can|must|need|needs|have|has|had|are|is|was|were|do|did|would|could|may|might|also)\b/i.test(rest)) continue;
    }
    const at = m.index + m[1].length;
    const word = m[2];
    out.push(make('intro-comma', at, at + word.length, word, word + ',', `Add a comma after "${word}"`, `An introductory "${word}" is usually followed by a comma.`));
  }
}

/** dialect: 'auto' | 'us' | 'uk' */
export function detectDialect(text) {
  let us = 0, uk = 0;
  for (const w of words(text)) {
    const hit = SPELLING.get(w.text.toLowerCase());
    if (!hit) continue;
    if (hit.dialect === 'us') us++; else uk++;
  }
  if (us === uk) return null;
  return us > uk ? 'us' : 'uk';
}

function dialectSpelling(text, out, dialect) {
  const target = dialect === 'auto' ? detectDialect(text) : dialect;
  if (!target) return;
  for (const w of words(text)) {
    const hit = SPELLING.get(w.text.toLowerCase());
    if (!hit || hit.dialect === target) continue;
    if (/^[A-Z]/.test(w.text) && !isSentenceStart(text, w.start)) continue; // names: Centre for Policy Research
    const fix = matchCase(w.text, hit.other);
    const label = target === 'us' ? 'American' : 'British';
    const why = dialect === 'auto'
      ? `You mostly use ${label} spelling in this document. "${fix}" keeps it consistent.`
      : `"${fix}" is the ${label} spelling.`;
    out.push(make('dialect', w.start, w.end, w.text, fix, `Use ${label} spelling`, why));
  }
}

export function correctnessRules(text, opts) {
  const out = [];
  repeatedWords(text, out);
  articles(text, out);
  lowercaseI(text, out);
  sentenceCaps(text, out);
  spacing(text, out);
  confusions(text, out);
  agreement(text, out);
  introComma(text, out);
  dialectSpelling(text, out, opts.dialect || 'auto');
  return out;
}
