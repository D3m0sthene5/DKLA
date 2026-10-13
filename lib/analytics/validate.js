import { readFileSync } from 'node:fs';
import { UUID, fail } from './security.js';
export const catalog = JSON.parse(readFileSync(new URL('./catalog.json', import.meta.url), 'utf8'));
export const entries = new Map(catalog.nodes.map((n) => [n.id, n]));
export const KINDS = new Set([
  'visit',
  'presence',
  'entry_open',
  'entry_close',
  'read_section',
  'scroll',
  'copy',
  'map_level',
  'camera',
  'search',
  'search_click',
  'search_abandon',
  'dictionary',
  'source_open',
  'source_page',
  'missing_source',
  'scotus',
  'timeline',
  'cold_call',
  'authority',
  'study_open',
  'drill_start',
  'drill_reveal',
  'drill_complete',
  'pairs',
  'sheets',
  'progress',
  'rating',
  'streak',
  'sync_created',
  'sync_linked',
  'export',
  'print',
  'install_available',
  'install',
  'offline',
  'online',
  'js_error',
  'help',
  'repeat_open',
  'possible_dead_click',
]);
const text = (s, max = 180) =>
  typeof s === 'string'
    ? s
        .replace(/[\x00-\x1f\x7f]/g, ' ')
        .slice(0, max)
        .replace(/\b[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}\b/gi, '[sync code]')
    : '';
export const redact = (s) =>
  text(s, 2048).replace(/\b[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}\b/gi, '[sync code]');
export function safeURL(value) {
  try {
    const url = new URL(text(value, 2048));
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    url.username = '';
    url.password = '';
    for (const key of [...url.searchParams.keys()])
      if (/code|token|key|password|secret|auth|note|email/i.test(key)) url.searchParams.delete(key);
    url.hash = redact(url.hash);
    return redact(url.href);
  } catch {
    return '';
  }
}
export function metadata(input = {}) {
  const out = {};
  for (const key of [
    'browser',
    'browserVersion',
    'os',
    'osVersion',
    'platform',
    'language',
    'timezone',
    'pointer',
    'colourScheme',
    'reducedMotion',
    'connection',
    'effectiveType',
    'displayMode',
  ])
    if (input[key] !== undefined) out[key] = text(input[key]);
  for (const key of [
    'viewportWidth',
    'viewportHeight',
    'screenWidth',
    'screenHeight',
    'pixelRatio',
    'touchPoints',
    'memory',
    'cores',
    'downlink',
    'rtt',
  ])
    if (Number.isFinite(input[key])) out[key] = Math.max(0, Math.min(100000, input[key]));
  if (typeof input.saveData === 'boolean') out.saveData = input.saveData;
  if (out.timezone) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: out.timezone });
    } catch {
      out.timezone = '';
    }
  }
  out.referrer = safeURL(input.referrer);
  out.landing = redact(input.landing);
  out.utm = {};
  for (const key of ['source', 'medium', 'campaign', 'term', 'content'])
    if (input.utm?.[key]) out.utm[key] = redact(text(input.utm[key], 200));
  return out;
}
const seconds = (value) => Math.max(0, Math.min(86400, Math.floor(Number(value) || 0)));
export function event(input, sessionStart, sessionEnd) {
  if (!input || !UUID.test(input.id || '') || !KINDS.has(input.kind)) throw fail(400, 'bad-event');
  const at = new Date(input.at);
  if (!Number.isFinite(+at) || +at < +sessionStart - 1000 || +at > +sessionEnd + 1000)
    throw fail(400, 'bad-event-time');
  const entity = text(input.entity, 200),
    canonical = entries.get(entity) || entries.get(entity.replace(/^brief-/, ''));
  // A user-created entry can contain private notes in its title. Accept only its opaque id.
  if (entity && !/^[a-zA-Z0-9_.:|-]{1,200}$/.test(entity)) throw fail(400, 'bad-entity');
  const d = input.details || {},
    details = {};
  for (const key of [
    'section',
    'feature',
    'action',
    'source',
    'level',
    'layout',
    'tab',
    'view',
    'errorName',
    'file',
    'sourceKind',
  ])
    if (d[key] !== undefined) details[key] = text(d[key], 200).replace(/[^a-zA-Z0-9_.:/| -]/g, '');
  for (const key of [
    'depth',
    'length',
    'page',
    'results',
    'rating',
    'count',
    'index',
    'total',
    'streak',
    'line',
    'column',
    'x',
    'y',
    'z',
    'width',
    'height',
    'visibleWidth',
    'visibleHeight',
  ])
    if (Number.isFinite(d[key])) details[key] = Math.max(-1000000, Math.min(1000000, d[key]));
  for (const key of ['complete', 'cram', 'success', 'clicked', 'offline', 'active', 'visible'])
    if (typeof d[key] === 'boolean') details[key] = d[key];
  if (['search', 'search_click', 'search_abandon'].includes(input.kind))
    details.query = redact(text(d.query, 200));
  if (['search', 'search_click'].includes(input.kind) && Array.isArray(d.ids))
    details.ids = d.ids.filter((id) => typeof id === 'string' && entries.has(id)).slice(0, 30);
  return {
    id: input.id,
    at: at.toISOString(),
    kind: input.kind,
    entity: canonical?.id || entity,
    course: canonical?.course || '',
    region: canonical?.region || '',
    activeSeconds: seconds(input.activeSeconds),
    details,
  };
}
export function batch(input) {
  if (!UUID.test(input.session?.id || '') || !Array.isArray(input.events) || input.events.length > 80)
    throw fail(400, 'bad-batch');
  const s = input.session,
    start = new Date(s.startedAt),
    end = new Date(s.endedAt);
  if (
    !Number.isFinite(+start) ||
    !Number.isFinite(+end) ||
    +end < +start ||
    +end > Date.now() + 60000 ||
    +start < Date.now() - 366 * 86400000 ||
    +end - +start > 86400000
  )
    throw fail(400, 'bad-session-time');
  const active = Math.min(seconds(s.activeSeconds), Math.ceil((+end - +start) / 1000));
  return {
    session: {
      id: s.id,
      startedAt: start.toISOString(),
      endedAt: end.toISOString(),
      activeSeconds: active,
      build: text(s.build, 100),
      metadata: metadata(s.metadata),
    },
    events: input.events.map((e) => event(e, start, end)),
  };
}
export const validId = (value) => {
  if (!UUID.test(value || '')) throw fail(400, 'bad-id');
  return value;
};
