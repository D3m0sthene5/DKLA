# Cold Call Mode

The v24 pilot covers Hamer, Pennoyer and Chadha. It is opened from the case heading.
The original inspector, saved edits, graph and map camera are not modified.

Read each account continuously, use the case-specific section index (a disclosure
on narrow screens), or search the section contents. A jump remembers the original
reading position until **Return to where I was** is used. **Practice aloud** starts
at the current section, hides the account, and reveals it on request. Follow-up
questions include their answers and opinion pinpoints. Clean/Patchy/Blank ratings
use the separate `dkla.coldCall.v1` localStorage key, keyed by case revision and
section. They are device-local; existing rule recall and sync are untouched.

## Content and sources

`cases.json` contains hand-authored study paraphrases of the three reported
opinions. All narrative sections and follow-ups have reporter-page references.
The opinions, including separate opinions, were checked on 2026-10-11. This is
not a claim of independent faculty review or a current-law citator check.
Facts and litigation are ordered chronologically; reasoning follows the issues.
Actor and proceeding lists keep assignments and separate lawsuits distinct.
Explicit record limits prevent unknown later events from becoming invented facts.

Primary texts:
- Hamer, 124 N.Y. 538, 544–551 (1891), linked at Justia.
- Pennoyer, 95 U.S. 714, 715–748 (1878), linked at Justia.
- Chadha, 462 U.S. 919, 923–1016 (1983), linked at Cornell LII;
  also `added-sources/opinions/lrs-s-chadha.txt` in the existing source viewer.

Content checks specifically retained Hamer's trust/limitations and waiver/pleading
analyses; Pennoyer's collateral attack, rejected affidavit grounds, post-judgment
levy, and pre-Amendment judgment date; and Chadha's agency route, threshold
objections, severability, Powell concurrence, and two distinct dissent positions.
No intermediate conveyance in Pennoyer or post-judgment citizenship in Chadha is
invented. This pilot does not automatically generate narratives for other cases.

## Build and extend

Run `python3 tools/r19/assemble.py` then `python3 tools/r19/check.py`.
The assembler embeds JSON, JS and CSS into the standalone atlas, includes them in
the build fingerprint, and writes the worker, version metadata and routes together.
Existing r18 script blocks remain byte-identical. `validate.py` rejects missing
sources, invalid case ids, incomplete sections, or changed source-brief fingerprints.
When a brief changes, recheck the narrative against the opinion before updating
the fingerprint. Increment the narrative revision when changing its substance so
prior practice ratings are not silently applied to a different account.

The GitHub workflow builds the large generated HTML on the feature branch before
production is updated. It uses a normal push; concurrent branch changes cause it
to stop rather than overwrite anyone's work. The build is deterministic and a
repeat build has nothing to commit. The embedded reader and narratives use no
runtime network calls. The atlas worker caches them as part of the HTML; outside
source links require network access, as do uncached source files.

UI verification: launch from each pilot case; compare inspector position after
closing; jump and return; search/no matches; reveal/follow-up/rating/next/back;
exit practice with reading position restored; reopen and reload; keyboard Escape
and focus; narrow-screen section disclosure; open a source and return; verify an
uncovered case has no launch button. Keep all critical narrative paragraphs visible
in reading mode. Do not put them inside disclosures.
