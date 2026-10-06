/* HOURS LOST, ADDED UP INTO DAYS.
 *
 * Rowland, 6 October: "it only gives me ability to put days, but in some
 * occasions I find out that actually it's hours ... I've reported 2 hours
 * here, 1 hour there, 5 hours here maybe, and then you can quantify that into
 * actually that was one day fully missed, or half a day."
 *
 * No new list. An hour lost is said on the problem that cost it (a found item,
 * `hoursLost`), and everything here is read off those. A stage's hours add up;
 * when they make a full working day — the job's `dayHours`, eight when blank —
 * the finish is pushed by that day, and the push is kept on the problem that
 * tipped it, as any move is (movedFrom / movedTo). So the stage knows, from its
 * own problems alone: how many hours it has lost, how many days those have
 * already pushed, and how much is banked towards the next one. */
import type { TestItem } from './testing';
import { daysBetween } from './weeks';

export const DAY_HOURS = 8;

/** The job's working day in hours. */
export const dayLength = (p?: { dayHours?: number }): number => (p?.dayHours && p.dayHours > 0 ? p.dayHours : DAY_HOURS);

/** "2 h", "1.5 h", "30 min". */
export function hoursWord(h: number): string {
  if (h > 0 && h < 1) return `${Math.round(h * 60)} min`;
  const r = Math.round(h * 100) / 100;
  return `${r} h`;
}

const QUARTER = ['', '¼', '½', '¾'];
/** Hours as working days, to the nearest quarter: "half a day", "1¼ days". */
export function daysWord(h: number, day: number): string {
  const exact = (h / day) * 4;
  const q = Math.round(exact);
  if (q === 0) return 'under a quarter of a day';
  /* Rounded, it says so: three hours of an eight-hour day is not half. */
  const about = Math.abs(exact - q) > 0.01 ? 'about ' : '';
  const whole = Math.floor(q / 4), part = q % 4;
  if (!whole) return about + (part === 1 ? 'a quarter of a day' : part === 2 ? 'half a day' : 'three quarters of a day');
  return `${about}${whole}${QUARTER[part]} day${whole === 1 && !part ? '' : 's'}`;
}

export interface HoursPart { id: string; what: string; hours: number; on: number }
export interface HoursTally {
  /** Every hour lost on the stage. */
  hours: number;
  /** Days of finish those hours have already pushed. */
  pushedDays: number;
  /** Hours not yet a day — counting towards the next push. */
  banked: number;
  /** The problems written since the last push from hours. */
  pending: HoursPart[];
  /** For each push made from hours (keyed by the problem that tipped it), the
   *  problems whose hours made it up. */
  pushes: Map<string, HoursPart[]>;
}

const isLive = (i: TestItem) => !i.deletedAt;

/** What the hours on one stage (or any record key) come to. */
export function hoursTally(key: string, items: TestItem[], day: number): HoursTally {
  const mine = items.filter(i => isLive(i) && i.testId === key && i.kind === 'found' && (i.hoursLost ?? 0) > 0)
    .sort((a, b) => a.createdAt - b.createdAt);
  const pushes = new Map<string, HoursPart[]>();
  let pending: HoursPart[] = [];
  let hours = 0, pushedDays = 0;
  for (const i of mine) {
    const h = i.hoursLost as number;
    hours += h;
    pending.push({ id: i.id, what: i.what, hours: h, on: i.createdAt });
    if (i.movedFrom && i.movedTo) {
      pushedDays += Math.max(0, daysBetween(i.movedFrom, i.movedTo));
      pushes.set(i.id, pending);
      pending = [];
    }
  }
  const banked = Math.max(0, Math.round((hours - pushedDays * day) * 100) / 100);
  /* What a push did not use stays banked: ten hours on an eight-hour day
     push one day and leave two towards the next. `pending` is the problems
     written since the last push. */
  return { hours, pushedDays, banked, pending: banked > 0 ? pending : [], pushes };
}

/** How many whole days `banked` plus `adding` hours make — the push to offer. */
export const fullDays = (banked: number, adding: number, day: number): number =>
  Math.floor((banked + adding) / day + 1e-9);

/** "8 h lost — guard bracket 2 h; waiting on air 1 h; guard remade 5 h". */
export function partsWord(parts: HoursPart[]): string {
  const total = parts.reduce((a, p) => a + p.hours, 0);
  return `${hoursWord(total)} lost — ${parts.map(p => `${p.what} ${hoursWord(p.hours)}`).join('; ')}`;
}
