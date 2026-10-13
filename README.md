# Danny Kind Legal Atlas

DKLA v2.6 is an offline-capable law study atlas. The native v2.5 design, legal content,
reading views, dictionary, Cold Call, Study and saved work are preserved.

Install Node, pnpm and Python 3.10+ on Windows or macOS, then run:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm check
pnpm preview --no-build
```

Preview opens at http://127.0.0.1:8766/ and serves the same `dist/` output Vercel
publishes. `pnpm preview` builds first. Local preview is static: it does not proxy
sync or analytics APIs. On Windows without Python on PATH, set `DKLA_PYTHON` to
its executable. Python text mode is forced to UTF-8 on both platforms.

The editable source starts at `src/manifest.json`, with named early JavaScript,
CSS, markup and individual JSON records. Later canonical briefs, authored
narratives, authority data and feature files remain in their existing tools
folders. [Architecture and bounded editing](tools/v25/ARCHITECTURE.md) describes
ownership. [Current agent instructions](AGENTS.md) and
[v2.6 handoff](tools/v26/HANDOFF.md) describe preservation and checks.

This release includes the integrated dictionary spine, Cold Call ice polish, saved-work
and sync-preservation fixes, source-tree extraction, and typography refresh.
`pnpm check:v26` checks the v2.6 preservation gate; `check:stage2` remains the
historical unchanged-app gate and intentionally fails on the new release.

The source-tree stage replaces the monolithic base as editable input. Runtime globals and
wrapper order remain, and the hosted page still embeds the corpus. It makes no
speed improvement claim. Explicit runtime imports, a storage service, demand
loading and offline cache migration are separate next substages.

`work/build/DKLA-v2.6.html` is the current standalone output. Keep it beside the
source PDF/image folders when using linked readings from disk. `dist/` is the
public hosting output. Historical committed release artifacts remain unchanged;
new build outputs are ignored. Current source records and local work are excluded
from hosting, but original PDFs and historical embedded text remain public until
the later source-protection stage. Production promotion belongs to the owner.

Earlier documentation is preserved verbatim in
[README history](tools/history/README-through-stage1.md), with legal review scope
in [v2.4 audit](AUDIT_V2.4.md), [timeline audit](TIMELINE_AUDIT.md) and
[explanation audit](EXPLANATION_AUDIT.md). These distinguish inherited reviews,
source comparisons and mechanical checks.
