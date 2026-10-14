# Civil Procedure: plan for the newly added sources

Course: Civil Procedure, Section 2, Fall 2026, Professor Miller.
Date of this review: 2026-10-13. Nothing in the atlas was changed; this is a plan only.

New files reviewed

| File in `added-sources/` | What it is |
|---|---|
| `Syllabus 10_1_2026.docx.pdf` (5 pages) | Revised course syllabus. Replaces `Syllabus 9_3_26.pdf` (4 pages). |
| `Personal Jurisdiction Presentation.pptx (1).pdf` (26 slides) | End-of-unit review deck for personal jurisdiction, with a worked hypothetical. |

Per-file reviewer reports this plan consolidates: `work/new-sources/analysis/civpro-syllabus-10-1.md` and `work/new-sources/analysis/civpro-pj-presentation.md`.

How to read the citations: "Syllabus p. N" is a page of the October 1 syllabus. "Deck p. N" is the slide carrying printed number N in the personal-jurisdiction deck (the deck has no class number or date). Anything marked "background, not from the source" is my own knowledge and must be checked before it is published.

What I re-checked myself, and what changed from the reviewers' reports

- Confirmed by reading the text positions on page 3 of both syllabus PDFs: weeks 6, 7, 8 and 9 were re-divided and "Eliscu" was added. Weeks 1-5 and 10-14 are unchanged.
- Confirmed the atlas still shows the September 3 split: `cp-mottley` is tagged week 7, `cp-piper` week 8, `cp-erie-decision` week 9, and the code still points at `Syllabus 9_3_26.pdf` (`src/runtime/civilCode.js:287`, `tools/public-files.json:55`, `tools/v25/source-catalog.json:252`).
- Corrected: the syllabus reviewer said the casebook page for Eliscu was unknown. The atlas brief `CP-034` (T. B. Harms Co. v. Eliscu) records its assigned passage as casebook printed pp. 336-338, which sits exactly between Mottley (p. 331) and American Well Works (p. 339), where the syllabus lists "Eliscu". The match is now well supported, though the syllabus itself prints only "Eliscu".
- Corrected: the deck reviewer could not read slides 20-21 and wrote the hypothetical's facts as guesses. I extracted the two slide images and read them. Slide 20 is the full question; slide 21 is a hand-annotated map. The hypothetical entry below now uses the real facts. Two of the reviewer's guesses were wrong or incomplete: the plaintiff is FlimseyFrame Construction Co. (incorporated in Delaware, headquartered in Newark, New Jersey), and Delaware (not only Illinois) is assumed to have the New York statute.
- Corrected: the deck reviewer treated the deck's "(p. 280)" for Mas v. Perry as a possible casebook location. The October 1 syllabus puts Fuentes at p. 280 and Perry between pp. 305 and 318, and the hypothetical slide cites Pennoyer at "casebook p. 63" where the syllabus has p. 79. The deck's page numbers therefore come from a different edition or printing. Keep the atlas pages (309-312).
- Confirmed absent after searching several spellings and guessed ids: no map entry for Eliscu (`cp-eliscu`, `cp-harms` do not exist; only brief `CP-034`, unattached), none for Pennington, Milliken, MacDermid, Mavrix, Advanced Tactical or HuffPost (briefs exist, unattached), and no entry of any kind for a personal-jurisdiction framework, quadrant, hypothetical, or a state long-arm statute. `atlas.py search` matches titles only, so an entry under an unexpected title could still exist.
- Confirmed the ten personal-jurisdiction concept entries are each two short paragraphs with none of the deck's material (I read all ten).
- Confirmed: `cp-cross` and `cp-berk` are full case entries with an empty week list, while weeks 14 and 10 point to the stub notes `cp-cross-gap` and `cp-berk-gap`.
- Dropped: the deck reviewer's "conflict" that Kulko and Keeton sit under different headings in the deck and the atlas. That is a difference of grouping, not of content; it is handled as a caution inside the enrichments.
- Reduced to a one-line fix: "Advanced Technical" on deck p. 17 is the atlas's "Advanced Tactical Ordnance Systems v. Real Action Paintball" (7th Cir. 2014). Use the atlas name.

---

## a. Syllabus

**Is the updated syllabus what the atlas shows today? No, not yet.** The atlas shows the September 3 syllabus. The October 1 syllabus is the same document with four weeks rearranged and one reading added. Ten of the fourteen weeks are already right.

What changed (Syllabus p. 3)

| Week | Atlas today | October 1 syllabus |
|---|---|---|
| 6 (week of Sep 28) | Diversity only: Lacks, Strawbridge, Perry, A.F.A. Tours | Diversity as before, **plus** the whole federal-question block: introduction, § 1331, Mottley (p. 331), **Eliscu (new)**, American Well Works (p. 339), Shoshone (p. 339), Smith (p. 340), Grable, Gunn |
| 7 (week of Oct 5) | Federal question, supplemental jurisdiction, removal | Starts at Gibbs: supplemental jurisdiction (Gibbs, Aldinger p. 359, Kroger p. 360, Finley p. 361, § 1367, Exxon), removal (§ 1441, Shamrock Oil p. 381, Home Depot p. 382, Bechtel p. 383, Wild Oats p. 384, Dart Cherokee p. 385), **plus all of venue**: Reasor-Hill p. 395, Bates p. 404, Livingston p. 408, Hoffman p. 410, Piper p. 421, §§ 1391, 1404, 1406, 1407. Chapter cell now reads Chapter 4 "and Chapter 5". |
| 8 (week of Oct 12) | Venue, transfer, forum non conveniens | "Continuing venue", then Erie (p. 445), Swift and Black & White Taxicab (both "discussed in Erie"). Chapter cell now Chapter 5 "and Chapter 6". |
| 9 (week of Oct 19) | Erie through Sibbach | York p. 454, Ragan p. 460, Woods p. 461, Cohen p. 461, Byrd p. 462, Hanna p. 468, Sibbach p. 477 only |

