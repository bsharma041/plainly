# Round 9 implementation (Grok audit, Oct 2026)

Rules from rounds 1–8 are unchanged. One snapshot changed on purpose: the long-sentence card on the Goa abstract now carries a split at ", with" (round-8 backlog). The card count stays at 14.

## New rules (`src/engine/rules/syllabus.js`, using the closed-list chunker `src/engine/chunk.js`)

| Rule | Type |
| --- | --- |
| dangling-modifier | advice only |
| fused-sentence | fix |
| who-whom | fix |
| subjunctive | fix |
| much-many | fix |
| that-which | US English, advice with a fix |
| not-only | fix |
| register-office | Indian office phrasing, formal goals only |
| with-clause | split fix, merged into the long-sentence card |

## New document guidance (`src/engine/rules/document2.js`)

- data-number (data is/are)
- acronym-unused
- paragraph-rhythm
- paragraph-one-sentence

## Interface

- Margin markers beside the editor.
- Keyboard walk through the cards: Alt+J and Alt+K move, Alt+Enter accepts, Alt+Backspace dismisses.
- Per-paragraph table in the Performance dialog.

## Rule kit

`tests/round9.test.js` and `docs/rule-authoring.md`:

- Every new rule needs RULE_INFO, examples that must fire and examples that must stay silent.
- Its raw fixes must pass the guard on their own.
- It adds no new cards on any existing fixture.

## Review

Three Opus review passes (`round-9-review.md`). Every false flag the reviewer reported is a regression test. Tests: 263 pass, 0 fail.

## Not done

These need separate projects:

- a browser extension or Google Docs add-on;
- offline LanguageTool or n-gram data;
- a fuller parser.
