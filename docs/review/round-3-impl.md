# Round 3: implementation notes

Implementer's report against `docs/review/round-2-review.md`. `node --test tests/*.test.js` gives **140 pass, 0 fail**: the 126 from earlier rounds plus 14 in `tests/round3.test.js`. `node --check` passes on `src/app.js` and `src/editor.js`. Nothing is committed.

## Findings

| # | Status | Change |
|---|---|---|
| F1 "be used to" | **Done** | The be-forms are removed from the "to"-frames. Only get/gets/got/become/becomes/became used to remain. "The funds are used to build schools" and "Diesel is used to generate backup power" get no card. To make the required positive "We got used to **work** late" → "working" fire, a word that is also a noun ("work") is accepted only after got/became used to, and only when an adverb or object follows (late, early, more, less, it, them, the, …). "In addition to cost" and "committed to cost recovery" stay quiet. |
| F2 verb-reading hyphens | **Done** | R11 (b): when the head is a past form (led, owned, based, driven, funded, focused, related, linked, connected, constrained, oriented) and a **singular** determiner or possessive comes before N1, the hyphen is offered only if another finite verb follows the noun in the same sentence. A finite verb here is BE, a modal, have/do, an irregular past, or another -ed word. The four sentences in the finding get no card. "The project led changes were welcome" → "project-led". "Community led protests grew" (no determiner) → "Community-led". **Deviation:** plural quantifiers (many, several, two, these, those, all, most …) don't trigger the check, because they can't head a singular subject. Otherwise the round-2 positive "Many resource constrained states struggle" would be lost, since "struggle" isn't in the finite-verb list. Also added project, government, industry, user, donor, citizen and farmer to the R11 (b) noun list, so the review's own "project led changes" example is detected. |
| F3 silent-e | **Done** | Both silent-e branches now need the writer's word to have 4+ letters and not be in `STOPWORDS`. "the" → "thing" is rejected. raise → raising, store ↔ storing and use → using are still accepted. |
| F4 / ruling P agentless template | **Done** | See "Ruling P" below. |
| F5 R9 recall | **Done** | An -s word that ends its list item counts as a plural noun. The first item's noun-phrase fallback also keeps its final -s word ("compare **costs**"). "costs, risks and benefits" → "risks, and". "Costs rose, prices fell and demand grew." stays clean, because the past tenses rose, fell and grew still end the list. |
| F6 R10 headings | **Done** | A line counts as a heading only if it is the first line of the document, or has a blank line (or the start of the text) above and a line of 8+ words below. A run of 3+ consecutive short lines is a list. Tested on a 4-line shopping list ("Bread and Eggs") and a 4-line agenda: no cards. The goa title still gives "Power" → "power". |
| F7 "chaired by" | **Done** | When there is a "by" agent and the participle is a regular -ed form not starting with un/in/dis/mis/non and not in `ADJECTIVE_PARTICIPLES`, the rewrite runs even if the base isn't in `BASE_VERBS`. "The meeting was chaired by the secretary." → "The secretary chaired the meeting." "The tariff is unaffected by the change." still gives no rewrite. |

## Ruling P: agentless passives

