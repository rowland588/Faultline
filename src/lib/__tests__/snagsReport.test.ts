/* THE SNAGS PAGE AND ITS REPORT — one reading (lib/snagsReport). Every snag
 * on every line, however it was taken, says where it came from; a moved one is
 * followed to its job and says what it became and how it stands there. */
import { describe, it, expect } from 'vitest';
import { becameOn, fromWords, snagsReading, type Became } from '../snagsReport';
import type { Snag } from '../../snag/types';
import type { Asset, Test, TestItem } from '../testing';

const DAY = 86_400_000;
const NOW = new Date(2026, 9, 12, 10).getTime();
const snag = (p: Partial<Snag>): Snag => ({ id: 'x', workspaceId: 'l7', problem: 'Film wandering', status: 'open', raisedAt: NOW - 2 * DAY, updatedAt: NOW, media: [], ...p });
const lines: Record<string, string> = { l7: 'Line 7', l8: 'Line 8' };
const jobs: Record<string, string> = { j1: 'Wrapper install' };

describe('the snags reading', () => {
  it('says where each came from: on the move, pinned on the walk, or raised from the board', () => {
    expect(fromWords(snag({ targetAsset: 'Bagger' }))).toBe('Taken on the move — Bagger');
    expect(fromWords(snag({ assetId: 'a1', xPct: 40, yPct: 20, media: undefined }), 'Filler')).toBe('From the walk — on the Filler');
    expect(fromWords(snag({ media: undefined, targetCategory: 'Changeover', targetSubcategory: 'Size change' }))).toBe('From the board — Changeover · Size change');
  });

  it('every snag on its line, late first; the moved ones followed to their job, open there first', () => {
    const became = new Map<string, Became>([['i1', { projectId: 'j1', says: 'a fix — due tomorrow · 13 Oct', tone: 'a', open: true, open_: { kind: 'record', id: 'f1' } }]]);
    const r = snagsReading({
      today: NOW,
      snags: [
        snag({ id: 'a', problem: 'Guard loose', raisedAt: NOW - 1 * DAY }),
        snag({ id: 'b', problem: 'Seal jaw marks', dueAt: new Date(2026, 9, 9).getTime(), owner: 'Sam', status: 'in_progress' }),
        snag({ id: 'c', workspaceId: 'l8', problem: 'Label skew', status: 'closed', closedAt: new Date(2026, 9, 10, 9).getTime() }),
        snag({ id: 'd', problem: 'Infeed jam', sent: [{ projectId: 'j1', itemId: 'i1', at: NOW - DAY }] }),
        snag({ id: 'e', problem: 'Gone fix', sent: [{ projectId: 'j1', itemId: 'zz', at: NOW - 3 * DAY }] }),
        snag({ id: 'f', problem: 'Deleted', deletedAt: NOW }),
      ],
      lineName: id => lines[id] ?? 'A line', jobName: id => (id ? jobs[id] : undefined), became,
    });
    expect(r.lines.map(l => [l.name, l.rows.map(x => x.id)])).toEqual([['Line 7', ['b', 'a']], ['Line 8', ['c']]]);
    const b = r.lines[0].rows[0];
    expect([b.word, b.tone, b.due, b.dueTone, b.late, b.owner]).toEqual(['In progress · 2 days', 'w', '3 days late', 'r', true, 'Sam']);
    expect([r.lines[1].rows[0].word, r.lines[1].rows[0].tone]).toEqual(['Closed 10 Oct', 'g']);
    expect(r.moved.map(g => [g.job, g.rows.map(x => [x.id, x.says, x.open])])).toEqual([['Wrapper install', [['d', 'a fix — due tomorrow · 13 Oct', true], ['e', 'no longer on the job — deleted there', false]]]]);
    expect(r.counts).toEqual({ open: 1, in_progress: 1, closed: 1, late: 1, moved: 2, movedOpen: 1, lines: 2 });
    expect(r.says).toBe('3 snags on 2 lines — 1 open, 1 in progress, 1 closed; 1 late. 2 snags moved to 1 job, 1 still open there.');
  });

  it('reads what each moved snag became off the job: a fix by its tone, a problem on its stage, an action by its state', () => {
    const tests = [
      { id: 's1', projectId: 'j1', kind: 'install', title: 'Install', assetId: 'm1', outcome: 'planned', createdAt: 1, updatedAt: 1 },
      { id: 'f1', projectId: 'j1', kind: 'fix', title: 'Fit new guard', outcome: 'passed', ranOn: '2026-10-11', createdAt: 1, updatedAt: 1 },
    ] as unknown as Test[];
    const items = [
      { id: 'i1', projectId: 'j1', testId: 's1', kind: 'found', what: 'Guard loose', becameTestId: 'f1', createdAt: 1, updatedAt: 1 },
      { id: 'i2', projectId: 'j1', testId: 's1', kind: 'found', what: 'Seal marks', critical: true, createdAt: 1, updatedAt: 1 },
    ] as unknown as TestItem[];
    const assets = [{ id: 'm1', projectId: 'j1', name: 'Bagger' }] as unknown as Asset[];
    const m = becameOn('j1', tests, items, assets, [{ id: 't1', projectId: 'j1', what: 'Infeed jam', where: '', why: '', who: '', when: '', state: 'waiting', createdAt: 1, updatedAt: 1 }], '2026-10-12');
    expect([m.get('i1')?.says.startsWith('a fix — '), m.get('i1')?.tone, m.get('i1')?.open]).toEqual([true, 'g', false]);
    expect([m.get('i2')?.says, m.get('i2')?.tone, m.get('i2')?.open]).toEqual(['a problem on Bagger — Install — critical · open', 'r', true]);
    expect([m.get('t1')?.says, m.get('t1')?.tone, m.get('t1')?.open_]).toEqual(['an action on its board — waiting', 'a', { kind: 'action', id: 't1' }]);
  });
});
