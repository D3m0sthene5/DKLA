# OP-CT-05 challenge: Contracts Class 5, Promissory estoppel and restitution

Challenger review. Sources read: printed C&M pp. 69–74, 120–130, 135–146 (ct05-casebook.txt; printed pages fixed from the running heads "68", "70", "72", "74", "120", "126", "128", "130", "134", "136", "138", "140", "142", "144", "146"; the head on PDF p. 183 reads "111" and is printed p. 137), Restatement (Second) § 90 black letter and comments a–f (sel.txt lines 2771–2990), § 371 for context, and the 21-slide deck (ct05-slides.txt).

**Staging note.** The supplied ct05-surfaces.md is empty ("Contracts class 05: None") because the generator was called with "05" and the corpus keys classes as "5". I regenerated the surfaces read-only with `session_surfaces.py 5` into `ct05-surfaces-regen.md` in this packet folder; every surface quotation below comes from that file or from the named JSON file. prior-corrections.json touches only the reliance timeline; none of its corrections is repeated here except where the corrected text is itself wrong (finding 14).

Verdict labels follow WORKER-INSTRUCTIONS.md. Findings are ordered by effect on an exam answer.

---

## A. Findings that change a legal result

### 1. K-06 node d and notes-unrequested-benefit: the officious-intermeddler limit is narrowed to "unwilling" recipients

- **Surface:** tools/flowcharts/data/contracts.json, chart K-06, node `d`, `detail`; also map entry notes-unrequested-benefit, `notes` (cited by K-06 d).
- **Current text:** "Mistaken receipt or needed emergency aid differs from deliberately forcing a benefit on an unwilling recipient." and "A mistaken overpayment or mistakenly supplied service differs from a benefit deliberately forced on an unwilling recipient."
- **Verdict:** CHANGES RESULT.
- **Counterexample:** Posner's itinerant musicians serenade you on your porch and you enjoy it (C&M p. 145–146). You were not unwilling and the benefit was not "forced", so a student following node d answers "Unjust retention shown" → g, restitution. The casebook gives the opposite answer: there is "no obligation, in the absence of a contract, to pay them ... no matter how [much] you enjoyed it". The test is whether the benefit was unrequested and voluntarily conferred when bargaining was feasible, not whether the recipient objected.
- **Pinpoint:** C&M p. 145 (the limiting principle: one who intentionally confers a benefit, as opposed to acting by mistake, is an "officious intermeddler"; Restatement (Third) denies restitution "for an unrequested benefit voluntarily conferred" absent circumstances justifying the intervention); p. 146 (Indiana Lumbermens quotation).
- **Replacement (K-06 d):** "Mistaken receipt or justified emergency aid differs from an unrequested benefit conferred voluntarily when the claimant could have bargained first; absent circumstances justifying the intervention, that claimant recovers nothing even if the recipient enjoyed the benefit."
- **Replacement (notes-unrequested-benefit):** replace "a benefit deliberately forced on an unwilling recipient" with "an unrequested benefit voluntarily conferred, which ordinarily earns no restitution unless circumstances justified the intervention". (The unjust-enrichment map entry already states the rule correctly: "unrequested services voluntarily imposed on a recipient".)

### 2. K-07 nodes b and c: no branch asks whether the promisor should have expected the reliance or whether injustice requires enforcement

