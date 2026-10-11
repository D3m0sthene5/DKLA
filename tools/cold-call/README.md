# Cold Call Mode

Cold Call is a separately written, chronological account of a case. It introduces
the people and institutions before referring to them, follows the underlying
events into litigation, and explains each court's arguments, reasoning, separate
opinions and result at the appropriate stage. Case-specific episode titles help
the reader navigate; they do not replace continuous prose. The original full
brief is a separate source view.

The inventory contains 392 illustrated map cases and 1,077 supporting entries.
`coverage.json` records exactly which have authored narratives and which remain
pending. Only an authored narrative receives a Cold Call launch button. The
compiler never fills a missing narrative with a reordered brief.

## Reading and practice

Read continuously, use the case-specific section index (a disclosure on narrow
screens), or search sections. A jump remembers the original reading position
until **Return to where I was** is used. **Practice aloud** starts at the current
episode, hides its account, and reveals it on request. Pilot follow-up questions
include their answers and opinion pinpoints. Clean/Patchy/Blank ratings use
`dkla.coldCall.v1`, keyed by case revision and episode. Ratings are device-local;
existing rule recall and sync are untouched. The inspector, saved edits, graph
and map camera are preserved.

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

When substantive prose changes, increment its revision so practice ratings do
not silently attach to a different account. When a source changes, compare the
account again before updating its fingerprint. Root `AUDIT_V2.4.md` describes
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

The final command is the production completeness gate. Partial development
builds keep the exact pending inventory and do not claim full coverage. Schema 3
rejects indexed spans, generic brief headings and non-narrative origins. It also
checks identities, citations and source fingerprints. A length flag invites
human inspection; source repetition and audit notes make a word-count ratio an
unreliable measure of retained detail. Automated checks cannot prove legal
accuracy, complete chronology or unambiguous antecedents.

`check_reader.cjs` executes the reader's opening and closing path for every
account in the built file, checking that each narrative paragraph, court stage
and source qualification renders. Orientation fields accept a paragraph or a
list of paragraphs. This catches data-shape failures; it does not replace the
browser checks for layout and interaction.

The assembler embeds narratives and the reader into the standalone atlas,
fingerprints them, and writes routes, worker and version metadata together.
Existing r18 script blocks remain byte-identical. The GitHub workflow builds the
large HTML and commits generated files with a normal push; concurrent branch
changes stop publication instead of being overwritten. Narratives need no
runtime network access. Outside sources and uncached source files do.

UI verification covers a main case, a supporting case and Swiss; continuous
reading, jump/return, search/no matches, practice/reveal/rating/next/back, reopening,
Escape and focus, mobile section disclosure, and full-source return. Use
`tools/cold-call/preview.html` at 390px, 768px and 1100px. Keep all narrative
paragraphs visible in reading mode.

## Rejected fallback

The earlier v25/v2.4 implementation indexed full-brief sections and counted
availability as narrative completion. A nested-heading repair preserved opinion
attribution but did not fix the writing format. That fallback is removed from
production compilation and rendering. `index_brief` and `check_index.py` remain
only as historical regression tools; passing them does not establish narrative
coverage or quality.
