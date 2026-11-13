// Round 10 document guidance: citation style consistency. New rule ID only.
// Fixes add or remove a comma or a full stop, or swap "and"/"&", toward the form the
// writer already uses most. No word is added that the writer did not use.
import { RULE_INFO } from '../data/rule-info.js';
import { sectionModel } from '../sections.js';

const NAME = "[A-Z][A-Za-z'’-]+";
const CITE = new RegExp(`^(\\s*(?:e\\.g\\.,? |see |cf\\. )?)(${NAME})((?: (?:and|&) ${NAME})?)((?: et al\\.?)?)(,?) (\\d{4}[a-z]?)(?:, pp?\\. ?\\d+(?:[-–]\\d+)?)?\\s*$`);
const inst = (text, start, end, fixText) => ({ start, end, original: text.slice(start, end), fixes: fixText == null ? [] : [{ text: fixText, start, end }] });

function finding(text, title, message, instances, fixable, out) {
  const first = instances.find((i) => i.fixes.length) || instances[0];
  const f = {
    rule: 'citation-style', category: 'clarity', severity: 'style', level: 'document', group: 'consistency',
    ruleName: RULE_INFO['citation-style'].name, title, message, scope: 'word',
    start: first.start, end: first.end, original: first.original, fixes: [], instances, ...(fixable ? { fixable: true } : {}),
  };
  out.findings.push(f);
  for (const i of instances.filter((x) => x.fixes.length)) {
    out.inline.push({ rule: 'citation-style', category: 'clarity', severity: 'style', ruleName: f.ruleName, title, message,
      start: i.start, end: i.end, original: i.original, scope: 'word', fixes: i.fixes });
  }
}

/** Split two forms into majority and minority; the first form wins a tie. */
function sides(a, b) {
  return a.length >= b.length ? { major: a, minor: b, first: true } : { major: b, minor: a, first: false };
}

let memo = { key: null, value: null };

/** Round 10 citation findings. Pure: text in, { inline, findings } out. */
export function analyseDocument3(text) {
  if (memo.key === text) return memo.value;
  const model = sectionModel(text);
  const ok = (pos) => ['body', 'list'].includes(model.kindAt(pos));
  const out = { inline: [], findings: [] };
  const cites = []; // author-year citations inside brackets
  const paren = /\(([^()\n]{6,160})\)/g;
  let m;
  while ((m = paren.exec(text))) {
    if (!ok(m.index)) continue;
    let at = m.index + 1;
    for (const piece of m[1].split(';')) {
      const c = piece.match(CITE);
      if (c) {
        const start = at + c[1].length;
        const nameEnd = start + c[2].length + c[3].length + c[4].length;
        cites.push({ start, nameEnd, end: nameEnd + c[5].length + 1 + c[6].length, comma: c[5] === ',', pair: c[3], etal: c[4] });
      }
      at += piece.length + 1;
    }
  }
  const numeric = [...text.matchAll(/\[\d+(?:[,–-] ?\d+)*\]/g)].filter((x) => ok(x.index));

  if (cites.length >= 2 && numeric.length >= 2) {
    finding(text, 'Two citation systems', `This document cites by author and year ${cites.length} times and by number ${numeric.length} times. Journals want one system; check the style guide and convert the smaller group.`,
      [...cites.map((c) => inst(text, c.start, c.end, null)), ...numeric.map((n) => inst(text, n.index, n.index + n[0].length, null))].sort((a, b) => a.start - b.start), false, out);
  }

  const withComma = cites.filter((c) => c.comma), noComma = cites.filter((c) => !c.comma);
  if (withComma.length && noComma.length) {
    const { minor, first } = sides(withComma, noComma);
    const instances = cites.map((c) => (minor.includes(c)
      ? inst(text, c.start, c.end, first ? `${text.slice(c.start, c.nameEnd)}, ${text.slice(c.nameEnd + 1, c.end)}` : `${text.slice(c.start, c.nameEnd)} ${text.slice(c.nameEnd + 2, c.end)}`)
      : inst(text, c.start, c.end, null)));
    finding(text, 'Comma before the year: mixed', `${withComma.length} citations have a comma before the year and ${noComma.length} do not. Keep to one form.`, instances, true, out);
  }

  const amp = cites.filter((c) => c.pair.startsWith(' &')), and = cites.filter((c) => c.pair.startsWith(' and'));
  if (amp.length && and.length) {
    const { minor, first } = sides(and, amp);
    const instances = [...amp, ...and].sort((a, b) => a.start - b.start).map((c) => {
      if (!minor.includes(c)) return inst(text, c.start, c.nameEnd, null);
      const old = text.slice(c.start, c.nameEnd);
      return inst(text, c.start, c.nameEnd, first ? old.replace(' & ', ' and ') : old.replace(' and ', ' & '));
    });
    finding(text, '"and" and "&" in citations: mixed', `${and.length} citations join two authors with "and" and ${amp.length} with "&". Keep to one form.`, instances, true, out);
  }

  const etal = [...text.matchAll(/\bet al(\.?)(?=[\s,;)]|$)/g)].filter((x) => ok(x.index));
  const dot = etal.filter((x) => x[1]), bare = etal.filter((x) => !x[1]);
  if (dot.length && bare.length) {
    const instances = etal.map((x) => inst(text, x.index, x.index + x[0].length, x[1] ? null : 'et al.'));
    finding(text, '"et al" without its full stop', `"al." is short for "alii", so it takes a full stop. ${dot.length} of your uses have it and ${bare.length} do not.`, instances, true, out);
  }

  memo = { key: text, value: out };
  return out;
}
