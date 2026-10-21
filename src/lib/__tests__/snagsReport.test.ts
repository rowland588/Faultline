/* THE SNAGS PAGE AND ITS REPORT — one reading (lib/snagsReport). Every snag
 * on every line, however it was taken, says where it came from; a moved one is
 * followed to its job and says what it became and how it stands there. */
import { describe, it, expect } from 'vitest';
import { becameOn, fromWords, jobGroup, jobOnLine, snagRow, snagsReading, type Became, type JobGroup } from '../snagsReport';
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

  it('every snag on its line, late first; a moved one shown once, as what it became under its job; one whose record is gone said so', () => {
    const became = new Map<string, Became>([['i1', { projectId: 'j1', says: 'a fix — due tomorrow · 13 Oct', tone: 'a', open: true, open_: { kind: 'record', id: 'f1' } }]]);
    const job: JobGroup = { projectId: 'j1', job: 'Wrapper install', problemsOpen: 1, fixesToDo: 1, late: 0, done: 0, rows: [
      { kind: 'fix', id: 'f1', projectId: 'j1', what: 'Infeed jam', where: 'The line · not from a test', word: 'Due tomorrow · 13 Oct', tone: 'a', open: true, late: false, fromSnag: 'a problem on Line 7', priority: 'low', at: 1 },
      { kind: 'problem', id: 'p9', projectId: 'j1', what: 'Guard missing', where: 'Bagger — Install', word: 'Open', tone: 'a', open: true, late: false, priority: 'low', at: 2 },
    ] };
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
      lineName: id => lines[id] ?? 'A line', jobName: id => (id ? jobs[id] : undefined), became, jobs: [job],
    });
    expect(r.lines.map(l => [l.name, l.rows.map(x => x.id)])).toEqual([['Line 7', ['b', 'a']], ['Line 8', ['c']]]);
    const b = r.lines[0].rows[0];
    expect([b.word, b.tone, b.due, b.dueTone, b.late, b.owner]).toEqual(['In progress · 2 days', 'w', '3 days late', 'r', true, 'Sam']);
    expect([r.lines[1].rows[0].word, r.lines[1].rows[0].tone]).toEqual(['Closed 10 Oct', 'g']);
    /* the moved one is the fix under its job; only the gone one is listed on its own */
    expect(r.jobs.map(g => [g.job, g.rows.map(x => [x.kind, x.what, x.fromSnag ?? ''])])).toEqual([['Wrapper install', [['fix', 'Infeed jam', 'a problem on Line 7'], ['problem', 'Guard missing', '']]]]);
    expect(r.moved.map(g => [g.job, g.rows.map(x => [x.id, x.says])])).toEqual([['Wrapper install', [['e', 'no longer on the project — deleted there']]]]);
    expect(r.counts).toEqual({ open: 1, in_progress: 1, closed: 1, late: 1, moved: 2, movedOpen: 1, lines: 2, problems: 1, fixes: 1, jobLate: 0, jobDone: 0, jobs: 1, critical: 0, high: 0, low: 4 });
    expect(r.says).toBe('4 problems open — 0 critical, 0 high, 4 low; 1 late. 2 on 1 line, not on a project yet; 2 on 1 project, 1 being fixed. 1 problem moved to a project and no longer there.');
    /* a problem made critical goes first on its line, and the counts say so */
    const p = snagsReading({ today: NOW, snags: [snag({ id: 'a', problem: 'Guard loose', raisedAt: NOW - DAY }), snag({ id: 'b', problem: 'Seal jaw marks', dueAt: new Date(2026, 9, 9).getTime() }), snag({ id: 'z', problem: 'Film tears', priority: 'critical' }), snag({ id: 'y', problem: 'Coder smudge', priority: 'high' })],
      lineName: id => lines[id] ?? 'A line', jobName: () => undefined, became: new Map() });
    expect(p.lines[0].rows.map(x => [x.id, x.priority])).toEqual([['z', 'critical'], ['y', 'high'], ['b', 'low'], ['a', 'low']]);
    expect([p.counts.critical, p.counts.high, p.counts.low]).toEqual([1, 1, 2]);
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
  it('a job\'s problems in order of priority — late first within each — a fix shown under the problem it puts right, then done', () => {
    const tests = [
      { id: 's1', projectId: 'j1', kind: 'install', title: 'Install', assetId: 'm1', outcome: 'planned', sort: 1, createdAt: 1, updatedAt: 1 },
      { id: 'f1', projectId: 'j1', kind: 'fix', title: 'Fit new guard', assetId: 'm1', outcome: 'planned', plannedFor: '2026-10-08', withWhom: 'Dave', sort: 2, createdAt: 2, updatedAt: 2 },
      { id: 'f2', projectId: 'j1', kind: 'fix', title: 'Re-track the film', outcome: 'passed', ranOn: '2026-10-11', sort: 3, createdAt: 3, updatedAt: 3 },
    ] as unknown as Test[];
    const items = [
      { id: 'i1', projectId: 'j1', testId: 'f1', kind: 'found', what: 'Guard loose', becameTestId: 'f1', createdAt: 4, updatedAt: 4 },
      { id: 'i2', projectId: 'j1', testId: 's1', kind: 'found', what: 'Seal marks', critical: true, createdAt: 5, updatedAt: 5 },
      { id: 'i3', projectId: 'j1', testId: 's1', kind: 'found', what: 'Label skew', createdAt: 6, updatedAt: 6 },
    ] as unknown as TestItem[];
    const assets = [{ id: 'm1', projectId: 'j1', name: 'Bagger' }] as unknown as Asset[];
    const sn = snag({ id: 'q', problem: 'Guard loose', sent: [{ projectId: 'j1', itemId: 'i1', at: 1 }] });
    const g = jobGroup({ projectId: 'j1', job: 'Wrapper install', tests, items, assets, snags: [sn], lineName: id => lines[id] ?? 'A line', today: '2026-10-12' });
    expect(g.rows.map(r => [r.kind, r.priority, r.what, r.fixWhat ?? '', r.word, r.tone, r.open, r.late, r.fromSnag ?? ''])).toEqual([
      ['problem', 'critical', 'Seal marks', '', 'Open — critical', 'r', true, false, ''],
      ['fix', 'low', 'Guard loose', 'Fit new guard', 'Late · was 8 Oct', 'r', true, true, 'a problem on Line 7'],
      ['problem', 'low', 'Label skew', '', 'Open', 'a', true, false, ''],
      ['fix', 'low', 'Re-track the film', '', 'Fixed · 11 Oct', 'g', false, false, ''],
    ]);
    expect([g.problemsOpen, g.fixesToDo, g.late, g.done]).toEqual([2, 1, 1, 1]);
    expect(g.rows[1].where).toBe('Bagger · not from a test');
  });

  /* FLOW-AUDIT #2: "the 6M problems are on no line page and in no register"; and #13, one taken there from the register */
  it('a 6M job\'s problems are rows, each where it is on its way; one taken from the register says where it was seen first, and the register problem says where it went', () => {
    const sn = snag({ id: 'q', problem: 'Checkweigher rejects good packs', status: 'closed', closedAt: NOW, caseId: 'c1', projectId: 'p6' });
    const g = jobGroup({ projectId: 'p6', job: 'Line 7 pace', tests: [], items: [], assets: [], snags: [sn], lineName: id => lines[id] ?? 'A line', today: '2026-10-12',
      cases: [
        { id: 'c1', title: 'Checkweigher rejects good packs', open: true, phase: 'finding', openedAt: 3, workspaceId: 'l7', jobLineId: 'pl7', fromSnagId: 'q' },
        { id: 'c2', title: 'Basketer minor stops', open: true, phase: 'acting', openedAt: 2, workspaceId: 'l8' },
        { id: 'c3', title: 'Below its rate target', open: false, phase: 'holding', openedAt: 1, workspaceId: 'l8' },
      ] });
    expect(g.rows.map(r => [r.kind, r.what, r.where, r.word, r.tone, r.open, r.late, r.fromSnag ?? '', r.jobLineId ?? ''])).toEqual([
      ['case', 'Checkweigher rejects good packs', 'Line 7 · on its fishbone', 'Finding the cause', 'w', true, false, 'a problem on Line 7', 'pl7'],
      ['case', 'Basketer minor stops', 'Line 8 · on its fishbone', 'Acting on it', 'w', true, false, '', ''],
      ['case', 'Below its rate target', 'Line 8 · on its fishbone', 'Holding', 'g', false, false, '', ''],
    ]);
    expect([g.problemsOpen, g.casesOpen, g.fixesToDo, g.done]).toEqual([0, 2, 0, 1]);
    const r = snagsReading({ snags: [], lineName: id => lines[id] ?? 'A line', jobName: () => undefined, became: new Map(), register: true, jobs: [g], today: NOW });
    expect([r.counts.problems, r.counts.jobs, r.counts.low]).toEqual([2, 1, 2]);
    const row = snagRow(sn, 'Line 7', undefined, 'Line 7 pace', NOW);
    expect([row.word, row.tone]).toEqual(['Taken to 6M on Line 7 pace', 'w']);
  });

  /* FLOW-AUDIT #2: "filtering the register by line drops every job problem" */
  it('a job\'s records on one line: a job on that line only keeps everything; a job on two keeps what is on this one and what says no line', () => {
    const jobLines = [
      { id: 'a', projectId: 'one', workspaceId: 'l7' }, { id: 'b', projectId: 'one', workspaceId: 'l7' },
      { id: 'c', projectId: 'two', workspaceId: 'l7' }, { id: 'd', projectId: 'two', workspaceId: 'l8' },
    ];
    const assets = [{ id: 'm7', projectId: 'two', name: 'Bagger', workspaceId: 'l7' }, { id: 'm8', projectId: 'two', name: 'Basketer', workspaceId: 'l8' }] as unknown as Asset[];
    const tests = [{ id: 't7', assetId: 'm7' }, { id: 't8', assetId: 'm8' }, { id: 'tx' }] as unknown as Test[];
    const items = [{ id: 'i7', testId: 't7' }, { id: 'i8', testId: 't8' }, { id: 'ij', testId: '' }] as unknown as TestItem[];
    const todos = [{ id: 'a7', lineId: 'c' }, { id: 'a8', lineId: 'd' }, { id: 'ax' }] as never[];
    const cases = [{ id: 'c7', title: '', open: true, phase: 'finding' as const, openedAt: 1, workspaceId: 'l7' }, { id: 'c8', title: '', open: true, phase: 'finding' as const, openedAt: 1, workspaceId: 'l8' }];
    const d = { tests, items, assets, todos, cases };
    expect(jobOnLine(d, 'one', 'l7', jobLines)).toBe(d);
    expect(jobOnLine(d, 'one', 'l8', jobLines)).toBeUndefined();
    const on7 = jobOnLine(d, 'two', 'l7', jobLines);
    expect([on7?.assets.map(x => x.id), on7?.tests.map(x => x.id), on7?.items.map(x => x.id), on7?.todos.map((x: { id: string }) => x.id), on7?.cases.map(x => x.id)])
      .toEqual([['m7'], ['t7', 'tx'], ['i7', 'ij'], ['a7', 'ax'], ['c7']]);
  });
});
