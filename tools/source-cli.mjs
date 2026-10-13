import { py } from './runtime.mjs';
py('tools/source/check.py', ...process.argv.slice(2));
