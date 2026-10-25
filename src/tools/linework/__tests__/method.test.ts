/* THE LINE BALANCE'S MODES — time study, allowance, combination table, person–machine, order of the work, ECRS,
 * standard data (knowledge/specs/FC-032-line-balance.md). Every number is from scripts/knowledge/cases-time.py
 * (plain arithmetic and SciPy), never from this code's own output. */
import { describe, it, expect } from 'vitest';
import { balance, element, suggest, balanceSays } from '../balance';
import { allowanceOf, allowanceMoney, allowanceSays, partsProblem } from '../allowance';
import { runTimeline, combination, tendInput, tend, tendSays, waitMoney } from '../timeline';
import { findLoop, wouldLoop, positionalWeights, rankedPositional, brokenOrder } from '../order';
import { improve, improveMoney, improveSays, improveMoneySays } from '../improve';
import { libraryFrom, matchRows, reuseOf, reusedSays } from '../standardData';
import type { BalanceStep, ToolStudy } from '../../../lib/study';

const laps = (xs: number[]) => xs.map((sec, i) => ({ id: `l${i}`, sec, at: i }));
const st = (id: string, name: string, who: string, o: Partial<BalanceStep> = {}, order = 0): BalanceStep => ({ id, order, name, who, ...o });

describe('a timed element: how sure, rated, allowed (FC-019)', () => {
  it('six laps 6.1 5.9 6.0 6.2 5.8 6.0 rated 110 at 14%: mean 6.0, basic 6.600, standard 7.524, ±2.47% at 95% (SciPy t 2.571)', () => {
    const e = element(st('a', 'Seal', 'Op 1', { rating: 110, laps: laps([6.1, 5.9, 6.0, 6.2, 5.8, 6.0]) }), 0.14);
    expect(e.observed).toBeCloseTo(6.0, 6);
    expect(e.basic).toBeCloseTo(6.6, 6);
    expect(e.standard).toBeCloseTo(7.524, 6);
    expect(e.margin).toBeCloseTo(0.0247, 4);
    expect(e.rated).toBe(true);
    expect(e.enough).toBe(true);
  });
  it('four laps 4.0 4.4 4.2 4.1: ±6.51% at 95% (t at 3 df 3.182), seven cycles needed, short', () => {
    const e = element(st('a', 'Seal', 'Op 1', { laps: laps([4.0, 4.4, 4.2, 4.1]) }));
    expect(e.margin).toBeCloseTo(0.0651, 3);
    expect(e.needed).toBe(7);
    expect(e.enough).toBe(false);
    expect(e.rated).toBe(false);          // never rated: taken at 100, and says so
    expect(e.rating).toBe(100);
  });
  it('one lap has no margin; laps all equal have a margin of nought', () => {
    expect(element(st('a', 'x', 'Op 1', { laps: laps([5]) })).margin).toBeUndefined();
    expect(element(st('a', 'x', 'Op 1', { laps: laps([5, 5, 5, 5, 5]) })).margin).toBe(0);
  });
  it('a machine’s run is never rated and carries no allowance', () => {
    const e = element(st('m', 'Sealer runs', 'Op 1', { kind: 'machine', rating: 125, laps: laps([30, 30, 30, 30, 30]) }), 0.15);
    expect([e.rating, e.rated, e.standard, e.basic]).toEqual([100, false, 30, 30]);
  });
});

