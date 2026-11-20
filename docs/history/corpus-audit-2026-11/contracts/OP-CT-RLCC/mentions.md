# Student-facing Atlas mentions of RLCC section numbers

Every Atlas mention of an RLCC section number refers to the 2024 Official Text. Sections 2 and 3 have the same numbers in both editions. Mentions of §§ 4, 6, 8 and 9 point a reader of the Selections (which print the 2019 Tentative Draft) to a different rule: the Selections' § 4 is Discretionary Obligations, § 6 is Deception, § 8 is the parol-evidence rule and § 9 is Derogation. Some § 2 and § 3 mentions also need a label, because they state rules that exist only in the 2024 text: the business's burden of proof in § 2, and the "fair and equitable" requirement in § 3(c). The section-by-section comparison is in `crosswalk.md`.

Searches were read-only and used `grep` and a Python walk of each JSON file for "RLCC", "consumer contracts" and "Restatement of (the Law,) Consumer". Line numbers are those of the repository files as they stand on 2026-11-19. Proposed wording changes only the quoted words, and everything else in the field stays as it is.

## Files searched with no RLCC section number

The following files contain no RLCC section number, so no change is proposed.

- `tools/cold-call/plain-sentences.json`, `tools/cold-call/narratives/wassermans.json` and `tools/cold-call/narratives/cp-concepcion.json` use "consumer contracts" only as an ordinary phrase.
- `tools/r19/data/sections.json` and `tools/r19/data/briefs/CP-ATLAS-CONCEPCION.md` likewise use "consumer contracts" only as an ordinary phrase.
- The other 737 narratives in `tools/cold-call/narratives/*.json` and the remaining files in `tools/r19/data/briefs` have no match.
- `tools/r19/data/takeaways.json`, `tools/flowcharts/data/contracts.json`, `tools/r19/data/timelines.json` and `tools/v28/case-chronologies.json` have no match.
- `how-to-use.html` and `added-sources/glossary/glossary.json` use the phrase with no section number.

## tools/r19/data/rlcc.json

This file is the source for the map entries. `tools/v25/authorities_build.py` (line 300) and `tools/v25/geography_build.py` (line 34) read it, so the titles in `tools/v25/authorities.json` and the labels in `tools/v25/geography.json` follow it after a rebuild. I read that from the scripts and did not run a build. The `sources` and `cite` labels already say "Official Text 2024", so no change is proposed there.

### Entry `rlcc-9` (`rules[0]`)

The 2024 § 9 is § 8 in the Selections, so the edition matters for every mention below.

| JSON location (line) | Current text | Proposed |
|---|---|---|
| `rules[0].title` (7) | RLCC § 9 — standard terms and the parol-evidence rule | RLCC § 9 (2024 Official Text; § 8 in the 2019 Tentative Draft in the Selections) — standard terms and the parol-evidence rule |
| `rules[0].shortTitle` (8); `rules[0].placement.displayLabel` (39) | RLCC § 9 | RLCC § 9 (2024; § 8 in Selections) |
| `rules[0].notes` (14), first sentence | Section 9 is one sentence. | Section 9 of the 2024 Official Text (§ 8 in the Selections) is one sentence. The Selections' version says "reasonably intended effect" where the 2024 text says "effect reasonably expected by a consumer". |
| `rules[0].notes` (14), second paragraph | It describes § 9 as a corollary of § 7 (deception) and § 8 (affirmations and promises are part of the contract and cannot be negated by standard terms). | Add after it: In the Selections the same comment calls § 8 "a logical corollary of §§ 6 and 7". |
| `rules[0].links[2][2]` (57) | Assignment 13 lists Restatement of Consumer Contracts §§ 8, 9. | Assignment 13 lists Restatement of Consumer Contracts §§ 8, 9 (2024 numbering; §§ 7 and 8 in the Selections). |
| `rules[0].links[3][2]` (62) | Comment 1 to § 9 calls it a corollary of §§ 7 and 8. | Comment 1 to § 9 (2024) calls it a corollary of §§ 7 and 8 (§§ 6 and 7 in the Selections). |

