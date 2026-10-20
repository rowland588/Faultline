/* THE GATEWAY READS THE ASSISTANT'S ANSWERS AS THE APP DOES — the video
 * study's labelling (src/lib/video: the record, what the assistant is asked
 * about the frames and what is kept, and what an answer costs) copied into
 * supabase/functions/assist/video, and Line Talk's assistant (src/lib/
 * talkAssist: what it is told, its answer's shape, the conversation in the
 * model's terms and the checks) into supabase/functions/assist/talk, each
 * relative import given the `.ts` Deno asks for. The app's files are the
 * source; never edit the copies. src/lib/video/__tests__/gateway.test.ts
 * fails when they differ. (The method
 * builder's files it also copied went with the builder, 20 October —
 * docs/DIRECTION.md.)
 *
 *   node scripts/sync-assist.mjs */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
export const VIDEO_SHARED = ['record', 'visionCore', 'gatewayUsage'];
export const TALK_SHARED = ['talkAssist'];
export const forDeno = (src, from = 'src/lib/video') => `// COPIED FROM ${from} by scripts/sync-assist.mjs — edit the source, then run it.\n${src.replace(/from '\.\/([A-Za-z]+)'/g, "from './$1.ts'")}`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const vout = join(root, 'supabase/functions/assist/video');
  mkdirSync(vout, { recursive: true });
  for (const f of VIDEO_SHARED) writeFileSync(join(vout, `${f}.ts`), forDeno(readFileSync(join(root, 'src/lib/video', `${f}.ts`), 'utf8'), 'src/lib/video'));
  const tout = join(root, 'supabase/functions/assist/talk');
  mkdirSync(tout, { recursive: true });
  for (const f of TALK_SHARED) writeFileSync(join(tout, `${f}.ts`), forDeno(readFileSync(join(root, 'src/lib', `${f}.ts`), 'utf8'), 'src/lib'));
  console.log(`copied ${VIDEO_SHARED.length} files to supabase/functions/assist/video and ${TALK_SHARED.length} to supabase/functions/assist/talk`);
}
