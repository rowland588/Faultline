/* The measured test's arithmetic, proved by the worked example in
 * docs/LEAN40.md's appendix and the cases docs/BUILD.md 2c names. */
import { describe, it, expect } from 'vitest';
import { sample, sampleSays, compareSamples, tneFor, inWords, upperTail, capabilityWords, drifts } from '../sample';
import type { AgreedReadings, StudyReading } from '../../study';

const THIRTY = [400.1, 402.6, 401.6, 400.8, 401.5, 401.3, 400.2, 401.9, 400.6, 400.4, 400.6, 401.2, 401.9, 400.9, 401.8,
  401.0, 401.9, 400.8, 401.9, 401.1, 401.2, 401.6, 401.3, 400.7, 401.3, 400.4, 401.1, 401.5, 401.9, 400.8];
const rs = (vs: number[]): StudyReading[] => vs.map((value, i) => ({ id: `r${i + 1}`, value, at: i }));
const LIMITS: AgreedReadings = { kind: 'limits', unit: 'g', nominal: 400, lower: 400, upper: 404, count: 30 };

describe('the thirty packs (docs/LEAN40.md, appendix)', () => {
  const f = sample(LIMITS, rs(THIRTY));
  it('mean 401.2, spread 0.6, 400.1–402.6, none outside', () => {
    expect(f.n).toBe(30);
    expect(f.mean!.toFixed(1)).toBe('401.2');
    expect(f.sd!.toFixed(1)).toBe('0.6');
    expect([f.min, f.max]).toEqual([400.1, 402.6]);
    expect(f.outside).toEqual([]);
    expect(f.enough).toBe(true);
  });
  it('Ppk 0.67 (the readings as they came), nearest the lower limit, about 2 in 100 light', () => {
    expect(f.ppk!.toFixed(2)).toBe('0.67');
    expect(f.ppkSide).toBe('low');
    expect(inWords(f.shareOut!)).toBe('about 2 in 100');
  });
  it('both are said: passed, and not capable', () => {
    const s = sampleSays(f, LIMITS);
    expect(s.text).toBe('30 readings, mean 401.2 g, 400.1–402.6, all within 400.0–404.0 g — Passed.');
    expect([s.tone, s.verdict]).toEqual(['g', 'Passed']);
    expect(s.capability).toEqual({ text: 'Not capable: Ppk 0.67 from 30 — about 2 in 100 would be light.', tone: 'a' });
  });
});

describe('enough?', () => {
  it('twelve readings: the count still owed, and no Cpk', () => {
    const f = sample(LIMITS, rs(THIRTY.slice(0, 12)));
    const s = sampleSays(f, LIMITS);
    expect(s.text).toBe('12 of 30 in — all within 400.0–404.0 g so far.');
    expect([s.tone, s.verdict]).toEqual(['a', '12 of 30 in']);
    expect(s.capability).toEqual({ text: 'Too few for capability — from 12.', tone: 'n' });
  });
  it('nothing yet, and nothing agreed', () => {
    expect(sampleSays(sample(LIMITS, []), LIMITS)).toMatchObject({ verdict: 'Not measured', tone: 'n' });
    expect(sampleSays(sample(undefined, rs([401])), undefined)).toMatchObject({ verdict: 'Not agreed', tone: 'n' });
  });
  it('a struck reading counts for nothing and keeps its number', () => {
    const list = rs([401, 399.6, 401.4]);
    list[1].struck = true;
    const f = sample({ ...LIMITS, count: 2 }, list);
    expect(f.n).toBe(2);
    expect(f.outside).toEqual([]);
    const two = rs([401, 399.6, 399.8]);
    expect(sample(LIMITS, two).outside.map(o => o.no)).toEqual([2, 3]);
  });
});

describe('didn’t pass', () => {
  it('two light, both named', () => {
    const vs = [...THIRTY.slice(0, 28), 399.6, 399.8];
    const s = sampleSays(sample(LIMITS, rs(vs)), LIMITS);
    expect(s.text).toMatch(/^30 readings, mean 401\.\d g — 2 outside, both light \(399\.6, 399\.8\) — Didn’t pass\.$/);
    expect([s.tone, s.verdict]).toEqual(['r', 'Didn’t pass']);
  });
  it('one outside fails at once, before the count is in', () => {
    expect(sampleSays(sample(LIMITS, rs([401, 404.4])), LIMITS)).toMatchObject({ verdict: 'Didn’t pass', tone: 'r' });
  });
});

describe('the packers’ rules, applied plainly', () => {
  const P: AgreedReadings = { kind: 'packers', unit: 'g', nominal: 400, count: 30 };
  it('the tolerable negative error from the table: 12 g on 400 g', () => {
    expect(tneFor(400, 'g')).toBeCloseTo(12);
    expect(tneFor(250, 'g')).toBe(9);
    expect(tneFor(40, 'g')).toBeCloseTo(3.6);
    expect(tneFor(2, 'kg')).toBeCloseTo(0.03);
    expect(tneFor(3, 'g')).toBeUndefined();
  });
  it('average above, none 12 g short, none 24 g short — passed', () => {
    const s = sampleSays(sample(P, rs(THIRTY)), P);
    expect(s.text).toBe('average 401.2 g, at or above 400.0 ✓ · none more than 12.0 g short ✓ · none more than 24.0 g short ✓ — Passed.');
    expect(s.tone).toBe('g');
  });
  it('one pack 13 g short in thirty is more than 1 in 40', () => {
    const f = sample(P, rs([...THIRTY.slice(0, 29), 387]));
    expect(f.packers).toMatchObject({ shortTne: 1, rule2Ok: false, rule3Ok: true });
    expect(sampleSays(f, P).verdict).toBe('Didn’t pass');
  });
  it('one pack 25 g short fails at once', () => {
    const f = sample(P, rs([401, 375]));
    expect(f.packers?.rule3Ok).toBe(false);
    expect(sampleSays(f, P).tone).toBe('r');
  });
});

