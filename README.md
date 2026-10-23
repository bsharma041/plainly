# Plainly

A writing checker in the style of Grammarly. It fixes grammar, clarity and tone problems without rewriting your writing into AI-sounding text. There's no AI model inside: every suggestion is built from your own words and fixed grammar rules, and nothing changes until you click it.

Live: https://bsharma041.github.io/plainly/

## What it does

| Area | What you get |
|---|---|
| Correctness (red) | a/an, their/there, could of, subject-verb agreement (he don't, there is many, everyone are), verb forms (has went, did came), comma splices, fewer/less, more better, capital letters, missing apostrophes (dont), doubled punctuation, US/UK spelling consistency. With deep check on, spelling and advanced grammar from LanguageTool. |
| Clarity (blue) | Wordy phrases, plainer words, passive voice with an active rewrite, long sentences with split options |
| Engagement (green) | Weak "very + adjective" pairs, the same word repeated in a few lines |
| Delivery (purple) | Phrases that read as AI-written; with goals set, formality (contractions, casual words) and hedging ("I think", "maybe") |

Also: a documents home page, goals per document (audience, formality, domain, tone), a tone detector, an overall score, a performance report (readability, grade level, vocabulary), Accept all for correctness fixes, synonyms on double-click, Word (.docx) import and export, light and dark themes, and a personal dictionary.

## How the rewrites work without AI

Passive to active: the sentence is parsed into opener, subject, verb group, actor and the rest. Fixed rules reorder it and conjugate the verb ("The report was reviewed by the team" becomes "The team reviewed the report"; "has been", "will be", "is being" and negatives are handled too). If the actor is missing, it offers "we" (only if you write with "we") or a placeholder "someone" that it selects for you to type over. If a sentence doesn't match a shape it knows is safe, it doesn't offer a rewrite.

Long sentences: it splits at natural breaks (semicolons, ", but", ", and" before a new clause, ", which", "because", "although") and adds only fixed openers like "This", "But" or "However".

Every rewrite shows a preview with the changed words highlighted before you accept it.

## The no-AI-text guarantee

Before any fix appears, a guard (`src/engine/guard.js`) checks it. Fixes from deep check go through the same guard. It rejects any fix that adds words that aren't yours, aren't a form of your words, and aren't in the tool's fixed word lists. It also rejects any fix that adds AI-filler vocabulary in any form, creates an AI-sounding phrase or adds an em dash. Tests cover both sides: generated text is rejected, and every real fix passes.

## Run it locally

On a Mac, double-click `start.command`. Or:

```bash
python3 -m http.server 5173
```

Then open http://localhost:5173.

## Privacy

Deep check is off until you turn it on. When it's on, text goes to LanguageTool (api.languagetool.org), a rule-based checker. Synonym lookups send the word you double-clicked and its two neighbours to Datamuse. Documents and settings stay in your browser's local storage.

## Tests

```bash
node --test tests/*.test.js
```

Plainly is an independent project. It is not affiliated with or endorsed by Grammarly, Inc.
