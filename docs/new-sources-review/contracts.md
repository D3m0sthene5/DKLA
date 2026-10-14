# Contracts (Prof. Davis): plan for the newly added sources

Consolidated from the sixteen per-file reviews in `work/new-sources/analysis/contracts-*.md`, re-checked against the atlas on 2026-10-13. Read-only review: nothing in the atlas was changed.

**How to read the citations.** "C3 S12" means the Class 3 slide deck, Slide 12. "Syl. p. 5" is a PDF page of the syllabus. "Threedy p. 207" is a printed law-review page. "C&M p. 483" is a printed casebook page. Deck files are in `added-sources/` (for example `Class 3_Consideration and Formalities - Copy (3).pptx`); the extracted text is in `work/new-sources/<file name>.txt`.

**Three labels are kept apart throughout:** what the professor's material says; what the atlas says; and "background, not from the source" (my own knowledge, to be verified before use).

**One fact shapes everything below.** The slide decks are almost all questions. They contain no speaker notes with answers (one exception, in Class 14). So the decks mostly add the professor's *framing*: his question sequences, checklists, charts, hypotheticals and policy vocabulary. They add very few new holdings. No answer to a slide question should be published as "the professor's answer".

---

## Corrections to the per-file reviews

The reviewers searched by guessing entry ids, and the search command matches titles only. I listed every Contracts entry and searched body text. These "missing" claims do **not** hold up; each item already has an entry and moves to "deepen":

| Reviewer said missing | It exists as | Raised in |
|---|---|---|
| Leonard v. Pepsico has no map entry | `note-leonard` (class 6) | C6, C7 |
| Carlill has no map entry | `note-carlill` (class 7) | C7, C8 |
| "Awesome Acceptance?" / CX Digital has no map entry | `problem-awesome` (class 7) | C7 |
| Problem: The Move to Maine | `problem-maine` (class 8) | C8 |
| Problem: Misplaced Strategies | `problem-misplaced` (class 9) | C8 |
| Problem: This Contract is Toast | `problem-toast` (class 4) | C3, C4 |
| "Pay now, terms later" concept | `rolling-formation`, `notes-pay-now`, `formation-vs-terms` | C9 |
| Objective standard of assent concept | `objective-assent`, `contractual-assent`, `notes-objective-debate` | C6 |
| Intent to be legally bound concept | `assent-consent-intent`, `social-intent`, `notes-context` | C6 |
| Termination of the power of acceptance (umbrella) | `termination-offer` | C7 |
| Acceptance by performance and notice (§ 54) concept | `acceptance-notice` | C8 |
| Precontractual liability concept | `precontractual-liability` | C10 |
| Offeror's / offeree's drafting strategies | `notes-drafting`; the § 2-207 sequence is in `notes-207-map`; the common-law baseline is in `last-shot` | C8 |
| No concept for misrepresentation or non-disclosure | `misrepresentation`, `disclosure` | C12 |
| Borat release has no entry | `borat-release` (class 12) | C12 |
| N.Y. Gen. Oblig. Law § 5-1105 has no entry | `gap-ny51105` (a stub pointing at the Selections; no rule text) | C3 |
| CISG Art. 11 has no entry | `cISG11` | C3 |
| "Significance of Contract Formation for Antidiscrimination Law" has no entry | `formation-civil-rights` | Syllabus, C7 |
| No concept for assignment of rights | `assignment` (not tagged class 26) | Syllabus |
| Gilmore not in the atlas | mentioned in `notes-rest90-history` | C5 |
| Tribune has no entry and no citation | `note-tribune-types` (tagged classes 6-7, not 10); C&M p. 190 on file gives the citation | Syllabus, C10 |

Other corrections:

- **Greenfield "conflict" downgraded.** The atlas holding ("subject to applicable royalty obligations") tracks the opinion excerpt at C&M p. 559 ("subject to payment of applicable royalties due plaintiffs"). The passage on C14 S23 (no share of synchronization profits) is a different sentence of the same opinion. This is a clarification to add, not an error.
- **Goebel v. Linn** should not become a case entry. Everything known about it here is second-hand from Threedy. It goes inside the Threedy note.
- **Hawaiian Housing Problem.** The reviewer had only the four numbers on the slide. The full problem text is on file at C&M p. 483, so a proper draft is given below.
- **Confirmed as genuinely absent** (body-text search, zero hits): Goebel, Threedy, holdup / hold-up, Chirelstein, "Professional Conduct", § 5-701, § 15-301, Dr. Dre, Lippman, Cullinane, Marotta-Wurgler, "promissory fraud", "non-reliance", "most-favored", "invitation to treat", "judgment-proof", "distributive", "key questions", Rockland, and (in Contracts) ejusdem generis and vagueness. "Pre-existing duty" appears only inside `alaska-packers`. "Default rule" appears in no Contracts entry.

---

## a. Syllabus

**Is the updated syllabus what the atlas shows today? Yes, in substance.** `added-sources/Contracts Fall 2026_Syllabus and Reading List.pdf` is the same syllabus the atlas was built from: all 26 assignments, the same order, every casebook page range identical. It is not a newer version.

What must change:

1. **There are no dates in the syllabus.** It says only Tuesdays and Thursdays, 11:00-1:00, FH 216 (Syl. p. 1). The atlas holds one date, reported by the owner: assignment 9 on 2026-09-22. Session cards need dates from the owner (see section e, item 1).
2. **Contracts has no session cards.** The class list is a pop-up with a drop-down (`classDialog`, `src/runtime/semesterCode.js:682-705`). Nothing is drawn inside the Contracts block of the map. Civil Procedure and LRS carry dated per-class data (`data.civilCorpus.weeks`, `data.lrsCorpus.classes`); Contracts does not.
3. **Ten titles are paraphrased.** Use the syllabus wording (table in section b). The atlas differs on assignments 6, 8, 9, 10, 14, 15, 16, 17, 23, 26.
4. **Teachers' Insurance v. Tribune is the first reading listed for assignment 10** (Syl. p. 5: "190-191 (review)"). The atlas does not list it for class 10; `note-tribune-types` is tagged classes 6-7 only.
5. **Named notes and problems are not listed by name** in the class view although entries exist: Theories of Promissory Liability (`notes-theories`), Apple EULA (`gap-apple`), Applying the Interests (`problem-interests`), Economics of Remedies (`efficient-breach`), Remedies in Action (`remedies-in-action`), From Equitable to Promissory Estoppel (`equitable-estoppel`), Restitution as an Alternative Basis (`unjust-enrichment`), Silence (`silence`), Antidiscrimination (`formation-civil-rights`), Termination (`termination-offer`), Mailbox Rule (`mailbox`), Scope of Article 2 (`article2-scope`), Firm offers (`ucc205`), assignment of rights (`assignment`).
6. **Syllabus readings with no entry at all:** "Note on No-oral-modification clauses" (13), "Methods of Interpreting Ambiguous Contracts" (14), "Canons of Construction" (14), CISG Art. 8 (13). Already recorded as not on file: EU Directive (`gap-eu-directive`), remedies video (`gap-remedies-video`), force majeure clause as distributed.
7. **Seven unit headings are not stored:** Basic concepts (1-5); Contract formation and defenses (6-12); Interpretation (13-16); Limits on the bargain and its performance (17-19); Conditions and excuses (20-21); Remedies (22-25); Third parties (26). They are the natural group labels for the cards.
8. **The syllabus PDF cannot be opened from Contracts.** The other two courses have a "read the syllabus" button.
9. **Course rules are nowhere in the atlas** (Syl. pp. 1-2): office hours Mondays 2:35-4:35, Vanderbilt Hall 335; TA review sessions roughly every two weeks; grade based primarily on the final exam; laptops for notes only; materials C&M 10th ed., SEL, SUPP on Brightspace.
10. **Stale state.** The dialog opens at assignment 9 (`asOfClass: 9`, dated 2026-09-22). Decks now exist through Class 14. Old "assignments 1-9" wording remains in superseded code (`src/runtime/appCode.js:403-412`, `:1520`, `:1652`; `src/runtime/studyCode.js:2796-2807`).
11. **Classification.** Assignment 25 lists "Penalty clauses in Swiss law" as a reading; the atlas lists `swiss-2024` as a principal case. Hub entries 1-9 sit in district `reading-index`, 10-26 in `semester-readings`.

**Decks and syllabus assignments do not line up one-to-one.** The "Class 8" deck runs past assignment 8 into Bayway, Northrop and the Misplaced Strategies problem (C8 S24-27), which the syllabus puts in assignment 9. The "Class 9" deck covers only Hill and Klocek. The atlas note `gap-classroom` records the owner saying September 22 was "class 9, focused on Bayway and Northrop". See section e, item 2.

---

## b. Class sessions

**Recommended: 26 cards, one per syllabus assignment,** grouped under the seven unit headings. Assignments 1-14 also get a "slides" link. Card data already exists in `data.corpus` (`assignmentTitles`, `assignedRanges`, `supplementalRanges`, `principalCases`, `additionalAssignedMaterials`) and in hub entries `contracts-class-01` to `-26`. New fields needed: date, unit heading, deck file, "also discussed in class". The simplest existing hook is `renderHeading` (`src/runtime/civilCode.js:107-118`); a card click can call `classDialog(n)`.

