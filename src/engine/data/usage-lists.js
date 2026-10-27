// Fixed lists for the usage rules (rules/usage.js): agreement with compound
// subjects, parallelism, prepositions, fixed idioms, vague phrases and
// nominalisations. Every word a usage rule can insert is in USAGE_INSERTS or
// NOMINALISATIONS below, and guard.js adds them to its closed vocabulary.
// Nothing here is generated.

const set = (s) => new Set(s.trim().split(/\s+/));

export const DET_POSS = set('a an the this that these those its their our his her my your each every all most many some no any two three four several such');
export const PREPOSITIONS = set('of in on at by for with from to into onto over under about across through between among against towards toward during before after without within via per');
export const MODALS = set('can could may might will would shall should must');
export const BE = set('am is are was were be been being');
export const SUBJECT_PRONOUNS = set('i we you he she it they');
export const RELATIVES = set('which that who whom whose where when');

export const ADJ_SUFFIX = /(able|ible|al|ial|ic|ical|ive|ous|ful|less|ant|ent|ary|ory|ish|ised|ized|ed|ern|ar)$/;
export const ADJ_LIST = set(`new old large small short long high low public private local national urban rural formal informal
  cheap easy simple safe clean fast slow ready free fit viable green open closed dry wet hot cold
  accurate adequate appropriate separate moderate secure stable mature robust quick strong weak broad narrow
  deep shallow wide rich poor costly timely friendly likely`);
export const NOUN_SUFFIX = /(tion|sion|ment|ance|ence|ity|ness|ship|ure|ysis|sis|ogy|ing|ism|age|ery|cy|th)$/;
export const NOUN_LIST = set('design use cost growth demand supply research policy law plan work change control access risk value price power energy data trade knowledge size age shape type number quality');

// Nouns ending in "s" that are singular.
export const SINGULAR_S = set(`news series species analysis basis crisis status physics economics mathematics politics thesis
  diagnosis emphasis hypothesis synopsis process business progress class access success address gas bus census
  consensus corpus campus virus bonus focus apparatus means`);

// "X and Y" pairs that name one thing and take a singular verb.
export const UNIT_BINOMIALS = new Set([
  'research and development', 'trial and error', 'law and order', 'bread and butter', 'wear and tear',
  'rock and roll', 'health and safety', 'supply and demand', 'cause and effect', 'give and take',
  'profit and loss', 'peace and quiet', 'hustle and bustle', 'operation and maintenance',
  'monitoring and evaluation', 'checks and balances',
  // round 2 (F9)
  'coming and going', 'toing and froing', 'ebb and flow', 'rise and fall', 'pros and cons',
]);

// Singular verb -> plural verb, for compound-subject agreement.
export const PLURAL_VERB = {
  is: 'are', was: 'were', has: 'have', does: 'do',
  remains: 'remain', seems: 'seem', appears: 'appear', requires: 'require', depends: 'depend',
  poses: 'pose', involves: 'involve', needs: 'need', faces: 'face', presents: 'present',
  // round 2 (F11)
  takes: 'take', makes: 'make', reflects: 'reflect', determines: 'determine', affects: 'affect', shows: 'show',
  varies: 'vary', includes: 'include', provides: 'provide', creates: 'create', means: 'mean',
  // round 6 (B1)
  deters: 'deter', delays: 'delay', raises: 'raise', limits: 'limit', drives: 'drive',
};

// Irregular plurals for pluralize() in morph.js.
export const IRREGULAR_PLURAL = {
  analysis: 'analyses', basis: 'bases', crisis: 'crises', hypothesis: 'hypotheses', criterion: 'criteria',
  phenomenon: 'phenomena', child: 'children', person: 'people',
};

