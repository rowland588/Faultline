/* Workspaces — the isolation container every capture belongs to. */
import type { ID, Workspace } from '../types';
import { uid, now } from '../lib/ids';
import { taxonomyById, DEFAULT_TAXONOMY_ID } from '../lib/taxonomy';
import { getDB, signalWrite } from './core';
import { recordTombstones } from './sync';

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
