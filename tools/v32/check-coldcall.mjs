/* Cold Call in a real browser (v3.2): the story to read, the rehearsal as a deliberate choice.

     node tools/v32/check-coldcall.mjs http://127.0.0.1:8766/DKLA-v3.1.html

   What a reader sees at 1440 x 900, and what the keys do:

   - before the narratives arrive, the index says it cannot count yet (count() is null), and it lists 742
     once they are in;
   - Read (the default, DEFAULT_MODE in src/features/cold-call/reader.js): one click and the page holds the
     whole story. The setup is its top (the composed caption, the citation in the readout face, the case's
     drawing at 48 px or more, the lead, every actor with a role, the steps through the courts numbered) and
     the first episode follows directly: no button stands before the story, and Space scrolls into it. Each
     episode is headed by its own title, at a headline's size and weight; the professor's question is a
     small quiet note that is not a heading. Once the setup has scrolled away the bar carries the case's
     drawing and caption. The full brief is one press away at the foot;
   - resume: a case left mid-read opens at the same place after a reload; finishing it clears the place;
   - Rehearse: one prompt at a time, with the control that shows the narration directly under it and
     nothing imitating hidden text; Space and Enter show and move on; the reveal leads with the stored
     answer, each sentence found word for word in the episode, then the title and the narration; a sentence
     that is not in the episode is never shown, and an episode with no stored answer shows its narration and
     nothing more; the list at the side shows prompts before and after a reveal; the case stays in the bar;
     narrations marked a slice at a time equal those marked at once;
   - keys: Left and Right move between steps, Escape closes, Tab stays inside, and focus goes back to the
     control that opened the reader;
   - the choice of Read or Rehearse is remembered under its own key; besides it only the place in a case
     left mid-read is written;
   - the end: what the case does not decide, the sources, the ways out;
   - an account with a field missing draws without it and without its heading;
   - the library: every account under its course, each map case with its drawing at 40 px, supporting
     cases told apart, subject names in the rail never cut, a year and "5 episodes" on each row, filtered by
     typing, a row opens its account and closing comes back; no row wears the frost of the button on a case
     page;
   - typesetting: no line of any of the 742 captions ends in "v." at seven widths, and the composition
     lint (tools/v32/composition.mjs) finds no caption, headline or prompt broken badly across a
     continuous resize; reading text is 17 px at 50 to 70 characters a line and 7:1 on its plane; readouts
     are 13 px in the mono face at weight 500;
   - the shell: radius 12, one 36 px close button with a 44 px target, no backdrop-filter, and nothing
     still animating once the reader has arrived. */
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { composition, sweep } from './composition.mjs';

const address = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(address.hostname), 'local preview only');
const TOTAL = 742,
  MODE_KEY = 'dkla.coldCallMode.v1',
  RESUME_KEY = 'dkla.coldCallResume.v1',
  NO_ANSWERS = 'cp-garcia', // prompts that are not questions, and no stored answers
  LONG_TITLE = 'anderson-binance',
  TYPICAL = 'citoh', // three actors, three steps, five episodes, a drawing
  TALLEST = 'brief-LRS-CLOSURE-006', // seven actors
  LONG_CAPTIONS = ['lrs-n-standing-sffa', 'lrs-n-adapso-board', 'brief-CP-COMP-CB-CAP-368', 'cohen-cowles'],
  LONG_PROMPT = 'cp-doehr',
  TWO_LIMITS = 'brief-CT-NEXT-CM-0145';
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  serviceWorkers: 'block',
});
// The narratives are held back until the check lets them through (hosted page: assets/data/<hash>.json).
let release;
const held = new Promise((resolve) => (release = resolve));
await context.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  if (url.origin !== address.origin || url.pathname.startsWith('/api/'))
    return route.fulfill({ status: 204, body: '' });
  if (url.pathname.includes('/assets/data/')) await held;
  return route.continue().catch(() => {});
});
await context.addInitScript(() => {
  try {
    localStorage.setItem('dkla.guide.v1', 'seen');
  } catch {
    /* the blank page between two loads has no storage */
  }
});
const page = await context.newPage();
page.setDefaultTimeout(30_000);
const errors = [];
const passed = [];
page.on('pageerror', (error) => errors.push(error.message));
const boot = async (hash = '') => {
  await page.goto(address.href + hash, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90_000 });
  await page.waitForFunction(
    () => window.LegalAtlas?.ready && window.DKLAColdCall && window.DKLAColdCallIndex,
  );
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const state = () => page.evaluate(() => window.DKLAColdCall.state());
// Open an account through the reader's own entry point and wait until its definitions are in.
const open = async (id, mode) => {
  await page.evaluate(
    async ({ id, mode }) => {
      window.DKLAColdCall.close();
      if (mode) window.DKLAColdCall.setMode(mode);
      window.DKLAColdCall.open(id);
      await window.DKLAColdCall.marked();
    },
    { id, mode },
  );
  await page.locator('#coldCallDialog[open] #ccNarrative').waitFor();
};
const shown = (selector) =>
  page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  }, selector);

