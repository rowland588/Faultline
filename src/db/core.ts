/* THE DATABASE ITSELF: the schema, opening it, and the write signals.
 *
 * The ONLY module that holds the connection. `dbp` and `opened` live here and
 * nowhere else — two modules each caching their own connection is two upgrade
 * paths racing each other, and the symptom would be an app that works until it
 * suddenly does not.
 *
 * Everything else in src/db/ imports getDB and signalWrite from here, and this
 * file imports none of them back. That is the whole rule that keeps the split
 * acyclic.
 */
import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction, type StoreNames } from 'idb';
import type { Workspace, Observation, Case, Project, ProjectLineTarget, ProjectLineActual } from '../types';
import type { Segment, SnagAsset, Snag } from '../snag/types';
import type { CommissionItem, Phase } from '../lib/commissioning';
import type {
  Tombstone, PaceSnapshotRow, PaceLineRow, PaceTodoRow, PaceWinRow, TreeNodeRow,
} from './rows';
import { now } from '../lib/ids';


/** The schema, exported because the sync layer types its raw store access
 *  against it. */
export interface AppDB extends DBSchema {
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
  /* Next steps (v8): the things that still need doing and the things we are
   * waiting on. Typed in the app — these are NOT in the workbook, which only
   * carries actions that already have an owner and a due date. */
  pace_todos: { key: string; value: PaceTodoRow; indexes: { by_createdAt: number } };
  /* v9: the ppm rows again, keyed by a syncable id rather than by the line name.
   * A line name cannot be a cloud primary key — two people both have a "2A" —
   * and the old store cannot be re-keyed in place without risking numbers
   * somebody typed, so this is a new store that the old one migrates into on
   * first read. `pace_lines` stays declared only so that migration can happen. */
  pace_ppm: { key: string; value: PaceLineRow; indexes: { by_key: string } };
  /* Success log (v10): what was done and what worked. Typed in the app, synced
   * like the todos, kept SEPARATE from them — a win is not a task with its state
   * flipped to done, it is the story you tell the team. Newest first. */
  pace_wins: { key: string; value: PaceWinRow; indexes: { by_createdAt: number } };
  /* The lever tree (v11): the project drawn as it is drawn on paper — an
   * outcome, what has to be true for it, the conditions under that, and the
   * work underneath. ONE node type, nested by parentId, because a tree of four
   * named levels and a tree of nodes are the same thing and only one of them
   * can be reshaped without a migration. */
  tree_nodes: { key: string; value: TreeNodeRow; indexes: { by_project: string } };
  /* Commissioning (v12): the readiness list for a line being handed over by an
   * OEM. Typed in the app rather than read from a workbook — see
   * lib/commissioning.ts for why that is the whole point rather than a detail. */
  commission_items: { key: string; value: CommissionItem; indexes: { by_project: string } };
  /* THE PROGRAMME. Six rows per commissioning project — the stages a line goes
     through, each with the date it was planned for and the date it is now
     expected. Separate from the items because a phase outlives every row on it:
     the stage exists before anybody has typed a single check against it. */
  commission_phases: { key: string; value: Phase; indexes: { by_project: string } };
}

/* The app's local database. LEGACY_DBS are names this app shipped under before
 * the Faultline rebrand — read ONCE to migrate a device's existing data into the
 * new name, never written to again. ('finder' is only trusted at ≤ v3; higher
 * versions of that name belonged to an unrelated app and are left alone.) */
const DB_NAME = 'faultline';
const LEGACY_DBS = ['finder-qc', 'finder'] as const;
const DB_VERSION = 13; // v13: commission_phases (the commissioning programme)
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
export function signalWrite(): void {
  for (const fn of writeListeners) { try { fn(); } catch { /* listener's problem */ } }
  signalData();
}

/* ---------- data-changed signal ----------
 * Separate from the one above, and it fires for BOTH kinds of write: what the
 * user did here, and what sync pulled down from another device. Screens listen
 * to this one.
 *
 * The sync engine must NOT listen to it — a pull would request a push would
 * request a pull. It keeps onLocalWrite, which only ever fires for a change
 * made on this device. */
