// Rule-based sentence reframing. No generation: the output is the writer's own
// words, reordered and re-inflected by fixed grammar rules. If a sentence
// doesn't fit a pattern we know is safe, we return nothing rather than guess.

import { IRREGULAR, ADJECTIVE_PARTICIPLES, NOT_PARTICIPLES } from './data/lists.js';
import { baseForm, pastTense, thirdPerson, ingForm, isPluralSubject } from './morph.js';
import { words, capitalize } from './text.js';

const PARTICIPLE = `[A-Za-z]{3,}ed|${Object.keys(IRREGULAR).join('|')}`;
const MODALS = 'will|would|shall|should|can|could|may|might|must';
// Verb group of a passive clause, longest forms first.
const VERB_GROUP = new RegExp(
  `\\b((?:${MODALS})(?:\\s+not)?\\s+have\\s+been|(?:${MODALS})(?:\\s+not)?\\s+be|(?:has|have|had)(?:\\s+not)?\\s+been|(?:am|is|are|was|were)(?:\\s+not)?\\s+being|(?:am|is|are|was|were)(?:\\s+not)?)\\s+(?:(\\w+ly)\\s+)?(${PARTICIPLE})\\b`,
  'gi',
);

const PARTICLES = 'after|with|into|of|on|upon|for|at|about|to|up|out|off|down|in|over|through|away|back|around|along|across|apart|aside|forward|together';
const PARTICLE_ONLY = new RegExp(`^(${PARTICLES}|in to|on to|up to|out of|up with|on with|away with|in for|out for|up on|off on|down on)$`, 'i');
const PARTICLE_START = new RegExp(`^\\s*(up|out|off|down|away|back|over|of|with|after|into|upon|about|apart|aside|together|forward)\\b`, 'i');
const STATE_PARTICIPLES = new Set(['set', 'left', 'gone', 'closed', 'based', 'located', 'situated', 'scheduled', 'supposed', 'entitled', 'intended', 'said', 'thought', 'believed', 'known']);
const SUBJ_TO_OBJ = { i: 'me', we: 'us', he: 'him', she: 'her', they: 'them', you: 'you', it: 'it', who: 'whom' };
const OBJ_TO_SUBJ = { me: 'I', us: 'we', him: 'he', her: 'she', them: 'they', you: 'you', it: 'it', whom: 'who' };
const LOWER_START = /^(The|A|An|This|That|These|Those|Our|My|Your|Their|His|Her|Its|Some|Many|Most|Each|Every|All|Both|No|Several|Few|Any|One|Two|Three|Four|Five)\b/;
const OPENERS = /^(in|on|at|during|after|before|since|for|by|with|from|under|over|when|while|although|though|if|because|yesterday|today|tomorrow|last|next|then|now|however|also|thus|so|here|there|it|what|which|who)\b/i;
// Where the "by" phrase ends and the rest of the sentence picks up again.
const AGENT_STOP = /\s+(?=(?:in|on|at|during|after|before|for|with|under|over|since|through|across|within|because|while|when|to|from|into|as|last|this|next|until|without|despite|via|per|using|following)\b)/i;

// Pronoun lookup that ignores all-caps words: "IT" is the department, not "it".
const pron = (map, s) => (s.length > 1 && s === s.toUpperCase() ? undefined : map[s.toLowerCase()]);

// Common-noun endings: a capitalised first word with one of these is not a name.
const COMMON_SUFFIX = /(tions|sions|ments|ities|ances|ences|ings|ness|ships|ists|ures|ages|ants|ents|ions|ies|ates|als|ics)$/;

const NUMBER_OR_QUANTIFIER = /^(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Twenty|Hundreds|Thousands|Millions|Nothing|Everything|Something|Anything|Nobody|Everybody|Somebody|Anybody|Much|Little|More|Less|Fewer|None|Half|Part|Most)\b/;

/**
 * The subject moves from the start of the sentence to the middle, so its capital
 * must go unless it is a name. Returns null when we can't tell.
 * `kind(word)` says how the document itself uses the word: 'common' | 'proper' | null.
 */
