/* A QUESTION OF A WORKBOOK, WORKED OVER EVERY ROW (docs/WORKBOOKS.md). Filters, groups (and a date by day, week, month or year), sums,
 * counts, averages, minimums, maximums and distinct counts — read a chunk at a time from the store, so a sheet of millions of rows is never
 * in memory whole. Every answer carries the source rows it came from ("Downtime!F12"), and every value it could not use (a word in a column
 * being summed, a cell that is not a date in a column grouped by month) is counted and named — never dropped silently. The model asks the
 * question; this code answers it. */
import { CHUNK, Kind, chunkKey, rowsKey, unpackChunk, getJson, type WorkbookStore } from './store';
import { type WorkbookProfile, type SheetProfile, type ColumnProfile } from './read';
import { colName } from './xml';

export type Op = 'eq' | 'ne' | 'in' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'contains' | 'blank' | 'notblank';
export interface Filter { column: string; op: Op; value?: string | number; values?: (string | number)[]; from?: string | number; to?: string | number }
export type Measure = { op: 'sum' | 'avg' | 'min' | 'max' | 'distinct'; column: string } | { op: 'count'; column?: string };
export interface Query {
  sheet: string;
  filters?: Filter[];
  groupBy?: string[];
  time?: { column: string; by: 'day' | 'week' | 'month' | 'year' };
  measures: Measure[];
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
export function bucket(ms: number, by: 'day' | 'week' | 'month' | 'year'): string {
  const d = new Date(ms);
  if (by === 'year') return String(d.getUTCFullYear());
  if (by === 'month') return d.toISOString().slice(0, 7);
  if (by === 'day') return d.toISOString().slice(0, 10);
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = Date.UTC(t.getUTCFullYear(), 0, 1);
  return `${t.getUTCFullYear()}-W${String(Math.ceil(((t.getTime() - y0) / 86_400_000 + 1) / 7)).padStart(2, '0')}`;
}

/** A cell as words — a date as YYYY-MM-DD, yes/no, a number as it is. */
export function cellValue(kind: number, val: number, str: string[]): number | string | boolean | null {
  if (kind === Kind.Num) return val;
  if (kind === Kind.Str || kind === Kind.Err) return str[val] ?? '';
  if (kind === Kind.Date) return iso(val);
  if (kind === Kind.Bool) return val === 1;
  return null;
}

type Pred = (kind: number, val: number) => boolean;
/** The spellings a text filter matched — said when more than one, so "Line 3" taking "line 3 " in with it is never silent. */
type Spelled = { column: string; ids: Set<number> };
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
    const sp: Spelled = { column: c.name, ids: new Set() };
    if (f.op !== 'ne') spelled?.push(sp);
    const hit = (k: number, v: number): boolean => {
      if ((k === Kind.Num || k === Kind.Date) && nums.some(n => Number.isFinite(n) && (dated && k === Kind.Date ? iso(v).startsWith(iso(n)) : n === v))) return true;
      if (!want.includes(text(k, v))) return false;
      if (k === Kind.Str && sp.ids.size < 20) sp.ids.add(v);
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

type Cols = Map<number, { kinds: Int8Array; vals: Float64Array }> & { blank: { kinds: Int8Array; vals: Float64Array } };
/** One chunk of the columns a question needs — a column with nothing in that chunk reads as blank. */
async function chunkCols(store: WorkbookStore, sheet: number, need: number[], ch: number, n: number): Promise<Cols> {
  const blank = { kinds: new Int8Array(n), vals: new Float64Array(n) };
  const cols = Object.assign(new Map<number, { kinds: Int8Array; vals: Float64Array }>(), { blank });
  for (const slot of need) { const b = await store.get(chunkKey(sheet, slot, ch)); cols.set(slot, b ? unpackChunk(b) : blank); }
  return cols;
}

interface Acc { key: string[]; rows: number; refs: number[]; sum: number[]; n: number[]; min: number[]; max: number[]; set: (Set<string> | null)[] }
const DISTINCT_CAP = 100_000, GROUP_CAP = 50_000;

/** Run a question over every row of a sheet. */
export async function runQuery(store: WorkbookStore, p: WorkbookProfile, q: Query): Promise<QueryResult> {
  const s = sheetOf(p, q.sheet);
  const str = await stringsOf(store, p);
  const measures = q.measures.length ? q.measures : [{ op: 'count' as const }];
  const spelled: Spelled[] = [];
  const filters = (q.filters ?? []).map(f => { const c = columnOf(s, f.column); return { c, pred: predicate(f, c, str, spelled) }; });
  const groups = (q.groupBy ?? []).map(g => columnOf(s, g));
  const time = q.time ? { c: columnOf(s, q.time.column), by: q.time.by } : null;
  const mcols = measures.map(m => (m.column ? columnOf(s, m.column) : null));
  for (const [i, m] of measures.entries()) {
    const mc = mcols[i];
    if ((m.op === 'sum' || m.op === 'avg') && mc && mc.type !== 'number' && mc.type !== 'mixed') throw new QueryError(`“${mc.name}” holds ${mc.type === 'empty' ? 'nothing' : mc.type}, not numbers — it cannot be ${m.op === 'sum' ? 'added up' : 'averaged'}.`);
  }
  const need = [...new Set([...filters.map(f => f.c.slot), ...groups.map(g => g.slot), ...(time ? [time.c.slot] : []), ...mcols.filter((c): c is ColumnProfile => !!c).map(c => c.slot)])];
  const acc = new Map<string, Acc>();
  const total: Acc = { key: [], rows: 0, refs: [], sum: measures.map(() => 0), n: measures.map(() => 0), min: measures.map(() => Infinity), max: measures.map(() => -Infinity), set: measures.map(m => (m.op === 'distinct' ? new Set() : null)) };
  const skipped = measures.map(() => ({ count: 0, refs: [] as number[] }));
  let timeSkipped = 0, scanned = 0, matched = 0, capped = false;
  const ref = (row: number, c: ColumnProfile): string => `${s.name}!${c.letter}${row}`;
  const label = (k: number, v: number): string => (k === Kind.Blank ? '(blank)' : String(cellValue(k, v, str)));
  for (let ch = 0; ch < s.chunks; ch += 1) {
    const rb = await store.get(rowsKey(s.index, ch));
    if (!rb) throw new QueryError(`Part of “${s.name}” is missing from this device’s storage — attach the workbook again.`);
    const rows = new Int32Array(rb.buffer.slice(rb.byteOffset, rb.byteOffset + rb.byteLength));
    const cols = await chunkCols(store, s.index, need, ch, rows.length);
    const at = (slot: number) => cols.get(slot) ?? cols.blank;
    for (let i = 0; i < rows.length; i += 1) {
      scanned += 1;
      let ok = true;
      for (const f of filters) { const col = at(f.c.slot); if (!f.pred(col.kinds[i], col.vals[i])) { ok = false; break; } }
      if (!ok) continue;
      const key: string[] = [];
      for (const g of groups) { const col = at(g.slot); key.push(label(col.kinds[i], col.vals[i])); }
      if (time) { const col = at(time.c.slot); if (col.kinds[i] !== Kind.Date) { timeSkipped += 1; continue; } key.push(bucket(col.vals[i], time.by)); }
      matched += 1;
      const k = key.join('\u0001');
      let a = acc.get(k);
      if (!a) {
        if (acc.size >= GROUP_CAP) { capped = true; continue; }
        a = { key, rows: 0, refs: [], sum: measures.map(() => 0), n: measures.map(() => 0), min: measures.map(() => Infinity), max: measures.map(() => -Infinity), set: measures.map(m => (m.op === 'distinct' ? new Set() : null)) };
        acc.set(k, a);
      }
      const ga: Acc = a;
      for (const t of [ga, total]) { t.rows += 1; if (t.refs.length < 3) t.refs.push(rows[i]); }
      measures.forEach((m, j) => {
        const c = mcols[j];
        if (!c) return;
        const col = at(c.slot); const kd = col.kinds[i], v = col.vals[i];
        if (m.op === 'count') { if (kd !== Kind.Blank) { ga.n[j] += 1; total.n[j] += 1; } return; }
        if (m.op === 'distinct') { if (kd === Kind.Blank) return; const lv = label(kd, v); for (const t of [ga, total]) { const st = t.set[j]; if (st && st.size < DISTINCT_CAP) st.add(lv); } return; }
        if (kd === Kind.Blank) return;
        const usable = m.op === 'min' || m.op === 'max' ? kd === Kind.Num || kd === Kind.Date : kd === Kind.Num;
        if (!usable) { skipped[j].count += 1; if (skipped[j].refs.length < 3) skipped[j].refs.push(rows[i]); return; }
        for (const t of [ga, total]) { t.sum[j] += v; t.n[j] += 1; if (v < t.min[j]) t.min[j] = v; if (v > t.max[j]) t.max[j] = v; }
      });
    }
  }
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
  const refCol = mcols.find((c): c is ColumnProfile => !!c) ?? groups[0] ?? time?.c ?? s.columns[0];
  let list: Group[] = [...acc.values()].map(a => ({ key: a.key, values: valuesOf(a), rows: a.rows, refs: a.refs.map(r => `${s.name}!${refCol?.letter ?? 'A'}${r}`) }));
  const ord = q.order ?? (groups.length || time ? (time && !groups.length ? { by: 'group' as const } : { by: 0, desc: true }) : { by: 'group' as const });
  list.sort((x, y) => {
    if (ord.by === 'group') { const a = x.key.join(' '), b = y.key.join(' '); return ord.desc ? b.localeCompare(a, undefined, { numeric: true }) : a.localeCompare(b, undefined, { numeric: true }); }
    const a = x.values[ord.by], b = y.values[ord.by];
    const na = typeof a === 'number' ? a : -Infinity, nb = typeof b === 'number' ? b : -Infinity;
    return ord.desc === false ? na - nb : nb - na;
  });
  const groupsTotal = list.length;
  list = list.slice(0, Math.min(200, q.limit ?? 50));
  const mName = (m: Measure, j: number): string => { const mc = mcols[j]; return mc ? `${m.op} of ${mc.name}` : 'rows'; };
  const notes: string[] = [];
  if (timeSkipped && time) notes.push(`${timeSkipped.toLocaleString('en-GB')} matching rows have no date in “${time.c.name}” and are left out of the ${time.by}s.`);
  if (capped) notes.push(`More than ${GROUP_CAP.toLocaleString('en-GB')} groups — the rest were not counted; group by fewer columns.`);
  for (const [j, m] of measures.entries()) if (m.op === 'distinct' && (total.set[j]?.size ?? 0) >= DISTINCT_CAP) notes.push(`The distinct count of “${mcols[j]?.name ?? ''}” stops at ${DISTINCT_CAP.toLocaleString('en-GB')}.`);
  for (const sp of spelled) if (sp.ids.size > 1) notes.push(`The filter on “${sp.column}” matched ${sp.ids.size} spellings, taken together: ${[...sp.ids].map(id => `“${str[id]}”`).join(', ')} — say if they are not the same thing.`);
  const fm = mcols.filter((c): c is ColumnProfile => !!c && c.formulas > 0);
  for (const c of fm) notes.push(`“${c.name}” is worked out by formulas in the workbook (${c.formulas.toLocaleString('en-GB')}) — the values used are the ones Excel saved${c.formulasNoValue ? `; ${c.formulasNoValue.toLocaleString('en-GB')} have no saved value and count as blank` : ''}.`);
  return {
    sheet: s.name, rowsScanned: scanned, rowsMatched: matched, groups: list, groupsTotal, totals: valuesOf(total),
    measures: measures.map(mName), groupBy: [...groups.map(g => g.name), ...(time ? [`${time.c.name} by ${time.by}`] : [])],
    skipped: measures.map((m, j) => ({ measure: mName(m, j), count: skipped[j].count, refs: skipped[j].refs.map(r => { const mc = mcols[j]; return mc ? ref(r, mc) : `${s.name} row ${r}`; }) })).filter(x => x.count),
    notes,
  };
}

/** The source rows behind a finding — each cell with its reference. */
export async function sourceRows(store: WorkbookStore, p: WorkbookProfile, q: { sheet: string; filters?: Filter[]; columns?: string[]; limit?: number }): Promise<{ sheet: string; matched: number; columns: string[]; rows: { row: number; cells: Record<string, { value: number | string | boolean | null; ref: string }> }[] }> {
  const s = sheetOf(p, q.sheet);
  const str = await stringsOf(store, p);
  const filters = (q.filters ?? []).map(f => { const c = columnOf(s, f.column); return { c, pred: predicate(f, c, str) }; });
  const show = q.columns?.length ? q.columns.map(n => columnOf(s, n)) : s.columns.filter(c => c.type !== 'empty').slice(0, 12);
  const need = [...new Set([...filters.map(f => f.c.slot), ...show.map(c => c.slot)])];
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
      if (!filters.every(f => { const c = at(f.c.slot); return f.pred(c.kinds[i], c.vals[i]); })) continue;
      matched += 1;
      if (out.length < limit) out.push({ row: rows[i], cells: Object.fromEntries(show.map(c => { const col = at(c.slot); return [c.name, { value: cellValue(col.kinds[i], col.vals[i], str), ref: `${s.name}!${colName(c.slot)}${rows[i]}` }]; })) });
    }
  }
  return { sheet: s.name, matched, columns: show.map(c => c.name), rows: out };
}

export { CHUNK };
