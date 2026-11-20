# Where the work stands (12 November 2026)

Written at the end of a session so the next one can pick up cleanly.
Update or replace this file when the state changes.

## The territories (19 November 2026, branch `v32-home`, merged into `v32-design`, not deployed)

The owner's verdict on the quiet Home: the saturated course territories were easier to tell apart, the
quiet one had fewer crossing lines, and he wants both (docs/DESIGN.md rule 15). What Home and the course
views draw now, all of it in `draw()` (`src/runtime/studyCode.js`) and `src/features/v32/cards.css`:

- **A subject's tile is filled in its course's colour.** One fill a course (`TILE_FILL` in
  `studyCode.js`: `#1f4872`, `#6b3c06`, `#1a4b2b`, each at the course's own hue so nothing is a brown or
  grey made by mixing), one hairline in the course's accent at 0.8, light on the top edge. The fill is
  opaque. The map's text colour is 7.5:1 or better on every fill; a tile's count on a course view is in
  the text colour too (`.v32-on-tile`). A tile that is not a subject (reading records, Notes) stays a
  plain panel, so the doctrine is what has the colour. Tokens for the three fills were not added
  (`tokens.css` was out of bounds for that pass): ask for them.
- **The tree is drawn to be followed.** Each course's `spine` in the course's colour: "leads to" (kind
  `flow`) solid, 1.75 px, ending in an arrowhead drawn in the same path; "or instead" (`contrast`)
  dashed and "depends on" (`depends`) dotted, 1.5 px, lighter. `treeLines()` routes a course's tree as a
  whole and remembers it: a line is straight unless it would pass behind a third subject, and then takes
  the shortest way round along lines of sight between the corners of the subjects in its way, 190 map
  units out, paying to cross another line (2,000 units) or the name of a part (3,000). On Home: 32
  lines, 6 of them routed, none behind a subject by more than 3 px (7 lines were, at 8 places, 5 of
  them for 22 to 77 px), 2 crossings (the second is between two lines that used to be hidden behind
  tiles). The curves of association still appear only for the tile under the pointer or the open
  subject, with the other lines stepped back to 0.22.
- **Where a course begins.** Its first subject (`step` 1) carries a numbered dot on its corner
  (`.v32-start`), the same mark that stands before an open subject's name. `r20.js` leaves it in place.
- **The land.** Under each course the ground is stippled in the course's colour (a 12 px grid of 0.75
  px dots, pattern `land-k/cp/lrs`, one path a course). Its outline is the course's own parts
  (`courseDesign.zones`) and every subject's place, snapped to the grid so no dot is cut; it has no
  edge and no fill. It replaces the three radial gradients. On a course view the parts are a flat wash
  of the course's deepest step (`--wash`) over it. A wide part now keeps its name and ground ("The life
  of the suit" was left out on a 1440 px course view because its name asked for more room than the band
  has).
- **Beside the reader** a tile that steps back is drawn over a solid piece of ground
  (`.v32-tile-under`), so the open subject's lines pass behind it and never through its name.
- **Checks**: `tools/v32/check-cards.mjs` holds the fills, the 7:1, the line weights, the arrowheads, "no
  line behind a third subject", at most two crossings, the land, the start marks and the strip; three
  breakages in `tools/verify/break.mjs`.
- **For the owner's PC**: every picture of Home and of a course view changes (`pnpm views:update`).
- **Open**: an open subject is still a neutral panel whose only course mark is its numbered dot; the
  curves of association shown on hover still run straight behind tiles; the books in Rules &
  authorities are now the quietest thing on Home.

## Cold Call as a rehearsal (19 November 2026, branch `v32-coldcall`, not merged, not deployed)

- **What it is now.** An account opens on a setup that answers "tell us about this case": the case's
  drawing on a plate of clear ice, its hook, the composed caption, the citation, then the `lead` as the
  largest text, the cast (`actors`) and "How it got here" (`proceedings`, numbered). Each episode leads
  with its `cue`, the question a professor would open with. The end is "What this case does not decide"
  (`limits`), the sources and the ways out. `lead`, `actors`, `proceedings` and `cue` were in the data all
  along and were not shown before. No narrative text was changed.
- **Two ways through it, one switch** at the foot, remembered in this browser under
  `dkla.coldCallMode.v1` (a preference, not saved work; `dkla.coldCall.v1` is still never read or
  written). Read: everything open, each question above its title. Rehearse: one question at a time, the
  narration and its title under a still pane of frost until asked for; the list at the side shows
  questions, not titles, until then. **The owner has not chosen the default.** It is Read, behind one
  constant: `DEFAULT_MODE` near the top of `src/features/cold-call/reader.js`.
- **The foot is the one deck of controls**, the same place at every step: the switch, the one action that
  comes next ("Start reading", "Show the answer", "Next question", "Back to the case"), where you are, the
  keys. Space or Enter shows and moves on while rehearsing (Space first pages through an answer longer
  than the screen); Left and Right move between steps; Escape closes; focus returns to what opened it.
