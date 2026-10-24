/* SCREENING A LINE CAPACITY (lib/capacity screenCapacity; Rowland, 15
 * October: a target of 150 a minute and 319%, 279%, 273% on the V — "screen
 * it for problems"). His "10 in a tray" as he entered it: a bagger at 160, a
 * pick and place at 140, a palletiser (2 people, 2 baskets every 16 s,
 * 10 to a basket) and a pallet wrapper (1 person, 2 pallets every 12
 * minutes, 36 baskets to a pallet). */
import { describe, expect, it } from 'vitest';
import { analyse, screenCapacity, type Capacity } from '../capacity';

const his = (over: Partial<Capacity> = {}): Capacity => ({
  labour: { people: 8, ratePerHour: 21.8 },
  stations: [
    { id: 'a', crew: 1, kind: 'machine', name: 'bagger', rate: 160, unit: 'units', source: 'plate', goodPct: 100, ratePer: 'min', contains: 1, runningPct: 100 },
    { id: 'b', crew: 1, kind: 'machine', name: 'P160 Pick & Place', rate: 140, unit: 'units', source: 'plate', goodPct: 100, ratePer: 'min', contains: 1, runningPct: 100 },
    { id: 'c', crew: 2, kind: 'people', name: 'palletiser', unit: 'baskets', source: 'standard', goodPct: 100, ratePer: 'min', contains: 10, cycleSec: 16, perCycle: 2, runningPct: 91, allowancePct: 10 },
    { id: 'd', crew: 1, kind: 'people', name: 'Pallet wrapper', unit: 'pallets', source: 'estimate', cycleIn: 'min', goodPct: 100, ratePer: 'min', contains: 36, cycleSec: 720, perCycle: 2, runningPct: 91 },
  ],
  targetPerMin: 150, plannedHoursPerWeek: 77, ...over,
} as Capacity);

describe('screening a line capacity', () => {
  it('his line: the wrapper is a third of the target, the V is steep because of it, and the 91% is the rest again', () => {
    const cap = his();
    const r = analyse(cap);
    expect(r.line).toBeCloseTo(50.09, 1);
    const c = screenCapacity(cap, r);
    expect(c.map(x => x.tone)).toEqual(['r', 'a', 'a']);
    /* 1 — what holds it, how it is typed, what it needs */
    expect(c[0].text).toBe('Pallet wrapper holds the line to 50.1 units a minute — 33% of the 150 target. It is typed as 2 pallets every 12 min: is that right? To make 150 it would need 3 people at it (it has 1).');
    expect(c[0].station).toBe(3);
    /* 2 — the percentages he saw, said against what they are against */
    expect(c[1].text).toContain('bagger 319% · P160 Pick & Place 279% · palletiser 273%');
    expect(c[1].text).toContain('against Pallet wrapper’s 50.1 units a minute, not against the 150 target');
    /* 3 — the rest counted twice, with the number it would be */
    expect(c[2].text).toBe('Pallet wrapper: the 9% rest allowance and a running of 91% both take time off. If the 91% is the same rest, it is counted twice — 55 a minute instead of 50.1.');
  });
  it('a line that meets its target says nothing', () => {
    const cap = his({ targetPerMin: 45 });
    cap.stations = cap.stations.map(s => (s.id === 'd' ? { ...s, runningPct: 100 } : s));
    cap.stations = cap.stations.map(s => ({ ...s, ...(s.id === 'a' ? { rate: 60 } : s.id === 'b' ? { rate: 58 } : {}) }));
    const r = analyse(cap);
    expect(screenCapacity(cap, r).filter(x => x.tone === 'r')).toEqual([]);
  });
  it('a machine holding the line is asked for as machines, not people', () => {
    const cap = his({ targetPerMin: 150 });
    cap.stations = [{ ...cap.stations[0], rate: 40, id: 'a' }, cap.stations[1]];
    const c = screenCapacity(cap, analyse(cap));
    expect(c[0].text).toContain('bagger holds the line to 40 units a minute — 27% of the 150 target. It is typed as 40 units a minute: is that right? To make 150 it would need 4 of them running (it has 1).');
  });
  it('one station, or none, is not screened', () => {
    const cap = his(); cap.stations = [cap.stations[0]];
    expect(screenCapacity(cap, analyse(cap))).toEqual([]);
  });
  it('a standard time carries its own allowance: no twice', () => {
    const cap = his();
    cap.stations = cap.stations.map(s => (s.id === 'd' ? { ...s, source: 'standard' as const } : s));
    expect(screenCapacity(cap, analyse(cap)).some(x => /counted twice/.test(x.text))).toBe(false);
  });
});
