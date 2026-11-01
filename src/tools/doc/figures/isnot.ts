/* IS / IS NOT'S ARITHMETIC — pure (knowledge/specs/FC-149-is-is-not.md; knowledge/methods/rca/is-is-not.md, Kepner & Tregoe).
 * Nothing here is statistics: it is the comparison the method makes by eye, said exactly.
 *
 *   ratio       = how often on the IS side ÷ how often on the IS NOT side (percent of packs, both);
 *   bad packs   = packs on the IS side a shift × the IS rate; the excess is what the IS NOT side's rate would not have made;
 *   materials   = excess packs × what a pack's materials cost — a cost of the extra bad packs only (contribution is the loss count's to say);
 *   lead days   = the day the problem began − the day the change was made: a change AFTER it began (negative) cannot have caused it;
 *   a cause is tested against each line of the specification: it explains it, it needs an extra assumption, or it cannot. One "cannot" rules it out;
 *   the most probable is the one that explains every line with the fewest assumptions. */
import { daysBetween } from '../../../lib/weeks';

export const ratioOf = (isRate: number, notRate: number): number | undefined => (notRate > 0 && isRate >= 0 ? isRate / notRate : undefined);
export const badPacks = (packs: number, ratePct: number): number => (packs * ratePct) / 100;
export const excessPacks = (packs: number, isRate: number, notRate: number): number => badPacks(packs, isRate) - badPacks(packs, notRate);
export const excessMaterials = (excess: number, perPack: number): number => excess * perPack;
export const leadDays = (began: string, changed: string): number => daysBetween(changed, began);

export type Fit = 'yes' | 'assume' | 'no';
export type Verdict = { kind: 'fits' | 'assumes' | 'ruled-out' | 'untested'; fits: number; assumptions: number; cannot: number; tested: number };

/** One cause against the lines it was tested on (the lines left blank are not counted as tested). */
export function verdictOf(fits: readonly (Fit | '')[]): Verdict {
  const tested = fits.filter((f): f is Fit => f !== '');
  const cannot = tested.filter(f => f === 'no').length, assumptions = tested.filter(f => f === 'assume').length, yes = tested.filter(f => f === 'yes').length;
  const kind = !tested.length ? 'untested' : cannot ? 'ruled-out' : assumptions ? 'assumes' : 'fits';
  return { kind, fits: yes, assumptions, cannot, tested: tested.length };
}
