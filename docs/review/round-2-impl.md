# Round 2: implementation notes

Implementer's report against `docs/review/round-1-review.md`. `node --test tests/*.test.js` gives **126 pass, 0 fail**: the 99 from round 1 plus 27 new in `tests/round2.test.js`. `node --check` passes on `src/app.js` and `src/editor.js`. Nothing is committed.

## Findings

| # | Status | What changed |
|---|---|---|
| F1 passive non-words | **Done** | (a) A participle starting with "un" is skipped unless it is in `UN_VERBS`, the whitelist in `usage-lists.js`. The skip happens both in the passive rule (`clarity.js`) and in `passiveToActive`. (b) Added misplaced, comprised, unprecedented, unmatched, unaffected, unexpected, unexplained, unknown and unresolved to `ADJECTIVE_PARTICIPLES`. (c) `passiveToActive` offers a rewrite only when `baseForm(participle)` is in `BASE_VERBS` or the participle is in `IRREGULAR_BASE`. To keep existing rewrites working, `BASE_VERBS` grew by about 150 common regular verbs (approve, praise, waive …). The four sentences in your finding now get no card. "The report was written by the policy team" and "The plan was undermined by the board" still rewrite. |
| F2 academic passive | **Done** | Under academic or technical, passive cards are severity style and advice only, except "Rewrite with 'we' as the actor" when the writer uses "we". I read "advice only" literally, so the rewrite that uses a named "by" agent is also withheld under these two domains. **See question 1.** |
| F3 "similar with respect to" | **Done** | Every COLLOCATIONS row skips when the next word is respect, regard, regards or reference. R7's with regard to / with respect to / in relation to are also skipped right after an adjective. Otherwise "similar with respect to cost" got a vague-phrase card offering "similar on cost". |
| F4 epistemic "can" | **Done** | "able to {verb}" is offered only for `CAPABILITY_VERBS`. Otherwise R5 offers "that {modal} {verb}" if the relative condition holds. If not, it's advice. **Advice-only R5 cards are now category clarity, severity style.** B4 forbids correctness cards on the stress lines but allows list-parallel advice, and the two only agree if the advice isn't a correctness card. |
| F5 "demand of power plants" | **Done** | Skips when the listed noun is followed by one of the head nouns or by a plural-looking word, or when "for" follows within 4 tokens. |
| F6 "in the context of" | **Done** | Advice only, with its own message. |
| F7 R8(a) | **Done** | (a) now covers only "for" and "in". The ergative nouns development, expansion, transformation, integration, reduction and improvement are excluded from (a) but stay in (b). |
| F8 "of each are" | **Done** | `grammar.js` agreement skips each/either/neither right after of/for/to/from/in/on/by/with/among/between. "Each of the states are different." is still flagged. |
| F9 binomials | **Done** | Added coming and going, toing and froing, ebb and flow, rise and fall, pros and cons. wear and tear and give and take were already in the list. |
| F10 / Q4 topic terms | **Done** | The topic-term rule applies only to documents of 150+ words. The title, Keywords and repeated-bigram protections apply at every length. |
| F11 R1 coverage | **Done** | The R1 opener also accepts His/Her/My/Your. Its/Their/Our were already there. Added takes, makes, reflects, determines, affects, shows, varies, includes, provides, creates and means; depends was already there. Added "knowledge" to `NOUN_LIST`, without which "knowledge and experience" isn't recognised as a compound subject. The new bases go into `USAGE_INSERTS`: "vary" is not provably a form of "varies" under the guard's typo rule. |

## Rulings

| | Status |
|---|---|
| Q1 `maxGrowth` | Kept. Only `composeSentence` passes it, the value is the sum of the component growths (never below 4), and remote fixes ignore it. New test: a composed preview with one extra word ("giraffe") fails with `adds outside word "giraffe"`, even at the raised limit. |
| Q2 | `round-1-spec.md`'s R5 and R8 text is updated, with the old R8 positive "by the reduction of losses" struck through and replaced. |
| Q3 | As F7. |
| Q4 | As F10. |
| Q5 | As F8. |
| Q6 margin marker | Deferred, as ruled. |

## Required P1 items

| Rule | Status | Notes |
|---|---|---|
| R9 serial comma | **Done** | `rules/usage2.js`. Lists have ≥3 items. An item before the last has ≤6 tokens, the last has ≤10, and an item may not contain a pronoun, be/modal/have/do, a past-tense verb, an -ing verb, a third-person -s verb, or both/either/neither/between. The first item may drop a leading preposition or participle, or fall back to the noun phrase after the verb ("We need **land**, water, and labour"). In auto mode the minority style is flagged, and a tie flags the open lists. New setting "Serial comma: auto / always / never". On goa: one card, "ecosystem and" → "ecosystem, and". |
| R10 title capitalisation | **Done** | As specified. Proper nouns, meaning words the body capitalises mid-sentence such as "Goa", are left out of the 70% ratio. Without that, the goa title is 67% lowercase and wouldn't count as sentence case. On goa: "Power" → "power". A heading needs ≥2 counted words. |
| R2b correlatives | **Done, one is advice only** | either…nor → "or", between…or → "and", both…as well as → "and". **neither…or is advice only**: the guard counts "nor" as a negation and won't let a fix add one, and I didn't loosen that. **See question 2.** "not only … but" (in the round-1 table) isn't done; the review lists only these four patterns. |
| R6b one of the + singular | **Done** | The head noun is a `COUNT_NOUNS` word, or matches the noun suffix or noun list without matching the adjective suffix. -s, -est, -ing, -ly and `UNCOUNTABLE` words are excluded. |
| R11 hyphenation | **Done** | (a), (b) and (c). Extra guard: in "The long term looks bright", where a determiner comes before and an -s word after, the -s word may be a verb, so it's skipped. A following -ed word is never treated as the noun. The guard accepts joining or splitting the writer's own words with a hyphen ("long term" ↔ "long-term"), and only words whose parts are all in the replaced span. On goa: 0 cards. |
| R12 gerund vs infinitive | **Done: (a) and (c)** | (b) is optional and not done. I left keep, mind, risk and delay out of `GERUND_VERBS`: "keep to the schedule" would become "keep scheduling", and "a delay to work" is a noun use. A verb directly after a determiner is skipped. After the "to"-frames ("in addition to", "key to" …), words that are just as often nouns (`NOUN_VERBS`: cost, plan, design …) are skipped, so "In addition to cost" is left alone. |
| R16 redundancy | **Done** | `REDUNDANCY` in `lists.js` (26 pairs) plus "in the year 2020" → "in 2020". It shows as rule `redundancy` with its own rule-info entry, and it's in the guard's closed vocabulary like `WORDY`. |
| U3 severity | **Done** | `src/engine/severity.js`. `score.js` weights critical 3, advanced 1.2, style 0.3, and a style card with no fix 0. There's a "Critical only" chip above the cards, and the score header shows "N suggestions · x critical · y advanced · z style". |

