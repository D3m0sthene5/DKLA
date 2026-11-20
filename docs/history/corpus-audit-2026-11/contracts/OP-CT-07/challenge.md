# OP-CT-07 challenge review: Contracts Class 7, offer and acceptance

Scope. This review tests the Atlas statements served for Class 7 against the assigned sources only: C&M printed pp. 191–192, 198–205, 213–225, 227–229, 235–242 and 261–263 (`ct07-casebook.txt`; printed page = PDF page − 45 throughout, confirmed by the running heads PDF 251 = 206 and PDF 307 = 262), the Restatement (Second) and UCC text in `src/sel.txt`, and the deck `ct07-slides.txt` (15 slides). Items in `prior-corrections.json` were not re-challenged; their corrected texts were read and appear in Part E.

Staging note. The `ct07-surfaces.md` first staged held only the header "Contracts class 07: None", because the stager passed "07" and the corpus keys classes as "7". I regenerated the surfaces read-only with `python3 -I tools/content-audit/session_surfaces.py 7` (saved as `ct07-surfaces-regen.md`; the current `ct07-surfaces.md` now has the same 110,740 bytes). That script shows only chart nodes and timeline steps that name a principal case, so the concept and note entries for silence, termination, revocation, the mailbox rule and the anti-discrimination materials were read from `src/data/seedData/nodes-45978ecb29/` with the October r21 run-time corrections applied (`ct07-notes-regen.md`). The full charts K-11 to K-14 were read from `tools/flowcharts/data/contracts.json`, and rules-and-authorities links from `tools/v25/authorities.json`. The casebook OCR is degraded; quotations below restore dropped letters and change no words.

Severity key. "Result" means a student relying on the Atlas wording would reach the wrong legal answer on facts drawn from the assigned cases, notes, problems or slides. "Wording" means the statement is imprecise or misattributed but unlikely to change an answer.

---

## Part A. Challenged statements (errors in existing text)

### A-01. K-14 notice branch treats missing notice of a performance acceptance as no acceptance

- Surface and field: **Flowchart K-14 (How was this offer accepted?) node f**, `label` and edge `label`; target node h `label`.
- Current text: node f label "Did the offer dispense with separate notice?"; edge "Required notice lacking" → h; node h label "Acceptance not established by this act".
- Verdict: **CHANGES RESULT**.
- Facts entered (Bishop v. Eaton, C&M 229, with one fact changed). Eaton, in Nova Scotia, writes that if Bishop helps his brother Harry get money in Illinois, "I will see that it is paid." Bishop signs Harry's note as surety. Changed fact: Bishop sends no notice, but Eaton learns of the guarantee from Harry within a week.
- Path: a →(Performance) c →(Invited acceptance act occurred) f →(Required notice lacking) h. Displayed result: "Acceptance not established by this act."
- Source-supported result. Under § 54(2) the performance is the acceptance; lack of notice matters only because "the contractual duty of the offeror is discharged unless (a) the offeree exercises reasonable diligence to notify the offeror of acceptance, or (b) the offeror learns of the performance within a reasonable time, or (c) the offer indicates that notification of acceptance is not required." On the changed facts (b) applies, so Eaton is bound. Bishop says the same thing in its own terms: notice must be given "within a reasonable time after doing that which constitutes the acceptance" (C&M 229), so the act has already accepted. The chart's framing also misleads on revocation timing. Slide 15 asks whether the Carbolic Smoke Ball Company could revoke "before Mrs. Carlill notified them of her claim." If missing notice meant no acceptance, revocation after performance would still work. Under § 54 and Carlill it would not. The label "Did the offer dispense with separate notice?" also inverts § 54(1): for an offer inviting performance, "no notification is necessary ... unless the offer requests such a notification."
- Pinpoint: C&M 228–229 (Carlill; Note 2, Bishop v. Eaton); `sel.txt` § 54(1)–(2); slides 7, 13, 15.
- Replacement (minimal). Relabel node f "Is notice of acceptance required, and was it given or excused?" Replace its detail with: "Acceptance by promise needs notice unless the offer dispenses with it (§ 56); International Filter's order made the Chicago officer's O.K. enough. For an offer inviting performance, performance is the acceptance and needs no notice unless the offer requests it (§ 54(1)); Carlill. If the offeree has reason to know the offeror cannot promptly learn of the performance, the offeror's duty is discharged unless the offeree uses reasonable diligence to notify, the offeror learns of it within a reasonable time, or the offer says notice is unnecessary (§ 54(2); Bishop)." Split the edge "Required notice lacking" into "Promise not communicated as required" → h and "Performance accepted; § 54(2) notice lacking and offeror never learned" → a new terminal node, "Contract formed by performance, but the offeror's duty is discharged (§ 54(2))." Sources for the new node: `acceptance-notice`, `note-bishop`.

### A-02. K-14 node b: the promise branch asks whether commitment was "communicated", lacks the § 56 waiver, and its Wucherpfennig gloss lacks the § 61 test

