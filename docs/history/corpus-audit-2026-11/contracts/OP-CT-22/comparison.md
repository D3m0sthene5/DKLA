# OP-CT-22 comparison: Contracts Class 22, specific relief

Sources: C&M printed 34–43, 929–930, 945–950; supplement pp. 108–128 (Klein 108–112, Rowan 113–123, Cosby 124–128); Selections, Restatement (Second) §§ 357–369 and UCC § 2–716 with Official Comment. Page mapping is in learn-list.md. No slide deck was located (K-22-DECK-01), although the lecture-notes record names "Class 22_Specific relief - Copy (3).pptx" (23 slides); the lecture notes could be checked only against the casebook, supplement and Selections. The Cosby excerpt ends at supp. 128, before the court's application and remedy, so every Atlas statement about the disposition, the vote and the separate opinions is "not in the assigned excerpt" (it is supported only by the Atlas's own full-opinion brief, which this audit did not verify). Prior corrections in prior-corrections.json (timeline `specific-relief` steps for Klein and Walgreen, the `reliance` timeline Cosby step and summary fields) were checked and are not re-reported.

## (a) Coverage

Status: Covered = taught correctly on a surface a student meets in this class; Partial = present but missing a condition, or present only on a surface tied to another class; Missing = on no teaching surface.

| Learn-list point | Where the Atlas serves it | Status |
|---|---|---|
| 1–3. Money presumptive; specific relief compensatory in aim; history of the adequacy test (C&M 929) | specific-performance concept (class 2) says only that an enforceable contract does not automatically yield specific relief | Partial: the compensatory aim and the law/equity history are missing (G6) |
| 4. Land presumptively unique; heirlooms; output and requirements contracts (C&M 930) | lecture notes topic 2 (land); K-34 b omits land | Partial (E3, G7) |
| 5–7. § 357(1) discretion and threatened breach; § 359 gate; ch. 16 Intro Note | K-34 a label; timeline `now`; rules entries §§ 357 and 359 exist with no case links | Partial (G1, E15) |
| 8. § 360 factors | K-34 a detail covers (a) measurement and K-34 b covers (b) substitutes; factor (c) collectability appears nowhere; rules entry has no links | Partial (G2) |
| 9–10. UCC § 2–716 text and comments (liberal attitude, total situation, inability to cover, replevin) | rules entry ucc-2-716 (text only); timeline `ucc2716` step and context | Partial: comment 2's "inability to cover is strong evidence" and replevin are missing (G8) |
| 11. Klein formation, condition and remedy | Klein map, brief, takeaway, Cold Call, timeline step 3, chronology 354, K-34 b and g | Covered, with one dropped condition (E13) and one overstated ≈ (E14) |
| 12–13. § 362 certainty; § 364 unfairness | rules entries only, with no links; K-34 has no route to refuse relief on these grounds | Missing from teaching surfaces (E1, G3) |
| 14, 17. Supervision, construction contracts, Bliss, Floyd | none; a Bliss brief (CT-ADDITIONAL-CM-B3-102) exists but no class-22 surface links it | Missing (E5, G4) |
| 15–16. § 367 and De Rivafinoli | notes-personal-service and note-lumley (class 2); K-34 d and e | Covered |
| 18. Arbitral specific performance | none | Missing (G13) |
| 19–20. Contracted-for specific performance (Snow Phipps note 1); delay damages with an order | Snow Phipps, Twitter and Osborn briefs exist; no class-22 surface links them | Missing from class surfaces (G5) |
| 21–22. Injunction versus specific performance, § 357(2) | timeline `guide` contrasts an order to deliver with an injunction; specific-performance summary | Partial: § 357(2)'s two conditions are not stated (G1) |
| 23–29. Walgreen cost-benefit framing | Walgreen map, brief, takeaway, Cold Call, timeline step 4, chronology 396, K-34 c and f | Covered in the narrative; the even-balance rule is missing from the rule line, chronology, timeline step and chart (E4, E7), and the takeaway overstates (E6) |
| 30. Preliminary versus permanent injunction | Walgreen Cold Call episode 2 | Covered |
| 31–32. Holmes; efficient breach numbers; Pareto and Kaldor-Hicks | efficient-breach concept (class 2, C&M 34–36); K-35 a–g; lecture notes topic 5 | Covered (K-35 arithmetic checked and correct) |
| 33–37. Reliance investment, Coase, Kansas v. Nebraska, willful and opportunistic breach, limits of Coase (C&M 37–43) | efficient-breach concept says "The later pages of this economic discussion are not assigned until a later unit"; a Kansas v. Nebraska brief (CT-ADDITIONAL-CM-B1-005) exists but no class-22 surface links it | Missing (G9; K-30 items for Astra) |
| 38–46. French specific enforcement | french-specific-performance note; K-34 h | Partial: the personal-services exception and the good-faith limit are missing from K-34 h (E2); as-of-right availability, the price action, the délai de grâce, no mitigation, art. 1124 and the astreinte's punitive character are thin or missing (G10) |
| 47–51. Cosby facts, holding, contract doctrine | Cosby map, brief, takeaway, Cold Call, `reliance` timeline step 10, chronology 608 | Covered, but one learning topic names the wrong doctrine (E8), one overstates (E9), and the takeaway has three sentences (E10) |
| 52. Cosby's remedy as enforcement of the promise itself | Cosby brief and Cold Call episode 7 (from the full opinion) | Partial: the link to this class's subject is not drawn on a class surface (G12) |

