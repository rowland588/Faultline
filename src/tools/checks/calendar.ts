/* THE LOG AS A CALENDAR (docs/TOOLS-DESIGN.md T6, 8 November) — the last four weeks a day a cell: how many checks were done that day and
 * how many of them did not pass (lib verdictOf — a value outside its limits, a score under the agreed one, a fail), so a gap in the
 * routine and a bad day are seen at a glance beside the round. Read from the log's own results; nothing new kept. */
import type { AgreedLog, LogResult } from '../../lib/study';
import { verdictOf } from './checks';
import type { LogDef } from './def';

const startOfDay = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const addDays = (t: number, n: number) => { const d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); };

export interface CalDay { day: number; done: number; bad: number; future: boolean; before: boolean }
export interface LogCalendar { weeks: CalDay[][]; done: number; bad: number; daysDone: number; daysWith: number }

/** The last `weeks` weeks, Monday first, ending with this week; a day before the log started is marked so (not a gap). */
export function logCalendar(log: AgreedLog, results: readonly LogResult[] | undefined, def: Pick<LogDef, 'scale' | 'scoreRule'> | undefined, now: number, weeks = 4): LogCalendar {
  const today = startOfDay(now);
  const dow = (new Date(today).getDay() + 6) % 7;
  const first = addDays(today, -dow - 7 * (weeks - 1));
  const byId = new Map(log.checks.map(c => [c.id, c]));
  const since = startOfDay(log.since);
  const out: CalDay[][] = [];
  let done = 0, bad = 0, daysDone = 0, daysWith = 0;
  for (let w = 0; w < weeks; w++) {
    const row: CalDay[] = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(first, w * 7 + d), next = addDays(day, 1);
      const rs = (results ?? []).filter(r => !r.struck && r.at >= day && r.at < next);
      const b = rs.filter(r => { const c = byId.get(r.checkId); return c ? verdictOf(c, r, def) === 'bad' : r.outcome === 'fail'; }).length;
      const future = day > today, before = next <= since;
      row.push({ day, done: rs.length, bad: b, future, before });
      if (!future && !before) { daysWith++; if (rs.length) daysDone++; }
      done += rs.length; bad += b;
    }
    out.push(row);
  }
  return { weeks: out, done, bad, daysDone, daysWith };
}
