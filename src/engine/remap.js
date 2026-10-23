// Keep remote (deep check) suggestions aligned while the user types, without
// waiting for a new network round trip. Suggestions touching the edited region
// (including ones directly adjacent to it) are dropped; everything after shifts.

export function diffRange(oldText, newText) {
  let p = 0;
  const max = Math.min(oldText.length, newText.length);
  while (p < max && oldText[p] === newText[p]) p++;
  let s = 0;
  while (s < max - p && oldText[oldText.length - 1 - s] === newText[newText.length - 1 - s]) s++;
  return { start: p, oldEnd: oldText.length - s, newEnd: newText.length - s };
}

export function remap(suggestions, oldText, newText) {
  if (oldText === newText) return suggestions;
  const { start, oldEnd, newEnd } = diffRange(oldText, newText);
  const delta = newEnd - oldEnd;
  const out = [];
  for (const sg of suggestions) {
    const lo = Math.min(sg.start, ...sg.fixes.map((f) => f.start));
    const hi = Math.max(sg.end, ...sg.fixes.map((f) => f.end));
    if (hi < start) {
      out.push(sg);
    } else if (lo > oldEnd) {
      out.push({
        ...sg,
        start: sg.start + delta,
        end: sg.end + delta,
        fixes: sg.fixes.map((f) => ({ ...f, start: f.start + delta, end: f.end + delta })),
      });
    }
  }
  return out;
}