- **Surface:** contracts.json, chart K-07, node `c` edges and node `b` edges.
- **Current text:** node c edge `"label": "Identifiable alternative lost"` → f; node b edge `"label": "Retirement induced"` → f.
- **Verdict:** CHANGES RESULT (on a changed decisive fact) / MISSING CONDITION.
- **Route test, D&G Stout.** Facts as decided: General rejects National's priced offer after Bacardi's repeated assurances, given "in full knowledge that he planned to reject National's offer". Path: a –"At-will business opportunity"→ c –"Identifiable alternative lost"→ f "Measure the injury supported by the theory". Displayed result matches the source. **Changed fact:** Bacardi had no reason to know General was weighing a sale. Path is identical (a → c → f) and the chart still displays recovery. The source says the element is contested exactly there: the district court granted summary judgment because the promise "was not one on which it should reasonably have expected General to rely", and the Seventh Circuit reversed because Bacardi knew of the "lively negotiations" and reassured Stout "with the reasonable expectation that an immediate pull out would severely undermine General's asking price" (C&M pp. 140, 142). Node a's detail mentions "the decision it was reasonably expected to induce", but no edge tests it.
- **Route test, Feinberg.** Facts as decided: a –"Retirement"→ b –"Retirement induced"→ f. **Changed fact (slide 16, "What if she was capable of returning to work?"):** she retires in reliance, comparable work is readily available, and the company stops payment after a month. Path is again a → b → f with no injustice inquiry. In Feinberg the injustice element was the litigated point: the company argued Restatement (First) Illustration 2 did not apply, and the court answered that the illustration's disqualification goes to "the part of Section 90 regarding the prevention of injustice", then relied on her age and the near-impossibility of finding comparable work (C&M pp. 127–128).
- **Pinpoint:** Restatement (Second) § 90(1) and comment b ("The promisor is affected only by reliance which he does or should foresee, and enforcement must be necessary to avoid injustice"); C&M pp. 127–128, 140, 142.
- **Replacement:** node c edge label "Identifiable alternative lost, and the promisor should have expected that reliance" → f; add edge "Promisor had no reason to expect the reliance" → g. Node b edge label "Retirement induced, and only enforcement avoids injustice" → f; add edge "Induced, but no injustice if unenforced" → g. Add to node g detail: "The same holds where the promisor could not reasonably have expected the reliance, or where leaving the promise unenforced causes no injustice."

### 3. K-06 node c: the injustice element is stated as "whether justice requires enforcement"

- **Surface:** contracts.json, chart K-06, node `c`, `detail`.
- **Current text:** "Ask whether justice requires enforcement."
- **Verdict:** MISSING CONDITION (states the test the assigned case rejects).
- **Counterexample:** Cohen on remand: "the test is not whether the promise should be enforced to do justice, but whether enforcement is required to prevent an injustice", a legal question for the court (C&M p. 136). A student who asks only whether enforcement would be just will enforce morally attractive promises whose breach leaves the promisee no worse off (Congregation Kadimah Toras-Moshe v. DeLeo, "no injustice in declining to enforce" an oral pledge, C&M p. 129). The node also says "foreseeably", not the § 90 standard "should reasonably expect".
- **Pinpoint:** Restatement (Second) § 90(1) ("binding if injustice can be avoided only by enforcement of the promise"); C&M pp. 126, 128, 136.
- **Replacement:** "Identify a promise and the action or forbearance the promisor should reasonably have expected and that it actually caused. Ask whether injustice can be avoided only by enforcement, not whether enforcement would do justice. Feinberg retired in response to the pension resolution."

### 4. Feinberg: the consideration analysis is reduced to "she promised nothing", dropping the absence of any condition of continued work

- **Surfaces:** feinberg Cold Call plain-English sentence at "3.0" (second); map entry `summary`; takeaway (tools/r19/data/takeaways.json).
- **Current text:** "She never promised anything in return, so there was no bargain that made the pension a contract." / "because past service cannot be bargained for and she promised no further work" / "was not paid for by past work or by any promise to keep working"
- **Verdict:** CHANGES RESULT (on the drafting variation the casebook and slide 17 assign).
- **Counterexample:** Note 2 on p. 73 and slide 17 ask how Lippman's lawyer could have drafted the resolution. If the board had resolved that she would receive the pension if she worked until June 30, 1949, she would still have promised nothing, yet her continued work would be a requested performance and consideration under Restatement (First) § 75(1)(a) ("an act other than a promise", "bargained for and given in exchange"), quoted at pp. 72–73. A student applying the Atlas's sentence ("never promised anything ... so there was no bargain") would wrongly deny a contract. The court's first reason was the missing condition: "There is no language in the resolution predicating plaintiff's right to a pension upon her continued employment. She was not required to work for the defendant for any period of time as a condition" (p. 72).
- **Pinpoint:** C&M pp. 72–73; slide 15 ("Continuation of employment — Not sought by promisor; not clearly induced by promise"); slide 17.
- **Replacements:**
  - Plain sentence: "She could retire at once, the pension was not conditioned on further work, and she never promised to stay, so nothing was bargained for in exchange and there was no contract."
  - Map summary: replace the quoted clause with "because past service cannot be bargained for and the pension was neither conditioned on further work nor exchanged for a promise of it".
  - Takeaway (53 words, two sentences): "A company's pension promise was not paid for by her past work, by work it never required, or by any promise to keep working. It bound the company anyway: it should have expected her to retire in reliance, she did, and once comparable work was out of reach only enforcement could avoid injustice." (This also cures finding 10.)

