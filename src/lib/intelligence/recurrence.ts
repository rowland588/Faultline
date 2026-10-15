/* CHRONIC OR A ONE-OFF — a loss that comes back week after week is a
 * different problem from one bad day (docs/upgrade-plan.md, L; the brief:
 * "separate chronic losses from one-offs"). Counted in weeks with something
 * logged, over the last six: in two weeks of three or more, chronic; once,
 * a one-off; between, recurring. Pure. */
import type { Observation } from '../../types';
import { live, weekStart, WEEK } from './stops';

export type RecurKind = 'chronic' | 'recurring' | 'one-off';
export interface Recurrence { seen: number; of: number; kind: RecurKind; says: string }

export function recurrence(obs: readonly Observation[], now: number, weeks = 6): Recurrence {
  const w0 = weekStart(now), from = w0 - (weeks - 1) * WEEK;
  const ws = new Set(live(obs).filter(o => o.startedAt >= from).map(o => weekStart(o.startedAt)));
  const seen = ws.size;
  const kind: RecurKind = seen <= 1 ? 'one-off' : seen >= Math.ceil((weeks * 2) / 3) ? 'chronic' : 'recurring';
  const says = kind === 'one-off' ? (seen ? 'one week only' : 'not in the last weeks') : `${kind} — ${seen} of the last ${weeks} weeks`;
  return { seen, of: weeks, kind, says };
}
