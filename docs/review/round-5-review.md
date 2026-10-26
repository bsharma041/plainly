# Round 5 review (sign-off)

SATISFIED

**Final score against Grammarly on goa-abstract.txt: 8 / 10** (round 0: 2/10).

On the owner's abstract, Plainly now gives a correct, explained fix (or a labelled tip) for every one of the 8 spans where Grammarly found a real issue. It also flags 3 issues Grammarly missed ("a bulk" → "the bulk", "Power" in the title, the serial comma), and it adds no noise. It offers a rule-built "Improve this sentence" preview that stacks the sentence's own fixes. There is no generated text anywhere.

It isn't a 10 for two reasons. Grammarly's coverage of general prose is still wider (see the backlog). And three long-sentence cards on the abstract stay advice-only, with no safe split available.

As committed in round 4, this sign-off is based on E1–E5, verified by running the tests and fixtures myself, plus the requested check of the single-letter-label change.

---

## Criteria

| | Result | Evidence (my runs) |
|---|---|---|
| **E1** A1–A10, B1–B8, C1–C7, D1–D5 still pass | **PASS** | `node --test tests/*.test.js` gives **159 pass, 0 fail**. The 151 earlier tests are unchanged. |
| **E2** goa: same 14 cards and first fixes; clean-academic: 0 | **PASS** | goa default: 14 cards (title-case "power" · compound-subject "are" · plain-word "shows" · long-sentence ×3 · serial-comma "ecosystem, and" · article-idiom "the" · both-and "both centralised and decentralised approaches" · wordy-purpose "aims to identify" · vague-phrase tip · preposition "suitable for" · list-parallel "able to support" · nominalisation "how to decarbonise"). Academic: 11. clean-academic.txt: 0 under both. |
| **E3** stress-clean-4 line by line; stress-clean 1–3 still pass | **PASS** | All 128 lines across the four files, under default and academic: 0 correctness cards; 0 cards from the restricted usage rules (correlative, verb-pattern, hyphenation, one-of-plural, serial-comma, compound-subject, both-and, wordy-purpose, preposition, article-idiom, nominalisation); 0 forbidden strings (the full list from rounds 1–4); "[who]" only in `template: true` fixes; 0 fixes rejected by `checkFix`. |
| **E4** round-5 tests and full suite | **PASS** | 159/159. |
| **E5** performance | **PASS** | 2,129 words: p95 ≈ 7 ms (limit 50 ms). |

**Spot checks of the round-5 changes:**
- G1: "between one or two projects", "between two or three options" and "between 10 or 12 per cent" give no card. "a choice between solar or wind" → "and" is kept.
- G2: "funded by a trust with links to the state", "given by a bank from Mumbai" and "laid by a firm from Pune" give advice only. "The road was built by a contractor in 2010." → "A contractor built the road in 2010." is kept. "A firm near the coast was chosen by the board." → "The board chose a firm near the coast." keeps the modifier attached. Correct.
- Heading lines: "Neither Study A or Study B" as a heading gives no card. As a sentence, "Neither Study A or Study B found an effect." → "nor".
- **Single-letter labels in headings (the extra change):** no wrong fix. "Scenario A and Scenario B", "Results for Option A versus Option B", "Appendix B: Data Sources" and "Neither Study A or Study B" give 0 cards. The only effect is a miss: a title-case heading with a mid-title article "A" ("Gone With A Wind") no longer gets "A" → "a". Acceptable, since misses beat wrong fixes.

**No-AI constraint: holds.** Every fix comes from a deterministic rule applied to the writer's words, or from a fixed list in `src/engine/data`. `guard.js` still rejects outside words, AI vocabulary in any form, added negation (with one exception: "or" → "nor", only where the shared `neitherPairsWithOr` rule says it pairs with a preceding "neither"), em dashes, new AI phrases and oversized remote fixes. The composed sentence preview only stacks fixes that each passed the guard, and it is checked again as a whole. Agentless passives get a clearly bracketed `[who]` template that is never auto-applied, never in Accept all and never in the composed preview.

---

## Final backlog (medium/low, not blocking)

Prioritised for the next development cycle. Each item should follow the established process: a fixed list in `src/engine/data`, positive and negative tests, and a stress-fixture line for every near miss.

**Coverage, medium**
1. R1 compound subjects mid-sentence and with unlisted verbs ("…, and the design and testing of the tool was rushed"; "The selection and training of staff takes time").
2. R12(b): verb + -ing → infinitive (decide/refuse/manage/afford + -ing).
3. R8(c): light-verb nominalisations ("conduct an assessment of" → "assess", tense-preserving).
4. R13: pronoun–antecedent number for inanimate singular nouns ("the state … their" → "its").
5. R15: per cent / percent / % consistency.
6. Passive coverage: coordinated agents ("by the minister and the mayor"), longer agents with participle modifiers ("staff working in Goa"), three or more coordinated participles. All are currently refused; they should be offered where safe.

**Coverage, low**
7. R2b misses: "neither" + irregular participle ("neither paid or thanked") or comparative ("neither higher prices or …"); "not only … but also".
8. R11(b) misses when the following finite verb is unlisted ("The state funded scheme covers all districts").
9. R9 recall for lists whose items end in -s verbs-or-nouns in the middle of an item.
10. A title-case "A" mid-title is no longer lowercased (side effect of the label rule).

**P2 features**
11. R14 comma rules (introductory clauses, "but/so/yet" between long independent clauses, US "which").
12. R17 academic vague words (formal goal only), R20 distributive plural, R21 pronoun density, R22 "support X in V-ing" → "help X V", R23 interrupted complement (advice), dangling-modifier subset.
13. Indian English register advice, formal goal only and advice-only: "do the needful", "revert" (= reply), "the said report", "prepone".
14. U1 margin marker in the editor; sentence-length variety statistics in the performance panel.
15. Long-sentence split options for sentences joined by ", with …" absolute constructions (the abstract's 52-word sentence), if a safe deterministic split can be defined.

Signed off: PhD, round 5.