### 5. Cohen takeaway: enforcement stated without reliance or injustice

- **Surface:** cohen-cowles, Takeaway (tools/r19/data/takeaways.json).
- **Current text:** "A source who was promised confidentiality and then named in print can sue the newspaper for breaking that promise under promissory estoppel."
- **Verdict:** OVERSTATED / MISSING CONDITION.
- **Counterexample (route test):** change the decisive fact so that the reporters promise anonymity only after Cohen has already handed over the records. The takeaway still says he "can sue". The Minnesota formulation requires a clear and definite promise, that "the promisor must have intended to induce reliance on the part of the promisee, and such reliance must have occurred to the promisee's detriment", and that enforcement be required to prevent injustice, which the court found only because of the papers' own confidentiality practice and the absence of "any compelling need in this case to break that promise" (C&M pp. 135–136). The Cold Call account preserves the timing ("not ... a promise made after Cohen had already disclosed everything"); the takeaway does not. K-07 node e handles the changed fact correctly (e –"Predicates fail"→ g).
- **Pinpoint:** C&M pp. 135–137.
- **Replacement (48 words):** "A newspaper that promised a source confidentiality to get his documents, then named him, was liable under Minnesota promissory estoppel because he disclosed in reliance on the promise and enforcement was needed to prevent injustice. Applying that general law to the press does not violate the First Amendment."

### 6. Ricketts takeaway: rests the estoppel on the grandfather's purpose, which the court said it need not find

- **Surface:** ricketts, Takeaway.
- **Current text:** "because he meant his granddaughter to quit her job in reliance on it and she did"
- **Verdict:** MISSTATES HOLDING (narrows the basis).
- **Counterexample:** the court wrote: "He doubtless desired that she should give up her occupation, but, whether he did or not, it is entirely certain that he contemplated such action on her part as a reasonable and probable consequence of his gift" (p. 123). On a variation where the grandfather is indifferent to whether she quits but knows she very probably will, the takeaway's "meant" leads a student to deny relief; the opinion's reasoning grants it. The brief rule and Holding already say "reasonable, foreseeable reliance" and "reasonably could foresee"; only the takeaway departs.
- **Pinpoint:** C&M p. 123.
- **Replacement (44 words):** "A grandfather's gift promise had no price attached, so it was not a bargain. But because he could see that his granddaughter would quit her job in reliance on it, and she did, his estate was estopped from refusing payment for want of consideration."

### 7. Ricketts: a ruling on her later return to work is attributed to the court

- **Surfaces:** ricketts map entry `sections.Reasoning`; effective brief CTR-023 `Reasoning` (third paragraph); Cold Call episode-5 paragraph 4 and episode-2 `cue`.
- **Current text:** "Her later return to work did not undo reliance that had already occurred." / "Her later return to work, with his help, did not defeat reliance that had already occurred." / "Scothorn’s later return to employment did not undo what she had already given up." / cue "Why did taking a second job not defeat the promise?"
- **Verdict:** UNSUPPORTED BY ASSIGNED SOURCES (not in the assigned excerpt).
- **Counterexample:** the excerpt reports the Funke & Ogden job only in the facts (p. 121); the reasoning (pp. 122–123) never discusses it. A student asked "she went back to work a week later; does the estoppel still hold?" would cite the Atlas for a holding the printed opinion does not contain. The inference is reasonable, but it must be labeled as an inference.
- **Pinpoint:** C&M pp. 121–123.
- **Replacement (all three):** "The opinion does not discuss her later job; on its reasoning, the change of position occurred when she gave up her position at Mayer Brothers." Cue: "Did her later job matter to the estoppel?"

### 8. D&G Stout plain sentence: the Eby wages are enlarged to all pay from the old job

