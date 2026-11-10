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
      <div><div class="ask-eyebrow">DANNY KIND LEGAL ATLAS</div><h2 id="dklaAskTitle">Ask DKLA</h2></div>
      <button type="button" class="ask-close" aria-label="Close Ask DKLA">×</button>
    </header>
    <p class="ask-intro">Research a legal question across the Atlas and, when needed, the web.</p>
    <form class="ask-form">
      <label for="dklaAskQuestion">Your question</label>
      <div><textarea id="dklaAskQuestion" rows="2" required maxlength="600" autocomplete="off" enterkeyhint="send" placeholder="What do you want to understand?"></textarea>
      <button type="submit">Ask</button></div>
    </form>
    <p class="ask-scope" hidden></p>
    <div class="ask-examples">
      <p>Try a question</p>
      <button type="button">How did International Shoe change Pennoyer?</button>
      <button type="button">Is Iqbal one of the five most cited cases ever?</button>
    </div>
    <div class="ask-progress">
      <p class="ask-status" role="status"></p>
      <button type="button" class="ask-cancel" hidden>Cancel</button>
    </div>
    <div class="ask-answer"></div>
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
  let request;
  let scopedEntry;
  let openingSource = false;

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

  function render({ paragraphs, sources, search: searchStatus }) {
    if (!Array.isArray(paragraphs) || !Array.isArray(sources)) throw Error('Invalid answer');
    if (!paragraphs.length) {
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
      heading.textContent = 'Sources';
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
    answer.append(content);
    status.textContent =
      searchStatus === 'unavailable'
        ? 'Answer from the Atlas. Web search was unavailable.'
        : searchStatus === 'searched'
          ? 'Answer ready. Web search completed.'
          : 'Answer ready.';
  }

  function setResearching(active) {
    submit.disabled = active;
    input.readOnly = active;
    cancel.hidden = !active;
    answer.setAttribute('aria-busy', String(active));
  }

  async function ask() {
    const question = input.value.trim();
    if (!question || request) return;
    const node = /\b(?:this|that|the open|the current) (?:case|entry|rule|decision)\b/i.test(question)
      ? scopedEntry
      : null;
    scopeLabel.hidden = !node;
    scopeLabel.textContent = node ? 'Using the open entry · ' + node.title : '';
    examples.hidden = true;
    answer.replaceChildren();
    if (!navigator.onLine) {
      status.textContent = 'Ask DKLA needs an internet connection. Atlas search still works offline.';
      return;
    }
    const controller = new AbortController();
    request = controller;
    setResearching(true);
    status.textContent = 'Looking for relevant sources…';
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        credentials: 'omit',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question, node: node?.id }),
        signal: controller.signal,
      });
      if (request !== controller) return;
      if (response.status === 429) {
        const problem = await response.json().catch(() => null);
        if (request !== controller) return;
        status.textContent =
          problem?.error === 'usage-limit'
            ? 'Ask DKLA has reached its current AI allowance. Atlas search is still available.'
            : 'Ask DKLA is busy. Try again in a minute.';
      } else if (response.status === 503 || response.status === 404) {
        status.textContent = 'AI answers are unavailable here. You can still search the Atlas.';
      } else if (response.ok) {
        const result = await response.json();
        if (request === controller) render(result);
      } else {
        throw Error('Answer unavailable');
      }
    } catch {
      if (request === controller) status.textContent = 'Ask DKLA couldn’t finish that answer. Try again.';
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
  cancel.addEventListener('click', () => {
    request?.abort();
    request = null;
    setResearching(false);
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
    input.value = question;
    status.textContent = '';
    scopeLabel.hidden = true;
    examples.hidden = Boolean(question);
    answer.replaceChildren();
    dialog.showModal();
    input.focus();
    if (question) ask();
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ask-search';
  button.setAttribute('aria-haspopup', 'dialog');
  button.innerHTML = '<strong>✦ Ask DKLA</strong><small>Get an AI answer with Atlas and web sources</small>';
  button.addEventListener('click', () => {
    const question = search.value.trim();
    if (question.length <= 600) launch(question);
  });
  window.DKLAAsk = {
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
