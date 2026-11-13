// Round 10: the writer's own style guide. Each entry is a phrase the writer asked to have
// flagged, with the wording they prefer (or none). Plainly adds nothing of its own here:
// the replacement is the text the writer typed in Settings.
import { RULE_INFO } from '../data/rule-info.js';
import { matchCase, words } from '../text.js';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');

/** Keep only well-formed entries: { flag, suggest, note }. */
export function cleanStyleGuide(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((e) => e && typeof e.flag === 'string' && e.flag.trim().length >= 2 && e.flag.length <= 80)
    .map((e) => ({ flag: e.flag.trim(), suggest: typeof e.suggest === 'string' ? e.suggest.trim().slice(0, 80) : '', note: typeof e.note === 'string' ? e.note.trim().slice(0, 200) : '' }))
    .slice(0, 200);
}

/** @returns cards with `writerWords`: the words the writer typed as the replacement. */
export function styleGuideRules(text, opts = {}) {
  const out = [];
  for (const e of cleanStyleGuide(opts.styleGuide)) {
    if (e.suggest.toLowerCase() === e.flag.toLowerCase()) continue;
    const re = new RegExp(`(?<![A-Za-z0-9-])${esc(e.flag)}(?![A-Za-z0-9-])`, 'gi');
    let m;
    while ((m = re.exec(text))) {
      if (!m[0].length) break;
      // The preferred wording already in place ("sign in" inside "sign in to") is not flagged.
      const start = m.index, end = start + m[0].length;
      out.push({
        rule: 'style-guide', category: 'clarity', severity: 'advanced', ruleName: RULE_INFO['style-guide'].name, scope: 'word',
        title: e.suggest ? `Your style guide: "${e.suggest}"` : 'Your style guide flags this',
        message: e.note || (e.suggest ? `Your style guide prefers "${e.suggest}" to "${e.flag}".` : `Your style guide asks you to avoid "${e.flag}".`),
        start, end, original: m[0],
        fixes: e.suggest ? [{ text: matchCase(m[0], e.suggest), start, end }] : [],
        writerWords: words(e.suggest).map((w) => w.text.toLowerCase()),
      });
    }
  }
  return out;
}
