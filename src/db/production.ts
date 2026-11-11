/* PRODUCTION DATA ON THE DEVICE (11 November, docs/DATA-CONNECTIONS.md) — the connections and the rows the business's systems sent,
 * synced like every line-attached row (supabase/PRODUCTION_DATA.sql). The app's own import path (a file or a sample brought in on the
 * connection's page) writes here through the same core the ingest function runs; a row's id is `connection : the system's id`, so a
 * row brought in twice — here, or by the cloud — is one row. */
import type { DataConnectionRow, ProductionRecordRow } from './rows';
import { getDB, signalWrite } from './core';
import { recordTombstones } from './sync';
import { now } from '../lib/ids';

export async function listConnections(): Promise<DataConnectionRow[]> {
  return (await (await getDB()).getAll('data_connections')).filter(c => !c.deletedAt).sort((a, b) => a.createdAt - b.createdAt);
}
export async function getConnection(id: string): Promise<DataConnectionRow | undefined> {
  const c = await (await getDB()).get('data_connections', id);
  return c && !c.deletedAt ? c : undefined;
}
export async function putConnection(c: DataConnectionRow): Promise<void> {
  await (await getDB()).put('data_connections', { ...c, updatedAt: now() });
  signalWrite();
}
export async function patchConnection(id: string, patch: Partial<DataConnectionRow>): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('data_connections', 'readwrite');
  const cur = await tx.store.get(id);
  if (cur && !cur.deletedAt) await tx.store.put({ ...cur, ...patch, id, updatedAt: now() });
  await tx.done;
  signalWrite();
}

/** A connection taken off, with the rows it brought in (they were the system's, through it). Undo puts both back. */
export async function removeConnection(id: string): Promise<() => Promise<void>> {
  const db = await getDB();
  const conn = await db.get('data_connections', id);
  const rows = (await db.getAll('production_records')).filter(r => r.connectionId === id);
  const tx = db.transaction(['data_connections', 'production_records'], 'readwrite');
  await tx.objectStore('data_connections').delete(id);
  for (const r of rows) await tx.objectStore('production_records').delete(r.id);
  await tx.done;
  await recordTombstones('data_connections', [id]);
  await recordTombstones('production_records', rows.map(r => r.id));
  signalWrite();
  return async () => {
    const d = await getDB();
    const t = now();
    if (conn) await d.put('data_connections', { ...conn, updatedAt: t });
    for (const r of rows) await d.put('production_records', { ...r, updatedAt: t });
    const tomb = d.transaction('tombstones', 'readwrite');
    for (const k of [id, ...rows.map(r => r.id)]) await tomb.store.delete(k);
    await tomb.done;
    signalWrite();
  };
}

export async function listProduction(workspaceId?: string): Promise<ProductionRecordRow[]> {
  const db = await getDB();
  const all = workspaceId ? await db.getAllFromIndex('production_records', 'by_workspace', workspaceId) : await db.getAll('production_records');
  return all.filter(r => !r.deletedAt).sort((a, b) => a.day.localeCompare(b.day) || (a.shift ?? '').localeCompare(b.shift ?? ''));
}

/** Rows kept by their id — a row already here is replaced, never doubled. Returns how many were new and how many replaced. */
export async function upsertProduction(rows: readonly ProductionRecordRow[]): Promise<{ added: number; replaced: number }> {
  const db = await getDB();
  const tx = db.transaction('production_records', 'readwrite');
  let added = 0, replaced = 0;
  for (const r of rows) {
    const had = await tx.store.get(r.id);
    if (had && !had.deletedAt) replaced++; else added++;
    /* replaced whole — what the system no longer sends is no longer said — keeping only whose it is */
    const { deletedAt: _gone, ...row } = r;
    void _gone;
    await tx.store.put({ ...row, ...(had?.ownerId ? { ownerId: had.ownerId } : {}) });
  }
  await tx.done;
  if (rows.length) signalWrite();
  return { added, replaced };
}
