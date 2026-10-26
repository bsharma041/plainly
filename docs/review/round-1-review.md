# Round 1 review

NOT SATISFIED

**Score against Grammarly on goa-abstract.txt: 7 / 10** (was 2 / 10).

All ten acceptance criteria I set in round 1 pass, and I re-ran each one myself. Plainly now matches every span on the abstract where Grammarly found a real issue, with correct fixes. It also catches "a bulk", which Grammarly missed, and the repetition noise is gone.

I still can't sign off. My stress tests found **new rules that insert errors**: "similar **to respect to** cost", "able to **catch fire**", "In **rising demand**, Goa must act", "demand for power plants for coal". The older passive rule also offers non-words: "Someone **unprecedents** the results", "The change **unaffects** the tariff". A quality gate can't pass a tool that turns correct sentences into wrong ones, even when the written criteria are green. Round 2 below is narrow: fix the findings, add the P1 rules that cover the abstract's remaining issues, and add a stress fixture so these defects can't come back.

---

## 1. Acceptance criteria (verified by running the code, not from the notes)

`node --test tests/*.test.js` gives **99 pass, 0 fail**.

| | Result | How I checked |
|---|---|---|
| A1 Grammarly spans 4, 6, 7, 10, 11, 12, 13, 15 with exact first fixes | **PASS** | `runChecks(goa)`: is→"are"; "both centralised and decentralised approaches"; "aims to identify"; "in terms of" (advice); "suitable for"; "able to support"; "how to decarbonise". |
| A2 "a bulk" → "the" | **PASS** (P0 part) | Underlines "a" only. "Power" and the serial comma are still open (P1). |
| A3 0 repetition cards, ≤ 14 total | **PASS** | 12 cards by default, 9 under academic. |
| A4 0 suggestions on clean-academic.txt | **PASS** | 0 under default; 0 under academic/formal/confident; 0 at limit 38. |
| A5 P0 positive and negative tests | **PASS** | `tests/round1.test.js`. My own stress tests add failures (see §3). |
| A6 every fix passes the guard, none dropped | **PASS** | I re-ran `checkFix` on every fix from every stress sentence (about 160): none fail. The guard's negation, AI-word, em-dash and AI-phrase checks are unchanged. `USAGE_INSERTS` and `NOMINALISATIONS` are the only new vocabulary, and both are fixed lists. |
| A7 composed preview string, order-independent, one undo step | **PASS** | The preview equals the spec string exactly. `composeSentence` applies right to left. Accept goes through one `replaceRange` → one `execCommand('insertText')` (`src/app.js:373`, `:530`). I couldn't test undo in a browser (the browser pane was unavailable to me); the code path is the same single-insert path the existing Accept already uses. |
| A8 rule-info name, explanation and example for every P0 rule | **PASS** | All 8 entries are present and sensible. The card renders them in `src/app.js:303` (the "Why?" details). |
| A9 academic domain: no repetition, no plain-word | **PASS** | |
| A10 performance | **PASS** | 2,129 words: p50 2.9 ms, p95 4.2 ms. |

**No-AI constraint: holds.** Every new fix is the writer's words re-inflected (`baseFromIng`, `pluralize`, `pluralVerb`) plus fixed list entries. The composed preview only stacks fixes that each passed the guard, and it is checked again as a whole.

---

## 2. Rulings on the implementer's six questions

1. **Guard `maxGrowth` for the composed preview: approved, with conditions.**
   - It may be passed only by `composeSentence`.
   - The value must be the sum of the component growths (floor 4, as built).
   - Remote fixes must ignore it (as built).
   - Add a test: a composed preview that contains one word not produced by any component fix must fail `checkFix`. This proves the raised limit doesn't open a path for new wording.
2. **R5 and R8 narrowings: all three approved.**
   - "that"/"which" must come directly before the be-verb (R5).
   - before/after/without are excluded from R8(a), because they create dangling modifiers.
   - learn/understand are excluded from R8(b), because they change the meaning.
   - The spec is updated to match (§4).