The other § 9 mentions in `links[0]` (line 47, "Section 9 limits …") and `links[1]` (line 52, "Under § 9 …") sit inside the labelled entry. A label there is optional.

### Entry `rlcc-8` (`rules[1]`)

The 2024 § 8 is § 7 in the Selections, which print it without comments. The Selections' § 8 is the parol-evidence rule. The substance also differs: the 2019 § 7(c) voids any standard term that purports to "negate or limit" an affirmation, while the 2024 § 8(c) voids only terms that "negate or unreasonably limit the obligations arising from" it.

| JSON location (line) | Current text | Proposed |
|---|---|---|
| `rules[1].title` (71) | RLCC § 8 — affirmations and promises that are part of the contract | RLCC § 8 (2024 Official Text; § 7 in the 2019 Tentative Draft in the Selections) — affirmations and promises that are part of the contract |
| `rules[1].shortTitle` (72); `placement.displayLabel` (104) | RLCC § 8 | RLCC § 8 (2024; § 7 in Selections) |
| `rules[1].notes` (78), last paragraph | The syllabus lists § 8 twice: with the parol-evidence rule (Assignment 13, alongside § 9) and with standard forms and adhesion (Assignment 17). | Add after it: In the Selections this rule is § 7, printed without comments, and the Selections' § 8 is the parol-evidence rule. The 2019 § 7(c) says standard terms that "negate or limit" affirmations are not enforceable; the 2024 § 8(c) reaches only terms that "negate or unreasonably limit the obligations arising from" them. |
| `rules[1].links[0][2]` (112) | Section 8(c) makes unenforceable a standard term that negates or unreasonably limits an affirmation or promise that became part of the contract. | Section 8(c) (2024; § 7(c) in the Selections, which omits "unreasonably") makes unenforceable … (rest unchanged) |
| `rules[1].links[1][2]` (117) | Assignment 17 lists Restatement of Consumer Contracts § 8. | Assignment 17 lists Restatement of Consumer Contracts § 8 (2024 numbering; § 7 in the Selections). |
| `rules[1].links[2][2]` (122) | Assignment 13 lists Restatement of Consumer Contracts §§ 8, 9. | Same change as line 57. |

### Entry `rlcc-6` (`rules[2]`)

The 2024 § 6 is § 5 in the Selections, and the Selections' § 6 is Deception. The summary and notes state 2024-only rules that a student will not find in the Selections' § 5. The first is that "a sufficiently high degree of one" factor can suffice. The second is the 2024 subsection (d), which defines procedural unconscionability. The Selections' § 5(d) instead gives the parties "a reasonable opportunity to present evidence as to its commercial setting, purpose, and effect".

| JSON location (line) | Current text | Proposed |
|---|---|---|
| `rules[2].title` (132) | RLCC § 6 — unconscionability | RLCC § 6 (2024 Official Text; § 5 in the 2019 Tentative Draft in the Selections) — unconscionability |
| `rules[2].shortTitle` (133); `placement.displayLabel` (164) | RLCC § 6 | RLCC § 6 (2024; § 5 in Selections) |
| `rules[2].notes` (139), before "(a)" | (a) An unconscionable contract or term is unenforceable. … | Insert before it: This is the 2024 Official Text. The Selections print the 2019 draft of this rule as § 5. That draft has the same sliding scale but not the sentence that a sufficiently high degree of one factor can suffice. It has no definition of procedural unconscionability, and its § 5(d) instead gives the parties a reasonable opportunity to present evidence of the term's commercial setting, purpose, and effect. |
| `rules[2].links[0][2]` (172) | Section 6 states the two-factor test with an express sliding scale and lists terms that are substantively unconscionable. | Section 6 (2024; § 5 in the Selections) states … (rest unchanged) |
| `rules[2].links[1][2]` (177) | Assignment 18 lists Restatement of Consumer Contracts § 6. | Assignment 18 lists Restatement of Consumer Contracts § 6 (2024 numbering; § 5 in the Selections, whose § 6 is Deception). |

