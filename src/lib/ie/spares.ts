/* Critical spares — Poisson demand over the lead time (FC-066; maintenance.spares-poisson). */
import { poissonCdf } from './dist';

export function sparesDemandPerHour(mtbfHours: number, installed: number): number {
  if (mtbfHours <= 0 || installed <= 0) return NaN;
  return installed / mtbfHours;
}

/** Expected failures (parts demanded) over the lead time. */
export function sparesDemandMu(ratePerHour: number, leadHours: number): number {
  if (ratePerHour <= 0 || leadHours <= 0) return 0;
  return ratePerHour * leadHours;
}

/** Smallest stock s with P(Poisson(μ) ≤ s) ≥ serviceLevel. */
export function poissonStockLevel(mu: number, serviceLevel: number): { stock: number; serviceAchieved: number } {
  if (!Number.isFinite(mu) || mu <= 0) return { stock: 0, serviceAchieved: 1 };
  const target = Math.min(0.999999, Math.max(0, serviceLevel));
  let s = 0;
  const cap = Math.max(50, mu + 25 * Math.sqrt(mu) + 20);
  while (poissonCdf(s, mu) < target && s < cap) s += 1;
  return { stock: s, serviceAchieved: poissonCdf(s, mu) };
}

/** Chance of needing more than `stock` parts in the lead time. */
export function stockOutRisk(mu: number, stock: number): number {
  if (mu <= 0) return 0;
  return Math.max(0, 1 - poissonCdf(stock, mu));
}

/** P(no part needed in the lead time) — Poisson pmf at 0. */
export function pNoDemand(mu: number): number {
  if (mu <= 0) return 1;
  return Math.exp(-mu);
}
