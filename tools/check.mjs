/* Current source/build checks; no network or visitor database. */
import { run, py } from './runtime.mjs';
py('tools/source/check.py');
py('tools/source/test_parts.py');
run(process.execPath, ['--test', 'tools/source/check_html.test.cjs']);
run(process.execPath, ['--test', 'tools/performance/brief-loader.test.mjs']);
run(process.execPath, ['--test', 'tools/analytics/browser-recognition.test.mjs']);
py('tools/r19/check.py');
run(process.execPath, ['tools/source/check_html.cjs', 'dist/DKLA-v2.8.html']);
run(process.execPath, ['tools/verify/check_public.mjs']);
for (const script of [
  'tools/v25/saved-work_check.cjs',
  'tools/v25/boot_check.cjs',
  'tools/v25/reading_check.cjs',
  'tools/v25/geography_check.cjs',
  'tools/v25/practice_filter_check.cjs',
  'tools/v25/authorities_check.cjs',
  'tools/cold-call/check_reader.cjs',
])
  run(process.execPath, [script]);

run(process.execPath, ['--test', 'tools/sync/sync.test.mjs']);
