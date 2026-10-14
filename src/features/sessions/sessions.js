/* DKLA sessions: one card for every class session, inside the course's own view.

   Contracts has 26 reading assignments, Civil Procedure 14 syllabus weeks and LRS 26 classes. Until now each
   list was only a pop-up with a drop-down. This draws them as a strip of cards on the course map: a number, the
   date where the syllabus gives one (Contracts gives none, so its cards show none), the title and one line of
   the assigned reading. Nothing is copied: the cards are built from the schedule records already in memory
   (data.corpus, data.civilCorpus.weeks, data.lrsCorpus.classes), and a card opens the existing view for its
   session through the attributes the existing click handlers already answer (data-contract-reading,
   data-civil-week, data-lrs-class).

   The strip shows only at course level: when the location bar reads "Atlas > course" and nothing is selected.
   It is not on Home, not inside a subject, not beside the reading panel and not in SCOTUS History (sessions.css
   hides it there). It can be folded to a small button; the choice is remembered in this browser. */
(() => {
  'use strict';
  if (window.DKLASessions) return;
  const main = document.getElementById('studyMain'),
    crumb = document.getElementById('geoBreadcrumb');
  if (!main || !crumb) return;
  const LRS = 'Legislation and the Regulatory State',
    PREFERENCE = 'dkla.sessions.v1',
    MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const span = (a, b) => (a === b ? String(a) : a + '–' + b);
  // "2026-09-28" is shown as "Sep 28". The day is read from the text, never from a clock or a time zone.
  const day = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? MONTHS[+m[2] - 1] + ' ' + +m[3] : '';
  };
  const short = (id) => {
    const n = nodesById.get(id);
    return n ? n.shortTitle || n.title : '';
  };

  // Each course: what a session is called, which attribute opens one, and how to read its record.
  const COURSES = {
    Contracts: {
      key: 'contracts',
      unit: 'Assignment',
      heading: (n) => n + ' reading assignments',
      brief: (n) => n + ' assignments',
      attribute: 'data-contract-reading',
      list() {
        const c = data.corpus;
        return Object.keys(c?.assignmentTitles || {})
          .map(Number)
          .sort((a, b) => a - b)
          .map((number) => ({
            number,
            // The Contracts syllabus gives no dates, so there is none to show.
            when: '',
            title: c.assignmentTitles[number],
            reading: [
              [
                (c.assignedRanges?.[number] || []).length
                  ? 'C&M ' + c.assignedRanges[number].map(([a, b]) => span(a, b)).join(', ')
                  : '',
                (c.supplementalRanges?.[number] || []).length
                  ? 'Supplement ' + c.supplementalRanges[number].map(([a, b]) => span(a, b)).join(', ')
                  : '',
              ]
                .filter(Boolean)
                .join('; '),
              (c.principalCases?.[number] || []).map(short).filter(Boolean).join(', '),
            ]
              .filter(Boolean)
              .join(' · '),
          }));
      },
    },
    'Civil Procedure': {
      key: 'civil',
      unit: 'Week',
      heading: (n) => n + ' syllabus weeks',
      brief: (n) => n + ' weeks',
      attribute: 'data-civil-week',
      note: 'Class and email instructions supersede the syllabus.',
      list() {
        window.DKLACivilSyllabus?.apply();
        return (data.civilCorpus?.weeks || []).map((w) => ({
          number: w.number,
          // Thirteen rows are weeks ("Week of ..."); the last is the single date the syllabus prints.
          when:
            /^Week of /.test(w.dateLabel || '') && day(w.weekOf)
              ? 'Week of ' + day(w.weekOf)
              : w.dateLabel || '',
          title: w.title,
          reading: [
            (w.readingRanges || []).length
              ? 'pp. ' + w.readingRanges.map(([a, b]) => span(a, b)).join(', ')
              : '',
            w.instructions,
          ]
            .filter(Boolean)
            .join(' · '),
        }));
      },
    },
    [LRS]: {
      key: 'lrs',
      unit: 'Class',
      heading: (n) => n + ' syllabus classes',
      brief: (n) => n + ' classes',
      attribute: 'data-lrs-class',
      list() {
        const c = data.lrsCorpus,
          classes = c?.classes || [];
        return classes.map((k) => {
          // The syllabus prints "Cont'd" for a class that continues the one before; say which.
          const before = classes.find((x) => x.number === k.number - 1),
            continued = /^cont[’']d$/i.test((k.topic || '').trim()) && before,
            mashaw = (c.assignments || []).some(
              (a) => (k.assignmentIds || []).includes(a.id) && a.sourceType === 'mashaw',
            );
          return {
            number: k.number,
            when: day(k.date) || k.syllabusDateLabel || '',
            whenNote: k.calendarNote || '',
            title: k.topic,
            reading: [
              continued ? 'Continues class ' + before.number + ': ' + before.topic : '',
              String(k.readingVerbatim || '')
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean)
                // A line that is only page numbers means the Mashaw casebook; the record says so.
                .map((s) => (/^[\d\s,–-]+$/.test(s) && mashaw ? 'Mashaw ' + s : s))
                .join('; '),
            ]
              .filter(Boolean)
              .join(' · '),
          };
        });
      },
    },
  };

  document.getElementById('dklaSessions')?.remove(); // a copy saved inside a portable HTML file
  const panel = document.createElement('section');
  panel.id = 'dklaSessions';
  panel.hidden = true;
  panel.innerHTML =
    '<div class="dkla-sessions-head"><button type="button" class="dkla-sessions-toggle" aria-controls="dklaSessionsList"><span class="dkla-sessions-title"></span><span class="dkla-sessions-brief"></span><span class="dkla-sessions-chevron" aria-hidden="true"></span></button><span class="dkla-sessions-note"></span><button type="button" class="dkla-sessions-step" data-sessions-step="-1" aria-label="Show earlier sessions">‹</button><button type="button" class="dkla-sessions-step" data-sessions-step="1" aria-label="Show later sessions">›</button></div><ol id="dklaSessionsList" class="dkla-sessions-list"></ol>';
  main.appendChild(panel);
  const list = panel.querySelector('.dkla-sessions-list'),
    toggle = panel.querySelector('.dkla-sessions-toggle');
  let shown = null, // the course whose cards are drawn
    open = null;

  function preferred() {
    try {
      const v = localStorage.getItem(PREFERENCE);
      if (v === 'open' || v === 'closed') return v === 'open';
    } catch {
      /* storage unavailable: use the default */
    }
    // On a short window (a phone held sideways) the strip would cover the map, so it starts folded.
    return window.innerHeight >= 560;
  }
  function setOpen(value, remember) {
    open = !!value;
    panel.dataset.state = open ? 'open' : 'closed';
    toggle.setAttribute('aria-expanded', String(open));
    list.hidden = !open;
    const course = COURSES[shown];
    if (course)
      toggle.title =
        (open ? 'Hide the ' : 'Show the ') + course.heading(list.children.length).replace(/^\d+ /, '');
    if (remember)
      try {
        localStorage.setItem(PREFERENCE, open ? 'open' : 'closed');
      } catch {
        /* storage unavailable */
      }
  }
  function build(name) {
    const course = COURSES[name],
      sessions = course.list();
    const at = list.scrollLeft,
      focused = list.contains(document.activeElement) ? document.activeElement.dataset.session : null,
      same = shown === name;
    panel.dataset.course = course.key;
    panel.setAttribute('aria-label', name + ': ' + course.heading(sessions.length));
    panel.querySelector('.dkla-sessions-title').textContent = course.heading(sessions.length);
    panel.querySelector('.dkla-sessions-brief').textContent = course.brief(sessions.length);
    panel.querySelector('.dkla-sessions-note').textContent = course.note || '';
    list.setAttribute('aria-label', course.heading(sessions.length) + ', one card each');
    list.innerHTML = sessions
      .map((s, i) => {
        const label =
          course.unit +
          ' ' +
          s.number +
          (s.when ? ', ' + s.when : '') +
          ': ' +
          s.title +
          (s.reading ? '. Reading: ' + s.reading : '') +
          (s.whenNote ? ' (' + s.whenNote + ')' : '');
        return `<li><button type="button" class="dkla-session-card" data-session="${s.number}" ${course.attribute}="${s.number}" tabindex="${i ? -1 : 0}" aria-label="${esc(label)}" title="${esc(label)}"><span class="dkla-session-meta"><span class="dkla-session-number">${esc(course.unit)} ${s.number}</span>${s.when ? `<span class="dkla-session-when">${esc(s.when)}</span>` : ''}</span><strong class="dkla-session-title">${esc(s.title)}</strong><span class="dkla-session-reading">${esc(s.reading)}</span></button></li>`;
      })
      .join('');
    shown = name;
    if (same) {
      list.scrollLeft = at;
      const again = focused && list.querySelector(`[data-session="${focused}"]`);
      if (again) {
        rove(again);
        again.focus({ preventScroll: true });
      }
    } else list.scrollLeft = 0;
    if (open === null) setOpen(preferred(), false);
    else setOpen(open, false);
  }
  // The location bar is what the visitor sees, so it decides: exactly "Atlas > course".
  function courseInView() {
    const steps = crumb.querySelectorAll('button');
    if (steps.length !== 2) return null;
    const name = steps[1].getAttribute('data-study-scope');
    return name && COURSES[name] && typeof data !== 'undefined' && typeof nodesById !== 'undefined'
      ? name
      : null;
  }
  function sync(rebuild) {
    const name = courseInView();
    if (!name) {
      panel.hidden = true;
      return;
    }
    if (shown !== name || rebuild === true) {
      try {
        build(name);
      } catch {
        panel.hidden = true;
        return;
      }
    }
    panel.hidden = !list.children.length;
  }

  // Bring a card into the strip by moving the strip sideways only. (scrollIntoView would also move the page.)
  function reveal(card) {
    const a = card.getBoundingClientRect(),
      b = list.getBoundingClientRect();
    if (a.left < b.left) list.scrollLeft -= b.left - a.left;
    else if (a.right > b.right) list.scrollLeft += a.right - b.right;
  }
  // One card takes the Tab key; the arrow keys move between cards.
  function rove(card) {
    for (const b of list.querySelectorAll('.dkla-session-card')) b.tabIndex = b === card ? 0 : -1;
  }
  list.addEventListener('focusin', (e) => {
    const card = e.target.closest('.dkla-session-card');
    if (!card) return;
    rove(card);
    reveal(card);
  });
  list.addEventListener('keydown', (e) => {
    const card = e.target.closest('.dkla-session-card');
    if (!card) return;
    const cards = [...list.querySelectorAll('.dkla-session-card')],
      i = cards.indexOf(card);
    const to =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? cards[i + 1]
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? cards[i - 1]
          : e.key === 'Home'
            ? cards[0]
            : e.key === 'End'
              ? cards[cards.length - 1]
              : null;
    if (!to) return;
    e.preventDefault();
    e.stopPropagation();
    to.focus({ preventScroll: true });
    reveal(to);
  });
  panel.addEventListener('click', (e) => {
    if (e.target.closest('.dkla-sessions-toggle')) {
      setOpen(!open, true);
      return;
    }
    const step = e.target.closest('[data-sessions-step]');
    if (step) list.scrollBy({ left: +step.dataset.sessionsStep * Math.max(180, list.clientWidth - 120) });
  });
  // A mouse wheel over the strip moves the strip, and never zooms the map underneath it.
  panel.addEventListener(
    'wheel',
    (e) => {
      e.stopPropagation();
      if (!open || e.ctrlKey) return;
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!d) return;
      e.preventDefault();
      list.scrollLeft += d;
    },
    { passive: false },
  );
  // Dragging or double-clicking on the strip is not a gesture on the map.
  for (const type of ['pointerdown', 'mousedown', 'touchstart', 'dblclick'])
    panel.addEventListener(type, (e) => e.stopPropagation(), { passive: true });

  new MutationObserver(() => sync()).observe(crumb, { childList: true, subtree: true });
  // The October 1 Civil Procedure syllabus may be applied after the first cards were drawn.
  document.addEventListener('dkla-civil-syllabus', () => sync(true));
  sync();
  window.DKLASessions = {
    refresh: () => sync(true),
    // Scroll the strip to a session's card (it does not open it).
    show: (number) => {
      const card = list.querySelector(`.dkla-session-card[data-session="${+number}"]`);
      if (card) reveal(card);
      return !!card;
    },
    state: () => ({
      course: panel.hidden ? null : shown,
      open: !!open,
      cards: panel.hidden ? 0 : list.children.length,
    }),
  };
})();
