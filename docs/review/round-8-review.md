SATISFIED

# Round 8 review (sign-off)

I verified this as committed in round 7: tests and answer keys only, run locally. No fresh stress test, no code edits, no network.

**Final scores against Grammarly:**
- goa-abstract.txt: **8 / 10**.
- Round-6 documents: **8.5 / 10**.
- Round-7 and round-8 stress documents: **8.5 / 10**. Every recorded false alarm is now resolved.

## Criteria

| | Result | Evidence (my runs) |
|---|---|---|
| **I-1** H-1 to H-5 still pass, including the round-6 and round-7 keys | **PASS** | `node --test tests/*.test.js`: **212 pass, 0 fail, 0 todo**. My independent key checker on the round-6 keys found all P0, existing and P1 entries satisfied: policy-brief 15/15, business-email all entries (BE14 "reply"), methods 12/12, exec-summary 13/13. No correctness card falls outside the keys. The only `mustNotFlag` overlaps (6,50,000 and 2,40,000) are majority instances listed in the grouping panel with **no fix**, which is correct. Clean versions: 0 correctness cards, 0 fixes, 0 guidance under key and default options. Round-7 key: **0 problems** under all three option sets. |
| **I-2** Round-8 key passes under all three option sets | **PASS** | **0 problems.** No paragraph-end on p1-pdf ("mines in⏎2012.") or p6-wrapped-years. No consistency-percent finding on "percentage points" or "95% CI". "MU" is treated as a unit. No repetition card on "cent"/"crore". Email numbers, order numbers and phone numbers are untouched. No deferred entries. |
| **I-3** Every fix on all fixtures passes `checkFix` | **PASS** | 0 guard failures across the round-6, round-7 and round-8 fixtures, goa-abstract and clean-academic. |
| **I-4** goa-abstract: 14 cards with the same first fixes, plus a single study-tense finding | **PASS** | title-case "power" · compound-subject "are" · plain-word "shows" · long-sentence ×3 · serial-comma "ecosystem, and" · article-idiom "the" · both-and · wordy-purpose "aims to identify" · vague-phrase (tip) · preposition "suitable for" · list-parallel "able to support" · nominalisation "how to decarbonise". Guidance: exactly `study-tense` (examines / will use / is aimed / will also help). Academic: 11 cards plus the same finding. clean-academic.txt: 0 cards, 0 guidance. |
| **I-5** Performance: p95 < 60 ms, checks plus guidance, 2,000 words | **PASS** | 2,045 words: p95 ≈ 22 ms. |

The extra Rolls-Royce condition (no tie fix when a company suffix follows) only suppresses a fix, so I accept it.

## No-AI constraint

Holds. Every fix is produced by a deterministic rule from the writer's own words, from fixed lists in `src/engine/data`, or (for consistency and number rules only) from words that already appear in the same document. `guard.js` still rejects outside words, AI vocabulary in any form, added negation (except the shared, scoped neither…nor swap), em dashes, new AI phrases and oversized remote fixes. Composed edits ("Improve this sentence", "Make consistent") stack only guarded fixes and are re-checked as a whole. Nothing is applied without a click.

## Final backlog (non-blocking; from round-7 review §4.4)

1. **Document guidance:**
   - "data is/are" consistency.
   - Acronyms defined but barely used.
   - Per-paragraph readability and rhythm.
   - Title terms missing from the body.
   - Abstract acronyms reused undefined in the body.
   - "program/programme".
   - Methods-section tense.
2. **Inline:**
   - Passive rewrites with coordinated agents.
   - "not only … but also" and the dangling-modifier subset.
   - Recall gaps in the either/neither pairs and in hyphenation.
   - Splits for long sentences built on a ", with …" phrase (the abstract's 52-word sentence).
3. **Indian English register advice (formal/business only):** "by March end", "till date", "to the tune of", "put up for perusal".
4. **UI:** U1 margin marker; per-paragraph statistics view.

Signed off: PhD, round 8.
