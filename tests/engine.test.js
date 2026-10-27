import test from 'node:test';
import assert from 'node:assert/strict';
import { runChecks, applyFix, remap, overallScore, stats, detectDialect } from '../src/engine/index.js';
import { splitSentences } from '../src/engine/text.js';

const find = (text, rule, opts) => runChecks(text, opts).filter((s) => s.rule === rule);
const fixOne = (text, rule, opts) => {
  const s = find(text, rule, opts)[0];
  assert.ok(s, `expected a ${rule} suggestion in: ${text}`);
  assert.ok(s.fixes.length, `expected a fix for ${rule}`);
  return applyFix(text, s.fixes[0]);
};

test('a/an', () => {
  assert.equal(fixOne('This is a error.', 'a-an'), 'This is an error.');
  assert.equal(fixOne('It took an year.', 'a-an'), 'It took a year.');
  assert.equal(find('It was a unique idea and a useful one.', 'a-an').length, 0);
  assert.equal(find('Wait an hour for an honest answer.', 'a-an').length, 0);
  assert.equal(find('She has an MBA from a NASA program.', 'a-an').length, 0);
  assert.equal(find('He was an unintended winner.', 'a-an').length, 0);
});

test('comma-splice detection: catch clear cases and leave reporting tags alone', () => {
  assert.equal(fixOne('The report was late, it missed the deadline.', 'comma-splice'),
    'The report was late; it missed the deadline.');
  assert.equal(find('The report was late, it seems.', 'comma-splice').length, 0,
    'a short reporting tag is not a second independent clause');
  assert.equal(find('The package contains books, which are on the shelf.', 'comma-splice').length, 0,
    'a relative clause after a comma is not a comma splice');
  assert.equal(find('"The report was late, it missed the deadline."', 'comma-splice').length, 0,
    'leave quoted text unchanged');
});

test('agreement: "one of the ..." takes a singular verb', () => {
  assert.equal(fixOne('One of the reports are missing.', 'agreement'), 'One of the reports is missing.');
  assert.equal(fixOne('One of the children have arrived.', 'agreement'), 'One of the children has arrived.');
  assert.equal(fixOne('One of the teams were ready.', 'agreement'), 'One of the teams was ready.');
  assert.equal(find('One of the series is popular.', 'agreement').filter((s) => s.original === 'is').length, 0);
  assert.equal(fixOne('One of the analysts are available.', 'agreement'), 'One of the analysts is available.');
  assert.equal(fixOne('One of the users have reported it.', 'agreement'), 'One of the users has reported it.');
  assert.equal(find('One of the reports that are missing was archived.', 'agreement').filter((s) => s.original === 'are').length, 0, 'preserve plural verb in a relative clause');
  assert.equal(find('One of the reports is missing.', 'agreement').filter((s) => s.original === 'is').length, 0, 'leave correct agreement alone');
  assert.equal(find('"One of the reports are missing," she said.', 'agreement').filter((s) => s.original === 'are').length, 0);
});

test('repeated word', () => {
  assert.equal(fixOne('We saw the the report.', 'repeated-word'), 'We saw the report.');
  assert.equal(find('What he had had was enough.', 'repeated-word').length, 0);
});

test('lowercase i and sentence start', () => {
  assert.equal(fixOne('Yesterday i went home.', 'lowercase-i'), 'Yesterday I went home.');
  assert.equal(find('Use it, i.e. the tool.', 'lowercase-i').length, 0);
  assert.equal(fixOne('It rained. we stayed in all day.', 'sentence-case'), 'It rained. We stayed in all day.');
  assert.equal(find('See e.g. the annex for more.', 'sentence-case').length, 0);
  assert.equal(find('Buy an iPhone today. iPhones are good.', 'sentence-case').length, 0);
});

test('confusions and agreement', () => {
  assert.equal(fixOne('We could of won.', 'confusion'), 'We could have won.');
  assert.equal(fixOne('Their is a problem.', 'confusion'), 'There is a problem.');
  assert.equal(fixOne('It is better then before.', 'confusion'), 'It is better than before.');
  assert.equal(fixOne('He don\'t know.', 'agreement'), 'He doesn\'t know.');
  assert.equal(fixOne('They was late.', 'agreement'), 'They were late.');
  assert.equal(find('If it were up to me.', 'agreement').length, 0);
  assert.equal(find('Does she have a pen?', 'agreement').length, 0);
});

