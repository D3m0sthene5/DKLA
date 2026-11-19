// Composition lint for the v3.2 design language (docs/DESIGN.md, "Editorial standard"): finds places where
// the browser, not a designer, decided how real content broke. Import `composition(page, rootSelector)` from a
// Playwright script after putting the page in the view to judge, and run it at many widths (a continuous
// resize), because these failures appear between breakpoints. It reports, with the text and the element:
//   loneSeparator   a line that holds only a separator (›, /, ·, →, |): a breadcrumb chevron on its own line
//   danglingV       a case caption line that ends with "v." or "v", splitting a party from its opponent
//   widow           a heading or short text whose last line is one short word or under a quarter of its width
//   wrappedControl  a button, tab, chip or link styled as a control whose label takes more than one line
//   crampedBesideSpace  text wrapped to 3+ lines while its container has over 30% of its width free beside it
//   centredFragments    centred text of 3+ lines (a path or label broken into stacked centred pieces)
//   tinyArt         artwork marked data-art (or a case pictogram) drawn under 32 px, or whose drawing fills
//                   less than 60% of its own box
export async function composition(page, root = 'body') {
  return page.evaluate((root) => {
    const host = document.querySelector(root);
    if (!host) return { error: `no ${root}` };
    const name = (el) => {
      const cls =
        typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
      return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls ? '.' + cls : ''}`;
    };
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return (
        r.width > 0 &&
        r.height > 0 &&
        cs.visibility !== 'hidden' &&
        +cs.opacity > 0.05 &&
        r.bottom > 0 &&
        r.top < innerHeight
      );
    };
    // The lines of text inside an element, as the browser laid them out.
    const linesOf = (el) => {
      const range = document.createRange();
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const lines = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.textContent;
        if (!text.trim()) continue;
        const parent = node.parentElement;
        if (!parent || getComputedStyle(parent).visibility === 'hidden') continue;
        for (const m of text.matchAll(/\S+/g)) {
          range.setStart(node, m.index);
          range.setEnd(node, m.index + m[0].length);
          for (const rect of range.getClientRects()) {
            if (!rect.width) continue;
            const mid = rect.top + rect.height / 2;
            let line = lines.find((l) => Math.abs(l.mid - mid) < rect.height * 0.5);
            if (!line) lines.push((line = { mid, left: rect.left, right: rect.right, words: [] }));
            line.left = Math.min(line.left, rect.left);
            line.right = Math.max(line.right, rect.right);
            line.words.push(m[0]);
            break;
          }
        }
      }
      return lines
        .sort((a, b) => a.mid - b.mid)
        .map((l) => ({ text: l.words.join(' '), width: l.right - l.left, left: l.left, right: l.right }));
    };
    const out = {
      loneSeparator: [],
      danglingV: [],
      widow: [],
      wrappedControl: [],
      crampedBesideSpace: [],
      centredFragments: [],
      tinyArt: [],
    };
    const SEP = /^[›»>\/·•→|–—-]+$/;
    const blocks = new Set();
    for (const el of host.querySelectorAll(
      'h1,h2,h3,h4,p,li,a,button,summary,label,span,div,nav,[role="tab"]',
    )) {
      if (!visible(el)) continue;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!own && !el.matches('h1,h2,h3,h4,nav,button,a,[role="tab"]')) continue;
      const text = el.textContent.replace(/\s+/g, ' ').trim();
      if (!text || text.length > 260) continue;
      if (
        [...blocks].some(
          (b) => b.contains(el) && b !== el && b.textContent.replace(/\s+/g, ' ').trim() === text,
        )
      )
        continue;
      blocks.add(el);
      const lines = linesOf(el);
      if (lines.length < 2) continue;
      const cs = getComputedStyle(el);
      const widest = Math.max(...lines.map((l) => l.width));
      const where = {
        el: name(el),
        text: text.slice(0, 90),
        lines: lines.map((l) => l.text.slice(0, 60)),
        width: Math.round(el.getBoundingClientRect().width),
        viewport: innerWidth,
      };
      if (lines.some((l) => SEP.test(l.text))) out.loneSeparator.push(where);
      if (lines.slice(0, -1).some((l) => /(^|\s)v\.?$/.test(l.text))) out.danglingV.push(where);
      const last = lines[lines.length - 1];
      const short = text.split(' ').length <= 16;
      if (
        short &&
        (last.width < widest * 0.25 || (last.text.split(' ').length === 1 && last.text.length <= 6))
      )
        out.widow.push(where);
      if (
        el.matches('button,[role="tab"],[role="button"],.chip,summary') ||
        (el.matches('a') && cs.display !== 'inline')
      )
        out.wrappedControl.push(where);
      if (lines.length >= 3 && short) {
        const box = (
          el.closest('header,section,article,nav,div') || el.parentElement
        ).getBoundingClientRect();
        const free = box.right - Math.max(...lines.map((l) => l.right));
        if (free > box.width * 0.3) out.crampedBesideSpace.push({ ...where, freePx: Math.round(free) });
        if (cs.textAlign === 'center') out.centredFragments.push(where);
      }
    }
    for (const art of host.querySelectorAll('[data-art], .case-icon, .entry-icon')) {
      if (!visible(art)) continue;
      const box = art.getBoundingClientRect();
      const svg = art.matches('svg') ? art : art.querySelector('svg');
      let fill = null;
      if (svg && svg.getBBox) {
        try {
          const b = svg.getBBox();
          const vb = svg.viewBox.baseVal;
          if (vb && vb.width) fill = Math.max(b.width / vb.width, b.height / vb.height);
        } catch {}
      }
      if (Math.max(box.width, box.height) < 32 || (fill !== null && fill < 0.6))
        out.tinyArt.push({
          el: name(art),
          px: `${Math.round(box.width)}x${Math.round(box.height)}`,
          drawingFillsBox: fill === null ? null : Math.round(fill * 100) / 100,
        });
    }
    out.summary = Object.fromEntries(
      Object.entries(out)
        .filter(([k]) => k !== 'summary')
        .map(([k, v]) => [k, v.length]),
    );
    out.viewport = `${innerWidth}x${innerHeight}`;
    return out;
  }, root);
}

// Run `fn(width)` (which should put the page in a view and return composition()) across a continuous resize.
export async function sweep(page, fn, { from = 1680, to = 390, step = 43, height = 900 } = {}) {
  const found = [];
  for (let width = from; width >= to; width -= step) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(120);
    const result = await fn(width);
    if (result?.summary && Object.values(result.summary).some(Boolean)) found.push({ width, ...result });
  }
  return found;
}