describe('the allowance from its parts (FC-025)', () => {
  const parts = [['Personal needs', 5], ['Basic fatigue', 4], ['Standing', 2], ['Load', 1], ['Monotony', 1], ['Noise', 2]].map(([name, pct], i) => ({ id: `p${i}`, name: name as string, pct: pct as number }));
  it('5+4+2+1+1+2 = 15%: a 42.0 s basic time is 48.300 s standard, 74.5 an hour', () => {
    expect(allowanceOf({ parts })).toBeCloseTo(0.15, 10);
    const e = element(st('a', 'Pack', 'Op 1', { laps: laps([42, 42, 42, 42, 42]) }), allowanceOf({ parts }));
    expect(e.standard).toBeCloseTo(48.3, 6);
    expect(3600 / (e.standard ?? 1)).toBeCloseTo(74.53, 2);
  });
  it('parts win over the one figure; with none the one figure stands; none is nought', () => {
    expect(allowanceOf({ allowance: 0.1, parts })).toBeCloseTo(0.15, 10);
    expect(allowanceOf({ allowance: 0.1 })).toBe(0.1);
    expect(allowanceOf(undefined)).toBe(0);
  });
  it('in money: 6.30 s of every piece, £0.02625 a pack, £7.875 an hour at a 12 s takt and £15 an hour', () => {
    const f = balance([st('a', 'Pack', 'Op 1', { laps: laps([42, 42, 42, 42, 42]) })], { taktSec: 12, parts, allowance: 0.15 });
    const m = allowanceMoney(f, { parts }, 15);
    expect(m.perPack).toBeCloseTo(0.02625, 5);
    expect(m.perHour).toBeCloseTo(7.875, 3);
    expect(m.text).toMatch(/rest the job needs, not waste/);
  });
  it('no rate: the one input is named, nothing withheld otherwise', () => {
    const f = balance([st('a', 'Pack', 'Op 1', { laps: laps([42, 42, 42, 42, 42]) })], { taktSec: 12, allowance: 0.15 });
    expect(allowanceMoney(f, { allowance: 0.15 }, undefined).missing).toMatch(/hourly rate in Line capacity/);
  });
  it('wrong parts are named: no name, a negative, a hundred or more; over 25% carries the rule of thumb', () => {
    expect(partsProblem([{ id: 'a', name: '', pct: 3 }])).toMatch(/Name each part/);
    expect(partsProblem([{ id: 'a', name: 'x', pct: -1 }])).toMatch(/nought or more/);
    expect(partsProblem([{ id: 'a', name: 'x', pct: 60 }, { id: 'b', name: 'y', pct: 40 }])).toMatch(/100% or more/);
    expect(partsProblem(parts)).toBe('');
    expect(allowanceSays({ parts: [{ id: 'a', name: 'Cold room', pct: 30 }] })).toMatch(/redesigning/);
    expect(allowanceSays({ parts })).toBe('15% allowance — personal needs 5, basic fatigue 4, standing 2, load 1, monotony 1, noise 2.');
  });
});

