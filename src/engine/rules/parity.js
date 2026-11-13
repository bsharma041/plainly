// Round 10 (Grammarly paid-tier gap closers): inclusive language, polite tone, fluency,
// dull words, clichés and list-to-bullets. New rule IDs only; rounds 1-9 are unchanged.
// Every phrase and every replacement comes from the closed lists in this file. No model,
// no statistics. Fixes use the writer's own words or ROUND10_INSERTS and pass checkFix.
import { WORDY, AI_PHRASES } from '../data/lists.js';
import { RULE_INFO } from '../data/rule-info.js';
import { matchCase, isSentenceStart, splitSentences, words } from '../text.js';
import { sectionModel } from '../sections.js';
import { insideQuotes } from '../chunk.js';

export const ROUND10_INSERTS = `chair chairs chairperson humanity humankind workforce staff staffed crewed police officer officers
  firefighter firefighters flight attendant attendants salesperson salespeople businessperson businesspeople
  spokesperson spokespeople homemaker older people disabled wheelchair user work hours ancestors first-year student
  layperson intermediary server allowlist blocklist synthetic their them
  please as soon possible you can would like
  explain explains explained explaining to in my opinion despite spite agree information advice equipment furniture
  feedback luggage baggage homework software machinery scenery anyway this last morning evening night
  make made making mistake tell told at depend depends depended on interested than
  sound strong useful poor weak harmful large major pleasant kind fine excellent
  the end finally rare talk follow up return now today mostly agreement start back every first main point`;

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['’]").replace(/ /g, '\\s+');
const rx = (src) => new RegExp(`(?<![A-Za-z-])(?:${src})(?![A-Za-z-])`, 'gi');

function card(rule, category, text, start, end, fixTexts, title, message, extra = {}) {
  return {
    rule, category, severity: 'style', ruleName: RULE_INFO[rule]?.name || title, title, message, start, end,
    original: text.slice(start, end), scope: 'word',
    fixes: fixTexts.map((t) => ({ text: t, start, end })), ...extra,
  };
}

// ---------- inclusive-language ----------
// [pattern, replacements, why]. A capitalised match in mid-sentence, or one followed by a
// capitalised name, is a title ("Chairman Rao") and is left alone.
const INCLUSIVE = [
  ['chairman', ['chair', 'chairperson'], 'names the role, not the gender'],
  ['chairmen', ['chairs'], 'names the role, not the gender'],
  ['mankind', ['humanity', 'humankind'], 'includes everyone'],
  ['manpower', ['workforce', 'staff'], 'includes everyone'],
  ['man-hours', ['work hours'], 'includes everyone'],
  ['man-made', ['synthetic'], 'includes everyone'],
  ['manned', ['staffed', 'crewed'], 'includes everyone'],
  ['policeman', ['police officer'], 'names the role, not the gender'],
  ['policemen', ['police officers'], 'names the role, not the gender'],
  ['fireman', ['firefighter'], 'names the role, not the gender'],
  ['firemen', ['firefighters'], 'names the role, not the gender'],
  ['stewardess', ['flight attendant'], 'names the role, not the gender'],
  ['stewardesses', ['flight attendants'], 'names the role, not the gender'],
  ['salesman', ['salesperson'], 'names the role, not the gender'],
  ['salesmen', ['salespeople'], 'names the role, not the gender'],
  ['businessman', ['businessperson'], 'names the role, not the gender'],
  ['businessmen', ['businesspeople'], 'names the role, not the gender'],
  ['spokesman', ['spokesperson'], 'names the role, not the gender'],
  ['spokesmen', ['spokespeople'], 'names the role, not the gender'],
  ['housewife', ['homemaker'], 'names the role, not the gender'],
  ['layman', ['layperson'], 'includes everyone'],
  ['middleman', ['intermediary'], 'includes everyone'],
  ['forefathers', ['ancestors'], 'includes everyone'],
  ['freshman', ['first-year student'], 'includes everyone'],
  ['waitress', ['server'], 'names the role, not the gender'],
  ['the elderly', ['older people'], 'puts people first'],
  ['the disabled', ['disabled people'], 'puts people first'],
  ['the handicapped', ['disabled people'], 'puts people first'],
  ['handicapped', ['disabled'], 'is the term most style guides now use'],
  ['wheelchair-bound', ['wheelchair user'], 'describes the person, not a limit'],
  ['whitelist', ['allowlist'], 'says what the list does'],
  ['blacklist', ['blocklist'], 'says what the list does'],
  ['his or her', ['their'], 'is shorter and includes everyone'],
  ['him or her', ['them'], 'is shorter and includes everyone'],
  ['he or she', null, null],
];
const INCLUSIVE_MAP = new Map(INCLUSIVE.map((e) => [e[0], e]));
const INCLUSIVE_RE = rx(INCLUSIVE.map((e) => esc(e[0])).sort((a, b) => b.length - a.length).join('|'));

function inclusive(text, ctx, out) {
  if (ctx.domain === 'creative') return;
  INCLUSIVE_RE.lastIndex = 0;
  let m;
  while ((m = INCLUSIVE_RE.exec(text))) {
    const key = m[0].toLowerCase().replace(/\s+/g, ' ');
    const [, to, why] = INCLUSIVE_MAP.get(key);
    const start = m.index, end = start + m[0].length;
    const cap = /^[A-Z]/.test(m[0]);
    if (cap && !isSentenceStart(text, start)) continue; // a title
    if (cap && /^\s+[A-Z][a-z]/.test(text.slice(end, end + 4))) continue; // "Chairman Rao"
    // "the elderly man" and "the disabled button" are adjectives; the group noun is followed by a verb or a stop.
    if (/^the (elderly|disabled|handicapped)$/.test(key) && !/^(?:[.,;:!?)]|\s+(?:are|were|is|was|need|needs|have|has|had|should|can|could|must|may|might|will|would|do|did|and|or|who|in|of|among|face|often|also|get|receive)\b|\s*$)/.test(text.slice(end, end + 12))) continue;
    if (key === 'freshman' && /^\s+(?:year|class|dorm|seminar|orientation)\b/i.test(text.slice(end, end + 14))) continue;
    if (key === 'handicapped' && /\bthe\s+$/i.test(text.slice(Math.max(0, start - 5), start))) continue;
    if (!to) {
      out.push(card('inclusive-language', 'voice', text, start, end, [], 'Try "they"',
        `"${m[0]}" is clumsy to read. "They" includes everyone; change the verb to match ("they are").`));
      continue;
    }
    out.push(card('inclusive-language', 'voice', text, start, end, to.map((t) => matchCase(m[0], t)),
      `Try "${to[0]}"`, `"${to[0]}" ${why}. Keep "${m[0]}" if it is someone's official title.`));
  }
}

