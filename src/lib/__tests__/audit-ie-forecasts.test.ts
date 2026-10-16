/* AUDIT (16 Oct) — the two forecasts and the run: lib/rampUp (Crawford's
 * unit curve fitted by least squares), lib/pace (the burn-down), lib/run
 * (net rate and the three rules), lib/cost (£/h), lib/hoursLost. */
import { describe, it, expect } from 'vitest';
import { climbOf, CLIMB_MIN_RUNS, CLIMB_HORIZON_DAYS } from '../rampUp';
import { paceOf, PACE_MIN_DONE, PACE_WINDOW } from '../pace';
import { readRun, runLine, num, pct } from '../run';
import { labourPerHour, labourPerMs, burdenOf, fmtGBP } from '../cost';
import { hoursTally, fullDays, daysWord } from '../hoursLost';
import type { Test, TestItem } from '../testing';
import { addDays, daysBetween } from '../weeks';
import { rng } from './audit-ie-ref';

/* ---------- reference least squares on log T vs log n ---------- */
function refFit(nets: number[]): { a: number; b: number } {
  const xs = nets.map((_, i) => Math.log(i + 1)), ys = nets.map(v => Math.log(1 / v));
  const n = xs.length, mx = xs.reduce((s, x) => s + x, 0) / n, my = ys.reduce((s, y) => s + y, 0) / n;
  const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0), sxy = xs.reduce((s, x, i) => s + (x - mx) * (ys[i]! - my), 0);
  const b = sxy / sxx;
  return { a: my - b * mx, b };
}
const pts = (xs: [string, number][]) => xs.map(([on, net], i) => ({ on, net, testId: `t${i}`, runId: `r${i}` }));

