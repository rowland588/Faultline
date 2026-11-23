/* A QUESTION OF A WORKBOOK, WORKED OVER EVERY ROW (docs/WORKBOOKS.md). Filters, groups (and a date by day, week, month or year), sums,
 * counts, averages, minimums, maximums and distinct counts — read a chunk at a time from the store, so a sheet of millions of rows is never
 * in memory whole. Every answer carries the source rows it came from ("Downtime!F12"), and every value it could not use (a word in a column
 * being summed, a cell that is not a date in a column grouped by month) is counted and named — never dropped silently. The model asks the
 * question; this code answers it. */
import { CHUNK, Kind, chunkKey, rowsKey, unpackChunk, getJson, type WorkbookStore } from './store';
import { ORIGIN_SLOT, ORIGIN_COL_SLOT, type WorkbookProfile, type SheetProfile, type ColumnProfile } from './read';
import { colName } from './xml';
import { WEEKDAYS } from './week';
import { DeriveError, deriveInto, orderable, planDerive, type Derive, type Derived, type DerivePlan } from './derive';
import { PARTS_MAX, PARTS_HOW, PART_KINDS, PART_SAID, bucket, cmpGroupKeys, hasTime, partType, partValue, type Part } from './parts';
import { GroupsError, LIMIT_MAX, TOP_HOW, TOP_MAX, keepHaving, planHaving, rankPositions, topWithin, wholeBlocks, type Having, type HavingPlan, type Top } from './groups';
import type { LookupSides } from '../data/table';

export { bucket };

export type Op = 'eq' | 'ne' | 'in' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'contains' | 'blank' | 'notblank';
export interface Filter { column: string; op: Op; value?: string | number; values?: (string | number)[]; from?: string | number; to?: string | number }
export type Measure = { op: 'sum' | 'avg' | 'min' | 'max' | 'distinct'; column: string } | { op: 'count'; column?: string };
/** A value looked up on another sheet by what this row holds — "the product's £ per pack from PRODUCT MASTER": this sheet's `match`
 *  column found in that sheet's `on` column, its `take` column brought back as a column of this question, named `as`. */
export interface Lookup {
  as: string;
  /** Another sheet of this workbook (query_workbook; or the same workbook through query_data). */
  sheet?: string;
  /** Another source by its id — register file, `stops:<line>`, `production:all`, etc. (query_data, 22 November A4). */
  source?: string;
  /** This sheet's column(s) holding the key — and that sheet's column(s) it is found in, one for one. SEVERAL KEYS TOGETHER
   *  (22 November, docs/LUNA-ANALYSIS.md A1): a stop is tied to what was running only by its date, shift and line together. */
  match: string | string[]; on: string | string[];
  /** Parts of THAT sheet's date columns (lib/workbook/parts), each named `as` and then a name `on` may use — its log holds a start
   *  time, this sheet a day: `parts: [{ as: 'stop day', column: 'Start', part: 'day' }]`, `on: ['stop day', 'Line']`. */
  parts?: Part[];
  /** That sheet's column to bring back — or how its rows are BROUGHT TOGETHER for each key first (`sum`, `avg`, `min`, `max`,
   *  `count`), or `only`: the one value a key holds, left blank where it holds more than one. Grouped by its key before it is
   *  matched, the other sheet can never double a row of this one. */
  take: Take;
}
export type TakeOp = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'only';
export type Take = string | { op: TakeOp; column: string };
export const LOOKUP_KEYS = 3;
/** A sum worked on each row from two columns (or a column and a number) — "minutes × £ a minute" — named `as`. */
export interface Calc { as: string; a: string; op: '*' | '/' | '+' | '-'; b: string | number }
export interface Query {
  sheet: string;
  /** Parts of a date column — its weekday, hour, month, quarter — each a column of this question (lib/workbook/parts), worked
   *  first: a part may be grouped by, filtered on, or be a key a lookup is matched by. */
  parts?: Part[];
  /** Values from other sheets, worked next; then the row sums, in order (a sum may use a looked-up value or an earlier sum). */
  lookups?: Lookup[];
  calcs?: Calc[];
  filters?: Filter[];
  groupBy?: string[];
  time?: { column: string; by: 'day' | 'week' | 'month' | 'year' };
  measures: Measure[];
  /** Figures worked FROM the measures on every group and on the totals — a rate, a share, a change, a running total, a rank
   *  (lib/workbook/derive). They follow the measures in each group's values, and may be ordered by. */
  derive?: Derive[];
  /** Keep only the groups whose figure meets a condition — a measure or a derived figure (lib/workbook/groups). The totals stay
   *  those of every matched row. */
  having?: Having[];
  /** With two things grouped by: the n largest of the second within EACH value of the first, the rest of each brought together as
   *  one “(k others)” group (lib/workbook/groups). */
  top?: Top;
  order?: { by: 'group' | number; desc?: boolean };
  limit?: number;
}
export interface Group { key: string[]; values: (number | string | null)[]; rows: number; refs: string[] }
export interface QueryResult {
  sheet: string; rowsScanned: number; rowsMatched: number;
  groups: Group[]; groupsTotal: number; totals: (number | string | null)[];
  measures: string[]; groupBy: string[];
  skipped: { measure: string; count: number; refs: string[] }[];
  notes: string[];
  /** What each derived figure is — the last of `measures` are theirs, in order (lib/workbook/derive). Absent when none was asked. */
  derived?: Derived[];
  /** Asked with `top`: the groups are in BLOCKS — each value of the first key with its n largest and its “(k others)” (lib/workbook/groups). */
  top?: number;
  /** Asked with `having`: only the groups that met this are shown — the condition, in words. */
  only?: string;
}

export class QueryError extends Error {}

/** The workbook's strings, loaded once a store. */
const STRINGS = new WeakMap<WorkbookStore, Promise<string[]>>();
export function stringsOf(store: WorkbookStore, p: WorkbookProfile): Promise<string[]> {
  let s = STRINGS.get(store);
  if (!s) {
    s = (async () => { const out: string[] = []; for (let k = 0; k < p.stringChunks; k += 1) out.push(...((await getJson<string[]>(store, `strings/${k}`)) ?? [])); return out; })();
    STRINGS.set(store, s);
  }
  return s;
}

const norm = (s: string): string => s.trim().replace(/\s+/g, ' ').toLowerCase();

