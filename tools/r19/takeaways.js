/* r22: a plain-English takeaway with the rule line. tools/r19/data/takeaways.json holds one or two sentences per
   case, written from the audited brief only, saying what the case means and what to take from it. Display only:
   nothing is written into the saved graph. r22.1: the two no longer sit as separate boxes (the owner found that
   redundant); the rule callout becomes one box that leads with the plain-English line and carries the rule in
   one line beneath it in smaller type. */
(function () {
  'use strict';
  const T = window.DKLABriefs && window.DKLABriefs.data && window.DKLABriefs.data.takeaways;
  const panel = document.getElementById('inspector');
  if (!T || !panel) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function paint() {
    if (panel.hidden) return;
    const id = typeof selected !== 'undefined' && selected && selected.type === 'node' ? selected.id : null;
    const text = id && T[id];
    const rule = panel.querySelector('.reader-body .takeaway');
    if (!text || !rule || rule.dataset.r22 === id) return;
    // the rule callout as the panel drew it: its label sits just before it
    const label = rule.previousElementSibling && rule.previousElementSibling.classList.contains('dkla-rule-label') ? rule.previousElementSibling : null;
    if (label) label.textContent = 'In plain English';
    const sub = document.createElement('div'); sub.className = 'r22-rule-sub';
    sub.innerHTML = '<span class="r22-rule-sub-label">Rule in one line</span>';
    const keep = document.createElement('div'); keep.className = 'r22-rule-text';
    while (rule.firstChild) keep.appendChild(rule.firstChild);
    sub.appendChild(keep);
    const plain = document.createElement('p'); plain.className = 'r22-plain-text'; plain.textContent = text;
    rule.appendChild(plain); rule.appendChild(sub);
    rule.classList.add('r22-plain'); rule.dataset.r22 = id;
  }
  new MutationObserver(paint).observe(panel, { childList: true, subtree: true });
  paint();
  window.DKLATakeaways = { count: Object.keys(T).length, for: id => T[id] || null };
})();
