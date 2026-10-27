# Round 6 review

NOT SATISFIED

**Scores against Grammarly:**
- **goa-abstract.txt: 8 / 10** (unchanged inline output). It now also gets one real piece of document guidance, the tense mix "examines / is aimed" vs "will use / will also help". Grammarly doesn't offer this.
- **The four round-6 documents: 8 / 10.** All 44 P0 seeded items and the 4 existing ones are caught, with the right fixes. Many of these (acronym discipline, number-system consistency, unsupported claims, keyword coverage) are things Grammarly doesn't do at all.
- **My new multi-paragraph stress documents: 6 / 10,** because of the false alarms below.

This round is a large, well-built step towards "real guidance across content". The architecture is sound:
- one memoised document pass;
- a section model;
- a gated guard allowance;
- a grouped panel with one-undo "Make consistent".

All F1–F9 criteria pass on my own runs. But my fresh stress test on unseen, realistic documents found **five High defects**. Each one turns correct text into wrong text through a fix button, and three of them come from the new document rules:

1. Capitalisation consistency lowercases **proper names**: "The Government of Goa" → "government of Goa"; "Ministry of New and Renewable Energy (MNRE)" → "ministry of New …".
2. Number grouping regroups **US dollar amounts** into lakh format: "$650,000" → "$6,50,000".
3. Separator consistency adds commas to a **PIN code**: "Panaji 403001" → "4,03,001".
4. In **hard-wrapped text without blank lines** (typical when pasting from a PDF), paragraph-end inserts full stops mid-sentence: "stations in." / "to the." / "near." These are critical-severity cards.
5. (Older bug, inline) a/an: "We signed **an MoU**" → "a MoU". Letter-named initialisms take "an" before a vowel *sound* (em-oh-you).

There are also four medium noise items: well-known business acronyms flagged as undefined, roadmap "will" flagged as a tense mix, "clearly" flagged next to a figure, and plain-word firing on the Keywords line. Round 7 is a targeted hardening pass. No new features.

---

## 1. Criteria (re-run by me)

`node --test tests/*.test.js` gives **182 pass, 0 fail, 1 todo**.

I wrote an independent key-driven checker (`runChecks` + `runGuidance`, overlap by span, first-fix comparison, mustNotFlag, spurious correctness cards, `checkFix` on every fix).

| | Result | Evidence (my runs) |
|---|---|---|
| F1 No regressions | **PASS** | goa: 14 cards with the same first fixes (academic: 11). clean-academic: 0 cards, 0 guidance. Earlier suites green. |
| F2 Recall | **PASS** | policy-brief 15/15, business-email 4/4 P0 + 4/4 existing, methods 12/12, exec-summary 13/13. P1: 7 of 8 (BE15 open; ruled below). |
| F3 Precision | **PASS** | No spurious correctness card on the four errors files. The only mustNotFlag "hits" are majority instances listed *without* a fix in the grouping panel (6,50,000 and 2,40,000). That isn't a flag; correct. |
| F4 Clean documents silent | **PASS** | All four clean files, under key options and default: 0 correctness cards, 0 cards with a fix, 0 guidance findings. |
| F5 goa guidance | **PASS** | Exactly one finding: `study-tense` (examines / will use / is aimed / will also help), under default and academic. |
| F6 Unit tests | **PASS** | |
| F7 Guard | **PASS** | `docVariant` (`src/engine/guard.js:124–148`): only for the 7 consistency/number rule ids, never remote. AI-word and negation checks run first. A word is admitted only if it is a token elsewhere in the same document. 0 guard failures across all fixtures and stress documents. **The allowance can't admit outside or AI text.** It can admit any word of the writer's own document, so correctness depends on the rule choosing the right variant, which is exactly where H1–H3 fail. |
| F8 Explanations and panel | **PASS** (data verified; panel per the browser notes) | |
| F9 Performance | **PASS** | |

---

## 2. Findings (fresh stress test: 10 new multi-paragraph documents × 3 option sets)

The documents are saved as `tests/fixtures/round7/*.txt`, with `tests/fixtures/round7/key.json`.

