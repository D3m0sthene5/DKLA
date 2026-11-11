import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

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
    assert.ok(hangBox.y < edge && hangBox.y > edge - 12, 'her tail wraps the bottom edge of the bar');
    assert.ok(hangBox.y + hangBox.height > edge + 30, 'she dangles over the page');
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
      await expect(clock.locator('.ny-date')).toContainText('NYC');
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
  console.log('Ask DKLA desktop and phone flow passed with a mocked model response.');
} finally {
  await browser.close();
}
