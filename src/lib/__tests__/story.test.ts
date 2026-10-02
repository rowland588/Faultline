import { describe, expect, it } from 'vitest';
import { movedLater, slipOf, storyOf } from '../story';
import { gantt } from '../gantt';
import { standing } from '../standing';
import type { Test, TestItem } from '../testing';

const TODAY = '2026-10-02';
const at = (iso: string) => Date.parse(`${iso}T10:00:00`);
const step: Test = { id: 's1', projectId: 'p', kind: 'install', title: 'Guards fitted', assetId: 'a', outcome: 'planned',
  plannedFor: '2026-10-05', plannedTo: '2026-10-12', sort: 1, createdAt: 1, updatedAt: 1 };
const move: TestItem = { id: 'm1', projectId: 'p', testId: 's1', kind: 'found', what: 'Brackets the wrong size',
  movedFrom: '2026-10-09', movedTo: '2026-10-12', becameTestId: 'f1', media: [{ id: 'v', kind: 'video', blobKey: 'b', mime: 'video/mp4' } as never],
  sort: 1, createdAt: at('2026-10-07'), updatedAt: 1 };
const found: TestItem = { id: 'x1', projectId: 'p', testId: 's1', kind: 'found', what: 'Bolt missing', sort: 2, createdAt: at('2026-10-06'), updatedAt: 1 };
const fixDated: Test = { id: 'f1', projectId: 'p', kind: 'fix', title: 'Remake brackets', fromTestId: 's1', outcome: 'planned', plannedFor: '2026-10-08', sort: 2, createdAt: at('2026-10-07'), updatedAt: 1 };
const fixOpen: Test = { id: 'f2', projectId: 'p', kind: 'fix', title: 'Order spare guard', fromTestId: 's1', outcome: 'planned', sort: 3, createdAt: at('2026-10-06'), updatedAt: 1 };

describe('the story of a stage', () => {
  const st = storyOf('s1', [step, fixDated, fixOpen], [move, found]);

  it('reads a move — from, to, why, the film, its fix — apart from what was simply found', () => {
    expect(st.moves).toHaveLength(1);
    expect(st.moves[0]).toMatchObject({ from: '2026-10-09', to: '2026-10-12', days: 3, why: 'Brackets the wrong size', fixId: 'f1', on: '2026-10-07' });
    expect(st.moves[0].media).toHaveLength(1);
    expect(st.found.map(f => f.what)).toEqual(['Bolt missing']);
    expect(st.fixes.map(f => f.id)).toEqual(['f2', 'f1']);   // in the order they were booked
  });

  it('knows the finish first planned, and the days something happened', () => {
    expect(st.original).toBe('2026-10-09');
    expect(st.days).toEqual(['2026-10-06', '2026-10-07']);
    expect(slipOf(st, '2026-10-12')).toBe(3);
  });

  it('only a finish that existed, pushed later, is a move', () => {
    expect(movedLater('2026-10-09', '2026-10-12')).toBe(true);
    expect(movedLater('2026-10-09', '2026-10-08')).toBe(false);
    expect(movedLater(undefined, '2026-10-12')).toBe(false);
  });
});

describe('the story on the Gantt', () => {
  const tests = [step, fixDated, fixOpen];
  const items = [move, found];
  const plan = standing({ tests, items, assets: [], materials: [], programs: [], today: TODAY }).plan;
  const g = gantt(plan, { today: TODAY }, { tests, items });
  const row = g.groups.find(x => x.kind === 'install')!.rows[0];

  it('draws the overrun from the day after the first finish to the finish now', () => {
    expect(row.slip).toMatchObject({ days: 3, span: 3 });
    expect(g.dayList[row.slip!.start].iso).toBe('2026-10-10');
  });

  it('marks each day something happened on the stage', () => {
    expect(row.marks?.map(m => m.iso)).toEqual(['2026-10-06', '2026-10-07']);
  });

  it('hangs its fixes under it — dated, or open from the day booked — and not again among the Fixes', () => {
    expect(row.fixes?.map(f => [f.label, f.when, !!f.open])).toEqual([['Order spare guard', 'no date agreed', true], ['Remake brackets', '8 Oct', false]]);
    expect(g.groups.find(x => x.kind === 'fix')).toBeUndefined();
  });

  it('draws nothing extra without the records', () => {
    const bare = gantt(plan, { today: TODAY });
    const r = bare.groups.find(x => x.kind === 'install')!.rows[0];
    expect(r.slip).toBeUndefined();
    expect(bare.groups.find(x => x.kind === 'fix')?.rows.length).toBe(1);   // the dated fix, on its own
  });
});
