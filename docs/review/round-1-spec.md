# Plainly: round 1 review and implementation spec

Reviewer: PhD (English linguistics, grammar and usage; academic and policy editing; evaluation of writing-assistance software).
Inputs: `tests/fixtures/goa-abstract.txt`, `docs/review/grammarly-observed.md`, engine source at review time (69/69 tests passing).
Hard constraints that apply to everything below: no generated text, small local edits, nothing applied without a click, and every fix must pass `src/engine/guard.js`. Every replacement word a rule can insert is listed in its spec, so it can go into a fixed list in `src/engine/data`.

---

## 1. Verdict on the current tool

**Score: 2 / 10 against Grammarly on this text.**

What Plainly flags today on `goa-abstract.txt` (default options):

| # | Rule | Span | Fix offered | Verdict |
|---|---|---|---|---|
| 1 | plain-word | "demonstrates" | "shows" | Acceptable, but low value in academic prose. "Demonstrates" is standard academic register. |
| 2 | long-sentence | "With limited land resources … procured power." (52 words) | none (advice) | Useful. This is the sentence an editor would split. |
| 3 | long-sentence | "In this context … growing demand." (36 words) | none | Marginal for an expert audience. |
| 4 | long-sentence | "The analysis is aimed at … procurement." (39 words) | none | Marginal, and it hides the three real problems in that sentence. |
| 5 | repetition | "states" | none | Noise. "States" is a topic term. |
| 6–9 | repetition ×4 | "power" | none | Noise. "Power" is the subject of the paper and occurs in the fixed terms "power sector" and "thermal power". Four cards for one word is the worst output on the page. |

Why the score is 2:

- **Overlap with Grammarly is 0 of 16 spans.** Plainly finds none of the agreement, parallelism, collocation, wordiness or nominalisation issues.
- **It misses real errors that Grammarly also missed:** "comprising **a** bulk" (the idiom is *the bulk of*), "the **Power** sector" in a sentence-case title, and inconsistent serial commas.
- **9 cards, and 5 of them are noise.** No card offers a one-click fix that improves the text, apart from "shows".
- **What it does well:** nothing it flags is wrong. Long-sentence detection works, it raises no false correctness errors, and the guard holds. The base is sound. What's missing is coverage of the grammar that academic and policy writers actually get wrong.

Target after round 1 (P0 + P1): about 7/10 on this text, with zero false positives on clean academic prose.

---

## 2. The 16 Grammarly flags

