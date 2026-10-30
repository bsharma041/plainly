// Round 9 rules (Grok audit, Oct 2026): new rule IDs only, built on chunk.js.
// No rule shipped in rounds 1-8 is changed. Every fix uses the writer's own words or
// ROUND9_INSERTS (added to the guard's closed vocabulary) and still passes checkFix.
// Each rule carries its own examples: `flag` must fire, `pass` must stay silent
// (tests/round9.test.js enforces both, plus RULE_INFO and the guard).
import { chunkSentences, isFiniteVerb, breaksBefore, insideQuotes, NOM_PRONOUNS } from '../chunk.js';
import { BE, MODALS, BASE_VERBS } from '../data/usage-lists.js';
import { IRREGULAR } from '../data/lists.js';
import { IRREGULAR_BASE, baseFromIng, thirdPerson, isPluralSubject } from '../morph.js';
import { RULE_INFO } from '../data/rule-info.js';
import { matchCase, words } from '../text.js';
import { sectionModel } from '../sections.js';
import { detectDialect } from './correctness.js';

export const ROUND9_INSERTS = `who whom were many much that which but it inform informs informed informing
  question questions graduated graduate from of to with cope name`;

const set = (s) => new Set(s.trim().split(/\s+/));
const formalOn = (opts) => ['business', 'academic'].includes(opts.domain) || opts.goals?.formality === 'formal';

function card(rule, category, severity, start, end, text, fixes, title, message, scope = 'word') {
  return {
    rule, category, severity, ruleName: RULE_INFO[rule]?.name || title, title, message, start, end,
    original: text.slice(start, end), scope,
    fixes: fixes.map((f) => (typeof f === 'string' ? { text: f, start, end } : f)),
  };
}

// ---------- dangling-modifier: an opening -ing phrase with no doer in the main clause ----------
const ING_SKIP = set(`during according regarding considering including assuming given speaking judging concerning excluding
  following notwithstanding provided supposing barring pending morning evening nothing something anything everything
  building meeting spring string thing king ring sing bring being generally broadly strictly frankly
  adjusting controlling accounting allowing conditioning weighting`);
// Sentence adverbs that style guides accept as openers ("Looking ahead, the plan is …").
const SET_OPENERS = /^\s*(looking (ahead|back|forward)|going forward|moving forward|turning (now )?to|returning to|having said that|that said|taking (this|these|that|all this) into account|all things considered|weather permitting|broadly speaking|generally speaking|strictly speaking)\b/i;
const EXPLETIVE_ADJ = set(`clear evident obvious apparent possible impossible necessary important essential likely unlikely
  difficult easy hard time noted seen found shown known believed expected advisable worth useful helpful`);
const OPEN_PREP = set('after before while when upon on by');

function danglingModifier(text, ctx, out) {
  for (const s of ctx.sents) {
    const t = s.toks;
    if (t.length < 6 || !ctx.body(s.start) || SET_OPENERS.test(s.text)) continue;
    let verbAt = -1;
    if (t[0].low === 'having' && t[1].tag === 'PART') verbAt = 1;
    else if (t[0].tag === 'ING' && !ING_SKIP.has(t[0].low) && /^[A-Z]/.test(t[0].text)) verbAt = 0;
    else if (OPEN_PREP.has(t[0].low) && t[1].tag === 'ING' && !ING_SKIP.has(t[1].low)) verbAt = 1;
    if (verbAt < 0 || t[verbAt + 1]?.low === 'aside') continue; // "Pricing aside, …"
    // The opener ends at the first comma within 12 words, with no other clause break or subject pronoun before it.
    let k = -1;
    for (let j = verbAt + 1; j < Math.min(t.length, 13); j++) {
      if (t[j].gap.includes(',')) { k = j; break; }
      if (breaksBefore(t[j]) || NOM_PRONOUNS.has(t[j].low) || ['BE', 'MODAL', 'AUX'].includes(t[j].tag)) break;
    }
    if (k < 0 || k + 3 >= t.length) continue;
    const m0 = t[k].low, m1 = t[k + 1].low;
    let why = null;
    if (m0 === 'it' && (BE.has(m1) || /^(seems|seemed|becomes|became)$/.test(m1))) {
      const next = t.slice(k + 2, k + 6).map((x) => x.low);
      if (next.some((w) => EXPLETIVE_ADJ.has(w))) why = '"it" here is empty, so the sentence never says who';
    } else if (m0 === 'there' && BE.has(m1)) {
      why = '"there is/are" names no one who could do it';
    } else if (t[k].tag === 'DET') {
      // the + up to three words + was/were/is/are (+ been) + participle: a passive main clause.
      for (let j = k + 1; j <= Math.min(k + 4, t.length - 2); j++) {
        if (breaksBefore(t[j])) break;
        if (/^(is|are|was|were)$/.test(t[j].low)) {
          const p = t[j + 1].low === 'been' ? t[j + 2] : t[j + 1];
          if (p && p.tag === 'PART') why = `the main clause is passive, so "${text.slice(t[k].start, t[j - 1].end)}" reads as the one doing it`;
          break;
        }
      }
    }
    if (!why) continue;
    const start = t[0].start, end = t[k - 1].end;
    out.push(card('dangling-modifier', 'clarity', 'advanced', start, end, text, [],
      'Dangling modifier: who did this?',
      `"${text.slice(start, end)}" needs a doer, but ${why}. Start the main clause with whoever did it, for example "…, we found" or "…, the team decided".`,
      'sentence'));
  }
}

