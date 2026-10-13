/* DKLA dashboard design prototype: sample data only, no collector or API calls. */
(() => {
  'use strict';
  const D = window.DKLA_DEMO,
    C = window.DKLA_CATALOG,
    DAY = 86400000;
  const nodes = new Map(C.nodes.map((n) => [n.id, n]));
  const palette = {
    'Contracts': '#e5aa70',
    'Civil Procedure': '#7cb0df',
    'Legislation and the Regulatory State': '#9ec5a7',
  };
  const short = {
    'Contracts': 'Contracts',
    'Civil Procedure': 'Civil Procedure',
    'Legislation and the Regulatory State': 'LRS',
  };
  const icons = {
    overview:
      '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    people:
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
    arrow: '<path d="m9 5 7 7-7 7"/>',
    back: '<path d="m15 5-7 7 7 7"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
    entry: '<path d="M5 3h12a2 2 0 0 1 2 2v16l-7-3-7 3zM9 7h6M9 11h6"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
    source: '<path d="M5 3h9l5 5v13H5zM14 3v5h5M9 13h6M9 17h6"/>',
    drill: '<rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 2h6M9 10h6M9 14h3"/>',
    rating: '<path d="m12 3 3 6 6 1-4.5 4.5L18 21l-6-3-6 3 1.5-6.5L3 10l6-1z"/>',
    coldcall:
      '<path d="M5 4h5a2 2 0 0 1 2 2v15a4 4 0 0 0-4-2H3V4zM19 4h-5a2 2 0 0 0-2 2v15a4 4 0 0 1 4-2h5V4z"/>',
    copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
    watch: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    edit: '<path d="m15 3 6 6L8 22H2v-6zM12 6l6 6"/>',
    device: '<rect x="3" y="3" width="18" height="13" rx="2"/><path d="M8 21h8M12 16v5"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/>',
    play: '<path d="m8 4 12 8-12 8z"/>',
    pause: '<path d="M8 4v16M16 4v16"/>',
    columns: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M10 4v16M16 4v16"/>',
    map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16"/>',
  };
  const icon = (n) =>
    `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[n] || icons.entry}</svg>`;
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const fmtDate = (t) =>
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' }).format(
      t,
    );
  const fmtTime = (t) =>
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York',
    }).format(t);
  const dateKey = (t) =>
    new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'America/New_York',
    }).format(t);
  const duration = (s) =>
    s >= 3600
      ? `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`
      : s >= 60
        ? `${Math.round(s / 60)}m`
        : `${Math.round(s)}s`;
  const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const relative = (t) => {
    const m = Math.floor((D.now - t) / 60000);
    return m < 1 ? 'Just now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : fmtDate(t);
  };
  const label = (p) => p.label || p.handle;
  const avatar = (p, large = false) =>
    `<span class="avatar${large ? ' large' : ''}" style="--avatar:${p.color}">${p.glyph}</span>`;
  const courseTag = (c) => `<span class="course-label" style="--course:${palette[c]}">${short[c]}</span>`;
  const state = {
    course: 'all',
    heatPerson: 'all',
    days: 7,
    start: null,
    end: null,
    sort: 'opens',
    asc: false,
    search: '',
    columns: new Set(['course', 'opens', 'active', 'trend']),
    watch: new Set(),
    labels: new Map(),
    merge: 'pending',
    replaySession: null,
    replayIndex: 0,
    replayPlaying: false,
    speed: 1,
    heatDay: null,
    liveTick: 0,
  };
  let replayTimer, toastTimer;
  const route = () => (location.hash.startsWith('#visitor=') ? 'visitor' : 'overview');
  const currentPerson = () =>
    D.people.find((p) => p.id === decodeURIComponent(location.hash.split('=')[1] || '')) || D.people[0];
  const bounds = () => ({
    start: state.start
      ? Date.parse(state.start + 'T00:00:00-04:00')
      : Date.parse(dateKey(D.now - (state.days - 1) * DAY) + 'T00:00:00-04:00'),
    end: state.end ? Date.parse(state.end + 'T23:59:59-04:00') : D.now,
  });
  const filtered = (person = null) => {
    const b = bounds();
    return D.sessions.filter(
      (s) =>
        (!person || s.person === person) &&
        s.start >= b.start &&
        s.start <= b.end &&
        (state.course === 'all' || s.course === state.course) &&
        (!state.heatDay || dateKey(s.start) === state.heatDay),
    );
  };
  const events = (ss) =>
    ss
      .flatMap((s) => s.events.map((e) => ({ ...e, person: s.person, session: s.id })))
      .sort((a, b) => a.at - b.at);
  function spark(values, color = palette.Contracts, cls = 'spark') {
    const max = Math.max(...values, 1),
      last = values.length - 1;
    const pts = values.map((v, i) => `${(i / Math.max(last, 1)) * 120},${30 - (v / max) * 25}`).join(' ');
    return `<svg class="${cls}" viewBox="0 0 120 34" preserveAspectRatio="none" aria-hidden="true"><path d="M${pts.replaceAll(' ', ' L')} L120 34 L0 34Z" fill="${color}" opacity=".045"/><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.4" vector-effect="non-scaling-stroke"/></svg>`;
  }
  function rangeControls() {
    const b = bounds();
    return `<div class="controls"><select class="select" id="courseFilter" aria-label="Filter by course"><option value="all">All courses</option>${D.courses.map((c) => `<option value="${esc(c)}"${state.course === c ? ' selected' : ''}>${short[c]}</option>`).join('')}</select><button class="button" id="dateButton">${icon('calendar')}${fmtDate(b.start)} – ${fmtDate(b.end)}${icon('arrow')}</button><button class="button" id="exportButton">${icon('download')}Export</button></div>`;
  }
  function daily(ss, days = 7, anchor = bounds().end) {
    return Array.from({ length: days }, (_, i) => {
      const t = anchor - (days - 1 - i) * DAY,
        key = dateKey(t),
        items = ss.filter((s) => dateKey(s.start) === key);
      return {
        t,
        key,
        visits: items.length,
        visitors: new Set(items.map((s) => s.person)).size,
        active: items.reduce((n, s) => n + s.activeSeconds, 0),
        sessions: items,
      };
    });
  }
  function activityChart(ss) {
    const b = bounds(),
      count = Math.max(1, Math.round((Date.parse(dateKey(b.end)) - Date.parse(dateKey(b.start))) / DAY) + 1),
      a = daily(ss, Math.min(count, 366)),
      max = Math.max(...a.map((d) => d.active / 60), 1),
      w = 620,
      h = 172,
      pad = 25,
      step = (w - 2 * pad) / Math.max(a.length - 1, 1);
    const coords = a.map((d, i) => [pad + i * step, 135 - (d.active / 60 / max) * 110]);
    return `<svg class="activity-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Daily active minutes"><defs><linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${palette.Contracts}" stop-opacity=".16"/><stop offset="1" stop-color="${palette.Contracts}" stop-opacity="0"/></linearGradient></defs>${[0, 1, 2].map((i) => `<line class="chart-grid" x1="${pad}" x2="${w - pad}" y1="${25 + i * 55}" y2="${25 + i * 55}"/><text class="chart-label" x="${pad}" y="${19 + i * 55}">${Math.round(max * (1 - i / 2))}m</text>`).join('')}<path d="M${coords.map((c) => c.join(',')).join(' L')} L${w - pad},135 L${pad},135Z" fill="url(#activityFill)"/><polyline points="${coords.map((c) => c.join(',')).join(' ')}" stroke="${palette.Contracts}" stroke-width="2" fill="none"/>${a.map((d, i) => `<circle class="chart-point" cx="${coords[i][0]}" cy="${coords[i][1]}" r="3.5" tabindex="0" data-tip="${fmtDate(d.t)} · ${duration(d.active)} active · ${d.visitors} visitors · ${d.visits} visits"/><text class="chart-label" x="${coords[i][0]}" y="160" text-anchor="middle">${i % Math.max(1, Math.ceil(a.length / 7)) === 0 ? fmtDate(d.t) : ''}</text>`).join('')}</svg>`;
  }
  function metrics(ss) {
    const a = daily(ss, 7),
      today = daily(
        D.sessions.filter((s) => state.course === 'all' || s.course === state.course),
        1,
        D.now,
      )[0],
      visitors = new Set(ss.map((s) => s.person)).size,
      active = ss.reduce((n, s) => n + s.activeSeconds, 0),
      live = D.live.filter((l) => state.course === 'all' || l.course === state.course),
      values = [
        {
          name: 'Visitors today',
          value: today.visitors,
          sub: `${today.visits} visits today`,
          vals: a.map((d) => d.visitors),
          color: palette.Contracts,
        },
        {
          name: 'Visitors in range',
          value: visitors,
          sub: `${ss.length} visits in selected dates`,
          vals: a.map((d) => d.visits),
          color: palette['Civil Procedure'],
        },
        {
          name: 'Active now',
          value: live.length,
          sub: 'Visible and recently active',
          vals: [1, 2, 2, 1, 3, 2, live.length],
          color: palette['Legislation and the Regulatory State'],
        },
        {
          name: 'Active time',
          value: duration(active),
          sub: 'Hidden and idle time excluded',
          vals: a.map((d) => d.active),
          color: palette.Contracts,
        },
      ];
    return `<div class="metrics">${values.map((v) => `<div class="metric"><div class="metric-label">${v.name}${icon('info')}</div><div class="metric-value">${v.value}</div><div class="metric-bottom">${v.sub}</div>${spark(v.vals, v.color)}</div>`).join('')}</div>`;
  }
  function liveCards() {
    return (
      D.live
        .filter((l) => state.course === 'all' || l.course === state.course)
        .map((l) => {
          const p = D.people.find((p) => p.id === l.person);
          return `<a class="live-card" href="#visitor=${p.id}"><div class="person-row">${avatar(p)}<div><div class="person-name">${esc(label(p))}</div><div class="person-handle">${p.devices} device${p.devices > 1 ? 's' : ''} · Anchorage</div></div></div><div class="live-entry">${esc(l.title)}</div>${courseTag(l.course)}<div class="live-foot"><span><i class="status-dot"></i>Reading now</span><span class="live-duration" data-since="${l.since}">${duration((D.now - l.since) / 1000)}</span></div></a>`;
        })
        .join('') || '<p class="empty">No sample visitor matches this course.</p>'
    );
  }
  function contentStats(ss) {
    const map = new Map();
    for (const e of events(ss).filter((e) => e.kind === 'entry')) {
      const o = map.get(e.entity) || {
        id: e.entity,
        title: e.title,
        course: e.course,
        opens: 0,
        active: 0,
        days: Array(7).fill(0),
      };
      o.opens++;
      o.active += e.activeSeconds;
      const di = 6 - Math.floor((bounds().end - e.at) / DAY);
      if (di >= 0 && di < 7) o.days[di]++;
      map.set(e.entity, o);
    }
    return [...map.values()];
  }
  function contentRows(ss) {
    let rows = contentStats(ss).filter((r) => r.title.toLowerCase().includes(state.search.toLowerCase()));
    rows.sort((a, b) => {
      const av =
          state.sort === 'title' ? a.title : state.sort === 'course' ? a.course : a[state.sort] || a.opens,
        bv = state.sort === 'title' ? b.title : state.sort === 'course' ? b.course : b[state.sort] || b.opens;
      return (typeof av === 'string' ? av.localeCompare(bv) : av - bv) * (state.asc ? 1 : -1);
    });
    return (
      rows
        .slice(0, 7)
        .map(
          (r) =>
            `<tr><td><div class="entry-name" title="${esc(r.title)}">${esc(r.title)}</div></td>${state.columns.has('course') ? `<td class="table-course" style="--course:${palette[r.course]}">${short[r.course]}</td>` : ''}${state.columns.has('opens') ? `<td class="num">${r.opens}</td>` : ''}${state.columns.has('active') ? `<td class="num">${duration(r.active)}</td>` : ''}${state.columns.has('trend') ? `<td class="num">${spark(r.days, palette[r.course], 'tiny-spark')}</td>` : ''}</tr>`,
        )
        .join('') || `<tr><td colspan="5" class="empty">No entries match these filters.</td></tr>`
    );
  }
  function contentTable(ss) {
    return `<div class="table-tools"><input id="entrySearch" class="search-field" type="search" placeholder="Find an entry…" aria-label="Search entries" value="${esc(state.search)}"><button class="button small" id="columnsButton">${icon('columns')}Columns</button></div><div class="table-wrap"><table><thead><tr><th><button data-sort="title">Entry ↕</button></th>${state.columns.has('course') ? '<th><button data-sort="course">Course ↕</button></th>' : ''}${state.columns.has('opens') ? '<th class="num"><button data-sort="opens">Opens ↕</button></th>' : ''}${state.columns.has('active') ? '<th class="num"><button data-sort="active">Active ↕</button></th>' : ''}${state.columns.has('trend') ? '<th class="num">Trend</th>' : ''}</tr></thead><tbody id="entryRows">${contentRows(ss)}</tbody></table></div>`;
  }
  function searches(ss) {
    const m = new Map();
    for (const e of events(ss).filter((e) => e.kind === 'search')) {
      const r = m.get(e.query) || { query: e.query, count: 0, failed: 0, days: Array(7).fill(0) };
      r.count++;
      if (!e.results) r.failed++;
      const i = 6 - Math.floor((D.now - e.at) / DAY);
      if (i >= 0 && i < 7) r.days[i]++;
      m.set(e.query, r);
    }
    const rows = [...m.values()].sort((a, b) => b.count - a.count).slice(0, 5),
      max = Math.max(...rows.map((r) => r.count), 1);
    return `<div class="queries">${rows.map((r) => `<div class="query-row"><span>${esc(r.query)}${r.failed ? `<span class="query-warning" data-tip="${r.failed} searches returned no results">${r.failed} gaps</span>` : ''}</span><span class="muted">${r.count}</span><div class="bar-track"><div class="bar-fill" style="width:${(r.count / max) * 100}%"></div></div></div>`).join('') || '<p class="empty">No searches in this range.</p>'}</div>${spark(
      rows.flatMap((r) => r.days),
      palette['Civil Procedure'],
    )}`;
  }
  function sentence(e, p) {
    const name = `<strong>${esc(label(p))}</strong>`,
      title = `<strong>${esc(e.title.replace(/ \(\d{4}\)/, ''))}</strong>`;
    return e.kind === 'search'
      ? `${name} searched for “${esc(e.query)}”${!e.results ? ' and found no results' : ''}.`
      : e.kind === 'drill'
        ? `${name} practiced ${title} in Drill.`
        : e.kind === 'rating'
          ? `${name} rated ${title} ${['', 'Blank', 'Patchy', 'Clean'][e.rating]}.`
          : e.kind === 'source'
            ? `${name} opened a source at page ${e.page}.`
            : e.kind === 'coldcall'
              ? `${name} read the Cold Call for ${title}.`
              : e.kind === 'copy'
                ? `${name} copied ${e.copyLength} characters from ${title}.`
                : `${name} opened ${title}.`;
  }
  function feed(ss) {
    return (
      events(ss)
        .reverse()
        .slice(0, 6)
        .map((e) => {
          const p = D.people.find((p) => p.id === e.person);
          return `<a class="feed-item" href="#visitor=${p.id}"><span class="feed-icon" style="--course:${palette[e.course]}">${icon(e.kind)}</span><div class="feed-text">${sentence(e, p)}<span class="feed-time">${relative(e.at)} · ${short[e.course]} · Full collection</span></div></a>`;
        })
        .join('') || '<p class="empty">No activity in this range.</p>'
    );
  }
  function mapSvg(ss, mode = 'heat', selectedId = null) {
    const regions = C.regions.filter((r) => state.course === 'all' || r.course === state.course);
    if (!regions.length) return '';
    const minX = Math.min(...regions.map((r) => r.x)) - 1600,
      minY = Math.min(...regions.map((r) => r.y)) - 1200,
      maxX = Math.max(...regions.map((r) => r.x + r.w)) + 1600,
      maxY = Math.max(...regions.map((r) => r.y + r.h)) + 1500;
    const counts = new Map();
    events(ss)
      .filter((e) => e.kind === 'entry' || e.kind === 'coldcall')
      .forEach((e) => {
        const h = C.homes[e.entity];
        if (h) counts.set(h.region, (counts.get(h.region) || 0) + e.activeSeconds);
      });
    const max = Math.max(...counts.values(), 1);
    const es = mode === 'replay' ? events(ss).filter((e) => C.homes[e.entity]) : [],
      points = es.slice(0, state.replayIndex + 1).map((e) => {
        const h = C.homes[e.entity];
        return [h.x + h.w / 2, h.y + h.h / 2];
      }),
      home = selectedId ? C.homes[selectedId] : null;
    return `<svg class="map" id="${mode === 'replay' ? 'replayMap' : 'heatMap'}" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" role="img" aria-label="DKLA actual ${mode === 'heat' ? 'attention heat map' : 'session path map'}">${regions.map((r) => `<rect class="map-region${home?.region === r.id ? ' active' : ''}" style="--course:${palette[r.course]};fill-opacity:${mode === 'heat' ? 0.09 + ((counts.get(r.id) || 0) / max) * 0.7 : 0.12}" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="110" data-tip="${esc(r.title)} · ${duration(counts.get(r.id) || 0)} active attention"/>`).join('')}${Object.entries(
      C.homes,
    )
      .filter(([, h]) => regions.some((r) => r.id === h.region))
      .map(
        ([id, h]) =>
          `<rect class="map-home" style="--course:${palette[nodes.get(id)?.course]}" x="${h.x}" y="${h.y}" width="${h.w}" height="${h.h}" rx="25"/>`,
      )
      .join(
        '',
      )}${points.length > 1 ? `<polyline class="map-route" points="${points.map((p) => p.join(',')).join(' ')}"/>` : ''}${home ? `<circle class="map-marker" cx="${home.x + home.w / 2}" cy="${home.y + home.h / 2}" r="250"/>` : ''}</svg>`;
  }
  function overview() {
    const ss = filtered(),
      live = D.live.filter((l) => state.course === 'all' || l.course === state.course);
    return `<div class="page-heading"><div><div class="eyebrow">DANNY KIND LEGAL ATLAS</div><h1>Overview</h1><p class="page-subtitle">Where people spend their time, and what brings them back.</p></div>${rangeControls()}</div>${metrics(ss)}<div class="grid two mb"><section class="panel"><div class="panel-heading"><div><h2>Activity over time</h2><p>Active minutes · Eastern time</p></div><span class="panel-header-control">${ss.length} visits</span></div><div class="panel-body">${activityChart(ss)}<div class="legend"><span><i style="background:var(--orange)"></i>Active time</span><span>${D.anonymous.reduce((a, v) => a + v.visits, 0)} anonymous sample visits this week, counted separately</span></div></div></section><section class="panel"><div class="panel-heading"><div><h2>On the atlas now</h2><p>Current foreground activity</p></div><span class="count-pill"><i class="status-dot"></i>${live.length} active</span></div><div class="live-grid">${liveCards()}</div></section></div><div class="grid two mb"><section class="panel"><div class="panel-heading"><div><h2>Entries getting attention</h2><p>Opens and active reading time</p></div></div>${contentTable(ss)}</section><section class="panel"><div class="panel-heading"><div><h2>What people search for</h2><p>Queries that point to questions and content gaps</p></div></div><div class="panel-body">${searches(ss)}</div></section></div><div class="grid two"><section class="panel"><div class="panel-heading"><div><h2>Attention across the atlas</h2><p>The actual atlas layout · filtered by date and course</p></div><select class="select" id="heatPerson" aria-label="Heat map visitor"><option value="all">All visitors</option>${D.people.map((p) => `<option value="${p.id}"${state.heatPerson === p.id ? ' selected' : ''}>${esc(label(p))}</option>`).join('')}</select></div><div class="panel-body">${mapSvg(ss.filter((s) => state.heatPerson === 'all' || s.person === state.heatPerson))}<div class="map-bottom"><span>Hover a subject for reading time</span><span class="heat-scale">Less ${[0.15, 0.3, 0.5, 0.7, 1].map((o) => `<i style="opacity:${o}"></i>`).join('')} More</span></div></div></section><section class="panel"><div class="panel-heading"><div><h2>Recent activity</h2><p>Each visit, in atlas terms</p></div><span class="panel-header-control last-sync">Updated just now</span></div><div class="feed">${feed(ss)}</div></section><section class="panel wide"><div class="panel-heading"><div><h2>History capacity</h2><p>Keep detail, with room to grow</p></div><span class="panel-header-control">Sample projection</span></div><div class="storage"><div class="storage-values"><span><strong>184 MB</strong> of 1 GB used</span><span class="muted">About 36 months remaining at current growth</span></div><div class="bar-track"><div class="bar-fill" style="width:18.4%;background:var(--green)"></div></div><small>22.4 MB / month · Upgrade preferred; oldest detail can be compacted into session summaries when capacity is exhausted.</small></div></section></div>`;
  }
  function heatGrid(p) {
    const ss = D.sessions.filter((s) => s.person === p.id),
      days = 112,
      cells = Array.from({ length: days }, (_, i) => {
        const t = D.now - (days - 1 - i) * DAY,
          key = dateKey(t),
          items = ss.filter((s) => dateKey(s.start) === key),
          active = items.reduce((a, s) => a + s.activeSeconds, 0),
          opacity = active ? Math.min(0.9, 0.25 + active / 6000) : 0;
        return `<button class="heat-cell" style="${active ? `background:rgba(158,197,167,${opacity})` : ''}" data-day="${key}" data-tip="${fmtDate(t)} · ${duration(active)} active · ${items.length} visits" aria-label="Filter to ${fmtDate(t)}, ${items.length} visits"></button>`;
      }).join('');
    return `<div class="heat-grid-wrap"><div class="heat-months"><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span></div><div class="heat-grid">${cells}</div></div><div class="heat-meta"><span>Click a day to filter sessions</span><span>Less ▪ ▪ ▪ ▪ More</span></div>`;
  }
  function courseBreakdown(ss) {
    const totals = D.courses.map((c) => ({
        c,
        t: ss.filter((s) => s.course === c).reduce((a, s) => a + s.activeSeconds, 0),
      })),
      max = Math.max(...totals.map((t) => t.t), 1),
      total = totals.reduce((a, t) => a + t.t, 0);
    return totals
      .map(
        ({ c, t }) =>
          `<div class="course-time-row" style="--course:${palette[c]}"><div class="course-time-label"><span>${short[c]}</span><span>${duration(t)} · ${Math.round((t / (total || 1)) * 100)}%</span></div><div class="bar-track"><div class="bar-fill" style="width:${(t / max) * 100}%"></div></div></div>`,
      )
      .join('');
  }
  function eventDetail(e) {
    const title =
        e.kind === 'search'
          ? `Search: “${e.query}”`
          : e.kind === 'source'
            ? `${e.title} · Source page ${e.page}`
            : e.title,
      details =
        e.kind === 'search'
          ? `${e.results} results shown${e.results ? ' · selected matching entry' : ' · no results'}`
          : e.kind === 'rating'
            ? `Rating: ${['', 'Blank', 'Patchy', 'Clean'][e.rating]}`
            : e.kind === 'copy'
              ? `${e.copyLength} characters copied · ${e.section} · copied text not recorded`
              : e.kind === 'entry' || e.kind === 'coldcall'
                ? `${duration(e.activeSeconds)} active · ${e.scrollDepth || 63}% scroll depth`
                : `${duration(e.activeSeconds)} active · ${short[e.course]}`;
    return `<div class="event-detail" style="--course:${palette[e.course]}">${icon(e.kind)}<div><h3>${esc(title)}</h3><p>${esc(details)}</p><small>${fmtTime(e.at)} · ${esc(e.id)} · Full collection</small></div></div>`;
  }
  function sessionSummary(s) {
    const opens = s.events.filter((e) => e.kind === 'entry').length,
      drills = s.events.filter((e) => e.kind === 'drill').length,
      search = s.events.find((e) => e.kind === 'search');
    return `Spent ${duration(s.activeSeconds)} active in ${short[s.course]}, opened ${opens} entries${drills ? ` and practiced ${drills} in Drill` : ''}${search ? `. Searched for “${esc(search.query)}”` : ''}.`;
  }
  function sessionList(ss) {
    return (
      ss
        .slice()
        .sort((a, b) => b.start - a.start)
        .slice(0, 8)
        .map(
          (s) =>
            `<article class="session" data-session="${s.id}"><div class="session-heading"><div>${fmtDate(s.start)} <span>· ${fmtTime(s.start)}</span>${s.live ? ' <span class="trend">On site now</span>' : ''}</div><span>${duration(s.activeSeconds)} active · ${duration((s.end - s.start) / 1000)} elapsed</span></div><p class="session-summary">${sessionSummary(s)}</p><div class="track">${s.events.map((e, i) => `${i ? '<i class="track-line"></i>' : ''}<button class="track-mark" style="--course:${palette[e.course]}" data-event="${e.id}" aria-label="${esc(e.kind + ': ' + (e.query || e.title))}" data-tip="${esc(e.kind + ': ' + (e.query || e.title))}">${icon(e.kind)}</button>`).join('')}</div><div class="session-action"><button class="button small ghost" data-replay="${s.id}">${icon('play')}Replay path</button><button class="button small ghost" data-export-session="${s.id}">${icon('download')}Export</button><span class="muted" style="font-size:9px;align-self:center">${esc(s.device)} · Full</span></div><div class="detail-slot"></div></article>`,
        )
        .join('') || '<p class="empty">No sessions match this range. Choose another date or course.</p>'
    );
  }
  function suggestion() {
    if (state.merge === 'rejected')
      return `<div class="suggestion"><div class="suggestion-label">SUGGESTION DISMISSED</div><p>Cedar Heron remains a separate sample profile.</p><button class="button small ghost" id="undoMerge">Undo decision</button></div>`;
    if (state.merge === 'confirmed')
      return `<div class="suggestion"><div class="suggestion-label">MANUAL LINK CONFIRMED · SAMPLE</div><h3>Cedar Heron → Amber Finch</h3><p>This demonstrates a reversible owner decision. Production history will retain original devices and merge evidence.</p><button class="button small ghost" id="undoMerge">Reverse merge</button></div>`;
    return `<div class="suggestion"><span class="score">62<span style="font-size:10px"> / 100</span></span><div class="suggestion-label">POSSIBLE SAME PERSON</div><h3>Cedar Heron</h3><p>Similar activity and device context. A suggestion, not a verified identity.</p><div class="evidence"><span>Same network and city</span><span>+8</span><span>Browser, OS and viewport</span><span>+18</span><span>Time zone and language</span><span>+6</span><span>Entries and study hours overlap</span><span>+30</span></div><div class="controls"><button class="button small" id="confirmMerge">Review link</button><button class="button small ghost" id="rejectMerge">Keep separate</button></div></div>`;
  }
  function replayPanel(ss) {
    let s =
      ss.find((s) => s.id === state.replaySession) ||
      ss
        .slice()
        .sort((a, b) => b.start - a.start)
        .find((s) => s.events.length > 3) ||
      ss[0];
    if (!s) return '<p class="empty">Choose a session to replay.</p>';
    state.replaySession = s.id;
    const es = s.events.filter((e) => C.homes[e.entity]);
    state.replayIndex = Math.min(state.replayIndex, es.length - 1);
    const e = es[state.replayIndex];
    return `<div class="panel-heading"><div><h2>Session path</h2><p>${fmtDate(s.start)} · ${fmtTime(s.start)} · map and semantic events</p></div><span>${icon('map')}</span></div><div class="panel-body"><div id="replayMapSlot">${mapSvg([s], 'replay', e?.entity)}</div><div class="replay-controls"><button class="button small" id="replayPlay" aria-label="Play session replay">${icon(state.replayPlaying ? 'pause' : 'play')}</button><input id="replayScrubber" type="range" min="0" max="${Math.max(0, es.length - 1)}" value="${state.replayIndex}" aria-label="Session replay position"><span class="replay-time" id="replayTime">${clock(e?.offset || 0)} / ${clock(es.at(-1)?.offset || 0)}</span><select class="select" id="replaySpeed" aria-label="Replay speed">${[0.5, 1, 2, 4].map((v) => `<option value="${v}"${state.speed === v ? ' selected' : ''}>${v}×</option>`).join('')}</select></div><div class="replay-status" id="replayStatus"><strong>${esc(e?.title || '')}</strong><br>${e?.kind === 'search' ? `Searched for “${esc(e.query)}”` : esc(e?.kind || '')} · ${short[s.course]}</div><div class="map-bottom"><span>Real atlas coordinates</span><span>No screen or DOM recording</span></div></div>`;
  }
  function visitor() {
    const p = currentPerson(),
      ss = filtered(p.id),
      all = D.sessions.filter((s) => s.person === p.id),
      active = ss.reduce((a, s) => a + s.activeSeconds, 0),
      total = new Set(
        events(ss)
          .filter((e) => e.kind === 'entry')
          .map((e) => e.entity),
      ).size;
    return `<a class="back-link" href="#overview">${icon('back')}All activity</a><div class="page-heading"><div><div class="eyebrow">VISITOR PROFILE</div><h1>Follow the study trail</h1></div>${rangeControls()}</div><section class="panel visitor-overview"><div class="visitor-topline"><div class="visitor-header">${avatar(p, true)}<div><div class="visitor-title-row"><h1>${esc(label(p))}</h1><span class="tier-pill">Full collection</span></div><div class="visitor-meta"><span>${esc(p.handle)}</span><span>·</span><span>First seen ${fmtDate(p.firstSeen)}</span><span>·</span><span>Anchorage, Alaska</span></div><div class="visitor-id mono">${p.id} · stable sample handle</div></div></div><div class="visitor-header-actions"><button class="button small" id="labelButton">${icon('edit')}Edit label</button><button class="button small${state.watch.has(p.id) ? ' primary' : ''}" id="watchButton">${icon('watch')}${state.watch.has(p.id) ? 'Watching' : 'Watch returns'}</button></div></div><div class="visitor-stats"><div class="visitor-stat"><strong>${ss.length}</strong><span>Visits in range · ${all.length} all time</span></div><div class="visitor-stat"><strong>${duration(active)}</strong><span>Active time in range</span></div><div class="visitor-stat"><strong>${total}</strong><span>Different entries opened</span></div><div class="visitor-stat"><strong>${p.devices}</strong><span>Devices · ${p.networks.length} networks</span></div></div></section><div class="grid two mb"><section class="panel"><div class="panel-heading"><div><h2>A rhythm of returning</h2><p>Activity by day · last 16 weeks</p></div>${state.heatDay ? '<button class="button small ghost" id="clearDay">Clear day filter</button>' : ''}</div><div class="panel-body">${heatGrid(p)}</div></section><section class="panel"><div class="panel-heading"><div><h2>Time by course</h2><p>Active time in the selected range</p></div></div><div class="panel-body">${courseBreakdown(ss)}</div></section></div><div class="grid two"><section class="panel"><div class="panel-heading"><div><h2>Sessions, in sequence</h2><p>${state.heatDay ? 'Filtered to ' + state.heatDay : 'A visual track across devices'}</p></div><span class="panel-header-control">${ss.length} visits</span></div><div class="session-legend">${['entry', 'search', 'drill', 'source', 'coldcall', 'copy'].map((k) => `<span>${icon(k)}${k === 'coldcall' ? 'Cold Call' : k[0].toUpperCase() + k.slice(1)}</span>`).join('')}</div><div class="session-list">${sessionList(ss)}</div></section><div class="grid" style="align-content:start"><section class="panel" id="replayPanel">${replayPanel(ss)}</section><section class="panel"><div class="panel-heading"><div><h2>Devices & identity</h2><p>Verified links and evidence kept separate</p></div></div><div class="panel-body"><div class="device-list"><div class="device"><h3>${icon('device')}MacBook · Safari 18</h3><small>macOS 15 · 1440 × 900 · 2×</small><small>en-US · America/Anchorage</small><span class="tier-pill">Stored device</span></div>${p.devices > 1 ? `<div class="device"><h3>${icon('phone')}iPhone · Safari 18</h3><small>iOS 18 · 390 × 844 · 3×</small><small>Linked ${fmtDate(D.now - 12 * DAY)}</small><span class="tier-pill">Verified sync link</span></div>` : ''}</div><div class="network-chips">${p.networks.map((n) => `<span class="network-chip"><b>${esc(n.name)}</b><br>AS${n.asn} · ${n.city} ${n.postal}<br><span class="mono">${n.ip}</span></span>`).join('')}</div>${p.id === 'demo-01' ? suggestion() : '<div class="notice-line">No pending identity suggestions for this sample profile.</div>'}</div></section></div></div>`;
  }
  function hydrateIcons() {
    document.querySelectorAll('[data-icon]').forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
  }
  function render() {
    clearInterval(replayTimer);
    state.replayPlaying = false;
    document.getElementById('main').innerHTML = route() === 'overview' ? overview() : visitor();
    document.getElementById('breadcrumb').textContent =
      route() === 'overview' ? 'Overview' : currentPerson().handle;
    document
      .querySelectorAll('[data-nav]')
      .forEach((el) => el.classList.toggle('active', el.dataset.nav === route()));
    hydrateIcons();
    document.title = `DKLA · ${route() === 'overview' ? 'Overview' : label(currentPerson())} · Sample preview`;
  }
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3800);
  }
  function modal(title, body) {
    document.getElementById('dialogTitle').textContent = title;
    document.getElementById('dialogBody').innerHTML = body;
    hydrateIcons();
    document.getElementById('dialog').showModal();
  }
  function closeModal() {
    document.getElementById('dialog').close();
  }
  function exportData(kind, ss = filtered(route() === 'visitor' ? currentPerson().id : null)) {
    const rows = events(ss),
      meta = {
        sampleData: true,
        exportedFrom: 'DKLA design preview',
        range: bounds(),
        course: state.course,
        visitor: route() === 'visitor' ? currentPerson() : null,
        sessions: ss,
      };
    const csvCell = (v) => {
      let s = String(v ?? '');
      if (/^[=+@\-]/.test(s)) s = "'" + s;
      return '"' + s.replaceAll('"', '""') + '"';
    };
    const data =
      kind === 'json'
        ? JSON.stringify(meta, null, 2)
        : [
            [
              'event_id',
              'visitor',
              'session',
              'timestamp',
              'kind',
              'course',
              'entity',
              'title',
              'query',
              'active_seconds',
              'tier',
            ],
            ...rows.map((e) => [
              e.id,
              e.person,
              e.session,
              new Date(e.at).toISOString(),
              e.kind,
              e.course,
              e.entity,
              e.title,
              e.query,
              e.activeSeconds,
              'full',
            ]),
          ]
            .map((r) => r.map(csvCell).join(','))
            .join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([data], { type: kind === 'json' ? 'application/json' : 'text/csv;charset=utf-8' }),
    );
    a.download = `dkla-sample-${route()}-${kind === 'json' ? 'history.json' : 'events.csv'}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    closeModal();
    toast('Sample export downloaded.');
  }
  function updateReplay() {
    const s = D.sessions.find((s) => s.id === state.replaySession),
      es = s?.events.filter((e) => C.homes[e.entity]) || [],
      e = es[state.replayIndex];
    if (!s || !e) return;
    document.getElementById('replayMapSlot').innerHTML = mapSvg([s], 'replay', e.entity);
    document.getElementById('replayScrubber').value = state.replayIndex;
    document.getElementById('replayTime').textContent = `${clock(e.offset)} / ${clock(es.at(-1).offset)}`;
    document.getElementById('replayStatus').innerHTML =
      `<strong>${esc(e.title)}</strong><br>${e.kind === 'search' ? `Searched for “${esc(e.query)}”` : esc(e.kind)} · ${short[s.course]}`;
    document.getElementById('replayPlay').innerHTML = icon(state.replayPlaying ? 'pause' : 'play');
    document
      .getElementById('replayPlay')
      .setAttribute('aria-label', state.replayPlaying ? 'Pause session replay' : 'Play session replay');
  }
  function toggleReplay() {
    const s = D.sessions.find((s) => s.id === state.replaySession),
      es = s.events.filter((e) => C.homes[e.entity]);
    state.replayPlaying = !state.replayPlaying;
    clearInterval(replayTimer);
    if (state.replayPlaying) {
      if (state.replayIndex >= es.length - 1) state.replayIndex = 0;
      replayTimer = setInterval(() => {
        state.replayIndex++;
        if (state.replayIndex >= es.length - 1) {
          state.replayPlaying = false;
          clearInterval(replayTimer);
        }
        updateReplay();
      }, 1200 / state.speed);
    }
    updateReplay();
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.id === 'dateButton') {
      const b = bounds();
      modal(
        'Choose a date range',
        `<div class="controls">${[1, 7, 30, 90].map((n) => `<button type="button" class="button" data-range="${n}">${n === 1 ? 'Today' : 'Last ' + n + ' days'}</button>`).join('')}</div><div class="range-fields"><label>From<input type="date" id="rangeStart" value="${dateKey(b.start)}"></label><label>To<input type="date" id="rangeEnd" value="${dateKey(b.end)}"></label></div><p>Sample activity ends October 11, 2026. Dates and charts use Eastern time.</p><div class="controls"><button type="button" class="button primary" id="applyRange">Apply dates</button></div>`,
      );
    } else if (t.dataset.range) {
      state.days = Number(t.dataset.range);
      state.start = state.end = state.heatDay = null;
      closeModal();
      render();
    } else if (t.id === 'applyRange') {
      const a = document.getElementById('rangeStart').value,
        b = document.getElementById('rangeEnd').value;
      if (!a || !b || a > b) {
        toast('Choose a valid date range.');
        return;
      }
      state.start = a;
      state.end = b;
      state.heatDay = null;
      closeModal();
      render();
    } else if (t.id === 'exportButton' || t.dataset.exportSession) {
      const id = t.dataset.exportSession || '';
      modal(
        'Export sample history',
        `<p>Download ${id ? 'this session' : route() === 'visitor' ? 'this visitor’s sessions' : 'the filtered report'} as structured JSON or an event CSV. These files contain fictional sample data.</p><div class="controls"><button type="button" class="button" data-export="csv" data-session-id="${id}">CSV events</button><button type="button" class="button primary" data-export="json" data-session-id="${id}">JSON history</button></div>`,
      );
    } else if (t.dataset.export)
      exportData(
        t.dataset.export,
        t.dataset.sessionId ? D.sessions.filter((s) => s.id === t.dataset.sessionId) : undefined,
      );
    else if (t.dataset.sort) {
      if (state.sort === t.dataset.sort) state.asc = !state.asc;
      else {
        state.sort = t.dataset.sort;
        state.asc = state.sort === 'title' || state.sort === 'course';
      }
      document.getElementById('entryRows').innerHTML = contentRows(filtered());
    } else if (t.id === 'columnsButton')
      modal(
        'Choose table columns',
        `<p>The entry name is always shown.</p>${['course', 'opens', 'active', 'trend'].map((c) => `<label><input type="checkbox" data-column="${c}"${state.columns.has(c) ? ' checked' : ''}>${c[0].toUpperCase() + c.slice(1)}</label>`).join('')}<div class="controls"><button type="button" class="button primary" id="applyColumns">Done</button></div>`,
      );
    else if (t.id === 'applyColumns') {
      document
        .querySelectorAll('[data-column]')
        .forEach((c) =>
          c.checked ? state.columns.add(c.dataset.column) : state.columns.delete(c.dataset.column),
        );
      closeModal();
      render();
    } else if (t.id === 'labelButton') {
      const p = currentPerson();
      modal(
        'Private visitor label',
        `<p>The stable handle remains ${esc(p.handle)}. Your label is visible only in this dashboard.</p><label>Label<input id="labelInput" maxlength="80" value="${esc(p.label)}" placeholder="Add a name or a memorable note"></label><div class="controls"><button type="button" class="button primary" id="saveLabel">Save sample label</button></div>`,
      );
    } else if (t.id === 'saveLabel') {
      currentPerson().label = document.getElementById('labelInput').value.trim();
      closeModal();
      render();
      toast('Sample label updated for this preview session.');
    } else if (t.id === 'watchButton') {
      const p = currentPerson();
      state.watch.has(p.id) ? state.watch.delete(p.id) : state.watch.add(p.id);
      render();
      toast(
        state.watch.has(p.id)
          ? 'Sample return watch enabled. No email will be sent.'
          : 'Sample return watch removed.',
      );
    } else if (t.dataset.day) {
      state.heatDay = t.dataset.day;
      state.days = 120;
      state.start = state.end = null;
      state.replaySession = null;
      state.replayIndex = 0;
      render();
      document.querySelector('.session-list').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (t.id === 'clearDay') {
      state.heatDay = null;
      state.days = 7;
      render();
    } else if (t.dataset.event) {
      const s = t.closest('.session'),
        slot = s.querySelector('.detail-slot'),
        ev = events(D.sessions).find((ev) => ev.id === t.dataset.event);
      s.querySelectorAll('.track-mark').forEach((b) => b.classList.toggle('selected', b === t));
      slot.innerHTML = eventDetail(ev);
    } else if (t.dataset.replay) {
      clearInterval(replayTimer);
      state.replayPlaying = false;
      state.replaySession = t.dataset.replay;
      state.replayIndex = 0;
      document.getElementById('replayPanel').innerHTML = replayPanel(filtered(currentPerson().id));
      document.getElementById('replayPanel').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (t.id === 'replayPlay') toggleReplay();
    else if (t.id === 'confirmMerge')
      modal(
        'Review a possible identity link',
        `<p><strong>62 / 100 is a similarity score, not a probability.</strong> These two sample profiles share network/device context and study patterns. Campus networks and common coursework make false matches possible.</p><div class="notice-line">A confirmed production merge keeps the original devices and can be reversed.</div><div class="controls"><button type="button" class="button" id="rejectMerge">Keep separate</button><button type="button" class="button primary" id="saveMerge">Confirm sample link</button></div>`,
      );
    else if (t.id === 'saveMerge' || t.id === 'rejectMerge' || t.id === 'undoMerge') {
      state.merge = t.id === 'saveMerge' ? 'confirmed' : t.id === 'rejectMerge' ? 'rejected' : 'pending';
      closeModal();
      render();
      toast(
        state.merge === 'confirmed'
          ? 'Sample manual link confirmed.'
          : state.merge === 'rejected'
            ? 'Profiles kept separate.'
            : 'Sample decision reversed.',
      );
    } else if (t.id === 'helpButton')
      modal(
        'About this screen review',
        `<p>This is a working design preview of two DKLA Analytics screens. All people, IP addresses, networks and usage are fictional. The map uses DKLA’s actual canonical coordinates.</p><p style="margin-top:12px">Try date/course filters, chart hover detail, table search/sorting/columns, visitor labels, the activity calendar, expandable timeline marks, path replay, identity suggestions and CSV/JSON exports.</p><div class="notice-line">No tracker, database, login or real visitor collection is connected. Review the design before the remaining system is built.</div>`,
      );
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'heatPerson') {
      state.heatPerson = e.target.value;
      render();
    } else if (e.target.id === 'courseFilter') {
      state.course = e.target.value;
      state.replayIndex = 0;
      state.replaySession = null;
      render();
    } else if (e.target.id === 'replaySpeed') {
      state.speed = Number(e.target.value);
      if (state.replayPlaying) {
        state.replayPlaying = false;
        toggleReplay();
      }
    }
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'entrySearch') {
      state.search = e.target.value;
      document.getElementById('entryRows').innerHTML = contentRows(filtered());
    } else if (e.target.id === 'replayScrubber') {
      clearInterval(replayTimer);
      state.replayPlaying = false;
      state.replayIndex = Number(e.target.value);
      updateReplay();
    }
  });
  const tooltip = document.getElementById('tooltip');
  function showTip(e) {
    const t = e.target.closest('[data-tip]');
    if (!t) return;
    tooltip.textContent = t.dataset.tip;
    tooltip.hidden = false;
    const r = t.getBoundingClientRect();
    tooltip.style.left = Math.max(8, Math.min(innerWidth - tooltip.offsetWidth - 8, r.left)) + 'px';
    tooltip.style.top = Math.max(8, r.top - tooltip.offsetHeight - 8) + 'px';
  }
  document.addEventListener('pointerover', showTip);
  document.addEventListener('focusin', showTip);
  document.addEventListener('pointerout', () => (tooltip.hidden = true));
  document.addEventListener('focusout', () => (tooltip.hidden = true));
  window.addEventListener('scroll', () => (tooltip.hidden = true), true);
  window.addEventListener('hashchange', () => {
    state.heatDay = null;
    state.replaySession = null;
    state.replayIndex = 0;
    render();
    window.scrollTo(0, 0);
  });
  setInterval(() => {
    state.liveTick += 8;
    document
      .querySelectorAll('.live-duration')
      .forEach(
        (el) => (el.textContent = duration((D.now - Number(el.dataset.since)) / 1000 + state.liveTick)),
      );
    document
      .querySelectorAll('.last-sync')
      .forEach((el) => (el.textContent = 'Sample feed · updated just now'));
  }, 8000);
  window.DKLA_PREVIEW = { state, filtered, contentStats, exportData };
  render();
})();
