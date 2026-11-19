// Style conformance for the v3.2 design language (docs/DESIGN.md): what a view actually renders, measured from
// computed styles, against the scales in src/features/v31/tokens.css. Import `conformance(page, rootSelector)`
// from a Playwright script after putting the page in the view to measure; it returns the off-scale values with
// examples, so a view can be driven to zero and kept there.
export const SCALE = {
  fontSizes: [12, 13, 14, 16, 17, 19, 22, 30, 34],
  radii: [0, 6, 12, 999],
  spacing: [0, 1, 2, 4, 8, 12, 16, 24, 32, 48, 64],
  fontWeights: [400, 500, 600],
  controlMin: 36,
};

export async function conformance(page, root = 'body') {
  return page.evaluate(
    ({ root, SCALE }) => {
      const host = document.querySelector(root);
      if (!host) return { error: `no ${root}` };
      const seen = (map, key, el) => {
        const entry = (map[key] ||= { n: 0, examples: [] });
        entry.n += 1;
        if (entry.examples.length < 3) {
          const cls =
            typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
          entry.examples.push(
            `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls ? '.' + cls : ''}`,
          );
        }
      };
      const out = {
        fontSizes: {},
        fontFamilies: {},
        fontWeights: {},
        radii: {},
        spacing: {},
        borders: {},
        colours: {},
        small: {},
        nested: 0,
        elements: 0,
      };
      const visible = (el) => {
        const r = el.getBoundingClientRect();
        return (
          r.width > 0 &&
          r.height > 0 &&
          r.bottom > 0 &&
          r.top < innerHeight &&
          r.right > 0 &&
          r.left < innerWidth
        );
      };
      for (const el of host.querySelectorAll('*')) {
        if (el.closest('svg') && el.tagName !== 'svg') continue;
        if (!visible(el)) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
        out.elements += 1;
        const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (hasText) {
          const size = Math.round(parseFloat(cs.fontSize) * 10) / 10;
          if (!SCALE.fontSizes.includes(size)) seen(out.fontSizes, size, el);
          const weight = +cs.fontWeight;
          if (!SCALE.fontWeights.includes(weight)) seen(out.fontWeights, weight, el);
          seen(out.fontFamilies, cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), el);
          seen(out.colours, cs.color, el);
        }
        const radius = Math.round(parseFloat(cs.borderTopLeftRadius));
        if (radius && !SCALE.radii.includes(Math.min(radius, 999)) && radius < 100)
          seen(out.radii, radius, el);
        for (const prop of [
          'paddingTop',
          'paddingRight',
          'paddingBottom',
          'paddingLeft',
          'rowGap',
          'columnGap',
          'marginTop',
          'marginBottom',
        ]) {
          const v = Math.round(parseFloat(cs[prop]));
          if (v > 0 && v < 80 && !SCALE.spacing.includes(v)) seen(out.spacing, `${v}`, el);
        }
        const bordered = ['Top', 'Right', 'Bottom', 'Left'].filter(
          (s) => parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== 'none',
        );
        if (bordered.length === 4) {
          seen(out.borders, cs.borderTopColor, el);
          let p = el.parentElement;
          while (p && p !== host) {
            const pc = getComputedStyle(p);
            if (
              parseFloat(pc.borderTopWidth) > 0 &&
              parseFloat(pc.borderLeftWidth) > 0 &&
              pc.borderTopStyle !== 'none'
            ) {
              out.nested += 1;
              break;
            }
            p = p.parentElement;
          }
        }
        if (el.matches('button, a[href], [role="button"], input, select, summary')) {
          const r = el.getBoundingClientRect();
          if (Math.min(r.height, r.width) < SCALE.controlMin - 0.5)
            seen(out.small, `${Math.round(r.width)}x${Math.round(r.height)}`, el);
        }
      }
      const total = (m) => Object.values(m).reduce((a, e) => a + e.n, 0);
      out.summary = {
        elements: out.elements,
        offScaleFontSizes: Object.keys(out.fontSizes).length,
        offScaleWeights: Object.keys(out.fontWeights).length,
        typefaces: Object.keys(out.fontFamilies).length,
        textColours: Object.keys(out.colours).length,
        offScaleRadii: Object.keys(out.radii).length,
        offGridSpacing: total(out.spacing),
        borderColours: Object.keys(out.borders).length,
        boxedElements: total(out.borders),
        boxesInsideBoxes: out.nested,
        smallTargets: total(out.small),
      };
      return out;
    },
    { root, SCALE },
  );
}
