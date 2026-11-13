/* WHERE A WORKBOOK'S CELLS ARE KEPT (docs/WORKBOOKS.md): column by column, in chunks of CHUNK rows — each chunk a byte of kind and a float
 * of value per cell — so a sheet of millions of rows is written as it is read and read back a chunk at a time, never whole. In the browser
 * it is the origin's private file storage (OPFS), on this device only; in the tests, memory. */

export const CHUNK = 32_768;

/** What a cell is. A text's value is its string id; a date's is milliseconds (UTC); an error's is its error id. */
export const Kind = { Blank: 0, Num: 1, Str: 2, Bool: 3, Err: 4, Date: 5 } as const;
export type KindCode = typeof Kind[keyof typeof Kind];

export interface WorkbookStore {
  put(key: string, data: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array | undefined>;
  remove(): Promise<void>;
}

export const putJson = (s: WorkbookStore, key: string, v: unknown): Promise<void> => s.put(key, new TextEncoder().encode(JSON.stringify(v)));
export async function getJson<T>(s: WorkbookStore, key: string): Promise<T | undefined> { const b = await s.get(key); return b ? JSON.parse(new TextDecoder().decode(b)) as T : undefined; }

/** One chunk of one column, packed: n (uint32), then n kinds, padding to 8, then n float64 values. */
export function packChunk(kinds: Int8Array, vals: Float64Array, n: number): Uint8Array {
  const pad = (4 + n + 7) & ~7;
  const out = new Uint8Array(pad + n * 8);
  new DataView(out.buffer).setUint32(0, n, true);
  out.set(new Uint8Array(kinds.buffer, kinds.byteOffset, n), 4);
  out.set(new Uint8Array(vals.buffer, vals.byteOffset, n * 8), pad);
  return out;
}
export function unpackChunk(b: Uint8Array): { n: number; kinds: Int8Array; vals: Float64Array } {
  const n = new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(0, true);
  const pad = (4 + n + 7) & ~7;
  const copy = b.byteOffset % 8 === 0 ? b : b.slice();
  return { n, kinds: new Int8Array(copy.buffer, copy.byteOffset + 4, n), vals: new Float64Array(copy.buffer, copy.byteOffset + pad, n) };
}

export const chunkKey = (sheet: number, col: number, chunk: number): string => `s${sheet}/c${col}/${chunk}`;
export const rowsKey = (sheet: number, chunk: number): string => `s${sheet}/rows/${chunk}`;

export class MemoryStore implements WorkbookStore {
  private m = new Map<string, Uint8Array>();
  async put(k: string, d: Uint8Array): Promise<void> { this.m.set(k, d); }
  async get(k: string): Promise<Uint8Array | undefined> { return this.m.get(k); }
  async remove(): Promise<void> { this.m.clear(); }
  bytes(): number { let n = 0; for (const v of this.m.values()) n += v.byteLength; return n; }
}

type Dir = FileSystemDirectoryHandle;
const PUT_STALL_MS = 60_000;
/** The browser's private file storage, under workbooks/<id>/ — keys with "/" become folders. */
export class OpfsStore implements WorkbookStore {
  constructor(private id: string) {}
  static available(): boolean { return typeof navigator !== 'undefined' && !!navigator.storage && typeof navigator.storage.getDirectory === 'function'; }
  private async dir(parts: string[], create: boolean): Promise<Dir | undefined> {
    let d: Dir = await navigator.storage.getDirectory();
    for (const p of ['workbooks', this.id, ...parts]) {
      try { d = await d.getDirectoryHandle(p, { create }); } catch { return undefined; }
    }
    return d;
  }
  /** A write the device's storage never answers (a private window keeps it in memory, and a very large workbook can fill it) fails in
   *  words after a minute, never hangs. */
  async put(key: string, data: Uint8Array): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stalled = new Promise<never>((_, no) => { timer = setTimeout(() => no(new Error('This device’s storage stopped answering. A private (incognito) window keeps it in memory, which a workbook this size can fill — open Faultline in a normal window and attach it again.')), PUT_STALL_MS); });
    try { await Promise.race([this.write(key, data), stalled]); } finally { clearTimeout(timer); }
  }
  private async write(key: string, data: Uint8Array): Promise<void> {
    const parts = key.split('/'), name = parts.pop() ?? key;
    const d = await this.dir(parts, true);
    if (!d) throw new Error('The device’s storage refused the workbook.');
    const fh = await d.getFileHandle(name, { create: true });
    const sync = (fh as unknown as { createSyncAccessHandle?: () => Promise<{ truncate(n: number): void; write(b: Uint8Array, o: { at: number }): number; flush(): void; close(): void }> }).createSyncAccessHandle;
    if (typeof sync === 'function') {
      const h = await sync.call(fh);
      try { h.truncate(0); h.write(data, { at: 0 }); h.flush(); } finally { h.close(); }
      return;
    }
    const w = await fh.createWritable();
    await w.write(data as unknown as ArrayBuffer);
    await w.close();
  }
  async get(key: string): Promise<Uint8Array | undefined> {
    const parts = key.split('/'), name = parts.pop() ?? key;
    const d = await this.dir(parts, false);
    if (!d) return undefined;
    try { const f = await (await d.getFileHandle(name)).getFile(); return new Uint8Array(await f.arrayBuffer()); } catch { return undefined; }
  }
  async remove(): Promise<void> {
    try { const root = await (await navigator.storage.getDirectory()).getDirectoryHandle('workbooks'); await root.removeEntry(this.id, { recursive: true }); } catch { /* not there */ }
  }
}
