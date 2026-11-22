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

/** The shifts that own a window of the clock — both times set, and not the same time twice. */
export const timedShifts = (shifts: readonly Shift[] | undefined): Shift[] => (shifts ?? []).filter(s => { const a = mins(s.start), b = mins(s.end); return a != null && b != null && a !== b; });

/** THE SHIFT A MOMENT FELL IN, AND THE DAY THAT SHIFT BEGAN (local clock) — for reading stops by shift (lib/data/datasets, the
 *  stops table's "clock shift" and "shift day"). A stop at 02:00 in Nights 22:00–06:00 belongs to the night that began the DAY
 *  BEFORE: by shift and day it is put with the rest of its shift, never split across two days. First match wins, as shiftAtTime;
 *  null when the moment is in no shift's hours. */
export function shiftAndDay(shifts: readonly Shift[], at: number): { name: string; day: string } | null {
  const d = new Date(at);
  const t = d.getHours() * 60 + d.getMinutes();
  for (const s of shifts) {
    const a = mins(s.start), b = mins(s.end);
    if (a == null || b == null || a === b) continue;
    const wraps = a > b;
    if (!(wraps ? t >= a || t < b : t >= a && t < b)) continue;
    const began = wraps && t < b ? new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1) : d;
    const p = (n: number) => String(n).padStart(2, '0');
    return { name: s.name, day: `${began.getFullYear()}-${p(began.getMonth() + 1)}-${p(began.getDate())}` };
  }
  return null;
}

/** THE WINDOW A SHIFT OWNS ON A DAY (local clock), epoch ms — for a shift's
 *  loss count (lib/ie/losses): `day` is YYYY-MM-DD, the day the shift
 *  starts. Nights 22:00–06:00 runs into the next day. Undefined when the
 *  shift has no times, or the same time twice. */
export function shiftWindow(s: Pick<Shift, 'start' | 'end'>, day: string): { from: number; to: number } | undefined {
  const a = mins(s.start), b = mins(s.end);
  if (a == null || b == null || a === b) return undefined;
  const [y, m, d] = day.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  const from = new Date(y, m - 1, d, Math.floor(a / 60), a % 60).getTime();
  const to = new Date(y, m - 1, d + (b > a ? 0 : 1), Math.floor(b / 60), b % 60).getTime();
  return to > from ? { from, to } : undefined;
}
