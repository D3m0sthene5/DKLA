# OP-CT-11 challenge review: Contracts Class 11, contract modifications

Scope. This review tests Atlas statements served for Class 11 (as reproduced in `ct11-surfaces.md`) against the assigned sources only: C&M printed pp. 470–484 and 487–492 (`ct11-casebook.txt`), N.Y. Gen. Oblig. Law § 5-1103 (`ct11-supp.txt`, supplement p. 9), the class slides (`ct11-slides.txt`), and the statutory selections (`src/sel.txt`: Restatement (Second) §§ 73, 89, 175, 176 with the reproduced comments; UCC §§ 1-103, 2-209 with Official Comment; Restatement of Consumer Contracts § 3 with comments). Items registered in `prior-corrections.json` were not re-challenged; their corrected texts were read and are listed in Part D.

Two K-20 nodes (c and d) and two 'modification' timeline steps (step 1, `ny51103`; step 3, `ucc2209`) are served by the Atlas but are not reproduced in `ct11-surfaces.md`. Their text was read, without editing, from `tools/flowcharts/data/contracts.json` and `tools/r19/data/timelines.json` in the checkout. Quotations from `ct11-surfaces.md` are given as the text displays; in the file the double quotation marks inside JSON strings are backslash-escaped. All three casebook text files are degraded OCR (for example, "without any valid cau e," "willfully and arbitrarily brok that obligation"). Quotations from C&M below restore the dropped letters and change no words.

Severity key. "Result" means a student relying on the Atlas wording would reach the wrong legal answer on a fact pattern drawn from the assigned materials. "Wording" means the statement is imprecise but unlikely to change an answer.

---

## Part A. Challenged statements

### A-01. Alaska Packers rule (also Chronology 'course-chronology-0' step 48)

- Surface and field: alaska-packers, **Effective brief CTR-034: rule**; same text in **Chronology 'course-chronology-0' step 48** (`note`).
- Current text: "A promise to perform the very services a person is already legally bound to perform for the promisor supplies no new consideration for the promisor's additional promise of payment."
- Verdict: **MISSING CONDITION** (result).
- Counterexample. The slides ask "What if the workers believed the nets were defective?" (slides 4, 6, 8). Suppose the fishermen honestly, though wrongly, believed the nets were rotten and on that basis disputed whether they had to keep working at the original wage. They were in fact legally bound, so the Atlas rule says their promise to continue is no consideration. Restatement § 73, which the casebook places at the head of this unit, withholds consideration only where the duty "is neither doubtful nor the subject of honest dispute," so on these facts the promise to continue can be consideration. The Ninth Circuit's ground was narrower than the Atlas rule: it rested on the finding that the workers refused "without any valid cause" and "willfully and arbitrarily broke that obligation."
- Pinpoint: C&M p. 470 (quoting § 73); C&M p. 471 ("without any valid cause"; "willfully and arbitrarily"); `sel.txt` § 73; slides 4, 6, 8.
- Replacement: "A promise to perform the very services a person is already legally bound to perform for the promisor, where that duty is neither doubtful nor the subject of honest dispute, supplies no new consideration for the promisor's additional promise of payment."

### A-02. Alaska Packers learning topic "legal-detriment"

