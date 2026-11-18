/* Course decision trees. Published study data stays independent of the user's saved map. */
(() => {
  'use strict';
  const embedded = document.getElementById('dklaFlowchartsData');
  if (!embedded) return;

  const courses = {
    K: { name: 'Contracts', tab: 'Contracts' },
    CP: { name: 'Civil Procedure', tab: 'Civil Procedure' },
    LRS: { name: 'Legislation and the Regulatory State', tab: 'LRS' },
    X: { name: 'Cross-course', tab: 'Cross-course' },
  };
  const courseOf = (id) => id.split('-')[0];
  const charts = new Map(JSON.parse(embedded.textContent).map((chart) => [chart.id, chart]));
  const chartURL = (id) => '#flowchart=' + encodeURIComponent(id);
  const sourceURL = (id) => '#node=' + encodeURIComponent(id);
  const relatedBySource = new Map();
  for (const chart of charts.values())
    for (const id of new Set(chart.nodes.flatMap((node) => node.sources))) {
      if (!relatedBySource.has(id)) relatedBySource.set(id, []);
      relatedBySource.get(id).push(chart);
    }
  // v3.1: the steps of each chart that cite an entry, and the shortest path from the chart's start
  // to the deepest of them (with the branch taken at each step), for the case page and for opening
  // a chart at that step.
  function pathTo(chart, target) {
    const byId = new Map(chart.nodes.map((node) => [node.id, node]));
    const back = new Map([[chart.entry, null]]);
    const queue = [chart.entry];
    while (queue.length) {
      const id = queue.shift();
      if (id === target) break;
      (byId.get(id)?.edges || []).forEach((edge, index) => {
        if (!back.has(edge.to)) {
          back.set(edge.to, { from: id, index, label: edge.label });
          queue.push(edge.to);
        }
      });
    }
    if (!back.has(target)) return [{ id: target }];
    const path = [];
    for (let id = target; id; id = back.get(id)?.from) {
      const step = back.get(id);
      path.unshift(step ? { id, label: step.label, edge: step.index } : { id });
    }
    return path;
  }
  function stepsCiting(id) {
    return (relatedBySource.get(id) || [])
      .map((chart) => {
        const number = new Map(chart.nodes.map((node, i) => [node.id, i + 1]));
        const cited = chart.nodes.filter((node) => node.sources.includes(id));
        const paths = cited.map((node) => pathTo(chart, node.id));
        const deepest = paths.reduce((a, b) => (b.length > a.length ? b : a), paths[0]);
        return { chart, number, cited, path: deepest, share: cited.length / chart.nodes.length };
      })
      .sort((a, b) => b.cited.length - a.cited.length || b.share - a.share);
  }
  const stepURL = (chartId, stepId, from) =>
    `#flowchart=${encodeURIComponent(chartId)}&step=${encodeURIComponent(stepId)}${from ? '&from=' + encodeURIComponent(from) : ''}`;
  const sourceNames = new Map(
    base.nodes.filter((node) => relatedBySource.has(node.id)).map((node) => [node.id, node.title]),
  );
  const titleOf = (id) => nodesById.get(id)?.title || sourceNames.get(id) || id;
  const esc = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
    );
  const normalized = (value) =>
    value
      .normalize('NFKD')
      .toLowerCase()
      .replace(/\p{M}/gu, '')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();

  const dialog = document.createElement('dialog');
  dialog.id = 'dklaFlowcharts';
  dialog.setAttribute('aria-labelledby', 'flowchartsTitle');
  const shell = document.getElementById(dialog.id); // A portable export may contain its previous shell.
  if (shell) shell.replaceWith(dialog);
  else document.body.append(dialog);
  dialog.innerHTML = `
    <header class="fc-header">
      <div id="flowchartsHeading"></div>
      <button type="button" class="fc-close" data-flowcharts-close aria-label="Close flowcharts">×</button>
    </header>
    <div class="fc-body" tabindex="-1"></div>`;
  const heading = dialog.querySelector('#flowchartsHeading');
  const body = dialog.querySelector('.fc-body');
  const sessions = new Map();
  const library = { course: 'all', query: '' };
  let active = null;
  let showing = null;

  function chartIndex(chart) {
    if (!chart.searchIndex)
      chart.searchIndex = normalized(
        [
          chart.id,
          chart.title,
          courses[courseOf(chart.id)].name,
          ...chart.nodes.flatMap((node) => [
            node.label,
            node.detail,
            ...node.edges.map((edge) => edge.label),
            ...node.sources.map(titleOf),
            ...(node.links || []).map((link) => link.label),
          ]),
        ].join(' '),
      );
    return chart.searchIndex;
  }

  function fillLibrary() {
    const words = normalized(library.query).split(' ').filter(Boolean);
    const results = body.querySelector('.fc-results');
    const groups = Object.entries(courses).filter(
      ([id]) => library.course === 'all' || id === library.course,
    );
    let total = 0;
    results.innerHTML = groups
      .map(([id, course]) => {
        const matches = [...charts.values()].filter(
          (chart) => courseOf(chart.id) === id && words.every((word) => chartIndex(chart).includes(word)),
        );
        total += matches.length;
        if (!matches.length) return '';
        return `<section class="fc-course" data-fc-course="${id}" aria-labelledby="fcCourse-${id}">
        <h3 id="fcCourse-${id}">${course.name}</h3>
        <div class="fc-cards">${matches
          .map(
            (chart) => `
          <a class="fc-card" href="${chartURL(chart.id)}" data-flowchart-id="${chart.id}">
            <small>${chart.id}</small><strong>${esc(chart.title)}</strong><span aria-hidden="true">↗</span>
          </a>`,
          )
          .join('')}</div></section>`;
      })
      .join('');
    body.querySelector('.fc-count').textContent =
      total === 0 ? 'No flowcharts match your search.' : `${total} flowchart${total === 1 ? '' : 's'}`;
    for (const button of body.querySelectorAll('[data-flowcharts-course]'))
      button.setAttribute('aria-pressed', String(button.dataset.flowchartsCourse === library.course));
  }

  function renderLibrary() {
    delete dialog.dataset.printChart;
    delete dialog.dataset.fcCourse;
    heading.innerHTML = '<h2 id="flowchartsTitle">Course flowcharts</h2>';
    body.innerHTML = `
      <div class="fc-library-controls">
        <div class="fc-tabs" role="group" aria-label="Filter by course">
          ${[['all', { tab: 'All courses' }], ...Object.entries(courses)]
            .map(
              ([id, course]) => `<button type="button" data-flowcharts-course="${id}">${course.tab}</button>`,
            )
            .join('')}
        </div>
        <label class="fc-search">Find a flowchart<input type="search" data-flowcharts-search
          value="${esc(library.query)}" placeholder="Topic, case, or chart number" autocomplete="off"></label>
        <p class="fc-count" role="status"></p>
      </div>
      <div class="fc-results"></div>`;
    fillLibrary();
  }

  function makeSession(chart) {
    // Number the author's ordered list independently of where each step appears in the diagram.
    const byId = new Map(chart.nodes.map((node, index) => [node.id, { ...node, number: index + 1 }]));
    return { chart, byId, trail: [{ id: chart.entry }], view: 'walkthrough', zoom: 1 };
  }

  function graphLayout({ chart, byId }) {
    const rows = [];
    const incoming = new Map(chart.nodes.map((node) => [node.id, []]));
    for (const node of chart.nodes)
      node.edges.forEach((edge, index) => incoming.get(edge.to).push({ from: node.id, index }));

    // Ignore only ancestral return edges when building the layer order. Show them in the diagram
    // because some doctrines send the reader back to repeat a step with a different case or claim.
    const forward = new Map(chart.nodes.map((node) => [node.id, []]));
    const visited = new Set();
    const ancestors = new Set();
    function walk(id) {
      if (visited.has(id)) return;
      visited.add(id);
      ancestors.add(id);
      for (const edge of byId.get(id).edges) {
        if (ancestors.has(edge.to)) continue;
        forward.get(edge.to).push(id);
        walk(edge.to);
      }
      ancestors.delete(id);
    }
    walk(chart.entry);
    const ranks = new Map();
    function rank(id) {
      if (!ranks.has(id)) ranks.set(id, Math.max(0, ...forward.get(id).map((from) => rank(from) + 1)));
      return ranks.get(id);
    }
    for (const node of byId.values()) (rows[rank(node.id)] ||= []).push(node);

    const cardWidth = 244;
    const gap = 32;
    const padding = 28;
    const rowGap = 68;
    let leftLanes = 0;
    let rightLanes = 0;
    const widest = Math.max(...rows.map((row) => row.length));
    const contentWidth = widest * (cardWidth + gap) - gap;
    const positions = new Map();
    let y = padding;
    rows.forEach((row, level) => {
      const parentPosition = (node) => {
        const parents = forward.get(node.id);
        return parents.length
          ? parents.reduce((sum, from) => sum + positions.get(from).x, 0) / parents.length
          : 0;
      };
      row.sort((a, b) => parentPosition(a) - parentPosition(b));
      const cardHeight = (node) => (node.edges.length ? 89 + node.edges.length * 51 : 108);
      const rowHeight = Math.max(...row.map(cardHeight));
      let x = (contentWidth - (row.length * (cardWidth + gap) - gap)) / 2;
      for (const node of row) {
        positions.set(node.id, {
          x,
          y,
          level,
          width: cardWidth,
          height: cardHeight(node),
          rowEnd: y + rowHeight,
        });
        x += cardWidth + gap;
      }
      y += rowHeight + rowGap;
    });

    const wires = [];
    for (const node of byId.values()) {
      const from = positions.get(node.id);
      node.edges.forEach((edge, index) => {
        const to = positions.get(edge.to);
        const parents = incoming.get(edge.to);
        const port = parents.findIndex((parent) => parent.from === node.id && parent.index === index);
        const sx = from.x + (cardWidth * (index + 1)) / (node.edges.length + 1);
        const tx = to.x + (cardWidth * (port + 1)) / (parents.length + 1);
        const sy = from.y + from.height;
        let path;
        if (to.level === from.level + 1) {
          const middle = (from.rowEnd + to.y) / 2;
          path = `M ${sx} ${sy} V ${from.rowEnd} C ${sx} ${middle}, ${tx} ${middle}, ${tx} ${to.y - 3}`;
        } else {
          const side = (sx + tx) / 2 < contentWidth / 2 ? -1 : 1;
          const lane = side < 0 ? ++leftLanes : ++rightLanes;
          const outer = (side < 0 ? 0 : contentWidth) + side * (12 + lane * 9);
          path = `M ${sx} ${sy} V ${from.rowEnd + 16 + index * 6} H ${outer} V ${to.y - 16 - port * 4} H ${tx} V ${to.y - 3}`;
        }
        wires.push({ path, from: node.id, edge: index });
      });
    }
    const shift = padding + (leftLanes ? 12 + leftLanes * 9 : 0);
    const width = contentWidth + shift + padding + (rightLanes ? 12 + rightLanes * 9 : 0);
    return { positions, wires, shift, width, height: y - rowGap + padding };
  }

  const badge = (node) => `<span class="fc-number" aria-hidden="true">${node.number}</span>`;
  const nodeType = (node) => (node.edges.length ? '' : 'Outcome');
  function graphHTML(session) {
    const { byId } = session;
    const { positions, wires, shift, width, height } = graphLayout(session);
    const printScale = Math.min(1, 640 / width, 800 / height);
    return `<section class="fc-map" hidden aria-label="Whole flowchart">
      <div class="fc-map-tools">
        <div class="fc-zoom" role="group" aria-label="Diagram zoom">
          <button type="button" data-flowcharts-zoom="out" aria-label="Zoom out">−</button>
          <button type="button" data-flowcharts-zoom="in" aria-label="Zoom in">+</button>
          <button type="button" data-flowcharts-zoom="fit" aria-label="Fit whole map">Fit</button>
          <button type="button" data-flowcharts-zoom="reset" aria-label="Reset zoom to 100%">100%</button>
        </div>
        <output class="fc-zoom-value" aria-label="Diagram zoom level"></output>
      </div>
      <p class="fc-map-help">Select a step to read its details.</p>
      <div class="fc-map-scroll" role="region" aria-label="Scrollable flowchart diagram" tabindex="0">
        <div class="fc-graph" style="--fc-graph-width:${width}px;--fc-graph-height:${height}px;--fc-print-scale:${printScale}">
          <svg class="fc-wires" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">
            <defs><marker id="fcArrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 0 0 L 8 4 L 0 8 Z"></path></marker></defs>
            <g transform="translate(${shift} 0)">${wires
              .map(
                ({ path, from, edge }) =>
                  `<path class="fc-wire" data-fc-from="${esc(from)}" data-fc-edge="${edge}" d="${path}" marker-end="url(#fcArrow)"></path>`,
              )
              .join('')}</g>
          </svg>
          ${[...byId.values()]
            .map((node) => {
              const pos = positions.get(node.id);
              return `<article class="fc-map-node${node.edges.length ? '' : ' fc-outcome'}" data-fc-cell="${esc(node.id)}"
              style="left:${pos.x + shift}px;top:${pos.y}px;width:${pos.width}px;height:${pos.height}px">
              <button type="button" class="fc-node-heading" data-flowchart-node="${esc(node.id)}">
                ${badge(node)}<span><span class="fc-sr-only">Step ${node.number}. </span>${esc(node.label)}</span></button>
              ${
                node.edges.length
                  ? `<ul>${node.edges
                      .map(
                        (edge, index) =>
                          `<li><button type="button" data-fc-map-branch="${index}" data-fc-from="${esc(node.id)}">
                  <span>${esc(edge.label)}</span><span class="fc-destination">→ ${byId.get(edge.to).number}</span>
                </button></li>`,
                      )
                      .join('')}</ul>`
                  : `<small class="fc-node-type">${nodeType(node)}</small>`
              }
            </article>`;
            })
            .join('')}
        </div>
      </div>
    </section>`;
  }

  function sourcesHTML(node) {
    // v3.1: each source says what kind of entry it is (case, rule, concept).
    const KIND = { Case: 'Case', Rule: 'Rule', Concept: 'Concept', Statute: 'Statute', Note: 'Note' };
    const links = node.sources.map((id) => {
      const title = esc(titleOf(id));
      const kind = KIND[nodesById.get(id)?.kind] || 'Entry';
      return nodesById.has(id)
        ? `<a href="${sourceURL(id)}" data-flowchart-source="${esc(id)}"><small class="fc-kind">${kind}</small>${title}</a>`
        : title;
    });
    for (const link of node.links || [])
      if (/^https:\/\//i.test(link.url))
        links.push(
          `<a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.label)} <span aria-label="opens in a new tab">↗</span></a>`,
        );
    return links.length
      ? `<section class="fc-sources"><h4>Sources</h4><ul>${links.map((link) => `<li>${link}</li>`).join('')}</ul></section>`
      : '';
  }

  function relatedHTML(related) {
    const links = (related || []).filter((item) => charts.has(item.id));
    return links.length
      ? `<section class="fc-related"><h4>Related flowcharts</h4><ul>${links
          .map(
            (item) =>
              `<li><a href="${chartURL(item.id)}" data-flowchart-id="${esc(item.id)}">${esc(item.label || charts.get(item.id).title)}</a></li>`,
          )
          .join('')}</ul></section>`
      : '';
  }

  function printHTML(session) {
    return `<section class="fc-print-notes" aria-label="All numbered steps">
      <h3>Steps and sources</h3>
      ${[...session.byId.values()]
        .map(
          (node) => `<article class="fc-print-note">
        <h4>${node.number}. ${esc(node.label)}</h4>
        <p>${esc(node.detail)}</p>
        ${
          node.edges.length
            ? `<ul class="fc-print-branches">${node.edges
                .map((edge) => `<li>${esc(edge.label)} → ${session.byId.get(edge.to).number}</li>`)
                .join('')}</ul>`
            : ''
        }
        ${sourcesHTML(node)}
        ${relatedHTML(node.related)}
      </article>`,
        )
        .join('')}
      ${relatedHTML(session.chart.related)}
    </section>`;
  }

  function currentZoom(graph) {
    return Number(graph.style.getPropertyValue('--fc-map-scale')) || 1;
  }

  function paintZoom({ center = false, preserve = false } = {}) {
    const scroll = body.querySelector('.fc-map-scroll');
    if (!scroll?.clientWidth || !scroll.clientHeight) return;
    const graph = scroll.querySelector('.fc-graph');
    const frame = scroll.getBoundingClientRect();
    const old = graph.getBoundingClientRect();
    const previous = currentZoom(graph);
    const x = frame.left + scroll.clientWidth / 2;
    const y = frame.top + scroll.clientHeight / 2;
    const scale =
      active.zoom === 'fit'
        ? Math.min(
            1,
            (scroll.clientWidth - 4) / graph.offsetWidth,
            (scroll.clientHeight - 4) / graph.offsetHeight,
          )
        : active.zoom;
    graph.style.setProperty('--fc-map-scale', scale);
    body.querySelector('.fc-zoom-value').textContent = `${Math.round(scale * 100)}%`;
    body
      .querySelector('[data-flowcharts-zoom="fit"]')
      .setAttribute('aria-pressed', String(active.zoom === 'fit'));
    body.querySelector('[data-flowcharts-zoom="out"]').disabled = scale <= 0.12;
    body.querySelector('[data-flowcharts-zoom="in"]').disabled = scale >= 1.6;
    if (center) {
      const cell = scroll
        .querySelector('[aria-current="step"]')
        .closest('.fc-map-node')
        .getBoundingClientRect();
      scroll.scrollBy({ left: cell.left + cell.width / 2 - x, top: cell.top + cell.height / 2 - y });
    } else if (preserve) {
      const next = graph.getBoundingClientRect();
      scroll.scrollBy({
        left: next.left + ((x - old.left) * scale) / previous - x,
        top: next.top + ((y - old.top) * scale) / previous - y,
      });
    }
  }

  function changeZoom(action) {
    const scale = currentZoom(body.querySelector('.fc-graph'));
    if (action === 'in') active.zoom = Math.min(1.6, scale * 1.25);
    else if (action === 'out') active.zoom = Math.max(0.12, scale / 1.25);
    else active.zoom = action === 'fit' ? 'fit' : 1;
    paintZoom({ center: action === 'reset', preserve: action === 'out' || action === 'in' });
  }

  function paintStep({ focus = false, center = false } = {}) {
    const { byId, trail, view } = active;
    const current = trail.at(-1);
    const node = byId.get(current.id);
    const detail = dialog.querySelector('#flowchartDetail');
    // v3.1: the entry the chart was opened from is named on the steps that cite it.
    const from = active.from && node.sources.includes(active.from) ? active.from : null;
    detail.innerHTML = `
      <div class="fc-step-label">${nodeType(node) || 'Step'} ${node.number} of ${byId.size}${from ? ` · decided by ${esc(titleOf(from))}` : ''}</div>
      <h3 tabindex="-1">${esc(node.label)}</h3>
      ${current.label ? `<p class="fc-selected-branch">From step ${byId.get(trail.at(-2).id).number} · ${esc(current.label)}</p>` : ''}
      <p class="fc-explanation">${esc(node.detail)}</p>
      ${
        node.edges.length
          ? `<p class="fc-choose">Choose what happened</p><ol class="fc-choices">${node.edges
              .map((edge, index) => {
                const next = byId.get(edge.to);
                const own = active.from && next.sources.includes(active.from);
                return `<li><button type="button" data-flowchart-branch="${esc(edge.to)}" data-fc-branch-index="${index}"${own ? ' class="fc-own"' : ''}>
          <span>${esc(edge.label)}</span><span class="fc-destination">→ ${nodeType(next) || 'Step'} ${next.number} · ${esc(next.label)}</span>
        </button></li>`;
              })
              .join('')}</ol>`
          : ''
      }
      <div class="fc-detail-sources">${sourcesHTML(node)}${relatedHTML(node.related)}${relatedHTML(active.chart.related)}</div>`;
    const side = dialog.querySelector('.fc-side');
    if (side)
      side.innerHTML = `${sourcesHTML(node)}${relatedHTML(node.related)}${relatedHTML(active.chart.related)}`;
    const path = dialog.querySelector('.fc-trail');
    if (path) {
      const endings = node.edges.map((edge) => byId.get(edge.to));
      path.innerHTML = `<p class="fc-trail-label">Your path · step ${trail.length}</p><ol>${trail
        .map((step, i) => {
          const at = byId.get(step.id);
          const taken = trail[i + 1]?.label;
          return i === trail.length - 1
            ? `<li aria-current="step"><span class="fc-trail-n">${at.number} · now</span><span class="fc-trail-q">${esc(at.label)}</span></li>`
            : `<li><button type="button" data-fc-trail="${i}"><span class="fc-trail-n">${at.number}</span><span class="fc-trail-q">${esc(at.label)}</span>${taken ? `<span class="fc-trail-a">→ ${esc(taken)}</span>` : ''}</button></li>`;
        })
        .join(
          '',
        )}</ol>${endings.length ? `<p class="fc-trail-next">Then ${endings.length === 1 ? 'step' : 'one of steps'} ${endings.map((n) => n.number).join(', ')}</p>` : ''}`;
    }
    dialog.querySelector('[data-flowcharts-back]').disabled = trail.length < 2;
    dialog.querySelector('[data-flowcharts-reset]').disabled =
      trail.length < 2 && node.id === active.chart.entry;
    for (const button of dialog.querySelectorAll('[data-flowcharts-view]'))
      button.setAttribute('aria-pressed', String(button.dataset.flowchartsView === view));
    const map = dialog.querySelector('.fc-map');
    map.hidden = view !== 'map';
    dialog.querySelector('.fc-board').classList.toggle('fc-board-map', view === 'map');
    const visited = new Set(trail.map((step) => step.id));
    for (const cell of map.querySelectorAll('[data-fc-cell]')) {
      cell.classList.toggle('fc-path', visited.has(cell.dataset.fcCell));
      const button = cell.querySelector('[data-flowchart-node]');
      const selected = cell.dataset.fcCell === node.id;
      if (selected) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    }
    const route = new Set(trail.slice(1).map((step, i) => `${trail[i].id}/${step.edge}`));
    for (const wire of map.querySelectorAll('.fc-wire'))
      wire.classList.toggle('fc-path-wire', route.has(`${wire.dataset.fcFrom}/${wire.dataset.fcEdge}`));
    if (view === 'map') paintZoom({ center });
    if (focus) {
      const destination = detail.querySelector('h3');
      destination.focus({ preventScroll: true });
      if (view !== 'map' || matchMedia('(max-width: 850px)').matches)
        detail.scrollIntoView({ block: 'nearest' });
    }
  }

  function renderChart(chart, { step, from } = {}) {
    if (!sessions.has(chart.id)) sessions.set(chart.id, makeSession(chart));
    active = sessions.get(chart.id);
    // Opened at a step (from a case page): the path to it counts as walked, and the case is named.
    if (step && chart.nodes.some((node) => node.id === step)) active.trail = pathTo(chart, step);
    active.from = from && nodesById.has(from) ? from : null;
    const id = courseOf(chart.id);
    dialog.dataset.fcCourse = id;
    dialog.dataset.printChart = chart.id;
    heading.innerHTML = `<p class="fc-kicker">${courses[id].name} <span>·</span> ${chart.id}</p>
      <h2 id="flowchartsTitle">${esc(chart.title)}</h2>`;
    body.innerHTML = `
      <div class="fc-toolbar">
        ${active.from ? `<a href="${sourceURL(active.from)}" class="fc-back-entry" data-flowchart-source="${esc(active.from)}">← Back to ${esc(titleOf(active.from))}</a>` : ''}
        <a href="#flowcharts" data-flowcharts-library>← All flowcharts</a>
        <div class="fc-tabs" role="group" aria-label="Chart view">
          <button type="button" data-flowcharts-view="walkthrough">Walkthrough</button>
          <button type="button" data-flowcharts-view="map">Whole map</button>
        </div>
        <button type="button" data-flowcharts-print>Print</button>
      </div>
      ${['LRS-02', 'LRS-03', 'LRS-04', 'LRS-05', 'LRS-06'].includes(chart.id) ? '<p><a class="fc-canons-link" href="#canons" data-canons-nav>Browse the canons of construction</a></p>' : ''}
      <div class="fc-board">
        ${graphHTML(active)}
        <nav class="fc-trail" aria-label="Your path"></nav>
        <section id="flowchartDetail" aria-label="Current step"></section>
        <aside class="fc-side" aria-label="Sources for this step"></aside>
      </div>
      <div class="fc-walk-controls">
        <button type="button" data-flowcharts-back>← Previous step</button>
        <button type="button" data-flowcharts-reset>Start over</button>
      </div>
      ${window.DKLALectures?.chartHTML(chart.id) || ''}
      ${printHTML(active)}`;
    paintStep({ center: true });
  }

  function renderMissing() {
    delete dialog.dataset.printChart;
    delete dialog.dataset.fcCourse;
    heading.innerHTML = '<h2 id="flowchartsTitle">Flowchart unavailable</h2>';
    body.innerHTML =
      '<p>This chart is not in this edition of the atlas.</p><a href="#flowcharts" data-flowcharts-library>← All flowcharts</a>';
  }

  function syncRoute() {
    const hash = location.hash;
    const isLibrary = hash === '#flowcharts';
    if (!isLibrary && !hash.startsWith('#flowchart=')) {
      if (dialog.open) dialog.close();
      delete dialog.dataset.printChart;
      showing = null;
      active = null;
      return;
    }
    if (showing === hash && dialog.open) return;
    showing = hash;
    active = null;
    // #flowchart=K-16, or #flowchart=K-16&step=c&from=citoh when opened from a case page.
    const [idPart, ...params] = hash.slice('#flowchart='.length).split('&');
    const id = decodeURIComponent(idPart);
    const options = Object.fromEntries(
      params.map((pair) => pair.split('=').map((part) => decodeURIComponent(part || ''))),
    );
    if (isLibrary) renderLibrary();
    else if (charts.has(id)) renderChart(charts.get(id), options);
    else renderMissing();
    if (!dialog.open) dialog.showModal();
    body.scrollTop = 0;
    body.focus({ preventScroll: true });
    if (active?.view === 'map') paintStep({ center: true });
  }

  function go(hash) {
    if (location.hash === hash) return;
    // Only count entries after an existing atlas route. Direct links can close by clearing the hash.
    const previousDepth = history.state?.dklaFlowchartsDepth || 0;
    const depth = showing ? (previousDepth ? previousDepth + 1 : 0) : 1;
    location.hash = hash;
    history.replaceState({ ...history.state, dklaFlowchartsDepth: depth }, '');
  }

  function close() {
    const depth = history.state?.dklaFlowchartsDepth || 0;
    if (depth > 0) history.go(-depth);
    else {
      history.replaceState(history.state, '', location.pathname + location.search);
      syncRoute();
    }
  }

  function follow(from, index) {
    const edge = active.byId.get(from).edges[index];
    if (active.trail.at(-1).id !== from) active.trail.push({ id: from });
    active.trail.push({ id: edge.to, label: edge.label, edge: index });
    paintStep({ focus: true, center: true });
  }

  dialog.addEventListener('input', (event) => {
    if (!event.target.matches('[data-flowcharts-search]')) return;
    library.query = event.target.value;
    fillLibrary();
  });
  dialog.addEventListener('keydown', (event) => {
    if (!event.target.matches('.fc-map-scroll') || event.ctrlKey || event.metaKey || event.altKey) return;
    const action = { '=': 'in', '+': 'in', '-': 'out', '0': 'reset' }[event.key];
    if (action) {
      event.preventDefault();
      changeZoom(action);
    }
  });
  window.addEventListener('resize', () => {
    if (active?.view === 'map' && active.zoom === 'fit') paintZoom();
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        close();
      return;
    }
    const button = event.target.closest('button');
    if (!button) return;
    const d = button.dataset;
    if ('flowchartsClose' in d) close();
    else if ('flowchartsCourse' in d) {
      library.course = d.flowchartsCourse;
      fillLibrary();
    } else if ('flowchartsPrint' in d) window.print();
    else if ('flowchartsView' in d) {
      active.view = d.flowchartsView;
      paintStep({ center: true });
    } else if ('flowchartsZoom' in d) changeZoom(d.flowchartsZoom);
    else if ('flowchartsBack' in d) {
      active.trail.pop();
      paintStep({ focus: true, center: true });
    } else if ('fcTrail' in d) {
      active.trail = active.trail.slice(0, Number(d.fcTrail) + 1);
      paintStep({ focus: true, center: true });
    } else if ('flowchartsReset' in d) {
      active.trail = [{ id: active.chart.entry }];
      paintStep({ focus: true, center: true });
    } else if ('flowchartBranch' in d) follow(active.trail.at(-1).id, Number(d.fcBranchIndex));
    else if ('fcMapBranch' in d) follow(d.fcFrom, Number(d.fcMapBranch));
    else if ('flowchartNode' in d && active.trail.at(-1).id !== d.flowchartNode) {
      active.trail.push({ id: d.flowchartNode });
      paintStep({ focus: true, center: true });
    }
  });

  const menu = document.getElementById('moreMenu');
  if (typeof moreMenu === 'function') {
    const previousMenu = moreMenu;
    moreMenu = function (...args) {
      const result = previousMenu.apply(this, args);
      if (menu && !menu.hidden && !menu.querySelector('[data-flowcharts-menu]'))
        menu.insertAdjacentHTML(
          'beforeend',
          '<button type="button" role="menuitem" data-flowcharts-menu>Flowcharts</button>',
        );
      return result;
    };
  }
  document.addEventListener('click', (event) => {
    const item = event.target.closest('[data-flowcharts-menu],[data-flowchart-id],[data-flowcharts-library]');
    if (!item || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)
      return;
    event.preventDefault();
    if (item.matches('[data-flowcharts-menu]')) dismissMenu();
    go(item.getAttribute('href') || '#flowcharts');
  });

  // Related charts appear in reading entries with sources in the authored charts.
  const inspector = document.getElementById('inspector');
  const previousInspector = renderInspector;
  renderInspector = function (...args) {
    const result = previousInspector.apply(this, args);
    const id = selected?.type === 'node' ? selected.id : null;
    const reading = id && relatedBySource.has(id) && inspector?.querySelector('.reader-body');
    if (reading && !reading.querySelector('.v31-chart-steps'))
      reading.insertAdjacentHTML('beforeend', chartStepsHTML(id));
    return result;
  };
  // The case page's "Flowchart steps" card: for each chart, the path from its start to the steps
  // this entry decides, then those steps in full, and a link that opens the chart at that step.
  function chartStepsHTML(id) {
    const all = stepsCiting(id);
    const card = ({ chart, number, cited, path }, index) => {
      const decided = new Set(cited.map((node) => node.id));
      const byId = new Map(chart.nodes.map((node) => [node.id, node]));
      const shown = path.length > 4 ? path.slice(-4) : path;
      const route = shown
        .map((step, i) => {
          const node = byId.get(step.id);
          const own = decided.has(step.id);
          const branch =
            i > 0 ? `<span class="v31-route-edge"><span>${esc(step.label || '')}</span></span>` : '';
          return `${branch}<a class="v31-route-step${own ? ' v31-own' : ''}" href="${stepURL(chart.id, step.id, id)}" data-flowchart-id="${esc(chart.id)}"><b>${own ? `Step ${number.get(step.id)} · this entry` : `Step ${number.get(step.id)}`}</b>${esc(node.label)}</a>`;
        })
        .join('');
      const first = cited.reduce((a, b) => (number.get(b.id) < number.get(a.id) ? b : a), cited[0]);
      return `<article class="v31-chart${index > 1 ? ' v31-chart-more' : ''}">
        <div class="v31-card-head"><div><p class="v31-meta">Flowchart ${esc(chart.id)} · ${cited.length === 1 ? 'step' : 'steps'} ${cited.map((n) => number.get(n.id)).join(', ')} of ${chart.nodes.length}</p><h3>${esc(chart.title)}</h3></div>
        <a class="v31-open" href="${stepURL(chart.id, first.id, id)}" data-flowchart-id="${esc(chart.id)}">Open at step ${number.get(first.id)} →</a></div>
        <div class="v31-route${path.length > shown.length ? ' v31-route-cut' : ''}">${route}</div>
        <dl class="v31-steps">${cited.map((node) => `<dt>Step ${number.get(node.id)}</dt><dd><strong>${esc(node.label)}</strong> ${esc(node.detail)}</dd>`).join('')}</dl>
      </article>`;
    };
    return `<section class="v31-chart-steps" aria-label="Flowchart steps">${all.map(card).join('')}${all.length > 2 ? `<button type="button" class="v31-more" data-v31-more-charts>Show ${all.length - 2} more flowchart${all.length === 3 ? '' : 's'}</button>` : ''}</section>`;
  }
  if (inspector?.addEventListener)
    inspector.addEventListener('click', (event) => {
      const more = event.target.closest('[data-v31-more-charts]');
      if (!more) return;
      more.closest('.v31-chart-steps').classList.add('v31-all');
      more.remove();
    });

  window.addEventListener('hashchange', syncRoute);
  syncRoute();
})();
