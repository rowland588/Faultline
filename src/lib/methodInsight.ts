/* A METHOD'S OWN READING OF ITS PROJECT (docs/METHODS.md §17). The dashboard's rules are the same for every method (written or not,
 * a red tool, a number with no tool behind it, late actions). Each method also has things only it knows — DMAIC's phase review
 * that was held, a PDCA cycle whose result missed its prediction, a Kata that has not run a step for three days, a Kaizen 30-day
 * check overdue, an 8D with an open corrective action, an A3 countermeasure naming no cause, a Theory of Constraints pass with the
 * constraint moved. A method registers ONE function here (its own file in lib/methodInsights/, one line below) and the dashboard
 * and the project report both say what it finds. Pure, additive: a method with no entry is read by the common rules alone. */
import type { MethodKey } from './methods';
import type { DashAttention, DashOwed } from './methodDashboard';
import type { ToolStudy } from './study';
import { eightDInsight } from './methodInsights/eight-d';

export interface InsightIn { answers: Readonly<Record<string, string>>; studies: readonly ToolStudy[]; owed: readonly DashOwed[]; today: string }
export interface MethodInsight {
  /** Things this method says need a look, worst first — each in words, with its tone. */
  attention?: DashAttention[];
  /** What to do next when the method knows better than "write the first empty question" (e.g. "Hold Define's review"). */
  next?: string;
}
export type MethodInsightFn = (x: InsightIn) => MethodInsight;

export const METHOD_INSIGHT: Partial<Record<MethodKey, MethodInsightFn>> = {
  'eight-d': eightDInsight,
};