// A closed list of common verbs in base form ("next word is a bare infinitive").
export const BASE_VERBS = set(`
  accept achieve acquire act adapt add address adjust adopt advance affect afford agree aim allocate allow alter analyse analyze
  answer appear apply appoint appreciate argue arrange arrive ask assess assign assist assume attach attain attempt attend attract
  avoid balance ban base be bear beat become begin believe benefit bid bind block boost borrow break bring build burn buy calculate
  call cancel capture care carry cast catch cause challenge change charge check choose cite claim clarify classify clean clear close
  collect combine come comment commit communicate compare compete compile complete comply compose compute conceive concentrate
  conclude conduct confirm connect consider consist construct consult consume contain continue contribute control convert convey
  convince cooperate coordinate cope correct cost count cover create cross cut deal debate decide declare decline decrease
  decarbonise decarbonize define delay delete deliver demand demonstrate deny depend deploy derive describe design detect determine
  develop differ discover discuss display distinguish distribute divide do document double draft draw drink drive drop earn ease
  eat educate eliminate emerge emphasise emphasize employ enable encourage end endorse enforce engage ensure enter establish estimate
  evaluate examine exceed exchange exclude execute exist expand expect experience explain explore export expose express extend
  extract face facilitate fail fall feed feel fight file fill finance find finish fit fix focus follow forecast form formulate
  fund gain gather generate get give go govern grant grow guide handle happen harm hear help hide highlight hire hold identify
  ignore illustrate implement import impose improve include incorporate increase indicate influence inform install integrate
  intend interpret introduce invest investigate invite involve issue join judge justify keep know lack launch lead learn leave
  lend let lift limit link list live locate look lose lower maintain make manage map mark match matter mean measure meet
  mention merge minimise minimize mitigate model modify monitor motivate move need negotiate note notice observe obtain occur
  offer offset open operate oppose optimise optimize order organise organize outline overcome own participate pass pay perceive
  perform permit persuade pick place plan play point pose possess predict prefer prepare present preserve prevent price
  print prioritise prioritize procure produce promote propose protect prove provide publish purchase pursue push put qualify
  raise reach read realise realize receive recognise recognize recommend record recover recruit reduce refer reflect reform
  refuse regulate reject relate release rely remain remove renew repair repeat replace report represent request require
  research resolve respond rest restore restrict result retain return reveal review revise rise run save say scale schedule
  search secure see seek select sell send serve set settle shape share shift show sign simplify sit solve sort speak specify
  spend split stabilise stabilize stand start state stay stimulate stop store strengthen stress structure study submit succeed
  suffer suggest summarise summarize supply support survey suspend sustain switch take talk target teach tell tend test think
  track trade train transfer transform translate transmit travel treat trust try turn understand undertake unite update
  upgrade use validate value vary verify view visit wait want warn watch win wish withdraw work write yield
  abandon accuse admit advertise advise alert amend announce appeal approve arrest assemble attack award bake bless boil
  brief broadcast calm celebrate chase cheer collapse commission compensate complain condemn confiscate congratulate cook
  copy crash criticise criticize damage decorate defeat defend deposit destroy detain dismiss disrupt divert donate drag
  elect email enrol enroll entertain equip erase evacuate excuse expel fine fire flag flood fold fry greet hang harvest heat
  hunt hurt inspect insure interview invade invoice kill kick knock label lock mail marry mend miss name narrow nominate
  notify obey overhaul pack paint park pause phone pin plant please plug polish post postpone pour praise punish question
  rank rate reassure rebuild recall recycle redesign refund register reimburse reinstate relocate remind renovate rent reopen
  repay rescue reserve reset reward rob roll ruin rush scan screen seal seize shock shout sink skip slow smash spill stamp
  steal sue surprise tax terminate thank threaten tie tire tour transport trap trim type underline undermine uncover unveil
  unlock unload unpack unearth unify unite upload vote wake wash waste weigh welcome wrap waive`);

// R5 (F4): "can X" reads as ability, so "able to X" keeps the meaning, only for these verbs.
// Elsewhere "can" is possibility ("can catch fire", "can rise"), and "able to" would change it.
export const CAPABILITY_VERBS = set(`support meet handle deliver provide serve supply run operate scale store generate absorb cover
  reach process carry produce compete adapt replace integrate reduce cut lower power host`);

// F1: participles starting with "un" that are real verbs ("was undermined"). Other un- forms are adjectives.
export const UN_VERBS = set('undermined uncovered unveiled undertaken understood undone unlocked unloaded unpacked unearthed unified united');

// F3: "similar with respect to", "consistent with regard to": the preposition belongs to a fixed phrase.
export const COLLOCATION_SKIP_NEXT = /^(respect|regard|regards|reference)$/;

// F5: "demand of power plants for coal": "power" modifies a following noun.
export const DEMAND_HEAD_NOUNS = set('plants stations sector sectors utilities companies consumers users producers generators suppliers');

