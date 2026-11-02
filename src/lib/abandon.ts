/* ABANDONING A TEST (Rowland, 2 November: "allow me to choose abandon test and then reason") — a live test given up before it was
 * finished keeps what it had, says why, and never reads as passed or failed: it is Abandoned, with its reason, on the page, the
 * paper, the program's criterion ("Not yet") and the commentary. One module so the four say the same words. No AI, no figure. */
import type { SampleSays } from '../tools/capability/sample';
import type { StudyAbandoned, ToolStudy } from './study';

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

/* ---- ENDING THE TEST (Rowland, 2 November: "I need a total fail on the tests, not just good and failed … abandoned test, overrule verdict …
 *      they don't save and are confusing") — ONE control with three outcomes, each with its reason. A Failed or Passed call is the study's
 *      `overrule` (a program's criterion already honours it); Abandoned is facts.abandoned. Whichever it is, it shows in the headline verdict,
 *      the tiles, the paper and the criterion — never as one line lower on the page. ---- */
export type TestCall = 'failed' | 'passed' | 'abandoned';
export const CALL_WORD: Record<TestCall, string> = { failed: 'Fail the test', abandoned: 'Abandon the test', passed: 'Pass the test' };
const reasonText = (reason: string, why: string) => `${reason.toLowerCase()}${why.trim() ? `: ${why.trim()}` : ''}`;

/** What the person called the test, if anything: the call, the reason in words, who and when. */
export function callOf(s: Pick<ToolStudy, 'facts' | 'overrule'>): { call: TestCall; text: string; by?: string; at: number } | undefined {
  const a = s.facts.abandoned;
  if (a) return { call: 'abandoned', text: reasonText(a.reason, a.why ?? ''), at: a.at, ...(a.by ? { by: a.by } : {}) };
  const o = s.overrule;
  if (o) return { call: o.verdict === 'Passed' ? 'passed' : 'failed', text: o.why, at: o.at, ...(o.by ? { by: o.by } : {}) };
  return undefined;
}

/** The sentence the page, the tiles, the paper and the criterion read: the call first, the readings' own verdict kept beside it. */
export function callSays(s: Pick<ToolStudy, 'facts' | 'overrule'>, readings: SampleSays): SampleSays {
  const c = callOf(s);
  if (!c) return readings;
  const who = c.by ? ` by ${c.by}` : '';
  if (c.call === 'abandoned' && s.facts.abandoned) return { text: abandonedSays(s.facts.abandoned), tone: 'a', verdict: 'Abandoned' };
  const word = c.call === 'failed' ? 'Failed' : 'Passed';
  return { text: `${word} — called${who}: ${c.text}. The readings said: ${readings.verdict}.`, tone: c.call === 'failed' ? 'r' : 'n', verdict: word === 'Failed' ? 'Failed' : 'Passed' };
}

/** The remark written beside any call, so the notes tell the story in order. */
export const callRemark = (call: TestCall, reason: string, why: string, taken: number): string =>
  call === 'abandoned' ? `Test abandoned — ${reasonText(reason, why)} (${readings(taken)} taken).` : `Test called ${call === 'failed' ? 'failed' : 'passed'} — ${reasonText(reason, why)}.`;
