/* The main views, compared with recorded pictures.

   Nothing pins the code any more, so a change is only as safe as what is
   looked at afterwards. This opens each main view in a real browser at a
   desktop and a phone size and compares what is drawn with a recorded picture
   (tools/verify/views/<platform>/). A part that moved, vanished, changed
   colour or lost its styling fails the pass and leaves the expected picture,
   the actual one and the difference in work/views/.

   Each view also has a plain check that does not depend on pictures (the panel
   is open and holds the expected words), so the views are still exercised on a
   system that has no recorded pictures. Pictures are only comparable on the
   system that made them: letter shapes differ between Windows and Linux. On
   Windows (the owner's machine) missing pictures fail the pass.

   After an intended visual change, look at the differences, then record new
   pictures and commit them:

     pnpm views:update

   Run against a local preview only. */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import coverage from './coverage/collect.cjs';
const url = process.env.DKLA_VIEWS_URL;
if (!url) throw new Error('Set DKLA_VIEWS_URL to the local preview page.');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname))
  throw new Error('Only a local preview is allowed.');

const recorded = fs.existsSync(new URL('./views/' + process.platform, import.meta.url));
// `pnpm views:update` sets this to record pictures on a system that has none yet.
const compare = recorded || !!process.env.DKLA_VIEWS_RECORD;
test.beforeAll(() => {
  if (!compare && process.platform === 'win32')
    throw new Error('The recorded pictures in tools/verify/views/win32 are missing.');
  if (!compare)
    console.log(
      `No recorded pictures for ${process.platform}: the views were opened and checked, but not compared with pictures.`,
    );
});

const sizes = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844, isMobile: true, hasTouch: true },
];

async function closeAll(page) {
  await page.evaluate(() => {
    window.DKLAColdCall?.close();
    window.DKLAStudy?.close();
    if (window.SCOTUSHistory?.state().open) window.SCOTUSHistory.close();
    for (const d of document.querySelectorAll('dialog[open]')) d.close();
    const search = document.getElementById('search');
    if (search?.value) {
      search.value = '';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      search.blur();
    }
    document.activeElement?.blur?.();
    const menu = document.getElementById('moreMenu');
    if (menu && !menu.hidden) document.getElementById('moreBtn')?.click();
  });
}

