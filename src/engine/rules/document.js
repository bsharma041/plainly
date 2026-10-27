// Round 6 document-level rules (docs/review/round-6-spec.md): D1 consistency,
// D2 acronyms, D3a numbers, D4 study tense, D5 unsupported claims, D6 paragraph
// signals, D8a unused keywords. Pure: text + options in, { inline, findings } out.
// Consistency fixes only ever use a form the writer already used in the document.
import {
  COMMON_ACRONYMS, UNITS, ACRONYM_MINOR, ISE_EXCEPTIONS, LL_KEEP, CLOSED_COMPOUNDS, PROPER_TERMS, NUMBER_IDENTIFIERS,
  STUDY_NOUNS, STUDY_VERBS, CLAIM_PHRASES, BOOSTER_ADVERBS, STUDY_CLAIMS, SIZE_WORDS, PARAGRAPH_LIMIT,
} from '../data/document-lists.js';
import { STOPWORDS, IRREGULAR } from '../data/lists.js';
import { SPELLING } from '../data/spelling.js';
import { BASE_VERBS, PREPOSITIONS, BE, MODALS } from '../data/usage-lists.js';
import { RULE_INFO } from '../data/rule-info.js';
import { words, splitSentences, escapeRegex, isSentenceStart } from '../text.js';
import { baseForm, IRREGULAR_BASE as IRREGULAR_BASE_MAP } from '../morph.js';
import { PAST_TO_BASE } from './grammar.js';
import { sectionModel } from '../sections.js';

const GROUP = {
  'consistency-spelling': 'consistency', 'consistency-hyphen': 'consistency', 'consistency-case': 'consistency', 'consistency-percent': 'consistency',
  'acronym-before-definition': 'acronyms', 'acronym-undefined': 'acronyms', 'acronym-redefined': 'acronyms',
  'number-grouping': 'numbers', 'number-separator': 'numbers', 'unsupported-claim': 'evidence',
  'paragraph-end': 'structure', 'paragraph-same-start': 'structure', 'paragraph-long': 'structure',
  'study-tense': 'tense', 'keyword-unused': 'keywords',
};

const inst = (text, start, end, fixText) => ({
  start, end, original: text.slice(start, end), fixes: fixText == null ? [] : [{ text: fixText, start, end }],
});

function finding(rule, level, title, message, instances, extra = {}) {
  // The finding points at its first fixable instance (the odd one out), or its first instance for advice.
  const first = instances.find((i) => i.fixes.length) || instances[0];
  return {
    rule, category: extra.category || 'clarity', severity: extra.severity || 'style', level, group: GROUP[rule],
    ruleName: RULE_INFO[rule]?.name || title, title, message, scope: 'word',
    start: first.start, end: first.end, original: first.original, fixes: extra.fixes || [], instances, ...extra.more,
  };
}

function card(rule, category, severity, i, title, message) {
  return {
    rule, category, severity, ruleName: RULE_INFO[rule]?.name || title, title, message,
    start: i.start, end: i.end, original: i.original, scope: 'word', fixes: i.fixes,
  };
}

