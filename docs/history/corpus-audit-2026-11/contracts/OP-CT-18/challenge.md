# OP-CT-18 challenge review: Contracts Class 18, Unconscionability

Scope. This review tests the Atlas statements reproduced in `ct18-surfaces.md` against the assigned sources only: C&M printed pp. 679–706 (`ct18-casebook.txt`), supplement pp. 94–101 (`ct18-supp.txt`, the edited Anderson v. Binance opinion), and the statutory selections in `/home/claude/work/src/sel.txt` (UCC § 2-302 with Official Comments 1–3; Restatement (Second) § 208 with comments a–g; the Restatement of Consumer Contracts). The class slide deck is not on file, so the lecture-notes record could be checked only against the casebook, supplement and selections. Flowchart nodes and timeline steps not reproduced in the surfaces file were read, without editing, from `tools/flowcharts/data/contracts.json` (K-10, K-25) and `tools/r19/data/timelines.json` ('unconscionability', 'standard-terms'). Items in `prior-corrections.json` were not re-challenged; their corrected text was re-read (Part E). Quotations from C&M restore dropped OCR letters and change no words.

Severity key. "Result" means a student relying on the Atlas wording would reach a wrong legal answer on facts drawn from the assigned cases, notes or problems. "Wording" means the statement is imprecise but unlikely to change an answer.

---

## Part A. Challenged statements (result-changing items first)

### A-01. Flowchart K-25, Anderson's retroactivity ground has no route (node a → b → e → i)

- File and location: `tools/flowcharts/data/contracts.json`, chart K-25, node `i` (`detail`); related node `a` (`detail`).
- Current text (node i detail): "Adhesion or disparity alone does not establish the required unfairness. Apply the incorporated term within its scope."
- Verdict: **CHANGES RESULT** (result).
- Facts entered. Anderson's alternative holding: assume Binance's posting of the February 20, 2019 terms did give constructive notice, so the arbitration clause entered the users' contract; the user's securities claim accrued before February 20, 2019; no showing that the clause itself is oppressive.
- Path the chart takes. a ("Did the disputed standard term enter the deal?") → edge "Incorporated" → b ("What objection applies to the incorporated term?") → the only plausible edge, "Unfair formation and substance" → e → edge "Unfairness not established" → i ("Standard term survives the challenged defense").
- Result displayed. The arbitration clause governs the claim.
- Source-supported result. "[E]ven if Plaintiffs did have constructive notice, the Court finds that the 2019 Terms of Use do not apply retroactively to claims that accrued prior to the effective date." Under California law, "[a] unilateral modification provision that is silent as to whether contract changes apply to claims, accrued or known, is impliedly restricted by the covenant so that changes do not apply to such claims." Arbitration is denied. K-25 cites Anderson only for notice at node a, and no node asks whether a later amendment reaches an earlier claim. (K-10 node f does ask; see A-08.)
- Pinpoint: supp. pp. 99–100 (Part c, "The Retroactivity of the 2019 Terms of Use").
- Replacement (node i detail): "Adhesion or disparity alone does not establish the required unfairness. Apply the incorporated term within its scope; under California law (Anderson), a unilateral amendment silent about timing does not reach claims that accrued or were known before it took effect."

### A-02. Williams Cold Call plain-English sentences at 1.0 and 1.1 define unconscionability as gross unfairness alone

