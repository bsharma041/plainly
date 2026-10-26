# Round 1: implementation notes

Implementer's report against `docs/review/round-1-spec.md`. Tests: `node --test tests/*.test.js` gives **99 pass, 0 fail** (the original 69 plus 30 in `tests/round1.test.js`). `node --check` passes on `src/app.js` and `src/editor.js`. Nothing is committed.

## What changed, file by file

| File | Change |
|---|---|
| `src/engine/rules/usage.js` (new) | R1–R8, registered in `index.js` |
| `src/engine/data/usage-lists.js` (new) | Every list in §3.0 and every rule table: COLLOCATIONS, ARTICLE_IDIOMS, WORDY_ADVICE, PURPOSE_PHRASES, NOMINALISATIONS, BASE_VERBS (~480 verbs), UNIT_BINOMIALS, PLURAL_VERB, IRREGULAR_PLURAL, and `USAGE_INSERTS` (every word a usage rule can add) |
| `src/engine/data/rule-info.js` (new) | `{ name, explanation, example: { wrong, right } }` for every P0 rule and the main existing rules |
| `src/engine/compose.js` (new) | U1: `sentenceGroups`, `composeSentence`, `applyFixes` |
| `src/engine/morph.js` | `baseFromIng`, `pluralize`, `pluralVerb` |
| `src/engine/guard.js` | Adds `USAGE_INSERTS` and every NOMINALISATIONS form to the closed vocabulary. New option `maxGrowth`, used only by the composed sentence preview (see "For the PhD" below). Negation, AI-word, em-dash, AI-phrase and remote checks are unchanged. Remote fixes always keep the +4 limit. |
| `src/engine/index.js` | Registers usage rules. Adds `severity` and `ruleName` to every suggestion. `mergeSuggestions` ranks overlaps by severity, then category (U5). `effectiveOptions` applies the domain (U4). Adds the N2 long-sentence hint. New exports. |
| `src/engine/rules/engagement.js` | N1 repetition: protected words, a 40-word window, one card per word per paragraph, severity style, `repetition: false` switch |
| `src/engine/rules/clarity.js` | `plain-word` and `long-sentence` get severity style |
| `src/engine/rules/correctness.js` | `wantsAn` is now exported |
| `src/app.js`, `index.html`, `styles.css`, `src/editor.js` | U1 panel, U2 card anatomy, U4 domain wiring, settings for the repetition check and for checks turned off from a card, severity underline styles |

## Status per spec item

### Rules (P0)

| Item | Status | Notes |
|---|---|---|
| R1 compound-subject agreement | **Done** | All 5 positive and 9 negative cases pass. The opener is stripped only if the bare pattern fails, so a comma inside the subject NP still aborts. |
| R2 both … and | **Done** | All 3 positive and 6 negative cases pass. Extra guard: no card if g4 is followed by another lowercase content word, so "both an urban and rural school system" doesn't become "schools system". |
| R3 "be aimed at V-ing" plus the phrase table | **Done** | All 5 positive and 4 negative cases pass. The passive rule stays off this span (N5, tested). |
| R4 preposition table (29 rows) | **Done** | All 8 positive and 9 negative cases pass. Extra guards: "consistent to **within**", "impact/effect over **time/the/years…**", "supply and **demand of** electricity" (skips after and/or). The "demand of" span is "demand of" only, so the fix is exactly "demand for", as the spec says. Row 29 ("different than") is advice only, under UK or auto-detected UK. |
| R5 list parallelism | **Done, one deviation** | All 3 positive and 5 negative cases pass. Deviation: fix 2 ("that can …") is offered only when "that"/"which" comes **directly** before the be-verb. The spec says "within 6 tokens", but then "The results suggest **that** the plan is cheap, quick to build, and will last decades" got "that will last", because that "that" is a complementiser. With the change, that sentence gets advice only. |
| R6 fixed article idioms | **Done** | All 4 positive and 5 negative cases pass. "a bulk (80 per cent) of" underlines only "a" → "the". Plain "a bulk of" → "the bulk of". |
| R7 vague phrases | **Done** | All positive and negative cases pass, plus a "with respect to x" (maths) guard. "it is clear/evident that" runs only under a formal goal or the academic domain. |
| R8 nominalisation (a) and (b) | **Done, two deviations** | All 3 P0 positive and 5 negative cases pass. Deviations: (a) leaves out **before/after/without**, because "After the introduction of the tax, prices rose" → "After introducing the tax, …" creates a dangling modifier. (b) leaves out **learn/understand**, because "learn the development of language" → "learn how to develop language" changes the meaning. (b) keeps plan/decide. "analysis" uses "analyze" under US or auto-detected US. |
| R8 (c) light verb + NOM | Skipped | P1 |

