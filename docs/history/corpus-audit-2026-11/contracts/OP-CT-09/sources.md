# OP-CT-09 sources: Contracts Class 9, battle of the forms; pay now, terms later

Assignment: C&M 284–304; UCC § 2-207 (Selections pp. 335–337); Restatement of Consumer Contracts § 2(b), (c) (Selections p. 477, 2019 Tentative Draft; the Atlas follows the 2024 Official Text).

| Source | Locator read | Notes |
|---|---|---|
| C&M 10th ed. | `C&M Textbook 1-350.pdf` PDF 329–349 (printed page = PDF page − 45) | The staged text was unreadable on left-hand pages, so the worker re-rendered and re-OCR'd the pages (`renders/`). The writer read printed 284–303 from those renders and checked the Howard note (C&M 303) on the page image: the word is "reject". Dorton's "unless expressly agreed to" passage (C&M 280, Class 8's excerpt) was read in `OP-CT-08/ct08-casebook.txt` for the K-17 express-agreement route. |
| Selections | `Contracts- Selections.pdf` (`work/src/sel.txt`) | UCC § 2-207 and Comments 1–7; RLCC § 2 (2019 draft), Comments 1–5. Comment 1 ends at "unfair outcomes"; the core-deal-terms sentence ends Comment 2 at the top of the right-hand column of p. 478. Comment 5 holds the majority/minority statement on (b)(1) notice. |
| RLCC 2024 Official Text | `added-sources/text/Complete Restatement.txt` lines 864–889 (§ 2), 947 (Comment 3), 1120–1137 (Comment 6) | "if the business demonstrates that" in (a) and (b); reworded (c). |
| Slides | `Class 9_Pay now terms later - Copy (3).pptx` (`ct09-slides.txt`), 9 slides | Lecture note checked slide by slide. Slide 7 (empirical study) and slide 8 (comment number) corrected; slide 9 note kept and given a "Legal qualification:" sentence. |
| Surfaces | `ct09-surfaces-regen.md` (regenerated; the staged `ct09-surfaces.md` was an empty stub) | Map values were re-read at run time through `node_value` (r21 effective values); flowchart, plain-sentence and lecture values from the live JSON files. |
| Not verified | Bayway map "Judge McKenna" and "Avedon, JOM and Comark"; Klocek map's later dismissal for lack of jurisdiction; Hill map's Casarotto point; Northrop brief's subsection (3) remark; Hill ≈ 3.0 "The Hills admitted noticing the terms". None is in the assigned excerpt; they need the full reports. |  |

Workers: one combined reader and challenger (`learn-list.md`, then `comparison.md`). The writer checked each applied correction against the cited page, Selections passage or slide.

Hill was primary-reviewed earlier. `prior-corrections.json` holds only timeline redesign edits for Hill; its brief and takeaway are unchanged here. The only Hill edit is the map entry's `learning.topics.notice`, which merged reading with notice.

## Applied

29 spec entries: 22 corrections (one is an unregistered flowchart source tag) and 7 teaching-gap placements closing 7 of 9 gaps (G1 is placed in two homes: K-10 node d and the `rolling-formation` notes).

## Not applied, and why

- E3 (K-16 node f: who bears the burden of an exception; "the other party" rather than "the offeror") and E4 (K-16 node b: no route for one form arriving after payment) are on K-16, which Class 8 owns. Handed to Class 8 below.
- G9 ("between merchants", § 2-104(3), at K-16 node e): K-16, handed to Class 8.
- G6 (a plain-English sentence for the open question in the Hill narrative's carton-and-return-cost section): the narrative already teaches it, and a new ≈ entry would have to be appended out of order in `plain-sentences.json`; left open.
- R&A entry `ucc-2-207` prints (b) and (c) on one line: Rules & authorities is another team's builder; listed, not edited.
- Howard's reversed sentence also appears in copies the spec kinds cannot reach without reformatting minified seed files: the `reason` field of `src/data/seedData/courseIndex-cc64ba0f71/topics-f013aa4b8d/{rolling-formation-f45e4b45cf/00004,ucc207-5e973a04fc/00013,assent-consent-intent-9ef9c6652d/00094}-note-howard-a6a016b276.json` (shown in topic indexes by `dklaUI.js` and `semesterCode.js`), and the `src/data/textbookUpdate/` copies of the node and edge. The node summary and edge explanation are corrected by run-time edits; the coordinator should fix the three course-index `reason` strings.
- The RLCC crosswalk (`docs/history/corpus-audit-2026-11/contracts/OP-CT-RLCC/crosswalk.md`, line 50) says the core-deal-terms sentence "is in the 2019 Comment 1 (sel 26239–26248)". The Selections put it in Comment 2. That file is not this class's to edit; reported.

## For Class 8's writer (K-16 findings from this packet)

- K-16 node f detail (E3): add "The party resisting the term must prove the exception (Bayway: material alteration, C&M 285–286)." Consider "whether the other party objected" for "whether the offeror objected" (§ 2-207(2)(c) also covers confirmations; Comment 1).
- K-16 node b (E4): add an edge "One form arriving after payment" to a new node: "First decide who offered (see K-10). Under Hill, the vendor's boxed terms are the offer and § 2-207 is irrelevant (C&M 296–297); under Klocek, the buyer offered, the box terms are an acceptance or written confirmation, and you continue at d (C&M 301–302)." Route test: Hill's facts reach only exclusion of arbitration on K-16 today.
- K-16 node e detail (G9): "'Between merchants' means both parties are chargeable with a merchant's knowledge or skill (§ 2-104(3)); Hill noted that a buyer at a retail store, like Zeidenberg in ProCD, was not a merchant (C&M 296–297)."
- Class 8 E2 is applied here on K-17 (node e edge "Material, but expressly agreed to" → h; node h first sentence; the same edge on node d). Class 8 still owns the K-16 node f half.
