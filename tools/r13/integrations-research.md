# DKLA: what other people's code could improve, and what to do about it

26 September 2026. The atlas is one 40 MB file opened from `file://`, so a library must be an inline classic script with no dependencies, no worker files and no `fetch()`; licences MIT/Apache/BSD only. Every candidate was checked on the npm registry (version, date, licence, size after `npm pack`) and, where it mattered, benchmarked in Node on the real `seedData`.

## What the atlas already has (so nothing is added twice)

- Search: `searchEntries()` in `studyCode` normalises every entry body on every keystroke and requires each token as a substring. Measured: 56 ms per query over 1.9 MB of text; a misspelling ("promisory estopel") returns nothing. `/` focuses the bar.
- Export: an Obsidian Markdown vault (one `.md` per entry plus JSON) via `exportMarkdown`.
- Viewer: PDFs render in an `<object>` with `#page=N` links.
- No `@media print` rule anywhere in the file. No flashcard or review scheduling. Citations ("321 U.S. 414") are plain text.

## Decisions at a glance

| Area | Candidate | Licence | Size (min / gz) | Last release | Decision |
|---|---|---|---|---|---|
| Search | MiniSearch 7.2.0 | MIT | 86 KB / 19 KB, no deps | Sept 2025 | INTEGRATE NOW |
| Citations | own regexes, data from freelawproject/reporters-db | BSD-2 (data) | ~2 KB of code | data updated 2025 | INTEGRATE NOW |
| Print | own `@media print` CSS (gutenberg-css as reference) | MIT (ref.) | ~2 KB | 2023 (ref.) | INTEGRATE NOW |
| Spaced repetition | ts-fsrs 5.4.2 (FSRS-6) | MIT | 72 KB / 15 KB, no deps | 1 Sept 2026 | INTEGRATE LATER |
| Wex capture | own bookmarklet + glossary import | LII text is CC BY-NC-SA 2.5 | ~1 KB | n/a | INTEGRATE LATER |
| Case metadata | CourtListener citation-lookup API v4; CAP `static.case.law` | data open | build-time tool | live | INTEGRATE LATER |
| PDF rendering | pdfjs-dist 6.3 | Apache-2.0 | 459 KB + 1.27 MB worker | Aug 2026 | SKIP |
| Citations | @beshkenadze/eyecite 2.7.6 | BSD-2 | 5.4 MB, 5 deps | Jul 2025 | SKIP |
| Search | FlexSearch, lunr, fuse.js, Orama | Apache/MIT | 2.3 MB / 2020, no index / 2 MB | – | SKIP |
| Outline .docx | docx 9.7 | MIT | 1.1 MB IIFE | Sept 2026 | SKIP |
| Palette | ninja-keys 1.2 | MIT | needs lit; 2022 | Jul 2022 | SKIP |
| Layout | d3-force, ELK, dagre | – | – | – | SKIP |

Downloaded to `scratchpad/libs/`: `minisearch/`, `ts-fsrs/`, `reporters-db/` (reporters.json, regexes.json, LICENSE), `gutenberg-css/`.

## 1. MiniSearch replaces the substring search — INTEGRATE NOW

Repo: https://github.com/lucaong/minisearch. One UMD file (`dist/umd/index.js`, 86 KB) that defines `window.MiniSearch`; zero dependencies; runs from `file://`.

Benchmark on the real data (Node 22): indexing 1,069 entries (title, short title, summary, notes, sections, tags) took 335 ms; indexing the 13,832 dictionary terms took 609 ms. Queries returned in 0.6–12 ms. `penoyer` finds Pennoyer; `promisory estopel` returns 21 ranked hits with Promissory estoppel first (today: 0). `Rule 12 b 6` ranks "Choosing the appropriate Rule 12 response" first. Every result carries `match` (which terms hit which field) and `terms`, which is exactly what highlighting needs. The serialised index is 1.9 MB, so do not embed it: build it at load time (one-third of a second) and build the glossary index on `requestIdleCallback`.

What the student gets: typo tolerance, prefix matching while typing, ranking that prefers titles and summaries, and matched terms highlighted in the results and the opened entry. MiniSearch has no stemmer; prefix matching covers most of that ("estop" finds estoppel). Highlighting in the reading panel should use the CSS Custom Highlight API (Chrome 105+, Safari 17.2+, Firefox 140+), which paints ranges without touching the DOM, so the existing `MutationObserver`s are undisturbed.

Integration sketch. Add `<script id="dklaMiniSearch">` (the UMD file verbatim) and `<script id="dklaR13Search">` after `dklaR12Glossary`; reassign the global `searchEntries`, which `$('search').oninput` calls by name, exactly as `exportMarkdown` is overridden in `dklaCore`:

