/* Cold Call definitions in a real browser: the Garcia Cold Call at desktop and phone sizes.
   Hover after a short delay, the card staying while the pointer moves into it, keyboard focus and
   Escape, the dictionary hand-off, tap on a touch screen, the card inside the visible screen and
   off the word, the per-episode and per-paragraph limits, and no animation with reduced motion.

     node tools/cold-call/glossary_browser.cjs http://127.0.0.1:8781/DKLA-v2.9.html [screenshot folder]

   Loopback only; /api/ and other origins answer 204, so nothing leaves the machine. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');
const url = process.argv[2];
assert.ok(url && ['127.0.0.1', 'localhost'].includes(new URL(url).hostname), 'Pass a loopback page address');
const shots = process.argv[3] ? path.resolve(process.argv[3]) : null;
if (shots) fs.mkdirSync(shots, { recursive: true });
const CASE = 'cp-garcia';
const results = {};
const card = '#coldCallDialog #ccGlossCard';
const term = (key) => `#coldCallDialog .cc-term[data-cc-term="${key}"]`;

async function openGarcia(context) {
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url + '#node=' + CASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90000 });
  await page.waitForFunction(
    () => window.LegalAtlas?.ready && window.DKLAColdCall && window.DKLAColdCallGloss,
  );
  // The launch button sits on the case's reading panel; the panel can be redrawn, so retry the press.
  const launch = page.locator(`#inspector [data-cold-call="${CASE}"]`);
  for (let i = 0; ; i++) {
    try {
      await launch.first().click({ timeout: 4000 });
      await page.locator('#coldCallDialog[open]').waitFor({ timeout: 4000 });
      break;
    } catch (error) {
      if (i >= 4) throw error;
    }
  }
  await page.locator(term('compromise')).first().waitFor();
  return { page, errors };
}
// The middle of the first line of a word (a wrapped phrase's bounding box can centre on other words).
async function pointOn(locator) {
  await locator.scrollIntoViewIfNeeded();
  return locator.evaluate((e) => {
    const r = e.getClientRects()[0];
    return { x: r.left + Math.min(r.width / 2, 12), y: r.top + r.height / 2 };
  });
}
const overlap = (a, b) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
async function geometry(page, key) {
  return page.evaluate(
    ([sel, cardSel]) => {
      const word = document.querySelector(sel),
        c = document.querySelector(cardSel),
        vv = visualViewport;
      const r = (e) => {
        const b = e.getBoundingClientRect();
        return { x: b.left, y: b.top, width: b.width, height: b.height };
      };
      return {
        words: [...word.getClientRects()].map((b) => ({
          x: b.left,
          y: b.top,
          width: b.width,
          height: b.height,
        })),
        card: c && r(c),
        view: { x: vv.offsetLeft, y: vv.offsetTop, width: vv.width, height: vv.height },
        pageWidth: document.documentElement.scrollWidth,
      };
    },
    [term(key), card],
  );
}
function insideAndClear(g, label) {
  assert.ok(g.card, label + ': no card');
  const { card: c, view: v } = g;
  assert.ok(
    c.x >= v.x - 0.5 && c.x + c.width <= v.x + v.width + 0.5,
    `${label}: card off the visible screen sideways`,
  );
  assert.ok(
    c.y >= v.y - 0.5 && c.y + c.height <= v.y + v.height + 0.5,
    `${label}: card off the visible screen`,
  );
  for (const w of g.words) assert.ok(!overlap(c, w), `${label}: the card covers its word`);
}

async function limits(page) {
  return page.evaluate(() => {
    const max = window.DKLAColdCallGloss.table().density.maxPerParagraph;
    const out = { max, sections: 0, links: 0, repeated: [], crowded: [], outside: 0 };
    for (const section of document.querySelectorAll('#ccNarrative .cc-section')) {
      out.sections++;
      const keys = [...section.querySelectorAll('.cc-term')].map((t) => t.dataset.ccTerm);
      out.links += keys.length;
      for (const k of new Set(keys)) if (keys.filter((x) => x === k).length > 1) out.repeated.push(k);
      for (const p of section.querySelectorAll('p')) {
        const n = p.querySelectorAll(':scope > .cc-term').length;
        if (n > max) out.crowded.push(n);
      }
    }
    out.outside = document.querySelectorAll(
      '#coldCallDialog h2 .cc-term, #coldCallDialog h3 .cc-term, #coldCallDialog .cc-citations .cc-term, #coldCallDialog .cc-end .cc-term, #coldCallDialog summary .cc-term, #ccBriefDialog .cc-term',
    ).length;
    const linked = [...document.querySelectorAll('#ccNarrative .cc-term')].map((t) => t.textContent);
    out.linked = linked;
    return out;
  });
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.DKLA_CHROME ||
      (process.platform === 'darwin'
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : undefined),
  });
  const contextFor = async (options) => {
    const context = await browser.newContext({ serviceWorkers: 'block', ...options });
    await context.route('**/*', (route) => {
      const target = new URL(route.request().url());
      return target.origin !== new URL(url).origin || target.pathname.startsWith('/api/')
        ? route.fulfill({ status: 204, body: '' })
        : route.continue();
    });
    await context.addInitScript(() => localStorage.setItem('dkla.guide.v1', 'seen'));
    return context;
  };
  try {
    // ---- desktop: hover, keyboard, dictionary
    {
      const context = await contextFor({ viewport: { width: 1440, height: 900 } });
      const { page, errors } = await openGarcia(context);
      const compromised = page.locator(term('compromise')).first();
      assert.equal(await compromised.innerText(), 'compromised');
      assert.equal(await compromised.getAttribute('role'), 'button');
      assert.equal(await compromised.getAttribute('tabindex'), '0');
      assert.equal(await compromised.getAttribute('aria-expanded'), 'false');
      const described = await compromised.evaluate(
        (t) => document.getElementById(t.getAttribute('aria-describedby'))?.textContent,
      );
      const gloss = await page.evaluate(() => window.DKLAColdCallGloss.table().terms.get('compromise').gloss);
      assert.equal(described, gloss, 'the word is described for screen readers by its definition');
      assert.equal(await page.locator(term('motion-to-dismiss')).first().innerText(), 'moved to dismiss');
      const lim = await limits(page);
      assert.deepEqual(lim.repeated, [], 'a term linked twice in one episode');
      assert.deepEqual(lim.crowded, [], 'too many links in one paragraph');
      assert.equal(lim.outside, 0, 'a link in a heading, citation or source list');
      assert.ok(
        lim.linked.some((w) => /^motions?\b|motion to/i.test(w) || /dismiss/.test(w)),
        'no motion link',
      );
      assert.ok(!lim.linked.some((w) => /hilton|prostitution/i.test(w)), 'a plain word or name is linked');
      assert.ok(
        await page.locator('#ccNarrative p', { hasText: 'prostitution' }).count(),
        'Garcia text changed',
      );
      if (shots) {
        await page.locator('#ccScroll').evaluate((s) => (s.scrollTop = 0));
        await page.screenshot({ path: path.join(shots, 'desktop-1440-links.png') });
      }

      // Hover: nothing at once, a card after the short delay, with the definition and its sources.
      await page.mouse.move(5, 5);
      const box = await pointOn(compromised);
      const began = Date.now();
      await page.mouse.move(box.x, box.y, { steps: 2 });
      await page.waitForTimeout(80);
      assert.equal(await page.locator(card).count(), 0, 'the card opened without a delay');
      await page.locator(card).waitFor({ state: 'visible', timeout: 2000 });
      const delay = Date.now() - began;
      assert.ok(delay >= 200, `card opened after only ${delay} ms`);
      const cardText = await page.locator(card).innerText();
      assert.ok(cardText.includes(gloss), 'card lacks the compromise definition');
      assert.match(cardText, /^compromise/i, 'card headword');
      const wex = page.locator(card + ' a[href="https://www.law.cornell.edu/wex/compromise"]');
      assert.equal(await wex.count(), 1, 'no Cornell LII Wex link');
      assert.equal(await wex.getAttribute('target'), '_blank');
      assert.match(await wex.getAttribute('rel'), /noopener/);
      assert.equal(await page.locator(card).getAttribute('role'), 'dialog');
      assert.equal(await compromised.getAttribute('aria-expanded'), 'true');
      assert.equal(await page.locator(card + ' [data-cc-gloss-dictionary="compromise"]').count(), 1);
      insideAndClear(await geometry(page, 'compromise'), 'desktop hover');
      // The card waits for the pointer to move into it, and then stays.
      const cardBox = await page.locator(card).boundingBox();
      await page.mouse.move(cardBox.x + 20, cardBox.y + cardBox.height - 12, { steps: 4 });
      await page.waitForTimeout(700);
      assert.equal(await page.locator(card).count(), 1, 'the card closed while the pointer moved into it');
      const transition = await page.locator(card).evaluate((c) => getComputedStyle(c).transitionDuration);
      assert.notEqual(transition.split(',')[0].trim(), '0s', 'the card has its short fade');
      if (shots) await page.screenshot({ path: path.join(shots, 'desktop-1440-hover-card.png') });
      // Leaving both closes it, after a moment.
      await page.mouse.move(5, 5, { steps: 2 });
      await page.locator(card).waitFor({ state: 'detached', timeout: 2000 });
      assert.equal(await compromised.getAttribute('aria-expanded'), 'false');

      // One card at a time: hovering another word replaces it.
      const other = page.locator(term('motion-to-dismiss')).first();
      let at = await pointOn(compromised);
      await page.mouse.move(at.x, at.y, { steps: 2 });
      await page.locator(card + '[data-cc-gloss-for="compromise"]').waitFor();
      at = await pointOn(other);
      await page.mouse.move(at.x, at.y, { steps: 6 });
      await page.locator(card + '[data-cc-gloss-for="motion-to-dismiss"]').waitFor();
      assert.equal(await page.locator('#coldCallDialog .cc-gloss-card').count(), 1);
      await page.mouse.move(5, 5);
      await page.locator(card).waitFor({ state: 'detached', timeout: 2000 });

      // Keyboard: Tab reaches the word, focus shows the card at once, Tab moves into the card,
      // Escape closes the card and returns to the word, and a second Escape leaves the reader.
      await page.locator('#ccScroll').evaluate((s) => (s.scrollTop = 0));
      await page.locator('#ccScroll').focus();
      await page.keyboard.press('Tab');
      assert.equal(
        await page.evaluate(
          () => document.activeElement?.dataset.ccTerm || document.activeElement?.outerHTML.slice(0, 120),
        ),
        'compromise',
      );
      await page.locator(card).waitFor({ state: 'visible', timeout: 1000 });
      assert.equal(await compromised.getAttribute('aria-controls'), 'ccGlossCard');
      await page.keyboard.press('Tab');
      assert.ok(
        await page.evaluate(() => !!document.activeElement?.closest('#ccGlossCard')),
        'Tab does not reach the card',
      );
      assert.equal(await page.locator(card).count(), 1, 'the card closed when focus moved into it');
      await page.keyboard.press('Escape');
      await page.locator(card).waitFor({ state: 'detached', timeout: 1000 });
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.ccTerm), 'compromise');
      assert.ok(
        await page.locator('#coldCallDialog').evaluate((d) => d.open),
        'Escape closed the reader with the card',
      );
      // Enter opens it too; Tab past the card closes it.
      await page.keyboard.press('Enter');
      await page.locator(card).waitFor({ state: 'visible', timeout: 1000 });
      await page.keyboard.press('Enter');
      await page.locator(card).waitFor({ state: 'detached', timeout: 1000 });
      await page.keyboard.press('Enter');
      await page.locator(card).waitFor({ state: 'visible', timeout: 1000 });
      for (let i = 0; i < 3; i++) await page.keyboard.press('Tab');
      assert.ok(
        (await page.locator(card).count()) === 0 ||
          (await page.locator(card).getAttribute('data-cc-gloss-for')) !== 'compromise',
        'the card stayed after focus left it',
      );
      await page.keyboard.press('Escape');
      await page.locator(card).waitFor({ state: 'detached', timeout: 1000 });

      // The dictionary hand-off: the full entry opens over the reader, and Back returns to the word.
      await compromised.click();
      await page.locator(card).waitFor({ state: 'visible' });
      await page.locator(card + ' [data-cc-gloss-dictionary]').click();
      await page.locator('#glossaryDialog[open]').waitFor();
      assert.match(await page.locator('#glossaryDialog .gl-detail h2').innerText(), /compromise/i);
      await page.locator('#glClose').click();
      assert.ok(
        await page.locator('#coldCallDialog').evaluate((d) => d.open),
        'the reader closed under the dictionary',
      );
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.ccTerm), 'compromise');

      // Scrolling: the card follows its word, and closes once the word leaves the reading area.
      await compromised.click();
      await page.locator(card).waitFor({ state: 'visible' });
      const before = (await geometry(page, 'compromise')).card.y;
      await page.locator('#ccScroll').evaluate((s) => (s.scrollTop += 40));
      await page.waitForTimeout(150);
      const after = await geometry(page, 'compromise');
      assert.ok(after.card && Math.abs(before - after.card.y - 40) < 6, 'the card did not follow its word');
      await page.locator('#ccScroll').evaluate((s) => (s.scrollTop += 2000));
      await page.locator(card).waitFor({ state: 'detached', timeout: 1000 });
      // An atlas entry chosen in the dictionary opened from a card leaves the reader as well.
      const defamation = page.locator(term('defamation')).first();
      await defamation.evaluate((t) => t.scrollIntoView({ block: 'center' }));
      await defamation.click();
      await page.locator(card + ' [data-cc-gloss-dictionary="defamation"]').click();
      await page.locator('#glossaryDialog[open]').waitFor();
      const entry = page.locator('#glossaryDialog [data-study-node]').first();
      assert.ok(await entry.count(), 'the defamation dictionary entry lists no atlas entries');
      await entry.click();
      await page.waitForFunction(
        () => !document.querySelector('#glossaryDialog[open], #coldCallDialog[open]'),
      );
      const navigated = true;
      assert.deepEqual(errors, [], 'page errors');
      results.desktop = {
        links: lim.links,
        sections: lim.sections,
        maxPerParagraph: lim.max,
        hoverDelayMs: delay,
        dictionaryEntryLeavesReader: navigated,
      };
      await context.close();
    }
    // ---- phone: tap opens, tap elsewhere closes, the card stays on screen
    {
      const context = await contextFor({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
      const { page, errors } = await openGarcia(context);
      if (shots) await page.screenshot({ path: path.join(shots, 'phone-390-links.png') });
      const tapped = [];
      for (const key of ['compromise', 'removal', 'cause-of-action']) {
        const at = await pointOn(page.locator(term(key)).first());
        await page.touchscreen.tap(at.x, at.y);
        await page
          .locator(card + `[data-cc-gloss-for="${key}"]`)
          .waitFor({ state: 'visible', timeout: 1500 });
        await page.waitForTimeout(500);
        assert.equal(await page.locator(card).count(), 1, 'the tapped card closed by itself');
        const g = await geometry(page, key);
        insideAndClear(g, 'phone ' + key);
        tapped.push({ key, card: g.card, view: g.view, pageWidth: g.pageWidth });
        if (shots && key === 'compromise')
          await page.screenshot({ path: path.join(shots, 'phone-390-tap-card.png') });
      }
      // A tap on plain text closes it.
      const plain = page.locator('#ccNarrative .cc-section h3').first();
      await plain.tap();
      await page.locator(card).waitFor({ state: 'detached', timeout: 1500 });
      // Tapping the same word twice opens and closes it.
      const at = await pointOn(page.locator(term('compromise')).first());
      await page.touchscreen.tap(at.x, at.y);
      await page.locator(card).waitFor({ state: 'visible' });
      await page.touchscreen.tap(at.x, at.y);
      await page.locator(card).waitFor({ state: 'detached', timeout: 1500 });
      assert.deepEqual(errors, [], 'page errors');
      results.phone = {
        tapped: tapped.map((t) => t.key),
        pageWidth: tapped[0].pageWidth,
        view: tapped[0].view,
      };
      await context.close();
    }
    // ---- reduced motion: no fade or movement
    {
      const context = await contextFor({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
      const { page } = await openGarcia(context);
      await page.locator(term('compromise')).first().click();
      await page.locator(card).waitFor({ state: 'visible' });
      const style = await page.locator(card).evaluate((c) => {
        const s = getComputedStyle(c);
        return {
          transition: s.transitionDuration,
          animation: s.animationName,
          opacity: s.opacity,
          transform: s.transform,
        };
      });
      assert.ok(
        style.transition.split(',').every((d) => d.trim() === '0s'),
        'reduced motion still fades: ' + style.transition,
      );
      assert.equal(style.animation, 'none');
      assert.equal(style.opacity, '1');
      assert.equal(style.transform, 'none');
      results.reducedMotion = style;
      await context.close();
    }
    console.log(JSON.stringify({ pass: true, ...results }));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
