/* Evidence blobs. The bytes; the metadata lives on the record that points at them. */
import { getDB } from './core';

/* ---------- evidence blobs ---------- */

/* A FILE HAS ARRIVED. The record of a test comes down first and its photos
 * and films after it, one at a time (cloud/sync, the download queue) — so a
 * screen opened in between reads "not on this device yet", and it went on
 * reading that after the film had landed, until somebody left the screen and
 * came back (scripts/sync-two-devices.mjs, scenario 5). Whatever shows a file
 * listens here and looks again when its key is written. */
const stored = new Set<(key: string) => void>();
export function onBlobStored(fn: (key: string) => void): () => void {
  stored.add(fn);
  return () => { stored.delete(fn); };
}

export async function putBlob(key: string, blob: Blob): Promise<void> {
  await (await getDB()).put('media', blob, key);
  for (const fn of stored) { try { fn(key); } catch { /* the listener's problem */ } }
}
export async function getBlob(key: string): Promise<Blob | undefined> {
  return (await getDB()).get('media', key);
}
export async function deleteBlobs(keys: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('media', 'readwrite');
  for (const k of keys) await tx.objectStore('media').delete(k);
  await tx.done;
}
