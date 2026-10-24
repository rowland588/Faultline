/* AUDIT (16 Oct) — a shift's losses, lib/ie/losses, against the time model
 * of docs/CAPACITY.md §5–6 worked independently: expected, lost, explained,
 * the rest, Nakajima's split, the pounds in two parts — on the two worked
 * examples and on random shifts, every identity reconciled exactly. */
import { describe, it, expect } from 'vitest';
import { lossFigures, plannedOf, runningOf, countedRate, inWindow, lossSays, type CostModel } from '../../tools/losses/losses';
import type { LossCount, RunTiming } from '../study';
import type { Observation } from '../../types';
import { rng } from './audit-ie-ref';

const T0 = Date.parse('2026-10-10T06:00:00');
const MIN = 60_000;
let id = 0;
const stop = (category: string, startMin: number, durMin: number, o: Partial<Observation> = {}): Observation => ({
  id: `o${id++}`, workspaceId: 'w', category, asset: 'Bagger', startedAt: T0 + startMin * MIN, durationMs: durMin * MIN,
  timing: 'stopwatch', count: 1, media: [], createdAt: 1, updatedAt: 1, ...o,
});
const timing = (packs: number, sec: number): RunTiming => ({ id: `t${id++}`, at: T0, packs, sec });
const COST: CostModel = { crew: 4, labourRatePerHour: 14.5, labourBurden: 1.3, marginPerPack: 0.04 };

describe('AUDIT losses — worked example 1 (the Bagger’s plate)', () => {
  const c: LossCount = { shift: 'Shift 1', from: T0, to: T0 + 480 * MIN, breakMin: 30, plannedMin: 450, made: 36_500, rejects: 600, ratePerMin: 100, rateFrom: 'plate', rateMachine: 'Bagger' };
  const obs = [stop('Breakdown', 60, 32), stop('Minor stops', 120, 12, { asset: 'Checkweigher' }), stop('Minor stops', 200, 8, { asset: 'Checkweigher' }), stop('Changeover', 300, 18)];
  const timings = [timing(99, 60), timing(97, 60), timing(147, 90)];
  it('480 − 30 = 450; 45,000 expected; 85 lost; 52 + 18 + 6 = 76; rest 9; run 380', () => {
    expect(plannedOf(c).workedOut).toBe(450);
    const f = lossFigures(c, obs, COST);
    expect(f.expected).toBe(45_000);
    expect(f.lostMin).toBeCloseTo(85, 12);
    expect([f.stopsMin, f.changeoverMin, f.rejectsMin]).toEqual([52, 18, 6]);
    expect(f.explainedMin).toBeCloseTo(76, 12);
    expect(f.performanceMin).toBeCloseTo(9, 12);
    expect(f.runMin).toBe(380);
    expect(f.performanceShare).toBeCloseTo(9 / 85, 12);
  });
  it('Nakajima: 343 ÷ 3.5 = 98; 37,100 ÷ 98 = 378.571 net; − 371 = 7.571 slow; 380 − 378.571 = 1.429 short; slow + short = rest', () => {
    expect(runningOf(timings)?.perMin).toBeCloseTo(98, 12);
    const f = lossFigures(c, obs, COST, timings);
    expect(f.netMin).toBeCloseTo(37_100 / 98, 9);
    expect(f.slowMin).toBeCloseTo(37_100 / 98 - 371, 9);
    expect(f.shortMin).toBeCloseTo(380 - 37_100 / 98, 9);
    expect(f.slowMin! + f.shortMin!).toBeCloseTo(9, 9);
    expect(f.slowMin).toBeCloseTo(7.571, 3);
    expect(f.shortMin).toBeCloseTo(1.429, 3);
    /* the old form, run × (plate − running) ÷ plate = 7.6, is NOT what it uses */
    expect(Math.abs(f.slowMin! - (380 * 2) / 100)).toBeGreaterThan(0.02);
  });
  it('the pounds: 4 × 14.50 × 1.3 = £75.40/h × 85 ÷ 60 = £106.82; 8,500 × £0.04 = £340; every bar the same two rates', () => {
    const f = lossFigures(c, obs, COST, timings);
    expect(f.labourPerHour).toBeCloseTo(75.4, 9);
    expect(f.labour).toBeCloseTo((85 / 60) * 75.4, 9);
    expect(Math.round(f.labour!)).toBe(107);
    expect(f.contribution).toBeCloseTo(340, 9);
    for (const b of f.bars) {
      expect(b.labour).toBeCloseTo((b.min / 60) * 75.4, 9);
      expect(b.contribution).toBeCloseTo(b.min * 100 * 0.04, 9);
    }
    const bd = f.bars.find(b => b.key === 'cause:Breakdown')!;
    expect(bd.labour).toBeCloseTo(40.21, 2);
    expect(bd.contribution).toBeCloseTo(128, 9);
    /* price less materials wins over the margin when both are there */
    const f2 = lossFigures(c, obs, { ...COST, pricePerPack: 0.42, materialsPerPack: 0.34 });
    expect(f2.contributionPerPack).toBeCloseTo(0.08, 9);
    expect(f2.contribution).toBeCloseTo(680, 6);
    /* no cost on the line, no pounds */
    const f3 = lossFigures(c, obs);
    expect([f3.labour, f3.contribution]).toEqual([undefined, undefined]);
    expect(lossSays(f3, c).text).not.toMatch(/£/);
  });
});

