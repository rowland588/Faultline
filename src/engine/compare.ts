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

export function buildCompare(rows: Observation[], dimension: DimensionKey, ranked: RankMeasure): CompareRow[] {
  const timeP = computePareto(rows, dimension, 'time');
  const countP = computePareto(rows, dimension, 'count');
  const timeBy = new Map(timeP.slices.map(s => [s.key, s]));
  const countBy = new Map(countP.slices.map(s => [s.key, s]));
  const rankedP = ranked === 'time' ? timeP : countP;
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
