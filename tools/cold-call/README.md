# Cold Call Mode

Cold Call is a separately written, chronological account of a case. It introduces
the people and institutions before referring to them, follows the underlying
events into litigation, and explains each court's arguments, reasoning, separate
opinions and result at the appropriate stage. Case-specific episode titles help
the reader navigate; they do not replace continuous prose. The original full
brief is a separate source view.

The inventory contains 392 illustrated map cases and 1,077 supporting entries.
All main-map cases require authored narratives. Supporting Cold Calls are optional;
the release preserves all already-authored supporting accounts. `coverage.json`
records authored coverage, missing main cases and optional supporting entries
without narratives separately. Only an authored narrative receives a Cold Call launch button. The
compiler never fills a missing narrative with a reordered brief.

## Reading

Read continuously or use the case-specific episode index (a disclosure on narrow
screens). Reopening a narrative retains the session's reading position. The
v2.5 reader starts directly with the first episode: it no longer repeats the
introductory summary or the actor/court-stage orientation fields already told
in the prose. Those authoring fields remain in the source dataset. All episode
paragraphs and source notices remain visible. Pilot follow-up questions and
their answers now sit in disclosures within their episodes. Source scope is
available at the end, and Full brief opens the original source in a nested view.

Practice aloud and episode ratings have been removed at the owner's request.
The reader no longer reads or writes the old `dkla.coldCall.v1` storage key.
Existing rule recall, saved edits, the graph and map camera are preserved.

## Definitions (hover links)

Legal jargon in the episode paragraphs and follow-up answers carries a quiet dotted
underline. Hovering (after a quarter second), focusing with the keyboard, or tapping on
a phone opens a small card with a plain-English definition, a link to the Cornell LII Wex
entry when there is one, and "In the DKLA dictionary" when the legal dictionary has that
entry. Escape, a tap elsewhere, or moving away closes it. Headings, citations, the scope
note and the full source brief are never linked.

