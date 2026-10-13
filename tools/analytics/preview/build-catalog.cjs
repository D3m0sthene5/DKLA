const fs = require('node:fs');
const path = require('node:path');
const source = path.resolve(process.argv[2] || 'work/repo/DKLA-r18.html');
const html = fs.readFileSync(source, 'utf8');
const match = html.match(/<script\b[^>]*id="seedData"[^>]*>([\s\S]*?)<\/script>/i);
if (!match) throw new Error('Missing canonical seedData');
const seed = JSON.parse(match[1]);
const map = seed.studyMap;
const regions = map.regions.filter((r) =>
  [
    'Contracts',
    'Civil Procedure',
    'Legislation & Regulation',
    'LRS',
    'Legislation and the Regulatory State',
  ].includes(r.courseKey),
);
const regionById = new Map(regions.map((r) => [r.id, r]));
const homes = Object.fromEntries(Object.entries(map.homes).filter(([, h]) => regionById.has(h.region)));
const nodes = seed.nodes
  .filter((n) => homes[n.id])
  .map((n) => ({
    id: n.id,
    title: n.title,
    kind: n.kind || n.type || 'entry',
    course: regionById.get(homes[n.id].region).courseKey,
    region: homes[n.id].region,
    district: homes[n.id].district,
  }));
const catalog = {
  layoutId: map.layoutId,
  source: 'DKLA-r18.html immutable map geometry retained in v2.5',
  regions: regions.map(({ id, title, courseKey, x, y, w, h }) => ({
    id,
    title,
    course: courseKey,
    x,
    y,
    w,
    h,
  })),
  homes,
  nodes,
};
fs.writeFileSync(
  path.join(__dirname, 'catalog.js'),
  'window.DKLA_CATALOG = ' + JSON.stringify(catalog) + ';\n',
);
console.log(
  JSON.stringify({
    regions: regions.length,
    entries: nodes.length,
    bytes: fs.statSync(path.join(__dirname, 'catalog.js')).size,
    layoutId: map.layoutId,
  }),
);
