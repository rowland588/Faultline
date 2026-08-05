/* Finder — persistence. One IndexedDB per origin; workspaces are isolated by
 * index (switching = a scope change, never a DB reopen). Heavy media blobs live
 * in their own store so aggregation never deserializes them. The UI touches raw
 * stores ONLY through the functions here, and every observation path is
 * workspaceId-scoped — that is the whole isolation guarantee. */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ID, Workspace, Observation } from './types';
import type { Segment, SnagAsset, Snag } from './snag/types';
import { uid, now } from './lib/ids';

interface FinderDB extends DBSchema {
  workspaces: { key: string; value: Workspace; indexes: { by_updatedAt: number } };
  observations: {
    key: string;
    value: Observation;
    indexes: { by_workspace: string; by_ws_started: [string, number]; by_updatedAt: number };
  };
  media: { key: string; value: Blob };
  meta: { key: string; value: unknown };
  // Snag List (v2) — the video-walk model, workspace-scoped like observations.
  segments: { key: string; value: Segment; indexes: { by_workspace: string } };
  snag_assets: { key: string; value: SnagAsset; indexes: { by_workspace: string; by_segment: string } };
  snags: { key: string; value: Snag; indexes: { by_workspace: string; by_asset: string } };
  // Cloud sync (v3): tombstones record hard local deletes so they propagate.
  tombstones: { key: string; value: Tombstone };
}

/** kind:id of a hard-deleted row, so a delete reaches the cloud on next sync. */
export interface Tombstone { id: string; kind: SyncKind; deletedAt: number }
export type SyncKind = 'workspaces' | 'observations' | 'segments' | 'snag_assets' | 'snags';

let dbp: Promise<IDBPDatabase<FinderDB>> | null = null;
export function getDB(): Promise<IDBPDatabase<FinderDB>> {
  if (dbp) return dbp;
  let opened: IDBPDatabase<FinderDB> | null = null;
  const p = openDB<FinderDB>('finder', 3, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const ws = db.createObjectStore('workspaces', { keyPath: 'id' });
        ws.createIndex('by_updatedAt', 'updatedAt');
        const ob = db.createObjectStore('observations', { keyPath: 'id' });
        ob.createIndex('by_workspace', 'workspaceId');
        ob.createIndex('by_ws_started', ['workspaceId', 'startedAt']);
        ob.createIndex('by_updatedAt', 'updatedAt');
        db.createObjectStore('media'); // out-of-line: explicit blob keys
        db.createObjectStore('meta'); // out-of-line singletons
      }
      if (oldVersion < 2) {
        const seg = db.createObjectStore('segments', { keyPath: 'id' });
        seg.createIndex('by_workspace', 'workspaceId');
        const as = db.createObjectStore('snag_assets', { keyPath: 'id' });
        as.createIndex('by_workspace', 'workspaceId');
        as.createIndex('by_segment', 'segmentId');
        const sn = db.createObjectStore('snags', { keyPath: 'id' });
        sn.createIndex('by_workspace', 'workspaceId');
        sn.createIndex('by_asset', 'assetId');
      }
      if (oldVersion < 3) {
        db.createObjectStore('tombstones', { keyPath: 'id' });
      }
    },
    // Another tab already holds an older version open, blocking THIS upgrade.
    // That tab's `blocking` handler (below) closes it, so we just wait it out
    // rather than hanging silently forever.
    blocked() { console.warn('[finder] database upgrade is waiting for another open tab to close.'); },
    // WE are the old connection blocking a newer version opened elsewhere — let
    // go immediately so that upgrade can proceed; the next call reopens fresh.
    blocking() { opened?.close(); if (dbp === p) dbp = null; },
    terminated() { if (dbp === p) dbp = null; },
  });
  p.then(db => { opened = db; }).catch(() => { if (dbp === p) dbp = null; }); // never cache a failed open — allow a retry
  dbp = p;
  return dbp;
}

/* ---------- workspaces (the isolation container) ---------- */

const PALETTE = ['#2b5ae0', '#0f8f6b', '#b3552d', '#7a4fd0', '#0e7fa8', '#b5495b', '#4a7a1e', '#96631c'];
const DEFAULT_CATEGORIES = ['Breakdown', 'Minor stop', 'Changeover', 'Waiting', 'Quality', 'Speed loss'];
const DEFAULT_SUBCATEGORIES: Record<string, string[]> = {
  Breakdown: ['Mechanical', 'Electrical', 'Jam / blockage'],
  'Minor stop': ['Misfeed', 'Sensor trip', 'Manual clear'],
  Changeover: ['Tooling', 'Setup', 'No standard'],
  Quality: ['Reject', 'Rework', 'Seal fault'],
};
const cloneSubs = (src: Record<string, string[]>): Record<string, string[]> =>
  Object.fromEntries(Object.entries(src).map(([k, v]) => [k, [...v]]));

