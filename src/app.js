import {
  runChecks, mergeSuggestions, suggestionKey, guardSuggestion, remap, stats, overallScore, readabilityLabel,
  detectDialect, detectTone, TONE_INFO, DEFAULT_OPTIONS,
} from './engine/index.js';
import { checkWithLanguageTool } from './services/languagetool.js';
import { synonymsFor } from './services/synonyms.js';
import { importDocx, exportDocx } from './services/docx.js';
import { renderMirror, autosize, placePopover, escapeHtml } from './editor.js';

const $ = (id) => document.getElementById(id);
const els = {
  home: $('home'), editorView: $('editor-view'), grid: $('doc-grid'), search: $('doc-search'),
  input: $('input'), mirror: $('mirror'), popover: $('popover'), docInner: $('doc-inner'),
  cards: $('cards'), tabs: $('tabs'), title: $('title'), deep: $('deep'), ring: $('ring'),
  scoreNum: $('score-num'), scoreMeta: $('score-meta'), tone: $('tone'), bulk: $('bulk'), fixAll: $('btn-fix-all'),
  consent: $('consent'), settings: $('settings'), goals: $('goals'), perf: $('perf'), perfBody: $('perf-body'),
  file: $('file'), toast: $('toast'),
  statWords: $('stat-words'), statChars: $('stat-chars'), statTime: $('stat-time'), statRead: $('stat-read'), statDeep: $('stat-deep'),
};

const CATEGORY_LABEL = { correctness: 'Correctness', clarity: 'Clarity', engagement: 'Engagement', voice: 'Delivery' };
const RING_LEN = 119.4;
const DEFAULT_GOALS = { audience: 'knowledgeable', formality: 'neutral', domain: 'general', confident: false };
const DOMAIN_FORMALITY = { academic: 'formal', business: 'formal', technical: 'neutral', general: 'neutral', casual: 'informal', creative: 'informal' };
const AUDIENCE_LIMIT = { general: 25, knowledgeable: 30, expert: 38 };

// ---------- storage (best effort; the app works without it) ----------
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(`plainly.${key}`); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(`plainly.${key}`, JSON.stringify(value)); return true; } catch { return false; }
  },
};
const asStrings = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
const newId = () => (crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10));

const SAMPLE = `i think their is a error in the the second section of the report. The report was written by the policy team. In order to make a decision, we must of looked at a large number of options.

Our analysis serves as a testament to the hard work of the team, and it shows how the scheme has changed the way discoms bill consumers, but the gains are uneven across regions and the rural divisions still lag behind on collection efficiency.

He don't agree with the conclusion, it was written too quickly. However we should organise a meeting to discuss it, and we can also organize a field visit. Mistakes were made. The data was very important.`;

function cleanGoals(g) {
  const out = { ...DEFAULT_GOALS };
  if (g && typeof g === 'object') {
    if (AUDIENCE_LIMIT[g.audience]) out.audience = g.audience;
    if (['informal', 'neutral', 'formal'].includes(g.formality)) out.formality = g.formality;
    if (DOMAIN_FORMALITY[g.domain]) out.domain = g.domain;
    if (typeof g.confident === 'boolean') out.confident = g.confident;
  }
  return out;
}

function loadDocs() {
  const raw = store.get('docs', null);
  let docs = Array.isArray(raw) ? raw.filter((d) => d && typeof d.id === 'string' && typeof d.text === 'string')
    .map((d) => ({ id: d.id, title: typeof d.title === 'string' ? d.title : 'Untitled document', text: d.text, updated: Number(d.updated) || Date.now(), goals: cleanGoals(d.goals) })) : null;
  if (!docs) {
    // First run, or upgrading from the single-draft version.
    const draft = store.get('draft', null);
    const title = store.get('title', null);
    docs = [{ id: newId(), title: typeof title === 'string' ? title : 'Welcome to Plainly', text: typeof draft === 'string' ? draft : SAMPLE, updated: Date.now(), goals: { ...DEFAULT_GOALS } }];
  }
  return docs;
}

const savedSettings = store.get('settings', {});
const state = {
  docs: loadDocs(),
  docId: null,
  text: '',
  local: [],
  remote: [],
  remoteText: '',
  suggestions: [],
  activeId: null,
  openCardId: null,
  filter: 'all',
  dismissed: new Set(asStrings(store.get('dismissed', []))),
  dictionary: new Set(asStrings(store.get('dictionary', []))),
  settings: {
    dialect: ['auto', 'us', 'uk'].includes(savedSettings?.dialect) ? savedSettings.dialect : 'auto',
    deep: typeof savedSettings?.deep === 'boolean' ? savedSettings.deep : false,
    theme: ['auto', 'light', 'dark'].includes(savedSettings?.theme) ? savedSettings.theme : 'auto',
    categories: { ...DEFAULT_OPTIONS.categories },
  },
  deepConsent: store.get('deepConsent', null),
  synonymAnchor: null,
};
if (savedSettings?.categories && typeof savedSettings.categories === 'object') {
  for (const k of Object.keys(state.settings.categories)) {
    if (typeof savedSettings.categories[k] === 'boolean') state.settings.categories[k] = savedSettings.categories[k];
  }
}

