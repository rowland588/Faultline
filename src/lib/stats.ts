/* The shared statistics behind the "ecosystem" screens — Trend, Asset history
 * and the one-page Report all read from HERE, so a number shown on one screen
 * can never disagree with the same number on another. Pure functions over the
 * workspace's own rows; nothing is stored, everything derives. */
import type { Observation, Workspace } from '../types';
import type { Snag } from '../snag/types';
import { costPerMs } from './cost';

const WEEK_MS = 7 * 24 * 3600_000;

/** Monday 00:00 (local) of the week containing t. */
export function weekStart(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Mon=0
  return d.getTime() - dow * 24 * 3600_000;
}

/** ISO-ish week label ("w32") — enough for an axis, not a standards exercise. */
export function weekLabel(start: number): string {
  const d = new Date(start);
  const jan1 = new Date(d.getFullYear(), 0, 1).getTime();
  return 'w' + String(Math.ceil(((start - jan1) / 24 / 3600_000 + 1) / 7));
}

export interface WeekPoint {
  start: number;      // Monday 00:00
  label: string;      // "w32", last one "now"
  ms: number;         // lost time that week
  cost: number;       // £ (0 when the workspace has no rate)
  count: number;      // observations
  current: boolean;   // the partial, still-running week
}

/** Lost time bucketed into calendar weeks, gaps filled, capped to `maxWeeks`
 *  ending at the current (partial) week. Deleted rows are excluded upstream. */
export function weeklyLoss(obs: Observation[], workspace: Workspace, maxWeeks = 10): WeekPoint[] {
  const factor = costPerMs(workspace);
  const nowStart = weekStart(Date.now());
  const first = obs.length ? Math.min(...obs.map(o => o.startedAt)) : nowStart;
  const from = Math.max(weekStart(first), nowStart - (maxWeeks - 1) * WEEK_MS);
  const byWeek = new Map<number, { ms: number; count: number }>();
  for (const o of obs) {
    const w = weekStart(o.startedAt);
    if (w < from) continue;
    const cur = byWeek.get(w) ?? { ms: 0, count: 0 };
    cur.ms += o.durationMs; cur.count += 1;
    byWeek.set(w, cur);
  }
  const out: WeekPoint[] = [];
  for (let w = from; w <= nowStart; w += WEEK_MS) {
    const b = byWeek.get(w) ?? { ms: 0, count: 0 };
    out.push({ start: w, label: w === nowStart ? 'now' : weekLabel(w), ms: b.ms, cost: b.ms * factor, count: b.count, current: w === nowStart });
  }
  return out;
}

export interface HeadlineKpis {
  lastWeekMs: number; lastWeekCost: number;
  /** vs the average of the 4 prior weeks; null when there's no prior history. */
  deltaPct: number | null;
  costable: boolean;
}

/** "Lost last week" vs the 4 weeks before it — the two numbers at the top of
 *  Trend and the Report. Uses the last FULL week so a Tuesday doesn't read as
 *  a miraculous 80% improvement. */
export function headline(weeks: WeekPoint[], workspace: Workspace): HeadlineKpis {
  const full = weeks.filter(w => !w.current);
  const last = full[full.length - 1];
  const prior = full.slice(-5, -1);
  const avg = prior.length ? prior.reduce((a, w) => a + w.ms, 0) / prior.length : 0;
  return {
    lastWeekMs: last?.ms ?? 0,
    lastWeekCost: last?.cost ?? 0,
    deltaPct: last && avg > 0 ? Math.round(((last.ms - avg) / avg) * 100) : null,
    costable: costPerMs(workspace) > 0,
  };
}

export type Verdict = 'improving' | 'flat' | 'worsening';
export interface CategoryTrend {
  category: string;
  msPerWeek: number;   // recent average
  costPerWeek: number;
  verdict: Verdict;
  changePct: number | null; // recent vs prior; null with too little history
}

/** Per-category momentum: the last 3 full weeks vs the 3 before. The honest
 *  companion to the Pareto — which fixes are working, which loss just sits. */
export function categoryTrends(obs: Observation[], workspace: Workspace): CategoryTrend[] {
  const factor = costPerMs(workspace);
  const nowStart = weekStart(Date.now());
  const recentFrom = nowStart - 3 * WEEK_MS;   // 3 full weeks, excluding current
  const priorFrom = recentFrom - 3 * WEEK_MS;
  const acc = new Map<string, { recent: number; prior: number }>();
  for (const o of obs) {
    if (o.startedAt >= nowStart || o.startedAt < priorFrom) continue;
    const a = acc.get(o.category) ?? { recent: 0, prior: 0 };
    if (o.startedAt >= recentFrom) a.recent += o.durationMs; else a.prior += o.durationMs;
    acc.set(o.category, a);
  }
  const rows: CategoryTrend[] = [...acc.entries()]
    .map(([category, { recent, prior }]) => {
      const msPerWeek = recent / 3;
      const changePct = prior > 0 ? Math.round(((recent - prior) / prior) * 100) : null;
      const verdict: Verdict = changePct == null ? 'flat' : changePct <= -20 ? 'improving' : changePct >= 20 ? 'worsening' : 'flat';
      return { category, msPerWeek, costPerWeek: msPerWeek * factor, verdict, changePct };
    })
    .filter(r => r.msPerWeek > 0 || r.changePct != null)
    .sort((a, b) => b.msPerWeek - a.msPerWeek);
  return rows;
}

export interface ClosedEvent { at: number; label: string }

/** Snag closures inside the charted range — the green flags. */
export function closedEvents(snags: Snag[], weeks: WeekPoint[]): ClosedEvent[] {
  if (!weeks.length) return [];
  const from = weeks[0].start;
  return snags
    .filter(s => s.status === 'closed' && s.closedAt && s.closedAt >= from)
    .sort((a, b) => (a.closedAt! - b.closedAt!))
    .map(s => ({ at: s.closedAt!, label: s.problem }));
}