describe('AUDIT losses — worked example 2 (Op 3 paces the line)', () => {
  it('450 × 96 = 43,200; 90 lost; 14 the rest; 35,136 ÷ 93.2 − 35,136 ÷ 96 = 11.0 slow on People; 3.0 short', () => {
    const c: LossCount = { from: T0, to: T0 + 480 * MIN, breakMin: 30, plannedMin: 450, made: 34_560, rejects: 576, ratePerMin: 96, rateFrom: 'standard-time', ratePerson: 'Op 3' };
    const obs = [stop('Breakdown', 60, 32), stop('Minor stops', 120, 20), stop('Changeover', 300, 18)];
    const f = lossFigures(c, obs, undefined, [timing(466, 300)]);
    expect(f.expected).toBe(43_200);
    expect(f.lostMin).toBeCloseTo(90, 9);
    expect(f.performanceMin).toBeCloseTo(14, 9);
    expect(f.slowMin).toBeCloseTo(35_136 / 93.2 - 366, 6);
    expect(f.slowMin).toBeCloseTo(11.0, 1);
    expect(f.shortMin).toBeCloseTo(3.0, 1);
    expect(f.bars.find(b => b.kind === 'slow')?.bone).toBe('people');
    expect(f.bars.find(b => b.kind === 'short')?.bone).toBe('machine');
  });
});

