/* Rebuild the existing standalone release from reviewed source on every deploy. */
import { run } from './runtime.mjs';
import { buildSteps } from './build-steps.mjs';
for (const step of buildSteps) run(...step.command);
