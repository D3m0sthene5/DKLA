# OP-CT-16 challenge: Contracts Class 16, "Performing in good faith"

Challenger review of `ct16-surfaces.md`, the touched parts of `tools/flowcharts/data/contracts.json` (K-24) and `tools/r19/data/timelines.json` ("good-faith"), and the authority links in `tools/v25/authorities.json` and `tools/r19/data/rlcc.json`. Authority used: C&M printed pp. 719–744, supplement pp. 53–75, and the Selections (Restatement § 205; UCC §§ 1-201(b)(20), 1-302, 1-304, 2-306; RLCC 2019 Tentative Draft § 4). The class slide deck is not on file, so the lecture-notes record is checked only against these sources. Nothing in `prior-corrections.json` is re-reported.

Findings are ordered with those that change a legal result first.

---

## Findings that change a result

### F1. K-24 has no preemption exit, so Ginsberg's facts reach "Remedy"

- **Surface/field:** Flowchart K-24 node e, edge label (and node a, which has no preemption check).
- **Current text:** `"label": "Duty recognized and breached"` (node e), routing to node f; node e's detail says only "identify any preemption issue" and gives no edge for it.
- **Verdict:** CHANGES RESULT.
- **Facts entered:** Ginsberg brings a Minnesota-law covenant claim alleging that Northwest used its "sole judgment" abuse clause to end his Platinum Elite membership as a pretext for merger-driven cost cutting.
- **Path the chart takes:** a → "Different governing regime" → e → Minnesota law does imply the covenant, and a breach is alleged → "Duty recognized and breached" → f "Remedy the obligation actually breached". A user who treats the sole-judgment clause as an evaluation power takes a → "Evaluation or satisfaction" → c → "Process or good-faith standard breached" → f instead. Either way the chart shows a remedy.
- **Source-supported result:** The claim is preempted, and the covenant theory yields no remedy. Minnesota does not let parties contract out of the covenant, so the covenant is a state-imposed obligation, and "a breach of covenant claim is pre-empted." Only obligations the airline voluntarily undertook remain enforceable. C&M 731–733.
- **Replacement:** Change the node e edge label to "Duty recognized, not preempted, and breached" (→ f). Add a node e edge "State-imposed duty preempted" → new node i. Node i label: "State-law good-faith claim displaced". Node i detail: "Ginsberg: federal airline law preempted a Minnesota covenant claim because Minnesota did not let parties contract out of the covenant. Only obligations the airline voluntarily undertook remain enforceable." Add to node a's detail: "First ask whether federal law displaces a state-imposed good-faith duty (Ginsberg)."

### F2. K-24 node f gives the wrong consequence when the bad-faith party is the one enforcing a right (Market Street)

- **Surface/field:** Flowchart K-24 node f, detail.
- **Current text:** "Award the promised process or proved contract loss, as appropriate."
- **Verdict:** CHANGES RESULT.
- **Facts entered:** These are the facts found on remand. Orenstein realized the trust was not acting under paragraph 34, kept writing ambiguous letters, and then exercised the purchase option.
- **Path the chart takes:** a → "Use of a contractual advantage" → d → "Opportunism proved" → f, which tells the user to award the promised process or the proved contract loss.
- **Source-supported result:** Market Street, the party that acted in bad faith, was itself the plaintiff, and it was denied specific performance of the option. The trust received no damages award; the consequence was that the enforcer lost its remedy. C&M 735 note 1 (817 F. Supp. at 788). The PEB Commentary, adopted as UCC § 1-304 comment 1, states the same structure: a failure to perform or enforce in good faith "constitutes a breach of that contract or makes unavailable, under the particular circumstances, a remedial right or power." C&M 730; Sel. § 1-304 cmt. 1.
- **Replacement (node f detail):** "Award the promised process or proved contract loss, as appropriate. If the party acting in bad faith is the one enforcing a contract right, that right may be unavailable; on remand in Market Street, the tenant was denied specific performance of the option. A missed review does not itself entitle the claimant to the preferred discretionary outcome."

### F3. K-24 node b leaves out Bloor's burden shift and its insolvency timing

