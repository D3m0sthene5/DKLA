# Verifying converted briefs against their sources

Another agent converted a batch of audited law case briefs into a concise six-section format for a law
student's study atlas. You are the independent checker. The student will study from these entries for
exams, so an error here is costly. Your job is to find every statement in the converted entries that the
source brief does not support, and fix it.

## Files (DIR is the folder containing this file)

- `DIR/batches/bNN.json`: the batch list. Each item has `atlas_id`, `title`, `codex_id`, `file` (the
  source brief).
- `DIR/out/bNN.json`: the converted entries, keyed by `atlas_id`: `{codex_id, rule, sections: {Parties,
  Procedural History, Material Facts, Issue, Holding, Reasoning}}`. You edit this file in place.
- `DIR/BRIEF.md`: the instructions the converter followed. Read it first; its rules are your standard.

## Method, for every entry in the batch

1. Read the source brief in full with the Read tool.
2. Go through the converted entry sentence by sentence (the rule line and all six sections). For each
   sentence, find where the source brief says it. Check especially: names and which side each party was
   on; who won at each stage and the exact disposition; dates, amounts and numbers; the deciding court,
   the author and the vote; which opinion said what (majority, plurality, concurrence, dissent, lower
   court, a party's argument, the casebook editors); every qualification ("assumed without deciding",
   "on the facts alleged", "in dicta").
3. Classify anything you cannot find:
   - **Unsupported**: a fact, name, number, date, vote, or legal proposition that is not in the source
     brief (it may be true, but it came from the converter's own knowledge). Remove it or replace it
     with what the brief says.
   - **Distorted**: the brief says something different, or the condensing changed the meaning, dropped a
     qualification that matters, or attributed a view to the wrong opinion. Correct it.
   - A plain inference that follows necessarily from what the brief states (for example calling the
     party who the brief says appealed "the appellant") is acceptable; leave it.
4. Check for a material omission: if the brief's central holding, the decisive fact, or a stated limit on
   the brief's own coverage (excerpt only, one stage only, source unavailable) is missing from the
   entry, add it in a sentence.
5. Check the rule line states the doctrine as the brief states it, not more broadly.

Make each fix directly in `DIR/out/bNN.json`, keeping the JSON structure, the six keys in order, plain
prose (no markdown), and the word limits. Do not rewrite sections that are accurate; do not polish style.

## Record what you changed

Write `DIR/verify/bNN.json`: an object keyed by `atlas_id` for EVERY entry in the batch, each value
`{"checked": true, "fixes": [{"section": "...", "kind": "unsupported|distorted|omission", "was": "...",
"now": "..."}]}` with an empty `fixes` list where the entry was accurate.

## Before you finish

Run `python3 DIR/check_conv.py DIR/out/bNN.json` and make sure it still prints "0 with problems".

Final reply, one or two lines: entries checked, entries changed, total fixes by kind, and anything you
could not resolve. Only write the two files named above.
