// Name, one-sentence explanation and a fixed example for each rule, shown on
// the suggestion cards ("Why?"). Plain data; nothing here is inserted into text.

export const RULE_INFO = {
  // Round 1 usage rules
  'compound-subject': {
    name: 'Subject–verb agreement',
    explanation: 'Two nouns joined by "and" make a plural subject, so the verb is plural.',
    example: { wrong: 'The design and testing of the tool is slow.', right: 'The design and testing of the tool are slow.' },
  },
  'both-and': {
    name: 'Faulty parallelism',
    explanation: 'After "both", the two halves joined by "and" should have the same shape.',
    example: { wrong: 'both a short and long route', right: 'both short and long routes' },
  },
  'wordy-purpose': {
    name: 'Wordy phrase',
    explanation: 'A roundabout purpose phrase can usually be said with a plain verb or "to".',
    example: { wrong: 'The study is aimed at measuring demand.', right: 'The study aims to measure demand.' },
  },
  preposition: {
    name: 'Preposition choice',
    explanation: 'Some words always pair with a particular preposition.',
    example: { wrong: 'suitable to the site', right: 'suitable for the site' },
  },
  'list-parallel': {
    name: 'Faulty parallelism',
    explanation: 'Items in a list should have the same grammatical shape.',
    example: { wrong: 'The tool is fast, accurate, and can handle large files.', right: 'The tool is fast, accurate, and able to handle large files.' },
  },
  'article-idiom': {
    name: 'Article in fixed phrase',
    explanation: 'Some idioms always take one article and no other.',
    example: { wrong: 'a bulk of the funds', right: 'the bulk of the funds' },
  },
  'vague-phrase': {
    name: 'Vague phrase',
    explanation: 'Some connecting phrases add words without saying how two things relate.',
    example: { wrong: 'with regard to tariffs', right: 'on tariffs' },
  },
  nominalisation: {
    name: 'Nominalisation',
    explanation: 'An action turned into a noun ("the implementation of") is longer than the verb.',
    example: { wrong: 'funds for the implementation of the plan', right: 'funds for implementing the plan' },
  },
  // Round 2 rules
  correlative: {
    name: 'Paired words',
    explanation: 'Some words come in fixed pairs: neither … nor, either … or, between … and, both … and.',
    example: { wrong: 'a choice between solar or wind', right: 'a choice between solar and wind' },
  },
  'one-of-plural': {
    name: '"One of the" + plural',
    explanation: '"One of the" picks one item from a group, so the noun after it is plural.',
    example: { wrong: 'one of the most important factor', right: 'one of the most important factors' },
  },
  'serial-comma': {
    name: 'Serial comma',
    explanation: 'Use the comma before the final "and" in a list the same way throughout a document.',
    example: { wrong: 'land, water, and labour … roads, ports and rail', right: 'land, water, and labour … roads, ports, and rail' },
  },
  'title-case': {
    name: 'Title capitalisation',
    explanation: 'A heading uses one capitalisation style: sentence case or title case.',
    example: { wrong: 'Decarbonisation of the Power sector', right: 'Decarbonisation of the power sector' },
  },
  hyphenation: {
    name: 'Hyphenation',
    explanation: 'Two words that together describe a following noun take a hyphen; an -ly adverb never does.',
    example: { wrong: 'long term contracts · a highly-skilled team', right: 'long-term contracts · a highly skilled team' },
  },
  'verb-pattern': {
    name: 'Verb pattern',
    explanation: 'Some verbs and phrases take an -ing form, others take "to" + verb.',
    example: { wrong: 'We look forward to hear from you.', right: 'We look forward to hearing from you.' },
  },
  redundancy: {
    name: 'Redundancy',
    explanation: 'One word of the pair already carries the meaning of the other.',
    example: { wrong: 'past experience', right: 'experience' },
  },
  // Round 6 rules
  'pronoun-agreement': {
    name: 'Pronoun agreement',
    explanation: 'A singular noun such as "the utility" takes "its", not "their".',
    example: { wrong: 'The utility must clear their backlog.', right: 'The utility must clear its backlog.' },
  },
  'consistency-spelling': {
    name: 'Consistent spelling',
    explanation: 'Use one spelling system (British or American) throughout; the fix follows the one you use most.',
    example: { wrong: 'decarbonisation … decarbonization', right: 'decarbonisation … decarbonisation' },
  },
  'consistency-hyphen': {
    name: 'Consistent hyphenation',
    explanation: 'Write a compound the same way each time it describes a noun; the fix follows the form you use most.',
    example: { wrong: 'net-metering approval … net metering approvals', right: 'net-metering approval … net-metering approvals' },
  },
  'consistency-case': {
    name: 'Consistent capitalisation',
    explanation: 'Capitalise a term the same way each time it appears mid-sentence.',
    example: { wrong: 'the state government … the State Government', right: 'the state government … the state government' },
  },
  'consistency-percent': {
    name: 'Consistent percentages',
    explanation: 'Write percentages one way throughout: "per cent", "percent" or "%".',
    example: { wrong: '4 per cent … 20 percent', right: '4 per cent … 20 per cent' },
  },
  'acronym-before-definition': {
    name: 'Acronym used before definition',
    explanation: 'Spell out an acronym the first time it appears, not later.',
    example: { wrong: 'GED supplies … The Goa Electricity Department (GED) reported …', right: 'The Goa Electricity Department (GED) supplies … GED reported …' },
  },
  'acronym-undefined': {
    name: 'Acronym never defined',
    explanation: 'Readers outside your organisation may not know an acronym; spell it out once.',
    example: { wrong: 'as per the BOQ', right: 'as per the bill of quantities (BOQ)' },
  },
  'acronym-redefined': {
    name: 'Acronym defined twice',
    explanation: 'After the first definition, use the acronym alone.',
    example: { wrong: 'demand-side management (DSM) … demand-side management (DSM)', right: 'demand-side management (DSM) … DSM' },
  },
  'number-grouping': {
    name: 'Number grouping',
    explanation: 'Group large numbers in one system: Indian (6,50,000) or international (650,000).',
    example: { wrong: '6,50,000 consumers … 120,000 complaints', right: '6,50,000 consumers … 1,20,000 complaints' },
  },
  'number-separator': {
    name: 'Number separators',
    explanation: 'Write numbers of 1,000 and above the same way throughout, with or without separators.',
    example: { wrong: '1,850 households … 2450 meters', right: '1,850 households … 2,450 meters' },
  },
  'study-tense': {
    name: 'Study tense',
    explanation: 'Describe your own study in one time frame: planned (future) or done/in progress (present or past).',
    example: { wrong: 'This paper examines … The assessment will use …', right: 'This paper examines … The assessment uses …' },
  },
  'unsupported-claim': {
    name: 'Unsupported claim',
    explanation: 'Phrases like "it is well known" or "studies show" assert support without showing it.',
    example: { wrong: 'Studies show that prices will rise.', right: 'The IEA (2023) projects that prices will rise.' },
  },
  'paragraph-end': {
    name: 'Missing full stop',
    explanation: 'Every paragraph of running text ends with a full stop (or other end punctuation).',
    example: { wrong: 'A breakdown by item is attached', right: 'A breakdown by item is attached.' },
  },
  'paragraph-same-start': {
    name: 'Repeated sentence openings',
    explanation: 'Three or more sentences in a row with the same opening read like a list; vary or combine them.',
    example: { wrong: 'The department should … The department should … The department receives …', right: 'The department should … and … It receives …' },
  },
  'paragraph-long': {
    name: 'Long paragraph',
    explanation: 'Very long paragraphs are hard to follow; split where the topic shifts.',
    example: { wrong: 'One 190-word block', right: 'Two paragraphs of about 90 words' },
  },
  'keyword-unused': {
    name: 'Keyword not used',
    explanation: 'A keyword should name something the text actually discusses.',
    example: { wrong: 'Keywords: heat stress (never mentioned)', right: 'Keywords: cooling demand (discussed in the text)' },
  },
  // Round 6 P1 rules
  'intro-clause-comma': {
    name: 'Comma after opening clause',
    explanation: 'A sentence that opens with an "if/when/because …" clause takes a comma where the main clause starts.',
    example: { wrong: 'If you would like to discuss the figures I am free on Thursday.', right: 'If you would like to discuss the figures, I am free on Thursday.' },
  },
  'register-in': {
    name: 'Register (Indian English)',
    explanation: 'Some phrases common in Indian office English read as old-fashioned or unclear to other readers.',
    example: { wrong: 'Kindly revert at the earliest.', right: 'Please reply as soon as you can.' },
  },
  'date-format': {
    name: 'Date format',
    explanation: 'Write dates one way throughout, and avoid numeric dates that read differently in different countries.',
    example: { wrong: '12 June … June 3 … 20/06/2024', right: '12 June … 3 June … 20 June 2024' },
  },
  // Existing rules
  'a-an': { name: 'Article a/an', explanation: 'Use "an" before a vowel sound and "a" before a consonant sound.', example: { wrong: 'a error', right: 'an error' } },
  'repeated-word': { name: 'Repeated word', explanation: 'The same word appears twice in a row.', example: { wrong: 'the the report', right: 'the report' } },
  'lowercase-i': { name: 'Capital "I"', explanation: 'The pronoun "I" is always a capital letter.', example: { wrong: 'then i left', right: 'then I left' } },
  'sentence-case': { name: 'Sentence start', explanation: 'Sentences start with a capital letter.', example: { wrong: 'It rained. we stayed in.', right: 'It rained. We stayed in.' } },
  confusion: { name: 'Commonly confused words', explanation: 'These words sound alike but mean different things.', example: { wrong: 'could of', right: 'could have' } },
  agreement: { name: 'Subject–verb agreement', explanation: 'The verb must match its subject in number.', example: { wrong: 'He don\'t know.', right: 'He doesn\'t know.' } },
  'intro-comma': { name: 'Comma after opener', explanation: 'An introductory word is usually followed by a comma.', example: { wrong: 'However we left.', right: 'However, we left.' } },
  dialect: { name: 'Spelling consistency', explanation: 'Keep to one variety of English spelling.', example: { wrong: 'organise … organize', right: 'organise … organise' } },
  'comma-splice': { name: 'Comma splice', explanation: 'Two full sentences need more than a comma between them.', example: { wrong: 'It rained, we stayed in.', right: 'It rained; we stayed in.' } },
  'verb-form': { name: 'Verb form', explanation: 'Auxiliaries take a particular verb form.', example: { wrong: 'has went', right: 'has gone' } },
  wordy: { name: 'Wordy phrase', explanation: 'A shorter phrase says the same thing.', example: { wrong: 'in order to', right: 'to' } },
  'plain-word': { name: 'Plain word', explanation: 'A plainer word means the same here.', example: { wrong: 'utilise', right: 'use' } },
  'long-sentence': { name: 'Long sentence', explanation: 'Readers lose track in very long sentences.', example: { wrong: 'One 50-word sentence', right: 'Two sentences of 25 words' } },
  passive: { name: 'Passive voice', explanation: 'Active voice names the actor first.', example: { wrong: 'The report was written by the team.', right: 'The team wrote the report.' } },
  'lag-preposition': { name: 'Preposition after “lag behind”', explanation: '“Lag behind” is a standard expression. With performance measures, “behind in” is often more idiomatic than “behind on”.', example: { wrong: 'lag behind on collection efficiency', right: 'lag behind in collection efficiency' } },
  'purpose-modal-tense': { name: 'Check modal tense', explanation: '“Must have looked” often expresses a conclusion about a past event; “must look” expresses a requirement.', example: { wrong: 'To decide, we must have looked at options.', right: 'To decide, we must look at options.' } },
  repetition: { name: 'Repetition', explanation: 'The same word several times in a few lines can feel flat.', example: { wrong: 'cost … cost … cost', right: 'cost … price … cost' } },
  intensifier: { name: 'Weak intensifier', explanation: 'One precise word can replace "very" + adjective.', example: { wrong: 'very tired', right: 'exhausted' } },
  'ai-phrase': { name: 'AI-sounding phrase', explanation: 'Stock phrases common in AI text weaken your voice.', example: { wrong: 'serves as a reminder', right: 'is a reminder' } },
  // Round 9 (Grok audit): new rules only
  'dangling-modifier': { name: 'Dangling modifier', explanation: 'An opening "-ing" phrase describes whoever comes right after the comma. If no doer comes next, the sentence says the wrong thing did it.', example: { wrong: 'Having reviewed the data, the decision was made.', right: 'Having reviewed the data, we made the decision.' } },
  'fused-sentence': { name: 'Run-on sentence', explanation: 'Two complete sentences need a full stop, a semicolon or a joining word between them.', example: { wrong: 'The meeting ended early we went home.', right: 'The meeting ended early. We went home.' } },
  'who-whom': { name: 'Who or whom', explanation: '"Who" does the action; "whom" receives it or follows a preposition.', example: { wrong: 'the officer whom is in charge', right: 'the officer who is in charge' } },
  subjunctive: { name: 'Unreal "were"', explanation: 'For a situation that is not true, standard English uses "were" with every subject.', example: { wrong: 'If I was you, I would wait.', right: 'If I were you, I would wait.' } },
  'much-many': { name: 'Much or many', explanation: '"Many" goes with things you can count; "much" with things you can\'t.', example: { wrong: 'much people, many information', right: 'many people, much information' } },
  'that-which': { name: 'That or which', explanation: 'In American English, a clause that identifies the noun takes "that"; a clause that only adds detail takes ", which".', example: { wrong: 'The report which was late is long.', right: 'The report that was late is long.' } },
  'not-only': { name: 'Correlative pair', explanation: '"Not only" pairs with "but also".', example: { wrong: 'not only cheap and also fast', right: 'not only cheap but also fast' } },
  'register-office': { name: 'Office register', explanation: 'Some office phrases common in Indian English read oddly to readers elsewhere. A plain standard word works everywhere.', example: { wrong: 'Please intimate us of the date.', right: 'Please inform us of the date.' } },
  'with-clause': { name: 'Long sentence', explanation: 'A ", with …" phrase at the end of a long sentence usually carries a second idea that reads better on its own.', example: { wrong: '…in the districts, with most plants located in the north.', right: '…in the districts. Most plants are in the north.' } },
  'data-number': { name: '"Data" singular or plural', explanation: 'Treat "data" one way throughout a document.', example: { wrong: 'The data is clear … the data show', right: 'The data are clear … the data show' } },
  'acronym-unused': { name: 'Unused acronym', explanation: 'An acronym defined once and never used again is extra load for the reader.', example: { wrong: 'Time of Day (ToD) tariffs … (ToD never used again)', right: 'Time of Day tariffs …' } },
  'paragraph-rhythm': { name: 'Sentence rhythm', explanation: 'A paragraph of equal-length sentences reads flat. Varying the length helps key points stand out.', example: { wrong: 'Four sentences of 16–18 words each', right: 'Long, long, short' } },
  'paragraph-one-sentence': { name: 'Long one-sentence paragraph', explanation: 'A whole paragraph in one long sentence gives the reader no pause.', example: { wrong: 'One 50-word sentence as a paragraph', right: 'Two or three sentences' } },
};

export function ruleInfo(rule) {
  return RULE_INFO[rule] || null;
}
