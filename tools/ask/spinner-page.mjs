/* A bare page holding the Ask Dottie spinner: the app's own stylesheet (ask.css) and artwork
 * (dottie.js), straight from src/, and a row like the Ask dialog's progress line. No build is
 * needed, so the run can be looked at and measured in seconds (tools/ask/trot-browser.mjs --source,
 * tools/ask/run-film.mjs). */
import { readFile } from 'node:fs/promises';

const at = (file) => readFile(new URL(`../../src/features/ask/${file}`, import.meta.url), 'utf8');

export async function bare() {
  return `<!doctype html><meta charset="utf-8"><style>${await at('ask.css')}</style>
    <style>html,body{margin:0;background:#152423}#dklaAskDialog{position:static;display:block;margin:0;border:0;padding:24px}</style>
    <div id="dklaAskDialog"><div class="ask-progress"><p class="ask-working"></p><button type="button" class="ask-cancel">Cancel</button></div></div>
    <script>${await at('dottie.js')}</script>`;
}

// Open it in a Playwright context, at a made-up address so the page has an origin like the real one.
export async function openBare(context) {
  const html = await bare();
  await context.route('http://dottie.test/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: html }),
  );
  const page = await context.newPage();
  await page.goto('http://dottie.test/');
  return page;
}

// Put the spinner in the row the way the dialog does.
export const mount = (page) =>
  page.evaluate(() => {
    const mascot = document.createElement('span');
    mascot.className = 'ask-dottie';
    mascot.dataset.pose = 'spinner';
    mascot.innerHTML = window.DKLADottie.spinner();
    document.querySelector('#dklaAskDialog .ask-progress').prepend(mascot);
  });
