/* SEVERAL LINES FEEDING ONE PLACE (lib/capacity analyseLanes; Rowland, 15
 * October: "two lines here that then merge into individuals at the end of the
 * line ... a palletizer who's a human ... leading to a wrapper who's a human
 * ... line A, line B ... one person who has to wrap for both"; "the 150 was
 * for both lines merged"; "3, 4, 5, 6 lines into one"). His "10 in a tray":
 * each line a bagger (160), a pick and place (140) and a palletiser (one
 * person, 2 baskets every 16 s, 10 to a basket, 91% running), both then to
 * ONE wrapper (one person, 2 pallets every 12 minutes, 36 baskets a pallet). */
import { describe, expect, it } from 'vitest';
import { analyse, type Capacity, type Station } from '../capacity';

const laneStations = (lane: string, p: string): Station[] => [
  { id: `${p}a`, lane, crew: 1, kind: 'machine', name: 'bagger', rate: 160, unit: 'units', source: 'plate', goodPct: 100, ratePer: 'min', contains: 1, runningPct: 100 },
  { id: `${p}b`, lane, crew: 1, kind: 'machine', name: 'P160 Pick & Place', rate: 140, unit: 'units', source: 'plate', goodPct: 100, ratePer: 'min', contains: 1, runningPct: 100 },
  { id: `${p}c`, lane, crew: 1, kind: 'people', name: 'palletiser', unit: 'baskets', source: 'standard', goodPct: 100, ratePer: 'min', contains: 10, cycleSec: 16, perCycle: 2, runningPct: 91, allowancePct: 10 },
] as Station[];
const wrapper: Station = { id: 'w', crew: 1, kind: 'people', name: 'Pallet wrapper', unit: 'pallets', source: 'estimate', cycleIn: 'min', goodPct: 100, ratePer: 'min', contains: 36, cycleSec: 720, perCycle: 2, runningPct: 91 } as Station;

const his = (n = 2, over: Partial<Capacity> = {}): Capacity => {
  const ids = ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, n);
  return {
    targetPerMin: 150, plannedHoursPerWeek: 77,
    lanes: ids.map(x => ({ id: `l${x}`, name: `Line ${x}` })),
    stations: [...ids.flatMap(x => laneStations(`l${x}`, x.toLowerCase())), wrapper],
    ...over,
  } as Capacity;
};

describe('several lines feeding one place', () => {
  it('each line is its own chain: held by its palletiser at 68.25', () => {
    const r = analyse(his());
    expect(r.lanes?.sections.map(s => [s.name, s.result.line, s.result.limit?.station.name])).toEqual([
      ['Line A', 68.25, 'palletiser'], ['Line B', 68.25, 'palletiser']]);
    expect(r.lanes?.sends).toBeCloseTo(136.5, 5);
  });
  it('the wrapper takes what both send it, and holds the whole to 50.1 — short of the 150 for both', () => {
    const r = analyse(his());
    expect(r.lanes?.heldBy).toBe('shared');
    expect(r.limit?.station.name).toBe('Pallet wrapper');
    expect(r.line).toBeCloseTo(50.09, 1);
    expect(r.gap).toBeCloseTo(99.91, 1);
    expect(r.unit).toBe('units');
    expect(r.sentence).toBe('Pallet wrapper holds Line A and Line B to 50.1 units/min together — 137 units/min arrive at it — 99.9 short of the 150 target.');
  });
  it('the wrapper is in the line’s unit: a pallet is 36 baskets of 10 — 360 units', () => {
    const r = analyse(his());
    expect(r.lanes?.merged?.ok.find(x => x.station.id === 'w')?.factor).toBe(360);
  });
  it('stations are numbered as the whole capacity numbers them, so a column opens its station', () => {
    const cap = his();
    const r = analyse(cap);
    for (const x of r.ok) expect(cap.stations[x.index].id).toBe(x.station.id);
    expect(r.lanes?.merged?.ok[0].index).toBe(-1);
  });
  it('three, four, five, six lines into one: the same place, what they send added', () => {
    for (const n of [3, 4, 6]) {
      const r = analyse(his(n));
      expect(r.lanes?.sections).toHaveLength(n);
      expect(r.lanes?.sends).toBeCloseTo(68.25 * n, 5);
      expect(r.line).toBeCloseTo(50.09, 1);
    }
  });
  it('with enough at the wrapper the lines themselves hold it, and it says so', () => {
    const cap = his(2);
    cap.stations = cap.stations.map(x => (x.id === 'w' ? { ...x, crew: 3 } : x));
    const r = analyse(cap);
    expect(r.lanes?.heldBy).toBe('lanes');
    expect(r.line).toBeCloseTo(136.5, 5);
    expect(r.sentence).toContain('Line A and Line B make 137 units/min together — 13.5 short of the 150 target.');
    expect(r.sentence).toContain('Line A is held by palletiser at 68.3; Line B is held by palletiser at 68.3.');
    expect(r.limit?.station.name).toBe('palletiser');
  });
  it('nothing shared: the lines are simply added', () => {
    const cap = his(2); cap.stations = cap.stations.filter(x => x.id !== 'w');
    const r = analyse(cap);
    expect(r.line).toBeCloseTo(136.5, 5);
    expect(r.lanes?.merged).toBeUndefined();
  });
  it('a line with no stations yet is not counted, and the others still are', () => {
    const cap = his(2); cap.lanes = [...(cap.lanes ?? []), { id: 'lC', name: 'Line C' }];
    const r = analyse(cap);
    expect(r.lanes?.sections.map(s => s.result.ok.length)).toEqual([3, 3, 0]);
    expect(r.line).toBeCloseTo(50.09, 1);
  });
  it('a capacity with no lines is the one chain it always was', () => {
    const cap: Capacity = { stations: laneStations('', 'z').map(x => ({ ...x, lane: undefined })) } as Capacity;
    expect(analyse(cap).lanes).toBeUndefined();
    expect(analyse({ ...cap, lanes: [] }).lanes).toBeUndefined();
  });
  it('a shared station typed in the unit before is put into the line’s unit with the contains', () => {
    const cap = his(2);
    /* a basket every 6 s at the wrapper: 10 baskets a minute = 100 units; less 9% rest, 91% running */
    cap.stations = cap.stations.map(x => (x.id === 'w' ? { ...x, speedIn: 'before' as const, cycleSec: 6, perCycle: 1, cycleIn: undefined, runningPct: 100, allowancePct: 0 } : x));
    const r = analyse(cap);
    expect(r.limit?.station.name).toBe('Pallet wrapper');
    expect(r.line).toBeCloseTo(100, 1);
  });
});

