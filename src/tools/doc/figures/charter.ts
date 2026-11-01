/* THE CHARTER'S ARITHMETIC — pure (knowledge/specs/FC-142-charter.md; knowledge/methods/sixsigma/charter.md).
 *
 *   gap       = |baseline − target|, and its share of the baseline;
 *   worth     = what the problem costs a week × 52 when the tool that measured it said so, else the gap × the units a year it applies to ×
 *               what one unit of the measure is worth (the record's worked case: (4.1 − 2.0) g × 12,480,000 packs × £0.0034 a g = £89,107);
 *   the team  = each person's hours × one person's £ an hour (the line's wage with on-costs, else typed);
 *   payback   = the team's time ÷ the worth a week — how many weeks of the gain the team's time is. */
import { meanInterval } from '../../../lib/ie/stats';

export const WEEKS_A_YEAR = 52;

export type Direction = 'reduce' | 'raise' | 'hold';

export function gapOf(baseline: number, target: number): { gap: number; share: number | undefined; direction: Direction } {
  const gap = Math.abs(baseline - target);
  return { gap, share: baseline !== 0 ? gap / Math.abs(baseline) : undefined, direction: target < baseline ? 'reduce' : target > baseline ? 'raise' : 'hold' };
}

export interface WorthIn { worthWeek?: number; gap?: number; volume?: number; unitValue?: number }
export interface Worth {
  /** £ a year, by the way it is known. */
  perYear: number;
  perWeek: number;
  /** 'tool': the figure the measuring tool put on the problem, × 52; 'gap': the gap × units × value. */
  how: 'tool' | 'gap';
  /** The other way's figure when both were given — for the cross-check. */
  other?: { how: 'tool' | 'gap'; perYear: number };
}

/** The worth a year: the measuring tool's figure leads when it was given (MONEY.md: the problem's £ a week from the tool that measured
 *  it); the gap × units × value stands in only when it was not; both given, the other is kept to be set beside it. */
export function worthOf(i: WorthIn): Worth | undefined {
  const tool = i.worthWeek !== undefined && i.worthWeek >= 0 ? i.worthWeek * WEEKS_A_YEAR : undefined;
  const gap = i.gap !== undefined && i.volume !== undefined && i.unitValue !== undefined && i.volume >= 0 && i.unitValue >= 0 ? i.gap * i.volume * i.unitValue : undefined;
  if (tool !== undefined) return { perYear: tool, perWeek: tool / WEEKS_A_YEAR, how: 'tool', ...(gap !== undefined ? { other: { how: 'gap' as const, perYear: gap } } : {}) };
  if (gap !== undefined) return { perYear: gap, perWeek: gap / WEEKS_A_YEAR, how: 'gap' };
  return undefined;
}

export interface TeamRow { name: string; role?: string; hours?: number }
export interface TeamCost { hours: number; cost?: number; priced: number; unpriced: number }

/** The team's time: the hours given, costed at one person's rate when there is one. A member with no hours is counted, not priced. */
export function teamCost(rows: readonly TeamRow[], rate: number | undefined): TeamCost {
  const hours = rows.reduce((a, r) => a + (r.hours ?? 0), 0);
  const priced = rows.filter(r => r.hours !== undefined && r.hours > 0).length;
  return { hours, priced, unpriced: rows.length - priced, ...(rate !== undefined && rate > 0 && hours > 0 ? { cost: hours * rate } : {}) };
}

/** Weeks of the gain it takes to pay the team's time back. */
export const paybackWeeks = (cost: number, worthPerWeek: number): number | undefined => (worthPerWeek > 0 ? cost / worthPerWeek : undefined);

/** The baseline's interval when its readings and spread are given (n ≥ 2): the mean ± t·s/√n at 95%. */
export function baselineInterval(mean: number, sd: number, n: number): { lo: number; hi: number } | undefined {
  if (!(n >= 2) || !Number.isInteger(n) || !(sd >= 0)) return undefined;
  const i = meanInterval(n, mean, sd, 0.95);
  return { lo: i.lo, hi: i.hi };
}
