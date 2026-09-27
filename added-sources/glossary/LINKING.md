# How the dictionary is linked to the atlas entries

`tools/r12_glossary.py` decides which Wex terms each entry uses ("Terms in this entry" chips) and, as the exact inverse,
which entries each term is used by ("Entries that use this term" in the dictionary dialog). This note is the policy;
`term-links.json` beside it holds the hand-curated part.

## What counts as a use

A term is linked to an entry when the entry's text (title, rule line, sections, notes) contains the term **in its legal
sense**. Matching is on word tokens, so it survives plurals and possessives ("attorney's fees"), the -ed/-ing forms of
terms that are verbs (remand, waive, plead, assign …), hyphen and space variants ("counter-offer"), "§" for "section",
"of 1934"-style suffixes and the alternatives Wex puts in parentheses. The longest term wins at any spot, so
"promissory estoppel" is linked and "estoppel" is not, unless "estoppel" is also used on its own. Abbreviations
(UCC, FRCP, TRO, RICO …) match only in upper case.

Never linked:

- Wex articles about cases (`kind: "case"`); the ones about cases the atlas teaches are attached to those cases by
  `tools/r14_wex_cases.py` instead;
- catalogue noise (`Starting a new article`, `help-style`, headings with stray quotes);
- generic words of the courtroom (`GENERIC` in the script: court, judge, plaintiff, defendant, party, appeal, trial,
  claim, judgment, holding, rule, statute, Congress, supreme court, district court, common law …) and everyday words
  Wex happens to define (company, business, information, health, family …): a chip on every entry says nothing;
- a term that is the entry's own title (the concept "Consideration" does not get a "consideration" chip; the dialog
  shows it separately as "The atlas's own entry");
- words inside names: "Justice Story", "William E. Story", "v. Sidway" are skipped by capitalisation and position;
- the atlas's own idioms: "assigned pages", "Assignment 05", "— Katzmann account" (`blockedNextWords`).

## The sense test

Wex defines many everyday words (consideration, notice, party, trust, principal, interest, register, protest). Each
term is put in one class when the dictionary is read:

- **no test**: multi-word legal phrases, and single words on the `LEGAL_ONLY` list (plaintiff, jurisdiction, estoppel,
  promisor, remand, forbearance, breach …) whose every use in a law-school text is the legal one;
- **common** (an everyday word Wex defines, zipf frequency ≥ 3.3): linked only when the words around it fit the Wex
  definition. Within about 24 words of the occurrence the script looks for (a) a hand-listed collocate from
  `term-links.json` (a word, or a phrase that must appear whole: "bargained-for", "promisee", "consideration for the
  promise"), which settles it, or (b) two words of the Wex definition itself, weighted by how rare they are across
  the dictionary and across the atlas (so "court" and "authority" count for little, "peppercorn" for a lot), with a
  higher bar outside the title, rule line, Issue and Holding and a lower bar when the definition's vocabulary is the
  course's own (consideration, offer and promise in Contracts; notice and forum in Civil Procedure). Plurals of mass
  nouns ("considerations", "interests", "titles") are not matched at all;
- **rare** (a technical word, zipf < 3.3): a single definition word nearby is enough, or an entry steeped in the
  term's field; words on the `STRICT` list (abstention, solicitation, publication …) and words whose definition is
  far from the course's vocabulary need two;
- **phrase**: a handful of everyday phrases Wex defines ("as is", "in re", "home office", "good cause", "Section 5")
  and any heading Wex had to qualify in parentheses are tested like common words.

Per-course blocks (`neverInCourse`) stop a word whose Wex article is about a different sense from the one a course
uses throughout: "agency", "principal", "removal" and "administrator" in LRS (administrative agency, principal officer,
removal of officers, the Price Administrator), "service" and "labor" in Contracts, and so on.

## Ranking

Each link is scored by where the term appears (title 12, rule line 8, Key line 6, Issue/Holding/Meaning 5, Reasoning
3, facts and procedural history 2.5, parties 2, notes 1.5; repeated mentions add logarithmically), multiplied by a
specificity factor (a term that most entries of the course use ranks low) and a length bonus for phrases. An entry
shows at most 32 chips, best first. A term mentioned once, only in the notes, parties or procedural history, and used by
more than 12% of the course's entries ("remanded", "certiorari") is dropped as boilerplate.

"Entries that use this term" lists cases first, then concepts and rules, then notes and study problems; within each
group by that score, so the entries in which the term is central come first. The dialog also names the atlas's own entry
on the term when one exists (a concept whose title is the term).

## Curating

`term-links.json`:

- `collocates`: slug → words and phrases marking the legal sense (the main lever for recall on common words);
- `legalOnly`: slugs that need no test; `never`: slugs never linked; `neverInCourse`: slug → courses where the word
  means something else; `blockedNextWords`: slug → following words that mark the atlas's own idiom;
- `add` / `remove`: entry id → slugs, applied last, for the cases no rule catches.

Set `DKLA_GLOSSARY_DEBUG=/path/out.json` when running the script to dump every entry's chips with their scores, the
fields they came from and the sense evidence, and every candidate that was rejected.
