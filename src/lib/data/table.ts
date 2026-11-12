/* A DATASET AND ITS QUESTIONS (10 November, docs/CONVERSATIONAL-DATA.md — Rowland: "The source of information must not dictate how the user
 * interacts with Luna"; "The system must distinguish between zero, missing, unknown and not recorded").
 *
 * Faultline's own records (the line's stops, the programs' trials, a study's readings, the problems) are laid out as a TABLE — fields and
 * rows — and asked the same questions a workbook is (lib/workbook/query: filters, groups, a date by day · week · month · year, sum, avg,
 * min, max, count, distinct), answered in the same QueryResult shape, so a result, a chart and a report read either the same way.
 *
 * Honest by construction:
 *   - a cell is a value, or `null` — NOT RECORDED. Never 0: a stop counted with no minutes has minutes null, not 0.
 *   - a sum or an average of nothing recorded is null ("not recorded"), never 0; a count of rows is a count.
 *   - a group of rows with nothing recorded for the grouping field is "(not recorded)", named, never folded into another.
 *   - a field the dataset does not hold is refused with the fields it does hold (missingFields) — never guessed from a near name.
 *   - every group carries its rows' references ("stop:…", "test:…"), the way a workbook group carries its cells.
 * Pure. */
import type { Filter, Measure, Query, QueryResult, Group } from '../workbook/query';
import { bucket } from '../workbook/query';

export type FieldType = 'number' | 'text' | 'date' | 'yes/no';
export type Cell = number | string | boolean | null;
export interface Field {
  name: string;
  type: FieldType;
  unit?: string;
  /** What it is, in a few words — "the minutes the stop lasted, by stopwatch or typed". */
  means: string;
  /** Worked out by Faultline from other fields, and how — "(packs − rejects) ÷ minutes". Absent: as recorded. */
  calc?: string;
}
export interface Dataset {
  /** 'stops:<line>' · 'tests:<line>' · 'readings:<study>' · 'problems:<line|all>' */
  id: string;
  name: string;
  kind: 'stops' | 'tests' | 'readings' | 'problems' | 'production';
  fields: Field[];
  rows: Cell[][];
  /** One reference a row — what the row is ("stop:…"). */
  refs: string[];
  /** What the dataset does not hold, said once — "No downtime reason classification is recorded on a stop: only the category tapped." */
  limits: string[];
}

export const NOT_RECORDED = '(not recorded)';
const GROUP_CAP = 5000;

const low = (v: unknown) => String(v ?? '').trim().toLowerCase();
const dateMs = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v.trim())) { const t = Date.parse(v.trim().length === 10 ? `${v.trim()}T00:00:00Z` : v.trim()); return Number.isFinite(t) ? t : undefined; }
  return undefined;
};

/** The field of a name — exact, then any case and spacing. Undefined when the dataset does not hold it. */
export function fieldOf(d: Pick<Dataset, 'fields'>, name: string): { i: number; f: Field } | undefined {
  const want = low(name).replace(/\s+/g, ' ');
  const i = d.fields.findIndex(f => low(f.name).replace(/\s+/g, ' ') === want);
  return i < 0 ? undefined : { i, f: d.fields[i] };
}

/** The fields a question names that the dataset does not hold. */
export function missingFields(d: Pick<Dataset, 'fields'>, q: Pick<Query, 'filters' | 'groupBy' | 'time' | 'measures'>): string[] {
  const named = [...(q.filters ?? []).map(f => f.column), ...(q.groupBy ?? []), ...(q.time ? [q.time.column] : []), ...q.measures.flatMap(m => (m.column ? [m.column] : []))];
  return [...new Set(named.filter(n => !fieldOf(d, n)))];
}

export class TableError extends Error {}

function predicate(f: Filter, fld: Field): (v: Cell) => boolean {
  const op = f.op;
  if (op === 'blank') return v => v === null || v === '';
  if (op === 'notblank') return v => v !== null && v !== '';
  const num = fld.type === 'number', date = fld.type === 'date';
  const asNum = (x: unknown) => (date ? dateMs(x) : typeof x === 'number' ? x : Number.isFinite(Number(x)) && String(x).trim() !== '' ? Number(x) : undefined);
  if (op === 'eq' || op === 'ne' || op === 'in') {
    const want = op === 'in' ? (f.values ?? []) : [f.value];
    const hit = (v: Cell) => v !== null && want.some(w => ((num || date) ? asNum(v) === asNum(w) : low(v) === low(w)));
    return op === 'ne' ? v => !hit(v) : hit;
  }
  if (op === 'contains') return v => v !== null && low(v).includes(low(f.value));
  const a = asNum(op === 'between' ? f.from : f.value), b = asNum(f.to);
  if (a === undefined || (op === 'between' && b === undefined)) throw new TableError(`The filter on “${fld.name}” needs ${date ? 'a date as YYYY-MM-DD' : 'a number'}.`);
  return v => {
    const x = asNum(v);
    if (x === undefined) return false;
    return op === 'gt' ? x > a : op === 'gte' ? x >= a : op === 'lt' ? x < a : op === 'lte' ? x <= a : x >= a && x <= (b as number);
  };
}

