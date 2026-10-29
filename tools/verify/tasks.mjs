/* Every step of a full verification pass, with what each one has to wait for.

   `needs` is the only ordering: a step starts as soon as the steps it needs
   have passed. Steps that read nothing the build writes start at once and run
   alongside the build. A step that reads work/build waits for the atlas to be
   assembled; one that reads dist/ waits for packaging; the browser steps wait
   for the local preview server.

   Which steps are independent of the build was established by running each
   with no build output present and by reading what it opens. If you add a
   step and are not sure, make it need 'package public files'. */
import os from 'node:os';
import { python } from '../runtime.mjs';
import { buildSteps } from '../build-steps.mjs';
const py = (...args) => [python, ['-X', 'utf8', ...args]],
  node = (...args) => [process.execPath, args],
  test = (file) => node('--test', file);
// Not a real dependency: the two steps that read tens of thousands of files
// wait for the assembler so they do not slow the chain everything else hangs on.
const AFTER_ASSEMBLY = ['assemble the atlas'];
const SOURCE = ['source reassembles'],
  ASSEMBLED = ['assemble the atlas', 'analytics catalogue'],
  PACKAGED = ['package public files'],
  SERVER = ['preview server'];
// Each Home window size loads the whole atlas in its own browser. Nine at once
// is fastest on a 16-thread machine; smaller machines get proportionally fewer.
const CORES = os.availableParallelism(),
  HOME_WORKERS = Math.max(1, Math.min(9, Math.round((CORES * 9) / 16)));
const step = (group, name, command, needs = []) => ({ group, name, command, needs });

