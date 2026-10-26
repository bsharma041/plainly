# Round 4: implementation notes

Implementer's report against `docs/review/round-3-review.md`. `node --test tests/*.test.js` gives **151 pass, 0 fail**: the 140 from earlier rounds plus 11 in `tests/round4.test.js`. No existing test needed changing. `node --check` passes on `src/app.js` and `src/editor.js`. Nothing is committed.

## Findings

| # | Status | Change |
|---|---|---|
| F1 neither … or (High) | **Done** | A new module, `src/engine/neither.js`, holds one function, `neitherPairsWithOr(text, neitherEnd, orStart)`. **Both** the R2b rule (`usage2.js`) and the guard's `isNeitherNorSwap` call it, so the guard exception can never be wider than the rule. It returns true only if all of these hold. (a) "neither" is not a determiner: the next word is a determiner or possessive (other than each/every/no), a pronoun, a capitalised name, or an adjective or participle. "neither of" is excluded. (b) Between "neither" and "or" there is none of `, ; : ( — –` and none of the words but, so, yet, and, because, while, although, which, that, who, whereas or nor. (c) There are 1–8 words between them. The guard also requires the span to be exactly "or" and the replacement exactly "nor", as before. All four of the review's sentences get no card. "Neither the state or the centre has acted." and "The proposal was neither approved or rejected." → "nor". |
| F2 agent post-modifier (High) | **Done** | In `passiveToActive`, when the agent is cut at `AGENT_STOP` and its last word is a participle (-ed, -ing, or a key or value of `IRREGULAR`/`IRREGULAR_BASE`), it isn't cut: the whole remainder becomes the agent. The rewrite is refused if that remainder has a comma, a second "by" or a relative pronoun. "A team based in Delhi wrote the report." / "A society registered under the Societies Act manages the scheme." / "a company owned by the state" → no rewrite / "Two analysts working independently checked the data." (unchanged). |
| F3 coordinated participles (High) | **Done** | `BE P1 and P2` is detected right after the verb group. P2 goes through the same gates as P1: the adjective list, the un-filter, and `BASE_VERBS`/irregular, or the F7 rule when there is an agent. The two active verbs must share their auxiliaries ("built and maintained", "has drafted and approved", "did not build and maintain"); otherwise the rewrite is refused. Three or more participles, or "and" starting a new clause, are refused. The agent rewrite and the `[who]` template take the same path. "The state built and maintained the roads." / "[who] collected and analysed the samples." / "The roads were built and the bridges were repaired." → no rewrite. |
| F4 presentation passives (Medium) | **Done** | No `[who]` template when the tail starts with in/on/at + Table/Figure/Fig./Section/Chapter/Appendix/Annex/Box/page or with below/above/overleaf, or when the participle is shown/presented/given/listed/summarised/summarized/reported/illustrated/depicted and a tail exists. The advice card stays, and so does a "we" or agent rewrite if one applies. "The results are shown in Table 3." → passive card with `fixes: []`. "The houses were built in 1990." still → "[who] built the houses in 1990." |
| F5 time adverbials (Low) | **Done** | `AGENT_STOP` also stops at every/each + day/week/month/quarter/year and at annually/monthly/weekly/daily/yearly. "The commission sets the tariff every year." / "The commission revises tariffs annually." |

## Rulings

1. **Singular determiners for R11 (b): kept.** Locked in with the negative test "The two farmers owned land near the coast." → no card.
2. **Sentence-initial "We": kept, with the exclusion.** "We"/"we"/"our"/"us" inside "…" or “…” no longer count toward the "we" rewrite. Test: `"We will fix it," the minister said. The roads were repaired.` → no "we" option.
3. **Bare "We got used to work.": left unflagged**, as confirmed.

## Acceptance criteria

| | Status |
|---|---|
| D1 A1–A10, B1–B8, C1–C7 | Pass: all 140 earlier tests unchanged and green |
| D2 goa: same 14 cards and first fixes | Pass. The exact list of (rule, first fix) pairs is asserted. |
| D3 stress-clean-3 line by line (default and academic), stress-clean and stress-clean-2 still pass | Pass. No correlative card, no correctness card, none of the forbidden strings, and "[who]" only in fixes marked `template: true`. |
| D4 §4.2 tests and full suite | 151 of 151 |
| D5 `isNeitherNorSwap` applies the same limits as the rule | Pass. One unit test per limit: determiner use; each punctuation break; each of the 11 clause words; more than 8 words between vs within 8; no "neither"; an existing "nor"; any replacement other than "nor". There is also a loop asserting that the rule and the guard agree on eight sentences. |

Performance: p95 ≈ 4.6 ms for about 2,100 words. clean-academic.txt: 0 cards.

## goa-abstract.txt

Unchanged from rounds 2 and 3: 14 cards. title-case "Power"→"power" · compound-subject "is"→"are" · plain-word "demonstrates"→"shows" · long-sentence ×3 · serial-comma "ecosystem and"→"ecosystem, and" · article-idiom "a"→"the" · both-and "both centralised and decentralised approaches" · wordy-purpose "aims to identify" · vague-phrase "in terms of" (tip) · preposition "suitable for" · list-parallel "able to support" · nominalisation "how to decarbonise".

## Extra probes (not in the fixtures)

- "The bill was approved and signed by the minister in March." → "The minister approved and signed the bill in March."
- "The forms are checked by clerks every day." → "Clerks check the forms every day."
- "The houses were built and sold in 1990." → "[who] built and sold the houses in 1990."
- "The report was written and the team left." and "The money was stolen and never recovered." → no rewrite (refused).
- "The plan was drafted by staff working in Goa." and "The tower was designed by an architect trained in Paris." → no rewrite. The existing actor checks refuse these longer agents. That's a miss, not a wrong fix, in line with "prefer refusing over guessing".

## Open questions

1. For F1 (a), a capitalised word after "neither" counts as a name, not a determiner + noun. So "Neither Goa or Kerala has acted." → "nor". In a sentence-initial position like "Neither Study …" a capital would be misread, but that's rare outside titles.
2. F2 keeps the whole rest of the sentence as the agent whenever a participle precedes the stop. With a long rest, the 7-word agent limit then refuses the rewrite, which is the safe outcome.
