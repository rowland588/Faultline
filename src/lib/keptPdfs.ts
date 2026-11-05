/* A PDF IS KEPT WHERE IT WAS MADE — Rowland, 5 November: "I get to do the report and it gives me the download, but I never actually have the report saved and
 * available in the app ... wherever I've done it, that's where the PDF is, rather than some page full of a library".
 *
 * Every PDF the app makes goes out through one door (lib/savePdf deliverBlob). On its way it is also kept: the bytes in the media store, a small record in the
 * device's meta store naming it, when it was made and the ADDRESS of the page it was made on. A page shows what was made on it under its Report ▾ — Saved copies —
 * to open, download or take off; a line's page also shows what was made on pages that carry its id. A copy is a snapshot of what was handed over: the page goes on
 * changing, the next paper is a new copy. Kept on THIS DEVICE (no cloud record yet — a table and its migration are the next step; the Line Talk document's own
 * copies, kept with its answer, do sync). Never in the way: a failure to keep never stops the download. */
import { getDB } from '../db/core';
import { putBlob, getBlob, deleteBlobs } from '../db/blobs';

export interface KeptPdf {
  id: string;
  /** The media store key of the bytes. */
  key: string;
  name: string;
  at: number;
  size: number;
  /** The page it was made on: its address without the query ("#/lines/ab12/report"). */
  page: string;
  /** Every id in that address (a line, a project, a record) — so a line's page can show what was made for it elsewhere. */
  ids: string[];
}

const META = 'keptPdfs';
const subs = new Set<() => void>();
export const onKeptChange = (f: () => void): (() => void) => { subs.add(f); return () => { subs.delete(f); }; };
const changed = (): void => { subs.forEach(f => { try { f(); } catch { /* a listener's problem */ } }); };

export async function listKept(): Promise<KeptPdf[]> {
  const v = await (await getDB()).get('meta', META);
  return Array.isArray(v) ? (v as KeptPdf[]).sort((a, b) => b.at - a.at) : [];
}
const save = async (xs: KeptPdf[]): Promise<void> => { await (await getDB()).put('meta', xs, META); changed(); };

/** An address without its query, and the ids in it. */
export const pageOf = (hash: string): string => hash.split('?')[0].replace(/\/+$/, '') || '#/';
export const idsIn = (hash: string): string[] => [...new Set(hash.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) ?? [])];

/** Keep a PDF made on the page at `hash`. Resolves to the record; never throws. */
export async function keepPdf(blob: Blob, name: string, hash = typeof location !== 'undefined' ? location.hash : ''): Promise<KeptPdf | undefined> {
  try {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const key = `kept-${id}`;
    await putBlob(key, blob);
    const rec: KeptPdf = { id, key, name, at: Date.now(), size: blob.size, page: pageOf(hash), ids: idsIn(hash) };
    await save([rec, ...(await listKept())]);
    return rec;
  } catch { return undefined; }
}

export async function dropKept(id: string): Promise<void> {
  const all = await listKept();
  const gone = all.find(x => x.id === id);
  await save(all.filter(x => x.id !== id));
  if (gone) await deleteBlobs([gone.key]);
}

export const keptBlob = (k: KeptPdf): Promise<Blob | undefined> => getBlob(k.key);

/** What belongs on the page at `hash`: made on that very page, or — on a line's page — made on a page carrying the line's id. */
export function keptHere(all: readonly KeptPdf[], hash: string): KeptPdf[] {
  const page = pageOf(hash);
  const line = /^#\/lines\/([0-9a-f-]{36})$/i.exec(page)?.[1];
  return all.filter(x => x.page === page || (!!line && x.ids.includes(line)));
}

export const sizeWords = (n: number): string => (n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
