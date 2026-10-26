# Round 3 review

NOT SATISFIED

**Score against Grammarly on goa-abstract.txt: 8 / 10** (unchanged from round 2; the abstract output is identical and correct).

Every round-2 finding is fixed, and C1–C7 pass on my own runs. A fresh stress test with 70 new sentences, none used before, found **three High defects**. Each one turns a correct sentence into a wrong one through a primary fix button:

1. The new "neither … or" fix ignores clause boundaries and "neither" used as a determiner. "Neither study controls for income **or** region." → "income **nor** region" is wrong.
2. Active-voice rewrites cut the agent's modifier off and move it. "The report was written by a team based in Delhi." → "**A team based wrote the report in Delhi.**"
3. Coordinated participles are rewritten without their object, in both the agent rewrite and the template. "The roads were built and maintained by the state." → "**The state built the roads and maintained.**"

Defects 2 and 3 predate round 3, but they sit in the passive reframe that the owner has made a headline requirement, so they must be fixed before sign-off. Round 4 is narrow: these three, plus two small template refinements.

---

## 1. Criteria (re-run by me)

`node --test tests/*.test.js` gives **140 pass, 0 fail**.

| | Result | Evidence |
|---|---|---|
| A1–A10, B1–B8 | **PASS** | goa: 14 cards, the same rules and first fixes as round 2; academic: 11. clean-academic.txt: 0 under default and academic/formal/confident. stress-clean.txt: only advice cards or `[who]` templates, and no "Someone". |
| C1 earlier criteria + B4 update | **PASS** | |
| C2 goa: same 14 cards | **PASS** | |
| C3 stress-clean-2 line by line | **PASS** | All 32 lines give no verb-pattern, hyphenation, one-of-plural, correlative or serial-comma card, and no correctness card. |
| C4 agentless passives get "we" or `[who]`, never "Someone" | **PASS** (but see F3 and F4 for template quality) | |
| C5 guard | **PASS** | "the"→"thing" is rejected. `isNeitherNorSwap` (`src/engine/guard.js:103`) is narrow: the span must be exactly "or" and the replacement exactly "nor", with a "neither" earlier in the sentence and no "nor" after it. AI-word, outside-word, em-dash and remote checks are unchanged. However, the exception permits the same over-broad scope as the rule (F1), so it needs the same clause restriction. |
| C6 full suite | **PASS** | 140/140. |
| C7 performance | **PASS** | |

**No-AI constraint: holds.** Every fix I generated (about 300 across four stress files) passes `checkFix`. All of them come from rules plus the fixed lists. The `[who]` template adds only the bracketed closed-list word "who".

**Checked and clean this round:**
- "used to": "The land is used to grow rice", "They are used to working long hours" and "He used to work in Delhi" all give no card.
- R11 verb readings: "The government led by the chief minister announced…", "The city based its plan on…" and "The state based companies employ…" give no card. "A government led initiative" → "government-led" and "The donor funded projects ended" → "donor-funded" are correct.
- R6b, R12 and R16 on new sentences.
- Indian English office phrasing ("Kindly do the needful and revert at the earliest", "Please find attached", "The said report") gets no false card. That's the right default: these are register choices, not errors.
- "chaired by" now rewrites correctly.

---

## 2. Findings

| # | Where | Sev | Input → bad output | Required fix |
|---|---|---|---|---|
| F1 | `src/engine/rules/usage2.js:58–67` (R2b neither…or) and `src/engine/guard.js:103` (`isNeitherNorSwap`) | **High** | "Neither study controls for income or region." → "income **nor** region" · "Neither plan worked, so we tried solar or wind." → "solar **nor** wind" · "Neither option is ideal, but solar or wind could work." → "solar **nor** wind". The first is *neither* used as a determiner (= "not either study"); the other two have the "or" in a different clause. | **Rule:** flag only when **all** of these hold. (a) "neither" is **not** a determiner: the next token is in DET_POSS (excluding each/every/no), is a pronoun, a capitalised name, or an adjective/participle (-ed, -ing, `ADJ_SUFFIX`, `ADJ_LIST`). A bare singular noun right after "neither" (neither study/plan/option/firm/party) means determiner use, so skip. (b) Between "neither" and "or" there is no `, ; : ( —`, and none of but, so, yet, and, because, while, although, which, that, who, whereas. (c) At most 8 tokens lie between them. **Guard:** `isNeitherNorSwap` applies the same (b) and (c) tests to the text between "neither" and the swapped "or", so the exception can never be wider than the rule. |
| F2 | `src/engine/rewrite.js:174` (agent cut at `AGENT_STOP`) | **High** (pre-existing) | "The report was written by a team based in Delhi." → "A team based wrote the report in Delhi." · "The scheme is managed by a society registered under the Societies Act." → "A society registered manages the scheme under the Societies Act." The stop splits a reduced relative clause, so the participle is stranded and its complement moves away. | When the agent is cut at `AGENT_STOP`, look at its last token. If it is a participle (`[a-z]+ed`, `[a-z]+ing`, or a key/value of `IRREGULAR`/`IRREGULAR_BASE`), **don't cut**: keep the whole remainder of the sentence as the agent ("A team based in Delhi wrote the report."). Refuse the rewrite if that remainder contains a second "by", a comma, or a relative pronoun. Tests: the two sentences above → "A team based in Delhi wrote the report." / "A society registered under the Societies Act manages the scheme."; "The plant is run by a company owned by the state." → no rewrite (second "by"); "The data were checked by two analysts working independently." → "Two analysts working independently checked the data." (unchanged). |
| F3 | `src/engine/rewrite.js:122–212` (verb group with "and" + second participle) | **High** (pre-existing; the template inherits it) | "The roads were built and maintained by the state." → "The state built the roads and maintained." · "The samples were collected and analysed." → template "[who] collected the samples and analysed." | Detect `BE P1 and P2` (both participles convertible by `pastTense`/`thirdPerson` with the same agreement). Emit "{agent} {P1'} and {P2'} {object}{tail}": "The state built and maintained the roads." / "[who] collected and analysed the samples." If either participle can't be converted, or there are more than two, refuse. Tests: both sentences give the correct output; "The roads were built and the bridges were repaired." → no rewrite. |
| F4 | `src/engine/rules/clarity.js` (template offer) | Medium | "The results are shown in Table 3." → template "[who] shows the results in Table 3." · "Respondents were asked…" (fine as is). Presentation and citation passives have no meaningful actor, so a template is noise. | Offer **no template** when the tail starts with in/on/at + (Table, Figure, Fig., Section, Chapter, Appendix, Annex, Box, page) or with below/above/overleaf, or when the participle is shown, presented, given, listed, summarised/summarized, reported, illustrated or depicted and a tail exists. Advice stays. Test: "The results are shown in Table 3." gives a passive card with `fixes: []`. |
| F5 | `src/engine/rewrite.js:27` (time adverbials) | Low | "The tariff is set by the commission every year." gives no rewrite (acceptable). "Tariffs are revised by the commission annually." → "The commission annually revises tariffs." (grammatical, slightly marked). | Add every/each + (day, week, month, quarter, year), annually, monthly, weekly, daily and yearly to `AGENT_STOP`, so they stay in the tail: "The commission sets the tariff every year." / "The commission revises tariffs annually." |