// R4: preposition and collocation table. Each row: regex (whole words, i),
// the replacement for the matched words, and guards on the next/previous token.
// `fix` receives the match and returns one or more replacements for the span.
export const COLLOCATIONS = [
  { re: /\bsuitable to\b/gi, fix: () => ['suitable for', 'suited to'], next: 'np', msg: 'The usual pairing is "suitable for" (or "suited to").' },
  { re: /\bcapable to\b/gi, fix: () => ['able to'], next: 'base', msg: '"Capable" takes "of" + -ing; "able to" keeps your verb.' },
  { re: /\bresponsible of\b/gi, fix: () => ['responsible for'], msg: '"Responsible" takes "for".' },
  { re: /\binterested for\b/gi, fix: () => ['interested in'], msg: '"Interested" takes "in".' },
  { re: /\b(dependent|reliant) of\b/gi, fix: (m) => [`${m[1]} on`], msg: 'Use "on".' },
  { re: /\breliance in\b/gi, fix: () => ['reliance on'], msg: '"Reliance" takes "on".' },
  { re: /\bindependent on\b/gi, fix: () => ['independent of'], msg: '"Independent" takes "of".' },
  { re: /\bconsistent to\b/gi, fix: () => ['consistent with'], skipNext: /^within$/, msg: '"Consistent" takes "with".' },
  { re: /\bsimilar with\b/gi, fix: () => ['similar to'], msg: '"Similar" takes "to".' },
  { re: /\b(superior|inferior) than\b/gi, fix: (m) => [`${m[1]} to`], msg: '"Superior" and "inferior" take "to", not "than".' },
  { re: /\b(comprise|comprises|comprised|comprising) of\b/gi, fix: (m) => [m[1]], skipPrev: /^(is|are|was|were|be|been|being)$/, name: 'Redundant preposition', msg: '"Comprise" means "consist of", so it takes no "of".' },
  { re: /\b(discuss|discusses|discussed|discussing) about\b/gi, fix: (m) => [m[1]], name: 'Redundant preposition', msg: '"Discuss" takes a direct object.' },
  { re: /\b(emphasise|emphasize|emphasises|emphasizes|emphasised|emphasized|emphasising|emphasizing) on\b/gi, fix: (m) => [m[1]], prev: 'subj-or-inflected', name: 'Redundant preposition', msg: 'The verb "emphasise" takes a direct object.' },
  { re: /\b(cope|copes|coped|coping) up with\b/gi, fix: (m) => [`${m[1]} with`], name: 'Redundant preposition', msg: 'The phrasal verb is "cope with".' },
  { re: /\bin (accordance|compliance) to\b/gi, fix: (m) => [`in ${m[1]} with`], msg: 'The fixed phrase is "in accordance with".' },
  { re: /\b(contribute|contributes|contributed|contributing) in\b/gi, fix: (m) => [`${m[1]} to`], next: 'ing', msg: '"Contribute" takes "to".' },
  { re: /\b(result|results|resulted|resulting) into\b/gi, fix: (m) => [`${m[1]} in`], msg: '"Result" takes "in".' },
  { re: /\bbased off\b/gi, fix: () => ['based on'], msg: '"Based on" is the standard form.' },
  { re: /\b(investment|investments) on\b/gi, fix: (m) => [`${m[1]} in`], msg: '"Investment" takes "in".' },
  { re: /\breason of\b/gi, fix: () => ['reason for'], skipPrev: /^by$/, msg: '"Reason" takes "for".' },
  { re: /\baware about\b/gi, fix: () => ['aware of'], msg: '"Aware" takes "of".' },
  { re: /\b(focus|focuses|focusses|focused|focussed|focusing|focussing) around\b/gi, fix: (m) => [`${m[1]} on`], msg: '"Focus" takes "on".' },
  { re: /\bconducive for\b/gi, fix: () => ['conducive to'], msg: '"Conducive" takes "to".' },
  { re: /\b(impact|impacts|effect|effects) over\b/gi, fix: (m) => [`${m[1]} on`], skipNext: /^(time|the|a|an|several|many|years|decades|months|weeks|days|period|\d+)$/, msg: 'Use "on" ("impact on").' },
  { re: /\b(request|requests|requested) for\b/gi, fix: (m) => [m[1]], prev: 'subj-or-past', name: 'Redundant preposition', msg: 'As a verb, "request" takes a direct object. "A request for" (noun) is fine.' },
  { re: /\b(insist|insists|insisted) to\b/gi, fix: (m, next) => [`${m[1]} on ${next.ing}`], next: 'base', eatNext: true, msg: '"Insist" takes "on" + -ing.' },
  { re: /\b(succeed|succeeds|succeeded) to\b/gi, fix: (m, next) => [`${m[1]} in ${next.ing}`], next: 'base', eatNext: true, msg: 'To manage something is "succeed in doing".' },
  { re: /\bdemand of\b/gi, fix: () => ['demand for'], skipPrev: /^(and|or)$/, nextIn: /^(electricity|power|energy|water|goods|services|housing|land)$/, msg: '"Demand for" names what is wanted; "demand of" names who wants it.' },
  { re: /\bdifferent than\b/gi, fix: () => [], ukOnly: true, severity: 'style', msg: 'British usage prefers "different from".' },
];

