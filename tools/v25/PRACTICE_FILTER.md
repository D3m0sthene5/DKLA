# DKLA v2.5 practice visibility audit

Reviewed October 11, 2026. The structural scan covers all 1,079 effective nodes and 2,746 graph edges, including the 35 generated rule links. All 44 Hypothetical records were read with complete summary, notes, sources and incident relationships. This hides 27 floating or prompt-only exercises (23 Contracts, four LRS) and retains 17 developed examples/comparisons (ten Contracts, seven LRS). All 392 cases, rules, doctrines and ordinary/source notes are preserved.

The 23 Contracts exclusions have nonzero raw degree: their edges are assignment navigation, imperative tasks, or copied facts. They have no developed application or substantive comparison in the reviewed node/edge context. The four LRS exclusions have zero degree. A zero degree alone is not grounds for removing a meaningful source, schedule, rule or legal account. The JSON records the contextual reasons and both degrees; these are editorial judgments, not a legal-currentness certificate.

## Excluded records

| ID | Raw / meaningful degree | Assigned page | Reason |
| --- | --- | --- | --- |
| problem-interests | 5 / 0 | 18–19 | An unanswered numerical damages exercise. Links repeat instructions to identify baselines or copy its factual summary; no worked result or explained application is supplied. |
| problem-opportunity | 5 / 0 | 19–21 | An unanswered set of investment and recovery variants. Links tell the reader to avoid duplication or trace an opportunity; they do not explain a resolved doctrinal comparison. |
| problem-retirement-discount | 4 / 0 | 60–61 | Open consideration questions about a retirement benefit. Its general topic/assignment links supply no result or explained comparison with a mapped authority. |
| problem-prentis | 4 / 0 | 73–74 | Open questions about the timing of a gift and naming assurance. Links repeat the timing/donation prompts or copy facts without supplying a developed application. |
| problem-unexpected-heir | 4 / 0 | 101–102 | Open questions about retained testamentary discretion. Links identify a return promise or discretion but do not explain a resolved legal relation. |
| problem-toast | 3 / 0 | 112–113 | Open output/shutdown questions. Links ask the reader to test good faith or identify evasion; the named outside case is not itself a mapped comparison here. |
| problem-dementas | 5 / 0 | 120 | Open writing/past-consideration questions. Topic edges merely request a test of form or prior conduct; no worked analysis or distinct connected case account is supplied. |
| problem-nephew-shop | 3 / 0 | 128–129 | Unanswered remedy calculation under two section 90 formulations. Links direct comparison and separation of amounts without stating the result or explanatory distinction. |
| problem-reliance-measures | 3 / 0 | 130 | A list of unanswered comparisons across gift/pension examples. Links request separation or recognition of measures without identifying actual case outcomes. |
| problem-ypsilanti | 3 / 0 | 137–138 | A factual prompt asking each side to argue promise and reliance. The develops edge copies its facts; the other legal edge only says to identify elements. |
| problem-social | 3 / 0 | 186–187 | Open social-promise/context questions. Links say to evaluate context or distinguish expense from justified reliance without a developed application. |
| problem-mint | 3 / 0 | 204–205 | An unanswered coin-order scenario. Links only request identifying the offeror and interpreting limits; no mapped case comparison or result is supplied. |
| problem-foley | 3 / 0 | 213 | An unanswered auction/mistake scenario. Links request identifying a mechanism or reading manifestations; the outside yacht citation is not a developed mapped comparison. |
| problem-kendel | 3 / 0 | 220–221 | An unanswered private-signature/notice scenario. The White comparison link only asks the reader to compare uncommunicated conduct; the prose leaves acceptance unresolved. |
| problem-awesome | 3 / 0 | 221–222 | An unanswered electronic quantity exchange. Both doctrinal links repeat interpretive tasks and the prose supplies no resolved application. |
| problem-steinberg | 3 / 0 | 229 | An unanswered fee/admissions scenario. Links ask the reader to identify the undertaking and acceptance; they do not supply the doctrinal consequence. |
| problem-newman | 3 / 0 | 240 | An unanswered reward/rebroadcast scenario. Links request identifying a period or offer without resolving the relation or supplying a mapped case comparison. |
| problem-yaro | 3 / 0 | 240 | An unanswered settlement-countdown scenario. Both topic links restate tasks about lapse and withdrawal rather than explain a legal application. |
| problem-hedging | 3 / 0 | 246 | An unanswered erroneous-report/option scenario. Its links only request evaluating indirect communication and testing hold-open protection. |
| problem-maine | 4 / 0 | 252 | An unanswered farm/care scenario with language and death variants. All legal links ask the reader to identify or distinguish options rather than explain a resolved relation. |
| problem-funeral | 2 / 0 | 259 | The imported prompt expressly lacks its continuation on unassigned page 260. Its sole topic link identifies the timing question without an answer. |
| problem-humble | 3 / 0 | 261 | An unanswered option/amendment variant. Links request characterizing rejection and conditional response; no distinct explained case relationship is supplied. |
| problem-sof-categories | 3 / 0 | 378–379 | A collection of unanswered jurisdiction-dependent writing problems. Links instruct the reader to identify text and duration without resolving the exact variants. |
| lrs-n-problem-safety-discretion | 0 / 0 | lrs-november-a PDF 35–36 (printed 609–610) | An unresolved safety-policy exercise with zero graph edges and no node topic links. |
| lrs-n-problem-guidance-binding | 0 / 0 | lrs-november-a PDF 61–62 (printed 636–637) | An unresolved binding-guidance exercise with zero graph edges and no node topic links. |
| lrs-n-problem-review-history | 0 / 0 | lrs-november-a PDF 147 (printed 927) | An unresolved historical evidentiary-review exercise with zero graph edges and no node topic links. |
| lrs-i-express-regulatory-problem | 0 / 0 | lrs-november-b PDF 58 (printed 1002) | An expressly unresolved delegated-regulatory-interpretation hypothetical with zero graph edges and no node topic links. |

