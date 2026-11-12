import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { buildIndex, corpusDigest, serializeIndex } from '../../lib/ask/retrieve.js';

const build = new URL('../../work/build/', import.meta.url);
const functionBuild = process.argv.includes('--function');
async function readAtlas(dir) {
  const { file } = JSON.parse(await readFile(new URL('version.json', dir), 'utf8'));
  return readFile(new URL(file, dir), 'utf8');
}

// Vercel can package api/ask.js in parallel with the static-site builder.
async function assembleForFunction() {
  const { python, root } = await import('../runtime.mjs');
  await mkdir(build, { recursive: true });
  const dir = await mkdtemp(fileURLToPath(new URL('../ask-function-', build)));
  try {
    execFileSync(python, ['-X', 'utf8', 'tools/r19/assemble.py'], {
      cwd: root,
      env: { ...process.env, DKLA_ASSEMBLY_DIR: dir, PYTHONDONTWRITEBYTECODE: '1' },
    });
    return await readAtlas(new URL('./', pathToFileURL(dir + '/')));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const html = await (functionBuild ? assembleForFunction() : readAtlas(build));
const block = (id) =>
  JSON.parse(html.match(new RegExp('<script\\b[^>]*id="' + id + '"[^>]*>([\\s\\S]*?)<\\/script>'))[1]);

const seed = block('seedData');
const briefs = block('dklaR19Data');
const full = block('dklaR19Full');
const plain = block('dklaR19Plain').nodes;
const audit = block('dklaR21Audit').nodes;
const authorities = block('dklaAuthoritiesData');
const scotus = block('scotusHistoryData');
const collections = new Map(authorities.collections.map((c) => [c.id, c.title]));
const people = new Map(Object.values(scotus.people).map((p) => [p.id, p.name]));
const records = [];

// The model gets bounded excerpts of the same material the published readers use.
function add(type, id, title, category, aliases, overview, passages = []) {
  const clean = (value) =>
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  const text = (parts, max) => clean(parts.filter(Boolean).join(' ')).slice(0, max);
  const summary = text(overview, 1500);
  const excerpts = passages.map((p) => clean(p).slice(0, 1800)).filter(Boolean);
  if (title && (summary || excerpts.length))
    records.push({ type, id, title, category, aliases: text(aliases, 450), summary, excerpts });
}

function applyEdits(node, edits = []) {
  for (const [path, before, after] of edits) {
    const keys = path.split('.');
    const key = keys.pop();
    const parent = keys.reduce((obj, part) => obj?.[part], node);
    if (!parent || parent[key] !== before) continue;
    if (after === null) delete parent[key];
    else parent[key] = after;
  }
}

const indexedNodes = new Map();
const byNode = new Map(
  briefs.entries.filter((entry) => entry[6] && full[entry[0]]).map((entry) => [entry[6], entry]),
);
for (const n of [...seed.nodes, ...briefs.rlcc.rules, ...briefs.rules22.rules]) {
  applyEdits(n, plain[n.id]);
  applyEdits(n, audit[n.id]);
  indexedNodes.set(n.id, n.title);
  const entry = byNode.get(n.id);
  const provision = briefs.provisions[n.id];
  const sections = Object.entries(n.sections || {})
    .filter(([, value]) => typeof value === 'string')
    .map(([label, value]) => label + '. ' + value);
  add(
    'node',
    n.id,
    n.title,
    n.kind,
    [n.shortTitle, ...(n.tags || []), ...(n.courses || []), provision?.cite],
    [(n.courses || []).join(', '), briefs.takeaways[n.id] || (!entry && n.summary)],
    [
      ...(entry ? full[entry[0]].split(/\n(?=## )/) : sections),
      ...(!entry && n.notes ? [n.notes] : []),
      ...(provision?.lines || []).map((line) => line[1]),
    ],
  );
}

for (const [id, title, , , , , node] of briefs.entries) {
  if (!node && full[id]) add('brief', id, title, 'Supporting case', [], [], full[id].split(/\n(?=## )/));
}
for (const t of block('dklaGlossary').terms) {
  add('term', t.slug, t.term, 'Legal dictionary', [], [t.definition]);
}
for (const a of authorities.entries) {
  add(
    'authority',
    a.id,
    a.title === a.cite ? a.title : a.cite + ' · ' + a.title,
    'Rule or authority',
    [collections.get(a.collection)],
    [],
    a.lines.map((line) => line[1]),
  );
}
for (const t of briefs.timelines.list) {
  add(
    'timeline',
    t.id,
    t.title,
    'Doctrine timeline',
    [t.course, t.anchor],
    [t.question, t.now],
    t.steps.map((step) => [step.year, indexedNodes.get(step.id), step.note].filter(Boolean).join(' · ')),
  );
}
for (const [id, c] of Object.entries(scotus.cases)) {
  add(
    'scotus',
    id,
    c.title,
    'SCOTUS vote record',
    [c.citation, 'Supreme Court votes majority dissent concurrence'],
    [c.citation, c.date],
    c.decisions.map((d) =>
      [
        d.title,
        `${d.for} for, ${d.against} against.`,
        ...d.votes.map((v) => `${people.get(v.justice) || v.justice}: ${v.label}.`),
      ].join(' '),
    ),
  );
}
for (const p of Object.values(scotus.people)) {
  add(
    'justice',
    p.id,
    p.name,
    'SCOTUS justice',
    [p.shortName, 'Supreme Court justice'],
    p.service.map((s) => `${s.role} justice, ${s.start} to ${s.end || 'present'}.`),
  );
}

async function save(name, bytes) {
  const temporary = new URL('ask-' + randomUUID() + '.tmp', build);
  await writeFile(temporary, bytes);
  await rename(temporary, new URL(name, build));
}
const corpus = gzipSync(JSON.stringify(records));
// The retrieval index, so a server cold start loads it instead of reading every excerpt
// (lib/ask/retrieve.js). It names the corpus it was built from; api/ask.js ignores a mismatch.
const index = serializeIndex(buildIndex(records), corpusDigest(corpus));
await save('ask-index.bin.gz', gzipSync(index));
await save('ask-corpus.json.gz', corpus);
console.log(
  `Ask DKLA corpus: ${records.length} citable records, index ${(index.length / 1e6).toFixed(1)} MB.`,
);
