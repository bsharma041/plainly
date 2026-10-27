// Harder correctness checks: comma splices, agreement with quantifiers,
// verb forms after auxiliaries, comparatives, capitalisation, contractions.
import { matchCase, splitSentences, isSentenceStart, capitalize } from '../text.js';

const CAT = 'correctness';
const make = (rule, start, end, original, fixes, title, message) => ({
  rule, category: CAT, scope: 'word', start, end, original, title, message,
  fixes: fixes.map((f) => (typeof f === 'string' ? { text: f, start, end } : f)),
});

function prevWord(text, i) {
  const m = text.slice(Math.max(0, i - 30), i).match(/([A-Za-z'’]+)\s*$/);
  return m ? m[1].toLowerCase() : '';
}

function insideQuotes(text, index) {
  const lineStart = text.lastIndexOf('\n', index - 1) + 1;
  const before = text.slice(lineStart, index);
  return (before.match(/"/g) || []).length % 2 === 1 || (before.match(/“/g) || []).length > (before.match(/”/g) || []).length;
}

// ---------- comma splices ----------
const SPLICE_SUBJECT = '(I|we|you|he|she|it|they|this|there)';
const AUX = new Set(['is', 'are', 'was', 'were', 'am', 'has', 'have', 'had', 'will', 'would', 'can', 'could', 'should', 'may', 'might', 'must', 'do', 'does', 'did', "isn't", "aren't", "wasn't", "weren't", "don't", "doesn't", "didn't", "won't", "can't", "couldn't", "shouldn't", 'seems', 'seemed', 'looks', 'looked', 'means', 'meant', 'makes', 'made', 'gives', 'gave', 'shows', 'showed', 'needs', 'needed', 'remains', 'remained']);
const SUBORDINATE_START = /^(if|when|whenever|while|although|though|because|since|after|before|as|unless|whether|once|until|even|where|wherever|given|despite|in case|so that|according|compared|based|[a-z]+ing|[a-z]+ed)\b/i;

function commaSplices(text, out) {
  for (const s of splitSentences(text)) {
    const re = new RegExp(`,\\s+${SPLICE_SUBJECT}\\s+([A-Za-z'’]+)`, 'g');
    let m;
    while ((m = re.exec(s.text))) {
      const verb = m[2].toLowerCase();
      const thirdSing = /^(he|she|it|this|there)$/i.test(m[1]);
      const verbish = AUX.has(verb) || /ed$/.test(verb) || (thirdSing && /[^s]s$/.test(verb) && verb.length > 3);
      if (!verbish) continue;
      // "Costs rose, it seems." is a reporting tag, not a second sentence.
      if (/^,\s+\S+\s+\S+\s*[.!?]?\s*$/.test(s.text.slice(m.index))) continue;
      // Left side: from the last clause boundary to the comma.
      const leftAll = s.text.slice(0, m.index);
      const left = leftAll.split(/[;:—]/).pop().trim();
      const leftWords = left.split(/\s+/).filter(Boolean);
      if (leftWords.length < 3) continue;
      if (SUBORDINATE_START.test(left)) continue;
      if (/,/.test(left)) continue; // lists and parentheticals: too risky
      if (!leftWords.some((w) => AUX.has(w.toLowerCase()) || /ed$/i.test(w) || PAST_TO_BASE[w.toLowerCase()])) continue;
      if (/\b(said|says|asked|replied|wrote|thought)$/i.test(left)) continue;
      if (/^(yes|no|well|oh|ok|okay|however|also|first|second|then|still|now|so|and|but)$/i.test(leftWords[0]) && leftWords.length < 4) continue;
      if (insideQuotes(text, s.start + m.index)) continue;
      const at = s.start + m.index;
      const pron = m[1];
      const nextCap = pron === 'I' ? 'I' : capitalize(pron);
      const end = at + m[0].indexOf(pron) + pron.length;
      out.push(make('comma-splice', at, end, text.slice(at, end), [
        { text: `; ${pron}`, start: at, end, label: `Use a semicolon: "…; ${pron} ${m[2]}…"` },
        { text: `. ${nextCap}`, start: at, end, label: `Start a new sentence: "…. ${nextCap} ${m[2]}…"` },
        { text: `, and ${pron}`, start: at, end, label: `Join with "and"` },
      ], 'Possible comma splice', 'Two complete sentences are joined with only a comma. A semicolon, a full stop or a joining word fixes it.'));
    }
  }
}

// ---------- agreement with quantifiers ----------
const AGREE = [
  { re: /\b(there)\s+(is|was)\s+(many|several|few|two|three|four|five|numerous|various|lots)\b/gi, fix: (m) => `${m[1]} ${m[2].toLowerCase() === 'is' ? 'are' : 'were'} ${m[3]}`, msg: 'The verb should agree with the plural that follows.' },
  { re: /\b(there)['’]s\s+(many|several|few|two|three|four|five|numerous|various)\b/gi, fix: (m) => `${m[1]} are ${m[2]}`, msg: 'The verb should agree with the plural that follows.' },
  { re: /\b(everyone|everybody|someone|somebody|nobody|anyone|anybody|each|either|neither)\s+(are|were|have)\b/gi, fix: (m) => `${m[1]} ${{ are: 'is', were: 'was', have: 'has' }[m[2].toLowerCase()]}`, msg: '"$1" is singular, so the verb is singular too.' },
  { re: /\b(each of the \w+)\s+(are|were|have)\b/gi, fix: (m) => `${m[1]} ${{ are: 'is', were: 'was', have: 'has' }[m[2].toLowerCase()]}`, msg: '"Each" takes a singular verb.' },
  { re: /\b(the number of \w+)\s+(are|were|have)\b/gi, fix: (m) => `${m[1]} ${{ are: 'is', were: 'was', have: 'has' }[m[2].toLowerCase()]}`, msg: '"The number of" takes a singular verb.' },
  { re: /\b(people|children)\s+(is|was|has)\b/gi, fix: (m) => `${m[1]} ${{ is: 'are', was: 'were', has: 'have' }[m[2].toLowerCase()]}`, msg: '"$1" is plural.' },
];

function agreement(text, out) {
  for (const a of AGREE) {
    a.re.lastIndex = 0;
    let m;
    while ((m = a.re.exec(text))) {
      if (insideQuotes(text, m.index)) continue;
      if (/^(each|either|neither)$/i.test(m[1]) && /\bof\b/.test(text.slice(m.index + m[0].length, m.index + m[0].length + 4))) continue;
      // "the cost and timing of each are", "the data for each are": after a preposition, "each" is its object, not the subject.
      if (/^(each|either|neither)$/i.test(m[1]) && /^(of|for|to|from|in|on|by|with|among|between)$/.test(prevWord(text, m.index))) continue;
      // "They each have", "The teams each are": "each" follows a plural subject.
      if (/^(each|either|neither)$/i.test(m[1])) {
        const pw = prevWord(text, m.index);
        if (/^(they|we|you|these|those|both)$/.test(pw) || /[^s]s$/.test(pw)) continue;
      }
      out.push(make('agreement', m.index, m.index + m[0].length, m[0], [matchCase(m[0], a.fix(m))], 'Fix subject-verb agreement', a.msg.replace('$1', m[1])));
    }
  }
}

// ---------- agreement with "one of the ..." ----------
const ONE_OF_PLURALS = 'reports|items|people|children|students|employees|members|teams|companies|countries|villages|households|customers|problems|options|documents|files|examples|cases|books|cars|days|weeks|years|hours|words|mistakes|errors|questions|answers|results|figures|tables|records|products|services|rules|tests|changes|features|issues|concerns|projects|departments|committees|men|women';
const ONE_OF_AGREEMENT = new RegExp(`\\b(one of the (?:${ONE_OF_PLURALS}))\\s+(are|were|have)\\b`, 'gi');

function oneOfAgreement(text, out) {
  ONE_OF_AGREEMENT.lastIndex = 0;
  let m;
  while ((m = ONE_OF_AGREEMENT.exec(text))) {
    if (insideQuotes(text, m.index)) continue;
    const verb = m[2].toLowerCase();
    const fix = { are: 'is', were: 'was', have: 'has' }[verb];
    const at = m.index + m[1].length + m[0].slice(m[1].length).search(/\\S/);
    out.push(make(
      'agreement', at, at + m[2].length, m[2], [matchCase(m[2], fix)],
      'Fix subject-verb agreement',
      'In this construction, "one" is the subject, so it takes a singular verb.'
    ));
  }
}

// ---------- verb forms ----------
const PAST_TO_PARTICIPLE = { went: 'gone', came: 'come', ran: 'run', saw: 'seen', did: 'done', ate: 'eaten', wrote: 'written', broke: 'broken', took: 'taken', gave: 'given', began: 'begun', chose: 'chosen', drove: 'driven', spoke: 'spoken', stole: 'stolen', drank: 'drunk', swam: 'swum', rang: 'rung', sang: 'sung', flew: 'flown', grew: 'grown', knew: 'known', threw: 'thrown', drew: 'drawn', forgot: 'forgotten', hid: 'hidden', rode: 'ridden', shook: 'shaken', woke: 'woken', froze: 'frozen', tore: 'torn', wore: 'worn', fell: 'fallen', became: 'become' };
const PAST_TO_BASE = { went: 'go', came: 'come', ran: 'run', saw: 'see', did: 'do', ate: 'eat', wrote: 'write', took: 'take', gave: 'give', made: 'make', knew: 'know', got: 'get', found: 'find', thought: 'think', told: 'tell', bought: 'buy', brought: 'bring', said: 'say', left: 'leave', felt: 'feel', kept: 'keep', began: 'begin', broke: 'break', chose: 'choose', spoke: 'speak', paid: 'pay', sent: 'send', spent: 'spend', built: 'build', heard: 'hear', meant: 'mean', met: 'meet', sold: 'sell', taught: 'teach', understood: 'understand', won: 'win', lost: 'lose', held: 'hold', stood: 'stand', sat: 'sit' };

function verbForms(text, out) {
  let m;
  const perfect = new RegExp(`\\b(has|have|had|having|'ve|’ve)\\s+(${Object.keys(PAST_TO_PARTICIPLE).join('|')})\\b`, 'gi');
  while ((m = perfect.exec(text))) {
    if (insideQuotes(text, m.index)) continue;
    // "Everything we had came from donations": "we had" is a relative clause, "came" is the main verb.
    const p1 = prevWord(text, m.index);
    if (/^(i|we|you|they|he|she|it)$/.test(p1)) {
      const beforeP1 = text.slice(0, m.index).replace(/\s*[A-Za-z'’]+\s*$/, '');
      const p2 = (beforeP1.match(/([A-Za-z'’]+)\s*$/) || [])[1]?.toLowerCase();
      if (p2 && !/[.!?;:,]\s*$/.test(beforeP1) && !/^(and|but|so|then|because|if|when|since|now|today|yesterday|recently|already|finally)$/.test(p2)) continue;
    }
    const at = m.index + m[0].length - m[2].length;
    const fix = matchCase(m[2], PAST_TO_PARTICIPLE[m[2].toLowerCase()]);
    out.push(make('verb-form', at, at + m[2].length, m[2], [fix], `Use "${fix}"`, `After "${m[1]}", use the past participle "${fix}".`));
  }
  const doPast = new RegExp(`\\b(did|didn['’]t|does|doesn['’]t|do|don['’]t|to|will|would|can|could|should|must|might|may)\\s+(not\\s+)?(${Object.keys(PAST_TO_BASE).join('|')})\\b`, 'gi');
  while ((m = doPast.exec(text))) {
    const aux = m[1].toLowerCase();
    const v = m[3].toLowerCase();
    if (/^(Will|May|Can|Should)$/.test(m[1])) continue; // "Will ran the meeting": a name, not the modal
    if (insideQuotes(text, m.index)) continue;
    // "to left", "to said" are errors; but "to found a company", "can found" etc. are rare real verbs.
    if (v === 'saw' || v === 'found') continue; // "used to saw logs", "will found a unit" are real verbs
    if (['found', 'left', 'felt', 'met', 'won', 'lost', 'held', 'paid', 'sent', 'spent', 'built', 'kept', 'sat', 'stood', 'made', 'did', 'got', 'heard', 'meant', 'told', 'said', 'sold', 'taught', 'understood', 'bought', 'brought', 'thought'].includes(v) && aux === 'to') continue;
    if (aux === 'do' || aux === 'does' || aux === 'did') {
      if (v === 'did') continue;
    }
    const at = m.index + m[0].length - m[3].length;
    const fix = matchCase(m[3], PAST_TO_BASE[v]);
    out.push(make('verb-form', at, at + m[3].length, m[3], [fix], `Use "${fix}"`, `After "${m[1]}", use the base form "${fix}".`));
  }
}

// ---------- comparatives, fewer/less ----------
const COUNT_NOUNS = 'people|items|cars|words|mistakes|errors|households|consumers|employees|options|days|hours|members|students|cases|meters|villages|districts|projects|problems|jobs|staff members|complaints|connections|customers|units';
function comparatives(text, out) {
  let m;
  const dbl = /\b(more|most)\s+([a-z]+er|[a-z]+est|better|worse|best|worst)\b/gi;
  while ((m = dbl.exec(text))) {
    const adj = m[2].toLowerCase();
    if (/^(other|over|under|after|never|ever|eager|clever|tender|proper|sober|bitter|slender|power|water|paper|number|user|layer|matter|consumer|customer|member|order|manner|interest|honest|modest|earnest|harvest|forest|request|interest|protest|contest|suggest|digest|invest)$/.test(adj)) continue;
    if (text[m.index + m[0].length] === '-') continue; // "more longer-term contracts"
    if (/(er|est)$/.test(adj) && !/^(better|worse|best|worst|easier|harder|faster|slower|bigger|smaller|larger|higher|lower|greater|cheaper|simpler|quicker|stronger|weaker|longer|shorter|easiest|hardest|fastest|biggest|smallest|largest|highest|lowest|greatest|cheapest|simplest|strongest|weakest|longest|shortest|newer|older|newest|oldest|wider|widest|safer|safest|richer|poorer|richest|poorest)$/.test(adj)) continue;
    out.push(make('double-comparative', m.index, m.index + m[0].length, m[0], [{ text: m[2], start: m.index, end: m.index + m[0].length }], `Remove "${m[1]}"`, `"${m[2]}" is already comparative, so "${m[1]}" is extra.`));
  }
  const less = new RegExp(`\\bless\\s+(${COUNT_NOUNS})\\b`, 'gi');
  while ((m = less.exec(text))) {
    out.push(make('fewer-less', m.index, m.index + 4, m[0].slice(0, 4), [matchCase(m[0].slice(0, 4), 'fewer')], 'Use "fewer"', `Use "fewer" with things you can count ("${m[1]}").`));
  }
}

// ---------- capitalisation ----------
const PROPER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'january', 'february', 'april', 'june', 'july', 'september', 'october', 'november', 'december', 'english', 'hindi', 'french', 'spanish', 'german', 'chinese', 'japanese', 'arabic', 'bengali', 'tamil', 'telugu', 'marathi', 'gujarati', 'urdu', 'punjabi', 'russian', 'portuguese', 'italian', 'indian', 'american', 'british', 'european', 'african', 'asian', 'australian', 'canadian'];
const PROPER_RE = new RegExp(`\\b(${PROPER.join('|')})\\b`, 'g');
function capitals(text, out) {
  let m;
  while ((m = PROPER_RE.exec(text))) {
    if (/[@/.#_]/.test(text[m.index - 1] || '')) continue; // emails, urls, tags
    if (/^\.[a-z]/i.test(text.slice(m.index + m[0].length))) continue; // monday.com
    out.push(make('capitalize', m.index, m.index + m[0].length, m[0], [capitalize(m[0])], 'Capitalize', `"${capitalize(m[0])}" is a proper noun.`));
  }
}

// ---------- missing apostrophes, doubled punctuation ----------
const CONTRACTIONS = { dont: "don't", doesnt: "doesn't", didnt: "didn't", isnt: "isn't", arent: "aren't", wasnt: "wasn't", werent: "weren't", couldnt: "couldn't", shouldnt: "shouldn't", wouldnt: "wouldn't", havent: "haven't", hasnt: "hasn't", hadnt: "hadn't", im: "I'm", ive: "I've", youre: "you're", theyre: "they're", thats: "that's", whats: "what's", wouldve: "would've", couldve: "could've", shouldve: "should've", youve: "you've", theyve: "they've", weve: "we've" };
const CONTRACTION_RE = new RegExp(`\\b(${Object.keys(CONTRACTIONS).join('|')})\\b`, 'gi');
function contractions(text, out) {
  let m;
  while ((m = CONTRACTION_RE.exec(text))) {
    const low = m[0].toLowerCase();
    if (m[0] === 'IM' || m[0] === 'IVE') continue; // acronyms
    if (/^[A-Z]/.test(m[0]) && !isSentenceStart(text, m.index)) continue; // names: Jony Ive
    const fix = low === 'im' || low === 'ive' ? CONTRACTIONS[low] : matchCase(m[0], CONTRACTIONS[low]);
    const fixes = [fix];
    // "the library dont have": a singular subject needs "doesn't". Offer it first when the subject isn't plural.
    if (low === 'dont') {
      const pw = prevWord(text, m.index);
      if (/^(he|she|it|this|that)$/.test(pw) || (pw && !/^(i|you|we|they|these|those|people)$/.test(pw) && !/s$/.test(pw))) fixes.unshift(matchCase(m[0], "doesn't"));
    }
    out.push(make('apostrophe', m.index, m.index + m[0].length, m[0], fixes, `Write "${fix}"`, 'This contraction needs an apostrophe.'));
  }
  const dup = /([,;:])\1+|(?<!\.)\.\.(?!\.)/g; // "!!" and "??" are style, left alone
  while ((m = dup.exec(text))) {
    const keep = m[0][0];
    out.push(make('double-punct', m.index, m.index + m[0].length, m[0], [keep], 'Remove extra punctuation', 'This punctuation mark is doubled.'));
  }
}

// ---------- advice / advise ----------
function adviceAdvise(text, out) {
  let m;
  const verb = /\b(I|we|they|you|to|would|will|can|could|should|strongly)\s+(advice)\b/gi;
  while ((m = verb.exec(text))) {
    const at = m.index + m[0].length - m[2].length;
    out.push(make('confusion', at, at + m[2].length, m[2], [matchCase(m[2], 'advise')], 'Use "advise"', '"Advise" is the verb; "advice" is the noun.'));
  }
  const noun = /\b(an|some|of|my|your|good|the|piece of|for)\s+(advise)\b/gi;
  while ((m = noun.exec(text))) {
    const at = m.index + m[0].length - m[2].length;
    out.push(make('confusion', at, at + m[2].length, m[2], [matchCase(m[2], 'advice')], 'Use "advice"', '"Advice" is the noun; "advise" is the verb.'));
  }
}

export function grammarRules(text) {
  const out = [];
  commaSplices(text, out);
  agreement(text, out);
  oneOfAgreement(text, out);
  verbForms(text, out);
  comparatives(text, out);
  capitals(text, out);
  contractions(text, out);
  adviceAdvise(text, out);
  return out.filter((s) => s.fixes.every((f) => f.text !== undefined));
}

export { isSentenceStart as _isSentenceStart, prevWord as _prevWord, PAST_TO_BASE };
