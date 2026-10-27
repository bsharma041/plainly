import { VERY_PAIRS, STOPWORDS, AI_VOCAB } from '../data/lists.js';
import { THESAURUS } from '../data/thesaurus.js';
import { matchCase, paragraphs, words, sameInflection, splitSentences } from '../text.js';

const CAT = 'engagement';

function intensifiers(text, out) {
  const re = /\b(very|really)\s+([a-z]+)\b/gi;
  let m;
  while ((m = re.exec(text))) {
    const key = `${m[1].toLowerCase()} ${m[2].toLowerCase()}`;
    const strong = VERY_PAIRS[key];
    if (!strong) continue;
    out.push({
      rule: 'intensifier', category: CAT, scope: 'word', start: m.index, end: m.index + m[0].length, original: m[0],
      title: `Try "${strong}"`, message: `One precise word can replace "${m[0]}". Keep it if the casual tone is on purpose.`,
      fixes: [{ text: matchCase(m[0], strong), start: m.index, end: m.index + m[0].length }],
    });
  }
}

// Words the writer can't avoid repeating (N1): words in a heading or Keywords
// line, words in a two-word term used twice ("power sector"), and topic terms
// (4+ uses and at least 1% of the words).
function protectedWords(text) {
  // Round 8 (R8-4): words inside fixed unit phrases ("per cent", "₹ … crore") are never "repeated".
  const keep = new Set(['cent', 'percent', 'lakh', 'lakhs', 'crore', 'crores', 'million', 'billion', 'units', 'kwh', 'mwh', 'gwh']);
  const all = words(text);
  const counts = new Map();
  for (const w of all) { const k = w.text.toLowerCase(); counts.set(k, (counts.get(k) || 0) + 1); }
  // Topic terms only in documents of 150+ words; in short texts the ratio is met by any repeated word.
  if (all.length >= 150) for (const [k, n] of counts) if (n >= 4 && n / all.length >= 0.01) keep.add(k);
  for (const p of paragraphs(text)) {
    const ws = words(p.text);
    const heading = /^\s*key\s*words\s*:/i.test(p.text) || (ws.length <= 20 && !/[.!?]["'”’)]*\s*$/.test(p.text));
    if (heading) for (const w of ws) keep.add(w.text.toLowerCase());
  }
  const bigrams = new Map();
  for (const sent of splitSentences(text)) {
    const ws = words(sent.text).map((w) => w.text.toLowerCase());
    for (let i = 1; i < ws.length; i++) {
      if (STOPWORDS.has(ws[i - 1]) || STOPWORDS.has(ws[i])) continue;
      const key = `${ws[i - 1]} ${ws[i]}`;
      bigrams.set(key, (bigrams.get(key) || 0) + 1);
    }
  }
  for (const [key, n] of bigrams) if (n >= 2) for (const w of key.split(' ')) keep.add(w);
  return keep;
}

// Flags a content word used 3+ times inside a 40-word window of one paragraph, once per paragraph.
function repetition(text, out) {
  const keep = protectedWords(text);
  for (const p of paragraphs(text)) {
    const ws = words(p.text, p.start);
    const seen = new Map();
    ws.forEach((w, i) => {
      const k = w.text.toLowerCase();
      if (k.length < 4 || STOPWORDS.has(k) || keep.has(k) || /^[A-Z]/.test(w.text) && i > 0) return;
      const list = seen.get(k) || [];
      list.push(i);
      seen.set(k, list);
    });
    for (const [k, idxs] of seen) {
      for (let j = 2; j < idxs.length; j++) {
        if (idxs[j] - idxs[j - 2] > 40) continue;
        const w = ws[idxs[j]];
        const syns = (THESAURUS[k] || []).filter((s) => !AI_VOCAB.has(s) && sameInflection(w.text, s)).slice(0, 4);
        out.push({
          rule: 'repetition', category: CAT, severity: 'style', scope: 'word', start: w.start, end: w.end, original: w.text,
          title: `"${w.text}" repeats`, message: `You've used "${k}" ${j + 1} times in a few lines. A different word here can help, or keep it if the repetition is deliberate. Double-click any word for more synonyms.`,
          fixes: syns.map((s) => ({ text: matchCase(w.text, s), start: w.start, end: w.end })),
        });
        break; // one card per word per paragraph
      }
    }
  }
}

export function engagementRules(text, opts = {}) {
  const out = [];
  intensifiers(text, out);
  if (opts.repetition !== false) repetition(text, out);
  return out;
}
