/* WHAT LOST TIME COSTS — derived here, never stored, so every screen says the
 * same thing. Two parts, never one blended figure (docs/CAPACITY.md §6;
 * docs/AUDIT.md 4.21; Rowland, 14 October: "capacity loss units and labour"):
 *
 * LABOUR (the undeniable number): the crew paid to stand. cost/hr = crew
 * (people on the line) × wage/hr × on-costs ratio; a stop costs (its hours) ×
 * that rate, wherever on the line it is. The optional ratio (employer NI,
 * pension, holiday cover — typically 1.25–1.4) turns the wage into what a
 * person actually costs the business. Proportional to time, so the Pareto in
 * pounds of labour is the time Pareto in £.
 *
 * CAPACITY (the packs the line did not make): said in packs, not pounds, and
 * only for a stop that stopped the line — on its bottleneck, or the whole
 * line (lib/lineLoss). A stop on another machine costs its labour; its packs
 * are made up unless it starved the bottleneck, which a stopwatch cannot see.
 *
 * Until 14 October the two were added into one "£/hr while it is down", the
 * lost output charged on every machine's stops: a stop on a machine the line
 * runs round was priced as if the line had stopped. */

interface CostModel {
  crew?: number; labourRatePerHour?: number; labourBurden?: number;
  packsPerMin?: number;
}

/** £/hr of idle labour (0 when crew/wage unset). */
export const labourPerHour = (w: CostModel): number =>
  w.crew && w.crew > 0 && w.labourRatePerHour && w.labourRatePerHour > 0
    ? w.crew * w.labourRatePerHour * burdenOf(w) : 0;

/** £ of idle labour a millisecond of lost time — the one rate the screens
 *  multiply time by (0 when the line has no crew and wage). */
export const labourPerMs = (w: CostModel): number => labourPerHour(w) / 3_600_000;

/** The line has a labour cost to put on its lost time. */
export const hasLabour = (w: CostModel): boolean => labourPerHour(w) > 0;

/** Packs a minute the line runs at when it runs — its rated speed — or
 *  undefined when nobody has said it. */
export const ratedPerMin = (w: CostModel): number | undefined =>
  w.packsPerMin && w.packsPerMin > 0 ? w.packsPerMin : undefined;

/** The on-costs multiplier, defaulting to 1 (wage only) — never 0. */
export const burdenOf = (w: CostModel): number =>
  w.labourBurden && w.labourBurden > 0 ? w.labourBurden : 1;

export function fmtGBP(n: number): string {
  if (n >= 1000) return '£' + (Math.round(n / 100) / 10).toFixed(1) + 'k';
  return '£' + Math.round(n).toLocaleString('en-GB');
}

/** Packs, as a person says them: "1,240 packs", "1 pack", "under 1 pack". */
export function fmtPacks(n: number): string {
  if (n > 0 && n < 1) return 'under 1 pack';
  const r = Math.round(n);
  return `${r.toLocaleString('en-GB')} pack${r === 1 ? '' : 's'}`;
}
