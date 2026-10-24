/* AUDIT (16 Oct) — the measured test, lib/ie/sample, against an independent
 * reference (audit-ie-ref): sample sd n−1, Ppk/Pp from the overall spread,
 * Cpk/Cp from the mean moving range ÷ 1.128, the share outside from the
 * normal tails, the packers' rules and the TNE table, enough and flagged. */
import { describe, it, expect } from 'vitest';
import { sample, sampleSays, capabilityWords, inWords, upperTail, tneFor, sdWithinOf, CPK_FROM, drifts } from '../../tools/capability/sample';
import type { AgreedReadings, StudyReading } from '../study';
import { normalUpperTail, sd as refSd, mean as refMean, rng, gauss } from './audit-ie-ref';
import { normalQuantile } from '../ie/dist';

const rs = (vs: number[]): StudyReading[] => vs.map((value, i) => ({ id: `r${i + 1}`, value, at: i }));
/** A bell's n quantiles about a centre, taken lowest, highest, next lowest… —
 *  bell-shaped, steady, and no drift between neighbours. */
const bellZigzag = (n: number, centre: number, s: number): number[] => {
  const q = Array.from({ length: n }, (_, i) => centre + s * normalQuantile((i + 0.5) / n));
  return q.map((_, i) => (i % 2 ? q[n - 1 - (i - 1) / 2] : q[i / 2])!);
};
const LIM: AgreedReadings = { kind: 'limits', unit: 'g', nominal: 400, lower: 400, upper: 404, count: 30 };

/* ---------- the reference, from first principles ---------- */
const refIndex = (m: number, s: number, lo?: number, hi?: number) =>
  Math.min(lo === undefined ? Infinity : (m - lo) / (3 * s), hi === undefined ? Infinity : (hi - m) / (3 * s));
const refShare = (m: number, s: number, lo?: number, hi?: number) =>
  (lo === undefined ? 0 : normalUpperTail((m - lo) / s)) + (hi === undefined ? 0 : normalUpperTail((hi - m) / s));
const refMrSigma = (xs: number[]) => { let t = 0; for (let i = 1; i < xs.length; i++) t += Math.abs(xs[i]! - xs[i - 1]!); return t / (xs.length - 1) / 1.128; };

describe('AUDIT sample — the worked example and the normal tail', () => {
  it('mean 401.2, s 0.6, limits 400–404: Ppk = 1.2 ÷ 1.8 = 0.667; z 2.0 → 2.28% → "about 2 in 100" — the normal tail, not a rule of thumb', () => {
    expect(refIndex(401.2, 0.6, 400, 404)).toBeCloseTo(0.6667, 4);
    const share = refShare(401.2, 0.6, 400, 404);
    expect(share).toBeCloseTo(0.02275, 5);
    /* the app's tail function, same inputs */
    expect(upperTail(2) + upperTail((404 - 401.2) / 0.6)).toBeCloseTo(share, 7);
    expect(inWords(share)).toBe('about 2 in 100');
  });
  it('upperTail agrees with Simpson integration of the density to 2e-7 over z ∈ [−3, 6]', () => {
    for (let z = -3; z <= 6; z += 0.25) expect(Math.abs(upperTail(z) - normalUpperTail(z))).toBeLessThan(2e-7);
    expect(upperTail(0)).toBeCloseTo(0.5, 6);   // NR's erfc is good to 1.2e-7, no better
    expect(upperTail(1)).toBeCloseTo(0.158655, 6);
    expect(upperTail(3)).toBeCloseTo(0.0013499, 6);
  });
});

