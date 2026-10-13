/* Content and release guards. Run after `pnpm build`.
   content.py        no brief, opinion, PDF, dictionary record or dataset changed
   release_guard.py  the built atlas still carries the original data and runtime
   check_worker.cjs  the offline service worker behaves */
import {py,run} from '../runtime.mjs';
py('tools/verify/content.py');
py('tools/verify/release_guard.py');
run(process.execPath,['tools/r19/check_worker.cjs']);