```js
(()=>{'use strict';
const $=id=>document.getElementById(id);
const OPTS={fields:['title','shortTitle','summary','notes','body','tags'],storeFields:['title','kind','courses'],
  searchOptions:{boost:{title:6,shortTitle:6,summary:2},prefix:true,fuzzy:t=>t.length>4?0.2:0,combineWith:'AND'}};
let ms=null;
function build(){ms=new MiniSearch(OPTS);ms.addAll(data.nodes.map(n=>({id:n.id,title:n.title,shortTitle:n.shortTitle,
  summary:n.summary,notes:n.notes,body:Object.values(n.sections||{}).join(' '),tags:(n.tags||[]).join(' '),kind:n.kind,courses:n.courses})));}
build();
const prior=searchEntries;
searchEntries=function(){const q=$('search').value.trim();if(!q){closeSearch();return;}
  const hits=ms.search(q).slice(0,45);
  if(!hits.length){prior();return;}                       // regions and districts still come from the old scorer
  $('searchResults').innerHTML=`<div class="search-label">${hits.length} results</div>`+hits.map(h=>{const n=nodesById.get(h.id),
    where=geoDistrict(geoPlacement(h.id).district)?.title||roleLabel(n);
    return `<button data-search-type="node" data-search-id="${E(h.id)}" data-terms="${E(h.terms.join(' '))}"><strong>${mark(n.title,h.terms)}</strong><small>${E(n.courses.join(', '))} · ${E(where)}</small></button>`;}).join('');
  S.searchOpen=true;$('searchResults').hidden=false;$('search').setAttribute('aria-expanded','true');};
function mark(text,terms){const re=new RegExp('('+terms.map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','ig');return E(text).replace(re,'<mark>$1</mark>');}
// keep the index current: the app already calls rebuildIndex() after edits and imports
const priorRebuild=rebuildIndex;rebuildIndex=function(...a){const r=priorRebuild.apply(this,a);build();return r;};
// highlight the query in the opened entry without changing the DOM
document.addEventListener('click',e=>{const b=e.target.closest('[data-search-type="node"][data-terms]');if(!b||!CSS.highlights)return;
  const terms=b.dataset.terms.split(' ');setTimeout(()=>{const body=$('inspector')?.querySelector('.reader-body');if(!body)return;
  const ranges=[],walker=document.createTreeWalker(body,NodeFilter.SHOW_TEXT);let node;
  while(node=walker.nextNode()){const s=node.data.toLowerCase();for(const t of terms){let i=0;while((i=s.indexOf(t,i))>=0){const r=new Range();r.setStart(node,i);r.setEnd(node,i+t.length);ranges.push(r);i+=t.length;}}}
  CSS.highlights.set('dkla-hit',new Highlight(...ranges));},400);});
// Ctrl/Cmd+K joins "/" as the way into the bar (the search bar already is the command palette)
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('search').focus();$('search').select();}});
})();
```
CSS: `::highlight(dkla-hit){background:var(--accent-soft,#ffe9a8)} .search-results mark{background:none;font-weight:600}`. The glossary and "Sources on file" rows keep working: they attach through their own `MutationObserver`s on `#searchResults`. The dictionary dialog's own `matches()` can be switched to a second MiniSearch instance later; it is fine as is.

Cost: 86 KB (0.2% of the file), one script block, one function override; no maintenance burden.

## 2. Reporter citations become links — INTEGRATE NOW (no library)

Counted in `seedData`: 128 of the 392 case briefs contain a reporter citation in their text (178 distinct citations, 79 of them U.S. Reports); 149 mentions resolve to one of the 77 full opinions already on file (`sourceIndex.opinions[].citation`). The rest can go to CourtListener's citation resolver, `https://www.courtlistener.com/c/U.S./321/414/`, which works for every reporter in reporters-db, and to Justia for U.S. Reports (`https://supreme.justia.com/cases/federal/us/321/414/`).

eyecite-js is a faithful port of Free Law Project's parser but weighs 5.4 MB with an HTML-parser dependency chain, for what here is ten reporter patterns. reporters-db's `regexes.json` (BSD-2, in `libs/reporters-db/`) confirms the shape `$volume $reporter,? $page`; the sketch hard-codes the reporters the briefs use.

```js
(()=>{'use strict';
const REP='U\\.S\\.|S\\. ?Ct\\.|L\\. ?Ed\\.(?: 2d)?|F\\.(?: ?[234]d| 4th)?|F\\. Supp\\.(?: [23]d)?|N\\.E\\.(?: ?[23]d)?|A\\.(?: ?[23]d)?|P\\.(?: ?[23]d)?|Cal\\.(?: [234]d| 4th)?|N\\.Y\\.(?: ?[23]d)?|Mass\\.|Wis\\.(?: 2d)?';
const CITE=new RegExp(`\\b(\\d{1,3}) (${REP}) (\\d{1,4})\\b`,'g');
const INDEX=JSON.parse(document.getElementById('sourceIndex')?.textContent||'{"opinions":[]}');
const onFile=new Map(INDEX.opinions.filter(o=>o.citation).map(o=>[o.citation.replace(/\s*\(.*$/,'').replace(/\s+/g,' '),o]));
function href(v,r,p){const key=`${v} ${r} ${p}`,op=onFile.get(key);if(op)return {href:op.file,cls:'file-link cite-link',title:'Full opinion on file'};
  return {href:`https://www.courtlistener.com/c/${encodeURIComponent(r)}/${v}/${p}/`,cls:'cite-link',title:'Look up on CourtListener'};}
