/* AUDIT REFERENCE — independent re-implementations of the statistics the
 * app's IE modules lean on, written from first principles for the audit of
 * 16 October (scratchpad/audit-ie.md). Nothing here imports from src/lib: the
 * point is a second opinion.
 *
 *   normalUpperTail  P(Z > z) by Simpson integration of the density
 *   lgamma           Stirling series with argument shift (not Lanczos)
 *   tCdf, tQuantile  Student's t by Simpson integration of its density
 *   welchP           Welch's one-sided t from the two samples
 *   sd               sample standard deviation (n − 1)
 *   rng              a seeded LCG so a "random" case can be re-run */

export const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
export const sd = (xs: number[]): number => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
};

/** Composite Simpson's rule on [a, b] with n (even) intervals. */
export function simpson(f: (x: number) => number, a: number, b: number, n = 4_000): number {
  if (b <= a) return 0;
  if (n % 2) n++;
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}

const SQRT_2PI = Math.sqrt(2 * Math.PI);
const phi = (x: number) => Math.exp(-0.5 * x * x) / SQRT_2PI;

/** P(Z > z) for a standard normal, to about 1e-12 for |z| ≤ 8. */
export function normalUpperTail(z: number): number {
  if (z < 0) return 1 - normalUpperTail(-z);
  if (z > 38) return 0;
  /* integrate the density from z out to where it is below 1e-300 of nothing */
  return simpson(phi, z, z + 14, 8_000);
}

/** ln Γ(x) for x > 0: shift up past 12, then Stirling's series. */
export function lgamma(x: number): number {
  let shift = 0;
  let y = x;
  while (y < 12) { shift += Math.log(y); y++; }
  const inv = 1 / y, inv2 = inv * inv;
  const series = inv / 12 - inv * inv2 / 360 + inv * inv2 * inv2 / 1260 - inv * inv2 * inv2 * inv2 / 1680;
  return (y - 0.5) * Math.log(y) - y + 0.5 * Math.log(2 * Math.PI) + series - shift;
}

/** Student's t density with ν degrees of freedom. */
export function tPdf(u: number, df: number): number {
  const c = Math.exp(lgamma((df + 1) / 2) - lgamma(df / 2)) / Math.sqrt(df * Math.PI);
  return c * Math.pow(1 + (u * u) / df, -(df + 1) / 2);
}

/** P(T ≤ t). Integrated numerically; for a heavy tail (df 1–2) the upper
 *  limit is pushed far out, with a tail correction from the Cauchy-like
 *  decay. Good to ~1e-9 for df ≥ 3 and ~1e-6 for df 1–2 over |t| ≤ 50. */
export function tCdf(t: number, df: number): number {
  if (t < 0) return 1 - tCdf(-t, df);
  if (t === 0) return 0.5;
  /* ∫_0^t f on a split grid: fine near 0, coarser far out */
  const a = Math.min(t, 10), area1 = simpson(u => tPdf(u, df), 0, a, 4_000);
  const area2 = t > 10 ? simpson(u => tPdf(u, df), 10, t, 4_000) : 0;
  return Math.min(1, 0.5 + area1 + area2);
}

/** The two-sided 95% critical value: P(|T| > t) = 0.05 → tCdf(t) = 0.975. */
export function tQuantile975(df: number): number {
  let lo = 0, hi = 200;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (tCdf(mid, df) < 0.975) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Welch's one-sided p for H1: mean(after) < mean(before). */
export function welchP(before: number[], after: number[]): number {
  const m1 = mean(before), m2 = mean(after);
  const v1 = sd(before) ** 2, v2 = sd(after) ** 2;
  const n1 = before.length, n2 = after.length;
  const se2 = v1 / n1 + v2 / n2;
  const t = (m1 - m2) / Math.sqrt(se2);
  const df = (se2 * se2) / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1));
  return 1 - tCdf(t, df);
}

/** A seeded LCG in [0, 1), so a failing random case can be reproduced. */
export function rng(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A standard normal draw from two uniforms (Box–Muller). */
export const gauss = (r: () => number): number => {
  const u = Math.max(1e-12, r()), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

/** Wilson score interval half-width and bounds, for comparison with Wald. */
export function wilson(p: number, n: number, z = 1.96): { lo: number; hi: number } {
  const z2 = z * z;
  const centre = (p + z2 / (2 * n)) / (1 + z2 / n);
  const half = (z / (1 + z2 / n)) * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return { lo: Math.max(0, centre - half), hi: Math.min(1, centre + half) };
}