function asObject(subject, atStart, kind) {
  const p = pron(SUBJ_TO_OBJ, subject);
  if (p) return p;
  if (!atStart) return subject; // mid-sentence capital: already a name
  const first = subject.split(/\s+/)[0];
  const lowerFirst = () => subject[0].toLowerCase() + subject.slice(1);
  if (/^[A-Z0-9&]{2,}$/.test(first)) return subject; // acronym
  if (LOWER_START.test(subject) || NUMBER_OR_QUANTIFIER.test(subject)) return lowerFirst();
  const k = kind ? kind(first) : null;
  if (k === 'common') return lowerFirst();
  if (k === 'proper') return subject;
  if (/^[A-Z][a-z]{3,}$/.test(first) && COMMON_SUFFIX.test(first.toLowerCase())) return lowerFirst(); // "Payments were made"
  return null; // could be a name (Jones, Texas): don't guess
}

const RATE_OR_TIME_NOUN = /^(the|a|an|each|every|this|next|that)\s+(deadline|hour|minute|second|day|week|month|year|quarter|end|start|time|weekend|close|morning|evening|afternoon|night|summer|winter|spring|autumn|dozen|hundred|thousand|million|kilo|kilogram|metre|meter|mile|tonne|ton|litre|liter|unit|piece|page|word|item|batch|load|factor|third|half|fraction|margin|lot|little|bit|wide margin|narrow margin|date|due date|time limit|cut-off|cutoff)\b/i;
const AMOUNT_WORDS = /^((nearly|almost|about|around|roughly|over|under|up to|at least|at most|more than|less than|some|only|just|another|a further|an extra|an additional)\s+)?((one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|a hundred|a third|a quarter|half|a half|a fifth|a tenth|several|a few|many)\b.*\b(percent|per cent|points?|times|fold|crore|lakh|million|billion|thousand|hundred|dollars|rupees|rs|kg|km|units|days|weeks|months|years|hours|minutes)\b|\d)/i;
const HOLIDAY_OR_PERIOD = /^((the\s+)?(christmas|easter|diwali|eid|holi|new year|thanksgiving|ramadan|navratri|pongal|onam|weekend|fortnight|summer|winter|spring|autumn|monsoon|q[1-4]|h[12]|fy\s?\d+|year[- ]end|month[- ]end|mid-\w+)|a\s+(fortnight|week|day|month|year|decade|minute|second|moment)|(next|last|this)\s+\w+)\b/i;
const ABBREV_END = /\b(et al|inc|ltd|co|corp|jr|sr|etc|plc|llc|bros|dept|govt|univ)\.?$/i;
const TIME_OR_AMOUNT = /^(\d|\d+(st|nd|rd|th)\b|(\d+\s*)?(percent|per cent|%)|(january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|tonight|noon|midnight|then|now|far|default|mistake|accident|chance|hand|email|e-mail|post|mail|phone|car|bus|train|air|sea|road|rail|weight|volume|law|design|force|nature|name|heart|itself|themselves|now|half|twice|much|far|then)\b)/i;
const DETERMINER_START = /^(the|a|an|our|their|its|his|her|my|your|this|that|these|those|some|many|several|each|every|all|both|most|two|three|four|five|six|seven|eight|nine|ten|local|state|private|public)\b/i;

