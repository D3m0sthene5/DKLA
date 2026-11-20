# OP-CT-05 comparison: Contracts Class 5, promissory estoppel and restitution

Sources: `ct05-casebook.txt` (C&M 10th ed., assigned printed pp. 69–74, 120–130, 135–146; printed page = PDF
page − 46 throughout this extract), Restatement (Second) § 90 black letter and comments a–f in the Selections
(§ 86 and § 371 read for contrast), `ct05-slides.txt` (21 slides). Pages cited are printed C&M pages.

**Staging note.** The staged `ct05-surfaces.md` was empty ("Contracts class 05: None"): the staging script passed
"05", and the corpus keys classes as "5". I regenerated the file with
`python3 -I tools/content-audit/session_surfaces.py 5` (read-only) and saved the output over the empty file in
this packet folder. Classes 06–10 were probably staged with the same fault; their surfaces files should be
checked. Non-principal nodes cited below (rest90, promissory-estoppel, equitable-estoppel, charitable-pledges,
past-consideration, unjust-enrichment and others) were read from the raw files in
`src/data/seedData/nodes-45978ecb29/`; any r21 run-time overlay on them was not applied.

**Prior corrections.** `prior-corrections.json` covers only the `reliance` timeline (title, question, guide,
`now`, and the notes, context and effect fields of several steps). None is repeated here. The Ricketts primary
review (evidence register, CTR-023) retained the brief text; the Ricketts findings below (E3, E4, E21) concern
the takeaway, a plain-English sentence and the map's facts, which that review did not change.

## 1. Coverage table

| Assigned item | Pages | Atlas surfaces that teach it | Status |
|---|---|---|---|
| Feinberg, first excerpt: facts, testimony, no consideration in past service or continued work | 69–73 | feinberg map/brief/Cold Call; past-consideration | Covered. E2, E5 |
| Feinberg note 2: drafting the resolution | 73 | lecture note (slide 17) only | Gap G6 |
| Prentis naming problem | 73–74 | problem-prentis | Covered (question only) |
| Mills v. Wyman, opening page; moral obligation | 74 | past-consideration (mention) | Covered as boundary |
| Posner on gratuitous promises (end) ; DeMentas v. Tallas problem | 120 | problem-dementas; Posner absent | Minor gap G12 |
| Section 4 introduction: reliance as a basis of enforcement | 120 | promissory-estoppel | Covered |
| Ricketts v. Scothorn | 121–123 | ricketts map/brief/takeaway/Cold Call; timeline step 1; K-06 c | Covered. E3, E4, E21 |
| Ricketts notes 1–2 (hypotheticals; equitable vs promissory estoppel) | 123 | equitable-estoppel (note 2); note 1 absent except lecture note | Gap G5 |
| From Equitable to Promissory Estoppel: Holmes; four categories | 124–125 | equitable-estoppel; note-reliance-history | Covered. E22; Holmes absent (G12) |
| Charitable subscriptions; Allegheny; bellwether subscriptions | 124–126 | charitable-pledges; note-allegheny | Covered except bellwether route (G8) |
| Restatement First § 90; Williston | 126 | rest90; notes-rest90-history | Covered |
| Feinberg, second excerpt: § 90 applied; illness not the induced act | 127–128 | feinberg surfaces; K-06 c; K-07 b | Covered. E1 |
| Hayes problem | 128 | problem-hayes; K-07 b | Covered |
| Restatement Second § 90; the deletion and the remedy sentence | 128–129 | rest90; restatement-90 entry; lecture notes | Partly covered. G1, G2, E19 |
| Note 1: uncle and nephew (Fuller & Perdue) | 129 | problem-nephew-shop | Covered (question only); G1 supplies the rule |
| Note 2: § 90(2) unsettled; King; Kadimah | 129 | charitable-pledges; note-charity-comparisons | Covered. G8 for the lecture note |
| Note 3: Gilmore, Atiyah | 130 | notes-rest90-history (Gilmore only) | Atiyah absent (G12) |
| Problem: Applied Measures of Recovery | 130 | problem-reliance-measures | Covered (question only); E1 is the chart side |
| Vastoler (end of note) | 135 | note-vastoler | Covered |
| Cohen v. Cowles Media (remand) and note | 135–137 | cohen-cowles surfaces; notes-cohen; K-07 e | Covered. E10–E12, G3, G4 |
| Ypsilanti problem | 137–138 | problem-ypsilanti | Covered |
| D&G Stout v. Bacardi | 138–143 | dg-stout surfaces; at-will-reliance; reliance-interest; K-06 f; K-07 c | Covered. E7, E13–E18 |
| D&G notes 1–3 (promise or intention; remand; at-will) | 143 | dg-stout learning topics; notes-stout-remand | Covered. E17, E18 |
| Barnes v. Yahoo problem | 143–144 | problem-barnes; note-barnes | Covered |
| Section 5: Restitution as an Alternative Basis for Recovery | 145–146 | unjust-enrichment; restitution-interest; quantum-meruit; notes-unrequested-benefit; K-06 d, g | Covered. E24, G9 |
| Cotnam v. Wisdom (opening only) | 146 | cotnam-boundary | Covered as boundary |
| Restatement § 90 comments b, d, f | Selections | lecture notes quote comment b; comments d and f absent (rest90 says "not imported") | Gaps G1, G2 |

## 2. Errors in existing text

Ordered with findings that change a legal result first.

### E1. K-06 node f and K-07 node f present the § 90 remedy as compensation for the induced loss — CHANGES RESULT

