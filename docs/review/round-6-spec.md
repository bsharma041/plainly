# Round 6 spec: deeper proofing and document-level guidance

Reviewer: PhD. Baseline: round-5 sign-off (159 tests, goa-abstract.txt gives 14 correct inline cards).

Owner's request: *"make sure that the tool is well proofed and provides me real guidance across content, not just superficial."*

## 0. Hard constraints and design principles

The hard constraints are unchanged: no AI or generated text; deterministic rules plus fixed lists; every fix passes `guard.js`; the writer's voice is preserved; nothing is applied without a click; **silence beats wrong advice**.

Two new principles for document-level work:

- **Consistency rules never pick a winner from outside the document.** For variants the writer used (spellings, hyphenation, capitalisation, number styles), the majority form in the document wins. A tie falls back to a stated house default, or to advice only. The replacement is always a form the writer already used.
- **Guidance is advice unless the fix is mechanical.** Inserting a full stop, removing a duplicate acronym expansion and switching a variant to the writer's own majority form are mechanical. Tense changes, claim support and paragraph structure are advice only, with a plain explanation and a jump-to-instance list.

### What the current engine does on the new fixtures (measured)

| Fixture | Inline cards today | Seeded P0 items caught today |
|---|---|---|
| policy-brief.errors.txt | **0** | 0 of 15 |
| business-email.errors.txt | 5 | 4 of 16 (agreement, one-of-plural, discuss about, revert back; all pre-existing) |
| methods.errors.txt | 3 (passive) | 0 of 12 |
| exec-summary.errors.txt | 1 (passive) | 0 of 13 |

This is the "superficial" gap the owner sees: the tool proofs individual sentences well but sees nothing at the document level.

---

## 1. Priorities for this round

### P0 (required for sign-off)

| ID | Item | Source |
|---|---|---|
| B1 | Compound subjects in the middle of a sentence (R1 extension) | backlog 1 |
| B2 | Verb + -ing → verb + to-infinitive (R12 b) | backlog 2 |
| B3 | Light-verb nominalisations: "conduct an assessment of" → "assess" (R8 c) | backlog 3 |
| B4 | Pronoun–antecedent number, "the utility … their" → "its" (R13) | backlog 4 |
| D1 | Document consistency: spelling family, hyphenation, capitalisation, per cent/percent/% | backlog 5 + new |
| D2 | Acronyms: used before definition, never defined, defined twice | new |
| D3a | Number formatting: Indian vs international grouping; separator consistency | new |
| D4 | Study self-description tense (future vs completed) | new |
| D5 | Unsupported claims and boosters (advice) | new (absorbs R17) |
| D6 | Paragraph signals: missing final full stop, same-start run, overlong paragraph | new |
| D8a | Keywords that never appear in the text | new |
| G1 | Guidance panel, instance highlighting, "Make consistent" (one undo step) | new |
| N6 | Remove "obtain → get" from plain words (it lowers register in research prose) | found while building fixtures |
| N7 | R10 exempts email header lines (Subject:, Re:, Fwd:, From:, To:, Cc:, Date:) | found while building fixtures |

### P1 (should do this round; not blocking)

| ID | Item |
|---|---|
| R14a | Comma after an introductory subordinate clause (If/When/Although … , I/we/it …) |
| IE1 | Indian English register advice, under business/academic domain or formal goal only |
| D3b | Date-format consistency; numerals vs words for one to nine |
| D1b | "data is" / "data are" consistency |
| D2b | Acronym defined but used fewer than two more times |
| D7 | Per-paragraph readability and sentence-length variety (panel statistics plus one advice) |
| D8b | Title terms that never appear in the body |
| B6 | Passive rewrites with coordinated agents ("by the minister and the mayor") |
| B7 | "not only … but also"; dangling-modifier subset (advice) |

### P2 (backlog)

- Methods-section tense beyond the study's self-description.
- U1 margin marker.
- Splits for long sentences joined by ", with …" absolute constructions.
- R2b/R11 recall gaps, R20–R23.
- Title-case "A" mid-title.

---

## 2. Contract and architecture changes

- **New suggestion fields** (backward compatible):
  - `level: 'inline' | 'paragraph' | 'document'` (default `inline`);
  - `group: 'consistency' | 'acronyms' | 'numbers' | 'evidence' | 'structure' | 'tense' | 'keywords'` (guidance only);
  - `instances: [{ start, end, original, fixes }]` (document findings; the top-level `start/end` is the first instance).