- **The frost** (`--cc-ice-*` at the top of `reader.css`, the palette of `frost.css`) is used twice in the
  reader and nowhere else: the plate behind the drawing and the pane over a covered narration. Both are
  still. The frosted button style itself belongs to `button[data-cold-call]`, which is why the rows of
  the index and the "Next Cold Call" row are not `<button>` elements: they keep `data-cold-call` (the
  reader's own listener opens them, and the analytics layer counts a `cold_call` from that attribute).
- **Captions** are composed by `src/features/v32/caption.js` (`DKLACaption.parse/html/inline/year`): a
  break only before "v.", "v." tied to the word after it, consolidated cases one per line with the second
  subordinate, a stage note on its own line. A caption whose longest line would not fit is set at 30 px
  instead of 34, and a prompt over 80 characters keeps 22 px while rehearsing.
- **The index**: `window.DKLAColdCallIndex = { count(), open(trigger), close() }`
  (`src/features/v32/coldcall-index.js`). `count()` is null until the narratives have arrived. The list is
  grouped by course, then by subject in the map's order, then that course's supporting cases; typing
  filters by caption and citation; a row opens the reader over the list. Nothing in the app opens it yet:
  the Library (another branch) is to show a row when `DKLAColdCallIndex` exists.
- **What the data holds** (audit of all 742, 4,097 episodes): every account has every field. `lead` 99 to
  359 characters (median 204); cast 2 to 7 (median 3); `proceedings` is one paragraph in 208 accounts and
  2 to 5 steps in the rest; `limits` is two paragraphs in 76; episodes 3 to 11 (median 5); `cue` 4 to 104
  characters, a question in 2,417 episodes and an instruction, headline or date in 1,680; 392 accounts
  (the map cases) have a drawing and 350 (supporting cases) do not. A missing field is drawn as nothing
  (checked with fields taken away, since no real account lacks one).
- **Checks**: `tools/v32/check-coldcall.mjs` ("Cold Call rehearsal"), `tools/v32/caption.test.mjs` ("case
  captions composed"), `tools/cold-call/check_reader.cjs` (now holds the setup, the prompts and a bare
  account), nine breakages in `tools/verify/break.mjs`.
- **For the owner's PC**: the `cold-call` picture changes (the reader opens on the setup); run
  `pnpm views:update` after looking at `work/views/`.
- **Known and not done**: the next case offered at the end is the next in the same group of the map (the
  session cards do not expose which session a case belongs to); a setup with five or more actors is
  taller than the first screen at 1440 x 900 (about a fifth of the accounts) and scrolls; the rail of the
  index does not mark the group in view; the `cold_call` analytics event is unchanged (it carries no mode
  or reveal, because the tracker has no public way to send one and what is collected is the owner's call).

## What the map draws (19 November 2026, branch `v32-cards`, not merged, not deployed)

- **An open subject is one panel.** Its title (Exo 2, with the course's numbered dot), a readout of what
  is inside ("5 cases · 4 rules · 11 concepts"), then its groups on two columns. A group is a heading
  (Inter 600), its question and rows of one height; nothing inside the panel has a border. A row is a
  glyph for the kind of entry (a case's own pictogram; a section sign for a rule; a book for a
  Restatement or code provision; a ring for a concept; lines for a note; a question mark for a problem),
  its name on at most two lines, and a readout at the right (a case's year, a rule's citation). A
  group's notes and questions are one row with their number; pressing it opens the group in the reader
  with that list unfolded. The open entry's row is filled and marked in amber (`--v31-here`).
- **Where the rectangles come from.** `layoutCards()` at the top of `src/features/v25/geography.js`
  lays out the inside of every subject from the curated dataset, once, when the page loads: 64-unit rows
  (36 px when a subject is open in a 1440 px window), two columns of rows per group, groups dealt into
  two columns of nearest height in their curated order. `tools/v25/geography.json` is unchanged: it still
  says which subject and group an entry belongs to and in what order. A subject keeps its place and size
  on the map (Home is drawn from those and is pinned); it gets `panelH`, the height its contents need,
  and `cardBox(r)` in `studyCode.js` is what is drawn, framed by the camera and joined by lines once a
  subject is 200 px wide. Entries that are notes share their group's last row as their place.
- **What is drawn at each zoom** is decided in `draw()` (`studyCode.js`, "v3.2 Instrument"): a tile
  under 200 px; then the panel with its title and counts; groups with their counts while rows would be
  under 16.5 px; rows; and, close in (rows from 54 px), the entry's summary under its name. No text is
  drawn under 9 px at 1440 x 900. The layers that rebuilt cards after every draw are gone (`dklaUI.js`
  decorateMap, `r20.js` subtopic tiles and mini cards, the r18 glyph recolour), which is why a draw of
  an open subject takes a third of the time it did.
- **Tiles, Home and course views.** A tile's press target is still the map's fixed outline (the path the
  geometry check records); what is seen is a panel with a whisper of the course colour. Lines between
  subjects are dim and light up for the tile under the pointer (`lightTile()`, classes only). On a
  course view each tile carries its cases and rules, the course is framed above the band of controls at
  the foot (`r20.js` safeArea and `DKLASessions.band()`), and the Home blocks fade out
  (`R18.courseFade`). Styles are in `src/features/v32/cards.css`.
- **Lines.** At rest the map shows only each course's tree (`courseDesign.spine`: 13, 10 and 9 lines
  drawn; three in the dataset name subjects no longer on the map and are left out when the design is
  copied in `geography.js`). The curves of association between subjects (`galaxy().threads`, 97) are
  not in the picture at rest: `threadPaths()` draws the open subject's, and `lightTile()` adds the
  ones of the tile under the pointer and takes them away again.
- **Composition.** `fitText()` in `studyCode.js` breaks every name on the map: "v." stays with the
  party after it, and two lines are split where they come out nearest in length. Counts carry their
  unit (`countSpans()`), 13 px at reading zoom in the muted colour. A case's pictogram is drawn in a
  row only where it still reads at 16 px (`pictReads()`), otherwise the plain case glyph.
- **Check**: `tools/v32/check-cards.mjs` ("v3.2 cards" in `pnpm verify`), four breakages in
  `tools/verify/break.mjs`. The smoke test's row check and `tools/feel/measure.mjs` use `.v32-row`.
- **For the owner's PC**: every picture of the map changes; run `pnpm views:update` after looking at
  `work/views/`.
- **Known**: the mono face embedded in the page is JetBrains Mono Bold only, so readouts are bold; a
  500 weight would sit better. With the reader open the map is a strip some 360 px wide and a group's
  rows are 18 px there.
## The reader, one facet at a time (19 November 2026, branch `v32-case`, not merged, not deployed)

Read `docs/DESIGN.md` first. The case page was one scroll of 5,483 px (6.7 screens, 96 controls); an entry is
now read one facet at a time.

- **Structure.** From the top: a 44 px strip (a course dot, then course, unit and subject; the entry's name
  once the title has scrolled away; one 36 px close button), the header (name, citation line, the line under
  its picture), the facet bar (the Cold Call button in the margin, then a tab per facet with its count), and
  the blocks of the open facet. Facets: Brief (Overview on a concept or rule), Timeline, Flowchart, Canons,
  Lecture, Court (the Supreme Court's vote), Cases, Connections, Sources, Study. A facet with nothing in it has
  no tab. An entry with one facet (a rule or authority page, a connection, a subject) has no bar.
- **Who owns what.** `src/features/v25/reading.js` marks every direct child of `.reader-body` with its facet
  (`data-v32-facet`; the table is `RULES`, and a block no rule names joins the Brief) and keeps the children in
  one order, moving only those out of place. The blocks stay direct children on purpose: the layers that draw
  them look for them there. `src/features/v32/case.js` runs the bar, the open facet, Short | Full, the strip,
  the citation line, the one list of sources and the timeline switch. `src/features/v32/case.css` is the look.
  A layer that adds a block only has to draw it once into `.reader-body`; to give it a facet, add a line to
  `RULES` and, if it has a count, to `count()` in case.js.
- **`window.DKLAReader`**: `facets()` → `[{id, label, count}]`, `show(id)`, `current()`, `mode()`,
  `setMode('short' | 'full')`, `reveal(element)` (opens the facet an element is in and scrolls to it). The
  event `dkla:facet` on `document` (`detail: {entry, facet, facets, reason: 'open' | 'change' | 'update'}`).
  A link can name a facet: `#node=citoh&facet=timeline`. Keys: arrows, Home and End on the tabs; 1 to 9
  anywhere in the reader when no field has the keyboard and no dialog is open.
- **Scrolling.** The bar is sticky under the strip. The body's `min-height` is kept long enough for the bar to
  stay stuck whatever facet is open (`keepHeight`), a facet remembers where it was read to, and the same entry
  drawn again (an edit, a rating, coming back from a flowchart or a source) keeps its facet.
- **Sources** are one list built from the controls the older layers draw (which stay in the page, not shown):
  the reading the brief was written from first (`data-v32-original`, what "Original source" opened), other
  files, then the authorities cited; the record's own details are one drawer under it. A reading is listed
  once however many layers name it.
- **The citation line** is the first reporter citation in the full brief's opening lines, shown in the brief's
  own words (`CITE` in case.js; 382 of the 391 mapped briefs have one); until the brief arrives, or when it
  has none, the line shows what the entry's notes say of the court, or nothing. Opening a case now fetches its
  full brief (one small file, cached), which also makes Short | Full immediate.
- **Old rules removed where they lived** (reader-only rules with `!important`): the panel colour in
  `dklaR16HistoryStyle.css`, the title and rule fonts in `dklaR11Styles.css`, the caption in `r20.css` and
  `dklaR10bStyles.css`, the brief's headings and paragraphs in `studyStyle.css` and `dklaStyles.css`, the close
  button and the provision text in `polish.css`, `briefs.css` and `authorities.css`, the launch button in
  `cold-call/reader.css`, and the whole v3.1 case section of `reading.css`. Still there: the generic paragraph
  and heading rules of `v26/typography.css` (case.css outranks them by naming `.v32` and one more class; the
  title's face needs `!important`), and the Supreme Court record's `!important` paint, which case.css
  overrides inside the reader only.
- **Checks**: `tools/v31/check-case.mjs` (the facets, counts, one facet at a time, header, close button, rail,
  sticky bar, keyboard, a late block, a link to a facet, Loper Bright, a concept and a rule page),
  `tools/v25/reading_check.cjs` (the order and facets in a stand-in DOM), five breakages in
  `tools/verify/break.mjs`. `tools/v32/conformance.mjs` measures a facet against the scales.
- **Not done**: the supporting-case brief's dialog and the connection and subject readers have the new strip,
  left edge and title but keep their older insides; the pictures in `tools/verify/views` must be recorded
  again on the owner's PC (`pnpm views:update`): every picture with the reader in it changes.

**Later the same day: the case sheet (docs/DESIGN.md rules 13 and 14, the editorial standard).** The
owner's critique and the research changed the plan above: what is read together is on one screen, and
tabs are for what is consulted alone. A case now opens on a sheet (the Brief tab): the subject's
question, the pictogram as a 48 px illustration beside the name, the name set as a caption
(`compose()` in `src/features/v25/reading.js`: one party to a unit, the line turns before "v.",
consolidated cases one to a line, the year moved to the citation line and the strip), the rule, the
six-part brief, and beside it a column "Where this case sits" (`sits()` in `src/features/v32/case.js`,
built from the Doctrine tab's own blocks: place on the timeline and how the case moved the rule, the
flowchart steps it is a source for with the answer that leads on, the nearest three connections).
Below a 1340 px window the column is a band between the rule and the brief. Tabs: Brief, Doctrine
(timelines, flowchart steps, connections), Cases (concepts and rules), Canons, Class notes, Court,
Sources, Notes. `DKLAReader.show('timeline' | 'flowchart' | 'connections')` and
`#node=…&facet=timeline` still work: they open Doctrine at that part. Rows (timeline entries, flowchart
steps, connections, cases, canons) are text with a link in it, not buttons, so a long name wraps as
text. A canon's row says what the canon does and, from the canon's own record, whether the case
applies or discusses it and where. Open: the Court tab's bench (nine portrait buttons with centred
two-line labels) still fails `tools/v32/composition.mjs`; the lint also calls "v. Murphy" on its own
line a widow, which the caption rule requires. No "recall first" cover was built; the hook is that the
rule is `.reader-body > .takeaway` and the Holding is the fifth `.case-box > section`.

## The map in motion (19 November 2026, branch `v32-map`, not merged, not deployed)

- **What changed**: a drag, a pinch, a glide or a flight no longer draws the map on every frame. The picture
  on the page is moved by one transform on `#geoCanvas`, set once per animation frame; the map is drawn when
  the camera rests, and during a long motion only when blank map is about to show or the scale has drifted
  past what the level of detail suits (spaced so draws take at most a fifth of the time). All of it is in
  `src/runtime/studyCode.js` under "the camera in motion" (`CAM`, `camFrame`, `camDraw`, `setCamera`).
  `schedule()` still means "something changed, draw"; anything that paints the map itself must call
  `camDrawBegin()`, `camDrawn()` and `setViewBox()` as the rules-and-authorities view does.
- **Feel**: 1:1 tracking, momentum on release, soft edges that spring back, a press stops a glide or a
  flight, Ctrl + wheel (trackpad pinch) and two-finger pinch zoom continuously about the pointer and rest on
  one of the four levels, flights are a critically damped spring that can be redirected. A plain wheel still
  steps one level. Reduced motion: no glide, no flights.
- **Draws made while moving are complete at once** (no fade-in); a change made at rest fades as before. The
  draw at rest repeats (at most three times) until label placement agrees with itself.
- **One reading of the page per draw**: `rect()`, the reader's width and the welcome note are measured once
  per draw (`measured`, `LAY`). While the canvas is moved, `rect()` answers from the last draw.
- **Start-up**: draws asked for behind the loading curtain are made at most five times a second.
- **Check**: `tools/feel/check-map.mjs` ("the map in motion" in `pnpm verify`), two breakages in
  `tools/verify/break.mjs`. `tools/v25/geography_check.cjs` and `authorities_check.cjs` were updated for the
  new handlers. Numbers: `node tools/feel/measure.mjs <page> --only map,case,startup`.
- **Known**: the top bar's always-running animations make the browser re-compose the page every frame, at a
  cost that grows with the number of map elements; on a slow machine that is most of what a moving frame
  costs. During a fast zoom the picture is the last draw magnified, so text is soft until the next draw.
## Calm (branch `v32-calm`, 18 November 2026; not merged, not published)

The page is at rest when nothing is happening, panels arrive and leave with a short motion that can
be interrupted, and every control answers a press. No layout, size, colour or content change at rest
(the exceptions are listed in the commit message). Read `src/features/calm/calm.js` and `calm.css`
first; the motion tokens are in `src/features/v31/tokens.css`.

- **Rest.** Home and an open case now cause 0 layouts a second (65 before). The fuel gauge's and the
  version label's bright band are a window sliding over a second copy (two transforms, run by the
  compositor: `fuel.js`/`fuel.css`, `r20.js`/`hud-font.css`); the Cold Call vapour is 18 CSS-animated
  puffs per button, no canvas, no requestAnimationFrame (`frost.js`/`frost.css`); the clock shows
  each character by sliding a strip, so a tick lays nothing out (`clock.js`); Dottie's blink is a
  0.42 s fill-opacity fade every 5.2 s (`dottie.js`, `ask.css`). The 200 ms and 500 ms timers are gone
  (`DKLACalm.after`), and the Cold Call observer watches `#inspector`, not the whole page.
  Things learned the hard way: a transform or a group opacity on a shape inside an SVG costs a layout
  per change, fill-opacity does not; `display` toggles and text changes cost a layout, `visibility`
  and a transform on a strip do not.
- **Quiet time.** `html.dkla-ambient-off` (tab hidden, a dialog open, or a wheel turn or drag on the
  map; set by `calm.js`, which only listens to the map) and `html.dkla-moving` (for the map's own code
  to set while it animates, for example a glide after the finger lifts; nothing sets it yet) pause
  every ambient animation in `calm.css`. New ambient decoration must be added to that list.
- **Dialogs** share one flat scrim (`--v31-scrim`, no blur) and fade and scale through
  `@starting-style` and `allow-discrete` transitions; the menu, search panel and reader the same way
  on their `hidden` attribute. A closing panel is already closed for the code (`open` false, `hidden`
  true) and takes no clicks; only its picture lingers for 0.2 s. Checks that wait for a panel to be
  gone should wait for `display: none` or for the state, not sleep.
- **Press feedback**: shared rules at the end of `calm.css` (`:where()`, so component colours win).
  Several components start from `all: unset`, which is why the pressed state is `!important`.
- **Rail**: `reading.js` `placeNow()`; rail clicks use `DKLACalm.scrollTo` (250 ms, stops on wheel,
  touch or key).
- **Loading lines**: `calm.js` puts `calm-wait` on any `role="status"` line in a dialog that starts
  with "Loading"; nothing shows for 150 ms, then a skeleton.
- **Checks**: `tools/feel/check-calm.mjs` ("calm: rest, transitions and press feedback") with ten
  breakages in `tools/verify/break.mjs`; `tools/v31/check-case.mjs` asserts the rail's mark;
  `tools/fuel/check-browser.mjs` checks the new sweep. Benchmark: `tools/feel/measure.mjs`.
- **Still to do**: the map's own animations (button zooms, any glide) should set `dkla-moving` on
  `<html>` while they run; the
  reader's way out starts only after the map has refitted (the refit blocks the page for a moment
  when the reader closes; that is map work); `pnpm views:update` on the owner's PC (dialog scrims are
  no longer blurred, so every picture with a dialog changes slightly).
