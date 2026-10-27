# Round 6: implementation notes

Implementer's report against `docs/review/round-6-spec.md`. `node --test tests/*.test.js` gives **182 pass, 0 fail, 1 todo**: the 159 earlier tests plus 23 in `tests/round6.test.js`. The todo is the one unbuilt P1 key entry (BE15). `node --check` passes on `src/app.js` and `src/editor.js`. Nothing is committed.

## Architecture

| File | Role |
|---|---|
| `src/engine/guidance.js` (new) | `runGuidance(text, opts)` → findings `{ rule, group, level, title, message, start, end, original, instances: [{start,end,original,fixes}] }`, sorted in the panel's group order. Instance fixes pass `checkFix`, using `docVariant` for consistency rules. Pure; it doesn't touch the inline pipeline. |
| `src/engine/rules/document.js` (new) | D1–D6, D8a and D3b. `analyseDocument(text, opts)` returns `{ inline, findings }` and memoises the last call, so `runChecks` and `runGuidance` share one pass. |
| `src/engine/sections.js` (new) | Section model: title, headings (including one-word section names such as Abstract/Methods), abstract scope (Abstract or Executive summary up to the next heading), Keywords line, email header lines, salutation, sign-off block and everything after it, list items, reference lines, blank-line blocks. |
| `src/engine/data/document-lists.js` (new) | COMMON_ACRONYMS (about 110), UNITS, the -ise/-ize exception list, CLOSED_COMPOUNDS, the number identifier words, STUDY_NOUNS/STUDY_VERBS, claim lists, paragraph limits, the light-verb maps and `LIGHT_VERB_INSERTS`. |
| `src/engine/rules/usage3.js` (new) | P1 inline rules R14a and IE1, plus `REGISTER_INSERTS`. |
| `src/engine/compose.js` | `composeFixes`: "Make consistent" as one edit. |
| `src/engine/guard.js` | `docVariant` (below), plus `LIGHT_VERB_INSERTS` and `REGISTER_INSERTS` in the closed vocabulary. |
| `src/app.js`, `src/editor.js`, `index.html`, `styles.css` | Guidance tab and panel, instance highlighting, "Make consistent". |

`runChecks` adds the document rules' inline cards: D1 minority instances, D3a, D2.3, D6.1, D5 advice and D3b minority dates. The panel shows the grouped findings and doesn't duplicate the cards.

## Per-item status

