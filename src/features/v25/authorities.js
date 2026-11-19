/* Map-native authorities. Private geometry is reconstructed from source data;
 * graph records and saved homes remain untouched. S.region/selected carry the
 * route through the atlas's existing camera, inspector and Back history. */
(() => {
  'use strict';
  const block = document.getElementById('dklaAuthoritiesData');
  if (!block || typeof S === 'undefined' || typeof draw !== 'function') return;
  let D;
  try {
    D = JSON.parse(block.textContent);
  } catch {
    return;
  }
  if (!Array.isArray(D.entries) || !Array.isArray(D.collections)) return;
  const TITLE = 'Rules & authorities',
    PREFIX = 'authority:',
    ROOT = 'authority-root';
  const BOX = { x: -11400, y: 15500, w: 22800, h: 11000 };
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const fold = (s) =>
    String(s)
      .toLowerCase()
      .replace(/u\.?\s*s\.?\s*c\.?/g, 'usc')
      .replace(/\b(rule|restatement|ucc)(\d)/g, '$1 $2');
  const byId = new Map(D.entries.map((e) => [e.id, e])),
    collections = new Map(D.collections.map((c) => [c.id, c]));
  const groups = new Map(),
    leaves = new Map(),
    collectionGroups = new Map();
  const status = {
    abrogated: 'Abrogated',
    repealed: 'Repealed',
    renumbered: 'Renumbered',
    omitted: 'Omitted',
    transferred: 'Transferred',
    reserved: 'Reserved',
    'index-only': 'Index only',
    'deleted-model-section': 'Deleted model section',
    'article-index': 'Article directory',
  };
  const accent = ['#e7b078', '#86bfff', '#8dc8b1'];
  const skins = {
    constitution: {
      ink: '#dce7cd',
      edge: '#afcdb8',
      base: '#19342f',
      paper: '#203d36',
      mark: 'constitution',
    },
    frcp: { ink: '#b8d7fb', edge: '#769ecb', base: '#172c42', paper: '#20394f', mark: 'procedure' },
    uscode: { ink: '#a9dcd8', edge: '#65aaa6', base: '#152f36', paper: '#1e3c43', mark: 'code' },
    ucc: { ink: '#edc2a0', edge: '#c3926c', base: '#3a2826', paper: '#49332d', mark: 'commerce' },
    restatement: { ink: '#e5c6ba', edge: '#b5827c', base: '#35242c', paper: '#45313a', mark: 'restatement' },
    consumer: { ink: '#d5c5ef', edge: '#a58bc8', base: '#2b293e', paper: '#3a3450', mark: 'consumer' },
  };
  const shortTitles = {
    constitution: 'U.S. Const.',
    frcp: 'FRCP',
    uscode: 'U.S. Code',
    ucc: 'UCC',
    restatement: 'R2 Contracts',
    consumer: 'Consumer Contracts',
  };
  let peopleAsset = '';
  try {
    peopleAsset = JSON.parse(document.getElementById('dklaWeThePeopleAsset')?.textContent || '{}').uri || '';
  } catch {}
  // Chapter/topic boundaries follow the assigned Selections' actual TOC,
  // PDF pp.12–23. These are legal headings, not generated thematic buckets.
  const restChapters = [
    [1, 8, 'Meaning of Terms'],
    [9, 16, 'Formation · Parties and Capacity'],
    [
      17,
      70,
      'Formation · Mutual Assent',
      [
        [17, 17, 'In General'],
        [18, 23, 'Manifestation of Assent'],
        [24, 34, 'Making of Offers'],
        [35, 49, 'Duration of the Power of Acceptance'],
        [50, 70, 'Acceptance of Offers'],
      ],
    ],
    [
      71,
      109,
      'Formation · Consideration',
      [
        [71, 81, 'The Requirement of Consideration'],
        [82, 94, 'Contracts Without Consideration'],
        [95, 109, 'Contracts Under Seal; Statutory Writing'],
      ],
    ],
    [
      110,
      150,
      'The Statute of Frauds',
      [
        [110, 110, 'Classes of Contracts Covered'],
        [111, 111, 'Executor–Administrator'],
        [112, 123, 'Suretyship'],
        [124, 124, 'Marriage'],
        [125, 129, 'Land Contracts'],
        [130, 130, 'The One-Year Provision'],
        [131, 138, 'Satisfaction by a Memorandum'],
        [139, 150, 'Consequences of Non-Compliance'],
      ],
    ],
    [151, 158, 'Mistake'],
    [
      159,
      177,
      'Misrepresentation, Duress and Undue Influence',
      [
        [159, 173, 'Misrepresentation'],
        [174, 177, 'Duress and Undue Influence'],
      ],
    ],
    [
      178,
      199,
      'Unenforceability · Public Policy',
      [
        [178, 185, 'Unenforceability in General'],
        [186, 188, 'Restraint of Trade'],
        [189, 191, 'Impairment of Family Relations'],
        [192, 196, 'Other Protected Interests'],
        [197, 199, 'Restitution'],
      ],
    ],
    [
      200,
      230,
      'The Scope of Contractual Obligations',
      [
        [200, 204, 'Meaning of Agreements'],
        [205, 208, 'Fairness and the Public Interest'],
        [209, 218, 'Adoption of a Writing'],
        [219, 223, 'Usage'],
        [224, 230, 'Conditions and Similar Events'],
      ],
    ],
    [
      231,
      260,
      'Performance and Non-Performance',
      [
        [231, 234, 'Performances to Be Exchanged'],
        [235, 249, 'Effect of Performance and Non-Performance'],
        [250, 257, 'Prospective Non-Performance'],
        [258, 260, 'Application of Performances'],
      ],
    ],
    [261, 272, 'Impracticability and Frustration'],
    [
      273,
      287,
      'Discharge by Assent or Alteration',
      [
        [273, 277, 'Consideration and Discharge'],
        [278, 282, 'Substituted Performance, Accord and Account'],
        [283, 285, 'Rescission, Release and Contract Not to Sue'],
        [286, 287, 'Alteration'],
      ],
    ],
    [
      288,
      301,
      'Joint and Several Promisors and Promisees',
      [
        [288, 296, 'Joint and Several Promisors'],
        [297, 301, 'Joint and Several Promisees'],
      ],
    ],
    [302, 315, 'Contract Beneficiaries'],
    [
      316,
      343,
      'Assignment and Delegation',
      [
        [316, 316, 'Scope of This Chapter'],
        [317, 323, 'What Can Be Assigned or Delegated'],
        [324, 330, 'Mode of Assignment or Delegation'],
        [331, 333, 'Assignor and Assignee'],
        [334, 339, 'The Obligor’s Duty'],
        [340, 343, 'Assignees and Adverse Claimants'],
      ],
    ],
    [
      344,
      385,
      'Remedies',
      [
        [344, 345, 'In General'],
        [346, 356, 'Award of Damages'],
        [357, 369, 'Specific Performance and Injunction'],
        [370, 377, 'Restitution'],
        [378, 385, 'Election and Affirmance'],
      ],
    ],
  ];
  function branch(key, title, parent, description = '', collection = '') {
    const n = { key, title, parent, description, collection, children: [], count: 0 };
    groups.set(key, n);
    if (parent) parent.children.push(n);
    return n;
  }
  function leaf(e, parent) {
    const n = {
      key: PREFIX + e.id,
      title: e.title,
      label: e.cite,
      parent,
      collection: e.collection,
      entry: e,
      count: 1,
    };
    parent.children.push(n);
    leaves.set(e.id, n);
    return n;
  }
  const entryName = (e) => (e.cite === e.title ? e.cite : e.cite + ' · ' + e.title);
  const ruleNumber = (e) =>
    e.id === 'frcp-71A' ? 71.15 : e.id === 'frcp-forms' ? Infinity : Number(e.id.replace('frcp-', ''));
  function shortNumber(e) {
    return e.section || e.cite.replace(/^.*(?:§ |Rule |Article |Amendment )/, '');
  }
  function chunk(parent, entries, size = 8, label = 'Sections') {
    for (let i = 0; i < entries.length; i += size) {
      const part = entries.slice(i, i + size),
        n = branch(
          parent.key + '/range-' + i,
          part[0].title,
          parent,
          'Numbered reading range',
          parent.collection,
        ),
        first = shortNumber(part[0]),
        last = shortNumber(part[part.length - 1]);
      n.range = first === last ? `${label.replace(/s$/, '')} ${first}` : `${label} ${first}–${last}`;
      part.forEach((e) => leaf(e, n));
    }
  }
  function file(parent, entries, label = 'Sections') {
    if (entries.length > 12) chunk(parent, entries, 8, label);
    else entries.forEach((e) => leaf(e, parent));
  }
  function keyed(entries, key) {
    const out = new Map();
    for (const e of entries) {
      const k = key(e);
      if (!out.has(k)) out.set(k, []);
      out.get(k).push(e);
    }
    return out;
  }
  /* ---------- the whole United States Code (v3.1) ----------
     Every title, its official structure and every section's number and heading, from
     uscode/title-N.json (tools/uscode/build_index.py; release in uscode-titles.js). A title's file
     is fetched only when the title is opened or an exact citation in it is searched, and kept in
     the page's own cache (dkla-uscode-v1) once its SHA-256 matches, so a title opened once also
     opens offline. Sections DKLA holds in full (tools/v25/uscode.json) open their full text as
     before; any other section opens a short page with its place in the title and a link to the
     official text. None of this is in any search index. */
  const USC = window.DKLAUSCodeTitles,
    WHOLE = PREFIX + 'uscode/all',
    uscTitles = new Map(), // title number -> its node under WHOLE
    uscFiles = new Map(), // title number -> Promise of the parsed file
    uscReady = new Map(), // title number -> parsed file
    uscFailed = new Map(), // title number -> message
    virtual = new Map(), // pseudo-entry id -> pseudo-entry
    vleaves = new Map(), // pseudo-entry id -> its leaf
    wholeAt = new Map(), // entry id -> its leaf in the whole Code (held entries keep their own place)
    held = new Map(); // "title|section" -> the full-text entries DKLA holds
  for (const e of D.entries)
    if (e.collection === 'uscode') {
      const k = e.titleNumber + '|' + String(e.section).toLowerCase();
      if (!held.has(k)) held.set(k, []);
      held.get(k).push(e);
    }
  const KIND = {
    subtitle: 'Subtitle',
    chapter: 'Chapter',
    subchapter: 'Subchapter',
    part: 'Part',
    subpart: 'Subpart',
    division: 'Division',
    subdivision: 'Subdivision',
    title: 'Title',
    article: 'Article',
    compiledAct: 'Act',
  };
  const officialURL = (t, num) =>
    'https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title' +
    t +
    '-section' +
    encodeURIComponent((String(num).match(/\d+[A-Za-z]*(?:-\d+)?/) || [num])[0]) +
    '&num=0&edition=prelim';
  const citeOf = (t, num) => `${t} U.S.C. ${/,| to /.test(num) ? '§§' : '§'} ${num}`;
  function wholeCode(parent) {
    if (!Array.isArray(USC?.titles)) return;
    const all = branch(
      WHOLE,
      'All 54 titles',
      parent,
      `Every title, chapter and section heading · current through Public Law ${USC.release}`,
      'uscode',
    );
    all.whole = true;
    for (const [t, name, count] of USC.titles) {
      const n = branch(
        WHOLE + '/t' + t,
        `Title ${t} · ${name}`,
        all,
        count ? count.toLocaleString('en-US') + ' sections' : 'Reserved title',
        'uscode',
      );
      Object.assign(n, { whole: true, uscTitle: t, badge: 'Title ' + t, name });
      uscTitles.set(t, n);
      waiting(n, count ? 'Opening Title ' + t + '…' : 'Title 53 is reserved. It holds no sections.');
    }
  }
  // A title not yet loaded shows one card saying so; the card itself does nothing when clicked.
  function waiting(n, message) {
    for (const c of n.children) groups.delete(c.key);
    n.children = [];
    const w = branch(n.key + '/status', message, n, '', 'uscode');
    Object.assign(w, { whole: true, placeholder: true, name: message });
  }
  async function verifiedTitle(t) {
    const row = USC.titles.find((x) => x[0] === t);
    if (!row) throw Error('Title ' + t + ' is not in the Code');
    const url = new URL('uscode/title-' + t + '.json', document.baseURI).href;
    const check = async (response) => {
      if (!response?.ok) throw Error('unavailable');
      const bytes = await response.arrayBuffer(),
        digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      if (digest !== row[3]) throw Error('changed');
      return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    };
    let cache = null;
    try {
      cache = await caches.open('dkla-uscode-v1');
      const hit = await cache.match(url);
      if (hit)
        try {
          return await check(hit);
        } catch {
          await cache.delete(url);
        }
    } catch {
      /* No storage: the title still opens while online. */
    }
    const response = await fetch(url, { credentials: 'same-origin', cache: 'no-cache' });
    const data = await check(response.clone());
    try {
      await cache?.put(url, response);
    } catch {
      /* A full disk must not hide the title. */
    }
    return data;
  }
  function loadTitle(t) {
    t = Number(t);
    if (uscReady.has(t)) return Promise.resolve(uscReady.get(t));
    if (!uscFiles.has(t))
      uscFiles.set(
        t,
        verifiedTitle(t).then(
          (data) => {
            uscReady.set(t, data);
            uscFailed.delete(t);
            grow(uscTitles.get(t), data);
            return data;
          },
          (error) => {
            uscFiles.delete(t);
            const n = uscTitles.get(t),
              offline = typeof navigator !== 'undefined' && navigator.onLine === false;
            const message =
              location.protocol === 'file:'
                ? 'This copy of DKLA cannot load Title ' + t + '. Open it at dannykind.wiki.'
                : offline
                  ? 'Title ' +
                    t +
                    ' has not been opened on this device yet. It needs a connection the first time.'
                  : 'Title ' + t + ' could not be loaded. Open the title again to retry.';
            uscFailed.set(t, message);
            if (n) waiting(n, message);
            throw error;
          },
        ),
      );
    return uscFiles.get(t);
  }
  // Build a loaded title's official hierarchy under its node.
  function grow(tn, data) {
    if (!tn) return;
    for (const c of tn.children) groups.delete(c.key);
    tn.children = [];
    const order = [],
      seen = new Map(); // a number Congress used twice: the held entries are taken in order
    function sectionsInto(parent, rows) {
      const entries = rows.map((r) => {
        const [num, heading, status = '', note = ''] = r,
          k = data.title + '|' + num.toLowerCase(),
          mine = held.get(k);
        if (mine?.length) {
          const e = mine[Math.min(seen.get(k) || 0, mine.length - 1)];
          seen.set(k, (seen.get(k) || 0) + 1);
          order.push(e);
          return e;
        }
        let id = 'uscx-' + data.title + '-' + num.replace(/[^A-Za-z0-9-]+/g, '-');
        while (virtual.has(id)) id += '-2';
        const e = {
          id,
          virtual: true,
          collection: 'uscode',
          titleNumber: data.title,
          section: num,
          cite: citeOf(data.title, num),
          title: heading,
          status: status || 'text',
          editorial: note,
          source: data.source,
        };
        virtual.set(id, e);
        order.push(e);
        return e;
      });
      const add = (e, p) => {
        const n = {
          key: PREFIX + e.id,
          title: e.title,
          label: e.cite,
          parent: p,
          collection: 'uscode',
          entry: e,
          count: 1,
          whole: true,
        };
        p.children.push(n);
        if (e.virtual) vleaves.set(e.id, n);
        wholeAt.set(e.id, n);
      };
      if (entries.length <= 12) entries.forEach((e) => add(e, parent));
      else
        for (let i = 0; i < entries.length; i += 8) {
          const part = entries.slice(i, i + 8),
            r = branch(parent.key + '/s' + i, part[0].title, parent, 'Numbered reading range', 'uscode'),
            first = part[0].section,
            last = part[part.length - 1].section;
          r.whole = true;
          r.range = first === last ? 'Section ' + first : `Sections ${first}–${last}`;
          part.forEach((e) => add(e, r));
        }
    }
    function into(parent, nodes) {
      let run = [];
      const flush = () => {
        if (run.length) sectionsInto(parent, run);
        run = [];
      };
      const used = new Set();
      for (const x of nodes) {
        if (Array.isArray(x)) {
          run.push(x);
          continue;
        }
        flush();
        const kind = KIND[x.k] || 'Division',
          slug = (x.k + '-' + x.n).toLowerCase().replace(/[^a-z0-9-]+/g, '-');
        let k = parent.key + '/' + slug;
        while (used.has(k)) k += '-2';
        used.add(k);
        const label = x.n ? kind + ' ' + x.n : kind,
          n = branch(
            k,
            x.h ? label + ' — ' + x.h : label,
            parent,
            'Official statutory ' + kind.toLowerCase(),
            'uscode',
          );
        Object.assign(n, { whole: true, badge: label, name: x.h || label });
        if (x.c.length) into(n, x.c);
        else waiting(n, 'No sections in this ' + kind.toLowerCase() + ' in this release.');
      }
      flush();
    }
    into(tn, data.tree);
    if (!tn.children.length) waiting(tn, 'Title ' + data.title + ' is reserved. It holds no sections.');
    tn.order = order;
    (function count(n) {
      n.count = n.entry ? 1 : n.placeholder ? 0 : n.children.reduce((s, c) => s + count(c), 0);
      return n.count;
    })(tn);
  }
  // The section a citation names, once its title is loaded: exact number first, then the same
  // letters in another case, then a combined or numeric range that holds it ("§§ 681 to 687").
  function findSection(t, s) {
    const tn = uscTitles.get(Number(t));
    if (!tn?.order) return null;
    const want = String(s).replace(/[–‑]/g, '-');
    const exact = tn.order.filter((e) => e.section === want);
    if (exact.length) return exact[0];
    const lower = tn.order.find((e) => e.section.toLowerCase() === want.toLowerCase());
    if (lower) return lower;
    const n = /^\d+$/.test(want) ? Number(want) : null;
    return (
      tn.order.find((e) => e.section.split(/,\s*/).some((p) => p.toLowerCase() === want.toLowerCase())) ||
      (n === null
        ? null
        : tn.order.find((e) => {
            const m = e.section.match(/^(\d+) to (\d+)$/);
            return m && n >= Number(m[1]) && n <= Number(m[2]);
          })) ||
      null
    );
  }
  function wholeKey(key) {
    const m = String(key || '').match(/^authority:uscode\/all\/t(\d+)/);
    return m ? Number(m[1]) : null;
  }
  function stubHTML(e) {
    if (e.loading)
      return `<article class="authority-reading uscode-stub"><header><h2>${esc(e.cite)}</h2></header><p class="uscode-stub-lead">${esc(e.loading)}</p></article>`;
    const tn = uscTitles.get(e.titleNumber),
      order = tn?.order || [],
      i = order.indexOf(e),
      node = vleaves.get(e.id);
    const trail = [];
    for (let n = node?.parent; n && n !== tn.parent; n = n.parent) if (!n.range) trail.unshift(n);
    const s = e.source || {};
    return `<article class="authority-reading uscode-stub"><header><h2>${esc(e.cite)}<span>${esc(e.title)}</span></h2>${status[e.status] ? `<p class="authority-status">${esc(status[e.status])}</p>` : ''}</header><nav class="uscode-place" aria-label="Where this section sits"><h3>Where it sits</h3><ol>${trail.map((n, d) => `<li style="--depth:${d}"><button type="button" data-authority-group="${esc(n.key)}">${esc(n.title)}</button></li>`).join('')}</ol></nav><p class="uscode-stub-lead">DKLA lists this section's number, heading and place in the Code. Its text is not stored in DKLA: read it in the official Code.</p><p class="uscode-edition">Edition: ${esc(s.edition || '')}</p><p><a class="uscode-official" href="${esc(officialURL(e.titleNumber, e.section))}" target="_blank" rel="noopener">Read ${esc(e.cite)} at uscode.house.gov ↗</a></p>${e.editorial ? `<p class="authority-note">Editorial note in the official Code: ${esc(e.editorial)}</p>` : ''}<details class="authority-provenance"><summary>Source and edition</summary><p>${esc(s.edition || '')}. ${esc(s.official || '')}.</p><p>Section list: ${esc(s.sections || '')}. Structure: ${esc(s.hierarchy || '')}.</p><p>${esc(s.note || '')} The uscode.house.gov page shows the Code as it stands today, which may be later than this release.</p></details><nav class="authority-next" aria-label="Read in order"><button type="button" data-uscode-entry="${esc(order[i - 1]?.id || '')}"${i <= 0 ? ' disabled' : ''}>${CHEVRON_BACK}Previous</button><button type="button" data-uscode-entry="${esc(order[i + 1]?.id || '')}"${i < 0 || i >= order.length - 1 ? ' disabled' : ''}>Next${CHEVRON}</button></nav></article>`;
  }
  const root = branch(ROOT, TITLE, null);
  const titleNames = {
    3: 'The President',
    5: 'Government Organization and Employees',
    8: 'Aliens and Nationality',
    9: 'Arbitration',
    10: 'Armed Forces',
    12: 'Banks and Banking',
    13: 'Census',
    15: 'Commerce and Trade',
    18: 'Crimes and Criminal Procedure',
    19: 'Customs Duties',
    20: 'Education',
    21: 'Food and Drugs',
    25: 'Indians',
    26: 'Internal Revenue Code',
    28: 'Judiciary and Judicial Procedure',
    29: 'Labor',
    33: 'Navigation and Navigable Waters',
    34: 'Crime Control and Law Enforcement',
    35: 'Patents',
    39: 'Postal Service',
    42: 'The Public Health and Welfare',
    45: 'Railroads',
    46: 'Shipping',
    47: 'Telecommunications',
    49: 'Transportation',
  };
  const ruleTitles = [
    [1, 2, 'I · Scope of Rules; Form of Action'],
    [3, 6, 'II · Commencing an Action; Service of Process, Pleadings, Motions, and Orders'],
    [7, 16.1, 'III · Pleadings and Motions'],
    [17, 25, 'IV · Parties'],
    [26, 37, 'V · Disclosures and Discovery'],
    [38, 53, 'VI · Trials'],
    [54, 63, 'VII · Judgment'],
    [64, 71.1, 'VIII · Provisional and Final Remedies'],
    [72, 76, 'IX · Special Proceedings'],
    [77, 80, 'X · District Courts and Clerks'],
    [81, 87, 'XI · General Provisions'],
  ];
  const uccParts = {
    1: [
      'General Provisions',
      'General Definitions and Principles of Interpretation',
      'Territorial Applicability and General Rules',
    ],
    2: [
      'Short Title, General Construction and Subject Matter',
      'Form, Formation and Readjustment of Contract',
      'General Obligation and Construction of Contract',
      'Title, Creditors and Good Faith Purchasers',
      'Performance',
      'Breach, Repudiation and Excuse',
      'Remedies',
    ],
  };
  for (const c of D.collections) {
    const es = D.entries.filter((e) => e.collection === c.id),
      parent = branch(PREFIX + c.id, c.title, root, c.description, c.id);
    if (c.id === 'frcp') es.sort((a, b) => ruleNumber(a) - ruleNumber(b));
    if (c.id === 'restatement') es.sort((a, b) => Number(a.id.split('-')[1]) - Number(b.id.split('-')[1]));
    collectionGroups.set(c.id, parent);
    if (c.id === 'constitution') {
      es.filter((e) => e.id === 'const-preamble').forEach((e) => leaf(e, parent));
      const articles = branch(
        parent.key + '/articles',
        'Articles I–VII',
        parent,
        'Original constitutional articles',
        c.id,
      );
      es.filter((e) => e.id.startsWith('const-art-')).forEach((e) => leaf(e, articles));
      const amendments = branch(
        parent.key + '/amendments',
        'Amendments I–XXVII',
        parent,
        'Ratified amendments, in order',
        c.id,
      );
      for (const [lo, hi, title] of [
        [1, 10, 'Bill of Rights'],
        [11, 15, 'States, Elections and Reconstruction'],
        [16, 19, 'Taxation, Senators, Prohibition and Suffrage'],
        [20, 27, 'Government, Elections and Succession'],
      ]) {
        const n = branch(
          amendments.key + '/amendments-' + lo,
          title,
          amendments,
          'Chronological amendment group',
          c.id,
        );
        n.range = `Amendments ${lo}–${hi}`;
        es.filter((e) => {
          const v = Number(e.id.replace('const-amend-', ''));
          return e.id.startsWith('const-amend-') && v >= lo && v <= hi;
        }).forEach((e) => leaf(e, n));
      }
    } else if (c.id === 'frcp') {
      for (const [lo, hi, label] of ruleTitles) {
        const members = es.filter((e) => {
          const n = Number(e.id.replace('frcp-', '').replace('71A', '71.05'));
          return n >= lo && n <= hi;
        });
        if (lo === 81) members.push(...es.filter((e) => e.id === 'frcp-forms'));
        const n = branch(parent.key + '/title-' + lo, label, parent, 'Official FRCP title', c.id);
        file(n, members, 'Rules');
      }
    } else if (c.id === 'uscode') {
      for (const [title, ts] of keyed(es, (e) => e.titleNumber)) {
        const tn = branch(
          parent.key + '/title-' + title,
          `Title ${title} · ${titleNames[title] || 'United States Code'}`,
          parent,
          Number(title) === 28 || Number(title) === 9 ? 'Complete title' : 'Course-relevant provisions',
          c.id,
        );
        // These titles place parts above chapters. Other collected titles
        // place their parts within chapters; reversing them scrambles § order.
        const partFirst = new Set([5, 10, 18, 28, 35, 39, 49]).has(Number(title));
        const outer = partFirst ? 'part' : 'chapter',
          inner = partFirst ? 'chapter' : 'part';
        for (const [a, as] of keyed(ts, (e) => e[outer] || '')) {
          const an = a
            ? branch(
                tn.key + '/' + outer + '-' + tn.children.length,
                a,
                tn,
                'Official statutory ' + outer,
                c.id,
              )
            : tn;
          for (const [b, bs] of keyed(as, (e) => e[inner] || '')) {
            const bn = b
              ? branch(
                  an.key + '/' + inner + '-' + an.children.length,
                  b,
                  an,
                  'Official statutory ' + inner,
                  c.id,
                )
              : an;
            file(bn, bs);
          }
        }
      }
      const featured = [28, 9, 5]
        .map((t) => parent.children.find((n) => n.key.endsWith('/title-' + t)))
        .filter(Boolean);
      const other = parent.children
        .filter((n) => !featured.includes(n))
        .sort((a, b) => Number(a.key.split('/title-')[1]) - Number(b.key.split('/title-')[1]));
      parent.children = featured;
      if (other.length) {
        const more = branch(
          parent.key + '/other',
          'Other course statutes',
          parent,
          'Selected provisions in numeric title order',
          c.id,
        );
        more.children = other;
        other.forEach((n) => (n.parent = more));
      }
      wholeCode(parent);
    } else if (c.id === 'ucc') {
      for (const [article, as] of keyed(es, (e) => e.id.split('-')[1])) {
        const an = branch(
          parent.key + '/article-' + article,
          `Article ${article}`,
          parent,
          'Assigned UCC provisions',
          c.id,
        );
        for (const [part, ps] of keyed(as, (e) => Math.floor(Number(e.id.split('-')[2]) / 100))) {
          const name = uccParts[article]?.[part - 1],
            pn = branch(
              an.key + '/part-' + part,
              `Part ${part}${name ? ' · ' + name : ''}`,
              an,
              'Assigned model-code section order',
              c.id,
            );
          file(pn, ps);
        }
      }
    } else if (c.id === 'restatement') {
      restChapters.forEach(([lo, hi, title, topics], i) => {
        const n = branch(
          parent.key + '/chapter-' + (i + 1),
          title,
          parent,
          'Assigned Restatement chapter',
          c.id,
        );
        n.number = i + 1;
        n.range = `§§ ${lo}–${hi}`;
        const members = es.filter((e) => {
          const v = Number(e.id.replace('restatement-', ''));
          return v >= lo && v <= hi;
        });
        if (topics)
          for (const [a, b, name] of topics) {
            const ts = members.filter((e) => {
              const v = Number(e.id.replace('restatement-', ''));
              return v >= a && v <= b;
            });
            if (a === b) ts.forEach((e) => leaf(e, n));
            else {
              const t = branch(n.key + '/topic-' + a, name, n, 'Assigned Restatement topic', c.id);
              t.range = `§§ ${a}–${b}`;
              file(t, ts);
            }
          }
        else file(n, members);
      });
    } else if (c.id === 'ucc-articles') es.forEach((e) => leaf(e, parent));
    else file(parent, es, 'Rules');
  }
  // Related volumes share a cover, without duplicating their source leaves.
  const civil = collectionGroups.get('frcp'),
    supplemental = branch(
      civil.key + '/supplemental',
      'Supplemental Rules',
      civil,
      'Official supplemental rules',
      'frcp',
    );
  for (const id of ['admiralty', 'social-security']) {
    const n = collectionGroups.get(id);
    root.children = root.children.filter((x) => x !== n);
    n.parent = supplemental;
    supplemental.children.push(n);
  }
  const commercial = collectionGroups.get('ucc'),
    directory = collectionGroups.get('ucc-articles'),
    articles = directory.children.slice(),
    assigned = commercial.children.slice();
  commercial.children = [];
  for (const overview of articles) {
    const number = overview.entry.id.replace('ucc-article-', ''),
      n =
        assigned.find((x) => x.key.endsWith('/article-' + number)) ||
        branch(
          commercial.key + '/article-' + number,
          overview.title,
          commercial,
          'UCC article directory',
          'ucc',
        );
    if (!commercial.children.includes(n)) commercial.children.push(n);
    n.parent = commercial;
    n.title = overview.title;
    n.range = overview.label;
    overview.parent = n;
    n.children.unshift(overview);
  }
  directory.children = [];
  root.children = root.children.filter((n) => n !== directory);
  collectionGroups.set('ucc-articles', commercial);
  root.children.sort(
    (a, b) =>
      ['constitution', 'frcp', 'uscode', 'ucc', 'restatement', 'consumer'].indexOf(a.collection) -
      ['constitution', 'frcp', 'uscode', 'ucc', 'restatement', 'consumer'].indexOf(b.collection),
  );
  // Index ranges are navigational subdivisions, not invented statutory chapters.
  for (const n of [...groups.values()]) {
    // The whole Code keeps its official levels and pages through long lists instead.
    if (n.whole || n.children.length <= 24 || n.children.some((x) => x.entry)) continue;
    const children = n.children.slice();
    n.children = [];
    for (let i = 0; i < children.length; i += 8) {
      const set = children.slice(i, i + 8),
        first = set[0].title.split(' — ')[0],
        last = set[set.length - 1].title.split(' — ')[0],
        a = first.match(/^CHAPTER\s+(\w+)/),
        b = last.match(/^CHAPTER\s+(\w+)/),
        label = a && b ? `Chapters ${a[1]}–${b[1]}` : `${first} – ${last}`,
        range = branch(n.key + '/index-' + i, label, n, 'Index range', n.collection);
      range.children = set;
      set.forEach((x) => (x.parent = range));
    }
  }
  function tally(n) {
    n.count = n.entry ? 1 : n.children.reduce((sum, c) => sum + tally(c), 0);
    return n.count;
  }
  tally(root);
  const readingOrder = new Map();
  (function collect(n) {
    if (n.entry) {
      const id = n.entry.collection;
      if (!readingOrder.has(id)) readingOrder.set(id, []);
      readingOrder.get(id).push(n.entry);
    } else n.children.forEach(collect);
  })(root);
  const panel = document.getElementById('inspector'),
    active = () => S.scope === TITLE,
    current = () => {
      const group = groups.get(S.region);
      if (group?.children.length) return group;
      // A whole-Code place restored before its title has loaded: show the title and load it.
      const wt = wholeKey(S.region) ?? (selected?.type === 'authority' ? wholeEntryTitle(selected.id) : null);
      if (wt && uscTitles.has(wt) && USC.titles.find((x) => x[0] === wt)?.[2]) {
        afterLoad(wt);
        return vleaves.get(selected?.id)?.parent || uscTitles.get(wt);
      }
      // Earlier releases used numbered reading ranges. Preserve a restored
      // provision's location when those private range IDs become chapters.
      if (selected?.type === 'authority' && leaves.has(selected.id)) return leaves.get(selected.id).parent;
      if (S.region?.startsWith(PREFIX)) {
        const collection = S.region.slice(PREFIX.length).split('/')[0];
        return collectionGroups.get(collection) || root;
      }
      return root;
    };
  const selectedEntry = () => {
    if (selected?.type !== 'authority') return null;
    const e = byId.get(selected.id) || virtual.get(selected.id);
    if (e) return e;
    const t = wholeEntryTitle(selected.id);
    if (!t) return null;
    afterLoad(t);
    return {
      id: selected.id,
      virtual: true,
      collection: 'uscode',
      cite: 'Title ' + t,
      title: '',
      loading: uscFailed.get(t) || 'Opening Title ' + t + '…',
    };
  };
  // "uscx-20-1001" names a section of Title 20 that DKLA lists but does not hold.
  function wholeEntryTitle(id) {
    const m = String(id || '').match(/^uscx-(\d+)-/);
    return m ? Number(m[1]) : null;
  }
  // Load a title, then redraw whatever is showing if it still depends on that title.
  function afterLoad(t) {
    if (uscReady.has(t) || uscFiles.has(t)) return uscFiles.get(t) || Promise.resolve(uscReady.get(t));
    return loadTitle(t)
      .catch(() => {})
      .finally(() => {
        if (!active()) return;
        geometryCache = null;
        renderInspector();
        renderHeading();
        refitAuthority(false);
      });
  }
  function ancestors(n) {
    const out = [];
    while (n) {
      out.unshift(n);
      n = n.parent;
    }
    return out;
  }
  let geometryCache = null;
  const pageOffsets = new Map();
  function anchor() {
    const scotus = window.DKLAScotusBox || { x: -11400, y: 10400, w: 22800, h: 4200 },
      b = window.DKLAGeography?.bounds?.(),
      narrow = rect().w < 700;
    const v = rect(),
      variant = window.DKLAHomeVariant?.authority?.();
    if (variant) {
      // A Home prototype (v25/home-variants.js) places and sizes the block itself.
      Object.assign(BOX, { x: variant.x, y: variant.y, w: variant.w });
      return BOX;
    }
    if (v.w >= 600 && v.w / Math.max(1, v.h) >= 1.25) {
      Object.assign(BOX, { x: scotus.x - scotus.w - 900, y: scotus.y, w: scotus.w });
      return BOX;
    }
    const bottom = Math.max(scotus.y + scotus.h, b && Number.isFinite(b.y + b.h) ? b.y + b.h : 0),
      w = narrow ? Math.min(scotus.w, 15200) : scotus.w;
    Object.assign(BOX, { x: scotus.x + (scotus.w - w) / 2, y: bottom + 900, w });
    return BOX;
  }
  function geometry(n = current(), overview = false) {
    anchor();
    // A Home prototype's own layout of the overview: its columns, its height
    // (rows grow to it), or two panels either side of the SCOTUS building.
    const spec = overview && n === root ? window.DKLAHomeVariant?.authority?.() || null : null;
    const a = usable(),
      narrow = !overview && a.w < 650,
      key = [
        n.key,
        overview,
        a.w,
        a.h,
        BOX.x,
        BOX.y,
        BOX.w,
        pageOffsets.get(n.key) || 0,
        selectedEntry()?.id || '',
        spec ? JSON.stringify(spec) : '',
      ].join(':');
    if (geometryCache?.key === key) return geometryCache;
    const cover = n === root,
      width = spec
        ? spec.split
          ? 480
          : spec.cols * (spec.colW || 480)
        : overview
          ? 1440
          : Math.min(1440, Math.max(320, a.w - 32)),
      short = !overview && a.h < 400,
      compact = cover && (narrow || short),
      pad = narrow || short ? 16 : 26,
      gap = narrow || short ? 12 : 22;
    let cols = spec
      ? spec.cols
      : cover
        ? narrow
          ? 2
          : short || width >= 860
            ? 3
            : 2
        : Math.min(
            n.children.length,
            width >= 1300 && n.whole ? 5 : width >= 1100 ? 4 : width >= 700 ? 3 : width >= 480 ? 2 : 1,
          );
    const constitution = n === collectionGroups.get('constitution'),
      headingFs = cover ? (short ? 20 : narrow ? 26 : 32) : narrow ? 24 : 30,
      heading = rows(display(n), width - pad * 2, headingFs, 550, 3, 'authority-map-heading');
    const markW = constitution ? Math.min(width * 0.8, short ? 180 : Infinity) : 0,
      markH = markW / 3,
      masthead = constitution ? { w: markW, h: markH, labelY: markH + 34 } : null;
    const header = constitution
      ? markH + 52
      : 28 + heading.length * headingFs * 1.25 + (n.range ? 28 : 0) + 24;
    let hideQuote = narrow || short;
    function arrange(previews, children = n.children, grow = 0) {
      const cards = new Map(),
        rowEnds = [];
      let y = header;
      if (constitution) {
        const [preamble, articles, amendments] = n.children,
          cw = width - pad * 2,
          pm = tileModel(preamble, cw, false, narrow || short, 0, !hideQuote);
        cards.set(preamble.key, { x: pad, y, w: cw, h: pm.h, node: preamble, model: pm });
        y += pm.h + gap;
        rowEnds.push(y - gap + pad);
        const groupCols = narrow ? 1 : 2,
          gw = (cw - gap * (groupCols - 1)) / groupCols,
          ms = [articles, amendments].map((c) =>
            tileModel(
              c,
              gw,
              false,
              narrow || short,
              narrow || short ? 0 : Math.min(previews, c === articles ? 7 : 4),
            ),
          );
        for (let i = 0; i < ms.length; i += groupCols) {
          const h = Math.max(...ms.slice(i, i + groupCols).map((m) => m.h));
          for (let j = 0; j < groupCols && i + j < ms.length; j++) {
            const c = [articles, amendments][i + j];
            cards.set(c.key, { x: pad + j * (gw + gap), y, w: gw, h, node: c, model: ms[i + j] });
          }
          y += h + gap;
          rowEnds.push(y - gap + pad);
        }
        cols = groupCols;
      } else {
        const w = (width - pad * 2 - gap * (cols - 1)) / cols,
          models = children.map((c) => tileModel(c, w, cover, compact, previews));
        for (let i = 0; i < models.length; i += cols) {
          const h = Math.max(...models.slice(i, i + cols).map((m) => m.h)) + grow;
          for (let j = 0; j < cols && i + j < models.length; j++) {
            const c = children[i + j];
            cards.set(c.key, { x: pad + j * (w + gap), y, w, h, node: c, cover, model: models[i + j] });
          }
          y += h + gap;
          rowEnds.push(y - gap + pad);
        }
      }
      return { cards, rowEnds, h: y - gap + pad };
    }
    let density = overview
        ? 0
        : cover
          ? compact
            ? 0
            : 4
          : constitution
            ? narrow || short
              ? 0
              : 7
            : n.children.length <= 4
              ? 3
              : n.children.length <= 8
                ? 1
                : 0,
      layout = arrange(density);
    let panels = null,
      spineBox = null;
    if (spec) {
      // Rows grow so the block is as tall as the prototype asks; letters keep their size.
      const unit0 = spec.split ? spec.split.left.w / width : spec.w / width,
        target = spec.h / unit0;
      if (spec.split) {
        const halves = [n.children.slice(0, 3), n.children.slice(3)].map((c) => arrange(0, c));
        const rowsN = Math.max(...halves.map((l) => l.rowEnds.length)),
          natural = Math.max(...halves.map((l) => l.h)),
          grow = Math.max(0, (target - natural) / rowsN),
          [left, right] = [n.children.slice(0, 3), n.children.slice(3)].map((c) => arrange(0, c, grow)),
          dx = (spec.split.right.x - spec.split.left.x) / unit0;
        const cards = new Map(left.cards);
        for (const [key, c] of right.cards) cards.set(key, { ...c, x: c.x + dx });
        const h = Math.max(left.h, right.h);
        layout = { cards, rowEnds: left.rowEnds, h };
        panels = [
          { x: 0, w: width },
          { x: dx, w: width },
        ];
      } else {
        const rowsN = layout.rowEnds.length,
          grow = Math.max(0, (target - layout.h) / rowsN);
        if (grow) layout = arrange(density, n.children, grow);
      }
    }
    const height = Math.max(100, a.h - 40);
    if (!overview && !constitution)
      while (density > 0 && layout.h > height) {
        layout = arrange(--density);
      }
    if (constitution && layout.h > height) {
      hideQuote = true;
      layout = arrange(density);
      while (density > 0 && layout.h > height) layout = arrange(--density);
    }
    // Long indexes stay in their official hierarchy. Page complete rows rather
    // than fitting a prefix and silently leaving the rest outside the screen.
    const pages = [];
    let page = 0;
    if (!overview && !cover && !constitution && layout.h > height) {
      const cw = (width - pad * 2 - gap * (cols - 1)) / cols,
        models = n.children.map((c) => tileModel(c, cw, false, false, 0));
      density = 0;
      let start = 0,
        y = header;
      for (let i = 0; i < models.length; i += cols) {
        const rh = Math.max(...models.slice(i, i + cols).map((m) => m.h));
        if (i > start && y + rh + pad + 62 > height) {
          pages.push({ start, end: i });
          start = i;
          y = header;
        }
        y += rh + gap;
      }
      pages.push({ start, end: n.children.length });
      const chosen = selectedEntry(),
        selection = chosen ? n.children.findIndex((c) => c.entry?.id === chosen.id) : -1,
        offset = selection >= 0 ? selection : pageOffsets.get(n.key) || 0;
      page = Math.max(
        0,
        pages.findIndex((p) => offset >= p.start && offset < p.end),
      );
      layout = arrange(0, n.children.slice(pages[page].start, pages[page].end));
      layout.h += 62;
    }
    const unit = spec ? (spec.split ? spec.split.left.w : spec.w) / width : overview ? BOX.w / width : 1,
      cards = new Map(
        [...layout.cards].map(([key, c]) => [
          key,
          { ...c, x: BOX.x + c.x * unit, y: BOX.y + c.y * unit, w: c.w * unit, h: c.h * unit, unit },
        ]),
      );
    const box = { x: BOX.x, y: BOX.y, w: spec ? spec.w : width * unit, h: layout.h * unit },
      fit = { ...box };
    if (panels) {
      panels = panels.map((p) => ({ x: BOX.x + p.x * unit, y: BOX.y, w: p.w * unit, h: box.h }));
      // The dictionary spine heads the right-hand panel.
      const p = panels[1];
      spineBox = { x: p.x + 26 * unit, w: p.w - 52 * unit };
    } else if (spec && width > 1440) {
      // On a long shelf of narrow books the spine is a little larger, at the right-hand end.
      const scale = 1.25,
        w = 723 * unit * scale;
      spineBox = { x: box.x + box.w - 26 * unit - w, w, scale };
    }
    if (overview) {
      BOX.h = box.h;
      const v = rect();
      if (window.DKLAScotusBox && !spec && v.w >= 600 && v.w / Math.max(1, v.h) >= 1.25)
        window.DKLAScotusBox.h = box.h;
    }
    geometryCache = {
      key,
      box,
      cards,
      fit,
      unit,
      cols,
      density,
      header: header * unit,
      panels,
      spineBox,
      heading,
      headingFs,
      masthead,
      visibleRows: layout.rowEnds.length,
      safe: { ...a },
      pages,
      page,
    };
    return geometryCache;
  }

  function usable() {
    const a = typeof safeArea === 'function' ? safeArea() : rect();
    return { w: Math.max(180, a.w), h: Math.max(120, a.h) };
  }
  function synthetic(id) {
    const n = groups.get(id);
    if (!n) return null;
    return {
      ...(active() && n === current() ? geometry(n).box : anchor()),
      id: n.key,
      title: n.title,
      color: '#597786',
      courseKey: TITLE,
      districtIds: [],
      special: 'authority',
    };
  }
  const oldRegionFor = regionFor;
  regionFor = function (id) {
    return synthetic(id) || oldRegionFor(id);
  };
  const oldGalaxy = galaxy;
  galaxy = function (...args) {
    const g = oldGalaxy.apply(this, args),
      b = geometry(root, true).box;
    return { ...g, box: bounds([g.box, { x: b.x - 150, y: b.y - 150, w: b.w + 300, h: b.h + 300 }]) };
  };
  const oldScopeBox = scopeBox;
  scopeBox = function (...args) {
    return active() ? geometry().box : oldScopeBox.apply(this, args);
  };
  const oldHome = home;
  home = function (scope, ...args) {
    if (scope === TITLE) return openGroup(ROOT);
    return oldHome(scope, ...args);
  };
  const oldGoRegion = goRegion;
  goRegion = function (id, ...args) {
    if (active() && id?.startsWith('authority-page:')) return changePage(id.slice(15));
    if (groups.has(id)) return openGroup(id);
    return oldGoRegion(id, ...args);
  };
  const oldGoNode = goNode;
  goNode = function (id, ...args) {
    if (id?.startsWith(PREFIX) && (byId.has(id.slice(PREFIX.length)) || virtual.has(id.slice(PREFIX.length))))
      return open(id.slice(PREFIX.length));
    return oldGoNode(id, ...args);
  };
  const oldHeading = renderHeading;
  renderHeading = function (...args) {
    if (!active()) return oldHeading.apply(this, args);
    document.getElementById('courseHome').textContent = TITLE;
    document.getElementById('geoBreadcrumb').innerHTML =
      '<button data-study-scope="Atlas">Atlas</button>' +
      ancestors(current())
        .map((n) => `<span>›</span><button data-authority-group="${esc(n.key)}">${esc(n.title)}</button>`)
        .join('');
    document.getElementById('studyBack').disabled = !S.history.length;
    document.getElementById('mapWelcome').hidden = true;
  };
  function source(e) {
    const s = e.source;
    return `<details class="authority-provenance" id="authoritySource"><summary>Source and edition</summary><p>${esc(s.name)}${s.edition ? ` · ${esc(s.edition)}` : ''}${s.read ? ` · checked ${esc(s.read)}` : ''}</p>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">Open source ↗</a>` : ''}${s.official ? ` <a href="${esc(s.official)}" target="_blank" rel="noopener">${e.collection === 'uscode' ? 'Pinned official release ↗' : 'Official rules volume ↗'}</a>` : ''}${s.file ? `<button type="button" data-dkla-file="${esc(s.file)}">Open assigned source page ↗</button>` : ''}<p>Connections identify an explicit citation or an existing atlas relationship. They do not claim that every linked case decided every part of this provision.</p></details>`;
  }
  function annotation(a) {
    return typeof a === 'string'
      ? `<p>${esc(a)}</p>`
      : `${a.title ? `<h4>${esc(a.title)}</h4>` : ''}${(a.lines || []).map((l) => `<p style="--authority-indent:${Math.min(l[0], 3)}">${esc(l[1])}</p>`).join('')}`;
  }
  // Previous and Next in a rule or authority page (the reader's 20 px icons).
  const ICON = (d) =>
    `<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const CHEVRON = ICON('M7.5 4.5L13 10l-5.5 5.5'),
    CHEVRON_BACK = ICON('M12.5 4.5L7 10l5.5 5.5');
  function provisionHTML(e) {
    const group = readingOrder.get(e.collection) || [],
      n = group.findIndex((x) => x.id === e.id);
    const anchors = e.lines
      .map((l, i) =>
        l[2] === 'heading'
          ? { i, text: l[1] }
          : l[0] === 0 && /^\([a-z0-9]+\)\s/.test(l[1])
            ? { i, text: l[1].match(/^\([a-z0-9]+\)/)[0] }
            : null,
      )
      .filter(Boolean);
    const allLinks = e.links || [],
      links = allLinks.filter(
        (l) =>
          l.automaticRibbon ||
          l.relationship === 'explicit-citation' ||
          l.basis?.startsWith('Explicit citation'),
      ),
      contextLinks = allLinks.filter((l) => !links.includes(l));
    const li = (l) =>
      `<li><button type="button" data-study-node="${esc(l.id)}" title="${esc(l.basis)}" aria-description="${esc(l.basis)}">${esc(l.title)}</button></li>`;
    const assigned = e.filter ? D.entries.filter((x) => x.id.startsWith(e.filter)) : [];
    return `<article class="authority-reading"><header><h2>${esc(e.cite)}${e.title !== e.cite ? `<span>${esc(e.title)}</span>` : ''}</h2>${status[e.status] ? `<p class="authority-status">${esc(status[e.status])}</p>` : ''}${e.note ? `<p class="authority-note">${esc(e.note)}</p>` : ''}</header>${anchors.length ? `<nav class="authority-subsections" aria-label="Sections in this provision">${anchors.map((a) => `<button type="button" data-authority-anchor="authority-line-${a.i}">${esc(a.text)}</button>`).join('')}</nav>` : ''}<div class="authority-text">${e.lines.map((l, i) => (l[2] === 'heading' ? `<h3 id="authority-line-${i}">${esc(l[1])}</h3>` : `<p id="authority-line-${i}" style="--authority-indent:${Math.min(l[0], 3)}">${esc(l[1])}</p>`)).join('')}</div>${e.annotations?.length ? `<details class="authority-provenance" id="authorityNotes"><summary>${e.collection === 'uscode' ? 'Effective dates and statutory notes' : 'Assigned source editorial notes'}</summary>${e.annotations.map(annotation).join('')}</details>` : ''}${
      e.related?.length
        ? `<section class="authority-related"><h3>Read alongside</h3>${e.related
            .filter((x) => byId.has(x))
            .map(
              (x) =>
                `<button type="button" data-authority-open="${esc(x)}">${esc(entryName(byId.get(x)))}</button>`,
            )
            .join('')}</section>`
        : ''
    }${assigned.length ? `<button type="button" data-authority-group="${esc(collectionGroups.get('ucc').key + '/article-' + e.filter.split('-')[1])}">Explore assigned sections in this article</button>` : ''}${links.length ? `<section class="authority-case-links"><div class="related-heading"><h3>Related entries</h3></div><ul>${links.slice(0, 8).map(li).join('')}</ul>${links.length > 8 ? `<details id="authorityAllLinks"><summary>More connections</summary><ul>${links.slice(8).map(li).join('')}</ul></details>` : ''}</section>` : ''}${contextLinks.length ? `<details class="authority-case-links"><summary>Related doctrine</summary><ul>${contextLinks.map(li).join('')}</ul></details>` : ''}${source(e)}<nav class="authority-next" aria-label="Read in order"><button type="button" data-authority-open="${esc(group[n - 1]?.id || '')}"${n === 0 ? ' disabled' : ''}>${CHEVRON_BACK}Previous</button><button type="button" data-authority-open="${esc(group[n + 1]?.id || '')}"${n === group.length - 1 ? ' disabled' : ''}>Next${CHEVRON}</button></nav></article>`;
  }
  const oldInspector = renderInspector;
  renderInspector = function (...args) {
    const e = selectedEntry();
    if (!active() || !e) return oldInspector.apply(this, args);
    if (!S.panelOpen) {
      panel.innerHTML = '';
      return;
    }
    panel.innerHTML = e.virtual
      ? readerChrome(stubHTML(e), 'U.S. Code')
      : readerChrome(provisionHTML(e), 'Source rule');
    panel.scrollTop = 0;
    wireReader();
    const close = document.getElementById('closeInspector');
    if (close)
      close.onclick = () => {
        remember();
        selected = null;
        S.connectionsExpanded = false;
        setReader(false);
        renderHeading();
        renderInspector();
        refitAuthority(true);
        if (typeof deferPersist === 'function') deferPersist();
      };
  };
  function prepare() {
    if (window.SCOTUSHistory?.state?.().open) window.SCOTUSHistory.close();
    if (typeof dismissMenu === 'function') dismissMenu();
    document.querySelectorAll('dialog[open]').forEach((d) => d.close());
  }
  function openGroup(key, save = true) {
    const n = groups.get(key);
    if (!n || n.placeholder) return;
    const t = n.uscTitle || wholeKey(n.key);
    if (t && !uscReady.has(t) && USC.titles.find((x) => x[0] === t)?.[2]) afterLoad(t);
    prepare();
    if (save) remember();
    selected = null;
    S.connectionsExpanded = false;
    S.connectionOverview = false;
    S.district = null;
    setReader(false);
    closeSearch();
    S.scope = TITLE;
    S.region = n.key;
    if (save) pageOffsets.delete(n.key);
    geometryCache = null;
    renderInspector();
    renderHeading();
    fitBox(geometry(n).fit, true, 16, 1);
  }
  function open(id, collection) {
    if (!id || !(byId.has(id) || virtual.has(id)))
      return openGroup(collectionGroups.get(collection)?.key || ROOT);
    prepare();
    remember();
    const node = leaves.get(id) || vleaves.get(id);
    if (!node) return;
    S.scope = TITLE;
    S.region = node.parent.key;
    S.district = null;
    selected = { type: 'authority', id };
    S.connectionsExpanded = false;
    S.connectionOverview = false;
    setReader(true);
    closeSearch();
    geometryCache = null;
    renderInspector();
    renderHeading();
    refitAuthority(true);
  }
  function changePage(offset) {
    remember();
    selected = null;
    setReader(false);
    pageOffsets.set(current().key, Number(offset) || 0);
    geometryCache = null;
    renderInspector();
    renderHeading();
    refitAuthority(true);
  }
  function refitAuthority(animate = false) {
    if (!active()) return;
    fitBox(geometry().fit, animate, 16, 1);
    schedule();
  }
  const fontCanvas = document.createElement('canvas'),
    fontContext = fontCanvas.getContext?.('2d');
  // v3.2: each width is measured once (the same words at the same size were measured on every draw).
  // The record is dropped when a font finishes loading, since a width measured in a fallback font is wrong.
  const widths = new Map();
  document.fonts?.addEventListener?.('loadingdone', () => widths.clear());
  document.fonts?.ready?.then(() => widths.clear());
  function widthOf(value, fs, weight = 450, cls = '') {
    if (fontContext) {
      const serif = cls === 'authority-preamble-excerpt',
        family = serif ? 'S' : cls === 'authority-preview-code' ? 'M' : 'I',
        key = family + weight + '|' + fs + '|' + value;
      let w = widths.get(key);
      if (w === undefined) {
        fontContext.font = `${serif ? 'italic ' : ''}${weight} ${fs}px ${serif ? 'Georgia, Cambria, serif' : cls === 'authority-preview-code' ? 'Consolas, monospace' : '"DKLA Inter", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI",Roboto, Helvetica, Arial, sans-serif'}`;
        w = fontContext.measureText(value).width;
        if (widths.size > 30000) widths.clear();
        widths.set(key, w);
      }
      return w;
    }
    return typeof measure === 'function' ? measure(value, fs, weight, cls) : String(value).length * fs * 0.54;
  }
  function rows(value, width, fs, weight = 450, max = Infinity, cls = '') {
    const out = [];
    let line = '';
    for (const word of String(value).split(/\s+/).filter(Boolean)) {
      const next = line ? line + ' ' + word : word;
      if (line && widthOf(next, fs, weight, cls) > width) {
        out.push(line);
        line = word;
      } else line = next;
      // Ordinary word wrapping, with character breaks only for a word that
      // alone exceeds the available width. Never condense or discard letters.
      if (widthOf(line, fs, weight, cls) > width) {
        let part = '';
        for (const c of line) {
          if (part && widthOf(part + c, fs, weight, cls) > width) {
            out.push(part);
            part = c;
          } else part += c;
        }
        line = part;
      }
    }
    if (line) out.push(line);
    return out.length ? out : [''];
  }
  function text(lines, x, y, fs, color, weight = 500, cls = '') {
    return lines
      .map(
        (line, i) =>
          `<text${cls ? ` class="${cls}"` : ''} x="${x}" y="${y + i * fs * 1.25}" font-size="${fs}" font-weight="${weight}" fill="${color}" pointer-events="none">${esc(line)}</text>`,
      )
      .join('');
  }
  function tileModel(n, w, cover = false, compact = false, previewLimit = 3, showQuote = true) {
    // The whole Code's long lists use smaller cards, so a page holds a useful share of a title.
    const dense = n.whole && n.parent?.whole && !cover,
      flat = compact && usable().h < 400,
      pad = flat ? 10 : compact ? 12 : dense ? 16 : 22,
      fs = flat ? 20 : compact ? 18 : cover ? 26 : dense ? 17 : 22,
      small = compact ? 12 : 14,
      e = n.entry,
      special = cover && n.collection === 'constitution';
    let y = pad;
    const headingWidth = w - pad * 2 - (cover && !compact && !special ? 52 : 0),
      heading = rows(
        cover && compact ? shortTitles[n.collection] || display(n) : display(n),
        headingWidth,
        fs,
        500,
        Infinity,
        'authority-volume-title',
      );
    const codeRows =
      !cover && code(n) ? rows(code(n), w - pad * 2, 13, 550, Infinity, 'authority-preview-code') : [];
    if (special)
      y +=
        (flat ? 28 : compact ? 48 : 84) +
        8 +
        rows('U.S. Constitution', w - pad * 2, small, 550).length * small * 1.25 +
        14;
    else {
      if (compact && cover && !flat) y += 27;
      if (codeRows.length) y += codeRows.length * 13 * 1.25 + 8;
      y += heading.length * fs * 1.25 + 16;
    }
    const headingBottom = y,
      previews = [];
    if (!e && !compact)
      for (const child of n.children.slice(0, previewLimit)) {
        const c = code(child),
          badge = c ? Math.min(90, Math.max(40, widthOf(c, 12, 550, 'authority-preview-code') + 8)) : 0,
          label = child.entry?.status === 'article-index' ? 'Article overview' : display(child),
          labelRows = rows(label, w - pad * 2 - badge - 44, 16, 450),
          badgeRows = c ? rows(c, badge, 12, 550, Infinity, 'authority-preview-code') : [];
        const h = Math.max(labelRows.length * 16 * 1.25, badgeRows.length * 12 * 1.25) + 18;
        previews.push({ node: child, y, h, badge, rows: labelRows, codeRows: badgeRows });
        y += h + 8;
      }
    let quoteRows = [],
      quoteFs = w < 650 ? 16 : 22;
    if (e?.id === 'const-preamble' && !compact && showQuote) {
      quoteRows = rows(
        e.lines[0]?.[1] || '',
        w - pad * 2,
        quoteFs,
        450,
        Infinity,
        'authority-preamble-excerpt',
      );
      y += quoteRows.length * quoteFs * 1.25 + 8;
    }
    return {
      pad,
      fs,
      small,
      heading,
      codeRows,
      headingBottom,
      previews,
      quoteRows,
      quoteFs,
      compact,
      flat,
      h:
        e?.id === 'const-preamble' && !showQuote
          ? 72
          : Math.max(flat ? 74 : compact ? 118 : dense ? 72 : e ? 112 : 140, y + pad),
    };
  }
  function skin(n) {
    while (n) {
      if (skins[n.collection]) return skins[n.collection];
      n = n.parent;
    }
    return { ink: '#d1dedb', edge: '#82aaa4', base: '#172e31', paper: '#223b3d', mark: 'code' };
  }
  function identity(n, x, y, size) {
    const s = skin(n),
      paths = {
        constitution:
          'M18 6H68L84 22V92H18Z M68 6V22H84 M30 38H71 M30 50H71 M30 62H64 M30 76Q42 69 54 77T74 74',
        procedure:
          'M14 16H39V38H14Z M62 16H87V38H62Z M14 63H39V85H14Z M62 63H87V85H62Z M39 27H62 M75 38V63 M62 74H39',
        code: 'M10 30L50 9 90 30Z M14 37H86 M19 83H81 M11 91H89 M24 42V77 M42 42V77 M60 42V77 M78 42V77',
        commerce:
          'M13 28L48 9 83 28 48 47Z M13 28V70L48 91 83 70V28 M48 47V91 M30 19L65 38 M89 50H97 M89 64H97',
        restatement:
          'M9 20Q29 10 49 20V89Q29 79 9 89Z M49 20Q69 10 89 20V89Q69 79 49 89Z M18 34H39 M59 34H80 M18 48H39 M59 48H80 M18 62H39 M59 62H80',
        consumer: 'M21 8H70L83 21V92H21Z M70 8V21H83 M32 38H69 M32 51H60 M33 72L42 81 66 60',
      };
    return `<g class="authority-identity" transform="translate(${x} ${y}) scale(${size / 100})" aria-hidden="true" pointer-events="none"><path d="${paths[s.mark]}" fill="none" stroke="${s.ink}" stroke-opacity=".66" stroke-width="2" stroke-linejoin="round"/></g>`;
  }
  function people(x, y, w, h, id) {
    if (!peopleAsset)
      return text(['We the People'], x, y + h * 0.72, h * 0.58, '#c5e5d8', 500, 'authority-people-fallback');
    return `<defs><mask id="${id}" mask-type="alpha" style="mask-type:alpha" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><image href="${esc(peopleAsset)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/></mask></defs><rect class="authority-people-mark" x="${x}" y="${y}" width="${w}" height="${h}" fill="#c2e3d5" mask="url(#${id})" role="img" aria-label="We the People" pointer-events="none"/>`;
  }
  function display(n) {
    if (n.name) return n.name;
    return n.title
      .replace(/^(?:PART|Part|CHAPTER|Title)\s+[\w]+\s*[—–·-]\s*/, '')
      .replace(/^[IVX]+\s*·\s*/, '')
      .replace(/\s+/g, ' ');
  }
  function code(n) {
    if (n.entry) {
      const e = n.entry;
      if (e.id === 'const-preamble') return '';
      if (e.id.startsWith('const-')) return e.cite.replace(/^(Article|Amendment) /, '');
      if (e.collection === 'restatement') return '§ ' + e.id.split('-')[1];
      if (e.collection === 'consumer') return '§ ' + e.id.split('-')[1];
      if (e.collection === 'uscode') return '§ ' + e.section;
      if (e.collection === 'ucc') return '§ ' + e.id.replace('ucc-', '');
      return e.cite;
    }
    if (n.number) return String(n.number).padStart(2, '0');
    if (n.badge) return n.badge;
    if (n.placeholder) return '';
    return (
      n.range?.replace(/^Amendments /, '') ||
      n.title.match(/^(?:Title|CHAPTER|PART)\s+([\w]+)/)?.[0] ||
      n.title.match(/^[IVX]+\s*·/)?.[0].replace(' ·', '') ||
      ''
    );
  }
  function preview(p, card, s) {
    const n = p.node,
      u = card.unit || 1,
      x = card.x + card.model.pad * u,
      y = card.y + p.y * u,
      w = card.w - card.model.pad * u * 2,
      h = p.h * u;
    const attrs = n.entry ? `data-map-jump="${esc(n.key)}"` : `data-map-region="${esc(n.key)}"`,
      label = n.entry ? 'Read ' + entryName(n.entry) : 'Explore ' + n.title;
    return `<g class="authority-preview" ${attrs} role="button" tabindex="0" aria-label="${esc(label)}"><title>${esc(label)}</title><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${7 * u}" fill="${s.paper}" stroke="${s.edge}" stroke-opacity=".3" stroke-width="${0.65 / S.z}"/>${text(p.codeRows, x + 10 * u, y + 22 * u, 12 * u, s.ink, 550, 'authority-preview-code')}${text(p.rows, x + (p.badge + 22) * u, y + 25 * u, 16 * u, '#dce5e3', 450, 'authority-preview-label')}<path d="m${x + w - 14 * u} ${y + h / 2 - 3 * u} 4 3 -4 3" transform="translate(0 0)" stroke="${s.ink}" stroke-width="${0.8 / S.z}" fill="none" pointer-events="none"/></g>`;
  }
  function tile(card, overview = false) {
    const n = card.node,
      e = n.entry,
      z = S.z,
      u = card.unit || 1,
      s = skin(n),
      chosen = e && selectedEntry()?.id === e.id,
      m = card.model,
      pad = m.pad * u;
    const attrs = e ? `data-map-jump="${esc(n.key)}"` : `data-map-region="${esc(n.key)}"`,
      clip = 'authority-clip-' + n.key.replace(/[^a-zA-Z0-9]/g, (c) => '_' + c.charCodeAt(0).toString(16));
    let out = `<g class="authority-map-tile${e ? ' authority-map-provision' : ''}${card.cover ? ' authority-volume-cover' : ''}${chosen ? ' is-selected' : ''}" data-authority-collection="${esc(n.collection)}" data-authority-box="${card.x},${card.y},${card.w},${card.h}" style="--skin:${s.edge}" ${attrs} role="${e ? 'button' : 'group'}"${e ? ' tabindex="0"' : ''} aria-label="${esc(e ? 'Read ' + entryName(e) : n.title)}"><title>${esc(e ? entryName(e) : n.title)}</title><rect class="authority-cover-bg" x="${card.x}" y="${card.y}" width="${card.w}" height="${card.h}" rx="${12 * u}" fill="${chosen ? s.paper : s.base}" stroke="${chosen ? '#eee0bf' : s.edge}" stroke-opacity=".85" stroke-width="${(chosen ? 2 : 1) / z}"/><path d="M${card.x + 7 * u} ${card.y + 15 * u}V${card.y + card.h - 15 * u}" stroke="${s.edge}" stroke-opacity=".6" stroke-width="${3 * u}" pointer-events="none"/><defs><clipPath id="${clip}"><rect x="${card.x + pad}" y="${card.y + 10 * u}" width="${card.w - pad * 2}" height="${card.h - 20 * u}"/></clipPath></defs><g clip-path="url(#${clip})">`;
    if (!e)
      out += `<g class="authority-title-control" ${attrs} role="button" tabindex="0" aria-label="${esc('Explore ' + n.title)}">`;
    if (overview && card.w * z < 150 && !window.DKLAHomeFit?.fullLabels?.()) {
      const title = shortTitles[n.collection] || n.title,
        fs = Math.min(20, (card.w / u - m.pad * 2) / Math.max(6, title.length * 0.6));
      if (fs * z * u >= 10) {
        const lines = rows(title, card.w / u - m.pad * 2, fs, 550, Infinity, 'authority-volume-title');
        out += text(lines, card.x + pad, card.y + pad + fs * u, fs * u, s.ink, 550, 'authority-volume-title');
      }
      out += identity(n, card.x + card.w - pad - 42 * u, card.y + card.h - pad - 42 * u, 42 * u);
    } else if (card.cover && n.collection === 'constitution') {
      const markH = (m.flat ? 28 : m.compact ? 48 : 84) * u;
      out += people(card.x + pad, card.y + pad, card.w - pad * 2, markH, clip + '-people');
      // v3.2: on Home the name under the mark is never set under 9.5 px (where the cover has the room)
      const big = 9.5 / z,
        roomy =
          overview &&
          big > m.small * u &&
          widthOf('U.S. Constitution', big, 550, 'authority-document-label') <= card.w - pad * 2 &&
          pad + markH + 8 * u + big * 1.3 <= card.h - pad * 0.5,
        lfs = roomy ? big : m.small * u;
      out += text(
        roomy ? ['U.S. Constitution'] : rows('U.S. Constitution', card.w / u - m.pad * 2, m.small, 550),
        card.x + pad,
        card.y + pad + markH + 8 * u + lfs,
        lfs,
        s.ink,
        550,
        'authority-document-label',
      );
    } else {
      let y = card.y + pad;
      if (card.cover && m.compact && !m.flat) {
        out += identity(n, card.x + pad, y, 22 * u);
        y += 27 * u;
      } else if (card.cover) out += identity(n, card.x + card.w - pad - 40 * u, y, 40 * u);
      if (m.codeRows.length) {
        out += text(m.codeRows, card.x + pad, y + 13 * u, 13 * u, s.ink, 550, 'authority-preview-code');
        y += (m.codeRows.length * 13 * 1.25 + 8) * u;
      }
      out += text(m.heading, card.x + pad, y + m.fs * u, m.fs * u, '#edeae3', 500, 'authority-volume-title');
    }
    if (!e)
      out += `<rect x="${card.x + pad}" y="${card.y + 10 * u}" width="${card.w - pad * 2}" height="${(m.headingBottom - 10) * u}" fill="transparent" pointer-events="all"/></g>`;
    if (!overview) for (const p of m.previews) out += preview(p, card, s);
    if (e?.id === 'const-preamble')
      out += text(
        m.quoteRows,
        card.x + pad,
        card.y + (m.headingBottom + m.quoteFs) * u,
        m.quoteFs * u,
        '#c5d9d0',
        450,
        'authority-preamble-excerpt',
      );
    return out + '</g></g>';
  }
  function frame(n, g, overview = false) {
    const u = g.unit || 1,
      s = skin(n),
      z = S.z,
      x = g.box.x,
      y = g.box.y,
      w = g.box.w,
      h = g.box.h,
      pad = usable().w < 650 && !overview ? 16 : 26;
    let out = (g.panels || [{ x, y, w, h }])
      .map(
        (p) =>
          `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${24 * u}" fill="${n === root ? '#12282b' : s.base}" fill-opacity=".92" stroke="${s.edge}" stroke-opacity=".65" stroke-width="${1.2 / z}"/>`,
      )
      .join('');
    if (n === collectionGroups.get('constitution')) {
      const markW = g.masthead.w * u;
      out += people(
        x + (w - markW) / 2,
        y + 12 * u,
        markW,
        g.masthead.h * u,
        'authority-constitution-masthead',
      );
      const label = 'U.S. Constitution',
        fs = 14 * u;
      out += text(
        [label],
        x + (w - widthOf(label, fs, 500, 'authority-document-label')) / 2,
        y + g.masthead.labelY * u,
        fs,
        s.ink,
        500,
        'authority-document-label',
      );
    } else {
      out += text(
        g.heading,
        x + pad * u,
        y + (28 + g.headingFs) * u,
        g.headingFs * u,
        n === root ? '#d7e9e2' : s.ink,
        550,
        'authority-map-heading',
      );
      if (n.range)
        out += text(
          [n.range],
          x + pad * u,
          y + (28 + g.heading.length * g.headingFs * 1.25 + 18) * u,
          14 * u,
          s.ink,
          500,
          'authority-preview-code',
        );
    }
    if (g.pages?.length > 1) {
      const y = g.box.y + g.box.h - 56 * u,
        h = 40 * u,
        bw = 134 * u;
      for (const [previous, px, label] of [
        [true, x + pad * u, '← Previous'],
        [false, x + w - pad * u - bw, 'Next →'],
      ]) {
        const target = g.pages[g.page + (previous ? -1 : 1)];
        if (!target) continue;
        out += `<g class="authority-page-control" data-authority-page="${target.start}" data-map-region="authority-page:${target.start}" role="button" tabindex="0" aria-label="${label}"><rect x="${px}" y="${y}" width="${bw}" height="${h}" rx="${7 * u}" fill="${s.paper}" stroke="${s.edge}" stroke-width="${1 / z}"/>${text([label], px + 14 * u, y + 26 * u, 16 * u, s.ink, 500, 'authority-preview-label')}</g>`;
      }
    }
    return out;
  }
  function paintMap() {
    const n = current(),
      g = geometry(n),
      z = S.z;
    // v3.2: this view paints the map itself, so it tells the camera engine what it painted.
    camDrawBegin();
    camDrawn();
    setViewBox();
    let out = `<g class="authority-map-view" data-authority-view="${esc(n.key)}">${frame(n, g)}`;
    for (const c of g.cards.values()) out += tile(c);
    svg.innerHTML = out + '</g>';
    S.paintNodes = [];
    S.paintEdges = [];
    R11.starIndex = [];
    const hint = document.getElementById('mapHint');
    if (hint) hint.textContent = 'Click to explore · Scroll between levels · Drag to pan';
  }

  function dictionarySpine(g) {
    // The dictionary keeps its legacy region/id and routes. Only its painted
    // entrance moves: retain the existing map bounds, camera and course layout.
    // v3.2: it is drawn as a row-like control (a glyph, its name, its count of terms as a readout), in
    // the place and at the size the bar had.
    const u = g.unit * (g.spineBox?.scale || 1),
      x = g.spineBox ? g.spineBox.x : g.box.x + g.box.w * 0.48,
      y = g.box.y + 17 * u,
      w = g.spineBox ? g.spineBox.w : g.box.w * 0.52 - 26 * u,
      h = 53 * u,
      r = Math.min(6 / S.z, h / 2),
      gs = 24 * u,
      fs = 25 * u,
      label = 'Legal dictionary',
      labelX = x + 16 * u + gs + 10 * u,
      labelW = widthOf(label, fs, 500, 'authority-volume-title'),
      terms = window.DKLA?.glossaryCount?.() || 0,
      count = terms ? terms.toLocaleString('en-US') : '',
      cfs = 21 * u,
      // the count is drawn only where it stands clear of the name and is large enough to read
      showCount = !!count && cfs * S.z >= 9 && labelX + labelW + cfs * 7.4 + 16 * u <= x + w;
    return `<g class="map-region dictionary-spine v32-dictionary" role="button" tabindex="0" data-dictionary-spine aria-label="Open legal dictionary${count ? ': ' + count + ' terms' : ''}"><title>Open legal dictionary${count ? ' · ' + count + ' terms' : ''}</title><path class="dictionary-spine-cover" data-map-region="dictionary-region" d="M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z" stroke-width="${1 / S.z}"/><g class="v32-glyph" transform="translate(${x + 16 * u} ${y + (h - gs) / 2}) scale(${gs / 16})"><path d="M8 4.4C6.8 3.5 5 3 2.5 3v9c2.5 0 4.3.5 5.5 1.4 1.2-.9 3-1.4 5.5-1.4V3C11 3 9.2 3.5 8 4.4ZM8 4.4v9"/></g><text class="region-title dictionary-spine-title" data-map-region="dictionary-region" x="${labelX}" y="${y + h / 2 + fs * 0.35}" font-size="${fs}" font-weight="500" pointer-events="none">${label}</text>${showCount ? `<text class="v32-count" x="${x + w - 16 * u}" y="${y + h / 2 + cfs * 0.36}" font-size="${cfs}" text-anchor="end" pointer-events="none"><tspan class="v32-num">${count}</tspan> terms</text>` : ''}</g>`;
  }
  function entrance() {
    if (active() || window.SCOTUSHistory?.state?.().open) return;
    // Replace the native floating tile in the same draw, without changing any
    // graph records or saved geography. The spine is its sole rendered target.
    svg.querySelectorAll('g.map-region').forEach((el) => {
      if (el.querySelector('[data-map-region="dictionary-region"]')) el.remove();
    });
    svg.querySelectorAll('[data-map-region="dictionary-region"]').forEach((el) => el.remove());
    const g = geometry(root, true),
      B = visibleBox();
    if (!intersects(g.box, B, 80)) return;
    // v3.2: this block belongs to Home. It fades as a course takes over the view (r19/r20.js fadeOthers) and
    // is not drawn at all once the course is alone, so it never shows under a course view's controls.
    const fade = (typeof R18 !== 'undefined' && R18.courseFade) || 0;
    if (fade >= 0.85) return;
    let out = `<g class="authority-map-entrance" data-map-region="${ROOT}" role="group" aria-label="Rules and authorities"${fade > 0 ? ` opacity="${(1 - fade).toFixed(3)}"` : ''}><title>Constitution, federal rules, codes and Restatements</title>${frame(root, g, true)}<g class="authority-title-control" data-map-region="${ROOT}" role="button" tabindex="0" aria-label="Explore rules and authorities"><rect x="${(g.panels?.[0] || g.box).x + 26 * g.unit}" y="${g.box.y + 14 * g.unit}" width="${(g.panels?.[0] || g.box).w - 52 * g.unit}" height="${g.header - 24 * g.unit}" fill="transparent" pointer-events="all"/></g>`;
    for (const card of g.cards.values()) out += tile(card, true);
    out += dictionarySpine(g) + '</g>';
    // v3.2: turning this markup into elements was the largest single cost of a draw. While the markup is
    // the same as last time (a pan, or a draw that changed something else) the elements made then are put
    // back. They are a copy kept aside, never the ones on the page, so nothing a later layer does to the
    // drawn tile can leak into the next draw.
    if (entranceKept?.markup !== out) {
      const holder = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      holder.innerHTML = out;
      entranceKept = { markup: out, node: holder.firstElementChild };
    }
    svg.appendChild(entranceKept.node.cloneNode(true));
  }
  let entranceKept = null;
  const oldDraw = draw;
  draw = function (...args) {
    if (active()) return paintMap();
    return oldDraw.apply(this, args);
  };
  // The earlier map decorators assume Case/Concept records and would add their
  // own tiles or hide small private text. Commit private geometry last instead.
  if (typeof R18 !== 'undefined')
    R18.afterDraw.push(() => {
      if (active()) paintMap();
      else entrance();
    });
  // This view has its own levels (group, sub-group, provision): a pinch steps through them.
  const oldContinuous = R11.continuous;
  R11.continuous = function () {
    return !active() && oldContinuous();
  };
  const oldLevel = R11.level;
  R11.level = function (p) {
    if (active()) return { lvl: ancestors(current()).length, authority: current().key };
    return oldLevel(p);
  };
  const oldStep = R11.step;
  R11.step = function (dir, p) {
    if (!active()) return oldStep(dir, p);
    if (dir < 0) {
      if (S.panelOpen || selectedEntry()) {
        remember();
        setReader(false);
        selected = null;
        renderInspector();
        renderHeading();
        fitBox(geometry().fit, true, 16, 1);
        return true;
      }
      const n = current();
      if (n.parent) openGroup(n.parent.key);
      else home('Atlas');
      return true;
    }
    const q = p || mapCenterVisible();
    const cards = [...geometry().cards.values()];
    const hit =
      cards.find((c) => q.x >= c.x && q.x <= c.x + c.w && q.y >= c.y && q.y <= c.y + c.h) ||
      cards.reduce(
        (best, c) =>
          !best ||
          Math.hypot(c.x + c.w / 2 - q.x, c.y + c.h / 2 - q.y) <
            Math.hypot(best.x + best.w / 2 - q.x, best.y + best.h / 2 - q.y)
            ? c
            : best,
        null,
      );
    if (!hit) return false;
    if (hit.node.entry) open(hit.node.entry.id);
    else openGroup(hit.node.key);
    return true;
  };
  const oldFit = fit;
  fit = function (...args) {
    if (active()) {
      remember();
      refitAuthority(true);
      return;
    }
    return oldFit.apply(this, args);
  };
  document.getElementById('studyFit').onclick = () => fit();
  document.getElementById('studyBack').onclick = () => back();
  let resizeTimer;
  function settleResize() {
    if (!active()) {
      schedule();
      return;
    }
    if (S.drag || R11.anim) {
      resizeTimer = setTimeout(settleResize, 80);
      return;
    }
    geometryCache = null;
    refitAuthority(false);
  }
  new ResizeObserver(() => {
    geometryCache = null;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(settleResize, 120);
    schedule();
  }).observe(svg);
  if (typeof restoreView === 'function') {
    const previousRestore = restoreView;
    restoreView = function (...args) {
      const out = previousRestore.apply(this, args);
      if (active()) {
        geometryCache = null;
        refitAuthority(false);
      }
      return out;
    };
  }
  document.addEventListener(
    'click',
    (ev) => {
      if (ev.target.closest('[data-dictionary-spine]')) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        goRegion('dictionary-region');
        return;
      }
      const b = ev.target.closest(
        '[data-authority-open],[data-authority-menu],[data-authority-group],[data-authority-anchor],[data-uscode-entry]',
      );
      if (!b) return;
      if (b.dataset.uscodeEntry !== undefined) {
        ev.preventDefault();
        ev.stopPropagation();
        if (b.dataset.uscodeEntry) open(b.dataset.uscodeEntry);
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      closeSearch();
      if (b.dataset.authorityAnchor)
        panel.querySelector('#' + b.dataset.authorityAnchor)?.scrollIntoView({ block: 'start' });
      else if (b.dataset.authorityGroup) openGroup(b.dataset.authorityGroup);
      else open(b.dataset.authorityOpen || null);
    },
    true,
  );
  document.addEventListener(
    'keydown',
    (ev) => {
      if (ev.target.closest('[data-dictionary-spine]') && (ev.key === 'Enter' || ev.key === ' ')) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        goRegion('dictionary-region');
      }
    },
    true,
  );
  document.addEventListener(
    'keydown',
    (ev) => {
      const b = ev.target.closest('[data-authority-page]');
      if (b && (ev.key === 'Enter' || ev.key === ' ')) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        changePage(b.dataset.authorityPage);
      }
    },
    true,
  );
  if (typeof moreMenu === 'function') {
    const prior = moreMenu;
    moreMenu = function (...args) {
      const result = prior.apply(this, args),
        menu = document.getElementById('moreMenu');
      if (menu && !menu.hidden && !menu.querySelector('[data-authority-menu]')) {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.authorityMenu = '1';
        b.role = 'menuitem';
        b.textContent = TITLE;
        menu.appendChild(b);
      }
      return result;
    };
    document.getElementById('moreBtn').onclick = () => moreMenu();
  }
  function contextual() {
    if (!panel || panel.hidden) return;
    const id = selected?.type === 'node' ? selected.id : null,
      ids = (D.byNode[id] || []).filter((x) => byId.has(x));
    const body = panel.querySelector('.reader-body');
    if (!body) return;
    const old = body.querySelector('.authority-context');
    if (old?.dataset.node === id) return;
    old?.remove();
    if (!ids.length) return;
    const el = document.createElement('details');
    el.className = 'authority-context';
    el.dataset.node = id;
    el.innerHTML = `<summary>Authorities cited <small>${ids.length}</small></summary><div>${ids.map((x) => `<button type="button" data-authority-open="${esc(x)}">${esc(entryName(byId.get(x)))}</button>`).join('')}</div>`;
    body.appendChild(el);
  }
  if (panel) new MutationObserver(contextual).observe(panel, { childList: true, subtree: true });
  const search = document.getElementById('search'),
    searchResults = document.getElementById('searchResults');
  if (search && searchResults)
    new MutationObserver(() => {
      if (searchResults.hidden || searchResults.dataset.authorities === search.value) return;
      searchResults.dataset.authorities = search.value;
      searchResults.querySelector('.authority-search')?.remove();
      const q = fold(search.value.trim());
      if (q.length < 3) return;
      const words = q.split(/\s+/),
        hits = D.entries
          .filter((e) => words.every((w) => fold([e.cite, e.title].join(' ')).includes(w)))
          .slice(0, 5),
        groupHits = D.collections.filter((c) => words.every((w) => fold(c.title).includes(w))).slice(0, 2);
      if (!hits.length && !groupHits.length) return;
      const box = document.createElement('div');
      box.className = 'r19-search authority-search';
      box.innerHTML =
        '<div class="search-label">Rules & authorities</div>' +
        groupHits
          .map(
            (c) =>
              `<button type="button" data-authority-group="${esc(collectionGroups.get(c.id).key)}" data-result-type="Rule"><strong>${esc(c.title)}</strong><small><span class="search-type">Rule</span>Explore the collection on the atlas</small></button>`,
          )
          .join('') +
        hits
          .map(
            (e) =>
              `<button type="button" data-authority-open="${esc(e.id)}" data-result-type="Rule"><strong>${esc(entryName(e))}</strong><small><span class="search-type">Rule</span>${esc(collections.get(e.collection).title)}</small></button>`,
          )
          .join('');
      searchResults.appendChild(box);
    }).observe(searchResults, { childList: true });
  window.DKLAAuthorities = {
    open,
    group: openGroup,
    data: D,
    version: 5,
    // The whole Code, for the citation search (src/features/v31/uscode.js) and the checks.
    uscode: USC?.titles
      ? {
          release: USC.release,
          has: (t) => uscTitles.has(Number(t)),
          loaded: (t) => uscReady.has(Number(t)),
          failed: (t) => uscFailed.get(Number(t)) || '',
          load: loadTitle,
          // {entry, held, trail} for a citation, or null when the title has no such section.
          async find(t, s) {
            await loadTitle(t);
            const e = findSection(t, s);
            if (!e) return null;
            const trail = [];
            for (
              let n = wholeAt.get(e.id)?.parent;
              n && n.uscTitle === undefined && n.key !== WHOLE;
              n = n.parent
            )
              if (!n.range) trail.unshift(n.badge || n.title);
            return {
              entry: e,
              held: !e.virtual,
              trail: ['Title ' + t, ...trail],
              group: wholeAt.get(e.id)?.parent.key || null,
            };
          },
          async openCitation(t, s) {
            t = Number(t);
            if (!uscTitles.has(t)) return;
            let e = null;
            try {
              await loadTitle(t);
              e = findSection(t, s);
            } catch {
              /* the title page says why */
            }
            if (e) open(e.id);
            else openGroup(uscTitles.get(t).key);
          },
          title: (t) => uscTitles.get(Number(t))?.key || null,
        }
      : null,
    // The overview's natural height, in its own pixels, with `cols` columns of
    // books 480 px wide each (for the Home prototypes in v25/home-variants.js).
    natural(cols, colW = 480) {
      const width = cols * colW,
        w = (width - 52 - 22 * (cols - 1)) / cols,
        heading = rows(display(root), width - 52, 32, 550, 3, 'authority-map-heading'),
        header = 28 + heading.length * 32 * 1.25 + 24,
        sets = cols === 1 ? [root.children.slice(0, 3), root.children.slice(3)] : [root.children];
      let most = 0;
      for (const set of sets) {
        const models = set.map((c) => tileModel(c, w, true, false, 0));
        let y = header;
        for (let i = 0; i < models.length; i += cols)
          y += Math.max(...models.slice(i, i + cols).map((m) => m.h)) + 22;
        most = Math.max(most, y - 22 + 26);
      }
      return most;
    },
    geography: () => ({
      entrance: { ...geometry(root, true).box, id: ROOT },
      layout: (() => {
        const g = geometry();
        return {
          box: { ...g.box },
          fit: { ...g.fit },
          columns: g.cols,
          density: g.density,
          visibleRows: g.visibleRows,
          safe: g.safe,
          page: g.page,
          pages: g.pages.map((p) => ({ ...p })),
          cards: [...g.cards.values()].map((c) => ({
            id: c.node.key,
            x: c.x,
            y: c.y,
            w: c.w,
            h: c.h,
            previews: c.model.previews.length,
          })),
        };
      })(),
      route: ancestors(current()).map((n) => ({ id: n.key, title: n.title })),
      groupCount: groups.size,
      provisionCount: leaves.size,
      children: current().children.map((n) => ({
        id: n.key,
        title: n.title,
        cite: n.label,
        count: n.count,
        provision: n.entry?.id || null,
      })),
      view: { scope: S.scope, region: S.region, selected: selected ? { ...selected } : null },
    }),
  };
  schedule();
})();