**Dates.** None is in any source. The "Projected" column is my arithmetic only: one assignment per Tuesday/Thursday meeting starting Tuesday 2026-08-25. It reproduces the one date the owner reported (assignment 9 = Sept. 22), which is some support, but it ignores any cancelled or make-up class. **Do not publish these dates until the owner confirms them.**

### Sessions 1-14 (slide deck added)

| # | Projected date (unconfirmed) | Title (syllabus wording) | Readings (syllabus) | Atlas entries to link | Deck file |
|---|---|---|---|---|---|
| 1 | Aug 25 | Overview | C&M 1-13; SUPP. Hawkins (both excerpts); Bayliner; Theories of Promissory Liability; Apple EULA | `hawkins`, `bayliner`, `notes-theories`, `gap-apple`, `notes-hawkins`, `legal-framework`, `enforceable-promise`, `promise-or-prediction`, `warranty-overview`; authorities `ucc-2-313`, `ucc-2-314` | `Class 1_Overview - Copy (2).pptx` |
| 2 | Aug 27 | Introduction to remedies | 13-36, 44-48. Sullivan; Applying the Interests; Naval Institute; Morris; White v. Benkowski; Economics of Remedies; Remedies in Action | `sullivan`, `naval-institute`, `morris-sparrow`, `white-benkowski`, `problem-interests`, `problem-opportunity`, `efficient-breach`, `remedies-in-action`, `remedial-overview`, `expectation-interest`, `reliance-interest`, `restitution-interest`, `disgorgement`, `specific-performance`, `punitive-contract`, `nominal-damages` | `Class 2_Introduction to remedies - Copy (2).pptx` |
| 3 | Sep 1 | Consideration and formalities | 49-68, 117-120, 371-383; SEL; SUPP. Hamer; Dyer; Tolosa; Rest. §§ 71, 79, 81; NY GOL § 5-1105; CISG Art. 11 | `hamer`, `dyer`, `tolosa`, `consideration`, `adequacy-consideration`, `forbearance-claim`, `past-consideration`, `formalities`, `statute-frauds`, `problem-retirement-discount`, `rest71`, `rest79`, `rest81`, `gap-ny51105`, `cISG11`, `notes-sof-history`, `notes-sof-operation`; authorities `ucc-2-201`, `restatement-110` | `Class 3_Consideration and Formalities - Copy (3).pptx` |
| 4 | Sep 3 | Consideration and interpretation | 101-117; SEL. Mattei; Structural Polymer; Wood v. Lucy; Contract in Wood (SEL); UCC § 2-306 | `mattei`, `structural-polymer`, `wood-lucy`, `illusory-promise`, `satisfaction`, `implied-efforts`, `requirements-output`, `good-faith-early`, `discretion`, `problem-toast`, `ucc306`, `gap-wood-contract`; authorities `restatement-224`, `ucc-1-302` | `Class 4_Consideration and Interpretation - Copy (2).pptx` |
| 5 | Sep 8 | Promissory estoppel and restitution | 69-74, 120-130, 135-146; SEL. Ricketts; Feinberg; Cohen; D&G Stout; Rest. § 90 | `ricketts`, `feinberg`, `cohen-cowles`, `dg-stout`, `promissory-estoppel`, `equitable-estoppel`, `rest90`, `charitable-pledges`, `at-will-reliance`, `unjust-enrichment`, `quantum-meruit`, `notes-rest90-history`, `problem-hayes`, `cotnam-boundary` | `Class 5_Promissory Estoppel and Restitution - Copy (3).pptx` |
| 6 | Sep 10 | Assent and Intent to be Legally Bound | 169-191; SUPP; SEL. Lucy; Balfour; Specht; RLCC § 2(a),(c) | `lucy`, `balfour`, `specht`, `objective-assent`, `assent-consent-intent`, `social-intent`, `note-leonard`, `notes-objective-debate`, `notes-cohen`, `cohen-cowles`, `gap-rlcc`, `gap-balfour`; authorities `restatement-21`, `consumer-2`; brief `CT-CB-0314` (Meyer v. Uber, no map entry) | `Class 6_Assent - Copy (4).pptx` |
| 7 | Sep 15 | Offer and acceptance | 191-192, 198-205, 213-225, 227-229, 235-242, 261-263. Lefkowitz; Wucherpfennig; International Filter; White v. Corlies | `lefkowitz`, `wucherpfennig`, `international-filter`, `white-corlies`, `offer`, `advertisements`, `acceptance`, `acceptance-notice`, `silence`, `termination-offer`, `mailbox`, `lapse`, `revocation`, `formation-civil-rights`, `note-carlill`, `note-leonard`, `problem-awesome`; authorities `restatement-24`, `restatement-54` | `Class 7_Offer and Acceptance - Copy (2).pptx` |
| 8 | Sep 17 | Contract formation under Restatement §§ 45, 90 and Article 2 of the UCC | 246-259, 269-283; SEL; SUPP. Drennan; Dorton; C. Itoh; UCC §§ 2-204-2-207; NY GOL § 5-1109 | `drennan`, `dorton`, `citoh`, `irrevocability`, `option-contract`, `rest45`, `rest87`, `ucc205`, `ny51109`, `article2-scope`, `problem-maine`, `note-carlill`, `note-baird`, `mirror-image`, `last-shot`, `ucc204`, `ucc207`, `notes-207-map`, `conditional-acceptance`, `ucc207-conduct` | `Class 8_Formation under section 90 and Article 2 - Copy (2).pptx` (also reaches Bayway, Northrop, Misplaced Strategies) |
| 9 | Sep 22 (owner-reported) | Formation and interpretation: Battle of the forms; Pay now, terms later | 284-304; SEL. Bayway; Northrop; Hill; Klocek; RLCC § 2(b),(c); UCC § 2-207 | `bayway`, `northrop`, `hill-gateway`, `klocek`, `different-terms`, `knockout`, `material-alteration`, `additional-terms`, `notes-drafting`, `problem-misplaced`, `rolling-formation`, `notes-pay-now`, `formation-vs-terms`, `problem-hill-klocek`, `note-procd`, `ucc207`; authority `consumer-2` | `Class 9_Pay now terms later - Copy (3).pptx` (Hill and Klocek only) |
| 10 | Sep 24 | The requirement of definiteness, precontractual liability and preliminary agreements | 190-191 (review), 326-327, 333-370; SUPP. Tribune; Dixon; Cyberchron; Channel Home; Sun Printing; Oglebay; French Civil Code art. 1112 | `note-tribune-types`, `dixon`, `cyberchron`, `channel-home`, `sun-printing`, `oglebay`, `preliminary-agreements`, `precontractual-liability`, `definiteness`, `french-negotiations`, `reading-notes-10`; authorities `restatement-33`, `ucc-2-305` | `Class 10_Precontractual liability, Preliminary agreements and Definiteness - Copy (1).pptx` |
| 11 | Sep 29 | Contract modifications | 470-484, 487-492; SEL. Alaska Packers; Watkins; Austin; Rest. §§ 89, 175, 176; RLCC § 3; UCC § 2-209; NY GOL § 5-1103 | `alaska-packers`, `watkins`, `austin`, `modification`, `duress`, `waiver`, `ny51103`, `reading-notes-11`; authorities `restatement-73`, `restatement-89`, `restatement-175`, `restatement-176`, `ucc-2-209`, `consumer-3` | `Class 11_Contract modifications - Copy (2).pptx`; background article `Threedy_A Fish Story_Alaska Packers Association v Domenico.pdf` (cited at C&M p. 473 note 1; not separately assigned) |
| 12 | Oct 1 | Fraud and misrepresentation | 508-526; SUPP. Swinton; Kannavos; Speakers of Sport; Vokes; Psenicska; Borat Release | `swinton`, `kannavos`, `speakers-sport`, `vokes`, `psenicska`, `misrepresentation`, `disclosure`, `borat-release`, `reading-notes-12`; authorities `restatement-160`, `-161`, `-164`, `-168`, `-169` | `Class 12_Misrepresentation - Copy (4).pptx` |
| 13 | Oct 6 | The parol evidence rule | 527-530, 535-547; SEL; SUPP. Gianni; Masterson; Bollinger; TeeVee Toons; Note on No-oral-modification clauses; Rest. §§ 209, 210, 213-216; RLCC §§ 8, 9; UCC § 2-202; CISG Art. 8 | `gianni`, `masterson`, `bollinger`, `teevee-toons`, `parol-evidence`, `integration`, `cisg-framework`, `reading-notes-13`; authorities `restatement-209`, `-210`, `-213` to `-216`, `ucc-2-202`, `consumer-8`, `consumer-9`. Also discussed in class: `psenicska`, `bayliner` | `Class 13_Parol evidence rule - Copy (3).pptx` |
| 14 | Oct 8 | The plain meaning rule and extrinsic evidence of parties' intent | 548-569, 574-575; SUPP. PG&E; W.W.W.; Greenfield; Trident; Methods of Interpreting Ambiguous Contracts; Canons of Construction; Hall and Elliot | `pacific-gas`, `www-associates`, `greenfield`, `trident`, `interpretation`, `ai-interpretation-study`, `reading-notes-14`; authorities `restatement-202`, `-203`, `-206`, `-207` | `Class 14_Plain meaning rule - Copy (2).pptx` |

