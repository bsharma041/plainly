// Severity of a suggestion (spec U3): critical | advanced | style.
const SEVERITY_BY_CATEGORY = { correctness: 'critical', clarity: 'advanced', engagement: 'style', voice: 'style' };
const RULE_SEVERITY = { 'plain-word': 'style', 'long-sentence': 'style', repetition: 'style' };

/** Rules may set it; otherwise it follows the rule, then the category. */
export function severityOf(s) {
  return s.severity || RULE_SEVERITY[s.rule] || SEVERITY_BY_CATEGORY[s.category] || 'advanced';
}

export const SEVERITY_RANK = { critical: 0, advanced: 1, style: 2 };