test('spacing', () => {
  assert.equal(fixOne('Hello  world.', 'double-space'), 'Hello world.');
  assert.equal(fixOne('Hello , world.', 'space-before-punct'), 'Hello, world.');
  assert.equal(fixOne('red,blue and green', 'space-after-comma'), 'red, blue and green');
  assert.equal(find('It costs 1,000 rupees.', 'space-after-comma').length, 0);
});

test('intro comma', () => {
  assert.equal(fixOne('However we left early.', 'intro-comma'), 'However, we left early.');
  assert.equal(find('However hard you try, it fails.', 'intro-comma').length, 0);
});

test('dialect: auto follows the majority', () => {
  const t = 'We organise the team and prioritise the work, then organize the files.';
  const s = find(t, 'dialect');
  assert.equal(s.length, 1);
  assert.equal(s[0].original, 'organize');
  assert.equal(s[0].fixes[0].text, 'organise');
  assert.equal(detectDialect(t), 'uk');
  assert.equal(find('The color of the centre.', 'dialect', { dialect: 'us' })[0].fixes[0].text, 'center');
  assert.equal(find('One color, one colour.', 'dialect').length, 0, 'tie: no opinion');
});

test('wordy phrases keep sentence case on deletion', () => {
  assert.equal(fixOne('In order to win, we trained.', 'wordy'), 'To win, we trained.');
  assert.equal(fixOne('It is important to note that the data is old.', 'wordy'), 'The data is old.');
  assert.equal(fixOne('We met, needless to say, at noon.', 'wordy'), 'We met, at noon.');
});

test('passive voice: flag, and rewrite only the plain shape', () => {
  const s = find('The report was written by the team.', 'passive')[0];
  assert.ok(s);
  assert.equal(applyFix('The report was written by the team.', s.fixes[0]), 'The team wrote the report.');
  assert.equal(fixOne('The cake was eaten by me.', 'passive'), 'I ate the cake.');
  const t2 = 'We made a plan. Payments were made late.';
  // Round 3 (ruling P): a sentence starting "We" makes "we" the first option; the agentless template is a
  // visible "[who]" placeholder, never first when "we" is offered, and selected for typing over.
  const fixes = find(t2, 'passive')[0].fixes;
  assert.equal(applyFix(t2, fixes[0]), 'We made a plan. We made payments late.');
  const tpl = fixes.find((f) => f.template);
  assert.equal(applyFix(t2, tpl), 'We made a plan. [who] made payments late.');
  assert.deepEqual(tpl.select, [0, 5]);
  // The old "Someone" template only exists behind the test option passiveTemplate.
  const noAgent = find(t2, 'passive', { passiveTemplate: true })[0];
  assert.ok(noAgent);
  const someone = noAgent.fixes.find((f) => f.select);
  assert.equal(applyFix(t2, someone), 'We made a plan. Someone made payments late.');
  assert.deepEqual(someone.select, [0, 7], 'placeholder actor gets selected for typing over');
  assert.equal(find('I was tired after work.', 'passive').length, 0);
  assert.equal(find('She is interested in maths.', 'passive').length, 0);
});


test('style rules surface conservative usage feedback from the screenshot examples', () => {
  const lagText = 'The rural divisions still lag behind on collection efficiency.';
  const lag = find(lagText, 'lag-preposition')[0];
  assert.ok(lag, 'recognises the preposition choice after lag behind');
  assert.equal(applyFix(lagText, lag.fixes[0]), 'The rural divisions still lag behind in collection efficiency.');
  assert.equal(find('The team is lagging behind on payments.', 'lag-preposition').length, 0,
    'do not flag the normal “lag behind on payments” construction');

  const modalText = 'To decide, we must have looked at many options.';
  const modal = find(modalText, 'purpose-modal-tense')[0];
  assert.ok(modal, 'finds the purpose + must-have-past pattern');
  assert.equal(applyFix(modalText, modal.fixes[0]), 'To decide, we must look at many options.');
});

