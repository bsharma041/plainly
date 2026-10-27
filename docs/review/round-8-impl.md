# Round 8: implementation notes (final hardening)

Implementer's report against `docs/review/round-7-review.md`. `node --test tests/*.test.js` gives **212 pass, 0 fail, 0 todo**: the 203 earlier tests, all unchanged, plus 9 in `tests/round8.test.js`. `node --check` passes on `src/app.js` and `src/editor.js`. Nothing is committed. All work was local.

## Status per item

| # | Status | Change |
|---|---|---|
| R8-1 (High) years read as list items | **Done** | `src/engine/sections.js` `isListItem`. A bullet line is a list item, as before. A numbered line is a list item only if (a) the number has 1–3 digits, so a 4-digit year such as "2012." never qualifies, and (b) the previous line ends in terminal punctuation or ":", is separated by a blank line, or is a heading, the title or another list item. Otherwise the line is body text and the soft-wrap rule joins it to the line before. p1-pdf.txt and p6-wrapped-years.txt get no paragraph-end card. "The report lists three steps …:" followed by "1." and "2." is still a list (no card, with or without full stops on the items). policy-brief, exec-summary and business-email errors still get "billing.", "law." and "attached.". |
| R8-2 (Medium) statistics as per cent variants | **Done** | `consistency-percent`: "percent" must not be followed by a letter, so "percentage points" and "percentile" are excluded. "%" is excluded when followed by "CI"/"confidence", when preceded within 20 characters by "CI"/"confidence interval", or when inside parentheses that also hold "CI" or "p <, =, >". p3-academic.txt gets no consistency-percent finding, and real variants ("4 per cent … 20 percent") still do. |
| R8-3 (Low) units | **Done** | Added MU, MUs, BU, kVA, kVAr, ckm and kms to `UNITS` (MVA and MVAr were already there). Also whitelisted **PO** and **POs**: your pass lists PO as whitelisted and the round8 key forbids flagging it, but it wasn't in the list. |
| R8-4 (Low) repetition on unit words | **Done** | The repetition rule always protects cent, percent, lakh(s), crore(s), million, billion, units, kWh, MWh and GWh. p4-report.txt no longer gets cards on "cent" or "crore". |
| Ruling 1 tie exception | **Kept, with negative tests** | The tie fix applies only to a title-cased hyphenated compound that is a whole run (runs are maximal, so "Indo-Pacific Economic Framework" is a 3-word name with no lowercase counterpart), has no "(ACRONYM)" after it, and, **new**, has no company suffix after it (plc, ltd, inc, llc, llp, pvt, co, corp, limited, group, gmbh, ag, sa). Without that last condition, "Rolls-Royce plc" next to "a rolls-royce engine" would have been a one-to-one tie with a lowercase fix. Both names get no fix (tested); "Net-Metering" vs "net-metering" still does. |

## Acceptance criteria

| | Result |
|---|---|
| I-1 H-1 to H-5, round-6 and round-7 keys | **Pass.** All 203 earlier tests unchanged and green. |
| I-2 round8 key under all three option sets | **Pass: 0 problems.** One key-driven test collects every `forbidFix`/`forbidRule` violation and asserts the list is empty. Nothing is deferred. |
| I-3 every fix on all fixtures passes `checkFix` | **Pass.** Top-level, round6, round7 and round8 fixtures, cards and guidance instances, under 3 option sets. The guard is unchanged. |
| I-4 goa-abstract | **Pass.** 14 cards with the same first fixes, plus the single study-tense finding. |
| I-5 performance | **Pass.** Under 60 ms p95 for checks plus guidance on about 2,000 words (round-8 report text repeated). |

## Round-8 documents, before and after (default options)

| File | Round 7 | Round 8 |
|---|---|---|
| p1-pdf | paragraph-end "in" → "in." (critical); MU "never spelled out" | 1 plain-word card ("purchased" → "bought"), no guidance |
| p6-wrapped-years | paragraph-end "since" → "since." (critical) | nothing |
| p2-mail | PO "never spelled out" | only "LR" advice, which your pass accepts, plus passive advice |
| p3-academic | per cent / percent / % advice | 2 passive advice cards only |
| p4-report | repetition on "cent" and "crore" | passive advice only |
| p5-indian | (unchanged) | passive and "very happy" cards, KUSUM advice, no paragraph-end |

## Tests changed

None of the 203 earlier tests changed.
