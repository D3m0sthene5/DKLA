/* v2.5: keep floating textbook prompts out of the visible atlas. Full records,
 * relationships and owner edits remain recoverable in the exported graph.
 * The explicit reviewed ID list never targets a case, rule or ordinary note.
 */
(() => {
  'use strict';
  if (window.DKLAPracticeFilter) return;
  let review;
  try {
    review = JSON.parse(document.getElementById('dklaPracticeFilter').textContent);
  } catch {
    return;
  }
  const excluded = new Map((review.excluded || []).map((record) => [record.id, record.kind]));
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  function archiveRecord(archive, collection, record) {
    const found = archive[collection].findIndex((item) => item.id === record.id);
    if (found < 0) {
      archive[collection].push(record);
      return;
    }
    const previous = archive[collection][found];
    if (equal(previous, record)) return;
    const versions = collection === 'nodes' ? 'nodeVersions' : 'edgeVersions';
    archive[versions] ||= [];
    // A late legacy importer can reintroduce seed text after the owner edited
    // an archived record. Keep both versions instead of replacing that work.
    if (!archive[versions].some((item) => item.id === record.id && equal(item.record, record))) {
      archive[versions].push({ id: record.id, record });
    }
    if (String(record.updatedAt || '') > String(previous.updatedAt || '')) {
      if (!archive[versions].some((item) => item.id === previous.id && equal(item.record, previous)))
        archive[versions].push({ id: previous.id, record: previous });
      archive[collection][found] = record;
    }
  }

  function filterGraph(graph) {
    if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) return { nodes: 0, edges: 0 };
    const current = new Map(graph.nodes.map((node) => [node.id, node]));
    // Preserve a record the owner repurposed into a case or another entry type.
    const hidden = new Set(
      [...excluded]
        .filter(([id, kind]) => !current.has(id) || current.get(id).kind === kind)
        .map(([id]) => id),
    );
    const nodes = graph.nodes.filter((node) => hidden.has(node.id));
    const edges = graph.edges.filter((edge) => hidden.has(edge.source) || hidden.has(edge.target));
    if (!nodes.length && !edges.length) return { nodes: 0, edges: 0 };
    const archive =
      graph.practiceArchive && typeof graph.practiceArchive === 'object'
        ? copy(graph.practiceArchive)
        : { schemaVersion: 1, nodes: [], edges: [] };
    if (!Array.isArray(archive.nodes)) archive.nodes = [];
    if (!Array.isArray(archive.edges)) archive.edges = [];
    archive.schemaVersion = 1;
    archive.filterVersion = 'v2.5-disconnected-practice-1';
    for (const node of nodes) archiveRecord(archive, 'nodes', node);
    for (const edge of edges) archiveRecord(archive, 'edges', edge);
    graph.practiceArchive = archive;
    graph.nodes = graph.nodes.filter((node) => !hidden.has(node.id));
    graph.edges = graph.edges.filter((edge) => !hidden.has(edge.source) && !hidden.has(edge.target));
    return { nodes: nodes.length, edges: edges.length };
  }

  function filterCurrent() {
    if (typeof data === 'undefined') return { nodes: 0, edges: 0 };
    const result = filterGraph(data);
    if (
      typeof selected !== 'undefined' &&
      selected &&
      ((selected.type === 'node' && !data.nodes.some((node) => node.id === selected.id)) ||
        (selected.type === 'edge' && !data.edges.some((edge) => edge.id === selected.id)))
    )
      selected = null;
    if (typeof focusId !== 'undefined' && focusId && !data.nodes.some((node) => node.id === focusId))
      focusId = null;
    if (
      typeof trail !== 'undefined' &&
      trail &&
      ((trail.nodes || []).some((id) => !data.nodes.some((node) => node.id === id)) ||
        (trail.edges || []).some((id) => !data.edges.some((edge) => edge.id === id)))
    )
      trail = null;
    return result;
  }

  if (typeof normalize === 'function') {
    const previous = normalize;
    normalize = function (...args) {
      const graph = previous.apply(this, args);
      filterGraph(graph);
      return graph;
    };
  }
  if (typeof rebuildIndex === 'function') {
    const previous = rebuildIndex;
    rebuildIndex = function (...args) {
      filterCurrent();
      return previous.apply(this, args);
    };
  }
  if (typeof mergeGraph === 'function') {
    const previous = mergeGraph;
    mergeGraph = function (incoming, ...rest) {
      const result = previous.call(this, incoming, ...rest);
      // The native merge copies visible nodes/edges, but not arbitrary graph
      // fields. Preserve a normalized import's detached owner work explicitly.
      if (incoming?.practiceArchive && typeof data !== 'undefined') {
        const archive = data.practiceArchive
          ? copy(data.practiceArchive)
          : { schemaVersion: 1, nodes: [], edges: [] };
        archive.nodes ||= [];
        archive.edges ||= [];
        for (const node of incoming.practiceArchive.nodes || []) archiveRecord(archive, 'nodes', copy(node));
        for (const edge of incoming.practiceArchive.edges || []) archiveRecord(archive, 'edges', copy(edge));
        for (const collection of ['nodeVersions', 'edgeVersions']) {
          for (const version of incoming.practiceArchive[collection] || []) {
            archive[collection] ||= [];
            if (!archive[collection].some((item) => equal(item, version)))
              archive[collection].push(copy(version));
          }
        }
        archive.schemaVersion = 1;
        archive.filterVersion = 'v2.5-disconnected-practice-1';
        data.practiceArchive = archive;
      }
      filterCurrent();
      return result;
    };
  }
  // All import/cache hydration paths eventually index, draw or save. Wrapping
  // these entry points also catches a late legacy import and an undo snapshot.
  for (const name of ['renderGraph', 'saveCache', 'searchEntries']) {
    if (name === 'renderGraph' && typeof renderGraph === 'function') {
      const previous = renderGraph;
      renderGraph = function (...args) {
        filterCurrent();
        return previous.apply(this, args);
      };
    }
    if (name === 'saveCache' && typeof saveCache === 'function') {
      const previous = saveCache;
      saveCache = function (...args) {
        filterCurrent();
        return previous.apply(this, args);
      };
    }
    if (name === 'searchEntries' && typeof searchEntries === 'function') {
      const previous = searchEntries;
      searchEntries = function (...args) {
        const result = filterCurrent();
        if ((result.nodes || result.edges) && typeof rebuildIndex === 'function') rebuildIndex();
        return previous.apply(this, args);
      };
    }
  }
  window.DKLAPracticeFilter = {
    review,
    excludedIds: [...excluded.keys()],
    filterGraph,
    apply: filterCurrent,
    isExcluded(id, node) {
      return excluded.has(id) && (!node || node.kind === excluded.get(id));
    },
    archived(id) {
      if (typeof data === 'undefined') return null;
      return data.practiceArchive?.nodes?.find((node) => node.id === id) || null;
    },
  };
  (function whenReady() {
    if (!window.LegalAtlas?.ready || typeof data === 'undefined') {
      setTimeout(whenReady, 120);
      return;
    }
    const result = filterCurrent();
    if (result.nodes || result.edges) {
      if (typeof rebuildIndex === 'function') rebuildIndex();
      if (typeof saveCache === 'function') saveCache();
      if (typeof renderInspector === 'function') renderInspector();
      if (typeof schedule === 'function') schedule();
    }
  })();
})();
