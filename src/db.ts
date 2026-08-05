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
}

let dbp: Promise<IDBPDatabase<FinderDB>> | null = null;
export function getDB(): Promise<IDBPDatabase<FinderDB>> {
  if (!dbp) {
    dbp = openDB<FinderDB>('finder', 2, {
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
      },
    });
  }
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

/** Atomic purge: the workspace, its observations, and their media blobs. */
export async function deleteWorkspace(id: ID): Promise<void> {
  const db = await getDB();
  const obs = await db.getAllFromIndex('observations', 'by_workspace', id);
  const blobKeys = obs.flatMap(o => o.media.flatMap(m => [m.blobKey, m.thumbKey].filter(Boolean) as string[]));
  const tx = db.transaction(['workspaces', 'observations', 'media'], 'readwrite');
  await tx.objectStore('workspaces').delete(id);
  for (const o of obs) await tx.objectStore('observations').delete(o.id);
  for (const k of blobKeys) await tx.objectStore('media').delete(k);
  await tx.done;
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
  await (await getDB()).put('segments', seg);
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
}
/** Rewrite the sequence column to a new walk order. */
export async function reorderSegments(orderedIds: ID[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('segments', 'readwrite');
  for (let i = 0; i < orderedIds.length; i++) {
    const seg = await tx.objectStore('segments').get(orderedIds[i]);
    if (seg) await tx.objectStore('segments').put({ ...seg, sequence: i + 1 });
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
  await (await getDB()).put('snag_assets', a);
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