How to read this table: "Plainly today" is always "not flagged" (the repetition and long-sentence cards don't address any of these issues). In the "Kind" column, *error* means a breach of standard grammar or usage, *clarity* means a defensible improvement, and *style* means preference. Grammarly is wrong or over-eager where marked ✗.

| # | Span (context) | What Grammarly is flagging | Kind | Required Plainly behaviour (exact fix · message) | Pri | Rule |
|---|---|---|---|---|---|---|
| 1 | "that the" (*the policy direction **that the** states take*) | Optional relative-pronoun deletion ("the direction the states take"), possibly also "the states" → "states". | style ✗ | **Do not flag.** The relative "that" is optional and grammatical, and "the states" correctly refers to India's states. Deleting it saves one word and makes the sentence harder to parse. | — | won't do |
| 2 | "in transforming" | Preposition + gerund → infinitive of purpose: "take **to transform**". | style ✗ | **Do not flag in round 1.** "The direction states take in transforming X" is grammatical; *take* is transitive with its object relativised. A rewrite to "take to transform" is safe only after a relativised object, which can't be detected reliably. Optional P2 advice (R22). | P2 | R22 |
| 3 | "decarbonising" | Part of #2: keeps the pair parallel ("to transform and decarbonise"). | style ✗ | Same as #2. | P2 | R22 |
| 4 | "The planning and implementation of this transition **is**" | Subject–verb agreement with a compound subject joined by *and*. | error (notional singular is arguable) | Underline "is". Fix: **"are"**. Title: **Subject–verb agreement**. Message: *Two nouns joined by "and" ("planning and implementation") form a plural subject, so the verb is plural. Keep "is" only if you mean one combined process.* | **P0** | R1 |
| 5 | "the pathway" | Article choice: "**a** pathway", since the paper proposes one of several possible pathways. | style ✗ | **Do not flag.** The definite article is defensible: the paper examines a specific pathway for a named state, and the title uses "the pathway" too. A/the choice on first mention can't be decided by rule without many false positives. | — | won't do |
| 6 | "**a centralised**" (*both a centralised and decentralised approach*) | Faulty parallelism after *both … and*: the article covers only the first adjective. | error | **One card** spanning "both a centralised and decentralised approach". Fix 1: **"both centralised and decentralised approaches"**. Fix 2: **"both a centralised and a decentralised approach"**. Title: **Make "both … and" parallel**. Message: *After "both", the two halves should match. "a" covers only "centralised", so either repeat it or make the noun plural.* | **P0** | R2 |
| 7 | "approach," | Same issue (noun number). Possibly also the interrupting comma pair that splits "the pathway … for the state to decarbonise". | error (same as #6) + clarity | Covered by the #6 card (the span includes "approach"). The interrupter is P2 advice (R23): *The phrase between the commas separates "pathway" from "for the state to …". Consider moving it to the end of the sentence.* | **P0** (via R2); P2 for R23 | R2, R23 |
| 8 | "its" (*building **its** internal generation capacity*) | Pronoun ambiguity or repetition (three uses of *its* in one clause). | style ✗ | The antecedent ("the state") is unambiguous, so Grammarly is over-eager. The real weakness is "its **sector**" (which sector?), and no rule can fix that. P2 advice only (R21): *This sentence uses "its" three times. Check that each one refers to "the state", or name it once ("the state's").* No fix. | P2 | R21 |
| 9 | "its" (*to meet **its** growing demand*) | As #8. | style ✗ | Same card as #8 (one card per sentence, not per pronoun). | P2 | R21 |
| 10 | "is aimed at identifying" | Wordy passive + preposition + gerund → active verb + infinitive. | clarity | Fix: **"aims to identify"**. Title: **Wordy: use the active verb**. Message: *"Is aimed at doing" is a roundabout passive. "Aims to do" says the same thing in fewer words.* | **P0** | R3 |
| 11 | "in terms of" | Wordy, vague connector. | clarity | **Advice only** (no safe one-word replacement here). Title: **Vague phrase: "in terms of"**. Message: *"In terms of" is vague. Say how the two things relate, e.g. "feasible at its levelised cost" or "cost-effective".* | **P0** | R7 |
| 12 | "suitable to" | Collocation: *suitable* takes *for*; *suited* takes *to*. | error (usage) | Fix 1: **"suitable for"**. Fix 2: **"suited to"**. Title: **Preposition: "suitable for"**. Message: *The usual pairing is "suitable for" (or "suited to").* | **P0** | R4 |
| 13 | "can support" (*financially feasible …, suitable …, and **can support** …*) | Faulty parallelism in a series: two adjective phrases, then a verb phrase. | error | Fix 1: **"able to support"**. Fix 2 (only when the series follows "that are"/"which are"): **"that can support"**. Title: **Keep the list parallel**. Message: *The first items in this list are adjectives ("feasible", "suitable"), so the last one should be too: "able to support". Or make it a separate clause: "that can support".* | **P0** | R5 |
| 14 | "in reducing" (*support the state **in reducing***) | "Support X in doing" → "help X do". | style ✗ | "Support someone in doing something" is standard English. P2 optional clarity card (R22b) with fix **"help the state reduce"** on the span "support the state in reducing". Severity: style. | P2 | R22b |
| 15 | "the decarbonisation of" (*plan **the decarbonisation of** their power sector*) | Nominalisation → verb. Grammarly's own fix, "decarbonising", gives "plan decarbonising", which is unidiomatic. | clarity | Fix: **"how to decarbonise"** (→ "plan how to decarbonise their power sector"). Title: **Use the verb, not the noun**. Message: *"The decarbonisation of" turns an action into a noun. "How to decarbonise" is shorter and names the action.* | **P0** | R8 |
| 16 | "power sector." (*states … their **power sector***) | Number agreement: distributive plural ("states … their power sectors"). | style | Distributive singular is acceptable, especially in British usage. P2 advice with fix **"power sectors"** (R20). Message: *Each state has its own power sector, so the plural "power sectors" may read more naturally.* | P2 | R20 |

**Coverage:** P0 covers flags 4, 6, 7, 10, 11, 12, 13 and 15 (**8 of 16**). P2 adds 8, 9, 14 and 16 (**12 of 16**). Flags 1, 2, 3 and 5 are deliberately not flagged (Grammarly over-eager, or not decidable by rule). #2 and #3 may get P2 advice.

**Issues Grammarly missed that Plainly must flag (P0/P1):**

| Span | Issue | Fix | Pri | Rule |
|---|---|---|---|---|
| "comprising **a bulk** (80 per cent) of" | Fixed idiom: *the bulk of* | "the bulk" | **P0** | R6 |
| "Decarbonisation of the **Power** sector …" (sentence-case title) | Inconsistent capitalisation in a title | "power" | P1 | R10 |
| "an environmentally sensitive ecosystem **and** inconsistent wind resources" vs "energy storage potential**, and** biomass availability" | Inconsistent serial (Oxford) comma | "ecosystem, and" | P1 | R9 |

---

## 3. Rule specs

**Rule index**

| Priority | Rules |
|---|---|
| P0 (8) | R1 compound-subject agreement · R2 both…and parallelism · R3 "be aimed at V-ing" and purpose wordiness · R4 preposition/collocation list · R5 non-parallel series · R6 fixed article idioms · R7 vague connectors · R8 nominalisation (core) |
| P1 (9) | R2b other correlatives · R6b "one of the + singular" · R9 serial comma consistency · R10 title capitalisation · R11 hyphenation · R12 gerund vs infinitive · R13 pronoun–antecedent number · R15 per cent consistency · R16 redundancy list |
| P2 (7) | R14 comma rules · R17 academic vague words · R20 distributive plural · R21 pronoun density · R22 purpose/help constructions · R23 interrupted complement · dangling modifiers |

**Coverage map: rule families a Grammarly-class checker has**

| Family | Plainly today | Here |
|---|---|---|
| Compound-subject agreement | none (only pronoun/quantifier agreement) | R1 |
| Collocation / dependent prepositions | none | R4 |
| Gerund vs infinitive | none | R3, R12 |
| Nominalisation | 2 WORDY entries | R8 |
| Articles | a/an only | R6, R6b (a/the on first mention: deliberately not attempted) |
| Parallelism (series, correlatives) | none | R2, R2b, R5 |
| Pronoun–antecedent | none | R13, R21 |
| Dangling modifiers | none | P2 subset |
| Commas: introductory, clauses, serial | intro adverbs only | R9, R14 |
| Hyphenation of compound modifiers | none | R11 |
| Title capitalisation | none | R10 |
| per cent / percent | none | R15 |
| Redundancy | ~30 entries | R16 |
| Weak/vague academic words | hedges under confident goal | R7, R17 |
| Sentence length and variety, readability | long-sentence card + score panel | N2; P2: in the performance panel, show the share of sentences over 30 words and the standard deviation of sentence length (stats only, no cards) |

### 3.0 Shared implementation notes (read first)

- **New files:**
  - `src/engine/rules/usage.js` (R1–R8, R20–R23), registered in `index.js`, with category per rule.
  - `src/engine/data/usage-lists.js` (every list below).
  - `src/engine/data/rule-info.js` (name, explanation and example per rule id, for the UI).
  - `tests/round1.test.js` (every positive and negative case in this document, verbatim).
- **Guard vocabulary:** `guard.js` must `addAll()` every replacement string from `usage-lists.js` into `CLOSED`, the same way it does for `WORDY`. Verified today with `checkFix` on the fixture: "aims" and "suited" are **rejected** ("adds outside word"). "are", "able", "for", "the bulk", "how to decarbonise", "approaches" and "power" pass. So these must be added explicitly: `aim aims aimed suited able how help` and the base and -ing forms of every verb in `NOMINALISATIONS`.
- **New morph helpers (in `morph.js`, unit-tested):**
  - `baseFromIng(w)`: strip "ing"; undouble only for stems in the existing `DOUBLE_ING` set or monosyllables matching CVC (plan, run, get, stop); then add "e" when `needsE(stem)`. Test table: identifying→identify, reducing→reduce, planning→plan, improving→improve, making→make, assessing→assess, analysing→analyse, using→use, building→build, meeting→meet, getting→get, decarbonising→decarbonise, transforming→transform, offering→offer, visiting→visit, controlling→control, being→be.
  - `pluralize(n)`: -s/-x/-z/-ch/-sh → +es; consonant+y → -ies; irregulars: analysis→analyses, basis→bases, crisis→crises, hypothesis→hypotheses, criterion→criteria, phenomenon→phenomena, child→children, person→people. Test: approach→approaches, policy→policies, sector→sectors, route→routes, school→schools.
  - `singularVerb→plural` map: is→are, was→were, has→have, does→do, and third-person -s verbs from a fixed list (remains→remain, seems→seem, appears→appear, requires→require, depends→depend, poses→pose, involves→involve, needs→need, faces→face, presents→present).
- **Shared token classes (in `usage-lists.js`):**
  - `DET_POSS` = a an the this that these those its their our his her my your each every all most many some no any two three four several such.
  - `PREPOSITIONS` = of in on at by for with from to into onto over under about across through between among against towards toward during before after without within via per.
  - `MODALS` = can could may might will would shall should must.
  - `BE` = am is are was were be been being.
  - `ADJ_SUFFIX` = /(able|ible|al|ial|ic|ical|ive|ous|ful|less|ant|ent|ary|ory|ish|ised|ized|ed|ern|ar)$/.
  - `ADJ_LIST` = new old large small short long high low public private local national urban rural formal informal cheap easy simple safe clean fast slow ready free fit viable green open closed dry wet hot cold.
  - `NOUN_SUFFIX` = /(tion|sion|ment|ance|ence|ity|ness|ship|ure|ysis|sis|ogy|ing|ism|age|ery|cy|th)$/.
  - `NOUN_LIST` = design use cost growth demand supply research policy law plan work change control access risk value price power energy data trade.
  - `BASE_VERBS`: a closed list of about 400 common verbs in base form, used wherever a rule needs "next word is a bare infinitive". Seed it from `PAST_TO_BASE`, `IRREGULAR_BASE` and the verbs in the R12 lists, plus about 300 regular academic verbs (analyse/analyze, assess, build, compare, develop, estimate, evaluate, examine, identify, improve, increase, measure, meet, model, plan, provide, reduce, support, test, use …).
- **Quotes and code:** every new rule skips matches inside quotes (existing `insideQuotes`) and on lines starting with "Keywords:" unless stated otherwise.
- **Severity:** every new suggestion carries `severity: 'critical' | 'advanced' | 'style'` (see U3) and `ruleName` (see U2).

---

### R1 Compound-subject agreement (P0)

- **Category:** correctness · **Severity:** critical · **ruleName:** "Subject–verb agreement"
- **Detection:** for each sentence `s` from `splitSentences`:
  1. Strip an optional opener: `^[A-Z][^,]{0,50},\s+` (e.g. "In this context, ").
  2. Match `^(The|This|Its|Their|Our|Such)\s+(N1)\s+and\s+(?:the\s+|its\s+|their\s+)?(N2)\s+(of|for|in|on|at|to)\s+` (case-insensitive after the opener). N1 and N2 are single tokens; each must match `NOUN_SUFFIX` or `NOUN_LIST`, must not end in "s" unless in `SINGULAR_S`, and must not match `ADJ_SUFFIX` unless it also matches `NOUN_SUFFIX` (so "planning" and "implementation" qualify, "economic" doesn't).
  3. From the preposition onwards, scan at most 12 tokens to the first token in `{is, was, has, does}` ∪ third-person list. Abort if a comma, semicolon, colon, dash or any of `which that who whom whose where when` appears first (the verb may belong to a relative clause), or if another verb from `BE ∪ MODALS ∪ {has, have, had}` appears first.
  4. Underline only the verb token.
- **Guards (no flag):**
  - (a) "N1 and N2" is in `UNIT_BINOMIALS`: research and development, trial and error, law and order, bread and butter, wear and tear, rock and roll, health and safety, supply and demand, cause and effect, give and take, profit and loss, peace and quiet, hustle and bustle, operation and maintenance, monitoring and evaluation, checks and balances (already plural).
  - (b) "each" or "every" precedes N1.
  - (c) The token right after N2 isn't a preposition (e.g. "The planning and design **team** is" is a compound modifier, so singular is correct).
  - (d) Inside quotes.
- **Fix:** verb → plural via the map (is→are, was→were, has→have, does→do, -s verb → base). **Inserts:** are were have do + base forms in the list (all already allowed, or add to CLOSED).
- **Card:** title "Subject–verb agreement" · message: *Two nouns joined by "and" ("{N1} and {N2}") form a plural subject, so the verb is plural. Keep "{verb}" only if you mean one combined process.*
- **Example (rule-info):** "The design and testing of the tool **is** slow." → "**are** slow".
- **Positive tests:**
  - "The planning and implementation of this transition is particularly challenging for resource-constrained states." → `is` → `are`
  - "The design and construction of the plant was delayed." → `was` → `were`
  - "The cost and complexity of storage has risen." → `has` → `have`
  - "In this context, the planning and implementation of the policy is difficult." → `is` → `are`
  - "The planning and the implementation of the scheme remains slow." → `remains` → `remain`
- **Negative tests (must not flag):**
  - "The economic and social impact of the policy is large."
  - "The research and development budget is small."
  - "Research and development is a priority for the state."
  - "Each policy and programme is reviewed annually."
  - "The planning and design team is based in Panaji."
  - "The planning and implementation of this transition are particularly challenging."
  - "The analysis of planning and implementation is complex."
  - "The planning and implementation of the scheme, which is run by the state, are slow."
  - "The supply and demand of electricity is balanced hourly."

### R2 Correlative parallelism: "both a X and Y N" (P0) and other correlatives (R2b, P1)

**R2 (P0)**

- **Category:** correctness · **Severity:** advanced · **ruleName:** "Faulty parallelism"
- **Detection:** `/\bboth\s+(a|an)\s+([a-z-]+)\s+and\s+(?!a\b|an\b|the\b)([a-z-]+)\s+([a-z-]+)\b/gi`.
  - g2 and g3 must be adjective-like (`ADJ_SUFFIX` or `ADJ_LIST`, or g3 = "de"+g2 / "non-"+g2 style) and must not end in -ly.
  - g4 must be a singular noun: not in `STOPWORDS`, not ending in -ly, not in `BASE_VERBS ∪ MODALS ∪ BE`, and not ending in "s" (unless in `SINGULAR_S`).
  - Abort if the next token after g4 is "and" or "or" (nested coordination).
- **Span:** from "both" to the end of g4.
- **Fixes:**
  1. `both {g2} and {g3} {pluralize(g4)}`.
  2. `both {g1} {g2} and {a|an by wantsAn(g3)} {g3} {g4}`. Reuse `wantsAn` from `correctness.js`; export it.
- **Inserts:** a, an, the noun's plural (a form of the writer's word).
- **Card:** title `Make "both … and" parallel` · message: *After "both", the two halves should match. "{g1}" covers only "{g2}", so either repeat it or make the noun plural.*
- **Example:** "both a short and long route" → "both short and long routes".
- **Positive tests:**
  - "considering both a centralised and decentralised approach, for the state" → fix1 `both centralised and decentralised approaches`, fix2 `both a centralised and a decentralised approach`
  - "The fund supports both an urban and rural school." → `both urban and rural schools` / `both an urban and a rural school`
  - "We tested both a short and long route." → `both short and long routes` / `both a short and a long route`
- **Negative tests:**
  - "considering both centralised and decentralised approaches"
  - "considering both a centralised and a decentralised approach"
  - "She was both a mentor and friend."
  - "both a teacher and a parent"
  - "both a cause and effect of growth"
  - "both a public and private sector and a regulator"

**R2b other correlatives (P1)**

- **Category:** correctness · **Severity:** advanced. All fixes use only the writer's words plus `and or nor also`.

| Pattern (same sentence) | Fix | Guard |
|---|---|---|
| `neither` … `or` (first "or" within 12 tokens, no intervening "nor") | or → nor | skip if "either" occurs between them |
| `either` … `nor` | nor → or | — |
| `between X or Y` (X ≤ 4 tokens) | or → and | skip "between … and … or" |
| `both X as well as Y` | "as well as" → "and" | X ≤ 6 tokens |
| `not only` … `, but` (no "also" within 2 tokens after "but") | advice: *"Not only … but also" is the usual pairing.* Fix: "but also" | skip if "but" starts an independent clause (followed by a subject pronoun + verb) |

- **Positive tests:** "Neither the state or the centre pays." → `nor`. "Either solar nor wind is enough." → `or`. "a choice between solar or wind" → `and`. "both solar as well as wind" → `and`.
- **Negative tests:** "Neither the state nor the centre pays." "between 2020 and 2030" "Either solar or wind is enough." "Not only is it cheap, but it is also clean."

### R3 Wordy purpose constructions: "be aimed at V-ing" (P0)

- **Category:** clarity · **Severity:** advanced · **ruleName:** "Wordy phrase"
- **Detection:** `/\b(is|are|was|were)\s+aimed\s+at\s+([a-z]+ing)\b/gi`. g2 must reduce to a known verb: `baseFromIng(g2) ∈ BASE_VERBS`.
- **Fix:** is→`aims to {base}`, are→`aim to {base}`, was/were→`aimed to {base}`.
- Also in the same rule, as a phrase table (fix replaces the whole span):
  - `with the aim of V-ing` → `to {base}`
  - `with a view to V-ing` → `to {base}`
  - `in an effort to` → `to`
  - `in an attempt to` → `to`
- **Inserts:** aim aims aimed to + base form (add `aim aims aimed` to CLOSED).
- **Guards:**
  - No flag when "aimed at" is followed by a non-gerund ("aimed at young voters", "aimed at the target").
  - No flag in reduced relatives without "be" ("a policy aimed at improving access").
  - Make sure the existing passive rule doesn't also fire on the same span ("aimed" is already in `ADJECTIVE_PARTICIPLES`; keep it there).
- **Card:** title `Wordy: use the active verb` · message: *"{original}" is a roundabout passive. "{fix}" says the same thing in fewer words.*
- **Example:** "The study is aimed at measuring demand." → "The study aims to measure demand."
- **Positive tests:**
  - "The analysis is aimed at identifying a mix of technologies" → `is aimed at identifying` → `aims to identify`
  - "These measures are aimed at reducing losses." → `aim to reduce`
  - "The scheme was aimed at improving access." → `aimed to improve`
  - "We changed the tariff with the aim of reducing demand." → `with the aim of reducing` → `to reduce`
  - "in an effort to cut costs" → `to`
- **Negative tests:**
  - "The campaign is aimed at young voters."
  - "a policy aimed at improving access"
  - "The analysis aims to identify a mix of technologies."
  - "The gun was aimed at the target."

### R4 Preposition and collocation list (P0)

- **Category:** correctness · **Severity:** advanced · **ruleName:** "Preposition choice" (or "Redundant preposition" where the fix deletes one)
- **Detection:** a data table `COLLOCATIONS = [{re, fixes:[...], next?, prev?, msg}]`. `next` is a guard on the token after the match, `prev` on the token before.
  - `next: 'np'` means: next token ∈ `DET_POSS`, or is capitalised (not sentence-initial), or ends in "'s", or is a number.
  - `next: 'ing'` means: next token ends in -ing and `baseFromIng ∈ BASE_VERBS`.
  - `next: 'base'` means: next token ∈ `BASE_VERBS`.
  - `prev: 'subj'` means: previous token ∈ {I, we, you, they, he, she, it, to} ∪ `MODALS`, or the match starts a sentence.
- Every verb pattern covers all inflections (discuss/discusses/discussed/discussing).
- **Inserts:** for with on in of to from suited able (only "suited" and "able" are new to CLOSED; "able" is already in via WORDY).

| # | Pattern | Fix(es) | Guard | Message |
|---|---|---|---|---|
| 1 | suitable to | suitable for · suited to | next: np | The usual pairing is "suitable for" (or "suited to"). |
| 2 | capable to | able to | next: base | "Capable" takes "of" + -ing; "able to" keeps your verb. |
| 3 | responsible of | responsible for | — | "Responsible" takes "for". |
| 4 | interested for | interested in | — | "Interested" takes "in". |
| 5 | dependent of · reliant of | dependent on · reliant on | — | Use "on". |
| 6 | reliance in | reliance on | — | "Reliance" takes "on". |
| 7 | independent on | independent of | — | "Independent" takes "of". |
| 8 | consistent to | consistent with | — | "Consistent" takes "with". |
| 9 | similar with | similar to | — | "Similar" takes "to". |
| 10 | superior than · inferior than | superior to · inferior to | — | "Superior" and "inferior" take "to", not "than". |
| 11 | comprise(s/d)? of · comprising of | comprise(s/d) · comprising (delete "of") | skip "is/are comprised of" (contested, P2 advice) | "Comprise" means "consist of", so it takes no "of". |
| 12 | discuss(es/ed/ing)? about | discuss… (delete "about") | — | "Discuss" takes a direct object. |
| 13 | emphasi[sz](e/es/ed/ing) on | delete "on" | prev: subj, or a verb form ending -es/-ed/-ing | The verb "emphasise" takes a direct object. |
| 14 | cope(s/d)? up with · coping up with | cope… with | — | The phrasal verb is "cope with". |
| 15 | in accordance to · in compliance to | in accordance with · in compliance with | — | The fixed phrase is "in accordance with". |
| 16 | contribut(e/es/ed/ing) in + V-ing | contribute… to | next: ing | "Contribute" takes "to". |
| 17 | result(s/ed)? into | result… in | — | "Result" takes "in". |
| 18 | based off | based on | — | "Based on" is the standard form. |
| 19 | investment(s)? on | investment… in | skip "return on investment" (pattern doesn't match it anyway) | "Investment" takes "in". |
| 20 | reason of | reason for | skip "by reason of" | "Reason" takes "for". |
| 21 | aware about | aware of | — | "Aware" takes "of". |
| 22 | focus(es/ed/ing)? around | focus… on | — | "Focus" takes "on". |
| 23 | conducive for | conducive to | — | "Conducive" takes "to". |
| 24 | (impact\|effect)s? over | … on | — | Use "on" ("impact on"). |
| 25 | request(s/ed)? for (verb use) | request… (delete "for") | prev: subj | As a verb, "request" takes a direct object. "A request for" (noun) is fine. |
| 26 | insist(s/ed)? to + base | insist… on + ing | next: base | "Insist" takes "on" + -ing. |
| 27 | succeed(s/ed)? to + base | succeed… in + ing | next: base | To manage something is "succeed in doing". |
| 28 | demand of (electricity\|power\|energy\|water\|goods\|services\|housing\|land) | demand for | — | "Demand for" names what is wanted; "demand of" names who wants it. |
| 29 | different than | advice only: *British usage prefers "different from".* | only when dialect is UK or auto-detected UK | — |

- **Card:** title `Preposition: "{fix}"` · message from the table.
- **Example:** "suitable to the site" → "suitable for the site".
- **Positive tests:**
  - "suitable to Goa's geography" → `suitable for` / `suited to`
  - "The plan comprises of three phases." → `comprises`
  - "We discussed about the tariff." → `discussed`
  - "The report emphasises on cost." → `emphasises`
  - "The scheme is consistent to national policy." → `consistent with`
  - "The firm is capable to deliver it." → `able to`
  - "The outage resulted into losses." → `resulted in`
  - "demand of electricity rose" → `demand for`
- **Negative tests:**
  - "The land is suitable for solar."
  - "The land is suitable to cultivate."
  - "the dependence of Goa on imports"
  - "a request for funds"
  - "the stress on the grid"
  - "the demand of the users"
  - "It contributes in many ways."
  - "return on investment"
  - "The board discussed the tariff."

### R5 Faulty parallelism in a series ending in a modal verb phrase (P0)

- **Category:** correctness · **Severity:** advanced · **ruleName:** "Faulty parallelism"
- **Detection:** within one sentence, regex (case-insensitive):

  ```
  \b(is|are|was|were|be|remain|remains)\s+((?:\w+ly\s+)?ADJ)\b([^,;:]*),\s+((?:\w+ly\s+)?ADJ)\b([^,;:]*),?\s+and\s+(can|could|may|might|will|would)\s+(\w+)
  ```

  ADJ = a token matching `ADJ_SUFFIX` or `ADJ_LIST`.
  - The two segments `([^,;:]*)` must contain no token from `BE ∪ MODALS ∪ {has, have, had}` and no subject pronoun.
  - No token between "and" and the modal (so "and **it** can" is a new clause and is skipped).
- **Fixes:**
  1. If the modal is "can" **and the verb is in `CAPABILITY_VERBS`** (support meet handle deliver provide serve supply run operate scale store generate absorb cover reach process carry produce compete adapt replace integrate reduce cut lower power host): `able to {verb}` (span = "can {verb}"). *(Round 2, F4: epistemic "can rise / can catch fire" is not ability.)*
  2. If "that" or "which" comes **directly before** the be-verb (relative clause): `that can {verb}` (or `that {modal} {verb}` for other modals). *(Round 2, Q2: narrowed from "within 6 tokens", which matched the complementiser in "suggest that the plan is …".)*
  3. If neither applies: advice only.
  - If `{verb}` = "be": offer only fix 2 or advice (no "able to be").
- **Inserts:** able, that.
- **Card:** title `Keep the list parallel` · message: *The first items in this list are adjectives ("{adj1}", "{adj2}"), so the last one should be too: "able to {verb}". Or make it a separate clause: "that can {verb}".*
- **Example:** "The tool is fast, accurate, and can handle large files." → "… and able to handle large files."
- **Positive tests:**
  - "a mix of technologies that are financially feasible in terms of levelised cost, suitable to Goa's geography, and can support the state" → `can support` → `able to support` / `that can support`
  - "The tool is fast, accurate, and can handle large files." → `able to handle` (no "that" option)
  - "Options that are cheap, reliable and could scale quickly" → `that could scale` (advice + fix 2 only)
- **Negative tests:**
  - "The plan is cheap, simple, and it can be built quickly."
  - "The options are cheap and can be deployed fast."
  - "Solar is cheap, abundant and scalable."
  - "The technologies are feasible, suitable, and able to support the state."
  - "It is cheap, and we can build it."

### R6 Fixed article idioms (P0), plus "one of the + singular" (R6b, P1)

**R6 (P0)**

- **Category:** correctness · **Severity:** critical · **ruleName:** "Article in fixed phrase"
- **Table** (fix replaces the matched words only):

| Pattern | Fix | Guard |
|---|---|---|
| \ba bulk of\b | the bulk of | — |
| \ba bulk\s*\( … \)\s*of (parenthetical between) | a → the | parenthetical ≤ 6 tokens (covers "a bulk (80 per cent) of") |
| \bin a long run\b | in the long run | — |
| \bin the hindsight\b | in hindsight | — |
| \bat the first place\b | in the first place | — |
| \b(on\|in) the other words\b | in other words | — |
| \bthe most of (the\|our\|their\|its\|these\|those)\b | most of … | skip if preceded by make/makes/made/making/get/got |

- **Card:** title `Fixed phrase: "{fix}"` · message: *The idiom is "{fix}" ("the bulk of" means "most of").*
- **Positive tests:**
  - "with thermal power comprising a bulk (80 per cent) of the procured power" → span `a` (in "a bulk") → `the`
  - "a bulk of the funds" → `the bulk of`
  - "In a long run, costs fall." → `In the long run`
  - "the most of the states rely on imports" → `most of the`
- **Negative tests:**
  - "the bulk of the funds"
  - "We make the most of the sun."
  - "a bulk carrier"
  - "in the long run"
  - "bulk purchases"

**R6b one of the + singular noun (P1)**

- Regex: `\bone of the\s+((?:\w+\s+){0,2})(N)\b(?=\s+(that|which|who|is|was|in|for|of|to)|[,.])`, where N is a singular count noun: matches `NOUN_SUFFIX` or `NOUN_LIST`, doesn't end in s, and isn't in `UNCOUNTABLE` (information research evidence equipment advice data knowledge progress infrastructure electricity power energy water land).
- Fix: `pluralize(N)`.
- Positive: "one of the main reason for delay" → `reasons`.
- Negative: "one of the main reasons", "one of the research outputs", "one of the best", "one of the power stations".

### R7 Vague connectors and academic wordiness (P0; advice-first)

- **Category:** clarity · **Severity:** style · **ruleName:** "Vague phrase"
- **Table:** add to a new `WORDY_ADVICE` list (fix `null` = advice only).

| Phrase | Fix | Guard / note |
|---|---|---|
| in terms of | null | **Skip** after expressed / measured / defined / described / written / stated / thought / framed / calculated / quoted (technical use: "measured in terms of output"). |
| with regard to · with respect to | "on" · "about" | — |
| in relation to | "on" · "about" | skip after "inversely/directly/proportional" |
| the fact that | null | skip "despite the fact that" etc. (already in WORDY) |
| it is clear that · it is evident that | "" (delete) | formal/academic goal only |
| a number of | "several" · "some" | skip "the number of" (handled elsewhere) |
| in the context of | "in" | — |
| has the potential to | "can" · "could" | — |

- **Card for "in terms of":** title `Vague phrase: "in terms of"` · message: *"In terms of" is vague. Say how the two things relate, e.g. "feasible at its levelised cost" or "cost-effective".*
- **Positive tests:**
  - "financially feasible in terms of levelised cost" → advice card on `in terms of`, `fixes: []`
  - "with regard to tariffs" → `on` / `about`
- **Negative tests:**
  - "Output is measured in terms of energy delivered."
  - "The sum is expressed in terms of x."
  - "in the long term"

### R8 Nominalisation to verb (P0 core list, P1 extended list)

- **Category:** clarity · **Severity:** advanced · **ruleName:** "Nominalisation"
- **Data:** `NOMINALISATIONS = { decarbonisation: ['decarbonise','decarbonising'], decarbonization: ['decarbonize','decarbonizing'], implementation: ['implement','implementing'], assessment: ['assess','assessing'], evaluation: ['evaluate','evaluating'], examination: ['examine','examining'], investigation: ['investigate','investigating'], identification: ['identify','identifying'], reduction: ['reduce','reducing'], transformation: ['transform','transforming'], development: ['develop','developing'], establishment: ['establish','establishing'], improvement: ['improve','improving'], introduction: ['introduce','introducing'], measurement: ['measure','measuring'], management: ['manage','managing'], provision: ['provide','providing'], determination: ['determine','determining'], estimation: ['estimate','estimating'], expansion: ['expand','expanding'], integration: ['integrate','integrating'], allocation: ['allocate','allocating'], procurement: ['procure','procuring'], analysis: ['analyse','analysing'] /* US: analyze, analyzing */ }`. P0 needs at least these 24. P1 extends the list to 80.
- **Patterns:**
  - **(a) Preposition + "the NOM of" (P0):** `\b(for|in)\s+the\s+(NOM)\s+of\s+(?=\w)`. Fix replaces "the NOM of" with `{ing}` ("for the implementation of the plan" → "for implementing the plan"). *(Round 2, Q3/F7: only "for" and "in"; the ergative nouns development, expansion, transformation, integration, reduction and improvement are excluded from (a), because "the development of the city" means the city develops.)*
  - **(b) "plan the NOM of" (P0):** `\b(plan|plans|planned|planning|decide|decides|decided|deciding)\s+the\s+(NOM)\s+of\s+`. Fix replaces "the NOM of" with `how to {base}`. *(Round 2, Q2: learn/understand removed because "how to" changes the meaning.)*
  - **(c) light verb + NOM (P1, extends WORDY):** `(make|conduct|carry out|perform|undertake) (a|an|the) (assessment|evaluation|analysis|examination|investigation|estimation|measurement) of` → `{base}` (dialect-aware for analyse/analyze), keeping the verb's tense (made→past via morph). `provide an explanation of` → `explain`. `give a description of` → `describe`. `make a recommendation` → `recommend`. `reach a decision` → `decide`.
- **Guards:**
  - Skip if an adjective sits between "the" and NOM ("the rapid decarbonisation of"; a gerund would need an adverb).
  - Skip if "the NOM of" is the sentence subject (no preceding preposition or verb from (b)).
  - Skip if NOM is followed by "of" + a gerund ("the analysis of measuring").
  - Skip analysis/analyses when used as a count noun after a numeral or "an".
- **Inserts:** how, to, and the base/-ing forms in `NOMINALISATIONS` (add all to CLOSED).
- **Card:** title `Use the verb, not the noun` · message: *"{original}" turns an action into a noun. "{fix}" is shorter and names the action.*
- **Example:** "for the implementation of the plan" → "for implementing the plan".
- **Positive tests:**
  - "help other resource-constrained states plan the decarbonisation of their power sector." → `the decarbonisation of` → `how to decarbonise`
  - "funds for the implementation of the plan" → `implementing`
  - ~~"by the reduction of losses" → `reducing`~~ (removed in round 2: "by" and "reduction" are out of (a)). Replacement: "Delays in the implementation of the scheme raised costs." → `implementing`
  - (P1) "We conducted an assessment of demand." → `conducted an assessment of` → `assessed`
- **Negative tests:**
  - "Decarbonisation of the Power sector in a resource-constrained geography" (title, no determiner)
  - "The implementation of the plan was slow."
  - "for the rapid decarbonisation of the grid"
  - "Keywords: Power sector decarbonisation"
  - "an analysis of demand" (no preposition-the pattern)

### R9 Serial (Oxford) comma consistency (P1)

- **Category:** correctness (house style) · **Severity:** style · **ruleName:** "Comma in a series"
- **Detection:**
  1. Find lists: ≥3 items. Items before the last are comma-separated chunks of ≤6 tokens. The last item runs from "and"/"or" to the next `, ; : . ) \n`, with ≤10 tokens.
     - Items contain no token in `BE ∪ MODALS ∪ {has, have, had, do, does, did}`, no value of `IRREGULAR` or `PAST_TO_BASE`, and no subject pronoun.
     - The first item may start with a preposition: strip it ("With limited land resources" → "limited land resources").
     - Items must not start with a subordinator (if, when, because, although, while, which, that).
  2. A list is *serial* if a comma precedes the final and/or, otherwise *open*.
  3. If the document has both kinds, flag the minority. On a tie, flag the open lists (house default = serial, because it is never ambiguous). A setting "Serial comma: auto | always | never" overrides this.
- **Fix:** insert ", " before "and" (open → serial), or delete the comma (serial → open). **Inserts:** none.
- **Card:** title `Serial comma` · message: *Elsewhere you put a comma before the final "and" in a list. Do the same here for consistency.*
- **Positive tests:**
  - goa-abstract.txt → one card on `ecosystem and` → `ecosystem, and` (open list 1 vs serial list "solar potential, wind variability, energy storage potential, and biomass availability")
  - "We need land, water, and labour. We also need roads, ports and rail." → `ports and` → `ports, and`
- **Negative tests:**
  - "In 2020, the state grew and prices fell."
  - "Goa, for example, imports power, and its land is scarce."
  - A document whose lists are all serial; a document whose lists are all open.
  - `clean-academic.txt` (all lists serial).

### R10 Title and heading capitalisation consistency (P1)

- **Category:** correctness · **Severity:** style · **ruleName:** "Title capitalisation"
- **Detection:**
  - A heading line has ≤20 words, no terminal `.!?`, is followed by a newline (or is the first line), and doesn't start with "Keywords:".
  - Content words = tokens not in `TITLE_MINOR` (a an the and but or nor for so yet as at by in of off on per to up via), excluding the first word, the first word after a colon, acronyms (all caps) and words with internal capitals.
  - ≥70% of content words lowercase → *sentence case*; ≥70% capitalised → *title case*; otherwise no flag.
  - In sentence case, flag a capitalised content word only if the same word appears in lowercase elsewhere in the document body, and never appears capitalised mid-sentence in the body (that would make it a proper noun). Fix: lowercase it.
  - In title case, flag lowercase content words not in `TITLE_MINOR`. Fix: capitalise.
- **Minor words in title case:** in title case, a capitalised word from `TITLE_MINOR` (not first, not after a colon) gets a fix to lowercase it.
- **Positive tests:**
  - goa-abstract.txt title → `Power` → `power`
  - "Assessing The Grid Plan For Small States" → `The` → `the`, `For` → `for`
  - "Grid planning for small states and Island economies" (where "island" appears lowercase in the body) → `Island` → `island`
- **Negative tests:**
  - "Decarbonisation of the power sector in a resource-constrained geography: Assessing the pathway for Goa"
  - "Grid Planning in Goa"
  - "Keywords: Power sector decarbonisation, renewable potential"
  - "Renewable Energy Policy in India"
  - "Solar Policy in small States" (mixed, below both 70% thresholds, so no flag)

### R11 Hyphenation of compound modifiers (P1)

- **Category:** correctness · **Severity:** advanced · **ruleName:** "Hyphenation"
- **(a) Fixed open compounds before a noun:** `COMPOUND_MODIFIERS` = long term, short term, medium term, long run, high level, low level, large scale, small scale, full time, part time, real time, low carbon, high quality, low income, middle income, high income, decision making, cost effective, net zero, off grid, state of the art, up to date, well known, well established, well designed, energy efficient, fuel efficient, climate resilient.
  - Flag only if the next token is noun-like (not in `STOPWORDS ∪ PREPOSITIONS ∪ BE ∪ MODALS`, not punctuation, not ending in -ly), **and** the phrase is not preceded by `(in|over|on|at|for|into)\s+(the|a)?\s*`.
  - Fix: join the words with hyphens.
- **(b) Noun + participle/adjective head before a noun:** first token is a noun (`NOUN_SUFFIX`/`NOUN_LIST`/common nouns: resource, evidence, carbon, state, community, market, demand, energy, water, land, data, grid, cost, labour, capital, export, import) and doesn't end in -ly. Second token ∈ `PARTICIPLE_HEADS` (constrained based driven intensive owned led funded related oriented focused dependent efficient resilient neutral friendly rich poor free scarce linked connected). Third token is noun-like as in (a). Fix: `w1-w2`.
- **(c) -ly adverb + hyphen:** `\b([a-z]+ly)-([a-z]+)\b` where g1 ∉ `LY_NOT_ADVERB` (family early only holy belly jelly rally ally bully daily weekly monthly yearly friendly likely elderly silly curly lonely ugly supply reply apply fly rely multiply assembly monopoly anomaly Italy July). Fix: replace the hyphen with a space.
- **Positive tests:**
  - "resource constrained states" → `resource-constrained states`
  - "long term contracts" → `long-term contracts`
  - "evidence based policy" → `evidence-based policy`
  - "net zero target" → `net-zero target`
  - "a highly-skilled workforce" → `highly skilled`
  - "an environmentally-sensitive coast" → `environmentally sensitive`
- **Negative tests:**
  - "in the long term, costs fall"
  - "over the long term."
  - "on a large scale."
  - "The states are resource constrained."
  - "a family-owned firm"
  - "an early-stage project"
  - "climate change policy"
  - "renewable energy targets"
  - "net zero by 2070"
  - goa-abstract.txt (already hyphenated correctly)

### R12 Gerund versus infinitive after verbs, nouns and adjectives (P1)

- **Category:** correctness · **Severity:** advanced · **ruleName:** "Verb pattern"
- **(a) Verb + to + base → verb + -ing:**
  - `GERUND_VERBS` = avoid consider enjoy finish suggest recommend risk deny mind postpone delay involve practise practice quit resist admit appreciate discuss imagine miss justify keep, in all inflections.
  - `TO_GERUND_FRAMES` = look forward to · object to · (be|get|become) used to · (be) committed to · (be) dedicated to · (be) accustomed to · devoted to · with a view to · contribute to · key to · in addition to.
  - Detect `VERB\s+to\s+(BASE)` with BASE ∈ `BASE_VERBS`. Fix: `VERB {ingForm(BASE)}` for `GERUND_VERBS` (drop "to"); `… to {ing}` for frames.
  - Guards: skip "consider" when preceded by `BE` (passive "is considered to be"). Skip when the token after "to" is not in `BASE_VERBS` ("suggest to the board", "contribute to growth"). For "used to", require be/get/become directly before it (bare "used to" is the habitual past).
- **(b) Verb + -ing → verb + to + base:** `INF_VERBS` = decide hope refuse fail manage afford agree want wish expect seem tend threaten promise pretend offer deserve. Detect `VERB\s+([a-z]+ing)` where `baseFromIng ∈ BASE_VERBS`. Fix: `VERB to {base}`. Guard: skip when the -ing word is preceded by a determiner, or is a known noun (funding, building, planning, training, meeting, housing, setting, spending, timing).
- **(c) Noun frames:** `ability of V-ing` → `ability to V` · `opportunity of V-ing` → `opportunity to V` · `in an attempt of V-ing` → `in an attempt to V` · `interest to V` → `interest in V-ing` (skip "of interest to").
- **Inserts:** to, plus -ing and base forms of the writer's own verbs.
- **Positive tests:**
  - "We avoid to use diesel." → `avoid using`
  - "We look forward to hear from you." → `to hearing`
  - "The state is committed to reduce emissions." → `to reducing`
  - "They decided building a plant." → `decided to build`
  - "the ability of storing energy" → `ability to store`
- **Negative tests:**
  - "It is considered to be safe."
  - "We suggest to the board that …"
  - "This contributes to growth."
  - "I used to live there."
  - "They decided funding was short."
  - "the planning of the grid"

### R13 Pronoun–antecedent number for inanimate singular nouns (P1)

- **Category:** correctness · **Severity:** advanced · **ruleName:** "Pronoun agreement"
- **Detection:** `\bthe\s+(state|country|city|region|district|sector|system|policy|method|approach|model|framework|paper|study|report|analysis|scheme|plant|grid|utility)\b` followed within ≤8 tokens, in the same clause (no `, ; : .` and no subordinator), by "their" or "they".
  - No plural noun (token ending in s, not in `SINGULAR_S`) and no "and" between the antecedent and the pronoun.
  - Excluded: collective nouns where British usage allows the plural (government, council, committee, team, company, board, ministry, commission). Never flag "their" when the antecedent is a person-noun (singular "they" is standard).
- **Fix:** their→its, they→it (only when the next token is not a plural verb that would then need changing; otherwise advice).
- **Positive tests:** "The state must cut their imports." → `its`. "The study reports their results in Table 2." → `its`.
- **Negative tests:** "The states must cut their imports." "The state and its utilities cut their costs." "The government have set their targets." "Each researcher submits their data." "The state relies on utilities, and they cut costs."

### R14 Commas after introductory elements and between independent clauses (P2)

- **(a) Introductory subordinate clause without a comma:** `^(Although|Because|Since|While|When|If|After|Before|Unless|Once|Whereas)\b` followed by ≥6 tokens, then `\s(we|they|it|this|these|there|the\s+\w+\s+(is|are|was|were|has|have|will|can))\b`, with no comma in between. Advice plus a fix that inserts "," before the matched subject. Negative: "When it rains we stay in." (<6 tokens, so skip); "Although costs fell, demand rose."
- **(b) Long independent clauses joined by "but"/"so"/"yet" without a comma:** `(\S.{40,})\s(but|so|yet)\s(we|they|it|he|she|I|this|there)\s(\w+)` within one sentence, where both sides have ≥8 tokens and a finite verb. Fix: insert ",". Not for "and" (optional in academic style).
- **(c) "which" after a noun without a comma, in US dialect only:** advice: *In US style, use "that" for defining clauses or add a comma before "which".* Never in UK/auto-UK.
- Severity: style. Category: correctness.

### R15 "per cent" / "percent" / "%" consistency (P1)

- Count `\d+(\.\d+)?\s*(per cent|percent)` and `\d+(\.\d+)?\s*%` outside tables (lines with ≥3 tab or pipe characters).
- If both "per cent" and "percent" occur, flag the minority with a fix to the majority form. "%" mixed with words gets advice only (*Most style guides use one form in running text.*). Never flag "percentage".
- Positive: "75 per cent … 20 percent … 5 per cent" → `percent` → `per cent`. Negative: goa-abstract.txt (all "per cent"); "a 5% rise" alone; "the percentage of homes".

### R16 Redundancy list expansion (P1, data only)

Add to `WORDY`:

| Phrase | Fix |
|---|---|
| future prospects | prospects |
| current status quo | status quo |
| mutual cooperation | cooperation |
| joint collaboration | collaboration |
| final conclusion | conclusion |
| brief summary | summary |
| past experience | experience |
| exact same | same |
| various different | various |
| each individual | each |
| combine together | combine |
| merge together | merge |
| still continues | continues |
| still remains | remains |
| basic essentials | essentials |
| true facts | facts |
| the reason why is because | the reason is that |
| reason is because | reason is that |
| completely unanimous | unanimous |
| advance warning | warning |
| general consensus | consensus |
| consensus of opinion | consensus |
| period of time | period |
| small in size | small |
| large in size | large |
| in the year 2020 → in 2020 | regex for any 4-digit year |

Each entry gets one positive test (the exact phrase) and one negative test (a near miss), e.g. "Past experience shows" → `Experience shows`; negative "the past experiences of reform" (plural; the list matches whole words only, so "past experiences" is not matched).

### R17 Academic vague and weak words (P2, academic/formal goal only)

- Under `goals.domain === 'academic'` or `formality === 'formal'`: a lot of → many/much; things → advice; really, very (unpaired) → advice; big → large; huge → large; obviously, clearly (at sentence start) → advice (*overclaims*); basically → delete.
- Severity: style. Category: voice.
- Negative: never under default goals; "clearly" mid-sentence modifying a verb ("clearly labelled").

### R20 Distributive plural (P2)

- `\b(states|countries|utilities|cities|regions|firms|households)\b` … ≤8 tokens … `\btheir\s+(\w+\s+)?(sector|system|grid|economy|budget|plan|policy)\b`, where the noun is singular. Advice with fix: plural noun.
- Message: *Each of the {plural} has its own {noun}, so "{noun}s" may read more naturally. The singular is also acceptable.*
- Positive: "help other resource-constrained states plan the decarbonisation of their power sector." → `power sectors`; also "the states take in transforming and decarbonising their power sector" → `power sectors`.
- Negative: "states and their capital"; "the state and its power sector".

### R21 Possessive pronoun density (P2)

- One advice card per sentence when "its" (or "their") occurs ≥3 times in it. Span = first to last occurrence; scope = sentence. No fix. Message as in table row #8.
- Negative: two occurrences.

### R22 Purpose and help constructions (P2)

- (a) `take(s|n)?\s+in\s+(V-ing)(\s+and\s+(V-ing))?` after a noun from {direction, steps, measures, action, approach, path, route}: advice: *"take … to transform" can be clearer than "take … in transforming".* No fix.
- (b) `support(s|ed)?\s+(the|a|an|their|its|our)\s+(\w+)\s+in\s+(V-ing)` → `help {det} {noun} {base}` (and helps/helped). **Inserts:** help helps helped (already in CLOSED via PLAIN_WORDS). Severity: style.
- Positive (b): "support the state in reducing its reliance" → `help the state reduce`. Negative: "support the state in 2030"; "support in kind".

### R23 Interrupted complement (P2, advice only)

- Pattern: `\b(the\s+\w+),\s+(considering|including|given|using)\b[^,]{5,80},\s+(for|to)\s+` → advice: *The phrase between the commas separates "{noun}" from "{for/to} …". Consider moving it to the end of the sentence.* No fix: moving clauses is a reorder, so it stays a tip.

### Dangling modifiers (P2, inside R14's file)

- High-precision subset only:
  - `^(Having\s+)?[A-Z]?[a-z]+(ing|ed)\b[^,]{3,60},\s+(it|there)\s+(is|was|are|were|has|seems)\b`: *the opening phrase has no doer, because "it"/"there" can't do the action.*
  - `^Based on [^,]{3,60},\s+(it|there|this)\b`.
  - Advice only.
- Negative: "Based on these data, we estimate …"; "Using hourly data, the model estimates …" (has a subject that can act).

---

## 4. UI and UX specs

### U1 "Improve this sentence": a rule-built sentence preview (P0)

This is Plainly's deterministic answer to Grammarly's generative "Improve your text".

- **When:** a sentence contains ≥2 suggestions with at least one fix whose spans lie inside the sentence and don't overlap. Sentence-scope rewrites (split, passive) are excluded from the stack but listed as alternatives underneath.
- **Build:** take the first fix of each such suggestion and apply them right to left to the sentence text. The result is the preview. Number each change (①②③) and draw the diff with the existing `diffHtml`.
- **Controls:**
  - Each numbered change has a checkbox (default on, except `severity: 'style'`, default off). Unticking rebuilds the preview immediately.
  - "Accept sentence" applies the composed sentence as **one** `insertText` (one undo step).
  - "Open change ②" jumps to that card.
- **Guard:** run `checkFix` on the composed sentence with the word-growth limit set to the sum of the individual fixes' growth. If it fails, hide the preview and fall back to the individual cards.
- **Label (always visible):** "Built from {n} rule fixes in this sentence. No new wording."
- **Entry points:** a "{n} fixes in this sentence" chip on the first card of the sentence, and a margin marker in the editor at the sentence start.
- **Determinism test:** applying the same fixes one by one, in any order, must give the same text as the preview.
- **Expected on goa-abstract.txt (P0 rules):**
  - Analysis sentence →
    "The analysis aims to identify a mix of technologies that are financially feasible in terms of levelised cost, suitable for Goa's geography, and able to support the state in reducing its reliance on thermal and outside-the-state procurement."
    (changes: ① aims to identify ② suitable for ③ able to support; "in terms of" is listed below the preview as a tip.)
  - With R9 (P1) added, the "With limited land resources" sentence →
    "With limited land resources, an environmentally sensitive ecosystem, and inconsistent wind resources throughout the year, Goa has traditionally relied on other states and central thermal power stations to meet around 75 per cent of its electricity demand, with thermal power comprising the bulk (80 per cent) of the procured power."

### U2 Card anatomy: name the rule, explain it, give an example (P0)

- **Header:** coloured dot · before→after inline (existing) · **ruleName** (e.g. "Subject–verb agreement", "Faulty parallelism", "Preposition choice", "Wordy phrase", "Nominalisation").
- **Body:** `message` (one sentence naming the rule), then a "Why?" toggle showing `rule-info.example` as "✗ wrong → ✓ right" in one line. Then the fix buttons (first = primary, alternatives as secondary buttons), then Dismiss and "Turn off this check".
- **Advice-only cards:** show a small "Tip, no automatic fix" tag so writers don't hunt for a missing button.
- **Data:** `src/engine/data/rule-info.js` exports `{ [rule]: { name, explanation, example: { wrong, right } } }`. Every P0 rule must have an entry (acceptance criterion).

### U3 Severity (P1)

- **Contract:** add `severity: 'critical' | 'advanced' | 'style'` to the suggestion contract (default by category: correctness → critical, clarity → advanced, engagement/voice → style; rules override).
- **Underline:** solid 2px for critical, dashed for advanced, dotted for style, in addition to colour (accessibility: never colour alone).
- **Filters:** a "Critical only" filter chip. Sort cards by position, but show the count per severity in the header.
- **Score:** `score.js` weights: critical 3, advanced 1.2, style 0.3. Advice-only style cards weigh 0.

### U4 Wire goals.domain into the engine (P0)

- `engineOptions()` must pass `domain` (it's stored but never passed today).
- **Engine behaviour for `academic` and `technical`:** repetition off; plain-word off; long-sentence limit = max(audience limit, 38); R17 on (academic only); R21/R22 off by default.
- **Settings:** "Repetition check" toggle, and "Serial comma: auto/always/never".

### U5 One card per issue, not per token (P0)

- R2 is one card covering "a centralised … approach" (Grammarly needs two).
- R21 is one card per sentence.
- Repetition gives at most one card per word per paragraph.
- `mergeSuggestions` must keep a word-level P0 card when it overlaps a P2 card (priority by severity before category).

### U6 Accept all (P1)

- R6 (fixed idioms) and R4 rows with a single fix may join `BULK_SAFE`.
- R1, R2, R5 and R8 must **not** join (they need a look).

### U7 Explain the no-AI guarantee on the sentence preview (P1)

- A one-line info popover on U1: "Every change comes from a named grammar rule applied to your words. Plainly never writes new sentences."

---

## 5. Noise to remove or demote

| ID | Current behaviour | Change | Expected on goa-abstract.txt |
|---|---|---|---|
| N1 | Repetition: 4 cards for "power", 1 for "states" | Suppress a word if any of these hold: (a) it appears in the title/heading line or the Keywords line; (b) it is part of a bigram that occurs ≥2 times in the document ("power sector", "thermal power"); (c) it is a document topic term: ≥4 occurrences and ≥1% of words; (d) the domain is academic/technical (U4). Otherwise, at most one card per word per paragraph, tighten the window to 3 uses within 40 words, and set severity style. | 0 repetition cards (A3) |
| N2 | Long-sentence advice with no split option ×3 | Keep, but severity style. With an expert audience or academic domain, limit 38. The no-split message should point to U1 when the sentence has fixes. | 1–3 long-sentence cards; the 52-word sentence is always flagged |
| N3 | plain-word "demonstrates" → "shows" | Off for expert audience (exists) and for academic/technical domain (new). Severity style. | 0 under academic domain, 1 under default |
| N4 | `AI_VOCAB` includes ordinary technical words (ecosystem, landscape, robust, enhance, crucial) | Keep them blocked as *insertions*, but no rule may ever flag the writer's own use of them under academic/technical domain. Add a regression test that goa-abstract.txt's "ecosystem" is never flagged. | 0 cards on "ecosystem" |
| N5 | Passive rule vs R3 | R3 owns "is aimed at"; the passive rule must not also fire on that span (keep "aimed" in `ADJECTIVE_PARTICIPLES`). | 1 card on "is aimed at identifying" |

---

## 6. Acceptance criteria for my sign-off

All criteria are automated in `tests/round1.test.js` unless marked (manual).

- **A1 Grammarly overlap:** on `tests/fixtures/goa-abstract.txt` with default options, a suggestion overlaps each of Grammarly spans **4, 6, 7, 10, 11, 12, 13 and 15 (8 of 16)**. Its first fix must equal the exact text in §2: "are"; "both centralised and decentralised approaches"; "aims to identify"; "suitable for"; "able to support"; "how to decarbonise". For span 11, an advice card with ruleName "Vague phrase". The test encodes span offsets by searching for the quoted strings.
- **A2 Beyond Grammarly:** the same run flags "a bulk" → "the" (P0). Once P1 lands, it also flags "Power" → "power" and "ecosystem and" → "ecosystem, and".
- **A3 Noise:** zero `repetition` cards on goa-abstract.txt, and total cards ≤ 14 with default options.
- **A4 No false positives:** **zero suggestions** on `tests/fixtures/clean-academic.txt`, with default options and with `{ domain: 'academic', formality: 'formal', confident: true }` at audience knowledgeable or expert. Also zero suggestions on every negative test sentence in §3 for the rule that sentence targets (and no correctness card from any rule).
- **A5 Rule tests:** every P0 rule (R1, R2, R3, R4, R5, R6, R7, R8) is implemented with all its positive cases (exact fix text) and negative cases from §3 as tests, and all pass. The existing 69 tests still pass.
- **A6 Guard:** every fix produced on goa-abstract.txt, clean-academic.txt, the existing guard SAMPLE and all §3 positive cases passes `checkFix`. No rule's fix is silently dropped by the guard; a test asserts `fixes.length` equals what the spec expects. New words exist only in `src/engine/data/usage-lists.js`.
- **A7 Sentence preview (U1):** on the goa-abstract analysis sentence, the composed preview equals the exact string in U1. Accepting it is one undo step (manual). The composition is order-independent (automated). A label states the number of rule fixes.
- **A8 Explanations (U2):** every P0 rule id has a `rule-info` entry with name, one-sentence explanation and example, and the card renders all three (manual check in the browser).
- **A9 Domain wiring (U4):** `runChecks(goa, { domain: 'academic' })` returns no repetition and no plain-word cards.
- **A10 Performance:** `runChecks` on a 2,000-word document stays at p95 < 50 ms (add a timing test with a generous CI margin: < 150 ms).

Sign-off = A1–A10 green. P1 rules are expected in round 2; P2 rules are optional.
