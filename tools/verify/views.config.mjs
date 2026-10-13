/* Settings for the picture comparison of the main views (views.spec.mjs).

   Baselines are kept per operating system in tools/verify/views/<platform>/,
   because the same page is drawn with slightly different letter shapes on
   Windows, Linux and macOS. See views.spec.mjs for what happens on a system
   that has no baselines. */
import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  testDir: '.',
  testMatch: 'views.spec.mjs',
  // Not test-results/: the Home check empties that folder when it starts.
  outputDir: '../../work/views',
  snapshotPathTemplate: 'views/{platform}/{arg}{ext}',
  fullyParallel: true,
  timeout: 150000,
  reporter: 'line',
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      stylePath: fileURLToPath(new URL('./views.css', import.meta.url)),
      scale: 'css',
      // Allows a stray anti-aliased edge; a moved, missing or recoloured part
      // of a view changes far more than this.
      maxDiffPixelRatio: 0.002,
      timeout: 20000,
    },
  },
  use: { deviceScaleFactor: 1, colorScheme: 'dark', locale: 'en-US', timezoneId: 'America/New_York' },
});
