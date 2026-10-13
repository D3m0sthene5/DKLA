import {py} from '../runtime.mjs';
py('tools/stage2/content_guard.py');
py('tools/stage1/test_content_guard.py');
if(process.argv[2])py('tools/stage1/compare_geometry.py','tools/stage1/baseline',process.argv[2]);
