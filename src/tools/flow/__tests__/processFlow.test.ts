/* THE PROCESS FLOW CHART (FC-003) — the independent cases of knowledge/specs/FC-003-process-flow-chart.md §6, worked by hand in
 * scripts/knowledge/cases-kaizen.py (sections F and F2) from the knowledge record's tray, never from the code's output. */
import { describe, expect, it } from 'vitest';
import { FLOW_KINDS, FLOW_WORD, SYMBOL, flowFigures, flowMoney, isFlowKind, MIN_PER_YEAR, type FlowKind, type FlowStep } from '../processFlow';
import { symbolShape } from '../symbols';

const S = (kind: FlowKind, min?: number, m?: number, what = ''): FlowStep => ({ what, kind, ...(min !== undefined ? { min } : {}), ...(m !== undefined ? { m } : {}) });
/* the record's tray: 14 steps, 4 operations, 5 transports, 2 inspections, 2 delays, 1 storage */
const TRAY: FlowStep[] = [
  S('operation', 2), S('transport', 1.5, 30), S('delay', 12, undefined, 'forklift'), S('operation', 3.5), S('inspection', 1), S('transport', 2, 45), S('storage', 240),
  S('transport', 1, 20), S('operation', 4), S('delay', 8, undefined, 'QA release'), S('transport', 1.5, 25), S('operation', 1.5), S('inspection', 0.5), S('transport', 1, 20),
];

describe('the tray from the oven to the despatch pallet (cases-kaizen.py F)', () => {
  const f = flowFigures(TRAY);
  it('counts 14 steps: 4 operations, 5 transports, 2 inspections, 2 delays, 1 storage', () => {
    expect(f.n).toBe(14);
    expect(f.count).toEqual({ operation: 4, transport: 5, inspection: 2, delay: 2, storage: 1 });
  });
  it('totals the time by class: 11 + 7 + 1.5 + 20 + 240 = 279.5 minutes; 140 m travelled', () => {
    expect(f.minutes).toEqual({ operation: 11, transport: 7, inspection: 1.5, delay: 20, storage: 240 });
    expect(f.total).toBe(279.5);
    expect(f.metres).toBe(140);
  });
  it('the shares: operations 3.94%, delay and storage 93.0%, operations less the storage 27.85%', () => {
    expect(f.opsShare).toBeCloseTo(0.039356, 5);
    expect(f.waitShare).toBeCloseTo(0.930233, 5);
    expect(f.opsLessStorage).toBeCloseTo(0.278481, 5);
  });
  it('names the longest transport (45 m, step 6) and the longest delay (12 min, step 3)', () => {
    expect(f.longestTransport).toMatchObject({ step: 6, m: 45 });
    expect(f.longestDelay).toMatchObject({ step: 3, min: 12, what: 'forklift' });
  });
  it('the questioned chart: 12 steps, 266.5 minutes, 90 m, operations 4.13%, less storage 41.5%', () => {
    const q = flowFigures([S('operation', 2), S('transport', 1.5, 30), S('operation', 3.5), S('transport', 2, 10), S('storage', 240), S('transport', 1, 20), S('operation', 4), S('delay', 8), S('transport', 1.5, 10), S('operation', 1.5), S('inspection', 0.5), S('transport', 1, 20)]);
    expect(q.n).toBe(12); expect(q.total).toBe(266.5); expect(q.metres).toBe(90);
    expect(q.opsShare).toBeCloseTo(0.041276, 5); expect(q.opsLessStorage).toBeCloseTo(0.415094, 5);
  });
});

describe('what the chart will not make up', () => {
  it('a step with no time is counted and said, never given one; a transport with no distance likewise', () => {
    const f = flowFigures([S('operation', 2), S('transport', 3), S('delay')]);
    expect(f.n).toBe(3); expect(f.untimed).toBe(1); expect(f.noDistance).toBe(1);
    expect(f.total).toBe(5); expect(f.metres).toBe(0); expect(f.opsShare).toBeCloseTo(0.4, 9); expect(f.waitShare).toBe(0);
  });
  it('no time at all: no share is said; storage the whole of the time: no share of the rest', () => {
    const none = flowFigures([S('operation'), S('transport')]);
    expect(none.opsShare).toBeUndefined(); expect(none.waitShare).toBeUndefined();
    const st = flowFigures([S('storage', 60)]);
    expect(st.opsLessStorage).toBeUndefined(); expect(st.waitShare).toBe(1);
  });
  it('knows its five and their symbols', () => {
    expect(FLOW_KINDS.map(k => SYMBOL[k]).join('')).toBe('OTIDS');
    expect(FLOW_KINDS.every(k => FLOW_WORD[k].means.length > 10)).toBe(true);
    expect(isFlowKind('delay')).toBe(true); expect(isFlowKind('movement')).toBe(false);
  });
});

describe('the money (cases-kaizen.py F2): 30 loads a day, £15 an hour, a £120 load, 25% a year', () => {
  const f = flowFigures(TRAY);
  const m = flowMoney(f, { perDay: 30, rate: 15, loadValue: 120, carry: 25 });
  it('labour: 8.5 minutes a load on transports and inspections × 30 = 255 minutes = 4.25 hours = £63.75', () => {
    expect(m.moveMinPerDay).toBe(255); expect(m.labourPerDay).toBeCloseTo(63.75, 9);
  });
  it('holding: 260 minutes of waiting × £120 × 25% ÷ the minutes in a year — a load £0.01484, a day £0.4452 (storage £0.4110, delays £0.0342)', () => {
    expect(MIN_PER_YEAR).toBe(525_600);
    expect(m.carryPerLoad).toBeCloseTo(0.014840, 5); expect(m.carryPerDay).toBeCloseTo(0.445205, 5);
    expect(m.carryStoragePerDay).toBeCloseTo(0.410959, 5); expect(m.carryDelayPerDay).toBeCloseTo(0.034247, 5);
    expect(m.missing).toEqual([]);
  });
  it('every input optional: a missing one is named and the rest still said', () => {
    expect(flowMoney(f, {}).missing).toHaveLength(1);
    const noWage = flowMoney(f, { perDay: 30, loadValue: 120, carry: 25 });
    expect(noWage.labourPerDay).toBeUndefined(); expect(noWage.carryPerDay).toBeCloseTo(0.445205, 5); expect(noWage.missing[0]).toMatch(/wage/);
    const noRate = flowMoney(f, { perDay: 30, rate: 15, loadValue: 120 });
    expect(noRate.labourPerDay).toBeCloseTo(63.75, 9); expect(noRate.carryPerDay).toBeUndefined(); expect(noRate.missing.join(' ')).toMatch(/holding stock for a year/);
  });
});

describe('the symbols, drawn once for the screen and the paper', () => {
  it('an operation is a circle, the rest polygons inside the square of their size; a D has a round side', () => {
    expect('circle' in symbolShape('O', 10, 10, 5)).toBe(true);
    for (const k of ['T', 'I', 'D', 'S'] as const) {
      const sh = symbolShape(k, 10, 10, 5);
      expect('poly' in sh).toBe(true);
      if ('poly' in sh) for (const [x, y] of sh.poly) { expect(x).toBeGreaterThanOrEqual(5 - 1e-9); expect(x).toBeLessThanOrEqual(15 + 1e-9); expect(y).toBeGreaterThanOrEqual(5 - 1e-9); expect(y).toBeLessThanOrEqual(15 + 1e-9); }
    }
    const d = symbolShape('D', 0, 0, 10);
    expect('poly' in d && d.poly.length).toBeGreaterThan(8);
  });
});
