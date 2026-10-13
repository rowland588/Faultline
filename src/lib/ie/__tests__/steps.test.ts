/* The value stream's arithmetic — one line end to end, the departments that touch it included. */
import { describe, it, expect } from 'vitest';
import { flowFigures, flowSays, compareFlows, waitOf, valueOf, dur, parseDur, lanesOf, lanesOfStep, whoOf, whereOf, laneByDefault, stepWorth, stepFigure, compareStep, carryFlow, streamRows } from '../steps';
import type { FlowStep } from '../../study';

const D = 86_400;
let n = 0;
const st = (o: Partial<FlowStep> & Pick<FlowStep, 'name' | 'kind' | 'lane'>): FlowStep => ({ id: `s${n}`, order: n++, ...o });

/* An order from the customer to the pallet on the lorry. */
const stream = (): FlowStep[] => { n = 0; return [
  st({ name: 'Order taken', lane: 'Order office', kind: 'operation', value: 'needed', cycleSec: 300, waitSec: 1 * D, info: 'email' }),
  st({ name: 'Plan the run', lane: 'Planning', kind: 'operation', value: 'needed', cycleSec: 1200, waitSec: 1.5 * D }),
  st({ name: 'Film to the wrapper', lane: 'Stores', kind: 'move', value: 'waste', cycleSec: 240 }),
  st({ name: 'Wrap and seal', lane: 'Line 2', kind: 'operation', value: 'adds', cycleSec: 2 }),
  st({ name: 'Weigh and reject', lane: 'Line 2', kind: 'check', value: 'needed', cycleSec: 1 }),
  st({ name: 'Case pack', lane: 'Line 2', kind: 'operation', value: 'adds', cycleSec: 6 }),
  st({ name: 'Pallet waits for despatch', lane: 'Despatch', kind: 'store', queue: 600 }),
]; };
const agreed = { demandPerDay: 300, availableSecPerDay: 900, customer: 'Tesco', supplier: 'the order' };

