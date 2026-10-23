// US / UK spelling pairs. Both spellings are correct, so the checker only flags
// a word when it clashes with the chosen dialect, or (in auto mode) with the
// spelling the writer uses most in the same document.

const BASE_PAIRS = [
  ['color', 'colour'], ['favor', 'favour'], ['favorite', 'favourite'], ['honor', 'honour'],
  ['labor', 'labour'], ['behavior', 'behaviour'], ['neighbor', 'neighbour'], ['flavor', 'flavour'],
  ['humor', 'humour'], ['rumor', 'rumour'], ['harbor', 'harbour'], ['endeavor', 'endeavour'],
  ['center', 'centre'], ['theater', 'theatre'], ['fiber', 'fibre'], ['liter', 'litre'],
  ['defense', 'defence'], ['offense', 'offence'], ['catalog', 'catalogue'], ['dialog', 'dialogue'],
  ['analog', 'analogue'], ['gray', 'grey'], ['aging', 'ageing'], ['mold', 'mould'],
  ['fulfill', 'fulfil'], ['enroll', 'enrol'], ['skillful', 'skilful'], ['jewelry', 'jewellery'],
  ['traveled', 'travelled'], ['traveling', 'travelling'], ['traveler', 'traveller'],
  ['modeled', 'modelled'], ['modeling', 'modelling'], ['canceled', 'cancelled'], ['canceling', 'cancelling'],
  ['labeled', 'labelled'], ['labeling', 'labelling'], ['fueled', 'fuelled'], ['fueling', 'fuelling'],
  ['signaled', 'signalled'], ['counselor', 'counsellor'], ['marvelous', 'marvellous'],
  ['analyze', 'analyse'], ['analyzed', 'analysed'], ['analyzing', 'analysing'], ['analyzes', 'analyses'],
  ['paralyze', 'paralyse'], ['catalyze', 'catalyse'],
  ['program', 'programme'], ['programs', 'programmes'],
];

// Stems that take -ize (US) or -ise (UK, non-Oxford).
const IZE_STEMS = [
  'organ', 'real', 'recogn', 'priorit', 'util', 'emphas', 'minim', 'maxim', 'summar', 'categor',
  'optim', 'stabil', 'standard', 'normal', 'capital', 'central', 'decentral', 'special', 'final',
  'author', 'apolog', 'critic', 'character', 'civil', 'global', 'industrial', 'mobil', 'modern',
  'monet', 'neutral', 'privat', 'subsid', 'synchron', 'visual', 'digit', 'legal', 'familiar',
  'memor', 'harmon', 'symbol', 'jeopard', 'sympath', 'scrutin', 'hospital', 'commercial',
  'incentiv', 'rational', 'formal', 'institutional', 'operational', 'personal', 'vapor', 'item',
  'custom', 'energ', 'fertil', 'local', 'decarbon', 'electr', 'revolution', 'mechan', 'immun',
];
const IZE_ENDINGS = [['ize', 'ise'], ['izes', 'ises'], ['ized', 'ised'], ['izing', 'ising'], ['ization', 'isation'], ['izations', 'isations'], ['izer', 'iser'], ['izers', 'isers']];

function buildPairs() {
  const pairs = [];
  for (const [us, uk] of BASE_PAIRS) {
    pairs.push([us, uk]);
    if (/(or|er|og|ense)$/.test(us) && !us.includes(' ')) pairs.push([us + 's', uk + 's']);
  }
  for (const stem of IZE_STEMS) for (const [a, b] of IZE_ENDINGS) pairs.push([stem + a, stem + b]);
  return pairs;
}

// word (lowercase) -> { group, dialect: 'us'|'uk', other }
export const SPELLING = new Map();
buildPairs().forEach(([us, uk], i) => {
  if (us === uk) return;
  // Words that also exist with another meaning in the other dialect are skipped.
  SPELLING.set(us, { group: i, dialect: 'us', other: uk });
  SPELLING.set(uk, { group: i, dialect: 'uk', other: us });
});
// "analyses" is also the plural noun in US English; "program" is UK for software.
SPELLING.delete('analyses');
SPELLING.delete('program');
SPELLING.delete('programs');
SPELLING.delete('dialog'); // a software dialog box in both dialects
SPELLING.delete('dialogs');
