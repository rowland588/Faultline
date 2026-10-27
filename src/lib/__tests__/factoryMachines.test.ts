import { describe, expect, it } from 'vitest';
import { factoryMachines, factoryMachinesPaper } from '../factoryMachines';
import type { Asset } from '../testing';
import type { Program } from '../programs';
import type { Snag } from '../../snag/types';
import type { Workspace } from '../../types';

const L1 = { id: 'L1', name: 'Line 2a', lineType: 'Packing', assets: ['Whole line', 'Flow wrapper', 'Checkweigher'] } as unknown as Workspace;
const L2 = { id: 'L2', name: 'Line 3', assets: ['Bagger'] } as unknown as Workspace;
const L3 = { id: 'L3', name: 'Line 9', assets: [] } as unknown as Workspace;
const wrapper: Asset = { id: 'm1', projectId: 'P', name: 'Flow wrapper', oem: 'Ilapak', state: 'onSite', sort: 1, updatedAt: 1 };
const base = {
  lines: [L1, L2, L3],
  assets: [wrapper],
  jobLines: [{ id: 'jl', projectId: 'P', workspaceId: 'L1' }],
  jobs: [{ id: 'P', name: 'Line 2 commissioning' }],
  programs: [
    { id: 'p1', projectId: 'P', assetId: 'm1', what: 'PR-04', state: 'proved', provedOn: '2026-10-20', sort: 1, createdAt: 1, updatedAt: 1 } as Program,
    { id: 'p2', projectId: 'P', assetId: 'm1', what: 'PR-12', state: 'needed', sort: 2, createdAt: 1, updatedAt: 1 } as Program,
  ],
  snags: [
    { id: 's1', workspaceId: 'L1', targetAsset: 'flow  WRAPPER', status: 'open', priority: 'critical' },
    { id: 's2', workspaceId: 'L1', targetAsset: 'Flow wrapper', status: 'closed', priority: 'high' },
    { id: 's3', workspaceId: 'L2', targetAsset: 'Bagger', status: 'open' },
    { id: 's4', workspaceId: 'L1', targetAsset: 'Flow wrapper', status: 'open', archivedAt: 1 },
  ] as unknown as Snag[],
};

describe('every machine in the factory, line by line', () => {
  const r = factoryMachines(base);
  it('each line in the order given, its machines in flow order, the whole line not a machine', () => {
    expect(r.groups.map(g => g.line.name)).toEqual(['Line 2a', 'Line 3', 'Line 9']);
    expect(r.groups[0].rows.map(x => [x.n, x.name])).toEqual([[1, 'Flow wrapper'], [2, 'Checkweigher']]);
    expect(r.groups[2].rows).toEqual([]);
  });
  it('a machine says who made it, its project, its programs proved of planned and its open problems — by its name in any case', () => {
    expect(r.groups[0].rows[0]).toMatchObject({ oem: 'Ilapak', project: 'Line 2 commissioning', programs: 2, proved: 1, open: 1, critical: 1, href: '/lines/L1/machine/Flow%20wrapper' });
    expect(r.groups[0].rows[1]).toMatchObject({ name: 'Checkweigher', programs: 0, open: 0 });
    expect(r.groups[0].rows[1].project).toBeUndefined();
    expect(r.groups[1].rows[0]).toMatchObject({ name: 'Bagger', open: 1, critical: 0 });
  });
  it('the sentence counts them', () => {
    expect(r).toMatchObject({ total: 3, withProject: 1, open: 2, critical: 1 });
    expect(r.says).toBe('3 machines on 2 lines · 1 with a project · 2 problems open, 1 critical.');
  });
  it('says what to do when there is nothing to list', () => {
    expect(factoryMachines({ ...base, lines: [] }).says).toBe('No lines in the factory yet — set up its lines first.');
    expect(factoryMachines({ ...base, lines: [L3], assets: [], snags: [] }).says).toBe('No machines named on any of the 1 line yet — name them on a line\'s Machines tab.');
  });
});

describe('a machine a project is working on says what its project says of it (27 October)', () => {
  const row = {
    id: 'm1', name: 'Flow wrapper', oem: 'Ilapak', gate: 'Commission', gateTone: 'w' as const,
    programs: '1 of 2 passed', open: 2, late: 1, critical: 0, status: 'On site', statusTone: 'w' as const,
    next: { what: 'Seal integrity', on: '2026-10-20', late: true },
  };
  const r = factoryMachines({ ...base, inProjects: new Map([['m1', { projectId: 'P', project: 'Line 2 commissioning', row }]]) });
  const x = r.groups[0].rows[0];
  it('its status, where it is up to, its programs, what it owes — then the register’s problems on it', () => {
    expect(x).toMatchObject({ status: 'On site', statusTone: 'w', rightTone: 'r', href: '/project/P/machine/m1' });
    expect(x.says).toBe('In Line 2 commissioning: at Commission · Programs: 1 of 2 passed · 2 open, 1 late · 1 problem open, 1 critical on the register');
    expect(x.right).toMatch(/^Late: Seal integrity · /);
  });
  it('a machine no project is working on says so, and opens on its line', () => {
    expect(r.groups[0].rows[1]).toMatchObject({ says: 'No project on it · no programs', right: 'No problems open', rightTone: 'n', href: '/lines/L1/machine/Checkweigher' });
    expect(r.groups[0].rows[1].status).toBeUndefined();
  });
  it('the paper says the same, line by line', () => {
    const p = factoryMachinesPaper(r);
    expect(p.groups.map(g => g.head)).toEqual(['Line 2a — Packing · 2 machines', 'Line 3 · 1 machine', 'Line 9 · no machines named yet']);
    expect(p.groups[0].rows[0]).toMatchObject({ n: 1, name: 'Flow wrapper — Ilapak', status: { word: 'On site', tone: 'w' }, says: x.says, right: x.right, rightTone: 'r' });
    expect(p.machines).toEqual([]);
  });
});