## Main-thread work (19 November 2026, branch v32-work, not merged or deployed)

Read this with the v3.1 section below. Goal: no freeze at start-up or after an action, nothing a feature does
changed. Measured with `tools/feel/measure.mjs`; checked by `tools/feel/check-work.mjs` ("no freezes" in
`pnpm verify`), with breakages in `tools/verify/break.mjs`.

- **Search index** (`src/runtime/dklaR13Search.js`): built once, after the atlas is shown, in slices of about
  6 ms (`work()`, `advance()`, `pump()`); `rebuildIndex()` only marks it stale and the next pass replaces the
  documents whose text changed (`remove` + `add`). A search finishes any remaining work first (`ensure()`).
  `DKLA.searchIndexStats` says how it went; `DKLA.searchHits` and `DKLA.searchReference` are for the checks.
- **Saving** (`src/runtime/civilCode.js`): the graph goes to IndexedDB as it is (no JSON copy first) and the
  transaction is committed explicitly. Camera moves, opening an entry and reader scrolling no longer write
  the graph (`deferPersist` is redefined there; `r7ViewChanged` falls back to a full save if `r7Print()` shows
  anything but the view changed). An edit is written after 250 ms as before; start-up corrections wait for an
  idle moment. While an edit's write is unconfirmed the unload guard asks before leaving
  (`r7EditUnconfirmed`, used in `appCode.js`). Found on the way: before this, an edit made in the last
  quarter second before a reload was lost every time (the write was never committed).