// ---------- polite-tone (business domain or the "polite" goal) ----------
const BLAME = rx(`as I (?:already )?(?:said|mentioned|told you)|like I said|as (?:previously|already) stated|per my last (?:email|mail|message)|you failed to|you forgot to|you should have|you never|why didn't you|why haven't you|why did you not|with all due respect|no offen[cs]e,? but`);
const DEMAND = /(?<![A-Za-z-])(You (?:need to|must|have to)|I need you to)(\s+)(?=[a-z])/g;
const WANT = rx('I want');
const ASAP = rx('asap');

function polite(text, ctx, out) {
  if (!ctx.polite) return;
  let m;
  BLAME.lastIndex = 0;
  while ((m = BLAME.exec(text))) {
    out.push(card('polite-tone', 'voice', text, m.index, m.index + m[0].length, [], 'This can read as a rebuke',
      `"${m[0]}" points at the reader's mistake. Say what you need next and the message lands better.`));
  }
  DEMAND.lastIndex = 0;
  while ((m = DEMAND.exec(text))) {
    if (!isSentenceStart(text, m.index) || /^(not|never)\b/.test(text.slice(m.index + m[0].length))) continue;
    out.push(card('polite-tone', 'voice', text, m.index, m.index + m[1].length, ['Please'], 'Try "Please"',
      `"${m[1]}" reads as an order. "Please" asks for the same thing.`));
  }
  WANT.lastIndex = 0;
  while ((m = WANT.exec(text))) {
    if (!isSentenceStart(text, m.index)) continue; // "if I want", "what I want" are not requests
    out.push(card('polite-tone', 'voice', text, m.index, m.index + m[0].length, ['I would like'], 'Try "I would like"',
      '"I want" can sound abrupt in a request. "I would like" is the polite form.'));
  }
  ASAP.lastIndex = 0;
  while ((m = ASAP.exec(text))) {
    out.push(card('polite-tone', 'voice', text, m.index, m.index + m[0].length, ['as soon as possible', 'as soon as you can'],
      'Spell out "ASAP"', '"ASAP" can read as a demand. A date is better still, if you have one.'));
  }
}

// ---------- fluency: mix-ups common among learners of English ----------
// [pattern, (match) => replacements, message]
const MASS_PLURAL = { informations: 'information', advices: 'advice', equipments: 'equipment', furnitures: 'furniture', feedbacks: 'feedback',
  luggages: 'luggage', baggages: 'baggage', homeworks: 'homework', softwares: 'software', machineries: 'machinery', sceneries: 'scenery' };
