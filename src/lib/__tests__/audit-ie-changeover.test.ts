/* AUDIT (16 Oct) — SMED, lib/ie/changeover: the grid's columns (elapsed =
 * Σ each column's longest; labour = Σ every element by everyone on it), the
 * ladder, the running pattern, the cost per shift → day → week → year in two
 * parts, and EPEI — on the two worked examples and on random sequences. */
import { describe, it, expect } from 'vitest';
import { arrange, ladderOf, changeoverFigures, runningOf, changeoversPer, extrapolate, intervalOf, onTarget, SMED_TARGET_SEC, mins, span, moneyOf, standardFrom, type Rung, RUNGS } from '../../tools/changeover/changeover';
import type { ChangeoverStep, RunningPattern } from '../study';
import { rng } from './audit-ie-ref';

const el = (id: string, order: number, min: number, side: ChangeoverStep['side'], o: Partial<ChangeoverStep> = {}): ChangeoverStep =>
  ({ id, order, name: id, sec: min * 60, side, source: 'timed', ...o });

/* Worked example 2 (docs/TOOLKIT.md §6, the module's test): A 10 I →4 clamps; E 9 E; B 6 I convert;
   C 8 I → 5 alongside A by the fitter; D 5 I eliminate; F 4 I keep, two people. */
const EX2: ChangeoverStep[] = [
  el('A', 1, 10, 'internal', { crew: ['Op 1'], plan: { kind: 'streamline', how: 'clamps', targetSec: 240 } }),
  el('E', 2, 9, 'external', { crew: ['Op 2'] }),
  el('B', 3, 6, 'internal', { crew: ['Op 1'], plan: { kind: 'convert', how: 'prepare' } }),
  el('C', 4, 8, 'internal', { crew: ['Op 1'], plan: { kind: 'streamline', how: 'parallel', targetSec: 300, alongside: 'A', crew: ['Fitter'] } }),
  el('D', 5, 5, 'internal', { crew: ['Op 1'], plan: { kind: 'eliminate', how: 'no-adjust' } }),
  el('F', 6, 4, 'internal', { crew: ['Op 1', 'Op 2'], plan: { kind: 'keep' } }),
];
const RUN: RunningPattern = { shiftsPerDay: 2, hoursPerShift: 8, breakMin: 30, daysPerWeek: 7, weeksPerYear: 48 };

describe('AUDIT changeover — the ladder and the cost (worked example 2)', () => {
  it('42 → 33 → 27 → 9 min; labour 17 min streamlined (two at once, F by two)', () => {
    const l = ladderOf(EX2);
    expect([l.now.elapsedSec, l.separated.elapsedSec, l.converted.elapsedSec, l.streamlined.elapsedSec].map(s => s / 60)).toEqual([42, 33, 27, 9]);
    expect(l.streamlined.labourSec / 60).toBe(17);
    expect(l.now.labourSec / 60).toBe(46);     // 42 + F's second person
    expect(onTarget(l.streamlined.elapsedSec)).toBe(true);
  });
  it('2 × (480 − 30) × 7 = 6,300 min running a week; 3 a shift → 42 a week; 42 × 42 = 1,764 min = 29.4 h, 28%; 176,400 packs; £5,880 + £8,820; × 48 = 1,411.2 h', () => {
    const { run } = runningOf(RUN);
    expect(run?.minutesPerShift).toEqual([450, 450]);
    expect(run?.minutesPerWeek).toBe(6300);
    const per = changeoversPer({ count: 3, per: 'shift' }, run)!;
    expect(per).toEqual({ shift: 3, day: 6, week: 42 });
    const s = extrapolate(42 * 60, per, run!, 100, { labourPerHour: 200, marginPerPack: 0.05 });
    expect(s.week.sec / 3600).toBeCloseTo(29.4, 9);
    expect(s.week.packs).toBe(176_400);
    expect(s.week.labour).toBeCloseTo(5880, 9);
    expect(s.week.contribution).toBeCloseTo(8820, 9);
    expect(s.shareOfRunning).toBeCloseTo(0.28, 9);
    expect(s.year!.sec / 3600).toBeCloseTo(1411.2, 9);
    /* shift → day → week consistent */
    expect(s.day.sec).toBeCloseTo(s.shift.sec * 2, 9);
    expect(s.week.sec).toBeCloseTo(s.day.sec * 7, 9);
    /* idle labour from lib/cost: crew × wage × on-costs */
    expect(moneyOf({ crew: 4, labourRatePerHour: 14.5, labourBurden: 1.3, marginPerPack: 0.04 })).toEqual({ labourPerHour: expect.closeTo(75.4, 9), marginPerPack: 0.04 });
    expect(moneyOf({ crew: 4 })).toBeUndefined();
  });
  it('the changeovers a week typed back as a shift’s: 42 a week ÷ 7 ÷ 2 = 3; 6 a day → 3 a shift', () => {
    const { run } = runningOf(RUN);
    expect(changeoversPer({ count: 42, per: 'week' }, run)).toEqual({ shift: 3, day: 6, week: 42 });
    expect(changeoversPer({ count: 6, per: 'day' }, run)).toEqual({ shift: 3, day: 6, week: 42 });
  });
  it('shifts of different length and breaks; relief as 0; a break as long as the shift refused', () => {
    expect(runningOf({ shiftsPerDay: 2, shiftHours: [8, 12], shiftBreaks: [30, 0], daysPerWeek: 5 }).run?.minutesPerDay).toBe(450 + 720);
    expect(runningOf({ shiftsPerDay: 1, hoursPerShift: 8, breakMin: 480, daysPerWeek: 5 }).missing).toEqual(['breaks shorter than the shift']);
    expect(runningOf({ shiftsPerDay: 1, hoursPerShift: 8, daysPerWeek: 5 }).missing).toEqual(['the planned breaks a shift the line stops for']);
    expect(runningOf(undefined).missing).toEqual(['the shifts a day', 'the hours a shift', 'the days a week']);
  });
});

