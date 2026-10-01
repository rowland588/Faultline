/* WHY AN ACTION WAS RAISED, IN THE LOSS THAT RAISED IT.
 *
 * An action written off a Pareto bar used to be just a sentence; the number
 * that made it matter stayed behind on the chart. It now carries it, in words
 * a room can read aloud, worked out from the timed stops in the last four
 * weeks: "Changeover · Bagger — 3.2 h lost in the last 4 weeks, 41% of this
 * line's lost time (18 stops)". It is written once, when the action is
 * raised, so it is also the "before" the action is later judged against. */
import type { DrillPath, Observation } from '../types';
import { applyDrill } from '../engine/drill';

const DAY = 86_400_000;
export const CONTEXT_DAYS = 28;

const hours = (ms: number): string => {
  const h = ms / 3_600_000;
  return h >= 10 ? `${Math.round(h)} h` : h >= 1 ? `${Math.round(h * 10) / 10} h` : `${Math.round(ms / 60_000)} min`;
};

/** The words for a scope's loss; empty when nothing was timed in the window. */
export function lossContext(obs: Observation[], wsId: string, path: DrillPath, now = Date.now()): string {
  const from = now - CONTEXT_DAYS * DAY;
  const inWindow = obs.filter(o => o.workspaceId === wsId && o.deletedAt == null && o.startedAt >= from && o.startedAt <= now);
  const scoped = applyDrill(inWindow, wsId, path);
  const ms = scoped.reduce((n, o) => n + o.durationMs, 0);
  if (scoped.length === 0 || ms <= 0) return '';
  const total = inWindow.reduce((n, o) => n + o.durationMs, 0);
  const label = path.map(s => s.value).join(' · ');
  const share = total > 0 && path.length > 0 ? `, ${Math.round((ms / total) * 100)}% of this line’s lost time` : '';
  const stops = scoped.reduce((n, o) => n + Math.max(1, o.count || 1), 0);
  return `${label ? label + ' — ' : ''}${hours(ms)} lost in the last ${CONTEXT_DAYS / 7} weeks${share} (${stops} stop${stops === 1 ? '' : 's'})`;
}
