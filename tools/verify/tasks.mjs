/* Every step of a full verification pass, with what each one has to wait for.

   `needs` is the only ordering: a step starts as soon as the steps it needs
   have passed. Steps that read nothing the build writes start at once and run
   alongside the build. A step that reads work/build waits for the atlas to be
   assembled; one that reads dist/ waits for packaging; the browser steps wait
   for the local preview server.

   Which steps are independent of the build was established by running each
   with no build output present and by reading what it opens. If you add a
   step and are not sure, make it need 'package public files'. */
import {python} from '../runtime.mjs';
import {buildSteps} from '../build-steps.mjs';
const py=(...args)=>[python,['-X','utf8',...args]],node=(...args)=>[process.execPath,args],test=file=>node('--test',file);
const SOURCE=['source reassembles'],ASSEMBLED=['assemble the atlas','analytics catalogue'],PACKAGED=['package public files'],SERVER=['preview server'];
const step=(group,name,command,needs=[])=>({group,name,command,needs});

export const tasks=[
  // Reads every source file once, checks any cached copy against it and leaves
  // the cache fresh, so the steps below share this one read (see tools/source/tree.py).
  step('source','source reassembles',py('tools/source/check.py','--verify')),
  // The build does not wait for that step: it uses the cache if the files are
  // unchanged since it was written, and the step above fails the pass if the
  // cache and the files ever disagree.
  ...buildSteps.map(s=>({group:'build',...s})),

  // Source and unit checks: no build output involved.
  step('source','source parts',py('tools/source/test_parts.py')),
  step('source','html checker self-test',test('tools/source/check_html.test.cjs')),
  step('features','brief loader',test('tools/performance/brief-loader.test.mjs')),
  step('features','saved work',node('tools/v25/saved-work_check.cjs')),
  step('features','boot',node('tools/v25/boot_check.cjs')),
  step('features','reading panel',node('tools/v25/reading_check.cjs')),
  step('features','geography module',node('tools/v25/geography_check.cjs')),
  step('features','ratings sync',test('tools/sync/sync.test.mjs')),
  step('guards','content inventory',py('tools/verify/content.py')),

  // Dataset and review-record checks: they read the datasets, not the build.
  step('datasets','authorities',py('tools/v25/authorities_build.py','--check'),SOURCE),
  step('datasets','U.S. Code',py('tools/v25/uscode_build.py','--check')),
  step('datasets','timeline audit',py('tools/v25/check_timeline_audit.py','--json'),SOURCE),
  step('datasets','explanation inventory',py('tools/v25/explanation_inventory.py','--check'),SOURCE),
  step('datasets','generated rule connections',py('tools/v25/generated_rule_connections_check.py'),SOURCE),
  step('datasets','generated rule connections (runtime)',node('tools/v25/generated_rule_connections_check.cjs')),
  step('datasets','practice filter records',py('tools/v25/check_practice_filter.py'),SOURCE),
  step('datasets','geography',py('tools/v25/geography_check.py','--check'),SOURCE),
  step('datasets','Cold Call index',py('tools/cold-call/check_index.py')),
  step('datasets','Cold Call narratives',py('tools/cold-call/check_narratives.py','--require-complete'),SOURCE),
  step('datasets','Cold Call main audit',py('tools/cold-call/check_main_audit.py'),SOURCE),

  // The analytics catalogue step rewrites lib/analytics/catalog.json, so
  // anything that may load it waits for that step.
  step('analytics','analytics tests',test('tools/analytics/analytics.test.mjs'),['analytics catalogue']),
  step('analytics','browser recognition',test('tools/analytics/browser-recognition.test.mjs'),['analytics catalogue']),

  // These read the assembled atlas in work/build.
  step('guards','release guard',py('tools/verify/release_guard.py'),ASSEMBLED),
  step('guards','offline worker',node('tools/r19/check_worker.cjs'),ASSEMBLED),
  step('analytics','analytics build check',node('tools/analytics/check.mjs'),ASSEMBLED),
  step('features','practice filter',node('tools/v25/practice_filter_check.cjs'),ASSEMBLED),
  step('features','authorities',node('tools/v25/authorities_check.cjs'),ASSEMBLED),
  step('features','Cold Call reader',node('tools/cold-call/check_reader.cjs'),ASSEMBLED),

  // These read the public output in dist/.
  step('public','hosted page parses',node('tools/source/check_html.cjs','dist/DKLA-v2.6.html'),PACKAGED),
  {group:'browser',name:'preview server',server:true,needs:PACKAGED},

  // These use the preview server. {url} and {page} are filled in by the runner.
  step('browser','public files and server',node('tools/verify/check_public.mjs','{url}'),SERVER),
  step('browser','29 interactions',node('tools/verify/browser_smoke.cjs','--url','{page}','--output','work/browser-smoke'),SERVER),
  step('browser','map geometry',py('tools/verify/compare_geometry.py','tools/verify/geometry','work/browser-smoke'),['29 interactions']),
  {...step('browser','Home at nine window sizes',node('node_modules/@playwright/test/cli.js','test','tools/v25/home-fit.spec.mjs','--fully-parallel','--workers=9','--reporter=line'),SERVER),env:{DKLA_HOME_TEST_URL:'{page}'}},
];
