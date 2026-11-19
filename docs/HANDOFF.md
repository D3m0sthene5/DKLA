# Where the work stands (12 November 2026)

Written at the end of a session so the next one can pick up cleanly.
Update or replace this file when the state changes.

## Calm (branch `v32-calm`, 18 November 2026; not merged, not published)

The page is at rest when nothing is happening, panels arrive and leave with a short motion that can
be interrupted, and every control answers a press. No layout, size, colour or content change at rest
(the exceptions are listed in the commit message). Read `src/features/calm/calm.js` and `calm.css`
first; the motion tokens are in `src/features/v31/tokens.css`.

- **Rest.** Home and an open case now cause 0 layouts a second (65 before). The fuel gauge's and the
  version label's bright band are a window sliding over a second copy (two transforms, run by the
  compositor: `fuel.js`/`fuel.css`, `r20.js`/`hud-font.css`); the Cold Call vapour is 18 CSS-animated
  puffs per button, no canvas, no requestAnimationFrame (`frost.js`/`frost.css`); the clock shows
  each character by sliding a strip, so a tick lays nothing out (`clock.js`); Dottie's blink is a
  0.42 s fill-opacity fade every 5.2 s (`dottie.js`, `ask.css`). The 200 ms and 500 ms timers are gone
  (`DKLACalm.after`), and the Cold Call observer watches `#inspector`, not the whole page.
  Things learned the hard way: a transform or a group opacity on a shape inside an SVG costs a layout
  per change, fill-opacity does not; `display` toggles and text changes cost a layout, `visibility`
  and a transform on a strip do not.
- **Quiet time.** `html.dkla-ambient-off` (tab hidden, a dialog open, or a wheel turn or drag on the
  map; set by `calm.js`, which only listens to the map) and `html.dkla-moving` (for the map's own code
  to set while it animates, for example a glide after the finger lifts; nothing sets it yet) pause
  every ambient animation in `calm.css`. New ambient decoration must be added to that list.
- **Dialogs** share one flat scrim (`--v31-scrim`, no blur) and fade and scale through
  `@starting-style` and `allow-discrete` transitions; the menu, search panel and reader the same way
  on their `hidden` attribute. A closing panel is already closed for the code (`open` false, `hidden`
  true) and takes no clicks; only its picture lingers for 0.2 s. Checks that wait for a panel to be
  gone should wait for `display: none` or for the state, not sleep.
- **Press feedback**: shared rules at the end of `calm.css` (`:where()`, so component colours win).
  Several components start from `all: unset`, which is why the pressed state is `!important`.
- **Rail**: `reading.js` `placeNow()`; rail clicks use `DKLACalm.scrollTo` (250 ms, stops on wheel,
  touch or key).
- **Loading lines**: `calm.js` puts `calm-wait` on any `role="status"` line in a dialog that starts
  with "Loading"; nothing shows for 150 ms, then a skeleton.
- **Checks**: `tools/feel/check-calm.mjs` ("calm: rest, transitions and press feedback") with ten
  breakages in `tools/verify/break.mjs`; `tools/v31/check-case.mjs` asserts the rail's mark;
  `tools/fuel/check-browser.mjs` checks the new sweep. Benchmark: `tools/feel/measure.mjs`.
- **Still to do**: the map's own animations (button zooms, any glide) should set `dkla-moving` on
  `<html>` while they run; the
  reader's way out starts only after the map has refitted (the refit blocks the page for a moment
  when the reader closes; that is map work); `pnpm views:update` on the owner's PC (dialog scrims are
  no longer blurred, so every picture with a dialog changes slightly).

## Latest (18 November 2026, v3.1)

Read this first; the sections below it are older.

