(() => {
  'use strict';
  if (!['http:', 'https:'].includes(location.protocol)) return;

  const search = document.getElementById('search');
  const results = document.getElementById('searchResults');
  const dialog = document.createElement('dialog');
  dialog.id = 'dklaAskDialog';
  dialog.setAttribute('aria-labelledby', 'dklaAskTitle');
  dialog.innerHTML = `
    <header class="ask-heading">
      <div><div class="ask-eyebrow">DANNY KIND LEGAL ATLAS</div><h2 id="dklaAskTitle">Ask Dottie</h2></div>
      <button type="button" class="ask-close" aria-label="Close Ask Dottie">×</button>
    </header>
    <p class="ask-intro">Research a legal question across the Atlas and, when needed, the web.</p>
    <form class="ask-form">
      <div class="ask-form-head"><label for="dklaAskQuestion">Your question</label><button type="button" class="ask-new" hidden>New question</button></div>
      <div><textarea id="dklaAskQuestion" rows="2" required maxlength="600" autocomplete="off" enterkeyhint="send" placeholder="What do you want to understand?"></textarea>
      <button type="submit">Ask</button></div>
    </form>
    <p class="ask-scope" hidden></p>
    <div class="ask-examples">
      <p class="ask-examples-label">Try a question</p>
      <button type="button">How did International Shoe change Pennoyer?</button>
      <button type="button">Is Iqbal one of the five most cited cases ever?</button>
    </div>
    <div class="ask-progress">
      <p class="ask-status" role="status"></p>
      <button type="button" class="ask-cancel" hidden>Cancel</button>
    </div>
    <div class="ask-answer"></div>
    <section class="ask-earlier" aria-labelledby="dklaAskEarlier" hidden>
      <h3 id="dklaAskEarlier">Earlier in this conversation</h3>
      <div class="ask-earlier-list"></div>
    </section>
    <footer>Questions go to the OpenAI API. Avoid entering private details. <a href="/privacy.html">Privacy</a></footer>`;
  document.body.appendChild(dialog);

  const form = dialog.querySelector('form');
  const input = form.querySelector('textarea');
  const submit = form.querySelector('button');
  const status = dialog.querySelector('.ask-status');
  const answer = dialog.querySelector('.ask-answer');
  const scopeLabel = dialog.querySelector('.ask-scope');
  const examples = dialog.querySelector('.ask-examples');
  const cancel = dialog.querySelector('.ask-cancel');
  const label = form.querySelector('label');
  const newQuestion = form.querySelector('.ask-new');
  const earlier = dialog.querySelector('.ask-earlier');
  const earlierList = earlier.querySelector('.ask-earlier-list');
  const placeholder = input.placeholder;
  // The conversation so far: answered turns as { question, answer } (answer is
  // plain text). The browser sends the last three with a follow-up so Dottie
  // knows what "that case" means. Follow-ups are never stored on the server.
  let turns = [];
  let current = null;
  let request;
  let scopedEntry;
  let openingSource = false;
  // Filled in by saved.js (saved answers): answered(...) after each answer,
  // recall(question, node) for one the person saved in this browser.
  const hooks = {};

  // Dottie Docket (dottie.js) appears in one place at a time, beside the line
  // that describes the current state. She is decorative: every state is still
  // announced by the status line, and she is absent if her artwork is missing.
  const dottie = window.DKLADottie;
  const mascot = document.createElement('span');
  mascot.className = 'ask-dottie';
  mascot.setAttribute('aria-hidden', 'true');
  const examplesLabel = examples.querySelector('.ask-examples-label');
  const progress = dialog.querySelector('.ask-progress');
  const peek = new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        if (entry.isIntersecting) {
          entry.target.classList.add('is-peeking');
          peek.unobserve(entry.target);
        }
    },
    { root: dialog, threshold: 0.9 },
  );

  // Each state has a pool of poses. She picks one at random, never the same
  // pose twice running, so visitors see her whole range. Anything that went
  // wrong (offline, busy, unavailable, failed, or no answer) is always possum.
  const pools = {
    idle: ['curious', 'bookmark', 'hanging', 'carrying'],
    research: ['reading', 'rummaging', 'fetching'],
    answer: ['carrying', 'bookmark'],
    trouble: ['possum'],
  };
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  let lastPose;
  let shuffle;
  function choose(pool) {
    const options = pool.length > 1 ? pool.filter((pose) => pose !== lastPose) : pool;
    return options[Math.floor(Math.random() * options.length)];
  }

  // state: idle | research | answer | trouble | null (hidden).
  // joeys: on an answer, the number of cited sources she carries.
  function setDottie(state, joeys) {
    clearInterval(shuffle);
    peek.disconnect();
    mascot.className = 'ask-dottie';
    if (!dottie || !state) return mascot.remove();
    const show = () => {
      const pose = choose(pools[state]);
      lastPose = pose;
      mascot.dataset.state = state;
      mascot.dataset.pose = pose;
      // On the empty dialog any joeys are just along for the ride.
      mascot.innerHTML = dottie.svg(pose, state === 'answer' ? joeys : Math.floor(Math.random() * 4));
    };
    show();
    if (state === 'idle') examplesLabel.append(mascot);
    else if (state !== 'answer') progress.prepend(mascot);
    // While a search runs she keeps busy, changing pose every few seconds.
    if (state === 'research' && !calm.matches)
      shuffle = setInterval(() => {
        show();
        mascot.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 260 });
      }, 4500);
    return mascot;
  }

  const openers = {
    node: (id) => goNode(id, true),
    brief: (id) => window.DKLABriefs.open(null, id),
    term: (id) => window.DKLA.openTerm(id),
    authority: (id) => window.DKLAAuthorities.open(id),
    timeline: (id) => window.DKLATimelines.open(id),
    scotus: (id) => window.SCOTUSHistory.case(id),
    justice: (id) => window.SCOTUSHistory.justice(id),
  };

  function webUrl(source) {
    if (source.type !== 'web' || typeof source.url !== 'string') return null;
    try {
      const url = new URL(source.url);
      return url.protocol === 'https:' && !url.username && !url.password ? url : null;
    } catch {
      return null;
    }
  }

  function sourceLink(source, label, url) {
    if (url) {
      const link = document.createElement('a');
      link.href = url.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', 'Open web source: ' + source.title + ' (new tab)');
      link.title = source.title + ' · ' + url.hostname;
      link.textContent = label;
      return link;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.title = source.title;
    button.setAttribute('aria-label', 'Open source: ' + source.title);
    button.addEventListener('click', () => {
      openingSource = true;
      dialog.close();
      openers[source.type]?.(source.id);
    });
    return button;
  }

  // origin: { kind: 'local' | 'library', savedAt } for an answer saved earlier
  // in this browser or kept in the shared answer library; absent for a new one.
  function render(
    result,
    question,
    origin = result.cached ? { kind: 'library', savedAt: result.savedAt } : null,
  ) {
    const { paragraphs, sources, search: searchStatus } = result;
    if (!Array.isArray(paragraphs) || !Array.isArray(sources)) throw Error('Invalid answer');
    if (!paragraphs.length) {
      setDottie('trouble');
      status.textContent =
        searchStatus === 'unavailable'
          ? 'The Atlas did not have enough evidence, and web search was unavailable. Try again or add a case name or citation.'
          : searchStatus === 'searched'
            ? 'The sources I found did not establish an answer. Try narrowing the court, date range, or meaning of the question.'
            : 'I couldn’t find enough evidence to answer that. Try naming a case, rule, or topic.';
      return;
    }

    // Preserve the API’s citation numbers even when an invalid link must be omitted.
    const links = sources.map((source) => {
      if (!source || typeof source.title !== 'string') return null;
      const url = webUrl(source);
      return url || (Object.hasOwn(openers, source.type) && typeof source.id === 'string')
        ? { source, url }
        : null;
    });
    const cited = new Set();
    const content = document.createDocumentFragment();
    const asked = document.createElement('p');
    asked.className = 'ask-asked';
    asked.textContent = question;
    content.append(asked);
    for (const paragraph of paragraphs) {
      const p = document.createElement('p');
      p.textContent = paragraph.text;
      for (const number of new Set(paragraph.citations)) {
        const link = links[number - 1];
        if (!Number.isInteger(number) || !link) continue;
        const citation = sourceLink(link.source, String(number), link.url);
        citation.className = link.url ? 'ask-citation ask-citation-web' : 'ask-citation';
        cited.add(number);
        p.append(' ', citation);
      }
      content.append(p);
    }

    if (cited.size) {
      const heading = document.createElement('h3');
      heading.className = 'ask-sources-heading';
      heading.textContent = 'Sources';
      // The signature moment: Dottie peeks up from behind the sources carrying
      // her docket, one joey per cited source (up to three). On a phone the
      // sources are often below the fold, so she waits until they scroll in.
      const carrier = setDottie('answer', cited.size);
      if (carrier) {
        carrier.classList.add('ask-dottie-peek');
        heading.append(carrier);
      }
      const list = document.createElement('ol');
      list.className = 'ask-sources';
      for (const number of [...cited].sort((a, b) => a - b)) {
        const { source, url } = links[number - 1];
        const row = document.createElement('li');
        row.value = number;
        const details = document.createElement('small');
        const origin = document.createElement('span');
        origin.className = url ? 'ask-origin ask-origin-web' : 'ask-origin';
        origin.textContent = url ? 'Web' : 'Atlas';
        const description = url ? url.hostname : source.category;
        details.append(origin, description ? ' ' + description : '');
        row.append(sourceLink(source, source.title, url), details);
        list.append(row);
      }
      content.append(heading, list);
    }
    if (!cited.size) setDottie(null);
    answer.append(content);
    // origin.after: a saved follow-up shown again keeps the question it followed.
    const after = origin?.after ?? turns.at(-1)?.question;
    hooks.answered?.({ question, node: lastNode, after, result, origin, answer });
    current = {
      question,
      answer: paragraphs
        .map((paragraph) => paragraph.text)
        .join('\n\n')
        .slice(0, 2000),
    };
    followUpMode(true);
    input.value = '';
    if (cited.size && mascot.isConnected) peek.observe(mascot);
    status.textContent = origin
      ? origin.kind === 'local'
        ? 'Answer from your saved answers.'
        : 'Saved answer ready.'
      : searchStatus === 'unavailable'
        ? 'Answer from the Atlas. Web search was unavailable.'
        : searchStatus === 'searched'
          ? 'Answer ready. Web search completed.'
          : 'Answer ready.';
  }

  function followUpMode(on) {
    label.textContent = on ? 'Ask a follow-up' : 'Your question';
    input.placeholder = on ? 'Ask a follow-up, or tap New question to start over' : placeholder;
    newQuestion.hidden = !on;
  }

  // Before a follow-up, the answer on screen folds into "Earlier in this conversation".
  function archiveCurrent() {
    if (!current) return;
    const turn = document.createElement('details');
    turn.className = 'ask-turn';
    const summary = document.createElement('summary');
    summary.textContent = current.question;
    turn.append(summary, ...answer.childNodes);
    turn.querySelector('.ask-asked')?.remove();
    earlierList.prepend(turn);
    earlier.hidden = false;
    turns.push(current);
    current = null;
  }

  function startOver() {
    request?.abort();
    request = null;
    setResearching(false);
    turns = [];
    current = null;
    earlierList.replaceChildren();
    earlier.hidden = true;
    answer.replaceChildren();
    followUpMode(false);
    status.textContent = '';
    scopeLabel.hidden = true;
  }

  function setResearching(active) {
    submit.disabled = active;
    input.readOnly = active;
    cancel.hidden = !active;
    answer.setAttribute('aria-busy', String(active));
  }

  // options.question: ask this instead of the box; options.node: ask about
  // this entry ({ id, title }, or null for none) instead of the open one;
  // options.fresh: ask the server for a new answer (no saved or library
  // answer); options.replace: the new answer takes the place of the one on
  // screen instead of following it.
  let lastNode;
  async function ask(options = {}) {
    const question = (options.question ?? input.value).trim();
    if (!question || request) return;
    const node =
      options.node !== undefined
        ? options.node
        : /\b(?:this|that|the open|the current) (?:case|entry|rule|decision)\b/i.test(question)
          ? scopedEntry
          : null;
    lastNode = node;
    scopeLabel.hidden = !node;
    scopeLabel.textContent = node ? 'Using the open entry · ' + (node.title || node.id) : '';
    examples.hidden = true;
    if (options.replace) current = null;
    else archiveCurrent();
    answer.replaceChildren();
    // A first question the person saved before opens at once from this browser.
    const kept = !turns.length && !options.fresh && hooks.recall?.(question, node?.id);
    if (kept) return render(kept.answer, question, { kind: 'local', savedAt: kept.savedAt });
    if (!navigator.onLine) {
      setDottie('trouble');
      status.textContent = 'Ask Dottie needs an internet connection. Atlas search still works offline.';
      return;
    }
    const controller = new AbortController();
    request = controller;
    setResearching(true);
    setDottie('research');
    status.textContent = 'Looking for relevant sources…';
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        credentials: 'omit',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          question,
          node: node?.id,
          fresh: options.fresh || undefined,
          history: turns.length
            ? turns.slice(-3).map((turn) => ({ question: turn.question, answer: turn.answer }))
            : undefined,
        }),
        signal: controller.signal,
      });
      if (request !== controller) return;
      if (response.status === 429) {
        const problem = await response.json().catch(() => null);
        if (request !== controller) return;
        setDottie('trouble');
        status.textContent =
          problem?.error === 'usage-limit'
            ? 'Ask Dottie has reached its current AI allowance. Atlas search is still available.'
            : 'Ask Dottie is busy. Try again in a minute.';
      } else if (response.status === 503 || response.status === 404) {
        setDottie('trouble');
        status.textContent = 'AI answers are unavailable here. You can still search the Atlas.';
      } else if (response.ok) {
        const result = await response.json();
        if (request === controller) render(result, question);
      } else {
        throw Error('Answer unavailable');
      }
    } catch {
      if (request === controller) {
        setDottie('trouble');
        status.textContent = 'Ask Dottie couldn’t finish that answer. Try again.';
      }
    } finally {
      if (request === controller) {
        request = null;
        setResearching(false);
      }
    }
  }

  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    form.requestSubmit();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    ask();
  });
  examples.addEventListener('click', (event) => {
    const example = event.target.closest('button');
    if (!example || request) return;
    input.value = example.textContent;
    input.focus();
  });
  newQuestion.addEventListener('click', () => {
    startOver();
    examples.hidden = false;
    setDottie('idle');
    input.value = '';
    input.focus();
  });
  cancel.addEventListener('click', () => {
    request?.abort();
    request = null;
    setResearching(false);
    setDottie(null);
    status.textContent = 'Search canceled.';
    input.focus();
  });
  dialog.querySelector('.ask-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    request?.abort();
    request = null;
    setResearching(false);
    if (!openingSource) search.focus();
    openingSource = false;
  });

  function launch(question = '') {
    const active = typeof selected !== 'undefined' && selected;
    scopedEntry =
      active?.type === 'node' && !document.getElementById('inspector').hidden
        ? nodesById.get(active.id)
        : null;
    closeSearch();
    // Reopening without a new question returns to the conversation in progress.
    if (!question && (current || turns.length)) {
      dialog.showModal();
      input.focus();
      return;
    }
    startOver();
    input.value = question;
    examples.hidden = Boolean(question);
    setDottie(question ? null : 'idle');
    dialog.showModal();
    input.focus();
    if (question) ask();
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ask-search';
  button.setAttribute('aria-haspopup', 'dialog');
  button.innerHTML =
    '<strong>' +
    (dottie ? '<span class="ask-launch-face" aria-hidden="true">' + dottie.svg('face') + '</span>' : '✦ ') +
    'Ask Dottie</strong><small>Get an AI answer with Atlas and web sources</small>';
  button.addEventListener('click', () => {
    const question = search.value.trim();
    if (question.length <= 600) launch(question);
  });
  // A permanent Ask Dottie button in the top bar, just right of the course
  // name, with Dottie hanging from its top edge by her tail. It opens the
  // dialog straight away, without going through search.
  const bar = document.createElement('button');
  bar.type = 'button';
  bar.className = 'ask-bar';
  bar.setAttribute('aria-haspopup', 'dialog');
  bar.innerHTML =
    (dottie ? '<span class="ask-bar-dottie" aria-hidden="true">' + dottie.svg('dangle') + '</span>' : '') +
    '<span class="ask-bar-label">Ask Dottie</span>';
  bar.addEventListener('click', () => launch());
  search.closest('.study-search')?.before(bar);

  window.DKLAAsk = {
    hooks,
    dialog,
    status,
    ask,
    // Show an answer saved in this browser as the start of a new conversation.
    show(entry) {
      startOver();
      examples.hidden = true;
      lastNode = entry.node ? { id: entry.node, title: entry.nodeTitle } : null;
      scopeLabel.hidden = !lastNode;
      scopeLabel.textContent = lastNode ? 'Using the open entry · ' + (lastNode.title || lastNode.id) : '';
      render(entry.answer, entry.question, { kind: 'local', savedAt: entry.savedAt, after: entry.after });
    },
    showInSearch() {
      results.replaceChildren(button);
      S.searchOpen = true;
      results.hidden = false;
      search.setAttribute('aria-expanded', 'true');
    },
  };
  new MutationObserver(() => {
    const question = search.value.trim();
    const questionLike =
      question.endsWith('?') ||
      /^(?:compare|describe|explain|summarize|what|why|who|when|where|how|which|can|could|did|does|do|is|are|was|were|would)\b/i.test(
        question,
      );
    if (!results.hidden && questionLike && question.length <= 600 && !button.isConnected)
      results.prepend(button);
  }).observe(results, { childList: true });
})();
