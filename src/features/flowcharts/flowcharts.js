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

    /* The whole chart as a drawing to follow. A step is its question; under it each answer is written
       once, on its own line, and that line is where its wire begins: it leaves by the step's side,
       runs down a lane of its own, and reaches the step it leads to from above.

       A wire has to be followed by eye from its answer to its step, in a still picture. So, by rule:
       - two wires that lead to different steps never run side by side, or end to end, closer than
         `apart`; lanes beside a step, the lines through an opening between two steps, and the level
         tracks between two rows are all set that far apart, and where a wire comes down toward a
         track near where another goes on down from one, the first turns away above the second;
       - wires that lead to the same step may join, and where they do the place is marked: answers
         next to each other on one side of a step that lead to the same step share a lane, wires on
         their way to the same step share one line through an opening, and wires that reach a step
         from different directions meet on a bar over it;
       - between two rows, the tracks are given in the order that makes the fewest crossings.
       tools/flowcharts/check-wires.mjs measures the first rule on every chart, from what is drawn. */
    const cardWidth = 256;
    const padding = 24;
    const apart = 16;
    const lanePitch = apart;
    const trackPitch = apart;
    const beside = 28; // between an answer and an outcome set beside it
    const pairWidth = 468; // an outcome set beside its answer: wide enough for its title in two lines
    // (Every upright stands on one grid of `apart`: step edges, lanes, lines through openings and
    // landings. Two uprights are then the same line or at least `apart` from each other.)
    const grid = (x) => Math.round(x / apart) * apart;
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
        head:
          16 +
          lines(node.label, 20) * 20 +
          (node.edges.length ? 10 : 24) +
          (instruction(node) ? lines(instruction(node), 34) * 18 + 8 : 0),
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
        let x = grid((widest - widths[r]) / 2);
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
    const middle = (Math.min(...xs.values()) + Math.max(...xs.values()) + cardWidth) / 2;
    // The side an answer leaves by: toward where it goes. One way on leaves from underneath.
    const exitOf = new Map();
    const laneCount = new Map();
    for (const node of chart.nodes) {
      const sides = node.edges.map((edge) => {
        if (inline.get(edge.to)?.parent === node.id) return 'I';
        if (node.edges.length === 1 && level(edge.to) > level(node.id)) return 'D';
        // (A wire back to an earlier step goes round the outside of the chart: it leaves by that side.)
        if (level(edge.to) <= level(node.id))
          return (centre(node.id) + centre(edge.to)) / 2 < middle ? 'L' : 'R';
        // (A step with outcomes set beside it has them on its right: only a wire to a step further
        // right than those goes out that way, past them.)
        if (kids(node).some(Boolean)) return centre(edge.to) > xs.get(node.id) + wOf(node) ? 'R' : 'L';
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
      // Answers on one side that lead to the same step share one lane (which lane, below).
      const groups = { L: [], R: [] };
      sides.forEach((side, i) => {
        if ((side === 'L' || side === 'R') && !groups[side].includes(node.edges[i].to))
          groups[side].push(node.edges[i].to);
      });
      laneCount.set(node.id, { L: groups.L.length, R: groups.R.length });
      exitOf.set(
        node.id,
        sides.map((side) => ({ side, lane: 0 })),
      );
    }
    const lanes = (node, side) => laneCount.get(node.id)[side];
    // The openings a wire passes through on its way to a step more than one row down: the one
    // nearest above that step, in each row between. Wires on their way to the same step share one
    // line through an opening: from there on they are one path, and the place each joins it is
    // marked. Wires to different steps each take a line of their own.
    ({ xs } = place((a, b) => apart * (lanes(a, 'R') + lanes(b, 'L') + 1)));
    const through = rows.map((row) => Array.from({ length: row.length + 1 }, () => []));
    const opening = (r, target, from) => {
      const row = rows[r];
      const at = [
        xs.get(row[0].id) - apart,
        ...row.slice(1).map((node, i) => (xs.get(row[i].id) + wOf(row[i]) + xs.get(node.id)) / 2),
        xs.get(row[row.length - 1].id) + wOf(row[row.length - 1]) + apart,
      ];
      // (the opening that takes the wire least far sideways, from where it comes down to over its step)
      const want = centre(target);
      const far = (x) => Math.abs(x - from) + Math.abs(x - want);
      let k = 0;
      at.forEach((x, i) => {
        if (far(x) < far(at[k]) - 0.5) k = i;
      });
      if (!through[r][k].includes(target)) through[r][k].push(target);
      return { r, k, x: at[k] };
    };
    const plans = [];
    for (const node of chart.nodes) {
      const a = level(node.id);
      node.edges.forEach((edge, index) => {
        const b = level(edge.to);
        const exit = exitOf.get(node.id)[index];
        if (exit.side === 'I') return; // set beside its answer: joined to it directly, below
        const passes = [];
        let from =
          exit.side === 'D'
            ? centre(node.id)
            : exit.side === 'L'
              ? xs.get(node.id) - apart
              : xs.get(node.id) + wOf(node) + apart;
        if (b > a)
          for (let r = a + 1; r < b; r++) {
            passes.push(opening(r, edge.to, from));
            from = passes[passes.length - 1].x;
          }
        plans.push({ from: node.id, index, to: edge.to, exit, a, b, passes });
      });
    }
    // Lanes beside a step, in the order of where their wires turn to below it: on the left side the
    // wire that turns furthest left is outermost, on the right side the one that turns furthest
    // right. Leaving their lanes, the wires of one side then fan out without crossing each other,
    // so no two of them cross near the steps they lead to; where that order is not the order of
    // the answers, an answer's short line out to its lane crosses a lane beside its own step.
    for (const node of chart.nodes)
      for (const side of ['L', 'R']) {
        const own = plans.filter((plan) => plan.from === node.id && plan.exit.side === side);
        const aim = (plan) =>
          plan.b <= plan.a
            ? (side === 'L' ? -1 : 1) * Infinity
            : plan.passes.length
              ? plan.passes[0].x
              : centre(plan.to);
        const order = [...new Set(own.map((plan) => plan.to))].sort((p, q) => {
          const [first, second] = [p, q].map((to) => own.find((plan) => plan.to === to));
          return (
            (side === 'L' ? aim(second) - aim(first) : aim(first) - aim(second)) || second.index - first.index
          );
        });
        for (const plan of own) plan.exit.lane = order.indexOf(plan.to) + 1;
      }
    // Room between two steps for the lanes beside each and the lines that pass between them.
    const count = (node) => {
      const row = rows[level(node.id)];
      return through[level(node.id)][row.indexOf(node) + 1].length;
    };
    const gapOf = (a, b) => Math.max(32, apart * (lanes(a, 'R') + count(a) + lanes(b, 'L') + 1));
    const leftRoom =
      Math.max(0, ...rows.map((row, r) => lanes(row[0], 'L') + through[r][0].length)) * apart + apart;
    const rightRoom =
      Math.max(0, ...rows.map((row, r) => lanes(row[row.length - 1], 'R') + through[r][row.length].length)) *
        apart +
      apart;
    let widest;
    ({ xs, widest } = place(gapOf));
    for (const [id, x] of xs) xs.set(id, x + leftRoom);
    const contentWidth = leftRoom + widest + rightRoom;
    // Where each wire starts down, and where a line through an opening runs: clear of the lanes on
    // both sides of it, and straight on from where it comes down wherever the opening allows, so a
    // wire keeps to one upright past as many rows as it can and two wires never change places.
    const startX = (plan) =>
      plan.exit.side === 'D'
        ? centre(plan.from)
        : plan.exit.side === 'L'
          ? xs.get(plan.from) - plan.exit.lane * lanePitch
          : xs.get(plan.from) + wOf(byId.get(plan.from)) + plan.exit.lane * lanePitch;
    const comes = new Map(plans.map((plan) => [plan, startX(plan)]));
    const passAt = new Map();
    rows.forEach((row, r) => {
      through[r].forEach((targets, k) => {
        if (!targets.length) return;
        const left = k ? row[k - 1] : null,
          right = k < row.length ? row[k] : null;
        const lo = left ? xs.get(left.id) + wOf(left) + apart * (lanes(left, 'R') + 1) : apart;
        const hi = right ? xs.get(right.id) - apart * (lanes(right, 'L') + 1) : contentWidth - apart;
        const list = targets
          .map((target) => {
            const those = plans.filter(
              (plan) => plan.to === target && plan.passes.some((pass) => pass.r === r && pass.k === k),
            );
            const from = those
              .map((plan) => comes.get(plan))
              .sort(
                (p, q) =>
                  Math.abs(p - Math.max(lo, Math.min(hi, p))) - Math.abs(q - Math.max(lo, Math.min(hi, q))),
              )[0];
            return { target, those, from };
          })
          .sort((p, q) => p.from - q.from || centre(p.target) - centre(q.target));
        list.forEach((one, j) => {
          one.x = Math.max(lo + apart * j, Math.min(hi - apart * (list.length - 1 - j), one.from));
          if (j) one.x = Math.max(one.x, list[j - 1].x + apart);
        });
        for (const one of list) {
          passAt.set(`${r}|${k}|${one.target}`, one.x);
          for (const plan of one.those) comes.set(plan, one.x);
        }
      });
    });
    let outerLeft = 0,
      outerRight = 0;
    const routes = [];
    for (const plan of plans) {
      const { exit, a, b } = plan;
      const node = byId.get(plan.from);
      const x0 = startX(plan);
      // The uprights it takes on the way: through each row it passes, or round the outside of the
      // chart for a wire back to an earlier step.
      const via = plan.passes.map(({ r, k }) => ({ channel: r - 1, x: passAt.get(`${r}|${k}|${plan.to}`) }));
      const back = b <= a;
      if (back) {
        const left = exit.side === 'L';
        via.push({
          channel: a,
          x: left ? -(++outerLeft * lanePitch) : contentWidth + ++outerRight * lanePitch,
        });
      }
      // Wires that arrive at a step along the same line land on it together.
      const arrives = `${back ? 'o' : 'c'}${via.length ? via[via.length - 1].x : x0}`;
      routes.push({
        from: node.id,
        index: plan.index,
        to: plan.to,
        exit,
        x0,
        via,
        arrives,
        back,
        last: b - 1,
      });
    }
    // Where wires reach a step: side by side along its top, in the order of where they come from; a
    // wire that comes down right over the step goes straight in. No landing is set under a line that
    // is coming down to go somewhere else.
    const down = new Map(); // channel -> the lines that come down into it: { x, to }
    for (const route of routes) {
      const marks = [{ channel: level(route.from), x: route.x0 }];
      if (!route.back) for (const step of route.via) marks.push({ channel: step.channel + 1, x: step.x });
      for (const mark of marks) {
        if (!down.has(mark.channel)) down.set(mark.channel, []);
        down.get(mark.channel).push({ x: mark.x, to: route.to });
      }
    }
    const arrivals = new Map();
    for (const route of routes) {
      if (!arrivals.has(route.to)) arrivals.set(route.to, new Map());
      const from = route.via.length ? route.via[route.via.length - 1].x : route.x0;
      if (!arrivals.get(route.to).has(route.arrives)) arrivals.get(route.to).set(route.arrives, from);
    }
    const ports = new Map(); // step -> Map(arrival -> x)
    for (const [id, groups] of arrivals) {
      const list = [...groups].sort((p, q) => p[1] - q[1]);
      const lo = xs.get(id) + apart,
        hi = xs.get(id) + cardWidth - apart;
      const others = (down.get(level(id) - 1) || []).filter((line) => line.to !== id).map((line) => line.x);
      const set = [];
      const free = (x, k) =>
        x >= lo &&
        x <= hi &&
        others.every((other) => Math.abs(other - x) >= apart) &&
        set.every((taken, i) => i === k || Math.abs(taken - x) >= apart);
      // Each as near as it can be to where its wire comes down (straight under it where that is over
      // the step), in the order the wires come, a grid step apart.
      const inner = (x) => Math.max(lo + apart, Math.min(hi - apart, x));
      list.forEach(([, from], k) => {
        set[k] = Math.max(
          from >= lo && from <= hi ? from : grid(inner(from)),
          k ? set[k - 1] + apart : -Infinity,
        );
      });
      for (let k = list.length - 1; k >= 0; k--)
        set[k] = Math.min(set[k], k + 1 < list.length ? set[k + 1] - apart : hi);
      list.forEach((unused, k) => {
        const wanted = set[k];
        const order = (at) =>
          (!k || at >= set[k - 1] + apart) && (k + 1 >= list.length || at <= set[k + 1] - apart);
        for (let off = apart; off <= cardWidth && !free(set[k], k); off += apart) {
          if (free(wanted + off, k) && order(wanted + off)) set[k] = wanted + off;
          else if (free(wanted - off, k) && order(wanted - off)) set[k] = wanted - off;
        }
      });
      ports.set(id, new Map(list.map(([key], k) => [key, set[k]])));
    }
    for (const route of routes) {
      route.tx = ports.get(route.to).get(route.arrives);
      route.runs = [];
      let x = route.x0;
      route.via.forEach((step, i) => {
        // (ends: does the line at that end of the level run go up from it, or down)
        route.runs.push({
          channel: step.channel,
          from: x,
          to: step.x,
          to_: route.to,
          ups: [true, route.back],
        });
        x = step.x;
      });
      route.runs.push({
        channel: route.last,
        from: x,
        to: route.tx,
        to_: route.to,
        ups: [!route.back, false],
      });
    }
    // Tracks: level runs in one channel lie on different tracks unless they are far apart along it;
    // a run shared by wires to the same step is one run. Which run lies above which is chosen pair
    // by pair: never so that a line coming down to one run lies beside a line going on down from
    // another, and otherwise for the fewest crossings.
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
    const span = (run) => [Math.min(run.from, run.to), Math.max(run.from, run.to)];
    const inside = (x, run) => x > span(run)[0] + 0.5 && x < span(run)[1] - 0.5;
    // What it costs to set p above q.
    const cost = (p, q) => {
      const pe = [p.from, p.to],
        qe = [q.from, q.to];
      let sum = 0;
      for (let i = 0; i < 2; i++) {
        if (!p.ups[i] && inside(pe[i], q)) sum += 1; // p's line going down crosses q
        if (q.ups[i] && inside(qe[i], p)) sum += 1; // q's line coming down crosses p
        for (let j = 0; j < 2; j++)
          if (p.to_ !== q.to_ && !p.ups[i] && q.ups[j] && Math.abs(pe[i] - qe[j]) < apart) sum += 100;
      }
      return sum;
    };
    for (const [channel, list] of byChannel) {
      list.sort((p, q) => span(p)[0] - span(q)[0] || span(p)[1] - span(q)[1]);
      // An order from the top, improved by moving one run at a time to where the whole costs least.
      const order = list.slice();
      const total = (seq) => {
        let sum = 0;
        for (let i = 0; i < seq.length; i++)
          for (let j = i + 1; j < seq.length; j++) sum += cost(seq[i], seq[j]);
        return sum;
      };
      for (let pass = 0, moved = true; moved && pass < 12; pass++) {
        moved = false;
        for (const run of list) {
          const rest = order.filter((one) => one !== run);
          let best = order.indexOf(run),
            least = total(order);
          for (let at = 0; at <= rest.length; at++) {
            const sum = total([...rest.slice(0, at), run, ...rest.slice(at)]);
            if (sum < least) [best, least, moved] = [at, sum, true];
          }
          rest.splice(best, 0, run);
          order.splice(0, order.length, ...rest);
        }
      }
      let used = 0;
      order.forEach((run, i) => {
        let t = 0;
        for (const above of order.slice(0, i)) {
          const [lo, hi] = span(run),
            [alo, ahi] = span(above);
          const over = lo < ahi + apart && hi > alo - apart;
          if (over || cost(above, run) !== cost(run, above)) t = Math.max(t, above.track + 1);
        }
        run.track = t;
        used = Math.max(used, t + 1);
      });
      tracks.set(channel, used);
    }
    const channelHeight = (r) => Math.max(40, 18 + (tracks.get(r) || 0) * trackPitch + 12);
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
    const taken = new Map(); // an upright shared by wires to one step -> where each wire comes onto it
    const laneTop = new Map(); // a lane shared by answers to one step -> where the highest joins it
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
      if (route.exit.side !== 'D') {
        const lane = `${route.from}|${route.x0}`;
        if (laneTop.has(lane)) merges.push({ x: route.x0, y: startY, to: route.to });
        else laneTop.set(lane, startY);
      }
      route.runs.forEach((run, i) => {
        const ty = trackY(run);
        points.push([run.from, ty], [run.to, ty]);
        // The upright this run turns into, if other wires to the same step use it too.
        if (i === route.runs.length - 1) return;
        const key = `${route.to}|${run.to}`;
        if (!taken.has(key)) taken.set(key, []);
        taken.get(key).push({ x: run.to, y: ty, turns: Math.abs(run.from - run.to) > 1 });
      });
      points.push([route.tx, to.y - (meets ? 12 : 3)]);
      wires.push({ path: round(points), from: route.from, edge: route.index, to: route.to, arrow: !meets });
    }
    // A wire that turns onto an upright another wire to the same step is already on: a dot there.
    for (const [key, list] of taken) {
      const first = Math.min(...list.map((one) => (one.turns ? one.y : -Infinity)));
      for (const one of list)
        if (one.turns && one.y > first + 0.5) merges.push({ x: one.x, y: one.y, to: key.split('|')[0] });
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
      const groups = ports.get(node.id);
      if (!groups || groups.size < 2) continue;
      const to = positions.get(node.id);
      const list = [...groups.values()];
      const mid = to.x + cardWidth / 2;
      const cx = list.reduce((best, x) => (Math.abs(x - mid) < Math.abs(best - mid) ? x : best));
      joins.push({
        to: node.id,
        y: to.y - 12,
        x0: Math.min(...list),
        x1: Math.max(...list),
        ports: list,
        cx,
        top: to.y,
      });
    }
    const shift = padding + outerLeft * lanePitch;
    const width = contentWidth + shift + padding + outerRight * lanePitch;
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
        <p class="fc-map-help"><span class="fc-help-point">Point at an answer to trace where it leads; select it to go there. A drawing names its case and opens it.</span><span class="fc-help-touch">Tap an answer to go where it leads. Tap a drawing to name its case and open it.</span><span class="fc-help-over fc-help-over-point">Each mark is a step: point at one for its name and its lines. Select a mark, or a framed part, to see it at full size.</span><span class="fc-help-over fc-help-over-touch">Each mark is a step: tap one for its name, and again to see it at full size.</span></p>
        <output class="fc-zoom-value" aria-label="Diagram zoom level"></output>
      </div>
      <div class="fc-came"></div>
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
              ${instruction(node) ? `<p class="fc-do">${esc(instruction(node))}</p>` : ''}
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
    // An answer that leads to a step other steps lead to as well says which: two routes that end at
    // the same step are recognised as doing so from either of them, before following one.
    const also = (node, to) => {
      const others = [...from.get(to.id)].filter((one) => one !== node).map((one) => one.number);
      return others.length
        ? `<span class="fc-also">Also reached from step${others.length > 1 ? 's' : ''} ${others.length > 1 ? `${others.slice(0, -1).join(', ')} and ${others.at(-1)}` : others[0]}</span>`
        : '';
    };
    const head = (node) =>
      `<p class="fc-line-came"></p><button type="button" class="fc-node-heading" data-flowchart-node="${esc(node.id)}">${badge(node)}<span><span class="fc-sr-only">Step ${node.number}. </span>${esc(node.label)}</span></button>`;
    const foot = (node) =>
      `<div class="fc-line-now">${node.edges.length === 1 ? '' : `<p class="fc-line-detail">${esc(node.detail)}</p>`}<button type="button" class="fc-line-sources" data-fc-sources>Sources and related charts for this step ↓</button></div>${artHTML(node, true)}`;
    return `<ol class="fc-outline" aria-label="The chart, step by step">${[...byId.values()]
      .filter((node) => !inline.has(node.id))
      .map((node) => {
        const met = [...(from.get(node.id) || [])];
        return `<li class="fc-line fc-kind-${kindOf(node)}${node.edges.length ? '' : ' fc-outcome'}" data-fc-line="${esc(node.id)}">
          ${met.length ? `<p class="fc-line-from${met.length > 1 ? ' fc-line-met' : ''}">${met.length > 1 ? `${met.length} routes meet here, from` : 'From'} ${met.map((one) => `<button type="button" data-fc-seek="${esc(one.id)}" aria-label="Go to step ${one.number}: ${esc(one.label)}">${one.number}</button>`).join('')}</p>` : ''}
          ${head(node)}
          ${instruction(node) ? `<p class="fc-do">${esc(instruction(node))}</p>` : ''}${node.edges.length === 1 ? `<p class="fc-line-detail fc-line-first">${esc(node.detail)}</p>` : ''}
          ${
            node.edges.length
              ? `<ul class="fc-line-exits">${node.edges
                  .map((edge, index) => {
                    const to = byId.get(edge.to);
                    const answer = `data-fc-map-branch="${index}" data-fc-from="${esc(node.id)}"`;
                    return inline.get(edge.to)?.parent === node.id
                      ? `<li class="fc-line-pair"><button type="button" class="fc-line-exit" ${answer}><span class="fc-answer">${esc(edge.label)}</span></button><div class="fc-line fc-outcome fc-kind-outcome" data-fc-line="${esc(to.id)}">${head(to)}${artHTML(to, true)}<div class="fc-line-now"><p class="fc-line-detail">${esc(to.detail)}</p><button type="button" class="fc-line-sources" data-fc-sources>Sources and related charts for this step ↓</button></div></div></li>`
                      : `<li><button type="button" class="fc-line-exit" ${answer}><span class="fc-answer">${esc(edge.label)}</span><span class="fc-destination">→ ${to.number} ${esc(to.label)}</span>${also(node, to)}</button></li>`;
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
  /* A step with one way forward is not a decision. Where its stored explanation tells the reader
     what to do there, that is the step's instruction: the first sentence of the explanation that
     opens with an instruction, and the instruction sentences that follow it directly. It is shown
     on the step wherever the step is drawn (the map's plate, the phone's list); the walkthrough
     shows the whole explanation, which holds it. Word for word; a step whose explanation holds no
     such sentence shows none.
     (A sentence opens with an instruction after at most "First" or the like and one opening
     clause: "For a U.S. citizen, determine …".) */
  const DOES = new RegExp(
    `^(?:(?:First|Then|Next|Ordinarily|Otherwise),? )?(?:(?:For|Under|On|In) [^,;]{3,60}, )?(?:${INSTRUCTION.source.slice(1, -1)}|(?:Add|Subtract|Publish|Direct|Construe|Remove|Account|Deduct|Serve|Notify|Count|Draft|Refer)) `,
    'i',
  );
  const instruction = (node) => {
    if (node.edges.length !== 1) return '';
    const said = sentences(node.detail);
    const first = said.findIndex((sentence) => DOES.test(sentence));
    if (first < 0) return '';
    let end = first;
    while (end < said.length && DOES.test(said[end])) end++;
    return said.slice(first, end).join(' ');
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

  // The map takes what is left of the dialog's height: its foot is the dialog's foot, and nothing
  // under it shows cut in half. (What is under it is reached by the link over the map.)
  function roomForMap() {
    const scroll = body.querySelector('.fc-map-scroll');
    if (!scroll?.clientWidth) return;
    const top = scroll.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop;
    scroll.style.setProperty('--fc-map-room', `${Math.max(320, Math.floor(body.clientHeight - top - 12))}px`);
  }
  function paintZoom({ center = false, preserve = false } = {}) {
    roomForMap();
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
    const current = trail.at(-1);
    const node = byId.get(current.id);
    const detail = dialog.querySelector('#flowchartDetail');
    // v3.1: the entry the chart was opened from is named on the steps that cite it.
    const from = active.from && node.sources.includes(active.from) ? active.from : null;
    detail.innerHTML = `
      <div class="fc-step-label">${nth(trail.length - lead)} on your path · chart step ${node.number}${from ? ` · decided by ${esc(titleOf(from))}` : ''}</div>
      <h3 tabindex="-1">${esc(node.label)}</h3>
      ${current.label ? `<p class="fc-selected-branch">From step ${byId.get(trail.at(-2).id).number} · ${esc(current.label)}</p>` : ''}
      <p class="fc-explanation">${esc(node.detail)}</p>
      ${
        node.edges.length
          ? `<p class="fc-choose">${node.edges.length > 1 ? 'Choose what happened' : 'Then'}</p><ol class="fc-choices${node.edges.length > 1 ? '' : ' fc-one'}">${node.edges
              .map((edge, index) => {
                const next = byId.get(edge.to);
                const own = active.from && next.sources.includes(active.from);
                return `<li><button type="button" data-flowchart-branch="${esc(edge.to)}" data-fc-branch-index="${index}"${own ? ' class="fc-own"' : ''}>
          <span>${esc(edge.label)}</span><span class="fc-destination">→ ${nodeType(next) || 'Step'} ${next.number} · ${esc(next.label)}</span>${node.edges.length > 1 && deciding(next) ? `<span class="fc-leads">${esc(deciding(next))}</span>` : ''}
        </button></li>`;
              })
              .join('')}</ol>`
          : ''
      }
      <div class="fc-walk-controls">
        <button type="button" data-flowcharts-back${trail.length - 1 <= lead ? ' disabled' : ''}>← ${trail.length - 1 > lead ? `Back to step ${byId.get(trail.at(-2).id).number}` : 'Previous step'}</button>
        <button type="button" data-flowcharts-reset${trail.length < 2 && node.id === active.chart.entry ? ' disabled' : ''}>Start over</button>
      </div>
      <div class="fc-detail-route"></div>
      <div class="fc-detail-sources">${sourcesHTML(node)}${relatedHTML(node.related)}${relatedHTML(active.chart.related)}</div>`;
    const side = dialog.querySelector('.fc-side');
    if (side)
      side.innerHTML = `${sourcesHTML(node)}${relatedHTML(node.related)}${relatedHTML(active.chart.related)}`;
    /* Makeover on 3.1: this column listed only the steps already walked, so the rest of the chart
       could be seen only on the map. It now lists every step in the chart. The steps walked carry
       the answer taken; any step opens from here. */
    const path = dialog.querySelector('.fc-trail');
    if (path) {
      const endings = node.edges.map((edge) => byId.get(edge.to));
      // Owner's answers, 24 November 2026 (Q6, Q9). A step is "2nd on your path · chart step 14": the
      // first number is the reader's own place, counted from where they arrived; the second finds
      // the step on the map. It is not "of 23": a branching chart is not a 23-step assignment. When a
      // link from an entry opens a step, the path starts at that step; one route from the chart's
      // start to it can be shown on request, and Back retraces only places the reader has been.
      const row = (step, i) => {
        const at = byId.get(step.id);
        const taken = trail[i + 1]?.label;
        const order = i >= lead ? `${nth(i - lead + 1)} on your path · ` : '';
        return i === trail.length - 1
          ? `<li aria-current="step"><span class="fc-trail-n">${order}chart step ${at.number} · now</span><span class="fc-trail-q">${esc(at.label)}</span></li>`
          : `<li><button type="button" data-fc-trail="${i}"><span class="fc-trail-n">${order}chart step ${at.number}</span><span class="fc-trail-q">${esc(at.label)}</span>${taken ? `<span class="fc-trail-a">→ ${esc(taken)}</span>` : ''}</button></li>`;
      };
      const rows = trail.map(row);
      const next = endings.length
        ? `<p class="fc-trail-next">Then ${endings.length === 1 ? 'chart step' : 'one of chart steps'} ${endings.map((n) => n.number).join(', ')}</p>`
        : '';
      const route = lead
        ? `<details class="fc-trail-route"${active.routeOpen ? ' open' : ''}><summary>Show one route to ${trail.length - lead === 1 ? 'this step' : `chart step ${byId.get(trail[lead].id).number}`}</summary><ol>${rows.slice(0, lead).join('')}</ol></details>`
        : '';
      path.innerHTML = `<p class="fc-trail-label">Your path</p><ol>${rows.slice(lead).join('')}</ol>${next}${route}`;
      // (A narrow window has no path column: there the same route is offered under the step.)
      const slot = detail.querySelector('.fc-detail-route');
      if (slot) slot.innerHTML = route;
      for (const box of dialog.querySelectorAll('details.fc-trail-route'))
        box.addEventListener('toggle', (event) => {
          active.routeOpen = event.target.open;
        });
    }
    // (An answer the reader chose is "You chose"; the last answer of a route a link arrived by is not.)
    const arrived = current.label
      ? trail.length - 1 > lead
        ? `You chose “${esc(current.label)}”`
        : `One route here is by “${esc(current.label)}”`
      : '';
    // On the map: the way back to the step the reader came from, in the answer's words, and the way
    // down to this step's explanation and sources, which lie under the map.
    const came = dialog.querySelector('.fc-came');
    if (came)
      came.innerHTML = `${
        current.label
          ? `${trail.length - 1 > lead ? `<button type="button" data-flowcharts-back>← Back to step ${byId.get(trail.at(-2).id).number}</button>` : ''}<span class="fc-came-chose">${arrived}</span>`
          : ''
      }<button type="button" class="fc-came-more" data-fc-sources>Step ${node.number}: explanation and sources ↓</button>`;
    for (const button of dialog.querySelectorAll('[data-flowcharts-view]'))
      button.setAttribute('aria-pressed', String(button.dataset.flowchartsView === view));
    const map = dialog.querySelector('.fc-map');
    map.querySelector('.fc-trace-tag')?.remove();
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
        ? `${trail.length - 1 > lead ? `<button type="button" data-flowcharts-back>← Back to step ${before.number}</button> ` : ''}<span>${arrived}</span>`
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
    const cell = view === 'map' && map.querySelector('.fc-map-scroll [aria-current="step"]');
    if (focus && outlined) outlined.querySelector('.fc-node-heading').focus({ preventScroll: true });
    else if (focus && cell && cell.getClientRects().length) cell.focus({ preventScroll: true });
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
  const stepHash = (at) =>
    '#flowchart=' +
    encodeURIComponent(active.chart.id) +
    (at === active.chart.entry ? '' : '&step=' + encodeURIComponent(at)) +
    (active.from ? '&from=' + encodeURIComponent(active.from) : '');
  function settle() {
    const at = active.trail.at(-1).id;
    const step = at === active.chart.entry ? '' : at;
    const hash = stepHash(at);
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
         regions meet, every outcome (in full), and the step the reader is on; on a chart of a
         dozen steps or fewer, to every step they can be set beside clear of everything else.
         Every other step is a mark, its number in its shape, and gives its name when pointed at,
         focused or pressed;
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
    // (And it starts far enough right that an outcome inside an earlier region has room for its
    // words before it: found in three passes, since that room narrows every column.)
    let step = 0,
      push = 0;
    for (let pass = 0; pass < 3; pass++) {
      step = Math.min(200, (W - padL - padR - push) / run[last]);
      const edge = major ? padL + run[col(major.id)] * step - 34 : Infinity;
      const wanted = Math.max(
        0,
        ...before.filter((node) => !node.edges.length).map((node) => padL + run[col(node.id)] * step + 214),
      );
      push = major ? Math.max(0, wanted - edge) : 0;
    }
    const x = (id) => padL + run[col(id)] * step + (tail.has(id) ? push : 0);
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
    /* Lines, before any words are set. A line runs from its step to the step it leads to and enters
       no other: where the plain line would pass through a step on the way (an answer that skips
       steps drawn on the same row), it is bowed clear of them, to one side or the other and as far
       as it takes. Lines that leave one step for different steps start a little apart on the
       step's side and are never laid along each other. */
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
    const sample = (p0, p1, p2, p3) => {
      const n = Math.max(
        16,
        Math.ceil((Math.abs(p3.x - p0.x) + Math.abs(p3.y - p0.y) + Math.abs(p1.y - p0.y)) / 6),
      );
      return Array.from({ length: n + 1 }, (unused, i) => {
        const t = i / n,
          u = 1 - t;
        return {
          x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
          y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
        };
      });
    };
    const enters = (pts, a, b) =>
      nodes.filter(
        (node) =>
          node.id !== a &&
          node.id !== b &&
          pts.some((p) => Math.abs(p.x - x(node.id)) < 19 && Math.abs(p.y - y.get(node.id)) < 19),
      ).length;
    const drawn = []; // { from, to, index, pts, d, forward }
    const beside = (pts, line) =>
      drawn.some(
        (other) =>
          other !== line &&
          other.pts &&
          other.from === line.from &&
          other.to !== line.to &&
          pts.filter((p) => other.pts.some((q) => Math.abs(p.x - q.x) < 4 && Math.abs(p.y - q.y) < 4))
            .length *
            6 >
            40,
      );
    // The first of a line's possible courses that enters no step, lies along no other line from
    // its step, stays in the window and (once the words are set) runs through none of them; failing
    // that, the least bad.
    const lay = (line, words) => {
      let best = null;
      for (const points of line.tries) {
        const pts = sample(...points);
        const bad =
          enters(pts, line.from, line.to) * 10 +
          (beside(pts, line) ? 5 : 0) +
          (pts.some((p) => p.y < 6 || p.y > H - 6) ? 20 : 0) +
          4 *
            words.filter(
              (box) =>
                pts.filter((p) => p.x > box.l + 2 && p.x < box.r - 2 && p.y > box.t + 2 && p.y < box.b - 2)
                  .length > 2,
            ).length;
        if (!best || bad < best.bad) best = { points, pts, bad };
        if (!bad) break;
      }
      const [p0, p1, p2, p3] = best.points;
      line.pts = best.pts;
      line.d = `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`;
    };
    const fan = new Map(); // where each forward line starts on its step's side
    for (const node of nodes) {
      const out = node.edges
        .map((edge, index) => ({ edge, index }))
        .filter((one) => x(one.edge.to) > x(node.id) + 1)
        .sort((p, q) => y.get(p.edge.to) - y.get(q.edge.to) || x(p.edge.to) - x(q.edge.to));
      out.forEach((one, i) =>
        fan.set(`${node.id}/${one.index}`, Math.max(-9, Math.min(9, (i - (out.length - 1) / 2) * 5))),
      );
    }
    const pending = nodes
      .flatMap((node) => node.edges.map((edge, index) => ({ node, edge, index })))
      .sort((p, q) => Math.abs(x(p.edge.to) - x(p.node.id)) - Math.abs(x(q.edge.to) - x(q.node.id)));
    for (const { node, edge, index } of pending) {
      const x1 = x(node.id),
        y1 = y.get(node.id),
        x2 = x(edge.to),
        y2 = y.get(edge.to);
      const forward = x2 > x1 + 1;
      const tries = [];
      if (forward) {
        const p0 = { x: x1 + 12, y: y1 + fan.get(`${node.id}/${index}`) },
          p3 = { x: x2 - 14, y: y2 };
        const run = p3.x - p0.x;
        const short = Math.min(44, run / 3);
        tries.push([p0, { x: p0.x + short, y: p0.y }, { x: p3.x - short, y: p3.y }, p3]);
        for (const bow of [30, 46, 62, 80, 100, 124, 150])
          for (const side of y1 + y2 < H ? [1, -1] : [-1, 1])
            tries.push([
              p0,
              { x: p0.x + run / 3, y: p0.y + side * bow },
              { x: p3.x - run / 3, y: p3.y + side * bow },
              p3,
            ]);
      } else
        for (const rise of [64, 96, 130])
          for (const side of [-1, 1])
            tries.push([
              { x: x1, y: y1 + side * 12 },
              { x: x1, y: y1 + side * rise },
              { x: x2, y: y2 + side * rise },
              { x: x2, y: y2 + side * 15 },
            ]);
      const line = { from: node.id, to: edge.to, index, forward, tries };
      lay(line, []);
      drawn.push(line);
    }
    let tracks = drawn.map((line) => line.pts);
    /* Words: where they stand clear of the marks, of each other, of the regions' names, of the lines
       and of the window. Each is set in lines measured as they will be drawn, so the room it is
       given is the room it takes. */
    const pen = (composeOverview.pen ||= document.createElement('canvas').getContext('2d'));
    const family = `${getComputedStyle(body).getPropertyValue('--dkla-interface').trim() || 'Inter'}, sans-serif`;
    const setting = (text, weight, size, lineHeight, width) => {
      pen.font = `${weight} ${size}px ${family}`;
      const lines = [];
      for (const word of text.split(' ')) {
        const tried = lines.length ? `${lines[lines.length - 1]} ${word}` : word;
        if (lines.length && pen.measureText(tried).width <= width) lines[lines.length - 1] = tried;
        else lines.push(word);
      }
      return {
        lines,
        width: Math.ceil(Math.max(...lines.map((line) => pen.measureText(line).width))) + 2,
        tall: lines.length * lineHeight,
      };
    };
    const hit = (box) => (other) => box.l < other.r && box.r > other.l && box.t < other.b && box.b > other.t;
    // The regions' names stand where they will be drawn: nothing else is set over them.
    const edgeOf = (list) => Math.min(...list.map((node) => x(node.id))) - 30;
    const nameOf = (i) => fork.edges.find((edge) => edge.to === starts[i]).label;
    // A frame begins a little above its highest step, with room for its name and one line of words
    // between, and its name stands at its head, from its left edge. Where a line would run through
    // the name there, the name starts to the right of the region's first step instead, or the
    // frame is begun higher, at the top of its band, or the name stands at the frame's foot:
    // the first of these that leaves the name clear.
    const nameAt = (which, list, title, edge, first) => {
      const band = bands.get(which);
      const wide = setting(title, 600, 13, 18, 1e4).width + 6;
      const near = Math.max(band.top, Math.min(...list.map((node) => y.get(node.id))) - 92);
      const low = Math.max(...list.map((node) => y.get(node.id)));
      const places = [near, band.top].flatMap((top) =>
        [edge + 12, x(first) + 20].map((l) => ({ top, box: { l, r: l + wide, t: top + 4, b: top + 28 } })),
      );
      if (low + 62 <= band.hi)
        places.push({
          top: near,
          box: { l: edge + 12, r: edge + 12 + wide, t: low + 32, b: low + 56, foot: true },
        });
      let best = null;
      for (const one of places) {
        const cut = tracks.filter(
          (track) =>
            track.filter((p) => p.x > one.box.l && p.x < one.box.r && p.y > one.box.t && p.y < one.box.b)
              .length > 2,
        ).length;
        if (!best || cut < best.cut) best = { ...one, cut };
      }
      band.top = best.top;
      return best.box;
    };
    const names = regions.map((one) =>
      nameAt(one.i, one.list, nameOf(one.i), edgeOf(one.list), starts[one.i]),
    );
    let tailTitle = '';
    if (major) {
      const counts = new Map();
      for (const one of into.get(major.id)) counts.set(one.label, (counts.get(one.label) || 0) + 1);
      tailTitle = [...counts].sort((a, b) => b[1] - a[1])[0][0];
      names.push(nameAt('T', members('T'), tailTitle, tailEdge, major.id));
    }
    const framed = new Set(regions.map((one) => one.i));
    const labels = [];
    const place = (set, cx, cy, gap, sides, must, inTail, band) => {
      const { width, tall } = set;
      const spots = {
        right: { l: cx + gap, t: cy - tall / 2 },
        left: { l: cx - gap - width, t: cy - tall / 2, end: true },
        above: { l: cx - width / 2, t: cy - gap - tall, centre: true },
        below: { l: cx - width / 2, t: cy + gap, centre: true },
        upRight: { l: cx + 4, t: cy - gap - tall },
        downRight: { l: cx + 4, t: cy + gap },
        upLeft: { l: cx - 4 - width, t: cy - gap - tall, end: true },
        downLeft: { l: cx - 4 - width, t: cy + gap, end: true },
        higher: { l: cx - width / 2, t: cy - gap - 18 - tall, centre: true },
        lower: { l: cx - width / 2, t: cy + gap + 18, centre: true },
      };
      // How badly a place is taken: outside the window or its own region counts most.
      const taken = (spot) => {
        const box = { l: spot.l - 2, r: spot.l + width + 2, t: spot.t - 1, b: spot.t + tall + 1 };
        return (
          (spot.l < 3 || spot.l + width > W - 3 || spot.t < 3 || spot.t + tall > H - 3 ? 64 : 0) +
          (!inTail && box.r > tailEdge - 6 ? 32 : 0) +
          (band && (box.t < band.top + (band.named ? 28 : 0) || box.b > band.hi - 3) ? 8 : 0) +
          6 * boxes.filter(hit(box)).length +
          16 * labels.filter((one) => hit(box)(one.box)).length +
          16 * names.filter(hit(box)).length +
          3 *
            tracks.filter((track) =>
              track.some((p) => p.x > box.l && p.x < box.r && p.y > box.t && p.y < box.b),
            ).length
        );
      };
      const order = must ? [...sides, ...Object.keys(spots).filter((name) => !sides.includes(name))] : sides;
      let side = order[0];
      for (const name of order) if (taken(spots[name]) < taken(spots[side])) side = name;
      const cost = taken(spots[side]);
      if (cost && !must) return null;
      const spot = { ...spots[side] };
      // (never outside the window, whatever else gives)
      spot.l = Math.max(5, Math.min(W - 5 - width, spot.l));
      spot.t = Math.max(5, Math.min(H - 5 - tall, spot.t));
      return { spot, cost, box: { l: spot.l, r: spot.l + width, t: spot.t, b: spot.t + tall } };
    };
    const say = (node, kind, width, weight, size, lineHeight, sides, must) => {
      const ringed = into.get(node.id).length > 1 || node.id === here;
      // (A step inside a framed region keeps its words inside the frame, under the region's name.)
      const which = lane(node.id);
      const band =
        which === 'S'
          ? null
          : {
              ...bands.get(which),
              named:
                (which === 'T' || framed.has(which)) &&
                !names[which === 'T' ? names.length - 1 : regions.findIndex((one) => one.i === which)]?.foot,
            };
      // (Words that must be shown and have no clear place as they are set are tried set narrower,
      // in more lines, before they are let lie over anything.)
      let best = null;
      for (const narrow of must ? [1, 0.78, 0.62] : [1]) {
        const set = setting(node.label, weight, size, lineHeight, width * narrow);
        const at = place(set, x(node.id), y.get(node.id), ringed ? 25 : 20, sides, must, which === 'T', band);
        if (at && (!best || at.cost < best.cost)) best = { set, ...at };
        if (best && !best.cost) break;
      }
      if (best)
        labels.push({
          id: node.id,
          kind,
          ...best,
          again: () => say(node, kind, width, weight, size, lineHeight, sides, must),
        });
    };
    say(fork, 'first', 172, 600, 14, 19, ['left', 'above', 'below'], true);
    if (major) say(major, 'major', 190, 600, 14, 18, ['right', 'below', 'above'], true);
    for (const node of nodes)
      if (!node.edges.length && !labels.some((one) => one.id === node.id))
        say(node, 'outcome', 172, 500, 12, 16, ['right', 'left', 'below', 'above'], true);
    for (const node of nodes) {
      if (labels.some((one) => one.id === node.id)) continue;
      const from = into.get(node.id);
      const meets = from.length >= 3 || new Set(from.map((one) => lane(one.from))).size > 1;
      if (node.id === here) say(node, 'here', 160, 500, 12, 16, ['above', 'below', 'right', 'left'], true);
      else if (meets && from.length > 1) say(node, 'join', 160, 500, 12, 15, ['above', 'below', 'right']);
    }
    // A small chart (a dozen steps or fewer) has room for more: every other step gets its words
    // too, wherever they stand clear of everything else.
    if (nodes.length <= 12)
      for (const node of nodes)
        if (!labels.some((one) => one.id === node.id))
          say(node, 'step', 150, 500, 12, 15, ['above', 'below']);
    const wordsOf = (set) => set.lines.map(esc).join(' <br>');
    // An answer of the first question that has no region of its own (it leads straight to a step
    // other answers reach too): its words beside its line, where there is room for them.
    const asides = fork.edges
      .map((edge, index) => ({ edge, index }))
      .filter(({ edge }) => !regions.some((one) => starts[one.i] === edge.to))
      .map(({ edge, index }) => {
        const line = drawn.find((one) => one.from === fork.id && one.index === index);
        const mid = line.pts[Math.floor(line.pts.length / 2)];
        const set = setting(edge.label, 500, 12, 15, 150);
        const at = place(
          set,
          mid.x,
          mid.y,
          7,
          ['above', 'below', 'upRight', 'downRight', 'upLeft', 'downLeft'],
          false,
          lane(edge.to) === 'T',
        );
        if (!at) return '';
        labels.push({ id: '', ...at });
        return `<span class="fc-ov-label fc-ov-answer${at.spot.end ? ' fc-ov-end' : ''}${at.spot.centre ? ' fc-ov-centre' : ''}" style="left:${at.spot.l.toFixed(1)}px;top:${at.spot.t.toFixed(1)}px;width:${set.width}px" aria-hidden="true">${wordsOf(set)}</span>`;
      })
      .join('');
    // Regions: a band of its own for each, as wide as its steps and their words.
    const region = (l, band, right, title, to, ids, name) => {
      // (and it ends under the lowest thing it holds)
      const floor = Math.min(
        band.hi,
        Math.max(
          band.top + 60,
          ...[...ids].map((id) => y.get(id) + 30),
          ...labels.filter((label) => ids.has(label.id)).map((label) => label.box.b + 12),
          name.foot ? name.b + 6 : 0,
        ),
      );
      return `<button type="button" class="fc-ov-region" data-fc-look="${esc(to)}" style="left:${l.toFixed(1)}px;top:${band.top.toFixed(1)}px;width:${(right - l).toFixed(1)}px;height:${(floor - band.top).toFixed(1)}px"><span class="fc-ov-title" style="left:${(name.l + 2 - l).toFixed(1)}px;top:${(name.t + 3 - band.top).toFixed(1)}px">${esc(title)}</span><span class="fc-sr-only">: show this part of the chart at full size</span></button>`;
    };
    // (A region with no room for its own name before the last region is not framed: the answer's
    // words stand over its first step instead.)
    const narrow = [];
    const frames = regions.map((one, k) => {
      const ids = new Set(one.list.map((node) => node.id));
      const title = nameOf(one.i);
      const l = edgeOf(one.list);
      // As wide as its steps and their words, and at least as wide as its own name; never into the
      // last region.
      const named = names[k].r + 8;
      const right = Math.min(
        Math.max(
          named,
          ...one.list.map((node) => x(node.id) + 26),
          ...labels.filter((label) => ids.has(label.id)).map((label) => label.box.r + 10),
        ),
        major ? tailEdge - 8 : W - 6,
      );
      if (right >= named) return region(l, bands.get(one.i), right, title, starts[one.i], ids, names[k]);
      names[k] = { l: 0, r: 0, t: 0, b: 0 };
      const set = setting(title, 500, 12, 15, 150);
      const at = place(
        set,
        x(starts[one.i]),
        y.get(starts[one.i]),
        20,
        ['above', 'below', 'upRight', 'downRight', 'upLeft', 'downLeft', 'right', 'left'],
        true,
        false,
      );
      labels.push({ id: '', ...at });
      narrow.push(
        `<span class="fc-ov-label fc-ov-answer${at.spot.end ? ' fc-ov-end' : ''}${at.spot.centre ? ' fc-ov-centre' : ''}" style="left:${at.spot.l.toFixed(1)}px;top:${at.spot.t.toFixed(1)}px;width:${set.width}px" aria-hidden="true">${wordsOf(set)}</span>`,
      );
      return '';
    });
    if (major) {
      // (The last region is as wide as what it holds.)
      const held = members('T');
      const ids = new Set(held.map((node) => node.id));
      const right = Math.min(
        W - 6,
        Math.max(
          names[names.length - 1].r + 8,
          ...held.map((node) => x(node.id) + 26),
          ...labels.filter((label) => ids.has(label.id)).map((label) => label.box.r + 10),
        ),
      );
      frames.push(region(tailEdge, bands.get('T'), right, tailTitle, major.id, ids, names[names.length - 1]));
    }
    // With the words set, a line that runs through any of them takes another of its courses.
    const set = [...labels.map((one) => one.box), ...names.filter((one) => one.r > one.l)];
    for (const line of drawn) lay(line, set);
    // And words a line still runs through are set again, round the lines as they now lie.
    tracks = drawn.map((line) => line.pts);
    const through = (box) =>
      tracks.some(
        (track) =>
          track.filter((p) => p.x > box.l + 2 && p.x < box.r - 2 && p.y > box.t + 2 && p.y < box.b - 2)
            .length > 2,
      );
    for (const label of labels.filter((one) => one.again && through(one.box))) {
      labels.splice(labels.indexOf(label), 1);
      label.again();
    }
    const route = new Set(trail.slice(1).map((one, i) => `${trail[i].id}/${one.edge}`));
    const lines = drawn
      .map(
        (line) =>
          `<path class="fc-ov-line${line.forward ? '' : ' fc-ov-back'}${route.has(`${line.from}/${line.index}`) ? ' fc-path-wire' : ''}" data-fc-from="${esc(line.from)}" data-fc-to="${esc(line.to)}" d="${line.d.replace(/(\.\d)\d+/g, '$1')}" marker-end="url(#fcOvArrow)"></path>`,
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
          `<span class="fc-ov-label fc-ov-${one.kind}${one.spot.end ? ' fc-ov-end' : ''}${one.spot.centre ? ' fc-ov-centre' : ''}" data-fc-says="${esc(one.id)}" style="left:${one.spot.l.toFixed(1)}px;top:${one.spot.t.toFixed(1)}px;width:${one.set.width}px" aria-hidden="true">${wordsOf(one.set)}</span>`,
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
    // #flowchart=K-16, or #flowchart=K-16&step=c&from=citoh when opened from a case page.
    const [idPart, ...params] = hash.slice('#flowchart='.length).split('&');
    const id = decodeURIComponent(idPart);
    const options = Object.fromEntries(
      params.map((pair) => pair.split('=').map((part) => decodeURIComponent(part || ''))),
    );
    // The browser's Back or Forward between steps of the chart being shown: back to a step on the
    // reader's path as it was left, or on again by the answer that leads to the step named.
    if (
      dialog.open &&
      active &&
      active.chart.id === id &&
      !isLibrary &&
      (options.from || '') === (active.from || '')
    ) {
      const step = options.step || active.chart.entry;
      const on = active.trail.findLastIndex((one) => one.id === step);
      const next = active.byId.get(active.trail.at(-1).id).edges.findIndex((edge) => edge.to === step);
      if (on >= 0 || next >= 0) {
        showing = hash;
        if (on >= 0) retrace(on);
        else follow(active.trail.at(-1).id, next, { record: false });
        return;
      }
    }
    showing = hash;
    active = null;
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
      // The keyboard goes back to the drawing whose card was open, or to the source link pressed.
      const drawings = [...dialog.querySelectorAll('.fc-art-item')].filter(
        (one) => one.getClientRects().length,
      );
      const links = [...dialog.querySelectorAll('a[data-flowchart-source]')].filter(
        (one) => one.getClientRects().length && one.getAttribute('href') === left.href,
      );
      (left.art >= 0 ? drawings[left.art]?.querySelector('[data-fc-art]') : links[0])?.focus({
        preventScroll: true,
      });
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

  // Where the reader is looking: the view, the zoom, how far the page and the map are scrolled, and
  // which control has the keyboard. Kept with each answer followed, and put back on the way back.
  function placeNow() {
    const scroll = dialog.querySelector('.fc-map-scroll');
    const held = document.activeElement?.closest?.('[data-fc-map-branch], [data-flowchart-branch]');
    return {
      view: active.view,
      zoom: active.zoom,
      top: body.scrollTop,
      map: scroll ? [scroll.scrollLeft, scroll.scrollTop] : null,
      held: held ? [held.dataset.fcFrom || '', held.dataset.fcMapBranch ?? held.dataset.fcBranchIndex] : null,
    };
  }
  // Back along the path to its step number `to`: that step again, as it was left.
  function retrace(to) {
    if (to < 0) return;
    const place = active.trail[to + 1]?.place;
    active.trail = active.trail.slice(0, to + 1);
    if (!place || place.view !== active.view) return paintStep({ focus: true, center: true });
    active.zoom = place.zoom;
    paintStep({ focus: true });
    body.scrollTop = place.top;
    const scroll = dialog.querySelector('.fc-map-scroll');
    if (scroll && place.map) [scroll.scrollLeft, scroll.scrollTop] = place.map;
    // The answer that was pressed has the keyboard again.
    const held =
      place.held &&
      [...dialog.querySelectorAll('[data-fc-map-branch], [data-flowchart-branch]')].find(
        (one) =>
          one.getClientRects().length &&
          (one.dataset.fcFrom || '') === place.held[0] &&
          (one.dataset.fcMapBranch ?? one.dataset.fcBranchIndex) === place.held[1],
      );
    held?.focus({ preventScroll: true });
  }
  function follow(from, index, { record = true } = {}) {
    const edge = active.byId.get(from).edges[index];
    const place = placeNow();
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
    active.trail.push({ id: edge.to, label: edge.label, edge: index, place });
    // On the map the step it leads to is brought into view at a size it can be read at.
    const graph = dialog.querySelector('.fc-graph');
    if (active.view === 'map' && (active.zoom === 'fit' || (graph && currentZoom(graph) < 0.9)))
      active.zoom = 1;
    // An answer followed is a step in the browser's history too: its Back returns to the fork.
    if (record && location.hash.startsWith('#flowchart=')) {
      const depth = history.state?.dklaFlowchartsDepth || 0;
      history.pushState(
        {
          ...history.state,
          dklaFlowchartsDepth: depth ? depth + 1 : 0,
          dklaFlowchartsFrom: `${active.chart.id}|${from}`,
        },
        '',
        (showing = stepHash(edge.to)),
      );
    }
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
      // (Which link was pressed, and from which drawing's card, so the keyboard is put back there:
      // owner's answers, 24 November 2026, Q8.)
      const item = source.closest('.fc-art-item');
      const cell = source.closest('[data-fc-cell], [data-fc-line]');
      active.left = {
        opened: active.opened,
        step: active.trail.at(-1).id,
        top: body.scrollTop,
        map: active.view === 'map' && scroll ? [scroll.scrollLeft, scroll.scrollTop] : null,
        href: cameFrom,
        art: item
          ? [...dialog.querySelectorAll('.fc-art-item')]
              .filter((one) => one.getClientRects().length)
              .indexOf(item)
          : -1,
        cell: cell ? cell.dataset.fcCell || cell.dataset.fcLine : '',
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
    else roomForMap();
  });
  // Pointing at an answer on the map, or reaching it with the keyboard, traces its wire to the step
  // it leads to.
  function trace(exit) {
    const map = dialog.querySelector('.fc-map');
    if (!map) return;
    for (const el of map.querySelectorAll('.fc-trace')) el.classList.remove('fc-trace');
    map.querySelector('.fc-trace-tag')?.remove();
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
    // Where the lit line leaves what can be seen before it reaches its step, it says there which
    // step it goes on to.
    const scroll = map.querySelector('.fc-map-scroll');
    const cell = map.querySelector(`.fc-graph [data-fc-cell="${CSS.escape(to)}"]`);
    if (scroll?.clientHeight && cell) {
      const frame = scroll.getBoundingClientRect();
      const view = {
        l: frame.left,
        t: frame.top,
        r: frame.left + scroll.clientWidth,
        b: frame.top + scroll.clientHeight,
      };
      const at = cell.getBoundingClientRect();
      const seen =
        at.top >= view.t && at.top + 44 <= view.b && at.left + 60 <= view.r && at.right - 60 >= view.l;
      let last = null,
        next = null;
      if (!seen) {
        const matrix = wire.getScreenCTM();
        const length = wire.getTotalLength();
        for (let along = 0; along <= length && !next; along += 4) {
          const p = wire.getPointAtLength(along).matrixTransform(matrix);
          if (p.x > view.l + 4 && p.x < view.r - 4 && p.y > view.t + 4 && p.y < view.b - 4) last = p;
          else if (last) next = p;
        }
      }
      if (last && next) {
        const node = active.byId.get(to);
        const base = map.getBoundingClientRect();
        const dx = next.x - last.x,
          dy = next.y - last.y;
        const arrow = Math.abs(dy) >= Math.abs(dx) ? (dy > 0 ? '↓' : '↑') : dx > 0 ? '→' : '←';
        map.insertAdjacentHTML(
          'beforeend',
          `<span class="fc-trace-tag" aria-hidden="true">${arrow} ${node.number} ${esc(node.label)}</span>`,
        );
        const tag = map.lastElementChild;
        const wide = tag.offsetWidth,
          tall = tag.offsetHeight;
        const left = Math.max(view.l + 6, Math.min(view.r - wide - 6, last.x + 10));
        const top = Math.max(view.t + 6, Math.min(view.b - tall - 6, last.y - tall / 2));
        tag.style.left = `${left - base.left}px`;
        tag.style.top = `${top - base.top}px`;
      }
    }
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
      if (active.trail.length - 1 <= (active.lead || 0)) return;
      // (The step before is the entry before in the browser's history when it was left by an answer:
      // then this is the browser's Back, so the two never disagree.)
      const mark = history.state?.dklaFlowchartsFrom;
      if (active.trail.length > 1 && mark === `${active.chart.id}|${active.trail.at(-2).id}`) history.back();
      else retrace(active.trail.length - 2);
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
  /* The case page's "Flowchart steps" card. Makeover on 3.1 (owner, 24 November 2026: "difficult to
     read and difficult to navigate"): 3.1 drew the path as a row of boxes that kept the last four
     steps and cut the answers between them to a few letters. The path is now read downward, like the
     timeline beside it: every question from the chart's start, the answer taken to reach the next
     one written in full, and each step this entry decides opened with its explanation and the other
     answers that step allows. Every line is the chart's own record and opens the chart at that step. */
  function chartStepsHTML(id) {
    const all = stepsCiting(id);
    const card = ({ chart, number, cited, path }, index) => {
      const decided = new Set(cited.map((node) => node.id));
      const byId = new Map(chart.nodes.map((node) => [node.id, node]));
      const onPath = new Set(path.map((step) => step.id));
      // An entry that decides most of a chart: the heading already lists its steps, so the steps are
      // not each tagged, and only those on the path are opened.
      const many = cited.length > 3;
      const stepHTML = (node, next) => {
        const own = decided.has(node.id);
        const others = own ? node.edges.filter((edge) => edge.to !== next) : [];
        return `<li class="mk-fc-step${own ? ' mk-own' : ''}${node.edges.length ? '' : ' mk-end'}"><a class="mk-fc-q" href="${stepURL(chart.id, node.id, id)}" data-flowchart-id="${esc(chart.id)}"><span class="mk-fc-n">${number.get(node.id)}</span><span class="mk-fc-label">${esc(node.label)}</span>${node.edges.length ? '' : '<span class="mk-fc-tag">Outcome</span>'}${own && !many ? '<span class="mk-fc-tag mk-fc-here">This entry</span>' : ''}</a>${own && (!many || onPath.has(node.id)) ? `<p class="mk-fc-detail">${esc(node.detail)}</p>` : ''}${
          others.length && (!many || onPath.has(node.id))
            ? `<p class="mk-fc-others"><span>${next ? 'Other answers' : 'Answers'}</span>${others.map((edge) => `<a href="${stepURL(chart.id, edge.to, id)}" data-flowchart-id="${esc(chart.id)}">${esc(edge.label)} → ${number.get(edge.to)}</a>`).join('')}</p>`
            : ''
        }</li>`;
      };
      const route = path
        .map((step, i) => {
          const answer =
            i > 0 && step.label ? `<li class="mk-fc-answer"><span>${esc(step.label)}</span></li>` : '';
          return answer + stepHTML(byId.get(step.id), path[i + 1]?.id);
        })
        .join('');
      const apart = cited.filter((node) => !onPath.has(node.id));
      const first = cited.reduce((a, b) => (number.get(b.id) < number.get(a.id) ? b : a), cited[0]);
      return `<article class="v31-chart mk-fc${index > 1 ? ' v31-chart-more' : ''}">
        <div class="v31-card-head"><div><p class="v31-meta">Flowchart ${esc(chart.id)} · ${cited.length === 1 ? 'step' : 'steps'} ${cited.map((n) => number.get(n.id)).join(', ')} of ${chart.nodes.length}</p><h3>${esc(chart.title)}</h3></div>
        <a class="v31-open" href="${stepURL(chart.id, first.id, id)}" data-flowchart-id="${esc(chart.id)}">Open at step ${number.get(first.id)} →</a></div>
        <ol class="mk-fc-route">${route}</ol>
        ${apart.length ? `<p class="mk-fc-apart">On another branch of this chart</p><ol class="mk-fc-route mk-fc-loose">${apart.map((node) => stepHTML(node)).join('')}</ol>` : ''}
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
