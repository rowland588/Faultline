/* DISTRIBUTIONS AND THE CHECKS BEFORE CAPABILITY — the arithmetic several
 * tools share (knowledge/specs/FC-094-capability.md §6; knowledge/methods/
 * spc/normality-checks.md, spc/zero-failure-demonstration.md, stats/
 * confidence-intervals.md). Pure, and proved against a second implementation
 * (SciPy, scripts/knowledge/independent-cases.py) and published critical
 * values in __tests__/dist.test.ts — never against its own output.
 *
 * Built first for the capability study; lib/ie/reliability and lib/ie/sampling
 * keep their own χ² and margins until a change to them is asked for. */

/** P(Z > z) for a standard normal — Numerical Recipes' erfc, good to 1e-7. */
export function upperTail(z: number): number {
  const x = Math.abs(z) / Math.SQRT2, t = 1 / (1 + 0.5 * x);
  const erfc = t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806
    + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return z >= 0 ? erfc / 2 : 1 - erfc / 2;
}

/** Φ(z), the standard normal's cumulative share. */
export const normalCdf = (z: number): number => 1 - upperTail(z);

/** Φ⁻¹(p) — Acklam's rational approximation, then one Halley step on
 *  normalCdf, so it agrees with SciPy to about 1e-7 across (0, 1). */
export function normalQuantile(p: number): number {
  if (!(p > 0 && p < 1)) return p <= 0 ? -Infinity : Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  let x: number;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= 1 - lo) {
    const q = p - 0.5, r = q * q;
    x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const e = normalCdf(x) - p, u = e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2);
  return x - u / (1 + x * u / 2);
}