- **Surface:** `tools/flowcharts/data/contracts.json`, K-06 node `f` "Grant the relief justice requires", field `detail`:
  "Compensation may protect the lost opportunity or other induced loss. D&G Stout protected a foregone sale price despite the distributorship’s at-will character."
  K-07 node `f` "Measure the injury supported by the theory", field `detail`:
  "Ask what relief justice requires for the induced change, such as the provable value of a foregone opportunity."
- **Verdict:** CHANGES RESULT. Every reliance route in both charts ends at these nodes. Both details describe only
  a reliance measure. In two of the four principal cases the court enforced the promise as made: Ricketts enforced
  the $2,000 note (p. 123), and Feinberg affirmed $5,100 in accrued installments of the promised $200 a month
  (pp. 69, 128). Williston told the ALI that a binding promise "has to be enforced as it is made" (p. 126), and
  § 90 comment d says a promise binding under § 90 "is a contract, and full-scale enforcement by normal remedies is
  often appropriate"; relief "may sometimes be limited" to restitution or reliance.
- **Counterexample:** Enter Feinberg in K-07: a → "Retirement" → b → "Retirement induced" → f. The displayed result
  tells the student to measure "the injury … for the induced change." A student answering the p. 130 problem ("which
  of them might appropriately be limited to recovery based on the reliance interest? … Anna Feinberg?") would
  compute her lost salary or similar loss. The court awarded the promised installments. "Foregone sale price" in
  K-06 f is also imprecise: D&G Stout protected the drop in the price General could get (pp. 139, 142), not a price.
- **Pinpoint:** C&M pp. 123, 126, 128, 141–142; § 90(1) second sentence and cmt. d (Selections).
- **Replacement (K-06 f detail):** "Full enforcement of the promise is often appropriate: Ricketts's note and
  Feinberg's pension installments were enforced as promised. The remedy may be limited as justice requires: D&G
  Stout protected the lost value of a forgone sale opportunity despite the distributorship’s at-will character."
  Add `ricketts` and `feinberg` to the node's sources.
- **Replacement (K-07 f detail, first sentence):** "Ask what relief justice requires: often enforcement of the
  promise as made, as in Feinberg, and sometimes a limited measure such as the provable value of a foregone
  opportunity, as in D&G Stout." Keep the memorial-pledge sentence.

### E2. Feinberg: "she promised no further work" stated as the whole reason continued employment was not consideration — MISSING CONDITION

- **Surfaces and exact text:**
  - Cold Call plain-English sentence at "3.0": "She never promised anything in return, so there was no bargain that made the pension a contract."
  - Takeaway (tools/r19/data/takeaways.json): "A company's promise of a pension was not paid for by past work or by any promise to keep working."
  - Map entry: summary: "because past service cannot be bargained for and she promised no further work"
- **Verdict:** MISSING CONDITION. The court gave two reasons: "There is no language in the resolution predicating
  plaintiff's right to a pension upon her continued employment. She was not required to work for the defendant for
  any period of time as a condition," and she made no promise to continue (p. 72). A requested performance can be
  consideration without any return promise (§ 71(3)(a), quoted as First Restatement § 75(1)(a) at pp. 72–73).
  The plain sentence also drops the source sentence's own condition ("Feinberg could retire immediately").
- **Counterexample (decisive fact changed):** the resolution grants the pension "if she remains in our employ until
  June 30, 1949," and she stays. She still promises nothing. The three texts say there is no bargain; on the
  court's own reasoning (p. 72) the requested continued service would be consideration, and the claim would go
  through K-06 b → "Binding bargain and breach" → e on a contract footing.
- **Replacements:**
  - Plain sentence: "She could retire at once and never promised to keep working, and the pension did not require
    further work, so there was no bargain that made the pension a contract."
  - Takeaway (47 words, two sentences): "A company's pension promise was not paid for by past work, and it neither
    required nor obtained a promise of further work. It bound the company anyway, because the employee retired in
    reliance on it, as the company should have expected, and only enforcement could avoid injustice."
  - Map summary: replace "and she promised no further work" with "and the resolution neither required nor
    obtained further work".

### E3. Ricketts plain-English sentence drops foreseeability and injustice — MISSING CONDITION

- **Surface:** Cold Call plain-English sentences, "at": "5.1": "Today this idea, enforcing a promise because someone reasonably relied on it, is called promissory estoppel."
- **Verdict:** MISSING CONDITION. § 90 binds only where the promisor "should reasonably expect" the action and
  "injustice can be avoided only by enforcement" (pp. 126, 128). Ricketts rested on reliance the grandfather
  contemplated "as a reasonable [and probable] consequence of his gift" (p. 123; bracket marks OCR loss). The plain sentence makes the
  promisee's reasonable reliance alone sufficient.
- **Counterexample:** C&M note 1 (p. 123) and slide 11: Ricketts hands over the note without mentioning work, and
  Katie, still employed, buys a horse to ride to work more conveniently. Her purchase may be reasonable, but nothing
  suggests the grandfather should have expected it. The plain sentence enforces; § 90 asks first whether the
  promisor should have expected that reliance.
- **Pinpoint:** C&M pp. 123, 126, 128.
- **Replacement:** "Today this idea, enforcing a promise because the promisee relied on it in a way the promisor
  should have expected, when only enforcement avoids injustice, is called promissory estoppel."

### E4. Ricketts takeaway makes the grandfather's desire the ground of decision — OVERSTATED

- **Surface:** Takeaway: "But because he meant his granddaughter to quit her job in reliance on it and she did, his estate could not take the promise back for want of consideration."
- **Verdict:** OVERSTATED. The court said: "He doubtless desired that she [should abandon] her occupation, but,
  whether he did or not, it is entirely certain [that he] contemplated such action on her part as a reasonable [and
  probable] consequence of his gift" (p. 123; bracketed words are lost in the OCR and follow the Atlas brief's
  "reasonable and probable response"). Desire was not required.