export function sheetOf(p: WorkbookProfile, name: string): SheetProfile {
  const s = p.sheets.find(x => x.name === name) ?? p.sheets.find(x => norm(x.name) === norm(name));
  if (!s) throw new QueryError(`No sheet “${name}” — the sheets are ${p.sheets.map(x => `“${x.name}”`).join(', ')}.`);
  if (!s.read && !s.rows) throw new QueryError(`The sheet “${s.name}” was not read: ${s.why ?? 'it holds no cells'}.`);
  return s;
}
export function columnOf(s: SheetProfile, name: string): ColumnProfile {
  const c = s.columns.find(x => x.name === name) ?? s.columns.find(x => norm(x.name) === norm(name)) ?? s.columns.find(x => x.letter === name.toUpperCase());
  if (!c) throw new QueryError(`No column “${name}” on “${s.name}” — its columns are ${s.columns.map(x => `“${x.name}”`).join(', ')}.`);
  return c;
}

const iso = (ms: number): string => { const d = new Date(ms); const t = d.toISOString(); return d.getUTCHours() || d.getUTCMinutes() || d.getUTCSeconds() ? t.slice(0, 16).replace('T', ' ') : t.slice(0, 10); };
/** A cell as words — a date as YYYY-MM-DD, yes/no, a number as it is. */
export function cellValue(kind: number, val: number, str: string[]): number | string | boolean | null {
  if (kind === Kind.Num) return val;
  if (kind === Kind.Str || kind === Kind.Err) return str[val] ?? '';
  if (kind === Kind.Date) return iso(val);
  if (kind === Kind.Bool) return val === 1;
  return null;
}

type Pred = (kind: number, val: number) => boolean;
/** The spellings a text filter matched FOR EACH VALUE IT ASKED FOR — said when one value took more than one, so "Line 3" taking
 *  "line 3 " in with it is never silent. (One set a wanted value: a filter on Tuesday OR Wednesday matches two words that are two
 *  things, and until 22 November that was said as "2 spellings … say if they are not the same thing".) */
type Spelled = { column: string; ids: Set<number>[] };
function predicate(f: Filter, c: ColumnProfile, str: string[], spelled?: Spelled[]): Pred {
  const asDate = (v: unknown): number => { const ms = Date.parse(String(v)); if (!Number.isFinite(ms)) throw new QueryError(`“${String(v)}” is not a date — give it as YYYY-MM-DD.`); return ms; };
  const dated = c.type === 'date';
  const num = (v: unknown): number => (dated ? asDate(v) : Number(v));
  if (f.op === 'blank') return k => k === Kind.Blank;
  if (f.op === 'notblank') return k => k !== Kind.Blank;
  const text = (k: number, v: number): string => (k === Kind.Str || k === Kind.Err ? norm(str[v] ?? '') : k === Kind.Num ? String(v) : k === Kind.Date ? iso(v) : k === Kind.Bool ? (v ? 'yes' : 'no') : '');
  if (f.op === 'eq' || f.op === 'ne' || f.op === 'in') {
    const want = (f.op === 'in' ? f.values ?? [] : [f.value]).map(v => norm(String(v ?? '')));
    const nums = want.map(w => (dated ? Date.parse(w) : Number(w)));
    const sp: Spelled = { column: c.name, ids: want.map(() => new Set<number>()) };
    if (f.op !== 'ne') spelled?.push(sp);
    const hit = (k: number, v: number): boolean => {
      if ((k === Kind.Num || k === Kind.Date) && nums.some(n => Number.isFinite(n) && (dated && k === Kind.Date ? iso(v).startsWith(iso(n)) : n === v))) return true;
      const wi = want.indexOf(text(k, v));
      if (wi < 0) return false;
      if (k === Kind.Str && sp.ids[wi].size < 20) sp.ids[wi].add(v);
      return true;
    };
    return f.op === 'ne' ? (k, v) => k !== Kind.Blank && !hit(k, v) : hit;
  }
  if (f.op === 'contains') { const w = norm(String(f.value ?? '')); return (k, v) => text(k, v).includes(w); }
  const isN = (k: number): boolean => k === Kind.Num || k === Kind.Date;
  if (f.op === 'between') { const a = num(f.from), b = num(f.to); const endB = dated && /^\d{4}-\d{2}-\d{2}$/.test(String(f.to)) ? b + 86_399_999 : b; return (k, v) => isN(k) && v >= a && v <= endB; }
  const x = num(f.value);
  if (!Number.isFinite(x)) throw new QueryError(`“${String(f.value)}” is not a number to compare “${c.name}” with.`);
  if (f.op === 'gt') return (k, v) => isN(k) && v > x;
  if (f.op === 'gte') return (k, v) => isN(k) && v >= x;
  if (f.op === 'lt') return (k, v) => isN(k) && v < x;
  return (k, v) => isN(k) && v <= x;
}

/** WHERE A CELL REALLY IS. A later table on a sheet names its sheet; a table MADE from sheets (lib/workbook/shapes) keeps, for each row,
 *  the sheet it came from and the column its figure came from — so an answer points at the original cell, never at a table that is not
 *  in the file. Nothing when the sheet is as written. */
function originOf(p: WorkbookProfile, s: SheetProfile): ((at: (slot: number) => { kinds: Int8Array; vals: Float64Array }, i: number, c: ColumnProfile | undefined, row: number) => string) | null {
  if (!s.derived) return null;
  const names = new Map(p.sheets.map(x => [x.index, x.partOf ?? x.name]));
  const forms = s.derived.how === 'forms';
  return (at, i, c, row) => {
    const os = at(ORIGIN_SLOT), oc = at(ORIGIN_COL_SLOT);
    const sheet = os.kinds[i] === Kind.Num ? names.get(os.vals[i]) ?? s.name : s.name;
    if (forms) return `${sheet} (form)`;
    const made = !!c && c.slot >= 16_000 && c.slot < ORIGIN_COL_SLOT;
    const letter = made ? (oc.kinds[i] === Kind.Num ? colName(oc.vals[i] + Math.max(0, (c as ColumnProfile).slot - 16_010)) : 'A') : c?.letter ?? 'A';
    return `${sheet}!${letter}${row}`;
  };
}

type Cols = Map<number, { kinds: Int8Array; vals: Float64Array }> & { blank: { kinds: Int8Array; vals: Float64Array } };
/** One chunk of the columns a question needs — a column with nothing in that chunk reads as blank. */
async function chunkCols(store: WorkbookStore, sheet: number, need: number[], ch: number, n: number): Promise<Cols> {
  const blank = { kinds: new Int8Array(n), vals: new Float64Array(n) };
  const cols = Object.assign(new Map<number, { kinds: Int8Array; vals: Float64Array }>(), { blank });
  for (const slot of need) { const b = await store.get(chunkKey(sheet, slot, ch)); cols.set(slot, b ? unpackChunk(b) : blank); }
  return cols;
}

interface Acc { key: string[]; rows: number; refs: (number | string)[]; sum: number[]; n: number[]; min: number[]; max: number[]; set: (Set<string> | null)[]; once?: Map<number, Set<string>> }
const DISTINCT_CAP = 100_000, GROUP_CAP = 50_000;

