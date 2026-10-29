/* Workspaces — the isolation container every capture belongs to. */
import type { ID, Workspace } from '../types';
import { uid, now } from '../lib/ids';
import { taxonomyById, DEFAULT_TAXONOMY_ID } from '../lib/taxonomy';
import { getDB, signalWrite } from './core';
import { recordTombstones } from './sync';
import { dropRecentLine } from '../lib/recentPlaces';

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
    name: name.trim() || 'Untitled line',
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
  dropRecentLine(id);
}

/* ---------- putting a line away, and taking it out for good ----------
 *
 * The same two acts as a project, for the same reason: `deleteWorkspace` above
 * destroys a line's whole history — every observation, the walk, the videos,
 * the snags and their photographs — and that is not what somebody wants when a
 * line simply stops being worked on. Offering only the destructive option is
 * how a list fills with things nobody dares touch.
 *
 * `archived` has been on the Workspace record all along and listWorkspaces has
 * always filtered on it. Nothing ever set it, so the flag existed and the
 * feature did not.
 */

export async function archiveWorkspace(id: ID): Promise<void> {
  const db = await getDB();
  const ws = await db.get('workspaces', id);
  if (!ws) return;
  await db.put('workspaces', { ...ws, archived: true, updatedAt: now() });
  signalWrite();
  dropRecentLine(id);
}

export async function restoreWorkspace(id: ID): Promise<void> {
  const db = await getDB();
  const ws = await db.get('workspaces', id);
  if (!ws) return;
  await db.put('workspaces', { ...ws, archived: false, updatedAt: now() });
  signalWrite();
}

/** Put away, newest first. Separate from listWorkspaces so no screen has to
 *  remember to filter — forgetting is how an archive stops being one. */
export async function listArchivedWorkspaces(): Promise<Workspace[]> {
  const all = await (await getDB()).getAll('workspaces');
  return all.filter(w => w.archived).sort((a, b) => b.updatedAt - a.updatedAt);
}

/** What deleting this line would destroy, counted before anybody is asked to
 *  agree to it. "Delete everything" is not something anybody can consent to
 *  without being told what everything is — and here everything includes
 *  video that exists nowhere else. */
export async function workspaceContents(id: ID): Promise<{ what: string; count: number }[]> {
  const db = await getDB();
  const [obs, segs, assets, snags, cases] = await Promise.all([
    db.getAllFromIndex('observations', 'by_workspace', id),
    db.getAllFromIndex('segments', 'by_workspace', id),
    db.getAllFromIndex('snag_assets', 'by_workspace', id),
    db.getAllFromIndex('snags', 'by_workspace', id),
    db.getAllFromIndex('cases', 'by_workspace', id),
  ]);
  /* Pluralised HERE rather than at the call site. "1 filmed walks" in a
     delete warning reads as carelessness, and carelessness is not what you want
     somebody feeling about the sentence that is asking them to destroy a year
     of film. */
  const say = (n: number, one: string, many: string) => ({ what: n === 1 ? one : many, count: n });
  return [
    say(obs.length, 'captured loss', 'captured losses'),
    say(segs.length, 'filmed walk', 'filmed walks'),
    say(assets.length, 'pinned machine', 'pinned machines'),
    say(snags.length, 'problem', 'problems'),
    say(cases.length, 'case (A3)', 'cases (A3s)'),
  ].filter(r => r.count > 0);
}

/** MERGE TWO LINES (BLUEPRINT §6.7, Stage 1) — a duplicate "Line 2B": everything
 *  on `fromId` moves to `toId` — its problems, frames, film, timed stops,
 *  cases, studies, line standards, the jobs that name it and the walks of the
 *  jobs that kept one on it — each stamped so the move reaches every device;
 *  its vocabulary joins the other's (the other's settings win where both have
 *  one); and the emptied line is archived, never deleted, so it can be
 *  brought back. Returns how many records moved. */
export async function mergeLines(fromId: ID, toId: ID): Promise<number> {
  return (await mergeLinesUndoable(fromId, toId)).moved;
}

