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
      <div><div class="ask-eyebrow">DKLA · AI STUDY ASSISTANT</div><h2 id="dklaAskTitle">Ask DKLA</h2></div>
      <button type="button" class="ask-close" aria-label="Close Ask DKLA">×</button>
    </header>
    <form class="ask-form">
      <label for="dklaAskQuestion">Your question</label>
      <div><textarea id="dklaAskQuestion" rows="2" required maxlength="600" autocomplete="off" enterkeyhint="send" placeholder="What changed after International Shoe?"></textarea>
      <button type="submit">Ask</button></div>
    </form>
    <p class="ask-scope" hidden></p>
    <p class="ask-status" role="status"></p>
    <div class="ask-answer"></div>
    <footer>Questions go to Gemini via Vercel AI Gateway. Avoid entering private details.</footer>`;
  document.body.appendChild(dialog);

  const form = dialog.querySelector('form');
  const input = form.querySelector('textarea');
  const submit = form.querySelector('button');
  const status = dialog.querySelector('.ask-status');
  const answer = dialog.querySelector('.ask-answer');
  const scopeLabel = dialog.querySelector('.ask-scope');
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

  function sourceButton(source, label) {
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

  function render({ paragraphs, sources }) {
    if (!paragraphs.length) {
      status.textContent =
        'I couldn’t find enough in the Atlas to answer that. Try naming a case, rule, or topic.';
      return;
    }
    for (const paragraph of paragraphs) {
      const p = document.createElement('p');
      p.textContent = paragraph.text;
      for (const number of paragraph.citations) {
        const citation = sourceButton(sources[number - 1], String(number));
        citation.className = 'ask-citation';
        p.append(' ', citation);
      }
      answer.append(p);
    }
    const heading = document.createElement('h3');
    heading.textContent = 'Atlas sources';
    const list = document.createElement('ol');
    for (const source of sources) {
      const row = document.createElement('li');
      const kind = document.createElement('small');
      kind.textContent = source.category;
      row.append(sourceButton(source, source.title), kind);
      list.append(row);
    }
    answer.append(heading, list);
    status.textContent = 'Answer ready.';
  }

  async function ask() {
    const question = input.value.trim();
    if (!question || request) return;
    const node = /\b(?:this|that|the open|the current) (?:case|entry|rule|decision)\b/i.test(question)
      ? scopedEntry
      : null;
    scopeLabel.hidden = !node;
    scopeLabel.textContent = node ? 'Open entry · ' + node.title : '';
    answer.replaceChildren();
    if (!navigator.onLine) {
      status.textContent = 'Ask DKLA needs an internet connection. Atlas search still works offline.';
      return;
    }
    const controller = new AbortController();
    request = controller;
    submit.disabled = true;
    status.textContent = 'Looking through the Atlas…';
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
        status.textContent = 'Ask DKLA is busy. Try again in a minute.';
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
        submit.disabled = false;
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
  dialog.querySelector('.ask-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    request?.abort();
    request = null;
    submit.disabled = false;
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
    answer.replaceChildren();
    dialog.showModal();
    input.focus();
    if (question) ask();
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ask-search';
  button.setAttribute('aria-haspopup', 'dialog');
  button.innerHTML = '<strong>✦ Ask DKLA</strong><small>Get an AI answer with Atlas sources</small>';
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
