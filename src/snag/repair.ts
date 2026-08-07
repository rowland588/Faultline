/* Repair footage that's already in a workspace.
 *
 * Converting on import only helps videos added afterwards — everything filmed
 * before that stays unplayable on the laptop it gets reviewed on, which is
 * most of what people already have. This converts in place.
 *
 * It has to run on a device that can DECODE the footage, i.e. the phone that
 * shot it. On a machine that can't decode HEVC there is nothing to convert
 * from, and the attempt reports that rather than quietly doing nothing. */
import { listSegments, getBlob, putBlob, updateSegment, deleteBlobs } from '../db';
import { uid } from '../lib/ids';
import { needsTranscode, toPortableVideo } from '../lib/transcode';
import { sniffVideoCodec, browserCanPlay } from '../lib/mime';
import { readVideoMeta, posterFromVideo } from './frame';
import type { Segment } from './types';

/** Segments whose video won't play on other devices, worst-travelling first. */
export async function findUnportable(wsId: string): Promise<Segment[]> {
  const out: Segment[] = [];
  for (const seg of await listSegments(wsId)) {
    if (!seg.videoKey) continue;
    const blob = await getBlob(seg.videoKey);
    if (!blob) continue;                    // not on this device — can't judge or fix it here
    if (await needsTranscode(blob)) out.push(seg);
  }
  return out;
}

/** Can THIS device do the conversion? It has to decode the original to
 *  re-encode it, so a laptop that can't read the format can't help — and should
 *  say so rather than offer a button that's guaranteed to fail. */
export async function canRepairHere(segs: Segment[]): Promise<boolean> {
  for (const seg of segs) {
    const blob = await getBlob(seg.videoKey);
    if (!blob) continue;
    if (browserCanPlay(await sniffVideoCodec(blob))) return true;
  }
  return false;
}

export type RepairOutcome = 'converted' | 'cannot-decode' | 'failed' | 'missing';

/** Re-encode one segment's video in place, keeping every asset and snag
 *  attached to it. Marked/pinned stills are untouched — they're already
 *  portable JPEGs, and their timestamps stay valid because the length doesn't
 *  change. Writes a NEW blob key so the sync engine treats it as fresh media
 *  rather than assuming it already uploaded this one. */
export async function repairSegment(
  seg: Segment,
  onProgress?: (fraction: number) => void,
): Promise<RepairOutcome> {
  const original = await getBlob(seg.videoKey);
  if (!original) return 'missing';

  const { blob, converted, reason } = await toPortableVideo(original, onProgress);
  if (!converted) return reason === 'cannot-decode' ? 'cannot-decode' : 'failed';

  const videoKey = `blob-${uid()}`;
  await putBlob(videoKey, blob);

  let posterKey = seg.posterKey;
  const oldPoster = seg.posterKey;
  try {
    const poster = await posterFromVideo(blob);
    posterKey = `blob-${uid()}`;
    await putBlob(posterKey, poster);
  } catch { /* keep the old poster — it's a still, it already travels fine */ }

  const meta = await readVideoMeta(blob).catch(() => ({ duration: 0, width: 0, height: 0 }));

  // Point the segment at the new media first; only then drop the old bytes, so
  // an interruption can never leave a segment referencing a blob that's gone.
  await updateSegment({
    ...seg,
    videoKey,
    posterKey,
    durationS: meta.duration || seg.durationS,
  });

  const stale = [seg.videoKey, ...(posterKey !== oldPoster && oldPoster ? [oldPoster] : [])];
  await deleteBlobs(stale);
  return 'converted';
}
