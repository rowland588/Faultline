/* ABANDONING A TEST (Rowland, 2 November: "allow me to choose abandon test and then reason") — a live test given up before it was
 * finished keeps what it had, says why, and never reads as passed or failed: it is Abandoned, with its reason, on the page, the
 * paper, the program's criterion ("Not yet") and the commentary. One module so the four say the same words. No AI, no figure. */
import type { StudyAbandoned } from './study';

/** The reasons the floor gives, in the words it uses; "Something else" asks for words. */
export const ABANDON_REASONS = ['Machine fault', 'Product not right', 'Line stopped', 'Ran out of time', 'Setting changed', 'Something else'] as const;
export type AbandonReason = (typeof ABANDON_REASONS)[number];

/** Whether a reason can be saved: a chosen one, and for "Something else" the person's own words. */
export const abandonReady = (reason: string, why: string): boolean =>
  ABANDON_REASONS.includes(reason as AbandonReason) && (reason !== 'Something else' || why.trim() !== '');

const readings = (n: number) => `${n} reading${n === 1 ? '' : 's'}`;

/** The sentence, as the page, the paper and the criterion say it. */
export function abandonedSays(a: StudyAbandoned): string {
  return `Abandoned — ${a.reason.toLowerCase()}${a.why?.trim() ? `: ${a.why.trim()}` : ''}. It had ${readings(a.taken)} when it stopped; nothing is judged from them.`;
}

/** The remark written beside it, so the commentary holds the story in order. */
export const abandonedRemark = (a: StudyAbandoned): string => `Test abandoned — ${a.reason.toLowerCase()}${a.why?.trim() ? `: ${a.why.trim()}` : ''} (${readings(a.taken)} taken).`;
export const takenUpRemark = 'Test taken up again.';
