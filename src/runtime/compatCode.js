function geoValidateNavigation(g) {
  if (!g || g.version !== 1 || !Array.isArray(g.regions) || !g.placements || typeof g.placements !== 'object')
    throw Error('Invalid geography metadata.');
  if (g.regions.length > 100) throw Error('The map supports at most 100 subjects.');
  const ids = new Set(),
    ds = new Map(),
    safe = (id) => typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(id);
  for (const r of g.regions) {
    if (
      !safe(r.id) ||
      ids.has(r.id) ||
      !/^#[0-9a-f]{6}$/i.test(r.color) ||
      !Number.isInteger(r.col) ||
      !Number.isInteger(r.row) ||
      r.col < 0 ||
      r.col > 30 ||
      r.row < 0 ||
      r.row > 30 ||
      typeof r.title !== 'string' ||
      r.title.length > 300 ||
      !Array.isArray(r.districts)
    )
      throw Error('Invalid map subject.');
    ids.add(r.id);
    for (const d of r.districts) {
      if (!safe(d.id) || ds.has(d.id) || typeof d.title !== 'string' || d.title.length > 400)
        throw Error('Invalid or duplicate map subtopic.');
      ds.set(d.id, r.id);
    }
  }
  for (const p of Object.values(g.placements)) {
    if (
      !p ||
      !ids.has(p.region) ||
      ds.get(p.district) !== p.region ||
      !['main', 'supporting', 'reference'].includes(p.tier) ||
      typeof p.role !== 'string' ||
      p.role.length > 200 ||
      typeof p.displayLabel !== 'string' ||
      p.displayLabel.length > 1000
    )
      throw Error('Invalid entry placement.');
  }
  return g;
}
const geoNormalizeSource = normalize;
normalize = function (graph) {
  const out = geoNormalizeSource(graph);
  if (!out.geography && out.graphId === base.graphId) out.geography = clone(base.geography);
  if (out.geography) {
    geoValidateNavigation(out.geography);
    const ds = new Map(out.geography.regions.flatMap((r) => r.districts.map((d) => [d.id, d])));
    for (const d of ds.values()) d.nodeIds = [];
    for (const n of out.nodes) {
      if (!out.geography.placements[n.id] && ds.has('inbox'))
        out.geography.placements[n.id] = {
          region: 'workbench-region',
          district: 'inbox',
          role: 'Unfiled entry',
          tier: 'supporting',
          displayLabel: n.shortTitle || n.title,
          reviewNote: 'New entry awaiting a map placement. The original entry remains unchanged.',
          placementBasis: 'Automatic inbox for an unplaced entry',
          landmark: false,
        };
      const p = out.geography.placements[n.id];
      if (p && ds.has(p.district)) ds.get(p.district).nodeIds.push(n.id);
    }
  }
  return out;
};