const currentDoc = () => state.docs.find((d) => d.id === state.docId);
// Several tabs can be open at once. Before writing, merge with what other tabs
// saved (newest copy of each document wins; deletions made here stick).
const deletedIds = new Set(asStrings(store.get('deleted', [])));
function mergeDocs(local, stored) {
  for (const id of asStrings(store.get('deleted', []))) deletedIds.add(id);
  local = local.filter((d) => !deletedIds.has(d.id));
  const byId = new Map(local.map((d) => [d.id, d]));
  for (const d of stored) {
    if (!d || typeof d.id !== 'string' || typeof d.text !== 'string' || deletedIds.has(d.id)) continue;
    const mine = byId.get(d.id);
    if (!mine) byId.set(d.id, { id: d.id, title: typeof d.title === 'string' ? d.title : 'Untitled document', text: d.text, updated: Number(d.updated) || 0, goals: cleanGoals(d.goals) });
    else if ((Number(d.updated) || 0) > mine.updated && d.id !== state.docId) Object.assign(mine, { title: d.title, text: d.text, updated: Number(d.updated), goals: cleanGoals(d.goals) });
  }
  return [...byId.values()];
}

let warnedSave = 0;
function saveDocs() {
  const stored = store.get('docs', []);
  if (Array.isArray(stored)) state.docs = mergeDocs(state.docs, stored);
  const ok = store.set('docs', state.docs);
  if (!ok && Date.now() - warnedSave > 30000) {
    warnedSave = Date.now();
    toast('Could not save: browser storage is full or blocked. Download a copy to keep your work.');
  }
  return ok;
}
const saveSettings = () => store.set('settings', state.settings);