// ---------- fused-sentence: two sentences run together with no punctuation ----------
const END_WORDS = set('early late today yesterday tomorrow tonight again already ready done finished over home soon later afterwards');
// Openers that work like subordinators: "By the time it was done we had left."
const TIME_OPENER = /^\s*(by the time|(the|every|each|any|next) (time|moment|minute|second|instant|day|night|week|year)|the (first|last) time|now that|as soon as|immediately)\b/i;
const THINK_VERBS = set(`think thinks thought know knows knew believe believes believed say says said hope hopes hoped feel feels felt
  realise realised realize realized find finds found see sees saw agree agreed guess suppose supposed mean meant noticed learned learnt
  understood show shows showed suggest suggests suggested decide decided expect expected ensure ensured confirm confirmed wish wished`);

function fusedSentence(text, ctx, out) {
  for (const s of ctx.sents) {
    const t = s.toks;
    if (t.length < 5 || !ctx.body(s.start) || /\?\s*$/.test(s.text) || /^\s*it\s+(is|was)\b/i.test(s.text) || TIME_OPENER.test(s.text)) continue; // "It was yesterday we …", "By the time …"
    for (let i = 1; i < t.length - 2; i++) {
      const w = t[i], p = t[i + 1], v = t[i + 2];
      if (!END_WORDS.has(w.low) || !NOM_PRONOUNS.has(p.low) || p.gap !== ' ' || v.gap !== ' ') continue;
      if (!(isFiniteVerb(v.low) || MODALS.has(v.low))) continue;
      if (!['VERB', 'PART', 'BE', 'ING', 'ADV', 'AUX'].includes(t[i - 1].tag) && !/^(so|very|too|all)$/.test(t[i - 1].low)) continue;
      const before = t.slice(0, i);
      if (before.some((x) => x.tag === 'SUB' || THINK_VERBS.has(x.low)) || before.some((x) => breaksBefore(x) && x !== t[0])) continue;
      // "The night we got home we wrote …": a pronoun + verb earlier is a contact clause, not a second sentence.
      if (before.some((x, k) => (NOM_PRONOUNS.has(x.low) || x.low === 'it' || x.low === 'you') && k > 0 && before[k + 1] && isFiniteVerb(before[k + 1].low))) continue;
      const pron = p.low === 'i' ? 'I' : p.low;
      const cap = pron === 'I' ? 'I' : pron[0].toUpperCase() + pron.slice(1);
      out.push(card('fused-sentence', 'correctness', 'advanced', w.start, p.end, text,
        [`${w.text}. ${cap}`, `${w.text}; ${pron}`],
        'Run-on sentence', `Two sentences run together here: "…${w.text}" ends one and "${p.text} ${v.text} …" starts the next. Add a full stop or a semicolon between them.`));
      break;
    }
  }
}

// ---------- who-whom ----------
const WHOM_AUX = set('is are was were has have had will would can could should may might must does did do');
const WHO_PREP = set('to for with from by about of on against among between');

