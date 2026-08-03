/* Finder — persistence. One IndexedDB per origin; workspaces are isolated by
 * index (switching = a scope change, never a DB reopen). Heavy media blobs live
 * in their own store so aggregation never deserializes them. The UI touches raw
 * stores ONLY through the functions here, and every observation path is
 * workspaceId-scoped — that is the whole isolation guarantee. */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ID, Workspace, Observation, ActiveTimer } from './types';
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
}

let dbp: Promise<IDBPDatabase<FinderDB>> | null = null;
export function getDB(): Promise<IDBPDatabase<FinderDB>> {
  if (!dbp) {
    dbp = openDB<FinderDB>('finder', 1, {
      upgrade(db) {
        const ws = db.createObjectStore('workspaces', { keyPath: 'id' });
        ws.createIndex('by_updatedAt', 'updatedAt');
        const ob = db.createObjectStore('observations', { keyPath: 'id' });
        ob.createIndex('by_workspace', 'workspaceId');
        ob.createIndex('by_ws_started', ['workspaceId', 'startedAt']);
        ob.createIndex('by_updatedAt', 'updatedAt');
        db.createObjectStore('media'); // out-of-line: explicit blob keys
        db.createObjectStore('meta'); // out-of-line singletons
      },
    });
  }
  return dbp;
}

/* ---------- workspaces (the isolation container) ---------- */

const PALETTE = ['#2b5ae0', '#0f8f6b', '#b3552d', '#7a4fd0', '#0e7fa8', '#b5495b', '#4a7a1e', '#96631c'];
const DEFAULT_CATEGORIES = ['Breakdown', 'Minor stop', 'Changeover', 'Waiting', 'Quality', 'Speed loss'];

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
    assets: [],
    reasons: [],
    shifts: [],
    schemaVersion: 1,
  };
  await db.put('workspaces', ws);
  return ws;
}

export async function updateWorkspace(ws: Workspace): Promise<void> {
  await (await getDB()).put('workspaces', { ...ws, updatedAt: now() });
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
  const ws = await db.get('workspaces', workspaceId);
  if (!ws || ws.lastRoute === hash) return;
  await db.put('workspaces', { ...ws, lastRoute: hash, updatedAt: now() });
}

export async function saveActiveTimer(workspaceId: ID, t?: ActiveTimer): Promise<void> {
  const db = await getDB();
  const ws = await db.get('workspaces', workspaceId);
  if (!ws) return;
  await db.put('workspaces', { ...ws, activeTimer: t, updatedAt: now() });
}

export async function setLastWorkspace(id: ID | null): Promise<void> {
  await (await getDB()).put('meta', { lastWorkspaceId: id }, 'app');
}
export async function getLastWorkspace(): Promise<ID | null> {
  const m = (await (await getDB()).get('meta', 'app')) as { lastWorkspaceId: ID | null } | undefined;
  return m?.lastWorkspaceId ?? null;
}