describe('screening several lines', () => {
  it('his two lines: the wrapper against both lines’ 137 and the 150, each line’s V against its own palletiser, the rest counted twice', async () => {
    const { screenCapacity } = await import('../capacity');
    const cap = his(2);
    const c = screenCapacity(cap, analyse(cap));
    expect(c.map(x => x.tone)).toEqual(['r', 'a', 'a']);
    expect(c[0].text).toBe('Pallet wrapper holds Line A and Line B to 50.1 units a minute together — 33% of the 150 target. They send it 137. It is typed as 2 pallets every 12 min: is that right? To take all they send it would need 3 people at it (it has 1) — and they send 137, short of 150 themselves, so they need lifting too.');
    expect(c[1].text).toBe('Line A and Line B: bagger 234% · P160 Pick & Place 205% — those are against palletiser’s 68.3 units a minute, not against the target. A V this steep usually means palletiser’s speed or a unit conversion is mistyped, or the stations before it are far bigger than the line needs.');
    expect(c[2].text).toBe('Pallet wrapper: the 9% rest allowance and a running of 91% both take time off. If the 91% is the same rest, it is counted twice — 55 a minute instead of 50.1.');
  });
  it('lines that hold it themselves: each says what it needs', async () => {
    const { screenCapacity } = await import('../capacity');
    const cap = his(2, { targetPerMin: 400 });
    cap.stations = cap.stations.map(x => (x.id === 'w' ? { ...x, crew: 8 } : x));
    const c = screenCapacity(cap, analyse(cap));
    expect(c[0].text).toContain('Line A and Line B make 137 units a minute together — 34% of the 400 target.');
    expect(c[0].text).toContain('palletiser in Line A: 3 people at it (it has 1); palletiser in Line B: 3 people at it (it has 1)');
  });
  it('a line that meets its target is not told it is short', async () => {
    const { screenCapacity } = await import('../capacity');
    const cap = his(2, { targetPerMin: 100 });
    cap.stations = cap.stations.map(x => (x.id === 'w' ? { ...x, crew: 4, runningPct: 100, allowancePct: 0 } : x));
    expect(screenCapacity(cap, analyse(cap)).filter(x => x.tone === 'r')).toEqual([]);
  });
});

describe('everything else that reads a capacity', () => {
  it('a what-if keeps the lines and is compared with the line as run', async () => {
    const { whatIfCapacity, compareSays, diffWhatIf, withWhatIfStations } = await import('../capacity');
    const cap = his(2);
    const mine = cap.stations.map(x => (x.id === 'w' ? { ...x, crew: 2 } : x));
    const w = withWhatIfStations(cap.stations, { id: 'w1', name: 'Second wrapper', stations: [], createdAt: 0 } as unknown as import('../capacity').WhatIf, mine);
    void diffWhatIf;
    const wc = whatIfCapacity(cap, w);
    expect(wc.lanes).toHaveLength(2);
    const says = compareSays(analyse(cap), analyse(wc), 'Second wrapper');
    expect(says).toBe('With Second wrapper, the line would do 100 units/min instead of 50.1 (+50.1). Pallet wrapper still limits it. Still 49.8 short of the 150 target.');
  });
  it('the headline of several lines names the bottleneck and the gap — not "add the rest of the line"', async () => {
    const { shortSays } = await import('../capacitySays');
    expect(shortSays(analyse(his(2)))).toBe('Pallet wrapper limits at 50.1 units/min · 99.9 short of 150');
  });
  it('the all-products sheet lists each line’s stations by line', async () => {
    const { capacityReport } = await import('../capacity');
    const rep = capacityReport([{ name: 'Line 7', capacity: his(2) }]);
    expect(rep?.lines[0].rows.map(x => x.name)).toEqual(['Line A · bagger', 'Line A · P160 Pick & Place', 'Line A · palletiser', 'Line B · bagger', 'Line B · P160 Pick & Place', 'Line B · palletiser', 'Pallet wrapper']);
    expect(rep?.lines[0].rows.filter(x => x.limit).map(x => x.name)).toEqual(['Pallet wrapper']);
  });
  it('one more person at the wrapper — where the whole is held — lifts it', async () => {
    const { oneMorePerson } = await import('../capacity');
    const cap = his(2); const r = analyse(cap);
    const m = oneMorePerson(cap, r, 8, 21.8);
    expect(m?.station.name).toBe('Pallet wrapper');
    expect(m?.r.line).toBeCloseTo(100.2, 1);
  });
});