function whoWhom(text, ctx, out) {
  for (const s of ctx.sents) {
    const t = s.toks;
    if (!ctx.body(s.start)) continue;
    for (let i = 0; i < t.length - 1; i++) {
      const prev = t[i - 1], next = t[i + 1], after = t[i + 2];
      if (t[i].low === 'whom' && WHOM_AUX.has(next.low) && !breaksBefore(next) && !(prev && prev.tag === 'PREP')) {
        // "Whom did you see?": a subject follows the auxiliary, so "whom" is the object. Leave it.
        if (after && (['DET', 'PRON', 'OBJ', 'NUM'].includes(after.tag) || /^[A-Z]/.test(after.text))) continue;
        out.push(card('who-whom', 'correctness', 'advanced', t[i].start, t[i].end, text, [matchCase(t[i].text, 'who')],
          'Use "who" for the subject', `"${t[i].text} ${next.text} …": the person is doing the action, so use "who". "Whom" is for the object ("the man whom we met").`));
      }
      if (ctx.formal && t[i].low === 'who' && prev && WHO_PREP.has(prev.low) && !breaksBefore(t[i])) {
        // "talked about who should lead", "who exactly is", "who the users are", "who they are": "who" is the
        // subject or goes with "be". Look past adverbs; skip if a verb comes next or "be" comes in the clause.
        let k = i + 1;
        while (k < t.length && (t[k].tag === 'ADV' || /^(exactly|really|else)$/.test(t[k].low))) k++;
        if (k >= t.length || isFiniteVerb(t[k].low) || MODALS.has(t[k].low)) continue;
        let hasBe = false;
        for (let q = i + 1; q < Math.min(t.length, i + 8) && !breaksBefore(t[q]); q++) if (BE.has(t[q].low)) hasBe = true;
        if (hasBe) continue;
        out.push(card('who-whom', 'correctness', 'style', t[i].start, t[i].end, text, [matchCase(t[i].text, 'whom')],
          'Formal: "whom" after a preposition', `After "${prev.text}", formal English uses "whom" ("${prev.text} whom").`));
      }
    }
  }
}

// ---------- subjunctive: "if I was you" -> "were" ----------
function subjunctive(text, ctx, out) {
  const push = (m, wasAt, formal) => {
    if (insideQuotes(text, m.index) || !ctx.body(m.index)) return;
    const was = text.slice(wasAt, wasAt + 3);
    out.push(card('subjunctive', 'correctness', formal ? 'style' : 'advanced', wasAt, wasAt + 3, text, [matchCase(was, 'were')],
      'Use "were" for an unreal situation', `"${m[0]}" describes something that isn't true, so standard English uses "were".`));
  };
  let m;
  const always = /\bif (I) (was) (you|in your (?:place|position|shoes))\b/gi;
  while ((m = always.exec(text))) push(m, m.index + m[0].toLowerCase().indexOf(' was ') + 1, false);
  if (!ctx.formal) return;
  // Other subjects only when the sentence goes on to an unreal result ("would", "could", "might").
  const unreal = (at) => { const end = text.slice(at).search(/[.!?\n]/); return /\b(would|could|might)\b/i.test(text.slice(at, end < 0 ? undefined : at + end)); };
  const other = /\bif (he|she|it) (was) (you|him|her|me|them|in your (?:place|position|shoes))\b/gi;
  while ((m = other.exec(text))) if (unreal(m.index)) push(m, m.index + m[0].toLowerCase().indexOf(' was ') + 1, true);
  const formal = /\b(?:wish|wishes|wished|as if|as though) (?:I|he|she|it) (was)\b(?! (?:not )?(?:told|asked|given|sent|shown|made|done|taken|said)\b)/gi;
  while ((m = formal.exec(text))) push(m, m.index + m[0].length - 3, true);
  const wasTo = /\bif (?:I|he|she|it) (was) to\b/gi;
  while ((m = wasTo.exec(text))) if (unreal(m.index)) push(m, m.index + m[0].toLowerCase().lastIndexOf('was'), true);
}

// ---------- much-many with closed noun lists ----------
const COUNT_PLURAL = set(`people students children times problems issues things books cars questions ideas days years months weeks
  countries companies projects households families workers users members cases reasons options changes mistakes errors studies
  papers employees customers farmers villages cities houses schools hospitals plants stations`);