const dataListeners = new Set<() => void>();
export function onDataChange(fn: () => void): () => void {
  dataListeners.add(fn);
  return () => { dataListeners.delete(fn); };
}
export function signalData(): void {
  for (const fn of dataListeners) { try { fn(); } catch { /* listener's problem */ } }
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

/** Every store the app cannot run without. Exported so the sync tests can
 *  assert against this list rather than grepping a file for store names — which
 *  broke the moment db.ts became a barrel. */
export const REQUIRED_STORES = ['workspaces', 'observations', 'media', 'meta', 'segments', 'snag_assets', 'snags', 'tombstones', 'cases', 'projects', 'project_targets', 'project_actuals', 'pace_snapshots', 'pace_lines', 'pace_todos', 'pace_ppm', 'pace_wins', 'tree_nodes', 'commission_items', 'commission_phases'] as const;

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
  if (!db.objectStoreNames.contains('pace_todos')) {
    db.createObjectStore('pace_todos', { keyPath: 'id' }).createIndex('by_createdAt', 'createdAt');
  }
  if (!db.objectStoreNames.contains('pace_ppm')) {
    db.createObjectStore('pace_ppm', { keyPath: 'id' }).createIndex('by_key', 'key');
  }
  if (!db.objectStoreNames.contains('tree_nodes')) {
    db.createObjectStore('tree_nodes', { keyPath: 'id' }).createIndex('by_project', 'projectId');
  }
  if (!db.objectStoreNames.contains('commission_phases')) {
    db.createObjectStore('commission_phases', { keyPath: 'id' }).createIndex('by_project', 'projectId');
  }
  if (!db.objectStoreNames.contains('commission_items')) {
    db.createObjectStore('commission_items', { keyPath: 'id' }).createIndex('by_project', 'projectId');
  }
  if (!db.objectStoreNames.contains('pace_wins')) {
    db.createObjectStore('pace_wins', { keyPath: 'id' }).createIndex('by_createdAt', 'createdAt');
  }
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

/** EVERY INDEX THE APP RELIES ON, AS DATA.
 *
 *  ensureStores above creates these when it creates the store — and only then,
 *  because each block is guarded by `if (!contains(store))`. That makes the store
 *  list self-healing and the INDEX list not: a store that already exists never
 *  gets a new index, however many versions go by. Nothing is broken by that
 *  today, since no shipped build made a store without its indexes. The hazard is
 *  the next one. Adding an index to an existing store would work perfectly on
 *  every fresh install and silently do nothing on every device that already has
 *  the app, and the failure lands as a thrown query on somebody's phone rather
 *  than anywhere a developer would see it.
 *
 *  So the indexes are declared here as well, and repaired on every upgrade. This
 *  table and the blocks above must agree; the test suite asserts that they do. */
export const INDEXES: [StoreNames<AppDB>, string, string | string[]][] = [
  ['workspaces', 'by_updatedAt', 'updatedAt'],
  ['observations', 'by_workspace', 'workspaceId'],
  ['observations', 'by_ws_started', ['workspaceId', 'startedAt']],
  ['observations', 'by_updatedAt', 'updatedAt'],
  ['pace_snapshots', 'by_takenAt', 'takenAt'],
  ['pace_todos', 'by_createdAt', 'createdAt'],
  ['pace_ppm', 'by_key', 'key'],
  ['tree_nodes', 'by_project', 'projectId'],
  ['commission_items', 'by_project', 'projectId'],
  ['commission_phases', 'by_project', 'projectId'],
  ['pace_wins', 'by_createdAt', 'createdAt'],
  ['segments', 'by_workspace', 'workspaceId'],
  ['snag_assets', 'by_workspace', 'workspaceId'],
  ['snag_assets', 'by_segment', 'segmentId'],
  ['snags', 'by_workspace', 'workspaceId'],
  ['snags', 'by_asset', 'assetId'],
  ['cases', 'by_workspace', 'workspaceId'],
  ['projects', 'by_updatedAt', 'updatedAt'],
  ['project_targets', 'by_project', 'projectId'],
  ['project_targets', 'by_workspace', 'workspaceId'],
  ['project_actuals', 'by_project', 'projectId'],
  ['project_actuals', 'by_workspace', 'workspaceId'],
  ['project_actuals', 'by_date', ['projectId', 'date']],
];

/** Add any index a store is missing. Idempotent, and safe on a store this very
 *  upgrade just created — the index is already there and gets skipped.
 *
 *  Needs the versionchange transaction rather than the database, because that is
 *  the only place createIndex is legal. */
function ensureIndexes(tx: IDBPTransaction<AppDB, ArrayLike<StoreNames<AppDB>>, 'versionchange'>): void {
  for (const [store, name, keyPath] of INDEXES) {
    if (!tx.db.objectStoreNames.contains(store)) continue;
    const os = tx.objectStore(store);
    if ((os.indexNames as DOMStringList).contains(name)) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- idb types index names per store; this table is generic over all of them
    (os as any).createIndex(name, keyPath);
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
      upgrade(db, _oldVersion, _newVersion, tx) { ensureStores(db); ensureIndexes(tx); },
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
