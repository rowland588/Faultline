/* THE SPAGHETTI DIAGRAM (FC-004) — the independent cases of knowledge/specs/FC-004-spaghetti-diagram.md §6, worked by hand in scripts/knowledge/cases-kaizen.py
 * (sections S and S2) from the knowledge record's packer, never from the code's output. MTM-1: 5.3 TMU a foot × 0.036 s a TMU = 0.1908 s a foot = 1.597 m/s. */
import { describe, expect, it } from 'vitest';
import { PACE, legsOf, walkFigures, walkMoney, windowOf, type Place } from '../spaghetti';

const P = (name: string, m?: number, trip?: string, x?: number, y?: number): Place => ({ name, ...(m !== undefined ? { m } : {}), ...(trip ? { trip } : {}), ...(x !== undefined ? { x } : {}), ...(y !== undefined ? { y } : {}) });
/* the record's packer: to the film store and back (42 m each way), the case store and back (28), the scale and back (9) */
const PACKER: Place[] = [P('Line'), P('Film store', 42, 'Fetch film'), P('Line', 42, 'Fetch film'), P('Case store', 28, 'Fetch cases'), P('Line', 28, 'Fetch cases'), P('Scale', 9, 'Weigh'), P('Line', 9, 'Weigh')];

describe('the packer’s round (cases-kaizen.py S)', () => {
  const f = walkFigures(PACKER, { rounds: 36, ms: 1.3, shiftMin: 480 });
  it('158 m a round over 6 legs; 36 rounds a shift is 5,688 m', () => {
    expect(f.legs).toHaveLength(6);
    expect(f.round).toBe(158);
    expect(f.shiftM).toBe(5688);
  });
  it('at 1.3 m/s loaded that is 72.92 minutes (15.19% of a 480-minute shift); at 1.6 m/s unloaded 59.25 — the pace moves the minutes by a quarter', () => {
    expect(f.minutes).toBeCloseTo(72.9231, 4);
    expect(f.shareOfShift).toBeCloseTo(0.151923, 5);
    expect(f.minutesAt(PACE.unloaded.ms)).toBeCloseTo(59.25, 2);
    expect(PACE.unloaded.ms).toBe(1.6); expect(PACE.loaded.ms).toBe(1.3);
  });
  it('the film trips are 84 of the 158 m — 53.16% — then the cases 56 (35.44%) and the scale 18 (11.39%)', () => {
    expect(f.trips.map(t => [t.name, t.m])).toEqual([['Fetch film', 84], ['Fetch cases', 56], ['Weigh', 18]]);
    expect(f.trips[0].share).toBeCloseTo(0.531646, 5); expect(f.trips[1].share).toBeCloseTo(0.354430, 5); expect(f.trips[2].share).toBeCloseTo(0.113924, 5);
    expect(f.longest?.name).toBe('Fetch film');
  });
  it('film staged at the line, 6 m each way: 86 m a round, 3,096 m a shift, 39.69 minutes — 33.23 minutes saved', () => {
    const g = walkFigures([P('Line'), P('Film trolley', 6, 'Fetch film'), P('Line', 6, 'Fetch film'), P('Case store', 28, 'Fetch cases'), P('Line', 28, 'Fetch cases'), P('Scale', 9, 'Weigh'), P('Line', 9, 'Weigh')], { rounds: 36, ms: 1.3 });
    expect(g.round).toBe(86); expect(g.shiftM).toBe(3096); expect(g.minutes).toBeCloseTo(39.6923, 4);
    expect(f.minutes - g.minutes).toBeCloseTo(33.2308, 4);
  });
  it('the money: 72.92 minutes at £25 an hour is £30.38 a shift, £151.92 over five shifts; the saving £13.85 a shift', () => {
    const m = walkMoney(f.minutes, { rate: 25, shiftsPerWeek: 5 });
    expect(m.perShift).toBeCloseTo(30.3846, 4); expect(m.perWeek).toBeCloseTo(151.9231, 4); expect(m.missing).toEqual([]);
    expect(walkMoney(33.2308, { rate: 25 }).perShift).toBeCloseTo(13.8462, 4);
  });
  it('every input optional: no wage is named, no shifts a week is named, nothing invented', () => {
    expect(walkMoney(72.9, {}).missing[0]).toMatch(/wage/);
    const m = walkMoney(72.9, { rate: 25 });
    expect(m.perShift).toBeDefined(); expect(m.perWeek).toBeUndefined(); expect(m.missing[0]).toMatch(/shifts a week/);
  });
});

describe('a leg’s length', () => {
  it('is the metres walked when typed, else the straight line between two positions — a 3-4-5 leg is 5 m; the layout’s legs 30, 30, 16, 16 are 92 m', () => {
    const legs = legsOf([P('A', undefined, undefined, 0, 0), P('B', undefined, undefined, 3, 4)]);
    expect(legs[0].m).toBe(5); expect(legs[0].source).toBe('straight');
    const loop = walkFigures([P('Line', undefined, undefined, 30, 0), P('Film store', undefined, undefined, 0, 0), P('Line', undefined, undefined, 30, 0), P('Scale', undefined, undefined, 30, 16), P('Line', undefined, undefined, 30, 0)], { rounds: 10, ms: 1.5 });
    expect(loop.round).toBe(92); expect(loop.shiftM).toBe(920); expect(loop.straight).toEqual([1, 2, 3, 4]);
    expect(loop.minutes).toBeCloseTo(10.2222, 4);
  });
  it('a typed length wins over the straight line (a guard or a bench is in the way)', () => {
    const legs = legsOf([P('A', undefined, undefined, 0, 0), P('B', 9, undefined, 3, 4)]);
    expect(legs[0].m).toBe(9); expect(legs[0].source).toBe('walked');
  });
  it('with neither it has no length, is named, and is left out of the sums — never given one', () => {
    const f = walkFigures([P('A'), P('B', 10), P('C')], { rounds: 2, ms: 1.3 });
    expect(f.missing).toEqual([2]); expect(f.round).toBe(10); expect(f.shiftM).toBe(20);
  });
  it('legs with no trip name are each their own trip, “from → to”', () => {
    expect(walkFigures([P('Line'), P('Store', 5), P('Line', 5)], { rounds: 1, ms: 1.3 }).trips.map(t => t.name)).toEqual(['Line → Store', 'Store → Line']);
  });
});

describe('the drawing’s window keeps one metre one length', () => {
  it('pads the placed places and keeps the shape between 1 : 2.5 and 2.5 : 1', () => {
    const w = windowOf([{ x: 0, y: 0 }, { x: 30, y: 16 }]);
    expect(w.x0).toBeLessThan(0); expect(w.x1).toBeGreaterThan(30);
    const flat = windowOf([{ x: 0, y: 0 }, { x: 100, y: 1 }]);
    expect((flat.x1 - flat.x0) / (flat.y1 - flat.y0)).toBeCloseTo(2.5, 6);
    const tall = windowOf([{ x: 0, y: 0 }, { x: 1, y: 100 }]);
    expect((tall.y1 - tall.y0) / (tall.x1 - tall.x0)).toBeCloseTo(2.5, 6);
  });
});