In short: everything from federal-question jurisdiction through Erie now starts about one week earlier.

What must change in the atlas

1. Replace the shipped syllabus file and its page pictures with the October 1 file, which has five pages, not four. Developer: `DKLA-sources/civil-procedure/syllabus.pdf` and its manifest record; page list `[1, 2, 3, 4]` at `src/runtime/civilCode.js:214`; file name at `civilCode.js:287`; `tools/public-files.json:55`; `tools/v25/source-catalog.json:252`; page images in `src/data/civilArchive/syllabusImages-*.json`. Page 5 holds only the sign-off "A.R.M." and "August, 2026". The weeks stay on the same pages (1-5 on p. 2, 6-10 on p. 3, 11-14 on p. 4), so the stored `syllabusPage` values remain right.
2. Update week records 6-9 in `data.civilCorpus.weeks` (`src/data/seedData/civilCorpus-*.json`): title, named cases, page ranges, instruction text. Proposed values are in section b.
3. Update the week tag on each moved case (`civilImport.weeks`): the federal-question cases 7 to 6 (`cp-mottley`, `cp-american-well`, `cp-shoshone`, `cp-smith`, `cp-grable`, `cp-gunn`); the venue cases 8 to 7 (`cp-reasor`, `cp-bates`, `cp-livingston`, `cp-hoffman`, `cp-piper`); and `cp-erie-decision`, `cp-swift`, `cp-taxicab` 9 to 8. Concept and rule-guide entries tagged to those weeks need the same shift.
4. Add Eliscu to week 6 (see section c, item 1).
5. Fix two stale statements that are wrong regardless of the new syllabus: week 14's instruction text says Cross "remains a visible gap" and the help dialog says "Berk, and Cross remain visible gaps" (`civilCode.js:309`). Both cases are on file and fully briefed (`cp-cross`, `cp-berk`). Point weeks 14 and 10 at the real entries and give those entries their week tags.
6. Optional but useful: record the S / L marker for each case. The syllabus key (p. 2) says S cases are "discussed interactively with students" and L cases "through lecture". The atlas stores neither. The markers are listed in section b.

Course rules from the syllabus worth showing next to the cards (Syllabus pp. 1-2): class or class-wide email instructions supersede the syllabus; the table is "a rough outline" and the class meets "three days in a row"; casebook is Friedenthal, Miller, Sexton, Hershkoff, Steinman & McKenzie, 13th ed. (2022) with the 2026-2027 Supplement; reading the notes after each case is "highly recommended"; TA-led class-wide review sessions follow each unit. The syllabus states no exam date, exam format or grading rule.

---

## b. Class sessions

**The unit for Civil Procedure cards is the week, not the class meeting.** The syllabus has one row per week and gives no dates for individual meetings. Do not invent meeting dates. That gives **14 week cards**. A fifteenth, undated card for the personal-jurisdiction review session is recommended because a deck was added for it.

S = discussed interactively (cold call); L = lecture; no letter means the syllabus prints none. Entry ids in *italics* do not exist yet and are proposed in section c.

