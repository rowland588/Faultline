/* WORKING WITHIN AN AGREED INVESTIGATION (docs/LUNA-WORKSPACE.md W3): a capture step goes in without a card only when it writes into a
 * project the person agreed — read from its own input and the record it names; a consequential step never; another project never. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.resetModules(); });

describe('inAgreedScope', () => {
  it('lets a capture step into the agreed project only', async () => {
    const db = await import('../../db'); const sc = await import('../scope');
    const t = Date.now();
    await db.putStudy({ id: 's-in', tool: 'capability', name: 'In', projectId: 'p1', facts: {} as never, uses: [], startedAt: t, createdAt: t, updatedAt: t });
    await db.putStudy({ id: 's-out', tool: 'capability', name: 'Out', projectId: 'p2', facts: {} as never, uses: [], startedAt: t, createdAt: t, updatedAt: t });
    expect(await sc.inAgreedScope('add_readings', { studyId: 's-in', values: [1] }, ['p1'])).toBe(true);
    expect(await sc.inAgreedScope('add_readings', { studyId: 's-out', values: [1] }, ['p1'])).toBe(false);
    expect(await sc.inAgreedScope('start_study', { projectId: 'p1', tool: 'capability' }, ['p1'])).toBe(true);
    expect(await sc.inAgreedScope('raise_problem', { projectId: 'p1', words: 'x' }, ['p1'])).toBe(false);
    expect(await sc.inAgreedScope('decide_hold', { projectId: 'p1' }, ['p1'])).toBe(false);
    expect(await sc.inAgreedScope('add_readings', { studyId: 's-in', values: [1] }, [])).toBe(false);
    expect(await sc.inAgreedScope('add_readings', { studyId: 'nope', values: [1] }, ['p1'])).toBe(false);
  });
});

describe('changesFor — what Luna changed on the page', () => {
  it('lists her writes into the record on screen in the last half hour, newest first', async () => {
    const { changesFor } = await import('../../colleague/LunaChanged');
    const now = Date.UTC(2026, 10, 10, 15);
    const u = (id: string, at: number, kind = 'write', status = 'done') => ({ callId: id, name: 'add_readings', title: 'Add the readings', kind, status, says: `${id} said`, refs: [{ kind: 'study', id: 's1', label: 'S', href: '' }], at });
    const conv = { facts: { colleague: true, turns: [{ id: 't', at: now, kind: 'reply', used: [u('a', now - 60_000), u('b', now - 5 * 60_000), u('old', now - 45 * 60_000), u('read', now, 'read'), u('wait', now, 'write', 'waiting')] }] } };
    expect(changesFor(['s1'], [conv], now).map(c => c.says)).toEqual(['a said', 'b said']);
    expect(changesFor(['other'], [conv], now)).toEqual([]);
  });
});
