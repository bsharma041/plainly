import {
  runChecks, mergeSuggestions, suggestionKey, guardSuggestion, remap, stats, overallScore, readabilityLabel,
  detectDialect, detectTone, TONE_INFO, DEFAULT_OPTIONS, sentenceGroups, composeSentence, RULE_INFO, isBulkSafe,
  runGuidance, composeFixes, GUIDANCE_GROUPS, paragraphStats,
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
  improve: null, // { start, sel: Map<suggestionId, boolean> } while "Improve this sentence" is open
  guidance: [], // round 6: document-level findings (runGuidance)
  openGuideId: null, // the guidance finding whose instances are highlighted
  filter: 'all',
  criticalOnly: false, // U3 "Critical only" chip
  dismissed: new Set(asStrings(store.get('dismissed', []))),
  dictionary: new Set(asStrings(store.get('dictionary', []))),
  settings: {
    dialect: ['auto', 'us', 'uk'].includes(savedSettings?.dialect) ? savedSettings.dialect : 'auto',
    deep: typeof savedSettings?.deep === 'boolean' ? savedSettings.deep : false,
    theme: ['auto', 'light', 'dark'].includes(savedSettings?.theme) ? savedSettings.theme : 'auto',
    repetition: typeof savedSettings?.repetition === 'boolean' ? savedSettings.repetition : true,
    serialComma: ['auto', 'always', 'never'].includes(savedSettings?.serialComma) ? savedSettings.serialComma : 'auto',
    disabledRules: asStrings(savedSettings?.disabledRules),
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
    repetition: state.settings.repetition,
    serialComma: state.settings.serialComma,
    domain: g.domain, // academic/technical: no repetition or plain-word cards, longer sentence limit
    goals: { formality: g.formality, confident: g.confident },
    categories: state.settings.categories,
  };
}

function runLocal() {
  const opts = engineOptions();
  state.local = runChecks(state.text, opts);
  state.guidance = runGuidance(state.text, { ...opts, dictionary: [...state.dictionary], disabledRules: state.settings.disabledRules });
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
const ruleEnabled = (rule) => !state.settings.disabledRules.includes(rule);

function recompute() {
  const remote = state.remote.filter((s) => categoryEnabled(s.category)
    && !(s.spelling && state.dictionary.has(s.original.toLowerCase())));
  const merged = mergeSuggestions([state.local, remote])
    .filter((s) => ruleEnabled(s.rule))
    .filter((s) => !state.dismissed.has(dismissKey(s)))
    .filter((s) => s.end <= state.text.length && state.text.slice(s.start, s.end) === s.original);
  state.suggestions = merged.map((s) => (s.source === 'languagetool' ? { ...s, id: `R:${s.start}:${s.end}:${s.rule}` } : s));
  if (state.activeId && !state.suggestions.some((s) => s.id === state.activeId)) {
    state.activeId = null;
    if (!state.synonymAnchor) hidePopover();
  }
  if (state.openCardId && !state.suggestions.some((s) => s.id === state.openCardId)) state.openCardId = null;
  if (state.improve && !currentGroups().some((g) => g.start === state.improve.start)) state.improve = null;
  render();
}

// ---------- rendering ----------
function render() {
  renderMirror(els.mirror, state.text, state.suggestions, { activeId: state.activeId, anchor: state.synonymAnchor, highlights: guideHighlights() });
  renderCards();
  renderGutter();
  renderScore();
  renderStats();
}

// ---------- round 9: margin markers ----------
const SEV_ORDER = { critical: 0, advanced: 1, style: 2 };
function renderGutter() {
  const gutter = $('gutter');
  if (!gutter) return;
  const rows = new Map();
  for (const s of visibleList()) {
    if (s.scope === 'sentence') continue;
    const mark = els.mirror.querySelector(`[data-id="${CSS.escape(s.id)}"]`);
    if (!mark) continue;
    const top = Math.round(mark.offsetTop);
    const row = rows.get(top) || { top, items: [] };
    row.items.push(s);
    rows.set(top, row);
  }
  gutter.innerHTML = [...rows.values()].map((r) => {
    const lead = [...r.items].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity])[0];
    const n = r.items.length;
    const label = `${n} suggestion${n === 1 ? '' : 's'} on this line: ${r.items.map((x) => x.ruleName || x.title).join(', ')}`;
    return `<button type="button" class="gutter-mark c-${lead.category} sev-${escapeHtml(lead.severity || 'advanced')}" style="top:${r.top}px; --c: var(--${lead.category})"
      data-act="open" data-id="${escapeHtml(lead.id)}" tabindex="-1" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${n > 1 ? n : ''}</button>`;
  }).join('');
}

