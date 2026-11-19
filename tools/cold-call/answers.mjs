/* Direct answers for Cold Call rehearsal (tools/cold-call/answers.json).

   An episode's cue is the question a professor would ask. Its direct answer is what a student would say.
   Two kinds are stored, and each entry records which it is:

     verbatim     the answer is sentences of the episode's own paragraphs, word for word;
     paraphrase   the answer is tightened wording (the owner allowed this for Cold Call answers, decision
                  13 of 3.2: the exact legal term, the actor, the object and the condition named; one
                  sentence, two for a two-part question). The page shows it under the label "Answer".

   Every answer of either kind is linked to the sentences of its own episode it rests on (`from`: paragraph
   and sentence, both counted from 0, and the sentence's text). The page uses the link to take the reader
   from the answer to the passage in the narration below it. An answer may also name `context`: a sentence
   of another episode of the same case that fixes what a word of this episode refers to (episode 5 of
   C. Itoh says "subsection (3)"; episode 4 says of which section). The tool holds a context sentence to
   the same test as a linked one; the page does not use it.

     node tools/cold-call/answers.mjs            check answers.json and the copy the page reads
     node tools/cold-call/answers.mjs --write    write src/features/v32/coldcall-answers.js from answers.json
     node tools/cold-call/answers.mjs --own      print, for each paraphrase, the words that are in neither
                                                 its linked sentences nor its question
     node tools/cold-call/answers.mjs --review [file.md] [--only case:episode,case:episode]
                                                 write the packet a second reader checks each answer against:
                                                 the question, the answer, the linked sentences, the episode
     node tools/cold-call/answers.mjs --todo [file.jsonl]
                                                 count the questions with no stored answer; with a file name,
                                                 write a worksheet: one line per question, its episode's
                                                 sentences numbered
     node tools/cold-call/answers.mjs --fill file.jsonl [--by "who, when"]
                                                 take the lines of a worksheet that carry "pick": [numbers]
                                                 and store those sentences as verbatim answers

   What the check holds, for every stored answer: the case and the episode exist; the stored cue is still
   the episode's cue and is a question; the link names sentences that exist in the episode, in order, none
   twice, and each linked sentence is still, word for word, what was linked. A verbatim answer is exactly
   its linked sentences. A paraphrase cannot be held to the episode's words, so it is held to what a script
   can hold it to: one or two sentences; every number, section number and proper name in it is in its linked
   sentences (a name may also come from the question); every other word that is in neither the linked
   sentences nor the question is listed in `ownWords`, so adding one is a recorded act; and `checked` names
   how it was checked after it was written. Whether an answer is true to its passage is a reader's
   judgement: the script narrows what a reader must look at, it does not replace the reading.
   Reads source files only (tools/cold-call/narratives and cases.json). */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = path.join(root, 'tools/cold-call/answers.json'),
  MODULE = path.join(root, 'src/features/v32/coldcall-answers.js'),
  NARRATIVES = path.join(root, 'tools/cold-call/narratives');
const SCHEMA = 2,
  KINDS = ['verbatim', 'paraphrase'],
  MAX_VERBATIM = 4,
  MAX_PARAPHRASE = 2,
  MAX_LINKED = 6,
  MAX_CONTEXT = 2;
