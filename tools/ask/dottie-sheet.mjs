/* Draws the Dottie Docket sprite sheet and one SVG per pose from the artwork
 * the app actually uses (src/features/ask/dottie.js), so the two cannot drift.
 *
 *   node tools/ask/dottie-sheet.mjs          writes docs/ask-mascot/
 *   node tools/ask/dottie-sheet.mjs --png    also renders the sheet as a PNG
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import { root } from '../runtime.mjs';

const source = await readFile(new URL('src/features/ask/dottie.js', `file://${root}/`), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox);
const dottie = sandbox.window.DKLADottie;
const out = new URL('docs/ask-mascot/', `file://${root}/`);
await mkdir(new URL('poses/', out), { recursive: true });

// Pose, option, label, where it appears, whether the app turns her to face left.
const cells = [
  ['face', undefined, 'Face', '“Ask Dottie” in Atlas search results', false],
  ['dangle', undefined, 'Hanging from the top bar', 'The Ask Dottie button, always on screen', false],
  ['curious', undefined, 'Curious', 'Empty dialog (one of four, at random)', true],
  ['bookmark', 0, 'Bookmark', 'Empty dialog, sometimes with joeys', true],
  ['hanging', undefined, 'Hanging around', 'Empty dialog', true],
  ['reading', undefined, 'Reading', 'Researching (changes every few seconds)', false],
  ['rummaging', undefined, 'Rummaging', 'Researching', false],
  ['fetching', undefined, 'Fetching', 'Researching', false],
  ['carrying', 1, 'Carrying the docket · 1', 'Answer citing one source', true],
  ['carrying', 2, 'Carrying the docket · 2', 'Answer citing two sources', true],
  ['carrying', 3, 'Carrying the docket · 3', 'Answer citing three or more', true],
  ['bookmark', 3, 'Bookmark with the docket', 'Answer: the other pose, same joey count', true],
  ['possum', undefined, 'Playing possum', 'No answer, offline, busy or broken', false],
];

const inner = (markup) => markup.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const boxOf = (markup) =>
  markup
    .match(/viewBox="([^"]+)"/)[1]
    .split(' ')
    .map(Number);
const esc = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

for (const [pose, option] of cells) {
  const markup = dottie.svg(pose, option);
  const name = option ? `${pose}-${option}` : pose;
  await writeFile(
    new URL(`poses/dottie-${name}.svg`, out),
    markup.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace(/ class="[^"]*"/, '') + '\n',
  );
}

const W = 1200;
const cw = 366;
const ch = 280;
const gap = 20;
const top = 150;
const ink = '#e6eeeb';
const soft = '#a9c1b8';
let body = '';
cells.forEach(([pose, option, label, where, flip], i) => {
  const x = 30 + (i % 3) * (cw + gap);
  const y = top + Math.floor(i / 3) * (ch + gap);
  const markup = dottie.svg(pose, option);
  const [bx, by, bw, bh] = boxOf(markup);
  const small = pose === 'face';
  // Drawn 15% larger than the first sheet, matching the app.
  const fw = small ? 138 : 322;
  const fh = Math.min(184, (fw * bh) / bw);
  const fx = x + (cw - fw) / 2;
  const fy = y + 18 + (184 - fh) / 2;
  const art = inner(markup);
  const flipped = flip ? `<g transform="translate(${bx * 2 + bw} 0) scale(-1 1)">${art}</g>` : art;
  body += `
  <g>
    <rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="16" fill="#172b29" stroke="#38524b"/>
    <svg x="${fx}" y="${fy}" width="${fw}" height="${fh}" viewBox="${bx} ${by} ${bw} ${bh}" overflow="visible">${flipped}</svg>
    ${small ? `<svg x="${x + cw - 56}" y="${y + 18}" width="28" height="28" viewBox="0 0 32 32">${art}</svg><text x="${x + cw - 42}" y="${y + 60}" text-anchor="middle" fill="${soft}" font-size="10">28 px</text>` : ''}
    <text x="${x + 18}" y="${y + ch - 42}" fill="${ink}" font-size="16" font-weight="700">${esc(label)}</text>
    <text x="${x + 18}" y="${y + ch - 20}" fill="${soft}" font-size="13">${esc(where)}</text>
  </g>`;
});

const palette = [
  ['#c9cfcc', 'Fur'],
  ['#f6f2e9', 'Face'],
  ['#4b5856', 'Ears'],
  ['#727f7c', 'Legs'],
  ['#ecc9c3', 'Tail'],
  ['#f08f9e', 'Nose'],
  ['#a6e0c8', 'Ask mint'],
  ['#d9b877', 'Folder'],
];
const py = top + Math.ceil((cells.length + 1) / 3) * (ch + gap) + 10;
const swatches = palette
  .map(
    ([color, name], i) =>
      `<circle cx="${48 + i * 74}" cy="${py + 40}" r="16" fill="${color}" stroke="#0d1716"/><text x="${48 + i * 74}" y="${py + 76}" text-anchor="middle" fill="${soft}" font-size="11">${name}</text>`,
  )
  .join('');
const curious = dottie.svg('curious');
const [sx, sy, sw, sh] = boxOf(curious);
// The silhouette test fills the ninth slot of the grid.
const lx = 30 + (cells.length % 3) * (cw + gap);
const ly = top + Math.floor(cells.length / 3) * (ch + gap);
const lw = 322;
const lh = Math.min(184, (lw * sh) / sw);
const silhouette = `<rect x="${lx}" y="${ly}" width="${cw}" height="${ch}" rx="16" fill="#172b29" stroke="#38524b"/>
  <svg x="${lx + (cw - lw) / 2}" y="${ly + 18 + (184 - lh) / 2}" width="${lw}" height="${lh}" viewBox="${sx} ${sy} ${sw} ${sh}"><g filter="url(#silhouette)" transform="translate(${sx * 2 + sw} 0) scale(-1 1)">${inner(curious)}</g></svg>
  <text x="${lx + 18}" y="${ly + ch - 42}" fill="${ink}" font-size="16" font-weight="700">Silhouette test</text>
  <text x="${lx + 18}" y="${ly + ch - 20}" fill="${soft}" font-size="13">Even in one flat colour, the tail reads as a “?”</text>`;

const H = py + 100;
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Inter, system-ui, sans-serif">
  <defs><filter id="silhouette"><feFlood flood-color="#e6eeeb"/><feComposite operator="in" in2="SourceAlpha"/></filter></defs>
  <rect width="${W}" height="${H}" fill="#12201f"/>
  <text x="30" y="62" fill="${ink}" font-size="34" font-weight="800">Dottie Docket</text>
  <text x="30" y="92" fill="#a5dfcb" font-size="13" font-weight="700" letter-spacing="2">THE OPOSSUM BEHIND ASK DOTTIE · SPRITE SHEET</text>
  <text x="30" y="122" fill="${soft}" font-size="14">A docket is the list of cases a court carries. Dottie carries hers on her back: one joey for each source an answer cites.</text>
  ${body}
  ${swatches}
  ${silhouette}
</svg>
`;
await writeFile(new URL('dottie-sprite-sheet.svg', out), sheet);
console.log(`Dottie sprite sheet: ${cells.length} poses written to docs/ask-mascot/.`);

/* The spinner's run as a Muybridge plate: one opossum in strict side profile at the bottom of her
 * ring, 12 phases of one stride in a 4 x 3 grid read left to right, each numbered in its lower-left
 * corner, over a measured ground; under it, the footfalls as a gait diagram (after Hildebrand).
 * Every phase is drawn by the spinner's own rig at one of its own poses (DKLADottie.run.frame). */