- **Counterexample:** the grandfather says he would prefer she keep working but gives the note knowing she will
  probably quit, and she does. The takeaway implies no estoppel; the court's reasoning reaches the same result as
  in Ricketts.
- **Replacement (43 words, two sentences):** "A grandfather's gift promise had no price attached, so it was not a bargain.
  But because he expected his granddaughter to quit her job in reliance on it and she did, his estate could not take
  the promise back for want of consideration."

### E5. Feinberg: retirement described as the conduct the promise "invited" — MISSING CONDITION

- **Surfaces and exact text:**
  - Effective brief CTR-022: Reasoning: "Retirement was the precise conduct the board's promise invited, so the company had reason to expect it."
  - Map entry: sections.Reasoning: "so retirement was the very conduct the promise invited"
- **Verdict:** MISSING CONDITION. The resolution was adopted "in the hope that her active services will continue
  with the corporation for many years to come" (p. 70), and slide 15 marks retirement "Not sought by promisor."
  Retirement was the reliance the company should have expected and the occasion for payment, not a performance it
  sought in exchange. "Invited" lets a student treat retirement as the requested act of a unilateral contract, which
  would supply consideration and move the case out of § 90.
- **Counterexample:** asked on an exam whether retirement was consideration (slide 15 asks exactly this), a student
  relying on "invited" answers yes and analyzes a bargain; the court found no consideration and enforced under § 90
  (pp. 72, 127).
- **Replacements:** brief: "Retirement was the conduct the board's promise contemplated, although the board hoped she
  would keep working and did not seek her retirement in exchange, so the company had reason to expect it." Map:
  "so retirement was the conduct the promise contemplated, though the board did not seek it in exchange".

### E6. K-07 has no route for Ricketts, and node b's exit omits causes other than a prior plan — MISSING CONDITION

- **Surface:** K-07 node `a` edges: "Retirement", "At-will business opportunity", "Charitable commitment",
  "Confidential disclosure"; node `b` label "Did the promise cause retirement?", edge "Same retirement already planned".
- **Verdict:** MISSING CONDITION. The chart titled "When does reliance change the outcome?" cannot take the leading
  family-promise case: a gift promise that induced the promisee to quit a job (pp. 121–123). Feinberg treated
  Ricketts as the analogous case (p. 128). Separately, the "no inducement" exit at b names only a plan made earlier
  (Hayes, p. 128); slide 16 asks "What if she had retired on account of illness?", which is also no inducement.
- **Route test:** Ricketts facts entered at K-07 a fit none of the four edges. Feinberg with retirement caused by
  illness: b offers "Retirement induced" or "Same retirement already planned"; neither describes the facts.
- **Replacement:** node a edge "Retirement" → "Leaving work (retirement or quitting a job)"; node b label → "Did the
  promise cause the promisee to leave work?"; add `ricketts` to b's sources; b edge "Same retirement already planned"
  → "Would have left anyway (plan already made, illness, other cause)".

### E7. K-07 node c's recovery edge omits foreseeability and reasonableness — MISSING CONDITION

- **Surface:** K-07 node `c` edge label "Identifiable alternative lost".
- **Verdict:** MISSING CONDITION. The district court dismissed because Bacardi's promise was "not one on which it should
  reasonably have expected General to rely"; the Seventh Circuit reversed because Bacardi knew of the negotiations
  and reassured Stout "with the reasonable expectation that an immediate pull out would severely undermine
  General's asking price," and it left how long reliance stays reasonable for trial (pp. 140, 142–143).
- **Counterexample (decisive fact changed):** Bacardi's sales manager makes the same assurance at a trade show with
  no reason to know of any pending offer, and General later declines a buyer. The chart still routes c → "Identifiable
  alternative lost" → f.
- **Replacement:** "Identifiable alternative given up in reliance the promisor should have expected".

### E8. K-07 b and c route to a remedy without asking whether enforcement is needed to avoid injustice — MISSING CONDITION

- **Surface:** K-07 node `b` edge "Retirement induced" → f; node `c` edge as in E7. Only node `e` (Cohen) names
  injustice ("Promise, reliance and injustice shown").
- **Verdict:** MISSING CONDITION. § 90 binds only if "injustice can be avoided only by enforcement" (pp. 126, 128); Feinberg
  analyzed injustice separately (her age, the near impossibility of comparable work, pp. 127–128); slide 16 asks
  "Enforcement necessary to prevent injustice" as its own question.
- **Replacement:** b edge → "Retirement induced; enforcement needed to avoid injustice"; c edge (with E7) →
  "Alternative given up in foreseeable reliance; enforcement needed to avoid injustice". The g detail should then add:
  "or where leaving the promise unenforced would not be unjust."

### E9. K-06 node b exit misdescribes Cohen's route — MISSING CONDITION (label)

- **Surface:** K-06 node `b` edge label "No bargain, but promise induced action" (contracts.json).
- **Verdict:** MISSING CONDITION. Cohen I found that the papers' commitment was not a contract because "the parties were
  not thinking in terms of a legally binding contract," although the Atlas itself reports that offer, acceptance and
  consideration seemingly appeared; the casebook asks whether the understanding was a bargain (pp. 135, 137). A student
  with Cohen's facts finds a bargain and the edge label does not fit.