- **New engine entry point** `runGuidance(text, opts) → Finding[]` in `src/engine/guidance.js`. Rules live in `src/engine/rules/document.js` (D1–D8); data lives in `src/engine/data/document-lists.js`.
- **Inline cards for mechanical findings.** For D1 minority instances, D3a, D2 "redefined" and D6 "paragraph-end", `runChecks` also emits ordinary inline cards with the same rule ids (category `correctness` for paragraph-end, `clarity` otherwise; severity style except paragraph-end, which is critical). This way the existing Accept, Dismiss and "Improve this sentence" flows keep working. The panel groups those cards; it doesn't duplicate them.
- **Shared section model** (`src/engine/sections.js`):
  - headings: reuse `headingParagraphs`;
  - an **Abstract** section (heading "Abstract"/"Summary"/"Executive summary", up to the next heading);
  - a **Keywords line** (`^(Keywords|Key words|Index terms)\s*:`);
  - a **title** (first heading line);
  - **header lines** (`^(Subject|Re|Fwd|From|To|Cc|Date)\s*:`);
  - a **salutation** (`^(Dear|Hi|Hello)\b.*,?$`) and a **sign-off block** (a line matching `^(Regards|Best|Best regards|Kind regards|Thanks|Thank you|Sincerely|Yours)\b,?$` and every line after it).
  - Every document rule uses this model to exempt the parts it shouldn't judge.
- **Guard extension: `docVariant`** (in `guard.js`, used only by the D1/D3a rule ids):
  - A replacement word that is not in the replaced span or in CLOSED is still allowed if it occurs **verbatim elsewhere in the document at least once** as part of the majority variant the rule cites.
  - The AI-word, negation, em-dash and growth checks run first and are unchanged. Remote fixes never get `docVariant`.
  - Numeric tokens that differ only in comma placement count as forms of each other ("120,000" ↔ "1,20,000", "2450" ↔ "2,450").
  - **Test:** a D1 fix that introduces a word found nowhere in the document is rejected.

---

## 3. Rule specs

Every P0 rule lists detection, the fix (or advice), the card text, positive tests and negative tests. **Fixture answer keys** (`tests/fixtures/round6/*.key.json`) are part of the spec.

### B1 Compound subjects in the middle of a sentence (P0)

- **Rule id:** `compound-subject` (same as R1). **Severity:** critical.
- **Detection:** the R1 subject pattern, but it may also start right after a clause boundary inside the sentence. Boundary = `,\s+(and|but|while|whereas)\s+`, `;\s+`, or a subordinator `\b(because|although|though|since|whereas|while|if|when|that)\s+`.
  - The NP must begin with the|its|their|his|her|our|this.
  - Then come N1 and N2 (R1 noun tests), "of/for/in/on/to", then ≤12 tokens to the verb, with R1's abort conditions (comma, relative pronoun, another verb).
  - Verb set: R1's list plus deters, affects, delays, raises, limits, drives.
- **Guards:** all R1 guards (UNIT_BINOMIALS, each/every, compound modifier after N2, quotes).
- **Fix:** plural verb (is→are, was→were, has→have, does→do, -s verb → base).
- **Positive:**
  - "Uptake has been slow, and the cost and complexity of approvals has deterred many buyers." → `has`→`have`
  - "The state refused raising tariffs in 2023, and the cost and timing of new plants depends on the budget." → `depends`→`depend`
  - "…, and the size and age of each dwelling was recorded." → `was`→`were`
  - "Bills rose because the cost and availability of coal has changed." → `have`
- **Negative:**
  - "Costs rose, and the planning and design team is small."
  - "…, and the research and development budget is small."
  - "…, that the health and safety of workers is the first priority."
  - "…, and the rise and fall of tariffs reflects fuel prices."
  - "…, and the cost and timing of each phase are published."
  - "…, while the analysis of cost and timing is complex."
  - "…, and the bread and butter of the firm is consulting."

### B2 Verb + -ing → verb + to-infinitive (P0)