| # | Date label | Proposed card title | Assigned readings (as printed in the syllabus) | Atlas entries to link | Deck |
|---|---|---|---|---|---|
| 1 | Week of Aug 24 | The civil action and the territorial starting point | Pages 1-29; Capron p. 29; Article III §§ 1-2 before the first class; Tickle p. 31; introduction to "jurisdiction"; Pennoyer (S) p. 79 | `cp-capron`, `cp-tickle`, `cp-pennoyer` | none |
| 2 | Week of Aug 31 | From territorial presence to minimum contacts | Hess (S) p. 90; International Shoe (S) p. 95; McGee (S) p. 102; Hanson (S) p. 103; Gray (S) p. 107 | `cp-hess`, `shoe`, `cp-mcgee`, `cp-hanson`, `cp-gray` | none |
| 3 | Week of Sep 7 | Purposeful activity, products, and claim-linked jurisdiction | World-Wide Volkswagen (S) p. 114; Keeton (L) p. 124; Calder (L) p. 126; Kulko (L) p. 126; Burger King (S) p. 127; Asahi (S) p. 134; McIntyre (Nicastro) (S) p. 143; Walden (L) p. 159; Bristol-Myers Squibb (L) p. 173 | `wwvw`, `cp-keeton`, `cp-calder`, `cp-kulko`, `burger`, `cp-asahi`, `cp-nicastro`, `cp-walden`, `cp-bristol-myers` | none |
| 4 | Week of Sep 14 | Relatedness, general jurisdiction, consent, and property | Ford p. 175; Goodyear (L) p. 162; Benguet (L) and Helicopteros (L), "discussed in Goodyear", p. 162; Daimler (L) p. 167; BNSF (L) p. 170; Insurance Corp. of Ireland (L) p. 194; Bremen (L); Carnival Cruise Lines (L) p. 198; Zippo (L) p. 200; Shaffer (S) p. 210; Burnham (L) p. 223; Mallory (S) (PDF), Supplement p. 422 | `ford`, `cp-goodyear`, `cp-perkins`, `cp-helicopteros`, `cp-daimler`, `cp-bnsf`, `cp-insurance-ireland`, `cp-bremen`, `carnival`, `cp-zippo`, `cp-shaffer`, `cp-burnham`, `cp-mallory` | none |
| R | No date in any source; after the personal-jurisdiction unit | Personal jurisdiction review session | Agenda (Deck p. 2): review; a framework for a personal-jurisdiction problem; questions; go over the hypothetical | *six-step framework*, *quadrant*, *review hypothetical* (section c); `cp-personal-jurisdiction`; timelines `pj`, `pj-general`, `pj-traditional`, `pj-effects` | `Personal Jurisdiction Presentation.pptx (1).pdf` |
| 5 | Week of Sep 21 | Notice, service, and an opportunity to be heard | Mullane (S) p. 237, "very carefully"; Federal Rule 4 and service of process (L) p. 251; Szukhent (L) p. 257; Wyman (L) p. 276; Sniadach (L) p. 279; Fuentes (L) p. 280; Doehr (L) p. 286 (these "will take little class time"); FRCP 4 and 12; also pp. 278-296 | `cp-mullane`, `cp-szukhent`, `cp-wyman`, `cp-sniadach`, `cp-fuentes`, `cp-doehr`; authorities `frcp-4`, `frcp-12` | none |
| 6 | Week of Sep 28 | Subject-matter jurisdiction: diversity and federal questions **(changed)** | Introduction to diversity (L); Lacks (L) p. 297; Article III (L); Strawbridge (L) p. 305; § 1332 (L); Perry (L); A.F.A. Tours (L) p. 318; statutes 28 U.S.C. §§ 1331, 1332, 1367, 1441. Then: introduction to federal question jurisdiction (L); § 1331 (L); Mottley p. 331; Eliscu (L); American Well Works (L) p. 339; Shoshone (L) p. 339; Smith (L) p. 340; Grable (S); Gunn (L) | `cp-lacks`, `cp-strawbridge`, `cp-mas-perry`, `cp-afa`, `cp-mottley`, *`cp-eliscu`*, `cp-american-well`, `cp-shoshone`, `cp-smith`, `cp-grable`, `cp-gunn`; authorities `usc-28-1331`, `usc-28-1332` | none |
| 7 | Week of Oct 5 | Supplemental jurisdiction, removal, and venue **(changed)** | "Section 1331" (L) [printed so; see section e]; Gibbs (S); Aldinger (L) p. 359; Kroger (L) p. 360; Finley (L) p. 361; § 1367 (L); Exxon (S). Removal (L); § 1441; Shamrock Oil (L) p. 381; Home Depot (L) p. 382; Bechtel (L) p. 383; Wild Oats (L) p. 384; Dart Cherokee (L) p. 385. "We will move through Chapter 5 rather quickly": Reasor-Hill (L) p. 395; Bates (L) p. 404; Livingston (L) p. 408; Hoffman (S) p. 410; Piper Aircraft (S) p. 421; 28 U.S.C. §§ 1391, 1404, 1406, 1407 (L) | `cp-gibbs`, `cp-aldinger`, `cp-kroger`, `cp-finley`, `cp-exxon`, `cp-shamrock`, `cp-home-depot`, `cp-bechtel`, `cp-wild-oats`, `cp-dart`, `cp-reasor`, `cp-bates`, `cp-livingston`, `cp-hoffman`, `cp-piper`; authorities `usc-28-1367`, `usc-28-1441`, `usc-28-1391`, `usc-28-1404`, `usc-28-1406`, `usc-28-1407` | none |
| 8 | Week of Oct 12 | Finishing venue; Erie **(changed)** | "Continuing venue"; Erie (S) p. 445; Swift (L) and Black & White Taxicab (L), both "discussed in Erie" | `cp-erie-decision`, `cp-swift`, `cp-taxicab`; keep a pointer back to the week 7 venue entries | none |
| 9 | Week of Oct 19 | After Erie: York to Hanna **(changed)** | York (S) p. 454; Ragan (L) p. 460; Woods (L) p. 461; Cohen (L) p. 461; Byrd (S) p. 462; Hanna (S) p. 468; Sibbach (L) p. 477 | `cp-york`, `cp-ragan`, `cp-woods`, `cp-cohen-beneficial`, `cp-byrd`, `cp-hanna-decision`, `cp-sibbach` | none |
| 10 | Week of Oct 26 | Completing governing law; beginning modern pleading | Walker (L); Stewart (L); federal common law (L); Dice (S); Berk (S) (PDF); Shady Grove (L); Gasperini (L). Start Modern Pleading: Gillispie (L) p. 606; Dioguardi (L) p. 608; Conley (L) p. 612; Swierkiewicz (L) p. 614 | `cp-walker`, `cp-stewart`, `cp-dice`, `cp-berk` (replace `cp-berk-gap`), `cp-shady-grove`, `cp-gasperini`, `cp-gillispie`, `cp-dioguardi`, `cp-conley`, `cp-swierkiewicz` | none |
| 11 | Week of Nov 2 | Modern pleading: the entire chapter | Twombly (S) p. 617; Iqbal p. 628; Tellabs (L) p. 654; Ziervogel (L) p. 659; Garcia (S) p. 664; Krupski (L) p. 695; Surowitz (S) p. 699; "The entire chapter must be read"; FRCP 8, 9, 11, 12, 15 | `cp-twombly`, `cp-iqbal`, `cp-tellabs`, `cp-ziervogel`, `cp-garcia`, `cp-krupski`, `cp-surowitz`; authorities `frcp-8`, `frcp-12`, `frcp-15` (ids for Rules 9 and 11 not checked) | none |
| 12 | Week of Nov 9 | Joinder (Chapter 9), with Chapter 10 assigned | Read all of Chapters 9 and 10; joinder and class-action Rules in the Supplement; 28 U.S.C. §§ 1332(d), 1407, 1453; pp. 799-869 as an overview; "No classroom time will be spent on interpleader and intervention"; introduction to joinder of claims and parties (L); the joinder devices (L) | The syllabus names no cases this week. Fall back to the case accounts and rule guides in the page range, as the week dialog already does; authorities `usc-28-1332`, `usc-28-1407`, `usc-28-1453` | none |
| 13 | Week of Nov 16 | Class actions and multidistrict litigation | Introduction (L); class action prerequisites (L); Rule 23; Hansberry p. 804; Walmart (L) p. 810; Amchem (L) p. 853; Ortiz (L) p. 860; Philips Petroleum (Shutts) (S) p. 873; Mussat (L) p. 883; TransUnion (L) p. 872 | `cp-hansberry`, `cp-walmart`, `cp-amchem`, `cp-ortiz`, `cp-shutts`, `cp-mussat`, `cp-transunion`; authority `frcp-23` | none |
| 14 | Nov 24 (a single date) | Summary judgment | Introduction to summary judgment (L); Cross (L); Celotex p. 1017; notes on Anderson (L) p. 1027 and Matsushita (L) p. 1029; FRCP 56 and note cases pp. 1031-1036; "need not read" pp. 1036-1046 | `cp-cross` (replace `cp-cross-gap`), `cp-celotex`, `cp-anderson-liberty`, `cp-matsushita`; authority `frcp-56` | none |

