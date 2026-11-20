# OP-CT-25 comparison: Contracts class 25, Stipulated remedies

Sources checked: C&M printed 1043–1064 (`ct25-casebook.txt`; printed 1054 and 1062 read from page images of `added-sources/C&M Textbook 1051-1313.pdf`, PDF pages 47 and 55, because their OCR lost the left half of each line); supplement 129–138 (`ct25-supp.txt`); Restatement (Second) § 356 with comments a–e and Illus. 1–6, UCC §§ 2-718, 2-719 with Official Comments 1–3, and § 2-715 for the incidental/consequential definitions (`sel.txt`). No slide deck and no lecture-notes record exist for this class, so no lecture note is reviewed and nothing is checked against the professor's presentation. Read-only repository files used for the route test and gaps: `tools/flowcharts/data/contracts.json` (K-23, K-25, K-30, K-32, K-33), `tools/r19/data/timelines.json` (liquidated-damages), `tools/v25/authorities.json` (restatement-356, ucc-2-718, ucc-2-719), and the seed nodes `stipulated-remedies`, `swiss-1988-penalty`, `reading-notes-25`, `contracts-class-25`. Prior corrections (timeline title, question, guide, now, and effect fields for `trade-usage` and `liquidated-damages`) were reviewed; the corrected texts are accurate and are not re-reported.

Several Atlas facts come from the full opinions and are absent from the edited excerpts. They are marked "not in the assigned excerpt" and are not treated as errors: Gustafson's interrogatory answer, the Fitzgerald overruling, and the statutory discussion; Figgie's footnotes 1–2 (latent defects; new repair contracts) and the waiver/modification holding; Lake River's conversion and counterclaim analysis, the escrow ruling, and the take-or-pay cost rationale; Wasserman's public-bidding holding (summarized in a bracket at C&M 1057).

## (a) Coverage

| Assigned item | Atlas surfaces | Coverage |
|---|---|---|
| Section 4 introduction (C&M 1043) and punitive-damages lead-in (1064) | `stipulated-remedies` node; rules entry restatement-355 | Adequate. |
| Figgie, remedy-limitation holding (1043–1046) | Map, brief CT-CB-0593, takeaway, Cold Call, timeline `trade-usage` step 5, chronology 481, K-23 nodes e and f, rules entry ucc-2-719 | Holding accurate. No flowchart routes a limitation-of-remedy clause through § 2-719 (E1, G1). Notes 1–3 on incidental versus consequential exclusions and consumer versus commercial buyers are mentioned only in the map notes (G2). |
| Gustafson (1047–1048) and Problems 1–2 (1049) | Map, brief CT-NEXT-CM-0161, takeaway, Cold Call, timeline step 0, chronology 193, K-33 nodes b and f | Holding accurate. Problem 1 appears only in the map notes and no chart branch handles it (E2, G4). Problem 2 is untaught (G6). |
| Elliott completion-assessment passage (1046–1047) | Gustafson Cold Call episode 4 ("Encouraging timely performance did not by itself make a compensatory schedule punitive") | Partial. |
| Lake River (1049–1054) | Map, brief CT-NEXT-CM-0162, takeaway, Cold Call, timeline step 1, chronology 321, K-33 nodes c and g | Strong on saved costs, the breach-stage arithmetic, mitigation, Posner's critique, and the remand. The "invariant to the gravity of the breach" rationale is missing (G7). |
| Notes 1–4 after Lake River (1054–1056) | Lake River map and Cold Call mention take-or-pay | Take-or-pay is explained with a reason absent from the assigned pages (E11). Cal. Civ. Code § 1671, the Cellphone Termination Fee Cases, and Dodd-Frank are untaught (G7, G11). |
| Wasserman's (1056–1062) | Map, brief CT-NEXT-CM-0163, takeaway, Cold Call, timeline step 2, chronology 422, K-33 nodes b, c, d | Holding, presumption, burden, and remand factors are accurate in the text surfaces. K-33 misplaces the burden (E4). |
| Notes 1–4 after Wasserman's (1062–1063) and Problems 1–3 (1063–1064) | Map reasoning mentions formation-or-breach timing in general terms | Second look versus single look (Kelly v. Marx; § 2A-504(1)), the subterfuge note, the arbitration note, and the three problems are untaught (G3, G6, G13, G15). |
| Restatement § 356 and comments | Rules entry restatement-356 (black letter only, `links: []`) | The sliding scale, Illus. 4 (no loss at all means a penalty), disguised penalties, unreasonably small sums, and bonds are untaught (G4, G6, G8, G10). |
| UCC § 2-718 | Rules entry ucc-2-718 (black letter only, `links: []`) | The third factor and the deposit-restitution rule are untaught (G5, G16). |
| UCC § 2-719 and comments | Rules entry ucc-2-719 (black letter, linked to Figgie); Figgie brief and Cold Call | Black letter is correct. Comments 1–3 (minimum adequate remedy, presumption that remedies are cumulative, risk allocation) appear only indirectly (G1). |
| Swiss 1988 decision (supp. 129–130) | `swiss-1988-penalty` node (generic summary, no sections); K-33 node e source | Its distinct rules are untaught: maximum possible damage, not actual damage, as the measure of excess; timing after breach; the debtor's burden; weaker parties (G9). |
| Swiss 2024 decision (supp. 130–138) | Map, takeaway, Cold Call, timeline step 3, chronology 625, K-33 node e | Accurate and well qualified. The takeaway has a format defect and an imprecise amount (E9), one attribution slips (E10), and the chart node has no outcome for a penalty that is not excessive (E5). |