function applyTheme() {
  if (state.settings.theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = state.settings.theme;
}

// Dismissing hides that suggestion at that spot (keyed on a little surrounding text).
function dismissKey(s, text = state.text) {
  return `${suggestionKey(s)}|${text.slice(Math.max(0, s.start - 12), s.start).toLowerCase()}`;
}

// ---------- checking ----------
let localTimer = 0;
let remoteTimer = 0;
let remoteAbort = null;

function engineOptions() {
  const g = currentDoc()?.goals || DEFAULT_GOALS;
  return {
    dialect: state.settings.dialect,
    longSentence: AUDIENCE_LIMIT[g.audience] || 30,
    plainWords: g.audience !== 'expert',
    goals: { formality: g.formality, confident: g.confident },
    categories: state.settings.categories,
  };
}

function runLocal() {
  state.local = runChecks(state.text, engineOptions());
  recompute();
  renderTone();
}

function deepLanguage() {
  const d = state.settings.dialect === 'auto' ? detectDialect(state.text) : state.settings.dialect;
  return d === 'uk' ? 'en-GB' : 'en-US';
}

async function runRemote() {
  if (!state.settings.deep || !state.docId) return;
  const text = state.text;
  if (!text.trim()) { state.remote = []; state.remoteText = text; recompute(); return; }
  remoteAbort?.abort();
  const controller = new AbortController();
  remoteAbort = controller;
  setDeepStatus('busy', 'Deep check running…');
  try {
    const docId = state.docId;
    const found = await checkWithLanguageTool(text, { language: deepLanguage(), signal: controller.signal });
    if (controller !== remoteAbort || state.docId !== docId) return; // user switched documents
    // Deep-check fixes go through the same no-AI-text guard as the built-in rules.
    state.remote = remap(found.map((s) => guardSuggestion(text, s)), text, state.text);
    state.remoteText = state.text;
    setDeepStatus('ok', 'Deep check on (LanguageTool)');
    recompute();
  } catch (e) {
    if (controller.signal.aborted && e.name === 'AbortError') return;
    const limited = e.message === 'rate-limited';
    setDeepStatus('error', limited ? 'Deep check paused: too many requests. Retrying shortly.' : 'Deep check unreachable. Built-in checks still work.');
    if (limited) scheduleRemote(20000);
  }
}

function scheduleLocal(delay = 150) {
  clearTimeout(localTimer);
  localTimer = setTimeout(runLocal, delay);
}

function scheduleRemote(delay = 1500) {
  clearTimeout(remoteTimer);
  if (!state.settings.deep) return;
  remoteTimer = setTimeout(runRemote, delay);
}

const categoryEnabled = (cat) => state.settings.categories[cat] !== false;

function recompute() {
  const remote = state.remote.filter((s) => categoryEnabled(s.category)
    && !(s.spelling && state.dictionary.has(s.original.toLowerCase())));
  const merged = mergeSuggestions([state.local, remote])
    .filter((s) => !state.dismissed.has(dismissKey(s)))
    .filter((s) => s.end <= state.text.length && state.text.slice(s.start, s.end) === s.original);
  state.suggestions = merged.map((s) => (s.source === 'languagetool' ? { ...s, id: `R:${s.start}:${s.end}:${s.rule}` } : s));
  if (state.activeId && !state.suggestions.some((s) => s.id === state.activeId)) {
    state.activeId = null;
    if (!state.synonymAnchor) hidePopover();
  }
  if (state.openCardId && !state.suggestions.some((s) => s.id === state.openCardId)) state.openCardId = null;
  render();
}

// ---------- rendering ----------
function render() {
  renderMirror(els.mirror, state.text, state.suggestions, { activeId: state.activeId, anchor: state.synonymAnchor });
  renderCards();
  renderScore();
  renderStats();
}

const truncate = (s, n) => { const t = s.replace(/\s+/g, ' '); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };

function fixPreview(s) {
  const fix = s.fixes[0];
  if (fix?.preview) return `<strong>${escapeHtml(s.rule === 'passive' ? 'Rewrite in active voice' : 'Split this sentence')}</strong>`;
  if (!fix || s.scope === 'sentence' || fix.start !== s.start || fix.end !== s.end) {
    return `<strong>${escapeHtml(truncate(s.original, 44))}</strong>`;
  }
  const to = fix.text.trim() === '' ? '<em>remove</em>' : `<strong>${escapeHtml(truncate(fix.text, 24))}</strong>`;
  return `<s>${escapeHtml(truncate(s.original, 22))}</s><span class="arrow">→</span>${to}`;
}

// Word-level diff: new or moved words in the rewrite are highlighted.
function diffHtml(before, after) {
  const key = (t) => t; // exact: punctuation and capital changes at split points get highlighted
  const a = before.split(/\s+/).filter(Boolean).map(key);
  const bTokens = after.split(/(\s+)/);
  const b = bTokens.filter((t) => t.trim()).map(key);
  const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) {
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  const keep = new Set();
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (a[i] === b[j]) { keep.add(j); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  let wi = 0;
  return bTokens.map((t) => {
    if (!t.trim()) return t;
    const html = escapeHtml(t);
    return keep.has(wi++) ? html : `<ins>${html}</ins>`;
  }).join('');
}

function fixButtons(s) {
  if (!s.fixes.length) return '';
  const previews = s.fixes.filter((f) => f.preview);
  const plain = s.fixes.filter((f) => !f.preview);
  const id = escapeHtml(s.id);
  let html = '';
  for (const f of previews) {
    const i = s.fixes.indexOf(f);
    const before = state.text.slice(f.start, f.end);
    html += `<div class="rewrite"><div class="rw-label">${escapeHtml(f.label || 'Suggested rewrite')}</div>
      <div class="rw-text">${diffHtml(before, f.preview)}</div>
      <button class="fix" data-act="fix" data-id="${id}" data-fix="${i}">Accept</button></div>`;
  }
  if (plain.length) {
    html += `<div class="fixes">${plain.map((f) => {
      const i = s.fixes.indexOf(f);
      const label = f.label || (f.text.trim() === '' ? 'Remove' : f.text);
      return `<button class="fix${i ? ' alt' : ''}${f.label ? ' wide' : ''}" data-act="fix" data-id="${id}" data-fix="${i}">${escapeHtml(label)}</button>`;
    }).join('')}</div>`;
  }
  return html;
}

function actionButtons(s) {
  const id = escapeHtml(s.id);
  const dict = s.spelling ? `<button class="link" data-act="dict" data-id="${id}">Add to dictionary</button>` : '';
  return `<div class="card-actions"><button class="link" data-act="dismiss" data-id="${id}">Dismiss</button>${dict}</div>`;
}

// Only rules whose single fix is near-certain go into "Accept all". Heuristic ones
// (a/an, agreement, comma splices, intro commas, comparatives) need a look first.
const BULK_SAFE = new Set(['lowercase-i', 'repeated-word', 'sentence-case', 'space-before-punct', 'space-after-comma', 'double-punct', 'apostrophe', 'capitalize', 'confusion', 'dialect', 'verb-form', 'double-space']);
function bulkFixes() {
  return state.suggestions.filter((s) => s.category === 'correctness' && s.scope === 'word' && s.fixes.length && !s.fixes[0].preview
    && (BULK_SAFE.has(s.rule) || (s.source === 'languagetool' && s.fixes.length === 1)));
}

function renderCards() {
  const counts = { all: 0, correctness: 0, clarity: 0, engagement: 0, voice: 0 };
  for (const s of state.suggestions) { counts.all++; counts[s.category]++; }
  for (const b of els.tabs.querySelectorAll('[data-count]')) b.textContent = counts[b.dataset.count];
  for (const b of els.tabs.querySelectorAll('button')) {
    b.classList.toggle('is-on', b.dataset.cat === state.filter);
    b.setAttribute('aria-selected', b.dataset.cat === state.filter);
  }
  const bulk = bulkFixes();
  els.bulk.hidden = bulk.length < 2 || !['all', 'correctness'].includes(state.filter);
  els.fixAll.textContent = `Accept all ${bulk.length} correctness fixes`;

  const list = state.suggestions.filter((s) => state.filter === 'all' || s.category === state.filter);
  if (!list.length) {
    const empty = !state.text.trim();
    els.cards.innerHTML = `<div class="empty"><div class="empty-mark">${empty ? '✎' : '✓'}</div>
      <h3>${empty ? 'Start writing' : state.filter === 'all' ? 'Nothing to fix' : `No ${CATEGORY_LABEL[state.filter].toLowerCase()} suggestions`}</h3>
      <p>${empty ? 'Type or paste text on the left. Suggestions show up here.' : 'Your text reads clean on these checks.'}</p></div>`;
    return;
  }
  els.cards.innerHTML = list.map((s) => {
    const open = s.id === state.openCardId;
    const id = escapeHtml(s.id);
    return `<article class="card c-${s.category}${open ? ' is-open' : ''}" data-id="${id}" style="--c: var(--${s.category})">
      <button class="card-head" data-act="open" data-id="${id}" aria-expanded="${open}">
        <i class="dot"></i>
        <span class="card-line">${fixPreview(s)}</span>
        <span class="card-kind">${escapeHtml(s.title)}</span>
      </button>
      ${open ? `<div class="card-body">
        <p class="card-title">${escapeHtml(s.title)}</p>
        <p class="card-msg">${escapeHtml(s.message)}</p>
        ${fixButtons(s)}
        ${actionButtons(s)}
      </div>` : ''}
    </article>`;
  }).join('');
}

function renderScore() {
  const score = overallScore(state.text, state.suggestions);
  els.scoreNum.textContent = score == null ? '–' : score;
  els.ring.style.strokeDashoffset = score == null ? RING_LEN : RING_LEN * (1 - score / 100);
  els.ring.style.stroke = score == null ? '' : score >= 85 ? 'var(--engagement)' : score >= 65 ? 'var(--clarity)' : 'var(--correctness)';
  const n = state.suggestions.length;
  els.scoreMeta.textContent = state.text.trim() ? `${n} suggestion${n === 1 ? '' : 's'}` : '';
}

function renderTone() {
  const tones = detectTone(state.text);
  els.tone.innerHTML = tones.length
    ? `<span>Tone</span>${tones.map((t) => {
      const why = [TONE_INFO[t.tone], t.evidence.length ? `Signals: ${t.evidence.join(', ')}` : ''].filter(Boolean).join(' ');
      return `<span class="tone-chip" title="${escapeHtml(why)}">${escapeHtml(t.tone)}<span class="tone-bar"><i style="width:${Math.round(t.strength * 100)}%"></i></span></span>`;
    }).join('')}`
    : '';
}

function renderStats() {
  const st = stats(state.text);
  els.statWords.textContent = `${st.words.toLocaleString()} word${st.words === 1 ? '' : 's'}`;
  els.statChars.textContent = `${st.characters.toLocaleString()} characters`;
  els.statTime.textContent = st.words ? `${st.readingMinutes} min read` : '';
  els.statRead.textContent = st.readability == null ? '' : `Readability ${st.readability} (${readabilityLabel(st.readability)})`;
}

function setDeepStatus(name, text) {
  els.statDeep.dataset.state = name;
  els.statDeep.textContent = text;
}

function renderConsent() {
  els.consent.hidden = !(state.deepConsent == null && !state.settings.deep);
}

// ---------- popovers ----------
function hidePopover() {
  els.popover.hidden = true;
  els.popover.innerHTML = '';
  if (state.synonymAnchor) {
    state.synonymAnchor = null;
    renderMirror(els.mirror, state.text, state.suggestions, { activeId: state.activeId });
  }
}

function showSuggestionPopover(s) {
  state.synonymAnchor = null;
  render();
  const mark = els.mirror.querySelector(`[data-id="${CSS.escape(s.id)}"]`);
  if (!mark) return;
  els.popover.className = `popover c-${s.category}`;
  els.popover.style.setProperty('--c', `var(--${s.category})`);
  els.popover.innerHTML = `<div class="pop-head"><i class="dot" style="--c: var(--${s.category})"></i>${CATEGORY_LABEL[s.category]}</div>
    <p class="pop-title">${escapeHtml(s.title)}</p>
    <p class="pop-msg">${escapeHtml(s.message)}</p>
    ${fixButtons(s)}${actionButtons(s)}`;
  placePopover(els.popover, mark, els.docInner);
}

async function showSynonyms(start, end) {
  const word = state.text.slice(start, end);
  state.activeId = null;
  state.synonymAnchor = { start, end };
  render();
  const anchor = els.mirror.querySelector('[data-anchor]');
  if (!anchor) return;
  els.popover.className = 'popover c-clarity';
  els.popover.style.setProperty('--c', 'var(--clarity)');
  els.popover.innerHTML = `<div class="pop-head">Synonyms for “${escapeHtml(word)}”</div><div class="syn-empty">Looking up…</div>`;
  placePopover(els.popover, anchor, els.docInner);
  try {
    const left = (state.text.slice(Math.max(0, start - 40), start).match(/([A-Za-z'’]+)\W*$/) || [])[1] || '';
    const right = (state.text.slice(end, end + 40).match(/^\W*([A-Za-z'’]+)/) || [])[1] || '';
    const { words, offline, functionWord } = await synonymsFor(word, { left, right });
    if (!state.synonymAnchor || state.synonymAnchor.start !== start) return;
    const chips = words.length
      ? `<div class="syn-list">${words.map((w, i) => `<button class="fix alt" data-act="syn" data-i="${i}">${escapeHtml(w)}</button>`).join('')}</div>`
      : `<div class="syn-empty">${functionWord ? 'Small connecting words like this one rarely have a true synonym.' : offline ? 'No offline synonyms for this word, and the online lookup is unreachable.' : 'No good synonyms found.'}</div>`;
    els.popover.innerHTML = `<div class="pop-head">Synonyms for “${escapeHtml(word)}”${offline && words.length ? ' · offline list' : ''}</div>${chips}`;
    els.popover.dataset.words = JSON.stringify(words);
    placePopover(els.popover, anchor, els.docInner);
  } catch { /* aborted */ }
}

// ---------- editing ----------
function replaceRange(start, end, text) {
  const ta = els.input;
  const expected = ta.value.slice(0, start) + text + ta.value.slice(end);
  ta.focus({ preventScroll: true });
  ta.setSelectionRange(start, end);
  let ok = false;
  try {
    ok = text === '' ? document.execCommand('delete', false) : document.execCommand('insertText', false, text);
  } catch { ok = false; }
  if (!ok || ta.value !== expected) {
    ta.value = expected;
    ta.setSelectionRange(start + text.length, start + text.length);
    onInput();
  }
}

function applySuggestionFix(id, index) {
  const s = state.suggestions.find((x) => x.id === id);
  const fix = s?.fixes[index];
  if (!fix) return;
  if (state.text.slice(s.start, s.end) !== s.original) return; // stale
  hidePopover();
  state.activeId = null;
  state.openCardId = null;
  replaceRange(fix.start, fix.end, fix.text);
  if (fix.select) {
    // Placeholder actor ("someone"): select it so the writer can type the real name.
    els.input.setSelectionRange(fix.start + fix.select[0], fix.start + fix.select[1]);
    toast('Type who did it to replace "someone"');
  }
}

function fixAll() {
  const list = bulkFixes();
  if (!list.length) return;
  let text = state.text;
  const edits = list.map((s) => s.fixes[0]).sort((a, b) => b.start - a.start);
  let lastStart = Infinity;
  let applied = 0;
  for (const f of edits) {
    if (f.end > lastStart) continue; // overlapping edit; skip it
    text = text.slice(0, f.start) + f.text + text.slice(f.end);
    lastStart = f.start;
    applied++;
  }
  const scroller = $('doc');
  const top = scroller.scrollTop;
  hidePopover();
  replaceRange(0, state.text.length, text); // one undo step
  els.input.setSelectionRange(0, 0);
  scroller.scrollTop = top;
  toast(`Applied ${applied} fixes. Ctrl/Cmd+Z undoes them all.`);
}

function dismiss(id) {
  const s = state.suggestions.find((x) => x.id === id);
  if (!s) return;
  state.dismissed.add(dismissKey(s));
  store.set('dismissed', [...state.dismissed].slice(-500));
  hidePopover();
  recompute();
}

function addToDictionary(id) {
  const s = state.suggestions.find((x) => x.id === id);
  if (!s) return;
  state.dictionary.add(s.original.toLowerCase());
  store.set('dictionary', [...state.dictionary]);
  hidePopover();
  recompute();
  toast(`Added “${s.original}” to your dictionary`);
}

function onInput() {
  const old = state.text;
  state.text = els.input.value;
  autosize(els.input);
  state.local = remap(state.local, old, state.text);
  state.remote = remap(state.remote, state.remoteText, state.text);
  state.remoteText = state.text;
  if (!els.popover.hidden) hidePopover();
  state.activeId = null;
  recompute();
  scheduleLocal();
  scheduleRemote();
  saveDraft();
}

// The pending save captures its doc id and text when scheduled, so switching
// documents can never write one document's text into another.
let saveTimer = 0;
let pendingSave = null;
function saveDraft() {
  clearTimeout(saveTimer);
  pendingSave = { id: state.docId, text: state.text };
  saveTimer = setTimeout(flushSave, 400);
}
// When this tab opened (or last saved) a document, the stored copy had this timestamp.
// If another tab saved the same document since, keep its version as a copy rather than overwrite it.
const baseUpdated = new Map();
function flushSave() {
  clearTimeout(saveTimer);
  const p = pendingSave;
  pendingSave = null;
  if (!p) return;
  const d = state.docs.find((x) => x.id === p.id);
  if (!d) return;
  const stored = store.get('docs', []);
  const theirs = Array.isArray(stored) ? stored.find((x) => x && x.id === p.id) : null;
  if (theirs && typeof theirs.text === 'string' && Number(theirs.updated) > (baseUpdated.get(p.id) || 0) && theirs.text !== p.text && theirs.text !== d.text) {
    state.docs.push({ id: newId(), title: `${typeof theirs.title === 'string' ? theirs.title : d.title} (from another tab)`, text: theirs.text, updated: Number(theirs.updated), goals: cleanGoals(theirs.goals) });
    toast('This document was also edited in another tab. Their version is saved as a copy.');
  }
  d.text = p.text;
  d.updated = Date.now();
  saveDocs();
  baseUpdated.set(p.id, d.updated);
}
window.addEventListener('pagehide', flushSave);

function setText(text) {
  els.input.value = text;
  state.text = text;
  state.remote = [];
  state.remoteText = text;
  state.activeId = null;
  state.openCardId = null;
  hidePopover();
  autosize(els.input);
  runLocal();
  scheduleRemote(300);
}

// ---------- documents & routing ----------
function relTime(ts) {
  const d = Date.now() - ts;
  if (d < 60e3) return 'Just now';
  if (d < 3600e3) return `${Math.round(d / 60e3)} min ago`;
  if (d < 86400e3) return `${Math.round(d / 3600e3)} h ago`;
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderHome() {
  const q = els.search.value.trim().toLowerCase();
  const docs = [...state.docs].sort((a, b) => b.updated - a.updated)
    .filter((d) => !q || d.title.toLowerCase().includes(q) || d.text.toLowerCase().includes(q));
  const tiles = docs.map((d) => `<a class="doc-card" href="#/doc/${encodeURIComponent(d.id)}">
      <span class="doc-name">${escapeHtml(d.title || 'Untitled document')}</span>
      <span class="snippet">${escapeHtml(d.text.slice(0, 400)) || '<em>Empty document</em>'}</span>
      <span class="doc-date">${escapeHtml(relTime(d.updated))}</span>
      <button class="del" data-del="${escapeHtml(d.id)}" aria-label="Delete ${escapeHtml(d.title)}">Delete</button>
    </a>`).join('');
  els.grid.innerHTML = `<button class="doc-card new" id="tile-new"><span class="plus">+</span>New document</button>${tiles}${!docs.length && q ? '<p class="home-empty">No documents match your search.</p>' : ''}`;
}

function createDoc(title = 'Untitled document', text = '') {
  const d = { id: newId(), title, text, updated: Date.now(), goals: { ...DEFAULT_GOALS } };
  state.docs.push(d);
  saveDocs();
  location.hash = `#/doc/${d.id}`;
}

function showHome() {
  flushSave();
  remoteAbort?.abort();
  clearTimeout(remoteTimer);
  clearTimeout(localTimer);
  hidePopover();
  state.docId = null;
  els.editorView.hidden = true;
  els.home.hidden = false;
  document.title = 'Plainly';
  renderHome();
}

function openDoc(id) {
  const d = state.docs.find((x) => x.id === id);
  if (!d) { location.hash = '#/'; return; }
  if (state.docId === id && !els.editorView.hidden) return;
  flushSave();
  remoteAbort?.abort();
  clearTimeout(remoteTimer);
  clearTimeout(localTimer);
  state.docId = id;
  baseUpdated.set(id, d.updated);
  els.home.hidden = true;
  els.editorView.hidden = false;
  els.title.value = d.title;
  document.title = `${d.title} · Plainly`;
  setDeepStatus('idle', state.settings.deep ? 'Deep check on (LanguageTool)' : 'Deep check off. Text stays in this browser.');
  renderConsent();
  setText(d.text);
  els.input.focus({ preventScroll: true });
  els.input.setSelectionRange(0, 0);
}

function route() {
  const m = location.hash.match(/^#\/doc\/([\w-]+)/);
  if (m) openDoc(decodeURIComponent(m[1]));
  else showHome();
}

async function readFile(f) {
  if (/\.docx$/i.test(f.name)) return importDocx(f);
  return f.text();
}

async function uploadAsNewDoc(f) {
  try {
    const text = await readFile(f);
    createDoc(f.name.replace(/\.(txt|md|docx)$/i, ''), text);
  } catch (e) {
    toast(e.message || 'Could not read that file');
  }
}

// ---------- goals & performance ----------
function syncGoalsForm() {
  const g = currentDoc()?.goals || DEFAULT_GOALS;
  for (const r of els.goals.querySelectorAll('input[type="radio"]')) r.checked = g[r.name] === r.value;
  $('goal-domain').value = g.domain;
  $('goal-confident').checked = g.confident;
}

function setGoal(patch) {
  const d = currentDoc();
  if (!d) return;
  d.goals = cleanGoals({ ...d.goals, ...patch });
  saveDocs();
  runLocal();
}

function renderPerformance() {
  const st = stats(state.text);
  const score = overallScore(state.text, state.suggestions);
  const counts = { correctness: 0, clarity: 0, engagement: 0, voice: 0 };
  for (const s of state.suggestions) counts[s.category]++;
  const grade = st.grade == null ? null : Math.round(st.grade);
  const gradeText = grade == null ? '' : grade <= 6 ? 'most readers, including teenagers' : grade <= 10 ? `a reader with about ${grade} years of schooling` : grade <= 13 ? 'a reader with a high-school education' : 'a reader with college-level education';
  const cell = (v, label) => `<div class="perf-cell"><b>${escapeHtml(String(v))}</b><span>${escapeHtml(label)}</span></div>`;
  els.perfBody.innerHTML = `
    <div class="perf-top"><div class="perf-score">${score ?? '–'}</div>
      <p>${score == null ? 'Write something to see your report.' : `Overall score for this document, based on ${state.suggestions.length} open suggestion${state.suggestions.length === 1 ? '' : 's'} across ${st.words.toLocaleString()} words.`}</p></div>
    <h3 class="perf-section">Word count</h3>
    <div class="perf-grid">
      ${cell(st.characters.toLocaleString(), 'Characters')}${cell(st.words.toLocaleString(), 'Words')}
      ${cell(st.sentences.toLocaleString(), 'Sentences')}${cell(st.paragraphs.toLocaleString(), 'Paragraphs')}
      ${cell(`${st.readingMinutes} min`, 'Reading time')}${cell(`${st.speakingMinutes} min`, 'Speaking time')}
    </div>
    <h3 class="perf-section">Readability</h3>
    <div class="perf-grid">
      ${cell(st.avgWordLength, 'Average word length')}${cell(st.avgSentence, 'Average sentence length')}
      ${cell(st.readability ?? '–', `Readability score (${readabilityLabel(st.readability) || 'n/a'})`)}
      ${cell(st.grade ?? '–', 'Grade level')}
    </div>
    ${grade == null ? '' : `<p class="perf-note">Your text is likely to be understood by ${escapeHtml(gradeText)}.</p>`}
    <h3 class="perf-section">Vocabulary</h3>
    <div class="perf-grid">${cell(`${st.uniquePct}%`, 'Unique words')}${cell(`${st.longWordPct}%`, 'Long words (3+ syllables)')}</div>
    <h3 class="perf-section">Open suggestions</h3>
    <div class="perf-cats">${Object.entries(counts).map(([k, v]) => cell(v, CATEGORY_LABEL[k])).join('')}</div>`;
}

// ---------- events ----------
els.input.addEventListener('input', onInput);

els.input.addEventListener('click', () => {
  const ta = els.input;
  if (ta.selectionStart !== ta.selectionEnd) return;
  const pos = ta.selectionStart;
  const hit = state.suggestions.find((s) => s.scope !== 'sentence' && s.start <= pos && pos < s.end)
    || state.suggestions.find((s) => s.scope !== 'sentence' && s.start <= pos && pos <= s.end);
  if (!hit) {
    if (!els.popover.hidden) hidePopover();
    if (state.activeId) { state.activeId = null; render(); }
    return;
  }
  state.activeId = hit.id;
  state.openCardId = hit.id;
  showSuggestionPopover(hit);
  els.cards.querySelector(`[data-id="${CSS.escape(hit.id)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
});

els.input.addEventListener('dblclick', () => {
  const ta = els.input;
  let start = ta.selectionStart;
  let end = ta.selectionEnd;
  const raw = ta.value.slice(start, end);
  end = start + raw.replace(/[\s.,;:!?"”’)]+$/, '').length;
  start += raw.length - raw.replace(/^[\s"“‘(]+/, '').length;
  const word = ta.value.slice(start, end);
  if (!/^[A-Za-z][A-Za-z'’-]*$/.test(word) || word.length < 2) return;
  showSynonyms(start, end);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !els.popover.hidden) { e.preventDefault(); hidePopover(); }
});
document.addEventListener('mousedown', (e) => {
  if (!els.popover.hidden && !els.popover.contains(e.target) && e.target !== els.input) hidePopover();
  const menu = document.querySelector('details.menu[open]');
  if (menu && !menu.contains(e.target)) menu.open = false;
});

function handleAction(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const { act, id } = btn.dataset;
  if (act === 'fix') applySuggestionFix(id, Number(btn.dataset.fix));
  else if (act === 'dismiss') dismiss(id);
  else if (act === 'dict') addToDictionary(id);
  else if (act === 'syn') {
    const words = JSON.parse(els.popover.dataset.words || '[]');
    const anchor = state.synonymAnchor;
    const w = words[Number(btn.dataset.i)];
    if (!anchor || !w) return;
    hidePopover();
    replaceRange(anchor.start, anchor.end, w);
  } else if (act === 'open') {
    state.openCardId = state.openCardId === id ? null : id;
    state.activeId = state.openCardId;
    hidePopover();
    render();
    const mark = els.mirror.querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (mark && state.activeId) mark.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}
els.cards.addEventListener('click', handleAction);
els.popover.addEventListener('click', handleAction);
els.popover.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });

els.tabs.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-cat]');
  if (!b) return;
  state.filter = b.dataset.cat;
  renderCards();
});
els.fixAll.addEventListener('click', fixAll);

// Home
els.search.addEventListener('input', renderHome);
$('btn-new').addEventListener('click', () => createDoc());
$('btn-upload').addEventListener('click', () => els.file.click());
els.grid.addEventListener('click', (e) => {
  if (e.target.closest('#tile-new')) { createDoc(); return; }
  const del = e.target.closest('[data-del]');
  if (!del) return;
  e.preventDefault();
  const d = state.docs.find((x) => x.id === del.dataset.del);
  if (!d || !confirm(`Delete "${d.title}"? This can't be undone.`)) return;
  deletedIds.add(d.id);
  store.set('deleted', [...deletedIds].slice(-500)); // other tabs honour it too
  state.docs = state.docs.filter((x) => x.id !== d.id);
  saveDocs();
  renderHome();
});

// Editor top bar
els.title.addEventListener('input', () => {
  const d = currentDoc();
  if (!d) return;
  d.title = els.title.value;
  d.updated = Date.now();
  document.title = `${d.title} · Plainly`;
  saveDocs();
});

function setDeep(on) {
  state.settings.deep = on;
  els.deep.checked = on;
  els.input.spellcheck = !on; // without deep check, the browser's own spellchecker marks spelling
  saveSettings();
  renderConsent();
  if (on) { setDeepStatus('busy', 'Deep check starting…'); scheduleRemote(50); }
  else {
    remoteAbort?.abort();
    clearTimeout(remoteTimer);
    state.remote = [];
    setDeepStatus('idle', 'Deep check off. Text stays in this browser.');
    recompute();
  }
}
els.deep.addEventListener('change', () => {
  state.deepConsent = true;
  store.set('deepConsent', true);
  setDeep(els.deep.checked);
});
$('consent-yes').addEventListener('click', () => { state.deepConsent = true; store.set('deepConsent', true); setDeep(true); });
$('consent-no').addEventListener('click', () => { state.deepConsent = false; store.set('deepConsent', false); renderConsent(); });

const closeMenu = () => { const m = document.querySelector('details.menu[open]'); if (m) m.open = false; };
$('btn-import').addEventListener('click', () => { closeMenu(); els.file.click(); });
els.file.addEventListener('change', async () => {
  const f = els.file.files?.[0];
  els.file.value = '';
  if (f) await uploadAsNewDoc(f);
});
$('btn-copy').addEventListener('click', async () => {
  closeMenu();
  try { await navigator.clipboard.writeText(state.text); toast('Copied to clipboard'); } catch { els.input.select(); toast('Press Ctrl/Cmd+C to copy'); }
});
const fileName = (ext) => `${(els.title.value || 'document').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'document'}.${ext}`;
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$('btn-download').addEventListener('click', () => { closeMenu(); download(new Blob([state.text], { type: 'text/plain;charset=utf-8' }), fileName('txt')); });
$('btn-download-docx').addEventListener('click', async () => {
  closeMenu();
  try { download(await exportDocx(state.text), fileName('docx')); } catch (e) { toast(e.message || 'Could not create the Word file'); }
});
$('btn-clear').addEventListener('click', () => {
  closeMenu();
  if (state.text && !confirm('Clear the whole document? You can undo with Ctrl/Cmd+Z right after.')) return;
  replaceRange(0, state.text.length, '');
});

// Goals
$('btn-goals').addEventListener('click', () => { syncGoalsForm(); els.goals.showModal(); });
els.goals.addEventListener('change', (e) => {
  const t = e.target;
  if (t.type === 'radio') setGoal({ [t.name]: t.value });
  else if (t.id === 'goal-confident') setGoal({ confident: t.checked });
  else if (t.id === 'goal-domain') { setGoal({ domain: t.value, formality: DOMAIN_FORMALITY[t.value] }); syncGoalsForm(); }
});
$('goals-reset').addEventListener('click', () => { setGoal({ ...DEFAULT_GOALS }); syncGoalsForm(); });

// Performance
const openPerf = () => { renderPerformance(); els.perf.showModal(); };
$('btn-perf').addEventListener('click', openPerf);
els.statWords.addEventListener('click', openPerf);

// Settings
const setDialect = $('set-dialect');
const setTheme = $('set-theme');
function syncSettingsForm() {
  setDialect.value = state.settings.dialect;
  setTheme.value = state.settings.theme;
  for (const cb of els.settings.querySelectorAll('[data-cat-toggle]')) cb.checked = categoryEnabled(cb.dataset.catToggle);
  $('dict').innerHTML = state.dictionary.size
    ? [...state.dictionary].sort().map((w) => `<span class="chip">${escapeHtml(w)}<button type="button" data-word="${escapeHtml(w)}" aria-label="Remove ${escapeHtml(w)}">×</button></span>`).join('')
    : '<span class="dict-empty">Words you add from spelling suggestions show up here.</span>';
}
for (const b of document.querySelectorAll('[data-open-settings]')) b.addEventListener('click', () => { syncSettingsForm(); els.settings.showModal(); });
setDialect.addEventListener('change', () => { state.settings.dialect = setDialect.value; saveSettings(); if (state.docId) { runLocal(); scheduleRemote(100); } });
setTheme.addEventListener('change', () => { state.settings.theme = setTheme.value; saveSettings(); applyTheme(); });
els.settings.addEventListener('change', (e) => {
  const cat = e.target.dataset?.catToggle;
  if (!cat) return;
  state.settings.categories = { ...state.settings.categories, [cat]: e.target.checked };
  saveSettings();
  if (state.docId) runLocal();
});
$('dict').addEventListener('click', (e) => {
  const w = e.target.dataset?.word;
  if (!w) return;
  state.dictionary.delete(w);
  store.set('dictionary', [...state.dictionary]);
  syncSettingsForm();
  if (state.docId) recompute();
});
$('btn-undismiss').addEventListener('click', () => {
  state.dismissed.clear();
  store.set('dismissed', []);
  if (state.docId) recompute();
  toast('Dismissed suggestions restored');
});

// ---------- misc ----------
let toastTimer = 0;
function toast(msg) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { els.toast.hidden = true; }, 2600);
}

window.addEventListener('resize', () => { if (state.docId) { autosize(els.input); if (!els.popover.hidden) hidePopover(); } });
window.addEventListener('hashchange', route);
// Another tab saved: pull its changes in. The open document is only replaced if
// this tab has no unsaved typing and the other copy is newer.
window.addEventListener('storage', (e) => {
  if (e.key !== 'plainly.docs') return;
  let stored;
  try { stored = JSON.parse(e.newValue || '[]'); } catch { return; }
  if (!Array.isArray(stored)) return;
  state.docs = mergeDocs(state.docs, stored);
  const open = currentDoc();
  const theirs = stored.find((d) => d && d.id === state.docId);
  if (open && theirs && !pendingSave && typeof theirs.text === 'string' && Number(theirs.updated) > open.updated && theirs.text !== state.text) {
    Object.assign(open, { text: theirs.text, title: typeof theirs.title === 'string' ? theirs.title : open.title, updated: Number(theirs.updated) });
    baseUpdated.set(open.id, open.updated);
    els.title.value = open.title;
    setText(open.text);
    toast('Updated with changes from another tab');
  }
  if (!els.home.hidden) renderHome();
});

// ---------- boot ----------
applyTheme();
els.deep.checked = state.settings.deep;
els.input.spellcheck = !state.settings.deep;
saveDocs();
if (!location.hash && state.docs.length === 1 && state.docs[0].text === SAMPLE) location.hash = `#/doc/${state.docs[0].id}`;
else route();