- **Replacement:** "No binding bargain, but promise induced action".

### E10. Cohen takeaway drops Minnesota and the injustice requirement — MISSING CONDITION

- **Surface:** Takeaway: "A source who was promised confidentiality and then named in print can sue the newspaper for breaking that promise under promissory estoppel."
- **Verdict:** MISSING CONDITION. Recovery turned on Minnesota's third step, a policy judgment by the court, resolved for
  Cohen because the papers themselves conceded the importance of keeping such promises and showed no "compelling need"
  to break this one (p. 136).
- **Counterexample:** a source who lied to the reporter about the documents, so that naming him was needed to correct the
  story. The takeaway suggests liability; the Minnesota test asks whether enforcement is required to prevent injustice,
  and the court's stated reasons would not support it.
- **Replacement (52 words, two sentences):** "Under Minnesota promissory estoppel, a source promised confidentiality and then
  named in print recovered for the broken promise, because he relied on it and enforcement was needed to prevent an
  injustice. A general law that applies to everyone does not become unconstitutional because a newspaper is the one
  who broke the promise."

### E11. Cohen rule line states Minnesota's test as a general rule — MISSING CONDITION (jurisdiction)

- **Surface:** Effective brief CT-CB-0135: rule (and Chronology step 395, same text): "A promise that is not enforceable as a conventional contract may still be enforced under promissory estoppel when it is clear, induces intended and actual detrimental reliance, and must be enforced to avoid injustice"
- **Verdict:** MISSING CONDITION. These are Minnesota's three steps ("clear and definite"; the promisor "must have intended t[o induce]
  reliance" and reliance "to the promisee's detriment"; enforcement "required to prevent an injustice") (pp. 135–136).
  § 90 asks instead whether the promisor "should reasonably expect" the reliance and does not use "clear," "definite" or
  "detriment" (Selections § 90(1)).
- **Replacement (45 words):** "In Minnesota, a promise unenforceable as a contract binds by promissory estoppel if it is
  clear and definite, was intended to induce and did induce detrimental reliance, and must be enforced to prevent
  injustice; the First Amendment permits applying this general doctrine to the press."

### E12. Cohen learning topic says the 1992 court applied "Restatement 90" — UNSUPPORTED BY ASSIGNED SOURCES

- **Surface:** Map entry: learning.topics `rest90`: "The 1992 decision enforces the promise under Restatement 90 and asks whether injustice can be avoided only by enforcement."
- **Verdict:** UNSUPPORTED BY ASSIGNED SOURCES. The excerpt states the doctrine in its own words and never cites § 90
  (p. 135). The full opinion may cite it; that was not checked.
- **Replacement:** "The 1992 decision applies Minnesota's promissory-estoppel test, whose injustice step tracks § 90, and
  asks whether enforcement is required to prevent an injustice."

### E13. D&G Stout rule line omits Indiana and the reasonable-expectation condition — MISSING CONDITION

- **Surface:** Effective brief CTR-024: rule (and Chronology step 385, same text): "Under promissory estoppel, a promise of a continuing at-will relationship cannot support recovery of expected future profits, but it can support reliance damages for an existing opportunity the promisee foreseeably surrendered in reliance on it."
- **Verdict:** MISSING CONDITION. The bar on future profits is stated as Indiana's ("Indiana will not grant relief based on
  promissory estoppel [to compensate] an aggrieved party for such expectancy damages," p. 141; bracket marks OCR loss). The court's test was
  whether the promise was one on which Bacardi "should reasonably have expected General to rely" (p. 140).
- **Replacement (40 words):** "Under Indiana promissory estoppel, a promise to continue an at-will relationship cannot
  support recovery of expected future profits, but it can support reliance damages for an existing opportunity the
  promisee gave up in reliance the promisor should reasonably have expected."

### E14. Reliance timeline, step `dg-stout`, field `note` — OVERSTATED

- **Surface:** "Reliance on an at-will assurance earns reliance damages, such as a lost sale price, not the profits the relationship would have brought (Indiana law)."
- **Verdict:** OVERSTATED. The appellate holding is that the claim may proceed to trial (pp. 138, 143); recovery requires
  foreseeable, reasonable reliance; and the recoverable item was the drop in the obtainable price, not "a lost sale
  price." Not covered by the prior timeline corrections (they set only this step's `effect`).
- **Replacement:** "Reliance on an at-will assurance can support reliance damages, such as the lost value of a sale
  opportunity given up, but not the profits the relationship would have brought (Indiana law)."

### E15. D&G Stout takeaway omits foreseeability — MISSING CONDITION

- **Surface:** Takeaway: "It can still make the promisor pay for a real opportunity you gave up in reliance on it."
- **Verdict and counterexample:** as E7 (pp. 140, 142).
- **Replacement (50 words, two sentences):** "A promise to keep an at-will relationship going cannot earn you the future
  profits you hoped for, because it could end at any time. It can still make the promisor pay for a real opportunity
  you gave up in reliance on it, if the promisor should have expected that reliance."

### E16. D&G Stout plain-English sentence enlarges the employment analogy — OVERSTATED

