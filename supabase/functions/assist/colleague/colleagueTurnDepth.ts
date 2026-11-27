// COPIED FROM src/tools/colleague by scripts/sync-assist.mjs — edit the source, then run it.
import type { ColleagueAsk } from './colleagueAssist.ts';

/** Effort by turn kind without changing output_config (cache-safe) — a line in the turn, not a request parameter. */
export const DEPTH_CONTINUATION = 'DEPTH FOR THIS TURN — you are mid-answer with tool results already in hand: finish the reasoning, use the app for every figure, then give the person the answer. Do not restart or repeat a step that already ran.';
export const DEPTH_JOB = 'DEPTH FOR THIS TURN — a job is in hand: work the plan through to the end. Finish or account for every step (job_step) before you close; the person is not here to steer each leg.';
export const DEPTH_SECOND_LOOK = 'DEPTH FOR THIS TURN — the app sent your answer back: fix untraced figures from the app\'s working or finish open job steps, then give the whole answer again — warm colleague voice, no mention of the check.';

export function lunaTurnDepthNote(ask: ColleagueAsk): string | undefined {
  if (ask.pending) return DEPTH_CONTINUATION;
  const lastPerson = [...ask.turns].reverse().find(t => t.role === 'person');
  if (lastPerson?.text.includes("From the app's own check")) return DEPTH_SECOND_LOOK;
  if (ask.focus.includes('JOB IN HAND')) return DEPTH_JOB;
  return undefined;
}