/* A WORKBOOK READ, AND WHAT IS IN IT (docs/WORKBOOKS.md). From a file of any size: its structure (sheets and their state, the date system,
 * defined names, tables), each sheet's rows streamed into the column store with its profile built as it goes (the header row found, each
 * column's type, blanks, errors, formulas and those Excel saved no value for, repeated rows, the same name written differently, hidden
 * columns, merged cells), the links between sheets, and what is in the file but is not read (pivot tables, external links, connections, a
 * data model, macros, charts) — listed, never silently ignored. Nothing is recalculated: a formula's value is the one Excel saved. */
import { zipIndex, entryText, entryString, ZipError, type ByteSource, type ZipEntry } from './zip';
import { SheetScanner, SharedStringsScanner, tagsOf, colName, cellRef, type RawRow, type RawCell } from './xml';
import { CHUNK, Kind, chunkKey, rowsKey, packChunk, unpackChunk, putJson, type WorkbookStore } from './store';
import { textNumber, textDate, isTotalLabel, DURATION } from './textCells';
import { normalise } from './shapes';
import { fillWords } from './colours';
import { criteriaOf } from './criteria';
import { weekOf, weekNames, type WorkWeek } from './week';

export const PROFILE_VERSION = 1;
/** Whole numbers kept a column, for the links between sheets. */
const NUM_CAP = 50_000;

export type ColumnType = 'number' | 'text' | 'date' | 'yes/no' | 'mixed' | 'empty';
export interface ColumnProfile {
  slot: number; letter: string; name: string; named: boolean; type: ColumnType;
  counts: { number: number; text: number; date: number; bool: number; error: number; blank: number };
  min?: number; max?: number;
  distinct?: number; distinctCapped?: boolean; top?: [string, number][];
  formulas: number; formulasNoValue: number; formula?: string;
  errors?: Record<string, number>;
  hidden: boolean;
  /** Every filled cell holds a different value (three or more) — the column names one thing a row, as a master list's product code does. */
  unique?: boolean;
  /** The same text written more than one way ("Line 3" · "line 3 "), with how often each. */
  variants?: [string, number][][];
  /** A column of numbers: its average and spread, how many different values it holds (when 20 or fewer), and whether it is whole numbers
   *  each once, running in step — a number that only counts the rows (a sample number), never a figure. */
  mean?: number; sd?: number; few?: number; seq?: boolean;
  /** Time lost or taken, kept in the workbook as a time ("0:45") — read as MINUTES. */
  duration?: boolean;
  /** Percentages, by the cells' own format — a rate, averaged and never added. */
  percent?: boolean;
  /** Numbers or dates the workbook TYPED AS WORDS ("45 min", "12/04/2026"), read as what they say: the unit most of them carry, and how
   *  many cells did not read and stay words. */
  typed?: { as: 'number' | 'date'; unit?: string; left: number };
  /** A name written once and left blank down its rows (or merged over them) — filled down; how many cells were filled. */
  filledDown?: number;
  /** Under two rows of headings: the group above ("Days") and the heading itself ("Packs"); the column is named by both. */
  group?: string; base?: string;
  /** In a table made from sheets: the column of the original sheet it was read from (lib/workbook/shapes). */
  origin?: string;
  /** A date column's dates by the day of the week they fall on (Sunday first) — a column that keeps to one day is a week column (lib/workbook/week). */
  weekdays?: number[];
  /** A column the reader made from the fills painted on the cells ("Row colour", "Colour of Status") — its values are colour words. */
  colour?: boolean;
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
  /** The columns of OTHER sheets this sheet's formulas draw on, most used first — `SUMIFS('RAW data'!$AB:$AB, …)` counts one for
   *  RAW data's column AB, said by its heading. Where a workbook's own reports get their numbers is the best sign of which column
   *  the business is run by (12 November — Rowland: "you can see the way everything flows towards it"). */
  drawsOn?: { sheet: string; column: string; formulas: number }[];
  /** The RULES this sheet's formulas sum other sheets under — a column held to a constant written in the formula (`…,Data!$E:$E,0)`),
   *  by the column's heading, with how many formulas do; and how many formulas sum each other sheet under any condition at all
   *  (lib/workbook/criteria). The rows a workbook's own reports leave out are read from these. */
  holds?: { sheet: string; column: string; op: 'eq' | 'ne'; value: string | number; formulas: number }[];
  sumsFrom?: { sheet: string; formulas: number }[];
  /** Rows that are the sheet's own adding-up ("Line 2 Total", "Grand Total") — left out of the rows, never counted twice. */
  totals?: { count: number; examples: string[] };
  /** A filled-in form: labels down one column, answers beside them — read as one record, not as a table. */
  form?: boolean;
  /** A second (third …) table on a sheet, under its own heading row: the sheet it is on, and the row its headings are on. */
  partOf?: string; fromRow?: number;
  /** A table the reader MADE from the sheets as written — a grid turned to rows, tabs read together, forms as a table: what it was made
   *  from and how, in words. Questions are asked of it; every reference still names the original sheet and cell (lib/workbook/shapes). */
  derived?: { how: 'unpivot' | 'stack' | 'forms'; from: string[]; said: string };
  /** The table this sheet's rows are read through — it is not offered as a table of its own. */
  readAs?: string;
  /** The first sheet row that is data, when the person said where the headings are (lib/workbook/amend) — rows above it are not asked. */
  dataFrom?: number;
  /** What the person said about this sheet's headings, in words, newest last — the reader's finding and their word kept apart. */
  amended?: string[];
  /** The colours painted on the cells by hand, each kept as a column of its own: its name, and how many cells of each colour. */
  colours?: { column: string; counts: [string, number][] }[];
  /** Colour rules on the sheet (conditional formatting) — their colours are not in the cells and are not read. */
  colourRules?: number;
  read: boolean; why?: string;
}
export interface WorkbookProfile {
  v: number; id: string; name: string; bytes: number; at: number; seconds: number;
  status: 'ready' | 'partial'; date1904: boolean; strings: number; stringChunks: number;
  sheets: SheetProfile[];
  names: { name: string; ref: string; sheet?: string; hidden: boolean }[];
  tables: { name: string; sheet: string; ref: string; columns: string[] }[];
  /** What the workbook's pivot tables add up, by the field's own name ("Sum of DIRECT VARIANCE" → DIRECT VARIANCE) and how many
   *  pivots do — their layouts are still not read. */
  pivotSums?: { field: string; pivots: number }[];
  /** Columns on two sheets holding the same values — found from the values, never from names or formulas: `column` on sheet a, `bColumn`
   *  on sheet b (the same when absent), the values shared, and the share of the smaller list found in the other. `key` is the sheet whose
   *  column lists each value once (a master list), when one does. */
  links: { a: string; b: string; column: string; bColumn?: string; shared: number; overlap: number; key?: string }[];
  notRead: { what: string; detail: string }[];
  /** The workbook's own week, when a date column keeps to one weekday — a question grouped by week follows it (lib/workbook/week). */
  week?: WorkWeek;
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

/** The cell styles that are TIMES (hours, minutes, seconds — no day or year), those that are ELAPSED times ([h]:mm), and those that are
 *  percentages. */
function timeStyles(xml: string): { times: Set<number>; elapsed: Set<number>; pcts: Set<number> } {
  const times = new Set<number>(), elapsed = new Set<number>(), pcts = new Set<number>();
  const custom = new Map<number, string>();
  for (const f of tagsOf(xml, 'numFmt')) custom.set(Number(f.attrs('numFmtId')), f.attrs('formatCode') ?? '');
  const xfs = tagsOf(xml, 'cellXfs')[0];
  if (!xfs) return { times, elapsed, pcts };
  tagsOf(xfs.inner, 'xf').forEach((xf, i) => {
    const id = Number(xf.attrs('numFmtId') ?? 0), code = custom.get(id) ?? '';
    const bare = code.replace(/"[^"]*"/g, '');
    if (id === 9 || id === 10 || /%/.test(bare)) pcts.add(i);
    if (/\[(h+|m+|s+)\]/i.test(bare) || id === 46) { times.add(i); elapsed.add(i); }
    else if ((id >= 18 && id <= 21) || id === 45 || id === 47 || (/[hs]/i.test(bare.replace(/\[[^\]]*\]/g, '')) && !/[dy]/i.test(bare.replace(/\[[^\]]*\]/g, '')))) times.add(i);
  });
  return { times, elapsed, pcts };
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
/** Where the columns the reader makes are kept: the filter's, the row's colour, and each column's colour above them. */
export const SHOWN_SLOT = 16_383, ROW_COLOUR_SLOT = 16_382, COLOUR_BASE = 16_384;
/** In a table made from sheets: the sheet each row came from (its index), and the column its figure came from. */
export const ORIGIN_SLOT = 16_381, ORIGIN_COL_SLOT = 16_380;
const EXCEL_EPOCH = Date.UTC(1899, 11, 30), EPOCH_1904 = Date.UTC(1904, 0, 1);