- **v3.1, "The Reading Room Update"** (served file `DKLA-v3.1.html`; `DKLA-v3.0.html` and every
  older address redirect). Built from the owner-approved design audit (Design canvas "DKLA design
  audit — before and after", 18 November 2026). What changed:
  - **Design rules**: `src/features/v31/tokens.css` holds the five text styles, the colour roles
    (blue = clickable, course colours = which course, movement colours = how a case moved the rule)
    and the reader width (`--reader` widens to `clamp(560px, 100vw − 360px, 1180px)` at ≥1024 px;
    the map already fits the selected entry into the space left: `readerWidth()` in studyCode.js).
  - **Case page**: `reading.js` `caseOrder()` owns one order (rail, header, the rule, "Where this
    case sits", the brief, connections, unknown blocks, sources drawers, study). It reorders only
    when the order differs and at most 8 times a frame, so modules cannot fight over a block. The
    old "timelines after the summary" rule was removed because it fought the new heading (that
    loop froze the page in testing; `tools/verify/break.mjs` now re-creates it as a breakage).
    Notes move into a "Case notes" drawer; the section links are hidden behind the rail. Styles:
    the v3.1 sections at the end of `src/features/v25/reading.css`.
  - **Timelines**: `timelines.js` `panelHTML()` draws an axis of every entry (position is 55% date,
    45% order) and the neighbours with notes; the 12 moves map to 5 families (`FAMILY`). The full
    view marks the open entry (`v31-here`). Styles at the end of `timelines.css`.
  - **Flowcharts**: `flowcharts.js` `stepsCiting()`/`pathTo()` give each entry the steps that cite
    it and the path to them; the case card is `chartStepsHTML()`. Charts open at a step with
    `#flowchart=K-16&step=c&from=citoh`; the walkthrough has a path column, the decision and typed
    sources, and "Back to" the case.
  - **Dictionary**: `dklaR12Glossary.js` `defHTML()` splits a definition into a lead sentence,
    paragraphs of up to two sentences and a list of its " - " examples, keeping every word.
  - **Sol's canon index and lecture notes** (commit f594f380, merged into v3.1): the case order puts
    `.canons-related` under "Where this case sits" and `.lecture-related` under Sources; the rail
    lists Canons; `canons.css` and `lectures.css` take the v3.1 tokens.
  - **Trotting opossums**: the Ask Dottie spinner's three opossums run an 8-frame trot (90 ms a
    frame), drawn from a gait study (Virginia opossums trot; they do not bound: spec and sources in
    the session, summary in `docs/ask-mascot/README.md`). `dottie.js` `TROT` holds the frames; CSS
    shows one at a time (`dottie-trot` in ask.css); the ring turns once per 7 strides (5.04 s) so
    planted feet stay put. `node tools/ask/dottie-sheet.mjs --png` also writes the Muybridge-style
    plate `docs/ask-mascot/possum-trot.svg/.png`.
  - **Checks**: `tools/v31/check-case.mjs` ("v3.1 case page") and `tools/ask/trot-browser.mjs`
    ("Ask Dottie trotting opossums") in `pnpm verify`, with breakages in `tools/verify/break.mjs`.
  - **Design review fixes (owner request, 18 November 2026; branches v31-search, v31-dottie,
    v31-lectures, merged):** phone search panel (≤850 px; the owner asked for this exception to
    the no-phone-work rule) and one search index across flowcharts, lectures, canons and LRS
    classes, with type labels and course + class number ranking (`dklaR13Search.js`,
    `tools/search/check-browser.mjs`); Dottie routes named cases/canons/classes to the Atlas first,
    ignores conversational framing, gives a `reason` for every empty answer, and the shared library
    stores fewer questions (`lib/ask/*`, `api/ask.js`, privacy.html); lecture notes for Contracts
    1–24 and LRS 1–22 from the PowerPoints in `added-sources/`, and a "no slides on file" record
    for Contracts 25–26 and LRS 23–26 (category "No lecture slides on file", excluded from the
    indexed classes in `retrieve.js`).
  - **Splash**: 162 lines (73 approved 18 November); `splash.js` `choose()` keeps the last 100 lines
    shown (localStorage `dkla.splash.v1` {last, recent, seen}) so none returns within 100 clicks
    (`tools/splash/pick.test.mjs`).
  - **Fuel gauge** (`src/features/fuel/`, `lib/ask/fuel.js`, `api/fuel.js`): Dottie's spend is recorded
    per OpenAI response in `dkla_ask_spend` (prices in `lib/ask/fuel.js`, from OpenAI's pricing
    pages, 18 November 2026). The share left = (calibrated balance − spend since) / starting
    amount. Calibrate after each refill with `tools/ask/fuel-calibrate.mjs`, the admin route, or
    the Vercel env vars DKLA_FUEL_BALANCE_USD / DKLA_FUEL_START_USD / DKLA_FUEL_AT (the newer
    point wins). The public `/api/fuel` shows only the share, never dollars. It misses spending
    elsewhere on the same OpenAI credit, so recalibrate now and then.
  - **Whole U.S. Code** (`src/features/v31/uscode*.js`, `uscode/title-*.json`, built by
    `tools/uscode/build_index.py` from OLRC release 119-118; sources in `tools/uscode/README.md`):
    United States Code › All 54 titles browses every title, level and section heading. A title's
    file is fetched (and SHA-256 checked) only when it is opened or an exact citation in it is
    searched; cache `dkla-uscode-v1`. Search adds one "U.S. Code" result only for an exact citation
    ("20 USC 1001"); nothing goes into the search index. Check: `tools/uscode/check-browser.mjs`.
  - **Lazy data blocks (the smaller first load)**: the blocks in `tools/performance/lazy-blocks.json`
    (Cold Call, both Cold Call tables, the dictionary, the audit, the four archives, the textbook
    update and the source texts; about 44 MB) move out of the hosted page into
    `assets/data/<sha256>.json` at packaging (`tools/performance/package.mjs` `hostedRelease`); the
    portable copy keeps them embedded. `src/features/performance/data-loader.js` (`window.DKLAData`,
    placed before the app code) fetches a block on first use, checks its fingerprint, keeps it in
    Cache Storage `dkla-data-v1`, fires `dkla:data`, downloads the rest after boot in list order,
    and makes Save/export wait so a saved copy is complete. Every reader works whether the block is
    embedded or late. Measured (10 Mbps, 4× slower processor): 22.5 → 8.9 MB to the first screen,
    about 26 → 15 s. Checks: `check-lazy.mjs`, `check-lazy-files.mjs`, `check-lazy-a.mjs`,
    `check-lazy-b.mjs` (late arrival per feature). Kept embedded on purpose: seedData, dklaR19Data,
    authorities and We the People (Home draws from them), SCOTUS history and sprite (the Court on
    Home), sourceIndex and PDF routes (every entry's links). Next candidates: the supporting briefs'
    text inside dklaR19Data (5.5 MB) and the authorities' provision text (about 4.3 MB); both need
    `assemble.py` to write them as separate blocks.
  - **Deferred from the review:** per-class offline downloads (the background download now fills
    the offline copy anyway); corrections beside the rule; a request/spending cap on /api/ask (the code has none; Vercel's
    firewall settings could not be read from this session).
  - **Behaviour change to know**: with the wide reader the map zooms out to fit the selected entry
    into the strip, and keeps that zoom when the reader closes, so it may show a subject's summary
    ("+5 more") instead of its case cards until you zoom in.
- **Still to do on the owner's PC**: `pnpm views:update` (the case, timeline, flowchart and
  dictionary pictures all changed).

## Earlier (12 November 2026, v3.0)

Read this first; the sections below it are older.

- **Owner's standing design rules**: DKLA is a landscape desktop atlas (iPad
  landscape at most). Never spend effort on phone or portrait layouts. Keep
  the Home design language (course trees with connection lines, the SCOTUS
  building, the Rules & authorities books); improve proportions within it.