describe('AUDIT changeover — EPEI (worked example 1)', () => {
  const products = (runMin: number) => ['A', 'B', 'C', 'D', 'E'].map(p => ({ id: p, product: p, runMinPerDay: runMin }));
  const one = (min: number) => changeoverFigures([el('x', 1, min, 'internal')]);
  it('450 − 300 = 150 free; 5 × 42 ÷ 150 = 1.4 days; 5 × 27 = 0.9; daily needs 30 min', () => {
    const iv = intervalOf(changeoverFigures([el('i', 1, 27, 'internal'), el('e', 2, 15, 'external')]), products(60), 450);
    expect(iv.freeMinPerDay).toBe(150);
    expect(iv.daysNow).toBeCloseTo(1.4, 9);
    expect(iv.daysAfter).toBeCloseTo(0.9, 9);
    expect(iv.dailyMin).toBe(30);
    /* a product's run from demand ÷ rate: 3,600 a day at 60 a minute is 60 min */
    const byRate = intervalOf(one(42), ['A', 'B', 'C', 'D', 'E'].map(p => ({ id: p, product: p, demandPerDay: 3600, ratePerMin: 60 })), 450);
    expect(byRate.runMinPerDay).toBe(300);
    expect(byRate.daysNow).toBeCloseTo(1.4, 9);
  });
  it('monotone in the changeover time; no free time says so, never a negative interval', () => {
    let last = 0;
    for (let m = 5; m <= 120; m += 5) { const d = intervalOf(one(m), products(60), 450).daysNow!; expect(d).toBeGreaterThan(last); last = d; }
    const full = intervalOf(one(42), products(90), 450);
    expect(full.ready).toBe(false);
    expect(full.freeMinPerDay).toBe(0);
    expect(full.daysNow).toBeUndefined();
    expect(intervalOf(one(42), products(60).slice(0, 1), 450).ready).toBe(false);
  });
  it('single-digit minutes is under ten: 9:59 on it, 10:00 not', () => {
    expect(SMED_TARGET_SEC).toBe(600);
    expect(onTarget(599)).toBe(true); expect(onTarget(600)).toBe(false);
    expect([mins(30), mins(570), mins(599.9), mins(600), mins(1800)]).toEqual(['30.0 s', '9.5 min', '10 min', '10 min', '30 min']);
    expect([span(7199), span(7200), span(105_840)]).toEqual(['120 min', '2 h', '29.4 h']);
  });
});

