# Round 2 review

NOT SATISFIED

**Score against Grammarly on goa-abstract.txt: 8 / 10** (round 0: 2, round 1: 7).

On the abstract, Plainly now does better than Grammarly's free tier on substance:

- It gives the right fix for all 8 spans where Grammarly found a real issue.
- It adds 3 issues Grammarly missed: "a bulk", "Power" in the title, and the serial comma.
- It shows 14 cards, none of them wrong.

The round-1 findings are all fixed and every B criterion passes.

I still can't sign off, because two of the new P1 rules break correct sentences that are **very common in policy prose**:

- "The funds are **used to build** schools." → "used to building". This is my own spec's error: I put "be used to" in the gerund frames. I'm correcting it here.
- "The community **led** protests against the plant." → "community-led protests against the plant". The fix deletes the sentence's only verb and leaves a fragment.

Round 3 is small: those two fixes, a one-line guard tightening, the passive reframe ruling, and two guard/heuristic rulings.

---

## 1. Criteria (re-run by me)

`node --test tests/*.test.js` gives **126 pass, 0 fail**.

| | Result | Evidence |
|---|---|---|
| A1–A10 (round 1) | **PASS** | goa default: 14 cards. All 8 Grammarly spans carry the exact first fixes ("are", "both centralised and decentralised approaches", "aims to identify", advice on "in terms of", "suitable for", "able to support", "how to decarbonise"). 2,129 words: p95 ≈ 4 ms. |
| B1 A1–A10 still pass | **PASS** | |
| B2 round-1 cards + "Power"→"power" + "ecosystem and"→"ecosystem, and", ≤ 14 | **PASS** | Exactly 14. Academic: 11. |
| B3 clean-academic 0 | **PASS** | 0 under default, academic/formal/confident, and limit 38. |
| B4 stress-clean line by line | **PASS** | The only cards are passive (5), list-parallel (3) and vague-phrase (1), all advice-only. No forbidden strings. |
| B5 new tests, full suite | **PASS** | 126/126. |
| B6 every fix passes `checkFix` | **PASS** | About 250 fixes from my stress sentences: 0 guard failures. (But see F3: the guard now accepts one outside word it shouldn't.) |
| B7 rule-info for R2b, R6b, R9, R10, R11, R12, R16 | **PASS** | |
| B8 performance | **PASS** | |

**No-AI constraint: holds,** with one leak to close (F3). I probed the two guard changes:

- **Hyphen join/split** accepts only words whose parts are in the replaced span.
  - "cutting edge" → "cutting-edge" is still rejected as an AI word, because the AI check runs first.
  - "not-for-profit" → "not for profit" is rejected as an added negation, because the negation count uses the real tokens, not the split parts.
  - "well known" → "well-known delve" is rejected.
  - Safe.
- **Silent-e** works for raise→raising and store→storing. But it also accepts **"the" → "thing"** (o = "the" ends in e, "th" + "ing"). That lets an outside word through. It can't carry AI vocabulary or negation, but it breaks the "only the writer's words" promise. Fix in F3.

---

## 2. Findings

| # | Where | Sev | Input → bad output | Required fix |
|---|---|---|---|---|
| F1 | `src/engine/rules/usage2.js:340` (FRAME_RE, the `be … used to` branch) | **High** | "The funds are used to build schools." → "used to **building** schools" · "Diesel is used to generate backup power." → "used to **generating**". "Be used to + infinitive" is the passive of *use* with a purpose infinitive, one of the most frequent patterns in policy writing. The be-branch was in my round-1 spec; that was my error. | Delete the `be/is/are/was/were/been/being used to` alternatives. Keep `get/gets/got/become/becomes/became used to` only. The ESL error "I am used to work late" becomes a miss, which is acceptable. |
| F2 | `src/engine/rules/usage2.js:299–335` (R11 (b), `PARTICIPLE_HEADS` at `usage-lists.js:217`) | **High** | "The community led protests against the plant." → "The community-led protests against the plant." (no verb left) · "The state owned land near the coast." → "state-owned" · "The state led reforms in 2005." → "state-led" · "The utility funded projects in three districts." → "utility-funded". The head is a past-tense **main verb** here. | When the head is a past-tense form (led, owned, based, driven, funded, focused, related, linked, connected, constrained, oriented) **and** a determiner or possessive precedes N1, offer the hyphen only if the same sentence has another finite verb after the following noun: a token in BE ∪ MODALS ∪ {has, have, had, do, does, did}, an `IRREGULAR`/`PAST_TO_BASE` past form, or an -ed word other than the head. Otherwise skip. With no determiner (sentence-initial "Community led protests grew"), keep today's behaviour. Tests: all four sentences above get no card. "The project led changes were welcome." → "project-led". "Evidence based approaches work." → "Evidence-based". |
| F3 | `src/engine/guard.js:81–83` (silent-e) | Medium | `checkFix('See the plan.', 'the'→'thing')` returns ok. An outside word gets through. | Apply both silent-e branches only when the writer's word has ≥ 4 letters and isn't in `STOPWORDS`. Test: "the"→"thing" rejected; raise→raising, store→storing, use→using (via the existing inflection rule) still accepted. |
| F4 | passive rule: owner requirement | Medium (product) | Agentless passives ("Mistakes were made.", "The proposal was rejected.") now get no reframe at all. The owner explicitly wants passive cards to **propose** an active version. | See ruling P below. |
| F5 | `src/engine/rules/usage2.js:215` (R9 recall) | Low | "We study land, water, and labour. We then compare costs, risks and benefits." gives no card, because "risks"/"benefits" are treated as possible verbs and end the list. | A token ending in -s counts as a noun when it is the **last token of its item** (followed directly by a comma, "and" or "or", or the end of the list). A verb would normally be followed by its object. Test: the sentence above flags "risks and" → "risks, and". "Costs rose, prices fell and demand grew." still gives no card. |
| F6 | `src/engine/rules/usage2.js:242` (R10 heading detection) | Low | No false positives in my probes ("Dear Sir", "Hi team", "Agenda for Monday", shopping lists, meeting notes), but the heuristic is fragile. | A line is a heading only if it is the first line of the document, **or** it has a blank line or the start of the text above it and a line of ≥ 8 words below it. A run of ≥ 3 consecutive short lines is a list, not headings. Test: a 4-line shopping list with "Bread and Eggs" gives no card. |
| F7 | passive coverage after BASE_VERBS gating | Low | "The meeting was chaired by the secretary." now gets no rewrite (round 0 gave one). The gate is too tight for ordinary regular verbs. | When a "by"-agent is present and the participle is a regular -ed form not starting with un/in/dis/mis/non and not in `ADJECTIVE_PARTICIPLES`, allow the rewrite even if the base is missing from `BASE_VERBS`. The un-filter and the adjective list already remove the round-1 non-words. Test: "The meeting was chaired by the secretary." → "The secretary chaired the meeting." "The tariff is unaffected by the change." still gives no rewrite. |

**Checked and found clean in this round:**
- R2b: either…nor, between…or, both…as well as. "between the plans, or between the states" and "He neither smokes nor drinks, or so he says" are correctly skipped.
- R6b: 7 sentences; uncountables and superlatives are skipped.
- R11 (a) fixed compounds, including predicative and "in the long term" negatives, and (c) -ly hyphens.
- R12 (a): avoid/consider/recommend, look forward to, committed to, dedicated to, object to, key to. Noun objects are correctly skipped ("in addition to cost", "committed to cost recovery", "suggest to the board").
- R16: 8 sentences.
- R9 on 9 documents (no false positives).
- Severity counts and the score header.

---

## 3. Rulings

**P. Agentless passives must still get a rule-based reframe proposal (owner requirement).** Two forms, in this order:

1. **"we" rewrite** when the writer writes with we/our/us (≥ 2 uses). This exists already; keep it under every domain.
2. **An actor template**, when the rewrite machinery can parse the sentence. It must pass every gate: `BASE_VERBS` or the F7 rule, the un-filter, the adjective list, and not in `STATE_PARTICIPLES`. The fix text puts the placeholder **`[who]`** in the subject slot: "Mistakes were made." → "**[who]** made mistakes." "The proposal was rejected." → "**[who]** rejected the proposal."
   - The fix is labelled **"Active-voice template: type who did it"** and carries `template: true`. After accepting it, `[who]` is selected so the writer types over it (reuse the existing `select` mechanism).
   - It is **never** in Accept all, **never** in a composed "Improve this sentence" preview, and **never** the first (primary) button when the card also has a "we" or "by"-agent rewrite.
   - The visible brackets are the safety: unlike "Someone", the text can't pass for finished prose if the writer accepts it and walks away.
   - **Guard:** add `[`, `]` handling (`words()` ignores the brackets) and confirm "who" is in CLOSED (it is).
   - **Under academic/technical:** offer it too, as the second option on a severity-style card, after the message *"Passive voice is normal in academic writing; use this only if naming the actor helps."*
   - **B4 update:** "Someone" stays forbidden. "[who]" is allowed only in fixes flagged `template: true`.

**Open question 1: academic passive with a named "by" agent.** **Allow** the agent rewrite under academic/technical ("The data were collected by the team" → "The team collected the data"). It is the writer's own words reordered, which is exactly what the owner asked for. Severity style, not primary-coloured, and no auto-apply.

**Open question 2: "neither … or".** **Approve a scoped exception** to the negation check. `checkFix` accepts the single-token swap "or" → "nor" only when (a) the replaced span is exactly "or", (b) the same sentence contains "neither" before it, and (c) there is no "nor" between them. This doesn't change polarity, because "neither" already carries the negation. It is implemented as an explicit named check in `guard.js`, with tests: allowed in "Neither the state or the centre has acted."; rejected for "or"→"nor" with no preceding "neither"; and every other added negation is still rejected.

**Open question 3: "someone" off by default.** **Agreed:** remove the bare "Someone" template globally. It is replaced by the `[who]` template in ruling P. No user setting is needed. The engine option `passiveTemplate` can stay for tests.

**Open question 4: R9 conservatism.** Accepted as a design principle (misses beat false fixes), with the recall improvement in F5.

**Open question 5: R10 heading heuristic.** Tighten as in F6.

**The two guard changes.** Hyphen join/split: **approved as built.** Silent-e: **approved with the F3 restriction.**

---

## 4. Round-3 spec

### 4.1 Required

1. F1, F2, F3 (must).
2. Ruling P (agentless template), with Q1 and Q2 as ruled.
3. F5, F6, F7 (required this round; each is a small change).

### 4.2 New fixture and tests

- **`tests/fixtures/stress-clean-2.txt`** (added by me): 32 correct sentences, mostly near misses for F1, F2, R11, R12, R6b, R2b and R9. Test it line by line under default and academic: **no card from `verb-pattern`, `hyphenation`, `one-of-plural`, `correlative` or `serial-comma`, and no correctness card.** Today it fails on 6 lines (2 for F1, 4 for F2). Keep `stress-clean.txt` (B4) as is.
- **Add to `tests/round3.test.js`:**
  - F1: the two "used to" sentences give no card. "We got used to work late." → "got used to working". "They became used to pay more." → "paying".
  - F2: the four verb-reading sentences give no card. "The project led changes were welcome." → "project-led". "Community led protests grew." → "Community-led".
  - F3: "the"→"thing" rejected; raise→raising accepted; store→storing accepted.
  - P:
    - "Mistakes were made." has a fix "[who] made mistakes." with `template: true` and `select` covering "[who]".
    - "We cleaned the data. The data were checked." offers "we" first, then the template.
    - "The tariff is unaffected." and "The results are unprecedented." give no template.
    - No template appears in `bulkFixes()` or in `composeSentence` items.
  - Q1: under `{domain:'academic'}`, "The data were collected by the team." offers "The team collected the data."
  - Q2: "Neither the state or the centre has acted." → "nor" passes the guard. "The state or the centre has acted." with a forced "or"→"nor" fix fails.
  - F5, F6, F7: the cases in the findings table.

### 4.3 Acceptance criteria (round 3)

- **C1** A1–A10 and B1–B8 still pass. Update B4's forbidden list per ruling P.
- **C2** goa-abstract.txt: the same 14 cards with the same first fixes (passive isn't triggered on the abstract; confirm no new card appears).
- **C3** stress-clean-2.txt passes the line-by-line rule in §4.2 under default and academic.
- **C4** Every agentless passive card that passes the rewrite gates offers either a "we" rewrite or a `[who]` template, and no fix contains "Someone".
- **C5** The guard rejects "the"→"thing" and every added negation except the scoped neither…nor swap. The existing guard tests all pass.
- **C6** All §4.2 tests pass, and the full suite passes.
- **C7** Performance: 2,000 words p95 < 50 ms.

If C1–C7 are green and a fresh stress pass by me finds no High finding, I will sign off.
