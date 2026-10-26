# Round 4 review

NOT SATISFIED

**Score against Grammarly on goa-abstract.txt: 8 / 10** (unchanged; the abstract output is identical and correct).

All three round-3 High defects are fixed, and they're fixed well.
- The "neither … or" scope is now a single shared function, used by both the rule and the guard (`src/engine/neither.js`).
- Agent post-modifiers with participles stay attached.
- Coordinated participles keep their object.
- Presentation passives no longer get a template.
- Time adverbials stay in the tail.

D1–D5 pass on my own runs. My fresh stress test (64 new sentences on passives and correlatives) found **two remaining High defects of the same two families**, in shapes round 3 didn't cover:

1. **"between X or Y" with a numeric approximation.** "Each team picks between **one or two** projects." → "between one **and** two projects". "one or two" here is an approximate quantity, and the fix changes the meaning. This R2b pattern dates from round 2.
2. **Agent cut before a prepositional post-modifier.** "The study was funded by a trust **with links to the state**." → "A trust funded the study with links to the state." "The loan was given by a bank **from Mumbai**." → "A bank gave the loan from Mumbai." The modifier now attaches to the object.

Both fixes are a few lines. **I commit to signing off on round 5 by checking only the criteria below (E1–E5), with no further fresh stress pass.** The rule families are now well bounded, and the remaining risk is in the backlog.

---

## 1. Criteria (re-run by me)

`node --test tests/*.test.js` gives **151 pass, 0 fail**.

| | Result | Evidence |
|---|---|---|
| A1–A10, B1–B8, C1–C7 | **PASS** | goa: 14 cards (academic: 11) with the same rules and first fixes. clean-academic.txt: 0. 2,100 words: p95 ≈ 5 ms. |
| D1 earlier criteria | **PASS** | |
| D2 goa unchanged | **PASS** | |
| D3 stress-clean-3 line by line; stress-clean and stress-clean-2 still pass | **PASS** | stress-clean-3 output is now correct, e.g. "A team based in Delhi wrote the report.", "A society registered under the Societies Act manages the scheme.", "The state built and maintained the roads.", "[who] collected and analysed the samples.", "The commission sets the tariff every year." "The results are shown in Table 3." gets advice only. No forbidden strings. |
| D4 full suite | **PASS** | 151/151. |
| D5 the guard exception equals the rule | **PASS** | `isNeitherNorSwap` and R2b both call `neitherPairsWithOr`. I confirmed they agree on my 15 new neither/either sentences. |

**No-AI constraint: holds.** All fixes from 64 new sentences pass `checkFix`, and every one is the writer's words reordered or re-inflected, or a fixed-list word.

**Clean in this pass:**
- Passives with time and place tails ("in 1987", "last year", "on 3 May", "each quarter", "until 2026", "next year", "during summer").
- Auxiliaries and adverbs: "has been extended" → "has extended", "will be installed" → "will install", "is being reviewed" → "is reviewing", "badly damaged" and "quickly written" kept with the verb.
- Pronoun objects: "She was appointed by the governor." → "The governor appointed her."
- Refusals where they should happen: "by half", "by 2020", "by phone", "by hand", "shut down", "not approved", "designed, tested and launched", "repaired and is now working", "floated but later withdrawn", "hired by the department", "living near the site".
- Correlatives: "Neither the tariff or the subsidy changed." → "nor"; "Either the state nor the centre will pay." → "or"; "both land as well as water" → "and". Correctly skipped: "Neither party won a majority or formed a government", "Neither side is right or wrong", "neither tea or coffee" (a miss, not a wrong fix), "Neither Delhi nor Mumbai, or Chennai for that matter".

---

## 2. Findings