`glossary-terms.json` says which words link and what they mean. It is embedded in the page
as the `dklaColdCallGlossary` data block, and `src/features/cold-call/glossary.js` matches it
when an account is drawn: the narrative text itself is never changed, so revising a
narrative cannot break a link. Each term has a `key`, a `label` (the card's headword), a
`wex` slug or `null`, its `match` forms (lowercase, matched as whole words, the longest
first), an optional `context` pattern that must also occur in the same sentence, optional
`except` phrases that never link, optional `caps: true` to allow a capitalised match in
mid-sentence (otherwise "Federal Rules" and names stay plain), and the `gloss`. `density`
limits links to the first use of each term in an episode and `maxPerParagraph` per
paragraph, never two side by side.

The committed table has 6,022 terms (November 2026): basic vocabulary, plus every term of art, named
statute, rule and case a reader met in the 742 accounts, each checked by a second legal reader. A term
met in more than a tenth of the accounts carries `common: true`: when a paragraph has more terms than
links, the less common terms get the links first. A one-word capitalised term (a case name such as
"Garcia") never links in an account whose own title contains that word, where it names a party. To
replace the table with another in the same format:

```sh
cp <final table> tools/cold-call/glossary-terms.json
node --test tools/cold-call/glossary.test.mjs     # compiles it; every wex slug must be in the dictionary
pnpm build
node tools/cold-call/check_reader.cjs             # every account: text unchanged, limits hold, Garcia's terms
python tools/verify/data_guard.py --update        # records the new dklaColdCallGlossary block
python tools/verify/content.py --update           # records the new tools/cold-call/*.json
node tools/cold-call/glossary_browser.cjs http://127.0.0.1:8766/DKLA-v2.9.html   # with pnpm preview running
```

`check_reader.cjs` requires that Garcia's "compromised", "moved to dismiss", "removed" and
"struck" are linked; if the final table words those terms differently, change those lines
with it.

## Plain English (whole sentences)

A jargon-heavy sentence can carry a small "≈" marker right after its final punctuation.
Hovering (after the same quarter second), focusing or tapping it opens the same card:
"In plain English", a short plain version, and the note "Explains the narrative; not the
court's words." While that card is open the sentence is tinted. The marker is never inside
a definition link, adds no text to the paragraph (its glyph is drawn by CSS), and has the
label "In plain English" for screen readers.

`plain-sentences.json` lists the sentences, embedded as the `dklaColdCallPlain` data block:
`{ "version": 1, "source": "...", "sentences": { "<caseId>": [ { "at", "sentence", "plain" } ] } }`.
`at` is `"<section>.<paragraph>"` counted from 0 in the narrative file (`"0.1"` is the second
paragraph of the first episode), or `"<section>.followUp-answer"`. `sentence` is the exact
text; whitespace and straight or curly quotes may differ. `plain` is one to three short
sentences. The build refuses a malformed entry or an unknown `caseId`; an entry whose sentence
is not in its paragraph is skipped by the page, and `check_reader.cjs` fails listing every
such entry. The committed file is a **pilot** (Erie and Garcia). To drop in the full file:

```sh
cp <full file> tools/cold-call/plain-sentences.json
node --test tools/cold-call/glossary.test.mjs     # compiles it; each plain version at most 3 sentences, 600 characters
pnpm build                                        # refuses bad shape or an unknown caseId
node tools/cold-call/check_reader.cjs             # lists every sentence not found in its paragraph
python tools/verify/data_guard.py --update        # records the new dklaColdCallPlain block
python tools/verify/content.py --update           # records the new tools/cold-call/*.json
node tools/cold-call/glossary_browser.cjs http://127.0.0.1:8766/DKLA-v3.0.html   # needs the Erie licensee entry
```

## Content and sources

`cases.json` contains the three original narratives: Hamer, Pennoyer and Chadha.
Their reported opinions and separate writings were compared on 2026-10-11:

- Hamer, 124 N.Y. 538, 544–551 (1891), linked at Justia.
- Pennoyer, 95 U.S. 714, 715–748 (1878), linked at Justia.
- Chadha, 462 U.S. 919, 923–1016 (1983), linked at Cornell LII and in the local opinion viewer.

`narratives/<case-id>.json` contains each additional, individually authored
account. The author reads the complete canonical full brief and compares the new
prose with it. An authoring review records chronology, introduced antecedents,
court stages and source qualifications. This is a comparison with the existing
brief, not a new independent primary-source audit. Source fingerprints prevent
subsequent brief changes from silently making the narrative stale. Companion
briefs also need their own fingerprints. The Swiss penalty case, which has no
separate full brief, cites the assigned translated excerpt and fingerprints its
canonical atlas account.

Preserve allegations as allegations, unresolved issues as unresolved, and
separate writings as their authors' positions. Distinguish later editorial
history and current doctrine from the historical court's decision. Explain a
source limit without filling it with an invented fact. The visible narrative
must introduce its participants; the optional actor list is only an aid. Do not
pad a sparse source into an invented judicial history.

When substantive prose changes, increment its revision. When a source changes, compare the
account again before updating its fingerprint. `docs/history/AUDIT_V2.4.md` describes
the separate legal audit and its limits.

## Build and validate

Run these from the repository root:

```sh
python3 tools/cold-call/check_narratives.py --write
python3 tools/r19/assemble.py
python3 tools/r19/check.py
node tools/cold-call/check_reader.cjs
python3 tools/r19/audit24.py
python3 tools/cold-call/check_narratives.py --require-complete
```

The final command is the production completeness gate for all main-map cases.
Supporting entries without narratives do not block release. Development builds
keep the exact inventory and do not claim coverage beyond the authored accounts. Schema 3
rejects indexed spans, generic brief headings and non-narrative origins. It also
checks identities, citations and source fingerprints. A length flag invites
human inspection; source repetition and audit notes make a word-count ratio an
unreliable measure of retained detail. Automated checks cannot prove legal
accuracy, complete chronology or unambiguous antecedents.

`check_reader.cjs` executes the reader's opening and closing path for every
account in the built file, checking every episode paragraph, follow-up answer,
source notice and source qualification. It also exercises the nested source
return, keyboard isolation, and reopening position, and rejects retired practice
UI. This catches data-shape and interaction regressions; it does not replace
browser checks for layout and focus.

The assembler embeds narratives and the reader into the standalone atlas,
fingerprints them, and writes routes, worker and version metadata together.
Existing r18 script blocks remain byte-identical. The GitHub workflow builds the
large HTML and commits generated files with a normal push; concurrent branch
changes stop publication instead of being overwritten. Narratives need no
runtime network access. Outside sources and uncached source files do.

UI verification covers a main case, a supporting case and Swiss; continuous
reading, episode jumps, reopening, Escape and focus, mobile episode disclosure,
and full-source return. Use
`tools/cold-call/preview.html` at 390px, 768px and 1100px. Keep all narrative
paragraphs visible in reading mode.

## Main-case narrative audit

`main-audit.json` records the fresh case-by-case comparison of all 392 illustrated
main accounts with their complete effective canonical sources. It records specific
repairs, retained accounts, supported opening sequences, and source limits.
Targeted primary-source checks are recorded separately; a full-brief comparison
must not be described as an independent check of every reported opinion.

Run `python3 tools/cold-call/check_main_audit.py` after the normal narrative checks.
It verifies exact scope, source fingerprints, and the reviewed prose and account
hashes. It does not prove semantic accuracy. After changing an audited main account,
read it against the complete effective source again and update its individual
review record; do not simply refresh hashes to bypass a failed check. Supporting
accounts remain outside this audit.

## Rejected fallback

The earlier v25/v2.4 implementation indexed full-brief sections and counted
availability as narrative completion. A nested-heading repair preserved opinion
attribution but did not fix the writing format. That fallback is removed from
production compilation and rendering. `index_brief` and `check_index.py` remain
only as historical regression tools; passing them does not establish narrative
coverage or quality.