Developer notes for the cards

- Data is already in memory as `data.civilCorpus.weeks[i]` (public accessor `window.LegalAtlas.civilWeeks()`): `number`, `dateLabel`, `weekOf`, `title`, `instructions`, `readingRanges`, `namedCases`, `caseAccounts`, `concepts`, `syllabusPage`. Existing attributes `data-civil-week`, `data-civil-page`, `data-civil-syllabus` and `data-study-node` are already handled by the click listener at `src/runtime/civilCode.js:313-334`, so cards built with them need no new wiring.
- Today the weeks appear only inside a dialog ("All 14 syllabus weeks", `civilCode.js:107-144`). Nothing is drawn inside the Civil Procedure block on the map (`studyMap.courseBlocks["Civil Procedure"]`). The owner's request is for cards inside the class block.
- Proposed page ranges for the changed weeks, derived from the syllabus page numbers and the atlas page ranges of `cp-gunn` (347-351) and `cp-gibbs` (353-359): week 6 = 297-352; week 7 = 353-393 and 395-439; week 8 = 395-439 ("continuing venue") and 441-453; week 9 = 454-480. These are my proposal, not printed in the syllabus; adjust if the casebook section breaks differ.
- The week titles for 6-9 above are proposals. The syllabus prints only chapter names.
- The review-session card (row R) has no number or date in any source. Show it without a date, placed after week 4. If the cards must be strictly the 14 syllabus rows, attach the deck to week 4 instead.
- Keep the line that class and email instructions override the syllabus on the card view.
- A per-case S/L marker needs a new field (for example `w.caseModes = { "cp-pennoyer": "S" }`), filled from the table above.

---

## c. New entries to add (most important first)

### 1. T. B. Harms Co. v. Eliscu — Case — week 6, federal-question jurisdiction

- Where on the map: Civil Procedure, subject-matter jurisdiction, federal question; between `cp-mottley` and `cp-american-well`. Proposed id `cp-eliscu`.
- Text: do not write new text. A reviewed brief already exists in the brief store as `CP-034` (339 F.2d 823 (2d Cir. 1964); assigned passage at casebook printed pp. 336-338) but is attached to no map entry. Create the map entry from that brief, tag it week 6, mark it L (lecture).
- Source: Syllabus p. 3, week 6 row: "Eliscu" with the L marker and no page number. The identification with T. B. Harms v. Eliscu rests on the existing brief and its page location, not on the syllabus wording; see section e.

### 2. Personal jurisdiction: the six-step order of analysis — Note (framework), or a new section of `cp-personal-jurisdiction`

- Where on the map: Civil Procedure, personal jurisdiction, at the top of the unit, linked from the review-session card.
- Draft text (each sentence group followed by its source):

  The review session gives a fixed order for any personal-jurisdiction problem. (Deck p. 4)

  Step 1: is there general jurisdiction? If yes, there is jurisdiction whether or not the events giving rise to the suit took place in the forum. If no, go on and try to establish specific jurisdiction. (Deck pp. 4, 5)

  Step 2: is there a traditional basis? The deck lists physical presence, domicile, express consent, implied consent, agency, and waiver, and notes that jurisdiction cannot be obtained by fraud. If yes, there is jurisdiction. (Deck pp. 4, 6)

  Step 3: does a long-arm statute apply? If yes, go on. If not, consider quasi in rem jurisdiction, and if that works go on to Step 4. (Deck pp. 4, 7, 9)

  Step 4: are there minimum contacts? If not, no jurisdiction. (Deck pp. 4, 10-11)

  Step 5: do the plaintiff's claims arise out of or relate to the defendant's contacts with the forum? This step is only for specific jurisdiction. If not, no jurisdiction. (Deck pp. 4, 12)

  Step 6: is jurisdiction consistent with fair play and substantial justice? The deck calls it a "very high bar" for Step 6 to defeat jurisdiction once Step 5 is met. (Deck pp. 4, 14)

  Method. Courts look at the defendant's connection to the forum because the plaintiff chose the forum. Treat every opinion in the unit, including dissents, concurrences and pluralities, as a tool to argue for or against jurisdiction, and always argue both sides. (Deck p. 3) Build a table of contacts for each state and each party, remembering that only the defendant's contacts "really matter". (Deck p. 10) Read the facts carefully, raise every issue reasonably implicated, outline before writing, put the strongest arguments first, and state assumptions affirmatively instead of saying a fact is unknown; there is usually no single correct structure. (Deck p. 19)

- Links: Step 1 `general-jurisdiction`, timeline `pj-general`; Step 2 timeline `pj-traditional`, `cp-tag-jurisdiction`, `cp-consent-jurisdiction`, `cp-waiver`, `cp-fraud-service`; Step 3 `cp-long-arm`, `cp-statutory-constitutional`, `cp-property-jurisdiction`, authority `frcp-4`; Step 4 `minimum-contacts`, `purposeful-availment`, `cp-stream-commerce`, `cp-effects-test`; Step 5 `relatedness`, `specific-jurisdiction`; Step 6 `fairness`.
- Attribution: label it as the class review session's framework. The deck carries Professor Miller's name on the title slide, but its tone and the syllabus statement about TA-led review sessions suggest the TAs presented it; do not attribute individual sentences to Professor Miller.