3. **R8(a) agent risk: narrow it further. This is required.** The problem is wider than "by". A gerund forces an *object* reading of "of", but many nominalisations here have a *subject* reading: "the development **of the city**" means the city develops, so "developing the city" changes the meaning. Two changes:
   - Limit (a) to **for** and **in** (drop by, on, about, through, towards).
   - Remove ergative and unaccusative nouns from (a): development, expansion, transformation, integration, reduction, improvement. They stay available to R8(b) ("plan how to develop"), where "plan" supplies the agent.
4. **Topic-term suppression in short texts: change it.** Apply N1(c) only when the document has **≥ 150 words**. The title, keywords and repeated-bigram protections stay at every length. Today "The report covers tariffs. The report was long, and the report had errors. We sent the report back." gets no repetition card, which is over-suppression for general writing.
5. **"the cost and timing of each are published": fix now.** This is a correctness card with a wrong fix (`src/engine/rules/grammar.js:66`). "The data for each are shown in Table 2." has the same problem. When "each/either/neither" is preceded by a preposition (of for to from in on by with among between), it is the object of that preposition, not the subject, so skip.
6. **U1 margin marker: deferred to P2. Accepted.** The chip on the first card of the sentence is enough of an entry point. Don't risk the mirror's alignment.

---

## 3. Findings

Severity: **High** = the fix produces an ungrammatical sentence or a non-word, or changes the meaning, in normal prose. **Medium** = wrong fix in plausible prose, or advice that misleads. **Low** = coverage gap or minor.

| # | Where | Sev | Input → bad output | Required fix |
|---|---|---|---|---|
| F1 | `src/engine/rules/clarity.js:99` (passive), `src/engine/rewrite.js:121` (`passiveToActive`) | **High** (pre-existing) | "The results are unprecedented." → "Someone **unprecedents** the results." · "The tariff is unaffected by the change." → "The change **unaffects** the tariff." · "His knowledge and experience of the sector are unmatched." → "Someone **unmatches** …" · "The emphasis on cost is misplaced." → "Someone misplaces the emphasis on cost." | (a) Skip participles that start with "un", except a whitelist of real un-verbs: undermined uncovered unveiled undertaken understood undone unlocked unloaded unpacked unearthed unified united. (b) Add misplaced, comprised, unprecedented, unmatched, unaffected, unexpected, unexplained, unknown, unresolved to `ADJECTIVE_PARTICIPLES` (`src/engine/data/lists.js:198`). (c) Deterministic check: `passiveToActive` may offer a rewrite only if `baseForm(participle)` is in `BASE_VERBS` or in `IRREGULAR_BASE`. Otherwise advice only. |
| F2 | passive rule under academic/technical domain | Medium | "Both centralised and decentralised options were tested." → "Someone tested both centralised and decentralised options." The passive is conventional in academic methods writing, and "Someone" is a register error. | Under academic/technical: passive cards are severity *style* and advice only, with no "someone" option. The "we" option stays when the writer writes with "we". |
| F3 | `src/engine/data/usage-lists.js:93` (R4 "similar with") and all COLLOCATIONS rows | **High** | "The two plans are similar with respect to cost." → "similar **to respect to** cost" | Global COLLOCATIONS guard: skip when the next word is respect, regard, regards or reference. |
| F4 | `src/engine/rules/usage.js:226` (R5 "able to") | **High** | "Old cables are dangerous, unreliable, and can catch fire." → "able to catch fire" · "Prices are unpredictable, seasonal, and can rise sharply." → "able to rise" · "Monsoon flows are seasonal, erratic, and can vary widely." → "able to vary". Epistemic "can" (possibility) is not ability, so "able to" changes the meaning. | Offer "able to {verb}" only when verb ∈ `CAPABILITY_VERBS` = support meet handle deliver provide serve supply run operate scale store generate absorb cover reach process carry produce compete adapt replace integrate reduce cut lower power host. Otherwise: "that can {verb}" when the relative condition holds, else advice only. |
| F5 | `src/engine/data/usage-lists.js:112` (R4 "demand of") | Medium | "The demand of power plants for coal is falling." → "demand for power plants for coal" | Skip when the listed noun is followed by a noun (a token ending in -s, or in plants stations sector sectors utilities companies consumers users producers generators suppliers), or when "for" occurs within the next 4 tokens. |
| F6 | `src/engine/data/usage-lists.js:135` (R7 "in the context of") | Medium | "In the context of rising demand, Goa must act." → "In rising demand, Goa must act." | Make it advice only (`fixes: null`). |
| F7 | `src/engine/rules/usage.js:297` (R8 NOM_A) | Medium | "The book is about the development of the city." → "about developing the city" · "The report on the implementation of the scheme is due." → "report on implementing the scheme" · "Costs fell by the reduction of losses." → "by reducing losses" | As ruled in Q3: prepositions {for, in} only; remove ergative nouns from (a). |
| F8 | `src/engine/rules/grammar.js:66` | **High** (pre-existing) | "The cost and timing of each are published in the annex." → "each is" · "The data for each are shown in Table 2." → "each is" | As ruled in Q5. |
| F9 | `src/engine/data/usage-lists.js:30` (UNIT_BINOMIALS) | Low | "The coming and going of staff is disruptive." → "are" | Add: coming and going, toing and froing, ebb and flow, rise and fall, pros and cons (plural anyway), wear and tear (present), give and take (present). |
| F10 | `src/engine/rules/engagement.js:30` | Medium | Repetition is suppressed in every short text (see Q4). | As ruled in Q4. |
| F11 | R1 coverage | Low | Misses: "His knowledge and experience of the sector is unmatched." (possessive determiner) and "The selection and training of staff takes time." (verb not in the list) | Add his, her, my, your, our, its, their to the R1 opener determiners. Extend the third-person verb list with takes, makes, reflects, determines, affects, shows, varies, depends, includes, provides, creates, means. Keep the 12-token and no-relative guards. |

