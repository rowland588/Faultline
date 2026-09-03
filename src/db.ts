/* Faultline — persistence. One IndexedDB per origin; workspaces are isolated by
 * index (switching = a scope change, never a DB reopen). Heavy media blobs live
 * in their own store so aggregation never deserializes them. The UI touches raw
 * stores ONLY through the functions here, and every observation path is
 * workspaceId-scoped — that is the whole isolation guarantee. */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ID, Millis, Workspace, Observation, Case, Project, ProjectLineTarget, ProjectLineActual } from './types';
import type { Segment, SnagAsset, Snag } from './snag/types';
import { uid, now } from './lib/ids';
import { taxonomyById, DEFAULT_TAXONOMY_ID } from './lib/taxonomy';

interface AppDB extends DBSchema {
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
  // Cases (v4): the thin A3 — see types.ts.
  cases: { key: string; value: Case; indexes: { by_workspace: string } };
  // Projects (v5): improvement initiatives spanning multiple workspaces (lines).
  projects: { key: string; value: Project; indexes: { by_updatedAt: number } };
  project_targets: { key: string; value: ProjectLineTarget; indexes: { by_project: string; by_workspace: string } };
  project_actuals: { key: string; value: ProjectLineActual; indexes: { by_project: string; by_workspace: string; by_date: [string, number] } };
  /* Pace snapshots (v6): one row per uploaded tracker workbook, kept so the app
   * can report what moved between weeks. Deliberately NOT a SyncKind — the
   * workbook is the system of record and each device keeps its own upload
   * history rather than racing to merge copies of the same spreadsheet. */
  pace_snapshots: { key: string; value: PaceSnapshotRow; indexes: { by_takenAt: number } };
  /* Pace lines (v7): the ppm numbers, entered in the app. Keyed by line so a
   * reading is edited in place. Local to the device, like the snapshots — the
   * cloud tables for these do not exist yet, and a half-synced number is worse
   * than an honestly local one. */
  pace_lines: { key: string; value: PaceLineRow };
}

/** One production line's targets and its weekly ppm readings. `weekly` is
 *  indexed from PACE_START; null is a week that was never measured. */
export interface PaceLineRow {
  key: string; name: string; variant?: string;
  q1: number; q2: number; q3: number; q4: number;
  weekly: (number | null)[];
  updatedAt: number;
}

/** A parsed tracker upload, stored whole. */
export interface PaceSnapshotRow {
  id: string; takenAt: number; fileName: string;
  actions: unknown[]; observations: unknown[];
  roster?: unknown;
}

/** kind:id of a hard-deleted row, so a delete reaches the cloud on next sync. */
export interface Tombstone { id: string; kind: SyncKind; deletedAt: number }
export type SyncKind = 'workspaces' | 'observations' | 'segments' | 'snag_assets' | 'snags' | 'cases' | 'projects' | 'project_targets' | 'project_actuals';

/* The app's local database. LEGACY_DBS are names this app shipped under before
 * the Faultline rebrand — read ONCE to migrate a device's existing data into the
 * new name, never written to again. ('finder' is only trusted at ≤ v3; higher
 * versions of that name belonged to an unrelated app and are left alone.) */
const DB_NAME = 'faultline';
const LEGACY_DBS = ['finder-qc', 'finder'] as const;
const DB_VERSION = 7; // v7: pace_lines (ppm entered in the app)
const OPEN_TIMEOUT_MS = 12_000;

let dbp: Promise<IDBPDatabase<AppDB>> | null = null;
let opened: IDBPDatabase<AppDB> | null = null;

/* ---------- local-write signal ----------
 * Every user-path mutation announces itself, so the sync engine can push within
 * seconds of a change instead of waiting for a timer that mobile browsers
 * freeze in the background. Sync-applied writes (rawPut/applyRemoteDelete) do
 * NOT signal — that would loop. */
const writeListeners = new Set<() => void>();
export function onLocalWrite(fn: () => void): () => void {
  writeListeners.add(fn);
  return () => { writeListeners.delete(fn); };
}
function signalWrite(): void {
  for (const fn of writeListeners) { try { fn(); } catch { /* listener's problem */ } }
}

