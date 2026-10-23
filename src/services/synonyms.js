// Synonyms: built-in list first (works offline), then Datamuse. Every result
// passes the AI-word filter so a swap never makes the text sound generated.

import { THESAURUS } from '../engine/data/thesaurus.js';
import { AI_VOCAB } from '../engine/data/lists.js';
import { matchCase, sameInflection } from '../engine/text.js';
import { isAiWord } from '../engine/guard.js';

const cache = new Map();

function clean(list, word) {
  const lower = word.toLowerCase();
  const seen = new Set();
  return list.filter((w) => {
    const k = w.toLowerCase();
    if (k === lower || seen.has(k) || AI_VOCAB.has(k) || k.split(' ').some(isAiWord) || BLOCK.has(k)) return false;
    if (!/^[a-z][a-z' -]*$/i.test(w) || w.split(' ').length > 2) return false;
    seen.add(k);
    return true;
  });
}

// Never offered, whatever the lookup returns.
const BLOCK = new Set(['ass', 'arse', 'butt', 'bum', 'prat', 'crap', 'damn', 'hell', 'piss', 'shit', 'bitch', 'bastard', 'dick', 'cock', 'tit', 'tits', 'screw', 'fuck', 'bollocks', 'sod', 'slut', 'whore', 'retard', 'idiot', 'moron', 'buttocks', 'derriere', 'fundament', 'backside', 'rump', 'rear end', 'tail end', 'can', 'john', 'stern']);

async function getJson(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`http-${res.status}`);
  return res.json();
}

// Prepositions, pronouns and other function words have no safe synonyms.
const FUNCTION_WORDS = new Set(('about above across after against along amid among around as at before behind below beneath beside besides between beyond by despite down during except for from in inside into like near of off on onto out outside over past since than through throughout till to toward towards under underneath unlike until up upon via with within without ' +
  'a an the this that these those i me my mine you your yours he him his she her hers it its we us our ours they them their theirs who whom whose which what and or but nor so yet if because although though while whereas unless whether not no is am are was were be been being do does did have has had will would shall should can could may might must').split(' '));

// Datamuse tags results with parts of speech (n, v, adj, adv). We keep candidates
// that share the word's most common part of speech, and rank them by how well
// they fit between the neighbouring words (lc/rc context hints).
async function datamuse(word, { left, right, signal }) {
  const q = encodeURIComponent(word.toLowerCase());
  const ctx = `${left ? `&lc=${encodeURIComponent(left)}` : ''}${right ? `&rc=${encodeURIComponent(right)}` : ''}`;
  const [self, syn, ml] = await Promise.all([
    getJson(`https://api.datamuse.com/words?sp=${q}&md=p&max=1`, signal),
    getJson(`https://api.datamuse.com/words?rel_syn=${q}&md=pf&max=40`, signal),
    getJson(`https://api.datamuse.com/words?ml=${q}${ctx}&md=pf&max=40`, signal),
  ]);
  const posTags = (d) => (d.tags || []).filter((t) => ['n', 'v', 'adj', 'adv'].includes(t));
  const own = self[0] && self[0].word === word.toLowerCase() ? posTags(self[0]) : [];
  const primary = own[0];
  // f:<per-million frequency>. Drop rare words nobody would actually write.
  const freq = (d) => Number((d.tags || []).find((t) => t.startsWith('f:'))?.slice(2) || 0);
  const fits = (d) => (!primary || posTags(d).includes(primary)) && freq(d) >= 1.5;
  const synSet = new Set(syn.filter(fits).map((d) => d.word));
  // Context-ranked list first (true synonyms before loose matches), then leftover synonyms.
  const ranked = ml.filter(fits).map((d) => d.word);
  const out = [...ranked.filter((w) => synSet.has(w)), ...ranked.filter((w) => !synSet.has(w)).slice(0, 6), ...synSet];
  return out;
}

/**
 * @param {string} word
 * @param {{ left?: string, right?: string, signal?: AbortSignal }} ctx neighbouring words
 * @returns {{ words: string[], offline: boolean, functionWord?: boolean }}
 */
export async function synonymsFor(word, { left = '', right = '', signal } = {}) {
  const key = `${word.toLowerCase()}|${left.toLowerCase()}|${right.toLowerCase()}`;
  if (FUNCTION_WORDS.has(word.toLowerCase())) return { words: [], offline: false, functionWord: true };
  if (cache.has(key)) return cache.get(key);
  const local = (THESAURUS[word.toLowerCase()] || []).filter((w) => sameInflection(word, w));
  let online = [];
  let offline = false;
  try {
    online = await datamuse(word, { left, right, signal });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    offline = true;
  }
  online = online.filter((w) => sameInflection(word, w));
  const result = {
    words: clean([...local, ...online], word).slice(0, 10).map((w) => matchCase(word, w)),
    offline,
  };
  if (!offline) {
    if (cache.size > 200) cache.delete(cache.keys().next().value);
    cache.set(key, result);
  }
  return result;
}