const run = dottie.run;
const PHASES = 12;
const Z = 6; // sheet units per spinner unit
const fw = 84 * Z; // frame: 84 x 40 spinner units
const fh = 40 * Z;
const fgap = 14;
const margin = 40;
const plateTop = 128;
const rows = PHASES / 4;
const TW = margin * 2 + 4 * fw + 3 * fgap;
const gaitTop = plateTop + rows * fh + (rows - 1) * fgap + 46;
const TH = gaitTop + 4 * 22 + 118;
const sepia = {
  paper: '#f1e8d4',
  back: '#ddcdaa',
  fine: '#bfa982',
  heavy: '#8c7752',
  ink: '#2e2418',
  soft: '#6b5a40',
};
const strideDeg = 360 / run.strides;
// Phase j (1 to 12) is pose 2j - 1 of the 24: the odd poses hold both moments in the air.
const poseOf = (j) => 2 * j - 1;
let frames = '';
for (let j = 1; j <= PHASES; j++) {
  const k = poseOf(j);
  const x = margin + ((j - 1) % 4) * (fw + fgap);
  const y = plateTop + Math.floor((j - 1) / 4) * (fh + fgap);
  // The centre of the ring: above the frame, so its lowest stretch is the ground she runs on.
  const ox = x + fw / 2 + 4 * Z;
  const oy = y + fh - (run.ground + 3) * Z;
  // The ground is fixed and she runs forward, so in her frame it turns back (clockwise here) by
  // one stride of angle per stride: a planted paw keeps its line from phase to phase. Half a
  // stride is 18 degrees, so the heavier lines come round to the same places every half stride.
  const turned = (k / run.keys) * strideDeg;
  let grid = '';
  for (let a = -72; a <= 72; a += 6) {
    const heavy = a % 18 === 0;
    grid += `<path d="M0 ${run.ground - 30}V${run.ground + 3}" transform="rotate(${+(a + (turned % 18)).toFixed(3)})" stroke="${heavy ? sepia.heavy : sepia.fine}" stroke-width="${heavy ? 0.2 : 0.1}"/>`;
  }
  for (let up = 10; up <= 30; up += 10)
    grid += `<circle r="${run.ground - up}" fill="none" stroke="${sepia.fine}" stroke-width=".1"/>`;
  frames += `
  <g>
    <clipPath id="run-frame-${j}"><rect x="${x}" y="${y}" width="${fw}" height="${fh}"/></clipPath>
    <g clip-path="url(#run-frame-${j})">
      <rect x="${x}" y="${y}" width="${fw}" height="${fh}" fill="${sepia.back}"/>
      <g transform="translate(${ox} ${oy}) scale(${Z})">
        ${grid}
        <circle r="${run.ground + 0.25}" fill="none" stroke="${sepia.ink}" stroke-width=".5"/>
        ${run.frame(k / run.keys)}
      </g>
    </g>
    <rect x="${x}" y="${y}" width="${fw}" height="${fh}" fill="none" stroke="${sepia.ink}" stroke-width="1.5"/>
    <rect x="${x + 6}" y="${y + fh - 22}" width="${j > 9 ? 24 : 16}" height="16" fill="${sepia.paper}" opacity=".85"/>
    <text x="${x + (j > 9 ? 18 : 14)}" y="${y + fh - 10}" text-anchor="middle" fill="${sepia.ink}" font-size="12">${j}</text>
  </g>`;
}
// The gait diagram: a bar for each foot while it is on the ground, across one stride.
const feet = [
  ['nh', 'Near (right) hind'],
  ['ff', 'Far (left) fore'],
  ['fh', 'Far (left) hind'],
  ['nf', 'Near (right) fore'],
];
const gx = margin + 150;
const gw = TW - margin - gx;
const cell = gw / run.keys;
let gait = '';
feet.forEach(([id, label], row) => {
  const [down, stay] = run.feet[id];
  const y = gaitTop + row * 22;
  gait += `<text x="${margin}" y="${y + 13}" fill="${sepia.ink}" font-size="13">${label}</text>
    <rect x="${gx}" y="${y + 2}" width="${gw}" height="14" fill="${sepia.back}"/>
    <rect x="${gx + down * cell}" y="${y + 2}" width="${stay * cell}" height="14" fill="${sepia.ink}"/>`;
});
for (let j = 1; j <= PHASES; j++) {
  const x = gx + poseOf(j) * cell;
  gait += `<path d="M${x} ${gaitTop - 4}V${gaitTop + 4 * 22 - 2}" stroke="${sepia.heavy}" stroke-width=".6" stroke-dasharray="2 3"/>
    <text x="${x}" y="${gaitTop - 9}" text-anchor="middle" fill="${sepia.soft}" font-size="11">${j}</text>`;
}
const stepMs = Math.round((2 * run.ms) / run.keys);
const plate = `<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}" viewBox="0 0 ${TW} ${TH}" font-family="Georgia, 'Times New Roman', serif">
  <rect width="${TW}" height="${TH}" fill="${sepia.paper}"/>
  <text x="${margin}" y="60" fill="${sepia.ink}" font-size="30"><tspan font-style="italic">Didelphis virginiana</tspan> — a running trot. ${PHASES} phases, ${stepMs} ms apart.</text>
  <text x="${margin}" y="94" fill="${sepia.soft}" font-size="15">Dottie Docket in the Ask Dottie thinking spinner. One stride, ${run.ms} ms: near hind with far fore (phases 1 to 5), then far hind with near fore (7 to 11); all four feet off the ground in phases 6 and 12.</text>
  ${frames}
  <text x="${margin}" y="${gaitTop - 26}" fill="${sepia.soft}" font-size="14">Footfalls across the stride: a bar while a foot is on the ground. Each is down for ${run.feet.nh[1]} of the rig’s ${run.keys} poses; a fore foot lands one pose after its diagonal hind foot.</text>
  ${gait}
  <text x="${margin}" y="${TH - 62}" fill="${sepia.soft}" font-size="14">She runs inside a ring, as in the spinner; its lowest stretch is the ground. Lines every 6° of track (4.7 px of the 96 px spinner), heavier every 18° (half a stride); arcs every 10 px above the ground.</text>
  <text x="${margin}" y="${TH - 40}" fill="${sepia.soft}" font-size="14">The grid is fixed to the ground and turns back 3° a phase as she runs, so a planted paw keeps its line. The far-side (left) legs are darker.</text>
  <text x="${margin}" y="${TH - 18}" fill="${sepia.soft}" font-size="14">Drawn by the spinner’s own rig (src/features/ask/dottie.js, posed by tools/ask/run-cycle.mjs) with tools/ask/dottie-sheet.mjs.</text>
</svg>
`;
await writeFile(new URL('possum-trot.svg', out), plate);
console.log('Possum trot sheet written to docs/ask-mascot/possum-trot.svg.');

if (process.argv.includes('--png')) {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch(
    process.env.DKLA_CHROMIUM ? { executablePath: process.env.DKLA_CHROMIUM } : {},
  );
  for (const [markup, width, height, name] of [
    [sheet, W, H, 'dottie-sprite-sheet.png'],
    [plate, TW, TH, 'possum-trot.png'],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: name === 'possum-trot.png' ? 1.5 : 2,
    });
    await page.setContent(`<body style="margin:0">${markup}</body>`);
    await page
      .locator('svg')
      .first()
      .screenshot({ path: new URL(name, out).pathname });
    await page.close();
  }
  await browser.close();
  console.log('Dottie sprite sheet and possum trot PNGs written.');
}
