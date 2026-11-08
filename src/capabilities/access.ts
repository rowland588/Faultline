/* WHO MAY DO WHAT, FOR A CAPABILITY — the screens' own rule (lib/access accessOf and can, cloud/access useAccess), read without a
 * hook. A project's level comes from its owner and the person's row on its people list as the device last heard it (the same
 * localStorage answer cloud/access keeps); the screen's own level wins when it passes one (CapCtx.level). A line's own record with
 * no project is the device's own, as the Problems page allows (snag/QuickSnag useCanTakeProblem). Reads are anyone's. */
import { getProject } from '../db';
import { accessOf, can, type Access } from '../lib/access';
import type { Allowed, CapCtx } from './types';

const read = (k: string): string | null => { try { return localStorage.getItem(`faultline.access.${k}`); } catch { return null; } };

/** This person's level on a project — or, with no project, on the line's own records. */
export async function levelOn(ctx: CapCtx, projectId?: string): Promise<Access> {
  if (ctx.level) return ctx.level;
  if (!projectId) return 'owner';
  const p = await getProject(projectId);
  const email = (ctx.email ?? '').toLowerCase();
  const known = email ? read(`${projectId}.${email}`) : null;
  return accessOf({ signedIn: !!email, ...(ctx.userId ? { myId: ctx.userId } : {}), myEmail: email, isSuper: !!ctx.isSuper, ...(p?.ownerId ? { ownerId: p.ownerId } : {}), mine: known ? { access: known } : null });
}

export const anyone = async (): Promise<Allowed> => ({ ok: true });

/** May change the work here (can.edit) — a client reads and takes the reports, and changes nothing. */
export async function mayEdit(ctx: CapCtx, projectId?: string): Promise<Allowed> {
  const level = await levelOn(ctx, projectId);
  return can(level).edit ? { ok: true } : { ok: false, why: projectId ? 'You can read this project and take its reports, but not change it — its owner runs it.' : 'You can read here but not change anything.' };
}

/** May start projects of their own (cloud/access useCanStartProjects): no only for somebody let in by a project invite. */
export async function mayStartProjects(ctx: CapCtx): Promise<Allowed> {
  if (ctx.level === 'client') return { ok: false, why: 'You can read here but not start a project.' };
  const email = (ctx.email ?? '').toLowerCase();
  return read(`start.${email}`) === 'no' ? { ok: false, why: 'You were let in to a project, not to the app — only the projects you were invited to are yours to work on.' } : { ok: true };
}