const MASS = set('information advice equipment research evidence furniture luggage baggage feedback knowledge traffic homework software machinery jewellery jewelry clothing progress');
const AFTER_MASS = set('DET PRON OBJ PREP COORD SUB BE MODAL AUX');

function muchMany(text, ctx, out) {
  for (const s of ctx.sents) {
    const t = s.toks;
    if (!ctx.body(s.start)) continue;
    for (let i = 0; i < t.length - 1; i++) {
      const n = t[i + 1];
      if (breaksBefore(n)) continue;
      // "How much countries spend …": "much" is the amount, the noun is a subject.
      if (t[i].low === 'much' && COUNT_PLURAL.has(n.low) && !/^(how|as|so|too|that)$/.test(t[i - 1]?.low || '')) {
        out.push(card('much-many', 'correctness', 'critical', t[i].start, t[i].end, text, [matchCase(t[i].text, 'many')],
          'Use "many" with countable nouns', `"${n.text}" can be counted, so use "many ${n.text}". "Much" goes with things you can't count ("much time").`));
      }
      if (t[i].low === 'many' && MASS.has(n.low)) {
        const after = t[i + 2];
        if (after && !breaksBefore(after) && !AFTER_MASS.has(after.tag)) continue; // "many research groups": a modifier
        out.push(card('much-many', 'correctness', 'critical', t[i].start, t[i].end, text, [matchCase(t[i].text, 'much')],
          'Use "much" with uncountable nouns', `"${n.text}" can't be counted, so use "much ${n.text}" (or "a lot of ${n.text}").`));
      }
    }
  }
}

const ASK_VERBS = set(`ask asks asked asking tell tells told telling show shows showed shown decide decides decided know knows knew known
  wonder wondered explain explains explained choose chose chosen indicate indicated question questioned enquire enquired inquire inquired
  learn learned learnt see saw determine determined identify identified check checked consider considered specify specified`);
// ---------- that-which: restrictive "which" without a comma (American English, advice) ----------
function thatWhich(text, ctx, out) {
  if (ctx.dialect !== 'us') return;
  for (const s of ctx.sents) {
    const t = s.toks;
    if (!ctx.body(s.start) || /\?\s*$/.test(s.text)) continue;
    for (let i = 2; i < t.length - 1; i++) {
      if (t[i].low !== 'which' || breaksBefore(t[i]) || t[i].gap !== ' ') continue;
      const prev = t[i - 1], next = t[i + 1];
      if (!['WORD', 'VERB'].includes(prev.tag) || /^[A-Z]/.test(prev.text)) continue;
      const det = [t[i - 2], t[i - 3]].findIndex((x) => x && x.tag === 'DET' && x.low !== 'that');
      if (det < 0 || (det === 1 && !['WORD', 'VERB'].includes(t[i - 2].tag))) continue;
      if (!(isFiniteVerb(next.low) || NOM_PRONOUNS.has(next.low) || next.tag === 'DET')) continue;
      // "asked the respondents which they preferred": an indirect question, not a relative clause.
      if (t.slice(0, i).some((x) => ASK_VERBS.has(x.low))) continue;
      out.push(card('that-which', 'clarity', 'style', t[i].start, t[i].end, text,
        [matchCase(t[i].text, 'that'), { text: `, ${t[i].text}`, start: prev.end, end: t[i].end, label: 'Add a comma (extra detail)' }],
        '"That" or ", which"?', `In American English, a clause that identifies which ${prev.text} you mean takes "that" with no comma. If it only adds detail, put a comma before "which".`));
    }
  }
}

// ---------- not-only: "not only … and also" -> "but also" ----------
function notOnly(text, ctx, out) {
  for (const s of ctx.sents) {
    const t = s.toks;
    if (!ctx.body(s.start)) continue;
    for (let i = 0; i < t.length - 1; i++) {
      if (t[i].low !== 'not' || t[i + 1].low !== 'only') continue;
      for (let j = i + 2; j < Math.min(t.length - 1, i + 22); j++) {
        if (t[j].low === 'but' || /[;:]/.test(t[j].gap)) break;
        if (t[j].low === 'and' && t[j + 1].low === 'also') {
          out.push(card('not-only', 'correctness', 'advanced', t[j].start, t[j].end, text, [matchCase(t[j].text, 'but')],
            '"Not only" takes "but also"', '"Not only X" pairs with "but also Y", not "and also".'));
          break;
        }
      }
    }
  }
}

