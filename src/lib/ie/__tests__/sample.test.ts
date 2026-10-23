/* The measured test's arithmetic, proved by the worked example in
 * docs/LEAN40.md's appendix and the cases docs/BUILD.md 2c names. */
import { describe, it, expect } from 'vitest';
import { sample, sampleSays, compareSamples, tneFor, inWords, upperTail, capabilityWords, drifts, checksSay, passFailPlan, allowFailProblem, passFailPlanOf, mayFailOf, goodProblem, goodWord } from '../sample';
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
  it('pass or fail, as every study before 22 October has it (no allowFail): all good passes; one failed fails and is named', () => {
    const T: AgreedReadings = { kind: 'ticks', count: 10 };
    const ticks = (bad: number[]): StudyReading[] => Array.from({ length: 10 }, (_, i) => ({ id: `t${i}`, ok: !bad.includes(i + 1), at: i }));
    expect(sampleSays(sample(T, ticks([])), T)).toMatchObject({ text: '10 of 10 good — Passed.', tone: 'g', verdict: 'Passed' });
    expect(sampleSays(sample(T, ticks([7])), T)).toMatchObject({ text: '9 of 10 good — 1 failed (no. 7) — Didn’t pass.', tone: 'r', verdict: 'Didn’t pass' });
  });
});

/* PASS OR FAIL, with how many may fail and what the count proves
 * (knowledge/specs/FC-094-capability.md §7). The bounds are SciPy's
 * (scripts/knowledge/independent-cases.py): 0 of 20 → 13.9%, 0 of 8 → 31.2%,
 * 1 of 20 → 21.6%; 299 to show 1 in 100 with none failing, 473 with one. */
describe('pass or fail — how many may fail, and what it proves', () => {
  const T = (count: number, allowFail?: number): AgreedReadings => ({ kind: 'ticks', count, ...(allowFail !== undefined ? { allowFail } : {}) });
  const ticks = (n: number, bad: number[] = []): StudyReading[] => Array.from({ length: n }, (_, i) => ({ id: `t${i}`, ok: !bad.includes(i + 1), at: i }));
  it('twenty of twenty good: passed, and it proves fewer than 14 in 100 would fail — not yet 1 in 100', () => {
    const s = sampleSays(sample(T(20), ticks(20)), T(20));
    expect(s).toMatchObject({ text: '20 of 20 good — Passed.', tone: 'g', verdict: 'Passed' });
    expect(s.capability).toEqual({ text: 'We can be 95% confident fewer than 14 in 100 would fail; to show fewer than 1 in 100 takes 299 good in a row.', tone: 'n' });
  });
  it('eight of twenty checked, all good: so far, and what so far proves', () => {
    const s = sampleSays(sample(T(20), ticks(8)), T(20));
    expect(s).toMatchObject({ text: '8 of 20 checked — all good so far.', tone: 'a', verdict: '8 of 20 in' });
    expect(s.capability?.text).toBe('So far we can be 95% confident fewer than 32 in 100 would fail; to show fewer than 1 in 100 takes 299 good in a row.');
  });
  it('one allowed to fail and one did: passed, with the failure named and its proof', () => {
    const s = sampleSays(sample(T(20, 1), ticks(20, [7])), T(20, 1));
    expect(s).toMatchObject({ text: '19 of 20 good — 1 failed (no. 7), 1 allowed — Passed.', tone: 'g', verdict: 'Passed' });
    expect(s.capability?.text).toBe('1 failed in 20: we can be 95% confident fewer than 22 in 100 would fail; to show fewer than 1 in 100 takes 473 checked with 1 failed.');
  });
  it('one allowed and two failed: didn’t pass, at once — before all are checked', () => {
    const s = sampleSays(sample(T(20, 1), ticks(12, [7, 12])), T(20, 1));
    expect(s).toMatchObject({ text: '10 of 12 good — 2 failed (no. 7, no. 12), at most 1 allowed — Didn’t pass.', tone: 'r', verdict: 'Didn’t pass' });
  });
  it('one allowed, one failed, not all in: said so far, amber, never passed early', () => {
    const s = sampleSays(sample(T(20, 1), ticks(9, [3])), T(20, 1));
    expect(s).toMatchObject({ text: '9 of 20 checked — 1 failed (no. 3), 1 allowed so far.', tone: 'a', verdict: '9 of 20 in' });
  });
  it('a struck failure counts for nothing, and keeps its number', () => {
    const rs = ticks(20, [5]).map(r => (r.id === 't4' ? { ...r, struck: true } : r));
    const f = sample(T(20), [...rs, { id: 'x', ok: true, at: 99 }]);
    expect(f.ticks?.bad).toEqual([]);
    expect(sampleSays(f, T(20)).text).toBe('20 of 20 good — Passed.');
  });
  it('every one failed: nothing proved — said so, not "fewer than nearly all"', () => {
    expect(sampleSays(sample(T(3, 2), ticks(3, [1, 2, 3])), T(3, 2)).capability?.text).toBe('3 failed in 3 proves nothing yet about how few would fail.');
  });
  it('while agreeing: what the count would prove, and what 1 in 100 would take', () => {
    expect(passFailPlan(20)).toBe('If all 20 pass, we can be 95% confident fewer than 14 in 100 would fail. To prove fewer than 1 in 100 takes 299 in a row, none failing.');
    expect(passFailPlan(20, 1)).toBe('If no more than 1 of 20 fail, we can be 95% confident fewer than 22 in 100 would fail. To prove fewer than 1 in 100 takes 473 with 1 allowed to fail.');
    expect(passFailPlan(299)).toBe('If all 299 pass, we can be 95% confident fewer than 1 in 100 would fail.');
  });
  it('how many may fail: a whole number, fewer than are checked', () => {
    expect(allowFailProblem(20, 0)).toBe('');
    expect(allowFailProblem(20, 19)).toBe('');
    expect(allowFailProblem(20, 20)).toBe('At most 19 of 20 may fail.');
    expect(allowFailProblem(20, -1)).toMatch(/whole number/);
    expect(allowFailProblem(20, 1.5)).toMatch(/whole number/);
  });
});

