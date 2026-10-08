# Danny Kind Legal Atlas

**Open `DKLA-r20.html`** after downloading the [repository ZIP](https://github.com/D3m0sthene5/DKLA/archive/refs/heads/claude/atlas-design-content-audit-m1cw9x.zip). Keep the HTML beside `added-sources/`; the linked readings open locally in your browser as PDFs. A single HTML file downloaded without its PDF folder cannot open those local source files. The older `DKLA-r8.html`, `DKLA-r16.html`, `DKLA-r17.html` and `DKLA-r18.html` remain available for comparison.

In r17, a Supreme Court case's reading panel gives its sourced vote breakdown and a direct button to that case in SCOTUS History. The atlas header and center use the interlocking DKLA mark. Assigned textbook, Contracts supplement, Civil Procedure, LRS and Katzmann source links open the original supplied PDFs at their physical page. Sixty-one full court opinions open original PDFs; sixteen remaining opinion text citations open the actual assigned packet excerpt and are labeled as such. The small number of outside web or Word citations retain their stated format.

The exact previous default revision is preserved at [`archive/pre-r17-default-a73d9df-2026-09-27`](https://github.com/D3m0sthene5/DKLA/tree/archive/pre-r17-default-a73d9df-2026-09-27). Source data and build checks for r17 live in `tools/r17/`. `python3 tools/r17/pdf-routes.py --check`, `python3 tools/r17/assemble.py`, and `python3 tools/r17/check.py` validate and reproduce the release.

## r18 (3 October 2026)

r18 adds a study layer on top of r17 without changing any of its content. The **Study** button in the header (or Shift + D) opens four tabs:

- **Drill**: say the answer aloud, reveal it in stages (issue, holding and rule, reasoning for a case; rule, full account, cases for a concept), and rate it Clean, Patchy or Blank. Sessions can be filtered to what needs work or is unrated, capped at 10/20/30, or run as cram to mastery. A whole session runs from the keyboard.
- **Pairs**: confusable cases and doctrines with the distinguishing line first, drawn from the notebook's own Tension, Analogy and contrasting connections.
- **Sheets**: every rule line in a course or subject in reading order, with the pairs as a comparison chart, and a Print / Save PDF button.
- **Progress**: ratings by course and subject, sync, install, version and changelog.

Ratings show on the map (a bar on each subject tile, a dot on each rated card) and can be set from the reading panel.

On the map, course names and the centre mark now keep the same proportions on every screen, the course view always holds the whole course, and a subject opens as subtopic tiles that list their entries instead of a bulleted list.

When the repository is served (Vercel), the atlas installs as an app and loads without a connection, and ratings sync across devices by a code. Sync needs a Vercel Blob store connected to the project (it provides `BLOB_READ_WRITE_TOKEN`); without one the Progress tab says so and ratings stay in the browser. Opened as a local file, everything except install and sync works as before.

`python3 tools/r18/assemble.py` builds `DKLA-r18.html`, `sw.js` and `version.json` from `DKLA-r17.html`; `python3 tools/r18/check.py` validates the result.

## r19 (5 October 2026)

r19 brings Codex's audited briefs into the atlas. Codex wrote and independently reviewed a brief for every case in the readings (1,467 so far, each checked against the full opinion); r19 uses a snapshot of that work.

- **Cases on the map (391 of 392).** Each takes its six sections, in the order Parties, Procedural History, Material Facts, Issue, Holding, Reasoning, and its rule line from the audited brief. The conversion was done by agents working only from the brief's text and then re-checked sentence by sentence by a second, independent set of agents (79 corrections across 70 entries). The complete audited brief sits under each case as a collapsed **Full brief**, with its review status. The one case without a brief is the Swiss contractual-penalty decision.
- **Your edits are kept.** A case you have edited in your browser keeps your text; its panel offers a "Use the audited brief" button instead.
- **Supporting cases (1,076).** Cases the readings mention without assigning (note cases, cases cited in passing, other stages of an assigned case) are kept off the main route. Each course has a **Supporting cases** tile that opens one searchable list; they also appear in the search bar and the More menu. They show Codex's full brief; they do not have custom icons.
- **Review status is visible.** 79 briefs were still awaiting independent review and 44 passed with a source limitation when the snapshot was taken; both are marked.

`tools/r19/snapshot.py` takes a new snapshot from Codex's working folders, `tools/r19/merge_conv.py` merges converted batches, and `python3 tools/r19/assemble.py` then `python3 tools/r19/check.py` build and validate. The step is re-runnable: only briefs whose text has changed need converting again.

**r19.1 (same day).** Supporting cases now carry the six sections as well (1,072 of 1,076; four entries are casebook problems or editorial accounts, not decisions, and stay as full briefs). The 79 briefs Codex had not yet reviewed were audited against the opinion text and casebook pages Codex saved: 19 needed nothing and 60 were corrected (138 corrections, mostly pinpoint pages and printed casebook page numbers, with a smaller number of factual and attribution fixes). An audited brief shows a second status chip and a "Claude's audit" section listing what was checked and every change; Codex's own status stays beside it. Two of the 58 supporting batches (about 36 entries) were converted but not put through the second verification pass.

