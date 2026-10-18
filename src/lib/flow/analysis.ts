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
 * figure a day, a Pareto, a trend, a histogram, Cpk, a control chart, a
 * relationship between two columns, a forecast. A block is a pure
 * function with what it needs — and the picture it is drawn as — said as
 * data — so a method written by a
 * person or proposed by the assistant composes them, the validator checks
 * every one, and the screen, the paper, a gate and a measure read the same
 * answer. A NEW BLOCK IS CODE: one entry here with its arithmetic and its
 * tests, and it is in every designer, every proposal and every report at
 * once — nothing else is rebuilt. What no block does is not faked: the
 * assistant says it as a need for development (FlowDefinition.needs).
 *
 * Nothing worked out is stored: every figure is read from the entries, every
 * time. A struck entry keeps its place and counts for nothing. */
import { calc, formulaRefs, parseFormula } from './formula';
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

export const ANALYSIS_BLOCKS = ['count', 'sum', 'mean', 'median', 'min', 'max', 'sd', 'share', 'perDay', 'pareto', 'trend', 'histogram', 'cpk', 'control', 'relation', 'forecast', 'calc'] as const;
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
  /** A second number column it is read against (a relationship: the one
   *  that might drive it). */
  against?: string;
  /** The level it is heading for (a forecast says when it gets there). */
  target?: number;
  /** A worked-out figure's arithmetic, over the analyses before it and the
   *  step's number boxes, by their keys — "stop_minutes_a_day * cost_of_a_minute". */
  formula?: string;
}

/** How a block's answer is drawn — on the screen (ui/flow/LogParts) and on
 *  paper (lib/flow/reportPdf) alike, by this word and never by the block's
 *  id, so a new block with an old picture is drawn the day it is written. */
export type AnalysisPicture = 'none' | 'bars' | 'pareto' | 'control' | 'scatter' | 'forecast';

export interface SeriesPoint {
  label: string; value: number; cum?: number;
  /** A scatter's other axis (a relationship). */
  x?: number;
  /** A reading a control chart calls a signal, and why. */
  flag?: 'outside' | 'run';
}

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
  /** A control chart's centre and limits. */
  limits?: { centre: number; upper: number; lower: number };
  /** The straight line through the points (y = intercept + slope × x) —
   *  a relationship's, or a forecast's over the days (x a day number from
   *  the first day logged). */
  fit?: { slope: number; intercept: number };
  /** A forecast's: the days ahead it is carried to, and the target it is read against. */
  ahead?: number;
  target?: number;
}

type Need = 'required' | 'optional' | 'none';

export interface AnalysisBlock {
  id: AnalysisBlockId;
  name: string;
  /** What it is for, in a line — for the designer and the assistant. */
  says: string;
  needs: { of: Need; by: Need; when: Need; against: Need; target: Need; formula?: Need };
  /** of must be a number column. */
  numeric: boolean;
  /** number: a figure gates and measures can read; series: a picture; both. */
  output: 'number' | 'series' | 'both';
  picture: AnalysisPicture;
  compute: (entries: readonly FlowEntry[], a: FlowAnalysis, columns: readonly FlowField[], ctx: AnalysisContext) => AnalysisResult;
}

/** What a block may read besides the entries: the analyses worked out before
 *  it on the same log, and the step's own boxes (typed once for the log). */
export interface AnalysisContext {
  prior: Record<string, AnalysisResult>;
  boxes: Record<string, number>;
  labels: Record<string, string>;
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
/** A figure with its unit as the floor says it — "18.33 min", "62.5%", money
 *  as money: "£1,204.50". */
export const numberSaid = (n: number, unit?: string): string => (unit === '£'
  ? `${n < 0 ? '−' : ''}£${Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  : `${fmtNumber(n)}${unit ? (unit === '%' ? '%' : ` ${unit}`) : ''}`);
const withUnit = numberSaid;
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

/** A column totalled (or the entries counted) day by day, in day order. */
function dayTotals(rows: ReturnType<typeof rowsOf>, of?: string): SeriesPoint[] {
  const byDay = new Map<string, number>();
  for (const r of rows) byDay.set(r.e.on, (byDay.get(r.e.on) ?? 0) + (of ? (typeof r.v[of] === 'number' ? (r.v[of] as number) : 0) : 1));
  return [...byDay.entries()].sort((p, q) => p[0].localeCompare(q[0])).map(([label, value]) => ({ label, value }));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = 86400000;
/** A day as the app says one ("14 Oct") — here, so the gateway's copy stands alone. */
export const daySaid = (iso: string): string => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso); return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}` : iso; };
const dayNo = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / DAY); };
const isoOf = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);

