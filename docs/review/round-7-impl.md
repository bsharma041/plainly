# Round 7: implementation notes (hardening)

Implementer's report against `docs/review/round-6-review.md`. `node --test tests/*.test.js` gives **203 pass, 0 fail, 0 todo**: the 182 earlier tests plus 21 in `tests/round7.test.js`. The round-6 todo (BE15) became a passing check through the BE14 ruling. `node --check` passes on `src/app.js` and `src/editor.js`. Nothing is committed. All work was local.

## Status per item

| # | Status | Change |
|---|---|---|
| H1 capitalisation vs names | **Done** | `consistency-case` (`rules/document.js`). A capitalised run is never a variant candidate in these cases: (a) it is followed by of/for/and/on + a capitalised word ("Government of Goa", "Ministry of New and Renewable Energy"); (b) it is followed by "(ACRONYM)"; (c) the word right before it is capitalised, including a sentence-initial "The" ("The Commission held"); (d) it is a one-word definite short form (Commission, Ministry, Department, Government, State, Court, Council, Authority, Board, Bank, Committee, Corporation, Agency, Directorate) of a full name the document uses, a name ending in it or headed by it ("… Regulatory Commission", "Government of …"). Lowercasing fixes happen only when the capitalised form is the **minority**. A tie or a capitalised majority gives advice with no fix. **One exception to the tie rule (see open question 1):** a title-cased **hyphenated** compound ("Net-Metering" vs "net-metering") still gets the lowercase fix on a tie, because the unchanged round-6 key ES12 requires it. |
| H2 foreign currency | **Done** | `number-grouping`/`number-separator`: a number preceded by $, US$, USD, €, EUR, £ or GBP, or followed by dollars/euros/pounds/million/billion/bn/mn, is left out of both comparisons and is never reformatted. Rupee amounts and plain counts are compared only with each other. |
| H3 codes | **Done** | A `number-separator` candidate without separators must be a **quantity**: a rupee marker before it (₹, Rs, Rs., INR), or a unit or lowercase noun after it ("3200 files", "2450 meters", "60 MW"). Never a candidate: a number followed by punctuation, after a capitalised word (a place name: "Panaji 403001"), or after PIN/pincode/postal code/zip/plot/survey no/ward/room/tel/ph/phone/fax/mobile/+91. The existing identifier and phone-group exclusions stay. |
| H4 soft-wrap | **Done** | `paragraphSignals`: within a block, a body line that doesn't end in terminal punctuation (`. ! ? : ) ] " ' ” ’ …`) joins the next body line whatever its case. A line ending in terminal punctuation still ends its paragraph, so goa is unchanged. `paragraph-end` fires only on the last body line of a block, i.e. before a blank line, a heading, list item, sign-off or the end. Headings, list items, salutation, header lines and the Keywords line are identified by the section model first and never joined. |
| H5 a/an for initialisms | **Done** | `rules/correctness.js` `articles()`: a token with 2+ capitals that has lowercase letters (MoU, MoP) or is at most 4 letters (NGO, FAQ, MBA, UN) is read by letter names: A E F H I L M N O R S X take "an". `SPOKEN_ACRONYMS` (NASA, NATO, UNESCO, UNICEF, SCADA, OPEC, ASEAN, SAARC, FICCI, ISRO, …) use the first sound of the word. Longer all-caps words are still skipped, as before. Results: "an MoU", "an NGO", "an FAQ", "a UN agency" and "a NATO base" get no card; "a MoU" → "an"; "a SME fund" → "an". Every earlier a/an test is unchanged and passes. |
| M1 acronyms | **Done** | `COMMON_ACRONYMS` gains the review's business/finance list (YoY … CXO, plus plurals such as MoUs, KPIs, NBFCs) and SCADA, GIS, HVAC (the other technical terms were already there). An acronym inside a parenthesis that contains a 4-digit year (a citation such as "(CEA, 2021)") is never counted. "[n]" citations hold no acronyms. |
| M2 roadmap future | **Done** | `study-tense` ignores a future verb in a sentence containing Section/Chapter/Part/Appendix/Annex + a number, "below", "later", "in the next section" or "in the following". b-academic gets no finding; goa still gets its one. |
| M3 "clearly" with a figure | **Done** | The booster adverbs are skipped when the sentence has a digit, %, "per cent" or "percent". |
| M4 style rules on headings | **Done** | `runChecks` drops plain-word, repetition, wordy and passive cards whose start is on the title, a heading or the Keywords line (using the section model). Other rules, including title-case, are unaffected. goa keeps its 14 cards. |
| BE14/BE15 | **Done** | The `wordy` card on "revert back" offers **"reply"** first and "revert" second when "with", "to me", "to us" or "at the earliest" follows. Otherwise it offers "revert" alone ("revert back to the old level"). There is no second card on the span. |
| Q2 Summary scope | **Confirmed**, unchanged | Only Abstract and Executive summary are separate acronym scopes. |

## Tests whose expectations changed

- `tests/round6.test.js`: `BUILT_P1` gains `BE14`, because the updated `business-email.key.json` makes BE14 a P1 entry with first fix "reply". The BE15 todo disappears with it, since BE15 is merged into BE14 in the key.
- No other existing assertion was changed.

## Acceptance criteria

| | Result |
|---|---|
| H-1 F1–F9, all four round-6 keys (BE14 updated) and clean versions | **Pass.** F2/F3 and F4 tests are green; PB3, BE1 and ES12 still get their capitalisation fixes. |
| H-2 round7 key, all files × 3 option sets | **Pass.** `forbidFix` (the fix is applied and the result searched), `forbidRule` (overlap, or anywhere for "*") and `expect` (with `expectUnder` for g-claims) are all asserted. |
| H-3 every fix on round6 + round7 fixtures passes `checkFix` | **Pass.** Cards and guidance instances under 3 option sets. The `docVariant` tests are unchanged. |
| H-4 goa: 14 cards, one guidance finding | **Pass.** |
| H-5 performance | **Pass.** About 2,000 words of round-7 text: well under 60 ms p95. |

## Before and after on the round-7 documents (default options)

| File | Round 6 | Round 7 |
|---|---|---|
| a-policy | 8 cards (government/ministry lowercased, "$6,50,000", "4,03,001", "3,200") + 5 guidance | 4 cards: "3,200", 2 passive advice, repetition advice. 2 guidance: separators, "We" ×3. |
| b-academic | tense mix (roadmap) | no guidance. 3 passive advice cards remain, one with an agent rewrite. |
| c-business | "an MoU" → "a"; 4 acronyms undefined | 0 cards, 0 guidance |
| w-wrapped-caps | 4 critical paragraph-end cards mid-sentence | 0 |
| e-case | "Commission"/"Government" lowercased | only passive advice |
| g-claims (academic) | "clearly" claim, CEA undefined | "significant" and "It is widely accepted that" advice only |
| j-mixed | plain-word on the Keywords line | body card kept, Keywords card gone. Spelling, hyphen and keyword findings unchanged. |

## Open questions

1. **ES12 and the tie ruling.** Ruling (c) says a tie in capitalisation gives advice. But `exec-summary.key.json` still requires ES12 ("Net-Metering" 1 vs "net-metering" 1) to get the fix "net-metering", and H-1 requires every round-6 key to pass. I reconciled the two by applying the tie fix only to title-cased **hyphenated** compounds, which are never names. Ties on other words, such as "Government"/"government", stay advice. If you'd rather have advice for ES12 too, update the key and I'll remove the exception.
2. **H1 (c), "capitalised word right before".** In practice this skips any capitalised run that comes right after a sentence-initial capital ("The Commission …", "This Office …"). That deliberately trades recall for safety.
3. **H3 quantity test.** A number followed by a capitalised unit not in the list, such as "3200 Households" (unusual), isn't a candidate. That's a miss, not a wrong fix.