### 3. Review hypothetical: FlimseyFrame and the Therapy House promissory note — Note (worked problem)

- Where on the map: Civil Procedure, personal jurisdiction; linked from the review-session card and from entry 2.
- Facts, paraphrased from the question on Deck p. 20 (read from the slide image; the map on p. 21 agrees): Three wealthy business people, Alicia Aardvark (home in Boston, Massachusetts), Barry Banal (Greenwich, Connecticut) and Calvert Cretin (Chicago), spend three months at Therapy House, a commune on the Delaware shore owned and run by Yahoo Yoga. Yoga wants to open a branch in Brooklyn, New York, has acquired a brownstone there, and has negotiated a $900,000 renovation contract with FlimseyFrame Construction Co., which is incorporated in Delaware, has headquarters in Newark, New Jersey, and does substantial business throughout the New Jersey-New York-Connecticut area. FlimseyFrame will not sign without acceptable financing, so Yoga persuades the three to execute a $900,000 promissory note to FlimseyFrame, payable on completion, which they do in Delaware. The arrangement was negotiated in emails among all five participants. Yoga signs the contract and mails it and the note to FlimseyFrame in Newark. The three go home. FlimseyFrame later demands payment; all four refuse, saying the work is incomplete and defective.
- Assumptions stated in the question (Deck p. 20): Massachusetts has no long-arm statute and follows Pennoyer; Connecticut has the Rhode Island statute; Delaware and Illinois have the New York statute.
- Questions asked (Deck p. 20): in which courts may FlimseyFrame sue all four, and would it matter if the negotiation and execution of the contract and note happened after the three returned home?
- Answer structure, from the grids:

  Delaware (Deck p. 22). Yoga: general jurisdiction, because domicile in Delaware can reasonably be inferred, and physical presence is likely since Yoga runs Therapy House; consent is unlikely (no registration statute as in Mallory). Aardvark, Banal, Cretin: no general jurisdiction and no traditional basis. For specific jurisdiction, a strong argument that the long-arm applies because they executed the note in Delaware (statutory words quoted on the slide: "transacts any business within the state or contracts anywhere to supply goods or services in the state"). Purposeful availment through executing the note, using McGee (a single contract with "substantial connection") and Burger King (continuing obligations; "prior negotiations, contemplated future consequences, terms of contract, parties' actual course of dealing"). Arises out of or relates to: yes. Fairness: burden on defendants low ("wealthy business people"), Delaware's interest high.

  New York (Deck p. 23). No general jurisdiction over anyone; no traditional basis unless there is consent in the contract or a registration statute, which the facts do not give. Long-arm arguable both ways: perhaps no, because no one "transact[ed] any business within the state"; perhaps yes, because they contracted "anywhere to supply goods or services in the state". Purposeful availment by signing the note, like Burger King; the argument is stronger for Yoga, who bought the brownstone, than for the three, since many people give loans without purposefully availing themselves of any forum. Calder effects test: "maybe". Relatedness: yes. Fairness: New York's interest high; the plaintiff's convenience is questionable if jurisdiction is clearer in Delaware. Conclusion: "Probably a good forum, but not as good as DE".

  Massachusetts, Connecticut, Illinois (Deck p. 24). Each has general jurisdiction only over its own domiciliary, so none reaches all four defendants (assuming no consent by contract). Massachusetts has no long-arm for the hypothetical; Illinois has the New York statute; Connecticut the Rhode Island (constitutional-limit) statute. Purposeful availment: "Not really"; stream of commerce "seems like a no"; Calder effects "leans no"; Internet jurisdiction is raised as a question. Burden on defendants higher, state interest lower; Connecticut is the best of the three because FlimseyFrame does business there.

  Variation (Deck p. 25), if the acts happened in the defendants' home states: Delaware probably drops out, since nothing was negotiated or executed there; New York becomes more appropriate; Massachusetts still fails for lack of a long-arm; Illinois and Connecticut become arguable, with a much stronger relatedness argument.

- Cautions: the grids on pp. 22-24 were multi-column slides whose text extracted out of order; the row and column placement above is a reconstruction and should be checked against the slides. The deck says not to worry if an answer does not match "the high-scoring answer" (Deck p. 2); that answer is not among the added files.

### 4. The minimum contacts quadrant — Note (chart)

- Where on the map: Civil Procedure, personal jurisdiction; linked from `minimum-contacts`, `specific-jurisdiction`, `general-jurisdiction`. Best shown as a two-by-two graphic.
- Draft text (all from Deck p. 15):

  The quadrant sorts cases on two questions: does the cause of action arise from the defendant's forum contacts, and are those contacts continuous and systematic or isolated and sporadic?

  Quadrant 1, claim arises from contacts and contacts are continuous and systematic: specific jurisdiction. Yes: International Shoe, Ford (marked with an asterisk).

  Quadrant 2, claim does not arise from contacts and contacts are continuous and systematic: no jurisdiction unless there is general or traditional jurisdiction. The standard is where the defendant is at home: a person's domicile; a corporation's state of incorporation and principal place of business. Yes: Perkins, Mallory. No: Goodyear, Bristol-Myers Squibb, Helicopteros, Daimler.

  Quadrant 3, claim arises from contacts and contacts are isolated and sporadic: depends on the contact's "nature, quality, and circumstances" (minimum contacts plus fairness). Yes: Hess (asterisk), McGee, Gray, Keeton, Calder, Burger King. No: World-Wide Volkswagen, Asahi, Nicastro.

  Quadrant 4, claim does not arise from contacts and contacts are isolated and sporadic: no jurisdiction. Hanson.

  "Bristol Meyers Squibb/Ford" is printed between Quadrants 1 and 2.

