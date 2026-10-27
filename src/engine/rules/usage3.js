// Round 6 P1 inline rules: comma after an introductory clause (R14a) and
// Indian English register advice (IE1). Fixes use the writer's words plus
// REGISTER_INSERTS (added to the guard's closed vocabulary).
import { BE, MODALS, BASE_VERBS } from '../data/usage-lists.js';
import { IRREGULAR } from '../data/lists.js';
import { RULE_INFO } from '../data/rule-info.js';
import { matchCase, splitSentences, words } from '../text.js';
import { PAST_TO_BASE } from './grammar.js';

export const REGISTER_INSERTS = 'please bring brings brought bringing forward reply according to away update ago for';

function make(rule, category, severity, start, end, original, fixes, title, message) {
  return {
    rule, category, severity, ruleName: RULE_INFO[rule]?.name || title, title, message, start, end, original, scope: 'word',
    fixes: fixes.map((f) => (typeof f === 'string' ? { text: f, start, end } : f)),
  };
}
function insideQuotes(text, index) {
  const lineStart = text.lastIndexOf('\n', index - 1) + 1;
  const before = text.slice(lineStart, index);
  return (before.match(/"/g) || []).length % 2 === 1 || (before.match(/“/g) || []).length > (before.match(/”/g) || []).length;
}

// ---------- R14a comma after an introductory subordinate clause ----------
const SUBORD = /^(If|When|Although|Though|Because|Since|While|Unless|Once|After|Before|Whereas)\b/;
const SUBJ = new Set(['i', 'we', 'you', 'he', 'she', 'it', 'they', 'this', 'these', 'there']);
const FINITE_AUX = new Set([...BE, ...MODALS, 'has', 'have', 'had', 'do', 'does', 'did']);
const PASTS = new Set([...Object.values(IRREGULAR), ...Object.keys(PAST_TO_BASE)]);
const isFinite = (w) => FINITE_AUX.has(w) || PASTS.has(w) || (/ed$/.test(w) && w.length > 4)
  || (/[^s]s$/.test(w) && BASE_VERBS.has(w.replace(/e?s$/, ''))) || (/[^s]s$/.test(w) && BASE_VERBS.has(w.slice(0, -1)));

function introComma(text, out) {
  for (const s of splitSentences(text)) {
    const m = s.text.match(SUBORD);
    if (!m || insideQuotes(text, s.start)) continue;
    const ws = words(s.text, s.start);
    const low = ws.map((w) => w.text.toLowerCase());
    let clauseVerb = false; // the opening clause must have its own verb before the main subject
    for (let k = 1; k < ws.length - 1; k++) {
      if (/[,;:—–(]/.test(text.slice(ws[k - 1].end, ws[k].start))) break; // already punctuated
      const pronounSubj = SUBJ.has(low[k]) && isFinite(low[k + 1]);
      const nounSubj = ['the', 'this', 'these'].includes(low[k]) && FINITE_AUX.has(low[k + 2] || '');
      if (k >= 6 && clauseVerb && (pronounSubj || nounSubj)) {
        const prev = ws[k - 1];
        out.push(make('intro-clause-comma', 'correctness', 'style', prev.start, prev.end, prev.text, [`${prev.text},`],
          'Add a comma after the opening clause', `A sentence that opens with "${m[1]} …" needs a comma where the main clause starts ("${prev.text}, ${ws[k].text} …").`));
        break;
      }
      if (isFinite(low[k])) clauseVerb = true;
    }
  }
}

// ---------- IE1 Indian English register (advice, formal contexts only) ----------
const REGISTER = [
  { re: /\bkindly\b(?=\s+([a-z]+))/gi, test: (m) => BASE_VERBS.has(m[1].toLowerCase()) || /^(do|find|note|revert|confirm|send|share|let)$/i.test(m[1]), fix: () => 'Please',
    msg: '"Kindly" before a request reads as old-fashioned in modern business English. "Please" is the plain choice.' },
  { re: /\bdo the needful\b/gi, fix: null, msg: '"Do the needful" doesn\'t say what you want done. Name the action.' },
  { re: /\b(prepone|prepones|preponed|preponing)\b/gi,
    fix: (m) => ({ prepone: 'bring forward', prepones: 'brings forward', preponed: 'brought forward', preponing: 'bringing forward' })[m[1].toLowerCase()],
    msg: '"Prepone" is Indian English. "Bring forward" is understood everywhere.' },
  { re: /\brevert\b(?=\s+(with|to me|to us|at the earliest))/gi, fix: () => 'reply',
    msg: 'In most varieties of English "revert" means "go back to". To ask for an answer, write "reply".' },
  { re: /\bas per\b/gi, fix: () => 'according to', msg: '"As per" is formulaic. "According to" (or "under") reads more naturally.' },
  { re: /\bthe said (?=[a-z]+)/gi, fix: null, msg: '"The said …" is legal phrasing. In ordinary prose, "the" or "this" is enough.' },
  { re: /\bout of station\b/gi, fix: () => 'away', msg: '"Out of station" is Indian English. "Away" (or "out of town") is understood everywhere.' },
  { re: /\bupdation\b/gi, fix: () => 'update', msg: '"Updation" is not standard English. Use "update" or "updating".' },
  { re: /\b(\d+|two|three|four|five|six|seven|eight|nine|ten) years back\b/gi, fix: (m) => `${m[1]} years ago`, msg: '"Years back" is informal. "Years ago" is standard.' },
];

function register(text, out) {
  for (const r of REGISTER) {
    r.re.lastIndex = 0;
    let m;
    while ((m = r.re.exec(text))) {
      if (insideQuotes(text, m.index) || (r.test && !r.test(m))) continue;
      const original = m[0].trim();
      const end = m.index + original.length;
      const fix = r.fix ? matchCase(original, r.fix(m)) : null;
      out.push(make('register-in', 'voice', 'style', m.index, end, original, fix ? [fix] : [], fix ? `Try "${fix}"` : 'Register: say it plainly', r.msg));
    }
  }
  // "since three years" -> "for three years" (a duration, not a starting point): correctness.
  const re = /\bsince (\d+|two|three|four|five|six|seven|eight|nine|ten|many|several) (years|months|weeks|days)\b/gi;
  let m;
  while ((m = re.exec(text))) {
    if (insideQuotes(text, m.index)) continue;
    out.push(make('register-in', 'correctness', 'advanced', m.index, m.index + 5, m[0].slice(0, 5), [matchCase(m[0].slice(0, 5), 'for')],
      'Use "for" with a length of time', `"Since" needs a starting point ("since 2020"). For a length of time, use "for": "for ${m[1]} ${m[2]}".`));
  }
}

export function usageRules3(text, opts = {}) {
  const out = [];
  if ((opts.categories || {}).correctness !== false) introComma(text, out);
  const formal = ['business', 'academic'].includes(opts.domain) || opts.goals?.formality === 'formal';
  if (formal) register(text, out);
  return out;
}