describe('AUDIT losses — random shifts, every identity', () => {
  const r = rng(1016);
  const CATS = ['Breakdown', 'Minor stops', 'Material', 'Quality', 'Change-over'];
  for (let k = 0; k < 120; k++) {
    const windowMin = 240 + Math.floor(r() * 480), breakMin = Math.floor(r() * 61), relief = r() < 0.2;
    const planned = windowMin - (relief ? 0 : breakMin);
    const rate = Math.round((20 + r() * 180) * 100) / 100;
    const obs: Observation[] = [];
    const nStops = Math.floor(r() * 9);
    for (let i = 0; i < nStops; i++) obs.push(stop(CATS[Math.floor(r() * CATS.length)]!, r() * windowMin, r() < 0.15 ? 0 : Math.round(r() * 40 * 10) / 10, { count: 1 + Math.floor(r() * 3), timing: r() < 0.7 ? 'stopwatch' : 'typed' }));
    /* two outside the window: one that started before it, one after */
    obs.push(stop('Breakdown', -5, 60), stop('Breakdown', windowMin + 1, 30));
    const rejects = Math.floor(r() * 2000);
    const stopsMin = obs.filter(o => o.startedAt >= T0 && o.startedAt < T0 + windowMin * MIN && !/change/i.test(o.category)).reduce((t, o) => t + o.durationMs / MIN, 0);
    const coMin = obs.filter(o => o.startedAt >= T0 && o.startedAt < T0 + windowMin * MIN && /change/i.test(o.category)).reduce((t, o) => t + o.durationMs / MIN, 0);
    const restWant = -20 + r() * 80;    // negative → the stops exceed the loss
    const expected = planned * rate;
    const made = Math.max(0, Math.round(expected - (stopsMin + coMin + rejects / rate + restWant) * rate));
    const c: LossCount = { from: T0, to: T0 + windowMin * MIN, breakMin, relief, plannedMin: planned, made, rejects, ratePerMin: rate, rateFrom: r() < 0.5 ? 'plate' : 'standard-time' };
    const running = r() < 0.7 ? Math.round(rate * (0.75 + r() * 0.35) * 2) / 2 : undefined;   // packs over 2 min, a whole count
    const timings = running ? [timing(running * 2, 120)] : undefined;
    const cost: CostModel | undefined = r() < 0.7 ? { crew: 1 + Math.floor(r() * 10), labourRatePerHour: 10 + r() * 20, labourBurden: 1 + r() * 0.5, marginPerPack: r() * 0.2 } : undefined;

    it(`shift ${k}: planned ${planned}, rate ${rate}, made ${made}, rejects ${rejects}, ${nStops} stops${running ? ', timed' : ''}`, () => {
      const f = lossFigures(c, obs, cost, timings);
      expect(plannedOf(c).workedOut).toBe(planned);
      expect(f.enough).toBe(true);
      expect(f.expected).toBeCloseTo(expected, 9);
      const lost = Math.max(0, expected - made) / rate;
      expect(f.lostMin).toBeCloseTo(lost, 9);
      expect(f.lostMin!).toBeGreaterThanOrEqual(0);
      /* the window: started inside it only — the one that began 5 min before and ran 60 min is out */
      expect(f.logged).toBe(inWindow(obs, c.from, c.to).length);
      expect(f.logged).toBe(nStops);
      expect(f.stopsMin).toBeCloseTo(stopsMin, 9);
      expect(f.changeoverMin).toBeCloseTo(coMin, 9);
      expect(f.rejectsMin).toBeCloseTo(rejects / rate, 9);
      expect(f.explainedMin).toBeCloseTo(stopsMin + coMin + rejects / rate, 9);
      /* the rest never negative; excess said instead */
      expect(f.performanceMin!).toBeGreaterThanOrEqual(0);
      expect(f.performanceMin).toBeCloseTo(Math.max(0, lost - f.explainedMin), 9);
      if (f.explainedMin > lost + 1e-9) expect(f.excessMin).toBeCloseTo(f.explainedMin - lost, 9); else expect(f.excessMin).toBeUndefined();
      /* stops + changeovers + rejects + rest = lost (+ the excess) */
      expect(f.stopsMin + f.changeoverMin + f.rejectsMin! + f.performanceMin! - (f.excessMin ?? 0)).toBeCloseTo(lost, 9);
      expect(f.runMin).toBeCloseTo(Math.max(0, planned - stopsMin - coMin), 9);
      /* the bars add up to what they show: causes = stops; the rest bars drop under half a minute */
      expect(f.bars.filter(b => b.kind === 'cause').reduce((t, b) => t + b.min, 0)).toBeCloseTo(stopsMin, 9);
      const sum = f.bars.reduce((t, b) => t + b.min, 0);
      expect(sum).toBeLessThanOrEqual(f.explainedMin + f.performanceMin! + 1e-9);
      expect(sum).toBeGreaterThanOrEqual(f.explainedMin + f.performanceMin! - 1.0 - 1e-9);
      /* Nakajima's split */
      if (running && timings) {
        const through = made + rejects;
        expect(f.netMin).toBeCloseTo(through / running, 6);
        expect(f.slowMin).toBeDefined(); expect(f.shortMin).toBeDefined();
        expect(f.slowMin! + f.shortMin!).toBeCloseTo(f.performanceMin!, 9);
        expect(f.slowMin!).toBeGreaterThanOrEqual(-1e-9);
        expect(f.shortMin!).toBeGreaterThanOrEqual(-1e-9);
        const slowRaw = running < rate ? through / running - through / rate : 0;
        expect(f.slowRawMin).toBeCloseTo(slowRaw, 6);
        expect(f.slowMin).toBeCloseTo(Math.min(slowRaw, f.performanceMin!), 6);
        /* the doc's form for short stops — run time − net operating time — holds whenever nothing was clamped */
        /* (above the rate the module puts the whole rest on short stops and flags it — the identity is for a timing below the rate) */
        if (running < rate && slowRaw <= f.performanceMin! && made <= expected && f.excessMin === undefined) expect(f.shortMin).toBeCloseTo(f.runMin! - f.netMin!, 6);
        if (running > rate) { expect(f.abovePlate).toBe(true); expect(f.slowMin).toBeCloseTo(0, 9); }
      } else { expect(f.slowMin).toBeUndefined(); expect(f.netMin).toBeUndefined(); }
      /* the pounds: two parts, proportional, never blended */
      if (cost && cost.crew! > 0) {
        const perHour = cost.crew! * cost.labourRatePerHour! * cost.labourBurden!;
        expect(f.labourPerHour).toBeCloseTo(perHour, 9);
        expect(f.labour).toBeCloseTo((lost / 60) * perHour, 9);
        if (cost.marginPerPack! > 0) expect(f.contribution).toBeCloseTo(lost * rate * cost.marginPerPack!, 6); else expect(f.contribution).toBeUndefined();
        for (const b of f.bars) expect(b.labour).toBeCloseTo((b.min / 60) * perHour, 9);
      } else expect(f.labour).toBeUndefined();
      /* words, never NaN */
      expect(lossSays(f, c).text).not.toMatch(/NaN|Infinity|undefined/);
    });
  }
});