// ---------- round 9: keyboard walk through the cards ----------
function stepCard(dir) {
  const list = visibleList();
  if (!list.length) return;
  let i = list.findIndex((s) => s.id === state.openCardId);
  // After an accept or dismiss the open card is gone: carry on from where it was, not from the top.
  if (i < 0 && state.walkPos != null) i = Math.min(state.walkPos, list.length) - (dir > 0 ? 1 : 0);
  i = i < 0 && state.walkPos == null ? (dir > 0 ? 0 : list.length - 1) : (i + dir + list.length) % list.length;
  state.walkPos = i;
  const s = list[i];
  state.openCardId = s.id;
  state.activeId = s.id;
  hidePopover();
  render();
  els.cards.querySelector(`[data-id="${CSS.escape(s.id)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  els.mirror.querySelector(`[data-id="${CSS.escape(s.id)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
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
      <button class="fix${f.template ? ' alt' : ''}" data-act="fix" data-id="${id}" data-fix="${i}">${f.template ? 'Use template' : 'Accept'}</button></div>`;
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
  const mute = s.source === 'languagetool' ? '' : `<button class="link" data-act="mute" data-id="${id}">Turn off this check</button>`;
  return `<div class="card-actions"><button class="link" data-act="dismiss" data-id="${id}">Dismiss</button>${dict}${mute}</div>`;
}

// Card body (U2): what is wrong, why (rule name + fixed example), the fixes, then actions.
function whyHtml(s) {
  const info = RULE_INFO[s.rule];
  if (!info) return '';
  const ex = info.example;
  return `<details class="why"><summary>Why?</summary><p><b>${escapeHtml(info.name)}.</b> ${escapeHtml(info.explanation)}</p>
    ${ex ? `<p class="why-ex"><span class="ex-wrong">✗ ${escapeHtml(ex.wrong)}</span> <span class="arrow">→</span> <span class="ex-right">✓ ${escapeHtml(ex.right)}</span></p>` : ''}</details>`;
}

function suggestionBody(s) {
  const tip = s.fixes.length ? '' : '<p class="tip-tag">Tip, no automatic fix</p>';
  return `<p class="card-msg">${escapeHtml(s.message)}</p>${whyHtml(s)}${tip}${fixButtons(s)}${actionButtons(s)}`;
}

// ---------- "Improve this sentence" (U1): built only from this sentence's rule fixes ----------
const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
const changeNo = (i) => CIRCLED[i] || `(${i + 1})`;
let groupsCache = { text: null, list: null, groups: [] };
function currentGroups() {
  if (groupsCache.text !== state.text || groupsCache.list !== state.suggestions) {
    groupsCache = { text: state.text, list: state.suggestions, groups: sentenceGroups(state.text, state.suggestions) };
  }
  return groupsCache.groups;
}
const improveOn = (item) => {
  const sel = state.improve?.sel;
  if (sel && sel.has(item.suggestion.id)) return sel.get(item.suggestion.id);
  return (item.suggestion.severity || 'advanced') !== 'style';
};

function improveHtml() {
  if (!state.improve) return '';
  const g = currentGroups().find((x) => x.start === state.improve.start);
  if (!g) return '';
  const c = composeSentence(state.text, g, improveOn);
  const rows = g.items.map((it, i) => {
    const s = it.suggestion;
    const before = state.text.slice(it.fix.start, it.fix.end);
    const to = it.fix.text.trim() === '' ? '<em>remove</em>' : `<strong>${escapeHtml(truncate(it.fix.text, 40))}</strong>`;
    return `<li><label class="check"><input type="checkbox" data-act="improve-toggle" data-id="${escapeHtml(s.id)}"${improveOn(it) ? ' checked' : ''}>
      <span class="chg-no">${changeNo(i)}</span><span class="chg"><s>${escapeHtml(truncate(before, 40))}</s><span class="arrow">→</span>${to}</span>
      <span class="chg-rule">${escapeHtml(s.ruleName || s.title)}</span></label>
      <button type="button" class="link" data-act="open" data-id="${escapeHtml(s.id)}">Open change ${changeNo(i)}</button></li>`;
  }).join('');
  const tips = g.tips.length ? `<div class="improve-tips"><span>Also in this sentence, not applied:</span><ul>${g.tips.map((s) => `<li>${escapeHtml(s.ruleName || s.title)}: ${escapeHtml(truncate(s.original, 40))}</li>`).join('')}</ul></div>` : '';
  const body = !c.count
    ? '<p class="card-msg">Tick at least one change to see the sentence.</p>'
    : c.ok
      ? `<div class="rw-text">${diffHtml(g.text, c.preview)}</div><button type="button" class="fix" data-act="improve-accept">Accept sentence</button>`
      : '<p class="card-msg">These changes together can\'t be checked safely. Use the individual cards instead.</p>';
  return `<section class="improve" aria-label="Improve this sentence">
    <div class="improve-head"><strong>Improve this sentence</strong><span class="rule-tag" title="Every change comes from a named grammar rule applied to your words. Plainly never writes new sentences.">Rule-based ⓘ</span>
      <button type="button" class="link" data-act="improve-close">Close</button></div>
    <p class="improve-label">${escapeHtml(c.label)}</p>
    ${body}
    <ol class="improve-list">${rows}</ol>
    ${tips}
  </section>`;
}

function openImprove(start) {
  state.improve = { start, sel: new Map() };
  renderCards();
  els.cards.querySelector('.improve')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function acceptImprove() {
  const g = currentGroups().find((x) => x.start === state.improve?.start);
  if (!g || state.text.slice(g.start, g.end) !== g.text) return;
  const c = composeSentence(state.text, g, improveOn);
  if (!c.ok || !c.count) return;
  hidePopover();
  state.improve = null;
  state.activeId = null;
  state.openCardId = null;
  replaceRange(c.edit.start, c.edit.end, c.edit.text); // one insertText: one undo step
  toast(`Applied ${c.count} rule fixes. Ctrl/Cmd+Z undoes them all.`);
}


// ---------- Guidance panel (round 6, G1) ----------
const GROUP_LABEL = { consistency: 'Consistency', acronyms: 'Acronyms', numbers: 'Numbers', evidence: 'Evidence', structure: 'Structure', tense: 'Tense', keywords: 'Keywords' };
const guideKey = (g) => `G|${g.rule}|${g.title}`;
// Drop findings whose spans no longer match the text (typing since the last run) or that were dismissed.
function visibleGuidance() {
  return state.guidance.filter((g) => !state.dismissed.has(guideKey(g)) && ruleEnabled(g.rule)
    && g.instances.every((i) => i.end <= state.text.length && state.text.slice(i.start, i.end) === i.original));
}
function guideHighlights() {
  const g = visibleGuidance().find((x) => x.id === state.openGuideId);
  return g ? g.instances.map((i) => ({ start: i.start, end: i.end })) : [];
}
function contextHtml(i) {
  const before = state.text.slice(Math.max(0, i.start - 30), i.start).replace(/\s+/g, ' ');
  const after = state.text.slice(i.end, i.end + 30).replace(/\s+/g, ' ');
  return `${i.start > 30 ? '…' : ''}${escapeHtml(before)}<b>${escapeHtml(i.original.replace(/\s+/g, ' '))}</b>${escapeHtml(after)}${i.end + 30 < state.text.length ? '…' : ''}`;
}
function renderGuidance() {
  const list = visibleGuidance();
  if (!list.length) {
    els.cards.innerHTML = `<div class="empty"><div class="empty-mark">✓</div><h3>No document-level issues found</h3>
      <p>Consistency, acronyms, numbers, claims, paragraph structure, tense and keywords were checked.</p></div>`;
    return;
  }
  let html = '';
  for (const group of GUIDANCE_GROUPS) {
    const items = list.filter((g) => g.group === group);
    if (!items.length) continue;
    html += `<h3 class="guide-group">${escapeHtml(GROUP_LABEL[group] || group)}</h3>`;
    for (const g of items) {
      const open = g.id === state.openGuideId;
      const gid = escapeHtml(g.id);
      const fixable = g.instances.filter((i) => i.fixes.length).length;
      const consistent = fixable && (g.group === 'consistency' || g.group === 'numbers')
        ? `<button type="button" class="fix" data-act="gconsistent" data-g="${gid}">Make consistent (${fixable})</button>` : '';
      const rows = g.instances.map((i, k) => `<li><button type="button" class="guide-inst${i.fixes.length ? ' has-fix' : ''}" data-act="gjump" data-g="${gid}" data-i="${k}">${contextHtml(i)}${i.fixes.length ? `<span class="guide-to">→ ${escapeHtml(i.fixes[0].text.trim() || 'remove')}</span>` : ''}</button></li>`).join('');
      html += `<article class="card guide-card${open ? ' is-open' : ''}" style="--c: var(--brand)">
        <button class="card-head" data-act="gopen" data-g="${gid}" aria-expanded="${open}">
          <i class="dot"></i><span class="card-line"><strong>${escapeHtml(g.title)}</strong></span>
          <span class="card-kind">${escapeHtml(g.ruleName || g.rule)}</span>
        </button>
        ${open ? `<div class="card-body">
          <p class="card-msg">${escapeHtml(g.message)}</p>
          ${whyHtml(g)}
          ${fixable ? '' : '<p class="tip-tag">Advice, no automatic fix</p>'}
          <ol class="guide-list">${rows}</ol>
          ${consistent ? `<div class="fixes">${consistent}</div>` : ''}
          <div class="card-actions"><button class="link" data-act="gdismiss" data-g="${gid}">Dismiss</button><button class="link" data-act="gmute" data-g="${gid}">Turn off this check</button></div>
        </div>` : ''}
      </article>`;
    }
  }
  els.cards.innerHTML = html;
}
function jumpToInstance(gid, k) {
  const g = visibleGuidance().find((x) => x.id === gid);
  const i = g?.instances[k];
  if (!i) return;
  state.openGuideId = gid;
  render();
  els.input.focus({ preventScroll: true });
  els.input.setSelectionRange(i.start, i.end);
  const mark = els.mirror.querySelector(`[data-guide="${i.start}"]`);
  mark?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
function makeConsistent(gid) {
  const g = visibleGuidance().find((x) => x.id === gid);
  if (!g) return;
  const fixes = g.instances.flatMap((i) => i.fixes.slice(0, 1));
  const c = composeFixes(state.text, fixes, { docVariant: true });
  if (!c.ok) { toast('These changes can\'t be applied together safely. Use the individual cards.'); return; }
  state.openGuideId = null;
  replaceRange(c.edit.start, c.edit.end, c.edit.text); // one insertText: one undo step
  toast(`Made ${c.count} change${c.count === 1 ? '' : 's'}. Ctrl/Cmd+Z undoes them all.`);
}
function dismissGuidance(gid) {
  const g = visibleGuidance().find((x) => x.id === gid);
  if (!g) return;
  state.dismissed.add(guideKey(g));
  store.set('dismissed', [...state.dismissed].slice(-500));
  render();
}
function muteGuidance(gid) {
  const g = visibleGuidance().find((x) => x.id === gid);
  if (!g) return;
  if (!state.settings.disabledRules.includes(g.rule)) state.settings.disabledRules = [...state.settings.disabledRules, g.rule];
  saveSettings();
  recompute();
  toast(`Turned off "${g.ruleName || g.rule}". Turn it back on in Settings.`);
}

function muteRule(id) {
  const s = state.suggestions.find((x) => x.id === id);
  if (!s) return;
  if (!state.settings.disabledRules.includes(s.rule)) state.settings.disabledRules = [...state.settings.disabledRules, s.rule];
  saveSettings();
  hidePopover();
  recompute();
  toast(`Turned off "${s.ruleName || s.title}". Turn it back on in Settings.`);
}

function bulkFixes() {
  return state.suggestions.filter(isBulkSafe);
}

/** The cards the current tab shows, in order. */
function visibleList() {
  if (state.filter === 'guidance') return [];
  return state.suggestions.filter((s) => (state.filter === 'all' || s.category === state.filter)
    && (!state.criticalOnly || s.severity === 'critical'));
}

function renderCards() {
  const counts = { all: 0, correctness: 0, clarity: 0, engagement: 0, voice: 0, guidance: visibleGuidance().length };
  for (const s of state.suggestions) { counts.all++; counts[s.category]++; }
  for (const b of els.tabs.querySelectorAll('[data-count]')) b.textContent = counts[b.dataset.count];
  for (const b of els.tabs.querySelectorAll('button')) {
    b.classList.toggle('is-on', b.dataset.cat === state.filter);
    b.setAttribute('aria-selected', b.dataset.cat === state.filter);
  }
  const bulk = bulkFixes();
  els.bulk.hidden = bulk.length < 2 || !['all', 'correctness'].includes(state.filter);
  els.fixAll.textContent = `Accept all ${bulk.length} correctness fixes`;

  if (state.filter === 'guidance') { renderGuidance(); return; }
  const list = visibleList();
  const crit = $('btn-critical');
  if (crit) { crit.classList.toggle('is-on', state.criticalOnly); crit.setAttribute('aria-pressed', String(state.criticalOnly)); }
  // The "{n} fixes in this sentence" chip goes on the first card of each sentence that has a preview.
  const chipFor = new Map();
  for (const g of currentGroups()) {
    const first = list.find((s) => s.start >= g.start && s.end <= g.end);
    if (first) chipFor.set(first.id, g);
  }
  const panel = improveHtml();
  if (!list.length && !panel) {
    const empty = !state.text.trim();
    els.cards.innerHTML = `<div class="empty"><div class="empty-mark">${empty ? '✎' : '✓'}</div>
      <h3>${empty ? 'Start writing' : state.filter === 'all' ? 'Nothing to fix' : `No ${CATEGORY_LABEL[state.filter].toLowerCase()} suggestions`}</h3>
      <p>${empty ? 'Type or paste text on the left. Suggestions show up here.' : 'Your text reads clean on these checks.'}</p></div>`;
    return;
  }
  els.cards.innerHTML = panel + list.map((s) => {
    const open = s.id === state.openCardId;
    const id = escapeHtml(s.id);
    const g = chipFor.get(s.id);
    const chip = g ? `<button type="button" class="chip-improve" data-act="improve" data-start="${g.start}">${g.items.length} fixes in this sentence</button>` : '';
    return `<article class="card c-${s.category} sev-${escapeHtml(s.severity || 'advanced')}${open ? ' is-open' : ''}" data-id="${id}" style="--c: var(--${s.category})">
      <button class="card-head" data-act="open" data-id="${id}" aria-expanded="${open}">
        <i class="dot"></i>
        <span class="card-line">${fixPreview(s)}</span>
        <span class="card-kind">${escapeHtml(s.ruleName || s.title)}</span>
      </button>
      ${chip}
      ${open ? `<div class="card-body">
        <p class="card-title">${escapeHtml(s.title)}</p>
        ${suggestionBody(s)}
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
  const sev = { critical: 0, advanced: 0, style: 0 };
  for (const s of state.suggestions) sev[s.severity || 'advanced'] = (sev[s.severity || 'advanced'] || 0) + 1;
  const gn = visibleGuidance().length;
  els.scoreMeta.textContent = state.text.trim() ? `${n} suggestion${n === 1 ? '' : 's'} · ${sev.critical} critical · ${sev.advanced} advanced · ${sev.style} style · Guidance: ${gn} document note${gn === 1 ? '' : 's'}` : '';
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
    <p class="pop-title">${escapeHtml(s.ruleName || s.title)}</p>
    ${s.ruleName && s.ruleName !== s.title ? `<p class="pop-msg">${escapeHtml(s.title)}</p>` : ''}
    ${suggestionBody(s)}`;
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
    // Placeholder actor ("[who]"): select it so the writer can type the real name.
    els.input.setSelectionRange(fix.start + fix.select[0], fix.start + fix.select[1]);
    toast('Type who did it over the selected placeholder');
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
    <div class="perf-cats">${Object.entries(counts).map(([k, v]) => cell(v, CATEGORY_LABEL[k])).join('')}</div>
    ${paragraphTable()}`;
}

// Round 9: per-paragraph view. Click a row to jump to that paragraph.
function paragraphTable() {
  const rows = paragraphStats(state.text).filter((p) => p.words >= 5);
  if (rows.length < 2) return '';
  const limit = state.settings.longSentence || 30;
  const flag = (p) => {
    const notes = [];
    if (p.longest > limit) notes.push(`a ${p.longest}-word sentence`);
    if (p.sentences >= 4 && p.spread <= 4 && p.avgSentence >= 14) notes.push('same-length sentences');
    if (p.words > 180) notes.push('long paragraph');
    return notes.join(', ');
  };
  return `<h3 class="perf-section">Paragraphs</h3>
    <div class="para-table">
      <div class="para-row para-head" aria-hidden="true"><span>Paragraph</span><span>Words</span><span>Sentences</span><span>Avg / longest</span><span>Readability</span></div>
      ${rows.map((p, i) => `<button type="button" class="para-row" data-pjump="${p.start}" data-pend="${p.end}"
        aria-label="${escapeHtml(`Paragraph ${i + 1}: ${p.words} words, ${p.sentences} sentences, average ${p.avgSentence} and longest ${p.longest} words, ${p.label || 'no readability score'}${flag(p) ? `; ${flag(p)}` : ''}. Jump to it.`)}">
        <span><b>${i + 1}.</b> ${escapeHtml(p.preview)}…${flag(p) ? `<em>${escapeHtml(flag(p))}</em>` : ''}</span>
        <span>${p.words}</span><span>${p.sentences}</span><span>${p.avgSentence} / ${p.longest}</span>
        <span>${escapeHtml(p.label || '–')}</span></button>`).join('')}
    </div>`;
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
  // Round 9: Alt+J / Alt+K next and previous card, Alt+Enter accept its first fix, Alt+Backspace dismiss.
  // Nothing changes the text without the writer pressing a key for that one card.
  if (!e.altKey || e.ctrlKey || e.metaKey || $('editor-view').hidden || document.querySelector('dialog[open]')) return;
  if (e.code === 'KeyJ' || e.code === 'KeyK') { e.preventDefault(); stepCard(e.code === 'KeyJ' ? 1 : -1); return; }
  const open = state.suggestions.find((x) => x.id === state.openCardId);
  if (!open) return;
  // Alt/Option+Backspace deletes a word in the editor (macOS), so dismiss works only outside the textarea.
  if (e.code === 'Enter' && open.fixes.length) { e.preventDefault(); applySuggestionFix(open.id, 0); }
  else if (e.code === 'Backspace' && document.activeElement !== els.input) { e.preventDefault(); dismiss(open.id); }
});
if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) {
  for (const k of document.querySelectorAll('.kbd-hint kbd')) if (k.textContent === 'Alt') k.textContent = '⌥';
}
window.addEventListener('resize', () => { if (!$('editor-view').hidden) renderGutter(); });
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
  else if (act === 'mute') muteRule(id);
  else if (act === 'gopen') { state.openGuideId = state.openGuideId === btn.dataset.g ? null : btn.dataset.g; render(); }
  else if (act === 'gjump') jumpToInstance(btn.dataset.g, Number(btn.dataset.i));
  else if (act === 'gconsistent') makeConsistent(btn.dataset.g);
  else if (act === 'gdismiss') dismissGuidance(btn.dataset.g);
  else if (act === 'gmute') muteGuidance(btn.dataset.g);
  else if (act === 'improve') openImprove(Number(btn.dataset.start));
  else if (act === 'improve-close') { state.improve = null; renderCards(); }
  else if (act === 'improve-accept') acceptImprove();
  else if (act === 'improve-toggle') {
    if (state.improve) state.improve.sel.set(id, btn.checked);
    renderCards();
  }
  else if (act === 'syn') {
    const words = JSON.parse(els.popover.dataset.words || '[]');
    const anchor = state.synonymAnchor;
    const w = words[Number(btn.dataset.i)];
    if (!anchor || !w) return;
    hidePopover();
    replaceRange(anchor.start, anchor.end, w);
  } else if (act === 'open') {
    state.walkPos = Math.max(0, visibleList().findIndex((x) => x.id === id));
    state.openCardId = state.openCardId === id ? null : id;
    state.activeId = state.openCardId;
    hidePopover();
    render();
    const mark = els.mirror.querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (mark && state.activeId) mark.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}
els.cards.addEventListener('click', handleAction);
$('gutter')?.addEventListener('click', handleAction);
els.popover.addEventListener('click', handleAction);
els.popover.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });

els.tabs.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-cat]');
  if (!b) return;
  state.filter = b.dataset.cat;
  renderCards();
});
els.fixAll.addEventListener('click', fixAll);
$('btn-critical').addEventListener('click', () => { state.criticalOnly = !state.criticalOnly; renderCards(); });

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
els.perfBody.addEventListener('click', (e) => {
  const row = e.target.closest('[data-pjump]');
  if (!row) return;
  els.perf.close();
  const start = Number(row.dataset.pjump), end = Number(row.dataset.pend);
  els.input.focus({ preventScroll: true });
  els.input.setSelectionRange(start, end);
  scrollToOffset(start);
});

/** Scroll the document so the character at `pos` is in view (the mirror holds the same text as the textarea). */
function scrollToOffset(pos) {
  const walker = document.createTreeWalker(els.mirror, NodeFilter.SHOW_TEXT);
  let seen = 0;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (seen + n.length > pos) {
      const r = document.createRange();
      r.setStart(n, pos - seen);
      r.setEnd(n, Math.min(n.length, pos - seen + 1));
      const box = r.getBoundingClientRect();
      const doc = $('doc');
      const target = box.top - doc.getBoundingClientRect().top + doc.scrollTop - doc.clientHeight / 3;
      if (doc.scrollHeight > doc.clientHeight) doc.scrollTo({ top: target, behavior: 'smooth' });
      else window.scrollTo({ top: box.top + window.scrollY - window.innerHeight / 3, behavior: 'smooth' });
      return;
    }
    seen += n.length;
  }
}
$('btn-perf').addEventListener('click', openPerf);
els.statWords.addEventListener('click', openPerf);

// Settings
const setDialect = $('set-dialect');
const setTheme = $('set-theme');
function syncSettingsForm() {
  setDialect.value = state.settings.dialect;
  setTheme.value = state.settings.theme;
  for (const cb of els.settings.querySelectorAll('[data-cat-toggle]')) cb.checked = categoryEnabled(cb.dataset.catToggle);
  $('set-repetition').checked = state.settings.repetition;
  $('set-serial').value = state.settings.serialComma;
  const muted = state.settings.disabledRules;
  $('muted').innerHTML = muted.length
    ? muted.map((r) => `<span class="chip">${escapeHtml(RULE_INFO[r]?.name || r)}<button type="button" data-rule="${escapeHtml(r)}" aria-label="Turn ${escapeHtml(RULE_INFO[r]?.name || r)} back on">×</button></span>`).join('')
    : '<span class="dict-empty">Checks you turn off from a card show up here.</span>';
  $('dict').innerHTML = state.dictionary.size
    ? [...state.dictionary].sort().map((w) => `<span class="chip">${escapeHtml(w)}<button type="button" data-word="${escapeHtml(w)}" aria-label="Remove ${escapeHtml(w)}">×</button></span>`).join('')
    : '<span class="dict-empty">Words you add from spelling suggestions show up here.</span>';
}
for (const b of document.querySelectorAll('[data-open-settings]')) b.addEventListener('click', () => { syncSettingsForm(); els.settings.showModal(); });
setDialect.addEventListener('change', () => { state.settings.dialect = setDialect.value; saveSettings(); if (state.docId) { runLocal(); scheduleRemote(100); } });
setTheme.addEventListener('change', () => { state.settings.theme = setTheme.value; saveSettings(); applyTheme(); });
els.settings.addEventListener('change', (e) => {
  if (e.target.id === 'set-serial') {
    state.settings.serialComma = e.target.value;
    saveSettings();
    if (state.docId) runLocal();
    return;
  }
  if (e.target.id === 'set-repetition') {
    state.settings.repetition = e.target.checked;
    saveSettings();
    if (state.docId) runLocal();
    return;
  }
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
$('muted').addEventListener('click', (e) => {
  const r = e.target.dataset?.rule;
  if (!r) return;
  state.settings.disabledRules = state.settings.disabledRules.filter((x) => x !== r);
  saveSettings();
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
