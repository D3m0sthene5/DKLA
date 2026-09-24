# DKLA (Danny Kind Legal Atlas): instructions for coding agents

`DKLA-r8.html` is the working copy of the atlas. It is a single-page app whose data, styles and code all live inline in the HTML, except for source-page images and PDFs, which live in `DKLA-sources/` and are referenced by relative paths such as `"DKLA-sources/contracts-casebook/printed-page-0001.webp"`. The HTML and the `DKLA-sources/` folder must stay side by side, because the browser loads each page image from that folder when the reader opens it.

## Reading the file safely

The HTML is about 17 MB, and several `<script type="application/json">` blocks are single lines several megabytes long. Never print the whole file or a whole JSON block. Locate blocks by id and read bounded slices, or parse a block with a short Python or Node script and print only the fields you need.

| Block id | Kind | Approx. size | Contents |
|---|---|---|---|
| `seedData` | JSON | 6.3 MB | The atlas graph: nodes (cases, doctrines, notes), edges, courses, map positions. This is the main editable data. |
| `textbookUpdate` | JSON | 0.8 MB | Patch applied by the "textbook" import mode. |
| `bookArchive` | JSON | 2.4 MB | Contracts casebook pages keyed by printed page: text, assignments, linked node ids, `image` path. |
| `suppArchive` | JSON | 0.4 MB | Contracts supplement pages, same shape as `bookArchive`. |
| `civilArchive` | JSON | 4.1 MB | Civil Procedure page text and PDF-page mapping; `casebookPDF`, `malloryPDF`, `syllabusPDF` are paths to PDFs; `malloryImages`, `syllabusImages` are paths to images. |
| `lrsArchive` | JSON | 2.7 MB | Legislation and the Regulatory State sources: page text, printed labels, checksums, `image` paths. |
| `lrsSyllabusText`, `dklaIcons` | JSON | small | LRS syllabus text; icon definitions. |
| `appCode`, `compatCode`, `studyCode`, `semesterCode`, `civilCode`, `dklaCore`, `dklaUI` | JS | 6–63 KB each | Application code, loaded in that order; later layers override earlier functions. |

Style blocks load in the same order (`studyStyle`, `semesterStyle`, `civilStyle`, `dklaStyles`, `dklaR9Styles`); the last one holds the revision-9 presentation overrides.

## Revision 9 (September 2026)

`tools/r9_content_update.py` applied the audit corrections to `seedData` and `dklaIcons` (it refuses to run twice). The presentation changes were made in place:

- `studyCode`: `clampCamera` keeps the camera on the content and `zoomFloor` sets the minimum zoom; two wheel ticks past the floor open the three-course overview. `taperedRibbon` draws connections as tapered ribbons (wide at the source). `regionTally`/`regionWeight` size subject titles, fills and the count line by how many entries a subject holds. `entrance` grows subtopics and entries into place when they first appear; it honours `prefers-reduced-motion`.
- `dklaUI`: the overview lists the courses in reading order in a three-column grid; "Proposed" is no longer shown on relationship cards (only "Reviewed ✓" and "Disputed" are marked); the connection lens no longer repeats the reading panel; case entries open with a "Rule in one line" callout; the coverage dialog carries one scope note per course from `seedData.scopeNotes`.
- Subject geometry (`studyMap.regions`, `districts`, `homes`) is unchanged, so saved map homes still resolve. Sizing regions by entry count would need a relayout of every home.

### Revision 9b (same day)

- `tools/r9_polish.py` removed the sentences about the entries themselves ("this account", "this notebook", citator and current-law caveats, "the excerpt does not supply") and added `seedData.timelines`: 21 doctrine timelines (personal jurisdiction, Erie, pleading, nondelegation, removal, deference, damages, and so on) with 152 steps, each a case id, a year and a one-line note on what changed. The reading panel shows a timeline on every case that is a step and on every concept that at least three steps link to (`timelinesFor` in `dklaUI`).
- `tools/r9_apply_verification.py` applied `tools/verification-2026-09.json`, the output of a check of 223 case entries against Quimbee, Studicata, Casebriefs, Oyez and Justia snippets (the other 156 could not be checked in that session): 21 fields corrected, 301 additions appended to entry notes (votes, opinion authors, citations, facts, rule statements), and 440 case-to-concept links added as topics on the case plus `r9v-` connections. Re-run the check on the unchecked cases when a session with web-search budget is available.
- The cross-course "bridges" section is no longer rendered on the overview; the data (`seedData.dklaBridges`) is still there.
- Interface copy was rewritten in plain words; `help()` is overridden in `dklaUI`. Motion lives in the `dklaR9bStyles` block (panel slide-in, staggered sections, petal and timeline entrances, hover lift, press feedback) plus the selection pulse and ribbon draw-in inside `draw()`. Taps on buttons trigger a 6 ms `navigator.vibrate` on touch devices. `prefers-reduced-motion` disables all of it.

