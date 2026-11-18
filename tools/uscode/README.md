# The whole United States Code (v3.1)

Rules & authorities > United States Code > All 54 titles lists every title, its official structure
(subtitles, chapters, subchapters, parts, subparts) and every section's number and heading. Sections
DKLA holds in full (`tools/v25/uscode.json`) open their text as before; any other section opens a short
page with its citation, heading, place in the title and a link to the official text at uscode.house.gov.
An exact citation typed in the search box ("20 USC 1001", "§ 1001 of title 20") finds the section; no
whole-Code entry is in any search index, so word searches are unchanged.

## Files

| Path | What it is |
|---|---|
| `uscode/title-1.json` … `uscode/title-54.json` | One file per title: headings and structure only, no statutory text. Published (listed in `tools/public-files.json`) and pinned as content (`tools/verify/content.py`). |
| `src/features/v31/uscode-titles.js` | Generated: the 54 title names, section counts and each file's SHA-256, compiled into the page (about 6 KB). |
| `src/features/v25/authorities.js` | Browsing: the block "the whole United States Code (v3.1)" loads a title's file when the title is opened and builds its tree. |
| `src/features/v31/uscode.js`, `uscode.css` | The citation search result and the section page's styles. The search calls it from one line in `src/runtime/dklaR13Search.js` (marked "whole U.S. Code"). |
| `tools/uscode/build_index.py` | Builds the files above; `--check` re-verifies them offline. |
| `tools/uscode/check-browser.mjs` | The browser check (step "whole U.S. Code" in `pnpm verify`). |

A section row is `[number, heading]`, or `[number, heading, status, editorial note]` where `status` is
`repealed`, `transferred`, `omitted`, `renumbered` or `reserved` (as the heading itself says) and the
editorial note is an OLRC footnote to the heading ("So in original ...").

## Source and release

Release point **119-118**: the Code current through Public Law 119-118 (September 30, 2026), the same
release `tools/v25/uscode_build.py` pins for the full-text statutes, so every citation agrees with them.

The official OLRC download (uscode.house.gov) could not be reached from the machine that built these
files (its network allowed only package registries and GitHub). Two public copies generated from the
official OLRC USLM XML were used instead, and checked against each other and against DKLA's own
official extraction:

- **Which sections exist, and their headings, at 119-118**: `junxit/us-congress-code`, tag
  `pl-119-118` (commit `039b5566188fbec8d8460b4b7d70bc8b103a6e26`), Markdown generated from
  `xml_uscAll@119-118.zip`.
- **Structure, document order and headings**: the Baja Labs `us-federal-law` database, release v1.0.0
  (`us-federal-law.sqlite.zst`, SHA-256 `318ea8e0150e9bc08e510bf6a195fa6e18b1d68f32b68b12fbc2461d2e00046a`),
  built from the official USLM XML at release point **119-138** (November 3, 2026), with the SHA-256 of
  each official title file recorded.

The build keeps only the sections that exist at 119-118. Six sections enacted after it (15 U.S.C.
§ 45g; 16 U.S.C. §§ 410llll, 410llll-1, 430h-15; 29 U.S.C. § 570; 42 U.S.C. § 915) are left out, with the
one subchapter that held only new sections. Every other heading agrees between the two copies except
where one of them printed an editorial footnote marker into the heading; the build removes the marker
(keeping the footnote as the editorial note) and stops on any other difference. All 928 official
headings and statuses in `tools/v25/uscode.json` agree with the result (`--check`).

What could differ from an official 119-118 extraction: the name of a chapter or other division renamed
between 119-118 and 119-138 (none is known; the section lists of the two releases otherwise match).
Title 53 is reserved and holds no sections. The appendices (5a, 11a, 18a, 28a) are not titles and are
not included.

Counts: 54 titles, 60,457 sections (including repealed, transferred, omitted and renumbered ones), 4.2 MB
in all (1.1 MB compressed); the largest file, Title 42, is 601 KB (153 KB compressed).

## Rebuilding

```sh
python tools/uscode/build_index.py --hierarchy us-federal-law.sqlite --release-119-118 us-congress-code/
python tools/verify/content.py --update   # after a reviewed change to uscode/
```

## Offline

The offline worker (`src/features/r19/sw.template.js`) is unchanged: these files are not part of its
install download and it does not intercept them. The page keeps each title it opens in its own cache
(`dkla-uscode-v1`, which the worker never deletes) after checking the file's SHA-256 against
`uscode-titles.js`. Offline, a title opened before opens from that cache; a title never opened shows
"Title N has not been opened on this device yet. It needs a connection the first time." A new release
of the files changes their hashes, so stale copies are replaced on the next online visit.
