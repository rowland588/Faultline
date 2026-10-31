/* Critical path and float (FC-215) against networks whose answers were worked out another way: scripts/knowledge/cases-calc.py §FC-215
 * lists every start-to-end path (the longest is the end, a task's float is the end less the longest path through it) — it does not
 * run the forward and backward passes this module does. */
import { describe, expect, it } from 'vitest';
import { criticalPath, slip, type CpmTask } from '../criticalPath';

const net = (spec: Record<string, [number, string[]]>): CpmTask[] => Object.entries(spec).map(([id, [days, after]]) => ({ id, days, after }));
const ok = (t: CpmTask[]) => { const r = criticalPath(t); if (!r.ok) throw new Error(r.error); return r; };
const floats = (t: CpmTask[]) => Object.fromEntries(ok(t).rows.map(r => [r.id, r.float]));

/* P1 — the knowledge record's network */
const P1 = net({ A: [10, []], B: [14, []], C: [5, ['A']], D: [4, ['B']], E: [6, ['C']], F: [8, ['D']], G: [5, ['E', 'F']], H: [2, ['G']] });
const P2 = net({ A: [3, []], B: [4, ['A']], C: [2, ['A']], D: [5, ['B']], E: [1, ['C']], F: [6, ['C']], G: [4, ['D', 'E']], H: [3, ['F', 'G']] });
const P3 = net({ A: [2, []], B: [3, ['A']], C: [4, ['A']], D: [2, ['B']], E: [3, ['B', 'C']], F: [5, ['C']], G: [2, ['D', 'E']], H: [1, ['F', 'G']] });

describe('the two passes', () => {
  it('P1: the end is day 33, the labeller’s chain is critical and the filler’s has 5 days’ float', () => {
    const r = ok(P1);
    expect(r.end).toBe(33);
    expect(r.paths).toEqual([['B', 'D', 'F', 'G', 'H']]);
    expect(floats(P1)).toEqual({ A: 5, B: 0, C: 5, D: 0, E: 5, F: 0, G: 0, H: 0 });
    const g = r.rows.find(x => x.id === 'G')!;
    expect([g.es, g.ef, g.ls, g.lf]).toEqual([26, 31, 26, 31]);
    const e = r.rows.find(x => x.id === 'E')!;
    expect([e.es, e.ef, e.ls, e.lf]).toEqual([15, 21, 20, 26]);
  });

  it('P2: one critical path A-B-D-G-H, side tasks with 5, 6 and 5 days', () => {
    const r = ok(P2);
    expect(r.end).toBe(19);
    expect(r.paths).toEqual([['A', 'B', 'D', 'G', 'H']]);
    expect(floats(P2)).toEqual({ A: 0, B: 0, C: 5, D: 0, E: 6, F: 5, G: 0, H: 0 });
  });

  it('P3: two chains tie, both are found, B has a day and D two', () => {
    const r = ok(P3);
    expect(r.end).toBe(12);
    expect([...r.paths].sort()).toEqual([['A', 'C', 'E', 'G', 'H'], ['A', 'C', 'F', 'H']]);
    expect(floats(P3)).toEqual({ A: 0, B: 1, C: 0, D: 2, E: 0, F: 0, G: 0, H: 0 });
  });

  it('does not depend on the order the tasks are given in', () => {
    const shuffled = [...P1].reverse();
    expect(ok(shuffled).end).toBe(33);
    expect(Object.fromEntries(ok(shuffled).rows.map(r => [r.id, r.float]))).toEqual(floats(P1));
  });

  it('a single task, a milestone, and tasks waiting on nothing', () => {
    expect(ok(net({ A: [4, []] })).paths).toEqual([['A']]);
    const free = net({ A: [10, []], B: [3, []] });
    expect(ok(free).end).toBe(10);
    expect(floats(free)).toEqual({ A: 0, B: 7 });
    const milestone = net({ A: [5, []], M: [0, ['A']], B: [2, ['M']] });
    expect(ok(milestone).end).toBe(7);
    expect(ok(milestone).paths).toEqual([['A', 'M', 'B']]);
  });

  it('half days add without dust', () => {
    const t = net({ A: [0.1, []], B: [0.2, ['A']], C: [0.4, ['A']] });
    const r = ok(t);
    expect(r.end).toBe(0.5);
    expect(floats(t)).toEqual({ A: 0, B: 0.2, C: 0 });
  });

  it('repeating a predecessor does not count it twice', () => {
    expect(ok(net({ A: [2, []], B: [3, ['A', 'A']] })).end).toBe(5);
  });
});

describe('what it refuses', () => {
  it('a loop, with the loop named', () => {
    const r = criticalPath(net({ A: [1, ['C']], B: [1, ['A']], C: [1, ['B']], D: [1, []] }));
    expect(r.ok).toBe(false);
    if (!r.ok && r.error === 'cycle') { expect(r.cycle[0]).toBe(r.cycle[r.cycle.length - 1]); expect(new Set(r.cycle)).toEqual(new Set(['A', 'B', 'C'])); expect(r.cycle.length).toBe(4); }
    else throw new Error('not a cycle');
  });
  it('a task waiting for itself', () => {
    const r = criticalPath(net({ A: [1, ['A']] }));
    expect(r).toMatchObject({ ok: false, error: 'cycle' });
  });
  it('a task waiting for one that is not there, a repeated id, and nothing', () => {
    expect(criticalPath(net({ A: [1, ['Z']] }))).toMatchObject({ ok: false, error: 'unknown', id: 'A', waitsFor: 'Z' });
    expect(criticalPath([{ id: 'A', days: 1, after: [] }, { id: 'A', days: 2, after: [] }])).toMatchObject({ ok: false, error: 'duplicate', id: 'A' });
    expect(criticalPath([])).toMatchObject({ ok: false, error: 'empty' });
  });
});

describe('a slip', () => {
  it('P4: a task late by d moves the end by max(0, d − float), as listing the paths again says', () => {
    expect(slip(P1, 'B', 3)).toEqual({ end: 36, moved: 3, float: 0, used: 0 });
    expect(slip(P1, 'A', 3)).toEqual({ end: 33, moved: 0, float: 5, used: 3 });
    expect(slip(P1, 'A', 8)).toEqual({ end: 36, moved: 3, float: 5, used: 5 });
  });
  it('the rule holds for every task of every network, for several sizes of slip', () => {
    for (const net of [P1, P2, P3]) {
      const base = ok(net);
      for (const t of net) for (const d of [0, 1, 2.5, 7]) {
        const s = slip(net, t.id, d)!;
        const f = base.rows.find(r => r.id === t.id)!.float;
        expect(s.moved).toBeCloseTo(Math.max(0, d - f), 9);
        expect(s.end).toBeCloseTo(base.end + s.moved, 9);
      }
    }
  });
  it('an unknown task or a broken network has no slip', () => {
    expect(slip(P1, 'Z', 2)).toBeUndefined();
    expect(slip(net({ A: [1, ['A']] }), 'A', 2)).toBeUndefined();
  });
});
