import { WORDY, REDUNDANCY, PLAIN_WORDS, ADJECTIVE_PARTICIPLES, NOT_PARTICIPLES, IRREGULAR } from '../data/lists.js';
import { passiveToActive, splitSentence } from '../rewrite.js';
import { UN_VERBS } from '../data/usage-lists.js';
import { matchCase, splitSentences, words, escapeRegex, isSentenceStart, capitalize } from '../text.js';

const DETERMINERS = /^\s+(the|this|these|those|their|our|its|his|her|my|your|them|us|it|which|whom)\b/i;

const CAT = 'clarity';

const WORDY_RE = [
  ...WORDY.map(([from, to]) => ({ re: new RegExp(`\\b${escapeRegex(from)}\\b`, 'gi'), from, to, rule: 'wordy' })),
  ...REDUNDANCY.map(([from, to]) => ({ re: new RegExp(`\\b${escapeRegex(from)}\\b`, 'gi'), from, to, rule: 'redundancy' })),
  // "in the year 2020" -> "in 2020"
  { re: /\bin the year (?=\d{4}\b)/gi, from: 'in the year', to: 'in', rule: 'redundancy' },
];

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
  for (const { re, to, rule } of WORDY_RE) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const start = m.index, end = start + m[0].length;
      // Round 7 (BE14): "revert back with …" means "reply" in Indian English; offer that first.
      if (rule === 'wordy' && /^revert back$/i.test(m[0].trim()) && /^\s+(with|to me|to us|at the earliest)\b/i.test(text.slice(end))) {
        out.push({
          rule, category: CAT, scope: 'word', start, end, original: m[0],
          title: 'Try "reply"', message: '"Revert back" repeats itself, and in most varieties of English "revert" means "go back to". To ask for an answer, write "reply".',
          fixes: [phraseFix(text, start, end, 'reply'), phraseFix(text, start, end, 'revert')],
        });
        continue;
      }
      // "the majority of the members" -> "most of the members", not "most the members"
      const target = to === 'most' && DETERMINERS.test(text.slice(end, end + 12)) ? 'most of' : to;
      const orig = m[0].trim();
      const e = start + orig.length;
      out.push({
        rule, category: CAT, scope: 'word', start, end: e, original: orig,
        title: target ? `Shorten to "${target}"` : 'Remove filler',
        message: rule === 'redundancy'
          ? `"${orig}" repeats an idea: "${target}" already says it.`
          : target ? `"${orig}" can be said as "${target}".` : `"${orig}" adds words without adding meaning.`,
        fixes: [phraseFix(text, start, e, target)],
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
      rule: 'plain-word', category: CAT, severity: 'style', scope: 'word', start: w.start, end: w.end, original: w.text,
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
      rule: 'long-sentence', category: CAT, severity: 'style', scope: 'sentence', start: s.start, end: s.end,
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

const PRESENTATION = new Set(['shown', 'presented', 'given', 'listed', 'summarised', 'summarized', 'reported', 'illustrated', 'depicted']);

function passive(text, out, opts = {}) {
  const academic = opts.domain === 'academic' || opts.domain === 'technical';
  const sentences = splitSentences(text);
  // The writer uses "we": two uses of we/our/us, or a sentence that starts with "We" (round 3, ruling P test).
  // A "We" inside quotation marks is someone else's voice and doesn't count (round 4, ruling 2).
  const unquoted = text.replace(/"[^"\n]*"|“[^”\n]*”/g, ' ');
  const weWriter = (unquoted.match(/\b(we|our|us)\b/gi) || []).length >= 2 || /(^|[.!?]["'”’)]*\s+|\n\s*)We\b/.test(unquoted);
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
    if (/^un/.test(participle) && !UN_VERBS.has(participle)) continue; // "unprecedented", "unaffected": adjectives
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
    // Round 3 (ruling P): agentless passives get "we" first (for we-writers), then a visible "[who]" template,
    // never "Someone" (that stays only behind the test option passiveTemplate).
    const placeholder = opts.passiveTemplate ? 'someone' : '[who]';
    // A one-word plural subject with a plural verb ("Mistakes were made.") is a common noun, not a name.
    const sentKind = (w) => kind(w) || (s && /^[A-Z][a-z]+[^s'’]s$/.test(w) && new RegExp(`^${w}\\s+(were|are|have\\s+been)\\b`).test(s.text) ? 'common' : null);
    let options = s ? passiveToActive(s.text, { weWriter, at: start - s.start, kind: sentKind, placeholder }) : [];
    // Round 4 (F4): presentation and citation passives ("The results are shown in Table 3.") have no
    // meaningful actor, so no "[who]" template. Advice and any "we"/agent rewrite stay.
    if (s) {
      const tail = text.slice(end, s.end).replace(/[.!?"'”’)\s]+$/, '').trim();
      const cites = /^(in|on|at)\s+(table|figure|fig\.?|section|chapter|appendix|annex|box|page)\b/i.test(tail) || /^(below|above|overleaf)\b/i.test(tail);
      if (cites || (tail && PRESENTATION.has(participle))) options = options.filter((o) => !o.template);
    }
    const withActor = options.some((o) => o.label === 'Rewrite in active voice');
    out.push({
      rule: 'passive', category: CAT, scope: 'word', start, end, original: m[0], ...(academic ? { severity: 'style' } : {}),
      title: 'Passive voice',
      message: academic
        ? (options.length
          ? 'Passive voice is normal in academic writing; use this only if naming the actor helps.'
          : 'Passive voice is normal in academic and technical writing. Keep it unless naming the actor makes the point clearer.')
        : options.some((o) => o.template) && !options.some((o) => !o.template)
          ? 'Passive voice hides who did this. The template below puts the actor first: type who did it over "[who]". Keep the passive if the actor doesn\'t matter.'
          : withActor
        ? 'Passive voice puts the actor at the end. The active version below names them first, using your words.'
        : options.length
          ? 'Passive voice hides who did this. If you name the actor the sentence gets more direct. Keep it as is if the actor doesn\'t matter.'
          : hasAgent
            ? 'This is passive voice. This sentence is too complex to rewrite safely; try starting with whoever did the action.'
            : 'This is passive voice. It\'s fine when the actor doesn\'t matter; otherwise say who did it.',
      fixes: options.map((o) => ({ text: o.text, start: s.start, end: s.end, label: o.label, preview: o.text, sourceText: s.text, select: o.select, ...(o.template ? { template: true } : {}) })),
    });
  }
}

export function clarityRules(text, opts) {
  const out = [];
  wordy(text, out);
  if (opts.plainWords !== false) plainWords(text, out);
  longSentences(text, out, opts.longSentence || 30);
  passive(text, out, opts);
  return out;
}
