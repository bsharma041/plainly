# Plainly architecture

Plainly is a Grammarly-style writing checker that runs in the browser. It finds grammar mistakes, wordy phrases, passive voice, long sentences and AI-sounding phrases, and it offers synonyms. It never rewrites your text on its own.

## The one rule: your voice stays yours

Every suggestion is a small, local edit that you accept or dismiss. The tool has no generative model and no "rewrite this paragraph" button.

1. A suggestion replaces a specific span (a word, a phrase, a split point). It never touches text outside that span.
2. Every replacement is built from your own words or from a fixed, reviewed word list. Nothing is generated.
3. Nothing is applied until you click it. There is no auto-fix.
4. Informal choices are not errors. "Anyway", "gonna", starting a sentence with "And", contractions and sentence fragments are left alone.
5. Where two spellings are both correct (organise / organize), the default mode follows whatever you use most in the document and flags only the odd one out.
6. Synonym lists drop words that read as AI filler (delve, leverage, pivotal, tapestry and so on), so accepting a synonym can't make you sound like a chatbot.

## The no-AI-text guard

Rule 6 is enforced in code, not just by design. `src/engine/guard.js` checks every fix, from the built-in rules and from deep check, before it can be shown. A fix is dropped, and the card stays as advice only, if:

- it adds a word that is neither the writer's own word in the replaced span, a form of one (organise/organize, reviewed/reviews, written/wrote, a typo correction), nor from the fixed, reviewed word lists in `src/engine/data`;
- it adds an AI-filler word in any form (delve, delved, leveraging, showcased, pivotal, seamlessly…);
- it creates an AI-sounding phrase that wasn't in the sentence before, or adds an em dash;
- it makes the text more than four words longer.

The guarantee itself comes from the deterministic rules; the guard is a safety net that also covers deep check. It additionally rejects any fix that adds a negation, and limits deep-check fixes to short single-span edits (at most two new words). LanguageTool matches flagged premium or from its model-driven `AI_*` rule family are discarded. Synonyms skip the guard on purpose: they are single dictionary words the writer picks from a list, and the AI-word filter runs on that list first.

`tests/guard.test.js` and `tests/guard-remote.test.js` prove both directions: generated or AI-styled rewrites are rejected, and every fix every rule produces on a realistic document passes. Synonym lists run through the same AI-word filter.

## Stack decision

Inferred assumptions: one user, personal tool, no budget, no deploy cadence. That points at the smallest thing that works.

| Choice | Picked | Why |
|---|---|---|
| Runtime | Static HTML + ES modules, no build | Opens with any static server, nothing to install |
| Backend | None | Text stays in the browser unless deep check is on |
| Deep grammar | LanguageTool public API (optional toggle) | Rule-based checker, not an LLM, free tier, no key |
| Synonyms | Built-in thesaurus + Datamuse API | Free, no key, works offline for common words |
| Storage | localStorage (draft, settings, dictionary) | Per-browser convenience only, wrapped in try/catch |
| Tests | `node --test`, zero dependencies | Engine is pure functions, runs in Node as is |

## Module map

```
plainly/
  index.html                 page shell: documents home, editor, goals, performance, settings
  styles.css                 tokens, light + dark themes
  src/
    app.js                   state, hash routing (#/ and #/doc/<id>), documents, render loop
    editor.js                textarea + highlight mirror, popovers
    engine/
      index.js               runChecks(text, opts) -> Suggestion[]
      text.js                sentence/word splitting, case helpers
      morph.js               verb rules: participle -> base, 3rd person, -ing, plural guess
      rewrite.js             passive -> active, long-sentence splits (rule-based, no generation)
      tone.js                tone detector from fixed word lists
      remap.js               shifts remote suggestions after edits
      score.js               score, readability, grade level, vocabulary stats
      rules/
        correctness.js       a/an, confusions, basic agreement, spacing, dialect consistency
        grammar.js           comma splices, quantifier agreement, verb forms, fewer/less, capitals, apostrophes
        clarity.js           wordy phrases, plain words, long sentences, passive voice
        engagement.js        weak intensifiers, close repetition
        voice.js             AI-sounding phrases, em dash overuse ("Delivery" in the UI)
        delivery.js          goal-driven checks: formality, hedging
      data/                  phrase tables, spelling pairs, thesaurus
    services/
      languagetool.js        optional deep check, chunked, 15 s timeout
      synonyms.js            Datamuse + local list, AI-word filter, tense matching
      docx.js                Word import (mammoth) and export (JSZip), pinned with SRI
  tests/                     node --test, zero dependencies
```

## How reframing works without generation

Passive to active (`rewrite.js`): the sentence is split into opener ("In 2020, "), subject, verb group (was/were, is/are, has/have/had been, modal + be, is/was being, with optional "not" and adverb), optional middle phrase, "by" actor and tail. The actor becomes the subject, the old subject becomes the object, and `morph.js` conjugates the verb to match the new subject and tense. The rewrite is refused when any part is uncertain: the "by" phrase is a date, amount or method ("by 2030", "by hand"), the subject has commas or clauses, a relative clause follows the actor, or we can't tell if a capitalised subject is a name. With no actor, the option is "we" (only if the writer uses "we"); the selected placeholder "someone" is off by default (engine option `passiveTemplate`). Under the academic and technical domains the passive card is style advice, with only the "we" option.

