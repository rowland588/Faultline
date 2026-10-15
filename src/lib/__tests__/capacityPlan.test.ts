/* THE WAY TO THE TARGET and THE SHAPE OF THE LINE — Rowland's two lines into
 * one wrapper, 15 October: 150 a minute for both together, Line A and Line B
 * the same, one palletiser each, one person wrapping for both. */
import { describe, expect, it } from 'vitest';
import { analyse, vCurve, type Capacity, type Station } from '../capacity';
import { planToTarget } from '../capacityPlan';
import { chainOf, lanesAlike, mergeAfterOf, reshape } from '../capacityLines';

const machine = (id: string, name: string, rate: number): Station => ({ id, name, kind: 'machine', unit: 'units', contains: 1, rate, ratePer: 'min', crew: 1, source: 'plate', runningPct: 100, goodPct: 100 });
const chain: Capacity = {
  targetPerMin: 150,
  stations: [
    machine('bag', 'bagger', 160), machine('pp', 'P160 Pick & Place', 140),
    { id: 'pal', name: 'palletiser', kind: 'people', unit: 'baskets', contains: 10, cycleSec: 16, perCycle: 2, ratePer: 'min', crew: 1, source: 'standard', runningPct: 91, allowancePct: 10, goodPct: 100 },
    { id: 'wrap', name: 'Pallet wrapper', kind: 'people', unit: 'pallets', contains: 36, cycleSec: 720, perCycle: 2, cycleIn: 'min', ratePer: 'min', crew: 1, source: 'estimate', runningPct: 91, goodPct: 100 },
  ],
};
let n = 0; const uid = () => `u${++n}`;
const two = reshape(chain, 2, 3, uid);

describe('the shape of the line', () => {
  it('two lines, merging after the third station, copies of each other', () => {
    expect(two.lanes?.map(l => l.name)).toEqual(['Line A', 'Line B']);
    const a = two.stations.filter(s => s.lane === two.lanes?.[0].id), b = two.stations.filter(s => s.lane === two.lanes?.[1].id);
    expect(a.map(s => s.name)).toEqual(['bagger', 'P160 Pick & Place', 'palletiser']);
    expect(b.map(s => s.name)).toEqual(a.map(s => s.name));
    expect(new Set([...a, ...b].map(s => s.id)).size).toBe(6);
    expect(two.stations.filter(s => !s.lane).map(s => s.name)).toEqual(['Pallet wrapper']);
    expect(mergeAfterOf(two)).toBe(3);
  });
  it('four lines, then back to one chain with nothing lost', () => {
    const four = reshape(two, 4, 3, uid);
    expect(four.lanes?.map(l => l.name)).toEqual(['Line A', 'Line B', 'Line C', 'Line D']);
    expect(four.stations).toHaveLength(13);
    expect(chainOf(reshape(four, 1, 3, uid)).map(s => s.name)).toEqual(['bagger', 'P160 Pick & Place', 'palletiser', 'Pallet wrapper']);
  });
  it('a line already as long as the merge point is kept, with what was typed on it', () => {
    const typed: Capacity = { ...two, stations: two.stations.map(s => (s.lane === two.lanes?.[1].id && s.name === 'bagger' ? { ...s, rate: 90 } : s)) };
    const three = reshape(typed, 3, 3, uid);
    expect(three.stations.find(s => s.lane === typed.lanes?.[1].id && s.name === 'bagger')?.rate).toBe(90);
  });
  it('moving the merge earlier makes the later stations shared; later pulls them into each line', () => {
    const early = reshape(two, 2, 2, uid);
    expect(early.stations.filter(s => !s.lane).map(s => s.name)).toEqual(['palletiser', 'Pallet wrapper']);
    expect(mergeAfterOf(early)).toBe(2);
    const late = reshape(two, 2, 4, uid);
    expect(late.stations.filter(s => !s.lane)).toHaveLength(0);
  });
  it('what was typed on a line is kept when the merge moves later or earlier (15 October: "doesn\u2019t work")', () => {
    const typed: Capacity = { ...two, stations: two.stations.map(s => (s.lane === two.lanes?.[1].id && s.name === 'bagger' ? { ...s, rate: 90 } : s)) };
    const late = reshape(typed, 2, 4, uid);
    expect(late.stations.find(s => s.lane === typed.lanes?.[1].id && s.name === 'bagger')?.rate).toBe(90);
    expect(late.stations.filter(s => s.lane === typed.lanes?.[1].id).map(s => s.name)).toEqual(['bagger', 'P160 Pick & Place', 'palletiser', 'Pallet wrapper']);
    const early = reshape(typed, 2, 2, uid);
    expect(early.stations.find(s => s.lane === typed.lanes?.[1].id && s.name === 'bagger')?.rate).toBe(90);
  });
  it('lines of different lengths still merge where asked — never locked', () => {
    const extra: Capacity = { ...two, stations: [...two.stations.slice(0, 6), { ...two.stations[5], id: 'x', name: 'labeller' }, ...two.stations.slice(6)] };
    expect(mergeAfterOf(extra)).toBe(3);
    const moved = reshape(extra, 2, 2, uid);
    expect(mergeAfterOf(moved)).toBe(2);
    expect(moved.stations.filter(s => s.lane === extra.lanes?.[1].id).map(s => s.name)).toEqual(['bagger', 'P160 Pick & Place']);
  });
  it('lines alike are known as alike, and stop being so once one is changed', () => {
    expect(lanesAlike(two)).toBe(true);
    expect(lanesAlike({ ...two, stations: two.stations.map(s => (s.lane === two.lanes?.[1].id && s.name === 'bagger' ? { ...s, rate: 90 } : s)) })).toBe(false);
  });
  it('lines that do not merge add up', () => {
    const r = analyse(reshape(chain, 2, 4, uid));
    expect(r.line).toBeCloseTo(2 * analyse({ stations: chain.stations }).line!, 6);
  });
});

