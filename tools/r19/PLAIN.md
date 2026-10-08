# Plain text (r19.17): the brief the editing agents worked to

The owner asked for the "AI-isms" to go, citing "Detailed account of the assigned reading" under Myers. That means sentences and labels in which the write-up talks about itself, its sourcing or its process, or hedges, instead of stating the law or the facts.

Candidates were sentences in entries, connections, map text, scope notes and the converted brief sections that matched a self-reference or sourcing pattern (this entry / the brief / the excerpt / on file / supplied / verified / current law / invented / the reader / paraphrase …). Templated boilerplate that recurs hundreds of times was rewritten by rule in `plain.py`. The remaining 1,060 sentences went to five agents, each told:

- **Delete** a sentence that only refers to the write-up ("This entry covers that stage", "The brief states…"), describes sourcing ("not independently verified", "could not be obtained", scans, "preserved here"), disclaims ("does not certify it as current law", "not a substitute for the reading", "no answer key") or lists what a source does not say when the absence teaches nothing.
- **Rewrite** to the bare fact when a meta frame wraps something a student needs: later history ("The Ninth Circuit reversed this sanction in 1986."), a correction to the casebook ("The court of appeals, not the district court as the casebook says, allowed the collateral attack."), "the excerpt holds" → "the court held". Keep names, numbers, dates and holdings exactly; add nothing.
- **Keep** legal substance that matched by accident (verified complaint, certify a class, preserved objection, imported goods), what the casebook teaches or asks, and reading-list entries that say where a reading is.

Result: 397 kept, 222 deleted, 441 rewritten (`data/plain-decisions.json`). `plain.py` turns the decisions into whole-field edits. Brief sections are edited at build time and tagged `rev …p1`, so an atlas that already applied a brief applies it again. Graph fields go in the `dklaR19Plain` block, and `plain.js` applies each one only while the field still holds the old text.

Not touched: the full briefs (`dklaR19Full`) and the combined PDF, which are the audited record as Codex wrote them; the "Full provenance and original metadata" JSON dump in record details; titles.