- Surface and field: **Flowchart K-14 node b**, `label` and `detail`.
- Current text: label "Was a clear commitment communicated?"; detail "Read the response as a whole. In Wucherpfennig stated readiness and financing accompanied unsettled price and valuation requests, so the exchange remained negotiation."
- Verdict: **CHANGES RESULT** (two routes).
- Route 1 (International Filter, decisive fact changed). C&M Note 4 treats International Filter's order as "an offer that seeks a promise" (C&M 221), so a student may enter it at a →(Return promise) b. Changed fact: no February 14 letter was ever sent, so Conroe Gin learns nothing before it countermands on February 28. Path: a → b → "Qualified or undecided response" → h, because no commitment was "communicated." Displayed result: "Acceptance not established by this act." Source result: a contract was formed on February 13. The court held "notice of the approval was not required" because the offeror "does dispense with it 'if the form of the offer ... shows that this was not to be required'" (C&M 219–220). Section 56 contains the same exception: "Except as stated in § 69 or where the offer manifests a contrary intention." The letter was only the alternative ground.
- Route 2 (Wucherpfennig, decisive fact changed). Changed fact: the February 17 letter reads "Donald accepts your offer of $200 per acre for cash. Please tell us the exact total and whether you will sign the Special Use Valuation agreement." Path: the detail tells the student that "price and valuation requests" mean "the exchange remained negotiation," so the student takes "Qualified or undecided response" → h. Source result: acceptance. Under § 61, "an acceptance which requests a change or addition to the terms of the offer is not thereby invalidated unless the acceptance is made to depend on an assent to the changed or added terms." The court decided the actual letter on its words ("ready to proceed" followed by a request for the amount Elizabeth expected, which were "hardly the words of an unequivocal, unconditional acceptance," C&M 216). The price was not unsettled, because the offer fixed it at "$200 an acre." "Valuation" refers to a Special Use Valuation agreement, not to valuing the price.
- Pinpoint: C&M 215–216, 219–221; `sel.txt` §§ 56, 59, 61.
- Replacement detail: "Read the response as a whole. In Wucherpfennig the reply announced financing and readiness but asked what amount the seller expected, so it read as continued negotiation. A reply that accepts unconditionally while asking a question or requesting a change still accepts (§ 61); a reply made to depend on new terms is a counteroffer (§ 59). Notice of a promise is required unless the offer dispenses with it (§ 56): International Filter's order made the officer's approval enough, so use the specified-approval branch." Relabel: "Did the response commit to the offered terms by the invited method?"

### A-03. K-12 node b: revocation of a general offer by equal publicity is missing

- Surface and field: **Flowchart K-12 (Which communication took effect first?) node b**, `detail`.
- Current text: "Check stated or reasonable lapse, death or incapacity, rejection, counteroffer, and receipt of direct or reliable indirect revocation. A conversation may expire on ending and an old reward may lapse even without a stated date."
- Verdict: **CHANGES RESULT** (missing condition).
- Facts entered (Lefkowitz, decisive fact changed). On Thursday the store publishes a notice withdrawing the stole offer in the same newspaper, with the same prominence as the ad. Lefkowitz does not see it. He arrives first on Saturday and tenders $1. Path: K-11 has no revocation branch, so the student opens K-12: a →(Check deadline and ordinary termination) b. Lefkowitz never received a revocation, so the student takes "Compare to effective acceptance" → c →(Only ordinary dispatch/receipt events) g. Displayed result: "Agreement if acceptance took effect while open." Source result: no contract. For offers "addressed to the general public," the offeror may "give a notice of revocation publicity equal" to the offer's, and the offeror is then not "bound by the acceptance of an offeree who missed the notice of revocation, in spite of the requirement that a revocation be communicated to the offeree" (C&M 241, citing § 46). The `revocation` concept entry states this point, but the chart's "receipt" test overrides it for a student following the chart.
- Pinpoint: C&M 241; `sel.txt` § 46.
- Replacement: append "For an offer made by advertisement or other general notification, a notice of termination given publicity equal to the offer's ends the power of acceptance even for a reader who missed it, if no better means of notice is reasonably available (§ 46)." Add `revocation` is already among the sources; no source change needed.

### A-04. Silence: the offeror-stated-silence exception (§ 69(1)(b)) and exercise of dominion (§ 69(2)) are missing