- **Surface/field:** Flowchart K-24 node b, label and detail.
- **Current text:** "Best efforts required meaningful exploration of reasonable ways to maintain volume and fair consideration of the promised business, with no duty to bankrupt itself."
- **Verdict:** MISSING CONDITION (it changes the result on a burden-of-proof record).
- **Facts entered:** Bloor proves that Ballantine's volume collapsed far below every comparison and that Kalmanovitz's policy was "We sell beer, F.O.B. the brewery. You come and get it." Bloor offers no proof of specific steps that would have worked, and Falstaff shows that more promotion would have reduced its profit.
- **Path the chart takes:** a → "Efforts or promotion" → b, which asks "Were reasonable steps taken toward the agreed goal?" With no evidence of which steps were available, a user can pick "Efforts adequate" → g "Discretion stands".
- **Source-supported result:** The record shows breach. "Plaintiff was not obliged to show just what steps Falstaff could reasonably have taken." It was enough to show that Falstaff "simply didn't care about Ballantine's volume." The burden then shifted to Falstaff "to prove there was nothing significant it could have done to promote Ballantine sales that would not have been financially disastrous." The duty to explore applied "once the peril of insolvency had been averted." C&M 741–742.
- **Replacement (node b detail):** "Falstaff emphasized overall profit while royalty-producing Ballantine sales fell. Once insolvency was averted, best efforts required Falstaff at least to explore steps not involving substantial losses and to consider Ballantine volume fairly; it need not spend itself into bankruptcy. If the claimant shows the promisor simply did not care about the promised volume, the promisor must prove that nothing significant could have been done without financial disaster." Change the "Efforts adequate" edge label to "Efforts adequate, or burden met".

### F4. Bloor: "no substantial losses" is presented as the ceiling on the duty, which overstates the holding

- **Surface/field:** Effective brief CT-NEXT-CM-0109 rule, with the identical Chronology step 268 note; Takeaway; Map sections.Holding; Effective brief Holding; Cold Call episode-3, paragraph 2.
- **Current text:**
  - brief rule and chronology: "does not require the promisor to incur bankruptcy or substantial losses"
  - takeaway: "Best efforts did not require bankruptcy or substantial losses merely to promote this brand"
  - map Holding: "Falstaff did not have to bankrupt itself or incur substantial losses"
  - brief Holding and episode-3: "bankruptcy or substantial losses solely to promote Ballantine"
- **Verdict:** OVERSTATED.
- **Source basis:** The Second Circuit itself held only that the clause "did not require Falstaff to spend itself into bankruptcy." "Substantial loss" appears in two places only. The court used it to describe what the trial judge had not required. It also used it to set the minimum Falstaff owed: "at least to explore whether steps not involving substantial losses could have been taken." The words "at least" make substantial loss the floor of the duty to explore, not a limit on what best efforts can ever require. Falstaff's defense after the burden shifted turns on "financially disastrous," which is a higher bar. C&M 741–742.
- **Counterexample:** Falstaff shows that restoring the North Bergen depot and the Guinness-Harp distribution would have produced substantial but survivable losses. Under the Atlas wording Falstaff is excused. Under Bloor, once the volume collapse and indifference are shown, Falstaff must prove that nothing significant could be done without financial disaster. Substantial but non-disastrous losses do not meet that burden.
- **Replacements:**
  - Brief rule and chronology note (39 words): "A promise to use best efforts to promote and maintain a high volume of sales does not require the promisor to spend itself into bankruptcy, but it is not discharged by pursuing overall profit while disregarding the promised volume."
  - Takeaway (47 words, two sentences): "Best efforts did not require Falstaff to spend itself into bankruptcy, but pursuing overall profit did not excuse ignoring the promised Ballantine volume. Once Bloor showed Falstaff simply did not care about that volume, Falstaff had to prove nothing significant could have been done without financial disaster."
  - Map Holding: "The best-efforts covenant was breached. Falstaff did not have to spend itself into bankruptcy, but once insolvency was averted it had at least to explore whether steps not involving substantial losses could slow Ballantine's decline, and it had to give fair consideration to the royalty-producing business."
  - Brief Holding and episode-3: replace "best efforts did not require bankruptcy or substantial losses solely to promote Ballantine" with "best efforts did not require Falstaff to spend itself into bankruptcy to promote Ballantine".