### Entry `rlcc-4` (`rules[3]`)

The 2024 § 4 has no counterpart in the Selections. The Selections' § 4 is Discretionary Obligations, which is § 5 in the 2024 text.

| JSON location (line) | Current text | Proposed |
|---|---|---|
| `rules[3].title` (186) | RLCC § 4 — interpretation, construction and good faith | RLCC § 4 (2024 Official Text; not in the 2019 Tentative Draft in the Selections) — interpretation, construction and good faith |
| `rules[3].shortTitle` (187); `placement.displayLabel` (218) | RLCC § 4 | RLCC § 4 (2024; not in Selections) |
| `rules[3].notes` (193), last sentence | The syllabus assigns § 4 with performance in good faith (Assignment 16). | Add after it: This section is new in the 2024 text and is not in the Selections. The Selections' § 4 is Discretionary Obligations (2024 § 5), which requires that discretion be exercised in good faith; the syllabus may mean that section instead. |
| `rules[3].links[0][2]` (226) | Section 4(a) states the duty of good faith and fair dealing as non-disclaimable in a consumer contract. | Section 4(a) (2024; not in the Selections) states … (rest unchanged) |
| `rules[3].links[1][2]` (231) | Assignment 16 lists Restatement of Consumer Contracts § 4. | Assignment 16 lists Restatement of Consumer Contracts § 4 (2024 numbering; the Selections' § 4 is Discretionary Obligations, 2024 § 5). |

### Hub `gap-rlcc` (`hub`)

| JSON location (line) | Current text | Edition and whether it matters | Proposed |
|---|---|---|---|
| `hub.title` (241) | Restatement of the Law, Consumer Contracts (RLCC) §§ 1–10 | 2024. It matters because the Selections have only §§ 1–9. | Restatement of the Law, Consumer Contracts (RLCC) §§ 1–10 (2024 Official Text; §§ 1–9 in the 2019 Tentative Draft in the Selections) |
| `hub.shortTitle` (242) | RLCC §§ 1–10 | 2024 | RLCC §§ 1–10 (2024) |
| `hub.displayLabel` (243) | RLCC §§ 1–10 (full text) | 2024 | RLCC §§ 1–10 (2024 full text) |
| `hub.summary` (244), second sentence | The syllabus assigns § 2 (Assignments 6 and 9), § 3 (11), §§ 8–9 (13), § 4 (16), § 8 (17) and § 6 (18). | 2024 numbering. It matters for §§ 4, 6, 8 and 9. | The syllabus assigns § 2 (Assignments 6 and 9), § 3 (11), §§ 8–9 (13), § 4 (16), § 8 (17) and § 6 (18), numbered as in the 2024 text. In the Selections these are § 2, § 3, §§ 7–8, no counterpart (the Selections' § 4 is 2024 § 5), § 7 and § 5. |
| `hub.notes` (245), § 2 paragraph | § 2. Adoption of standard terms (Assignments 6, 9). (a) A standard term is adopted if the business shows … | 2024 text. The number is the same, but the burden in (a) and (b) and the list in (c) are 2024-only. | Insert after "(Assignments 6, 9).": (2024 text. The Selections' § 2 has the same conditions but does not say the business must show them, and its (c) says a contract "exists" and does not list terms both parties agreed to.) |
| `hub.notes` (245), § 3 paragraph | § 3. Modification of standard terms (Assignment 11). (a) In an ongoing relationship a proposed modification is adopted only if the business shows … (d) Standard terms may not be modified once the contract has been substantially performed by at least one party. | 2024 text. The number is the same, but (a)'s notice that continuing adopts the change, (c)'s "fair and equitable" clause and all of (d) are 2024-only. | Insert after "(Assignment 11).": (2024 text. The Selections' § 3 lacks the notice that continuing adopts the change, the "fair and equitable" requirement in (c) and all of (d), and it says "enforceable" where the 2024 text says "adopted".) |
| `hub.notes` (245) | Not assigned: § 1 (definitions and scope), § 5 (discretionary obligations), § 7 (deception), § 10 (derogation from mandatory provisions). | 2024 numbering. It matters: in the Selections, § 5 is unconscionability and § 7 is affirmations, and both are assigned. | Not assigned (2024 numbering): § 1 (definitions and scope), § 5 (discretionary obligations; § 4 in the Selections), § 7 (deception; § 6 in the Selections), § 10 (derogation from mandatory provisions; § 9 in the Selections). |
| `hub.notes` (245), last sentence | The 2019 Tentative Draft reprinted in the Contracts Selections is superseded by the 2024 text. | Both editions are named, but the numbering shift is not stated. | Add: The 2024 text inserts a new § 4, so the Selections' §§ 4–9 are §§ 5–10 here. |

## tools/canons/data/lectures.json (lecture summaries)

The slide checks below use the decks in `added-sources/*.pptx`. Decks for Classes 6, 9, 10, 11 and 13 are on file. Decks for Classes 17 and 18 are not, so the Class 17 and 18 summaries could not be checked against their slides.

| Lecture and JSON location (line) | Current text | Edition and whether it matters | Proposed |
|---|---|---|---|
| Class 6, `[27].topics[8].body` (4122) | … The quoted comment says the section does not address formation or assent to nonstandard terms; once a contract is formed, it determines which standard terms are adopted. | Slide 16 quotes the § 2(a) black letter in the 2019 wording, but the quoted "Cmt 3" sentence appears only in the 2024 Comment 3 (CR 947–948). The Selections' excerpt does not contain it. The difference matters only for finding the comment. | The quoted comment (Comment 3 of the 2024 Official Text; the sentence is not in the Selections' excerpt of the 2019 draft) says … |
| Class 9, `[30].topics[4].body` (4489) | Comment 3 says assent to the transaction usually adopts at least the core deal terms, and other standard terms may be adopted separately. | This is the 2024 Comment 3 (CR 961–963). In the Selections the same sentence is in Comment 1 (sel 26239–26248). | Comment 3 (2024 Official Text; Comment 1 in the Selections' 2019 draft) says … |
| Class 11, `[32].topics[8].body` (4728) | … the quoted text adds that it must be proposed in good faith, be fair and equitable in view of unanticipated circumstances, and not undermine an affirmation or promise that was part of the basis of the original bargain. | The "fair and equitable" clause is in the 2024 § 3(c) only. It matters, because a student reading the Selections' § 3(c) will not find it. | … the quoted text, from § 3(c) of the 2024 Official Text, adds that it must be proposed in good faith, be fair and equitable in view of unanticipated circumstances (a requirement absent from the Selections' 2019 § 3(c)), and not undermine … |
| Class 13, `[34].topics[3].body` (4925) | Slide 11 quotes RLCC § 9: | The number and wording are 2024. It matters, because this rule is § 8 in the Selections. | Slide 11 quotes RLCC § 9 (2024 Official Text; § 8 in the 2019 Tentative Draft in the Selections): |
| Class 17, `[38].topics[1].body` (5485) | The business must establish these facts. | The burden is stated only in the 2024 § 2(b) ("if the business demonstrates that", CR 873). The number is the same, but the rule differs. | Under the 2024 Official Text the business must establish these facts; the Selections' 2019 § 2(b) states the same conditions without assigning the burden. |
| Class 17, `[38].topics[2].body` (5505) | RLCC §§ 8 and 9 protect qualifying precontract factual assurances and promises. | 2024. It matters, because these rules are §§ 7 and 8 in the Selections. | RLCC §§ 8 and 9 (2024 Official Text; §§ 7 and 8 in the 2019 Tentative Draft in the Selections) protect … |

No change is proposed for the following lecture fields.

- Class 6, `[27].topics[8].heading` (4121), "Restatement of Consumer Contracts § 2": the number is the same in both editions.
- Class 9, `[30].topics[4].heading` (4488), "Restatement of Consumer Contracts § 2(b)": the same, and the body's paraphrase of § 2(b) matches both editions and the slide.
- Class 10, `[31].topics[8].body` (4612), "RLCC § 2 for consumer contracts": the same, and the statement is true of both editions.
- Class 11, `[32].topics[8].heading` (4727), "Restatement of Consumer Contracts § 3": the same number. The body carries the label.
- Class 18, `[39].topics[5].body` (5718), "The RLCC and EU questions": no section number.

## tools/r19/data/rules22.json and tools/r19/data/r21-audit.json

| JSON location (line) | Current text | Edition and whether it matters | Proposed |
|---|---|---|---|
| `rules22.json` `rules[3].notes` (182; the UCC § 2-302 entry) | The Restatement (Second) adopted the same structure in § 208, and the Restatement of Consumer Contracts in § 6. | 2024. It matters, because this rule is § 5 in the Selections. | … and the Restatement of Consumer Contracts in § 6 (2024 Official Text; § 5 in the 2019 Tentative Draft in the Selections). |
| `rules22.json` `rules[3].links[2][2]` (223) | RLCC § 6 restates unconscionability for consumer contracts in the same shape. | 2024. "In the same shape" is closer to true of the 2019 § 5. Its (d) evidence clause mirrors UCC § 2-302(2), and the 2024 § 6 drops that clause. | RLCC § 6 (2024; § 5 in the Selections) restates unconscionability for consumer contracts in the same two-part shape. |
| `r21-audit.json` `edges["r22-ucc2302--rlcc-6"][0][1]` (2240) | RLCC § 6 restates unconscionability for consumer contracts in the same shape. | This is a copy of the line above. Whether this audit file reaches students is not established. | Keep it in step with `rules22.json` line 223. |

## tools/r19/data/provisions.json (provision text panel)

`src/features/r19/provisions.js` exists and these entries carry the 2024 black letter, so I take them to be shown to students. I did not confirm that in the built page.

| JSON location (line) | Current text | Proposed |
|---|---|---|
| `rlcc-9.cite` (218) | RLCC § 9 | RLCC § 9 (2024 Official Text; § 8 in the Selections) |
| `rlcc-8.cite` (231) | RLCC § 8 | RLCC § 8 (2024 Official Text; § 7 in the Selections) |
| `rlcc-6.cite` (260) | RLCC § 6 | RLCC § 6 (2024 Official Text; § 5 in the Selections) |
| `rlcc-4.cite` (313) | RLCC § 4 | RLCC § 4 (2024 Official Text; not in the Selections) |

The `title` fields (219, 232, 261, 314) repeat the 2024 headings. They need no change once `cite` carries the label.

## tools/v25/authorities.json (reading panel; generated by tools/v25/authorities_build.py)

These strings are written by the build script, so the change belongs in the script.

| Location | Current text | Proposed |
|---|---|---|
| `collections[id=consumer].description` (build script line 546) | Assigned 2024 black-letter provisions, kept separate from the Restatement (Second). Comments remain in the source volume. | 2024 Official Text black-letter provisions, §§ 1–10, kept separate from the Restatement (Second). The Contracts Selections print the 2019 Tentative Draft, whose §§ 4–9 are §§ 5–10 here; § 4 here is new. Comments remain in the source volume. |
| `entries[668–677].source.name` (build line 326) | Assigned Restatement of Consumer Contracts · black letter | Restatement of Consumer Contracts, 2024 Official Text · black letter. "Assigned" is doubtful, because the assigned Selections print the 2019 draft. |
| `entries[671–677].cite` (build line 326) | Consumer Restatement § 4 … Consumer Restatement § 10 | For n ≥ 4, append the Selections number. For example, "Consumer Restatement § 6 (2024; § 5 in Selections)"; for § 4, "(2024; not in Selections)". The cites for §§ 1–3 need no change. |
| `entries[355, 359, 541, 560, 671, 673, 675, 676].links[*].title` | RLCC § 4 — interpretation, construction and good faith, and the other `rlcc.json` titles | These copy `rlcc.json` titles and will follow the changes above after a rebuild. That is inferred from the build script reading `rlcc.json`, not from running it. |

## tools/v25/geography.json (map labels)

| Location (line) | Current text | Proposed |
|---|---|---|
| `placements.rlcc-9.displayLabel` (26684) | RLCC § 9 | RLCC § 9 (2024; § 8 in Selections) |
| `placements.rlcc-8.displayLabel` (26693) | RLCC § 8 | RLCC § 8 (2024; § 7 in Selections) |
| `placements.rlcc-6.displayLabel` (26702) | RLCC § 6 | RLCC § 6 (2024; § 5 in Selections) |
| `placements.rlcc-4.displayLabel` (26711) | RLCC § 4 | RLCC § 4 (2024; not in Selections) |

No change is proposed for `placements.gap-rlcc.displayLabel` (19848), "RLCC § 2(a), (b), and (c)", because the number is the same in both editions. That label does disagree with `rlcc.json`'s hub label "RLCC §§ 1–10 (full text)", which is a separate question from the edition. The `revisions` and `audit.nodeReviews` titles look like review records rather than student text, so I proposed no change there.

## added-sources/briefs/briefs.json, with the .txt copies in added-sources/briefs/

| Brief and location (line) | Current text | Edition and whether it matters | Proposed |
|---|---|---|---|
| Klocek v. Gateway, `briefs[35].sections.Notes` (945); also `klocek-v-gateway-inc.txt` | … § 2(b) adopts a rule between the two cases: it permits terms delivered after assent to be adopted, as Hill does, but only if the business proves that it gave the consumer notice … | The burden ("business proves") is 2024-only. | … but only if the business proves (under the 2024 Official Text; the Selections' 2019 draft states the same conditions without assigning the burden) that it gave … |
| RLCC § 2(b) and (c), `briefs[36].sections.Sources` (963); also `restatement-of-the-law-consumer-contracts-2-b-and-c.txt` line 6 ff. | The text summarized below is the published black-letter as reproduced in secondary sources; the assigned casebook excerpt governs for class. | The brief summarizes the 2024 text, including "The business bears the burden of proof" in its Text section (964). It matters. The assigned excerpt is the Selections, not the casebook (syllabus lines 95–97), and it prints the 2019 draft. | The text summarized below is the 2024 Official Text (Complete Restatement.pdf, PDF page 26). The Contracts Selections reprint the April 18, 2019 Tentative Draft of § 2, which has the same subsections and conditions with two differences. Subsections (a) and (b) do not say the business must demonstrate the conditions. Subsection (c) says a contract "exists" and lists only the adopted terms, unadopted terms the consumer elects, and terms supplied by law. |

No change is proposed for two briefs. Hill v. Gateway, `briefs[34].sections.Notes` (919), says "§ 2(b) accepts post-assent terms only if the business gave notice …", which is true under both editions. The UCC § 2-207 brief, `briefs[37].sections.Application`, says "a notice-and-exit test that the business must satisfy". The conditions must be met under both editions, so this does not depend on the 2024 burden-of-proof wording.

## Already labelled; no change

`tools/r19/data/plain.json` (`nodes.gap-rlcc`) and `tools/r19/data/plain-decisions.json` (`[46]`) name both editions. They locate the 2019 draft at Selections "PDF page 474 (§ 1 at page 480, § 2 at page 484)". That equals the printed pages 467, 473 and 477 plus 7. I did not open the Selections PDF to confirm the offset.