- **Surface:** dg-stout Cold Call plain-English sentence at "2.2" (first).
- **Current text:** "may recover moving costs or pay from a job given up to take it"
- **Verdict:** OVERSTATED (drops "in preparation").
- **Counterexample:** a worker quits a $60,000 job for a promised at-will job that is withdrawn. On the Atlas's wording she recovers the "pay from a job given up", which reads as the old salary going forward. Eby allowed moving expenses and wages from "plaintiff's old job during the few days plaintiff [was preparing to move]"; those are "a presently determinate sum for the purpose of relocating", not future income, which "promissory estoppel will not [protect] in an at-will employment setting" (C&M pp. 140–141). The source sentence and the at-will-reliance map entry ("old wages forgone in preparing to move") are correct.
- **Pinpoint:** C&M pp. 140–141.
- **Replacement:** "By comparison, someone promised an at-will job is not guaranteed future pay at the new job, but may recover moving costs and the wages given up at the old job while preparing to move."

### 9. D&G Stout timeline step: an appellate reversal of summary judgment is stated as an entitlement

- **Surface:** tools/r19/data/timelines.json, timeline `reliance`, step `dg-stout`, `note`.
- **Current text:** "Reliance on an at-will assurance earns reliance damages, such as a lost sale price, not the profits the relationship would have brought (Indiana law)."
- **Verdict:** OVERSTATED.
- **Counterexample:** the 1991 decision holds only that the claimed loss is a reliance injury Indiana law can redress; "General's allegations still must be proven at trial", and how long General could reasonably rely "is an issue of reasonable reliance" for trial (C&M p. 143). "Earns" also implies every at-will assurance yields damages, without the foreseeability on which the court relied (p. 142). "A lost sale price" misdescribes the injury, which was the decline in the price (lost bargaining leverage), not the price.
- **Pinpoint:** C&M pp. 138, 142–143.
- **Replacement:** "An at-will supplier's assurances could support reliance damages for the drop in a sale price the distributor gave up, though not lost future profits; the case went to trial for proof (Indiana law)."

### 10. D&G Stout takeaway and Feinberg timeline step: elements of § 90 dropped

- **D&G takeaway.** Current text: "It can still make the promisor pay for a real opportunity you gave up in reliance on it." Verdict: MISSING CONDITION. Counterexample: the changed fact in finding 2 (supplier with no reason to expect the reliance); the takeaway still promises recovery. Pinpoint: C&M pp. 140, 142. Replacement (50 words): "A promise to keep an at-will relationship going cannot earn you the future profits you hoped for, because it could end at any time. It can still make the promisor pay for a real opportunity you gave up in reliance on it, if the promisor should have expected that reliance."
- **Feinberg timeline step** (timelines.json, `reliance`, step `feinberg`, `note`). Current text: "A pension promise binds under § 90 because the employee retired in reliance on it". Verdict: MISSING CONDITION (no injustice element, which was the contested issue; see finding 2). Pinpoint: C&M pp. 127–128. Replacement: "A pension promise binds under § 90 because the company should have expected the retirement it induced and only enforcement could avoid injustice, though her past service was no consideration (Missouri)."

---

## B. Errors that do not by themselves change a result

### 11. K-06 node f and K-07 node f: the remedy nodes show only reliance-measured relief

- **Current text:** K-06 f "Compensation may protect the lost opportunity or other induced loss. D&G Stout protected a foregone sale price despite the distributorship’s at-will character." K-07 f "Ask what relief justice requires for the induced change, such as the provable value of a foregone opportunity."
- **Verdict:** MISSING CONDITION.
- **Route test:** Ricketts (K-06 a → c → f) and Feinberg (K-06 a → b → c → f; K-07 a → b → f) both end at nodes whose only example is a reliance measure. The courts enforced the promises as made: the $2,000 note (p. 123) and $5,100 in accrued $200 installments (pp. 69, 128). Comment d: "A promise binding under this section is a contract, and full-scale enforcement by normal remedies is often appropriate." A student would compute Feinberg's lost salary or Scothorn's lost wages. The Problem at p. 130 asks which plaintiffs "might appropriately be limited" to reliance, so the limit is a question, not the default.
- **Pinpoint:** § 90 comment d; C&M pp. 123, 128, 129 (Note 1), 130.
- **Replacement (K-06 f):** "Full enforcement is often appropriate: Ricketts and Feinberg recovered what was promised. The remedy may be limited as justice requires; D&G Stout protected a foregone sale price, not future profits, despite the distributorship’s at-will character." **(K-07 f):** "Ask what relief justice requires for the induced change: enforcement of the promise as made (Feinberg's installments) or a limited measure such as the provable value of a foregone opportunity (D&G Stout). A bargained-for memorial pledge can proceed on its separate contract footing."

