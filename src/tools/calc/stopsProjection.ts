/* CARRYING A SAMPLE OF STOPS FORWARD, AND SAYING HOW SURE THAT IS — FC-241 part 2 (knowledge/specs/FC-241-workstation-stops.md Part 2).
 *
 * Stops are taken as arriving at random at a steady average rate, so the number seen while watching is a Poisson count and the exact (Garwood) two-sided
 * interval says how far the true count in that time could be from the one seen. The sample's loss is carried to a horizon in proportion to time; the range
 * is that interval scaled the same way. It is the uncertainty in HOW MANY stops there will be — the spread of stop lengths and of the rate lost is not in it.
 * The same bounds, one-sided, are lib/ie/dist poissonLower and poissonUpper. Independent cases: scripts/knowledge/cases-stops-extrapolation.py. */
import { normalQuantile, poissonLower, poissonUpper } from '../../lib/ie/dist';

/** The exact two-sided interval for a Poisson count `n` at confidence `conf` (0.9, 0.95, 0.99): each tail takes (1 − conf) / 2. */
export function garwood(n: number, conf: number): { lo: number; hi: number } {
  const side = (1 + conf) / 2;
  return { lo: n <= 0 ? 0 : poissonLower(n, 1, side), hi: poissonUpper(n, 1, side) };
}

/** Stops needed for the count's range to come within ± `precision` of itself: ⌈(z / p)²⌉. */
export const stopsForPrecision = (precision: number, conf: number): number => Math.ceil((normalQuantile((1 + conf) / 2) / precision) ** 2);

/** The words for how firm a range is, by its half-width relative to the count: within ±25% Firm, ±50% Fair, wider Rough. */
export const firmness = (relHalf: number): 'Firm' | 'Fair' | 'Rough' => (relHalf <= 0.25 ? 'Firm' : relHalf <= 0.5 ? 'Fair' : 'Rough');

export interface Projection {
  /** The horizon ÷ the time watched. */
  factor: number;
  stops: number;
  minutes: number;
  lost: number;
  /** The range on the loss, when it can be given. */
  range?: { lo: number; hi: number };
  /** The Garwood interval on the count seen, and its half-width relative to the count. */
  count: { lo: number; hi: number };
  relHalf?: number;
  firm?: 'Firm' | 'Fair' | 'Rough';
  /** Stops needed for ±25%, and the minutes of watching in all, and the minutes still to watch. */
  need?: { stops: number; watchTotal: number; watchMore: number };
  /** Why the range is not given. */
  noRange?: string;
}

export interface ProjectionIn {
  watchedMin: number;
  horizonMin: number;
  stops: number;
  minutes: number;
  lost: number;
  conf: number;
  /** A workstation has minutes stopped but no stops counted: the range needs the count. */
  stopsMissing?: boolean;
}

export function project(i: ProjectionIn): Projection {
  const factor = i.horizonMin / i.watchedMin;
  const count = garwood(i.stops, i.conf);
  const out: Projection = { factor, stops: i.stops * factor, minutes: i.minutes * factor, lost: i.lost * factor, count };
  if (i.stopsMissing) { out.noRange = 'some workstations have minutes stopped but no stops counted, and the range is worked from the number of stops'; return out; }
  if (i.stops <= 0) { out.noRange = 'no stop has been seen yet'; return out; }
  const rel = (count.hi - count.lo) / 2 / i.stops;
  out.range = { lo: out.lost * count.lo / i.stops, hi: out.lost * count.hi / i.stops };
  out.relHalf = rel;
  out.firm = firmness(rel);
  const n = stopsForPrecision(0.25, i.conf);
  const watchTotal = n / (i.stops / i.watchedMin);
  out.need = { stops: n, watchTotal, watchMore: Math.max(0, watchTotal - i.watchedMin) };
  return out;
}
