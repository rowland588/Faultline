/* THE SERVER READS A GATE PASS WITH THE APP'S OWN RUNTIME — lib/flow/serverCheck
 * and everything it imports (the runtime, the analyses, the tools' modules, the
 * sync's mappers) bundled into one file the edge function imports:
 * supabase/functions/gatecheck/check.js. The app's files are the source; never
 * edit the bundle. src/lib/flow/__tests__/serverCheck.test.ts fails when it is
 * not what this makes from the source.
 *
 *   node scripts/build-gatecheck.mjs */
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(here, '..');
export const OUT = join(ROOT, 'supabase/functions/gatecheck/check.js');
const BANNER = '// BUILT FROM src/lib/flow/serverCheck.ts by scripts/build-gatecheck.mjs — edit the source, then run it.';

/** The bundle, as text. */
export async function bundle() {
  const r = await build({
    absWorkingDir: ROOT,
    entryPoints: ['src/lib/flow/serverCheck.ts'],
    bundle: true, write: false, format: 'esm', platform: 'neutral', target: 'es2022',
    charset: 'utf8', legalComments: 'none', logLevel: 'silent',
    banner: { js: BANNER },
  });
  return r.outputFiles[0].text;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const text = await bundle();
  writeFileSync(OUT, text);
  console.log(`wrote supabase/functions/gatecheck/check.js (${Math.round(text.length / 1024)} KB)`);
}