describe('the value stream (tool 2)', () => {
  it('lead time is every cycle and every wait; a queue becomes days of demand', () => {
    const f = flowFigures(stream(), agreed);
    expect(f.leadSec).toBe(300 + 1200 + 240 + 2 + 1 + 6 + D + 1.5 * D + 2 * D);
    expect(f.addsSec).toBe(8);
    expect(f.neededSec).toBe(1501);
    expect(f.wasteSec).toBe(240 + 4.5 * D);
    expect(f.taktSec).toBe(3);
    expect(f.biggestWait?.step.name).toBe('Pallet waits for despatch');
    expect(f.biggestWait?.from).toBe('queue');
    expect(f.longestCycle).toMatchObject({ sec: 1200, overTakt: true });
  });
  it('says it plainly — lead time, how much adds value, the biggest wait, the longest cycle against takt', () => {
    const s = flowSays(flowFigures(stream(), agreed), agreed);
    expect(s.text).toBe('Lead time 4.5 d from the order to Tesco. 8.0 s of it adds value — 0.002%. The biggest wait: Pallet waits for despatch (Despatch), 2.0 d. The longest cycle: Plan the run, 20 min, over takt (3.0 s) — where the stream is limited.');
    expect(s.lines).toEqual(['Pallet waits for despatch: worked out from 600 waiting, at 300 a day.']);
  });
  it('only an operation adds value; a wait or a store is waste', () => {
    expect(valueOf({ id: 'x', order: 0, name: 'x', lane: 'x', kind: 'move', value: 'adds' })).toBe('needed');
    expect(valueOf({ id: 'x', order: 0, name: 'x', lane: 'x', kind: 'wait' })).toBe('waste');
    expect(valueOf({ id: 'x', order: 0, name: 'x', lane: 'x', kind: 'check' })).toBeUndefined();
  });
  it('a step with no time, and one not marked, are said — the lead time is "at least"', () => {
    const f = flowFigures([...stream(), { id: 'u', order: 99, name: 'Invoice', lane: 'Accounts', kind: 'operation' }], agreed);
    expect([f.untimed, f.unmarked]).toEqual([1, 1]);
    const s = flowSays(f, agreed);
    expect(s.text).toMatch(/^Lead time at least 4\.5 d/);
    expect(s.lines.slice(0, 2)).toEqual(['1 step has no time yet — the lead time is at least this.', '1 step not marked adds value, needed or waste yet.']);
  });
  it('a typed wait wins over a queue; no demand, no queue days', () => {
    expect(waitOf({ id: 'x', order: 0, name: 'x', lane: 'x', kind: 'store', queue: 600, waitSec: 60 }, agreed)).toEqual({ sec: 60 });
    expect(waitOf({ id: 'x', order: 0, name: 'x', lane: 'x', kind: 'store', queue: 600 })).toEqual({});
  });
  it('today against the future, figure by figure', () => {
    const now = flowFigures(stream(), agreed);
    const fut = stream().filter(x => x.name !== 'Film to the wrapper').map(x => (x.name === 'Pallet waits for despatch' ? { ...x, queue: 150 } : x.name === 'Plan the run' ? { ...x, waitSec: 0.5 * D } : x));
    expect(compareFlows(now, flowFigures(fut, agreed))).toBe('Lead time 4.5 d → 2.0 d (−2.5 d) · adds value 0.002% → 0.005% · 7 → 6 steps.');
  });
  it('takt is held against the time a piece: a step done once for a batch is not over takt', () => {
    const batched = stream().map(x => (x.name === 'Plan the run' ? { ...x, batch: 1500 } : x.name === 'Order taken' ? { ...x, batch: 300 } : x));
    const f = flowFigures(batched, agreed);
    expect(f.longestCycle).toMatchObject({ sec: 6, overTakt: true });
    expect(flowSays(f, agreed).text).toMatch(/The longest cycle: Case pack, 6\.0 s, over takt \(3\.0 s\)/);
    const g = flowFigures(stream().map(x => (x.name === 'Plan the run' ? { ...x, batch: 1500 } : x)), agreed);
    expect(flowSays(g, agreed).text).toMatch(/The longest cycle: Order taken, 5 min, over takt/);
    const h = flowFigures(stream().map(x => (x.name === 'Plan the run' ? { ...x, batch: 100 } : x.name === 'Order taken' ? { ...x, batch: 300 } : x)), agreed);
    expect(flowSays(h, agreed).text).toMatch(/The longest cycle: Plan the run, 12\.0 s a piece \(20 min for 100\), over takt/);
  });
  it('the lanes, in the order the journey first reaches them', () => {
    expect(flowFigures(stream(), agreed).lanes).toEqual(['Order office', 'Planning', 'Stores', 'Line 2', 'Despatch']);
  });
  it('multi-dimensional: lanes by who or by where; a step done by two people sits in both lanes', () => {
    const flow: FlowStep[] = [
      { id: 'a', order: 0, name: 'Load the reel', kind: 'operation', who: ['Op 1'], where: 'Bagger' },
      { id: 'b', order: 1, name: 'Clear a jam', kind: 'operation', who: ['Op 1', 'Team leader'], where: 'Bagger' },
      { id: 'c', order: 2, name: 'Pack the case', kind: 'operation', who: ['Op 2'], where: 'Case packer' },
    ];
    expect(lanesOf(flow, 'who')).toEqual(['Op 1', 'Team leader', 'Op 2']);
    expect(lanesOf(flow, 'where')).toEqual(['Bagger', 'Case packer']);
    expect(lanesOfStep(flow[1], 'who')).toEqual(['Op 1', 'Team leader']);
    expect(lanesOfStep({ id: 'x', order: 0, name: 'x', kind: 'wait' }, 'who')).toEqual(['Not said']);
  });
  it('a step saved with one lane still reads: who on a line\'s map, where on the business', () => {
    const old: FlowStep = { id: 'o', order: 0, name: 'x', kind: 'operation', lane: 'Op 1' };
    expect([whoOf(old, { scope: 'line' }), whereOf(old, { scope: 'line' })]).toEqual([['Op 1'], undefined]);
    expect([whoOf(old), whereOf(old)]).toEqual([[], 'Op 1']);
    expect([laneByDefault({ scope: 'line' }), laneByDefault()]).toEqual(['who', 'where']);
  });
  it('a step whose who or where came back in the wrong shape reads as not said, never a crash', () => {
    const odd = { id: 'z', order: 0, name: 'x', kind: 'operation', who: 'Op 1', where: 7 } as unknown as FlowStep;
    expect([whoOf(odd, { scope: 'line' }), whereOf(odd, { scope: 'line' })]).toEqual([[], undefined]);
    expect(lanesOfStep(odd, 'who', { scope: 'line' })).toEqual(['Not said']);
  });
  it('a step worth making better: waste work or a wait after it; its figure in its own words', () => {
    const wait: FlowStep = { id: 'w', order: 0, name: 'Pallet waits', kind: 'wait', waitSec: 6 * 3600 };
    const walk: FlowStep = { id: 'k', order: 1, name: 'Fetch cases', kind: 'move', value: 'waste', cycleSec: 60, batch: 120, waitSec: 25 * 60 };
    const bag: FlowStep = { id: 'b', order: 2, name: 'Bag', kind: 'operation', value: 'adds', cycleSec: 1.2 };
    expect([stepWorth(wait), stepWorth(walk), stepWorth(bag)]).toEqual([true, true, false]);
    expect([stepFigure(wait), stepFigure(walk), stepFigure({ ...walk, cycleSec: undefined, waitSec: undefined })]).toEqual(['6.0 h wait', '1 min of waste each time (for 120), then a 25 min wait', 'waste, no time yet']);
  });
  it('one step before → after: its wait and work as walked again; carried, said; gone, taken out', () => {
    const was: FlowStep = { id: 'w', order: 0, name: 'Pallet waits', kind: 'wait', waitSec: 6 * 3600 };
    expect(compareStep(was, { ...was, waitSec: 3600, source: 'typed' })).toBe('Pallet waits: wait 6.0 h → 1.0 h');
    expect(compareStep(was, { ...was, source: 'carried' })).toBe('Pallet waits: not walked again yet');
    expect(compareStep(was, undefined)).toBe('Pallet waits: taken out');
    expect(compareStep({ ...was, kind: 'move', cycleSec: 60, waitSec: undefined }, { ...was, kind: 'move', cycleSec: 20, waitSec: undefined, source: 'timed' })).toBe('Pallet waits: work 1 min → 20.0 s');
    expect(carryFlow([was]).map(x => x.source)).toEqual(['carried']);
    expect(flowFigures(carryFlow([was])).carried).toBe(1);
    expect(flowSays(flowFigures(carryFlow([was]))).lines).toContain('1 step is carried from the map before — not walked or typed again yet.');
    expect(compareFlows(flowFigures([was]), flowFigures([was]))).toBe('Lead time 6.0 h, no change.');
  });
  it('the stream on paper: a row per step in order, every figure in words, the branch and what is carried said, the totals', () => {
    const flow: FlowStep[] = [
      { id: 'q', order: 2, name: 'Pallet waits', who: ['Quality'], where: 'Palletiser', kind: 'wait', waitSec: 6 * 3600 },
      { id: 'b', order: 0, name: 'Bag and seal', who: ['Machine', 'Op 1'], where: 'Bagger', kind: 'operation', value: 'adds', cycleSec: 1.2 },
      { id: 'f', order: 1, name: 'Fetch cases', who: ['Op 2'], kind: 'move', value: 'waste', cycleSec: 60, batch: 120, source: 'carried' },
      { id: 'n', order: 3, name: '', kind: 'operation' },
    ];
    const t = streamRows(flow, { scope: 'line' }, new Map([['q', 'Shorten the QA hold']]));
    expect(t.rows.map(r => [r.n, r.what, r.who, r.where, r.value, r.work, r.wait, r.lead, !!r.carried, r.branch])).toEqual([
      [1, 'Bag and seal', 'Machine, Op 1', 'Bagger', 'adds', '1.2 s', '—', '1.2 s', false, undefined],
      [2, 'Fetch cases', 'Op 2', '—', 'waste', '1 min for 120', '—', '1 min', true, undefined],
      [3, 'Pallet waits', 'Quality', 'Palletiser', 'waste', '—', '6.0 h', '6.0 h', false, 'Shorten the QA hold'],
      [4, 'A step', '—', '—', undefined, 'no time yet', '—', '6.0 h', false, undefined],
    ]);
    expect(t.total).toEqual({ work: '1 min', wait: '6.0 h', lead: '6.0 h' });
  });
  it('durations as people say them', () => {
    expect([dur(6), dur(240), dur(5400), dur(2 * D), dur(0.045)]).toEqual(['6.0 s', '4 min', '1.5 h', '2.0 d', '0.045 s']);
  });
  it('times typed the way people say them', () => {
    expect([parseDur('6 s'), parseDur('4 min'), parseDur('1.5h'), parseDur('about 2 days'), parseDur('1 week'), parseDur('2,5 d')]).toEqual([6, 240, 5400, 2 * D, 7 * D, 2.5 * D]);
    expect([parseDur('40'), parseDur('40', 'min'), parseDur('soon'), parseDur('3 fortnights')]).toEqual([40, 2400, undefined, undefined]);
  });
  it('nothing listed: says how to start', () => {
    expect(flowSays(flowFigures([], agreed)).text).toMatch(/^List the steps on the line end to end/);
  });
});

