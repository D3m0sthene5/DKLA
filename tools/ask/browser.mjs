import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { normalise } from '../../lib/ask/library.js';

const url = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
const browser = await chromium.launch();
const question = 'How did International Shoe change Pennoyer?';
const rankingQuestion = 'Is Iqbal one of the five most cited cases ever?';
const rankingUrl =
  'https://heinonline.com/blog/2018/09/most-cited-u-s-supreme-court-cases-in-heinonline-part-iii/';
const countUrl = 'https://www.californialawreview.org/print/iqbal-evolution';
const response = {
  paragraphs: [
    {
      text: 'Pennoyer centered personal jurisdiction on territorial power. International Shoe shifted the inquiry to the defendant’s minimum contacts with the forum and whether exercising jurisdiction accords with fair play and substantial justice.',
      citations: [1, 2],
    },
  ],
  sources: [
    { type: 'node', id: 'cp-pennoyer', title: 'Pennoyer v. Neff (1878)', category: 'Case' },
    { type: 'node', id: 'shoe', title: 'International Shoe Co. v. Washington (1945)', category: 'Case' },
  ],
};
const rankingResponse = {
  paragraphs: [
    {
      text: 'Yes, in a published ranking of U.S. Supreme Court opinions by citations from other cases. HeinOnline placed Iqbal fifth in September 2018, with 108,107 citing decisions.',
      citations: [2, 2],
    },
    {
      text: 'The Atlas entry explains Iqbal’s importance to federal pleading. A March 2026 Westlaw count found 383,631 citing cases. Its current rank depends on the database and the opinions counted.',
      citations: [1, 3],
    },
  ],
  sources: [
    { type: 'node', id: 'cp-iqbal', title: 'Ashcroft v. Iqbal (2009)', category: 'Case' },
    { type: 'web', id: 'ranking', title: 'HeinOnline citation ranking', url: rankingUrl },
    { type: 'web', id: 'count', title: 'Iqbal & the Evolution of Procedural Scholarship', url: countUrl },
  ],
  search: 'searched',
};

