/* One plain-English introduction per case, from data/takeaways.json.
   The full brief retains the legal rule and analysis. This renderer does not repeat
   them under the introduction or write display text into the saved graph. */
(function () {
  'use strict';
  const T = window.DKLABriefs && window.DKLABriefs.data && window.DKLABriefs.data.takeaways;
  const panel = document.getElementById('inspector');
  if (!T || !panel) return;
  function paint() {
    if (panel.hidden) return;
    const id = typeof selected !== 'undefined' && selected && selected.type === 'node' ? selected.id : null;
    const text = id && T[id];
    const rule = panel.querySelector('.reader-body .takeaway');
    if (!text || !rule || rule.dataset.r22 === id) return;
    // Remove the inherited label and replace the compact rule with the explanation.
    // The legal analysis remains in the case sections and source brief.
    const label = rule.previousElementSibling && rule.previousElementSibling.classList.contains('dkla-rule-label') ? rule.previousElementSibling : null;
    if (label) label.remove();
    const plain = document.createElement('p'); plain.className = 'r22-plain-text'; plain.textContent = text;
    rule.replaceChildren(plain);
    rule.classList.add('r22-plain'); rule.dataset.r22 = id;
  }
  new MutationObserver(paint).observe(panel, { childList: true, subtree: true });
  paint();
  window.DKLATakeaways = { count: Object.keys(T).length, for: id => T[id] || null };
})();
