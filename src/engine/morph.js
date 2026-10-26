// Verb morphology by fixed rules. Used to turn passive sentences active
// without any generated text: every word in the result comes from the
// writer's sentence, re-inflected by these rules.

import { IRREGULAR } from './data/lists.js';
import { IRREGULAR_PLURAL, PLURAL_VERB } from './data/usage-lists.js';

// Irregular past participle -> base form.
export const IRREGULAR_BASE = {
  written: 'write', taken: 'take', given: 'give', made: 'make', done: 'do', seen: 'see', known: 'know',
  shown: 'show', found: 'find', built: 'build', sent: 'send', paid: 'pay', held: 'hold', kept: 'keep',
  left: 'leave', told: 'tell', brought: 'bring', bought: 'buy', thought: 'think', caught: 'catch',
  taught: 'teach', sold: 'sell', said: 'say', read: 'read', led: 'lead', met: 'meet', set: 'set',
  put: 'put', cut: 'cut', hit: 'hit', run: 'run', won: 'win', begun: 'begin', broken: 'break',
  chosen: 'choose', driven: 'drive', eaten: 'eat', forgotten: 'forget', frozen: 'freeze', hidden: 'hide',
  spoken: 'speak', stolen: 'steal', torn: 'tear', worn: 'wear', drawn: 'draw', grown: 'grow',
  thrown: 'throw', blown: 'blow', flown: 'fly', beaten: 'beat', bitten: 'bite', forgiven: 'forgive',
  ridden: 'ride', shaken: 'shake', woken: 'wake', sung: 'sing', drunk: 'drink', rung: 'ring', swum: 'swim',
  understood: 'understand', heard: 'hear', felt: 'feel', meant: 'mean', lent: 'lend', spent: 'spend',
  lost: 'lose', struck: 'strike', hung: 'hang', laid: 'lay', fed: 'feed', dealt: 'deal', sought: 'seek',
  fought: 'fight', bound: 'bind', undertaken: 'undertake', overseen: 'oversee', withdrawn: 'withdraw',
  upheld: 'uphold', rewritten: 'rewrite', got: 'get', gotten: 'get', become: 'become', come: 'come',
  shut: 'shut', spread: 'spread', let: 'let', hurt: 'hurt', cast: 'cast', cost: 'cost', quit: 'quit',
  forecast: 'forecast', sworn: 'swear', borne: 'bear', born: 'bear', fallen: 'fall', ground: 'grind',
  sat: 'sit', stood: 'stand', slept: 'sleep', swept: 'sweep', proven: 'prove', mistaken: 'mistake',
};

// Stems that need a final "e" even though the rules below say no, and the reverse.
const E_YES = new Set(['quot', 'misquot', 'creat', 'recreat', 'procreat', 'chang', 'arrang', 'rearrang', 'exchang', 'challeng', 'aveng', 'unit', 'invit', 'excit', 'cit', 'recit', 'ignit', 'expedit', 'interfer', 'adher', 'coher', 'persever', 'rever', 'scal', 'inhal', 'exhal', 'guid', 'writ', 'bath', 'breath', 'cloth', 'loath', 'sooth']);
const E_NO = new Set(['monitor', 'honor', 'honour', 'color', 'colour', 'favor', 'favour', 'labor', 'labour', 'mirror', 'sponsor', 'author', 'anchor', 'factor', 'tailor', 'censor', 'mentor', 'motor', 'doctor', 'flavor', 'vapor', 'tutor', 'harbor', 'pivot', 'ballot', 'pilot', 'focus', 'bias', 'alias', 'canvas', 'atlas', 'gas', 'bus', 'develop', 'envelop', 'gallop', 'wallop', 'gossip', 'worship', 'kidnap', 'handicap', 'program', 'blossom', 'ransom', 'summon', 'abandon', 'reckon', 'beckon', 'pardon', 'imagin', 'margin', 'origin', 'audit', 'credit', 'edit', 'visit', 'limit', 'exhibit', 'inherit', 'merit', 'profit', 'deposit', 'posit', 'benefit', 'prohibit', 'inhibit', 'exploit', 'solicit', 'elicit', 'vomit', 'orbit', 'habit', 'herald', 'target', 'budget', 'market', 'bracket', 'interpret', 'regret', 'forfeit']);

function needsE(stem) {
  if (E_YES.has(stem)) return true;
  if (E_NO.has(stem)) return false;
  for (const no of E_NO) if (stem.length > no.length && stem.endsWith(no) && /^(re|un|over|under|co|pre|de|mis|out)/.test(stem)) return false;
  if (/[uvcz]$/.test(stem)) return !/zz$/.test(stem);
  if (/(dg|rg|[aeiou]g)$/.test(stem)) return true;
  if (/s$/.test(stem)) return !/ss$/.test(stem);
  if (/quir$/.test(stem)) return true;
  if (/[^aeiou][aiu]r$/.test(stem)) return true;
  if (/[^aeiou]or$/.test(stem)) return true;
  if (/(uat|iat)$/.test(stem)) return true;
  if (/[^aeiou](at|ut|ot)$/.test(stem)) return true;
  if (/[lp]et$/.test(stem)) return true;
  if (/[^aeiouwyl]l$/.test(stem)) return true;
  if (/[^aeiou](il|ol|ul)$/.test(stem)) return true;
  if (/[^aeiou][aiouy][bdkmnp]$/.test(stem)) return !/(op|an)$/.test(stem);
  return false;
}

