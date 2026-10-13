/* Content and release guards. Run after `pnpm build`.
   content.py        no brief, opinion, PDF, dictionary record or dataset changed
   data_guard.py     the built atlas still carries exactly the approved data
   check_worker.cjs  the offline service worker behaves */
import {py,run} from '../runtime.mjs';
py('tools/verify/content.py');
py('tools/verify/data_guard.py');
run(process.execPath,['tools/r19/check_worker.cjs']);
