// Round 9: per-paragraph statistics for the Performance view. Counts only; nothing is suggested or inserted.
import { stats, readabilityLabel } from './score.js';
import { splitSentences, words } from './text.js';

/** One row per non-empty line (paragraph): words, sentences, average and longest sentence, readability. */
export function paragraphStats(text) {
  const out = [];
  const re = /[^\n]+/g;
  let m;
  while ((m = re.exec(text))) {
    const ptext = m[0];
    const wc = words(ptext).length;
    if (!wc) continue;
    const lens = splitSentences(ptext).map((s) => words(s.text).length).filter(Boolean);
    const st = stats(ptext);
    out.push({
      start: m.index, end: m.index + ptext.length, preview: ptext.trim().split(/\s+/).slice(0, 6).join(' '),
      words: wc, sentences: lens.length, avgSentence: st.avgSentence, longest: Math.max(...lens, 0),
      spread: lens.length ? Math.max(...lens) - Math.min(...lens) : 0,
      readability: st.readability, label: readabilityLabel(st.readability),
    });
  }
  return out;
}