## (b) Errors in existing text

Ordered by effect on an exam answer.

**E1. Flowcharts K-33 and K-32: a limitation-of-remedy clause has no route, and K-32 awards losses the contract excludes.**
- Surface: Flowchart K-33 node a (edges "Assigned U.S. approach" → b, "Swiss comparison" → e); Flowchart K-32 nodes a → b → d → e → g. The only chart citing Figgie is K-23 (interpretation).
- Facts entered (Figgie): an exclusive remedy of repair, replacement, or return and refund supplied by trade usage; an exclusion of consequential, incidental, and delay damages; repairs fail; the seller takes the machine back and refunds the price; the buyer claims lost production and delay losses.
- K-33 path: a → "Assigned U.S. approach" → b "Was loss hard to measure and reasonably estimated?" Every exit from b applies the liquidated-damages reasonableness test, which has nothing to say about an agreed repair-or-refund remedy. The displayed result is "Enforce the agreed damages amount" (f), "Disallow the penalty" (g), or "Develop the reasonableness record" (d).
- K-32 path (the chart a student opens for the buyer's lost production): a "What is the provisional damages calculation?" → "Test avoidability" → b → "No shown reasonable substitute" → d "Were the consequences foreseeable at formation?" → "Foreseeable under governing rule" → e → "Sufficient evidence" → g "Award the proved net amount." On Figgie's own facts this awards the consequential losses the court barred.
- Source-supported result: under § 2-719(1)(b) the expressly exclusive remedy is the sole remedy. Because the return-and-refund alternative was carried out, the remedy did not fail of its essential purpose under § 2-719(2), and the buyer recovers nothing further (C&M 1045–1046). The consequential-damages exclusion is tested only for unconscionability under § 2-719(3), and a commercial loss is not prima facie unconscionable.
- Verdict: CHANGES RESULT (missing branch). Proposed nodes: G1.

**E2. Flowchart K-33 node b: no exit for "no loss occurred" or "loss easy to measure."**
- Current text (detail): "Apply the relevant regime’s treatment of anticipated or actual loss and the difficulty of proving it." Edges: "Reasonable estimate established" → f; "Formula appears excessive or unusual" → c; "Record insufficient" → d.
- Facts entered (Gustafson Problem 1, C&M 1049): the same graduated $210-a-day clause, but another contractor's bridge was also closed for the 67 days, so the highway could not have been used even if finished on time.
- Path: a → "Assigned U.S. approach" → b → "Reasonable estimate established" (the schedule was reasonable when made) → f "Enforce the agreed damages amount." The displayed result is enforcement of $14,070.
- Source-supported result: the answer depends on the regime, and the chart should say so. Under Restatement § 356(1) ("anticipated or actual loss") and cmt. b, "if ... it is clear that no loss at all has occurred, a provision fixing a substantial sum as damages is unenforceable" (Illus. 4, the race track that could not open anyway). Wasserman's "second look" also lets actual damages show that the parties' forecast was unreasonable (C&M 1060). A single-look court such as Kelly v. Marx (C&M 1062) would enforce. The editors cite the split (Massman against Sun Ship and Southwest Engineering, C&M 1049). The same node also cannot reach a penalty when damages were easy to measure at formation. That is a required element in South Dakota's formulation ("incapable or very difficult of accurate estimation," C&M 1047) and in Illinois ("If damages would be easy to determine then ... it is a penalty," C&M 1052). New Jersey, by contrast, treats difficulty only as a factor (C&M 1059).
- Verdict: CHANGES RESULT.
- Minimal replacement (detail): "Dave Gustafson upheld graduated highway-delay charges as a reasonable estimate of hard-to-measure loss. South Dakota (Gustafson) and Illinois (Lake River) require that loss be difficult to estimate; Restatement § 356 cmt. b and New Jersey (Wasserman’s) treat difficulty as a factor, and under § 356 a substantial sum is a penalty if it is clear the breach caused no loss (Illus. 4)." Add edges: "Loss easy to measure, where difficulty is required" → g; "Clearly no loss at all, under a regime that looks at actual loss" → g.

**E3. Gustafson takeaway: a South Dakota rule stated without its jurisdiction.**
- Surface: Takeaway (tools/r19/data/takeaways.json), dave-gustafson.
- Current text: "Actual loss became irrelevant once the clause was valid."
- Verdict: MISSING CONDITION, which changes the result under the Restatement. The proposition is not in the assigned excerpt (C&M 1047–1048 never discusses actual loss). It comes from the full opinion's account of South Dakota's statutes, which the brief and Cold Call correctly attribute to those statutes. Stated generally, it answers Gustafson Problem 1 and the Yockey problem (C&M 1063–1064) wrongly under § 356 cmt. b and Illus. 4 and under Wasserman's second look (C&M 1060).
- Counterexample: a firm that suffered no harm from an associate's blog (Yockey) sues on a $50,000 clause. A student relying on the takeaway enforces it. Under § 356 Illus. 4 a substantial sum is unenforceable where no loss at all occurred.
- Minimal replacement (two sentences, 56 words): "A per-day charge for finishing a highway late was enforceable because delay damages were genuinely hard to measure and the graduated amounts were a fair estimate when the contract was made. Under South Dakota’s statutes a valid clause replaced proof of actual loss, but Restatement § 356 also tests the sum against actual loss (cmt. b)."

**E4. Flowchart K-33 node c (and terminal node d): the New Jersey burden is reversed in effect and never resolves.**
- Current text (node c detail): "Wasserman’s gross-receipts provision needed evidence of reasonableness under New Jersey’s rule for a commercial clause." Node d has no edges.
- Facts entered (Wasserman's, changed fact): on remand the Township, as challenger, offers only the tax returns. The trial court finds the record inconclusive on whether 25% of gross receipts approximated the tenants' loss.
- Path: a → b → "Formula appears excessive or unusual" → c → "Evidence inconclusive" → d "Develop the reasonableness record." The chart stops there and gives no result. Its wording ("needed evidence of reasonableness") tells the student that the tenant, as proponent, must prove reasonableness.
- Source-supported result: a commercial clause between parties of comparable bargaining power is presumptively reasonable; "the burden of production and of persuasion rests on the Township" (C&M 1060–1062). If the challenger fails to carry that burden, the clause is enforced. The presumption does not extend to consumer contracts, which the court reserved (C&M 1060).
- Verdict: MISSING CONDITION, which changes the result.
- Minimal replacement (node c detail, second sentence): "Wasserman’s remanded its gross-receipts provision for findings; because New Jersey presumes a commercial clause between parties of comparable bargaining power reasonable, the Township as challenger bore the burdens of production and persuasion." Add edges to node d: "Challenger proves the clause unreasonable" → g; "Challenger fails to carry its burden (New Jersey commercial presumption)" → f.

**E5. Flowchart K-33 node e: the Swiss branch is a dead end with only one outcome.**
- Current text (detail): "In the 2024 excerpt a minor breach and no demonstrated damage or risk supported CHF 10,000, even though sophistication and lack of loss did not require full enforcement or zero." The node has no edges.
- Facts entered (changed fact): the same clause, but the defendant sends promotional letters repeatedly and the creditor substantiates a real risk of losing candidates. Or the debtor never argues that the penalty is excessive.
- Path: a → "Swiss comparison" → e. The displayed text describes a reduction to CHF 10,000 in every case.
- Source-supported result: Swiss courts must show restraint and reduce only where the amount is grossly disproportionate to the creditor's interest in full enforcement at the time of breach. The debtor must assert and prove the grounds for reduction (supp. 129–130). The penalty is due without any damage (Art. 161(1), supp. 130). On these changed facts the full CHF 100,000 per violation can stand, and absent a request the court does not reduce (supp. 136, party disposition).
- Verdict: CHANGES RESULT (no outcome for the no-reduction case).
- Minimal replacement: keep the detail, but correct the garbled final clause to "even though business experience did not bar reduction and lack of loss did not require reducing the penalty to zero". Add edges: "Debtor raises and proves gross disproportion to the creditor’s interest at breach" → new terminal "Reduce in the court’s discretion; the reduced sum may keep a punitive function"; "Gross disproportion not shown or not raised" → new terminal "Enforce the agreed penalty; it is due even without damage (Art. 161(1) OR)."

**E6. Figgie Cold Call plain-English sentence 1.0: incidental damages are folded into consequential damages.**
- Current text: "It said they also excluded consequential, incidental, \"contingent,\" and delay damages, meaning money for losses flowing from a defect, such as lost production."
- Verdict: MISSING CONDITION. Note 1 after Figgie (C&M 1046) asks whether the enforceability standard for excluding incidental damages is the same as for consequential damages, which § 2-719(3) alone addresses. The ≈ sentence defines all four categories as lost-production-type losses and so erases the distinction. Under § 2-715(1), incidental damages are the buyer's expenses of inspecting, transporting, and caring for rejected goods and of effecting cover. Lost production is consequential under § 2-715(2)(a).
- Counterexample: a buyer who paid to ship back and store rejected equipment reads the exclusion as reaching only "losses flowing from a defect, such as lost production." The student misses that the shipping and storage costs are incidental damages, which the clause also excluded and which § 2-719(3)'s unconscionability standard does not expressly cover.
- Minimal replacement: "It said they also excluded \"consequential\" damages (losses the defect caused in the buyer's business, such as lost production), \"incidental\" damages (the buyer's expenses of handling the defective goods, such as inspection, shipping, and storage), and \"contingent\" and delay damages."

**E7. Figgie brief rule line and chronology 481: the decisive fact (refund actually made) is left implicit.**
- Current text (Effective brief CT-CB-0593: rule; Chronology 'course-chronology-0' step 481 note): "a limited remedy that includes return and refund does not fail of its essential purpose merely because repair attempts were unsuccessful."
- Verdict: MISSING CONDITION (moderate). The court relied on the fact that "the equipment was returned and the purchase price refunded" and found no evidence that the return-and-refund remedy, "once invoked, failed of its essential purpose" (C&M 1045). The clause made refund available "at seller's option" (C&M 1044). A student could read the rule to cover a seller who offers repair, fails, and then refuses to refund. The source's reasoning would not support enforcing the limitation in that case, because the buyer would be left without the substantial value of the bargain (cmt. 1).
- Minimal replacement (48 words): "Under the UCC, a trade usage may supply an exclusive limitation of remedies as part of the parties' agreement, and a limited remedy that includes return and refund does not fail of its essential purpose merely because repair attempts failed, where the return and refund were carried out." Apply the same change to the chronology note.

**E8. Lake River Cold Call plain-English sentence 2.0: "efficient breach" is defined too broadly.**
- Current text: "But they could also discourage \"efficient\" breaches, meaning breaches that leave everyone better off economically."
- Verdict: OVERSTATED. Posner's example: after full compensation the promisee "would be no worse off than if the contract had been performed, while the promisor would be better off by $8,000" (C&M 1051). The victim is not made better off. The difference matters for the comparison with a penalty, which gives the victim more than it would have received from performance.
- Minimal replacement: "But they could also discourage \"efficient\" breaches: breaches that leave the breaching party better off while the victim, once fully compensated, is no worse off than if the contract had been performed."

**E9. Swiss takeaway: three sentences, and an imprecise penalty amount.**
- Current text: "In this Swiss decision, a CHF 100,000 contractual penalty was reduced to CHF 10,000 for a minor, nonrecurring breach without demonstrated harm."
- Verdict: OVERSTATED, and the takeaway exceeds the two-sentence limit. Clause 5.3 set CHF 100,000 "for each individual instance of a breach" (supp. 131). The courts found more than one violation in the letter (supp. 132–133), and the defendant's counter-figure was "CHF 500 per violation—i.e., CHF 1,000" (supp. 137–138).
- Minimal replacement (two sentences, 59 words): "In this Swiss decision, a penalty of CHF 100,000 per violation was reduced to CHF 10,000 for a minor, single-occasion breach without demonstrated harm; business experience did not bar reduction, and lack of damage did not require eliminating the penalty. Swiss law reduces an excessive penalty, whereas the U.S. cases refuse to enforce a penalty and award ordinary damages."

**E10. Swiss 2024 map entry Reasoning and Cold Call episode 7: a 1988 rule attributed to the 2024 analysis.**
- Current text (Map entry: sections.Reasoning, swiss-2024): "The debtor generally must raise and prove the basis for reduction." The Cold Call episode-7 paragraph 2 has the same attribution: "The debtor generally had to raise and establish a basis for reduction."
- Verdict: OVERSTATED (attribution). The statement that the debtor "must assert and prove the conditions for a reduction" appears in the 1988 decision (BGE 114 II 264, supp. 130, lines before "For a much more recent case"). The 2024 excerpt says only that the defendant undisputedly argued excessiveness, and it places a duty of substantiation on the creditor to answer the debtor's showing of no harm (supp. 134, 136). The map notes themselves warn against mixing the two decisions.
- Minimal replacement (map): "The 1988 decision that opens the supplement places on the debtor the burden of raising and proving the basis for reduction; in 2024 the defendant had argued excessiveness, and the creditor then had to substantiate, at least broadly, damage or a risk of damage." Cold Call: prefix "As the 1988 decision states, " to the sentence.

**E11. Lake River take-or-pay and alternative-performance statements are attributed beyond the assigned pages.**
- Current text: Lake River Cold Call plain 2.2: "because nearly all the seller's costs came before delivery"; brief Reasoning: "where nearly all supplier costs are incurred before delivery"; Map entry: sections.Reasoning: "The court also distinguished real alternative performances".
- Verdict: UNSUPPORTED BY ASSIGNED SOURCES (not in the assigned excerpt). The assigned pages give only Posner's disclaimer ("we do not mean by this discussion to cast a cloud of doubt over the 'take or pay' clauses") and then a different court's reason: Prenalta (10th Cir. 1991) distinguished the "pay" provision because "one of the alternative performances in a take-or-pay contract is the payment of money" (C&M 1055, Note 2). The cost-timing reason may be accurate to the full opinion, but the reason the casebook teaches is alternative performance, and it belongs to Prenalta.
- Minimal replacement (map Reasoning sentence): "Posner disclaimed casting doubt on natural-gas take-or-pay clauses; in the casebook's Note 2, Prenalta explains such clauses as alternative performances rather than liquidated damages." In the plain sentence, append: "(The casebook's note quotes another court treating the 'pay' option as an alternative performance.)"

**E12. Gustafson Cold Call plain-English sentence 3.1: the judge's title is wrong.**
- Current text: "Justice Hanson called that earlier discussion unnecessary"
- Verdict: WRONG CITATION (judge's title; minor). The casebook prints "HANSON, PRESIDING JUDGE" (C&M 1047). The brief and narrative say "Presiding Judge Hanson."
- Minimal replacement: "Presiding Judge Hanson called that earlier discussion unnecessary".

**E13. Wasserman's Cold Call plain-English sentence 2.2: formation timing added.**
- Current text: "How hard it was to estimate \"damages\" when signing was part of judging reasonableness, not a mechanically separate test."
- Verdict: OVERSTATED (minor). Wasserman's treats difficulty as an element of reasonableness and assesses reasonableness "either at the time of contract formation or at the time of the breach" (C&M 1059–1060). "When signing" narrows the court's approach to the single look it declined to adopt.
- Minimal replacement: "How hard it was to estimate \"damages\" was part of judging reasonableness, not a mechanically separate test."

Statements checked and SUPPORTED, recorded so they need no further review: Figgie map Holding and summary; Figgie Cold Call plain 3.0 ("must give way if circumstances leave the buyer without the substantial value of its bargain"; § 2-719 cmt. 1, C&M 1045); Gustafson brief rule and timeline step 0 (C&M 1047–1048); Lake River map Holding, brief rule, takeaway, and Cold Call arithmetic ($444,000; $260,000; $141,000; C&M 1052–1053); Lake River remedy on remand (C&M 1054, image); Wasserman's brief rule, takeaway, timeline step 2, and remand factors (C&M 1060–1062); Swiss map Holding, timeline step 3, and Cold Call plain 6.2 ("A penalty could become payable even without compensable damage"; supp. 130, 137); K-33 node g ("the underlying bargain may remain enforceable"; § 356 cmt. a, Illus. 1; C&M 1054). The Wasserman's map Material Facts phrase "a valuable below-market lease" comes from the editors' Note 1 (C&M 1062), not from the court. It is phrased as a possibility and does not need changing.

## (c) Teaching gaps (assigned material no surface teaches)

**G1. The § 2-719 route: exclusivity, failure of essential purpose, and consequential exclusions.**
- Home: new K-33 branch, from node a, edge "Clause limits or replaces remedies (repair, replacement, refund; damages exclusion)" → new node h → new node j; plus a K-32 node between d and e.
- Draft node h label: "Is the limited remedy exclusive, and does it still give the buyer a fair remedy?"
- Draft node h detail: "Under UCC § 2-719(1)(b) an agreed remedy is optional unless expressly agreed to be exclusive; comment 2 presumes remedies cumulative. In Figgie, unrebutted trade usage supplied the exclusivity. If circumstances cause an exclusive remedy to fail of its essential purpose, or deprive a party of the substantial value of the bargain (cmt. 1), Code remedies return under § 2-719(2). Figgie's failed repairs did not cause failure because the agreed return and refund were carried out."
- Draft node h edges: "Not exclusive" → K-30; "Exclusive remedy failed of its essential purpose" → K-30; "Exclusive remedy worked" → j.
- Draft node j label: "Is the damages exclusion unconscionable?"
- Draft node j detail: "Under § 2-719(3) consequential damages may be excluded unless the exclusion is unconscionable; excluding personal-injury damages from consumer goods is prima facie unconscionable, but excluding commercial loss is not. Section 2-719(3) does not mention incidental damages. The assigned pages do not decide whether an exclusion survives a remedy's failure under § 2-719(2), so test the exclusion separately."
- Draft K-32 node: "Does a valid contractual limitation exclude this item? Apply UCC § 2-719 before awarding consequential or incidental losses (Figgie)."

**G2. Incidental versus consequential exclusions, and commercial versus consumer buyers (Figgie Notes 1–3, C&M 1046).**
- Home: Figgie map entry notes, or `reading-notes-25` Figgie paragraph.
- Draft: "The notes ask whether excluding incidental damages (handling, shipping, and cover expenses) is judged by § 2-719(3)'s unconscionability standard, which names only consequential damages. They also ask whether Anderson's point, that consequential exposure is open-ended while direct damages are capped by price, and Kearney & Trecker's view of commercial exclusions as beneficial risk allocation apply to consumers."

**G3. When reasonableness is measured: single look versus second look (C&M 1059–1060, 1062).**
- Home: K-33 node b detail (see E2), and the `stipulated-remedies` node notes.
- Draft: "Courts differ on when to test a stipulated sum. Wasserman’s and § 2-718(1) (“anticipated or actual harm”) allow a second look at actual loss, while Kelly v. Marx (Mass. 1999) and UCC § 2A-504(1) (“anticipated harm”) look only at formation; Kelly let a house seller keep a 5% deposit although it suffered no loss."

**G4. Restatement § 356 comment b's sliding scale and Gustafson Problem 1 (C&M 1049).**
- Home: Gustafson map entry notes (extend the existing Problem 1 sentence); rules entry restatement-356 `links` (currently empty), to dave-gustafson, lake-river, wassermans.
- Draft: "Under § 356 cmt. b the more difficult loss is to prove, the more latitude the estimate receives, and a substantial sum is unenforceable if it is clear no loss occurred (Illus. 4). Problem 1’s closed bridge tests whether Gustafson’s formation-time approval survives proof that delay caused no loss; the editors cite courts on both sides."

**G5. UCC § 2-718(1)'s third factor.**
- Home: `stipulated-remedies` node notes; rules entry ucc-2-718 `links` (currently empty).
- Draft: "For sales of goods, § 2-718(1) adds a third consideration to § 356’s two: the inconvenience or non-feasibility of otherwise obtaining an adequate remedy. An unreasonably large term is “void as a penalty.”"

**G6. Labels, alternative performances, and disguised penalties (§ 356 cmt. c, Illus. 5; Problem 2 at C&M 1049; Note 3 at C&M 1063; Prenalta at C&M 1055).**
- Home: new K-33 edge from node a, "Payment drafted as an alternative performance, bonus, or discount" → new node i; Lake River map notes.
- Draft node i: "Is the payment a genuine alternative performance? Courts look to substance, and the relative value of the alternatives may be decisive (§ 356 cmt. c, Illus. 5). Prenalta treated a take-or-pay “pay” option as an alternative performance; an option to deliver a machine or pay $10,000 when cover costs $1,000 more (Problem 2(c)) may be a disguised penalty."
- Draft node i edges: "Genuine alternative" → enforce as performance; "Disguised penalty" → b.

**G7. A single sum for breaches of different gravity (Lake River, C&M 1052; Cellphone Termination Fee Cases, C&M 1055).**
- Home: Lake River map entry Reasoning (add a sentence); K-33 node c detail.
- Draft: "Posner treated a formula that is invariant to the gravity of the breach as a sign of a penalty, because it cannot be a reasonable estimate for every breach. California likewise struck flat cellphone termination fees charged alike on the first and the penultimate day."

**G8. An unreasonably small sum (§ 356 cmts. a, d).**
- Home: `stipulated-remedies` notes; K-33 node a edge "Sum is unreasonably small" → K-25.
- Draft: "Section 356 polices only unreasonably large sums; an unreasonably small one is not a penalty but may be refused as unconscionable under § 208."

**G9. The 1988 Swiss principles (supp. 129–130).**
- Home: `swiss-1988-penalty` map notes (currently generic); K-33 node e detail.
- Draft: "The 1988 decision measures excess against the maximum possible damage, not the actual damage, and holds that a penalty is not excessive merely because it exceeds recoverable damages. Because a penalty’s justification can be judged only after breach, reduction looks to that time; the debtor must assert and prove the grounds, and reduction is more readily justified for an employee or economically weaker party."

**G10. Penalty bonds (§ 356(2), cmt. e, Illus. 6).**
- Home: Swiss 2024 map entry Reasoning (final comparison sentence) or K-33 node e.
- Draft: "American law has one reduction-like rule in the selections: a bond penalty is enforced up to the actual loss (§ 356(2); Illus. 6, $10,000 bond limited to a $500 default)."

**G11. Legislative and consumer limits (C&M 1055, Notes 3–4).**
- Home: Wasserman's map entry notes (next to the reserved consumer question).
- Draft: "California presumes liquidated-damages clauses valid unless the challenger shows unreasonableness at formation, but not against consumers (Cal. Civ. Code § 1671), and Dodd-Frank restricts mortgage prepayment penalties."

**G12. Equitable relief despite a liquidated-damages clause (Note 2, C&M 1048; § 356 cmt. d referring to § 359 cmt. a).**
- Home: `stipulated-remedies` notes, or flowchart K-34 node detail.
- Draft: "A valid liquidated-damages clause does not by itself bar specific performance that would otherwise be available (Bowen v. Carlsbad, Note 2)."
- Caution: the OCR of this note is badly damaged. Confirm the wording against the page image before publishing the draft.

**G13. Arbitration of a penalty question (Note 4, C&M 1063).**
- Home: `reading-notes-25`.
- Draft: "New York enforced an arbitration award upholding a damages clause because the parties chose arbitrators to decide whether it was a penalty (Associated General Contractors, 1975)."

**G14. Purposes beyond punishment and the price effect of high stipulated sums (C&M 1046–1047, Note 1 at C&M 1054).**
- Home: `reading-notes-25` Gustafson or Lake River paragraph.
- Draft: "The California highway study described completion assessments as deliberate pressure to finish fast and found that high assessments raise bid prices; Note 1 asks whether a promisor that was paid for accepting that risk is unjustly enriched when the clause is struck."

**G15. The class problems (C&M 1063–1064).**
- Home: `reading-notes-25`.
- Draft: "Circle B (a delay charge the contract itself called a “penalty”), Turner-Schraeter (100% forfeiture for a consumer’s cancellation 13 days out), and Yockey (a $50,000 clause where the firm suffered no harm) test labels, consumer settings, and the second look."

**G16. Deposits and restitution for a breaching buyer (§ 2-718(2)–(3)).**
- Home: `stipulated-remedies` notes, next to G3's Kelly v. Marx deposit.
- Draft: "Under § 2-718(2) a breaching buyer recovers payments exceeding the seller’s valid liquidated damages or, absent such a term, exceeding the lesser of 20% of the total price or $500, subject to the seller’s proved damages and benefits received."

## (d) Challenger tests of the highest-risk statements

1. "Actual loss became irrelevant once the clause was valid." (Gustafson takeaway.) The test is the closed-bridge Problem 1 and the Yockey problem. The statement fails outside a single-look regime, because § 356(1) and cmt. b (Illus. 4) and Wasserman's second look all consider actual loss. It survives only as South Dakota law. Outcome: E3.
2. "a limited remedy that includes return and refund does not fail of its essential purpose merely because repair attempts were unsuccessful" (Figgie rule). The test is a seller who exercises its option (C&M 1044, "at seller's option") to keep repairing and then refuses to refund. Figgie rested on the refund actually made (C&M 1045). The statement survives only with that condition stated. Outcome: E7.
3. "Wasserman’s gross-receipts provision needed evidence of reasonableness" (K-33 node c). The test is an inconclusive record on remand. Under New Jersey's presumption the challenger loses. The statement fails. Outcome: E4.
4. "Difficulty estimating injury is relevant to that assessment rather than necessarily an independent prerequisite" (Wasserman's map entry). The test is Illinois law in Lake River ("the need for estimation at that time must be shown," C&M 1052). The Atlas correctly confines the statement to Wasserman's. It survives because K-33 node b is to be revised (E2) so that the chart does not apply it to Illinois or South Dakota.
5. "The analysis therefore differs from the domestic rule that invalidates a penalty and leaves ordinary breach damages" (Swiss map entry). The test is § 356(2), which enforces bond penalties up to the actual loss. The statement survives for § 356(1) clauses, which is the Atlas's context. Adding G10 would prevent "U.S. law never reduces" from being inferred.
6. "A penalty could become payable without compensable damage" (Swiss Cold Call). The test is the U.S. rule in § 356 Illus. 4 (no loss means a penalty). The statement is supported for Swiss law (Art. 161(1), supp. 130; supp. 137). The jurisdiction label is present in context. It survives.
7. "The formula was a penalty. Lake River could nevertheless recover ordinary damages" (Lake River map entry). The test is whether the excerpt actually preserves those damages, since the OCR of C&M 1054 lost the passage. The page image confirms "the unpaid contract price of $241,000 minus the costs that Lake River saved," with a remand, citing § 356 cmt. a. It survives.
8. "Commercial sophistication did not foreclose the statutory power to reduce an excessive penalty" (Swiss map entry Holding). The test is the 1988 statement that reduction is less justifiable between "contractually equal and business-savvy parties." The 2024 court held that business experience did not justify CHF 50,000–100,000 for this breach (supp. 136). Sophistication weighs against reduction but does not bar it. It survives.
9. "Even a \"commercially reasonable\" remedy limit ... must give way if circumstances leave the buyer without the substantial value of its bargain" (Figgie plain 3.0). The test is whether the standard protects only the buyer. The source says "either party" (C&M 1045; cmt. 1). The plain sentence is narrower but accurate for the Figgie buyer. It survives.
10. "Usage can cut the other way: an unrebutted trade usage supplied an exclusive repair-or-refund remedy" (trade-usage timeline step 5). The test is § 2-719 cmt. 2's requirement that exclusivity be "clearly expressed." Figgie held that the proved usage itself specified exclusivity (C&M 1045; brief). It survives.

## (e) Route test

| Case | Chart and path (actual facts) | Displayed result | Correct? | Decisive fact changed | Path and result after the change | Source-supported result | Do the ≈ sentences preserve the distinction? |
|---|---|---|---|---|---|---|---|
| Figgie | K-23: a →"Commercial context" → d →"Proved usage or practice" → e →"Reasonably consistent or hierarchy resolves" → f | "Figgie applied a proved exclusive remedy that included refund, which the seller provided." | Yes, for the interpretation question. | (1) The remedy fails of its essential purpose: a repair-only remedy, or the seller refuses to refund after failed repairs. (2) The buyer claims lost production. | (1) K-23 shows the same node f; no chart applies § 2-719(2). K-33 sends the clause into the liquidated-damages test (a → b). (2) K-32: a → b → d → e → g awards the lost production. | (1) Code remedies become available (§ 2-719(2); C&M 1045, "a limited remedy of repair or replacement can fail of its essential purpose where the seller's repair or replacement is unsuccessful"). (2) On the actual facts the exclusion bars consequential loss unless unconscionable, and commercial loss is not prima facie unconscionable (§ 2-719(3)). | Partly. Narrative episode 4 and plain 3.0 preserve the refund-carried-out point. Plain 1.0 collapses incidental into consequential (E6). The chart fails (E1). |
| Dave Gustafson | K-33: a →"Assigned U.S. approach" → b →"Reasonable estimate established" → f | "Enforce the agreed damages amount" | Yes | (1) Problem 1: the bridge was closed anyway, so no loss. (2) Damages easy to prove at formation (a fixed, known daily rental cost). | Both run b →"Reasonable estimate established" → f, enforce. There is no exit for either fact. | (1) Penalty under § 356 cmt. b, Illus. 4 and a second-look court; enforce under a single-look court; the editors flag a split (C&M 1049). (2) South Dakota's formulation requires harm "incapable or very difficult of accurate estimation" (C&M 1047), so the clause fails; under § 356 there is less latitude but no automatic invalidity. | Plain 2.1 preserves formation timing. Plain 2.0 ("even if the real losses turn out higher or lower") is accurate in its South Dakota context, but the takeaway generalizes it (E3). The chart fails (E2). |
| Lake River | K-33: a → b →"Formula appears excessive or unusual" → c →"Penalty established" → g | "Disallow the penalty and calculate ordinary damages ... including saved costs." | Yes (C&M 1052–1054) | The formula credits saved variable costs (it charges the shortfall times the bagging rate less variable cost per ton). | c →"Reasonable relationship shown" → f, enforce. | Probably enforceable as a net-loss estimate, but Illinois also requires that damages be difficult to measure after breach, and "If damages would be easy to determine then ... it is a penalty" (C&M 1052). The chart never asks that question for this route. | Yes. Plain 2.1 ("without subtracting the costs it saved") and plain 3.0 preserve the saved-cost distinction. The efficient-breach plain sentence is overstated (E8). The chart is partly right; the difficulty prong is missing (E2). |
| Wasserman's | K-33: a → b →"Formula appears excessive or unusual" → c →"Evidence inconclusive" → d | "Develop the reasonableness record ... remanded the gross-receipts issue while preserving reimbursement for improvements." | Yes (C&M 1062) | (1) The record stays inconclusive on remand. (2) The tenant is a consumer. | (1) The chart stops at d with no result, and node c implies the proponent must prove reasonableness. (2) No branch exists. | (1) Enforce: the Township bears the burdens of production and persuasion (C&M 1062). (2) No presumption; the court reserved consumer contracts (C&M 1060). | Yes. Plain 2.2 (presumption and burden on challenger) and plain 3.1 ("The Township still bore the burden") preserve the burden. The chart fails (E4). |
| Swiss 2024 | K-33: a →"Swiss comparison" → e (terminal) | Reduction to CHF 10,000 described | Yes | A serious, repeated breach with substantiated risk; or the debtor never raises excessiveness. | Same terminal node e, still describing a reduction. | Enforce the agreed penalty: there is no gross disproportion, the debtor bears the burden, and the penalty is due without damage (supp. 129–130, 136). | Yes. Plain 6.0 (gross disproportion at breach), 6.1 (debtor raised it), and 6.2 (no damage needed) preserve the distinctions. The chart fails (E5). |
| Swiss 1988 (non-principal) | K-33 node e (source) | Same | n/a | n/a | n/a | Maximum possible damage is the measure of excess (supp. 130). | Not taught (G9). |
