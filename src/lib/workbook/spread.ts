/* MEDIAN, PERCENTILES AND SPREAD — exact over every value in the group, or refused beyond a cap (docs/LUNA-ANALYSIS.md A7). Pure. */

export const SPREAD_OPS = ['median', 'p10', 'p25', 'p75', 'p90', 'stdev'] as const;
export type SpreadOp = typeof SPREAD_OPS[number];

export const SPREAD_CAP = 10_000;
export const SPREAD_HOW = 'a median, p10, p25, p75, p90 or stdev holds every value in the group up to 10,000 — beyond that the question is refused in words, never approximated.';

export function isSpreadOp(op: string): op is SpreadOp {
  return (SPREAD_OPS as readonly string[]).includes(op);
}

/** The share at or below which `p` of a sorted list lies — interpolated (Hyndman type 7 / Excel PERCENTILE.INC). */
export function exactPercentile(sorted: readonly number[], p: number): number {
  const xs = sorted;
  if (!xs.length) throw new Error('no values');
  if (xs.length === 1) return xs[0];
  const at = Math.min(1, Math.max(0, p)) * (xs.length - 1);
  const lo = Math.floor(at), hi = Math.ceil(at);
  return xs[lo] + (xs[hi] - xs[lo]) * (at - lo);
}

/** Sample standard deviation (n − 1) — undefined when fewer than two values. */
export function sampleStdev(xs: readonly number[]): number | null {
  if (xs.length < 2) return null;
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
  const varSum = xs.reduce((s, x) => s + (x - mean) ** 2, 0);
  return Math.sqrt(varSum / (xs.length - 1));
}

const P_OF: Record<Exclude<SpreadOp, 'median' | 'stdev'>, number> = { p10: 0.1, p25: 0.25, p75: 0.75, p90: 0.9 };

export function spreadOf(op: SpreadOp, values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  if (op === 'median') return exactPercentile(s, 0.5);
  if (op === 'stdev') return sampleStdev(s);
  return exactPercentile(s, P_OF[op]);
}

export function spreadMeasureName(op: SpreadOp, column: string): string {
  return op === 'stdev' ? `stdev of ${column}` : `${op} of ${column}`;
}

export function pushSpread(acc: number[], v: number): number[] | 'over' {
  if (acc.length >= SPREAD_CAP) return 'over';
  acc.push(v);
  return acc;
}

export function mergeSpread(a: number[], b: number[]): number[] | 'over' {
  if (a.length + b.length > SPREAD_CAP) return 'over';
  a.push(...b);
  return a;
}