/* THE CONSTRAINT, AND THE MIRAGE — the signature insight (docs/upgrade-plan.md
 * F1). Goldratt: an hour lost at the bottleneck is an hour lost to the whole
 * line, and it never comes back; an hour saved anywhere else is a mirage — the
 * line makes no more. So every loss that is ranked anywhere in the app says
 * whether it sits on the constraint, and when it does not, says plainly that
 * fixing it will not make more, and where the prize is.
 *
 * The line's constraint is Line capacity's bottleneck (lib/capacity analyse),
 * product by product; products that disagree are said so. A stop is on the
 * constraint when its machine is the constraint's station by name. Pure. */
import type { Observation } from '../../types';
import { analyse, type Capacity } from '../capacity';
import { between, norm, stopMinutes, weekStart, WEEK } from './stops';

export interface LineConstraint {
  /** The station holding the line, as its capacity names it. */
  name: string;
  /** The products it holds. */
  products: string[];
  /** Other products' bottlenecks, when they differ: "Tesco Express — the checkweigher". */
  others: { name: string; products: string[] }[];
}

/** The constraint of a line from its products' capacities — the station that
 *  holds the most products; the rest said beside it. */
export function lineConstraint(products: readonly { product: string; capacity?: Capacity }[]): LineConstraint | undefined {
  const by = new Map<string, { name: string; products: string[] }>();
  for (const p of products) {
    if (!p.capacity?.stations.length) continue;
    const r = analyse(p.capacity);
    const n = r.limit?.station.name.trim();
    if (!n) continue;
    const k = norm(n);
    const e = by.get(k) ?? { name: n, products: [] };
    e.products.push(p.product.trim() || 'a product');
    by.set(k, e);
  }
  const all = [...by.values()].sort((a, b) => b.products.length - a.products.length);
  if (!all.length) return undefined;
  return { ...all[0], others: all.slice(1) };
}

export interface OnConstraint {
  on: boolean | undefined;
  /** "On the constraint — every minute here is a minute of the line's output." ·
   *  "Not the constraint — fixing it will not make more: the line is held at the Pallet wrapper." */
  says: string;
}

/** Is this machine the constraint? Undefined: no constraint known. */
/** A stop logged against the whole line stops the constraint too. */
export const WHOLE_LINE = /^(whole line|the line|line|all|everything|whole)$/;

export function onConstraint(machine: string | undefined, c: LineConstraint | undefined): OnConstraint {
  if (!c) return { on: undefined, says: 'Where the line is held is not known — work out its Line capacity to see which losses cost output.' };
  const m = norm(machine);
  if (WHOLE_LINE.test(m)) return { on: true, says: `The whole line stops — the ${c.name} with it: every minute is output lost.` };
  if (m && m === norm(c.name)) return { on: true, says: `On the constraint — every minute here is a minute of the line's output.` };
  const other = c.others.find(o => norm(o.name) === m);
  if (other) return { on: true, says: `The constraint on ${other.products.join(', ')} — a minute here is output lost on those.` };
  return { on: false, says: `Not the constraint — fixing it will not make more on its own: the line is held at the ${c.name}. The prize is there.` };
}

export interface ConstraintWeek { from: number; machine: string; minutes: number }
export interface ConstraintTrend {
  weeks: ConstraintWeek[];
  /** The machine losing the most stop minutes most weeks. */
  usual?: string;
  /** True when the latest week's worst machine is not the usual one. */
  moved: boolean;
  says: string;
}

/** Where stop minutes concentrate, week by week — the constraint as the floor
 *  lives it, against the one Line capacity names. */
export function constraintTrend(obs: readonly Observation[], now: number, weeks = 6, named?: string): ConstraintTrend {
  const w0 = weekStart(now);
  const rows: ConstraintWeek[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    /* a stop of the whole line is not a machine that could be the constraint */
    const from = w0 - i * WEEK, list = between(obs, from, from + WEEK).filter(o => !WHOLE_LINE.test(norm(o.asset)));
    if (!list.length) continue;
    const per = new Map<string, number>();
    for (const m of new Set(list.map(o => o.asset.trim() || 'No machine named'))) per.set(m, stopMinutes(list.filter(o => (o.asset.trim() || 'No machine named') === m)));
    const [machine, minutes] = [...per].sort((a, b) => b[1] - a[1])[0];
    if (minutes > 0) rows.push({ from, machine, minutes });
  }
  if (!rows.length) return { weeks: [], moved: false, says: 'No stops logged in the last weeks.' };
  const tally = new Map<string, number>();
  rows.forEach(r => tally.set(norm(r.machine), (tally.get(norm(r.machine)) ?? 0) + 1));
  const usualK = [...tally].sort((a, b) => b[1] - a[1])[0][0];
  const usual = rows.find(r => norm(r.machine) === usualK)?.machine as string;
  const last = rows[rows.length - 1];
  const moved = rows.length >= 3 && norm(last.machine) !== usualK;
  const vsNamed = named && norm(named) !== usualK ? ` Line capacity names the ${named} as the bottleneck — the stops say the ${usual} loses the most. One of the two is not the whole story.` : '';
  const says = moved
    ? `The losses moved: this week the ${last.machine} lost the most (${Math.round(last.minutes)} min); in ${tally.get(usualK)} of ${rows.length} weeks it was the ${usual}.${vsNamed}`
    : rows.length === 1 ? `The ${usual} lost the most stop minutes in the one week logged (${Math.round(last.minutes)} min).${vsNamed}`
      : `The ${usual} loses the most stop minutes in ${tally.get(usualK)} of ${rows.length} weeks.${vsNamed}`;
  return { weeks: rows, usual, moved, says };
}

export interface ConstraintShare { onMin: number; offMin: number; share: number; says?: string }

/** How much of a loss's stops sit on the constraint — a band like
 *  "Breakdown" is the flow wrapper's and the weigher's together, and only the
 *  part on the constraint costs output. */
export function constraintShare(stops: readonly Observation[], c: LineConstraint | undefined): ConstraintShare {
  if (!c) return { onMin: 0, offMin: stopMinutes(stops), share: 0 };
  const isOn = (o: Observation) => onConstraint(o.asset, c).on === true;
  const onMin = stopMinutes(stops.filter(isOn)), offMin = stopMinutes(stops.filter(o => !isOn(o)));
  const all = onMin + offMin, share = all > 0 ? onMin / all : 0;
  const r = (n: number) => `${Math.round(n).toLocaleString('en-GB')} min`;
  const says = !(all > 0) ? undefined
    : share >= 0.95 ? `On the constraint — every minute is output lost.`
      : share <= 0.05 ? `Not the constraint — fixing it will not make more on its own: the line is held at the ${c.name}. The prize is there.`
        : `${r(onMin)} of it is on the constraint (${Math.round(share * 100)}%) — that part costs output; the other ${r(offMin)} makes no more when fixed.`;
  return { onMin, offMin, share, ...(says ? { says } : {}) };
}
