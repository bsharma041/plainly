# Adding a rule

Rules shipped in rounds 1–8 are frozen. Change one only when a failing regression test proves a bug. New grammar goes in new rule IDs.

## Where

| What | File |
| --- | --- |
| Sentence-level rule | `src/engine/rules/syllabus.js` (add to `ROUND9_RULES`, or start a new file for a later round) |
| Document-level guidance | `src/engine/rules/document2.js` |
| Tags and clause breaks | `src/engine/chunk.js` (closed lists only; no statistics, no model) |
| Words a fix may add | `ROUND9_INSERTS` in `syllabus.js` (the guard adds them to its closed vocabulary) |
| Name, explanation, example | `src/engine/data/rule-info.js` |

## A rule can ship only when

1. It has a `RULE_INFO` entry with a wrong/right example.
2. Its entry in `ROUND9_RULES` has at least one `flag` example and at least two `pass` (must-not-flag) examples.
3. Every fix passes `checkFix` on its own. The kit test runs the raw rule output, before `guardSuggestion` could strip a fix.
4. It adds no card to any existing fixture, under any option set (`tests/round9.test.js` walks them all), and none to `tests/fixtures/round9/must-not-flag.txt`.
5. All earlier tests still pass. If a snapshot has to change, the change is a deliberate, documented improvement, never a side effect.

`node --test tests/*.test.js` checks all five.

## Never

- A model, ranking or statistical tagger in the edit path.
- Auto-apply, or a fix that adds a word outside the writer's span, the closed lists or (for consistency rules only) the same document.
- A paragraph-level rewrite. "Improve this sentence" only stacks named, guarded fixes.
- Loosening `guard.js` beyond adding closed words for a new rule.
- When unsure, give advice with no fix, or stay silent.