Order taught differs from casebook order in four decks; the cards should follow the slides: Class 4 (Mattei, Wood, Structural Polymer); Class 10 (Sun Printing, Oglebay, then Tribune, Channel Home, Cyberchron, Dixon); Class 12 (Speakers, Vokes, Swinton, Kannavos, Psenicska); Class 14 (PG&E, Trident, W.W.W., Greenfield).

### Sessions 15-26 (no deck yet)

No dates are projected for these.

| # | Title (syllabus wording) | Pages | Atlas entries (principal cases) |
|---|---|---|---|
| 15 | Extrinsic evidence of past dealings | 575-599; SEL | `frigaliment`, `hurst`, `nanakuli`, `figgie`, `columbia-nitrogen`, `trade-usage`, `course-dealing` |
| 16 | Performing in good faith | 719-744; SUPP; SEL | `dalton`, `northwest-ginsberg`, `market-street`, `bloor`, `ng-giap`, `good-faith`, `bloor-contract` |
| 17 | Standard form and adhesion contracts | 653-655, 661-679; SEL; SUPP | `carnival`, `graham`, `doe-great-expectations`, `adhesion`, `gap-eu-directive` |
| 18 | Unconscionability | 679-706 | `williams-walker-thomas`, `stoll`, `anderson-binance`, `unconscionability` |
| 19 | Public policy | 744-764, 769-780; SUPP | `blossom-farm`, `xlo`, `hassler`, `public-policy`, `ftc-noncompete-removal` |
| 20 | Express and constructive conditions | 805-809, 814-824, 828-832, 846-855, 871-875, 883-893 | `luttinger`, `peacock`, `gibson`, `kingston`, `jacob-youngs`, `gill`, `nelson-hazel`, `mckenna` |
| 21 | Mistake, impracticability and frustration | 1073-1081, 1101-1120, 1132-1136 | `stees`, `renner`, `taylor-caldwell`, `transatlantic`, `krell`, `force-majeure` |
| 22 | Specific relief | 34-43, 929-930, 945-950; SUPP | `klein-pepsico`, `walgreen`, `cosby`, `french-specific-performance`, `gap-remedies-video` |
| 23 | Cost of performance or value of performance; Losing contracts | 954-958, 968-982, 988-992; SEL | `plante`, `groves`, `peevyhouse`, `algernon-blair`, `gap-peevyhouse-contract` |
| 24 | Limitations on damages | 992-997, 1009-1021, 1024-1040 | `rockingham`, `parker`, `hadley`, `kenford`, `fera` |
| 25 | Stipulated remedies | 1043-1064 | `figgie`, `dave-gustafson`, `lake-river`, `wassermans`, `swiss-2024`, `swiss-1988-penalty` |
| 26 | Third party beneficiaries, delegation and assignment | 1163-1178, 1194-1196, 1200-1206, 1215-1216, 1226-1227 | `lawrence-fox`, `seaver`, `sisney-state`, `sisney-reisch`, `vesting-beneficiary`, `delegation`, `assignment` |

Ids in the 1-14 table were checked against the node list. Authority ids (`restatement-N`, `ucc-N`, `consumer-N`) are as the per-file reviewers opened them. Principal-case ids for 15-26 are from the syllabus review, which found all 98 resolve.

---

## c. New entries to add (most important first)

Every draft uses only the cited source. Anything else is labelled background.

### N1. Misrepresentation and related claims: the five-claim table
- **Kind:** Concept. **Map:** Contracts, misrepresentation district; link from `misrepresentation`, `speakers-sport`, `vokes`, `swinton`, `kannavos`, `psenicska`, `bayliner`.
- **Draft.** Professor Davis sets five claims side by side by key elements, and by whether each supports avoidance (cancellation) and damages (C12 S5). *Fraudulent misrepresentation (deceit):* a knowing or reckless false statement and justifiable reliance; avoidance yes; damages yes, in tort. *Negligent misrepresentation:* a false statement without reasonable basis, a special relationship, and justifiable reliance; avoidance yes; damages yes, in tort. *Promissory fraud:* a fraudulent misrepresentation of intention regarding future conduct and justifiable reliance; avoidance yes; damages yes, in tort. *Innocent misrepresentation:* a false statement or omission of material fact and justifiable reliance; avoidance yes; damages no. *Breach of warranty:* an affirmation of fact or promise that turns out to be untrue and is part of the basis of the bargain; avoidance yes "if material"; damages yes (C12 S5).
- **Caution.** The extraction flattens the table. Cell order was checked against the extracted text and reads cleanly in header order, but confirm against the slide image. Speakers of Sport adds an Illinois requirement of a scheme to defraud for promissory fraud (atlas `speakers-sport`); the slide states the general elements only.

### N2. Holdup and the economics of enforcing modifications
- **Kind:** Concept. **Map:** modification district, between `modification` and `duress`.
- **Draft.** The professor frames modification as a holdup problem. His exercise: a cannery has invested $150,000 for the season, holds perishable fish worth $1M, and owes workers $10,000 in wages. If the workers threaten to quit, what is the most the cannery should pay, and the least the workers should accept? The slide leaves the figures blank and assumes the workers are judgment-proof (C11 S7). For enforcing modifications: the prospect of enforceable modification lets parties reduce drafting costs at the outset; enforcement at the time of modification "will presumably make the parties better off"; and it may be needed to protect reliance on the modification (C11 S9). Against: a successful holdup gives a party incentives to "bluff" (misrepresent willingness to breach), "shirk" (avoid precautions against breach) and "lowball" (misrepresent the terms on which it will deal). These are "arguably, coercive, unfair and inefficient", and anticipating them may discourage contracting (C11 S9). Applied to Alaska Packers: how does the decision affect future workers' incentives to threaten to quit, to neglect the nets, and to negotiate wages up front (C11 S8)? Commentators read the case the same way. Posner treats it as exploitation of a monopoly position created by the contract's circumstances, and separates a threat responding to outside conditions from one that is "merely a strategic ploy" (Threedy pp. 196-197). C&M p. 473 note 1 quotes Posner that exploiting "temporary monopolies is the functional meaning of the legal concept of economic duress". Threedy answers on the facts: the company's dependence was overstated (Threedy pp. 214-217).
- **Caution.** The $1M and $10,000 are hypothetical, not case facts. The blanks have no answer on the slide. The case name on C&M p. 473 reads "Trampler v. NLRB, 338 F.3d 747" in the OCR; check the page image (background, not from the source: the reported name is Trompler, Inc. v. NLRB).

### N3. The pre-existing duty rule
- **Kind:** Concept. **Map:** modification district.
- **Draft.** Performing a legal duty already owed to the promisor is not consideration when the duty is neither doubtful nor in honest dispute (C11 S5, paraphrasing Restatement § 73). A promise to pay more for the same work therefore fails, as in Alaska Packers (C&M p. 470). Two caveats from the professor: mutual promises to rescind are supported by consideration, so parties can rescind and make a new agreement; and a modification supported by "even minimal consideration" is enforceable (C11 S5). The class then tests the "honest dispute" wording (what if the workers *believed* the nets were defective? C11 S4, S6, S8) and turns to the rule's revision: Restatement § 89, UCC § 2-209, N.Y. Gen. Oblig. Law § 5-1103 (C11 S11).
- **Link:** `restatement-73` (text on file, zero connections), `alaska-packers`, `watkins`, `modification`, `problem` N5.

### N4. Ways to forestall modification
- **Kind:** Concept. **Map:** modification district. Also covers the syllabus item "Note on No-oral-modification clauses" (assignment 13).
- **Draft.** At common law a clause limiting later modification is ineffective: "Those who make a contract may unmake it" (C11 S12). No-oral-modification clauses are made effective by UCC § 2-209 and N.Y. Gen. Oblig. Law § 15-301, but "may be construed narrowly", for example qualified by waiver and estoppel (C11 S12). Other devices: limits on the authority of agents, and commitments to transfer value to third parties if a modification occurs, such as most-favored-nation clauses (C11 S12). A failed modification may still operate as a waiver, "but only until retracted, unless ... relied upon" (C11 S11).
- **Caution.** The deck does not reproduce § 15-301. Do not state its terms from memory (see N23).

### N5. Problem: Hawaiian Housing (C&M p. 483)
- **Kind:** Hypothetical (`problem-...` family). **Map:** modification district; class 11.
- **Draft.** Richards contracted to build military housing in Hawaii using a subcontractor's $49,000 bid for the metal work. The subcontractor (AC) had bid by mistake on galvanized sheet metal instead of zinc alloy, and told Richards it would not do the work at the bid price. After about two months of hard bargaining, in which Richards insisted AC was bound by its bid, they signed a contract at $62,000. Richards paid about $50,000, then refused to pay more; he had never intended to pay the higher price. Sued for the balance, he relied on the pre-existing duty rule and Alaska Packers. Further facts: AC waited about a month after discovering its error before telling Richards; the second lowest bid was $83,000; the architect's estimate was $16,000; one bid exceeded $173,000. The casebook asks what result, whether Alaska Packers is easily distinguishable, and whether Richards could assert the rule after retreating from his position that AC was bound (C&M p. 483). The professor's three questions: Was there consideration? Was this a fair and equitable response to unanticipated circumstances? Was there duress or bad faith? (C11 S16).
- **Caution.** The casebook text is OCR; check figures against the page image. No answer is on the slide.