export function getDB(): Promise<IDBPDatabase<AppDB>> {
  if (dbp) return dbp;
  const mine = openAndImport();
  dbp = mine;
  // Never cache a failed OR hung open. This `.catch` is attached to `mine`
  // itself (one hop) and BEFORE any caller awaits it, so it nulls `dbp` ahead of
  // the caller's catch — a synchronous retry then re-opens instead of replaying
  // the rejection.
  mine.catch(() => { if (dbp === mine) { dbp = null; opened = null; } });
  return dbp;
}

async function openAndImport(): Promise<IDBPDatabase<AppDB>> {
  const db = await openMain();
  opened = db;
  try { await importLegacyOnce(db); } catch { /* best-effort; a failed import must never block boot */ }
  return db;
}

const REQUIRED_STORES = ['workspaces', 'observations', 'media', 'meta', 'segments', 'snag_assets', 'snags', 'tombstones', 'cases', 'projects', 'project_targets', 'project_actuals', 'pace_snapshots', 'pace_lines'] as const;

/** Create any store our schema needs that the DB lacks. Version-agnostic and
 *  idempotent, so it works whether we open a fresh DB or one another build left
 *  at a higher version. */
function ensureStores(db: IDBPDatabase<AppDB>): void {
  if (!db.objectStoreNames.contains('workspaces')) {
    db.createObjectStore('workspaces', { keyPath: 'id' }).createIndex('by_updatedAt', 'updatedAt');
  }
  if (!db.objectStoreNames.contains('observations')) {
    const ob = db.createObjectStore('observations', { keyPath: 'id' });
    ob.createIndex('by_workspace', 'workspaceId');
    ob.createIndex('by_ws_started', ['workspaceId', 'startedAt']);
    ob.createIndex('by_updatedAt', 'updatedAt');
  }
  if (!db.objectStoreNames.contains('media')) db.createObjectStore('media');
  if (!db.objectStoreNames.contains('pace_snapshots')) {
    db.createObjectStore('pace_snapshots', { keyPath: 'id' }).createIndex('by_takenAt', 'takenAt');
  }
  if (!db.objectStoreNames.contains('pace_lines')) db.createObjectStore('pace_lines', { keyPath: 'key' });
  if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
  if (!db.objectStoreNames.contains('segments')) {
    db.createObjectStore('segments', { keyPath: 'id' }).createIndex('by_workspace', 'workspaceId');
  }
  if (!db.objectStoreNames.contains('snag_assets')) {
    const as = db.createObjectStore('snag_assets', { keyPath: 'id' });
    as.createIndex('by_workspace', 'workspaceId');
    as.createIndex('by_segment', 'segmentId');
  }
  if (!db.objectStoreNames.contains('snags')) {
    const sn = db.createObjectStore('snags', { keyPath: 'id' });
    sn.createIndex('by_workspace', 'workspaceId');
    sn.createIndex('by_asset', 'assetId');
  }
  if (!db.objectStoreNames.contains('tombstones')) db.createObjectStore('tombstones', { keyPath: 'id' });
  if (!db.objectStoreNames.contains('cases')) {
    db.createObjectStore('cases', { keyPath: 'id' }).createIndex('by_workspace', 'workspaceId');
  }
  if (!db.objectStoreNames.contains('projects')) {
    db.createObjectStore('projects', { keyPath: 'id' }).createIndex('by_updatedAt', 'updatedAt');
  }
  if (!db.objectStoreNames.contains('project_targets')) {
    const pt = db.createObjectStore('project_targets', { keyPath: 'id' });
    pt.createIndex('by_project', 'projectId');
    pt.createIndex('by_workspace', 'workspaceId');
  }
  if (!db.objectStoreNames.contains('project_actuals')) {
    const pa = db.createObjectStore('project_actuals', { keyPath: 'id' });
    pa.createIndex('by_project', 'projectId');
    pa.createIndex('by_workspace', 'workspaceId');
    pa.createIndex('by_date', ['projectId', 'date']);
  }
}

