/* THE WORKBOOK'S OWN THREAD (docs/WORKBOOKS.md): a workbook is read, and asked of, in a background worker so the conversation never waits
 * on it — the file read a slice at a time straight from the disk, the cells kept in the browser's private file storage on this device. */
import { fromBlob } from './zip';
import { readWorkbook, type WorkbookProfile } from './read';
import { runQuery, sourceRows, type Query, type Filter } from './query';
import { getJson, MemoryStore, OpfsStore, type WorkbookStore } from './store';
import { amendProfile, type Amend } from './amend';

export type WorkerIn =
  | { t: 'read'; job: number; id: string; name: string; file: File }
  | { t: 'stop'; id: string }
  | { t: 'profile'; job: number; id: string }
  | { t: 'query'; job: number; id: string; q: Query }
  | { t: 'rows'; job: number; id: string; q: { sheet: string; filters?: Filter[]; columns?: string[]; limit?: number } }
  | { t: 'amend'; job: number; id: string; a: Amend }
  | { t: 'forget'; job: number; id: string };
export type WorkerOut =
  | { t: 'progress'; job: number; stage: string; done: number; total: number }
  | { t: 'beat'; job: number }
  | { t: 'done'; job: number; value: unknown }
  | { t: 'fail'; job: number; why: string };

/* without the private file storage (an old browser), the cells are kept in this worker's memory for as long as the tab is open */
const memory = new Map<string, MemoryStore>();
const storeFor = (id: string): WorkbookStore => {
  if (OpfsStore.available()) return new OpfsStore(id);
  let m = memory.get(id); if (!m) { m = new MemoryStore(); memory.set(id, m); }
  return m;
};
const signals = new Map<string, { stopped: boolean }>();
const stores = new Map<string, WorkbookStore>();
const st = (id: string): WorkbookStore => { let s = stores.get(id); if (!s) { s = storeFor(id); stores.set(id, s); } return s; };
const profileOf = async (id: string): Promise<WorkbookProfile> => {
  const p = await getJson<WorkbookProfile>(st(id), 'profile');
  if (!p) throw new Error('This workbook is not on this device — it was read on another one, or this device’s storage was cleared. Attach it again here.');
  return p;
};

const post = (m: WorkerOut): void => (self as unknown as { postMessage(m: WorkerOut): void }).postMessage(m);

self.onmessage = async (e: MessageEvent<WorkerIn>) => {
  const m = e.data;
  if (m.t === 'stop') { const s = signals.get(m.id); if (s) s.stopped = true; return; }
  /* a beat every few seconds while any job runs, so the app can tell a slow read or question from one the browser has stopped */
  const beat = setInterval(() => post({ t: 'beat', job: m.job }), 5000);
  try {
    if (m.t === 'read') {
      const signal = { stopped: false };
      signals.set(m.id, signal);
      const store = st(m.id);
      await store.remove();
      let last = 0;
      const p = await readWorkbook(fromBlob(m.file), store, { id: m.id, name: m.name, signal, onProgress: x => { const now = Date.now(); if (now - last > 250) { last = now; post({ t: 'progress', job: m.job, ...x }); } } });
      signals.delete(m.id);
      post({ t: 'done', job: m.job, value: p });
    } else if (m.t === 'profile') post({ t: 'done', job: m.job, value: await profileOf(m.id) });
    else if (m.t === 'query') post({ t: 'done', job: m.job, value: await runQuery(st(m.id), await profileOf(m.id), m.q) });
    else if (m.t === 'rows') post({ t: 'done', job: m.job, value: await sourceRows(st(m.id), await profileOf(m.id), m.q) });
    else if (m.t === 'amend') post({ t: 'done', job: m.job, value: await amendProfile(st(m.id), await profileOf(m.id), m.a) });
    else if (m.t === 'forget') { await st(m.id).remove(); stores.delete(m.id); memory.delete(m.id); post({ t: 'done', job: m.job, value: true }); }
  } catch (err) {
    post({ t: 'fail', job: m.job, why: err instanceof Error ? err.message : String(err) });
  } finally { clearInterval(beat); }
};
