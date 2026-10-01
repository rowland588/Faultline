/* THE PARETO, FROM WHAT WAS TIMED IN THE APP.
 *
 * It was read off the Pareto sheet of an uploaded workbook. Rowland: "switch
 * to full app only." The app already times losses on the floor — every line's
 * log (Capture: a category, a stopwatch, a count) — so the Pareto is drawn
 * from that, in the same shape the sheet had, and everything downstream (the
 * ranking, the vital few, the movement column, the report page) is unchanged.
 *
 * TWO WINDOWS, BECAUSE MOVEMENT NEEDS TWO READINGS: the last four weeks, and
 * the four weeks before them. The windows never overlap, so paretoView's one
 * rule — the same period twice is not movement — holds by construction.
 */
import { useCallback, useEffect, useState } from 'react';
import type { Observation } from '../types';
import type { PaceParetoSheet, PaceParetoRow } from './paceWorkbook';
import { listObservations, loadPaceLines, onDataChange, projectWorkspaceIds } from '../db';

const DAY = 86_400_000;
/** One window: four weeks, the span a weekly meeting can see move. */
export const PARETO_WINDOW_DAYS = 28;

const day = (ms: number) =>
  new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Long stops and frequent short ones need different fixes, so each row says
 *  which it is — worked out from the minutes per stop. */
export function profileOf(minPerEvent: number): string {
  if (minPerEvent >= 10) return 'Long-stop';
  if (minPerEvent < 2) return 'Frequency';
  return 'Mixed';
}

/** The log between two instants as a Pareto sheet; undefined when nothing
 *  timed falls inside it. `lineOf` names the line each row was logged on. */
export function paretoFromLog(
  obs: Observation[], from: number, to: number, lineOf: (o: Observation) => string,
): PaceParetoSheet | undefined {
  const inside = obs.filter(o => !o.deletedAt && o.startedAt >= from && o.startedAt < to && (o.durationMs > 0 || o.count > 0));
  if (inside.length === 0) return undefined;
  const by = new Map<string, { mins: number; events: number; byLine: Record<string, number> }>();
  for (const o of inside) {
    const k = (o.category || 'Uncategorised').trim();
    const r = by.get(k) ?? { mins: 0, events: 0, byLine: {} };
    const m = o.durationMs / 60_000;
    r.mins += m;
    r.events += Math.max(1, o.count || 1);
    const l = lineOf(o);
    r.byLine[l] = (r.byLine[l] ?? 0) + m;
    by.set(k, r);
  }
  const rows: PaceParetoRow[] = [...by.entries()]
    .map(([category, r]) => {
      const minPerEvent = r.events ? r.mins / r.events : 0;
      return { category, mins: r.mins, events: r.events, minPerEvent, profile: profileOf(minPerEvent), byLine: r.byLine };
    })
    .sort((a, b) => b.mins - a.mins || b.events - a.events);
  const totalMins = rows.reduce((n, r) => n + r.mins, 0);
  const totalStops = rows.reduce((n, r) => n + r.events, 0);
  const top = rows[0];
  return {
    rows, totalMins, totalStops,
    period: `${day(from)} – ${day(to - DAY)}`,
    headline: top && totalMins > 0
      ? `${top.category} is ${Math.round((top.mins / totalMins) * 100)}% of the time lost.`
      : undefined,
  };
}

export interface ProjectPareto {
  loading: boolean;
  now?: PaceParetoSheet;
  before?: PaceParetoSheet;
}

/** The project's Pareto — every line's log, this window and the last. */
export function useProjectPareto(projectId: string, today = Date.now()): ProjectPareto {
  const [st, setSt] = useState<ProjectPareto>({ loading: true });
  // Midnight-aligned, so the windows (and the dependency) only change once a day.
  const end = new Date(today).setHours(0, 0, 0, 0) + DAY;
  const load = useCallback(async () => {
    const [ids, lines] = await Promise.all([projectWorkspaceIds(projectId), loadPaceLines(projectId)]);
    const obs = (await Promise.all(ids.map(id => listObservations(id)))).flat();
    const lineOf = (o: Observation) => lines.find(l => l.workspaceId === o.workspaceId)?.name ?? 'The project';
    const w = PARETO_WINDOW_DAYS * DAY;
    setSt({
      loading: false,
      now: paretoFromLog(obs, end - w, end, lineOf),
      before: paretoFromLog(obs, end - 2 * w, end - w, lineOf),
    });
  }, [projectId, end]);
  useEffect(() => { void load(); return onDataChange(() => { void load(); }); }, [load]);
  return st;
}
