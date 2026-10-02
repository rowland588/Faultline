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

import { followingOf, runsInto, overlapOf, keyOf, keyOfMark, moveLines, HANDOVER_KEY } from '../story';
import { portfolio } from '../portfolio';
import type { Project } from '../../types';

describe('the knock-on and the other dates', () => {
  const mk = (id: string, gate: 'install' | 'setup', from: string, to?: string, over: Partial<Test> = {}): Test => ({
    id, projectId: 'p', kind: 'install', gate: gate === 'install' ? undefined : gate, title: id, assetId: 'a', outcome: 'planned', plannedFor: from, plannedTo: to, sort: 1, createdAt: 1, updatedAt: 1, ...over,
  });
  const install = mk('Install', 'install', '2026-10-05', '2026-10-09');
  const setup = mk('Setup', 'setup', '2026-10-12', '2026-10-14');
  const handover = mk('Handover', 'setup', '2026-10-20');
  const other = { ...mk('Other machine', 'setup', '2026-10-10'), assetId: 'b' };
  const done = mk('Done one', 'setup', '2026-10-11', undefined, { outcome: 'passed' });
  const tests = [install, setup, handover, other, done];

  it('what follows a stage is every later, unfinished step on the same machine', () => {
    expect(followingOf(install, tests).map(t => t.id)).toEqual(['Setup', 'Handover']);
  });

  it('a later finish says what it now runs into', () => {
    const f = followingOf(install, tests);
    expect(runsInto(f, '2026-10-12').map(t => t.id)).toEqual(['Setup']);
    expect(runsInto(f, '2026-10-11')).toEqual([]);
  });

  it('flags a step that starts before the one ahead of it has finished', () => {
    const pushed = { ...install, plannedTo: '2026-10-13' };
    expect(overlapOf(setup, [pushed, setup, handover])?.id).toBe('Install');
    expect(overlapOf(setup, tests)).toBeUndefined();
  });

  it('files the other dates under keys that name them', () => {
    expect(keyOf('handover')).toBe(HANDOVER_KEY);
    expect(keyOf('machine', 'x')).toBe('asset:x');
    expect(keyOfMark('material', 'm')).toBe('material:m');
    expect(keyOfMark('install', 's')).toBe('s');
    expect(keyOfMark('note', 'n')).toBeUndefined();
  });

  it('prints the handover first, then the others, each with its reason', () => {
    const items: TestItem[] = [
      { id: 'h', projectId: 'p', testId: HANDOVER_KEY, kind: 'found', what: 'OEM engineer delayed', movedFrom: '2026-10-30', movedTo: '2026-11-03', sort: 1, createdAt: at('2026-10-02'), updatedAt: 1 },
      { id: 'm', projectId: 'p', testId: 'asset:w', kind: 'found', what: 'Shipping held at port', movedFrom: '2026-10-01', movedTo: '2026-10-04', sort: 2, createdAt: at('2026-10-01'), updatedAt: 1 },
    ];
    const lines = moveLines([{ id: 'w', label: 'Wrapper', key: 'asset:w' }], [], items);
    expect(lines.map(l => [l.stage, l.days, l.why])).toEqual([['Wrapper', 3, 'Shipping held at port'], ['Handover', 4, 'OEM engineer delayed']]);
  });

  it('draws a machine that arrived late as an overrun, and tells the plan when the handover moved', () => {
    const items: TestItem[] = [
      { id: 'h', projectId: 'p', testId: HANDOVER_KEY, kind: 'found', what: 'OEM engineer delayed', movedFrom: '2026-10-30', movedTo: '2026-11-03', sort: 1, createdAt: at('2026-10-02'), updatedAt: 1 },
      { id: 'm', projectId: 'p', testId: 'asset:w', kind: 'found', what: 'Shipping held', movedFrom: '2026-10-01', movedTo: '2026-10-04', sort: 2, createdAt: at('2026-10-01'), updatedAt: 1 },
    ];
    const g = gantt([{ id: 'w', kind: 'machine', at: '2026-10-04', label: 'Wrapper', tone: 'booked' }], { today: TODAY, expectedAt: '2026-11-03' }, { tests: [], items });
    const row = g.groups.find(x => x.kind === 'machine')!.rows[0];
    expect(row.key).toBe('asset:w');
    expect(row.slip?.days).toBe(3);
    expect(g.handoverMoves?.[0]).toMatchObject({ days: 4, why: 'OEM engineer delayed' });
  });

  it('puts fixes with no date agreed on Home, apart from what is due', () => {
    const project = { id: 'p', name: 'Line 2A', color: '#123', commissioning: true, createdAt: 1, updatedAt: 1 } as Project;
    const fixA: Test = { id: 'f1', projectId: 'p', kind: 'fix', title: 'Order guard', outcome: 'planned', sort: 1, createdAt: 1, updatedAt: 1, withWhom: 'Ilapak' };
    const fixB: Test = { id: 'f2', projectId: 'p', kind: 'fix', title: 'Dated fix', outcome: 'planned', plannedFor: '2026-10-05', sort: 2, createdAt: 1, updatedAt: 1 };
    const pf = portfolio([{ project, tests: [fixA, fixB], items: [], materials: [], programs: [], assets: [] }], TODAY);
    expect(pf.undated.map(x => [x.what, x.who])).toEqual([['Order guard', 'Ilapak']]);
  });
});
