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

/** THE REASONS LOGGED LATELY — machine, what and which kind — newest first,
 *  each once: the floor logs the same few stops again and again, so the last
 *  ones come back as one tap (docs/upgrade-plan.md, L: "recent reasons
 *  first ... one hand"). Only reasons still on the line's lists. Pure. */
export interface Reason { asset: string; category: string; subcategory?: string }
export function recentReasons(obs: readonly Observation[], n: number, on: { assets: readonly string[]; categories: readonly string[] }): Reason[] {
  const out: Reason[] = [], seen = new Set<string>();
  for (const o of [...live(obs)].sort((a, b) => b.createdAt - a.createdAt)) {
    if (!on.assets.includes(o.asset) || !on.categories.includes(o.category)) continue;
    const k = `${o.asset}\u0000${o.category}\u0000${o.subcategory ?? ''}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ asset: o.asset, category: o.category, ...(o.subcategory ? { subcategory: o.subcategory } : {}) });
    if (out.length >= n) break;
  }
  return out;
}
