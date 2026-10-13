# v2.6 targeted typography cohesion

The owner's latest feedback specifies two roles. Orbitron supplies branding,
navigation, top buttons, section titles, SCOTUS seat/justice names, Notes and
Supporting cases. Original Segoe-style system sans supplies dense course labels
and case reading, matching the supplied Drennan screenshot. Edit the small
typography.css for these rules. Legal reading remains 16px/1.75; intentional
We the People facsimiles and code references retain their identities.

Only Orbitron is embedded in the active runtime, including its full OFL notice.
The earlier Space Grotesk asset, license and font wrapper remain locally as
provenance, are inactive, and are excluded from publication. No external font
request is needed. See assets/README.md for upstream font hashes/licenses.

typography.js is a bounded classic presentation module immediately before the
final boot module. All 11 original SCOTUS seat IDs, accessible labels, actions
and card rectangles remain. Seat words wrap within existing card bounds at
roughly 14px desktop size; the optional Created YEAR caption reads existing data.
Metadata requires at least 62px card height and a bounded baseline. Compact
names remain visible despite the old tiny-text fade, and their baselines account
for descenders. Font readiness redraws fitted labels.

The requested Three courses/Scroll in helper and Court membership/seat
lineages/case votes caption are removed only from the main view. Contextual
hints recover their previous visibility elsewhere. Only the main course heading
says LRS; internal full course names, IDs, links and data remain. Repeated refresh
does not accumulate the original two-line heading's vertical offset.

## Exact final evidence

Build v2.6-4489b9e84b; canonical SHA-256
2916290230b10e9c72ba3c8120724621165d212a44d2329b4de92f87e1a1ad9e;
hosted SHA-256
4db9fbfb634468b98de35a0e140baed8177970b8952c2b6834c5ab08b9f4a6a3.

../typography-evidence/cohesion-4489b9e84b/ contains home, full SCOTUS,
case, Cold Call and Drennan screenshots at desktop 1440x900, landscape 844x390,
and portrait 390x844. The typography report passes with zero page errors:
loaded Orbitron, every named display selector's computed family, readable
system-sans dense/case roles, removed helpers, main LRS heading, all 11 seat
names actually visible, label fit before/after reload, repeated refresh, restored
contextual hints and all 33 seat keyboard activations. Justice names are Orbitron
600 at 18px desktop/landscape and 16px portrait; Drennan heading/body are system
sans. Projected card-height stress cases 42/54/61/62/70px all keep text in bounds.
The native-home overlap/clipping audit passes all three viewports with zero issues.

Whole-map seat text measures 13.36-14px desktop, 5.94-10.50px landscape and
5.21px portrait. The original portrait card is about 33x9px; it remains a compact
overview, with map zoom and the readable full SCOTUS view supplying detail.
This does not claim comfortable reading at every whole-map zoom level.

Run the check against the current loopback preview:

    node tools/v26/typography-evidence.cjs http://127.0.0.1:8772/DKLA-v2.6.html ../typography-evidence/final

Disposable contexts block external/API requests and use synthetic storage.
The parent owns the complete release gate, 29 smoke checks, geometry comparison,
independent review and publication. Full cached-source offline coverage, live
sync, exhaustive accessibility/legacy recovery/portable export and legal accuracy
remain outside the typography check. No legal/source data, storage or exports
are edited by this presentation module.

## Owner brief, 13 October 2026: the Court's west front

This supersedes the seat paragraphs above for the map block. The owner asked
for the SCOTUS History block to be drawn as the Supreme Court building.
`court()` in typography.js draws, inside the block's original bounds, a
pediment with nine abstract figures after the west pediment's sculpture group
(an enthroned Liberty with scales, two guardians, councillors, a reclining
figure in each corner), the Orbitron title on the frieze, eight columns (as
on the building, so the two end seats stand outside them) and steps. Labels
read "Todd's / Seat" so the name is plainly the seat's. `.sh-block-bg` stays as the invisible bounds and click target.

Nine bays hold the seats that exist on the data's roster date, each with its
sitting justice's portrait from the embedded sprite above the seat name. They
sit in bench order: the Chief Justice in the centre, the senior associate at
the Chief's right hand (the viewer's left), then alternating outward by first
service date. The Iredell and Catron lineages are removed from the map only;
the History view, seat IDs, labels and actions are unchanged. Seat names, the
Notes label and the Supporting cases entrances use the system sans of the
course tiles, not Orbitron. home-audit.js expects nine seats.

The first-visit note (`#r20Guide`) is restyled here as one slim bar in the
70px strip Home reserves below the map, so it covers no tile or label. Its
markup in r20.js is unchanged. how-to-use.html was rewritten for v2.6 with two
real captures in `guide/`.

The two columns at each end are square piers and the middle four are round,
as built. The trail (Atlas > course > subject) and its Atlas button use the
system sans.

Checked with the real build (pnpm build, pnpm check and pnpm check:v26 all
pass locally) served by tools/preview.mjs: Home, zoomed in, bench order and
labels read from the DOM, a seat activation, and the note's bounds against the
map and the save status. Not run for this change: the 29 smoke checks,
typography-evidence.cjs (which still asserts eleven Orbitron seat names) and
the phone viewports.

### Later the same day: both fronts, sculpture and statues

The owner asked for the building to join its two fronts. The pediment now
carries the east pediment's group, "Justice, the Guardian of Liberty" (Hermon
MacNeil), in the order of the Court's information sheet (10/12/2021) and its
photograph, left to right: the hare; study and pondering of judgments; a
shield (disputes between states); the means of enforcing the law (a man and a
youth bearing the fasces); Confucius; Moses, seated, a tablet in each hand;
Solon; justice tempered with mercy, with a youth; a shield (maritime and other
functions); a tribute to the Court's supreme character; the tortoise. The
west front's two statues by James Earle Fraser stand on pedestals at the ends
of the steps: Contemplation of Justice on the left (a book of laws under her
left arm, a small figure of Justice in her right hand) and Authority of Law on
the right (the tablet of laws with the sheathed sword behind it). The walls
stand in from the block's edges to make room for them. All eight columns have
Corinthian capitals.

Every figure is a link in its own layer above the block (`.dkla-court-links`),
outside the block's click target: Moses, Confucius, Solon, The Tortoise and
the Hare, Contemplation of Justice and Authority of Law open their Wikipedia
articles; the allegorical groups open the article on the building.

Checked on the real build: pnpm check and check:v26, the 29 browser
interactions, Home at nine window sizes, and a headless test that figure
links open the right address without opening SCOTUS History while seats and
the roof still open it. Looked at in screenshots at 1440x900.