const squash = (text) => String(text).replace(/\s+/g, ' ').trim();
const isQuestion = (cue) => /\?["”’')\]]*\s*$/.test(cue || '');
const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
// The sentences of an episode, paragraph by paragraph, cut where a sentence ends.
export function paragraphSentences(section) {
  return section.paragraphs.map((paragraph) =>
    [...segmenter.segment(squash(paragraph))].map((part) => part.segment.trim()).filter(Boolean),
  );
}
// The same sentences in one list, each with its place: { p, s, text }.
export function placedSentences(section) {
  return paragraphSentences(section).flatMap((sentences, p) => sentences.map((text, s) => ({ p, s, text })));
}
export const sentencesOf = (section) => placedSentences(section).map((sentence) => sentence.text);
function narratives() {
  const cases = new Map();
  for (const name of fs
    .readdirSync(NARRATIVES)
    .filter((f) => f.endsWith('.json'))
    .sort()) {
    const account = JSON.parse(fs.readFileSync(path.join(NARRATIVES, name), 'utf8'));
    if (account?.id && Array.isArray(account.sections)) cases.set(account.id, account);
  }
  // Three accounts (the first written) are kept in cases.json instead of a file of their own.
  for (const account of JSON.parse(fs.readFileSync(path.join(root, 'tools/cold-call/cases.json'), 'utf8'))
    .cases)
    if (account?.id && Array.isArray(account.sections) && !cases.has(account.id))
      cases.set(account.id, account);
  return cases;
}
const read = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));