export async function listWorkspaces(): Promise<Workspace[]> {
  const all = await (await getDB()).getAll('workspaces');
  return all.filter(w => !w.archived).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getWorkspace(id: ID): Promise<Workspace | undefined> {
  return (await getDB()).get('workspaces', id);
}

export async function createWorkspace(name: string): Promise<Workspace> {
  const db = await getDB();
  const count = await db.count('workspaces');
  const t = now();
  const ws: Workspace = {
    id: uid(),
    name: name.trim() || 'Untitled workspace',
    color: PALETTE[count % PALETTE.length],
    createdAt: t,
    updatedAt: t,
    categories: [...DEFAULT_CATEGORIES],
    subcategories: cloneSubs(DEFAULT_SUBCATEGORIES),
    assets: ['Whole line'], // the line itself — where cross-cutting losses (changeover, waiting) live
    shifts: [],
    schemaVersion: 1,
  };
  await db.put('workspaces', ws);
  return ws;
}

export async function updateWorkspace(ws: Workspace): Promise<void> {
  await (await getDB()).put('workspaces', { ...ws, updatedAt: now() });
}

/** Atomic read-modify-write of one workspace record — get + put in a single
 *  transaction so concurrent patches (route, timer, settings) can't clobber each
 *  other. Returns the written record (for the provider's in-memory state). */
export async function patchWorkspaceRecord(id: ID, patch: Partial<Workspace>): Promise<Workspace | undefined> {
  const db = await getDB();
  const tx = db.transaction('workspaces', 'readwrite');
  const store = tx.objectStore('workspaces');
  const ws = await store.get(id);
  if (!ws) { await tx.done; return undefined; }
  const next = { ...ws, ...patch, updatedAt: now() };
  await store.put(next);
  await tx.done;
  return next;
}

/** Atomic purge: the workspace and EVERYTHING under it (observations + the whole
 *  snag walk) plus their media blobs. Records tombstones so the delete syncs. */
export async function deleteWorkspace(id: ID): Promise<void> {
  const db = await getDB();
  const [obs, segs, assets, snags] = await Promise.all([
    db.getAllFromIndex('observations', 'by_workspace', id),
    db.getAllFromIndex('segments', 'by_workspace', id),
    db.getAllFromIndex('snag_assets', 'by_workspace', id),
    db.getAllFromIndex('snags', 'by_workspace', id),
  ]);
  const blobKeys = [
    ...obs.flatMap(o => o.media.flatMap(m => [m.blobKey, m.thumbKey])),
    ...segs.flatMap(s => [s.videoKey, s.posterKey]),
    ...assets.map(a => a.stillKey),
    ...snags.map(s => s.detailPhotoKey),
  ].filter(Boolean) as string[];
  const tx = db.transaction(['workspaces', 'observations', 'segments', 'snag_assets', 'snags', 'media'], 'readwrite');
  await tx.objectStore('workspaces').delete(id);
  for (const o of obs) await tx.objectStore('observations').delete(o.id);
  for (const s of segs) await tx.objectStore('segments').delete(s.id);
  for (const a of assets) await tx.objectStore('snag_assets').delete(a.id);
  for (const s of snags) await tx.objectStore('snags').delete(s.id);
  for (const k of blobKeys) await tx.objectStore('media').delete(k);
  await tx.done;
  await recordTombstones('workspaces', [id]);
  await recordTombstones('observations', obs.map(o => o.id));
  await recordTombstones('segments', segs.map(s => s.id));
  await recordTombstones('snag_assets', assets.map(a => a.id));
  await recordTombstones('snags', snags.map(s => s.id));
}

/* ---------- observations (always workspace-scoped) ---------- */

export async function listObservations(workspaceId: ID): Promise<Observation[]> {
  const all = await (await getDB()).getAllFromIndex('observations', 'by_workspace', workspaceId);
  return all.filter(o => o.deletedAt == null).sort((a, b) => b.startedAt - a.startedAt);
}

export async function addObservation(o: Observation): Promise<void> {
  await (await getDB()).put('observations', o);
}

export async function updateObservation(o: Observation): Promise<void> {
  await (await getDB()).put('observations', { ...o, updatedAt: now() });
}

export async function softDeleteObservation(id: ID): Promise<void> {
  const db = await getDB();
  const o = await db.get('observations', id);
  if (!o) return;
  await db.put('observations', { ...o, deletedAt: now(), updatedAt: now() });
}

/** Undo a soft-delete (clears the tombstone). Powers the delete → Undo affordance. */
export async function restoreObservation(id: ID): Promise<void> {
  const db = await getDB();
  const o = await db.get('observations', id);
  if (!o) return;
  await db.put('observations', { ...o, deletedAt: undefined, updatedAt: now() });
}

/** Rename a taxonomy value across every observation that uses it, so a rename in
 *  settings doesn't orphan history (the taxonomy is stored as plain strings). */
export async function renameInObservations(
  workspaceId: ID, field: 'category' | 'subcategory' | 'asset', from: string, to: string,
  onlyCategory?: string, // scope sub-category renames to their parent category
): Promise<number> {
  if (from === to) return 0;
  const db = await getDB();
  const all = await db.getAllFromIndex('observations', 'by_workspace', workspaceId);
  const tx = db.transaction('observations', 'readwrite');
  let n = 0;
  for (const o of all) {
    if (o[field] === from && (onlyCategory == null || o.category === onlyCategory)) {
      await tx.objectStore('observations').put({ ...o, [field]: to, updatedAt: now() }); n++;
    }
  }
  await tx.done;
  return n;
}

/* ---------- evidence blobs ---------- */

export async function putBlob(key: string, blob: Blob): Promise<void> {
  await (await getDB()).put('media', blob, key);
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

/* ---------- resume / session ---------- */

export async function saveRoute(workspaceId: ID, hash: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('workspaces', 'readwrite');
  const store = tx.objectStore('workspaces');
  const ws = await store.get(workspaceId);
  if (ws && ws.lastRoute !== hash) await store.put({ ...ws, lastRoute: hash, updatedAt: now() });
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
    const [obs, segs, assets, snags] = await Promise.all([
      db.getAllFromIndex('observations', 'by_workspace', id),
      db.getAllFromIndex('segments', 'by_workspace', id),
      db.getAllFromIndex('snag_assets', 'by_workspace', id),
      db.getAllFromIndex('snags', 'by_workspace', id),
    ]);
    const blobs = [
      ...obs.flatMap(o => o.media.flatMap(m => [m.blobKey, m.thumbKey])),
      ...segs.flatMap(s => [s.videoKey, s.posterKey]),
      ...assets.map(a => a.stillKey), ...snags.map(s => s.detailPhotoKey),
    ].filter(Boolean) as string[];
    const tx = db.transaction(['workspaces', 'observations', 'segments', 'snag_assets', 'snags', 'media'], 'readwrite');
    await tx.objectStore('workspaces').delete(id);
    for (const o of obs) await tx.objectStore('observations').delete(o.id);
    for (const s of segs) await tx.objectStore('segments').delete(s.id);
    for (const a of assets) await tx.objectStore('snag_assets').delete(a.id);
    for (const s of snags) await tx.objectStore('snags').delete(s.id);
    for (const k of blobs) await tx.objectStore('media').delete(k);
    await tx.done;
  } else if (kind === 'segments') {
    const assets = await db.getAllFromIndex('snag_assets', 'by_segment', id);
    const snags: Snag[] = [];
    for (const a of assets) snags.push(...await db.getAllFromIndex('snags', 'by_asset', a.id));
    const seg = await db.get('segments', id);
    const blobs = [seg?.videoKey, seg?.posterKey, ...assets.map(a => a.stillKey), ...snags.map(s => s.detailPhotoKey)].filter(Boolean) as string[];
    const tx = db.transaction(['segments', 'snag_assets', 'snags', 'media'], 'readwrite');
    await tx.objectStore('segments').delete(id);
    for (const a of assets) await tx.objectStore('snag_assets').delete(a.id);
    for (const s of snags) await tx.objectStore('snags').delete(s.id);
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
  } else {
    const o = await db.get('observations', id);
    if (o) for (const k of o.media.flatMap(m => [m.blobKey, m.thumbKey]).filter(Boolean) as string[]) await db.delete('media', k);
    await db.delete('observations', id);
  }
}

/* ============================================================
 *  SNAG LIST (v2) — segments, assets, snags. Workspace-scoped like everything
 *  else; media blobs share the `media` store via putBlob/getBlob/deleteBlobs.
 * ============================================================ */

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
}
/** Delete a segment and everything below it: its assets, their snags, and every
 *  media blob any of them holds — one transaction, no orphaned blobs. */
export async function deleteSegment(id: ID): Promise<void> {
  const db = await getDB();
  const seg = await db.get('segments', id);
  const assets = await db.getAllFromIndex('snag_assets', 'by_segment', id);
  const snags: Snag[] = [];
  for (const a of assets) snags.push(...(await db.getAllFromIndex('snags', 'by_asset', a.id)));
  const blobKeys = [
    seg?.videoKey, seg?.posterKey,
    ...assets.map(a => a.stillKey),
    ...snags.map(s => s.detailPhotoKey),
  ].filter(Boolean) as string[];
  const tx = db.transaction(['segments', 'snag_assets', 'snags', 'media'], 'readwrite');
  await tx.objectStore('segments').delete(id);
  for (const a of assets) await tx.objectStore('snag_assets').delete(a.id);
  for (const s of snags) await tx.objectStore('snags').delete(s.id);
  for (const k of blobKeys) await tx.objectStore('media').delete(k);
  await tx.done;
  await recordTombstones('segments', [id]);
  await recordTombstones('snag_assets', assets.map(a => a.id));
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
}
export async function updateSnag(s: Snag): Promise<void> {
  await (await getDB()).put('snags', { ...s, updatedAt: now() });
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
}
