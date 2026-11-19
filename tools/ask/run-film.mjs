/* Pictures of the Ask Dottie spinner's run, taken from the browser's own animation.

     node tools/ask/run-film.mjs [folder]       default: work/dottie-film/

   filmstrip.png   one stride at 16 evenly spaced instants, 8x, the camera following one opossum
                   (each instant is set through the animations' currentTime, so this is what the
                   browser draws between the rig's poses, not the poses themselves)
   1x.png 2x.png 4x.png   the whole spinner at its real 96 px at four moments, at three screen densities
   standing.png    the reduced-motion pose, 4x

   An animator reads the filmstrip for: a clear silhouette in every frame, no frame where the legs
   merge, the four positions of each half stride (contact, down, passing, up), smooth arcs. */
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { chromium } from '@playwright/test';
import { root } from '../runtime.mjs';
import { mount, openBare } from './spinner-page.mjs';

const out = path.resolve(process.argv[2] ?? path.join(root, 'work/dottie-film'));
await mkdir(out, { recursive: true });
const scratch = path.join(os.tmpdir(), `dottie-film-${process.pid}`);
await mkdir(scratch, { recursive: true });
const browser = await chromium.launch();
const SIZE = 96;

async function open(scale, reducedMotion = 'no-preference') {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 400 },
    deviceScaleFactor: scale,
    reducedMotion,
  });
  const page = await openBare(context);
  // No fade as she appears, so the first picture is not faint.
  await page.addStyleTag({ content: '#dklaAskDialog .ask-dottie{animation:none}' });
  await mount(page);
  if (reducedMotion === 'no-preference')
    await page.waitForFunction(() =>
      document.getAnimations().some((a) => a.effect.getTiming().iterations === Infinity),
    );
  return { context, page };
}
// Hold every animation at one instant of the laps.
const hold = (page, ms) =>
  page.evaluate((ms) => {
    for (const animation of document.getAnimations()) {
      animation.pause();
      animation.currentTime = ms;
    }
  }, ms);
// Several pictures side by side as one.
async function sheet(files, file, { columns = files.length, width = null, numbered = false } = {}) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
  let cells = '';
  for (const [i, name] of files.entries())
    cells += `<figure><img src="data:image/png;base64,${(await readFile(name)).toString('base64')}"${width ? ` width="${width}"` : ''}>${numbered ? `<figcaption>${i + 1}</figcaption>` : ''}</figure>`;
  await page.setContent(
    `<style>body{margin:0;background:#152423}#g{display:grid;grid-template-columns:repeat(${columns},max-content);gap:4px;padding:8px;width:max-content}figure{margin:0;position:relative;outline:1px solid #26403b}img{display:block}figcaption{position:absolute;left:6px;top:4px;font:13px monospace;color:#9bb}</style><div id="g">${cells}</div>`,
  );
  await page.locator('#g').screenshot({ path: file });
  await page.close();
}

// ---------- the filmstrip ----------
{
  const { context, page } = await open(8);
  const run = await page.evaluate(() => {
    const { ms, strides, lap } = window.DKLADottie.run;
    return { ms, strides, lap };
  });
  const box = await page.locator('.dottie-spinner').boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const unit = SIZE / 100;
  const files = [];
  for (let i = 0; i < 16; i++) {
    const at = run.lap + (i / 16) * run.ms;
    await hold(page, at);
    // Turn the spinner back by the ring's own turn, so the same opossum stays at the bottom.
    await page.evaluate(
      (turn) => (document.querySelector('.ask-dottie').style.transform = `rotate(${turn}deg)`),
      (360 / run.strides) * (1 + at / run.ms),
    );
    const file = path.join(scratch, `film-${i}.png`);
    await page.screenshot({
      path: file,
      clip: { x: cx - 47 * unit, y: cy + 8 * unit, width: 84 * unit, height: 42 * unit },
    });
    files.push(file);
  }
  await context.close();
  await sheet(files, path.join(out, 'filmstrip.png'), { columns: 4, width: 452, numbered: true });
}

// ---------- real size ----------
for (const scale of [1, 2, 4]) {
  const { context, page } = await open(scale);
  const run = await page.evaluate(() => ({ ms: window.DKLADottie.run.ms, lap: window.DKLADottie.run.lap }));
  const box = await page.locator('.dottie-spinner').boundingBox();
  const files = [];
  for (let i = 0; i < 4; i++) {
    await hold(page, run.lap + run.ms * (i * 0.27) + i * 613);
    const file = path.join(scratch, `real-${scale}-${i}.png`);
    await page.screenshot({
      path: file,
      clip: { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 16 },
    });
    files.push(file);
  }
  await context.close();
  await sheet(files, path.join(out, `${scale}x.png`));
}

// ---------- standing (reduced motion) ----------
{
  const { context, page } = await open(4, 'reduce');
  await page.addStyleTag({
    content: '#dklaAskDialog .ask-dottie .dottie-spinner{animation:none !important}',
  });
  const box = await page.locator('.dottie-spinner').boundingBox();
  await page.screenshot({
    path: path.join(out, 'standing.png'),
    clip: { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 16 },
  });
  await context.close();
}

await browser.close();
console.log(`Spinner pictures written to ${out}: filmstrip.png, 1x.png, 2x.png, 4x.png, standing.png.`);