- **Rule id:** `verb-pattern`. **Severity:** advanced.
- **Detection:** `INF_VERBS` (all inflections) = decide, refuse, manage, afford, agree, hope, fail, promise, threaten, offer, pretend, deserve, want, wish, expect, seem, tend, aim. The verb is followed directly by `([a-z]+ing)`, where `baseFromIng(w) ∈ BASE_VERBS`.
- **The token after the -ing word must be:** a `DET_POSS` word, a plural -s noun, a number, or a capitalised name. This means the -ing word is taking an object, so it is a verb.
- **Guards:**
  - Skip when the -ing word is in `ING_NOUNS` (funding building planning training meeting housing spending timing pricing financing setting opening hearing ruling booking offering listing rating warning learning marketing processing sitting earnings savings findings proceedings).
  - Skip when a determiner precedes the -ing word.
  - Skip "aim at" (correct British usage).
- **Fix:** `{verb} to {base}`. **Inserts:** to.
- **Positive:**
  - "In 2022 the state decided offering a smaller subsidy" → `decided to offer`
  - "The state refused raising tariffs in 2023" → `refused to raise`
  - "We managed collecting a survey of 412 of these households" → `managed to collect`
  - "They agreed sharing the data." → `agreed to share`
- **Negative:**
  - "They decided funding was short."
  - "The board agreed pricing rules last week."
  - "We failed testing."
  - "She tried using solar." ("try" is not in the list)
  - "The scheme aims at reducing losses."

### B3 Light-verb nominalisations (P0)

- **Rule id:** `nominalisation`. **Severity:** advanced.
- **Detection:** `(make|conduct|carry out|perform|undertake|provide|give|hold|have|take)` in any inflection, then `(a|an|the)`, then NOM, then `of`. NOM → verb map in `document-lists.js`:
  - assessment→assess, evaluation→evaluate, analysis→analyse/analyze (dialect), examination→examine, investigation→investigate, estimation→estimate, measurement→measure, review→review, study→study, survey→survey, comparison→compare, calculation→calculate, inspection→inspect, audit→audit, revision→revise;
  - plus the fixed pairs: give/provide a description of→describe, give/provide an explanation of→explain, have/hold a discussion about|on→discuss, take a decision on→decide on (Indian/British "take a decision").
- **Tense of the fix follows the light verb:**
  - base after a modal, "to" or do-support → base;
  - -s → third person;
  - past → past;
  - -ing → -ing;
  - after has/have/had/been → past participle (from `morph`).
- **Guards:**
  - Skip if an adjective or adverb sits between the determiner and NOM ("a detailed assessment of").
  - Skip when the phrase has no "of" (except the take/hold pairs).
  - Skip inside quotes.
- **Inserts:** the verb forms in the map (add them to CLOSED).
- **Positive:**
  - "The department should conduct an assessment of rooftop potential" → `conduct an assessment of` → `assess`
  - "The state government would need to carry out an evaluation of each project" → `evaluate`
  - "We conducted an analysis of demand." → `analysed` (UK) / `analyzed` (US)
  - "The team has carried out a review of tariffs." → `reviewed` (span "carried out a review of")
- **Negative:**
  - "We conducted a detailed assessment of demand."
  - "The assessment of risk was conducted in 2022."
  - "We made an assessment last year."
  - "The audit of the utility found gaps."

### B4 Pronoun–antecedent number (P0)

- **Rule id:** `pronoun-agreement`. **Severity:** advanced. Exactly as R13 in `round-1-spec.md`.
  - Antecedent list: state, country, city, region, district, sector, system, policy, method, approach, model, framework, paper, study, report, analysis, scheme, plant, grid, utility.
  - Collective nouns are excluded (government, council, committee, team, company, board, ministry, commission, department).
  - At most 8 tokens, no plural noun and no "and" in between, same clause.
- **Positive:**
  - "The utility must clear their backlog before the subsidy starts." → `their`→`its`
  - "The state must publish their progress report every year." → `its`
- **Negative:**
  - "The states must publish their reports."
  - "The government have set their targets."
  - "The state and its utilities cut their costs."
  - "Each researcher submits their data."
  - "The state relies on utilities, and they cut costs."

### D1 Document consistency (P0)

- **Group:** consistency. Inline cards on the minority instances, plus one grouped panel finding per variant set.
- **"Make consistent"** applies all of a set's minority fixes in one undo step (see G1).

