/* A ZIP READ FROM ITS END, ONE PART AT A TIME (docs/WORKBOOKS.md). An .xlsx is a zip of XML parts. A workbook of hundreds of megabytes is
 * never read whole: the zip's end record (ZIP64 too — a part over 4 GB uncompressed) and its central directory are read from the end of the
 * file, then each part is inflated as a stream from its own slice of the file, a window at a time. The file is never in memory whole. */
import { Inflate } from 'fflate';

/** Bytes read from a file by range — a browser File, or a file on disk in the tests. */
export interface ByteSource { size: number; read(start: number, end: number): Promise<Uint8Array> }

export const fromBlob = (b: Blob): ByteSource => ({ size: b.size, read: async (s, e) => new Uint8Array(await b.slice(s, e).arrayBuffer()) });

export interface ZipEntry { name: string; method: number; compressed: number; size: number; offset: number }

export class ZipError extends Error {}

const u16 = (b: Uint8Array, o: number): number => b[o] | (b[o + 1] << 8);
const u32 = (b: Uint8Array, o: number): number => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16)) + b[o + 3] * 0x1000000;
const u64 = (b: Uint8Array, o: number): number => u32(b, o) + u32(b, o + 4) * 0x100000000;

/** The zip's central directory: every part's name, how it is packed, its sizes and where it starts. */
export async function zipIndex(src: ByteSource): Promise<ZipEntry[]> {
  if (src.size < 22) throw new ZipError('The file is too small to be a workbook.');
  const tailLen = Math.min(src.size, 65_557);
  const tail = await src.read(src.size - tailLen, src.size);
  let eocd = -1;
  for (let i = tail.length - 22; i >= 0; i -= 1) if (u32(tail, i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new ZipError('This is not a zip — an .xlsx workbook is one. It may be an old .xls, or damaged.');
  let entries = u16(tail, eocd + 10), cdSize = u32(tail, eocd + 12), cdOffset = u32(tail, eocd + 16);
  if (entries === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    const loc = eocd - 20;
    if (loc < 0 || u32(tail, loc) !== 0x07064b50) throw new ZipError('The workbook’s zip64 record is missing — the file may be cut short.');
    const z64At = u64(tail, loc + 8);
    const z = await src.read(z64At, z64At + 56);
    if (u32(z, 0) !== 0x06064b50) throw new ZipError('The workbook’s zip64 directory could not be read.');
    entries = u64(z, 32); cdSize = u64(z, 40); cdOffset = u64(z, 48);
  }
  if (cdOffset + cdSize > src.size) throw new ZipError('The file is cut short — part of the workbook is missing (an interrupted copy or download?).');
  const cd = await src.read(cdOffset, cdOffset + cdSize);
  const out: ZipEntry[] = [];
  const dec = new TextDecoder();
  let p = 0;
  for (let n = 0; n < entries && p + 46 <= cd.length; n += 1) {
    if (u32(cd, p) !== 0x02014b50) throw new ZipError('The workbook’s directory is damaged.');
    const method = u16(cd, p + 10);
    let compressed = u32(cd, p + 20), size = u32(cd, p + 24);
    const nameLen = u16(cd, p + 28), extraLen = u16(cd, p + 30), commentLen = u16(cd, p + 32);
    let offset = u32(cd, p + 42);
    const name = dec.decode(cd.subarray(p + 46, p + 46 + nameLen));
    let e = p + 46 + nameLen;
    const eEnd = e + extraLen;
    while (e + 4 <= eEnd) {
      const id = u16(cd, e), len = u16(cd, e + 2);
      if (id === 0x0001) {
        let q = e + 4;
        if (size === 0xffffffff) { size = u64(cd, q); q += 8; }
        if (compressed === 0xffffffff) { compressed = u64(cd, q); q += 8; }
        if (offset === 0xffffffff) { offset = u64(cd, q); }
      }
      e += 4 + len;
    }
    out.push({ name, method, compressed, size, offset });
    p = eEnd + commentLen;
  }
  return out;
}

/** Where a part's packed bytes begin (after its local header). */
async function dataStart(src: ByteSource, e: ZipEntry): Promise<number> {
  const h = await src.read(e.offset, e.offset + 30);
  if (u32(h, 0) !== 0x04034b50) throw new ZipError(`The workbook part ${e.name} is damaged.`);
  return e.offset + 30 + u16(h, 26) + u16(h, 28);
}

/** A part, inflated as it is read: its bytes handed on a window at a time, never whole. `onRead` hears the packed bytes read so far. */
export async function* entryChunks(src: ByteSource, e: ZipEntry, opts: { window?: number; onRead?: (bytes: number) => void; signal?: { stopped: boolean } } = {}): AsyncGenerator<Uint8Array> {
  if (e.method !== 0 && e.method !== 8) throw new ZipError(`The workbook part ${e.name} is packed in a way Faultline does not read (method ${e.method}).`);
  const start = await dataStart(src, e);
  const end = start + e.compressed;
  if (end > src.size) throw new ZipError('The file is cut short — part of the workbook is missing.');
  const win = opts.window ?? 4 * 1024 * 1024;
  let out: Uint8Array[] = [];
  const inf = e.method === 8 ? new Inflate(chunk => { out.push(chunk); }) : null;
  for (let at = start; at < end; at += win) {
    if (opts.signal?.stopped) return;
    const to = Math.min(end, at + win);
    const packed = await src.read(at, to);
    opts.onRead?.(to - start);
    if (inf) inf.push(packed, to === end); else out.push(packed);
    for (const c of out) yield c;
    out = [];
  }
  if (e.compressed === 0 && inf) inf.push(new Uint8Array(0), true);
  for (const c of out) yield c;
}

/** A part as text, streamed: decoded a window at a time (a character split across windows is kept whole). */
export async function* entryText(src: ByteSource, e: ZipEntry, opts: Parameters<typeof entryChunks>[2] = {}): AsyncGenerator<string> {
  const dec = new TextDecoder('utf-8');
  for await (const c of entryChunks(src, e, opts)) { const t = dec.decode(c, { stream: true }); if (t) yield t; }
  const last = dec.decode();
  if (last) yield last;
}

/** A small part whole (the workbook's index, its styles, a table) — refused over `max` characters. */
export async function entryString(src: ByteSource, e: ZipEntry, max = 64 * 1024 * 1024): Promise<string> {
  let s = '';
  for await (const t of entryText(src, e)) { s += t; if (s.length > max) throw new ZipError(`The workbook part ${e.name} is larger than expected.`); }
  return s;
}
