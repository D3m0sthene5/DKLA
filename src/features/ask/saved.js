/* Saved Dottie answers: a private library kept only in this browser.

   "Save answer" under an answer keeps the question and the answer exactly as
   shown (its paragraphs and numbered sources, so the citations still open the
   Atlas entry or web page) in localStorage under dkla.askSaved.v1. Nothing
   here is ever sent to the server. localStorage, not a cookie: a cookie goes
   to the server with every request and holds about 4 KB; localStorage stays
   in the browser and holds megabytes. Saved answers last until the person
   deletes them or clears this site's data.

   "Saved answers (N)" in the dialog lists them, newest first, with a filter.
   Asking a first question that matches a saved one (same normalised question
   and open entry) shows the saved answer at once, with "Ask again" for a new
   one. This file also writes the line above an answer that came from the
   shared answer library on the server ("Saved answer from ... · Ask fresh"). */
(() => {
  'use strict';
  const api = window.DKLAAsk;
  if (!api?.hooks) return;
  const KEY = 'dkla.askSaved.v1';
  const { dialog, status } = api;

  // The same normalisation as the server's answer library (lib/ask/library.js,
  // normalise()); tools/ask/browser.mjs checks that the two agree. Only case,
  // accents, spacing, punctuation and a "please"/"thanks" at the very start
  // or end are ignored; every other word counts.
  const leading = /^please\b[\s,]*/;
  const trailing = /[,.?!;:]\s*(?:please|thanks|thank\s+you)[\s.!?]*$/;
  function normalise(question) {
    let value = String(question)
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .replace(/[‘’ʼ`]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[‐-―]/g, '-')
      .toLowerCase()
      .trim();
    for (let changed = true; changed; ) {
      changed = false;
      for (const pattern of [leading, trailing]) {
        const next = value.replace(pattern, '').trim();
        if (next !== value && next) {
          value = next;
          changed = true;
        }
      }
    }
    value = value
      .replace(/\bcan't\b|\bcannot\b/g, 'can not')
      .replace(/\bwon't\b/g, 'will not')
      .replace(/n't\b/g, ' not')
      .replace(/§/g, ' section ')
      .replace(/\bsec\.\s*(?=\d)/g, 'section ')
      .replace(/\b(?:vs?\.?|versus)(?=\s)/g, ' v ')
      .replace(/(\d)\s+\(/g, '$1(');
    const tokens = value.match(
      /\d+[a-z]?(?:\([a-z0-9]+\))+|\d+(?:[-.:/,]\d+)*[a-z]*|\p{L}+(?:\d+[a-z]*)?|[$%&+<>=≤≥#]/gu,
    );
    return (tokens || []).join(' ');
  }

  // Only what is needed to show the answer again.
  function keepable({ paragraphs, sources, search }) {
    return {
      paragraphs: paragraphs.map(({ text, citations }) => ({
        text: String(text),
        citations: Array.isArray(citations) ? citations.filter(Number.isInteger) : [],
      })),
      sources: sources.map((source) =>
        source && typeof source === 'object'
          ? Object.fromEntries(
              ['type', 'id', 'title', 'category', 'url']
                .filter((field) => typeof source[field] === 'string')
                .map((field) => [field, source[field]]),
            )
          : null,
      ),
      ...(typeof search === 'string' && { search }),
    };
  }
  const valid = (entry) =>
    entry &&
    typeof entry.id === 'string' &&
    typeof entry.question === 'string' &&
    typeof entry.savedAt === 'string' &&
    Array.isArray(entry.answer?.paragraphs) &&
    Array.isArray(entry.answer?.sources);

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || 'null');
      return Array.isArray(data?.answers) ? data.answers.filter(valid) : [];
    } catch {
      return [];
    }
  }
  // Throws when the browser refuses (storage full, or site data blocked).
  function persist(list) {
    if (list.length) localStorage.setItem(KEY, JSON.stringify({ version: 1, answers: list }));
    else localStorage.removeItem(KEY);
  }
  function problem(error) {
    status.textContent =
      error?.name === 'QuotaExceededError' || error?.code === 22
        ? 'This answer couldn’t be saved: this browser’s storage for DKLA is full. Delete some saved answers or free up space, then try again.'
        : 'Saving answers isn’t available in this browser window (site data may be blocked or private browsing may be on).';
  }

  const sameQuestion = (entry, key, node, after) =>
    normalise(entry.question) === key && (entry.node || '') === (node || '') && !entry.after === !after;
  const sameText = (a, b) =>
    a.paragraphs.map((p) => p.text).join('\n') === b.paragraphs.map((p) => p.text).join('\n');
  const day = (iso) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? 'an earlier visit'
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Every Save button on screen, with the answer it saves.
  const buttons = new Map();
  function syncButtons(list = load()) {
    for (const [button, record] of buttons) {
      if (!button.isConnected) {
        buttons.delete(button);
        continue;
      }
      const key = normalise(record.question);
      const saved = list.some(
        (entry) =>
          sameQuestion(entry, key, record.node, record.after) && sameText(entry.answer, record.answer),
      );
      button.setAttribute('aria-pressed', String(saved));
      button.textContent = saved ? '✓ Saved' : 'Save answer';
      button.title = saved
        ? 'Saved in this browser. Select to remove it.'
        : 'Keep this answer in this browser';
    }
    count(list);
  }

  function toggle(record) {
    let list = load();
    const key = normalise(record.question);
    const match = (entry) => sameQuestion(entry, key, record.node, record.after);
    const existing = list.find((entry) => match(entry) && sameText(entry.answer, record.answer));
    try {
      if (existing) {
        persist(list.filter((entry) => entry !== existing));
        status.textContent = 'Removed from your saved answers.';
      } else {
        const replaced = list.some(match);
        // One saved answer per question: a newer one replaces the older.
        // There is no other limit: nothing is ever dropped without the person
        // deleting it. A full browser store gives the message in problem().
        list = list.filter((entry) => !match(entry));
        list.unshift({
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
          question: record.question,
          ...(record.node && { node: record.node, nodeTitle: record.nodeTitle }),
          ...(record.after && { after: record.after }),
          savedAt: new Date().toISOString(),
          answer: record.answer,
        });
        persist(list);
        status.textContent = replaced
          ? 'Saved in this browser, replacing your earlier saved answer to this question.'
          : 'Saved in this browser. Only you can see it here.';
      }
    } catch (error) {
      problem(error);
    }
    syncButtons();
    if (!panel.hidden) fill();
  }

  // After each answer: where it came from, and a Save button.
  api.hooks.answered = ({ question, node, after, result, origin, answer }) => {
    if (origin) {
      const line = document.createElement('p');
      line.className = 'ask-from';
      const again = document.createElement('button');
      again.type = 'button';
      if (origin.kind === 'local' && after) {
        // A saved follow-up: asked again on its own it would lose the
        // conversation it followed, so there is no Ask again.
        line.append(
          'From your saved answers (saved ' + day(origin.savedAt) + ') · follow-up to “' + after + '”',
        );
      } else if (origin.kind === 'local') {
        line.append('From your saved answers (saved ' + day(origin.savedAt) + ') · ');
        again.textContent = 'Ask again';
        again.setAttribute('aria-label', 'Ask again for a new answer');
      } else {
        line.append('Saved answer from ' + day(origin.savedAt) + ' · ');
        again.textContent = 'Ask fresh';
        again.setAttribute('aria-label', 'Ask fresh: research this question again');
      }
      // Asked about the same entry as the answer shown, not whatever is open now.
      again.addEventListener('click', () => {
        if (!again.closest('.ask-answer')) return;
        api.ask({ question, node: node ?? null, fresh: true, replace: true });
      });
      if (again.textContent) line.append(again);
      const asked = answer.querySelector('.ask-asked');
      if (asked) asked.after(line);
      else answer.prepend(line);
    }
    const row = document.createElement('div');
    row.className = 'ask-save-row';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ask-save';
    const record = {
      question,
      node: node?.id,
      nodeTitle: node?.title,
      after,
      answer: keepable(result),
    };
    button.addEventListener('click', () => toggle(record));
    buttons.set(button, record);
    row.append(button);
    answer.append(row);
    syncButtons();
  };

  // Before a first question goes to the server: one the person saved?
  api.hooks.recall = (question, node) => {
    const key = normalise(question);
    return load().find((entry) => sameQuestion(entry, key, node, undefined)) ?? null;
  };

  // "Saved answers (N)" beside the close button, and the list it opens.
  const close = dialog.querySelector('.ask-close');
  const tools = document.createElement('div');
  tools.className = 'ask-heading-tools';
  const opener = document.createElement('button');
  opener.type = 'button';
  opener.className = 'ask-saved-open';
  opener.setAttribute('aria-expanded', 'false');
  close.before(tools);
  tools.append(opener, close);

  const panel = document.createElement('section');
  panel.className = 'ask-saved';
  panel.hidden = true;
  panel.setAttribute('aria-labelledby', 'dklaAskSavedTitle');
  panel.innerHTML = `
    <div class="ask-saved-head"><h3 id="dklaAskSavedTitle">Saved answers</h3><button type="button" class="ask-saved-back">Back to Ask Dottie</button></div>
    <p class="ask-saved-note">Kept only in this browser, until you delete them or clear this site’s data. Nobody else can see them.</p>
    <label for="dklaAskSavedFilter">Filter saved answers</label>
    <input id="dklaAskSavedFilter" type="search" autocomplete="off" placeholder="Words in the question or answer">
    <ol class="ask-saved-list"></ol>
    <p class="ask-saved-empty" role="status"></p>`;
  dialog.querySelector('.ask-heading').after(panel);
  const filter = panel.querySelector('input');
  const items = panel.querySelector('.ask-saved-list');
  const empty = panel.querySelector('.ask-saved-empty');

  function count(list = load()) {
    // "Saved (N)" on a phone, where the heading has little room.
    opener.innerHTML = 'Saved<span class="ask-saved-long"> answers</span> (' + list.length + ')';
    opener.setAttribute('aria-label', 'Saved answers (' + list.length + ')');
    opener.hidden = !list.length && panel.hidden;
  }

  function fill() {
    const list = load().sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
    const terms = filter.value.toLowerCase().split(/\s+/).filter(Boolean);
    const shown = list.filter((entry) => {
      const text = (
        entry.question +
        ' ' +
        (entry.after || '') +
        ' ' +
        entry.answer.paragraphs.map((p) => p.text).join(' ')
      ).toLowerCase();
      return terms.every((term) => text.includes(term));
    });
    items.replaceChildren(
      ...shown.map((entry) => {
        const row = document.createElement('li');
        const open = document.createElement('button');
        open.type = 'button';
        open.className = 'ask-saved-item';
        const question = document.createElement('span');
        question.textContent = entry.question;
        const details = document.createElement('small');
        const cited = new Set(entry.answer.paragraphs.flatMap((p) => p.citations)).size;
        details.textContent =
          'Saved ' +
          day(entry.savedAt) +
          ' · ' +
          cited +
          (cited === 1 ? ' source' : ' sources') +
          (entry.after ? ' · follow-up to “' + entry.after + '”' : '');
        open.append(question, details);
        open.addEventListener('click', () => {
          hide();
          api.show(entry);
        });
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'ask-saved-delete';
        remove.textContent = 'Delete';
        remove.setAttribute('aria-label', 'Delete saved answer: ' + entry.question);
        remove.addEventListener('click', () => {
          try {
            persist(load().filter((other) => other.id !== entry.id));
          } catch (error) {
            problem(error);
          }
          const next = row.nextElementSibling ?? row.previousElementSibling;
          fill();
          syncButtons();
          empty.textContent = (empty.textContent ? empty.textContent + ' ' : '') + 'Deleted.';
          (next && items.contains(next) ? next.querySelector('.ask-saved-delete') : filter).focus();
        });
        row.append(open, remove);
        return row;
      }),
    );
    empty.textContent = !list.length
      ? 'No saved answers yet. Use “Save answer” under an answer to keep it here.'
      : shown.length
        ? ''
        : 'No saved answer matches that filter.';
  }

  function show() {
    filter.value = '';
    fill();
    panel.hidden = false;
    dialog.classList.add('ask-browsing');
    opener.setAttribute('aria-expanded', 'true');
    filter.focus();
  }
  function hide() {
    panel.hidden = true;
    dialog.classList.remove('ask-browsing');
    opener.setAttribute('aria-expanded', 'false');
    count();
  }
  opener.addEventListener('click', () => (panel.hidden ? show() : hide()));
  panel.querySelector('.ask-saved-back').addEventListener('click', () => {
    hide();
    dialog.querySelector('textarea').focus();
  });
  filter.addEventListener('input', fill);
  dialog.addEventListener('close', hide);
  // Another tab saved or deleted something.
  addEventListener('storage', (event) => {
    if (event.key !== KEY && event.key !== null) return;
    syncButtons();
    if (!panel.hidden) fill();
  });
  count();
  window.DKLAAskSaved = { normalise, key: KEY };
})();
