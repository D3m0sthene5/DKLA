# OP-CT-20 challenge: Contracts Class 20, express and constructive conditions

Sources tested: ct20-casebook.txt (assigned printed C&M 805–809, 814–824, 828–832, 846–855, 871–875, 883–893; page numbers for PDF pages whose running heads did not extract were inferred from neighbouring pages: PDF 188–197 = 846–855, PDF 213 = 871, PDF 216–219 = 872–875, PDF 227–237 = 883–893), and the Restatement (Second) black letter and printed comments in /home/claude/work/src/sel.txt (§§ 224–227, 229, 230, 234, 237, 241; § 229 is printed as black letter only). The class slide deck is not on file, so the lecture-notes record was checked only against the casebook and the selections. Quotations from the Atlas are verbatim substrings of ct20-surfaces.md or, where marked, of tools/flowcharts/data/contracts.json and tools/v25/authorities.json. Casebook quotations restore OCR-dropped letters only. Items in prior-corrections.json were skipped unless the corrected text itself is wrong (B3).

Entries are ordered by how likely the wording is to lead a student to a wrong answer.

---

## A. Statements that change a legal result

### A1. Flowchart K-27 node g: forfeiture excuse offered without § 229's limit, and offered for a party's own material failure

- **Surface/field:** Flowchart K-27 (Is the other party's performance due?) node g, `detail` (contracts.json; node g is reached from nodes b, d and f).
- **Current text:** `Apply waiver, prevention and disproportionate forfeiture where supported.`
- **Verdict:** CHANGES RESULT.
- **Facts entered (Kingston v. Preston):** apprentice served a year and a quarter, never gave the security approved by the mercer, and sues for the transfer of the business.
- **Path:** a "Dependency implied by law" → d "Required first step missing" → g. The apprentice asserts disproportionate forfeiture of his service and expected business; node g lists forfeiture as an excuse with no limit, so the user takes "Excused" → h.
- **Displayed result:** h "The reciprocal duty is due": the mercer must transfer the business.
- **Source-supported result:** judgment for the mercer. "The essence of the agreement was, that the defendant should not trust to the personal security of the plaintiff"; giving security "must necessarily be a condition precedent." Restatement § 229 excuses a condition only "unless its occurrence was a material part of the agreed exchange," and the casebook states the excuse with that limit. The same path on Nelson v. Hazel facts (no substantial performance, not divisible: d → e "Material shortfall" → f "No divisible completed units" → g → "Excused" → h) displays full contract recovery, where the court allowed only the net benefit after the owners' damages.
- **Pinpoint:** C&M 830 (Mansfield's judgment); C&M 824 (§ 229 and its "material part" limit); C&M 883–884 (Nelson); Restatement § 229 black letter.
- **Replacement (node g detail):** `Apply waiver and prevention where supported. A court may excuse a condition to avoid disproportionate forfeiture only if its occurrence was not a material part of the agreed exchange (§ 229); that excuse does not cure a party's own uncured material failure, which may leave only restitution (Nelson). Also ask whether there was an independent promise to produce the event, whose breach may support damages.`

### A2. Flowchart K-27 node e: substantial performance with no willfulness bar

- **Surface/field:** Flowchart K-27 node e, `detail`.
- **Current text:** `Jacob & Youngs treated the use of equivalent pipe as a minor departure in the circumstances. Substantial performance can satisfy a constructive condition while leaving damages for the defect.`
- **Verdict:** MISSING CONDITION; it changes the result.
- **Facts entered:** casebook Note 4 hypothetical. The builder knowingly installs a cheaper, equivalent brand of pipe to increase its profit; the price difference is trivial against the whole house.
- **Path:** a "Dependency implied by law" → d "Prior performance or tender made" → e. Nothing in e mentions the builder's culpability, so the trivial deviation is "Substantial" → h.
- **Displayed result:** "The reciprocal duty is due," less a deduction for the defect.
- **Source-supported result:** Cardozo: "The willful transgressor must accept the penalty of his transgression"; the majority's leniency is for an omission "both trivial and innocent." The editors note that a willful deviation is generally said always to preclude substantial performance, while § 241(e) treats good faith as one factor to be weighed. Either way, the chart's silence lets a deliberate substitution pass as if innocent.
- **Pinpoint:** C&M 848 ("both trivial and innocent"), 849–850 ("willful transgressor"); C&M 852 Note 4; Restatement § 241(e).
- **Replacement (node e detail):** `Jacob & Youngs treated an innocent, trivial use of equivalent pipe as substantial performance. A willful transgressor cannot claim the doctrine under Cardozo's opinion; Restatement § 241(e) instead weighs good faith with the other factors. Substantial performance satisfies a constructive condition while leaving damages for the defect; it does not satisfy an express condition.`

### A3. Flowchart K-27 node d: partial performance routed past substantial performance and divisibility

- **Surface/field:** Flowchart K-27 node d, edge labels.
- **Current text:** `"label": "Prior performance or tender made"` and `"label": "Required first step missing"`.
- **Verdict:** CHANGES RESULT.
- **Facts entered (Gill v. Johnstown Lumber):** work (driving the logs) must precede payment; Gill delivered some logs and ties at the specified points, and a flood swept the rest past the boom.
- **Path:** a "Dependency implied by law" → d. The work that had to come first was not completed, so the literal edge is "Required first step missing" → g. Nothing is excused → j.
- **Displayed result:** j "Condition keeps the other duty from becoming due": no payment at all, which is the trial court's ruling that the Supreme Court reversed.
- **Source-supported result:** the contract was severable and Gill was "entitled to compensation at the stipulated rate for all logs and ties delivered at the specified points." The edges in d do not tell the user that partial or defective performance belongs on the e → f route; only performance that was never rendered or tendered (Kingston's missing security) belongs on the g route.
- **Pinpoint:** C&M 872 (directed verdict on an "entire" contract), 873 (holding; reversal and venire facias de novo).
- **Replacement (edge labels):** `Performance rendered or tendered, fully or in part` (to e); `Required first performance not rendered or tendered at all` (to g).

### A4. Jacob & Youngs Cold Call plain sentence 3.2: the dissent's view stated as law

- **Surface/field:** jacob-youngs, Cold Call plain-English sentences, `"at": "3.2"`.
- **Current text:** `Kent was entitled to insist on Reading pipe even just because he preferred it; pipe that worked as well was not what he bargained for.`
- **Verdict:** MISSTATES HOLDING (attribution).
- **Counterexample:** The source sentence sits in the dissent episode ("Kent could choose a manufacturer..."), but the plain rendering drops the attribution and states McLaughlin's position as a flat legal proposition. A student reading the plain sentence alone will conclude that Kent could refuse payment for the brand substitution, which is the result the 4–3 majority rejected: "the measure of the allowance is not the cost of replacement ... but the difference in value."
- **Pinpoint:** C&M 851 (McLaughlin: "He wanted that and was entitled to it"; vote line, Hiscock, Hogan and Crane with Cardozo, Pound and Andrews with McLaughlin); C&M 850 (majority's measure).
- **Replacement (plain text):** `In the dissent's view, Kent was entitled to insist on Reading pipe even just because he preferred it, and pipe that worked as well was not what he bargained for. The majority rejected that view for this innocent, trivial deviation.`

### A5. Jacob & Youngs takeaway: the general rule drops "innocent"

- **Surface/field:** jacob-youngs, Takeaway (tools/r19/data/takeaways.json).
- **Current text:** `Trivial departures are compensated in damages, measured by the drop in value when tearing out the work would cost far more than it is worth.`
- **Verdict:** MISSING CONDITION.
- **Counterexample:** The first sentence of the takeaway is limited to an innocent builder, but the second states the rule for all trivial departures. On the Note 4 facts (deliberate substitution of equivalent material for profit), a student applying the second sentence awards the builder the price less nominal damages; Cardozo withholds the doctrine from the "willful transgressor." The phrase "cost far more than it is worth" also replaces Cardozo's threshold ("grossly and unfairly out of proportion to the good to be attained") with a looser comparison whose "it" is unclear.
- **Pinpoint:** C&M 848, 849–850; C&M 850 (measure); C&M 852 Note 4.
- **Replacement (takeaway, 2 sentences, 47 words):** `A builder who innocently used a different brand of equally good pipe did not forfeit payment for the house. A trivial and innocent departure is compensated in damages, measured by the drop in value when the cost of replacement would be grossly and unfairly out of proportion to the benefit.`

### A6. Luttinger brief rule line and Chronology step 217: no "unless excused"

- **Surface/field:** luttinger, Effective brief CT-NEXT-CM-0118 `rule`; Chronology 'course-chronology-0' step 217 `note` (same text).
- **Current text:** `when an express condition does not occur on its stated terms the conditional duty does not arise.`
- **Verdict:** MISSING CONDITION.
- **Counterexample:** Problem 3 at C&M 889 and the note at C&M 809 ask what happens if the Luttingers had made no attempt to get a mortgage. The financing event would still not have occurred, so the Atlas rule says the buyers' duty never arose and they get the deposit back. The casebook asks whether the nonoccurrence would then be "excused," and Restatement § 225(1) makes the duty due if "the condition occurs or its non-occurrence is excused." The definition the court itself quoted ("a fact or event which the parties intend must exist or take place before there is a right to performance") does not contain the absolute consequence the rule line adds.
- **Pinpoint:** C&M 806 (§ 224: "unless its nonoccurrence is excused"), 807 (Lach v. Cahill definition), 809 (the "excused" question), 889 Problem 3; Restatement §§ 224, 225(1).
- **Replacement (rule line, 41 words):** `A condition precedent is an event the parties intend must occur before a right to performance arises. If an express condition does not occur on its stated terms, the conditional duty does not arise unless the nonoccurrence is excused.`

### A7. Nelson v. Hazel: "negligent" dropped from the rule, the takeaway, the timeline step and the K-31 node

- **Surface/field:** nelson-hazel Takeaway; Effective brief CT-NEXT-CM-0133 `rule` and Chronology step 186 (same text); Timeline 'remedy-interests' step 1 `note`; Flowchart K-31 node h `detail`.
- **Current text:** `A contractor whose work fell short of substantial performance still cannot be made to hand over the value of the work for free.` (takeaway); `A building contractor whose defective work falls short of substantial performance may still recover in quasi-contract` (rule); `a builder short of substantial performance recovers the benefit conferred less the owner's damages (Idaho).` (timeline); `Test whether this jurisdiction allows recovery by the breaching contractor and whether a positive net benefit remains.` (K-31 h).
- **Verdict:** MISSING CONDITION.
- **Counterexample:** A builder who deliberately abandons or deliberately departs from the work and sues for the net benefit. Every listed surface tells the student that the builder recovers; the takeaway says he "cannot be made" to work for free. Nelson relied on authority that "allows a negligent contractor to recover," and the court found "a negligent breach." The casebook's introduction to the section says restitution claims by a party in breach "have met serious resistance, especially when the plaintiff's breach may be characterized as 'willful,'" and New York still denies a defaulting land buyer restitution of a 10% down payment (Maxton Builders). The map summary and the brief Holding keep "negligent"; these four surfaces do not.
- **Pinpoint:** C&M 875 (resistance to restitution for a party in breach; Lawrence v. Miller); C&M 884 ("negligent contractor"; "a negligent breach"); C&M 885 Note 2 (Maxton).
- **Replacement (takeaway, 2 sentences, 55 words):** `A negligent contractor whose work fell short of substantial performance could still recover the amount by which the benefit to the owner exceeded the owner's damages and prior payments. Idaho treated building contracts as an exception to the rule barring a defaulting party's recovery; courts resist such claims more when the breach is willful.`
- **Replacement (rule line, 32 words):** `A building contractor whose negligent, defective work falls short of substantial performance may still recover in quasi-contract the amount by which the benefit conferred on the owner exceeds the owner's damages.`
- **Replacement (timeline note):** `Restitution for the party in breach: a negligent builder short of substantial performance recovers the benefit conferred less the owner's damages (Idaho).`
- **Addition (K-31 h detail, after the first sentence):** `Nelson involved a negligent breach; restitution for a willful breacher meets more resistance.`

### A8. Flowchart K-08 nodes e, f and h: Nelson's measure is lost and Nelson is cited for the contract remedy it denied

- **Surface/field:** Flowchart K-08 (Who must pay for an unrequested benefit?) node e `detail`, node f `detail` (contracts.json), node h `sources`.
- **Current text:** `A nonbreaching party may seek the value conferred when the other side materially breaches before completion.` (e); `An award returns the benefit or measures it by reasonable value where appropriate.` (f); node h `"sources": ["nelson-hazel", "completion-damages"]` under `Use the contractual payment remedy`.
- **Verdict:** CHANGES RESULT.
- **Facts entered (Nelson v. Hazel):** builder in breach, no substantial performance; $5,090.86 labor and materials, $1,997.51 paid, $2,494.50 cost of repairs.
- **Path:** a "Failed or breached agreement" → e. The detail describes only a nonbreaching claimant. Either (1) "Contract controls payment" → h "Use the contractual payment remedy," which yields nothing because contract recovery failed for want of substantial performance; or (2) "Applicable restitution route" → f "Restore what the defendant received," which yields value received less payments ($3,093.35) with no deduction for the owners' damages.
- **Displayed result:** $0 on route (1) or $3,093.35 on route (2).
- **Source-supported result:** $598.85: the benefit conferred in excess of the owner's injury, with the repair cost set off. Node h cites Nelson as a source for the contract remedy, although Nelson's earlier appeal denied recovery on the contract.
- **Pinpoint:** C&M 883–884.
- **Replacement (e detail, add):** `A party in breach may also have a claim: Nelson let a negligent builder who had not substantially performed recover the benefit conferred in excess of the owner's damages.`
- **Replacement (f detail, add):** `When the claimant is the party in breach, subtract the other party's damages and the payments already made (Nelson).`
- **Replacement (h sources):** remove `nelson-hazel`.

### A9. Gill rule line, Chronology step 39 and takeaway: "item" does not identify the unit that earns payment

- **Surface/field:** gill, Effective brief CT-NEXT-CM-0131 `rule` and Chronology step 39 (same text); Takeaway.
- **Current text:** `recover the stipulated price for each item fully performed, but nothing for an item only partly performed.` (rule); `a party can be paid for each item it fully delivered even though it did not finish the whole job. It gets nothing for items only partly carried out.` (takeaway).
- **Verdict:** MISSING CONDITION.
- **Counterexample:** In the court's own analysis the "items" of the work are categories: "driving logs, first, of oak, and second of various other kinds of timber ... and also driving cross-ties." Gill delivered some but not all of the oak logs, so the oak item was "only partly performed." A student applying the Atlas wording denies him anything for oak; the court held him "entitled to compensation at the stipulated rate for all logs and ties delivered." The unit that earns payment is the priced unit (per thousand feet, per tie) delivered at its destination; what earns nothing under the contract is a log driven only part of the way (Note 1's halfway question).
- **Pinpoint:** C&M 872 (Parsons test), 873 (items listed; holding; Note 1).
- **Replacement (rule line, 46 words):** `A contract is severable when the price is apportioned among distinct performances. The performing party may recover the stipulated rate for each priced unit delivered as agreed, but nothing under the contract for a unit only partly performed, such as a log driven only part of the way.`
- **Replacement (takeaway, 2 sentences, 52 words):** `When a contract sets a price for each unit of work, a party can be paid at that rate for every unit it fully delivered even though it did not finish the whole job. It gets no contract payment for a unit only partly carried out, such as a log driven halfway.`

### A10. McKenna timeline step 3: the honest and substantial performance qualification is dropped

- **Surface/field:** Timeline 'conditions' step 3 (mckenna), `note`.
- **Current text:** `Waiver: an owner who kept paying without asking for the architect's certificates cannot invoke their absence against final payment (Pennsylvania).`
- **Verdict:** MISSING CONDITION.
- **Counterexample:** An owner paid six of seven installments without certificates, and the finished building turns out seriously defective. The Atlas note says the owner cannot rely on the missing final certificate, full stop. The court held only that he could not insist on the certificate "when he seeks to defend against final payment for work shown to have been honestly and substantially performed," stressing his daily observation of the work "without remonstrance." The map entry, brief rule, chronology and takeaway keep the qualification; the timeline step does not.
- **Pinpoint:** C&M 887 (bracketed facts: the architect testified there were "no unauthorized departures"), 888 (opinion).
- **Replacement (note):** `Waiver: an owner who kept paying without asking for the architect's certificates could not invoke their absence against final payment for work honestly and substantially performed (Pennsylvania).`

### A11. Flowchart K-27 node b: a clear pay-if-paid clause is applied with no enforceability check

- **Surface/field:** Flowchart K-27 node b, `detail` (with node a's "Clear express condition" edge and node c's "Express risk-shifting condition" edge, both of which lead to b); also peacock map `learning.topics` "risk-allocation".
- **Current text:** `Test the actual condition.` (b); `The general contractor bears the owner’s nonpayment risk unless the contract clearly transfers it.` (learning.topics).
- **Verdict:** MISSING CONDITION.
- **Facts entered (Wm. R. Clarke Corp. v. Safeco, Note 2):** a California subcontract says unambiguously that the subcontractor is paid only if the owner pays; the owner does not pay.
- **Path:** a "Clear express condition" → b "Failed" → g (no waiver, prevention or forfeiture excuse) → j.
- **Displayed result:** the general contractor owes nothing.
- **Source-supported result:** in California the clause was "unenforceable as contrary to the public policy" protecting mechanic's lien rights. The casebook names California, Nevada and New York as the states whose courts have invalidated such clauses, notes statutes in some other states, and says they "are enforced in most jurisdictions" if "clear and unequivocal." The learning-topics sentence states a Florida rule without its jurisdiction and implies a clear transfer always works.
- **Pinpoint:** C&M 819 Note 2; C&M 819 Note 1 (DEC Electric: a clear clause "is interpreted as setting a condition precedent").
- **Addition (K-27 b detail):** `Before applying a clear pay-if-paid condition, check enforceability: California, Nevada and New York courts, and some statutes, refuse to enforce such clauses; most jurisdictions enforce them if clear.`
- **Replacement (learning.topics risk-allocation):** `Under Florida law, the general contractor bears the owner's nonpayment risk unless the contract clearly transfers it; a few states refuse to enforce even a clear transfer.`

---

## B. Teaching gaps and lesser inaccuracies

### B1. Gibson learning.topics "good-faith": "policed only by" honesty

- **Surface/field:** gibson map `learning.topics` "good-faith".
- **Current text:** `A personal-satisfaction condition is policed only by the requirement that the dissatisfaction be honest, which is the good-faith limit exam answers must state.`
- **Verdict:** UNSUPPORTED BY ASSIGNED SOURCES (as a statement about Gibson) and OVERSTATED ("only").
- **Counterexample:** The opinion says nothing about honesty; it says Cranage "was the only person who had the right to decide this question." The notes pose further limits the word "only" excludes: whether the result would be the same "if Cranage had refused to look at the portrait at all," the rule that "it is only the decision contracted for that is final," and whether a buyer dissatisfied "almost entirely because a changed market price made the contract undesirable" may invoke the condition.
- **Pinpoint:** C&M 820 (opinion), 821 Note 1, 822–823 (Devoine; mixed motives).
- **Replacement:** `A personal-satisfaction condition requires honest dissatisfaction; the notes ask whether refusing to examine the work, or dissatisfaction really caused by a fall in market price, would qualify. Gibson did not decide those questions because Cranage examined the portrait and remained dissatisfied.`

### B2. Flowchart K-28 node b: no third-party (architect) satisfaction and no limit on pretextual dissatisfaction

- **Surface/field:** Flowchart K-28 node b, `detail`.
- **Current text:** `Apply honest judgment where intended and reasonable-person standards for appropriate measurable performance.`
- **Verdict:** Teaching gap (MISSING CONDITION for third-party conditions).
- **Counterexample:** The assigned pages spend two pages on conditions of an architect's or judge's satisfaction: "The usual test is one of honest, not reasonable, satisfaction," a "gross mistake" was treated as "legally equivalent to bad faith" (RaDec), an architect's bad-faith refusal did not bar the contractor (Rizzolo), and the Slap Shot problem turns on contest judges whose decision is "final." Node b's two standards do not tell the student which applies to a third party or when the third party's refusal is not binding. Restatement § 227 cmt. c, illus. 5–8, gives the same results.
- **Pinpoint:** C&M 823–824; Restatement § 227 cmt. c and illus. 5–8.
- **Addition (b detail):** `When the condition is an architect's or other third party's satisfaction, the test is ordinarily honest, not reasonable, satisfaction; a refusal in bad faith or based on a gross mistake does not bind the claimant. Dissatisfaction that does not concern the performance itself may not count.`

### B3. Timeline 'conditions' guide (prior-corrected text): substantial performance offered as a route around any condition

- **Surface/field:** Timeline 'conditions' summary fields, `guide` (replacement text in prior-corrections.json, 2026-11-17-timeline-redesign).
- **Current text:** `Then ask whether the agreement is divisible, the condition was waived, or substantial performance applies.`
- **Verdict:** MISSING CONDITION (the corrected text is itself misleading).
- **Counterexample:** After "distinguish a condition from a promise," the guide sends a student with a clear express condition (Luttinger's financing term, an architect's certificate) to ask whether substantial performance applies. The editors state that substantial performance "applies only to constructive and not express conditions," and Oppenheimer rejects applying it "when the language of the agreement leaves no doubt that an express condition precedent was intended." The J&Y step's context says this, but the guide does not.
- **Pinpoint:** C&M 846 (Luttinger required strict compliance; constructive conditions use substantial performance), 851 Note 1, 853 Problem 2.
- **Replacement:** `First distinguish a condition from a promise about performance. Then ask whether the agreement is divisible, the condition was waived, or, for a constructive condition only, substantial performance applies. Compare those routes with Luttinger's failed financing condition and Peacock's ambiguous payment language.`

### B4. McKenna learning.topics "substantial-performance": the excuse attributed to substantial completion

- **Surface/field:** mckenna map `learning.topics` "substantial-performance".
- **Current text:** `The architect testified that the theatre was substantially completed, which underlies the court's refusal to let the missing certificate defeat payment.`
- **Verdict:** OVERSTATED.
- **Counterexample:** The sentence invites the inference that substantial performance excused an express certificate condition, which the editors say it cannot do (C&M 851 Note 1). The ground of decision was waiver by repeated payment without certificates. In the assigned excerpt the architect testified that there were "no unauthorized departures from the specifications," not that the theatre was substantially completed.
- **Pinpoint:** C&M 887–888.
- **Replacement:** `The ground of decision was waiver of the express certificate condition. The court stressed that the owner sought to avoid final payment for work honestly and substantially performed; substantial performance did not itself excuse the certificate requirement.`

### B5. Peacock learning.topics "forfeiture": reasoning attributed to the court

- **Surface/field:** peacock map `learning.topics` "forfeiture".
- **Current text:** `The court's presumption against reading ambiguous payment clauses as conditions rests on avoiding forfeiture of the subcontractors' earned payment.`
- **Verdict:** OVERSTATED (attribution).
- **Counterexample:** The court rested on the parties' presumed intent ("small subcontractors, who must have payment for their work in order to remain in business, will not ordinarily assume the risk") and called its rule "the fairest way to deal with the problem." The forfeiture framing is the editors' (C&M 824) and the Restatement's (§ 227 cmt. b, illus. 1, which states Peacock's facts). An exam answer citing Peacock should give the court's reason.
- **Pinpoint:** C&M 818, 824; Restatement § 227 cmt. b, illus. 1.
- **Replacement:** `The court rested its reading on the parties' ordinary intent: small subcontractors do not ordinarily assume the risk that the owner will not pay. The casebook and Restatement § 227 describe the same preference as a way of avoiding forfeiture.`

### B6. Flowchart K-27 node f: "Gill awarded rates"

- **Surface/field:** Flowchart K-27 node f, `detail`.
- **Current text:** `Gill awarded rates for completed deliveries, with no fractional contract price for logs lost en route.`
- **Verdict:** OVERSTATED (procedural posture).
- **Counterexample:** The court reversed a directed verdict and awarded a venire facias de novo; it held Gill entitled to the stipulated rates but awarded no sum. The Gill brief and Cold Call make this point; the chart does not.
- **Pinpoint:** C&M 873.
- **Replacement:** `Gill held the contractor entitled to the stated rates for completed deliveries, with no fractional contract price for logs lost en route, and ordered a new trial.`

### B7. Rules & authorities: § 21 attached to Peacock and McKenna; the session's own sections attached to no case

- **Surface/field:** Rules & authorities entry restatement-21, `links` (tools/v25/authorities.json); entries restatement-224, -225, -227, -229, -84, -234, -237, -240, `links` (empty).
- **Current text:** restatement-21 `"cite": "Restatement (Second) § 21"`, `"title": "Intention to Be Legally Bound"`, linked to `peacock` and `mckenna` with basis `Case connected to cited atlas rule or concept`.
- **Verdict:** WRONG CITATION.
- **Counterexample:** § 21 is a formation rule about intent to be legally bound; it bears on neither case. The link appears to come from the "assent" learning topic. Meanwhile § 227 illus. 1 is Peacock's fact pattern almost exactly ("no part of which shall be due until five days after Owner shall have paid Contractor"; owner insolvent; "A is under a duty to pay B after a reasonable time"), and none of the assigned sections is linked to a principal case. The black-letter text of every entry listed below was checked against sel.txt and is accurate.
- **Pinpoint:** Restatement § 227 cmt. b illus. 1, cmt. c illus. 5–8; §§ 224, 225, 229, 234, 237, 240, 84.
- **Replacement:** remove the peacock and mckenna links from restatement-21. Add: restatement-227 → peacock, gibson; restatement-224 and -225 → luttinger; restatement-229 → luttinger (forfeiture discussion, C&M 824); restatement-84 → mckenna; restatement-234 → kingston; restatement-237 → kingston, jacob-youngs; restatement-240 → gill.

### B8. Flowchart K-27 node j: no restitution pointer and no cure period

- **Surface/field:** Flowchart K-27 node j, `detail`.
- **Current text:** `A failed unexcused condition defeats the conditional claim. The agreement may call for return of a deposit. Address breaches of distinct promises separately.`
- **Verdict:** Teaching gap.
- **Counterexample:** j is the endpoint for a builder who did not substantially perform. It says nothing about Nelson's net-benefit restitution, and nothing about the rule that an uncured material failure first suspends the other party's duty and discharges it only if the failure is not cured in time. The aggrieved party is "expected" to suspend and allow cure where appropriate before treating the breach as total; whether a breach is material is not the aggrieved party's choice, but whether to treat a material breach as total is.
- **Pinpoint:** C&M 854–855; Restatement § 237 cmt. a; C&M 883–884.
- **Addition:** `A constructive condition's failure suspends the other duty and discharges it only if the material failure is not cured in time. A party whose own material failure defeats its contract claim may still recover a net benefit in restitution where allowed (Nelson; see K-31).`

### B9. Flowchart K-28 node c: the retraction-timing rule for waivers is not stated

- **Surface/field:** Flowchart K-28 node c, `detail`.
- **Current text:** `Check the words, conduct, reliance and any ability to retract under applicable law.`
- **Verdict:** Teaching gap.
- **Counterexample:** Problem 1 at C&M 888: after the Luttingers failed to get the mortgage, a relative offered financing and they assured the Rosens they would proceed, then changed their minds. The casebook's answer depends on timing: a waiver before the time for a condition within the other party's control can be retracted unless the other party relied, but a waiver after that time has expired cannot be retracted "even in the absence of reliance" (election). The node gives no rule to apply.
- **Pinpoint:** C&M 886; Restatement § 84 (authorities.json text); C&M 888 Problem 1.
- **Addition:** `A waiver made before the time for a condition within the other party's control can be retracted unless that party has relied; a waiver made after that time has passed (an election) cannot be retracted even without reliance.`

### B10. Gibson Cold Call plain sentence 2.1: garbled causal clause

- **Surface/field:** gibson, Cold Call plain-English sentences, `"at": "2.1"` (first item).
- **Current text:** `So enforcing it imposed no legally objectionable hardship, just because Cranage perhaps ought to have liked the portrait.`
- **Verdict:** OVERSTATED (the clause can be read as saying the hardship was absent because Cranage ought to have liked the portrait).
- **Pinpoint:** C&M 820 ("there is no hardship whatever in holding them bound by it").
- **Replacement (that sentence):** `So enforcing it imposed no legally objectionable hardship, even if Cranage perhaps ought to have liked the portrait.`

### B11. Flowchart K-27 node a: the preference for duty over condition is not stated

- **Surface/field:** Flowchart K-27 node a, `detail`.
- **Current text:** `A party may separately promise to bring the condition about.`
- **Verdict:** Teaching gap.
- **Counterexample:** The drafting problem and Note at C&M 816 teach that when language is unclear and the event is within the obligee's control, a court prefers an interpretation imposing a duty rather than a condition (§ 227(2) cmt. d), and the Peacock-type preference (§ 227(1)) reduces the obligee's risk of forfeiture. The chart's first node does not tell the student which reading to choose when the text is doubtful.
- **Pinpoint:** C&M 816 Note; Restatement § 227(1)–(2) and cmt. d.
- **Addition:** `If the language is doubtful, prefer reading an event within the obligee's control as a duty rather than a condition, and prefer the reading that reduces the obligee's risk of forfeiture (§ 227).`

---

## C. Checked and found supported

Supported (one line): Luttinger map entry (all sections and learning.topics), brief Parties/Procedural History/Material Facts/Issue/Holding/Reasoning, takeaway, Cold Call narrative and all ≈ sentences, timeline step 5, K-27 b and j, K-28 d and g (C&M 806–809); Peacock map entry (all sections; learning.topics other than forfeiture and risk-allocation), brief rule and all sections, takeaway, Cold Call and all ≈ sentences, timeline step 6, chronology 249, K-27 c and h (C&M 816–819); Gibson map entry and learning.topics other than good-faith, brief rule and sections, takeaway, Cold Call, ≈ sentences other than 2.1, timeline step 1, chronology 27, K-28 b edges (C&M 820–823); Kingston map entry, brief rule and sections, takeaway, Cold Call and all ≈ sentences, timeline step 0 (the "origin" label is defined in timelines.js as a selected starting point, consistent with C&M 828–829), chronology 2, K-27 d detail (C&M 828–831); Jacob & Youngs map entry, brief rule/Holding (4–3, C&M 851)/Reasoning, Cold Call episodes 1–3, ≈ sentences other than 3.2, conditions step 4 (note and context), damages step 0, breach-cure step 0, chronology 78, restatement-241 text (C&M 846–853; § 241); Gill map entry, brief Holding/Reasoning/Procedural History, Cold Call episodes 1–3 and ≈ sentences, timeline step 2, K-27 i (C&M 872–873); Nelson map entry, brief Holding/Reasoning/Material Facts, Cold Call and ≈ sentences, K-31 a and b (C&M 883–884); McKenna map entry, brief rule/Holding/Reasoning, takeaway, Cold Call and ≈ sentences, chronology 70, K-28 c and f (C&M 886–888); lecture-notes topics and conflicts (checked against casebook and selections only); K-28 e (§ 229 limit stated); black letter of restatement-224, -225, -226, -227, -229, -230, -234, -237, -240, -241, -245 and -84 against sel.txt.

Not in the assigned excerpt, so not tested: Gibson's first names, date and Bay County venue; Kingston's Douglas/Lofft report details (March 24, 1770 articles, £200 salary, £4,000 figure, action in debt); the Jacob & Youngs dissent's 900-foot/70-foot figures, the omitted part of the dissent, and the March 8, 1921 reargument order; Gill's March 20, 1889 contract date, April 4 supplement and evidence about post-flood prevention (the Atlas says the casebook's "ten days after the date of the contract" footnote conflicts with the full report; that conflict cannot be checked from the excerpt); Nelson's first appeal (89 Idaho 480) and lien history; McKenna's $7,750 original price, March 24 enlargement, $283.35 delay claim and the architect's testimony that no certificate was requested; Peacock's footnotes other than the bankruptcy note.
