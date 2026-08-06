/* The compare lens — the reason to Pareto both ways at once. For one dimension it
 * lines up BOTH measures per category: time lost (the magnitude/£) AND frequency
 * (how often). Ranked by whichever the user chose; the OTHER measure rides along
 * so the divergence is visible — the rare-but-costly and the frequent-but-cheap.
 * Pure: rows in, aligned rows out. */
import type { ID, Observation, DimensionKey } from '../types';
import { computePareto } from './pareto';

export type RankMeasure = 'time' | 'count';

export interface CompareRow {
  key: string;
  timeMs: number;
  timeShare: number; // share of total time (0..1)
  count: number;
  countShare: number; // share of total count (0..1)
  cumShare: number; // cumulative share of the RANKED measure (0..1)
  isVitalFew: boolean; // by the ranked measure
  observationIds: ID[];
}

export type DivergeTag = 'costly' | 'frequent';

/** Name the standouts: the one category that eats a far bigger share of TIME than
 *  of stoppages ("rare but costly") and the one that's the reverse ("frequent but
 *  quick"). Only the single biggest gap each way, and only when it's real — so the
 *  chart calls out the insight without tagging every bar. */
export function divergenceTags(rows: CompareRow[], thresh = 0.1): Record<string, DivergeTag> {
  const out: Record<string, DivergeTag> = {};
  if (rows.length < 2) return out;
  let costly: CompareRow | null = null;
  let frequent: CompareRow | null = null;
  for (const r of rows) {
    const gap = r.timeShare - r.countShare; // + = more time than its frequency; − = more frequent than its time
    if (gap >= thresh && (!costly || gap > costly.timeShare - costly.countShare)) costly = r;
    if (-gap >= thresh && (!frequent || (r.countShare - r.timeShare) > frequent.countShare - frequent.timeShare)) frequent = r;
  }
  if (costly) out[costly.key] = 'costly';
  if (frequent) out[frequent.key] = 'frequent';
  return out;
}

export function buildCompare(rows: Observation[], dimension: DimensionKey, ranked: RankMeasure): CompareRow[] {
  const timeP = computePareto(rows, dimension, 'time');
  const countP = computePareto(rows, dimension, 'count');
  const timeBy = new Map(timeP.slices.map(s => [s.key, s]));
  const countBy = new Map(countP.slices.map(s => [s.key, s]));
  // Rank by the chosen measure — but if it's all zero (e.g. instant/count-only
  // logs ranked by time), fall back to the other so the chart is never blank.
  let rankedP = ranked === 'time' ? timeP : countP;
  if (rankedP.grandTotal === 0) rankedP = rankedP === timeP ? countP : timeP;
  return rankedP.slices.map(s => {
    const t = timeBy.get(s.key);
    const c = countBy.get(s.key);
    return {
      key: s.key,
      timeMs: t?.value ?? 0,
      timeShare: t?.share ?? 0,
      count: c?.value ?? 0,
      countShare: c?.share ?? 0,
      cumShare: s.cumShare,
      isVitalFew: s.isVitalFew,
      observationIds: s.observationIds,
    };
  });
}
