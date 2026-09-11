/* Make the film play everywhere, without anybody being asked to do anything.
 *
 * Converting has always needed the device that can DECODE the footage — the
 * phone that shot it. That part is physics, not a design choice: you cannot
 * re-encode a picture you cannot read. What WAS a design choice, and a poor
 * one, was making that a chore: a button on one screen, on one device, that
 * you had to know existed and remember to press.
 *
 * So the phone just does it. Any device that opens the app and finds footage it
 * can decode but other devices cannot converts it, one clip at a time, in the
 * background. The result syncs like any other change and the laptop can play it
 * the next time it checks in. Nobody presses anything.
 *
 * Three things keep that from being rude:
 *
 *  - It only runs while the app is actually on screen. Re-encoding runs at
 *    playback speed and costs battery; doing that behind someone's back while
 *    they are using the phone for something else is not on. Switch away and it
 *    stops mid-clip; come back and it starts that clip again.
 *  - It says what it is doing, and can be stopped. A phone that gets warm with
 *    no explanation is a phone people force-quit.
 *  - It remembers what it has already looked at. Deciding whether a clip needs
 *    converting means reading a megabyte from each end of every video in every
 *    workspace; doing that on every launch would make the app slow for a
 *    question whose answer almost never changes. The verdict is cached against
 *    the blob key, and a converted clip gets a new key, so the cache can never
 *    go stale.
 */
import { getDB, listWorkspaces, listSegments, getBlob } from '../db';
import { needsTranscode } from '../lib/transcode';
import { sniffVideoCodec, browserCanPlay } from '../lib/mime';
import type { Segment } from './types';

type Verdict = 'portable' | 'stuck' | 'foreign';   // foreign = needs converting, but not here
const CACHE_KEY = 'codecVerdicts';

async function readCache(): Promise<Record<string, Verdict>> {
  const m = (await (await getDB()).get('meta', CACHE_KEY)) as { v?: Record<string, Verdict> } | undefined;
  return m?.v ?? {};
}
async function writeCache(v: Record<string, Verdict>): Promise<void> {
  await (await getDB()).put('meta', { v }, CACHE_KEY);
}

export interface Stuck { wsId: string; seg: Segment }

/** Every clip anywhere on this device that will not travel — and, of those,
 *  the ones this device is able to fix. One pass over every workspace, because
 *  a line's walk is not necessarily in the workspace you happen to have open. */
export async function findConvertible(): Promise<{ mine: Stuck[]; elsewhere: Stuck[] }> {
  const cache = await readCache();
  let dirty = false;
  const mine: Stuck[] = [];
  const elsewhere: Stuck[] = [];

  for (const ws of await listWorkspaces()) {
    for (const seg of await listSegments(ws.id)) {
      if (!seg.videoKey) continue;
      const known = cache[seg.videoKey];
      if (known === 'portable') continue;
      if (known === 'stuck') { mine.push({ wsId: ws.id, seg }); continue; }
      if (known === 'foreign') { elsewhere.push({ wsId: ws.id, seg }); continue; }

      const blob = await getBlob(seg.videoKey);
      if (!blob) continue;                       // not on this device — nothing to judge
      if (!(await needsTranscode(blob))) {
        cache[seg.videoKey] = 'portable'; dirty = true;
        continue;
      }
      // It needs converting. Can this device read it well enough to do so?
      const here = browserCanPlay(await sniffVideoCodec(blob));
      cache[seg.videoKey] = here ? 'stuck' : 'foreign'; dirty = true;
      (here ? mine : elsewhere).push({ wsId: ws.id, seg });
    }
  }

  if (dirty) await writeCache(cache);
  return { mine, elsewhere };
}

/** Record that a blob is fine, without reading it.
 *
 *  Called on what we have just produced. Conversion only reports success when
 *  it encoded with a codec from the portable list, so the answer is already
 *  known — and asking again is not merely wasteful, it is dangerous: if the
 *  sniff ever said "still needs converting" about our own output, the app would
 *  re-encode the same walk on every launch, for ever, losing a little more
 *  picture each time. This closes that loop by construction. */
export async function markPortable(videoKey: string): Promise<void> {
  const cache = await readCache();
  if (cache[videoKey] === 'portable') return;
  cache[videoKey] = 'portable';
  await writeCache(cache);
}

/** Forget what we decided about a blob — used after a conversion, and by the
 *  manual "Try again", so a retry is never answered from the cache. */
export async function forgetVerdict(videoKey?: string): Promise<void> {
  if (!videoKey) return;
  const cache = await readCache();
  if (!(videoKey in cache)) return;
  delete cache[videoKey];
  await writeCache(cache);
}
