import {py,run} from '../runtime.mjs';
py('tools/v26/content_guard.py');
py('tools/stage1/test_content_guard.py');
run(process.execPath,['tools/r19/check_worker.cjs']);
if(process.argv[2])py('tools/stage1/compare_geometry.py','tools/stage1/baseline',process.argv[2]);