### UI (P0)

| Item | Status | Notes |
|---|---|---|
| U1 Improve this sentence | **Done, except the margin marker** | A chip "{n} fixes in this sentence" sits on the first card of each sentence that has 2+ composable fixes. It opens a panel at the top of the card list with: a "Rule-based ⓘ" tag (its tooltip has the U7 text); the label "Built from {n} rule fixes in this sentence. No new wording."; a diff via `diffHtml`; numbered changes ①②③, each with a checkbox (style severity unticked by default) and an "Open change ②" button; "Accept sentence"; and the sentence-level and advice cards listed under "Also in this sentence, not applied". Accept is one `replaceRange` → one `insertText` over the smallest range covering the ticked fixes. I checked in the browser that one Ctrl/Cmd+Z restores the sentence. If the composed text fails `checkFix`, the preview is hidden and the cards stay. **Not done:** the margin marker in the editor at the sentence start, because adding glyphs to the mirror layer would shift text alignment. |
| U2 card anatomy | **Done** | The header shows the dot, before→after and the **ruleName**. The body has the title, message, a "Why?" `<details>` with the name, explanation and "✗ wrong → ✓ right", the fix buttons (first is primary), a "Tip, no automatic fix" tag on advice-only cards, Dismiss, and **Turn off this check**. Turned-off checks are listed in Settings and can be turned back on there. The popover uses the same body. |
| U4 domain wiring | **Done** | `engineOptions()` passes `domain` and `repetition`. For academic and technical: no repetition, no plain-word, long-sentence limit = max(limit, 38). There is a "Repetition check" toggle in Settings. The "Serial comma" setting is waiting on R9 (P1). R17/R21/R22 are P2. |
| U5 one card per issue | **Done** | R2 is one card. Repetition gives at most one card per word per paragraph. Overlapping word-level cards are ranked by severity before category (tested). |

### Noise removal

| Item | Status | Result on goa-abstract.txt |
|---|---|---|
| N1 repetition | **Done** | 0 repetition cards. "power" is protected by the title, the Keywords line and the bigrams "power sector"/"thermal power". "states" is protected by the bigram "resource-constrained states" ×2 and the topic-term rule. Bigrams count only pairs of two non-stopwords, so "the report" doesn't protect "report". |
| N2 long sentence | **Done** | Severity style. The limit is 38 for academic or technical (expert was already 38). When a long sentence with no split option has 2+ fixes inside, the message points to "Improve this sentence". 3 cards under default options, 1 (the 52-word sentence) under academic. |
| N3 plain-word | **Done** | Off for academic and technical. Severity style. 1 card under default options, 0 under academic. |
| N4 "ecosystem" | **Done** | No rule flags the writer's own use. Regression test covers 4 option sets. |
| N5 passive vs R3 | **Done** | Only R3 fires on "is aimed at identifying". |

### Acceptance criteria

| | Status | Test |
|---|---|---|
| A1 Grammarly overlap 8/16 with exact first fixes | Pass | `A1` |
| A2 "a bulk" → "the" | Pass (P0 part) | `A2` |
| A3 0 repetition cards, ≤14 total | Pass (12) | `A3` |
| A4 0 suggestions on clean-academic, default and academic/formal/confident at both audiences. Spec negatives: target rule silent, no correctness card | Pass | `A4` and every `… negatives` test. Exception: `sentence-case` is ignored on the spec's lowercase fragments ("the dependence of Goa on imports"), because those aren't sentences. |
| A5 every P0 positive and negative case | Pass | R1–R8 tests |
| A6 every usage fix passes `checkFix`, none dropped | Pass | `A6` runs the raw `usageRules` output (goa, clean, guard SAMPLE, 29 positive cases × 3 option sets) through `checkFix`, and checks that the shown cards keep every fix |
| A7 composed preview equals the U1 string, order-independent | Pass | `A7` (all 6 orders, plus the single-edit equivalence and the untick case). One undo step checked by hand in the browser. |
| A8 rule-info for every P0 rule | Pass | `A8` checks the data. Rendering checked by hand in the browser. |
| A9 academic domain: no repetition or plain-word | Pass | `A9` |
| A10 2,000 words p95 | Pass | ~2,100 words of the abstract repeated: p95 ≈ 4 ms locally (the test threshold is 150 ms) |