const FLUENCY = [
  [rx('(explain(?:s|ed|ing)?)\\s+(me|us|him|her|them)(?=\\s+(?:the|this|that|these|those|how|why|what|a|an|your|it)\\b)'),
    (m) => [`${m[1]} to ${m[2]}`], () => '"Explain" needs "to" before the person: "explain to me".'],
  [rx('according\\s+to\\s+me'), () => ['in my opinion'], () => '"According to" is for someone else\'s view. For your own, say "in my opinion".'],
  [rx('despite\\s+of'), () => ['despite'], () => '"Despite" takes no "of".'],
  [rx('inspite\\s+of'), () => ['in spite of'], () => '"In spite of" is three words.'],
  [rx("(I|we|you|they)(?:\\s+am|\\s+are|'m|'re|’m|’re)\\s+agree"), (m) => [`${m[1]} agree`], () => '"Agree" is a verb here, so it takes no "am" or "are".'],
  [rx(Object.keys(MASS_PLURAL).join('|')), (m) => [MASS_PLURAL[m[0].toLowerCase()]], (m) => `"${MASS_PLURAL[m[0].toLowerCase()]}" has no plural form.`],
  [rx('(an?)\\s+(information|advice|feedback|equipment|furniture|homework)(?=[.,;:!?]|\\s+(?:about|on|from|to|that|is|was|for|regarding)\\b)'),
    (m) => [m[2]], (m) => `"${m[2]}" can't be counted, so it takes no "${m[1]}".`],
  [rx('(can|could)\\s+able\\s+to'), (m) => [m[1]], (m) => `"${m[1]}" already means "able to".`],
  [rx('anyways'), () => ['anyway'], () => '"Anyway" has no "s" in standard English.'],
  [rx('today\\s+(morning|evening)'), (m) => [`this ${m[1]}`], (m) => `English says "this ${m[1]}".`],
  [rx('yesterday\\s+night'), () => ['last night'], () => 'English says "last night".'],
  [rx('(do|did|does|doing|done)\\s+a\\s+mistake'), (m) => [`${{ do: 'make', did: 'made', does: 'makes', doing: 'making', done: 'made' }[m[1].toLowerCase()]} a mistake`],
    () => 'In English you "make" a mistake.'],
  [rx('(said|say|says)\\s+(me|us|him|her|them)(?=\\s+(?:to|that)\\b)'), (m) => [`${{ said: 'told', say: 'tell', says: 'tells' }[m[1].toLowerCase()]} ${m[2]}`],
    () => '"Say" takes no person as its object. Use "tell".'],
  [rx('(arrive(?:s|d)?|arriving)\\s+to(?=\\s+(?:the|a|an|my|our|his|her|their|your)\\b)'), (m) => [`${m[1]} at`, `${m[1]} in`], () => 'You arrive "at" a place or "in" a city or country.'],
  [rx('(depend(?:s|ed|ing)?)\\s+of'), (m) => [`${m[1]} on`], () => '"Depend" takes "on".'],
  [rx('interested\\s+on'), () => ['interested in'], () => '"Interested" takes "in".'],
  [rx('(senior|junior|inferior)\\s+than'), (m) => [`${m[1]} to`], (m) => `"${m[1]}" takes "to", not "than".`],
  [rx('reply\\s+back'), () => ['reply'], () => '"Reply" already means "write back".'],
];

function fluency(text, ctx, out) {
  for (const [re, fix, msg] of FLUENCY) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const fixes = fix(m).map((f) => matchCase(m[0], f));
      out.push(card('fluency', 'correctness', text, m.index, m.index + m[0].length, fixes, `Try "${fixes[0]}"`, msg(m),
        { severity: 'critical' }));
    }
  }
}

// ---------- dull-word: a plain word leaned on three or more times ----------
const DULL = { good: ['sound', 'strong', 'useful'], bad: ['poor', 'weak', 'harmful'], big: ['large', 'major'], nice: ['pleasant', 'kind', 'fine'], great: ['strong', 'excellent', 'major'] };
const DULL_RE = rx(Object.keys(DULL).join('|'));
const DULL_FIXED = /^(?:\s+(?:morning|afternoon|evening|night|day|luck|faith|practice|practices|governance|deal|news|data|debt|debts|loan|loans|britain|depression|bang|enough|to)\b|\s+(?:at|for|as)\b)/i;
const DULL_BEFORE = /(?:very|really|so|as|too|not|no|for|pretty|quite)\s+$/i;

