/* WHERE A CHARTER BELONGS (./documentHome; docs/LUNA-EVAL.md §5 — the packing exam's charter written on the DMAIC Define sheet).
 * Through runCall, the one door the colleague uses: charter words on the sheet refused and pointed at the charter; a charter started,
 * filled and corrected in place; a second never started; two charters on one project asked between, nothing written; the sheet's own
 * questions still written, saying the charter is a document of its own. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { CapCtx } from '../types';

beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.resetModules(); });
const NOW = Date.UTC(2026, 10, 12, 9);

async function seed() {
  const db = await import('../../db');
  const reg = await import('../registry');
  const lines = await import('../../lib/lines');
  const conv = await import('../../colleague/conversation');
  const a = await lines.addLineToFactory('Packing Line 1');
  await db.putStudy(conv.newConversation({ id: 'conv', at: NOW, name: 'AI' }));
  const ctx: CapCtx = { now: NOW, conversationId: 'conv', me: 'Rowland' };
  const run = (name: string, input: unknown) => reg.runCall(ctx, { id: `c-${name}-${Math.random()}`, name, input }, { confirmed: true });
  const p = await run('start_project', { name: 'Bagger stops', method: 'dmaic', lineIds: [a.id] });
  if (!p.ok) throw new Error(p.why);
  const pid = (p.data as { id: string }).id;
  return { db, run, pid, a };
}

describe('a charter goes to the charter, never the Define sheet', () => {
  it('the sponsor, target and date on the sheet are refused, nothing written, and the charter document named as the place', async () => {
    const { run, db, pid } = await seed();
    const r = await run('answer_method', { projectId: pid, answers: [{ field: 'problem', text: 'The bagger keeps stopping.' }, { field: 'sponsor', text: 'Mark Davies' }, { field: 'target', text: '30' }] });
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.why).toMatch(/Nothing was written/); expect(r.why).toMatch(/start_draft \(kind doc, key charter/); }
    expect((await db.listTestItems(pid)).filter(x => x.kind === 'note')).toHaveLength(0);
  }, 60_000);

  it('started, filled, corrected in the same charter — a second start carries on with it', async () => {
    const { run, pid } = await seed();
    const s = await run('start_draft', { kind: 'doc', key: 'charter', projectId: pid });
    expect(s.ok).toBe(true);
    const draftId = (s as { data: { draftId: string } }).data.draftId;
    expect((await run('fill_draft', { draftId, values: [{ field: 'sponsor', value: 'Mark Davies', how: 'reported' }] })).ok).toBe(true);
    expect((await run('fill_draft', { draftId, values: [{ field: 'sponsor', value: 'Priya Shah', how: 'reported' }] })).ok).toBe(true);
    const again = await run('start_draft', { kind: 'doc', key: 'charter', projectId: pid, title: 'Another charter' });
    expect(again.ok && (again.data as { draftId: string }).draftId).toBe(draftId);
    /* with the charter in hand, Define's charter questions point at it rather than writing a second copy */
    const w = await run('answer_method', { projectId: pid, answers: [{ field: 'team', text: 'Me, Priya, Tom' }] });
    expect(w.ok).toBe(false);
    if (!w.ok) expect(w.why).toContain(`fill_draft (draftId ${draftId})`);
  }, 60_000);

  it('two charters on the project: asked which, nothing written, no third started', async () => {
    const { run, db, pid, a } = await seed();
    const base = { tool: 'doc', workspaceId: a.id, projectId: pid, facts: { docValues: {} }, uses: [], startedAt: NOW, createdAt: NOW, updatedAt: NOW } as const;
    await db.putStudy({ ...base, id: 'ch1', name: 'Charter — bagger', agreed: { doc: { def: 'charter' } } } as never);
    await db.putStudy({ ...base, id: 'ch2', name: 'Charter — bagger (Tom’s)', agreed: { doc: { def: 'charter' } } } as never);
    const w = await run('answer_method', { projectId: pid, answers: [{ field: 'sponsor', text: 'Priya Shah' }] });
    expect(w.ok).toBe(false);
    if (!w.ok) { expect(w.why).toMatch(/has 2 charters/); expect(w.why).toMatch(/Ask the person which/); }
    const s = await run('start_draft', { kind: 'doc', key: 'charter', projectId: pid });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.why).toMatch(/No second charter was started/);
  }, 60_000);

  it('the sheet’s own questions still write — and say the charter is a document of its own', async () => {
    const { run, db, pid } = await seed();
    const w = await run('answer_method', { projectId: pid, answers: [{ field: 'risks', text: 'Engineering time.' }, { field: 'problem', text: 'The bagger keeps stopping.' }] });
    expect(w.ok).toBe(true);
    if (w.ok) expect(w.says).toMatch(/charter is its own document/);
    expect((await db.listTestItems(pid)).filter(x => x.kind === 'note')).toHaveLength(2);
  }, 60_000);
});
