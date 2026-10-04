/* The app's own vite config, frozen for scripts/sync-two-devices.mjs: no hot
 * reload and no file watching. A harness that runs for minutes in a shared
 * checkout must not have its two "devices" reloaded under it because somebody
 * saved a file — that looked exactly like a clip that never finished loading. */
import { mergeConfig } from 'vite';
import base from '../vite.config';

export default mergeConfig(base, {
  server: { hmr: false, watch: { ignored: ['**/*'] } },
});