function dull(text, ctx, out) {
  if (['casual', 'creative'].includes(ctx.domain)) return;
  const found = {};
  DULL_RE.lastIndex = 0;
  let m;
  while ((m = DULL_RE.exec(text))) {
    if (!ctx.body(m.index) || DULL_FIXED.test(text.slice(m.index + m[0].length, m.index + m[0].length + 14)) || DULL_BEFORE.test(text.slice(Math.max(0, m.index - 8), m.index))) continue;
    (found[m[0].toLowerCase()] ||= []).push(m);
  }
  for (const [w, list] of Object.entries(found)) {
    if (list.length < 3) continue;
    for (const hit of list.slice(2)) {
      out.push(card('dull-word', 'engagement', text, hit.index, hit.index + hit[0].length, DULL[w].map((t) => matchCase(hit[0], t)),
        `"${w}" appears ${list.length} times`, `You lean on "${w}" ${list.length} times. A more exact word tells the reader what kind of "${w}" you mean. Pick one only if it fits.`));
    }
  }
}

// ---------- cliche ----------
const CLICHES = [
  ['at the end of the day', ['in the end']], ['when all is said and done', ['in the end']], ['think outside the box', null],
  ['thinking outside the box', null], ['low-hanging fruit', null], ['move the needle', null], ['in this day and age', ['today', 'now']],
  ['last but not least', ['finally']], ['few and far between', ['rare']], ['the fact of the matter is', null], ['it goes without saying', null],
  ['tip of the iceberg', null], ['level playing field', null], ['touch base', ['talk']], ['circle back', ['follow up', 'return']],
  ['only time will tell', null], ['easier said than done', null], ['back to square one', ['back to the start']], ['by and large', ['mostly']],
  ['bite the bullet', null], ['on the same page', ['in agreement']], ['the bottom line is', ['the main point is']], ['reinvent the wheel', null],
  ['a perfect storm', null], ['boil the ocean', null], ['hit the ground running', null], ['push the envelope', null],
  ['at this juncture', ['now']], ['in the nick of time', null], ['a win-win situation', null], ['take it to the next level', null],
  ['the elephant in the room', null], ['a double-edged sword', null], ['raise the bar', null], ['get the ball rolling', ['start']],
];
const TAKEN = new Set([...WORDY.map(([p]) => p.toLowerCase()), ...AI_PHRASES.map(([p]) => p.toLowerCase())]);
const CLICHE_LIST = CLICHES.filter(([p]) => !TAKEN.has(p));
const CLICHE_MAP = new Map(CLICHE_LIST);
const CLICHE_RE = rx(CLICHE_LIST.map(([p]) => esc(p)).sort((a, b) => b.length - a.length).join('|'));

function cliche(text, ctx, out) {
  if (ctx.domain === 'creative') return;
  CLICHE_RE.lastIndex = 0;
  let m;
  while ((m = CLICHE_RE.exec(text))) {
    const key = m[0].toLowerCase().replace(/\s+/g, ' ');
    // "At the end of the day shift" is literal: the stock phrase is followed by punctuation.
    if (key === 'at the end of the day' && !/^[,.;:!?]/.test(text.slice(m.index + m[0].length))) continue;
    const to = CLICHE_MAP.get(key);
    out.push(card('cliche', 'engagement', text, m.index, m.index + m[0].length, (to || []).map((t) => matchCase(m[0], t)),
      to ? `Try "${to[0]}"` : 'Worn phrase', `"${m[0]}" is a stock phrase readers skim past. ${to ? 'The plain version is shorter.' : 'Say the specific thing you mean.'}`));
  }
}