| # | Where | Sev | Input → bad output | Required fix |
|---|---|---|---|---|
| H1 | `src/engine/rules/document.js` (D1.3 `consistency-case`) | **High** | "The Government of Goa announced … The government expects …" → "government of Goa" · "The Ministry of New and Renewable Energy (MNRE) … the ministry has asked" → "ministry of New and Renewable Energy" · "The Joint Electricity Regulatory Commission … The Commission held hearings … A new commission was proposed" → "The commission held" | (a) A capitalised word is **never** a variant candidate if it belongs to a longer proper-name run: followed by "of/for/and/on" + a capitalised word, or preceded or followed directly by another capitalised word, or followed by "(ACRONYM)". (b) **Definite short form:** "the Commission/Ministry/Department/Government/State/Court/Council/Authority/Board/Bank/Committee" is exempt when the document contains a full proper name ending in or headed by that word. (c) **A tie gives advice only** (this reverses my round-6 "tie → lowercase" rule, which was wrong for names). (d) Lowercasing fixes only when the capitalised form is the minority **and** none of (a)–(b) applies. |
| H2 | D3a `number-grouping` | **High** | "a 1 MW portfolio costs about $650,000" (in a document with ₹1,80,000 and ₹2,50,00,000) → "$6,50,000" | Numbers belong to a **currency/unit class**: foreign currency ($, US$, USD, €, EUR, £, GBP, "dollars", "euros") and numbers next to million/billion are always international and never compared. Rupee amounts (₹, Rs, Rs., INR, lakh/crore context) and plain counts are compared only with each other. A mix where international numbers appear only with foreign currency gives no finding. |
| H3 | D3a `number-separator` | **High** | "Panaji 403001, or filed online" → "4,03,001" | Only **quantities** count: the number is preceded by a currency marker or followed by a unit or noun word (MW, kWh, files, households, tonnes, people …). A number followed by punctuation or preceded by a place name, "PIN", "Pincode", "pin code", "postal", "Plot", "Survey No.", "Ward", "Room", "Tel", "Ph" or "+91" is never a candidate. |
| H4 | paragraph model (`src/engine/sections.js` / D6.1) | **High** | Hard-wrapped text with no blank lines: "…generating stations in⏎Maharashtra and Karnataka …" → "in."; "…sell power to the⏎Goa Electricity Department …" → "the."; "…two reservoirs near⏎Ponda and Sanguem." → "near." (critical cards) | **Soft-wrap rule:** within the body, a line that doesn't end in terminal punctuation (`. ! ? : ) ] " ' ” ’ …`) joins the next non-blank line, whatever case that line starts with. So paragraph-end can only fire on the **last line of a block**: the line before a blank line, a heading, a list item, the sign-off or the end of the text. Headings, list items, salutations, header lines and the Keywords line are identified first and never joined. goa is unaffected (its paragraph lines end in "."). |
| H5 | `src/engine/rules/correctness.js` (`wantsAn`), pre-existing | **High** | "We signed an MoU with the bank." → "a MoU" | A token with ≥ 2 capitals (MoU, MoP, NGO, MBA, FAQ, SLA, NIT) is read by **letter names**: initial A E F H I L M N O R S X take "an", others take "a". Exceptions where the acronym is spoken as a word: a list (NASA, NATO, UNESCO, SCADA, …) uses the word's first sound. Tests: "an MoU", "an NGO", "an FAQ", "a UN agency", "a NATO base" give no card; "a MoU" → "an". |
| M1 | D2.2 `acronym-undefined` | Medium | Business email: YoY, EBITDA, KYC, MoU flagged. "(CEA, 2021)" flagged. SCADA flagged. | Extend `COMMON_ACRONYMS` with business/finance terms (YoY QoQ MoM FY Q1–Q4 EBITDA EBIT ROI ROE CAGR KYC AML MoU NDA SLA KPI CSR ESG SME MSME NBFC IPO B2B B2C HQ AGM EGM CXO) and technical terms (SCADA GIS GPS API URL USB LED LPG CNG EV HVAC). **Never** flag an acronym inside a citation (a parenthesis with a 4-digit year, or `[n]`). |
| M2 | D4 `study-tense` | Medium | "This paper examines … Section 3 will present the results. We will also discuss policy implications in Section 4." → tense-mix finding. A roadmap future is conventional. | Exclude future verbs in a sentence containing Section/Chapter/Part/Appendix + number, "below", "later", "in the next section", "in the following" (roadmap). |
| M3 | D5 `unsupported-claim` ("clearly") | Low/Med | "evening demand is clearly higher than midday demand, by about 30 per cent" → claim card | Exempt "clearly/obviously" when the same sentence has a figure (digit, %, per cent). This matches the significant/dramatic rules. |
| M4 | plain-word on the Keywords line | Low | "Keywords: …, feeder utilisation" → "use" | Inline style rules (plain-word, repetition, wordy, passive) skip the Keywords line, title and headings. |

**Checked and clean in this pass:**
- D1.1 spelling family ("organized" → "organised" against four British forms).
- D1.2 hyphenation and closed compounds ("data set" → "dataset", "e-mail" → "email"; attributive vs predicative "decision making … decision-making process" correctly left alone; "in the long term" untouched).
- D8a ("DISCOM performance" correctly reported; "meter data" and "feeder utilisation" matched).
- D4 on an all-future proposal (silent) and on two classified verbs (below threshold, silent).
- D5 "significant role" and "It is widely accepted that" correctly advised; "(CEA, 2021)" citation correctly suppresses "Studies show"; "dramatically … $1,100 … $140" correctly silent.
- Wrapped text whose continuation lines start in lowercase (silent).
- Inline B1–B4 on new sentences: "The petition and the annexure of the utility is due" → "are"; "decided appealing" → "decided to appeal"; "carried out an analysis of" → "analysed"; "the committee … their" correctly silent.
- Email salutation and sign-off exempt.

---

## 3. Rulings

**Open questions**

1. **BE15 "revert" → "reply":** don't add a second card on the same span. The `wordy` card on "revert back" gets "reply" as its **first** fix when "revert back" is followed by with, to me/us or at the earliest (the Indian-English "reply" sense), and "revert" as the second fix. Otherwise "revert" is first. I've updated `business-email.key.json`: BE14's expected first fix is now "reply" (P1), and BE15 is merged into it.
2. **"Summary" shares the body's acronym scope: confirmed.** In a brief or report, a Summary is part of the running document. Only "Abstract" and "Executive summary" stand alone. The key stays as is.
3. **Paragraph = line: replaced** by the soft-wrap rule in H4. Single newlines after terminal punctuation still end a paragraph (goa unaffected).
4. **D4 `STUDY_VERBS`: accepted,** with the roadmap exemption (M2).

**Deviations**
- **B2** (an ING_NOUNS word counts as a verb only when a determiner follows): accepted.
- **D2** (Summary scope): accepted.
- **D4** (verb list): accepted.
- **D6:** superseded by H4.
- **`composeFixes` using `maxGrowth`:** accepted. It is the same safety argument as `composeSentence` (each part is guarded, then the whole).

---

## 4. Round-7 spec (hardening only)

### 4.1 Required

H1–H5 (High), M1–M2 (Medium), M3–M4 (Low; small), and the BE14 update.

### 4.2 Fixtures and tests

- **`tests/fixtures/round7/`** (added by me): `a-policy`, `b-academic`, `c-business`, `d-wrapped`, `w-wrapped-caps`, `e-case`, `g-claims` and `j-mixed` (.txt), plus `key.json`. For each file, under each of the three option sets in the key:
  - no fix may produce a `forbidFix` string;
  - no finding or card with a `forbidRule` rule id may overlap its match (`"*"` = anywhere in the file);
  - every `expect` entry must be present (first fix where given). For g-claims, `expect` applies under `expectUnder`.
- **Add to `tests/round7.test.js`:**
  - H1: the three name cases give no card. A document with "state government" ×2 and "State Government" ×1 (no proper-name run) still gets "state government". A tie gives advice and no fix.
  - H2: "$650,000" with rupee amounts gives no finding. "120,000 complaints" with "6,50,000 consumers" still → "1,20,000".
  - H3: "Panaji 403001,", "PIN 403001", "+91 832 2437000" and "Survey No. 123" give no card. "about 3200 files" with "2,450" still → "3,200".
  - H4: w-wrapped-caps.txt and d-wrapped.txt give no paragraph-end. policy-brief.errors still → "billing.". exec-summary.errors still → "law.". business-email.errors still → "attached.".
  - H5: the six a/an cases in the table.
  - M1–M4: the cases in the table.
  - BE14: "Please revert back with your comments" → first fix "reply".

### 4.3 Acceptance criteria (round 7)

- **H-1** F1–F9 still pass, including all four round-6 keys (with the BE14 update) and their clean versions.
- **H-2** Every round7 key entry passes under all three option sets.
- **H-3** Every fix produced on round6 and round7 fixtures passes `checkFix`. The `docVariant` tests are unchanged.
- **H-4** goa-abstract.txt: 14 cards with the same first fixes, and exactly one guidance finding (study-tense).
- **H-5** Performance: `runChecks` + `runGuidance` p95 < 60 ms on 2,000 words.

When H-1 to H-5 are green, I will run one more fresh stress pass, limited to the document rules (consistency, acronyms, numbers, tense, claims, paragraphs). If it finds no High defect, I will sign off.

### 4.4 Backlog (P1/P2, not blocking)

- D1b data is/are.
- D2b acronym used fewer than twice.
- D7 per-paragraph readability and rhythm.
- D8b title terms unused.
- B6 coordinated agents.
- B7 not only … but also, dangling modifiers.
- Abstract-scoped acronyms reused undefined in the body (currently a miss).
- "program/programme" family.
- Methods-section tense.
- U1 margin marker.
- Absolute-construction long-sentence splits.