### 12. Ricketts plain sentence at "5.1": promissory estoppel defined without the promisor's expectation or the injustice requirement

- **Current text:** "Today this idea, enforcing a promise because someone reasonably relied on it, is called promissory estoppel."
- **Verdict:** MISSING CONDITION.
- **Counterexample:** slide 11's variation, Scothorn buys a horse in reliance on the note. Her reliance may be reasonable, but § 90 asks whether the promisor should reasonably have expected that action and whether only enforcement avoids injustice; comment f adds that a gift promise is enforced on reliance "only if his conduct is foreseeable and reasonable and involves a definite and substantial change of position which would not have occurred if the promise had not been made".
- **Pinpoint:** C&M pp. 123 (Note 1), 128; § 90 comment f.
- **Replacement:** "Today this idea is called promissory estoppel: a promise binds when the promisor should reasonably expect it to induce action, it does, and only enforcement can avoid injustice."

### 13. Feinberg map entry Issue: the company's illness argument is misdescribed

- **Current text:** "notwithstanding the company’s argument that her later disability, not the promise, explained her inability to work"
- **Verdict:** MISSTATES HOLDING (misstates the argument the court answered).
- **Source:** the company argued that Restatement (First) § 90 Illustration 2 was inapplicable because there the promisee "became 'disqualified' ... before A discontinued the payments", whereas Feinberg's cancer came after. The court treated that as an injustice question ("The injustice would occur regardless of when the disability occurred") and separately held that the illness was not the induced "action or forbearance" (pp. 127–128). The Atlas wording turns it into a causation argument.
- **Replacement:** "notwithstanding the company’s argument that, unlike the Restatement's illustration, she did not become unable to work until after it cut the payments"

### 14. Reliance timeline `now` (corrected text) and `rest90` step: "expected" in place of "should reasonably expect"

- **Current text:** "a promise can bind when reliance was expected, actually occurred" (timelines.json, `reliance`, `now`; prior correction 2026-11-17-timeline-redesign) and "The First Restatement states a route to enforcing promises that induce expected, substantial reliance." (step `rest90`, `note`).
- **Verdict:** MISSING CONDITION. Both Restatements use an objective standard ("should reasonably expect", pp. 126, 128). The Atlas's own D&G Stout brief reports that the remand court applied "an objective foreseeability standard" although Bacardi "lacked actual knowledge" of the National talks; "reliance was expected" invites a subjective reading.
- **Replacement (`now`, first sentence):** "Under the Restatement § 90 approach, a promise can bind when the promisor should reasonably have expected it to induce reliance, it did, and enforcement is necessary to avoid injustice." (`rest90` note) "The First Restatement enforces promises that the promisor should reasonably expect to induce definite and substantial reliance."

### 15. Feinberg Holding: a concession is reported as a holding, and the reason given is the editors'

- **Surfaces:** map entry `sections.Holding`; brief CTR-022 `Holding`.
- **Current text:** "Past service was not consideration, because acts already performed cannot be sought in exchange for a later promise" / "held that Feinberg's past service and her additional eighteen months of work supplied no bargained-for consideration"
- **Verdict:** MISSTATES HOLDING (minor). "Plaintiff concedes that a promise based upon past services would be without consideration" (p. 72); the court decided only the continued-employment contention. The reason "cannot be sought in exchange" is the doctrine the editors invite at Note 1 ("Why was it so clear to everyone ...?", p. 73), not the court's reasoning.
- **Replacement (map):** "Feinberg conceded that past service was not consideration. Continued employment was not, because the resolution did not condition the pension on further work and she promised none." (brief) "held, Feinberg having conceded that past service could not be consideration, that her additional eighteen months of work supplied no bargained-for consideration".

### 16. K-06 node b edge: Cohen's no-contract ruling is labeled "No bargain"

- **Current text:** `"label": "No bargain, but promise induced action"`
- **Verdict:** MISSING CONDITION (minor). Route test, Cohen in K-06: a –"Bargained-for exchange"→ b. In Cohen I the court agreed offer, acceptance and consideration seemingly appeared but held the parties "were not thinking in terms of a legally binding contract" (pp. 135, 137). The only exit to c says "No bargain", which misdescribes the case.
- **Replacement:** "No binding bargain, but promise induced action".

