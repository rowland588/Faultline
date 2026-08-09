/* Idle-labour cost — the money most manufacturers actually use for downtime.
 * cost/hr = crew (people on the line) × wage/hr × on-costs ratio; a stoppage
 * costs (its hours) × that rate. The ratio (employer NI, pension, holiday
 * cover — typically 1.25–1.4) turns the wage into what a person actually costs
 * the business, so the £ on the Pareto survives a finance director's red pen.
 * Cost stays proportional to time — the cost Pareto is the time Pareto in £ —
 * and money is derived here, never stored. */

interface CostModel { crew?: number; labourRatePerHour?: number; labourBurden?: number }

export function hasCost(w: CostModel): boolean {
  return !!(w.crew && w.crew > 0 && w.labourRatePerHour && w.labourRatePerHour > 0);
}

/** The on-costs multiplier, defaulting to 1 (wage only) — never 0. */
export const burdenOf = (w: CostModel): number =>
  w.labourBurden && w.labourBurden > 0 ? w.labourBurden : 1;

/** £ per hour of idle labour = crew × wage × on-costs ratio. */
export const costPerHour = (w: CostModel): number =>
  hasCost(w) ? (w.crew as number) * (w.labourRatePerHour as number) * burdenOf(w) : 0;

/** £ per millisecond of downtime. */
export function costPerMs(w: CostModel): number {
  return costPerHour(w) / 3_600_000;
}

export function fmtGBP(n: number): string {
  if (n >= 1000) return '£' + (Math.round(n / 100) / 10).toFixed(1) + 'k';
  return '£' + Math.round(n).toLocaleString('en-GB');
}