async function openMain(): Promise<IDBPDatabase<AppDB>> {
  // Probe the CURRENT version first so we never request a LOWER one — IndexedDB
  // throws VersionError for that and wedges the whole app (a foreign or newer
  // build leaving the same-named DB at a higher version has caused exactly that).
  let existing = 0, hasAll = false;
  try {
    const probe = await openDB(DB_NAME); // no version → opens as-is (or creates at 1)
    existing = probe.version;
    hasAll = REQUIRED_STORES.every(s => probe.objectStoreNames.contains(s));
    probe.close();
  } catch { /* treat as fresh */ }
  // Open at >= what exists. Only bump one past a higher/foreign DB when our stores
  // are missing, so an idempotent ensureStores pass can add them.
  const target = existing < DB_VERSION ? DB_VERSION : (hasAll ? existing : existing + 1);

  return new Promise((resolve, reject) => {
    // A cross-tab upgrade can leave the open request `blocked` indefinitely if an
    // older tab never releases; time out with an actionable message instead of hanging.
    const timer = setTimeout(
      () => reject(new Error('Storage is busy — another open tab may be holding it. Close other tabs of this app and reload.')),
      OPEN_TIMEOUT_MS,
    );
    openDB<AppDB>(DB_NAME, target, {
      upgrade(db) { ensureStores(db); },
      blocked() { console.warn('[faultline] storage upgrade is waiting for another open tab; will time out if it never releases.'); },
      blocking() { opened?.close(); opened = null; dbp = null; },
      terminated() { opened = null; dbp = null; },
    }).then(
      db => { clearTimeout(timer); resolve(db); },
      err => { clearTimeout(timer); reject(err); },
    );
  });
}

/** One-time migration: carry a device's data over from the names this app used
 *  before the Faultline rebrand. Copies ONLY the data stores + media blobs —
 *  deliberately not `meta` (a stale sync cursor pointing at a dead backend) and
 *  not tombstones (deletes aimed at a backend that no longer exists). The old
 *  databases are read, never written. Best-effort and idempotent. */
async function importLegacyOnce(db: IDBPDatabase<AppDB>): Promise<void> {
  if (await db.get('meta', 'legacyImport')) return;
  await db.put('meta', { at: now() }, 'legacyImport'); // mark up front so a partial failure can't loop

  // Only proceed on positive confirmation a legacy DB exists, so probing never
  // CREATES one as a side effect. (databases() is absent on some engines; there
  // we simply skip — cloud sync restores signed-in data anyway.)
  const factory = indexedDB as { databases?: () => Promise<Array<{ name?: string }>> };
  if (!factory.databases) return;
  const present = new Set((await factory.databases()).map(d => d.name));

  for (const name of LEGACY_DBS) {
    if (!present.has(name)) continue;
    let legacy: IDBPDatabase | null = null;
    try {
      legacy = await openDB(name);
      // 'finder' above v3 belonged to an unrelated app — leave it alone.
      if (name === 'finder' && legacy.version > 3) continue;
      const anyDb = db as unknown as IDBPDatabase;
      let copied = false;
      for (const store of ['workspaces', 'observations', 'segments', 'snag_assets', 'snags'] as const) {
        if (!legacy.objectStoreNames.contains(store) || !db.objectStoreNames.contains(store)) continue;
        for (const v of await legacy.getAll(store)) { await anyDb.put(store, v); copied = true; }
      }
      if (legacy.objectStoreNames.contains('media')) { // out-of-line: copy with explicit keys
        const keys = await legacy.getAllKeys('media');
        const vals = await legacy.getAll('media');
        for (let i = 0; i < keys.length; i++) await anyDb.put('media', vals[i], keys[i]);
      }
      if (copied) return; // first legacy DB with real data wins
    } catch { /* try the next legacy name */ }
    finally { legacy?.close(); }
  }
}

/* ---------- workspaces (the isolation container) ---------- */

/* Workspace accent colors — fresh greens, blues and one light orange. The
 * ORDER is deliberate and validated (dataviz six checks: lightness band,
 * chroma floor, CVD separation on adjacent pairs, normal-vision floor,
 * contrast on light AND dark surfaces) — don't reshuffle without re-running
 * the validator. Only new workspaces draw from here; existing ones keep the
 * color they were born with. */
