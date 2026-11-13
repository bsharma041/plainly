# Round 10: Grammarly paid-tier gap closers

Design: `docs/superpowers/specs/2026-11-13-grammarly-parity-design.md`. Source: Grammarly's public plan and feature pages; no extension code or private API was inspected.

| Grammarly paid check | Rule | Fix |
| --- | --- | --- |
| Inclusive language | `inclusive-language` | Closed list of neutral terms; "he or she" is advice only |
| Tone adjustment | `polite-tone` (Business domain or the "Sound polite" goal) | "You need to" → "Please"; blame phrases are advice only |
| Fluency | `fluency` | 18 learner mix-ups not covered by older rules |
| Dull vocabulary | `dull-word` | From the third use of good/bad/big/nice/great |
| Clichés | `cliche` | Plain replacement where one exists, else advice |
| Formatting | `list-to-bullets` | Moves the writer's own words onto list lines; replaces the long-sentence card |
| Citation consistency | `citation-style` | Comma before year, "and"/"&", "et al." toward the majority; two systems is advice |
| Style guide | `style-guide` | The writer's own replacement only |
| Snippets | UI | The writer's own saved text, inserted at the cursor |

Guard: one change. `checkFix` takes `writerWords`, set only for a local `style-guide` card. AI-filler, negation, em-dash and growth checks still apply (tested).

Not built, because each needs a model or a server: generative rewrites, AI prompts, plagiarism checking, AI-text detection.

Tests: `tests/round10.test.js` (kit, exact fixes, guard spoofing, and a walk of every fixture under seven option sets: no new card).
