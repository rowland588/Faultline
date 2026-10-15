/* WHAT A LINE CAN MAKE — three numbers, each with how it is known
 * (docs/upgrade-plan.md, Capacity; docs/CAPACITY.md, capacity's three numbers).
 *
 *   Theoretical   the bottleneck's ideal speed — what the shifts were judged
 *                 against (a machine's plate speed, a person's standard time)
 *   Demonstrated  what the counted shifts proved: good packs ÷ planned
 *                 minutes, the typical (median) shift
 *   Plannable     what four shifts in five beat — the 20th percentile; with
 *                 fewer than five counted, a range and said thin
 *
 * Nothing here reads a machine: every shift is a count a person made (a loss
 * count, lib/ie/losses). Pure. */
import type { LossCount } from '../study';
import { countedRate } from '../ie/losses';
import { confidenceOf, percentile, type Confidence } from './confidence';

export interface ShiftRate { id: string; from: number; perMin: number; made: number; plannedMin: number; ideal?: number }

export interface LineRates {
  shifts: ShiftRate[];
  theoretical?: number;
  demonstrated?: number;
  plannable?: number;
  /** The plannable as a range when thin. */
  plannableRange?: [number, number];
  /** Demonstrated as a share of theoretical. */
  ofIdeal?: number;
  confidence: Confidence;
  says: string;
}

export const MIN_SHIFTS = 5;

export function lineRates(counts: readonly { id: string; count?: LossCount }[], unit = 'packs'): LineRates {
  const shifts: ShiftRate[] = [];
  for (const c of counts) {
    const r = countedRate(c.count);
    if (!r || !(r.plannedMin > 0) || !c.count) continue;
    shifts.push({ id: c.id, from: c.count.from, perMin: r.perMin, made: r.made, plannedMin: r.plannedMin, ...(c.count.ratePerMin ? { ideal: c.count.ratePerMin } : {}) });
  }
  shifts.sort((a, b) => a.from - b.from);
  const confidence = confidenceOf(shifts.map(s => s.from), 'shift');
  const rates = shifts.map(s => s.perMin);
  const ideals = shifts.map(s => s.ideal).filter((x): x is number => x != null);
  const theoretical = ideals.length ? percentile(ideals, 0.5) : undefined;
  const demonstrated = percentile(rates, 0.5);
  const thin = shifts.length < MIN_SHIFTS;
  const plannable = shifts.length && !thin ? percentile(rates, 0.2) : undefined;
  const plannableRange: [number, number] | undefined = thin && shifts.length > 1 ? [Math.min(...rates), percentile(rates, 0.5) as number] : undefined;
  const f = (n: number) => `${n.toLocaleString('en-GB', { maximumFractionDigits: 1 })} ${unit}/min`;
  const ofIdeal = theoretical && demonstrated != null ? demonstrated / theoretical : undefined;
  const says = !shifts.length ? 'No shift counted yet — count one (good packs and the planned minutes) and the line’s demonstrated rate starts here.'
    : thin ? `${shifts.length === 1 ? 'One shift' : `${shifts.length} shifts`} counted: ${f(demonstrated as number)} typical${theoretical ? ` of ${f(theoretical)} ideal` : ''} — too few to plan on yet (${MIN_SHIFTS} wanted).`
      : `The line proved ${f(demonstrated as number)} on a typical shift${theoretical ? ` (${Math.round((ofIdeal as number) * 100)}% of the ${f(theoretical)} ideal)` : ''}; plan on ${f(plannable as number)} — four shifts in five beat it.`;
  return { shifts, ...(theoretical != null ? { theoretical } : {}), ...(demonstrated != null ? { demonstrated } : {}), ...(plannable != null ? { plannable } : {}), ...(plannableRange ? { plannableRange } : {}), ...(ofIdeal != null ? { ofIdeal } : {}), confidence, says };
}