### N6. Behind Alaska Packers: Threedy's "A Fish Story"
- **Kind:** Note. **Map:** modification district; attach to `alaska-packers`, class 11. Source: Debora L. Threedy, 2000 Utah L. Rev. 185, cited at C&M p. 473 note 1.
- **Draft.** Threedy reads the trial record and company archives to test the usual picture of fishermen holding a helpless cannery to ransom, and offers four alternative accounts as possibilities, not findings (Threedy pp. 187-188, 197, 205). (1) The nets may have been adequate but honestly misunderstood: most of the men were Italian immigrants new to Pyramid Harbor, few spoke English, and the cannery reused the lower meshes of its nets, an unusual practice (pp. 205-207). (2) The nets may really have been poor: a cannery wanted enough fish but not more than it could can, Pyramid Harbor packed about its outfitted capacity in 1900, and it bought 25% to 40% of its fish from Chilkat and Chilkoot fishermen (pp. 208-212). (3) The company had options: those purchased fish, an association running eighteen Alaska canneries with a 1900 net profit of $770,536, and the men's own dependence on the company for food (pp. 214-217). (4) The men may have struck after learning that two new canneries nearby paid more (pp. 217-220). She also argues the fishermen's lawyer lacked the industry knowledge to prove a motive for bad nets, "litigation incapacity" (pp. 212-214). The district court had enforced the raise, relying on Goebel v. Linn (Mich. 1882), where brewers agreed to pay an ice company more mid-season; the Ninth Circuit distinguished Goebel as involving "unusual and extraordinary circumstances" (pp. 192-195). Threedy notes the ice-crop failure was the Goebel court's hypothetical, not a finding, although the Ninth Circuit and Posner treat it as fact (p. 195 n. 66, p. 197). Her aim is to unsettle assumptions, not to show the result was wrong (pp. 220-221).
- **Caution.** Page numbers are inferred from running heads in uncorrected OCR. Nothing about Goebel was checked against the opinion.

### N7. Course roadmap: the four key questions and the doctrinal map
- **Kind:** Note. **Map:** course hub, next to `legal-framework`; tag class 1. Create **once**; nine decks repeat the slide.
- **Draft.** Professor Davis organises the course around four questions: Is there an enforceable promise? Has it been breached? Has performance been excused? How should the promise be enforced? (C1 S7). Later decks reword the second as "Has it been performed?" (C12 S2, C13 S2, C14 S2). Under the first question sit mutual assent, consideration and definiteness (C10 S3), with duress and misrepresentation as "Defenses" (C11 S3, C12 S2). Under the second sit sources of terms, rules of construction and the hierarchy of sources (C13 S2, C14 S2). The Class 1 map lists: Formation (mutual assent, consideration, formal requirements, third party beneficiaries); Validity (duress, misrepresentation, unconscionability, public policy); Interpretation (parol evidence rule and extrinsic evidence, rules of construction); Excuses (conditions, mistake, impracticability, frustration); Remedies (specific relief, damages, limitations on damages); Related causes of action (promissory estoppel, restitution, misrepresentation, tortious interference, negligence) (C1 S8). Sources of U.S. contract law: treaties (CISG); federal legislation; federal common law; state legislation (UCC Article 2; New York General Obligations Law); state common law, "non-uniform", including "both common law and equity", synthesised in the Restatement (Second). Modes of adjudication: federal court, state court, arbitration (C1 S9). The formation-unit recap lists the sources of an enforceable promise as common law, UCC §§ 2-204 to 2-207 (goods only), promissory estoppel, RLCC § 2 (consumer contracts) and the Statute of Frauds (selected transactions) (C10 S21).
- **Caution.** On C1 S8 the pairing of sub-topics to headings is inferred from text order; confirm against the slide image, especially "Third party beneficiaries" under Formation and "Conditions" under Excuses.

### N8. The professor's policy toolkit
- **Kind:** Note. **Map:** course hub; link from `notes-theories`, `consideration`, `formalities`, `promissory-estoppel`, `objective-assent`, `offer`, `ucc207`, `parol-evidence`, `interpretation`. Merges six per-file proposals.
- **Draft.** Four "key policy considerations" recur: autonomy, efficiency, fairness and distributive justice (C1 S4; C5 S20-21). The slides do not define them. Applied: *Why require consideration?* It may provide evidence of the promise, indicate caution and intention to be bound, and ensure fairness (C3 S14; C5 S20). *Why is foreseeable reliance a substitute?* The parallel answers, plus protecting promisees who behave reasonably (C5 S21). *Why an objective standard of assent?* Autonomy: it "imposes liability on those who knowingly invoke a convention". Efficiency: it gives speakers incentives to avoid misunderstandings and avoids the litigation cost of ascertaining beliefs. Fairness: it "imposes costs on party at fault" (C6 S9). *Offer and acceptance rules:* intentions of the parties "taking account of risk of judicial error", communication costs, litigation costs, fairness (C7 S3). *Battle-of-the-forms rules:* respect for intention, fairness, certainty, litigation costs, drafting costs, and effects on incentives to negotiate master agreements, draft clear reasonable forms, and litigate (C8 S30). *Restricting extrinsic evidence:* benefits are a cautionary effect, reduced risk of interpretive error, relative ease of interpreting writings, biased juries, reduced reading costs and reduced litigation costs; against are increased drafting costs and frustration of the intentions of unsophisticated parties (C13 S12; C14 S17). *Misrepresentation:* immorality of deliberate deception, unfairness of unequal access to information, value of preventing mistaken transactions; for non-disclosure add incentives to acquire and use information, costs of disclosure and litigation costs (C12 S4, S17).
- **Caution.** Every item is a bare list or a question on the slide. Do not add explanations as the professor's.

### N9. What extrinsic evidence can and cannot be used for
- **Kind:** Concept. **Map:** interpretation / parol-evidence district; classes 13 and 14. The chart appears in both decks.
- **Draft.** Extrinsic evidence **cannot** be used to (1) vary or contradict integrated ("final") written agreements; (2) add to or supplement completely integrated ("final, complete and exclusive") written agreements within their scope; (3) explain unambiguous agreements. It **can** be used to (1) invalidate a written agreement; (2) reform one; (3) show grounds for granting a remedy; (4) establish a collateral agreement beyond the scope of the writing or one that "for some other reason might naturally be omitted"; (5) establish the meaning of ambiguous writings; (6) establish meaning, supplement or qualify, if the evidence relates to commercial context; (7) establish that performance is subject to a condition (C13 S7; C14 S3, S15). Vocabulary: Restatement "partially integrated" equals UCC § 2-202 "final"; it discharges prior inconsistent agreements (§§ 213(1), 215) and can be supplemented by consistent additional terms (§ 216(1)). "Completely integrated" equals "final, complete and exclusive"; it also discharges prior consistent agreements within its scope (§ 213(2)) and cannot be supplemented (§ 216(1)) (C13 S8). A merger clause is relevant to integration "but is not dispositive", and parol evidence can still challenge the validity of a completely integrated agreement (C13 S9). Four issues are "contentious": whether the rule applies to consumer contracts; whether extrinsic evidence may be used to decide integration; whether it may be used to decide ambiguity; whether commercial-context evidence can always be used (C13 S10; C14 S16).
- **Caution.** "Cannot (3)" must carry a qualification: California does not apply it that way (`pacific-gas`), and the deck itself lists the point as contentious. The S8 table layout was reconstructed from flattened text.

### N10. Ambiguity, vagueness and structural ambiguity
- **Kind:** Concept. **Map:** interpretation district; class 14. Covers the syllabus item "Methods of Interpreting Ambiguous Contracts" only in part; that casebook note itself was not read.
- **Draft.** A word, phrase, sentence or clause is ambiguous if it has more than one sense; it is vague when it has borderline cases (C14 S5). Examples: a promise not to compete "within fifty miles of the Company office" (45 miles by air, 55 by road); a photo studio's promise not to compete for school photography "in any school in Grant county" except two named high schools (does it reach Marion College?) (C14 S5). Structural (syntactic) ambiguity comes from how parts of a sentence attach. The casebook's cafeteria-manager covenant bars managing a cafeteria for any firm that was a client within a year before termination "or with whom you may have been negotiating ... if I have participated in such negotiations or had contact with that firm". Does the "if" clause qualify only the negotiating firms, or former clients too? (C14 S8-11; C&M p. 566, which cites Servomation Mathias, Inc. v. Englert, 333 F.Supp. 9 (M.D. Pa. 1971)). The deck's one speaker note says the decision favoured an interpretation because the alternative would make a clause redundant and might be so broad as to contravene public policy, since the restriction on working with former clients "would not be qualified" (C14, note attached to Slide 1).
- **Caution.** The slides do not label which example is ambiguity and which vagueness. Which reading the court adopted is an inference from the note; check brief `CT-ADDITIONAL-CM-B2-081` or the opinion first.

