/* v3.1 whole U.S. Code: exact citations in the Atlas search box.

   An exact citation ("20 USC 1001", "20 U.S.C. § 1001", "title 20 section 1001", "§ 1001 of title 20")
   adds one result, labelled "U.S. Code", above the search results. Nothing else in the search changes:
   whole-Code sections are in no search index, so a word search never lists them.

   The search calls DKLAUSCode.addCitationResult(query, resultsElement) once, right after it draws its
   results (src/runtime/dklaR13Search.js, the line marked "whole U.S. Code"). The browsing itself, and
   the loading of uscode/title-N.json, are in src/features/v25/authorities.js. */
(() => {
  'use strict';
  const E = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  // A section number: digits, then letters, then any hyphenated parts ("1001", "2000e-2", "78u-4", "599A").
  const SECTION = '(\\d+[a-z]*(?:\\s*[-\\u2010-\\u2013]\\s*\\d+[a-z]*)*)';
  // A trailing subsection, "(a)(1)(B)", is allowed and ignored.
  const SUB = '(?:\\s*\\([a-z0-9]+\\))*';
  const USCODE = 'u\\.?\\s*s\\.?\\s*c(?:ode)?\\.?(?:\\s*a\\.?)?';
  const SIGN = '(?:\\u00a7{1,2}|sec(?:tion|s|\\.)?|s\\.)';
  const FORMS = [
    // 20 USC 1001 · 20 U.S.C. § 1001 · 20 usc §1001 · 20 U.S.C. sec. 1001
    new RegExp(`^(\\d{1,2})\\s*${USCODE}\\s*${SIGN}?\\s*${SECTION}${SUB}$`, 'i'),
    // title 20 section 1001 · title 20, § 1001 · title 20 U.S.C. § 1001
    new RegExp(
      `^title\\s+(\\d{1,2})\\s*,?\\s*(?:of\\s+the\\s+)?(?:${USCODE}\\s*|united\\s+states\\s+code\\s*)?,?\\s*${SIGN}\\s*${SECTION}${SUB}$`,
      'i',
    ),
  ];
  // § 1001 of title 20 · section 1001 of title 20, United States Code
  const REVERSED = new RegExp(
    `^${SIGN}\\s*${SECTION}${SUB}\\s*,?\\s*of\\s+title\\s+(\\d{1,2})\\s*(?:,?\\s*(?:of\\s+the\\s+)?(?:united\\s+states\\s+code|${USCODE}))?$`,
    'i',
  );
  function parse(q) {
    const s = String(q || '')
      .replace(/ /g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[.;,]$/, '');
    let title = null,
      section = null,
      m;
    for (const form of FORMS)
      if ((m = s.match(form))) {
        [title, section] = [m[1], m[2]];
        break;
      }
    if (!title && (m = s.match(REVERSED))) [section, title] = [m[1], m[2]];
    if (!title) return null;
    title = Number(title);
    if (title < 1 || title > 54) return null;
    return { title, section: section.replace(/\s+/g, '').replace(/[‐-–]/g, '-') };
  }
  const code = () => window.DKLAAuthorities?.uscode;
  function row(c, strong, small, ready) {
    return `<div class="search-label">U.S. Code</div><button type="button" class="uscode-search-result" data-uscode-cite="${c.title}|${E(c.section)}"${ready ? '' : ' aria-busy="true"'}><strong>${strong}</strong><small>${small}</small></button>`;
  }
  function addCitationResult(q, list) {
    list?.querySelector('.uscode-search')?.remove();
    const c = parse(q),
      api = code();
    if (!list || !c || !api?.has(c.title)) return;
    const box = document.createElement('div');
    box.className = 'uscode-search';
    const cite = `${c.title} U.S.C. § ${c.section}`;
    box.innerHTML = row(c, E(cite), 'Finding this section in Title ' + c.title + '…', false);
    list.prepend(box);
    api.find(c.title, c.section).then(
      (hit) => {
        if (!box.isConnected) return;
        if (!hit) {
          box.innerHTML = row(
            c,
            E(cite),
            E(
              `Title ${c.title} has no section ${c.section} in release ${api.release}. Open Title ${c.title}`,
            ),
            true,
          );
          return;
        }
        const e = hit.entry;
        box.innerHTML = row(
          c,
          E(e.cite + (e.title ? ' · ' + e.title : '')),
          E(hit.held ? 'U.S. Code · full text in DKLA' : 'U.S. Code · ' + hit.trail.join(' › ')),
          true,
        );
      },
      () => {
        if (box.isConnected)
          box.innerHTML = row(
            c,
            E(cite),
            E(api.failed(c.title) || 'Title ' + c.title + ' could not be loaded.'),
            true,
          );
      },
    );
  }
  document.addEventListener(
    'click',
    (ev) => {
      const b = ev.target.closest('[data-uscode-cite]');
      if (!b) return;
      ev.preventDefault();
      ev.stopPropagation();
      const [t, s] = b.dataset.uscodeCite.split('|');
      if (typeof closeSearch === 'function') closeSearch();
      code()?.openCitation(t, s);
    },
    true,
  );
  window.DKLAUSCode = { parse, addCitationResult };
})();
