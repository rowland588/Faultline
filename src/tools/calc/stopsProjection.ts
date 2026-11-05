/* CARRYING A SAMPLE OF STOPS FORWARD, AND SAYING HOW SURE THAT IS — FC-241 part 2 (knowledge/specs/FC-241-workstation-stops.md Part 2).
 *
 * Stops are taken as arriving at random at a steady average rate, so the number seen while watching is a Poisson count and the exact (Garwood) two-sided
 * interval says how far the true count in that time could be from the one seen. The sample's loss is carried to a horizon in proportion to time; the range
 * is that interval scaled the same way. It is the uncertainty in HOW MANY stops there will be — the spread of stop lengths and of the rate lost is not in it.
 * The same bounds, one-sided, are lib/ie/dist poissonLower and poissonUpper. Independent cases: scripts/knowledge/cases-stops-extrapolation.py. */
import { betaInc, normalQuantile, poissonLower, poissonUpper } from '../../lib/ie/dist';

/** The exact two-sided interval for a Poisson count `n` at confidence `conf` (0.9, 0.95, 0.99): each tail takes (1 − conf) / 2. */
export function garwood(n: number, conf: number): { lo: number; hi: number } {
  const side = (1 + conf) / 2;
  return { lo: n <= 0 ? 0 : poissonLower(n, 1, side), hi: poissonUpper(n, 1, side) };
}

/** Stops needed for the count's range to come within ± `precision` of itself — the first count whose exact (Garwood) interval is that narrow, so the advice
 *  agrees with the word the page gives (Firm is ±25% by the same interval). The normal approximation ⌈(z / p)²⌉ is a few stops short (62 for 66 at ±25%, 95%). */
const needed = new Map<string, number>();
export function stopsForPrecision(precision: number, conf: number): number {
  const key = `${precision}|${conf}`;
  const hit = needed.get(key);
  if (hit !== undefined) return hit;
  let n = Math.max(1, Math.floor((normalQuantile((1 + conf) / 2) / precision) ** 2 * 0.8));
  for (; n < 20000; n++) { const g = garwood(n, conf); if ((g.hi - g.lo) / 2 / n <= precision) break; }
  needed.set(key, n);
  return n;
}

/** The words for how firm a range is, by its half-width relative to the count: within ±25% Firm, ±50% Fair, wider Rough. */
export const firmness = (relHalf: number): 'Firm' | 'Fair' | 'Rough' => (relHalf <= 0.25 ? 'Firm' : relHalf <= 0.5 ? 'Fair' : 'Rough');

/** WHAT ONE STRETCH OF THE HORIZON COULD ACTUALLY SEE (4–5 November, part 3): not the rate's range but the stops themselves, which are random even when the rate is known.
 *  The posterior predictive of a Poisson count given `n` stops in `watched` minutes under the Jeffreys prior is a negative binomial, r = n + ½, p = watched ÷ (watched + horizon);
 *  equal tails at `conf`. A longer watch narrows it; a longer horizon widens it. */
export function predictStops(n: number, watchedMin: number, horizonMin: number, conf: number): { lo: number; hi: number } {
  const r = n + 0.5, p = watchedMin / (watchedMin + horizonMin), a = (1 - conf) / 2;
  const q = (target: number): number => { for (let m = 0; m < 200000; m++) if (betaInc(r, m + 1, p) >= target) return m; return 200000; };
  return { lo: q(a), hi: q(1 - a) };
}

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
  /** The rate seen, stops an hour, with the same interval over the time watched. */
  rate: { perHour: number; lo: number; hi: number };
  /** The stops one stretch of the horizon could see, and — with at least one stop — what they would cost at the sample's loss a stop. */
  predict: { lo: number; hi: number; loss?: { lo: number; hi: number } };
  /** With no stop seen: the most the rate could be, an hour and over the horizon, and the hours of watching with none that would rule out one an hour. */
  none?: { perHour: number; overHorizon: number; ruleOutHours: number };
  /** Bursty stops: the widening applied to the count's interval (√φ), when the page could test it and found them so. */
  widened?: number;
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
  /** The index of dispersion D / (k − 1) when the stops were found bursty (stopsCluster): the count's interval is widened about the count by √φ. */
  phi?: number;
}

export function project(i: ProjectionIn): Projection {
  const factor = i.horizonMin / i.watchedMin;
  const g = garwood(i.stops, i.conf);
  const wide = i.phi != null && i.phi > 1 ? Math.sqrt(i.phi) : undefined;
  const count = wide && i.stops > 0 ? { lo: Math.max(0, i.stops - (i.stops - g.lo) * wide), hi: i.stops + (g.hi - i.stops) * wide } : g;
  const hrs = i.watchedMin / 60;
  const pr = predictStops(i.stops, i.watchedMin, i.horizonMin, i.conf);
  const out: Projection = { factor, stops: i.stops * factor, minutes: i.minutes * factor, lost: i.lost * factor, count,
    rate: { perHour: i.stops / hrs, lo: count.lo / hrs, hi: count.hi / hrs },
    predict: { lo: pr.lo, hi: pr.hi, ...(i.stops > 0 ? { loss: { lo: pr.lo * i.lost / i.stops, hi: pr.hi * i.lost / i.stops } } : {}) },
    ...(wide && i.stops > 0 ? { widened: wide } : {}) };
  if (i.stops <= 0) out.none = { perHour: g.hi / hrs, overHorizon: g.hi * i.horizonMin / i.watchedMin, ruleOutHours: g.hi };
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