function linkify(root){const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest('a,button,input,textarea,.cite-done')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  const nodes=[];let n;while(n=walker.nextNode())if(CITE.test(n.data))nodes.push(n);CITE.lastIndex=0;
  for(const t of nodes){const frag=document.createDocumentFragment();let last=0;t.data.replace(CITE,(m,v,r,p,i)=>{frag.append(t.data.slice(last,i));const a=document.createElement('a');const h=href(v,r,p);a.href=h.href;a.className=h.cls;a.title=h.title;if(!h.cls.includes('file-link')){a.target='_blank';a.rel='noopener';}a.textContent=m;frag.append(a);last=i+m.length;});
    frag.append(t.data.slice(last));t.replaceWith(frag);}
  root.classList.add('cite-done');}
const insp=document.getElementById('inspector');
if(insp)new MutationObserver(()=>{const b=insp.querySelector('.reader-body:not(.cite-done)');if(b)linkify(b);}).observe(insp,{childList:true,subtree:true});
})();
```
The `file-link` class lets `sources.js`'s existing click handler open on-file opinions in the in-app viewer; the others open CourtListener in a new tab (unreachable from the sandbox, so verified only against the documented URL scheme). Cost: about 2 KB. At build time, also fill the empty `citation` field on the 51 case entries whose text carries one.

## 3. A print stylesheet — INTEGRATE NOW (no library)

There is no `@media print` rule, so printing today yields the map chrome with the reading panel cut off. A 60-line `dklaR13Print` style block: hide `#geoCanvas`, the toolbars, `#searchResults`, `#moreMenu`, `#toast`, `#storageWarning` and the minimap; make `#inspector` static, full width, black on white, 11 pt serif; keep the "Rule in one line" callout boxed; open every `details` from a `beforeprint` listener (CSS cannot); print the target of external links (`a[href^="http"]::after{content:" (" attr(href) ")"}`) but not file links; `break-inside:avoid` on sections and timelines; hide the chips. gutenberg-css (MIT, in `libs/`) is the reference for margins and orphan control. Cost: 2 KB. Win: any brief prints as a one- or two-page handout, and "Save as PDF" gives a portable brief.

## 4. Spaced repetition with ts-fsrs — INTEGRATE LATER

https://github.com/open-spaced-repetition/ts-fsrs, MIT, FSRS-6, released 1 Sept 2026, UMD build defines `window.TSFSRS` with `fsrs()`, `createEmptyCard()`, `Rating`, `next(card, now, rating)`; no dependencies. Cards can be generated, not authored: per Case, "What is the rule?" → the summary (the "Rule in one line"), and Issue → Holding; per Concept, title → summary. Card state (`due`, `stability`, `difficulty`, `reps`, `lapses`, `state`, `last_review`) fits `localStorage` under one key; `enable_fuzz:false` keeps it deterministic. A "Review today" screen lists due cards, reveals the back, offers Again/Hard/Good/Easy. Why later: a new mode with its own screen; the owner should decide which fields make good cards and whether it belongs under `#todayBtn`; dates must be stored as epoch numbers (the README's `afterHandler`). Library: `libs/ts-fsrs/package/dist/index.umd.js` (72 KB).

## 5. Wex capture — INTEGRATE LATER

No existing extension does this. LII text is CC BY-NC-SA 2.5, so copying a definition with attribution is fine for study. A 15-line bookmarklet on a `law.cornell.edu/wex/<slug>` page copies `{slug, term, definition, url, source}` to the clipboard; the atlas side needs an "add terms" merge into `dklaGlossary`, better done in `tools/r12_glossary.py` than in the browser. Worth doing once the owner has a batch of terms.

## 6. Offline case metadata — INTEGRATE LATER, run on the owner's machine

No case entry carries a decided date, court or author field. CourtListener's `POST /api/rest/v4/citation-lookup/` resolves up to 250 citations per call to date, court and judges; CAP's `static.case.law/<reporter>/<volume>/cases/<page>-01.json` covers pre-2020 cases without a key. Both hosts and Wikidata are unreachable from the sandbox (verified), so this is a Python tool for the owner to run over the 178 distinct citations. Low risk, moderate value (years already sit in titles).

## Why the rest is skipped

- pdf.js: from `file://` Chrome refuses `fetch`/XHR of `file://` URLs, so pdf.js cannot read a PDF beside the atlas without an `<input type=file>` pick each time; the only way round is base64 data, which the rules forbid. The `<object>` viewer works. 1.7 MB for nothing.
- eyecite-js: right idea, wrong weight (see 2).
- FlexSearch (2.3 MB unpacked), lunr (last release 2020, big index), fuse.js (no inverted index; bitap over 1.9 MB per keystroke would be slower than today), Orama (2 MB): MiniSearch does the job in 86 KB.
- docx for outline export: the Markdown vault exists and the print stylesheet gives PDF handouts. A printable course outline (subjects → subtopics → rule lines) needs no library and could follow 3.
- ninja-keys: depends on lit, last release 2022; the search bar already is the palette, and 1 adds Ctrl/Cmd+K.
- Layout engines: the owner likes the designed layout; nothing to gain.