interface Slot { colour?: boolean; col: number; name: string; named: boolean; kinds: Int8Array; vals: Float64Array; c: ColumnProfile['counts']; min: number; max: number; distinct: Map<number, number> | null; nums: Set<number> | null; numRepeat: boolean; formulas: number; noValue: number; formula?: string; errors: Map<number, number>; wd?: number[];
  sum: number; sq: number; few: Set<number> | null; dur: number; pct: number; tnum: number; tdate: number; units: Map<string, number>; first: boolean; group?: string; base?: string; typed?: ColumnProfile['typed']; filledDown?: number }
/** What a builder is given beyond the sheet: the time and percentage styles, and where a second table on a sheet gets its number. */
export interface BuilderExtra { times?: Set<number>; elapsed?: Set<number>; pcts?: Set<number>; alloc?: () => number }
export type Built = { columns: ColumnProfile[]; chunks: number; headerRow: number }

/** One sheet streamed into the store, its profile kept as it goes. */
export class SheetBuilder {
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
  /** rows that are the sheet's own totals, left out; a filled-in form; a later table on the same sheet, and the rows held while one is suspected */
  totals = 0; totalEx: string[] = []; form = false; title = ''; fromRow = 0;
  child?: SheetBuilder;
  private wide = 0; private lastRow = 0; private pend: RawRow[] = [];
  private parsed = new Map<number, { n?: { value: number; unit: string; percent: boolean }; d?: number } | null>();
  above: string[] = [];
  refersTo = new Set<string>();
  /** sheet \u0000 column letter → the formulas here that draw on it */
  draws = new Map<string, number>();
  /** sheet \u0000 column letter \u0000 is/is not \u0000 the constant → the formulas here that hold that column to it; and sheet → the
   *  formulas here that sum it under a condition */
  holds = new Map<string, { sheet: string; letter: string; op: 'eq' | 'ne'; value: string | number; n: number }>();
  sums = new Map<string, number>();

  hiddenRows = 0;
  private shown?: Slot;
  get hasFilter(): boolean { return !!this.shown; }
  constructor(readonly sheet: number, private store: WorkbookStore, private strings: StringTable, private dates: Set<number>, private epoch: number, private filterRow?: number, private fills: Map<number, string> = new Map(), private x: BuilderExtra = {}) {}

  /** A table whose headings are GIVEN (one made from sheets): no heading row is looked for, no row is taken for a total. */
  preset(names: Map<number, string>): void { this.header = 0; for (const [col, name] of names) this.slot(col, name); }