**What I checked and found clean (no change needed):**
- R2 on 6 fresh sentences, including "both a single and double room" (correctly skipped) and "both a short-term and long-term plan".
- R3 on 8 sentences, including "aimed at policymakers" and "aimed at women entrepreneurs" (correctly skipped).
- R4's other rows on 20 sentences, including Indian English (discuss about, comprise of, cope up with, request for, emphasised on, insisted to see); all right. "suitable to grow cashew" and "consistent to within 2 per cent" are correctly skipped.
- R6 on 6 sentences.
- R1 against unit nouns, titles of works, organisation names ("The Department of Science and Technology is", "The Planning and Development Authority of Goa is") and the government's/team compounds; all correctly skipped.
- The composed preview stays correct when an old rule's fixes are mixed in ("in order to" → "to", "a large number of" → "many").

---

## 4. Round-2 spec

### 4.1 Must fix (all required for sign-off)

F1–F11 as specified in §3, and the rulings Q1, Q3, Q4 and Q5 in §2. Update `docs/review/round-1-spec.md`'s R5 and R8 text to match the approved narrowings (Q2, Q3).

### 4.2 P1 items now required

The abstract's remaining issues, and the most common academic errors, need these:

| Rule | Why now | Required behaviour |
|---|---|---|
| **R9** serial comma consistency | The abstract mixes styles | As in the round-1 spec, including the tie → serial default and the "Serial comma" setting. On goa: one card, "ecosystem and" → "ecosystem, and". |
| **R10** title capitalisation | The abstract's title has "Power" | As in the spec. On goa: "Power" → "power". |
| **R2b** other correlatives | High-frequency real errors, cheap | neither…or, either…nor, between…or, both…as well as. Each pattern's positive and negative tests from the spec. |
| **R6b** "one of the + singular" | Very common in ESL and Indian English | As in the spec. "It is one of the most important factor." → "factors". |
| **R11** hyphenation | Common in policy prose | (a), (b) and (c) as in the spec. On goa: 0 cards (already correct). |
| **R12** gerund vs infinitive | Common and deterministic | (a) and (c) required; (b) optional. "We look forward to hear from you." → "to hearing"; "They avoided to raise tariffs." → "avoided raising". |
| **R16** redundancy list | Data only | As in the spec. |
| **U3** severity, complete | Half done | Score weights (critical 3, advanced 1.2, style 0.3, advice-only style 0) and a "Critical only" filter chip. |

