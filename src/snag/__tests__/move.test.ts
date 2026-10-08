/* A SNAG MOVES TO A JOB — against the real store. Rowland, 8 October: "it
 * just allows me to label it, but it does nothing ... does it move from a
 * snag and go to the fix page, to keep things clean and transitional?" */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { Snag } from '../types';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

const snag = (o: Partial<Snag> = {}): Snag =>
  ({ id: 'sn1', workspaceId: 'w', problem: 'Infeed guard bolt missing', status: 'open', raisedAt: 1, updatedAt: 1, media: [{ id: 'm1', kind: 'photo', blobKey: 'b1', mime: 'image/jpeg', capturedAt: 1 }], owner: 'Dave', ...o });

describe('a snag moved to a stage-gate job', () => {
  it('with no stage is a fix there, its problem carried on it; the snag is closed as moved', async () => {
    const db = await import('../../db');
    const { sendSnags } = await import('../quick');
    const s = snag();
    await db.addSnag(s);
    const undo = await sendSnags([s], 'job', undefined, { flag: 'critical' }, 'Line 2');
    const fixes = (await db.listTests('job')).filter(t => t.kind === 'fix');
    expect(fixes).toHaveLength(1);
    expect(fixes[0]).toMatchObject({ title: 'Infeed guard bolt missing', passesIf: 'Infeed guard bolt missing', withWhom: 'Dave', outcome: 'planned' });
    expect(fixes[0].fromTestId).toBeUndefined();
    const items = await db.listTestItems('job');
    expect(items[0]).toMatchObject({ kind: 'found', testId: fixes[0].id, becameTestId: fixes[0].id, critical: true, media: s.media });
    const moved = (await db.listAllSnags()).find(x => x.id === s.id);
    expect(moved).toMatchObject({ status: 'closed', closeNote: 'Moved to Line 2 — now a fix there', projectId: 'job' });
    expect(moved?.sent?.[0]).toMatchObject({ projectId: 'job', itemId: items[0].id });
    /* Undo: back as it was, and nothing left on the job. */
    await undo();
    expect((await db.listAllSnags()).find(x => x.id === s.id)).toMatchObject({ status: 'open' });
    expect((await db.listTests('job')).filter(t => !t.deletedAt)).toHaveLength(0);
    expect((await db.listTestItems('job')).filter(i => !i.deletedAt)).toHaveLength(0);
  });

  it('on a stage, unticked, is a problem there with no fix', async () => {
    const db = await import('../../db');
    const { sendSnags } = await import('../quick');
    await db.putTest({ id: 'st', projectId: 'job', kind: 'install', title: 'Guards fitted', outcome: 'planned', sort: 1, createdAt: 1, updatedAt: 1 } as never);
    const s = snag();
    await db.addSnag(s);
    await sendSnags([s], 'job', 'st', { fix: false }, 'Line 2');
    expect((await db.listTests('job')).filter(t => t.kind === 'fix')).toHaveLength(0);
    expect((await db.listTestItems('job'))[0]).toMatchObject({ testId: 'st', what: 'Infeed guard bolt missing' });
    expect((await db.listAllSnags())[0].closeNote).toBe('Moved to Line 2 — now a problem there');
  });
});

describe('a snag moved to a 6M job', () => {
  it('is an action on its board, with its pictures; Undo keeps the pictures', async () => {
    const db = await import('../../db');
    const { moveSnagsToActions } = await import('../quick');
    const s = snag({ latestUpdate: 'Bolt on order' });
    await db.addSnag(s);
    const undo = await moveSnagsToActions([s], 'pace', 'Line 7 pace');
    const todos = await db.listPaceTodos('pace');
    expect(todos[0]).toMatchObject({ what: 'Infeed guard bolt missing', who: 'Dave', state: 'todo', notes: 'Bolt on order', media: s.media });
    expect((await db.listAllSnags())[0]).toMatchObject({ status: 'closed', closeNote: 'Moved to Line 7 pace — now an action there' });
    await undo();
    expect(await db.listPaceTodos('pace')).toHaveLength(0);
    expect((await db.listAllSnags())[0].status).toBe('open');
  });
});