// R6: fixed idioms with the wrong article. `span` picks the part to replace.
export const ARTICLE_IDIOMS = [
  { re: /\bin a long run\b/gi, fix: 'in the long run' },
  { re: /\bin the hindsight\b/gi, fix: 'in hindsight' },
  { re: /\bat the first place\b/gi, fix: 'in the first place' },
  { re: /\b(?:on|in) the other words\b/gi, fix: 'in other words' },
];

// R7: vague connectors. fixes [] = advice only. `skipPrev` guards technical uses.
export const WORDY_ADVICE = [
  { phrase: 'in terms of', fixes: [], skipPrev: /^(expressed|measured|defined|described|written|stated|thought|framed|calculated|quoted)$/,
    title: 'Vague phrase: "in terms of"', msg: '"In terms of" is vague. Say how the two things relate, e.g. "feasible at its levelised cost" or "cost-effective".' },
  { phrase: 'with regard to', fixes: ['on', 'about'], skipAfterAdj: true },
  { phrase: 'with respect to', fixes: ['on', 'about'], skipAfterAdj: true, skipPrev: /^(derivative|derivatives|differentiate|differentiated|integral|integrate|integrated|symmetric|invariant|relative)$/ },
  { phrase: 'in relation to', fixes: ['on', 'about'], skipAfterAdj: true, skipPrev: /^(inversely|directly|proportional)$/ },
  { phrase: 'the fact that', fixes: [], skipPrev: /^(despite|of|to|that|light)$/, msg: '"The fact that" is often padding. Try "that", or say the fact directly.' },
  { phrase: 'it is clear that', fixes: [''], formalOnly: true },
  { phrase: 'it is evident that', fixes: [''], formalOnly: true },
  { phrase: 'a number of', fixes: ['several', 'some'], skipPrev: /^(large|great|small|huge|growing|limited|certain)$/ },
  { phrase: 'in the context of', fixes: [], msg: '"In the context of" is often padding. Say how the context matters, or start with the point itself.' },
  { phrase: 'has the potential to', fixes: ['can', 'could'] },
  { phrase: 'have the potential to', fixes: ['can', 'could'] },
];

// R3: wordy purpose phrases. `ing` marks phrases followed by a gerund whose base form is used.
export const PURPOSE_PHRASES = [
  { re: /\bwith the aim of ([a-z]+ing)\b/gi, ing: true },
  { re: /\bwith a view to ([a-z]+ing)\b/gi, ing: true },
  { re: /\bin an effort to\b/gi, ing: false },
  { re: /\bin an attempt to\b/gi, ing: false },
];

// R8: nominalisation -> [base verb, -ing form]. The US spelling of "analyse" is chosen by dialect.
export const NOMINALISATIONS = {
  decarbonisation: ['decarbonise', 'decarbonising'], decarbonization: ['decarbonize', 'decarbonizing'],
  implementation: ['implement', 'implementing'], assessment: ['assess', 'assessing'],
  evaluation: ['evaluate', 'evaluating'], examination: ['examine', 'examining'],
  investigation: ['investigate', 'investigating'], identification: ['identify', 'identifying'],
  reduction: ['reduce', 'reducing'], transformation: ['transform', 'transforming'],
  development: ['develop', 'developing'], establishment: ['establish', 'establishing'],
  improvement: ['improve', 'improving'], introduction: ['introduce', 'introducing'],
  measurement: ['measure', 'measuring'], management: ['manage', 'managing'],
  provision: ['provide', 'providing'], determination: ['determine', 'determining'],
  estimation: ['estimate', 'estimating'], expansion: ['expand', 'expanding'],
  integration: ['integrate', 'integrating'], allocation: ['allocate', 'allocating'],
  procurement: ['procure', 'procuring'], analysis: ['analyse', 'analysing'],
};
export const NOMINALISATIONS_US = { analysis: ['analyze', 'analyzing'] };

