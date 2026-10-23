import { words, splitSentences, syllables } from './text.js';

const WEIGHT = { correctness: 3, clarity: 1.2, voice: 1, engagement: 0.5 };

export function stats(text) {
  const ws = words(text);
  const sentences = splitSentences(text).filter((s) => words(s.text).length > 0);
  const syl = ws.reduce((n, w) => n + syllables(w.text), 0);
  const wc = ws.length;
  const sc = Math.max(1, sentences.length);
  const flesch = wc ? Math.round(206.835 - 1.015 * (wc / sc) - 84.6 * (syl / Math.max(1, wc))) : null;
  const lower = ws.map((w) => w.text.toLowerCase());
  const unique = new Set(lower).size;
  const longWords = ws.filter((w) => syllables(w.text) >= 3).length;
  const grade = wc ? Math.max(0, Math.round((0.39 * (wc / sc) + 11.8 * (syl / wc) - 15.59) * 10) / 10) : null;
  return {
    words: wc,
    grade,
    uniquePct: wc ? Math.round((unique / wc) * 100) : 0,
    longWordPct: wc ? Math.round((longWords / wc) * 100) : 0,
    avgWordLength: wc ? Math.round((ws.reduce((n, w) => n + w.text.length, 0) / wc) * 10) / 10 : 0,
    speakingMinutes: Math.max(wc ? 1 : 0, Math.round(wc / 130)),
    paragraphs: text.split(/\n\s*\n|\n/).filter((p) => p.trim()).length,
    characters: text.length,
    sentences: sentences.length,
    readingMinutes: Math.max(wc ? 1 : 0, Math.round(wc / 238)),
    readability: flesch == null ? null : Math.max(0, Math.min(100, flesch)),
    avgSentence: wc ? Math.round((wc / sc) * 10) / 10 : 0,
  };
}

export function readabilityLabel(score) {
  if (score == null) return '';
  if (score >= 70) return 'Easy';
  if (score >= 50) return 'Fairly clear';
  if (score >= 30) return 'Dense';
  return 'Very dense';
}

/** 0-100. Penalty scales with issues per word so long documents aren't punished for length. */
export function overallScore(text, suggestions) {
  const wc = words(text).length;
  if (!wc) return null;
  const penalty = suggestions.reduce((n, s) => n + (WEIGHT[s.category] || 1), 0);
  return Math.max(0, Math.min(100, Math.round(100 - (penalty / Math.max(wc, 40)) * 150)));
}