### F5. Bloor: "every feasible step" understates the burden shift

- **Surface/field:** Effective brief CT-NEXT-CM-0109 Reasoning, paragraph 2; Cold Call episode-4, paragraph 4.
- **Current text:** "Bloor did not have to identify every feasible promotional step" (brief) and "Bloor did not have to identify every feasible step." (episode-4).
- **Verdict:** MISSING CONDITION.
- **Counterexample:** The plaintiff identifies no specific step at all. "Not every step" implies the plaintiff must identify at least some steps and would lose on this record. The court held that the plaintiff "was not obliged to show just what steps Falstaff could reasonably have taken"; proof of indifference alone shifted the burden. C&M 742.
- **Replacement:** "Bloor did not have to show what steps Falstaff could reasonably have taken" (in both places; in the brief, keep the rest of the sentence).

### F6. Bloor ≈ sentence 3.3 leaves out Falstaff's alternative of discontinuing and paying

- **Surface/field:** Cold Call plain-English sentences, at 3.3 (first entry); and the source sentence in Cold Call episode-4, paragraph 4.
- **Current text:** "a per-barrel payment arrangement carried an "implied" duty, one the law reads in, to make good-faith efforts toward substantial sales." Source sentence: "Even without express best efforts, that arrangement implied good-faith effort toward substantial sales".
- **Verdict:** MISSING CONDITION.
- **Counterexample:** Falstaff stops selling Ballantine and pays the 2(a)(v) liquidated sum. The Atlas wording makes that a breach of the implied duty. The court said the implied good-faith duty applied "unless it discontinued under clause 2(a)(v) with consequent liability for liquidated damages." The court also tied the duty to the fact that the royalty "was an essential part of the purchase price," citing Wood, not to every per-barrel payment arrangement. C&M 742.
- **Replacement (plain):** "Even without an "express" (written-out) best-efforts promise, the per-barrel royalty, an essential part of the purchase price, carried an "implied" duty, one the law reads in, to make good-faith efforts toward substantial sales, unless Falstaff chose to discontinue the brand and pay the contract's liquidated sum. The express "covenant," or promise, added a further high-volume goal." In the episode sentence, insert after "substantial sales": "unless Falstaff discontinued the brand and paid the liquidated sum".

### F7. Bloor described as an "exclusive arrangement" and tied to § 2-306(2)

- **Surface/field:** Map entry learning.topics, `implied-efforts` and `ucc306`.
- **Current text:** "Bloor gives content to a best-efforts obligation in an exclusive arrangement, extending the Wood v. Lucy line." and "UCC 2-306(2)'s best-efforts duty in exclusive dealings is the statutory analogue of the express clause construed here."
- **Verdict:** UNSUPPORTED BY ASSIGNED SOURCES.
- **Counterexample:** A student treats a Bloor-type deal, the purchase of brands and trademarks for cash plus royalties, as exclusive dealing in goods. The student then applies § 2-306(2)'s default best-efforts duty, together with its "unless otherwise agreed" escape. Bloor was a sale of "labels, trademarks, accounts receivable, distribution systems and other property." The duty came from the express clause 8(a) and, without that clause, from the royalty's role in the price (cf. Wood), under New York law. Nothing in the excerpt calls the arrangement exclusive dealing. C&M 737, 742; Sel. § 2-306(2).
- **Replacements:** `implied-efforts`: "Bloor gives content to an express best-efforts clause in a sale of brands paid partly by royalties; the court said the royalty structure alone would have required good-faith efforts, citing Wood v. Lucy." `ucc306`: "UCC § 2-306(2) supplies best efforts by default in exclusive dealing in goods; Bloor's duty came instead from an express clause in a sale of brand assets, so § 2-306(2) is a comparison, not the governing rule."

### F8. Ng Giap ≈ sentence 4.3 says the court gave no reasons