// ---------- register-office: more Indian office phrasing (formal goals only) ----------
const OFFICE = [
  { re: /\b(intimate|intimated|intimating)\b(?=\s+(you|us|me|him|her|them|the|all|our|your)\b)/gi,
    fix: (m) => ({ intimate: 'inform', intimated: 'informed', intimating: 'informing' })[m[1].toLowerCase()],
    msg: 'In most varieties of English "intimate" means "close" or "private". To pass on news, write "inform".' },
  { re: /\b(?:I|we) (?:have|had) a (?:small )?(doubt)\b(?=\s+(?:about|on|regarding|in|over)\b)/gi, group: 1,
    fix: () => 'question',
    msg: 'Outside India, "a doubt" means you think something is wrong. If you need an answer, "a question" says so.' },
  { re: /\bcope up with\b/gi, fix: () => 'cope with', msg: '"Cope up with" is Indian English. The standard phrase is "cope with".' },
  { re: /\b(?:send|share|forward|attach|attached|review|approve|check|sign|return) (the same)\b(?=\s*[.,;]|\s+(?:at|by|to|for|and|on|today|soon)\b)/gi, group: 1,
    fix: () => 'it', msg: '"The same" as a pronoun is office jargon. "It" is clearer.' },
  { re: /\b(today|tomorrow|yesterday|now|here) itself\b/gi, fix: (m) => m[1], msg: '"Itself" after a time word ("today itself") is Indian English. The plain word says it.' },
  { re: /\btill date\b/gi, fix: () => 'to date', msg: '"Till date" is Indian English. "To date" is standard.' },
  { re: /(?<!\b(?:such|same|just|well)\s)\bas on (?=(?:date|today|\d))/gi, fix: () => 'as of ', msg: '"As on" a date is Indian English. "As of" is standard.' },
  { re: /\bpass(?:ed)? out (?:of|from) (?=(?:college|school|university|the university|IIT|IIM)\b)/gi,
    fix: (m) => (/^passed/i.test(m[0]) ? 'graduated from ' : 'graduate from '), msg: 'Outside India, "passed out" means "fainted". Write "graduated from".' },
  { re: /\b(?:know|tell me|have|share|is|what's) (?:your|his|her|their) (good name)\b/gi, group: 1, fix: () => 'name', msg: '"Good name" is Indian English. "Name" is enough.' },
  { re: /\bPFA\b/g, fix: null, msg: '"PFA" is shorthand many readers won\'t know. Write "I have attached …".' },
];

function registerOffice(text, ctx, out) {
  if (!ctx.formal) return;
  for (const r of OFFICE) {
    r.re.lastIndex = 0;
    let m;
    while ((m = r.re.exec(text))) {
      if (insideQuotes(text, m.index) || !ctx.body(m.index)) continue;
      const original = r.group ? m[r.group] : m[0];
      const start = r.group ? m.index + m[0].lastIndexOf(original) : m.index;
      const end = start + original.length;
      const fix = r.fix ? matchCase(original, r.fix(m)) : null;
      out.push(card('register-office', 'voice', 'style', start, end, text, fix ? [fix] : [], fix ? `Try "${fix.trim()}"` : 'Say it in full', r.msg));
    }
  }
}

// ---------- with-clause: a long sentence carried on by ", with X -ing …" ----------
// Split fix: ", with thermal power comprising a bulk" -> ". Thermal power comprises a bulk". The verb keeps the
// main clause's tense (present or past) and agrees with X; everything else is the writer's own words.
const ABSOLUTE_VERBS = set('comprise account constitute exceed total');
const PRESENT_MARK = set('is are am has have do does will can may shall');
const PAST_MARK = set('was were had did');
const IRREG_PAST = Object.fromEntries(Object.entries(IRREGULAR_BASE).filter(([p]) => IRREGULAR[p]).map(([p, b]) => [b, IRREGULAR[p]]));
// Regular past from the writer's own -ing word: dropping -> dropped, occurring -> occurred, carrying -> carried.
const pastFromIng = (ing) => { const st = ing.slice(0, -3); return /[^aeiou]y$/.test(st) ? `${st.slice(0, -1)}ied` : st.endsWith('e') ? `${st}d` : `${st}ed`; };

function mainTense(toks) {
  // Auxiliaries decide first ("has traditionally relied" is present). Otherwise the first verb after a noun or
  // pronoun decides: "-ed" is past, "-s" is present. Nouns that look like verbs ("states") come later, after it.
  // If present and past signals both appear (a relative clause in another tense), offer no fix.
  let present = toks.some((x) => PRESENT_MARK.has(x.low));
  let past = toks.some((x) => PAST_MARK.has(x.low));
  for (let k = 1; k < toks.length; k++) {
    const prev = toks[k - 1];
    if (breaksBefore(toks[k]) || !['PRON', 'WORD', 'VERB'].includes(prev.tag)) continue;
    if (toks[k].tag === 'PART') past = true;
    if (toks[k].tag === 'VERB' && /[^s]s$/.test(toks[k].low) && prev.tag !== 'VERB' && !present && !past) present = true;
  }
  if (present && past) return null;
  return present ? 'present' : past ? 'past' : null;
}

function splitFix(text, t, i) {
  // t[i] is "with"; X is DET/WORD tokens up to the -ing verb (at most 5 words, no preposition).
  let v = -1;
  for (let j = i + 1; j < Math.min(t.length, i + 7); j++) {
    if (breaksBefore(t[j])) return null;
    if (t[j].tag === 'ING') { v = j; break; }
    if (!['DET', 'WORD', 'VERB', 'ADV'].includes(t[j].tag) || (t[j].tag === 'DET' && j > i + 1)) return null;
  }
  if (v < i + 2 || t.length - v < 4 || i < 8) return null;
  const base = baseFromIng(t[v].low);
  if (!(BASE_VERBS.has(base) || ABSOLUTE_VERBS.has(base) || IRREG_PAST[base])) return null;
  // A modal before "with" ("will expand", "may rise"): the split would turn a forecast into a fact.
  if (t.slice(0, i).some((x) => /^(will|shall|would|may|might|can|could|must)$/.test(x.low))) return null;
  const tense = mainTense(t.slice(0, i));
  if (!tense) return null;
  const subject = text.slice(t[i + 1].start, t[v - 1].end);
  const verb = tense === 'past' ? (IRREG_PAST[base] || pastFromIng(t[v].low)) : (isPluralSubject(subject) ? base : thirdPerson(base));
  const comma = text.lastIndexOf(',', t[i].start);
  const lead = subject[0].toUpperCase() + subject.slice(1);
  return { text: `. ${lead} ${verb}`, start: comma, end: t[v].end, label: 'Split into two sentences' };
}

function withClause(text, ctx, out) {
  const limit = ctx.longSentence;
  for (const s of ctx.sents) {
    const t = s.toks;
    if (t.length <= limit || !ctx.body(s.start)) continue;
    for (let i = 3; i < t.length - 3; i++) {
      if (t[i].low !== 'with' || !/,\s*$/.test(t[i].gap)) continue;
      const fix = splitFix(text, t, i);
      if (!fix) continue;
      out.push(card('with-clause', 'clarity', 'style', fix.start, fix.end, text, [fix],
        'Long sentence: split at ", with"', `This sentence runs ${t.length} words. The ", with …" part adds a second idea; it reads better as its own sentence.`, 'sentence'));
      break;
    }
  }
}

/** The round 9 rules with their own examples. `opts` on an example sets the options it runs under. */
export const ROUND9_RULES = [
  { id: 'dangling-modifier', run: danglingModifier,
    flag: ['Having reviewed the data, the decision was made to stop the trial.', 'Looking at the figures, it is clear that demand is rising.', 'After finishing the survey, there were several gaps in the data.'],
    pass: ['Having reviewed the data, we decided to stop the trial.', 'Looking at the figures, the team saw that demand was rising.', 'According to the report, the plant was closed in 2019.', 'Running at full load, it is noisy.'] },
  { id: 'fused-sentence', run: fusedSentence,
    flag: ['The meeting ended early we went home.', 'The draft is ready we can send it today.'],
    pass: ['The meeting ended early and we went home.', 'I think now we should leave.', 'If we leave early we can avoid traffic.', 'By the time you are ready we will have finished.', 'By the time it was done we had left.',
      'The moment it was over we left the hall.', 'Every time the report was late we lost a client.', 'The day it was done I sent the invoice.', 'The report we wrote is long.', 'We met today. We agreed on the plan.'] },
  { id: 'who-whom', run: whoWhom,
    flag: ['The officer whom is in charge will reply.', { text: 'The award goes to the person with who I worked.', opts: { domain: 'business' } }],
    pass: ['Whom did you see at the meeting?', 'The officer whom we met will reply.', 'To whom was the letter sent?', { text: 'We talked about who should lead the team.', opts: { domain: 'business' } }, 'The award goes to the person with who I worked.'] },
  { id: 'subjunctive', run: subjunctive,
    flag: ['If I was you, I would wait.', { text: 'I wish it was easier to fund.', opts: { goals: { formality: 'formal' } } }],
    pass: ['If I was late, I apologise.', 'I wish it was easier to fund.', 'If I were you, I would wait.'] },
  { id: 'much-many', run: muchMany,
    flag: ['There were not much people at the hearing.', 'We do not have many information on costs.'],
    pass: ['There were many research groups at the hearing.', 'We do not have much information on costs.', 'Many software tools exist.', 'We spent much time on it.'] },
  { id: 'that-which', run: thatWhich,
    flag: [{ text: 'The color of the report which was published last year is gray.', opts: { dialect: 'us' } }],
    pass: [{ text: 'The report, which was published last year, is long.', opts: { dialect: 'us' } }, { text: 'The report which was published last year is long.', opts: { dialect: 'uk' } },
      { text: 'The extent to which prices rose is unclear.', opts: { dialect: 'us' } }] },
  { id: 'not-only', run: notOnly,
    flag: ['The plan is not only cheap and also fast to build.'],
    pass: ['The plan is not only cheap but also fast to build.', 'The plan is cheap and also fast to build.'] },
  { id: 'register-office', run: registerOffice,
    flag: [{ text: 'Please intimate us of the date.', opts: { domain: 'business' } }, { text: 'I have a doubt about the tariff.', opts: { domain: 'business' } },
      { text: 'We will send the same by Friday.', opts: { domain: 'business' } }, { text: 'Please reply today itself.', opts: { domain: 'business' } },
      { text: 'He passed out of college in 2010.', opts: { domain: 'business' } }, { text: 'No changes till date.', opts: { domain: 'business' } }],
    pass: ['Please intimate us of the date.', { text: 'They had an intimate dinner.', opts: { domain: 'business' } }, { text: 'I have no doubt that it works.', opts: { domain: 'business' } },
      { text: 'Both plants use the same design.', opts: { domain: 'business' } }] },
  { id: 'with-clause', run: withClause,
    flag: ['The state has relied on other states and central thermal stations for most of its supply over the last two decades of rapid growth in demand, with thermal power comprising a bulk of the power it buys each year.'],
    pass: ['The firm says it will expand its network across the country over the next three years and expects revenue to rise, with new outlets opening in Tier 2 cities across the south.',
      'The state added solar capacity, with help from the centre.', 'The state added solar capacity between 2015 and 2023 across rural and urban districts with support from two central schemes and several private developers in the north of the state.',
      'The state added solar capacity between 2015 and 2023 across rural and urban districts in both the north and the south of the state, with most of the new plants located in the north.'] },
];

export const ROUND9_IDS = ROUND9_RULES.map((r) => r.id);

/** Run every round 9 rule. Pure and synchronous. */
export function syllabusRules(text, opts = {}) {
  const model = sectionModel(text);
  const ctx = {
    sents: chunkSentences(text),
    formal: formalOn(opts),
    dialect: opts.dialect && opts.dialect !== 'auto' ? opts.dialect : detectDialect(text),
    longSentence: opts.longSentence || 30,
    body: (pos) => ['body', 'list'].includes(model.kindAt(pos)),
  };
  const out = [];
  for (const r of ROUND9_RULES) r.run(text, ctx, out);
  return out.filter((s) => !insideQuotes(text, s.start));
}
