/* THE CHECKS ON THE READINGS the questions share (W3a; moved out of analysis.ts in W3c so ./measure says them the same way): a
 * reading beyond the fences is looked at and never removed, and readings in order that lean on the last are said so. Pure. */
import type { Described } from '../../lib/ie/describe';
import { orderSays } from '../../lib/ie/describe';
import type { Autocorrelation } from '../../lib/ie/stats';
import { fx } from './format';
import type { Check } from './analysis';

export const outlierCheck = (what: string, d?: Described): Check | undefined => (d && d.outliers.length
  ? { what, say: `${what}: ${d.outliers.length} reading${d.outliers.length === 1 ? '' : 's'} beyond the fences (${d.outliers.slice(0, 4).map(o => `${o.value} at reading ${o.at + 1}`).join(', ')}${d.outliers.length > 4 ? ', …' : ''}) — look at ${d.outliers.length === 1 ? 'it' : 'them'}; none is removed.`, tone: 'a' } : undefined);

export const independenceCheck = (what: string, ac?: Autocorrelation): Check | undefined => {
  if (!ac) return undefined;
  if (!ac.enough) return { what, say: `${what}: ${ac.n} readings in order — fewer than 30, too few to judge whether each depends on the last.`, tone: 'n' };
  if (!ac.dependent) return { what, say: `${what}: each reading is independent enough of the last (r₁ ${fx(ac.r1, 2)}, inside ±${fx(ac.band, 2)}).`, tone: 'n' };
  return { what, say: orderSays(ac, 'Readings'), tone: 'a' };
};