- Surfaces and fields: **silence** concept entry, `notes` (r21 text); **Flowchart K-14 node e**, `detail`.
- Current text: silence notes "An offeror ordinarily cannot impose acceptance by declaring that failure to reject counts as assent."; K-14 e detail "Unsolicited goods ordinarily do not impose acceptance by inaction."
- Verdict: **MISSING CONDITION** (result).
- Counterexample. The seller writes: "Unless I hear from you by Friday, we have a deal." The buyer stays silent and means to accept. The seller then sells to someone else. Path: K-14 a →(Silence or settled pattern) e. There are no prior dealings, so the student takes "Silence alone" → h. Displayed result: no acceptance. Source result: a contract that binds the offeror. Under § 69(1)(b), silence is acceptance "where the offeror has stated or given the offeree reason to understand that assent may be manifested by silence or inaction, and the offeree in remaining silent and inactive intends to accept." The casebook rule, as stated, protects the offeree: an offeror who appends "Unless I hear from you ..." to an offer cannot on that basis bind an offeree who fails to reject (C&M 235, paraphrased because the OCR drops part of the sentence). Second counterexample: a recipient who uses goods sent on approval is bound on the offered terms unless they are manifestly unreasonable (§ 69(2)). The unsolicited-merchandise note qualifies this. A recipient who "lays the merchandise on a shelf and does not use it incurs no liability," and statutes such as N.Y. Gen. Bus. L. § 396 make unsolicited goods a gift (C&M 236).
- Pinpoint: C&M 235–236; `sel.txt` § 69(1)(a)–(c), (2).
- Replacement (silence notes, add after the first sentence): "That rule protects the offeree. If the offeror said silence would signify assent and the offeree, remaining silent, intends to accept, the silence is an acceptance that binds the offeror (§ 69(1)(b)). An offeree who uses offered property is ordinarily bound on the offered terms (§ 69(2)), but unsolicited-goods statutes can make the goods a gift." K-14 e detail, append: "Silence also accepts where the offeror invited it and the offeree intends to accept (§ 69(1)(b)), and use of offered property can accept (§ 69(2))."

### A-05. Carlill described as dispensing only with "advance" notice

- Surfaces and fields: **note-carlill** `summary` and `notes`; **acceptance-notice** `notes` (r21 text); **Flowchart K-14 node f** `detail`.
- Current text: "The reward advertisement invited performance without advance notification of acceptance."; "The court inferred from the transaction that notice in advance was dispensed with."; "Carlill dispenses with advance notice;"; "Carlill invited completed performance without advance notice."
- Verdict: **MISSING CONDITION** (result).
- Counterexample. This is slide 15's question: "Could it be revoked before Mrs. Carlill notified them of her claim?" A student told that only *advance* notice was waived will think some notice after performance was still part of acceptance, and will answer that the company could revoke after she fell ill but before she wrote. Bowen, L.J., said that "if the person making the offer ... intimates in his offer that it will be sufficient to act on the proposal without communicating acceptance of it to himself, performance of the condition is a sufficient acceptance without notification." He also said "if he performs the condition notification is dispensed with" (C&M 228). Performance completed the acceptance, and no later notice was required.
- Pinpoint: C&M 228; slide 15; `sel.txt` § 54(1).
- Replacement: summary "The reward advertisement invited performance; performing the condition was a sufficient acceptance without any notification." In the notes, replace "notice in advance was dispensed with" with "notification was dispensed with: the claimant need not notify before performing, and performance itself accepted." Also replace "Carlill used the product, became ill, and recovered" with "Carlill used the smoke ball as directed, caught influenza, and was awarded £100" ("recovered" reads as recovery from the illness). In acceptance-notice and K-14 f, replace "advance notice" with "notice of acceptance".

### A-06. White's communication rule stated without its limit (offers that dispense with notice)

- Surfaces and fields: **Effective brief CTR-030: rule**; the same text at **Chronology 'course-chronology-0' step 23** `note`; **Map entry: summary** (white-corlies).
- Current text (rule): "Acceptance of an offer made between parties who are apart requires an appropriate outward act placed in a proper course of communication to the offeror; a private intention to accept, shown only by general preparations, is not enough." Map summary: "An offer made to a party at a distance is accepted only by an outward act placed in a proper course of communication so that it will ordinarily reach the offeror;"
- Verdict: **MISSING CONDITION** (result).
- Counterexample. Mrs. Carlill used the ball at home, and nothing she did was "placed in a proper course of communication" to the company. On the Atlas rule a student finds no acceptance. Carlill held that "performance of the condition is a sufficient acceptance without notification" (C&M 228). Engel's O.K. in Chicago was likewise never sent to Conroe Gin, yet it formed the contract because the offer made it sufficient (C&M 219–220). The casebook introduces White's rule as the ordinary rule for an offer proposing a "bilateral" contract and then says "the necessity of giving notice is less obvious if the offer proposes a 'unilateral' contract, inviting acceptance by means of performance and not a promise" (C&M 227–228).
- Pinpoint: C&M 223–224, 227–228, 219–220; `sel.txt` §§ 54(1), 56.
- Replacement rule (41 words): "Unless the offer dispenses with notice, acceptance of an offer made between parties who are apart requires an appropriate outward act placed in a proper course of communication to the offeror; a private intention to accept, shown only by general preparations, is not enough." The same text goes to chronology step 23. Map summary: insert "Unless the offer dispenses with notice," at the start.

