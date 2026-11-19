/* Every Cold Call, in one list (v3.2). window.DKLAColdCallIndex = { count(), open() }.

   The 742 accounts grouped as the atlas groups its cases: by course, then by subject in the map's own order,
   with each course's supporting cases (which have no place on the map) after its subjects. A row is the
   composed caption, the year its citation gives, and how many episodes the account has; pressing it opens
   the reader over this list, and closing the reader comes back here. Typing searches captions and citations.

   It reads the accounts through window.DKLAColdCall (src/features/cold-call/reader.js) and never holds a copy
   of their text. count() is null until the narratives have arrived (they load late in the hosted page). */
(() => {
  'use strict';
  const reader = window.DKLAColdCall;
  if (!reader || window.DKLAColdCallIndex) return;
  const COURSES = ['Contracts', 'Civil Procedure', 'Legislation and the Regulatory State'];
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const captionLine = (title) => window.DKLACaption?.inline(title) ?? esc(title);
  const yearOf = (citation) => window.DKLACaption?.year(citation) ?? '';
  // Compared without case or accents, so "batisseurs" finds "Bâtisseurs".
  const fold = (s) =>
    String(s ?? '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  const plural = (n, one, many = one + 's') => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
  const icon = (d) => `<svg class="cc-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="${d}"/></svg>`;
  const CLOSE = icon('M5.5 5.5l9 9M14.5 5.5l-9 9'),
    FIND = icon('M9 14.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11ZM13 13l3.5 3.5');
  const dialog = document.createElement('dialog');
  dialog.id = 'coldCallIndexDialog';
  dialog.className = 'cc-shell';
  dialog.setAttribute('aria-labelledby', 'ccIxTitle');
  document.body.appendChild(dialog);
  const $ = (id) => dialog.querySelector('#' + id);
  let returnTo = null,
    built = '', // the list's HTML, made once per page (the accounts do not change while it is open)
    total = 0,
    frame = 0;
  const count = () => (reader.loaded() ? reader.cases().length : null);
  /* What stands at the head of a row. A case on the map: its own drawing, at 40 px, large enough to know the
     case by (docs/DESIGN.md, "size artwork by what the eye can recognise"; at 16 px a coil or a boat is a
     smudge, so it is drawn at this size or not at all). A supporting case has no drawing: a small page, the
     glyph for its kind, in the same column. */
  const art = (box, inner, extra = '') =>
    `<svg class="cc-ix-art${extra}" viewBox="0 0 ${box} ${box}" fill="none" stroke="currentColor" stroke-width="${box === 24 ? 1.35 : 1.25}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const SCALES = art(
      16,
      '<path d="M8 2.5v11M5 13.5h6M3 5.5h10M3 5.5 1.6 9.2a1.9 1.9 0 0 0 2.8 0ZM13 5.5l-1.4 3.7a1.9 1.9 0 0 0 2.8 0Z"/>',
    ),
    PAGE = art(
      16,
      '<path d="M4.5 2.5h5l2.5 2.5v8.500h-7.500zM9.500 2.500v2.500h2.500M6.500 8.500h3M6.500 11h3"/>',
      ' cc-ix-page',
    );
  let icons = null;
  function glyph(id, onMap) {
    if (!onMap) return PAGE;
    try {
      icons ||= JSON.parse(document.getElementById('dklaIcons')?.textContent || 'null') || {};
      const record = icons.records?.[id],
        drawing = record && icons.paths?.[record.motif];
      if (drawing) return art(24, drawing, ' cc-ix-own');
    } catch {
      /* no drawings in this page */
    }
    return SCALES;
  }
  // Courses, each with its subjects in the map's order and then its supporting cases.
  function arrange() {
    const courses = COURSES.map((name) => ({ name, subjects: new Map(), supporting: [], n: 0 }));
    let regions = [],
      homes = {};
    try {
      regions = mapData().regions;
      homes = mapData().homes;
    } catch {
      /* no map in this page: every account is listed under its course */
    }
    const place = new Map(regions.map((r, i) => [r.id, i]));
    for (const id of reader.cases()) {
      const account = reader.account(id);
      let course = courses.find((c) => c.name === account.course);
      if (!course)
        courses.push((course = { name: account.course, subjects: new Map(), supporting: [], n: 0 }));
      course.n++;
      const home = homes[id],
        region = home && regions[place.get(home.region)];
      if (!region) {
        course.supporting.push(account);
        continue;
      }
      let subject = course.subjects.get(region.id);
      if (!subject) {
        let title = region.title;
        try {
          title = shortRegionTitle(region);
        } catch {
          /* the map's own short names are not in this page */
        }
        course.subjects.set(
          region.id,
          (subject = { id: region.id, title, at: place.get(region.id), items: [] }),
        );
      }
      // Within a subject: its groups in order, then the place in the group, as the map draws them.
      const group = (region.districtIds || []).indexOf(home.district);
      subject.items.push({ ...account, order: [group < 0 ? 1e6 : group, home.x, home.y] });
    }
    for (const course of courses) {
      course.subjects = [...course.subjects.values()].sort((a, b) => a.at - b.at);
      for (const subject of course.subjects)
        subject.items.sort(
          (a, b) => a.order[0] - b.order[0] || a.order[1] - b.order[1] || a.order[2] - b.order[2],
        );
      course.supporting.sort((a, b) => a.title.localeCompare(b.title, 'en'));
    }
    return courses.filter((c) => c.n);
  }
  /* A row opens its account through the reader's own listener for [data-cold-call] (which is also what the
     analytics layer counts as a Cold Call opened). It is not a <button>: the frosted style of frost.css
     belongs to button[data-cold-call], the one control on a case page, and 742 frosted rows would be noise. */
  const rowHTML = (a, art) => {
    const year = yearOf(a.citation);
    return `<div role="button" tabindex="0" class="cc-ix-row${art.includes('cc-ix-own') ? ' cc-ix-row-art' : ''}" data-cold-call="${esc(a.id)}" data-cc-key="${esc(fold(a.title + ' ' + a.citation))}" title="${esc(a.title + (a.citation ? ' · ' + a.citation : ''))}">${art}<span class="cc-ix-name">${captionLine(a.title)}</span><span class="cc-ix-year">${esc(year)}</span><span class="cc-ix-count">${plural(a.episodes, 'episode')}</span></div>`;
  };
  function build() {
    const courses = arrange();
    total = courses.reduce((n, c) => n + c.n, 0);
    let rail = '',
      list = '';
    courses.forEach((course, ci) => {
      const key = 'ccIxCourse' + ci,
        groups = course.subjects.map((s) => ({ title: s.title, items: s.items, map: true }));
      if (course.supporting.length)
        groups.push({ title: 'Supporting cases', items: course.supporting, map: false });
      // The rail is for getting about: a name and nothing else. What each holds is said, with its unit,
      // beside the heading it leads to.
      rail += `<li class="cc-ix-jump cc-ix-jump-course" data-course="${esc(course.name)}" data-cc-ix-for="${key}"><button type="button" data-cc-ix-go="${key}" title="${esc(course.name)}"><i class="cc-dot" aria-hidden="true"></i><span>${esc(course.name)}</span></button></li>`;
      list += `<section class="cc-ix-course" id="${key}" data-course="${esc(course.name)}" aria-labelledby="${key}Title"><h3 class="cc-ix-course-title" id="${key}Title" tabindex="-1"><span>${esc(course.name)}</span><span class="cc-readout" data-cc-ix-n="${course.n}" data-cc-ix-unit="Cold Call">${plural(course.n, 'Cold Call')}</span></h3>`;
      groups.forEach((group, gi) => {
        const id = `${key}g${gi}`;
        rail += `<li class="cc-ix-jump" data-cc-ix-for="${id}"><button type="button" data-cc-ix-go="${id}" title="${esc(group.title)}"><span>${esc(group.title)}</span></button></li>`;
        list += `<section class="cc-ix-group" id="${id}"${group.map ? '' : ' data-cc-ix-supporting'} aria-labelledby="${id}Title"><h4 class="cc-ix-group-title" id="${id}Title" tabindex="-1"><span>${esc(group.title)}</span><span class="cc-readout" data-cc-ix-n="${group.items.length}" data-cc-ix-unit="case">${plural(group.items.length, 'case')}</span></h4><div class="cc-ix-rows">${group.items
          .map((a) => rowHTML(a, glyph(a.id, group.map)))
          .join('')}</div></section>`;
      });
      list += '</section>';
    });
    return { rail, list };
  }
  const bar = `<header class="cc-bar"><div class="cc-bar-title"><h2 class="cc-bar-kind" id="ccIxTitle">Cold Calls</h2><span class="cc-readout" id="ccIxTotal"></span></div><button type="button" class="cc-x" id="ccIxClose" aria-label="Close Cold Calls" title="Close (Esc)">${CLOSE}</button></header>`;
  function draw() {
    if (!built) {
      const { rail, list } = build();
      built = `<div class="cc-layout"><nav class="cc-ix-rail" aria-label="Courses and subjects"><ol>${rail}</ol></nav><div class="cc-main"><div class="cc-ix-scroll" id="ccIxScroll" tabindex="-1"><div class="cc-ix-head"><label class="cc-ix-find">${FIND}<span class="cc-sr">Search the Cold Calls</span><input type="search" id="ccIxFind" placeholder="Search by case name or citation" autocomplete="off" spellcheck="false" aria-controls="ccIxList" /></label></div><div id="ccIxList">${list}</div><p class="cc-ix-none" id="ccIxNone" role="status" hidden></p></div></div></div>`;
    }
    dialog.innerHTML = bar + built;
    $('ccIxTotal').textContent = plural(total, 'case');
    $('ccIxClose').onclick = close;
    $('ccIxFind').addEventListener('input', () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (dialog.open) filter();
      });
    });
    $('ccIxFind').focus({ preventScroll: true });
  }
  function open(trigger) {
    if (dialog.open) return;
    returnTo = trigger?.nodeType === 1 ? trigger : document.activeElement;
    if (reader.loaded()) draw();
    else {
      dialog.innerHTML = `${bar}<p class="cc-loading" role="status">Loading Cold Calls…</p>`;
      $('ccIxClose').onclick = close;
      reader.whenLoaded().then(
        () => dialog.open && draw(),
        () => {
          const status = dialog.querySelector('.cc-loading');
          if (status)
            status.textContent =
              'The Cold Calls could not be loaded. Check the connection, then close this and try again.';
        },
      );
    }
    dialog.showModal();
    ($('ccIxFind') || $('ccIxClose')).focus({ preventScroll: true });
  }
  function close() {
    if (!dialog.open) return;
    dialog.close();
    dialog.replaceChildren();
    if (returnTo?.isConnected) returnTo.focus({ preventScroll: true });
    returnTo = null;
  }
  // Every word typed must be in the caption or the citation. Groups and courses with nothing left are hidden.
  function filter() {
    const words = fold($('ccIxFind').value).split(/\s+/).filter(Boolean);
    let shown = 0;
    // A heading says how many of its cases are showing: "5 cases", or "2 of 5 cases" while searching.
    const say = (section, n) => {
      const readout = section.querySelector(':scope > * > [data-cc-ix-n]'),
        all = +readout.dataset.ccIxN,
        text =
          n === all
            ? plural(all, readout.dataset.ccIxUnit)
            : `${n} of ${plural(all, readout.dataset.ccIxUnit)}`;
      if (readout.textContent !== text) readout.textContent = text;
      section.hidden = !n;
      dialog.querySelector(`[data-cc-ix-for="${section.id}"]`).toggleAttribute('data-cc-empty', !n);
    };
    for (const course of dialog.querySelectorAll('.cc-ix-course')) {
      let inCourse = 0;
      for (const group of course.querySelectorAll('.cc-ix-group')) {
        let n = 0;
        for (const row of group.querySelectorAll('.cc-ix-row')) {
          const hit = words.every((w) => row.dataset.ccKey.includes(w));
          row.hidden = !hit;
          if (hit) n++;
        }
        say(group, n);
        inCourse += n;
      }
      say(course, inCourse);
      shown += inCourse;
    }
    $('ccIxTotal').textContent = words.length
      ? `${shown.toLocaleString('en-US')} of ${plural(total, 'case')}`
      : plural(total, 'case');
    const none = $('ccIxNone');
    none.hidden = shown > 0;
    none.textContent = shown ? '' : `No Cold Call matches “${$('ccIxFind').value.trim()}”.`;
    $('ccIxScroll').scrollTop = 0;
  }
  const rows = () => [...dialog.querySelectorAll('.cc-ix-row:not([hidden])')];
  dialog.addEventListener('click', (event) => {
    const go = event.target.closest('[data-cc-ix-go]');
    if (!go) return;
    const target = $(go.dataset.ccIxGo),
      box = $('ccIxScroll');
    if (!target || target.hidden) return;
    // Below the search field, which stays at the head of the list.
    const top =
      box.scrollTop +
      target.getBoundingClientRect().top -
      box.getBoundingClientRect().top -
      (box.querySelector('.cc-ix-head')?.offsetHeight || 0);
    if (window.DKLACalm?.scrollTo) window.DKLACalm.scrollTo(box, top);
    else box.scrollTop = top;
    target.querySelector('h3, h4')?.focus({ preventScroll: true });
  });
  // Keys stay in the list: Down from the search field goes to the first row, Up and Down move between rows,
  // Enter in the field opens the first match, and typing anywhere types into the field.
  dialog.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const find = $('ccIxFind');
    if (!find) return;
    const row = event.target.closest?.('.cc-ix-row');
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (event.target !== find && !row) return;
      const list = rows(),
        at = row ? list.indexOf(row) : -1,
        next = event.key === 'ArrowDown' ? list[at + 1] : at > 0 ? list[at - 1] : find;
      if (!next) return;
      event.preventDefault();
      next.focus();
    } else if (event.key === 'Enter' && event.target === find) {
      event.preventDefault();
      rows()[0]?.click();
    } else if (row && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      row.click();
    } else if (event.key.length === 1 && event.key !== ' ' && event.target !== find) {
      find.focus();
    }
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    const find = $('ccIxFind');
    // Escape first empties the search, then closes.
    if (find?.value) {
      find.value = '';
      filter();
      find.focus();
    } else close();
  });
  window.DKLAColdCallIndex = { count, open, close };
})();