---

## 3. Rulings on the implementer's open questions

1. **F2 determiner set limited to singular determiners: confirmed.** A plural quantifier can't head a singular subject that would take the past-tense head as its verb ("Many resource constrained states struggle" is a hyphen case). Add one negative test to lock in the boundary: "The two farmers owned land near the coast." → no card (N1 is plural, so (b) shouldn't fire).
2. **A single sentence-initial "We" qualifies for the "we" rewrite: confirmed.** It is a strong signal of authorial "we", and the rewrite is never auto-applied. Exclusion: a "We" inside quotation marks doesn't count.
3. **Bare "We got used to work." left unflagged: confirmed.** "Work" is a legitimate noun there. Misses beat wrong fixes.

---

## 4. Round-4 spec

### 4.1 Required

F1, F2, F3 (High) and F4 (Medium). F5 (Low) is optional but recommended: it's two lines in a list.

### 4.2 New fixture and tests

- **`tests/fixtures/stress-clean-3.txt`** (added by me): 30 correct sentences from this round's stress test. **Line-by-line rule**, under default and academic: no `correlative` card; no correctness card; and no fix containing any of these strings:
  - "income nor", "solar nor", "taxes nor"
  - "A team based wrote", "A society registered manages"
  - "roads and maintained", "samples and analysed"
  - "shows the results in Table"
  - "Someone"
  - Passive cards may otherwise appear (advice, a "we" rewrite, a correct agent rewrite, or a `[who]` template).
- **Add to `tests/round4.test.js`:**
  - F1:
    - "Neither the state or the centre has acted." → "nor" (still fixed)
    - "The proposal was neither approved or rejected." → "nor"
    - the three sentences in F1 → no card
    - "Neither firm reported profits; both cited taxes or duties." → no card
    - guard: `isNeitherNorSwap` returns false for the "or" in "Neither plan worked, so we tried solar or wind."
  - F2: the four cases in the table.
  - F3: the three cases in the table.
  - F4: "The results are shown in Table 3." gives a passive card with no fixes. "The houses were built in 1990." still offers "[who] built the houses in 1990."
  - F5 (if done): "The commission sets the tariff every year."
  - Q1: "The two farmers owned land near the coast." → no hyphenation card.

### 4.3 Acceptance criteria (round 4)

- **D1** A1–A10, B1–B8 and C1–C7 still pass.
- **D2** goa-abstract.txt: the same 14 cards with the same first fixes.
- **D3** stress-clean-3.txt passes the §4.2 line-by-line rule under default and academic. stress-clean.txt and stress-clean-2.txt still pass.
- **D4** All §4.2 tests and the full suite pass.
- **D5** `isNeitherNorSwap` applies the same clause and distance limits as the R2b rule (a unit test for each limit).

When D1–D5 are green I'll run one more fresh stress pass on passives and correlatives only. If it finds no High defect, I will sign off.

### 4.4 Backlog (not required for sign-off)

- R1 compound subjects mid-sentence ("…, and the design and testing of the tool was rushed").
- R12(b) verb + -ing → infinitive (decide/refuse/manage + -ing).
- R2b "not only … but also".
- R8(c) light-verb nominalisations, R13 pronoun–antecedent, R15 per cent consistency, R14 comma rules, R17/R20–R23 (P2).
- R11 (b) misses with an unlisted following finite verb ("The state funded scheme covers all districts").
- U1 margin marker (P2).
