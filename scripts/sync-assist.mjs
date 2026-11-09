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
 * docs/DIRECTION.md.) AI Mode's colleague (src/tools/colleague/
 * colleagueAssist, 8 November — docs/AI-MODE.md) and the capabilities it may
 * call (src/capabilities/schemas, the gateway's check of every call) go into
 * supabase/functions/assist/colleague, with the factory documents' reading (src/capabilities/factoryRead, task
 * `factory-read`, 9 November — docs/FACTORY-KNOWLEDGE.md F4); the Story's brief (src/tools/story/
 * briefAssist) beside its chapter in supabase/functions/assist/story.
 *
 *   node scripts/sync-assist.mjs */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
export const VIDEO_SHARED = ['record', 'visionCore', 'gatewayUsage'];
export const TALK_SHARED = ['talkSets', 'talkAssist'];
export const STORY_SHARED = ['storyAssist', 'briefAssist'];
/* [folder in src, file] — each copied into supabase/functions/assist/colleague */
export const COLLEAGUE_SHARED = [['src/tools/colleague', 'colleagueAssist'], ['src/capabilities', 'schemas'], ['src/capabilities', 'factoryRead']];
export const forDeno = (src, from = 'src/tools/video') => `// COPIED FROM ${from} by scripts/sync-assist.mjs — edit the source, then run it.\n${src.replace(/from '\.\/([A-Za-z]+)'/g, "from './$1.ts'")}`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const vout = join(root, 'supabase/functions/assist/video');
  mkdirSync(vout, { recursive: true });
  for (const f of VIDEO_SHARED) writeFileSync(join(vout, `${f}.ts`), forDeno(readFileSync(join(root, 'src/tools/video', `${f}.ts`), 'utf8'), 'src/tools/video'));
  const tout = join(root, 'supabase/functions/assist/talk');
  mkdirSync(tout, { recursive: true });
  for (const f of TALK_SHARED) writeFileSync(join(tout, `${f}.ts`), forDeno(readFileSync(join(root, 'src/tools/talk', `${f}.ts`), 'utf8'), 'src/tools/talk'));
  const sout = join(root, 'supabase/functions/assist/story');
  mkdirSync(sout, { recursive: true });
  for (const f of STORY_SHARED) writeFileSync(join(sout, `${f}.ts`), forDeno(readFileSync(join(root, 'src/tools/story', `${f}.ts`), 'utf8'), 'src/tools/story'));
  const cout = join(root, 'supabase/functions/assist/colleague');
  mkdirSync(cout, { recursive: true });
  for (const [dir, f] of COLLEAGUE_SHARED) writeFileSync(join(cout, `${f}.ts`), forDeno(readFileSync(join(root, dir, `${f}.ts`), 'utf8'), dir));
  console.log(`copied ${VIDEO_SHARED.length} files to supabase/functions/assist/video, ${TALK_SHARED.length} to supabase/functions/assist/talk, ${STORY_SHARED.length} to supabase/functions/assist/story and ${COLLEAGUE_SHARED.length} to supabase/functions/assist/colleague`);
}