## Revision 10 (24 September 2026)

- `added-sources/` holds the readings that were missing: the class 1–6 LRS opinions, the Parrillo–Shane supplement, the Slaughter supplement (Word), Mead, Berk v. Choy, Cross v. United States, the Civil Procedure supplement (354 pages) and the Contracts Selections (713 pages). `safeURL` and `sourceHTML` accept relative `added-sources/…` and `DKLA-sources/…` links (spaces allowed, `encodeURI` on output); the 23 former gap notes now link to the files with status `Source received`, and the 31 Civil Procedure provision guides link to the supplement.
- Thirteen new briefs were written from those files and merged by `tools/r10_merge_briefs.py` (ids `lrs-k-rucho`, `lrs-k-riggs`, `lrs-k-cargill`, `lrs-k-vanderstok`, `lrs-k-train`, `lrs-k-mcboyle`, `lrs-k-gustafson`, `lrs-k-people-smith`, `lrs-k-public-citizen`, `lrs-k-epic`, `lrs-k-trump-illinois`, `cp-berk`, `cp-cross`); Mead (`lrs-i-mead-note`) became a full brief and Trump v. Slaughter carries the supplement digest. Map homes came from the app's own `r6Place`, driven headlessly, so the LRS cases sit in a continuation area of "Katzmann and interpretive methods" and Berk in an Erie extension. A new timeline, "Statutory interpretation: text, purpose and the canons", threads them.
- The overview is a galaxy (`galaxyLayout`/`galaxySVG` in `dklaUI`): three spiral arms, one per course, every entry a star (cases bright, concepts mid, notes faint), seven cross-course theme hubs between the arms (`GALAXY_THEMES`, matched by concept-title regex plus the old bridge edges) and the 59 real cross-course connections as threads. Hover shows a name, click opens the entry or the hub's member list, wheel-in over an arm opens that course. The course cards sit beneath.
- Connection ribbons no longer need both endpoint cards on screen: they draw from the selected entry to every connected home, with a labelled marker (`.ribbon-end`) where the far card is not drawn, so they survive panning and zooming out.
- District headers place the question below however many lines the title needs; short cards get one-line labels.
- Icons: `tools/r10_icons.py` holds a 289-glyph library and one hand-picked `(motif, modifier)` per case, asserted unique; `dklaIcons.modifiers` holds the badge glyphs and `symbol()`/`decorateMap()` draw them at the bottom-right. The caption under a case title comes from `icons.records[id].label`.

## Rules

- Do not convert source paths back into base64 or `data:` URIs inside `DKLA-r8.html`; that would recreate the 363 MB file.
- To add a new source page, save the image or PDF under `DKLA-sources/` and put its relative path where the code expects an image or PDF value. Add an entry for the new file to `DKLA-sources/manifest.json` (path, archive, mime, encoding `datauri` for images or `base64` for PDFs, bytes, sha256) if it should be included in standalone builds.
- The browser opens this file from `file://`, so JavaScript cannot `fetch()` files from `DKLA-sources/`. Load sources through `<img src>`, `<iframe src>` or `<a href>` only.
- `python3 tools/build_standalone.py` builds `DKLA-standalone.html`, a single self-contained file with every source inlined. Built from the unedited `DKLA-r8.html`, it is byte-identical to the original `DKLA-r8-rebuilt.html`; run it after edits to confirm that every source path still resolves (it warns about missing paths or changed files).
- If `DKLA-sources/` holds only `manifest.json`, recreate the images and PDFs with `python3 tools/extract_sources.py /path/to/DKLA-r8-rebuilt.html`, which reads them out of the original self-contained file and checks every checksum.
- `DKLA-sources/manifest.json` records the SHA-256 checksum of every extracted file and the two code edits made for the folder version (a path check in `civilPDF` in `civilCode`, and the export confirmation message in `dklaCore`).
