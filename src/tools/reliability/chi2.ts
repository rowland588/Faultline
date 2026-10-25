/* χ² with an even number of degrees of freedom — the arithmetic behind the
 * reliability study's 90% bounds on an MTBF (time-ended test) and, with the
 * same quantile, the exact interval on a growth curve's β (FC-061). Split out
 * of reliability.ts so growth.ts can use it without importing the study;
 * reliability.ts re-exports chi2Even and chi2Quantile. Pure. */

/** ln Γ(x) — Lanczos, for the Poisson terms. */
export function lnGamma(x: number): number {
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** P(χ² ≤ x) with an even number of degrees of freedom k = 2m — one less
 *  the Poisson chance of fewer than m events at mean x/2. Exact. */
export function chi2Even(x: number, k: number): number {
  if (x <= 0) return 0;
  const m = k / 2, lam = x / 2;
  let sum = 0;
  for (let j = 0; j < m; j++) sum += Math.exp(-lam + j * Math.log(lam) - lnGamma(j + 1));
  return Math.min(1, Math.max(0, 1 - sum));
}

/** The p quantile of χ² with k (even) degrees of freedom, by halving. */
export function chi2Quantile(p: number, k: number): number {
  let lo = 0, hi = Math.max(10, k * 4);
  while (chi2Even(hi, k) < p) hi *= 2;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (chi2Even(mid, k) < p) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