| # | Where | Sev | Input → bad output | Required fix |
|---|---|---|---|---|
| G1 | `src/engine/rules/usage2.js` (R2b "between X or Y") | **High** | "Each team picks between one or two projects." → "between one and two projects" · "The panel could not decide between two or three options." → "between two and three options". "N or M" next to a noun is an approximate number. ("between 10 or 12 per cent" with digits is already skipped.) | Skip when the words directly before and after "or" are both numerals or number words (a, one, two, three … twenty, thirty … hundred, a few, several, digits). Tests: both sentences give no card; "between solar or wind" → "and" still. |
| G2 | `src/engine/rewrite.js` (agent cut at `AGENT_STOP`) | **High** | "The study was funded by a trust with links to the state." → "A trust funded the study with links to the state." · "The loan was given by a bank from Mumbai." → "A bank gave the loan from Mumbai." · "The cables were laid by a firm from Pune." → "A firm laid the cables from Pune." A prepositional post-modifier of the agent is moved after the object, where it modifies the object. | When the agent would be cut at **from, with, of, without, like or near**, refuse the rewrite (advice only). These prepositions usually modify the noun in front of them, and from where we sit the noun-modifier reading and the adverbial reading can't be told apart. Keep cutting at in/on/at/during/since/until/after/before/for + time or place (these are overwhelmingly adverbial in passive tails). Tests: the three sentences give no rewrite; "The road was built by a contractor in 2010." → "A contractor built the road in 2010." still; "The data were downloaded by staff from the website." → no rewrite (already). |

**Medium/low observations (backlog, not blocking):**
- "Neither of the plans or proposals was adopted." gets no correlative card. That's correct: "neither of" + "or" inside an NP is fine.
- Misses (not wrong fixes): "He was neither paid or thanked." (irregular participle after "neither"), "Neither higher prices or lower demand…" (comparative adjective), "The bridge was opened by the minister and the mayor." (coordinated agent; refused), "The proposal was opposed by farmers living near the site." (refused).

---

## 3. Ruling on the implementer's open note

**A capitalised word after "neither" counts as a proper noun: accepted.** "Neither Goa or Kerala has acted." → "nor" and "Neither Study A or Study B found an effect." → "nor" are both correct. The rare misread ("Neither Study …" in a title-cased heading) is covered: R2b doesn't run on heading lines, because a heading has no sentence-final punctuation and is set off by blank lines. Please confirm with a test that R2b skips heading lines.

F2's whole-remainder agent with a refusal at 7+ words is **accepted**. Refusing is the right outcome.

---

## 4. Round-5 spec (final)

### 4.1 Required

G1 and G2, plus the heading-line test from §3.

### 4.2 Fixture and tests

- **`tests/fixtures/stress-clean-4.txt`** (added by me): 20 correct sentences. **Line-by-line rule**, under default and academic: no `correlative` card; no correctness card; and no fix containing any of these strings:
  - "one and two", "two and three"
  - "with links to the state."
  - "the loan from Mumbai", "the cables from Pune"
  - "Someone"
  - Passive cards may be advice only or carry a correct rewrite.
- **Add to `tests/round5.test.js`:** the G1 and G2 tests in §2, and "Neither Study A or Study B" as a heading line (followed by a blank line and a paragraph) gives no correlative card.

### 4.3 Acceptance criteria for sign-off

- **E1** A1–A10, B1–B8, C1–C7 and D1–D5 still pass.
- **E2** goa-abstract.txt: the same 14 cards with the same first fixes. clean-academic.txt: 0 cards.
- **E3** stress-clean-4.txt passes the §4.2 line-by-line rule. stress-clean, stress-clean-2 and stress-clean-3 still pass.
- **E4** The §4.2 tests and the full suite pass.
- **E5** Performance: 2,000 words p95 < 50 ms.

**E1–E5 green means SATISFIED.** I'll verify them by running the tests and fixtures, with no additional fresh stress pass.

### 4.4 Backlog after sign-off (medium/low, not blocking)

1. R1 compound subjects mid-sentence and with unlisted verbs ("the design and testing of the tool was rushed").
2. R2b misses: "neither" + irregular participle or comparative adjective. "not only … but also".
3. R12(b) verb + -ing → infinitive (decide/refuse/manage + -ing).
4. R11(b) misses with an unlisted following finite verb ("The state funded scheme covers all districts").
5. Passive coverage: coordinated agents ("by the minister and the mayor"), long agents with participle modifiers, three or more coordinated participles.
6. P1 items not yet built: R8(c) light-verb nominalisations, R13 pronoun–antecedent, R15 per cent consistency.
7. P2: R14 comma rules, R17 academic vague words, R20–R23, dangling modifiers, the U1 margin marker, sentence-length variety stats.
8. Indian English register advice (optional, formal goal only): "do the needful", "revert" (= reply), "the said report", "prepone". Advice-only cards, never errors.
