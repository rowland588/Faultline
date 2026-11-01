/* TWO-LEVEL FACTORIAL EXPERIMENTS — the design, the effects and which are real (FC-111; knowledge/specs/FC-111-doe.md; knowledge/methods/stats/doe-factorial.md).
 *
 * k factors each at a low (−1) and a high (+1) setting, every one of the 2^k corners run `r` times, in a random order. The design matrix is the
 * columns of −1/+1 in Yates' standard order (the first factor changes fastest) and an interaction's column is the product of its factors'.
 * The effect of a term is the mean response where its column is +1 less the mean where it is −1: contrast ÷ (r·2^(k−1)); its sum of squares is
 * contrast² ÷ (r·2^k); the coefficient in the coded model is half the effect. Which effects are real:
 *   · with replicates, the pure error (the spread of the readings within a corner) gives MSE on 2^k(r − 1) degrees of freedom, SE(effect) =
 *     √(4·MSE ÷ (r·2^k)), and a term is real when its two-sided t-test is under 1 − confidence (Montgomery, Design and Analysis of Experiments, ch. 6);
 *   · with one run a corner there is no error estimate, so Lenth's pseudo standard error (1989): s₀ = 1.5·median|effect|, PSE = 1.5·median of the
 *     |effects| under 2.5·s₀, the margin of error ME = t(1 − (1 − conf)/2, m/3)·PSE for the m = 2^k − 1 effects, and the simultaneous margin SME
 *     with γ = (1 + conf^(1/m))/2; a term is real beyond ME, firm beyond SME.
 * Centre points (every factor at the middle) give a pure error of their own and a test for curvature (Montgomery §6.8): SS = n_F·n_C·(ȳ_F − ȳ_C)² ÷
 * (n_F + n_C) against the centre points' own variance. The fitted model keeps the real terms and the lower-order terms they stand on (the
 * hierarchy principle). Pure, and proved against SciPy/NumPy (scripts/knowledge/cases-m6-analysis.py) and Montgomery's printed examples in
 * __tests__/factorial.test.ts — never against its own output. */
import { fCdf } from './dist';
import { mean, tCdf, tQuantile } from './stats';