- Surface and field: williams-walker-thomas, **Cold Call plain-English sentences**, `at` 1.1 (`plain`); same defect at `at` 1.0 (`plain`). Related glosses in the Stoll **Cold Call plain-English sentences**, `at` 1.1 (both entries).
- Current text (1.1): "held that courts could refuse to enforce a contract that was unconscionable, grossly unfair, at the time it was made."
- Current text (1.0): "meaning that a contract is grossly unfair"
- Current text (Stoll 1.1): "the clause was unconscionable (grossly unfair)"; "so unfair it could not be enforced"
- Verdict: **MISSING CONDITION** (result).
- Counterexample. The 1.1 gloss is the plain-English version of Williams's holding. It tells the student that a court may refuse enforcement of any contract that was "grossly unfair" when made. The majority's own description adds a second element: unconscionability "include[s] an absence of meaningful choice on the part of one of the parties together with contract terms which are unreasonably favorable to the other party," and the Corbin fairness test is stated for "those cases where no meaningful choice was exercised upon entering the contract." UCC § 2-302 Comment 1 rejects "disturbance of allocation of risks because of superior bargaining power," and Restatement § 208 comment c says "[i]nadequacy of consideration does not of itself invalidate a bargain." Take the Nez Perce problem (C&M p. 699): land ceded at $2.97 per acre against a found $4 market value. A student using the gloss would ask only whether the price was grossly unfair, and would not ask about the bargaining process.
- Pinpoint: C&M pp. 685–686; C&M p. 679 (§ 2-302 Comment 1); `sel.txt` § 208 comment c.
- Replacement (1.1 plain): "On August 11, 1965, Judge J. Skelly Wright, joined by Chief Judge Bazelon (who signed his opinion), held that courts could refuse to enforce a contract that was unconscionable at the time it was made. The opinion then described unconscionability as a lack of meaningful choice for one party together with terms unreasonably favorable to the other party."
- Replacement (1.0 plain, the quoted phrase only): "meaning that a bargain was so unfairly made and so one-sided that a court should not enforce it"
- Replacement (Stoll 1.1, first entry, the quoted phrase only): "the clause was unconscionable (unfairly obtained and unfairly one-sided)". Second entry: "The trial court held the poultry-litter paragraph \"unconscionable\" and therefore unenforceable."

### A-03. Stoll rule line (also Chronology 'course-chronology-0' step 578) states Oklahoma's test as general law

- Surface and field: stoll, **Effective brief CT-NEXT-CM-0104: rule**; identical text in **Chronology 'course-chronology-0' step 578** (`note`).
- Current text: "A contract term is unconscionable and unenforceable when, judged at formation, an absence of meaningful choice combines with terms so one-sided that they oppress or unfairly surprise a party; the question is one of law for the court."
- Verdict: **MISSING CONDITION** (result).
- Counterexample. The test is quoted from Barnes v. Helfenbein, an Oklahoma Supreme Court decision. The Oklahoma Code Comment to § 2-302 supplies the "question of law" point. Other assigned sources state the relation between the two elements differently. Restatement § 208 comment c says that "[t]heoretically it is possible for a contract to be oppressive taken as a whole, even though there is no weakness in the bargaining process." The Restatement of Consumer Contracts § 5(b), as printed in the 2019 draft, adopts a sliding scale ("a greater degree of one of the elements … means that a lesser degree of the other element is sufficient"). Its comment 2 adds that "in appropriate circumstances a high degree of substantive unconscionability is sufficient." Suppose a student meets a consumer clause that is extremely one-sided but has only modest procedural defects. The student applies the Atlas sentence as general law and requires both elements in full.
- Pinpoint: C&M p. 696 (Barnes quotation; Phillips Machinery; Oklahoma Code Comment); `sel.txt` § 208 comment c; `sel.txt` Restatement of Consumer Contracts § 5(b) and comment 2.
- Replacement (42 words): "Under Oklahoma law, a contract term is unconscionable and unenforceable when, judged at formation, an absence of meaningful choice combines with terms so one-sided that they oppress or unfairly surprise a party; the question is one of law for the court."

### A-04. Anderson rule line (also Chronology 'course-chronology-0' step 626) states California's retroactivity rule as general law