## (b) Errors in existing text

Each finding gives the surface and field, the exact current text, the verdict, a counterexample, the pinpoint, and a minimal replacement.

### Findings that can change a result

**E1. Flowchart K-34 node f (and the edges into it from b, c and e).**
Current: node f `"label": "Fashion the specific relief the facts support"`, `"edges": []`, reached by b "Special value or unavailable substitutes", c "Equitable balance favors order" and e "Equitable order available".
Verdict: CHANGES RESULT. Once damages are shown inadequate, the chart can only display an order. The detail says "test feasibility and equitable constraints", but no edge leads to a refusal.
Counterexample: take Klein with one changed fact. The G-II is the only one of its kind, so damages are inadequate, but PepsiCo's price was grossly inadequate, or the sale was induced by mistake. The path a → "Goods or property" → b → "Special value or unavailable substitutes" → f displays "Fashion the specific relief". Restatement § 364(1) says relief "will be refused" in that case. The same happens with terms too uncertain for an order (§ 362; in Bliss, "the imprecision of the contract provision relied upon", C&M 947).
Pinpoint: Restatement §§ 362, 364(1), 366; C&M 947.
Replacement: insert node `i` and point the three edges at it instead of f.
`{"id":"i","label":"Does an equitable bar defeat the order?","detail":"Even where damages are inadequate, courts refuse orders whose terms are too uncertain to frame (§ 362), that would be unfair because of mistake, unfair practices, unreasonable hardship or a grossly inadequate exchange (§ 364(1)), or whose supervision burdens outweigh the gain (§ 366; Bliss, C&M 947).","sources":["specific-performance"],"edges":[{"label":"No bar shown","to":"f"},{"label":"Uncertain, unfair or unworkable order","to":"g"}]}`

**E2. Flowchart K-34 node h, detail.**
Current: "The assigned comparison addresses execution in kind and substitute performance subject to impossibility and manifest disproportion. Use its conditions rather than importing the common-law adequacy threshold."
Verdict: MISSING CONDITION, and it changes a result. Rowan lists three situations in which specific enforcement is unavailable, not two. The detail leaves out the personal-services ("involuntary servitude") exception and the 2018 good-faith limit on the disproportion exception. It also attaches "manifest disproportion" to substitute performance, which art. 1222 instead limits by reasonable time and reasonable cost.
Counterexample: an artist commissioned to paint and deliver a picture refuses. On the chart's two listed exceptions, performance in kind would be ordered. French courts refused it (supp. 118, Civ. 14 March 1900). A second counterexample: a builder deliberately departs from the specification to save money and then pleads manifest disproportion. After the 2018 amendment, the exception applies only to a debtor "acting in good faith" (supp. 114, 120).
Pinpoint: supp. 114 (art. 1221, 2016 and 2018 versions), 118 (three situations), 120 (good faith), 123 (art. 1222).
Replacement: "French law grants performance in kind as of right, without the common-law adequacy threshold, unless performance is impossible, would compel personal services, or would cost a good-faith debtor manifestly more than it is worth to the creditor (art. 1221). Article 1222 separately lets the creditor have the work done by another at reasonable cost."

**E3. Flowchart K-34 node b, detail.**
Current: "Klein denied specific performance where replacement aircraft and money were adequate. Morris ordered delivery of a horse trained by the claimant. Compare individual attachment, market availability, and assured supply."
Verdict: MISSING CONDITION, and it can change a result. Entry edge a → b is labelled "Goods or property", yet b never says that land is treated as unique. It also omits § 360(c), the likelihood that a damages award could not be collected.
Counterexample: a seller repudiates a contract to sell a house lot, and similar lots are on the market. Node b's question ("Can the claimant obtain a genuine substitute?") leads to "Substitutes and damages adequate" → g. C&M 930 says contracts to sell land are specifically enforced because land is treated as so distinctive that damages are categorically inadequate. In a second counterexample, Klein's facts hold except that PepsiCo is insolvent: b → g, although § 360(c) makes uncollectability significant to adequacy.
Pinpoint: C&M 930; Restatement § 360(c).
Replacement (add to the end of the detail): "A contract to sell land is traditionally specifically enforced because land is treated as unique (C&M 930). Also weigh whether a damages award could actually be collected (§ 360(c))."

**E4. Flowchart K-34 node c, detail.**
Current: "The pharmacy exclusivity dispute implicated future competitive losses. Compare measuring the injury with supervising an injunction and with bargaining after an order issues."
Verdict: MISSING CONDITION. The detail leaves out Walgreen's rule for a tie and the plaintiff's burden. Neither edge ("Equitable balance favors order", "Money relief adequate") tells a student what to do when the costs of measuring damages and the costs of the injunction are roughly equal.
Counterexample: Walgreen's facts with three years left on the lease, so that damages are uncertain but the uncertainty roughly matches the expected bargaining costs. A student who reads the node's question ("Is prospective loss unusually hard to quantify?") as satisfied takes the edge to f. Walgreen says that "if the balance is even the injunction should be withheld".
Pinpoint: C&M 949.
Replacement (append): "Walgreen weighs the costs and benefits of both remedies; if the balance is even, the injunction is withheld (C&M 949)."

