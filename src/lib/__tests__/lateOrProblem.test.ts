/* LATE, OR A PROBLEM — WHICH ONE. Rowland, 6 October: "The plan sees all
 * problems and states 'problem or late' — but we should know which one ...
 * if hours are lost = late. If no hours added then just a problem." */
import { describe, expect, it } from 'vitest';
import { lateOrProblem } from '../install';
import { badWords, gantt, withMachines } from '../gantt';
import { standing } from '../standing';
import type { Asset, Test, TestItem } from '../testing';

const TODAY = '2026-10-06';
let n = 0;
const step = (o: Partial<Test> & { title: string }): Test =>
  ({ id: `s${++n}`, projectId: 'p', kind: 'install', outcome: 'planned', sort: n, createdAt: 1, updatedAt: 1, ...o });
const found = (testId: string, hoursLost?: number): TestItem =>
  ({ id: `i${++n}`, projectId: 'p', testId, kind: 'found', what: 'Guard bracket wrong', sort: n, createdAt: n, updatedAt: 1, ...(hoursLost ? { hoursLost } : {}) });

describe('late or a problem', () => {
  const lost = step({ title: 'Guards fitted', plannedFor: '2026-10-05', plannedTo: '2026-10-09', ranOn: '2026-10-06', outcome: 'failed' });
  const none = step({ title: 'Air connected', plannedFor: '2026-10-12', plannedTo: '2026-10-14', ranOn: '2026-10-06', outcome: 'failed' });
  const gone = step({ title: 'Levelled', plannedFor: '2026-10-01', ranOn: '2026-10-01', outcome: 'failed' });
  const done = step({ title: 'Positioned', plannedFor: '2026-10-02', ranOn: '2026-10-02', outcome: 'passed' });
  const behind = step({ title: 'Power on', plannedFor: '2026-10-02' });
  const test = step({ title: 'Seal test', kind: 'test', plannedFor: '2026-10-07', ranOn: '2026-10-06', outcome: 'failed' });
  const items = [found(lost.id, 2), found(none.id), found(gone.id), found(done.id, 3)];

  it('hours lost is late', () => expect(lateOrProblem(lost, items, TODAY)).toBe('late'));
  it('no hours lost, its day still to come, is a problem', () => expect(lateOrProblem(none, items, TODAY)).toBe('problem'));
  it('past its day is late, hours or not', () => {
    expect(lateOrProblem(gone, items, TODAY)).toBe('late');
    expect(lateOrProblem(behind, items, TODAY)).toBe('late');
  });
  it('done is done, whatever its problems cost', () => expect(lateOrProblem(done, items, TODAY)).toBe('done'));
  it('leaves a test to its own "didn’t pass"', () => expect(lateOrProblem(test, items, TODAY)).toBeUndefined());

  it('draws them red and amber on the plan, and says which in the band header', () => {
    const a: Asset = { id: 'm1', projectId: 'p', name: 'Case packer', state: 'onSite', onSiteOn: '2026-09-30', sort: 1, updatedAt: 1 };
    const tests = [lost, none, gone, done, test].map(t => ({ ...t, assetId: a.id }));
    const s = standing({ tests, items, assets: [a], materials: [], programs: [], today: TODAY });
    const g = withMachines(gantt(s.plan, { today: TODAY }, { tests, items }), { assets: [a], tests, items, today: TODAY });
    const rows = g.groups.flatMap(gr => gr.rows);
    const tone = (id: string) => rows.find(r => r.id === id)!.tone;
    expect([tone(lost.id), tone(none.id), tone(gone.id), tone(done.id), tone(test.id)]).toEqual(['late', 'problem', 'late', 'done', 'failed']);
    expect(rows.find(r => r.id === lost.id)!.says).toBe('late — 2 h lost');
    expect(rows.find(r => r.id === none.id)!.says).toBe('a problem — no time lost');
    const band = g.machines![0];
    expect(band.says).toMatch(/2 late · 1 a problem · 1 didn’t pass$/);
    expect(band.tone).toBe('late');
    expect(band.bar!.segs.some(sg => sg.tone === 'problem')).toBe(true);
    expect(badWords([{ tone: 'problem' }])).toBe('1 a problem');
  });
});
