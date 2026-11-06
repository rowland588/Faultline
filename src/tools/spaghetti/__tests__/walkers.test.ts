/* FC-004 part 2 against the independent case S3 (scripts/knowledge/cases-kaizen.py): three operators from the packing line. */
import { describe, expect, it } from 'vitest';
import { cleanWalker, sceneOf, toScale, walkersFigures, walkersShift, type Walker } from '../walkers';

const L = 'Packing line';
const S3: Walker[] = [
  { label: 'Operator 1', steps: [{ place: L }, { place: 'Film store', m: 40 }, { place: L, m: 40 }, { place: 'Case store', m: 25 }, { place: L, m: 25 }] },
  { label: 'Operator 2', steps: [{ place: L }, { place: 'Scale', m: 9 }, { place: L, m: 9 }, { place: 'Film store', m: 40 }, { place: L, m: 40 }] },
  { label: 'Operator 3', steps: [{ place: L }, { place: 'Case store', m: 25 }, { place: L, m: 25 }] },
];
const noMetres = (ws: Walker[]): Walker[] => ws.map(w => ({ label: w.label, steps: w.steps.map(s => ({ place: s.place })) }));

describe('several walkers, the hand-worked case S3', () => {
  const f = walkersFigures(S3);
  it('each walker and together', () => {
    expect(f.walkers.map(w => [w.label, w.legs, w.m])).toEqual([['Operator 1', 4, 130], ['Operator 2', 4, 98], ['Operator 3', 2, 50]]);
    expect([f.legs, f.m, f.complete]).toEqual([10, 278, true]);
  });
  it('who walks most, the busiest place, the shared routes', () => {
    expect(f.most).toMatchObject({ label: 'Operator 1', by: 'metres', value: 130 });
    expect(f.most?.share).toBeCloseTo(130 / 278, 6);
    expect(f.arrivals).toEqual([{ place: L, n: 5 }, { place: 'Film store', n: 2 }, { place: 'Case store', n: 2 }, { place: 'Scale', n: 1 }]);
    expect(f.busiest).toEqual({ place: L, n: 5 });
    expect(f.routes.map(r => [r.a, r.b, r.walkers, r.m])).toEqual([
      ['Film store', L, ['Operator 1', 'Operator 2'], 160], ['Case store', L, ['Operator 1', 'Operator 3'], 100]]);
    expect(160 / 278).toBeCloseTo(0.57554, 4); expect(100 / 278).toBeCloseTo(0.35971, 4);
  });
  it('a shift: 10 rounds at 1.3 m/s and £25 an hour', () => {
    const s = walkersShift(f, { rounds: 10, pace: 'loaded', rate: 25 });
    expect(s.shiftM).toBe(2780);
    expect(s.minutes).toBeCloseTo(35.641, 3);
    expect(s.perWalker.map(w => +w.minutes.toFixed(1))).toEqual([16.7, 12.6, 6.4]);
    expect(s.money.perShift).toBeCloseTo(14.8504, 4);
  });
});

describe('the same names with no metres', () => {
  const f = walkersFigures(noMetres(S3));
  it('counts moves, not metres, and says so', () => {
    expect([f.legs, f.m, f.complete, f.missing]).toEqual([10, 0, false, 10]);
    expect(f.most).toMatchObject({ label: 'Operator 1', by: 'moves', value: 4 });
    expect(f.most?.share).toBeCloseTo(0.4, 6);
    expect(f.busiest).toEqual({ place: L, n: 5 });
    expect(f.routes).toHaveLength(2);
    expect(f.routes.every(r => !r.complete)).toBe(true);
  });
});

describe('legs, places and the drawing', () => {
  it('a place repeated straight after itself is standing still, not a move', () => {
    const w = cleanWalker({ label: 'A', steps: [{ place: 'Line' }, { place: ' line ' }, { place: 'Store', m: 5 }, { place: '' }] });
    expect(w.steps.map(s => s.place)).toEqual(['Line', 'Store']);
  });
  it('positions give a straight line only when both ends have one', () => {
    const f = walkersFigures([{ label: 'A', steps: [{ place: 'X', x: 0, y: 0 }, { place: 'Y', x: 30, y: 40 }, { place: 'Z' }] }]);
    expect(f.walkers[0].legList.map(l => [l.m, l.source])).toEqual([[50, 'straight'], [undefined, 'none']]);
  });
  it('is to scale only when every place walked has a position', () => {
    const at = (x: number, y: number) => ({ x, y });
    const all: Walker[] = [{ label: 'A', steps: [{ place: 'X', ...at(0, 0) }, { place: 'Y', ...at(30, 0) }] }, { label: 'B', steps: [{ place: 'X', ...at(0, 0) }, { place: 'Z', ...at(0, 16) }] }];
    expect(toScale(all)).toBe(true);
    expect(sceneOf(all).toScale).toBe(true);
    const one = JSON.parse(JSON.stringify(all)) as Walker[]; delete one[1].steps[1].y;
    expect(toScale(one)).toBe(false);
    expect(sceneOf(one).toScale).toBe(false);
  });
  it('a schematic puts each place once on a circle and each walker on a line of their own', () => {
    const sc = sceneOf(S3);
    expect(sc.toScale).toBe(false);
    expect(sc.dots.map(d => d.label)).toEqual([L, 'Film store', 'Case store', 'Scale']);
    expect(sc.dots[0].y).toBeCloseTo(1, 6);
    expect(new Set(sc.lines.map(l => l.walker))).toEqual(new Set([0, 1, 2]));
    expect(sc.lines.filter(l => l.label).map(l => l.label)).toEqual(['Operator 1', 'Operator 2', 'Operator 3']);
    /* two people on the line-film route are two separate lines */
    const a = sc.lines.find(l => l.walker === 0)!.points, b = sc.lines.find(l => l.walker === 1 && l.points[0][0] !== undefined)!.points;
    expect(a).not.toEqual(b);
  });
});
