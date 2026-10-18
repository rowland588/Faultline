/* ANALYSES — what a log's entries add up to, from blocks written once and
 * tested (docs/BLUEPRINT.md §3, the new product; docs/PLATFORM-STATUS.md).
 *
 * Rowland, 18 October: "Faultline must be capable of going beyond its
 * existing functionality ... design and create new manufacturing tools,
 * Lean methodologies, analytical workflows ... from plain-English
 * descriptions ... I want the underlying platform designed so that new
 * capabilities can be developed and integrated without the entire product
 * having to be rebuilt for each new requirement."
 *
 * A step answered as a LOG (lib/flow/definition) keeps many entries, each
 * the step's columns. What they add up to is said by its analyses, each one
 * of the blocks below: count, sum, mean, median, the spread, a share, a
 * figure a day, a Pareto, a trend, a histogram, Cpk. A block is a pure
 * function with what it needs said as data — so a method written by a
 * person or proposed by the assistant composes them, the validator checks
 * every one, and the screen, the paper, a gate and a measure read the same
 * answer. A NEW BLOCK IS CODE: one entry here with its arithmetic and its
 * tests, and it is in every designer, every proposal and every report at
 * once — nothing else is rebuilt. What no block does is not faked: the
 * assistant says it as a need for development (FlowDefinition.needs).
 *
 * Nothing worked out is stored: every figure is read from the entries, every
 * time. A struck entry keeps its place and counts for nothing. */
import { calc } from './formula';
import type { FlowField } from './definition';

/** One entry in a log — the step's columns, as typed, on a day, by somebody.
 *  Struck, never erased: a mistype keeps its place and counts for nothing. */
export interface FlowEntry {
  id: string;
  /** ISO day it happened. */
  on: string;
  at: number;
  who?: string;
  values: Record<string, string | number | boolean>;
  struck?: boolean;
}

export const ANALYSIS_BLOCKS = ['count', 'sum', 'mean', 'median', 'min', 'max', 'sd', 'share', 'perDay', 'pareto', 'trend', 'histogram', 'cpk'] as const;
export type AnalysisBlockId = typeof ANALYSIS_BLOCKS[number];

export const WHEN_OPS = ['=', '!=', '>=', '<=', '>', '<'] as const;
export type WhenOp = typeof WHEN_OPS[number];

/** Which entries count — "Reason = Jam", "Minutes >= 5". */
export interface FlowWhen { column: string; op: WhenOp; value: string | number | boolean }

/** One analysis on a log: a block, the column it works on, the column it
 *  groups by, which entries it counts. Its key is a figure the step's gates
 *  and the method's measures name like any box (definition numbersOf). */
export interface FlowAnalysis {
  key: string;
  label: string;
  block: AnalysisBlockId;
  /** The column worked on — a number for the arithmetic, optional for a
   *  count-based Pareto, trend or figure a day. */
  of?: string;
  /** The column grouped by (Pareto). */
  by?: string;
  /** Only the entries that meet it (a share: the ones it counts). */
  when?: FlowWhen;
  /** Said after the figure, when the column's own unit is not right. */
  unit?: string;
}

export interface SeriesPoint { label: string; value: number; cum?: number }

export interface AnalysisResult {
  /** The figure — absent when there is not enough to say one. */
  value?: number;
  unit?: string;
  /** The picture's points (Pareto, trend, histogram). */
  series?: SeriesPoint[];
  /** How many entries it read. */
  n: number;
  /** What it says, in a sentence. */
  says: string;
}

type Need = 'required' | 'optional' | 'none';

export interface AnalysisBlock {
  id: AnalysisBlockId;
  name: string;
  /** What it is for, in a line — for the designer and the assistant. */
  says: string;
  needs: { of: Need; by: Need; when: Need };
  /** of must be a number column. */
  numeric: boolean;
  /** number: a figure gates and measures can read; series: a picture; both. */
  output: 'number' | 'series' | 'both';
  compute: (entries: readonly FlowEntry[], a: FlowAnalysis, columns: readonly FlowField[]) => AnalysisResult;
}

