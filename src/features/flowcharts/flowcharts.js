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
    const byId = new Map(
      chart.nodes.map((node, index) => [
        node.id,
        { ...node, number: index + 1, entry: node.id === chart.entry },
      ]),
    );
    // (lead: how many steps at the head of the trail are a route shown to the reader, not answers
    // the reader chose: a chart opened at a step shows one way to it and says so.)
    return { chart, byId, trail: [{ id: chart.entry }], lead: 0, view: 'walkthrough', zoom: 1 };
  }

  function graphLayout({ chart, byId, sizes }) {
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

    // The whole chart as a drawing to follow. A step is its question; under it each answer is written
    // once, on its own line, and that line is where its wire begins: it leaves by the step's side,
    // runs down a lane of its own, and reaches the step it leads to from above. Wires that reach the
    // same step meet on a bar over it, so a place where paths come together is seen as one. Wires
    // between rows run on separate tracks, and a wire to a step more than one row down passes between
    // the steps of the rows on its way.
    const cardWidth = 256;
    const padding = 24;
    const lanePitch = 10;
    const trackPitch = 10;
    const beside = 28; // between an answer and an outcome set beside it
    const pairWidth = 460; // an outcome set beside its answer: wide enough for its title in two lines
    const lines = (text, perLine) => Math.max(1, Math.ceil(String(text).length / perLine));
    // An answer that is the only way to an outcome has that outcome set beside it, on the answer's
    // own line: a condition and what follows from it are read together. An outcome that several
    // routes reach stays in one place, so the paths are seen to meet there.
    const inline = new Map(); // outcome -> { parent, index }
    for (const node of chart.nodes) {
      if (node.edges.length < 2) continue;
      node.edges.forEach((edge, index) => {
        if (!byId.get(edge.to).edges.length && incoming.get(edge.to).length === 1)
          inline.set(edge.to, { parent: node.id, index });
      });
    }
    const laid = rows.map((row) => row.filter((node) => !inline.has(node.id))).filter((row) => row.length);
    rows.length = 0;
    rows.push(...laid);
    const levelOf = new Map();
    rows.forEach((row, r) => row.forEach((node) => levelOf.set(node.id, r)));
    for (const [id, at] of inline) levelOf.set(id, levelOf.get(at.parent));
    const level = (id) => levelOf.get(id);
    const kids = (node) =>
      node.edges.map((edge) => (inline.get(edge.to)?.parent === node.id ? byId.get(edge.to) : null));
    const wOf = (node) => cardWidth + (kids(node).some(Boolean) ? beside + pairWidth : 0);
    // A step's parts: its question, each answer's line, what follows them. Measured once the chart
    // has been shown (sizes), estimated before.
    const parts = (node) =>
      sizes?.get(node.id) || {
        head: 16 + lines(node.label, 20) * 20 + (node.edges.length ? 10 : 24),
        rows: node.edges.map((edge) => lines(edge.label, 26) * 18 + 8),
        tail: artOf(node).length ? 44 : 10,
      };
    const natural = (node) => {
      const p = parts(node);
      return p.head + p.rows.reduce((sum, h) => sum + h, 0) + p.tail;
    };
    // Its height, where each answer's line sits in it, and where an outcome set beside a line goes.
    const sizeOf = (node) => {
      const p = parts(node);
      const set = kids(node);
      let y = p.head;
      const exits = [],
        rowH = [],
        kidY = [];
      p.rows.forEach((h, i) => {
        const kid = set[i] ? natural(set[i]) : 0;
        const row = Math.max(h, kid ? kid + 12 : 0);
        rowH.push(row);
        exits.push(y + row / 2);
        kidY.push(y + (row - kid) / 2);
        y += row;
      });
      return { h: y + p.tail, exits, rowH, kidY };
    };
    // Order in each row, then a first placing to learn which side each answer leaves by.
    const place = (gapOf) => {
      const xs = new Map();
      const widths = rows.map((row) =>
        row.reduce((sum, node, i) => sum + wOf(node) + (i ? gapOf(row[i - 1], node) : 0), 0),
      );
      const widest = Math.max(...widths);
      rows.forEach((row, r) => {
        let x = (widest - widths[r]) / 2;
        row.forEach((node, i) => {
          if (i) x += gapOf(row[i - 1], node);
          xs.set(node.id, x);
          x += wOf(node);
        });
      });
      for (const [id, at] of inline) xs.set(id, xs.get(at.parent) + cardWidth + beside);
      return { xs, widest };
    };
    {
      const seen = new Map();
      rows.forEach((row) => {
        const parentX = (node) => {
          const parents = forward.get(node.id);
          return parents.length
            ? parents.reduce((sum, from) => sum + (seen.get(from) ?? 0), 0) / parents.length
            : 0;
        };
        row.sort((a, b) => parentX(a) - parentX(b));
        const width = row.length * (cardWidth + 36) - 36;
        row.forEach((node, i) => seen.set(node.id, -width / 2 + i * (cardWidth + 36)));
      });
    }
    let { xs } = place(() => 36);
    const centre = (id) => xs.get(id) + cardWidth / 2;
    // The side an answer leaves by: toward where it goes. One way on leaves from underneath.
    const exitOf = new Map();
    for (const node of chart.nodes) {
      const sides = node.edges.map((edge) => {
        if (inline.get(edge.to)?.parent === node.id) return 'I';
        if (node.edges.length === 1 && level(edge.to) > level(node.id)) return 'D';
        const dx = centre(edge.to) - centre(node.id);
        return Math.abs(dx) > 24 ? (dx < 0 ? 'L' : 'R') : '';
      });
      // An answer that goes straight down takes the side with fewer wires.
      sides.forEach((side, i) => {
        if (side) return;
        const left = sides.filter((s) => s === 'L').length,
          right = sides.filter((s) => s === 'R').length;
        sides[i] = left <= right ? 'L' : 'R';
      });
      // On each side the highest answer takes the outermost lane, so no wire crosses a line below it.
      const count = { L: sides.filter((s) => s === 'L').length, R: sides.filter((s) => s === 'R').length };
      const taken = { L: 0, R: 0 };
      exitOf.set(
        node.id,
        sides.map((side) =>
          side === 'D' || side === 'I' ? { side, lane: 0 } : { side, lane: count[side] - taken[side]++ },
        ),
      );
    }
    const lanes = (node, side) => exitOf.get(node.id).filter((exit) => exit.side === side).length;
    // Room between two steps for the lanes that run there.
    const gapOf = (a, b) => 22 + lanePitch * (lanes(a, 'R') + lanes(b, 'L'));
    const leftRoom = Math.max(0, ...rows.map((row) => lanes(row[0], 'L'))) * lanePitch + 14;
    const rightRoom = Math.max(0, ...rows.map((row) => lanes(row[row.length - 1], 'R'))) * lanePitch + 14;
    let widest;
    ({ xs, widest } = place(gapOf));
    for (const [id, x] of xs) xs.set(id, x + leftRoom);
    const contentWidth = leftRoom + widest + rightRoom;
    // The openings between the steps of a row, for a wire that passes it. Wires on their way to the
    // same step share one line through an opening: from there on they are one path, and the place
    // each joins it is marked. Wires to different steps each take a line of their own.
    const openings = rows.map((row) => [
      xs.get(row[0].id) - 16,
      ...row.slice(1).map((node, i) => (xs.get(row[i].id) + wOf(row[i]) + xs.get(node.id)) / 2),
      xs.get(row[row.length - 1].id) + wOf(row[row.length - 1]) + 16,
    ]);
    const through = new Map();
    const pass = (r, target) => {
      const want = centre(target);
      const at = openings[r].reduce((best, o) => (Math.abs(o - want) < Math.abs(best - want) ? o : best));
      const key = r + '/' + at;
      if (!through.has(key)) through.set(key, new Map());
      const lines = through.get(key);
      if (!lines.has(target)) lines.set(target, lines.size);
      const n = lines.get(target);
      return at + (n % 2 ? -1 : 1) * Math.ceil(n / 2) * 8;
    };
    let outerLeft = 0,
      outerRight = 0;
    const routes = [];
    for (const node of chart.nodes) {
      const a = level(node.id);
      node.edges.forEach((edge, index) => {
        const b = level(edge.to);
        const exit = exitOf.get(node.id)[index];
        if (exit.side === 'I') return; // set beside its answer: joined to it directly, below
        const x0 =
          exit.side === 'D'
            ? centre(node.id)
            : exit.side === 'L'
              ? xs.get(node.id) - exit.lane * lanePitch
              : xs.get(node.id) + wOf(node) + exit.lane * lanePitch;
        // The uprights it takes on the way: through each row it passes, or round the outside of the
        // chart for a wire back to an earlier step.
        const via = []; // { channel: the channel it leaves by a level run, x }
        if (b > a) for (let r = a + 1; r < b; r++) via.push({ channel: r - 1, x: pass(r, edge.to) });
        else {
          const left = (x0 + centre(edge.to)) / 2 < contentWidth / 2;
          via.push({
            channel: a,
            x: left ? -(8 + ++outerLeft * lanePitch) : contentWidth + 8 + ++outerRight * lanePitch,
          });
        }
        // Wires that arrive at a step along the same line land on it together.
        const arrives = b > a && via.length ? `p${via[via.length - 1].x}` : `w${node.id}/${index}`;
        routes.push({ from: node.id, index, to: edge.to, exit, x0, via, arrives, last: b - 1 });
      });
    }
    // Where wires reach a step: side by side along its top, in the order of where they come from.
    const arrivals = new Map();
    for (const route of routes) {
      if (!arrivals.has(route.to)) arrivals.set(route.to, new Map());
      const from = route.via.length ? route.via[route.via.length - 1].x : route.x0;
      if (!arrivals.get(route.to).has(route.arrives)) arrivals.get(route.to).set(route.arrives, from);
    }
    const portOf = (route) => {
      const groups = [...arrivals.get(route.to)].sort((p, q) => p[1] - q[1]);
      const k = groups.findIndex((group) => group[0] === route.arrives);
      return xs.get(route.to) + (cardWidth * (k + 1)) / (groups.length + 1);
    };
    for (const route of routes) {
      route.tx = portOf(route);
      route.runs = [];
      let x = route.x0;
      for (const step of route.via) {
        route.runs.push({ channel: step.channel, from: x, to: step.x });
        x = step.x;
      }
      route.runs.push({ channel: route.last, from: x, to: route.tx });
    }
    // Tracks: level runs in one channel that would overlap lie on different tracks; a run shared by
    // wires to the same step is one run.
    const tracks = new Map();
    const byChannel = new Map();
    const shared = new Map();
    for (const route of routes)
      for (const run of route.runs) {
        if (Math.abs(run.from - run.to) < 1) continue;
        const key = `${run.channel}|${run.from}|${run.to}|${route.to}`;
        if (shared.has(key)) {
          run.same = shared.get(key);
          continue;
        }
        shared.set(key, run);
        if (!byChannel.has(run.channel)) byChannel.set(run.channel, []);
        byChannel.get(run.channel).push(run);
      }
    for (const [channel, list] of byChannel) {
      list.sort((p, q) => Math.min(p.from, p.to) - Math.min(q.from, q.to));
      const ends = [];
      for (const run of list) {
        const lo = Math.min(run.from, run.to) - 12,
          hi = Math.max(run.from, run.to) + 12;
        let t = ends.findIndex((end) => end <= lo);
        if (t < 0) t = ends.length;
        ends[t] = hi;
        run.track = t;
      }
      tracks.set(channel, ends.length);
    }
    const channelHeight = (r) => 18 + (tracks.get(r) || 0) * trackPitch + 26;
    // Rows from the top, each channel as deep as its tracks.
    const positions = new Map();
    const rowTop = [],
      rowEnd = [];
    let y = padding + (tracks.get(-1) ? channelHeight(-1) : 0);
    rows.forEach((row, r) => {
      const height = Math.max(...row.map((node) => sizeOf(node).h));
      rowTop[r] = y;
      rowEnd[r] = y + height;
      for (const node of row)
        positions.set(node.id, { x: xs.get(node.id), y, level: r, width: cardWidth, height: sizeOf(node).h });
      y += height + channelHeight(r);
    });
    for (const [id, at] of inline) {
      const parent = positions.get(at.parent);
      positions.set(id, {
        x: xs.get(id),
        y: parent.y + sizeOf(byId.get(at.parent)).kidY[at.index],
        level: parent.level,
        width: pairWidth,
        height: natural(byId.get(id)),
      });
    }
    const height = rowEnd[rows.length - 1] + padding;
    const trackY = (run) =>
      (run.channel < 0 ? padding : rowEnd[run.channel]) + 18 + ((run.same || run).track ?? 0) * trackPitch;
    // Paths. A wire that reaches a step alone ends in an arrow on it; wires that share a step end on
    // the bar over it.
    const round = (points) => {
      const pts = points.filter(
        (p, i) => !i || Math.abs(p[0] - points[i - 1][0]) > 0.5 || Math.abs(p[1] - points[i - 1][1]) > 0.5,
      );
      let d = `M ${pts[0][0]} ${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++) {
        const [x1, y1] = pts[i];
        const next = pts[i + 1];
        if (!next) {
          d += ` L ${x1} ${y1}`;
          break;
        }
        const [x0, y0] = pts[i - 1];
        const r = Math.min(7, Math.hypot(x1 - x0, y1 - y0) / 2, Math.hypot(next[0] - x1, next[1] - y1) / 2);
        const ax = x1 - Math.sign(x1 - x0) * r,
          ay = y1 - Math.sign(y1 - y0) * r;
        const bx = x1 + Math.sign(next[0] - x1) * r,
          by = y1 + Math.sign(next[1] - y1) * r;
        d += ` L ${ax} ${ay} Q ${x1} ${y1} ${bx} ${by}`;
      }
      return d;
    };
    const wires = [];
    const joins = [];
    const merges = []; // where a wire joins a line already on its way to the same step
    const taken = new Map(); // an upright shared by wires to one step -> the highest point drawn on it
    for (const route of routes) {
      const from = positions.get(route.from),
        to = positions.get(route.to);
      const meets = arrivals.get(route.to).size > 1;
      const startY =
        route.exit.side === 'D'
          ? from.y + from.height
          : from.y + sizeOf(byId.get(route.from)).exits[route.index];
      const points = [
        [route.exit.side === 'D' ? route.x0 : route.exit.side === 'L' ? from.x : from.x + cardWidth, startY],
        [route.x0, startY],
      ];
      route.runs.forEach((run, i) => {
        const ty = trackY(run);
        points.push([run.from, ty], [run.to, ty]);
        // The upright this run turns into, if other wires to the same step use it too.
        if (i === route.runs.length - 1) return;
        const key = `${route.to}|${run.to}`;
        if (taken.has(key) && taken.get(key) < ty - 0.5) merges.push({ x: run.to, y: ty, to: route.to });
        if (!taken.has(key) || ty < taken.get(key)) taken.set(key, ty);
      });
      points.push([route.tx, to.y - (meets ? 12 : 3)]);
      wires.push({ path: round(points), from: route.from, edge: route.index, to: route.to, arrow: !meets });
    }
    // An outcome set beside its answer: one short line from the answer to it.
    for (const [id, at] of inline) {
      const parent = positions.get(at.parent),
        child = positions.get(id);
      const y = parent.y + sizeOf(byId.get(at.parent)).exits[at.index];
      wires.push({
        path: `M ${parent.x + cardWidth} ${y} H ${child.x - 3}`,
        from: at.parent,
        edge: at.index,
        to: id,
        arrow: true,
      });
    }
    for (const node of chart.nodes) {
      const groups = arrivals.get(node.id);
      if (!groups || groups.size < 2) continue;
      const to = positions.get(node.id);
      const ports = [...groups.keys()].map(
        (key) => routes.find((r) => r.to === node.id && r.arrives === key).tx,
      );
      joins.push({
        to: node.id,
        y: to.y - 12,
        x0: Math.min(...ports),
        x1: Math.max(...ports),
        ports,
        cx: to.x + cardWidth / 2,
        top: to.y,
      });
    }
    const shift = padding + outerLeft * lanePitch + (outerLeft ? 8 : 0);
    const width = contentWidth + shift + padding + outerRight * lanePitch + (outerRight ? 8 : 0);
    return {
      positions,
      wires,
      joins,
      merges,
      exitOf,
      shift,
      width,
      height,
      sizeOf,
      inline,
      measured: !!sizes,
    };
  }

  // A step's number sits in the shape of what the step is: a decision between answers (diamond), a
  // step with one way on (square), an outcome (disc).
  const SHAPE = {
    decision: '<path d="M14 1.5 26.5 14 14 26.5 1.5 14Z"/>',
    step: '<rect x="3" y="3" width="22" height="22" rx="4"/>',
    outcome: '<circle cx="14" cy="14" r="12"/>',
  };
  const kindOf = (node) => (node.edges.length > 1 ? 'decision' : node.edges.length ? 'step' : 'outcome');
  const badge = (node) =>
    `<span class="fc-number fc-shape-${kindOf(node)}" aria-hidden="true"><svg viewBox="0 0 28 28" width="28" height="28">${SHAPE[kindOf(node)]}</svg><b>${node.number}</b></span>`;
  // The drawings of the cases a step cites (only a drawing made for that case), at most four.
  let ICONS = null;
  function icons() {
    if (!ICONS) {
      try {
        ICONS = JSON.parse(document.getElementById('dklaIcons')?.textContent || '{}');
      } catch {
        ICONS = {};
      }
    }
    return ICONS;
  }
  function artOf(node) {
    return node.sources
      .map((id) => {
        const meta = icons().records?.[id];
        const path = meta?.status === 'unique' && icons().paths?.[meta.motif];
        return path ? { id, path, title: titleOf(id) } : null;
      })
      .filter(Boolean)
      .slice(0, 4);
  }
  const artSVG = (one) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${one.path}</svg>`;
  /* A drawing on the map is a small control, the same on every step: pressed (click, Enter or Space,
     tap) or pointed at, it shows a card with the case's name, what this step's own stored explanation
     says of that case, and "Open case". It never moves the reader to another step.
     Nothing on the card is composed. The sentences are those of the step's explanation that name the
     case by a party; a step that does not name it shows the name and the way to open it, no more.
     At an outcome whose title names one of the cases it cites, that case is marked as the one the
     outcome names and the others as also cited; a case whose sentence says to compare or contrast it
     is marked as cited for comparison. */
  const KIND = { Case: 'case', Rule: 'rule', Concept: 'concept', Statute: 'statute', Note: 'note' };
  const GENERIC =
    /^(?:United|States|State|National|Board|City|County|Department|Commissioner|Secretary|American|People|Commonwealth|Federal|Association|Company|Corp|Inc)$/;
  const sentences = (text) =>
    String(text || '')
      .split(/(?<=[.!?])\s+(?=[A-Z“"(§])/)
      .filter(Boolean);
  const partiesOf = (id) =>
    nodesById.get(id)?.kind === 'Case'
      ? titleOf(id)
          .replace(/\s*\(\d{4}\)\s*$/, '')
          .split(/ v\.? /)
          .map(
            (party) =>
              party
                .replace(/^(?:In re|Ex parte) /, '')
                .split(/[\s,]+/)
                .find((word) => word.length > 3 && !GENERIC.test(word)) || '',
          )
          .filter(Boolean)
      : [];
  const names = (text, id) =>
    partiesOf(id).some((word) =>
      new RegExp(`(?<![\\p{L}])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u').test(text),
    );
  function standing(node, one) {
    const said = sentences(node.detail).filter((sentence) => names(sentence, one.id));
    const titled = !node.edges.length && artOf(node).filter((other) => names(node.label, other.id));
    const role = said.some((sentence) => /\b(?:compare|contrast)/i.test(sentence))
      ? 'Cited for comparison'
      : titled?.length
        ? titled.some((other) => other.id === one.id)
          ? 'The case this outcome names'
          : 'Also cited at this outcome'
        : '';
    return { said: said.join(' '), role };
  }
  const artHTML = (node, named) => {
    const list = artOf(node);
    return list.length
      ? `<div class="fc-art-row${named ? ' fc-art-named' : ''}">${list
          .map((one) => {
            const { said, role } = standing(node, one);
            const kind = KIND[nodesById.get(one.id)?.kind] || 'entry';
            return `<span class="fc-art-item"><button type="button" class="fc-art-press" data-fc-art aria-expanded="false" aria-label="${esc(one.title)}, a source for step ${node.number}: show what this step says of it"><span class="fc-art">${artSVG(one)}</span>${named ? `<span class="fc-art-name">${esc(one.title)}</span>` : ''}</button><span class="fc-art-card" role="group" aria-label="${esc(one.title)}">${role ? `<span class="fc-art-role">${role}</span>` : ''}<span class="fc-art-title">${esc(one.title)}</span>${said ? `<span class="fc-art-said">${esc(said)}</span>` : ''}<a class="fc-art-open" href="${sourceURL(one.id)}" data-flowchart-source="${esc(one.id)}">Open ${kind} →</a></span></span>`;
          })
          .join('')}</div>`
      : '';
  };
  // What a step shows when the whole chart is fitted to the window and its words are too small to
  // read: an outcome, the cases it rests on (by their first party); the first decision, its answers
  // on the sides they leave by, so the main fork can be read. Every step keeps its number, enlarged.
  const overHTML = (node, exits, low) => {
    if (!node.edges.length) {
      // The name the outcome's own words use for a case it rests on ("Loudermill required ..."), or
      // failing that the first word of the first such case's name.
      const words = artOf(node).flatMap((one) =>
        one.title
          .replace(/\s*\(\d{4}\)\s*$/, '')
          .split(/ v\.? /)
          .map((party) => party.replace(/^(?:In re|Ex parte) /, '').split(/[\s,]/)[0]),
      );
      const name = words.find((word) => word.length > 3 && node.label.includes(word)) || words[0];
      return name
        ? `<span class="fc-over${low ? ' fc-over-low' : ''}" aria-hidden="true">${esc(name)}</span>`
        : '';
    }
    if (!node.entry) return '';
    const side = (which) =>
      node.edges
        .filter((edge, i) => (exits[i].side === 'L') === (which === 'L'))
        .map((edge) => esc(edge.label))
        .join('<br>');
    return `<span class="fc-over fc-over-L" aria-hidden="true">${side('L')}</span><span class="fc-over fc-over-R" aria-hidden="true">${side('R')}</span>`;
  };
  // Drawings were made at different sizes inside the same square: each is fitted to its box.
  function fitArt(scope) {
    for (const svg of scope.querySelectorAll('.fc-art > svg:not([data-fit])')) {
      let box;
      try {
        box = svg.getBBox();
      } catch {
        continue;
      }
      if (!box.width || !box.height) continue;
      const side = Math.max(box.width, box.height) + 2;
      svg.setAttribute(
        'viewBox',
        [box.x + box.width / 2 - side / 2, box.y + box.height / 2 - side / 2, side, side]
          .map((n) => Math.round(n * 100) / 100)
          .join(' '),
      );
      svg.dataset.fit = '1';
    }
  }
  const nodeType = (node) => (node.edges.length ? '' : 'Outcome');
  function graphHTML(session) {
    const { byId } = session;
    const { positions, wires, joins, merges, exitOf, shift, width, height, sizeOf, inline, measured } =
      graphLayout(session);
    session.shape = { positions, inline }; // what the composed overview at Fit is drawn from
    const printScale = Math.min(1, 640 / width, 800 / height);
    // Outcomes side by side on one row: at Fit their names are wider than the plates, so every
    // other one is set a line lower.
    const low = new Set();
    const rows = new Map();
    for (const node of byId.values()) {
      if (node.edges.length || inline.has(node.id)) continue;
      const y = positions.get(node.id).y;
      rows.set(y, [...(rows.get(y) || []), node.id]);
    }
    for (const row of rows.values())
      row.sort((a, b) => positions.get(a).x - positions.get(b).x).forEach((id, i) => i % 2 && low.add(id));
    return `<section class="fc-map" hidden aria-label="Whole flowchart">
      <div class="fc-map-tools">
        <div class="fc-zoom" role="group" aria-label="Diagram zoom">
          <button type="button" data-flowcharts-zoom="out" aria-label="Zoom out">−</button>
          <button type="button" data-flowcharts-zoom="in" aria-label="Zoom in">+</button>
          <button type="button" data-flowcharts-zoom="fit" aria-label="Fit whole map">Fit</button>
          <button type="button" data-flowcharts-zoom="reset" aria-label="Reset zoom to 100%">100%</button>
        </div>
        <p class="fc-map-help"><span class="fc-help-point">Point at an answer to trace where it leads; select it to go there. A drawing names its case and opens it.</span><span class="fc-help-touch">Tap an answer to go where it leads. Tap a drawing to name its case and open it.</span></p>
        <output class="fc-zoom-value" aria-label="Diagram zoom level"></output>
      </div>
      <div class="fc-map-scroll" role="region" aria-label="Scrollable flowchart diagram" tabindex="0">
        <div class="fc-graph" style="--fc-graph-width:${width}px;--fc-graph-height:${height}px;--fc-print-scale:${printScale}">
          <svg class="fc-wires" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">
            <defs><marker id="fcArrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 0 0 L 8 4 L 0 8 Z"></path></marker></defs>
            <g transform="translate(${shift} 0)">${joins
              .map(
                (join) =>
                  `<g class="fc-join" data-fc-to="${esc(join.to)}"><path class="fc-join-bar" d="M ${join.x0} ${join.y} H ${join.x1}"></path><path class="fc-join-in" d="M ${join.cx} ${join.y} V ${join.top - 3}" marker-end="url(#fcArrow)"></path>${join.ports.map((x) => `<circle cx="${x}" cy="${join.y}" r="2.5"></circle>`).join('')}</g>`,
              )
              .join('')}${wires
              .map(
                ({ path, from, edge, to, arrow }) =>
                  `<path class="fc-wire" data-fc-from="${esc(from)}" data-fc-edge="${edge}" data-fc-to="${esc(to)}" d="${path}"${arrow ? ' marker-end="url(#fcArrow)"' : ' data-fc-joined'}></path>`,
              )
              .join(
                '',
              )}${merges.map((m) => `<circle class="fc-merge" data-fc-to="${esc(m.to)}" cx="${m.x}" cy="${m.y}" r="3"></circle>`).join('')}</g>
          </svg>
          ${[...byId.values()]
            .map((node) => {
              const pos = positions.get(node.id);
              const exits = exitOf.get(node.id);
              const rowH = sizeOf(node).rowH;
              return `<article class="fc-map-node fc-kind-${kindOf(node)}${node.edges.length ? '' : ' fc-outcome'}${inline.has(node.id) ? ' fc-beside' : ''}" data-fc-cell="${esc(node.id)}"
              style="left:${pos.x + shift}px;top:${pos.y}px;width:${pos.width}px;height:${pos.height}px">
              <button type="button" class="fc-node-heading" data-flowchart-node="${esc(node.id)}">
                ${badge(node)}<span><span class="fc-sr-only">Step ${node.number}. </span>${esc(node.label)}</span></button>
              ${
                node.edges.length
                  ? `<ul class="fc-exits">${node.edges
                      .map(
                        (edge, index) =>
                          `<li><button type="button" class="fc-exit fc-exit-${exits[index].side}" data-fc-map-branch="${index}" data-fc-from="${esc(node.id)}" title="Leads to step ${byId.get(edge.to).number}: ${esc(byId.get(edge.to).label)}"${measured ? ` style="min-height:${rowH[index]}px"` : ''}>
                  <span class="fc-answer">${esc(edge.label)}</span><span class="fc-destination">→ ${byId.get(edge.to).number}<span class="fc-cue-name"> ${esc(byId.get(edge.to).label)}</span></span>
                </button></li>`,
                      )
                      .join('')}</ul>`
                  : `<small class="fc-node-type">${nodeType(node)}</small>`
              }
              ${artHTML(node, inline.has(node.id))}
              ${overHTML(node, exits, low.has(node.id))}
            </article>`;
            })
            .join('')}
        </div>
      </div>
      <details class="fc-all"><summary>All ${byId.size} steps, in the chart’s order</summary>${indexHTML(session)}</details>
      ${outlineHTML(session, inline)}
    </section>`;
  }
  /* The map composed for a phone (under 700 px; the wired chart is for wider windows). One scroll,
     downwards: every step in the chart's own order, full width. Under a step, each answer with the
     number and title of the step it leads to; pressing it goes there. An answer that is the only way
     to an outcome has that outcome, with its cases, directly under it, so the outcomes of one fork
     are compared without leaving it. Over a step, the steps that lead to it ("3 routes meet here,
     from 3 · 14 · 15"), each a way back to that branch. The step being read carries its stored
     explanation and, when it was reached by an answer, the way back to where that answer was. */
  function outlineHTML({ byId }, inline) {
    const from = new Map();
    for (const node of byId.values())
      for (const edge of node.edges) from.set(edge.to, (from.get(edge.to) || new Set()).add(node));
    // A step's own parts, in the order they are wanted on a small screen: how the reader got here
    // (when it was by an answer), the question, the answers with what each leads to, and only then
    // the explanation and the cases, so that a fork and its outcomes share one screen.
    const head = (node) =>
      `<p class="fc-line-came"></p><button type="button" class="fc-node-heading" data-flowchart-node="${esc(node.id)}">${badge(node)}<span><span class="fc-sr-only">Step ${node.number}. </span>${esc(node.label)}</span></button>`;
    const foot = (node) =>
      `<div class="fc-line-now"><p class="fc-line-detail">${esc(node.detail)}</p><button type="button" class="fc-line-sources" data-fc-sources>Sources and related charts for this step ↓</button></div>${artHTML(node, true)}`;
    return `<ol class="fc-outline" aria-label="The chart, step by step">${[...byId.values()]
      .filter((node) => !inline.has(node.id))
      .map((node) => {
        const met = [...(from.get(node.id) || [])];
        return `<li class="fc-line fc-kind-${kindOf(node)}${node.edges.length ? '' : ' fc-outcome'}" data-fc-line="${esc(node.id)}">
          ${met.length ? `<p class="fc-line-from${met.length > 1 ? ' fc-line-met' : ''}">${met.length > 1 ? `${met.length} routes meet here, from` : 'From'} ${met.map((one) => `<button type="button" data-fc-seek="${esc(one.id)}" aria-label="Go to step ${one.number}: ${esc(one.label)}">${one.number}</button>`).join('')}</p>` : ''}
          ${head(node)}
          ${
            node.edges.length
              ? `<ul class="fc-line-exits">${node.edges
                  .map((edge, index) => {
                    const to = byId.get(edge.to);
                    const answer = `data-fc-map-branch="${index}" data-fc-from="${esc(node.id)}"`;
                    return inline.get(edge.to)?.parent === node.id
                      ? `<li class="fc-line-pair"><button type="button" class="fc-line-exit" ${answer}><span class="fc-answer">${esc(edge.label)}</span></button><div class="fc-line fc-outcome fc-kind-outcome" data-fc-line="${esc(to.id)}">${head(to)}${artHTML(to, true)}<div class="fc-line-now"><p class="fc-line-detail">${esc(to.detail)}</p><button type="button" class="fc-line-sources" data-fc-sources>Sources and related charts for this step ↓</button></div></div></li>`
                      : `<li><button type="button" class="fc-line-exit" ${answer}><span class="fc-answer">${esc(edge.label)}</span><span class="fc-destination">→ ${to.number} ${esc(to.label)}</span></button></li>`;
                  })
                  .join('')}</ul>`
              : ''
          }
          ${foot(node)}
        </li>`;
      })
      .join('')}</ol>`;
  }
  // Fitted to the window a tall chart is a narrow column with the rest of the window empty, and no
  // question can be read on it. The room beside it (below it, on a narrow screen) lists every step:
  // its number in its shape, as on the chart, its words, and for a step that goes on, the numbers of
  // the steps its answers lead to. Pointing at a row marks that step on the chart with the lines
  // into and out of it; selecting a row goes to the step.
  function indexHTML({ byId }) {
    // (A step that several routes reach says so, and from which steps: the joins can be found
    // without tracing a line.)
    const from = new Map();
    for (const node of byId.values())
      for (const edge of node.edges) from.set(edge.to, (from.get(edge.to) || new Set()).add(node.number));
    return `<ol class="fc-index" aria-label="Every step of the chart">${[...byId.values()]
      .map((node) => {
        const met = [...(from.get(node.id) || [])];
        return `<li class="fc-kind-${kindOf(node)}${node.edges.length ? '' : ' fc-outcome'}" data-fc-row="${esc(node.id)}"><button type="button" data-flowchart-node="${esc(node.id)}">${badge(node)}<span class="fc-index-q"><span class="fc-sr-only">Step ${node.number}. </span>${esc(node.label)}</span>${
          node.edges.length || met.length > 1
            ? `<span class="fc-index-to">${met.length > 1 ? `<span class="fc-index-met">${met.length} routes meet here, from ${met.join(' · ')}</span>` : ''}${node.edges.length ? `<span><span class="fc-sr-only">Leads to step </span>→ ${[...new Set(node.edges.map((edge) => byId.get(edge.to).number))].join(' · ')}</span>` : ''}</span>`
            : ''
        }</button></li>`;
      })
      .join('')}</ol>`;
  }

  const nth = (n) => n + (n % 100 > 10 && n % 100 < 14 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
  /* Under an answer in the walkthrough: the opening sentence of the stored explanation of the step
     the answer leads to, when it states something (a fact, a holding, a condition) that can help
     choose between the answers. When it opens with an instruction (what to do after choosing), it
     is not shown here: it belongs at that step, where it is read in full. Nothing is composed; a
     fork whose answers have no such sentence shows none, and tools/flowcharts/deciding-gaps.mjs
     (the same rule) lists those forks for the owner's content audit. */
  const INSTRUCTION =
    /^(?:Identify|Apply|Check|Use|Consider|Read|Compare|Specify|Assess|Confirm|Test|Ask|Define|Examine|Give|Distinguish|Look|Tie|Enforce|Address|Evaluate|Measure|Explain|Determine|Award|Rely|Select|Require|Separate|Follow|Establish|Leave|Tailor|Complete|Return|Try|Weigh|Allow|Show|Verify|Cite|Treat|Start|Begin|Find|Decide|Classify|Note|Keep|Stop|Proceed|Raise|Move|File|Plead|Calculate|Limit|Reject|Deny|Grant|Dismiss|Analyze|Describe|List|Locate|Match|Name|Preserve|Resolve|Review|Seek|Sort|Trace|Turn|Then|(?:State|Record|Order|Place) (?:the|each|which|whether|what|why|how|any|every|a|an)) /;
  const opening = (text) => String(text || '').split(/(?<=[.!?])\s+(?=[A-Z“"(§])/)[0];
  const deciding = (to) => {
    const first = opening(to.detail);
    return first && !INSTRUCTION.test(first) ? first : '';
  };
  function sourcesHTML(node) {
    // v3.1: each source says what kind of entry it is (case, rule, concept).
    const KIND = { Case: 'Case', Rule: 'Rule', Concept: 'Concept', Statute: 'Statute', Note: 'Note' };
    const links = node.sources.map((id) => {
      const title = esc(titleOf(id));
      const kind = KIND[nodesById.get(id)?.kind] || 'Entry';
      const drawn = artOf({ sources: [id] })[0];
      return nodesById.has(id)
        ? `<a href="${sourceURL(id)}" data-flowchart-source="${esc(id)}"${drawn ? ' class="fc-drawn"' : ''}>${drawn ? `<span class="fc-art">${artSVG(drawn)}</span>` : ''}<small class="fc-kind">${kind}</small>${title}</a>`
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
    // (Measured with the chart given the whole width, before any of it is given to the list of steps.)
    const map = scroll.closest('.fc-map');
    map.classList.remove('fc-composed'); // (the chart itself is measured, so it must be laid out)
    const tall = Math.min(1, (scroll.clientHeight - 28) / graph.offsetHeight),
      wide = Math.min(1, (scroll.clientWidth - 4) / graph.offsetWidth);
    const scale = active.zoom === 'fit' ? Math.min(tall, wide) : active.zoom;
    graph.style.setProperty('--fc-map-scale', scale);
    // Too small to read: the chart shows its shape instead of its words, and the steps are listed
    // in the room the fitted chart leaves, beside it where that is at least a column wide.
    const overview = scale < 0.5;
    graph.classList.toggle('fc-overview', overview);
    // At Fit such a chart is not shrunk: it is recomposed for the window (composeOverview).
    const composed = overview && active.zoom === 'fit';
    map.classList.toggle('fc-composed', composed);
    scroll.querySelector('.fc-ov')?.remove();
    if (composed)
      scroll.insertAdjacentHTML('beforeend', composeOverview(scroll.clientWidth, scroll.clientHeight));
    body.querySelector('.fc-zoom-value').textContent = composed ? 'Overview' : `${Math.round(scale * 100)}%`;
    body
      .querySelector('[data-flowcharts-zoom="fit"]')
      .setAttribute('aria-pressed', String(active.zoom === 'fit'));
    body.querySelector('[data-flowcharts-zoom="out"]').disabled = scale <= 0.12;
    body.querySelector('[data-flowcharts-zoom="in"]').disabled = scale >= 1.6;
    if (composed) return;
    if (center) {
      const cell = scroll
        .querySelector('[aria-current="step"]')
        .closest('.fc-map-node')
        .getBoundingClientRect();
      // In the middle of the window; but a tall step is set lower than its top would otherwise
      // be cut, with up to 150 px above it kept for the foot of the step that leads into it.
      const room = scroll.clientHeight;
      const above = Math.max(
        Math.min(150, room - cell.height - 16),
        Math.min((room - cell.height) / 2, 150),
        24,
      );
      const middle = (room - cell.height) / 2;
      scroll.scrollBy({
        left: cell.left + cell.width / 2 - x,
        top: cell.top - frame.top - (middle > 150 ? middle : above),
      });
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
    const lead = (active.lead = Math.min(active.lead || 0, trail.length - 1));
    // A decision is a step with more than one answer, on the reader's own part of the trail. A step
    // with one way on, or a step on the route a link arrived by, is not one and is not counted.
    const decides = (i) => i >= lead && byId.get(trail[i].id).edges.length > 1;
    const decisionAt = (i) => trail.slice(0, i + 1).filter((step, j) => decides(j)).length;
    const current = trail.at(-1);
    const node = byId.get(current.id);
    const detail = dialog.querySelector('#flowchartDetail');
    // v3.1: the entry the chart was opened from is named on the steps that cite it.
    const from = active.from && node.sources.includes(active.from) ? active.from : null;
    detail.innerHTML = `
      <div class="fc-step-label">${node.edges.length > 1 ? `Your ${nth(decisionAt(trail.length - 1))} decision · chart step` : nodeType(node) ? 'Outcome · chart step' : 'Chart step'} ${node.number}${from ? ` · decided by ${esc(titleOf(from))}` : ''}</div>
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
          <span>${esc(edge.label)}</span><span class="fc-destination">→ ${nodeType(next) || 'Step'} ${next.number} · ${esc(next.label)}</span>${deciding(next) ? `<span class="fc-leads">${esc(deciding(next))}</span>` : ''}
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
      // A step is "chart step N" by the chart's own numbering; a decision the reader made, or is
      // making, is also "1st decision", "2nd decision" in the order made. The way a link arrived by
      // is listed apart as one route to the step, and where the reader has gone on from there the
      // second list says where the reader's own path starts.
      const row = (step, i) => {
        const at = byId.get(step.id);
        const taken = trail[i + 1]?.label;
        const order = decides(i) ? `${nth(decisionAt(i))} decision · ` : '';
        return i === trail.length - 1
          ? `<li aria-current="step"><span class="fc-trail-n">${order}chart step ${at.number} · now</span><span class="fc-trail-q">${esc(at.label)}</span></li>`
          : `<li><button type="button" data-fc-trail="${i}"><span class="fc-trail-n">${order}chart step ${at.number}</span><span class="fc-trail-q">${esc(at.label)}</span>${taken ? `<span class="fc-trail-a">→ ${esc(taken)}</span>` : ''}</button></li>`;
      };
      const rows = trail.map(row);
      const made = trail.slice(0, -1).filter((step, i) => decides(i)).length;
      const own = `Your path${lead && trail.length - lead > 1 ? ` from chart step ${byId.get(trail[lead].id).number}` : ''}${made ? `: ${made} ${made === 1 ? 'decision' : 'decisions'} so far` : ''}`;
      const next = endings.length
        ? `<p class="fc-trail-next">Then ${endings.length === 1 ? 'chart step' : 'one of chart steps'} ${endings.map((n) => n.number).join(', ')}</p>`
        : '';
      path.innerHTML =
        lead && trail.length - lead === 1
          ? `<p class="fc-trail-label">One route to this step</p><ol>${rows.join('')}</ol>${next}`
          : `${lead ? `<p class="fc-trail-label">One route to chart step ${byId.get(trail[lead].id).number}</p><ol class="fc-trail-route">${rows.slice(0, lead).join('')}</ol>` : ''}<p class="fc-trail-label">${own}</p><ol>${rows.slice(lead).join('')}</ol>${next}`;
    }
    dialog.querySelector('.fc-walk-controls [data-flowcharts-back]').disabled = trail.length < 2;
    dialog.querySelector('[data-flowcharts-reset]').disabled =
      trail.length < 2 && node.id === active.chart.entry;
    for (const button of dialog.querySelectorAll('[data-flowcharts-view]'))
      button.setAttribute('aria-pressed', String(button.dataset.flowchartsView === view));
    const map = dialog.querySelector('.fc-map');
    map.hidden = view !== 'map';
    dialog.querySelector('.fc-board').classList.toggle('fc-board-map', view === 'map');
    const visited = new Set(trail.map((step) => step.id));
    let outlined = null; // the step's line in the phone map, when that is what is shown
    for (const cell of map.querySelectorAll('[data-fc-cell]')) {
      cell.classList.toggle('fc-path', visited.has(cell.dataset.fcCell));
      const button = cell.querySelector('[data-flowchart-node]');
      const selected = cell.dataset.fcCell === node.id;
      if (selected) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    }
    for (const row of map.querySelectorAll('[data-fc-row]')) {
      row.classList.toggle('fc-path', visited.has(row.dataset.fcRow));
      if (row.dataset.fcRow === node.id) row.setAttribute('aria-current', 'step');
      else row.removeAttribute('aria-current');
    }
    for (const line of map.querySelectorAll('[data-fc-line]')) {
      line.classList.toggle('fc-path', visited.has(line.dataset.fcLine));
      const here = line.dataset.fcLine === node.id;
      if (here) line.setAttribute('aria-current', 'step');
      else line.removeAttribute('aria-current');
      if (!here) {
        line.querySelector('.fc-line-came').textContent = '';
        continue;
      }
      // Reached by an answer: the way back to the step that answer is on, in the answer's words.
      const before = current.label && byId.get(trail.at(-2).id);
      line.querySelector('.fc-line-came').innerHTML = before
        ? `<button type="button" data-flowcharts-back>← Back to step ${before.number}</button> <span>You chose “${esc(current.label)}”</span>`
        : '';
      // (Only the chart's own page is scrolled: scrollIntoView would also move the dialog under its
      // heading.)
      if (view === 'map' && line.getClientRects().length && (focus || center)) {
        outlined = line;
        const target = line.closest('.fc-outline > .fc-line');
        body.scrollTop += target.getBoundingClientRect().top - body.getBoundingClientRect().top - 4;
      }
    }
    const route = new Set(trail.slice(1).map((step, i) => `${trail[i].id}/${step.edge}`));
    for (const wire of map.querySelectorAll('.fc-wire'))
      wire.classList.toggle('fc-path-wire', route.has(`${wire.dataset.fcFrom}/${wire.dataset.fcEdge}`));
    // The bar over a step the walked path reaches is part of the path.
    const reached = new Set(trail.slice(1).map((step) => step.id));
    for (const join of map.querySelectorAll('.fc-join'))
      join.classList.toggle('fc-path-wire', reached.has(join.dataset.fcTo));
    if (view === 'map') {
      fitArt(map);
      if (!active.sizes && map.querySelector('.fc-map-scroll').clientWidth) {
        // Shown for the first time: each step is measured (its height, and where each answer's line
        // sits in it) and the chart is laid out and its wires routed to those measures.
        const scale = currentZoom(map.querySelector('.fc-graph'));
        active.sizes = new Map(
          [...map.querySelectorAll('[data-fc-cell]')].map((cell) => {
            const set = cell.style.height;
            cell.style.height = 'auto';
            const box = cell.getBoundingClientRect();
            const rows = [...cell.querySelectorAll('.fc-exit')].map((exit) => exit.getBoundingClientRect());
            const h = Math.ceil(box.height / scale) + 2;
            const head = rows.length ? Math.round((rows[0].top - box.top) / scale) : h;
            const heights = rows.map((row) => Math.round(row.height / scale));
            cell.style.height = set;
            return [
              cell.dataset.fcCell,
              { head, rows: heights, tail: h - head - heights.reduce((sum, one) => sum + one, 0) },
            ];
          }),
        );
        map.outerHTML = graphHTML(active);
        return paintStep({ focus, center: true });
      }
      paintZoom({ center });
    }
    if (focus && outlined) outlined.querySelector('.fc-node-heading').focus({ preventScroll: true });
    else if (focus) {
      const destination = detail.querySelector('h3');
      destination.focus({ preventScroll: true });
      if (view !== 'map' || matchMedia('(max-width: 850px)').matches)
        detail.scrollIntoView({ block: 'nearest' });
    }
    settle();
  }
  // The address names the step being shown, so a reload or a copied link comes back to it. It is
  // rewritten in place: the browser's Back still leaves the chart in one press.
  function settle() {
    const at = active.trail.at(-1).id;
    const step = at === active.chart.entry ? '' : at;
    const hash =
      '#flowchart=' +
      encodeURIComponent(active.chart.id) +
      (step ? '&step=' + encodeURIComponent(step) : '') +
      (active.from ? '&from=' + encodeURIComponent(active.from) : '');
    active.opened = `${step}|${active.from || ''}`;
    if (location.hash === hash || !location.hash.startsWith('#flowchart=')) return;
    history.replaceState(history.state, '', hash);
    showing = hash;
  }
  /* Fit, for a chart that cannot be read at the size it fits (a chart that can be is left alone).
     The chart is recomposed for the window from its own data, by rule:
       - it runs left to right, a column for each rank of steps;
       - the first step that forks is the first question, with its words; each of its answers that
         has steps of its own names a framed region holding those steps;
       - the step most routes meet at (three or more, reached from more than one of those answers)
         and has steps after it is the major join; it and everything after it are a last region,
         named by the answer that most often leads into it (a chart whose routes meet only at its
         endings has no such region: those endings stand between the regions that reach them);
       - words go to the first question, the major join, any other step where three routes or two
         regions meet, every outcome (in full), and the step the reader is on. Every other step is
         a mark, its number in its shape, and gives its name when pointed at, focused or pressed;
       - a step where routes meet is ringed.
     Selecting a mark or a region goes into the detailed map there (look). */
  function composeOverview(W, H) {
    const { chart, byId, trail } = active;
    const { positions, inline } = active.shape;
    const level = (id) => positions.get(id).level + (inline.has(id) ? 1 : 0);
    const middle = (id) => positions.get(id).x + positions.get(id).width / 2;
    const nodes = [...byId.values()];
    const into = new Map(nodes.map((node) => [node.id, []]));
    for (const node of nodes)
      node.edges.forEach((edge) => into.get(edge.to).push({ from: node.id, label: edge.label }));
    // (A step is "after" another only by an answer that goes forward.)
    const reach = (start) => {
      const seen = new Set([start]);
      for (const id of seen)
        for (const edge of byId.get(id).edges) if (level(edge.to) > level(id)) seen.add(edge.to);
      return seen;
    };
    let fork = byId.get(chart.entry);
    for (let guard = nodes.length; fork.edges.length === 1 && guard; guard--)
      fork = byId.get(fork.edges[0].to);
    const starts = fork.edges.length > 1 ? [...new Set(fork.edges.map((edge) => edge.to))] : [];
    const sets = starts.map(reach);
    const shared = (id) => sets.filter((set) => set.has(id)).length;
    const major = nodes
      .filter((node) => node.edges.length && into.get(node.id).length >= 3 && shared(node.id) >= 2)
      .sort((a, b) => into.get(b.id).length - into.get(a.id).length || level(a.id) - level(b.id))[0];
    const tail = major ? reach(major.id) : new Set();
    const lane = (id) => (tail.has(id) ? 'T' : shared(id) === 1 ? sets.findIndex((set) => set.has(id)) : 'S');
    const members = (which) => nodes.filter((node) => lane(node.id) === which);
    // Columns: the last region starts after everything before it.
    const before = nodes.filter((node) => !tail.has(node.id));
    const shift = major ? Math.max(0, 1 + Math.max(...before.map((n) => level(n.id))) - level(major.id)) : 0;
    const col = (id) => level(id) + (tail.has(id) ? shift : 0);
    const last = Math.max(1, ...nodes.map((node) => col(node.id)));
    const padL = 204,
      padR = 206,
      top = 30,
      foot = 14;
    // (The columns of the last region are wider: its steps carry the most words.)
    const wide = (c) => (major && c >= col(major.id) ? 1.8 : 1);
    const run = [0];
    for (let c = 0; c < last; c++) run.push(run[c] + wide(c));
    const step = Math.min(120, (W - padL - padR) / run[last]);
    const x = (id) => padL + run[col(id)] * step;
    const weight = (node) => (node.edges.length ? 1 : 1.75); // an outcome has its words beside it
    const heaviest = (list) => {
      const sums = new Map();
      for (const node of list) sums.set(col(node.id), (sums.get(col(node.id)) || 0) + weight(node));
      return Math.max(1, ...sums.values());
    };
    // Bands, top to bottom as the regions lie left to right in the detailed map; what is shared
    // (the first question, a step reached from two regions) runs between them.
    const regions = starts
      .map((start, i) => ({ i, list: members(i) }))
      .filter((one) => one.list.length)
      .sort(
        (a, b) =>
          a.list.reduce((sum, n) => sum + middle(n.id), 0) / a.list.length -
          b.list.reduce((sum, n) => sum + middle(n.id), 0) / b.list.length,
      );
    const order = regions.map((one) => one.i);
    order.splice(Math.ceil(order.length / 2), 0, 'S');
    const need = new Map(order.map((which) => [which, heaviest(members(which)) + (which === 'S' ? 0 : 0.6)]));
    const all = [...need.values()].reduce((sum, n) => sum + n, 0);
    const room = H - top - foot - (order.length - 1) * 12;
    const bands = new Map();
    let at = top;
    for (const which of order) {
      const tall = (room * need.get(which)) / all;
      bands.set(which, {
        lo: at + (which === 'S' ? 0 : 26),
        hi: at + tall,
        top: at,
        unit: Math.min(56, tall / need.get(which)),
      });
      at += tall + 12;
    }
    bands.set('T', {
      lo: top + 26,
      hi: H - foot,
      top,
      unit: Math.min(60, (H - top - foot - 26) / heaviest(members('T'))),
    });
    // Each step: near what leads to it in its own region; the major join on the shared line.
    const y = new Map();
    const columns = [...new Set(nodes.map((node) => col(node.id)))].sort((a, b) => a - b);
    for (const c of columns)
      for (const which of [...order, 'T']) {
        const band = bands.get(which);
        const group = nodes.filter((node) => col(node.id) === c && lane(node.id) === which);
        if (!group.length) continue;
        const mid = (band.lo + band.hi) / 2;
        const axis = (bands.get('S').lo + bands.get('S').hi) / 2;
        const wish = new Map(
          group.map((node) => {
            const from = into
              .get(node.id)
              .filter((one) => y.has(one.from) && (lane(one.from) === which || which === 'T'));
            return [
              node.id,
              node === major
                ? axis
                : from.length
                  ? from.reduce((sum, one) => sum + y.get(one.from), 0) / from.length
                  : mid,
            ];
          }),
        );
        group.sort((a, b) => wish.get(a.id) - wish.get(b.id) || middle(a.id) - middle(b.id));
        const total = group.reduce((sum, node) => sum + weight(node), 0) * band.unit;
        const mean = group.reduce((sum, node) => sum + wish.get(node.id), 0) / group.length;
        // (In the last region a column's steps are spread over its whole height, which leaves the
        // major join's words clear; elsewhere they keep close to what leads to them.)
        const spread = which === 'T' && group.length > 1;
        const unit = spread ? (band.hi - band.lo) / (total / band.unit) : band.unit;
        let cursor = spread ? band.lo : Math.max(band.lo, Math.min(mean - total / 2, band.hi - total));
        for (const node of group) {
          y.set(node.id, cursor + (weight(node) * unit) / 2);
          cursor += weight(node) * unit;
        }
      }
    // Words: where they fit clear of the marks, of each other and of the window.
    const here = trail.at(-1).id;
    const walked = new Set(trail.map((one) => one.id));
    const boxes = nodes.map((node) => ({
      l: x(node.id) - 14,
      r: x(node.id) + 14,
      t: y.get(node.id) - 14,
      b: y.get(node.id) + 14,
      id: node.id,
    }));
    const tailEdge = major ? x(major.id) - 34 : Infinity;
    const labels = [];
    const say = (node, kind, width, size, lineHeight, sides, must) => {
      const lines = Math.min(4, Math.ceil((node.label.length * size * 0.54) / width));
      const tall = lines * lineHeight;
      const cx = x(node.id),
        cy = y.get(node.id);
      const spots = {
        right: { l: cx + 20, t: cy - tall / 2 },
        left: { l: cx - 20 - width, t: cy - tall / 2, end: true },
        above: { l: cx - width / 2, t: cy - 18 - tall, centre: true },
        below: { l: cx - width / 2, t: cy + 18, centre: true },
      };
      // How badly a place is taken: outside the window or its own region counts most.
      const taken = (spot) => {
        const box = { l: spot.l, r: spot.l + width, t: spot.t, b: spot.t + tall };
        const hit = (other) => box.l < other.r && box.r > other.l && box.t < other.b && box.b > other.t;
        return (
          (box.l < 4 || box.r > W - 4 || box.t < 4 || box.b > H - 4 ? 8 : 0) +
          (lane(node.id) !== 'T' && box.r > tailEdge - 6 ? 8 : 0) +
          boxes.filter((mark) => mark.id !== node.id && hit(mark)).length +
          2 * labels.filter((one) => hit(one.box)).length
        );
      };
      const least = Math.min(...sides.map((name) => taken(spots[name])));
      if (least && !must) return;
      const side = sides.find((name) => taken(spots[name]) === least);
      const spot = spots[side];
      labels.push({
        id: node.id,
        kind,
        width,
        spot,
        box: { l: spot.l, r: spot.l + width, t: spot.t, b: spot.t + tall },
      });
    };
    say(fork, 'first', 172, 15, 19, ['left', 'above', 'below'], true);
    if (major) say(major, 'major', 190, 14, 18, ['right', 'below', 'above'], true);
    for (const node of nodes)
      if (!node.edges.length && !labels.some((one) => one.id === node.id))
        say(node, 'outcome', 178, 12.5, 16, ['right', 'left', 'below', 'above'], true);
    for (const node of nodes) {
      if (labels.some((one) => one.id === node.id)) continue;
      const from = into.get(node.id);
      const meets = from.length >= 3 || new Set(from.map((one) => lane(one.from))).size > 1;
      if (node.id === here) say(node, 'here', 160, 12.5, 16, ['above', 'below', 'right', 'left'], true);
      else if (meets && from.length > 1) say(node, 'join', 160, 12, 15, ['above', 'below', 'right']);
    }
    // An answer of the first question that has no region of its own (it leads straight to a step
    // other answers reach too): its words on its line, where there is room for them.
    const asides = fork.edges
      .filter((edge) => !regions.some((one) => starts[one.i] === edge.to))
      .map((edge) => {
        const width = 150,
          tall = Math.min(3, Math.ceil((edge.label.length * 12 * 0.54) / width)) * 15;
        const l = (x(fork.id) + x(edge.to)) / 2 - width / 2,
          t = (y.get(fork.id) + y.get(edge.to)) / 2 - tall - 5;
        const box = { l, r: l + width, t, b: t + tall };
        const hit = (other) => box.l < other.r && box.r > other.l && box.t < other.b && box.b > other.t;
        if (box.t < 4 || boxes.some(hit) || labels.some((one) => hit(one.box))) return '';
        labels.push({ id: '', box });
        return `<span class="fc-ov-label fc-ov-answer fc-ov-centre" style="left:${l.toFixed(1)}px;top:${t.toFixed(1)}px;width:${width}px" aria-hidden="true">${esc(edge.label)}</span>`;
      })
      .join('');
    // Regions: a band of its own for each, as wide as its steps and their words.
    const region = (l, band, right, title, to) =>
      `<button type="button" class="fc-ov-region" data-fc-look="${esc(to)}" style="left:${l.toFixed(1)}px;top:${band.top.toFixed(1)}px;width:${(right - l).toFixed(1)}px;height:${(band.hi - band.top).toFixed(1)}px"><span class="fc-ov-title">${esc(title)}</span><span class="fc-sr-only">: show this part of the chart at full size</span></button>`;
    // (A region with no room for its own name before the last region is not framed: the answer's
    // words stand over its first step instead.)
    const narrow = [];
    const frames = regions.map((one) => {
      const ids = new Set(one.list.map((node) => node.id));
      const title = fork.edges.find((edge) => edge.to === starts[one.i]).label;
      const l = Math.min(...one.list.map((node) => x(node.id))) - 30;
      // As wide as its steps and their words, and at least as wide as its own name; never into the
      // last region.
      const named = l + title.length * 6.8 + 30;
      const right = Math.min(
        Math.max(
          named,
          ...one.list.map((node) => x(node.id) + 26),
          ...labels.filter((label) => ids.has(label.id)).map((label) => label.box.r + 10),
        ),
        major ? tailEdge - 8 : W - 6,
      );
      if (right >= named) return region(l, bands.get(one.i), right, title, starts[one.i]);
      const width = 150,
        tall = Math.min(3, Math.ceil((title.length * 12 * 0.54) / width)) * 15;
      const cx = x(starts[one.i]),
        cy = y.get(starts[one.i]);
      const spots = [cy - 18 - tall, cy + 18].map((t) => ({
        l: cx - width / 2,
        r: cx + width / 2,
        t,
        b: t + tall,
      }));
      const hit = (box) => (other) =>
        box.l < other.r && box.r > other.l && box.t < other.b && box.b > other.t;
      const spot =
        spots.find(
          (box) => box.t > 4 && !boxes.some(hit(box)) && !labels.some((label) => hit(box)(label.box)),
        ) || spots[0];
      labels.push({ id: '', box: spot });
      narrow.push(
        `<span class="fc-ov-label fc-ov-answer fc-ov-centre" style="left:${spot.l.toFixed(1)}px;top:${spot.t.toFixed(1)}px;width:${width}px" aria-hidden="true">${esc(title)}</span>`,
      );
      return '';
    });
    if (major) {
      const counts = new Map();
      for (const one of into.get(major.id)) counts.set(one.label, (counts.get(one.label) || 0) + 1);
      frames.push(
        region(tailEdge, bands.get('T'), W - 6, [...counts].sort((a, b) => b[1] - a[1])[0][0], major.id),
      );
    }
    const route = new Set(trail.slice(1).map((one, i) => `${trail[i].id}/${one.edge}`));
    const lines = nodes
      .flatMap((node) =>
        node.edges.map((edge, index) => {
          const x1 = x(node.id),
            y1 = y.get(node.id),
            x2 = x(edge.to),
            y2 = y.get(edge.to);
          const forward = x2 > x1 + 1;
          const bend = (x2 - x1 - 26) / 2;
          const d = forward
            ? `M ${x1 + 12} ${y1} C ${x1 + 12 + bend} ${y1} ${x2 - 14 - bend} ${y2} ${x2 - 14} ${y2}`
            : `M ${x1} ${y1 - 12} C ${x1} ${y1 - 64} ${x2} ${y2 - 64} ${x2} ${y2 - 15}`;
          return `<path class="fc-ov-line${forward ? '' : ' fc-ov-back'}${route.has(`${node.id}/${index}`) ? ' fc-path-wire' : ''}" data-fc-from="${esc(node.id)}" data-fc-to="${esc(edge.to)}" d="${d.replace(/(\.\d)\d+/g, '$1')}" marker-end="url(#fcOvArrow)"></path>`;
        }),
      )
      .join('');
    const marks = nodes
      .map((node) => {
        const said = labels.some((one) => one.id === node.id);
        const cls = `fc-ov-mark fc-kind-${kindOf(node)}${into.get(node.id).length > 1 ? ' fc-ov-join' : ''}${said ? ' fc-ov-labelled' : ''}${walked.has(node.id) ? ' fc-path' : ''}`;
        return `<button type="button" class="${cls}" data-fc-mark="${esc(node.id)}" data-fc-look="${esc(node.id)}"${node.id === here ? ' aria-current="step"' : ''} style="left:${x(node.id).toFixed(1)}px;top:${y.get(node.id).toFixed(1)}px" aria-label="Step ${node.number}: ${esc(node.label)}. Show it on the chart at full size">${badge(node)}${said ? '' : `<span class="fc-ov-name">${esc(node.label)}</span>`}</button>`;
      })
      .join('');
    const words = labels
      .filter((one) => one.id)
      .map(
        (one) =>
          `<span class="fc-ov-label fc-ov-${one.kind}${one.spot.end ? ' fc-ov-end' : ''}${one.spot.centre ? ' fc-ov-centre' : ''}" data-fc-says="${esc(one.id)}" style="left:${one.spot.l.toFixed(1)}px;top:${one.spot.t.toFixed(1)}px;width:${one.width}px" aria-hidden="true">${esc(byId.get(one.id).label)}</span>`,
      )
      .join('');
    return `<div class="fc-ov" style="width:${W}px;height:${H}px" role="group" aria-label="The chart at a glance">${frames.join('')}<svg class="fc-ov-lines" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><defs><marker id="fcOvArrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 8 4 L 0 8 Z"></path></marker></defs>${lines}</svg>${words}${asides}${narrow.join('')}${marks}</div>`;
  }
  // From the fitted overview into the detailed map at one step: full size, that step in the middle
  // and ringed. The reader's own step and path are not changed, and stay marked as they were.
  function look(id) {
    active.zoom = 1;
    paintZoom();
    const scroll = body.querySelector('.fc-map-scroll');
    for (const cell of scroll.querySelectorAll('.fc-looked')) cell.classList.remove('fc-looked');
    const cell = scroll.querySelector(`[data-fc-cell="${CSS.escape(id)}"]`);
    if (!cell) return;
    cell.classList.add('fc-looked');
    const frame = scroll.getBoundingClientRect(),
      at = cell.getBoundingClientRect();
    scroll.scrollBy({
      left: at.left + at.width / 2 - frame.left - scroll.clientWidth / 2,
      top: at.top - frame.top - Math.max(24, Math.min(150, (scroll.clientHeight - at.height) / 2)),
    });
    cell.querySelector('.fc-node-heading').focus({ preventScroll: true });
  }
  // Going to a step other than by choosing an answer on the step being shown: back along the trail
  // if it is on it; by the answer that leads there if there is one; otherwise one route to it from
  // the chart's start, shown as a route and not as the reader's choices.
  function visit(id) {
    const { trail, byId } = active;
    const on = trail.findIndex((step) => step.id === id);
    const edge = byId.get(trail.at(-1).id).edges.findIndex((one) => one.to === id);
    if (on >= 0) active.trail = trail.slice(0, on + 1);
    else if (edge >= 0) return follow(trail.at(-1).id, edge);
    else {
      active.trail = pathTo(active.chart, id);
      active.lead = active.trail.length - 1;
    }
    paintStep({ focus: true, center: true });
  }

  function renderChart(chart, { step, from } = {}) {
    if (!sessions.has(chart.id)) sessions.set(chart.id, makeSession(chart));
    active = sessions.get(chart.id);
    // Opened at a step (from a case page, a copied link, a reload): one route to it is shown, as a
    // route. Coming back to the address of the step being shown (from a source, say) keeps the path
    // as it was left.
    const opened = `${step && step !== chart.entry ? step : ''}|${from || ''}`;
    if (step && chart.nodes.some((node) => node.id === step) && active.opened !== opened) {
      active.trail = pathTo(chart, step);
      active.lead = active.trail.length - 1;
    }
    active.opened = opened;
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
      if (cameFrom && hash !== cameFrom) cameFrom = null;
      keepBack();
      return;
    }
    cameFrom = null;
    keepBack();
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
    // Back from a cited source to the step it was opened from: the page and the map are where
    // they were left.
    const left = active?.left;
    if (left && left.opened === active.opened && left.step === active.trail.at(-1).id) {
      body.scrollTop = left.top;
      const scroll = dialog.querySelector('.fc-map-scroll');
      if (scroll && left.map) [scroll.scrollLeft, scroll.scrollTop] = left.map;
    }
    if (active) active.left = null;
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
    // An answer pressed on the map, on a step other than the one shown: the reader is taken to that
    // step first (back along the trail, or by one route to it), then on by the answer.
    if (active.trail.at(-1).id !== from) {
      const on = active.trail.findIndex((step) => step.id === from);
      if (on >= 0) active.trail = active.trail.slice(0, on + 1);
      else {
        active.trail = pathTo(active.chart, from);
        active.lead = active.trail.length - 1;
      }
    }
    active.trail.push({ id: edge.to, label: edge.label, edge: index });
    paintStep({ focus: true, center: true });
  }

  /* An entry opened from a chart: the app's own Back (the arrow in the top bar) returns to the chart,
     at the step, view, zoom and place it was left, as the browser's Back does. Only while that entry
     is still the one shown; after going anywhere else, Back is the app's ordinary Back again. */
  const appBack = document.getElementById('studyBack');
  let cameFrom = null; // the address of the entry that was opened from the chart
  const returning = () => !!cameFrom && location.hash === cameFrom;
  const keepBack = () => {
    if (!appBack) return;
    if (returning()) {
      if (appBack.disabled) appBack.disabled = false;
      if (!appBack.dataset.fcTitle) {
        appBack.dataset.fcTitle = appBack.title;
        appBack.title = 'Back to the flowchart (Alt + Left)';
      }
    } else if (appBack.dataset.fcTitle) {
      appBack.title = appBack.dataset.fcTitle;
      delete appBack.dataset.fcTitle;
    }
  };
  if (appBack) new MutationObserver(keepBack).observe(appBack, { attributeFilter: ['disabled'] });
  document.addEventListener(
    'click',
    (event) => {
      if (!returning() || !event.target.closest?.('#studyBack, [data-v32-back]')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      history.back();
    },
    true,
  );
  dialog.addEventListener(
    'click',
    (event) => {
      const source = event.target.closest?.('a[data-flowchart-source]');
      if (!active || !source) return;
      cameFrom = source.getAttribute('href');
      const scroll = dialog.querySelector('.fc-map-scroll');
      active.left = {
        opened: active.opened,
        step: active.trail.at(-1).id,
        top: body.scrollTop,
        map: active.view === 'map' && scroll ? [scroll.scrollLeft, scroll.scrollTop] : null,
      };
    },
    true,
  );
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
    if (active?.view !== 'map') return;
    // (A window widened past the phone layout: the wired map is measured and laid out now.)
    if (!active.sizes) paintStep();
    else if (active.zoom === 'fit') paintZoom();
  });
  // Pointing at an answer on the map, or reaching it with the keyboard, traces its wire to the step
  // it leads to.
  function trace(exit) {
    const map = dialog.querySelector('.fc-map');
    if (!map) return;
    for (const el of map.querySelectorAll('.fc-trace')) el.classList.remove('fc-trace');
    map.classList.toggle('fc-tracing', !!exit);
    if (!exit) return;
    const from = exit.dataset.fcFrom,
      index = exit.dataset.fcMapBranch;
    const wire = [...map.querySelectorAll('.fc-wire')].find(
      (one) => one.dataset.fcFrom === from && one.dataset.fcEdge === index,
    );
    if (!wire) return;
    const to = wire.dataset.fcTo;
    wire.classList.add('fc-trace');
    exit.classList.add('fc-trace');
    for (const el of map.querySelectorAll('.fc-join, [data-fc-cell]'))
      if ((el.dataset.fcTo || el.dataset.fcCell) === to) el.classList.add('fc-trace');
    // (Drawn last, so it lies over the wires it crosses.)
    wire.parentNode.appendChild(wire);
  }
  // At Fit, pointing at a step in the list, or at its number on the chart, marks that step in both
  // and lights every line into and out of it.
  function traceStep(id) {
    const map = dialog.querySelector('.fc-map');
    if (!map) return;
    for (const el of map.querySelectorAll('.fc-trace')) el.classList.remove('fc-trace');
    map.classList.toggle('fc-tracing', !!id);
    if (!id) return;
    for (const el of map.querySelectorAll(
      '.fc-wire, .fc-join, .fc-ov-line, [data-fc-cell], [data-fc-row], [data-fc-mark]',
    )) {
      const d = el.dataset;
      if ([d.fcFrom, d.fcTo, d.fcCell, d.fcRow, d.fcMark].includes(id)) el.classList.add('fc-trace');
    }
  }
  const stepAt = (target) =>
    target.closest?.('[data-fc-mark]')?.dataset.fcMark ||
    target.closest?.('[data-fc-row]')?.dataset.fcRow ||
    target.closest?.('.fc-overview [data-fc-cell]')?.dataset.fcCell;
  dialog.addEventListener('pointerover', (event) => {
    const exit = event.target.closest?.('.fc-exit');
    const step = !exit && stepAt(event.target);
    if (step) traceStep(step);
    else if (exit || event.target.closest?.('.fc-map')) trace(exit || null);
  });
  dialog.addEventListener('focusin', (event) => {
    const step = stepAt(event.target);
    if (step) traceStep(step);
    else trace(event.target.closest?.('.fc-exit') || null);
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
    // A drawing's card stays open until something else is pressed.
    for (const item of dialog.querySelectorAll('.fc-art-shown'))
      if (!item.contains(event.target)) {
        item.classList.remove('fc-art-shown');
        item.querySelector('[data-fc-art]').setAttribute('aria-expanded', 'false');
      }
    if (!button) return;
    const d = button.dataset;
    if ('fcArt' in d) {
      const shown = button.parentNode.classList.toggle('fc-art-shown');
      button.setAttribute('aria-expanded', String(shown));
      return;
    }
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
      active.lead = 0;
      paintStep({ focus: true, center: true });
    } else if ('flowchartBranch' in d) follow(active.trail.at(-1).id, Number(d.fcBranchIndex));
    else if ('fcMapBranch' in d) follow(d.fcFrom, Number(d.fcMapBranch));
    else if ('fcSeek' in d) visit(d.fcSeek);
    else if ('fcSources' in d) {
      const sources = dialog.querySelector('#flowchartDetail');
      body.scrollTop += sources.getBoundingClientRect().top - body.getBoundingClientRect().top - 4;
    } else if ('fcLook' in d) {
      // A mark with no words beside it, on a touch screen: the first press names it, the next goes in.
      const bare = button.matches('.fc-ov-mark:not(.fc-ov-labelled, .fc-ov-named)');
      for (const named of dialog.querySelectorAll('.fc-ov-named')) named.classList.remove('fc-ov-named');
      if (bare && matchMedia('(hover: none)').matches) button.classList.add('fc-ov-named');
      else look(d.fcLook);
    } else if ('flowchartNode' in d && button.closest('.fc-overview, .fc-index')) look(d.flowchartNode);
    else if ('flowchartNode' in d && active.trail.at(-1).id !== d.flowchartNode) visit(d.flowchartNode);
  });
  dialog.addEventListener('keydown', (event) => {
    const shown = event.key === 'Escape' && dialog.querySelector('.fc-art-shown');
    if (!shown) return;
    // Esc shuts an open card first, not the whole chart.
    event.preventDefault();
    shown.classList.remove('fc-art-shown');
    shown.querySelector('[data-fc-art]').setAttribute('aria-expanded', 'false');
    shown.querySelector('[data-fc-art]').focus();
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
  /* The Flowchart facet of an entry (v3.2, docs/DESIGN.md). For each chart that cites the entry: the
     path from the chart's start to the deepest step the entry decides, one row a step, with the branch
     taken between steps; the steps the entry decides are marked and carry their explanation; then any
     other step of the chart that cites it. Every step opens the chart at that step, with the way back. */
  const ARROW =
    '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 10h11M11 5.5l4.5 4.5-4.5 4.5"/></svg>';
  function chartStepsHTML(id) {
    const all = stepsCiting(id);
    const entry = nodesById.get(id);
    const short = entry?.shortTitle || entry?.title || 'This entry';
    const card = ({ chart, number, cited, path }) => {
      const decided = new Set(cited.map((node) => node.id));
      const byId = new Map(chart.nodes.map((node) => [node.id, node]));
      // A step: its number, the question it asks (a link that opens the chart there) and, where this
      // entry is one of the step's sources, that fact in words and the step's own explanation.
      const step = (node) => {
        const own = decided.has(node.id);
        return `<li class="v32-step${own ? ' v31-own' : ''}"><span class="v32-step-n">${number.get(node.id)}</span><div class="v32-step-body"><div class="v32-step-q"><a class="v31-route-step${own ? ' v31-own' : ''}" href="${stepURL(chart.id, node.id, id)}" data-flowchart-id="${esc(chart.id)}">${esc(node.label)}</a></div>${own ? `<div class="v32-step-why">${esc(short)} is a source for this step</div>` : ''}${own && node.detail ? `<p class="v32-step-detail">${esc(node.detail)}</p>` : ''}</div></li>`;
      };
      const walked = new Set(path.map((at) => at.id));
      const route = path
        .map(
          (at, i) =>
            `${i > 0 && at.label ? `<li class="v32-branch"><span class="v32-vh">The answer that leads on: </span><span>${esc(at.label)}</span></li>` : ''}${step(byId.get(at.id))}`,
        )
        .join('');
      const others = cited.filter((node) => !walked.has(node.id));
      const first = cited.reduce((a, b) => (number.get(b.id) < number.get(a.id) ? b : a), cited[0]);
      return `<article class="v31-chart" data-v32-count="${cited.length}">
        <div class="v31-card-head"><div><p class="v31-meta">Flowchart ${esc(chart.id)} <span class="v32-count">${cited.length === 1 ? 'step' : 'steps'} ${cited.map((n) => number.get(n.id)).join(', ')} of ${chart.nodes.length}</span></p><h3>${esc(chart.title)}</h3></div>
        <a class="v31-open" href="${stepURL(chart.id, first.id, id)}" data-flowchart-id="${esc(chart.id)}">Open the chart at step ${number.get(first.id)}${ARROW}</a></div>
        <ol class="v32-path" aria-label="The path to this entry's step">${route}</ol>
        ${others.length ? `<p class="v32-label">Other steps this entry is a source for</p><ol class="v32-path v32-path-loose">${others.map(step).join('')}</ol>` : ''}
      </article>`;
    };
    return `<section class="v31-chart-steps" aria-label="Flowchart steps">${all.map(card).join('')}</section>`;
  }

  window.addEventListener('hashchange', syncRoute);
  syncRoute();
})();
