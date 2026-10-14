# Where the work stands (13 October 2026, second session)

Written at the end of a session so the next one can pick up cleanly.
Update or replace this file when the state changes.

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