**E5. Flowchart K-34 node a, edges.**
Current: edges "Goods or property" → b, "Business restriction" → c, "Personal services" → d, "French comparison" → h.
Verdict: CHANGES RESULT. No branch exists for a construction contract or another affirmative performance that needs supervision. A student with a building contract can only pick "Personal services" (→ d → "Affirmative or coercive relief" → g), which denies relief in every case.
Counterexample: the agreement includes construction on the defendant's land and a conveyance of that land (Floyd v. Watson). The chart reaches g, a refusal; the court in Floyd held that "specific performance is proper" (C&M 946). Bliss reaches the right result (denial, C&M 947) only by accident of the path.
Pinpoint: C&M 946–947.
Replacement: add the edge `{"label":"Construction or other ongoing work","to":"j"}` and the node `{"id":"j","label":"Can the court frame and supervise the order?","detail":"Bliss refused to order a contractor to add 300 workers: the provision was imprecise and enforcing a staffing order on a steel-mill site was impracticable (C&M 947). Courts are more willing where the construction is on the defendant's land and tied to a conveyance (Floyd v. Watson, C&M 946).","sources":["specific-performance"],"edges":[{"label":"Order workable or tied to land","to":"i"},{"label":"Impractical or imprecise","to":"g"}]}` (node i as proposed in E1). When the Bliss brief is mapped, add it to `sources`.

### Errors in case surfaces

**E6. Walgreen, Takeaway (tools/r19/data/takeaways.json).**
Current: "A court may enforce a shopping-centre exclusivity clause with an injunction rather than damages when damages would be hard to measure."
Verdict: OVERSTATED. Damages that are hard to measure are necessary but not sufficient: Posner weighs them against the injunction's own costs (supervision, effects on third parties, bilateral monopoly) and withholds the injunction on an even balance. "Centre" also departs from the Atlas's American spelling ("shopping-center" in the map and brief).
Counterexample: in Bliss, delay damages were hard to measure too, but the impracticability of supervising the order defeated relief (C&M 947).
Pinpoint: C&M 949–950.
Replacement (two sentences, 50 words): "A court may enforce a shopping-center exclusivity clause with an injunction when measuring damages would be costly and uncertain and those costs outweigh the injunction's own costs. The choice weighs the costs and benefits of each remedy in the particular case; if the balance is even, the injunction is withheld."

**E7. Walgreen, Effective brief CT-NEXT-CM-0142 rule; Chronology 'course-chronology-0' step 396 note; Timeline 'specific-relief' step 4 note.**
Current (rule and chronology): "which the court decides by comparing the costs and benefits of damages and injunctive relief in the particular case." Current (timeline): "Posner: an injunction against breach of an exclusivity covenant is proper when damages are inadequate, judged by the costs and benefits of each remedy."
Verdict: MISSING CONDITION. Each version leaves out the tie rule, which is part of the court's decision procedure.
Counterexample: as in E4.
Pinpoint: C&M 949.
Replacement, rule and chronology (42 words): "A permanent injunction against breach of contract is proper only when the plaintiff shows damages inadequate, judged by weighing the costs and benefits of damages and of an injunction in the particular case; if the balance is even, the injunction is withheld." Replacement, timeline note: "Posner: an injunction against breach of an exclusivity covenant is proper when damages are inadequate, judged by the costs and benefits of each remedy; an even balance means no injunction."

**E8. Cosby, Map entry learning.topics "equitable-estoppel".**
Current: "The court's fundamental-fairness rationale is an estoppel against the government, closer to equitable estoppel than to bargain contract."
Verdict: MISSTATES HOLDING (names the wrong doctrine). The excerpt invokes promissory estoppel by name and sets out its three Pennsylvania elements (Crouse v. Cyclops); it never mentions equitable estoppel. Equitable estoppel rests on a misrepresentation of fact; Castor's statement was a promise or decision about future conduct. On an exam question asking "what contract doctrine does Cosby use?", this topic gives the wrong answer.
Counterexample: the assigned learning question for this class ("the Cosby non-prosecution promise and what contract doctrine it uses"). The answer the source supports is promissory estoppel, the reliance theory, used to inform due process, and not bargain.
Pinpoint: supp. 127–128.
Replacement: delete the topic, or rewrite it as: "The court did not find a bargain: Castor's decision was unilateral, and such discretion is not enforceable like a bargained-for exchange. It borrowed promissory estoppel's elements (expected inducement, actual reliance, injustice) to inform the due-process inquiry."