/* PART 1b (23 October) — pass or fail judged by a loss allowed or a confidence level, the confidence
 * chosen, said in the confidence words. Every bound is SciPy's (scripts/knowledge/independent-cases.py):
 * 4,500 at 98% good — 74 may fail at 95%, 77 at 90%, 68 at 99%; 90 failed proves 97.6% good at 95%
 * (0.02378498), 70 failed 98.1% (0.01894623); 20 checked show at most 86.0% good (0.1391083), 149 needed. */
describe('pass or fail by a loss allowed', () => {
  const A = (count: number, good = 98, conf?: number): AgreedReadings => ({ kind: 'ticks', count, judge: 'loss', good, ...(conf ? { conf } : {}) });
  const ticks = (n: number, bad: number[] = []): StudyReading[] => Array.from({ length: n }, (_, i) => ({ id: `t${i}`, ok: !bad.includes(i + 1), at: i }));
  const first = (k: number) => Array.from({ length: k }, (_, i) => i + 1);
  it('98% of 4,500: 90 may fail — worked in hundredths, never 89', () => {
    expect(mayFailOf(A(4500), 4500)).toBe(90);
    expect(mayFailOf(A(20), 20)).toBe(0);
    expect(mayFailOf(A(1000, 99.9), 1000)).toBe(1);
    expect(mayFailOf(A(4500, 98.5), 4500)).toBe(67);
  });
  it('70 failed of 4,500: passed, and 98.1% shown at 95% confident', () => {
    const s = sampleSays(sample(A(4500), ticks(4500, first(70))), A(4500));
    expect(s).toMatchObject({ text: '4,430 of 4,500 good — 70 failed (no. 1, no. 2, no. 3 and 67 more), 90 allowed for 98% good — Passed.', tone: 'g', verdict: 'Passed' });
    expect(s.capability?.text).toBe('70 failed in 4,500: we can be 95% confident at least 98.1% would be good.');
  });
  it('90 failed: passed on the count, and said honestly — 98% itself not shown at this confidence', () => {
    const s = sampleSays(sample(A(4500), ticks(4500, first(90))), A(4500));
    expect(s.verdict).toBe('Passed');
    expect(s.capability?.text).toBe('90 failed in 4,500: we can be 95% confident at least 97.6% would be good; 98% itself is not shown at this confidence — the count passed it.');
  });
  it('91 failed: didn’t pass, at once', () => {
    const s = sampleSays(sample(A(4500), ticks(3000, first(91))), A(4500));
    expect(s).toMatchObject({ text: '2,909 of 3,000 good — 91 failed (no. 1, no. 2, no. 3 and 88 more), at most 90 allowed for 98% good — Didn’t pass.', tone: 'r', verdict: 'Didn’t pass' });
  });
  it('part way: the rule said with the count, amber', () => {
    expect(sampleSays(sample(A(4500), ticks(1200, [4])), A(4500))).toMatchObject({ text: '1,200 of 4,500 checked — 1 failed (no. 4), 90 allowed for 98% good.', tone: 'a' });
  });
  it('while agreeing: what the loss allows and what it would prove', () => {
    expect(passFailPlanOf(A(4500))).toEqual({ text: 'At least 98% good: up to 90 of 4,500 may fail. If 90 fail it still passes — and that proves, 95% confident, at least 97.6% would be good.', problem: '' });
    expect(passFailPlanOf(A(20)).text).toBe('At least 98% good: with 20 checked, none may fail. If all pass, that proves, 95% confident, at least 86.0% would be good.');
    expect(passFailPlanOf(A(4500, 0)).problem).toMatch(/percentage above 0/);
  });
});

