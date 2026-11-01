/* THE JOB BREAKDOWN'S ARITHMETIC — pure (knowledge/specs/FC-223-job-instruction.md; knowledge/methods/people/twi-job-instruction.md).
 *
 *   key points     = the items of a step's key-point box, separated by semicolons or new lines (a comma is part of a point);
 *   trained        = learners with a day they were taught;  signed off = those whose try-out is signed off;  rate = signed off ÷ trained;
 *   days to sign-off = the mean of (signed-off day − taught day) over those with both;
 *   re-check due   = signed-off day + 30 days (the record: a re-check at 30 days), overdue when that has passed and it is not passed;
 *   time saved     = learners trained × (hours to standard without − hours with) × one person's £ an hour — paid time, never a saving banked. */
import { addDays, daysBetween } from '../../../lib/weeks';

export const RECHECK_DAYS = 30;

/** The key points of a box: “Tension lever at the mark; both hands clear” → two. */
export function pointsOf(text: string | undefined): string[] {
  return (text ?? '').split(/[;\n]+/).map(s => s.trim()).filter(Boolean);
}

export type TryOut = 'notyet' | 'again' | 'passed';
export interface Learner { name: string; taught?: string; tryOut?: TryOut; signed?: string; recheck?: 'passed' | 'failed' }

export interface Teaching {
  trained: number; signedOff: number; again: number; waiting: number;
  rate: number | undefined;
  /** Mean days from taught to signed off, over those with both days. */
  days: number | undefined;
  /** Signed off but the 30-day re-check is not passed and its day has gone. */
  overdue: number;
  /** Signed off, re-check day not yet reached. */
  due: number;
  /** Signed off with no day — kept, not counted in the days. */
  undated: number;
}

export function teachingOf(rows: readonly Learner[], today: string): Teaching {
  const trained = rows.filter(r => r.taught);
  const signed = trained.filter(r => r.tryOut === 'passed');
  const again = trained.filter(r => r.tryOut === 'again');
  const spans = signed.filter(r => r.signed && r.taught).map(r => daysBetween(r.taught as string, r.signed as string));
  const open = signed.filter(r => r.signed && r.recheck !== 'passed');
  const overdue = open.filter(r => addDays(r.signed as string, RECHECK_DAYS) < today).length;
  return {
    trained: trained.length, signedOff: signed.length, again: again.length, waiting: trained.length - signed.length - again.length,
    rate: trained.length ? signed.length / trained.length : undefined,
    days: spans.length ? spans.reduce((a, b) => a + b, 0) / spans.length : undefined,
    overdue, due: open.length - overdue, undated: signed.filter(r => !r.signed).length,
  };
}

/** Paid hours the breakdown saves: learners × (without − with) hours. Undefined when the hours are not both given or with is not less. */
export function hoursSaved(learners: number, without: number | undefined, withJi: number | undefined): number | undefined {
  if (without === undefined || withJi === undefined || learners <= 0 || withJi >= without) return undefined;
  return learners * (without - withJi);
}
