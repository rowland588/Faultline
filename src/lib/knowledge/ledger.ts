/* LUNAR'S KNOWLEDGE ON THE DEVICE (docs/LUNAR-KNOWLEDGE.md §2). Read a line's entries; add entries — never change or remove one (the
 * cloud refuses it too, supabase/KNOWLEDGE.sql). An entry already here is left exactly as it is. */
import { getDB, signalWrite } from '../../db/core';
import type { Entry } from './model';

export async function listKnowledge(lineId?: string): Promise<Entry[]> {
  const db = await getDB();
  const rows = lineId ? await db.getAllFromIndex('knowledge', 'by_workspace', lineId) : await db.getAll('knowledge');
  return rows.filter(r => !r.deletedAt);
}

/** Add the entries not already here; returns how many were added. */
export async function addEntries(entries: readonly Entry[]): Promise<number> {
  if (!entries.length) return 0;
  const db = await getDB();
  let added = 0;
  const tx = db.transaction('knowledge', 'readwrite');
  for (const e of entries) {
    if (await tx.store.get(e.id)) continue;
    await tx.store.put(e);
    added++;
  }
  await tx.done;
  if (added) signalWrite();
  return added;
}