- **Surface:** Cold Call plain-English, "at": "2.2": "By comparison, someone promised an at-will job is not guaranteed future pay, but may recover moving costs or pay from a job given up to take it."
- **Verdict:** OVERSTATED. Eby allowed moving expenses and wages from the plaintiff's old job "during the few day[s] plaintiff[
  was preparing to move]" (p. 141; brackets mark OCR loss; the next sentences confirm wages "forgone in order to
  prepare to move"). The source sentence says "wages surrendered in preparation." "Pay from a job given up"
  reads as the old job's whole salary stream, which the opinion does not address.
- **Replacement:** "By comparison, someone promised an at-will job is not guaranteed future pay, but may recover moving
  costs or wages given up while preparing to move for it."

### E17. D&G Stout remand award: "not the full gap between the two sale prices" — UNSUPPORTED BY ASSIGNED SOURCES

- **Surface:** Cold Call plain-English "at": "4.1": "General got back what it proved it lost by relying on the promise, not profits from a distributorship assumed to last forever, and not the full gap between the two sale prices." Source sentence in episode-5: "not an assumed perpetual distributorship or all differences between the headline sale prices."
- **Verdict:** UNSUPPORTED BY ASSIGNED SOURCES, and in tension with the casebook. Note 2 reports that the district court
  awarded damages equal to "the difference between National's initial offer and the final [sale] price," a total of
  $394,050 (p. 143). The Atlas's itemized account (retained property, inventory, receivables, real estate) comes from
  805 F. Supp. 1434, which is not assigned and was not checked here. Both may be true if the court computed "the
  difference" net of assets General kept, but a student comparing the Atlas with p. 143 sees a contradiction.
- **Replacement (plain sentence):** "General got back what it proved it lost by relying on the promise: the court's
  measure of the difference between National's July offer and the final price, $394,050, not the $550,000 alleged on
  appeal and not profits from a distributorship assumed to last forever." Verify the itemization against 805 F. Supp.
  before keeping the episode-5 figures.

### E18. D&G Stout learning topic states the reliance classification without the casebook's question — OVERSTATED (mild)

- **Surface:** Map entry: learning.topics `reliance-interest`: "Recovery was limited to the forgone sale price differential, a reliance measure, not lost distributorship profits."
- **Verdict:** OVERSTATED. The classification is the Seventh Circuit's ("The extent of that devaluation represents a
  reliance injury," p. 142). The casebook says "[t]he damages awarded look suspiciously like the '[lost] opportunities'"
  denied elsewhere (bracket marks OCR loss) and asks the reader to distinguish (p. 143); slide 19 asks "Are these expectation or reliance
  damages?"
- **Replacement:** "The Seventh Circuit classified the forgone sale price differential as reliance injury, not lost
  distributorship profits; the casebook asks whether the award resembles lost-opportunity damages."

### E19. Lecture notes, comment b paraphrase drops "in relation to the remedy sought" — MISSING CONDITION

- **Surface:** Lecture notes record, topic "The elements in Restatement § 90", body: "including the reasonableness and the definite and substantial character of the reliance, the formality of the promise"
- **Verdict:** MISSING CONDITION. Slides 7 and 13 quote comment b in full: "its definite and substantial character in
  relation to the remedy sought." The phrase is what ties the reliance inquiry to the new remedy sentence (G2).
- **Replacement:** "including the reasonableness of the reliance and its definite and substantial character in
  relation to the remedy sought, the formality of the promise".

### E20. Lecture notes, Cohen quotation paraphrased so that the doctrine, not its effect, is "constitutionally insignificant" — inaccurate record

- **Surface:** Lecture notes, topic "Cohen v. Cowles Media", body: "applying to the press “a generally applicable law that requires those who make certain kinds of promises to keep them” is constitutionally insignificant."
- **Verdict:** inaccurate record of slide 18, which calls the result "the incidental, and constitutionally insignificant,
  consequence of applying" the law. The casebook headnote likewise says the doctrine has only an "incidental" effect on
  news gathering and reporting (p. 135).
- **Replacement:** "Slide 18 quotes Justice White: “it is no more than the incidental, and constitutionally
  insignificant, consequence of applying to the press a generally applicable law that requires those who make certain
  kinds of promises to keep them.”"

### E21. Ricketts map facts turn a conditional statement into a promise to pay on sale — OVERSTATED (minor)

- **Surface:** Map entry: sections.Material Facts: "said he would pay the note when he sold his Ohio farm"
- **Verdict:** OVERSTATED. The opinion reports that in 1892 he "stated to his daughter, Mrs. Scothorn, that if he could
  [sell his] farm in Ohio he would pay the note out of the proceeds" (p. 121; bracket marks OCR loss; the brief reads
  "if he sold"). The brief has it right.
- **Replacement:** "told her mother that if he could sell his Ohio farm he would pay the note from the proceeds".

### E22. equitable-estoppel node merges two of the four historical categories — OVERSTATED (minor)

- **Surface:** node `equitable-estoppel`, field `notes`: "including family land improvements, gratuitous bailments, and charity"
- **Verdict:** OVERSTATED. The casebook lists four categories: family promises; promises to convey land relied on by moving
  onto and improving it (Freeman v. Freeman); promises coupled with gratuitous bailments (Siegel v. Spear); charitable
  subscriptions (pp. 124–125).
- **Replacement:** "including family promises, promises to convey land on which the promisee moved and made improvements,
  promises coupled with gratuitous bailments, and charitable subscriptions".

### E23. Feinberg minor factual slips

