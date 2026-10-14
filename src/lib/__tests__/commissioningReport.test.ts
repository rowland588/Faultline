/* THE COMMISSIONING REPORT (lib/commissioningReport; Rowland, 14 October:
 * "make sure we have a fully functional commissioning report ... where we got
 * to, the problems ... commissioning cards ... I can present in the meeting
 * or send"). One job, run through the real client and handover readings —
 * the report works nothing out twice, so it is read here as they read it. */
import { describe, expect, it } from 'vitest';
import { clientReport, type ClientReportInput } from '../clientReport';
import { handoverReport } from '../handoverReport';
import { commissioningReport } from '../commissioningReport';
import { commissionPrograms } from '../commissionPrograms';
import type { Asset, Test } from '../testing';
import type { Program } from '../programs';
import type { Snag } from '../../snag/types';
import type { Project } from '../../types';
import { niceDay } from '../weeks';

const d = (iso: string) => niceDay(iso, { weekday: 'short' });

const T = '2026-10-14';
const project = { id: 'p', name: 'Line 2 commissioning', color: '#2b87d4', lead: 'Rowland', commissioning: true, plannedAt: '2026-11-02', expectedAt: '2026-11-02', createdAt: 1, updatedAt: 1 } as Project;
const asset = (id: string, name: string, sort: number) => ({ id, projectId: 'p', name, state: 'installed', sort, createdAt: 1, updatedAt: 1 }) as unknown as Asset;
const test = (o: Partial<Test> & { id: string; title: string }): Test => ({ projectId: 'p', kind: 'test', outcome: 'planned', sort: 1, createdAt: 1, updatedAt: 1, ...o });
const prog = (id: string, what: string, extra: Partial<Program> = {}) => ({ id, projectId: 'p', what, state: 'onMachine', sort: 10, createdAt: 1, updatedAt: 1, ...extra }) as Program;

const assets = [asset('w', 'Ilapak flow wrapper', 1), asset('k', 'Ishida checkweigher', 2), asset('c', 'Domino coder', 3)];
const base: Test[] = [
  test({ id: 't1', title: 'Emergency stops', assetId: 'w', outcome: 'passed', ranOn: '2026-10-05', sort: 1 }),
  test({ id: 't2', title: 'Seal integrity', assetId: 'w', outcome: 'failed', ranOn: '2026-10-10', result: '3 leaks in 20 packs', passesIf: '0 leaks in 20 packs', sort: 2 }),
  /* a block begun: under way to 16 Oct */
  test({ id: 't3', title: 'Performance run', assetId: 'w', plannedFor: '2026-10-13', plannedTo: '2026-10-16', sort: 3 }),
  test({ id: 't4', title: 'Weight accuracy', assetId: 'k', outcome: 'passed', ranOn: '2026-10-12', sort: 4 }),
  test({ id: 't5', title: 'Reject bin full', assetId: 'k', plannedFor: '2026-10-20', withWhom: 'Ishida Europe', sort: 5 }),
  /* a fix on the wrapper, due in two days */
  test({ id: 'f1', kind: 'fix', title: 'Fit the upgraded jaw heater', assetId: 'w', plannedFor: '2026-10-16', withWhom: 'Ilapak UK', passesIf: 'Seal jaw temperature drifts', sort: 6 }),
];
const programs = [prog('p1', 'PR-04 Finest Red', { assetId: 'w' })];
/* the line's own program, picked in Commission: its test is on the job */
const linePrograms = [{ name: 'Line 2', id: 'ws2', machines: [{ name: 'Ishida checkweigher', record: { ...assets[1], id: 'm-k', projectId: '' } as Asset }],
  programs: [prog('lp1', 'CW-1 Tesco 2kg', { projectId: '', assetId: 'm-k' })] }];
const assigned = [{ id: 'sn1', workspaceId: 'ws2', problem: 'Film tracks off the former', status: 'open', raisedAt: 1, updatedAt: 1, media: [], projectId: 'p', priority: 'high', owner: 'Priya' } as unknown as Snag];

