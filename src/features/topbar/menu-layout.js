/* The ☰ menu in columns (owner, 12 November 2026: "the hamburger menu is too long to be usable").

   Many layers add their items to the menu (the base notebook items, Study, Supporting cases, the guided
   walkthrough, timelines, Rules & authorities, the calm top bar's group, patch notes): one list of 27
   rows, taller than the window. DKLA is used on landscape screens, so the menu is laid out as a panel of
   four short columns instead: Study, Explore, Your notes and DKLA. Each item is moved, not copied, so
   its own handlers keep working; two duplicates are dropped ("Save a backup" opened the same window as
   "Save & import", and "Study" the same drill as "Recall drill"). An item this file does not know goes
   under DKLA, so nothing is ever lost. It runs after every layer has drawn the menu (a MutationObserver
   on the menu), however the layers are ordered. */
(() => {
  'use strict';
  const menu = document.getElementById('moreMenu');
  if (!menu || menu.dataset.dklaColumns) return;
  menu.dataset.dklaColumns = '1';
  const label = (b) => b.textContent.replace(/\s+/g, ' ').trim();
  const EXPLORE = ['courses', 'outline', 'class', 'book'];
  const NOTES = ['add', 'connect', 'path', 'undo'];
  const EXPLORE_LABELS = ['Supporting cases', 'Doctrine timelines', 'Rules & authorities'];
  function columnOf(b) {
    if (/^(drill|pairs|sheets|progress)$/.test(b.dataset.r18Open || '')) return 'Study';
    if (EXPLORE.includes(b.dataset.action) || b.dataset.shOpen || EXPLORE_LABELS.includes(label(b)))
      return 'Explore';
    if (NOTES.includes(b.dataset.action)) return 'Your notes';
    return 'DKLA';
  }
  const order = (b) => {
    const i = EXPLORE.indexOf(b.dataset.action);
    if (i >= 0) return i;
    const j = EXPLORE_LABELS.indexOf(label(b));
    if (j >= 0) return 10 + j;
    if (b.dataset.shOpen) return 20;
    if (b.dataset.action === 'save') return -1; // saving comes first in its column
    if (b.dataset.dklaPatch) return 99; // the curiosity comes last
    return 50;
  };
  function layout() {
    const loose = [...menu.children].filter((c) => !c.classList.contains('dkla-menu-col'));
    if (!loose.length) return;
    const buttons = [...menu.querySelectorAll('button')];
    const cols = new Map(['Study', 'Explore', 'Your notes', 'DKLA'].map((name) => [name, []]));
    let drill = 0;
    for (const b of buttons) {
      if (b.dataset.dklaTop === 'save') continue; // the same window as "Save & import"
      if (b.dataset.r18Open === 'drill' && (label(b) === 'Study' || drill++)) continue; // one drill entry
      if (b.dataset.action === 'save') b.textContent = 'Save a backup or import';
      cols.get(columnOf(b)).push(b);
    }
    const frag = document.createDocumentFragment();
    for (const [name, list] of cols) {
      if (!list.length) continue;
      const col = document.createElement('div');
      col.className = 'dkla-menu-col';
      col.setAttribute('role', 'group');
      col.setAttribute('aria-label', name);
      const head = document.createElement('small');
      head.textContent = name;
      col.append(
        head,
        ...list
          .map((b, i) => [b, i])
          .sort((x, y) => order(x[0]) - order(y[0]) || x[1] - y[1])
          .map((x) => x[0]),
      );
      frag.append(col);
    }
    menu.replaceChildren(frag);
    menu.classList.add('dkla-menu-grid');
  }
  const watch = new MutationObserver(() => {
    watch.disconnect();
    try {
      layout();
    } finally {
      watch.observe(menu, { childList: true });
    }
  });
  watch.observe(menu, { childList: true });
  if (!menu.hidden) layout();
})();