- Map entry: sections.Material Facts: "the board, recognized her long, faithful service" → "the board, recognizing her long, faithful service" (grammar).
- Cold Call episode-1: "She received stock dividends and employee bonuses from 1937 through 1949 ranging from $300 to $2,000." The casebook (OCR-damaged) describes two items: substantial dividends on her stock, "as did all of the other stockholders," and, separately, a yearly payment from 1937 to 1949, inclusive, ranging "from $300 in the beginning" upward (p. 69). The range belongs to the second item only. Replacement: "She received dividends on her stock and, from 1937 through 1949, yearly bonuses ranging from $300 to $2,000." (The $2,000 figure and the word "bonus" are lost in the OCR and taken from the Atlas; confirm on the page image.)

### E24. K-06 node d and notes-unrequested-benefit narrow the officious-intermeddler limit to "unwilling" recipients — CHANGES RESULT

- **Surface:** `tools/flowcharts/data/contracts.json`, K-06 node `d`, `detail`: "Mistaken receipt or needed emergency aid differs from deliberately forcing a benefit on an unwilling recipient." Node `notes-unrequested-benefit`, `notes`: "differs from a benefit deliberately forced on an unwilling recipient."
- **Verdict:** CHANGES RESULT. The casebook's limit is that, absent circumstances justifying the intervention, there is
  no restitution for "an unrequested benefit voluntarily conferred"; the recipient's willingness is not the test.
  Posner's example makes the point: you owe the serenading musicians nothing "no matter how [much] you enjoyed it,"
  because they could have negotiated a price in advance (pp. 145–146; bracket marks OCR loss).
- **Counterexample:** the musicians' facts. The listener was not unwilling and enjoyed the music, so the chart's contrast
  does not exclude the claim, and a student may exit d → "Unjust retention shown" → g. Source result: no restitution.
- **Replacement (K-06 d detail, second sentence):** "Mistaken receipt or justified emergency aid differs from a benefit
  conferred voluntarily and without request when the parties could have bargained, which supports no restitution even
  if the recipient welcomed it." Make the same change in notes-unrequested-benefit ("from a benefit conferred
  voluntarily without request, whether or not the recipient objected").

### Checked and supported (no change)

Ricketts map summary, holding, issue and brief rule (pp. 122–123); Ricketts plain sentences 2.0–5.0; timeline step 1
note; Feinberg holding, the illness analysis and the `reliance-damages` learning topic (pp. 127–128); Feinberg plain
sentences 0.2, 2.x, 3.0 (first), 3.1, 3.3, 4.x; K-07 b's Hayes branch (p. 128); Cohen map summary, procedural
history and remand reasoning (pp. 135–136); Cohen plain sentences; K-07 e; D&G Stout map summary, holding and
reasoning (pp. 138–143); at-will-reliance, reliance-interest, notes-stout-remand; rest90 node; charitable-pledges;
note-allegheny; unjust-enrichment, restitution-interest, quantum-meruit, cotnam-boundary (pp. 145–146). Facts in the briefs that the casebook edits out (dates of rehearing, panel names, the 1990 and 1991
opinions' internal reasoning, the remand trial findings in D&G Stout) are not in the assigned excerpt; they were not
marked wrong.

## 3. Teaching gaps

**G1. § 90 comment d: when the full promise is enforced and when relief is limited.** Nothing in the Atlas gives the
comment's rule; rest90 says the comments are "not imported," and problem-nephew-shop and problem-reliance-measures ask
the question without the answer's materials. Home: node `rest90`, field `notes` (append). Draft: "Comment d: a promise
binding under § 90 is a contract, and full-scale enforcement by normal remedies is often appropriate, as in Ricketts
and Feinberg. The factors that decide whether to grant relief also decide its extent: relief may be limited to
restitution or to reliance damages. Unless the promisor is unjustly enriched, damages should not put the promisee in a
better position than performance would, and for a promise to make a gift consequential damages exceeding the burden of
performance would rarely be proper." (Selections § 90 cmt. d; C&M pp. 126, 128–130.)

**G2. Why the Second Restatement dropped "definite and substantial."** The casebook asks whether the deletion relates
to the new remedy sentence (p. 128). Home: node `rest90`, field `notes`. Draft: "Comment b keeps the definite and
substantial character of the reliance as a factor, judged in relation to the remedy sought. Read with the new
sentence allowing a limited remedy, slight reliance can support limited relief rather than defeating the claim
outright. Comment b also says reliance need not be substantial for charitable subscriptions but must be for firm offers
and guaranties."

**G3. Cohen's statement of the injustice step.** Home: `cohen-cowles` map entry, `sections.Reasoning` (after "injustice,
a legal question"). Draft: "The court stressed that the question is not whether enforcement would do justice but
whether enforcement is required to prevent an injustice, and it found that denying Cohen any recourse would be unjust
because the papers conceded the importance of keeping such promises and showed no compelling need to break this one."
(pp. 135–136.)

**G4. Jurisdictional formulations differ from the § 90 text.** Slide 9 asks whether promissory estoppel requires "a
definite promise"; Cohen's Minnesota test requires a "clear and definite" promise, intent to induce reliance and
detriment; § 90 requires none of those words. Home: node `promissory-estoppel`, field `notes`. Draft: "State
formulations vary. Minnesota in Cohen required a clear and definite promise that the promisor intended to induce
reliance and detrimental reliance; Indiana in D&G Stout quoted Restatement (Second) § 90(1). Section 90 itself asks
whether the promisor should reasonably have expected the action and does not mention detriment, though courts often
speak of it, as Vastoler did."

**G5. Ricketts note 1 hypotheticals.** Slide 11 and p. 123 ask: quitting not mentioned; reliance by buying a horse;
could a court have found a bargain; how could Ricketts have structured the promise. Home: `ricketts` map entry, field
`notes` (now only "Court: …"). Draft: "Had the grandfather required Katie to quit as the price of the note, her quitting
would have been bargained-for consideration, as Hamer v. Sidway treats giving up a legal right at the promisor's
request. Without that request, the question is whether he should reasonably have expected the reliance: quitting
followed from his words, but a horse bought to ride to work, with no mention of work, would raise the question whether
he should have foreseen it."

**G6. The Feinberg drafting problem.** Slide 17 and note 2 (p. 73) ask whether reciting "in consideration of her many
years of long and faithful service" would help. Home: node `past-consideration`, field `notes`. Draft: "Reciting past
service as consideration would not have changed the analysis in Feinberg, because services already performed were not
sought in exchange for the 1947 promise. A drafter could have conditioned the pension on a requested future
performance, such as continued service for a stated period, which the court noted the resolution lacked (p. 72). New
York's General Obligations Law § 5-1105 is a separate statutory route for signed writings that state past
consideration." (The § 5-1105 point relies on the node's existing reference; the statute is not in this packet's
sources.)