## Two guard changes for the PhD

Both are ways of recognising a word as one of the writer's own. The negation, AI-word, em-dash, AI-phrase, closed-vocabulary and remote checks are untouched.

1. **Silent-e inflections**: raise ↔ raising, store ↔ storing. The old typo-distance rule rejected these for short verbs, so "avoided to raise" → "avoided raising" was dropped.
2. **Hyphen join and split**: "long-term" is accepted when "long" and "term" are both in the replaced span. "highly skilled" is accepted when the span was "highly-skilled". The AI-word check runs first.

## Other changes worth knowing

- **The passive "someone" template is now off by default.** The B4 stress list forbids "Someone" in any fix, under the default domain too, and none of the stress passives has a principled marker that would separate it from ordinary prose. It's still available with the engine option `passiveTemplate: true`; `passiveToActive` itself is unchanged and `rewrite.test.js` still covers it. **I changed one existing assertion** in `tests/engine.test.js`, the "Payments were made late" case. It now asserts no fix by default, and the original "Someone made payments late" plus the selection test run with `passiveTemplate: true`. That's the only edit to a pre-existing test's expectations apart from the round-1 test file.
- In the N4 test in `round1.test.js`, the serial-comma card is allowed to span "ecosystem and". It inserts a comma; it doesn't flag the word.
- I re-ran the browser check in the preview pane: 14 cards on goa, the header shows "2 critical · 5 advanced · 7 style", "Critical only" shows 2 cards, and "Serial comma: never" flips the card to "potential, and → potential and". No console errors from the current code.

## goa-abstract.txt, before and after (default options)

**Before (round 1): 12 cards.** compound-subject "is"→"are" · plain-word "demonstrates"→"shows" · long-sentence ×3 · article-idiom "a"→"the" · both-and · wordy-purpose "aims to identify" · vague-phrase "in terms of" (tip) · preposition "suitable for"/"suited to" · list-parallel "able to support"/"that can support" · nominalisation "how to decarbonise".

**After (round 2): 14 cards**, the same 12 plus:

| Rule | Severity | Original | Fix |
|---|---|---|---|
| title-case | style | Power | power |
| serial-comma | style | ecosystem and | ecosystem, and |

With `{ domain: 'academic' }` there are 11 cards: no plain-word card and one long-sentence card. clean-academic.txt has 0 under 5 option sets. stress-clean.txt passes B4 under default and academic. The only cards on it are passive advice (5 lines), list-parallel advice (3) and vague-phrase advice (1), all with no fix.

With every change ticked, including the style-severity serial comma, U1 on the 52-word sentence gives exactly the spec string ("…ecosystem, and … comprising the bulk (80 per cent)…").

## Acceptance criteria

| | Status |
|---|---|
| B1 A1–A10 | Pass (`round1.test.js`) |
| B2 round-1 cards plus R10 and R9, ≤14 | Pass, exactly 14 |
| B3 clean-academic 0 | Pass under 5 option sets |
| B4 stress-clean line by line | Pass under default and academic, with every forbidden string checked |
| B5 new tests and full suite | 126 of 126 |
| B6 every fix passes `checkFix` | Pass: raw rule output and shown cards on goa, clean, the 46 stress lines and 21 positive cases, each under 4 option sets |
| B7 rule-info for R2b, R6b, R9, R10, R11, R12, R16 | Pass |
| B8 2,000 words p95 < 50 ms | Pass: p95 ≈ 4.4 ms locally |

## Open questions

1. **F2:** should the "by" agent rewrite ("The data were collected by the team" → "The team collected the data") stay available under academic? I withheld it, reading "advice only" literally.
2. **neither … or:** fixing it needs the guard to let "or" → "nor" through, and the guard counts "nor" as an added negation. Allow this one swap only when the sentence already has "neither"? It's a scoped exception to the negation check, so it's your call. Until then it's advice.
3. **"Someone" off by default:** do you agree with removing it globally rather than per domain? The alternative is a user setting.
4. **R9 heuristics** are deliberately conservative: a list item containing a third-person verb or an -ing verb ends the list. That's what keeps "this paper examines the pathway, considering both a centralised and …" out of the goa count. Expect some misses on lists like "costs, plans and needs", where the plural nouns look like verbs.
5. **R10** treats any 2–20-word line with no full stop as a heading. Email openers like "Dear Sir" and "Hi team" produced no cards in probes, but lists of short items without full stops could.