describe('the combination table (FC-007)', () => {
  const els = (xs: [string, 'work' | 'walk' | 'wait' | 'machine', number][]) => xs.map(([name, kind, standard], i) => ({ id: `e${i}`, name, kind, standard, source: 'typed' as const }));
  it('load 10, the machine runs 30, inspect 12, walk 4: the person ends at 26, the machine at 40, the cycle 40, the person waits 14 s, the machine is busy 75%', () => {
    const t = runTimeline(els([['Load', 'work', 10], ['Sealer runs', 'machine', 30], ['Inspect', 'work', 12], ['Walk', 'walk', 4]]));
    expect([t.personEnd, t.machineEnd, t.cycle, t.personWaits, t.machineWaits, t.auto]).toEqual([26, 40, 40, 14, 0, 30]);
    expect(t.segs.map(s => [s.start, s.end])).toEqual([[0, 10], [10, 40], [10, 22], [22, 26]]);
    expect(t.auto / t.cycle).toBe(0.75);
  });
  it('load 10, the machine runs 8, pack 20, walk 3: the machine is done at 18, the person at 33; the machine waits 15 s', () => {
    const t = runTimeline(els([['Load', 'work', 10], ['Runs', 'machine', 8], ['Pack', 'work', 20], ['Walk', 'walk', 3]]));
    expect([t.personEnd, t.machineEnd, t.cycle, t.personWaits, t.machineWaits]).toEqual([33, 18, 33, 0, 15]);
  });
  it('two machine steps in a row run one after the other', () => {
    const t = runTimeline(els([['Load', 'work', 5], ['Heat', 'machine', 10], ['Cool', 'machine', 6]]));
    expect(t.segs.map(s => [s.start, s.end])).toEqual([[0, 5], [5, 15], [15, 21]]);
    expect(t.cycle).toBe(21);
  });
  it('no machine step: the cycle is the sum, as before', () => {
    expect(runTimeline(els([['a', 'work', 4], ['b', 'walk', 3]])).cycle).toBe(7);
  });
  it('in the balance: the person’s cycle is the longer of the two, the wait is theirs, the Yamazumi parts end with it', () => {
    const f = balance([
      st('a', 'Load', 'Op 1', { typedSec: 10 }, 0), st('b', 'Sealer runs', 'Op 1', { kind: 'machine', typedSec: 30 }, 1),
      st('c', 'Inspect', 'Op 1', { typedSec: 12 }, 2), st('d', 'Walk', 'Op 1', { kind: 'walk', typedSec: 4 }, 3),
    ], { taktSec: 36 });
    const p = f.people[0];
    expect([p.work, p.wait, p.machine, p.machineWait, p.overBy]).toEqual([40, 14, 30, 14, 4]);
    expect(p.parts.map(e => e.name)).toEqual(['Load', 'Inspect', 'Walk', 'Waits for the machine']);
    expect(p.parts.reduce((t, e) => t + (e.standard ?? 0), 0)).toBe(40);
    expect(suggest(f)).toBeUndefined();     // a machine-paced balance is not shared out
    expect(balanceSays(f).text).toMatch(/Op 1 carries 40\.0 s/);
  });
  it('the row says it, and the waiting in money: 14 s at £15 an hour is £0.058 a cycle — 35% of their pay, £5.25 an hour', () => {
    const f = balance([
      st('a', 'Load', 'Op 1', { typedSec: 10 }, 0), st('b', 'Sealer runs', 'Op 1', { kind: 'machine', typedSec: 30 }, 1),
      st('c', 'Inspect', 'Op 1', { typedSec: 12 }, 2), st('d', 'Walk', 'Op 1', { kind: 'walk', typedSec: 4 }, 3),
    ], { taktSec: 45 });
    const [row] = combination(f.people);
    expect(row.says).toBe('Op 1: 40.0 s a cycle against a 45.0 s takt — 22.0 s of their own work and 4.0 s walking, and sealer runs running 30.0 s (75% of the cycle); Op 1 waits 14.0 s for the machine.');
    expect(row.tone).toBe('a');
    expect(waitMoney(row, 15).text).toBe('Op 1’s 14.0 s waiting for the machine costs £0.058 a cycle — 35% of their pay, £5.25 an hour.');
    expect(waitMoney(row, undefined).missing).toMatch(/hourly rate/);
  });
});

describe('how many machines one person can tend (FC-026)', () => {
  const t = tend('Op 1', { l: 72, m: 360, w: 18 }, { operatorRate: 20, machineRate: 35 });
  it('N′ = (72 + 360) ÷ (72 + 18) = 4.8; four: cycle 432 s, 33.33 an hour, the person idle 72 s, machines never wait', () => {
    expect(t.nPrime).toBeCloseTo(4.8, 10);
    const r4 = t.rows.find(r => r.n === 4)!;
    expect([r4.cycle, r4.idle, r4.machineWaits]).toEqual([432, 72, 0]);
    expect(r4.perHour).toBeCloseTo(33.3333, 3);
  });
  it('five: cycle 450 s, 40 an hour (+20%), the person never idle, each machine waits 18 s; six: 540 s, waits 108 s', () => {
    const r5 = t.rows.find(r => r.n === 5)!;
    expect([r5.cycle, r5.perHour, r5.idle, r5.machineWaits]).toEqual([450, 40, 0, 18]);
    const r6 = t.rows.find(r => r.n === 6)!;
    expect([r6.cycle, r6.perHour, r6.machineWaits]).toEqual([540, 40, 108]);
    expect(r5.perHour / t.rows.find(r => r.n === 4)!.perHour).toBeCloseTo(1.2, 10);
  });
  it('cost a machine-cycle at £20 and £35 an hour: £4.8000 with four, £4.8750 with five; the operator alone £0.60 and £0.50', () => {
    expect(t.rows.find(r => r.n === 4)!.allCost).toBeCloseTo(4.8, 6);
    expect(t.rows.find(r => r.n === 5)!.allCost).toBeCloseTo(4.875, 6);
    expect(t.rows.find(r => r.n === 4)!.operatorCost).toBeCloseTo(0.6, 6);
    expect(t.rows.find(r => r.n === 5)!.operatorCost).toBeCloseTo(0.5, 6);
  });
  it('says the integers either side, and the output money only when asked with packs and a margin', () => {
    const s = tendSays(t, { packsPerCycle: 10, contributionPerPack: 0.25 });
    expect(s.text).toBe('Op 1 can tend 4.8 of these machines (1.20 min loading, 6.00 min running on its own, 18.0 s walking).');
    expect(s.lines[0]).toBe('with 4 the machines never wait and Op 1 is idle 1.20 min a cycle; with 5 Op 1 is never idle and each machine waits 18.0 s a cycle and they make 20% more (40.0 against 33.3 machine-cycles an hour).');
    expect(s.lines[s.lines.length - 1]).toMatch(/£16\.67 an hour more contribution/);
    expect(tendSays(tend('Op 1', { l: 72, m: 360, w: 18 })).lines).toHaveLength(1);
  });
  it('needs a load and a run: none of either is not defined', () => {
    const f = balance([st('a', 'Walk', 'Op 1', { kind: 'walk', typedSec: 5 })], undefined);
    expect(tendInput(f.people[0])).toBeUndefined();
    const g = balance([st('a', 'Load', 'Op 1', { typedSec: 72 }, 0), st('b', 'Runs', 'Op 1', { kind: 'machine', typedSec: 360 }, 1), st('c', 'Walk', 'Op 1', { kind: 'walk', typedSec: 18 }, 2)], undefined);
    expect(tendInput(g.people[0])).toEqual({ l: 72, m: 360, w: 18 });
  });
});