const PALETTE = ['#2F9E52', '#2B87D4', '#D06E12', '#12958F', '#5E7DD8', '#6E9322'];
const cloneSubs = (src: Record<string, string[]>): Record<string, string[]> =>
  Object.fromEntries(Object.entries(src).map(([k, v]) => [k, [...v]]));

export async function listWorkspaces(): Promise<Workspace[]> {
  const all = await (await getDB()).getAll('workspaces');
  const recency = (w: Workspace) => Math.max(w.updatedAt, w.lastOpenedAt ?? 0);
  return all.filter(w => !w.archived).sort((a, b) => recency(b) - recency(a));
}

export async function getWorkspace(id: ID): Promise<Workspace | undefined> {
  return (await getDB()).get('workspaces', id);
}

/** Create a workspace seeded from a loss taxonomy (lib/taxonomy — content, not
 *  code). Defaults to the lean starter, so nothing changes for callers that
 *  don't choose. Every seeded string stays fully editable afterwards. */
export async function createWorkspace(name: string, taxonomyId?: string): Promise<Workspace> {
  const db = await getDB();
  const count = await db.count('workspaces');
  const tax = taxonomyById(taxonomyId ?? DEFAULT_TAXONOMY_ID);
  const t = now();
  const ws: Workspace = {
    id: uid(),
    name: name.trim() || 'Untitled workspace',
    color: PALETTE[count % PALETTE.length],
    createdAt: t,
    updatedAt: t,
    categories: [...tax.categories],
    subcategories: cloneSubs(tax.subcategories),
    // 'Whole line' is always present — where cross-cutting losses (changeover, waiting) live
    assets: [...tax.assets],
    shifts: [],
    schemaVersion: 1,
  };
  await db.put('workspaces', ws);
  signalWrite();
  return ws;
}

export async function updateWorkspace(ws: Workspace): Promise<void> {
  await (await getDB()).put('workspaces', { ...ws, updatedAt: now() });
  signalWrite();
}

/* Fields that live on THIS device only (running timer, resume route, recency).
 * A patch touching nothing else must NOT stamp updatedAt: the stamp is the sync
 * LWW clock, and bumping it on mere navigation gave a stale device a fresher
 * clock than a real edit made elsewhere — opening the app could then overwrite
 * a rename/category change from another device with old data. */
const DEVICE_LOCAL_FIELDS = new Set<keyof Workspace>(['activeTimer', 'lastRoute', 'lastOpenedAt']);
const isDeviceLocalPatch = (patch: Partial<Workspace>): boolean =>
  Object.keys(patch).every(k => DEVICE_LOCAL_FIELDS.has(k as keyof Workspace));

/** Atomic read-modify-write of one workspace record — get + put in a single
 *  transaction so concurrent patches (route, timer, settings) can't clobber each
 *  other. Returns the written record (for the provider's in-memory state). */
export async function patchWorkspaceRecord(id: ID, patch: Partial<Workspace>): Promise<Workspace | undefined> {
  const db = await getDB();
  const tx = db.transaction('workspaces', 'readwrite');
  const store = tx.objectStore('workspaces');
  const ws = await store.get(id);
  if (!ws) { await tx.done; return undefined; }
  const deviceLocal = isDeviceLocalPatch(patch);
  const next = deviceLocal ? { ...ws, ...patch } : { ...ws, ...patch, updatedAt: now() };
  await store.put(next);
  await tx.done;
  if (!deviceLocal) signalWrite(); // device-local churn isn't worth a push
  return next;
}

/** Atomic purge: the workspace and EVERYTHING under it (observations + the whole
 *  snag walk) plus their media blobs. Records tombstones so the delete syncs. */
