/* A PDF IS KEPT WHERE IT WAS MADE — Rowland, 5 November: "I get to do the report and it gives me the download, but I never actually have the report saved and
 * available in the app ... wherever I've done it, that's where the PDF is, rather than some page full of a library".
 *
 * Every PDF the app makes goes out through one door (lib/savePdf deliverBlob). On its way it is also kept: the bytes in the media store, a small record naming
 * it, when it was made and the ADDRESS of the page it was made on. A page shows what was made on it under its Report ▾ — Saved copies — to open, download or take
 * off; a line's page also shows what was made on pages that carry its id. A copy is a snapshot of what was handed over: the page goes on changing, the next paper
 * is a new copy. Never in the way: a failure to keep never stops the download.
 *
 * IN THE LIBRARY, AND IN THE CLOUD (11 November, docs/CONSULTANT-WORKSPACE.md C4 — "Where is my overall library of work? … I don't want reports disappearing
 * into individual projects"). The record is now a synced row (`kept_papers`, supabase/KEPT_PAPERS.sql; db/rows KeptPaperRow) and its PDF a file the cloud keeps
 * while the row names it — so a paper made on the phone is in the library (#/library) on the laptop. Each copy also says what paper it is, whom it is for
 * (client-facing or internal, changeable) and the customer it was made for (lib/library). Until the table is in the cloud the sync waits for this one kind and
 * everything stays on the device as it did.
 *
 * Copies kept before the library (in the device's meta store, 5–11 November) stay where they are and are listed as before; the library offers ONCE to move them
 * in ("Keep these 12 copies in your library?") — never silently. */
import { getDB, signalWrite } from '../db/core';
import { putBlob, getBlob, deleteBlobs } from '../db/blobs';
import { recordTombstones, restoreRows } from '../db/sync';
import type { KeptPaperRow, PaperAudience } from '../db/rows';
import { audienceOf, paperKindOf, placePaper, type PaperPlace } from './library';
import { uid } from './ids';

/** A kept paper — a library row, or (`local`) a copy kept on this device before the library that has not been moved in. */
export type KeptPdf = KeptPaperRow & { local?: true };

/** The device-only list of 5–11 November, and the answer to its one offer. */
const META = 'keptPdfs';
const DECLINED = 'keptPdfsDeclined';
interface OldKept { id: string; key: string; name: string; at: number; size: number; page: string; ids: string[] }

const subs = new Set<() => void>();
export const onKeptChange = (f: () => void): (() => void) => { subs.add(f); return () => { subs.delete(f); }; };
const changed = (): void => { subs.forEach(f => { try { f(); } catch { /* a listener's problem */ } }); };
/* a row a sync brought down (a paper made on the other device) is news to every open list */
let heard = false;
const listenToData = () => {
  if (heard) return;
  heard = true;
  void import('../db/core').then(c => c.onDataChange(changed)).catch(() => undefined);
};

/** An address without its query, and the ids in it. */
export const pageOf = (hash: string): string => hash.split('?')[0].replace(/\/+$/, '') || '#/';
export const idsIn = (hash: string): string[] => [...new Set(hash.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) ?? [])];

async function oldList(): Promise<OldKept[]> {
  const v = await (await getDB()).get('meta', META);
  return Array.isArray(v) ? (v as OldKept[]) : [];
}
const saveOld = async (xs: OldKept[]): Promise<void> => { await (await getDB()).put('meta', xs, META); changed(); };

/** An old copy as the library reads it — its kind and audience from its page, its customer not known. */
const asOld = (o: OldKept): KeptPdf => {
  const kind = paperKindOf(o.page);
  return { ...o, kind, audience: audienceOf(kind), updatedAt: o.at, local: true };
};

/** Every kept paper on this device, newest first: the library's rows (not taken off), then the old device-only copies. */
export async function listKept(): Promise<KeptPdf[]> {
  listenToData();
  const db = await getDB();
  const rows = (await db.getAll('kept_papers')).filter(r => !r.deletedAt) as KeptPdf[];
  return [...rows, ...(await oldList()).map(asOld)].sort((a, b) => b.at - a.at);
}

/** Where a paper made on the page at `hash` belongs — its line, project, record and customer (lib/library placePaper). */
async function placeOf(hash: string): Promise<PaperPlace> {
  try {
    const db = await import('../db');
    const { activeClientNow } = await import('./activeClient');
    const ids = idsIn(hash);
    const some = <T,>(xs: (T | undefined)[]): T[] => xs.filter((x): x is T => !!x);
    /* every line, archived ones too — a paper keeps its line's customer */
    const [lines, studies, projects, jobLines, active] = await Promise.all([
      (await getDB()).getAll('workspaces'), Promise.all(ids.map(id => db.getStudy(id))).then(some), Promise.all(ids.map(id => db.getProject(id))).then(some),
      db.allPaceLines(), activeClientNow(),
    ]);
    return placePaper(ids, { lines, projects, jobLines, studies }, active.client, new URLSearchParams(hash.split('?')[1] ?? ''));
  } catch { return {}; }
}

