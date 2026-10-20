/* Methods, the steps done under them, and the activity log — persistence
 * only. The rules (what may be approved, when a gate may be passed, what is
 * logged) are lib/flow/operations; nothing here decides anything. */
import type { ID } from '../types';
import type { ActivityEntry, FlowRecord, GateCheck, Method } from '../lib/flow/records';
import { now } from '../lib/ids';
import { getDB, signalWrite } from './core';
import { recordTombstones, restoreRows, type Restore } from './sync';

const live = <T extends { deletedAt?: number }>(x: T) => !x.deletedAt;

/* --------------------------------- methods -------------------------------- */

/** Every method version this device holds, newest first. */
export async function listMethods(): Promise<Method[]> {
  return (await (await getDB()).getAll('methods')).filter(live).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getMethod(id: ID): Promise<Method | undefined> {
  const m = await (await getDB()).get('methods', id);
  return m && live(m) ? m : undefined;
}

/** Every version of one method, oldest first. */
export async function methodFamily(familyId: ID): Promise<Method[]> {
  return (await (await getDB()).getAllFromIndex('methods', 'by_family', familyId)).filter(live).sort((a, b) => a.version - b.version);
}

export async function putMethod(m: Method): Promise<void> {
  await (await getDB()).put('methods', { ...m, updatedAt: now() });
  signalWrite();
}

/** Deleted with an undo — a draft only (lib/flow/operations says so). */
export async function deleteMethodRow(id: ID): Promise<Restore> {
  const db = await getDB();
  const row = await db.get('methods', id);
  await db.delete('methods', id);
  await recordTombstones('methods', [id]);
  signalWrite();
  return async () => { if (row) await restoreRows('methods', [row]); };
}

/* ------------------------------ steps and gates ----------------------------- */

export async function listFlowRecords(projectId: ID): Promise<FlowRecord[]> {
  return (await (await getDB()).getAllFromIndex('flow_records', 'by_project', projectId)).filter(live);
}

export async function getFlowRecord(id: ID): Promise<FlowRecord | undefined> {
  const r = await (await getDB()).get('flow_records', id);
  return r && live(r) ? r : undefined;
}

export async function putFlowRecord(r: FlowRecord): Promise<void> {
  await (await getDB()).put('flow_records', { ...r, updatedAt: now() });
  signalWrite();
}

/** Read, change and write in one transaction. */
export async function patchFlowRecord(id: ID, patch: Partial<FlowRecord> | ((cur: FlowRecord) => Partial<FlowRecord>)): Promise<FlowRecord | undefined> {
  const db = await getDB();
  const tx = db.transaction('flow_records', 'readwrite');
  const cur = await tx.store.get(id);
  if (!cur || cur.deletedAt) { await tx.done; return undefined; }
  const p = typeof patch === 'function' ? patch(cur) : patch;
  const next = { ...cur, ...p, updatedAt: now() };
  await tx.store.put(next);
  await tx.done;
  signalWrite();
  return next;
}

/** Deleted with an undo. On a project, deleting is the owner's: the cloud
 *  keeps deleted_at for anyone else (supabase/METHODS.sql). */
export async function deleteFlowRecord(id: ID): Promise<Restore> {
  const db = await getDB();
  const row = await db.get('flow_records', id);
  await db.delete('flow_records', id);
  await recordTombstones('flow_records', [id]);
  signalWrite();
  return async () => { if (row) await restoreRows('flow_records', [row]); };
}

/* --------------------------------- activity -------------------------------- */

/** Written once and never changed. */
export async function addActivity(a: ActivityEntry): Promise<void> {
  await (await getDB()).put('activity_log', a);
  signalWrite();
}

/** A project's history, newest first. */
export async function listActivity(projectId: ID): Promise<ActivityEntry[]> {
  return (await (await getDB()).getAllFromIndex('activity_log', 'by_project', projectId)).sort((a, b) => b.at - a.at);
}

/** A method's history — every entry naming one of its versions — newest first. */
export async function listMethodActivity(methodIds: readonly ID[]): Promise<ActivityEntry[]> {
  const ids = new Set(methodIds);
  return (await (await getDB()).getAll('activity_log')).filter(a => a.methodId && ids.has(a.methodId)).sort((a, b) => b.at - a.at);
}

/* ----------------------------- the server's reading ---------------------------- */

/** The server's readings of a project's gate passes, by the pass's id — only
 *  ever written here by the sync's pull (lib/flow/gateCheck). */
export async function listGateChecks(projectId: ID): Promise<Record<ID, GateCheck>> {
  const all = await (await getDB()).getAllFromIndex('gate_checks', 'by_project', projectId);
  return Object.fromEntries(all.filter(live).map(c => [c.id, c]));
}
