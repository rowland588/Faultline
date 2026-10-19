/* A TIME TAKEN ON THE FLOOR, IN ITS BOX'S UNIT — the arithmetic behind a
 * timed box (lib/flow/definition 'timer'; ui/flow/Timer). A span of time kept
 * as the floor reads it — a tenth of a second, a hundredth of a minute, a
 * thousandth of an hour — and the running clock as a person reads it. */
import type { TimerUnit } from './definition';

const PER: Record<TimerUnit, number> = { s: 1000, min: 60_000, h: 3_600_000 };
const DP: Record<TimerUnit, number> = { s: 1, min: 2, h: 3 };

/** A span of milliseconds in the box's unit, rounded as the floor reads it. */
export function timeIn(ms: number, unit: TimerUnit): number {
  const f = 10 ** DP[unit];
  return Math.round((Math.max(0, ms) / PER[unit]) * f) / f;
}

/** The running clock: 0:07.3, 12:04.0, 1:02:09. */
export function clockSaid(ms: number): string {
  const t = Math.max(0, ms) / 1000;
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(Math.floor(s)).padStart(2, '0')}`;
  const tenths = Math.floor(s * 10) / 10;
  return `${m}:${tenths.toFixed(1).padStart(4, '0')}`;
}