// ---------- list-to-bullets: "intro: a; b; c; and d." as a list, in the writer's own words ----------
function bullets(text, ctx, out) {
  if (['academic', 'creative'].includes(ctx.domain)) return;
  for (const line of ctx.model.lines) {
    if (line.kind !== 'body') continue;
    const sents = splitSentences(line.text);
    for (const s of sents) {
      const c = s.text.indexOf(': ');
      if (c < 0 || s.text.indexOf(': ', c + 1) >= 0) continue;
      const intro = s.text.slice(0, c), rest = s.text.slice(c + 2);
      if (words(intro).length < 2 || /[()"“”]/.test(rest) || /\d$/.test(intro)) continue;
      const semi = rest.split(';').length >= 3;
      const parts = (semi ? rest.split(';') : rest.split(',')).map((p) => p.trim()).filter(Boolean);
      const total = words(s.text).length;
      if (parts.length < (semi ? 3 : 4) || total < (semi ? 20 : 30)) continue;
      if (!semi && parts.some((p) => words(p).length < 3)) continue;
      const last = parts.length - 1;
      parts[last] = parts[last].replace(/^(and|or)\s+/i, '');
      if (parts.some((p) => !words(p).length)) continue;
      const start = line.start + s.start, end = line.start + s.end;
      const tail = text.slice(end, line.start + line.text.length).trim();
      const fixText = `${intro}:\n${parts.map((p) => `- ${p}`).join('\n')}`;
      out.push({
        rule: 'list-to-bullets', category: 'clarity', severity: 'style', ruleName: RULE_INFO['list-to-bullets']?.name, scope: 'sentence',
        title: `A list of ${parts.length} items in one sentence`,
        message: `This sentence carries ${parts.length} items in ${total} words. A bulleted list lets the reader see each one. The fix only moves your own words onto separate lines.`,
        start, end, original: text.slice(start, end),
        fixes: tail ? [] : [{ text: fixText, start, end, label: 'Make it a list' }],
      });
    }
  }
}

/** The round 10 rules with their own examples (same kit as round 9). */
export const ROUND10_RULES = [
  { id: 'inclusive-language', run: inclusive,
    flag: ['The chairman opened the meeting.', 'We lack the manpower to finish.', 'The elderly need more support.', 'Each student must bring his or her book.', 'Each member said he or she would vote.'],
    pass: ['The meeting was opened by Chairman Rao.', 'The letter was signed by the Chairman and Managing Director.', 'The chair opened the meeting.', 'The unmanned craft landed.', 'The humane option costs more.', 'The elderly man sat down.', 'Click the disabled button again.', 'Her freshman year was hard.'] },
  { id: 'polite-tone', run: polite,
    flag: [{ text: 'You need to send the report by Friday.', opts: { domain: 'business' } }, { text: 'Send it ASAP.', opts: { goals: { polite: true } } },
      { text: 'I want the file today.', opts: { domain: 'business' } }, { text: 'As I said, the form is wrong.', opts: { domain: 'business' } }],
    pass: ['You need to send the report by Friday.', { text: 'Do you need to send the report?', opts: { domain: 'business' } }, { text: 'Users must restart the app.', opts: { domain: 'business' } },
      { text: 'You must not share the password.', opts: { domain: 'business' } }, { text: 'Tell me what I want to hear.', opts: { domain: 'business' } }] },
  { id: 'fluency', run: fluency,
    flag: ['Please explain me the rule.', 'According to me, the plan is weak.', 'Despite of the rain, we went.', 'I am agree with you.', 'We got many informations.',
      'Could you give me an advice on this.', 'We met today morning.', 'I did a mistake in the form.', 'He said me to wait.', 'We arrived to the office late.', 'It depends of the weather.'],
    pass: ['Please explain the rule to me.', 'According to the report, the plan is weak.', 'Despite the rain, we went.', 'We need a feedback form.', 'He said that we should wait.',
      'We got much information.', 'She is married with two children.', 'It depends on the weather.'] },
  { id: 'dull-word', run: dull,
    flag: ['The plan had a good start in the north.\n\nThe team did good work on the survey.\n\nIt was a good year for sales.'],
    pass: ['The plan had a good start.\n\nThe team did good work.', 'Good morning to all.\n\nGood morning again.\n\nGood morning, team.', 'We sell goods in bulk.\n\nThe goods arrived.\n\nThe goods were late.'] },
  { id: 'cliche', run: cliche,
    flag: ['At the end of the day, cost matters.', 'We must think outside the box.', 'By and large, the plan worked.'],
    pass: ['At the end of the day shift, we count stock.', 'The box was left outside.', 'In the end, cost matters.'] },
  { id: 'list-to-bullets', run: bullets,
    flag: ['The plan needs four things: a budget for the first year; a named owner in each district; a review date before the end of March; and a short report to the board.'],
    pass: ['The plan needs two things: a budget and an owner.', 'The meeting starts at 10: 30 and ends at noon.',
      { text: 'The plan needs four things: a budget for the first year; a named owner in each district; a review date before the end of March; and a short report to the board.', opts: { domain: 'academic' } }] },
];

export const ROUND10_IDS = ROUND10_RULES.map((r) => r.id);

/** Run every round 10 rule. Pure and synchronous. */
export function parityRules(text, opts = {}) {
  const model = sectionModel(text);
  const ctx = {
    model, domain: opts.domain || 'general',
    polite: opts.domain === 'business' || opts.goals?.polite === true,
    body: (pos) => ['body', 'list'].includes(model.kindAt(pos)),
  };
  const out = [];
  for (const r of ROUND10_RULES) r.run(text, ctx, out);
  return out.filter((s) => ctx.body(s.start) && !insideQuotes(text, s.start));
}