describe('pass or fail by a confidence level', () => {
  const C = (count: number, conf?: number, good = 98): AgreedReadings => ({ kind: 'ticks', count, judge: 'confidence', good, ...(conf ? { conf } : {}) });
  const ticks = (n: number, bad: number[] = []): StudyReading[] => Array.from({ length: n }, (_, i) => ({ id: `t${i}`, ok: !bad.includes(i + 1), at: i }));
  const first = (k: number) => Array.from({ length: k }, (_, i) => i + 1);
  it('95% confident of 98% good, of 4,500: 74 may fail; 90% 77; 99% 68', () => {
    expect(mayFailOf(C(4500), 4500)).toBe(74);
    expect(mayFailOf(C(4500, 0.9), 4500)).toBe(77);
    expect(mayFailOf(C(4500, 0.99), 4500)).toBe(68);
  });
  it('74 failed: passed — 98.0% shown, 95% confident', () => {
    const s = sampleSays(sample(C(4500), ticks(4500, first(74))), C(4500));
    expect(s).toMatchObject({ text: '4,426 of 4,500 good — 74 failed (no. 1, no. 2, no. 3 and 71 more), 74 allowed for 98% good, 95% confident — Passed.', tone: 'g', verdict: 'Passed' });
    expect(s.capability?.text).toBe('74 failed in 4,500: we can be 95% confident at least 98.0% would be good.');
  });
  it('75 failed: didn’t pass, at once', () => {
    expect(sampleSays(sample(C(4500), ticks(1000, first(75))), C(4500))).toMatchObject({ verdict: 'Didn’t pass', text: '925 of 1,000 good — 75 failed (no. 1, no. 2, no. 3 and 72 more), at most 74 allowed for 98% good, 95% confident — Didn’t pass.' });
  });
  it('twenty cannot show 98% at 95% — refused while agreeing, with the 149 it takes', () => {
    expect(mayFailOf(C(20), 20)).toBe(-1);
    expect(passFailPlanOf(C(20))).toEqual({ text: '', problem: 'With 20 checked, even none failing shows only 86.0% good, 95% confident — check at least 149.' });
    expect(passFailPlanOf(C(4500))).toEqual({ text: '95% confident at least 98% good: of 4,500 checked, up to 74 may fail.', problem: '' });
    expect(passFailPlanOf(C(149)).text).toBe('95% confident at least 98% good: of 149 checked, none may fail.');
  });
  it('100% good can never be shown by checking — refused', () => {
    expect(goodProblem('confidence', 100)).toMatch(/never be shown/);
    expect(goodProblem('loss', 100)).toBe('');
  });
  it('a number that may fail said at 99%, and a study from before at 95%', () => {
    const N: AgreedReadings = { kind: 'ticks', count: 20, conf: 0.99 };
    expect(sampleSays(sample(N, ticks(20)), N).capability?.text).toBe('We can be 99% confident fewer than 21 in 100 would fail; to show fewer than 1 in 100 takes 459 good in a row.');
    const old: AgreedReadings = { kind: 'ticks', count: 20 };
    expect(sampleSays(sample(old, ticks(20)), old).capability?.text).toMatch(/^We can be 95% confident fewer than 14 in 100/);
  });
  it('the share good said rounded down, never flattering', () => {
    expect(goodWord(0.976215)).toBe('97.6%');
    expect(goodWord(0.98)).toBe('98.0%');
    expect(goodWord(0.86089)).toBe('86.0%');
  });
});