/** ln Γ(x) — Lanczos (g = 7, nine terms), good to about 1e-15 for x > 0. */
export function lnGamma(x: number): number {
  const g = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  x -= 1;
  let a = g[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += g[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** P(X ≤ k) for X ~ Binomial(n, p), summed term by term in logs. */
export function binomCdf(k: number, n: number, p: number): number {
  if (k < 0) return 0;
  if (k >= n) return 1;
  if (p <= 0) return 1;
  if (p >= 1) return 0;
  const lnC = (j: number) => lnGamma(n + 1) - lnGamma(j + 1) - lnGamma(n - j + 1);
  let s = 0;
  for (let j = 0; j <= k; j++) s += Math.exp(lnC(j) + j * Math.log(p) + (n - j) * Math.log1p(-p));
  return Math.min(1, s);
}

/** The exact (Clopper–Pearson) one-sided upper bound on a share failing, at
 *  confidence conf, from f failures in n: the p at which seeing f or fewer
 *  has chance 1 − conf. With none failing it is 1 − (1 − conf)^(1/n). */
export function binomUpper(f: number, n: number, conf = 0.95): number {
  if (n <= 0) return 1;
  if (f >= n) return 1;
  if (f <= 0) return 1 - Math.pow(1 - conf, 1 / n);
  let lo = f / n, hi = 1;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (binomCdf(f, n, mid) > 1 - conf) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** The exact one-sided lower bound: the p at which f or more has chance 1 − conf. */
export function binomLower(f: number, n: number, conf = 0.95): number {
  if (f <= 0 || n <= 0) return 0;
  if (f >= n) return Math.pow(1 - conf, 1 / n);
  let lo = 0, hi = f / n;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (1 - binomCdf(f - 1, n, mid) < 1 - conf) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** How many items must be tested, with at most `allowed` failing, to show the
 *  share failing is below p0 at confidence conf. None allowed: the success-run
 *  relation ⌈ln(1 − conf) ÷ ln(1 − p0)⌉ — 299 for 1 in 100 at 95%. */
export function itemsToShow(p0: number, conf = 0.95, allowed = 0): number {
  if (!(p0 > 0 && p0 < 1)) return Infinity;
  if (allowed <= 0) return Math.ceil(Math.log(1 - conf) / Math.log(1 - p0));
  let n = allowed + 1;
  while (binomUpper(allowed, n, conf) > p0 && n < 1e7) n = Math.ceil(n * 1.05) + 1;
  let lo = Math.max(allowed + 1, Math.floor(n / 1.05) - 2), hi = n;
  while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (binomUpper(allowed, mid, conf) <= p0) hi = mid; else lo = mid + 1; }
  return lo;
}

/** THE MOST THAT MAY FAIL (knowledge/specs/FC-094-capability.md, part 1b) — of n checked, the largest
 *  number failing that still shows the share failing is at most p0 at confidence conf: the largest k
 *  with the exact upper bound (binomUpper, rising with k) at most p0. −1 when even none failing cannot
 *  show it — then itemsToShow(p0, conf, 0) says how many it takes. */
export function mostMayFail(n: number, p0: number, conf = 0.95): number {
  if (!(n >= 1) || !(p0 > 0 && p0 < 1)) return -1;
  if (binomUpper(0, n, conf) > p0) return -1;
  let lo = 0, hi = n - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (binomUpper(mid, n, conf) <= p0) lo = mid; else hi = mid - 1;
  }
  return lo;
}

/* --------------------------------------------------------------- the readings */

const meanOf = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sdOf = (xs: number[], m: number) => Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));

/** The adjusted sample skewness G1 = n ÷ ((n − 1)(n − 2)) · Σ((x − x̄) ÷ s)³ —
 *  positive leans high (a long upper tail). Undefined below three readings or
 *  with no spread. */
export function skewness(xs: number[]): number | undefined {
  const n = xs.length;
  if (n < 3) return undefined;
  const m = meanOf(xs), s = sdOf(xs, m);
  if (!(s > 0)) return undefined;
  return (n / ((n - 1) * (n - 2))) * xs.reduce((a, x) => a + ((x - m) / s) ** 3, 0);
}

/** Anderson–Darling against the normal with the mean and spread estimated
 *  (D'Agostino & Stephens, 1986): A², the small-sample A*², and the p-value
 *  from their four pieces. Undefined below eight readings or with no spread.
 *  Not the capability study's shape check — rounding's ties throw it (see
 *  dagostinoPearson); kept, proved, for readings taken finely. */
export function andersonDarling(xs: number[]): { a2: number; a2star: number; p: number } | undefined {
  const n = xs.length;
  if (n < 8) return undefined;
  const m = meanOf(xs), s = sdOf(xs, m);
  if (!(s > 0)) return undefined;
  const F = [...xs].sort((a, b) => a - b).map(x => Math.min(1 - 1e-15, Math.max(1e-15, normalCdf((x - m) / s))));
  let sum = 0;
  for (let i = 0; i < n; i++) sum += (2 * i + 1) * (Math.log(F[i]) + Math.log(1 - F[n - 1 - i]));
  const a2 = -n - sum / n;
  const A = a2 * (1 + 0.75 / n + 2.25 / (n * n));
  const p = A >= 0.6 ? Math.exp(1.2937 - 5.709 * A + 0.0186 * A * A)
    : A >= 0.34 ? Math.exp(0.9177 - 4.279 * A - 1.38 * A * A)
    : A >= 0.2 ? 1 - Math.exp(-8.318 + 42.796 * A - 59.938 * A * A)
    : 1 - Math.exp(-13.436 + 101.14 * A - 223.73 * A * A);
  return { a2, a2star: A, p: Math.min(1, Math.max(0, p)) };
}

/** THE D'AGOSTINO–PEARSON K² TEST of normality (D'Agostino, Belanger &
 *  D'Agostino, 1990): the skewness test (D'Agostino, 1970) and the kurtosis
 *  test (Anscombe & Glynn, 1983) combined, K² = Zs² + Zk², p = e^(−K²/2) —
 *  χ² with two degrees of freedom. From 20 readings, where the kurtosis test
 *  is valid. Undefined below that, or with no spread.
 *
 *  Why this and not Anderson–Darling for the shape check (22 October): the
 *  floor's readings are often whole numbers, and an EDF test is thrown by the
 *  ties rounding makes — on normal readings rounded to whole numbers with a
 *  spread of one to two steps, AD rejected 32–100% at 5%; K² kept 5–8%, with
 *  power close to AD's (scripts/knowledge/independent-cases.py). */
export function dagostinoPearson(xs: number[]): { zSkew: number; zKurt: number; k2: number; p: number } | undefined {
  const n = xs.length;
  if (n < 20) return undefined;
  const m = meanOf(xs);
  let m2 = 0, m3 = 0, m4 = 0;
  for (const x of xs) { const d = x - m, d2 = d * d; m2 += d2; m3 += d2 * d; m4 += d2 * d2; }
  m2 /= n; m3 /= n; m4 /= n;
  if (!(m2 > 1e-300)) return undefined;
  const b1 = m3 / Math.pow(m2, 1.5), b2 = m4 / (m2 * m2);
  /* skewness, D'Agostino (1970) */
  const y = b1 * Math.sqrt(((n + 1) * (n + 3)) / (6 * (n - 2)));
  const beta2 = (3 * (n * n + 27 * n - 70) * (n + 1) * (n + 3)) / ((n - 2) * (n + 5) * (n + 7) * (n + 9));
  const w2 = -1 + Math.sqrt(2 * (beta2 - 1));
  const delta = 1 / Math.sqrt(0.5 * Math.log(w2)), alpha = Math.sqrt(2 / (w2 - 1));
  const zSkew = delta * Math.asinh(y / alpha);
  /* kurtosis, Anscombe & Glynn (1983) */
  const e = (3 * (n - 1)) / (n + 1);
  const varb2 = (24 * n * (n - 2) * (n - 3)) / ((n + 1) * (n + 1) * (n + 3) * (n + 5));
  const x = (b2 - e) / Math.sqrt(varb2);
  const sb1 = ((6 * (n * n - 5 * n + 2)) / ((n + 7) * (n + 9))) * Math.sqrt((6 * (n + 3) * (n + 5)) / (n * (n - 2) * (n - 3)));
  const A = 6 + (8 / sb1) * (2 / sb1 + Math.sqrt(1 + 4 / (sb1 * sb1)));
  const den = 1 + x * Math.sqrt(2 / (A - 4));
  if (den === 0) return undefined;
  const t2 = Math.sign(den) * Math.cbrt((1 - 2 / A) / Math.abs(den));
  const zKurt = (1 - 2 / (9 * A) - t2) / Math.sqrt(2 / (9 * A));
  const k2 = zSkew * zSkew + zKurt * zKurt;
  return { zSkew, zKurt, k2, p: Math.exp(-k2 / 2) };
}

/** An individuals chart's limits from the readings in order: x̄ ± 2.66 · MR̄
 *  (2.66 = 3 ÷ 1.128). */
export function individualsLimits(xs: number[]): { centre: number; lcl: number; ucl: number; mrBar: number } | undefined {
  if (xs.length < 2) return undefined;
  const centre = meanOf(xs);
  let t = 0;
  for (let i = 1; i < xs.length; i++) t += Math.abs(xs[i] - xs[i - 1]);
  const mrBar = t / (xs.length - 1);
  return { centre, lcl: centre - 2.66 * mrBar, ucl: centre + 2.66 * mrBar, mrBar };
}

/** The first run of `len` or more readings in a row on one side of the
 *  centre (a reading on the centre breaks it) — positions are 0-based. */
export function runOnOneSide(xs: number[], centre: number, len = 8): { from: number; to: number; side: 'above' | 'below' } | undefined {
  let start = 0, side: 'above' | 'below' | undefined;
  for (let i = 0; i <= xs.length; i++) {
    const s = i < xs.length ? (xs[i] > centre ? 'above' : xs[i] < centre ? 'below' : undefined) : undefined;
    if (s !== side || s === undefined) {
      if (side && i - start >= len) return { from: start, to: i - 1, side };
      start = i; side = s;
    }
  }
  return undefined;
}

/** Bissell's (1990) approximate one-sided lower confidence bound on Ppk (or
 *  Cpk): P̂pk − z·√(1 ÷ 9n + P̂pk² ÷ 2(n − 1)). Its coverage was checked by
 *  simulation in scripts/knowledge/independent-cases.py (≈ 95% at n 30–100). */
export function ppkLowerBound(ppk: number, n: number, conf = 0.95): number {
  const z = normalQuantile(conf);
  return ppk - z * Math.sqrt(1 / (9 * n) + (ppk * ppk) / (2 * (n - 1)));
}

const niceWidth = (raw: number): number => {
  const p = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-12))), m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
};

