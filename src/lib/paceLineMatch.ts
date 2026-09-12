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

/** Tracker areas that NO line on the project answers for.
 *
 *  The weekly upload is allowed to introduce work the project has never heard
 *  of — a new line commissioned, an area like Cellox that was never a measured
 *  line — and the board shows it immediately, because the board is drawn from
 *  the workbook. The roll-up is not: it is one row per line the project holds,
 *  so that work was landing on the board and vanishing from the report the GM
 *  actually reads. Work nobody can see is worse than work nobody has started.
 *
 *  Spanning rows ("All lines") are nobody's orphan — they already show against
 *  every line — so they are never returned here.
 */
export function uncoveredAreas(actions: PaceAction[], lineKeys: string[]): string[] {
  const seen = new Map<string, number>();
  for (const a of actions) {
    const name = (a.line ?? '').trim();
    if (!name || spansAll(name)) continue;
    if (lineKeys.some(k => actionOnLine(a, k))) continue;
    seen.set(name, (seen.get(name) ?? 0) + 1);
  }
  return [...seen.keys()].sort((x, y) => {
    const dx = digits(x), dy = digits(y);
    if (dx && dy) return Number(dx) - Number(dy);
    if (dx) return -1;
    if (dy) return 1;
    return x.localeCompare(y);
  });
}
