/* The build, as named steps. tools/build.mjs runs them in order (this is what
   Vercel runs); tools/verify/all.mjs runs the same steps and overlaps the ones
   that do not depend on each other. Change the build here, in one place. */
import { python } from './runtime.mjs';
const py = (...args) => [python, ['-X', 'utf8', ...args]],
  node = (...args) => [process.execPath, args];
// Untracked local/preview sessions do not need the analytics network database.
const production = process.env.VERCEL_ENV === 'production';
export const buildSteps = [
  { name: 'assemble the atlas', command: py('tools/r19/assemble.py'), needs: [] },
  { name: 'check the assembled atlas', command: py('tools/r19/check.py'), needs: ['assemble the atlas'] },
  {
    name: 'analytics catalogue',
    command: node('tools/analytics/prepare.mjs', ...(production ? [] : ['--catalog-only'])),
    needs: ['assemble the atlas'],
  },
  {
    name: 'package public files',
    command: node('tools/package-public.mjs'),
    needs: ['assemble the atlas', 'analytics catalogue'],
  },
];
