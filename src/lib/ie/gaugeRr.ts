/* GAUGE R&R — crossed ANOVA (FC-118, msa.gauge-rr; knowledge/methods/msa/gauge-rr.md). Proved against
 * scripts/knowledge/cases-msa.py (SciPy) in __tests__/gaugeRr.test.ts. */
import { fCdf } from './dist';

export interface GrrCell { part: string; appraiser: string; trial: number; value: number }
export interface GrrInput {
  cells: GrrCell[];
  /** USL − LSL when both given — for %GRR of tolerance */
  tolerance?: number;
  /** Pool part×operator at α = 0.25 when the interaction F's p exceeds this (AIAG MSA). */
  poolAlpha?: number;
}

export interface GrrVariance {
  repeat: number; operator: number; interaction: number; part: number; grr: number; total: number;
  pooled: boolean; fInteraction: number; pInteraction: number;
}

export interface GrrResult {
  p: number; o: number; r: number; n: number;
  var: GrrVariance;
  /** σ ratio × 100 — AIAG %GRR of total variation */
  pctGrrTotal: number;
  /** σ² ratio × 100 — % contribution (said apart on the page) */
  pctContrib: number;
  /** 6σ_GRR / T × 100 when tolerance given */
  pctGrrTol?: number;
  ndc: number;
  ev: number; av: number; pv: number;
  /** acceptable · marginal · not acceptable — from 10% and 30% bands on pctGrrTotal */
  band: 'acceptable' | 'marginal' | 'not';
  /** repeatability vs reproducibility story */
  lead: 'repeat' | 'reprod' | 'even';
}

const uniq = (xs: string[]): string[] => [...new Set(xs)];

/** One reading a cell; struck or duplicate trial/part/appraiser overwrites last kept order. */
export function cellsOf(raw: GrrCell[]): GrrCell[] {
  const m = new Map<string, GrrCell>();
  for (const c of raw) {
    if (typeof c.value !== 'number' || Number.isNaN(c.value)) continue;
    m.set(`${c.part}\0${c.appraiser}\0${c.trial}`, c);
  }
  return [...m.values()];
}

export function gaugeRr(input: GrrInput): GrrResult | undefined {
  const cells = cellsOf(input.cells);
  if (cells.length < 9) return undefined;
  const parts = uniq(cells.map(c => c.part)).sort();
  const ops = uniq(cells.map(c => c.appraiser)).sort();
  const p = parts.length, o = ops.length;
  const trials = uniq(cells.map(c => String(c.trial))).map(Number).sort((a, b) => a - b);
  const r = trials.length;
  if (p < 2 || o < 2 || r < 2) return undefined;
  const grid = new Map<string, number>();
  for (const c of cells) grid.set(`${c.part}\0${c.appraiser}\0${c.trial}`, c.value);
  for (const pt of parts) for (const op of ops) for (const t of trials) {
    if (!grid.has(`${pt}\0${op}\0${t}`)) return undefined;
  }
  const data: number[][][] = parts.map(pt => ops.map(op => trials.map(tr => grid.get(`${pt}\0${op}\0${tr}`) as number)));
  const n = p * o * r;
  let gm = 0; for (const pi of data) for (const oi of pi) for (const v of oi) gm += v;
  gm /= n;
  const pm = data.map(pi => pi.flat().reduce((s, v) => s + v, 0) / (o * r));
  const om = ops.map((_, j) => data.reduce((s, pi) => s + pi[j].reduce((a, v) => a + v, 0), 0) / (p * r));
  const pom = data.map(pi => pi.map(oi => oi.reduce((s, v) => s + v, 0) / r));
  let ssp = 0, sso = 0, sspo = 0, sse = 0;
  for (let j = 0; j < o; j++) sso += p * r * (om[j] - gm) ** 2;
  for (let i = 0; i < p; i++) {
    ssp += o * r * (pm[i] - gm) ** 2;
    for (let j = 0; j < o; j++) {
      sspo += r * (pom[i][j] - pm[i] - om[j] + gm) ** 2;
      for (let k = 0; k < r; k++) sse += (data[i][j][k] - pom[i][j]) ** 2;
    }
  }
  const msp = ssp / (p - 1), mso = sso / (o - 1), mspo = sspo / ((p - 1) * (o - 1)), mse = sse / (p * o * (r - 1));
  const dfPo = (p - 1) * (o - 1), dfE = p * o * (r - 1);
  const fPo = mspo / mse;
  const pPo = 1 - fCdf(fPo, dfPo, dfE);
  const poolAlpha = input.poolAlpha ?? 0.25;
  let vRep: number, vOp: number, vPo: number, vPart: number, pooled = false;
  if (pPo > poolAlpha) {
    pooled = true;
    const pooledMs = (sspo + sse) / (dfPo + dfE);
    vRep = pooledMs;
    vPo = 0;
    vOp = Math.max(0, (mso - pooledMs) / (p * r));
    vPart = Math.max(0, (msp - pooledMs) / (o * r));
  } else {
    vRep = mse;
    vPo = Math.max(0, (mspo - mse) / r);
    vOp = Math.max(0, (mso - mspo) / (p * r));
    vPart = Math.max(0, (msp - mspo) / (o * r));
  }
  const vGrr = vRep + vOp + vPo;
  const vTot = vGrr + vPart;
  if (!(vTot > 0)) return undefined;
  const pctGrrTotal = Math.sqrt(vGrr / vTot) * 100;
  const pctContrib = (vGrr / vTot) * 100;
  const T = input.tolerance;
  const pctGrrTol = T && T > 0 ? (6 * Math.sqrt(vGrr) / T) * 100 : undefined;
  const ndc = vGrr > 0 ? Math.floor(1.41 * Math.sqrt(vPart / vGrr)) : 0;
  const ev = Math.sqrt(vRep), av = Math.sqrt(vOp + vPo), pv = Math.sqrt(vPart);
  const band: GrrResult['band'] = pctGrrTotal < 10 ? 'acceptable' : pctGrrTotal <= 30 ? 'marginal' : 'not';
  const lead: GrrResult['lead'] = vRep > vOp + vPo ? 'repeat' : vOp + vPo > vRep * 1.05 ? 'reprod' : 'even';
  return {
    p, o, r, n,
    var: { repeat: vRep, operator: vOp, interaction: vPo, part: vPart, grr: vGrr, total: vTot, pooled, fInteraction: fPo, pInteraction: pPo },
    pctGrrTotal, pctContrib, pctGrrTol, ndc, ev, av, pv, band, lead,
  };
}