try {
  /* ---------- before the narratives arrive ---------- */
  await boot(`#node=${TYPICAL}`);
  const lazy = await page.evaluate(() => window.DKLAData.isLazy('dklaColdCallData'));
  if (lazy) {
    assert.equal(await page.evaluate(() => window.DKLAColdCall.loaded()), false);
    assert.equal(
      await page.evaluate(() => window.DKLAColdCallIndex.count()),
      null,
      'count() before the data',
    );
    await page.evaluate(() => window.DKLAColdCallIndex.open());
    assert.match(
      await page.locator('#coldCallIndexDialog[open] .cc-loading').innerText(),
      /Loading Cold Calls/,
    );
    release();
    await page.locator('#coldCallIndexDialog[open] .cc-ix-row').first().waitFor();
    await page.evaluate(() => window.DKLAColdCallIndex.close());
    passed.push(
      'before the narratives arrive count() is null and the index waits; it fills when they are in',
    );
  } else release();
  await page.evaluate(() => window.DKLAColdCall.whenLoaded());
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => window.DKLAColdCallIndex.count()), TOTAL, 'count()');
  const storageBefore = await page.evaluate(() => Object.keys(localStorage).sort());
  assert.ok(!storageBefore.includes(MODE_KEY), 'a first visit has no remembered mode');

  /* ---------- Read: one click, and the story is on the page ---------- */
  const launch = page.locator(`#inspector button[data-cold-call="${TYPICAL}"]`);
  await launch.waitFor();
  await launch.click();
  await page.locator('#coldCallDialog[open] #ccNarrative').waitFor();
  await page.evaluate(() => window.DKLAColdCall.marked());
  await page.mouse.move(4, 4); // off the text: a pointer resting on a defined word opens its card
  assert.equal(await page.evaluate(() => window.DKLAColdCall.defaultMode), 'read', 'the default is Read');
  assert.equal(await page.evaluate(() => window.DKLAColdCall.readOpensAt), 'setup');
  assert.deepEqual(
    await state().then((s) => [s.id, s.mode, s.step, s.origin]),
    [TYPICAL, 'read', 0, 'case'],
    'a first visit opens at the top of the page, to be read',
  );
  const account = await page.evaluate(async (id) => {
    const data = await window.DKLAData.json('dklaColdCallData');
    return data.cases.find((c) => c.id === id);
  }, TYPICAL);
  const cues = account.sections.map((s) => s.cue),
    titles = account.sections.map((s) => s.title);
  const setup = await page.evaluate(() => {
    const d = document.getElementById('coldCallDialog'),
      box = (el) => el?.getBoundingClientRect(),
      vis = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden',
      text = (sel) => [...d.querySelectorAll(sel)].map((el) => el.textContent.replace(/\s+/g, ' ').trim()),
      style = (sel) => getComputedStyle(d.querySelector(sel)),
      scroll = d.querySelector('#ccScroll');
    return {
      caption: text('.cc-caption')[0],
      cite: text('.cc-cite')[0],
      citeFace: style('.cc-cite').fontFamily,
      lead: text('.cc-lead')[0],
      leadSize: parseFloat(style('.cc-lead').fontSize),
      names: text('.cc-cast dt'),
      roles: text('.cc-cast dd'),
      steps: text('.cc-path li'),
      numbered: getComputedStyle(d.querySelector('.cc-path li'), '::before').content,
      art: box(d.querySelector('.cc-setup .cc-plate .cc-pict')).width,
      artFills: (() => {
        const b = d.querySelector('.cc-setup .cc-plate .cc-pict').getBBox();
        return Math.max(b.width, b.height) / 24;
      })(),
      // No step stands before the story: the first episode is the next thing on the same page.
      gapToStory: Math.round(
        box(d.querySelector('.cc-section')).top - box(d.querySelector('.cc-setup')).bottom,
      ),
      episodesOnPage: [...d.querySelectorAll('.cc-section')].filter((s) => s.getClientRects().length).length,
      scrolls: scroll.scrollHeight > scroll.clientHeight * 2,
      action: vis(d.querySelector('#ccAct')),
      primaries: [...d.querySelectorAll('.cc-button.cc-primary')].filter(vis).length,
      switches: text('.cc-mode .cc-seg'),
      pressed: d.querySelector('.cc-seg[aria-pressed="true"]').textContent,
      fullBrief: vis(d.querySelector('#ccFullBrief')) && d.querySelector('#ccFullBrief').textContent.trim(),
      barCase: vis(d.querySelector('.cc-bar-case')),
      barKind: vis(d.querySelector('.cc-bar-kind')),
      focus: document.activeElement?.id,
      focusInStory: scroll.contains(document.activeElement),
    };
  });
  assert.equal(setup.caption, account.title.replace(/\s+/g, ' '), 'the caption says the title, every word');
  assert.equal(setup.cite, account.citation);
  assert.match(setup.citeFace, /Mono/, 'the citation is in the readout face');
  assert.equal(setup.lead, account.lead, 'the lead');
  assert.equal(setup.leadSize, 22, 'the lead is set large');
  assert.deepEqual(
    setup.names,
    account.actors.map((a) => a.name),
    'the cast',
  );
  assert.deepEqual(
    setup.roles,
    account.actors.map((a) => a.role),
    'their roles',
  );
  assert.deepEqual(setup.steps, account.proceedings, 'how it got here');
  assert.match(setup.numbered, /counter\(cc-path\)/, 'the steps are numbered');
  assert.ok(setup.art >= 48, `the drawing is ${setup.art} px`);
  assert.ok(setup.artFills >= 0.6, 'the drawing fills its box');
  assert.ok(setup.gapToStory >= 0 && setup.gapToStory <= 64, 'the first episode follows the setup directly');
  assert.equal(setup.episodesOnPage, account.sections.length, 'every episode is on the page from the start');
  assert.ok(setup.scrolls, 'the page scrolls on into the story');
  assert.ok(
    !setup.action && setup.primaries === 0,
    'Read: no button stands between the reader and the story',
  );
  assert.deepEqual(setup.switches, ['Read', 'Rehearse']);
  assert.equal(setup.pressed, 'Read');
  assert.equal(setup.fullBrief, 'Full brief', 'the full brief is one press away');
  assert.ok(
    setup.barKind && !setup.barCase,
    'the bar does not repeat the caption while the setup shows it large',
  );
  assert.ok(
    setup.focusInStory && setup.focus === 'ccCaption',
    'focus is in the story, so the keys scroll it',
  );
  // Space, as on any page, moves down into the story; nothing had to be pressed first.
  await page.keyboard.press('Space');
  await page.waitForFunction(() => document.getElementById('ccScroll').scrollTop > 200);
  await page.waitForFunction(() => window.DKLAColdCall.state().step === 1);
  await page.evaluate(() => (document.getElementById('ccScroll').scrollTop = 0));
  await page.waitForFunction(() => window.DKLAColdCall.state().step === 0);
  passed.push(
    'Read, one click: caption, drawing, lead, cast and numbered steps, then the story on the same page with no button before it',
  );

  // The story leads: an episode's own title is the headline; the question is a quiet note, not a heading.
  const read = await page.evaluate(() => {
    const d = document.getElementById('coldCallDialog'),
      vis = (el) => !!el && el.getClientRects().length > 0,
      px = (el, p) => parseFloat(getComputedStyle(el)[p]);
    return [...d.querySelectorAll('.cc-section')].map((s) => {
      const title = s.querySelector('.cc-title'),
        cue = s.querySelector('.cc-cue'),
        p = s.querySelector('.cc-answer > p');
      return {
        title: vis(title) && title.textContent,
        titleTag: title.tagName,
        titleSize: px(title, 'fontSize'),
        titleWeight: px(title, 'fontWeight'),
        cue: vis(cue) ? cue.lastChild.textContent.trim() : '',
        cueTag: cue.tagName,
        cueSize: px(cue, 'fontSize'),
        cueColour: getComputedStyle(cue).color,
        bodyColour: getComputedStyle(p).color,
        bodySize: px(p, 'fontSize'),
        paragraphs: [...s.querySelectorAll('.cc-answer > p')].filter(vis).length,
        titleFirst:
          title.getBoundingClientRect().bottom <= p.getBoundingClientRect().top &&
          title.getBoundingClientRect().top <= cue.getBoundingClientRect().top,
        cover: vis(s.querySelector('.cc-cover')),
        direct: vis(s.querySelector('.cc-direct')),
      };
    });
  });
  assert.equal(read.length, account.sections.length);
  read.forEach((s, i) => {
    assert.equal(s.title, titles[i], `Read: episode ${i + 1} is headed by its own title`);
    assert.equal(s.titleTag, 'H3');
    assert.ok(
      s.titleSize >= 28 && s.titleWeight >= 600,
      `Read: the title is a headline (${s.titleSize} px, ${s.titleWeight})`,
    );
    assert.equal(s.cue, cues[i], `Read: the question for episode ${i + 1} is there`);
    assert.notEqual(s.cueTag[0], 'H', 'Read: the question is not a heading');
    assert.ok(s.cueSize <= 14 && s.cueSize < s.bodySize, `Read: the question is a note (${s.cueSize} px)`);
    assert.notEqual(s.cueColour, s.bodyColour, 'Read: the question is quieter than the narration');
    assert.ok(s.titleFirst, `Read: the title comes first in episode ${i + 1}`);
    assert.ok(s.paragraphs >= account.sections[i].paragraphs.length, `Read: narration ${i + 1}`);
    assert.ok(!s.cover && !s.direct, 'Read: nothing is covered, and nothing of the quiz is shown');
  });
  // Keys while reading: Right and Left move between steps; the list marks where you are.
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => window.DKLAColdCall.state().step === 1);
  await sleep(450);
  assert.equal(
    await page.locator('#coldCallDialog .cc-nav-go[aria-current]').count(),
    1,
    'one "you are here"',
  );
  assert.match(await page.locator('#ccProgress').innerText(), /Episode 1 of 5/, 'a quiet "1 of 5"');
  assert.equal(
    await page.evaluate(() => document.activeElement?.className),
    'cc-title',
    'focus is on the title',
  );
  // The case is still in sight: its drawing and its caption are in the bar.
  const docked = await page.evaluate(() => {
    const d = document.getElementById('coldCallDialog'),
      name = d.querySelector('.cc-bar-name'),
      art = d.querySelector('.cc-bar .cc-pict');
    return {
      shown: getComputedStyle(d.querySelector('.cc-bar-case')).visibility === 'visible',
      name: name.textContent.replace(/\s+/g, ' ').trim(),
      size: parseFloat(getComputedStyle(name).fontSize),
      face: getComputedStyle(name).fontFamily,
      colour: getComputedStyle(name).color,
      muted: getComputedStyle(d.querySelector('.cc-bar-label')).color,
      art: art ? art.getBoundingClientRect().width : 0,
      headGone:
        d.querySelector('.cc-head').getBoundingClientRect().bottom <
        d.querySelector('#ccScroll').getBoundingClientRect().top,
    };
  });
  assert.ok(docked.headGone && docked.shown, 'once the setup has scrolled away the bar carries the case');
  assert.equal(docked.name, account.title.replace(/\s+/g, ' '));
  assert.ok(
    docked.size >= 19 && /Exo/.test(docked.face) && docked.colour !== docked.muted,
    'its caption, legible',
  );
  assert.ok(docked.art >= 36, `its drawing, at ${docked.art} px`);
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => window.DKLAColdCall.state().step === 2);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(() => window.DKLAColdCall.state().step === 0);
  // Tab stays inside the reader.
  for (let i = 0; i < 30; i++) await page.keyboard.press('Tab');
  assert.ok(
    await page.evaluate(() => document.getElementById('coldCallDialog').contains(document.activeElement)),
    'Tab left the reader',
  );
  // The full brief opens over the reader from the foot, and comes back.
  await page.locator('#ccFullBrief').click();
  await page.locator('#ccBriefDialog[open]').waitFor();
  await page.locator('#ccBriefClose').click();
  assert.ok(await page.evaluate(() => document.getElementById('coldCallDialog').open));
  passed.push(
    'Read: each title is the headline and the question a note beside it; the case stays in the bar; arrows move, Tab stays inside, the full brief is at the foot',
  );

  // Resume. Left in the middle of the third episode: the next opening, after a reload, is there again.
  await page.locator('#coldCallDialog [data-cc-go="3"]').click();
  await page.waitForFunction(() => window.DKLAColdCall.state().step === 3);
  await sleep(450);
  await page.evaluate(() => (document.getElementById('ccScroll').scrollTop += 120));
  await sleep(150);
  const left = await page.evaluate(() => {
    const t = document.querySelector('#coldCallDialog .cc-section[data-cc-step="3"] .cc-title');
    return Math.round(
      t.getBoundingClientRect().top - document.getElementById('ccScroll').getBoundingClientRect().top,
    );
  });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.getElementById('coldCallDialog').open);
  assert.equal(
    await page.evaluate(() => document.activeElement?.dataset?.coldCall),
    TYPICAL,
    'Escape closes and focus returns to the Cold call button',
  );
  const kept = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), RESUME_KEY);
  assert.deepEqual(Object.keys(kept), [TYPICAL], 'one small entry for the case left mid-read');
  assert.equal(kept[TYPICAL][0], 3);
  await page.goto('about:blank');
  await boot(`#node=${TYPICAL}`);
  await page.evaluate(() => window.DKLAColdCall.whenLoaded());
  await launch.click();
  await page.locator('#coldCallDialog[open] #ccNarrative').waitFor();
  await page.mouse.move(4, 4);
  const back = await page.evaluate(() => {
    const t = document.querySelector('#coldCallDialog .cc-section[data-cc-step="3"] .cc-title');
    return {
      step: window.DKLAColdCall.state().step,
      top: Math.round(
        t.getBoundingClientRect().top - document.getElementById('ccScroll').getBoundingClientRect().top,
      ),
      docked: document.getElementById('coldCallDialog').hasAttribute('data-cc-docked'),
    };
  });
  assert.equal(back.step, 3, 'resumed at the episode he was reading');
  assert.ok(Math.abs(back.top - left) <= 4, `at the same place (${back.top} px against ${left})`);
  assert.ok(back.docked, 'with the case in the bar');
  // The end: what the case does not decide, the sources, the ways out. Reaching it finishes the case.
  await page.locator('#coldCallDialog [data-cc-go="6"]').click();
  await page.waitForFunction(() => window.DKLAColdCall.state().step === 6);
  await sleep(450);
  const end = await page.evaluate(() => {
    const d = document.getElementById('coldCallDialog'),
      f = d.querySelector('.cc-finish'),
      inView = (el) => {
        const r = el.getBoundingClientRect(),
          s = d.querySelector('#ccScroll').getBoundingClientRect();
        return r.height > 0 && r.top >= s.top && r.top < s.bottom;
      };
    return {
      heading: f.querySelector('.cc-finish-title').textContent,
      headingInView: inView(f.querySelector('.cc-finish-title')),
      limits: [...f.querySelectorAll('.cc-limits > p')].map((p) => p.textContent),
      sources: [...f.querySelectorAll('.cc-source-list .cc-row')].map((r) => r.textContent.trim()),
      next: f.querySelector('[data-cc-open]')?.dataset.ccOpen || '',
      nextIsButton: !!f.querySelector('button[data-cold-call]'),
      act: d.querySelector('#ccAct').innerText.trim(),
      after:
        f.compareDocumentPosition(d.querySelector('.cc-section:last-of-type')) &
        Node.DOCUMENT_POSITION_PRECEDING,
    };
  });
  assert.equal(end.heading, 'What this case does not decide');
  assert.ok(end.headingInView, 'the end is brought into view');
  assert.deepEqual(end.limits, [account.limits].flat(), 'limits at the end');
  assert.ok(end.after, 'the end comes after the last episode');
  assert.deepEqual(end.sources, ['Full brief'], 'the sources');
  assert.ok(end.next && end.next !== TYPICAL, 'the next case in the same group is offered');
  assert.ok(!end.nextIsButton, 'only the entry control on a case page is a frosted button');
  assert.equal(end.act, 'Back to the case', 'the way out at the end says where it leads');
  await page.locator('#ccAct').click();
  await page.waitForFunction(() => !document.getElementById('coldCallDialog').open);
  assert.equal(
    await page.evaluate((k) => localStorage.getItem(k), RESUME_KEY),
    null,
    'finishing a case clears its place',
  );
  await launch.click();
  await page.locator('#coldCallDialog[open] #ccNarrative').waitFor();
  assert.equal((await state()).step, 0, 'a finished case opens at the top again');
  await page.evaluate(() => window.DKLAColdCall.close());
  passed.push(
    'a case left mid-read is resumed at the same place after a reload; finishing it clears the place',
  );
  passed.push('the end: what the case does not decide, the sources, the next case, and back');

  // Two limits are two paragraphs.
  await open(TWO_LIMITS, 'read');
  assert.equal(await page.locator('#coldCallDialog .cc-limits > p').count(), 2);
  await page.evaluate(() => window.DKLAColdCall.close());
  await page.evaluate((k) => localStorage.removeItem(k), MODE_KEY); // open() above set it through setMode()

  /* ---------- Rehearse ---------- */
  await launch.click();
  await page.locator('#coldCallDialog[open] #ccNarrative').waitFor();
  await page.mouse.move(4, 4);
  await page.locator('#coldCallDialog .cc-seg[data-cc-mode-set="rehearse"]').click();
  assert.equal(
    await page.evaluate((k) => localStorage.getItem(k), MODE_KEY),
    'rehearse',
    'the choice is remembered',
  );
  assert.equal(
    await page
      .locator('#ccAct')
      .innerText()
      .then((t) => t.trim()),
    'Start rehearsing',
  );
  assert.equal(await page.locator('#coldCallDialog .cc-seg[aria-pressed="true"]').innerText(), 'Rehearse');
  const stored = await page.evaluate((id) => window.DKLAColdCallAnswers.answers[id], TYPICAL);
  assert.equal(
    Object.keys(stored).length,
    account.sections.length,
    `${TYPICAL} has an answer for every question`,
  );
  const rehearsal = () =>
    page.evaluate(() => {
      const d = document.getElementById('coldCallDialog'),
        vis = (el) => !!el && el.getClientRects().length > 0,
        top = (el) => el.getBoundingClientRect().top,
        st = window.DKLAColdCall.state(),
        s = d.querySelector(`.cc-section[data-cc-step="${st.step}"]`),
        cue = s?.querySelector('.cc-cue'),
        reveal = s?.querySelector('.cc-reveal'),
        cover = s?.querySelector('.cc-cover'),
        direct = s?.querySelector('.cc-direct'),
        title = s?.querySelector('.cc-title'),
        answer = s?.querySelector('.cc-answer');
      return {
        step: st.step,
        revealed: st.revealed,
        sectionsShown: [...d.querySelectorAll('.cc-section')].filter(vis).length,
        setupShown: vis(d.querySelector('.cc-setup')),
        cue: vis(cue) ? cue.lastChild.textContent.trim() : '',
        cueSize: cue ? parseFloat(getComputedStyle(cue).fontSize) : 0,
        cueLabel: vis(cue?.querySelector('.cc-cue-label')),
        title: vis(title),
        answer: vis(answer),
        cover: vis(cover),
        // The control that shows the narration: where the reader is looking, just under the prompt.
        reveal: vis(reveal) ? reveal.innerText.replace(/\s+/g, ' ').trim() : '',
        revealBelowCue: vis(reveal) ? Math.round(top(reveal) - cue.getBoundingClientRect().bottom) : null,
        revealAligned: vis(reveal)
          ? Math.round(reveal.getBoundingClientRect().left - cue.getBoundingClientRect().left)
          : null,
        // Nothing imitates text that is not there: the concealed state is the prompt, the control and a hint.
        coverPaint: cover ? getComputedStyle(cover).backgroundImage : '',
        coverHeight: vis(cover) ? Math.round(cover.getBoundingClientRect().height) : 0,
        coverAnimates: cover ? cover.getAnimations({ subtree: true }).length : 0,
        direct: vis(direct) ? [...direct.querySelectorAll('.cc-direct-say')].map((p) => p.textContent) : null,
        directSize: vis(direct)
          ? parseFloat(getComputedStyle(direct.querySelector('.cc-direct-say')).fontSize)
          : 0,
        order:
          vis(direct) && vis(title)
            ? [top(cue), top(direct), top(title), top(answer)]
            : vis(title)
              ? [top(cue), top(title), top(answer)]
              : [],
        nav: [...d.querySelectorAll('.cc-nav-row[data-cc-nav]')]
          .map((row) =>
            [...row.querySelectorAll('.cc-nav-cue, .cc-nav-title')]
              .filter(vis)
              .map((el) => el.textContent)
              .join('|'),
          )
          .slice(1, -1),
        ticks: [...d.querySelectorAll('.cc-nav-row[data-cc-nav]')]
          .slice(1, -1)
          .map((row) => getComputedStyle(row, '::after').content !== 'none'),
        tooltips: [...d.querySelectorAll('.cc-nav-go[id]')].map((b) => b.title),
        act: vis(d.querySelector('#ccAct'))
          ? d.querySelector('#ccAct').innerText.replace(/\s+/g, ' ').trim()
          : '',
        live: d.querySelector('#ccLive').textContent,
        focus: document.activeElement?.className || document.activeElement?.id,
        barCase: getComputedStyle(d.querySelector('.cc-bar-case')).visibility === 'visible',
        barArt: d.querySelector('.cc-bar .cc-pict')?.getBoundingClientRect().width || 0,
      };
    });
  // Space on the setup begins (focus is on the action, which Space presses).
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.DKLAColdCall.state().step === 1);
  let r = await rehearsal();
  assert.equal(r.sectionsShown, 1, 'Rehearse: one prompt at a time');
  assert.ok(!r.setupShown);
  assert.equal(r.cue, cues[0]);
  assert.ok(r.cueSize >= 22 && !r.cueLabel, 'the prompt is the largest thing on the screen');
  assert.ok(
    r.cover && !r.answer && !r.title && !r.direct,
    'Rehearse: the narration, its title and the answer are not shown',
  );
  assert.match(r.reveal, /^Show the answer/, 'a labelled control shows the answer');
  assert.ok(
    r.revealBelowCue >= 0 && r.revealBelowCue <= 40 && r.revealAligned === 0,
    'and it sits beside the prompt',
  );
  assert.equal(r.act, '', 'not at the foot, across an empty screen');
  assert.equal(r.coverPaint, 'none', 'the concealed state imitates no text');
  assert.ok(r.coverHeight <= 60, 'and is no blank card');
  assert.equal(r.coverAnimates, 0, 'nothing moves');
  assert.deepEqual(r.nav, cues, 'Rehearse: the list shows prompts, not titles');
  assert.deepEqual(r.tooltips, cues, 'Rehearse: a row pointed at does not give its title away');
  assert.equal(r.focus, 'cc-cue', 'focus is on the prompt');
  assert.ok(r.barCase && r.barArt >= 36, 'the case is in sight: its drawing and caption in the bar');
  // Space shows it. The stored answer comes first: this episode's own sentences, word for word.
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.DKLAColdCall.state().revealed.length === 1);
  r = await rehearsal();
  const episodeText = (i) => account.sections[i].paragraphs.join(' ').replace(/\s+/g, ' ');
  assert.deepEqual(r.direct, stored[account.sections[0].id], 'the reveal leads with the stored answer');
  for (const sentence of r.direct)
    assert.ok(
      episodeText(0).includes(sentence),
      `"${sentence.slice(0, 40)}…" is in the episode, word for word`,
    );
  assert.ok(r.directSize >= 19, 'at a size that leads');
  assert.ok(r.answer && r.title && !r.cover, 'then the episode as it is told');
  assert.deepEqual(
    r.order,
    [...r.order].sort((a, b) => a - b),
    'in that order: prompt, answer, title, narration',
  );
  assert.equal(r.live, `The answer: ${r.direct.join(' ')}`, 'the reveal is announced');
  assert.deepEqual(r.nav, cues, 'the list is unchanged by the reveal: a question stays a question');
  assert.deepEqual(r.tooltips, cues);
  assert.deepEqual(r.ticks, [true, false, false, false, false], 'the row gains a tick and nothing else');
  assert.match(r.act, /^Next question/);
  assert.equal(r.focus, 'cc-direct', 'focus is on the answer');
  // Enter moves on; the control beside the prompt shows the next.
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.DKLAColdCall.state().step === 2);
  r = await rehearsal();
  assert.ok(r.cover && !r.answer && !r.direct, 'the next narration is not shown');
  await page.locator('#coldCallDialog .cc-section[data-cc-current] .cc-reveal').click();
  await page.waitForFunction(() => window.DKLAColdCall.state().revealed.length === 2);
  await page.locator('#ccAct').click();
  await page.waitForFunction(() => window.DKLAColdCall.state().step === 3);
  // Arrows move without revealing; going back, what was shown stays shown.
  await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(() => window.DKLAColdCall.state().step === 2);
  r = await rehearsal();
  assert.ok(r.answer && !r.cover, 'what was shown stays shown');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => window.DKLAColdCall.state().step === 4);
  r = await rehearsal();
  assert.ok(r.cover && !r.answer, 'Right moves on without showing the narration');
  // Every stored answer in the page is in its own episode; one that is not (a narrative revised since) is
  // not shown, and an episode with none shows the narration and nothing more.
  const storedCheck = await page.evaluate(async () => {
    const data = await window.DKLAData.json('dklaColdCallData'),
      squash = (t) => t.replace(/\s+/g, ' ').trim(),
      bad = [];
    let n = 0;
    for (const [id, episodes] of Object.entries(window.DKLAColdCallAnswers.answers)) {
      const c = data.cases.find((c) => c.id === id);
      for (const [section, say] of Object.entries(episodes)) {
        const s = c?.sections.find((s) => s.id === section),
          text = s ? squash(s.paragraphs.join(' ')) : '';
        n++;
        if (!s || !/\?/.test(s.cue) || !say.length || !say.every((q) => text.includes(squash(q))))
          bad.push(`${id} ${section}`);
      }
    }
    return { n, bad };
  });
  assert.ok(storedCheck.n >= 11, `${storedCheck.n} answers are stored`);
  assert.deepEqual(storedCheck.bad, [], 'a stored answer is not in its episode');
  const tampered = await page.evaluate((id) => {
    const answers = window.DKLAColdCallAnswers.answers[id],
      kept = answers['episode-1'];
    answers['episode-1'] = ['Jordan conditioned its acceptance on payment in gold.'];
    window.DKLAColdCall.close();
    window.DKLAColdCall.open(id);
    const shown = !!document.querySelector('#coldCallDialog #cc-direct-episode-1');
    window.DKLAColdCall.close();
    answers['episode-1'] = kept;
    return shown;
  }, TYPICAL);
  assert.ok(!tampered, 'a sentence that is not in the episode is never shown as its answer');
  await open(NO_ANSWERS, 'rehearse');
  await page.evaluate(() => document.querySelector('#coldCallDialog [data-cc-go="1"]').click());
  r = await rehearsal();
  assert.match(r.reveal, /^Show the episode/, 'a prompt that is not a question says what its control shows');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.DKLAColdCall.state().revealed.length === 1);
  r = await rehearsal();
  assert.ok(
    r.direct === null && r.title && r.answer,
    'no stored answer: the narration, and nothing invented',
  );
  assert.match(r.live, /^The episode: /);
  // Narrations marked a slice at a time, then revealed, equal those marked at once.
  const marked = await page.evaluate(async (id) => {
    const d = document.getElementById('coldCallDialog'),
      answers = () => [...d.querySelectorAll('.cc-answer')].map((a) => a.innerHTML);
    window.DKLAColdCall.close();
    window.DKLAColdCall.markAtOnce = false;
    window.DKLAColdCall.open(id);
    document.querySelector('#coldCallDialog [data-cc-go="1"]').click();
    document.querySelector('#coldCallDialog .cc-section[data-cc-current] .cc-reveal').click(); // while later episodes may still be plain
    await window.DKLAColdCall.marked();
    const later = answers();
    window.DKLAColdCall.close();
    window.DKLAColdCall.markAtOnce = true;
    window.DKLAColdCall.open(id);
    const whole = answers();
    window.DKLAColdCall.close();
    window.DKLAColdCall.markAtOnce = false;
    return { same: later.length === whole.length && later.every((h, i) => h === whole[i]), n: whole.length };
  }, 'lrs-n-massachusetts-epa');
  assert.ok(marked.same && marked.n === 11, 'revealed narrations marked later equal those marked at once');
  passed.push(
    'Rehearse: one prompt with its control beside it and no imitation text; the reveal leads with the stored answer, found word for word in the episode; the list keeps its questions; the case stays in the bar',
  );

  // Remembered across a reload; nothing else in storage changed; then back to the default.
  await page.goto('about:blank');
  await boot(`#node=${TYPICAL}`);
  await page.evaluate(() => window.DKLAColdCall.whenLoaded());
  assert.equal(
    await page.evaluate(() => window.DKLAColdCall.mode()),
    'rehearse',
    'remembered after a reload',
  );
  await launch.click();
  await page.locator('#coldCallDialog[open] #ccNarrative').waitFor();
  assert.equal((await state()).mode, 'rehearse');
  const storageAfter = await page.evaluate(() => Object.keys(localStorage).sort());
  assert.deepEqual(
    storageAfter.filter((k) => !storageBefore.includes(k) && !/^dkla\.(analytics|visit|session)/i.test(k)),
    [MODE_KEY],
    'only the mode is written (and, mid-read, the place)',
  );
  await page.locator('#coldCallDialog .cc-seg[data-cc-mode-set="read"]').click();
  assert.equal(await page.evaluate((k) => localStorage.getItem(k), MODE_KEY), 'read');
  await page.evaluate(() => window.DKLAColdCall.close());
  passed.push('the choice of Read or Rehearse is remembered across a reload, under its own key');

  /* ---------- the tallest setup, and accounts with fields missing ---------- */
  await open(TALLEST, 'read');
  const tall = await page.evaluate(() => {
    const d = document.getElementById('coldCallDialog'),
      inWindow = (el) => {
        const a = el.getBoundingClientRect();
        return a.top >= 0 && a.bottom <= innerHeight && a.width > 0;
      };
    return {
      cast: d.querySelectorAll('.cc-cast dt').length,
      controls: inWindow(d.querySelector('.cc-mode')) && inWindow(d.querySelector('#ccFullBrief')),
      storyFollows:
        d.querySelector('.cc-section').getBoundingClientRect().top -
          d.querySelector('.cc-setup').getBoundingClientRect().bottom <=
        64,
    };
  });
  assert.equal(tall.cast, 7);
  assert.ok(
    tall.controls && tall.storyFollows,
    'however long the setup, the switch and the full brief are in the window and the story follows',
  );
  const bare = async (strip) =>
    page.evaluate(
      async ({ id, strip }) => {
        // The reader shares the parsed narratives with the loader; a field is taken away here, in this
        // page only, and put back. (None of the 742 lacks any of these today.)
        const data = await window.DKLAData.json('dklaColdCallData'),
          c = data.cases.find((c) => c.id === id),
          kept = { ...c };
        for (const [k, v] of Object.entries(strip)) c[k] = v;
        window.DKLAColdCall.close();
        window.DKLAColdCall.open(id);
        const d = document.getElementById('coldCallDialog'),
          box = (el) => el.getBoundingClientRect(),
          setup = d.querySelector('.cc-setup');
        const out = {
          applied: !d.querySelector('.cc-lead') === !c.lead,
          has: Object.fromEntries(
            ['.cc-lead', '.cc-cast', '.cc-path', '.cc-briefing', '.cc-limits', '.cc-plate'].map((s) => [
              s,
              !!d.querySelector(s),
            ]),
          ),
          labels: [...d.querySelectorAll('.cc-setup .cc-label')].map((l) => l.textContent),
          emptyBlocks: [...setup.querySelectorAll('p, dl, ol, section, div, h2, h3')].filter(
            (el) => !el.textContent.trim() && !el.querySelector('svg'),
          ).length,
          literal: /undefined|null|\[object/.test(setup.textContent),
          bare: setup.hasAttribute('data-cc-bare'),
          setupHeight: Math.round(box(setup).height),
          firstEpisodeTop: Math.round(
            box(d.querySelector('.cc-section')).top - box(d.querySelector('#ccScroll')).top,
          ),
          onlyChildWidth: d.querySelector('.cc-briefing > :only-child')
            ? Math.round(box(d.querySelector('.cc-briefing > :only-child')).width)
            : 0,
          endTitleHidden: !!d.querySelector('#ccLimitsLabel.cc-sr'),
        };
        window.DKLAColdCall.close();
        Object.assign(c, kept);
        return out;
      },
      { id: TYPICAL, strip },
    );
  let b = await bare({ lead: '' });
  if (b.applied) {
    assert.ok(!b.has['.cc-lead'] && b.has['.cc-cast'] && b.has['.cc-path'], 'no lead: the rest stands');
    assert.equal(b.emptyBlocks, 0, 'no lead: nothing empty is drawn');
    b = await bare({ actors: [] });
    assert.ok(!b.has['.cc-cast'] && b.has['.cc-path'], 'no cast');
    assert.deepEqual(b.labels, ['How it got here'], 'no cast: no heading for it');
    assert.ok(b.onlyChildWidth > 0 && b.onlyChildWidth <= 568, 'no cast: the path keeps a reading measure');
    b = await bare({ proceedings: [] });
    assert.ok(b.has['.cc-cast'] && !b.has['.cc-path'], 'no path');
    assert.deepEqual(b.labels, ['Who is involved']);
    b = await bare({ lead: '', actors: [], proceedings: '', limits: '' });
    assert.ok(!b.has['.cc-briefing'] && !b.has['.cc-lead'] && !b.has['.cc-limits'], 'nothing to brief');
    assert.ok(b.bare && b.firstEpisodeTop < 400, 'nothing to brief: the first episode follows the head');
    assert.ok(b.endTitleHidden, 'no limits: no heading that promises them');
    assert.ok(!b.literal && b.emptyBlocks === 0, 'nothing to brief: nothing empty or literal is drawn');
    passed.push('an account with a field missing draws without it, without its heading, and stays composed');
  } else
    passed.push('(fields-missing check not run: this copy of the page does not share its parsed narratives)');

  /* ---------- typesetting and the shell ---------- */
  await open(TYPICAL, 'read');
  await page.locator('#coldCallDialog [data-cc-go="1"]').click();
  await page.waitForFunction(() => window.DKLAColdCall.state().step === 1);
  await sleep(600);
  const type = await page.evaluate(() => {
    const d = document.getElementById('coldCallDialog'),
      lum = (c) => {
        const [r, g, b] = c.match(/[\d.]+/g).map((v) => {
          v = +v / 255;
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      },
      ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05),
      p = [...d.querySelectorAll('.cc-answer > p')].sort(
        (a, b) => b.textContent.length - a.textContent.length,
      )[0],
      cs = getComputedStyle(p),
      lines = new Set([
        ...(() => {
          const range = document.createRange(),
            tops = [];
          const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
          for (let n = walker.nextNode(); n; n = walker.nextNode())
            for (const m of n.textContent.matchAll(/\S+/g)) {
              range.setStart(n, m.index);
              range.setEnd(n, m.index + 1);
              tops.push(Math.round(range.getBoundingClientRect().top));
            }
          return tops;
        })(),
      ]).size,
      readouts = [...d.querySelectorAll('.cc-count, .cc-pin, #ccProgress, .cc-cite')]
        .filter((el) => el.getClientRects().length)
        .map((el) => {
          const s = getComputedStyle(el);
          return `${s.fontSize} ${s.fontWeight} ${/Mono/.test(s.fontFamily)}`;
        }),
      x = d.querySelector('#ccClose'),
      hit = getComputedStyle(x, '::before'),
      ds = getComputedStyle(d);
    return {
      size: parseFloat(cs.fontSize),
      perLine: p.textContent.length / lines,
      contrast: ratio(cs.color, ds.backgroundColor),
      wrap: cs.textWrap || cs.textWrapStyle,
      readouts: [...new Set(readouts)],
      radius: ds.borderRadius,
      shadow: ds.boxShadow !== 'none',
      close: [x.offsetWidth, x.offsetHeight, x.querySelector('svg') ? 'svg' : x.textContent],
      hit: [
        x.offsetWidth - parseFloat(hit.left) - parseFloat(hit.right),
        x.offsetHeight - parseFloat(hit.top) - parseFloat(hit.bottom),
      ],
      closes: d.querySelectorAll('.cc-bar button').length,
      blur: [d, ...d.querySelectorAll('*')].filter((el) => getComputedStyle(el).backdropFilter !== 'none')
        .length,
      running: d.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length,
      forever: d
        .getAnimations({ subtree: true })
        .filter((a) => a.effect?.getComputedTiming().iterations === Infinity).length,
      frostedButtons: d.querySelectorAll('button[data-cold-call]').length,
    };
  });
  assert.ok(type.size >= 17 && type.size <= 18, `reading text is ${type.size} px`);
  assert.ok(type.perLine >= 50 && type.perLine <= 72, `${type.perLine.toFixed(1)} characters a line`);
  assert.ok(type.contrast >= 7, `reading text is ${type.contrast.toFixed(2)}:1 on its plane`);
  assert.match(String(type.wrap), /pretty/);
  assert.deepEqual(type.readouts, ['13px 500 true'], 'readouts: 13 px, the mono face, weight 500');
  assert.equal(type.radius, '12px');
  assert.ok(type.shadow, 'the overlay plane has its elevation');
  assert.deepEqual(type.close, [36, 36, 'svg'], 'one 36 px close button, drawn');
  assert.ok(type.hit[0] >= 44 && type.hit[1] >= 44, 'with a 44 px target');
  assert.equal(type.closes, 1, 'the bar holds the title and the close button and nothing else');
  assert.equal(type.blur, 0, 'no backdrop-filter');
  assert.equal(type.running, 0, 'nothing is still moving beside the text');
  assert.equal(type.forever, 0, 'nothing runs forever');
  assert.equal(type.frostedButtons, 0, 'the reader has no second frosted button');
  // Opening: opacity and transform only, at most 250 ms.
  const arrival = await page.evaluate(async (id) => {
    window.DKLAColdCall.close();
    window.DKLAColdCall.open(id);
    const d = document.getElementById('coldCallDialog');
    await new Promise((r) => requestAnimationFrame(r));
    const moves = d.getAnimations().flatMap((a) => {
      const t = a.effect.getComputedTiming();
      return [{ ms: t.duration + t.delay, props: a.effect.getKeyframes().flatMap((k) => Object.keys(k)) }];
    });
    return moves;
  }, TYPICAL);
  for (const move of arrival) {
    assert.ok(move.ms <= 250, `the reader arrives in ${move.ms} ms`);
    for (const prop of move.props)
      assert.ok(
        [
          'opacity',
          'transform',
          'scale',
          'translate',
          'display',
          'overlay',
          'offset',
          'easing',
          'composite',
          'computedOffset',
        ].includes(prop),
        `arriving animates ${prop}`,
      );
  }
  passed.push(
    'typesetting and shell: 17 px prose at 50 to 70 characters and 7:1, mono readouts, radius 12, one close button, no blur, nothing left moving',
  );

  /* ---------- captions ---------- */
  // Every one of the 742 captions, set as the setup sets it, at seven widths: no line ends in "v.".
  const captionWidths = [1680, 1440, 1240, 1100, 900, 640, 390];
  const dangling = [];
  for (const width of captionWidths) {
    await page.setViewportSize({ width, height: 900 });
    await sleep(120);
    const found = await page.evaluate(async () => {
      const data = await window.DKLAData.json('dklaColdCallData'),
        host = document.querySelector('#coldCallDialog .cc-head-text'),
        h = document.createElement('h2');
      h.className = 'cc-caption';
      host.appendChild(h);
      const range = document.createRange(),
        bad = [];
      for (const c of data.cases) {
        h.innerHTML = window.DKLACaption.html(c.title);
        const rows = [];
        const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (n.parentElement.closest('.cap-read')) continue;
          for (const m of n.textContent.matchAll(/\S+/g)) {
            range.setStart(n, m.index);
            range.setEnd(n, m.index + m[0].length);
            const rect = range.getClientRects()[0];
            if (!rect) continue;
            const mid = rect.top + rect.height / 2;
            let row = rows.find((r) => Math.abs(r.mid - mid) < rect.height / 2);
            if (!row) rows.push((row = { mid, words: [] }));
            row.words.push(m[0]);
          }
        }
        const text = rows.sort((a, b) => a.mid - b.mid).map((r) => r.words.join(' '));
        if (text.slice(0, -1).some((line) => /(^|\s)v\.?$/.test(line)))
          bad.push(`${c.title} => ${text.join(' / ')}`);
        if (text.length > 1 && /^v\.?$/.test(text[text.length - 1]))
          bad.push(`${c.title} => "v." alone on a line`);
      }
      h.remove();
      return { bad, n: data.cases.length };
    });
    assert.equal(found.n, TOTAL);
    for (const line of found.bad) dangling.push(`${width}: ${line}`);
  }
  assert.deepEqual(dangling, [], `a caption line ends in "v.":\n  ${dangling.slice(0, 8).join('\n  ')}`);
  // The composition lint across a continuous resize, on the longest captions and the longest prompt.
  const lint = [];
  const judge = (found, root, what) => {
    for (const f of found)
      for (const kind of what)
        for (const item of f[kind] || [])
          if (!root || item.el.includes(root))
            lint.push(`${f.width} ${kind} ${item.el}: ${(item.lines || [item.px]).join(' / ')}`);
  };
  for (const id of LONG_CAPTIONS) {
    await open(id, 'read');
    judge(
      await sweep(page, () => composition(page, '#coldCallDialog .cc-head'), {
        from: 1680,
        to: 390,
        step: 86,
      }),
      '',
      ['danglingV', 'loneSeparator', 'centredFragments', 'tinyArt'],
    );
  }
  // The longest episode title, as a headline in Read.
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(LONG_TITLE, 'read');
  const longest = await page.evaluate(() => {
    const all = [...document.querySelectorAll('#coldCallDialog .cc-section')];
    const s = all.sort(
      (a, b) =>
        b.querySelector('.cc-title').textContent.length - a.querySelector('.cc-title').textContent.length,
    )[0];
    return s.dataset.ccStep;
  });
  judge(
    await sweep(
      page,
      async () => {
        await page.evaluate((k) => {
          const s = document.querySelector(`#coldCallDialog .cc-section[data-cc-step="${k}"]`),
            box = document.getElementById('ccScroll');
          box.scrollTop += s.getBoundingClientRect().top - box.getBoundingClientRect().top;
        }, longest);
        return composition(page, `#coldCallDialog .cc-section[data-cc-step="${longest}"]`);
      },
      { from: 1680, to: 390, step: 86 },
    ),
    'cc-title',
    ['widow', 'centredFragments'],
  );
  await page.evaluate(() => window.DKLAColdCall.close());
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(LONG_PROMPT, 'rehearse');
  await page.evaluate(() => document.querySelector('#coldCallDialog [data-cc-go="4"]').click());
  judge(
    await sweep(page, () => composition(page, '#coldCallDialog .cc-section[data-cc-current]'), {
      from: 1680,
      to: 390,
      step: 86,
    }),
    'cc-cue',
    ['widow', 'crampedBesideSpace', 'centredFragments'],
  );
  assert.deepEqual(lint, [], `composition:\n  ${lint.slice(0, 8).join('\n  ')}`);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => {
    window.DKLAColdCall.setMode('read');
    window.DKLAColdCall.close();
  });
  passed.push(
    `captions: none of the ${TOTAL} ends a line in "v." at ${captionWidths.length} widths; the longest captions, headline and prompt pass the composition lint from 1680 to 390`,
  );

  /* ---------- the index ---------- */
  await page.evaluate(() =>
    window.DKLAColdCallIndex.open(document.querySelector('#inspector button[data-cold-call]')),
  );
  const ix = page.locator('#coldCallIndexDialog[open]');
  await ix.locator('.cc-ix-row').first().waitFor();
  const index = await page.evaluate(() => {
    const d = document.getElementById('coldCallIndexDialog'),
      rows = [...d.querySelectorAll('.cc-ix-row')],
      supporting = (r) => !!r.closest('[data-cc-ix-supporting]'),
      heights = new Set(rows.filter((r) => !supporting(r)).map((r) => r.offsetHeight)),
      plainHeights = new Set(rows.filter(supporting).map((r) => r.offsetHeight)),
      shownArt = [...d.querySelectorAll('.cc-ix-own')]
        .slice(0, 40)
        .map((a) => parseFloat(getComputedStyle(a).width)); // (not its rectangle: the dialog is still arriving, at 98%)
    return {
      rows: rows.length,
      ids: new Set(rows.map((r) => r.dataset.coldCall)).size,
      total: d.querySelector('#ccIxTotal').textContent,
      courses: [...d.querySelectorAll('.cc-ix-course')].map((c) => [
        c.dataset.course,
        c.querySelector('.cc-ix-course-title .cc-readout').textContent,
        c.querySelectorAll('.cc-ix-row').length,
        c.querySelectorAll('.cc-ix-group:not([data-cc-ix-supporting])').length,
        c.querySelectorAll('.cc-ix-group[data-cc-ix-supporting] .cc-ix-row').length,
      ]),
      supportingLast: [...d.querySelectorAll('.cc-ix-course')].every((c) => {
        const groups = [...c.querySelectorAll('.cc-ix-group')],
          at = groups.findIndex((g) => g.hasAttribute('data-cc-ix-supporting'));
        return at < 0 || at === groups.length - 1;
      }),
      supportingGlyphs: [...d.querySelectorAll('.cc-ix-group[data-cc-ix-supporting] .cc-ix-row')].every((r) =>
        r.querySelector('.cc-ix-page'),
      ),
      mapGlyphs: [...d.querySelectorAll('.cc-ix-group:not([data-cc-ix-supporting]) .cc-ix-row')].every(
        (r) => r.querySelector('.cc-ix-art') && !r.querySelector('.cc-ix-page'),
      ),
      episodes: rows.every((r) => /^\d+ episodes?$/.test(r.querySelector('.cc-ix-count').textContent)),
      years: rows.filter((r) => /^\d{4}$/.test(r.querySelector('.cc-ix-year').textContent)).length,
      monoMeta: /Mono/.test(getComputedStyle(rows[0].querySelector('.cc-ix-year')).fontFamily),
      heights: [...heights],
      plainHeights: [...plainHeights],
      art: d.querySelectorAll('.cc-ix-own').length,
      artSmallest: Math.min(...shownArt),
      smallArt: [
        ...d.querySelectorAll('.cc-ix-group:not([data-cc-ix-supporting]) .cc-ix-art:not(.cc-ix-own)'),
      ].length,
      railCut: [...d.querySelectorAll('.cc-ix-jump button > span')]
        .filter((sp) => sp.scrollWidth > sp.clientWidth + 1)
        .map((sp) => sp.textContent),
      railLongest: Math.max(...[...d.querySelectorAll('.cc-ix-jump button')].map((b) => b.offsetHeight)),
      frosted: d.querySelectorAll('button[data-cold-call]').length,
      vapour: d.querySelectorAll('.cc-cold-vapor').length,
      focus: document.activeElement?.id,
      rail: d.querySelectorAll('.cc-ix-jump').length,
    };
  });
  assert.equal(index.rows, TOTAL, 'the index lists every account');
  assert.equal(index.ids, TOTAL, 'each once');
  assert.equal(index.total, '742 accounts');
  assert.deepEqual(
    index.courses.map(([name]) => name),
    ['Contracts', 'Civil Procedure', 'Legislation and the Regulatory State'],
  );
  for (const [name, readout, n, subjects, supporting] of index.courses) {
    assert.equal(readout, `${n} Cold Calls`, `${name}: the course says how many`);
    assert.ok(subjects >= 5 && supporting > 0, `${name}: subjects from the map, then supporting cases`);
  }
  assert.ok(
    index.supportingLast && index.supportingGlyphs && index.mapGlyphs,
    'map cases and supporting cases are told apart',
  );
  assert.ok(index.episodes, 'every row says how many episodes, with the unit');
  assert.ok(index.years >= TOTAL - 12, `${index.years} rows give a year`);
  assert.ok(index.monoMeta, 'the year is in the readout face');
  assert.deepEqual(index.heights, [56], 'map cases: rows of one height, with room for the drawing');
  assert.deepEqual(index.plainHeights, [36], 'supporting cases: rows of one height');
  assert.ok(
    index.art >= 390 && index.artSmallest >= 40,
    `a map case is known by its drawing, at ${index.artSmallest} px`,
  );
  assert.equal(index.smallArt, 0, 'no drawing is shown at glyph size');
  assert.deepEqual(index.railCut, [], 'a subject name in the rail is never cut');
  assert.ok(index.railLongest > 36, 'a long name wraps onto a second line');
  assert.equal(index.frosted + index.vapour, 0, 'no row wears the frost');
  assert.equal(index.focus, 'ccIxFind', 'typing searches at once');
  // Typing filters; headings count what is showing; Enter opens the first match over the list.
  await page.keyboard.type('erie railroad');
  await page.waitForFunction(() => /of 742 accounts/.test(document.getElementById('ccIxTotal').textContent));
  const filtered = await page.evaluate(() => {
    const d = document.getElementById('coldCallIndexDialog'),
      vis = [...d.querySelectorAll('.cc-ix-row')].filter((r) => r.getClientRects().length);
    return {
      shown: vis.map((r) => r.querySelector('.cc-ix-name').textContent),
      total: d.querySelector('#ccIxTotal').textContent,
      headings: [...d.querySelectorAll('.cc-ix-group-title')]
        .filter((h) => h.getClientRects().length)
        .map((h) => h.querySelector('.cc-readout').textContent),
      rail: [...d.querySelectorAll('.cc-ix-jump')].filter((j) => j.getClientRects().length).length,
    };
  });
  assert.ok(filtered.shown.length >= 1 && filtered.shown.length < 10, 'typing narrows the list');
  assert.ok(
    filtered.shown.every((name) => /erie/i.test(name) && /railroad/i.test(name)),
    'to what was typed',
  );
  assert.equal(filtered.total, `${filtered.shown.length} of 742 accounts`);
  assert.ok(
    filtered.headings.every((h) => /^\d+ of \d+ cases?$/.test(h)),
    'a heading counts what is showing',
  );
  assert.ok(filtered.rail < index.rail, 'the rail lists only where the matches are');
  await page.keyboard.press('Enter');
  await page.locator('#coldCallDialog[open] #ccNarrative').waitFor();
  const opened = await state();
  assert.equal(opened.origin, 'index');
  assert.match(await page.locator('#coldCallDialog .cc-caption').innerText(), /Erie/);
  assert.ok(await shown('#coldCallIndexDialog'), 'the list stays behind the reader');
  await page.evaluate(() => (document.getElementById('ccScroll').scrollTop = 1e7));
  await page.waitForFunction(() => /All Cold Calls/.test(document.getElementById('ccAct').textContent));
  await page.locator('#ccAct').click();
  await page.waitForFunction(() => !document.getElementById('coldCallDialog').open);
  assert.ok(
    await page.evaluate(() => document.getElementById('coldCallIndexDialog').open),
    'closing the reader comes back to the list',
  );
  assert.ok(
    await page.evaluate(
      () =>
        document.activeElement?.closest?.('#coldCallIndexDialog') && document.activeElement.dataset.coldCall,
    ),
    'on the row that was opened',
  );
  // Escape empties the search, then closes; focus goes back where it came from.
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#ccIxFind').inputValue(), '');
  assert.equal(await page.locator('#ccIxTotal').innerText(), '742 accounts');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.getElementById('coldCallIndexDialog').open);
  assert.equal(
    await page.evaluate(() => document.activeElement?.dataset?.coldCall),
    TYPICAL,
    'focus returns',
  );
  passed.push(
    'the library: 742 accounts by course and subject, each map case with its drawing at 40 px, names in the rail whole, supporting cases apart, typing filters, a row opens its account and closing comes back',
  );

  assert.deepEqual(errors, [], 'page errors');
  console.log(
    `Cold Call, to read and to rehearse: ${passed.length} checks passed.\n- ${passed.join('\n- ')}`,
  );
} finally {
  release();
  await browser.close();
}