/* BEFORE CAPABILITY — the three checks (spc.normality-checks), and how sure a
 * Ppk is (Bissell). Every expected figure from SciPy, independent-cases.py:
 * THIRTY K² p 0.889, 16 values, steady; THIRTY in 398–406 Ppk 1.78, bound
 * 1.38; SEAL at least 12 N Ppk 1.72, bound 1.34; OXYGEN skew 2.80, K²
 * p < 0.001, reading 13 beyond −0.32–1.05, Ppk 2.06; the creeping run 24
 * readings beyond 401.18–401.72 and 15 below the mean from no. 1. */
const OXYGEN = [0.21, 0.35, 0.18, 0.42, 0.27, 0.31, 0.95, 0.24, 0.19, 0.33, 0.29, 0.22, 1.41, 0.26, 0.38,
  0.2, 0.25, 0.3, 0.23, 0.61, 0.28, 0.21, 0.34, 0.27, 0.19, 0.45, 0.24, 0.32, 0.22, 0.8];
const SEAL = [14.2, 13.8, 15.1, 14.6, 13.9, 14.4, 15.3, 14.0, 14.8, 14.1, 13.6, 14.9, 14.5, 14.3, 15.0,
  13.7, 14.6, 14.2, 14.7, 14.4, 13.9, 15.2, 14.1, 14.8, 14.3, 14.0, 14.6, 14.5, 13.8, 14.9];
