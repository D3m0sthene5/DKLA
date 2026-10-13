# Stage 1 safety net

These checks read production content and exercise a **local loopback preview** in
fresh disposable Chromium contexts. They never deploy, rebuild, or access visitor
records. Browser routing blocks all external requests and every `/api/` request,
and service workers are disabled. The browser report records only blocked URL
origins/paths/methods, never query strings or request bodies.

Run from the repository root (Python 3 and Node with Playwright available):

```sh
python tools/stage1/content_guard.py snapshot --output ../stage1-evidence/original-content-manifest.json
node tools/stage1/browser_smoke.cjs --url http://127.0.0.1:8765/DKLA-v2.5.html --output ../stage1-evidence/baseline
```

The manifest covers **all 2,973 original production-tracked files**, rather than a
hand-picked content list: exact Git-blob SHA-256, exact initial checkout SHA-256,
and every embedded script body in every original HTML file. Snapshot once before
editing; do not replace that baseline to make a later check pass. Keep screenshots and exports outside the repository. The frozen manifest and three geometry snapshots are committed under tools/stage1/baseline/ for future sessions. `git status` separately identifies newly added files.

After changes, verify the original files with **only explicitly approved source
paths** exempted. Repeat `--allow` for each exact approved JS/CSS path:

```sh
python tools/stage1/content_guard.py verify --manifest tools/stage1/baseline/content-manifest.json --allow tools/cold-call/frost.js --allow tools/cold-call/frost.css
```

Use the same browser command with the candidate URL and a separate output folder.
It captures desktop 1440×900, landscape phone 844×390, and portrait phone 390×844.
Portrait captures are evidence, not a claim that portrait satisfies the owner's
home-fit requirement. Nonzero exit means a failed assertion, page error, or fatal
runner error; inspect `report.json` rather than treating screenshot existence as
success. `--chrome` can select an installed Chromium-compatible executable.

```sh
python tools/stage1/compare_geometry.py tools/stage1/baseline ../stage1-evidence/candidate
python tools/stage1/content_guard.py compare-html --manifest tools/stage1/baseline/content-manifest.json --candidate /path/to/candidate.html --allow-module tools/cold-call/frost.js
```

`compare-html` defaults to canonical Git bytes, which is appropriate for an
assembler that writes LF. It verifies the identity, order and byte hash of all
45 original script blocks, including all embedded datasets. Only exact explicitly
approved JavaScript module bodies between assembler boundary comments may vary;
JSON and preexisting scripts outside those boundaries remain strict. To compare
against Windows checkout bytes instead, supply `--baseline-source checkout
--baseline-html /path/to/frozen-original.html`. No comparison rewrites or silently
normalizes source bytes. Geometry comparison requires the same camera, original
region coordinates, and other rendered map boxes; only the approved dictionary
painted rectangle is exempt.

The saved-work compatibility fix adds exactly one script, `dklaSavedWork`,
immediately before the original `appCode`. `--allow-saved-work` permits only that
position and the exact current `tools/v25/saved-work.js` bytes; all original
scripts still pass their existing checks. Its small adapter test runs with
`node tools/v25/saved-work_check.cjs`. It never reads or writes localStorage and
does not certify full legacy localStorage graph recovery. Baseline actual-form
owner-note persistence fails; the corrected candidate must pass that assertion.

The assembler changes `dklaR19Data.build`. Use `--allow-release-build` only when
that release-metadata change is intended. This exception replaces exactly one
build token and still compares all other dataset bytes without reserialization.
A fresh LF checkout can also match the exact original Git SHA-256 instead of the recorded Windows checkout SHA-256; the report identifies those original-byte matches. No newline-normalized approximation is accepted. Generated release/worker/version/routing
artifacts still appear as changed in the full checkout guard; inspect those
separately and run the embedded script comparator. Do not broaden source-file
exemptions to cover content changes.

The browser smoke pass exercises native region clicking, `#node=`, `#term=` and
`#book=` routes, dictionary search, an authority/source return, Cold Call reading
and nested full-brief return, SCOTUS history, and Study tab interaction. Some entry
points use the app's existing public navigation API; screenshots and assertions
then check actual rendered controls. Desktop storage tests export master JSON,
restore it through the real import UI, reload, and check IndexedDB
`LegalAtlasPortable` plus the keys `legal-atlas-v1:<graphId>:dkla-r8-rebuilt`,
`dkla.study.v1`, and `dkla.coldCall.v1`. Fixtures are synthetic and confined to a
disposable test browser. The localStorage graph key is checked for unintended changes; in the clean fixture it starts absent. Full legacy graph recovery is **not** exercised. An existing Note is edited using the actual edit form and Save button, with its updated timestamp asserted; exact prose must survive export, import, and reload.
The dictionary Home control is clicked using an actual pointer; the new spine
also receives keyboard Enter and an assertion that its old label is gone.

Limits: this is representative regression coverage, not exhaustive legal,
accessibility, offline, route, or persistence proof. Full portable HTML export and
file reopening, cross-device sync, all source scans/PDFs, every legacy route and
exhaustive keyboard/screen-reader behavior remain untested. The baseline's
embedded legal text is checked for byte preservation, not freshly fact-checked.

Bundled Windows runtime used for the recorded baseline:

```powershell
$env:NODE_PATH='C:\Users\danie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
& 'C:\Users\danie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' tools/stage1/browser_smoke.cjs --output ../stage1-evidence/candidate
& 'C:\Users\danie\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' tools/stage1/content_guard.py verify --manifest tools/stage1/baseline/content-manifest.json
```

The browser requires permission to access the loopback server on this machine;
the restricted shell's `ERR_NETWORK_ACCESS_DENIED` is not an application failure.

## Current stage gate

The exact approved-source/configuration/build gate is below. It permits only the
fixed generated release filenames, and always runs the embedded-script byte
comparison before accepting those outputs. It cannot exempt arbitrary content
JSON or source PDFs. Add no extra path unless that change was explicitly approved.

```sh
python tools/stage1/content_guard.py verify --manifest tools/stage1/baseline/content-manifest.json --canonical DKLA-r18.html --allow api/analytics.js --allow tools/analytics/tracker.js --allow tools/cold-call/frost.js --allow tools/cold-call/frost.css --allow tools/v25/authorities.js --allow tools/v25/authorities.css --allow tools/v25/home-audit.js --allow-config package.json --allow-config vercel.json --allow-build-outputs --allow-saved-work --allow-build-source tools/r19/assemble.py --allow-build-source tools/r19/check.py --allow-build-source tools/v25/runtime-manifest.json --allow-module tools/cold-call/frost.js --allow-module tools/v25/authorities.js --allow-module tools/analytics/tracker.js --allow-release-build --report ../stage1-evidence/working-content-guard.json
python tools/stage1/test_content_guard.py
python tools/stage1/compare_geometry.py tools/stage1/baseline ../stage1-evidence/candidate
```

All three named viewport snapshots are mandatory; a desktop-only folder fails.
The guard unit checks also prove that changed dataset text/whitespace, an
unapproved module, or a changed script identity cannot slip through exemptions.
