/* WORKING WITHIN AN AGREED INVESTIGATION (10 November, docs/LUNA-WORKSPACE.md W3 — Rowland: "Once I've authorised an investigation, Luna
 * should be able to capture and populate information within that agreed scope without asking me to approve every individual field.
 * Significant or consequential changes must still have appropriate safeguards").
 *
 *   work_within  write  a card: "Work within <project>" — on the person's yes the project is agreed for this conversation (its id kept in
 *                       the conversation's `authorised`, the same list a record said yes to is kept in, docs/AI-OPERATING.md confirm once)
 *
 * From then the CAPTURE steps below go in without a card when what they write is IN that project — a study of it (studyId → its
 * projectId), a new study made in it (projectId), its method's answers, its fishbone's causes, its line standard's people. Each is still
 * checked by its capability (validate → the person's access → run), still audited, still shown as a receipt in the conversation.
 * Everything else asks every time, agreed or not — raising, closing or reassigning a problem, a product's hold decided, linking,
 * replacing, starting a project, the factory's structure, the notebook, a file's name — and nothing deletes. The person can stop it
 * any time (the panel's Stop): the project leaves `authorised`. */
import { getStudy, getStandard } from '../db';
import { getProject } from '../db/projects';
import { mayEdit } from './access';
import { checkObject, ID } from './check';
import type { CapResult, Capability } from './types';

/** The steps that capture and populate — allowed without a card inside an agreed project. Never a delete, never a decision. */
export const CAPTURE_IN_SCOPE: ReadonlySet<string> = new Set([
  'start_study', 'add_readings', 'time_elements', 'count_shift', 'record_check', 'set_capacity', 'place_people',
  'add_cause', 'add_journey_step', 'answer_method', 'start_measurement', 'fill_register', 'write_document', 'draw_diagram',
]);

/** The project a capture step writes into, read from its own input and the record it names — never guessed. */
export async function projectOfCall(input: Record<string, unknown> | undefined): Promise<string | undefined> {
  if (!input) return undefined;
  if (typeof input.projectId === 'string' && input.projectId) return input.projectId;
  if (typeof input.studyId === 'string' && input.studyId) return (await getStudy(input.studyId))?.projectId ?? undefined;
  if (typeof input.standardId === 'string' && input.standardId) return (await getStandard(input.standardId))?.projectId ?? undefined;
  return undefined;
}

/** May this capture step go in without a card? Only when it is a capture step and writes into a project the person agreed. */
export async function inAgreedScope(name: string, input: Record<string, unknown> | undefined, authorised: readonly string[]): Promise<boolean> {
  if (!CAPTURE_IN_SCOPE.has(name) || !authorised.length) return false;
  const p = await projectOfCall(input);
  return !!p && authorised.includes(p);
}

interface WithinIn { projectId: string }
export const workWithin: Capability = {
  name: 'work_within', title: 'Work within this investigation', kind: 'write',
  validate: raw => checkObject(raw, { projectId: ID('the project', true) }),
  allowed: (ctx, input: WithinIn) => mayEdit(ctx, input.projectId),
  target: (i: WithinIn) => i.projectId,
  async preview(_ctx, input: WithinIn) {
    const p = await getProject(input.projectId);
    return `Work within “${p?.name ?? 'the project'}”: start its studies and fill them — readings, timings, stops, checks, its method’s answers, causes on its fishbone — without asking each time. Raising or closing problems, product holds, linking, replacing and starting anything new outside it still ask; nothing is deleted. Stop any time from the conversation’s panel.`;
  },
  async run(_ctx, input: WithinIn): Promise<CapResult> {
    const p = await getProject(input.projectId);
    if (!p) return { ok: false, why: 'There is no such project.' };
    return { ok: true, says: `Agreed: working within “${p.name}” — its studies are captured and filled as we go, each said as a receipt; anything consequential still asks.`, refs: [{ kind: 'project', id: p.id, label: p.name, href: `/project/${p.id}` }], data: { projectId: p.id } };
  },
};

export const SCOPE: readonly Capability[] = [workWithin];