- **Start-up**: the seed is parsed once (`saved-work.js` hands it to `appCode.js`).
- **Cold Call** (`src/features/cold-call/`): the matcher compares plain forms as text instead of building a
  pattern per form (same links on every narrative); the two tables compile in the background; the reader
  marks the first episode at once and the rest right after it is shown (`markRest`); hover delay 120 ms.
- **Dictionary** (`src/runtime/dklaR12Glossary.js`): terms and definitions are normalised once; a keystroke
  redraws only the list, a pick only the article; one click listener for the dialog.
- **Search box**: results 16 ms after a keystroke, not 75 (`studyCode.js`, the only change in that file).
- **Lazy data** (`src/features/performance/data-loader.js`): large blocks are fetched, checked and stored by
  a worker made from in-page code, decoded a megabyte at a time, parsed in the worker (`json()`), and their
  text is held beside the element (reading `textContent` returns it) until the window is not in use, the Save
  menu is used or Ctrl/Cmd+S is pressed. `DKLAData.request(id)` brings a block without reading it.
- **Still there**: one write of the whole graph per visit (about 40 ms; 160 ms on a 4x slower machine),
  because five start-up layers (fit, rules22, rlcc, plain, audit) report changes on every start even when the
  stored graph already has them; the map draw path (not part of this work); the boot copy of the graph
  (`data = clone(base)` in `appCode.js`).

## Latest (18 November 2026, v3.1)

Read this first; the sections below it are older.