/* ------------------------------------------------------------------ helpers */

const NUMERIC = new Set<FlowField['type']>(['number', 'reading', 'calc']);
export const isNumberColumn = (f?: FlowField): boolean => !!f && NUMERIC.has(f.type);
/** Columns a Pareto groups by: words, not numbers. */
export const isGroupColumn = (f?: FlowField): boolean => !!f && ['text', 'choice', 'yesno', 'person', 'date'].includes(f.type);

const filled = (v: unknown) => v !== undefined && v !== null && !(typeof v === 'string' && !v.trim());

/** An entry's values with its worked-out columns worked out — by the app,
 *  from the numbers typed, as a step's boxes are (runtime valuesOf). */
export function entryValues(columns: readonly FlowField[], typed: Record<string, string | number | boolean> = {}): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const f of columns) {
    if (f.type === 'calc') continue;
    const v = typed[f.key];
    if (!filled(v)) continue;
    if (NUMERIC.has(f.type)) {
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(n)) out[f.key] = n;
    } else out[f.key] = v;
  }
  for (let pass = 0; pass < 3; pass++) {
    for (const f of columns) {
      if (f.type !== 'calc' || !f.formula || out[f.key] !== undefined) continue;
      const nums: Record<string, number | undefined> = {};
      for (const [k, v] of Object.entries(out)) if (typeof v === 'number') nums[k] = v;
      const r = calc(f.formula, nums);
      if (r !== undefined) out[f.key] = r;
    }
  }
  return out;
}

const live = (entries: readonly FlowEntry[]) => entries.filter(e => !e.struck);

function meets(v: string | number | boolean | undefined, w: FlowWhen): boolean {
  if (v === undefined) return false;
  if (w.op === '=' || w.op === '!=') {
    const same = typeof w.value === 'number' ? Number(v) === w.value : String(v).trim().toLowerCase() === String(w.value).trim().toLowerCase();
    return w.op === '=' ? same : !same;
  }
  const n = typeof v === 'number' ? v : Number(v), t = Number(w.value);
  if (!Number.isFinite(n) || !Number.isFinite(t)) return false;
  return w.op === '>=' ? n >= t : w.op === '<=' ? n <= t : w.op === '>' ? n > t : n < t;
}

/** The live entries an analysis reads, each with its columns worked out. */
function rowsOf(entries: readonly FlowEntry[], a: FlowAnalysis, columns: readonly FlowField[], filter = true) {
  const rows = live(entries).map(e => ({ e, v: entryValues(columns, e.values) }));
  const w = a.when;
  return filter && w ? rows.filter(r => meets(r.v[w.column], w)) : rows;
}

const numbers = (rows: ReturnType<typeof rowsOf>, key?: string): number[] =>
  key ? rows.map(r => r.v[key]).filter((x): x is number => typeof x === 'number' && Number.isFinite(x)) : [];

/** A figure as the engine says every number (runtime: two places under a
 *  hundred, one above) — so a log's step, its gate and its measure agree. */
