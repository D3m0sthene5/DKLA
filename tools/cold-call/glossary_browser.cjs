/* Cold Call definitions in a real browser: the Garcia Cold Call at desktop and phone sizes, and the
   plain-English marker after the Erie licensee sentence (hover, keyboard, click, tap, tint, Escape).
   Hover after a short delay, the card staying while the pointer moves into it, keyboard focus and
   Escape, the dictionary hand-off, tap on a touch screen, the card inside the visible screen and
   off the word, the per-episode and per-paragraph limits, and no animation with reduced motion.
   Also: a click or tap on the card's own text keeps it open; Escape returns focus to the word only
   when focus was on the word or in the card; a phrase wrapped onto two lines is never covered, on
   either side; a very short visible screen still holds the whole card; and an atlas entry chosen in
   the dictionary is the entry that opens.

     node tools/cold-call/glossary_browser.cjs http://127.0.0.1:8781/DKLA-v3.0.html [screenshot folder]

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

async function openCase(context, id, ready) {
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url + '#node=' + id, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90000 });
  await page.waitForFunction(
    () => window.LegalAtlas?.ready && window.DKLAColdCall && window.DKLAColdCallGloss,
  );
  // The launch button sits on the case's reading panel; the panel can be redrawn, so retry the press.
  const launch = page.locator(`#inspector [data-cold-call="${id}"]`);
  for (let i = 0; ; i++) {
    try {
      await launch.first().click({ timeout: 4000 });
      await page.locator('#coldCallDialog[open]').waitFor({ timeout: 4000 });
      break;
    } catch (error) {
      if (i >= 4) throw error;
    }
  }
  await page.locator(ready).first().waitFor();
  return { page, errors };
}
const openGarcia = (context) => openCase(context, CASE, term('compromise'));
// ---- plain English: Erie, the sentence the owner asked about
const ERIE = 'cp-erie-decision';
const LICENSEE = 'Tompkins claimed longstanding open use made him a licensee entitled to ordinary care.';
const marker = (id) => `#coldCallDialog .cc-plain[data-cc-plain="${id}"]`;
const openErie = (context) => openCase(context, ERIE, '#coldCallDialog .cc-plain');
/** The licensee marker: its id, the text just before it in its paragraph, the tinted text (if a card is
    open), and the plain version the table holds. */