- `passiveToActive` has a new `placeholder` option. The passive rule passes `'[who]'`, so "Mistakes were made." → "**[who]** made mistakes.". The fix is labelled "Active-voice template: type who did it", carries `template: true`, and `select` covers `[who]`. The app selects it after Accept, and the toast reads "Type who did it over the selected placeholder".
- Order of options: "we" rewrite first, for writers who use "we"; then a named "by"-agent rewrite if there is one; the template last. The template is never first when another rewrite exists. In the card it renders as a secondary ("alt") button labelled "Use template".
- **Never in Accept all:** eligibility moved into the engine (`src/engine/bulk.js` → `isBulkSafe`, which `app.js` now uses), and it rejects any card with a template fix. **Never in "Improve this sentence":** `sentenceGroups` skips template fixes.
- **Under academic/technical:** the card has severity style and the message "Passive voice is normal in academic writing; use this only if naming the actor helps."; the template comes after "we" when both apply.
- **"Someone"** is gone from every default path. It remains only behind the engine option `passiveTemplate`, which `tests/engine.test.js` uses.
- **The guard** needed no change: `words()` ignores the brackets, and "who" is in the closed vocabulary. Tested.
- **"we" detection, a small extension.** The review's test "We cleaned the data. The data were checked." has only one "We", but the ruling's threshold is two uses. To meet both, a document also counts as written with "we" when a sentence **starts** with "We". I updated the existing assertion in `tests/engine.test.js` ("We made a plan. Payments were made late.") to match: the "we" rewrite is now first, and the `[who]` template and the "Someone" template (behind `passiveTemplate`) are found by their flags, not by position.
- **"Mistakes were made."** used to get no rewrite: a capitalised sentence-initial subject was treated as a possible name. The passive rule now treats a one-word plural subject followed by "were/are/have been" as a common noun. This is done in the rule, not in `passiveToActive`, so the existing `rewrite.test.js` case ("no evidence the capital is not a name") is unchanged.

## Rulings Q1 and Q2

- **Q1 academic agent rewrite: done.** Under academic/technical, "The data were collected by the team." → "The team collected the data." on a style-severity card.
- **Q2 neither…nor: done.** `guard.js` has a named function, `isNeitherNorSwap(text, fix)`. It applies only when the replaced span is exactly "or", the new text is exactly "nor", and the same sentence has "neither" earlier with no "nor" after it. Only then is the negation check skipped. R2b now offers "nor". Tests:
  - allowed: "Neither the state or the centre has acted."
  - rejected: "or" with no "neither" before it
  - rejected: an "or" after an existing "nor"
  - rejected: "or not", "did not approve", "never approved"

## Acceptance criteria

| | Status |
|---|---|
| C1 A1–A10, B1–B8 | Pass. B4's check is updated per ruling P: passive fixes may be the "we" rewrite or a `template: true` fix, "[who]" may appear only in `template: true` fixes, and "Someone" stays forbidden. |
| C2 goa: same 14 cards, no passive | Pass (rule sequence asserted) |
| C3 stress-clean-2 line by line | Pass under default and academic: 0 cards from verb-pattern, hyphenation, one-of-plural, correlative or serial-comma, and no correctness card |
| C4 agentless passives offer "we" or "[who]", never "Someone" | Pass, over both stress files plus 5 extra passives, under default and academic |
| C5 guard | Pass: "the" → "thing" rejected, every added negation rejected except the scoped neither…nor swap, existing guard tests unchanged |
| C6 full suite | 140 of 140 |
| C7 performance | p95 ≈ 5.6 ms for about 2,100 words |

## goa-abstract.txt, before and after

Unchanged: 14 cards. title-case "Power"→"power" · compound-subject "is"→"are" · plain-word "demonstrates"→"shows" · long-sentence ×3 · serial-comma "ecosystem and"→"ecosystem, and" · article-idiom "a"→"the" · both-and "both centralised and decentralised approaches" · wordy-purpose "aims to identify" · vague-phrase "in terms of" (tip) · preposition "suitable for"/"suited to" · list-parallel "able to support"/"that can support" · nominalisation "how to decarbonise". clean-academic.txt still has 0 cards.

## Browser check

In the preview pane, "We cleaned the data. The data were checked. Mistakes were made." gives a passive card with "Accept" (the "we" rewrite, primary) and "Use template" (secondary). Using the template inserts "[who] made mistakes.", selects "[who]" and shows the toast. No console errors.

## Open questions

1. **F2 determiner set.** Limiting the verb-reading check to singular determiners is my addition, made to keep "Many resource constrained states struggle". Please confirm.
2. **"we" detection.** A single sentence-initial "We" now counts as writing with "we". This was needed to meet the ruling-P test with only one "We". If you'd rather keep strictly two uses, that test sentence needs a second "we".
3. **Used-to nouns.** "got used to work late" is caught only through a small list of words that can follow the verb. A bare "We got used to work." stays unflagged: "work" there may be the noun.