- **v3.1, "The Reading Room Update"** (served file `DKLA-v3.1.html`; `DKLA-v3.0.html` and every
  older address redirect). Built from the owner-approved design audit (Design canvas "DKLA design
  audit — before and after", 18 November 2026). What changed:
  - **Design rules**: `src/features/v31/tokens.css` holds the five text styles, the colour roles
    (blue = clickable, course colours = which course, movement colours = how a case moved the rule)
    and the reader width (`--reader` widens to `clamp(560px, 100vw − 360px, 1180px)` at ≥1024 px;
    the map already fits the selected entry into the space left: `readerWidth()` in studyCode.js).
  - **Case page**: `reading.js` `caseOrder()` owns one order (rail, header, the rule, "Where this
    case sits", the brief, connections, unknown blocks, sources drawers, study). It reorders only
    when the order differs and at most 8 times a frame, so modules cannot fight over a block. The
    old "timelines after the summary" rule was removed because it fought the new heading (that
    loop froze the page in testing; `tools/verify/break.mjs` now re-creates it as a breakage).
    Notes move into a "Case notes" drawer; the section links are hidden behind the rail. Styles:
    the v3.1 sections at the end of `src/features/v25/reading.css`.
  - **Timelines**: `timelines.js` `panelHTML()` draws an axis of every entry (position is 55% date,
    45% order) and the neighbours with notes; the 12 moves map to 5 families (`FAMILY`). The full
    view marks the open entry (`v31-here`). Styles at the end of `timelines.css`.
  - **Flowcharts**: `flowcharts.js` `stepsCiting()`/`pathTo()` give each entry the steps that cite
    it and the path to them; the case card is `chartStepsHTML()`. Charts open at a step with
    `#flowchart=K-16&step=c&from=citoh`; the walkthrough has a path column, the decision and typed
    sources, and "Back to" the case.
  - **Dictionary**: `dklaR12Glossary.js` `defHTML()` splits a definition into a lead sentence,
    paragraphs of up to two sentences and a list of its " - " examples, keeping every word.
  - **Sol's canon index and lecture notes** (commit f594f380, merged into v3.1): the case order puts
    `.canons-related` under "Where this case sits" and `.lecture-related` under Sources; the rail
    lists Canons; `canons.css` and `lectures.css` take the v3.1 tokens.
  - **Trotting opossums**: the Ask Dottie spinner's three opossums run an 8-frame trot (90 ms a
    frame), drawn from a gait study (Virginia opossums trot; they do not bound: spec and sources in
    the session, summary in `docs/ask-mascot/README.md`). `dottie.js` `TROT` holds the frames; CSS
    shows one at a time (`dottie-trot` in ask.css); the ring turns once per 7 strides (5.04 s) so
    planted feet stay put. `node tools/ask/dottie-sheet.mjs --png` also writes the Muybridge-style
    plate `docs/ask-mascot/possum-trot.svg/.png`.
  - **Checks**: `tools/v31/check-case.mjs` ("v3.1 case page") and `tools/ask/trot-browser.mjs`
    ("Ask Dottie trotting opossums") in `pnpm verify`, with breakages in `tools/verify/break.mjs`.
  - **Design review fixes (owner request, 18 November 2026; branches v31-search, v31-dottie,
    v31-lectures, merged):** phone search panel (≤850 px; the owner asked for this exception to
    the no-phone-work rule) and one search index across flowcharts, lectures, canons and LRS
    classes, with type labels and course + class number ranking (`dklaR13Search.js`,
    `tools/search/check-browser.mjs`); Dottie routes named cases/canons/classes to the Atlas first,
    ignores conversational framing, gives a `reason` for every empty answer, and the shared library
    stores fewer questions (`lib/ask/*`, `api/ask.js`, privacy.html); lecture notes for Contracts
    1–24 and LRS 1–22 from the PowerPoints in `added-sources/`, and a "no slides on file" record
    for Contracts 25–26 and LRS 23–26 (category "No lecture slides on file", excluded from the
    indexed classes in `retrieve.js`).
  - **Splash**: 162 lines (73 approved 18 November); `splash.js` `choose()` keeps the last 100 lines
    shown (localStorage `dkla.splash.v1` {last, recent, seen}) so none returns within 100 clicks
    (`tools/splash/pick.test.mjs`).
  - **Fuel gauge** (`src/features/fuel/`, `lib/ask/fuel.js`, `api/fuel.js`): Dottie's spend is recorded
    per OpenAI response in `dkla_ask_spend` (prices in `lib/ask/fuel.js`, from OpenAI's pricing
    pages, 18 November 2026). The share left = (calibrated balance − spend since) / starting
    amount. Calibrate after each refill with `tools/ask/fuel-calibrate.mjs`, the admin route, or
    the Vercel env vars DKLA_FUEL_BALANCE_USD / DKLA_FUEL_START_USD / DKLA_FUEL_AT (the newer
    point wins). The public `/api/fuel` shows only the share, never dollars. It misses spending
    elsewhere on the same OpenAI credit, so recalibrate now and then.
  - **Whole U.S. Code** (`src/features/v31/uscode*.js`, `uscode/title-*.json`, built by
    `tools/uscode/build_index.py` from OLRC release 119-118; sources in `tools/uscode/README.md`):
    United States Code › All 54 titles browses every title, level and section heading. A title's
    file is fetched (and SHA-256 checked) only when it is opened or an exact citation in it is
    searched; cache `dkla-uscode-v1`. Search adds one "U.S. Code" result only for an exact citation
    ("20 USC 1001"); nothing goes into the search index. Check: `tools/uscode/check-browser.mjs`.
  - **Lazy data blocks (the smaller first load)**: the blocks in `tools/performance/lazy-blocks.json`
    (Cold Call, both Cold Call tables, the dictionary, the audit, the four archives, the textbook
    update and the source texts; about 44 MB) move out of the hosted page into
    `assets/data/<sha256>.json` at packaging (`tools/performance/package.mjs` `hostedRelease`); the
    portable copy keeps them embedded. `src/features/performance/data-loader.js` (`window.DKLAData`,
    placed before the app code) fetches a block on first use, checks its fingerprint, keeps it in
    Cache Storage `dkla-data-v1`, fires `dkla:data`, downloads the rest after boot in list order,
    and makes Save/export wait so a saved copy is complete. Every reader works whether the block is
    embedded or late. Measured (10 Mbps, 4× slower processor): 22.5 → 8.9 MB to the first screen,
    about 26 → 15 s. Checks: `check-lazy.mjs`, `check-lazy-files.mjs`, `check-lazy-a.mjs`,
    `check-lazy-b.mjs` (late arrival per feature). Kept embedded on purpose: seedData, dklaR19Data,
    authorities and We the People (Home draws from them), SCOTUS history and sprite (the Court on
    Home), sourceIndex and PDF routes (every entry's links). Next candidates: the supporting briefs'
    text inside dklaR19Data (5.5 MB) and the authorities' provision text (about 4.3 MB); both need
    `assemble.py` to write them as separate blocks.
  - **Deferred from the review:** per-class offline downloads (the background download now fills
    the offline copy anyway); corrections beside the rule; a request/spending cap on /api/ask (the code has none; Vercel's
    firewall settings could not be read from this session).
  - **Behaviour change to know**: with the wide reader the map zooms out to fit the selected entry
    into the strip, and keeps that zoom when the reader closes, so it may show a subject's summary
    ("+5 more") instead of its case cards until you zoom in.
- **Still to do on the owner's PC**: `pnpm views:update` (the case, timeline, flowchart and
  dictionary pictures all changed).

## Earlier (12 November 2026, v3.0)

Read this first; the sections below it are older.

- **Owner's standing design rules**: DKLA is a landscape desktop atlas (iPad
  landscape at most). Never spend effort on phone or portrait layouts. Keep
  the Home design language (course trees with connection lines, the SCOTUS
  building, the Rules & authorities books); improve proportions within it.
