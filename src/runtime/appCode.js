/* Legal Atlas v1.0 — local-first study notebook. No network calls, accounts, or API keys. */
'use strict';
const $ = (id) => document.getElementById(id);
const clone = (o) => JSON.parse(JSON.stringify(o));
const escapeHTML = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const uid = (p) =>
  p +
  '-' +
  (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
const now = () => new Date().toISOString();
const COLORS = {
  'Civil Procedure': '#a899ee',
  'Contracts': '#e2b985',
  'Legislation & Regulatory State': '#8fc5b3',
  'Lawyering': '#8ebcdf',
  'Cross-course': '#c7c6d5',
};
const KINDS = ['Case', 'Concept', 'Rule', 'Hypothetical', 'Note'];
const REL_KINDS = ['Doctrine', 'Analogy', 'Study link', 'Tension', 'Custom'];
const CASE_HEADINGS = ['Parties', 'Material Facts', 'Procedural History', 'Issue', 'Holding', 'Reasoning'];
const color = (n) => COLORS[n.courses?.[0]] || '#aab8d3';
const symbol = (n) => ({ Case: '▰', Concept: '●', Rule: '◆', Hypothetical: '◇', Note: '▤' })[n.kind] || '●';
const safeURL = (u) => {
  if (/^(added-sources|DKLA-sources)\/[^"'<>]+$/.test(u)) return u;
  if (/^#lrs=[a-z0-9-]+:\d+$/.test(u)) return u;
  if (/^#(?:book|supp|civ|mallory|civil-syllabus)=\d+$/.test(u)) return u;
  try {
    const url = new URL(u);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};
const uniq = (a) => [...new Set(a)];
const cleanList = (s) =>
  uniq(
    String(s)
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
  );
const sourceHTML = (arr) =>
  (arr || [])
    .map((s) => {
      const url = safeURL(s.url);
      if (
        url?.startsWith('#lrs=') ||
        url?.startsWith('#book=') ||
        url?.startsWith('#supp=') ||
        /^#(?:civ|mallory|civil-syllabus)=/.test(url || '')
      )
        return `<a class="source-link book-link" href="${escapeHTML(url)}">${escapeHTML(s.label || 'Open textbook page')}<small>Open embedded source page →</small></a>`;
      if (url && /^(added-sources|DKLA-sources)\//.test(url))
        return `<a class="source-link file-link" href="${escapeHTML(encodeURI(url))}" target="_blank" rel="noopener noreferrer">${escapeHTML(s.label || 'Open file')} ↗<small>File beside the atlas · ${escapeHTML(url.split('/').pop())}</small></a>`;
      return url
        ? `<a class="source-link" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(s.label || 'Source')} ↗<small>${escapeHTML(new URL(url).hostname)}</small></a>`
        : `<div class="micro source-label">${escapeHTML(s.label || s.url || 'Source')}</div>`;
    })
    .join('');
const badge = (s) =>
  `<span class="badge ${escapeHTML(
    String(s)
      .toLowerCase()
      .replace(/[^a-z]/g, ''),
  )}">${escapeHTML(s)}</span>`;
let data,
  cy,
  selected = null,
  focusId = null,
  trail = null,
  query = '',
  activeCourses = null,
  undoStack = [],
  toastTimer,
  imported = null,
  cacheAvailable = true,
  exported = false;
let base = JSON.parse($('seedData').textContent);
function storageKey(d = data) {
  return 'legal-atlas-v1:' + d.graphId + ':dkla-r8-rebuilt';
}
function normalize(d) {
  if (
    !d ||
    d.format !== 'legal-atlas' ||
    d.schemaVersion !== 1 ||
    !Array.isArray(d.nodes) ||
    !Array.isArray(d.edges)
  )
    throw Error('Expected a Legal Atlas schemaVersion 1 graph with nodes and edges.');
  if (d.nodes.length > 15000 || d.edges.length > 60000)
    throw Error('This prototype limits imports to 15,000 entries and 60,000 relationships.');
  if (typeof d.graphId !== 'string' || !d.graphId || d.graphId.length > 200)
    throw Error('Missing or invalid graphId.');
  if (!Number.isSafeInteger(d.revision) || d.revision < 1)
    throw Error('The graph revision must be a positive integer.');
  const ids = new Set(),
    edgeIds = new Set();
  const readString = (v, max = 1000000) => {
    if (v != null && typeof v !== 'string') throw Error('Text fields must contain plain text.');
    if ((v || '').length > max) throw Error('A text field exceeds the size limit.');
    return v || '';
  };
  const sources = (x) => {
    if (x != null && !Array.isArray(x)) throw Error('Sources must be an array.');
    return (x || []).map((s) => {
      if (!s || typeof s !== 'object') throw Error('Invalid source.');
      const url = readString(s.url, 10000);
      if (url && !safeURL(url))
        throw Error(
          'Source URLs must begin with https://, http://, or an embedded #book=, #supp=, #civ=, #mallory=, or #civil-syllabus= source page.',
        );
      return { ...s, label: readString(s.label, 2000), url };
    });
  };
  const nodes = d.nodes.map((n) => {
    if (!n || typeof n !== 'object') throw Error('Invalid entry.');
    const id = readString(n.id, 200);
    if (!id || ids.has(id)) throw Error('Every entry needs a unique nonempty ID.');
    ids.add(id);
    const title = readString(n.title, 1000);
    if (!title.trim()) throw Error('Every entry needs a title.');
    if (!KINDS.includes(n.kind)) throw Error('Unknown entry type: ' + n.kind);
    if (n.courses != null && !Array.isArray(n.courses)) throw Error('Courses must be an array.');
    const sections = {};
    for (const [k, v] of Object.entries(n.sections || {})) sections[readString(k, 200)] = readString(v);
    const pos =
      n.position && Number.isFinite(n.position.x) && Number.isFinite(n.position.y)
        ? { x: n.position.x, y: n.position.y }
        : undefined;
    return {
      ...n,
      id,
      title,
      shortTitle: readString(n.shortTitle, 1000) || title,
      courses: uniq((n.courses || []).map((x) => readString(x, 200))).filter(Boolean),
      summary: readString(n.summary),
      notes: readString(n.notes),
      tags: (n.tags || []).map((x) => readString(x, 200)),
      sections,
      status: readString(n.status, 200) || 'User note',
      sources: sources(n.sources),
      position: pos,
    };
  });
  const edges = d.edges.map((e) => {
    const id = readString(e.id, 200);
    if (!id || edgeIds.has(id) || ids.has(id))
      throw Error('Every relationship needs a unique ID distinct from entry IDs.');
    edgeIds.add(id);
    if (!ids.has(e.source) || !ids.has(e.target)) throw Error('A relationship points to a missing entry.');
    if (e.source === e.target) throw Error('Self-links are not supported.');
    if (!REL_KINDS.includes(e.kind)) throw Error('Unknown connection type: ' + e.kind);
    if (!['Proposed', 'Reviewed', 'Disputed'].includes(e.status))
      throw Error('Unknown connection review status.');
    const label = readString(e.label, 500);
    if (!label.trim()) throw Error('Every connection needs a label.');
    if (e.supports != null && !Array.isArray(e.supports)) throw Error('Supporting notes must be an array.');
    const seen = new Set();
    const supports = (e.supports || [])
      .map((s) => ({
        id: readString(s.id, 200) || uid('support'),
        text: readString(s.text),
        source: readString(s.source, 10000),
        createdAt: s.createdAt || now(),
      }))
      .filter((s) => {
        const k = (s.text.trim() + '|' + s.source.trim()).toLowerCase();
        if (!s.text.trim() || seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    return { ...e, id, label, explanation: readString(e.explanation), supports, sources: sources(e.sources) };
  });
  return { ...d, nodes, edges, history: Array.isArray(d.history) ? d.history.slice(-100) : [] };
}
function warning(msg) {
  $('storageWarning').hidden = false;
  $('storageWarning').textContent = msg;
}
try {
  base = normalize(base);
  data = clone(base);
  const cached = null; // r8 loads only revision-checked IndexedDB; legacy copies are offered through recovery.
  if (cached) {
    try {
      const c = normalize(JSON.parse(cached));
      if (c.graphId === base.graphId && c.revision >= base.revision) data = c;
    } catch (err) {
      warning(
        'This view’s browser copy could not be read. The embedded snapshot is open. Use Files → Download raw recovery copy before editing.',
      );
      cacheAvailable = false;
    }
  }
} catch (err) {
  cacheAvailable = false;
  data = data || clone(base);
  warning(
    'Browser storage is unavailable. Use Files → Save portable HTML or Export graph JSON after editing.',
  );
}

function capturePositions() {
  /* Map homes live in studyMap, never in source records. */
}

function saveCache() {
  if (cacheAvailable) {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(data));
      $('saveStatus').textContent = exported
        ? 'Browser copy saved · export downloaded'
        : 'Saved in this browser · export for backup';
    } catch (err) {
      cacheAvailable = false;
      warning(
        'Browser storage is full or blocked. Your current work is still open. Export graph JSON or save portable HTML now.',
      );
    }
  }
  if (!cacheAvailable) $('saveStatus').textContent = 'Session only · export to keep your work';
  $('undoBtn').disabled = !undoStack.length;
}
function transact(action, fn) {
  capturePositions();
  const old = clone(data);
  undoStack.push(old);
  if (undoStack.length > 30) undoStack.shift();
  try {
    fn();
    data = normalize(data);
    data.revision = Math.max(old.revision, data.revision) + 1;
    data.updatedAt = now();
    data.history = [...(data.history || []), { at: now(), action, revision: data.revision }].slice(-100);
    exported = false;
    saveCache();
    renderGraph();
  } catch (err) {
    data = old;
    undoStack.pop();
    throw err;
  }
}
function toast(text) {
  $('toast').textContent = text;
  $('toast').style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($('toast').style.display = 'none'), 4500);
}
function nodeById(id) {
  return data.nodes.find((n) => n.id === id);
}
function edgeById(id) {
  return data.edges.find((e) => e.id === id);
}
// Contracts corpus view and embedded source-page reader. No remote resources.
const BOOK = JSON.parse($('bookArchive').textContent);
const BOOK_PAGES = Object.keys(BOOK)
  .map(Number)
  .sort((a, b) => a - b);
let assignment = '9',
  detailLevel = 'core',
  bookPage = 284,
  bookZoom = 100,
  bookClass = '',
  sourceQuery = '';
function navigationEdge(e) {
  return (
    e.source.startsWith('contracts-class-') ||
    e.target.startsWith('contracts-class-') ||
    e.source === 'contracts-davis-fall2026' ||
    e.target === 'contracts-davis-fall2026' ||
    e.source.startsWith('gap-') ||
    e.target.startsWith('gap-')
  );
}
function classNumbers(n) {
  return uniq([
    ...(n.textbookImport?.assignments || []),
    ...(n.tags || []).filter((t) => /^class-\d+$/.test(t)).map((t) => +t.slice(6)),
  ]);
}
function coreNode(n) {
  return ['Case', 'Concept', 'Rule'].includes(n.kind) || n.id.startsWith('contracts-class-');
}
function readerPages() {
  return BOOK_PAGES.filter((p) => !bookClass || BOOK[p].assignments.includes(+bookClass));
}
function sourcePanel(n) {
  if (!n.textbookImport)
    return '<div class="provenance-note">Earlier notebook entry · retained from revision 2. This import did not audit its sources.</div>';
  const ranges = n.textbookImport.printedRanges || [];
  return `<div class="provenance-note"><b>${escapeHTML(n.textbookImport.basis || 'Casebook study layer')}</b><div class="page-pills">${ranges.map(([a, b]) => `<button data-book="${a}">C&amp;M ${a}${a === b ? '' : '–' + b}</button>`).join('')}</div>${n.status === 'Assigned source gap' ? 'The separately assigned source remains missing.' : 'Study paraphrase. Open the source page for exact wording, context, and qualifications.'}</div>`;
}
function renderSource() {
  const r = BOOK[bookPage];
  if (!r) {
    toast('This printed page is outside the imported assigned ranges.');
    return;
  }
  $('bookPageInput').value = bookPage;
  $('bookHeading').textContent = 'C&M · printed page ' + bookPage;
  $('bookLocation').textContent =
    r.file +
    ' · PDF page ' +
    r.filePage +
    ' · source packet page ' +
    r.packetPage +
    ' · assignment' +
    (r.assignments.length > 1 ? 's ' : ' ') +
    r.assignments.join(', ');
  $('sourceImage').src = r.image;
  $('sourceImage').alt = 'Scanned Contracts casebook, printed page ' + bookPage;
  $('sourceImage').style.width = bookZoom + '%';
  $('rawPageText').textContent = r.text || 'No machine-extracted text is available for this page.';
  const list = readerPages();
  const i = list.indexOf(bookPage);
  $('bookPrev').disabled = i <= 0;
  $('bookNext').disabled = i < 0 || i >= list.length - 1;
  $('bookCounter').textContent = (i >= 0 ? i + 1 : '—') + ' / ' + list.length + ' assigned pages';
  $('bookRelated').innerHTML = r.nodeIds
    .map((id) => nodeById(id))
    .filter(Boolean)
    .map(
      (n) =>
        `<button class="related-entry" data-reader-node="${escapeHTML(n.id)}">${escapeHTML(n.title)}</button>`,
    )
    .join('');
  $('bookScroller').scrollTop = 0;
}
function openBook(p = 284) {
  if (!BOOK[p]) {
    toast('This page is outside the assigned archive.');
    return;
  }
  bookPage = +p;
  if (bookClass && !BOOK[p].assignments.includes(+bookClass)) {
    bookClass = '';
    $('bookClass').value = '';
  }
  renderSource();
  if (!$('bookDialog').open) $('bookDialog').showModal();
}
function openEntry(id) {
  if ($('bookDialog').open) $('bookDialog').close();
  assignment = '';
  detailLevel = 'full';
  $('assignmentFilter').value = '';
  $('detailFilter').value = 'full';
  activeCourses = null;
  $('kindFilter').value = '';
  $('relationFilter').value = '';
  query = '';
  $('search').value = '';
  trail = null;
  focusId = id;
  renderCourses();
  selectNode(id, true);
  arrangeVisible();
}
function chooseAssignment(value) {
  assignment = value;
  detailLevel = $('detailFilter').value;
  focusId = null;
  trail = null;
  query = '';
  $('search').value = '';
  selected = null;
  activeCourses = null;
  renderCourses();
  applyView();
  renderInspector();
  arrangeVisible();
}
function arrangeVisible() {
  /* Study view never executes a randomized layout. */
}

function searchSources() {
  sourceQuery = $('bookSearch').value.trim().toLowerCase();
  const results = $('bookSearchResults');
  if (!sourceQuery) {
    results.innerHTML = '';
    return;
  }
  const hits = readerPages().filter((p) => (BOOK[p].text || '').toLowerCase().includes(sourceQuery));
  results.innerHTML =
    `<p class="micro">${hits.length} page matches. Scan errors can hide matches.</p>` +
    hits
      .slice(0, 80)
      .map((p) => {
        const t = BOOK[p].text || '',
          i = t.toLowerCase().indexOf(sourceQuery);
        return `<button class="page-result" data-book="${p}"><b>Printed p. ${p}</b><span>${escapeHTML(t.slice(Math.max(0, i - 50), i + 120).replace(/\s+/g, ' '))}</span></button>`;
      })
      .join('');
}
function coverageDialog() {
  const rows = Object.entries((data.corpus || base.corpus)?.assignedRanges || {})
    .map(
      ([c, rs]) =>
        `<tr><td>${c}</td><td>${rs.map(([a, b]) => (a === b ? a : a + '–' + b)).join(', ')}</td><td><button class="mini-button" data-assignment="${c}">Open class</button></td></tr>`,
    )
    .join('');
  modal(
    'Scope, sources, and remaining gaps',
    `<div class="modal-copy"><p>This corpus follows assignments 1–9 of Kevin Davis’s Fall 2026 Contracts syllabus. September 22 and the Bayway/Northrop classroom focus are user-reported. Assignment 9 also lists Hill and Klocek. No actual lecture notes were supplied.</p><p>The reader retains <b>${BOOK_PAGES.length} distinct assigned source pages</b>. Study entries organize cases, doctrine, editorial discussions, and problems; they are paraphrases, not a sentence-by-sentence transcription. Scanned page images preserve the exact text. Search uses a pre-existing, imperfect text layer.</p><table class="scope-table"><thead><tr><th>Assignment</th><th>Printed pages</th><th></th></tr></thead><tbody>${rows}</tbody></table><h3>Source gaps</h3>${data.nodes
      .filter((n) => n.id.startsWith('gap-'))
      .map(
        (n) =>
          `<p><button class="text-button" data-audit-node="${n.id}">${escapeHTML(n.title)}</button><br>${escapeHTML(n.summary)}</p>`,
      )
      .join(
        '',
      )}<h3>Limits on the study layer</h3><p>New connections remain Proposed. Casebook questions have no invented answer key. A shorter authority discussed in a note is not represented as a reviewed full opinion. Seven boundary entries identify cases whose full excerpts fall outside the assigned ranges. Existing Civil Procedure and cross-course material remains from the earlier notebook and was not audited here.</p><p>There has been no 2026 current-law or citator check. The textbook’s discussion of proposed 2022 amendments and other dated developments retains its publication context. Your private notes and later corrections can be added alongside these sources.</p><p>The original revision-2 JSON and displaced node text are retained in the project package and provenance. The current master is the latest JSON you export; browser edits do not sync to ChatGPT.</p></div>`,
  );
}
function wireCorpus() {
  $('assignmentFilter').onchange = (e) => chooseAssignment(e.target.value);
  $('detailFilter').onchange = (e) => {
    detailLevel = e.target.value;
    applyView();
    arrangeVisible();
  };
  $('navigationToggle').onchange = () => {
    applyView();
    arrangeVisible();
  };
  $('textbookBtn').onclick = () =>
    openBook(assignment ? (data.corpus || base.corpus).assignedRanges[assignment][0][0] : bookPage);
  $('coverageBtn').onclick = coverageDialog;
  $('closeBook').onclick = () => $('bookDialog').close();
  $('bookGo').onclick = () => {
    const p = +$('bookPageInput').value;
    if (BOOK[p]) openBook(p);
    else
      $('bookMessage').textContent =
        'Printed p. ' + p + ' is outside the imported assignments. Choose an assigned page.';
  };
  $('bookPageInput').onkeydown = (e) => {
    if (e.key === 'Enter') $('bookGo').click();
  };
  $('bookPrev').onclick = () => {
    const a = readerPages(),
      i = a.indexOf(bookPage);
    if (i > 0) {
      bookPage = a[i - 1];
      renderSource();
    }
  };
  $('bookNext').onclick = () => {
    const a = readerPages(),
      i = a.indexOf(bookPage);
    if (i >= 0 && i < a.length - 1) {
      bookPage = a[i + 1];
      renderSource();
    }
  };
  $('bookClass').onchange = (e) => {
    bookClass = e.target.value;
    if (!readerPages().includes(bookPage)) bookPage = readerPages()[0];
    renderSource();
    searchSources();
  };
  $('bookZoom').oninput = (e) => {
    bookZoom = +e.target.value;
    $('sourceImage').style.width = bookZoom + '%';
    $('bookZoomValue').textContent = bookZoom + '%';
  };
  $('bookSearchBtn').onclick = searchSources;
  $('bookSearch').onkeydown = (e) => {
    if (e.key === 'Enter') searchSources();
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#book="]'),
      b = e.target.closest('[data-book]');
    if (a || b) {
      e.preventDefault();
      $('bookMessage').textContent = '';
      openBook(+(b ? b.dataset.book : a.getAttribute('href').split('=')[1]));
      return;
    }
    const n = e.target.closest('[data-reader-node],[data-audit-node]');
    if (n) {
      if ($('modal').open) closeModal();
      openEntry(n.dataset.readerNode || n.dataset.auditNode);
      return;
    }
    const c = e.target.closest('[data-assignment]');
    if (c) {
      if ($('modal').open) closeModal();
      $('assignmentFilter').value = c.dataset.assignment;
      chooseAssignment(c.dataset.assignment);
      return;
    }
    const w = e.target.closest('[data-quick-node]');
    if (w) openEntry(w.dataset.quickNode);
  });
  if (!data.corpus || data.corpus.id !== base.corpus?.id)
    warning(
      'A newer browser graph has been preserved. It does not contain this textbook import. Export that JSON before applying an update; do not replace your edits with the embedded snapshot.',
    );
}

function degree(id) {
  return new Set(
    data.edges
      .filter((e) => !navigationEdge(e) && (e.source === id || e.target === id))
      .map((e) => (e.source === id ? e.target : e.source)),
  ).size;
}
function strength(e) {
  const pair = data.edges.filter(
    (x) =>
      (x.source === e.source && x.target === e.target) || (x.source === e.target && x.target === e.source),
  );
  const relations = new Set(
    pair.map((x) => [x.source, x.target, x.kind, x.label.trim().toLowerCase()].join('|')),
  ).size;
  return { relations, supports: e.supports.length, width: 1 + Math.log2(1 + relations + e.supports.length) };
}
function graphElements() {
  const el = data.nodes.map((n, i) => ({
    group: 'nodes',
    data: {
      id: n.id,
      label: n.shortTitle || n.title,
      color: color(n),
      size: (n.kind === 'Case' ? 27 : 21) + Math.min(18, Math.sqrt(degree(n.id)) * 4),
      shape:
        { Case: 'round-rectangle', Rule: 'diamond', Hypothetical: 'hexagon', Note: 'round-rectangle' }[
          n.kind
        ] || 'ellipse',
    },
    position: n.position || { x: Math.cos(i * 2.4) * 200, y: Math.sin(i * 2.4) * 200 },
  }));
  data.edges.forEach((e) =>
    el.push({
      group: 'edges',
      data: {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label.length > 42 ? e.label.slice(0, 39) + '…' : e.label,
        width: strength(e).width,
        status: e.status,
        kind: e.kind,
      },
      classes: e.status.toLowerCase(),
    }),
  );
  return el;
}
const styles = [
  {
    selector: 'node',
    style: {
      'background-color': 'data(color)',
      'width': 'data(size)',
      'height': 'data(size)',
      'shape': 'data(shape)',
      'label': 'data(label)',
      'font-family': '-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',
      'font-size': 16,
      'color': '#cac9d7',
      'text-valign': 'bottom',
      'text-margin-y': 8,
      'text-wrap': 'wrap',
      'text-max-width': 135,
      'text-outline-color': '#15151d',
      'text-outline-width': 2,
      'border-width': 1.5,
      'border-color': 'data(color)',
      'border-opacity': 0.2,
      'background-opacity': 0.9,
      'overlay-opacity': 0,
    },
  },
  {
    selector: 'edge',
    style: {
      'width': 'data(width)',
      'line-color': '#666174',
      'target-arrow-color': '#716a82',
      'target-arrow-shape': 'triangle',
      'arrow-scale': 0.65,
      'curve-style': 'bezier',
      'opacity': 0.48,
      'line-style': 'solid',
      'label': '',
      'font-size': 9,
      'color': '#c1b8d1',
      'text-background-color': '#191720',
      'text-background-opacity': 0.96,
      'text-background-padding': 3,
      'text-rotation': 'none',
      'text-wrap': 'wrap',
      'text-max-width': 160,
      'overlay-opacity': 0,
    },
  },
  { selector: 'edge.proposed', style: { 'line-style': 'dashed', 'line-dash-pattern': [6, 5] } },
  {
    selector: 'edge.disputed',
    style: {
      'line-color': '#d48993',
      'target-arrow-color': '#d48993',
      'line-style': 'dotted',
      'opacity': 0.65,
    },
  },
  { selector: 'edge[kind = "Analogy"]', style: { 'line-color': '#8c779d', 'target-arrow-color': '#8c779d' } },
  { selector: '.hidden', style: { 'display': 'none' } },
  { selector: '.faded', style: { 'opacity': 0.12 } },
  {
    selector: 'node.active',
    style: {
      'border-color': '#f0e6ff',
      'border-width': 3,
      'border-opacity': 1,
      'color': '#ffffff',
      'font-weight': 600,
      'font-size': 17,
      'z-index': 100,
    },
  },
  { selector: 'node.neighbor', style: { 'opacity': 1, 'color': '#e6e1ef', 'border-opacity': 0.8 } },
  {
    selector: 'edge.active',
    style: { 'opacity': 0.95, 'line-color': '#c3afd9', 'target-arrow-color': '#c3afd9', 'z-index': 90 },
  },
  { selector: 'edge.disputed.active', style: { 'line-color': '#eca0aa', 'target-arrow-color': '#eca0aa' } },
  { selector: 'edge.show-label, edge.selected-edge', style: { 'label': 'data(label)' } },
  {
    selector: 'node.search-hit',
    style: { 'border-width': 3, 'border-color': '#ffffff', 'border-opacity': 0.9, 'color': '#ffffff' },
  },
];
cy = { extent: () => ({ x1: 0, x2: 100, y1: 0, y2: 100 }), resize: () => {} };

function renderGraph() {
  const pan = cy.pan(),
    zoom = cy.zoom();
  cy.batch(() => {
    cy.elements().remove();
    cy.add(graphElements());
  });
  cy.zoom(zoom);
  cy.pan(pan);
  if (selected?.type === 'node' && !nodeById(selected.id)) selected = null;
  if (selected?.type === 'edge' && !edgeById(selected.id)) selected = null;
  if (focusId && !nodeById(focusId)) focusId = null;
  if (trail && (trail.nodes.some((id) => !nodeById(id)) || trail.edges.some((id) => !edgeById(id))))
    trail = null;
  renderCourses();
  applyView();
  renderInspector();
}
function renderCourses() {
  const names = uniq(data.nodes.flatMap((n) => n.courses)).sort((a, b) => {
    const keys = Object.keys(COLORS);
    return (
      (keys.indexOf(a) < 0 ? 99 : keys.indexOf(a)) - (keys.indexOf(b) < 0 ? 99 : keys.indexOf(b)) ||
      a.localeCompare(b)
    );
  });
  $('courseFilters').innerHTML = names
    .map(
      (c) =>
        `<label class="course-filter"><input type="checkbox" data-course="${escapeHTML(c)}" ${!activeCourses || activeCourses.has(c) ? 'checked' : ''}><span class="course-dot" style="background:${COLORS[c] || '#aab8d3'}"></span><span class="course-title">${escapeHTML(c)}</span><span class="course-count">${data.nodes.filter((n) => n.courses.includes(c)).length}</span></label>`,
    )
    .join('');
  $('courseFilters')
    .querySelectorAll('input')
    .forEach(
      (el) =>
        (el.onchange = () => {
          activeCourses = new Set(
            [...$('courseFilters').querySelectorAll('input:checked')].map((x) => x.dataset.course),
          );
          applyView();
        }),
    );
}
function eligibleEdges() {
  const kind = $('relationFilter').value;
  return data.edges.filter(
    (e) => (!kind || e.kind === kind) && ($('navigationToggle').checked || !navigationEdge(e)),
  );
}
function nearby(start, hops) {
  let found = new Set([start]),
    front = [start];
  for (let i = 0; i < hops; i++) {
    const next = [];
    for (const e of eligibleEdges()) {
      if (front.includes(e.source) && !found.has(e.target)) {
        found.add(e.target);
        next.push(e.target);
      }
      if (front.includes(e.target) && !found.has(e.source)) {
        found.add(e.source);
        next.push(e.source);
      }
    }
    front = next;
  }
  return found;
}
function matches(n) {
  return (
    !query ||
    [n.title, n.shortTitle, n.summary, n.notes, ...n.tags, ...n.courses, ...Object.values(n.sections || {})]
      .join(' ')
      .toLowerCase()
      .includes(query.toLowerCase())
  );
}
function visibleNodes() {
  const kind = $('kindFilter').value;
  const local = focusId ? nearby(focusId, +$('hops').value) : null;
  return data.nodes.filter(
    (n) =>
      (!kind || n.kind === kind) &&
      (!activeCourses || n.courses.some((c) => activeCourses.has(c))) &&
      (!local || local.has(n.id)) &&
      (!trail || trail.nodes.includes(n.id)) &&
      (query
        ? matches(n)
        : (!assignment || classNumbers(n).includes(+assignment)) && (detailLevel === 'full' || coreNode(n))),
  );
}
function applyView() {
  const visible = visibleNodes(),
    set = new Set(visible.map((n) => n.id)),
    edges = new Set(
      eligibleEdges()
        .filter((e) => set.has(e.source) && set.has(e.target) && (!trail || trail.edges.includes(e.id)))
        .map((e) => e.id),
    );
  cy.batch(() => {
    cy.elements().removeClass('hidden faded active neighbor search-hit show-label selected-edge');
    cy.nodes().forEach((n) => {
      if (!set.has(n.id())) n.addClass('hidden');
    });
    cy.edges().forEach((e) => {
      if (!edges.has(e.id())) e.addClass('hidden');
      if ($('labelsToggle').checked) e.addClass('show-label');
    });
    if (selected) {
      const el = cy.getElementById(selected.id);
      if (el.length) {
        cy.elements().addClass('faded');
        const hood = selected.type === 'node' ? el.closedNeighborhood() : el.union(el.connectedNodes());
        hood.removeClass('faded').addClass('neighbor');
        el.addClass('active');
        if (selected.type === 'edge') el.addClass('selected-edge');
        if (selected.type === 'node') el.connectedEdges().addClass('active');
      }
    }
    if (query) {
      cy.elements().addClass('faded');
      const hits = visible.filter(matches);
      hits.forEach((n) => cy.getElementById(n.id).removeClass('faded').addClass('search-hit'));
    }
    if (trail && !query) {
      cy.elements().removeClass('faded');
      cy.edges().addClass('active');
    }
  });
  $('globalBtn').classList.toggle('active', !focusId && !trail);
  $('localBtn').classList.toggle('active', !!focusId);
  $('hops').style.display = focusId ? 'block' : 'none';
  $('mapTitle').textContent = trail
    ? 'A trail between ideas'
    : focusId
      ? nodeById(focusId)?.shortTitle || 'Neighborhood'
      : query
        ? 'Search results'
        : assignment
          ? 'Contracts · class ' + assignment
          : 'The whole picture';
  $('mapEyebrow').textContent = trail
    ? 'EXPLORATORY CONNECTION TRAIL'
    : focusId
      ? 'LOCAL NEIGHBORHOOD'
      : assignment
        ? 'CASEBOOK · THROUGH SEPTEMBER 22, 2026'
        : 'YOUR KNOWLEDGE, CONNECTED';
  $('mapSubtitle').textContent = trail
    ? 'An undirected graph path. Read each relationship before drawing a legal conclusion.'
    : focusId
      ? `Showing entries within ${$('hops').value} connection${$('hops').value === '1' ? '' : 's'}.`
      : query
        ? 'Search covers all entries, regardless of the assignment and detail filters.'
        : assignment
          ? detailLevel === 'core'
            ? 'Cases, concepts, and rules. Switch to All notes + problems for the surrounding reading.'
            : 'The full study layer for this assignment. Use Textbook to read every assigned page.'
          : 'Follow an idea across cases and courses.';
  $('stats').textContent =
    `${visible.length} / ${data.nodes.length} entries · ${edges.size} relationships · revision ${data.revision}`;
  $('graphEmpty').hidden = visible.length > 0;
  renderList(visible);
}
function renderList(visible = visibleNodes()) {
  const list = visible.filter(matches).sort((a, b) => a.title.localeCompare(b.title));
  $('listCount').textContent = list.length;
  $('nodeList').innerHTML = list.length
    ? list
        .map(
          (n) =>
            `<button class="node-item ${selected?.type === 'node' && selected.id === n.id ? 'active' : ''}" data-id="${escapeHTML(n.id)}"><span class="entry-symbol" style="color:${color(n)}">${symbol(n)}</span><span>${escapeHTML(n.shortTitle || n.title)}<small>${escapeHTML(n.kind)} · ${degree(n.id)} neighbors</small></span></button>`,
        )
        .join('')
    : '<p class="micro">No matching entries. Try another search or clear the filters.</p>';
  $('nodeList')
    .querySelectorAll('[data-id]')
    .forEach((el) => (el.onclick = () => selectNode(el.dataset.id, true)));
}
function fit() {
  const shown = cy.elements().not('.hidden');
  if (shown.length) cy.animate({ fit: { eles: shown, padding: 65 }, duration: 280 });
}
function selectNode(id, center = false) {
  if (!nodeById(id)) return;
  selected = { type: 'node', id };
  applyView();
  renderInspector();
  if (center) {
    const el = cy.getElementById(id);
    if (!el.hasClass('hidden')) cy.animate({ center: { eles: el }, duration: 250 });
  }
}
function selectEdge(id) {
  if (!edgeById(id)) return;
  selected = { type: 'edge', id };
  applyView();
  renderInspector();
}
function focusNode(id) {
  if (!nodeById(id)) return;
  assignment = '';
  detailLevel = 'full';
  $('assignmentFilter').value = '';
  $('detailFilter').value = 'full';
  activeCourses = null;
  $('kindFilter').value = '';
  $('relationFilter').value = '';
  query = '';
  $('search').value = '';
  focusId = id;
  trail = null;
  selected = { type: 'node', id };
  renderCourses();
  applyView();
  renderInspector();
  fit();
}
function resetView() {
  assignment = '';
  detailLevel = 'full';
  $('assignmentFilter').value = '';
  $('detailFilter').value = 'full';
  focusId = null;
  trail = null;
  activeCourses = null;
  $('kindFilter').value = '';
  $('relationFilter').value = '';
  query = '';
  $('search').value = '';
  selected = null;
  renderCourses();
  applyView();
  renderInspector();
  fit();
}
function renderInspector() {
  if (!selected) {
    renderWelcome();
    return;
  }
  if (selected.type === 'edge') {
    renderEdge(edgeById(selected.id));
    return;
  }
  const n = nodeById(selected.id);
  if (!n) {
    renderWelcome();
    return;
  }
  const links = data.edges.filter((e) => e.source === n.id || e.target === n.id);
  $('inspector').innerHTML =
    `<div class="eyebrow">${escapeHTML(n.kind)}<span style="color:${color(n)}">${symbol(n)}</span></div><h2>${escapeHTML(n.title)}</h2><div class="badges">${badge(n.status)}${n.courses.map((c) => badge(c)).join('')}</div>${sourcePanel(n)}<p class="summary">${escapeHTML(n.summary || 'Add a summary to this entry.')}</p><div class="inspector-actions"><button id="editNode">Edit entry</button><button id="connectNode">↗ Connect</button><button id="focusNode">Neighborhood</button></div>${n.kind === 'Case' ? `<div class="case-box">${CASE_HEADINGS.map((h) => `<h3>${h}</h3><p>${escapeHTML(n.sections?.[h] || 'Not yet added.')}</p>`).join('')}</div>` : ''}${n.notes ? `<h3>Notes and qualifications</h3><div class="note-text">${escapeHTML(n.notes)}</div>` : ''}${n.tags.length ? `<div class="badges">${n.tags.map((t) => badge('#' + t)).join('')}</div>` : ''}<h3>Sources</h3>${n.sources.length ? sourceHTML(n.sources) : '<p class="micro">No source attached. Add a citation, reading, or dated class note before relying on a doctrinal claim.</p>'}<div class="divider"></div><h3>${links.length} explained connection${links.length === 1 ? '' : 's'}</h3>${
      links
        .map((e) => {
          const other = nodeById(e.source === n.id ? e.target : e.source);
          return `<button class="connection-card" data-edge="${escapeHTML(e.id)}"><div class="rel-label">${e.source === n.id ? '→' : '←'} ${escapeHTML(e.label)}</div><div class="rel-target">${escapeHTML(other?.title || 'Missing entry')}</div><div class="rel-meta">${escapeHTML(e.kind)} · ${escapeHTML(e.status)} · ${e.supports.length} supporting notes</div></button>`;
        })
        .join('') || '<p class="micro">Connect this entry to another idea or case.</p>'
    }${n.provenance?.priorVersions?.length ? `<details><summary>Earlier notebook text · superseded</summary><div class="note-text">${escapeHTML(JSON.stringify(n.provenance.priorVersions, null, 2))}</div></details>` : ''}<div class="divider"></div><button id="deleteNode" class="text-button danger">Delete this entry</button><p class="micro">ID: ${escapeHTML(n.id)}<br>Updated ${escapeHTML((n.updatedAt || data.updatedAt).slice(0, 10))}</p>`;
  $('editNode').onclick = () => nodeForm(n.id);
  $('connectNode').onclick = () => edgeForm(null, n.id);
  $('focusNode').onclick = () => focusNode(n.id);
  $('inspector')
    .querySelectorAll('[data-edge]')
    .forEach((b) => (b.onclick = () => selectEdge(b.dataset.edge)));
  $('deleteNode').onclick = () =>
    confirmDialog(
      'Delete entry?',
      `This deletes “${n.title}” and its ${links.length} connections. Undo is available during this session.`,
      () => {
        transact('Deleted entry: ' + n.title, () => {
          data.nodes = data.nodes.filter((x) => x.id !== n.id);
          data.edges = data.edges.filter((e) => e.source !== n.id && e.target !== n.id);
        });
        toast('Entry deleted.');
      },
    );
}
function renderWelcome() {
  $('inspector').innerHTML =
    `<div class="eyebrow">CONTRACTS · ASSIGNMENTS 1–9</div><h2>The casebook,<br>connected.</h2><p>Start with today’s cases, or choose an assignment in the left panel. Every study entry opens its assigned source pages.</p><div class="metric-row"><div class="metric"><b>${BOOK_PAGES.length}</b><span>assigned source pages</span></div><div class="metric"><b>${data.nodes.filter((n) => n.status === 'Casebook brief').length}</b><span>casebook briefs</span></div></div><button class="starter-trail" data-quick-node="bayway"><strong>Bayway · material alteration</strong><span>Burden of proof, surprise, and hardship</span></button><button class="starter-trail" data-quick-node="northrop"><strong>Northrop · different terms</strong><span>Three approaches and the Illinois-law prediction</span></button><button class="starter-trail" data-quick-node="hill-gateway"><strong>Hill and Klocek · terms later</strong><span>Formation timing, notice, and the evidentiary record</span></button><button class="starter-trail" data-book="284"><strong>Read today’s textbook pages</strong><span>Printed pp. 284–304 · full page images</span></button><div class="welcome-block"><p>Switch <b>Core map</b> to <b>All notes + problems</b> to see editorial discussions, shorter authorities, and unanswered problems. Use <b>Scope & gaps</b> for missing SEL/SUPP readings and page coverage.</p></div><p class="micro">New connections are Proposed study interpretations. Line thickness is connectivity, not legal authority. Assignment-membership links are hidden by default and excluded from node size. No lecture notes or current-law verification are included.</p><p class="micro">${data.nodes.length} total entries · ${data.edges.length} total relationships<br>Keep the latest exported JSON for future updates.</p>`;
}
function renderEdge(e) {
  if (!e) {
    renderWelcome();
    return;
  }
  const from = nodeById(e.source),
    to = nodeById(e.target),
    s = strength(e);
  $('inspector').innerHTML =
    `<div class="eyebrow">EXPLAINED CONNECTION</div><h2>${escapeHTML(e.label)}</h2><div class="badges">${badge(e.kind)}${badge(e.status)}</div><div class="divider"></div><button class="starter-trail" id="edgeFrom"><strong>${escapeHTML(from.title)}</strong><span>From this entry ↓</span></button><button class="starter-trail" id="edgeTo"><strong>${escapeHTML(to.title)}</strong><span>To this entry</span></button><p class="summary">${escapeHTML(e.explanation || 'Add an explanation of this relationship.')}</p><div class="inspector-actions"><button id="editEdge">Edit connection</button><button id="addSupport">＋ Supporting note</button>${e.status !== 'Reviewed' ? '<button id="reviewEdge">Mark reviewed</button>' : ''}</div><h3>Connection strength</h3><p class="micro">${s.relations} distinct labeled relationship${s.relations === 1 ? '' : 's'} between these entries, plus ${s.supports} distinct supporting note${s.supports === 1 ? '' : 's'} on this relationship. Thickness is 1 + log₂(1 + these counts). This measures recorded connectivity, not legal authority, truth, or your mastery.</p><h3>Sources for this connection</h3>${e.sources.length ? sourceHTML(e.sources) : '<p class="micro">No external source attached. This may be your own comparison or a class-note connection.</p>'}<h3>Supporting notes (${e.supports.length})</h3>${e.supports.map((s) => `<div class="support-card"><p>${escapeHTML(s.text)}</p><small>${escapeHTML(s.source || 'No source recorded')}</small><button class="mini-button" data-edit-support="${escapeHTML(s.id)}">Edit</button> <button class="mini-button danger" data-remove-support="${escapeHTML(s.id)}">Remove</button></div>`).join('') || '<p class="micro">Add distinct cases, observations, or class notes that explain this connection. Exact duplicate text-and-source pairs are ignored.</p>'}<div class="divider"></div><button id="deleteEdge" class="text-button danger">Delete this connection</button>`;
  $('edgeFrom').onclick = () => selectNode(e.source, true);
  $('edgeTo').onclick = () => selectNode(e.target, true);
  $('editEdge').onclick = () => edgeForm(e.id);
  $('addSupport').onclick = () => supportForm(e.id);
  if ($('reviewEdge'))
    $('reviewEdge').onclick = () => {
      transact('Reviewed connection: ' + e.label, () => {
        edgeById(e.id).status = 'Reviewed';
        edgeById(e.id).updatedAt = now();
      });
      toast('Marked reviewed. This records your review, not automated legal verification.');
    };
  $('inspector')
    .querySelectorAll('[data-edit-support]')
    .forEach((b) => (b.onclick = () => supportForm(e.id, b.dataset.editSupport)));
  $('inspector')
    .querySelectorAll('[data-remove-support]')
    .forEach(
      (b) =>
        (b.onclick = () =>
          confirmDialog(
            'Remove supporting note?',
            'The relationship will remain. Undo is available during this session.',
            () =>
              transact('Removed supporting note', () => {
                edgeById(e.id).supports = edgeById(e.id).supports.filter(
                  (s) => s.id !== b.dataset.removeSupport,
                );
                edgeById(e.id).updatedAt = now();
              }),
          )),
    );
  $('deleteEdge').onclick = () =>
    confirmDialog(
      'Delete connection?',
      `This deletes “${e.label}” and its supporting notes. Undo is available during this session.`,
      () =>
        transact('Deleted connection: ' + e.label, () => {
          data.edges = data.edges.filter((x) => x.id !== e.id);
        }),
    );
}
function modal(title, html) {
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = html;
  if (!$('modal').open) $('modal').showModal();
}
function closeModal() {
  $('modal').close();
}
$('closeModal').onclick = closeModal;
$('modal').addEventListener('click', (e) => {
  if (e.target === $('modal')) {
    const r = $('modal').getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeModal();
  }
});
function field(label, name, val = '', type = 'input', hint = '', attrs = '') {
  return `<label class="form-field"><span>${escapeHTML(label)}</span>${type === 'textarea' ? `<textarea name="${name}" ${attrs}>${escapeHTML(val)}</textarea>` : `<input name="${name}" value="${escapeHTML(val)}" ${attrs}>`}${hint ? `<small>${escapeHTML(hint)}</small>` : ''}</label>`;
}
function sel(label, name, options, value) {
  return `<label class="form-field"><span>${escapeHTML(label)}</span><select name="${name}">${options.map((x) => `<option value="${escapeHTML(x)}" ${x === value ? 'selected' : ''}>${escapeHTML(x)}</option>`).join('')}</select></label>`;
}
function sourcesText(s) {
  return (s || []).map((x) => (x.label || 'Source') + ' | ' + x.url).join('\n');
}
function parseSources(text) {
  return text
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((line) => {
      const i = line.lastIndexOf('|');
      let url = (i < 0 ? line : line.slice(i + 1)).trim(),
        label = i < 0 ? 'Source' : line.slice(0, i).trim();
      if (i < 0 && !safeURL(url)) {
        label = line;
        url = '';
      }
      if (url && !safeURL(url)) throw Error('Use a web URL, #book=284, or a citation label with no URL.');
      return { label, url: url ? safeURL(url) : '' };
    });
}
function formWrap(body, button = 'Save') {
  return `<form id="editForm">${body}<div id="formError" class="form-error" role="alert"></div><div class="form-actions"><button type="button" id="cancelForm">Cancel</button><button class="primary" type="submit">${button}</button></div></form>`;
}
function wireForm(fn) {
  $('cancelForm').onclick = closeModal;
  $('editForm').onsubmit = (e) => {
    e.preventDefault();
    try {
      fn(new FormData(e.target));
      closeModal();
    } catch (err) {
      $('formError').textContent = err.message;
    }
  };
}
function nodeForm(id = null) {
  const n = id
    ? nodeById(id)
    : {
        title: '',
        shortTitle: '',
        kind: 'Concept',
        courses: ['Cross-course'],
        summary: '',
        notes: '',
        tags: [],
        sources: [],
        sections: {},
        status: 'User note',
      };
  modal(
    id ? 'Edit entry' : 'Add an entry',
    formWrap(
      field('Title', 'title', n.title, 'input', '', 'required maxlength="1000"') +
        field(
          'Short graph label',
          'shortTitle',
          n.shortTitle,
          'input',
          'The full title stays in the reading panel.',
        ) +
        `<div class="form-row">${sel('Entry type', 'kind', KINDS, n.kind)}${sel('Note status', 'status', uniq(['User note', 'Starter', 'Source checked', 'Needs review', n.status]), n.status)}</div>` +
        field(
          'Courses',
          'courses',
          n.courses.join(', '),
          'input',
          'Separate course names with commas. This records which courses the entry belongs to.',
        ) +
        field(
          'Summary',
          'summary',
          n.summary,
          'textarea',
          'Keep the rule, concept, or question visible at a glance.',
          'rows="3"',
        ) +
        `<details id="caseFields" ${n.kind === 'Case' ? 'open' : ''}><summary>Case brief: six sections</summary><div>${CASE_HEADINGS.map((h, i) => field(h, 'section' + i, n.sections?.[h] || '', 'textarea', '', 'rows="3"')).join('')}</div></details>` +
        field(
          'Notes, qualifications, and class discussion',
          'notes',
          n.notes,
          'textarea',
          'These are plain-text notes. No markup or scripts are executed.',
          'rows="7"',
        ) +
        field('Tags', 'tags', n.tags.join(', '), 'input', 'Separate tags with commas.') +
        field(
          'Source links',
          'sources',
          sourcesText(n.sources),
          'textarea',
          'One per line: label | https://… or label | #book=284. A citation label alone is also accepted.',
          'rows="3"',
        ),
    ),
  );
  $('editForm').elements.kind.onchange = (e) => {
    $('caseFields').open = e.target.value === 'Case';
  };
  wireForm((f) => {
    const title = f.get('title').trim();
    if (!title) throw Error('Enter a title.');
    const sources = parseSources(f.get('sources'));
    const result = {
      ...n,
      id: id || uid('node'),
      title,
      shortTitle: f.get('shortTitle').trim() || title,
      kind: f.get('kind'),
      courses: cleanList(f.get('courses')),
      status: f.get('status'),
      summary: f.get('summary').trim(),
      notes: f.get('notes').trim(),
      tags: cleanList(f.get('tags')),
      sources,
      sections: { ...n.sections },
      updatedAt: now(),
      createdAt: n.createdAt || now(),
    };
    CASE_HEADINGS.forEach((h, i) => (result.sections[h] = f.get('section' + i).trim()));
    if (!result.courses.length) result.courses = ['Cross-course'];
    if (!id) {
      const extent = cy.extent();
      result.position = { x: (extent.x1 + extent.x2) / 2, y: (extent.y1 + extent.y2) / 2 };
    }
    transact((id ? 'Edited entry: ' : 'Added entry: ') + title, () => {
      if (id) data.nodes[data.nodes.findIndex((n) => n.id === id)] = result;
      else data.nodes.push(result);
    });
    // New entries should be visible even when a previous filter was narrow.
    if (!id) {
      activeCourses = null;
      focusId = null;
      trail = null;
      $('kindFilter').value = '';
      query = '';
      $('search').value = '';
      renderCourses();
    }
    selectNode(result.id, true);
    toast('Entry saved.');
  });
}
function nodeSelect(label, name, id) {
  return `<label class="form-field"><span>${label}</span><select name="${name}" required><option value="">Choose an entry…</option>${[
    ...data.nodes,
  ]
    .sort((a, b) => a.title.localeCompare(b.title))
    .map(
      (n) =>
        `<option value="${escapeHTML(n.id)}" ${n.id === id ? 'selected' : ''}>${escapeHTML(n.title)}</option>`,
    )
    .join('')}</select></label>`;
}
function edgeForm(id = null, from = null) {
  if (data.nodes.length < 2) {
    toast('Add at least two entries before connecting them.');
    return;
  }
  const e = id
    ? edgeById(id)
    : {
        source: from || (selected?.type === 'node' ? selected.id : ''),
        target: '',
        label: '',
        kind: 'Doctrine',
        status: 'Proposed',
        explanation: '',
        supports: [],
        sources: [],
      };
  modal(
    id ? 'Edit connection' : 'Explain a connection',
    formWrap(
      nodeSelect('From', 'source', e.source) +
        nodeSelect('To', 'target', e.target) +
        field(
          'Relationship label',
          'label',
          e.label,
          'input',
          'For example: applies, limits, distinguishes, shares a rationale, or creates an exception.',
          'required maxlength="500"',
        ) +
        `<div class="form-row">${sel('Connection type', 'kind', REL_KINDS, e.kind)}${sel('Review status', 'status', ['Proposed', 'Reviewed', 'Disputed'], e.status)}</div>` +
        field(
          'Why are these connected?',
          'explanation',
          e.explanation,
          'textarea',
          'State the legal relationship or the precise basis and limits of your comparison.',
          'required rows="5"',
        ) +
        field(
          'Source links',
          'sources',
          sourcesText(e.sources),
          'textarea',
          'One per line: Source label | https://… . You can add dated class notes as supporting notes.',
          'rows="3"',
        ),
    ),
  );
  wireForm((f) => {
    const source = f.get('source'),
      target = f.get('target'),
      label = f.get('label').trim();
    if (!source || !target || source === target) throw Error('Choose two different entries.');
    if (!label) throw Error('Enter a relationship label.');
    const dupe = data.edges.find(
      (x) =>
        x.id !== id &&
        x.source === source &&
        x.target === target &&
        x.kind === f.get('kind') &&
        x.label.toLowerCase() === label.toLowerCase(),
    );
    if (dupe)
      throw Error(
        'That labeled connection already exists. Open it and add a distinct supporting note instead.',
      );
    const result = {
      ...e,
      id: id || uid('edge'),
      source,
      target,
      label,
      kind: f.get('kind'),
      status: f.get('status'),
      explanation: f.get('explanation').trim(),
      sources: parseSources(f.get('sources')),
      createdAt: e.createdAt || now(),
      updatedAt: now(),
    };
    transact((id ? 'Edited connection: ' : 'Added connection: ') + label, () => {
      if (id) data.edges[data.edges.findIndex((e) => e.id === id)] = result;
      else data.edges.push(result);
    });
    selectEdge(result.id);
    toast('Connection saved.');
  });
}
function supportForm(edgeId, supportId = null) {
  const e = edgeById(edgeId),
    s = supportId ? e.supports.find((x) => x.id === supportId) : { text: '', source: '' };
  modal(
    supportId ? 'Edit supporting note' : 'Add a supporting note',
    formWrap(
      `<p class="modal-copy">Connection: ${escapeHTML(e.label)}. Add a distinct observation or example. The app checks exact text-and-source duplicates; you assess whether evidence is genuinely independent.</p>` +
        field('Supporting observation', 'text', s.text, 'textarea', '', 'required rows="5"') +
        field(
          'Source, case, or class session',
          'source',
          s.source,
          'input',
          'Include a citation or date so you can retrace this observation.',
        ),
    ),
  );
  wireForm((f) => {
    const text = f.get('text').trim(),
      source = f.get('source').trim();
    if (!text) throw Error('Write the supporting observation.');
    const key = (text + '|' + source).toLowerCase();
    if (
      e.supports.some(
        (x) => x.id !== supportId && (x.text.trim() + '|' + x.source.trim()).toLowerCase() === key,
      )
    )
      throw Error('That exact observation and source are already recorded.');
    transact('Saved supporting note', () => {
      const entry = edgeById(edgeId),
        r = { id: supportId || uid('support'), text, source, createdAt: s.createdAt || now() };
      if (supportId) entry.supports[entry.supports.findIndex((x) => x.id === supportId)] = r;
      else entry.supports.push(r);
      entry.updatedAt = now();
    });
    toast('Supporting note saved; line thickness updated.');
  });
}
function confirmDialog(title, text, fn) {
  modal(
    title,
    `<p class="modal-copy">${escapeHTML(text)}</p><div class="form-actions"><button id="confirmCancel">Cancel</button><button class="primary" id="confirmYes">Confirm</button></div>`,
  );
  $('confirmCancel').onclick = closeModal;
  $('confirmYes').onclick = () => {
    try {
      fn();
      closeModal();
    } catch (err) {
      toast(err.message);
    }
  };
}
function pathForm() {
  modal(
    'Find a connection trail',
    formWrap(
      '<p class="modal-copy">Find a shortest trail through recorded links, treating directions as traversable both ways. This shows an exploratory relationship path; it does not establish a chain of legal authority. Disputed links can appear and remain marked.</p>' +
        nodeSelect('Start', 'start', selected?.type === 'node' ? selected.id : '') +
        nodeSelect('Finish', 'finish', ''),
      'Find trail',
    ),
  );
  wireForm((f) => {
    const start = f.get('start'),
      finish = f.get('finish');
    if (!start || !finish) throw Error('Choose both entries.');
    const queue = [start],
      seen = new Set([start]),
      previous = new Map();
    for (let i = 0; i < queue.length && !seen.has(finish); i++) {
      const id = queue[i];
      for (const e of data.edges) {
        const next = e.source === id ? e.target : e.target === id ? e.source : null;
        if (next && !seen.has(next)) {
          seen.add(next);
          previous.set(next, { id, edge: e.id });
          queue.push(next);
        }
      }
    }
    if (!seen.has(finish))
      throw Error('No recorded connection trail exists yet. Add a relationship that joins these areas.');
    const ns = [finish],
      es = [];
    let cursor = finish;
    while (cursor !== start) {
      const p = previous.get(cursor);
      ns.push(p.id);
      es.push(p.edge);
      cursor = p.id;
    }
    trail = { nodes: ns.reverse(), edges: es.reverse() };
    focusId = null;
    selected = null;
    activeCourses = null;
    $('kindFilter').value = '';
    $('relationFilter').value = '';
    query = '';
    $('search').value = '';
    renderCourses();
    applyView();
    renderInspector();
    fit();
  });
}
function download(name, content, type = 'application/json') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function exportJSON() {
  capturePositions();
  download('legal-atlas-r' + data.revision + '.json', JSON.stringify(data, null, 2));
  exported = true;
  saveCache();
  toast('Graph JSON downloaded. Keep this as your portable master copy.');
}
function exportHTML() {
  capturePositions();
  const root = document.documentElement.cloneNode(true);
  root.querySelector('#seedData').textContent = JSON.stringify(data).replace(/</g, '\\u003c');
  root.querySelector('#graph').innerHTML = '';
  root.querySelector('#bookDialog').removeAttribute('open');
  root.querySelector('#sourceImage').removeAttribute('src');
  root.querySelector('#rawPageText').textContent = '';
  root.querySelector('#bookSearchResults').innerHTML = '';
  root.querySelector('#bookRelated').innerHTML = '';
  root.querySelector('#modal').removeAttribute('open');
  root.querySelector('#modalBody').innerHTML = '';
  root.querySelector('#toast').style.display = 'none';
  root.querySelector('#storageWarning').hidden = true;
  download('Legal-Atlas-r' + data.revision + '.html', '<!doctype html>\n' + root.outerHTML, 'text/html');
  exported = true;
  saveCache();
  toast('Portable HTML downloaded with the current graph embedded.');
}
function markdownSourceURL(url) {
  if (/^#book=\d+$/.test(url)) {
    const r = BOOK[+url.split('=')[1]];
    return r ? 'Contracts-Assigned-Source-Pages.pdf#page=' + r.packetPage : url;
  }
  return url;
}
function markdown(n, names) {
  const lines = [
    '---',
    'id: ' + JSON.stringify(n.id),
    'type: ' + JSON.stringify(n.kind),
    'courses: ' + JSON.stringify(n.courses),
    'status: ' + JSON.stringify(n.status),
    'tags: ' + JSON.stringify(n.tags),
    '---',
    '',
    '# ' + n.title,
    '',
    n.summary,
    '',
  ];
  if (n.kind === 'Case')
    for (const h of CASE_HEADINGS) lines.push('## ' + h, '', n.sections[h] || 'Not yet added.', '');
  if (n.notes) lines.push('## Notes and qualifications', '', n.notes, '');
  lines.push('## Sources', '');
  for (const s of n.sources)
    lines.push('- [' + (s.label || 'Source').replace(/[\[\]]/g, '') + '](' + markdownSourceURL(s.url) + ')');
  lines.push('', '## Connections', '');
  for (const e of data.edges.filter((e) => e.source === n.id || e.target === n.id)) {
    const out = e.source === n.id,
      other = out ? e.target : e.source;
    lines.push(
      '### ' + (out ? '→ ' : '← ') + e.label,
      '',
      '[[' + names.get(other) + '|' + nodeById(other).title.replace(/[\[\]|]/g, '') + ']]',
      '',
      e.kind + ' · ' + e.status,
      '',
      e.explanation,
      '',
    );
    for (const s of e.sources)
      lines.push(
        'Source: ' +
          (s.url
            ? '[' + (s.label || 'Source').replace(/[\[\]]/g, '') + '](' + markdownSourceURL(s.url) + ')'
            : s.label),
      );
    for (const s of e.supports) lines.push('', 'Supporting note: ' + s.text, '', 'Source: ' + s.source);
    lines.push('');
  }
  return lines.join('\n');
}
// ZIP STORE writer: UTF-8 filenames, CRC-32, no dependency or remote service.
function zipBlob(files) {
  const enc = new TextEncoder();
  const parts = [],
    central = [];
  let offset = 0;
  const table = Array.from({ length: 256 }, (_, i) => {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (a) => {
    let c = 0xffffffff;
    for (const b of a) c = table[(c ^ b) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  for (const [name, content] of files) {
    const n = enc.encode(name),
      d = enc.encode(content),
      sum = crc(d);
    const local = new Uint8Array(30 + n.length),
      v = new DataView(local.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 0x800, true);
    v.setUint16(12, 0x21, true);
    v.setUint32(14, sum, true);
    v.setUint32(18, d.length, true);
    v.setUint32(22, d.length, true);
    v.setUint16(26, n.length, true);
    local.set(n, 30);
    const c = new Uint8Array(46 + n.length),
      cv = new DataView(c.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x800, true);
    cv.setUint16(14, 0x21, true);
    cv.setUint32(16, sum, true);
    cv.setUint32(20, d.length, true);
    cv.setUint32(24, d.length, true);
    cv.setUint16(28, n.length, true);
    cv.setUint32(42, offset, true);
    c.set(n, 46);
    parts.push(local, d);
    central.push(c);
    offset += local.length + d.length;
  }
  const size = central.reduce((s, x) => s + x.length, 0),
    end = new Uint8Array(22),
    ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, size, true);
  ev.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end], { type: 'application/zip' });
}
function exportMarkdown() {
  capturePositions();
  const names = new Map(
    data.nodes.map((n, i) => [
      n.id,
      String(i + 1).padStart(4, '0') +
        ' ' +
        n.title
          .replace(/[<>:"/\\|?*\[\]#^\x00-\x1f]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 120),
    ]),
  );
  const files = data.nodes.map((n) => ['Legal Atlas/' + names.get(n.id) + '.md', markdown(n, names)]);
  files.push(
    ['Legal Atlas/legal-atlas.json', JSON.stringify(data, null, 2)],
    [
      'Legal Atlas/README.md',
      '# Legal Atlas export\n\nOpen this folder as an Obsidian vault. Notes include wiki-links and explicit relationship descriptions. Obsidian’s core graph does not reproduce the custom relationship labels, weights, or review interface of Legal Atlas. This export is one-way: edits to Markdown are not automatically imported into the app. The JSON preserves the full structured graph.\n\nThis Contracts export contains the assignment 1–9 casebook study layer. Place Contracts-Assigned-Source-Pages.pdf from the project package beside these notes for page links. The browser export does not duplicate that source PDF. Other-course entries are retained starter material. Review scope and sources; no current-law check has been done.\n',
    ],
  );
  download('Legal-Atlas-Obsidian-r' + data.revision + '.zip', zipBlob(files));
  toast('Markdown vault downloaded with a full JSON backup.');
}
function filesMenu() {
  modal(
    'Keep your work portable',
    `<p class="modal-copy">The browser copy is a convenience. Export after meaningful changes. Moving the HTML file, clearing browser data, or changing devices can separate you from that browser copy.</p><button class="file-action primary" id="saveHTML"><strong>Save portable HTML</strong><small>The app and current graph together. Open the saved file in a browser.</small></button><button class="file-action" id="saveJSON"><strong>Export graph JSON</strong><small>A complete, versioned data file for backup and future ChatGPT updates.</small></button><button class="file-action" id="openJSON"><strong>Import graph or proposed update</strong><small>Preview a full graph or a revision-checked update before applying it.</small></button><button class="file-action" id="saveMD"><strong>Export Obsidian Markdown vault</strong><small>One linked Markdown note per entry, plus the full JSON graph.</small></button><button class="file-action" id="rawRecovery"><strong>Download raw recovery copy</strong><small>Retrieve the stored browser text even when it cannot be parsed.</small></button><p class="micro">No automatic cloud, Obsidian, or ChatGPT synchronization is enabled. The app sends no network requests. Opening a source link visits that source in a separate tab.</p>`,
  );
  $('saveHTML').onclick = exportHTML;
  $('saveJSON').onclick = exportJSON;
  $('saveMD').onclick = exportMarkdown;
  $('openJSON').onclick = () => $('importFile').click();
  $('rawRecovery').onclick = () => {
    try {
      const raw = localStorage.getItem(storageKey());
      if (!raw) {
        toast('There is no stored browser copy. Export the open graph instead.');
        return;
      }
      download('legal-atlas-raw-recovery.txt', raw, 'text/plain');
    } catch (err) {
      toast('The browser has blocked access to its stored copy.');
    }
  };
}
function applyPatch(base, p) {
  if (p.schemaVersion !== 1 || p.graphId !== base.graphId || p.baseRevision !== base.revision)
    throw Error(
      'This update belongs to a different graph or revision. Export your current graph and generate a fresh update; no changes were applied.',
    );
  const d = clone(base);
  if (p.corpus) d.corpus = clone(p.corpus);
  if (p.description) d.description = p.description;
  for (const key of ['nodes', 'edges']) {
    if (p[key] != null && !Array.isArray(p[key])) throw Error('Update records must be arrays.');
    for (const record of p[key] || []) {
      const i = d[key].findIndex((x) => x.id === record.id);
      if (i < 0) d[key].push(record);
      else
        d[key][i] =
          key === 'nodes' && d[key][i].position ? { ...record, position: d[key][i].position } : record;
    }
  }
  for (const [records, key] of [
    ['nodes', 'removeNodeIds'],
    ['edges', 'removeEdgeIds'],
  ]) {
    if (p[key] != null && !Array.isArray(p[key])) throw Error('Deleted IDs must be arrays.');
    const remove = new Set(p[key] || []);
    d[records] = d[records].filter((x) => !remove.has(x.id));
  }
  const ids = new Set(d.nodes.map((n) => n.id));
  d.edges = d.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  return normalize(d);
}
$('importFile').onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  if (file.size > 30 * 1024 * 1024) {
    toast('Import is limited to 30 MB.');
    return;
  }
  try {
    const raw = JSON.parse(await file.text()),
      isPatch = raw.format === 'legal-atlas-patch',
      migration = !isPatch && raw.revision === 2 && raw.graphId === base.graphId;
    imported = isPatch ? raw : normalize(raw);
    if (isPatch) applyPatch(data, imported);
    const addN = (raw.nodes || []).filter((n) => !nodeById(n.id)).length,
      addE = (raw.edges || []).filter((x) => !edgeById(x.id)).length;
    modal(
      'Review imported ' + (isPatch ? 'update' : 'graph'),
      `<p class="modal-copy">File: ${escapeHTML(file.name)}<br>${raw.nodes?.length || 0} entry records and ${raw.edges?.length || 0} connection records. ${addN} entry IDs and ${addE} connection IDs are new to this workspace.</p>${isPatch ? `<p class="modal-copy">This update is tied to revision ${raw.baseRevision}. It may replace records with matching IDs and remove ${raw.removeNodeIds?.length || 0} entries and ${raw.removeEdgeIds?.length || 0} connections. Its base revision must still match when you apply it.</p>` : `<label class="form-field"><span>Import mode</span><select id="importMode">${migration ? '<option value="textbook">Apply textbook import to this revision-2 file</option>' : ''}<option value="merge">Merge additions; keep existing IDs unchanged</option><option value="replace">Replace the entire graph with this file</option></select><small>Applying the textbook import replaces this workspace with the uploaded revision-2 graph plus the source-grounded update. Export any current work first. Merge skips records whose IDs already exist. Use Replace to load a complete updated graph. Export the current graph first when keeping another copy matters.</small></label>`}<details><summary>Preview titles and relationships</summary><div class="modal-copy">${(
        raw.nodes || []
      )
        .slice(0, 60)
        .map(
          (n) => '<div>' + escapeHTML(n.title) + ' — ' + (nodeById(n.id) ? 'existing ID' : 'new') + '</div>',
        )
        .join('')}<hr>${(raw.edges || [])
        .slice(0, 60)
        .map(
          (x) =>
            '<div>' +
            escapeHTML(x.label) +
            ' — ' +
            escapeHTML(x.kind) +
            ' — ' +
            escapeHTML(x.status) +
            '</div>',
        )
        .join(
          '',
        )}</div></details><div id="importError" class="form-error"></div><div class="form-actions"><button id="backupImport">Export current graph first</button><button id="cancelImport">Cancel</button><button class="primary" id="applyImport">Apply import</button></div>`,
    );
    $('backupImport').onclick = exportJSON;
    $('cancelImport').onclick = closeModal;
    $('applyImport').onclick = () => {
      try {
        transact('Imported ' + file.name, () => {
          if (isPatch) data = applyPatch(data, imported);
          else if ($('importMode').value === 'textbook')
            data = applyPatch(imported, JSON.parse($('textbookUpdate').textContent));
          else if ($('importMode').value === 'replace') data = clone(imported);
          else {
            const existingN = new Set(data.nodes.map((n) => n.id)),
              existingE = new Set(data.edges.map((x) => x.id));
            data.nodes.push(...clone(imported.nodes.filter((n) => !existingN.has(n.id))));
            data.edges.push(...clone(imported.edges.filter((x) => !existingE.has(x.id))));
          }
        });
        selected = null;
        focusId = null;
        trail = null;
        resetView();
        closeModal();
        toast('Import applied. Undo is available during this session.');
      } catch (err) {
        $('importError').textContent = err.message;
      }
    };
  } catch (err) {
    toast('Import rejected: ' + err.message);
  }
};
function help() {
  modal(
    'How Legal Atlas works',
    `<div class="modal-copy"><h3>Read and explore</h3><p>Click an entry to open its notes, six-section case brief, source links, and connections. Click a line to read its exact label, explanation, review status, and supporting observations. Use Neighborhood to reduce the graph to one, two, or three links from the selected entry.</p><h3>Add your own material</h3><p>Add entry creates a case, concept, rule, hypothetical, or note. Connect creates a directed relationship between two entries. You choose the label and explain it. An analogy or study link is separately marked from a doctrinal relationship.</p><h3>Read visual strength carefully</h3><p>Entries grow with the number of distinct non-navigational neighboring entries. Assignment-membership and source-gap links are excluded from this count. Each line thickens with the number of distinct labeled relationships between its endpoints and the supporting notes on that relationship: 1 + log₂(1 + relationship count + supporting-note count). Exact duplicate observation-and-source pairs are ignored. The app cannot determine whether differently worded observations are independent evidence. Review status remains separate.</p><p>Proposed lines are dashed. Reviewed lines are solid. Disputed lines are red and dotted. Your review flag records your judgment; it is not a legal citator result.</p><h3>Keep your work</h3><p>Browser storage is a convenience, with availability varying by browser, private mode, and file location. Files → Save portable HTML puts the current graph inside a new app file. Export graph JSON produces the authoritative editable data. Keep dated backups. Undo retains the last 30 content changes during this open session; it is not a permanent version archive.</p><h3>Continue with ChatGPT</h3><p>Attach the latest exported JSON with your new notes and ask for a Legal Atlas update. A full replacement graph can be previewed and imported. A legal-atlas-patch update must name this graph ID and exact base revision; it will be refused after conflicting content changes. No API connection or automatic synchronization is included.</p><h3>Use Obsidian</h3><p>Export the Markdown vault, unzip it, and open that folder in Obsidian. Every entry has a note and wiki-links. Custom edge labels and strength remain in the note text and JSON; Obsidian’s core graph does not render this app’s full relationship interface. Markdown edits do not automatically round-trip.</p><h3>Scope of this import</h3><p>The Contracts casebook layer follows assignments 1–9, with 231 source pages, 29 principal casebook briefs, editorial and shorter-authority notes, and unanswered problems. Use Scope & gaps for details. SEL/SUPP documents and lecture notes remain separate gaps. Other-course starter material was preserved, not re-audited. There is no current-law or citator check.</p><h3>Keyboard and accessibility</h3><p>Press / to search. Use Tab and Enter to navigate the entry list and controls. Escape closes a dialog. Trackpad or touch gestures zoom the graph; the buttons also provide zoom and fit. On narrow screens the reading panel appears below the graph.</p><h3>Technology and privacy</h3><p>Single-file HTML and JavaScript with bundled Cytoscape.js 3.33.1. It makes no network requests and requires no account or API key. Clicking a source link opens the external site. This prototype is intended for a personal study graph; very large imports may render slowly.</p></div>`,
  );
}
$('addNodeBtn').onclick = () => nodeForm();
$('addEdgeBtn').onclick = () => edgeForm();
$('filesBtn').onclick = filesMenu;
$('helpBtn').onclick = help;
$('search').oninput = (e) => {
  query = e.target.value;
  applyView();
};
$('kindFilter').onchange = () => {
  applyView();
  fit();
};
$('relationFilter').onchange = () => {
  applyView();
  fit();
};
$('allCourses').onclick = () => {
  activeCourses = null;
  renderCourses();
  applyView();
  fit();
};
$('labelsToggle').onchange = applyView;
$('homeBtn').onclick = resetView;
$('emptyReset').onclick = resetView;
$('globalBtn').onclick = () => {
  focusId = null;
  trail = null;
  applyView();
  renderInspector();
  fit();
};
$('localBtn').onclick = () => {
  if (selected?.type === 'node') focusNode(selected.id);
  else toast('Select an entry first, then open its neighborhood.');
};
$('hops').onchange = () => {
  applyView();
  fit();
};
$('pathBtn').onclick = pathForm;
$('fitBtn').onclick = fit;
function zoom(factor) {
  const rect = $('graph').getBoundingClientRect();
  cy.zoom({
    level: Math.max(cy.minZoom(), Math.min(cy.maxZoom(), cy.zoom() * factor)),
    renderedPosition: { x: rect.width / 2, y: rect.height / 2 },
  });
}
$('zoomIn').onclick = () => zoom(1.3);
$('zoomOut').onclick = () => zoom(1 / 1.3);
$('layoutBtn').onclick = arrangeVisible;
$('undoBtn').onclick = () => {
  if (!undoStack.length) return;
  const rev = data.revision;
  data = undoStack.pop();
  data.revision = rev + 1;
  data.updatedAt = now();
  data.history = [
    ...(data.history || []),
    { at: now(), action: 'Undid previous content change', revision: data.revision },
  ].slice(-100);
  exported = false;
  saveCache();
  renderGraph();
  toast('Previous content change undone.');
};
document.addEventListener('keydown', (e) => {
  if (
    e.key === '/' &&
    !$('modal').open &&
    !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
  ) {
    e.preventDefault();
    $('search').focus();
  }
});
window.addEventListener('beforeunload', (e) => {
  capturePositions();
  if (cacheAvailable) saveCache();
  if (!cacheAvailable && !exported) {
    e.preventDefault();
    e.returnValue = '';
  }
});

wireCorpus();
// A read-only export hook for diagnostics. Application edits should use the UI or revision-checked imports.
window.LegalAtlas = { version: '1.2', snapshot: () => clone(data), sourcePages: () => BOOK_PAGES.slice() };