## Retained and unresolved records

The retained examples include Hayes/Feinberg’s induced-retirement distinction, Barnes’s separate promise theory, the section 1981 formation question, the bridge/preparation distinction, the overtaking-message estoppel issue, the section 2-207(3) conduct route, Hill/Klocek’s actual split, Raila’s judicial illustrations, and developed LRS statutory/procedural comparisons. Retention reasons and exact connected edge IDs are in `practice-filter.json`.

The scan found 45 zero-degree records before filtering; four are the excluded exercises. The other 41 remain because they are substantive source accounts, available-source references, schedules or source-status records. Five missing-source records and the classroom/Brightspace stub are reported explicitly in the JSON. This pass does not fill missing sources or invent relationships.

## Reversible runtime behavior

`practice-filter.js` moves the 27 full node records and 78 incident edges into `data.practiceArchive`, then omits them from map/search/connection graph arrays. The archive retains owner notes and alternate versions if a late legacy import supplies conflicting text. Master JSON and portable HTML keep it. `window.DKLAPracticeFilter.archived(id)` retrieves an archived record for recovery. A record repurposed into another kind, including a real Case, is outside the exclusion scope and is retained. Original textbook archives and legal source text are untouched.

The filter reapplies during normalization, indexing, saving and searching, so old caches, imports and undo snapshots do not resurrect the excluded prompts. Geometry remains the separate geography module’s responsibility.

```text
python tools/v25/check_practice_filter.py
node tools/v25/practice_filter_check.cjs
```

The Python check verifies reviewed-record/source drift, relationship coverage and preserved cases. The JavaScript check exercises actual filtering, idempotence, old-cache imports, late links, owner-note/version preservation, export/reload, repurposed-case protection and unchanged geometry. Neither check verifies legal truth. Original textbook pages were not freshly reread for every exercise in this visibility audit.
