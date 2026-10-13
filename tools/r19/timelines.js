/* r20.9: doctrine timelines, audited and extended.
   The atlas's timelines (seedData.timelines, drawn in the reading panel by dklaUI) were re-cut course by course:
   tools/r19/data/timelines.json holds the new set. Each step is an entry on the map, a supporting case (opens its
   brief) or a dated statute or rule change, and carries what it did to the doctrine ("turn") and, where a later
   case undid it, its fate. v2.5 adds a scoped synthesis and an authored guide to each line.
   - The saved graph's `timelines` is replaced by the new set once (stamped by `rev`). Steps that are not map
     entries get ids that match no entry, so the panel code that walks the steps simply skips them.
   - r22: every statute or rule step opens an entry (six new rule entries, tools/r19/rules22.js; an event step may
     carry `link`, the entry it opens, where that entry is already a step of the same timeline).
   - After the panel draws a timeline, it is redrawn from the full data (turns, fates, supporting cases, events,
     the "where it stands" line).
   - "Doctrine timelines" in the More menu, a link on every panel timeline and search rows open a list of all of
     them by course. */
(() => {
  'use strict';
  const D = window.DKLABriefs && window.DKLABriefs.data,
    TL = D && D.timelines;
  if (!TL || !Array.isArray(TL.list)) return;
  const esc = (s) => E(String(s ?? ''));
  const COURSES = ['Contracts', 'Civil Procedure', 'Legislation and the Regulatory State'],
    SHORT = ['Contracts', 'Civil Procedure', 'LRS'];
  /* v23: twelve moves. The label on a step is a plain verb and its object: the timeline's own words for widens
     and limits ("Widens removal power", "Harder to survive dismissal"), the step's object for overrules, displaces,
     extends, codifies and counterpoint ("Overrules Chevron", "Replaces Finley", "Extends to commercial bids",
     "Codified in Rule 23", "Singapore disagrees"), fixed words for the rest. Hovering explains the move. */
  const TURN = {
    origin: 'Starting point',
    widens: 'Widens',
    limits: 'Narrows',
    extends: 'Extends',
    sharpens: 'Clarifies the rule',
    reaffirms: 'Reaffirms the rule',
    applies: 'Applies the rule',
    overrules: 'Overrules',
    displaces: 'Replaces',
    codifies: 'States the rule',
    divided: 'Reasoning divided',
    counterpoint: 'Different jurisdiction',
  };
  const MEANS = {
    origin: 'The starting point selected for this timeline, not a claim that the doctrine began here.',
    widens:
      'Broadens the specific dimension named by this timeline. Read the note for jurisdiction and qualifications.',
    limits:
      'Limits the specific dimension named by this timeline. Read the note for jurisdiction and qualifications.',
    extends: 'Applies a related rule in another setting; the note identifies the relationship.',
    sharpens: 'Clarifies a test or distinguishes a separate doctrinal branch.',
    reaffirms: 'Retains an earlier rule in the setting described.',
    applies: 'Illustrates application in the setting described.',
    overrules: 'Expressly overrules the identified precedent to the stated extent.',
    displaces:
      'Changes the identified rule through the authority described; a Restatement formulation is not legislation.',
    codifies:
      'States a doctrinal formulation. A model UCC text needs state enactment; a Restatement is persuasive authority.',
    divided:
      'The relevant reasoning lacks a majority. Agreement on judgment or another issue may still exist.',
    counterpoint: 'A comparison from another jurisdiction or legal regime, not an overruling.',
  };
  const label = (s, t) => {
    if (s.effect) return s.effect;
    const o = s.object || '';
    switch (s.turn) {
      case 'widens':
        return (t && t.up) || 'Widens the doctrine';
      case 'limits':
        return (t && t.down) || 'Narrows the doctrine';
      case 'extends':
        return o ? 'Extends to ' + o : 'Extends the doctrine';
      case 'overrules':
        return o ? 'Overrules ' + o : 'Overrules';
      case 'displaces':
        return o ? 'Replaces ' + o : 'Replaces the rule';
      case 'codifies':
        return o ? 'States ' + o : 'States the rule';
      case 'counterpoint':
        return o ? o + ' disagrees' : 'Counterpoint';
      default:
        return TURN[s.turn] || '';
    }
  };
  const SUP = new Map(D.entries.filter((e) => !e[6]).map((e) => [e[0], e[1]]));
  const byTitle = new Map(TL.list.map((t) => [t.title, t])),
    byId = new Map(TL.list.map((t) => [t.id, t]));
  const stepId = (s, i, t) => s.id || (s.sup ? 'sup:' + s.sup : `event:${t.id}:${i}`);

  /* ---------- the saved graph carries the new set ---------- */
  function apply() {
    if (
      typeof data === 'undefined' ||
      !data ||
      (data.timelinesRev === TL.rev && Array.isArray(data.timelines))
    )
      return false;
    data.timelines = TL.list.map((t) =>
      Object.assign({}, t, { steps: t.steps.map((s, i) => Object.assign({}, s, { id: stepId(s, i, t) })) }),
    );
    data.timelinesRev = TL.rev;
    try {
      if (typeof saveCache === 'function') saveCache();
    } catch {
      /* storage unavailable */
    }
    return true;
  }

  /* ---------- drawing ---------- */
  function name(s) {
    if (s.event) return s.event;
    if (s.sup) return SUP.get(s.sup) || s.sup;
    const n = nodesById.get(s.id);
    if (!n) return s.id;
    const label = typeof displayName === 'function' ? displayName(n) : n.shortTitle || n.title;
    return String(label)
      .replace(/\s*\(\d{4}\)\s*/, ' ')
      .replace(/\s+[—–]\s+.*$/, '')
      .trim();
  }
  const live = (s) => s.event || s.sup || nodesById.get(s.id);
  const turnTag = (s, t) =>
    s.turn && TURN[s.turn]
      ? `<em class="r21-turn r21-${esc(s.turn)}" title="${esc(MEANS[s.turn])}${['widens', 'limits'].includes(s.turn) ? ' Reference: ' + esc(t.anchor) + '.' : ''}">${esc(label(s, t))}</em>`
      : '';
  const authority = (s) =>
    s.authorityKind && s.authorityKind !== 'Court decision'
      ? `<span class="r25-authority-kind">${esc(s.authorityKind)}</span>`
      : '';
  const synthesis = (t) => (t.now ? `<p class="r25-timeline-synthesis">${esc(t.now)}</p>` : '');
  const fate = (s) => (s.fate ? `<span class="r21-fate">${esc(s.fate)}</span>` : '');
  // the button a step opens with: an entry on the map, a supporting brief, or nothing for a statute or rule change
  function opener(s, inner, cls) {
    if (s.event && s.link)
      return `<button type="button" class="${cls}" data-study-node="${esc(s.link)}" title="Opens the rule entry">${inner}</button>`;
    if (s.event) return `<div class="${cls} r21-static">${inner}</div>`;
    if (s.sup)
      return `<button type="button" class="${cls}" data-r19-open="${esc(s.sup)}" title="Supporting case: opens the brief">${inner}</button>`;
    return `<button type="button" class="${cls}" data-study-node="${esc(s.id)}">${inner}</button>`;
  }

  function panelHTML(t, current) {
    const steps = t.steps
      .filter(live)
      .map((s, i) => {
        const cur = s.id && s.id === current;
        const kind = s.event ? ' r21-event' : s.sup ? ' r21-sup' : '';
        return `<li class="${cur ? 'is-current' : ''}${kind}" style="--i:${i}">${opener(s, `<span class="dkla-tl-year">${esc(s.year)}</span>${authority(s)}<strong>${esc(name(s))}</strong>${turnTag(s, t)}<small>${esc(s.note)}</small>${fate(s)}`, 'r21-step')}</li>`;
      })
      .join('');
    return `<section class="dkla-timeline" data-r21="${esc(t.id)}" aria-label="${esc(t.title)}"><h3 class="r25-timeline-title">${esc(t.title)}</h3><ol class="dkla-timeline-track">${steps}</ol>${synthesis(t)}<button type="button" class="r21-all" data-r21-open="${esc(t.id)}">Open full timeline</button></section>`;
  }
  // how many of a timeline's steps are linked to a concept (the test the panel uses to show it on that concept)
  function uses(t, concept) {
    const canon = (id) => {
      try {
        return typeof r6Canonical === 'function' ? r6Canonical(id) : id;
      } catch {
        return id;
      }
    };
    const c = canon(concept);
    return t.steps.filter(
      (s) => s.id && Object.keys(nodesById.get(s.id)?.learning?.topics || {}).some((k) => canon(k) === c),
    ).length;
  }
  function paint() {
    const inspector = document.getElementById('inspector');
    if (!inspector) return;
    const current = typeof selected !== 'undefined' && selected?.type === 'node' ? selected.id : null;
    let painted = false;
    const fresh = [...inspector.querySelectorAll('.dkla-timeline:not([data-r21])')]
      .map((sec) => [sec, byTitle.get(sec.getAttribute('aria-label'))])
      .filter((x) => x[1]);
    // A concept that is not itself a step shows the timelines it runs through; with many, the two that use it
    // most are drawn in full and the rest are named in one line.
    const n = current && nodesById.get(current),
      direct = fresh.some(([, t]) => t.steps.some((s) => s.id === current));
    if (n && !direct && fresh.length > 2) {
      fresh.sort((a, b) => uses(b[1], current) - uses(a[1], current));
      const rest = fresh.splice(2);
      rest.forEach(([sec]) => sec.remove());
      const last = fresh[fresh.length - 1][0];
      last.insertAdjacentHTML(
        'afterend',
        `<p class="r21-also"><span>Also traced in</span>${rest.map(([, t]) => `<button type="button" data-r21-open="${esc(t.id)}">${esc(t.title)}</button>`).join('')}</p>`,
      );
    }
    fresh.forEach(([sec, t]) => {
      sec.outerHTML = panelHTML(t, current);
      painted = true;
    });
    // bring the open case's step into view, as the panel did before
    if (painted) inspector.querySelectorAll('.dkla-timeline[data-r21]').forEach(positionCurrent);
  }
  function positionCurrent(disclosure) {
    disclosure.querySelectorAll('li.is-current').forEach((li) => {
      const track = li.parentElement;
      track.scrollLeft = Math.max(0, li.offsetLeft - track.clientWidth / 2 + li.offsetWidth / 2);
    });
  }
  if (typeof renderInspector === 'function') {
    const prior = renderInspector;
    renderInspector = function (...a) {
      apply();
      const v = prior.apply(this, a);
      try {
        paint();
      } catch {
        /* the plain timeline stays */
      }
      return v;
    };
  }

  /* ---------- every timeline, by course ---------- */
  const dialog = document.createElement('dialog');
  dialog.id = 'r21Timelines';
  dialog.setAttribute('aria-label', 'Doctrine timelines');
  document.querySelectorAll('#r21Timelines').forEach((n) => n.remove());
  dialog.innerHTML =
    '<div class="r19-head"><div id="r21Title"></div><button class="r19-close" data-r21-close aria-label="Close">×</button></div><div class="r19-body" id="r21Body" tabindex="-1"></div>';
  document.body.appendChild(dialog);
  const body = dialog.querySelector('#r21Body'),
    title = dialog.querySelector('#r21Title');
  const V = { course: 0, open: null };
  const results = document.getElementById('searchResults'),
    input = document.getElementById('search');
  const inCourse = (i) => TL.list.filter((t) => t.course === COURSES[i]);
  function listHTML() {
    title.innerHTML = '<h2>Doctrine timelines</h2>';
    return `<div class="r19-tabs">${COURSES.map((c, i) => `<button data-r21-course="${i}" aria-pressed="${V.course === i}">${SHORT[i]}</button>`).join('')}</div>
      <div class="r21-cards">${inCourse(V.course)
        .map(
          (t) =>
            `<button type="button" class="r21-card" data-r21-tl="${esc(t.id)}"><strong>${esc(t.title)}</strong></button>`,
        )
        .join('')}</div>`;
  }
  function detailHTML(t) {
    title.innerHTML = `<h2>${esc(t.title)}</h2>`;
    return `<div class="r21-line"><button type="button" data-r21-back>← All timelines</button></div>
      <ol class="r21-v">${t.steps
        .filter(live)
        .map(
          (s) =>
            `<li class="${s.event ? 'r21-event' : s.sup ? 'r21-sup' : ''}"><span class="r21-y">${esc(s.year)}</span><div>${authority(s)}${s.event ? (s.link ? `<button type="button" class="r21-name" data-r21-node="${esc(s.link)}">${esc(name(s))}</button>` : `<b class="r21-name">${esc(name(s))}</b>`) : s.sup ? `<button type="button" class="r21-name" data-r19-open="${esc(s.sup)}">${esc(name(s))}</button>` : `<button type="button" class="r21-name" data-r21-node="${esc(s.id)}">${esc(name(s))}</button>`}${turnTag(s, t)}<p>${esc(s.note)}</p>${fate(s)}</div></li>`,
        )
        .join('')}</ol>
      ${synthesis(t)}`;
  }
  function render() {
    const t = V.open && byId.get(V.open);
    body.innerHTML = t ? detailHTML(t) : listHTML();
    body.scrollTop = 0;
  }
  function open(id, course) {
    if (typeof dismissMenu === 'function') dismissMenu();
    const t = id && byId.get(id);
    V.open = t ? t.id : null;
    if (t) V.course = Math.max(0, COURSES.indexOf(t.course));
    else if (typeof course === 'number') V.course = course;
    else if (typeof S !== 'undefined' && COURSES.includes(S.scope)) V.course = COURSES.indexOf(S.scope);
    if (!dialog.open) dialog.showModal();
    render();
    body.focus({ preventScroll: true });
  }
  dialog.addEventListener('click', (ev) => {
    if (ev.target === dialog) dialog.close();
  });
  // the close event arrives after the dialog has closed, possibly after it was opened again: clear only a closed one
  dialog.addEventListener('close', () => {
    if (!dialog.open) body.innerHTML = '';
  });
  document.addEventListener(
    'click',
    (ev) => {
      const b = ev.target.closest(
        '[data-r21-open],[data-r21-close],[data-r21-course],[data-r21-tl],[data-r21-back],[data-r21-node],[data-r21-menu]',
      );
      if (!b) return;
      const d = b.dataset;
      if (d.r21Open !== undefined) {
        ev.preventDefault();
        ev.stopPropagation();
        if (typeof closeSearch === 'function' && results && results.contains(b)) closeSearch();
        open(d.r21Open);
      } else if ('r21Menu' in d) {
        ev.preventDefault();
        open(null);
      } else if ('r21Close' in d) dialog.close();
      else if (d.r21Course) {
        V.course = Number(d.r21Course);
        render();
      } else if (d.r21Tl) {
        V.open = d.r21Tl;
        render();
      } else if ('r21Back' in d) {
        V.open = null;
        render();
      } else if (d.r21Node) {
        dialog.close();
        if (typeof goNode === 'function') goNode(d.r21Node, true);
      }
    },
    true,
  );

  // More menu row, after "Guided walkthrough" (or "How to use")
  if (typeof moreMenu === 'function') {
    const prior = moreMenu;
    moreMenu = function (...a) {
      const out = prior.apply(this, a),
        menu = document.getElementById('moreMenu');
      if (menu && !menu.hidden && !menu.querySelector('[data-r21-menu]')) {
        const anchor =
          menu.querySelector('[data-r20-guide]') ||
          [...menu.querySelectorAll('button')].find((b) => b.dataset.action === 'help');
        const b = document.createElement('button');
        b.setAttribute('role', 'menuitem');
        b.dataset.r21Menu = '1';
        b.textContent = 'Doctrine timelines';
        (anchor || menu.lastElementChild).after(b);
      }
      return out;
    };
    const more = document.getElementById('moreBtn');
    if (more) more.onclick = () => moreMenu();
  }
  // search rows: timelines whose title, question, summary or steps match
  const hay = new Map();
  const haystack = (t) => {
    if (!hay.has(t.id))
      hay.set(t.id, [t.title, t.question, t.now, ...t.steps.map(name)].join(' ').toLowerCase());
    return hay.get(t.id);
  };
  if (results && input)
    new MutationObserver(() => {
      if (results.hidden || results.dataset.r21 === input.value) return;
      results.dataset.r21 = input.value;
      const q = input.value.trim().toLowerCase();
      if (q.length < 3) return;
      // every word of the query must appear in the timeline's title, question, summary or the names of its steps
      const words = q.split(/\s+/).filter((w) => w.length > 1);
      const hits = TL.list
        .filter((t) => {
          const hay = haystack(t);
          return words.every((w) => hay.includes(w));
        })
        .sort((a, b) => Number(b.title.toLowerCase().includes(q)) - Number(a.title.toLowerCase().includes(q)))
        .slice(0, 3);
      if (!hits.length) return;
      const box = document.createElement('div');
      box.className = 'r19-search';
      box.innerHTML =
        '<div class="search-label">Doctrine timelines</div>' +
        hits
          .map(
            (t) =>
              `<button data-r21-open="${esc(t.id)}"><strong>${esc(t.title)}</strong><small>${esc(SHORT[COURSES.indexOf(t.course)] || t.course)}</small></button>`,
          )
          .join('');
      results.querySelector('.search-empty')?.remove();
      results.appendChild(box);
    }).observe(results, { childList: true });

  (function whenReady() {
    if (!window.LegalAtlas?.ready || typeof nodesById === 'undefined') {
      setTimeout(whenReady, 120);
      return;
    }
    if (apply()) {
      try {
        renderInspector();
      } catch {
        /* not ready to draw */
      }
    }
    setTimeout(() => {
      if (apply())
        try {
          renderInspector();
        } catch {
          /* not ready */
        }
    }, 3300);
  })();
  window.DKLATimelines = { open, apply, list: () => TL.list.slice(), rev: TL.rev };
})();
