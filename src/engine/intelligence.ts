/* The automation layer: it does what a good analyst does automatically —
 * suggests the next cut to drill, and spots when frequency and time disagree
 * (the free insight the owner cares about). Pure over the drilled rows. */
import type { Observation, DimensionKey, WorkstreamView } from '../types';
import { computePareto } from './pareto';
import { dimOf, DIM_LABEL } from './types';

export interface NextDimSuggestion {
  dimension: DimensionKey;
  reason: string;
  concentration: number; // top slice's share (0..1) — how "worth it" the cut is
}

/** Score each not-yet-used dimension by how concentrated its top slice is;
 *  recommend the most concentrated cut (the one that will reveal the most). */
export function suggestNextDimension(rows: Observation[], view: WorkstreamView): NextDimSuggestion | null {
  const used = new Set(view.path.map(s => s.dimension));
  const candidates = view.dimensionOrder.filter(d => !used.has(d));
  let best: NextDimSuggestion | null = null;
  for (const dim of candidates) {
    // a cut only helps if the rows actually spread across >1 value on it
    const distinct = new Set(rows.map(o => dimOf[dim](o)));
    if (distinct.size < 2) continue;
    const p = computePareto(rows, dim, view.measure);
    const top = p.slices[0];
    if (!top) continue;
    if (!best || top.share > best.concentration) {
      best = {
        dimension: dim,
        reason: `${top.key} is ${Math.round(top.share * 100)}% of it by ${DIM_LABEL[dim].toLowerCase()}`,
        concentration: top.share,
      };
    }
  }
  return best;
}

export interface RankShift {
  key: string;
  countRank: number;
  timeRank: number;
  delta: number; // timeRank - countRank (positive = costs less time than its frequency suggests)
}

export interface Disagreement {
  dimension: DimensionKey;
  topByCount: string;
  topByTime: string;
  agree: boolean;
  message: string; // '' when they agree
  rankShifts: RankShift[];
}

/** Pareto the same rows twice — by count and by time — and compare. When the
 *  #1 differs, that gap is itself the story: frequent ≠ costly. */
export function detectDisagreement(rows: Observation[], dim: DimensionKey): Disagreement {
  const byCount = computePareto(rows, dim, 'count');
  const byTime = computePareto(rows, dim, 'time');
  const topByCount = byCount.slices[0]?.key ?? '';
  const topByTime = byTime.slices[0]?.key ?? '';
  const timeRankOf = new Map(byTime.slices.map(s => [s.key, s.rank]));
  const rankShifts: RankShift[] = byCount.slices.map(s => {
    const timeRank = timeRankOf.get(s.key) ?? s.rank;
    return { key: s.key, countRank: s.rank, timeRank, delta: timeRank - s.rank };
  });
  const agree = !topByCount || !topByTime || topByCount === topByTime;
  const message = agree
    ? ''
    : `“${topByCount}” happens most often — but “${topByTime}” costs the most time. Chase the time.`;
  return { dimension: dim, topByCount, topByTime, agree, message, rankShifts };
}
