/* WHAT THE SYNC LAYER TOUCHES, and the device's own session state.
 *
 * Raw store access with no stamping and no scoping, the tombstones a hard delete
 * leaves behind, and the pull/push cursors. Kept together because they are one
 * concern — everything here exists so two devices can agree — and kept apart from
 * the feature modules because none of them should reach for it.
 */
import type { ID } from '../types';
import { now } from '../lib/ids';
import { getDB, signalWrite, signalData } from './core';
import type { Tombstone, SyncKind } from './rows';

/* ---------- resume / session ---------- */

export async function saveRoute(workspaceId: ID, hash: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('workspaces', 'readwrite');
  const store = tx.objectStore('workspaces');
  const ws = await store.get(workspaceId);
  // Deliberately does NOT stamp updatedAt (see DEVICE_LOCAL_FIELDS) — recency
  // for the Home sort lives in lastOpenedAt instead.
  if (ws && ws.lastRoute !== hash) await store.put({ ...ws, lastRoute: hash, lastOpenedAt: now() });
  await tx.done;
}

export async function setLastWorkspace(id: ID | null): Promise<void> {
  await (await getDB()).put('meta', { lastWorkspaceId: id }, 'app');
}
export async function getLastWorkspace(): Promise<ID | null> {
  const m = (await (await getDB()).get('meta', 'app')) as { lastWorkspaceId: ID | null } | undefined;
  return m?.lastWorkspaceId ?? null;
}

/* ============================================================
 *  CLOUD SYNC support — tombstones, raw row access, remote-delete cascades, and
 *  a sync cursor. Inert for anyone not signed in; used only by src/cloud/sync.
 * ============================================================ */
