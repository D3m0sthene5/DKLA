# OP-CT-21 challenge: Contracts Class 21, mistake, impracticability and frustration

Sources tested: ct21-casebook.txt (assigned printed C&M 1073–1081, 1101–1120, 1132–1136; page numbers for PDF pages whose running heads did not extract were inferred from neighbouring pages: PDF 65–74 = 1073–1082, PDF 92–112 = 1100–1120, PDF 126–130 = 1132–1136), and the Restatement (Second) and UCC black letter and printed comments in /home/claude/work/src/sel.txt (§§ 151–154, 261, 265, 266, 272; UCC §§ 2-613–2-615 with Official Comment). No slide deck was located in the checked sources, so the lecture-notes record (which names a 26-slide .pptx) was checked only against the casebook and the selections. The OCR of C&M 1134 is incomplete (the start of the Krell notes is lost), so nothing on that page beyond the opinion's end and footnote P was tested. Quotations from the Atlas are verbatim substrings of ct21-surfaces.md or, where marked, of tools/flowcharts/data/contracts.json, tools/r19/data/timelines.json and tools/v25/authorities.json. Casebook quotations restore OCR-dropped letters only. Items in prior-corrections.json were skipped unless the corrected text itself is wrong.

Entries are ordered by how likely the wording is to lead a student to a wrong answer.

---

## A. Statements that change a legal result

### A1. Flowchart K-29 node b: a unilateral mistake is routed to "obligation remains"

- **Surface/field:** Flowchart K-29 node b, `detail` and edge `"label": "No material shared mistake"` → h (contracts.json). No other Contracts flowchart covers § 153.
- **Current text:** `Test basic assumption, material effect and whether the party seeking relief assumed the risk.` and `"label": "No material shared mistake"`.
- **Verdict:** CHANGES RESULT.
- **Facts entered:** Renner with one fact changed. The sellers knew from earlier drilling that the aquifer could not support commercial jojoba; only the buyers held the mistaken belief. (Alternatively, the bid-error facts of Elsinore v. Kastorff, cited at C&M 1081, where the bidder "got relief for his mistaken offer.")
- **Path:** a "Existing fact" → b. The mistake was not shared, so the only matching edge is "No material shared mistake" → h.
- **Displayed result:** h "Performance obligation remains under this theory".
- **Source-supported result:** Under § 153 the contract is voidable by the mistaken party if the mistake goes to a basic assumption, has a material adverse effect and its risk is not on him under § 154, and either enforcement would be unconscionable or "the other party had reason to know of the mistake or his fault caused the mistake." Comment b states that the unilateral claimant must meet the § 152 requirements plus one of these additional requirements, so the two doctrines should not be merged either: a unilateral mistake without (a) or (b) does not qualify. The lecture-notes record already teaches this distinction ("for unilateral mistake, test unconscionability or the other party's knowledge or fault"); the chart a student would open does not.
- **Pinpoint:** C&M 1081 (Section 2 introduction; Elsinore); Restatement § 153 black letter and cmts. b, c, f.
- **Replacement:** b `detail`: `Renner concerned water already unavailable in the necessary quantity for jojoba cultivation. Test basic assumption, material effect and whether the party seeking relief bears the risk (§ 154). If only one party was mistaken, the contract is voidable by that party only if those requirements are met and enforcement would be unconscionable or the other party had reason to know of the mistake or caused it (§ 153).` Add edge `{"label": "One party's mistake meeting § 153", "to": "d"}`; relabel `No material shared mistake` as `No qualifying mistake`.

### A2. Flowchart K-29 node e: the Taylor excuse is offered for destruction of the promisor's own unfinished work

