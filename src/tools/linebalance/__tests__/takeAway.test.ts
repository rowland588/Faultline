/* THE TIME TO TAKE IT AWAY (knowledge/specs/FC-034-take-away-and-paper.md, cases A–D worked by hand before the code).
 * A: a wrapper 40 s a pallet + 30 s to take it away = 70 s -> 0.857 143 a minute; with the 9% ILO rest 0.786 3.
 * B: 8 s a tray + 20 s every 4 trays = 13 s -> 4.615 4 trays a minute.
 * C: none / zero / a trip of less than one unit -> unchanged.
 * D: 6 s a basket at 36 baskets a pallet = 216 s; + 30 s = 246 s -> 0.243 9 pallets a minute. */
import { describe, it, expect } from 'vitest';
import { analyse, perMinute, planPerMinute, takeAwaySec, takeAwayWords, type Capacity, type Station } from '../capacity';
import { flowModel } from '../capacityFlow';

let n = 0;
const st = (o: Partial<Station> & { name: string; unit: string }): Station => ({ id: `t${++n}`, kind: 'people', contains: 1, ratePer: 'min', ...o });
const wrapper = (o: Partial<Station> = {}) => st({ name: 'Wrapper', unit: 'pallets', cycleSec: 40, perCycle: 1, allowancePct: 0, ...o });

describe('take-away time on a station', () => {
  it('A — a wrapper 40 s a pallet and 30 s to take it away is 70 s: 0.857 143 a minute; with 9% rest 0.7863', () => {
    expect(perMinute(wrapper())).toBeCloseTo(1.5, 9);
    expect(perMinute(wrapper({ moveSec: 30 }))).toBeCloseTo(60 / 70, 9);
    expect(planPerMinute(wrapper({ moveSec: 30, allowancePct: undefined }))).toBeCloseTo(60 / 70 / 1.09, 9);
  });
  it('B — 8 s a tray, 20 s every 4 trays: 13 s, 4.6154 trays a minute', () => {
    expect(perMinute(st({ name: 'Packer', unit: 'trays', cycleSec: 8, perCycle: 1, moveSec: 20, moveEvery: 4 }))).toBeCloseTo(60 / 13, 9);
  });
  it('C — none, zero, past an hour or a trip of less than one unit changes nothing', () => {
    const base = perMinute(wrapper());
    for (const o of [{}, { moveSec: 0 }, { moveSec: -5 }, { moveSec: 4000 }, { moveSec: Number.NaN }] as Partial<Station>[]) expect(perMinute(wrapper(o))).toBe(base);
    expect(takeAwaySec({ moveSec: 30, moveEvery: 0.5 })).toBe(30);
    expect(takeAwaySec({ moveSec: 30, moveEvery: 0 })).toBe(30);
  });
  it('D — timed per the unit before (6 s a basket, 36 to a pallet) with 30 s a pallet: 246 s, 0.2439 a minute', () => {
    const p = st({ name: 'Palletiser', unit: 'pallets', contains: 36, speedIn: 'before', cycleSec: 6, perCycle: 1, moveSec: 30 });
    expect(perMinute(p)).toBeCloseTo(60 / 246, 9);
  });
  it('moves the limit: the wrapper at 1.5 a minute is faster than a 1 a minute stacker; with the trip it is the bottleneck', () => {
    const stacker = st({ name: 'Stacker', kind: 'machine', unit: 'pallets', contains: 1, rate: 1 });
    const run = (o: Partial<Station>) => analyse({ stations: [{ ...stacker, name: 'First', rate: 3 }, wrapper(o), stacker] } as Capacity);
    expect(run({}).limit?.station.name).toBe('Stacker');
    const r = run({ moveSec: 30 });
    expect(r.limit?.station.name).toBe('Wrapper');
    expect(r.line).toBeCloseTo(60 / 70, 6);
  });
  it('says itself in words', () => {
    expect(takeAwayWords({ unit: 'pallets', moveSec: 30 })).toBe('30 s to take it away');
    expect(takeAwayWords({ unit: 'trays', moveSec: 20, moveEvery: 4 })).toBe('20 s to take every 4 away');
    expect(takeAwayWords({ unit: 'trays', moveSec: 180 })).toBe('3 min to take it away');
    expect(takeAwayWords({ unit: 'trays' })).toBeUndefined();
  });
  it('the page and the paper draw one model: the drawing reads the same speeds', () => {
    const cap: Capacity = { stations: [wrapper({ moveSec: 30 })] };
    const fm = flowModel(cap, analyse(cap));
    expect(fm.columns[0].nodes[0].perMin).toBeCloseTo(60 / 70, 9);
  });
});