Still P1 but not required this round: R8(c), R13, R15. P2 is unchanged. The U1 margin marker moves to P2 (Q6).

### 4.3 New fixture and tests

- **`tests/fixtures/stress-clean.txt`** (added by me): 46 correct sentences, one per line, from this review. Many are the exact inputs behind F1–F10. Test it **line by line** with default options and again with `{ domain: 'academic' }`. For every line:
  - no `correctness` card;
  - no card from `compound-subject`, `both-and`, `wordy-purpose`, `preposition`, `article-idiom` or `nominalisation`;
  - `list-parallel`, `vague-phrase` and `passive` cards may appear **only as advice** (`fixes.length === 0`) or, for passive under the default domain, with the "we" option only. **No fix anywhere may contain "Someone", "unprecedents", "unaffects", "unmatches", "able to rise", "able to catch", "able to vary", "to respect to", "In rising" or "demand for power plants".**
- **Add to `tests/round1.test.js` (or a new `tests/round2.test.js`):**
  - F3: "similar with respect to cost" gives no card. "The two plans are similar with ours." → "similar to".
  - F4: "Solar is cheap, modular, and can scale quickly." → "able to scale". "Old cables are dangerous, unreliable, and can catch fire." → advice only.
  - F5: "The demand of power is rising." → "demand for". "The demand of power plants for coal is falling." gives no card.
  - F6: "In the context of rising demand, Goa must act." → advice only.
  - F7: "We need funds for the implementation of the policy." → "implementing". "Delays in the implementation of the scheme raised costs." → "implementing". "The book is about the development of the city." gives no card. "Costs fell by the reduction of losses." gives no card. "Investors plan the expansion of the port." → "how to expand".
  - F8: both "each are" sentences give no card. "Each of the states are different." → still flagged.
  - F1: the four un-/mis- sentences offer no rewrite. "The report was written by the policy team." → still "The policy team wrote the report."
  - Q1: a composed preview with one extra outside word fails `checkFix`.
  - Q4: "The report covers tariffs. The report was long, and the report had errors. We sent the report back." gives ≥ 1 repetition card. goa-abstract.txt still gives 0.
  - F9 and F11: the positive and negative cases in the table.
  - Every P1 rule in §4.2: all positive and negative cases from the round-1 spec.

### 4.4 Updated acceptance criteria (round 2)

- **B1** A1–A10 still pass.
- **B2** On goa-abstract.txt (default options), the round-1 cards are unchanged, **plus** "Power" → "power" (R10) and "ecosystem and" → "ecosystem, and" (R9). Total cards ≤ 14.
- **B3** clean-academic.txt: 0 suggestions under all option sets (unchanged).
- **B4** stress-clean.txt passes the line-by-line rules in §4.3 under default and academic.
- **B5** All new tests in §4.3 pass. The full suite passes.
- **B6** Every fix produced on goa, clean-academic, stress-clean and all positive cases passes `checkFix`. The only new vocabulary is in `src/engine/data` lists.
- **B7** `rule-info` has entries for R2b, R6b, R9, R10, R11, R12 and R16.
- **B8** Performance: 2,000 words p95 < 50 ms.
