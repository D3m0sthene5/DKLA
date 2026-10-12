# Editing and auditing DKLA

The published HTML is a generated, offline-capable artifact. Do not edit it.
The map, sources, briefs, narratives and later interface layers have different
owners and different evidence. Keeping those distinctions prevents a visual
change from silently rewriting a source or a legal account.

| Work | Canonical input | Validation |
| --- | --- | --- |
| Case brief text | `tools/r19/data/briefs/<id>.md`, corrected text in `audited/`, recorded exact corrections in `accuracy24.json` | `build_data()`, source comparison and narrative fingerprint checks |
| Six brief sections | `sections.json`, `plain-sections.json`, recorded conversion patches | `tools/r19/check.py` |
| Chronological Cold Call | `tools/cold-call/narratives/<case-id>.json`; three original pilots in `cases.json` | `validate.py`, `check_narratives.py`, `check_reader.cjs` |
| Doctrine development | `tools/r19/data/timelines.json` | `timeline-audit.json`, `check_timeline_audit.py`; scope in root `TIMELINE_AUDIT.md` |
| Rules and authorities | `tools/v25/authorities.json`, `authorities_build.py`, linked source records | coverage/link/text checks and `authorities_check.cjs`; scope in `authorities_README.md` |
| U.S. Code edition | `tools/v25/uscode.json`, `uscode_build.py` | pinned OLRC release, structural/lexical extraction and effectivity checks |
| Reading interface | `tools/v25/reading.js`, `reading.css`, Cold Call reader | browser checks on desktop and phone |
| Atlas home | native r18 renderer, `tools/r19/r20.js`, `tools/v25/native-home.js` | live v2.5 map retained; the center mark links to analytics; fit changes require owner review |
| First-load reveal | head curtain in assembler, final `tools/v25/boot.js` module | `boot_check.cjs`, fresh first-load browser checks; early r20 readiness cannot reveal an older layer |
| Module order | `tools/v25/runtime-manifest.json` | build rejects missing/duplicate modules; integrity hashes and line ranges |
| Curated map geography | `tools/v25/geography.json`, `geography_build.py`, `geography.js` | `geography_check.py --check`, runtime lock/cache tests, bounded per-entry/district/region reasons |
| Practice exercise visibility | `tools/v25/practice-filter.json`, `practice-filter.js` | source fingerprint and classification checks; recoverable export and cache-resilience tests |
| Constitution lettering | `tools/v25/assets/we-the-people.png` and `.json` | transparent owner-reference asset embedded offline; bytes/hash validated independently of legal text |
| Existing map and archives | immutable `DKLA-r18.html` baseline | SHA-256 and all 35 original script blocks preserved |
| Routing and cache | assembler, worker template | release filename/version/build checks |

The older interface uses successive function wrappers and DOM observers. This
does make cause and effect harder to follow, but the full legal corpus is already
stored in separate source files. A wholesale framework migration would carry
more regression risk than the present task warrants. The explicit manifest,
named generated module boundaries, bounded lookup commands and source catalog
remove the immediate navigation friction while preserving saved edits and
offline behavior.

## Read a small, relevant slice

From the repository root, use Python 3.10 or later:

```sh
python tools/atlas.py overview
python tools/atlas.py search Gibbs
python tools/atlas.py entry cp-gibbs --chars 12000
python tools/atlas.py authority usc-28-1367 --chars 12000
python tools/atlas.py sources "Rule 4" --limit 8
python tools/atlas.py page civil 353 --chars 12000
python tools/atlas.py page "added-sources/Contracts- Selections.pdf" 100
python tools/atlas.py page "#lrs=lrs-november-a:34" --chars 4000
python tools/atlas.py catalog november --limit 4
python tools/atlas.py timeline supp
python tools/atlas.py catalog --write
python tools/v25/geography_check.py --inventory districts --course Contracts --limit 20
python tools/v25/geography_check.py --inventory nodes --district specific-relief --limit 20
```

`entry` identifies the immutable seed, canonical full brief, compact conversion,
runtime corrections, narrative review/fingerprint sources and timeline steps.
The seed alone is not the currently displayed brief. The full brief is tidied
and patched by `build_data()` before hashing; do not copy a hash from an unpatched
Markdown file to bypass a failed narrative check. `--chars` bounds each selected
prose excerpt, while identifiers, source references and review metadata remain
structured. Longer input is reported as truncated, never silently shortened.
`authority` returns a bounded provision with its edition, source, text hash and
recorded connections. `search` covers both case briefs and library provisions.
Integrity `sourceStartLine` maps source line 1 to the generated combined module;
`startLine` also includes its named boundary comment.

`sources` returns file/heading/page matches and bounded OCR excerpts. `page`
returns a single embedded page with its PDF-page mapping when available.
The `civil` and `contracts` aliases use printed-page keys; an `added-sources/`
PDF uses its embedded extraction's PDF-page keys. Unpaginated opinion text does
not establish a pinpoint. Always inspect the original opinion or assigned PDF
when OCR, an antecedent, a quotation, or an opinion boundary is material.

LRS source IDs and native `#lrs=source-id:page` links use physical PDF pages.
Their results report the printed-page label separately; a missing label remains
missing. Catalog search respects its global result limit, while `--write` saves
the complete source catalog independent of display filters.

`source-catalog.json` identifies the repository source files by Git blob hash,
their embedded text availability and existing heading indexes. It does not
duplicate textbook text or certify a legal proposition. Regenerate it after
source files are committed. Use the existing `added-sources/index/*.json` and
`added-sources/text/*` files to trace the extraction back to the uploaded PDF.

## Make an evidence-backed content change

1. Identify the case/rule/timeline ID and read its whole relevant account.
2. Locate the assigned pages and the opinion or enacted authority. Distinguish
   the holding, separate writings, allegations and later treatment.
3. Save the exact reason, authority, pinpoint and review scope. Inherited review
   records and structural checks are not a newly performed opinion audit.
4. Update the canonical source or an explicit exact-match correction. A full
   brief change requires comparing its Cold Call again before updating the
   fingerprint; preserve qualified or missing source facts.
5. Build and run the relevant validators, then inspect the changed view in a
   browser. Check mobile wrapping and intermediate map zoom when affected.

`explanation_inventory.py --pack` provides bounded effective prose for review.
`--check` catches drift from the reviewed introduction text and its compared
canonical sections. The inventory is navigation, not legal review; recorded
review scope lives in `EXPLANATION_AUDIT.md` and its named JSON ledgers.
`reading_check.cjs` exercises repeated repainting and content preservation,
including the one-introduction rule and exact duplicate removal. Real browser
inspection still verifies visible timelines, wrapping and map navigation.

All main cases require authored narratives. Supplemental narratives remain
optional and existing completed accounts are preserved. Cosmetic cleanup may
collapse repeated metadata, but must retain the substantive narrative and source
qualifications. Source PDFs stay separate from the standalone HTML; embedded
OCR is available offline, while uncached scans and external links need a network.