Long sentences: break points are semicolons, dashes, ", but/so/yet/and" before a new clause, ", which", ", whereas", ", although" and "because". The only added words are fixed openers (This, But, So, Yet, By contrast, However, This is because). The card shows each option with changed words highlighted.

## Suggestion contract

Every rule, local or remote, returns the same shape. The UI only knows this shape.

```js
{
  id: "corr:3:12",            // unique per run
  rule: "a-an",               // stable rule id (dismissals key on rule + original)
  category: "correctness",    // correctness | clarity | engagement | voice
  title: "Use \"an\"",
  message: "Use \"an\" before a vowel sound.",
  start: 12, end: 14,         // span to underline
  original: "a",
  scope: "word",              // word | sentence (sentence-level marks only highlight when active)
  fixes: [{ text: "an", start: 12, end: 14, label?: "..." }],  // [] = advice only
  source: "local"             // local | languagetool
}
```

A fix carries its own span because a sentence-level card (long sentence, passive rewrite) can apply a small edit inside a bigger highlight.

## Data flow

```
keystroke
  -> app.onInput
     -> remap(remoteSuggestions, oldText, newText)     instant, drops stale overlaps
     -> runChecks(text) after 150 ms idle               local rules, synchronous
     -> languagetool.check(text) after 1.5 s idle       only if deep check is on
  -> merge + dedupe (correctness > clarity > voice > engagement; local wins ties)
  -> filter dismissed + personal dictionary
  -> render: mirror underlines, sidebar cards, score
accept fix
  -> textarea.setSelectionRange + execCommand("insertText")   keeps native Ctrl+Z
  -> normal input path above
```

## Editor technique

A transparent textarea sits on top of a mirror div with identical font metrics. The mirror holds the same text with `<mark>` wrappers, coloured underlines and transparent glyphs, so the user types in a real textarea (native undo, IME, paste, spellcheck) and sees underlines from the layer below. Scroll is synced. Clicking inside a mark opens its card; double-clicking a word opens synonyms.

## Goals

Each document has goals (audience, formality, domain, confident tone). Audience sets the long-sentence limit (25/30/38 words) and turns plain-word suggestions off for experts. Formality "formal" turns on contraction and casual-word checks; "confident" turns on hedge checks. With default goals none of these run, so informal writing is left alone.

## Privacy

Deep check is off by default. With it off, no text leaves the browser except the word you double-click (plus the word on each side, used to rank synonyms by context) sent to Datamuse, and the browser's own spellchecker draws spelling squiggles. With deep check on, the text goes to api.languagetool.org over HTTPS (their policy says submitted text is not stored). The toggle sits in the header with a plain label.

## Targets

| Metric | Target |
|---|---|
| Local check, 2,000 words | p50 < 15 ms, p95 < 50 ms, p99 < 100 ms |
| Deep check round trip | p95 < 2.5 s (public API, no SLA) |
| First load (local server) | LCP < 1.0 s, INP < 100 ms, CLS < 0.05 |
| Availability | Local rules work offline; deep check and online synonyms degrade with a visible status, never block typing |

## Review

A separate REVIEW agent audited the first build and found 28 issues (9 high). All are fixed, and each has a regression test in `tests/review-regressions.test.js`. It found no XSS path: every `innerHTML` interpolation is escaped.

## Known limits

Rule-based checking misses grammar a human or a large model would catch, especially complex agreement and comma splices. Deep check closes much of that gap. Passive voice detection uses a participle list and an adjective exclusion list, so some "was tired" style adjectives may still slip through; every passive flag is advice, and the only automatic rewrite is the plain "X was done by Y." pattern, built from your words.

## Document-level guidance (round 6)

`src/engine/guidance.js` exports `runGuidance(text, opts)`, a pure function separate from the inline-card pipeline. It returns findings grouped by topic (consistency, acronyms, numbers, evidence, structure, tense, keywords), each with its instances. The rules live in `src/engine/rules/document.js`, the fixed lists in `src/engine/data/document-lists.js`, and the shared section model (title, headings, abstract scope, Keywords line, email header lines, salutation, sign-off) in `src/engine/sections.js`. Mechanical findings (a minority variant switched to the writer's own majority form, number regrouping, a duplicate acronym definition, a missing final full stop) are also emitted as ordinary inline cards by `runChecks`, so Accept, Dismiss and "Improve this sentence" keep working. Tense, claims and paragraph structure stay advice only. The guard has one narrow addition for consistency fixes (`docVariant`): a replacement word may be used only if it already occurs elsewhere in the same document, and the AI-word and negation checks run first. "Make consistent" in the Guidance panel applies a set's minority fixes as one edit (`composeFixes`), so a single undo reverts it.