for (const size of sizes)
  test(`main views, ${size.name}`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      isMobile: !!size.isMobile,
      hasTouch: !!size.hasTouch,
      serviceWorkers: 'block',
    });
    // Nothing leaves this machine, and the visitor counter is not contacted.
    await context.route('**/*', (route) => {
      const u = new URL(route.request().url());
      return u.origin !== new URL(url).origin || u.pathname.startsWith('/api/')
        ? route.fulfill({ status: 204, body: '' })
        : route.continue();
    });
    await context.addInitScript(() => localStorage.setItem('dkla.guide.v1', 'seen'));
    const page = await context.newPage();
    // A view that never opens fails in seconds instead of waiting out the whole test.
    page.setDefaultTimeout(15000);
    await coverage.start(page);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90000 });
    await page.waitForFunction(() => window.LegalAtlas?.ready && window.DKLAColdCall && window.DKLAStudy);
    await page.evaluate(() => document.fonts.ready);

    const picture = async (name, options = {}) => {
      if (!compare) return;
      await expect.soft(page, name).toHaveScreenshot(`${size.name}-${name}.png`, options);
    };
    const view = async (name, open, check, options) =>
      test.step(name, async () => {
        const began = Date.now();
        await closeAll(page);
        await open();
        await check();
        await picture(name, options);
        if (process.env.DKLA_VIEWS_TIMING) console.log(size.name, name, Date.now() - began);
      });
    const go = (hash) =>
      page.evaluate((hash) => {
        location.hash = hash;
      }, hash);
    const inspector = page.locator('#inspector');

    await view(
      'home',
      async () => {
        await page.locator('#geoBreadcrumb [data-study-scope="Atlas"]').click();
      },
      async () => {
        await expect(page.locator('#geoCanvas g.map-region path[data-map-region]').first()).toBeAttached();
        await expect(page.locator('#geoCanvas [data-dkla-court]')).toBeAttached();
      },
    );
    await view(
      'subject',
      () => page.evaluate(() => LegalAtlas.navigate('region', 'consideration')),
      () => expect(page.locator('#geoBreadcrumb')).toContainText('Consideration'),
    );
    await view(
      'case',
      () => go('node=cp-pennoyer'),
      async () => {
        await expect(inspector).toContainText('Pennoyer');
        // The reading layout (src/features/v25/reading.js) rebuilt the case header.
        await expect(inspector.locator('.reader-body.v25-case-reader > .v25-record-header')).toBeVisible();
        await expect(inspector.locator('.v25-record-actions [data-cold-call="cp-pennoyer"]')).toBeVisible();
        await expect(inspector.locator('.v25-record-actions [data-v25-full-brief]')).toBeVisible();
      },
    );
    await view(
      'full-brief',
      async () => {
        await go('node=cp-pennoyer');
        await inspector.locator('[data-v25-full-brief]').click();
      },
      async () => {
        const full = inspector.locator('.r19-brief .r19-full:not(.r19-auditbox)').first();
        await expect(full).toHaveAttribute('open', '');
        await expect(full).toBeInViewport();
        await expect
          .poll(async () => (await full.innerText()).length, { message: 'the full brief has its text' })
          .toBeGreaterThan(1500);
      },
    );
    await view(
      'cold-call',
      async () => {
        await go('node=cp-pennoyer');
        await inspector.locator('[data-cold-call="cp-pennoyer"]').click();
      },
      async () => {
        await expect(page.locator('#coldCallDialog')).toHaveAttribute('open', '');
        await expect
          .poll(() => page.locator('#ccNarrative .cc-section > p:not(.cc-kicker)').count())
          .toBeGreaterThan(5);
      },
    );
    await view(
      'dictionary',
      async () => {
        await go('term=consideration');
        await page.locator('#glossaryDialog[open]').waitFor();
        await page.locator('#glFind').fill('consideration');
        await page.locator('#glossaryDialog [data-term="consideration"]').click();
      },
      () => expect(page.locator('.gl-detail')).toContainText(/consideration/i),
    );
    await view(
      'authority',
      () => page.evaluate(() => DKLAAuthorities.open('frcp-4')),
      () => expect(inspector).toContainText('Summons'),
    );
    await view(
      'timeline',
      () => page.evaluate(() => DKLATimelines.open(DKLATimelines.list()[0].id)),
      async () => {
        await expect(page.locator('#r21Timelines')).toHaveAttribute('open', '');
        await expect
          .poll(async () => (await page.locator('#r21Body').innerText()).length)
          .toBeGreaterThan(200);
      },
    );
    await view(
      'source-page',
      async () => {
        await go('book=1');
        await page.locator('#bookDialog[open]').waitFor();
      },
      async () => {
        await expect
          .poll(async () => (await page.locator('#bookDialog').innerText()).length)
          .toBeGreaterThan(30);
      },
    );
    await view(
      'search',
      async () => {
        // On a phone the search box is a small square that widens when touched.
        await page.locator('#search').focus();
        await page.keyboard.type('personal jurisdiction');
      },
      async () => {
        await expect(page.locator('#searchResults')).toBeVisible();
        await expect(page.locator('#searchResults button').first()).toBeVisible();
      },
      // While the search box has the keyboard, the map behind it keeps redrawing
      // and about one run in four never held still for a picture. This view is
      // about the results panel; the map is compared in the other views.
      { mask: [page.locator('#geoCanvas')] },
    );
    await view(
      'scotus-court',
      () => page.evaluate(() => SCOTUSHistory.open()),
      async () => {
        expect(await page.evaluate(() => SCOTUSHistory.state().open)).toBe(true);
        await expect(page.getByRole('heading', { name: 'The Court on this date' })).toBeVisible();
      },
    );
    await view(
      'scotus-seat',
      () => page.evaluate(() => SCOTUSHistory.seat(SCOTUSHistory.data.seats[0].id)),
      async () => {
        expect(await page.evaluate(() => SCOTUSHistory.state().open)).toBe(true);
      },
    );
    await view(
      'study-drill',
      () => page.evaluate(() => DKLAStudy.open('drill')),
      () => expect(page.locator('#r18Dialog')).toHaveAttribute('data-tab', 'drill'),
    );
    await view(
      'study-progress',
      async () => {
        await page.evaluate(() => DKLAStudy.open('drill'));
        await page.locator('[data-r18-tab="progress"]').click();
      },
      async () => {
        await expect(page.locator('#r18Dialog')).toHaveAttribute('data-tab', 'progress');
        await expect(page.locator('#r18Dialog')).toContainText('Unrated');
      },
    );
    await view(
      'more-menu',
      () => page.locator('#moreBtn').click(),
      async () => {
        await expect(page.locator('#moreMenu')).toBeVisible();
        await expect(page.locator('#moreMenu')).toContainText('Doctrine timelines');
      },
    );
    // An old link opened cold: the address already names a dictionary term when
    // the page starts, so the route is read while the app is still loading.
    // (A cold `#node=` link currently lands on Home instead of the entry; that
    // was so before this check existed and is recorded in docs/HANDOFF.md.)
    await test.step('deep-link', async () => {
      // Leave the page first: changing only the part after # would not reload it.
      await page.goto(new URL('/version.json', url).href);
      await page.goto(url + '#term=consideration', { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90000 });
      await page.waitForFunction(() => window.LegalAtlas?.ready && window.DKLAColdCall && window.DKLAStudy);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('#glossaryDialog')).toHaveAttribute('open', '');
      await expect(page.locator('#glossaryDialog')).toContainText(/consideration/i);
      await picture('deep-link');
    });
    await closeAll(page);
    await coverage.stop(page, 'views-' + size.name);
    expect(errors, 'errors thrown by the page').toEqual([]);
    await context.close();
  });
