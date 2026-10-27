# Round 7 review

NOT SATISFIED

**Scores against Grammarly:**

| Text | Score | Change | Notes |
|---|---|---|---|
| goa-abstract.txt | **8 / 10** | unchanged | 14 correct inline cards plus one real guidance finding (the study-tense mix) |
| Round-6 documents | **8.5 / 10** | | All seeded P0 items caught. Clean versions silent. Document guidance Grammarly doesn't offer. |
| Round-7 stress documents | **8.5 / 10** | up from 6 | All five High defects from round 6 are fixed |
| New unseen documents (round 8 stress set) | **7.5 / 10** | | One High defect, one Medium, two Low |

The round-7 hardening is good work.
- Proper names, short-form names ("the Commission", "the Department") and "State Government" are now left alone.
- Dollar amounts, PIN codes, phone numbers and order numbers are no longer reformatted.
- Soft-wrapped lines are joined.
- "an MoU" is correct.
- Business acronyms and citations are no longer flagged.
- Roadmap "will" is exempt.

H-1 to H-5 all pass on my runs.

My fresh stress pass found **one remaining High defect, in the same family as round 6's H4**. In PDF-style wrapped text, a continuation line that **starts with a year followed by a full stop** ("…closure of iron ore mines in⏎2012. Monthly peaks…") is taken for a numbered list item. The line before it is then treated as a finished paragraph and gets a critical fix: "mines in." This is exactly the owner's use case (pasting from PDF reports), and the fix inserts an error. It is a one-pattern fix.

**I commit to signing off on round 8 by running the tests and the round-8 key only, with no further fresh stress pass.**

---

## 1. Criteria (re-run by me)

`node --test tests/*.test.js` gives **203 pass, 0 fail, 0 todo**.

| | Result | Evidence |
|---|---|---|
| H-1 F1–F9 and all round-6 keys | **PASS** | My independent checker: policy-brief 15/15, business-email all P0, existing and P1 (BE14 now "reply"), methods 12/12, exec-summary 13/13; no spurious correctness cards; all clean versions 0 correctness, 0 fixes, 0 guidance under key and default options. The only "mustNotFlag" overlaps are majority instances listed without a fix, which is correct. |
| H-2 Round-7 key, all 3 option sets | **PASS** | 0 problems: no forbidden fix, no forbidden rule, all `expect` present. |
| H-3 Guard | **PASS** | Every fix on the round-6, round-7 and round-8 fixtures passes `checkFix`. The `docVariant` code is unchanged (`src/engine/guard.js:124–148`). |
| H-4 goa-abstract | **PASS** | 14 cards, same first fixes. Guidance: exactly `study-tense` (examines / will use / is aimed / will also help). |
| H-5 Performance | **PASS** | `runChecks` + `runGuidance` on about 1,750 words: p95 ≈ 12 ms. |

**No-AI constraint: holds.** No new insertion vocabulary was added this round. All new behaviour suppresses findings.

---

## 2. Findings (fresh stress pass: 6 new documents × 3 option sets)

The documents are saved as `tests/fixtures/round8/` with `key.json`. Today the key reports 21 problems, all from R8-1 to R8-2.

| # | Where | Sev | Input → bad output | Required fix |
|---|---|---|---|---|
| R8-1 | `src/engine/sections.js:13` (`LIST_ITEM = /^\s*([-*•]|\d+[.)])\s/`) | **High** | PDF-wrapped report text: "…since the closure of iron ore mines in⏎2012. Monthly peaks occur in May…" → paragraph-end "in" → "in." (critical). Also "…the fastest rise since⏎2010. Supply lagged behind…" → "since." | A line counts as a numbered list item only if **(a)** the number has 1–3 digits and isn't a year-like value from 1000 to 2100 (so 4-digit numbers never qualify), **and (b)** the previous non-blank line ends in terminal punctuation or ":", is blank, is a heading, or is itself a list item. Otherwise the soft-wrap rule applies and the lines join. Tests: p1-pdf.txt and p6-wrapped-years.txt give no paragraph-end. "The report lists three steps:⏎1. Map roofs.⏎2. Offer loans." is still parsed as a list (no card). policy-brief / exec-summary / business-email errors still get "billing.", "law." and "attached.". |
| R8-2 | D1.4 `consistency-percent` | Medium (advice, no fix) | Academic results: "9 percentage points" counted as "percent"; "(95% CI: 4 to 14)" counted as "%". The panel shows "per cent (1) vs percent (1) vs % (1)". Wrong advice on a correct text. | Match "percent" with a word boundary that excludes "percentage" and "percentile". Exclude "%" in confidence-interval and significance notation: `\d+%\s*(CI|confidence)`, `(CI|confidence interval)[^.]{0,20}\d+%`, and "%" inside parentheses that also contain "CI" or "p". Test: p3-academic.txt gives no consistency-percent finding. |
| R8-3 | D2 units | Low | "4,672 MU in 2022-23" → "MU" never spelled out. MU (million units, i.e. GWh) is the standard Indian power-sector unit. | Add MU, BU, MUs, kVA, kVAr, MVAr, MVA, ckm and kms to `UNITS`. |
| R8-4 | engagement repetition | Low | Report with "per cent" ×5 and "₹ … crore" ×3 → repetition cards on "cent" and "crore" | Protect the words inside fixed unit phrases (per cent, lakh, crore, million, billion) and unit tokens from the repetition rule. |

