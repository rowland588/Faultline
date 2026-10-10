/* THE CLIMB TO RATE (lib/rampUp) — every case worked by hand.
 *
 * The worked example: Finest Red 2 kg on the wrapper, 96, 108 and 114 a
 * minute on Mon 5, Wed 7 and Fri 9 Oct, 120 agreed. Time per pack 1/96,
 * 1/108, 1/114; fitted on log T against log n: b = −0.1579 (a 90% curve,
 * 2^b = 0.896), a = −4.5666. The run where T = 1/120: ln n* = (ln(1/120) −
 * a) ÷ b = 1.3991, n* = 4.05 — run 4 is fitted at 119.8, so run 5. At the
 * runs' own cadence, one every 2 days: 9 Oct + 2 × 2 = Tue 13 Oct. */
import { describe, it, expect } from 'vitest';
import { climbOf, climbsOf, climbsOn } from '../rampUp';
import type { Asset, Test } from '../testing';
import type { ProductRun } from '../run';
import { niceDay } from '../weeks';

const D = (iso: string) => niceDay(iso, { weekday: 'short' });
const pts = (xs: [string, number][]) => xs.map(([on, net], i) => ({ on, net, testId: `t${i}`, runId: `r${i}` }));
const wrapper: Asset = { id: 'w', projectId: 'p', name: 'Ilapak flow wrapper', state: 'onSite', sort: 1, updatedAt: 1 } as Asset;
let k = 0;
const runTest = (runs: ProductRun[], o: Partial<Test> = {}): Test => ({ id: `t${k++}`, projectId: 'p', kind: 'test', title: 'Performance run at the agreed rate', assetId: 'w', outcome: 'planned', runs, sort: k, createdAt: 1, updatedAt: 1, ...o });
/** A run that netted `net` a minute: 60 minutes, net × 60 good packs, no rejects. */
const run = (product: string, ranOn: string, net: number, rate = 120): ProductRun => ({ id: `r${k++}`, product, ranOn, agreed: { rate }, day: { minutes: 60, packs: net * 60, rejects: 0 } });

describe('the climb to rate', () => {
  it('the worked example: at this climb, 120 about Tue 13 Oct (run 5)', () => {
    const c = climbOf(pts([['2026-10-05', 96], ['2026-10-07', 108], ['2026-10-09', 114]]), 120, { product: 'Finest Red 2 kg' });
    expect(c.kind).toBe('climbing');
    expect(c.runNo).toBe(5);
    expect(c.at).toBe('2026-10-13');
    expect(c.learning).toBeCloseTo(0.896, 3);
    expect(c.fit?.(4)).toBeCloseTo(119.76, 1);
    expect(c.tone).toBe('on');
    expect(c.text).toBe(`Finest Red 2 kg: 96 → 108 → 114 a minute over 3 runs — at this climb, the agreed 120 about ${D('2026-10-13')} (run 5).`);
  });

  it('two runs: too early to say when', () => {
    const c = climbOf(pts([['2026-10-05', 96], ['2026-10-07', 108]]), 120, { product: 'Finest Red 2 kg' });
    expect(c.kind).toBe('early');
    expect(c.tone).toBe('none');
    expect(c.at).toBeUndefined();
    expect(c.text).toBe('Finest Red 2 kg: 96 → 108 a minute over 2 runs — too early to say when it reaches 120.');
  });

  it('not climbing: never a date', () => {
    const c = climbOf(pts([['2026-10-05', 110], ['2026-10-07', 104], ['2026-10-09', 106]]), 120, { product: 'Express 1.25 kg' });
    expect(c.kind).toBe('flat');
    expect(c.tone).toBe('risk');
    expect(c.at).toBeUndefined();
    expect(c.text).toBe('Express 1.25 kg: 110 → 104 → 106 a minute over 3 runs — not climbing: at this rate it does not reach 120.');
  });

  it('the latest run at the rate: said, not forecast', () => {
    const c = climbOf(pts([['2026-10-05', 96], ['2026-10-07', 121]]), 120, { product: 'Finest Red 2 kg' });
    expect(c.kind).toBe('meets');
    expect(c.text).toBe('Finest Red 2 kg: 96 → 121 a minute over 2 runs — at the agreed 120.');
  });

  it('a long climb lists the last five', () => {
    const c = climbOf(pts([['2026-10-01', 80], ['2026-10-02', 88], ['2026-10-03', 94], ['2026-10-04', 99], ['2026-10-05', 102], ['2026-10-06', 105]]), 120, { product: 'Express' });
    expect(c.text.startsWith('Express: … → 88 → 94 → 99 → 102 → 105 a minute over 6 runs')).toBe(true);
  });

  it('never forecasts a run already done: the next run at the soonest', () => {
    // So steep that the fit crosses 120 between runs 2 and 3, while run 3 still fell short.
    const c = climbOf(pts([['2026-10-05', 60], ['2026-10-06', 100], ['2026-10-07', 110]]), 120, { product: 'X' });
    expect(c.runNo).toBeGreaterThanOrEqual(4);
  });
});

