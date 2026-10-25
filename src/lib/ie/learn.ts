/* THE LEARNING CURVE — how a new job's time falls with repetition (FC-027; knowledge/methods/ie/learning-curve.md, knowledge/specs/FC-027-learning.md).
 * Wright's (1936) unit-time form: Tₙ = T₁·nᵇ, b = log₂(the learning rate), fitted by least squares on ln Tₙ against ln n. Pure, proved against SciPy
 * (scripts/knowledge/cases-w3c.py, the record's eight runs) in __tests__/learn.test.ts. */
import { relate, type Line } from './relate';

/** A curve is fitted from this many runs (the record: five or six, spanning a doubling or two). */
export const LEARN_FROM = 6;
/** A standard reached beyond this many times the runs timed is a guess, not a forecast. */
export const LEARN_FAR = 4;
/** A curve flattens when the last four runs fall by less than this share of the fitted rate of fall — Faultline's choice. */
export const PLATEAU_SHARE = 0.25;

export interface Learning {
  n: number; b: number; t1: number; rate: number; rateLo: number; rateHi: number; r2: number; line: Line;
  /** the fitted time at run k */
  at: (k: number) => number;
  /** the average time of the runs timed, and what the fit gives for the last */
  cumAvg: number;
  /** the run, from the fit, at which the time reaches the standard — rounded up; undefined if it never does (b is not falling) */
  nStar?: number;
  /** the first run actually timed at or under the standard */
  reached?: number;
  /** the curve has flattened above the standard: the slope of ln T on ln n over the last four runs */
  plateau?: { slope: number };
  far: boolean;
  /** the time over the standard, summed over runs 1…n*, per unit of the first run's kind (seconds) — the labour of learning */
  extra?: number;
}

export function learningCurve(times: number[], conf: number, standard?: number): Learning | undefined {
  const n = times.length;
  if (n < LEARN_FROM || times.some(t => !(t > 0))) return undefined;
  const lx = times.map((_, i) => Math.log(i + 1)), ly = times.map(Math.log);
  const line = relate(lx, ly, conf);
  if (!line) return undefined;
  const b = line.slope, t1 = Math.exp(line.intercept), at = (k: number): number => t1 * Math.pow(k, b);
  const out: Learning = { n, b, t1, rate: Math.pow(2, b), rateLo: Math.pow(2, line.slopeLo), rateHi: Math.pow(2, line.slopeHi), r2: line.r2, line, at, cumAvg: times.reduce((a, c) => a + c, 0) / n, far: false };
  if (standard !== undefined && standard > 0) {
    const idx = times.findIndex(t => t <= standard);
    if (idx >= 0) out.reached = idx + 1;
    if (b < 0 && at(1) > standard) {
      const raw = Math.pow(standard / t1, 1 / b);
      out.nStar = Math.max(1, Math.ceil(raw - 1e-9));
      out.far = out.nStar > LEARN_FAR * n;
      if (!out.far && out.nStar <= 5000) { let s = 0; for (let k = 1; k <= out.nStar; k++) s += Math.max(0, at(k) - standard); out.extra = s; }
    }
    if (n >= 8 && b < 0 && times[n - 1] > standard) {
      const tail = relate(lx.slice(-4), ly.slice(-4), conf) ?? undefined;
      const s4 = tail ? tail.slope : (new Set(ly.slice(-4)).size === 1 ? 0 : undefined);
      if (s4 !== undefined && Math.abs(s4) < PLATEAU_SHARE * Math.abs(b)) out.plateau = { slope: s4 };
    }
  }
  return out;
}