**Checked and clean in this pass (no false alarms):**
- **Numbers:** "Rs 38,40,000 (Rupees Thirty Eight Lakh Forty Thousand only)" with "₹2,846 crore"; phone "98220 41736"; "PO No. 4512/2023"; "LR No. 88317"; "33/11 kV"; "2022-23"; "20th Electric Power Survey".
- **Capitalisation:** "The Electricity Department … The Department …", "State Government" and "Scenario A / Scenario B" are all silent.
- **Acronyms:** CEA defined and reused; "RDSS (Revamped Distribution Sector Scheme)" reverse definition; "aggregate technical and commercial (AT&C)"; GST and PO whitelisted. The flag on "LR" (lorry receipt) is acceptable advice.
- **Email:** From/To/Date/Subject header lines; "Dear Sir/Madam,"; "Thanking you, / Yours faithfully," sign-off. No paragraph-end or capitalisation cards.
- **Tense and claims:** an academic survey paper (present + past) is silent, as are the results section with "95% CI" (apart from R8-2) and the citations "(Shrimali and Jindal, 2019; Kumar, 2021)".
- **Indian English office note:** "12th January", "Rs 4.5 crore", "at the earliest" and "put up for kind perusal". No false alarms. A few register expressions ("by March end", "till date", "to the tune of") aren't advised; that's backlog, not a defect.

---

## 3. Rulings on the implementer's open questions

1. **ES12 tie exception for title-cased hyphenated compounds: kept.** A tie between "Net-Metering" and "net-metering" is safe to fix: a hyphenated common compound in title case mid-sentence is almost never a name. Two conditions: the capitalised form must not be part of a longer capitalised run, and there must be no "(ACRONYM)" after it. That covers "Indo-Pacific Economic Framework" and "Rolls-Royce plc". Add those two as negative tests. The key stays as is.
2. **Skipping capitalised runs right after a sentence-initial capital: accepted.** Recall traded for safety is the right call for a fix that can damage names.
3. **Numbers followed by unlisted capitalised units aren't reformatted: accepted** (a miss, not a wrong fix).

---

## 4. Round-8 spec (final)

### 4.1 Required

R8-1 (High) and R8-2 (Medium). R8-3 and R8-4 (Low) are recommended; each is a one-line list change.

### 4.2 Tests

- **`tests/fixtures/round8/`** (added by me): p1-pdf, p2-mail, p3-academic, p4-report, p5-indian and p6-wrapped-years (.txt), plus `key.json`, using the same harness as round 7. Every entry must pass under all three option sets. (If R8-3 or R8-4 is deferred, its key entries — MU, and the `repetition` entry under p4-report — may be marked todo.)
- **Add to `tests/round8.test.js`:**
  - the R8-1 list-item positive case ("The report lists three steps:" + "1." / "2.");
  - the two R8-1 negative documents;
  - the R8-2 cases;
  - the ruling-1 negatives ("Indo-Pacific Economic Framework", "Rolls-Royce plc" alongside a lowercase variant) give no consistency-case card.

### 4.3 Acceptance criteria for sign-off

- **I-1** H-1 to H-5 still pass, including the round-6 and round-7 keys.
- **I-2** The round-8 key passes under all three option sets (except any entries deferred as allowed in 4.2).
- **I-3** Every fix on all fixtures passes `checkFix`.
- **I-4** goa-abstract.txt: 14 cards with the same first fixes, plus the single study-tense finding.
- **I-5** Performance: p95 < 60 ms for checks plus guidance on 2,000 words.

**I-1 to I-5 green means SATISFIED.** I'll verify them by running the tests and keys only, with no further fresh stress pass.

### 4.4 Final backlog after sign-off (P1/P2)

1. **Document guidance:**
   - D1b data is/are consistency.
   - D2b acronym defined but barely used.
   - D7 per-paragraph readability and rhythm.
   - D8b title terms absent from the body.
   - Abstract-scoped acronyms reused undefined in the body.
   - "program/programme" family.
   - Methods-section tense.
2. **Inline:**
   - B6 coordinated agents in passive rewrites.
   - B7 "not only … but also" and the dangling-modifier subset.
   - R2b/R11 recall gaps.
   - Absolute-construction long-sentence splits (the abstract's 52-word sentence).
3. **Indian English register (advice, formal/business only):** "by March end" → "by the end of March", "till date" → "to date", "to the tune of" → "about", "put up for perusal", "the needful". The same safe pattern as IE1.
4. **UI:** U1 margin marker; per-paragraph statistics view (G3).