async function licensee(page) {
  return page.evaluate((sentence) => {
    const entry = window.DKLAColdCallGloss.plainShown().find((e) => e.sentence === sentence);
    const m = entry && document.querySelector(`#coldCallDialog .cc-plain[data-cc-plain="${entry.id}"]`);
    if (!m) return null;
    let before = '';
    for (let n = m.previousSibling; n && before.length < 200; n = n.previousSibling)
      before = n.textContent + before;
    const tint = CSS.highlights?.get('cc-plain');
    return {
      id: entry.id,
      plain: entry.plain,
      before,
      inLink: !!m.closest('.cc-term'),
      inParagraph: !!m.closest('#ccNarrative p'),
      label: m.getAttribute('aria-label'),
      described: document.getElementById(m.getAttribute('aria-describedby'))?.textContent,
      glyph: getComputedStyle(m, '::before').content,
      tinted: tint ? [...tint].map((r) => r.toString()).join('') : null,
    };
  }, LICENSEE);
}
async function plainCard(page, id, label) {
  const c = page.locator(card + `[data-cc-gloss-for="plain-${id}"]`);
  await c.waitFor({ state: 'visible', timeout: 2000 });
  assert.equal(await c.getAttribute('role'), 'dialog', label + ': card role');
  assert.equal(await c.locator('.cc-gloss-head').innerText(), 'In plain English', label + ': heading');
  assert.equal(
    await c.locator('.cc-gloss-note').innerText(),
    'Explains the narrative; not the court’s words.',
  );
  return c;
}
async function markerGeometry(page, id) {
  return page.evaluate(
    ([sel, cardSel]) => {
      const r = (b) => ({ x: b.left, y: b.top, width: b.width, height: b.height });
      const c = document.querySelector(cardSel),
        vv = visualViewport;
      return {
        words: [...document.querySelector(sel).getClientRects()].map(r),
        card: c && r(c.getBoundingClientRect()),
        view: { x: vv.offsetLeft, y: vv.offsetTop, width: vv.width, height: vv.height },
        pageWidth: document.documentElement.scrollWidth,
      };
    },
    [marker(id), card],
  );
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
function inside(g, label) {
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
}
function insideAndClear(g, label) {
  inside(g, label);
  for (const w of g.words) assert.ok(!overlap(g.card, w), `${label}: the card covers its word`);
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

      // Escape on a card opened by hovering closes it but leaves focus where it was (not on the word).
      await page.locator('#ccScroll').focus();
      {
        const at = await pointOn(compromised);
        await page.mouse.move(at.x, at.y, { steps: 2 });
        await page.locator(card).waitFor({ state: 'visible', timeout: 2000 });
        await page.keyboard.press('Escape');
        await page.locator(card).waitFor({ state: 'detached', timeout: 1000 });
        assert.equal(await page.evaluate(() => document.activeElement?.id), 'ccScroll', 'Escape moved focus');
        assert.ok(await page.locator('#coldCallDialog').evaluate((d) => d.open), 'Escape closed the reader');
        await page.mouse.move(5, 5);
        await page.waitForTimeout(400);
      }

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
      const focused = () =>
        page.evaluate(
          () => document.activeElement?.dataset.ccTerm || document.activeElement?.outerHTML.slice(0, 120),
        );
      // The first Tab reaches the account's first defined word ("complaint" comes before "compromised").
      assert.ok(/^[a-z0-9-]+$/.test(await focused()), 'Tab from the reading area reaches a defined word');
      for (let i = 0; i < 6 && (await focused()) !== 'compromise'; i++) {
        await page.keyboard.press('Escape');
        await page.keyboard.press('Tab');
      }
      assert.equal(await focused(), 'compromise');
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

      // A click on the card's own text (to select or copy it) keeps the card open.
      await compromised.click();
      await page.locator(card).waitFor({ state: 'visible' });
      await page.locator(card + ' .cc-gloss-text').click();
      await page.waitForTimeout(400);
      assert.equal(await page.locator(card).count(), 1, 'a click inside the card closed it');
      assert.ok(
        await page.evaluate(() => !!document.activeElement?.closest('#ccGlossCard')),
        'focus left the card',
      );
      // Escape from there closes it and gives the keyboard back to the word.
      await page.keyboard.press('Escape');
      await page.locator(card).waitFor({ state: 'detached', timeout: 1000 });
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.ccTerm), 'compromise');

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

      // A phrase that wraps onto two lines: its card clears both lines. Opened from the keyboard (placed
      // from the first line) it goes below the last line; opened by the pointer on the second line low in
      // the reader, it goes above the first.
      const phrase = page.locator(term('motion-to-dismiss')).first();
      const wrapped = await phrase.evaluate((t) => {
        const p = t.closest('p');
        t.scrollIntoView({ block: 'center' });
        for (let w = Math.floor(p.getBoundingClientRect().width); w > 120; w -= 2) {
          p.style.maxWidth = w + 'px';
          if (t.getClientRects().length === 2) return w;
        }
        return 0;
      });
      assert.ok(wrapped, 'the phrase could not be made to wrap');
      const sides = {};
      await phrase.evaluate((t) => t.scrollIntoView({ block: 'center' }));
      await page.keyboard.press('Shift');
      await phrase.focus();
      await page.locator(card + '[data-cc-gloss-for="motion-to-dismiss"]').waitFor({ state: 'visible' });
      insideAndClear(await geometry(page, 'motion-to-dismiss'), 'wrapped phrase from the keyboard');
      sides.keyboard = await page.locator(card).getAttribute('data-side');
      await page.keyboard.press('Escape');
      await page.locator(card).waitFor({ state: 'detached', timeout: 1000 });
      // Focus off the word, so the hovered card below closes when the pointer leaves.
      await page.locator('#ccScroll').focus();
      await page.mouse.move(5, 5);
      await phrase.evaluate((t) => {
        const s = document.getElementById('ccScroll'),
          r = t.getClientRects()[1],
          box = s.getBoundingClientRect();
        s.scrollTop += r.bottom - (box.bottom - 12);
      });
      const second = await phrase.evaluate((t) => {
        const r = t.getClientRects()[1];
        return { x: r.left + Math.min(r.width / 2, 12), y: r.top + r.height / 2 };
      });
      await page.mouse.move(second.x, second.y, { steps: 2 });
      await page.locator(card + '[data-cc-gloss-for="motion-to-dismiss"]').waitFor({ state: 'visible' });
      insideAndClear(await geometry(page, 'motion-to-dismiss'), 'wrapped phrase from its second line');
      sides.pointer = await page.locator(card).getAttribute('data-side');
      assert.deepEqual(
        sides,
        { keyboard: 'below', pointer: 'above' },
        'the wrapped-phrase cards were not tested on both sides',
      );
      await page.mouse.move(5, 5, { steps: 2 });
      await page.locator(card).waitFor({ state: 'detached', timeout: 2000 });
      await phrase.evaluate((t) => (t.closest('p').style.maxWidth = ''));

      // A very short visible screen (a phone on its side with the keyboard up, a pinch-zoomed page): the
      // card stays inside it. The visual viewport is replaced by a 120 px one whose top is just above the
      // word, so there is less than a card's height of room on either side.
      await compromised.evaluate((t) => t.scrollIntoView({ block: 'center' }));
      await compromised.click();
      await page.locator(card).waitFor({ state: 'visible' });
      await page.evaluate(() => {
        const r = document
          .querySelector('#coldCallDialog .cc-term[data-cc-term="compromise"]')
          .getClientRects()[0];
        const fake = { offsetLeft: 0, offsetTop: r.top - 30, width: innerWidth, height: 120, scale: 1 };
        Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => fake });
        dispatchEvent(new Event('resize'));
      });
      await page.waitForTimeout(200);
      const short = await geometry(page, 'compromise');
      await page.evaluate(() => {
        delete window.visualViewport;
        dispatchEvent(new Event('resize'));
      });
      inside(short, 'short screen');
      await page.keyboard.press('Escape');
      await page.locator(card).waitFor({ state: 'detached', timeout: 1000 });
      // An atlas entry chosen in the dictionary opened from a card leaves the reader as well.
      const defamation = page.locator(term('defamation')).first();
      await defamation.evaluate((t) => t.scrollIntoView({ block: 'center' }));
      await defamation.click();
      await page.locator(card + ' [data-cc-gloss-dictionary="defamation"]').click();
      await page.locator('#glossaryDialog[open]').waitFor();
      // Another entry than Garcia, whose reader is open under the Cold Call: the jump must really move.
      const entry = page
        .locator(`#glossaryDialog [data-study-node]:not([data-study-node="${CASE}"])`)
        .first();
      assert.ok(await entry.count(), 'the defamation dictionary entry lists no other atlas entry');
      const chosen = await entry.getAttribute('data-study-node');
      await entry.click();
      await page.waitForFunction(
        () => !document.querySelector('#glossaryDialog[open], #coldCallDialog[open]'),
      );
      // ... and lands on the entry that was chosen, open in the reading panel.
      await page.waitForFunction(
        (id) =>
          selected?.type === 'node' &&
          selected.id === id &&
          !document.getElementById('inspector').hidden &&
          document.querySelector('#inspector .reader-body h2'),
        chosen,
        { timeout: 5000 },
      );
      const navigated = await page.evaluate(() => ({
        entry: selected.id,
        title: document.querySelector('#inspector .reader-body h2').textContent,
      }));
      assert.equal(
        navigated.title,
        await page.evaluate((id) => nodesById.get(id)?.title, chosen),
        'the reader shows another entry',
      );
      assert.deepEqual(errors, [], 'page errors');
      results.desktop = {
        links: lim.links,
        sections: lim.sections,
        maxPerParagraph: lim.max,
        hoverDelayMs: delay,
        dictionaryEntryOpens: navigated,
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
      // A tap on the card's own text keeps it open.
      await page.locator(card + ' .cc-gloss-text').tap();
      await page.waitForTimeout(400);
      assert.equal(await page.locator(card).count(), 1, 'a tap inside the card closed it');
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
      // The plain-English card is the same card: no fade either.
      await page.keyboard.press('Escape');
      await page.locator(card).waitFor({ state: 'detached', timeout: 1000 });
      const first = page.locator('#coldCallDialog .cc-plain').first();
      await first.scrollIntoViewIfNeeded();
      await first.click();
      await page.locator(card + '.cc-plain-card').waitFor({ state: 'visible' });
      const plainStyle = await page
        .locator(card)
        .evaluate((c) => [getComputedStyle(c).transitionDuration, getComputedStyle(c).opacity]);
      assert.ok(
        plainStyle[0].split(',').every((d) => d.trim() === '0s') && plainStyle[1] === '1',
        'reduced motion: the plain-English card still fades',
      );
      await context.close();
    }

    // ---- plain English on Erie, desktop: the marker after the licensee sentence; hover, keyboard, click
    const erieText = JSON.parse(fs.readFileSync(path.join(__dirname, 'narratives', ERIE + '.json'), 'utf8'))
      .sections[0].paragraphs[1];
    assert.ok(erieText.startsWith(LICENSEE), 'the Erie narrative no longer has the licensee sentence');
    {
      const context = await contextFor({ viewport: { width: 1440, height: 900 } });
      const { page, errors } = await openErie(context);
      const info = await licensee(page);
      assert.ok(info, 'Erie: no marker after the licensee sentence');
      assert.ok(
        info.before.endsWith('made him a licensee entitled to ordinary care.'),
        'Erie: marker placement',
      );
      assert.equal(info.inLink, false, 'Erie: the marker is inside a link');
      assert.equal(info.inParagraph, true);
      assert.equal(info.label, 'In plain English');
      assert.equal(info.described, info.plain, 'the marker is described by its plain version');
      assert.match(info.glyph, /≈/, 'the marker shows its glyph');
      // The narrative text is unchanged: the marker adds no text of its own.
      assert.ok(
        await page.evaluate(
          (t) => [...document.querySelectorAll('#ccNarrative p')].some((p) => p.textContent === t),
          erieText,
        ),
        'Erie: the paragraph text changed',
      );
      const m = page.locator(marker(info.id));
      assert.equal(await m.getAttribute('role'), 'button');
      assert.equal(await m.getAttribute('tabindex'), '0');
      await m.evaluate((e) => e.scrollIntoView({ block: 'center' }));
      if (shots) await page.screenshot({ path: path.join(shots, 'desktop-1440-erie-marker.png') });

      // Hover: nothing at once, the card after the same short delay as a definition, the sentence tinted.
      await page.locator('#ccScroll').focus();
      await page.mouse.move(5, 5);
      const box = await m.boundingBox();
      const began = Date.now();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 2 });
      await page.waitForTimeout(80);
      assert.equal(await page.locator(card).count(), 0, 'the plain card opened without a delay');
      const c = await plainCard(page, info.id, 'Erie hover');
      const delay = Date.now() - began;
      assert.ok(delay >= 200, `plain card opened after only ${delay} ms`);
      assert.equal(await c.locator('.cc-gloss-text').innerText(), info.plain, 'Erie: wrong plain text');
      assert.equal(await m.getAttribute('aria-expanded'), 'true');
      const hovered = await licensee(page);
      assert.equal(hovered.tinted, LICENSEE, 'the explained sentence is not tinted');
      insideAndClear(await markerGeometry(page, info.id), 'Erie hover');
      if (shots) await page.screenshot({ path: path.join(shots, 'desktop-1440-erie-plain-card.png') });
      // Escape closes it, leaves focus where it was and clears the tint.
      await page.keyboard.press('Escape');
      await page.locator(card).waitFor({ state: 'detached', timeout: 1000 });
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'ccScroll', 'Escape moved focus');
      assert.ok(await page.locator('#coldCallDialog').evaluate((d) => d.open), 'Escape closed the reader');
      assert.equal((await licensee(page)).tinted, null, 'the tint stayed after the card closed');
      await page.mouse.move(5, 5);
      await page.waitForTimeout(400);

      // One card at a time: a definition hovered next (one the plain card does not cover) replaces it.
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 2 });
      await plainCard(page, info.id, 'Erie again');
      const at = await page.evaluate(() => {
        const c = document.getElementById('ccGlossCard').getBoundingClientRect(),
          s = document.getElementById('ccScroll').getBoundingClientRect();
        for (const t of document.querySelectorAll('#ccNarrative .cc-term')) {
          const r = t.getClientRects()[0];
          if (!r || r.top < s.top + 10 || r.bottom > s.bottom - 10) continue;
          if (r.left < c.right && c.left < r.right && r.top < c.bottom && c.top < r.bottom) continue;
          return { x: r.left + Math.min(r.width / 2, 12), y: r.top + r.height / 2 };
        }
        return null;
      });
      assert.ok(at, 'no visible definition beside the plain card');
      await page.mouse.move(at.x, at.y, { steps: 6 });
      await page.locator(card + ':not(.cc-plain-card)').waitFor({ state: 'visible', timeout: 2000 });
      assert.equal(await page.locator('#coldCallDialog .cc-gloss-card').count(), 1, 'two cards open');
      assert.equal((await licensee(page)).tinted, null, 'the tint stayed under a definition card');
      await page.mouse.move(5, 5, { steps: 2 });
      await page.locator(card).waitFor({ state: 'detached', timeout: 2000 });

      // Keyboard: focus opens it at once, Escape closes it and keeps focus on the marker, Enter toggles.
      await page.keyboard.press('Shift');
      await m.focus();
      await plainCard(page, info.id, 'Erie focus');
      assert.equal(await m.getAttribute('aria-controls'), 'ccGlossCard');
      await page.keyboard.press('Escape');
      await page.locator(card).waitFor({ state: 'detached', timeout: 1000 });
      assert.equal(
        await page.evaluate(() => document.activeElement?.dataset.ccPlain),
        info.id,
        'Escape did not return focus to the marker',
      );
      await page.keyboard.press('Enter');
      await plainCard(page, info.id, 'Erie Enter');
      await page.keyboard.press('Enter');
      await page.locator(card).waitFor({ state: 'detached', timeout: 1000 });
      // A click pins it; a click on plain text elsewhere closes it.
      await m.click();
      await plainCard(page, info.id, 'Erie click');
      await page.waitForTimeout(700);
      assert.equal(await page.locator(card).count(), 1, 'the clicked plain card closed by itself');
      await page.locator('#ccNarrative .cc-section h3').first().click();
      await page.locator(card).waitFor({ state: 'detached', timeout: 1500 });
      assert.deepEqual(errors, [], 'page errors');
      results.plainDesktop = { marker: info.id, hoverDelayMs: delay, tinted: true };
      await context.close();
    }
    // ---- plain English on Erie, phone: tap opens, the card stays on screen, a tap elsewhere closes
    {
      const context = await contextFor({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
      const { page, errors } = await openErie(context);
      const info = await licensee(page);
      assert.ok(info, 'Erie (phone): no marker after the licensee sentence');
      const m = page.locator(marker(info.id));
      await m.evaluate((e) => e.scrollIntoView({ block: 'center' }));
      if (shots) await page.screenshot({ path: path.join(shots, 'phone-390-erie-marker.png') });
      const box = await m.boundingBox();
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      const c = await plainCard(page, info.id, 'Erie tap');
      assert.equal(await c.locator('.cc-gloss-text').innerText(), info.plain);
      await page.waitForTimeout(500);
      assert.equal(await page.locator(card).count(), 1, 'the tapped plain card closed by itself');
      const g = await markerGeometry(page, info.id);
      insideAndClear(g, 'Erie phone');
      assert.ok(g.pageWidth <= 390, 'the page scrolls sideways');
      if (shots) await page.screenshot({ path: path.join(shots, 'phone-390-erie-plain-card.png') });
      // A tap on the card's text keeps it; a tap on plain text closes it; the marker toggles.
      await c.locator('.cc-gloss-text').tap();
      await page.waitForTimeout(400);
      assert.equal(await page.locator(card).count(), 1, 'a tap inside the plain card closed it');
      await page.locator('#ccNarrative .cc-section h3').first().tap();
      await page.locator(card).waitFor({ state: 'detached', timeout: 1500 });
      const again = await m.boundingBox();
      await page.touchscreen.tap(again.x + again.width / 2, again.y + again.height / 2);
      await plainCard(page, info.id, 'Erie second tap');
      await page.touchscreen.tap(again.x + again.width / 2, again.y + again.height / 2);
      await page.locator(card).waitFor({ state: 'detached', timeout: 1500 });
      assert.deepEqual(errors, [], 'page errors');
      results.plainPhone = { marker: info.id, card: g.card, view: g.view };
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