describe('one limit, and ticks', () => {
  it('“at least 400 g”: the Ppk from the lower side alone, no Pp', () => {
    const A: AgreedReadings = { kind: 'limits', unit: 'g', lower: 400, count: 30 };
    const f = sample(A, rs(THIRTY));
    expect(f.pp).toBeUndefined();
    expect(f.cp).toBeUndefined();
    expect(f.ppk!.toFixed(2)).toBe('0.67');
    expect(sampleSays(f, A).text).toMatch(/all at least 400\.0 g — Passed\.$/);
  });
  it('a row of ticks: all ✓ passes; one ✗ fails and is named', () => {
    const T: AgreedReadings = { kind: 'ticks', count: 10 };
    const ticks = (bad: number[]): StudyReading[] => Array.from({ length: 10 }, (_, i) => ({ id: `t${i}`, ok: !bad.includes(i + 1), at: i }));
    expect(sampleSays(sample(T, ticks([])), T)).toMatchObject({ text: '10 of 10 ✓ — Passed.', tone: 'g' });
    expect(sampleSays(sample(T, ticks([7])), T)).toMatchObject({ text: '9 of 10 ✓ — 1 ✗ (no. 7) — Didn’t pass.', tone: 'r' });
  });
});

describe('a reading far from the rest is flagged, never struck', () => {
  it('flags it and leaves it counted', () => {
    const f = sample(LIMITS, rs([...THIRTY.slice(0, 20), 403.9]));
    expect(f.flagged).toEqual(['r21']);
    expect(f.n).toBe(21);
  });
});

describe('before → after', () => {
  it('the same test on two studies: the number moved, never “the fix did it”', () => {
    const before = sample(LIMITS, rs(THIRTY));
    const after = sample(LIMITS, rs(THIRTY.map(v => Math.round((v + 1) * 10) / 10)));
    const c = compareSamples(before, after, LIMITS);
    expect(c.text).toMatch(/^mean 401\.2 → 402\.2 g · Ppk 0\.67 → 1\.0\d — just capable now\. The number moved/);
    expect(c.tone).toBe('a');
    expect(compareSamples(sample(LIMITS, rs(THIRTY.slice(0, 5))), after, LIMITS).text).toMatch(/^Too early/);
  });
  it('the normal tail is right where it matters', () => {
    expect(upperTail(2)).toBeCloseTo(0.02275, 4);
    expect(upperTail(0)).toBeCloseTo(0.5, 6);
    expect(upperTail(-1)).toBeCloseTo(0.84134, 4);
  });
});

/* PPK AND CPK, AS THE PRACTICE NAMES THEM (13 October audit, docs/AUDIT.md 2).
   Worked by hand. */
describe('Ppk from the overall spread, Cpk from the moving range', () => {
  const r = (vs: number[]) => vs.map((value, i) => ({ id: `r${i}`, value, at: i }));
  it('10, 12, 11, 13, 12 against 8–16: s 1.140, moving range 1.5 ÷ 1.128 = 1.330; Ppk 1.05, Cpk 0.90', () => {
    const f = sample({ kind: 'limits', lower: 8, upper: 16, count: 5 }, r([10, 12, 11, 13, 12]));
    expect(f.sd!).toBeCloseTo(1.1402, 4);
    expect(f.sdWithin!).toBeCloseTo(1.5 / 1.128, 9);
    expect(f.ppk!).toBeCloseTo(3.6 / (3 * 1.1402), 3);
    expect(f.cpk!).toBeCloseTo(3.6 / (3 * (1.5 / 1.128)), 9);
    expect(f.pp!).toBeCloseTo(8 / (6 * 1.1402), 3);
    expect(f.cp!).toBeCloseTo(8 / (6 * (1.5 / 1.128)), 9);
  });
  it('a run that creeps up 0.1 g a pack: steady pack to pack, not over the run — the drift said', () => {
    const vs = Array.from({ length: 30 }, (_, i) => Math.round((400 + i * 0.1) * 10) / 10);
    const a = { kind: 'limits' as const, lower: 400, upper: 404, count: 30, unit: 'g' };
    const f = sample(a, r(vs));
    expect(f.sdWithin!).toBeCloseTo(0.1 / 1.128, 6);
    expect(f.ppk!).toBeLessThan(1);
    expect(f.cpk!).toBeGreaterThan(5);
    expect(drifts(f)).toBe(true);
    expect(capabilityWords(f, a)?.text).toMatch(/^Not capable: Ppk 0\.55 from 30 — about \d+ in 100 would be light\. Pack to pack it is steadier — Cpk 5\.4\d: it drifts across the run\.$/);
  });
  it('the same readings shuffled into a steady run: no drift said', () => {
    const f = sample({ kind: 'limits', lower: 8, upper: 16, count: 5 }, r([10, 12, 11, 13, 12]));
    expect(drifts(f)).toBe(false);
  });
});