- **Surface/field:** Ng Giap Cold Call plain-English sentences, at 4.3.
- **Current text:** "It gave no separate written opinion explaining its reasons."
- **Verdict:** MISSTATES HOLDING (it misstates the disposition).
- **Counterexample:** A student concludes that the dismissal was unreasoned and carries no precedential reasoning. In fact the judgment, with paragraphs [5]–[26] reproduced in the supplement, gives extended reasons. "No separate opinion" means only that no judge wrote a concurrence or dissent. Supp. p. 65 ("Andrew Phang Boon Leong JA (delivering the judgment of the court)"), pp. 67–73.
- **Replacement:** "No judge wrote separately; Judge of Appeal Andrew Phang delivered the reasoned judgment of the whole court."

### F9. Ng Giap entire-agreement rule invites the wrong reading of clause 18

- **Surface/field:** Takeaway; Effective brief CT-COMP-SUP-0065 rule, with the identical Chronology step 570 note.
- **Current text:** Takeaway: "An entire-agreement clause shuts out implied terms only if it says so clearly." and "declined to imply a general duty of good faith into every contract." Rule and chronology: "an entire-agreement clause excludes implied terms only by clear language".
- **Verdict:** UNSUPPORTED BY ASSIGNED SOURCES. The supplement reports only the result: "the entire agreement clause did not bar the implication of terms." It does not contain a clear-language test. The phrase "into every contract" also OVERSTATES the term that was proposed.
- **Counterexample:** Clause 18 says there are no obligations, "oral or written, expressed or implied, other than those contained herein." A student given only the Atlas rule would read that as clear exclusion and conclude that implication was barred, which is the opposite of the holding. The First Implied Term was a term implied in law for agency agreements of this type, as the court described the category, and not for every contract. Supp. pp. 66–67, paras. [5]–[6], [9], [12].
- **Replacements:**
  - Takeaway (49 words, two sentences): "Singapore's court implies a term in fact only when necessary to make the contract work, and declined to imply a general duty of good faith as a term implied in law. It held that this entire-agreement clause did not bar implied terms, even though the clause mentioned implied obligations."
  - Brief rule and chronology (44 words): "A term is implied in fact only where necessary, tested by business efficacy and the officious bystander together, and the court declined to imply a general duty of good faith in law; this entire-agreement clause, though it mentioned implied obligations, did not bar implication."

### F10. Ng Giap `integration` topic generalizes the holding

- **Surface/field:** Map entry learning.topics, `integration`.
- **Current text:** "The court held that an entire-agreement clause does not by itself bar the implication of terms."
- **Verdict:** OVERSTATED.
- **Counterexample:** A student concludes that no entire-agreement clause can bar implied terms. The holding concerned this clause only, and the Atlas's own brief Holding (from the full judgment) says that clear language could exclude implication. Supp. pp. 66–67.
- **Replacement:** "The court held that this agreement's entire-agreement clause did not bar the implication of terms."

### F11. Market Street ≈ sentence 0.0 equates good faith with honesty

- **Surface/field:** Market Street Cold Call plain-English sentences, at 0.0.
- **Current text:** "to hold good-faith (honest) negotiations"
- **Verdict:** OVERSTATED. The sentence conflates good faith with honesty in fact.
- **Counterexample:** The trust gives Market Street's request no real consideration but tells no lies. Under the "honest" gloss, the trust has satisfied paragraph 34. The materials reject that equation. Summers says equating good faith with honesty "is wrong." The model UCC definition adds "the observance of reasonable commercial standards of fair dealing" to honesty. Paragraph 34 itself required "reasonable consideration." C&M 724 note 3, 725, 727, 733.
- **Replacement:** "The lease required the landlord to give such a request reasonable consideration and to negotiate in good faith. If negotiations failed, it allowed the tenant to repurchase the property."

### F12. Market Street ≈ sentence 2.1 leaves out what the oversight must concern

- **Surface/field:** Market Street Cold Call plain-English sentences, at 2.1.
- **Current text:** "deliberately exploiting the other side's oversight (mistake) while carrying out an existing bargain (contract)."
- **Verdict:** MISSING CONDITION.
- **Counterexample:** During performance, a party knows the other side has misjudged where the market is going and says nothing. The plain wording makes that bad faith. Posner allows a party to "exploit your superior knowledge of the market." He forbids only taking "deliberate advantage of an oversight by your contract partner concerning his rights under the contract." C&M 734–735.
- **Replacement:** "Contractual good faith could forbid deliberately exploiting the other side's oversight (mistake) about its own rights under the contract while carrying out an existing bargain (contract)."

