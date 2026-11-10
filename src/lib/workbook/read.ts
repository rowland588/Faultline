/* A WORKBOOK READ, AND WHAT IS IN IT (docs/WORKBOOKS.md). From a file of any size: its structure (sheets and their state, the date system,
 * defined names, tables), each sheet's rows streamed into the column store with its profile built as it goes (the header row found, each
 * column's type, blanks, errors, formulas and those Excel saved no value for, repeated rows, the same name written differently, hidden
 * columns, merged cells), the links between sheets, and what is in the file but is not read (pivot tables, external links, connections, a
 * data model, macros, charts) — listed, never silently ignored. Nothing is recalculated: a formula's value is the one Excel saved. */
import { zipIndex, entryText, entryString, ZipError, type ByteSource, type ZipEntry } from './zip';
import { SheetScanner, SharedStringsScanner, tagsOf, colName, cellRef, type RawRow, type RawCell } from './xml';
import { CHUNK, Kind, chunkKey, rowsKey, packChunk, putJson, type WorkbookStore } from './store';

export const PROFILE_VERSION = 1;

export type ColumnType = 'number' | 'text' | 'date' | 'yes/no' | 'mixed' | 'empty';
export interface ColumnProfile {
  slot: number; letter: string; name: string; named: boolean; type: ColumnType;
  counts: { number: number; text: number; date: number; bool: number; error: number; blank: number };
  min?: number; max?: number;
  distinct?: number; distinctCapped?: boolean; top?: [string, number][];
  formulas: number; formulasNoValue: number; formula?: string;
  errors?: Record<string, number>;
  hidden: boolean;
  /** The same text written more than one way ("Line 3" · "line 3 "), with how often each. */
  variants?: [string, number][][];
}
export interface SheetProfile {
  index: number; name: string; state: 'visible' | 'hidden' | 'veryHidden'; dimension?: string;
  headerRow: number; above: string[]; rows: number; blankRows: number; chunks: number;
  /** Of the blank rows, those holding only formulas that show nothing. */
  formulaRows?: number;
  /** A filter on the sheet (Excel's AutoFilter): the range it covers, the columns it filters on, and the data rows it hides. Every row
   *  carries "Shown by the filter" (yes/no), so a question can be asked of what the person was looking at or of every row. */
  filter?: { ref: string; on: string[]; hiddenRows: number };
  columns: ColumnProfile[]; hiddenColumns: string[]; merged: number;
  formulas: number; formulasNoValue: number; errors: number;
  duplicateRows: number; duplicatesChecked: number;
  refersTo: string[]; tables: string[];
  read: boolean; why?: string;
}
export interface WorkbookProfile {
  v: number; id: string; name: string; bytes: number; at: number; seconds: number;
  status: 'ready' | 'partial'; date1904: boolean; strings: number; stringChunks: number;
  sheets: SheetProfile[];
  names: { name: string; ref: string; sheet?: string; hidden: boolean }[];
  tables: { name: string; sheet: string; ref: string; columns: string[] }[];
  links: { a: string; b: string; column: string; shared: number; overlap: number }[];
  notRead: { what: string; detail: string }[];
}

export interface ReadOptions {
  id: string; name: string;
  onProgress?: (p: { stage: string; done: number; total: number }) => void;
  signal?: { stopped: boolean };
}

const DATE_FMT_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 30, 36, 45, 46, 47, 50, 57]);
const looksDated = (code: string): boolean => /[dmyhs]/i.test(code.replace(/\[[^\]]*\]/g, '').replace(/"[^"]*"/g, ''));

function dateStyles(xml: string): Set<number> {
  const out = new Set<number>();
  const custom = new Map<number, string>();
  for (const f of tagsOf(xml, 'numFmt')) custom.set(Number(f.attrs('numFmtId')), f.attrs('formatCode') ?? '');
  const xfs = tagsOf(xml, 'cellXfs')[0];
  if (!xfs) return out;
  tagsOf(xfs.inner, 'xf').forEach((xf, i) => {
    const id = Number(xf.attrs('numFmtId') ?? 0);
    if (DATE_FMT_IDS.has(id) || looksDated(custom.get(id) ?? '')) out.add(i);
  });
  return out;
}