- **Home after owner review**: "Today without the D" (`src/features/v25/
  home-variants.js`, variant 1 is the default; localStorage `dkla.homeVariant`
  = 0 restores the old arrangement, 2-5 are prototypes); the books stay near
  natural proportions (at most 25% taller). The calm top bar
  (`src/features/topbar/`) moves Save, Study, SCOTUS and Privacy into the ☰
  menu; the splash line sits in its slot beside the clock. The version label
  is a HUD-style Orbitron readout (`src/features/v26/hud-font.css`). The big
  monogram (and its hidden analytics link) is gone from the map; the admin
  dashboard is at dkla.dev/admin.

- **v3.0** (served file `DKLA-v3.0.html`; every older address, v2.9 included,
  redirects). Built by agent swarms in one session and merged on
  `claude/ask-dkla-mascot`. What changed:
  - **Home**: courses on top, the DKLA mark centred, Rules & authorities and
    SCOTUS History below (`src/features/r19/r20.js` MARK/LOWER/ARR,
    `src/features/v25/geography.js`); "Civ Pro" as the display title
    (`src/features/v26/typography.js`, data keys unchanged); Notes moved to the
    LRS row. Minecraft-style splash text on the mark's corner
    (`src/features/splash/`, 88 owner-approved lines in `lines.js`).
  - **Fonts**: owner's option F — Exo 2 (display) and Inter (interface and
    reading), embedded (`tools/v26/embed-fonts.mjs`, `TYPOGRAPHY.md`); the
    clock uses JetBrains Mono (`src/features/clock/clock-font.css`).
  - **Clock**: two-row split-flap NY time and date (weekday, month, day flaps),
    an hourly Solari cascade, a static NYC label with a green light; shown from
    1360 px.
  - **Ask Dottie**: 50 px Dottie hanging from the bar; routing is an allowlist
    of question shapes the Atlas answers alone (`route()` in `lib/ask/web.js`),
    everything else researches the web; server checks drop substitute and
    wrong-kind paragraphs (`lib/ask/answer.js`); streaming progress, warm-up,
    prebuilt retrieval index (`work/build/ask-index.bin.gz`), cancel; the
    spinning-possum thinking line. "Save answer" keeps answers in the browser
    (`src/features/ask/saved.js`, key `dkla.askSaved.v1`); a shared library
    reuses identical first questions for 90 days (`lib/ask/library.js`, table
    `dkla_ask_answers`; versioned by corpus and code; privacy.html says so).
  - **Cold Call definitions**: hover/tap cards from the swarm's 708-term table
    (`tools/cold-call/glossary-terms.json`, `src/features/cold-call/glossary.js`).
  - **Search**: each result says where it matched; a "Show me" strip in the
    opened entry (`src/runtime/dklaR13Search.js`).
  - **Updates**: quiet update system (`src/features/r19/sw.template.js`,
    "offline install and updates" in `src/runtime/dklaR18Study.js`,
    `index.template.html`); checks `tools/r19/check_updates.mjs` and
    `check_migration.mjs` (the real v2.9 worker and page, then a renamed file).
  - **Erie voting record**: Butler and McReynolds corrected at run time to
    "Concurred in judgment" with notes (`src/runtime/dklaR16HistoryCode.js`),
    owner-approved; Ask's SCOTUS records apply the same list
    (`VOTE_CORRECTIONS` in `tools/ask/build.mjs`): change both together.
- **Still to do on the owner's PC**: `pnpm views:update` (fonts, Home, clock,
  search and Cold Call pictures all changed; Linux has no recorded pictures).
