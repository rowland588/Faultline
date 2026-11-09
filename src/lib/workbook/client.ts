/* THE WORKBOOK, ASKED FROM THE APP (docs/WORKBOOKS.md): one background worker a tab reads and answers; in the tests (no workers) the same
 * code runs here on a store in memory. The capabilities and AI Mode call only this. */
import type { WorkbookProfile } from './read';
import type { Query, QueryResult, Filter } from './query';
import type { WorkerIn, WorkerOut } from './worker';

export type RowsQuery = { sheet: string; filters?: Filter[]; columns?: string[]; limit?: number };
export type RowsResult = { sheet: string; matched: number; columns: string[]; rows: { row: number; cells: Record<string, { value: number | string | boolean | null; ref: string }> }[] };
export type Progress = { stage: string; done: number; total: number };

export interface WorkbookBackend {
  read(id: string, name: string, file: File, onProgress?: (p: Progress) => void): Promise<WorkbookProfile>;
  stop(id: string): void;
  profile(id: string): Promise<WorkbookProfile>;
  query(id: string, q: Query): Promise<QueryResult>;
  rows(id: string, q: RowsQuery): Promise<RowsResult>;
}

/** The workbook's id: its name, size and when it was last changed — the same file attached twice is the same workbook. */
export function workbookId(f: { name: string; size: number; lastModified?: number }): string {
  let h = 0x811c9dc5;
  for (const c of `${f.name}|${f.size}|${f.lastModified ?? 0}`) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return `wb-${h.toString(36)}-${f.size.toString(36)}`;
}

/** A message to the worker, before its job number is put on. */
type JobMsg = WorkerIn extends infer U ? (U extends { job: number } ? Omit<U, 'job'> : never) : never;

class WorkerBackend implements WorkbookBackend {
  private w: Worker | null = null;
  private job = 0;
  private waits = new Map<number, { ok: (v: unknown) => void; no: (e: Error) => void; progress?: (p: Progress) => void }>();
  private worker(): Worker {
    if (this.w) return this.w;
    this.w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    this.w.onmessage = (e: MessageEvent<WorkerOut>) => {
      const m = e.data, wt = this.waits.get(m.job);
      if (!wt) return;
      if (m.t === 'progress') { wt.progress?.({ stage: m.stage, done: m.done, total: m.total }); return; }
      this.waits.delete(m.job);
      if (m.t === 'done') wt.ok(m.value); else wt.no(new Error(m.why));
    };
    this.w.onerror = e => { for (const [, wt] of this.waits) wt.no(new Error(e.message || 'The workbook reader stopped.')); this.waits.clear(); this.w = null; };
    return this.w;
  }
  private ask<T>(m: JobMsg, progress?: (p: Progress) => void, transfer?: Transferable[]): Promise<T> {
    const job = (this.job += 1);
    return new Promise<T>((ok, no) => { this.waits.set(job, { ok: v => ok(v as T), no, ...(progress ? { progress } : {}) }); this.worker().postMessage({ ...m, job } as WorkerIn, transfer ?? []); });
  }
  read(id: string, name: string, file: File, onProgress?: (p: Progress) => void): Promise<WorkbookProfile> { return this.ask({ t: 'read', id, name, file }, onProgress); }
  stop(id: string): void { this.w?.postMessage({ t: 'stop', id } satisfies WorkerIn); }
  profile(id: string): Promise<WorkbookProfile> { return this.ask({ t: 'profile', id }); }
  query(id: string, q: Query): Promise<QueryResult> { return this.ask({ t: 'query', id, q }); }
  rows(id: string, q: RowsQuery): Promise<RowsResult> { return this.ask({ t: 'rows', id, q }); }
}

let backend: WorkbookBackend | null = null;
/** The backend in use — the worker in a browser; the tests set their own. */
export function workbooks(): WorkbookBackend {
  if (!backend) {
    if (typeof Worker === 'undefined') throw new Error('Workbooks are read in a background worker, which this browser does not offer.');
    backend = new WorkerBackend();
  }
  return backend;
}
export function setWorkbookBackend(b: WorkbookBackend | null): void { backend = b; }

/** A backend that runs here, on stores in memory — for the tests, and the same code the worker runs. */
export async function directBackend(): Promise<WorkbookBackend> {
  const [{ readWorkbook }, { runQuery, sourceRows }, { MemoryStore, getJson }, { fromBlob }] = await Promise.all([import('./read'), import('./query'), import('./store'), import('./zip')]);
  const stores = new Map<string, InstanceType<typeof MemoryStore>>();
  const signals = new Map<string, { stopped: boolean }>();
  const prof = async (id: string): Promise<WorkbookProfile> => {
    const s = stores.get(id); const p = s ? await getJson<WorkbookProfile>(s, 'profile') : undefined;
    if (!s || !p) throw new Error('This workbook is not on this device — it was read on another one, or this device’s storage was cleared. Attach it again here.');
    return p;
  };
  return {
    async read(id, name, file, onProgress) { const s = new MemoryStore(); stores.set(id, s); const signal = { stopped: false }; signals.set(id, signal); return readWorkbook(fromBlob(file), s, { id, name, signal, ...(onProgress ? { onProgress } : {}) }); },
    stop(id) { const s = signals.get(id); if (s) s.stopped = true; },
    profile: prof,
    async query(id, q) { const p = await prof(id); return runQuery(stores.get(id) as InstanceType<typeof MemoryStore>, p, q); },
    async rows(id, q) { const p = await prof(id); return sourceRows(stores.get(id) as InstanceType<typeof MemoryStore>, p, q); },
  };
}
