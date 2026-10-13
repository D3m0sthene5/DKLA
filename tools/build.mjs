/* Rebuild the existing standalone release from reviewed source on every deploy. */
import {run,python} from './runtime.mjs';
run(python,['-X','utf8','tools/r19/assemble.py']);
run(python,['-X','utf8','tools/r19/check.py']);
// Untracked local/preview sessions do not need the analytics network database.
run(process.execPath,['tools/analytics/prepare.mjs',...(process.env.VERCEL_ENV==='production'?[]:['--catalog-only'])]);
run(process.execPath,['tools/package-public.mjs']);