describe('before capability — bell-shaped, steady, read finely enough', () => {
  it('the thirty packs: all three said, in green', () => {
    const f = sample(LIMITS, rs(THIRTY));
    expect(f.checks?.shape?.p).toBeCloseTo(0.8894419888, 8);
    expect(checksSay(f, LIMITS)).toEqual([
      { k: 'shape', text: 'Bell-shaped enough (D’Agostino–Pearson p 0.89).', tone: 'g' },
      { k: 'steady', text: 'Steady across the run.', tone: 'g' },
      { k: 'fine', text: 'Read finely enough — 16 different values.', tone: 'g' },
    ]);
  });
  it('before twenty readings: said when, nothing guessed', () => {
    const f = sample(LIMITS, rs(THIRTY.slice(0, 12)));
    expect(f.checks).toBeUndefined();
    expect(checksSay(f, LIMITS)).toEqual([{ k: 'wait', text: 'Said from 20 readings — 12 so far.', tone: 'n' }]);
  });
  it('residual oxygen at most 2%: leaning high, not steady — capable never green, its share never the bell’s', () => {
    const A: AgreedReadings = { kind: 'limits', unit: '%', upper: 2, count: 30 };
    const f = sample(A, rs(OXYGEN));
    expect(f.checks?.shape?.skew).toBeCloseTo(2.8034423184, 6);
    expect(f.checks?.shape?.bell).toBe(false);
    expect(f.checks?.steady.beyond.map(b => b.no)).toEqual([13]);
    expect(f.ppk!).toBeCloseTo(2.064872, 5);
    expect(checksSay(f, A).map(c => c.text)).toEqual([
      'Not bell-shaped — they lean high (skew 2.8, p < 0.001): the share outside is read from the readings, not the bell.',
      'Not steady — reading 13 is outside -0.32–1.05.',
      'Read finely enough — 25 different values.',
    ]);
    expect(capabilityWords(f, A)).toEqual({ text: 'Capable: Ppk 2.06 from 30 — 95% sure at least 1.61 — but the readings were not steady, so it may not hold.', tone: 'a' });
  });
  it('not bell-shaped and not capable: what was seen outside, not a normal tail', () => {
    const A: AgreedReadings = { kind: 'limits', unit: '%', upper: 0.6, count: 30 };
    const w = capabilityWords(sample(A, rs(OXYGEN)), A)!;
    expect(w.text).toBe('Not capable: Ppk 0.30 from 30 — as measured, 4 of 30 are outside.');
  });
  it('seal strength at least 12 N: bell-shaped, steady — capable, and how sure', () => {
    const A: AgreedReadings = { kind: 'limits', unit: 'N', lower: 12, count: 30 };
    const f = sample(A, rs(SEAL));
    expect(f.ppkLow!).toBeCloseTo(1.336333, 5);
    expect(capabilityWords(f, A)).toEqual({ text: 'Capable: Ppk 1.72 from 30 — 95% sure at least 1.34.', tone: 'g' });
    expect(sampleSays(f, A).text).toBe('30 readings, mean 14.4 N, 13.6–15.3, all at least 12.0 N — Passed.');
  });
  it('the thirty packs against 398–406: capable — and thirty readings only make it at least 1.38', () => {
    const A: AgreedReadings = { ...LIMITS, lower: 398, upper: 406 };
    expect(capabilityWords(sample(A, rs(THIRTY)), A)).toEqual({ text: 'Capable: Ppk 1.78 from 30 — 95% sure at least 1.38.', tone: 'g' });
  });
  it('a run creeping up: not steady — the readings beyond and the run of eight said', () => {
    const vs = Array.from({ length: 30 }, (_, i) => Math.round((400 + i * 0.1) * 10) / 10);
    const A: AgreedReadings = { kind: 'limits', unit: 'g', lower: 390, upper: 410, count: 30 };
    const f = sample(A, rs(vs));
    expect(f.checks?.steady.beyond.length).toBe(24);
    expect(f.checks?.steady.run).toEqual({ fromNo: 1, toNo: 15, length: 15, side: 'below' });
    expect(checksSay(f, A).find(c => c.k === 'steady')).toEqual({ k: 'steady', tone: 'a',
      text: 'Not steady — readings 1, 2, 3 and 21 more are outside 401.2–401.7 and 15 in a row sat below the mean from no. 1.' });
    expect(capabilityWords(f, A)?.tone).toBe('a');
    expect(capabilityWords(f, A)?.text).toMatch(/— but the readings were not steady, so it may not hold\./);
  });
  it('whole numbers a minute, spread about one step: bell-shaped — rounding does not throw the shape check', () => {
    const SPEED = [80, 81, 79, 80, 82, 78, 80, 81, 79, 80, 81, 80, 79, 82, 80, 78, 81, 80, 79, 81, 80, 83, 79, 80, 81, 80, 79, 77, 80, 81];
    const A: AgreedReadings = { kind: 'limits', unit: 'a minute', lower: 75, count: 30 };
    const f = sample(A, rs(SPEED));
    expect(f.checks?.shape?.p).toBeCloseTo(0.6974021743, 8);
    expect(checksSay(f, A)[0]).toEqual({ k: 'shape', text: 'Bell-shaped enough (D’Agostino–Pearson p 0.70).', tone: 'g' });
  });
  it('the tails, not the lean: heavier than a bell’s said as such', () => {
    /* a bell's centre with four readings far out on both sides — symmetric, heavy-tailed */
    const xs = [...THIRTY.slice(0, 26), 397.2, 405.2, 396.9, 405.5];
    const f = sample(LIMITS, rs(xs));
    expect(Math.abs(f.checks!.shape!.zKurt)).toBeGreaterThan(Math.abs(f.checks!.shape!.zSkew));
    expect(checksSay(f, LIMITS)[0].text).toMatch(/^Not bell-shaped — the tails are heavier than a bell’s \(p [<\d. ]+\): the share outside is read from the readings, not the bell\.$/);
  });
  it('a coarse scale: three values only — the shape and the index said to be rough', () => {
    const vs = Array.from({ length: 24 }, (_, i) => [401, 402, 401, 403][i % 4]);
    const f = sample(LIMITS, rs(vs));
    expect(checksSay(f, LIMITS).find(c => c.k === 'fine')).toEqual({ k: 'fine', tone: 'a',
      text: 'Only 3 different values were read — the scale is too coarse to show the spread; the shape and the index are rough.' });
  });
  it('pass or fail has no checks — it is not a measurement', () => {
    const T: AgreedReadings = { kind: 'ticks', count: 20 };
    expect(checksSay(sample(T, Array.from({ length: 20 }, (_, i) => ({ id: `t${i}`, ok: true, at: i }))), T)).toEqual([]);
  });
});

describe('the histogram', () => {
  it('every kept reading in a bar, the limits inside its span, a bar with a reading outside marked', () => {
    const f = sample(LIMITS, rs([...THIRTY.slice(0, 29), 399.2]));
    const h = f.hist!;
    expect(h.counts.reduce((a, b) => a + b, 0)).toBe(30);
    expect(h.edges[0]).toBeLessThanOrEqual(399.2);
    expect(h.edges[h.edges.length - 1]).toBeGreaterThanOrEqual(404);
    expect(h.out.filter(Boolean).length).toBe(1);
    const i = h.out.indexOf(true);
    expect(h.edges[i]).toBeLessThanOrEqual(399.2);
    expect(h.edges[i + 1]).toBeGreaterThan(399.2);
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