export async function deleteWorkspace(id: ID): Promise<void> {
  const db = await getDB();
  const [obs, segs, assets, snags, cases] = await Promise.all([
    db.getAllFromIndex('observations', 'by_workspace', id),
    db.getAllFromIndex('segments', 'by_workspace', id),
    db.getAllFromIndex('snag_assets', 'by_workspace', id),
    db.getAllFromIndex('snags', 'by_workspace', id),
    db.getAllFromIndex('cases', 'by_workspace', id),
  ]);
  const blobKeys = [
    ...obs.flatMap(o => o.media.flatMap(m => [m.blobKey, m.thumbKey])),
    ...segs.flatMap(s => [s.videoKey, s.posterKey]),
    ...assets.map(a => a.stillKey),
    ...snags.map(s => s.detailPhotoKey),
  ].filter(Boolean) as string[];
  const tx = db.transaction(['workspaces', 'observations', 'segments', 'snag_assets', 'snags', 'cases', 'media'], 'readwrite');
  await tx.objectStore('workspaces').delete(id);
  for (const o of obs) await tx.objectStore('observations').delete(o.id);
  for (const s of segs) await tx.objectStore('segments').delete(s.id);
  for (const a of assets) await tx.objectStore('snag_assets').delete(a.id);
  for (const s of snags) await tx.objectStore('snags').delete(s.id);
  for (const c of cases) await tx.objectStore('cases').delete(c.id);
  for (const k of blobKeys) await tx.objectStore('media').delete(k);
  await tx.done;
  await recordTombstones('workspaces', [id]);
  await recordTombstones('observations', obs.map(o => o.id));
  await recordTombstones('segments', segs.map(s => s.id));
  await recordTombstones('snag_assets', assets.map(a => a.id));
  await recordTombstones('snags', snags.map(s => s.id));
  await recordTombstones('cases', cases.map(c => c.id));
}

/* ---------- observations (always workspace-scoped) ---------- */

export async function listObservations(workspaceId: ID): Promise<Observation[]> {
  const all = await (await getDB()).getAllFromIndex('observations', 'by_workspace', workspaceId);
  return all.filter(o => o.deletedAt == null).sort((a, b) => b.startedAt - a.startedAt);
}

export async function addObservation(o: Observation): Promise<void> {
  await (await getDB()).put('observations', o);
  signalWrite();
}

export async function updateObservation(o: Observation): Promise<void> {
  await (await getDB()).put('observations', { ...o, updatedAt: now() });
  signalWrite();
}

export async function softDeleteObservation(id: ID): Promise<void> {
  const db = await getDB();
  const o = await db.get('observations', id);
  if (!o) return;
  await db.put('observations', { ...o, deletedAt: now(), updatedAt: now() });
  signalWrite();
}

/** Undo a soft-delete (clears the tombstone). Powers the delete → Undo affordance. */
export async function restoreObservation(id: ID): Promise<void> {
  const db = await getDB();
  const o = await db.get('observations', id);
  if (!o) return;
  await db.put('observations', { ...o, deletedAt: undefined, updatedAt: now() });
  signalWrite();
}

/** Rename a taxonomy value across every observation that uses it, so a rename in
 *  settings doesn't orphan history (the taxonomy is stored as plain strings). */
export async function renameInObservations(
  workspaceId: ID, field: 'category' | 'subcategory' | 'asset' | 'shift', from: string, to: string,
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
  if (n > 0) signalWrite();
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
  signalWrite();
}
/** Edit a segment (name it). Stamps updatedAt so the change syncs and shows
 *  everywhere the segment is read. */
