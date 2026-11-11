/* THE PROBLEMS A TOOL RECORD HOLDS, ON ITS PAPER (docs/TOOL-PROBLEMS.md) — poured through the real engine into a real jsPDF and read back. */
import { describe, expect, it } from 'vitest';
import { jsPDF } from 'jspdf';
import { pour } from '../flow';
import { problemsTail, setHeldProblems } from '../toolProblemsPaper';
import type { Snag } from '../../../snag/types';
import type { ToolStudy } from '../../study';

const NOW = new Date(2026, 10, 11, 12).getTime();
const study = { id: 'st-1', tool: 'calc', name: 'Cellox trial', uses: [], startedAt: NOW, createdAt: NOW, facts: {},
  agreed: { calc: { key: 'workstation-stops', inputs: { n: 3, w01_name: 'Filler', w02_name: 'Sealer', w03_name: 'Packer' } } } } as unknown as ToolStudy;
const p = (id: string, problem: string, extra: Partial<Snag>): Snag => ({ id, workspaceId: 'ws', problem, status: 'open', raisedAt: NOW, updatedAt: NOW, ...extra });

async function read(s: ToolStudy): Promise<string> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: false });
  await pour({ doc, x: 40, w: 515, top: 40, bottom: 800, density: 'normal', dry: false } as never, problemsTail(s, NOW), () => doc.addPage());
  /* the text as drawn: jsPDF writes each line as a (…) Tj string */
  return [...doc.output().matchAll(/\((.*?)\) Tj/g)].map(m => m[1]).join(' ');
}

describe('Problems raised here, on the tool’s paper', () => {
  it('prints nothing when the record holds none', () => {
    setHeldProblems([p('x', 'Somewhere else', { tools: [{ studyId: 'other' }] })]);
    expect(problemsTail(study, NOW)).toEqual([]);
  });

  it('prints each under its part, the whole record first, with priority, whose, the day and where it stands — late said', async () => {
    setHeldProblems([
      p('a', 'Sealer jaw trapping film', { priority: 'high', owner: 'Dave', dueAt: new Date(2026, 10, 14).getTime(), tools: [{ studyId: 'st-1', part: 'w02', raised: true }] }),
      p('b', 'Filler nozzle dripping', { dueAt: new Date(2026, 10, 8).getTime(), tools: [{ studyId: 'st-1', part: 'w01' }] }),
      p('c', 'Whole trial paused for a clean', { status: 'closed', tools: [{ studyId: 'st-1' }] }),
      p('d', 'Gone', { deletedAt: NOW, tools: [{ studyId: 'st-1' }] }),
    ]);
    const t = await read(study);
    expect(t).toContain('Problems raised here');
    expect(t).toContain('2 open');
    expect(t).toContain('1 closed');
    const at = (s: string) => t.indexOf(s);
    expect(at('Whole trial paused')).toBeLessThan(at('Filler'));
    expect(at('Filler')).toBeLessThan(at('Filler nozzle dripping'));
    expect(at('Sealer')).toBeLessThan(at('Sealer jaw trapping film'));
    expect(t).toContain('High · with Dave · due 14 Nov · Open');
    expect(t).toContain('Low · nobody on it yet · due 8 Nov · 3 days late');
    expect(t).toContain('Closed');
    expect(t).not.toContain('Gone');
  });
});