const keyWord = (v: Cell, f: Field): string => {
  if (v === null || v === '') return NOT_RECORDED;
  if (f.type === 'date') { const t = dateMs(v); return t === undefined ? String(v) : new Date(t).toISOString().slice(0, 10); }
  if (f.type === 'yes/no') return v ? 'yes' : 'no';
  return String(v).trim();
};

/** One question of a dataset, worked over every row — the workbook's QueryResult. */
export function runTable(d: Dataset, q: Omit<Query, 'sheet'> & { sheet?: string }): QueryResult {
  const miss = missingFields(d, q);
  if (miss.length) throw new TableError(`${d.name} holds no ${miss.map(m => `“${m}”`).join(', ')} — it holds ${d.fields.map(f => f.name).join(', ')}.`);
  const preds = (q.filters ?? []).map(f => { const x = fieldOf(d, f.column) as { i: number; f: Field }; return { i: x.i, p: predicate(f, x.f) }; });
  const groups = (q.groupBy ?? []).map(n => fieldOf(d, n) as { i: number; f: Field });
  const time = q.time ? { ...(fieldOf(d, q.time.column) as { i: number; f: Field }), by: q.time.by } : undefined;
  if (time && time.f.type !== 'date') throw new TableError(`“${time.f.name}” is not a date — it cannot be grouped by ${time.by}.`);
  const ms = q.measures.map(m => ({ m, x: m.column ? fieldOf(d, m.column) : undefined }));
  for (const { m, x } of ms) if ((m.op === 'sum' || m.op === 'avg' || m.op === 'min' || m.op === 'max') && x && x.f.type !== 'number' && x.f.type !== 'date') throw new TableError(`“${x.f.name}” is ${x.f.type}, not a number — it cannot be ${m.op === 'avg' ? 'averaged' : m.op === 'sum' ? 'added up' : `given a ${m.op}imum`}.`);

  interface Acc { key: string[]; rows: number; refs: string[]; sum: number[]; n: number[]; min: number[]; max: number[]; set: Set<string>[] }
  const mk = (key: string[]): Acc => ({ key, rows: 0, refs: [], sum: ms.map(() => 0), n: ms.map(() => 0), min: ms.map(() => Infinity), max: ms.map(() => -Infinity), set: ms.map(() => new Set<string>()) });
  const by = new Map<string, Acc>();
  const total = mk([]);
  const skipped = ms.map(() => ({ count: 0, refs: [] as string[] }));
  let matched = 0, timeSkipped = 0, capped = false;
  const add = (a: Acc, row: Cell[], ref: string, track: boolean) => {
    a.rows++; if (a.refs.length < 5) a.refs.push(ref);
    ms.forEach(({ m, x }, j) => {
      if (m.op === 'count') { if (!x) a.n[j]++; else if (row[x.i] !== null && row[x.i] !== '') a.n[j]++; return; }
      const v = x ? row[x.i] : null;
      if (v === null || v === '') return;   /* not recorded: neither a value nor a zero */
      if (m.op === 'distinct') { a.set[j].add(low(v)); return; }
      const num = typeof v === 'number' ? v : x?.f.type === 'date' ? dateMs(v) : undefined;
      if (num === undefined) { if (track) { skipped[j].count++; if (skipped[j].refs.length < 5) skipped[j].refs.push(ref); } return; }
      a.sum[j] += num; a.n[j]++; a.min[j] = Math.min(a.min[j], num); a.max[j] = Math.max(a.max[j], num);
    });
  };
  d.rows.forEach((row, r) => {
    if (!preds.every(p => p.p(row[p.i]))) return;
    matched++;
    const key = groups.map(g => keyWord(row[g.i], g.f));
    if (time) {
      const t = dateMs(row[time.i]);
      if (t === undefined) { timeSkipped++; add(total, row, d.refs[r], true); return; }
      key.unshift(bucket(t, time.by));
    }
    add(total, row, d.refs[r], true);
    if (!key.length) return;
    const k = key.join('\u0001');
    let a = by.get(k);
    if (!a) { if (by.size >= GROUP_CAP) { capped = true; return; } a = mk(key); by.set(k, a); }
    add(a, row, d.refs[r], false);
  });
  const valuesOf = (a: Acc): (number | string | null)[] => ms.map(({ m }, j) => {
    if (m.op === 'count') return a.n[j];
    if (m.op === 'distinct') return a.set[j].size;
    if (!a.n[j]) return null;
    return m.op === 'sum' ? a.sum[j] : m.op === 'avg' ? a.sum[j] / a.n[j] : m.op === 'min' ? a.min[j] : a.max[j];
  });
  let list: Group[] = [...by.values()].map(a => ({ key: a.key, values: valuesOf(a), rows: a.rows, refs: a.refs }));
  const groupsTotal = list.length;
  const ord = q.order ?? (groups.length || time ? (time && !groups.length ? { by: 'group' as const } : { by: 0, desc: true }) : { by: 'group' as const });
  list.sort((x, y) => {
    let c: number;
    if (ord.by === 'group') c = x.key.join(' ').localeCompare(y.key.join(' '), 'en-GB', { numeric: true });
    else { const a = x.values[ord.by], b = y.values[ord.by]; c = a === null ? (b === null ? 0 : 1) : b === null ? -1 : Number(a) - Number(b); if (ord.desc && a !== null && b !== null) c = -c; }
    return c;
  });
  list = list.slice(0, Math.min(200, q.limit ?? 50));
  const measureNames = ms.map(({ m, x }) => (m.op === 'count' ? (x ? `count of ${x.f.name}` : 'rows') : `${m.op} of ${x?.f.name ?? ''}`));
  const notes: string[] = [];
  if (timeSkipped && time) notes.push(`${timeSkipped.toLocaleString('en-GB')} matching rows have no ${time.f.name} recorded and are left out of the ${time.by}s.`);
  if (capped) notes.push(`More than ${GROUP_CAP.toLocaleString('en-GB')} groups — the rest were not counted; group by fewer fields.`);
  for (const g of groups) { const n = list.find(x => x.key.includes(NOT_RECORDED)); if (n) notes.push(`Rows with no ${g.f.name} recorded are shown as “${NOT_RECORDED}” — never put into another group.`); }
  ms.forEach(({ m, x }) => {
    if (!x || m.op === 'count' || m.op === 'distinct') return;
    const blank = d.rows.filter(row => preds.every(p => p.p(row[p.i])) && (row[x.i] === null || row[x.i] === '')).length;
    if (blank) notes.push(`${blank.toLocaleString('en-GB')} of the ${matched.toLocaleString('en-GB')} matching rows have no ${x.f.name} recorded — they are not counted as zero.`);
    if (x.f.calc) notes.push(`“${x.f.name}” is worked out by LUNAR: ${x.f.calc}.`);
  });
  for (const f of q.filters ?? []) if (f.op === 'contains') notes.push(`The filter on “${f.column}” matches words in the text — it is not a recorded classification.`);
  return {
    sheet: d.name, rowsScanned: d.rows.length, rowsMatched: matched,
    groups: list, groupsTotal, totals: valuesOf(total),
    measures: measureNames, groupBy: [...(time ? [`${time.f.name} by ${time.by}`] : []), ...groups.map(g => g.f.name)],
    skipped: ms.map((_x, j) => ({ measure: measureNames[j], count: skipped[j].count, refs: skipped[j].refs })).filter(s => s.count),
    notes: [...new Set(notes)],
  };
}

/** A field's coverage — how many rows record it, its range or its commonest values — for saying what a dataset holds. */
export function fieldCoverage(d: Dataset): { name: string; type: FieldType; unit?: string; means: string; calc?: string; recorded: number; of: number; min?: number; max?: number; top?: [string, number][] }[] {
  return d.fields.map((f, i) => {
    const vals = d.rows.map(r => r[i]).filter(v => v !== null && v !== '');
    const out: ReturnType<typeof fieldCoverage>[number] = { name: f.name, type: f.type, ...(f.unit ? { unit: f.unit } : {}), means: f.means, ...(f.calc ? { calc: f.calc } : {}), recorded: vals.length, of: d.rows.length };
    if (f.type === 'number' && vals.length) { const ns = vals.map(Number); out.min = Math.min(...ns); out.max = Math.max(...ns); }
    if (f.type === 'text' || f.type === 'yes/no') {
      const c = new Map<string, number>();
      for (const v of vals) c.set(String(v), (c.get(String(v)) ?? 0) + 1);
      out.top = [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    }
    return out;
  });
}

export type { Measure };
