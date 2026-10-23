// Rule-based tone detection: counts signals from fixed word lists and reports
// the strongest tones with the words that triggered them.
import { words, splitSentences } from './text.js';

const LEX = {
  hedge: ['maybe', 'perhaps', 'probably', 'possibly', 'might', 'could', 'seems', 'appears', 'somewhat', 'guess', 'hopefully', 'unsure', 'unclear', 'likely', 'suggests', 'may'],
  assert: ['will', 'must', 'clearly', 'certainly', 'definitely', 'always', 'never', 'shows', 'proves', 'demonstrates', 'confirms', 'ensure', 'need', 'require', 'requires'],
  positive: ['good', 'great', 'excellent', 'improve', 'improved', 'improvement', 'success', 'successful', 'benefit', 'benefits', 'gain', 'gains', 'growth', 'happy', 'glad', 'pleased', 'thank', 'thanks', 'welcome', 'positive', 'progress', 'strong', 'better', 'best', 'opportunity', 'achieve', 'achieved', 'win', 'love', 'excited', 'delighted', 'helpful', 'efficient', 'effective'],
  negative: ['bad', 'poor', 'fail', 'failed', 'failure', 'loss', 'losses', 'problem', 'problems', 'issue', 'issues', 'risk', 'risks', 'concern', 'concerns', 'decline', 'declined', 'worse', 'worst', 'lag', 'weak', 'shortfall', 'deficit', 'crisis', 'unfortunately', 'sorry', 'delay', 'delayed', 'difficult', 'challenge', 'challenges', 'threat', 'debt', 'stress'],
  urgent: ['urgent', 'urgently', 'immediately', 'asap', 'now', 'deadline', 'critical', 'today', 'quickly', 'soon', 'priority'],
  friendly: ['you', 'your', 'thanks', 'thank', 'please', 'hope', 'hi', 'hello', 'cheers', 'glad', 'happy', 'welcome', 'together', 'feel free'],
  analytical: ['because', 'therefore', 'thus', 'hence', 'data', 'analysis', 'evidence', 'percent', 'per', 'cent', 'average', 'compared', 'ratio', 'rate', 'trend', 'estimate', 'estimated', 'result', 'results', 'findings', 'indicates', 'suggests', 'increase', 'decrease'],
  slang: ['gonna', 'wanna', 'gotta', 'kinda', 'sorta', 'yeah', 'nope', 'awesome', 'cool', 'stuff', 'lol', 'btw', 'okay', 'ok', 'super', 'totally'],
};
const SETS = Object.fromEntries(Object.entries(LEX).map(([k, v]) => [k, new Set(v)]));

export const TONE_INFO = {
  Formal: 'Long words, no contractions or slang.',
  Informal: 'Contractions, slang or exclamation marks.',
  Confident: 'Firm verbs and few hedges.',
  Tentative: 'Several hedging words (maybe, might, seems).',
  Optimistic: 'More positive words than negative ones.',
  Concerned: 'More words about problems and risks.',
  Analytical: 'Numbers, reasons and evidence words.',
  Friendly: 'Speaks to the reader directly and warmly.',
  Urgent: 'Words about deadlines and speed.',
  Neutral: 'No strong tone signals.',
};

/** Returns up to three { tone, strength (0-1), evidence: string[] }. */
export function detectTone(text) {
  const ws = words(text);
  const n = ws.length;
  if (n < 12) return [];
  const count = {};
  const hits = {};
  for (const w of ws) {
    const low = w.text.toLowerCase();
    for (const [k, set] of Object.entries(SETS)) {
      if (set.has(low)) {
        count[k] = (count[k] || 0) + 1;
        (hits[k] ||= new Set()).add(low);
      }
    }
  }
  const contractions = (text.match(/\b\w+['’](t|s|re|ve|ll|d|m)\b/gi) || []).length;
  const exclaims = (text.match(/!/g) || []).length;
  const numbers = (text.match(/\b\d[\d,.]*\s*(%|per cent|percent)?/g) || []).length;
  const longWords = ws.filter((w) => w.text.length >= 9).length;
  const sentences = Math.max(1, splitSentences(text).length);
  const per = (x) => (x || 0) / n;

  const scores = [];
  const push = (tone, s, evidence = []) => { if (s > 0.15) scores.push({ tone, strength: Math.min(1, s), evidence }); };

  const formal = per(longWords) * 6 - per(contractions) * 20 - per(count.slang) * 30 - per(exclaims) * 20;
  push('Formal', formal, longWords ? [`${longWords} long words`, contractions ? '' : 'no contractions'].filter(Boolean) : []);
  push('Informal', per(contractions) * 15 + per(count.slang) * 30 + per(exclaims) * 15, [...(hits.slang || [])].slice(0, 3).concat(contractions ? [`${contractions} contractions`] : []));
  const hedge = per(count.hedge) * 25;
  const assert = per(count.assert) * 25;
  push('Confident', assert - hedge * 0.6 + (hedge < 0.1 ? 0.15 : 0), [...(hits.assert || [])].slice(0, 3));
  push('Tentative', hedge - assert * 0.3, [...(hits.hedge || [])].slice(0, 3));
  const pos = count.positive || 0, neg = count.negative || 0;
  if (pos + neg >= 2) {
    push('Optimistic', ((pos - neg) / (pos + neg)) * 0.8, [...(hits.positive || [])].slice(0, 3));
    push('Concerned', ((neg - pos) / (pos + neg)) * 0.8, [...(hits.negative || [])].slice(0, 3));
  }
  push('Analytical', per(count.analytical) * 12 + (numbers / sentences) * 0.25, [...(hits.analytical || [])].slice(0, 3).concat(numbers ? [`${numbers} figures`] : []));
  push('Friendly', per(count.friendly) * 14 + per(exclaims) * 6, [...(hits.friendly || [])].slice(0, 3));
  push('Urgent', per(count.urgent) * 20 + per(exclaims) * 8, [...(hits.urgent || [])].slice(0, 3));

  scores.sort((a, b) => b.strength - a.strength);
  return scores.length ? scores.slice(0, 3) : [{ tone: 'Neutral', strength: 0.5, evidence: [] }];
}
