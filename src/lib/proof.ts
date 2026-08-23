/* The proof arithmetic — one module, so the Case page, the capture chip and
 * the meeting can never disagree about whether an improvement is proven.
 *
 * The method (why per-event, not per-week): weekly totals depend on how much
 * anyone WATCHED — walk the line less and the trend "improves" whether or not
 * the problem did. The mean duration of one event doesn't have that bias, as
 * long as before and after measure the same scope the same way. So the study
 * compares means per event with both sample sizes always shown, and projects
 * the £ using the BASELINE's frequency — stated, never hidden:
 *   saved/week = baselineMsWeek × (1 − meanAfter / meanBefore)
 *
 * The hardening (why receipts, density, significance):
 *  · A called verdict FREEZES into a receipt — otherwise next month's data
 *    silently rewrites last month's claim, and nothing is auditable.
 *  · Sample DENSITY is carried (n over how much calendar) — a 3-day blitz of
 *    logging can't impersonate three months of collection.
 *  · The verdict passes a significance gate (Welch one-sided t) — a 9% "win"
 *    from five noisy samples is within noise, and saying so is the product. */
import type { Case, Observation, StudyReceipt } from '../types';

export interface StudyResult {
  beforeN: number;
  beforeMeanMs: number;
  afterN: number;
  afterMeanMs: number;
  targetN: number;
  /** afterN >= targetN — enough sample to call it */
  enough: boolean;
  /** negative = better. null until there's at least one sample each side. */
  changePct: number | null;
  /** projected ms/week recovered (negative = costing more). null until callable. */
  savedMsWeek: number | null;
  /** true = the numbers above are the FROZEN receipt, not a live recompute */
  frozen: boolean;
  /** Welch one-sided p (after < before). null = too few samples (n<3 a side). */
  pValue: number | null;
  /** p < SIGNIFICANCE_P. null = untestable (grandfathered — treated as pass). */
  significant: boolean | null;
  /** calendar covered by each sample — the density denominators */
  beforeSpanMs: number;
  afterSpanMs: number;
  /** events/week either side (informational; the £ claim stays duration-based) */
  beforeRateWk: number | null;
  afterRateWk: number | null;
  /** armed long ago and still short of target — the study has drifted */
  stale: boolean;
  /** what the scope did AFTER the verdict was called — is the fix holding? */
  sinceCall: { n: number; meanMs: number; slipping: boolean } | null;
}

const WEEK_MS = 7 * 24 * 3600_000;
const STALE_MS = 60 * 24 * 3600_000; // armed >60 days without reaching target
export const SIGNIFICANCE_P = 0.1;   // one-sided; humane for factory sample sizes
const SLIP_FACTOR = 1.3;             // since-call mean drifts 30% above the receipt's

/* ---------- Welch's t, one-sided — is "after < before" real or noise? ---------- */