/** A histogram's bars: about √n of them (5 to 12) on a round width, the
 *  first edge a multiple of it, wide enough to hold every reading and any
 *  limits given. */
export function histogram(xs: number[], also: number[] = []): { edges: number[]; counts: number[]; width: number } | undefined {
  if (!xs.length) return undefined;
  const all = [...xs, ...also.filter(Number.isFinite)];
  let lo = Math.min(...all), hi = Math.max(...all);
  if (hi === lo) { lo -= 0.5; hi += 0.5; }
  const k = Math.min(12, Math.max(5, Math.round(Math.sqrt(xs.length))));
  const width = niceWidth((hi - lo) / k);
  const start = Math.floor(lo / width) * width;
  const bars = Math.max(1, Math.ceil((hi - start) / width + 1e-9));
  const edges = Array.from({ length: bars + 1 }, (_, i) => +(start + i * width).toFixed(10));
  const counts = new Array(bars).fill(0);
  for (const x of xs) counts[Math.min(bars - 1, Math.max(0, Math.floor((x - start) / width + 1e-9)))]++;
  return { edges, counts, width };
}

/** "fewer than 14 in 100" — a share bound said the way a person would, the
 *  count rounded up so the claim never flatters: in 100 from about 1 in 100,
 *  in 1,000 from about 1 in 1,000, else in 10,000. */
