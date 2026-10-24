/* DESCRIBING A SET OF READINGS — centre, spread, shape (FC-103; knowledge/methods/stats/descriptive.md): the mean and
 * median, s, the range, the quartiles by linear interpolation (type 7), the lean and the peakedness in SciPy's bias-corrected
 * forms, the coefficient of variation, and any reading beyond 1.5 × the middle half — flagged for a look, never removed.
 * Proved against SciPy in __tests__/stats.test.ts (cases-w3a.py). */
export interface Described { n: number; mean: number; median: number; sd: number; min: number; max: number; range: number;
  q1: number; q3: number; iqr: number; /** adjusted skewness G1 */ g1?: number; /** excess kurtosis G2 */ g2?: number; cv?: number;
  fences: { lo: number; hi: number }; outliers: { value: number; at: number }[] }

/** The p-th quantile of a sorted set by linear interpolation (type 7). */
export function quantile(sorted: number[], p: number): number {
  const h = (sorted.length - 1) * p, lo = Math.floor(h), hi = Math.ceil(h);
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

export function describe(xs: number[]): Described | undefined {
  const n = xs.length; if (n < 2) return undefined;
  const s = [...xs].sort((a, b) => a - b), m = xs.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (n - 1));
  const q1 = quantile(s, 0.25), q3 = quantile(s, 0.75), iqr = q3 - q1, fences = { lo: q1 - 1.5 * iqr, hi: q3 + 1.5 * iqr };
  const m2 = xs.reduce((a, x) => a + (x - m) ** 2, 0) / n, m4 = xs.reduce((a, x) => a + (x - m) ** 4, 0) / n;
  return {
    n, mean: m, median: quantile(s, 0.5), sd, min: s[0], max: s[n - 1], range: s[n - 1] - s[0], q1, q3, iqr,
    g1: n >= 3 && sd > 0 ? (n / ((n - 1) * (n - 2))) * xs.reduce((a, x) => a + ((x - m) / sd) ** 3, 0) : undefined,
    g2: n >= 4 && m2 > 0 ? ((n - 1) / ((n - 2) * (n - 3))) * ((n + 1) * (m4 / (m2 * m2) - 3) + 6) : undefined,
    cv: m !== 0 && sd > 0 ? 100 * sd / Math.abs(m) : undefined,
    fences, outliers: xs.flatMap((v, at) => (v < fences.lo || v > fences.hi ? [{ value: v, at }] : [])),
  };
}

/** The middle of the readings said in words — "median 401.20 g · middle half 400.80–401.60 g · lean 0.14" — under a histogram. */
export function describeSays(d: Described, dp: number, unit?: string): string {
  const u = unit ? ` ${unit}` : '', f = (v: number) => v.toFixed(dp);
  return `Median ${f(d.median)}${u} · middle half ${f(d.q1)}–${f(d.q3)}${u}${d.g1 !== undefined ? ` · lean ${d.g1.toFixed(2)}` : ''}`;
}

/** Readings that lean on the one before (FC-115), said — the autocorrelation figure, the band, what it does to the limits and
 *  the spacing to sample at. Empty when the readings are not too close together, or too few to judge. */
export function orderSays(ac: { n: number; enough: boolean; dependent: boolean; r1: number; band: number; shrink: number; every?: { m: number; n: number; r1: number } } | undefined, what = 'Readings'): string {
  if (!ac || !ac.enough || !ac.dependent) return '';
  const ord = (m: number) => (m === 2 ? '2nd' : m === 3 ? '3rd' : `${m}th`);
  return `${what} in order lean on the one before (r₁ ${ac.r1.toFixed(2)}, outside ±${ac.band.toFixed(2)}) — limits and intervals drawn from them are too tight by about ${Math.round((1 - ac.shrink) * 100)}%; ${ac.every ? `sample every ${ord(ac.every.m)} (thinned, r₁ ${ac.every.r1.toFixed(2)} is inside ±${(2 / Math.sqrt(ac.every.n)).toFixed(2)})` : 'no spacing within this set clears it — take readings further apart'}.`;
}
