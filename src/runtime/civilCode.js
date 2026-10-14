/* Legal Atlas r7 — Civil Procedure source and course layer. All material is local. */
'use strict';
const CIV = JSON.parse($('civilArchive').textContent),
  CIV_PAGES = Object.keys(CIV.pages)
    .map(Number)
    .sort((a, b) => a - b);
const isCivilRegion = (r) =>
  !!r && (r.course === 'Civil Procedure' || r.id === 'civil-region' || r.id.startsWith('cp-'));
const civilWeeks = (n) => n?.civilImport?.weeks || [];
const civilRange = (a, b) => (a === b ? String(a) : a + '–' + b);
const civilLink = (id, reason = '') => {
  const n = nodesById.get(id);
  return n
    ? `<article class="civil-list-entry"><button class="study-entry-link" data-study-node="${E(id)}"><strong>${E(n.title)}</strong><small>${E(n.civilImport?.coverageLevel || n.kind)}</small></button><p>${E(reason || n.summary)}</p></article>`
    : '';
};
const r7CaseRowsBase = r6CaseRows;
r6CaseRows = function (id) {
  const root = r6Canonical(id),
    out = new Map(r7CaseRowsBase(root).map((r) => [r.id, r])),
    seen = new Set([root]),
    queue = (data.courseIndex?.groups?.[root] || []).map((k) => ({ id: k, via: k }));
  while (queue.length) {
    const cur = queue.shift(),
      key = r6Canonical(cur.id);
    if (seen.has(key)) continue;
    seen.add(key);
    for (const r of r7CaseRowsBase(key))
      if (!out.has(r.id))
        out.set(r.id, { ...r, via: cur.via, basis: 'Related through the narrower question' });
    for (const k of data.courseIndex?.groups?.[key] || []) queue.push({ id: k, via: cur.via });
  }
  const rs = [...out.values()];
  if (nodesById.get(root)?.civilImport)
    return rs.sort(
      (a, b) =>
        Math.min(...civilWeeks(nodesById.get(a.id)), 99) - Math.min(...civilWeeks(nodesById.get(b.id)), 99) ||
        nodesById.get(a.id).title.localeCompare(nodesById.get(b.id).title),
    );
  return rs;
};
const r7CaseListBase = r6CaseList;
r6CaseList = function (id, heading = 'Cases across the semester') {
  let out = r7CaseListBase(id, heading);
  if (nodesById.get(id)?.civilImport) {
    out = out.replace('all 26 reading assignments', 'all 14 Civil Procedure weeks');
    for (const r of r6CaseRows(id)) {
      const n = nodesById.get(r.id);
      if (!n?.civilImport) continue;
      const type = E(n.civilImport.coverageLevel || 'Source-based case account'),
        weeks = civilWeeks(n);
      out = out.replace(
        new RegExp(
          '(<article class="indexed-case" data-indexed-case="' +
            r.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
            '">[\\s\\S]*?<span>)[\\s\\S]*?(</span>)',
        ),
        (_, a, b) => a + type + (weeks.length ? ' · Week ' + weeks.join(', ') : '') + b,
      );
    }
    out += `<p class="tiny-help"><button class="text-button" data-civil-inventory="1">Check the separate source-reference inventory</button> for cases mentioned in the readings that do not have their own brief.</p>`;
  }
  return out;
};
function briefSourceStrip(n) {
  const items = [];
  for (const [a, b] of n.textbookImport?.printedRanges || [])
    items.push(`<button data-book="${a}">C&amp;M ${civilRange(a, b)}</button>`);
  for (const [a, b] of n.textbookImport?.supplementalRanges || [])
    items.push(`<button data-supp="${a}">Contracts supplement ${civilRange(a, b)}</button>`);
  for (const [a, b] of n.civilImport?.printedRanges || [])
    items.push(`<button data-civil-page="${a}">Civil Procedure ${civilRange(a, b)}</button>`);
  for (const [a, b] of n.civilImport?.supplementRanges || [])
    items.push(`<button data-mallory-page="${a}">Mallory ${civilRange(a, b)}</button>`);
  if (n.civilImport?.source === 'syllabus')
    for (const s of n.sources || []) {
      if (s.url?.startsWith('#civil-syllabus='))
        items.push(`<button data-civil-syllabus="${+s.url.split('=')[1]}">${E(s.label)}</button>`);
    }
  return items.length
    ? `<div class="source-strip">${uniq(items).join('')}</div>`
    : `<div class="source-strip">${sourceHTML((n.sources || []).slice(0, 3))}</div>`;
}
const r7SourceCautionBase = sourceCaution;
sourceCaution = function (n) {
  if (!n.civilImport) return r7SourceCautionBase(n);
  const c = n.civilImport.coverageLevel || '',
    gap = n.status === 'Assigned source gap';
  return `<div class="civil-source-scope ${gap ? 'source-caution' : ''}">${E(c)}${/note|short|limited/i.test(c) ? ' · Details are limited to what the assigned excerpt supplies.' : n.kind === 'Rule' ? ' · Casebook explanation only.' : ''}</div>`;
};
const r7GuideBase = guide;
guide = function (n) {
  const g = r7GuideBase(n);
  return n.civilImport && (g === n.summary || Object.values(n.sections || {}).includes(g)) ? null : g;
};
const r7AuditBase = auditDetails;
auditDetails = function (n) {
  let s = r7AuditBase(n);
  if (n.civilImport) s = s.replace('Earlier entry.', '');
  return s;
};
const r7RegionTitleBase = shortRegionTitle;
shortRegionTitle = function (r) {
  return r?.id === 'civil-region' ? 'Earlier jurisdiction landmarks' : r7RegionTitleBase(r);
};
const r7HeadingBase = renderHeading;
renderHeading = function () {
  r7HeadingBase();
  const welcome = $('mapWelcome');
  if (S.scope === 'Civil Procedure') {
    welcome.innerHTML =
      '<h1>Civil Procedure</h1><p>Courts, parties, claims, and adjudication.</p><button data-study-node="cp-framework">How a civil action fits together →</button><button data-civil-week="0">All 14 syllabus weeks →</button>';
    welcome.hidden = !!(S.region || S.district || selected);
  } else if (S.scope === 'Contracts') {
    welcome.innerHTML =
      '<h1>Contracts</h1><button data-study-node="legal-framework">How the law fits together →</button><button data-contract-reading="9">All 26 reading assignments →</button>';
  }
};
coursesDialog = function () {
  modal(
    'Your atlas',
    `<div class="course-options"><button data-study-scope="Contracts"><strong>Contracts</strong><small>26 assignments · revision-6 material preserved</small></button><button data-study-scope="Civil Procedure"><strong>Civil Procedure</strong><small>14 weeks · 133 case accounts · complete assigned chapters and separately supplied sources</small></button><button data-study-scope="Study notes"><strong>Study notes</strong><small>Cross-course comparisons and your other entries</small></button><button data-study-scope="Atlas"><strong>Whole atlas</strong><small>All subjects at their saved locations</small></button></div>`,
  );
};
const r7ContractsReading = classDialog;
function civilWeek(v = 0) {
  const num = +v || 0,
    cor = data.civilCorpus;
  if (!num) {
    modal(
      'Civil Procedure · the semester',
      `<div class="modal-copy"><p>The 14 weekly groups follow Miller’s syllabus. The syllabus is approximate; classroom and classwide email instructions supersede it. The dates below are week labels, except the final November 24 entry.</p><p>Open any week for named cases, additional source-based accounts, concepts, provisions, and the original syllabus. Reading a week leaves every other topic and connection available.</p><div class="source-strip"><button data-civil-syllabus="2">Read the syllabus</button><button data-civil-inventory="1">Source-reference inventory</button></div>${cor.weeks.map((w) => `<button class="study-entry-link civil-week-row" data-civil-week="${w.number}"><small>Week ${w.number} · ${E(w.dateLabel)}</small><strong>${E(w.title)}</strong></button>`).join('')}</div>`,
    );
    return;
  }
  const w = cor.weeks.find((w) => w.number === num);
  if (!w) return;
  const other = w.caseAccounts.filter((id) => !w.namedCases.includes(id));
  modal(
    'Civil Procedure · Week ' + num,
    `<label class="form-field"><span>Week</span><select id="civilWeekSelect">${cor.weeks.map((k) => `<option value="${k.number}" ${num === k.number ? 'selected' : ''}>${k.number}. ${E(k.title)}</option>`).join('')}</select></label><div class="modal-copy"><h3>${E(w.title)}</h3><p>${E(w.dateLabel)}</p><p>${E(w.instructions)}</p><div class="source-strip"><button data-civil-syllabus="${w.syllabusPage}">Original syllabus</button>${w.readingRanges.map(([a, b]) => `<button data-civil-page="${a}">Casebook ${civilRange(a, b)}</button>`).join('')}${num === 4 ? '<button data-mallory-page="422">Mallory 422–440</button>' : ''}</div><p class="tiny-help">Source spans include context around named cases. The original syllabus controls the exact reading instruction. Inclusion here does not assert that a case has already been discussed in class.</p><h3>${w.namedCases.length ? 'Cases expressly named in this week’s syllabus' : 'Cases in the assigned chapters'}</h3>${w.namedCases.length ? w.namedCases.map((id) => civilLink(id)).join('') : w.caseAccounts.map((id) => civilLink(id)).join('')}${w.namedCases.length && other.length ? `<details class="quiet-details"><summary>Other case accounts in these reading spans (${other.length})</summary>${other.map((id) => civilLink(id)).join('')}</details>` : ''}<details class="quiet-details"><summary>Concepts and provision guides (${w.concepts.length})</summary>${w.concepts.map((id) => civilLink(id)).join('')}</details><button class="text-button" data-civil-week="0">Return to all weeks</button></div>`,
  );
  $('civilWeekSelect').onchange = (e) => civilWeek(e.target.value);
}
classDialog = function (v) {
  return S.scope === 'Civil Procedure' ? civilWeek(v || 0) : r7ContractsReading(v || 9);
};
const r7ContractsCoverage = coverageDialog;
coverageDialog = function () {
  const c = data.civilCorpus;
  modal(
    'Coverage and source limits',
    `<div class="modal-copy"><h3>Civil Procedure</h3><p>${c.caseAccountCount} case accounts, ${c.conceptCount} concept explanations, ${c.provisionGuideCount} provision guides, and 14 weekly reading plans. All six case sections are present. A short assigned note remains a source-limited account; omitted facts are identified rather than reconstructed.</p><p>Chapters 8, 9, and 10 are available in full, including interpleader and intervention. The map contains cases and explanations selected from those readings; the entire chapter text is available in the source reader.</p><p>${c.referenceInventory.length} table-of-cases records have references within the mapped reading spans. This separate inventory includes authorities without individual briefs. An index of authored accounts is therefore distinct from the complete list of references in the source.</p><p>Exact printed-page text and a link to the corresponding original PDF page are available for the casebook. The uploaded Mallory excerpt has readable page images. No external legal updates, classroom notes, or citator results have been added.</p><h3>Missing assigned materials</h3>${c.sourceGaps.map((id) => civilLink(id)).join('')}<div class="source-strip"><button data-civil-week="0">All Civil Procedure weeks</button><button data-civil-inventory="1">Source-reference inventory</button><button data-contract-coverage="1">Contracts coverage and remaining gaps</button></div><h3>Preserved work</h3><p>Revision 6’s 446 entry homes and 1,160 relationship records were preserved. Civil Procedure starter accounts were expanded. The existing Carnival account and forum-selection concept are shared across courses; their Contracts material remains intact.</p><p>Browser edits are local. Keep an exported master or portable HTML. Opening an older master is a replacement unless you explicitly reconcile it through the import workflow.</p></div>`,
  );
};
function civilInventory(q = '', page = 1, onlyUnbriefed = false) {
  const all = data.civilCorpus.referenceInventory;
  const norm = (s) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  const terms = norm(q).split(/\s+/).filter(Boolean),
    rows = all.filter(
      (r) =>
        (!onlyUnbriefed || !r.accountIds.length) &&
        terms.every((t) => norm(r.title + ' ' + r.pages.join(' ')).includes(t)),
    ),
    max = Math.max(1, Math.ceil(rows.length / 50));
  page = Math.max(1, Math.min(max, +page || 1));
  modal(
    'Civil Procedure · source-reference inventory',
    `<div class="modal-copy"><p>The casebook’s table of cases supplies ${all.length} reference records within the mapped syllabus and context spans. Some have a detailed account; others are citations or shorter discussions in the original reading. This inventory does not turn every cited decision into an assigned principal case.</p><div class="civil-inventory-tools"><input id="civilInventorySearch" aria-label="Find a case reference" placeholder="Case name or printed page" value="${E(q)}"><label><input type="checkbox" id="civilOnlyUnbriefed" ${onlyUnbriefed ? 'checked' : ''}> Show only references without a separate account</label><button id="civilInventoryFilter">Search</button></div><p>${rows.length} matching references · Page ${page} of ${max}</p><div class="source-strip"><button id="civilInventoryPrev" ${page <= 1 ? 'disabled' : ''}>Previous</button><button id="civilInventoryNext" ${page >= max ? 'disabled' : ''}>Next</button></div>${rows
      .slice((page - 1) * 50, page * 50)
      .map(
        (r) =>
          `<article class="civil-reference"><h3>${E(r.title)}</h3><p>${r.accountIds.length ? 'A separate case account is available.' : 'Source reference only; no separate case account has been authored.'}</p><div class="source-strip">${r.pages.map((p) => `<button data-civil-page="${p}">p. ${p}</button>`).join('')}${r.accountIds.map((id) => `<button data-study-node="${E(id)}">Open ${E(nodesById.get(id)?.shortTitle || id)}</button>`).join('')}</div></article>`,
      )
      .join('')}</div>`,
  );
  const run = () => civilInventory($('civilInventorySearch').value, 1, $('civilOnlyUnbriefed').checked);
  $('civilInventoryFilter').onclick = run;
  $('civilOnlyUnbriefed').onchange = run;
  $('civilInventorySearch').onkeydown = (e) => {
    if (e.key === 'Enter') run();
  };
  $('civilInventoryPrev').onclick = () => civilInventory(q, page - 1, onlyUnbriefed);
  $('civilInventoryNext').onclick = () => civilInventory(q, page + 1, onlyUnbriefed);
}
// Source reader: exact page text for the digital book, images for the supplied scan.
let civilSource = { mode: 'civ', page: 1, tab: 'text' },
  civilPDFURLs = {};