**G7. Slide 15 grid pairing.** The lecture note says the extracted text does not show the pairing. In slide order the
four candidates and four objections pair one to one, and each pairing matches the casebook. Home: lecture notes, topic
"Feinberg v. Pfeiffer Co.", body (replace the clause "the extracted text does not show which objection goes with which
candidate"). Draft: "In slide order the objections pair as: past services, not induced by the promise; a promise to
continue in employment, not supported by the evidence; continuation of employment, not sought by the promisor and not
clearly induced by the promise (she testified she would have kept working anyway); retirement, not sought by the
promisor (C&M pp. 70, 72). Confirm the layout on the slide image."

**G8. § 90(2) on slide 8: adoption and the older routes.** Home: lecture notes, topic "The elements in Restatement § 90",
body (add after the § 90(2) sentence). Draft: "Legal qualification: § 90(2) is the Restatement's rule; the casebook
reports that the law on charitable subscriptions remains unsettled and that most jurisdictions have not addressed it,
and Massachusetts in King v. Trustees of Boston University still required consideration or reliance (C&M p. 129)." Also
add to node `charitable-pledges`, field `notes`: "Courts have also found consideration in an exchange of promises among
subscribers, especially when a 'bellwether' subscriber pledges on condition that others pledge (Congregation B'nai
Sholom v. Martin, p. 125). The marriage-settlement half of § 90(2) is illustrated by a father's formal written promise
made in anticipation of his son's marriage, which the marriage makes binding (§ 90 illus. 18)."

**G9. Restitution measures on slide 3.** Home: lecture notes, topic "Overview of restitution", body (append), and node
`unjust-enrichment`, field `notes`. Draft: "Legal qualification: the first measure is the reasonable value to the
defendant of what he received, in terms of what it would have cost him to obtain it from a person in the claimant's
position, not the claimant's own expenses; the second is the increase in the defendant's property or other interests
(Restatement (Second) § 371)."

**G10. At-will slide 14 and D&G Stout.** Home: lecture notes, topic "Employment at will", body (append). Draft: "Legal
qualification: termination without liability does not end the analysis when a specific assurance induced reliance. In
D&G Stout the Seventh Circuit held that, under Indiana law, an assurance within an at-will distributorship could
support reliance damages, though not expected future profits (C&M pp. 140–142)."

**G11. Slide 19's open question.** Home: lecture notes, topic "D&G Stout v. Bacardi Imports", body (append). Draft: "Legal
qualification: the Seventh Circuit classified the drop in the sale price as reliance injury, because Bacardi's
withdrawal destroyed an opportunity General already had (C&M p. 142); the casebook's Note 2 asks whether the remand
award resembles lost-opportunity damages denied elsewhere (p. 143)."

**G12. Minor absences.** Holmes's objection that reliance-based enforcement "would cut up the doctrine of consideration
by the roots" (p. 124) and Atiyah's point about wholly executory exchanges (p. 130): home `notes-rest90-history`, field
`notes`. Posner's argument that enforcing gratuitous promises makes them more valuable to reliable promisors (pp.
119–120): home `notes-substitutes`, field `notes`. Draft for the first: "Holmes objected that letting a promisee make a
gratuitous promise binding by relying on it would cut up consideration by the roots; Atiyah, answering Gilmore, saw
growing reluctance to enforce promises neither paid for nor relied on."

## 4. Slides compared with the lecture-notes record

| Slide(s) | Slide content | Lecture-note record | Assessment |
|---|---|---|---|
| 1–2 | Title; agenda of six topics | Not recorded | Acceptable (agenda only) |
| 3 | Restitution: unjust enrichment; four settings; two measures | "Overview of restitution" | Accurate. Add the § 371 qualification (G9): "cost of the goods or services" is the cost to the defendant of obtaining them, not the claimant's outlay |
| 4–5 | History (equitable estoppel precludes denial of facts; §§ 87–90; Gilmore; "often without success"); six applications | "History and uses of promissory estoppel" | Accurate |
| 6, 12 | § 90(1) black letter | "The elements in Restatement § 90" | Accurate |
| 7, 13 | § 90 comment b | same topic | Drops "in relation to the remedy sought" (E19) |
| 8 | § 90(2) | same topic | Accurate; add the adoption qualification (G8) |
| 9 | Three differences; two with "?" | "Contract and promissory estoppel compared" | Accurate. G4 supplies the source answer on "definite promise" |
| 10–11 | Ricketts quotations and hypotheticals | "Ricketts v. Scothorn" | Accurate. G5 supplies the analysis |
| 14 | At-will rule and exceptions | "Employment at will" | Accurate; add the D&G qualification (G10) |
| 15–17 | Feinberg grid, elements and hypotheticals, drafting problem | "Feinberg v. Pfeiffer Co." | Accurate; pairing can be stated in slide order (G7); drafting answer G6 |
| 18 | Cohen quotation (cited "50 U.S. 663, 672"); questions | "Cohen v. Cowles Media"; conflict entry | Quotation paraphrase inaccurate (E20). The citation conflict entry is correct: the reporter is 501 U.S. |
| 19 | D&G six questions | "D&G Stout v. Bacardi Imports" | Accurate; add the reliance-or-expectation qualification (G11) |
| 20–21 | Justifications for consideration and for promissory estoppel | "Justifications for consideration and for promissory estoppel" | Accurate |

