// Shared section model for document-level rules (round 6). Pure: text in, model out.
// Every document rule asks this model which lines it may judge.
import { paragraphs } from './text.js';
import { headingParagraphs } from './rules/usage2.js';
import { ABSTRACT_HEADINGS } from './data/document-lists.js';

const HEADER = /^\s*(subject|re|fwd|fw|from|to|cc|bcc|date)\s*:/i;
const KEYWORDS = /^\s*(keywords|key words|index terms)\s*:/i;
const SALUTATION = /^\s*(dear|hi|hello)\b[^.!?]{0,60},?\s*$/i;
const SIGNOFF = /^\s*(regards|best|best regards|kind regards|warm regards|with regards|thanks|thank you|many thanks|sincerely|yours sincerely|yours faithfully|yours truly|yours)\s*,?\s*$/i;
// One-word section headings that the general heading test (2+ words) misses.
const SECTION_NAME = /^\s*(abstract|summary|executive summary|introduction|background|context|methods?|methodology|data|results|findings|discussion|conclusions?|recommendations|references|bibliography|acknowledg(e)?ments|appendix|annex)\s*$/i;
const LIST_ITEM = /^\s*(?:([-*•])|(\d+)[.)])\s/;
const ENDS_SENTENCE = /[.!?:)\]"'”’…]$/;
/**
 * Round 8 (R8-1): a bullet line is a list item. A numbered line is one only if the number has 1–3 digits (so a
 * year that starts a wrapped line, "2012. Monthly peaks …", never is) and the previous line ends a sentence or a
 * colon, is separated by a blank line, or is a heading or another list item.
 */
function isListItem(text, lines, i) {
  const m = lines[i].text.match(LIST_ITEM);
  if (!m) return false;
  if (m[1]) return true;
  if (m[2].length > 3) return false;
  const prev = lines[i - 1];
  if (!prev) return true;
  if (/\n\s*\n/.test(text.slice(prev.end, lines[i].start))) return true;
  return ENDS_SENTENCE.test(prev.text.trim()) || prev.kind === 'heading' || prev.kind === 'title' || prev.kind === 'list';
}
const REFERENCE = /^\s*(\[\d+\]|\(?\d{4}[a-z]?\)?[.,]|[A-Z][a-z]+,\s+[A-Z]\.)/;

let cache = { text: null, model: null };

/**
 * @returns {{
 *   lines: Array<{start,end,text,kind}>, blocks: Array<{start,end,lines}>,
 *   abstract: {start,end}|null, lineAt(pos), kindAt(pos), scopeOf(pos), isBody(pos)
 * }}
 * kind: 'title' | 'heading' | 'header' | 'keywords' | 'salutation' | 'signoff' | 'list' | 'reference' | 'body'
 */
export function sectionModel(text) {
  if (cache.text === text) return cache.model;
  const lines = paragraphs(text).map((l) => ({ ...l }));
  const heads = new Set(headingParagraphs(text, lines));
  let signoff = false;
  lines.forEach((l, i) => {
    if (signoff) { l.kind = 'signoff'; return; }
    if (HEADER.test(l.text)) l.kind = 'header';
    else if (KEYWORDS.test(l.text)) l.kind = 'keywords';
    else if (SIGNOFF.test(l.text)) { l.kind = 'signoff'; signoff = true; }
    else if (SALUTATION.test(l.text)) l.kind = 'salutation';
    else if (heads.has(l) || SECTION_NAME.test(l.text)) l.kind = i === 0 ? 'title' : 'heading';
    else if (isListItem(text, lines, i)) l.kind = 'list';
    else if (REFERENCE.test(l.text) && !/[a-z]{3,}\s+[a-z]{3,}\s+[a-z]{3,}/.test(l.text.slice(0, 30))) l.kind = 'reference';
    else l.kind = 'body';
  });
  // Blocks: runs of lines with no blank line between them.
  const blocks = [];
  for (const l of lines) {
    const prev = blocks[blocks.length - 1];
    if (prev && !/\n\s*\n/.test(text.slice(prev.end, l.start))) { prev.lines.push(l); prev.end = l.end; }
    else blocks.push({ start: l.start, end: l.end, lines: [l] });
  }
  // The abstract (or executive summary) is its own scope, up to the next heading.
  let abstract = null;
  const ai = lines.findIndex((l) => (l.kind === 'heading' || l.kind === 'title') && ABSTRACT_HEADINGS.test(l.text.trim()));
  if (ai >= 0) {
    const next = lines.slice(ai + 1).find((l) => l.kind === 'heading');
    abstract = { start: lines[ai].end, end: next ? next.start : text.length };
  }
  const lineAt = (pos) => {
    let lo = 0, hi = lines.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (pos < lines[mid].start) hi = mid - 1;
      else if (pos > lines[mid].end) lo = mid + 1;
      else return lines[mid];
    }
    return null;
  };
  const model = {
    lines, blocks, abstract, lineAt,
    kindAt: (pos) => lineAt(pos)?.kind || 'body',
    scopeOf: (pos) => (abstract && pos >= abstract.start && pos < abstract.end ? 'abstract' : 'body'),
    isBody: (pos) => { const k = lineAt(pos)?.kind; return k === 'body' || k === 'list'; },
  };
  cache = { text, model };
  return model;
}
