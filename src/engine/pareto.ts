/* The Pareto — the headline lens. Ranks a dimension by a measure, with the
 * cumulative curve and the vital few (up to and including the slice that first
 * reaches the cutoff, default 80%). Pure: array in, plain object out. An empty
 * dataset returns a well-formed zero result, never NaN. */
import type { ID, Observation, Measure, DimensionKey } from '../types';
import { measureOf, dimOf } from './types';

export interface ParetoSlice {
  key: string;
  value: number;
  share: number; // value / grandTotal (0..1)
  cumShare: number; // running cumulative (0..1)
  rank: number; // 1-based
  isVitalFew: boolean;
  observationIds: ID[];
}

export interface Pareto {
  measure: Measure;
  dimension: DimensionKey;
  slices: ParetoSlice[];
  grandTotal: number;
  vitalFewCount: number;
  vitalFewCutoff: number;
}

export function computePareto(
  rows: Observation[],
  dimension: DimensionKey,
  measure: Measure,
  opts?: { cutoff?: number },
): Pareto {
  const cutoff = opts?.cutoff ?? 0.8;
  const val = measureOf[measure];
  const key = dimOf[dimension];

  const buckets = new Map<string, { value: number; ids: ID[] }>();
  for (const o of rows) {
    const k = key(o);
    const b = buckets.get(k) ?? { value: 0, ids: [] };
    b.value += val(o);
    b.ids.push(o.id);
    buckets.set(k, b);
  }

  const grandTotal = [...buckets.values()].reduce((a, b) => a + b.value, 0);
  if (grandTotal <= 0) {
    return { measure, dimension, slices: [], grandTotal: 0, vitalFewCount: 0, vitalFewCutoff: cutoff };
  }

  // value desc, then key asc as a stable tiebreak → snapshot-testable
  const sorted = [...buckets.entries()].sort(
    (a, b) => b[1].value - a[1].value || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0),
  );

  let cum = 0;
  let reachedCutoff = false;
  let vitalFewCount = 0;
  const slices: ParetoSlice[] = sorted.map(([k, b], i) => {
    const share = b.value / grandTotal;
    cum += share;
    let isVitalFew = false;
    if (!reachedCutoff) {
      isVitalFew = true;
      vitalFewCount++;
      if (cum >= cutoff) reachedCutoff = true; // this slice is the last vital-few one
    }
    return { key: k, value: b.value, share, cumShare: cum, rank: i + 1, isVitalFew, observationIds: b.ids };
  });

  return { measure, dimension, slices, grandTotal, vitalFewCount, vitalFewCutoff: cutoff };
}