/* ---------- what a script can hold a paraphrase to ---------- */
// Words that carry no claim of their own. Everything else in a paraphrase, connectives, negations and
// quantifiers included ("so", "not", "only", "including"), must be in the linked sentences or the question,
// or be listed in the entry's `ownWords`.
const PLAIN = new Set(
  'a an the and or of in on to for by with from at as that which who whom whose it its he she his her they them their this these those was were is are be been being had has have'.split(
    ' ',
  ),
);
// "§" and "Section" are one word; a possessive is its noun; a hyphenated compound is its parts.
const tokens = (text) =>
  String(text)
    .replace(/§/g, ' Section ')
    .replace(/[’']s\b/g, '')
    .match(/[A-Za-z]+|\d+(?:[-.]\d+)*/g) || [];
// A rough root, so "evaluating" and "evaluation", or "decide" and "deciding", count as one word.
const SUFFIX = /(ations?|ions?|ments?|ings?|ies|ed|es|s|e|y)$/;
const rootOf = (word) =>
  word
    .toLowerCase()
    .replace(SUFFIX, '')
    .replace(SUFFIX, '')
    .replace(/i$/, '')
    .replace(/(.)\1$/, '$1');
// The words of a paraphrase that are in neither its linked sentences nor its question, and the numbers and
// names that are not in the linked sentences (a name may also come from the question).
export function strangers(entry) {
  const linked = [...entry.from, ...(entry.context || [])].map((f) => f.text).join(' '),
    linkedTokens = tokens(linked),
    cueTokens = tokens(entry.cue),
    known = new Set([...linkedTokens, ...cueTokens].map(rootOf)),
    numbers = new Set(linkedTokens.filter((t) => /\d/.test(t))),
    names = new Set([...linkedTokens, ...cueTokens].filter((t) => /^[A-Z]/.test(t)));
  const own = new Set(),
    unsupported = new Set();
  for (const sentence of entry.say)
    tokens(sentence).forEach((token, at) => {
      if (/\d/.test(token)) {
        if (!numbers.has(token)) unsupported.add(token);
        return;
      }
      const lower = token.toLowerCase();
      if (/^[A-Z]/.test(token) && at > 0 && !names.has(token) && !PLAIN.has(lower)) {
        unsupported.add(token);
        return;
      }
      if (!PLAIN.has(lower) && !known.has(rootOf(token))) own.add(lower);
    });
  return { own: [...own].sort(), unsupported: [...unsupported].sort() };
}

// What the page reads: for each answer its kind, its sentences, and where in the episode it rests.
export function moduleText(data) {
  const answers = {};
  for (const [id, episodes] of Object.entries(data.answers)) {
    answers[id] = {};
    for (const [section, entry] of Object.entries(episodes))
      answers[id][section] = {
        kind: entry.kind,
        say: entry.say,
        from: entry.from.map(({ p, text }) => ({ p, text })),
      };
  }
  return `/* Direct answers for Cold Call rehearsal. Written by tools/cold-call/answers.mjs --write from
   tools/cold-call/answers.json; do not edit by hand. \`kind\` is "verbatim" (the answer is sentences of its
   episode, word for word) or "paraphrase" (tightened wording, shown under the label "Answer"). \`from\` is
   the passage the answer rests on: the paragraph of its own episode (counted from 0) and the sentence. The
   reader shows no answer whose passage it cannot find in the episode. */
window.DKLAColdCallAnswers = ${JSON.stringify({ schemaVersion: data.schemaVersion, answers }, null, 2)};
`;
}
// Every problem with the stored answers, as sentences a person can act on.
export function problems(data, cases = narratives()) {
  const found = [];
  if (data.schemaVersion !== SCHEMA) found.push(`answers.json: schemaVersion is not ${SCHEMA}`);
  for (const [id, episodes] of Object.entries(data.answers || {})) {
    const account = cases.get(id);
    if (!account) {
      found.push(`${id}: no such Cold Call`);
      continue;
    }
    for (const [sectionId, entry] of Object.entries(episodes)) {
      const where = `${id} ${sectionId}`,
        section = account.sections.find((s) => s.id === sectionId);
      if (!section) {
        found.push(`${where}: no such episode`);
        continue;
      }
      if (entry.cue !== section.cue)
        found.push(`${where}: the question has changed since this answer was stored`);
      if (!isQuestion(section.cue)) found.push(`${where}: the cue is not a question`);
      if (!KINDS.includes(entry.kind)) {
        found.push(`${where}: kind must be "verbatim" or "paraphrase"`);
        continue;
      }
      const say = entry.say,
        most = entry.kind === 'verbatim' ? MAX_VERBATIM : MAX_PARAPHRASE;
      if (
        !Array.isArray(say) ||
        !say.length ||
        say.length > most ||
        say.some((s) => typeof s !== 'string' || !squash(s))
      ) {
        found.push(`${where}: a ${entry.kind} answer is one to ${most} sentences`);
        continue;
      }
      if (new Set(say.map(squash)).size !== say.length) found.push(`${where}: a sentence is stored twice`);
      // The link: sentences of this episode, by paragraph and sentence, each still what was linked.
      const from = entry.from,
        sentences = paragraphSentences(section);
      if (!Array.isArray(from) || !from.length || from.length > MAX_LINKED) {
        found.push(`${where}: an answer is linked to one to ${MAX_LINKED} sentences of its episode`);
        continue;
      }
      let linkHolds = true,
        before = -1;
      for (const link of from) {
        const there = sentences[link?.p]?.[link?.s];
        if (!Number.isInteger(link?.p) || !Number.isInteger(link?.s) || there === undefined) {
          found.push(
            `${where}: the link names paragraph ${link?.p}, sentence ${link?.s}, which is not there`,
          );
          linkHolds = false;
          continue;
        }
        if (there !== link.text) {
          found.push(
            `${where}: paragraph ${link.p}, sentence ${link.s} is no longer the sentence that was linked ("${String(link.text).slice(0, 50)}…")`,
          );
          linkHolds = false;
        }
        const place = link.p * 1000 + link.s;
        if (place <= before) found.push(`${where}: the linked sentences are out of order or repeated`);
        before = place;
      }
      // Context: sentences of other episodes of the same case, each still what was named.
      const context = entry.context || [];
      if (!Array.isArray(context) || context.length > MAX_CONTEXT)
        found.push(`${where}: at most ${MAX_CONTEXT} context sentences`);
      else
        for (const link of context) {
          const other = account.sections.find((s) => s.id === link?.episode),
            there = other && paragraphSentences(other)[link.p]?.[link.s];
          if (!other || other === section) {
            found.push(`${where}: a context sentence names another episode of the same case`);
            linkHolds = false;
          } else if (there !== link.text) {
            found.push(
              `${where}: ${link.episode}, paragraph ${link.p}, sentence ${link.s} is not the context sentence that was named`,
            );
            linkHolds = false;
          }
        }
      if (!linkHolds) continue;
      if (entry.kind === 'verbatim') {
        if (say.map(squash).join(' ') !== from.map((link) => link.text).join(' '))
          found.push(`${where}: a verbatim answer must be exactly its linked sentences`);
        continue;
      }
      // A paraphrase.
      if (squash(say.join(' ')) === from.map((link) => link.text).join(' '))
        found.push(`${where}: the answer is its linked sentences word for word: record it as verbatim`);
      for (const sentence of say)
        if (!/[.!?]["”’)]*$/.test(squash(sentence)))
          found.push(`${where}: "${squash(sentence).slice(0, 50)}…" does not end as a sentence`);
      const { own, unsupported } = strangers(entry);
      if (unsupported.length)
        found.push(
          `${where}: ${unsupported.join(', ')} ${unsupported.length > 1 ? 'are' : 'is'} in the answer but not in the linked sentences (a number, a section or a name cannot be added)`,
        );
      const declared = [...(entry.ownWords || [])].sort();
      if (JSON.stringify(own) !== JSON.stringify(declared))
        found.push(
          `${where}: the answer's own words are [${own.join(', ')}] but ownWords lists [${declared.join(', ')}] (a word in neither the linked sentences nor the question must be listed, and read)`,
        );
      if (!squash(entry.checked || ''))
        found.push(
          `${where}: a paraphrase needs \`checked\`: how it was checked after it was written, and by whom`,
        );
    }
  }
  return found;
}
// The questions with no stored answer.
function todo(data, cases) {
  const rows = [];
  for (const account of cases.values())
    account.sections.forEach((section) => {
      if (!isQuestion(section.cue) || data.answers?.[account.id]?.[section.id]) return;
      rows.push({
        case: account.id,
        title: account.title,
        section: section.id,
        cue: section.cue,
        sentences: sentencesOf(section).map((text, n) => `${n + 1}. ${text}`),
        pick: [],
      });
    });
  return rows;
}
// What a second reader is given: nothing of the writer's reasoning, only the question, the answer, the
// sentences it is linked to, and the episode they come from.
function reviewPacket(data, cases, only) {
  const parts = [];
  for (const [id, episodes] of Object.entries(data.answers))
    for (const [sectionId, entry] of Object.entries(episodes)) {
      if (only && !only.includes(`${id}:${sectionId}`)) continue;
      const account = cases.get(id),
        section = account.sections.find((s) => s.id === sectionId);
      parts.push(
        [
          `## ${id} ${sectionId} (${entry.kind})`,
          `Case: ${account.title}`,
          `Question: ${section.cue}`,
          `Answer: ${entry.say.join(' ')}`,
          `Linked sentences:`,
          ...entry.from.map((link) => `- [paragraph ${link.p}, sentence ${link.s}] ${link.text}`),
          ...(entry.context?.length
            ? [
                `Context sentences, from other episodes of the same case (they fix what a word refers to):`,
                ...entry.context.map(
                  (link) => `- [${link.episode}, paragraph ${link.p}, sentence ${link.s}] ${link.text}`,
                ),
              ]
            : []),
          `The whole episode ("${section.title}"):`,
          ...section.paragraphs.map((paragraph, p) => `  (${p}) ${squash(paragraph)}`),
        ].join('\n'),
      );
    }
  return parts.join('\n\n') + '\n';
}

const args = process.argv.slice(2);
const arg = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const count = (data) => Object.values(data.answers).reduce((n, e) => n + Object.keys(e).length, 0);
if (args.includes('--write')) {
  const data = read();
  assert.deepEqual(problems(data), [], 'answers.json has problems; nothing written');
  fs.writeFileSync(MODULE, moduleText(data));
  console.log(`Wrote ${path.relative(root, MODULE)}.`);
} else if (args.includes('--own')) {
  const data = read();
  for (const [id, episodes] of Object.entries(data.answers))
    for (const [sectionId, entry] of Object.entries(episodes))
      if (entry.kind === 'paraphrase') console.log(`${id} ${sectionId}: ${JSON.stringify(strangers(entry))}`);
} else if (args.includes('--review')) {
  const only = arg('--only')?.split(','),
    packet = reviewPacket(read(), narratives(), only),
    file = arg('--review');
  if (file && !file.startsWith('--')) fs.writeFileSync(file, packet);
  else process.stdout.write(packet);
} else if (args.includes('--todo')) {
  const data = read(),
    cases = narratives(),
    rows = todo(data, cases),
    words = rows.reduce((n, row) => n + row.sentences.join(' ').split(/\s+/).length, 0),
    all = [...cases.values()].flatMap((c) => c.sections);
  const file = arg('--todo');
  if (file && !file.startsWith('--'))
    fs.writeFileSync(file, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
  console.log(
    JSON.stringify(
      {
        episodes: all.length,
        questions: all.filter((s) => isQuestion(s.cue)).length,
        otherPrompts: all.filter((s) => !isQuestion(s.cue)).length,
        answersStored: count(data),
        questionsWithoutAnAnswer: rows.length,
        inCases: new Set(rows.map((r) => r.case)).size,
        wordsOfNarrationToRead: words,
        sentencesToChooseFrom: rows.reduce((n, row) => n + row.sentences.length, 0),
        worksheet: file && !file.startsWith('--') ? file : null,
      },
      null,
      2,
    ),
  );
} else if (args.includes('--fill')) {
  const data = read(),
    cases = narratives(),
    by = arg('--by') || 'filled from a worksheet';
  let added = 0;
  for (const line of fs.readFileSync(arg('--fill'), 'utf8').split('\n').filter(Boolean)) {
    const row = JSON.parse(line);
    if (!Array.isArray(row.pick) || !row.pick.length) continue;
    const section = cases.get(row.case)?.sections.find((s) => s.id === row.section);
    assert.ok(section, `${row.case} ${row.section}: no such episode`);
    assert.equal(
      row.cue,
      section.cue,
      `${row.case} ${row.section}: the worksheet's question is not the episode's`,
    );
    const placed = placedSentences(section);
    const from = [...row.pick]
      .sort((a, b) => a - b)
      .map((n) => {
        assert.ok(
          Number.isInteger(n) && n >= 1 && n <= placed.length,
          `${row.case} ${row.section}: no sentence ${n}`,
        );
        return placed[n - 1];
      });
    // Sentences picked by number are the episode's own: a verbatim answer, linked to itself.
    (data.answers[row.case] ||= {})[row.section] = {
      cue: section.cue,
      kind: 'verbatim',
      say: from.map((link) => link.text),
      from,
      by,
    };
    added++;
  }
  assert.deepEqual(problems(data, cases), [], 'the filled answers have problems; nothing written');
  fs.writeFileSync(FILE, JSON.stringify(data, null, 1) + '\n');
  fs.writeFileSync(MODULE, moduleText(data));
  console.log(`Stored ${added} answers; wrote ${path.relative(root, MODULE)}.`);
} else {
  const data = read(),
    found = problems(data);
  assert.deepEqual(found, [], `Cold Call answers:\n  ${found.join('\n  ')}`);
  // The page's copy, run as the page runs it, holds exactly these answers (its layout is prettier's).
  const page = { window: {} };
  if (fs.existsSync(MODULE)) vm.runInNewContext(fs.readFileSync(MODULE, 'utf8'), page);
  const expected = { window: {} };
  vm.runInNewContext(moduleText(data), expected);
  assert.equal(
    JSON.stringify(page.window.DKLAColdCallAnswers),
    JSON.stringify(expected.window.DKLAColdCallAnswers),
    'src/features/v32/coldcall-answers.js is not what answers.json gives: run node tools/cold-call/answers.mjs --write',
  );
  const all = Object.values(data.answers).flatMap((e) => Object.values(e)),
    paraphrased = all.filter((e) => e.kind === 'paraphrase').length;
  console.log(
    `Cold Call answers: ${all.length} stored in ${Object.keys(data.answers).length} cases (${paraphrased} paraphrased, ${all.length - paraphrased} verbatim), each linked to sentences still found in its episode; the page's copy is current.`,
  );
}
