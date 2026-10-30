/* PASS ALL DUE — the round's one tap for the checks that are done together (30 October — Rowland: "we must have
 * tools that are ready and functional"; the audit: three hourly checks on a metal detector were three taps and three
 * scrolls). Pure: which of the round's checks a single tap may pass, which it may not, and the words said before it
 * is done. Only a check that is DUE or OVERDUE and answered pass-or-fail is passed: a check with a reading, a count
 * or an audit is asked for its own answer (a number is never invented), one that FAILED is re-checked on its own
 * card (a re-test after a failure is a decision, not a habit), and one only due soon is not due yet. Nothing here
 * writes; the sheet (RoundParts PassAllSheet) shows these words, then writes one result per check in one write with
 * one Undo. Every definition goes through the same rule — none is special-cased. */
import { plural } from '../../lib/format';
import type { LogResult } from '../../lib/study';
import type { CheckState } from './checks';
import { newResult } from './store';

export interface PassAllPlan {
  /** Due now or overdue, answered pass or fail: passed by the tap. */
  pass: CheckState[];
  /** Due now or overdue but answered with a reading, a count or an audit: asked for it, not passed. */
  ask: CheckState[];
  /** Failed and not yet checked again: re-checked on its own card. */
  failed: CheckState[];
}

export function passAllPlan(round: readonly CheckState[]): PassAllPlan {
  const due = round.filter(st => !st.check.removed && (st.key === 'due' || st.key === 'overdue'));
  return {
    pass: due.filter(st => st.check.kind === 'passfail'),
    ask: due.filter(st => st.check.kind !== 'passfail'),
    failed: round.filter(st => !st.check.removed && st.key === 'failed'),
  };
}

/** Is the button offered? Two or more to pass — one has its own big tap. */
export const passAllOffered = (plan: PassAllPlan): boolean => plan.pass.length >= 2;

/** The button's words: "Pass all due · 3". */
export const passAllLabel = (plan: PassAllPlan): string => `Pass all due · ${plan.pass.length}`;

const names = (xs: readonly CheckState[]): string => xs.map(x => x.check.name).join(', ');

/** What the confirmation says, before anything is recorded. */
export function passAllWords(plan: PassAllPlan): { head: string; asks?: string; failed?: string } {
  return {
    head: `Mark ${plural(plan.pass.length, 'check')} as passed now?`,
    ...(plan.ask.length ? { asks: `${plural(plan.ask.length, 'check')} need${plan.ask.length === 1 ? 's' : ''} a reading, a count or an audit and ${plan.ask.length === 1 ? 'is' : 'are'} not passed by this: ${names(plan.ask)}.` } : {}),
    ...(plan.failed.length ? { failed: `${plural(plan.failed.length, 'check')} failed and ${plan.failed.length === 1 ? 'is' : 'are'} checked again on ${plan.failed.length === 1 ? 'its' : 'their'} own card${plan.failed.length === 1 ? '' : 's'}: ${names(plan.failed)}.` } : {}),
  };
}

/** One passed result for each check the tap passes, all stamped with the same moment. */
export function passAllResults(plan: PassAllPlan, by: string | undefined, at: number): LogResult[] {
  return plan.pass.map(st => ({ ...newResult(st.check, by, { outcome: 'pass' }), at }));
}
