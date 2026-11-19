/* Direct answers for Cold Call rehearsal (tools/cold-call/answers.json).

   An episode's cue is the question a professor would ask. Its direct answer is the sentence or sentences of
   that episode's own paragraphs that answer it, word for word. This tool is the only way those answers reach
   the page, and it cannot add a fact: a stored sentence must be found, whole, in its episode.

     node tools/cold-call/answers.mjs            check answers.json and the copy the page reads
     node tools/cold-call/answers.mjs --write    write src/features/v32/coldcall-answers.js from answers.json
     node tools/cold-call/answers.mjs --todo [file.jsonl]
                                                 count the questions with no stored answer; with a file name,
                                                 write a worksheet: one line per question, its episode's
                                                 sentences numbered
     node tools/cold-call/answers.mjs --fill file.jsonl [--by "who, when"]
                                                 take the lines of a worksheet that carry "pick": [numbers]
                                                 and store those sentences (numbers only: nothing can be typed in)

   What --check holds, for every stored answer: the case and the episode exist; the stored cue is still the
   episode's cue and is a question; there are one to four sentences, none twice; each is in the episode's
   paragraphs, begins where a sentence begins and ends where one ends; and the page's copy is what --write
   would write. Reads source files only (tools/cold-call/narratives). */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = path.join(root, 'tools/cold-call/answers.json'),
  MODULE = path.join(root, 'src/features/v32/coldcall-answers.js'),
  NARRATIVES = path.join(root, 'tools/cold-call/narratives');
const MAX_SENTENCES = 4;
const squash = (text) => String(text).replace(/\s+/g, ' ').trim();
const isQuestion = (cue) => /\?["”’')\]]*\s*$/.test(cue || '');
const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
// The sentences of an episode: its paragraphs one after another, cut where a sentence ends.
export function sentencesOf(section) {
  return section.paragraphs.flatMap((paragraph) =>
    [...segmenter.segment(squash(paragraph))].map((part) => part.segment.trim()).filter(Boolean),
  );
}
function narratives() {
  const cases = new Map();
  for (const name of fs
    .readdirSync(NARRATIVES)
    .filter((f) => f.endsWith('.json'))
    .sort()) {
    const account = JSON.parse(fs.readFileSync(path.join(NARRATIVES, name), 'utf8'));
    if (account?.id && Array.isArray(account.sections)) cases.set(account.id, account);
  }
  return cases;
}
const read = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));
// What the page reads: the sentences alone, by case and episode.
export function moduleText(data) {
  const answers = {};
  for (const [id, episodes] of Object.entries(data.answers)) {
    answers[id] = {};
    for (const [section, entry] of Object.entries(episodes)) answers[id][section] = entry.say;
  }
  return `/* Direct answers for Cold Call rehearsal. Written by tools/cold-call/answers.mjs --write from
   tools/cold-call/answers.json; do not edit by hand. Each answer is sentences of its episode's own
   narration, word for word (the tool refuses anything else, and the reader shows none that it cannot
   find in the episode). */
window.DKLAColdCallAnswers = ${JSON.stringify({ schemaVersion: data.schemaVersion, answers }, null, 2)};
`;
}
// Every problem with the stored answers, as sentences a person can act on.
export function problems(data, cases = narratives()) {
  const found = [];
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
      const say = entry.say;
      if (!Array.isArray(say) || !say.length || say.length > MAX_SENTENCES) {
        found.push(`${where}: an answer is one to ${MAX_SENTENCES} sentences`);
        continue;
      }
      if (new Set(say.map(squash)).size !== say.length) found.push(`${where}: a sentence is stored twice`);
      const sentences = sentencesOf(section);
      for (const stored of say) {
        const wanted = squash(stored);
        // One whole sentence, or several that follow one another, exactly as the episode has them.
        let whole = false;
        for (let from = 0; from < sentences.length && !whole; from++)
          for (let to = from, joined = ''; to < sentences.length; to++) {
            joined = joined ? joined + ' ' + sentences[to] : sentences[to];
            if (joined === wanted) whole = true;
            if (joined.length >= wanted.length) break;
          }
        if (!whole)
          found.push(
            squash(section.paragraphs.join(' ')).includes(wanted)
              ? `${where}: "${wanted.slice(0, 60)}…" is part of a sentence, not a whole one`
              : `${where}: "${wanted.slice(0, 60)}…" is not in the episode`,
          );
      }
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

const args = process.argv.slice(2);
const arg = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
if (args.includes('--write')) {
  const data = read();
  assert.deepEqual(problems(data), [], 'answers.json has problems; nothing written');
  fs.writeFileSync(MODULE, moduleText(data));
  console.log(`Wrote ${path.relative(root, MODULE)}.`);
} else if (args.includes('--todo')) {
  const data = read(),
    cases = narratives(),
    rows = todo(data, cases),
    words = rows.reduce((n, row) => n + row.sentences.join(' ').split(/\s+/).length, 0),
    all = [...cases.values()].flatMap((c) => c.sections),
    stored = Object.values(data.answers).reduce((n, e) => n + Object.keys(e).length, 0);
  const file = arg('--todo');
  if (file && !file.startsWith('--'))
    fs.writeFileSync(file, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
  console.log(
    JSON.stringify(
      {
        episodes: all.length,
        questions: all.filter((s) => isQuestion(s.cue)).length,
        otherPrompts: all.filter((s) => !isQuestion(s.cue)).length,
        answersStored: stored,
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
    const sentences = sentencesOf(section);
    const say = row.pick.map((n) => {
      assert.ok(
        Number.isInteger(n) && n >= 1 && n <= sentences.length,
        `${row.case} ${row.section}: no sentence ${n}`,
      );
      return sentences[n - 1];
    });
    (data.answers[row.case] ||= {})[row.section] = { cue: section.cue, say, by };
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
  // The page's copy, run as the page runs it, holds exactly these sentences (its layout is prettier's).
  const page = { window: {} };
  if (fs.existsSync(MODULE)) vm.runInNewContext(fs.readFileSync(MODULE, 'utf8'), page);
  const expected = { window: {} };
  vm.runInNewContext(moduleText(data), expected);
  assert.equal(
    JSON.stringify(page.window.DKLAColdCallAnswers),
    JSON.stringify(expected.window.DKLAColdCallAnswers),
    'src/features/v32/coldcall-answers.js is not what answers.json gives: run node tools/cold-call/answers.mjs --write',
  );
  const n = Object.values(data.answers).reduce((sum, e) => sum + Object.keys(e).length, 0);
  console.log(
    `Cold Call answers: ${n} stored in ${Object.keys(data.answers).length} cases, each found whole in its episode; the page's copy is current.`,
  );
}
