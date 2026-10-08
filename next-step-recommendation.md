**Recommendation**

**1. The recommendation**

Build an exam practice bank inside the existing Study dialog. It has worked answers to the 44 casebook problems, a short fact pattern with a model answer for each class, multiple-choice questions where the exam uses them, and a missed issue marks the linked entries for drilling. Before any of that, rewrite the vague rule lines, because every model answer will quote them.

**2. Why this one**

- **Nothing in the atlas asks him to apply a rule to new facts.** None of the 1,069 entries is a fact pattern with an answer. The 44 Hypothetical entries (33 Contracts, 11 LRS, 0 Civil Procedure) have no sections. `problem-prentis` ends "Read the Prentis problem in full before assigning a final result."
- **The drill never shows facts.** It runs from a case name to its rule. `KINDS = ['Case','Concept','Rule']` (tools/r18/study.js line 8) leaves the problems out, and the prompt is the title plus "Say the issue, the holding and the rule out loud."
- **The LRS exam format is known.** The LRS syllabus says the final "is likely to have both multiple-choice and essay components." It also says the weekly problems, answered in about 250 words, are for "preparing for the format of the final."
- **The rule lines would mislead a model answer as they stand.** 134 of the 392 drillable concept and rule summaries use placeholder wording. Those summaries are the drill's "Rule" answer (study.js line 68) and the cheat sheet's line (line 262). Examples: `cp-usc-1332` says "when the statutory conditions are met", `ucc207` never states the 2-207(2) merchant test, and `cp-class-actions` gives no Rule 23(a) elements.
- **Comparisons are thin.** Only 21 of 2,537 connections are typed Tension or Analogy. Chevron, Skidmore and Loper Bright are linked only by generic "Explained relationship" edges.
- **Effort has gone elsewhere.** Since r18, 25 of 88 commits went to icons, visuals or the map, and 1 to study features.
- **Accuracy is not the bottleneck.** 14 sampled entries had 0 errors.

Practice with feedback is what the learning research supports. The studies showing gains of up to a letter grade used instructor feedback, so a self-scored rubric should be expected to do less.

**3. What would be built**

**Stage 1: rule lines (about half a day).** Rewrite the summaries of the 392 concept and rule entries. Each gets:
- a one-line testable rule of 35 words or fewer
- a list of elements and exceptions
- the cases that carry the rule

Sources are limited to `tools/r19/data/provisions.json`, `added-sources/index/*.json` and the audited r19 sections. A verifier quotes the source for every element. This is the check that matters, because the most common r19 fix was a rule stated too broadly (79 fixes in 70 of 391 entries). It ships as a runtime layer like `rlcc.js`, applied only while `updatedAt` matches the seed, so his own edits are left alone.

**Stage 2: answers to the 44 problems.** Each problem gets:
- the issues
- the best argument on each side, tied to atlas cases
- the likely result, or the open question where the casebook leaves it open

Answers are written from the problem's linked casebook pages and the audited briefs.

**Stage 3: new items, gated by class date so nothing tests untaught material.**
- One fact pattern per class, about 250 words. Each has a model answer (issue, rule cited to entry ids, both sides' application, conclusion) and a checklist rubric.
- 3–5 multiple-choice questions per LRS class, each with one sentence on why every option is right or wrong. Wrong options come from curated comparison sets such as Skidmore / Chevron / Mead / Loper Bright and York / Byrd / Hanna / Shady Grove.
- About ten short Civil Procedure problems, since there are none now.
- Later, two timed exam-length patterns per course.

**Interface.** A Practice tab in `#r18Dialog` with:
- the prompt, an answer box and an optional timer
- a "Show the analysis" button, then a rubric he ticks

A missed rubric item rates the linked entries Patchy or Blank in `dkla.study.v1`, so "Drill the ones I missed" works. Hypothetical is added to the drill's `KINDS`. Data goes in an appended `dklaR20Practice` block. Nothing in `seedData` or the r18 blocks changes.

**Quality checks.**
1. A writer drafts each item.
2. A fresh verifier checks every rule sentence against the cited entry, brief or page, and can fail the item.
3. A blind "student" agent answers from the facts with only the atlas. If it misses an intended issue or finds an unintended one, the item is rewritten.
4. Multiple-choice questions are answered blind and rejected if the agent misses the answer or finds two defensible answers.
5. A plain-language pass applies the r19.17 rules: no labels, no disclaimers.
6. A check script validates entry ids, class gating and banned phrases.
7. A smoke test of the live build covers load, every entry, a fixed set of searches and the Practice tab.

**Pilot first.** Run one item set per course: LRS Class 13 (APA, rulemaking and adjudication, 10/14), Civil Procedure personal jurisdiction, and Contracts damages (`problem-interests`). Show him screenshots before scaling up. The full run is roughly 100–150 agents over 1–2 days.

**4. Runners-up**

**Attack outlines (2–4 pages per course).** One ordered checklist per course, built on the 45 subjects' route questions ("Can this court reach the defendant?"). Each step gives the trigger facts, the test element by element, and the controlling entries. It also replaces generic how-to text, such as `minimum-contacts` ending "consider the relevant fairness analysis" without naming the factors. The LRS exam allows printed notes, so this is directly usable on exam day. It depends on Stage 1 and makes a good rubric skeleton, so run it next or alongside.

**"Due today" scheduling, with supporting cases as an opt-in deck.** This adds FSRS scheduling (ts-fsrs) to the drill. r13 put it off until the card fields were chosen, and the r18 staged card has now settled that. It also closes the one item AGENTS.md lists as not done: supporting cases are not in the drill (1,077 supporting briefs, each with a rule line). It is cheap (1–2 agents), but on its own it still trains name-to-rule recall. It is worth more once practice items exist to schedule.

**5. Considered and rejected**

| Project | Reason |
|---|---|
| Facts-first masked drill | Practice items on new facts do the same job better. |
| 600–900 MC questions | Too many to check. They go into the bank at a smaller, verified volume instead. |
| Standalone comparison sets | They go into the bank as MC distractors and rubric lines. Writing them as graph edges would add map ribbons. |
| Assignment and week drill scopes | Useful for weekly prep but not exam skill, and the Contracts schedule is not on file. Do later. |
| Linking the 764 unlinked supporting cases | Mostly minor cases and clutter. Only the timeline fixes are worth doing now (Brand X 2005 listed before Mead 2001; the removal timeline jumps from 1988 to 2026). |
| Startup speed fixes | Real (the index is built 5 times at load, 7 cache writes), but they don't affect grades. Take them as a side task. |
| Release test suite | Ship it with the bank rather than as a separate project. |
| Lazy loading and the r20 consolidated build | Risks his saved edits and offline use eight weeks before finals. |
| Plain-language pass on the full briefs | Secondary view, and "later history" lines risk wrong "overruled" claims. |
| Re-checking batches s54/s56, the 44 source-limited briefs, the 10 missing provisions | Little study value, and he said not to re-run s54/s56. |

**6. His decisions before work starts**

1. Can he get past exams or Shane's weekly Brightspace problems for calibration? They would stay private.
2. May the rewritten rule lines replace the current summaries in the drill and sheets? Entries he has edited stay untouched.
3. Should Contracts and Civil Procedure get multiple choice, given their exam formats are unknown?
4. Is self-scoring by rubric acceptable, or does he want AI grading of his answers? Grading would need an API key or the sync function.
5. Can he give the Contracts class schedule, so items are gated by date?
6. Does he approve the three-course pilot before the full run?