export async function recordTombstones(kind: SyncKind, ids: ID[]): Promise<void> {
  if (!ids.length) return;
  const db = await getDB();
  const tx = db.transaction('tombstones', 'readwrite');
  const t = now();
  for (const id of ids) await tx.objectStore('tombstones').put({ id, kind, deletedAt: t });
  await tx.done;
  signalWrite();
}
export async function listTombstones(): Promise<Tombstone[]> {
  return (await getDB()).getAll('tombstones');
}
export async function clearTombstones(ids: ID[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('tombstones', 'readwrite');
  for (const id of ids) await tx.objectStore('tombstones').delete(id);
  await tx.done;
}

/* Raw store access for the sync layer (no stamping, no scoping). `store` is a
 * SyncKind; the `as never` casts satisfy idb's per-store typed overloads. */
export async function rawAll(store: SyncKind): Promise<Record<string, unknown>[]> {
  return (await getDB()).getAll(store as never) as Promise<Record<string, unknown>[]>;
}
export async function rawPut(store: SyncKind, value: Record<string, unknown>): Promise<void> {
  await (await getDB()).put(store as never, value as never);
  signalData();   // a row from another device — the open screen has to redraw
}
export async function hasBlob(key: string): Promise<boolean> {
  return (await (await getDB()).getKey('media', key)) !== undefined;
}
export async function getSyncCursor(): Promise<number> {
  const m = (await (await getDB()).get('meta', 'sync')) as { at: number } | undefined;
  return m?.at ?? 0;
}
export async function setSyncCursor(at: number): Promise<void> {
  await (await getDB()).put('meta', { at }, 'sync');
}

/** Apply a remote delete locally WITHOUT recording a tombstone (else it echoes
 *  back). Cascades to descendants + their media, mirroring the FK graph. */
export async function applyRemoteDelete(kind: SyncKind, id: ID): Promise<void> {
  const db = await getDB();
  if (kind === 'workspaces') {
    const [obs, segs, assets, snags, cases] = await Promise.all([
      db.getAllFromIndex('observations', 'by_workspace', id),
      db.getAllFromIndex('segments', 'by_workspace', id),
      db.getAllFromIndex('snag_assets', 'by_workspace', id),
      db.getAllFromIndex('snags', 'by_workspace', id),
      db.getAllFromIndex('cases', 'by_workspace', id),
    ]);
    const blobs = [
      ...obs.flatMap(o => o.media.flatMap(m => [m.blobKey, m.thumbKey])),
      ...segs.flatMap(s => [s.videoKey, s.posterKey]),
      ...assets.map(a => a.stillKey), ...snags.map(s => s.detailPhotoKey),
    ].filter(Boolean) as string[];
    const tx = db.transaction(['workspaces', 'observations', 'segments', 'snag_assets', 'snags', 'cases', 'media'], 'readwrite');
    await tx.objectStore('workspaces').delete(id);
    for (const o of obs) await tx.objectStore('observations').delete(o.id);
    for (const s of segs) await tx.objectStore('segments').delete(s.id);
    for (const a of assets) await tx.objectStore('snag_assets').delete(a.id);
    for (const s of snags) await tx.objectStore('snags').delete(s.id);
    for (const c of cases) await tx.objectStore('cases').delete(c.id);
    for (const k of blobs) await tx.objectStore('media').delete(k);
    await tx.done;
  } else if (kind === 'cases') {
    await db.delete('cases', id);
  } else if (kind === 'segments') {
    // Mirrors deleteSegment, and for the same reason — only this is the version
    // that used to do the damage QUIETLY. Deleting a walk on the phone arrived
    // here as a segment tombstone, and this branch then wiped every marked
    // frame, every still and every snag on THIS device, with nothing on screen
    // to say so. That is the lost connection: named it here, deleted the clip
    // there, and the name went with it overnight.
    //
    // Now only the clip goes. The frames let go of it and stay. Their
    // updatedAt is deliberately NOT touched: the device that did the delete has
    // already pushed them with a null segment, so re-stamping them here would
    // only push the same fact back again.
    const assets = await db.getAllFromIndex('snag_assets', 'by_segment', id);
    const seg = await db.get('segments', id);
    const blobs = [seg?.videoKey, seg?.posterKey].filter(Boolean) as string[];
    const tx = db.transaction(['segments', 'snag_assets', 'media'], 'readwrite');
    await tx.objectStore('segments').delete(id);
    for (const a of assets) await tx.objectStore('snag_assets').put({ ...a, segmentId: undefined });
    for (const k of blobs) await tx.objectStore('media').delete(k);
    await tx.done;
  } else if (kind === 'snag_assets') {
    const snags = await db.getAllFromIndex('snags', 'by_asset', id);
    const asset = await db.get('snag_assets', id);
    const blobs = [asset?.stillKey, ...snags.map(s => s.detailPhotoKey)].filter(Boolean) as string[];
    const tx = db.transaction(['snag_assets', 'snags', 'media'], 'readwrite');
    await tx.objectStore('snag_assets').delete(id);
    for (const s of snags) await tx.objectStore('snags').delete(s.id);
    for (const k of blobs) await tx.objectStore('media').delete(k);
    await tx.done;
  } else if (kind === 'snags') {
    const s = await db.get('snags', id);
    if (s?.detailPhotoKey) await db.delete('media', s.detailPhotoKey);
    await db.delete('snags', id);
  } else if (kind === 'pace_todos') {
    const row = await db.get('pace_todos', id);
    for (const k of (row?.media ?? []).flatMap(m => [m.blobKey, m.thumbKey]).filter(Boolean) as string[]) {
      await db.delete('media', k);
    }
    await db.delete('pace_todos', id);
  } else if (kind === 'pace_ppm') {
    // A line is NOT hard-deleted here, unlike everything else. The shipped
    // lines are seeded by id on every device, so a row that simply vanishes is
    // seeded straight back — delete Line 7 on the laptop and the phone hands it
    // to you again on its next load. Keeping a deleted marker is what makes the
    // removal stick, and loadPaceLines reads exactly this to know not to seed.
    //
    // The marker is written even when this device never held the line, because
    // that is the same race seen from the other side: without it the device
    // would seed the line and push it back, undeleting it for everyone.
    const row = await db.get('pace_ppm', id);
    await db.put('pace_ppm', row
      ? { ...row, deletedAt: now() }
      // no local row to mark — a minimal marker, on a clock old enough that it
      // can never win a push against a real edit made anywhere else
      : { id, key: id.replace(/^ppm-/, ''), name: '', q1: 0, q2: 0, q3: 0, q4: 0, weekly: [], deletedAt: now(), updatedAt: 0 });
  } else if (kind === 'pace_snapshots'
    || kind === 'pace_wins' || kind === 'tree_nodes' || kind === 'tests' || kind === 'test_items'
    || kind === 'commission_assets'
    || kind === 'projects' || kind === 'project_targets' || kind === 'project_actuals') {
    // Flat rows with no children and no media. They need naming explicitly:
    // the fallthrough below assumes an observation, so a Next step deleted on
    // the laptop was never deleted on the phone — it just sat there.
    await db.delete(kind, id);
  } else {
    const o = await db.get('observations', id);
    if (o) for (const k of o.media.flatMap(m => [m.blobKey, m.thumbKey]).filter(Boolean) as string[]) await db.delete('media', k);
    await db.delete('observations', id);
  }
  signalData();   // gone on another device — the open screen has to redraw
}

/* ============================================================
 *  SNAG LIST (v2) — segments, assets, snags. Workspace-scoped like everything
 *  else; media blobs share the `media` store via putBlob/getBlob/deleteBlobs.
 * ============================================================ */
