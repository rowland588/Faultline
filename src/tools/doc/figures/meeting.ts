/* THE TIERED MEETING'S ARITHMETIC — pure (knowledge/specs/FC-198-daily-meeting.md; knowledge/methods/visual/daily-management.md).
 *
 *   a letter's rule   = its actual against its target in the direction given (at least / at most): met, or off;
 *   a red's answer    = a red letter is answered when the meeting raised an action for it or wrote the reason there is none;
 *   an escalation's wait = whole days from the day it was raised to the day it was answered (or to today while it waits) — the tier above
 *                       answers the same day (the record), so a wait of one day or more is said. */
import { daysBetween } from '../../../lib/weeks';

export type Letter = 'S' | 'Q' | 'D' | 'C' | 'P';
export const LETTERS: { value: Letter; label: string }[] = [
  { value: 'S', label: 'Safety' }, { value: 'Q', label: 'Quality' }, { value: 'D', label: 'Delivery' }, { value: 'C', label: 'Cost' }, { value: 'P', label: 'People' },
];
export const letterWord = (l: string): string => LETTERS.find(x => x.value === l)?.label ?? l;

export type Direction = 'atleast' | 'atmost';
/** Met, or off, from the figures; undefined when any of the three is missing. */
export function ruleOf(actual: number | undefined, target: number | undefined, dir: string | undefined): 'met' | 'off' | undefined {
  if (actual === undefined || target === undefined || (dir !== 'atleast' && dir !== 'atmost')) return undefined;
  return (dir === 'atleast' ? actual >= target : actual <= target) ? 'met' : 'off';
}

export interface Raised { letter: string; type: 'do' | 'why' }
/** Red letters (by letter) with no action and no reason raised for them. */
export function unanswered(reds: readonly string[], raised: readonly Raised[]): string[] {
  return reds.filter(l => !raised.some(r => r.letter === l));
}

/** Days an escalation has waited, or took: raised → answered, or raised → today while it has no answer. */
export function waitDays(raised: string, answered: string | undefined, today: string): number {
  return Math.max(0, daysBetween(raised, answered ?? today));
}
