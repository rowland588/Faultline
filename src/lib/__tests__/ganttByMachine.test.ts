/* THE PLAN BY MACHINE — Rowland, 5 October: "we have different machines but
 * all muddled together on the Gantt — difficult to see machine status." Each
 * machine is one band, in the job's own order, its header saying where it
 * stands the way the "Where each machine is" strip does; its rows gate by gate
 * without its name on every one; what is on no machine in a last band. */
import { describe, expect, it } from 'vitest';
import { gantt, JOB_BAND, withMachines } from '../gantt';
import { journeyNow, journeyOf } from '../install';
import { standing } from '../standing';
import type { Asset, Test, TestItem } from '../testing';
import type { Material } from '../materials';
import type { Program } from '../programs';

const TODAY = '2026-10-05';
let n = 0;
const asset = (o: Partial<Asset> & { name: string }): Asset =>
  ({ id: `a${++n}`, projectId: 'p', state: 'onSite', sort: n, updatedAt: 1, ...o });
const step = (o: Partial<Test> & { title: string }): Test =>
  ({ id: `s${++n}`, projectId: 'p', kind: 'install', outcome: 'planned', sort: n, createdAt: 1, updatedAt: 1, ...o });

/* Sorted 20, 10, 30 on purpose: the job's order is the sort, not the list's. */
const weigher = asset({ name: 'Ishida checkweigher', sort: 20, onSiteOn: '2026-09-27', installedOn: '2026-09-30' });
const wrapper = asset({ name: 'Ilapak flow wrapper', sort: 10, state: 'running', onSiteOn: '2026-09-19', runningOn: '2026-09-25' });
const coder = asset({ name: 'Domino coder', sort: 30, state: 'awaited' });
const assets = [weigher, wrapper, coder];

/* "Positioned and levelled" on two machines — so the plan writes each as
   "Machine — Positioned and levelled". */
const tests: Test[] = [
  step({ id: 'w-pos', title: 'Positioned and levelled', assetId: weigher.id, plannedFor: '2026-09-28', ranOn: '2026-09-28', outcome: 'passed' }),
  step({ id: 'w-dry', title: 'Dry run', assetId: weigher.id, plannedFor: '2026-10-07' }),
  step({ id: 'w-io', title: 'Sensors checked', assetId: weigher.id, plannedFor: '2026-10-02' }),          // late
  step({ id: 'p-pos', title: 'Positioned and levelled', assetId: wrapper.id, plannedFor: '2026-09-20', ranOn: '2026-09-20', outcome: 'passed' }),
  step({ id: 'p-chg', title: 'Change parts fitted', gate: 'setup', assetId: wrapper.id, plannedFor: '2026-10-08' }),
  step({ id: 'p-man', title: 'Manuals handed over', gate: 'handover', assetId: wrapper.id, plannedFor: '2026-10-01' }),
  step({ id: 'p-seal', kind: 'test', title: 'Seal integrity', assetId: wrapper.id, plannedFor: '2026-10-09' }),
  step({ id: 'line-air', title: 'Line air ring main', plannedFor: '2026-10-06' }),
];
const items: TestItem[] = [];
const programs: Program[] = [
  { id: 'pg1', projectId: 'p', what: 'Finest Red 2kg', assetId: wrapper.id, state: 'onMachine', testOn: '2026-10-06', sort: 1, createdAt: 1, updatedAt: 1 },
];
const materials: Material[] = [
  { id: 'm1', projectId: 'p', what: 'Film reels', due: '2026-10-03', sort: 1, createdAt: 1, updatedAt: 1 },
];
const st = standing({ tests, items, assets, materials, programs, today: TODAY });
const g = withMachines(gantt(st.plan, { today: TODAY }, { tests, items }), { assets, tests, items, programs, today: TODAY });
const bands = g.machines ?? [];
const band = (name: string) => bands.find(b => b.name === name)!;
const labels = (name: string) => band(name).groups.flatMap(gr => gr.rows.map(r => r.label));

