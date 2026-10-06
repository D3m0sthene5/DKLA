/* r19.5: the text of the provision inside each rule entry. Federal statutes and Federal Rules are the
   current text from the Legal Information Institute; Restatement, UCC and Consumer Contracts sections are the
   black letter from the supplements on file. Collected by fetch_provisions.py into data/provisions.json. */
(function () {
  'use strict';
  const P = window.DKLABriefs && window.DKLABriefs.data && window.DKLABriefs.data.provisions;
  const panel = document.getElementById('inspector');
  if (!P || !panel) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function paint() {
    if (panel.hidden) return;
    const id = typeof selected !== 'undefined' && selected && selected.type === 'node' ? selected.id : null;
    const p = id && P[id], old = panel.querySelector('.r19-prov');
    if (!p) { old?.remove(); return; }
    const body = panel.querySelector('.reader-body'); if (!body) return;
    // under the title and the source chips, above the summary
    const anchor = body.querySelector(':scope > .dkla-file-chips') || body.querySelector(':scope > .civil-source-scope') || body.querySelector(':scope > .dkla-record-title');
    const placed = b => anchor ? b.previousElementSibling === anchor : b === body.firstElementChild;
    if (old && old.dataset.id === id && old.parentNode === body) { if (!placed(old)) { if (anchor) anchor.after(old); else body.prepend(old); } return; }
    old?.remove();
    const size = p.lines.reduce((n, l) => n + l[1].length, 0);
    const box = document.createElement('section'); box.className = 'r19-prov'; box.dataset.id = id;
    const open = p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">Open at LII ↗</a>` : `<button type="button" data-dkla-file="${esc(p.file)}">Open the page ↗</button>`;
    const note = p.kind === 'lii' ? `Current text from the ${esc(p.source)}, read ${esc(p.fetched)}. Your supplement may print an edited version.` : `From ${esc(p.source)}. Black letter only, taken from the file's text layer; check the page for exact wording.`;
    box.innerHTML = `<details${size < 2600 ? ' open' : ''}><summary>Text of the provision <small>${esc(p.cite)}</small></summary>
      <div class="r19-prov-text">${p.lines.map(l => `<p style="margin-left:${Math.min(l[0], 5) * 1.25}em">${esc(l[1])}</p>`).join('')}</div>
      <p class="r19-prov-src">${note} ${open}</p></details>`;
    if (anchor) anchor.after(box); else body.prepend(box);
  }
  new MutationObserver(paint).observe(panel, { childList: true, subtree: true });
  paint();
})();
