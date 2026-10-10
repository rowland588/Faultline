/* A MACHINE IS A PLACE (docs/FLOW.md item 2) — the machine's whole story,
 * read off the lists that already name it: where it stands, when it came,
 * its gates in order with every stage and test, and what is open on it. */
import { describe, it, expect } from 'vitest';
import { machineRecord } from '../machineRecord';
import type { Asset, Test, TestItem } from '../testing';
import type { Program } from '../programs';

const TODAY = '2026-10-10';
let n = 0;
const test = (o: Partial<Test> & { title: string }): Test => ({ id: `t${++n}`, projectId: 'p', outcome: 'planned', sort: n, createdAt: n, updatedAt: n, ...o });
const weigher: Asset = { id: 'w', projectId: 'p', name: 'Ishida checkweigher', oem: 'Ishida Europe', state: 'onSite', onSiteOn: '2026-10-02', sort: 1, updatedAt: 1 } as Asset;
const coder: Asset = { id: 'c', projectId: 'p', name: 'Domino coder', state: 'awaited', dueOn: '2026-10-07', sort: 2, updatedAt: 1 } as Asset;

const placed = test({ kind: 'install', assetId: 'w', title: 'Positioned and levelled', outcome: 'passed', ranOn: '2026-10-03' });
const io = test({ kind: 'install', assetId: 'w', title: 'Sensors and controls checked (I/O)', plannedFor: '2026-10-08', withWhom: 'Ishida Europe' });
const tests: Test[] = [
  placed,
  io,
  test({ kind: 'install', assetId: 'w', title: 'Dry run', plannedFor: '2026-10-12' }),
  test({ kind: 'install', gate: 'handover', assetId: 'w', title: 'Client signed off' }),
  test({ kind: 'test', assetId: 'w', title: 'Runs at the agreed speed', outcome: 'failed', ranOn: '2026-10-06' }),
  test({ kind: 'test', assetId: 'w', title: 'Rejects a light pack', plannedFor: '2026-10-14' }),
  test({ kind: 'fix', assetId: 'w', title: 'Send the regulator', plannedFor: '2026-10-09', withWhom: 'Ishida Europe' }),
  test({ kind: 'fix', assetId: 'w', title: 'Re-seat the load cell', outcome: 'passed', ranOn: '2026-10-05' }),
  test({ kind: 'install', assetId: 'c', title: 'Positioned and levelled' }),
];
const items: TestItem[] = [
  { id: 'i1', projectId: 'p', testId: io.id, kind: 'found', what: 'Light curtain wired wrong', sort: 1, createdAt: Date.parse('2026-10-08T09:00:00'), updatedAt: 1 } as TestItem,
];
const programs = [
  { id: 'p1', projectId: 'p', assetId: 'w', what: 'Express 400 g', state: 'proved', sort: 1, updatedAt: 1 },
  { id: 'p2', projectId: 'p', assetId: 'w', what: 'Express 1 kg', state: 'needed', sort: 2, updatedAt: 1 },
] as unknown as Program[];

describe('a machine, read whole', () => {
  const m = machineRecord(weigher, { tests, items, programs, today: TODAY });

  it('says where it stands and when it came', () => {
    expect(m.name).toBe('Ishida checkweigher');
    expect(m.oem).toBe('Ishida Europe');
    expect(m.at).toBe('at Install');
    expect(m.arrival).toMatch(/^On site since /);
    expect(m.arrivalLate).toBe(false);
  });

  it('its gates in order, every stage and test, each with its record', () => {
    expect(m.gates.map(g => g.label)).toEqual(['Install', 'Set up', 'Commission', 'Hand over']);
    const install = m.gates[0];
    expect(install.lines.map(l => [l.title, l.tone])).toEqual([
      ['Positioned and levelled', 'done'], ['Sensors and controls checked (I/O)', 'late'], ['Dry run', 'ahead'],
    ]);
    expect(install.lines[1].id).toBe(io.id);
    expect(install.lines[1].who).toBe('Ishida Europe');
    expect(install.says).toBe('1 of 3 done · 1 late');
    const commission = m.gates[2];
    expect(commission.lines.map(l => [l.title, l.tone])).toEqual([['Runs at the agreed speed', 'failed'], ['Rejects a light pack', 'ahead']]);
    expect(m.gates[3].lines.map(l => [l.title, l.word])).toEqual([['Client signed off', 'no day set']]);
  });

  it('its programs in a line, under Set up', () => {
    expect(m.programs).toBe('2 programs · 1 on the machine · 1 not written yet');
  });

  it('what is open on it — fixes late first, the done ones counted, problems with no fix', () => {
    expect(m.fixes.map(f => [f.title, f.tone])).toEqual([['Send the regulator', 'late']]);
    expect(m.fixesDone).toBe(1);
    expect(m.problems.map(p => p.title)).toEqual(['Light curtain wired wrong']);
    expect(m.open).toContain('1 fix open');
  });

  it('a machine not here yet is due on site, late once its day has gone', () => {
    const c = machineRecord(coder, { tests, items, programs, today: TODAY });
    expect(c.at).toBe('due on site');
    expect(c.arrival).toMatch(/^Due on site .* — late$/);
    expect(c.arrivalLate).toBe(true);
    expect(c.fixes).toEqual([]);
  });
});
