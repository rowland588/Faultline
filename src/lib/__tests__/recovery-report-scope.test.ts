import { beforeEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { Snag } from '../../snag/types';
import type { Case } from '../../types';
import * as db from '../../db';
import { loadProblems, viewsOf } from '../useProblems';
import { loadOwnRecords } from '../../project/projectRead';
import { sixmReport } from '../sixmReport';
import { sixmStatus } from '../sixmStatus';
import { sixmFigures } from '../sixmLean';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
});

describe('the records in a recovery customer report', () => {
  it('keeps separate projects on the same factory line separate, and shows a typed finding once until its case takes over', async () => {
    const now = Date.now();
    const first = await db.createProject('April recovery', '#000', undefined, undefined, 'board', 'dmaic', 'line-recovery');
    const next = await db.createProject('May recovery', '#000', undefined, undefined, 'board', 'dmaic', 'line-recovery');
    const shared = await db.createWorkspace('Packaging');
    const other = await db.createWorkspace('Mixing');
    for (const project of [first, next]) await db.addPaceLine({ projectId: project.id, key: 'pack', name: shared.name, workspaceId: shared.id });
    await db.addPaceLine({ projectId: first.id, key: 'mix', name: other.name, workspaceId: other.id });

    const snag = (id: string, projectId?: string, patch?: Partial<Snag>): Snag => ({
      id, workspaceId: shared.id, projectId, problem: id, status: 'open', media: [], raisedAt: now, updatedAt: now, ...patch,
    });
    for (const entry of [
      snag('Typed in Define', first.id), snag('With a photo', first.id, { assetId: 'picture' }),
      snag('Other recovery', next.id, { assetId: 'picture' }), snag('Unassigned line history', undefined, { assetId: 'picture' }),
      snag('Archived finding', first.id, { archivedAt: now }), snag('Other line', first.id, { workspaceId: other.id }),
      snag('Moved to investigation', first.id, { caseId: 'investigation', assetId: 'picture', status: 'closed' }),
    ]) await db.addSnag(entry);

    const historical: Case = { id: 'legacy', title: 'Legacy line case', workspaceId: shared.id, path: [], baselineMsWeek: 0, openedAt: now, updatedAt: now, status: 'open' };
    await db.addCase(historical);
    await db.addCase({ ...historical, id: 'investigation', title: 'Investigation', projectId: first.id, source: { kind: 'observed', snag: 'Moved to investigation' } });
    for (const [id, projectId] of [['line standard', ''], ['our capacity', first.id], ['other investigation capacity', next.id]]) {
      await db.putStandard({ id, projectId, workspaceId: shared.id, product: id, marks: [], sort: 0, createdAt: now, updatedAt: now });
    }

    const loaded = await loadProblems(first.id);
    const own = await loadOwnRecords(first.id);
    const selected = own.lines.find(l => l.workspaceId === shared.id);
    if (!selected) throw new Error('The project line is missing');
    const todo = { where: '', who: '', when: '', why: '', state: 'todo' as const, createdAt: now, updatedAt: now };
    const report = sixmReport({
      project: first, data: loaded.data, problems: viewsOf(loaded, first.id, selected.id), register: own.register, lineId: selected.id, now,
      todos: [{ ...todo, id: 'all', what: 'Whole project action' }, { ...todo, id: 'other-line', what: 'Mixing task', workspaceId: other.id },
        { ...todo, id: 'line', what: 'Packaging task', workspaceId: shared.id }],
    });
    expect(loaded.data.standards.map(s => s.id).sort()).toEqual(['line standard', 'our capacity']);
    expect(report.seen?.rows.map(s => s.what).sort()).toEqual(['Typed in Define', 'With a photo']);
    expect(report.seen?.closed).toEqual([]);
    expect(report.board.flatMap(group => group.rows.map(r => r.what))).toEqual(['Packaging task']);
    expect(sixmStatus(report).problems.map(p => p.title).sort()).toEqual(['Investigation', 'Typed in Define', 'With a photo']);
    expect(sixmFigures(report).open).toBe(3);
    expect((await loadProblems(next.id)).cases).toEqual([]);
    expect((await db.listCases(shared.id)).map(c => c.id)).toContain('legacy');
  });
});
