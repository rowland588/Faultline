/* FC-034 part 5 — the products of a line (knowledge/specs/FC-034-products-on-a-line.md §6, hand-worked).
 * filler 120, bagger 100, sealer S, wrapper W: 1.25 kg S 90 W 50 → 50 (wrapper); 1.75 kg S 36 → 36 (sealer); 2 kg S 30 → 30 (sealer). */
import { describe, expect, it } from 'vitest';
import { analyse, productRows, syncWhatIfs, withWhatIfStations, whatIfCapacity, type Capacity, type Station, type WhatIf } from '../capacity';

const m = (id: string, rate: number): Station => ({ id, kind: 'machine', name: id, rate, ratePer: 'min', unit: 'units', source: 'plate', contains: 1, goodPct: 100, runningPct: 100, crew: 1 }) as Station;
const line = (): Capacity => ({ targetPerMin: 60, stations: [m('filler', 120), m('bagger', 100), m('sealer', 90), m('wrapper', 50)] } as Capacity);
const product = (cap: Capacity, id: string, name: string, speeds: Record<string, number>, target?: number): Capacity => {
  const w: WhatIf = withWhatIfStations(cap.stations, { id, name, stations: [], product: true, ...(target != null ? { targetPerMin: target } : {}), createdAt: 1 }, cap.stations.map(s => (speeds[s.id] != null ? { ...s, rate: speeds[s.id] } : s)));
  return { ...cap, whatIfs: [...(cap.whatIfs ?? []), w] };
};

describe('the products of a line', () => {
  it('the hand-worked case: 50 by the wrapper, 36 and 30 by the sealer, against 60, 40 and 50', () => {
    let cap = line();
    cap = product(cap, 'p2', '1.75 kg', { sealer: 36 }, 40);
    cap = product(cap, 'p3', '2 kg', { sealer: 30 }, 50);
    const rows = productRows(cap, '1.25 kg')!;
    expect(rows.map(x => [x.name, x.r.line, x.r.limit?.station.name, x.target])).toEqual([['1.25 kg', 50, 'wrapper', 60], ['1.75 kg', 36, 'sealer', 40], ['2 kg', 30, 'sealer', 50]]);
    expect(rows.map(x => x.says)).toEqual([
      '50 units/min · held by wrapper — 10 short of 60',
      '36 units/min · held by sealer — 4 short of 40',
      '30 units/min · held by sealer — 20 short of 50']);
  });
  it('a station added to the line is in every product: the labeller at 45 holds the 1.25 kg', () => {
    let cap = line();
    cap = product(cap, 'p2', '1.75 kg', { sealer: 36 }, 40);
    const next: Capacity = syncWhatIfs(cap, { ...cap, stations: [...cap.stations.slice(0, 3), m('labeller', 45), cap.stations[3]].map((s, i) => (i === 4 ? { ...s, rate: 80 } : s)) });
    const rows = productRows(next, '1.25 kg')!;
    expect(rows[0].r.line).toBe(45); expect(rows[0].r.limit?.station.name).toBe('labeller');
    expect(rows[1].r.line).toBe(36); expect(rows[1].r.limit?.station.name).toBe('sealer');
    expect(whatIfCapacity(next, next.whatIfs![0]).stations.some(s => s.id === 'labeller')).toBe(true);
  });
  it('a product with no name is "Product 2"; a line with no products has no rows', () => {
    const cap = product(line(), 'p2', '', { sealer: 36 });
    expect(productRows(cap, 'Maris')![1].name).toBe('Product 2');
    expect(productRows(line(), 'Maris')).toBeUndefined();
  });
  it('a what-if that is not a product is never a row', () => {
    const cap = line(); const w = withWhatIfStations(cap.stations, { id: 'w', name: 'New basketer', stations: [], createdAt: 1 }, cap.stations);
    expect(productRows({ ...cap, whatIfs: [w] }, 'Maris')).toBeUndefined();
    expect(analyse(cap).line).toBe(50);
  });
});