### F13. Market Street Reasoning weakens Posner's safe-harbor belief

- **Surface/field:** Map entry sections.Reasoning, paragraph 2.
- **Current text:** "If Orenstein believed the trust knew or would check the paragraph"
- **Verdict:** MISSING CONDITION.
- **Counterexample:** Orenstein testified only that the trust "would probably check the file." Under the Atlas wording, that belief ends the inquiry in his favor. Posner's protected belief was that Erb "knew or would surely find out about paragraph 34." Because Orenstein's actual belief was uncertain, the court required a trial. On remand the trial court found against him because he "recognized that the Trust was not operating under paragraph 34." C&M 734–735 and note 1.
- **Replacement:** "If Orenstein believed the trust knew or would surely find out about the paragraph"

### F14. Dalton ≈ sentence 3.0 turns the court's test into a conclusion and drops "relevant"

- **Surface/field:** Dalton Cold Call plain-English sentences, at 3.0.
- **Current text:** "But refusing to exercise that discretion at all "breached" (broke) an express or "implied" contractual duty"
- **Verdict:** OVERSTATED.
- **Counterexample:** ETS declines to consider material that does not bear on the impersonation question. The plain wording makes any refusal a breach. The court said that when ETS declines "even to consider relevant material," the legal question becomes "whether this refusal breached an express or implied term of the contract, not whether it was arbitrary or irrational." The court found breach here because the materials were relevant to impersonation. C&M 722.
- **Replacement:** "ETS had "discretion" (the right to judge his evidence). When ETS refused even to consider relevant material he submitted, the question became whether that refusal "breached" (broke) an express or "implied" term of the contract, not whether ETS acted arbitrarily. Here it did breach."

### F15. Dalton's rules panel cites the wrong Restatement section, and the class's good-faith authorities are unlinked

- **Surface/field:** "Rules & authorities entry restatement-21" shown under Dalton; `tools/v25/authorities.json` → `byNode.dalton`.
- **Current text:** `"dalton": ["restatement-21"]` (entry title "Intention to Be Legally Bound").
- **Verdict:** WRONG CITATION.
- **Counterexample:** A student opening Dalton's authorities sees § 21, a formation rule about intention to be legally bound, and not § 205. Dalton rests on the covenant of good faith in performance, and the casebook introduces the section with "See Restatement § 205 and UCC § 1-304." C&M 720. In the same file, `byNode` gives no authority at all for market-street, ng-giap, northwest-ginsberg or good-faith. The entries restatement-205, ucc-1-304, ucc-1-201 (whose (b)(20) text is correct) and ucc-1-302 exist but are not linked to these nodes.
- **Replacement:** Set `byNode.dalton` to `["restatement-205"]`. Add `restatement-205` to market-street. Add `ucc-1-304`, `ucc-1-201` and `ucc-1-302` to the good-faith node, or to whichever node carries the class 16 UCC discussion.

### F16. The lecture-notes summary of the UCC leaves out the parts that matter

- **Surface/field:** Lecture notes record, topics[0] ("Good faith constrains performance and enforcement"), body.
- **Current text:** "UCC §§ 1-304 and 1-302(b) impose good faith and permit an agreement to set standards that are not manifestly unreasonable. The model definition combines honesty and reasonable commercial standards."
- **Verdict:** MISSING CONDITION.
- **What is missing:** (1) Section 1-302(b) first provides that the obligation of good faith "may not be disclaimed by agreement." That is the fact which, under Ginsberg's test, makes a duty state-imposed, so it decides the p. 733 note question. (2) The definition requires reasonable commercial standards "of fair dealing," not commercial reasonableness generally. (3) New York and twelve other listed states kept the older honesty-only definition. The Selections say so in footnote a to § 1-201, and C&M 724 note 3 describes the 2001 change.
- **Counterexample:** A Ginsberg-style claim rests on the UCC duty instead of Minnesota common law. A student using this note would not see that the duty is non-disclaimable, and would miss the argument that under Ginsberg it is state-imposed.
- **Pinpoint:** Sel. § 1-302(b); § 1-201(b)(20) and fn. a; C&M 724 n.3, 725, 733 Note.
- **Replacement:** "UCC § 1-304 imposes good faith in performing and enforcing every contract or duty within the Code; § 1-302(b) bars disclaiming it but lets the parties set standards for measuring it that are not manifestly unreasonable. The model definition, § 1-201(b)(20), is "honesty in fact and the observance of reasonable commercial standards of fair dealing"; New York and several other states kept the older honesty-only definition."

