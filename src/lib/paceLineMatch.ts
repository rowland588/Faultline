/* Which tracker actions belong to a line.
 *
 * The workbook names lines the way people say them — "Line 2", "Line 10",
 * "All lines" — while the app keys them "2A", "2B", "7", "10". Matching on the
 * DIGITS is what bridges the two: "Line 10" and "10" agree, and "Line 2" does
 * not accidentally swallow "Line 10" the way a substring test would.
 *
 * 2A and 2B both answer to "Line 2" on purpose. The tracker does not split the
 * two halves of Line 2, so both owners see the same Line 2 actions rather than
 * one of them seeing none.
 *
 * Anything the workbook marks as spanning everything ("All lines", "All") shows
 * on every line, because it is every line's to do. */
import type { PaceAction } from './projectPaceData';

const digits = (s: string): string => (s.match(/\d+/)?.[0] ?? '');
const spansAll = (s: string): boolean => /\ball\b/i.test(s);

/** True when this action is one the given line's owner should be looking at. */
export function actionOnLine(a: PaceAction, lineKey: string): boolean {
  const l = (a.line ?? '').trim();
  if (!l) return false;
  if (spansAll(l)) return true;
  const want = digits(lineKey);
  return want !== '' && digits(l) === want;
}

/** The actions for one line, or every action when no line is named. */
export function actionsForLine(actions: PaceAction[], lineKey?: string): PaceAction[] {
  return lineKey ? actions.filter(a => actionOnLine(a, lineKey)) : actions;
}
