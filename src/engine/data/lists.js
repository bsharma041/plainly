// Fixed word lists. Every replacement the tool can offer lives here or in
// spelling.js / thesaurus.js. Nothing is generated.

// Common confusions. pattern is matched case-insensitively on word boundaries.
// `fix` receives the regex match and returns the replacement for the whole match.
export const CONFUSIONS = [
  { re: /\b(could|would|should|must|might) of\b(?!\s+course\b)/gi, fix: (m) => `${m[1]} have`, title: 'Use "have"', message: '"Of" here should be "have" (could have, would have).' },
  { re: /\balot\b/gi, fix: () => 'a lot', title: 'Write "a lot"', message: '"A lot" is two words.' },
  { re: /\birregardless\b/gi, fix: () => 'regardless', title: 'Use "regardless"', message: '"Irregardless" is nonstandard.' },
  { re: /\bfor all intensive purposes\b/gi, fix: () => 'for all intents and purposes', title: 'Fix the idiom', message: 'The idiom is "for all intents and purposes".' },
  { re: /\byour welcome(?=\s*[.,!;:]|\s*$)/gi, fix: () => "you're welcome", title: 'Use "you\'re"', message: '"You\'re" means "you are".' },
  { re: /\bit'?s self\b/gi, fix: () => 'itself', title: 'Use "itself"', message: '"Itself" is one word.' },
  { re: /\bit['’]s own\b/gi, fix: () => 'its own', title: 'Use "its"', message: '"Its" (no apostrophe) shows possession.' },
  { re: /\bits (a|an|been|not|going)\b/gi, fix: (m) => `it's ${m[1]}`, title: 'Use "it\'s"', message: '"It\'s" means "it is" or "it has".' },
  { re: /\b(more|less|better|worse|greater|fewer|higher|lower|rather|other|larger|smaller|faster|slower|easier|harder|bigger|older|younger) then\b/gi, fix: (m) => `${m[1]} than`, title: 'Use "than"', message: 'Use "than" for comparisons.' },
  { re: /\b(their|they're) (is|are|was|were)\b/gi, fix: (m) => `there ${m[2]}`, title: 'Use "there"', message: '"There is/are" points to existence.' },
  { re: /\bthere own\b/gi, fix: () => 'their own', title: 'Use "their"', message: '"Their" shows possession.' },
  { re: /\bbetween you and I\b/gi, fix: () => 'between you and me', title: 'Use "me"', message: 'After "between", use "me".' },
  { re: /\beach others\b/gi, fix: () => "each other's", title: 'Add apostrophe', message: 'Possessive form is "each other\'s".' },
  { re: /\b(am|is|are|was|were|be) suppose to\b/gi, fix: (m) => `${m[1]} supposed to`, title: 'Use "supposed"', message: 'The phrase is "supposed to".' },
  { re: /\b(I|we|they|you|he|she) use to\b/gi, fix: (m) => `${m[1]} used to`, title: 'Use "used to"', message: 'For past habits, write "used to".' },
  { re: /\b(to|will|might|could|would|may|can|not|don't|didn't|won't) loose\b/gi, fix: (m) => `${m[1]} lose`, title: 'Use "lose"', message: '"Lose" is the verb; "loose" means not tight.' },
  { re: /\b(the|an) affect of\b/gi, fix: (m) => `${m[1]} effect of`, title: 'Use "effect"', message: '"Effect" is the noun; "affect" is usually the verb.' },
  { re: /\bin regards to\b/gi, fix: () => 'regarding', title: 'Use "regarding"', message: '"In regards to" is nonstandard. Use "regarding" or "in regard to".' },
  { re: /\bwho's (car|house|book|idea|turn|job|fault|name|office|team)\b/gi, fix: (m) => `whose ${m[1]}`, title: 'Use "whose"', message: '"Whose" shows possession; "who\'s" means "who is".' },
  { re: /\bcould care less\b/gi, fix: () => "couldn't care less", title: 'Check the idiom', message: 'The standard idiom is "couldn\'t care less".' },
  { re: /\bsupposably\b/gi, fix: () => 'supposedly', title: 'Use "supposedly"', message: '"Supposably" is usually a slip for "supposedly".' },
];

// Subject-verb agreement. `guard` lists words that, if they come right before the
// match, make it valid (questions, subjunctive).
export const AGREEMENT = [
  { re: /\b(he|she|it) don['’]t\b/gi, fix: (m) => `${m[1]} doesn't`, guard: [] },
  { re: /\b(they|we|you) was\b/gi, fix: (m) => `${m[1]} were`, guard: [] },
  { re: /\b(he|she|it) were\b/gi, fix: (m) => `${m[1]} was`, guard: ['if', 'wish', 'though', 'were', 'as', 'would'] },
  { re: /\bI is\b/g, fix: () => 'I am', guard: [] },
  { re: /\bI has\b/g, fix: () => 'I have', guard: [] },
  { re: /\b(he|she|it) have\b/gi, fix: (m) => `${m[1]} has`, guard: ['does', 'did', 'will', 'can', 'could', 'would', 'should', 'might', 'may', 'must', 'to', "doesn't", "didn't", 'let', 'make', 'help', 'shall', 'cannot', "won't", "can't", 'not'] },
  { re: /\b(he|she|it) do\b(?! not)/gi, fix: (m) => `${m[1]} does`, guard: ['will', 'can', 'could', 'would', 'should', 'might', 'may', 'must', 'to', 'let', 'make', 'help', 'did', 'does', 'cannot'] },
];

// Introductory words that want a comma when followed by a clause.
export const INTRO_WORDS = ['However', 'Therefore', 'Moreover', 'Furthermore', 'Consequently', 'Nevertheless', 'Nonetheless', 'Additionally', 'Unfortunately', 'Fortunately'];
export const CLAUSE_STARTERS = new Set(['i', 'we', 'you', 'he', 'she', 'it', 'they', 'the', 'this', 'that', 'these', 'those', 'there', 'a', 'an', 'our', 'my', 'its', 'their', 'his', 'her', 'your', 'in', 'on', 'at', 'for', 'many', 'most', 'some', 'all', 'no', 'one', 'if', 'when']);

// Words that look like "an" words but start with a consonant sound, and vice versa.
export const A_BEFORE_VOWEL_LETTER = /^(union|unique|unit|univers|uniform|unif|unicorn|unilateral|unison|unisex|unanim|use|usu|uten|uti|ufo|ukul|uran|ureth|urin|euro|eu|ewe|one\b|once|ubiq|unicycl|uke\b|ukrain|usab|usag|utop|uro|utah|uganda|ugand|ural|uter|u-)/i;
export const AN_BEFORE_CONSONANT_LETTER = /^(hour|honest|honou?r|heir|herb\b)/i;

// Wordy phrases and redundancies -> shorter version. "" means delete.
export const WORDY = [
  ['in order to', 'to'],
  ['due to the fact that', 'because'],
  ['owing to the fact that', 'because'],
  ['in light of the fact that', 'because'],
  ['despite the fact that', 'although'],
  ['in spite of the fact that', 'although'],
  ['at this point in time', 'now'],
  ['at the present time', 'now'],
  ['at this moment in time', 'now'],
  ['in the event that', 'if'],
  ['has the ability to', 'can'],
  ['have the ability to', 'can'],
  ['is able to', 'can'],
  ['are able to', 'can'],
  ['a large number of', 'many'],
  ['a great number of', 'many'],
  ['a majority of', 'most'],
  ['the majority of', 'most'],
  ['a small number of', 'a few'],
  ['in the near future', 'soon'],
  ['prior to', 'before'],
  ['subsequent to', 'after'],
  ['with regard to', 'about'],
  ['with respect to', 'about'],
  ['in relation to', 'about'],
  ['for the purpose of', 'for'],
  ['in the process of', ''],
  ['on a daily basis', 'daily'],
  ['on a regular basis', 'regularly'],
  ['on a monthly basis', 'monthly'],
  ['on an annual basis', 'annually'],
  ['in a timely manner', 'promptly'],
  ['until such time as', 'until'],
  ['give consideration to', 'consider'],
  ['make a decision', 'decide'],
  ['come to a conclusion', 'conclude'],
  ['take into consideration', 'consider'],
  ['conduct an analysis of', 'examine'],
  ['is indicative of', 'indicates'],
  ['are indicative of', 'indicate'],
  ['it is important to note that', ''],
  ['it should be noted that', ''],
  ['it is worth noting that', ''],
  ['needless to say', ''],
  ['each and every', 'every'],
  ['first and foremost', 'first'],
  ['end result', 'result'],
  ['final outcome', 'outcome'],
  ['past history', 'history'],
  ['future plans', 'plans'],
  ['basic fundamentals', 'fundamentals'],
  ['absolutely essential', 'essential'],
  ['advance planning', 'planning'],
  ['added bonus', 'bonus'],
  ['close proximity', 'proximity'],
  ['in close proximity to', 'near'],
  ['revert back', 'revert'],
  ['return back', 'return'],
  ['repeat again', 'repeat'],
  ['join together', 'join'],
  ['collaborate together', 'collaborate'],
  ['new innovation', 'innovation'],
  ['completely eliminate', 'eliminate'],
  ['unexpected surprise', 'surprise'],
  ['free gift', 'gift'],
  ['ATM machine', 'ATM'],
  ['PIN number', 'PIN'],
  ['could potentially', 'could'],
  ['may possibly', 'may'],
  ['might possibly', 'might'],
  ['very unique', 'unique'],
  ['totally unique', 'unique'],
];

// Formal words with a plainer equivalent.
export const PLAIN_WORDS = {
  utilize: 'use', utilizes: 'uses', utilized: 'used', utilizing: 'using', utilization: 'use',
  utilise: 'use', utilises: 'uses', utilised: 'used', utilising: 'using', utilisation: 'use',
  commence: 'start', commences: 'starts', commenced: 'started', commencing: 'starting',
  facilitate: 'help', facilitates: 'helps', facilitated: 'helped', facilitating: 'helping',
  endeavor: 'try', endeavour: 'try',
  terminate: 'end', terminated: 'ended', terminates: 'ends',
  ascertain: 'find out', ascertained: 'found out',
  demonstrate: 'show', demonstrates: 'shows', demonstrated: 'showed', demonstrating: 'showing',
  numerous: 'many',
  subsequently: 'later',
  purchase: 'buy', purchased: 'bought', purchasing: 'buying',
  assist: 'help', assists: 'helps', assisted: 'helped', assisting: 'helping', assistance: 'help',
  approximately: 'about',
  individuals: 'people',
  initiate: 'start', initiated: 'started', initiates: 'starts',
  obtain: 'get', obtained: 'got', obtains: 'gets',
  inquire: 'ask', enquire: 'ask',
  necessitate: 'require', necessitates: 'requires',
  ameliorate: 'improve',
  henceforth: 'from now on',
  remuneration: 'pay',
};

// Weak intensifier + adjective -> a single stronger word. Offered, never forced.
export const VERY_PAIRS = {
  'very big': 'huge', 'very large': 'huge', 'very small': 'tiny', 'very important': 'essential',
  'very difficult': 'hard', 'very tired': 'exhausted', 'very happy': 'delighted', 'very bad': 'terrible',
  'very quick': 'rapid', 'very clear': 'obvious', 'very hungry': 'starving', 'very old': 'ancient',
  'very good': 'excellent', 'very scared': 'terrified', 'very angry': 'furious', 'very cold': 'freezing',
  'very hot': 'scorching', 'very smart': 'brilliant', 'very sad': 'miserable', 'very easy': 'simple',
  'really big': 'huge', 'really important': 'essential', 'really good': 'excellent', 'really bad': 'terrible',
};

// Phrases that read as AI-written. fix "" = delete; null = advice only.
export const AI_PHRASES = [
  ['serves as', 'is'], ['serve as', null], ['stands as', 'is'],
  ['a testament to', null], ['is a testament to', 'shows'],
  ['plays a crucial role in', 'matters for'], ['plays a pivotal role in', 'matters for'], ['plays a vital role in', 'matters for'], ['plays a key role in', 'matters for'],
  ['delve into', 'look at'], ['delves into', 'looks at'], ['delving into', 'looking at'],
  ['in today\'s fast-paced world', ''], ['in today\'s rapidly evolving', null], ['ever-evolving landscape', null], ['rapidly evolving landscape', null],
  ['navigate the complexities of', 'handle'], ['unlock the potential of', 'use'], ['harness the power of', 'use'],
  ['rich tapestry', null], ['tapestry of', null],
  ['at its core', ''], ['the real question is', 'the question is'],
  ['let\'s dive in', ''], ['let\'s dive into', 'on to'], ['without further ado', ''],
  ['in conclusion', null], ['in summary', null],
  ['game-changer', null], ['game changer', null],
  ['nestled in', 'in'], ['in the heart of', 'in'],
  ['the future looks bright', null], ['exciting times lie ahead', null],
  ['boasts a', 'has a'], ['boasts an', 'has an'],
  ['seamlessly', ''], ['seamless', 'smooth'],
  ['showcasing', 'showing'], ['showcases', null], ['showcase', null],
  ['underscores', 'shows'], ['underscoring', 'showing'],
  ['fostering', null],
  ['garner', 'get'], ['garnered', 'got'],
  ['embark on', 'start'], ['embarked on', 'started'],
  ['realm of', 'field of'],
  ['vibrant', null], ['pivotal', 'key'], ['intricate', 'complex'], ['interplay', 'interaction'],
  ['meticulously', 'carefully'], ['meticulous', 'careful'],
  ['elevate your', 'improve your'],
];

// Words never offered as synonyms: they make text sound machine-written.
export const AI_VOCAB = new Set([
  'delve', 'delves', 'tapestry', 'testament', 'pivotal', 'underscore', 'underscores', 'showcase',
  'showcases', 'vibrant', 'intricate', 'intricacies', 'interplay', 'garner', 'foster', 'fostering',
  'realm', 'embark', 'seamless', 'seamlessly', 'leverage', 'leveraging', 'synergy', 'paradigm',
  'holistic', 'multifaceted', 'nuanced', 'robust', 'meticulous', 'meticulously', 'elevate',
  'unleash', 'empower', 'transformative', 'groundbreaking', 'cutting-edge', 'bespoke', 'myriad',
  'plethora', 'quintessential', 'unparalleled', 'commendable', 'noteworthy', 'crucial', 'enhance',
  'streamline', 'spearhead', 'bolster', 'navigate', 'landscape', 'ecosystem', 'utilize',
]);

// Adjectives that look like passive participles ("I was tired"). Not flagged.
export const ADJECTIVE_PARTICIPLES = new Set([
  'tired', 'interested', 'excited', 'bored', 'worried', 'concerned', 'pleased', 'satisfied',
  'married', 'used', 'supposed', 'located', 'based', 'involved', 'related', 'scared', 'surprised',
  'confused', 'amazed', 'prepared', 'determined', 'disappointed', 'frustrated', 'embarrassed',
  'exhausted', 'annoyed', 'relieved', 'shocked', 'stressed', 'overwhelmed', 'committed',
  'dedicated', 'qualified', 'advanced', 'complicated', 'detailed', 'experienced', 'limited',
  'needed', 'required', 'expected', 'allowed', 'aimed', 'designed', 'focused', 'engaged',
  'convinced', 'impressed', 'motivated', 'organised', 'organized', 'balanced', 'skilled',
  'talented', 'educated', 'informed', 'inclined', 'known', 'done', 'gone', 'lost', 'finished',
  'closed', 'opened', 'crowded', 'packed', 'connected', 'attached', 'aware', 'faced', 'unrelated',
]);

// Words ending in -ed that are not past participles.
export const NOT_PARTICIPLES = new Set([
  'need', 'bed', 'red', 'shed', 'seed', 'feed', 'speed', 'breed', 'indeed', 'hundred', 'naked',
  'wicked', 'sacred', 'ragged', 'rugged', 'beloved', 'creed', 'deed', 'greed', 'weed', 'steed',
  'sled', 'bled', 'fled', 'led', 'wed', 'bred', 'sped', 'shred', 'embed', 'proceed', 'succeed',
  'exceed', 'heed', 'reed', 'tweed', 'kindred', 'aged', 'jagged', 'crooked', 'learned', 'blessed',
]);

// Irregular past participle -> simple past. Used for active-voice rewrites.
export const IRREGULAR = {
  written: 'wrote', taken: 'took', given: 'gave', made: 'made', done: 'did', seen: 'saw',
  known: 'knew', shown: 'showed', found: 'found', built: 'built', sent: 'sent', paid: 'paid',
  held: 'held', kept: 'kept', left: 'left', told: 'told', brought: 'brought', bought: 'bought',
  thought: 'thought', caught: 'caught', taught: 'taught', sold: 'sold', said: 'said', read: 'read',
  led: 'led', met: 'met', set: 'set', put: 'put', cut: 'cut', hit: 'hit', run: 'ran', won: 'won',
  begun: 'began', broken: 'broke', chosen: 'chose', driven: 'drove', eaten: 'ate', forgotten: 'forgot',
  frozen: 'froze', hidden: 'hid', spoken: 'spoke', stolen: 'stole', torn: 'tore', worn: 'wore',
  drawn: 'drew', grown: 'grew', thrown: 'threw', blown: 'blew', flown: 'flew', beaten: 'beat',
  bitten: 'bit', forgiven: 'forgave', ridden: 'rode', shaken: 'shook', woken: 'woke', sung: 'sang',
  drunk: 'drank', rung: 'rang', swum: 'swam', understood: 'understood', heard: 'heard', felt: 'felt',
  meant: 'meant', lent: 'lent', spent: 'spent', lost: 'lost', won: 'won', struck: 'struck', hung: 'hung',
  laid: 'laid', fed: 'fed', dealt: 'dealt', sought: 'sought', fought: 'fought', bound: 'bound',
  undertaken: 'undertook', overseen: 'oversaw', withdrawn: 'withdrew', upheld: 'upheld', rewritten: 'rewrote',
};

export const STOPWORDS = new Set(('a an the and or but if then than so of to in on at by for with from as is are was were be been being it its this that these those i you he she we they me him her us them my your his our their not no do does did have has had will would can could should may might must there here what which who whom whose when where why how all any each some more most other such only own same too very just also into about over after before up down out off again further once both few nor per via').split(' '));