test('passive after a semicolon gets an active alternative when the document uses we', () => {
  const text = 'We reviewed the report, and we noted the conclusion; it was written too quickly.';
  const s = find(text, 'passive').find((item) => item.original.toLowerCase() === 'was written');
  assert.ok(s, 'passive clause is detected');
  const fix = s.fixes.find((item) => item.text === 'we wrote it too quickly.');
  assert.ok(fix, 'offers an active rewrite for the semicolon clause');
  assert.equal(applyFix(text, fix), 'We reviewed the report, and we noted the conclusion; we wrote it too quickly.');
});

test('long sentences split at natural breaks without changing words', () => {
  const t = 'The discom improved billing in most urban divisions over the last three years, but collection in the rural divisions stayed flat because many meters were still faulty and readings were often estimated.';
  const s = find(t, 'long-sentence')[0];
  assert.ok(s);
  assert.ok(s.fixes.length >= 1);
  const original = new Set(t.toLowerCase().match(/[a-z]+/g));
  const allowed = new Set(['this', 'is', 'because', 'but', 'so', 'yet', 'by', 'contrast', 'however']);
  for (const f of s.fixes) {
    const out = applyFix(t, f);
    for (const w of out.toLowerCase().match(/[a-z]+/g)) assert.ok(original.has(w) || allowed.has(w), `new word "${w}" in ${out}`);
  }
  assert.ok(s.fixes.some((f) => /flat\. This is because many meters/.test(applyFix(t, f))));
});

test('voice: AI phrases flagged, plain fixes offered', () => {
  assert.equal(fixOne('The hall serves as a venue.', 'ai-phrase'), 'The hall is a venue.');
  assert.equal(fixOne('We delve into the data.', 'ai-phrase'), 'We look at the data.');
  const s = find('It is a testament to grit.', 'ai-phrase');
  assert.equal(s.length, 1);
  assert.equal(s[0].original, 'is a testament to');
  assert.equal(runChecks('The hall serves as a venue.', { categories: { voice: false } }).filter((x) => x.category === 'voice').length, 0);
});

test('no suggestion ever edits outside its own fix span', () => {
  const t = 'i think their is a error in the the report. In order to win we must of tried. The report was written by the team. This serves as a testament to it. However we organise and organize things. The data was very important and very big.';
  for (const s of runChecks(t)) {
    for (const f of s.fixes) {
      const out = applyFix(t, f);
      assert.equal(out.slice(0, f.start), t.slice(0, f.start));
      assert.equal(out.slice(f.start + f.text.length), t.slice(f.end));
    }
  }
});

test('informal voice is left alone', () => {
  const t = "Anyway, I'm gonna try it. And honestly? It works. Kinda.";
  const flagged = runChecks(t).filter((s) => s.category === 'correctness');
  assert.deepEqual(flagged, []);
});

test('remap shifts later suggestions and drops edited ones', () => {
  const oldT = 'aa bb cc';
  const sgs = [
    { start: 0, end: 2, fixes: [{ start: 0, end: 2, text: 'x' }] },
    { start: 3, end: 5, fixes: [{ start: 3, end: 5, text: 'y' }] },
    { start: 6, end: 8, fixes: [{ start: 6, end: 8, text: 'z' }] },
  ];
  const out = remap(sgs, oldT, 'aa bbbb cc');
  assert.equal(out.length, 2);
  assert.equal(out[0].start, 0);
  assert.equal(out[1].start, 8);
  assert.equal(out[1].fixes[0].start, 8);
});

test('sentences split around abbreviations', () => {
  const s = splitSentences('Dr. Rao met us. We talked, e.g. about rates. Then we left.');
  assert.equal(s.length, 3);
});

test('score and stats', () => {
  assert.equal(overallScore('', []), null);
  assert.equal(overallScore('Clean simple text here.', []), 100);
  const st = stats('One two three. Four five.');
  assert.equal(st.words, 5);
  assert.equal(st.sentences, 2);
});

test('performance: 2,000 words under 100 ms', () => {
  const para = 'The team reviewed the tariff order and found that the discom was able to reduce losses in order to meet its targets. However we organise the data and it was analysed by the staff. ';
  const text = para.repeat(Math.ceil(2000 / para.split(' ').length));
  runChecks(text); // warm up
  const t0 = performance.now();
  runChecks(text);
  const ms = performance.now() - t0;
  assert.ok(ms < 100, `took ${ms.toFixed(1)} ms`);
});