/** The merge, with the way back: every record it moved is remembered as it
 *  was, and `undo` puts each one back and the two lines as they were — a
 *  merge is one tap on Your factory, and a merge of the wrong two lines
 *  used to be for keeps (docs/UPGRADE-AUDIT.md S7). */
export async function mergeLinesUndoable(fromId: ID, toId: ID): Promise<{ moved: number; undo: () => Promise<void> }> {
  const db = await getDB();
  const from = await db.get('workspaces', fromId), to = await db.get('workspaces', toId);
  if (!from || !to || fromId === toId) return { moved: 0, undo: async () => undefined };
  const t = now();
  let moved = 0;
  /* what was, to put back */
  const before: { store: 'observations' | 'segments' | 'snag_assets' | 'snags' | 'cases' | 'studies' | 'standards' | 'pace_ppm' | 'projects'; row: unknown }[] = [];
  const metaBefore: { key: string; value: unknown }[] = [];
  for (const store of ['observations', 'segments', 'snag_assets', 'snags', 'cases', 'studies'] as const) {
    for (const r of await db.getAllFromIndex(store, 'by_workspace', fromId)) {
      before.push({ store, row: r });
      await db.put(store, { ...r, workspaceId: toId, updatedAt: t } as never);
      moved++;
    }
  }
  for (const s of (await db.getAll('standards')).filter(x => x.workspaceId === fromId)) { before.push({ store: 'standards', row: s }); await db.put('standards', { ...s, workspaceId: toId, updatedAt: t }); moved++; }
  for (const l of (await db.getAll('pace_ppm')).filter(x => x.workspaceId === fromId && !x.deletedAt)) { before.push({ store: 'pace_ppm', row: l }); await db.put('pace_ppm', { ...l, workspaceId: toId, updatedAt: t }); moved++; }
  for (const p of (await db.getAll('projects')).filter(x => x.walkWorkspaceId === fromId)) { before.push({ store: 'projects', row: p }); await db.put('projects', { ...p, walkWorkspaceId: toId, updatedAt: t }); }
  for (const key of await db.getAllKeys('meta')) {
    const k = String(key);
    if (k !== 'paceWorkspace' && !k.startsWith('paceWorkspace:')) continue;
    const m = (await db.get('meta', key)) as { id?: ID } | undefined;
    if (m?.id === fromId) { metaBefore.push({ key: k, value: m }); await db.put('meta', { ...m, id: toId }, key); }
  }
  const uniq = (xs: readonly string[]) => [...new Map(xs.filter(x => x.trim()).map(x => [x.trim().toLowerCase(), x])).values()];
  const subs: Record<string, string[]> = { ...from.subcategories };
  for (const [k, v] of Object.entries(to.subcategories ?? {})) subs[k] = uniq([...(subs[k] ?? []), ...v]);
  await db.put('workspaces', {
    ...to,
    categories: uniq([...(to.categories ?? []), ...(from.categories ?? [])]),
    subcategories: subs,
    assets: uniq([...(to.assets ?? []), ...(from.assets ?? [])]),
    shifts: to.shifts?.length ? to.shifts : from.shifts ?? [],
    crew: to.crew ?? from.crew, labourRatePerHour: to.labourRatePerHour ?? from.labourRatePerHour, labourBurden: to.labourBurden ?? from.labourBurden,
    packsPerMin: to.packsPerMin ?? from.packsPerMin, marginPerPack: to.marginPerPack ?? from.marginPerPack,
    lineType: to.lineType ?? from.lineType,
    updatedAt: t,
  });
  await db.put('workspaces', { ...from, archived: true, updatedAt: t });
  signalWrite();
  const undo = async () => {
    const d = await getDB();
    const u = now();
    for (const b of before) await d.put(b.store, { ...(b.row as object), updatedAt: u } as never);
    for (const m of metaBefore) await d.put('meta', m.value as never, m.key);
    await d.put('workspaces', { ...to, updatedAt: u });
    await d.put('workspaces', { ...from, updatedAt: u });
    signalWrite();
  };
  return { moved, undo };
}