### P1 items done because they were trivial

- U3, partly: every suggestion carries `severity`, and underlines are solid (critical), dashed (advanced) or dotted (style). Score weights and the "Critical only" filter are not done.
- U6, partly: `article-idiom` joins "Accept all". R1, R2, R5 and R8 are kept out.

## goa-abstract.txt, before and after (default options)

**Before: 9 cards**

| Rule | Original | Fixes |
|---|---|---|
| plain-word | demonstrates | shows |
| long-sentence | With limited land resources, … (52 words) | none |
| repetition | states | none |
| repetition ×4 | power | none |
| long-sentence | In this context, … | none |
| long-sentence | The analysis is aimed at … | none |

**After: 12 cards**

| Rule | Severity | Original | Fixes |
|---|---|---|---|
| compound-subject | critical | is | are |
| plain-word | style | demonstrates | shows |
| long-sentence | style | With limited land resources, … | none |
| article-idiom | critical | a (in "a bulk (80 per cent) of") | the |
| long-sentence | style | In this context, … | none |
| both-and | advanced | both a centralised and decentralised approach | both centralised and decentralised approaches · both a centralised and a decentralised approach |
| long-sentence | style | The analysis is aimed at … (message points to Improve this sentence) | none |
| wordy-purpose | advanced | is aimed at identifying | aims to identify |
| vague-phrase | style | in terms of | none (tip) |
| preposition | advanced | suitable to | suitable for · suited to |
| list-parallel | advanced | can support | able to support · that can support |
| nominalisation | advanced | the decarbonisation of | how to decarbonise |

With `{ domain: 'academic' }` there are **9 cards**: no plain-word card, and only the 52-word long-sentence card. clean-academic.txt has **0 cards** under every option set tested.

"Improve this sentence" on the analysis sentence gives exactly the U1 string (changes ① aims to identify ② suitable for ③ able to support; "in terms of" and the long-sentence card are listed below the preview).

## For the PhD to look at

1. **Guard `maxGrowth`.** The composed preview is checked with `checkFix` on the whole sentence, with the word-growth limit set to the sum of its parts' growth (never below 4), as U1 asks. Every part has already passed the normal guard on its own. Deep-check (remote) fixes ignore `maxGrowth`. Please confirm this is the intended reading.
2. **The R5, R8a and R8b deviations** described above. I think each one removes a false positive that would introduce a new error, but they narrow the spec.
3. **R8(a) still has control risk** for for/by/in: "Costs fell **by the reduction of** losses" → "by reducing losses" implies the costs did the reducing. It's a card the writer reviews, never auto-applied, and kept out of Accept all. A subject-animacy check is beyond a rule engine. Consider limiting (a) to "for"/"in" in round 2.
4. **N1(c), the topic-term rule (≥4 uses and ≥1% of words)** almost always fires in short texts. A 16-word paragraph using "increased" 4 times gets no repetition card. That's what the spec says, but you may want a minimum document length (for example 150 words) before (c) applies.
5. **Pre-existing false positive, not from this round:** the old agreement rule flags "the cost and timing **of each are** published" ("each are" → "each is"). Left alone. Candidate for round 2.
6. **Fragments in tests.** Many spec examples are lowercase fragments. In a full run, the existing `sentence-case` card at offset 0 wins the overlap. Those positive tests fall back to the rule's own guarded output (`ruleOnly` in the test file). The fixture-level tests (A1–A9) use the full `runChecks`.
7. `BASE_VERBS` deliberately leaves out "approach", "route" and "school". R2 needs g4 not to be a base verb, and "approach" is both a verb and a noun.
8. Browser check: I ran the app locally, loaded the abstract into the preview browser's welcome document (that profile's localStorage now holds the abstract text), and opened, unticked and accepted the U1 panel, undid it, opened the Why? toggle, used turn off/on, and switched the domain. There were no console errors.