- Surface and field: anderson-binance, **Effective brief CT-SUP-0094: rule**; identical text in **Chronology 'course-chronology-0' step 626** (`note`).
- Current text: "a unilateral modification clause silent about accrued claims does not reach claims that accrued before the amendment"
- Verdict: **MISSING CONDITION** (result).
- Counterexample. The court took the retroactivity limit from California law: "As the Peleg Court reasoned, under California law, '[a] unilateral modification provision that is silent … is impliedly restricted by the covenant.'" The court found California, Nevada and Texas law "substantively similar with respect to contract formation," but it made no comparable finding on the implied-covenant limit. The source rule also covers claims that are "accrued or known." A student who states the Atlas sentence as general contract law overstates its source. The student also misses Peleg's contrast: in Peleg, a clause that expressly let the employer change terms for known or accrued but unfiled claims made the arbitration contract illusory.
- Pinpoint: supp. pp. 97 (substantive similarity on formation), 99–100 (Peleg; "under California law").
- Replacement (44 words): "Under ordinary state contract-formation principles, an online amendment adding an arbitration clause binds existing users only with actual or constructive notice, and under California law a unilateral modification clause silent about accrued or known claims does not reach claims that accrued before the amendment."

### A-05. Anderson Map entry: sections.Reasoning (paragraph 2) omits California

- Surface and field: anderson-binance, **Map entry: sections.Reasoning**, second paragraph.
- Current text: "It read the latter in light of the implied covenant of good faith and fair dealing, restricting changes from reaching accrued or known claims."
- Verdict: **MISSING CONDITION** (wording; same source point as A-04).
- Pinpoint: supp. pp. 99–100.
- Replacement: "It read the latter in light of California's implied covenant of good faith and fair dealing, restricting changes from reaching accrued or known claims."

### A-06. Anderson Cold Call plain-English sentence at 5.0 ("take them away")

- Surface and field: anderson-binance, **Cold Call plain-English sentences**, `at` 5.0 (second entry, the covenant sentence), `plain`.
- Current text: "it could not be used to take them away."
- Verdict: **OVERSTATED** (result).
- Counterexample. The 2019 amendment did not extinguish any claim. It would have sent claims to SIAC arbitration in Singapore, and "[j]udgment on any arbitral award may be entered in any court." A student told that the amendment would "take [claims] away" will treat an arbitration clause as a release or waiver of the claim. Arbitration changes the forum, not the claim. The Atlas itself elsewhere calls the ruling a "forum ruling."
- Pinpoint: supp. pp. 95 (arbitration rules and entry of judgment), 100.
- Replacement (`plain`): "California's \"implied covenant of good faith and fair dealing\", a duty of fairness read into every contract, limited Binance's \"unilateral\" (one-sided) power to amend. Because the amendment said nothing about known or \"accrued\" (already existing) claims, it could not be used to send those claims to arbitration."

### A-07. Stoll takeaway and timeline step 4 call the litter clause "hidden"

- Surface and field: stoll, **Takeaway (tools/r19/data/takeaways.json)**; stoll, **Timeline 'unconscionability' step 4** (`note`).
- Current text (takeaway): "A hidden clause that forced land buyers who could not read English to supply chicken litter worth far more than the land price was unconscionable."
- Current text (timeline): "a hidden, one-sided litter clause the buyers could not understand is unconscionable as a matter of law."
- Verdict: **UNSUPPORTED BY ASSIGNED SOURCES** (result).
- Counterexample. Paragraph 10 was a numbered paragraph of the land contract. Stoll's account, as the court recites it, was that the buyers had a preliminary version with the same paragraph about two months earlier and "had time to have the disputed terms explained." The court does not call the clause hidden, buried or in fine print. Its procedural ground was that the buyers, "due to language and education, [were] unable to understand the nature of the contract." Its substantive ground was that "the consideration actually to be paid under the contract far exceeds that stated." Zapatha, on the next pages, marks the hidden-term route as a separate one: it says a clause "neither obscurely worded, nor buried in fine print" and contrasts Williams. A student who learns Stoll as a hidden-clause case will answer Stoll's argument (the clause was visible and the buyers could have had it translated) on the wrong ground. That student may concede the point, when the court's ground was that the buyers could not understand the clause. The brief's phrase "extreme hidden burden" refers to the concealed economic cost and is supported.
- Pinpoint: C&M pp. 693 (preliminary version), 694–695 (paragraph 10), 697 ("far exceeds that stated"; "due to language and education"); C&M p. 702 (Zapatha).
- Replacement (takeaway, 2 sentences, 46 words): "A thirty-year chicken-litter clause that land buyers with little English literacy or schooling could not understand, and that would have given the seller estimated value exceeding the land price, was unconscionable under Oklahoma law. Inability to understand plus an extremely one-sided burden defeated the seller's enforcement claim."
- Replacement (timeline note): "Oklahoma applies the two-part test: a one-sided litter clause that buyers with limited English and schooling could not understand is unconscionable as a matter of law."