describe('the plan by machine', () => {
  it('draws one band per machine, in the job’s order, then the line and the whole job', () => {
    expect(bands.map(b => b.name)).toEqual(['Ilapak flow wrapper', 'Ishida checkweigher', 'Domino coder', JOB_BAND]);
  });

  it('puts each machine’s rows in gate order, by date inside each gate', () => {
    expect(band('Ilapak flow wrapper').groups.map(gr => gr.label)).toEqual(['Arriving', 'Install', 'Set up', 'Commission', 'Hand over']);
    expect(band('Ishida checkweigher').groups.map(gr => gr.label)).toEqual(['Arriving', 'Install']);
    expect(labels('Ishida checkweigher')).toEqual(['On site', 'Positioned and levelled', 'Sensors checked', 'Dry run']);
  });

  it('counts a machine’s programs as its Set up, by date with its set-up steps', () => {
    expect(band('Ilapak flow wrapper').groups.find(gr => gr.label === 'Set up')!.rows.map(r => r.label)).toEqual(['Finest Red 2kg', 'Change parts fitted']);
  });

  it('says only the step inside a machine’s band — never its name again', () => {
    expect(st.plan.some(m => m.label === 'Ishida checkweigher — Positioned and levelled')).toBe(true);
    for (const b of bands.filter(x => x.id)) for (const l of labels(b.name)) expect(l.includes(b.name)).toBe(false);
    expect(bands.flatMap(b => b.groups.flatMap(gr => gr.rows)).every(r => !r.on)).toBe(true);
  });

  it('says where each machine stands as the strip does, with what is late, in its colour', () => {
    const at = (a: Asset) => journeyNow(journeyOf(a, tests, items, TODAY, programs));
    expect(band('Ishida checkweigher').says).toBe(`at ${at(weigher)} · 1 late`);
    expect(band('Ishida checkweigher').tone).toBe('late');
    expect(band('Ishida checkweigher').path).toBe('install');
    expect(band('Ilapak flow wrapper').says.startsWith(`at ${at(wrapper)}`)).toBe(true);
  });

  it('gives a machine with nothing dated its band all the same, saying so', () => {
    const b = band('Domino coder');
    expect(b.groups).toEqual([]);
    expect(b.bar).toBeUndefined();
    expect(b.says).toMatch(/nothing dated yet$/);
    expect(b.tone).toBe('none');
  });

  it('draws a summary bar from a machine’s first date to its last', () => {
    const b = band('Ishida checkweigher');
    const rows = b.groups.flatMap(gr => gr.rows);
    expect(b.bar!.start).toBe(Math.min(...rows.map(r => r.start)));
    expect(b.bar!.start + b.bar!.span).toBe(Math.max(...rows.map(r => r.start + r.span)));
    expect(b.bar!.when).toBe('27 Sep – 7 Oct');
  });

  it('puts what is on no machine in the last band — line steps and materials', () => {
    const job = band(JOB_BAND);
    expect(job.id).toBeUndefined();
    expect(job.groups.map(gr => gr.label)).toEqual(['Materials', 'Install']);
    expect(job.groups.flatMap(gr => gr.rows.map(r => r.label))).toEqual(['Film reels', 'Line air ring main']);
    expect(job.says).toBe('2 on the plan · 1 late or a problem');
    expect(job.tone).toBe('late');
  });

  it('loses no row and draws none twice', () => {
    const all = (x: typeof g.groups) => x.flatMap(gr => gr.rows.map(r => r.id)).sort();
    expect(all(bands.flatMap(b => b.groups))).toEqual(all(g.groups));
  });

  it('has no job band when everything is on a machine, and no machine band for a deleted one', () => {
    const only = tests.filter(t => t.assetId);
    const gone = { ...coder, deletedAt: 5 };
    const s2 = standing({ tests: only, items, assets: [weigher, wrapper, gone], materials: [], programs, today: TODAY });
    const g2 = withMachines(gantt(s2.plan, { today: TODAY }), { assets: [weigher, wrapper, gone], tests: only, items, programs, today: TODAY });
    expect(g2.machines!.map(b => b.name)).toEqual(['Ilapak flow wrapper', 'Ishida checkweigher']);
  });
});