- **Surface/field:** Flowchart K-29 node e, `detail`.
- **Current text:** `Taylor’s particular music hall burned without fault. Transatlantic’s Cape route still allowed performance at greater cost. Check fault, available alternatives, foreseeability as evidence of allocation, basic assumption and contractual risk.`
- **Verdict:** MISSING CONDITION; it changes the result.
- **Facts entered:** casebook Note 3 to Stees. Leonard has no foundation trouble, but when he has nearly finished, lightning strikes the building and the ensuing fire destroys it without his fault.
- **Path:** a "Later event" → c "Performance impaired" → e. The only case illustration in e is a building destroyed by fire without fault, and the node offers no distinction, so the student takes "Excuse established" → g.
- **Displayed result:** g: the later event discharges the builder's remaining duties.
- **Source-supported result:** "He would have been accountable for breach, it seems, if he did not begin to build again." One who contracts to "build a house, on land of another ... will not ordinarily be excused from performance of his contract by the destruction of the ... building without his fault before the time fixed for delivery of it." Stees itself relied on School Trustees v. Bennett, where a nearly completed schoolhouse was blown down, rebuilt and fell again, and "the loss ... must fall on the contractor." Taylor excused performance because the parties contracted "on the basis of the continued existence" of an existing hall; the builder's unfinished structure is the result he promised to produce, not a thing whose continued existence the contract assumed. Compare Restatement § 261 illus. 6: a contractor repairing an existing elevator that burns is discharged.
- **Pinpoint:** C&M 1075–1076 (School Trustees v. Bennett), 1077–1078 Note 3; C&M 1105 (Taylor's "continued existence" basis); Restatement § 261 illus. 6.
- **Replacement (add after the Taylor sentence):** `Taylor's excuse applies when a specific existing thing that performance requires is destroyed. A builder whose partly built structure is destroyed must ordinarily rebuild (Stees; C&M 1077 Note 3), while a contractor repairing an existing building that burns is discharged (§ 261 illus. 6).`

### A3. Krell: the frustrated foundation is stated as "the procession happening"

- **Surface/field:** krell, Cold Call plain-English sentences, `"at": "2.1"`; Flowchart K-29 node f, `detail`; Takeaway (tools/r19/data/takeaways.json).
- **Current text:** plain 2.1: `The contract was implicitly conditioned on the procession happening.` K-29 f: `The canceled coronation procession was the shared foundation for the particular rooms in Krell.` Takeaway: `The cancelled coronation procession defeated the shared foundation of this room-rental agreement`.
- **Verdict:** OVERSTATED (purpose stated too broadly); it changes the result on a one-fact variation.
- **Facts entered (route test):** Krell with one fact changed. The processions take place on June 26 and 27, but on one of the shorter routes "not including Pall Mall" that footnote P says were under consideration.
- **Path:** a "Later event" → c "Principal purpose impaired" → f. The node and the plain sentence identify the foundation as the procession or its cancellation; the procession was not cancelled, so the student takes "Purpose remains or risk allocated" → h.
- **Displayed result:** h: Henry must pay the balance.
- **Source-supported result:** Vaughan Williams L.J. held that "the taking place of those processions on the days proclaimed along the proclaimed route, which passed 56A, Pall Mall, was regarded by both contracting parties as the foundation of the contract." On that foundation the varied facts frustrate the purpose. "Happening" also invites the inference that the condition was met when the coronation was later held (footnote P: "It was performed on August 9"). The court also held: "It was not a demise of the rooms or even an agreement to let and take the rooms. It is a license to use rooms for a particular purpose", so "room-rental agreement" misdescribes the transaction the court construed.
- **Pinpoint:** C&M 1133 (facts; foundation test), 1133 n.P, 1134 (license; proclaimed days and route).
- **Replacements:** plain 2.1: `The contract was implicitly conditioned on the processions taking place on the proclaimed days along the proclaimed route past the rooms. This is different from reading an unstated promise into a contract, as in the Moorcock case.` K-29 f first sentence: `In Krell the processions' taking place on the proclaimed days, along a route passing the rooms, was the shared foundation of the license to use them.` Takeaway (2 sentences, 53 words): `The postponed coronation processions defeated the shared foundation of this license to use rooms on the proclaimed days along the proclaimed route, so the court excused the unpaid balance. A disappointed personal motive alone is different; the event must be fundamental to the bargain and its risk must not have been allocated otherwise.`

### A4. Renner Cold Call plain sentence 2.1: risk allocation reduced to the contract's terms

- **Surface/field:** renner, Cold Call plain-English sentences, `"at": "2.1"`.
- **Current text:** `The contract had not put that risk on them, and the shared \"mistake\" concerned a material \"basic assumption.\"`
- **Verdict:** MISSING CONDITION (changes the footnote's scope).
- **Counterexample:** The footnote says rescission is not precluded "where the risk of mistake was not allocated among the parties," which follows § 152 cmt. a. Under § 154 a party bears the risk not only by agreement (a) but also when he knows his knowledge is limited and "treats his limited knowledge as sufficient" (b), or when the court allocates it to him as reasonable (c). Failure to investigate is exactly where (b) matters. Change Renner's facts so that the buyers knew they had no water data and chose to sign without test drilling: the plain sentence (the contract did not allocate the risk) points to rescission, but § 154(b) puts the risk on the buyers. Note 2 shows (c) at work: a seller of farm land generally cannot avoid on discovering minerals.
- **Pinpoint:** C&M 1079 n.2; C&M 1081 Note 2; Restatement § 154(a)–(c) and cmts. c–d; § 157.
- **Replacement (second and third sentences):** `The risk had not been allocated to them, and the shared "mistake" concerned a material "basic assumption." A party also bears the risk if the agreement assigns it, if he knowingly treats limited knowledge as sufficient, or if a court reasonably assigns it to him (§ 154).`

### A5. Stees brief rule line and Chronology step 25: the 1874 absolute-impossibility rule stated as current law

- **Surface/field:** Effective brief CT-NEXT-CM-0165 `rule`; Chronology 'course-chronology-0' step 25 `note` (identical text).
- **Current text:** `A party who makes a positive, express promise must perform it despite unforeseen hindrance or hardship unless performance is prevented by an act of God, the law or the other party; difficulty short of absolute impossibility is no excuse.`
- **Verdict:** OVERSTATED (undated and unqualified; a student applying it states the trap rule that only literal impossibility excuses). The wording also lets a student treat any act of God as an excuse.
- **Counterexample:** Restatement § 261 illus. 7: a carrier bound for a port where rebels announce they will try to sink all arriving vessels refuses to sail. Sailing remains physically possible, so the rule line ("difficulty short of absolute impossibility is no excuse") makes the carrier liable; the Restatement discharges the duty because the risk of injury makes performance impracticable. Transatlantic states that the doctrine "has gradually been freed from the earlier fictional and unrealistic strictures," that a thing is impossible "when it is not practicable," and that impracticability "assumes performance was physically possible." Restatement § 261 cmt. d: the rule may discharge a duty "even though the event has not made performance absolutely impossible." In the other direction, the clause "unless ... prevented by an act of God" misleads on Note 3 (lightning destroys the nearly finished building: no excuse; see A2), because the court and School Trustees treat destruction of work done as not preventing completion. Stees's own result survives modern doctrine: § 154 illus. 5 (builder; subsoil must be drained at a cost that leaves no profit; "the court will allocate to A the risk of the mistake").
- **Pinpoint:** C&M 1075 (Young, J.), 1075–1076; C&M 1108–1109 (Transatlantic), 1109 n.1; Restatement § 261 cmt. d; § 154 illus. 5.
- **Replacement (47 words; same text for both):** `In 1874 Minnesota held that a builder who expressly promised to erect and complete a possible building must perform despite latent soil and repeated collapses; only prevention by act of God, law or the other party excused. Later impracticability doctrine can excuse performance short of literal impossibility.`

### A6. Transatlantic learning.topics "frustration": impracticability's cost test applied to frustration

- **Surface/field:** transatlantic map `learning.topics` "frustration".
- **Current text:** `The three-part test (unexpected event, unallocated risk, impracticability) is the same framework courts apply to frustration-of-purpose claims arising from the Suez closure.`
- **Verdict:** UNSUPPORTED BY ASSIGNED SOURCES; it conflates frustration with impracticability.
- **Counterexample:** The assigned pages say nothing about frustration-of-purpose claims arising from Suez; the English "Suez cases" in Note 3 (The Eugenia; Tsakiroglou) concern whether a cost increase excuses performance. The casebook separates the doctrines: impracticability is "significantly informed by considerations of the cost of performance," while frustration "focuses on the value or purpose of performance"; "frustration is not a form of impossibility .... Performance remains possible but the expected value of performance to the party seeking to be excused has been destroyed." A student who applies "commercial impracticability" to Krell-type facts finds no added cost and denies an excuse that § 265 grants (illus. 1: window to view a cancelled parade).
- **Pinpoint:** C&M 1073–1074; C&M 1113–1114 Note 3; C&M 1135 Notes 1–2; Restatement § 265 cmt. a and illus. 1.
- **Replacement:** `Transatlantic is an impracticability case about the cost of performance. Frustration of purpose asks instead whether an event substantially destroyed the value of the counterperformance to the party receiving it while performance remained possible (C&M 1135; § 265).`

### A7. Krell timeline step: the "not reasonably contemplated" condition is dropped

- **Surface/field:** Timeline 'excuse' step 3 (id krell), `note`.
- **Current text:** `Frustration of purpose: when the shared foundation of the deal fails, the parties are discharged though performance is still possible.`
- **Verdict:** MISSING CONDITION.
- **Counterexample:** Change Krell's facts so that Henry took the rooms after the King's illness and the indefinite postponement had been announced (footnote P). The shared foundation still fails, and the note discharges him. Vaughan Williams L.J. limited the doctrine to an event that could not "reasonably be supposed to have been in the contemplation of the contracting parties, when the contract was made," and § 265 requires that the non-occurrence of the event be a basic assumption and that the frustration occur without the party's fault, "unless the language or the circumstances indicate the contrary." The brief rule and the chronology note keep this condition; this step does not. (Foreseeability is a factor, not a bar: § 265 cmt. a; C&M 1115, Wolf Trap.)
- **Pinpoint:** C&M 1134; Restatement § 265 black letter and cmt. a.
- **Replacement:** `Frustration of purpose: when an event the parties could not reasonably have contemplated destroys the shared foundation of the deal, the parties are discharged though performance is still possible.`

---

## B. Teaching gaps and lesser inaccuracies

Teaching gaps (assigned material no surface teaches) are numbered G1–G6; lesser inaccuracies in existing text are B1–B10.

### G1. Flowchart K-29 node d: owner-supplied design specifications (Spearin) and the performance/design distinction

- **Surface/field:** Flowchart K-29 node d, `detail` (the node cites Stees).
- **Current text:** `Stees construed the building promise strictly despite quicksand.`
- **Gap:** Route test. Stees facts with one fact changed: the owner supplies detailed plans prescribing the foundation design, materials and methods, and the collapse results from a defect in that design. d tells the student only that Stees construed the promise strictly, so the path is "Risk assumed" → h (builder liable). The editors state that when the contract requires building according to the owner's plans, "the contractor will not be responsible for the consequences of defects in the plans and specifications" (Spearin), and they distinguish a "performance specification" from a "design specification," which "impliedly warrants their adequacy." The map notes and the timeline `fate` mention Spearin; the chart does not. The excerpt also states only that the plaintiffs "alleged" the specifications were prepared by "a firm of architects named Sheire & Bro." and that two Sheires were defendants; the Cold Call actor list states it as fact.
- **Pinpoint:** C&M 1075 (allegation), 1077 Note 2.
- **Draft addition (d detail):** `If the owner supplied a design specification prescribing design, materials and methods, the owner may impliedly warrant its adequacy (Spearin); a performance specification that requires only a result leaves the means, and the soil risk, with the builder, as in Stees.`

### G2. Flowchart K-29 node g: no restitution after discharge and no Transatlantic remedy point

- **Surface/field:** Flowchart K-29 node g, `detail`.
- **Current text:** `A later event may discharge or suspend remaining duties, depending on doctrine or clause.`
- **Gap:** Route test. Transatlantic with § 261 illus. 10's fact (the canal closes while the ship is in it, preventing completion): a → c → e "Excuse established" → g. Node g says nothing about what the carrier recovers for the part performed. The court said that if performance is impossible the contract "is a nullity," "[i]f the performance rendered has value, recovery in quantum meruit for the entire performance is proper," and the claim must be for "the entire trip, rather than only for the extra expense." Restatement § 272(1) gives either party restitution under §§ 240 and 377, and § 272(2) lets the court protect reliance where those rules will not avoid injustice. The Krell surfaces correctly say the deposit question was not decided; the chart gives no rule for it.
- **Pinpoint:** C&M 1112–1113; Restatement §§ 272, 377; § 265 illus. 2 (printer "may have a claim under the rule stated in § 272(1)").
- **Draft addition:** `After discharge, either party may claim restitution for benefits conferred by part performance (§§ 272(1), 377); a court may protect reliance where needed to avoid injustice (§ 272(2)). A party claiming discharge cannot keep the contract price and recover only its extra cost (Transatlantic).`

### G3. Flowchart K-29 node a/b: existing impracticability (§ 266) has no route

- **Surface/field:** Flowchart K-29 node a, `detail` and edge `"label": "Existing fact"`.
- **Current text:** `Distinguish an erroneous belief about existing facts from a supervening event affecting performance or the value of the promised exchange.`
- **Gap:** Every existing-fact problem goes to b (mutual mistake). The casebook distinguishes supervening from "existing impracticability" and says a party claiming the latter "may also have a claim of mistake"; § 266 discharges no duty from arising where performance is impracticable "because of a fact of which he has no reason to know." The "no reason to know" requirement is what separates it from § 152, under which fault in failing to know does not bar relief unless it amounts to bad faith (§ 157).
- **Pinpoint:** C&M 1100–1101 Note 1 (1101 assigned); Restatement §§ 266(1)–(2), 157.
- **Draft addition (a detail):** `A fact existing at formation that makes performance impracticable, or frustrates a party's principal purpose, may also excuse under § 266 if that party had no reason to know of it.`

### G4. Stees: the remedy the owners sought, and parol evidence offered to prove mistake

- **Surface/field:** stees map `sections.Reasoning` (or the takeaway).
- **Gap:** Note 1 asks why Stees "did not get, nor did he ask for, his expectation interest"; the pleaded demand was the payments made plus loss of use and damage to the adjacent house. Note 4 contrasts the parol evidence ruling with § 152 cmt. a: "The parol evidence rule does not preclude the use of prior or contemporaneous agreements or negotiations to establish that the parties were mistaken." Neither point appears in any Stees surface; the parol-evidence topic states only the exclusion.
- **Pinpoint:** C&M 1075, 1077 Note 1, 1078 Note 4; Restatement § 152 cmt. a.
- **Draft sentence:** `The owners sought return of their payments and incidental losses, not the value of the finished building. Although the drainage agreement could not vary the writing, the parol evidence rule does not bar prior agreements offered to show that the parties were mistaken (§ 152 cmt. a).`

### G5. Krell: the homecoming and wedding problems are not connected to the cab dictum

- **Surface/field:** krell map `sections.Reasoning`, second paragraph.
- **Gap:** The assigned problems ask whether alumni who reserved Touchdown lodging at more than double the normal rate can recover deposits when homecoming is cancelled, and whether the cab dictum can be distinguished or disputed. The Atlas teaches the cab contrast as the reason ("the cab had no special qualification for this particular occasion") but never says that it is dictum or applies it to an ordinary room with an event-inflated price. Restatement § 265 cmt. a supplies the test: the object must be "so completely the basis of the contract that, as both parties understand, without it the transaction would make little sense."
- **Pinpoint:** C&M 1134 (cab), 1136 Problems 1–2; Restatement § 265 cmt. a.
- **Draft sentence:** `The cab example is dictum. A hotel room booked for a cancelled homecoming at an event-inflated price tests the line: frustration requires that both parties understood the event as the basis without which the transaction would make little sense, not merely that the price reflected it.`

### G6. Force majeure: interpretation limits are not stated

- **Surface/field:** Flowchart K-29 node d, `detail`, force-majeure sentence.
- **Current text:** `For force majeure, apply trigger, causation, notice, mitigation and relief specified by the language.`
- **Gap:** The assigned notes teach three interpretive points the node omits: a general catch-all may be confined by ejusdem generis (Kama Rippa); a clause covering an event (terrorism) may not cover its economic aftermath (OWBR, interpreting the clause with § 261); and an express carve-out such as the "hell or high water" rent proviso keeps the risk on the tenant (1600 Walnut), while a clause without it excused rent (BP Prucenter).
- **Pinpoint:** C&M 1117–1119.
- **Draft addition:** `Read the listed events narrowly where a general catch-all follows them (ejusdem generis); ask whether the clause covers the event's economic consequences as well as the event; and give effect to express exclusions such as a duty to pay rent regardless.`

### B1. Rules & authorities: § 21 linked to Renner and Krell; UCC Article 2 linked to Stees; the session's sections linked to none of its cases

- **Surface/field:** Rules & authorities entries restatement-21, ucc-2-202, ucc-2-209 `links`; restatement-152 to -154, -261, -265, -266, -272, ucc-2-613 to -615 `links` (tools/v25/authorities.json).
- **Current text:** restatement-21 links `renner` and `krell` (basis `Case connected to cited atlas rule or concept`); ucc-2-202 and ucc-2-209 link `stees` with the same basis; restatement-265 links only `mattei` (basis `Explicit citation in atlas entry`).
- **Verdict:** WRONG CITATION.
- **Counterexample:** § 21 (intention to be legally bound) bears on neither case; the link appears to come from the "assent" learning topics. UCC Article 2 governs sales of goods and cannot apply to an 1874 building contract; Stees's later-promise issue concerned oral modification of a sealed contract. Meanwhile § 154 illus. 5 is Stees's fact pattern (builder; land must be drained; not voidable; court allocates the risk to the builder), § 261 illus. 9–10 are Transatlantic's facts, § 265 illus. 1 is Krell's (window to view a parade cancelled by an official's illness), and Transatlantic discusses §§ 2-614 and 2-615 in its text and footnotes (C&M 1109 n.3; the footnote quoting § 2-614(1) at C&M 1110). The black letter of restatement-151 to -154, -261, -265, -266, -272 and ucc-2-613 to -615 was checked against sel.txt and is accurate (ucc-2-615(a) differs only by a page-break hyphen in the source).
- **Pinpoint:** Restatement § 154 illus. 5; § 261 illus. 9–10; § 265 illus. 1; C&M 1107, 1109 n.3, 1110.
- **Replacement:** remove renner and krell from restatement-21 and stees from ucc-2-202 and ucc-2-209 (keep restatement-209). Add: restatement-152 → stees (casebook places it under mutual mistake, C&M 1074); restatement-154 → stees, renner; restatement-261 → taylor-caldwell, transatlantic; ucc-2-614 and ucc-2-615 → transatlantic; restatement-265 → krell; restatement-272 → taylor-caldwell, krell, transatlantic. Check whether the Mattei atlas entry really cites § 265.

### B2. Flowchart K-29 node e edges: fault has no edge

- **Surface/field:** Flowchart K-29 node e, edge `"label": "Reasonable alternative or assumed risk"`.
- **Verdict:** MISSING CONDITION (edge label).
- **Route test:** Taylor with the fire caused by the owners' negligence. e's detail says "Check fault," but neither edge names it, so the student reaches h only by elimination, and h's detail ("bore the risk or the doctrine’s threshold is unmet") does not say that fault bars excuse. Taylor excuses only where the thing perishes "without default of the contractor"; § 261 applies only to performance made impracticable "without his fault," which cmt. d says includes negligence and breach.
- **Pinpoint:** C&M 1103, 1105; Restatement § 261 and cmt. d.
- **Replacement:** `Party at fault, reasonable alternative, or assumed risk`.

### B3. Renner map Reasoning: the mistake test restated in frustration terms

- **Surface/field:** renner map `sections.Reasoning`, first paragraph.
- **Current text:** `Its absence materially defeated the shared purpose.`
- **Verdict:** OVERSTATED (wrong doctrinal test). The court applied § 152: the mistake "ha[d] such a material effect on the agreed exchange of performances as to upset the very bases of the contract." "Shared purpose" is the frustration test (§ 265: "principal purpose ... substantially frustrated").
- **Pinpoint:** C&M 1079.
- **Replacement:** `Its absence had a material effect on the agreed exchange of performances, upsetting the very basis of the contract.`

### B4. Renner timeline 'excuse' step 6: "not reliance costs"

- **Surface/field:** Timeline 'excuse' step 6 (id renner), `note`.
- **Current text:** `but limits the buyer to restitution, not reliance costs.`
- **Verdict:** OVERSTATED. Development spending was recoverable to the extent it enhanced the land's value, and the buyers had to pay fair rental value. The 'mistake' and 'restitution' timeline notes were already corrected to "restitution of benefits rather than reimbursement of every reliance expense"; this step was not.
- **Pinpoint:** C&M 1080–1081.
- **Replacement:** `Arizona rescinds for a mutual mistake about a basic assumption (Restatement (Second) § 152) but limits the buyers to restitution: the down payment and value their work added to the land, less its rental value, not every reliance expense.`

### B5. Transatlantic takeaway: "shipper"

- **Surface/field:** Takeaway (transatlantic).
- **Current text:** `The shipper could not shift the extra cost to its customer.`
- **Verdict:** OVERSTATED (misnames the party). Transatlantic was the carrier operating the ship; the United States chartered it to carry its wheat and was the shipper.
- **Pinpoint:** C&M 1107.
- **Replacement (2 sentences, 52 words):** `Closing Suez made the planned voyage more expensive, but sailing around Africa remained commercially practicable on this record, so the carrier could not shift the extra cost to the government that chartered the ship. Impracticability examines the contingency, allocation of risk and severity of the burden; expense alone did not suffice here.`

### B6. Transatlantic learning.topics "quantum-meruit": the alternative ground presented as the reason

- **Surface/field:** transatlantic map `learning.topics` "quantum-meruit".
- **Current text:** `Wright J. rejected that theory because a party cannot keep the contract price and also recover the extra cost as if the contract were discharged.`
- **Verdict:** OVERSTATED. The holding was that performance was not rendered impracticable; the remedy point is an alternative ground ("Even if we agreed with appellant, its theory of relief seems untenable").
- **Pinpoint:** C&M 1112.
- **Replacement:** `Transatlantic sued in quantum meruit for the added expense of the Cape route. The court held performance practicable and added that, even if performance had been excused, a party could not keep the contract price and recover only the extra cost; restitution would concern the entire performance.`

### B7. Taylor takeaway: the excused performances misdescribed

- **Surface/field:** Takeaway (taylor-caldwell).
- **Current text:** `Its faultless destruction excused the promised concert performance, and the promoters could not recover their preparation losses.`
- **Verdict:** OVERSTATED (imprecise). Neither side promised the other a "concert performance"; the court excused "the plaintiffs from taking the gardens and paying the money, the defendants from performing their promise to give the use of the Hall and Gardens and other things."
- **Pinpoint:** C&M 1105.
- **Replacement (2 sentences, 54 words):** `The parties’ bargain depended on this music hall’s continued existence, which the owners had not guaranteed. Its faultless destruction excused both sides, the promoters from paying and the owners from supplying the hall, so the promoters could not recover their preparation losses; an express allocation of the destruction risk could produce a different result.`

### B8. Taylor map notes and learning.topics "frustration": "the origin" and "the source"

- **Surface/field:** taylor-caldwell map `notes`; map `learning.topics` "frustration".
- **Current text:** `the origin of the common-law impossibility/frustration doctrine` and `Taylor v. Caldwell is the source of the English impossibility/frustration doctrine`.
- **Verdict:** OVERSTATED. The editors call Taylor "an early departure from the absolute rule"; Blackburn J. relied on English authority holding the same "as early as The Book of Assizes," on bailment cases and on death-of-promisor cases. Krell describes the principle as one "adopted and acted on in many English decisions and notably in the case of Taylor v. Caldwell." (The timeline's "origin" label is defined as a selected starting point and is not challenged.)
- **Pinpoint:** C&M 1102, 1104–1105, 1133.
- **Replacement:** notes: `the leading early departure from the absolute-obligation rule`; topic: `Krell v. Henry extended the principle that Taylor v. Caldwell applied to a destroyed thing to the failure of a state of things both parties assumed as the contract's foundation.`

### B9. Krell plain sentence 2.2: dictum stated as an outcome

- **Surface/field:** krell, Cold Call plain-English sentences, `"at": "2.2"`.
- **Current text:** `so the fare would still be owed.`
- **Verdict:** OVERSTATED (dictum presented as a result). The cab example is a hypothetical, and the assigned problem asks whether the student is "prepared to dispute the court's dictum on that case."
- **Pinpoint:** C&M 1134; C&M 1136 Problem 1.
- **Replacement:** `so, the court suggested in dictum, the fare would still be owed.`

### B10. Krell plain sentence 1.0: "unpaid rent"

- **Surface/field:** krell, Cold Call plain-English sentences, `"at": "1.0"` (first item).
- **Current text:** `rejected Krell’s \"claim\" for the unpaid rent`
- **Verdict:** OVERSTATED (characterization). The court held the arrangement "a license to use rooms for a particular purpose," not a demise. The case report itself speaks of "the balance of the rent" in the bracketed facts, so this is minor.
- **Pinpoint:** C&M 1133–1134.
- **Replacement:** `rejected Krell’s "claim" for the unpaid £50 balance`.

---

## C. Route tests (K-29; no other chart cites these cases)

- **Stees.** Facts: quicksand existing at signing; two collapses; builder refuses to proceed. Path a "Existing fact" → b "Material mutual mistake" → d "Risk assumed or clause untriggered" → h; or a "Later event" → c "Performance impaired" → e "Reasonable alternative or assumed risk" → h. Displayed: obligation remains. Correct (C&M 1076; § 154 illus. 5). Changed fact 1 (lightning destroys the nearly finished building): e → "Excuse established" → g; wrong (A2). Changed fact 2 (owner supplies a defective design specification): d → h; the source suggests the owner may bear the defect under Spearin (G1). The ≈ sentences preserve "a building that could still be completed" (2.0) and "rebuilding might still be possible and within what the builders promised" (2.1), which is the distinction A2 needs.
- **Renner.** Facts as decided. a → b "Material mutual mistake" → d "Qualifying mistake or clause provides relief" → g. Displayed: avoidance and restoration, net value rather than every expense. Correct (C&M 1079–1081). Changed fact 1 (buyers knowingly signed without water data): d → "Risk assumed" → h, correct, but plain 2.1 points the other way (A4). Changed fact 2 (only the buyers mistaken, sellers knew): b → h; wrong under § 153(b) (A1).
- **Taylor.** a "Later event" → c "Performance impaired" → e "Excuse established" → g. Correct (C&M 1105). Changed fact 1 (owners' negligence caused the fire): h is reached only by elimination (B2). Changed fact 2 (owners warranted the hall's existence): c "Express clause specifically addresses it" → d "Risk assumed" → h. Correct (C&M 1103: "in the absence of any express or implied warranty"). The ≈ sentence 2.2 preserves the no-warranty and no-breach conditions.
- **Transatlantic.** a → c "Performance impaired" → e "Reasonable alternative or assumed risk" → h. Correct (C&M 1111–1113; § 261 illus. 9). Changed fact (canal closes while the ship is in it, § 261 illus. 10): e "Excuse established" → g. Correct, but g gives no remedy rule (G2). Foreseeability is described in e as "evidence of allocation," consistent with C&M 1111; the ≈ sentences 3.0 and 3.1 preserve the stricter-scrutiny and insurance points.
- **Krell.** a → c "Principal purpose impaired" → f "Frustration established" → g. Correct (C&M 1134). Changed fact 1 (purpose was Henry's alone; ordinary lodging): f "shared understanding" → "Purpose remains or risk allocated" → h. Correct; ≈ 0.1 and 2.2 preserve the shared-purpose distinction. Changed fact 2 (processions held on the days but on a route not passing the rooms): f → h; wrong (A3). Changed fact 3 (contract made after the postponement was announced): f "who bore the risk" → h. Correct on the chart, but timeline step 3 discharges (A7).

---

## D. Checked and found supported

Supported (one line): Stees map entry (summary, notes, Parties, Material Facts, Procedural History, Issue, Holding, Reasoning, learning.topics), brief Procedural History/Material Facts/Issue/Holding/Reasoning in the parts the excerpt covers, takeaway, Cold Call episodes 1–4 in the parts the excerpt covers, all ≈ sentences, timeline step 1 and its fate, K-29 d and h (C&M 1074–1078); Renner map entry other than B3, brief rule/Holding/Reasoning, takeaway, Cold Call and ≈ sentences other than 2.1, timeline 'restitution' step 3 and 'mistake' step 4 (prior-corrected text), chronology 336, K-29 b detail as to mutual mistake, K-29 g (C&M 1078–1081); Taylor map entry other than B8, brief rule/Issue/Holding/Reasoning, Cold Call and all ≈ sentences, timeline step 0, chronology 20 (C&M 1102–1105); Transatlantic map entry and learning.topics other than A6 and B6, brief rule/Holding/Reasoning, Cold Call and all ≈ sentences, timeline step 5, chronology 178, K-29 e's Transatlantic sentence (C&M 1107–1113); Krell map entry and learning.topics, brief rule/Holding/Reasoning in the parts the excerpt covers, Cold Call and ≈ sentences other than 1.0, 2.1 and 2.2, chronology 49 (C&M 1132–1134); timeline 'excuse' summary fields (prior-corrected); lecture-notes topics and conflicts (checked against casebook and selections only); K-29 a and c; no surface describes excuse or rescission relief as expectation damages, and none treats foreseeability as dispositive; black letter of restatement-151 to -154, -261, -265, -266, -272 and ucc-2-613 to -615 against sel.txt.

Not in the assigned excerpt, so not tested: Stees's party first names, the August 18, 1868 date, the $6,735 price, the collapse dates, Ramsey County, and the later-promise pleading analysis and "American exception" (the excerpt summarizes only that consideration and justifiable reliance were not alleged); Renner's Colton and Kofa Farms, the 2,262-acre figure (excerpt: "more than two thousand acres"), the June 5, 1981 date, the trial and appellate dates, the panel, and the express no-fraud finding (excerpt: "absent proof of breach for fraud or misrepresentation"); Taylor's Lewis and Bishop, the "God's will permitting" and "let"/"rent" wording, the panel and the May 6, 1863 date, and the abridged personal-service and specific-goods examples (the Atlas's Queen's Bench correction of the casebook's "King's Bench" caption cannot be checked from the excerpt); Transatlantic's panel and decision date and the contents of the fitness, deviation and demurrage clauses (footnotes 7–10 are only partly legible); Krell's Darling J. ruling, the counterclaim and its withdrawal, the Romer and Stirling concurrences, The Moorcock, the August 11, 1903 date, and the "early on June 24" announcement (footnote P as extracted reads "On June 22 Commons was informed," which may be an OCR error; the Atlas's timing account cannot be confirmed from the excerpt).