### F17. The lecture notes attribute "dishonest performance" authorities to the supplement

- **Surface/field:** Lecture notes record, topics[6] ("Compare the Commonwealth authorities"), body.
- **Current text:** "to test narrower controls on contractual discretion and dishonest performance."
- **Verdict:** UNSUPPORTED BY ASSIGNED SOURCES. The editors' note cites Wastech (discretion exercised reasonably), Braganza (discretion) and Yam Seng (relational contracts). It cites no authority on dishonest performance. The slide may have done so, but the slides are not on file. Supp. p. 73.
- **Replacement:** "to test narrower controls on contractual discretion and on relational contracts."

### F18. Bloor Reasoning puts the "financially disastrous" standard in the wrong place

- **Surface/field:** Map entry sections.Reasoning, paragraph 2.
- **Current text:** "After the immediate insolvency danger passed, Falstaff had to investigate measures that could slow the decline without financially disastrous costs."
- **Verdict:** MISSING CONDITION. The paragraph merges the duty to explore, which covers "steps not involving substantial losses," with the burden-shifted defense ("financially disastrous"). It also drops "financially disastrous" from the burden sentence, where it belongs. C&M 741–742.
- **Replacement:** "After the immediate insolvency danger passed, Falstaff had at least to explore whether steps not involving substantial losses could slow the decline. Evidence that it simply did not care about that volume supported breach and shifted the burden to Falstaff to show that nothing significant could have been done without financially disastrous consequences."

### F19. Bloor Material Facts calls Kalmanovitz a "controller"

- **Surface/field:** Map entry sections.Material Facts, paragraph 2.
- **Current text:** "Its new controller emphasized cost cutting and profit."
- **Verdict:** OVERSTATED. A "controller" is a financial-officer title. Kalmanovitz acquired 35% of the voting power and control of the board through a voting trust. C&M 738.
- **Replacement:** "Its new controlling shareholder, Paul Kalmanovitz, emphasized cost cutting and profit."

---

## Teaching gaps (assigned material that no served surface teaches)

