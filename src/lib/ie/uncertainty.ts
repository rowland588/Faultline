/* MEASUREMENT UNCERTAINTY — GUM combination (FC-123; knowledge/methods/msa/measurement-uncertainty.md;
 * knowledge/specs/FC-123-uncertainty-budget.md; scripts/knowledge/cases-msa.py). */

export interface UncertaintyInputs {
  /** Smallest scale increment (same unit as the reading). */
  resolution: number;
  /** Repeatability standard deviation s (same unit). */
  repeatability: number;
  /** Number of readings averaged (1 = single reading). */
  n: number;
  /** Expanded uncertainty from the certificate (same unit). */
  certU: number;
  /** Coverage factor on the certificate (usually 2). */
  certK: number;
  /** Expanded uncertainty coverage for the statement (usually 2). */
  k?: number;
}

export interface UncertaintySource {
  name: string;
  u: number;
  /** Share of u_c², in %. */
  sharePct: number;
}

export interface UncertaintyResult {
  sources: UncertaintySource[];
  uc: number;
  U: number;
  k: number;
  /** Name of the largest share of variance. */
  dominant: string;
  dominantSharePct: number;
}

/** Rectangular distribution: half-width a → u = a/√3; resolution δ → u = δ/(2√3). */
export const uRectangular = (halfWidth: number): number => halfWidth / Math.sqrt(3);

export const uResolution = (delta: number): number => delta / (2 * Math.sqrt(3));

/** Type A: s for one reading, s/√n for mean of n. */
export const uRepeatability = (s: number, n: number): number => s / Math.sqrt(Math.max(1, n));

/** Certificate expanded U at k → standard u. */
export const uFromCertificate = (U: number, k: number): number => U / Math.max(k, 1);

export const combineStandard = (us: number[]): number =>
  Math.sqrt(us.reduce((sum, u) => sum + u * u, 0));

export function uncertaintyBudget(i: UncertaintyInputs): UncertaintyResult {
  const k = i.k ?? 2;
  const uRes = uResolution(i.resolution);
  const uRep = uRepeatability(i.repeatability, i.n);
  const uCal = uFromCertificate(i.certU, i.certK);
  const us = [
    { name: 'Resolution', u: uRes },
    { name: 'Repeatability', u: uRep },
    { name: 'Calibration certificate', u: uCal },
  ];
  const uc = combineStandard(us.map(x => x.u));
  const U = k * uc;
  const uc2 = uc * uc;
  const sources: UncertaintySource[] = us.map(x => ({
    name: x.name,
    u: x.u,
    sharePct: uc2 > 0 ? (100 * x.u * x.u) / uc2 : 0,
  }));
  const dominant = sources.reduce((a, b) => (b.sharePct > a.sharePct ? b : a), sources[0]);
  return {
    sources,
    uc,
    U,
    k,
    dominant: dominant.name,
    dominantSharePct: dominant.sharePct,
  };
}

/** One-sided guard: minimum reading to be sure value is above lower limit L at expanded U. */
export const guardLower = (L: number, U: number): number => L + U;

/** Test uncertainty ratio: tolerance ÷ (2U) — common fitness rule (≥4 usual). */
export const testUncertaintyRatio = (tolerance: number, U: number): number | undefined =>
  U > 0 ? tolerance / (2 * U) : undefined;