describe('AUDIT rampUp — Crawford’s unit curve', () => {
  it('b = log(0.8) ÷ log 2 = −0.322; an exact 80% curve reads back 0.8; the run where T = 1 ÷ agreed', () => {
    expect(Math.log(0.8) / Math.log(2)).toBeCloseTo(-0.32193, 5);
    const r = rng(8);
    for (let k = 0; k < 60; k++) {
      const rate = 0.6 + r() * 0.38, b = Math.log2(rate), t1 = 1 / (20 + r() * 60), n = 3 + Math.floor(r() * 8);
      const nets = Array.from({ length: n }, (_, i) => 1 / (t1 * (i + 1) ** b));
      const agreed = nets[n - 1]! * (1.05 + r());
      const c = climbOf(pts(nets.map((v, i) => [addDays('2026-10-01', i * 2), v])), agreed, { product: 'P' });
      const { a, b: bb } = refFit(nets);
      expect(bb).toBeCloseTo(b, 9);
      const nStar = Math.exp((Math.log(1 / agreed) - a) / bb);
      const runNo = Math.max(n + 1, Math.ceil(nStar - 1e-9));
      /* a forecast more than a year out is said as not within reach, never as a date (UPGRADE-AUDIT M11) */
      if ((runNo - n) * 2 > CLIMB_HORIZON_DAYS) { expect(c.kind).toBe('flat'); expect(c.text).toMatch(/does not reach .* within a year/); continue; }
      expect(c.kind).toBe('climbing');
      expect(c.learning).toBeCloseTo(rate, 9);
      expect(c.runNo).toBe(runNo);
      expect(c.fit!(n)).toBeCloseTo(nets[n - 1]!, 6);
      /* the date: the runs' own cadence (2 days) from the last run */
      expect(c.at).toBe(addDays(addDays('2026-10-01', (n - 1) * 2), Math.ceil((c.runNo! - n) * 2)));
    }
  });
  it('under three runs too early; at or over the rate "meets" even from one run; a flat fit never a date', () => {
    expect(CLIMB_MIN_RUNS).toBe(3);
    expect(climbOf(pts([['2026-10-01', 90], ['2026-10-02', 95]]), 120, { product: 'P' }).kind).toBe('early');
    expect(climbOf(pts([['2026-10-01', 121]]), 120, { product: 'P' }).kind).toBe('meets');
    expect(climbOf(pts([['2026-10-01', 100], ['2026-10-02', 100], ['2026-10-03', 100]]), 120, { product: 'P' }).kind).toBe('flat');
  });
  it('FIXED (UPGRADE-AUDIT M11): a barely-rising climb (100 → 100.1 → 100.2) used to forecast run 3.5e44 and print "NaN-NaN-NaN" — it is said as not within reach', () => {
    const c = climbOf(pts([['2026-10-01', 100], ['2026-10-02', 100.1], ['2026-10-03', 100.2]]), 120, { product: 'P' });
    expect(c.kind).toBe('flat');
    expect(c.at).toBeUndefined();
    expect(c.text).toBe('P: 100 → 100.1 → 100.2 a minute over 3 runs — climbing too slowly: at this climb it does not reach 120 within a year.');
    expect(c.text).not.toMatch(/NaN|e\+/);
    /* a merely slow climb that lands years out is said the same way, never as a date */
    const slow = climbOf(pts([['2026-10-01', 100], ['2026-10-02', 101], ['2026-10-03', 102]]), 120, { product: 'P' });
    expect(slow.kind).toBe('flat');
    expect(slow.at).toBeUndefined();
    /* one that lands inside the year keeps its date and run */
    const soon = climbOf(pts([['2026-10-01', 100], ['2026-10-02', 108], ['2026-10-03', 113]]), 120, { product: 'P' });
    expect(soon.kind).toBe('climbing');
    expect(soon.at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(daysBetween('2026-10-03', soon.at!)).toBeLessThanOrEqual(CLIMB_HORIZON_DAYS);
  });
});

/* ---------- pace: the burn-down ---------- */
let k = 0;
const stage = (o: Partial<Test> = {}): Test => ({ id: `s${k++}`, projectId: 'p', kind: 'install', title: `Stage ${k}`, outcome: 'planned', sort: k, createdAt: 1, updatedAt: 1, ...o });

describe('AUDIT pace — the burn-down', () => {
  it('7 done in 14 days, 7 to go → 14 days; 8 done → 12.25 → 13; the rate is per calendar day over an inclusive window', () => {
    expect(7 / (7 / 14)).toBe(14);
    expect(Math.ceil(7 / (8 / 14))).toBe(13);
    const r = rng(31);
    for (let t = 0; t < 40; t++) {
      const today = '2026-10-10';
      const lately = PACE_MIN_DONE + Math.floor(r() * 10), earlier = Math.floor(r() * 5), left = 1 + Math.floor(r() * 20);
      const tests = [
        stage({ outcome: 'passed', plannedFor: '2026-08-01', ranOn: '2026-08-02' }),
        ...Array.from({ length: earlier }, () => stage({ outcome: 'passed', ranOn: addDays(today, -(PACE_WINDOW + 1 + Math.floor(r() * 20))) })),
        ...Array.from({ length: lately }, () => stage({ outcome: 'passed', ranOn: addDays(today, -Math.floor(r() * PACE_WINDOW)) })),
        ...Array.from({ length: left }, () => stage({ plannedFor: '2026-10-20' })),
      ];
      const p = paceOf({ tests, today })!;
      expect(p.kind).toBe('forecast');
      expect(p.doneLately).toBe(lately);
      expect(p.windowDays).toBe(PACE_WINDOW);
      expect(p.left).toBe(left);
      expect(p.at).toBe(addDays(today, Math.ceil(left / (lately / PACE_WINDOW))));
    }
  });
});

describe('AUDIT run — net rate and the three rules', () => {
  it('net = (packs − rejects) ÷ minutes; rejects% = rejects ÷ packs × 100; met at ≥ rate, ≤ rejects, ≥ minutes', () => {
    const r = rng(12);
    for (let i = 0; i < 100; i++) {
      const minutes = 10 + Math.floor(r() * 120), packs = Math.floor(r() * 10_000), rejects = Math.floor(r() * Math.min(packs + 1, 200));
      const agreed = { rate: 20 + r() * 100, minutes: 30 + Math.floor(r() * 60), rejectsMax: r() * 3 };
      const x = readRun({ run: { minutes, packs, rejects }, runAgreed: agreed });
      expect(x.good).toBe(packs - rejects);
      expect(x.net).toBeCloseTo((packs - rejects) / minutes, 12);
      if (packs > 0) expect(x.rejectPct).toBeCloseTo((rejects / packs) * 100, 12);
      const want = (packs - rejects) / minutes >= agreed.rate && (packs > 0 ? (rejects / packs) * 100 <= agreed.rejectsMax : false) && minutes >= agreed.minutes;
      if (packs > 0) expect(x.meets).toBe(want);
    }
    /* exactly on the agreed numbers is met */
    expect(readRun({ run: { minutes: 60, packs: 3600, rejects: 36 }, runAgreed: { rate: 59.4, minutes: 60, rejectsMax: 1 } }).meets).toBe(true);
  });
  it('FIXED (UPGRADE-AUDIT M12): net 59.96 against 60 used to read "Netted 60 ppm against 60 agreed — 0 ppm short" in red — a miss the rounding hides is said to one more place', () => {
    const t = { run: { minutes: 50, packs: 2998, rejects: 0 }, runAgreed: { rate: 60 } };
    const x = readRun(t);
    expect(x.net).toBeCloseTo(59.96, 9);
    expect(x.meets).toBe(false);
    expect(runLine(t)).toBe('Netted 59.96 ppm against 60 agreed — 0.04 ppm short · 0 rejects (0%) · 50 min');
    /* rejects: 1.01% against 1% — "1% at most", got "1.01%", "0.01% over" */
    const y = readRun({ run: { minutes: 60, packs: 10_000, rejects: 101 }, runAgreed: { rate: 100, rejectsMax: 1 } });
    expect(y.checks.find(c => c.what === 'rejects')).toMatchObject({ got: '1.01%', agreed: '1% at most', ok: false, gap: '0.01% over' });
    /* a clear miss keeps the usual one place */
    expect(runLine({ run: { minutes: 50, packs: 2900, rejects: 0 }, runAgreed: { rate: 60 } })).toBe('Netted 58 ppm against 60 agreed — 2 ppm short · 0 rejects (0%) · 50 min');
    expect([num(59.96), num(0.04), pct(0.004), pct(1.004)]).toEqual(['60', '0', '0%', '1%']);
  });
});

describe('AUDIT cost and conversions', () => {
  it('£/h = crew × wage × on-costs (a multiplier, 1.3 not 0.3; default 1); £/ms × 3,600,000 = £/h; £/h ↔ £/min round-trips', () => {
    expect(labourPerHour({ crew: 4, labourRatePerHour: 14.5, labourBurden: 1.3 })).toBeCloseTo(75.4, 9);
    expect(labourPerHour({ crew: 4, labourRatePerHour: 14.5 })).toBeCloseTo(58, 9);
    expect(burdenOf({ labourBurden: 0 })).toBe(1);
    expect(labourPerHour({ crew: 0, labourRatePerHour: 14.5 })).toBe(0);
    const r = rng(2);
    for (let i = 0; i < 100; i++) {
      const w = { crew: 1 + Math.floor(r() * 12), labourRatePerHour: 8 + r() * 30, labourBurden: 1 + r() * 0.5 };
      const h = labourPerHour(w);
      expect(labourPerMs(w) * 3_600_000).toBeCloseTo(h, 9);
      expect((h / 60) * 60).toBeCloseTo(h, 12);
      expect(((h / 3600) * 85 * 60) / 85 * 60).toBeCloseTo(h, 9);
    }
  });
  it('fmtGBP: whole pounds under £1,000, "£18.4k" above — TOOLKIT 3.4 asks for "£18,400"', () => {
    expect(fmtGBP(412)).toBe('£412');
    expect(fmtGBP(18_400)).toBe('£18.4k');
    expect(fmtGBP(999.5)).toBe('£1,000');
  });
});

describe('AUDIT hoursLost — hours into working days', () => {
  it('full days = ⌊(banked + adding) ÷ day⌋; what a push did not use stays banked; the push is calendar days both sides', () => {
    expect(fullDays(3, 5, 8)).toBe(1); expect(fullDays(3, 4, 8)).toBe(0); expect(fullDays(7.999999999, 0.000000001, 8)).toBe(1);
    const found = (hours: number, move?: [string, string]): TestItem => ({ id: `i${k++}`, projectId: 'p', testId: 's1', kind: 'found', what: 'x', hoursLost: hours, ...(move ? { movedFrom: move[0], movedTo: move[1] } : {}), sort: k, createdAt: k, updatedAt: k } as TestItem);
    const t = hoursTally('s1', [found(10, ['2026-10-16', '2026-10-17'])], 8);   // Fri → Sat: one calendar day
    expect(t.pushedDays).toBe(1); expect(t.banked).toBe(2);
    const t2 = hoursTally('s1', [found(10, ['2026-10-16', '2026-10-19'])], 8);  // Fri → Mon: three calendar days eat the bank
    expect(t2.pushedDays).toBe(3); expect(t2.banked).toBe(0);
    expect(daysWord(5, 8)).toBe('about three quarters of a day');   // 0.625 of a day rounds up to ¾
    expect(daysWord(7, 8)).toBe('about 1 day');
  });
});