- **Not verified here**: real OpenAI answers (all tests mock it), Vercel's
  request handling for Ask (a test reproduces Node's behaviour), Safari/iOS
  and Firefox, a real database for the answer library.

## Latest (15 October 2026, v2.7)

Read this first; the sections below it are older.

- **v2.7 released** from a cloud session (served file `DKLA-v2.7.html`; the
  v2.6 address redirects). What changed: a multidistrict litigation timeline
  (`mdl`, nine steps, Civil Procedure) in `tools/r19/data/timelines.json`;
  recall drill cards show the "In plain English" takeaway with the holding
  (`src/runtime/dklaR18Study.js`); a `#node=` deep link opens the entry after
  boot (`src/features/v25/boot.js`); start-up work cut: `saveCache` in
  `src/runtime/civilCode.js` folds the layers' saves into one deferred
  snapshot, `regionTally` in `src/runtime/studyCode.js` counts the cards at
  most four times a second, and the seven content layers that re-ran on fixed
  3-second timers now register in `window.DKLALayers` and run once from
  `boot.js` before the curtain lifts; the slow-loading notice waits for a
  stall (no readiness condition changing for 12 s) instead of a fixed 12 s.
  Report for the owner: `/mnt/project-files/dkla-audit/v27-timeline-audit.md`
  (in the project's shared folder, not the repository).
- Measured in headless Chromium before and after (same container): main
  thread busy 12.6 s in 54 long tasks before, 7.0 s in 23 after; the curtain
  lifted at 12.4 s before, 9.5 s after. The page is still one 65 MB file
  (19 MB compressed); splitting the source texts and page images into
  on-demand files is the next large start-up win and is not a hotfix.
- Earlier the same day (commit `4014cf04`): the search index is built once at
  start-up instead of sixteen times (`src/runtime/dklaR13Search.js`).
- Still waiting for the owner: everything in the 13 October list below.

## Latest (13 October 2026, later the same day)

Read this first; the sections below it are older.

- Pushed and confirmed live earlier today: the picture check and the move to
  `src/features/` (GitHub check passed, Vercel deployed, live build stamp
  matched). The owner then uploaded 32 course files to `added-sources/`
  (commit `c548102a`).
- **Committed locally on the live branch, not yet pushed** (everything after
  `c548102a`): the 32 files recorded in the content inventory; `pnpm coverage`
  and `pnpm lint:survey` and the ast-grep removal tool; 22 dead earlier
  versions of functions removed; the review plans in
  `docs/new-sources-review/`; Civil Procedure on the October 1 syllabus;
  session cards in each course. `pnpm verify` passes 44 of 44.
- Restore points (local tags): `session-start-2026-10-13b`,
  `pre-dead-code-2026-10-13`.
- **Still waiting for the owner:** the `improve/server` branch (now several
  commits behind; rebase before use); whether the 32 new files may be
  published (they are NOT in `tools/public-files.json`, so session cards
  carry no slide links); the "Conflicts to settle" lists in the three review
  plans.
- **Not started:** applying the review plans to the atlas content (new entries
  and deeper existing entries). That is the next large piece of work. Follow
  the pattern the session-cards work used for corrections (run-time edits over
  the open graph, see AGENTS.md), keep every sentence tied to a slide or page,
  and never publish an answer to a slide question as the professor's answer.
- Found and left alone: a cold `#node=` link lands on Home instead of the
  entry (older than today); `mergeGraph` and `D` are referenced in
  `src/features/v25/practice-filter.js:105` and `geography.js:335` but are not
  visible there, so those two guarded branches never run (see
  `docs/lint-survey.md`); ten more replaced-before-run functions the removal
  tool refused (listed by `node tools/codemods/remove-dead-versions.mjs`).

## State

- One working folder: `C:\Users\danie\Projects\DKLA`. The old OneDrive copy
  held nothing unique; Danny was told he can delete it.
- Live branch: `claude/atlas-design-content-audit-m1cw9x`. A push to it makes
  Vercel build and deploy dannykind.wiki and dkla.dev. Agents cannot push from
  this machine (no stored GitHub login); Danny pushes with GitHub Desktop.
- **Not yet pushed** when this was written: `ad658b95` (the `package.json`
  fix) and the commits after it (the picture check; the move to
  `src/features/`; this note). After the push, confirm the three things
  listed below.
- **Waiting for Danny's say-so:** the local branch `improve/server` (one
  commit on top of the move). See "The server branch".
- `pnpm verify` builds and runs 44 steps in 30 to 50 seconds.
  `pnpm verify:teeth` breaks eighteen things on purpose and requires the pass
  to fail each time (about twelve minutes).
- Tools are not on PATH. Each shell call needs
  `%LOCALAPPDATA%\dkla-tools\node` prepended to PATH and `DKLA_PYTHON` set to
  `%LOCALAPPDATA%\Programs\Python\Python312\python.exe`. Git is inside the
  GitHub Desktop installation (and on PATH in Git Bash). Run `pnpm` from
  PowerShell or cmd; from Git Bash it fails to start.
- After a push, confirm three things: Vercel's status and the check run for
  the commit (public GitHub API; failed steps appear as annotations), and
  `https://www.dannykind.wiki/version.json` showing the new build.

## What changed in this session

1. **Wider browser coverage.** `tools/verify/views.spec.mjs` opens fifteen
   main views at a desktop and a phone size, checks each holds what it should,
   and compares it with a recorded picture (`tools/verify/views/win32/`).
   25 runs in a row matched. Three new breakages in `break.mjs` (the reading
   layout never installing, and two looks only a picture can catch) are all
   caught. `tools/verify/README.md` explains how to re-record after an
   intended visual change (`pnpm views:update`).
2. **Shipped feature code moved to `src/features/`.** The ordered list is
   `src/features/manifest.json`. Datasets, build scripts and checks stayed
   under `tools/`. The built page differs from before only in the 36 path
   comments that mark each module and in the build stamp.

## Session cards and the October 1 Civil Procedure syllabus

On the branch `feature/session-cards`, not merged and not pushed. Danny asked
for both.

**Built**

- **Session cards.** Opening Contracts, Civil Procedure or LRS now shows a
  strip of cards on that course's map: 26 reading assignments, 14 syllabus
  weeks, 26 classes. A card has the number, the date where the syllabus gives
  one (Contracts gives none), the title and a line of the reading; it opens
  the view that already existed for that session. Code:
  `src/features/sessions/sessions.js` and `sessions.css`. The cards are built
  from the schedule records already in the graph; nothing was copied. The
  strip shows only at course level (the location bar reads "Atlas > course"),
  folds to a small button (remembered in `localStorage` as
  `dkla.sessions.v1`), starts folded on a window under 560 pixels tall, and
  is absent from Home, subjects, the reading panel, SCOTUS History and print.
- **Civil Procedure follows the October 1, 2026 syllabus.** Weeks 6 to 9 were
  re-divided and Eliscu added to week 6. `src/data` was **not** edited (see
  the new note in `AGENTS.md`: a saved copy would hide the change). The
  revision is `tools/sessions/civil-syllabus.json`, applied at run time by
  `src/features/sessions/civil-syllabus.js`; the step "Civil Procedure follows
  the October 1 syllabus" checks it against readings copied from the PDF.
- Three new views in the picture check and two new breakages (16 and 17).

**Remains, for Danny to decide or for a later session**

1. **Eliscu has no map entry.** Week 6 names it in its text and the brief
   `CP-034` (T. B. Harms Co. v. Eliscu) is on file, but the week's case list
   cannot link it. That "Eliscu" means that case is an inference: the syllabus
   prints one word and no page.
2. **The syllabus pages shown in the atlas are still September 3** (four page
   images and the PDF link). They are labelled as such. Replacing them means
   new page images in `src/data/civilArchive`, a fifth page in
   `openCivil` (`src/runtime/civilCode.js`), and publishing
   `added-sources/Syllabus 10_1_2026.docx.pdf` through
   `tools/public-files.json`, which is Danny's decision.
3. **Proposed, not printed in the syllabus:** the titles of weeks 6 to 9, their
   casebook page spans, and listing the venue entries under week 8
   ("Continuing venue") as well as week 7. All are listed in the dataset
   under `notPrinted`.
4. Left alone, wrong regardless of the new syllabus: week 14 still says Cross
   "remains a visible gap", week 10 and 14 point at the stub notes
   `cp-berk-gap` and `cp-cross-gap` although `cp-berk` and `cp-cross` exist,
   and the Help text says the same.
5. Not built: marking today's class or week on the strip, the lecture or
   cold-call letter (S / L) on Civil Procedure cases, slide decks on LRS
   cards, the review-session card proposed in
   `docs/new-sources-review/civil-procedure.md`.
6. On a wide window the open strip covers the dimmed "Study workbench" tile
   at the foot of the Contracts map. Folding the strip uncovers it.

## The server branch (`improve/server`)

Code and tests only; nothing was run against the live database, Neon or
Vercel. It must not reach the live branch until Danny agrees, because on its
first start it creates one bookkeeping table (`dkla_migrations`) there.
`tools/analytics/README.md` on that branch describes all three changes:

- Database structure as numbered steps; a starting function reads one number
  instead of re-sending the whole structure. Step 1 is the old `schema.sql`.
- The server reads a 0.4 MB entry list on first use, not the 1.46 MB dashboard
  catalogue at every start. The two committed catalogue copies are removed.
- The rate limiter writes less often. Strict limits are unchanged.

What nobody has checked: that Neon reports a missing table with the code
`42P01` the way the test database does (the first start depends on it), and
that Vercel packages `lib/analytics/entries.json` and
`lib/analytics/migrations/` with each function (`vercel.json` lists them).
Check both on a Vercel preview with an isolated Neon branch before production.
To merge once agreed: rebase or merge `improve/server` onto the live branch,
then `pnpm verify`.

## Next

1. Push, and confirm the deployment as above.
2. Danny's decision on the server branch; then the preview check described.
3. Pictures for GitHub's Linux runner. It has none, so there the views are
   opened and checked but not compared. Recording them needs a run on Linux
   (the workflow could upload them as an artifact to commit).
4. Seen while recording pictures, not changed: at 390 pixels wide the search
   box in the top bar is a small empty square until touched, and "Privacy" is
   cut off at the right edge.

Leave for later unless the owner asks: renaming one-letter variables,
removing the dead earlier versions the survey lists, collapsing the override
chains into real modules, untangling the style sheets, regrouping the JSON
files, giving the `src/features/` folders names that say what they hold.
Two data files still mention old `tools/...` code paths in their notes
(`tools/r19/data/rules22.json`, `tools/v25/practice-filter.json`); they are
pinned content and were left alone. `tools/r19/integrity.json` is an old
record nothing reads.

## Things that went wrong, so they are not repeated

- A stray comma in `package.json` passed every check (they are started with
  node directly) and failed the real deployment. `check_config.mjs` now
  catches it. Run `pnpm verify`, through pnpm, before handing over a push.
- Thirteen browsers at once starved GitHub's small runners; the runner now
  budgets by processor count.
- Two steps with the same name silently ran as one; the runner refuses
  duplicates.
- Files saved with Windows line endings fail the build's block comparison.
  Everything is LF (`.editorconfig`).
- One pass hung for over five minutes with no output and was never explained.
  If `pnpm verify` sits silent for minutes, investigate rather than rerun.
  One cause found this session: a browser wait with no time limit, when a
  feature never installs. Give every wait a limit.
- Replacing `tools/v25/geography.js` in text also hit
  `tools/v25/geography.json`. When renaming paths in bulk, match whole names.
- Playwright empties its output folder when it starts. Two Playwright steps
  must not share one (the Home check uses `test-results/`, the picture check
  `work/views/`).

## Flowcharts in 3.2 (flowchart engineer's block; branch `v32-comp-b`)

What the flowcharts do now, and where each part lives. All of it is in
`src/features/flowcharts/flowcharts.js` and `.css`; the check is `tools/flowcharts/check-browser.mjs`.

- **One arrangement of the whole map** (`graphLayout`, `graphHTML`). Answers share the left reading
  edge; each carries "→ 16 title" for the step it leads to. An answer that is the *only* way to an
  outcome has that outcome beside it, 460 px wide, with its cases named; an outcome several routes
  reach stays in one place. The `flow=a` / `flow=b` switch used while the two were compared is gone.
- **Fit** (`composeOverview`). A chart that cannot be read at the size it fits is not shrunk: it is
  recomposed left to right for the window, by rule from its data (the rule is the comment over the
  function). 93 of the 115 charts at 1440 × 900; the other 22 fit at reading size and are untouched.
  Selecting a mark or a region calls `look`, which goes into the full-size map there without changing
  the reader's step. Lines in the overview are plain curves, not routed.
- **Phones** (`outlineHTML`, under 700 px). "Whole map" is one list read downwards: named
  destinations, "N routes meet here, from …", the way back to the step an answer was on. There is no
  zoom on a phone. The wired chart and its checks run at wider widths.
- **Walkthrough words.** "Your 2nd decision · chart step 14": only steps with more than one answer, on
  the reader's own part of the trail, are counted (`decides`). A chart opened at a step shows "One
  route to this step"; "Your path" is only what the reader chose (`active.lead`).
- **A sentence under an answer** (`deciding`): the opening sentence stored for the step the answer
  leads to, only when it states something; an instruction is not shown there. The same rule is in
  `tools/flowcharts/deciding-gaps.mjs`, which writes the packet of forks left with nothing
  (`node tools/flowcharts/deciding-gaps.mjs <folder>`). If you change one, change both: the browser
  check compares them on LRS-15.
- **Case card** (`artHTML`, `standing`). A drawing is a button; its card shows the case, the sentences
  of the step's own stored explanation that name the case (verbatim, found by party name), and "Open
  case". Nothing on the card is composed. Where the step's text does not name the case the card has
  no sentence: that is a content gap.
- **Back.** Leaving a chart for a cited entry records the place (`active.left`); the browser's Back
  and the app's own arrow (`#studyBack`, and the phone strip's `[data-v32-back]`) both return to the
  same chart, step, view, zoom and scroll. The address follows the step (`settle`, by
  `history.replaceState`), so a reload returns to it.
- **The check** measures from what is drawn: on every chart each answer's wire starts at its answer
  and lands on the step the data names (directly or through the bar where routes meet) and passes
  behind no other step; on every chart the phone list names every answer's step; at Fit no name or
  label is cut or outside the view.

Known and left: `tools/v32/check-chrome.mjs` fails on the joined build at "the empty palette" (the
palette has a `coldcalls` row the check does not expect); `tools/v32/check-cards.mjs` and
`tools/timelines/browser.mjs` also fail there. None is in the flowchart files; see the lead.
The frame's path menu is styled by its id (`#v32Path`), not the class `.v32-path`, because the case
page's list of flowchart steps is also a `.v32-path` (a rule on the class once took that list out of
the page).
