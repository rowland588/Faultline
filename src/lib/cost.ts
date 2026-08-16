/* Downtime cost — derived here, never stored, so every screen shows the same £.
 *
 * DEFAULT (the undeniable number): idle labour. cost/hr = crew (people on the
 * line) × wage/hr × on-costs ratio; a stoppage costs (its hours) × that rate.
 * The optional ratio (employer NI, pension, holiday cover — typically
 * 1.25–1.4) turns the wage into what a person actually costs the business.
 *
 * OPTIONAL REFINEMENT (the number commercial directors feel): lost output.
 * packs/min at rated speed × 60 × £ margin per pack = the contribution the
 * packs that never got made would have earned. Only honest when the time
 * can't be recovered (sold-out line, fixed shift end — most food lines, most
 * of the time), which is why it's opt-in and always labelled where £ breaks
 * down. Cost stays proportional to time — the cost Pareto is the time Pareto
 * in £. */

interface CostModel {
  crew?: number; labourRatePerHour?: number; labourBurden?: number;
  packsPerMin?: number; marginPerPack?: number;
}

/** £/hr of idle labour alone (0 when crew/wage unset). */
export const labourPerHour = (w: CostModel): number =>
  w.crew && w.crew > 0 && w.labourRatePerHour && w.labourRatePerHour > 0
    ? w.crew * w.labourRatePerHour * burdenOf(w) : 0;

/** £/hr of lost output alone (0 unless BOTH speed and margin are set). */
export const outputPerHour = (w: CostModel): number =>
  w.packsPerMin && w.packsPerMin > 0 && w.marginPerPack && w.marginPerPack > 0
    ? w.packsPerMin * 60 * w.marginPerPack : 0;

export function hasCost(w: CostModel): boolean {
  return labourPerHour(w) > 0 || outputPerHour(w) > 0;
}

/** The on-costs multiplier, defaulting to 1 (wage only) — never 0. */
export const burdenOf = (w: CostModel): number =>
  w.labourBurden && w.labourBurden > 0 ? w.labourBurden : 1;

/** £ per hour of downtime = idle labour + (optional) lost output. */
export const costPerHour = (w: CostModel): number =>
  labourPerHour(w) + outputPerHour(w);

/** £ per millisecond of downtime. */
export function costPerMs(w: CostModel): number {
  return costPerHour(w) / 3_600_000;
}

export function fmtGBP(n: number): string {
  if (n >= 1000) return '£' + (Math.round(n / 100) / 10).toFixed(1) + 'k';
  return '£' + Math.round(n).toLocaleString('en-GB');
}
