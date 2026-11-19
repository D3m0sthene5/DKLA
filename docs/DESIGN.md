# DKLA design language: v3.2 "Instrument"

The owner's brief, in his words: it should look like "a spaceship from the future", not through
"fancy gimmicky fonts", and feel like an iPhone; there is "a ton of information overload"; it looks
"sloppy and unprofessional and un-Jony-Ive"; it needs a "woah factor" while making clear "the
power of this puppy". Standing rules that do not change: the dark theme, Exo 2 and Inter, the Home
map's language (course trees joined by connection lines), a landscape desktop atlas (iPad landscape
at most). `src/features/v31/tokens.css` holds every value named here.

## The idea

DKLA is one precision instrument. Content is lit and chrome recedes. Every view has one hero and
one primary action. The app shows its depth with counts and small readouts, not by showing
everything at once. `docs/PHILOSOPHY.md` gives the research behind these rules. The "woah" comes from precision: nothing misaligned, nothing redundant, one
light source, and a few small instruments drawn with care. Reduce until only the necessary remains,
then make what remains perfect.

## Rules

1. **Three planes.** Ground (the map), panel (the reader, cards on the map), overlay (dialogs, the
   menu, the palette). A plane is told from the one below by one fill step (`--v31-ground`,
   `--v31-panel`, `--v31-raised`) and its elevation (`--v32-e0/e1/e2`: a top-edge highlight and a
   shadow below). Never by a thick or coloured border.
2. **One boundary per group, never a box in a box in a box.** A boundary is the strongest grouping
   cue (Bae and Watson 2014), so every group that must read as a unit gets one hairline
   (`--v32-hair`) or one fill step, and at least twice the gap outside it that it has inside.
   Enclosures nest at most two deep. A row is never bordered.
3. **Each colour has one job** (the v3.1 rules, plus these). Blue (`--v31-link`) is anything you can
   click. A course colour is an identity mark only: a 3 px spine or a dot, the course's title, the
   Home tile tint. It is never the text colour of headings inside a card and never a border round
   every item. Amber (`--v31-here`) means "you are here" and nothing else. The cyan HUD glow
   (`--v32-hud`) belongs to the instrument cluster (clock, fuel, version) and nothing else. The
   liquid-nitrogen frost belongs to the control that opens a Cold Call, at most once per screen.
4. **Type.** Five styles plus the reader's body: title (Exo 2, 30-34), heading (19, or 22 for a
   dialog title), body (16), reading (17/28), interface (14, small 13), label (12). Exo 2 is for
   case, dialog and course titles and large numerals only. Inter is everything else. JetBrains Mono
   is for citations, counts and readouts, with `font-variant-numeric: tabular-nums`. Weights 400,
   500, 600 only. No capitals-only labels except the instrument cluster's readouts. Three text
   colours: `--v31-text`, `--v31-muted`, `--v31-faint`; rank comes from size and weight first.
5. **Scales.** Spacing 4 8 12 16 24 32 48 64 (`--v32-s1..s8`). Radii 6 controls, 12 surfaces, 999
   pills. Nothing else.
6. **One of each control.** Primary (filled blue), default (hairline), quiet (text only), chip
   (selectable), frost (Cold Call). All 36 px high with a 44 px hit area, radius 6, Inter 500 14 px.
   Icons are 20 px, 1.5 px stroke, `currentColor`, drawn as inline SVG; no typed arrows, no "×"
   characters, no emoji.
7. **Lists are rows, not pills.** A row is 36 px: a 16 px glyph that says what kind of thing it is
   (case, rule, concept, note), the label, and trailing meta in faint mono (a citation, a count).
   Hover raises the fill one step. Rows share one left edge and one height within a list.
8. **Counts show depth, and say what they count.** Wherever something leads to more (timeline
   entries, flowchart steps, canons, terms, sources, supporting cases), show the number with its
   unit ("2 steps", "5 cases · 4 rules"), in mono at 13 px or more in the muted colour, 4.5:1 or
   better. Never a bare number, never faint 12 px.
9. **One primary action per view.** On a case it is Cold Call. Everything else is one predictable
   step away and in the same place on every entry.
10. **Motion** follows the calm tokens (`--v31-t-press/pop/panel`, `--v31-ease`). Nothing new
    animates layout, runs forever, or uses `backdrop-filter`. `tools/feel/check-calm.mjs` and
    `check-map.mjs` must keep passing: zero layouts a second at rest.
