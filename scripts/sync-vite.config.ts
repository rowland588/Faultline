/* The app's own vite config, frozen for scripts/sync-two-devices.mjs: no hot
 * reload and no file watching. A harness that runs for minutes in a shared
 * checkout must not have its two "devices" reloaded under it because somebody
 * saved a file — that looked exactly like a clip that never finished loading. */
import { mergeConfig } from 'vite';
import base from '../vite.config';

export default mergeConfig(base, {
  server: { hmr: false, watch: { ignored: ['**/*'] } },
  /* its own pre-bundled dependencies: sharing node_modules/.vite with the
     gate's server (or any other) made each rebuild them whenever the other's
     settings differed, and this one hung serving its first page (19 October,
     after a fresh container — CLAUDE.md, Things that will bite) */
  cacheDir: 'node_modules/.vite-sync',
  /* and, its cache starting empty, it looks for those libraries from the app's
     one page only (vite.config's optimizeDeps, merged in) — 2ec393a gave it the
     cache without this and its first page never came (gate 14) */
});
