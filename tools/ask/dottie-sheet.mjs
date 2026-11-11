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
  ['face', undefined, 'Face', '“Ask Dottie” launcher in Atlas search', false],
  ['curious', undefined, 'Curious', 'Empty dialog, beside “Try a question”', true],
  ['reading', undefined, 'Concentrating', 'While Ask Dottie researches', false],
  ['carrying', 1, 'Carrying the docket · 1', 'Answer citing one source', true],
  ['carrying', 2, 'Carrying the docket · 2', 'Answer citing two sources', true],
  ['carrying', 3, 'Carrying the docket · 3', 'Answer citing three or more', true],
  ['quiet', undefined, 'Evidence runs out', 'Sources did not establish an answer', false],
  ['possum', undefined, 'Playing possum', 'Offline, busy or unavailable', false],
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
const py = top + 3 * (ch + gap) + 10;
const swatches = palette
  .map(
    ([color, name], i) =>
      `<circle cx="${48 + i * 74}" cy="${py + 40}" r="16" fill="${color}" stroke="#0d1716"/><text x="${48 + i * 74}" y="${py + 76}" text-anchor="middle" fill="${soft}" font-size="11">${name}</text>`,
  )
  .join('');
const curious = dottie.svg('curious');
const [sx, sy, sw, sh] = boxOf(curious);
// The silhouette test fills the ninth slot of the grid.
const lx = 30 + 2 * (cw + gap);
const ly = top + 2 * (ch + gap);
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

if (process.argv.includes('--png')) {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch(
    process.env.DKLA_CHROMIUM ? { executablePath: process.env.DKLA_CHROMIUM } : {},
  );
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  await page.setContent(`<body style="margin:0">${sheet}</body>`);
  await page
    .locator('svg')
    .first()
    .screenshot({ path: new URL('dottie-sprite-sheet.png', out).pathname });
  await browser.close();
  console.log('Dottie sprite sheet PNG written.');
}
