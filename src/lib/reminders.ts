/* A REMINDER ON A MEETING NOTE.
 *
 * Rowland: "put a date as a reminder on the note itself ... the app will remind
 * me ... and on the Gantt we should see the note highlighted in a different
 * bespoke colour."
 *
 * Nothing new is kept. A note is a test item of kind 'note'; its reminder is
 * its `due`, and `onPlan` says it is drawn on the Gantt as well. Ticking the
 * note off (it was raised) ends the reminder — the same tick as before.
 *
 * Where it reminds, all read from here so they cannot disagree:
 *   · the project page, and Home — a card while one is due or overdue
 *   · this device — a notification on the day, while the app is open
 *   · the plan — in its own colour, when it was put on the plan
 */
import { live, type TestItem } from './testing';
import { niceDay } from './weeks';

export interface Reminder {
  id: string;
  projectId: string;
  what: string;
  due: string;
  /** Days from today: 0 today, negative when it has gone. */
  days: number;
  onPlan: boolean;
}

/** How far ahead the cards look. A reminder further off is on the note and
 *  the plan, and comes forward on its own. */
export const AHEAD_DAYS = 7;

const DAY = 86_400_000;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / DAY);

/** Every open note with a reminder, overdue first, then soonest. */
export function remindersOf(items: TestItem[], today: string, ahead = AHEAD_DAYS): Reminder[] {
  return live(items)
    .filter(i => i.kind === 'note' && !!i.due && i.doneAt == null)
    .map(i => ({ id: i.id, projectId: i.projectId, what: i.what.trim() || 'A note', due: i.due as string, days: daysBetween(today, i.due as string), onPlan: !!i.onPlan }))
    .filter(r => r.days <= ahead)
    .sort((a, b) => a.days - b.days || a.what.localeCompare(b.what));
}

/** The ones to say something about today: due today or already gone. */
export const dueNow = (rs: Reminder[]): Reminder[] => rs.filter(r => r.days <= 0);

/** "Today", "Tomorrow", "In 3 days · Mon 5 Oct", "2 days ago · Wed 30 Sep". */
export function remindWords(r: Pick<Reminder, 'days' | 'due'>): string {
  const day = niceDay(r.due, { weekday: 'short' });
  if (r.days === 0) return 'Today';
  if (r.days === 1) return `Tomorrow · ${day}`;
  if (r.days === -1) return `Yesterday · ${day}`;
  return r.days > 0 ? `In ${r.days} days · ${day}` : `${-r.days} days ago · ${day}`;
}