### N11. Canons (rules) of construction in contracts
- **Kind:** Concept. **Map:** interpretation district; class 14. This is a named syllabus reading with no entry.
- **Draft.** The professor's list: purpose; the contract read as a whole, consistently, giving meaning to every term; public interest; ejusdem generis; expressio unius est exclusio alterius; noscitur a sociis; and contra proferentem, "often described as a last resort" (C14 S13, citing C&M p. 567). The casebook glosses them: ejusdem generis (of the same kind), expressio unius (expressing one thing excludes another), noscitur a sociis (known from its associates), contra proferentem (against its author), the last used "only as a matter of last resort" (C&M p. 567). Sophisticated lawyers are presumed to know how to use parallel construction and identical wording, and to know the maxims (C14 S12, quoting International Fidelity Insurance Co. v. County of Rockland, 98 F.Supp.2d 400, 412 (S.D.N.Y. 2000)). Class problem: for an "animal lover" tenant with sheep, cows, pigs, cats and dogs, should a farm lease permit "animals", or "sheep, cows, and pigs", or "sheep, cows, pigs and other animals"? Test each against a guinea pig, a wild boar and a tiger (C14 S14, based on C&M p. 569).
- **Link:** `restatement-202`, `-203`, `-206`, `-207` (all zero connections; the section mapping is the reviewer's, not the slide's). Cross-course link to `lrs-k-ejusdem` and `lrs-k-noscitur`, which state the same maxims for statutes.
- **Caution.** The Rockland citation was taken from the slide only.

### N12. Contracting out of liability for misrepresentation
- **Kind:** Concept. **Map:** misrepresentation district, cross-listed to parol evidence. Taught in both Class 12 and Class 13.
- **Draft.** Three devices limit liability for pre-contract statements. A *merger clause* says the writing is the entire agreement and there are no other representations or understandings. A *statement of non-reliance* says the signer is not relying on promises or statements about a named subject. A *waiver of the right to sue* has the signer agree not to bring claims including fraud (C12 S19; C13 S14). An "as is" clause does similar work for non-disclosure; broad representations and warranties ("There are no material defects in this house") move the risk the other way (C12 S14, S16). Should fraud be waivable? Against: it is "typically both fair and efficient" for the maker of a representation to bear the risk of known inaccuracies, because the maker can mitigate it at low cost. For: party autonomy; and limiting fraud liability may reduce litigation costs ("especially if non-legal sanctions are potent") and agency costs (C12 S20; C13 S15). Psenicska is the worked example: which provisions limited fraud liability, did the plaintiffs assent, did the parol evidence rule bar the fraud claim, and are there legitimate reasons for such provisions? (C12 S18; C13 S13).
- **Link:** `psenicska`, `borat-release`, `misrepresentation`, `integration`, `restatement-196`, `restatement-214` (the slides cite neither section).
- **Caution.** Clause wording on the slides is the professor's elided excerpt. "Agency costs" is not explained on the slide.

### N13. Mandatory versus default rules
- **Kind:** Concept. **Map:** next to `illusory-promise`, `discretion`, `gap-filling`; class 4.
- **Draft.** Class 4 lists "mandatory versus default rules" as a topic (C4 S2), and for each case the professor asks, "Is it possible to contract around this interpretation?" (C4 S5, S8, S10). UCC § 2-306(2) is drafted as a default: best efforts "unless otherwise agreed" (C4 S9). UCC § 1-302(b) is mandatory in part: obligations of good faith, diligence, reasonableness and care "may not be disclaimed by agreement", though parties may set standards that are not "manifestly unreasonable" (C4 S13). The deck tests the line by rewriting the Mattei clause as "satisfactory to the purchaser, acting at his sole discretion", with a definition that "sole discretion" operates "without regard to any standard of reasonableness" (C4 S6). The professor's summary: courts may read apparently illusory agreements as carrying more robust obligations, such as good faith, which then count as consideration; it is unclear whether courts do so to make the agreement enforceable or because the reading fits intention, fairness or efficiency; if the implied obligations do not match intention, the results are incentives for inefficient behaviour, uncertainty and costly litigation, and incentives to invest in drafting (C4 S14).

### N14. Employment at will
- **Kind:** Concept. **Map:** beside `at-will-reliance`; link `feinberg`, `dg-stout`; class 5.
- **Draft.** In a pure at-will relationship either side "may legally terminate the employment relationship at any time and for any reason" without liability (C5 S14; the slide gives no source for the quotation). Depending on the state, the doctrine may not apply to contracts with a definite term, collective agreements, termination in violation of public policy, termination in violation of implied terms, or termination in violation of the implied duty of good faith (C5 S14).

### N15. Advising a client about breach: N.Y. Rules of Professional Conduct 1.2(d) and 2.1
- **Kind:** Note. **Map:** remedies, beside `efficient-breach`; link `naval-institute`. Shown in Classes 2 and 3.
- **Draft.** After defining an efficient breach as "one that leaves the promisor better off and the promisee no worse off" and asking "Would you advise Berkley to breach?" (C2 S14; C3 S4), the professor shows two rules. Rule 1.2(d), as quoted, bars a lawyer from counselling or assisting conduct the lawyer knows is "illegal or fraudulent", but allows discussing the legal consequences of any proposed course of conduct. Rule 2.1, as quoted, requires independent professional judgment and candid advice, and permits reference to moral, economic, social, psychological and political factors (C2 S15; C3 S5). The slides state no conclusion.
- **Caution.** Verify the rule text against the official rules before storing it as authority.

### N16. Marotta-Wurgler, "Are 'Pay Now, Terms Later' Contracts Worse for Buyers?"
- **Kind:** Note. **Map:** beside `rolling-formation`; class 9.
- **Draft.** Florencia Marotta-Wurgler, 38(2) Journal of Legal Studies 309 (2009). A sample of 515 End User License Agreements for software sold online; 52% were pay-now-terms-later. The study measured whether terms were more or less favourable to buyers than the UCC Article 2 defaults. PNTL agreements were not worse for buyers; on average slightly better (C9 S7). In class it answers the worry that sellers withhold objectionable terms (C9 S6).

### N17. Written confirmations under UCC § 2-207
- **Kind:** Concept. **Map:** battle-of-the-forms district, beside `notes-207-map`; classes 8-9.
- **Draft.** Section 2-207 also applies where the parties already have an agreement and one then sends a form. The professor's chart has three columns (Agreement, Form, Conduct) and three outcomes. The later document may be "other than a confirmation", whose terms are not incorporated. If it is a confirmation, its additional terms are proposals not incorporated under § 2-207(2) when the contract is not between merchants, the offer expressly limits acceptance, the terms materially alter the contract, notification of objection is given ("including in a conflicting confirmation, as per Cmt 6"), or the terms are "different" (the minority rule, "consistent with statutory text"). Otherwise the proposal's terms are incorporated (C8 S17). The underlying contract is "subject to writing requirement, which might be satisfied by the confirmation, and interpreted in light of commercial context" (C8 S17). The chart is applied to Dorton on the assumption that the telephone orders were oral agreements (C8 S22).
- **Caution.** These are flowchart slides; arrows and highlighting are not in the text. Comment 6 was not checked against the Selections.

### N18. Cullinane v. Uber (comparison with Meyer v. Uber)
- **Kind:** Note. **Map:** online-assent district; timeline `standard-terms`; class 6.
- **Draft.** The professor sets two Uber sign-up screens side by side: Meyer v. Uber Techs., Inc., 868 F.3d 66 (2d Cir. 2017), "Applying California law", and Cullinane v. Uber Technologies, Inc., 893 F.3d 53 (2018) (C6 S13-15). The only text on the Cullinane slide is the caption "'Done' appears here once payment info is entered" (C6 S13). The deck states neither court nor holding for Cullinane.
- **From elsewhere in the atlas, not from the deck:** the Kauders brief (`CT-CB-0304`) says the First Circuit held the registration process did not give adequate notice under Massachusetts law; Meyer (`CT-CB-0314`) found reasonably conspicuous notice. Write a full entry only from the opinion.

### N19. Hypothetical: the torn-up prenup
- **Kind:** Hypothetical. **Map:** `formalities` / `statute-frauds`; class 3.
- **Draft.** From a news headline: Nicole Young says she signed a prenuptial agreement in 1996 "under 'pressure'" and that Dr. Dre tore it up years later. The questions: the legal effect of the gesture according to Young; policy arguments each way; Dr. Dre's likely defence (C3 S25). California Family Code § 1611, as quoted, requires a premarital agreement to be in writing and signed by both parties, enforceable without consideration. Section 1614, as quoted, allows amendment or revocation after marriage only by a written agreement signed by the parties, also enforceable without consideration (C3 S26). No answer is stated.
- See section e, item 13 (real, named people).

