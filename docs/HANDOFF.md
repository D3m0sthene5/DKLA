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
- `pnpm verify` builds and runs 43 steps in 30 to 50 seconds.
  `pnpm verify:teeth` breaks sixteen things on purpose and requires the pass
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