- **G1. Timeline "good-faith" field `now`.** The field never says that the duty excludes negotiation and formation, that it cannot impose terms inconsistent with the contract, or that it is not an independent cause of action. Sources: C&M 720 ("governs the performance and enforcement of a contract, and not its negotiation and formation"); Dalton at 721; PEB Commentary at 729–730. Draft: "Good faith governs how contractual duties are performed and enforced, not how contracts are negotiated or formed. It limits the exercise of discretion and the enforcement of rights, but it cannot impose obligations inconsistent with the agreed terms or make one party responsible for the other's interests. The duty's scope depends on the contract and governing law. UCC § 1-304 covers every contract or duty within the Code; Restatement § 205 states a common-law formulation."
- **G2. Timeline "good-faith" has no UCC definition step.** Proposed step `ucc1201-good-faith`, year 2001, turn "widens", object "UCC § 1-201(b)(20)". Note: "Revised Article 1 extended the merchant standard to all parties: good faith means honesty in fact and the observance of reasonable commercial standards of fair dealing. New York and several other states kept the honesty-only definition." Sources: C&M 724 n.3; Sel. § 1-201 fn. a.
- **G3. K-24 node a, detail.** The detail should state the PEB rule that good faith attaches to a specific contractual duty or right. This rule also explains the remedy in F2. Draft: "Good faith attaches to a specific duty or right under the contract; it does not create a separate duty of fairness that can be breached on its own." Source: C&M 730; Sel. § 1-304 cmt. 1. The Easterbrook note says the same: contract law "does not require parties to be fair, or kind, or reasonable." C&M 735 n.2.
- **G4. Ginsberg map notes.** The notes should answer the p. 733 Note question by setting out both arguments. Draft: "Under the Code, § 1-302(b) bars disclaiming good faith, which under Ginsberg's test points toward a state-imposed obligation; the PEB Commentary's view that good faith only enforces the parties' own agreement points the other way." Sources: C&M 729–730, 732–733; Sel. § 1-302(b).
- **G5. RLCC numbering mismatch.** This is recorded as a mismatch, not an error. The Atlas entry `rlcc-4` in `tools/r19/data/rlcc.json` uses the 2024 Official Text, under which § 4 is "Interpretation and Construction." The Atlas's rlcc overview entry lists § 5 (Discretionary Obligations) as "Not assigned." The Selections the student was given print the 2019 Tentative Draft, whose § 4 is "Discretionary Obligations." That section directly addresses this class's topic. Its black letter reads: (a) discretion "will be exercised in good faith"; (b) a term granting "absolute and unlimited discretion ... unconstrained by the good-faith obligation is unenforceable by the business". Its Illustration 5 is a frequent-flyer modification clause, which bears on Ginsberg. Draft addition to the rlcc-4 notes: "The course Selections print the 2019 Tentative Draft, whose § 4 is Discretionary Obligations (2024 § 5): discretion must be read as exercised in good faith, and a term claiming discretion unconstrained by good faith is unenforceable by the business." The 2024 text the Atlas quotes could not be checked against the assigned sources.
- **G6. K-24 node d, detail.** Hilton v. Butch Lewis (C&M 723–724 n.2) is the casebook's example of the interference form of bad faith: deliberately preventing a performance the other side expected, even where there is no duty to supply it. Draft sentence: "Deliberately interfering with an expected performance, as alleged when Lewis had Spinks stripped of his title to escape the Hilton series, can also breach the covenant."
- **G7. Bloor agreement in the supplement.** The retyped clause 8(a) reads "the Seller will use its best efforts" and the agreement is dated "as of March 3, 1972". The opinion reads "[Buyer]" and March 31. Supp. pp. 53, 58; C&M 737. The map notes on the Bloor agreement could flag the retyping slip so that students do not read the duty as the seller's.

---

## Checked and found supported

Dalton map summary, Holding, Procedural History, Reasoning ¶2, learning `good-faith`/`specific-relief`, brief rule, Holding (remedy = specific performance of good-faith reconsideration, no duty to investigate), takeaway, timeline step 5, K-24 node c, ≈ 2.0 (all three), 2.1, 3.1, 4.1, cold-call `limits`; lecture-notes Dalton topic and slide-11 conflict (against C&M 720); Ginsberg map summary, Holding, Reasoning, notes' stated rule, brief rule, Holding, takeaway, timeline step 7 and context, ≈ 1.0, 2.0 (Wolens, controlling question), 3.0, 3.2, lecture-notes Ginsberg topic; Market Street map summary, notes, Procedural History, Holding, learning `good-faith`/`specific-relief`, brief rule (= chronology 386), takeaway, timeline step 4, K-24 nodes d and h, ≈ 1.1 (both), 2.2 (fiduciary), 3.1 (inference), the $4M/$2M discrepancy note; Bloor map summary, notes, Procedural History, Reasoning ¶1 and ¶3, learning `good-faith`/`stipulated-remedies`/`damages-certainty`, brief Procedural History and Reasoning ¶3–4, timeline step 2, ≈ 0.1 (all three), 2.1 (profit policy), 3.3 (burden shift), 5.0, rules entry ucc-2-306 (text matches Sel. § 2-306); Ng Giap map summary, notes (supp. p. 73), Procedural History, Holding, Reasoning, learning `interpretation`/`gap-filling`, timeline step 6, K-24 node e's Ng Giap sentence, ≈ 0.1, 3.1 (all three); timeline title, question, guide, wood-lucy, ucc306 and rest205 steps.
