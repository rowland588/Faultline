import { getDB, signalWrite } from './core';
import { placementNote, type EvidenceKind, type MethodPlacement } from '../lib/methodPlacement';

/** Attach an existing project record without editing its content or moving it between projects. */
export async function attachMethodEvidence(p: MethodPlacement, kind: EvidenceKind, id: string): Promise<boolean> {
  const table = kind === 'study' ? 'studies' : 'standards';
  const tx = (await getDB()).transaction([table, 'test_items'], 'readwrite');
  const record = await tx.objectStore(table).get(id);
  if (!record || record.deletedAt || record.projectId !== p.projectId) return false;
  const notes = tx.objectStore('test_items');
  const note = placementNote(p, kind, id, Date.now());
  const before = await notes.get(note.id);
  await notes.put({ ...before, ...note, createdAt: before?.createdAt ?? note.createdAt });
  await tx.done;
  signalWrite();
  return true;
}
