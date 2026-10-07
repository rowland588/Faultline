/* THE PLAN FOR TODAY — what the morning huddle agreed.
 *
 * Rowland, 7 October: "every day I almost have a huddle, and at the start we
 * kind of go, okay, so what are we planning to do today? Let's agree that,
 * and then let's move forward. It could be the same sort of thing as the
 * notes ... I just need another thing for it."
 *
 * The same shape as a note — a line of words, whose, done or not — so the
 * same record: a TestItem of kind 'today', `due` the day it was agreed for.
 * `testId` says what it is about, exactly as a note's does: the whole job
 * (''), or a stage, a test or a fix, which it then shows under as a branch
 * (the drawer: "On today's plan").
 *
 * SEE, COMMIT, PROVE in one day: agreed at the start, ticked through it, and
 * the day's story (lib/day) says how it went — "Plan for the day: 3 of 5
 * done" — on screen and on Today's update. What was not done is offered to
 * the next huddle, carried over as a new line (`fromItemId` the old one), so
 * the old day still says honestly that it was not done that day.
 *
 * Pure: read off what is kept. */
import { live, type TestItem } from './testing';

/** The kind a line of the day's plan is stored as. */
export const TODAY_KIND = 'today' as const;

/** The plan agreed for one day, in the order it was written. */
export const planFor = (items: TestItem[], date: string): TestItem[] =>
  live(items).filter(i => i.kind === TODAY_KIND && i.due === date).sort((a, b) => a.sort - b.sort || a.createdAt - b.createdAt);

/** The lines on a record's plan for a day — the branch under a stage. */
export const planOn = (testId: string, items: TestItem[], date: string): TestItem[] =>
  planFor(items, date).filter(i => i.testId === testId);

/** WHAT THE LAST HUDDLE LEFT UNDONE — from the latest earlier day with a
 *  plan, the lines not done and not already carried over. */
export function leftFrom(items: TestItem[], date: string): { day: string; lines: TestItem[] } | undefined {
  const plans = live(items).filter(i => i.kind === TODAY_KIND && !!i.due && i.due < date);
  const day = plans.map(i => i.due as string).sort().pop();
  if (!day) return undefined;
  const carried = new Set(live(items).filter(i => i.kind === TODAY_KIND && i.fromItemId).map(i => i.fromItemId));
  const lines = planFor(items, day).filter(i => i.doneAt == null && !carried.has(i.id));
  return lines.length ? { day, lines } : undefined;
}

/** "3 of 5 done" / "all 4 done" / "none of 3 done yet". */
export function planCount(plan: TestItem[], past = false): string {
  const done = plan.filter(i => i.doneAt != null).length;
  if (!plan.length) return '';
  if (done === plan.length) return `all ${plan.length} done`;
  if (!done) return past ? `none of ${plan.length} done` : `none of ${plan.length} done yet`;
  return `${done} of ${plan.length} done`;
}
