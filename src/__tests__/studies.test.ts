/* STUDIES — the record (docs/BUILD.md, 2a): kept on the device, sent and read
 * back whole, and handled when the job it is attached to is deleted for good.
 *
 * Three failures this guards against:
 *   - A STUDY THAT LOSES ITS MAKER. "Not filed" means its maker's alone, so
 *     the push must send who made it, not whoever saved it last.
 *   - AN OLDER PHONE THAT ERASES A NEWER ONE'S WORK. A tool or a fact list
 *     this build does not know is kept as it came, so saving the row back
 *     never strips it.
 *   - EVIDENCE DESTROYED WITH A JOB. A study only on the job goes with it; one
 *     that is on a line as well stays with the line, unlinked. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { MAPS } from '../cloud/mappers';
import type { ToolStudy } from '../lib/study';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

const freshDb = async () => await import('../db');

const study = (o: Partial<ToolStudy> = {}): ToolStudy => ({
  id: 'sd1', tool: 'capability', name: 'Weight accuracy 400 g',
  agreed: { readings: { kind: 'limits', unit: 'g', nominal: 400, lower: 400, upper: 404, count: 30 } },
  facts: { readings: [{ id: 'r1', value: 401.2, at: 1 }, { id: 'r2', value: 399.8, at: 2, struck: true }] },
  uses: [], startedAt: 10, createdAt: 10, updatedAt: 10, ...o,
});

describe('kept on the device', () => {
  it('lists a job’s, a line’s and every study, newest first, deleted ones left out', async () => {
    const db = await freshDb();
    await db.putStudy(study({ id: 'a', projectId: 'p1', startedAt: 1 }));
    await db.putStudy(study({ id: 'b', projectId: 'p1', workspaceId: 'w1', startedAt: 2 }));
    await db.putStudy(study({ id: 'c', workspaceId: 'w1', startedAt: 3 }));
    await db.putStudy(study({ id: 'd', startedAt: 4 }));
    await db.putStudy(study({ id: 'e', projectId: 'p1', startedAt: 5, deletedAt: 6 }));

    expect((await db.listStudies('p1')).map(s => s.id)).toEqual(['b', 'a']);
    expect((await db.listStudiesForLine('w1')).map(s => s.id)).toEqual(['c', 'b']);
    expect((await db.listAllStudies()).map(s => s.id)).toEqual(['d', 'c', 'b', 'a']);
    expect(await db.getStudy('e')).toBeUndefined();
  });

  it('a patch reads and writes in one go, and leaves a deleted study alone', async () => {
    const db = await freshDb();
    await db.putStudy(study());
    await db.patchStudy('sd1', cur => ({ facts: { readings: [...(cur.facts.readings ?? []), { id: 'r3', value: 402, at: 3 }] } }));
    expect((await db.getStudy('sd1'))?.facts.readings?.map(r => r.id)).toEqual(['r1', 'r2', 'r3']);

    await db.putStudy(study({ id: 'gone', deletedAt: 5 }));
    await db.patchStudy('gone', { name: 'changed' });
    const raw = await (await (await import('../db/core')).getDB()).get('studies', 'gone');
    expect(raw?.name).toBe('Weight accuracy 400 g');
  });

  it('a delete travels, and the undo puts it back', async () => {
    const db = await freshDb();
    await db.putStudy(study());
    const undo = await db.deleteStudy('sd1');
    expect(await db.getStudy('sd1')).toBeUndefined();
    expect((await db.listTombstones()).some(t => t.kind === 'studies' && t.id === 'sd1')).toBe(true);
    await undo();
    expect((await db.getStudy('sd1'))?.name).toBe('Weight accuracy 400 g');
  });
});

describe('sent and read back whole', () => {
  it('every field survives the trip, and the maker is kept', () => {
    const s = study({
      ownerId: 'maker', workspaceId: 'w1', projectId: 'p1', machine: 'Checkweigher', assetId: 'as1',
      product: 'Maris Piper 2kg', programId: 'pg1', standardId: 'st1', closedAt: 20,
      uses: [{ id: 'u1', kind: 'test', ref: 'ts1', role: 'proof', at: 11, by: 'K. Ahmed' }],
      receipt: { at: 20, text: '30 packs, mean 401.2 g — Passed.', tone: 'g', figures: { mean: 401.2, cpk: 0.67 } },
      overrule: { verdict: 'Didn’t pass', why: 'reading 7 was the tare', by: 'K. Ahmed', at: 21 },
    });
    const row = MAPS.studies.toRow(s, 'whoever-saved-it');
    expect(row.owner_id).toBe('maker');
    expect(MAPS.studies.fromRow(row)).toEqual(s);
  });

  it('a study with no maker yet is sent as the device’s own', () => {
    expect(MAPS.studies.toRow(study(), 'me').owner_id).toBe('me');
  });

  it('keeps a tool and a fact list it does not know; drops a list entry with no id', () => {
    const back = MAPS.studies.fromRow({
      ...MAPS.studies.toRow(study(), 'me'),
      tool: 'pareto',
      facts: { readings: [{ id: 'r1', value: 1, at: 1 }, { value: 2 }], laps: [{ id: 'l1', sec: 4.2 }] },
      uses: [{ id: 'u1', kind: 'fix', ref: 'f1', role: 'proof', at: 1 }, 'junk', { kind: 'fix' }],
    }) as unknown as ToolStudy;
    expect(back.tool).toBe('pareto');
    expect(back.facts.readings?.map(r => r.id)).toEqual(['r1']);
    expect((back.facts as Record<string, unknown>).laps).toEqual([{ id: 'l1', sec: 4.2 }]);
    expect(back.uses.map(u => u.id)).toEqual(['u1']);
  });
});

describe('when its job is deleted for good', () => {
  it('a study only on the job goes with it; one on a line stays there, unlinked', async () => {
    const db = await freshDb();
    const id = 'proj-under-test';
    await db.addProject({ id, name: 'Line 9 install', color: '#0b7d68', workspaceIds: [], commissioning: true, createdAt: 1, updatedAt: 1 });
    await db.putStudy(study({ id: 'job-only', projectId: id, uses: [{ id: 'u1', kind: 'test', ref: 'ts1', role: 'proof', at: 1 }] }));
    await db.putStudy(study({ id: 'on-a-line', projectId: id, workspaceId: 'w1', uses: [{ id: 'u2', kind: 'fix', ref: 'f1', role: 'proof', at: 1 }] }));
    await db.putStudy(study({ id: 'elsewhere', projectId: 'another-job' }));

    const by = Object.fromEntries((await db.projectContents(id)).map(c => [c.store, c.count]));
    expect(by.studies, 'only the one that goes is counted').toBe(1);

    await db.purgeProject(id);
    expect(await db.getStudy('job-only')).toBeUndefined();
    expect((await db.listTombstones()).some(t => t.kind === 'studies' && t.id === 'job-only')).toBe(true);
    const kept = await db.getStudy('on-a-line');
    expect(kept?.workspaceId).toBe('w1');
    expect(kept?.projectId).toBeUndefined();
    expect(kept?.uses).toEqual([]);
    expect((await db.getStudy('elsewhere'))?.projectId).toBe('another-job');
  });
});
