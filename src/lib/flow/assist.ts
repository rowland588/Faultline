/* THE ASSISTANT, FROM THE DEVICE — a method proposed from a person's own
 * words, through the one gateway (supabase/functions/assist; slice 4).
 *
 * The key never reaches the device: the gateway holds it, checks the
 * session, keeps each person's daily allowance and holds the answer to the
 * proposal's schema. What comes back is read again here — rebuilt by
 * lib/flow/proposal and checked by the validator — because a definition
 * from the network is input, never trusted. No signal, no cloud, no key or
 * any failure: said in words, and the form is still there (AI off). */
import { supabase } from '../../cloud/client';
import { fromProposal, toProposal, type Proposed } from './proposal';
import { validateDefinition, type Issue } from './validate';
import { checkAnswer, type Fact, type Said } from './askCore';
import { readClarify, type ClarifyQuestion } from './clarifyCore';
import { changesOf, keepKeys, type Change } from './change';
import type { FlowDefinition } from './definition';

export type Proposal =
  | ({ ok: true; errors: Issue[]; warnings: Issue[]; left?: { calls: number } } & Proposed)
  | { ok: false; off?: boolean; why: string };

const OFF = 'The assistant is not switched on — write the method by hand with New method; everything else works the same.';

/** Read the gateway's answer: a proposal rebuilt and checked here, or why not. */
export function readGateway(data: unknown): Proposal {
  const d = (data && typeof data === 'object' ? data : {}) as { ok?: boolean; off?: boolean; why?: unknown; proposal?: unknown; left?: { calls?: unknown } };
  if (d.off) return { ok: false, off: true, why: typeof d.why === 'string' && d.why ? d.why : OFF };
  if (!d.ok || !d.proposal) return { ok: false, why: typeof d.why === 'string' && d.why ? d.why : 'The assistant could not propose a method just now. Try again, or write it by hand.' };
  const proposed = fromProposal(d.proposal);
  const checked = validateDefinition(proposed.def);
  return {
    ok: true, ...proposed, def: checked.def ?? proposed.def, errors: checked.errors, warnings: checked.warnings,
    ...(typeof d.left?.calls === 'number' ? { left: { calls: d.left.calls } } : {}),
  };
}

/** Propose a method from the person's own words. */
export async function proposeMethod(description: string): Promise<Proposal> {
  const words = description.trim();
  if (words.length < 20) return { ok: false, why: 'Say a little more about the work — what is being done, on what, and what "done" means.' };
  if (!supabase) return { ok: false, off: true, why: OFF };
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { ok: false, off: true, why: 'No signal — the assistant needs the cloud. Write the method by hand meanwhile.' };
  try {
    const { data, error } = await supabase.functions.invoke('assist', { body: { task: 'design', description: words.slice(0, 4000) } });
    if (error) return { ok: false, off: true, why: 'The assistant could not be reached just now — write the method by hand, or try again in a moment.' };
    return readGateway(data);
  } catch {
    return { ok: false, off: true, why: 'The assistant could not be reached just now — write the method by hand, or try again in a moment.' };
  }
}

const UNREACHED = 'The assistant could not be reached just now — try again in a moment.';

export type Clarified = { ok: true; understood: string; questions: ClarifyQuestion[] } | { ok: false; off?: boolean; why: string };

/** Read the gateway's questions before a design (lib/flow/clarifyCore) — read
 *  again here, as everything from the network is. */
export function readClarified(data: unknown): Clarified {
  const d = (data && typeof data === 'object' ? data : {}) as { ok?: boolean; off?: boolean; why?: unknown; clarify?: unknown };
  if (d.off) return { ok: false, off: true, why: typeof d.why === 'string' && d.why ? d.why : OFF };
  if (!d.ok) return { ok: false, why: typeof d.why === 'string' && d.why ? d.why : 'The assistant could not read the need just now.' };
  const c = readClarify(d.clarify);
  return c ? { ok: true, understood: c.understood, questions: c.questions } : { ok: false, why: 'The assistant’s questions could not be read.' };
}

/** Before a method is designed: what the assistant needs to know, asked as
 *  at most four questions with answers to tap — or none, when the words say
 *  enough. Off, unreachable or unreadable, the design goes ahead without
 *  them: the questions help, they never stand in the way. */
export async function clarifyNeed(description: string): Promise<Clarified> {
  const words = description.trim();
  if (words.length < 20) return { ok: false, why: 'Say a little more about the work.' };
  const got = await call({ task: 'clarify', description: words.slice(0, 4000) });
  if (got.off) return { ok: false, off: true, why: got.off };
  return readClarified(got.data);
}

async function call(body: Record<string, unknown>): Promise<{ data?: unknown; off?: string }> {
  if (!supabase) return { off: OFF };
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { off: 'No signal — the assistant needs the cloud.' };
  try {
    const { data, error } = await supabase.functions.invoke('assist', { body });
    return error ? { off: UNREACHED } : { data };
  } catch { return { off: UNREACHED }; }
}

export type Changed =
  | { ok: true; def: FlowDefinition; changes: Change[]; errors: Issue[]; warnings: Issue[]; assumptions: string[]; questions: string[] }
  | { ok: false; off?: boolean; why: string };

/** The change the assistant proposes, read against the method as it stands:
 *  its keys kept for the same things (lib/flow/change keepKeys), every change
 *  said in a line, and checked. */
export function readChange(prev: FlowDefinition, data: unknown): Changed {
  const r = readGateway(data);
  if (!r.ok) return r;
  const kept = keepKeys(prev, r.def);
  const checked = validateDefinition(kept);
  return { ok: true, def: checked.def ?? kept, changes: changesOf(prev, checked.def ?? kept), errors: checked.errors, warnings: checked.warnings, assumptions: r.assumptions, questions: r.questions };
}

/** Ask the assistant to change a method as it stands. */
export async function proposeChange(prev: FlowDefinition, request: string): Promise<Changed> {
  if (request.trim().length < 5) return { ok: false, why: 'Say what should change.' };
  const got = await call({ task: 'change', current: toProposal(prev), request: request.trim().slice(0, 2000) });
  if (got.off) return { ok: false, off: true, why: got.off };
  return readChange(prev, got.data);
}

export type Answered = { ok: true; said: Said[] } | { ok: false; off?: boolean; why: string };

/** Ask a question about a project, from its facts only; the answer checked
 *  against them before it is shown (lib/flow/askCore checkAnswer). */
export async function askAssistant(question: string, facts: readonly Fact[]): Promise<Answered> {
  const got = await call({ task: 'ask', question: question.trim().slice(0, 400), facts });
  if (got.off) return { ok: false, off: true, why: got.off };
  const d = (got.data && typeof got.data === 'object' ? got.data : {}) as { ok?: boolean; off?: boolean; why?: unknown; answer?: unknown };
  if (d.off) return { ok: false, off: true, why: typeof d.why === 'string' ? d.why : OFF };
  if (!d.ok) return { ok: false, why: typeof d.why === 'string' ? d.why : 'The assistant could not answer just now.' };
  const said = checkAnswer(d.answer, facts);
  return said.length ? { ok: true, said } : { ok: false, why: 'The answer could not be checked against the project’s facts, so it is not shown.' };
}