- **Home after owner review**: "Today without the D" (`src/features/v25/
  home-variants.js`, variant 1 is the default; localStorage `dkla.homeVariant`
  = 0 restores the old arrangement, 2-5 are prototypes); the books stay near
  natural proportions (at most 25% taller). The calm top bar
  (`src/features/topbar/`) moves Save, Study, SCOTUS and Privacy into the ☰
  menu; the splash line sits in its slot beside the clock. The version label
  is a HUD-style Orbitron readout (`src/features/v26/hud-font.css`). The big
  monogram (and its hidden analytics link) is gone from the map; the admin
  dashboard is at dkla.dev/admin.

- **v3.0** (served file `DKLA-v3.0.html`; every older address, v2.9 included,
  redirects). Built by agent swarms in one session and merged on
  `claude/ask-dkla-mascot`. What changed:
  - **Home**: courses on top, the DKLA mark centred, Rules & authorities and
    SCOTUS History below (`src/features/r19/r20.js` MARK/LOWER/ARR,
    `src/features/v25/geography.js`); "Civ Pro" as the display title
    (`src/features/v26/typography.js`, data keys unchanged); Notes moved to the
    LRS row. Minecraft-style splash text on the mark's corner
    (`src/features/splash/`, 88 owner-approved lines in `lines.js`).
  - **Fonts**: owner's option F — Exo 2 (display) and Inter (interface and
    reading), embedded (`tools/v26/embed-fonts.mjs`, `TYPOGRAPHY.md`); the
    clock uses JetBrains Mono (`src/features/clock/clock-font.css`).
  - **Clock**: two-row split-flap NY time and date (weekday, month, day flaps),
    an hourly Solari cascade, a static NYC label with a green light; shown from
    1360 px.
  - **Ask Dottie**: 50 px Dottie hanging from the bar; routing is an allowlist
    of question shapes the Atlas answers alone (`route()` in `lib/ask/web.js`),
    everything else researches the web; server checks drop substitute and
    wrong-kind paragraphs (`lib/ask/answer.js`); streaming progress, warm-up,
    prebuilt retrieval index (`work/build/ask-index.bin.gz`), cancel; the
    spinning-possum thinking line. "Save answer" keeps answers in the browser
    (`src/features/ask/saved.js`, key `dkla.askSaved.v1`); a shared library
    reuses identical first questions for 90 days (`lib/ask/library.js`, table
    `dkla_ask_answers`; versioned by corpus and code; privacy.html says so).
  - **Cold Call definitions**: hover/tap cards from the swarm's 708-term table
    (`tools/cold-call/glossary-terms.json`, `src/features/cold-call/glossary.js`).
  - **Search**: each result says where it matched; a "Show me" strip in the
    opened entry (`src/runtime/dklaR13Search.js`).
  - **Updates**: quiet update system (`src/features/r19/sw.template.js`,
    "offline install and updates" in `src/runtime/dklaR18Study.js`,
    `index.template.html`); checks `tools/r19/check_updates.mjs` and
    `check_migration.mjs` (the real v2.9 worker and page, then a renamed file).
  - **Erie voting record**: Butler and McReynolds corrected at run time to
    "Concurred in judgment" with notes (`src/runtime/dklaR16HistoryCode.js`),
    owner-approved; Ask's SCOTUS records apply the same list
    (`VOTE_CORRECTIONS` in `tools/ask/build.mjs`): change both together.
