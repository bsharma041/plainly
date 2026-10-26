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
  repetition: { name: 'Repetition', explanation: 'The same word several times in a few lines can feel flat.', example: { wrong: 'cost … cost … cost', right: 'cost … price … cost' } },
  intensifier: { name: 'Weak intensifier', explanation: 'One precise word can replace "very" + adjective.', example: { wrong: 'very tired', right: 'exhausted' } },
  'ai-phrase': { name: 'AI-sounding phrase', explanation: 'Stock phrases common in AI text weaken your voice.', example: { wrong: 'serves as a reminder', right: 'is a reminder' } },
};

export function ruleInfo(rule) {
  return RULE_INFO[rule] || null;
}