describe('AUDIT changeover — random sequences: the grid’s invariants', () => {
  const r = rng(42);
  const KIND: (ChangeoverStep['plan'] | undefined)[] = [undefined, { kind: 'keep' }, { kind: 'convert', how: 'prepare' }, { kind: 'convert', how: 'jig', targetSec: 0 }, { kind: 'streamline', how: 'clamps' }, { kind: 'eliminate' }];
  const grew: { rung: Rung; from: number; to: number; plan: string }[] = [];
  for (let k = 0; k < 150; k++) {
    const n = 1 + Math.floor(r() * 10);
    const seq: ChangeoverStep[] = [];
    for (let i = 0; i < n; i++) {
      const sec = r() < 0.1 ? undefined : Math.round(r() * 900);
      const plan = KIND[Math.floor(r() * KIND.length)];
      const p = plan ? { ...plan } : undefined;
      if (p && (p.kind === 'convert' || p.kind === 'streamline') && r() < 0.6) p.targetSec = Math.round(r() * 900);   // may exceed sec: no clamp in the module
      if (p && p.kind === 'streamline' && r() < 0.4 && i > 0) { p.alongside = `s${Math.floor(r() * i)}`; p.crew = ['Fitter']; }
      seq.push({ id: `s${i}`, order: n - i, name: `S${i}`, sec, side: r() < 0.3 ? 'external' : 'internal', source: 'timed',
        crew: Array.from({ length: Math.floor(r() * 3) }, (_, j) => `Op ${j + 1}`), ...(r() < 0.25 && i > 0 ? { alongside: `s${Math.floor(r() * i)}` } : {}), ...(p ? { plan: p } : {}) });
    }
    it(`sequence ${k}: ${n} elements — elapsed = Σ columns’ longest, ≤ labour, ≥ longest element, at every rung`, () => {
      for (const rung of RUNGS) {
        const a = arrange(seq, rung);
        const placedSec = a.placed.reduce((t, p) => t + p.sec, 0);
        expect(a.elapsedSec).toBeCloseTo(a.cols.reduce((t, c) => t + c.sec, 0), 9);
        expect(a.elapsedSec).toBeLessThanOrEqual(placedSec + 1e-9);
        expect(a.elapsedSec).toBeGreaterThanOrEqual(Math.max(0, ...a.placed.map(p => p.sec)) - 1e-9);
        expect(a.labourSec).toBeCloseTo(a.placed.reduce((t, p) => t + p.sec * Math.max(1, p.crew.length), 0), 9);
        expect(a.labourSec).toBeGreaterThanOrEqual(a.elapsedSec - 1e-9);
        /* every placed element sits in exactly one column; column ids are the placed ids */
        expect(a.cols.flatMap(c => c.ids).sort()).toEqual(a.placed.map(p => p.st.id).sort());
        if (rung !== 'now') expect(a.placed.every(p => p.st.side === 'internal')).toBe(true);
      }
      const l = ladderOf(seq);
      expect(l.separated.elapsedSec).toBeLessThanOrEqual(l.now.elapsedSec + 1e-9);
      if (l.converted.elapsedSec > l.separated.elapsedSec + 1e-9) grew.push({ rung: 'converted', from: l.separated.elapsedSec, to: l.converted.elapsedSec, plan: 'convert with targetSec > sec' });
      /* a streamline plan that moves an element ALONGSIDE a shorter one can lengthen the stop — that is the plan's
         own doing, read back honestly; a target can no longer (UPGRADE-AUDIT M14) */
      if (l.streamlined.elapsedSec > l.converted.elapsedSec + 1e-9 && !seq.some(s => s.plan?.kind === 'streamline' && s.plan.alongside)) grew.push({ rung: 'streamlined', from: l.converted.elapsedSec, to: l.streamlined.elapsedSec, plan: 'streamline with targetSec > sec' });
      expect(changeoverFigures(seq).nowSec).toBeCloseTo(l.now.elapsedSec, 9);
    });
  }
  it('FIXED (UPGRADE-AUDIT M14): a plan whose target is longer than the element used to make the ladder climb — a target past the time counts as the time', () => {
    const seq = [el('A', 1, 10, 'internal', { plan: { kind: 'streamline', how: 'clamps', targetSec: 20 * 60 } }), el('B', 2, 6, 'internal', { plan: { kind: 'convert', how: 'prepare', targetSec: 9 * 60 } })];
    const l = ladderOf(seq);
    expect(l.separated.elapsedSec / 60).toBe(16);
    expect(l.converted.elapsedSec / 60).toBe(16);      // converting B cannot leave more than its 6 inside
    expect(l.streamlined.elapsedSec / 60).toBe(16);    // A cannot be streamlined UP to 20
    expect(grew).toEqual([]);
  });
  it('the agreed standard stores the separated minutes to a tenth — a derived figure rounded on the record', () => {
    const s = standardFrom([el('A', 1, 10.04, 'internal'), el('E', 2, 3, 'external')], { id: 'x', at: 1, studyId: 'st' });
    expect(s.minutes).toBe(10);
    expect(standardFrom([el('A', 1, 10.05, 'internal')], { id: 'x', at: 1, studyId: 'st' }).minutes).toBe(10.1);
  });
});