**E9. Cosby, Map entry learning.topics "reliance".**
Current: "The enforceability of the non-prosecution assurance rested entirely on Cosby's detrimental reliance in surrendering his Fifth Amendment privilege."
Verdict: OVERSTATED (missing condition). The stated holding requires two things together: an unconditional promise of non-prosecution, and detrimental reliance. The court adds that an exercise of discretion "is not per se enforceable".
Counterexample: the prosecutor announces a non-prosecution decision expressly reserving the right to charge later if new evidence appears, and the suspect then testifies. The reliance is the same, but the promise is not unconditional, so the Cosby rule does not apply (supp. 127; compare the press release's "will reconsider this decision should the need arise", supp. 126, whose meaning the parties disputed).
Pinpoint: supp. 127–128.
Replacement: "Enforcement rested on two facts together: the prosecutor's non-prosecution promise was unconditional, and Cosby relied on it to his detriment by giving up his Fifth Amendment privilege."

**E10. Cosby, Takeaway.**
Current: "The Pennsylvania Supreme Court held that this prosecutor’s unconditional decision intentionally induced Cosby’s reasonable, detrimental surrender of Fifth Amendment protection in civil depositions. Due process required enforcement on that record. Four Justices barred prosecution on these particular charges; the decision does not enforce every prosecutorial assurance."
Verdict: the format rule is broken (three sentences; the limit is two). The takeaway also omits the contract doctrine the class assigns the case for. The vote and remedy are not in the assigned excerpt.
Pinpoint: supp. 127–128.
Replacement (two sentences, 51 words): "Drawing on promissory-estoppel principles, Pennsylvania's Supreme Court held that due process required enforcing a prosecutor's unconditional decision not to prosecute after it induced Cosby to give up his Fifth Amendment privilege in civil depositions. The four-Justice majority barred prosecution on these charges; the ruling does not make every prosecutorial assurance enforceable."

**E11. Cosby, Map entry sections.Material Facts.**
Current: "The reproduced press release includes a statement about reconsidering a decision in the context of public discussion."
Verdict: OVERSTATED. The sentence adopts the majority's contested reading of the reservation as a fact about the document. The press release says Castor "will reconsider this decision should the need arise". Whether that reserved charging discretion (and so made the decision conditional) is the question on which "unconditional" turns. The Atlas's own Cold Call calls it "a central dispute".
Counterexample: a student who takes the map sentence as fact skips the issue on which the dissent's reading of the release rested.
Pinpoint: supp. 126.
Replacement: "The reproduced press release says the District Attorney "will reconsider this decision should the need arise"; whether that reserved charging discretion or referred only to public comment was disputed."

**E12. Cosby, Cold Call plain-English sentence at 4.2.**
Current: "An \"unconsummated\" offer, one not yet accepted or acted on, ordinarily need not be honored."
Verdict: OVERSTATED (internally inconsistent). The very next sentence says that detrimental reliance can change the result, but "acted on" defines reliance cases out of the category. A reader cannot tell when reliance matters.
Pinpoint: not in the assigned excerpt (Atlas brief, Cold Call episode 5); the excerpt's own contrast between plea promises and unilateral discretion is at supp. 128.
Replacement: "An \"unconsummated\" offer, such as a plea deal never carried out, ordinarily need not be honored."

**E13. Klein, Effective brief CT-SUP-0108 Material Facts; Map entry sections.Material Facts; Cold Call episode-1 paragraph 2 and its plain-English sentence at 0.1.**
Current: brief: "referring to a satisfactory factory inspection and a definitive contract"; map: "Earlier messages referred to a satisfactory inspection and definitive contract"; Cold Call and ≈: "referring to satisfactory factory inspection and a definitive contract" and "The message referred to a satisfactory factory inspection and a \"definitive contract,\" a final written agreement."
Verdict: MISSING CONDITION. The telex said the offer was "subject to" the inspection and the definitive contract. That conditional wording is the basis of PepsiCo's no-contract argument and of the inspection-condition issue. "Referring to" turns two express conditions into mentions.
Counterexample: a student asked why PepsiCo argued it could walk away before signing cannot answer from the Atlas text. The reason is that the offer itself made a definitive contract a stated condition (supp. 109–110).
Pinpoint: supp. 109.
Replacement: substitute "stating that the offer was subject to a factory inspection satisfactory to the purchaser and to a definitive contract" in the brief and the Cold Call. In the map, use "The offer telex was subject to a satisfactory factory inspection and a definitive contract." For the ≈: "The message said the offer was \"subject to\" a factory inspection satisfactory to the buyer and to a \"definitive contract,\" a final written agreement."

**E14. Klein, Cold Call plain-English sentence at 4.0.**
Current: "Alternatively, PepsiCo's refusal to \"tender,\" or offer delivery of, the jet excused that condition."
Verdict: OVERSTATED (low). Standing alone, the sentence states the district court's alternative ground as a fact. The Fourth Circuit rested on the repair finding and did not adopt it.
Pinpoint: supp. 111.
Replacement: "Alternatively, the district court ruled that PepsiCo's refusal to \"tender,\" or offer delivery of, the jet excused that condition; the appeals court did not need that ground."

**E15. Rules and authorities links (tools/v25/authorities.json, byNode and entry links).**
Current: Cosby is linked to `const-amend-1` (First Amendment) with the basis "Explicit citation in atlas entry"; Klein to `restatement-21`; Walgreen to nothing; `restatement-357`, `-359`, `-360`, `-364`, `-366` and `-367` have `"links": []`; `restatement-90` is not linked to Cosby.
Verdict: WRONG CITATION. Nothing in the Cosby material concerns the First Amendment. The link most likely comes from "Article I, Section 9" of the Pennsylvania Constitution (supp. 128) being read as Amendment I. Klein's formation issue (whether the parties meant to be bound before a definitive written contract) is the subject of § 27 (Existence of Contract Where Written Memorial Is Contemplated), not § 21 (intention that a promise affect legal relations). The assigned remedies sections reach no case.
Pinpoint: supp. 109–111, 128; Restatement §§ 21, 27, 357–367.
Replacement: remove const-amend-1 from Cosby and add restatement-90; replace restatement-21 with restatement-27 for Klein, or keep both; link §§ 357, 359, 360 to Klein and Walgreen, § 357(2) to Walgreen, and § 367 to notes-personal-service.

### Lower-severity wording

**E16. Walgreen, Map entry sections.Material Facts ("within a few hundred feet"), Effective brief Material Facts and Cold Call episode-1 ("only a few hundred feet apart").** The casebook's bracket says the entrance was to be "within a couple of hundred feet of Walgreen's" (C&M 948). Replacement: "within a couple of hundred feet". The full opinion was not checked.

**E17. Cosby, Map entry sections.Material Facts.** Current: "The records were later unsealed, and a subsequent prosecution used the changed circumstances." Verdict: the sentence is too vague to state a fact. Replacement: "After the records were unsealed in 2015, the Commonwealth charged Cosby with three counts of aggravated indecent assault." (supp. 127)

### Not errors, recorded for the lead

- Cosby brief rule and chronology 608 add "for the purpose of inducing reliance" and "reasonably relies". The holding as stated in the assigned excerpt (supp. 127) has only "unconditional promise" and reliance "to the detriment of his constitutional right not to testify". The added conditions are not in the assigned excerpt; they may come from the full opinion's application, which this audit did not read.
- Cosby map notes: "barred any retrial" and "bait-and-switch" are not in the assigned excerpt. The notes call the $3.38 million settlement part of "the omitted disposition", but the settlement figure is in the excerpt (supp. 127).
- Klein map Material Facts: "an inspection at the manufacturer’s facility". The excerpt says Savannah and a "factory inspection" (supp. 109), but not that Savannah was the manufacturer's facility.
- Walgreen: the excerpt is edited. The 1951 and 1971 dates, Phar-Mor as a party, the antitrust objection, the discovery dispute, the snow-removal contrast, the reserved presumption question and Judge Wood's concurrence are not in the assigned excerpt.

### Lecture-notes record (no deck located)

- L1. Topic 2: "The CISG discussion adds Article 28’s forum-law qualification." This is UNSUPPORTED BY ASSIGNED SOURCES: CISG Article 28 appears nowhere in the class 22 pages, and the deck was not located. Keep it, flagged unverified until the deck is found.
- L2. Topic 5: "With specific performance and costless resale or renegotiation at the stated prices, the original buyer receives $600 in surplus and the seller receives $300." The resale figures are correct ($1,200 − $600 = $600; $600 − $300 = $300; C&M 35–36). Under renegotiation, however, the split is not fixed. Proposed sentence to add after it: "Legal qualification: if the parties renegotiate instead, any release payment between $400 and $600 leaves both no worse off than performance, and where the price lands depends on bargaining (C&M 35–36; compare Walgreen's bargaining range, C&M 949)." This matches K-35 f. The record also says "three arrangements" but describes two; that can be checked only against the deck.
- L3. Topic 7: "The remedy enforced the assurance by barring retrial." Not in the assigned excerpt (supp. ends at 128); it is consistent with the Atlas brief.

### K-30: for Astra

- **K-30: for Astra (KA1). Node f, edge "Breach alone, no special remedy" → e ("Recognize breach with nominal relief").** CHANGES RESULT. A claimant who asks for the breacher's gains but has also proved loss is routed to nominal damages. Facts entered: Kansas v. Nebraska, where Kansas proved $3.7 million in losses and sought Nebraska's larger gains. Path: a → "Defendant’s gains or punishment" → f → if the student finds no separate authority, "Breach alone, no special remedy" → e, which displays nominal relief. Source-supported result: compensation for the proved $3.7 million at least (C&M 39–40). Replacement: send that edge to b ("Compute expectation"), or add a second edge "Proved loss, no special remedy" → b.
- **K-30: for Astra (KA2). Node f, detail and sources.** MISSING CONDITION. The node gives no example of an authorized gain-based award. C&M 40 and 42 describe the partial disgorgement in Kansas v. Nebraska ($1.8 million on top of $3.7 million for a breach that was knowing but not deliberate, in an interstate compact). C&M 43 quotes Restatement (Third) of Restitution § 39 on "opportunistic breach". Proposed addition: "Kansas v. Nebraska approved $1.8 million partial disgorgement on top of $3.7 million compensation for a knowing breach of an interstate compact; Restatement (Third) of Restitution § 39 allows restitution for a profitable, opportunistic breach where damages give inadequate protection (C&M 40–43)."

## (c) Teaching gaps (assigned material no surface teaches)

**G1. The injunction and specific performance distinction (§ 357(2)) and relief against a threatened breach (§ 357(1)).** Home: specific-performance concept, `notes` (and link restatement-357 to Walgreen). Draft: "An injunction forbids conduct that breaks the contract; specific performance orders the promised act. Restatement § 357(2) allows an injunction where the duty is one of forbearance, or where specific performance of a duty to act would be refused only for reasons that do not apply to an injunction. Either can issue against a party threatening breach, as Sara Creek was when Walgreen sued."

**G2. The § 360 factors, especially collectability.** Home: K-34 node a, detail (append). Draft: "Restatement § 360 lists three significant circumstances: difficulty of proving damages with reasonable certainty, difficulty of buying a substitute with the damages, and the likelihood that a damages award could not be collected."

**G3. Certainty and fairness bars (§§ 362, 364).** Home: K-34 node i (E1) and Timeline 'specific-relief' `now`, appended: "Courts also refuse orders whose terms are too uncertain or whose enforcement would be unfair (Restatement §§ 362, 364)."

**G4. Supervision and construction contracts (Bliss, Floyd, De Rivafinoli).** Home: K-34 node j (E5); reading-notes-22, `notes`, new paragraph. Draft: "The notes at C&M 946–947 show the supervision limit. Equity would not order an opera singer to perform (De Rivafinoli) or a contractor to staff a second shift (Bliss), because a court could not frame or police the order; construction tied to a conveyance of the defendant's land is more readily ordered." Link the Bliss brief (CT-ADDITIONAL-CM-B3-102) to the class-22 hub.

**G5. Contracted-for specific performance and delay damages (Snow Phipps notes 1–2).** Home: specific-performance concept, `notes`; K-34 node a, detail. Draft: "Courts may also order performance when the parties' agreement clearly provides for it, as merger agreements now commonly do (Snow Phipps, C&M 945). Because an order seldom produces performance on the contract date, damages for the delay usually accompany it (C&M 946)." Link the Snow Phipps (CT-NEXT-CM-0141), Twitter and Osborn briefs to the class-22 hub.

**G6. The presumption of money relief, the compensatory aim of specific relief, and the law-equity history.** Home: specific-performance concept, `learning.explanation` (append). Draft: "American law presumes money relief. Specific relief is a substitute used when damages are inadequate, and its main aim is still compensation, not compulsion; equity's adequacy test arose from its historical deference to the common-law courts (C&M 929)."

**G7. Land and output contracts as the traditional and modern categories.** Home: K-34 node b (E3); Timeline 'specific-relief', an added step for Campbell Soup v. Wentz (1948) if that case is mapped. Draft step note: "Campbell Soup (3d Cir. 1948) treats a grower's contract for scarce Chantenay carrots as appropriate for specific performance, an instance of the modern willingness to enforce output contracts (C&M 930)." The body of Campbell Soup (931 onward) is outside this assignment; the draft relies only on the editors' framing at 930. A full-opinion check would be needed before stating its result.

**G8. UCC § 2–716 comment 2 and replevin.** Home: Klein map entry, `learning.topics.ucc`. Draft: "Under § 2–716 comment 2, inability to cover is strong evidence of 'other proper circumstances'; Klein shows the converse: a buyer who could cover but chose not to because prices rose had not shown it. Section 2–716(3) separately gives replevin of identified goods when cover is unavailable."

**G9. Economics of remedies, C&M 36–43 (reliance investment, Coase, Kansas v. Nebraska, willful and opportunistic breach).** Home: efficient-breach concept, `notes`. Replace the sentence "The later pages of this economic discussion are not assigned until a later unit." with: "Class 22 assigns the rest (C&M 36–43). Strong remedies such as specific performance can cause overinvestment in reliance, and weak ones underinvestment. The Coase Theorem says that with low bargaining costs and clear entitlements parties reach an efficient allocation under any remedy. In Kansas v. Nebraska the Court denied an injunction and added $1.8 million partial disgorgement to $3.7 million in compensation." Also link the Kansas v. Nebraska brief (CT-ADDITIONAL-CM-B1-005) to the class-22 hub and to K-35 f.

**G10. French contrast details.** Home: french-specific-performance, `notes` (append). Draft: "French specific enforcement is available as of right: the price of a monetary obligation can be claimed in preference to damages, subject only to a court's power to defer payment up to two years (délai de grâce); sale of goods is enforced whether or not the goods are unique; there is no duty to mitigate. The astreinte is an openly punitive, uninsurable daily penalty. Its rationale is the binding force of contract, whereas C&M 929 says American specific relief aims at compensation." Pinpoint: supp. 115–117, 121–122; C&M 929.

**G11. Why Cosby is reliance, not bargain.** Home: Cosby map entry, `sections.Reasoning` (insert after the first sentence); `reliance` timeline step 10 context is already correct. Draft: "Castor insisted there was no agreement or quid pro quo, and the court accepted that the decision was unilateral, so bargain theory was unavailable; the court said such discretion is not enforceable like a bargained-for exchange (supp. 127–128)." Link restatement-90 (E15). Also K-06 node c, detail (append): "Cosby (Pa. 2021) borrowed these elements to inform due process and enforced an unconditional nonprosecution promise; it is not an ordinary § 90 case."

**G12. Cosby's remedy as specific enforcement.** Home: reading-notes-22, `notes`, Cosby paragraph (append). Draft: "Tie Cosby to this class's subject: the court enforced the promise itself, holding the Commonwealth to non-prosecution, because Cosby's surrendered privilege could not be restored or priced (supp. 127; the specific disposition is outside the excerpt)."

**G13. Arbitral specific performance.** Home: reading-notes-22, `notes`. Draft: "An arbitrator may award specific performance that a court would refuse; New York enforced such an award (Grayson-Robinson Stores, C&M 947)."

## (d) Challenger tests of the highest-risk statements

### Every ≈ plain-English sentence

| Case, at | Verdict | Note and pinpoint |
|---|---|---|
| Klein 0.1 | MISSING CONDITION | "referred to" loses "subject to" (E13; supp. 109) |
| Klein 2.1 | SUPPORTED | withdrawal versus earlier binding (supp. 109–111) |
| Klein 3.0 | SUPPORTED | supp. 108, 111 |
| Klein 3.1 (clear error) | SUPPORTED | "virtually never clearly erroneous" when credibility-based and corroborated (supp. 110) |
| Klein 3.1 (memorial) | SUPPORTED | intent to memorialize not necessarily a condition (supp. 111) |
| Klein 3.1 (firm conviction) | SUPPORTED | Anderson (supp. 111) |
| Klein 3.2 | SUPPORTED | Reprosystem and Skycom argument; clear-error disposition (supp. 110–111) |
| Klein 4.0 | OVERSTATED (low) | alternative ground stated as fact (E14; supp. 111) |
| Klein 4.1 | SUPPORTED | footnote 1 (supp. 112) |
| Klein 5.0 (§ 2–716) | SUPPORTED | supp. 111 |
| Klein 5.0 (unique, cover) | SUPPORTED | supp. 111–112 |
| Klein 5.0 (abuse of discretion) | SUPPORTED | supp. 110, 111 |
| Klein 5.2 | SUPPORTED | Hilmor; price increases (supp. 111–112) |
| Klein 6.1 | SUPPORTED | supp. 112 |
| Walgreen 0.2 (injunction) | SUPPORTED, but "found a breach" is not in the assigned excerpt | the bracket says Sara Creek "intended" to lease (C&M 948) |
| Walgreen 0.2 (experts) | SUPPORTED | C&M 948 |
| Walgreen 0.2 (antitrust) | not in the assigned excerpt | — |
| Walgreen 1.0 | SUPPORTED | Sara Creek's cited cases (C&M 948) |
| Walgreen 1.2 (preliminary) | not in the assigned excerpt; consistent with Note 1 | C&M 950 |
| Walgreen 1.2 (permanent) | SUPPORTED in substance; "simply" is safe only because inadequacy itself is judged by the cost comparison | C&M 948–949 |
| Walgreen 2.1 | SUPPORTED | C&M 949 |
| Walgreen 3.0 | SUPPORTED | C&M 950 |
| Walgreen 3.2 | not in the assigned excerpt | — |
| Walgreen 4.0, 4.1 | not in the assigned excerpt | — |
| Cosby 1.0 | SUPPORTED | supp. 124–125 |
| Cosby 1.2 (no formal immunity) | SUPPORTED | supp. 127 ("not reduced to writing", "no formal immunity agreement") |
| Cosby 1.2 (majority examined) | not in the assigned excerpt | — |
| Cosby 2.0 | SUPPORTED | supp. 126 |
| Cosby 3.0 (both) | SUPPORTED in part: no formal agreement and unilateral discretion (supp. 127); the denial of suppression is not in the excerpt | — |
| Cosby 3.1 | not in the assigned excerpt; not a Contracts point | — |
| Cosby 4.0 | SUPPORTED | supp. 127 |
| Cosby 4.1 | SUPPORTED; keeps "unconditional"; "reasonable" is not in the excerpt's statement of the holding | supp. 127 |
| Cosby 4.2 (promissory estoppel) | SUPPORTED | Crouse elements (supp. 128) |
| Cosby 4.2 (unconsummated offer) | OVERSTATED | E12 |
| Cosby 5.1 (Fifth Amendment in civil cases) | SUPPORTED | Castor's testimony (supp. 124–125) |
| Cosby 5.1 (waiver) | not in the assigned excerpt | — |
| Cosby 6.0, 6.1, 7.0 (both) | not in the assigned excerpt | — |

### Rule lines

- Klein CT-SUP-0108: SUPPORTED (supp. 111–112). It states Virginia's holding as a general § 2–716 rule; Restatement § 359(1) supports the same general proposition, so no change is needed.
- Walgreen CT-NEXT-CM-0142: MISSING CONDITION (E7).
- Cosby CT-COMPLETE-FA26-COSBY: SUPPORTED by the excerpt's holding (supp. 127). The extra conditions ("for the purpose of inducing", "reasonably") are not in the assigned excerpt (see "Not errors").

### Takeaways

- Klein: SUPPORTED (supp. 111–112).
- Walgreen: OVERSTATED (E6).
- Cosby: breaks the format rule and omits the doctrine (E10).

### Timeline and chronology

- Specific-relief step 3 (Klein): SUPPORTED.
- Step 4 (Walgreen): MISSING CONDITION (E7).
- The `now` field: MISSING CONDITION for §§ 362 and 364 (G3) and for supervision (G4).
- Reliance step 10 (Cosby): SUPPORTED (already corrected earlier).
- Chronology 354 and 608: SUPPORTED. Chronology 396: E7.

### Chart branches

- K-34 a: E5. K-34 b: E3. K-34 c: E4. K-34 d and e: SUPPORTED against § 367(1)–(2) and C&M 946. K-34 f: E1. K-34 g: SUPPORTED. K-34 h: E2.
- K-35 a–g: arithmetic SUPPORTED against C&M 35–36: $400 surplus and $300 profit on performance; $500 to the seller after breach and damages; damages above $600 remove the breacher's gain; a release price between $400 and $600 works.
- K-30: KA1 and KA2, for Astra.

## (e) Required route test (one decisive fact changed per case)

**R1. Klein v. PepsiCo.** Charts citing it: K-34 (b, g). Natural companion: K-02.
- As decided. K-34: a → "Goods or property" → b → "Substitutes and damages adequate" → g ("Seek an available monetary remedy"). This matches the source: specific performance reversed, remanded for damages (supp. 112). K-02: a → "Domestic regime governs" → c → "Goods sale" → h; Article 2 governs, which is correct.
- Changed fact: no comparable G-II could be found after reasonable effort, and Klein wanted the plane for his own use. K-34: a → b → "Special value or unavailable substitutes" → f. This matches the source: under § 2–716 cmt. 2, inability to cover is strong evidence of other proper circumstances, and Klein turns on cover having been available (supp. 112). The ≈ sentences 5.0 (cover) and 6.1 keep the distinction.
- Second changed fact, for a bar: same as the first change, but the price was grossly inadequate. K-34 still ends at f; § 364(1)(c) says relief "will be refused". The chart fails (E1).
- Third changed fact, for collectability: comparable jets are available, but PepsiCo is insolvent. K-34: b → g; § 360(c) makes uncollectability significant to adequacy. The chart has no input for it (E3).

**R2. Walgreen v. Sara Creek.** Charts citing it: K-34 (c, f).
- As decided. a → "Business restriction" → c → "Equitable balance favors order" → f. This matches the source: affirmed (C&M 950).
- Changed fact: three years left on the lease and a credible comparable-mall study, so damages are moderately uncertain and the injunction's bargaining costs are about equal. The student has no tie instruction at c and may take f; the source withholds the injunction on an even balance (C&M 949). The chart fails (E4). The ≈ sentences do not carry the tie rule. The narrative does (episode 2: "an even balance would require withholding an injunction"), but no ≈ sentence renders it.
- Changed fact: the landlord's promise is affirmative and continuing (to keep a shared facility staffed and operating), not a promise to refrain. No a-branch fits. "Business restriction" → c may give f, while Bliss's supervision reasoning (C&M 947) and § 357(2)'s split between forbearance and action point to refusal. The chart fails (E5).

**R3. Commonwealth v. Cosby.** No flowchart node cites Cosby, although lecture-notes topic 7 lists K-06, K-07 and K-34. Natural chart: K-06.
- As decided. K-06: a → "Induced reliance" → c → "Predicates met" → f ("Grant the relief justice requires", whose detail stresses compensation and D&G Stout). The source enforces the promise itself on a due-process ground informed by promissory estoppel (supp. 127–128). The displayed result ("relief justice requires") is compatible, but the detail points to money and never mentions the due-process ground (G11).
- Changed fact: Castor's announcement expressly reserves the right to charge if new evidence appears, and Cosby testifies anyway. K-06 c → "Predicates met" → f, because § 90 does not require an unconditional promise. Under the excerpt's holding, the promise must be "unconditional", and discretion is "not per se enforceable" (supp. 127–128), so the Cosby rule yields no enforcement. The chart reaches the wrong result for this source. A K-06 c detail sentence is proposed in G11. The Cosby ≈ sentence 4.1 keeps "unconditional"; the map's `learning.topics.reliance` does not (E9).
- Changed fact: no reliance (Cosby invokes the Fifth Amendment at each deposition). K-06 c → "No reliance theory proven" → h, which matches the source.
- K-07 a has no edge for reliance that consists of surrendering a legal right (its branches are retirement, at-will business, charitable commitment, confidential disclosure). That is a gap, not a misroute.

**R4. French reading (cited by K-34 h).**
- Facts: a buyer of goods sues, and identical goods are readily available. a → "French comparison" → h. The display does not import adequacy, which is correct (supp. 116–117).
- Changed fact: the contract is for a commissioned painting. h lists only impossibility and disproportion, so a student orders performance. The source refuses (supp. 118). The chart fails (E2).
- Changed fact: the builder's departure from the specification was deliberate and in bad faith. h's disproportion exception appears available, but the 2018 text confines it to a good-faith debtor (supp. 114, 120). The chart fails (E2).