| ID | Status | Notes |
|---|---|---|
| B1 | **Done** | R1 now also tries the subject pattern after `, and/but/while/whereas`, after `;`, and after because/although/though/since/whereas/while/if/when/that, with lowercase determiners. Added deters, delays, raises, limits and drives to the verb list. Added size, age, shape, type, number and quality to the noun list, so "the size and age of" counts as a subject. All 4 positive and 7 negative cases pass. |
| B2 | **Done** | INF_VERBS in all inflections + an -ing form whose base is a known verb + an object (a determiner, plural noun, number or name). **One deviation:** the spec puts "offering" in ING_NOUNS, but its own positive case is "decided offering a smaller subsidy". So an ING_NOUNS word counts as a verb only when a determiner follows: "agreed pricing rules" is skipped, "decided offering a subsidy" is fixed. All 4 positive and 5 negative cases pass. |
| B3 | **Done** | Light verb (any form, including "carry out") + a/an/the + NOM + "of", plus the fixed pairs (give/provide a description/an explanation of, have/hold a discussion about/on, take a decision on). The tense follows the light verb; after has/have/had/been the fix is the past participle. "analyse" becomes "analyze" under US. I removed WORDY's old "conduct an analysis of → examine", which changed both the verb and the tense. All 5 positive and 4 negative cases pass. |
| B4 | **Done** | R13 as specified. It also skips when a collective noun directly follows the antecedent ("the state government … their"). "they" gets advice only, because the verb would also need changing. All cases pass. |
| D1.1 | **Done** | Counts all spelling-family words: SPELLING pairs, generic -ise/-ize words (with an exception list, counted only when sure: -isation forms, or the counterpart or a sibling is in the document) and generic -elled (UK only, counted but never "fixed"). The majority wins; an explicit dialect setting overrides; a tie gives advice. Spans the existing `dialect` rule already flags are deduplicated by the overlap merge, and the critical `dialect` card wins. |
| D1.2 | **Done** | Hyphenated pairs found in the body, compared against the same pair open (attributive uses only, with the noun-like test) and against CLOSED_COMPOUNDS. The majority wins; a tie goes to hyphenated, or to the closed form for dataset/email/… The Keywords line is checked but not counted. |
| D1.3 | **Done** | Mid-sentence runs of 1–4 capitalised words versus the same words in lowercase. Never sentence-initial, never after a colon. Skipped: label words followed by a number ("Table 2"), names in `PROPER_TERMS`, all-caps words. A tie goes to lowercase. Headings, title, header lines, Keywords line and sign-off are exempt. |
| D1.4 | **Done** | per cent vs percent: the majority gets a fix. "%" against a spelled form: advice unless one has 3× the uses of the other. A parenthesis holding only the figure and table lines are exempt. |
| D2 | **Done (D2.1–D2.3)** | Token test, whitelist, units, Roman numerals, personal dictionary (passed from the app) and stopwords in capitals ("NOT") are all applied. Both definition patterns use initials matching in which minor words can be skipped or supply a letter ("MoP"). The abstract scope is separate. **Deviation:** only "Abstract" and "Executive summary" open a separate scope, not "Summary". The policy-brief key (PB1 is acronym-before-definition, not undefined) and its clean version (GED defined in the Summary, used later in the body) both need the Summary to share the body's scope. D2.4 (P1) is not built. |
| D3a | **Done** | Running text only; dates, decimals, identifier words, phone-like digit groups and years from 1000 to 2100 are skipped. Grouping: Indian vs international (6+ digits), with 4–5-digit numbers neutral. Separator: a tie goes to separators, using the document's grouping system. All negatives pass. |
| D4 | **Done** | Study subject (this/the + STUDY_NOUNS, or an unquoted "we"), an optional coordinated noun ("the approach and framework"), adverbs, then a verb classified as future, completed or present. **Addition:** the verb must be in `STUDY_VERBS` (examine, use, help, estimate, …). Without that, goa's "However, this approach continues the state's dependency" is counted as a study verb, and F5's exact instance list fails. A finding needs future plus non-future in the same scope, with 3 or more verbs. |
| D5 | **Done** | All five pattern families with their conditions. On under academic, technical or business domain, a formal goal, or `opts.evidenceChecks`. **Addition:** "clearly" after is/are/was/were is skipped when a participle follows ("are clearly labelled", the spec's own negative). |
| D6 | **Done** | **Paragraph = a body line.** goa's two paragraphs are separated by a single newline, and the spec counts them as 159 and 84 words. A hard-wrapped continuation (the next line starts in lowercase) joins the line before, so wrapped text isn't flagged line by line. D6.1 is an inline critical card with fix "word." (or replaces a trailing , or ; with "."). It only fires on paragraphs ending in a word, never in a number or symbol. D6.2 and D6.3 as specified. |
| D8a | **Done** | Stems as specified (first 6 letters after suffix stripping), with hyphen parts split. All stems must occur in one body sentence. |
| G1 | **Done** | See the browser check below. |
| G2 | **Done** | `rule-info` entries for all 16 new P0 rule ids and the 3 P1 ids built. |
| N6 | **Done** | obtain/obtained/obtains removed from PLAIN_WORDS. |
| N7 | **Done** | Header lines are never headings: the title-case rule, the R2b heading skip and the section model all exclude them. |

### Guard: `docVariant`

`DOC_VARIANT_RULES` = consistency-spelling, consistency-hyphen, consistency-case, consistency-percent, number-grouping, number-separator and date-format. For those rule ids only, and never for remote fixes, an added word that isn't in the span, in CLOSED or a form of the writer's words is allowed only if it occurs as a token elsewhere in the document. The AI-word check runs first (and the negation check before it). The em-dash, growth and AI-phrase checks are unchanged.

Numbers aren't word tokens, so regrouping ("120,000" → "1,20,000") passes without any special case.

Tests cover the cases:
- "per cent" when "cent" is in the document: passes.
- "per mille": rejected.
- "per cent" when "cent" is nowhere else: rejected.
- AI word ("robust") and negation ("not done"): rejected even with `docVariant`.

`composeFixes` checks every fix on its own, then the composed range with `maxGrowth` = the sum of the parts. A one-line comment notes this second use of `maxGrowth`, which the round-2 ruling had limited to `composeSentence`; the spec's G1 asks for it.

## Acceptance criteria

| | Result |
|---|---|
| F1 No regressions | **Pass.** 159 of 159 earlier tests are unchanged and green. goa gives the same 14 cards and first fixes (asserted). clean-academic gives 0 cards. stress-clean 1–4 still pass their round tests. |
| F2 Recall | **Pass.** Every P0 and "existing" mustFlag entry in all four keys is satisfied (44 + 4), driven by the key files (`tests/round6.test.js`). |
| F3 Precision | **Pass.** No mustNotFlag is violated, and there is no correctness card outside the answer key on the four errors fixtures. |
| F4 Clean silent | **Pass.** The four clean fixtures under key options and default options give 0 correctness cards, 0 guidance findings and no card with a fix. The only card left is exec-summary's "is projected" passive advice, which is allowed. clean-academic gives 0 and 0 under default, academic, and academic/formal/confident. |
| F5 goa guidance | **Pass.** Exactly one finding, `study-tense`, with instances "examines", "will use", "is aimed", "will also help", under default and academic, and no unsupported-claim card. |
| F6 Unit tests | **Pass.** Every positive and negative in §3 for B1–B4, D1–D6, D8a, N6 and N7 (D1–D6 positives come through the keys). |
| F7 Guard | **Pass.** `docVariant` tests as above. Every fix on all 8 fixtures passes `checkFix`. "Make consistent" composes one passing edit (per cent example, plus every multi-fix finding on policy-brief). |
| F8 Explanations | **Pass.** Data is tested. The browser check is described below. |
| F9 Performance | **Pass.** `runChecks` + `runGuidance` on about 2,050 words: p95 ≈ 14 ms (policy-brief repeated); about 12 ms for goa repeated. |
| F10 P1 | **Partial.** Built: IE1 `register-in` (BE9, BE10, BE13, BE16 pass), R14a `intro-clause-comma` (BE12 passes), D3b `date-format` (BE5, BE6 pass). F3 and F4 still hold. **Not built:** BE15 (see open question 1), D1b, D2b, D7, D8b, B6, B7. |

## Before and after per fixture (key options)

| Fixture | Before (round 5): cards | After: cards / guidance findings | Seeded items caught |
|---|---|---|---|
| policy-brief.errors | 0 | 13 / 10 | 15 of 15 P0 |
| business-email.errors | 5 | 13 / 6 | 4 P0 + 4 existing + 7 of 8 P1 |
| methods.errors | 3 (passive) | 8 / 9 | 12 of 12 P0 |
| exec-summary.errors | 1 (passive) | 11 / 7 | 13 of 13 P0 |
| each *.clean | 0–1 advice | 0–1 advice / 0 | n/a |

After, in detail:
- **policy-brief.errors:**
  - Cards: consistency-case "State Government"→"state government"; unsupported-claim "It is well known that" and "significantly" (advice); compound-subject "has"→"have"; pronoun-agreement "their"→"its"; nominalisation "conduct an assessment of"→"assess"; number-grouping "120,000"→"1,20,000"; paragraph-end "billing"→"billing."; consistency-percent "percent"→"per cent"; verb-pattern "decided offering"→"decided to offer"; consistency-spelling "decarbonization"→"decarbonisation"; consistency-hyphen "net metering"→"net-metering"; acronym-redefined "Goa Electricity Department (GED)"→"GED".
  - Guidance: the 4 consistency sets, GED before definition, GED redefined, number grouping, claims, same start ("The department" ×3), missing full stop.
- **business-email.errors:**
  - Cards: agreement; passive advice; register-in "as per"/"Kindly"/"do the needful"/"prepone"; date-format "June 3"→"3 June"; one-of-plural; paragraph-end "attached."; preposition "discuss about"; intro-clause-comma "figures,"; wordy "revert back"; consistency-case "Substation Upgrade"→"substation upgrade".
  - Guidance: per cent advice (6% vs 2 per cent), case set, BOQ undefined, date format, numeric date advice, missing full stop.
- **methods.errors:**
  - Cards: number-separator "2450"→"2,450"; verb-pattern "managed to collect"; compound-subject "was"→"were"; consistency-hyphen "smart meter"→"smart-meter"; claims "Clearly", "Several studies have shown"; 2 passive cards.
  - Guidance: per cent advice, hyphen set, GED before definition, ACs undefined, separators, claims, "We" ×4, study-tense (will match / managed / asked / used), keyword "heat stress".
- **exec-summary.errors:**
  - Cards: claims "Studies show", "massive", "Undoubtedly"; nominalisation "evaluate"; verb-pattern "refused to raise"; compound-subject "depend"; pronoun-agreement "its"; acronym-redefined "DSM"; consistency-case "net-metering"; paragraph-end "law."; passive advice.
  - Guidance: case set, MoP undefined, DSM redefined, claims, long paragraph (191 words > 150), "The state" ×3, missing full stop.

## Browser check (F8)

I ran the app in the preview pane and pasted policy-brief.errors.txt into a document.
- **Tab and header:** the Guidance tab shows 9, and the header reads "11 suggestions · 2 critical · 3 advanced · 6 style · Guidance: 9 document notes". The default domain has evidence checks off, so the D5 cards don't appear.
- **Sections:** Consistency, Acronyms, Numbers and Structure appear in the fixed order. Empty sections are hidden.
- **Opening a finding:** opening '"per cent" (2) vs "percent" (1)' showed the message, the "Why?" explanation with its ✗/✓ example, and three instance rows with about 30 characters of context either side and the instance in bold. The minority row carried "→ per cent", and the three instances got a soft background in the editor; the glyphs didn't change.
- **Jump and Make consistent:** clicking a row selected the instance in the editor. "Make consistent (1)" changed "20 percent" to "20 per cent", and a single Ctrl/Cmd+Z restored the original text exactly. The toast read "Made 1 change. Ctrl/Cmd+Z undoes them all."
- **Console:** no errors.

## Open questions

1. **BE15 ("revert" → "reply" as `register-in`)** overlaps BE14's existing `wordy` card on "revert back". The overlap merge keeps only one word-level card, and the key needs both rule ids on the same span. I left BE14 as is. A standalone "revert with/to me/at the earliest" does get the register-in card. Options: let both rules' fixes appear on one card (a contract change), or accept "reply" as a second fix on the wordy card.
2. **D2 scope for "Summary".** I treat only Abstract and Executive summary as separate acronym scopes, because the policy-brief key needs the Summary to share the body's scope. Please confirm, or change the key.
3. **D6 paragraph = line.** This follows the spec's own word counts for goa. A document that hard-wraps lines starting with a capital letter (rare outside poetry or code) would see each line judged separately.
4. **D4 `STUDY_VERBS`.** This is a fixed list of verbs that describe what a study does. Without it, "this approach continues …" counts as a study verb. A study verb missing from the list is a miss, not a wrong finding.
5. **Generic -ise/-ize detection** is deliberately conservative (it needs -isation forms, a counterpart, or a sibling in the document) and has an exception list (advise, comprise, revise, size, …). -our/-or and -re/-er rely on the existing SPELLING pairs only.
