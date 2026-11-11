# Danny Kind Legal Atlas (DKLA)

A law-study web app: three first-year courses (Contracts, Civil Procedure,
Legislation and the Regulatory State) as one zoomable map, with a brief for
every case, the source readings, a legal dictionary, Cold Call narratives,
study drills and Supreme Court history. It works offline after the first load.

Live at dannykind.wiki. The private analytics dashboard is at dkla.dev.

## What is in this repository

| Path | What it is |
|---|---|
| `src/` | **Source of the base app.** The original atlas split into editable parts: `runtime/` (JavaScript), `styles/`, `markup/`, and `data/` (about 30,000 small JSON records: the map, the archives, the dictionary, SCOTUS records). `src/manifest.json` lists the parts in order. |
| `src/features/` | **Source of everything added since.** The code and styles of each later feature, in a folder named after the revision that introduced it: `r19/` (briefs, timelines, takeaways, the offline worker), `cold-call/` (the reader and the frosted button), `v25/` (rules and authorities, map geography, the reading panel, the Home layout), `v26/` (typography, the embedded font, the SCOTUS building in `typography.js`), `performance/` (loading briefs on demand), `analytics/` (the visitor analytics client), `sessions/` (the session cards on each course map, and the October 1, 2026 Civil Procedure syllabus). `src/features/manifest.json` lists them in the order they load. |
| `tools/r19/` | **Content and build.** Briefs and their data (`data/`), and the assembler that builds the app (`assemble.py`). |
| `tools/cold-call/` | **Content.** Cold Call narratives (`narratives/`), their index and checks. |
| `tools/v25/` | **Datasets and checks** for rules and authorities, the map geography, the reading panel and the Home layout, and the scripts that build those datasets. |
| `tools/v26/` | The owner's typography and SCOTUS building decisions (`TYPOGRAPHY.md`) and the font files the embedded fonts are made from (`assets/`, written into the page by `embed-fonts.mjs`). |
| `tools/performance/`, `tools/sync/`, `tools/analytics/` | Tests and build steps for loading briefs on demand, ratings sync and visitor analytics. |
| `tools/sessions/` | **Content and a check.** The October 1, 2026 Civil Procedure syllabus as a list of edits over the September weeks (`civil-syllabus.json`), and the check that the weeks follow it. |
| `tools/r12/` | Three course layout designs still read by the geography check. |
| `tools/verify/` | **Checks.** See "How to know it still works". |
| `tools/*.mjs`, `tools/source/` | The build, the local preview server, and tools for reading single records out of `src/data`. |
| `api/`, `lib/` | **Server.** Vercel functions for analytics, the admin dashboard, ratings sync, and Ask Dottie (the AI research assistant). |
| `assets/admin/` | The private dashboard's page, script and styles. |
| `added-sources/` | **Content.** The assigned readings, opinions, briefs and dictionary source (660 MB of PDFs and text). Published as-is. |
| `DKLA-sources/` | Manifest of the scanned casebook pages (the images themselves are not in the repository). |
| `how-to-use.html`, `guide/`, `privacy.html`, `restore-page-images.html`, `icons/`, `manifest.webmanifest` | Small published pages and assets, served as they are. |
| `tools/public-files.json` | The exact list of files that get published. Nothing else leaves the repository. |
| `vercel.json` | Hosting: the build command, redirects from every old version's address to the current one, and cache rules. |
| `docs/history/` | Old handoffs and audit notes from earlier agent sessions. History, not instructions. |
| `archive/` | The retired pipeline that first built the SCOTUS data, and one old verification record. Not used by the build. |
| `dist/`, `work/`, `test-results/`, `node_modules/` | **Output and scratch.** Created by the build and the checks. Never committed. |

All code that reaches a visitor is under `src/`. Later features were added as
layers on top of the base app; `src/features/manifest.json` is the ordered list
of those layers. Their datasets and checks are still under `tools/`, in the
folder with the same name.

## How to build it

You need Node 24, pnpm 11 and Python 3.10 or newer. On Windows, if Python is
not on PATH, set `DKLA_PYTHON` to its `python.exe`.

```sh
pnpm install --frozen-lockfile
pnpm build       # writes work/build/ and the public dist/
pnpm preview     # builds, then serves dist/ at http://127.0.0.1:8766/
```

