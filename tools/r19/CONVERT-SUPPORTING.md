# Converting an audited brief into the atlas's six-section format

You are converting case briefs for a law student's study atlas (DKLA). Each source brief was written and
audited against the full opinion by another system; it is long (about 1,300 words) and organised under
free-form headings. The atlas needs the same content in a fixed, concise six-section format.

## Your batch

Your batch file (given in your prompt) is a JSON array. Each item has `codex_id`, `title`, `course` and
`file` (the source brief, markdown or plain text). An item may also have `corrected_file_if_present`: if a
file exists at that path, it is a corrected version of the brief and you must read it INSTEAD of `file`. Read EVERY source brief in full with the Read tool before
writing its entry. Do not skim and do not work from memory of the case.

## Output

Write ONE JSON file at the output path given in your prompt: an object keyed by `codex_id`, each value:

```json
{
  "rule": "One sentence, 8-48 words: the rule the case stands for, as the source brief states it.",
  "sections": {
    "Parties": "...",
    "Procedural History": "...",
    "Material Facts": "...",
    "Issue": "...",
    "Holding": "...",
    "Reasoning": "..."
  }
}
```

The six keys must appear in exactly that order. Target lengths in words (the validator's hard limits are
in brackets): Parties 40-90 [20-130]; Procedural History 60-140 [25-190]; Material Facts 110-200 [60-260];
Issue 30-70 [12-110]; Holding 60-130 [30-180]; Reasoning 150-260 [90-340].

What goes where:
- **Parties**: who sued whom, each side's role at trial and on appeal, and what each wanted.
- **Procedural History**: the path through the courts in order, what each court did, and how the case
  reached this court. End with this court's disposition (affirmed, reversed, vacated, remanded).
- **Material Facts**: the facts the decision turned on, in chronological order, with the specific details
  the source brief gives (names, dates, amounts, the words used).
- **Issue**: the legal question or questions, framed as the court decided them.
- **Holding**: the answer. Begin with the deciding court and year, then the author and the vote when the
  source brief gives them, then what was held.
- **Reasoning**: why. The steps of the court's argument in order, then any concurrence or dissent in a
  sentence or two each. If the source brief marks something as the casebook's editorial point rather than
  the court's, say so.

## These are supporting cases

The cases in this batch are ones the course readings mention without assigning: note cases, cases cited
in passing, later or earlier stages of an assigned case. Their briefs vary a lot. Two allowances follow.

- **Short is fine.** Where the brief has little to say for a section, write only what it supports, even
  if that is one sentence. The validator's minimums are low (Parties 8, Procedural History 8, Material
  Facts 25, Issue 8, Holding 12, Reasoning 40 words). Never pad. If the brief gives nothing at all for a
  section, write exactly: `Not given in the brief.`
- **Not every entry is a decision.** If the source is not an account of a court or agency decision (for
  example a statute summary, a reading guide, or an editorial account of an unidentified dispute), do not
  force it into the format. Give that entry the value `{"skip": "<one sentence saying what it is>"}`
  instead of `rule` and `sections`.

Where the brief explains why the readings cite the case (the point the casebook uses it for), end the
Reasoning section with one sentence saying so, attributed to the casebook.

## Rules that matter most

1. **Nothing that is not in the source brief.** Every fact, date, number, name, vote count, quotation and
   legal proposition in your entry must be stated in the source brief. Do not add anything from your own
   knowledge of the case, even if you are sure of it. If the source brief does not give something (a vote
   count, an author, a date), leave it out; do not guess and do not write that it is unknown.
2. **Do not change meaning while condensing.** Keep qualifications that matter ("the court assumed without
   deciding", "on the facts alleged", "the plurality"). Keep who said what: majority, plurality,
   concurrence, dissent, the lower court, a party's argument, or the casebook editors.
3. **Carry over the source's own limits.** If the brief says it covers only an excerpt, one stage of the
   case, or that a source could not be obtained, keep that in the relevant section in one plain sentence.
   Drop the audit bookkeeping (review status lines, "pinpoint repaired", file names, page-locator notes).
4. **Plain prose.** No markdown, no bullet points, no headings inside a section. Use full sentences and
   blank lines between paragraphs where a section has more than one. Drop parenthetical pinpoint citations
   such as "(385 Mich. at 61)"; keep a statute or rule number when it is the thing being interpreted.
   Write "the Court" for the U.S. Supreme Court and "the court" otherwise. Do not start a section by
   repeating its heading.
5. **The rule line** is the doctrine a student should be able to recite, not a summary of the outcome.

## Before you finish

Run `python3 <dir>/check_sup.py <your output file>` (the exact command is in your prompt) and fix
everything it reports until it prints "0 with problems". Then re-read two of your entries against their
source briefs, sentence by sentence, as a final accuracy check, and fix anything unsupported.

Your final reply should be one line: how many entries you wrote and whether the validator passed, plus any
case where the source brief was too limited to fill a section properly.

Only write your one output file. Do not modify the batch file, the source briefs or anything else.