export async function updateSegment(seg: Segment): Promise<void> {
  await (await getDB()).put('segments', { ...seg, updatedAt: now() });
  signalWrite();
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

/* ---------- cases (the thin A3 — always workspace-scoped) ---------- */
export async function listCases(workspaceId: ID): Promise<Case[]> {
  const all = await (await getDB()).getAllFromIndex('cases', 'by_workspace', workspaceId);
  return all.filter(c => c.deletedAt == null).sort((a, b) => b.openedAt - a.openedAt);
}
export async function getCase(id: ID): Promise<Case | undefined> {
  const c = await (await getDB()).get('cases', id);
  return c?.deletedAt == null ? c : undefined;
}
export async function addCase(c: Case): Promise<void> {
  await (await getDB()).put('cases', c);
  signalWrite();
}
export async function updateCase(c: Case): Promise<void> {
  await (await getDB()).put('cases', { ...c, updatedAt: now() });
  signalWrite();
}
/** Hard delete + tombstone. Actions keep their caseId (it just dangles —
 *  they lose the folder, never their own life). */
export async function deleteCase(id: ID): Promise<void> {
  const db = await getDB();
  if (!(await db.get('cases', id))) return;
  await db.delete('cases', id);
  await recordTombstones('cases', [id]);
}

/* ============ PROJECTS — improvement initiatives spanning multiple workspaces ============ */
export async function allProjects(): Promise<Project[]> {
  const db = await getDB();
  const projects = await db.getAll('projects');
  return projects.filter(p => !p.deletedAt);
}
export async function getProject(id: ID): Promise<Project | undefined> {
  const p = await (await getDB()).get('projects', id);
  return p?.deletedAt == null ? p : undefined;
}
export async function addProject(p: Project): Promise<void> {
  await (await getDB()).put('projects', p);
  signalWrite();
}
export async function updateProject(p: Project): Promise<void> {
  await (await getDB()).put('projects', { ...p, updatedAt: now() });
  signalWrite();
}
export async function deleteProject(id: ID): Promise<void> {
  const db = await getDB();
  const p = await db.get('projects', id);
  if (!p) return;
  await db.put('projects', { ...p, deletedAt: now() });
  signalWrite();
}

/* Project targets — quarterly PPM goals for each line */
export async function getProjectTargets(projectId: ID): Promise<ProjectLineTarget[]> {
  const db = await getDB();
  const targets = await db.getAllFromIndex('project_targets', 'by_project', projectId);
  return targets.filter(t => !t.deletedAt);
}
export async function addProjectTarget(t: ProjectLineTarget): Promise<void> {
  await (await getDB()).put('project_targets', t);
  signalWrite();
}
export async function updateProjectTarget(t: ProjectLineTarget): Promise<void> {
  await (await getDB()).put('project_targets', { ...t, updatedAt: now() });
  signalWrite();
}

/* Project actuals — daily/weekly PPM measurements */
export async function getProjectActuals(projectId: ID, startDate?: Millis, endDate?: Millis): Promise<ProjectLineActual[]> {
  const db = await getDB();
  const actuals = await db.getAllFromIndex('project_actuals', 'by_project', projectId);
  const filtered = actuals.filter(a => !a.deletedAt);
  if (startDate || endDate) {
    return filtered.filter(a => (!startDate || a.date >= startDate) && (!endDate || a.date <= endDate));
  }
  return filtered;
}
export async function addProjectActual(a: ProjectLineActual): Promise<void> {
  await (await getDB()).put('project_actuals', a);
  signalWrite();
}
export async function getProjectActualsByWorkspace(projectId: ID, workspaceId: ID): Promise<ProjectLineActual[]> {
  const db = await getDB();
  const actuals = await db.getAllFromIndex('project_actuals', 'by_workspace', workspaceId);
  return actuals.filter(a => a.projectId === projectId && !a.deletedAt).sort((a, b) => a.date - b.date);
}


/* ============ PACE SNAPSHOTS — weekly uploads of the tracker workbook ============
 * Newest first. Local to this device by design (see the schema note above). */
export async function listPaceSnapshots(): Promise<PaceSnapshotRow[]> {
  const all = await (await getDB()).getAll('pace_snapshots');
  return all.sort((a, b) => b.takenAt - a.takenAt);
}
export async function addPaceSnapshot(s: PaceSnapshotRow): Promise<void> {
  await (await getDB()).put('pace_snapshots', s);
}
export async function deletePaceSnapshot(id: ID): Promise<void> {
  await (await getDB()).delete('pace_snapshots', id);
}

/* ---------- pace lines (the ppm numbers) ---------- */
export async function listPaceLines(): Promise<PaceLineRow[]> {
  return (await getDB()).getAll('pace_lines');
}
export async function putPaceLine(row: PaceLineRow): Promise<void> {
  await (await getDB()).put('pace_lines', { ...row, updatedAt: now() });
}
