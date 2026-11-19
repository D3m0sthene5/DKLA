/* Print the table of one result of tools/feel/measure.mjs, or compare two (before, after).

     node tools/feel/report.mjs work/feel/result.json
     node tools/feel/report.mjs work/feel/result-before.json work/feel/result-after.json
     node tools/feel/report.mjs work/feel/result.json --detail "case: open by route"   (scripts, motion, shifts of one row)

   In a comparison each cell is "before → after"; a row is marked ▲ (slower) or ▼ (faster) when its main
   number moved by more than 20% and by more than 8 ms. */
import fs from 'node:fs';
const argv = process.argv.slice(2);
const files = argv.filter((a) => a.endsWith('.json'));
const detail = argv.includes('--detail') ? argv[argv.indexOf('--detail') + 1] : null;
const [A, B] = files.map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const n = (v, d = 0) => (v == null || Number.isNaN(v) ? '–' : typeof v === 'number' ? v.toFixed(d) : String(v));
const cell = (a, b, d = 0, w = 7) => (B ? `${n(a, d)}→${n(b, d)}` : n(a, d)).padStart(B ? w * 2 : w);
const COLS = [
  ['evt→paint', 'eventToPaint'],
  ['result', 'resultPainted'],
  ['1stMove', 'firstChange'],
  ['maxFrame', 'frameMax'],
  ['>20ms%', 'over20', 100],
  ['>50ms%', 'over50', 100],
  ['upd/s', 'updatesPerSecond'],
  ['script', 'scriptMs'],
  ['layouts', 'layouts'],
  ['forced', 'forcedLayout'],
  ['shift', 'shiftNoInput', 1, 3],
  ['settle', 'lastMutation'],
];
const START = ['firstPaint', 'atlasShown', 'searchIndexReady', 'backgroundDataDone', 'blockingBeforeShown', 'longestTaskBeforeShown', 'blockingAfterShown', 'longestTaskAfterShown', 'longTasksAfterShown', 'jsonParseBeforeShown'];
const IDLE = ['scriptMsPerSecond', 'taskMsPerSecond', 'layoutsPerSecond', 'styleRecalcsPerSecond', 'callbacksPerSecond', 'mapDrawsPerSecond', 'endlessAnimations'];
for (const profile of Object.keys(A.profiles)) {
  const P = A.profiles[profile],
    Q = B?.profiles[profile] || {};
  if (detail) {
    for (const [key, r] of Object.entries(P)) if (key.includes(detail)) console.log(profile, key, JSON.stringify(r, null, 1));
    continue;
  }
  console.log(`\n== ${profile} ==`);
  for (const [key, r] of Object.entries(P).filter(([k]) => k.startsWith('start-up'))) {
    console.log(key);
    for (const f of START) console.log('   ' + f.padEnd(26) + cell(r[f], Q[key]?.[f]));
  }
  const rows = Object.entries(P).filter(([, r]) => 'frameMax' in r && !('scriptMsPerSecond' in r));
  if (rows.length) console.log('interaction'.padEnd(50) + COLS.map(([h]) => h.padStart(B ? 14 : 9)).join(''));
  for (const [key, r] of rows) {
    const q = Q[key] || {};
    const main = (x) => x.resultPainted ?? x.eventToPaint ?? x.frameMax;
    const mark = B && main(r) != null && main(q) != null && Math.abs(main(q) - main(r)) > 8 && Math.abs(main(q) / main(r) - 1) > 0.2 ? (main(q) > main(r) ? ' ▲' : ' ▼') : '';
    console.log(key.slice(0, 49).padEnd(50) + COLS.map(([, f, mul = 1, d = 0]) => cell(r[f] == null ? null : r[f] * mul, q[f] == null ? null : q[f] * mul, d, B ? 7 : 9)).join('') + mark);
  }
  const idle = Object.entries(P).filter(([, r]) => 'scriptMsPerSecond' in r);
  for (const [key, r] of idle) console.log(key.padEnd(44) + IDLE.map((f) => `${f.replace('PerSecond', '/s')} ${cell(r[f], Q[key]?.[f], 1, 1).trim()}`).join('  '));
  for (const key of ['map: element counts', 'case: element counts', 'observers and timers', 'Rules & authorities: title page', 'page errors'])
    if (P[key]) console.log(key + ': ' + JSON.stringify({ ...P[key], detail: undefined, range: undefined, runs: undefined }));
}
if (A.styles && !detail) {
  const s = { ...A.styles, detail: undefined, range: undefined };
  console.log('\n== styling ==\n' + JSON.stringify(s, null, 1));
}
if (A.attribution && argv.includes('--cpu'))
  for (const [key, cpu] of Object.entries(A.attribution)) {
    console.log('\n' + key);
    for (const kind of ['byFile', 'inclusive', 'selfTime']) console.log(' ' + kind + '\n' + cpu[kind].map((x) => `   ${String(x.ms).padStart(7)} ms  ${x.what}`).join('\n'));
  }