try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const phone = viewport.width === 390;
    const context = await browser.newContext({
      viewport,
      isMobile: phone,
      hasTouch: phone,
      serviceWorkers: 'block',
    });
    let asked = 0;
    const payloads = [];
    // Warm-ups: sent when the dialog opens or someone types, never counted as a question.
    let warmed = 0;
    const analytics = [];
    // A question that waits until the test cancels it.
    let finishCanceledRequest = () => {};
    await context.route('**/*', async (route) => {
      const target = new URL(route.request().url());
      if (target.pathname === '/api/analytics') analytics.push(route.request().postData() ?? '');
      if (
        target.origin !== url.origin ||
        (target.pathname.startsWith('/api/') && target.pathname !== '/api/ask')
      )
        return route.fulfill({ status: 204 });
      if (target.pathname !== '/api/ask') return route.continue();
      const request = route.request();
      assert.equal(request.method(), 'POST');
      const payload = request.postDataJSON();
      if (payload.warm) {
        // Nothing but the warm-up flag: no question, no history.
        assert.deepEqual(payload, { warm: true });
        warmed++;
        return route.fulfill({ json: { warm: true } });
      }
      asked++;
      assert.match(request.headers().accept, /application\/x-ndjson/);
      // Only the question and, for a follow-up, up to three earlier turns.
      assert.ok(Object.keys(payload).every((key) => ['question', 'history'].includes(key)));
      if (payload.history) {
        assert.ok(payload.history.length >= 1 && payload.history.length <= 3);
        for (const turn of payload.history) {
          assert.deepEqual(Object.keys(turn), ['question', 'answer']);
          assert.ok(turn.question && turn.answer.length <= 2000);
        }
      }
      payloads.push(payload);
      if (payload.question === question) return route.fulfill({ json: response });
      if (payload.question === rankingQuestion) return route.fulfill({ json: rankingResponse });
      if (payload.question === 'Can unsafe citations appear?')
        return route.fulfill({
          json: {
            ...rankingResponse,
            sources: [
              rankingResponse.sources[0],
              { type: 'web', id: 'unsafe', title: 'Unsafe source', url: 'javascript:void(0)' },
              rankingResponse.sources[2],
            ],
          },
        });
      if (payload.question === 'A question outside the Atlas')
        return route.fulfill({ json: { paragraphs: [], sources: [], search: 'searched' } });
      if (payload.question === 'Can the Atlas answer on its own?')
        return route.fulfill({ json: { ...response, search: 'unavailable' } });
      if (payload.question === 'Can I cancel research?') {
        await new Promise((resolve) => (finishCanceledRequest = resolve));
        return route.abort();
      }
      return route.fulfill({ status: 503, json: { error: 'not-configured' } });
    });
    await context.addInitScript(() => localStorage.setItem('dkla.guide.v1', 'seen'));
    // Playwright cannot stream a mocked reply, so one question is answered in the page by a
    // stream the test writes line by line, as the server does with progress (NDJSON).
    await context.addInitScript(() => {
      const send = window.fetch.bind(window);
      window.fetch = (resource, options) => {
        let question;
        try {
          question = JSON.parse(options.body).question;
        } catch {}
        if (question !== 'Show me the progress') return send(resource, options);
        const encoder = new TextEncoder();
        return Promise.resolve(
          new Response(
            new ReadableStream({
              start(controller) {
                window.dklaTestStream = {
                  line: (data) => controller.enqueue(encoder.encode(JSON.stringify(data) + '\n')),
                  end: () => controller.close(),
                };
              },
            }),
            { headers: { 'content-type': 'application/x-ndjson; charset=utf-8' } },
          ),
        );
      };
    });
    const page = await context.newPage();
    await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90_000 });
    const search = page.locator('#search');
    // Dottie Docket appears once at a time, in a pose drawn at random from the
    // pool for the current state. Anything that went wrong is always possum.
    // While she works, the spinner shows instead of a pose.
    const pools = {
      idle: ['curious', 'bookmark', 'hanging', 'carrying'],
      research: ['spinner'],
      answer: ['carrying', 'bookmark'],
      trouble: ['possum'],
    };
    const anyDottie = page.locator('#dklaAskDialog .ask-dottie');
    async function expectOnlyDottie(state) {
      await expect(anyDottie).toHaveCount(1);
      await expect(anyDottie).toHaveAttribute('data-state', state);
      await expect(anyDottie).toHaveAttribute('aria-hidden', 'true');
      const pose = await anyDottie.getAttribute('data-pose');
      assert.ok(pools[state].includes(pose), `${pose} is not a ${state} pose`);
      return pose;
    }
    async function enterSearch(value) {
      await search.focus();
      await page.keyboard.press('ControlOrMeta+A');
      if (value) await page.keyboard.insertText(value);
      else await page.keyboard.press('Backspace');
    }
    // The permanent Ask Dottie button: a pill in the top bar on wide screens,
    // a tab hanging below the bar on phones. It opens the dialog directly.
    const bar = page.locator('.study-header .ask-bar');
    await expect(bar).toBeVisible();
    await expect(bar).toHaveAccessibleName('Ask Dottie');
    await expect(bar.locator('.ask-bar-dottie svg')).toHaveCount(1);
    const barBox = await bar.boundingBox();
    const headerBox = await page.locator('.study-header').boundingBox();
    assert.ok(barBox.x >= 0 && barBox.x + barBox.width <= viewport.width, 'Ask Dottie button on screen');
    if (phone) assert.ok(barBox.y >= headerBox.y + headerBox.height - 8, 'phone: Dottie hangs from the bar');
    else assert.ok(barBox.y >= headerBox.y && barBox.y + barBox.height <= headerBox.y + headerBox.height);
    // Dottie hangs by her tail from the bar's bottom edge, below the button, not inside it.
    const hangBox = await bar.locator('.ask-bar-dottie').boundingBox();
    const edge = headerBox.y + headerBox.height;
    // Her tail loop is drawn 5 to 11px below her top, so her top is at most 14px above the edge.
    assert.ok(hangBox.y < edge - 4 && hangBox.y > edge - 14, 'her tail wraps the bottom edge of the bar');
    assert.ok(hangBox.y + hangBox.height > edge + 30, 'she dangles over the page');
    // November 2026: she is drawn 50px wide (was 29px), and still covers nothing else in the bar.
    assert.ok(Math.abs(hangBox.width - 50) < 1.5, `Dottie is 50px wide (${hangBox.width})`);
    for (const other of ['.study-search', '#search', '#saveBtn', '#moreBtn']) {
      const box = await page.locator(other).first().boundingBox();
      if (!box) continue;
      const overlap =
        hangBox.x < box.x + box.width &&
        box.x < hangBox.x + hangBox.width &&
        hangBox.y < box.y + box.height &&
        box.y < hangBox.y + hangBox.height;
      assert.ok(!overlap, `Dottie does not cover ${other}`);
    }
    await bar.click();
    await expect(page.getByRole('dialog', { name: 'Ask Dottie' })).toBeVisible();
    await expectOnlyDottie('idle');
    // Opening the dialog warms the server up once; typing within minutes sends no more.
    await expect.poll(() => warmed).toBe(1);
    await page.keyboard.type('Wh');
    await page.keyboard.press('Escape');
    assert.equal(warmed, 1);
    assert.equal(asked, 0, 'A warm-up is not a question');
    assert.ok(!analytics.some((body) => /warm/i.test(body)), 'A warm-up is not recorded');

    // The New York flip clock: on wide screens only, showing New York's time.
    const clock = page.locator('.study-header .ny-clock');
    if (phone) await expect(clock).toBeHidden();
    else {
      await expect(clock).toBeVisible();
      const nyNow = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        minute: '2-digit',
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      const label = await clock.getAttribute('aria-label');
      const near = [-60_000, 0, 60_000].map((shift) => 'New York time: ' + nyNow.format(Date.now() + shift));
      assert.ok(near.includes(label), `${label} should be one of ${near.join(' / ')}`);
      const shown = await clock
        .locator('.flip')
        .evaluateAll((cards) => cards.map((card) => card.dataset.value).join(''));
      const hm = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      const expected = [-60_000, 0].map((shift) => hm.format(Date.now() + shift).replace(/\D/g, ''));
      assert.ok(expected.includes(shown.slice(0, 4)), `clock shows ${shown}, expected ${expected}`);
      // Weekday, month and day: one flap per character, New York's date
      // (WED NOV 11), worked out here with Intl, independently of the page.
      const nyDate = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        weekday: 'short',
        month: 'short',
        day: '2-digit',
      });
      const dateFlaps = (shift) => {
        const part = Object.fromEntries(
          nyDate.formatToParts(Date.now() + shift).map((p) => [p.type, p.value]),
        );
        return (part.weekday.slice(0, 3) + part.month.slice(0, 3)).toUpperCase() + part.day;
      };
      const flapValues = (selector) =>
        clock.locator(selector).evaluateAll((cards) => cards.map((card) => card.dataset.value).join(''));
      const datesNear = () => [-60_000, 0, 60_000].map(dateFlaps);
      const shownDate =
        (await flapValues('.ny-weekday .flip')) +
        (await flapValues('.ny-month .flip')) +
        (await flapValues('.ny-day .flip'));
      assert.ok(datesNear().includes(shownDate), `date flaps show ${shownDate}, expected ${datesNear()}`);
      await expect(clock.locator('.ny-date .flip')).toHaveCount(8);
      await expect(clock.locator('.ny-time')).toHaveAttribute('aria-hidden', 'true');
      await expect(clock.locator('.ny-date')).toHaveAttribute('aria-hidden', 'true');
      // NYC is static text, with no indicator light (removed at the owner's request).
      await expect(clock.locator('.ny-place')).toHaveText('NYC');
      await expect(clock.locator('.ny-dot')).toHaveCount(0);
      // The readable face: JetBrains Mono, embedded and loaded.
      const face = await clock
        .locator('.flip')
        .first()
        .evaluate((el) => getComputedStyle(el).fontFamily);
      assert.match(face, /^["']DKLA JetBrains Mono["']/, `clock face is ${face}`);
      assert.ok(await page.evaluate(() => document.fonts.check("700 20px 'DKLA JetBrains Mono'")));
      // The hourly Solari riffle: cards flip through other characters, then
      // every card lands on the right value within a couple of seconds.
      const riffle = page.evaluate(() =>
        Promise.race([
          window.DKLAClock.cascade().then(() => 'landed'),
          new Promise((resolve) => setTimeout(() => resolve('still riffling'), 4000)),
        ]),
      );
      await page.waitForFunction(() => document.querySelectorAll('.ny-clock .flip.flipping').length >= 6);
      assert.equal(await riffle, 'landed');
      const landed = await flapValues('.flip');
      assert.ok(
        [-60_000, 0].some((shift) => landed.startsWith(hm.format(Date.now() + shift).replace(/\D/g, ''))),
        `after the riffle the clock shows ${landed}`,
      );
      assert.ok(datesNear().includes(landed.slice(6)), `after the riffle the date shows ${landed.slice(6)}`);
      // Reduced motion: no flips, no riffle.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await page.evaluate(() => window.DKLAClock.cascade().then(() => 'still')), 'still');
      await expect(clock.locator('.flip.flipping')).toHaveCount(0);
      assert.ok(datesNear().includes((await flapValues('.flip')).slice(6)));
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    }

    await enterSearch('International Shoe');
    await page.locator('#searchResults [data-search-id="shoe"]').waitFor();
    await search.press('Enter');
    await expect(page.locator('#inspector')).toContainText('International Shoe');
    assert.equal(asked, 0, 'Normal search must not send a paid request');

    await enterSearch(question);
    await expect(page.locator('#searchResults .ask-search .ask-launch-face svg')).toHaveCount(1);
    await page.getByRole('button', { name: /Ask Dottie.*AI answer/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Ask Dottie' });
    const answerArea = dialog.locator('.ask-answer');
    const input = dialog.locator('textarea');
    await expect(dialog.getByRole('status')).toHaveText('Answer ready.');
    assert.equal(asked, 1);
    assert.equal(payloads[0].history, undefined);
    // Follow-up mode: the box clears for the next question, the answer shows what it answers.
    await expect(answerArea.locator('.ask-asked')).toHaveText(question);
    await expect(input).toHaveValue('');
    await expect(dialog.getByLabel('Ask a follow-up')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'New question' })).toBeVisible();
    // The signature moment: one joey per cited source, rising once the sources are in view.
    const carrier = dialog.locator('.ask-sources-heading .ask-dottie[data-state="answer"]');
    await expectOnlyDottie('answer');
    await expect(carrier.locator('.dottie-joey')).toHaveCount(2);
    await expect(dialog.locator('.ask-sources-heading')).toHaveText('Sources');
    await carrier.scrollIntoViewIfNeeded();
    await expect(carrier).toHaveClass(/is-peeking/);
    await expect(answerArea).toContainText('minimum contacts');
    await expect(answerArea.locator('.ask-citation')).toHaveCount(2);
    await answerArea.locator('.ask-citation').first().click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('#inspector')).toContainText('Pennoyer v. Neff');
    if (phone) await expect(bar).toBeHidden();

    // Reopening returns to the conversation; New question starts afresh.
    await enterSearch('');
    await page.getByRole('button', { name: /Ask Dottie.*AI answer/ }).click();
    await expect(answerArea).toContainText('minimum contacts');
    await expect(input).toBeFocused();
    await dialog.getByRole('button', { name: 'New question' }).click();
    await expect(answerArea).toBeEmpty();
    await expect(dialog.locator('.ask-earlier')).toBeHidden();
    await expect(dialog.getByLabel('Your question')).toBeFocused();
    await expectOnlyDottie('idle');
    await dialog.getByRole('button', { name: rankingQuestion }).click();
    await expect(input).toHaveValue(rankingQuestion);
    await expect(input).toBeFocused();
    await input.press('Enter');
    await expect(dialog.getByRole('status')).toHaveText('Answer ready. Web search completed.');
    assert.equal(payloads.at(-1).history, undefined);
    await expect(answerArea).toContainText('HeinOnline placed Iqbal fifth');
    await expect(answerArea.locator('.ask-citation')).toHaveText(['2', '1', '3']);
    await expect(answerArea.locator('.ask-origin')).toHaveText(['Atlas', 'Web', 'Web']);
    await expect(answerArea.locator('.ask-sources li')).toHaveCount(3);
    await expect(carrier.locator('.dottie-joey')).toHaveCount(3);
    const rankingLink = answerArea.locator('a.ask-citation').first();
    await expect(rankingLink).toHaveAttribute('href', rankingUrl);
    await expect(rankingLink).toHaveAttribute('target', '_blank');
    await expect(rankingLink).toHaveAttribute('rel', 'noopener noreferrer');
    const box = await dialog.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= viewport.width + 1);
    if (process.env.DKLA_ASK_SCREENSHOTS) {
      await mkdir(process.env.DKLA_ASK_SCREENSHOTS, { recursive: true });
      await page.screenshot({ path: `${process.env.DKLA_ASK_SCREENSHOTS}/ask-${viewport.width}.png` });
    }

    await input.fill('Can unsafe citations appear?');
    await input.press('Enter');
    await expect(dialog.getByRole('status')).toHaveText('Answer ready. Web search completed.');
    // A follow-up: the browser sent the earlier turn, which now sits folded below.
    assert.equal(payloads.at(-1).history.length, 1);
    assert.equal(payloads.at(-1).history[0].question, rankingQuestion);
    assert.match(payloads.at(-1).history[0].answer, /HeinOnline placed Iqbal fifth/);
    await expect(dialog.locator('.ask-earlier summary')).toHaveText([rankingQuestion]);
    await expect(answerArea.locator('.ask-citation')).toHaveText(['1', '3']);
    await expect(answerArea.locator('.ask-sources li').last()).toHaveAttribute('value', '3');
    await expect(dialog.getByRole('link', { name: /unsafe source/i })).toHaveCount(0);

    await input.fill('A question outside the Atlas');
    await input.press('Enter');
    await expect(dialog.getByRole('status')).toContainText('did not establish an answer');
    await expectOnlyDottie('trouble');
    await input.fill('Can the Atlas answer on its own?');
    await input.press('Enter');
    await expect(dialog.getByRole('status')).toContainText('Web search was unavailable');
    await expect(answerArea).toContainText('minimum contacts');
    // An unanswered question is not part of the conversation history.
    assert.deepEqual(
      payloads.at(-1).history.map((turn) => turn.question),
      [rankingQuestion, 'Can unsafe citations appear?'],
    );

    await input.fill('Can I cancel research?');
    await input.press('Enter');
    await expect.poll(() => asked).toBe(6);
    await expect(dialog.getByRole('status')).toHaveText('Looking for relevant sources…');
    // A long search: the thinking spinner (three opossums round her question-mark tail) turns,
    // and the words beside it change every two seconds. Screen readers hear only the status.
    await expectOnlyDottie('research');
    const spinner = dialog.locator('.ask-progress .ask-dottie svg.dottie-spinner');
    const words = dialog.locator('.ask-progress .ask-working');
    await expect(spinner).toBeVisible();
    await expect(spinner.locator('.dottie-ring > g')).toHaveCount(3);
    assert.notEqual(
      await spinner.locator('.dottie-ring').evaluate((g) => getComputedStyle(g).animationName),
      'none',
    );
    await expect(words).toBeVisible();
    await expect(words).toHaveAttribute('aria-hidden', 'true');
    await expect(words).toHaveAttribute('data-kind', 'quip');
    const quip = await words.textContent();
    assert.match(quip, /…$/);
    assert.doesNotMatch(quip, /!/);
    await expect.poll(() => words.textContent(), { timeout: 5000 }).not.toBe(quip);
    await expect(dialog.getByRole('status')).toHaveText('Looking for relevant sources…');
    assert.ok(
      (await dialog.getByRole('status').boundingBox()).width <= 1,
      'the status is for screen readers',
    );
    const progressBox = await dialog.locator('.ask-progress').boundingBox();
    assert.ok(progressBox.x + progressBox.width <= viewport.width, 'the progress line fits');
    // Large enough to make out (56 px, 48 px on a phone), with the words on one line centred on it.
    const spinnerBox = await spinner.boundingBox();
    const size = phone ? 48 : 56;
    assert.ok(Math.abs(spinnerBox.width - size) <= 1, `spinner is ${spinnerBox.width} px, not ${size}`);
    assert.ok(Math.abs(spinnerBox.height - size) <= 1, `spinner is ${spinnerBox.height} px tall`);
    const wordsBox = await words.boundingBox();
    assert.ok(wordsBox.height <= 24, 'the words stay on one line');
    assert.ok(
      Math.abs(wordsBox.y + wordsBox.height / 2 - (spinnerBox.y + spinnerBox.height / 2)) <= 2,
      'the words are centred on the spinner',
    );
    if (process.env.DKLA_ASK_SCREENSHOTS) {
      await dialog.locator('.ask-progress').screenshot({
        path: `${process.env.DKLA_ASK_SCREENSHOTS}/spinner-${viewport.width}.png`,
      });
      await page.screenshot({
        path: `${process.env.DKLA_ASK_SCREENSHOTS}/spinner-dialog-${viewport.width}.png`,
      });
      if (!phone)
        for (let frame = 0; frame < 6; frame++) {
          await spinner.screenshot({
            path: `${process.env.DKLA_ASK_SCREENSHOTS}/spinner-frame-${frame}.png`,
          });
          await page.waitForTimeout(150);
        }
    }
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    finishCanceledRequest();
    await expect(dialog.getByRole('status')).toHaveText('Search canceled.');
    await expect(dialog.locator('.ask-dottie')).toHaveCount(0);
    await expect(words).toBeHidden();
    await expect(input).toBeFocused();

    // Real progress from the server replaces the playful words; the status line announces only
    // the search starting and the citation check, not each site.
    await input.fill('Show me the progress');
    await input.press('Enter');
    await expect(spinner).toBeVisible();
    await expect(words).toHaveAttribute('data-kind', 'quip');
    const stream = (data) => page.evaluate((line) => window.dklaTestStream.line(line), data);
    await expect.poll(() => page.evaluate(() => Boolean(window.dklaTestStream))).toBe(true);
    await stream({ progress: { step: 'atlas', entries: 6, research: true } });
    await expect(words).toHaveText('Reading 6 Atlas entries…');
    await stream({ progress: { step: 'searching' } });
    await expect(words).toHaveText('Searching the web…');
    await expect(words).toHaveAttribute('data-kind', 'step');
    await expect(dialog.getByRole('status')).toHaveText('Searching the web…');
    await stream({ progress: { step: 'reading', domains: ['congress.gov'] } });
    await expect(words).toHaveText('Reading congress.gov…');
    // A real step stays; the playful words do not come back over it.
    await page.waitForTimeout(2300);
    await expect(words).toHaveText('Reading congress.gov…');
    await expect(dialog.getByRole('status')).toHaveText('Searching the web…');
    await stream({ progress: { step: 'checking' } });
    await expect(words).toHaveText('Checking citations…');
    await expect(dialog.getByRole('status')).toHaveText('Checking citations…');
    if (process.env.DKLA_ASK_SCREENSHOTS)
      await dialog.locator('.ask-progress').screenshot({
        path: `${process.env.DKLA_ASK_SCREENSHOTS}/spinner-step-${viewport.width}.png`,
      });
    await expect(answerArea).toBeEmpty();
    await stream({ answer: { ...rankingResponse } });
    await page.evaluate(() => window.dklaTestStream.end());
    // The spinner and the words are gone when the answer arrives.
    await expect(dialog.getByRole('status')).toHaveText('Answer ready. Web search completed.');
    await expect(spinner).toHaveCount(0);
    await expect(words).toBeHidden();
    await expect(answerArea).toContainText('HeinOnline placed Iqbal fifth');

    await input.fill('Why is the model unavailable?');
    await input.press('Enter');
    await expect(dialog.getByRole('status')).toContainText('unavailable here');
    await expectOnlyDottie('trouble');
    await context.setOffline(true);
    await input.fill('Can I ask while offline?');
    await input.press('Enter');
    await expect(dialog.getByRole('status')).toContainText('needs an internet connection');
    await expectOnlyDottie('trouble');
    assert.equal(asked, 7);
    // With reduced motion the opossums stand still in their ring; only the words change.
    await context.setOffline(false);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await input.fill('Can I cancel research?');
    await input.press('Enter');
    await expect(spinner).toBeVisible();
    assert.equal(
      await spinner.locator('.dottie-ring').evaluate((g) => getComputedStyle(g).animationName),
      'none',
    );
    const still = await words.textContent();
    await expect.poll(() => words.textContent(), { timeout: 5000 }).not.toBe(still);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    finishCanceledRequest();
    await expect(spinner).toHaveCount(0);
    assert.equal(asked, 8);
    // With reduced motion she appears in place, without the rise.
    await input.fill(question);
    await input.press('Enter');
    await expect(carrier).toHaveCount(1);
    assert.equal(await carrier.locator('svg').evaluate((svg) => getComputedStyle(svg).translate), '0px');
    assert.equal(
      await carrier.locator('svg').evaluate((svg) => getComputedStyle(svg).transitionDuration),
      '0s',
    );
    assert.equal(asked, 9);
    assert.equal(payloads.at(-1).history.length, 3);
    // A source in an earlier turn still opens its entry.
    const rankingTurn = dialog.locator('.ask-turn', { hasText: rankingQuestion });
    await rankingTurn.locator('summary').click();
    await rankingTurn.locator('button.ask-citation').first().click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('#inspector')).toContainText('Iqbal');
    await enterSearch('');
    await page.getByRole('button', { name: /Ask Dottie.*AI answer/ }).click();
    await expect(answerArea).toContainText('minimum contacts');
    await input.press('Escape');
    await expect(dialog).toBeHidden();
    await context.close();
  }
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ])
    await savedAnswersFlow(viewport);
  console.log(
    'Ask DKLA desktop and phone flow passed with a mocked model response, including saved answers.',
  );
} finally {
  await browser.close();
}

