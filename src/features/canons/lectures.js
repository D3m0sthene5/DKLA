/* Class teaching points and reading cross-references keyed by class and original slide. */
(() => {
  'use strict';
  const block = document.getElementById('dklaLecturesData');
  if (!block) return;
  const decks = JSON.parse(block.textContent);
  const keyOf = (deck) => deck.course + '-' + deck.number;
  const names = { contracts: 'Contracts', lrs: 'LRS' };
  const esc = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (char) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[char],
    );
  const byKey = new Map(decks.map((deck) => [keyOf(deck), deck]));
  const byNode = new Map();
  const byChart = new Map();
  let lectureRouteOpen = false;
  const hashFor = (deck, offset) => '#lecture=' + keyOf(deck) + ':' + (offset + 1);
  // A note's slides are numbered within its own file: the class deck, or the class's second
  // deck (deck.supplement, e.g. LRS Class 4's War Powers problem) when the note says so.
  const formatSlides = (item, deck) =>
    (item.deck === 'supplement' && deck?.supplement ? deck.supplement.title + ' · ' : '') +
    (item.slides.length === 1 ? 'Slide ' : 'Slides ') +
    item.slides.join(', ');

  // The syllabus title of a class, from the course records in the open graph, when there is one.
  function syllabusTitle(course, number) {
    const graph = typeof data === 'object' && data ? data : {};
    if (course === 'contracts') return graph.corpus?.assignmentTitles?.[number] || '';
    if (course === 'lrs') return graph.lrsCorpus?.classes?.find((c) => c.number === number)?.topic || '';
    return '';
  }
  // Said plainly wherever a class without a slide deck is opened, instead of showing nothing.
  function noDeckHTML(course, number) {
    const title = syllabusTitle(course, number);
    return `<section class="lecture-deck lecture-none" aria-label="Lecture notes">
      <h3>No lecture slides on file</h3>
      <p>No slides are on file for ${esc(names[course] + ' Class ' + number)}${title ? ' (' + esc(title) + ')' : ''}, so DKLA has no lecture notes for it. The class's readings and Atlas entries are unaffected.</p>
    </section>`;
  }

  function index(map, values, record) {
    for (const value of values) {
      if (!map.has(value)) map.set(value, []);
      map.get(value).push(record);
    }
  }
  function relatedLinks(item) {
    return [
      ...item.nodes.map((id) => {
        const title = nodesById.get(id)?.title || id;
        return `<a data-lecture-jump href="#node=${encodeURIComponent(id)}">${esc(title)}</a>`;
      }),
      ...(item.charts || []).map((id) => `<a data-lecture-jump href="#flowchart=${id}">Flowchart ${id}</a>`),
    ].join(' ');
  }

  function topicHTML(deck, item, offset, isConflict = false) {
    const label = formatSlides(item, deck);
    return `<article class="lecture-note${isConflict ? ' lecture-conflict' : ''}" tabindex="-1" id="lecture-${keyOf(deck)}-${offset + 1}">
      <h4>${esc(item.heading)}</h4>
      <p>${esc(item.body)}</p>
      <span class="lecture-pinpoint">${esc(label)}</span>
      <div class="lecture-links">${relatedLinks(item)}
        ${item.authority ? `<a href="${esc(item.authority.url)}" target="_blank" rel="noopener noreferrer">${esc(item.authority.label)} ↗</a>` : ''}
      </div>
    </article>`;
  }

  function classBody(deck) {
    const sourceLabel = [deck.title, deck.date, deck.slideCount + ' slides'].filter(Boolean).join(' · ');
    return `<section class="lecture-deck" aria-label="Lecture notes">
      <h3>From the lecture slides</h3>
      <p class="lecture-pinpoint" title="${esc(deck.file)}">${esc(sourceLabel)}</p>
      ${
        deck.supplement
          ? `<p class="lecture-pinpoint" title="${esc(deck.supplement.file)}">${esc(deck.supplement.title + ' · ' + deck.supplement.slideCount + ' slides')}</p>`
          : ''
      }
      ${deck.topics.map((item, i) => topicHTML(deck, item, i)).join('')}
      ${deck.conflicts.length ? '<h3>Source differences and clarifications</h3>' : ''}
      ${deck.conflicts.map((item, i) => topicHTML(deck, item, deck.topics.length + i, true)).join('')}
    </section>`;
  }

  for (const deck of decks) {
    [...deck.topics, ...deck.conflicts].forEach((item, offset) => {
      const record = { deck, item, offset };
      index(byNode, item.nodes, record);
      index(byChart, item.charts || [], record);
    });
  }

  const sessionHTML = (course, number) => {
    const deck = byKey.get(course + '-' + number);
    return deck
      ? `<details class="lecture-session" open><summary>Lecture notes · ${deck.topics.length} topics</summary>${classBody(deck)}</details>`
      : `<details class="lecture-session" open><summary>Lecture notes · no slides on file</summary>${noDeckHTML(course, number)}</details>`;
  };

  function relatedHTML(records) {
    if (!records?.length) return '';
    return `<details class="lecture-related"><summary>Lecture context · ${records.length} notes</summary>
      ${records
        .map(
          ({ deck, item, offset }) =>
            `<article class="lecture-note">
          <h4><a data-lecture-jump href="${hashFor(deck, offset)}">${esc(item.heading)}</a></h4>
          <p>${esc(item.body)}</p>
          <span class="lecture-pinpoint">${names[deck.course]} Class ${deck.number} · ${esc(formatSlides(item, deck))}</span>
        </article>`,
        )
        .join('')}
    </details>`;
  }

  const inspector = document.getElementById('inspector');
  const beforeInspector = renderInspector;
  renderInspector = function (...args) {
    const result = beforeInspector.apply(this, args);
    const records = selected?.type === 'node' && byNode.get(selected.id);
    const reading = records && inspector?.querySelector('.reader-body');
    if (reading && !reading.querySelector('.lecture-related')) {
      reading.insertAdjacentHTML('afterbegin', relatedHTML(records));
    }
    return result;
  };

  function openHash() {
    const match = location.hash.match(/^#lecture=((?:lrs|contracts)-\d+)(?::(\d+))?$/);
    if (!match) {
      if (lectureRouteOpen && document.querySelector('#modalBody > .lecture-deck')) closeModal();
      lectureRouteOpen = false;
      return;
    }
    const deck = byKey.get(match[1]);
    lectureRouteOpen = true;
    if (!deck) {
      const [course, number] = match[1].split('-');
      modal(names[course] + ' · Class ' + Number(number), noDeckHTML(course, Number(number)));
      return;
    }
    modal(names[deck.course] + ' · Class ' + deck.number, classBody(deck));
    const topic = match[2] && document.getElementById('lecture-' + match[1] + '-' + match[2]);
    if (topic) {
      topic.scrollIntoView({ block: 'start' });
      topic.focus({ preventScroll: true });
    }
  }

  // Jump from the existing session modal or topic without leaving it over the target.
  document.addEventListener('click', (event) => {
    const jump = event.target.closest('a[data-lecture-jump]');
    if (!jump || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)
      return;
    if (jump.closest('#modal')) closeModal();
  });
  window.addEventListener('hashchange', openHash);
  window.DKLALectures = {
    sessionHTML,
    chartHTML: (id) => relatedHTML(byChart.get(id)),
    open: (id) => {
      const hash = '#lecture=' + id;
      if (location.hash === hash) openHash();
      else location.hash = hash;
    },
  };
  if (location.hash.startsWith('#lecture=')) openHash();
})();