describe('AUDIT sample — random readings against the reference', () => {
  const r = rng(20261016);
  for (let k = 0; k < 40; k++) {
    const n = 5 + Math.floor(r() * 40);
    const m0 = 395 + r() * 10, s0 = 0.2 + r() * 2;
    const xs = Array.from({ length: n }, () => Math.round((m0 + s0 * gauss(r)) * 100) / 100);
    const lower = r() < 0.8 ? 398 + r() * 2 : undefined, upper = r() < 0.8 ? 402 + r() * 3 : undefined;
    if (lower === undefined && upper === undefined) continue;
    const a: AgreedReadings = { kind: 'limits', unit: 'g', lower, upper, count: n };
    it(`case ${k}: n ${n} — sd n−1, Ppk/Pp, Cpk/Cp from MR, the share from both tails`, () => {
      const f = sample(a, rs(xs));
      const m = refMean(xs), s = refSd(xs);
      expect(f.n).toBe(n);
      expect(f.mean).toBeCloseTo(m, 9);
      expect(f.sd).toBeCloseTo(s, 9);
      /* the population sd (÷ n) must NOT be what it uses */
      const popSd = Math.sqrt(xs.reduce((t, x) => t + (x - m) ** 2, 0) / n);
      expect(Math.abs((f.sd ?? 0) - popSd)).toBeGreaterThan(1e-9);
      expect(f.sdWithin).toBeCloseTo(refMrSigma(xs), 9);
      expect(sdWithinOf(xs)).toBeCloseTo(refMrSigma(xs), 9);
      expect(f.ppk).toBeCloseTo(refIndex(m, s, lower, upper), 9);
      expect(f.cpk).toBeCloseTo(refIndex(m, refMrSigma(xs), lower, upper), 9);
      if (lower !== undefined && upper !== undefined) {
        expect(f.pp).toBeCloseTo((upper - lower) / (6 * s), 9);
        expect(f.cp).toBeCloseTo((upper - lower) / (6 * refMrSigma(xs)), 9);
        /* Ppk ≤ Pp, Cpk ≤ Cp always: an off-centre process cannot beat its spread */
        expect(f.ppk!).toBeLessThanOrEqual(f.pp! + 1e-12);
        expect(f.cpk!).toBeLessThanOrEqual(f.cp! + 1e-12);
      } else {
        expect(f.pp).toBeUndefined();
        expect(f.cp).toBeUndefined();
      }
      expect(f.shareOut).toBeCloseTo(refShare(m, s, lower, upper), 6);
      /* outside: the count below lower or above upper */
      const out = xs.filter(x => (lower !== undefined && x < lower) || (upper !== undefined && x > upper)).length;
      expect(f.outside.length).toBe(out);
      /* flagged: more than 3 sd of the OTHERS from their mean */
      const flagged = xs.map((x, i) => { const o = xs.filter((_, j) => j !== i); const om = refMean(o), os = refSd(o); return os > 0 && Math.abs(x - om) > 3 * os; }).filter(Boolean).length;
      expect(f.flagged.length).toBe(flagged);
    });
  }
});

