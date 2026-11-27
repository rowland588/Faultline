import type { LossEngineReport } from './types';
import { penceToPounds } from './money';

/** Numbers Luna may quote from a loss report — every £ as pounds and pence, minutes as worked. */
export function narrativeFigurePool(r: LossEngineReport): number[] {
  const madePacks = r.expectedPacks - r.shortPacks;
  const out: number[] = [
    r.sigmaMinutes,
    r.effectiveMinutes,
    r.oee,
    r.expectedPacks,
    r.shortPacks,
    madePacks,
    100 * r.oee,
    ...Object.values(r.families),
    ...r.ledger.map(l => l.minutes),
  ];
  const addPence = (p: number | undefined) => {
    if (p === undefined || !Number.isFinite(p)) return;
    out.push(p / 100, penceToPounds(p));
  };
  addPence(r.money.idleLabourPence);
  addPence(r.money.contributionPence);
  addPence(r.money.scrapPence);
  return [...new Set(out.filter(n => Number.isFinite(n)))];
}