/** Keep a PDF made on the page at `hash`. Resolves to the record; never throws. */
export async function keepPdf(blob: Blob, name: string, hash = typeof location !== 'undefined' ? location.hash : ''): Promise<KeptPdf | undefined> {
  try {
    const id = uid();
    const key = `kept-${id}`;
    await putBlob(key, blob);
    const page = pageOf(hash);
    const kind = paperKindOf(page);
    const t = Date.now();
    const rec: KeptPaperRow = { id, key, name, at: t, size: blob.size, page, ids: idsIn(hash), ...(await placeOf(hash)), kind, audience: audienceOf(kind), updatedAt: t };
    await (await getDB()).put('kept_papers', rec);
    signalWrite();
    changed();
    return rec;
  } catch { return undefined; }
}

/** RENAME A COPY, OR SAY WHOM IT IS FOR — the same file; only its record changes. An old device-only copy is changed where it is. */
export async function patchKept(id: string, patch: { name?: string; audience?: PaperAudience }): Promise<void> {
  const clean = { ...(patch.name !== undefined && patch.name.trim() ? { name: patch.name.trim() } : {}), ...(patch.audience ? { audience: patch.audience } : {}) };
  if (!Object.keys(clean).length) return;
  const db = await getDB();
  const cur = await db.get('kept_papers', id);
  if (cur) {
    await db.put('kept_papers', { ...cur, ...clean, updatedAt: Date.now() });
    signalWrite();
    changed();
    return;
  }
  const old = await oldList();
  if (old.some(o => o.id === id) && clean.name) await saveOld(old.map(o => (o.id === id ? { ...o, name: clean.name as string } : o)));
}

/** TAKE A COPY OFF — the record goes (on every device, by its tombstone) and the PDF after a moment, unless it is put back: the
 *  answer is how to put it back (Undo). An old device-only copy goes as before. */
export async function dropKept(id: string): Promise<() => Promise<void>> {
  const db = await getDB();
  const row = await db.get('kept_papers', id);
  if (row) {
    await db.delete('kept_papers', id);
    await recordTombstones('kept_papers', [id]);
    changed();
    /* the file waits a while for an Undo; gone after it, unless the record came back */
    setTimeout(() => { void (async () => { if (!(await (await getDB()).get('kept_papers', id))) await deleteBlobs([row.key]); })().catch(() => undefined); }, 60_000);
    return async () => { await restoreRows('kept_papers', [row]); changed(); };
  }
  const all = await oldList();
  const gone = all.find(x => x.id === id);
  await saveOld(all.filter(x => x.id !== id));
  if (!gone) return async () => undefined;
  setTimeout(() => { void (async () => { if (!(await oldList()).some(o => o.id === id)) await deleteBlobs([gone.key]); })().catch(() => undefined); }, 60_000);
  return async () => { await saveOld([gone, ...(await oldList()).filter(o => o.id !== id)]); };
}

/* ------------------------------------------------------------------ the old copies, offered once ------ */

/** The copies kept on this device before the library, and whether the offer to move them in was said no to. */
export async function oldCopies(): Promise<{ count: number; declined: boolean }> {
  const db = await getDB();
  return { count: (await oldList()).length, declined: !!(await db.get('meta', DECLINED)) };
}

/** Yes — each old copy becomes a library row (the same file, the same id), placed by its page as a new paper is; the device list
 *  is emptied. */
export async function moveOldToLibrary(): Promise<number> {
  const old = await oldList();
  if (!old.length) return 0;
  const db = await getDB();
  for (const o of old) {
    const kind = paperKindOf(o.page);
    const rec: KeptPaperRow = { id: o.id, key: o.key, name: o.name, at: o.at, size: o.size, page: o.page, ids: o.ids ?? [], ...(await placeOf(o.page)), kind, audience: audienceOf(kind), updatedAt: Date.now() };
    await db.put('kept_papers', rec);
  }
  await db.put('meta', [], META);
  signalWrite();
  changed();
  return old.length;
}

/** No — they stay on this device, listed where they were made, and the library does not ask again. */
export async function declineOldCopies(): Promise<void> {
  await (await getDB()).put('meta', { at: Date.now() }, DECLINED);
  changed();
}

export const keptBlob = (k: Pick<KeptPdf, 'key'>): Promise<Blob | undefined> => getBlob(k.key);

/** What belongs on the page at `hash`: made on that very page, or — on a line's page — made on a page carrying the line's id. */
export function keptHere(all: readonly KeptPdf[], hash: string): KeptPdf[] {
  const page = pageOf(hash);
  const line = /^#\/lines\/([0-9a-f-]{36})$/i.exec(page)?.[1];
  return all.filter(x => x.page === page || (!!line && (x.ids.includes(line) || x.workspaceId === line)));
}

export const sizeWords = (n: number): string => (n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
