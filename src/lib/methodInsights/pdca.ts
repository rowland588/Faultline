/* PDCA'S OWN READING OF ITS PROJECT (docs/METHODS.md §17). What only a PDCA knows: whether the cycle in hand was written with a
 * prediction, whether its result was set against it, and what a miss asks for next — a new cycle, from what was learned. Read from
 * lib/methodPdca (readCycles), the same cycles the board and the report show. Nothing here is estimated: a cycle "missed" only if
 * the team began "Against what we predicted" with No or Partly. Pure. */
import { readCycles, type CycleReading } from '../methodPdca';
import type { DashAttention } from '../methodDashboard';
import type { InsightIn, MethodInsight } from '../methodInsight';

const q = (s: string, max = 70) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
const shown = (r: CycleReading) => (r.predicted && r.after ? ` (expected ${q(r.predicted)}; got ${q(r.after)})` : '');

export function pdcaInsight(x: InsightIn): MethodInsight {
  const cycles = readCycles(x.answers);
  const last = cycles[cycles.length - 1];
  const attention: DashAttention[] = [];
  let next: string | undefined;
  const say = (tone: DashAttention['tone'], text: string) => attention.push({ kind: 'finding', tone, text });

  if (last && last.started) {
    const n = last.n;
    if (!last.predicted) say('a', `Cycle ${n} is under way with no written prediction — a prediction written after the result is not a prediction. Write the effect you expect in Plan.`);
    if (last.checked && !last.hit) say('a', `Cycle ${n} has a result but does not say if it hit the prediction — begin “Against what we predicted” with Yes, Partly or No.`);
    if (last.hit === 'yes' && !last.beyond) say('n', `Cycle ${n} says it hit its prediction but not why that is more than the ordinary ups and downs of the number.`);
    if ((last.hit === 'no' || last.hit === 'partly') && last.decision !== 'abandon') {
      say('a', `Cycle ${n} ${last.hit === 'no' ? 'missed' : 'only partly hit'} its prediction${shown(last)} — plan the next cycle from what was learned.`);
      const needsChange = last.decision === 'adapt' && !last.again;
      if (!needsChange) next = last.again
        ? `Cycle ${n} ${last.hit === 'no' ? 'missed' : 'only partly hit'} its prediction: start cycle ${n + 1} — Act already says what to try (“${q(last.again, 60)}”).`
        : `Cycle ${n} ${last.hit === 'no' ? 'missed' : 'only partly hit'} its prediction: in Act write the next change, then start cycle ${n + 1}.`;
    }
    if (last.decision === 'abandon') say('n', `Cycle ${n} was abandoned${last.decisionText ? ` — ${q(last.decisionText, 90)}` : ''}. Say what you will try instead, or close the project.`);
    if (last.decision === 'adapt' && !last.again) {
      if (last.hit !== 'no' && last.hit !== 'partly') say('a', `Cycle ${n} is to be adapted but Act does not say what the next cycle changes.`);
      next ??= `Cycle ${n} is to be adapted: in Act write the change for the next cycle, then start cycle ${n + 1}.`;
    }
    if (last.decision === 'adopt' && !last.standard) {
      say('a', `Cycle ${n} is adopted but not yet written into a standard — until it is, the gain is not held.`);
      next ??= `Cycle ${n} is adopted: in Act write where the new way is now written (the line standard or checklist).`;
    }
    if (last.hit === 'yes' && !last.decision) next ??= `Cycle ${n} hit its prediction: in Act decide — adopt, adapt or abandon.`;
  }

  const checked = cycles.filter(c => c.checked && c.hit);
  if (checked.length >= 3 && !checked.some(c => c.hit === 'yes')) say('a', `${checked.length} cycles have run and none hit its prediction — go back to Plan’s cause before trying another change.`);

  attention.sort((a, b) => ({ r: 0, a: 1, n: 2 }[a.tone] - { r: 0, a: 1, n: 2 }[b.tone]));
  return { ...(attention.length ? { attention } : {}), ...(next ? { next } : {}) };
}
