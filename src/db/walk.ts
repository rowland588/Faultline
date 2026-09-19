/* THE LINE WALK: segments, the assets pinned on them, and the snags on those.
 *
 * One module because they are one chain. A segment holds assets, an asset holds
 * snags, and deleting any of them has to take what hangs off it — which is far
 * easier to get right with all three in front of you.
 */
import type { ID } from '../types';
import type { Segment, SnagAsset, Snag } from '../snag/types';
import { now } from '../lib/ids';
import { getDB, signalWrite } from './core';
import { recordTombstones } from './sync';
import { deleteBlobs } from './blobs';

/* ---------- segments ---------- */
export async function listSegments(workspaceId: ID): Promise<Segment[]> {
  const all = await (await getDB()).getAllFromIndex('segments', 'by_workspace', workspaceId);
  return all.sort((a, b) => a.sequence - b.sequence);
}
export async function getSegment(id: ID): Promise<Segment | undefined> {
  return (await getDB()).get('segments', id);
}
export async function nextSegmentSequence(workspaceId: ID): Promise<number> {
  const segs = await listSegments(workspaceId);
  return ((segs.length ? segs[segs.length - 1].sequence : 0) ?? 0) + 1;
}
export async function addSegment(seg: Segment): Promise<void> {
  await (await getDB()).put('segments', { ...seg, updatedAt: now() });
  signalWrite();
}
/** Edit a segment (name it). Stamps updatedAt so the change syncs and shows
 *  everywhere the segment is read. */
export async function updateSegment(seg: Segment): Promise<void> {
  await (await getDB()).put('segments', { ...seg, updatedAt: now() });
  signalWrite();
}
/** Delete a segment — THE CLIP ONLY.
 *
 *  This used to take the marked frames and everything pinned on them with it,
 *  on the reasoning that they hung off the segment. They do not: the frozen
 *  still IS the evidence, and it is a blob of its own. Deleting a clip that
 *  would not play, to re-upload it, therefore destroyed every machine name and
 *  every piece of evidence recorded against it — silently, because on the walk
 *  screen the delete is deferred behind an Undo toast rather than a confirm.
 *
 *  So: the video and its poster go. The frames, their names, their stills and
 *  everything pinned on them stay, and simply stop naming a clip. */
export async function deleteSegment(id: ID): Promise<void> {
  const db = await getDB();
  const seg = await db.get('segments', id);
  const assets = await db.getAllFromIndex('snag_assets', 'by_segment', id);

  // The frames let go of the clip rather than dying with it. A fresh clock,
  // because this IS a change the other devices have to hear about — otherwise
  // they keep an asset pointing at a segment that no longer exists.
  const tx = db.transaction(['segments', 'snag_assets', 'media'], 'readwrite');
  await tx.objectStore('segments').delete(id);
  for (const a of assets) {
    await tx.objectStore('snag_assets').put({ ...a, segmentId: undefined, updatedAt: now() });
  }
  for (const k of [seg?.videoKey, seg?.posterKey].filter(Boolean) as string[]) {
    await tx.objectStore('media').delete(k);
  }
  await tx.done;
  await recordTombstones('segments', [id]);
  signalWrite();
}
/** Delete a marked frame and the snags pinned on it, plus their blobs — the
 *  asset level was the one gap in the walk's delete chain, so a frame marked by
 *  mistake could only be removed by deleting the whole segment. Mirrors
 *  deleteSegment: one transaction, no orphaned blobs, tombstones so it syncs. */
export async function deleteSnagAsset(id: ID): Promise<void> {
  const db = await getDB();
  const asset = await db.get('snag_assets', id);
  if (!asset) return;
  const snags = await db.getAllFromIndex('snags', 'by_asset', id);
  const blobKeys = [
    asset.stillKey,
    ...snags.flatMap(s => [s.detailPhotoKey, s.fixedPhotoKey]),
  ].filter(Boolean) as string[];
  const tx = db.transaction(['snag_assets', 'snags', 'media'], 'readwrite');
  await tx.objectStore('snag_assets').delete(id);
  for (const s of snags) await tx.objectStore('snags').delete(s.id);
  for (const k of blobKeys) await tx.objectStore('media').delete(k);
  await tx.done;
  await recordTombstones('snag_assets', [id]);
  await recordTombstones('snags', snags.map(s => s.id));
}

/** Rewrite the sequence column to a new walk order. */
export async function reorderSegments(orderedIds: ID[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('segments', 'readwrite');
  for (let i = 0; i < orderedIds.length; i++) {
    const seg = await tx.objectStore('segments').get(orderedIds[i]);
    if (seg) await tx.objectStore('segments').put({ ...seg, sequence: i + 1, updatedAt: now() });
  }
  await tx.done;
  signalWrite();
}

/* ---------- assets ---------- */
export async function listSnagAssets(workspaceId: ID): Promise<SnagAsset[]> {
  return (await getDB()).getAllFromIndex('snag_assets', 'by_workspace', workspaceId);
}
export async function assetsForSegment(segmentId: ID): Promise<SnagAsset[]> {
  const all = await (await getDB()).getAllFromIndex('snag_assets', 'by_segment', segmentId);
  return all.sort((a, b) => a.timestampS - b.timestampS);
}
export async function getSnagAsset(id: ID): Promise<SnagAsset | undefined> {
  return (await getDB()).get('snag_assets', id);
}
export async function addSnagAsset(a: SnagAsset): Promise<void> {
  await (await getDB()).put('snag_assets', { ...a, updatedAt: now() });
  signalWrite();
}
/** Edit an asset (rename / recode). Stamps updatedAt so the change syncs and is
 *  reflected everywhere the asset is read. */
export async function updateSnagAsset(a: SnagAsset): Promise<void> {
  await (await getDB()).put('snag_assets', { ...a, updatedAt: now() });
  signalWrite();
}

/* ---------- snags ---------- */
export async function snagsForAsset(assetId: ID): Promise<Snag[]> {
  const all = await (await getDB()).getAllFromIndex('snags', 'by_asset', assetId);
  return all.filter(s => s.deletedAt == null).sort((a, b) => a.raisedAt - b.raisedAt);
}
export async function snagsForWorkspace(workspaceId: ID): Promise<Snag[]> {
  const all = await (await getDB()).getAllFromIndex('snags', 'by_workspace', workspaceId);
  return all.filter(s => s.deletedAt == null);
}
export async function addSnag(s: Snag): Promise<void> {
  await (await getDB()).put('snags', s);
  signalWrite();
}
export async function updateSnag(s: Snag): Promise<void> {
  await (await getDB()).put('snags', { ...s, updatedAt: now() });
  signalWrite();
}
export async function deleteSnag(id: ID): Promise<void> {
  const db = await getDB();
  const s = await db.get('snags', id);
  if (!s) return;
  if (s.detailPhotoKey) await deleteBlobs([s.detailPhotoKey]);
  await db.delete('snags', id);
  await recordTombstones('snags', [id]);
}
export async function setSnagsStatus(ids: ID[], status: Snag['status']): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('snags', 'readwrite');
  for (const id of ids) {
    const s = await tx.objectStore('snags').get(id);
    if (s) await tx.objectStore('snags').put({ ...s, status, closedAt: status === 'closed' ? now() : undefined, updatedAt: now() });
  }
  await tx.done;
  signalWrite();
}