### N20. Sources of contract terms
- **Kind:** Concept (short), or the opening of `interpretation`. Class 13.
- **Draft.** Potential sources of terms: express terms (writings; extrinsic evidence of the parties' agreement); terms implied by law; custom; course of dealing; course of performance (C13 S4). Bayliner illustrates the first two: an alleged express promise about speed and the implied warranty of merchantability under UCC § 2-314 (C13 S5-6). The slide flags "potential procedural implications" of considering extrinsic evidence without stating them (C13 S4).

### N21. Problem: Drafting for Mr. Lippman (C&M p. 73)
- **Kind:** Hypothetical. **Map:** `feinberg`, `past-consideration`; class 5.
- **Draft.** "Can you improve on this language?" The language is the Pfeiffer board resolution, opening "In consideration of her many years of long and faithful service", raising Mrs. Feinberg's salary from $350 to $400 a month and affording her "the privilege of retiring from active duty in the corporation at any time she may elect" on $200 a month for life (C5 S17). No model answer. The casebook wording at p. 73 was not read.

### N22-N24. Authority entries that need text from a primary source

The decks cite these but do not reproduce them. Create the entries; take the wording from the stated source, never from memory.

| # | Authority | Why | Where to get the text |
|---|---|---|---|
| N22 | CISG Art. 8 | Assigned for class 13 (Syl. p. 6); C13 S19 says Art. 8(3) "contains no parol evidence rule". `parol-evidence` refers to it, but no entry exists. | `added-sources/Contracts- Selections.pdf` (CISG Art. 11 is at PDF p. 615) |
| N23 | N.Y. Gen. Oblig. Law § 15-301 | C11 S12: makes no-oral-modification clauses effective. Not the same as § 5-1103. | Not in any indexed source; needs an official text |
| N24 | N.Y. Gen. Oblig. Law § 5-701(b) | C3 S21: "qualified financial contracts" exception to the writing requirement. | Not in any indexed source; needs an official text |

---

## d. Existing entries to deepen (most important first)

A recurring pattern for case entries: add a block **"How Prof. Davis asks it"** listing his questions and hypotheticals *as questions*.

**Fix first: atlas defects exposed by the new sources (verified)**

1. `restatement-168`: § 168(2)(a) is cut off after "not incompatible with". The Selections (PDF p. 91) and C12 S6 read "...not incompatible with his opinion, or". Restore the three words.
2. `sun-printing`: two reporter cites in consecutive sentences, "139 N.E. 170" and "235 N.Y. 338, 139 N.E. 470". One is a typo (background, not from the source: 139 N.E. 470).
3. `citoh`: procedural history says the account follows "Farnsworth, seventh edition, pp. 199-201". The assigned text is the 10th edition, pp. 281-284 (C8 S23).
4. `oglebay`: linked to authority `const-amend-4` (the Fourth Amendment). Remove.
5. `restatement-21` (Intention to Be Legally Bound) is linked to `alaska-packers`, `vokes`, `oglebay`, `gianni`, `lefkowitz`, `swinton`, `kannavos`, `international-filter` and probably more, where it is not the doctrine. Audit that link across Contracts.
6. `interpretation`: tagged with LRS as a course. It is a Contracts concept.
7. `statute-frauds`: says the units on satisfaction and exceptions "have not yet been assigned" and that Tolosa is "rather than a universal six-category rule". The professor taught the categories, exceptions and sufficiency in Class 3 (C3 S20-22). Rewrite (item 28).
8. `balfour`: `coverage` says "Assigned casebook excerpt"; it is in the supplement (C6 S4).
9. `bayliner` and `warranty-overview` imply merchantability is out of scope; the professor taught § 2-314 twice (C1 S17; C13 S6).

**Class 11: modifications**

10. `alaska-packers`: (a) Davis questions and incentive effects (C11 S4, S6, S8); link `restatement-73`. (b) From Threedy: the three pleaded defences and the district court's reasoning, including estoppel on the superintendent's authority, the admiralty rule on seamen's releases, its express rejection of duress, and the $50-per-man award (pp. 190-193); the Ninth Circuit's weighing of authority and "wrong on principle" (pp. 194-195); chronology (contracts Mar. 26, 1900; arrival about Apr. 27; trial Nov. 26-27, 1900; district opinion Dec. 9, 1901) (pp. 188-190, 193, 207); eighty-two libelants (p. 204); the wage structure of "run money" plus two cents a fish per man (pp. 208-209). (c) Attribute "replacements unavailable" to the courts and add Threedy's doubt as commentary (pp. 214-217). (d) Reword the summary (section e, item 5).
11. `duress`: three-element checklist (improper threat; no reasonable alternative; unfair terms, "less relevant if threat is sufficiently improper"); the widening of "improper threat" from confinement to duress of goods to economic harm including breach; a threat to breach "without legitimate commercial reason" as a breach of good faith, citing UCC § 2-209 cmt. 2 (C11 S13). Add that the Alaska Packers district court rejected duress and that Posner and Chirelstein nonetheless read the case that way (Threedy pp. 193, 196-197).
12. `modification` and timeline `modification`: the three-question test (consideration? fair and equitable response to unanticipated circumstances? duress or bad faith?) (C11 S16); the professor's nesting of UCC § 2-209 and N.Y. § 5-1103 under Restatement § 89(b); the waiver sentence (C11 S11); links to `restatement-73`, `-89`, `-175`, `-176`, `consumer-3`, `ny51103`; timeline steps for § 89 and RLCC § 3.
13. `watkins`, `austin`: Davis hypotheticals (exorbitant price; "I don't want to do this, but if you insist"; modification prompted by a cost increase; what Austin would have done had it known the modification was unenforceable) (C11 S10, S14). `watkins`: cross-reference the rescission line the Alaska Packers district court followed (Threedy pp. 191-192).
14. `restatement-73`, `restatement-89`, `ucc-2-209`, `consumer-3`: annotations and connections (C11 S5, S11-13, S15). Check Comment 2 in the Selections before quoting it.
15. `reading-notes-11`, `contracts-class-11`: add the Threedy article and the Posner note at C&M p. 473; the six-topic agenda (C11 S2); the Hawaiian Housing Problem.
16. `waiver`, `good-faith`: one cross-reference each to the modification setting (C11 S11-13).

**Class 12: misrepresentation**

17. `disclosure`, `restatement-160`, `-161`: the four situations where silence is treated as an assertion (concealment; failure to correct a prior assertion, "half-truth"; fiduciary or trust relationship; failure to act in good faith and fair dealing) (C12 S11); statutory disclosure duties in securities, franchising and truth-in-lending law (C12 S12). Keep the black letter: concealment is § 160, and the slide omits § 161(b)'s "basic assumption" condition and § 161(c).
18. `misrepresentation`: the four-topic structure (C12 S3); pointers to N1, N12 and the policy lists (C12 S4, S17).
19. `vokes`, `speakers-sport`: tie to §§ 168-169 (C12 S6-9); add "puffing"/"puffery" as searchable terms; the dance-studio incentives question. Replace the `restatement-21` link.
20. `swinton`, `kannavos`: incentive, efficiency and "how can the buyer / seller contract around this rule?" questions, answered by the deck's sample clauses (C12 S13-16).
21. `psenicska`, `borat-release`: the three-provision structure (C12 S19); assent and legitimacy questions (C12 S18); a sentence that the result is a reasonable-reliance holding, not an application of the parol evidence rule (C13 S13 asks; the answer is from the atlas brief).

**Classes 13-14: parol evidence and plain meaning**

22. `parol-evidence`, `integration`: the two lists, crosswalk and merger-clause points (or link to N9); RLCC § 9 as part of the unit (C13 S11); the English-law comparison, a rule "more like a rebuttable presumption" (C13 S19). Note that § 217 (oral condition) underlies "can (7)".
23. `gianni`, `masterson`, `bollinger`, `teevee-toons`: Davis questions (C13 S16-18, S20). Gianni: consistency with § 214; a letter before or after signing. Masterson: how California parties can preclude parol evidence. Bollinger: link `restatement-214(e)` and `restatement-155`. TeeVee Toons: the New York-law counterfactual.
24. `cisg-framework`: the slide's two routes to CISG applicability (C13 S19). Background, not from the source: the United States declared under Art. 95 that it is not bound by the second route; verify first.
25. `pacific-gas`, `trident`, `www-associates`, `greenfield`: clause text as quoted and the question lists (C14 S18-22). Greenfield: add the passage on C14 S23 and say expressly that synchronization income was not shared.
26. `interpretation`, timeline `interpretation`: placement under "Has it been performed?" (C14 S2); the four contentious issues (C14 S16).
27. `bayliner`, `ucc-2-314`, `promise-or-prediction`: the two hypotheticals ("in my opinion, this boat will go 30 miles per hour, no trouble"; no statement, but a top speed of two miles per hour) (C1 S16; C13 S5); link `ucc-2-314` and `ucc-2-315` to `bayliner`.

**Class 3: consideration and formalities**

28. `statute-frauds`, `restatement-110`, `ucc-2-201`: the six categories (C3 S20); the exceptions (part performance, estoppel and reliance; merchant confirmation; judicial admission; qualified financial contracts) (C3 S21); what writing suffices, with the lighter § 2-201(1) standard and the quantity cap, and electronic records (C3 S22). Use the statute's "$500 or more", not the slide's "in excess of $500".
29. `consideration`, `adequacy-consideration`: the two-branch taxonomy of when consideration is missing (nothing given in return; or what is given was not sought or not induced) (C3 S11-12); "appears to be" sought and induced; adequacy "arguably irrelevant" (C3 S10); the formation roadmap (C3 S8). Which items are bold on S12 (rescued by the General Obligations Law) is not visible in the text.
30. `hamer`, `dyer`, `tolosa`: Davis questions (C3 S13, S15, S23). `tolosa`: the Tex. Bus. & Com. Code § 26.02(e) notice text (C3 S24); drop the stray "2" in the extraction.
31. `formalities`: examples (writing, seal, notarization, "Consideration (?)") and the concerns of cost and prejudice to unsophisticated parties (C3 S18-19).
32. `problem-retirement-discount`: add the casebook title "Discounting Retirement" as an alias so search finds it (C2 S17; C3 S16); link brief `CT-ADDITIONAL-CM-B1-008` (Marine Contractors v. Hurley). Keep the atlas page (p. 60); the Class 2 slide says p. 59.
33. `gap-ny51105`: import the section text from the Selections; today it is a pointer only.

**Class 8-9: firm offers, battle of the forms, later terms**

34. `irrevocability`, timeline `firm-offers`: the five routes (consideration; statute, UCC § 2-205 or N.Y. § 5-1109; signed recital under § 87(1); tender or beginning performance under §§ 45 or 62; reliance under § 87(2)), and the "option contract" label of § 25 (C8 S5). Link `restatement-25`, `-62`, `-87`.
35. `ucc207`, `notes-207-map`, `conditional-acceptance`, `different-terms`: the split into formation rules (§ 2-207(1), first sentence of (3)) and interpretation rules ((2), second sentence of (3)) (C8 S14-15); the three exits from acceptance under (1); the labels majority "knockout" rule, "leading minority rule, consistent with statutory text", and "'California' rule, implied by Cmt 3" (C8 S16).
36. `dorton`, `citoh`, `bayway`, `northrop`, `material-alteration`: chart placement and fact labels (C8 S18-26); pointer to Comments 4 and 5; "Is an arbitration clause necessarily a material alteration?" (C8 S24).
37. `drennan`: the eight-question sequence, including "How would this case be resolved in New York?" (C8 S10), as an open question linked to `ny51109` and `note-baird`.
38. `mirror-image`, `last-shot`: the three-column common-law chart (C8 S12).
39. `problem-maine`, `problem-misplaced`, `notes-drafting`: the slide wordings and questions (C8 S6, S27-29).
40. `hill-gateway`, `klocek`, `rolling-formation`: the professor's pros of Easterbrook's approach (lower costs at the initial transaction; ousts possibly undesirable UCC gap-fillers) and cons (unclear whether the seller is bound before the review period ends; incentive to withhold objectionable terms) (C9 S6); the hypotheticals (seller reneges after payment; buyer unaware terms will follow; costly return) (C9 S5); "Would that have ensured meaningful assent?" (C9 S4).
41. `consumer-2`, timeline `standard-terms`: add the comment excerpt (§ 2 does not address formation or assent to nonstandard terms; assent to the transaction adopts the core deal terms) (C6 S16; C9 S8) after checking the comment number in `Complete Restatement.pdf`; link to `hill-gateway`, `klocek`; add a § 2(b) step.

**Class 10: definiteness and preliminary agreements**

42. `note-tribune-types`, `preliminary-agreements`: tag class 10 and treat as the first listed reading. Use the labels "Tribune I" and "Tribune II" with "Type I / Type II" as aliases. Add the citation, Teachers Insurance & Annuity Ass'n v. Tribune Co., 670 F.Supp. 491 (S.D.N.Y. 1987) (C10 S14; C&M p. 190). Tribune I: complete agreement on all issues perceived to require negotiation, "preliminary only in form", binding both sides to their ultimate objective. Tribune II: a commitment to negotiate open terms in good faith, with no right to demand performance of the transaction (C&M p. 190). Factors against a binding preliminary agreement: disclaimer of intention to be bound, indefiniteness, complex transaction; for: formality, part performance, reliance (C10 S15). The note's statement that the full opinion "is a later SUPP assignment" needs checking: the atlas ties only supplement p. 21 (French art. 1112) to class 10.
43. `precontractual-liability`: the menu of possible effects of preliminary statements (no legal effect; contract as Tribune I or II; promissory estoppel; misrepresentation in tort; promissory fraud in tort) and two background rules (no general duty to negotiate in good faith; restitution may be available for benefits conferred) (C10 S2, S13); the nine "Questions for all cases" (C10 S16).
44. `definiteness`: the two formulations (a basis for determining breach and giving a remedy; agreement on all essential terms) and the remedial side (damages only to reasonable certainty; specific relief only if terms are sufficiently certain) (C10 S5). Link `restatement-33`, `-352`, `-362` (the section match is the reviewer's).
45. `oglebay`, `sun-printing`, `cyberchron`: Oglebay's five candidate reasons for no third pricing mechanism and "Which of these reasons should the court effectively condone?" (C10 S10); Sun Printing's "How would damages be calculated?" and "What if the price had fallen?" (C10 S7); Cyberchron's detail that Wilhelm refused to put the reassurance in writing (C10 S19).

**Classes 6-7: assent, offer and acceptance**

46. `objective-assent`: the nine factors (language; formality; definiteness or completeness; reasonableness of terms; foreseeable reliance or part performance; conspicuousness; custom; self-interest; course of dealing) (C6 S11); the three justifications (C6 S9); the Lucy ladder (did not intend; listener knew; listener should have known) (C6 S8).
47. `assent-consent-intent`, `social-intent`, `restatement-21`, `balfour`, `cohen-cowles`: § 21 comment c on social and family arrangements (C6 S5); Balfour's policy questions (C6 S4); Cohen as an intent case, where the contract fails and promissory estoppel succeeds, "Can we justify different answers?" (C6 S6). Link `restatement-21` and `cohen-cowles` to class 6.
48. `specht`, `note-leonard`: "How do you expect Netscape to respond?" and "Will this guarantee 'informed assent'?" (C6 S12); link Leonard to `lucy`, `offer`, `lefkowitz` (C6 S10; C7 S4).
49. `offer`, `advertisements`, `lefkowitz`: the terms "quotes" and "invitations to treat"; non-offers may still be "tortious or violations of consumer protection statutes" (C7 S4); "How will Great Minneapolis respond?" (C7 S5).
50. `acceptance`, `acceptance-notice`, `mailbox`, `termination-offer`: the seven-line acceptance checklist, including "the offeror is master of the offer" and dispatch "except in the case of options" (C7 S6); § 54 shown twice (C7 S7, S13; C8 S7); the four ways the power of acceptance ends, three of which "may not terminate the power to accept an irrevocable offer" (C7 S8). Connect `restatement-36`, `-50`, `-54`, `-56`, `-63` (all zero connections).
51. `wucherpfennig`, `international-filter`, `white-corlies`, `note-carlill`, `problem-awesome`: Davis questions (C7 S9-12, S15; C8 S9), including Carlill's revocation ladder and "Should it be possible to modify a contract by IM?". The White "revised estimate (signed)" detail needs a casebook check.

**Class 5: promissory estoppel and restitution**

52. `restatement-90`, `rest90`: § 90 comment b factors for "injustice" (reasonableness of reliance; its definite and substantial character; formality; how far the evidentiary, cautionary, deterrent and channeling functions of form are met; other policies such as enforcing bargains and preventing unjust enrichment) (C5 S7, S13; Selections PDF p. 58). The professor shows it twice.
53. `promissory-estoppel`: equitable estoppel "precludes denial of facts", promissory estoppel precludes denying a binding promise; "endorsed in §§ 87-90"; "frequently argued, but often without success"; Gilmore's "Death of Contract" (C5 S4); six applications (C5 S5); three contract-versus-estoppel differences, two posed as questions (C5 S9); a side-by-side of the remedy in the four cases, built from existing entries.
54. `feinberg`, `past-consideration`: the grid of four candidate considerations and why each fails (past services; promise to continue; continued employment; retirement, "not sought by promisor") (C5 S15); three hypotheticals (C5 S16). Confirm the grid pairing on the slide image.
55. `ricketts`, `dg-stout`: hypotheticals and the six-question sequence (C5 S11, S19). The professor poses "expectation or reliance damages?" as open; the atlas states reliance flatly.
56. `unjust-enrichment`, `restitution-interest`: four typical settings and two measures of restitution (C5 S3).

**Class 4: consideration and interpretation**

57. `mattei`, `satisfaction`, `wood-lucy`, `implied-efforts`, `structural-polymer`: the three-way choices (absolute discretion / reasonable person / good faith; none / reasonable efforts / best efforts) and the three recurring questions (C4 S5, S8, S10); the "sole discretion" variants (C4 S6); § 2-306 Comment 5's "reasonable diligence", "reasonable effort", "due diligence" (C4 S9); the zero-requirements and dramatic-increase hypotheticals (C4 S12).
58. `ucc-2-306`, `ucc306`, `requirements-output`, `problem-toast`: comment paraphrases ("reasonably foreseeable figure"; shut-down "for lack of orders" versus "merely to curtail losses"; "normal" versus "sudden expansion") (C4 S12, S16); the four problem questions (C4 S15). Do not assign comment numbers from the slides.
59. `illusory-promise`, `good-faith-early`: the Slide 14 summary; connect orphan authorities `restatement-224`, `ucc-1-302`.

**Classes 1-2: overview and remedies**

60. `remedial-overview`, `disgorgement`, `expectation-interest`: the five-measure grid (restitution: promisor, contract never made, to the extent of benefits received; reliance: promisee, never made; expectation: promisee, performed; disgorgement: promisor, performed; punitive) (C2 S5); expectation as "the default measure" (C2 S2); the menu "Damages? Specific performance? Imprisonment?" (C2 S4).
61. `problem-interests`, `problem-opportunity`, `reliance-interest`: the three-state table (never made $0; performed $13,500; breached -$19,600) and the lost-opportunity row (C2 S9-10). The slide leaves the three answers blank (section e, item 12).
62. `specific-performance`: the two-part checklist (inadequate remedy at law, presumed for land; equitable conditions: no unclean hands, not unfair, no laches, security for the promisor's performance, enforcement not impractical, not personal services) (C2 S11).
63. `efficient-breach`, `naval-institute`, `morris-sparrow`, `white-benkowski`: the definition and Berkley hypothetical (C2 S14); Morris hypotheticals (C2 S12); "How could the Whites have avoided this outcome?" (C2 S16).
64. `legal-framework`, `notes-theories`, `gap-apple`, `hawkins`: point to N7 and N8; Apple figures (about 2 million apps; "facilitated $1.3 trillion in billings and sales" (2024); 97.7% of apps use the default EULA), recorded as "figures shown on Slide 10" with no source (C1 S10); the Hawkins three-position comparison (C1 S14).

**Hubs and housekeeping**

65. `contracts-class-01` to `-14`: replace the bare reading index with each deck's agenda slide, casebook page anchors, the problem for next class, and "also discussed in class" (C13 revisits Bayliner and Psenicska; C6 uses Cohen, Leonard, Meyer, Cullinane; C7 uses Carlill and the "Awesome" problem).
66. `gap-classroom`, `class-notes`, `contracts-davis-fall2026`: these say classroom materials are not on file and that the syllabus source covers "assignments 1-9". Fourteen decks are now on file. Update, and list the deck files as sources.

---

## e. Conflicts to settle

Each needs the owner or a careful reviewer. Both sides are quoted.

1. **Dates.** Syllabus: "Tuesdays and Thursdays 11:00 a.m.-1:00 p.m., in FH 216" and no dates (Syl. p. 1). Atlas: one owner-reported date, assignment 9 on "2026-09-22". Should the cards show the projected Tuesday/Thursday dates in section b, owner-supplied dates, or none?
2. **What is a "session"?** Syllabus assignment 9: "Battle of the forms; Pay now, terms later", with Bayway and Northrop. Deck "Class 8": includes "Bayway Refining v. Oxygenated Marketing & Trading (285)" and "Northrop Corp. v. Litronic Industries (290)" (C8 S24-26). Deck "Class 9": "Pay now, terms later", Hill and Klocek only. Atlas `gap-classroom`: September 22 was "class 9, focused on Bayway and Northrop". One card per syllabus assignment (recommended), or per deck?
3. **Titles.** Assignment 8: syllabus "Contract formation under Restatement §§ 45, 90 and Article 2 of the UCC"; deck "Firm offers and formation under Article 2"; atlas "Irrevocability and formation under Article 2". Assignment 14: syllabus "The plain meaning rule and extrinsic evidence of parties' intent"; deck "The plain meaning rule"; atlas "Meaning and extrinsic evidence". Which wording goes on the cards?
4. **RLCC § 2 wording.** Slide: adopted "if the consumer manifests assent to the transaction after receiving: (1) a reasonable notice..." (C6 S16; similarly C9 S9). Atlas and `Complete Restatement.pdf` p. 26 (verified): adopted "if the business demonstrates that the consumer manifested assent...". The slide omits the burden on the business. Recommend keeping the official text with a note. Which should a student quote?
5. **Alaska Packers summary.** Atlas: "a midseason promise to double their fixed compensation". Threedy: the men stopped work "[s]hortly after arriving", about April 27; the new contract was May 22; the demand was $100 against $50, or $60 for the men on shipping articles (pp. 189-190, 207). "Midseason" is unsupported by this source and "double" is exact for one group only. Reword to "soon after arrival" and "$100 in place of $50 (or $60)"?
6. **Alaska Packers, the superintendent's authority.** Atlas: the Ninth Circuit "did not decide the authority issue". Threedy p. 194 n. 63: the court "seems to decide the issue of the superintendent's authority indirectly". Add her reading as a qualification?
7. **"Explain unambiguous agreements."** Slide: extrinsic evidence cannot be used to "explain unambiguous agreements" (C13 S7; C14 S3). Atlas `restatement-214(c)`: negotiations are admissible to establish "the meaning of the writing, whether or not integrated", and `pacific-gas` says clear words do not end the inquiry in California. The deck lists the point as contentious (C13 S10). Publish the chart with that qualification attached?
8. **Gianni spelling.** Slide and syllabus: "Gianni v. R. Russell & Co." Atlas: "Gianni v. R. Russel & Co., Inc.", after a recorded correction (background, not from the source: the reporter caption uses "Russel"). Keep the atlas spelling and add the other as an alias?
9. **Masterson, whose evidence.** Slide: "How was the Mastersons' parol evidence to be used?" (C13 S17). Atlas brief: the excluded evidence of a personal, non-assignable option was offered by the Sines. Who is right? Check C&M pp. 536-542.
10. **French art. 1112.** Slide ("2016" text): reparation "is not calculated so as to compensate the loss of benefits which were expected from the contract that was not concluded" (C10 S17). Atlas `french-negotiations` (supplement p. 21): also excludes "the lost chance of obtaining those benefits". Which text is in the supplement? (Background, not from the source: the article was amended in 2018.)
11. **N.Y. Gen. Oblig. Law § 5-1103.** Slide: "UCC 2-209 and NY Gen Oblig. 5-1103 eliminate the requirement of consideration for contract modifications" (C11 S11). Atlas `ny51103`: the section "requires a writing signed by the party against whom enforcement is sought". Keep the atlas and note the shorthand?
12. **Blanks the professor left.** C2 S9 leaves "Restitution: $ / Reliance: $ / Expectation: $" blank; C11 S7 leaves "$__" blank. Reviewers computed $300 / $19,600 / $33,100, and for the holdup $0 if the workers quit. Publish as "worked from the slide's table, not the professor's answer", or leave blank until class notes confirm?
13. **Named real people.** C3 S25-26 uses a news headline about Dr. Dre and Nicole Young. Record the hypothetical with names, or anonymised?
14. **Assignment 25.** Syllabus: "Penalty clauses in Swiss law" (a reading). Atlas: `swiss-2024` listed as a principal case. Reclassify as a reading?
15. **Slide layouts needing a look at the original .pptx:** the claims table (C12 S5); the integration table (C13 S8); the Feinberg grid (C5 S15); the doctrinal map (C1 S8); the bold items (C3 S12); all Class 8 flowcharts; the Uber screens (C6 S13-15); the Class 14 clause slides (S9-11).

Slide slips where the atlas is right and nothing changes: Cohen cited as "50 U.S. 663, 672" (C5 S18; C6 S6) against 501 U.S. 663; "Speakers of Sports" (C12 S8); "in excess of $500" (C3 S20) against "$500 or more"; "promise or affirmations" in § 2-314(2)(f) (C1 S17); "Discounting Retirement Problem, p. 59" (C2 S17) against p. 60; "See Restatement § 161" for concealment (C12 S11), which is § 160.

---

## f. Not checked / limits

- **No original .pptx or PDF was opened.** Everything rests on extracted text. Pictures, arrows, colours, bold and table layout are not visible. Blank or title-only slides that are probably images: C1 S10; C6 S7, S10, S13-15; C7 S14; C8 S8; C10 S12; C12 S10 ("Hong Kong banker wins back millions for dance lessons", headline only); C14 S6-7.
- **No professor answers.** No deck has speaker notes with answers, except the single note in Class 14. What was said in class is unknown.
- **No dates in any source.** The projected dates are arithmetic.
- **Threedy** was read as uncorrected HeinOnline OCR; page numbers are inferred from running heads and may be off by one near page breaks. The Goebel, King, Lingenfelder and district-court opinions were not read.
- **Casebook pages read for this plan:** 190, 473, 483, 559, 566, 567 (OCR text, not page images). Not read: pp. 73, 96, 362, 569, the "Methods of Interpreting Ambiguous Contracts" note, and pp. 536-542 for the Masterson question.
- **Comments not verified:** UCC § 2-207 cmts. 3-6, § 2-209 cmt. 2, § 2-306 cmt. 5, RLCC § 2 comment (labelled "Cmt 3" on the slide), Restatement § 90 cmt. b beyond the slide. Check the Selections or `Complete Restatement.pdf` before quoting.
- **Not verified against any source:** N.Y. Gen. Oblig. Law §§ 15-301 and 5-701(b); N.Y. Rules 1.2(d) and 2.1; Cal. Fam. Code §§ 1611, 1614; Tex. Bus. & Com. Code § 26.02(e); the Rockland citation; Cullinane's holding.
- **Full briefs** were read in bounded excerpts. A hypothetical marked as absent could appear deep in a long brief or cold-call narrative.
- **Authority ids** are reported as the per-file reviewers opened them; I re-opened only `restatement-168` and `consumer-2`. Node ids were checked against the full node list. Map-rule ids `ucc2209`, `ucc2716`, `rest205` and `rlcc-9` are referenced by timelines or authorities but do not open as entries.
- **The app was not run.** "What the visitor sees" is read from code and data. Whether the old "assignments 1-9" export text is still reachable was not confirmed.
- **Other copies.** Every deck file name ends "- Copy (n)"; no other copies were found or compared.
- **Supplement page ranges** per assignment cannot be checked against the syllabus, which says only "SUPP".
