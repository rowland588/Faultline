/* MOVE INTO A WORKSPACE — local: this chat and its files, this customer's workspace only (27 November). */
import { checkObject, ID } from './check';
import { anyone } from './access';
import type { CapResult, Capability } from './types';
import { applyMoveIntoWorkspace } from '../colleague/moveIntoWorkspace';

export const moveIntoWorkspace: Capability = {
  name: 'move_into_workspace', title: 'Move into a workspace', kind: 'local',
  validate: raw => checkObject(raw, {
    name: { kind: 'string', label: 'the workspace’s name', max: 80 },
    folderId: ID('the workspace'),
    sourceId: ID('the file'),
    conversationId: ID('the conversation'),
    out: { kind: 'bool', label: 'move out of the workspace' },
  }),
  allowed: anyone,
  async run(ctx, input: { name?: string; folderId?: string; sourceId?: string; conversationId?: string; out?: boolean }): Promise<CapResult> {
    const r = await applyMoveIntoWorkspace({
      now: ctx.now,
      ...(ctx.userId ? { ownerId: ctx.userId } : {}),
      conversationId: input.conversationId || ctx.conversationId,
      ...(input.sourceId ? { sourceId: input.sourceId } : {}),
      ...(input.folderId ? { folderId: input.folderId } : {}),
      ...(input.name ? { name: input.name } : {}),
      ...(input.out ? { out: true } : {}),
    });
    if (!r.ok) return r;
    return { ok: true, says: r.says, data: { ...(r.folderId ? { folderId: r.folderId } : {}), ...(r.created ? { created: true } : {}) }, refs: [] };
  },
};
