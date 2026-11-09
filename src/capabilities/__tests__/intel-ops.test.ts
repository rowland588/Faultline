/* EVERY TOOL'S LIMITS, AS THE ASSISTANT MEETS THEM (docs/AI-TOOL-INTELLIGENCE.md §5). Rowland, 10 November: "For every existing
 * application tool, test: what can genuinely be achieved through conversation? What requires additional evidence? What requires visual
 * interaction? What requires physical human input? What cannot currently be supported? What happens when the AI reaches one of these
 * limitations?" So, table-driven over every tool the AI can reach, through the real capabilities: tool_intel says each operation with its
 * level; a level 1 or 2 operation is never handed over (the AI does it); a level 3 is handed over — its page opened, the step kept, what to
 * do and why the AI cannot said; a level 4 is refused with why and the manual way; and a vague task still finds its line's next step. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { CapCtx } from '../types';
import { TOOL_INTEL } from '../intel/tools';

beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.resetModules(); });

const NOW = Date.UTC(2026, 10, 10, 12);

async function seed() {
  const db = await import('../../db'), reg = await import('../registry'), lines = await import('../../lib/lines'), conv = await import('../../colleague/conversation');
  const line = await lines.addLineToFactory('Line 3');
  await db.putStudy(conv.newConversation({ id: 'conv', at: NOW, name: 'AI', thread: { id: 't1', title: 'Line 3', scope: { lineId: line.id } } }));
  await db.putStudy({ id: 'rec', tool: 'capability', name: 'Seal strength', workspaceId: line.id, agreed: { readings: { kind: 'limits', unit: 'N', nominal: 20, lower: 15, upper: 25, count: 30 } }, facts: { readings: [] }, uses: [], startedAt: NOW, createdAt: NOW, updatedAt: NOW });
  const ctx: CapCtx = { now: NOW, conversationId: 'conv', me: 'Rowland' };
  let n = 0;
  const run = async (name: string, input: unknown) => reg.runCall(ctx, { id: `c${n += 1}`, name, input }, { confirmed: true });
  return { run, line };
}

describe('every tool’s operations, as the assistant meets them', () => {
  it('there is at least one operation at each level, and the not-yet-possible ones are said as level 4', () => {
    const levels = new Set(TOOL_INTEL.flatMap(t => t.ops.map(o => o.level)));
    expect([...levels].sort()).toEqual([1, 2, 3, 4]);
    const four = TOOL_INTEL.flatMap(t => t.ops.filter(o => o.level === 4).map(o => `${t.key}.${o.id}`));
    expect(four).toEqual(expect.arrayContaining(['stops.sensors', 'changeover.from-footage', 'capability.photo-reading', 'linestandard.from-photo', 'spaghetti.from-footage', 'video.watch-in-chat']));
  });

  it('tool_intel says every tool: each operation with its level in words, and its limits', async () => {
    const { run } = await seed();
    for (const t of TOOL_INTEL) {
      const r = await run('tool_intel', { tool: t.key });
      expect(r.ok, t.key).toBe(true);
      if (!r.ok) continue;
      expect(r.says, t.key).toMatch(/Cannot answer:/);
      for (const o of t.ops) expect(r.says, `${t.key}.${o.id}`).toContain(o.does);
    }
  }, 120_000);

  it('at each limit the assistant does the right thing: 1 · 2 done in the conversation, 3 handed over with its page, 4 refused with why and the manual way', async () => {
    const { run, line } = await seed();
    for (const t of TOOL_INTEL) for (const o of t.ops) {
      const at = `${t.key}.${o.id}`;
      const r = await run('hand_over', { tool: t.key, op: o.id, ...(o.page === 'record' ? { studyId: 'rec' } : { lineId: line.id }) });
      if (o.level === 1 || o.level === 2) {
        expect(r.ok, at).toBe(false);
        if (!r.ok) expect(r.why, at).toMatch(/can be done in the conversation/);
      } else if (o.level === 4) {
        expect(r.ok, at).toBe(false);
        if (!r.ok) { expect(r.why, at).toMatch(/^That is not supported yet: /); expect(r.why, at).toMatch(/manual way|by hand|on the|instead/i); }
      } else {
        expect(r.ok, at).toBe(true);
        if (r.ok) {
          expect(r.show?.href, at).toMatch(/^\//);
          expect(r.says, at).toContain(o.handover!);
          expect(r.says, at).toContain('I can’t do this part');
          expect(r.says, at).toMatch(/run handover_state and read the record/);
        }
      }
    }
  }, 180_000);

  it('a vague task — "this line is struggling" — is read as lost time and gets one next step, never a menu', async () => {
    const { run, line } = await seed();
    const r = await run('understand_task', { words: 'I want to understand why this line is struggling', lineId: line.id });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect((r.data as { task: string }).task).toBe('losttime');
      expect((r.data as { next?: { key: string } }).next?.key).toBeTruthy();
    }
  }, 60_000);
});
