/* Browser checks only, against an existing build: `pnpm smoke`.
   Serves dist/ on a free loopback port and drives a real headless browser
   with throwaway storage. Nothing here touches the live site or real data. */
process.argv.push('--group','browser');
await import('./run.mjs');