  /** A colour written at this row into the column the reader keeps for it — made the first time that column is coloured. */
  private paint(slotNo: number, name: string, word: string, p: number): void {
    const s = this.slot(slotNo, name);
    s.colour = true;
    const id = this.strings.id(word);
    s.kinds[p] = Kind.Str; s.vals[p] = id; s.c.text += 1;
    if (s.distinct) s.distinct.set(id, (s.distinct.get(id) ?? 0) + 1);
  }

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
    s = { col, name: name ?? `Column ${colName(col)}`, named: !!name, kinds: new Int8Array(CHUNK), vals: new Float64Array(CHUNK), c: { number: 0, text: 0, date: 0, bool: 0, error: 0, blank: 0 }, min: Infinity, max: -Infinity, distinct: new Map(), nums: new Set(), numRepeat: false, formulas: 0, noValue: 0, errors: new Map(),
      sum: 0, sq: 0, few: new Set(), dur: 0, pct: 0, tnum: 0, tdate: 0, units: new Map(), first: false };
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
      /* TWO ROWS OF HEADINGS: the heading row repeats itself (Packs, Downtime, Packs, Downtime) and the row straight above names the
         groups (Days, Nights) — each column is named by both, and the group is kept so the sheet can be read as rows (lib/workbook/shapes) */
      const names = rows[at].cells.map(c => ({ col: c.col, n: this.cellText(c).trim() })).filter(x => x.n);
      const repeats = new Set(names.map(x => x.n.toLowerCase())).size < names.length;
      const up = at > 0 && rows[at - 1].row === rows[at].row - 1 ? this.filled(rows[at - 1]) : [];
      const groups = repeats && up.length >= 2 && up.length < names.length && up.every(this.isText) ? up.map(c => ({ col: c.col, g: this.cellText(c).trim() })).sort((a, b) => a.col - b.col) : [];
      const groupOf = (col: number): string | undefined => { let g: string | undefined; for (const x of groups) if (x.col <= col) g = x.g; return g; };
      const grouped = groups.length >= 2 && new Set(names.map(x => `${groupOf(x.col) ?? ''}\u0000${x.n}`.toLowerCase())).size === names.length;
      for (let i = 0; i < at - (grouped ? 1 : 0); i += 1) { const t = this.filled(rows[i]).map(c => this.cellText(c).trim()).filter(Boolean).join(' · '); if (t && this.above.length < 12) this.above.push(t.slice(0, 200)); }
      this.header = rows[at].row;
      for (const x of names) {
        const g = grouped ? groupOf(x.col) : undefined;
        let n = g ? `${g} · ${x.n}` : x.n;
        const k = n.toLowerCase(); const seen = used.get(k) ?? 0; used.set(k, seen + 1);
        if (seen) n = `${n} (${seen + 1})`;
        const sl = this.slot(x.col, n);
        if (g) { sl.group = g; sl.base = x.n; }
      }
    } else this.header = 0;
    /* A FORM: labels down one column, answers of mixed kinds beside them, and no row that names three columns or more. It has no heading
       row: every line of it is kept, and it is read as one record (firstLook) */
    if (!this.filterRow && most <= 2) {
      const pairs = rows.filter(r => { const f = this.filled(r); return f.length === 2 && this.isText(f[0]); });
      const widest = rows.filter(r => this.filled(r).length >= 3).length;
      const kinds = new Set(pairs.map(r => { const c = this.filled(r)[1]; return this.isText(c) ? 't' : this.dates.has(c.s) ? 'd' : 'n'; }));
      if (pairs.length >= 5 && widest <= pairs.length * 0.2 && kinds.size >= 2 && new Set(pairs.map(r => this.cellText(this.filled(r)[0]).trim().toLowerCase())).size >= pairs.length * 0.8) {
        this.form = true; this.header = 0; this.above = [];
        for (const sl of this.order) { sl.name = `Column ${colName(sl.col)}`; sl.named = false; sl.group = undefined; sl.base = undefined; }
      }
    }
    if (this.filterRow) this.shown = this.slot(SHOWN_SLOT, 'Shown by the filter');
    this.head = [];
    for (const r of rows) if (r.row > this.header) this.take(r);
  }

  /** A row of the sheet, in order. The heading row is looked for in the opening rows — thirty that hold two cells or more; lines of notes
   *  above the headings (one cell each) do not use them up. */
  row(r: RawRow): void {
    if (this.child) { this.child.row(r); return; }
    if (this.header < 0) {
      const n = this.filled(r).length;
      if (n || this.head.length) this.head.push(r);
      if (n >= 2) this.wide += 1;
      if (this.wide >= 30 || this.head.length >= 400) this.decide();
      return;
    }
    this.take(r);
  }

  /** A heading row of a NEW table: all words, two cells or more, and over at least one column that has held only numbers or dates. */
  private headerLike(r: RawRow): boolean {
    const f = this.filled(r);
    if (f.length < 2 || !f.every(this.isText)) return false;
    return f.some(c => { const sl = this.slots.get(c.col); return !!sl && sl.c.number + sl.c.date > 0 && sl.c.text === 0; });
  }
  /** A row after the headings. SEVERAL TABLES ON ONE SHEET: after a gap, a title (one cell of words) and then a heading row — or a
   *  heading row by itself — followed by a row of figures starts a table of its own; the rows from there go to it. */
  private take(r: RawRow): void {
    if (this.child) { this.child.row(r); return; }
    const cells = this.filled(r);
    if (!cells.length) { this.data(r); return; }
    const gap = r.row > this.lastRow + 1;
    if (this.pend.length) {
      const cand = this.pend[this.pend.length - 1], header = this.filled(cand).length >= 2;
      if (header && cells.length >= 2 && cells.some(c => !this.isText(c))) { this.spawn(r); return; }
      if (!header && this.headerLike(r)) { this.pend.push(r); this.lastRow = r.row; return; }
      const held = this.pend; this.pend = [];
      for (const h of held) this.data(h);
    }
    if (this.x.alloc && !this.form && this.header > 0 && this.rows > 0 && gap && ((cells.length === 1 && this.isText(cells[0]) && this.cellText(cells[0]).length <= 80) || this.headerLike(r))) { this.pend.push(r); this.lastRow = r.row; return; }
    this.lastRow = r.row;
    this.data(r);
  }
  private spawn(next: RawRow): void {
    const head = this.pend[this.pend.length - 1];
    const title = this.pend.length > 1 ? this.cellText(this.filled(this.pend[0])[0]).trim().slice(0, 60) : '';
    const child = new SheetBuilder((this.x.alloc as () => number)(), this.store, this.strings, this.dates, this.epoch, undefined, this.fills, this.x);
    child.title = title; child.fromRow = head.row;
    if (title) child.above.push(title);
    this.pend = []; this.child = child;
    child.row(head); child.row(next);
  }

  /** What a formula draws on: the sheets it names, the columns of them it adds up, and the constants it holds a column to. Read from
   *  every row of formulas — a total row left out of the data is still one of the sheet's report formulas. */
  private follow(f: string): void {
    for (const m of f.matchAll(/(?:'((?:[^']|'')+)'|([A-Za-z_][\w.]*))!/g)) this.refersTo.add((m[1] ?? m[2]).replace(/''/g, "'"));
    /* which COLUMNS of another sheet: 'Sheet'!$M:$M, Sheet!M2:M900, Sheet!M5 — a range more than six columns wide is a lookup
       table, not a figure being added up, and is left out; a column is counted once a formula */
    if (f.includes('!')) {
      const seen = new Set<string>();
      for (const m of f.matchAll(/(?:'((?:[^']|'')+)'|([A-Za-z_][\w.]*))!\$?([A-Z]{1,3})\$?\d*(?::\$?([A-Z]{1,3})\$?\d*)?/g)) {
        const sheet = (m[1] ?? m[2]).replace(/''/g, "'");
        const a = cellRef(`${m[3]}1`).col, b = m[4] ? cellRef(`${m[4]}1`).col : a;
        if (b - a > 5 || b < a) continue;
        for (let k = a; k <= b; k++) seen.add(`${sheet}\u0000${colName(k)}`);
      }
      for (const k of seen) this.draws.set(k, (this.draws.get(k) ?? 0) + 1);
      if (/IF|SUMPRODUCT/i.test(f)) {
        const k = criteriaOf(f);
        for (const sh of k.on) this.sums.set(sh, (this.sums.get(sh) ?? 0) + 1);
        for (const h of k.held) { const key = `${h.sheet}\u0000${h.letter}\u0000${h.op}\u0000${String(h.value).toLowerCase()}`; const was = this.holds.get(key); if (was) was.n += 1; else this.holds.set(key, { ...h, n: 1 }); }
      }
    }
  }

  private data(r: RawRow): void {
    const cells = this.filled(r);
    const hasF = r.cells.some(c => c.hasF);
    /* a row whose cells hold nothing — formulas showing blank included (a template dragged to the foot of the sheet) — is not data */
    if (!cells.length) { this.blankRows += 1; if (hasF) this.formulaRows += 1; return; }
    /* THE SHEET'S OWN TOTALS: a row labelled a total that holds a number is its adding-up, not a record — left out, never counted twice */
    if (this.header > 0 && !this.form && cells.length >= 2) {
      const lab = cells.find(c => this.isText(c) && isTotalLabel(this.cellText(c)));
      if (lab && cells.some(c => !this.isText(c) && c.t !== 'e' && c.t !== 'b')) {
        this.totals += 1; if (this.totalEx.length < 3) this.totalEx.push(this.cellText(lab).trim());
        for (const c of r.cells) if (c.hasF && c.f) this.follow(c.f);
        return;
      }
    }
    const p = this.pos;
    this.rowNums[p] = r.row;
    const parts: number[] = [];
    for (const c of r.cells) {
      const s = this.slot(c.col);
      let kind: number = Kind.Blank, val = 0;
      if (c.hasF) {
        s.formulas += 1; this.formulas += 1;
        if (!s.formula && c.f) s.formula = c.f.slice(0, 160);
        if (c.f) this.follow(c.f);
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
        if (Number.isFinite(n)) {
          /* a TIME that is time lost or taken (an elapsed format, or a heading that says so) is minutes to add up, not a date */
          if (this.x.times?.has(c.s) && (this.x.elapsed?.has(c.s) || (n < 1 && DURATION.test(s.name)))) { kind = Kind.Num; val = Math.round(n * 1440 * 1000) / 1000; s.dur += 1; }
          else if (this.dates.has(c.s)) { kind = Kind.Date; val = Math.round(this.epoch + n * 86_400_000); }
          else { kind = Kind.Num; val = n; if (this.x.pcts?.has(c.s)) s.pct += 1; }
        }
        else { kind = Kind.Str; val = this.strings.id(c.v); }
      }
      if (kind === Kind.Blank) continue;
      s.kinds[p] = kind; s.vals[p] = val;
      if (this.rows === 0) s.first = true;
      parts.push(c.col, kind, val);
      if (kind === Kind.Num || kind === Kind.Date) {
        if (val < s.min) s.min = val; if (val > s.max) s.max = val;
        if (kind === Kind.Num) {
          s.c.number += 1; s.sum += val; s.sq += val * val;
          if (s.few) { if (s.few.size <= 20) s.few.add(val); else s.few = null; }
          /* whole numbers kept (to a cap) — a product code written as a number is matched to another sheet's by its values */
          const ns = s.nums;
          if (ns) { if (!Number.isInteger(val)) s.nums = null; else if (ns.has(val)) s.numRepeat = true; else if (ns.size < NUM_CAP) ns.add(val); else s.nums = null; }
        } else { s.c.date += 1; const d = Math.floor(val / 86_400_000); (s.wd ??= [0, 0, 0, 0, 0, 0, 0])[(((d % 7) + 7) % 7 + 4) % 7] += 1; }
      }
      else if (kind === Kind.Str) {
        /* words that are really a number with its unit, or a date — counted, and the column read as that when nine in ten are */
        let pr = this.parsed.get(val);
        if (pr === undefined) { const t = this.strings.list[val] ?? ''; const ch = t.charCodeAt(0); const maybe = (ch >= 48 && ch <= 57) || ch === 163 || ch === 36 || ch === 8364 || ch === 45 || ch === 8722 || ch === 40 || ch === 32; const n = maybe ? textNumber(t) : null, d = n || !maybe ? null : textDate(t); pr = n ? { n } : d !== null ? { d } : null; if (this.parsed.size < 400_000) this.parsed.set(val, pr); }
        if (pr?.n) { s.tnum += 1; s.units.set(pr.n.unit, (s.units.get(pr.n.unit) ?? 0) + 1); } else if (pr?.d !== undefined) s.tdate += 1;
        s.c.text += 1; const d = s.distinct; if (d) { const was = d.get(val); if (was !== undefined) d.set(val, was + 1); else if (d.size < DISTINCT_CAP) d.set(val, 1); else s.distinct = null; } }
      else if (kind === Kind.Bool) s.c.bool += 1;
      else { s.c.error += 1; this.errors += 1; s.errors.set(val, (s.errors.get(val) ?? 0) + 1); }
    }
    /* THE COLOURS PAINTED BY HAND: a row whose cells all wear one fill is a coloured ROW ("Row colour"); otherwise each coloured cell
       is its column's ("Colour of <heading>") */
    if (this.fills.size) {
      let n = 0, first = '', same = true;
      for (const c of r.cells) { const w = this.fills.get(c.s); if (!w) continue; n += 1; if (!first) first = w; else if (w !== first) same = false; }
      if (n >= 2 && same && n >= r.cells.length * 0.6) this.paint(ROW_COLOUR_SLOT, 'Row colour', first, p);
      else if (n) for (const c of r.cells) { const w = this.fills.get(c.s); if (w) this.paint(COLOUR_BASE + c.col, `Colour of ${this.slot(c.col).name}`, w, p); }
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

  /** One column's cells, chunk by chunk, read back and written again as `fn` leaves them — its counts made again from what is written. */
  private async rewrite(s: Slot, fn: (kinds: Int8Array, vals: Float64Array, n: number) => void): Promise<void> {
    s.c = { number: 0, text: 0, date: 0, bool: 0, error: s.c.error, blank: 0 };
    s.min = Infinity; s.max = -Infinity; s.sum = 0; s.sq = 0; s.few = new Set(); s.wd = undefined; s.distinct = new Map(); s.nums = new Set(); s.numRepeat = false;
    for (let ch = 0; ch < this.chunk; ch += 1) {
      const rb = await this.store.get(rowsKey(this.sheet, ch));
      if (!rb) continue;
      const n = rb.byteLength / 4;
      const b = await this.store.get(chunkKey(this.sheet, s.col, ch));
      const u = b ? unpackChunk(b) : null;
      const kinds = new Int8Array(n), vals = new Float64Array(n);
      if (u) { kinds.set(u.kinds.subarray(0, n)); vals.set(u.vals.subarray(0, n)); }
      fn(kinds, vals, n);
      for (let i = 0; i < n; i += 1) {
        const k = kinds[i], v = vals[i];
        if (k === Kind.Num || k === Kind.Date) {
          if (v < s.min) s.min = v; if (v > s.max) s.max = v;
          if (k === Kind.Num) { s.c.number += 1; s.sum += v; s.sq += v * v; if (s.few) { if (s.few.size <= 20) s.few.add(v); else s.few = null; } const ns = s.nums; if (ns) { if (!Number.isInteger(v)) s.nums = null; else if (ns.has(v)) s.numRepeat = true; else if (ns.size < NUM_CAP) ns.add(v); else s.nums = null; } }
          else { s.c.date += 1; const d = Math.floor(v / 86_400_000); (s.wd ??= [0, 0, 0, 0, 0, 0, 0])[(((d % 7) + 7) % 7 + 4) % 7] += 1; }
        } else if (k === Kind.Str) { s.c.text += 1; const d = s.distinct; if (d) { const was = d.get(v); if (was !== undefined) d.set(v, was + 1); else if (d.size < DISTINCT_CAP) d.set(v, 1); else s.distinct = null; } }
        else if (k === Kind.Bool) s.c.bool += 1;
      }
      await this.store.put(chunkKey(this.sheet, s.col, ch), packChunk(kinds, vals, n));
    }
  }

  async finish(o: { mergedDown?: Set<number> } = {}): Promise<Built> {
    if (this.header < 0) this.decide();
    if (this.pend.length) { const held = this.pend; this.pend = []; for (const h of held) this.data(h); }
    this.flush();
    await this.drain();
    if (this.form && this.rows > 120) this.form = false;
    const real = this.order.filter(sl => !sl.colour && sl.col < ORIGIN_COL_SLOT);
    /* NUMBERS AND DATES TYPED AS WORDS: a column where nine in ten of its words read as a number with its unit, or as a date, is read
       as that; the cells that do not read stay words, and are counted */
    if (this.header > 0 || this.form === false) for (const sl of real) {
      if (sl.c.text < 3 || this.form) continue;
      const as = sl.tnum >= sl.c.text * 0.9 ? 'number' as const : sl.tdate >= sl.c.text * 0.9 ? 'date' as const : null;
      if (!as) continue;
      const unit = [...sl.units].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
      let left = 0, pct = 0, conv = 0;
      await this.rewrite(sl, (kinds, vals, n) => {
        for (let i = 0; i < n; i += 1) {
          if (kinds[i] !== Kind.Str) continue;
          const pr = this.parsed.get(vals[i]) ?? (() => { const t = this.strings.list[vals[i]] ?? ''; const nn = textNumber(t), d = nn ? null : textDate(t); return nn ? { n: nn } : d !== null ? { d } : null; })();
          if (as === 'number' && pr?.n) { kinds[i] = Kind.Num; vals[i] = pr.n.value; conv += 1; if (pr.n.percent) pct += 1; }
          else if (as === 'date' && pr?.d !== undefined) { kinds[i] = Kind.Date; vals[i] = pr.d; conv += 1; }
          else left += 1;
        }
      });
      sl.typed = { as, ...(as === 'number' && unit ? { unit } : {}), left };
      if (pct >= conv * 0.9 && conv) sl.pct = sl.c.number;
    }
    /* A NAME WRITTEN ONCE, THEN LEFT BLANK (or merged down its rows): the opening columns of a table where each name is written once
       with blanks under it are filled down, so every row carries its line, its product, its week */
    const firstNum = Math.min(Infinity, ...real.filter(sl => sl.c.number > 0).map(sl => sl.col));
    if (this.header > 0 && this.rows >= 4) for (const sl of real) {
      const blanks = this.rows - (sl.c.number + sl.c.text + sl.c.date + sl.c.bool + sl.c.error);
      const merged = !!o.mergedDown?.has(sl.col) && sl.c.text >= 1;
      const onceEach = sl.c.text >= 2 && sl.c.number === 0 && sl.c.date === 0 && !!sl.distinct && sl.distinct.size >= sl.c.text * 0.9 && sl.first && sl.col < firstNum && blanks >= this.rows * 0.4;
      if (!blanks || (!merged && !onceEach)) continue;
      let lk = Kind.Blank as number, lv = 0, filled = 0;
      await this.rewrite(sl, (kinds, vals, n) => {
        for (let i = 0; i < n; i += 1) { if (kinds[i] === Kind.Blank) { if (lk !== Kind.Blank) { kinds[i] = lk; vals[i] = lv; filled += 1; } } else { lk = kinds[i]; lv = vals[i]; } }
      });
      sl.filledDown = filled;
    }
    const str = this.strings.list;
    const columns = this.order.slice().sort((a, b) => a.col - b.col).map((s): ColumnProfile => {
      s.c.blank = this.rows - (s.c.number + s.c.text + s.c.date + s.c.bool + s.c.error);
      const kinds: [ColumnType, number][] = [['number', s.c.number], ['text', s.c.text], ['date', s.c.date], ['yes/no', s.c.bool]];
      const filled = kinds.reduce((t, [, n]) => t + n, 0);
      kinds.sort((a, b) => b[1] - a[1]);
      const type: ColumnType = filled === 0 ? 'empty' : kinds[0][1] >= 0.9 * filled ? kinds[0][0] : 'mixed';
      const out: ColumnProfile = { slot: s.col, letter: colName(s.col), name: s.name, named: s.named, type, counts: s.c, formulas: s.formulas, formulasNoValue: s.noValue, hidden: false, ...(s.colour ? { colour: true } : {}) };
      if (s.min <= s.max) { out.min = s.min; out.max = s.max; }
      if (s.wd && s.c.date) out.weekdays = s.wd;
      if (s.c.number) {
        const n = s.c.number, mean = s.sum / n;
        out.mean = Math.round(mean * 1e6) / 1e6; out.sd = Math.round(Math.sqrt(Math.max(0, s.sq / n - mean * mean)) * 1e6) / 1e6;
        if (s.few && s.few.size <= 20) out.few = s.few.size;
        if (s.nums && !s.numRepeat && n >= 3 && !s.c.text && s.max - s.min + 1 === n) out.seq = true;
        if (s.dur >= n * 0.9) out.duration = true;
        if (s.pct >= n * 0.9) out.percent = true;
      }
      if (s.typed) out.typed = s.typed;
      if (s.filledDown) out.filledDown = s.filledDown;
      if (s.group && s.base) { out.group = s.group; out.base = s.base; }
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
      const textOnce = s.distinct && s.c.text >= 3 && !s.c.number && s.distinct.size === s.c.text && !s.filledDown;
      const numOnce = s.nums && !s.numRepeat && s.c.number >= 3 && !s.c.text;
      if (textOnce || numOnce) out.unique = true;
      return out;
    })
      /* a colour column says something only when it tells rows apart: a fill on nearly every row (a styled column, a painted table)
         is decoration, and is not kept as a column */
      .filter(c => c.slot !== ORIGIN_SLOT && c.slot !== ORIGIN_COL_SLOT && (!c.colour || (c.counts.text >= 1 && (c.counts.text < this.rows * 0.95 || (c.distinct ?? 0) >= 2))));
    return { columns, chunks: this.chunk, headerRow: this.header };
  }

  /** The distinct string ids of a text column, for the links between sheets. */
  distinctOf(col: number): Map<number, number> | null { return this.slots.get(col)?.distinct ?? null; }
  /** A column's values as the words they are matched by — text as written (case and spacing aside), a whole number as its digits. */
  valuesOf(col: number, str: string[]): Set<string> | null {
    const sl = this.slots.get(col);
    if (!sl) return null;
    const out = new Set<string>();
    if (sl.c.text) { if (!sl.distinct) return null; for (const id of sl.distinct.keys()) { const t = norm(str[id] ?? ''); if (t) out.add(t); } }
    if (sl.c.number) { if (!sl.nums) return sl.c.text ? out : null; for (const v of sl.nums) out.add(String(v)); }
    return out.size ? out : null;
  }
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
  const stylesXml = (await get('xl/styles.xml')) ?? '';
  const dates = dateStyles(stylesXml);
  /* later tables on a sheet, and tables made from sheets, take the numbers after the sheets' own */
  let nextIndex = sheets.length;
  const extra: BuilderExtra = { ...timeStyles(stylesXml), alloc: () => { nextIndex += 1; return nextIndex - 1; } };
  const fills = fillWords(stylesXml, await get('xl/theme/theme1.xml'));
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
  const pivotFiles = count(/^xl\/pivotTables\/pivotTable\d+\.xml$/);
  const pivots = pivotFiles.length;
  if (pivots) notRead.push({ what: 'Pivot tables', detail: `${pivots} — their layouts are not read; their source data is.` });
  /* what each pivot adds up — the name of its data fields, the summary's word taken off ("Sum of X" → X) */
  const summed = new Map<string, number>();
  for (const e of pivotFiles.slice(0, 200)) {
    const x = await get(e.name);
    const fields = new Set((x ? tagsOf(x, 'dataField') : []).map(d => (d.attrs('name') ?? '').replace(/&amp;/g, '&').replace(/^(sum|count|average|max|min|product|stddev|var)\w* of /i, '').trim()).filter(Boolean));
    for (const f of fields) summed.set(f, (summed.get(f) ?? 0) + 1);
  }
  const pivotSums = [...summed].map(([field, n]) => ({ field, pivots: n })).sort((a, b) => b.pivots - a.pivots).slice(0, 60);
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
    const b = new SheetBuilder(s.index, store, strings, dates, epoch, fl?.row, fills, extra);
    const sc = new SheetScanner(r => b.row(r));
    try {
      for await (const t of entryText(src, e, { signal: opts.signal, onRead: x => opts.onProgress?.({ stage: s.name, done: before + x, total }) })) { sc.feed(t); await b.drain(); }
      sc.end();
      const stopped = !!opts.signal?.stopped;
      /* a cell merged DOWN a column: its name stands for every row it covers */
      const mergedDown = new Set<number>();
      for (const m of tagsOf(sc.tail, 'mergeCell')) { const [a, z] = (m.attrs('ref') ?? '').split(':'); if (!z) continue; const A = cellRef(a), Z = cellRef(z); if (A.col === Z.col && Z.row > A.row) mergedDown.add(A.col); }
      const f = await b.finish({ mergedDown });
      const hidden = new Set<number>();
      for (const c of tagsOf(sc.head, 'col')) if (/^(1|true)$/.test(c.attrs('hidden') ?? '')) for (let i = Number(c.attrs('min')) - 1; i < Number(c.attrs('max')) && i < 16_384; i += 1) hidden.add(i);
      for (const c of f.columns) c.hidden = hidden.has(c.slot);
      const dim = tagsOf(sc.head, 'dimension')[0]?.attrs('ref');
      /* the filter's own tag (after the rows) says which columns it filters on — by their place in its range */
      const af = tagsOf(sc.tail, 'autoFilter')[0];
      const afRef = af?.attrs('ref') ?? fl?.ref;
      const on = af && afRef ? tagsOf(sc.tail, 'filterColumn').map(c => { const slot = cellRef(afRef.split(':')[0]).col + Number(c.attrs('colId') ?? 0); return f.columns.find(x => x.slot === slot)?.name ?? colName(slot); }) : [];
      const filter = afRef && b.hasFilter ? { ref: afRef, on, hiddenRows: b.hiddenRows } : undefined;
      const colours = f.columns.filter(c => c.colour).map(c => ({ column: c.name, counts: (c.top ?? []).slice(0, 6) }));
      const colourRules = tagsOf(sc.tail, 'conditionalFormatting').length;
      profiles.push({
        ...base, ...(dim ? { dimension: dim } : {}), headerRow: f.headerRow, above: b.above, rows: b.rows, blankRows: b.blankRows, ...(b.formulaRows ? { formulaRows: b.formulaRows } : {}), ...(filter ? { filter } : {}), ...(colours.length ? { colours } : {}), ...(colourRules ? { colourRules } : {}), chunks: f.chunks, columns: f.columns,
        hiddenColumns: [...hidden].sort((x, y) => x - y).slice(0, 50).map(colName), merged: tagsOf(sc.tail, 'mergeCell').length,
        formulas: b.formulas, formulasNoValue: b.noValue, errors: b.errors, duplicateRows: b.dups, duplicatesChecked: b.dupChecked,
        refersTo: [...b.refersTo].filter(n => n !== s.name).slice(0, 20), read: !stopped, ...(stopped ? { why: 'Stopped part way: only the rows before the stop are read.' } : {}),
        ...(b.totals ? { totals: { count: b.totals, examples: b.totalEx } } : {}), ...(b.form ? { form: true } : {}),
      });
      if (stopped) partial = true;
      builders.set(s.index, b);
      /* SEVERAL TABLES ON ONE SHEET: each later one is a table of its own, named by the title above it */
      /* (a table may itself be followed by another, found only as it is finished — so they are walked, not listed) */
      for (let c = b.child, k = 0; c; c = c.child, k += 1) {
        const cf = await c.finish({ mergedDown });
        let name = `${s.name} › ${c.title || `table ${k + 2}`}`;
        for (let n = 2; profiles.some(x => x.name === name) || sheets.some(x => x.name === name); n += 1) name = `${s.name} › ${c.title || `table ${k + 2}`} (${n})`;
        profiles.push({ index: c.sheet, name, state: s.state, hiddenColumns: [], merged: 0, tables: [], headerRow: cf.headerRow, above: c.above, rows: c.rows, blankRows: c.blankRows, chunks: cf.chunks, columns: cf.columns,
          formulas: c.formulas, formulasNoValue: c.noValue, errors: c.errors, duplicateRows: c.dups, duplicatesChecked: c.dupChecked, refersTo: [], read: !stopped, partOf: s.name, fromRow: c.fromRow,
          ...(c.totals ? { totals: { count: c.totals, examples: c.totalEx } } : {}), ...(c.form ? { form: true } : {}) });
        builders.set(c.sheet, c);
      }
    } catch (err) {
      partial = true;
      profiles.push({ ...base, ...empty, read: false, why: `It could not be read: ${err instanceof Error ? err.message : String(err)}` });
    }
    before += e.compressed;
  }

  /* WHAT EACH SHEET DRAWS ON — the other sheets' columns its formulas use, by their headings (a letter no heading stands over is left
     as its letter); a sheet's formulas on itself are not counted */
  for (const pr of profiles) {
    const b = builders.get(pr.index);
    if (!b?.draws.size) continue;
    const rows = [...b.draws].map(([k, n]) => { const [sheet, letter] = k.split('\u0000'); return { sheet, letter, n }; })
      .filter(x => x.sheet !== pr.name && profiles.some(o => o.name === x.sheet))
      .map(x => ({ sheet: x.sheet, column: profiles.find(o => o.name === x.sheet)?.columns.find(c => c.letter === x.letter)?.name ?? `Column ${x.letter}`, formulas: x.n }))
      .sort((x, y) => y.formulas - x.formulas).slice(0, 60);
    if (rows.length) pr.drawsOn = rows;
  }
  /* THE RULES ITS FORMULAS SUM UNDER — the columns of other sheets held to a constant, by their headings */
  for (const pr of profiles) {
    const b = builders.get(pr.index);
    if (!b?.sums.size) continue;
    const there = (name: string) => profiles.find(o => o.name === name);
    const holds = [...b.holds.values()].filter(h => h.sheet !== pr.name && there(h.sheet))
      .map(h => ({ sheet: h.sheet, column: there(h.sheet)?.columns.find(c => c.letter === h.letter)?.name ?? `Column ${h.letter}`, op: h.op, value: h.value, formulas: h.n }))
      .sort((x, y) => y.formulas - x.formulas).slice(0, 40);
    const sumsFrom = [...b.sums].filter(([sh]) => sh !== pr.name && there(sh)).map(([sheet, formulas]) => ({ sheet, formulas })).sort((x, y) => y.formulas - x.formulas).slice(0, 20);
    if (holds.length) pr.holds = holds;
    if (sumsFrom.length) pr.sumsFrom = sumsFrom;
  }

  /* LINKS — columns on two sheets holding the same things, found from their values, never from their names or formulas (10 November —
     Rowland: "Even if the sheets aren't linked … the product master is … the product costings and the product rates … It's understanding
     the connections between names of products, the costings"). A pair counts when at least three values are shared and half the smaller
     list is in the other, AND either the two columns have the same name or one of them lists each value once (a master list) — so a log's
     minutes never "link" to another sheet's head counts by chance. */
  const links: WorkbookProfile['links'] = [];
  const vals = new Map<string, Set<string> | null>();
  const valuesFor = (pi: number, c: ColumnProfile): Set<string> | null => {
    const k = `${pi}:${c.slot}`;
    if (!vals.has(k)) vals.set(k, c.type === 'text' || c.type === 'number' || c.type === 'mixed' ? builders.get(profiles[pi].index)?.valuesOf(c.slot, strings.list) ?? null : null);
    return vals.get(k) ?? null;
  };
  for (let i = 0; i < profiles.length; i += 1) for (let j = i + 1; j < profiles.length; j += 1) {
    for (const a of profiles[i].columns) for (const c of profiles[j].columns) {
      if (a.colour || c.colour) continue;
      const sameName = a.named && c.named && norm(a.name) === norm(c.name);
      if (!sameName && !a.unique && !c.unique) continue;
      const da = valuesFor(i, a), db = valuesFor(j, c);
      if (!da || !db || da.size < 3 || db.size < 3) continue;
      const [small, large] = da.size <= db.size ? [da, db] : [db, da];
      let shared = 0; for (const k of small) if (large.has(k)) shared += 1;
      const overlap = shared / small.size;
      if (shared < 3 || overlap < 0.5) continue;
      const key = a.unique && !c.unique ? profiles[i].name : c.unique && !a.unique ? profiles[j].name : undefined;
      links.push({ a: profiles[i].name, b: profiles[j].name, column: a.name, ...(norm(a.name) !== norm(c.name) ? { bColumn: c.name } : {}), shared, overlap: Math.round(overlap * 1000) / 1000, ...(key ? { key } : {}) });
    }
  }
  links.sort((x, y) => y.shared - x.shared);
  links.splice(40);

  /* THE SHAPES (lib/workbook/shapes): a grid turned to rows, the same table on many tabs read together, forms as a table — each a table
     made from the sheets as written, said in words; one failure here never loses the workbook */
  try {
    await normalise({ store, profiles, str: strings.list, id: t => strings.id(t), epoch, make: names => { const b = new SheetBuilder((extra.alloc as () => number)(), store, strings, dates, epoch); b.preset(names); return b; } });
  } catch (e) { console.warn('the workbook’s shapes could not be read', e); }

  /* the strings kept in chunks */
  const stringChunks = Math.ceil(strings.list.length / STRING_CHUNK);
  for (let k = 0; k < stringChunks; k += 1) await putJson(store, `strings/${k}`, strings.list.slice(k * STRING_CHUNK, (k + 1) * STRING_CHUNK));
  const profile: WorkbookProfile = {
    v: PROFILE_VERSION, id: opts.id, name: opts.name, bytes: src.size, at: Date.now(), seconds: Math.round((Date.now() - t0) / 100) / 10,
    status: partial || opts.signal?.stopped ? 'partial' : 'ready', date1904, strings: strings.list.length, stringChunks,
    sheets: profiles, names, tables, links, notRead, ...(pivotSums.length ? { pivotSums } : {}),
  };
  /* THE WORKBOOK'S OWN WEEK, and its names for its weeks (lib/workbook/week) — one failure here never loses the workbook */
  try {
    const week = weekOf(profiles);
    if (week) profile.week = { ...week, ...(await weekNames(store, profiles, week, strings.list, epoch)) };
  } catch (e) { console.warn('the workbook’s week could not be read', e); }
  await putJson(store, 'profile', profile);
  return profile;
}

export { cellRef };
