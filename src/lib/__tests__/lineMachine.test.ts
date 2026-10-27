import { describe, expect, it } from 'vitest';
import { lineMachineView, STOP_DAYS } from '../lineMachine';
import type { Asset, Test } from '../testing';
import type { Program } from '../programs';
import type { Snag } from '../../snag/types';
import type { Observation } from '../../types';
import type { ToolStudy } from '../study';

const NOW = Date.UTC(2026, 9, 27, 12);
const DAY = 86_400_000;
const ws = { id: 'L1', name: 'Line 7', assets: ['Whole line', 'Flow wrapper', 'Checkweigher'] };
const rec: Asset = { id: 'm1', projectId: 'P', workspaceId: 'L1', name: 'Flow wrapper', oem: 'Ilapak', state: 'onSite', sort: 1, updatedAt: 1 };
const T = (id: string, o: Partial<Test>): Test => ({ id, projectId: 'P', title: id, assetId: 'm1', outcome: 'planned', sort: 1, createdAt: 1, updatedAt: 1, ...o } as Test);
const base = {
  ws, assets: [rec], jobLines: [{ id: 'jl', projectId: 'P', workspaceId: 'L1' }, { id: 'jq', projectId: 'Q', workspaceId: 'L1' }],
  jobs: [{ id: 'P', name: 'Line 7 commissioning' }, { id: 'Q', name: 'Seal upgrade' }],
  programs: [{ id: 'p1', projectId: '', workspaceId: 'L1', assetId: 'm1', what: 'PR-04 Finest Red', state: 'proved', provedOn: '2026-10-20', sort: 1, createdAt: 1, updatedAt: 1 } as Program,
    { id: 'p2', projectId: '', workspaceId: 'L1', what: 'Other machine', state: 'needed', sort: 2, createdAt: 1, updatedAt: 1 } as Program],
  tests: [T('t1', { outcome: 'passed', ranOn: '2026-10-21', title: 'Seal integrity' }), T('t2', { outcome: 'failed', ranOn: '2026-10-22', title: 'Guard check' }), T('t3', {}),
    T('q1', { projectId: 'Q', outcome: 'passed', ranOn: '2026-10-25', title: 'New jaws run' }), T('x', { assetId: 'other' })],
  snags: [
    { id: 's1', workspaceId: 'L1', targetAsset: 'flow  WRAPPER', problem: 'Film tracks off', status: 'closed', priority: 'high' },
    { id: 's2', workspaceId: 'L1', targetAsset: 'Flow wrapper', problem: 'Jaw heater slow', status: 'open', priority: 'critical' },
    { id: 's3', workspaceId: 'L1', targetAsset: 'Checkweigher', problem: 'Not this one', status: 'open' },
    { id: 's4', workspaceId: 'L1', targetAsset: 'Flow wrapper', problem: 'Put away', status: 'open', archivedAt: 1 },
  ] as unknown as Snag[],
  studies: [
    { id: 'st1', tool: 'reliability', name: 'Wrapper stops', workspaceId: 'L1', assetId: 'm1', startedAt: 2 },
    { id: 'st2', tool: 'capability', name: 'Seal strength', workspaceId: 'L1', machine: 'Flow Wrapper', startedAt: 3 },
    { id: 'st3', tool: 'capability', name: 'Weights', workspaceId: 'L1', machine: 'Checkweigher', startedAt: 4 },
  ] as unknown as ToolStudy[],
  stops: [
    { id: 'o1', workspaceId: 'L1', asset: 'Flow wrapper', startedAt: NOW - DAY, durationMs: 6 * 60_000, count: 1 },
    { id: 'o2', workspaceId: 'L1', asset: 'flow wrapper', startedAt: NOW - 2 * DAY, durationMs: 4 * 60_000, count: 3 },
    { id: 'o3', workspaceId: 'L1', asset: 'Flow wrapper', startedAt: NOW - (STOP_DAYS + 1) * DAY, durationMs: 60 * 60_000, count: 1 },
    { id: 'o4', workspaceId: 'L1', asset: 'Checkweigher', startedAt: NOW - DAY, durationMs: 60_000, count: 1 },
  ] as unknown as Observation[],
  now: NOW, today: '2026-10-27',
};

describe('a machine on its line — everything ever done to it', () => {
  it('says what it is, who has it, and everything done to it', () => {
    const v = lineMachineView(' flow wrapper ', base);
    expect(v?.name).toBe('Flow wrapper');
    expect(v?.oem).toBe('Ilapak');
    expect(v?.whose).toBe('With Line 7 commissioning');
    expect(v?.projects).toEqual([
      { id: 'P', name: 'Line 7 commissioning', tests: 3, open: 1, failed: 1, last: 'Guard check — didn’t pass', href: '/project/P' /* the project itself: its part for the machine is on the machine's one page (27 October) */ },
      { id: 'Q', name: 'Seal upgrade', tests: 1, open: 0, failed: 0, last: 'New jaws run — passed', href: '/project/Q' },
    ].map(x => expect.objectContaining({ id: x.id, name: x.name, tests: x.tests, open: x.open, failed: x.failed, href: x.href })));
    expect(v?.programs.map(p => p.what)).toEqual(['PR-04 Finest Red']);
    expect(v?.problems.map(p => [p.id, p.open, p.priority])).toEqual([['s2', true, 'critical'], ['s1', false, 'high']]);
    expect(v?.studies.map(s => s.id)).toEqual(['st2', 'st1']);
    expect(v?.stops).toEqual({ n: 4, minutes: 10 });
    expect(v?.says).toBe(`With Line 7 commissioning · worked on by 2 projects · 1 program · 1 problem open · 4 stops, 10 min in ${STOP_DAYS} days.`);
  });

  it('a name on the line with no record yet: the line\'s own, nothing done, said so', () => {
    const v = lineMachineView('Checkweigher', { ...base, snags: [], studies: [], stops: [] });
    expect(v?.record).toBeUndefined();
    expect(v?.whose).toBe("The line's own");
    expect(v?.projects).toEqual([]);
    expect(v?.programs).toEqual([]);
    expect(v?.says).toBe(`The line's own · no programs · no problem open · no stops timed in ${STOP_DAYS} days.`);
  });

  it('a machine the line does not have is no page', () => {
    expect(lineMachineView('Palletiser', base)).toBeUndefined();
    expect(lineMachineView('Whole line', base)).toBeUndefined();
  });
});