/** A part path from a relationship target, relative to the folder of the part that names it. */
function resolve(from: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1);
  const parts = from.split('/').slice(0, -1);
  for (const t of target.split('/')) { if (t === '..') parts.pop(); else if (t !== '.') parts.push(t); }
  return parts.join('/');
}
const relsOf = (part: string): string => { const p = part.split('/'); const f = p.pop(); return [...p, '_rels', `${f}.rels`].join('/'); };

/** Every string the workbook holds: the shared strings first, then texts met elsewhere (formula results, inline text, errors), each once. */
export class StringTable {
  list: string[] = [];
  private extra = new Map<string, number>();
  shared = 0;
  pushShared(s: string): void { this.list.push(s); this.shared += 1; }
  id(s: string): number { let i = this.extra.get(s); if (i === undefined) { i = this.list.length; this.list.push(s); this.extra.set(s, i); } return i; }
}
export const STRING_CHUNK = 50_000;

const norm = (s: string): string => s.trim().replace(/\s+/g, ' ').toLowerCase();

/* a 53-bit hash of a row's cells, for repeated rows */
function hashRow(parts: number[]): number {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (const p of parts) {
    const lo = p | 0, hi = Math.floor(p / 4294967296) | 0;
    for (const x of [lo, hi]) { h1 = Math.imul(h1 ^ x, 2654435761); h2 = Math.imul(h2 ^ x, 1597334677); }
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

const DUP_CAP = 4_000_000, DISTINCT_CAP = 200_000;
const EXCEL_EPOCH = Date.UTC(1899, 11, 30), EPOCH_1904 = Date.UTC(1904, 0, 1);

interface Slot { col: number; name: string; named: boolean; kinds: Int8Array; vals: Float64Array; c: ColumnProfile['counts']; min: number; max: number; distinct: Map<number, number> | null; formulas: number; noValue: number; formula?: string; errors: Map<number, number> }

/** One sheet streamed into the store, its profile kept as it goes. */
class SheetBuilder {
  private head: RawRow[] = [];
  private header = -1;
  private slots = new Map<number, Slot>();
  private order: Slot[] = [];
  private rowNums = new Int32Array(CHUNK);
  private pos = 0;
  private chunk = 0;
  private pending: Promise<void>[] = [];
  private seen = new Set<number>();
  rows = 0; blankRows = 0; formulaRows = 0; dups = 0; dupChecked = 0; formulas = 0; noValue = 0; errors = 0;
  above: string[] = [];
  refersTo = new Set<string>();

  hiddenRows = 0;
  private shown?: Slot;
  get hasFilter(): boolean { return !!this.shown; }
  constructor(private sheet: number, private store: WorkbookStore, private strings: StringTable, private dates: Set<number>, private epoch: number, private filterRow?: number) {}

  private cellText(c: RawCell): string {
    if (c.t === 's') return this.strings.list[Number(c.v)] ?? '';
    if (c.t === 'inlineStr') return c.text ?? '';
    return c.v ?? '';
  }
  private isText = (c: RawCell): boolean => (c.t === 's' || c.t === 'inlineStr' || c.t === 'str') && this.cellText(c).trim() !== '';
  /* a cell holds something when it has a value — a formula showing nothing is saved by Excel as an empty value, and is nothing */
  private filled = (r: RawRow): RawCell[] => r.cells.filter(c => (c.v !== undefined && c.v !== '') || (c.text ?? '') !== '');

  private slot(col: number, name?: string): Slot {
    let s = this.slots.get(col);
    if (s) return s;
    s = { col, name: name ?? `Column ${colName(col)}`, named: !!name, kinds: new Int8Array(CHUNK), vals: new Float64Array(CHUNK), c: { number: 0, text: 0, date: 0, bool: 0, error: 0, blank: 0 }, min: Infinity, max: -Infinity, distinct: new Map(), formulas: 0, noValue: 0, errors: new Map() };
    this.slots.set(col, s); this.order.push(s);
    return s;
  }

  /** The header: of the opening rows that are mostly words, with at least two and a row of data after them, the one that names the
   *  most columns (the earliest of equals) — so a title row above the header ("HOUR BY HOUR — ARCHIVE", a note beside it) is said as
   *  what is above it, never taken for the header (10 November — a real workbook read with every column "Column B", "Column W"). */
  private decide(): void {
    const rows = this.head;
    let at = -1, most = 0;
    for (let i = 0; i < rows.length; i += 1) {
      const f = this.filled(rows[i]);
      if (f.length < 2) continue;
      const words = f.filter(this.isText).length;
      const next = rows[i + 1] ? this.filled(rows[i + 1]).length : 0;
      if (words / f.length >= 0.6 && next >= Math.max(1, Math.ceil(f.length / 2)) && words > most) { at = i; most = words; }
    }
    /* a filter on the sheet starts at its header: Excel's own word for which row names the columns */
    if (this.filterRow) { const fi = rows.findIndex(r => r.row === this.filterRow); if (fi >= 0 && this.filled(rows[fi]).length) at = fi; }
    const used = new Map<string, number>();
    if (at >= 0) {
      for (let i = 0; i < at; i += 1) { const t = this.filled(rows[i]).map(c => this.cellText(c).trim()).filter(Boolean).join(' · '); if (t) this.above.push(t.slice(0, 200)); }
      this.header = rows[at].row;
      for (const c of rows[at].cells) {
        let n = this.cellText(c).trim();
        if (!n) continue;
        const k = n.toLowerCase(); const seen = used.get(k) ?? 0; used.set(k, seen + 1);
        if (seen) n = `${n} (${seen + 1})`;
        this.slot(c.col, n);
      }
    } else this.header = 0;
    if (this.filterRow) this.shown = this.slot(16_383, 'Shown by the filter');
    for (const r of rows) if (r.row > this.header) this.data(r);
    this.head = [];
  }

  row(r: RawRow): void {
    if (this.header < 0) { if (this.filled(r).length || this.head.length) this.head.push(r); if (this.head.length >= 30) this.decide(); return; }
    this.data(r);
  }

  private data(r: RawRow): void {
    const cells = this.filled(r);
    const hasF = r.cells.some(c => c.hasF);
    /* a row whose cells hold nothing — formulas showing blank included (a template dragged to the foot of the sheet) — is not data */
    if (!cells.length) { this.blankRows += 1; if (hasF) this.formulaRows += 1; return; }
    const p = this.pos;
    this.rowNums[p] = r.row;
    const parts: number[] = [];
    for (const c of r.cells) {
      const s = this.slot(c.col);
      let kind: number = Kind.Blank, val = 0;
      if (c.hasF) {
        s.formulas += 1; this.formulas += 1;
        if (!s.formula && c.f) s.formula = c.f.slice(0, 160);
        if (c.f) for (const m of c.f.matchAll(/(?:'((?:[^']|'')+)'|([A-Za-z_][\w.]*))!/g)) this.refersTo.add((m[1] ?? m[2]).replace(/''/g, "'"));
        if (c.v === undefined) { s.noValue += 1; this.noValue += 1; }
      }
      if (c.t === 's' && c.v !== undefined) { kind = Kind.Str; val = Number(c.v); }
      else if (c.t === 'inlineStr') { if (c.text) { kind = Kind.Str; val = this.strings.id(c.text); } }
      else if (c.t === 'str') { if (c.v !== undefined && c.v !== '') { kind = Kind.Str; val = this.strings.id(c.v); } }
      else if (c.t === 'b') { if (c.v !== undefined) { kind = Kind.Bool; val = c.v === '1' ? 1 : 0; } }
      else if (c.t === 'e') { if (c.v !== undefined) { kind = Kind.Err; val = this.strings.id(c.v); } }
      else if (c.t === 'd') { const ms = Date.parse(c.v ?? ''); if (Number.isFinite(ms)) { kind = Kind.Date; val = ms; } }
      else if (c.v !== undefined && c.v !== '') {
        const n = Number(c.v);
        if (Number.isFinite(n)) { if (this.dates.has(c.s)) { kind = Kind.Date; val = Math.round(this.epoch + n * 86_400_000); } else { kind = Kind.Num; val = n; } }
        else { kind = Kind.Str; val = this.strings.id(c.v); }
      }
      if (kind === Kind.Blank) continue;
      s.kinds[p] = kind; s.vals[p] = val;
      parts.push(c.col, kind, val);
      if (kind === Kind.Num || kind === Kind.Date) { if (val < s.min) s.min = val; if (val > s.max) s.max = val; if (kind === Kind.Num) s.c.number += 1; else s.c.date += 1; }
      else if (kind === Kind.Str) { s.c.text += 1; const d = s.distinct; if (d) { const was = d.get(val); if (was !== undefined) d.set(val, was + 1); else if (d.size < DISTINCT_CAP) d.set(val, 1); else s.distinct = null; } }
      else if (kind === Kind.Bool) s.c.bool += 1;
      else { s.c.error += 1; this.errors += 1; s.errors.set(val, (s.errors.get(val) ?? 0) + 1); }
    }
    if (this.shown) {
      const sh = this.shown; sh.kinds[p] = Kind.Bool; sh.vals[p] = r.hidden ? 0 : 1; sh.c.bool += 1;
      if (r.hidden) this.hiddenRows += 1;
    }
    if (this.dupChecked < DUP_CAP && parts.length) {
      this.dupChecked += 1;
      const h = hashRow(parts);
      if (this.seen.has(h)) this.dups += 1; else this.seen.add(h);
    }
    this.rows += 1;
    this.pos += 1;
    if (this.pos === CHUNK) this.flush();
  }

  private flush(): void {
    const n = this.pos;
    if (!n) return;
    const k = this.chunk;
    this.pending.push(this.store.put(rowsKey(this.sheet, k), new Uint8Array(this.rowNums.slice(0, n).buffer)));
    for (const s of this.order) {
      let any = false;
      for (let i = 0; i < n; i += 1) if (s.kinds[i]) { any = true; break; }
      if (any) this.pending.push(this.store.put(chunkKey(this.sheet, s.col, k), packChunk(s.kinds, s.vals, n)));
      s.kinds.fill(0, 0, n); s.vals.fill(0, 0, n);
    }
    this.chunk += 1; this.pos = 0;
  }

  async drain(): Promise<void> { const p = this.pending; this.pending = []; await Promise.all(p); }

  async finish(): Promise<{ columns: ColumnProfile[]; chunks: number; headerRow: number }> {
    if (this.header < 0) this.decide();
    this.flush();
    await this.drain();
    const str = this.strings.list;
    const columns = this.order.slice().sort((a, b) => a.col - b.col).map((s): ColumnProfile => {
      s.c.blank = this.rows - (s.c.number + s.c.text + s.c.date + s.c.bool + s.c.error);
      const kinds: [ColumnType, number][] = [['number', s.c.number], ['text', s.c.text], ['date', s.c.date], ['yes/no', s.c.bool]];
      const filled = kinds.reduce((t, [, n]) => t + n, 0);
      kinds.sort((a, b) => b[1] - a[1]);
      const type: ColumnType = filled === 0 ? 'empty' : kinds[0][1] >= 0.9 * filled ? kinds[0][0] : 'mixed';
      const out: ColumnProfile = { slot: s.col, letter: colName(s.col), name: s.name, named: s.named, type, counts: s.c, formulas: s.formulas, formulasNoValue: s.noValue, hidden: false };
      if (s.min <= s.max) { out.min = s.min; out.max = s.max; }
      if (s.formula) out.formula = s.formula;
      if (s.errors.size) out.errors = Object.fromEntries([...s.errors].map(([id, n]) => [str[id] ?? '#?', n]));
      if (s.distinct) {
        out.distinct = s.distinct.size;
        out.top = [...s.distinct].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => [str[id] ?? '', n]);
        const by = new Map<string, [string, number][]>();
        for (const [id, n] of s.distinct) { const t = str[id] ?? ''; const k = norm(t); if (!k) continue; const g = by.get(k); if (g) g.push([t, n]); else by.set(k, [[t, n]]); }
        const variants = [...by.values()].filter(g => g.length > 1).sort((a, b) => b.reduce((t, x) => t + x[1], 0) - a.reduce((t, x) => t + x[1], 0)).slice(0, 5);
        if (variants.length) out.variants = variants;
      } else if (s.c.text) { out.distinctCapped = true; }
      return out;
    });
    return { columns, chunks: this.chunk, headerRow: this.header };
  }

  /** The distinct string ids of a text column, for the links between sheets. */
  distinctOf(col: number): Map<number, number> | null { return this.slots.get(col)?.distinct ?? null; }
}

/** Read a workbook into the store and say what is in it. Never throws for a damaged sheet: that sheet is said unread and the rest go on. */
export async function readWorkbook(src: ByteSource, store: WorkbookStore, opts: ReadOptions): Promise<WorkbookProfile> {
  const t0 = Date.now();
  const entries = await zipIndex(src);
  const by = new Map(entries.map(e => [e.name.replace(/^\//, ''), e]));
  const get = async (name: string): Promise<string | undefined> => { const e = by.get(name); return e ? entryString(src, e) : undefined; };
  if (!by.has('xl/workbook.xml')) {
    if (by.has('xl/workbook.bin')) throw new ZipError('This is a binary workbook (.xlsb). Save it as .xlsx in Excel and attach that.');
    throw new ZipError('This zip holds no Excel workbook.');
  }
  const wbXml = (await get('xl/workbook.xml')) ?? '';
  const wbRels = new Map(tagsOf((await get('xl/_rels/workbook.xml.rels')) ?? '', 'Relationship').map(r => [r.attrs('Id') ?? '', resolve('xl/workbook.xml', r.attrs('Target') ?? '')]));
  const pr = tagsOf(wbXml, 'workbookPr')[0];
  const date1904 = pr ? /^(1|true)$/.test(pr.attrs('date1904') ?? '') : false;
  const sheetTags = tagsOf(wbXml, 'sheet');
  const sheets = sheetTags.map((s, i) => ({ index: i, name: s.attrs('name') ?? `Sheet ${i + 1}`, state: (s.attrs('state') ?? 'visible') as SheetProfile['state'], part: wbRels.get(s.attrs('r:id') ?? '') ?? '' }));
  const names = tagsOf(wbXml, 'definedName').map(d => { const local = d.attrs('localSheetId'); return { name: d.attrs('name') ?? '', ref: d.inner.replace(/&amp;/g, '&').trim(), ...(local !== undefined ? { sheet: sheets[Number(local)]?.name } : {}), hidden: /^(1|true)$/.test(d.attrs('hidden') ?? '') }; }).filter(n => !n.name.startsWith('_xlnm._FilterDatabase'));
  const dates = dateStyles((await get('xl/styles.xml')) ?? '');
  /* each sheet's filter, as Excel names it in the workbook (_xlnm._FilterDatabase, one a sheet): its range, so its first row is the header */
  const filters = new Map<number, { ref: string; row: number }>();
  for (const d of tagsOf(wbXml, 'definedName')) {
    if (d.attrs('name') !== '_xlnm._FilterDatabase') continue;
    const local = Number(d.attrs('localSheetId')); const ref = d.inner.replace(/&amp;/g, '&').trim().replace(/^.*!/, '').replace(/\$/g, '');
    const m = /^[A-Z]+(\d+)/.exec(ref);
    if (Number.isInteger(local) && m) filters.set(local, { ref, row: Number(m[1]) });
  }

  /* what is in the file but is not read — said, never ignored */
  const notRead: WorkbookProfile['notRead'] = [];
  const count = (re: RegExp): ZipEntry[] => entries.filter(e => re.test(e.name));
  for (const e of count(/^xl\/pivotCache\/pivotCacheDefinition\d+\.xml$/)) {
    const x = await get(e.name); const src2 = x ? tagsOf(x, 'worksheetSource')[0] : undefined;
    notRead.push({ what: 'A pivot table’s cache', detail: `${e.name.split('/').pop()} — built from ${src2 ? `${src2.attrs('sheet') ?? src2.attrs('name') ?? '?'}${src2.attrs('ref') ? `!${src2.attrs('ref')}` : ''}` : 'a source not named in the file'}. Its summary is not read; ask the same question of its source data instead.` });
  }
  const pivots = count(/^xl\/pivotTables\/pivotTable\d+\.xml$/).length;
  if (pivots) notRead.push({ what: 'Pivot tables', detail: `${pivots} — their layouts are not read; their source data is.` });
  for (const e of count(/^xl\/externalLinks\/externalLink\d+\.xml$/)) {
    const rel = await get(relsOf(e.name)); const target = rel ? tagsOf(rel, 'Relationship')[0]?.attrs('Target') : undefined;
    notRead.push({ what: 'A link to another workbook', detail: `${target ?? 'a file not named'} — values from it are only what Excel saved here.` });
  }
  const conn = await get('xl/connections.xml');
  if (conn) for (const c of tagsOf(conn, 'connection')) notRead.push({ what: 'A data connection', detail: `${c.attrs('name') ?? 'unnamed'} — not refreshed or followed; only what Excel saved is read.` });
  if (count(/^xl\/model\//).length) notRead.push({ what: 'A data model (Power Pivot)', detail: 'Its tables are not read.' });
  if (by.has('xl/vbaProject.bin')) notRead.push({ what: 'Macros', detail: 'Not run and not read.' });
  const charts = count(/^xl\/charts\/chart\d+\.xml$/).length;
  if (charts) notRead.push({ what: 'Charts', detail: `${charts} — not read; their data is.` });
  const comments = count(/^xl\/(comments\d+|threadedComments\/threadedComment\d+)\.xml$/).length;
  if (comments) notRead.push({ what: 'Comments', detail: `${comments} part${comments === 1 ? '' : 's'} — not read.` });

  /* tables, by sheet */
  const tables: WorkbookProfile['tables'] = [];
  const sheetTables = new Map<number, string[]>();
  for (const s of sheets) {
    const rel = s.part ? await get(relsOf(s.part)) : undefined;
    if (!rel) continue;
    for (const r of tagsOf(rel, 'Relationship')) {
      if (!/\/table$/.test(r.attrs('Type') ?? '')) continue;
      const x = await get(resolve(s.part, r.attrs('Target') ?? ''));
      const t = x ? tagsOf(x, 'table')[0] : undefined;
      if (!t || !x) continue;
      const name = t.attrs('displayName') ?? t.attrs('name') ?? '';
      tables.push({ name, sheet: s.name, ref: t.attrs('ref') ?? '', columns: tagsOf(x, 'tableColumn').map(c => c.attrs('name') ?? '') });
      sheetTables.set(s.index, [...(sheetTables.get(s.index) ?? []), name]);
    }
  }

  /* progress over the big parts: the shared strings and the sheets */
  const sst = by.get('xl/sharedStrings.xml');
  const big = [sst, ...sheets.map(s => by.get(s.part))].filter((e): e is ZipEntry => !!e);
  const total = big.reduce((t, e) => t + e.compressed, 0) || 1;
  let before = 0;
  const strings = new StringTable();
  if (sst) {
    const sc = new SharedStringsScanner(s => strings.pushShared(s));
    for await (const t of entryText(src, sst, { signal: opts.signal, onRead: b => opts.onProgress?.({ stage: 'the shared text', done: before + b, total }) })) sc.feed(t);
    before += sst.compressed;
  }
  const epoch = date1904 ? EPOCH_1904 : EXCEL_EPOCH;
  const profiles: SheetProfile[] = [];
  const builders = new Map<number, SheetBuilder>();
  let partial = false;
  for (const s of sheets) {
    const e = by.get(s.part);
    const base: Omit<SheetProfile, 'headerRow' | 'above' | 'rows' | 'blankRows' | 'chunks' | 'columns' | 'formulas' | 'formulasNoValue' | 'errors' | 'duplicateRows' | 'duplicatesChecked' | 'refersTo' | 'read'> = { index: s.index, name: s.name, state: s.state, hiddenColumns: [], merged: 0, tables: sheetTables.get(s.index) ?? [] };
    const empty = { headerRow: 0, above: [], rows: 0, blankRows: 0, chunks: 0, columns: [], formulas: 0, formulasNoValue: 0, errors: 0, duplicateRows: 0, duplicatesChecked: 0, refersTo: [] };
    if (opts.signal?.stopped) { partial = true; profiles.push({ ...base, ...empty, read: false, why: 'Stopped before this sheet was read.' }); continue; }
    if (!e) { profiles.push({ ...base, ...empty, read: false, why: /chartsheet/.test(s.part) ? 'A chart sheet — it holds a chart, not cells.' : 'Its part is missing from the file.' }); continue; }
    const fl = filters.get(s.index);
    const b = new SheetBuilder(s.index, store, strings, dates, epoch, fl?.row);
    const sc = new SheetScanner(r => b.row(r));
    try {
      for await (const t of entryText(src, e, { signal: opts.signal, onRead: x => opts.onProgress?.({ stage: s.name, done: before + x, total }) })) { sc.feed(t); await b.drain(); }
      sc.end();
      const stopped = !!opts.signal?.stopped;
      const f = await b.finish();
      const hidden = new Set<number>();
      for (const c of tagsOf(sc.head, 'col')) if (/^(1|true)$/.test(c.attrs('hidden') ?? '')) for (let i = Number(c.attrs('min')) - 1; i < Number(c.attrs('max')) && i < 16_384; i += 1) hidden.add(i);
      for (const c of f.columns) c.hidden = hidden.has(c.slot);
      const dim = tagsOf(sc.head, 'dimension')[0]?.attrs('ref');
      /* the filter's own tag (after the rows) says which columns it filters on — by their place in its range */
      const af = tagsOf(sc.tail, 'autoFilter')[0];
      const afRef = af?.attrs('ref') ?? fl?.ref;
      const on = af && afRef ? tagsOf(sc.tail, 'filterColumn').map(c => { const slot = cellRef(afRef.split(':')[0]).col + Number(c.attrs('colId') ?? 0); return f.columns.find(x => x.slot === slot)?.name ?? colName(slot); }) : [];
      const filter = afRef && b.hasFilter ? { ref: afRef, on, hiddenRows: b.hiddenRows } : undefined;
      profiles.push({
        ...base, ...(dim ? { dimension: dim } : {}), headerRow: f.headerRow, above: b.above, rows: b.rows, blankRows: b.blankRows, ...(b.formulaRows ? { formulaRows: b.formulaRows } : {}), ...(filter ? { filter } : {}), chunks: f.chunks, columns: f.columns,
        hiddenColumns: [...hidden].sort((x, y) => x - y).slice(0, 50).map(colName), merged: tagsOf(sc.tail, 'mergeCell').length,
        formulas: b.formulas, formulasNoValue: b.noValue, errors: b.errors, duplicateRows: b.dups, duplicatesChecked: b.dupChecked,
        refersTo: [...b.refersTo].filter(n => n !== s.name).slice(0, 20), read: !stopped, ...(stopped ? { why: 'Stopped part way: only the rows before the stop are read.' } : {}),
      });
      if (stopped) partial = true;
      builders.set(s.index, b);
    } catch (err) {
      partial = true;
      profiles.push({ ...base, ...empty, read: false, why: `It could not be read: ${err instanceof Error ? err.message : String(err)}` });
    }
    before += e.compressed;
  }

  /* links: a text column of one sheet whose values are found in a column of the same name on another */
  const links: WorkbookProfile['links'] = [];
  for (let i = 0; i < profiles.length; i += 1) for (let j = i + 1; j < profiles.length; j += 1) {
    for (const a of profiles[i].columns) for (const c of profiles[j].columns) {
      if (a.type !== 'text' || c.type !== 'text' || norm(a.name) !== norm(c.name) || !a.named) continue;
      const da = builders.get(profiles[i].index)?.distinctOf(a.slot), db = builders.get(profiles[j].index)?.distinctOf(c.slot);
      if (!da || !db || !da.size || !db.size) continue;
      const [small, large] = da.size <= db.size ? [da, db] : [db, da];
      let shared = 0; for (const k of small.keys()) if (large.has(k)) shared += 1;
      const overlap = shared / small.size;
      if (overlap >= 0.5) links.push({ a: profiles[i].name, b: profiles[j].name, column: a.name, shared, overlap: Math.round(overlap * 1000) / 1000 });
    }
  }

  /* the strings kept in chunks */
  const stringChunks = Math.ceil(strings.list.length / STRING_CHUNK);
  for (let k = 0; k < stringChunks; k += 1) await putJson(store, `strings/${k}`, strings.list.slice(k * STRING_CHUNK, (k + 1) * STRING_CHUNK));
  const profile: WorkbookProfile = {
    v: PROFILE_VERSION, id: opts.id, name: opts.name, bytes: src.size, at: Date.now(), seconds: Math.round((Date.now() - t0) / 100) / 10,
    status: partial || opts.signal?.stopped ? 'partial' : 'ready', date1904, strings: strings.list.length, stringChunks,
    sheets: profiles, names, tables, links, notRead,
  };
  await putJson(store, 'profile', profile);
  return profile;
}

export { cellRef };
