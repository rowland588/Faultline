/* Store a chosen/filmed video as a new segment. Shared by the Snag-walk hub and
 * the Segment screen so "add a video" works the same from either place. */
import { nextSegmentSequence, addSegment, putBlob } from '../db';
import { uid, now } from '../lib/ids';
import { readVideoMeta, posterFromVideo } from './frame';

/** Persist a video file as a new segment (poster is best-effort). Returns the id.
 *  Takes a Blob so in-app recordings and picked files share one path. */
export async function createSegmentFromVideo(wsId: string, file: Blob): Promise<string> {
  const meta = await readVideoMeta(file).catch(() => ({ duration: 0, width: 0, height: 0 }));
  let posterKey: string | undefined;
  try { const poster = await posterFromVideo(file); posterKey = `blob-${uid()}`; await putBlob(posterKey, poster); } catch { /* poster optional */ }
  const videoKey = `blob-${uid()}`;
  await putBlob(videoKey, file);
  const id = uid();
  const sequence = await nextSegmentSequence(wsId);
  await addSegment({ id, workspaceId: wsId, sequence, videoKey, posterKey, durationS: meta.duration || undefined, createdAt: now() });
  return id;
}