export const tasks = [
  // Reads every source file once, checks any cached copy against it and leaves
  // the cache fresh, so the steps below share this one read (see tools/source/tree.py).
  step('source', 'source reassembles', py('tools/source/check.py', '--verify'), AFTER_ASSEMBLY),
  // The build does not wait for that step: it uses the cache if the files are
  // unchanged since it was written, and the step above fails the pass if the
  // cache and the files ever disagree.
  ...buildSteps.map((s) => ({ group: 'build', ...s })),

  // Source and unit checks: no build output involved.
  step('source', 'source parts', py('tools/source/test_parts.py')),
  step('source', 'html checker self-test', test('tools/source/check_html.test.cjs')),
  step('features', 'brief loader', test('tools/performance/brief-loader.test.mjs')),
  step(
    'features',
    'readable paragraphs preserve every word',
    node('tools/v28/readability-check.cjs'),
    ASSEMBLED,
  ),
  step('features', 'saved work', node('tools/v25/saved-work_check.cjs')),
  step('features', 'boot', node('tools/v25/boot_check.cjs')),
  step('features', 'reading panel', node('tools/v25/reading_check.cjs')),
  step('features', 'geography module', node('tools/v25/geography_check.cjs')),
  step('features', 'ratings sync', test('tools/sync/sync.test.mjs')),
  step('public', 'old addresses redirect', node('tools/verify/check_routes.mjs')),
  step('public', 'configuration files are valid', node('tools/verify/check_config.mjs')),
  // Code stays readable: run `pnpm format` if this fails.
  step(
    'source',
    'code is formatted',
    node('node_modules/prettier/bin/prettier.cjs', '--check', '.', '--log-level', 'warn'),
  ),
  step('guards', 'content inventory', py('tools/verify/content.py'), AFTER_ASSEMBLY),

  // Dataset and review-record checks: they read the datasets, not the build.
  // The heaviest dataset check (it uses several processes): start it at once so
  // it is finished before the browsers need the processor.
  {
    ...step('datasets', 'authority citation links', py('tools/v25/authorities_build.py', '--check')),
    weight: Math.min(4, CORES),
  },
  step('datasets', 'U.S. Code', py('tools/v25/uscode_build.py', '--check')),
  step('datasets', 'timeline audit', py('tools/v25/check_timeline_audit.py', '--json'), SOURCE),
  step('datasets', 'every case has an original source and chronology', py('tools/v28/check.py'), SOURCE),
  step('datasets', 'explanation inventory', py('tools/v25/explanation_inventory.py', '--check'), SOURCE),
  step('datasets', 'generated rule connections', py('tools/v25/generated_rule_connections_check.py'), SOURCE),
  step(
    'datasets',
    'generated rule connections (runtime)',
    node('tools/v25/generated_rule_connections_check.cjs'),
  ),
  step('datasets', 'practice filter records', py('tools/v25/check_practice_filter.py'), SOURCE),
  step('datasets', 'geography', py('tools/v25/geography_check.py', '--check'), SOURCE),
  step('datasets', 'Cold Call index', py('tools/cold-call/check_index.py')),
  step(
    'datasets',
    'Cold Call narratives',
    py('tools/cold-call/check_narratives.py', '--require-complete'),
    SOURCE,
  ),
  step('datasets', 'Cold Call main audit', py('tools/cold-call/check_main_audit.py'), SOURCE),
  // Weeks 6 to 9 name the readings of the October 1, 2026 syllabus (reads the graph seed, not the build).
  step(
    'datasets',
    'Civil Procedure follows the October 1 syllabus',
    node('tools/sessions/civil_syllabus_check.mjs'),
  ),

  // The analytics catalogue step rewrites lib/analytics/catalog.json, so
  // anything that may load it waits for that step.
  step('analytics', 'analytics tests', test('tools/analytics/analytics.test.mjs'), ['analytics catalogue']),
  step('analytics', 'browser recognition', test('tools/analytics/browser-recognition.test.mjs'), [
    'analytics catalogue',
  ]),

  // These read the assembled atlas in work/build.
  step('guards', 'data guard', py('tools/verify/data_guard.py'), ASSEMBLED),
  step('guards', 'offline worker', node('tools/r19/check_worker.cjs'), ASSEMBLED),
  step('analytics', 'analytics build check', node('tools/analytics/check.mjs'), ASSEMBLED),
  step('features', 'practice filter', node('tools/v25/practice_filter_check.cjs'), ASSEMBLED),
  step('features', 'authorities', node('tools/v25/authorities_check.cjs'), ASSEMBLED),
  step('features', 'Cold Call reader', node('tools/cold-call/check_reader.cjs'), ASSEMBLED),

  // These read the public output in dist/.
  step('public', 'hosted page parses', node('tools/source/check_html.cjs', 'dist/DKLA-v2.8.html'), PACKAGED),
  { group: 'browser', name: 'preview server', server: true, needs: PACKAGED, weight: 0 },

  // These use the preview server. {url} and {page} are filled in by the runner.
  step('browser', 'public files and server', node('tools/verify/check_public.mjs', '{url}'), SERVER),
  step(
    'browser',
    'source pages and complete course chronologies',
    node('tools/v28/browser.cjs', '{page}'),
    SERVER,
  ),
  // Four pages at once: three screen sizes and the saved-work test.
  {
    ...step(
      'browser',
      '29 interactions',
      node('tools/verify/browser_smoke.cjs', '--url', '{page}', '--output', 'work/browser-smoke'),
      SERVER,
    ),
    weight: Math.min(4, CORES),
  },
  step(
    'browser',
    'map geometry',
    py('tools/verify/compare_geometry.py', 'tools/verify/geometry', 'work/browser-smoke'),
    ['29 interactions'],
  ),
  {
    ...step(
      'browser',
      'Home at nine window sizes',
      node(
        'node_modules/@playwright/test/cli.js',
        'test',
        'tools/v25/home-fit.spec.mjs',
        '--fully-parallel',
        '--workers=' + HOME_WORKERS,
        '--reporter=line',
      ),
      SERVER,
    ),
    env: { DKLA_HOME_TEST_URL: '{page}' },
    weight: HOME_WORKERS,
  },
  // Two pages (desktop and phone), each walking through the main views.
  {
    ...step(
      'browser',
      'main views match their pictures',
      node(
        'node_modules/@playwright/test/cli.js',
        'test',
        '-c',
        'tools/verify/views.config.mjs',
        '--workers=' + Math.min(2, CORES),
      ),
      SERVER,
    ),
    env: { DKLA_VIEWS_URL: '{page}' },
    weight: Math.min(2, CORES),
  },
];
