/* DID IT WORK? — a closed action, judged against the line's own numbers.
 *
 * Rowland: the control room gives every change a measured before and after.
 * The app already knows how to prove a number moved (lib/measureProof: the
 * readings before a day and the readings after it, both counted, both means, a
 * significance test, a verdict that is allowed to say no). An action now
 * remembers the day it was closed (doneOn), so the two meet: split the line's
 * readings on the measure the project leads on at that day, and ask the same
 * question the Wins do. No second proof, no new record.
 *
 * It claims no more than the numbers do. It says "the line's number moved",
 * never "this action did it" — a line can be changed by six things at once, and
 * the verdict is the evidence, not the cause. The Case (lib/proof) is the
 * stricter instrument for one scoped loss, and an action raised for one links
 * to it. */
import type { PaceTodoRow } from '../db';
import type { Measure, Reading } from './measures';
import { seriesFor } from './measures';
import { numberProof, proofSentence, type NumberProof, type ProofVerdict } from './measureProof';

/** `soon` — closed, but fewer than two readings have come in since: too early
 *  to say. `none` — nothing to judge it by (no day it closed, no readings). */
export type ImpactState = ProofVerdict | 'soon' | 'none';

export interface Impact {
  state: ImpactState;
  proof?: NumberProof;
  /** One line a room can read out, or empty when there is nothing to say. */
  words: string;
  measure?: Measure;
}

const MIN_AFTER = 2;

export function impactOfAction(step: PaceTodoRow, measure: Measure | undefined, readings: Reading[]): Impact {
  if (step.state !== 'done' || !step.doneOn || !measure || !step.lineId) return { state: 'none', words: '' };
  const series = seriesFor(readings, step.lineId, measure.id);
  if (series.length === 0) return { state: 'none', words: '', measure };
  // Readings on the day it closed count as after: that is when the change landed.
  const at = series.findIndex(r => r.at >= (step.doneOn as string));
  const after = at < 0 ? 0 : series.length - at;
  if (after < MIN_AFTER) {
    return { state: 'soon', measure, words: `Too soon to say — ${after === 0 ? 'no readings' : '1 reading'} since it closed` };
  }
  const proof = numberProof(series.map(r => r.value), at, measure.direction);
  if (!proof) return { state: 'none', measure, words: 'Not enough readings from before it closed to compare' };
  return { state: proof.verdict, proof, measure, words: `${measure.name}: ${proofSentence(proof, measure.unit)}` };
}

/** What a badge says. */
export const IMPACT_WORD: Record<ImpactState, string> = {
  proven: 'Proven', better: 'Not yet proven', flat: 'No change', worse: 'Worse', soon: 'Too soon', none: '',
};
