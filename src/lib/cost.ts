/* Idle-labour cost — the money most manufacturers actually use for downtime.
 * cost/hr = crew (people on the line) × labour rate per hour; a stoppage costs
 * (its hours) × that rate. So cost is proportional to time — the cost Pareto is
 * the time Pareto shown in £. Money is derived here, never stored. */

export function hasCost(w: { crew?: number; labourRatePerHour?: number }): boolean {
  return !!(w.crew && w.crew > 0 && w.labourRatePerHour && w.labourRatePerHour > 0);
}

/** £ per millisecond of downtime = crew × rate/hr ÷ 3,600,000. */
export function costPerMs(w: { crew?: number; labourRatePerHour?: number }): number {
  return hasCost(w) ? ((w.crew as number) * (w.labourRatePerHour as number)) / 3_600_000 : 0;
}

export function fmtGBP(n: number): string {
  if (n >= 1000) return '£' + (Math.round(n / 100) / 10).toFixed(1) + 'k';
  return '£' + Math.round(n).toLocaleString('en-GB');
}