export function fewerThan(p: number): string {
  if (p >= 0.995) return 'nearly all';
  const d = p >= 0.009 ? 100 : p >= 0.0009 ? 1000 : 10000;
  const k = Math.max(1, Math.ceil(p * d - 1e-9));
  return `fewer than ${k.toLocaleString('en-GB')} in ${d.toLocaleString('en-GB')}`;
}

/* ======================= W1 — THE CAPABILITY STUDY'S MODES ===================
 * knowledge/specs/FC-094-capability.md parts 2–4 (24 October): rejects out of
 * what was made (the binomial), faults found on each item (the Poisson), the
 * attribute charts' limits and Laney's correction, the equivalent Z, machine
 * capability and the lowest legal fill. Independent cases:
 * scripts/knowledge/cases-w1.py. */

/** P(X ≤ k) for a Poisson count with mean λ, the terms summed in logs. */
export function poissonCdf(k: number, lambda: number): number {
  if (lambda <= 0) return 1;
  let sum = 0;
  for (let i = 0; i <= Math.floor(k); i++) sum += Math.exp(i * Math.log(lambda) - lambda - lnGamma(i + 1));
  return Math.min(1, sum);
}

/** The exact one-sided upper bound on a Poisson rate per unit: the λ with P(X ≤ c) = 1 − conf,
 *  divided by the units N — χ²(conf; 2c + 2) / 2N. With c = 0 it is −ln(1 − conf)/N. */
export function poissonUpper(c: number, N: number, conf = 0.95): number {
  if (N <= 0) return NaN;
  if (c <= 0) return -Math.log(1 - conf) / N;
  let lo = c, hi = c + 10 * Math.sqrt(c) + 10;
  for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (poissonCdf(c, mid) > 1 - conf) lo = mid; else hi = mid; }
  return (lo + hi) / 2 / N;
}

/** The exact one-sided lower bound on a Poisson rate per unit: the λ with P(X ≥ c) = 1 − conf —
 *  χ²(1 − conf; 2c) / 2N; 0 when c = 0. */
export function poissonLower(c: number, N: number, conf = 0.95): number {
  if (N <= 0) return NaN;
  if (c <= 0) return 0;
  let lo = 0, hi = c;
  for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (1 - poissonCdf(c - 1, mid) < 1 - conf) lo = mid; else hi = mid; }
  return (lo + hi) / 2 / N;
}

/** A p-chart's limits for one run of nᵢ around the pooled p̄ (the lower cut at 0); the u-chart's
 *  are the same shape with ū/nᵢ under the root (`uLimits`). */
export const pLimits = (pBar: number, n: number): { lcl: number; ucl: number } => {
  const s = Math.sqrt(Math.max(0, pBar * (1 - pBar)) / n);
  return { lcl: Math.max(0, pBar - 3 * s), ucl: Math.min(1, pBar + 3 * s) };
};
export const uLimits = (uBar: number, n: number): { lcl: number; ucl: number } => {
  const s = Math.sqrt(Math.max(0, uBar) / n);
  return { lcl: Math.max(0, uBar - 3 * s), ucl: uBar + 3 * s };
};

/** Laney's σz: each run's z against the plain limits, the moving range of the z's ÷ 1.128. Near 1
 *  the plain chart is right; well above it the runs vary more than the count alone says and the
 *  limits are widened by σz (Laney 2002 — via secondary summaries, knowledge/GAPS.md). */
export function laneySigmaZ(rates: number[], sizes: number[], bar: number, kind: 'p' | 'u' = 'p'): number | undefined {
  if (rates.length < 3) return undefined;
  const z = rates.map((r, i) => {
    const s = Math.sqrt((kind === 'p' ? bar * (1 - bar) : bar) / sizes[i]);
    return s > 0 ? (r - bar) / s : 0;
  });
  let mr = 0;
  for (let i = 1; i < z.length; i++) mr += Math.abs(z[i] - z[i - 1]);
  return mr / (z.length - 1) / 1.128;
}
/** Laney is applied when σz is outside this band — a choice of the specification, said on screen. */
export const LANEY_BAND: readonly [number, number] = [0.8, 1.25];

