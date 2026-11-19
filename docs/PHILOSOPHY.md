# DKLA design philosophy

Written 19 November 2026 from two literature reviews (about 160 sources: learning science and legal
education; human-computer interaction and perception), a script-measured inventory of DKLA's own
data, and the owner's editorial critique. The owner's readable copy, with every source linked, is
the document "DKLA design philosophy" (https://claude.ai/artifact/QWaLVZJtWsUAhcfwBfh8P4).
`docs/DESIGN.md` holds the rules that follow from this; this file holds the reasons.

## What DKLA is for

DKLA teaches a first-year course through the arrangement of its material. The database says what
exists. The design decides what belongs together, what dominates, and what a student meets first.

Grades track what a student does with a case: top-half first-years spent 46% of reading time
predicting and questioning and 33% connecting the case to a purpose and to prior knowledge;
bottom-half students spent 77% paraphrasing and highlighting (Christensen 2007, n = 24). So the
interface conveys content and also prompts four acts: predict, question, connect, recall.

Six kinds of knowledge, each with the format the evidence supports and the instrument DKLA has:

| Kind | Format | Instrument |
| --- | --- | --- |
| Structure of a doctrine | overview first; a map for central ideas (Nesbit and Adesope 2006) | the map |
| Rule of a case | one marked sentence, then recall (signaling g = 0.53; Cooper and Gurung 2018) | the rule line, recall |
| Story of a case | narrative in learner-paced episodes (Mar et al. 2021; segmenting) | Cold Call |
| Procedure for applying a doctrine | flowchart with this case's step marked (Kammann 1975; Passera 2018) | flowcharts |
| Vocabulary | definition at the point of need (Yanagisawa et al. 2020) | hover dictionary |
| Change over time | timeline (thin evidence) | doctrine timelines |

## What matters most, by situation (inferred; no study measured it directly)

- Reading before class: where the case sits, court and year, the question it answers; the issue,
  with a chance to predict; outcome and rule; operative facts; reasoning; terms on demand; neighbours.
- Called on in class: facts in three or four sentences; how the case reached this court; issue;
  holding and rule; reasoning in steps; two or three fact variations. One screen, no navigation.
- Outlining: the rule in the student's words; its slot in the doctrine; what it adds to or limits
  among neighbours; the flowchart step it decides; a one-line fact cue.
- Exam review: the decision procedure per doctrine; rules recalled from memory; trigger facts;
  contrasts between confusable cases; policy.

App-wide: always visible are the place in the course, the case name with its rule, and a way back.
One step away: brief, recall and Cold Call, flowchart step, neighbours, definitions. Deeper: full
timeline, canons, lecture notes, sources, settings.

## What the data inventory found (scripts in /home/claude/inventory at the time; re-derive if needed)

- 392 map cases, 333 concepts, 75 rules, 235 notes, 1,077 supporting cases; 96 timelines (685
  entries), 115 flowcharts (975 steps), 100 canons, 5,583 dictionary terms, 742 Cold Calls (4,097
  episodes); about 9.7 million words in all.
- A case page: 18 to 23 blocks, median 1,824 words before the full brief; 325 words above the brief.
  Six-part brief median 787 words; rule 44; Cold Call 1,083 in 5 episodes.
- Flowchart membership: median 2 steps in 1 chart (90th percentile 5 in 2; max 14 in 6). Every case
  is on a timeline (1 for 330 cases, 2 for 57, 3 for 4). Connections: median 5, 75% to a concept.
- A class session is the unit of nightly work: median 4 cases (Contracts), 12 (Civil Procedure week),
  6 (LRS); 3,074 to 9,106 words of six-part brief.
- Home at rest drew 97 curved association lines among 41 subject tiles, plus per-course tree lines.
- Stored but not shown: each Cold Call's `lead` (two-sentence setup), `actors` (cast with roles),
  `proceedings` (steps), and each episode's `cue` (the question a professor would ask).
- Duplicates: "Questions this case helps answer" repeats Connections (identical on 251 of 392
  cases); four names for sources, three for briefs, three for the rule; the Supreme Court voting
  record (221 cases) sat in the "Your notes and editing" drawer.
- No usage data in the repository. The app's own tracker (src/features/analytics) records 41 event
  kinds, none for flowcharts, canons or lecture notes; its records are in the site's database.

## The ten principles

1. **Teach through arrangement.** Every screen answers one question a student has. Being in the
   database does not earn a place on the page. (Tversky et al. 2002; Carroll and Carrithers 1984.)
2. **Context first, outcome marked.** A case opens with where it sits, court and year, and the
   doctrine question it answers; the rule is the one marked line. (Lundeberg 1987 via Oates 1997;
   Schneider et al. 2018.)
3. **Keep the pieces of one idea together, and give the thing being studied the room.** A date,
   the authority and what it changed belong in one place; a step, its question and why a case sits
   there belong in one place. That is what the integration evidence supports (Schroeder and Cenkci
   2018, g = 0.63; Jang et al. 2012). It does not mean the brief, the outline, the map, the timeline
   and the flowchart share one viewport: whole features may follow one another down a page. When
   principles conflict, the material the reader has chosen to study gets enough room to be
   understood at a glance, and secondary tools move, collapse or follow below. (Owner's correction,
   19 November 2026, after the first case sheet squeezed a ten-decision timeline into 280 px.)
4. **Every relationship explains itself where it is shown.** A count carries its unit; a link to a
   chart shows the chart's question, the step's question and why this case is there. (Owner's
   editorial standard; Nievelstein et al. 2010.)
5. **Recall before reveal.** Cold Call as rehearsal (question, answer from memory, narration as
   feedback); a studied case can cover its rule and holding. (Adesope et al. 2017, g = 0.51;
   St. Hilaire et al. 2024; Karpicke et al. 2009.) The default is the owner's decision.
6. **Calm comes from removing what competes, not from fading what matters.** Take away a competing
   region before muting anything inside the one that stays; a vivid, readable timeline is the
   calmest thing on a page it has to itself. Importance follows the reader's choice: on Brief the
   rule leads, on Doctrine the history leads and the case title becomes a compact reminder. Colour,
   artwork and visible paths that carry meaning keep their energy. Low visual complexity and
   familiarity win first impressions; an unfamiliar "spaceship" look needs extra simplicity.
   (Lindgaard et al. 2006; Tuch et al. 2009, 2012; Reinecke et al. 2013; Moshagen and Thielsch 2010.)
7. **Group with a boundary and space; emphasise once.** One hairline or fill per group, twice the
   gap outside as inside, nesting at most two; one primary action and one "you are here" per view;
   at most five meaning-bearing hues per screen. (Bae and Watson 2014; Fisher and Tan 1989;
   Healey 1996.)
8. **Typeset the real content.** Captions break between parties; artwork is large enough to
   recognise; space goes where the content needs it; reading text 17 px or more, 50 to 70
   characters a line, on the lightest plane, nothing read under 13 px. (Owner's standard;
   Piepenbrock et al. 2014; Buchner et al. 2009; Dyson and Haselgrove 2001.)
9. **Charm on the content, quiet beside the reading.** Case pictograms shown as illustrations;
   jokes, mascot, flip clock and glow on Home and in waiting states only. (Sundararajan and
   Adesope 2020, g = -0.33; Brom et al. 2018; Burke et al. 2005.)
10. **The map shows structure, and its lines appear on demand.** Tree lines at rest, a tile's
    cross-links on hover or selection; positions never move; every destination two visible clicks
    away, search a second route. (Purchase 1997; Yoghourdjian et al. 2020; Scarr et al. 2013;
    NN/g 2016; Bergman et al. 2008.)

## Owner decisions still open (19 November 2026)

Cold Call's default (rehearsal or reading); a "test me first" switch on case pages; an 18 to 20 px
body-text trial under the fixed dark theme; whether to read the usage records.

## Limits of the evidence

Tabs versus long pages were tested on shopping sites; no controlled study of command palettes;
timeline evidence is from primary schools; no controlled study of flowcharts in legal education;
aesthetic studies used strangers judging websites; about half the sources were read as abstracts.
Automated layout metrics explained at most 49% of rated appeal (Miniukovich and De Angeli 2015):
the measurements are an entry ticket, and the editorial test in DESIGN.md decides. The checks catch
defects; they cannot choose the better composition (fading every link on a map can improve a
complexity score while making it worse at being a map).