/** A value as the text a key is matched by — a product written "SKU 1024 ", 1024 or "sku 1024" on two sheets is matched by its words. */
const keyText = (k: number, v: number, str: string[]): string => (k === Kind.Str || k === Kind.Err ? norm(str[v] ?? '') : k === Kind.Num ? String(v) : k === Kind.Date ? iso(v) : k === Kind.Bool ? (v ? 'yes' : 'no') : '');

const listOf = (x: string | string[]): string[] => (Array.isArray(x) ? x : [x]);
const KEY_SEP = '\u0001';
/** One key of the sheet a lookup reads: a column of it, or a part of one of its dates — and how a cell of it is read as a key. */
interface OnKey { name: string; slot: number; text: (kind: number, val: number) => string }

/** The other sheet as a lookup table, read a chunk at a time: each key — one column, or several together — with the value to bring
 *  back. A plain `take` is the first row's value (and the keys that hold a different one further down are counted, as they always
 *  were); a `take` with an `op` BRINGS THE KEY'S ROWS TOGETHER FIRST, so however many rows of that sheet share a key, a row of the
 *  sheet being asked is matched to exactly one value. */
async function lookupTable(store: WorkbookStore, p: WorkbookProfile, l: Lookup, str: string[]): Promise<{ map: Map<string, [number, number]>; conflicts: number; many: number; sheet: SheetProfile; take: ColumnProfile; ons: OnKey[]; op?: TakeOp }> {
  const ls = sheetOf(p, l.sheet!);
  /* a key of that sheet is one of its columns — or a part of one of its dates, named in the lookup's own `parts` */
  if ((l.parts?.length ?? 0) > PARTS_MAX) throw new QueryError(`“${l.as}”: at most ${PARTS_MAX} parts. ${PARTS_HOW}`);
  const lparts = new Map((l.parts ?? []).map(pt => [norm(pt.as), pt]));
  const seen: { on: OnKey; hour: boolean; dated: number; timed: number }[] = [];
  const ons: OnKey[] = listOf(l.on).map(n => {
    const pt = lparts.get(norm(n));
    if (!pt) { const c = columnOf(ls, n); return { name: c.name, slot: c.slot, text: (k, v) => keyText(k, v, str) }; }
    if (!PART_KINDS.includes(pt.part)) throw new QueryError(`“${String(pt.part)}” is not a part of a date. ${PARTS_HOW}`);
    const src = columnOf(ls, pt.column);
    if (src.type !== 'date' && src.type !== 'mixed') throw new QueryError(`“${src.name}” on “${ls.name}” holds ${src.type === 'empty' ? 'nothing' : src.type}, not dates — a ${pt.part} cannot be taken from it.`);
    const type = partType(pt.part);
    const tally = { on: null as unknown as OnKey, hour: pt.part === 'hour', dated: 0, timed: 0 };
    const on: OnKey = { name: `the ${PART_SAID[pt.part]} of ${src.name}`, slot: src.slot, text: (k, v) => {
      if (k !== Kind.Date) return '';
      tally.dated += 1; if (hasTime(v)) tally.timed += 1;
      const x = partValue(v, pt.part, p.week);
      return type === 'date' ? iso(x as number) : type === 'number' ? String(x) : norm(x as string);
    } };
    tally.on = on; seen.push(tally);
    return on;
  });
  const op = typeof l.take === 'string' ? undefined : l.take.op;
  const take = columnOf(ls, typeof l.take === 'string' ? l.take : l.take.column);
  if (op && op !== 'count' && op !== 'only' && take.type !== 'number' && take.type !== 'mixed' && !((op === 'min' || op === 'max') && take.type === 'date')) throw new QueryError(`“${take.name}” on “${ls.name}” holds ${take.type === 'empty' ? 'nothing' : take.type}, not numbers — it cannot be brought together as a ${op}; take it as it is, or as “only”.`);
  const map = new Map<string, [number, number]>();
  interface Agg { sum: number; n: number; min: number; max: number; filled: number; first?: [number, number]; many: boolean }
  const aggs = new Map<string, Agg>();
  let conflicts = 0;
  for (let ch = 0; ch < ls.chunks; ch += 1) {
    const rb = await store.get(rowsKey(ls.index, ch));
    if (!rb) throw new QueryError(`Part of “${ls.name}” is missing from this device’s storage — attach the workbook again.`);
    const n = rb.byteLength / 4;
    const cols = await chunkCols(store, ls.index, [...ons.map(c => c.slot), take.slot], ch, n);
    const ks = ons.map(c => cols.get(c.slot) ?? cols.blank), b = cols.get(take.slot) ?? cols.blank;
    const lrows = ls.dataFrom ? new Int32Array(rb.buffer.slice(rb.byteOffset, rb.byteOffset + rb.byteLength)) : null;
    for (let i = 0; i < n; i += 1) {
      if (lrows && lrows[i] < (ls.dataFrom as number)) continue;
      const parts = ks.map((a, j) => ons[j].text(a.kinds[i], a.vals[i]));
      /* a row with any part of its key blank has no key */
      if (parts.some(x => !x)) continue;
      const k = parts.join(KEY_SEP);
      if (!op) {
        const was = map.get(k);
        if (!was) map.set(k, [b.kinds[i], b.vals[i]]);
        else if (was[0] !== b.kinds[i] || was[1] !== b.vals[i]) conflicts += 1;
        continue;
      }
      let a = aggs.get(k);
      if (!a) { a = { sum: 0, n: 0, min: Infinity, max: -Infinity, filled: 0, many: false }; aggs.set(k, a); }
      const kd = b.kinds[i], v = b.vals[i];
      if (kd === Kind.Blank) continue;
      a.filled += 1;
      if (!a.first) a.first = [kd, v]; else if (a.first[0] !== kd || a.first[1] !== v) a.many = true;
      if (kd === Kind.Num || (kd === Kind.Date && (op === 'min' || op === 'max'))) { a.sum += v; a.n += 1; if (v < a.min) a.min = v; if (v > a.max) a.max = v; }
    }
  }
  for (const t of seen) if (t.hour && t.dated > 1 && !t.timed) throw new QueryError(`“${l.as}”: ${t.on.name} on “${ls.name}” cannot be taken — every one of its dates is at midnight, with no time of day.`);
  let many = 0;
  if (op) for (const [k, a] of aggs) {
    const kind = take.type === 'date' && (op === 'min' || op === 'max') ? Kind.Date : Kind.Num;
    if (op === 'count') map.set(k, [Kind.Num, a.filled]);
    else if (op === 'only') { if (a.many) many += 1; else if (a.first) map.set(k, a.first); else map.set(k, [Kind.Blank, 0]); }
    else if (!a.n) map.set(k, [Kind.Blank, 0]);
    else map.set(k, [kind, op === 'sum' ? a.sum : op === 'avg' ? a.sum / a.n : op === 'min' ? a.min : a.max]);
    /* (a key that holds more than one different value under `only` is known — and deliberately brings nothing back) */
    if (op === 'only' && a.many) map.set(k, [Kind.Blank, 0]);
  }
  return { map, conflicts, many, sheet: ls, take, ons, ...(op ? { op } : {}) };
}

