// Fixed lists for the round-6 document rules (rules/document.js) and the
// light-verb nominalisations (B3). Nothing here is generated; every word a fix
// may insert is listed in LIGHT_VERB_INSERTS, which guard.js adds to its
// closed vocabulary. Consistency fixes insert only forms already in the document.

const set = (s) => new Set(s.trim().split(/\s+/));

// D2: capitalised tokens that are never treated as acronyms needing a definition.
export const COMMON_ACRONYMS = set(`UK US USA EU UN UNDP UNEP UNICEF UNESCO WHO WTO GDP GNP GST VAT RBI SEBI CEO CFO COO CTO PDF OK AM PM AD BC BCE CE
  COVID AI IT HR ID TV PC PhD MBA MSc BSc MA BA MPhil NGO NGOs FAQ FAQs ISO IEEE IPCC UNFCCC OECD IMF BRICS NASA BBC CNN USB URL
  HTML CSV API SMS GPS DNA HIV AIDS ATM PIN IQ CV ICU UPI PAN IIT IIM ASAP RSVP FYI DIY NB PS PTO QA QC RD SI SME SMEs MD
  IAS IPS NITI DST ISRO DRDO BHEL NTPC ONGC LPG CNG EV EVs PV LED LEDs GHG GHGs NDC NDCs SDG SDGs
  YoY QoQ MoM FY EBITDA EBIT ROI ROE CAGR KYC AML MoU MoUs NDA SLA SLAs KPI KPIs CSR ESG MSME MSMEs NBFC NBFCs IPO B2B B2C HQ AGM EGM CXO
  SCADA GIS HVAC PO POs`);

// D2: units (and similar symbols) that look like acronyms.
export const UNITS = set('MW kW GW TW kWh MWh GWh TWh kV MVA MVAr km kg CO2 ppm Hz kHz MHz GHz mm cm Mt MtCO2 tCO2 GJ MJ TJ PJ EJ BTU MU MUs BU kVA kVAr ckm kms');

// D2: words never counted in an acronym's long form (they may be skipped).
export const ACRONYM_MINOR = set('of and the for on in to a an at by with');

// D2: section headings whose content is its own acronym scope (abstracts must stand alone).
export const ABSTRACT_HEADINGS = /^(abstract|executive summary)$/i;

// D1.1: words ending in -ise that have no -ize spelling, and -ize words with no -ise spelling.
export const ISE_EXCEPTIONS = set(`advise advised advises advising exercise exercised exercises exercising comprise comprised comprises comprising
  surprise surprised surprises surprising otherwise precise expertise enterprise enterprises promise promised promises promising
  premise premises raise raised raises raising rise rises arise arises wise noise praise praised franchise televise televised revise revised
  revises revising supervise supervised supervises supervising improvise improvised compromise compromised compromises disguise disguised
  despise despised devise devised devises excise incise merchandise concise paradise treatise poise demise reprise apprise chastise
  size sized sizes prize prized prizes seize seized seizes capsize capsized citizen citizens horizon horizons`);
// D1.1: stems before -elled/-elling that keep "ll" in US English too (stress on the last syllable).
export const LL_KEEP = set('compel expel propel repel dispel excel rebel quell swell smell spell shell yell fell dwell');

// D1.2: open/closed pairs compared when both occur. [open or hyphenated form, closed form]
export const CLOSED_COMPOUNDS = [['data set', 'dataset'], ['e-mail', 'email'], ['co-operation', 'cooperation'], ['on-line', 'online'],
  ['web site', 'website'], ['co-ordinate', 'coordinate'], ['co-ordination', 'coordination'], ['work force', 'workforce']];

// D1.3: capitalised names that are always capitalised (never compared).
export const PROPER_TERMS = set(`Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August
  September October November December English Hindi Konkani Marathi Kannada Tamil Telugu Bengali Indian British American European`);

// D3a: identifier words; a number right after one is never reformatted.
export const NUMBER_IDENTIFIERS = /\b(no|nos|iso|section|sections|sec|act|page|pages|p|pp|fig|figure|figures|table|tables|annex|appendix|chapter|clause|rule|article|item|ref|version|v|model|code|pin|phone|tel|mobile|room|flat|plot|survey)\.?\s*$/i;

// D4: nouns that make "this/the …" a description of the study itself.
export const STUDY_NOUNS = set('paper study article report brief review analysis assessment approach framework chapter section survey');