// Saved answers: a private library in this browser (saved.js), and answers
// served from the shared library on the server ("Saved answer from ...").
async function savedAnswersFlow(viewport) {
  const phone = viewport.width === 390;
  const context = await browser.newContext({
    viewport,
    isMobile: phone,
    hasTouch: phone,
    serviceWorkers: 'block',
  });
  const payloads = [];
  const libraryQuestion = 'What is the Erie doctrine?';
  const scopedQuestion = 'What did this case hold?';
  const followQuestion = 'And what about notice?';
  const fresh = {
    ...response,
    paragraphs: [{ text: 'A fresh answer: minimum contacts replaced presence.', citations: [2] }],
  };
  await context.route('**/*', async (route) => {
    const target = new URL(route.request().url());
    if (
      target.origin !== url.origin ||
      (target.pathname.startsWith('/api/') && target.pathname !== '/api/ask')
    )
      return route.fulfill({ status: 204 });
    if (target.pathname !== '/api/ask') return route.continue();
    const payload = route.request().postDataJSON();
    // The warm-up sent when the dialog opens (dottie-fix2): nothing but the flag.
    if (payload.warm) {
      assert.deepEqual(payload, { warm: true });
      return route.fulfill({ json: { warm: true } });
    }
    assert.ok(Object.keys(payload).every((key) => ['question', 'node', 'history', 'fresh'].includes(key)));
    payloads.push(payload);
    if (payload.fresh) {
      assert.equal(payload.fresh, true);
      return route.fulfill({ json: fresh });
    }
    if (payload.question === question) return route.fulfill({ json: response });
    if (payload.question === rankingQuestion) return route.fulfill({ json: rankingResponse });
    if (payload.question === scopedQuestion) return route.fulfill({ json: response });
    if (payload.question === followQuestion)
      return route.fulfill({
        json: { ...response, paragraphs: [{ text: 'Shoe asks about minimum contacts.', citations: [2] }] },
      });
    if (payload.question === libraryQuestion)
      return route.fulfill({
        json: { ...response, search: 'not-needed', cached: true, savedAt: '2026-11-03T15:00:00.000Z' },
      });
    return route.fulfill({ status: 503, json: { error: 'not-configured' } });
  });
  await context.addInitScript(() => localStorage.setItem('dkla.guide.v1', 'seen'));
  const page = await context.newPage();
  const boot = async () => {
    await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90_000 });
  };
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await boot();

  // The browser's normalisation agrees with the server library's.
  const samples = [
    question,
    'Please, can you explain how did International Shoe change Pennoyer??',
    'What’s the Erie doctrine?',
    'Diversity under 28 U.S.C. § 1332(a)(1) and Rule 12 (b)(6)',
    "Can't a state be sued in federal court? Thanks",
    'Hamer vs. Sidway, please.',
    'Can a minor void a contract for non-necessaries over $1,000 (UCC 2-207)?',
    'Does a contract need the word please',
    'Is the Internátional Shoe test “fair”? Thank you',
  ];
  const browserKeys = await page.evaluate(
    (list) => list.map((q) => window.DKLAAskSaved.normalise(q)),
    samples,
  );
  assert.deepEqual(
    browserKeys,
    samples.map((q) => normalise(q).key),
  );

  const bar = page.locator('.study-header .ask-bar');
  const dialog = page.getByRole('dialog', { name: 'Ask Dottie' });
  const answerArea = dialog.locator('.ask-answer');
  const input = dialog.locator('textarea');
  const opener = dialog.locator('.ask-saved-open');
  const save = answerArea.locator('.ask-save');
  const panel = dialog.locator('.ask-saved');
  const items = panel.locator('.ask-saved-item');
  const stored = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('dkla.askSaved.v1') || 'null')?.answers ?? []);
  const shot = async (name) => {
    if (!process.env.DKLA_ASK_SCREENSHOTS) return;
    await mkdir(process.env.DKLA_ASK_SCREENSHOTS, { recursive: true });
    await page.screenshot({
      path: `${process.env.DKLA_ASK_SCREENSHOTS}/saved-${name}-${viewport.width}.png`,
    });
  };
  const askNew = async (text) => {
    const again = dialog.getByRole('button', { name: 'New question' });
    if (await again.isVisible()) await again.click();
    await input.fill(text);
    await input.press('Enter');
  };

  await bar.click();
  await expect(dialog).toBeVisible();
  await expect(opener).toBeHidden(); // nothing saved yet
  await askNew(question);
  await expect(dialog.getByRole('status')).toHaveText('Answer ready.');
  await expect(save).toHaveText('Save answer');
  await expect(save).toHaveAttribute('aria-pressed', 'false');
  await save.click();
  await expect(save).toHaveText('✓ Saved');
  await expect(save).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.getByRole('status')).toContainText('Saved in this browser');
  const [kept] = await stored();
  assert.equal(kept.question, question);
  assert.deepEqual(kept.answer.paragraphs, response.paragraphs);
  assert.deepEqual(kept.answer.sources, response.sources);
  assert.match(kept.savedAt, /^\d{4}-\d\d-\d\dT/);
  await expect(opener).toHaveText('Saved answers (1)');
  await shot('answer');
  // Select again to un-save, then save once more.
  await save.click();
  await expect(save).toHaveText('Save answer');
  assert.equal((await stored()).length, 0);
  await save.click();
  await expect(save).toHaveText('✓ Saved');

  await page.waitForTimeout(5); // distinct savedAt times
  await askNew(rankingQuestion);
  await expect(dialog.getByRole('status')).toHaveText('Answer ready. Web search completed.');
  await save.click();
  await expect(opener).toHaveText('Saved answers (2)');
  assert.equal(payloads.length, 2);

  // The list: newest first, filtered by words in the question or answer.
  await opener.click();
  await expect(panel).toBeVisible();
  await expect(input).toBeHidden();
  await expect(items.locator('span')).toHaveText([rankingQuestion, question]);
  await expect(items.first().locator('small')).toContainText('3 sources');
  await shot('list');
  await panel.getByLabel('Filter saved answers').fill('minimum contacts');
  await expect(items.locator('span')).toHaveText([question]);
  await panel.getByLabel('Filter saved answers').fill('zzzz');
  await expect(items).toHaveCount(0);
  await expect(panel.locator('.ask-saved-empty')).toHaveText('No saved answer matches that filter.');
  await panel.getByRole('button', { name: 'Back to Ask Dottie' }).click();
  await expect(panel).toBeHidden();
  await expect(input).toBeVisible();

  // Still there after a reload.
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90_000 });
  await boot();
  await bar.click();
  await expect(opener).toHaveText('Saved answers (2)');
  await opener.click();
  await expect(items).toHaveCount(2);
  // Opening one shows it again with working citations, and Dottie as for any answer.
  await items.filter({ hasText: question }).click();
  await expect(panel).toBeHidden();
  await expect(answerArea.locator('.ask-asked')).toHaveText(question);
  await expect(answerArea.locator('.ask-from')).toContainText('From your saved answers');
  await expect(dialog.getByRole('status')).toHaveText('Answer from your saved answers.');
  await expect(answerArea).toContainText('minimum contacts');
  await expect(save).toHaveText('✓ Saved');
  const carrier = dialog.locator('.ask-sources-heading .ask-dottie[data-state="answer"]');
  await expect(carrier.locator('.dottie-joey')).toHaveCount(2);
  await expect(answerArea.locator('.ask-citation')).toHaveCount(2);
  await answerArea.locator('.ask-citation').first().click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('#inspector')).toContainText('Pennoyer v. Neff');
  assert.equal(payloads.length, 2, 'a saved answer is shown without asking the server');

  // Asking a saved question again shows the saved answer at once; Ask again asks afresh.
  const search = page.locator('#search');
  await search.focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Backspace');
  await page.getByRole('button', { name: /Ask Dottie.*AI answer/ }).click();
  await askNew('how did international shoe change pennoyer');
  await expect(dialog.getByRole('status')).toHaveText('Answer from your saved answers.');
  await expect(answerArea.locator('.ask-from')).toContainText(/From your saved answers .*· Ask again/);
  assert.equal(payloads.length, 2);
  await shot('recall');
  await answerArea.getByRole('button', { name: 'Ask again for a new answer' }).click();
  await expect(dialog.getByRole('status')).toHaveText('Answer ready.');
  assert.equal(payloads.length, 3);
  assert.deepEqual(payloads.at(-1), { question: 'how did international shoe change pennoyer', fresh: true });
  await expect(answerArea).toContainText('A fresh answer');
  await expect(answerArea.locator('.ask-from')).toHaveCount(0);
  await expect(dialog.locator('.ask-earlier')).toBeHidden(); // replaced, not a follow-up
  await expect(save).toHaveText('Save answer');

  // An answer from the shared library on the server.
  await askNew(libraryQuestion);
  await expect(dialog.getByRole('status')).toHaveText('Saved answer ready.');
  await expect(answerArea.locator('.ask-from')).toHaveText('Saved answer from Nov 3, 2026 · Ask fresh');
  assert.equal(payloads.at(-1).fresh, undefined);
  await expect(carrier.locator('.dottie-joey')).toHaveCount(2);
  await shot('library');
  await answerArea.getByRole('button', { name: /Ask fresh/ }).click();
  await expect(dialog.getByRole('status')).toHaveText('Answer ready.');
  assert.deepEqual(payloads.at(-1), { question: libraryQuestion, fresh: true });
  await expect(answerArea).toContainText('A fresh answer');
  await expect(answerArea.locator('.ask-from')).toHaveCount(0);

  // A full browser store: a polite message, nothing lost.
  await page.evaluate(() => {
    const original = (window.originalSetItem = Storage.prototype.setItem);
    Storage.prototype.setItem = function (key, value) {
      if (key === 'dkla.askSaved.v1') throw new DOMException('full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await save.click();
  await expect(dialog.getByRole('status')).toContainText('storage for DKLA is full');
  await expect(save).toHaveText('Save answer');
  assert.equal((await stored()).length, 2);
  await page.evaluate(() => (Storage.prototype.setItem = window.originalSetItem));

  // Deleting, which also lasts across a reload.
  await opener.click();
  await panel.getByRole('button', { name: 'Delete saved answer: ' + question }).click();
  await expect(items.locator('span')).toHaveText([rankingQuestion]);
  await expect(opener).toHaveText('Saved answers (1)');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90_000 });
  await boot();
  await bar.click();
  await expect(opener).toHaveText('Saved answers (1)');
  await opener.click();
  await panel.getByRole('button', { name: 'Delete saved answer: ' + rankingQuestion }).click();
  await expect(items).toHaveCount(0);
  await expect(panel.locator('.ask-saved-empty')).toContainText('No saved answers yet');
  await panel.getByRole('button', { name: 'Back to Ask Dottie' }).click();
  await expect(opener).toBeHidden();
  assert.equal(await page.evaluate(() => localStorage.getItem('dkla.askSaved.v1')), null);

  // "Ask again" asks about the saved answer's own entry, not the one open
  // now; a saved follow-up has no "Ask again" (it would lose its conversation).
  // Reopened from the search box, as above: on a phone the open entry covers the top bar.
  const reopen = async () => {
    await search.focus();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Backspace');
    await page.getByRole('button', { name: /Ask Dottie.*AI answer/ }).click();
    await expect(dialog).toBeVisible();
  };
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90_000 });
  await boot();
  await bar.click();
  await askNew(question);
  await expect(dialog.getByRole('status')).toHaveText('Answer ready.');
  await answerArea.locator('.ask-citation').first().click(); // opens Pennoyer
  await expect(dialog).toBeHidden();
  await expect(page.locator('#inspector')).toContainText('Pennoyer v. Neff');
  await reopen();
  await askNew(scopedQuestion);
  await expect(dialog.getByRole('status')).toHaveText('Answer ready.');
  assert.equal(payloads.at(-1).node, 'cp-pennoyer');
  await save.click();
  await expect(save).toHaveText('✓ Saved');
  await input.fill(followQuestion);
  await input.press('Enter');
  await expect(answerArea).toContainText('Shoe asks about minimum contacts.');
  assert.equal(payloads.at(-1).history.length, 1);
  await save.click();
  await expect(save).toHaveText('✓ Saved');
  const savedFollowUp = (await stored()).find((entry) => entry.question === followQuestion);
  assert.equal(savedFollowUp.after, scopedQuestion);
  await answerArea.locator('.ask-citation').first().click(); // now International Shoe is open
  await expect(dialog).toBeHidden();
  await expect(page.locator('#inspector')).toContainText('International Shoe');
  await reopen();
  await opener.click();
  await items.filter({ has: page.getByText(scopedQuestion, { exact: true }) }).click();
  await expect(answerArea.locator('.ask-from')).toContainText(/From your saved answers .*· Ask again/);
  const before = payloads.length;
  await answerArea.getByRole('button', { name: 'Ask again for a new answer' }).click();
  await expect(dialog.getByRole('status')).toHaveText('Answer ready.');
  assert.equal(payloads.length, before + 1);
  assert.deepEqual(payloads.at(-1), { question: scopedQuestion, node: 'cp-pennoyer', fresh: true });
  await opener.click();
  await items.filter({ has: page.getByText(followQuestion, { exact: true }) }).click();
  await expect(answerArea.locator('.ask-from')).toContainText('· follow-up to “' + scopedQuestion + '”');
  await expect(answerArea.getByRole('button', { name: /Ask again/ })).toHaveCount(0);
  await expect(save).toHaveText('✓ Saved'); // still recognised as the saved follow-up
  assert.equal(payloads.length, before + 1);
  await shot('follow-up');
  await context.close();
}