- Cautions: the layout was reconstructed from interleaved text; the slide itself is text plus small decorative images, so check it by eye before publishing. The asterisks on Ford and Hess are not explained. Mallory appears as a "Yes" in Quadrant 2 although the atlas (correctly) treats Mallory as consent by registration, not as an "at home" finding; keep the atlas's caveat beside it.

### 5. State long-arm statutes used in class: two types — Note attached to `cp-long-arm` (or an Authority entry once the statute text is verified)

- Draft text:

  The class sorts state long-arm statutes into two types. Where the statute extends to the full constitutional limit (the deck names California and Rhode Island), the analysis proceeds straight to minimum contacts; such a statute authorizes jurisdiction "on any basis not inconsistent with the constitution of this state or the United States". (Deck p. 7)

  Where the statute does not extend to the constitutional limit (the deck names New York), the answer must state all the reasons the statute does or does not apply. (Deck p. 7) The hypothetical applies New York-type words reaching one who "transacts any business within the state or contracts anywhere to supply goods or services in the state". (Deck pp. 22, 23)

  Gray is the class's example of interpreting such a statute: the place of the "tortious act" was read as the place of injury. (Deck p. 7)

  The Due Process Clause only sets the outer limit; the state legislature must grant its courts the power through a long-arm statute. (Deck p. 7)

  In federal court the reach is set by Rule 4(k)(1)(A): a defendant subject to the jurisdiction of a court of general jurisdiction in the state where the district court sits, so it is the "same analysis as state court". (Deck p. 8)

- Background, not from the source: the constitutional-limit sentence matches California Code of Civil Procedure § 410.10 and the New York words match N.Y. CPLR 302(a)(1). The deck gives no section numbers, and the hypothetical cites the statutes only by Supplement page (pp. 286 and 291 of an edition that may not be the current one). Verify against the 2026-2027 Supplement before adding citations. Note also that the deck names California and Rhode Island together but quotes only one sentence without saying whose statute it is.

---

## d. Existing entries to deepen (most important first)

1. **Week records 6-9 and the moved cases' week tags.** See section a. Source: Syllabus p. 3.

2. **`cp-cross`, `cp-berk`, and weeks 10 and 14.** Tag `cp-berk` to week 10 and `cp-cross` to week 14, list them in those weeks in place of `cp-berk-gap` and `cp-cross-gap`, and remove the "visible gap" wording. Source: Syllabus pp. 3-4 (Berk (S) (PDF), week 10; Cross (L), week 14); the files `Berk v Choy.pdf` and `Cross v. United States, 336 F.2d 431 (2d Cir. 1964) __ Justia.pdf` are already in `added-sources/`.

3. **`cp-personal-jurisdiction` (concept).** Add to "How to work through the question": the reason courts focus on the defendant (the plaintiff selects the forum); the "tools in a toolbox" point that every opinion, including separate opinions, supplies arguments; "Always argue both sides"; and a pointer to the six-step framework. Source: Deck pp. 3, 4.

4. **`general-jurisdiction` (concept), with `cp-domicile` and `cp-mas-perry`.** The concept speaks only of corporations. Add that an individual is "at home" at domicile, defined by the Mas v. Perry formula of a "true, fixed home" to which the person intends to return, which "remains constant until new domicile is established". Add a cross-link from `cp-mas-perry` (now tagged only to diversity and week 6) noting that the class reuses its domicile test for personal jurisdiction. Keep Milliken v. Meyer (`CP-COMP-CB-CAP-020`, already a step on `pj-traditional`) as the authority for domicile as a basis of personal jurisdiction; Mas supplies the definition. Source: Deck pp. 5, 6. Do not copy the deck's "(p. 280)"; see section e.

5. **`fairness` (concept).** Add: once the defendant has purposefully availed, it needs a "compelling case" to defeat jurisdiction (Burger King, Asahi); the framework's "very high bar"; Burger King's converse statement that fairness "may defeat the reasonableness of jurisdiction even if the defendant has purposely engaged in forum activities"; the deck's label of burden on the defendant as the "primary factor"; and the argue-both-sides contrast "Black/Brennan (focus on both parties' overall contacts) vs Warren/White (focused solely on D)". The `burger` entry already has "compelling case"; the concept does not. Source: Deck pp. 4, 14. Attribute the Justices' contrast to the review deck.

6. **`minimum-contacts` (concept).** Add the two constitutional rationales from World-Wide Volkswagen: an individual liberty interest (Insurance Corp. of Ireland) and protecting co-equal sovereign states (cf. Pennoyer), with Ireland's footnote 10 that the sovereignty restriction is "ultimately a function of the individual liberty interest". Add the ordering rule: contacts are necessary and come before fairness (Hanson, World-Wide Volkswagen majority, Bristol-Myers Squibb), even where jurisdiction seems "overwhelmingly fair"; "But see Stevens concurrence in Asahi". Add the contacts-table technique. The pieces are already in `wwvw` and `cp-insurance-ireland`; the concept lacks the synthesis. Source: Deck pp. 10, 13.

7. **`purposeful-availment` (concept).** Add the first sorting question (voluntary act of the defendant or unilateral act of the plaintiff?) and the sorted list. Yes: International Shoe, Keeton, Burger King. No: Hanson, World-Wide Volkswagen. Single contact with substantial connection: McGee, Burger King. Source: Deck p. 11.

