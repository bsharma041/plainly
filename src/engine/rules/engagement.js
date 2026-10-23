import { VERY_PAIRS, STOPWORDS, AI_VOCAB } from '../data/lists.js';
import { THESAURUS } from '../data/thesaurus.js';
import { matchCase, paragraphs, words, sameInflection } from '../text.js';

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

// Flags a content word used 3+ times inside a 60-word window of one paragraph.
function repetition(text, out) {
  for (const p of paragraphs(text)) {
    const ws = words(p.text, p.start);
    const seen = new Map();
    ws.forEach((w, i) => {
      const k = w.text.toLowerCase();
      if (k.length < 4 || STOPWORDS.has(k) || /^[A-Z]/.test(w.text) && i > 0) return;
      const list = seen.get(k) || [];
      list.push(i);
      seen.set(k, list);
    });
    for (const [k, idxs] of seen) {
      for (let j = 2; j < idxs.length; j++) {
        if (idxs[j] - idxs[j - 2] > 60) continue;
        const w = ws[idxs[j]];
        const syns = (THESAURUS[k] || []).filter((s) => !AI_VOCAB.has(s) && sameInflection(w.text, s)).slice(0, 4);
        out.push({
          rule: 'repetition', category: CAT, scope: 'word', start: w.start, end: w.end, original: w.text,
          title: `"${w.text}" repeats`, message: `You've used "${k}" ${j + 1} times in a few lines. A different word here can help, or keep it if the repetition is deliberate. Double-click any word for more synonyms.`,
          fixes: syns.map((s) => ({ text: matchCase(w.text, s), start: w.start, end: w.end })),
        });
      }
    }
  }
}

export function engagementRules(text) {
  const out = [];
  intensifiers(text, out);
  repetition(text, out);
  return out;
}
