# DKLA analytics screen review

Working Overview and Visitor screens for design review. All usage, profiles,
addresses, networks, labels and capacity figures are fictional. No collector,
database, credential or real visitor record is connected. Changes to labels,
watch settings and identity decisions last only until this page is reloaded.

Routes on the Vercel preview:

- `/tools/analytics/preview/index.html#overview`
- `/tools/analytics/preview/index.html#visitor=demo-01`

The atlas geometry and canonical entry titles come from immutable
`DKLA-r18.html`, whose layout is retained by the current v2.5 atlas. This directory
does not modify the production atlas, service worker, sync endpoint or deployment
configuration. It adds no serverless function.

Try date/course filters, chart details, search, sorting, column selection,
the map's visitor filter, labels, activity-calendar filtering, timeline marks,
path replay, speed/scrubber controls, reversible identity-review decisions and
CSV/JSON exports. The live-card timers update in the browser with sample data.

From the repository root:

```sh
node tools/analytics/preview/server.cjs
node tools/analytics/preview/check.cjs
node tools/analytics/preview/build-catalog.cjs DKLA-r18.html
```

Local server: `http://127.0.0.1:4318`. No install or build is required.
