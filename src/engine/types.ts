/* Engine shared bits — the two accessor tables that make a measure and a
 * dimension pluggable. Everything downstream is measure- and dimension-generic,
 * which is why the same data becomes many tools with no reshaping. */
import type { Observation, Measure, DimensionKey } from '../types';

export type { Measure, DimensionKey, DrillStep, DrillPath, WorkstreamView } from '../types';

/** How much a single observation contributes, per measure. ('cost' is a P1 seam.) */
export const measureOf: Record<Measure, (o: Observation) => number> = {
  count: o => o.count,
  time: o => o.durationMs,
};

/** Which bucket an observation falls in, per dimension. Empty → an honest label. */
export const dimOf: Record<DimensionKey, (o: Observation) => string> = {
  asset: o => o.asset || '(unassigned)',
  category: o => o.category || '(uncategorised)',
  reason: o => o.reason ?? '(no reason given)',
  shift: o => o.shift ?? '(no shift)',
};

export const DIM_LABEL: Record<DimensionKey, string> = {
  asset: 'Asset',
  category: 'Category',
  reason: 'Reason',
  shift: 'Shift',
};

export const MEASURE_LABEL: Record<Measure, string> = {
  count: 'how often',
  time: 'time lost',
};
