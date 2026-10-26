import { describe, expect, it } from 'vitest';
import { blockers, lookAhead, nowMachine, nowSays, owedFirst } from '../now';
import type { ProjectAction } from '../../../lib/projectActions';
import type { JobItem } from '../../../lib/portfolio';
import type { ProgramsReading, ProgramLine } from '../../../lib/programsReport';

const act = (key: string, o: Partial<ProjectAction> = {}): ProjectAction => ({ key, kind: 'Action', what: key, who: '', late: false, soon: false, ...o });
const item = (id: string, o: Partial<JobItem> = {}): JobItem => ({ jobId: 'j', job: 'J', color: '', kind: 'test', id, what: id, who: '', late: false, ...o } as JobItem);
const line = (assetId: string, what: string, bucket: ProgramLine['bucket'], word = bucket): ProgramLine => ({ machine: 'M', assetId, what, word, tone: 'n', bucket, earlier: [] } as unknown as ProgramLine);
const reading = (lines: ProgramLine[]) => ({ lines } as unknown as ProgramsReading);

describe('Now', () => {
  it('looks ahead today and the next two weeks', () => {
    expect(lookAhead('2026-10-26')).toEqual({ from: '2026-10-26', to: '2026-11-09' });
  });

  it('a machine says its gate, its programs worst first, what it owes and what is next', () => {
    const m = nowMachine({ id: 'a1', name: ' Wrapper ' }, { short: 'Commission' },
      [{ label: 'Install', tone: 'done' }, { label: 'Commission', tone: 'going' }],
      reading([line('a1', 'Program 4', 'done'), line('a1', 'Program 5', 'failed'), line('a1', 'Program 6', 'open'), line('b', 'Other', 'failed')]),
      [item('t1', { on: '2026-10-29', what: 'Program 5 retest' }), item('t2', { on: '2026-10-27', what: 'Guard check', late: false }), item('t9', { on: '2026-10-20' })],
      [{ id: 't1', assetId: 'a1' }, { id: 't2', assetId: 'a1' }, { id: 't9', assetId: 'b' }]);
    expect(m.name).toBe('Wrapper');
    expect(m.gate).toBe('Commission');
    expect(m.gateTone).toBe('w');
    expect(m.programs).toBe('1 of 3 passed · 1 didn’t pass');
    expect(m.programsTone).toBe('r');
    expect(m.worstProgram).toBe('FAILED Program 5');
    expect(m.open).toBe(2);
    expect(m.next).toEqual({ what: 'Guard check', on: '2026-10-27', late: false });
  });

  it('a machine with every program passed and nothing owed says so', () => {
    const m = nowMachine({ id: 'a1', name: 'Packer' }, { short: 'Handed over' }, [], reading([line('a1', 'P1', 'done')]), [], []);
    expect(m.gateTone).toBe('g');
    expect(m.programs).toBe('1 of 1 passed');
    expect(m.worstProgram).toBeUndefined();
    expect(m.open).toBe(0);
    expect(m.next).toBeUndefined();
  });

  it('a machine not on site yet is grey and has no programs line', () => {
    const m = nowMachine({ id: 'a1', name: 'Checkweigher' }, { short: 'Due on site' }, [], undefined, [], []);
    expect(m.gateTone).toBe('n');
    expect(m.programs).toBeUndefined();
  });

  it('only the critical block handover; the rest are owed, late first', () => {
    const rows = [act('crit', { priority: 'critical' }), act('high', { priority: 'high', due: '2026-11-02' }),
      act('late', { late: true, due: '2026-10-20' }), act('soon', { soon: true, due: '2026-10-28' }), act('none')];
    expect(blockers(rows).map(a => a.key)).toEqual(['crit']);
    expect(owedFirst(rows).shown.map(a => a.key)).toEqual(['late', 'soon', 'high', 'none']);
    expect(owedFirst(rows, 2)).toMatchObject({ more: 2 });
  });

  it('the sentence says the machines, what blocks and what is late', () => {
    const ms = [{ gate: 'Handed over' }, { gate: 'Commission' }] as unknown as Parameters<typeof nowSays>[0];
    expect(nowSays(ms, [act('c', { priority: 'critical' })], [act('l', { late: true })]))
      .toBe('2 machines, 1 handed over · 1 critical problem blocking handover · 1 thing late.');
    expect(nowSays([], [], [])).toBe('No machines yet · nothing critical blocking handover · nothing late.');
  });
});
