/* WHAT Faultline HAS FOUND (docs/LUNAR-BRAIN.md B1): the findings capability does the line's homework if it is not done, keeps it as
 * one 'brain' study, says each finding with how sure it is, and does not work the same records twice in a day. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.resetModules(); });

const DAY = 86_400_000;

describe('findings', () => {
  it('does the homework, keeps it, and says it with sureness and limits', async () => {
    const db = await import('../../db');
    const { readFindings } = await import('../brain');
    const { lineBrain, brainId } = await import('../../lib/brain/homework');
    const line = await db.createWorkspace('Line 9');
    const now = Date.now();
    let n = 0;
    for (const [d, min] of [[1, 10], [2, 5], [3, 15]] as const) {
      await db.addObservation({ id: `o${++n}`, workspaceId: line.id, category: 'Jam', asset: 'Bagger', startedAt: now - d * DAY, durationMs: min * 60_000, timing: 'stopwatch', count: 1, media: [], createdAt: now, updatedAt: now });
    }
    expect((await lineBrain(line)).state).toBe('none');
    const r = await readFindings.run({ now, conversationId: 'c' }, { lineId: line.id });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.says).toMatch(/Line 9 — Up to date/);
    expect(r.says).toMatch(/Jam on the Bagger was 100% of it \(30 min in 3\)/);
    expect(r.says).toMatch(/too few records/);
    expect(r.says).toMatch(/keep a recorded reason apart from a cause/);
    const kept = await db.getStudy(brainId(line.id));
    expect(kept?.tool).toBe('brain');
    const at = (kept!.facts as unknown as { brain: { at: number } }).brain.at;
    await readFindings.run({ now: now + 1000, conversationId: 'c' }, { lineId: line.id });
    expect(((await db.getStudy(brainId(line.id)))!.facts as unknown as { brain: { at: number } }).brain.at).toBe(at);
    await db.addObservation({ id: 'o-new', workspaceId: line.id, category: 'Film', asset: 'Wrapper', startedAt: now - DAY, durationMs: 60_000, timing: 'stopwatch', count: 1, media: [], createdAt: now, updatedAt: now });
    expect((await lineBrain(line, now + 2000)).state).toBe('stale');
  });
  it('a line with nothing timed says so rather than guessing', async () => {
    const db = await import('../../db');
    const { readFindings } = await import('../brain');
    const line = await db.createWorkspace('Empty line');
    const r = await readFindings.run({ now: Date.now(), conversationId: 'c' }, { lineId: line.id });
    expect(r.ok && r.says).toMatch(/nothing timed on it to work from/);
  });
});