const geoOldMarkdown = markdown;
markdown = function (n, names) {
  const text = geoOldMarkdown(n, names),
    p = geoPlacement(n.id),
    r = geoRegion(p.region),
    d = geoDistrict(p.district),
    ranges = n.textbookImport?.printedRanges;
  const scope = ranges?.length
    ? '\n## Source scope\n\nSource range(s) used: ' +
      ranges.map((a) => (a[0] === a[1] ? a[0] : a[0] + '–' + a[1])).join(', ') +
      '. Printed casebook pages; these ranges can include surrounding notes.\n'
    : '';
  return (
    text +
    scope +
    `\n## Map placement\n\n[[Maps/subject-${p.region}|${r?.title || 'Study workbench'}]] → [[Maps/subtopic-${p.district}|${d?.title || 'New & unfiled entries'}]]\n\nNavigation role: ${p.role}. Map tier: ${p.tier}. This is not a source or exam-priority classification.\n\n${p.reviewNote || ''}\n`
  );
};
function geoMarkdownFiles() {
  const names = new Map(
    data.nodes.map((n, i) => [
      n.id,
      data.exportNotes?.fileNames?.[n.id] ||
        String(i + 1).padStart(4, '0') +
          ' ' +
          n.title
            .replace(/[<>:"/\\|?*\[\]#^\x00-\x1f]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 120),
    ]),
  );
  const noteLink = (n) => '[[' + names.get(n.id) + '|' + n.title.replace(/[\[\]|]/g, '') + ']]';
  const subLink = (d) => '[[Maps/subtopic-' + d.id + '|' + d.title + ']]';
  const subjectLink = (r) => '[[Maps/subject-' + r.id + '|' + r.title + ']]';
  const files = data.nodes.map((n) => ['Legal Atlas/' + names.get(n.id) + '.md', markdown(n, names)]);
  const intro =
    'These are editorial navigation pages for the existing notebook. Map prominence describes a reading role, not legal authority, examination weight, or a verified statement of the professor’s emphasis. Cross-topic relationships remain in each entry. The other-year outline was a structural example only.\n';
  const atlas = ['# Legal Atlas · subject map', '', intro, '## Contracts · all 26 assignments', ''];
  for (const r of geoNav().regions) {
    if (r.col === 3 && r.row === 0) atlas.push('', '## Rest of the notebook', '');
    atlas.push('### ' + subjectLink(r), '', r.question || r.description || '', '');
    const regionText = [
      '# ' + r.title,
      '',
      '[[00-Atlas|Whole atlas]]',
      '',
      intro,
      r.question || r.description || '',
      '## Subtopics',
      '',
    ];
    for (const d of r.districts) {
      atlas.push('- ' + subLink(d));
      regionText.push('### ' + subLink(d), '', d.question || d.description || '', '');
      const ns = geoMembers(d.id).sort((a, b) => geoRoleOrder(a, d) - geoRoleOrder(b, d));
      const text = [
        '# ' + d.title,
        '',
        subjectLink(r) + ' · [[00-Atlas|Whole atlas]]',
        '',
        intro,
        d.question || d.description || '',
        '',
      ];
      for (const [tier, title] of [
        ['main', 'Main route'],
        ['supporting', 'Supporting detail'],
      ]) {
        const members = ns.filter(
          (n) => (geoPlacement(n.id).tier === 'main' ? 'main' : 'supporting') === tier,
        );
        if (!members.length) continue;
        text.push('## ' + title, '');
        for (const n of members) {
          const p = geoPlacement(n.id);
          text.push('- ' + noteLink(n) + ' — ' + p.role);
          if (p.reviewNote) text.push('  ' + p.reviewNote);
        }
        text.push('');
      }
      files.push(['Legal Atlas/Maps/subtopic-' + d.id + '.md', text.join('\n')]);
    }
    atlas.push('');
    files.push(['Legal Atlas/Maps/subject-' + r.id + '.md', regionText.join('\n')]);
  }
  files.push(
    ['Legal Atlas/00-Atlas.md', atlas.join('\n')],
    ['Legal Atlas/legal-atlas.json', JSON.stringify(data, null, 2)],
    [
      'Legal Atlas/README.md',
      '# Legal Atlas · geography export\n\nOpen this folder as an Obsidian vault and start with 00-Atlas.md. Subject and subtopic maps link to all existing entries. The notes contain the current detailed accounts and relationships; the JSON retains prior versions, the structured graph, and map metadata.\n\nObsidian’s native graph does not reproduce the custom geographical layout, relationship labels, or review interface of the HTML application. The Markdown export is one-way; later Markdown edits do not automatically return to the HTML app.\n\nPlace Contracts-Semester-Source-Pages.pdf and FA26 Contracts Supplement.pdf from the full project package beside these notes for source-page links. This browser-generated ZIP contains notes and JSON, not a second copy of the source PDF.\n\nThe source basis is the uploaded casebook, the actual Fall 2026 supplement, and the Davis syllabus across all 26 reading assignments. The other-year outline is an organizational example only. No new lecture content or current-law review was added.\n',
    ],
  );
  return files;
}