### 17. D&G Stout learning topic: the editors' question is attributed to the court

- **Current text:** "The court asked whether Bacardi's statements were reasonably understood as a commitment rather than a mere expression of present intention."
- **Verdict:** UNSUPPORTED BY ASSIGNED SOURCES. Note 1 asks whether the statement "that it had no intention of taking its line to another distributor" was a promise (p. 143); the court treated it as a promise and asked whether it was a "meaningless restatement" of the at-will relationship (p. 142).
- **Replacement:** "The casebook asks whether Bacardi's statement of intention was a promise; the court treated it as one and held that it was not a meaningless restatement of the at-will relationship."

### 18. Feinberg Cold Call `proceedings`: court name

- **Current text:** "The Missouri Court of Appeals affirmed on March 17, 1959"
- **Verdict:** WRONG CITATION (court name). The caption is "Saint Louis Court of Appeals, Missouri, 1959" (p. 69 context; p. 127). Replacement: "The St. Louis Court of Appeals affirmed on March 17, 1959".

### 19. K-07 node b: the Hayes problem is given a displayed result

- **Current text:** edge "Same retirement already planned" → g "No recovery for this asserted reliance".
- **Verdict:** UNSUPPORTED BY ASSIGNED SOURCES (the problem is open). The problem asks "What result? Do the facts ... differ significantly?" (p. 128). Hayes also "sought no other employment" while paid, and § 90 Illustration 4 binds a pension promise where "A retires and forbears to work elsewhere for several years while B pays the pension". The chart's "No recovery" may be right on the decision to retire but does not ask about the later forbearance.
- **Replacement (add to node b detail):** "If the retirement was already planned, ask whether the assurance induced a later forbearance, such as not seeking other work (Restatement § 90 ill. 4)."

---

## C. Lecture notes compared with the slides

The lecture-notes record matches the 21 slides closely. One note departs from its slide; three slides carry shorthand that needs a legal qualification.

### 20. "The elements in Restatement § 90": § 90(2) loses "under Subsection (1)"; comment b loses "in relation to the remedy sought"

- **Current text:** "Section 90(2) binds a charitable subscription or marriage settlement without proof of reliance." and "including the reasonableness and the definite and substantial character of the reliance"
- **Verdict:** OVERSTATED (the note departs from slide 8 and slide 7/13).
- **Source:** slide 8 and § 90(2): "is binding under Subsection (1) without proof that the promise induced action or forbearance". Slides 7/13 and comment b: "its definite and substantial character in relation to the remedy sought", preceded by "The promisor is affected only by reliance which he does or should foresee". C&M p. 129 Note 2: "the law on charitable subscriptions remains unsettled; most jurisdictions have not even addressed the matter"; King v. Trustees of Boston University still asked for consideration or reliance, and DeLeo found no injustice in declining to enforce an oral pledge to a synagogue.
- **Replacement:** "Section 90(2) makes a charitable subscription or marriage settlement binding under Subsection (1) without proof that the promise induced action or forbearance." Add: "Legal qualification: the casebook reports that the law on charitable subscriptions remains unsettled and most jurisdictions have not addressed § 90(2); the Massachusetts court in King v. Trustees of Boston University still asked for consideration or reliance (C&M p. 129)." In the comment b sentence, insert "in relation to the remedy sought" after "definite and substantial character of the reliance".

### 21. "Overview of restitution" (slide 3): measure and "implied contracts"

- **Current text:** "Recovery may be measured by the cost of the goods or services or by how far they increased the value of the defendant's property or advanced the defendant's interests." The note accurately records slide 3.
- **Verdict:** MISSING CONDITION in the slide's shorthand; keep the classroom wording.
- **Why it matters:** "cost of the goods or services" reads as the claimant's outlay, which is the reliance measure. Restitution measures the benefit received: liability "derives from the receipt of a benefit whose retention without payment would result in the unjust enrichment of the defendant" (C&M p. 145). Slide 3's "implied contracts" also needs reading as contracts implied in law; C&M p. 146 uses quasi-contract for a claim "not based on a true contract".
- **Proposed added sentence:** "Legal qualification: restitution measures the benefit the defendant received, not the claimant's loss (C&M p. 145); under Restatement (Second) § 371(a) the 'cost' is what it would have cost the defendant to obtain the benefit from someone in the claimant's position, and 'implied contracts' here means contracts implied in law (quasi-contract), not true contracts implied from conduct (C&M p. 146)."