// Every other word a usage rule may insert (the guard's closed vocabulary).
export const USAGE_INSERTS = `are were have do aim aims aimed to suited able how help helps helped that for with on in of from
  the a an most several some about can could analyze analyzing
  people children analyses bases crises hypotheses criteria phenomena
  remain seem appear require depend pose involve need face present
  take make reflect determine affect show vary include provide create mean
  deter delay raise limit drive its`;

// ---------- round 2: P1 rules (rules/usage2.js) ----------

// R6b: count nouns that often follow "one of the" without an -s. UNCOUNTABLE never take one.
export const COUNT_NOUNS = set(`factor reason problem issue city state country person thing way example case area region sector project
  plant town village district school firm company bank road river measure option step idea challenge barrier driver cause
  source tool method model study paper report question goal target priority feature aspect element component approach
  strategy scheme programme program initiative utility station market product service benefit risk result finding`);
export const UNCOUNTABLE = set('information research evidence equipment advice data knowledge progress infrastructure electricity power energy water land');

// R11 hyphenation.
export const COMPOUND_MODIFIERS = ['long term', 'short term', 'medium term', 'long run', 'high level', 'low level', 'large scale',
  'small scale', 'full time', 'part time', 'real time', 'low carbon', 'high quality', 'low income', 'middle income', 'high income',
  'decision making', 'cost effective', 'net zero', 'off grid', 'state of the art', 'up to date', 'well known', 'well established',
  'well designed', 'energy efficient', 'fuel efficient', 'climate resilient'];
export const HYPHEN_NOUNS = set(`resource evidence carbon state community market demand energy water land data grid cost labour labor project government industry user donor citizen farmer
  capital export import`);
export const PARTICIPLE_HEADS = set(`constrained based driven intensive owned led funded related oriented focused dependent efficient
  resilient neutral friendly rich poor free scarce linked connected`);
export const LY_NOT_ADVERB = set(`family early only holy belly jelly rally ally bully daily weekly monthly yearly friendly likely elderly
  silly curly lonely ugly supply reply apply fly rely multiply assembly monopoly anomaly italy july`);

// R12 verb patterns. "keep", "mind", "risk" and "delay" from the spec are left out: "keep to schedule",
// "a delay to work", "risk to health" read as noun or phrasal uses too often.
export const GERUND_VERBS = ['avoid', 'consider', 'enjoy', 'finish', 'suggest', 'recommend', 'deny', 'postpone', 'involve',
  'practise', 'practice', 'quit', 'resist', 'admit', 'appreciate', 'discuss', 'imagine', 'justify'];
export const TO_GERUND_FRAMES = ['look forward to', 'looking forward to', 'looks forward to', 'looked forward to', 'object to', 'objects to',
  'objected to', 'committed to', 'dedicated to', 'accustomed to', 'devoted to', 'with a view to', 'contribute to', 'contributes to',
  'contributed to', 'key to', 'in addition to'];

// R10 minor words that stay lowercase in title case.
export const TITLE_MINOR = set('a an the and but or nor for so yet as at by in of off on per to up via');

// R9: words that start a clause, not a list item.
export const SUBORDINATORS = set('if when because although while which that whereas unless since');

// R12: base verbs that are just as often nouns ("in addition to cost"). After "to"-frames they are skipped.
export const NOUN_VERBS = set(`cost plan design use work change control access risk value price power trade demand supply research model
  test report review study record fund issue trust export import sign list map name need help aim state process base
  focus impact effect benefit experience support care rate rank result rise fall return share structure schedule target
  balance charge contact credit deal debate display document estimate exchange feature finance forecast form guide
  limit link mark match measure note order outline place point position present project question range release
  rent request respond rest run scale search shift show sort stress survey switch tax transfer travel turn update view vote`);
