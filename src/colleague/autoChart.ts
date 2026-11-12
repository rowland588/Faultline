/* THE CHART LUNA DID NOT DRAW (12 November — Rowland: "Show me B's trend month by month … the question definitely included a graph, now
 * I have to ask for a graph").
 *
 * A trend is a picture. When a turn worked out a series over time (a result grouped by day, week, month or year), or the person asked
 * for a graph, chart or trend and a result came of it, and Luna drew nothing — the app draws it itself, from that result, through the
 * same make_chart the colleague would have called: no second answer from the AI service, no figure that is not the result's own.
 * This only DECIDES; the screen runs make_chart. Pure. */
import type { DataResult } from '../lib/data/outputs';
import type { Used } from './conversation';

/** Asked for a picture, in the person's own words. */
const ASKED = /\b(graph|chart|plot|trend|trending|over time|month by month|week by week|day by day|year by year|by month|by week|per month|per week)\b/i;
/** Luna already drew, changed or laid out a picture this turn. */
const DREW = new Set(['make_chart', 'refine_chart', 'build_report']);

export interface AutoChart { resultId: string; type: 'line' | 'column' }

/** The chart worth drawing for this turn, or null. `said` is what the person asked; `steps` what the turn ran, in order. */
export function chartWorth(said: string, steps: readonly Used[], results: ReadonlyMap<string, DataResult>): AutoChart | null {
  const done = steps.filter(s => s.status === 'done');
  if (done.some(s => DREW.has(s.name))) return null;
  const ids = done.flatMap(s => s.refs.filter(r => r.kind === 'result').map(r => r.id));
  const r = [...ids].reverse().map(id => results.get(id)).find((x): x is DataResult => !!x);
  if (!r) return null;
  const points = r.result.groups.filter(g => typeof g.values[0] === 'number').length;
  if (points < 3) return null;
  const overTime = !!(r.query as { time?: unknown }).time;
  if (!overTime && !ASKED.test(said)) return null;
  return { resultId: r.id, type: overTime ? 'line' : 'column' };
}
