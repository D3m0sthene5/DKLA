# Map audits (revision 14)

Headless Chromium checks of the map's text. Run from this folder with `node <script>` (needs `playwright-core`
and a Chromium; set `CHROME` to the browser path if it is not the sandbox default).

| Script | What it does |
|---|---|
| `err.js` | Loads the atlas and prints page errors and the number of SVG children (183 on a good build; 14 means the old renderer). |
| `audit.js [out] [quick]` | At five viewports (1440×900, 2000×1084, 2560×1300, 1280×720, 400×800), the Atlas floor and each course over several wheel ticks: counts overlapping texts, text spilling out of its box, and text under 9.5 px. Screenshots of failing states go to `out/`, with `report.json`. Target is `TOTAL overlaps 0 overflow 0 tiny 0`. |
| `audit2.js` | Finer sweep: every wheel tick at three viewports, plus three selected entries zoomed out tick by tick with ribbons and pills. |
| `continuity.js` | Samples labels every third of a wheel tick through each course and reports labels that appear, vanish and reappear, and font-size jumps. |
| `flick.js [K|CP|LRS]` | Same sweep, but reads the label engine (`R11.labelState`, `R11.blockedBy`) and names the label that blocked each flickering one. |
| `probe.js WxH node:<id>|scope:<name> <ticks> <key regex>` | One state: prints label keys, opacities, blockers and screen boxes, the number of cards, and the mode of each subject; saves a screenshot. |
| `look.js [out] [WxH]` | Screenshots of the floor, each course at its fit and after 3, 6, 9 and 12 ticks, and a selected entry. |
| `steps.js` | Stepped zoom: wheel notches, a trackpad flick, zoom-out, the + button and Alt+wheel should land on the four levels (atlas, course, subject, subtopic) and nowhere else. |