$('civilSourceDialog')?.remove();
const civilDialog = document.createElement('dialog');
civilDialog.id = 'civilSourceDialog';
civilDialog.setAttribute('aria-label', 'Civil Procedure original sources');
document.body.appendChild(civilDialog);
function civilPDF(mode) {
  if (civilPDFURLs[mode]) return civilPDFURLs[mode];
  const b64 = CIV[mode === 'civ' ? 'casebookPDF' : mode === 'mallory' ? 'malloryPDF' : 'syllabusPDF'];
  if (/\.pdf$/i.test(b64)) return (civilPDFURLs[mode] = b64);
  const bin = atob(b64),
    bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return (civilPDFURLs[mode] = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })));
}
function openCivil(page = 1, mode = 'civ', tab = null) {
  if (!['civ', 'mallory', 'syllabus'].includes(mode)) return;
  const list =
    mode === 'civ'
      ? CIV_PAGES
      : mode === 'mallory'
        ? Array.from({ length: 19 }, (_, i) => i + 422)
        : [1, 2, 3, 4];
  page = +page || list[0];
  if (!list.includes(page)) {
    toast('That printed page is unnumbered, blank, or outside this source.');
    return;
  }
  civilSource = { mode, page, tab: tab || (mode === 'civ' ? 'text' : 'image') };
  if ($('modal').open) closeModal();
  if ($('bookDialog').open) closeBookReader();
  const title =
      mode === 'civ'
        ? 'Civil Procedure casebook'
        : mode === 'mallory'
          ? 'Mallory · supplied supplement excerpt'
          : 'Miller · supplied syllabus',
    pfs = mode === 'civ' ? CIV.pages[page].pdfPages : [mode === 'mallory' ? page - 421 : page],
    idx = list.indexOf(page),
    related = data.nodes.filter((n) => {
      const rs =
        mode === 'civ'
          ? n.civilImport?.printedRanges
          : mode === 'mallory'
            ? n.civilImport?.supplementRanges
            : null;
      return n.kind === 'Case' && rs?.some(([a, b]) => page >= a && page <= b);
    });
  const text = mode === 'civ' ? CIV.pages[page].text : '',
    image = mode === 'mallory' ? CIV.malloryImages[page] : CIV.syllabusImages[page];
  civilDialog.innerHTML = `<header class="civil-source-header"><div><strong>${E(title)}</strong><span>${mode === 'syllabus' ? 'PDF page' : 'Printed page'} ${page} · Original PDF ${pfs.length > 1 ? 'pages' : 'page'} ${pfs.join(', ')}</span></div><button id="closeCivilSource" aria-label="Close source reader">Close ×</button></header><div class="civil-source-tools"><button id="civilPrev" ${idx === 0 ? 'disabled' : ''}>← Previous</button><label>Page <input id="civilPageNumber" inputmode="numeric" type="number" value="${page}"></label><button id="civilGo">Go</button><button id="civilNext" ${idx === list.length - 1 ? 'disabled' : ''}>Next →</button><select id="civilSourceMode" aria-label="Source collection"><option value="civ" ${mode === 'civ' ? 'selected' : ''}>Civil Procedure casebook</option><option value="mallory" ${mode === 'mallory' ? 'selected' : ''}>Mallory excerpt</option><option value="syllabus" ${mode === 'syllabus' ? 'selected' : ''}>Miller syllabus</option></select><button id="civilTextTab" ${civilSource.tab !== 'pdf' ? 'class="active"' : ''}>${mode === 'civ' ? 'Page text' : 'Page image'}</button><button id="civilPDFTab" ${civilSource.tab === 'pdf' ? 'class="active"' : ''}>Original PDF</button></div><div class="civil-source-note">${mode === 'civ' ? 'The text below is extracted from the supplied 2022 edition. Use Original PDF to check layout, footnotes, and extraction errors.' : mode === 'mallory' ? 'Printed pages 422 and 440 also contain adjacent decisions. The case account cites the Mallory portion only.' : 'The weekly plan is approximate. In-class instructions and classwide email supersede this syllabus.'}${page === 1036 && mode === 'civ' ? ' The dismissal section begins on this page and is excluded by the final-week assignment.' : ''}</div><main id="civilSourceBody">${civilSource.tab === 'pdf' ? `<div class="civil-pdf-links">${pfs.map((p) => `<button data-civil-pdf-target="${p}">Show PDF page ${p}</button>`).join('')}<a id="civilPDFNewTab" href="${civilPDF(mode)}#page=${pfs[0]}" target="_blank" rel="noopener">Open original in a separate tab ↗</a></div><iframe id="civilPDFFrame" title="Original uploaded PDF" src="${civilPDF(mode)}#page=${pfs[0]}&zoom=page-width"></iframe>` : mode === 'civ' ? `<article class="civil-page-text">${E(text)}</article>` : `<img class="civil-source-image" src="${image}" alt="${E(title)} page ${page}">`}</main>${related.length ? `<footer class="civil-source-footer"><span>Case accounts on this page:</span>${related.map((n) => `<button data-civil-related="${E(n.id)}">${E(n.shortTitle)}</button>`).join('')}</footer>` : ''}`;
  if (!civilDialog.open) civilDialog.showModal();
  $('closeCivilSource').onclick = () => civilDialog.close();
  $('civilPrev').onclick = () => openCivil(list[idx - 1], mode, civilSource.tab);
  $('civilNext').onclick = () => openCivil(list[idx + 1], mode, civilSource.tab);
  $('civilGo').onclick = () => openCivil(+$('civilPageNumber').value, mode, civilSource.tab);
  $('civilPageNumber').onkeydown = (e) => {
    if (e.key === 'Enter') $('civilGo').click();
  };
  $('civilSourceMode').onchange = (e) => openCivil(e.target.value === 'mallory' ? 422 : 1, e.target.value);
  $('civilTextTab').onclick = () => openCivil(page, mode, mode === 'civ' ? 'text' : 'image');
  $('civilPDFTab').onclick = () => openCivil(page, mode, 'pdf');
  civilDialog
    .querySelectorAll('[data-civil-pdf-target]')
    .forEach(
      (b) =>
        (b.onclick = () =>
          ($('civilPDFFrame').src =
            civilPDF(mode) + '#page=' + b.dataset.civilPdfTarget + '&zoom=page-width')),
    );
  civilDialog.querySelectorAll('[data-civil-related]').forEach(
    (b) =>
      (b.onclick = () => {
        civilDialog.close();
        goNode(b.dataset.civilRelated, true);
      }),
  );
}
civilDialog.addEventListener('close', () => {
  civilDialog.querySelector('iframe')?.remove();
});
const r7BackBase = back;
back = function () {
  if (civilDialog.open) {
    civilDialog.close();
    return;
  }
  r7BackBase();
};
$('studyBack').onclick = back;
const r7MarkdownURLBase = markdownSourceURL;
markdownSourceURL = function (u) {
  if (/^#civ=\d+$/.test(u))
    return 'Sources/CivPro(1).pdf#page=' + (data.civilCorpus.printedToPDF[u.split('=')[1]]?.[0] || 1);
  if (/^#mallory=\d+$/.test(u)) return 'Sources/Mallory.pdf#page=' + (+u.split('=')[1] - 421);
  if (/^#civil-syllabus=\d+$/.test(u)) return 'Sources/Syllabus%209_3_26.pdf#page=' + u.split('=')[1];
  if (/^#book=\d+$/.test(u)) return '../Legal-Atlas-r' + data.revision + '.html' + u;
  if (/^#supp=\d+$/.test(u)) return 'Sources/FA26%20Contracts%20Supplement.pdf#page=' + u.split('=')[1];
  return r7MarkdownURLBase(u);
};
const r7MarkdownBase = markdown;
markdown = function (n, names) {
  let s = r7MarkdownBase(n, names);
  if (n.civilImport)
    s +=
      '\n## Civil Procedure reading membership\n\n' +
      (civilWeeks(n).length ? 'Weeks ' + civilWeeks(n).join(', ') : 'Concept or source guide') +
      '. ' +
      n.civilImport.coverageLevel +
      '.\n';
  if (n.id === 'cp-framework')
    s = s.replace('## Working through a contract problem', '## Working through a civil action');
  return s;
};
help = function () {
  modal(
    'Using the combined atlas',
    `<div class="modal-copy"><p>Choose Contracts or Civil Procedure from the course control. The visual map keeps the existing homes, while Browse subjects provides a text route into each subject. Search finds entries across both courses.</p><p>Open a concept for a complete definition and its course-wide case index. A case can appear under several questions while keeping one permanent home. The source-reference inventory separately lists authorities cited in the mapped Civil Procedure readings, including those without a separate case account.</p><p>Each case has Parties, Material Facts, Procedural History, Issue, Holding, and Reasoning. Separate opinions and source limitations follow the brief. Four explained relationship references appear beside the selected entry; all remaining relationships stay available in the reader.</p><p>The Civil Procedure reading menu follows all 14 syllabus weeks. The Contracts reading menu retains all 26 assignments. These schedules describe assigned reading, not actual classroom progress.</p><p>Source buttons open the relevant book page. Civil Procedure has extracted printed-page text and the original uploaded PDF. Mallory and the syllabus also have page images. The full assigned procedural supplement, Berk, and Cross remain visible gaps.</p><p>New entries are placed inside the selected subject. Reclassification moves only that entry; a full subject receives a linked continuation area. Save master JSON for future updates and portable HTML for a complete offline copy. Local browser saving is a convenience, not synchronization to ChatGPT or a cloud account.</p></div>`,
  );
};
// Capture the new actions before the earlier menu and source listeners.
document.addEventListener(
  'click',
  (e) => {
    const b = e.target.closest(
      '[data-civil-page],[data-mallory-page],[data-civil-syllabus],[data-civil-week],[data-civil-inventory],[data-contract-reading],[data-contract-coverage],a[href^="#civ="],a[href^="#mallory="],a[href^="#civil-syllabus="]',
    );
    if (b) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (b.dataset.civilPage) openCivil(+b.dataset.civilPage);
      else if (b.dataset.malloryPage) openCivil(+b.dataset.malloryPage, 'mallory');
      else if (b.dataset.civilSyllabus) openCivil(+b.dataset.civilSyllabus, 'syllabus');
      else if (b.hasAttribute('data-civil-week')) civilWeek(+b.dataset.civilWeek);
      else if (b.dataset.civilInventory) civilInventory();
      else if (b.dataset.contractReading) r7ContractsReading(+b.dataset.contractReading);
      else if (b.dataset.contractCoverage) r7ContractsCoverage();
      else {
        const [k, v] = b.getAttribute('href').slice(1).split('=');
        openCivil(+v, k === 'civil-syllabus' ? 'syllabus' : k);
      }
      return;
    }
    const a = e.target.closest('[data-action="book"]');
    if (a && S.scope === 'Civil Procedure') {
      e.preventDefault();
      e.stopImmediatePropagation();
      dismissMenu();
      openCivil(1);
    }
  },
  true,
);
// Large masters use IndexedDB rather than overflowing the small localStorage quota.
let r7DB = null,
  r7SavePending = Promise.resolve(),
  r7SaveSerial = 0,
  r7Ready = false;
const r7InitialRevision = data.revision,
  r7InitialUpdated = data.updatedAt;
function r7OpenDB() {
  return new Promise((resolve, reject) => {
    let request;
    try {
      request = indexedDB.open('LegalAtlasPortable', 1);
    } catch (err) {
      reject(err);
      return;
    }
    request.onupgradeneeded = () => request.result.createObjectStore('graphs');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(Error('Browser storage is blocked.'));
  });
}
function r7GetStored() {
  return new Promise((resolve, reject) => {
    const tx = r7DB.transaction('graphs', 'readonly'),
      r = tx.objectStore('graphs').get(storageKey());
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
saveCache = function () {
  $('undoBtn').disabled = !undoStack.length;
  if (!r7Ready) return;
  if (!r7DB) {
    $('saveStatus').textContent = 'Session only · use Save to keep edits';
    return;
  }
  const serial = ++r7SaveSerial,
    snapshot = clone(data);
  $('saveStatus').textContent = 'Saving locally…';
  r7SavePending = r7SavePending
    .catch(() => {})
    .then(
      () =>
        new Promise((resolve, reject) => {
          const tx = r7DB.transaction('graphs', 'readwrite');
          tx.objectStore('graphs').put(snapshot, storageKey());
          tx.oncomplete = () => {
            cacheAvailable = true;
            if (serial === r7SaveSerial) $('saveStatus').textContent = 'Saved locally · export for backup';
            resolve();
          };
          tx.onerror = () => {
            cacheAvailable = false;
            warning('Local browser saving failed. Export master JSON or portable HTML before closing.');
            reject(tx.error);
          };
        }),
    );
  r7SavePending.catch(() => {});
};
exportMarkdown = function () {
  storeView();
  const files = geoMarkdownFiles();
  const readme = files.find((f) => f[0].endsWith('/README.md'));
  if (readme)
    readme[1] =
      '# Legal Atlas — combined export\n\nOpen this folder as an Obsidian vault and start with 00-Atlas.md. The JSON retains the complete graph and saved homes. Markdown edits do not automatically return to the HTML.\n\nThis export includes the Contracts and Civil Procedure study accounts, case indexes, and cross-course relationships. The custom spatial map remains in the HTML application.\n\nPlace the Sources folder from the revision-7 package inside this vault for the Civil Procedure PDFs and Contracts supplement links. Contracts casebook links open the corresponding portable HTML in the parent directory; save that HTML with its default revision filename. This browser-generated ZIP contains notes and JSON, not duplicate source PDFs.\n\nBerk v. Choy, Cross v. United States and the full 2026–2027 Civil Procedure supplement are on file in added-sources/. Other source limits appear in the records and coverage guide. No current-law or lecture-content review is represented.\n';
  download('Legal-Atlas-Obsidian-r' + data.revision + '.zip', zipBlob(files));
  toast('Combined Markdown vault exported with master JSON.');
};
function r7OpenHash() {
  const h = decodeURIComponent(location.hash || '');
  if (h.startsWith('#node=')) {
    const id = h.slice(6);
    if (nodesById.has(id)) goNode(id, true);
    return;
  }
  const m = h.match(/^#(civ|mallory|civil-syllabus|book|supp)=(\d+)$/);
  if (!m) return;
  const v = +m[2];
  if (m[1] === 'book') openBook(v);
  else if (m[1] === 'supp') openSupplement(v);
  else openCivil(v, m[1] === 'civil-syllabus' ? 'syllabus' : m[1]);
}
window.addEventListener('hashchange', r7OpenHash);
const r7RawSaveDialog = saveDialog;
saveDialog = function () {
  r7RawSaveDialog();
  $('rawRecovery').onclick = () =>
    download('Legal-Atlas-session-recovery.json', JSON.stringify(data, null, 2), 'application/json');
};
$('saveBtn').onclick = saveDialog;
const r7NavigateBase = window.LegalAtlas.navigate;
window.LegalAtlas = {
  ...window.LegalAtlas,
  version: '1.7-civil-procedure',
  navigate: (type, id) => {
    if (type === 'scope') home(id);
    else r7NavigateBase(type, id);
  },
  caseIndex: (id) => clone(r6CaseRows(id)),
  civilWeeks: () => clone(data.civilCorpus.weeks),
  civilInventory: () => clone(data.civilCorpus.referenceInventory),
  civilSourceState: () => clone(civilSource),
  openCivil,
  civilReading: civilWeek,
  reading: classDialog,
  coverage: coverageDialog,
  back,
  showSourceInventory: civilInventory,
  flush: async () => {
    storeView();
    saveCache();
    await r7SavePending;
  },
  ready: false,
  addEntry: (title, did, kind = 'Concept') => {
    const id = uid('node'),
      r = regionFor(districtFor(did)?.region),
      course = isCivilRegion(r) ? 'Civil Procedure' : r?.col < 3 ? 'Contracts' : 'Cross-course';
    transact('Added entry', () => {
      data.nodes.push({
        id,
        title,
        shortTitle: title,
        kind,
        courses: [course],
        summary: 'User-created entry.',
        notes: '',
        sections: {},
        sources: [],
        tags: [],
        status: 'User note',
        createdAt: now(),
        updatedAt: now(),
      });
      rebuildIndex();
      r6Place(id, did);
    });
    return id;
  },
};
if (!base.studyMap.view) {
  home('Atlas', false, false);
  S.history = [];
}
renderInspector();
renderHeading();
schedule();
(async () => {
  try {
    r7DB = await r7OpenDB();
    const cached = await r7GetStored();
    if (cached && cached.dklaRelease?.contentBuild !== base.dklaRelease?.contentBuild) {
      window.DKLAIncompatibleCache = cached;
      await new Promise((resolve, reject) => {
        const tx = r7DB.transaction('graphs', 'readwrite');
        tx.objectStore('graphs').put(cached, storageKey() + ':backup:' + Date.now());
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    }
    if (
      cached &&
      cached.dklaRelease?.contentBuild === base.dklaRelease?.contentBuild &&
      cached.studyMap?.layoutId === base.studyMap?.layoutId &&
      data.revision === r7InitialRevision &&
      data.updatedAt === r7InitialUpdated &&
      cached.graphId === data.graphId &&
      (cached.revision > data.revision ||
        (cached.revision === data.revision && String(cached.updatedAt) >= String(data.updatedAt)))
    ) {
      data = normalize(cached);
      ensureMap();
      rebuildIndex();
      home('Atlas', false, false);
      S.history = [];
    }
    cacheAvailable = true;
    $('storageWarning').hidden = true;
  } catch (err) {
    r7DB = null;
    cacheAvailable = false;
    warning('This browser cannot save a local copy here. Use Save before closing to retain edits.');
  } finally {
    r7Ready = true;
    window.LegalAtlas.ready = true;
    renderInspector();
    renderHeading();
    schedule();
    r7OpenHash();
    saveCache();
  }
})();