### 22. "Cohen v. Cowles Media" (slide 18) and "Contract and promissory estoppel compared" (slide 9)

- Slide 18 lists "Promisor should reasonably expect reliance" as an element for Cohen. Minnesota's formulation was stricter and differently worded. **Proposed added sentence:** "Legal qualification: the Minnesota court required a clear and definite promise and a promisor who intended to induce reliance, and it asked whether enforcement was required to prevent an injustice, a legal question for the court, not whether enforcement would do justice (C&M pp. 135–136)."
- Slide 9's "The requirement of a definite promise?" and "The remedy?" **Proposed added sentence:** "Legal qualification: § 90's text does not require a definite promise, but Minnesota in Cohen required a 'clear and definite' one (C&M p. 135); § 90(1) allows the remedy to be limited as justice requires, while comment d says full-scale enforcement is often appropriate."
- The recorded citation conflict ("50 U.S. 663, 672" on the slide; 501 U.S. 663) is accurate.

### 23. "Feinberg v. Pfeiffer Co." (slide 15): optional pairing

The note correctly says the extracted text does not show which objection goes with which candidate. The four objection entries, read in order (the third spans two lines after a semicolon), match the four candidates one-to-one, and each pairing matches the casebook: past services "not induced by promise"; promise to continue "not supported by evidence" (p. 72, "she made no promise or agreement to continue"); continuation "not sought by promisor; not clearly induced by promise" (pp. 70, 72); retirement "not sought by promisor". If the editor wants to state the pairing, label it as an inference from slide order.

---

## D. Route test summary (section A gives the details)

| Case | Chart and path, facts as decided | Displayed result | Decisive fact changed | Chart result | Source result |
|---|---|---|---|---|---|
| Ricketts | K-06 a –Induced reliance→ c –Predicates met→ f | Relief justice requires (reliance examples only) | Note revoked before she quit | c –No reliance theory proven→ h, no recovery | No recovery (no change of position, p. 123). Chart correct. ≈ 4.1 keeps "changes position for the worse". |
| Ricketts | same | same | Grandfather indifferent but foresaw quitting | Same path; the takeaway says he "meant" her to quit | Estoppel holds ("whether he did or not", p. 123). Takeaway wrong (finding 6). |
| Feinberg | K-06 a → b –No bargain…→ c → f; K-07 a –Retirement→ b –Retirement induced→ f | Measure the injury (opportunity example) | Retirement already planned (Hayes) | K-07 b → g, no recovery | Open problem; plausible (finding 19). |
| Feinberg | K-07 a → b → f | same | Induced retirement, comparable work readily available | Still f; no injustice gate | Injustice element may fail (pp. 127–128). Chart wrong (finding 2). |
| Feinberg | — | — | Pension conditioned on two more years' work | ≈ 3.0 and takeaway: no bargain | Continued work as a requested act would be consideration (pp. 72–73). Wrong (finding 4). |
| Cohen | K-07 a –Confidential disclosure→ e –Promise, reliance and injustice shown→ f | Measure the injury | Promise given after disclosure | e –Predicates fail→ g | No reliance; chart correct. Takeaway wrong (finding 5). |
| D&G Stout | K-07 a –At-will business opportunity→ c –Identifiable alternative lost→ f; K-06 a → c → f | Measure the lost opportunity | Supplier had no reason to expect the sale decision | Still f | Expectation element contested (pp. 140, 142). Chart wrong (finding 2). |
| D&G Stout | K-07 c –Future profits alone→ g | No recovery | (claim for future Bacardi profits) | g | Correct (pp. 141–142). ≈ 2.1 correct; ≈ 2.2 overstates Eby (finding 8). |

---

## E. Teaching gaps (assigned material no surface teaches)