/** The least-squares line through the points, and how closely they follow it. */
export function lineFit(xs: readonly number[], ys: readonly number[]): { slope: number; intercept: number; r?: number } | undefined {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return undefined;
  const mx = mean(xs.slice(0, n)), my = mean(ys.slice(0, n));
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; sxy += (xs[i] - mx) * (ys[i] - my); }
  if (!(sxx > 0)) return undefined;
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx, ...(syy > 0 ? { r: sxy / Math.sqrt(sxx * syy) } : {}) };
}

/** An individuals control chart (I-MR), as Shewhart and the AIAG manual
 *  work it: the centre the mean, the limits ± 2.66 × the average moving
 *  range (3 ÷ d2, d2 = 1.128 for ranges of two). A SIGNAL is a reading
 *  outside the limits (rule 1), or a run of 8 in a row on one side of the
 *  centre (rule 2 of Nelson's, the 8-point run) — each run one signal. */
export function controlOf(xs: readonly number[]): { centre: number; upper: number; lower: number; flags: (SeriesPoint['flag'] | undefined)[]; outside: number[]; runs: { from: number; length: number; above: boolean }[] } | undefined {
  if (xs.length < 2) return undefined;
  let t = 0;
  for (let i = 1; i < xs.length; i++) t += Math.abs(xs[i] - xs[i - 1]);
  const mr = t / (xs.length - 1);
  if (!(mr > 0)) return undefined;
  const centre = mean([...xs]), upper = centre + 2.66 * mr, lower = centre - 2.66 * mr;
  const flags: (SeriesPoint['flag'] | undefined)[] = xs.map(x => (x > upper || x < lower ? 'outside' : undefined));
  const outside = xs.map((x, i) => (x > upper || x < lower ? i : -1)).filter(i => i >= 0);
  const runs: { from: number; length: number; above: boolean }[] = [];
  let from = 0;
  for (let i = 1; i <= xs.length; i++) {
    const side = (k: number) => (xs[k] > centre ? 1 : xs[k] < centre ? -1 : 0);
    if (i < xs.length && side(i) !== 0 && side(i) === side(from)) continue;
    const length = i - from;
    if (side(from) !== 0 && length >= 8) {
      runs.push({ from, length, above: side(from) > 0 });
      for (let k = from; k < i; k++) flags[k] = flags[k] ?? 'run';
    }
    from = i;
  }
  return { centre, upper, lower, flags, outside, runs };
}

/** "Line speed" mid-sentence as "line speed" — but "OEM fitter" kept. */
const lowerFirst = (w: string) => (/^[A-Z][a-z]/.test(w) ? w[0].toLowerCase() + w.slice(1) : w);
const strength = (r: number) => { const a = Math.abs(r); return a >= 0.7 ? 'a strong' : a >= 0.4 ? 'a moderate' : a >= 0.2 ? 'a weak' : ''; };

