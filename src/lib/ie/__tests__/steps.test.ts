/* The value stream's arithmetic — a business stream, door to door. */
import { describe, it, expect } from 'vitest';
import { flowFigures, flowSays, compareFlows, waitOf, valueOf, dur, parseDur } from '../steps';
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
  it('durations as people say them', () => {
    expect([dur(6), dur(240), dur(5400), dur(2 * D)]).toEqual(['6.0 s', '4 min', '1.5 h', '2.0 d']);
  });
  it('times typed the way people say them', () => {
    expect([parseDur('6 s'), parseDur('4 min'), parseDur('1.5h'), parseDur('about 2 days'), parseDur('1 week'), parseDur('2,5 d')]).toEqual([6, 240, 5400, 2 * D, 7 * D, 2.5 * D]);
    expect([parseDur('40'), parseDur('40', 'min'), parseDur('soon'), parseDur('3 fortnights')]).toEqual([40, 2400, undefined, undefined]);
  });
  it('nothing listed: says how to start', () => {
    expect(flowSays(flowFigures([], agreed)).text).toMatch(/^List the steps door to door/);
  });
});
