/* Patch notes (owner, 12 November 2026): "somewhere hidden in the settings menu ... a minecraft patch note
   esque explanation of every version of DKLA since inception and which features were added when".

   The last item in the ☰ menu opens a dialog: the versions down the left, newest first; the chosen
   version's name, date, one-line blurb and its New / Changed / Fixed / Removed lists on the right, with
   its smaller point releases below. The notes (window.DKLAPatchNotes, notes.js) are written from the
   changelog the page carries (dklaR18Changelog) and the post-launch updates; nothing before v9 was
   recorded, so the list starts there. Read-only: nothing is stored. */
(() => {
  'use strict';
  if (window.DKLAPatchNotesUI) return;
  const DATA = window.DKLAPatchNotes;
  if (!DATA || !Array.isArray(DATA.versions) || !DATA.versions.length) return;
  const HEADS = ['New', 'Changed', 'Fixed', 'Removed'];
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const MONTHS =
    'January February March April May June July August September October November December'.split(' ');
  const when = (d) => {
    const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(d || '');
    if (!m) return esc(d || '');
    return (m[3] ? +m[3] + ' ' : '') + MONTHS[+m[2] - 1] + ' ' + m[1];
  };
  const lists = (notes) =>
    HEADS.filter((h) => notes && Array.isArray(notes[h]) && notes[h].length)
      .map(
        (h) =>
          `<section class="pn-group pn-${h.toLowerCase()}"><h4><span>${h}</span></h4><ul>${notes[h]
            .map((b) => `<li>${esc(b)}</li>`)
            .join('')}</ul></section>`,
      )
      .join('');

  let dialog = null;
  function build() {
    dialog = document.createElement('dialog');
    dialog.id = 'patchNotesDialog';
    dialog.className = 'pn-dialog';
    dialog.setAttribute('aria-labelledby', 'pnTitle');
    dialog.innerHTML = `
      <header class="pn-head">
        <div><p class="pn-kicker">DKLA</p><h2 id="pnTitle">Patch notes</h2></div>
        <p class="pn-sub">Every version since the oldest surviving record (v9), newest first.</p>
        <button type="button" class="pn-close" aria-label="Close patch notes">×</button>
      </header>
      <div class="pn-body">
        <nav class="pn-list" aria-label="Versions">${DATA.versions
          .map(
            (v, i) =>
              `<button type="button" data-pn="${i}" aria-current="${i === 0 ? 'true' : 'false'}"><b>${esc(v.v)}</b><span>${esc(v.name || '')}</span></button>`,
          )
          .join('')}</nav>
        <article class="pn-page" tabindex="0" aria-live="polite"></article>
      </div>`;
    document.body.appendChild(dialog);
    dialog.querySelector('.pn-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close(); // the backdrop
      const b = e.target.closest('[data-pn]');
      if (b) show(+b.dataset.pn);
    });
    dialog.querySelector('.pn-list').addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const cur = +(dialog.querySelector('[data-pn][aria-current="true"]')?.dataset.pn || 0),
        next = Math.max(0, Math.min(DATA.versions.length - 1, cur + (e.key === 'ArrowDown' ? 1 : -1)));
      show(next);
      dialog.querySelector(`[data-pn="${next}"]`).focus();
    });
  }
  function show(i) {
    const v = DATA.versions[i];
    if (!v) return;
    for (const b of dialog.querySelectorAll('[data-pn]'))
      b.setAttribute('aria-current', String(+b.dataset.pn === i));
    const page = dialog.querySelector('.pn-page');
    page.innerHTML =
      `<p class="pn-date">${when(v.date)}</p><h3><span class="pn-v">${esc(v.v)}</span> ${esc(v.name || '')}</h3>` +
      (v.blurb ? `<p class="pn-blurb">${esc(v.blurb)}</p>` : '') +
      lists(v.notes) +
      (v.updates || [])
        .map(
          (u) =>
            `<div class="pn-update"><h3 class="pn-minor"><span class="pn-v">${esc(u.v)}</span><span class="pn-date">${when(u.date)}</span></h3>${lists(u.notes)}</div>`,
        )
        .join('');
    page.scrollTop = 0;
  }
  function open() {
    if (!dialog) build();
    show(0);
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('[data-pn="0"]').focus();
  }

  // The last item of the ☰ menu, after everything else (it is a curiosity, not a tool).
  if (typeof moreMenu === 'function') {
    const prior = moreMenu;
    moreMenu = function (...args) {
      const out = prior.apply(this, args);
      const menu = document.getElementById('moreMenu');
      if (menu && !menu.hidden && !menu.querySelector('[data-dkla-patch]'))
        menu.insertAdjacentHTML(
          'beforeend',
          '<hr><button role="menuitem" data-dkla-patch="1" class="pn-menu-item">Patch notes</button>',
        );
      return out;
    };
  }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#moreMenu [data-dkla-patch]')) return;
    if (typeof dismissMenu === 'function') dismissMenu();
    open();
  });
  window.DKLAPatchNotesUI = { open };
})();
