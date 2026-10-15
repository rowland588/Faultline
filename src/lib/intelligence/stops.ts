/* A LINE'S STOPS, COUNTED ONCE — the minutes behind every waterfall band and
 * Pareto bar (docs/upgrade-plan.md F1). Two people timing the same jam on the
 * same machine, or a stop typed over one stopwatched, must not double the
 * minutes: overlapping stops on one machine are counted as the time they
 * cover together. Stops on different machines overlap freely — two machines
 * really can be down at once. Pure. */
import type { Observation } from '../../types';

const MIN = 60_000;
export const live = (obs: readonly Observation[]) => obs.filter(o => !o.deletedAt);
export const norm = (s: string | undefined) => (s ?? '').trim().toLowerCase();

/** The stop's interval, ms — a typed stop runs from its start for its length. */
export const spanOf = (o: Pick<Observation, 'startedAt' | 'endedAt' | 'durationMs'>): [number, number] =>
  [o.startedAt, Math.max(o.startedAt, o.endedAt ?? o.startedAt + Math.max(0, o.durationMs))];

/** The minutes a set of stops covers, overlaps on one machine counted once. */
export function stopMinutes(obs: readonly Observation[]): number {
  const byMachine = new Map<string, [number, number][]>();
  for (const o of live(obs)) {
    if (!(o.durationMs > 0)) continue;
    const k = norm(o.asset);
    (byMachine.get(k) ?? byMachine.set(k, []).get(k) as [number, number][]).push(spanOf(o));
  }
  let ms = 0;
  for (const spans of byMachine.values()) {
    spans.sort((a, b) => a[0] - b[0]);
    let [s, e] = spans[0];
    for (const [a, b] of spans.slice(1)) {
      if (a <= e) e = Math.max(e, b);
      else { ms += e - s; [s, e] = [a, b]; }
    }
    ms += e - s;
  }
  return ms / MIN;
}

/** The stops whose start falls in [from, to). */
export const between = (obs: readonly Observation[], from: number, to: number) => live(obs).filter(o => o.startedAt >= from && o.startedAt < to);

/** Monday 00:00 local of the week `t` is in. */
export function weekStart(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}
export const WEEK = 7 * 24 * 3_600_000;

/** What a stop is, for a list: "Misfeed · Basketer". */
export const reasonOf = (o: Pick<Observation, 'category' | 'subcategory'>) => (o.subcategory?.trim() ? `${o.category.trim()} — ${o.subcategory.trim()}` : o.category.trim() || 'Unnamed');
