/* AUDIT (16 Oct) — the value stream's figures, lib/ie/steps: lead time,
 * adds-value, PCE, takt, Little's law, the longest cycle a piece; and the
 * duration words round-tripping through parseDur. */
import { describe, it, expect } from 'vitest';
import { flowFigures, dur, parseDur, waitOf, share, compareFlows, streamRows } from '../../tools/valuestream/steps';
import type { FlowStep, AgreedMap } from '../study';
import { rng } from './audit-ie-ref';

const KINDS: FlowStep['kind'][] = ['operation', 'move', 'check', 'wait', 'store'];
const VALUES: (FlowStep['value'] | undefined)[] = ['adds', 'needed', 'waste', undefined];

describe('AUDIT steps — random streams reconcile', () => {
  it('lead = Σ(cycle + wait); adds + needed + waste(work) + waits = lead when every step is marked; pce = adds ÷ lead', () => {
    const r = rng(21);
    for (let k = 0; k < 100; k++) {
      const n = 1 + Math.floor(r() * 12);
      const a: AgreedMap = { scope: 'line', demandPerDay: 100 + Math.floor(r() * 5000), availableSecPerDay: 7 * 3600 + Math.floor(r() * 3600) };
      const flow: FlowStep[] = Array.from({ length: n }, (_, i) => {
        const kind = KINDS[Math.floor(r() * KINDS.length)]!;
        const value = kind === 'operation' ? (['adds', 'needed', 'waste'] as const)[Math.floor(r() * 3)] : VALUES[Math.floor(r() * 3)];
        return { id: `s${i}`, order: n - i, name: `S${i}`, who: ['Op 1'], kind, value, cycleSec: r() < 0.8 ? Math.round(r() * 600) : undefined,
          ...(r() < 0.5 ? { waitSec: Math.round(r() * 86400) } : r() < 0.5 ? { queue: Math.round(r() * 3000) } : {}), ...(r() < 0.2 ? { batch: 1 + Math.floor(r() * 50) } : {}) };
      });
      const f = flowFigures(flow, a);
      let lead = 0, work = 0, waits = 0;
      for (const st of flow) { const c = st.cycleSec ?? 0, w = waitOf(st, a).sec ?? 0; lead += c + w; work += c; waits += w; }
      expect(f.leadSec).toBeCloseTo(lead, 9);
      expect(f.addsSec + f.neededSec + f.wasteSec).toBeLessThanOrEqual(lead + 1e-9);
      if (!f.unmarked) expect(f.addsSec + f.neededSec + f.wasteSec).toBeCloseTo(lead, 9);
      expect(f.wasteSec).toBeGreaterThanOrEqual(waits - 1e-9);
      if (lead > 0) { expect(f.pce).toBeCloseTo(f.addsSec / lead, 12); expect(f.pce!).toBeLessThanOrEqual(1); } else expect(f.pce).toBeUndefined();
      expect(f.taktSec).toBeCloseTo(a.availableSecPerDay! / a.demandPerDay!, 9);
      /* Little's law: queue ÷ demand a day × 86,400 s */
      for (const st of flow) if (st.waitSec === undefined && st.queue) expect(waitOf(st, a).sec).toBeCloseTo((st.queue / a.demandPerDay!) * 86400, 6);
      /* the longest cycle is a piece: cycle ÷ batch, operations and checks only */
      const each = flow.filter(s => (s.kind === 'operation' || s.kind === 'check') && (s.cycleSec ?? 0) > 0).map(s => (s.cycleSec ?? 0) / (s.batch && s.batch > 1 ? s.batch : 1));
      if (each.length) { expect(f.longestCycle?.sec).toBeCloseTo(Math.max(...each), 9); expect(f.longestCycle?.overTakt).toBe(Math.max(...each) > f.taktSec!); }
      else expect(f.longestCycle).toBeUndefined();
      /* the paper's totals are the same sums */
      const rows = streamRows(flow, a);
      expect(rows.total.lead).toBe(dur(lead));
      expect(rows.total.work).toBe(dur(work));
      expect(rows.total.wait).toBe(dur(waits));
      void work;
    }
  });
  it('an operation marked waste is waste work; a wait or a store is waste whatever it is marked; a move marked adds is only needed', () => {
    const f = flowFigures([
      { id: 'a', order: 1, name: 'a', kind: 'operation', value: 'waste', cycleSec: 10 },
      { id: 'b', order: 2, name: 'b', kind: 'wait', value: 'adds', cycleSec: 5, waitSec: 20 },
      { id: 'c', order: 3, name: 'c', kind: 'move', value: 'adds', cycleSec: 7 },
    ]);
    expect([f.addsSec, f.neededSec, f.wasteSec, f.leadSec]).toEqual([0, 7, 35, 42]);
  });
});

describe('AUDIT steps — words', () => {
  it('dur → parseDur round-trips to the display precision; the scales switch where TOOLKIT 3.4 says (one decimal under 10 min — the audit’s own change)', () => {
    const cases = [0.5, 5, 59.9, 60, 90, 270, 599, 600, 1800, 3599, 3600, 7200, 86399, 86400, 5 * 86400];
    for (const sec of cases) {
      const w = dur(sec);
      const back = parseDur(w)!;
      expect(back).toBeDefined();
      const tol = sec < 60 ? 0.05 : sec < 600 ? 3 : sec < 3600 ? 30 : sec < 86400 ? 180 : 4320;
      expect(Math.abs(back - sec)).toBeLessThanOrEqual(tol + 1e-9);
    }
    expect(dur(60)).toBe('1 min'); expect(dur(90)).toBe('1.5 min'); expect(dur(599)).toBe('10 min'); expect(dur(600)).toBe('10 min');
    expect(parseDur('1.5 h')).toBe(5400); expect(parseDur('2 d')).toBe(172800); expect(parseDur('about 2 days')).toBe(172800); expect(parseDur('4', 'min')).toBe(240);
  });
  it('a share: 0.2% under 1%, whole from 10%, one decimal between', () => {
    expect(share(0.002)).toBe('0.2%'); expect(share(0.05)).toBe('5.0%'); expect(share(0.12)).toBe('12%'); expect(share(0.0002)).toBe('0.02%'); expect(share(0)).toBe('0%');
  });
  it('compareFlows says only what moved', () => {
    const now = flowFigures([{ id: 'a', order: 1, name: 'a', kind: 'operation', value: 'adds', cycleSec: 60, waitSec: 540 }]);
    const then = flowFigures([{ id: 'a', order: 1, name: 'a', kind: 'operation', value: 'adds', cycleSec: 60, waitSec: 240 }]);
    expect(compareFlows(now, then)).toBe('Lead time 10 min → 5 min (−5 min) · adds value 10% → 20%.');
    expect(compareFlows(now, now)).toBe('Lead time 10 min, no change.');
  });
});