describe('ranked positional weight (FC-033)', () => {
  const T: Record<string, number> = { A: 6, B: 4, C: 5, D: 3, E: 7, F: 2, G: 4, H: 3 };
  const pre: Record<string, string[]> = { A: [], B: ['A'], C: ['A'], D: ['B'], E: ['C'], F: ['D', 'E'], G: ['F'], H: ['G'] };
  const items = Object.keys(T).map(k => ({ id: k, name: k, t: T[k], after: pre[k] }));
  it('weights A 34, C 21, B 16, E 16, D 12, F 9, G 7, H 3', () => {
    expect(positionalWeights(items)).toEqual({ A: 34, B: 16, C: 21, D: 12, E: 16, F: 9, G: 7, H: 3 });
  });
  it('at a 12 s takt: AC | BE | DFGH, 3 people = the minimum, 94.4%', () => {
    const r = rankedPositional(items, 12);
    if ('loop' in r) throw new Error('loop');
    expect(r.stations.map(s => [s.ids.join(''), s.work])).toEqual([['AC', 11], ['BE', 11], ['DFGH', 12]]);
    expect([r.minimum, r.efficiency.toFixed(4), r.over]).toEqual([3, '0.9444', []]);
  });
  it('at 10 s: AB | CD | EF | GH', () => {
    const r = rankedPositional(items, 10);
    if ('loop' in r) throw new Error('loop');
    expect(r.stations.map(s => s.ids.join(''))).toEqual(['AB', 'CD', 'EF', 'GH']);
    expect(r.minimum).toBe(4);
  });
  it('no order: the biggest first, PQ | RS at 10 s; a chain of 7 s needs three at 12 s; a 14 s step alone is over', () => {
    const a = rankedPositional([{ id: 'P', name: 'P', t: 5, after: [] }, { id: 'Q', name: 'Q', t: 5, after: [] }, { id: 'R', name: 'R', t: 5, after: [] }, { id: 'S', name: 'S', t: 3, after: [] }], 10);
    if ('loop' in a) throw new Error('loop');
    expect(a.stations.map(s => s.ids.join(''))).toEqual(['PQ', 'RS']);
    const c = rankedPositional([{ id: 'X', name: 'X', t: 7, after: [] }, { id: 'Y', name: 'Y', t: 7, after: ['X'] }, { id: 'Z', name: 'Z', t: 7, after: ['Y'] }], 12);
    if ('loop' in c) throw new Error('loop');
    expect(c.stations.map(s => s.ids.join(''))).toEqual(['X', 'Y', 'Z']);
    const o = rankedPositional([{ id: 'L', name: 'L', t: 14, after: [] }, { id: 'M', name: 'M', t: 3, after: ['L'] }], 12);
    if ('loop' in o) throw new Error('loop');
    expect(o.stations.map(s => s.ids.join(''))).toEqual(['L', 'M']);
    expect(o.over).toEqual(['L']);
  });
  it('a loop is found and named, and refused at the choice', () => {
    const loop = [{ id: 'a', name: 'a', t: 1, after: ['b'] }, { id: 'b', name: 'b', t: 1, after: ['a'] }];
    expect(findLoop(loop)).toBeDefined();
    expect('loop' in rankedPositional(loop, 5)).toBe(true);
    expect(wouldLoop(items, 'A', 'H')).toBe(true);        // A must come before H, through the chain
    expect(wouldLoop(items, 'H', 'A')).toBe(false);
    expect(findLoop(items)).toBeUndefined();
  });
  it('through the balance: with an order the suggestion is ranked positional weight; with none, the flow-order fill as before', () => {
    const steps = Object.keys(T).map((k, i) => st(k, k, 'Op 1', { typedSec: T[k], ...(pre[k].length ? { after: pre[k] } : {}) }, i));
    const f = balance(steps, { taktSec: 12 });
    expect(suggest(f)?.map(g => g.ids.join(''))).toEqual(['AC', 'BE', 'DFGH']);
    const plain = balance(steps.map(s => ({ ...s, after: undefined })), { taktSec: 12 });
    /* the flow-order fill, worked by hand: A+B = 10, +C 15 > 12 → close; C+D = 8, +E 15 → close; E+F = 9, +G 13 → close; G+H = 7 */
    expect(suggest(plain)?.map(g => g.ids.join(''))).toEqual(['AB', 'CD', 'EF', 'GH']);
  });
  it('a step before what it must follow is named', () => {
    const f = balance([st('f', 'Fill', 'Op 2', { typedSec: 5 }, 0), st('s', 'Seal', 'Op 1', { typedSec: 5, after: ['f'] }, 1)], { taktSec: 12 });
    expect(brokenOrder(f, ['Op 1', 'Op 2'])).toEqual(['Seal is with Op 1, but must follow Fill, which is with Op 2.']);
    expect(brokenOrder(f, ['Op 2', 'Op 1'])).toEqual([]);
  });
});

