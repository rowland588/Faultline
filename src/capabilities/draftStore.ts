/* THE CONVERSATION'S DRAFTS, KEPT — facts.drafts on the AI Mode conversation (a `talk` study with facts.colleague), read and written
 * back from the stored row so nothing written meanwhile is lost. Shared by the tool drafts (./build) and the factory drafts
 * (./factoryBuild). */
import { getStudy, patchStudy } from '../db';
import type { ToolStudy } from '../lib/study';
import type { CapCtx, ColleagueDraft } from './types';

export const draftsOf = (s: Pick<ToolStudy, 'facts'>): ColleagueDraft[] => {
  const d = (s.facts as { drafts?: unknown }).drafts;
  return Array.isArray(d) ? d as ColleagueDraft[] : [];
};

export async function conversation(ctx: CapCtx): Promise<{ ok: true; s: ToolStudy } | { ok: false; why: string }> {
  if (!ctx.conversationId) return { ok: false, why: 'This needs a conversation to keep it in, and there is none open.' };
  const s = await getStudy(ctx.conversationId);
  if (!s || s.tool !== 'talk' || !(s.facts as { colleague?: boolean }).colleague) return { ok: false, why: 'The conversation is not on this device any more.' };
  return { ok: true, s };
}

/** The drafts written back, worked out from the stored row so nothing written meanwhile is lost. */
export const writeDrafts = (id: string, change: (cur: ColleagueDraft[]) => ColleagueDraft[]) =>
  patchStudy(id, cur => ({ facts: { ...cur.facts, drafts: change(draftsOf(cur)) } as ToolStudy['facts'] }));

export async function draftIn(ctx: CapCtx, draftId: string): Promise<{ ok: true; s: ToolStudy; d: ColleagueDraft } | { ok: false; why: string }> {
  const c = await conversation(ctx);
  if (!c.ok) return c;
  const d = draftsOf(c.s).find(x => x.id === draftId);
  return d ? { ok: true, s: c.s, d } : { ok: false, why: 'There is no draft with that id in this conversation — start one first, or ask for the draft state.' };
}
export const putDraft = (s: ToolStudy, d: ColleagueDraft) => writeDrafts(s.id, cur => cur.map(x => (x.id === d.id ? d : x)));