describe('AUDIT losses — edges and questions', () => {
  it('FINDING (design): a stop that began 1 min before the shift and ran 60 min into it counts for nothing; one that began 1 min before the end counts whole', () => {
    const c: LossCount = { from: T0, to: T0 + 480 * MIN, plannedMin: 480, made: 40_000, rejects: 0, ratePerMin: 100 };
    const before = lossFigures(c, [stop('Breakdown', -1, 60)]);
    expect(before.stopsMin).toBe(0);
    const straddle = lossFigures(c, [stop('Breakdown', 479, 60)]);
    expect(straddle.stopsMin).toBe(60);
  });
  it('the rejects bar carries "idle labour" though the crew were working while making them — a wording question', () => {
    const c: LossCount = { from: T0, to: T0 + 480 * MIN, plannedMin: 480, made: 40_000, rejects: 1000, ratePerMin: 100 };
    const f = lossFigures(c, [], COST);
    const rej = f.bars.find(b => b.kind === 'rejects')!;
    expect(rej.labour).toBeCloseTo((10 / 60) * 75.4, 9);
  });
  it('made more than expected: nothing lost, even with 30 min of stops logged — said to check the rate', () => {
    const c: LossCount = { from: T0, to: T0 + 480 * MIN, plannedMin: 480, made: 49_000, rejects: 0, ratePerMin: 100 };
    const f = lossFigures(c, [stop('Breakdown', 10, 30)]);
    expect(f.lostMin).toBe(0);
    expect(f.overPacks).toBe(1000);
    expect(f.excessMin).toBe(30);
    expect(lossSays(f, c).verdict).toBe('Nothing lost');
  });
  it('zero rate, no planned minutes, nothing made: words, never a number', () => {
    const f = lossFigures({ from: T0, to: T0 + 480 * MIN, ratePerMin: 0 });
    expect(f.enough).toBe(false);
    expect(f.missing).toEqual(['the planned minutes', 'the packs made', 'the rate a minute']);
    expect(lossSays(f).text).not.toMatch(/NaN|Infinity/);
    expect(countedRate(undefined)).toBeUndefined();
  });
  it('a timing with no packs is not a running speed; the pooled speed weighs a longer timing more', () => {
    expect(runningOf([{ id: 'a', at: 0, packs: 0, sec: 60 }])?.perMin).toBe(0);
    expect(lossFigures({ from: T0, to: T0 + 480 * MIN, plannedMin: 450, made: 36_500, rejects: 600, ratePerMin: 100 }, [], undefined, [{ id: 'a', at: 0, packs: 0, sec: 60 }]).slowMin).toBeUndefined();
    expect(runningOf([timing(100, 60), timing(50, 120)])?.perMin).toBeCloseTo(150 / 3, 9);   // 50 a minute, not the mean of 100 and 25
  });
  it('countedRate rounds the counted rate to a tenth before it becomes a reading', () => {
    expect(countedRate({ from: T0, to: T0 + 480 * MIN, plannedMin: 450, made: 36_512 })?.perMin).toBe(81.1);
  });
});
