/* THE GAUGE STUDIES — is a measuring instrument fit for the tolerance it judges (FC-119, the Type 1 study), does it read true
 * across its range (bias and linearity, FC-120) and does it hold over time (stability, FC-120). knowledge/methods/msa/
 * type1-gauge.md and msa/bias-linearity-stability.md; knowledge/specs/FC-119-gauge.md. Pure, proved against SciPy/NumPy
 * (scripts/knowledge/cases-w3c.py) in __tests__/gauge.test.ts.
 *
 * The constants are the automotive practice's (VDA volume 5; Bosch booklet 10) and are Faultline's DEFAULTS, said on the page and
 * changeable where they are agreed: the gauge's 6s may use 20% of the tolerance, Cg and Cgk are wanted at 1.33 or more, the bias
 * is charged against half that slice (10% of the tolerance), the least count at most 5% of the tolerance. The text of VDA 5 was
 * not read (knowledge/GAPS.md). */
import { mean, sd, tCdf, tQuantile } from './stats';
import { relate, type Line } from './relate';
import { mannKendall, nelson, xmrLimits, type Signal } from './charts';

export const SLICE = 0.2;
export const CG_NEED = 1.33;
export const RESOLUTION_MAX = 0.05;
/** A Type 1 study is read from this many readings and called firm from this many (the record: 25 to 50). */
export const TYPE1_FROM = 10, TYPE1_FIRM = 25;
/** Bias and linearity: each reference from this many readings (the record: ten), the line from this many references (the record: five). */
export const REF_READINGS_FROM = 5, REF_READINGS_FIRM = 10, REFS_FROM = 4, REFS_FIRM = 5;
/** Stability: the limits are drawn from this many first readings unless agreed otherwise, and not from fewer than BASE_MIN. */
export const BASELINE = 20, BASE_MIN = 8;

const twoSidedT = (t: number, df: number): number => 2 * (1 - tCdf(Math.abs(t), df));

/** The tolerance of what the gauge judges: both limits, or one limit and the target it is measured from (twice the distance). */
export function toleranceOf(lower?: number, upper?: number, target?: number): { T: number; how: 'both' | 'one' } | undefined {
  if (lower !== undefined && upper !== undefined && upper > lower) return { T: upper - lower, how: 'both' };
  const lim = lower ?? upper;
  if ((lower === undefined) !== (upper === undefined) && target !== undefined && lim !== undefined && target !== lim) return { T: 2 * Math.abs(target - lim), how: 'one' };
  return undefined;
}

/** The smallest step the readings show: the least gap between two different values. Undefined if every reading is the same. */
export function leastCount(xs: number[]): number | undefined {
  const s = [...new Set(xs)].sort((a, b) => a - b);
  if (s.length < 2) return undefined;
  let g = Infinity; for (let i = 1; i < s.length; i++) g = Math.min(g, s[i] - s[i - 1]);
  return Number(g.toPrecision(8));
}

/* ------------------------------------------------------------------ Type 1 */
export interface Type1 {
  n: number; mean: number; s: number; bias: number; biasLo: number; biasHi: number; t: number; p: number;
  /** the bias is real: the interval leaves zero */
  real: boolean;
  /** Cg = slice·T ÷ 6s; Cgk = (slice·T ÷ 2 − |bias|) ÷ 3s — undefined when s is 0 */
  cg?: number; cgk?: number;
  /** 6s as a share of T */
  share6s: number; T: number; slice: number; need: number;
  /** the least count the readings step by, and as a share of T */
  step?: number; stepShare?: number; stepOk?: boolean;
  /** fit: both indices at or above the need; biased: Cg passes and Cgk does not; notFit: Cg fails */
  verdict: 'fit' | 'biased' | 'notFit' | 'noSpread';
}
export function type1(xs: number[], reference: number, T: number, o: { slice?: number; need?: number; conf?: number; resolution?: number } = {}): Type1 | undefined {
  const n = xs.length; if (n < 3 || !(T > 0)) return undefined;
  const slice = o.slice ?? SLICE, need = o.need ?? CG_NEED, conf = o.conf ?? 0.95;
  const m = mean(xs), s = sd(xs), bias = m - reference, tq = tQuantile(1 - (1 - conf) / 2, n - 1);
  const half = tq * s / Math.sqrt(n), t = s > 0 ? bias / (s / Math.sqrt(n)) : bias === 0 ? 0 : Infinity;
  const out: Type1 = { n, mean: m, s, bias, biasLo: bias - half, biasHi: bias + half, t, p: s > 0 ? twoSidedT(t, n - 1) : bias === 0 ? 1 : 0, real: s > 0 ? Math.abs(t) > tq : bias !== 0, share6s: 6 * s / T, T, slice, need, verdict: 'noSpread' };
  if (s > 0) {
    out.cg = slice * T / (6 * s); out.cgk = (slice * T / 2 - Math.abs(bias)) / (3 * s);
    out.verdict = out.cg >= need && out.cgk >= need ? 'fit' : out.cg >= need ? 'biased' : 'notFit';
  }
  const step = o.resolution ?? leastCount(xs);
  if (step !== undefined) { out.step = step; out.stepShare = step / T; out.stepOk = step / T <= RESOLUTION_MAX; }
  return out;
}