`work/build/DKLA-v2.9.html` is a complete single-file copy of the atlas.
`dist/` is exactly what the website serves: the same page with the full
briefs split out so they load when opened.

Pushing to the branch `claude/atlas-design-content-audit-m1cw9x` makes Vercel
run the same build and publish it to both domains. Nothing else deploys.

## Ask Dottie

Ask Dottie (named Ask DKLA in the code and server) is the AI research assistant, fronted by
Dottie Docket, an opossum mascot (see `docs/ask-mascot/`).
Open the Atlas search box and choose **Ask Dottie** to ask directly, or
type a question into search and choose **Ask Dottie** above the results. An
Atlas citation opens its entry inside DKLA. Ask Dottie answers from the Atlas alone only
when the whole question is one of a few strict templates about exactly one Atlas entry
(`lib/ask/web.js` `route` and `templates`): "what is", "define", "explain" or "what does ...
mean" with an entry title or dictionary headword ("what is res judicata", "explain the mailbox
rule"), a named case or Act; "what does ... say/require" or "what is" with one rule or section
citation ("12(b)(6) motion", "Rule 56", "§ 1983", "28 USC 1332", "APA § 553"); "what did
<case> hold/say/decide", "the facts/holding/reasoning of <case>", "explain/summarize/brief
<case>", "who wrote/dissented/concurred/joined in <case>"; the same with "this case", "it" or
"the holding" when an entry is open (never in a follow-up, where "it" belongs to the
conversation); and "the difference between A and B" or "compare A and B" with both named.
Politeness, case, punctuation and common typos in the template words are allowed; one more
word anywhere is not. Everything else researches the web, with the top Atlas excerpts
supplied, so Atlas citations appear beside web ones. A research question about legislation,
events, dates, people, later history or the present must cite the web, and gets an honest
empty answer if the search fails; any other research question falls back to the Atlas when
the search fails or finds nothing usable. Every answer, Atlas-only or researched, passes a
server check paragraph by paragraph: one that answers a substitute question ("you are probably
asking about", "assuming you mean", "the closest Atlas match") is dropped, and so is one whose
sources, Atlas or web, are all the wrong kind of authority (a case for "what statute", even
typed "whatt statue"; statute entries filed as rules count as statutes) (`lib/ask/answer.js`
`checkAnswer`, `lib/ask/web.js` `citeResearch`). Cancelling a question, or closing the tab,
stops the OpenAI calls, even during a cold start; a timeout or network failure gives an
honest empty answer.
While she works, the dialog shows a spinner of three opossums round her question-mark tail,
with playful words, or the real step the server reports (the browser asks for progress with
`Accept: application/x-ndjson`; without it the reply is the plain JSON it always was).
Opening the dialog or typing sends a warm-up (`{ "warm": true }`) that loads the corpus
without a question, an AI call or any record. The build stores the retrieval index beside
the corpus (`work/build/ask-index.bin.gz`), so a cold start takes about 0.3 s, not 1.8 s.
Cost: most questions now use web search: 449 of the 566 in the routing test (79%), which
holds every question three reviews probed and leans toward hard questions; ordinary study
questions ("what is X", "what did X hold") are the templates that stay on the Atlas. A
research answer costs more than an Atlas-only one (web search calls and more tokens, one
request either way), and research that finds nothing makes a second, Atlas request when the
question allows it. Research is never started alongside an Atlas answer: that would pay for
research on every Atlas question to save seconds only on the few whose draft falls short. The
shared answer library (below) answers a repeated first question without any OpenAI call.
Rankings and current-law claims depend on what the cited sources establish.
The AI needs an internet connection. Atlas search and offline reading work as before.

Set `DKLA_OPENAI_API_KEY` in the server's secret environment. Use a dedicated
OpenAI project key from the API organization with your active ChatGPT Pro credit grant.
Ask DKLA calls the OpenAI Responses API directly with response storage disabled. Atlas
questions use a short structured response. For questions that need outside evidence,
the same OpenAI request searches and writes the answer. Citation-ranking questions
can also use the published 2018 HeinOnline ranking, cached for one hour per server instance.
The build prepares a server-only corpus from the published Atlas edition.
Ask Dottie keeps no conversation history. It does keep a shared answer library
(`lib/ask/library.js`, table `dkla_ask_answers` in the analytics database): a
first question (not a follow-up) asked before in exactly the same words
(ignoring only case, punctuation and an opening or closing "please"/"thanks"),
about the same open entry, gets the stored answer at once ("Saved answer
from ..."), without calling OpenAI; "Ask fresh" asks again. Each answer is
tied to the Atlas corpus, the answering code (`api/ask.js`, `lib/ask/*.js`)
and `ANSWER_VERSION` in `lib/ask/library.js`, so a deploy that changes the
corpus or the routing (or a change of that constant, for a new model) stops
older answers being served. Time-sensitive
questions ("still good law", "overruled", "current", a year, ...) are never
kept. Entries keep no visitor identity, are used for 90 days, are deleted
after that (on lookups at most every 10 minutes per server instance, on each
store, and by the dashboard's storage housekeeping), and are skipped
silently if the database is missing or failing. "Save answer" under an answer
keeps it only in that browser (`localStorage` key `dkla.askSaved.v1`,
`src/features/ask/saved.js`), listed under "Saved answers". Questions typed into
the main search bar still fall under its existing analytics policy.

## How to know it still works

```sh
pnpm verify      # builds and runs everything below; about half a minute
```

The steps run side by side as soon as what each one needs is ready. The list,
with what every step waits for, is `tools/verify/tasks.mjs`. A failed step
prints its full output at the end, and the last line names the chain of steps
that set the total time. `node tools/verify/run.mjs --serial` runs the same
steps one at a time.

1. **Content.** `tools/verify/content.py` confirms that no brief, opinion,
   PDF, dictionary record or dataset was added, removed or altered.
2. **Data in the built page.** `tools/verify/data_guard.py` confirms every
   data block in the built atlas is exactly the approved one. Code is not
   pinned: it is free to change and is judged by the checks below.
3. **Features and data.** `pnpm check`, the analytics tests and the dataset
   checks under `tools/v25/` and `tools/cold-call/`.
4. **Old addresses.** `tools/verify/check_routes.mjs` confirms every earlier
   version's address still redirects to the current atlas.
5. **A real browser.** `pnpm smoke` drives the built site at desktop, landscape
   phone and portrait phone sizes: opening a subject, a case and its Cold
   Call, old links, the dictionary, authorities, SCOTUS History, Study,
   export and restore, and a saved note surviving a reload. It also checks
   that the map layout has not moved, that Home fits nine window sizes, and
   that nineteen main views still look like their recorded pictures
   (`pnpm views`; see `tools/verify/README.md`).

Before removing or restructuring code, three report-only surveys show what
actually runs and what is redefined or unused: `pnpm coverage`,
`pnpm lint:survey` and `node tools/verify/survey.mjs` (see
`tools/verify/README.md`).

To see exactly what a change would alter for a visitor, keep a copy of
`work/public-manifest.json` from before, rebuild, and run
`node tools/verify/compare-output.mjs before.json`. A change meant to alter
nothing must report "identical".

None of this touches the live site, the database or visitor data.

Two things keep it fast, and neither is taken on trust. The source under
`src/` is 30,000 files that a dozen steps need joined together, so the joined
copy is kept in `work/cache`; every pass re-reads all the files and fails if
the copy differs. Packaging leaves a file in `dist/` alone when it already has
the right bytes, but still reads every file back and compares it. Deleting
`work/` and `dist/` is always safe; the next pass rebuilds them (a few seconds
slower).

## Things that must not break

- Saved work. The browser storage keys `legal-atlas-v1:<graphId>:dkla-r8-rebuilt`,
  `dkla.study.v1` and `dkla.coldCall.v1`, and the IndexedDB database
  `LegalAtlasPortable`.
- The export, import and sync formats.
- Old links: every earlier version's address redirects to the current atlas,
  and old `#` routes still open the right entry.
- Offline use.
- The legal content: briefs, opinions, PDFs, dictionary records and datasets.

## Recovering anything that was removed

The October 2026 cleanup removed nine old committed builds, the patch scripts
of revisions 9 to 14 and other leftovers. They remain in git history; the tag
`pre-cleanup-2026-10-13` marks the last commit that had them all.