describe('questioning each element (FC-028)', () => {
  const six = [['Fetch tray', 6], ['Open bag', 4], ['Fill', 18], ['Weigh', 7], ['Seal', 9], ['Walk to belt', 5]] as const;
  const steps = (): BalanceStep[] => six.map(([n, t], i) => st(`s${i}`, n, 'Op 1', { typedSec: t }, i));
  const decided = (): BalanceStep[] => {
    const s = steps();
    s[0].ecrs = { how: 'E', why: 'trays are staged at the bench', oneOff: 70 };
    s[1].ecrs = { how: 'S', afterSec: 2 };
    s[3].ecrs = { how: 'C', into: 's2', afterSec: 0 };
    s[5].ecrs = { how: 'R', to: 'Op 1', afterSec: 1, oneOff: 50 };
    return s;
  };
  it('49 s → 30 s (38.8% less), 122.5% → 75% of a 40 s takt; the longest stack leaves red', () => {
    const r = improve(decided(), { taktSec: 40 });
    expect([r.beforeSec, r.afterSec, r.savedSec]).toEqual([49, 30, 19]);
    expect(r.before.constraint?.overBy).toBeCloseTo(9, 6);
    expect(r.after.constraint?.overBy).toBe(0);
    expect(improveSays(r).text).toBe('49.0 s of work → 30.0 s expected (39% less), 123% → 75% of takt a person. Expected, until the work is timed again.');
    expect(improveSays(r).tone).toBe('g');
  });
  it('in money at £15 an hour: £0.07917 a pack, £79.17 per 1,000, £7.125 an hour at a 40 s takt; £120 pays back in 16.8 hours', () => {
    const r = improve(decided(), { taktSec: 40 });
    const { money } = improveMoney(r, 15);
    expect(money?.perPack).toBeCloseTo(0.079167, 5);
    expect(money?.per1000).toBeCloseTo(79.17, 2);
    expect(money?.perHour).toBeCloseTo(7.125, 4);
    expect(money?.paybackHours).toBeCloseTo(16.84, 2);
    expect(improveMoneySays(money)).toBe('£0.079 of labour a pack, £79.17 for every 1,000 packs, £7.13 an hour at takt; the changes cost £120.00 and pay back in 16.8 running hours — expected.');
    expect(improveMoney(r, undefined).missing).toMatch(/hourly rate in Line capacity/);
  });
  it('an Eliminate with no reason is counted and flagged; a check carries the ask-first note; a Combine joining nothing is left as it is', () => {
    const s = steps();
    s[0].ecrs = { how: 'E' };
    s[4] = { ...s[4], name: 'Metal detector check', ecrs: { how: 'E', why: 'the line has one downstream' } };
    s[3].ecrs = { how: 'C' };
    const r = improve(s, { taktSec: 40 });
    expect(r.flags).toEqual(['Fetch tray: reason missing — why can it go?', 'Weigh: Combine names no step to join — left as it is.', 'Metal detector check: ask quality and food safety before a check goes.']);
    expect(r.savedSec).toBe(6 + 9);
  });
  it('a rearranged step moves to the person chosen, or off the line; nothing decided changes nothing', () => {
    const s = steps();
    s[3].ecrs = { how: 'R', to: 'Op 2' };
    const r = improve(s, { taktSec: 40 });
    expect(r.after.people.map(p => [p.who, p.work])).toEqual([['Op 1', 42], ['Op 2', 7]]);
    s[3].ecrs = { how: 'R', to: '' };
    expect(improve(s, { taktSec: 40 }).afterSec).toBe(42);
    expect(improve(steps(), { taktSec: 40 }).savedSec).toBe(0);
    expect(improveSays(improve(steps(), { taktSec: 40 })).text).toMatch(/No step has a decision yet/);
  });
  it('a step with no time withholds the claim', () => {
    const s = steps(); s[2] = { ...s[2], typedSec: undefined }; s[0].ecrs = { how: 'E', why: 'x' };
    expect(improveSays(improve(s, { taktSec: 40 })).text).toMatch(/no time yet/);
    expect(improveMoney(improve(s, { taktSec: 40 }), 15)).toEqual({});
  });
});