describe('every climb on the job, from the runs already kept', () => {
  it('one per machine and product, across tests and re-runs, in the order they ran', () => {
    const tests = [
      runTest([run('Finest Red 2 kg', '2026-10-05', 96), run('Express 1.25 kg', '2026-10-05', 100, 110)]),
      runTest([run('Finest Red 2 kg', '2026-10-07', 108)]),
      runTest([run('finest red 2 kg ', '2026-10-09', 114)]),           // the same product, typed differently
      runTest([run('Express 1.25 kg', '2026-10-08', 111, 110)]),
    ];
    const cs = climbsOf({ tests, assets: [wrapper] });
    expect(cs.map(c => [c.product, c.kind, c.points.length])).toEqual([['Finest Red 2 kg', 'climbing', 3], ['Express 1.25 kg', 'meets', 2]]);
    expect(cs[0].machine).toBe('Ilapak flow wrapper');
    expect(cs[0].at).toBe('2026-10-13');
  });

  it('one measured run is not a climb; nothing agreed, nothing to climb to; a deleted test is left out', () => {
    const one = climbsOf({ tests: [runTest([run('A', '2026-10-05', 96)])] });
    expect(one).toEqual([]);
    const noRate: ProductRun = { id: 'x', product: 'B', ranOn: '2026-10-05', day: { minutes: 60, packs: 6000, rejects: 0 } };
    expect(climbsOf({ tests: [runTest([noRate]), runTest([{ ...noRate, id: 'y', ranOn: '2026-10-06' }])] })).toEqual([]);
    expect(climbsOf({ tests: [runTest([run('C', '2026-10-05', 96)]), runTest([run('C', '2026-10-07', 108)], { deletedAt: 9 })] })).toEqual([]);
  });

  it('a product on two machines climbs twice', () => {
    const tests = [
      runTest([run('A', '2026-10-05', 96)]), runTest([run('A', '2026-10-06', 100)]),
      runTest([run('A', '2026-10-05', 90)], { assetId: 'm2' }), runTest([run('A', '2026-10-06', 95)], { assetId: 'm2' }),
    ];
    expect(climbsOf({ tests }).length).toBe(2);
  });

  it('the rate agreed is the latest one', () => {
    const tests = [runTest([run('A', '2026-10-05', 96, 100)]), runTest([run('A', '2026-10-07', 108, 120)]), runTest([run('A', '2026-10-09', 114, 120)])];
    expect(climbsOf({ tests })[0].agreed).toBe(120);
  });
});

describe('the climbs a run is part of', () => {
  it('its machine’s, for its products only', () => {
    const a = runTest([run('A', '2026-10-05', 96), run('B', '2026-10-05', 90)]), b = runTest([run('A', '2026-10-07', 108), run('B', '2026-10-07', 99)]);
    const other = runTest([run('A', '2026-10-05', 80)], { assetId: 'm2' }), other2 = runTest([run('A', '2026-10-06', 85)], { assetId: 'm2' });
    const cs = climbsOf({ tests: [a, b, other, other2] });
    expect(cs.length).toBe(3);
    const only = runTest([run('A', '2026-10-09', 114)]);
    expect(climbsOn(cs, only).map(c => [c.product, c.machineId])).toEqual([['A', 'w']]);
  });

  it('a test with run numbers is a run, whatever it is called', () => {
    const named = runTest([run('A', '2026-10-05', 96)], { title: 'Line trial' }), named2 = runTest([run('A', '2026-10-07', 108)], { title: 'Line trial' });
    expect(climbsOf({ tests: [named, named2] }).length).toBe(1);
  });
});