/* The audit of 13 October, worked by hand (Rother & Shook, Learning to See:
 * inventory ÷ daily demand = days of it; lead time the waits and the
 * processing; the value-added ratio — process cycle efficiency, George — adds
 * value ÷ lead time). Three steps: a 60 s operation that adds value, a
 * 30 s check, 1,200 cases waiting at 400 a day = 3 days. Lead 3 d + 90 s;
 * 60 ÷ 259,290 = 0.023%. Takt 28,800 s ÷ 400 = 72 s: the 60 s cycle within. */
describe('the stream, worked by hand', () => {
  const a = { demandPerDay: 400, availableSecPerDay: 28_800 };
  const three = (): FlowStep[] => { n = 0; return [
    st({ name: 'Pack', lane: 'Line', kind: 'operation', value: 'adds', cycleSec: 60 }),
    st({ name: 'Check', lane: 'Line', kind: 'check', value: 'needed', cycleSec: 30 }),
    st({ name: 'Cases wait', lane: 'Despatch', kind: 'store', queue: 1200 }),
  ]; };
  it('days of demand, lead time, the value-added ratio, takt', () => {
    const f = flowFigures(three(), a);
    expect(waitOf(three()[2], a)).toEqual({ sec: 3 * D, from: 'queue' });
    expect([f.leadSec, f.addsSec, f.neededSec, f.wasteSec, f.taktSec]).toEqual([3 * D + 90, 60, 30, 3 * D, 72]);
    expect(f.pce).toBeCloseTo(60 / (3 * D + 90), 12);
    expect(f.longestCycle).toMatchObject({ sec: 60, overTakt: false });
    expect(flowSays(f, a).text).toBe('Lead time 3.0 d. 1 min of it adds value — 0.02%. The biggest wait: Cases wait (Despatch), 3.0 d. The longest cycle: Pack, 1 min, within takt (1.2 min).');
  });
  it('no demand, no takt and no queue days — the store is untimed, never zero days', () => {
    const f = flowFigures(three(), {});
    expect([f.taktSec, f.untimed, f.leadSec]).toEqual([undefined, 1, 90]);
    expect(flowSays(f).text).toBe('Lead time at least 1.5 min. 1 min of it adds value — 67%. The longest cycle: Pack, 1 min.');
    expect([dur(90), dur(72), dur(240), dur(599), dur(600), dur(630)]).toEqual(['1.5 min', '1.2 min', '4 min', '10 min', '10 min', '11 min']);
  });
  it('nothing timed at all: no value-added ratio is claimed', () => {
    const f = flowFigures([{ id: 'x', order: 0, name: 'x', lane: 'x', kind: 'operation', value: 'adds' }], a);
    expect([f.leadSec, f.pce, f.untimed]).toEqual([0, undefined, 1]);
  });
});
