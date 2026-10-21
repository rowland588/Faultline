import { describe, expect, it } from 'vitest';
import { actionTiles, actionsClosing, byDate, byPerson, byWhere, personKey, projectActions, type RegisterProblem } from '../projectActions';
import type { JobItem } from '../portfolio';

/* A PROJECT'S ACTIONS (docs/PROJECTS.md, P3): every thing it owes, read the
   way its Needs you reads it, and the register's problems taken for it —
   who is doing what, why, where, by when. */
const TODAY = '2026-10-21';
const owed = (o: Partial<JobItem>): JobItem => ({ jobId: 'p1', job: 'Line 2 commissioning', color: '#000', kind: 'fix', what: 'A fix', who: '', late: false, ...o });
const OWED: JobItem[] = [
  owed({ kind: 'fix', id: 'f1', what: 'Re-shim the infeed', who: 'Priya Shah', on: '2026-10-18', late: true }),
  owed({ kind: 'install', id: 's1', part: 'n1', what: 'Programs loaded — Tesco 1.25 kg (Ilapak flow wrapper)', who: 'priya shah ', on: '2026-10-23', late: false }),
  owed({ kind: 'material', what: 'Film reels', who: 'Ilapak UK', on: '2026-11-04', late: false }),
  owed({ kind: 'test', id: 't1', what: 'Emergency stops', who: '' }),
  owed({ kind: 'install', id: 'c1', what: 'Guard interlock fails open', who: 'Lee', late: false,
    critical: { where: 'Ilapak flow wrapper · Positioned and levelled', impact: 'The line cannot restart on the agreed day', state: 'open' } }),
];
const REGISTER: RegisterProblem[] = [
  { id: 'sn1', problem: 'Coder misprints the date', priority: 'high', owner: 'Tanya', dueAt: new Date(2026, 9, 20).getTime(), status: 'open', projectId: 'p1', line: 'Line 2' },
  { id: 'sn2', problem: 'Sent to the project already', status: 'open', projectId: 'p1', sent: [{ projectId: 'p1' }] },
  { id: 'sn3', problem: 'Another project’s', status: 'open', projectId: 'p2' },
  { id: 'sn4', problem: 'Closed', status: 'closed', projectId: 'p1' },
];

describe('a project’s actions', () => {
  const rows = projectActions(OWED, REGISTER, 'p1', TODAY);

  it('every thing owed and every problem taken for the project, the critical first, then late, then by day', () => {
    expect(rows.map(r => r.what)).toEqual([
      'Guard interlock fails open', 'Re-shim the infeed', 'Coder misprints the date',
      'Programs loaded — Tesco 1.25 kg (Ilapak flow wrapper)', 'Film reels', 'Emergency stops',
    ]);
    /* the register's: not one already on the project, another project's or a closed one */
    expect(rows.filter(r => r.snagId).map(r => r.snagId)).toEqual(['sn1']);
  });

  it('says what, why, where, who, when and its priority — late as the record says it', () => {
    const crit = rows[0];
    expect(crit).toMatchObject({ kind: 'Critical', priority: 'critical', why: 'The line cannot restart on the agreed day', where: 'Ilapak flow wrapper · Positioned and levelled', who: 'Lee' });
    expect(rows[1]).toMatchObject({ kind: 'Fix', late: true, due: '2026-10-18' });
    expect(rows[2]).toMatchObject({ kind: 'Problem', priority: 'high', where: 'Line 2', who: 'Tanya', due: '2026-10-20', late: true });
    expect(rows[3]).toMatchObject({ kind: 'Part of the plan', soon: true, late: false });
    expect(rows[5]).toMatchObject({ who: '', late: false, soon: false });
    expect(rows[5].due).toBeUndefined();
  });

  it('groups by person however the name was typed, nobody last; by when; by where', () => {
    const people = byPerson(rows);
    expect(people.map(g => [g.label, g.rows.length, g.late])).toEqual([
      ['Priya Shah', 2, 1], ['Tanya', 1, 1], ['Ilapak UK', 1, 0], ['Lee', 1, 0], ['Nobody yet', 1, 0],
    ]);
    expect(personKey('  Priya   SHAH ')).toBe('priya shah');
    expect(byDate(rows, TODAY).map(g => [g.label, g.rows.length])).toEqual([
      ['Late', 2], ['Due in the next 7 days', 1], ['Later', 1], ['No date agreed', 2],
    ]);
    expect(byWhere(rows).map(g => g.label)).toEqual(['Line 2', 'Ilapak flow wrapper · Positioned and levelled', 'The project as a whole']);
  });

  it('counts the tiles — only the abnormal in colour — and says the closing line', () => {
    const tiles = actionTiles(rows, [{ what: 'x', on: '2026-10-19' }, { what: 'y', on: '2026-10-01' }], TODAY);
    expect(tiles.map(t => [t.k, t.v, t.of, t.tone])).toEqual([
      ['Open', '6', '1 critical', 'r'],
      ['Late', '2', 'past the day agreed', 'r'],
      ['This week', '1', 'due in the next 7 days', undefined],
      ['Nobody yet', '1', 'with no one named', 'a'],
      ['No date', '2', 'with no day agreed', 'a'],
      ['Done this week', '1', 'in the last 7 days', 'g'],
    ]);
    expect(actionsClosing(rows)).toEqual({ text: '6 open, 2 late — Priya Shah has 1; 1 with no one named.', tone: 'r' });
    expect(actionsClosing([])).toEqual({ text: 'Nothing owed on the project.', tone: 'g' });
  });
});
