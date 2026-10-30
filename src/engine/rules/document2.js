// Round 9 document guidance (Grok audit): data is/are, acronyms defined but never used,
// and paragraph rhythm. New rule IDs only; rules/document.js is unchanged.
// Fixes only switch a verb to the form the writer already uses most for "data".
import { COMMON_ACRONYMS, UNITS } from '../data/document-lists.js';
import { RULE_INFO } from '../data/rule-info.js';
import { splitSentences, words, matchCase } from '../text.js';
import { sectionModel } from '../sections.js';
import { insideQuotes } from '../chunk.js';

const GROUP = { 'data-number': 'consistency', 'acronym-unused': 'acronyms', 'paragraph-rhythm': 'structure', 'paragraph-one-sentence': 'structure' };

const inst = (text, start, end, fixText) => ({ start, end, original: text.slice(start, end), fixes: fixText == null ? [] : [{ text: fixText, start, end }] });

function finding(rule, title, message, instances, extra = {}) {
  const first = instances.find((i) => i.fixes.length) || instances[0];
  return {
    rule, category: extra.category || 'clarity', severity: 'style', level: extra.level || 'document', group: GROUP[rule],
    ruleName: RULE_INFO[rule]?.name || title, title, message, scope: 'word',
    start: first.start, end: first.end, original: first.original, fixes: [], instances, ...(extra.more || {}),
  };
}

// ---------- data-number: "data is" vs "data are" in one document ----------
const SG = { is: 'are', was: 'were', has: 'have', shows: 'show', suggests: 'suggest', indicates: 'indicate', seems: 'seem', does: 'do', reveals: 'reveal', confirms: 'confirm' };
const PL = Object.fromEntries(Object.entries(SG).map(([a, b]) => [b, a]));
const DATA_RE = new RegExp(`(?<!\\b[Bb]ig\\s)\\bdata\\s+(${[...Object.keys(SG), ...Object.keys(PL)].join('|')})\\b`, 'gi');

function dataNumber(text, model, opts, out) {
  const sg = [], pl = [];
  DATA_RE.lastIndex = 0;
  let m;
  while ((m = DATA_RE.exec(text))) {
    if (insideQuotes(text, m.index) || !['body', 'list'].includes(model.kindAt(m.index))) continue;
    const verb = m[1];
    const at = m.index + m[0].length - verb.length;
    (SG[verb.toLowerCase()] ? sg : pl).push({ at, verb });
  }
  if (sg.length && pl.length) {
    const majority = sg.length >= pl.length ? 'singular' : 'plural';
    const minor = majority === 'singular' ? pl : sg;
    const map = majority === 'singular' ? PL : SG;
    const instances = [...sg, ...pl].sort((a, b) => a.at - b.at).map((x) => (minor.includes(x)
      ? inst(text, x.at, x.at + x.verb.length, matchCase(x.verb, map[x.verb.toLowerCase()]))
      : inst(text, x.at, x.at + x.verb.length, null)));
    const f = finding('data-number', `"Data" is both singular and plural here`,
      `You treat "data" as ${majority} ${Math.max(sg.length, pl.length)} times and as ${majority === 'singular' ? 'plural' : 'singular'} ${minor.length} times. Pick one and keep to it.`, instances,
      { more: { fixable: true } });
    out.findings.push(f);
    for (const i of instances.filter((x) => x.fixes.length)) {
      out.inline.push({ rule: 'data-number', category: 'clarity', severity: 'style', ruleName: RULE_INFO['data-number'].name,
        title: `Keep "data" ${majority}`, message: f.message, start: i.start, end: i.end, original: i.original, scope: 'word', fixes: i.fixes });
    }
  } else if (sg.length && opts.domain === 'academic') {
    out.findings.push(finding('data-number', '"Data" is singular here',
      'Many journals treat "data" as plural ("the data are"). Check your style guide; if it wants plural, change each one.',
      sg.map((x) => inst(text, x.at, x.at + x.verb.length, null))));
  }
}

// ---------- acronym-unused: "(ABC)" defined and never used again ----------
function acronymUnused(text, model, out) {
  const re = /\(([A-Z][A-Za-z]?[A-Z]{1,5})s?\)/g;
  let m;
  const seen = new Set();
  while ((m = re.exec(text))) {
    const acr = m[1];
    if (seen.has(acr) || COMMON_ACRONYMS.has(acr) || UNITS.has(acr) || !['body', 'list'].includes(model.kindAt(m.index))) continue;
    seen.add(acr);
    // A definition follows words ("Time of Day (ToD)"), not a number or another bracket.
    if (!/[A-Za-z]\s*$/.test(text.slice(Math.max(0, m.index - 3), m.index))) continue;
    const uses = [...text.matchAll(new RegExp(`(?<![A-Za-z])${acr}s?(?![A-Za-z])`, 'g'))].filter((u) => u.index !== m.index + 1);
    if (uses.length) continue;
    const start = m.index, end = m.index + m[0].length;
    out.findings.push(finding('acronym-unused', `"${acr}" is defined but never used`,
      `"${acr}" is defined here but doesn't appear again. If the rest of the document doesn't need it, drop the brackets. Keep it if a later section or table uses it.`,
      [inst(text, start, end, null)], { level: 'document' }));
  }
}

// ---------- paragraph rhythm ----------
function rhythm(text, model, opts, out) {
  for (const line of model.lines) {
    if (line.kind !== 'body') continue;
    const sents = splitSentences(line.text).map((s) => ({ ...s, start: s.start + line.start, end: s.end + line.start, n: words(s.text).length }));
    if (sents.length >= 4) {
      const lens = sents.map((s) => s.n);
      const lo = Math.min(...lens), hi = Math.max(...lens);
      const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
      if (hi - lo <= 4 && mean >= 14) {
        out.findings.push(finding('paragraph-rhythm', `${sents.length} sentences of the same length`,
          `Every sentence in this paragraph is ${lo}–${hi} words long. A run of equal sentences reads flat; a short one after a long one helps the key point land.`,
          sents.map((s) => inst(text, s.start, s.end, null)), { level: 'paragraph' }));
      }
    }
    if (sents.length === 1 && sents[0].n >= 45 && opts.domain !== 'creative') {
      out.findings.push(finding('paragraph-one-sentence', `One-sentence paragraph of ${sents[0].n} words`,
        `This paragraph is a single sentence of ${sents[0].n} words. Splitting it gives the reader a place to pause.`,
        [inst(text, sents[0].start, sents[0].end, null)], { level: 'paragraph' }));
    }
  }
}

let memo = { key: null, value: null };

/** Round 9 document findings. Pure: text + options in, { inline, findings } out. */
export function analyseDocument2(text, opts = {}) {
  const key = `${opts.domain}|${text}`;
  if (memo.key === key) return memo.value;
  const model = sectionModel(text);
  const out = { inline: [], findings: [] };
  dataNumber(text, model, opts, out);
  acronymUnused(text, model, out);
  rhythm(text, model, opts, out);
  memo = { key, value: out };
  return out;
}

export const DOC2_IDS = Object.keys(GROUP);
