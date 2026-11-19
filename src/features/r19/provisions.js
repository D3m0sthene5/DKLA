/* r19.5: the text of the provision inside each rule entry. Federal statutes and Federal Rules are the
   current text from the Legal Information Institute; Restatement, UCC and Consumer Contracts sections are the
   black letter from the supplements on file. Collected by fetch_provisions.py into data/provisions.json. */
(function () {
  'use strict';
  const P = window.DKLABriefs && window.DKLABriefs.data && window.DKLABriefs.data.provisions;
  const panel = document.getElementById('inspector');
  if (!P || !panel) return;
  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  function paint() {
    if (panel.hidden) return;
    const id = typeof selected !== 'undefined' && selected && selected.type === 'node' ? selected.id : null;
    const p = id && P[id],
      old = panel.querySelector('.r19-prov');
    if (!p) {
      old?.remove();
      return;
    }
    const body = panel.querySelector('.reader-body');
    if (!body) return;
    // v3.2: where the block sits is decided in one place (src/features/v25/reading.js keeps every
    // block of the reader in one order); this layer draws it once and leaves it where it is put.
    if (old && old.dataset.id === id && old.parentNode === body) return;
    old?.remove();
    const size = p.lines.reduce((n, l) => n + l[1].length, 0);
    const box = document.createElement('section');
    box.className = 'r19-prov';
    box.dataset.id = id;
    const open = p.url
      ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">Open at LII ↗</a>`
      : `<button type="button" data-dkla-file="${esc(p.file)}">Open the page ↗</button>`;
    const note =
      p.kind === 'lii'
        ? `${esc(p.source)}, read ${esc(p.fetched)}.`
        : `${esc(p.source.replace(/, on file\)/, ')'))}.`;
    box.innerHTML = `<details${size < 2600 ? ' open' : ''}><summary>Text of the provision <small>${esc(p.cite)}</small></summary>
      <div class="r19-prov-text">${p.lines.map((l) => `<p style="--v32-indent:${Math.min(l[0], 5)}">${esc(l[1])}</p>`).join('')}</div>
      <p class="r19-prov-src">${note} ${open}</p></details>`;
    body.appendChild(box);
  }
  // The icon caption is written once per render by an earlier layer; keep it matched to the open entry.
  function caption() {
    const cap = panel.querySelector('.dkla-icon-caption');
    if (!cap) return;
    const id = typeof selected !== 'undefined' && selected && selected.type === 'node' ? selected.id : null;
    const meta = id && window.DKLA && window.DKLA.iconFor ? window.DKLA.iconFor(id) : null;
    if (!meta || meta.status !== 'unique' || !meta.label) cap.remove();
    else if (cap.textContent !== meta.label) cap.textContent = meta.label;
  }
  new MutationObserver(() => {
    paint();
    caption();
  }).observe(panel, { childList: true, subtree: true });
  paint();
})();