## 5. Route test

Charts that cite the principal cases: K-06 ("Which theory can enforce the promise or recover the benefit?") nodes c
(Ricketts, Feinberg) and f (D&G Stout); K-07 ("When does reliance change the outcome?") nodes b (Feinberg), c and f
(D&G Stout), e (Cohen). K-07 is also the chart a student would open for Ricketts.

### Ricketts v. Scothorn

- **Facts as decided.** K-06: a → "Bargained-for exchange" → b → "No bargain, but promise induced action" → c → "Predicates
  met" → f "Grant the relief justice requires". Displayed: compensation for "the lost opportunity or other induced loss."
  Source result: the $2,000 note enforced (p. 123). Path right, result wrong on the remedy (E1). K-07: no edge at a fits
  (E6).
- **Decisive fact changed: the grandfather requires Katie to quit as the price of the note.** K-06: a → b → "Binding bargain
  and breach" → e "Compensate for promised performance". Correct (the opinion's point that he "exacted no quid pro quo,"
  p. 122). The ≈ sentence at 3.0 ("nothing was bargained for in exchange for the grandfather's promise") preserves the
  distinction.
- **Second change: no mention of work; she buys a horse.** K-06 c detail asks for action the promise "foreseeably and
  actually caused," so a careful user exits "No reliance theory proven" → h. Chart adequate. The ≈ sentence at 5.1 drops
  foreseeability and would enforce (E3); the takeaway's "meant" would misdirect the inquiry to his desire (E4).

### Feinberg v. Pfeiffer Co.

- **Facts as decided.** K-06: a → b → "No bargain, but promise induced action" → c → "Predicates met" → f. K-07: a → "Retirement"
  → b → "Retirement induced" → f. Both display an induced-loss measure; the court affirmed the promised installments
  (E1).
- **Decisive fact changed: the pension is conditioned on two more years' service, and she stays.** K-06: a → b → "Binding
  bargain and breach" → e. Correct on the court's reasoning (p. 72). The ≈ sentence at 3.0 ("She never promised anything in
  return, so there was no bargain"), the takeaway and the map summary would say no bargain (E2).
- **Second change: she had announced her retirement before the resolution (Hayes).** K-07: b → "Same retirement already
  planned" → g "No recovery". Correct on inducement (p. 128).
- **Third change: she retires because of illness.** K-07 b has no fitting exit (E6). K-06 c's detail handles it ("actually
  caused").

### Cohen v. Cowles Media

- **Facts as decided.** K-06: a → b. Cohen I found no contract although a bargain seemed present; the edge "No bargain, but
  promise induced action" does not describe that (E9); a user who takes it reaches c → f. K-07: a → "Confidential
  disclosure" → e → "Promise, reliance and injustice shown" → f. Displayed: measure the injury. Source: $200,000
  compensatory verdict reinstated (p. 135). Correct.
- **Decisive fact changed: the papers show a compelling need to name the source (for example, he falsified the records).**
  K-07 e → "Predicates fail" → g. Result (no recovery) is consistent with the court's reasoning, which made the absence of
  compelling need part of the injustice finding (p. 136); but g's detail explains failure only as lack of causation, so
  the displayed reason is wrong (E8 proposes adding the injustice ground to g). The ≈ sentence at 7.0 keeps the injustice
  condition. The takeaway does not (E10).
- **Second change: the reporters promise anonymity only after Cohen has handed over the documents.** e → "Predicates fail"
  → g, for lack of reliance. Correct; the Cold Call's "not … a promise made after Cohen had already disclosed everything"
  preserves it.

### D&G Stout v. Bacardi Imports

- **Facts as decided.** K-07: a → "At-will business opportunity" → c → "Identifiable alternative lost" → f "Measure the injury
  … such as the provable value of a foregone opportunity". Correct (pp. 141–143). K-06: a → "Induced reliance" → c → f.
  Correct, apart from "foregone sale price" (E1).
- **Decisive fact changed: no sale offer was pending; General simply kept operating and lost future Bacardi profits.** c →
  "Future profits alone" → g "No recovery". Correct (p. 141). ≈ sentences at 2.1 and 2.2 preserve the expectation and
  reliance line, though 2.2 overstates the employment analogy (E16).
- **Second change: Bacardi had no reason to know of any sale decision.** c → "Identifiable alternative lost" → f: the chart
  still awards relief. Source: the inquiry is whether Bacardi should reasonably have expected reliance (p. 140); the
  Seventh Circuit relied on Bacardi's knowledge of the talks (p. 142). Wrong result (E7). The ≈ sentence at 2.1
  ("foreseeable action") preserves the condition; the takeaway does not (E15).