### A-07. K-13 sends beginning of performance only to a § 45 option and omits § 62

- Surface and field: **Flowchart K-13 (Can the offer still be revoked?) node d** `detail`; terminal **node i**.
- Current text: "If the offer invites performance alone, beginning it creates a § 45 option. Starting to cross the bridge qualifies on the hypothetical facts. Buying materials that could be used on other work may be preparation." Node i: "Option only, with performance outstanding".
- Verdict: **MISSING CONDITION** (result).
- Facts entered (White, decisive fact changed). On September 29, within an hour of the note, White's crew begins removing partitions at 57 Broadway. The merchants countermand the next day. Path: a →(Beginning invited performance) d →(Invited performance began) f →(Incomplete) i. Displayed result: "Option only ... the offeree has yet to earn the promised return," which leaves White free to walk away. Source result: if the note invites acceptance either by promise or by performance, beginning the invited performance "is an acceptance by performance" that "operates as a promise to render complete performance" (§ 62). Section 32 adopts that reading "in case of doubt," and the casebook's own reading of "you can begin at once" leaves the matter open (C&M 224, Note 2). On that reading a contract binds both sides. Ever-Tite, also cited in K-14, is a § 62-type case: the form invited "commencing performance" and commencement formed a contract (C&M 227). K-13 therefore gets the revocation answer right but misstates the offeree's position.
- Pinpoint: C&M 224 (Note 2), 225–227 (Ever-Tite and Notes 1–2: "bilateral or unilateral?"); `sel.txt` §§ 32, 45, 62.
- Replacement (append to d's detail): "If the offer invites either a promise or performance, which § 32 presumes in case of doubt, beginning the invited performance is an acceptance and a promise to finish (§ 62). That is a contract, not an option: use K-14."

### A-08. Lefkowitz: the court is credited with rejecting the argument from his prior knowledge of the house rule

- Surfaces and fields: lefkowitz **Map entry: sections.Holding**; **Effective brief CTR-027: Reasoning** (paragraph 2); **Cold Call** episode-4 paragraph 4.
- Current text: "and his prior knowledge of the house rule did not write it into the second advertisement."; "and Lefkowitz's prior awareness of the asserted women-only rule did not insert that restriction into the second published advertisement."; "Lefkowitz’s knowledge that the store previously asserted the women-only rule did not persuade the court to add it to the second published offer."
- Verdict: **OVERSTATED** (misattributes an unreasoned result as a holding).
- Counterexample. The opinion's whole treatment of the house rule is: "The advertisement contained no such restriction. ... while an advertiser has the right at any time before acceptance to modify his offer, he does not have the right, after acceptance, to impose new or arbitrary conditions not contained in the published offer" (C&M 202). That reasoning does not reach the second visit. The store told Lefkowitz about the rule before the April 13 ad was published, so the store's statement came before the offer and was not a condition added after acceptance. The editors flag the gap. Note 1 asks the reader to consider this additional fact, setting aside questions of discrimination, and say whether they agree that "Lefkowitz could recover under the second advertisement" (C&M 203; the OCR drops some words of the question). Under § 24 an offer is one "so made as to justify another person in understanding that his assent ... is invited," and an addressee who knows the store will not sell to men is a hard case for that test. A student who says "the court held his knowledge irrelevant" overstates the opinion.
- Pinpoint: C&M 201–203; `sel.txt` § 24; slide 5 ("How will Great Minneapolis respond?").
- Replacement (map Holding and brief Reasoning): "The opinion did not separately discuss his knowledge, from the first visit, of the asserted rule; Note 1 asks whether that knowledge should change the result under the second advertisement." Cold Call: "The opinion did not separately address Lefkowitz’s knowledge, from the first visit, that the store asserted a women-only rule; the casebook asks whether that knowledge should matter."

### A-09. Wucherpfennig rule line: "leaves a material term open"

- Surfaces and fields: **Effective brief CTR-028: rule**; the same text at **Chronology 'course-chronology-0' step 309** `note`; similar wording in **Map entry: sections.Holding** ("left a material aspect of the exchange open").
- Current text: "a reply that shows readiness to proceed but leaves a material term open is not an acceptance."
- Verdict: **OVERSTATED** (wording, with a result risk).
- Counterexample. The offer fixed every term: "$200 an acre, provided it is a cash deal & handled promptly" (C&M 215). The reply did not leave a term of the offer open. It asked what Elizabeth "expect[ed] to receive," and the court read that question as "negotiations with a view toward reaching an agreement in the future" (C&M 216). On the rule-line wording, a student may treat any reply that asks for the computed total as leaving a "material term open," which collides with § 61 (see A-02, route 2).
- Pinpoint: C&M 215–216; `sel.txt` § 61.
- Replacement rule (38 words): "An acceptance must be absolute, unequivocal and unconditional and must express an intention to form the contract by that response; a reply that announces readiness to proceed but asks what amount the offeror expects reads as continued negotiation, not acceptance." The same text goes to chronology step 309. In map Holding, replace "but left a material aspect of the exchange open and contemplated further negotiation" with "but, by asking what amount she expected, read as negotiation toward a future agreement".

### A-10. White: the trial instruction misdescribed as "say he had begun"

- Surfaces and fields: white-corlies **Map entry: sections.Procedural History**; **Effective brief CTR-030: Procedural History**; **Cold Call** episode-3 paragraph 1.
- Current text: "The trial judge instructed the jury that White need not have gone back to the merchants and said he had begun"; "At trial the judge told the jury that White did not have to return to the merchants and state that he had begun"; "The trial judge instructed that White did not need to return to the merchants and say he had begun;"
- Verdict: **UNSUPPORTED BY ASSIGNED SOURCES** (wording, but on the exact issue decided).
- Counterexample. The charge asked whether it was White's "duty to go down to [Dey Street] (meaning to give notice of assent), before commencing the work" (C&M 223; the street name is partly lost in the OCR). The issue was notice of *assent* given *before* starting work, not a report afterwards that he had begun. The difference matters, because the Atlas wording suggests the case is about after-the-fact notice of performance, the § 54 question, which the court did not address.
- Pinpoint: C&M 223.
- Replacement: "that White need not have gone to the merchants to give notice of assent before commencing the work" (same substitution in each of the three texts).

### A-11. Class 7 assignment note adopts one disputed reading of White's note

- Surface and field: **contracts-class-07** concept entry, `notes` (also `studyMap` guide `white-corlies`).
- Current text: "White v. Corlies & Tifft: Uncommunicated preparations using materials equally suitable for other jobs did not accept an offer inviting an agreement to complete the work."
- Verdict: **OVERSTATED** (wording).
- Counterexample. The editors give two readings of "Upon an agreement to finish ... you can begin at once": "When we have agreed about finishing ... (and not before)," which is the merchants' brief ("demanding an agreement"), and "With reference to the work of fitting up ...", which "may comport better with 19th-century diction, and with the opinion as a whole" (C&M 224, Note 1). The Atlas treats the first reading as settled.
- Pinpoint: C&M 224.
- Replacement: "... did not accept the merchants' offer, whichever way its opening phrase "Upon an agreement" is read."

### A-12. International Filter: a comparison with White attributed to the court, and Engel's endorsement called "observable"

- Surfaces and fields: international-filter **Map entry: sections.Reasoning** (last sentence); **Cold Call** episode-5 paragraph 3.
- Current text: "Unlike White v. Corlies & Tifft, the offeree here performed an observable act the offer itself made sufficient."; "Engel had made the observable written endorsement that the offer selected."
- Verdict: **UNSUPPORTED BY ASSIGNED SOURCES** (attribution) and **OVERSTATED**.
- Counterexample. The opinion does not mention White. The casebook leaves reconciliation as a question: "Can the International Filter ... cases be reconciled with this rule?" (C&M 227). The O.K. was written on the paper in Chicago, but Conroe Gin could not observe it, and that is why notice was argued at all. What distinguishes the case is that the offer made the endorsement sufficient (C&M 219–220).
- Pinpoint: C&M 219–220, 227.
- Replacement (map): "The opinion does not discuss White v. Corlies & Tifft; the casebook asks whether the two can be reconciled (C&M 227). One answer is that Conroe Gin's offer itself made the Chicago endorsement sufficient, while nothing in the merchants' note made White's private preparations sufficient." Cold Call: replace "observable written endorsement" with "written endorsement".

### A-13. Lefkowitz map Reasoning credits the court with answering the over-demand objection

- Surface and field: lefkowitz **Map entry: sections.Reasoning**.
- Current text: "Those terms also answered the usual objection to treating advertisements as offers, that a merchant might be bound beyond its stock, because the quantity and the taker were fixed."
- Verdict: **UNSUPPORTED BY ASSIGNED SOURCES** (attribution; wording).
- Counterexample. The opinion does not discuss stock or over-demand. The objection comes from the editors' introduction (C&M 200), and the effective brief correctly says "the court did not rest its holding on that point."
- Pinpoint: C&M 200–202.
- Replacement: "The editors' introduction raises the usual objection that a merchant might be bound beyond its stock (C&M 200); the single stole and first-come term avoid it, although the opinion does not discuss the point."

### A-14. Wucherpfennig map Reasoning folds the Restatement and a reliance point into the court's reasoning

- Surface and field: wucherpfennig **Map entry: sections.Reasoning** (last two sentences).
- Current text: "Under Restatement §§ 59 and 61 a reply conditioning assent on different terms is a counteroffer, while a completed acceptance may carry a nonconditional request; here the threshold commitment was missing, so the court did not need to classify the letter as a counteroffer. Donald’s financing arrangements showed preparation, not acceptance of a cash-sale offer, and reliance was not treated as a formation argument."
- Verdict: **UNSUPPORTED BY ASSIGNED SOURCES** (attribution; wording).
- Counterexample. The excerpt cites N.D. Cent. Code § 9-03-21 and cases, not the Restatement, and it records no reliance argument (C&M 215–216). The Cold Call `limits` field already says §§ 59 and 61 are "comparative doctrine."
- Pinpoint: C&M 215–216.
- Replacement: "The opinion does not cite the Restatement. Under §§ 59 and 61, a reply that conditions assent on different terms is a counteroffer, while a completed acceptance may carry a nonconditional request; here the threshold commitment was missing. Donald’s financing arrangements showed preparation, not acceptance." (This deletes the reliance clause, which is not in the assigned excerpt.)

### A-15. Yaro problem summary misstates the sequence and presupposes a time limit

- Surface and field: **problem-yaro** `summary`.
- Current text: "A settlement offer with a short time limit is followed by a recess and an attempted acceptance after additional proceedings."
- Verdict: **UNSUPPORTED BY ASSIGNED SOURCES** (wording, on the question asked).
- Counterexample. The offer was made "during a 10-minute recess prior to the closing arguments." Counsel said "You've got to get back to me" while he "looked at the clock and 'placed his palms sideward.'" The problem asks whether the offer had lapsed and "What is a reasonable time in such a case?" The seventy-minute interval is the issue (C&M 240). Calling it an offer "with a short time limit" answers the question the problem asks.
- Pinpoint: C&M 240.
- Replacement: "During a ten-minute trial recess, defense counsel offers a settlement and says "You've got to get back to me" while looking at the clock; the claimant's acceptance comes seventy minutes later, after closing arguments."

### A-16. Timeline 'acceptance' step ucc206 drops "circumstances"

- Surface and field: `tools/r19/data/timelines.json`, timeline `acceptance`, step `ucc206`, `note`.
- Current text: "Unless the offer clearly says otherwise, acceptance may be made in any reasonable manner, including a prompt promise to ship or prompt shipment."
- Verdict: **MISSING CONDITION** (wording).
- Counterexample. Section 2-206(1) reads "Unless otherwise unambiguously indicated by the language or circumstances." Circumstances can limit the manner even when the words do not, and a student reading "says" will look only at the words.
- Pinpoint: C&M 229 (quoting § 2-206(1)(b)); `sel.txt` § 2–206(1).
- Replacement: "Unless the language or circumstances unambiguously indicate otherwise, acceptance may be made in any reasonable manner, including, for an order for prompt shipment, a prompt promise to ship or prompt shipment."

### A-17. International Filter plain-English sentence 4.1 weakens and shifts the estoppel remark

- Surface and field: international-filter **Cold Call plain-English sentences**, `at` 4.1, `plain`.
- Current text: "If the buyer had acted on the letter, the company might be barred from later saying it never approved; but this was only a side comment."
- Verdict: **OVERSTATED** (wording; the "might" understates and the object is wrong).
- Counterexample. The court said that if Conroe Gin "had acted to change its position upon it as a notification of that fact, it must be plain that the filter company would have been estopped to deny its sufficiency" (C&M 220). The estoppel concerns the letter's sufficiency as notice, and the court stated it firmly.
- Pinpoint: C&M 220.
- Replacement: "If the buyer had changed its position by relying on the letter as notice of approval, the company would plainly have been "estopped" (barred) from denying that the letter was sufficient notice; the buyer had not done so, so this was a side comment."

---

## Part B. Route tests

Each principal case was entered in every chart that cites it and in the chart a student would naturally open. Then one legally decisive fact was changed.

| Case | Chart and path (actual facts) | Displayed | Source | Changed fact | Path and displayed | Source result | Chart right? |
|---|---|---|---|---|---|---|---|
| Lefkowitz | K-11 a →(Advertisement) c →(Clear definite call for performance) f | "Identify the act that formed the agreement" (first qualified customer's tender) | Contract (C&M 202) | Store publishes equal-prominence withdrawal before Saturday; Lefkowitz misses it | K-12 a → b → (no receipt) c → g "Agreement" | No contract (§ 46; C&M 241) | **No** (A-03) |
| Lefkowitz | same | same | same | The ad itself says "women only" | K-11 c → f ("first qualified customer") | No power in a man to accept | Yes |
| Wucherpfennig | K-14 a →(Return promise) b →(Qualified or undecided) h; K-12 a → b → h for the March 9 revocation | "Acceptance not established"; "Power ended" | No contract (C&M 216) | Reply says "Donald accepts ... please tell us the exact total" | K-14 b → h (detail equates price requests with negotiation) | Acceptance (§ 61) | **No** (A-02) |
| International Filter | K-14 a →(Specified approval) f →(Notice ... unnecessary) g | "Agreement formed by the invited act" | Contract Feb. 13 (C&M 219–220) | No Feb. 14 letter; entered as an offer seeking a promise (Note 4) | K-14 a → b → h | Contract (notice dispensed with; § 56 "contrary intention") | **No** on the promise route (A-02); yes on the f route |
| International Filter | same | same | same | Offer says notice of approval must be mailed to purchaser; none sent | K-14 f →(Required notice lacking) h | No contract (§ 60) | Yes |
| White | K-14 a →(Performance) c →(Only preparation) h; K-13 a → d →(Only preparation) e →(No justified reliance) h | No acceptance; revocable | No contract (C&M 224) | Crew starts work at 57 Broadway before countermand | K-13 d → f →(Incomplete) i "Option only" | Under §§ 32, 62, acceptance and promise to finish | **No** (A-07); K-14 c → f → g is right |
| White | same | same | same | White mails "I agree to finish in two weeks" before countermand arrives | K-12 a → c → g | Contract on dispatch (C&M 223; § 63(a)) | Yes |
| Hobbs (silence note) | K-14 a → e →(Established assent basis) g | Agreement | Jury could find acceptance (C&M 235) | Offeror wrote "Unless I hear from you, we have a deal"; offeree silent, intending to accept | K-14 e →(Silence alone) h | Acceptance binding offeror (§ 69(1)(b)) | **No** (A-04) |
| Bishop / Carlill (notice notes) | K-14 a → c → f → g | Agreement | Contract (C&M 228–229) | No notice, but offeror learns within a reasonable time | K-14 f →(Required notice lacking) h | Offeror bound (§ 54(2)(b)) | **No** (A-01) |
| Mailbox | K-12 a → b → h (revocation received before acceptance mailed) | "Power ended" | No contract (§ 42) | Acceptance mailed before revocation received | K-12 b → c → g | Contract (§ 63(a)) | Yes |
| Option | K-12 a → d →(Receipt too late) h | "Power ended" | No exercise (§ 63(b)) | Exercise received in time | d → g | Exercise effective | Yes |

The ≈ plain-English sentences hold the decisive distinctions. Lefkowitz 3.2 keeps "before acceptance" versus "after formation." Wucherpfennig 4.1 keeps conditional assent ("I accept only if ...") apart from an acceptance with a request. International Filter 3.2 keeps "dispense with notice by choosing another sufficient method." White 3.0 keeps "need not always know of the acceptance" apart from "sent through a proper channel." The exception is International Filter 4.1 (A-17).

---

## Part C. Lecture notes compared with the slides

The lecture-notes record follows slides 3–15 accurately and conflates no slides. Each item below proposes a "Legal qualification:" sentence to add after the classroom wording. The classroom wording itself stays.

- C-1. Topic "What constitutes acceptance" (slide 6). Current: "It is effective on dispatch by reasonable means (except for options), and notification of acceptance by promise is ordinarily required." Also "silence ordinarily is not acceptance" and "Acceptance must be on the same terms and unconditional." Add: "Legal qualification: the dispatch rule applies unless the offer provides otherwise, and only to an acceptance made in a manner and by a medium the offer invites and properly dispatched; an acceptance under an option is operative only on receipt, and rejections and revocations take effect on receipt (§§ 40, 42, 63, 66). Silence accepts in the cases listed in § 69. An acceptance that merely requests a change still accepts (§ 61), and the UCC modifies the same-terms rule for goods (§ 2-207). Notice of a promissory acceptance is not needed where the offer manifests a contrary intention (§ 56; International Filter)."
- C-2. Topic "International Filter" (slide 11). The slide quotes the clause as becoming "a contract when accepted by the purchaser and approved by an executive officer of the International Filter company" and drops "at its office in Chicago," which the court treated as decisive: reading in a notice requirement would change both the place ("locus") and the time of the meeting of the minds (C&M 219–220). Add: "Legal qualification: the clause required approval by an executive officer at the company's office in Chicago; the court held that the contract formed there on approval and that requiring notice at Conroe would change the place and time of formation."
- C-3. Topic "Termination of the power of acceptance" (slide 8). Accurate to the slide. Add: "Legal qualification: under § 37, rejection or counter-offer, revocation, and the offeror's death or incapacity do not end the power under an option contract unless the requirements for discharging a contractual duty are met; the option's own time limit still ends it, and § 36(2) adds the non-occurrence of a condition of acceptance."
- C-4. Topic "White v. Corlies & Tift" (slide 12). The slide's "revised estimate (signed)" is shorthand. The casebook says the merchants changed their specifications and White assented "by signing the same" under his original estimate, and the court found no agreement before the September 29 note (C&M 222–223). Add: "Source note: White signed the merchants' revised specifications under his original estimate; the court treated the September 29 note as the offer and found no earlier agreement."
- C-5. Topic "Notifying acceptance by performance: Restatement § 54" (slides 7, 13). Accurate to § 54. No change.
- C-6. Topic "Carlill" (slides 14–15). Accurate to the slide. Cross-reference A-05: the casebook text answers the slide's revocation question through Bowen's statement that performance is sufficient acceptance without notification.

---

## Part D. Teaching gaps (assigned material no surface teaches)

1. **Purpose of home-office approval clauses** (C&M 221, Note 3; Restatement of Agency § 167 cited). Home: international-filter `learning.topics` (new key `authority`) or `notes-acceptance` notes. Draft: "A home-office approval clause lets a seller that uses traveling salespeople keep the final decision: changes a salesperson writes on the form do not bind the company until an officer approves, and the clause makes the buyer's signed order the offer (C&M 221, Note 3)."
2. **Late ("tardy") acceptances** (C&M 240, Note 1; § 70). Home: `lapse` notes. Draft: "An acceptance that arrives after the power has lapsed does not form the contract, but it may operate as a new offer to the original offeror; the offeror's silence accepts it only in the § 69 cases (§ 70)."
3. **Option exception to the mailbox rule absent from the mailbox entry** (§ 63(b) and cmt. f; slide 6 "except in the case of options"). Home: `mailbox` notes. K-12 node d already states it. Draft: "An acceptance under an option contract is operative only when the offeror receives it, and the option holder bears the risk of loss or delay in transmission (§ 63(b), cmt. f)."
4. **The offeree's knowledge of an unstated limit** (C&M 203, Note 1; § 24). Home: K-11 node c `detail` (append). Draft: "Ask also what the addressee knew: Note 1 asks whether Lefkowitz, told the week before that the store sold these bargains only to women, was justified in understanding the second advertisement as inviting his acceptance (§ 24)."
5. **Notice for an offer seeking a promise versus International Filter** (C&M 221, Note 4, citing §§ 54 and 56 and Kendel v. Pontious; C&M 227, "Can the International Filter ... cases be reconciled with this rule?"). The `problem-kendel` entry poses the question, but no surface states § 56's "contrary intention" exception, which is the black-letter answer. Home: `acceptance-notice` notes. Draft: "Section 56 makes notice essential to an acceptance by promise 'except ... where the offer manifests a contrary intention'; International Filter's order, by making approval at Chicago sufficient, manifested that intention."
6. **Rules-and-authorities links** (builder owned by another team; recorded, not edited). Verbatim entries exist for §§ 37, 40, 42, 46, 54, 56, 60, 61, 62, 63 and 69, but no Class 7 case or concept page links to them. International Filter, White, Lefkowitz and Wucherpfennig list only generated links (§§ 21, 24, 45, 59). The § 45 link on Lefkowitz and the § 21 links on all four cases have no basis in the assigned opinions or notes. Proposed links: International Filter → §§ 54, 56, 60 (C&M 221 cites §§ 54, 56; § 60 governs a prescribed place and manner); White → §§ 56, 62 (C&M 227); Wucherpfennig → § 61; `mailbox` → §§ 40, 42, 63; `silence` → § 69; `revocation` → §§ 42, 43, 46; `option-contract` → §§ 37, 63(b).

---

## Part E. Statements tested and found supported (one line)

Supported: Lefkowitz map summary, Material Facts, Procedural History, Issue, Holding (except A-08), brief rule, Holding, takeaway, Cold Call episodes 1–3 and 5, ≈ 3.0–3.2, timeline step and chronology step 140, K-11 nodes a, c, f, g; Wucherpfennig map summary, Parties, Material Facts, Procedural History, Issue, brief Holding and Reasoning, takeaway, Cold Call and all ≈ sentences, timeline step 6 (note and context), K-14 node h; International Filter map summary, Material Facts, Procedural History, Issue, Holding, brief rule, Holding and Reasoning, takeaway, Cold Call episodes 1–4 and 6, ≈ 0.1, 2.0, 3.0, 3.2 (both), 3.3, 4.2, 5.0, timeline step 2, chronology step 87, K-14 node g; White map Material Facts, Issue, Holding, Reasoning, brief Material Facts, Issue, Holding, Reasoning, takeaway, Cold Call episodes 1, 2, 4, 5, all ≈ sentences, timeline step 0, K-14 node c, K-13 node d (first and third sentences); concept entries offer, advertisements, note-leonard, acceptance, performance-preparation, formation-civil-rights, note-perry, problem-barfield, termination-offer, lapse, revocation, option-contract, death-offer, mailbox (except gap 3), mirror-image, rest45, note-bishop, note-hobbs, note-american-bronze, notes-silence, notes-termination, note-akers, note-loring, note-carr, note-hoover, note-adams, note-courtney, problem-kessler, problem-kendel, problem-overtaking, problem-awesome, problem-humble, ucc206, ever-tite-boundary, wilson-boundary; K-12 nodes a, c–i; K-13 nodes a–c, e–h; K-14 nodes a, d, g, h; acceptance timeline title, question, now, guide (prior-corrected texts); rules-and-authorities entries restatement-21, -24, -45, -59 (verbatim to `sel.txt`); lecture-note topics other than C-1 to C-4.