8. **`cp-stream-commerce` (concept).** Add the deck's three "forms": weak (did the defendant intend the product to reach the forum?), intermediate (did it have reason to foresee that?), maximalist (the defendant is responsible wherever the product goes). Add Keeton to the comparison list. The deck points to the O'Connor, Brennan and Stevens opinions in Asahi and the Kennedy, Breyer and Ginsburg opinions in Nicastro but does not say which Justice holds which form; do not assert a one-to-one mapping, and keep the atlas's existing, more exact accounts in `cp-asahi` and `cp-nicastro`. Source: Deck p. 11. See section e on the word "weak".

9. **`cp-effects-test` (concept) and `cp-calder`.** Add the numbered form: (1) committed an intentional act, (2) expressly aimed at the forum, (3) caused harm, the brunt of which is suffered in the forum state. Keep the existing Walden caution. The deck lists Calder, Kulko and Walden together under this heading; keep the atlas's note that Kulko rejected an effects theory (and it predates Calder; background, not from the source). Source: Deck p. 11; applied at pp. 23, 24.

10. **Timeline `pj-traditional` (guide text) and `cp-consent-jurisdiction`.** Add the deck's checklist with its cases: physical presence (Pennoyer, Burnham); domicile (Mas v. Perry); express consent (Carnival Cruise, Bremen, Mallory); implied consent (Hess); agency (International Shoe, Szukhent); waiver, for example responding to a summons without a special appearance or failing to raise Rule 12(b)(2) in the answer or first motion (Insurance Corp. of Ireland); and the note that jurisdiction cannot be obtained by fraud (Tickle). Present it as the deck's grouping. Keep two existing atlas cautions: Mallory decided a due-process challenge to an express registration statute, and Szukhent is about service through an appointed agent. Source: Deck p. 6.

11. **`cp-long-arm` (concept).** Add the two statute types, the exam instruction, and the federal-court line, or link to new entry 5. Link authority `frcp-4`. Source: Deck pp. 7, 8.

12. **`cp-property-jurisdiction` (concept) and `cp-shaffer`.** Add where property-based jurisdiction sits in the order (a fallback when the long-arm does not apply, after which the analysis still continues to minimum contacts) and the deck's quasi in rem checklist: property in the state, which need not be real property; minimum contacts consistent with fair play and substantial justice; and a remedy limited to the value of the property attached, "e.g. Shaffer". I searched the `cp-shaffer` entry and found no statement of the value limit, so this is new to the atlas. Source: Deck pp. 4, 9. For the in rem line and Pennington, see section e.

13. **`cp-internet-jurisdiction` (concept) and timeline `pj-effects`.** Add the yes/no sort. Yes: Zippo (information exchanged for commercial gain, contacts more than fortuitous, many Pennsylvania subscribers); MacDermid (access to a computer located in the forum, with awareness of its location); Mavrix (9th Cir. 2011). No: the HuffPost case (5th Cir. 2021; interactivity and accessibility in Texas insufficient); Advanced Tactical (7th Cir. 2014; where an email is opened is fortuitous). Add the prompt to look for additional contacts, including some "not necessarily related" to the claim. Add MacDermid, Mavrix and Advanced Tactical as supplementary steps on `pj-effects`, as was already done for HuffPost; their briefs exist (`CP-COMP-CB-MACDERMID`, `CP-COMP-CB-MAVRIX`, `CP-COMP-CB-ADVANCED-TACTICAL`). Source: Deck pp. 16, 17. Symbols were lost in extraction on these slides ("Interactivity [?] dispositive"); "not dispositive" is the natural reading and agrees with the atlas, but check the slide.

14. **`relatedness` and `ford`.** Add the deck's one-line summary of the three Ford opinions as argument tools: Kagan, a relational and not causal test; Alito, "arise out of" and "relate to" are not discrete grounds and a broad, common-sense causal relationship suffices. For the Gorsuch line, see section e before adding anything. Also add the Bristol-Myers Squibb line that there must be an affiliation between the forum and the specific claims, which the atlas already has. Source: Deck p. 12.

15. **Search aliases.** The class abbreviations could be recognized in search: "PJx", "WVW" / "WWV" / "VW" (World-Wide Volkswagen), "BMS", "FPSJ", "LAS", "QIR", "IR", "CoA", "PPOB". Source: Deck pp. 2-25 passim.

---

## e. Conflicts to settle

1. **Week 7's first item: § 1331 or § 1367?**
   - October 1 syllabus, p. 3, week 7: "Section 1331 L, Gibbs S, Aldinger L ..." and later in the same row "Section 1367 L, Exxon S".
   - September 3 syllabus (what the atlas shows): no section number before Gibbs; § 1331 appeared only with the federal-question cases.
   - The cases that follow are the supplemental-jurisdiction line, so "1331" may be a slip for 1367, or a deliberate recap. Reproduce what is printed and ask the TAs.

2. **Is "Eliscu" T. B. Harms Co. v. Eliscu?**
   - Syllabus p. 3: only "Eliscu", marked L, no page.
   - Atlas: brief `CP-034`, "T. B. Harms Co. v. Eliscu", 339 F.2d 823 (2d Cir. 1964), assigned passage at printed pp. 336-338, attached to no map entry.
   - The page location makes the match very likely. Confirm by opening casebook p. 336.

3. **Cards per week or per class meeting?**
   - Owner's request: cards for "the sessions we will have", as in Contracts.
   - Syllabus p. 1: one row per week; the class "is scheduled for three days in a row"; the table is "a rough outline".
   - No source gives meeting-by-meeting dates or readings. This plan uses 14 week cards. If per-meeting cards are wanted, the owner must supply the split (for example from the TA emails).

4. **Page for the Mas v. Perry domicile definition.**
   - Deck p. 5: "(Mas v Perry) (p. 280)".
   - Atlas `cp-mas-perry` and `cp-domicile`: "Civil Procedure casebook, printed pp. 309-312". The syllabus puts Fuentes at p. 280.
   - The deck also cites Pennoyer at "p. 63" (Deck p. 20) where the syllabus has p. 79, so the deck uses another edition's pages. Recommended: keep the atlas pages and never show the deck's.

