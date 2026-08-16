/* Shift arithmetic. A shift with both times set owns a window of the clock;
 * the window may wrap midnight (Nights 22:00–06:00). Capture uses this to
 * stamp the shift AUTOMATICALLY from when the event started — operators
 * shouldn't have to know what shift they're on, the clock does. A shift with
 * no times still works as a manual pick. */
import type { Shift } from '../types';

const mins = (hhmm: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]), mm = Number(m[2]);
  return h > 23 || mm > 59 ? null : h * 60 + mm;
};

/** The shift whose window contains `at` (local clock). Wrapping windows
 *  (start > end) span midnight. First match wins; null when none. */
export function shiftAtTime(shifts: Shift[], at: number): string | null {
  const d = new Date(at);
  const t = d.getHours() * 60 + d.getMinutes();
  for (const s of shifts) {
    const a = mins(s.start), b = mins(s.end);
    if (a == null || b == null || a === b) continue;
    const inWindow = a < b ? t >= a && t < b : t >= a || t < b;
    if (inWindow) return s.name;
  }
  return null;
}