export const fmtNumber = (n: number): string => (Math.abs(n) >= 100 || Number.isInteger(n) ? String(Math.round(n * 10) / 10) : String(Math.round(n * 100) / 100));
const col = (columns: readonly FlowField[], key?: string) => columns.find(c => c.key === key);
const unitOf = (a: FlowAnalysis, columns: readonly FlowField[]) => a.unit ?? col(columns, a.of)?.unit;
const withUnit = (n: number, unit?: string) => `${fmtNumber(n)}${unit ? (unit === '%' ? '%' : ` ${unit}`) : ''}`;
const many = (n: number, one: string, more = `${one}s`) => `${n} ${n === 1 ? one : more}`;
const whenSaid = (a: FlowAnalysis, columns: readonly FlowField[]) => (a.when ? ` where ${col(columns, a.when.column)?.label ?? a.when.column} ${a.when.op} ${String(a.when.value)}` : '');

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const median = (xs: number[]) => { const s = [...xs].sort((p, q) => p - q), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const sd = (xs: number[]) => { if (xs.length < 2) return 0; const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };
/** Cpk as the capability study works it out (lib/ie/sample): the spread
 *  within from the moving range ÷ d2 (1.128), the nearer limit. Kept here so
 *  the gateway's copy of this file stands alone; the tests hold the two equal. */
export function cpkOf(xs: number[], lower?: number, upper?: number): number | undefined {
  if (xs.length < 2 || (lower === undefined && upper === undefined)) return undefined;
  let t = 0;
  for (let i = 1; i < xs.length; i++) t += Math.abs(xs[i] - xs[i - 1]);
  const s = t / (xs.length - 1) / 1.128;
  if (!(s > 0)) return undefined;
  const m = mean(xs);
  return Math.min(lower !== undefined ? (m - lower) / (3 * s) : Infinity, upper !== undefined ? (upper - m) / (3 * s) : Infinity);
}

/** One statistic over a number column — sum, mean, median, min, max, the spread. */
function stat(id: AnalysisBlockId, name: string, says: string, f: (xs: number[]) => number, min = 1): AnalysisBlock {
  return {
    id, name, says, needs: { of: 'required', by: 'none', when: 'optional' }, numeric: true, output: 'number',
    compute: (entries, a, columns) => {
      const rows = rowsOf(entries, a, columns), xs = numbers(rows, a.of), unit = unitOf(a, columns);
      const what = `${a.label}${whenSaid(a, columns)}`;
      if (xs.length < min) return { n: xs.length, ...(unit ? { unit } : {}), says: `${what}: ${xs.length ? `needs ${min} entries — ${xs.length} so far` : 'no entries yet'}.` };
      const value = f(xs);
      return { value, n: xs.length, ...(unit ? { unit } : {}), says: `${what}: ${withUnit(value, unit)}, from ${many(xs.length, 'entry', 'entries')}.` };
    },
  };
}

/* ------------------------------------------------------------------- blocks */

export const BLOCKS: Record<AnalysisBlockId, AnalysisBlock> = {
  count: {
    id: 'count', name: 'Count', says: 'How many entries — all, or those that meet a rule', needs: { of: 'none', by: 'none', when: 'optional' }, numeric: false, output: 'number',
    compute: (entries, a, columns) => {
      const n = rowsOf(entries, a, columns).length;
      return { value: n, n, unit: a.unit ?? 'entries', says: `${a.label}${whenSaid(a, columns)}: ${n}.` };
    },
  },
  sum: stat('sum', 'Total', 'The total of a number column', xs => xs.reduce((s, x) => s + x, 0)),
  mean: stat('mean', 'Average', 'The average of a number column', mean),
  median: stat('median', 'Median', 'The middle value of a number column — not pulled by one odd entry', median),
  min: stat('min', 'Lowest', 'The lowest value of a number column', xs => Math.min(...xs)),
  max: stat('max', 'Highest', 'The highest value of a number column', xs => Math.max(...xs)),
  sd: stat('sd', 'Spread', 'The standard deviation of a number column — how much it varies', sd, 2),
  share: {
    id: 'share', name: 'Share', says: 'The share of entries that meet a rule, as a percentage', needs: { of: 'none', by: 'none', when: 'required' }, numeric: false, output: 'number',
    compute: (entries, a, columns) => {
      const all = rowsOf(entries, a, columns, false), hit = rowsOf(entries, a, columns);
      if (!all.length) return { n: 0, unit: '%', says: `${a.label}: no entries yet.` };
      const value = (hit.length / all.length) * 100;
      return { value, n: all.length, unit: '%', says: `${a.label}: ${withUnit(value, '%')} — ${hit.length} of ${many(all.length, 'entry', 'entries')}${whenSaid(a, columns)}.` };
    },
  },
  perDay: {
    id: 'perDay', name: 'A day', says: 'The total of a number column (or the count) a day, averaged over the days logged', needs: { of: 'optional', by: 'none', when: 'optional' }, numeric: true, output: 'number',
    compute: (entries, a, columns) => {
      const rows = rowsOf(entries, a, columns);
      const days = new Set(rows.map(r => r.e.on));
      const unit = a.unit ?? (a.of ? `${col(columns, a.of)?.unit ?? ''} a day`.trim() : 'a day');
      if (!days.size) return { n: 0, unit, says: `${a.label}: no entries yet.` };
      const total = a.of ? numbers(rows, a.of).reduce((s, x) => s + x, 0) : rows.length;
      const value = total / days.size;
      return { value, n: rows.length, unit, says: `${a.label}: ${withUnit(value, unit)}, over ${many(days.size, 'day')} logged.` };
    },
  },
  pareto: {
    id: 'pareto', name: 'Pareto', says: 'Entries grouped by a column, biggest first, with the running share — the few that make most', needs: { of: 'optional', by: 'required', when: 'optional' }, numeric: true, output: 'both',
    compute: (entries, a, columns) => {
      const rows = rowsOf(entries, a, columns);
      const groups = new Map<string, number>();
      for (const r of rows) {
        const g = a.by ? r.v[a.by] : undefined;
        if (!filled(g)) continue;
        const name = typeof g === 'boolean' ? (g ? 'Yes' : 'No') : String(g).trim();
        const add = a.of ? (typeof r.v[a.of] === 'number' ? (r.v[a.of] as number) : 0) : 1;
        groups.set(name, (groups.get(name) ?? 0) + add);
      }
      const total = [...groups.values()].reduce((s, x) => s + x, 0);
      const by = col(columns, a.by)?.label ?? a.by;
      const what = a.of ? (col(columns, a.of)?.label ?? a.of).toLowerCase() : 'entries';
      if (!groups.size || total <= 0) return { n: rows.length, unit: '%', says: `${a.label}: nothing to rank yet.` };
      let run = 0;
      const series = [...groups.entries()].sort((p, q) => q[1] - p[1] || p[0].localeCompare(q[0]))
        .map(([label, value]) => { run += value; return { label, value, cum: (run / total) * 100 }; });
      const top = series[0], few = series.findIndex(s => (s.cum ?? 0) >= 80) + 1;
      const value = (top.value / total) * 100;
      return {
        value, n: rows.length, unit: '%', series,
        says: `${a.label}: ${top.label} is ${withUnit(value, '%')} of ${what}${series.length > 1 ? ` — ${few} of ${many(series.length, (by ?? '').toLowerCase() === 'reason' ? 'reason' : 'group')} make 80%` : ''}.`,
      };
    },
  },
  trend: {
    id: 'trend', name: 'Trend', says: 'A number column totalled (or entries counted) day by day — is it moving?', needs: { of: 'optional', by: 'none', when: 'optional' }, numeric: true, output: 'both',
    compute: (entries, a, columns) => {
      const rows = rowsOf(entries, a, columns);
      const byDay = new Map<string, number>();
      for (const r of rows) byDay.set(r.e.on, (byDay.get(r.e.on) ?? 0) + (a.of ? (typeof r.v[a.of] === 'number' ? (r.v[a.of] as number) : 0) : 1));
      const series = [...byDay.entries()].sort((p, q) => p[0].localeCompare(q[0])).map(([label, value]) => ({ label, value }));
      const unit = unitOf(a, columns) ?? (a.of ? undefined : 'entries');
      if (!series.length) return { n: 0, ...(unit ? { unit } : {}), says: `${a.label}: no entries yet.` };
      const last = series[series.length - 1], first = series[0];
      const moved = series.length < 2 ? '' : last.value === first.value ? ' — no change from the first day' : ` — ${withUnit(Math.abs(last.value - first.value), unit)} ${last.value > first.value ? 'up' : 'down'} on the first day`;
      return { value: last.value, n: rows.length, ...(unit ? { unit } : {}), series, says: `${a.label}: ${withUnit(last.value, unit)} on the latest day of ${many(series.length, 'day')}${moved}.` };
    },
  },
  histogram: {
    id: 'histogram', name: 'Histogram', says: 'How a number column is spread — the shape of the readings', needs: { of: 'required', by: 'none', when: 'optional' }, numeric: true, output: 'series',
    compute: (entries, a, columns) => {
      const xs = numbers(rowsOf(entries, a, columns), a.of), unit = unitOf(a, columns);
      if (xs.length < 2) return { n: xs.length, ...(unit ? { unit } : {}), says: `${a.label}: needs 2 entries — ${xs.length} so far.` };
      const lo = Math.min(...xs), hi = Math.max(...xs);
      const k = Math.max(1, Math.min(12, Math.ceil(Math.log2(xs.length) + 1)));
      const w = hi > lo ? (hi - lo) / k : 1;
      const counts = Array.from({ length: k }, () => 0);
      for (const x of xs) counts[Math.min(k - 1, Math.floor((x - lo) / w))]++;
      const series = counts.map((value, i) => ({ label: `${fmtNumber(lo + i * w)}–${fmtNumber(lo + (i + 1) * w)}`, value }));
      return { n: xs.length, ...(unit ? { unit } : {}), series, says: `${a.label}: ${many(xs.length, 'reading')} from ${withUnit(lo, unit)} to ${withUnit(hi, unit)}.` };
    },
  },
  cpk: {
    id: 'cpk', name: 'Cpk', says: 'How capable a number column is against its own limits (its column’s at least / at most)', needs: { of: 'required', by: 'none', when: 'optional' }, numeric: true, output: 'number',
    compute: (entries, a, columns) => {
      const c = col(columns, a.of);
      const xs = numbers(rowsOf(entries, a, columns), a.of);
      if (!c || (c.min === undefined && c.max === undefined)) return { n: xs.length, says: `${a.label}: its column has no limits to be judged against.` };
      const k = cpkOf(xs, c.min, c.max);
      if (k === undefined) return { n: xs.length, says: `${a.label}: needs readings that vary — ${many(xs.length, 'reading')} so far.` };
      const word = k >= 1.33 ? 'capable' : k >= 1 ? 'just capable' : 'not capable';
      return { value: k, n: xs.length, says: `${a.label}: Cpk ${fmtNumber(k)} — ${word}, from ${many(xs.length, 'reading')}${xs.length < 25 ? ' (fewer than 25: read it with care)' : ''}.` };
    },
  },
};

export const blockOf = (id?: string): AnalysisBlock | undefined => (id && (ANALYSIS_BLOCKS as readonly string[]).includes(id) ? BLOCKS[id as AnalysisBlockId] : undefined);

/** Every analysis on a log, worked out from its entries. */
export function analyse(analyses: readonly FlowAnalysis[] | undefined, columns: readonly FlowField[] | undefined, entries: readonly FlowEntry[] | undefined): Record<string, AnalysisResult> {
  const out: Record<string, AnalysisResult> = {};
  for (const a of analyses ?? []) {
    const b = blockOf(a.block);
    if (b) out[a.key] = b.compute(entries ?? [], a, columns ?? []);
  }
  return out;
}

/** A log's figures as a step's numbers — what its gates and its measures read. */
export function figuresOf(results: Record<string, AnalysisResult>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, r] of Object.entries(results)) if (typeof r.value === 'number' && Number.isFinite(r.value)) out[k] = r.value;
  return out;
}

/** What the designer and the assistant may compose, in words — generated
 *  from the registry, so a new block is offered the day it is written. */
export const BLOCK_CATALOGUE = ANALYSIS_BLOCKS.map(id => {
  const b = BLOCKS[id];
  return { id, name: b.name, says: b.says, of: b.needs.of, by: b.needs.by, when: b.needs.when, numeric: b.numeric, output: b.output };
});