/** Run a question over every row of a sheet. `sides` holds datasets named in a lookup’s `source` (docs/LUNA-ANALYSIS.md A4). */
export async function runQuery(store: WorkbookStore, p: WorkbookProfile, q: Query, sides?: LookupSides): Promise<QueryResult> {
  const s = sheetOf(p, q.sheet);
  const shared = await stringsOf(store, p);
  /* the words this question makes itself (a month, a weekday) go on the end of a COPY of the workbook's strings — made once, before
     anything holds the list, and never the shared one */
  const str = q.parts?.length ? shared.slice() : shared;
  const made = new Map<string, number>();
  const intern = (w: string): number => { let i = made.get(w); if (i === undefined) { i = str.length; str.push(w); made.set(w, i); } return i; };
  const measures = q.measures.length ? q.measures : [{ op: 'count' as const }];
  const spelled: Spelled[] = [];
  /* the columns this question makes: each part of a date, each looked-up value and each row sum, a column of its own (a slot below
     zero). `after` is what a column has to say once every row has been read (how many had no date, how many keys were not found). */
  type Virtual = { col: ColumnProfile; fill: (at: (slot: number) => { kinds: Int8Array; vals: Float64Array }, n: number, rows: Int32Array) => { kinds: Int8Array; vals: Float64Array }; after?: () => string[] };
  const virtual: Virtual[] = [];
  const vnotes: string[] = [];
  const isData = (rows: Int32Array, i: number): boolean => !s.dataFrom || rows[i] >= s.dataFrom;
  const realNeed = new Set<number>();
  const own = (name: string): ColumnProfile => {
    const v = virtual.find(x => norm(x.col.name) === norm(name));
    if (v) return v.col;
    const c = columnOf(s, name);
    if (c.slot >= 0) realNeed.add(c.slot);
    return c;
  };
  const pseudo = (name: string, type: ColumnProfile['type'], letter: string, slot: number): ColumnProfile =>
    ({ slot, letter, name, named: true, type, counts: { number: 0, text: 0, date: 0, bool: 0, error: 0, blank: 0 }, formulas: 0, formulasNoValue: 0, hidden: false });
  /* THE PARTS OF A DATE (lib/workbook/parts — A2), worked first: a weekday, an hour, a quarter is then a column like any other */
  if ((q.parts?.length ?? 0) > PARTS_MAX) throw new QueryError(`At most ${PARTS_MAX} parts a question. ${PARTS_HOW}`);
  /* what has to be true of the rows once they are read — an hour is never said of dates that hold no time of day */
  const mustHold: (() => void)[] = [];
  for (const pt of q.parts ?? []) {
    if (!PART_KINDS.includes(pt.part)) throw new QueryError(`“${String(pt.part)}” is not a part of a date. ${PARTS_HOW}`);
    if (virtual.some(v => norm(v.col.name) === norm(pt.as)) || s.columns.some(c => norm(c.name) === norm(pt.as))) throw new QueryError(`“${pt.as}” is already a column — give the ${pt.part} another name.`);
    const src = columnOf(s, pt.column);
    if (src.type !== 'date' && src.type !== 'mixed') throw new QueryError(`“${src.name}” holds ${src.type === 'empty' ? 'nothing' : src.type}, not dates — a ${pt.part} cannot be taken from it.`);
    realNeed.add(src.slot);
    const type = partType(pt.part);
    const col = pseudo(pt.as, type, src.letter, -1 - virtual.length);
    let undated = 0, dated = 0, timed = 0;
    virtual.push({ col, fill: (at, n, rows) => {
      const a = at(src.slot); const kinds = new Int8Array(n), vals = new Float64Array(n);
      for (let i = 0; i < n; i += 1) {
        if (!isData(rows, i)) continue;
        if (a.kinds[i] !== Kind.Date) { undated += 1; continue; }
        dated += 1; if (hasTime(a.vals[i])) timed += 1;
        const v = partValue(a.vals[i], pt.part, p.week);
        if (type === 'date') { kinds[i] = Kind.Date; vals[i] = v as number; }
        else if (type === 'number') { kinds[i] = Kind.Num; vals[i] = v as number; }
        else { kinds[i] = Kind.Str; vals[i] = intern(v as string); }
      }
      return { kinds, vals };
    }, after: () => (undated ? [`${undated.toLocaleString('en-GB')} rows of “${s.name}” have no date in “${src.name}” — they have no “${pt.as}” (shown as “(blank)” where it is grouped by), and are never put with another.`] : []) });
    if (pt.part === 'hour') mustHold.push(() => { if (dated > 1 && !timed) throw new QueryError(`“${src.name}” on “${s.name}” holds days with no time of day — every one of its ${dated.toLocaleString('en-GB')} dates is at midnight — so an hour cannot be taken from it. If the time is kept in another column, take the hour from that one.`); });
    vnotes.push(`“${pt.as}” is the ${PART_SAID[pt.part]} of “${src.name}”, worked by the app on each row${pt.part === 'week' && p.week ? ' (the workbook’s own weeks)' : ''}.`);
    vnotes.push(`@after:${virtual.length - 1}`);
  }
  for (const l of q.lookups ?? []) {
    if (virtual.some(v => norm(v.col.name) === norm(l.as)) || s.columns.some(c => norm(c.name) === norm(l.as))) throw new QueryError(`“${l.as}” is already a column — give the looked-up value another name.`);
    const matchNames = listOf(l.match), onNames = listOf(l.on);
    if (!matchNames.length || matchNames.length > LOOKUP_KEYS || matchNames.length !== onNames.length) throw new QueryError(`“${l.as}”: match and on name the same columns one for one — one to ${LOOKUP_KEYS} of them (this sheet’s, then that sheet’s).`);
    if (!l.sheet && !l.source) throw new QueryError(`“${l.as}”: a lookup needs sheet or source.`);
    const matches = matchNames.map(n => own(n));
    if (l.source) {
      const { lookupSideKey } = await import('../data/lookup');
      const side = sides?.get(lookupSideKey(l)) ?? sides?.get(l.source);
      if (!side) throw new QueryError(`“${l.as}”: there is no “${l.source}” to look up — list_sources names it.`);
      const { lookupMapOf } = await import('../data/lookup');
      const ext = lookupMapOf(side, l);
      const col = pseudo(l.as, typeof [...ext.map.values()][0] === 'number' || ext.op ? 'number' : 'text', matches[0].letter, -1 - virtual.length);
      let missed = 0; const missing = new Set<string>();
      virtual.push({ col, fill: (at, n, rows) => {
        const srcs = matches.map(m => at(m.slot)); const kinds = new Int8Array(n), vals = new Float64Array(n);
        for (let i = 0; i < n; i += 1) {
          if (!isData(rows, i)) continue;
          const parts = srcs.map(src => keyText(src.kinds[i], src.vals[i], str));
          if (parts.some(x => !x)) continue;
          if (!ext.map.has(parts.join(KEY_SEP))) { missed += 1; if (missing.size < 5) missing.add(parts.map((_, j) => String(cellValue(srcs[j].kinds[i], srcs[j].vals[i], str))).join(' · ')); continue; }
          const hit = ext.map.get(parts.join(KEY_SEP))!;
          if (hit === null || hit === '') continue;
          if (typeof hit === 'number') { kinds[i] = Kind.Num; vals[i] = hit; }
          else if (typeof hit === 'boolean') { kinds[i] = Kind.Bool; vals[i] = hit ? 1 : 0; }
          else { kinds[i] = Kind.Str; vals[i] = intern(String(hit)); }
        }
        return { kinds, vals };
      }, after: () => (missed ? [`${missed.toLocaleString('en-GB')} rows had a value not found for “${col.name}” (e.g. ${[...missing].map(x => `“${x}”`).join(', ')}) — left blank, never guessed.`] : []) });
      const by = (cs: string[]) => cs.map(c => `“${c}”`).join(' + ');
      const HOW: Record<TakeOp, string> = { sum: 'the sum of', avg: 'the average of', min: 'the lowest', max: 'the highest', count: 'how many rows fill', only: 'the one value of' };
      vnotes.push(ext.op
        ? `“${l.as}” is ${HOW[ext.op]} “${ext.takeName}” on “${ext.sideName}” for each ${by(ext.onNames)} (${ext.map.size.toLocaleString('en-GB')} there), brought onto each row by its ${by(matchNames)} — that source is brought together by its key first, so no row here is counted twice.`
        : `“${l.as}” is “${ext.takeName}” from “${ext.sideName}”, found by ${by(matchNames)} in its ${by(ext.onNames)} (${ext.map.size.toLocaleString('en-GB')} there).`);
      if (ext.conflicts) vnotes.push(`“${ext.sideName}” lists ${ext.conflicts.toLocaleString('en-GB')} keys more than once with a different “${ext.takeName}” — the first is used.`);
      if (ext.many) vnotes.push(`${ext.many.toLocaleString('en-GB')} keys on “${ext.sideName}” hold more than one “${ext.takeName}” — left blank.`);
      vnotes.push(`@after:${virtual.length - 1}`);
      continue;
    }
    const t = await lookupTable(store, p, { ...l, sheet: l.sheet as string }, str);
    const brought = !!t.op && t.op !== 'only';
    const col = pseudo(l.as, brought ? (t.take.type === 'date' ? 'date' : 'number') : t.take.type, matches[0].letter, -1 - virtual.length);
    let missed = 0; const missing = new Set<string>();
    virtual.push({ col, fill: (at, n, rows) => {
      const srcs = matches.map(m => at(m.slot)); const kinds = new Int8Array(n), vals = new Float64Array(n);
      for (let i = 0; i < n; i += 1) {
        /* (a row above the headings the person named is not data: it is neither matched nor counted as not found) */
        if (!isData(rows, i)) continue;
        const parts = srcs.map(src => keyText(src.kinds[i], src.vals[i], str));
        if (parts.some(x => !x)) continue;
        const hit = t.map.get(parts.join(KEY_SEP));
        if (hit) { kinds[i] = hit[0]; vals[i] = hit[1]; } else { missed += 1; if (missing.size < 5) missing.add(srcs.map(src => String(cellValue(src.kinds[i], src.vals[i], str))).join(' · ')); }
      }
      return { kinds, vals };
    }, after: () => (missed ? [`${missed.toLocaleString('en-GB')} rows had a value not found for “${col.name}” (e.g. ${[...missing].map(x => `“${x}”`).join(', ')}) — left blank, never guessed.`] : []) });
    const by = (cs: { name: string }[]) => cs.map(c => `“${c.name}”`).join(' + ');
    const HOW: Record<TakeOp, string> = { sum: 'the sum of', avg: 'the average of', min: 'the lowest', max: 'the highest', count: 'how many rows fill', only: 'the one value of' };
    vnotes.push(t.op
      ? `“${l.as}” is ${HOW[t.op]} “${t.take.name}” on “${t.sheet.name}” for each ${by(t.ons)} (${t.map.size.toLocaleString('en-GB')} there), brought onto each row by its ${by(matches)} — that sheet is brought together by its key first, so no row here is counted twice.`
      : `“${l.as}” is “${t.take.name}” from “${t.sheet.name}”, found by ${by(matches)} in its ${by(t.ons)} (${t.map.size.toLocaleString('en-GB')} there).`);
    if (t.conflicts) vnotes.push(`“${t.sheet.name}” lists ${t.conflicts.toLocaleString('en-GB')} ${t.ons.map(c => c.name).join(' + ')} more than once with a different “${t.take.name}” — the first is used; say which is right if it matters.`);
    if (t.many) vnotes.push(`${t.many.toLocaleString('en-GB')} ${t.ons.map(c => c.name).join(' + ')} on “${t.sheet.name}” hold more than one different “${t.take.name}” — left blank for those rows, never the first taken.`);
    vnotes.push(`@after:${virtual.length - 1}`);
  }
  for (const c of q.calcs ?? []) {
    if (virtual.some(v => norm(v.col.name) === norm(c.as)) || s.columns.some(x => norm(x.name) === norm(c.as))) throw new QueryError(`“${c.as}” is already a column — give the sum another name.`);
    const a = own(c.a);
    const b = typeof c.b === 'number' ? null : own(c.b);
    for (const x of [a, b]) if (x && x.type !== 'number' && x.type !== 'mixed') throw new QueryError(`“${x.name}” holds ${x.type === 'empty' ? 'nothing' : x.type}, not numbers — it cannot be used in a sum.`);
    const col = pseudo(c.as, 'number', a.letter, -1 - virtual.length);
    const k = typeof c.b === 'number' ? c.b : 0;
    virtual.push({ col, fill: (at, n) => {
      const xa = at(a.slot), xb = b ? at(b.slot) : null; const kinds = new Int8Array(n), vals = new Float64Array(n);
      for (let i = 0; i < n; i += 1) {
        if (xa.kinds[i] !== Kind.Num || (xb && xb.kinds[i] !== Kind.Num)) continue;
        const u = xa.vals[i], w = xb ? xb.vals[i] : k;
        const r = c.op === '*' ? u * w : c.op === '/' ? (w === 0 ? NaN : u / w) : c.op === '+' ? u + w : u - w;
        if (Number.isFinite(r)) { kinds[i] = Kind.Num; vals[i] = r; }
      }
      return { kinds, vals };
    } });
    vnotes.push(`“${c.as}” is “${a.name}” ${c.op === '*' ? '×' : c.op === '/' ? '÷' : c.op} ${b ? `“${b.name}”` : String(c.b)}, worked on each row where both are numbers.`);
  }
  const col = (name: string): ColumnProfile => own(name);
  const filters = (q.filters ?? []).map(f => { const c = col(f.column); return { c, pred: predicate(f, c, str, spelled) }; });
  const groups = (q.groupBy ?? []).map(g => col(g));
  const time = q.time ? { c: col(q.time.column), by: q.time.by } : null;
  const mcols = measures.map(m => (m.column ? col(m.column) : null));
  const broughtForMeasure = measures.map((_m, j) => {
    const mc = mcols[j];
    if (!mc) return null;
    const lu = q.lookups?.find(l => norm(l.as) === norm(mc.name));
    if (!lu) return null;
    const op = typeof lu.take === 'string' ? undefined : lu.take.op;
    if (!op || op === 'only') return null;
    return listOf(lu.match).map(n => own(n));
  });
  const lookupOnce = (a: Acc, j: number, mk: string): boolean => {
    if (!a.once) a.once = new Map();
    let st = a.once.get(j);
    if (!st) { st = new Set(); a.once.set(j, st); }
    if (st.has(mk)) return true;
    st.add(mk);
    return false;
  };
  for (const [i, m] of measures.entries()) {
    const mc = mcols[i];
    if ((m.op === 'sum' || m.op === 'avg') && mc && mc.type !== 'number' && mc.type !== 'mixed') throw new QueryError(`“${mc.name}” holds ${mc.type === 'empty' ? 'nothing' : mc.type}, not numbers — it cannot be ${m.op === 'sum' ? 'added up' : 'averaged'}.`);
  }
  /* the figures to work from the measures, checked before a row is read — a question that cannot be worked is refused at once */
  const mName = (m: Measure, j: number): string => { const mc = mcols[j]; return mc ? `${m.op} of ${mc.name}` : 'rows'; };
  let plan: DerivePlan;
  try { plan = planDerive(q.derive, measures.map(mName)); } catch (e) { if (e instanceof DeriveError) throw new QueryError(e.message); throw e; }
  if (typeof q.order?.by === 'number') { const no = orderable(plan, q.order.by); if (no) throw new QueryError(no); }
  /* WHICH GROUPS ARE SHOWN (lib/workbook/groups — A6): a condition on a figure, and the top few within each group — checked before
     a row is read */
  const figureNames = [...measures.map(mName), ...plan.names];
  let hplan: HavingPlan[];
  try { hplan = planHaving(q.having, figureNames); } catch (e) { if (e instanceof GroupsError) throw new QueryError(e.message); throw e; }
  /* a figure that is a DATE (the first or the last of a date column) is not a number to set a condition on, or to take the largest by */
  const isDate = (at: number): boolean => at < measures.length && (measures[at].op === 'min' || measures[at].op === 'max') && mcols[at]?.type === 'date';
  for (const h of hplan) if (isDate(h.at)) throw new QueryError(`having: “${figureNames[h.at]}” is a date, not a number — a condition is set on a number.`);
  /* a condition on a figure worked ALONG THE ORDER (a running share — "the reasons that make up 80%") is looked at after the groups
     are in order and that figure is worked; the others before */
  const isLate = (at: number): boolean => at >= plan.base && !!plan.plans[at - plan.base]?.late;
  const hEarly = hplan.filter(h => !isLate(h.at)), hLate = hplan.filter(h => isLate(h.at));
  if (q.top) {
    const keys = groups.length + (time ? 1 : 0);
    if (keys !== 2) throw new QueryError(`top needs exactly two things grouped by — this question has ${keys}. ${TOP_HOW}`);
    if (!Number.isInteger(q.top.n) || q.top.n < 1 || q.top.n > TOP_MAX) throw new QueryError(TOP_HOW);
    if (hplan.length) throw new QueryError('top and having cannot be asked together — ask the top few of each, or the groups that meet the condition.');
    if (plan.plans.some(x => x.late)) throw new QueryError('A change or a running total follows the order of the groups, and with top the groups are in blocks — ask it without top.');
    const topBy = typeof q.order?.by === 'number' ? q.order.by : 0;
    if (isDate(topBy)) throw new QueryError(`top takes the largest by a number — “${figureNames[topBy]}” is a date. Order by a measure that is a number.`);
  }
  const origin = originOf(p, s), sheetSaid = s.partOf ?? s.name;
  const need = [...realNeed, ...(origin ? [ORIGIN_SLOT, ORIGIN_COL_SLOT] : [])];
  const refCol = mcols.find((c): c is ColumnProfile => !!c && c.slot >= 0) ?? mcols.find((c): c is ColumnProfile => !!c) ?? groups[0] ?? time?.c ?? s.columns[0];
  const acc = new Map<string, Acc>();
  const total: Acc = { key: [], rows: 0, refs: [], sum: measures.map(() => 0), n: measures.map(() => 0), min: measures.map(() => Infinity), max: measures.map(() => -Infinity), set: measures.map(m => (m.op === 'distinct' ? new Set() : null)) };
  const skipped = measures.map(() => ({ count: 0, refs: [] as (number | string)[] }));
  let timeSkipped = 0, scanned = 0, matched = 0, capped = false;
  const ref = (row: number | string, c: ColumnProfile): string => (typeof row === 'string' ? row : `${sheetSaid}!${c.letter}${row}`);
  const label = (k: number, v: number): string => (k === Kind.Blank ? '(blank)' : String(cellValue(k, v, str)));
  for (let ch = 0; ch < s.chunks; ch += 1) {
    const rb = await store.get(rowsKey(s.index, ch));
    if (!rb) throw new QueryError(`Part of “${s.name}” is missing from this device’s storage — attach the workbook again.`);
    const rows = new Int32Array(rb.buffer.slice(rb.byteOffset, rb.byteOffset + rb.byteLength));
    const cols = await chunkCols(store, s.index, need, ch, rows.length);
    const at = (slot: number) => cols.get(slot) ?? cols.blank;
    for (const v of virtual) cols.set(v.col.slot, v.fill(at, rows.length, rows));
    for (let i = 0; i < rows.length; i += 1) {
      if (s.dataFrom && rows[i] < s.dataFrom) continue;
      scanned += 1;
      let ok = true;
      for (const f of filters) { const col = at(f.c.slot); if (!f.pred(col.kinds[i], col.vals[i])) { ok = false; break; } }
      if (!ok) continue;
      const key: string[] = [];
      for (const g of groups) { const col = at(g.slot); key.push(label(col.kinds[i], col.vals[i])); }
      if (time) { const col = at(time.c.slot); if (col.kinds[i] !== Kind.Date) { timeSkipped += 1; continue; } key.push(bucket(col.vals[i], time.by, p.week)); }
      matched += 1;
      const k = key.join('\u0001');
      let a = acc.get(k);
      if (!a) {
        if (acc.size >= GROUP_CAP) { capped = true; continue; }
        a = { key, rows: 0, refs: [], sum: measures.map(() => 0), n: measures.map(() => 0), min: measures.map(() => Infinity), max: measures.map(() => -Infinity), set: measures.map(m => (m.op === 'distinct' ? new Set() : null)) };
        acc.set(k, a);
      }
      const ga: Acc = a;
      for (const t of [ga, total]) { t.rows += 1; if (t.refs.length < 3) t.refs.push(origin ? origin(at, i, refCol, rows[i]) : rows[i]); }
      measures.forEach((m, j) => {
        const c = mcols[j];
        if (!c) return;
        const col = at(c.slot); const kd = col.kinds[i], v = col.vals[i];
        if (m.op === 'count') { if (kd !== Kind.Blank) { ga.n[j] += 1; total.n[j] += 1; } return; }
        if (m.op === 'distinct') { if (kd === Kind.Blank) return; const lv = label(kd, v); for (const t of [ga, total]) { const st = t.set[j]; if (st && st.size < DISTINCT_CAP) st.add(lv); } return; }
        if (kd === Kind.Blank) return;
        const usable = m.op === 'min' || m.op === 'max' ? kd === Kind.Num || kd === Kind.Date : kd === Kind.Num;
        if (!usable) { skipped[j].count += 1; if (skipped[j].refs.length < 3) skipped[j].refs.push(origin ? origin(at, i, c, rows[i]) : rows[i]); return; }
        const matchCols = broughtForMeasure[j];
        const markDup = (acc: Acc) => {
          if (!matchCols || !(m.op === 'sum' || m.op === 'avg' || m.op === 'min' || m.op === 'max')) return false;
          const parts = matchCols.map(mc => keyText(at(mc.slot).kinds[i], at(mc.slot).vals[i], str));
          if (parts.some(x => !x)) return true;
          return lookupOnce(acc, j, parts.join(KEY_SEP));
        };
        if (markDup(ga)) return;
        ga.sum[j] += v; ga.n[j] += 1; if (v < ga.min[j]) ga.min[j] = v; if (v > ga.max[j]) ga.max[j] = v;
        if (!markDup(total)) { total.sum[j] += v; total.n[j] += 1; if (v < total.min[j]) total.min[j] = v; if (v > total.max[j]) total.max[j] = v; }
      });
    }
  }
  for (const check of mustHold) check();
  const round = (x: number): number => Math.round(x * 1e6) / 1e6;
  const valuesOf = (a: Acc): (number | string | null)[] => measures.map((m, j) => {
    const c = mcols[j];
    if (m.op === 'count') return c ? a.n[j] : a.rows;
    if (m.op === 'distinct') return a.set[j]?.size ?? 0;
    if (!a.n[j]) return null;
    if (m.op === 'sum') return round(a.sum[j]);
    if (m.op === 'avg') return round(a.sum[j] / a.n[j]);
    const x = m.op === 'min' ? a.min[j] : a.max[j];
    return c?.type === 'date' ? iso(x) : round(x);
  });
  const toGroup = (a: Acc, key: string[] = a.key): Group => ({ key, values: valuesOf(a), rows: a.rows, refs: a.refs.map(r => (typeof r === 'string' ? r : `${sheetSaid}!${refCol?.letter ?? 'A'}${r}`)) });
  /* several groups' running sums brought together exactly — for the “(others)” of a block, and a block's own whole (A6) */
  const mergeAcc = (as: Acc[]): Acc => {
    const m: Acc = { key: [], rows: 0, refs: [], sum: measures.map(() => 0), n: measures.map(() => 0), min: measures.map(() => Infinity), max: measures.map(() => -Infinity), set: measures.map(x => (x.op === 'distinct' ? new Set<string>() : null)) };
    for (const a of as) {
      m.rows += a.rows;
      for (const r of a.refs) if (m.refs.length < 3) m.refs.push(r);
      measures.forEach((_x, j) => {
        m.sum[j] += a.sum[j]; m.n[j] += a.n[j];
        if (a.min[j] < m.min[j]) m.min[j] = a.min[j];
        if (a.max[j] > m.max[j]) m.max[j] = a.max[j];
        const to = m.set[j], from = a.set[j];
        if (to && from) for (const v of from) { if (to.size >= DISTINCT_CAP) break; to.add(v); }
      });
    }
    return m;
  };
  const items = [...acc.values()].map(a => ({ a, g: toGroup(a) }));
  let list: Group[] = items.map(x => x.g);
  /* THE DERIVED FIGURES (lib/workbook/derive): worked on EVERY group and on the totals, before the cut — those that do not depend on
     the order first, so the groups may be ordered by one; then the ones worked along the order (a change, a running total) */
  const totals = valuesOf(total);
  deriveInto(plan, list, totals, 'early');
  const ord = q.order ?? (groups.length || time ? (time && !groups.length ? { by: 'group' as const } : { by: 0, desc: true }) : { by: 'group' as const });
  /* every group there is — before a condition takes some out of what is shown */
  const every = list.length;
  const had = keepHaving(hEarly, list);
  list = had.kept;
  let blocks: number[] | undefined, topNote: string | undefined;
  if (q.top) {
    const names = figureNames;
    const by = typeof ord.by === 'number' ? ord.by : 0, desc = ord.by === 'group' ? true : ord.desc !== false;
    const rankAt = rankPositions(plan.plans, plan.base);
    const t = topWithin(items, q.top.n, { by, desc, ...(ord.by === 'group' ? { blocksByLabel: ord.desc ? 'desc' as const : 'asc' as const } : {}) }, mergeAcc, toGroup, (others, wholes) => {
      deriveInto(plan, [...others, ...wholes], totals, 'early');
      /* (a rank is of the groups as they were asked for — the ones made here have none) */
      for (const g of [...others, ...wholes]) for (const at of rankAt) g.values[at] = null;
    });
    list = t.groups; blocks = t.blocks;
    const first = groups[0]?.name ?? '', second = groups[1]?.name ?? (time ? `${time.c.name} by ${time.by}` : '');
    topNote = t.others
      ? `Within each “${first}” the ${q.top.n} ${desc ? 'largest' : 'smallest'} “${second}” by “${names[by]}” are shown, and the rest of each are brought together as one “(… others)” group, worked from the rows — so every “${first}” is here, and its groups add back to its whole.`
      : `Within each “${first}” the ${q.top.n} ${desc ? 'largest' : 'smallest'} “${second}” by “${names[by]}” were asked for — none has more than ${q.top.n}, so every group is shown.`;
  } else list.sort((x, y) => {
    /* (a day of the week is put in the order of the week, never of the alphabet — lib/workbook/parts) */
    if (ord.by === 'group') return ord.desc ? cmpGroupKeys(y.key, x.key) : cmpGroupKeys(x.key, y.key);
    const a = x.values[ord.by], b = y.values[ord.by];
    const na = typeof a === 'number' ? a : -Infinity, nb = typeof b === 'number' ? b : -Infinity;
    return ord.desc === false ? na - nb : nb - na;
  });
  deriveInto(plan, list, totals, 'late');
  const hadLate = keepHaving(hLate, list);
  list = hadLate.kept;
  /* how many groups there are in all: every one a condition was asked of — or, with top, every row of every block */
  const groupsTotal = q.top ? list.length : every;
  /* the cut: so many groups — or, with top, so many of the FIRST thing grouped by, each with its top few whole, never part of one */
  const limit = Math.min(LIMIT_MAX, q.limit ?? 50);
  list = list.slice(0, blocks ? wholeBlocks(blocks.slice(0, limit), LIMIT_MAX) : limit);
  const notes: string[] = vnotes.flatMap(t => {
    const m = /^@after:(\d+)$/.exec(t);
    return m ? virtual[Number(m[1])].after?.() ?? [] : [t];
  });
  if (timeSkipped && time) notes.push(`${timeSkipped.toLocaleString('en-GB')} matching rows have no date in “${time.c.name}” and are left out of the ${time.by}s.`);
  if (time?.by === 'week' && p.week) notes.push(`Weeks are the workbook’s own — each ends on a ${WEEKDAYS[p.week.ends]} (read from ${p.week.from.slice(0, 2).map(f => `“${f.column}” on “${f.sheet}”`).join(' and ')})${p.week.names ? ', named as the workbook names them' : ''}.`);
  if (capped) notes.push(`More than ${GROUP_CAP.toLocaleString('en-GB')} groups — the rest were not counted; group by fewer columns.`);
  for (const [j, m] of measures.entries()) if (m.op === 'distinct' && (total.set[j]?.size ?? 0) >= DISTINCT_CAP) notes.push(`The distinct count of “${mcols[j]?.name ?? ''}” stops at ${DISTINCT_CAP.toLocaleString('en-GB')}.`);
  for (const sp of spelled) for (const ids of sp.ids) if (ids.size > 1) notes.push(`The filter on “${sp.column}” matched ${ids.size} spellings, taken together: ${[...ids].map(id => `“${str[id]}”`).join(', ')} — say if they are not the same thing.`);
  const fm = mcols.filter((c): c is ColumnProfile => !!c && c.slot >= 0 && c.formulas > 0);
  for (const c of fm) notes.push(`“${c.name}” is worked out by formulas in the workbook (${c.formulas.toLocaleString('en-GB')}) — the values used are the ones Excel saved${c.formulasNoValue ? `; ${c.formulasNoValue.toLocaleString('en-GB')} have no saved value and count as blank` : ''}.`);
  return {
    sheet: s.name, rowsScanned: scanned, rowsMatched: matched, groups: list, groupsTotal, totals,
    measures: [...measures.map(mName), ...plan.names], groupBy: [...groups.map(g => g.name), ...(time ? [`${time.c.name} by ${time.by}`] : [])],
    skipped: measures.map((m, j) => ({ measure: mName(m, j), count: skipped[j].count, refs: skipped[j].refs.map(r => { const mc = mcols[j]; return mc ? ref(r, mc) : `${sheetSaid} row ${r}`; }) })).filter(x => x.count),
    notes: [...notes, ...plan.notes, ...(had.note ? [had.note] : []), ...(hadLate.note ? [hadLate.note] : []), ...(topNote ? [topNote] : [])],
    ...(plan.derived.length ? { derived: plan.derived } : {}),
    ...(q.top ? { top: q.top.n } : {}),
    ...(had.said || hadLate.said ? { only: [had.said, hadLate.said].filter(Boolean).join(' and ') } : {}),
  };
}