// D4: verbs that describe what a study does (base forms). Other verbs after "this approach" etc. are about the topic,
// not the study ("this approach continues the state's dependency").
export const STUDY_VERBS = set(`examine explore assess estimate analyse analyze compare model test use apply combine find show suggest argue propose
  present describe discuss review evaluate investigate identify measure survey calculate simulate focus aim set consider develop
  build match compute collect ask help provide report conclude recommend outline cover draw rely manage obtain gather interview
  document map quantify project forecast address highlight extend demonstrate illustrate include adopt follow seek attempt try
  look study rank weight construct design define select sample run regress fit validate check clean merge link observe record`);

// D5: unsupported claims and boosters.
export const CLAIM_PHRASES = ['it is well known that', 'it is widely accepted that', 'everyone knows', 'there is no doubt that', 'it goes without saying'];
export const BOOSTER_ADVERBS = ['clearly', 'obviously', 'undoubtedly', 'certainly', 'of course'];
export const STUDY_CLAIMS = ['several studies have shown', 'studies have shown', 'studies show', 'research shows', 'many studies', 'experts agree', 'evidence suggests'];
export const SIZE_WORDS = ['massive', 'huge', 'enormous', 'dramatic', 'dramatically', 'drastic', 'drastically', 'unprecedented'];

// D6: paragraph length limits by domain.
export const PARAGRAPH_LIMIT = { general: 180, business: 150, technical: 200, academic: 250 };

// B3: light-verb nominalisations. NOM -> base verb (the US spelling of "analyse" is chosen by dialect).
export const LIGHT_NOMS = {
  assessment: 'assess', evaluation: 'evaluate', analysis: 'analyse', examination: 'examine', investigation: 'investigate',
  estimation: 'estimate', measurement: 'measure', review: 'review', study: 'study', survey: 'survey', comparison: 'compare',
  calculation: 'calculate', inspection: 'inspect', audit: 'audit', revision: 'revise',
};
export const LIGHT_VERBS = {
  make: 'base', makes: 's', made: 'past', making: 'ing',
  conduct: 'base', conducts: 's', conducted: 'past', conducting: 'ing',
  'carry out': 'base', 'carries out': 's', 'carried out': 'past', 'carrying out': 'ing',
  perform: 'base', performs: 's', performed: 'past', performing: 'ing',
  undertake: 'base', undertakes: 's', undertook: 'past', undertaken: 'part', undertaking: 'ing',
  provide: 'base', provides: 's', provided: 'past', providing: 'ing',
  give: 'base', gives: 's', gave: 'past', given: 'part', giving: 'ing',
  hold: 'base', holds: 's', held: 'past', holding: 'ing',
  have: 'base', has: 's', had: 'past', having: 'ing',
  take: 'base', takes: 's', took: 'past', taken: 'part', taking: 'ing',
};
// Fixed pairs: light verb set, determiner + noun + preposition -> verb (+ kept preposition).
export const LIGHT_PAIRS = [
  { verbs: ['give', 'provide'], phrase: /^(a|an)\s+description\s+of$/i, base: 'describe' },
  { verbs: ['give', 'provide'], phrase: /^(an)\s+explanation\s+of$/i, base: 'explain' },
  { verbs: ['have', 'hold'], phrase: /^(a)\s+discussion\s+(about|on)$/i, base: 'discuss' },
  { verbs: ['take'], phrase: /^(a)\s+decision\s+on$/i, base: 'decide', keep: 'on' },
];

function forms(base) {
  const past = /e$/.test(base) ? `${base}d` : /[^aeiou]y$/.test(base) ? `${base.slice(0, -1)}ied` : `${base}ed`;
  const s = /(s|x|z|ch|sh)$/.test(base) ? `${base}es` : /[^aeiou]y$/.test(base) ? `${base.slice(0, -1)}ies` : `${base}s`;
  const ing = /[^eoy]e$/.test(base) ? `${base.slice(0, -1)}ing` : `${base}ing`;
  return [base, past, s, ing];
}
export const verbForms = (base) => {
  const [b, past, s, ing] = forms(base);
  return { base: b, past, s, ing, part: past };
};
// Every form a B3 fix may insert.
export const LIGHT_VERB_INSERTS = [...new Set([...Object.values(LIGHT_NOMS), 'analyze', 'describe', 'explain', 'discuss', 'decide']
  .flatMap((b) => forms(b)))].join(' ');