const read = (tests: Test[]) => {
  const input: ClientReportInput = { project, projects: [project], assets, tests, items: [], materials: [], programs, standards: [], today: T, linePrograms, assigned, lineName: () => 'Line 2' };
  return commissioningReport({ client: clientReport(input), handover: handoverReport({ ...input, project }), assets, tests, today: T,
    programs: commissionPrograms(programs, linePrograms, assets, tests) });
};
const withLineTest = [...base, test({ id: 't6', title: 'Prove program CW-1 Tesco 2kg', assetId: 'k', programId: 'lp1', plannedFor: '2026-10-21', sort: 7 })];

describe('where we are', () => {
  const r = read(withLineTest);
  it('the gate’s count as Commission says it, and the handover day', () => {
    expect(r.says).toBe('2 of 6 passed · 1 didn’t pass');
    expect(r.dates).toBe(`Handover agreed ${d('2026-11-02')}`);
  });
  it('every machine with its word: behind, under way, not started', () => {
    expect(r.machines.map(m => [m.name, m.verdict.word, m.verdict.tone])).toEqual([
      ['Ilapak flow wrapper', 'Behind — 1 didn’t pass', 'r'],
      ['Ishida checkweigher', 'Under way', 'w'],
      ['Domino coder', 'Not started — no tests planned', 'n'],
    ]);
    expect(r.machinesSaid).toBe('1 under way · 1 behind · 1 not started');
  });
  it('a machine’s tests in a line, and its next — a block begun said under way', () => {
    const w = r.machines[0];
    expect(w.testsSaid).toBe('1 of 3 passed · 1 didn’t pass · 1 booked');
    expect(w.next).toBe(`Performance run — under way, to ${d('2026-10-16')}`);
    expect(r.machines[1].next).toBe(`Reject bin full — booked ${d('2026-10-20')}`);
  });
  it('a line’s program picked in Commission is counted on its machine, as the board counts it', () => {
    expect(r.machines[1].programs).toBe('1 program · 1 being tested');
    expect(read(base).machines[1].programs).toBeUndefined();
  });
});

describe('why, and what we are doing about it', () => {
  const r = read(withLineTest);
  it('why: the test that did not pass, with what was seen — only the abnormal', () => {
    expect(r.why).toEqual([{ text: `Ilapak flow wrapper: Seal integrity — didn’t pass, ${niceDay('2026-10-10')}`, meta: 'Seen: 3 leaks in 20 packs', tone: 'r' }]);
  });
  it('doing: the fix with its machine, its problem and who; the problem taken for the job', () => {
    expect(r.doing[0].text).toBe('Fix: Fit the upgraded jaw heater');
    expect(r.doing[0].meta).toMatch(/^Ilapak flow wrapper · for Seal jaw temperature drifts · Ilapak UK · /);
    expect(r.doing[1]).toMatchObject({ text: 'Problem (high): Film tracks off the former', tone: 'a' });
  });
  it('booked next, in day order, a block begun said on now', () => {
    expect(r.booked.map(b => b.text)).toEqual([
      `On now, to ${d('2026-10-16')} — Ilapak flow wrapper: Performance run`,
      `${d('2026-10-20')} — Ishida checkweigher: Reject bin full`,
      `${d('2026-10-21')} — Ishida checkweigher: Prove program CW-1 Tesco 2kg`,
    ]);
  });
});

describe('a change moves it', () => {
  it('the seal passed on its re-test: the wrapper no longer behind, nothing in why', () => {
    const r = read([...withLineTest, test({ id: 't2b', title: 'Seal integrity — re-test', assetId: 'w', fromTestId: 't2', outcome: 'passed', ranOn: T, sort: 8 })]);
    expect(r.machines[0].verdict).toEqual({ word: 'Under way', tone: 'w' });
    expect(r.why).toEqual([]);
    expect(r.says).toBe('3 of 6 passed');
  });
});