describe('AUDIT sample — monotone and edge behaviour', () => {
  it('the share outside falls as the mean moves from the lower limit to the centre; Ppk rises', () => {
    let lastShare = Infinity, lastPpk = -Infinity;
    for (let m = 400.1; m <= 402; m += 0.1) {
      const f = sample(LIM, rs(Array.from({ length: 30 }, (_, i) => m + 0.6 * Math.sin(i))));
      expect(f.shareOut!).toBeLessThan(lastShare + 1e-12);
      expect(f.ppk!).toBeGreaterThan(lastPpk - 1e-12);
      lastShare = f.shareOut!; lastPpk = f.ppk!;
    }
  });
  it('capability words at 24 and 25 readings; the 1.33 and 1.00 marks', () => {
    const steady = (m: number, s: number, n: number) => Array.from({ length: n }, (_, i) => m + s * Math.sqrt(2) * Math.cos((2 * Math.PI * i) / n));
    expect(capabilityWords(sample(LIM, rs(steady(402, 0.3, 24))), LIM)).toEqual({ text: 'Too few for capability — from 24.', tone: 'n' });
    const f25 = sample(LIM, rs(steady(402, 0.3, 25)));
    expect(f25.n).toBe(CPK_FROM);
    expect(capabilityWords(f25, LIM)?.text).toMatch(/^Capable: Ppk/);
    /* just capable: Ppk between 1.00 and 1.33 — mean 402 (2 g to each limit), s chosen so 2 ÷ 3s = 1.15 → s 0.58 */
    const sJust = 2 / (3 * 1.15);
    const fj = sample(LIM, rs(steady(402, sJust, 30)));
    expect(fj.ppk!).toBeGreaterThan(1.0); expect(fj.ppk!).toBeLessThan(1.33);
    expect(capabilityWords(fj, LIM)?.tone).toBe('a');
    expect(capabilityWords(fj, LIM)?.text).toMatch(/^Just capable/);
  });
  it('FIXED (UPGRADE-AUDIT M2): a two-tailed share used to be said as one side — it now says "light or heavy" when both tails carry it', () => {
    /* centred at 402, a bell's thirty quantiles taken low, high, low, high:
       s ≈ 1.0, each limit about 2 s away → about 2½% low AND 2½% high; the
       zigzag keeps the moving range wide, so no drift clause joins the
       sentence. (Until 22 October this was 401 and 403 alternating — two
       values, which the shape check now rightly calls not bell-shaped, so
       the bell's tail is no longer quoted for it: asserted below.) */
    const xs = bellZigzag(30, 402, 1.0);
    const f = sample(LIM, rs(xs));
    expect(f.sd).toBeCloseTo(refSd(xs), 9);
    expect(f.checks?.shape?.bell).toBe(true);
    expect(f.checks?.steady.ok).toBe(true);
    expect(drifts(f)).toBe(false);
    expect(f.shareOut).toBeCloseTo(2 * normalUpperTail(2 / (f.sd ?? 1)), 4);
    const w = capabilityWords(f, LIM)!;
    /* the whole share, said on both sides */
    expect(w.text).toMatch(/about \d+ in 100 would be light or heavy\.$/);
    const said = Number(/about (\d+) in 100/.exec(w.text)![1]);
    expect(said).toBe(Math.round(f.shareOut! * 100));
    expect(f.shareLow).toBeCloseTo(f.shareHigh!, 6);
    /* off to one side — mean 400.6 against 400–404 — the far tail is nothing and the words name the one side */
    const low = sample(LIM, rs(bellZigzag(30, 400.6, 0.4)));   // zigzag, so no drift clause joins the sentence
    expect(capabilityWords(low, LIM)!.text).toMatch(/would be light\.$/);
    /* two values alternating are not a bell: what was seen is said, never the bell's tail */
    const two = sample(LIM, rs(Array.from({ length: 30 }, (_, i) => (i % 2 ? 403 : 401))));
    expect(two.checks?.shape?.bell).toBe(false);
    expect(two.checks?.fine).toBe(false);
    expect(capabilityWords(two, LIM)!.text).toBe('Not capable: Ppk 0.66 from 30 — as measured, 0 of 30 are outside.');
  });
  it('FIXED (UPGRADE-AUDIT M13): thirty identical readings (a coarse instrument) → s = 0 → no Ppk — said, not silent', () => {
    const f = sample(LIM, rs(Array.from({ length: 30 }, () => 401)));
    expect(f.sd).toBe(0);
    expect(f.ppk).toBeUndefined();
    expect(capabilityWords(f, LIM)).toEqual({ text: 'Every reading the same — spread 0 from 30; capability cannot be worked out (is the instrument reading finely enough?).', tone: 'n' });
    expect(sampleSays(f, LIM).capability?.text).toMatch(/^Every reading the same/);
    /* under 25 it is still too few, whatever the spread */
    expect(capabilityWords(sample(LIM, rs(Array.from({ length: 12 }, () => 401))), LIM)).toBeUndefined();
  });
  it('FINDING: an agreed count of 0 (limits agreed, count never set) reads "12 of 0 in"', () => {
    const a: AgreedReadings = { kind: 'limits', unit: 'g', lower: 400, upper: 404, count: 0 };
    const s = sampleSays(sample(a, rs(Array.from({ length: 12 }, () => 401))), a);
    expect(s.verdict).toBe('12 of 0 in');
    expect(s.text).toMatch(/^12 of 0 in/);
  });
  it('inWords: the boundaries of "about k in 100" — 0.005 (1 in 200) is said "about 1 in 100"', () => {
    expect(inWords(0.02275)).toBe('about 2 in 100');
    expect(inWords(0.0149)).toBe('about 1 in 100');
    expect(inWords(0.005)).toBe('about 1 in 100');        // 5 in 1,000 would be nearer
    expect(inWords(0.0049)).toBe('about 5 in 1,000');
    expect(inWords(0.0004)).toBe('about 4 in 10,000');
    expect(inWords(0.00004)).toBe('fewer than 1 in 10,000');
    expect(inWords(0.996)).toBe('nearly all');
  });
  it('a struck reading leaves the moving range to its neighbours (the pair across the gap)', () => {
    const list = rs([400, 401, 410, 402, 403]);
    list[2]!.struck = true;
    const f = sample(LIM, list);
    expect(f.n).toBe(4);
    expect(f.sdWithin).toBeCloseTo(refMrSigma([400, 401, 402, 403]), 9);
  });
  it('drift: Cpk ≥ Ppk + 0.2 says it; the reverse (Cpk < Ppk, an oscillating run) does not', () => {
    const creep = Array.from({ length: 30 }, (_, i) => 400.2 + i * 0.1);
    expect(drifts(sample(LIM, rs(creep)))).toBe(true);
    const zigzag = Array.from({ length: 30 }, (_, i) => 402 + (i % 2 ? 0.8 : -0.8));
    const f = sample(LIM, rs(zigzag));
    expect(f.cpk!).toBeLessThan(f.ppk!);   // MR = 1.6 → σ_within 1.42 > s 0.81
    expect(drifts(f)).toBe(false);
  });
});