function insideQuotes(text, index) {
  const lineStart = text.lastIndexOf('\n', index - 1) + 1;
  const before = text.slice(lineStart, index);
  return (before.match(/"/g) || []).length % 2 === 1 || (before.match(/“/g) || []).length > (before.match(/”/g) || []).length;
}
const isTableLine = (line) => ((line.match(/[\t|]/g) || []).length >= 3);
const nounLike = (w) => w && /^[a-z]/i.test(w) && !STOPWORDS.has(w.toLowerCase()) && !PREPOSITIONS.has(w.toLowerCase())
  && !BE.has(w.toLowerCase()) && !MODALS.has(w.toLowerCase()) && !/ly$/i.test(w);

// ---------- D1.1 spelling family ----------
const IZ_RE = /^([a-z]{4,})(is|iz)(e|es|ed|ing|ation|ations|er|ers)$/;
const ELL_RE = /^([a-z]{3,})e(ll|l)(ed|ing|er|ers)$/;

function spellingFamily(text, model, opts, out) {
  const all = words(text);
  const lowerSet = new Set(all.map((w) => w.text.toLowerCase()));
  const items = [];
  for (const w of all) {
    if (!model.isBody(w.start) || insideQuotes(text, w.start)) continue;
    if (/^[A-Z]/.test(w.text) && !isSentenceStart(text, w.start)) continue; // names: Centre for Policy Research
    const low = w.text.toLowerCase();
    const hit = SPELLING.get(low);
    if (hit) { items.push({ w, style: hit.dialect, fix: hit.other, fixable: true }); continue; }
    let m = low.match(IZ_RE);
    if (m && !ISE_EXCEPTIONS.has(low)) {
      const other = `${m[1]}${m[2] === 'is' ? 'iz' : 'is'}${m[3]}`;
      const sure = /ation/.test(m[3]) || lowerSet.has(other)
        || [...lowerSet].some((x) => x.startsWith(m[1]) && /(is|iz)ations?$/.test(x));
      if (sure) items.push({ w, style: m[2] === 'is' ? 'uk' : 'us', fix: other, fixable: true });
      continue;
    }
    m = low.match(ELL_RE);
    if (m && m[2] === 'll' && !LL_KEEP.has(`${m[1]}el`) && !LL_KEEP.has(m[1])) items.push({ w, style: 'uk', fix: null, fixable: false });
  }
  const uk = items.filter((i) => i.style === 'uk').length;
  const us = items.filter((i) => i.style === 'us').length;
  if (!uk || !us) return;
  const target = opts.dialect === 'us' || opts.dialect === 'uk' ? opts.dialect : uk === us ? null : (uk > us ? 'uk' : 'us');
  const label = { uk: 'British (-ise, -our, -re)', us: 'American (-ize, -or, -er)' };
  if (!target) {
    const ins = items.map((i) => inst(text, i.w.start, i.w.end, null));
    out.findings.push(finding('consistency-spelling', 'document', `British (${uk}) vs American (${us}) spellings`,
      'This document mixes British and American spellings equally often. Pick one and use it throughout (set it in Settings to get fixes).', ins));
    return;
  }
  const minority = items.filter((i) => i.style !== target && i.fixable);
  if (!minority.length) return;
  const ins = items.map((i) => {
    const fix = i.style !== target && i.fixable ? matchCaseWord(i.w.text, i.fix) : null;
    return inst(text, i.w.start, i.w.end, fix);
  });
  const n = target === 'uk' ? uk : us;
  out.findings.push(finding('consistency-spelling', 'document', `${label[target]} spelling (${n}) vs ${target === 'uk' ? 'American' : 'British'} (${minority.length})`,
    `Most of your spellings are ${target === 'uk' ? 'British' : 'American'}. Use one style throughout.`, ins, { fixable: true }));
  for (const i of ins.filter((x) => x.fixes.length)) {
    out.inline.push(card('consistency-spelling', 'clarity', 'style', i, `Consistency: "${i.fixes[0].text}"`,
      `You mostly use ${target === 'uk' ? 'British' : 'American'} spelling (${n} words). "${i.fixes[0].text}" matches the rest of the document.`));
  }
}
const matchCaseWord = (orig, rep) => (/^[A-Z]/.test(orig) ? rep[0].toUpperCase() + rep.slice(1) : rep);

// ---------- D1.2 hyphenation ----------
function hyphenConsistency(text, model, out) {
  const pairs = new Map(); // key "a b" -> { hy: [], open: [], closed: [], closedForm }
  const get = (k) => { if (!pairs.has(k)) pairs.set(k, { hy: [], open: [], closed: [] }); return pairs.get(k); };
  const re = /\b([A-Za-z]{2,})-([A-Za-z]{2,})\b(?!-)/g;
  let m;
  while ((m = re.exec(text))) {
    if (text[m.index - 1] === '-') continue;
    const k = model.kindAt(m.index);
    if (k !== 'body' && k !== 'list' && k !== 'keywords') continue;
    get(`${m[1].toLowerCase()} ${m[2].toLowerCase()}`);
  }
  for (const [open, closed] of CLOSED_COMPOUNDS) {
    const key = open.replace('-', ' ');
    const p = get(key);
    p.closedForm = closed;
  }
  for (const [key, p] of pairs) {
    const [a, b] = key.split(' ');
    const scan = (rx, list, attrOnly) => {
      rx.lastIndex = 0;
      let x;
      while ((x = rx.exec(text))) {
        if (text[x.index - 1] === '-' || text[x.index + x[0].length] === '-') continue;
        const k = model.kindAt(x.index);
        if (k !== 'body' && k !== 'list' && k !== 'keywords') continue;
        const next = (text.slice(x.index + x[0].length).match(/^ ([A-Za-z][A-Za-z'’-]*)/) || [])[1];
        if (attrOnly && !nounLike(next)) continue; // attributive uses only: "net-metering approval", not "in the long term"
        list.push({ start: x.index, end: x.index + x[0].length, text: x[0], evidence: k !== 'keywords' });
      }
    };
    const attr = !p.closedForm;
    scan(new RegExp(`\\b${escapeRegex(a)}-${escapeRegex(b)}\\b`, 'gi'), p.hy, attr);
    scan(new RegExp(`\\b${escapeRegex(a)} ${escapeRegex(b)}\\b`, 'gi'), p.open, attr);
    if (p.closedForm) scan(new RegExp(`\\b${escapeRegex(p.closedForm)}\\b`, 'gi'), p.closed, false);
    const forms = [['hy', `${a}-${b}`], ['open', `${a} ${b}`], ['closed', p.closedForm]].filter(([f]) => p[f].length);
    if (forms.length < 2) continue;
    const count = (f) => p[f].filter((x) => x.evidence).length;
    const ranked = forms.map(([f, s]) => [f, s, count(f)]).sort((x, y) => y[2] - x[2]);
    let winner = ranked[0];
    if (ranked[1][2] === winner[2]) winner = ranked.find(([f]) => f === (p.closedForm ? 'closed' : 'hy')) || null;
    if (!winner || winner[2] === 0) continue;
    const [wf, ws, wn] = winner;
    const ins = [];
    for (const [f] of forms) {
      for (const x of p[f]) {
        const fix = f === wf ? null : matchCaseWord(x.text, ws);
        ins.push(inst(text, x.start, x.end, fix));
      }
    }
    ins.sort((x, y) => x.start - y.start);
    const minority = ins.filter((x) => x.fixes.length);
    out.findings.push(finding('consistency-hyphen', 'document', `"${ws}" (${wn}) vs ${forms.filter(([f]) => f !== wf).map(([, s]) => `"${s}"`).join(', ')} (${minority.length})`,
      `You write this term in more than one way. Use "${ws}" throughout.`, ins, { fixable: true }));
    for (const i of minority) {
      out.inline.push(card('consistency-hyphen', 'clarity', 'style', i, `Consistency: "${i.fixes[0].text}"`,
        `You write "${ws}" ${wn} time${wn === 1 ? '' : 's'} and "${i.original}" here. Use one form throughout.`));
    }
  }
}

// ---------- D1.3 capitalisation ----------
const SHORT_FORMS = new Set(['Commission', 'Ministry', 'Department', 'Government', 'State', 'Court', 'Council', 'Authority', 'Board', 'Bank', 'Committee', 'Corporation', 'Agency', 'Directorate']);
function shortFormOfName(text, word) {
  const ending = new RegExp(`[A-Z][a-z]+(?:\\s+(?:of|for|and|on|the)?\\s*[A-Z][a-z]+)*\\s+${word}\\b`);
  const heading = new RegExp(`\\b${word}\\s+(?:of|for)\\s+(?:the\\s+)?[A-Z]`);
  return ending.test(text) || heading.test(text);
}
const LABEL_WORDS = new Set(['table', 'figure', 'fig', 'section', 'chapter', 'annex', 'appendix', 'box', 'act', 'article', 'phase', 'stage', 'scenario', 'option', 'part', 'page']);

function caseConsistency(text, model, out) {
  const runs = new Map(); // lower key -> { caps: [], lower: [] }
  const counted = (pos) => model.kindAt(pos) === 'body' || model.kindAt(pos) === 'list';
  for (const sent of splitSentences(text)) {
    if (!counted(sent.start)) continue;
    const ws = words(sent.text, sent.start);
    let i = 1; // never the sentence-initial word
    while (i < ws.length) {
      const isCap = (w) => /^[A-Z][a-z]/.test(w.text) && !/[A-Z]{2}/.test(w.text);
      if (!isCap(ws[i]) || /:\s*$/.test(text.slice(ws[i].start - 2, ws[i].start))) { i++; continue; }
      let j = i;
      while (j < ws.length && isCap(ws[j])) {
        j++;
        if (j < ws.length && !/^ +$/.test(text.slice(ws[j - 1].end, ws[j].start))) break; // a run stops at punctuation
      }
      const run = ws.slice(i, j);
      i = j;
      if (run.length > 4) continue;
      if (run.some((w) => PROPER_TERMS.has(w.text) || insideQuotes(text, w.start))) continue;
      if (run.length === 1 && LABEL_WORDS.has(run[0].text.toLowerCase())) continue;
      if (/^\s*\d/.test(text.slice(run[run.length - 1].end, run[run.length - 1].end + 3))) continue; // "Table 2", "Phase 3"
      const start = run[0].start, end = run[run.length - 1].end;
      // Round 7 (H1): never part of a longer proper name. "Government of Goa", "Ministry of New and Renewable Energy",
      // "Commission (JERC)", or a capitalised word right before it ("The Commission held").
      const after = text.slice(end, end + 40);
      if (/^\s+(of|for|and|on)\s+[A-Z]/.test(after) || /^\s*\([A-Z][A-Za-z]*[A-Z]/.test(after)) continue;
      // A company name with a legal suffix ("Rolls-Royce plc") is a name.
      if (/^\s+(plc|ltd|inc|llc|llp|pvt|co|corp|limited|group|gmbh|ag|sa)\b/i.test(after)) continue;
      const k0 = ws.indexOf(run[0]);
      if (k0 > 0 && /^[A-Z]/.test(ws[k0 - 1].text)) continue;
      // The definite short form of a name the document uses in full ("the Commission" after "… Regulatory Commission").
      if (run.length === 1 && SHORT_FORMS.has(run[0].text) && shortFormOfName(text, run[0].text)) continue;
      const key = text.slice(start, end).toLowerCase().replace(/\s+/g, ' ');
      if (!runs.has(key)) runs.set(key, { caps: [], lower: [] });
      runs.get(key).caps.push({ start, end });
    }
  }
  for (const [key, r] of runs) {
    const rx = new RegExp(`(?<![A-Za-z-])${key.split(' ').map(escapeRegex).join('\\s+')}(?![A-Za-z-])`, 'g');
    let m;
    while ((m = rx.exec(text))) if (counted(m.index)) r.lower.push({ start: m.index, end: m.index + m[0].length });
    if (!r.lower.length) continue;
    // Round 7 (H1): lowercase only when the capitalised form is the minority. A tie is advice, except for a
    // title-cased hyphenated compound ("Net-Metering" vs "net-metering"), which is never a name.
    const tieFix = r.lower.length === r.caps.length && key.includes('-');
    const lowerWins = r.lower.length > r.caps.length || tieFix;
    if (!lowerWins) {
      const capsForm0 = text.slice(r.caps[0].start, r.caps[0].end);
      const ins0 = [...r.caps, ...r.lower].sort((a, b) => a.start - b.start).map((x) => inst(text, x.start, x.end, null));
      out.findings.push(finding('consistency-case', 'document', `"${capsForm0}" (${r.caps.length}) vs "${key}" (${r.lower.length})`,
        `You write "${capsForm0}" in some places and "${key}" in others. If it's a name, keep the capitals; if it's a general term, use lowercase throughout.`, ins0));
      continue;
    }
    const capsForm = text.slice(r.caps[0].start, r.caps[0].end);
    const winForm = lowerWins ? key : capsForm;
    const ins = [...r.caps.map((x) => inst(text, x.start, x.end, lowerWins ? text.slice(x.start, x.end).toLowerCase() : null)),
      ...r.lower.map((x) => inst(text, x.start, x.end, lowerWins ? null : capsForm))].sort((a, b) => a.start - b.start);
    const minority = ins.filter((x) => x.fixes.length);
    const n = lowerWins ? r.lower.length : r.caps.length;
    out.findings.push(finding('consistency-case', 'document', `"${winForm}" (${n}) vs "${lowerWins ? capsForm : key}" (${minority.length})`,
      `You capitalise "${key}" in some places and not others. Use "${winForm}" throughout.`, ins, { fixable: true }));
    for (const i of minority) {
      out.inline.push(card('consistency-case', 'clarity', 'style', i, `Consistency: "${i.fixes[0].text}"`,
        `You write "${winForm}" ${n} time${n === 1 ? '' : 's'} and "${i.original}" here. Use one form throughout.`));
    }
  }
}

// ---------- D1.4 per cent ----------
function percentConsistency(text, model, out) {
  const occ = [];
  // Round 8 (R8-2): "percentage points" and "percentile" are not variants; neither is "%" in statistical notation.
  const re = /(\d+(?:\.\d+)?)(\s*)(per cent|percent(?![a-z])|%)/gi;
  let m;
  while ((m = re.exec(text))) {
    if (!model.isBody(m.index) || isTableLine(model.lineAt(m.index)?.text || '')) continue;
    if (m[3] === '%') {
      const after = text.slice(m.index + m[0].length, m.index + m[0].length + 20);
      const before = text.slice(Math.max(0, m.index - 30), m.index);
      const open = text.lastIndexOf('(', m.index), close = text.indexOf(')', m.index);
      const paren = open >= 0 && close > m.index && open > text.lastIndexOf(')', m.index - 1) && close - open < 60 ? text.slice(open, close) : '';
      if (/^\s*(CI|confidence)\b/i.test(after) || /\b(CI|confidence interval)\b[^.]{0,20}$/i.test(before) || /\bCI\b|\bp\s*[<=>]/.test(paren)) continue;
    }
    if (text[m.index - 1] === '(' && text[m.index + m[0].length] === ')') continue; // a parenthesis holding only the figure
    occ.push({ form: m[3] === '%' ? '%' : m[3].toLowerCase(), numStart: m.index, spaceStart: m.index + m[1].length,
      unitStart: m.index + m[1].length + m[2].length, end: m.index + m[0].length });
  }
  const n = (f) => occ.filter((o) => o.form === f).length;
  const pc = n('per cent'), p = n('percent'), pct = n('%');
  const forms = [['per cent', pc], ['percent', p], ['%', pct]].filter(([, c]) => c);
  if (forms.length < 2) return;
  const spelled = pc + p;
  const spelledWinner = pc > p ? 'per cent' : p > pc ? 'percent' : (spelled ? (pc ? 'per cent' : 'percent') : null);
  let pctWinner = null; // between "%" and the spelled forms: only with a 3x majority
  if (pct && spelled) {
    if (pct >= 3 * spelled) pctWinner = '%';
    else if (spelled >= 3 * pct) pctWinner = spelledWinner;
  }
  const target = (o) => {
    if (pctWinner === '%') return o.form === '%' ? null : '%';
    if (o.form === '%') return pctWinner;
    if (pc && p && pc !== p && o.form !== spelledWinner) return spelledWinner;
    return null;
  };
  const ins = occ.map((o) => {
    const i = inst(text, o.numStart, o.end, null);
    const t = target(o);
    if (t === '%') i.fixes = [{ text: '%', start: o.spaceStart, end: o.end }];
    else if (t) i.fixes = o.form === '%' ? [{ text: ` ${t}`, start: o.unitStart, end: o.end }] : [{ text: t, start: o.unitStart, end: o.end }];
    return i;
  });
  const minority = ins.filter((x) => x.fixes.length);
  const title = forms.map(([f, c]) => `"${f}" (${c})`).join(' vs ');
  out.findings.push(finding('consistency-percent', 'document', title,
    minority.length ? 'You write percentages in more than one way. The fixes switch the odd ones to your usual form.'
      : 'You write percentages in more than one way. Style guides differ, so pick one form and use it throughout.', ins, { fixable: minority.length > 0 }));
  for (const i of minority) {
    const f = i.fixes[0];
    const win = f.text.trim();
    const count = win === '%' ? pct : win === 'per cent' ? pc : p;
    out.inline.push(card('consistency-percent', 'clarity', 'style', { start: f.start, end: f.end, original: text.slice(f.start, f.end), fixes: [f] },
      `Consistency: "${win}"`, `You write "${win}" ${count} time${count === 1 ? '' : 's'} and "${i.original}" here. Use one form throughout.`));
  }
}

// ---------- D2 acronyms ----------
const ACR_RE = /\b[A-Z][A-Za-z]*[A-Z][A-Za-z]*\b/g;

function initialsMatch(parts, letters) {
  // parts: lowercase words (hyphen parts split). Minor words may be skipped; a minor word may also supply a letter ("MoP").
  const go = (wi, li) => {
    if (li === letters.length) return wi === parts.length;
    if (wi === parts.length) return false;
    const w = parts[wi];
    if (w[0] === letters[li] && go(wi + 1, li + 1)) return true;
    return ACRONYM_MINOR.has(w) && wi > 0 && go(wi + 1, li);
  };
  return go(0, 0);
}

function acronyms(text, model, opts, out) {
  const dict = new Set((opts.dictionary || []).map((w) => w.toLowerCase()));
  const occ = [];
  ACR_RE.lastIndex = 0;
  let m;
  while ((m = ACR_RE.exec(text))) {
    const t = m[0];
    const letters = t.replace(/[^A-Za-z]/g, '');
    const caps = (t.match(/[A-Z]/g) || []).length;
    if (letters.length < 2 || letters.length > 6 || caps < 2) continue;
    if (COMMON_ACRONYMS.has(t) || UNITS.has(t) || /^[IVXLCDM]+$/.test(t) || STOPWORDS.has(t.toLowerCase()) || dict.has(t.toLowerCase())) continue;
    const kind = model.kindAt(m.index);
    if (kind !== 'body' && kind !== 'list') continue;
    // Round 7 (M1): an acronym inside a citation is a source name, not a term to define: "(CEA, 2021)", "[3]".
    const open = text.lastIndexOf('(', m.index), close = text.indexOf(')', m.index);
    if (open >= 0 && close > 0 && open > text.lastIndexOf(')', m.index - 1) && close - open < 80 && /\b\d{4}[a-z]?\b/.test(text.slice(open, close))) continue;
    const key = /[A-Z]s$/.test(t) && t.length > 2 ? t.slice(0, -1) : t;
    if (COMMON_ACRONYMS.has(key)) continue;
    occ.push({ t, key, start: m.index, end: m.index + t.length });
  }
  // Definitions: "Long Form (ACR)" or "ACR (Long Form)".
  for (const o of occ) {
    const letters = o.key.toLowerCase();
    if (text[o.start - 1] === '(' && text[o.end] === ')') {
      const sentStart = Math.max(text.lastIndexOf('.', o.start - 2), text.lastIndexOf('\n', o.start - 2)) + 1;
      const before = text.slice(sentStart, o.start - 1);
      const toks = words(before, sentStart).slice(-8);
      const flat = toks.flatMap((w) => w.text.split('-').map((p) => ({ p: p.toLowerCase(), start: w.start })));
      let best = -1;
      for (let s = flat.length - 1; s >= 0; s--) {
        if (ACRONYM_MINOR.has(flat[s].p)) continue;
        if (initialsMatch(flat.slice(s).map((x) => x.p), letters)) best = s;
      }
      if (best >= 0) { o.def = { start: flat[best].start, end: o.end + 1, long: text.slice(flat[best].start, o.start - 1).trim() }; }
    } else {
      const after = text.slice(o.end).match(/^\s*\(([^()]{3,80})\)/);
      if (after) {
        const parts = after[1].split(/[\s-]+/).filter(Boolean).map((p) => p.toLowerCase().replace(/[^a-z]/g, '')).filter(Boolean);
        if (initialsMatch(parts, letters)) o.def = { start: o.start, end: o.end + after[0].length, long: after[1].trim() };
      }
    }
  }
  const byScope = new Map();
  for (const o of occ) {
    const k = `${model.scopeOf(o.start)}|${o.key}`;
    if (!byScope.has(k)) byScope.set(k, []);
    byScope.get(k).push(o);
  }
  for (const [k, list] of byScope) {
    const [scope, key] = k.split('|');
    const defs = list.filter((o) => o.def);
    const uses = list.filter((o) => !o.def);
    const where = scope === 'abstract' ? ' in this section' : '';
    if (!defs.length) {
      if (!uses.length) continue;
      const i = inst(text, uses[0].start, uses[0].end, null);
      out.findings.push(finding('acronym-undefined', 'document', `"${key}" is never spelled out${where}`,
        `Spell out "${key}" the first time you use it.`, [i, ...uses.slice(1).map((u) => inst(text, u.start, u.end, null))]));
      continue;
    }
    if (uses.length && uses[0].start < defs[0].start) {
      out.findings.push(finding('acronym-before-definition', 'document', `"${key}" is used before it is defined`,
        `"${key}" is used here but defined later ("${defs[0].def.long} (${key})"). Define it at first use.`,
        [inst(text, uses[0].start, uses[0].end, null)], { more: { definition: { start: defs[0].def.start, end: defs[0].def.end } } }));
    }
    for (const d of defs.slice(1)) {
      const i = inst(text, d.def.start, d.def.end, d.t);
      out.findings.push(finding('acronym-redefined', 'document', `"${key}" is defined twice${where}`,
        `"${key}" is already defined earlier. After the first time, use "${d.t}" alone.`, [i], { fixable: true }));
      out.inline.push(card('acronym-redefined', 'clarity', 'style', i, `Use "${d.t}"`,
        `"${key}" is already defined earlier ("${defs[0].def.long} (${key})"). After the first time, use "${d.t}" alone.`));
    }
  }
}

// ---------- D3a numbers ----------
const CODE_WORDS = /\b(pin|pincode|pin code|postal code|postcode|zip|plot|survey no|ward|room|tel|ph|phone|fax|mobile|\+91)\.?\s*$/i;
const INDIAN = /^\d{1,2}(,\d{2})+,\d{3}$/;
const INTL = /^\d{1,3}(,\d{3})+$/;
const digits = (s) => s.replace(/,/g, '');
function group(n, system) {
  const d = digits(n);
  if (d.length <= 3) return d;
  if (system === 'indian') {
    const last = d.slice(-3);
    const rest = d.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return `${rest},${last}`;
  }
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function numbers(text, model, out) {
  const nums = [];
  const re = /\d[\d,]*\d|\d/g;
  let m;
  while ((m = re.exec(text))) {
    const s = m.index, e = s + m[0].length;
    const prev = text[s - 1] || ' ', next = text[e] || ' ';
    if (/[\w./:+-]/.test(prev) || /[\w/:]/.test(next) || (next === '.' && /\d/.test(text[e + 1] || ''))) continue;
    if (!model.isBody(s) || isTableLine(model.lineAt(s)?.text || '')) continue;
    if (NUMBER_IDENTIFIERS.test(text.slice(Math.max(0, s - 14), s))) continue;
    if (/\d[\s-]+$/.test(text.slice(Math.max(0, s - 3), s)) || /^[\s-]+\d/.test(text.slice(e, e + 3))) continue; // phone-like groups
    const t = m[0];
    const d = digits(t);
    // Round 7 (H2): foreign-currency amounts and figures before million/billion are international by convention:
    // never compared with rupee amounts or counts, never regrouped.
    const before = text.slice(Math.max(0, s - 6), s);
    const after = text.slice(e, e + 20);
    if (/(US\$|\$|USD|€|EUR|£|GBP)\s*$/.test(before) || /^\s*(dollars?|euros?|pounds?|million|billion|bn|mn)\b/i.test(after)) continue;
    let kind = null;
    if (t.includes(',')) {
      if (d.length >= 6 && INDIAN.test(t) && !INTL.test(t)) kind = 'indian';
      else if (d.length >= 6 && INTL.test(t)) kind = 'intl';
      else if (INTL.test(t) || INDIAN.test(t)) kind = 'sep4';
      else continue;
    } else {
      if (d.length < 4) continue;
      if (d.length === 4 && +d >= 1000 && +d <= 2100) continue; // years
      // Round 7 (H3): only quantities. A rupee amount, or a number followed by a unit or noun ("3200 files").
      // Never a code: PIN, phone, plot, ward, a number after a place name ("Panaji 403001") or before punctuation.
      const rupee = /(₹|Rs\.?|INR)\s*$/.test(before);
      const unitAfter = /^ [a-z][a-z-]*/.test(after) || /^ (MW|kW|GW|kWh|MWh|GWh|km|kg|tonnes?)\b/.test(after);
      const prevWord = (text.slice(Math.max(0, s - 30), s).match(/([A-Za-z][A-Za-z.]*)\s*$/) || [])[1] || '';
      if (!rupee && !unitAfter) continue;
      if (/^[A-Z]/.test(prevWord) || CODE_WORDS.test(text.slice(Math.max(0, s - 16), s))) continue;
      kind = 'nosep';
    }
    nums.push({ t, kind, start: s, end: e });
  }
  const c = (k) => nums.filter((x) => x.kind === k).length;
  const indian = c('indian'), intl = c('intl');
  const system = indian > intl ? 'indian' : 'intl';
  // D3a.1 grouping
  if (indian && intl) {
    const win = indian === intl ? null : system;
    const ins = nums.filter((x) => x.kind === 'indian' || x.kind === 'intl')
      .map((x) => inst(text, x.start, x.end, win && x.kind !== win ? group(x.t, win) : null));
    const minority = ins.filter((x) => x.fixes.length);
    out.findings.push(finding('number-grouping', 'document', `Indian grouping (${indian}) vs international (${intl})`,
      win ? `Most of your large numbers use ${win === 'indian' ? 'Indian grouping (6,50,000)' : 'international grouping (650,000)'}. Group every number the same way.`
        : 'This document groups large numbers in two systems (6,50,000 and 650,000) equally often. Pick one.', ins, { fixable: minority.length > 0 }));
    for (const i of minority) {
      out.inline.push(card('number-grouping', 'clarity', 'style', i, `Group as "${i.fixes[0].text}"`,
        `Your other large numbers use ${win === 'indian' ? 'Indian' : 'international'} grouping. "${i.fixes[0].text}" matches them.`));
    }
  }
  // D3a.2 separator
  const sep = nums.filter((x) => x.kind !== 'nosep').length;
  const nosep = c('nosep');
  if (sep && nosep) {
    const withSep = sep >= nosep; // a tie goes to separators
    const ins = nums.map((x) => inst(text, x.start, x.end,
      withSep && x.kind === 'nosep' ? group(x.t, system) : !withSep && x.kind !== 'nosep' ? digits(x.t) : null));
    const minority = ins.filter((x) => x.fixes.length);
    out.findings.push(finding('number-separator', 'document', `Numbers with separators (${sep}) vs without (${nosep})`,
      `Most of your numbers of 1,000 and above are written ${withSep ? 'with' : 'without'} a separator. Write them all the same way.`, ins, { fixable: true }));
    for (const i of minority) {
      out.inline.push(card('number-separator', 'clarity', 'style', i, `Write "${i.fixes[0].text}"`,
        `Your other numbers of 1,000 and above are written ${withSep ? 'with' : 'without'} separators. "${i.fixes[0].text}" matches them.`));
    }
  }
}

// ---------- D4 study self-description tense ----------
const STUDY_RE = new RegExp(`\\b(?:(this|the)\\s+(${[...STUDY_NOUNS].join('|')})|(we))\\b`, 'gi');
const ADV = '(?:(?:[a-z]+ly|also|then|now|further|first|thus|therefore)\\s+)*';
const PASTS = new Set([...Object.values(IRREGULAR), ...Object.keys(PAST_TO_BASE)]);
const PARTICIPLES = new Set(Object.keys(IRREGULAR));

function studyTense(text, model, out) {
  const scopes = new Map();
  STUDY_RE.lastIndex = 0;
  let m;
  while ((m = STUDY_RE.exec(text))) {
    if (!model.isBody(m.index) || insideQuotes(text, m.index)) continue;
    const isWe = Boolean(m[3]);
    let rest = text.slice(m.index + m[0].length, m.index + m[0].length + 80);
    let skipLen = 0;
    if (!isWe) {
      const co = rest.match(/^\s+and\s+(?:the\s+)?[a-z]+/i); // "the approach and framework will …"
      if (co) { skipLen = co[0].length; rest = rest.slice(co[0].length); }
    }
    const at = m.index + m[0].length + skipLen;
    let x, tense = null, len = 0;
    if ((x = rest.match(new RegExp(`^\\s+((?:will|shall)\\s+${ADV}([a-z]+))`, 'i'))) && BASE_VERBS.has(x[2].toLowerCase())) tense = 'future';
    else if ((x = rest.match(new RegExp(`^\\s+((?:has|have)\\s+${ADV}([a-z]+))`, 'i'))) && (/ed$/.test(x[2]) || PARTICIPLES.has(x[2].toLowerCase()))) tense = 'completed';
    else if ((x = rest.match(new RegExp(`^\\s+((?:is|are)\\s+${ADV}([a-z]+ed|${[...PARTICIPLES].join('|')}))\\b`, 'i')))) tense = 'present';
    else if ((x = rest.match(new RegExp(`^\\s+(${ADV}([a-z]+))`, 'i')))) {
      const w = x[2].toLowerCase();
      if ((/ed$/.test(w) && BASE_VERBS.has(baseForm(w))) || PASTS.has(w)) tense = 'completed';
      else if (!isWe && /s$/.test(w) && (BASE_VERBS.has(w.replace(/es$/, '')) || BASE_VERBS.has(w.replace(/s$/, ''))) && !/ss$/.test(w)) tense = 'present';
      else if (isWe && BASE_VERBS.has(w)) tense = 'present';
      else if (!isWe && /^aims$/.test(w)) tense = 'present';
    }
    if (!tense) continue;
    // Round 7 (M2): a roadmap future ("Section 3 will present …", "We will also discuss … in Section 4") is conventional.
    if (tense === 'future') {
      const sent = splitSentences(text).find((x) => x.start <= m.index && m.index < x.end);
      if (sent && /\b(Section|Chapter|Part|Appendix|Annex)\s+\d|\b(below|later|in the next section|in the following)\b/i.test(sent.text)) continue;
    }
    // Only verbs that describe what the study does count ("examines", "will use"), not the topic ("continues").
    const head = x[2].toLowerCase();
    const headBase = PARTICIPLES.has(head) ? (IRREGULAR_BASE_MAP[head] || head) : /ed$/.test(head) ? baseForm(head)
      : /ies$/.test(head) ? head.replace(/ies$/, 'y') : (/(ss|sh|ch|x|z|o)es$/.test(head) ? head.replace(/es$/, '') : head.replace(/s$/, ''));
    if (!STUDY_VERBS.has(head) && !STUDY_VERBS.has(headBase) && !STUDY_VERBS.has(PAST_TO_BASE[head] || '')) continue;
    len = x[0].length;
    const lead = x[0].match(/^\s+/)[0].length;
    const start = at + lead, end = at + len;
    const scope = model.scopeOf(m.index);
    if (!scopes.has(scope)) scopes.set(scope, []);
    scopes.get(scope).push({ tense, start, end, subjectStart: m.index });
  }
  for (const [scope, list] of scopes) {
    if (list.length < 3) continue;
    const fut = list.filter((v) => v.tense === 'future');
    const non = list.filter((v) => v.tense !== 'future');
    if (!fut.length || !non.length) continue;
    const ins = list.map((v) => ({ ...inst(text, v.start, v.end, null), tense: v.tense }));
    const ex = (arr) => arr.slice(0, 2).map((v) => `"${text.slice(v.start, v.end)}"`).join(', ');
    out.findings.push(finding('study-tense', 'document', `Study described as planned (${fut.length}) and as done or in progress (${non.length})`,
      `This ${scope === 'abstract' ? 'abstract' : 'document'} describes the study both as planned (${ex(fut)}) and as done or in progress (${ex(non)}). Choose one: future for a proposal, present/past for completed work.`, ins));
  }
}

// ---------- D5 unsupported claims ----------
const CITATION = /\([A-Z][A-Za-z'’-]+(?: et al\.?)?(?: and [A-Z][A-Za-z'’-]+)?,? \d{4}[a-z]?\)|\[\d+(?:[,–-]\d+)*\]|\(\d{4}\)|according to [A-Z]/;
const HAS_NUMBER = /\d|per cent|percent|%/i;

function claims(text, model, out) {
  const ins = [];
  const add = (start, end, message) => ins.push({ ...inst(text, start, end, null), message });
  for (const sent of splitSentences(text)) {
    if (!model.isBody(sent.start) || insideQuotes(text, sent.start)) continue;
    const st = sent.text;
    const low = st.toLowerCase();
    for (const p of CLAIM_PHRASES) {
      const i = low.indexOf(p);
      if (i >= 0 && !/[a-z]/.test(low[i - 1] || ' ')) add(sent.start + i, sent.start + i + p.length, 'This asserts agreement without showing it. Cite a source or state the evidence.');
    }
    for (const b of BOOSTER_ADVERBS) {
      const rx = new RegExp(`(^|[^A-Za-z])(${escapeRegex(b)})(?![A-Za-z])`, 'gi');
      let x;
      while ((x = rx.exec(st))) {
        const s = x.index + x[1].length, e = s + x[2].length;
        const before = st.slice(0, s).trim();
        const after = st.slice(e);
        const initial = before === '' || /^["'“‘(]$/.test(before);
        // After is/are, "clearly" boosts ("is clearly the best") unless it modifies a participle ("are clearly labelled").
        const afterBe = /\b(is|are|was|were)\s*$/i.test(st.slice(0, s)) && !/^\s+[a-z]+(ed|en)\b/i.test(after);
        const beforeVerb = /^\s*,?\s*(shows?|demonstrates?|proves?|indicates?)\b/i.test(after);
        if (HAS_NUMBER.test(st)) continue; // round 7 (M3): the figure is the evidence
        if (initial || afterBe || beforeVerb) add(sent.start + s, sent.start + e, `"${x[2]}" tells the reader what to conclude. Let the evidence do that, or cite it.`);
      }
    }
    if (!CITATION.test(st)) {
      const taken = [];
      for (const p of STUDY_CLAIMS) {
        const i = low.indexOf(p);
        if (i < 0 || taken.some(([a, b]) => i < b && i + p.length > a)) continue;
        taken.push([i, i + p.length]);
        add(sent.start + i, sent.start + i + p.length, 'Which studies? Add a citation, or name the source.');
      }
    }
    if (!/\d|%|per cent|percent|p\s*[<=]|statistical|confidence/i.test(st)) {
      const rx = /\bsignificant(ly)?\b/gi;
      let x;
      while ((x = rx.exec(st))) add(sent.start + x.index, sent.start + x.index + x[0].length, `"${x[0]}" suggests a measured or statistical result. Give the figure, or use a plainer word.`);
    }
    if (!HAS_NUMBER.test(st)) {
      for (const w of SIZE_WORDS) {
        const rx = new RegExp(`\\b${w}\\b`, 'gi');
        let x;
        while ((x = rx.exec(st))) {
          const next = (st.slice(x.index + x[0].length).match(/^\s+([A-Za-z][A-Za-z'’-]*)/) || [])[1];
          const adverb = /ally$/i.test(x[0]);
          if (!adverb && !nounLike(next)) continue; // attributive only: "a massive increase", not "are unprecedented"
          add(sent.start + x.index, sent.start + x.index + x[0].length, `Give the size: a figure is more convincing than "${x[0]}".`);
        }
      }
    }
  }
  if (!ins.length) return;
  ins.sort((a, b) => a.start - b.start);
  for (const i of ins) {
    out.inline.push({ ...card('unsupported-claim', 'clarity', 'style', i, 'Unsupported claim', i.message) });
  }
  out.findings.push(finding('unsupported-claim', 'document', `${ins.length} claim${ins.length === 1 ? '' : 's'} without visible support`,
    'These phrases assert something without showing the evidence. Add a figure or a citation, or soften the wording.', ins.map(({ message, ...r }) => r)));
}

// ---------- D6 paragraph signals ----------
const END_OK = /[.!?:)\]"'”’…]$/;

function paragraphSignals(text, model, opts, out) {
  const limit = PARAGRAPH_LIMIT[opts.domain] || PARAGRAPH_LIMIT.general;
  // Round 7 (H4) soft-wrap rule: within a block, a body line that doesn't end in terminal punctuation joins the
  // next body line, whatever case it starts with (hard-wrapped text pasted from a PDF). A line that ends in
  // terminal punctuation ends its paragraph (goa's paragraphs are single lines ending in "."). So a missing
  // full stop can only be reported on the last line of a block, before a heading, list, sign-off or the end.
  const paras = [];
  for (const b of model.blocks) {
    for (const [idx, l] of b.lines.entries()) {
      if (l.kind !== 'body') continue;
      const prev = paras[paras.length - 1];
      const joins = prev && prev.block === b && prev.lastLine === idx - 1 && !END_OK.test(text.slice(prev.start, prev.end).replace(/\s+$/, ''));
      if (joins) { prev.end = l.end; prev.lastLine = idx; }
      else paras.push({ start: l.start, end: l.end, block: b, lastLine: idx });
    }
  }
  for (const para of paras) {
    const { start, end } = para;
    const ptext = text.slice(start, end);
    const ws = words(ptext, start);
    // D6.1 missing final full stop
    const trimmed = ptext.replace(/\s+$/, '');
    const lastOfBlock = para.lastLine === para.block.lines.length - 1 || para.block.lines[para.lastLine + 1].kind !== 'body';
    if (ws.length >= 8 && !END_OK.test(trimmed) && lastOfBlock) {
      const lastChar = trimmed[trimmed.length - 1];
      let i;
      if (lastChar === ',' || lastChar === ';') {
        const at = start + trimmed.length - 1;
        i = inst(text, at, at + 1, '.');
      } else {
        const last = ws[ws.length - 1];
        if (last.end !== start + trimmed.length) continue; // ends in a number or symbol: leave it
        i = inst(text, last.start, last.end, `${last.text}.`);
      }
      out.inline.push(card('paragraph-end', 'correctness', 'critical', i, 'Add a full stop', 'This paragraph ends without a full stop.'));
      out.findings.push(finding('paragraph-end', 'paragraph', 'Paragraph ends without a full stop', 'This paragraph ends without a full stop.', [i],
        { category: 'correctness', severity: 'critical', fixable: true }));
    }
    // D6.2 same start
    const sents = splitSentences(ptext).map((s) => ({ ...s, start: s.start + start, end: s.end + start }));
    const opener = (s) => {
      const w = words(s.text).map((x) => x.text);
      if (!w.length) return null;
      const two = /^(the|a|an|this|it|there)$/i.test(w[0]);
      return { key: (two ? w.slice(0, 2) : w.slice(0, 1)).join(' ').toLowerCase(), n: two ? 2 : 1 };
    };
    let k = 0;
    while (k < sents.length) {
      const o = opener(sents[k]);
      let j = k + 1;
      while (o && j < sents.length && opener(sents[j])?.key === o.key) j++;
      if (o && j - k >= 3) {
        const ins = sents.slice(k, j).map((s) => {
          const w = words(s.text, s.start).slice(0, o.n);
          return inst(text, w[0].start, w[w.length - 1].end, null);
        });
        const shown = text.slice(ins[0].start, ins[0].end);
        out.findings.push(finding('paragraph-same-start', 'paragraph', `${j - k} sentences in a row start with "${shown}"`,
          `${j - k} sentences in a row start with "${shown}". Vary the openings, or combine them.`, ins));
      }
      k = j;
    }
    // D6.3 long paragraph
    if (ws.length > limit) {
      const first = sents[0];
      const i = inst(text, first.start, Math.min(first.end, first.start + 60 > first.end ? first.end : first.start + 60), null);
      i.end = first.end;
      i.original = text.slice(i.start, i.end);
      out.findings.push(finding('paragraph-long', 'paragraph', `Paragraph of ${ws.length} words`,
        `This paragraph has ${ws.length} words. Readers lose the thread in long blocks; consider splitting where the topic shifts.`, [i],
        { more: { paragraph: { start, end } } }));
    }
  }
}

// ---------- D8a unused keywords ----------
function stem(w) {
  let s = w.toLowerCase().replace(/['’]s$/, '');
  s = s.replace(/(isation|ization|ation)s?$/, '').replace(/(ing|ed)$/, '').replace(/(ise|ize)s?$/, '');
  if (s.length > 3) s = s.replace(/(es|s)$/, '');
  return s.slice(0, 6);
}

function keywords(text, model, out) {
  const kw = model.lines.find((l) => l.kind === 'keywords');
  if (!kw) return;
  const colon = kw.text.indexOf(':');
  const bodySents = [];
  for (const l of model.lines) {
    if (l.kind !== 'body' && l.kind !== 'list') continue;
    for (const s of splitSentences(l.text)) bodySents.push(new Set(words(s.text).flatMap((w) => w.text.split('-')).map(stem)));
  }
  const listText = kw.text.slice(colon + 1);
  const re = /[^,;]+/g;
  let m;
  while ((m = re.exec(listText))) {
    const raw = m[0];
    const trimmedStart = raw.search(/\S/);
    if (trimmedStart < 0) continue;
    const phrase = raw.trim().replace(/[.]+$/, '');
    if (!phrase) continue;
    const parts = words(phrase).flatMap((w) => w.text.split('-')).filter((p) => !STOPWORDS.has(p.toLowerCase()));
    if (!parts.length) continue;
    const stems = parts.map(stem);
    if (bodySents.some((s) => stems.every((x) => s.has(x)))) continue;
    const start = kw.start + colon + 1 + m.index + trimmedStart;
    const i = inst(text, start, start + phrase.length, null);
    out.findings.push(finding('keyword-unused', 'document', `Keyword "${phrase}" isn't discussed`,
      `"${phrase}" is listed as a keyword but isn't discussed in the text.`, [i]));
  }
}


// ---------- D3b date format (P1) ----------
const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec';
const DMY = new RegExp(`\\b(\\d{1,2})\\s+(${MONTHS})\\b(?:,?\\s+(\\d{4}))?`, 'g');
const MDY = new RegExp(`\\b(${MONTHS})\\s+(\\d{1,2})(?!\\d)(?:,\\s*(\\d{4}))?`, 'g');
const NUMERIC_DATE = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b|\b\d{4}-\d{2}-\d{2}\b/g;

function dates(text, model, out) {
  const found = [];
  let m;
  DMY.lastIndex = 0;
  while ((m = DMY.exec(text))) if (model.isBody(m.index)) found.push({ kind: 'dmy', start: m.index, end: m.index + m[0].length, m });
  MDY.lastIndex = 0;
  while ((m = MDY.exec(text))) {
    if (!model.isBody(m.index) || found.some((f) => m.index < f.end && m.index + m[0].length > f.start)) continue;
    if (+m[2] < 1 || +m[2] > 31) continue;
    found.push({ kind: 'mdy', start: m.index, end: m.index + m[0].length, m });
  }
  NUMERIC_DATE.lastIndex = 0;
  while ((m = NUMERIC_DATE.exec(text))) if (model.isBody(m.index)) found.push({ kind: 'numeric', start: m.index, end: m.index + m[0].length, m });
  const dmy = found.filter((f) => f.kind === 'dmy').length;
  const mdy = found.filter((f) => f.kind === 'mdy').length;
  const num = found.filter((f) => f.kind === 'numeric').length;
  if ((dmy > 0) + (mdy > 0) + (num > 0) < 2) return;
  const win = dmy > mdy ? 'dmy' : mdy > dmy ? 'mdy' : null;
  const ins = found.sort((a, b) => a.start - b.start).map((f) => {
    let fix = null;
    if (win === 'dmy' && f.kind === 'mdy') fix = `${f.m[2]} ${f.m[1]}${f.m[3] ? ` ${f.m[3]}` : ''}`;
    if (win === 'mdy' && f.kind === 'dmy') fix = `${f.m[2]} ${f.m[1]}${f.m[3] ? `, ${f.m[3]}` : ''}`;
    return { ...inst(text, f.start, f.end, fix), kind: f.kind };
  });
  const fixable = ins.filter((i) => i.fixes.length);
  const strip = (arr) => arr.map(({ kind, ...r }) => r);
  const counts = [dmy && `"12 June" (${dmy})`, mdy && `"June 12" (${mdy})`, num && `"12/06/2024" (${num})`].filter(Boolean).join(' vs ');
  if (fixable.length) {
    out.findings.push({ ...finding('date-format', 'document', `Dates: ${counts}`,
      `Write dates one way throughout; most of yours are written "${win === 'dmy' ? '12 June' : 'June 12'}".`, strip(fixable), { fixable: true }), group: 'numbers' });
  }
  // Numeric dates are advice only: 03/06 is 3 June or 6 March depending on the reader.
  const numeric = win ? ins.filter((i) => i.kind === 'numeric') : [];
  if (numeric.length) {
    out.findings.push({ ...finding('date-format', 'document', `Numeric date${numeric.length === 1 ? '' : 's'} among written-out dates`,
      `Numeric dates like 20/06/2024 read differently in different countries. Write them as "${win === 'dmy' ? '20 June 2024' : 'June 20, 2024'}" to match your other dates.`,
      strip(numeric)), group: 'numbers' });
  }
  for (const i of fixable) {
    out.inline.push(card('date-format', 'clarity', 'style', i, `Write "${i.fixes[0].text}"`,
      `Most of your dates are written "${win === 'dmy' ? '12 June' : 'June 12'}". "${i.fixes[0].text}" matches them.`));
  }
}

// ---------- entry ----------
let memo = { key: null, value: null };

/** All document rules. opts: { domain, goals, dialect, dictionary, evidenceChecks }. */
export function analyseDocument(text, opts = {}) {
  const key = `${opts.domain}|${opts.goals?.formality}|${opts.dialect}|${opts.evidenceChecks}|${(opts.dictionary || []).join(',')}|${text}`;
  if (memo.key === key) return memo.value;
  const model = sectionModel(text);
  const out = { inline: [], findings: [] };
  spellingFamily(text, model, opts, out);
  hyphenConsistency(text, model, out);
  caseConsistency(text, model, out);
  percentConsistency(text, model, out);
  acronyms(text, model, opts, out);
  numbers(text, model, out);
  dates(text, model, out);
  studyTense(text, model, out);
  const evidenceOn = opts.evidenceChecks || ['academic', 'technical', 'business'].includes(opts.domain) || opts.goals?.formality === 'formal';
  if (evidenceOn) claims(text, model, out);
  paragraphSignals(text, model, opts, out);
  keywords(text, model, out);
  memo = { key, value: out };
  return out;
}
