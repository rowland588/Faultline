/* Studies — one use of a tool, on its own, on a line, on a job. See
 * lib/study.ts. */
import type { ID } from '../types';
import type { ToolStudy } from '../lib/study';
import { now } from '../lib/ids';
import { getDB, signalWrite } from './core';
import { recordTombstones, restoreRows, type Restore } from './sync';

const live = (s: ToolStudy) => !s.deletedAt;
/* MY TEMPLATES (lib/templates, docs/CONSULTANT-WORKSPACE.md C5) are the consultant's own, never a customer's record: on no line and in no
   project, so a line's and a project's readers never find one, and the one reader of every study leaves them out — every list, count,
   report, search, the Story and Luna read through it. listTemplates is the one door to them. */
const notTemplate = (s: ToolStudy) => !s.facts?.template;
const newestFirst = (a: ToolStudy, b: ToolStudy) => b.startedAt - a.startedAt;

/** A job's studies — the evidence attached to it. */
export async function listStudies(projectId: string): Promise<ToolStudy[]> {
  return (await (await getDB()).getAllFromIndex('studies', 'by_project', projectId)).filter(live).sort(newestFirst);
}

/** A line's studies, whether or not they are attached to a job. */
export async function listStudiesForLine(workspaceId: string): Promise<ToolStudy[]> {
  return (await (await getDB()).getAllFromIndex('studies', 'by_workspace', workspaceId)).filter(live).sort(newestFirst);
}

/** Every study on this device — a tool's page lists them across lines and
 *  jobs, the maker's unfiled ones first. */
export async function listAllStudies(): Promise<ToolStudy[]> {
  return (await (await getDB()).getAll('studies')).filter(s => live(s) && notTemplate(s)).sort(newestFirst);
}

/** MY TEMPLATES — the consultant's own starting points (lib/templates), newest first. */
export async function listTemplates(): Promise<ToolStudy[]> {
  return (await (await getDB()).getAll('studies')).filter(s => live(s) && !notTemplate(s)).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getStudy(id: ID): Promise<ToolStudy | undefined> {
  const s = await (await getDB()).get('studies', id);
  return s && live(s) ? s : undefined;
}

export async function putStudy(s: ToolStudy): Promise<void> {
  await (await getDB()).put('studies', { ...s, updatedAt: now() });
  signalWrite();
}

/** Read, change and write in one transaction, so a reading typed while
 *  another lands is not lost between the read and the write. */
export async function patchStudy(id: ID, patch: Partial<ToolStudy> | ((cur: ToolStudy) => Partial<ToolStudy>)): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('studies', 'readwrite');
  const cur = await tx.store.get(id);
  if (!cur || cur.deletedAt) { await tx.done; return; }
  const p = typeof patch === 'function' ? patch(cur) : patch;
  await tx.store.put({ ...cur, ...p, updatedAt: now() });
  await tx.done;
  signalWrite();
}

/** Deleted with an undo. On a job, deleting is the owner's (can.remove): the
 *  cloud keeps a study's deleted_at for anyone else (STUDIES.sql). */
export async function deleteStudy(id: ID): Promise<Restore> {
  const db = await getDB();
  const row = await db.get('studies', id);
  await db.delete('studies', id);
  await recordTombstones('studies', [id]);
  signalWrite();
  return async () => { if (row) await restoreRows('studies', [row]); };
}

/** A line standard's studies go where it goes: attached to a job with it, or
 *  taken off the job with it — so the work balance is the job's evidence
 *  exactly while its standard is the job's. */
export async function followStandard(standardId: ID, projectId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('studies', 'readwrite');
  const mine = (await tx.store.getAll()).filter(s => s.standardId === standardId && (s.projectId ?? '') !== projectId);
  for (const s of mine) {
    const { projectId: _was, ...rest } = s;
    void _was;
    await tx.store.put({ ...rest, ...(projectId ? { projectId } : {}), updatedAt: now() });
  }
  await tx.done;
  if (mine.length) signalWrite();
}
