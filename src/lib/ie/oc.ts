/* THE OPERATING-CHARACTERISTIC CURVE of a single sampling plan (n, c) — what a plan protects
 * (knowledge/specs/FC-131-oc-curve.md; knowledge/methods/quality/acceptance-sampling-attributes.md).
 *
 *   Pa(p) = P(X ≤ c), X ~ Binomial(n, p)             a lot taken as an endless stream
 *   Pa(D) = P(X ≤ c), X ~ Hypergeometric(N, D, n)   a lot of N with D bad units in it (whole units)
 *
 * Public mathematics — no table of ISO 2859-1 or ANSI/ASQ Z1.4 is held or implied. Pure; proved against
 * SciPy's binom and hypergeom (scripts/knowledge/cases-calc.py, knowledge/research/cases-research-2-sampling.py)
 * in __tests__/oc.test.ts. */
import { binomCdf, lnGamma } from './dist';

export interface Plan {
  /** Units taken from the lot. */
  n: number;
  /** The most bad units found that still accepts the lot. */
  c: number;
  /** The lot's size, when it is one lot of known size (absent: an endless stream — the binomial). */
  lot?: number;
}

const lnChoose = (a: number, b: number): number => (b < 0 || b > a ? -Infinity : lnGamma(a + 1) - lnGamma(b + 1) - lnGamma(a - b + 1));

/** P(X ≤ c) for X hypergeometric: a lot of N with D bad units, n drawn without replacement. */
export function hyperCdf(c: number, N: number, D: number, n: number): number {
  /* as many bad units allowed as there are in the lot (or in the sample): it cannot be rejected, exactly */
  if (D <= c || n <= c) return 1;
  const lo = Math.max(0, n - (N - D)), hi = Math.min(c, D, n);
  if (hi < lo) return 0;
  const base = lnChoose(N, n);
  let s = 0;
  for (let d = lo; d <= hi; d++) s += Math.exp(lnChoose(D, d) + lnChoose(N - D, n - d) - base);
  return Math.min(1, s);
}

/** The bad units in a lot of N at a share p — whole units, so a share of a small lot is not a rate. */
export const badIn = (lot: number, p: number): number => Math.round(lot * p);

/** The chance a lot with a share p bad is accepted by the plan. */
export function accepts(plan: Plan, p: number): number {
  if (plan.lot !== undefined) return hyperCdf(plan.c, plan.lot, badIn(plan.lot, p), plan.n);
  return binomCdf(plan.c, plan.n, p);
}

/** The share bad at which the plan accepts a lot with chance `target` (0 to 1) — Pa falls as p rises, so a bisection
 *  finds it; for a lot of known size the answer is the first whole number of bad units that brings Pa down to `target`. */
export function shareAt(plan: Plan, target: number): number {
  if (plan.lot !== undefined) {
    for (let D = 0; D <= plan.lot; D++) if (hyperCdf(plan.c, plan.lot, D, plan.n) <= target) return D / plan.lot;
    return 1;
  }
  let lo = 0, hi = 1;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (binomCdf(plan.c, plan.n, mid) > target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** The curve: Pa at `points` + 1 shares from 0 to `pmax`. */
export function curve(plan: Plan, pmax: number, points = 60): [number, number][] {
  return Array.from({ length: points + 1 }, (_, i) => { const p = (pmax * i) / points; return [p, accepts(plan, p)] as [number, number]; });
}

/** The shares bad the page prints Pa at, in the order they are read. */
export const GRID: readonly number[] = [0.005, 0.01, 0.02, 0.03, 0.05, 0.08, 0.1];

/** The next "nice" top for an axis of shares: 1, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100 per cent. */
export function niceTop(p: number): number {
  const steps = [0.01, 0.02, 0.025, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1, 0.12, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8, 1];
  return steps.find(s => s >= p) ?? 1;
}