describe('AUDIT sample — the packers’ rules and the TNE table (Packaged Goods Regulations 2006, Sch. 2)', () => {
  it('every band and boundary of the table, in grams and millilitres, and kg/l scaled', () => {
    const cases: [number, number | undefined][] = [
      [4.9, undefined], [5, 0.45], [50, 4.5], [50.5, 4.5], [100, 4.5], [100.5, 4.5225], [200, 9], [200.5, 9],
      [300, 9], [300.5, 9.015], [400, 12], [500, 15], [500.5, 15], [1000, 15], [1000.5, 15.0075], [10000, 150], [10000.5, undefined],
    ];
    for (const [q, e] of cases) {
      const got = tneFor(q, 'g');
      if (e === undefined) expect(got).toBeUndefined(); else expect(got).toBeCloseTo(e, 9);
    }
    expect(tneFor(0.4, 'kg')).toBeCloseTo(0.012, 9);
    expect(tneFor(2, 'l')).toBeCloseTo(0.03, 9);
    expect(tneFor(750, 'ml')).toBeCloseTo(15, 9);
  });
  it('rule 2 "fewer than 1 in 40": one short of forty is NOT fewer; one of forty-one is', () => {
    const P: AgreedReadings = { kind: 'packers', unit: 'g', nominal: 400, count: 40 };
    const forty = sample(P, rs([...Array.from({ length: 39 }, () => 401), 387]));
    expect(forty.packers).toMatchObject({ shortTne: 1, rule2Ok: false });
    const fortyOne = sample(P, rs([...Array.from({ length: 40 }, () => 401), 387]));
    expect(fortyOne.packers).toMatchObject({ shortTne: 1, rule2Ok: true });
    const eighty = sample(P, rs([...Array.from({ length: 78 }, () => 401), 387, 387]));
    expect(eighty.packers?.rule2Ok).toBe(false);
  });
  it('for packers the capability is read against nominal − TNE (T1), not the nominal — a design to note', () => {
    const P: AgreedReadings = { kind: 'packers', unit: 'g', nominal: 400, count: 30 };
    const xs = Array.from({ length: 30 }, (_, i) => 400.5 + 1.5 * Math.sqrt(2) * Math.cos((2 * Math.PI * i) / 30));
    const f = sample(P, rs(xs));
    const m = refMean(xs), s = refSd(xs);
    expect(f.ppk).toBeCloseTo((m - 388) / (3 * s), 9);          // against 388, not 400
    expect(f.shareOut).toBeCloseTo(normalUpperTail((m - 388) / s), 6);
    expect(f.packers?.meanOk).toBe(true);
  });
});
