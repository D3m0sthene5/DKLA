/* r22: a plain-English takeaway under the rule line. tools/r19/data/takeaways.json holds one or two sentences per
   case, written from the audited brief only, saying what the case means and what to take from it. Display only:
   nothing is written into the saved graph. The block sits right after the "Rule in one line" callout. */
(function () {
  'use strict';
  const T = window.DKLABriefs && window.DKLABriefs.data && window.DKLABriefs.data.takeaways;
  const panel = document.getElementById('inspector');
  if (!T || !panel) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function paint() {
    if (panel.hidden) return;
    const id = typeof selected !== 'undefined' && selected && selected.type === 'node' ? selected.id : null;
    const text = id && T[id], old = panel.querySelector('.r22-plain');
    if (!text) { old?.remove(); return; }
    const rule = panel.querySelector('.reader-body .takeaway'); if (!rule) { old?.remove(); return; }
    if (old && old.dataset.id === id && old.previousElementSibling === rule) return;
    old?.remove();
    const box = document.createElement('section'); box.className = 'r22-plain'; box.dataset.id = id;
    box.innerHTML = `<p class="dkla-rule-label r22-plain-label">In plain English</p><p class="r22-plain-text">${esc(text)}</p>`;
    rule.after(box);
  }
  new MutationObserver(paint).observe(panel, { childList: true, subtree: true });
  paint();
  window.DKLATakeaways = { count: Object.keys(T).length, for: id => T[id] || null };
})();
