// Optional deep grammar check via the public LanguageTool API (rule-based,
// not generative). Text is only sent when the user turns deep check on.

const ENDPOINT = 'https://api.languagetool.org/v2/check';
const MAX_CHUNK = 18000; // free tier accepts 20 KB per request

// Local rules already cover these; letting both fire would double-flag.
const DISABLED_RULES = [
  'WHITESPACE_RULE', 'COMMA_PARENTHESIS_WHITESPACE', 'EN_QUOTES', 'DASH_RULE', 'UPPERCASE_SENTENCE_START',
  'EN_A_VS_AN', 'ENGLISH_WORD_REPEAT_RULE', 'I_LOWERCASE', 'PASSIVE_VOICE', 'TOO_LONG_SENTENCE',
  'EN_UNPAIRED_BRACKETS', 'PUNCTUATION_PARAGRAPH_END', 'ELLIPSIS', 'EN_UNPAIRED_QUOTES',
].join(',');

// LanguageTool "style" rules that rewrite phrasing to taste. Skipped to protect voice.
const VOICE_SAFE_SKIP = /^(EN_REPEATEDWORDS|SENTENCE_FRAGMENT|STYLE_REPEATED|REP_|EN_WORDINESS|ADVERB_|INFORMAL|CONTRACTION|GONNA|WANNA|AND_ALSO|SO_AS_TO|THE_SUPERLATIVE|EXTREME_ADJECTIVES|NOT_JUST|BEGINNING_OF_SENTENCE|SENT_START_CONJUNCTIVE)/;

function chunk(text) {
  if (text.length <= MAX_CHUNK) return [{ offset: 0, text }];
  const parts = [];
  let offset = 0;
  while (offset < text.length) {
    let end = Math.min(text.length, offset + MAX_CHUNK);
    if (end < text.length) {
      const nl = text.lastIndexOf('\n', end);
      if (nl > offset + 1000) end = nl + 1;
      else {
        const sp = text.lastIndexOf(' ', end);
        if (sp > offset + 1000) end = sp + 1;
      }
    }
    parts.push({ offset, text: text.slice(offset, end) });
    offset = end;
  }
  return parts;
}

function category(match) {
  const type = match.rule?.issueType || '';
  if (type === 'misspelling' || type === 'grammar' || type === 'typographical' || type === 'duplication') return 'correctness';
  if (type === 'style' || type === 'register') return 'clarity';
  const cat = match.rule?.category?.id || '';
  if (/TYPOS|GRAMMAR|PUNCTUATION|CASING|CONFUSED/.test(cat)) return 'correctness';
  return 'clarity';
}

function toSuggestion(match, offset, text) {
  const start = offset + match.offset;
  const end = start + match.length;
  const original = text.slice(start, end);
  const isSpelling = match.rule?.issueType === 'misspelling';
  return {
    rule: `lt:${match.rule?.id || 'rule'}`,
    category: category(match),
    title: match.shortMessage || (isSpelling ? 'Spelling' : match.rule?.description || 'Grammar'),
    message: match.message,
    start, end, original,
    scope: 'word',
    spelling: isSpelling,
    // Short, single-span replacements only (no multi-word rephrasing).
    fixes: (match.replacements || []).filter((r) => typeof r.value === 'string' && r.value.trim().split(/\s+/).length <= 3)
      .slice(0, 4).map((r) => ({ text: r.value, start, end })),
    source: 'languagetool',
  };
}

/**
 * @param {string} text
 * @param {{ language: string, signal?: AbortSignal }} opts  language: en-US | en-GB
 */
export async function checkWithLanguageTool(text, { language = 'en-US', signal } = {}) {
  if (!text.trim()) return [];
  const results = [];
  for (const part of chunk(text)) {
    // Free, rule-based checking only. Never add apiKey/username here: that would
    // unlock premium and model-driven rules.
    const body = new URLSearchParams({
      text: part.text,
      language,
      level: 'default',
      disabledRules: DISABLED_RULES,
      enabledOnly: 'false',
    });
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body,
      // Give up after 15 s so the status never hangs on "running".
      signal: signal && AbortSignal.any ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : signal,
    });
    if (res.status === 429) throw new Error('rate-limited');
    if (!res.ok) throw new Error(`http-${res.status}`);
    const data = await res.json();
    for (const m of data.matches || []) {
      if (VOICE_SAFE_SKIP.test(m.rule?.id || '')) continue;
      // Skip anything premium or model-driven (LanguageTool's AI_* rule family), even if the server sends it.
      if (m.rule?.isPremium || /^AI_|HYDRA|LECTOR|GPT|NEURAL|_ML_|LLM/i.test(m.rule?.id || '')) continue;
      results.push(toSuggestion(m, part.offset, text));
    }
  }
  return results;
}