| Sub-rule | Rule id | Variant sets | Majority / tie | Exemptions |
|---|---|---|---|---|
| D1.1 Spelling family | `consistency-spelling` | Words that differ only by -is-/-iz- in a suffix (-ise, -ised, -ising, -isation, -iser and the -ize forms), or by -our/-or, -re/-er (centre/center), -ll-/-l- (travelled/traveled), within one stem family (shared 6-letter prefix). Works on families, not just the fixed `SPELLING` pairs, so "decarbonization" is caught against "decarbonisation" and "decarbonise". | The majority family style wins (count every word in the families). A tie follows the dialect setting, then advice. | Proper names (capitalised mid-sentence), quotations, reference lists (lines starting with a year pattern or "[n]"). The existing `dialect` rule becomes this rule's word-level case: don't flag the same span twice. |
| D1.2 Hyphenation | `consistency-hyphen` | The same word pair hyphenated vs open vs closed ("net-metering"/"net metering", "smart-meter"/"smart meter", "data set"/"dataset", "e-mail"/"email", "co-operation"/"cooperation"). | Compare **attributive** uses only (followed by a noun-like token, per R11's test). The predicative/noun uses "in the long term" and "is well known" are never compared. Majority wins; a tie goes to hyphenated for attributive compounds and to the closed form for dataset/email. | Headings and title; the Keywords line is checked but not used as evidence. |
| D1.3 Capitalisation | `consistency-case` | The same 1–4-word term with different capitalisation mid-sentence ("State Government"/"state government", "Net-Metering"/"net-metering", "Substation Upgrade"/"substation upgrade"). | Count only mid-sentence occurrences, never sentence-initial ones. Majority wins. On a tie, lowercase wins if any lowercase occurrence is mid-sentence (a common noun); otherwise advice. | Headings, title, header lines, Keywords line, sign-off block; terms with all-caps words; names in `PROPER` lists. |
| D1.4 per cent | `consistency-percent` | "per cent" / "percent" / "%" after a number in running text. | per cent vs percent: majority wins, with a fix. "%" mixed with a spelled form: advice only (style guides differ), unless one form has ≥ 3× the uses of the other, in which case fix the minority. | Tables (lines with ≥ 3 tabs or pipes), parentheses containing only a figure. |

- **Card (inline):** title `Consistency: "{majority}"` · message: *You write "{majority}" {n} times and "{minority}" here. Use one form throughout.*
- **Panel:** *"{majority}" ({n}) vs "{minority}" ({m})*, with the instance list and the "Make consistent" button.
- **Positive (from fixtures):** PB3, PB11, PB14, PB15, BE1, BE3 (advice), ME8, ME9 (advice), ES12.
- **Negative:**
  - goa-abstract.txt: 0 consistency findings.
  - all clean fixtures: 0.
  - "long-term contracts … in the long term" gives no card.
  - "The author is well known … a well-known author" gives no card.
  - "the Goa Electricity Department … the department" gives no card (different terms).

### D2 Acronyms (P0)

- **Group:** acronyms.
- **Acronym token:** `\b[A-Z][A-Za-z]*[A-Z][A-Za-z]*s?\b` with 2–6 letters and ≥ 2 capitals (GED, MoP, DSM, ACs, BOQ, DISCOMs).
- **Never acronyms:**
  - the `COMMON_ACRONYMS` whitelist in `document-lists.js` (about 80): UK US USA EU UN UNDP WHO GDP GST RBI CEO CFO PDF OK AM PM AD BC COVID AI IT HR ID TV PhD MBA NGO FAQ ISO IEEE IPCC UNFCCC OECD IMF BRICS NASA BBC…;
  - units: MW kW GW TW kWh MWh GWh TWh kV MVA km kg CO2 °C ppm;
  - Roman numerals;
  - all-caps words in headings or title;
  - the writer's personal dictionary.
- **Definition patterns:**
  - (a) `Long Form (ACR)`: the initials of the preceding 2–8 words match ACR. Minor words (of, and, the, for, on, in, to) may be skipped, and each hyphenated part counts as a word. Case-insensitive; a trailing "s" is ignored.
  - (b) `ACR (Long Form)`, with the same test reversed.
- **Scopes:** the Abstract section is its own scope (abstracts must stand alone), so a definition in the abstract doesn't count for the body and vice versa. Title, headings and Keywords line are exempt.

| Sub-rule | Rule id | Condition | Output |
|---|---|---|---|
| D2.1 | `acronym-before-definition` | First use in a scope comes before that scope's definition | Advice on the first use: *"{ACR}" is used here but defined later ("{Long Form} ({ACR})"). Define it at first use.* No fix (moving text is not mechanical). |
| D2.2 | `acronym-undefined` | Used in a scope, never defined in it, not whitelisted | Advice on the first use: *Spell out "{ACR}" the first time you use it.* |
| D2.3 | `acronym-redefined` | A second definition in the same scope | Fix on the second definition: replace "Long Form (ACR)" with "ACR". The guard sees a pure deletion of the writer's words. |
| D2.4 (P1) | `acronym-unused` | Defined, then used fewer than 2 more times in the scope | Advice: *You define "{ACR}" but use it only {n} time(s) after. Consider spelling it out instead.* |

- **Positive:** PB1, PB2, BE4, ME1, ME7, ES3, ES10.
- **Negative:**
  - "MW", "kW" and "₹" give no card.
  - methods.clean.txt (GED defined at first use in Methods) gives no card.
  - An abstract that defines GED plus a body that defines GED again gives no card (separate scopes).
  - "The UN and the EU agreed." gives no card.
  - goa-abstract.txt gives no card.

### D3a Number formatting (P0)

- **Group:** numbers. **Running text only** (skip tables, references, dates, times, phone numbers, version numbers, identifiers after No./ISO/Section/Act/page/p./Fig./Table).
- **D3a.1 `number-grouping`:**
  - Indian grouping = `\b\d{1,2}(,\d{2})+,\d{3}\b` with ≥ 6 digits (6,50,000). International = `\b\d{1,3}(,\d{3}){1,}\b` with ≥ 6 digits (120,000).
  - Numbers of 4–5 digits ("1,240", "₹9,000", "12,500") are **neutral**.
  - If both systems occur, the majority wins and the minority gets a regrouping fix (pure digit regrouping). A tie gives advice.
- **D3a.2 `number-separator`:**
  - Numbers ≥ 1,000 written with a separator vs without.
  - Exclude 4-digit numbers from 1000 to 2100 written without a separator (years), and anything after the identifier words above.
  - If both styles occur (at least one each), the majority wins. A tie goes to separators. Fix: insert or remove separators in the doc's grouping system.
- **Positive:** PB9 ("120,000" → "1,20,000"), ME3 ("2450" → "2,450").
- **Negative:**
  - "2019 to 2023", "Companies Act, 2013", "ISO 9001", "Table 2" give no card.
  - "1,240" alone gives no card.
  - A document with only "6,50,000" and "2,40,000" gives no card.
  - A document with only "2450" gives no card.

### D4 Study self-description tense (P0)

- **Rule id:** `study-tense`. **Group:** tense. Advice only, document level.
- **Study subjects** = this/the + (paper, study, article, report, brief, review, analysis, assessment, approach, framework, chapter, section, survey), or "we" (but never inside quotes).
- **For each finite verb directly governed by a study subject**, classify it (adverbs allowed in between):
  - **future**: will/shall + base;
  - **completed**: past tense, or has/have + participle;
  - **present**: present tense, including "is/are + participle" and "aims".
- **Flag only when future and non-future both occur** in the same scope (abstract, or the body), with ≥ 3 classified verbs in total.
  - present + past is conventional (abstract present, methods past) and is never flagged.
  - The finding lists every instance, grouped by tense.
  - Message: *This {abstract/document} describes the study both as planned ("will …") and as done or in progress ("examines", "used"). Choose one: future for a proposal, present/past for completed work.*
- **Positive:**
  - goa-abstract.txt → one finding (present: "examines", "is aimed"; future: "will use", "will also help").
  - ME4 (methods.errors: "We will match … compute" vs "We managed", "We asked", "We used", "This study estimates").
- **Negative:**
  - methods.clean.txt (present + past only).
  - clean-academic.txt.
  - "The government will publish rules. This study examines them." ("government" is not a study subject).
  - A proposal written entirely in the future.

### D5 Unsupported claims and boosters (P0, advice)

- **Rule id:** `unsupported-claim`. **Group:** evidence. Inline style-severity advice plus a panel listing.
- **Active** under academic, technical or business domain, or formal goal. **Off** under general/casual/creative unless the writer turns on "Evidence checks".

| Pattern (fixed list) | Condition | Message |
|---|---|---|
| it is well known that · it is widely accepted that · everyone knows · there is no doubt that · it goes without saying | always | *This asserts agreement without showing it. Cite a source or state the evidence.* |
| clearly / obviously / undoubtedly / certainly / of course | only sentence-initial (with or without a comma), or directly after is/are/was/were, or directly before shows/demonstrates/proves/indicates. Never as a manner adverb ("demonstrates this problem clearly", "clearly labelled") | *"{w}" tells the reader what to conclude. Let the evidence do that, or cite it.* |
| studies show · research shows · studies have shown · several studies have shown · many studies · experts agree · evidence suggests | no citation in the same sentence: no `(Name, 2020)`, `(Name et al., 2020)`, `[n]`, `(2020)`, footnote digit, or "according to" + capitalised name | *Which studies? Add a citation, or name the source.* |
| significant(ly) | no number, %, "per cent", "p <", "p =", "statistically" or "confidence" in the same sentence | *"Significant(ly)" suggests a measured or statistical result. Give the figure, or use a plainer word.* |
| massive · huge · enormous · dramatic(ally) · drastic(ally) · unprecedented (attributive or before a verb) | no number or % in the same sentence | *Give the size: a figure is more convincing than "{w}".* |

- **Positive:** PB4, PB13, ME10, ME11, ES2, ES4, ES6.
- **Negative:**
  - goa-abstract.txt under academic gives no card ("demonstrates this problem clearly" is a manner adverb).
  - "Demand rose significantly, by 12 per cent."
  - "Studies show (Sen, 1999) that…"
  - "The rise was dramatic: 40 per cent in a year."
  - "The data are clearly labelled."
  - clean fixtures give no card.

### D6 Paragraph signals (P0)

- **Group:** structure. Paragraphs = text blocks separated by blank lines, excluding headings, title, header lines, salutation, sign-off block, Keywords line, and list items (`^\s*([-*•]|\d+[.)])\s`).

| Sub-rule | Rule id | Condition | Output |
|---|---|---|---|
| D6.1 | `paragraph-end` | The paragraph has ≥ 8 words and its last non-space character is not one of `. ! ? : ) ] " ' ” ’ …` | Inline correctness card, severity critical, on the last word. Fix: append "." (if it ends in "," or ";", the fix replaces that mark with "."). Title *Add a full stop* · message *This paragraph ends without a full stop.* |
| D6.2 | `paragraph-same-start` | ≥ 3 consecutive sentences start with the same word. For "The/A/This/It/There", require the same first **two** words. | Paragraph advice on the run: *{n} sentences in a row start with "{x}". Vary the openings, or combine them.* No fix. |
| D6.3 | `paragraph-long` | Words > limit: general 180, business 150, technical 200, academic 250 | Paragraph advice: *This paragraph has {n} words. Readers lose the thread in long blocks; consider splitting where the topic shifts.* No fix. |

- **Positive:** PB8, PB10, BE8, ME12, ES1, ES11, ES13.
- **Negative:**
  - goa-abstract.txt gives none (its paragraphs have 159 and 84 words; title and Keywords are exempt).
  - business-email salutation, "Regards," and signature lines give none.
  - The "Three actions matter most. First, … Second, … Third, …" paragraph gives none.
  - Methods with "We obtained … The readings … We then matched …" gives none (not consecutive).

### D8a Keywords not used in the text (P0)

- **Rule id:** `keyword-unused`. **Group:** keywords.
- **Detection:** split the Keywords line on `,` or `;`. For each keyword, take its content words (non-stopwords, hyphen parts split), stemmed: lowercase; strip a plural -s/-es; strip -ing/-ed/-ation/-isation/-ization/-ise/-ize; then compare the first 6 letters (or the whole word if shorter).
- The keyword counts as **used** if all its stems occur together in at least one sentence of the body (everything except title, headings and the Keywords line itself).
- **Output:** advice on the keyword in the Keywords line: *"{keyword}" is listed as a keyword but isn't discussed in the text.*
- **Positive:** ME2 ("heat stress").
- **Negative:**
  - goa-abstract.txt gives none ("Power sector decarbonisation" is matched by "decarbonising their power sector"; "renewable potential" by the sentence with "renewable resources … solar potential").
  - methods.clean.txt gives none ("smart meters" ↔ "smart-meter readings", "cooling demand" ↔ "demand for cooling", "household survey" ↔ "survey of 412 households").

### N6 and N7 (P0, small)

- **N6:** remove obtain/obtained/obtains → get/got/gets from `PLAIN_WORDS`. In research and policy prose it lowers register; methods.clean.txt currently gets "obtained" → "got". Test: methods.clean.txt gives no plain-word card under the default domain.
- **N7:** R10 (title-case) never treats header lines (`Subject:`, `Re:`, `Fwd:`, `From:`, `To:`, `Cc:`, `Date:`) as headings. Test: "Subject: Revised schedule for the Margao Substation Upgrade" gives no title-case card.

### P1 rules (brief specs; tests in the keys where marked P1)

- **R14a `intro-clause-comma`:**
  - Pattern: sentence-initial `(If|When|Although|Though|Because|Since|While|Unless|Once|After|Before|Whereas)` + ≥ 5 tokens with no comma, then a subject `(I|we|you|he|she|it|they|this|these|there|the \w+ (is|are|was|were|has|have|will|can))` followed by a finite verb or modal.
  - Fix: insert "," before the subject.
  - Positive: BE12. Negative: "When it rains we stay in." (< 5 tokens); "Although costs fell, demand rose."; "If so, we proceed."
- **IE1 `register-in`** (business/academic domain or formal goal; advice cards, style severity, never correctness):
  - Kindly → Please (fix).
  - do the needful (advice: *say what you need done*).
  - prepone → bring forward (fix; add the words to CLOSED).
  - revert (meaning reply: followed by "with", "back", "to me/us" or "at the earliest") → reply (fix). Skip "revert to" + non-pronoun (= return to).
  - as per → according to (fix).
  - the said + noun (advice).
  - out of station → away (fix).
  - updation → update (fix).
  - since + number + (years|months|days|weeks) → "for" (correctness).
  - years back → years ago (fix).
  - Positive: BE9, BE10, BE13, BE15, BE16. Negative: "The tariff will revert to the 2022 level."; "Please confirm"; the clean email.
- **D3b `date-format`:** classify dates as "12 June 2024" / "June 12, 2024" / "12/06/2024" / "2024-06-12". Majority wins and the minority gets a fix only between the two spelled-month styles. Numeric dates get advice (day/month order is ambiguous). Positive: BE5, BE6.
- **D1b:** "data is/was/has" vs "data are/were/have" in the same document: advice when both occur.
- **D2b:** as in the D2 table.
- **D7:** panel statistics per paragraph (words, sentences, average and longest sentence, Flesch). One advice when ≥ 5 sentences all fall within ±3 words of the mean (*monotone rhythm*), or the average is > 30 words.
- **D8b `title-term-unused`:** content words of the title (≥ 4 letters, stems as D8a) absent from the body. Skip title-case titles that look like a report name (all words capitalised and the title contains a year).
- **B6:** passive rewrite for coordinated agents ("by X and Y" with each conjunct ≤ 4 tokens) with a plural verb.
- **B7:** "not only … but" without "also" (advice + fix "but also"); dangling-modifier subset from round 1 (advice).

---

## 4. UI specs

### G1 Guidance panel (P0)

- **Entry point:** a **"Guidance"** tab beside All/Correctness/Clarity/Engagement/Delivery, with a count. It opens a panel that replaces the card list (same column).
- **Layout:** sections in fixed order: Consistency · Acronyms · Numbers · Evidence · Structure · Tense · Keywords. Empty sections are hidden. Each finding shows:
  - a one-line title (e.g. *"per cent" (4) vs "percent" (1)*);
  - the plain explanation from `rule-info` (name, explanation, ✗/✓ example);
  - an instance list: each row shows about 60 characters of context with the instance in bold. Clicking a row scrolls the editor there and highlights the span.
  - **Make consistent (n)** (D1, D3a): applies every minority fix of the set in **one undo step**, via a composed multi-edit like U1 (a single `replaceRange` over the smallest covering range). Each fix passes the guard on its own, and the composed text is re-checked with `maxGrowth` = the sum of the parts.
  - **Dismiss** / **Turn off this check**, as on cards.
- **Highlighting:** document findings draw no underlines until opened. When a finding is open, all its instances get a soft background highlight in the mirror (no glyph changes, so alignment is safe).
- **Header line:** "Guidance: {n} document notes" next to the existing severity counts. Guidance findings affect the score only through their inline cards (consistency style 0.3, paragraph-end critical 3). Advice-only document findings weigh 0.
- **Empty state:** "No document-level issues found. Consistency, acronyms, numbers, claims, paragraph structure, tense and keywords were checked."

### G2 Explanations (P0)

Every new rule id has a `rule-info` entry with name, explanation and a ✗/✓ example. Examples:
- `acronym-before-definition`: ✗ "GED supplies … The Goa Electricity Department (GED) reported …" → ✓ "The Goa Electricity Department (GED) supplies … GED reported …".
- `study-tense`: ✗ "This paper examines … The assessment will use …" → ✓ "This paper examines … The assessment uses …".

### G3 (P1)

Per-paragraph statistics (D7) in the Performance view, with a mini bar per paragraph showing average sentence length.

---

## 5. Test bed

### 5.1 New fixtures (added by me under `tests/fixtures/round6/`)

| Document | Kind | Domain for the test | Errors version: seeded items | Clean version |
|---|---|---|---|---|
| `policy-brief` | Policy brief, UK spelling, Indian number grouping | formal goal | 15 (P0) | must be silent |
| `business-email` | Business email, Indian English | business + formal | 16 (4 P0, 4 existing, 8 P1) | must be silent |
| `methods` | Research abstract + keywords + methods | academic | 12 (P0) | must be silent |
| `exec-summary` | Report executive summary | business | 13 (P0) | must be silent |

Each `*.key.json` has `mustFlag` entries (rule id, exact match substring, 1-based occurrence, required first fix or `null` for advice, priority) and `mustNotFlag` entries (rule id or a wildcard, substring, reason).

**Test harness to add, `tests/round6.test.js`:**
- for each key: run `runChecks(errors, options)` and `runGuidance(errors, options)` together;
- for every `mustFlag` entry with priority P0 or existing, assert that a finding with that rule id has a span (or instance) overlapping the occurrence, and that the first fix equals `fix` when `fix` is not null;
- P1 entries are asserted once P1 is built and skipped (`test.todo`) until then;
- assert no `mustNotFlag` violation;
- assert **no correctness card whose span is outside every mustFlag entry** (no spurious errors).

### 5.2 Existing fixtures

goa-abstract.txt, clean-academic.txt and stress-clean 1–4 are re-run with guidance on.

---

## 6. Acceptance criteria

- **F1 No regressions.** All 159 existing tests pass. goa-abstract.txt still gives the same 14 inline cards with the same first fixes. clean-academic.txt and stress-clean 1–4 still pass their round-1 to round-5 rules.
- **F2 Recall on seeded errors.** For each of the four errors fixtures, under the key's options, **every P0 and "existing" `mustFlag` entry is satisfied** (rule id, overlapping span, exact first fix where given). That is 15 + 4 + 12 + 13 = 44 P0 entries and 4 existing ones.
- **F3 Precision on seeded errors.** On the four errors fixtures, no `mustNotFlag` entry is violated, and there is **no correctness card outside the answer key**.
- **F4 Clean documents are silent.** Each of the four clean fixtures, under the key's options **and** under default options, gives **0 correctness cards and 0 guidance findings**. Clarity/engagement advice cards without fixes are allowed. (Today only "is projected" passive advice appears; N6 removes "obtained → got".) clean-academic.txt: 0 cards and 0 guidance findings under default and academic.
- **F5 goa-abstract guidance.** `runGuidance(goa)` returns **exactly one** finding: `study-tense` (advice), listing "examines", "is aimed" vs "will use", "will also help". Under default and academic there are no other guidance findings and no unsupported-claim card.
- **F6 Unit tests.** Every positive and negative case in §3 for B1–B4, D1–D6, D8a, N6 and N7 is a test, and all pass.
- **F7 Guard.**
  - The `docVariant` allowance only lets in words that occur elsewhere in the document; a test with an outside word fails.
  - Numeric regrouping passes.
  - All other guard tests are unchanged.
  - Every fix produced on all fixtures passes `checkFix`.
  - "Make consistent" is one undo step, and its composed text passes `checkFix`.
- **F8 Explanations.** `rule-info` has name, explanation and example for every new rule id. The Guidance panel renders the sections, instance jump and Make consistent (manual browser check, reported with a screenshot description in the impl notes).
- **F9 Performance.** `runChecks` + `runGuidance` on a 2,000-word document: p95 < 60 ms combined.
- **F10 P1 (non-blocking).** Report which P1 items were built. For each one built, its key entries (BE5, BE6, BE9, BE10, BE12, BE13, BE15, BE16) pass, and F3/F4 still hold.

Sign-off = F1–F9 green, plus my fresh stress pass on the new document rules finding no High defect.