5. **What Pennington stands for.**
   - Deck p. 9: "IR: dispute must be over the property and property must be in the forum (Pennington)".
   - Atlas brief `CP-COMP-CB-CAP-063` (casebook pp. 207-208): the Court upheld applying a nonresident husband's bank deposit to alimony, describing garnishment and foreign attachment as operating "quasi in rem".
   - The deck uses Pennington for in rem; the atlas brief records quasi in rem reasoning. Recommended: keep the atlas brief, show the deck's line as class shorthand, and check casebook p. 207.

6. **Justice Gorsuch in Ford.**
   - Deck p. 12: "Gorsuch's approach: But-for causal link (Ford)".
   - Atlas `ford`: Justice Gorsuch, joined by Justice Thomas, "worried that replacing but-for causation with 'affiliation' left courts guessing" and concurred in the judgment.
   - The atlas describes a criticism of the majority, not an adopted but-for rule. Recommended: keep the atlas wording; do not state that Gorsuch adopted a but-for test.

7. **Who wrote the Ford quotation on the Internet slide?**
   - Deck p. 16: "Alito Concurrence in Ford ... 'virtually infinite number of `affiliations' waiting to be explored'".
   - Atlas `ford`: the phrase does not appear; the atlas ties the "affiliation" criticism to Justice Gorsuch's opinion, not Justice Alito's.
   - Background, not from the source: I recall this sentence as coming from Justice Gorsuch's opinion concurring in the judgment. I could not confirm it from any file on hand. Do not publish the attribution until it is checked against the opinion.

8. **Mavrix: purposeful availment or purposeful direction?**
   - Deck p. 17: the site "did not target forum state" but sold space to a third-party advertiser that did; "Court held this was purposeful availment".
   - Atlas brief `CP-COMP-CB-MAVRIX`: the court found a prima facie showing of "purposeful direction" for the copyright claim and treated third-party advertisements as only part of the picture.
   - Same result, different label. Recommended: keep the atlas brief's wording and note that the deck follows the casebook note's phrasing.

9. **Deck groupings the atlas describes differently.** Not contradictions in any holding, but the owner should decide how to label them:
   - Deck p. 6: "Agency (International Shoe Co, Szukhent)" as a traditional basis. The atlas treats Shoe's salesmen as part of the contacts analysis and of service, and Szukhent as service through an appointed agent.
   - Deck pp. 5, 15: Mallory listed under general jurisdiction and as a "Yes" in Quadrant 2. Atlas `general-jurisdiction`: consent under a registration regime is "separately analyzed in Mallory, rather than silently treated as a finding that the corporation is at home".
   - Deck p. 6: "Specific pjx must always arise from in-state contacts (BMS). In this analysis, this applies to steps 2-5." It is unclear what "steps 2-5" means on a slide about traditional bases, since tag jurisdiction and domicile do not depend on claim-related contacts in the atlas's Burnham and Milliken accounts. Not integrated.

10. **"Weak form" of stream of commerce.** Deck p. 11 calls the intent-based version the "weak form" and the wherever-it-goes version "maximalist". "Weak" seems to mean the narrowest reach for plaintiffs (the hardest to satisfy), which is easy to misread as the easiest test. The owner should confirm how the term was used in class before the atlas adopts it.

11. **Who is the author of the review deck?** Title slide (Deck p. 1): "Professor Arthur R. Miller, CBE". Syllabus p. 2: "class-wide review sessions led by the TAs after each unit". Decide whether the atlas labels the material "Professor Miller" or "class review session".

---

## f. Not checked / limits

- I did not run the app or any build. Statements about what a visitor sees come from the code and the syllabus reviewer's report. The working tree has uncommitted changes from another session (including `src/runtime/civilCode.js`); the line numbers cited are as of this review and may shift.
- Syllabus: underlining of principal cases does not survive text extraction, so which cases are principal and which are "squib" cases was not recorded. Week row boundaries and S/L markers were recovered from text positions on page 3; I verified page 3 (weeks 6-10) in both versions myself and relied on the reviewer for pages 2 and 4, which did not change.
- I did not compare every field of all 14 atlas week records myself; I spot-checked the week tags on `cp-mottley`, `cp-piper`, `cp-erie-decision`, `cp-mas-perry`, `cp-cross`, `cp-berk` and the two stub notes, and relied on the reviewer's table for the rest.
- Deck: slides 13, 15 and 22-24 are multi-column and their text is interleaved; column and row placement is a reconstruction. Arrows and symbols are lost throughout. Slides 20 and 21 were read from the embedded images (the question text is clear; the map is handwriting and I read it as: no long-arm in Massachusetts, Rhode Island statute in Connecticut, New York statute in Delaware and Illinois, matching the question). Other slides were not viewed as images.
- The "high-scoring answer" mentioned on Deck p. 2 is not among the added files.
- No casebook or Supplement page was opened to settle the conflicts in section e (Eliscu at p. 336, Pennington at p. 207, the Mas definition, the long-arm statute texts).
- The Ford and Mas quotations on the deck were not found in any embedded source text, so their wording was not verified against the opinions.
- Authority ids for FRCP 9 and 11 and for the joinder rules were not looked up. The ids listed in section b were confirmed to exist by title search only; their contents were not reviewed.
- The reviewer's statement that the shipped syllabus PDF is byte-identical to `Syllabus 9_3_26.pdf` (by recorded size and hash) was not re-computed; I confirmed only that the code and catalogs name the September 3 file and that its size on disk is 149,785 bytes.
- "Not found in the atlas" always means not found by title search, guessed id, or keyword search inside the entry text returned by `tools/atlas.py`. It does not prove the idea is absent from every brief.
