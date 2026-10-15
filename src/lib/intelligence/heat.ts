/* WHERE AND WHEN THE LINE STOPS — a machine × day grid of stop minutes over
 * the last four weeks (docs/upgrade-plan.md, C: "a line × day heatmap"). A
 * machine stopped on most days is chronic and reads as a band across; one bad
 * day is a single dark cell. The grid's own sentence names the worst cell and
 * the machine stopped on the most days, so the picture is never the only
 * carrier. Stops are counted once per machine (stopMinutes). Pure. */
import type { Observation } from '../../types';
import { between, norm, stopMinutes } from './stops';
import { WHOLE_LINE } from './constraint';

const DAY = 86_400_000;
export interface HeatRow { asset: string; min: number[]; days: number; total: number }
export interface Heat { from: number; days: number; rows: HeatRow[]; max: number; says: string }

const dayStart = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
/* "the Flow wrapper", but "the whole line" */
const the = (a: string) => (WHOLE_LINE.test(norm(a)) ? 'the whole line' : `the ${a}`);
const cap = (t: string) => t[0].toUpperCase() + t.slice(1);
const nice = (t: number) => new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/** `order` — the line's machines in flow order; any machine a stop names that
 *  is not on it follows, the most stopped first. */
export function heatOf(obs: readonly Observation[], now: number, order: readonly string[] = [], days = 28): Heat {
  const from = dayStart(now) - (days - 1) * DAY;
  const recent = between(obs, from, dayStart(now) + DAY);
  const groups = new Map<string, { asset: string; obs: Observation[] }>();
  for (const o of recent) {
    const k = norm(o.asset);
    if (!k) continue;
    (groups.get(k) ?? groups.set(k, { asset: o.asset.trim(), obs: [] }).get(k))?.obs.push(o);
  }
  const rows: HeatRow[] = [...groups.values()].map(g => {
    const min = Array.from({ length: days }, (_, i) => stopMinutes(g.obs.filter(o => o.startedAt >= from + i * DAY && o.startedAt < from + (i + 1) * DAY)));
    return { asset: g.asset, min, days: min.filter(m => m >= 1).length, total: min.reduce((a, b) => a + b, 0) };
  }).filter(r => r.total >= 1);
  const at = (a: string) => { const i = order.findIndex(x => norm(x) === norm(a)); return i < 0 ? Infinity : i; };
  rows.sort((a, b) => at(a.asset) - at(b.asset) || b.total - a.total);
  const max = Math.max(0, ...rows.flatMap(r => r.min));
  if (!rows.length) return { from, days, rows, max, says: 'No stops logged in the last four weeks.' };
  let worst = { asset: rows[0].asset, i: 0, m: -1 };
  for (const r of rows) r.min.forEach((m, i) => { if (m > worst.m) worst = { asset: r.asset, i, m }; });
  const most = [...rows].sort((a, b) => b.days - a.days || b.total - a.total)[0];
  const says = [
    `The worst day: ${the(worst.asset)} on ${nice(from + worst.i * DAY)} — ${Math.round(worst.m)} min.`,
    most.days >= Math.ceil(days / 2)
      ? `${cap(the(most.asset))} stopped on ${most.days} of ${days} days — a chronic loss, not a bad day.`
      : `${cap(the(most.asset))} stopped on the most days — ${most.days} of ${days}.`,
  ].join(' ');
  return { from, days, rows, max, says };
}
