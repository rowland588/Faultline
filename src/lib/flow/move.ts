/* MOVING A RUNNING PROJECT ONTO A NEW VERSION OF ITS METHOD — the owner's,
 * after reading what it does (lib/flow/change moveEffect; slice 5).
 *
 * The project's link (Project.flow) points at the new version; every record
 * it holds stays as it is, read by its keys — steps done stay done, a
 * record on a step the new version does not have stays in the history and
 * is no longer counted, a passed gate stands. One line in the activity log
 * says what moved and what it did; Undo puts the old link back. */
import type { ID } from '../../types';
import { now, uid } from '../ids';
import { addActivity, getMethod, getProject, updateProject } from '../../db';
import { moveEffect, type MoveEffect } from './change';
import { loadFlowProject, type OpContext, type OpResult } from './operations';

/** What moving would do — read first, by anybody who can read the project. */
export async function previewMove(projectId: ID, toMethodId: ID): Promise<{ effect: MoveEffect; from: number; to: number } | undefined> {
  const fp = await loadFlowProject(projectId);
  const to = await getMethod(toMethodId);
  if (!fp || !to || to.familyId !== fp.method.familyId) return undefined;
  return { effect: moveEffect(fp.method.definition, to.definition, fp.records), from: fp.method.version, to: to.version };
}

/** Move the project onto an approved version of the same method. */
export async function moveProject(ctx: OpContext, projectId: ID, toMethodId: ID): Promise<OpResult<MoveEffect>> {
  if (!ctx.can.agree) return { ok: false, why: 'Moving a project to another version of its method is the project owner’s.' };
  const p = await getProject(projectId);
  if (!p?.flow) return { ok: false, why: 'That project is not running a method.' };
  const to = await getMethod(toMethodId);
  if (!to) return { ok: false, why: 'That version is not on this device.' };
  if (to.familyId !== p.flow.familyId) return { ok: false, why: 'A project moves only between versions of its own method.' };
  if (to.status !== 'active') return { ok: false, why: 'Only the approved version can be moved onto.' };
  if (to.id === p.flow.methodId) return { ok: false, why: `It already runs version ${to.version}.` };
  const preview = await previewMove(projectId, toMethodId);
  if (!preview) return { ok: false, why: 'That project could not be read on this device.' };
  const before = p.flow;
  await updateProject({ ...p, flow: { ...before, methodId: to.id, version: to.version, name: to.definition.name } });
  const t = now();
  await addActivity({
    id: uid(), projectId, methodId: to.id, who: ctx.who, at: t, source: ctx.source ?? 'person', createdAt: t, updatedAt: t,
    op: 'moveProject', target: { kind: 'project', id: projectId },
    summary: `Moved from version ${before.version} to version ${to.version} — ${preview.effect.says}`,
    detail: { history: preview.effect.history, newSteps: preview.effect.newSteps, gatesChanged: preview.effect.gatesChanged },
  });
  return {
    ok: true, value: preview.effect, said: `Now on version ${to.version}. ${preview.effect.says}`,
    undo: async () => {
      const cur = await getProject(projectId);
      if (cur) await updateProject({ ...cur, flow: before });
    },
  };
}