1. **§ 90 comment d: full enforcement and the performance cap.** The rest90 entry says the comments "are not imported". Fuller's nephew problem (p. 129) and the Problem at p. 130 turn on comment d. Home: map entry problem-nephew-shop, `notes`. Draft: "Comment d: a promise binding under § 90 is a contract and full enforcement is often appropriate, but relief may be limited to reliance or restitution; unless the promisor is unjustly enriched, damages should not put the promisee in a better position than performance would have, and for a gift promise it would rarely be proper to award more than performance would have cost the promisor."
2. **Cohen's "prevent an injustice", not "do justice".** No surface states it (search for "do justice" finds nothing). Home: brief CT-CB-0135, `Reasoning`, 1992 paragraph. Draft: "The court stressed that the test is not whether enforcement would do justice but whether enforcement is required to prevent an injustice, and it found injustice here because the newspapers themselves treated such promises as binding and showed no compelling need to break this one."
3. **Feinberg: why retirement itself was not consideration.** Slide 15 lists retirement as a candidate ("Not sought by promisor"); no surface explains it. Home: brief CTR-022, `Reasoning`, end of first paragraph. Draft: "Retirement was not consideration either: the board hoped she would keep working and did not seek her retirement as the price of the promise; retirement mattered only as reliance."
4. **Ricketts: why the court's "equitable estoppel" is not the classic doctrine.** Note 2 (p. 123) explains that equitable estoppel rests on a representation of fact, while Scothorn relied on a promise. The equitable-estoppel map entry says this, but the Ricketts brief, the case a student opens, does not. Home: brief CTR-023, `Reasoning`, last paragraph. Draft: "Classic equitable estoppel rests on reliance on a representation of fact; Scothorn relied on a promise about future payment, which is why later writers call the doctrine promissory estoppel (C&M p. 123)."
5. **Comment f's test for gift promises.** The slide 11 horse variation and Hayes need it. Home: rest90 map entry, `notes`. Draft: "Comment f: a gift promise is enforced on reliance only if the promisee's conduct is foreseeable and reasonable and involves a definite and substantial change of position that would not have occurred without the promise; for charitable subscriptions a probability of reliance is enough."
6. **§ 90 Illustration 8 parallels D&G Stout.** A dealer franchise revocable at will: the promisee recovers $1,150 spent preparing, not lost profit on 30 radios. Home: at-will-reliance map entry, `notes`. Draft: "Restatement § 90 Illustration 8 reaches the same line: reliance on a promise of an at-will franchise supports the expenses of preparing to do business but not the lost profits on the promised goods."
7. **D&G Stout footnote 1: a possible term promise.** The court saw "a plausible argument that the promise was one for a term, namely that Bacardi would stay on at least until the rush toward consolidation passed", but deferred to the district judge's contrary finding (p. 140 n.1). Home: brief CTR-024, `Reasoning`, first paragraph. Draft: "The court noted a plausible argument that Bacardi promised to stay until consolidation passed, which would have been a promise for a term, but accepted the district court's finding that no term was promised."

---

## F. Statements found supported

Supported: Ricketts map summary, Issue and Holding, brief rule, Holding and Procedural History, Cold Call episodes 1, 3, 4 and 6, plain sentences 2.0–5.0, timeline step and chronology step; Feinberg brief rule, map and brief Reasoning on § 90 (First) and injustice, learning topic "reliance-damages", plain sentences 0.2, 2.0, 3.1 and 4.1, Cold Call "limits", K-07 b detail on illness; Cohen map summary and Holding, brief rule and Holding, Cold Call episodes 1, 3 and 8, plain sentences 1.1, 2.1, 7.0 and 7.2, timeline step 8, K-07 e; D&G Stout map summary, Issue and Holding, brief rule, Holding and first two Reasoning paragraphs, plain sentences 2.1, 2.3 and 4.1 (except as noted for 2.2), K-07 c "Future profits alone" branch; restatement-90 rules entry (matches sel.txt and C&M pp. 128–129); restitution timeline `now` and `guide`; remedy-interests `guide`; charitable-pledges, note-charity-comparisons, note-allegheny, at-will-reliance, reliance-interest, quantum-meruit and unjust-enrichment map entries; and the lecture notes on history, applications, Ricketts, at-will employment, D&G Stout, justifications and the Cohen citation conflict.

Not in the assigned excerpt, not marked wrong: D&G Stout trial-stage details (itemized $394,050, Fort Wayne exclusion, interest, Canandaigua, Bacardi's lack of actual knowledge), which come from 805 F. Supp. 1434. C&M Note 2 (p. 143) describes the award as the difference between National's initial offer and the final price, totaling $394,050. Also not in the excerpt: Cohen's procedural details below the Minnesota Supreme Court, Feinberg's Missouri precedents, and Ricketts's "between the original parties" point about the note form.