/** Past participle -> base form ("reviewed" -> "review", "created" -> "create"). */
export function baseForm(participle) {
  const w = participle.toLowerCase();
  if (IRREGULAR_BASE[w]) return IRREGULAR_BASE[w];
  if (!w.endsWith('ed')) return w;
  if (w.endsWith('ied')) return w.length <= 4 ? w.slice(0, -1) : `${w.slice(0, -3)}y`;
  if (w.endsWith('eed')) return w.slice(0, -1);
  let stem = w.slice(0, -2);
  if (/(ell|oll)$/.test(stem) && stem.length > 5) return stem.slice(0, -1); // travelled, controlled
  if (/([bdgmnprt])\1$/.test(stem) && !/^(re)?(add|odd|err|purr|ebb)$/.test(stem)) return stem.slice(0, -1);
  if (needsE(stem)) stem += 'e';
  return stem;
}

/** Base -> simple past. Regular verbs reuse the participle the writer typed. */
export function pastTense(participle) {
  const p = participle.toLowerCase();
  return IRREGULAR[p] || p;
}

/** Base -> third person singular ("review" -> "reviews"). */
export function thirdPerson(base) {
  if (base === 'have') return 'has';
  if (base === 'be') return 'is';
  if (base === 'do') return 'does';
  if (base === 'go') return 'goes';
  if (/(s|x|z|ch|sh|o)$/.test(base)) return `${base}es`;
  if (/[^aeiou]y$/.test(base)) return `${base.slice(0, -1)}ies`;
  return `${base}s`;
}

/** -ing form, using the participle to recover consonant doubling ("stopped" -> "stopping"). */
// Stems that double their last consonant before -ing (cut -> cutting, admit -> admitting).
const DOUBLE_ING = new Set(['admit', 'submit', 'permit', 'commit', 'omit', 'emit', 'transmit', 'refer', 'prefer', 'confer', 'defer', 'infer', 'occur', 'transfer', 'control', 'patrol', 'regret', 'begin', 'forget', 'upset', 'equip', 'compel', 'expel', 'propel', 'rebut']);

export function ingForm(participle, base) {
  const p = participle.toLowerCase();
  if (/([bdgmnprt])\1ed$/.test(p) && !/(add|odd)ed$/.test(p)) return `${p.slice(0, -2)}ing`;
  // One-syllable consonant-vowel-consonant verbs double: cut, hit, set, ban, plan, stop.
  if (DOUBLE_ING.has(base) || /^[^aeiou]*[aeiou][bdgmnprt]$/.test(base)) return `${base}${base.slice(-1)}ing`;
  if (/ie$/.test(base)) return `${base.slice(0, -2)}ying`;
  if (/[^eoy]e$/.test(base)) return `${base.slice(0, -1)}ing`;
  return `${base}ing`;
}

const SINGULAR_S = new Set(['news', 'series', 'species', 'analysis', 'basis', 'crisis', 'status', 'physics', 'economics', 'mathematics', 'politics', 'thesis', 'diagnosis', 'emphasis', 'hypothesis', 'synopsis', 'process', 'business', 'progress', 'class', 'access', 'success', 'address', 'boss', 'gas', 'bus', 'census', 'consensus', 'corpus', 'campus', 'virus', 'bonus', 'focus', 'apparatus', 'means', 'is', 'this', 'its', 'his', 'us']);
const PLURAL_START = /^(we|they|you|both|many|several|few|all|most|these|those|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/i;

/** Guess grammatical number of a noun phrase. 'I' and 'you' behave like plurals for verb agreement. */
export function isPluralSubject(phrase) {
  const p = phrase.trim();
  if (/^(I|you|we|they)$/i.test(p)) return true;
  if (/^(he|she|it|this|that|one|someone|everyone|nobody|each|every)\b/i.test(p)) return false;
  if (/\band\b/i.test(p)) return true;
  if (PLURAL_START.test(p)) return true;
  // Head noun: last word before "of"/"in"/"for" ("the head of the departments" -> head)
  const head = p.split(/\s+(?:of|in|for|from|at|on|with)\s+/i)[0].trim().split(/\s+/).pop().toLowerCase();
  if (SINGULAR_S.has(head)) return false;
  if (/(people|children|men|women|staff|data|police|media|criteria|phenomena)$/.test(head)) return true;
  return /[^s]s$/.test(head) && !/(us|is|ss)$/.test(head);
}

// ---------- round 1: helpers for the usage rules ----------

/** -ing form -> base form ("identifying" -> "identify", "reducing" -> "reduce", "planning" -> "plan"). */
export function baseFromIng(word) {
  const w = word.toLowerCase();
  if (!w.endsWith('ing') || w.length < 5) return w === 'being' ? 'be' : w;
  if (w === 'being') return 'be';
  const stem = w.slice(0, -3);
  if (/([bdgklmnprt])\1$/.test(stem)) {
    const single = stem.slice(0, -1);
    if (DOUBLE_ING.has(single) || /^[^aeiou]*[aeiou][bdgmnprt]$/.test(single)) return single;
    return stem; // "assessing" -> "assess"
  }
  if (/y$/.test(stem) || stem.length < 2) return stem;
  return needsE(stem) ? `${stem}e` : stem;
}

/** Singular noun -> plural ("approach" -> "approaches", "policy" -> "policies"). */
export function pluralize(noun) {
  const n = noun.toLowerCase();
  if (IRREGULAR_PLURAL[n]) return IRREGULAR_PLURAL[n];
  if (/(s|x|z|ch|sh)$/.test(n)) return `${n}es`;
  if (/[^aeiou]y$/.test(n)) return `${n.slice(0, -1)}ies`;
  return `${n}s`;
}

/** Singular verb -> plural verb for a compound subject ("is" -> "are", "remains" -> "remain"). */
export function pluralVerb(verb) {
  return PLURAL_VERB[verb.toLowerCase()] || null;
}
