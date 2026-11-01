/* THE 8D REPORT'S ARITHMETIC — pure (knowledge/specs/FC-150-eight-d-report.md; knowledge/methods/rca/eight-d.md).
 *
 *   elapsed days    = the day each discipline was done − the day the problem was raised (D0);
 *   held            = units held × what one unit cost so far — money TIED UP, not lost (inventory carrying cost: holding is not a daily loss);
 *   sorting         = hours of sorting × one person's £ an hour — labour (L), a figure of its own, never added to the held product;
 *   expected        = events a week before the fix × weeks since — what the old rate would have given. A comparison, not a significance test:
 *                     "none in six weeks where about 540 were expected" says what did not happen, not that the cause is proved. */
import { daysBetween } from '../../../lib/weeks';

export const elapsed = (raised: string, done: string): number => daysBetween(raised, done);
export const heldValue = (units: number, unitCost: number): number => units * unitCost;
export const sortingCost = (hours: number, rate: number): number => hours * rate;
export const expectedWithout = (oldPerWeek: number, weeks: number): number => oldPerWeek * weeks;

/** The signature of a closed complaint rather than a solved problem — a root cause of "operator error" (the record: "human error" and "retraining"). */
export const WEAK_CAUSE = /\b(operator|human|worker|employee|staff|people)\s+error\b|\bcareless(ness)?\b|\bnot paying attention\b|\black of (attention|care|focus)\b/i;
