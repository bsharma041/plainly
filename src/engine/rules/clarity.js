import { WORDY, PLAIN_WORDS, ADJECTIVE_PARTICIPLES, NOT_PARTICIPLES, IRREGULAR } from '../data/lists.js';
import { passiveToActive, splitSentence } from '../rewrite.js';
import { matchCase, splitSentences, words, escapeRegex, isSentenceStart, capitalize } from '../text.js';

const DETERMINERS = /^\s+(the|this|these|those|their|our|its|his|her|my|your|them|us|it|which|whom)\b/i;

const CAT = 'clarity';

const WORDY_RE = WORDY.map(([from, to]) => ({ re: new RegExp(`\\b${escapeRegex(from)}\\b`, 'gi'), from, to }));

/** Build a fix that deletes or replaces a phrase while keeping spacing and sentence case right. */
export function phraseFix(text, start, end, replacement) {
  const original = text.slice(start, end);
  if (replacement) {
    return { text: matchCase(original, replacement), start, end };
  }
  const label = `Remove "${original}"`;
  // Deleting: also swallow one following space and recapitalize the next word if needed.
  let e = end;
  if (text[e] === ' ') e++;
  else if (text[e] === ',' && text[e + 1] === ' ') e += 2;
  else if (text[start - 1] === ' ') start--;
  if (isSentenceStart(text, start) && /[a-z]/.test(text[e] || '')) {
    return { text: text[e].toUpperCase(), start, end: e + 1, label };
  }
  return { text: '', start, end: e, label };
}

function wordy(text, out) {
  for (const { re, to } of WORDY_RE) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const start = m.index, end = start + m[0].length;
      // "the majority of the members" -> "most of the members", not "most the members"
      const target = to === 'most' && DETERMINERS.test(text.slice(end, end + 12)) ? 'most of' : to;
      out.push({
        rule: 'wordy', category: CAT, scope: 'word', start, end, original: m[0],
        title: target ? `Shorten to "${target}"` : 'Remove filler',
        message: target ? `"${m[0]}" can be said as "${target}".` : `"${m[0]}" adds words without adding meaning.`,
        fixes: [phraseFix(text, start, end, target)],
      });
    }
  }
}

function plainWords(text, out) {
  for (const w of words(text)) {
    let plain = PLAIN_WORDS[w.text.toLowerCase()];
    if (!plain) continue;
    // After has/have/had/been, a past participle is needed: "has demonstrated" -> "has shown", not "has showed".
    const prev = (text.slice(Math.max(0, w.start - 12), w.start).match(/([a-z]+)\s+$/i) || [])[1]?.toLowerCase();
    if (/^(has|have|had|been|being|is|are|was|were|be)$/.test(prev || '')) {
      const participle = { showed: 'shown' }[plain];
      if (participle) plain = participle;
    }
    out.push({
      rule: 'plain-word', category: CAT, scope: 'word', start: w.start, end: w.end, original: w.text,
      title: `Try "${plain}"`, message: `"${plain}" is plainer than "${w.text.toLowerCase()}" and means the same here.`,
      fixes: [{ text: matchCase(w.text, plain), start: w.start, end: w.end }],
    });
  }
}

function longSentences(text, out, limit) {
  for (const s of splitSentences(text)) {
    const n = words(s.text).length;
    if (n <= limit) continue;
    const options = splitSentence(s.text, limit);
    out.push({
      rule: 'long-sentence', category: CAT, scope: 'sentence', start: s.start, end: s.end,
      original: s.text,
      title: 'Long sentence',
      message: options.length
        ? `This sentence has ${n} words, and readers lose track past about ${limit}. Each option below splits it at a natural break. Your words stay as they are; at most a short linking word (This, But, However) is added.`
        : `This sentence has ${n} words, and readers lose track past about ${limit}. There's no clean break to split at automatically; try ending the sentence after the main point.`,
      fixes: options.map((o) => ({ text: o.text, start: s.start, end: s.end, label: o.label, preview: o.text })),
    });
  }
}

const BE = '(am|is|are|was|were|be|been|being|get|gets|got|gotten)';
const PASSIVE_RE = new RegExp(`\\b${BE}\\s+(?:(\\w+ly)\\s+)?([A-Za-z]{3,}ed|${Object.keys(IRREGULAR).join('|')})\\b`, 'gi');

function passive(text, out) {
  const sentences = splitSentences(text);
  const weWriter = (text.match(/\b(we|our|us)\b/gi) || []).length >= 2;
  // How does this document use a word? Lowercase anywhere = common noun; capitalised mid-sentence = name.
  const kind = (word) => {
    const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${esc.toLowerCase()}\\b`).test(text)) return 'common';
    if (new RegExp(`[a-z,;]\\s+${esc}\\b`).test(text)) return 'proper';
    return null;
  };
  PASSIVE_RE.lastIndex = 0;
  let m;
  while ((m = PASSIVE_RE.exec(text))) {
    const participle = m[3].toLowerCase();
    if (ADJECTIVE_PARTICIPLES.has(participle) || NOT_PARTICIPLES.has(participle)) continue;
    if (/^(get|gets|got|gotten)$/i.test(m[1])) {
      // "get started", "got married": only a real passive when an actor follows ("got hit by").
      const rest = text.slice(m.index + m[0].length, m.index + m[0].length + 40);
      if (!/^\s+by\s+\w/i.test(rest)) continue;
    }
    const start = m.index, end = start + m[0].length;
    // "The printer is fixed now": a state, not an action.
    if (/^\s+(now|already|yet|again)\b/i.test(text.slice(end, end + 10))) continue;
    const s = sentences.find((x) => x.start <= start && end <= x.end);
    const hasAgent = s && /\bby\s+\w/i.test(text.slice(end, s.end));
    const options = s ? passiveToActive(s.text, { weWriter, at: start - s.start, kind }) : [];
    const withActor = options.some((o) => o.label === 'Rewrite in active voice');
    out.push({
      rule: 'passive', category: CAT, scope: 'word', start, end, original: m[0],
      title: 'Passive voice',
      message: withActor
        ? 'Passive voice puts the actor at the end. The active version below names them first, using your words.'
        : options.length
          ? 'Passive voice hides who did this. If you name the actor the sentence gets more direct. Keep it as is if the actor doesn\'t matter.'
          : hasAgent
            ? 'This is passive voice. This sentence is too complex to rewrite safely; try starting with whoever did the action.'
            : 'This is passive voice. It\'s fine when the actor doesn\'t matter; otherwise say who did it.',
      fixes: options.map((o) => ({ text: o.text, start: s.start, end: s.end, label: o.label, preview: o.text, select: o.select })),
    });
  }
}

export function clarityRules(text, opts) {
  const out = [];
  wordy(text, out);
  if (opts.plainWords !== false) plainWords(text, out);
  longSentences(text, out, opts.longSentence || 30);
  passive(text, out);
  return out;
}