/** Is this "by …" phrase a real actor (not a date, amount or method)? */
const AND_PARTICIPLE = new RegExp(`\\band\\s+(?:by|then|${PARTICIPLE})\\b`, 'i');
function isActor(agent) {
  const a = agent.trim();
  if (TIME_OR_AMOUNT.test(a) || RATE_OR_TIME_NOUN.test(a) || AMOUNT_WORDS.test(a)) return false;
  if (HOLIDAY_OR_PERIOD.test(a) || /^the\s+(\d{4}s|\d0s|(nineteen|twenty)\w*)$/i.test(a) || /\bmargin$/i.test(a) || /\bvotes?\b/i.test(a)) return false;
  if (/^(the\s+)?\d+(st|nd|rd|th)\b/i.test(a) || /^the\s+(first|second|third|fourth|fifth|last|end|middle|beginning)\b/i.test(a)) return false; // dates
  if (/\b(by|then)\b/i.test(a) || AND_PARTICIPLE.test(a)) return false; // "the board and sent to …"
  if (/[()[\]"“”]/.test(a) || ABBREV_END.test(a)) return false;
  if (pron(OBJ_TO_SUBJ, a)) return true;
  if (/^[A-Z]{2,}$/.test(a)) return true; // acronym: IT, IMF
  if (DETERMINER_START.test(a)) return true;
  if (/^[A-Z]/.test(a)) return true; // a name: "the World Bank", "NITI Aayog"
  // A bare plural noun ("contractors", "hospitals") can act; a bare singular ("hand", "weight") is a method.
  return /^[a-z]+s$/.test(a.split(/\s+/).pop()) && !/(ss|us|is)$/.test(a);
}

function asSubject(agent, atStart) {
  let s = pron(OBJ_TO_SUBJ, agent) ?? agent;
  if (s === 'i') s = 'I';
  return atStart ? capitalize(s) : (LOWER_START.test(s) && !atStart ? s[0].toLowerCase() + s.slice(1) : s);
}

/** Active verb phrase for the given passive verb group and actor. */
function activeVerb(group, adverb, participle, agent) {
  const g = group.toLowerCase().replace(/\s+/g, ' ');
  const neg = /\bnot\b/.test(g);
  // A name ("Lazard Freres", "Siemens") is one actor unless it lists several ("Jones and Smith").
  const name = /^[A-Z]/.test(agent) && !/^(The|These|Those|Both|Many|Several|All|Most|Some|Two|Three)\b/.test(agent) && !/\band\b/.test(agent);
  const plural = name && !/^(I|We|They|You)$/.test(agent) ? false : isPluralSubject(agent);
  const isI = /^(I|me)$/.test(agent.trim());
  const base = baseForm(participle);
  const adv = adverb ? `${adverb.toLowerCase()} ` : '';
  const p = participle.toLowerCase();

  let m;
  if ((m = g.match(new RegExp(`^(${MODALS})(?: not)? have been`)))) return `${m[1]} ${neg ? 'not ' : ''}have ${adv}${p}`;
  if ((m = g.match(new RegExp(`^(${MODALS})`)))) return `${m[1]} ${neg ? 'not ' : ''}${adv}${base}`;
  if ((m = g.match(/^(has|have|had)/))) {
    const aux = m[1] === 'had' ? 'had' : (plural ? 'have' : 'has');
    return `${aux} ${neg ? 'not ' : ''}${adv}${p}`;
  }
  if (/being$/.test(g)) {
    const past = /^(was|were)/.test(g);
    const aux = past ? (plural && !isI ? 'were' : 'was') : (isI ? 'am' : plural ? 'are' : 'is');
    return `${aux} ${neg ? 'not ' : ''}${adv}${ingForm(participle, base)}`;
  }
  if (/^(was|were)/.test(g)) return neg ? `did not ${adv}${base}` : `${adv}${pastTense(participle)}`;
  // am / is / are
  if (neg) return `${plural ? 'do' : 'does'} not ${adv}${base}`;
  return `${adv}${plural ? base : thirdPerson(base)}`;
}

/**
 * Turn one passive clause active. Returns an array of { text, label, select? }
 * options (empty if the sentence isn't a shape we can rewrite safely).
 * `weWriter`: the document uses "we", so "we" is a fair guess for a missing actor.
 */
export function passiveToActive(sentence, { weWriter = false, at = null, kind = null } = {}) {
  VERB_GROUP.lastIndex = 0;
  let vg;
  while ((vg = VERB_GROUP.exec(sentence))) {
    const part = vg[3].toLowerCase();
    if (ADJECTIVE_PARTICIPLES.has(part) || NOT_PARTICIPLES.has(part)) continue;
    // When a specific passive was flagged, rewrite that one, not an earlier one.
    if (at == null || (vg.index <= at && at < vg.index + vg[0].length)) break;
  }
  if (!vg) return [];
  const [whole, group, adverb, participle] = vg;

  // Split what comes before the verb into an optional opener ("In 2020, ") and the subject.
  const before = sentence.slice(0, vg.index).replace(/\s+$/, '');
  const comma = before.lastIndexOf(', ');
  let prefix = comma >= 0 ? before.slice(0, comma + 2) : '';
  let subject = (comma >= 0 ? before.slice(comma + 2) : before).trim();
  // ", and the budget was approved": "and" joins the clauses, it isn't part of the subject.
  const conj = subject.match(/^(and|or|yet|nor|but|so|then)\s+/i);
  if (conj) { prefix += conj[0]; subject = subject.slice(conj[0].length); }
  if (!subject || words(subject).length > 8) return [];
  if (/[,;:()"“”]/.test(subject) || /\b(which|who|that|because|when|if|but|where|whether)\b/i.test(subject)) return [];
  if (OPENERS.test(subject) || /^\w+ly\b/.test(subject)) return [];
  if (/\b(will|would|shall|should|can|could|may|might|must|has|have|had|is|are|was|were|be|been|do|does|did|not|never)\b/i.test(subject)) return [];
  if (/[?]\s*$/.test(sentence) || /^\s*(did|does|do|is|are|was|were|has|have|had|will|would|can|could|should)\b/i.test(sentence)) return []; // questions
  if (prefix && /\b(which|who|that)\s*,?\s*$/i.test(prefix)) return [];

  // What follows: [mid] [by agent] [tail] [punctuation]
  let after = sentence.slice(vg.index + whole.length);
  const punct = (after.match(/[.!?]+["'”’)]*\s*$/) || [''])[0];
  after = after.slice(0, after.length - punct.length);
  if (/^\s*(that|as|if|whether)\b/i.test(after)) return []; // "It was decided that…"
  if (/^\s*to\s+(?!(the|a|an|our|their|his|her|its|my|your|this|these|those|all|each|every|me|us|him|them)\b)\w/i.test(after)) return []; // "is expected to rise"
  if (/[;:]/.test(after)) return [];

  const byIdx = after.search(/\sby\s/i);
  let mid = '', agent = '', tail = '';
  if (byIdx >= 0) {
    mid = after.slice(0, byIdx).trim();
    if (words(mid).length > 6 || mid.includes(',')) return [];
    // "looked after by", "dealt with by", "carried out by": the particle belongs to the verb.
    if (PARTICLE_ONLY.test(mid)) return [];
    const rest = after.slice(byIdx).replace(/^\s+by\s+/i, '');
    const commaAt = rest.indexOf(',');
    let agentText = commaAt >= 0 ? rest.slice(0, commaAt) : rest;
    const stop = agentText.search(AGENT_STOP);
    if (stop > 0) agentText = agentText.slice(0, stop);
    agent = agentText.trim();
    tail = rest.slice(agentText.length).replace(/\s+$/, '');
    if (!agent || words(agent).length > 7 || /\b(which|who|that)\b/i.test(agent)) return [];
    if (!isActor(agent)) return [];
    // ", who were warned" would end up describing the wrong noun after reordering.
    if (/^\s*,\s*(who|whom|whose|which|that|where)\b/i.test(tail)) return [];
    if (/\sby\s/i.test(tail)) return [];
    if (/ing$/i.test(agent.split(/\s+/)[0])) return []; // "by using …" is a method, not an actor
  } else {
    if (after.includes(',')) return [];
    tail = after.replace(/\s+$/, '');
    if (PARTICLE_START.test(tail)) return []; // "made up of", "set up", "looked after"
    if (STATE_PARTICIPLES.has(participle.toLowerCase())) return []; // "is set for Monday" is a state, not an action
  }

  const atStart = prefix === '';
  const object = asObject(subject, atStart, kind);
  if (object == null) return [];
  const finish = (actor, label, select) => {
    const verb = activeVerb(group, adverb, participle, actor);
    const subj = asSubject(actor, atStart);
    const text = `${prefix}${subj} ${verb} ${object}${mid ? ` ${mid}` : ''}${tail}${punct.trimEnd() || '.'}`
      .replace(/\s{2,}/g, ' ');
    const opt = { text, label };
    if (select) {
      const at = text.indexOf(subj);
      opt.select = [at, at + subj.length];
    }
    return opt;
  };

  if (agent) return [finish(agent, 'Rewrite in active voice')];
  const out = [];
  if (weWriter) out.push(finish('we', 'Rewrite with "we" as the actor'));
  out.push(finish('someone', 'Rewrite and name the actor', true));
  return out;
}

// ---------- long sentences ----------

const CLAUSE_START = /^(I|we|you|he|she|it|they|this|that|these|those|there|the|a|an|our|their|its|his|her|my|your|many|most|some|each|every|no|one|such)\b/i;

// Each connector maps a break point to how the second sentence starts.
const CONNECTORS = [
  { re: /;\s+/g, start: () => '', clause: false },
  { re: /\s+—\s+|\s*—\s*/g, start: () => '', clause: true, dash: true },
  { re: /,\s+but\s+/gi, start: () => 'But ', clause: true },
  { re: /,\s+so\s+/gi, start: () => 'So ', clause: true },
  { re: /,\s+yet\s+/gi, start: () => 'Yet ', clause: true },
  { re: /,\s+and\s+/gi, start: () => '', clause: true },
  { re: /,\s+which\s+/gi, start: () => 'This ', clause: false, which: true },
  { re: /,\s+whereas\s+/gi, start: () => 'By contrast, ', clause: false },
  { re: /,\s+although\s+/gi, start: () => 'However, ', clause: false },
  { re: /\s+because\s+/gi, start: () => 'This is because ', clause: false, because: true },
];

const SUBORDINATE_OPEN = /^\s*["“(]?\s*(if|when|whenever|although|though|since|unless|because|while|as|once|until|before|after|not only|whether|even if|even though|provided|given that|so long as|as long as|wherever)\b/i;
const QUALIFIER_END = /\b(not|partly|mainly|largely|only|just|simply|but|and|or|in part|chiefly|primarily|mostly|precisely|perhaps|probably|possibly|especially|particularly|both|either)\s*$/i;

function openInside(left) {
  const dq = (left.match(/"/g) || []).length % 2 === 1;
  const curly = (left.match(/“/g) || []).length > (left.match(/”/g) || []).length;
  const paren = (left.match(/\(/g) || []).length > (left.match(/\)/g) || []).length || (left.match(/\[/g) || []).length > (left.match(/\]/g) || []).length;
  // Single quotes: ’ between letters is an apostrophe (it’s), not a closing quote.
  const singleCurly = (left.match(/‘/g) || []).length > (left.match(/’(?![A-Za-z])/g) || []).length;
  const singleStraight = (left.match(/(?<![A-Za-z])'(?=[A-Za-z])/g) || []).length > (left.match(/(?<=[A-Za-z.,!?])'(?![A-Za-z])/g) || []).length;
  return dq || curly || paren || singleCurly || singleStraight;
}

function breakPoints(sentence) {
  const pts = [];
  // A sentence that opens with "If …", "When …", "Not only …" depends on the clause that follows: never split it.
  if (SUBORDINATE_OPEN.test(sentence)) return pts;
  const dashes = (sentence.match(/—/g) || []).length;
  for (const c of CONNECTORS) {
    c.re.lastIndex = 0;
    let m;
    while ((m = c.re.exec(sentence))) {
      const left = sentence.slice(0, m.index);
      const right = sentence.slice(m.index + m[0].length);
      if (words(left).length < 7 || words(right).length < 5) continue;
      if (c.clause && !CLAUSE_START.test(right)) continue; // "billing, and collection" joins nouns, not clauses
      if (c.clause && /^that\b/i.test(right)) continue; // "and that …", "so that …" continue the clause
      if (c.dash && dashes >= 2) continue; // paired dashes enclose an aside
      if (openInside(left)) continue; // inside quotes or brackets
      if (/,\s+(who|whom|whose|which|where)\b[^,]*$/i.test(left)) continue; // an unfinished "…, who led the study" clause
      if (c.which && (CLAUSE_START.test(right) || /^[A-Z]/.test(right))) continue; // "which the authors attribute": which is the object
      if (c.because && QUALIFIER_END.test(left.replace(/,\s*$/, ''))) continue; // "not because", "partly because"
      if (c.because && /,\s*$/.test(left)) continue;
      if (pts.some((p) => Math.abs(p.at - m.index) < 3)) continue;
      pts.push({ at: m.index, len: m[0].length, start: c.start(), word: m[0].trim().replace(/^,\s*/, '') });
    }
  }
  return pts.sort((a, b) => a.at - b.at);
}

// Words that are safe to lowercase after a new opener ("This is because the …").
const COMMON_START = new Set(['the', 'a', 'an', 'this', 'that', 'these', 'those', 'it', 'they', 'we', 'he', 'she', 'there', 'many', 'most', 'some', 'our', 'their', 'its', 'his', 'her', 'my', 'your', 'such', 'each', 'every', 'no', 'one', 'all', 'both', 'in', 'on', 'at', 'for', 'with', 'as', 'if', 'when', 'while', 'after', 'before', 'since', 'more', 'several', 'few', 'any', 'only', 'even', 'other', 'another', 'none', 'not', 'what', 'how', 'why', 'where', 'you']);

function applyBreaks(sentence, pts) {
  // Fix the case of the first letter after each break (same length, so offsets hold).
  const chars = sentence.split('');
  for (const p of pts) {
    const i = p.at + p.len;
    const word = (sentence.slice(i).match(/^[A-Za-z']+/) || [''])[0];
    if (p.start) {
      // After an opener, lowercase only ordinary words; names (Microsoft, Ms. Lee) keep their capital.
      if (COMMON_START.has(word.toLowerCase()) && word !== 'I') chars[i] = chars[i].toLowerCase();
    } else if (/^[a-z]+$/.test(word)) {
      chars[i] = chars[i].toUpperCase(); // "iPhone" and other mixed-case names stay as written
    }
  }
  const s = chars.join('');
  let out = '';
  let pos = 0;
  for (const p of pts) {
    out += `${s.slice(pos, p.at).replace(/[,\s]+$/, '')}. ${p.start}`;
    pos = p.at + p.len;
  }
  return out + s.slice(pos);
}

/**
 * Options to split a long sentence. Each option's `text` replaces the whole sentence.
 * The first option splits at every safe break; the rest split at one break each.
 */
export function splitSentence(sentence, limit = 30) {
  const pts = breakPoints(sentence);
  if (!pts.length) return [];
  const opts = [];
  const pieces = (t) => t.split(/(?<=[.!?])\s+/).map((s) => words(s).length);
  // Greedy: choose breaks so every piece lands under the limit where possible.
  const chosen = [];
  let lastAt = 0;
  for (const p of pts) {
    const segWords = words(sentence.slice(lastAt, p.at)).length;
    if (segWords >= 7) { chosen.push(p); lastAt = p.at + p.len; }
  }
  if (chosen.length > 1) {
    const text = applyBreaks(sentence, chosen);
    opts.push({ text, label: `Split into ${chosen.length + 1} sentences (${pieces(text).join(', ')} words)` });
  }
  for (const p of pts.slice(0, 3)) {
    const text = applyBreaks(sentence, [p]);
    opts.push({ text, label: `Split at "${p.word || p.start.trim() || ';'}" (${pieces(text).join(' + ')} words)` });
  }
  const seen = new Set();
  return opts.filter((o) => (seen.has(o.text) ? false : seen.add(o.text))).filter(() => limit > 0);
}