### A-08. Flowchart K-10 node h mislabels Anderson's alternative ground

- File and location: `tools/flowcharts/data/contracts.json`, chart K-10, node `h` (`label`, `detail`), reached from node f by the edge "Inadequate notice or revision cannot reach dispute".
- Current text (label): "Disputed term did not enter on this route"
- Verdict: **MISSTATES HOLDING** (wording; the disposition is right, the reason is wrong).
- Facts entered. Same as A-01: assume constructive notice of the 2019 terms; the claim accrued before February 20, 2019.
- Path. a → "Later website revision" → f → "Inadequate notice or revision cannot reach dispute" → h.
- Result displayed. The term "did not enter," because an act such as "continuing use does not necessarily assent to the disputed term."
- Source-supported result. On the retroactivity ground the court assumed that the term entered and held that it did not reach claims accrued before its effective date. The reason matters: on this ground the same accepted term could govern claims accruing after the effective date. (The plaintiffs dismissed those claims, so the court did not decide them.)
- Pinpoint: supp. pp. 99–100.
- Replacement. Label: "Disputed term does not govern this dispute on this route". Add to detail: "A revision may also bind yet not reach the dispute: in Anderson, even assuming notice, the silent 2019 amendment did not reach claims accrued before February 20, 2019 (California law)."

### A-09. Lecture notes record, topic heading "Anderson separates amendment, temporal scope, and fairness"

- Surface and field: **Lecture notes record**, topics[5] `heading`.
- Current text: "Anderson separates amendment, temporal scope, and fairness"
- Verdict: **OVERSTATED** (result, if read as an unconscionability holding).
- Counterexample. The lecture sits in the unconscionability class, and the heading lists "fairness" as one of Anderson's grounds. The assigned excerpt decides formation (notice) and temporal scope (the implied covenant). It contains no unconscionability or fairness ruling. The body sentence describes the third question as interpretation: "whether the heading actually waived class proceedings." The Atlas brief says the court resolved that question by reading ambiguity against the drafter. A student citing Anderson for an unconscionability holding would misstate the case. The slides are not on file, so the heading may reflect slide wording.
- Pinpoint: supp. pp. 96–100.
- Replacement: "Anderson separates amendment, temporal scope, and the meaning of the waiver heading"

### A-10. Williams Map entry: notes misdescribes the editors' alternative allocation

