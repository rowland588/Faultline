/* The proof arithmetic — one module, so the Case page, the capture chip and
 * the meeting can never disagree about whether an improvement is proven.
 *
 * The method (why per-event, not per-week): weekly totals depend on how much
 * anyone WATCHED — walk the line less and the trend "improves" whether or not
 * the problem did. The mean duration of one event doesn't have that bias, as
 * long as before and after measure the same scope the same way. So the study
 * compares means per event with both sample sizes always shown, and projects
 * the £ using the BASELINE's frequency — stated, never hidden:
 *   saved/week = baselineMsWeek × (1 − meanAfter / meanBefore)             */
import type { Case, Observation } from '../types';

export interface StudyResult {
  beforeN: number;
  beforeMeanMs: number;
  afterN: number;
  afterMeanMs: number;
  targetN: number;
  /** afterN >= targetN — enough sample to call it */
  enough: boolean;
  /** negative = worse. null until there's at least one sample each side. */
  changePct: number | null;
  /** projected ms/week recovered (negative = costing more). null until callable. */
  savedMsWeek: number | null;
}

/** Derive the study's state from the case + its SCOPED observations (the
 *  caller applies the drill; deleted rows must already be excluded). */
export function studyResult(c: Case, scoped: Observation[]): StudyResult | null {
  if (!c.study) return null;
  const before = scoped.filter(o => o.startedAt < c.study!.startedAt);
  const after = scoped.filter(o => o.startedAt >= c.study!.startedAt);
  const mean = (rows: Observation[]) => (rows.length ? rows.reduce((a, o) => a + o.durationMs, 0) / rows.length : 0);
  const beforeMeanMs = mean(before);
  const afterMeanMs = mean(after);
  const callable = before.length > 0 && after.length > 0 && beforeMeanMs > 0;
  const changePct = callable ? Math.round(((afterMeanMs - beforeMeanMs) / beforeMeanMs) * 100) : null;
  const savedMsWeek = callable ? c.baselineMsWeek * (1 - afterMeanMs / beforeMeanMs) : null;
  return {
    beforeN: before.length,
    beforeMeanMs,
    afterN: after.length,
    afterMeanMs,
    targetN: c.study.targetN,
    enough: after.length >= c.study.targetN,
    changePct,
    savedMsWeek,
  };
}

/** Default sample size to promise: match the baseline's n, kept humane. */
export const defaultTargetN = (beforeN: number): number => Math.min(20, Math.max(5, beforeN));
