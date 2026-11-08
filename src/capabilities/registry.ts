/* THE CAPABILITIES, LISTED — what AI Mode's colleague may ask the app to do, and the one way a call is run: checked, allowed by the
 * person's access, a write only once confirmed, and any failure said in a sentence (never thrown). schemas.ts carries the same
 * names and kinds for the gateway; the test holds the two together. */
import { find, lineState, listProblems, overdueActions, projectState, storyState, toolRecords } from './reads';
import { listCalculators, runCalculator, saveCalculation } from './calculators';
import { openPage, parkFocus, recordObservation, setFocus, startTimer } from './locals';
import { addPhotoToProblem, raiseProblem, startProject, updateProblem } from './writes';
import { adaptDraftCap, createSheet, draftState, fillDraftCap, makeRecord, startDraft, toolCatalogue } from './build';
import type { CapCall, CapCtx, CapResult, Capability } from './types';

export const CAPABILITIES: readonly Capability[] = [
  find, lineState, listProblems, overdueActions, projectState, storyState, listCalculators, runCalculator, toolRecords, toolCatalogue, draftState,
  setFocus, parkFocus, recordObservation, startTimer, openPage, startDraft, fillDraftCap, adaptDraftCap, createSheet,
  raiseProblem, updateProblem, startProject, saveCalculation, addPhotoToProblem, makeRecord,
];

export const capabilityByName = (name: string): Capability | undefined => CAPABILITIES.find(c => c.name === name);

/** Check, allow, confirm, run — the only door a call goes through. */
export async function runCall(ctx: CapCtx, call: CapCall, opts: { confirmed: boolean }): Promise<CapResult> {
  const cap = capabilityByName(call.name);
  if (!cap) return { ok: false, why: `Faultline has no capability called “${call.name}”.` };
  try {
    const v = cap.validate(call.input);
    if (!v.ok) return { ok: false, why: v.why };
    const a = await cap.allowed(ctx, v.input);
    if (!a.ok) return { ok: false, why: a.why };
    if (cap.kind === 'write' && !opts.confirmed) return { ok: false, why: `“${cap.title}” changes the records, so it waits for you to say yes.` };
    return await cap.run(ctx, v.input);
  } catch (e) {
    console.error('capability failed', call.name, e);
    return { ok: false, why: `“${cap.title}” could not be done just now — nothing was changed by it.` };
  }
}

/** What a write will do, said before it runs — or why it cannot run, with no card to say yes to. */
export async function previewCall(ctx: CapCtx, call: CapCall): Promise<{ ok: true; title: string; says: string } | { ok: false; why: string }> {
  const cap = capabilityByName(call.name);
  if (!cap) return { ok: false, why: `Faultline has no capability called “${call.name}”.` };
  try {
    const v = cap.validate(call.input);
    if (!v.ok) return { ok: false, why: v.why };
    const a = await cap.allowed(ctx, v.input);
    if (!a.ok) return { ok: false, why: a.why };
    return { ok: true, title: cap.title, says: cap.preview ? await cap.preview(ctx, v.input) : cap.title };
  } catch (e) {
    console.error('capability preview failed', call.name, e);
    return { ok: false, why: `“${cap.title}” could not be looked at just now.` };
  }
}
