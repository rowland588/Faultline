/* A STOP PUT RIGHT — one entry of a line's log changed where it is listed
 * (docs/AUDIT.md, bar 2: every record's words changed where it sits).
 *
 * A stop timed on Capture could be deleted with Undo, never changed: a
 * mis-tapped machine, the wrong reason or a stopwatch left running meant
 * deleting it and timing it again — which cannot be done, the stop is over.
 * Now its machine, what it was, its kind, its minutes, its note and its cause
 * family are changed in place.
 *
 * HOW IT IS KNOWN STAYS TRUE. Every number says how it is known (CLAUDE.md:
 * measured by people). A stop whose minutes are typed over is no longer what
 * the stopwatch timed: it becomes 'typed', and its end moves with its length
 * so a loss count reading the stops in its window reads what was said. A
 * change that leaves the minutes alone keeps 'stopwatch'. */
import type { Observation } from '../types';
import type { SixM } from './sixm';

export interface StopChange {
  asset: string;
  category: string;
  /** '' — no kind. */
  subcategory: string;
  /** Minutes as typed; undefined — the length is not changed. */
  minutes?: number;
  note: string;
  /** undefined — no cause family given. */
  causeM?: SixM;
}

/** The stop as it is to be written, or null when nothing changed or the
 *  change cannot be written (a machine or a reason left empty, minutes not a
 *  number of at least zero). */
export function changedStop(o: Observation, c: StopChange): Observation | null {
  const asset = c.asset.trim(), category = c.category.trim(), sub = c.subcategory.trim(), note = c.note.trim();
  if (!asset || !category) return null;
  if (c.minutes !== undefined && !(Number.isFinite(c.minutes) && c.minutes >= 0)) return null;
  const ms = c.minutes === undefined ? o.durationMs : Math.round(c.minutes * 60_000);
  const timeMoved = ms !== o.durationMs;
  const next: Observation = { ...o, asset, category, durationMs: ms };
  if (sub) next.subcategory = sub; else delete next.subcategory;
  if (note) next.note = note; else delete next.note;
  if (c.causeM) next.causeM = c.causeM; else delete next.causeM;
  if (timeMoved) {
    next.timing = ms > 0 ? 'typed' : 'instant';
    if (o.endedAt != null) next.endedAt = o.startedAt + ms;
  }
  const same = next.asset === o.asset && next.category === o.category && (next.subcategory ?? '') === (o.subcategory ?? '')
    && next.durationMs === o.durationMs && (next.note ?? '') === (o.note ?? '') && next.causeM === o.causeM;
  return same ? null : next;
}

/** "4.0" for 240 000 ms — the minutes a stop's box opens with. */
export const minutesOf = (ms: number): string => (Math.round((ms / 60_000) * 10) / 10).toString();