/* ------------------------------------------------------------------ bias across the range */
export interface RefBias { ref: number; n: number; mean: number; s: number; bias: number; t: number; p: number; real: boolean }
export interface RangeFigures {
  refs: RefBias[]; /** references with too few readings, left out */ left: { ref: number; n: number }[];
  line?: Line; /** the bias at one reference by the line — and the true value for a gauge reading it */ at?: { x: number; bias: number; inside: boolean; trueValue: number };
  /** the readings' own bias, all references, and whether one offset would do */
  anyReal: boolean; sloped: boolean; constant: boolean; worst?: RefBias;
}
/** Bias at each reference and the line of bias on reference (linearity) — the record's form: the biases at the references regressed on the reference. */
export function rangeStudy(rs: { ref: number; value: number }[], conf = 0.95, at?: number): RangeFigures {
  const by = new Map<number, number[]>();
  for (const r of rs) { const k = by.get(r.ref) ?? []; k.push(r.value); by.set(r.ref, k); }
  const refs: RefBias[] = [], left: { ref: number; n: number }[] = [];
  for (const [ref, v] of [...by.entries()].sort((a, b) => a[0] - b[0])) {
    if (v.length < REF_READINGS_FROM) { left.push({ ref, n: v.length }); continue; }
    const m = mean(v), s = sd(v), bias = m - ref, t = s > 0 ? bias / (s / Math.sqrt(v.length)) : bias === 0 ? 0 : Infinity, df = v.length - 1;
    refs.push({ ref, n: v.length, mean: m, s, bias, t, p: s > 0 ? twoSidedT(t, df) : bias === 0 ? 1 : 0, real: s > 0 ? Math.abs(t) > tQuantile(1 - (1 - conf) / 2, df) : bias !== 0 });
  }
  const out: RangeFigures = { refs, left, anyReal: refs.some(r => r.real), sloped: false, constant: false };
  if (refs.length >= REFS_FROM) {
    const line = relate(refs.map(r => r.ref), refs.map(r => r.bias), conf);
    if (line) {
      out.line = line; out.sloped = line.pR < 1 - conf;
      out.constant = !out.sloped && out.anyReal;
      if (at !== undefined) { const b = line.intercept + line.slope * at; out.at = { x: at, bias: b, inside: at >= line.xRange[0] && at <= line.xRange[1], trueValue: at - b }; }
    }
  }
  if (refs.length) out.worst = refs.reduce((a, b) => (Math.abs(b.bias) > Math.abs(a.bias) ? b : a));
  return out;
}

/* ------------------------------------------------------------------ stability */
export interface Stability {
  n: number; baseline: number; centre: number; mrBar: number; sigma: number; lcl: number; ucl: number;
  signals: Signal[]; /** the first reading (1-based) a signal fires at after the baseline */ first?: number; /** a signal inside the baseline: its limits come from a period that was not steady */ inBaseline?: number;
  trend?: { tau: number; p: number; slope: number };
  /** the baseline's own bias against the reference, when one is known */
  bias?: number;
}
export function stability(xs: number[], baseline = BASELINE, reference?: number): Stability | undefined {
  const n = xs.length, base = Math.min(Math.max(BASE_MIN, Math.round(baseline)), n);
  if (n < BASE_MIN) return undefined;
  const lim = xmrLimits(xs.slice(0, base)); if (!lim || !(lim.sigma > 0)) return undefined;
  const signals = nelson(xs, lim.centre, lim.sigma);
  const last = (s: Signal) => s.points[s.points.length - 1];
  const after = signals.filter(s => last(s) > base), inside = signals.filter(s => last(s) <= base);
  const mk = n >= 12 ? mannKendall(xs) : undefined;
  return { n, baseline: base, centre: lim.centre, mrBar: lim.mrBar, sigma: lim.sigma, lcl: lim.lcl, ucl: lim.ucl, signals,
    ...(after.length ? { first: Math.min(...after.map(last)) } : {}), ...(inside.length ? { inBaseline: Math.min(...inside.map(last)) } : {}),
    ...(mk ? { trend: { tau: mk.tau, p: mk.p, slope: mk.slope } } : {}), ...(reference !== undefined ? { bias: lim.centre - reference } : {}) };
}