/** The source rows behind a finding — each cell with its reference. */
export async function sourceRows(store: WorkbookStore, p: WorkbookProfile, q: { sheet: string; filters?: Filter[]; columns?: string[]; limit?: number }): Promise<{ sheet: string; matched: number; columns: string[]; rows: { row: number; cells: Record<string, { value: number | string | boolean | null; ref: string }> }[] }> {
  const s = sheetOf(p, q.sheet);
  const str = await stringsOf(store, p);
  const filters = (q.filters ?? []).map(f => { const c = columnOf(s, f.column); return { c, pred: predicate(f, c, str) }; });
  const show = q.columns?.length ? q.columns.map(n => columnOf(s, n)) : s.columns.filter(c => c.type !== 'empty').slice(0, 12);
  const origin = originOf(p, s), sheetSaid = s.partOf ?? s.name;
  const need = [...new Set([...filters.map(f => f.c.slot), ...show.map(c => c.slot), ...(origin ? [ORIGIN_SLOT, ORIGIN_COL_SLOT] : [])])];
  const limit = Math.min(50, Math.max(1, q.limit ?? 10));
  const out: { row: number; cells: Record<string, { value: number | string | boolean | null; ref: string }> }[] = [];
  let matched = 0;
  for (let ch = 0; ch < s.chunks; ch += 1) {
    const rb = await store.get(rowsKey(s.index, ch));
    if (!rb) throw new QueryError(`Part of “${s.name}” is missing from this device’s storage — attach the workbook again.`);
    const rows = new Int32Array(rb.buffer.slice(rb.byteOffset, rb.byteOffset + rb.byteLength));
    const cols = await chunkCols(store, s.index, need, ch, rows.length);
    const at = (slot: number) => cols.get(slot) ?? cols.blank;
    for (let i = 0; i < rows.length; i += 1) {
      if (s.dataFrom && rows[i] < s.dataFrom) continue;
      if (!filters.every(f => { const c = at(f.c.slot); return f.pred(c.kinds[i], c.vals[i]); })) continue;
      matched += 1;
      if (out.length < limit) out.push({ row: rows[i], cells: Object.fromEntries(show.map(c => { const col = at(c.slot); return [c.name, { value: cellValue(col.kinds[i], col.vals[i], str), ref: origin ? origin(at, i, c, rows[i]) : `${sheetSaid}!${colName(c.slot)}${rows[i]}` }]; })) });
    }
  }
  return { sheet: s.name, matched, columns: show.map(c => c.name), rows: out };
}

export { CHUNK };
