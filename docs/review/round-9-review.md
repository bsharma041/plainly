SATISFIED

# Round 9 review (third pass, sign-off)

**Tests:** `node --test tests/*.test.js` gives **263 pass, 0 fail**. The rule kit runs every new `pass` example. Checks plus guidance on 1,637 words take about 10 ms at p95.

**Probes:** I re-ran all earlier probe sets plus 10 new sentences, about 180 in total. Each ran under five option sets: default, business, formal, US and academic. The new sentences tested:
- time-noun openers: "The minute the bell rang…", "Next time it happens…", "The year it opened…", "Immediately after it was done…"
- with-clause sentences with modal and past main clauses
- "Whom the board appoints…"
- "As much people as possible…"

## Blocking issues

None.

## Fixes confirmed

| Rule | Repro sentences | Now |
| --- | --- | --- |
| fused-sentence | "By the time you are ready…", "By the time it was done…", "The moment it was over…", "Every time the report was late…", "The day it was done…" | Silent |
| fused-sentence | "now we have", the cleft "It was yesterday we…", the contact clause "The night we got home…" | Silent |
| fused-sentence | Real run-ons: "The meeting ran late we missed the train.", "Everyone left early we stayed behind.", "The work finished early they were pleased." | Still flagged, with correct fixes |
| with-clause | "The firm says it will expand…, with new outlets opening…" | No fix |
| with-clause | A "will meet" main clause | No fix |
| with-clause | Past-tense main clauses | Correct past forms (dropped, planned, occurred, referred, stopped, reported, showed) |
| with-clause | Mixed-tense main clauses | No fix |
| with-clause | Guard-refused fixes (droped, planed and so on) | No longer merge an empty fix into the long-sentence card |
| much-many | "how / as / so / too / that much" + plural | Silent |
| much-many | "Much students work part-time." | Still fixed |
| who-whom | Complement "who" ("who the final users are", "who they are") and adverb cases | Silent |
| who-whom | "to who it may concern", "from who the money came" | Correctly become "whom" |
| subjunctive | Real past conditionals | Silent |
| subjunctive | "If I was you", and formal "If it was him, he would…" / "If she was to resign, the board would…" | Flagged correctly |
| that-which (US) | Indirect questions after ask, tell, decide and similar verbs | Silent |
| that-which (US) | Restrictive "which" | Still gets the advice |
| register-office | "find the same", "same as on", "such as on", "damage your good name" | Silent |
| register-office | Request-frame "good name", "As on date", "till date", "send the same", "passed out of IIT" | Flagged correctly |
| dangling-modifier | "In spending terms", "Pricing aside" | Silent |
| data-number | "big data" | Excluded |

## No-AI invariant

The invariant holds:
- Every round 9 fix uses the writer's own words or inflections of them. The with-clause past forms are built from the writer's own -ing form.
- Any other added words come from the closed `ROUND9_INSERTS` list.
- `checkFix` stays the final gate. Nothing applies without a click.

## UI

- Alt/⌥+Backspace dismisses a card only when focus is outside the textarea.
- The Alt+J/K walk resumes at the same slot after an accept or dismiss. A card opened by click now updates the walk position.
- Gutter marks are positioned relative to the mirror, sit outside the tab order (`tabindex="-1"`) and have labels.
- Paragraph rows are plain buttons with no row role.
- The hint shows ⌥ on Mac.

## Non-blocking notes

1. **dangling-modifier** flags "Weighing the costs and benefits, there is a case for reform." It is a true dangling modifier, and the card is advice only.
2. **Missed flags (safe):** "As much people as possible" is now silent. It is a recall loss from the "as much" skip and safe to leave.
3. **Shared guard vocabulary:** `ROUND9_INSERTS` joins the guard's global closed vocabulary, so these 20 function words are also allowed in deep-check fixes. This is acceptable.
4. **Snapshot updates:** the snapshots in rounds 4, 5, 6 and 8 now expect the long-sentence card to carry ". Thermal power comprises". This is documented and deliberate.

Signed off: PhD, round 9.