/* ------------------------------ the run order ------------------------------------------ */
/** mulberry32 — a small seeded generator, so a run order shuffled from a stored seed is the same every time it is read. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** 0…n−1 shuffled (Fisher–Yates) from `seed`. */
export function shuffled(n: number, seed: number): number[] {
  const rnd = mulberry32(seed), a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ------------------------------ the design ---------------------------------------------- */
/** The coded levels of corner `i` in standard order: the first factor is − then +, the second −−++, … */
export const cornerOf = (k: number, i: number): (-1 | 1)[] => Array.from({ length: k }, (_, j) => (((i >> j) & 1) ? 1 : -1));
/** The standard-order index of a coded corner (−1/+1 each), or undefined if a level is neither. */
export function cornerIndex(levels: number[]): number | undefined {
  let i = 0;
  for (let j = 0; j < levels.length; j++) { if (levels[j] === 1) i |= 1 << j; else if (levels[j] !== -1) return undefined; }
  return i;
}
/** The factors in a term, by its mask: 1 → [0] (A), 3 → [0, 1] (AB). Terms in Yates' order are masks 1…2^k − 1. */
export const factorsOfMask = (mask: number, k: number): number[] => Array.from({ length: k }, (_, j) => j).filter(j => (mask >> j) & 1);
const signOf = (mask: number, i: number): number => { let s = 1; for (let j = 0; (1 << j) <= mask; j++) if (((mask >> j) & 1) && !((i >> j) & 1)) s = -s; return s; };

export interface PlannedRun { /** 1-based place in the order the runs are made */ no: number; /** corner, standard order (−1 for a centre run) */ std: number; /** which time this corner is run (1…r), or the centre run's number */ rep: number; levels: number[]; centre: boolean }
/** The runs in the order to make them: every corner `r` times and `centre` centre runs, shuffled from `seed`. */
export function planRuns(k: number, r: number, centre: number, seed: number): PlannedRun[] {
  const all: Omit<PlannedRun, 'no'>[] = [];
  for (let rep = 1; rep <= r; rep++) for (let i = 0; i < 2 ** k; i++) all.push({ std: i, rep, levels: cornerOf(k, i), centre: false });
  for (let c = 1; c <= centre; c++) all.push({ std: -1, rep: c, levels: Array(k).fill(0), centre: true });
  return shuffled(all.length, seed).map((idx, pos) => ({ no: pos + 1, ...all[idx] }));
}

/* ------------------------------ the analysis -------------------------------------------- */
export interface Term {
  mask: number; factors: number[]; effect: number; /** the coded model's coefficient — half the effect */ coef: number; ss: number;
  se?: number; t?: number; p?: number; lo?: number; hi?: number; /** real by the rule that applies */ real: boolean; /** beyond Lenth's simultaneous margin */ firm?: boolean;
}
export interface Curvature { nF: number; nC: number; meanF: number; meanC: number; ss: number; mspe: number; f: number; p: number; df: number }
export interface FactorialResult {
  k: number; r: number; N: number; grand: number; sst: number; terms: Term[]; mode: 'anova' | 'lenth';
  anova?: { sse: number; dfe: number; mse: number; se: number; tCrit: number };
  lenth?: { s0: number; pse: number; df: number; me: number; sme: number };
  curvature?: Curvature; cellMeans: number[];
}
const median = (xs: number[]): number => { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** The factorial, from the readings at each corner in standard order (the same number at every corner) and any centre readings. Undefined if the corners are not the same number of readings, or 2^k ≠ cells. */
export function analyseFactorial(k: number, cells: number[][], conf: number, centre: number[] = []): FactorialResult | undefined {
  const corners = 2 ** k;
  if (k < 2 || cells.length !== corners) return undefined;
  const r = cells[0]?.length ?? 0;
  if (r < 1 || cells.some(c => c.length !== r || c.some(v => !Number.isFinite(v)))) return undefined;
  const totals = cells.map(c => c.reduce((a, b) => a + b, 0)), cellMeans = cells.map(c => mean(c)), N = corners * r;
  const all = cells.flat(), grand = mean(all), sst = all.reduce((a, y) => a + (y - grand) ** 2, 0);
  const terms: Term[] = [];
  for (let mask = 1; mask < corners; mask++) {
    let contrast = 0; for (let i = 0; i < corners; i++) contrast += signOf(mask, i) * totals[i];
    const effect = contrast / (r * 2 ** (k - 1));
    terms.push({ mask, factors: factorsOfMask(mask, k), effect, coef: effect / 2, ss: contrast ** 2 / (r * corners), real: false });
  }
  const out: FactorialResult = { k, r, N, grand, sst, terms, mode: r >= 2 ? 'anova' : 'lenth', cellMeans };
  if (r >= 2) {
    const sse = cells.reduce((a, c, i) => a + c.reduce((s, y) => s + (y - cellMeans[i]) ** 2, 0), 0), dfe = corners * (r - 1), mse = sse / dfe, se = Math.sqrt(4 * mse / (r * corners));
    const tCrit = tQuantile(1 - (1 - conf) / 2, dfe);
    out.anova = { sse, dfe, mse, se, tCrit };
    for (const t of terms) {
      if (!(se > 0)) { t.real = Math.abs(t.effect) > 0; continue; }
      t.se = se; t.t = t.effect / se; t.p = 2 * (1 - tCdf(Math.abs(t.t), dfe)); t.lo = t.effect - tCrit * se; t.hi = t.effect + tCrit * se; t.real = t.p < 1 - conf;
    }
  } else {
    const m = terms.length, abs = terms.map(t => Math.abs(t.effect)), s0 = 1.5 * median(abs), kept = abs.filter(v => v < 2.5 * s0), pse = 1.5 * median(kept.length ? kept : abs), df = m / 3;
    const me = tQuantile(1 - (1 - conf) / 2, df) * pse, gamma = (1 + conf ** (1 / m)) / 2, sme = tQuantile(gamma, df) * pse;
    out.lenth = { s0, pse, df, me, sme };
    for (const t of terms) { t.lo = t.effect - me; t.hi = t.effect + me; t.real = Math.abs(t.effect) > me; t.firm = Math.abs(t.effect) > sme; }
  }
  if (centre.length >= 1) {
    const nF = N, nC = centre.length, meanF = grand, meanC = mean(centre);
    if (nC >= 2) {
      const pe = centre.reduce((a, y) => a + (y - meanC) ** 2, 0), mspe = pe / (nC - 1), ss = nF * nC * (meanF - meanC) ** 2 / (nF + nC), f = mspe > 0 ? ss / mspe : Infinity;
      out.curvature = { nF, nC, meanF, meanC, ss, mspe, f, p: Number.isFinite(f) ? 1 - fCdf(f, 1, nC - 1) : 0, df: nC - 1 };
    } else out.curvature = { nF, nC, meanF, meanC, ss: nF * nC * (meanF - meanC) ** 2 / (nF + nC), mspe: NaN, f: NaN, p: NaN, df: 0 };
  }
  return out;
}

/** The terms in the fitted model: the real ones and every lower-order term they stand on (the hierarchy principle). */
export function modelMasks(res: FactorialResult): number[] {
  const keep = new Set<number>();
  for (const t of res.terms.filter(x => x.real)) for (let m = t.mask; m > 0; m = (m - 1) & t.mask) keep.add(m);
  return [...keep].sort((a, b) => a - b);
}
/** The fitted mean at a coded setting (each −1…+1) from the terms in `masks`. */
export function predictCoded(res: FactorialResult, masks: number[], x: number[]): number {
  let y = res.grand;
  for (const m of masks) { const t = res.terms[m - 1]; y += t.coef * t.factors.reduce((p, j) => p * x[j], 1); }
  return y;
}
export interface BestCorner {
  /** each factor's best level (−1 or +1), or 0 where either does as well */ levels: number[]; predicted: number;
  /** the half-width of the confidence interval of the fitted mean there, with replicates */ half?: number;
}
/** The corner the fitted model puts best (`better` lower or higher). Factors the model does not use are 0: either level does as well. */
export function bestCorner(res: FactorialResult, masks: number[], better: 'lower' | 'higher', conf: number): BestCorner {
  const corners = 2 ** res.k, pred = Array.from({ length: corners }, (_, i) => predictCoded(res, masks, cornerOf(res.k, i)));
  const top = better === 'lower' ? Math.min(...pred) : Math.max(...pred), tied = pred.map((v, i) => [v, i] as const).filter(([v]) => Math.abs(v - top) < 1e-9).map(([, i]) => i);
  const levels = Array.from({ length: res.k }, (_, j) => { const ls = new Set(tied.map(i => cornerOf(res.k, i)[j])); return ls.size === 1 ? [...ls][0] : 0; });
  const half = res.anova ? tQuantile(1 - (1 - conf) / 2, res.anova.dfe) * Math.sqrt(res.anova.mse * (1 + masks.length) / res.N) : undefined;
  return { levels, predicted: top, ...(half !== undefined ? { half } : {}) };
}
/** The share of the total variation the fitted model's terms account for. */
export const modelR2 = (res: FactorialResult, masks: number[]): number => (res.sst > 0 ? masks.reduce((a, m) => a + res.terms[m - 1].ss, 0) / res.sst : 0);
/** The effect of factor `i` at the low (−1) or high (+1) level of factor `j`, averaged over the others — an interaction read as two numbers. */
export function simpleEffect(res: FactorialResult, i: number, j: number, atJ: -1 | 1): number {
  const diffs: number[] = [];
  for (let c = 0; c < 2 ** res.k; c++) { const x = cornerOf(res.k, c); if (x[i] === 1 && x[j] === atJ) diffs.push(res.cellMeans[c] - res.cellMeans[c & ~(1 << i)]); }
  return mean(diffs);
}