- **Still to do on the owner's PC**: `pnpm views:update` (fonts, Home, clock,
  search and Cold Call pictures all changed; Linux has no recorded pictures).
- **Not verified here**: real OpenAI answers (all tests mock it), Vercel's
  request handling for Ask (a test reproduces Node's behaviour), Safari/iOS
  and Firefox, a real database for the answer library.

## Latest (15 October 2026, v2.7)

Read this first; the sections below it are older.

- **v2.7 released** from a cloud session (served file `DKLA-v2.7.html`; the
  v2.6 address redirects). What changed: a multidistrict litigation timeline
  (`mdl`, nine steps, Civil Procedure) in `tools/r19/data/timelines.json`;
  recall drill cards show the "In plain English" takeaway with the holding
  (`src/runtime/dklaR18Study.js`); a `#node=` deep link opens the entry after
  boot (`src/features/v25/boot.js`); start-up work cut: `saveCache` in
  `src/runtime/civilCode.js` folds the layers' saves into one deferred
  snapshot, `regionTally` in `src/runtime/studyCode.js` counts the cards at
  most four times a second, and the seven content layers that re-ran on fixed
  3-second timers now register in `window.DKLALayers` and run once from
  `boot.js` before the curtain lifts; the slow-loading notice waits for a
  stall (no readiness condition changing for 12 s) instead of a fixed 12 s.
  Report for the owner: `/mnt/project-files/dkla-audit/v27-timeline-audit.md`
  (in the project's shared folder, not the repository).
- Measured in headless Chromium before and after (same container): main
  thread busy 12.6 s in 54 long tasks before, 7.0 s in 23 after; the curtain
  lifted at 12.4 s before, 9.5 s after. The page is still one 65 MB file
  (19 MB compressed); splitting the source texts and page images into
  on-demand files is the next large start-up win and is not a hotfix.
- Earlier the same day (commit `4014cf04`): the search index is built once at
  start-up instead of sixteen times (`src/runtime/dklaR13Search.js`).
- Still waiting for the owner: everything in the 13 October list below.

## Latest (13 October 2026, later the same day)

Read this first; the sections below it are older.

- Pushed and confirmed live earlier today: the picture check and the move to
  `src/features/` (GitHub check passed, Vercel deployed, live build stamp
  matched). The owner then uploaded 32 course files to `added-sources/`
  (commit `c548102a`).
- **Committed locally on the live branch, not yet pushed** (everything after
  `c548102a`): the 32 files recorded in the content inventory; `pnpm coverage`
  and `pnpm lint:survey` and the ast-grep removal tool; 22 dead earlier
  versions of functions removed; the review plans in
  `docs/new-sources-review/`; Civil Procedure on the October 1 syllabus;
  session cards in each course. `pnpm verify` passes 44 of 44.
- Restore points (local tags): `session-start-2026-10-13b`,
  `pre-dead-code-2026-10-13`.
- **Still waiting for the owner:** the `improve/server` branch (now several
  commits behind; rebase before use); whether the 32 new files may be
  published (they are NOT in `tools/public-files.json`, so session cards
  carry no slide links); the "Conflicts to settle" lists in the three review
  plans.
- **Not started:** applying the review plans to the atlas content (new entries
  and deeper existing entries). That is the next large piece of work. Follow
  the pattern the session-cards work used for corrections (run-time edits over
  the open graph, see AGENTS.md), keep every sentence tied to a slide or page,
  and never publish an answer to a slide question as the professor's answer.
- Found and left alone: a cold `#node=` link lands on Home instead of the
  entry (older than today); `mergeGraph` and `D` are referenced in
  `src/features/v25/practice-filter.js:105` and `geography.js:335` but are not
  visible there, so those two guarded branches never run (see
  `docs/lint-survey.md`); ten more replaced-before-run functions the removal
  tool refused (listed by `node tools/codemods/remove-dead-versions.mjs`).

## State

- One working folder: `C:\Users\danie\Projects\DKLA`. The old OneDrive copy
  held nothing unique; Danny was told he can delete it.
- Live branch: `claude/atlas-design-content-audit-m1cw9x`. A push to it makes
  Vercel build and deploy dannykind.wiki and dkla.dev. Agents cannot push from
  this machine (no stored GitHub login); Danny pushes with GitHub Desktop.
- **Not yet pushed** when this was written: `ad658b95` (the `package.json`
  fix) and the commits after it (the picture check; the move to
  `src/features/`; this note). After the push, confirm the three things
  listed below.
- **Waiting for Danny's say-so:** the local branch `improve/server` (one
  commit on top of the move). See "The server branch".
- `pnpm verify` builds and runs 44 steps in 30 to 50 seconds.
  `pnpm verify:teeth` breaks eighteen things on purpose and requires the pass
  to fail each time (about twelve minutes).
- Tools are not on PATH. Each shell call needs
  `%LOCALAPPDATA%\dkla-tools\node` prepended to PATH and `DKLA_PYTHON` set to
  `%LOCALAPPDATA%\Programs\Python\Python312\python.exe`. Git is inside the
  GitHub Desktop installation (and on PATH in Git Bash). Run `pnpm` from
  PowerShell or cmd; from Git Bash it fails to start.
- After a push, confirm three things: Vercel's status and the check run for
  the commit (public GitHub API; failed steps appear as annotations), and
  `https://www.dannykind.wiki/version.json` showing the new build.

## What changed in this session

1. **Wider browser coverage.** `tools/verify/views.spec.mjs` opens fifteen
   main views at a desktop and a phone size, checks each holds what it should,
   and compares it with a recorded picture (`tools/verify/views/win32/`).
   25 runs in a row matched. Three new breakages in `break.mjs` (the reading
   layout never installing, and two looks only a picture can catch) are all
   caught. `tools/verify/README.md` explains how to re-record after an
   intended visual change (`pnpm views:update`).
2. **Shipped feature code moved to `src/features/`.** The ordered list is
   `src/features/manifest.json`. Datasets, build scripts and checks stayed
   under `tools/`. The built page differs from before only in the 36 path
   comments that mark each module and in the build stamp.

## Session cards and the October 1 Civil Procedure syllabus

On the branch `feature/session-cards`, not merged and not pushed. Danny asked
for both.

**Built**

- **Session cards.** Opening Contracts, Civil Procedure or LRS now shows a
  strip of cards on that course's map: 26 reading assignments, 14 syllabus
  weeks, 26 classes. A card has the number, the date where the syllabus gives
  one (Contracts gives none), the title and a line of the reading; it opens
  the view that already existed for that session. Code:
  `src/features/sessions/sessions.js` and `sessions.css`. The cards are built
  from the schedule records already in the graph; nothing was copied. The
  strip shows only at course level (the location bar reads "Atlas > course"),
  folds to a small button (remembered in `localStorage` as
  `dkla.sessions.v1`), starts folded on a window under 560 pixels tall, and
  is absent from Home, subjects, the reading panel, SCOTUS History and print.
- **Civil Procedure follows the October 1, 2026 syllabus.** Weeks 6 to 9 were
  re-divided and Eliscu added to week 6. `src/data` was **not** edited (see
  the new note in `AGENTS.md`: a saved copy would hide the change). The
  revision is `tools/sessions/civil-syllabus.json`, applied at run time by
  `src/features/sessions/civil-syllabus.js`; the step "Civil Procedure follows
  the October 1 syllabus" checks it against readings copied from the PDF.
- Three new views in the picture check and two new breakages (16 and 17).

**Remains, for Danny to decide or for a later session**

1. **Eliscu has no map entry.** Week 6 names it in its text and the brief
   `CP-034` (T. B. Harms Co. v. Eliscu) is on file, but the week's case list
   cannot link it. That "Eliscu" means that case is an inference: the syllabus
   prints one word and no page.
2. **The syllabus pages shown in the atlas are still September 3** (four page
   images and the PDF link). They are labelled as such. Replacing them means
   new page images in `src/data/civilArchive`, a fifth page in
   `openCivil` (`src/runtime/civilCode.js`), and publishing
   `added-sources/Syllabus 10_1_2026.docx.pdf` through
   `tools/public-files.json`, which is Danny's decision.
3. **Proposed, not printed in the syllabus:** the titles of weeks 6 to 9, their
   casebook page spans, and listing the venue entries under week 8
   ("Continuing venue") as well as week 7. All are listed in the dataset
   under `notPrinted`.
4. Left alone, wrong regardless of the new syllabus: week 14 still says Cross
   "remains a visible gap", week 10 and 14 point at the stub notes
   `cp-berk-gap` and `cp-cross-gap` although `cp-berk` and `cp-cross` exist,
   and the Help text says the same.
5. Not built: marking today's class or week on the strip, the lecture or
   cold-call letter (S / L) on Civil Procedure cases, slide decks on LRS
   cards, the review-session card proposed in
   `docs/new-sources-review/civil-procedure.md`.
6. On a wide window the open strip covers the dimmed "Study workbench" tile
   at the foot of the Contracts map. Folding the strip uncovers it.

## The server branch (`improve/server`)

Code and tests only; nothing was run against the live database, Neon or
Vercel. It must not reach the live branch until Danny agrees, because on its
first start it creates one bookkeeping table (`dkla_migrations`) there.
`tools/analytics/README.md` on that branch describes all three changes:

- Database structure as numbered steps; a starting function reads one number
  instead of re-sending the whole structure. Step 1 is the old `schema.sql`.
- The server reads a 0.4 MB entry list on first use, not the 1.46 MB dashboard
  catalogue at every start. The two committed catalogue copies are removed.
- The rate limiter writes less often. Strict limits are unchanged.

What nobody has checked: that Neon reports a missing table with the code
`42P01` the way the test database does (the first start depends on it), and
that Vercel packages `lib/analytics/entries.json` and
`lib/analytics/migrations/` with each function (`vercel.json` lists them).
Check both on a Vercel preview with an isolated Neon branch before production.
To merge once agreed: rebase or merge `improve/server` onto the live branch,
then `pnpm verify`.

## Next

1. Push, and confirm the deployment as above.
2. Danny's decision on the server branch; then the preview check described.
3. Pictures for GitHub's Linux runner. It has none, so there the views are
   opened and checked but not compared. Recording them needs a run on Linux
   (the workflow could upload them as an artifact to commit).
4. Seen while recording pictures, not changed: at 390 pixels wide the search
   box in the top bar is a small empty square until touched, and "Privacy" is
   cut off at the right edge.

Leave for later unless the owner asks: renaming one-letter variables,
removing the dead earlier versions the survey lists, collapsing the override
chains into real modules, untangling the style sheets, regrouping the JSON
files, giving the `src/features/` folders names that say what they hold.
Two data files still mention old `tools/...` code paths in their notes
(`tools/r19/data/rules22.json`, `tools/v25/practice-filter.json`); they are
pinned content and were left alone. `tools/r19/integrity.json` is an old
record nothing reads.

## Things that went wrong, so they are not repeated

- A stray comma in `package.json` passed every check (they are started with
  node directly) and failed the real deployment. `check_config.mjs` now
  catches it. Run `pnpm verify`, through pnpm, before handing over a push.
- Thirteen browsers at once starved GitHub's small runners; the runner now
  budgets by processor count.
- Two steps with the same name silently ran as one; the runner refuses
  duplicates.
- Files saved with Windows line endings fail the build's block comparison.
  Everything is LF (`.editorconfig`).
- One pass hung for over five minutes with no output and was never explained.
  If `pnpm verify` sits silent for minutes, investigate rather than rerun.
  One cause found this session: a browser wait with no time limit, when a
  feature never installs. Give every wait a limit.
- Replacing `tools/v25/geography.js` in text also hit
  `tools/v25/geography.json`. When renaming paths in bulk, match whole names.
- Playwright empties its output folder when it starts. Two Playwright steps
  must not share one (the Home check uses `test-results/`, the picture check
  `work/views/`).
