import { describe, expect, it } from 'vitest';
import { analyse, type Capacity } from '../capacity';
import { planToTarget } from '../capacityPlan';
import { capacityGlance } from '../capacityGlance';

/* Rowland's Large crate: both lines fill at 70 ppm, one wrapper operator wraps a pair of pallets (360 units each) in 12 min, no rest allowance */
const large: Capacity = { targetPerMin: 70, stations: [
  { id: 's1', name: 'Lines 2A and 2B filling (together)', kind: 'machine', unit: 'units', contains: 1, ratePer: 'min', crew: 1, rate: 70, source: 'plate' },
  { id: 's2', name: 'Pallet wrapper (one operator, both lines)', kind: 'people', unit: 'pallets', contains: 360, ratePer: 'min', crew: 1, perCycle: 2, cycleSec: 720, cycleIn: 'min', source: 'timed', allowancePct: 0 },
] };
describe('line capacity at a glance', () => {
  it('says the line makes 60 against 70, held by the wrapper, with each station in its own words', () => {
    const g = capacityGlance(analyse(large), planToTarget(large));
    expect(g.makes).toBe('60 units/min');
    expect(g.target).toBe('70 units/min');
    expect(g.state).toBe('short');
    expect(g.against).toBe('10 short of 70 — 14% of the target');
    expect(g.heldBy).toMatch(/^Pallet wrapper/);
    expect(g.rows.map(r => [r.holds, r.can])).toEqual([[false, '70 units/min'], [true, '60 units/min']]);
    expect(g.rows[1].speed).toMatch(/2 pallets/);
    expect(g.fix).toMatch(/Pallet wrapper/);
  });
  it('meets: the Tesco Express wrapper has room, nothing to do', () => {
    const t: Capacity = { ...large, stations: [large.stations[0], { ...large.stations[1], contains: 1200 }] };
    const g = capacityGlance(analyse(t), planToTarget(t));
    expect(g.state).toBe('meets');
    expect(g.makes).toBe('70 units/min');
    expect(g.fix).toBeUndefined();
  });
  it('no target typed, and nothing set up yet, say so', () => {
    expect(capacityGlance(analyse({ stations: large.stations })).state).toBe('none');
    expect(capacityGlance(analyse({ stations: [] })).makes).toBeUndefined();
  });
});
