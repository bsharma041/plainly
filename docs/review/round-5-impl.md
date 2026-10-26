# Round 5: implementation notes

Implementer's report against `docs/review/round-4-review.md`. `node --test tests/*.test.js` gives **159 pass, 0 fail**: the 151 from earlier rounds, unchanged, plus 8 in `tests/round5.test.js`. `node --check` passes on `src/app.js` and `src/editor.js`. Nothing is committed.

## Findings

| # | Status | Change |
|---|---|---|
| G1 "between N or M" (High) | **Done** | In R2b's between…or check (`src/engine/rules/usage2.js`), the card is skipped when the words directly before and after "or" are both digits or number words: a, an, one…twenty, thirty…ninety, hundred, thousand, million, billion, lakh, crore, few, several, dozen, half. Results: "between one or two projects", "between two or three options", "between 10 or 12 per cent" and "between a few or several sites" → no card. "a choice between solar or wind" → "and" (unchanged). |
| G2 agent post-modifier (High) | **Done** | In `passiveToActive` (`src/engine/rewrite.js`), the rewrite is refused (advice only) when the agent would be cut at from, with, without, of, like or near. The participle case from round 4 is checked first, so "a team based in Delhi" still stays whole. of, like and near aren't cut points, so a phrase starting with them simply stays attached to the agent ("A firm near the coast chose the site."). The `[who]` template is unaffected: it only applies when there's no agent. Results: "funded by a trust with links to the state", "given by a bank from Mumbai", "laid by a firm from Pune", "downloaded by staff from the website" and "opposed by groups without funding" → no rewrite. Unchanged: "A contractor built the road in 2010.", "A team based in Delhi wrote the report.", "The commission sets the tariff every year." |

## Heading-line ruling (§3)

- R10's heading detection is now a shared function, `headingParagraphs`. R2b skips any sentence on a heading line that has a paragraph after it.
  - Result: "Neither Study A or Study B", followed by a blank line and a paragraph, gets no correlative card.
  - The same words as a sentence ("Neither Study A or Study B found an effect.") still get "nor".
  - A one-line fragment with nothing after it isn't treated as a heading, so the earlier fragment tests ("a choice between solar or wind") still run.
- **Side fix found by the same test:** R10 offered "A" → "a" in "Neither Study A or Study B". A single capital letter in a heading is now treated as a label ("Study A", "Scenario B") and left alone.

## Acceptance criteria

| | Status |
|---|---|
| E1 A1–A10, B1–B8, C1–C7, D1–D5 | Pass: all 151 earlier tests unchanged and green |
| E2 goa: same 14 cards and first fixes; clean-academic 0 | Pass (asserted exactly, and clean-academic also under academic/formal/confident) |
| E3 stress-clean-4 line by line (default and academic); earlier stress files | Pass. No correlative card, no correctness card, none of the forbidden strings, and "[who]" only in template fixes. stress-clean, -2 and -3 are re-checked here too, as well as in their own round tests. |
| E4 §4.2 tests and full suite | 159 of 159 |
| E5 performance | p95 ≈ 5.1 ms for about 2,100 words |

## goa-abstract.txt

Unchanged: 14 cards. title-case "Power"→"power" · compound-subject "is"→"are" · plain-word "demonstrates"→"shows" · long-sentence ×3 · serial-comma "ecosystem and"→"ecosystem, and" · article-idiom "a"→"the" · both-and "both centralised and decentralised approaches" · wordy-purpose "aims to identify" · vague-phrase "in terms of" (tip) · preposition "suitable for" · list-parallel "able to support" · nominalisation "how to decarbonise".

## Notes

- A title-case heading that uses the article "A" in the middle ("Gone With A Wind") no longer gets an "A" → "a" fix. That's a miss, not a wrong fix.
- The backlog in §4.4 of the review is untouched, as agreed.