describe('the V of each line is drawn', () => {
  it('every section and the merge has its bottleneck among its columns', () => {
    const r = analyse(two);
    for (const x of [...r.lanes!.sections.map(s => s.result), r.lanes!.merged!]) {
      const v = vCurve(x, 10);
      expect(v.points.length).toBeGreaterThan(0);
      expect(v.limit).toBeTruthy();
    }
  });
});

describe('the way to the target', () => {
  it('his two lines: 2 on each palletiser, 3 at the wrapper, and the target met', () => {
    const p = planToTarget(two)!;
    expect(p.reached).toBe(true);
    expect(p.before).toBeCloseTo(50.1, 1);
    const by = Object.fromEntries(p.steps.map(s => [s.name, s.to]));
    expect(by['Pallet wrapper']).toBe(3);
    expect(by['palletiser (Line A)']).toBe(2);
    expect(by['palletiser (Line B)']).toBe(2);
    expect(p.people).toBe(2 + 1 + 1);
    expect(p.after).toBeGreaterThanOrEqual(150);
    expect(p.sentence).toMatch(/^To make 150 units\/min: /);
    /* applying it is the same answer the page gives */
    const done = analyse({ ...two, stations: two.stations.map(s => ({ ...s, crew: p.crews[s.id] ?? s.crew })) });
    expect(done.line).toBeCloseTo(p.after, 6);
  });
  it('a single chain is planned the same way, with no line named', () => {
    const p = planToTarget(chain)!;
    expect(p.steps.every(s => !s.name.includes('('))).toBe(true);
    expect(p.reached).toBe(true);
  });
  it('no target, nothing to plan; already met, said so', () => {
    expect(planToTarget({ ...chain, targetPerMin: undefined })).toBeUndefined();
    const met = planToTarget({ ...chain, targetPerMin: 20 })!;
    expect(met.steps).toEqual([]);
    expect(met.sentence).toMatch(/already makes/);
  });
  it('a target no crew can reach stops and says why', () => {
    const p = planToTarget({ ...chain, targetPerMin: 100000 })!;
    expect(p.reached).toBe(false);
    expect(p.stuck).toBeTruthy();
  });
});