- Surface and field: alaska-packers, **Map entry: learning.topics** (`legal-detriment`).
- Current text: "The pre-existing duty rule is a legal-detriment problem: promising what one is already bound to do surrenders no freedom and so cannot be consideration."
- Verdict: **OVERSTATED** (result).
- Counterexamples. (1) Under De Cicco v. Schweizer, a promise to perform a duty already owed to a third party (the Count's engagement to Blanche) supported the father's promise of an annuity. The Atlas phrase "already bound to do" covers that case and gives the opposite answer. (2) Under § 73, a duty that is doubtful or the subject of honest dispute is outside the rule. (3) Also under § 73, a "similar performance is consideration if it differs from what was required by the duty in a way which reflects more than a pretense of bargain." The casebook (pp. 483–484) presents these as recognized escape routes from the rule.
- Pinpoint: C&M p. 485 (De Cicco); C&M pp. 483–484 (Levine v. Blumenthal; § 73's "more than a pretense of a bargain"); `sel.txt` § 73.
- Replacement: "The pre-existing duty rule is a legal-detriment problem: promising only what one is already bound to do for the promisor, under a duty neither doubtful nor the subject of honest dispute, surrenders no freedom and so is not consideration."

### A-03. Alaska Packers Cold Call plain-English sentence at 2.2

- Surface and field: alaska-packers, **Cold Call plain-English sentences**, `at` 2.2 (first entry), `plain`.
- Current text: "He then asked whether the company got anything in return for its promise of more pay, since without that exchange ('consideration') a promise is not enforceable."
- Verdict: **CHANGES RESULT**.
- Counterexample. The company did get something in return: a completed season of fishing that it badly needed. A student who asks the Atlas question ("did the company get anything in return?") answers yes and finds consideration. The court's question was whether the company got anything beyond "the exact services, and none other, that they were already under contract to render." The clause "without that exchange … a promise is not enforceable" is also wrong as a general statement within this very assignment: § 89(b) and (c), N.Y. Gen. Oblig. Law § 5-1103, and UCC § 2-209(1) each enforce modifying promises without consideration.
- Pinpoint: C&M p. 471; `sel.txt` § 89; supp. p. 9 (§ 5-1103); `sel.txt` § 2-209(1).
- Replacement: "He then asked whether the company received, in exchange for its promise of more pay, anything beyond the work the crew already owed under the original contracts ('consideration'); under the rule he applied, a promise without consideration was not enforceable."

### A-04. Alaska Packers Cold Call plain-English sentence at 3.1 (second entry)

- Surface and field: alaska-packers, **Cold Call plain-English sentences**, `at` 3.1 (second entry), `plain`.
- Current text: "Performing a duty one already has supplied no "consideration," meaning nothing new given in exchange, for the company's promise of extra wages."
- Verdict: **OVERSTATED** (result, if read as a general rule).
- Counterexample. "A duty one already has" covers a duty owed to a third party, as in De Cicco, where consideration was found. It also covers a duty that is honestly disputed, which § 73 excludes from the rule. The source sentence is limited to this crew's existing duty, but the paraphrase drops that limit.
- Pinpoint: C&M p. 485; `sel.txt` § 73.
- Replacement: "Performing work the crew already owed the company, under contracts whose terms were not honestly disputed, supplied no "consideration," meaning nothing new given in exchange, for the company's promise of extra wages."

### A-05. Alaska Packers Cold Call plain-English sentence at 4.0

- Surface and field: alaska-packers, **Cold Call plain-English sentences**, `at` 4.0, `plain`.
- Current text: "The record did not show "rescission" (the company freely canceling the old contracts) and substitution of new ones."
- Verdict: **CHANGES RESULT** (definition).
- Counterexample. The gloss turns rescission into a one-sided act of the company. Rescission of the kind at issue requires the agreement of both parties. Schwartzreich describes "an existing contract … terminated by consent of both parties," and the King quotation in Alaska Packers speaks of the "parties" having "voluntarily rescinded." Watkins likewise speaks of rescission "by mutual consent." A student using the gloss would treat a unilateral cancellation by one side as a rescission that frees the parties to contract anew.
- Pinpoint: C&M p. 472 (King quotation); C&M p. 475 (Schwartzreich); C&M p. 479 (Watkins, "by mutual consent"); slide 5 ("Mutual promises to rescind").
- Replacement: "The record did not show "rescission" (both sides freely agreeing to cancel the old contracts) and substitution of new ones."

### A-06. Alaska Packers Cold Call 5.1: Restatement § 89 (plain-English sentence and source sentence)

- Surface and field: alaska-packers, **Cold Call plain-English sentences**, `at` 5.1 (first entry), `plain`; the same wording problem is in its `sentence` and in Cold Call episode-6 paragraph 2.
- Current text (plain): "Restatement § 89, a later rule, can make some contract "modifications" (changes) binding without new consideration if fair and caused by "unforeseen circumstances," events nobody expected."
- Current text (sentence): "replacement difficulty alone does not establish unforeseen circumstances supporting a fair adjustment"
- Verdict: **CHANGES RESULT**.
- Counterexample. Section 89(a) asks whether the modification is "fair and equitable in view of circumstances not anticipated by the parties when the contract was made." Comment b states that "a frustrating event may be unanticipated for this purpose if it was not adequately covered, even though it was foreseen as a remote possibility." Restatement § 89 Illustration 4 (a threatened nationwide steel strike raises the seller's cost, and the parties agree to raise the price) holds the modification binding. A student who requires "events nobody expected" would refuse enforcement whenever the parties had considered the event a remote possibility, which is the opposite of comment b. The paraphrase also (1) lowers "fair and equitable" to "fair," although comment b says that phrase "goes beyond absence of coercion and requires an objectively demonstrable reason for seeking a modification"; (2) presents the (a) test as the condition for § 89 as a whole, although (b) (statute) and (c) (reliance) are independent routes; and (3) drops the limitation to a contract "not fully performed on either side."
- Pinpoint: `sel.txt` § 89 black letter, comment b, Illustration 4; C&M p. 476 (Note 3: § 89 applies to promises "not fully performed on either side").
- Replacement (plain): "Restatement § 89, a later rule, can make a promise modifying a contract not yet fully performed on either side binding without new consideration if the modification is "fair and equitable" in view of circumstances the parties did not anticipate when they contracted (an event can count even if it was foreseen as a remote possibility, so long as the contract did not adequately cover it), to the extent a statute provides, or to the extent justice requires because of a material change of position in reliance."
- Replacement (sentence fragment): "replacement difficulty alone does not establish circumstances not anticipated by the parties that would make an adjustment fair and equitable"

### A-07. Alaska Packers Cold Call 5.1: § 5-1103 (plain-English sentence)

- Surface and field: alaska-packers, **Cold Call plain-English sentences**, `at` 5.1 (second entry), `plain`.
- Current text: "New York General Obligations Law § 5-1103 can remove "consideration" objections (that nothing new was exchanged) to qualifying signed, written "modifications" of a contract."
- Verdict: **MISSING CONDITION** (result).
- Counterexample. The statute requires that the writing be "signed by the party against whom it is sought to enforce the change, modification or discharge, or by his agent." In Alaska Packers the workers sought to enforce the raise against the Association. A writing signed only by the workers would not qualify. The superintendent's signature qualifies only if he signed as the Association's agent, and he "distinctly informed the libelants that he had no power to alter the original or to make a new contract." This is the question the casebook asks: "How would the Alaska Packers case have been decided under the New York statute?"
- Pinpoint: supp. p. 9 (§ 5-1103); C&M p. 473 (statute text and question); C&M p. 471 (superintendent's disclaimer).
- Replacement: "New York General Obligations Law § 5-1103 can remove "consideration" objections (that nothing new was exchanged) to a written "modification" of a contract signed by the party against whom it is to be enforced, or by that party's agent."

### A-08. Lecture notes record, topic "Modern doctrine: Restatement § 89, statutes and waiver"

- Surface and field: **Lecture notes record**, `topics` entry "Modern doctrine: Restatement § 89, statutes and waiver", `body`.
- Current text: "(UCC § 2-209 and N.Y. Gen. Oblig. L. § 5-1103 remove the consideration requirement)"
- Verdict: **MISSING CONDITION** (result). Slide 11 itself says "UCC 2-209 and NY Gen Oblig. 5-1103 eliminate the requirement of consideration for contract modifications"; the Atlas reports the slide accurately, but the slide's shorthand drops statutory conditions.
- Counterexample. An oral modification of a New York services contract gets no help from § 5-1103, which applies only to a writing "signed by the party against whom it is sought to enforce the change … or by his agent." Section 2-209(1) applies only to "a contract within this Article" (goods); comment 2 requires that the modification meet "the test of good faith"; and subsections (2) and (3) keep an agreed signed-writing clause and the statute of frauds in force.
- Pinpoint: supp. p. 9; C&M p. 473; `sel.txt` § 2-209(1)–(3) and comment 2; slide 11.
- Replacement: "(UCC § 2-209(1) removes the consideration requirement for modifications of contracts within Article 2, subject to the Code's good-faith test; N.Y. Gen. Oblig. L. § 5-1103 removes it for a modification in writing signed by the party against whom enforcement is sought or by that party's agent)"

### A-09. Timeline 'modification' step 1 (`ny51103`)

- Surface and field: **Timeline 'modification' step 1** (`id` ny51103), `note`. Not reproduced in `ct11-surfaces.md`; read from `tools/r19/data/timelines.json`.
- Current text: "New York: a signed written agreement to modify or discharge a contract does not fail for lack of consideration."
- Verdict: **MISSING CONDITION** (result).
- Counterexample. Same as A-07. A writing signed only by the party seeking enforcement satisfies the Atlas note ("a signed written agreement") but not the statute.
- Pinpoint: supp. p. 9; C&M p. 473.
- Replacement: "New York: a written agreement to modify or discharge a contract, signed by the party against whom it is to be enforced or by that party's agent, does not fail for lack of consideration."
- Also: the step's year, 1936, is not in the assigned excerpt. C&M p. 476 cites a 1936 Law Revision Commission report that led to the statute, but it does not give the year the statute was enacted.

### A-10. Timeline 'modification' step 3 (`ucc2209`)

- Surface and field: **Timeline 'modification' step 3** (`id` ucc2209), `note`. Not reproduced in `ct11-surfaces.md`; read from `tools/r19/data/timelines.json`.
- Current text: "An agreement modifying a sales contract needs no consideration; the Code's comments police modifications by a test of good faith instead."
- Verdict: **MISSING CONDITION** (lower severity).
- Counterexample. Take an oral modification of a goods contract that contains a signed no-oral-modification clause, or one that raises the price of a $500-plus contract with no writing. Under the note, good faith is the only check, so the modification is valid. Under § 2-209(2) and (3), it fails, although under § 2-209(4) it can operate as a waiver.
- Pinpoint: `sel.txt` § 2-209(2)–(4) and comment 3.
- Replacement: "An agreement modifying a contract within Article 2 needs no consideration; the Code's comments police modifications by a test of good faith instead, and § 2-209(2)–(3) keep agreed signed-writing clauses and the statute of frauds in force."
- Also: the step's year, 1952, is not in the assigned excerpt.

### A-11. Timeline 'modification' summary field `now`

- Surface and field: **Timeline 'modification' summary fields**, `now` (shown three times in the surfaces file, once per case).
- Current text: "Model UCC § 2-209 removes consideration as a requirement for a goods modification, while good faith still matters. New York’s signed-writing statute and the Restatement’s fair-modification approach offer distinct routes."
- Verdict: **MISSING CONDITION** (lower severity).
- Counterexample. "Good faith still matters" turns a requirement into a factor. Comment 2 states that modifications "must meet the test of good faith" and that "the extortion of a 'modification' without legitimate commercial reason is ineffective." A student could therefore weigh bad faith against other considerations instead of treating it as disqualifying. "The Restatement’s fair-modification approach" also omits the § 89(c) reliance route, which applies even where the modification is not fair and equitable in view of unanticipated circumstances (see § 89 Illustration 8).
- Pinpoint: `sel.txt` § 2-209 comment 2; § 89(c), comment d, Illustration 8.
- Replacement: "Model UCC § 2-209 removes consideration as a requirement for a goods modification, but the modification must meet the Code's test of good faith. New York’s statute for writings signed by the party to be charged and Restatement § 89 (fair and equitable adjustment to unanticipated circumstances, statute, or reliance) offer distinct routes."

### A-12. Flowchart K-20 node b, edge "Same duty only" → g

- Surface and field: **Flowchart K-20 (Is the modification enforceable?) node b**, `edges` (label "Same duty only", to "g"), read with `detail`.
- Current text: `"label": "Same duty only"`, together with the detail "Watkins enforced the voluntary substitution of a higher excavation price."
- Verdict: **CHANGES RESULT** (branch outcome).
- Counterexample. In Watkins, the contractor's new promise was the same duty it already owed: the court found that the written contract already required removal of "all material," including the rock, at the contract price, and it rejected the mutual-mistake defense. A student who answers node b truthfully ("same duty only") follows the edge to node g ("Apply the original obligation if the change fails") and denies the higher rate, which is the opposite of the outcome in Watkins and in Restatement § 89 Illustration 1 (the same cellar facts, "B is bound to pay the increased amount"). Section 89(a) applies precisely when the only thing lacking is consideration, because the promisee promises the same performance (comment a: paragraph (a) deals with bargains "without consideration only because of the rule that performance of a legal duty to the promisor is not consideration"). The edge labels also give a reliance case under § 89(c) no route except to g. The detail also omits that the substituted price in Watkins was fair ("the special price was fair and the defendant received reasonable value for it").
- Pinpoint: C&M pp. 477–480; `sel.txt` § 89 comments a–b, Illustration 1, comment d.
- Replacement: change the two edge labels to "New consideration, or a recognized substitute (voluntary rescission and fair substitution where the jurisdiction accepts it; § 89(a), (b) or (c))" → e and "Same duty only and no recognized substitute" → g; change the detail sentence to "Watkins enforced the voluntary substitution of a fair, higher price for excavating unexpected rock."

### A-13. Flowchart K-20 node g

- Surface and field: **Flowchart K-20 node g**, `detail`.
- Current text: "A failed modification leaves the original bargain available, subject to any separately valid waiver or discharge."
- Verdict: **MISSING CONDITION** (result in reliance cases).
- Counterexample. Restatement § 89 Illustration 8: a shipper agrees that its fish may travel under ventilation instead of refrigeration and later changes its mind. The carrier is bound to refrigerate only because it learned of the change "before he has changed his position." Comment d explains that a modifying promise "not binding when made … may become binding in whole or in part by reason of action or forbearance by the promisee … in reliance on it." Likewise, under UCC § 2-209(5), a waiver of an executory term cannot be retracted if "the retraction would be unjust in view of a material change of position in reliance on the waiver." Node g's exceptions ("waiver or discharge") do not mention reliance or the limits on retracting a waiver.
- Pinpoint: `sel.txt` § 89(c), comment d, Illustrations 7–8; § 2-209(4)–(5).
- Replacement: "A failed modification leaves the original bargain available, subject to any separately valid waiver or discharge and to enforcement to the extent justice requires because of a material change of position in reliance (Restatement § 89(c); UCC § 2-209(5) on retracting a waiver)."

### A-14. Flowchart K-20 node h

- Surface and field: **Flowchart K-20 node h**, `detail`.
- Current text: "Continued performance or a delay in protesting can be consistent with ongoing pressure, as in Austin."
- Verdict: **MISSING CONDITION** (result), plus a misdescription of the facts.
- Counterexample. Loral did not delay its protest. It protested in writing when it gave in ("we are left with no choice or alternative but to meet your conditions," July 22). What it delayed was its demand for a refund. The court stated the condition that node h omits: "one who would recover moneys allegedly paid under duress must act promptly to make his claim known." Loral's delay was excused only because "the possibility of an application by Austin of further business compulsion still existed until all of the parts were delivered," and its demand came three days after the last delivery. Suppose a buyer that never protested and waited months after the pressure ended. Node h tells that buyer it may avoid the modification, but Austin's reasoning would bar recovery. The casebook also asks whether the absence of a protest letter would matter (p. 492 Note).
- Pinpoint: C&M p. 488 (July 22 letter); C&M p. 491 (promptness; three days; continuing compulsion); C&M p. 492 (Note).
- Replacement: "The coerced party may avoid the modification and seek appropriate recovery, but it must disaffirm promptly once the pressure ends. In Austin, Loral protested in writing when it acceded and could wait to demand a refund until three days after the last delivery because further stoppages remained possible until then."

### A-15. Flowchart K-20 node e

- Surface and field: **Flowchart K-20 node e**, `detail`.
- Current text: "Test market alternatives, timing, inducement and whether apparent acquiescence continued under the pressure."
- Verdict: **MISSING CONDITION** (lower severity).
- Counterexample. Austin requires, in addition to a wrongful threat and the absence of another timely source, that "the ordinary remedy of an action for breach of contract would not be adequate." Consider a buyer that cannot find a timely substitute supplier but whose only loss from delay is a modest, fully compensable sum, with no liquidated damages, no cancellation risk, and no threat to future business. That buyer passes every test the node lists. Under Austin, though, it must also show that a damages action would be inadequate, which the court found for Loral only because a lawsuit could not supply the gears or protect Loral's Navy business.
- Pinpoint: C&M p. 489 (elements); C&M pp. 490–491 (inadequacy of damages remedy).
- Replacement: "Test market alternatives, the adequacy of an ordinary action for breach, timing, inducement and whether apparent acquiescence continued under the pressure."

### A-16. Watkins rule (also Chronology 'course-chronology-0' step 111)

- Surface and field: watkins, **Effective brief CTR-035: rule**; same text in **Chronology 'course-chronology-0' step 111** (`note`).
- Current text: "Parties to an existing contract may, in a single transaction, voluntarily rescind the old arrangement in whole or in part and substitute a fair new one, so an owner's voluntary surrender of his right to the original price is effective."
- Verdict: **MISSING CONDITION** (result), and it states one jurisdiction's rule as a universal one.
- Counterexamples. (1) Jurisdiction. Restatement § 89 comment b rejects the simultaneous-rescission theory "because it is fictitious when the 'rescission' and new agreement are simultaneous, and because if logically carried out it might uphold unfair and inequitable modifications." The King and Lingenfelder passages quoted in Alaska Packers deny that relabeling a demand as a new contract supplies consideration. A student who applies the Atlas rule outside New Hampshire would enforce a modification that a § 89 court would analyze only under § 89(a)–(c). (2) Circumstances. Watkins tied enforcement to facts "subsequently learned" that "showed the obligation to be burdensome" and to "changes to meet changes in circumstances." Suppose a contractor that meets no new difficulty and simply demands more mid-job, and an owner who voluntarily agrees to a market-rate price. The Atlas rule enforces the higher price. Watkins's reasoning does not reach those facts, and § 89(a) would not apply because comment b requires "an objectively demonstrable reason for seeking a modification."
- Pinpoint: C&M pp. 478–480; C&M p. 472 (King, Lingenfelder); `sel.txt` § 89 comment b.
- Replacement: "Under New Hampshire law as applied in Watkins, when facts learned after contracting make performance unexpectedly burdensome, parties to an existing contract may, in a single transaction, voluntarily rescind the old arrangement in whole or in part and substitute a fair new one, so an owner's voluntary surrender of his right to the original price is effective."

### A-17. Watkins takeaway

- Surface and field: watkins, **Takeaway (tools/r19/data/takeaways.json)**.
- Current text: "The parties to a contract can tear up the old price and agree a fairer new one in a single conversation. An owner who voluntarily agreed to pay more when the digging hit rock was held to the new rate."
- Verdict: **OVERSTATED** (result).
- Counterexample. The same as A-16, and the takeaway names no jurisdiction at all. "A fairer new one" also shifts the test. The court found that "the special price was fair and the defendant received reasonable value for it." It did not ask whether the new price was fairer than the old one. Slide 10 asks "What if the modified price had been exorbitant?" A price can be fairer than a ruinous old price and still be exorbitant. "Tear up" also suggests the Schwartzreich ceremony, which Watkins held unnecessary.
- Pinpoint: C&M pp. 475, 478–480; slide 10; `sel.txt` § 89 comment b.
- Replacement: "In New Hampshire, parties to a contract could give up the old price and agree a fair new one in a single transaction. An owner who voluntarily agreed to pay a fair special rate when the digging unexpectedly hit solid rock was held to the new rate."

### A-18. Watkins timeline step 2

- Surface and field: watkins, **Timeline 'modification' step 2**, `note`.
- Current text: "Parties may rescind and replace a deal in one transaction; an owner who freely gives up the old price after unforeseen rock is bound (New Hampshire)."
- Verdict: **MISSING CONDITION** (result).
- Counterexample. Slide 10's variant has the owner freely agreeing to an exorbitant rock price. The step note says the owner "is bound," without saying to what or on what condition. The court relied on the special price being fair and of reasonable value ("The promise was not an assumption of the burden; the special price was fair"), and § 89(a) requires a "fair and equitable" modification.
- Pinpoint: C&M p. 478; slide 10; `sel.txt` § 89(a).
- Replacement: "Parties may rescind and replace a deal in one transaction; an owner who freely gives up the old price after unforeseen rock and promises a fair special rate is bound to that rate (New Hampshire)."

### A-19. Watkins Cold Call plain-English sentence at 5.1 (and its source sentence)

- Surface and field: watkins, **Cold Call plain-English sentences**, `at` 5.1, `sentence` and `plain`.
- Current text (sentence): "Later Restatement § 89 comment b criticized simultaneous rescission as a fiction and instead tested a modification’s fairness and justification directly."
- Current text (plain): "It instead tests directly whether a modification is fair and justified."
- Verdict: **MISSING CONDITION** (result).
- Counterexample. Comment b does more than criticize the theory; it states "That theory is rejected here." A student who reads "criticized" may treat simultaneous rescission as still available under the Restatement. More important, "fair and justified" does not state the § 89(a) test. A modification is binding under (a) only if it is "fair and equitable in view of circumstances not anticipated by the parties when the contract was made." Under "fair and justified," a fair price increase demanded for any good business reason would bind. Under § 89(a), it binds only if the reason rests in circumstances that were not anticipated, and Illustration 5 (a cost increase, with the buyer "forced to agree") is held not binding.
- Pinpoint: `sel.txt` § 89 comment b, Illustrations 1 and 5.
- Replacement (sentence): "Later Restatement § 89 comment b rejected simultaneous rescission as a fiction and instead asked directly whether the modification is fair and equitable in view of circumstances not anticipated when the contract was made."
- Replacement (plain): "It instead asks directly whether a modification is fair and equitable in view of circumstances the parties did not anticipate when they made the contract."

### A-20. Austin rule (also Chronology 'course-chronology-0' step 213)

- Surface and field: austin, **Effective brief CTR-036: rule**; same text in **Chronology 'course-chronology-0' step 213** (`note`).
- Current text: "A contract modification is voidable for economic duress when a party threatens to withhold goods owed under a contract, and the threatened party cannot obtain them from another source in time and an ordinary action for breach would be inadequate."
- Verdict: **MISSING CONDITION** (result).
- Counterexample. The court's test requires that the party "was forced to agree to it by means of a wrongful threat precluding the exercise of his free will," and that the threat be to withhold goods "unless the other party agrees to some further demand." The Atlas rule drops both the link between the threat and the demand and the requirement of inducement. Take a variant built on Austin's version of the facts as the dissent reports it (a request to accommodate "the closing of its plant for a customary vacation period"): the supplier announces the shutdown, makes no demand, and the buyer, with no timely alternative, volunteers a higher price. Under the Atlas rule the price modification is voidable. Under the court's statement of the test it is not, because no threat was used to force the buyer's agreement. Restatement § 175(1) likewise requires that assent be "induced by" the improper threat, and comment c applies a subjective test of inducement.
- Pinpoint: C&M p. 489; C&M p. 491 (dissent's account of Austin's version); `sel.txt` § 175(1) and comment c.
- Replacement: "A contract modification is voidable for economic duress when a party was forced to agree to it by a wrongful threat precluding the exercise of free will, as when the other party threatens to withhold goods owed under the contract unless the modification is agreed, the threatened party cannot obtain the goods from another source in time, and an ordinary action for breach would be inadequate."

### A-21. Austin Cold Call plain-English sentence at 3.0 (first entry)

- Surface and field: austin, **Cold Call plain-English sentences**, `at` 3.0 (first entry), `plain`.
- Current text: "A pressured party may undo a contract if it agreed only because the other side made a wrongful threat that left it no real free choice."
- Verdict: **OVERSTATED** (result in the Restatement framework).
- Counterexample. "Only because" sets a sole-cause standard. Restatement § 175 comment c states that assent "is induced by duress if the duress substantially contributes to his decision to manifest his assent." Suppose a buyer that yields to a wrongful supply threat partly from fear of a Navy default and partly to preserve goodwill. That buyer fails the Atlas test but can satisfy § 175. The court's own phrasing is "forced to agree to it by means of a wrongful threat," which does not require that the threat be the only reason.
- Pinpoint: C&M p. 489; `sel.txt` § 175 comment c.
- Replacement: "A pressured party may undo (avoid) a contract if the other side's wrongful threat forced it to agree by leaving it no real free choice."

### A-22. Austin Cold Call 6.1: §§ 175–176 (plain-English sentence and source sentence)

- Surface and field: austin, **Cold Call plain-English sentences**, `at` 6.1 (second entry), `sentence` and `plain`; the same compression is in Cold Call episode-7 paragraph 2.
- Current text (plain): "and § 176(1)(d) treats a wrongful threatened "breach" of contract as an improper threat."
- Current text (sentence): "and wrongful threatened breach to § 176(1)(d)."
- Verdict: **CHANGES RESULT**.
- Counterexample. Section 176(1)(d) makes a threat improper when "the threat is a breach of the duty of good faith and fair dealing under a contract with the recipient." It does not make every threatened breach of contract improper. Slide 14 asks "What if the modification was prompted by a cost increase?" Slide 13 states that a threat to breach "'without legitimate commercial reason' can be characterized as a breach of the duty of good faith." UCC § 2-209 comment 2 recognizes that "a market shift which makes performance come to involve a loss may provide" a legitimate reason for seeking a modification. A seller facing a genuine cost increase who says it cannot continue at the old price is making a threatened breach. Under the Atlas sentence that threat is automatically improper under § 176(1)(d). Under the provision, the question is whether the threat breaches the duty of good faith and fair dealing. If it does not, impropriety must come from § 176(2), which also requires that the resulting exchange be "not on fair terms."
- Pinpoint: `sel.txt` § 176(1)(d), (2); § 2-209 comment 2; slides 13–14.
- Replacement (plain): "and § 176(1)(d) treats a threat as improper when the threat is itself a breach of the duty of good faith and fair dealing under a contract with the recipient, as a threat to withhold owed deliveries to extract new concessions may be."
- Replacement (sentence fragment): "and a threat that breaches the duty of good faith and fair dealing under the existing contract to § 176(1)(d)."

### A-23. Austin Cold Call plain-English sentence at 4.3

- Surface and field: austin, **Cold Call plain-English sentences**, `at` 4.3, `plain`.
- Current text: "so objecting three days after the last delivery was soon enough."
- Verdict: **OVERSTATED** (wording, with some risk to the result; see A-14).
- Counterexample. Loral objected at the time it gave in (the July 22 letter). The three-day interval concerned its refund demand, "to disaffirm it." If "objecting" is read as protesting, the sentence suggests a coerced party may stay silent until the pressure ends.
- Pinpoint: C&M pp. 488, 491.
- Replacement: "so demanding repayment three days after the last delivery was soon enough."

### A-24. Lecture notes record, topic "The pre-existing duty rule"

- Surface and field: **Lecture notes record**, `topics` entry "The pre-existing duty rule", `body`.
- Current text: "and a modification supported by even minimal consideration is enforceable."
- Verdict: **OVERSTATED** (result). Slide 5 reads "will be enforceable under the pre-existing duty rule"; the Atlas drops the qualifier "under the pre-existing duty rule."
- Counterexample. Add a token new term to Austin's price demand (for example, an altered delivery point). That supplies minimal consideration, but the modification remains voidable for duress (C&M p. 489). Under Article 2, "Nor can a mere technical consideration support a modification made in bad faith" (§ 2-209 comment 2). And § 73 counts a different performance only if it "reflects more than a pretense of bargain."
- Pinpoint: slide 5; `sel.txt` § 73; § 2-209 comment 2; C&M pp. 483–484, 489.
- Replacement: "and a modification supported by even minimal consideration satisfies the pre-existing duty rule, though it remains open to defenses such as duress."

### A-25. Lecture notes record, topic "Duress and good faith"

- Surface and field: **Lecture notes record**, `topics` entry "Duress and good faith", `body`.
- Current text: "the absence of a reasonable alternative; and unfair terms, which matter less if the threat is improper enough."
- Verdict: **OVERSTATED** (result in the Restatement framework). The statement follows slide 13, which lists "Unfair terms [less relevant if threat is sufficiently improper]" among "Key elements of duress." The black letter of the assigned §§ 175–176 is narrower.
- Counterexample. Section 175(1) requires an improper threat, inducement, and no reasonable alternative, but not unfair terms. Section 176 requires unfair terms only for the § 176(2) category ("A threat is improper if the resulting exchange is not on fair terms, and …"). A threat within § 176(1), such as one that breaches the duty of good faith, is improper whatever the terms. A student who treats unfair terms as a required element ("Duress requires …") would deny relief where a § 176(1) threat produced a price that was not shown to be unfair.
- Pinpoint: `sel.txt` §§ 175(1), 176(1)–(2); slide 13.
- Replacement: "the absence of a reasonable alternative; and, for threats that are improper only under § 176(2), an exchange not on fair terms (the slide treats unfair terms as less relevant if the threat is sufficiently improper)."

### A-26. Lecture notes record, topic "Ways to forestall modification"

- Surface and field: **Lecture notes record**, `topics` entry "Ways to forestall modification", `body`.
- Current text: "but no-oral-modification clauses are made effective by statutes such as UCC § 2-209 and N.Y. Gen. Oblig. L. § 15-301"
- Verdict: **MISSING CONDITION** (result, for UCC § 2-209).
- Counterexample. A consumer buys goods on a merchant's printed form that contains a no-oral-modification clause, and the consumer signs only the form as a whole. Under § 2-209(2), "except as between merchants such a requirement on a form supplied by the merchant must be separately signed by the other party," so the clause does not bind the consumer. The clause also must be in "a signed agreement." Section 15-301 is not in the assigned materials, and its conditions could not be checked.
- Pinpoint: `sel.txt` § 2-209(2) and comment 3; slide 12.
- Replacement: "but no-oral-modification clauses in a signed agreement are made effective by statutes such as UCC § 2-209(2) (which requires a clause on a merchant's form to be separately signed by a non-merchant) and N.Y. Gen. Oblig. L. § 15-301"

### A-27. Lecture notes record, topic "Restatement of Consumer Contracts § 3"

- Surface and field: **Lecture notes record**, `topics` entry "Restatement of Consumer Contracts § 3", `body`.
- Current text (a): "a reasonable opportunity to reject or terminate without unreasonable cost"
- Current text (b): "be fair and equitable in view of unanticipated circumstances"
- Verdict: (a) **CHANGES RESULT**; (b) **UNSUPPORTED BY ASSIGNED SOURCES** as black letter. Clause (b) appears in the quotation on slide 15 but not in the § 3(c) text of the assigned selections.
- Counterexample (a). Under § 3(a)(2), the consumer must receive "a reasonable opportunity to reject the proposed modified term and continue the contractual relationship under the existing term." An opportunity to terminate can replace it only where the contract itself establishes a reasonable modification procedure (§ 3(b)). Restatement of Consumer Contracts § 3 Illustration 15: with no modification procedure, a price increase that offers the consumer only termination is "unenforceable under subsection (a)." A student using the Atlas "reject or terminate" would treat an offer to let the consumer terminate as enough.
- Counterexample (b). The assigned § 3(c) reads: "A modification of a standard contract term in a consumer contract is enforceable only if it is proposed in good faith and if it does not have the effect of undermining an affirmation or promise made by the business that was made part of the basis of the original bargain." Comment 7 cites § 89's "related 'fair and equitable' test" and says subsection (c) "will generally bar the modification of contracts fully performed, or of short-term contracts … unless circumstances are present that were not anticipated." The slide's quoted wording may reflect a different version of the text; the assigned black letter does not include it as a separate requirement. The Atlas statement also omits the scope limit "consumer contract governing an ongoing relationship."
- Pinpoint: `sel.txt` RCC § 3(a)–(c), comments 4, 6, 7, Illustrations 14–15; slide 15.
- Replacement: "A standard term in a consumer contract governing an ongoing relationship is modified if the consumer gets reasonable notice and opportunity to review, a reasonable opportunity (with notice) to reject the modified term and continue under the existing term (or, under an agreed procedure, a reasonable opportunity to terminate without unreasonable cost, loss of value or personal burden), and assents or does not reject and continues after the rejection period; the modification is enforceable only if proposed in good faith and if it does not undermine an affirmation or promise that was part of the basis of the original bargain. Slide 15 quotes an additional 'fair and equitable in view of circumstances not anticipated' clause that does not appear in the § 3(c) text in the assigned selections."

### A-28. Minor statements (no change to the legal result)

- alaska-packers, **Map entry: summary**: "did not support a midseason promise to double their fixed compensation." The excerpt places the stoppage "[u]pon arrival at Pyramid Harbor," after the men "entered upon the discharge of their contract," early in a short season (C&M pp. 470–471). "Midseason" is not supported. Replacement: "did not support a promise, made after work had begun at the remote cannery, to double their fixed compensation."
- **Flowchart K-20 node a**, `sources`: the tag "ucc204" points to UCC § 2-204 (formation), which is not an assigned provision. The node's Article 2 branch depends on § 2-209. This is likely a source-link error; it should be checked against the source index.
- austin, **Map entry: learning.topics** (`duress`): "Supply alternatives, timing, and the inadequacy of damages determine whether consent to higher prices was coerced." This omits the wrongful-threat element (C&M p. 489). Suggested wording: "A wrongful threat, supply alternatives, timing, and the inadequacy of damages determine …".

---

## Part B. Statements that rely on facts not in the assigned excerpt (not marked wrong)

- Alaska Packers: the May 19 stoppage date; the $60 shipping articles; the panel of Judges Gilbert, Ross and Hawley (the excerpt shows only "Ross, Circuit Judge"); the decision date of May 26, 1902; the remand with directions to enter judgment for the Association with costs (the excerpt says only "the judgment must be reversed"); the payments and releases (Cold Call 1.2); the superintendent first trying to persuade the crew.
- Watkins: the decision date of July 15, 1941; "the other justices concurred, Justice Burque not sitting" (the excerpt shows only "Transferred by Burque, C.J."); the full names Robert G. Watkins & Son, Inc. and James A. Carrig; the completed-gift analysis and the distinction between releasing one's debtor and assigning a claim (CTR-035 Reasoning final paragraph; Cold Call 4.2). The excerpt says only that the case "is one of a simple relinquishment of a right pertaining to intangible personalty."
- Austin: the decision date of July 6, 1971, and argument on May 12; "A seller is ordinarily free to negotiate over a new order" (CTR-036 Reasoning; Cold Call episode-4); the footnote 5 and 6 pinpoints cited in the narrative.
- Timeline years for § 5-1103 (1936) and § 2-209 (1952).

---

## Part C. Statements checked and found supported (one line each)

Alaska Packers
- Map summary (apart from "midseason"; see A-28): supported, C&M pp. 470–471.
- Map notes, first paragraph (the notes reproduce § 5-1103 and contrast § 2-209; separate routes): supported, C&M p. 473.
- Map sections.Material Facts: supported, C&M pp. 470–471.
- Map sections.Procedural History: supported, C&M pp. 470–471.
- Map sections.Issue: supported, C&M p. 471.
- Map sections.Holding ("for want of consideration"): supported, C&M p. 471.
- Map sections.Reasoning, both paragraphs: supported, C&M pp. 471–473 (King, Lingenfelder).
- Map learning.topics consideration, modification, duress, assent, good-faith-early (the last as a comparison only): supported, C&M pp. 471–474; § 2-209 comment 2; § 89 comment b.
- CTR-034 Procedural History (apart from the remand detail; see Part B): supported, C&M pp. 470–471.
- CTR-034 Issue: supported, C&M pp. 471–472.
- CTR-034 Holding (lack of consideration; no voluntary waiver; estoppel rejected; not a holding that every raise is duress): supported, C&M pp. 471–473; panel names not in excerpt.
- CTR-034 Reasoning, all four paragraphs: supported, C&M pp. 471–473.
- Takeaway: supported, C&M pp. 470–473.
- Cold Call plain 2.0 (admiralty, libelants): supported, C&M p. 470.
- Cold Call plain 2.0 (deficient nets could change obligations): supported as a study variation, slides 4, 6, 8.
- Cold Call plain 2.2 (second entry; actual authority left undecided): supported, C&M p. 471.
- Cold Call plain 3.0 (practical value is not a new bargained-for benefit): supported, C&M pp. 471–472.
- Cold Call plain 3.1 (first entry; analysis rested on an unjustified refusal): supported, C&M p. 471.
- Cold Call plain 4.1 (both entries; King, estoppel): supported, C&M p. 472.
- Cold Call plain 5.0 (second entry; lack of consideration was the operative ground): supported, C&M pp. 471–473.
- Cold Call plain 5.1 (third entry; § 2-209 applies to goods, not a crew's services): supported, `sel.txt` § 2-209(1) ("a contract within this Article"); § 89 comment c.
- Cold Call plain 5.1 (second entry), clause "does not cure duress": supported as an inference from the statute's text ("shall not be invalid because of the absence of consideration") and § 89 comment c; C&M pp. 473–474 pose the question.
- Timeline step 0 (note, fate, effect, context): supported, C&M pp. 470–473.
- Timeline summary `guide`: supported.
- R&A restatement-89: verbatim match with the `sel.txt` black letter.

Watkins
- Map summary: supported, C&M pp. 477–479.
- Map sections.Parties, Material Facts, Procedural History, Issue, Holding: supported, C&M pp. 477–480.
- Map sections.Reasoning (including "does not automatically answer the consideration question in every jurisdiction"): supported, C&M pp. 477–480.
- Map learning.topics (all five): supported, C&M pp. 477–480.
- CTR-035 Parties, Procedural History, Material Facts, Issue: supported, C&M pp. 477–480.
- CTR-035 Holding (no mutual mistake; voluntary surrender effective; no interval required): supported, C&M pp. 477–480; the concurrence detail is not in the excerpt.
- CTR-035 Reasoning, paragraphs 1–3: supported, C&M pp. 477–480. Paragraph 4 (the gift analysis) is not in the excerpt.
- Cold Call plain 0.1, 2.0, 2.1, 3.0, 3.2 (all three), 5.3: supported, C&M pp. 477–480. For 5.3, absence of protest is not conclusive: supported as an inference from § 175 comment c ("All attendant circumstances must be considered") and C&M p. 481.
- Flowchart node f: supported.

Austin
- Map summary: supported, C&M pp. 488–491.
- Map notes (the vote, the judges, the majority's test): supported, C&M pp. 489, 492; the date is not in the excerpt.
- Map sections.Parties, Material Facts, Procedural History, Issue, Holding, Reasoning: supported, C&M pp. 487–492.
- Map learning.topics modification, assent, governing-law, rescission: supported, C&M pp. 489–492.
- CTR-036 Parties, Procedural History, Material Facts, Issue: supported, C&M pp. 487–491.
- CTR-036 Holding: supported, C&M pp. 489–491 (for "vendors it reasonably regarded as unqualified," the court's words are "unfamiliar or dissatisfied," and approved vendors were those "inspected and found satisfactory"; the meaning is close enough).
- CTR-036 Reasoning, all four paragraphs: supported, C&M pp. 489–492.
- Takeaway: supported, C&M pp. 489–491.
- Cold Call plain 2.2, 3.0 (second entry), 3.1, 4.2, 5.0, 6.0, 6.1 (first entry): supported, C&M pp. 488–492, § 1-103(b), § 2-209 comment 2.
- Cold Call plain 5.2 ("all seven judges accepted" the doctrine): supported as an inference. The majority calls the law "clear and … not disputed," and the dissent disputes only its application as a factual question (C&M pp. 489, 491).
- R&A restatement-175, restatement-176, ucc-2-209, ucc-1-103: verbatim match with the `sel.txt` black letter. The 2-209 entry shows the black letter only; the good-faith requirement is in comment 2, which the entry does not reproduce.

Flowchart K-20, other nodes and paths
- Node a (label, detail, edges): supported, apart from the source tag (A-28).
- Node c ("Was the sales modification made in good faith?", detail, edges to e and g): supported, `sel.txt` § 2-209(1)–(4) and comment 2. The g branch depends on A-13 for waiver and reliance.
- Node d (signed by the party against whom enforcement is sought or by that party's agent; removes an objection based solely on lack of consideration; a writing that does not comply goes back to b): supported, supp. p. 9.
- Node e label and Austin sentence: supported, C&M pp. 489–491 (see A-15 for the omitted element).
- Paths tested. Alaska Packers facts (a→b→g): correct. Austin facts (a→c→g on bad faith, or a→c→e→h): either path gives the correct outcome. A consumer facing a merchant-form no-oral-modification clause that was not separately signed (a→c→e→f): correct. A signed New York writing (a→d→e): correct. Martinez-Gonzalez-type reasonable alternatives (e→f): correct. Watkins facts (a→b→"Same duty only"→g): wrong (A-12). A § 89(c) reliance case (b→g): incomplete (A-12, A-13). Austin-type duress with a delayed or absent protest (e→h): incomplete (A-14).

---

## Part D. Prior corrections (17 November): corrected text re-read

- Timeline 'modification' title, question, guide, now (the `now` field is challenged at A-11 for a defect the correction did not touch), and the effect, note and context fields of steps 0, 1, 2, 3 and 4: re-read. Apart from A-09, A-10, A-11 and A-18 (fields outside the registered changes, or a defect the correction did not address), the corrected text is accurate.
- Timeline 'modification' step 4 note ("The threatened supply cutoff left no timely substitute or adequate breach remedy, making the modification voidable for duress."): accurate as a description of the case; read together with its context field, it does not state a general test.
- Timeline 'duress-influence' summary and Austin step 1: accurate, C&M pp. 489–491.
- CTR-034, CTR-035 and CTR-036 editorial clean-ups (running heads; "in order to" → "to"): no change in substance.