/** The equivalent Z of a share failing (Φ⁻¹(1 − p)), the Ppk it compares with (Z/3) and the
 *  "sigma level" by the 1.5-shift convention — a comparison only, never a verdict. */
export function processZ(p: number): { z: number; ppkEq: number; sigma: number } | undefined {
  if (!(p > 0) || !(p < 1)) return undefined;
  const z = normalQuantile(1 - p);
  return { z, ppkEq: z / 3, sigma: z + 1.5 };
}

/** Machine capability on consecutive parts (ISO 22514-3's Cm, Cmk — scope confirmed, text unread):
 *  Cm = (U − L)/6s, Cmk from the nearer limit; one limit gives Cmk alone. */
export function cmCmk(mean: number, sd: number, lower?: number, upper?: number): { cm?: number; cmk?: number } {
  if (!(sd > 0)) return {};
  const cm = lower !== undefined && upper !== undefined ? (upper - lower) / (6 * sd) : undefined;
  const sides = [upper !== undefined ? (upper - mean) / (3 * sd) : undefined, lower !== undefined ? (mean - lower) / (3 * sd) : undefined].filter((x): x is number => x !== undefined);
  return { ...(cm !== undefined ? { cm } : {}), ...(sides.length ? { cmk: Math.min(...sides) } : {}) };
}

/** The lowest legal fill (FC-157): the mean each of the packers' three rules needs at this spread —
 *  rule 1 the nominal; rule 2 at most 2.5% below nominal − TNE; rule 3 none below nominal − 2·TNE,
 *  read as at most 1 in 10,000 (the specification's reading, said) — and the largest of them. */
export function fillTargets(nominal: number, sd: number, tne: number): { rule1: number; rule2: number; rule3: number; lowest: number; binds: 1 | 2 | 3 } {
  const rule1 = nominal;
  const rule2 = nominal - tne + normalQuantile(0.975) * sd;
  const rule3 = nominal - 2 * tne + normalQuantile(0.9999) * sd;
  const lowest = Math.max(rule1, rule2, rule3);
  const binds = lowest === rule1 ? 1 : lowest === rule2 ? 2 : 3;
  return { rule1, rule2, rule3, lowest, binds };
}

/* ======================= W1, PART 4 — THE HEADS AND THE F TEST =================== */

/** The regularised incomplete beta I_x(a, b) by the continued fraction (Numerical Recipes betacf),
 *  enough for the F distribution's tail at the sizes a study has. */
export function betaInc(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  const cf = (a: number, b: number, x: number): number => {
    const TINY = 1e-300, EPS = 3e-14;
    const qab = a + b, qap = a + 1, qam = a - 1;
    let c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < TINY) d = TINY;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= 300; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY; c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY; c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY; d = 1 / d;
      const del = d * c; h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  };
  return x < (a + 1) / (a + b + 2) ? bt * cf(a, b, x) / a : 1 - bt * cf(b, a, 1 - x) / b;
}

/** P(F ≤ f) on d1 and d2 degrees of freedom. */
export function fCdf(f: number, d1: number, d2: number): number {
  if (f <= 0) return 0;
  return betaInc(d1 / 2, d2 / 2, d1 * f / (d1 * f + d2));
}

/** ONE-WAY ANOVA across groups (`stats.anova`): F, its p, the degrees of freedom — undefined with
 *  fewer than two groups of two, or no spread within the groups. Checked against SciPy's f_oneway
 *  (cases-w1.py: four heads F 283.858, p 4.4e-14; three agreeing heads F 0.141, p 0.870). */
export function anovaOneWay(groups: number[][]): { f: number; p: number; df1: number; df2: number } | undefined {
  const g = groups.filter(x => x.length >= 2);
  if (g.length < 2) return undefined;
  const all = g.flat(), N = all.length, grand = all.reduce((a, b) => a + b, 0) / N;
  const ssb = g.reduce((s, x) => { const m = x.reduce((a, b) => a + b, 0) / x.length; return s + x.length * (m - grand) ** 2; }, 0);
  const ssw = g.reduce((s, x) => { const m = x.reduce((a, b) => a + b, 0) / x.length; return s + x.reduce((t, v) => t + (v - m) ** 2, 0); }, 0);
  const df1 = g.length - 1, df2 = N - g.length;
  if (!(ssw > 0) || df2 < 1) return undefined;
  const f = (ssb / df1) / (ssw / df2);
  return { f, p: 1 - fCdf(f, df1, df2), df1, df2 };
}
