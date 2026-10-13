# Where the work stands (13 October 2026)

Written at the end of a long session so the next one can pick up cleanly.
Update or replace this file when the state changes.

## State

- One working folder: `C:\Users\danie\Projects\DKLA`. The old OneDrive copy
  held nothing unique; Danny was told he can delete it.
- Live branch: `claude/atlas-design-content-audit-m1cw9x`. A push to it makes
  Vercel build and deploy dannykind.wiki and dkla.dev. Agents cannot push from
  this machine (no stored GitHub login); Danny pushes with GitHub Desktop.
- `pnpm verify` builds and runs 42 steps in about 30 seconds.
  `pnpm verify:teeth` breaks thirteen things on purpose and requires the pass
  to fail each time (about eight minutes).
- Tools are not on PATH. Each shell call needs
  `%LOCALAPPDATA%\dkla-tools\node` prepended to PATH and `DKLA_PYTHON` set to
  `%LOCALAPPDATA%\Programs\Python\Python312\python.exe`. Git is inside the
  GitHub Desktop installation.
- After a push, confirm three things: Vercel's status and the check run for
  the commit (public GitHub API; failed steps appear as annotations), and
  `https://www.dannykind.wiki/version.json` showing the new build.

## What changed in this session

1. The SCOTUS History block on the map is drawn as the Court building: east
   pediment sculpture, eight columns, the two step statues, nine sitting
   justices in bench order. Details and the owner's decisions are in
   `tools/v26/TYPOGRAPHY.md`.
2. Repository cleanup: old builds, stray folders and dead scripts removed
   (tag `pre-cleanup-2026-10-13`, local only unless pushed).
3. Verification rebuilt: parallel, about 30 seconds instead of about 340,
   scaled to the machine's processors.
4. Data is pinned, code is free to edit in place (see AGENTS.md).
5. All code formatted with Prettier; `pnpm format` reformats and the pass
   fails on unformatted code.
6. `docs/code-survey.md`: a report-only map of the 84 globals that are
   assigned more than once.

## Next, in the order agreed with the owner

1. **Wider browser coverage.** This matters more now that no guard freezes
   the code. Use Playwright's built-in `toHaveScreenshot` for the main views
   (disable animations, pin the viewport, make baselines on this machine).
   The map redraws itself several times a second, so use the retrying helpers
   in `tools/verify/browser_smoke.cjs`. Add a breakage to
   `tools/verify/break.mjs` for each new area, and run the pass twenty-odd
   times to prove it does not flicker. Known gap: nothing notices if
   `src/features/v25/reading.js` silently fails to install.
2. **Move shipped feature code out of `tools/`** into `src/`. Mostly a path
   rename across `src/features/manifest.json`, the assembler and the
   checks. The built page changes only in its marker comments.
3. **Server** (`api/`, `lib/analytics/`): real migrations instead of
   re-running the schema on every start, one copy of the 1.46 MB catalogue,
   and the rate limiter that writes on every request. Code and tests only;
   anything that runs against the live database needs Danny's say-so first.
   A Vercel firewall rate-limit rule may replace the limiter with no code.

Leave for later unless the owner asks: renaming one-letter variables,
removing the dead earlier versions the survey lists, collapsing the override
chains into real modules, untangling the style sheets, regrouping the JSON
files.

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
  It has not recurred. If `pnpm verify` sits silent for minutes, investigate
  rather than rerun.
