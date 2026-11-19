/* The reader, one facet at a time (v3.2 "Instrument": docs/DESIGN.md).
 *
 * src/features/v25/reading.js marks every block of an open entry with the facet it belongs to and keeps
 * the blocks in one order. This file runs what the reader sees of that:
 *   - the facet bar under the header: the Cold Call button, then one tab per facet that has something in
 *     it, each with its count (how many timeline entries, flowchart steps, canons, notes, connections,
 *     sources). A facet with nothing behind it has no tab;
 *   - which facet is open (Brief first), the short or the full brief, and where each facet was scrolled to;
 *   - the top strip (where the entry sits, and its name once the title has scrolled away) and the close
 *     button; the citation line under a case's name; the one list of sources.
 *
 * window.DKLAReader = { facets() -> [{id, label, count}], show(id), current(), mode(), setMode(mode) }.
 * The event 'dkla:facet' on document ({detail: {entry, facet, facets, reason}}) fires when an entry opens,
 * when the facet changes and when a facet arrives or its count changes.
 *
 * Nothing here animates layout or runs while the page is at rest: a facet change fades the new blocks in
 * (opacity and transform, 200 ms; none under reduced motion), and the strip changes only when the title
 * crosses it.
 */
(() => {
  'use strict';
  if (window.DKLAReader) return;
  const inspector = document.getElementById('inspector');
  if (!inspector) return;
  const LABEL = {
    brief: 'Brief',
    timeline: 'Timeline',
    flowchart: 'Flowchart',
    canons: 'Canons',
    lecture: 'Lecture',
    court: 'Court',
    cases: 'Cases',
    connections: 'Connections',
    sources: 'Sources',
    study: 'Study',
  };
  const ORDER = Object.keys(LABEL);
  const ICON = {
    close:
      '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M5.5 5.5l9 9M14.5 5.5l-9 9"/></svg>',
    crumb:
      '<svg class="v32-sep" viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 2.5L8 6l-3.5 3.5"/></svg>',
    reading:
      '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4.2C6.6 3.2 4.6 2.9 2.5 3.2v8.6c2.1-.3 4.1 0 5.5 1 1.4-1 3.4-1.3 5.5-1V3.2C11.4 2.9 9.4 3.2 8 4.2zM8 4.2v8.6"/></svg>',
    file: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 2.5h-5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-7zM9.5 2.5v3h3M5.8 8.5h4.4M5.8 10.8h3"/></svg>',
    link: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 3.5h-2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-2M9.5 3.5h3v3M12.5 3.5l-5 5"/></svg>',
    rule: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 4.2C9.9 3.2 9 2.7 8 2.7c-1.3 0-2.3.8-2.3 1.9 0 2.3 4.6 1.7 4.6 4.1 0 .9-.6 1.6-1.5 1.9M5.7 11.8c.4 1 1.3 1.5 2.3 1.5 1.3 0 2.3-.8 2.3-1.9 0-2.3-4.6-1.7-4.6-4.1 0-.9.6-1.6 1.5-1.9"/></svg>',
  };
  const COURSE = {
    'Contracts': ['Contracts', 'var(--v31-contracts)'],
    'Civil Procedure': ['Civil Procedure', 'var(--v31-civil)'],
    'Legislation and the Regulatory State': ['LRS', 'var(--v31-lrs)'],
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const state = {
    key: null,
    facet: 'brief',
    mode: 'short',
    line: 0,
    scroll: new Map(),
    signature: '',
    tick: 0,
  };
  let wanted = null; // a facet asked for before its entry was drawn (a link such as #node=citoh&facet=timeline)

  const body = () => inspector.querySelector('.reader-body.v32');
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  function entry() {
    try {
      if (typeof selected === 'undefined' || !selected) return null;
      const node = selected.type === 'node' ? nodesById.get(selected.id) : null;
      return { key: selected.type + ':' + selected.id, id: selected.id, type: selected.type, node };
    } catch {
      return null;
    }
  }

  /* ---------- what each facet holds ---------- */
  const blocks = (host, facet) =>
    [...host.children].filter((el) => el.dataset.v32Facet === facet && !el.classList.contains('v32-fh'));
  const sum = (host, selector) =>
    [...host.querySelectorAll(selector)].reduce((n, el) => n + (Number(el.dataset.v32Count) || 0), 0);
  function count(host, facet) {
    if (facet === 'timeline')
      return sum(host, ':scope > .v28-case-timelines .dkla-timeline, :scope > .dkla-timeline');
    if (facet === 'flowchart') return sum(host, ':scope > .v31-chart-steps .v31-chart');
    if (facet === 'canons') return host.querySelectorAll(':scope > .canons-related li').length;
    if (facet === 'lecture') return host.querySelectorAll(':scope > .lecture-related .lecture-note').length;
    if (facet === 'cases') return host.querySelectorAll(':scope > .course-case-index .indexed-case').length;
    if (facet === 'connections')
      return host.querySelectorAll(':scope > .r6-connections .study-connection').length;
    if (facet === 'sources') return host.querySelectorAll(':scope > .v32-sources [data-v32-source]').length;
    if (facet === 'court') {
      // The vote, where the record gives one ("6–2").
      const tally = host.querySelector(':scope > .sh-case-panel h3')?.textContent.trim() || '';
      return /^\d+\s*[–-]\s*\d+$/.test(tally) ? tally.replace(/\s+/g, '') : '';
    }
    return '';
  }
  function has(host, facet) {
    const list = blocks(host, facet);
    if (!list.length) return false;
    if (facet === 'sources')
      return list.some((el) => el.matches('.v32-sources, details.quiet-details') && el.childElementCount);
    return true;
  }
  function model(host) {
    const isCase = host.classList.contains('v32-case');
    return ORDER.filter((facet) => has(host, facet)).map((facet) => {
      const n = count(host, facet);
      return {
        id: facet,
        label: facet === 'brief' && !isCase ? 'Overview' : LABEL[facet],
        count: n === 0 ? '' : String(n),
      };
    });
  }

  /* ---------- the facet bar ---------- */
  function drawTabs(host, list) {
    const tabs = host.querySelector(':scope > .v32-bar > .v32-tabs');
    if (!tabs) return;
    const signature = list.map((f) => f.id + ':' + f.label + ':' + f.count).join('|');
    if (tabs.dataset.v32Tabs !== signature) {
      const have = new Map([...tabs.children].map((tab) => [tab.dataset.v32Tab, tab]));
      const next = list.map((f, i) => {
        let tab = have.get(f.id);
        if (!tab) {
          tab = element('button', 'v32-tab');
          tab.type = 'button';
          tab.id = 'v32Tab-' + f.id;
          tab.dataset.v32Tab = f.id;
          tab.setAttribute('role', 'tab');
          tab.setAttribute('aria-controls', 'v32Panel');
          // A space between the two, so the tab reads "Timeline 6".
          tab.append(element('span', 'v32-tab-label'), ' ', element('span', 'v32-count'));
        }
        const [label, number] = tab.children;
        if (label.textContent !== f.label) label.textContent = f.label;
        if (number.textContent !== f.count) number.textContent = f.count;
        // 1 to 9 open a facet from anywhere in the reader.
        if (i < 9) tab.setAttribute('aria-keyshortcuts', String(i + 1));
        else tab.removeAttribute('aria-keyshortcuts');
        return tab;
      });
      if (next.length !== tabs.children.length || next.some((tab, i) => tab !== tabs.children[i]))
        tabs.replaceChildren(...next);
      tabs.dataset.v32Tabs = signature;
    }
    edges(tabs);
    for (const tab of tabs.children) {
      const on = tab.dataset.v32Tab === state.facet;
      if (tab.getAttribute('aria-selected') !== String(on)) tab.setAttribute('aria-selected', String(on));
      if (tab.tabIndex !== (on ? 0 : -1)) tab.tabIndex = on ? 0 : -1;
    }
  }
  // Where the tabs do not all fit (an entry with nine facets in a narrow reader) the row scrolls sideways,
  // and the side that holds more fades out to say so.
  function edges(tabs) {
    const more =
      (tabs.scrollLeft > 1 ? 'start ' : '') +
      (tabs.scrollLeft + tabs.clientWidth < tabs.scrollWidth - 1 ? 'end' : '');
    if ((tabs.dataset.v32More || '') !== more.trim()) {
      if (more.trim()) tabs.dataset.v32More = more.trim();
      else delete tabs.dataset.v32More;
    }
  }
  // What a screen reader is told the open tab's panel holds: the blocks of the open facet.
  function ownPanel(host) {
    const panel = host.querySelector(':scope > .v32-panel');
    if (!panel) return;
    const ids = blocks(host, state.facet).map((el, i) => (el.id ||= 'v32Block-' + state.facet + '-' + i));
    const owns = ids.join(' ');
    if (panel.getAttribute('aria-owns') !== owns) panel.setAttribute('aria-owns', owns);
    const by = 'v32Tab-' + state.facet;
    if (panel.getAttribute('aria-labelledby') !== by) panel.setAttribute('aria-labelledby', by);
  }
  function apply(host, list) {
    const single = list.length < 2;
    if (host.classList.contains('v32-single') !== single) host.classList.toggle('v32-single', single);
    if (host.dataset.v32Show !== state.facet) host.dataset.v32Show = state.facet;
    const mode = host.querySelector(':scope > .r19-brief [data-r19-fill]') ? state.mode : 'short';
    if (host.dataset.v32Mode !== mode) host.dataset.v32Mode = mode;
    for (const button of host.querySelectorAll(':scope > .v32-brief-head [data-v32-mode]')) {
      const on = String(button.dataset.v32Mode === mode);
      if (button.getAttribute('aria-pressed') !== on) button.setAttribute('aria-pressed', on);
    }
    if (mode === 'full') fillFull(host);
    drawTabs(host, list);
    ownPanel(host);
  }
  function fillFull(host) {
    const target = host.querySelector(':scope > .r19-brief [data-r19-fill]');
    if (target && !target.dataset.done && !target.dataset.briefLoading)
      window.DKLABriefLoader?.fill(target, target.dataset.r19Fill, window.DKLABriefs.render);
  }
  function announce(reason, list) {
    document.dispatchEvent(
      new CustomEvent('dkla:facet', {
        detail: { entry: state.key, facet: state.facet, facets: list.map((f) => ({ ...f })), reason },
      }),
    );
  }

  /* ---------- scrolling: the bar stays where it is when the facet changes ---------- */
  const stripHeight = () => inspector.querySelector('.reader-top')?.offsetHeight || 0;
  // How far the reader is scrolled when the facet bar meets the top strip.
  function stuckAt(host) {
    const panel = host.querySelector(':scope > .v32-panel'),
      bar = host.querySelector(':scope > .v32-bar');
    if (!panel || !bar || !bar.getClientRects().length) return 0;
    return Math.max(
      0,
      Math.round(
        inspector.scrollTop +
          panel.getBoundingClientRect().top -
          inspector.getBoundingClientRect().top -
          stripHeight() -
          bar.offsetHeight,
      ),
    );
  }
  // The page is always long enough for the bar to stay stuck, however short the open facet is.
  function keepHeight(host) {
    const top =
      host.getBoundingClientRect().top - inspector.getBoundingClientRect().top + inspector.scrollTop;
    const min = Math.ceil(stuckAt(host) + inspector.clientHeight - top) + 'px';
    if (host.style.minHeight !== min) host.style.minHeight = min;
  }

  /* ---------- the top strip ---------- */
  function place(node) {
    const out = { course: null, parts: [] };
    try {
      const p = geoPlacement(node.id),
        region = regionFor(p.region),
        district = geoDistrict(p.district);
      const course =
        COURSE[regionCourse(region)] || COURSE[(node.courses || []).find((c) => COURSE[c])] || null;
      out.course = course;
      if (course) out.parts.push(course[0]);
      else if (node.courses?.[0]) out.parts.push(node.courses[0]);
      if (region && shortRegionTitle(region) !== out.parts[0]) out.parts.push(shortRegionTitle(region));
      if (district?.title && !out.parts.includes(district.title)) out.parts.push(district.title);
    } catch {
      /* the strip keeps the label the entry was drawn with */
    }
    return out;
  }
  function strip(now) {
    const top = inspector.querySelector('.reader-top');
    if (!top) return;
    const close = top.querySelector('#closeInspector');
    if (close && !close.querySelector('svg')) {
      close.innerHTML = ICON.close;
      close.title = 'Close';
    }
    const label = top.querySelector(':scope > span');
    if (!label || label.dataset.v32Strip === (now?.key || '-')) return;
    label.dataset.v32Strip = now?.key || '-';
    label.classList.add('v32-ident');
    const where = now?.node ? place(now.node) : null;
    if (where?.parts.length) {
      // The same place every reader names: a course dot, then course, unit and subject.
      label.title = where.parts.join(' › ');
      label.replaceChildren(
        element('i', 'v32-dot'),
        ...where.parts.flatMap((part, i) => {
          const text = element('span', i ? '' : 'v32-course', part);
          return i ? [document.createRange().createContextualFragment(ICON.crumb), text] : [text];
        }),
      );
      label.style.setProperty('--v32-dot', where.course?.[1] || 'var(--v31-faint)');
    }
    top.querySelector('.v32-now')?.remove();
    const title = inspector.querySelector('.reader-body h2');
    if (title) {
      const small = element('strong', 'v32-now', title.textContent.trim());
      small.setAttribute('aria-hidden', 'true');
      label.after(small);
    }
  }
  // The strip gets its hairline once anything has scrolled under it, and the entry's name once the
  // title has. Classes change only when a state does, so a scroll costs no layout.
  let frame = 0;
  function watchScroll() {
    frame = 0;
    const top = inspector.querySelector('.reader-top');
    if (!top) return;
    const scrolled = inspector.scrollTop > 0;
    if (top.classList.contains('v32-scrolled') !== scrolled) top.classList.toggle('v32-scrolled', scrolled);
    const title = inspector.querySelector('.reader-body h2');
    const gone = !!title && title.getBoundingClientRect().bottom < top.getBoundingClientRect().bottom + 4;
    if (top.classList.contains('v32-titled') !== gone) top.classList.toggle('v32-titled', gone);
  }
  inspector.addEventListener(
    'scroll',
    () => {
      if (!frame) frame = requestAnimationFrame(watchScroll);
    },
    { passive: true },
  );

  /* ---------- the citation line under a case's name ---------- */
  // A reporter citation as the full brief gives it: volume, reporter, first page (and any parallel
  // citation), then the parenthetical that ends in the year. Nothing is composed: the line shows the
  // brief's own words, or what the entry's notes say of the court, or nothing.
  const REPORTER = "[A-Z][A-Za-z.'’]*(?: ?(?:[A-Z][A-Za-z.'’]*|\\d[a-z]{1,2}|&))*";
  const ONE = '\\d{1,4} ' + REPORTER + '(?: \\(\\d{1,3} [A-Z][A-Za-z.]+\\))? \\d{1,8}(?:[–-]\\d{1,8})?';
  const CITE = new RegExp(
    '(?:^|[^\\w.])(' + ONE + '(?:, ' + ONE + ')*) \\(([^()]{0,70}?)((?:1[6-9]|20)\\d{2})\\)',
  );
  const cited = new Map();
  function knownYear(node) {
    const title = node.title?.match(/\((\d{4})\)\s*$/),
      court = node.notes?.match(/^Court: [^\n]+?\((\d{4})\)/);
    return Number(title?.[1] || court?.[1]) || null;
  }
  function fromNotes(node) {
    const notes = node.notes || '';
    const said = notes.match(/(?:^|\n)Citation: ([^\n]+?)\.?(?:\n|$)/);
    if (said) return said[1];
    const court = notes.match(/^Court: ([^\n]+?)\s*\((\d{4})\)/);
    return court ? court[1] + ' · ' + court[2] : '';
  }
  function fromBrief(text, node) {
    const found = String(text || '')
      .slice(0, 900)
      .match(CITE);
    if (!found) return '';
    const year = knownYear(node);
    // A brief that opens on another decision's citation is not this case's line.
    if (year && Math.abs(year - Number(found[3])) > 1) return '';
    return `${found[1]} (${found[2]}${found[3]})`;
  }
  function citation(host, now) {
    const line = host.querySelector(':scope > .v32-head > .v32-meta');
    if (!line) return;
    const node = now?.node;
    const set = (text) => {
      if (line.textContent !== text) line.textContent = text;
    };
    if (!node || node.kind !== 'Case') {
      line.hidden = true;
      return;
    }
    const brief = window.DKLABriefs?.data?.map?.[node.id];
    const fallback = fromNotes(node);
    if (cited.has(node.id)) {
      const text = cited.get(node.id) || fallback;
      set(text);
      line.hidden = !text;
      return;
    }
    // The line keeps its place while the brief is fetched, so nothing below it moves when it arrives.
    set(fallback);
    line.hidden = !fallback && !brief;
    if (!brief || line.dataset.v32Asked === node.id) return;
    line.dataset.v32Asked = node.id;
    Promise.resolve(window.DKLABriefs.text(brief))
      .then((text) => cited.set(node.id, fromBrief(text, node)))
      .catch(() => {})
      .then(() => {
        const open = body();
        if (open && entry()?.id === node.id && cited.get(node.id)) {
          const here = open.querySelector(':scope > .v32-head > .v32-meta');
          if (here) here.textContent = cited.get(node.id);
        }
      });
  }

  /* ---------- one list of sources ---------- */
  const tidy = (text) =>
    String(text || '')
      .replace(/\s*↗\s*$/, '')
      .replace(/^Original reading · /, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\.$/, '');
  const decoded = (value) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };
  function sourceOf(el) {
    const d = el.dataset;
    const href = el.getAttribute('href') || '';
    const file = d.dklaFile || (/^(added-sources|DKLA-sources)\//.test(decoded(href)) ? decoded(href) : '');
    if (file) {
      const page = file.match(/#page=(\d+)$/);
      return {
        key: 'file:' + file.replace(/\s+/g, ' '),
        kind: /Textbook|LRS-|lrs-|Selections|casebook|packet/i.test(file) ? 'reading' : 'file',
        attrs: { 'data-dkla-file': file },
        meta: page ? 'PDF p. ' + page[1] : '',
      };
    }
    if (d.authorityOpen)
      return {
        key: 'rule:' + d.authorityOpen,
        kind: 'rule',
        attrs: { 'data-authority-open': d.authorityOpen },
      };
    if (/^https?:/.test(href)) {
      let host = '';
      try {
        host = new URL(href).hostname.replace(/^www\./, '');
      } catch {
        /* no host to show */
      }
      return { key: 'url:' + href, kind: 'link', href, meta: host };
    }
    if (href.startsWith('#')) return { key: 'app:' + href, kind: 'reading', href };
    // A page of a reading that opens inside the atlas (data-book, data-civil-page, data-lrs-source, ...).
    const attrs = {};
    for (const name of el.getAttributeNames())
      if (name.startsWith('data-')) attrs[name] = el.getAttribute(name);
    const key = Object.entries(attrs)
      .map((pair) => pair.join('='))
      .join('&');
    return key ? { key: 'app:' + key, kind: 'reading', attrs } : null;
  }
  function sourceLabel(el) {
    if (el.classList.contains('r19-pdfchip')) return 'Archived briefs';
    // A record's source link is its label, then a smaller line that says where the file is.
    const own = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent)
      .join(' ');
    return tidy(own) || tidy(el.title) || tidy(el.textContent);
  }
  function sourceRows(host) {
    const rows = new Map();
    const add = (el) => {
      const source = sourceOf(el);
      if (!source) return;
      let label = sourceLabel(el);
      // "… · PDF p. 326" is the row's trailing readout, not part of its name.
      if (source.meta)
        label = tidy(label.replace(new RegExp('\\s*·\\s*' + source.meta.replace('.', '\\.') + '$'), ''));
      const row = rows.get(source.key);
      if (!row) rows.set(source.key, { ...source, label });
      // A file's own name is the last choice of label.
      else if (/\.pdf\b/i.test(row.label) && label && !/\.pdf\b/i.test(label)) row.label = label;
    };
    const all = (selector) => host.querySelectorAll(selector).forEach(add);
    all(':scope > details.quiet-details a.source-link');
    all(':scope > .v25-source-details .source-strip > *, :scope > .source-strip > *');
    all(':scope > .r19-brief > .r28-original-sources > *');
    all(
      ':scope > .v25-source-details .dkla-file-chips > *, :scope > .dkla-file-chips > *, :scope > .r19-chiprow > *',
    );
    all(':scope > .authority-context [data-authority-open]');
    // The reading the brief was written from (what "Original source" used to open) leads the list.
    const first = host.querySelector(':scope > .r19-brief > .r28-original-sources > *');
    const original = first && rows.get(sourceOf(first)?.key);
    if (original) original.original = true;
    return [...rows.values()].sort((a, b) => (b.original ? 1 : 0) - (a.original ? 1 : 0));
  }
  function sources(host) {
    const rows = sourceRows(host);
    let list = host.querySelector(':scope > .v32-sources');
    if (!rows.length) {
      list?.remove();
      return;
    }
    const signature = rows
      .map((r) => [r.key, r.label, r.meta || '', r.original ? 1 : 0].join('|'))
      .join('\n');
    if (
      list &&
      list.dataset.v32Rows === signature &&
      list.querySelectorAll('[data-v32-source]').length === rows.length
    )
      return;
    if (!list) {
      list = element('section', 'v32-sources');
      list.setAttribute('aria-label', 'Sources');
      host.appendChild(list);
    }
    list.dataset.v32Rows = signature;
    const group = (title, items) => {
      if (!items.length) return [];
      const ul = element('ul', 'v32-rows');
      for (const r of items) {
        const row = element(r.href ? 'a' : 'button', 'v32-row');
        if (r.href) {
          row.href = r.href;
          if (r.kind === 'link') {
            row.target = '_blank';
            row.rel = 'noopener noreferrer';
          }
        } else row.type = 'button';
        for (const [name, value] of Object.entries(r.attrs || {})) row.setAttribute(name, value);
        row.dataset.v32Source = r.kind;
        if (r.original) row.dataset.v32Original = '';
        row.innerHTML = ICON[r.kind];
        row.append(element('span', 'v32-row-label', r.label));
        if (r.meta) row.append(element('span', 'v32-row-meta', r.meta));
        row.title = (r.original ? 'Original source: ' : '') + r.label;
        const li = element('li');
        li.appendChild(row);
        ul.appendChild(li);
      }
      const head = element('h3', 'v32-label');
      head.append(title + ' ', element('span', 'v32-count', String(items.length)));
      return [head, ul];
    };
    list.replaceChildren(
      ...group(
        'Reading',
        rows.filter((r) => r.kind !== 'rule'),
      ),
      ...group(
        'Authorities cited',
        rows.filter((r) => r.kind === 'rule'),
      ),
    );
  }

  /* ---------- a case on more than one timeline: one at a time ---------- */
  function timelines(host) {
    const group = host.querySelector(':scope > .v28-case-timelines');
    if (!group) return;
    const lines = [...group.querySelectorAll(':scope > .dkla-timeline')];
    let pick = group.querySelector(':scope > .v32-switch');
    if (lines.length < 2) {
      pick?.remove();
      lines.forEach((line) => (line.hidden = false));
      return;
    }
    const signature = lines.map((line) => line.dataset.r21).join('|');
    if (!pick || pick.dataset.v32Lines !== signature) {
      pick?.remove();
      pick = element('div', 'v32-seg v32-switch');
      pick.dataset.v32Lines = signature;
      pick.setAttribute('role', 'group');
      pick.setAttribute('aria-label', 'Which timeline to show');
      lines.forEach((line, i) => {
        const button = element('button', '', line.getAttribute('aria-label'));
        button.type = 'button';
        button.title = line.getAttribute('aria-label');
        button.dataset.v32Line = String(i);
        pick.appendChild(button);
      });
      group.prepend(pick);
    }
    const open = Math.min(state.line || 0, lines.length - 1);
    lines.forEach((line, i) => {
      if (line.hidden !== (i !== open)) line.hidden = i !== open;
    });
    [...pick.children].forEach((button, i) => {
      const on = String(i === open);
      if (button.getAttribute('aria-pressed') !== on) button.setAttribute('aria-pressed', on);
    });
  }

  /* ---------- drawing ---------- */
  function sync() {
    const now = entry();
    strip(now);
    const host = body();
    if (!host) {
      if (state.key !== (now?.key || null)) {
        state.key = now?.key || null;
        state.signature = '';
      }
      return;
    }
    sources(host);
    citation(host, now);
    if (state.key !== (now?.key || null)) state.line = 0;
    timelines(host);
    const course = now?.node && place(now.node).course;
    if (course && host.style.getPropertyValue('--v32-course') !== course[1])
      host.style.setProperty('--v32-course', course[1]);
    const list = model(host);
    const opened = state.key !== (now?.key || null);
    if (opened) {
      state.key = now?.key || null;
      state.facet = 'brief';
      state.mode = 'short';
      state.scroll = new Map();
      state.signature = '';
    }
    if (wanted && wanted.id === now?.id && list.some((f) => f.id === wanted.facet)) {
      state.facet = wanted.facet;
      wanted = null;
    }
    if (!list.some((f) => f.id === state.facet)) state.facet = list[0]?.id || 'brief';
    apply(host, list);
    keepHeight(host);
    watchSize(host);
    const signature = list.map((f) => f.id + ':' + f.count).join('|');
    if (opened || signature !== state.signature) {
      state.signature = signature;
      announce(opened ? 'open' : 'update', list);
    }
  }
  // A facet's blocks arrive with a short fade; the keyframes alternate so each change starts afresh.
  let fading = 0;
  function fade(host) {
    if (reduced.matches) return;
    state.tick ^= 1;
    const tick = String(state.tick);
    host.dataset.v32Tick = tick;
    // Once the fade is over the blocks carry no animation, so nothing can start it again by accident.
    clearTimeout(fading);
    fading = setTimeout(() => {
      if (host.dataset.v32Tick === tick) delete host.dataset.v32Tick;
    }, 400);
  }
  function show(id, options = {}) {
    const host = body();
    if (!host) return false;
    const list = model(host);
    if (!list.some((f) => f.id === id)) return false;
    if (id === state.facet) return true;
    const stuck = stuckAt(host);
    // Where this facet was read to, kept for coming back to it.
    if (inspector.scrollTop > stuck) state.scroll.set(state.facet, inspector.scrollTop);
    else state.scroll.delete(state.facet);
    const wasStuck = inspector.scrollTop >= stuck && stuck > 0;
    state.facet = id;
    apply(host, list);
    keepHeight(host);
    if (wasStuck) inspector.scrollTop = options.top ? stuck : Math.max(stuck, state.scroll.get(id) || 0);
    if (!options.quiet) fade(host);
    window.DKLAReading?.paint?.();
    announce('change', list);
    return true;
  }
  function setMode(mode) {
    const host = body();
    if (!host || !['short', 'full'].includes(mode) || mode === state.mode) return;
    if (!host.querySelector(':scope > .r19-brief [data-r19-fill]')) return;
    state.mode = mode;
    const stuck = stuckAt(host);
    apply(host, model(host));
    if (inspector.scrollTop > stuck) inspector.scrollTop = stuck;
    fade(host);
  }
  // Bring one block of the entry into view, in whichever facet it lives.
  function reveal(target, options = {}) {
    const block = target?.closest?.('.reader-body.v32 > [data-v32-facet]');
    if (!block) return false;
    if (block.classList.contains('r19-brief') && target.closest('[data-r19-fill]')) setMode('full');
    else if (block.matches('.takeaway, .case-box')) setMode('short');
    show(block.dataset.v32Facet, { quiet: true, top: true });
    if (options.scroll !== false) window.DKLAReading?.scrollToBlock?.(target, -1);
    return true;
  }

  /* ---------- size: the page stays long enough whatever changes ---------- */
  const sizes =
    typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => {
          const host = body();
          if (!host) return;
          keepHeight(host);
          const tabs = host.querySelector(':scope > .v32-bar > .v32-tabs');
          if (tabs) edges(tabs);
        })
      : null;
  let sized = null;
  function watchSize(host) {
    const head = host.querySelector(':scope > .v32-head');
    if (!sizes || head === sized) return;
    sizes.disconnect();
    sizes.observe(inspector);
    if (head) sizes.observe((sized = head));
  }

  // (Scroll events do not bubble: this one is caught on the way down.)
  inspector.addEventListener(
    'scroll',
    (event) => {
      if (event.target.classList?.contains('v32-tabs')) edges(event.target);
    },
    { capture: true, passive: true },
  );

  /* ---------- pointer and keyboard ---------- */
  inspector.addEventListener('click', (event) => {
    const tab = event.target.closest('.v32-tab');
    if (tab) {
      show(tab.dataset.v32Tab);
      tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      return;
    }
    const mode = event.target.closest('.v32-brief-head [data-v32-mode]');
    if (mode) {
      setMode(mode.dataset.v32Mode);
      return;
    }
    const line = event.target.closest('.v32-switch [data-v32-line]');
    if (line) {
      state.line = Number(line.dataset.v32Line);
      const host = body();
      if (host) {
        timelines(host);
        fade(host);
      }
    }
  });
  // Arrow keys move along the tabs and open the one they land on; Home and End go to the ends.
  inspector.addEventListener('keydown', (event) => {
    const tab = event.target.closest?.('.v32-tab');
    if (!tab || event.altKey || event.ctrlKey || event.metaKey) return;
    const tabs = [...tab.parentElement.children];
    const at = tabs.indexOf(tab);
    const to =
      event.key === 'ArrowRight'
        ? (at + 1) % tabs.length
        : event.key === 'ArrowLeft'
          ? (at - 1 + tabs.length) % tabs.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? tabs.length - 1
              : -1;
    if (to < 0) return;
    event.preventDefault();
    show(tabs[to].dataset.v32Tab);
    tabs[to].focus({ preventScroll: true });
    tabs[to].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
  // 1 to 9 open a facet while the reader is in front and the keyboard is not in a field.
  document.addEventListener('keydown', (event) => {
    if (!/^[1-9]$/.test(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    const host = body();
    if (!host || inspector.hidden || host.classList.contains('v32-single')) return;
    const at = document.activeElement;
    if (at && (at.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(at.tagName))) return;
    if (document.querySelector('dialog[open]')) return;
    const tab = host.querySelector(':scope > .v32-bar > .v32-tabs').children[Number(event.key) - 1];
    if (!tab) return;
    event.preventDefault();
    show(tab.dataset.v32Tab);
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });

  /* ---------- what used to scroll the one long page ---------- */
  // "Show me" on a search result: the search marks the passage; its facet is opened and the passage is
  // brought under the bar (src/runtime/dklaR13Search.js cannot see into a facet that is not open).
  document.addEventListener('click', (event) => {
    if (event.target.closest?.('#inspector .search-why-show')) {
      const target = inspector.querySelector('.reader-body.v32 .search-why-target');
      if (target && !target.getClientRects().length && reveal(target, { scroll: false })) {
        const view = inspector.getBoundingClientRect(),
          spot = target.getBoundingClientRect();
        inspector.scrollTo({
          top:
            inspector.scrollTop +
            spot.top -
            view.top -
            Math.max(120, (inspector.clientHeight - spot.height) / 2),
          behavior: 'instant',
        });
        target.focus({ preventScroll: true });
      }
      return;
    }
    // "All connections" on the map's connection card.
    if (event.target.closest?.('[data-dkla-all-connections]')) show('connections');
  });
  // A link to one facet of an entry: #node=citoh&facet=timeline.
  function route() {
    const found = decodeURIComponent(location.hash || '').match(/^#node=([^&]+)&facet=([a-z]+)$/);
    if (!found) return;
    try {
      if (!nodesById.has(found[1])) return;
      wanted = { id: found[1], facet: found[2] };
      if (selected?.type === 'node' && selected.id === found[1] && body()) sync();
      else goNode(found[1], true);
    } catch {
      wanted = null;
    }
  }
  window.addEventListener('hashchange', route);

  window.DKLAReader = {
    /** The facets of the open entry, in the order of the bar: [{id, label, count}] (count '' if none). */
    facets: () => {
      const host = body();
      return host ? model(host) : [];
    },
    /** Open a facet by id; false if the open entry has no such facet. */
    show,
    /** The id of the open facet, or null when no entry with facets is open. */
    current: () => (body() ? state.facet : null),
    /** 'short' or 'full': which brief the Brief facet shows. */
    mode: () => (body() ? state.mode : null),
    setMode,
    /** Open the facet that holds an element of the reader and bring the element into view. */
    reveal,
    sync,
  };
  if (window.LegalAtlas?.ready) route();
  else document.addEventListener('DOMContentLoaded', () => setTimeout(route, 0), { once: true });
  window.DKLAReading?.paint?.();
})();