function gammaln(x: number): number {
  // Lanczos approximation — plenty for p-values on factory sample sizes
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function betacf(a: number, b: number, x: number): number {
  // continued fraction for the incomplete beta (Numerical Recipes form)
  const EPS = 3e-9, FPMIN = 1e-30, MAXIT = 200;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Regularized incomplete beta I_x(a,b). */
function regIncBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(gammaln(a + b) - gammaln(a) - gammaln(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** One-sided p for H1: afterMean < beforeMean, via Welch's t with
 *  Welch–Satterthwaite df. null when either side has n < 3 (untestable). */
export function welchOneSidedP(before: number[], after: number[]): number | null {
  const n1 = before.length, n2 = after.length;
  if (n1 < 3 || n2 < 3) return null;
  const mean = (xs: number[]) => xs.reduce((a, v) => a + v, 0) / xs.length;
  const m1 = mean(before), m2 = mean(after);
  const svar = (xs: number[], m: number) => xs.reduce((a, v) => a + (v - m) * (v - m), 0) / (xs.length - 1);
  const v1 = svar(before, m1), v2 = svar(after, m2);
  const se2 = v1 / n1 + v2 / n2;
  if (se2 <= 0) return m2 < m1 ? 0 : 1; // zero spread both sides — the means ARE the truth
  const t = (m1 - m2) / Math.sqrt(se2);
  const df = (se2 * se2) / (((v1 / n1) * (v1 / n1)) / (n1 - 1) + ((v2 / n2) * (v2 / n2)) / (n2 - 1));
  // Student-t upper tail: P(T ≥ t) = ½·I_x(df/2, ½) with x = df/(df+t²), t ≥ 0
  const x = df / (df + t * t);
  const tail = 0.5 * regIncBeta(df / 2, 0.5, x);
  return t >= 0 ? tail : 1 - tail;
}

/* ---------- the study, derived ---------- */

/** Derive the study's state from the case + its SCOPED observations (the
 *  caller applies the drill; deleted rows must already be excluded).
 *  A called study with a receipt reads FROM the receipt — frozen — and the
 *  live rows only answer "is it holding?". A called study without one
 *  (legacy) still computes live, exactly as before. */
export function studyResult(c: Case, scoped: Observation[], now = Date.now()): StudyResult | null {
  if (!c.study) return null;
  const { startedAt, targetN, closedAt, receipt } = c.study;

  // "is it holding?" — everything logged in-scope after the verdict was called
  const sinceCall = (() => {
    if (closedAt == null) return null;
    const calledAt = receipt?.calledAt ?? closedAt;
    const rows = scoped.filter(o => o.startedAt >= calledAt);
    if (rows.length === 0) return { n: 0, meanMs: 0, slipping: false };
    const meanMs = rows.reduce((a, o) => a + o.durationMs, 0) / rows.length;
    const ref = receipt?.afterMeanMs ?? 0;
    return { n: rows.length, meanMs, slipping: ref > 0 && rows.length >= 5 && meanMs > ref * SLIP_FACTOR };
  })();

  if (closedAt != null && receipt) {
    return {
      beforeN: receipt.beforeN,
      beforeMeanMs: receipt.beforeMeanMs,
      afterN: receipt.afterN,
      afterMeanMs: receipt.afterMeanMs,
      targetN,
      enough: receipt.afterN >= targetN,
      changePct: receipt.changePct,
      savedMsWeek: receipt.savedMsWeek,
      frozen: true,
      pValue: receipt.pValue,
      // legacy receipts carry pValue:null — grandfathered, never retro-failed
      significant: receipt.pValue == null ? null : receipt.pValue < SIGNIFICANCE_P,
      beforeSpanMs: receipt.beforeSpanMs,
      afterSpanMs: receipt.afterSpanMs,
      beforeRateWk: receipt.beforeRateWk,
      afterRateWk: receipt.afterRateWk,
      stale: false,
      sinceCall,
    };
  }

  const before = scoped.filter(o => o.startedAt < startedAt);
  const after = scoped.filter(o => o.startedAt >= startedAt && (closedAt == null || o.startedAt < closedAt));
  const mean = (rows: Observation[]) => (rows.length ? rows.reduce((a, o) => a + o.durationMs, 0) / rows.length : 0);
  const beforeMeanMs = mean(before);
  const afterMeanMs = mean(after);
  const callable = before.length > 0 && after.length > 0 && beforeMeanMs > 0;
  const changePct = callable ? Math.round(((afterMeanMs - beforeMeanMs) / beforeMeanMs) * 100) : null;
  const savedMsWeek = callable ? c.baselineMsWeek * (1 - afterMeanMs / beforeMeanMs) : null;

  const endAt = closedAt ?? now;
  const beforeSpanMs = before.length ? startedAt - Math.min(...before.map(o => o.startedAt)) : 0;
  const afterSpanMs = Math.max(0, endAt - startedAt);
  const rate = (n: number, spanMs: number) => (n > 0 && spanMs > 0 ? (n / spanMs) * WEEK_MS : null);
  const pValue = welchOneSidedP(before.map(o => o.durationMs), after.map(o => o.durationMs));

  return {
    beforeN: before.length,
    beforeMeanMs,
    afterN: after.length,
    afterMeanMs,
    targetN,
    enough: after.length >= targetN,
    changePct,
    savedMsWeek,
    frozen: false,
    pValue,
    significant: pValue == null ? null : pValue < SIGNIFICANCE_P,
    beforeSpanMs,
    afterSpanMs,
    beforeRateWk: rate(before.length, beforeSpanMs),
    afterRateWk: rate(after.length, afterSpanMs),
    stale: closedAt == null && after.length < targetN && now - startedAt > STALE_MS,
    sinceCall,
  };
}

/** Freeze the live numbers into the receipt, at the moment of calling.
 *  null when the study isn't callable yet (no sample one side). */
export function makeReceipt(r: StudyResult, calledAt: number): StudyReceipt | null {
  if (r.changePct == null || r.savedMsWeek == null) return null;
  return {
    beforeN: r.beforeN,
    beforeMeanMs: r.beforeMeanMs,
    afterN: r.afterN,
    afterMeanMs: r.afterMeanMs,
    changePct: r.changePct,
    savedMsWeek: r.savedMsWeek,
    beforeSpanMs: r.beforeSpanMs,
    afterSpanMs: r.afterSpanMs,
    beforeRateWk: r.beforeRateWk,
    afterRateWk: r.afterRateWk,
    pValue: r.pValue,
    calledAt,
  };
}

/** ONE definition of a win, product-wide: better on average, £ recovered,
 *  and past the significance gate. `significant === null` (untestable or a
 *  legacy receipt) passes — never retro-fail what was called before the gate
 *  existed; `=== false` fails — "better, but within noise" is not proven. */
export const provenWin = (r: StudyResult): boolean =>
  (r.changePct ?? 0) < 0 && (r.savedMsWeek ?? 0) > 0 && r.significant !== false;

/** Default sample size to promise: match the baseline's n, kept humane. */
export const defaultTargetN = (beforeN: number): number => Math.min(20, Math.max(5, beforeN));

/** A span of calendar, in words a room reads aloud: "6 days", "8 wks". */
export function fmtSpan(ms: number): string {
  const d = ms / (24 * 3600_000);
  if (d < 1) return 'under a day';
  if (d < 14) return `${Math.round(d)} days`;
  return `${Math.round(d / 7)} wks`;
}