- Surface and field: williams-walker-thomas, **Map entry: notes**, first sentence.
- Current text: "The editors discuss how allocating payments to the earliest purchases would have allowed ownership of many items to clear."
- Verdict: **UNSUPPORTED BY ASSIGNED SOURCES** (wording; it bears on Note 1's interpretation question).
- Counterexample. The editors do not propose first-in, first-out allocation. They write: "another way to apportion a payment is in relation to the original debt for each item. If the store had applied Mrs. Williams's payments that way, she would evidently have paid in full for about a dozen of the 16 items." They then ask whether the store "[c]ould … have been compelled to reallocate her payments in that manner, as a plausible reading of the contract." The Atlas changes the method and drops the question of interpretation.
- Pinpoint: C&M p. 687, Note 1.
- Replacement (first sentence): "The editors note that apportioning each payment in relation to the original debt for each item would evidently have paid off about a dozen of Williams's 16 items, and ask whether the contract could plausibly be read to require that."

### A-11. Williams Map entry: sections.Reasoning (last sentence) and plain-English 4.0 recast the remand as a fact determination

- Surface and field: williams-walker-thomas, **Map entry: sections.Reasoning**, second paragraph, last sentence; **Cold Call plain-English sentences** `at` 4.0 (`plain`).
- Current text (map): "Because the lower courts believed they could not undertake that inquiry at all, the appellate court could not substitute a final factual determination for them."
- Current text (plain): "meaning without facts found first"
- Verdict: **MISSING CONDITION** (result on the judge-or-jury question).
- Counterexample. The court remanded because "the record is not sufficient for our deciding the issue as a matter of law." The editors stress that "under UCC § 2-302 the issue of unconscionability is not to be submitted to a jury." Comment 3 to § 2-302 says the commercial evidence "is for the court's consideration, not the jury's." Restatement § 208 comment f says the court makes the determination and any incidental findings. If a student is told the remand awaits a "final factual determination," the student may answer that a jury decides unconscionability on remand.
- Pinpoint: C&M p. 686 (remand); C&M p. 681 (jury note); `sel.txt` § 2-302 Comment 3; § 208 comment f.
- Replacement (map): "Because the lower courts had made no findings and the record was not sufficient to decide the issue as a matter of law, the court remanded to the trial court for further proceedings."
- Replacement (plain, the quoted phrase only): "meaning by the appeals court itself on the existing record, without further findings by the trial court"

### A-12. Williams rule line, brief Holding and Chronology step 169 turn a description into a definition

- Surface and field: williams-walker-thomas, **Effective brief CT-NEXT-CM-0103: rule** and **Chronology 'course-chronology-0' step 169** (identical); **Effective brief CT-NEXT-CM-0103: Holding**, second sentence.
- Current text (rule): "meaning that one party lacked meaningful choice and the terms unreasonably favored the other party"
- Current text (Holding): "Unconscionability is the absence of meaningful choice together with terms unreasonably favorable to the other party."
- Verdict: **OVERSTATED** (wording).
- Counterexample. The holding sentence is "where the element of unconscionability is present at the time a contract is made, the contract should not be enforced." The next sentence describes the doctrine as one that "has generally been recognized to include" both elements; it does not offer a closed definition. Restatement § 208 comment c treats overall imbalance without a procedural defect as theoretically possible, and Eisenberg (C&M p. 682) calls the procedural/substantive split "too rigid." The Atlas wording makes "both elements required" a holding of Williams.
- Pinpoint: C&M pp. 685, 682; `sel.txt` § 208 comment c.
- Replacement (rule, 35 words): "A court may refuse to enforce a contract that was unconscionable when made; unconscionability has generally been recognized to include one party's absence of meaningful choice together with terms unreasonably favorable to the other party."
- Replacement (Holding, second sentence): "The court said unconscionability has generally been recognized to include the absence of meaningful choice together with terms unreasonably favorable to the other party."

### A-13. Anderson takeaway exceeds the two-sentence limit and says "adequate" where the ground was constructive notice

- Surface and field: anderson-binance, **Takeaway (tools/r19/data/takeaways.json)**.
- Current text: "The district court rejected arbitration of the remaining pre-amendment claims: posting alone had not supplied adequate notice, and the amendment did not reach accrued claims. All five plaintiffs later acquired actual notice through the litigation. The decision did not resolve the later claims they had dismissed."
- Verdict: **MISSING CONDITION** (wording), and the takeaway has three sentences against a two-sentence limit.
- Counterexample. The court found that the plaintiffs had actual notice by June 8, 2020, and yet still denied arbitration. The notice holding is limited to constructive notice. The retroactivity ground, which defeats arbitration even assuming notice, rests on California's implied covenant. The current text leaves the student unable to explain why actual notice did not help Binance.
- Pinpoint: supp. pp. 98–100 (including the bracketed note on actual notice).
- Replacement (2 sentences, 49 words): "The court refused to compel arbitration of the pre-amendment claims: posting the 2019 terms gave no constructive notice, and, even assuming notice, California's implied covenant kept the silent amendment from reaching accrued claims. The plaintiffs' later actual notice through the litigation did not change that result for those claims."

### A-14. Anderson Cold Call plain-English sentence at 5.0 (Peleg entry)

- Surface and field: anderson-binance, **Cold Call plain-English sentences**, `at` 5.0 (third entry), `plain`.
- Current text: "Carter distinguished Peleg, where a clause that expressly let a company change terms for \"accrued\" claims made the promise \"illusory\" (meaningless). Binance's clause was silent, so the \"covenant\" of good faith simply limited it"
- Verdict: **MISSTATES HOLDING** (wording).
- Counterexample. Carter did not set Peleg aside. He applied Peleg's own second holding, that a silent clause is "not illusory" but "restricted based on the implied covenant." A student who reads "distinguished Peleg" will think the silent-clause rule is Carter's creation and that Peleg cuts against the plaintiffs.
- Pinpoint: supp. pp. 99–100.
- Replacement (`plain`): "Carter relied on Peleg. Peleg held that a clause expressly letting an employer change terms for known or \"accrued\" claims made the arbitration promise \"illusory\" (not really binding), and that a clause silent on the point is instead limited by the \"covenant\" of good faith. Binance's clause was silent, so the covenant limited it, and he did not declare Binance's whole contract illusory."

### A-15. Williams Cold Call episode-2/plain-English 2.0 change "and hence" to "or"

- Surface and field: williams-walker-thomas, **Cold Call** episode-3 paragraph 1; the same sentence in **Cold Call plain-English sentences** `at` 2.0 (second entry), `sentence` and `plain`.
- Current text: "little bargaining power or real choice"
- Verdict: **MISSING CONDITION** (wording).
- Counterexample. The court wrote "a party of little bargaining power, and hence little real choice, signs a commercially unreasonable contract with little or no knowledge of its terms." "Or" lets either weak bargaining power or limited choice satisfy the condition; the court treated limited choice as the consequence of weak bargaining power.
- Pinpoint: C&M p. 686.
- Replacement (each occurrence): "little bargaining power, and hence little real choice,"

### A-16. Stoll Cold Call episode-1 says Stoll had not executed the preliminary version

- Surface and field: stoll, **Cold Call** episode-1, paragraph 3.
- Current text: "He had not executed that preliminary version."
- Verdict: **UNSUPPORTED BY ASSIGNED SOURCES** (wording).
- Counterexample. The casebook's edited text says the buyers "signed a 'preliminary' version of the contract which [they] did not execute." The assigned source does not say that Stoll failed to execute it.
- Pinpoint: C&M p. 693.
- Replacement: "That preliminary version was not executed."

### A-17. Minor statements (no change to the legal result)

- Williams **Map entry: sections.Material Facts**: "The seller knew that she supported herself and seven children" is the D.C. Court of Appeals' account, quoted by the circuit court. The circuit court made no findings, and Danaher notes the lower court "made no finding that there had actually been sharp practice" (C&M pp. 684, 687). Replacement: "The local appellate court stated that the seller knew she supported herself and seven children on a $218 monthly government stipend." The brief already attributes the point correctly.
- Williams **Cold Call** episode-1 paragraph 3: "without themselves establishing the appellate court's final conclusion about fairness" implies that the court reached a final conclusion, which it did not (C&M p. 686). Replacement: "These circumstances bore on the clause's effect, but the appellate court reached no final conclusion about fairness."
- Stoll **Cold Call** episode-3 paragraph 2 ("His testimony supplied about twenty tons per house per de-caking, five flocks yearly in six houses") and brief **Reasoning** paragraph 2: the five flocks in six houses came from Xiong's testimony, not Stoll's (C&M p. 697). Replacement: "His testimony supplied about twenty tons per house per de-caking and a pre-2008 value up to $12 per ton; Xiong testified to five flocks yearly in six houses."
- **Rules & authorities entry ucc-2-209** is attached to anderson-binance, and **restatement-21** to all three cases. Verdict: **WRONG CITATION** (linkage). Anderson concerned online service terms, not a sale of goods, and the court applied state formation law and California's implied covenant; § 2-209 played no part. A student could cite § 2-209(1) ("needs no consideration to be binding") to argue that Binance's amendment bound users. § 21 plays no part in any of the three cases. Recommendation: detach both, or label them "compare." Both entries match the `sel.txt` black letter verbatim.

---

## Part B. Statements resting on material not in the assigned excerpt (not marked wrong)

- Anderson class-waiver ruling: Map notes ("besides denying arbitration, the court held that the 2019 Terms' class-action language …"); brief Issue, Holding (second sentence), Reasoning paragraph 4; Cold Call episodes 7–8; plain 6.0, 6.1, 6.2, 7.1; lecture-notes body ("The assigned 2026 order rejected arbitration and the purported waiver"). The supplement prints the warning and states that no provision details a waiver (supp. p. 96). The ruling itself falls in an omitted portion; the excerpt ends Part c with "DENIES Defendants' motion to compel arbitration."
- Anderson procedure after November 2024 (the March 28, 2025 opinion, vacatur on April 16, supplemental briefing, November argument, the November 25 stipulation, ECF No. 164): brief Procedural History; Cold Call episode 3 and plain 2.1, 2.2, 7.0; Cold Call limits.
- Anderson's actual-notice reasoning (Williams knew from the April 3 complaint; the other four knew from the June 8 lead-plaintiff motion): brief Holding and Cold Call episode-5. The excerpt gives only the editors' bracketed summary (actual notice "by June 8, 2020") and the footnote 3 dates. The Map notes say the omitted analysis "is identified as omitted rather than reconstructed," but the brief and Cold Call do reconstruct it. Those surfaces should either mark the reasoning as taken from the full opinion or drop it.
- Anderson: delegation of arbitrability (episode-4), Maldini, releases and indemnities, sealing and redaction (episodes 7–8).
- Stoll: de novo review with inferences favoring Stoll, the September 17, 2010 date, the panel (Buettner, Hansen), "no material factual dispute required trial," and the opinion's caution about the companion-case accounts (brief Procedural History and Holding; Cold Call episodes 2–4; plain 2.0).
- Williams: Chief Judge Bazelon's joinder and the August 11, 1965 date.
- Lecture notes: "Davis considers several replacement rules"; the EU directive; the slide 11 and slide 13 conflicts. None of these is in the assigned pages.
- Timeline 'unconscionability', Armendariz step ("sliding scale"): the C&M excerpt (p. 703) does not use that term, and it prints the citation year as 2004. Samaniego step ("several one-sided terms can defeat the whole agreement"): the excerpt says only that the arbitration clause was held "unconscionable and unenforceable under Armendariz" and that Concepcion "does not change our analysis" (C&M pp. 704–705).

---

## Part C. Statements checked and found supported (one line)

Williams: map title, summary, Parties, Material Facts (other than A-17), Procedural History, Issue, Holding, Reasoning paragraph 1 and paragraph 2 sentences 1–3; learning topics; brief Parties, Procedural History, Material Facts, Issue, Holding first and third sentences, Reasoning (all paragraphs, including the attribution of the dissent and of footnote 10); takeaway; Cold Call lead, actors, proceedings, limits, and episodes 1–2, 3 paragraph 2, 4 and 5; plain 0.0 (three entries), 0.1, 1.0 second entry, 1.2, 2.0 first entry, 2.1; timeline step 1; K-25 nodes e and f (path a→b→e→"Record incomplete"→f is correct on Williams's facts). Stoll: map title, summary, notes, Parties, Material Facts, Procedural History, Issue, Holding, Reasoning; learning topics; brief Parties, Procedural History, Material Facts, Issue, Holding (including "extreme hidden burden" as a reference to the concealed price), Reasoning (except the attribution in A-17); Cold Call lead, actors, proceedings, limits, and episodes 2–4; plain 1.1 (pleaded defenses), 2.0 (three entries); K-25 path a→b→e→"Required unfairness shown"→g with g's clause-level remedy. Anderson: map title, summary, Parties, Material Facts, Procedural History (through the third amended complaint), Issue, Holding, Reasoning paragraph 1; learning topics; brief Parties, Material Facts, Holding (choice-of-law, constructive-notice and alternative retroactivity holdings), Reasoning paragraphs 1–3 (including the FAA "creature of contract" framing, which neither overstates nor understates the excerpt); Cold Call episodes 1, 2, 4 (other than delegation), 5 paragraphs 1–2, 6; plain 0.1, 4.0, 5.0 first entry; timeline 'standard-terms' step 7; K-10 node f; K-25 nodes a and h (path a→"No adequate notice or assent"→h is correct on Anderson's notice ground). Shared surfaces: rules-and-authorities entries ucc-2-302, restatement-208, restatement-21 and ucc-2-209 (verbatim black letter); timeline 'unconscionability' summary fields and the ucc2302, graham and cp-concepcion steps; lecture-notes topics 1–4, except the Davis sentence; lecture-notes conflict 1, as far as it states § 2-302 and § 208. Every unconscionability surface measures unconscionability at formation, none sends the question to a jury, none limits the remedy to voiding the whole contract, and none states Danaher's dissent as the holding.

---

## Part D. Teaching gaps in the assigned materials, with proposed placement

- D-1. Terms of art and the relation between the two elements. K-25 node e uses "procedural" and "substantive" without defining them and gives no source for the different tests. The casebook identifies the distinction as Professor Leff's 1967 label (C&M p. 681), and Eisenberg calls it "too rigid" (p. 682). Proposed addition to K-25 node e `detail`: "Procedural unconscionability (Professor Leff's 1967 label, now standard vocabulary) means unfairness in the bargaining process; substantive unconscionability means unfairness in the terms. Williams and Stoll looked for both; Restatement § 208 comment c treats overall imbalance alone as theoretically possible, and the Restatement of Consumer Contracts uses a sliding scale."
- D-2. Judge, not jury, and the § 2-302(2) hearing. Node f (Williams remand) has no outgoing edge and does not say who decides. Proposed addition to K-25 node f `detail`: "The court, not a jury, decides, after giving the parties a reasonable opportunity to present evidence of the contract's commercial setting, purpose and effect (UCC § 2-302(2) and Comment 3; Restatement § 208 comment f)." Sources: C&M p. 681; `sel.txt`.
- D-3. Sophisticated commercial parties. C&M pp. 700–702 (Continental Airlines, U.S. Welding, Zapatha, contrasted with Gianni Sport and Shell v. Marinello) show that courts rarely find unconscionability between parties of comparable strength. K-25 has no route for this. Proposed addition to K-25 node i `detail`: "Courts seldom find unconscionability between sophisticated parties to negotiated contracts; in Zapatha a plainly worded termination clause, pointed out before signing and paired with a promise to repurchase saleable inventory, was neither surprising nor oppressive."
- D-4. Remedy limits beyond voiding the contract. Node g lists refusal, severance and limitation but not the non-penal principle. Proposed addition to K-25 node g `detail`: "Limiting a clause can mean reducing recovery: Frostifresh limited the seller to net cost, a reasonable profit and necessary charges, and Restatement § 208 comment g says the policy is not penal." Sources: C&M p. 689 Note 4; `sel.txt` § 208 comment g.
- D-5. Interpretation as an alternative to unconscionability. UCC § 2-302 Comment 1 (C&M p. 679) and Williams Note 1 (reallocation "as a plausible reading of the contract," C&M p. 687) present adverse construction as an older route. K-25 node b could add an edge "Ambiguous term read against the drafter." The Atlas brief describes Anderson's class-waiver ruling as such a reading, but that ruling is not in the assigned excerpt.

---

## Part E. Prior corrections and numbering

- Prior corrections re-read: the 'standard-terms' and 'unconscionability' title, question, guide and now fields; all effect fields; the hill-gateway, klocek, cp-concepcion and anderson-binance notes and contexts; and the williams-walker-thomas note, context and reviewSources. All are accurate against the assigned sources. The defect in A-07 is in the Stoll `note`, which the corrections did not touch.
- Numbering. The assignment and the surfaces header cite "Restatement of Consumer Contracts § 6." The selections print the 2019 Tentative Draft, in which unconscionability is § 5 and § 6 is "Deception." The assigned § 6 presumably follows the 2024 Official Text numbering. This is recorded as a numbering mismatch, not an error. The statements in A-03 and D-1 rely on § 5(b) and comment 2 as printed in the draft.
