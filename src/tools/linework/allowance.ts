/* THE ALLOWANCE AS ITS PARTS (FC-025; knowledge/specs/FC-032-line-balance.md §3 chosen 1, §6.2).
 *
 * Standard time = basic time × (1 + allowance). The ILO builds the allowance from a fixed part (personal
 * needs, basic fatigue) and variable parts (standing, posture, load, heat or cold, noise, light, close
 * attention, monotony, tedium) and a contingency. THE TABLE OF PERCENTAGES IS NOT SUPPLIED HERE: the knowledge
 * record marks its figures "from knowledge … to confirm against the text", and they could not be confirmed on
 * 25 October. So the person types the figure their site agreed for each cause, named, and this adds them — the
 * structure is the ILO's, the numbers are the site's. Pure. */
import type { AgreedBalance, AllowancePart } from '../../lib/study';
import type { BalanceFigures } from './balance';

/** The causes the ILO's structure names, offered as words to pick — with no figure beside any of them. */
export const CAUSES = ['Personal needs', 'Basic fatigue', 'Standing', 'Awkward posture', 'Load or force', 'Heat or cold', 'Noise', 'Poor light', 'Close attention', 'Monotony', 'Tedium', 'Contingency'];

/** The allowance a balance holds to, as a fraction: the sum of its parts when it has them, else the one figure. */
export const allowanceOf = (a?: Pick<AgreedBalance, 'allowance' | 'parts'>): number =>
  a?.parts?.length ? a.parts.reduce((t, p) => t + (Number.isFinite(p.pct) && p.pct > 0 ? p.pct : 0), 0) / 100 : a?.allowance && a.allowance > 0 ? a.allowance : 0;

/** What is wrong with a set of parts, in words — or nothing. */
export function partsProblem(parts: readonly AllowancePart[]): string {
  if (parts.some(p => !p.name.trim())) return 'Name each part — what it is for.';
  if (parts.some(p => !(Number.isFinite(p.pct) && p.pct >= 0))) return 'Each part is a percentage, nought or more.';
  const sum = parts.reduce((t, p) => t + p.pct, 0);
  if (!(sum < 100)) return 'The parts add to 100% or more — an allowance is a share of the basic time, under 100.';
  return '';
}

/** "15% — personal needs 5, basic fatigue 4, standing 2 …" */
export function allowanceSays(a?: Pick<AgreedBalance, 'allowance' | 'parts'>): string {
  const total = allowanceOf(a);
  if (!total) return 'No allowance — the standard time is the basic time.';
  const pct = `${+(total * 100).toFixed(2)}%`;
  if (!a?.parts?.length) return `${pct} allowance, one figure for the balance.`;
  const note = total > 0.25 ? ' Over 25% usually says the job needs redesigning rather than a bigger allowance (the knowledge record’s rule of thumb — practice, not a standard).' : '';
  return `${pct} allowance — ${a.parts.filter(p => p.pct > 0).map(p => `${p.name.trim().toLowerCase()} ${+p.pct.toFixed(2)}`).join(', ')}.${note}`;
}

/** The planned rate an hour at a standard time: 3,600 ÷ seconds. */
export const plannedPerHour = (standardSec: number): number | undefined => (standardSec > 0 ? 3600 / standardSec : undefined);

/** What the allowance is in money, said plainly as rest and never as waste (MONEY.md, FC-025: L): the share of
 *  every standard time that is allowance × the rate, a pack and an hour at takt. Typed and machine steps carry
 *  none. Or the one input it needs. */
export function allowanceMoney(f: BalanceFigures, a: Pick<AgreedBalance, 'allowance' | 'parts'> | undefined, ratePerHour: number | undefined):
  { text: string; perPack?: number; perHour?: number; missing?: string } {
  const al = allowanceOf(a);
  if (!al) return { text: '' };
  if (!(ratePerHour != null && ratePerHour > 0)) return { text: '', missing: 'Give the line an hourly rate in Line capacity to say the allowance in money.' };
  /* allowance seconds in a piece of the line's unit: each timed or reused step's standard × a ÷ (1 + a) */
  const secs = f.people.reduce((t, p) => t + p.elements.filter(e => (e.source === 'timed' || e.source === 'library') && e.kind !== 'machine').reduce((s, e) => s + (e.standard ?? 0), 0) * (al / (1 + al)) / p.per, 0);
  if (!(secs > 0)) return { text: '' };
  const perPack = (secs * ratePerHour) / 3600;
  const perHour = f.taktSec ? (perPack * 3600) / f.taktSec : undefined;
  const m = (v: number) => `£${v < 1 ? v.toFixed(3) : v.toFixed(2)}`;
  return { text: `The allowance is ${secs.toFixed(1)} s of every piece — ${m(perPack)} of labour a pack${perHour != null ? `, ${m(perHour)} an hour at takt` : ''}. It is rest the job needs, not waste.`, perPack, ...(perHour != null ? { perHour } : {}) };
}
