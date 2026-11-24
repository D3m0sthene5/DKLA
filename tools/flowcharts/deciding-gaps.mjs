/* Which forks have nothing stored that helps choose between their answers?

     node tools/flowcharts/deciding-gaps.mjs <folder>     (writes flowchart-deciding-gaps.md and .json there)

   Under an answer the walkthrough shows the opening sentence of the stored explanation of the step
   that answer leads to, when that sentence states something (a fact, a holding, a condition) and
   not when it tells the reader what to do next (an instruction belongs at the step itself). The
   rule is the one in src/features/flowcharts/flowcharts.js (INSTRUCTION and opening there); the
   browser check compares the two on a sample. This writes, for the owner's content audit, every
   fork where two or more answers have no such sentence: the stored material cannot tell those
   answers apart. Nothing here proposes wording. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url);
const charts = ['contracts', 'civil', 'lrs'].flatMap((name) =>
  JSON.parse(readFileSync(new URL(`tools/flowcharts/data/${name}.json`, root), 'utf8')),
);
export const INSTRUCTION =
  /^(?:Identify|Apply|Check|Use|Consider|Read|Compare|Specify|Assess|Confirm|Test|Ask|Define|Examine|Give|Distinguish|Look|Tie|Enforce|Address|Evaluate|Measure|Explain|Determine|Award|Rely|Select|Require|Separate|Follow|Establish|Leave|Tailor|Complete|Return|Try|Weigh|Allow|Show|Verify|Cite|Treat|Start|Begin|Find|Decide|Classify|Note|Keep|Stop|Proceed|Raise|Move|File|Plead|Calculate|Limit|Reject|Deny|Grant|Dismiss|Analyze|Describe|List|Locate|Match|Name|Preserve|Resolve|Review|Seek|Sort|Trace|Turn|Then|(?:State|Record|Order|Place) (?:the|each|which|whether|what|why|how|any|every|a|an)) /;
export const opening = (text) => String(text || '').split(/(?<=[.!?])\s+(?=[A-Z“"(§])/)[0];
export const deciding = (to) => {
  const first = opening(to.detail);
  return first && !INSTRUCTION.test(first) ? first : '';
};

// (Imported by the browser check for the rule alone; the packet is written only when run directly.)
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const forks = [];
  let all = 0,
    answers = 0,
    shown = 0;
  for (const chart of charts) {
    const byId = new Map(chart.nodes.map((node, index) => [node.id, { ...node, number: index + 1 }]));
    for (const node of byId.values()) {
      if (node.edges.length < 2) continue;
      all += 1;
      const list = node.edges.map((edge) => {
        const to = byId.get(edge.to);
        const sentence = deciding(to);
        answers += 1;
        if (sentence) shown += 1;
        return {
          answer: edge.label,
          leadsToStepId: to.id,
          leadsToChartStep: to.number,
          leadsToTitle: to.label,
          leadsToIsOutcome: !to.edges.length,
          sentenceShown: sentence || null,
          openingOfStoredExplanation: opening(to.detail),
          whyNotShown: sentence ? null : 'the stored explanation opens with an instruction (what to do next)',
        };
      });
      const without = list.filter((one) => !one.sentenceShown);
      if (without.length < 2) continue;
      forks.push({
        chartId: chart.id,
        chartTitle: chart.title,
        stepId: node.id,
        chartStep: node.number,
        question: node.label,
        storedExplanation: node.detail,
        sources: node.sources,
        answersWithNothingToTellThemApart: without.length,
        answersInAll: list.length,
        answers: list,
      });
    }
  }
  // The model case first, then the forks where most answers have nothing, the widest forks first.
  const model = (fork) => fork.chartId === 'LRS-15' && fork.stepId === 'order';
  forks.sort(
    (a, b) =>
      model(b) - model(a) ||
      b.answersWithNothingToTellThemApart - a.answersWithNothingToTellThemApart ||
      b.answersInAll - a.answersInAll ||
      a.chartId.localeCompare(b.chartId) ||
      a.chartStep - b.chartStep,
  );
  const folder = process.argv[2] || fileURLToPath(new URL('work/flowchart-gaps', root));
  mkdirSync(folder, { recursive: true });
  const summary = {
    forksInAll: all,
    answersInAll: answers,
    answersWithASentence: shown,
    forksListed: forks.length,
    rule: 'Under an answer, the opening sentence of the stored explanation of the step it leads to is shown when it states something and withheld when it is an instruction. A fork is listed when two or more of its answers have no sentence.',
  };
  writeFileSync(
    path.join(folder, 'flowchart-deciding-gaps.json'),
    JSON.stringify({ made: 'tools/flowcharts/deciding-gaps.mjs', summary, forks }, null, 2) + '\n',
  );
  const md = [
    '# Flowcharts: forks whose answers the stored material cannot tell apart',
    '',
    'For the content audit. Made by `tools/flowcharts/deciding-gaps.mjs` from `tools/flowcharts/data/*.json`; the full list with every field is `flowchart-deciding-gaps.json` beside this file.',
    '',
    '## What the owner asked for (Q5)',
    '',
    "\"Use deciding sentences from stored, supported material where they actually help distinguish the choices. At step 14, the valuable sentence would help me distinguish 'hearing in less specific terms' from 'no formal federal APA trigger.' A sentence explaining what to do after choosing belongs at the destination. Give the corpus audit a list of consequential gaps with chart and step IDs. It can prioritize the ambiguous forks.\"",
    '',
    '## What the app does now',
    '',
    `In the Walkthrough, under each answer, the app shows the opening sentence of the stored explanation of the step that answer leads to, but only when that sentence states something (a fact, a holding, a condition). When it is an instruction ("Identify...", "Apply...", "Check..."), nothing is shown: that sentence stays at the step it belongs to. Nothing is written or reworded by the app.`,
    '',
    `Of ${all} forks with ${answers} answers, ${shown} answers have such a sentence. ${forks.length} forks have two or more answers with none; those are listed here. What is missing for each is one stored sentence per answer saying WHEN that answer is the right one (the fact that decides it), with its source.`,
    '',
    '## The model case',
    '',
    ...forks.filter(model).flatMap(entry),
    'What is missing here, in the owner\'s words: something that distinguishes "hearing in less specific terms" from "no formal federal APA trigger". The one stored sentence that helps is the Marathon Oil example under the first of those; nothing stored says when a statute has no formal trigger at all.',
    '',
    '## The other forks, most ambiguous first',
    '',
    'Ordered by how many answers have nothing, then by how many answers the fork has. Record ids are chart id and step id.',
    '',
    '| # | Chart | Step id | Chart step | Question | Answers with nothing / all |',
    '|---|---|---|---|---|---|',
    ...forks
      .filter((fork) => !model(fork))
      .map(
        (fork, i) =>
          `| ${i + 1} | ${fork.chartId} | \`${fork.stepId}\` | ${fork.chartStep} | ${fork.question} | ${fork.answersWithNothingToTellThemApart} / ${fork.answersInAll} |`,
      ),
    '',
    '## The twelve most ambiguous, in full',
    '',
    ...forks
      .filter((fork) => !model(fork))
      .slice(0, 12)
      .flatMap(entry),
  ].join('\n');
  writeFileSync(path.join(folder, 'flowchart-deciding-gaps.md'), md + '\n');
  console.log(
    `${all} forks, ${answers} answers, ${shown} with a sentence; ${forks.length} forks listed in ${folder}/flowchart-deciding-gaps.{md,json}`,
  );

  function entry(fork) {
    return [
      `### ${fork.chartId}, step id \`${fork.stepId}\` (chart step ${fork.chartStep}): ${fork.question}`,
      '',
      `Chart: ${fork.chartTitle}`,
      '',
      `Stored explanation of the fork: "${fork.storedExplanation}"`,
      '',
      `Atlas entries the step cites: ${fork.sources.map((id) => '`' + id + '`').join(', ')}`,
      '',
      ...fork.answers.map(
        (one) =>
          `- **${one.answer}** → chart step ${one.leadsToChartStep} (\`${one.leadsToStepId}\`), "${one.leadsToTitle}". ${
            one.sentenceShown
              ? `Shown under it: "${one.sentenceShown}"`
              : `Nothing shown. The stored explanation there opens with an instruction: "${one.openingOfStoredExplanation}"`
          }`,
      ),
      '',
    ];
  }
}
