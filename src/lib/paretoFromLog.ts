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
import type { PaceParetoSheet, PaceParetoRow } from './tracker';
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

/** What a bar's minutes are filed under when they were timed on the project's
 *  own walk rather than on one of its lines. */
export const PROJECT_WALK = 'The project';

/* A BAR IS A DOOR INTO THE LINE IT WAS TIMED ON (HUNT 15).
 *
 * The project's Pareto adds every line's log together; the drill that says
 * which machine, which sub-category, which shift lives on each line's own
 * study (screens/AnalyseScreen). So a bar opens the line where most of its
 * minutes were lost — that is where the cause is, and where "Find the root
 * cause" already puts the problem (ParetoScreen's lineOfBar). */
export interface BarDrill { wsId: string; name: string; mins: number }

/** Where a bar's minutes were timed, most first — each with the study to
 *  drill. `byLine` is keyed by the line's name (paretoFromLog); minutes on the
 *  project's own walk open that walk. A name with no study is left out: there
 *  is nothing on this device to drill into. */
export function barDrills(
  byLine: Record<string, number> | undefined,
  lines: { name: string; workspaceId?: string }[],
  walkId?: string,
): BarDrill[] {
  const out: BarDrill[] = [];
  for (const [name, mins] of Object.entries(byLine ?? {})) {
    if (!(mins > 0)) continue;
    const wsId = name === PROJECT_WALK && !lines.some(l => l.name === name)
      ? walkId : lines.find(l => l.name === name && l.workspaceId)?.workspaceId;
    if (wsId) out.push({ wsId, name, mins });
  }
  return out.sort((a, b) => b.mins - a.mins || a.name.localeCompare(b.name));
}

/** A REAL TIE: the top two lines lost the same minutes as the screen prints
 *  them (a tenth under 100, whole above). Then neither is "mostly", and the
 *  row asks which line rather than choosing one for you. */
export function isTie(d: BarDrill[]): boolean {
  if (d.length < 2) return false;
  const shown = (n: number) => (n >= 100 ? Math.round(n) : Math.round(n * 10) / 10);
  return shown(d[0].mins) === shown(d[1].mins);
}

/** The drill's value for a bar. The Pareto files a blank category as
 *  "Uncategorised"; the drill (engine/types dimOf) as "(uncategorised)". */
export const drillCategory = (category: string): string =>
  category === 'Uncategorised' ? '(uncategorised)' : category;

export interface ProjectPareto {
  loading: boolean;
  now?: PaceParetoSheet;
  before?: PaceParetoSheet;
}

/** The project's Pareto — every line's log, this window and the last. With
 *  a line, that line's log only (the Pareto pane on a line's fishbone page). */
export function useProjectPareto(projectId: string, today = Date.now(), lineId?: string): ProjectPareto {
  const [st, setSt] = useState<ProjectPareto>({ loading: true });
  // Midnight-aligned, so the windows (and the dependency) only change once a day.
  const end = new Date(today).setHours(0, 0, 0, 0) + DAY;
  const load = useCallback(async () => {
    const [all, lines] = await Promise.all([projectWorkspaceIds(projectId), loadPaceLines(projectId)]);
    const ws = lineId ? lines.find(l => l.id === lineId)?.workspaceId : undefined;
    const ids = lineId ? all.filter(id => id === ws) : all;
    const obs = (await Promise.all(ids.map(id => listObservations(id)))).flat();
    const lineOf = (o: Observation) => lines.find(l => l.workspaceId === o.workspaceId)?.name ?? PROJECT_WALK;
    const w = PARETO_WINDOW_DAYS * DAY;
    setSt({
      loading: false,
      now: paretoFromLog(obs, end - w, end, lineOf),
      before: paretoFromLog(obs, end - 2 * w, end - w, lineOf),
    });
  }, [projectId, end, lineId]);
  useEffect(() => { void load(); return onDataChange(() => { void load(); }); }, [load]);
  return st;
}
