import { describe, expect, it } from 'vitest';
import { analyse, type Capacity } from '../capacity';
import { loadOf, loadSays } from '../capacityLoad';

/* Rowland's example: 70 ppm, 6 in a tray, each unit 1.25 kg — a tray reaches the packer every 5.14 s and weighs 7.5 kg; 700 trays and 5,250 kg an hour (his sheet divides this by 6) */
const cap = (perTray: number, kg: number, ppm = 70): Capacity => ({ unitKg: kg, stations: [
  { id: 's1', name: 'Filling', kind: 'machine', unit: 'units', contains: 1, ratePer: 'min', crew: 1, rate: ppm, source: 'plate' },
  { id: 's2', name: 'Packer', kind: 'people', unit: 'trays', contains: perTray, ratePer: 'min', crew: 1, source: 'timed' },
] });
describe('the weight a person handles', () => {
  it('70 ppm, 6 in a tray, 1.25 kg a unit', () => {
    const c = cap(6, 1.25), r = analyse(c), l = loadOf(r, c, c.stations[1]);
    expect(l?.itemKg).toBeCloseTo(7.5, 9);
    expect(l?.everySec).toBeCloseTo(60 / (70 / 6), 6);
    expect(l?.perHour).toBeCloseTo(700, 6);
    expect(l?.kgPerHour).toBeCloseTo(5250, 6);
    expect(loadSays(l!)).toBe('A tray weighs 7.5 kg (6 × 1.25 kg) and reaches them every 5.1 s — 700 trays and 5,250 kg an hour.');
  });
  it('the other three rows of the sheet, worked as "weight is per unit"', () => {
    const rows = [[70, 8, 2, 8400], [75, 10, 2, 9000], [70, 4, 1.75, 7350]] as const;
    for (const [ppm, per, kg, kgHr] of rows) {
      const c = cap(per, kg, ppm), l = loadOf(analyse(c), c, c.stations[1]);
      expect(l?.kgPerHour).toBeCloseTo(kgHr, 6);
    }
    /* four lines at once: 5,250 + 8,400 + 9,000 + 7,350 */
    expect(5250 + 8400 + 9000 + 7350).toBe(30000);
  });
  it('shared by a crew; nothing for a machine, a first station, or no weight typed', () => {
    const c = { ...cap(6, 1.25), stations: [cap(6, 1.25).stations[0], { ...cap(6, 1.25).stations[1], crew: 2 }] };
    expect(loadSays(loadOf(analyse(c), c, c.stations[1])!)).toMatch(/2,625 kg an hour each between 2/);
    expect(loadOf(analyse(c), c, c.stations[0])).toBeUndefined();
    expect(loadOf(analyse({ stations: c.stations }), { stations: c.stations }, c.stations[1])).toBeUndefined();
  });
});
