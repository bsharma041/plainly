import { AI_PHRASES } from '../data/lists.js';
import { escapeRegex, words } from '../text.js';
import { phraseFix } from './clarity.js';

const CAT = 'voice';
const PHRASE_RE = [...AI_PHRASES].sort((a, b) => b[0].length - a[0].length).map(([from, to]) => ({
  re: new RegExp(`(?<![A-Za-z-])${escapeRegex(from).replace(/'/g, "['’]")}(?![A-Za-z-])`, 'gi'), from, to,
}));

function aiPhrases(text, out) {
  const taken = [];
  for (const { re, to } of PHRASE_RE) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const start = m.index, end = start + m[0].length;
      if (taken.some(([a, b]) => start < b && end > a)) continue; // longer phrase already matched
      taken.push([start, end]);
      out.push({
        rule: 'ai-phrase', category: CAT, scope: 'word', start, end, original: m[0],
        title: 'Sounds AI-written',
        message: to == null
          ? `"${m[0]}" is a stock phrase common in AI-generated text. Say the specific thing you mean.`
          : `"${m[0]}" is a stock phrase common in AI-generated text.${to ? ` "${to}" says it plainly.` : ' Cutting it loses nothing.'}`,
        fixes: to == null ? [] : [phraseFix(text, start, end, to)],
      });
    }
  }
}

function notJust(text, out) {
  const re = /\b(it['’]s|it is|this is|that['’]s) not (just|only|merely|simply) [^.;!?]{1,80}[,;—-]\s*(it['’]s|it is|this is|that['’]s|but)\b/gi;
  let m;
  while ((m = re.exec(text))) {
    out.push({
      rule: 'not-just', category: CAT, scope: 'word', start: m.index, end: m.index + m[0].length, original: m[0],
      title: 'Formulaic contrast', message: '"It\'s not just X, it\'s Y" is a pattern AI text leans on. Stating Y directly is usually stronger.', fixes: [],
    });
  }
}

function emDashes(text, out) {
  const dashes = [...text.matchAll(/\s?—\s?/g)];
  const n = words(text).length;
  if (dashes.length < 4 || n < 150 || dashes.length / Math.max(n, 1) < 1 / 120) return;
  for (const d of dashes) {
    out.push({
      rule: 'em-dash', category: CAT, scope: 'word', start: d.index, end: d.index + d[0].length, original: d[0],
      title: 'Heavy em dash use',
      message: `This text has ${dashes.length} em dashes. Heavy use is a common tell of AI writing. A comma, colon or full stop often works.`,
      fixes: [{ text: ', ', start: d.index, end: d.index + d[0].length, label: 'Use a comma' },
        { text: ': ', start: d.index, end: d.index + d[0].length, label: 'Use a colon' }],
    });
  }
}

export function voiceRules(text) {
  const out = [];
  aiPhrases(text, out);
  notJust(text, out);
  emDashes(text, out);
  return out;
}
