/* STANDARD DATA POOLED AND FITTED — one step timed on several products of a line, as ONE time (FC-024;
 * knowledge/specs/FC-024-standard-data.md §6; ie.standard-data's library and time formulas).
 *
 *   pooled        the same step timed at one count (or none) on k products: basic = the mean of their basic
 *                 times, its spread, and how sure — x̄ ± t(k − 1)·s ÷ √k, 95% two-sided (as the time study's own
 *                 margin, FC-019)
 *   time formula  the same step timed at two or more DIFFERENT counts: basic = a + b × count by ordinary least
 *                 squares (b = Sxy ÷ Sxx, a = ȳ − b·x̄); with three or more timings, s = √(RSS ÷ (k − 2)),
 *                 R² = 1 − RSS ÷ Syy, and at a count x₀ the mean time's interval ŷ ± t(k − 2)·s·√(1/k + (x₀ − x̄)² ÷ Sxx)
 *                 (any regression text; ie.standard-data: "'place n packs' = a + b·n"). Beyond the counts timed it
 *                 is a guess, and says so.
 *   enough        three timings or more (the record's "three studies is a minimum"), the count inside those timed,
 *                 and ±5% or better at 95% (the time study's own target, k = 0.05) — the spec's chosen 4.
 *
 * Pure: points in, figures out. Proved against SciPy (scripts/knowledge/cases-time.py §7b) in
 * __tests__/standardData.test.ts. */
import { tQuantile } from '../../lib/ie/stats';
import type { TimedPoint } from '../../lib/study';

export type { TimedPoint };

export type ElementFit =
  | { kind: 'pooled'; k: number; mean: number; sd: number; /** the one count they were all timed at, if any */ at?: number }
  | { kind: 'formula'; k: number; a: number; b: number; /** with three timings or more */ se?: number; r2?: number; xMean: number; sxx: number; lo: number; hi: number;
      /** timings in the group with no count, left out of the line */ left: number };

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const t95 = (df: number) => tQuantile(0.975, df);

/** The step's timings as one time: a formula when they were timed at two or more different counts, else their mean
 *  (two timings or more). Undefined with fewer than two usable timings. */
export function fitPoints(points: readonly TimedPoint[]): ElementFit | undefined {
  const ok = points.filter(p => finite(p.basic) && p.basic > 0);
  const counted = ok.filter(p => finite(p.count) && (p.count as number) > 0);
  const counts = new Set(counted.map(p => p.count as number));
  if (counts.size >= 2) {
    const x = counted.map(p => p.count as number), y = counted.map(p => p.basic), k = x.length;
    const xMean = mean(x), yMean = mean(y);
    let sxx = 0, sxy = 0, syy = 0;
    for (let i = 0; i < k; i++) { sxx += (x[i] - xMean) ** 2; sxy += (x[i] - xMean) * (y[i] - yMean); syy += (y[i] - yMean) ** 2; }
    const b = sxy / sxx, a = yMean - b * xMean;
    const rss = y.reduce((t, v, i) => t + (v - (a + b * x[i])) ** 2, 0);
    return { kind: 'formula', k, a, b, xMean, sxx, lo: Math.min(...x), hi: Math.max(...x), left: ok.length - counted.length,
      ...(k >= 3 ? { se: Math.sqrt(Math.max(0, rss) / (k - 2)), r2: syy > 0 ? 1 - rss / syy : 1 } : {}) };
  }
  if (ok.length < 2) return undefined;
  const y = ok.map(p => p.basic), m = mean(y);
  const sd = Math.sqrt(y.reduce((t, v) => t + (v - m) ** 2, 0) / (y.length - 1));
  const one = [...counts][0];
  return { kind: 'pooled', k: y.length, mean: m, sd, ...(one != null ? { at: one } : {}) };
}

export interface AtCount {
  /** The basic time worked out, seconds. */
  basic: number;
  /** The 95% half-width of that mean time, seconds, and as a share of it — with enough timings to say. */
  half?: number;
  margin?: number;
  /** The count asked is within the counts timed (a mean is always "inside"). */
  inside: boolean;
  enough: boolean;
  /** The count it was worked out at (a formula). */
  count?: number;
}

/** The time a fit gives at a count (a formula needs one; a mean ignores it). Undefined when a formula is asked with
 *  no count. A basic of nought or less is returned as it is — the caller does not use it. */
export function fitAt(fit: ElementFit, count?: number): AtCount | undefined {
  if (fit.kind === 'pooled') {
    const half = fit.k >= 2 ? (t95(fit.k - 1) * fit.sd) / Math.sqrt(fit.k) : undefined;
    const margin = half != null && fit.mean > 0 ? half / fit.mean : undefined;
    return { basic: fit.mean, ...(half != null ? { half } : {}), ...(margin != null ? { margin } : {}), inside: true,
      enough: fit.k >= 3 && margin != null && margin <= 0.05 + 1e-12 };
  }
  if (!(finite(count) && count > 0)) return undefined;
  const basic = fit.a + fit.b * count;
  const inside = count >= fit.lo - 1e-9 && count <= fit.hi + 1e-9;
  if (fit.se == null) return { basic, inside, enough: false, count };
  const half = t95(fit.k - 2) * fit.se * Math.sqrt(1 / fit.k + (count - fit.xMean) ** 2 / fit.sxx);
  const margin = basic > 0 ? half / basic : undefined;
  return { basic, half, ...(margin != null ? { margin } : {}), inside, enough: fit.k >= 3 && inside && margin != null && margin <= 0.05 + 1e-12, count };
}

/** A borrowed step's time from the timings it rests on, at its count (or the count it was borrowed at). */
export function timeFrom(from: { at?: number; points: readonly TimedPoint[] }, count?: number): (AtCount & { fit: ElementFit }) | undefined {
  const fit = fitPoints(from.points);
  if (!fit) return undefined;
  const r = fitAt(fit, finite(count) && count > 0 ? count : from.at);
  return r ? { ...r, fit } : undefined;
}