/** One statistic over a number column — sum, mean, median, min, max, the spread. */
function stat(id: AnalysisBlockId, name: string, says: string, f: (xs: number[]) => number, min = 1): AnalysisBlock {
  return {
    id, name, says, needs: { of: 'required', by: 'none', when: 'optional', against: 'none', target: 'none' }, numeric: true, output: 'number', picture: 'none',
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
    id: 'count', name: 'Count', says: 'How many entries — all, or those that meet a rule', needs: { of: 'none', by: 'none', when: 'optional', against: 'none', target: 'none' }, numeric: false, output: 'number', picture: 'none',
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
    id: 'share', name: 'Share', says: 'The share of entries that meet a rule, as a percentage', needs: { of: 'none', by: 'none', when: 'required', against: 'none', target: 'none' }, numeric: false, output: 'number', picture: 'none',
    compute: (entries, a, columns) => {
      const all = rowsOf(entries, a, columns, false), hit = rowsOf(entries, a, columns);
      if (!all.length) return { n: 0, unit: '%', says: `${a.label}: no entries yet.` };
      const value = (hit.length / all.length) * 100;
      return { value, n: all.length, unit: '%', says: `${a.label}: ${withUnit(value, '%')} — ${hit.length} of ${many(all.length, 'entry', 'entries')}${whenSaid(a, columns)}.` };
    },
  },
  perDay: {
    id: 'perDay', name: 'A day', says: 'The total of a number column (or the count) a day, averaged over the days logged', needs: { of: 'optional', by: 'none', when: 'optional', against: 'none', target: 'none' }, numeric: true, output: 'number', picture: 'none',
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
    id: 'pareto', name: 'Pareto', says: 'Entries grouped by a column, biggest first, with the running share — the few that make most', needs: { of: 'optional', by: 'required', when: 'optional', against: 'none', target: 'none' }, numeric: true, output: 'both', picture: 'pareto',
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
    id: 'trend', name: 'Trend', says: 'A number column totalled (or entries counted) day by day — is it moving?', needs: { of: 'optional', by: 'none', when: 'optional', against: 'none', target: 'none' }, numeric: true, output: 'both', picture: 'bars',
    compute: (entries, a, columns) => {
      const rows = rowsOf(entries, a, columns);
      const series = dayTotals(rows, a.of);
      const unit = unitOf(a, columns) ?? (a.of ? undefined : 'entries');
      if (!series.length) return { n: 0, ...(unit ? { unit } : {}), says: `${a.label}: no entries yet.` };
      const last = series[series.length - 1], first = series[0];
      const moved = series.length < 2 ? '' : last.value === first.value ? ' — no change from the first day' : ` — ${withUnit(Math.abs(last.value - first.value), unit)} ${last.value > first.value ? 'up' : 'down'} on the first day`;
      return { value: last.value, n: rows.length, ...(unit ? { unit } : {}), series, says: `${a.label}: ${withUnit(last.value, unit)} on the latest day of ${many(series.length, 'day')}${moved}.` };
    },
  },
  histogram: {
    id: 'histogram', name: 'Histogram', says: 'How a number column is spread — the shape of the readings', needs: { of: 'required', by: 'none', when: 'optional', against: 'none', target: 'none' }, numeric: true, output: 'series', picture: 'bars',
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
    id: 'cpk', name: 'Cpk', says: 'How capable a number column is against its own limits (its column’s at least / at most)', needs: { of: 'required', by: 'none', when: 'optional', against: 'none', target: 'none' }, numeric: true, output: 'number', picture: 'none',
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
  control: {
    id: 'control', name: 'Control chart', says: 'Each reading in the order taken, against limits set by its own variation — what is ordinary, and the signals worth finding the cause of (a reading outside the limits, 8 in a row on one side)',
    needs: { of: 'required', by: 'none', when: 'optional', against: 'none', target: 'none' }, numeric: true, output: 'both', picture: 'control',
    compute: (entries, a, columns) => {
      const rows = rowsOf(entries, a, columns).filter(r => a.of !== undefined && typeof r.v[a.of] === 'number')
        .sort((p, q) => p.e.on.localeCompare(q.e.on) || p.e.at - q.e.at);
      const xs = rows.map(r => r.v[a.of as string] as number), unit = unitOf(a, columns);
      if (xs.length < 5) return { n: xs.length, unit: 'signals', says: `${a.label}: needs 5 readings to set its limits — ${xs.length} so far.` };
      const c = controlOf(xs);
      if (!c) return { n: xs.length, unit: 'signals', says: `${a.label}: every reading is the same — no variation to set limits from.` };
      const series: SeriesPoint[] = rows.map((r, i) => ({ label: r.e.on, value: xs[i], ...(c.flags[i] ? { flag: c.flags[i] } : {}) }));
      const signals = c.outside.length + c.runs.length;
      const limits = { centre: c.centre, upper: c.upper, lower: c.lower };
      const within = `${withUnit(c.lower, unit)} to ${withUnit(c.upper, unit)}, centre ${withUnit(c.centre, unit)}`;
      const few = xs.length < 20 ? ' (fewer than 20 readings: the limits are provisional)' : '';
      if (!signals) return { value: 0, unit: 'signals', n: xs.length, series, limits, says: `${a.label}: in control — ${many(xs.length, 'reading')} within the limits ${within}${few}.` };
      const parts: string[] = [];
      for (const i of c.outside.slice(0, 2)) parts.push(`${withUnit(xs[i], unit)} on ${daySaid(rows[i].e.on)} ${xs[i] > c.upper ? 'above the upper' : 'below the lower'} limit`);
      if (c.outside.length > 2) parts.push(`${c.outside.length - 2} more outside the limits`);
      for (const r of c.runs.slice(0, 2)) parts.push(`${r.length} in a row ${r.above ? 'above' : 'below'} the centre from ${daySaid(rows[r.from].e.on)}`);
      if (c.runs.length > 2) parts.push(`${c.runs.length - 2} more runs`);
      return {
        value: signals, unit: signals === 1 ? 'signal' : 'signals', n: xs.length, series, limits,
        says: `${a.label}: ${many(signals, 'signal')} — ${parts.join('; ')}; find what changed then. Limits ${within}${few}.`,
      };
    },
  },
  relation: {
    id: 'relation', name: 'Relationship', says: 'Whether one number column moves with another — how closely (r, from −1 to 1) and the line through the points; a link, not proof of a cause',
    needs: { of: 'required', by: 'none', when: 'optional', against: 'required', target: 'none' }, numeric: true, output: 'both', picture: 'scatter',
    compute: (entries, a, columns) => {
      const yk = a.of, xk = a.against;
      const rows = rowsOf(entries, a, columns).filter(r => yk !== undefined && xk !== undefined && typeof r.v[yk] === 'number' && typeof r.v[xk] === 'number');
      const ys = rows.map(r => r.v[yk as string] as number), xs = rows.map(r => r.v[xk as string] as number);
      const yc = col(columns, yk), xc = col(columns, xk);
      const yl = yc?.label ?? yk ?? '', xl = xc?.label ?? xk ?? '';
      if (rows.length < 3) return { n: rows.length, says: `${a.label}: needs 3 entries with both ${yl} and ${xl} — ${rows.length} so far.` };
      const fit = lineFit(xs, ys);
      const series: SeriesPoint[] = xs.map((x, i) => ({ label: fmtNumber(x), x, value: ys[i] }));
      if (!fit || fit.r === undefined) return { n: rows.length, series, says: `${a.label}: ${fit ? yl : xl} does not vary in these entries — nothing to relate.` };
      const r = fit.r, word = strength(r), few = rows.length < 10 ? ' (fewer than 10: read it with care)' : '';
      if (!word) return { value: r, n: rows.length, series, fit: { slope: fit.slope, intercept: fit.intercept }, says: `${a.label}: no clear link between ${yl} and ${xl} — r = ${fmtNumber(r)}, from ${many(rows.length, 'entry', 'entries')}${few}.` };
      return {
        value: r, n: rows.length, series, fit: { slope: fit.slope, intercept: fit.intercept },
        says: `${a.label}: ${word} link — r = ${fmtNumber(r)}; ${yl} about ${withUnit(Math.abs(fit.slope), yc?.unit)} ${fit.slope > 0 ? 'higher' : 'lower'} for every ${xc?.unit ? `1 ${xc.unit}` : 'one'} more ${lowerFirst(xl)}, from ${many(rows.length, 'entry', 'entries')}${few}. A link is not proof of a cause — test it.`,
      };
    },
  },
  forecast: {
    id: 'forecast', name: 'Forecast', says: 'The figure a day (a column totalled, or the entries counted) with the straight line through it carried a week on — where it is heading, and the day it reaches a target',
    needs: { of: 'optional', by: 'none', when: 'optional', against: 'none', target: 'optional' }, numeric: true, output: 'both', picture: 'forecast',
    compute: (entries, a, columns) => {
      const series = dayTotals(rowsOf(entries, a, columns), a.of);
      const unit = unitOf(a, columns) ?? (a.of ? undefined : 'entries');
      const u = unit ? { unit } : {};
      const tgt = typeof a.target === 'number' ? { target: a.target } : {};
      if (series.length < 3) return { n: series.length, ...u, ...tgt, series, says: `${a.label}: needs 3 days logged to see where it is heading — ${many(series.length, 'day')} so far.` };
      const d0 = dayNo(series[0].label), xs = series.map(p => dayNo(p.label) - d0), ys = series.map(p => p.value);
      const fit = lineFit(xs, ys);
      if (!fit) return { n: series.length, ...u, ...tgt, series, says: `${a.label}: needs days apart to see where it is heading.` };
      const ahead = 7, last = xs[xs.length - 1];
      const floor = ys.every(y => y >= 0) ? 0 : -Infinity;
      const at = (x: number) => Math.max(floor, fit.intercept + fit.slope * x);
      const now = at(last), then = at(last + ahead);
      const move = Math.abs(fit.slope) < 1e-9 ? 'flat' : `${fit.slope > 0 ? 'rising' : 'falling'} ${withUnit(Math.abs(fit.slope), unit)} a day`;
      let toward = '';
      if (typeof a.target === 'number') {
        const T = a.target;
        if (Math.abs(fit.slope) < 1e-9) toward = now === T ? `; at the target of ${withUnit(T, unit)}` : `; it does not move towards ${withUnit(T, unit)}`;
        else {
          const xT = (T - fit.intercept) / fit.slope;
          toward = xT > last ? `; it reaches ${withUnit(T, unit)} on ${daySaid(isoOf(d0 + Math.ceil(xT - 1e-9)))} at this rate` : `; already past ${withUnit(T, unit)} on the line, and moving on`;
        }
      }
      const few = series.length < 7 ? ' (fewer than 7 days: a rough guide)' : '';
      return {
        value: then, n: series.length, ...u, ...tgt, series, ahead, fit: { slope: fit.slope, intercept: fit.intercept },
        says: `${a.label}: ${move} — ${withUnit(now, unit)} now on the line through ${many(series.length, 'day')}, ${withUnit(then, unit)} a week on${toward}${few}.`,
      };
    },
  },
  calc: {
    id: 'calc', name: 'Worked out', says: 'A figure worked out from the figures before it and the step’s own boxes — any arithmetic (+ − × ÷ and brackets), money included: a cost, a yield, a rate',
    needs: { of: 'none', by: 'none', when: 'none', against: 'none', target: 'none', formula: 'required' }, numeric: false, output: 'number', picture: 'none',
    compute: (entries, a, _columns, ctx) => {
      const unit = a.unit;
      let refs: string[] = [];
      try { refs = formulaRefs(parseFormula(a.formula ?? '')); } catch { return { n: 0, ...(unit ? { unit } : {}), says: `${a.label}: its arithmetic cannot be read.` }; }
      const nums: Record<string, number | undefined> = { ...ctx.boxes };
      for (const [k, r] of Object.entries(ctx.prior)) if (typeof r.value === 'number' && Number.isFinite(r.value)) nums[k] = r.value;
      const name = (k: string) => (ctx.labels[k] ?? k.replace(/_/g, ' ')).toLowerCase();
      const missing = refs.filter(k => typeof nums[k] !== 'number');
      const n = live(entries).length;
      if (missing.length) return { n, ...(unit ? { unit } : {}), says: `${a.label}: needs ${missing.map(name).join(' and ')} — not worked out yet.` };
      const value = calc(a.formula ?? '', nums);
      const how = (a.formula ?? '').replace(/[a-z_][a-z0-9_]*/gi, w => name(w.toLowerCase())).replace(/\*/g, '×').replace(/\//g, '÷').replace(/\s+/g, ' ').trim();
      if (value === undefined || !Number.isFinite(value)) return { n, ...(unit ? { unit } : {}), says: `${a.label}: cannot be worked out — ${how} has no answer (a division by nought).` };
      return { value, n, ...(unit ? { unit } : {}), says: `${a.label}: ${withUnit(value, unit)} — ${how}.` };
    },
  },
};

export const blockOf = (id?: string): AnalysisBlock | undefined => (id && (ANALYSIS_BLOCKS as readonly string[]).includes(id) ? BLOCKS[id as AnalysisBlockId] : undefined);

/** Every analysis on a log, worked out from its entries — in order, so a
 *  worked-out figure reads those before it, and the step's own boxes. */
export function analyse(analyses: readonly FlowAnalysis[] | undefined, columns: readonly FlowField[] | undefined, entries: readonly FlowEntry[] | undefined,
  boxes: { values?: Record<string, unknown>; labels?: Record<string, string> } = {}): Record<string, AnalysisResult> {
  const out: Record<string, AnalysisResult> = {};
  const nums: Record<string, number> = {};
  for (const [k, v] of Object.entries(boxes.values ?? {})) if (typeof v === 'number' && Number.isFinite(v)) nums[k] = v;
  const labels: Record<string, string> = { ...(boxes.labels ?? {}) };
  for (const a of analyses ?? []) labels[a.key] = a.label;
  for (const a of analyses ?? []) {
    const b = blockOf(a.block);
    if (b) out[a.key] = b.compute(entries ?? [], a, columns ?? [], { prior: { ...out }, boxes: nums, labels });
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
  return { id, name: b.name, says: b.says, of: b.needs.of, by: b.needs.by, when: b.needs.when, against: b.needs.against, target: b.needs.target, formula: b.needs.formula ?? 'none', numeric: b.numeric, output: b.output, picture: b.picture };
});