describe('a machine sets the cycle (FC-028 on FC-007)', () => {
  it('saving the person’s own steps while they wait for the machine leaves the cycle where it was, and says so', () => {
    const steps = [st('a', 'Load', 'Op 1', { typedSec: 10 }, 0), st('b', 'Runs', 'Op 1', { kind: 'machine', typedSec: 30 }, 1), st('c', 'Inspect', 'Op 1', { typedSec: 12, ecrs: { how: 'S', afterSec: 9 } }, 2)];
    const r = improve(steps, { taktSec: 45 });
    expect([r.beforeSec, r.afterSec, r.savedSec]).toEqual([40, 40, 0]);
    expect(improveSays(r).lines.join(' ')).toMatch(/Op 1 waits for the machine, so the machine sets the cycle/);
  });
});

describe('standard data (FC-024)', () => {
  const study = (id: string, standardId: string, name: string, steps: BalanceStep[], allowance = 0.1, startedAt = 1): ToolStudy =>
    ({ id, tool: 'balance', name, standardId, workspaceId: 'ws', agreed: { balance: { taktSec: 12, allowance } }, facts: { steps }, uses: [], startedAt, createdAt: 1, updatedAt: 1 } as unknown as ToolStudy);
  const other = study('o', 'sd-other', 'Maris Piper 1kg', [
    st('x1', 'Fold and tape the case', 'Op 2', { rating: 110, laps: laps([5, 5, 5, 5, 5]) }, 0),
    st('x2', 'Stack the pallet', 'Op 3', { typedSec: 7 }, 1),
  ]);
  it('a timed step is offered with its basic time (5.0 observed at 110 → 5.50), its cycles and its product; a typed one is not', () => {
    const rows = libraryFrom([other], { studyId: 'me', standardId: 'sd-here', workspaceId: 'ws' });
    expect(rows).toHaveLength(1);
    expect([rows[0].name, rows[0].product, rows[0].n]).toEqual(['Fold and tape the case', 'Maris Piper 1kg', 5]);
    expect(rows[0].basic).toBeCloseTo(5.5, 6);
  });
  it('another line’s product, this very product and a video balance are not offered; the newest balance of a product stands', () => {
    const elsewhere = { ...other, workspaceId: 'ws2' } as ToolStudy;
    const same = { ...other, standardId: 'sd-here' } as ToolStudy;
    const video = { ...other, facts: { ...other.facts, video: {} } } as unknown as ToolStudy;
    expect(libraryFrom([elsewhere, same, video], { standardId: 'sd-here', workspaceId: 'ws' })).toEqual([]);
    const newer = study('o2', 'sd-other', 'Maris Piper 1kg', [st('y', 'Fold and tape the case', 'Op 2', { laps: laps([6, 6, 6, 6, 6]) })], 0, 5);
    expect(libraryFrom([other, newer], { standardId: 'sd-here', workspaceId: 'ws' }).map(r => r.basic)).toEqual([6]);
  });
  it('reused here at 12%: basic 5.50 → standard 6.160; typed wins over it; laps made here replace it', () => {
    const row = libraryFrom([other], { standardId: 'sd-here', workspaceId: 'ws' })[0];
    const base = st('n', 'Fold and tape the case', 'Op 2', { reuse: reuseOf(row) });
    const e = element(base, 0.12);
    expect([e.source, e.basic, +(e.standard ?? 0).toFixed(3), e.enough]).toEqual(['library', 5.5, 6.16, true]);
    expect(element({ ...base, typedSec: 9 }, 0.12).source).toBe('typed');
    const timed = element({ ...base, laps: laps([5, 5, 5, 5, 5]) }, 0.12);
    expect(timed.source).toBe('timed');
  });
  it('the record’s case: 3.2 + 2.1 + 9.6×2 + 4.4 + 1.4×2 = 31.70 s basic, 35.187 s at 11%, 102.3 an hour; the share reused is said', () => {
    const lib = [['Pick case', 3.2, 1], ['Open case', 2.1, 1], ['Place 12 packs', 9.6, 2], ['Close and tape', 4.4, 1], ['Walk 2 m', 1.4, 2]] as const;
    const steps = lib.flatMap(([name, basic, k], i) => Array.from({ length: k }, (_, j) => st(`r${i}${j}`, name, 'Op 1', { reuse: { basicSec: basic, n: 12, enough: true, product: 'Case pack', studyId: 's', stepId: 'x', at: 1 } }, i * 2 + j)));
    const f = balance(steps, { taktSec: 20, allowance: 0.11 });
    expect(f.total).toBeCloseTo(35.187, 3);
    expect(3600 / f.total).toBeCloseTo(102.31, 2);
    expect(reusedSays(f)?.share).toBe(1);
    expect(reusedSays(f)?.text).toMatch(/^7 of 7 steps are reused/);
  });
  it('words match every word typed, in the name or the product', () => {
    const rows = libraryFrom([other], { standardId: 'sd-here', workspaceId: 'ws' });
    expect(matchRows(rows, 'fold tape').map(r => r.name)).toEqual(['Fold and tape the case']);
    expect(matchRows(rows, 'piper').length).toBe(1);
    expect(matchRows(rows, 'weigh')).toEqual([]);
    expect(matchRows(rows, '').length).toBe(1);
  });
});

describe('records from before still read as they did', () => {
  it('work, walk and wait only: the cycle is the sum, the parts are the elements, no machine, the same sentence', () => {
    const f = balance([st('a', 'Feed', 'Op 1', { typedSec: 6 }, 0), st('b', 'Clear', 'Op 1', { kind: 'wait', typedSec: 3 }, 1)], { taktSec: 12 });
    const p = f.people[0];
    expect([p.work, p.wait, p.machine, p.machineWait]).toEqual([9, 3, 0, 0]);
    expect(p.parts).toBe(p.elements);
  });
});
