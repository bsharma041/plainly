// Highlight layer for the textarea. The mirror div holds the same text with
// transparent glyphs and coloured underlines; the textarea sits on top.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

/**
 * @param {HTMLElement} mirror
 * @param {string} text
 * @param {Array} suggestions merged suggestions
 * @param {{activeId?: string, anchor?: {start:number,end:number}}} state
 */
export function renderMirror(mirror, text, suggestions, { activeId, anchor } = {}) {
  const active = suggestions.find((s) => s.id === activeId);
  let marks = suggestions.filter((s) => s.scope !== 'sentence');

  // An active sentence-level card highlights the whole sentence; inner marks give way.
  const blocks = [];
  if (active && active.scope === 'sentence') blocks.push({ ...active, kind: 'sentence' });
  if (anchor) blocks.push({ id: '__anchor', start: anchor.start, end: anchor.end, kind: 'anchor' });
  if (blocks.length) {
    marks = marks.filter((m) => !blocks.some((b) => m.start < b.end && m.end > b.start));
  }

  const items = [
    ...marks.map((m) => ({ start: m.start, end: m.end, html: (inner) => `<mark class="m m-${m.category} sev-${escapeHtml(m.severity || 'advanced')}${m.id === activeId ? ' is-active' : ''}" data-id="${escapeHtml(m.id)}">${inner}</mark>` })),
    ...blocks.map((b) => ({ start: b.start, end: b.end, html: (inner) => b.kind === 'anchor'
      ? `<span class="m-anchor" data-anchor="1">${inner}</span>`
      : `<mark class="m-sentence m-${b.category}" data-id="${escapeHtml(b.id)}">${inner}</mark>` })),
  ].sort((a, b) => a.start - b.start);

  let html = '';
  let pos = 0;
  for (const it of items) {
    if (it.start < pos || it.end > text.length) continue;
    html += escapeHtml(text.slice(pos, it.start));
    html += it.html(escapeHtml(text.slice(it.start, it.end)));
    pos = it.end;
  }
  html += escapeHtml(text.slice(pos));
  // A trailing newline needs a character after it, or the mirror ends one line short.
  mirror.innerHTML = html + ' ';
}

/** Grow the textarea to fit its content so the page (not the textarea) scrolls. */
export function autosize(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}

/** Position a popover under an element inside the same offset parent. */
export function placePopover(popover, target, container) {
  const t = target.getBoundingClientRect();
  const c = container.getBoundingClientRect();
  popover.hidden = false;
  const pw = popover.offsetWidth;
  let left = t.left - c.left;
  left = Math.max(8, Math.min(left, container.clientWidth - pw - 8));
  let top = t.bottom - c.top + 8;
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
  // Flip above if it would run past the bottom of the viewport.
  const pr = popover.getBoundingClientRect();
  const viewport = (container.closest('.doc') || document.documentElement).getBoundingClientRect();
  const bottomLimit = Math.min(window.innerHeight, viewport.bottom) - 8;
  const topLimit = Math.max(0, viewport.top) + 8;
  if (pr.bottom > bottomLimit && t.top - pr.height - 8 > topLimit) {
    top = t.top - c.top - pr.height - 8;
    popover.style.top = `${top}px`;
  }
}
