# Round 10: closing the Grammarly paid-tier gaps with rules

## Intent
Match the paid Grammarly check families that fixed rules can match. Keep the no-AI rule: no model in the edit path, no generated text, no auto-apply.

## Source
Black-box teardown from Grammarly's public plan and feature pages (Nov 2026) and the owner's earlier screenshots (`docs/review/grammarly-observed.md`). No extension code or private API was inspected.

## Goals
| Grammarly paid check | New rule ID | File |
| --- | --- | --- |
| Inclusive language | `inclusive-language` | `rules/parity.js` |
| Tone adjustment (politeness) | `polite-tone` (business domain or the new "polite" goal) | `rules/parity.js` |
| Fluency (learner mix-ups) | `fluency` | `rules/parity.js` |
| Dull vocabulary | `dull-word` (word used 3+ times) | `rules/parity.js` |
| Clichés | `cliche` | `rules/parity.js` |
| Formatting: paragraph to bullets | `list-to-bullets` | `rules/parity.js` |
| Citation consistency | `citation-style` | `rules/document3.js` |
| Style guide | `style-guide` (the writer's own "flag X, suggest Y" list) | `rules/styleguide.js` |
| Snippets | UI only: saved text the writer inserts at the cursor | `app.js` |

## Non-goals
Generative sentence rewrites, AI prompts, plagiarism checking, AI-text detection, a browser extension. Each needs a model or a server.

## Anti-goals
- A new card on any existing fixture or on the must-not-flag corpus.
- A changed rule from rounds 1–9.
- A phrase an older rule already flags getting a second card.

## Constraints
- Same kit as round 9: `flag` and `pass` examples per rule, `RULE_INFO` entry, raw fixes pass `checkFix`.
- Words a fix may add go in `ROUND10_INSERTS` (closed list).
- One deliberate guard change: a `style-guide` fix may add words the writer typed into their own style guide. They are the writer's words, not the tool's. The AI-word, negation, em-dash and growth checks still apply. No other rule gets this.

## Approaches
1. **Closed lists on the round 9 kit (picked).** Fits the frozen-rule policy and the guard; every behaviour is testable.
2. Bundle an offline dictionary or n-gram data for wider coverage. Rejected: large download, statistical ranking in the edit path.
3. Call a hosted checker for the paid-tier families. Rejected: text leaves the browser and the fixes are not rule-traceable.

## Left to the builder
List contents, skip conditions, and UI placement inside the existing Settings and Goals dialogs.
