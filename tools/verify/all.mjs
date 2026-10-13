/* Everything, in order: build, then every check. `pnpm verify`.
   Takes about six minutes. Stops at the first failure. */
import {run,py} from '../runtime.mjs';
const node=(...args)=>run(process.execPath,args);
node('tools/build.mjs');
node('tools/check.mjs');                      // source, build output, feature checks
node('tools/verify/check.mjs');               // legal content and release guards
node('tools/analytics/check.mjs');
node('--test','tools/analytics/analytics.test.mjs');
for(const script of [                         // dataset and review-record checks
  ['tools/v25/authorities_build.py','--check'],['tools/v25/uscode_build.py','--check'],
  ['tools/v25/check_timeline_audit.py','--json'],['tools/v25/explanation_inventory.py','--check'],
  ['tools/v25/generated_rule_connections_check.py'],['tools/v25/check_practice_filter.py'],
  ['tools/v25/geography_check.py','--check'],['tools/cold-call/check_index.py'],
  ['tools/cold-call/check_narratives.py','--require-complete'],['tools/cold-call/check_main_audit.py'],
])py(...script);
node('tools/v25/generated_rule_connections_check.cjs');
node('tools/verify/smoke.mjs');               // a real browser against the built site
console.log('\nAll checks passed.');
