// Document-level guidance (round 6): findings grouped by topic, each with its
// instances. Pure and synchronous; separate from the inline-card pipeline.
// Mechanical findings (consistency, numbers, redefined acronyms, missing full
// stops) are also emitted as inline cards by runChecks.
import { analyseDocument } from './rules/document.js';
import { checkFix, DOC_VARIANT_RULES } from './guard.js';

export const GUIDANCE_GROUPS = ['consistency', 'acronyms', 'numbers', 'evidence', 'structure', 'tense', 'keywords'];

/**
 * @param {string} text
 * @param {{domain?, goals?, dialect?, dictionary?, evidenceChecks?, disabledRules?}} opts
 * @returns {Array} findings: { rule, group, level, title, message, start, end, original, instances: [{start,end,original,fixes}] }
 */
export function runGuidance(text, opts = {}) {
  const { findings } = analyseDocument(text, opts);
  const off = new Set(opts.disabledRules || []);
  return findings
    .filter((f) => !off.has(f.rule))
    .map((f) => {
      const docVariant = DOC_VARIANT_RULES.has(f.rule);
      // Every instance fix passes the same guard as inline fixes; a failing one becomes advice.
      const instances = f.instances.map((i) => ({ ...i, fixes: i.fixes.filter((x) => checkFix(text, x, { docVariant }).ok) }));
      return { ...f, instances, id: `G:${f.rule}:${f.start}:${f.end}` };
    })
    .sort((a, b) => GUIDANCE_GROUPS.indexOf(a.group) - GUIDANCE_GROUPS.indexOf(b.group) || a.start - b.start);
}
