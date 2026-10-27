import { describe, expect, it } from 'vitest';
import { planOneRecord, mergedIds, movedScope, studiesToPoint } from '../machineMerge';
import type { ToolStudy } from '../study';
import type { Asset } from '../testing';
import { machinesToTakeOn, type JobLine } from '../lineRecords';

const A = (id: string, o: Partial<Asset> = {}): Asset => ({ id, projectId: '', name: 'Flow wrapper', state: 'onSite', sort: 1, updatedAt: 1, ...o });
const jl: JobLine[] = [{ id: 'jl1', projectId: 'P', workspaceId: 'L1' }, { id: 'jl2', projectId: 'Q', workspaceId: 'L1' }, { id: 'jl3', projectId: 'R', workspaceId: 'L2' }, { id: 'jl4', projectId: 'R', workspaceId: 'L3' }];

describe('one record of a machine', () => {
  it('a project\'s record and the line\'s own of one machine: the project\'s kept, the line\'s put away into it, its facts taken', () => {
    const line = A('mc-L1-flow-wrapper', { workspaceId: 'L1', oem: 'Ilapak', note: 'by the door', state: 'running' });
    const job = A('z9', { projectId: 'P', name: ' flow  WRAPPER ', dueOn: '2026-11-02' });
    const plan = planOneRecord([line, job], jl);
    expect(plan.merges).toHaveLength(1);
    expect(plan.merges[0].keep).toMatchObject({ id: 'z9', projectId: 'P', workspaceId: 'L1', oem: 'Ilapak', note: 'by the door', dueOn: '2026-11-02' });
    expect(plan.merges[0].changed).toBe(true);
    expect(plan.merges[0].into.map(r => r.id)).toEqual(['mc-L1-flow-wrapper']);
    expect(mergedIds(plan).get('mc-L1-flow-wrapper')).toBe('z9');
    expect(plan.lined.map(a => [a.id, a.workspaceId])).toEqual([['z9', 'L1']]); // the kept one written onto its line
    expect(plan.held).toEqual([]);
  });

  it('two of the line\'s own (two devices before they synced): the smallest id kept, the same on every device', () => {
    const a = A('b', { workspaceId: 'L1' }), b = A('a', { workspaceId: 'L1', oem: 'Ishida' });
    for (const order of [[a, b], [b, a]]) {
      const plan = planOneRecord(order, jl);
      expect(plan.merges[0].keep.id).toBe('a');
      expect(plan.merges[0].changed).toBe(false);
      expect(plan.merges[0].into.map(r => r.id)).toEqual(['b']);
    }
  });

  it('documents are joined, never doubled', () => {
    const doc = (k: string) => ({ id: k, name: k, mime: 'application/pdf', blobKey: k, savedAt: 1 });
    const plan = planOneRecord([A('a', { workspaceId: 'L1', docs: [doc('d1')] }), A('b', { workspaceId: 'L1', docs: [doc('d1'), doc('d2')] })], jl);
    expect(plan.merges[0].keep.docs?.map(d => d.blobKey)).toEqual(['d1', 'd2']);
  });

  it('two records a project holds — of one project, or one each of two — are left and said', () => {
    const two = planOneRecord([A('a', { projectId: 'P' }), A('b', { projectId: 'P' })], jl);
    expect(two.merges).toEqual([]);
    expect(two.held).toEqual([{ lineId: 'L1', name: 'Flow wrapper', projects: ['P'] }]);
    const both = planOneRecord([A('a', { projectId: 'P' }), A('b', { projectId: 'Q' }), A('c', { workspaceId: 'L1' })], jl);
    expect(both.merges).toEqual([]);
    expect(both.held[0].projects).toEqual(['P', 'Q']);
  });

  it('different names, different lines, put-away and deleted records are never merged', () => {
    const plan = planOneRecord([
      A('a', { workspaceId: 'L1' }), A('b', { workspaceId: 'L1', name: 'Checkweigher' }), A('c', { workspaceId: 'L2' }),
      A('d', { workspaceId: 'L1', deletedAt: 5 }), A('e', { workspaceId: 'L1', mergedInto: 'a', deletedAt: 5 }),
    ], jl);
    expect(plan.merges).toEqual([]);
  });

  it('a project\'s record whose line is known only through its project is written onto that line; a project on two lines leaves it', () => {
    const plan = planOneRecord([A('a', { projectId: 'P' }), A('r', { projectId: 'R' })], jl);
    expect(plan.lined).toEqual([expect.objectContaining({ id: 'a', workspaceId: 'L1' })]);
  });

  it('a note on a machine moves with it; any other note stays where it is', () => {
    const moved = new Map([['old', 'kept']]);
    expect(movedScope('asset:old', moved)).toBe('asset:kept');
    expect(movedScope('asset:other', moved)).toBeUndefined();
    expect(movedScope('gate:install', moved)).toBeUndefined();
    expect(movedScope('t-123', moved)).toBeUndefined();
  });

  it('a study naming a machine its line holds points at that record — never makes one, never moves one already pointed', () => {
    const S = (id: string, o: Partial<ToolStudy> = {}) => ({ id, tool: 'reliability', name: id, workspaceId: 'L1', machine: 'flow wrapper', facts: {}, uses: [], startedAt: 1, createdAt: 1, updatedAt: 1, ...o }) as ToolStudy;
    const recs = [A('mc', { workspaceId: 'L1' }), A('job', { projectId: 'P' }), A('cw', { workspaceId: 'L1', name: 'Checkweigher' }), A('gone', { workspaceId: 'L1', name: 'Labeller', mergedInto: 'x', deletedAt: 1 })];
    const out = studiesToPoint([
      S('a'),                                   // → the project's record first, as the merge keeps it
      S('b', { machine: ' CHECKWEIGHER ' }),     // case and spacing never make two
      S('c', { machine: 'Palletiser' }),         // no record of it on the line: left
      S('d', { assetId: 'cw' }),                 // already on a live record: left
      S('e', { assetId: 'gone', machine: 'Checkweigher' }), // on a record put away: pointed again
      S('f', { workspaceId: 'L2' }),             // another line
      S('g', { machine: '' }), S('h', { deletedAt: 3 }),
    ], recs, jl);
    expect(out).toEqual([{ id: 'a', assetId: 'job' }, { id: 'b', assetId: 'cw' }, { id: 'e', assetId: 'cw' }]);
  });

  it('a project can take on the line\'s own machines — a name, or a record on no project — never one a project has', () => {
    const ws = { id: 'L1', assets: ['Whole line', 'Flow wrapper', 'Checkweigher', 'Labeller', 'Palletiser'] };
    const recs = [A('a', { workspaceId: 'L1', name: 'Checkweigher' }), A('b', { projectId: 'P', name: 'Labeller' }), A('c', { projectId: 'Q', workspaceId: 'L1', name: 'Palletiser' })];
    expect(machinesToTakeOn(ws, recs, jl)).toEqual(['Flow wrapper', 'Checkweigher']);
  });
});
