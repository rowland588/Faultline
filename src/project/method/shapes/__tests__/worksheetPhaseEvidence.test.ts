import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { createProject, putStudy, putTestItem } from '../../../../db';
import { placementNote } from '../../../../lib/methodPlacement';
import { DISCIPLINES } from '../../../../lib/eightD';
import * as a3Paper from '../../../../lib/report/a3Paper';
import * as eightDPaper from '../../../../lib/report/eightDPaper';
import { PAPERS } from '../../papers';

describe.each(['a3', 'eight-d'] as const)('%s specialist paper', method => {
  it('keeps two runs of one tool in their assigned sections while later ambiguous and other-phase runs stay out of those sections', async () => {
    const project = await createProject('Scope test', '#123', undefined, undefined, 'board', method);
    const before = method === 'a3' ? 'Current condition' : DISCIPLINES[2].section;
    const after = method === 'a3' ? 'Plan and follow-up' : DISCIPLINES[6].section;
    let at = 1;
    const run = async (name: string, section?: string) => {
      const id = project.id + name;
      await putStudy({ id, projectId: project.id, name, tool: method === 'a3' ? 'chart' : 'capability', facts: {}, uses: [], createdAt: at, updatedAt: at, startedAt: at++ });
      if (section) await putTestItem(placementNote({ projectId: project.id, method, section }, 'study', id, at));
    };
    await run('First shift', before);
    await run('After the adjustment', after);
    await run('Unfiled shift');
    await run('Review unrelated to the baseline', method === 'a3' ? 'Analysis' : DISCIPLINES[4].section);
    const a3 = vi.spyOn(a3Paper, 'saveA3Pdf').mockResolvedValue(undefined);
    const eight = vi.spyOn(eightDPaper, 'saveEightDPdf').mockResolvedValue(undefined);
    try {
      await PAPERS[method]![0].make(project.id);
      if (method === 'a3') {
        const blocks = a3.mock.calls[0][0].sheet.blocks;
        expect(blocks.find(b => b.n === 2)?.evidence?.title).toContain('First shift');
        expect(blocks.find(b => b.n === 7)?.evidence?.title).toContain('After the adjustment');
      } else {
        const notes = eight.mock.calls[0][0].evidence ?? [];
        expect(notes.filter(x => x.section === before).map(x => x.title)).toEqual([expect.stringContaining('First shift')]);
        expect(notes.filter(x => x.section === after).map(x => x.title)).toEqual([expect.stringContaining('After the adjustment')]);
        expect(notes.some(x => x.title.includes('Unfiled shift'))).toBe(false);
      }
    } finally { a3.mockRestore(); eight.mockRestore(); }
  });
});
