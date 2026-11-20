# OP-CT-10 comparison: Contracts Class 10 (definiteness, precontractual liability, preliminary agreements)

Reader and challenger: one worker. Sources checked: C&M printed pp. 190–191, 326–327, 333–370 (the extract's pp. 189 and 328–332 were read as context only; Hoffman v. Red Owl, pp. 328–331, is not assigned); supplement p. 21 (French Civil Code art. 1112, 2016 ordinance translation); slides ct10-slides.txt (21 slides); Selections: Restatement (Second) §§ 33, 34, 352, 362 and UCC §§ 2-204, 2-305 with comments. Atlas text read: ct10-surfaces.md, prior-corrections.json, and read-only repository data for charts K-18 and K-19 (`tools/flowcharts/data/contracts.json`), the `incomplete-bargains` timeline (`tools/r19/data/timelines.json`), and map nodes `note-tribune-types`, `french-negotiations`, `precontractual-liability`, `preliminary-agreements`, `definiteness`, `gap-filling`, `note-keystone`, `ucc204` (`src/data/seedData/nodes-45978ecb29/`).

Page mapping was confirmed from printed running heads: "1-350" PDF 235 = p. 190; "351-700" PDF 28 = p. 333, PDF 38 = p. 343, PDF 64 = p. 369; the offsets in the instructions hold throughout.

The prior corrections (timeline title, question, guide, `now`, effects, Dixon note and context, Sun Printing fate and review sources) were checked against the sources. They are accurate and are not re-reported. One related timeline field that they left unchanged (the `ucc204` step's `turn` and `object`) is reported in finding 14.

## (a) Coverage

The five principal cases with briefs (Dixon, Cyberchron, Channel Home, Sun Printing, Oglebay) each have a map entry, an effective brief, a takeaway, a Cold Call narrative, a timeline step, a chronology step and at least one flowchart node. Their facts, procedural posture and dispositions are generally accurate and much more detailed than the edited excerpt. Many details come from the full opinions and are not in the assigned excerpt, so they could not be verified here: in Dixon, the plaintiffs' names, the dates, the HOLA preemption holding, the certification remark and the footnote numbering; in Cyberchron, the termination-liability caps, Swerdloff and Autotrol; in Channel, the $25,000 figure, the 70,400 square feet, the 25-year term, the Rule 65(a)(2) consolidation and the statute-of-frauds ruling; in Sun Printing, the April 17, 1923 date and the reserved "arbitrary refusal" point; in Oglebay, the $7.41, $5.00, $5.90 and $7.44 figures and the subpoena footnote. None of these is reported as wrong.

Teachers Insurance v. Tribune has no brief. It is taught through the `note-tribune-types` and `preliminary-agreements` nodes, the lecture-notes record (slides 13–15) and K-18 node b. This matches the sources: the casebook prints only the Second Circuit's summary of Tribune (Adjustrite, p. 190), and slide 14 quotes the opinion. The node's statement that "The full ... Tribune opinion is a later SUPP assignment" conflicts with the syllabus, which lists Tribune under Class 10, but the Class 10 supplement page contains only art. 1112. The coordinator should check where the full opinion is assigned.

French art. 1112 has a map node, a timeline step and a lecture note. The node misstates the remedy limit; see finding 15.

Assigned material that no surface teaches is listed in (c): the full Tribune Type II rule, restitution and misrepresentation in failed negotiations, the meaning of bad faith in negotiation, § 2-204(3) itself, Restatement §§ 33(3) and 34, restitution after an indefinite agreement, the p. 360 Problem, the two kinds of contractual incompleteness, the deal-breaker note, the scope of the Cyberchron promise, and Dixon's treatment of agreements to negotiate.

## (b) Errors in existing text

Findings that would change an exam answer come first. Each finding gives the surface and field, the current text, a verdict, a counterexample, the pinpoint, and a minimal replacement.

### 1. Dixon: definiteness and the opportunism condition (MISSTATES HOLDING)

Surfaces: `dixon` **Map entry: summary**; **Map entry: sections.Holding**; **Map entry: sections.Reasoning**.

- Current text (summary): `was too indefinite to be a contract to modify, but definite enough to support promissory estoppel once the borrowers defaulted at its direction and the lender used that default to foreclose`
- Current text (Holding): `The promise must be definite enough to show a commitment but need not be comprehensive enough to be an offer that could ripen into a contract. A promise to consider borrowers for a modification, conditioned on their defaulting and supplying financial information, was sufficiently definite when they took those steps in reasonable reliance and the lender then used the default to foreclose.`
- Verdict: MISSTATES HOLDING. The court did not hold the promise definite enough. It said Massachusetts requires a promise that is a commitment and is "sufficiently definite and certain in its terms to be enforceable" (p. 334). It said that standard was likely not met here ("at least to a degree likely not met in the present case", p. 336). It reconciled the tension with § 90 by relying on Massachusetts cases that enforce "even an indefinite promise made during preliminary negotiations where the facts suggest that the promisor's words or conduct were designed to take advantage of the promisee" (p. 336; Greenstein and Cohoon, p. 337). The decisive fact is therefore the exploitation of the induced default. The Atlas presents it as one of the facts that made the promise definite.
- Counterexample: the bank promises to consider the borrowers for a modification and asks for financial information, but does not tell them to stop paying. They default on their own, and the bank later forecloses on an unrelated earlier default. Under the Atlas wording, the promise is "sufficiently definite" and the claim proceeds. Under Dixon's reasoning, an indefinite promise without the take-advantage pattern fails the Massachusetts definiteness requirement.
- Pinpoint: C&M pp. 334, 336–339.
- Replacement (summary): `was too indefinite to be a contract to modify, and probably too indefinite for Massachusetts's usual definiteness requirement, but could still support promissory estoppel because the lender's conduct was designed to take advantage of the borrowers: it induced the default it then used to foreclose`
- Replacement (Holding, the two sentences only): `Massachusetts requires a promise that shows a commitment and is definite, although the Restatement does not require a promise comprehensive enough to be an offer. The promise here was likely not definite enough under that standard, but Massachusetts courts enforce even an indefinite promise made during preliminary negotiations when the promisor's conduct was designed to take advantage of the promisee, and the promise to consider the borrowers for a modification if they defaulted and supplied financial information fit that pattern once they took those steps in reasonable reliance and the lender used the default to foreclose.`
- Reasoning field: after `not a promise comprehensive enough to be an offer.` add: `He acknowledged that Massachusetts still insists on a definite promise, probably not met here, and resolved the tension through cases enforcing indefinite promises where the promisor's conduct was designed to take advantage of the promisee.`

### 2. Dixon rule line and chronology step: the opportunism condition is missing (MISSING CONDITION)

Surfaces: `dixon` **Effective brief CT-CB-0333: rule**, and **Chronology 'course-chronology-0' step 585** (same text).

- Current text: `can support a promissory-estoppel claim despite indefinite modification terms, with relief aimed at restoring the position lost through reliance.`
- Verdict: MISSING CONDITION. The rule omits the fact on which the court relied, namely that the bank used the default it had induced to start foreclosure (pp. 337–339). It also blurs the remedy. The court said damages "appropriately will be confined to the value of their expenditures in reliance" (p. 339). Restoring non-default status is the editors' report of a suggestion in a footnote (Note 2, p. 339).
- Counterexample: the same facts as in finding 1. The rule as written says the claim lies whenever a promise to consider induces default.
- Pinpoint: C&M pp. 336–339.
- Replacement (44 words): `As a federal court predicted Massachusetts law, a lender's indefinite promise to consider a borrower for a loan modification, which induced the borrower to default, can support promissory estoppel where the lender then used that default to foreclose; recovery is confined to reliance expenditures.`

### 3. Dixon: the "honest consideration" framing misstates the wrong and the harm (MISSTATES HOLDING)

Surfaces: `dixon` **Effective brief CT-CB-0333: Reasoning**; **Cold Call** episode-1 paragraph 3 and episode-3 title and paragraph 2; **Cold Call plain-English sentences** at 0.2.

- Current text (brief Reasoning): `The bank allegedly induced the Dixons to stop paying and then took advantage of the resulting default without honestly considering the promised modification. Enforcing a duty to deal honestly after inducing that change of position does not compel either side to accept unspecified loan terms.`
- Current text (Cold Call episode-1): `The claimed injury arose from entering default in reliance before honest consideration occurred.`
- Current text (≈ at 0.2): `Their harm was that, trusting the bank, they stopped paying and fell into default, and the bank then never honestly considered them for a modification.`
- Current text (Cold Call episode-3 title): `Young treats an honest-consideration promise separately from an unfinished bargain`
- Current text (Cold Call episode-3): `Requiring honest dealing after a requested detrimental change did not compel either side to accept unknown loan terms.`
- Verdict: MISSTATES HOLDING. The court said "there is no allegation that its promise was dishonest" (p. 338) and that "The promisor need not have acted fraudulently, deceitfully, or in bad faith" (p. 336). The harm it identified was that the default "left them considerably worse off, for by entering into default they became vulnerable to foreclosure" (p. 334), and that the bank "had taken advantage of their default status by initiating foreclosure" (p. 339). The duty it read into the promise was "an undertaking on [its] part not to [foreclose] based upon facts coming into existence solely from" the promise (p. 338). The Atlas wording suggests that the claim requires dishonesty, or that the injury is the absence of a sincere review. A student would then misstate both the element and the reliance measure.
- Counterexample: the bank does review the file in good faith and declines a modification, but forecloses on the arrears created by the payments it told the borrowers to skip. On the Atlas framing, honest consideration occurred, so there is no claim. On the court's framing, the foreclosure on the induced default is the actionable conduct.
- Pinpoint: C&M pp. 334, 336, 338–339.
- Replacements:
  - brief Reasoning: `The bank allegedly induced the Dixons to stop paying and then took advantage of the resulting default by starting foreclosure. The court read the promise to consider them as carrying, as a matter of fair dealing, an undertaking not to foreclose on facts created solely by that promise; enforcing that undertaking does not compel either side to accept unspecified loan terms. The complaint did not allege that the promise was dishonest.`
  - Cold Call episode-1: `The claimed injury arose from entering default in reliance, which exposed them to the foreclosure the bank then began.`
  - ≈ 0.2: `Their harm was that, following the bank's instructions, they stopped paying and fell into default, which exposed them to the foreclosure the bank then started.`
  - episode-3 title: `Young treats a promise to consider separately from an unfinished bargain`
  - episode-3: replace `honest dealing` with `fair dealing`.

### 4. K-18 node d: the Dixon route cannot reach the source's result when the decisive fact changes (CHANGES RESULT)

Surface: **Flowchart K-18 (Did negotiations create an obligation before signature?) node d**, field `detail`.

- Current text: `Ask if the assurance foreseeably caused the change and whether justice requires relief.`
- Verdict: CHANGES RESULT. The route test (section f, Dixon) shows that the chart sends an indefinite promise to consider, without exploitation, to node g ("Compensate supported reliance"). Dixon holds that Massachusetts would enforce such a promise only where the promisor's conduct was designed to take advantage of the promisee.
- Pinpoint: C&M pp. 334, 336–339.
- Replacement: `Ask if the assurance foreseeably caused the change and whether justice requires relief. Some states also demand a definite promise: Dixon enforced an indefinite promise to consider only because the bank's conduct was designed to take advantage of the borrowers, inducing the default it then used to foreclose.`

### 5. K-18 node c: the Channel route tests only definiteness (CHANGES RESULT)

Surface: **Flowchart K-18 ... node c**, fields `label`, `detail` and edge label.

- Current text (label): `Was a negotiation duty sufficiently definite?`
- Current text (detail): `Channel Home’s signed promise to withdraw the property and negotiate exclusively was sufficiently definite for possible enforcement, supported by the tenant’s letter useful for financing.`
- Verdict: CHANGES RESULT. Channel asks three separate questions: whether both parties manifested an intention to be bound, whether the terms are sufficiently definite, and whether there was consideration (p. 349). Definiteness also depended on reading the exclusivity promise "in the context of the detailed letter of intent (which covers most significant lease terms)" (p. 350). The node's question admits only definiteness, so the chart enforces a negotiation promise that lacks intent or consideration (section f, Channel).
- Counterexample: an owner signs a one-line note saying "I will negotiate only with you," and the prospective tenant gives nothing in return and has not asked for anything. The chart reaches node f ("Enforce the negotiation commitment"). Under Channel's test the contract claim fails for lack of consideration, and the court did not decide whether promissory estoppel would fill the gap (p. 349 n.1).
- Pinpoint: C&M pp. 349–351.
- Replacement label: `Did both sides intend to be bound by a definite negotiation promise supported by consideration?`
- Replacement detail: `Channel Home asks three questions: intent to be bound (the letter and both sides' later conduct), definiteness (the exclusivity promise read with a detailed letter covering most significant lease terms), and consideration (the tenant's signed letter, which the owner wanted for financing). That promise did not itself conclude the lease.`
- Replacement edge label (to h): `No intent, too indefinite, or no consideration`

### 6. K-19 node a and node d edge: for goods, a price "left to be agreed" goes to the wrong ending (CHANGES RESULT)

Surface: **Flowchart K-19 (Can a court supply the missing term?)** node a (detail and edge `Future agreement reserved`) and node d (edge `Open point reserved or no applicable default`). Node a is not printed in the surfaces file; it was read in `tools/flowcharts/data/contracts.json`.

- Current text (node d edge): `Open point reserved or no applicable default`
- Current text (node a edge): `Future agreement reserved`
- Verdict: CHANGES RESULT. UCC § 2-305(1)(b) addresses exactly the case where "the price is left to be agreed by the parties and they fail to agree": if the parties intended to be bound, the price is a reasonable price at the time for delivery. No contract exists only where "the parties intend not to be bound unless the price be fixed or agreed" (§ 2-305(4)). Comment 1 says the Article "rejects ... the formula that 'an agreement to agree is unenforceable'" for cases within subsection (1), and comment 2 makes intent a question for the trier of fact. Node a offers "Future agreement reserved" (to e) and "Qualifying sale with open terms" (to d) without saying which to take when both describe the facts. Node d's exit "Open point reserved" sends a reserved price to e, the opposite of § 2-305(1)(b).
- Counterexample: Sun Printing's contract entered into today. It is a sale of goods (newsprint), the price and its duration were "to be agreed," and the parties performed for four months on the seller's binding form. The chart reaches e ("The court cannot choose the bargain") by either path. Under § 2-305(1)(b) and § 2-204(3), the outcome turns on a finding of intent to be bound; if intent is found, a reasonable price is supplied.
- Pinpoint: Selections, UCC § 2-305(1)(b), (4) and comments 1–2; § 2-204(3) and comment; C&M pp. 364 and 368.
- Replacements:
  - node a detail, add: `For a sale of goods, take the sale branch even if price was left to be agreed: § 2-305(1)(b) supplies a reasonable price when the parties intended to be bound.`
  - node a edge (to e): `Future agreement reserved (outside sales of goods)`
  - node d edge (to e): `Parties intended no contract unless the term was agreed (§ 2-305(4)), or no applicable default`

### 7. K-18 node f: the remedy for breach of a negotiation duty is stated as settled (OVERSTATED)

Surface: **Flowchart K-18 ... node f**, field `detail`.

- Current text: `A negotiation duty does not confer the final transaction’s benefits as if it were concluded.`
- Verdict: OVERSTATED. The editors present this as a split. Goodstein (N.Y. 1992) refuses lost expectation because a court cannot know what agreement would have been reached. Venture Associates (7th Cir. 1996, Posner, J.) holds that "if the plaintiff can prove that had it not been for the defendant's bad faith the parties would have made a final contract," the lost benefit is recoverable as consequential damages, and that the difficulty of proof "goes to the practicality of the remedy, not the principle of it" (pp. 351–352). The casebook also notes that "a court might even grant specific performance for breach of a promise to negotiate" (p. 352). Channel itself held the promise "sufficiently definite to be specifically enforced" (p. 350). The `channel-home` map notes already describe the split, so node f contradicts the Atlas's own map entry.
- Counterexample: on remand Channel proves that, but for Grossman's breach, a lease on the letter-of-intent terms would have been signed. Under Venture Associates, lost profits are recoverable as consequential damages, but the chart says the final transaction's benefits are unavailable.
- Pinpoint: C&M pp. 350–352.
- Replacement: `A negotiation duty does not by itself bind the parties to the final transaction. Courts divide on damages: Goodstein refuses lost expectation because the final terms cannot be known, while Venture Associates allows the lost benefit as consequential damages if the claimant proves a final contract would have been made but for the bad faith.`

### 8. Channel: Channel's spending was evidence of intent, not "reliance" (MISSTATES HOLDING)

Surface: `channel-home` **Map entry: learning.topics**, key `reliance`.

- Current text: `Channel's expenditures on draft leases, plans and equipment during negotiations were central to the court's willingness to enforce the letter of intent.`
- Verdict: MISSTATES HOLDING. The court cited both sides' preparatory conduct as evidence "that the parties intended this promise to be binding" (p. 350). It found consideration in Channel's "execution and tender of the letter of intent," which was of value to Grossman's financing (p. 350). It expressly did not reach promissory estoppel (p. 349 n.1). Labeling Channel's spending as reliance central to enforcement invites a student to treat Channel as a promissory estoppel case.
- Counterexample: a prospective tenant spends heavily on plans, but the owner never asked for a letter and received nothing of value. A student following the Atlas wording would expect enforcement under Channel, but Channel's contract theory needs consideration.
- Pinpoint: C&M pp. 349 n.1, 350.
- Replacement: `Channel's preparations (draft lease, plans, equipment) were evidence that the parties intended to be bound; the court did not reach promissory estoppel, and consideration was Channel's signed letter, not its spending.`

### 9. Channel: definiteness depended on the detailed letter (MISSING CONDITION)

Surface: `channel-home` **Map entry: sections.Reasoning**.

- Current text: `Grossman’s specific, discrete undertaking to take the property off the market and negotiate exclusively, whose breach a court could identify,`
- Verdict: MISSING CONDITION. The court held the promise sufficiently definite when "viewed in the context of the detailed letter of intent (which covers most significant lease terms)" (p. 350). Without that context, a bare exclusivity promise may give a court no framework against which to judge good-faith negotiation.
- Pinpoint: C&M p. 350.
- Replacement: `Grossman’s specific, discrete undertaking to take the property off the market and negotiate exclusively, read in the context of a detailed letter of intent covering most significant lease terms, whose breach a court could identify,`

### 10. Oglebay: three surfaces drop the conditions that permitted the court to supply a price and order performance (MISSING CONDITION)

Surfaces: `oglebay` **Cold Call plain-English sentences** at 2.2 and 4.2; **Takeaway (tools/r19/data/takeaways.json)**.

- Current text (≈ 2.2): `When a market or "third-party" price measure never materializes, a court may set a reasonable price to complete the contract, just as Uniform Commercial Code § 2-305 does for sales of goods.`
- Current text (≈ 4.2): `A broken price-setting method in a real contract can be repaired by a court; that is different from a case where the parties never actually agreed.`
- Current text (Takeaway): `When the parties clearly meant a long-term deal to continue and their agreed price formulas stop working, a court can set a reasonable price itself and can order the parties to keep performing and keep negotiating.`
- Verdict: MISSING CONDITION. The court supplied a rate only because the trier of fact found that "the parties intended to be bound despite the failure of the pricing mechanisms" (p. 367). It quoted Restatement § 33 comment e, which applies where the parties "intend to conclude a contract" (p. 368). § 2-305(1) likewise applies only "if they so intend", and § 2-305(4) and comment 4 describe parties whose chosen mechanism was a condition of any contract. Armco's argument was precisely that it never consented to be bound by a contract whose mechanisms had failed (p. 367). The ≈ at 4.2 treats "a real contract" as enough. The ≈ at 2.2 omits intent altogether. The takeaway omits the reason for specific relief: damages over the remaining term would be too speculative (p. 369).
- Counterexample: a contract fixes price by an index, and one party proves that it agreed to the deal only on the condition that the index price applied (compare § 2-305 comment 4, a named expert whose judgment is "an essential condition to the parties' intent to make any contract at all"). The index then disappears. The ≈ sentences say that a court repairs the price, but under § 2-305(4) and Oglebay's intent question there is no contract.
- Pinpoint: C&M pp. 367–369; UCC § 2-305(1), (4), comment 4.
- Replacements:
  - ≈ 2.2: `When the parties intended to stay bound and a market or "third-party" price measure never materializes, a court may set a reasonable price, as Uniform Commercial Code § 2-305(1)(c) does for sales of goods.`
  - ≈ 4.2: `When the parties meant to stay bound even if their price-setting method broke, a court can repair it; that differs from a case where the parties never agreed, or agreed only if the method worked.`
  - Takeaway (2 sentences, 50 words): `When the parties intended a long-term deal to continue even after their agreed price formulas stopped working, a court can set a reasonable price on the evidence. Because damages over the remaining decades would be too speculative, it can also order the parties to keep performing and to negotiate, then mediate, future rates.`

### 11. Sun Printing: the Holding's opening sentence states the rule without its limits (OVERSTATED)

Surface: `sun-printing` **Map entry: sections.Holding**.

- Current text: `An agreement that leaves essential terms to future agreement is not enforceable as to those terms, and a court may not supply them by construction.`
- Verdict: OVERSTATED. Cardozo's own opinion qualifies the rule. If "price and nothing more had been left open," the buyer might hold an option at the stated maximum (p. 354). The ruling was "prima facie" on the complaint, and the pleader could amend to allege that the Canadian price was constant (p. 356). The Atlas's own Notes field warns that the case "is not a statement that every open price term defeats formation". For goods today, § 2-305(1)(b) supplies a reasonable price if the parties intended to be bound. Oglebay supplied a rate the parties had agreed to "mutually agree upon" (pp. 366–368). As an unqualified black-letter rule, the sentence would yield the wrong answer in Oglebay and in any intended goods contract.
- Pinpoint: C&M pp. 354–356, 366–368; UCC § 2-305(1)(b).
- Replacement: `Under New York common law before the UCC, an agreement that leaves essential terms to future agreement, without an agreed standard for fixing them, is not enforceable as to those terms, and a court may not supply them by construction.`

### 12. Cyberchron: the elements are attributed to a case not in the excerpt (WRONG CITATION as against the assigned excerpt)

Surface: `cyberchron` **Map entry: sections.Reasoning**.

- Current text: `On estoppel the court applied the elements stated in Ripple’s of Clearview.` and `but the court treated Ripple’s as stating the rule and found the injury unconscionable in any event`
- Verdict: WRONG CITATION as against the assigned excerpt. The excerpt attributes the three New York elements to Arcadian Phosphates, Inc. v. Arcadian Corp., 884 F.2d 69, 73 (2d Cir. 1989) (quoting Esquire Radio). It notes that "an unconscionable injury is sometimes required" and that some courts add the injustice requirement (Werner v. Xerox; § 90). The court then says, "In any event, ... we regard the injury ... as unconscionable" (p. 342). Ripple's of Clearview does not appear in the excerpt. The court did not choose between the formulations; it found that both were satisfied. The effective brief states this correctly ("Without resolving the differences among those formulations").
- Pinpoint: C&M p. 342.
- Replacement: `On estoppel the court applied the three New York elements as stated in Arcadian Phosphates v. Arcadian Corp. (quoting Esquire Radio).` and `but the court did not decide whether that requirement applies, because it found the injury unconscionable in any event`

### 13. Cyberchron: the damages measure is stated as a holding on lost profits and as labor and materials only (OVERSTATED; MISSTATES HOLDING)

Surfaces: `cyberchron` **Map entry: summary**; **Map entry: sections.Holding**; **Map entry: learning.topics** key `reliance-interest`; **Takeaway**.

- Current text (summary): `but not expenses incurred before the promise or lost profits.`
- Current text (Holding): `Recovery is limited to reliance damages, which include`
- Current text (learning.topics `reliance-interest`): `Damages were confined to out-of-pocket labor and materials incurred after the promise, a pure reliance-interest measure.`
- Current text (Takeaway): `The remedy is the money spent in reliance, including properly attributed overhead, not the profits of the deal that never happened.`
- Verdict: The `reliance-interest` entry MISSTATES HOLDING, because the Second Circuit vacated the labor-and-materials award so that reasonable overhead and reliance-caused shutdown costs could be recovered (p. 344). The summary, Holding and Takeaway are OVERSTATED. The trial court denied lost profits, and "Cyberchron does not contend for benefit-of-the-bargain damages on this appeal" (p. 344), so the Second Circuit did not hold that promissory estoppel excludes expectation. Restatement § 90(1) says only that the remedy "may be limited as justice requires."
- Counterexample: an exam question asks whether promissory estoppel can ever yield expectation damages. A student citing the Atlas would say that Cyberchron holds it cannot. The case decided no such point.
- Pinpoint: C&M pp. 342, 344; Restatement § 90(1).
- Replacements:
  - summary: `but not expenses incurred before the promise; the trial court denied lost profits, and Cyberchron did not seek benefit-of-the-bargain damages on appeal.`
  - Holding: `Cyberchron sought only reliance damages on appeal, and those include`
  - `reliance-interest`: `Damages measured the reliance interest: labor and materials after the promise, plus reasonable overhead and reliance-caused shutdown costs on remand, but not pre-promise expenses.`
  - Takeaway, second sentence: `The court awarded the money spent in reliance after the promise, including properly attributed overhead and shutdown costs; Cyberchron did not seek the deal's profits on appeal.`

### 14. Sun Printing and the UCC: "statutory answer" and "displaces" overstate the effect of the UCC (OVERSTATED)

Surfaces: `sun-printing` **Map entry: learning.topics** key `ucc204`; timeline `incomplete-bargains` step `ucc204` (fields `turn` and `object`, in `tools/r19/data/timelines.json`).

- Current text: `is the statutory answer to Sun Printing's refusal to fill the gap.` and, in the timeline step, `"turn": "displaces", "object": "Sun Printing's rule"`
- Verdict: OVERSTATED. The learning topic states § 2-204(3)'s two conditions correctly but calls the section the "answer," as if Sun Printing would now come out the other way. Under §§ 2-204(3) and 2-305(1), (4), the result would depend on a finding that the parties intended to be bound without agreeing on price and duration. The prior correction to the Sun Printing step's `fate` already says this. The `ucc204` step's turn still says "displaces", which contradicts the corrected `fate` of the step immediately before it.
- Pinpoint: UCC § 2-204(3) and comment; § 2-305(1), (4) and comments 1–2.
- Replacements: learning topic: `is the statutory route for goods; it would change Sun Printing's result only if the trier of fact found that the parties intended to be bound without agreement on price and duration (§ 2-305(1)(b), (4)).` Timeline: `"turn": "qualifies"`, `"object": "Sun Printing's rule, for goods contracts the parties intended to be binding"` (or another existing turn value that does not mean wholesale displacement).

### 15. French art. 1112: the remedy limit adds a clause absent from the assigned translation (UNSUPPORTED BY ASSIGNED SOURCES)

Surface: map node `french-negotiations`, field `notes` (`src/data/seedData/nodes-45978ecb29/00392-french-negotiations-de0ea520f6.json`). It is not printed in the surfaces file but is cited by K-18 node h and the timeline.

- Current text: `excludes compensation for the benefits expected from the unmade contract and for the lost chance of obtaining those benefits.`
- Verdict: UNSUPPORTED BY ASSIGNED SOURCES. The assigned translation of the 2016 ordinance (supplement p. 21; slide 17) excludes only "the loss of benefits which were expected from the contract that was not concluded." It says nothing about a lost chance. The loss-of-chance exclusion appears to come from the article as later amended (by the 2018 ratifying law, as I understand it; this is outside the assigned sources and should be verified before any mention is kept). This should be treated as a version mismatch. As written, the node attributes to the assigned text a limit that the text does not contain.
- Counterexample: on a comparison question ("Would Channel recover lost opportunities under the assigned French text?"), the Atlas answer is a flat no, whereas the assigned text leaves lost-chance recovery unaddressed.
- Pinpoint: supplement p. 21.
- Replacement: `excludes compensation for the loss of benefits expected from the contract that was not concluded.` If the current French text is wanted, add as a separate sentence: `The article as later amended also excludes the lost chance of obtaining those benefits; the assigned translation predates that change.`

### 16. Oglebay: the evidence of intent is attributed to the extensions (OVERSTATED)

Surface: `oglebay` **Map entry: learning.topics**, key `course-dealing`.

- Current text: `Twenty-three years of extensions, amendments and rate-setting between the parties supplied the evidence that they intended to remain bound after the pricing mechanisms failed.`
- Verdict: OVERSTATED. The court identified the evidence of intent as "the long-standing and close business relationship of the parties, including joint ventures, interlocking directorates and Armco's ownership of Oglebay stock," together with the contract's recognition of Armco's "vital and unique interest" in a dedicated fleet (p. 367). The trial court used course of dealing to set the rate (p. 368). The four modifications appear in the editors' bracketed introduction (p. 366), and Note 2 asks "What, if anything, should be made of the four contract modifications?" (p. 369), which treats their significance as an open question.
- Pinpoint: C&M pp. 366–369.
- Replacement: `The court relied on the long and close relationship (joint ventures, interlocking directorates, Armco's stock in Oglebay) and the contract's recognition of Armco's need for a dedicated fleet; course of dealing helped set the rate, and the editors ask what the four extensions show.`

### 17. Lower-severity text defects

These do not change a legal result.

- `oglebay` **Map entry: sections.Material Facts**: `it failed: for 1985 the published rate was $7.41 per gross ton and Armco paid only $5.00, then the journal stopped publishing the rate and independent operators’ rates could not be obtained.` The sentence is a broken fragment. Replace `it failed:` with `Both mechanisms then failed:`. The 1985 figures are not in the assigned excerpt; the excerpt says no rate was published after 1985 and that independent rates were no longer publicly available (p. 367).
- `sun-printing` **Map entry: sections.Procedural History**: `Special Term ruled for the seller` and `affirmed Special Term’s judgment for the seller`. These conflict with the effective brief, which says Special Term denied the buyer's motion for judgment on the pleadings. The excerpt shows only that "that of the Special Term [was] affirmed" (p. 356). Replace them with `Special Term denied the buyer’s motion for judgment on the pleadings` and `affirmed Special Term’s order`.
- `channel-home` **Map entry: learning.topics** `precontractual-liability`: `Channel Home is the leading case recognizing an enforceable agreement to negotiate in good faith before any final contract exists.` "Leading case" is unsupported by the assigned sources (UNSUPPORTED BY ASSIGNED SOURCES). The court said it was following jurisdictions that had already so held (p. 349). Replace with: `Channel Home predicted that Pennsylvania would follow other jurisdictions in enforcing an agreement to negotiate in good faith that meets the requirements of a contract.`
- `channel-home` **Map entry: sections.Material Facts** and **sections.Reasoning**: `exchanged draft leases` and `the exchange of draft leases`. In the excerpt, only Channel sent a draft lease; Grossman's side sent title and site documents (pp. 347–348, 350). Replace them with `Channel sent a draft lease and Grossman supplied exhibits` or similar wording.
- Timeline `incomplete-bargains` step `cyberchron`, field `note`: `New York promissory estoppel yields reliance damages, including attributable overhead, when talks never produced the contemplated contract.` The note omits the clear and unambiguous promise (MISSING CONDITION). Replace with: `A clear and unambiguous promise made during talks that never produced the contemplated contract supported New York promissory estoppel; recovery was reliance costs after the promise, including attributable overhead.`

## (c) Teaching gaps

These are assigned materials that no surface teaches, each with a proposed home and draft text. They are numbered separately from the errors above.

1. **The full Tribune Type II rule** (p. 190; slides 13–15). The Atlas states that Type II binds parties to negotiate. It omits that a party "has no right to demand performance of the transaction" and that the parties "may abandon the transaction as long as they have made a good faith effort to close the deal and have not insisted on conditions that do not conform to the preliminary writing." This sentence is the breach test. Home: `note-tribune-types` map `notes`, and K-18 node f `detail`. Draft: `Under a Type II commitment neither side can demand the final transaction; either may walk away after a good-faith effort to close, but insisting on conditions that do not conform to the preliminary writing is a breach.`
2. **Restitution and misrepresentation when negotiations fail** (pp. 326–327; slide 13). No surface teaches Songbird Jet, Precision Testing or Markov, and K-18 has no restitution or misrepresentation route. Home: `precontractual-liability` map `notes`, and K-18 node h `detail`. Draft: `Restitution reaches benefits conferred during negotiations, but services that are the ordinary grist of negotiating or that protect the claimant's own interests are rarely recovered (Songbird Jet); recovery succeeded where the work was designed to benefit the other party (Precision Testing). A party that misrepresents its intention to come to terms is liable for reliance losses, including lost profits caused by the deception (Markov).`
3. **What bad faith in negotiation means** (p. 352, Note 2, PSI Energy). Home: `channel-home` map `learning.topics` key `good-faith`, or `note-keystone` notes. Draft: `A duty to negotiate in good faith forbids trickery and certain forms of obduracy, but it does not require revealing strategy or reservation price, disclosing every useful fact, or forgoing other opportunities (PSI Energy); the notes leave open whether reneging on an agreed term or secretly negotiating with a rival is bad faith.`
4. **UCC § 2-204(3) itself.** The `ucc204` node describes only subsections (1) and (2), from earlier classes, and says that `The complete assigned statutory text and comments in SEL remain unprovided`, which is stale because the Selections print the section and comment. Home: `ucc204` map `notes`. Draft: `Subsection (3) is Article 2's definiteness rule: a contract for sale with open terms does not fail for indefiniteness if the parties intended to make a contract and there is a reasonably certain basis for an appropriate remedy; the comment adds that the more terms left open, the less likely a binding intent.`
5. **Restatement § 33(3) and § 34.** § 33(3) provides that open terms may show that no offer was intended. § 34(2)–(3) provides that part performance may remove uncertainty and that reliance may make a remedy appropriate even when uncertainty remains. These connect definiteness to Dixon and Cyberchron. Home: `definiteness` map `notes`. Draft: `Leaving terms open can itself show that no offer was intended (§ 33(3)); conversely, part performance may remove uncertainty, and reliance may justify a remedy even when the terms stay uncertain (§ 34(2)–(3)).`
6. **Restitution after an indefinite agreement** (p. 360, Note 6: Varney; Pyeatte). Home: `definiteness` map `notes`. Draft: `A party who confers a benefit while performing an agreement too indefinite to enforce may still recover restitution (Varney v. Ditmars; Pyeatte v. Pyeatte).`
7. **The assigned Problem on p. 360** (forbearance "for a reasonable time"). Home: the `definiteness` node notes, or a problem node if the Atlas keeps one per assigned problem. Draft: `The p. 360 Problem asks whether a promise conditioned on forbearing "for a reasonable time" is definite enough to enforce; terms such as "reasonable time" are usually definite because a court can fix them by an external standard (p. 353).`
8. **The functions of definiteness and Varney's "fair share of my profits"** (pp. 352–353). Home: `definiteness` map `notes`. Draft: `Definiteness lets a court decide whether a breach occurred and measure expectation; a promise of "a fair share of my profits" failed because the amount was pure conjecture (Varney v. Ditmars).`
9. **The two kinds of incompleteness** (pp. 361–362, Ayres and Gertner) and the five reasons parties leave agreements incomplete, which slide 10 maps onto Oglebay. Home: the lecture-notes `Oglebay Norton v. Armco` topic (as a separate sentence) or the `gap-filling` node notes. Draft: `Courts often fill missing terms with defaults, but they seldom repair a contract that simply failed to provide for a future contingency; Oglebay's failed price mechanism raises the second kind of incompleteness.`
10. **Deal breakers** (p. 190, Note 2). Home: `preliminary-agreements` map `notes`. Draft: `Some courts ask whether the open terms were "deal breakers"; a party can protect itself by stating during negotiations that every open term must be agreed before it is bound.`
11. **The scope of the Cyberchron promise and whether bad faith had to be proved** (p. 344, Note 1), plus the American default stated on pp. 344–345. Home: `cyberchron` map `learning.topics` key `precontractual`. Draft: `The enforced promise was the mid-July assurance that Cyberchron should proceed and would be paid while the weight issue was resolved; liability rested on promissory estoppel, so Cyberchron did not have to prove bad-faith negotiation, and American law otherwise leaves parties free to break off negotiations.`
12. **Dixon's treatment of agreements to negotiate** (pp. 335–336, 338). The court characterized the promise as closer to an agreement to negotiate, noted that Massachusetts treats such agreements as unenforceable without an agreed standard such as "good faith" or "best efforts," and declined to decide whether a good-faith duty applied because the Dixons had not alleged one. Home: `dixon` effective brief `Reasoning`. Draft: `The court saw the promise as closer to an agreement to negotiate, which Massachusetts courts usually refuse to enforce without an agreed standard of conduct; because the Dixons alleged no duty of good faith, the court did not decide one, and it limited recovery to reliance to avoid creating a general duty to bargain in good faith.`

## (d) Challenger tests of the highest-risk statements

Each statement below was tested against the text. The ones that failed are reported in (b).

| Statement tested | Test | Result |
|---|---|---|
| Dixon: the promise was "sufficiently definite" (Map Holding) | p. 336 says definiteness was "likely not met"; liability rests on take-advantage conduct | Fails (finding 1) |
| Dixon: the wrong was failing to "honestly consider" | p. 338: "no allegation that its promise was dishonest"; p. 336: no fraud or bad faith needed | Fails (finding 3) |
| Dixon: no fraudulent intent required (brief) | p. 336 (McLearn) | Passes |
| Dixon: recovery confined to reliance | p. 339 "confined to the value of their expenditures in reliance" | Passes; the rule-line wording is loose (finding 2) |
| Channel: three-part test (intent, definiteness, consideration) | p. 349 | Passes in the brief and Map Holding; fails in K-18 node c (finding 5) |
| Channel: consideration was the letter's value to Grossman | p. 350 | Passes |
| Channel: spending was "central" reliance | p. 349 n.1, p. 350 | Fails (finding 8) |
| Channel: no time limit means a reasonable time | p. 351 | Passes |
| K-18 f: a negotiation duty never yields the final deal's benefits | pp. 351–352 (Venture Associates; specific performance) | Fails as stated (finding 7) |
| Cyberchron: reliance period starts mid-July; earlier costs excluded | p. 343 | Passes |
| Cyberchron: overhead recoverable on a history of ongoing operations, without proof of an alternative project | p. 344 | Passes (the Map entry also correctly requires standard cost-accounting allocation) |
| Cyberchron: lost profits unavailable | p. 344, not sought on appeal | Overstated (finding 13) |
| Cyberchron: elements from Ripple's of Clearview | p. 342 cites Arcadian Phosphates | Fails against the excerpt (finding 12) |
| Cyberchron: "$162,824.10" versus ".19" note in the Cold Call | p. 342 prints .10; p. 343 components total .19 | Passes; the Atlas's reconciliation is right |
| Sun Printing: if only price were open, the buyer might hold an option | p. 354 | Passes (≈ at 3.0 keeps the distinction) |
| Sun Printing: open term on duration was as essential as price | p. 356 | Passes |
| Sun Printing: a general rule that open essential terms defeat the agreement | pp. 354–356; UCC § 2-305 | Overstated as an unqualified rule (finding 11) |
| Oglebay: intent to be bound is a question of fact | p. 367 | Passes in the Map Holding and brief; dropped in two ≈ sentences and the takeaway (finding 10) |
| Oglebay: $6.25 rate | p. 368: trial court "$6.00 ... with an additional rate of twenty-five cents" for self-unloaders; court of appeals "$6.25" | Passes; the brief's "$6 plus twenty-five cents" is the more precise wording |
| Oglebay: § 2-305 applied directly | p. 368 quotes § 33 cmt e, which cites § 2-305(1); shipping is a service | Passes where surfaces say "by analogy" (Cold Call, brief); the Map Holding's "as ... UCC § 2-305(1) ... recognize[s]" is acceptable |
| Tribune I: "preliminary only in form" | p. 190; slide 14 | Passes |
| French art. 1112 excludes lost chance | supplement p. 21 | Fails against the assigned translation (finding 15) |

## (e) Slide comparison for the lecture-notes record

Every topic in the lecture-notes record accurately reports its slides (slides 2–21; slide 12 is images only, as the record says). No classroom wording needs rewriting. Six slides use shorthand that drops a legal condition. For each, I propose keeping the note's wording and adding a separate sentence.

1. **"The requirement of definiteness"** (slide 5). The slide's second formulation, that the parties "must have reached agreement on all essential terms," is the older common-law test. Add: `Legal qualification: Restatement § 33(2) states the test functionally (a basis for determining breach and giving an appropriate remedy), and for sales of goods UCC §§ 2-204(3) and 2-305(1) allow a contract with open terms, including price, if the parties intended to contract and a reasonably certain basis for a remedy exists. The damages bullet is Restatement § 352 and the specific-relief bullet is § 362, which requires more certainty for an order than for damages (C&M p. 370, Note 4).`
2. **"Sun Printing & Publishing v. Remington Paper & Power"** (slides 6–7). Add: `Legal qualification: this is a pre-UCC New York decision; for a sale of goods today, § 2-305(1)(b) supplies a reasonable price when price is left to be agreed and the parties fail to agree, if they intended to be bound, and § 2-305(4) denies a contract only if they intended not to be bound until price was agreed.`
3. **"Oglebay Norton v. Armco"** (slides 8–10). This note is accurate. Slide 10's page reference "(366, 362)" points to the casebook's list of reasons for incompleteness (p. 362); the note could say so. Add: `Legal qualification: the court supplied a rate only after the trier of fact found the parties intended to remain bound despite the failed mechanisms, and it ordered negotiation and mediation because long-term damages would be too speculative.`
4. **"Possible legal effects of preliminary statements"** (slide 13). This note is accurate. Two of the slide's background rules need qualification. Add: `Legal qualification: the absence of a general duty to negotiate in good faith is the American common-law default (C&M pp. 344–345); the duty can be created by express agreement (Channel Home; Tribune Type II), and French art. 1112 imposes it by statute. Restitution for services rendered during negotiations is rarely granted unless the services were designed to benefit the other party (Songbird Jet; Precision Testing, pp. 326–327).`
5. **"Tribune I agreements"** (slides 14–15). This note is accurate. Slide 14's "(190)" refers to the casebook page, which prints the Second Circuit's summary rather than the quoted words, but the quotation is from Tribune itself and is correctly attributed. No slide defines Type II. Add: `Legal qualification: under a Tribune Type II commitment (C&M p. 190) the parties agree on major terms and commit to negotiate the rest in good faith within the agreed framework; neither can demand the final transaction, and either may abandon it after a good-faith effort, provided it has not insisted on conditions that do not conform to the preliminary writing.`
6. **"Channel Home Centers, Cyberchron and Dixon"** (slides 18–20). This note is accurate. Slide 18's first quoted paragraph is not in the casebook excerpt; it comes from the slide. Add: `Legal qualification: Dixon's "specific promise to consider" was enforced on a motion to dismiss, despite its likely indefiniteness under Massachusetts law, because the bank's conduct was designed to take advantage of the borrowers (inducing the default it used to foreclose), and any recovery was limited to reliance expenditures; in Cyberchron only reliance after the mid-July assurance was protected.`

The "Questions for every preliminary-agreement case", "French Civil Code Article 1112" and "Recap of formation" topics are accurate and need no qualification. The French note correctly omits any loss-of-chance clause, which shows that the error in finding 15 is in the map node, not the lecture notes.

## (f) Required route test

For each principal case, I entered its facts in every chart that cites it, recorded the path and the displayed result, and then changed one legally decisive fact. Node ids and edge labels are from `tools/flowcharts/data/contracts.json`.

**Teachers Insurance v. Tribune** (K-18, which cites `note-tribune-types` at nodes b and c).
- Type I facts (all negotiable points agreed; a formal document contemplated only to memorialize): a → "Final deal asserted" → b → "Present commitment with definite terms" → e "Enforce the concluded bargain". This matches p. 190.
- Changed fact (an express statement that the parties are not bound until a definitive agreement is signed): a → b → "Signature reserved or substantial terms open" → h. This matches slide 15 (a disclaimer cuts against binding force).
- Type II facts (major terms agreed and the rest left open under a signed commitment to negotiate; the lender then insists on a condition absent from the commitment): a → "Negotiation commitment asserted" → c → "Binding process commitment" → f "Enforce the negotiation commitment". The result is correct.
- Changed fact (the lender negotiated in good faith, insisted on nothing nonconforming, and the deal still failed): the route is the same, and node f says only "Test ... for breach." The chart does not state that a party may abandon after a good-faith effort, so it gives the student no standard for finding no breach. The result is reachable but not taught (gap 1). Tribune has no ≈ sentences.

**Dixon** (K-18 nodes d and g).
- Facts as pleaded (a promise to consider if the borrowers defaulted and supplied information; they did so; the bank foreclosed on the induced default): a → "Assurance induced action" → d → "Promise and induced loss proven" → g "Compensate supported reliance". This matches the pleading-stage holding and the reliance limit (p. 339).
- Changed fact (the same indefinite promise to consider, but the bank did not tell the borrowers to stop paying and did not exploit any default it had induced): the path is the same, and node d's questions (foreseeable change; justice) are still met, so the chart displays g. Dixon's reasoning says the Massachusetts definiteness requirement would defeat an indefinite promise without the take-advantage pattern (pp. 336–338). The chart fails to reach the different result (finding 4).
- The ≈ sentences do not preserve the decisive fact. The ≈ at 0.2 locates the harm in the absence of "honest" consideration rather than in the induced default and the foreclosure that exploited it (finding 3). No ≈ sentence mentions the definiteness tension.

**Cyberchron** (K-18 nodes d and g).
- Facts (mid-July directions to proceed as if the weights were approved, with continued pressure; termination and a purchase from Codar): a → "Assurance induced action" → d → "Promise and induced loss proven" → g. This matches pp. 343–344, and node g's "post-promise production or shutdown costs" and its exclusion of "pre-promise costs" track the holding.
- Changed fact (costs incurred in May and June, before any assurance): node g's "Separate pre-promise costs" gives the right answer, no recovery for that period (p. 343).
- Changed fact (Grumman says "proceed at your own risk; no assurance of payment"): d → "Predicates fail" → h. This is correct.
- The ≈ sentences preserve the timing distinction (the Cold Call's "July 15 properly began the compensable period" is rendered accurately). The ≈ at 4.0 ("Reliance damages can include a fair share of real overhead costs") drops the condition of a demonstrable history of ongoing operations and normal cost allocation. The underlying Cold Call paragraph keeps that condition, so this is minor and has not been made a separate finding.

**Channel Home** (K-18 nodes c and f).
- Facts (a detailed signed letter of intent with an exclusivity promise; the letter requested by the owner for financing; preparations by both sides; the owner leases to a rival): a → "Negotiation commitment asserted" → c → "Binding process commitment" → f. The result is correct.
- Changed fact (no consideration: the owner signs an exclusivity note without requesting or receiving anything): the path is the same, because node c asks only whether the duty is "sufficiently definite". The chart displays f. Channel requires consideration (p. 349), so the chart does not reach the different result (finding 5).
- Changed fact (an exclusivity promise with no lease terms specified): node c still reads as definite, because the detail omits that definiteness depended on the detailed letter (finding 9).
- Remedy check: node f states that a negotiation duty cannot yield the final deal's benefits, contrary to Venture Associates (finding 7).
- Channel's ≈ sentences (five) concern procedure and the statute of frauds. They do not misstate the definiteness or consideration distinction, but they do not render it either.

**Sun Printing** (K-19 nodes b and e; K-18 node h).
- 1923 facts on K-19: a → "Future agreement reserved" → e "The court cannot choose the bargain". This matches p. 356. On K-18: a → "Final deal asserted" → b → "Signature reserved or substantial terms open" → h. This also matches.
- Changed fact (the contract fixes one-month price periods, so only the price is open, under the Canadian maximum): K-19 a → "Present commitment supported" → b → "Benchmark works" → f. This is consistent with Cardozo's dictum that the buyer might then hold an option at the maximum (p. 354). The ≈ at 3.0 preserves the distinction.
- Changed fact (the same contract, governed by today's UCC, which is the natural question for a newsprint sale): both available exits from node a end at e, because "Future agreement reserved" goes directly to e and node d's exit "Open point reserved or no applicable default" also goes to e. Under § 2-305(1)(b), a reserved price that the parties fail to agree on becomes a reasonable price if they intended to be bound. The chart cannot reach that result (finding 6).

**Oglebay** (K-19 nodes b, c, d and f).
- Facts (a long-term shipping-services contract; both mechanisms failed; the trial court found intent to remain bound): a → "Present commitment supported" → b → "Benchmark failed but intent clear" → c → "Supported reasonable term" → f. This matches pp. 367–368. Node c also records the negotiation and mediation order and its "damages were speculative" condition.
- Changed fact (no evidence that the parties meant to stay bound if the mechanisms failed, for example because the price mechanism was a condition of the deal): b → "No standard for essential obligation" → e. This is correct.
- Changed fact (the same arrangement, but for the sale of iron ore, which is goods): a → "Qualifying sale with open terms" → d → "Relevant default applies" → f, under § 2-305(1)(c). This is correct.
- The ≈ sentences at 2.2 and 4.2 drop the intent-to-be-bound condition that this changed fact turns on (finding 10). The ≈ at 4.0 preserves the speculative-damages condition for specific performance.

**French art. 1112** (comparison only; K-18 node h cites `french-negotiations`).
- Channel's facts under the assigned French text: there is a statutory good-faith duty without any agreement to negotiate, and recovery excludes the expected benefits of the lease. No chart route applies French law; node h only says to "check ... the governing regime's approach." This is acceptable for comparative material, but the map node's added loss-of-chance limit (finding 15) would give a wrong comparative answer.