11. **Alignment.** One 24 px page gutter. One left edge per column, shared by every reader. Every
    dialog has its title and its close button in the same place. Optical details count: icons sit
    on the text's baseline, numerals line up in columns, a glyph's visual centre is centred.
12. **Say what happens.** A label names the result of pressing it. "+ 3 more" is a control or it is
    not there. Truncated text ends in an ellipsis and carries the full text as a title.

13. **Pieces of one idea together; room for what is being studied.** A milestone shows its date,
    its authority and what it changed in one place. Whole features need not share a viewport: they
    may follow one another down the page. The view the reader chose leads and gets the space (on a
    Doctrine view the history dominates and the case header compacts); a view never offers "open
    the full version" of the thing the reader just opened. Remove a competing region before muting
    what is inside the one that stays.
14. **Quiet beside the reading.** Whenever a reader or dialog is open nothing moves or glows
    unprompted: the instrument cluster is still and unlit, the splash line and hanging Dottie are
    Home only. Charm goes on the content: a case's pictogram is shown as an illustration.
15. **The map's lines appear on demand, and its territories stay vivid.** At rest only the course
    trees, drawn so the principal paths read; a tile's cross-links show for the hovered or selected
    tile. The three course territories keep recognisable, saturated colour. No vignette. Positions
    never move.

## Editorial standard (the owner's, 19 November 2026)

The rules above can all pass while the screen still fails. The owner's test for every screen: "If
a designer had been handed this exact content and this exact amount of space, would they have
chosen to put the breaks, emphasis, and artwork where they ended up?" If the honest answer is that
the template put them there, keep working.

- **Compose the lines.** A case caption breaks between parties (before "v."), never inside a party
  name the measure can hold, never leaving "v." at a line end; consolidated cases sit one per line
  with the second subordinate. Headings and short text never strand a word (`text-wrap: balance`);
  prose uses `text-wrap: pretty`. A breadcrumb separator stays attached to its destination. Build
  this from the data, never with hard-coded breaks, and it must hold from wide desktop to phone.
- **Size artwork by what the eye can recognise.** A case's pictogram is recognisable before its
  caption is read: 44 to 48 px in a header, with contrast and room; check the drawing fills its
  box. Utility glyphs stay small. A repeated icon that carries no information is removed.
- **Spend space where the content needs it.** A title may be wider than prose. A dense chart gets
  room for its branches; a short list occupies a compact, intentional area. When one element wraps
  awkwardly beside unused space, change the layout before shrinking the type.
- **Make each relationship intelligible where it is shown.** Say what a count counts, what
  question a chart or step asks, and why this entry appears there; show enough of the surrounding
  path to place it. Two tidy cards linking to the same chart still miss the point.
- **Review at 100% scale through a continuous resize**, starting from the ugliest real content
  (the longest caption, the most intricate pictogram, the longest breadcrumb, the sparsest tab).
  For each shared fix keep the failure and the corrected screen at the same viewport and zoom, and
  say exactly what changed. `tools/v32/composition.mjs` finds the mechanical failures; your eyes
  find the rest.

## Look at your own work before you commit

Take a screenshot at 1440 x 900 of the real page and read it (the Read tool shows images). Answer
each of these; if any answer is no, keep working.

- Squint. Does exactly one thing draw the eye first, and is it the right thing?
- Count the borders. Can any be replaced by space?
- Count the colours that are not a text grey or the link blue. Does each have a job from rule 3?
- Do the left edges in each column align to the pixel? Are the rows in a list one height? Is every
  gap on the scale? (`tools/v32/conformance.mjs` measures this; drive your view toward zero.)
- Is any text under 12 px, or any control under 36 px tall?
- Would this sit comfortably beside macOS System Settings, Linear or Things in dark mode? If a
  part looks like a default web form or a dashboard template, redo it.
- Put the before and after side by side. Is the after calmer, and does it show more of what the
  app can do?

## Working method on the shared build machine

- Two cores, 8 GB, several engineers. One browser at a time. `pnpm build` takes about two minutes:
  iterate on CSS by injecting your stylesheet into the already built page with Playwright
  (`page.addStyleTag`), and rebuild only to confirm.
- Commit after every finished step. The session has been restarted mid-work before.
- Never the full `pnpm verify`; run the checks for what you touched, and update a check that pins
  the old look properly (wait for the settled state; assert the new structure).
- The owner compares pictures on his PC (`pnpm views:update`), so say exactly what looks different.
