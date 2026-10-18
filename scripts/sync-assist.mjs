/* THE GATEWAY READS A PROPOSAL AS THE APP DOES — the method's vocabulary,
 * validator and the gateway's rules (src/lib/flow) copied into
 * supabase/functions/assist/flow, each relative import given the `.ts` Deno
 * asks for. The app's files are the source; never edit the copies.
 * src/lib/flow/__tests__/assist.test.ts fails when they differ.
 *
 *   node scripts/sync-assist.mjs */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
export const SHARED = ['definition', 'formula', 'components', 'analysis', 'validate', 'proposal', 'assistCore', 'askCore'];
/* the video study's labelling (docs/VIDEO.md): what the assistant is asked about the frames, and what is kept */
export const VIDEO_SHARED = ['record', 'visionCore'];
export const forDeno = (src, from = 'src/lib/flow') => `// COPIED FROM ${from} by scripts/sync-assist.mjs — edit the source, then run it.\n${src.replace(/from '\.\/([A-Za-z]+)'/g, "from './$1.ts'")}`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = join(root, 'supabase/functions/assist/flow');
  mkdirSync(out, { recursive: true });
  for (const f of SHARED) writeFileSync(join(out, `${f}.ts`), forDeno(readFileSync(join(root, 'src/lib/flow', `${f}.ts`), 'utf8')));
  const vout = join(root, 'supabase/functions/assist/video');
  mkdirSync(vout, { recursive: true });
  for (const f of VIDEO_SHARED) writeFileSync(join(vout, `${f}.ts`), forDeno(readFileSync(join(root, 'src/lib/video', `${f}.ts`), 'utf8'), 'src/lib/video'));
  console.log(`copied ${SHARED.length} files to supabase/functions/assist/flow and ${VIDEO_SHARED.length} to supabase/functions/assist/video`);
}
