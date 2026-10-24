/* The measured test's arithmetic, proved by the worked example in
 * docs/LEAN40.md's appendix and the cases docs/BUILD.md 2c names. */
import { describe, it, expect } from 'vitest';
import { sample, sampleSays, compareSamples, tneFor, inWords, upperTail, capabilityWords, drifts, checksSay, passFailPlan, allowFailProblem, passFailPlanOf, mayFailOf, goodProblem, goodWord, sampleMoney, moneySays, MISSING_KG, MISSING_PACKS, MISSING_WEIGHT, modeNotes, packersTne } from '../sample';
import type { AgreedReadings, StudyReading } from '../../../lib/study';

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

/* MONEY — knowledge/specs/FC-156-capability-money.md §6, the six independent cases
 * (scripts/knowledge/independent-cases.py, "money in the capability study"). */
describe('money: give-away and what the rejects cost (FC-156)', () => {
  const heavy = rs([404.1, 404.1, 404.1, 404.1]);
  it('1 the record’s own case: 404.1 g on 400 g, 10,000 a shift, 5 a week, £18 a kg → 4.1 g, 41 kg and £738 a shift, 205 kg and £3,690 a week', () => {
    const a: AgreedReadings = { kind: 'packers', unit: 'g', nominal: 400, count: 30, packsPerShift: 10000, shiftsPerWeek: 5, costPerKg: 18 };
    const f = sample(a, heavy), g = sampleMoney(f, a).giveaway!;
    expect(g.perPack.toFixed(1)).toBe('4.1');
    expect(g.kgShift!.toFixed(1)).toBe('41.0'); expect(g.gbpShift!.toFixed(0)).toBe('738');
    expect(g.kgWeek!.toFixed(0)).toBe('205'); expect(g.gbpWeek!.toFixed(0)).toBe('3690');
    expect(g.missing).toEqual([]);
    expect(moneySays(sampleMoney(f, a), f, a)).toEqual({ text: 'Give-away 4.1 g a pack — 41 kg a shift, £738 a shift, £3.7k a week — because the mean (404.1 g) sits 4.1 g over the nominal.', tone: 'a' });
  });
  it('2 a mean under the nominal gives none', () => {
    const a: AgreedReadings = { kind: 'packers', unit: 'g', nominal: 400, count: 30, packsPerShift: 10000, costPerKg: 18 };
    const f = sample(a, rs([399.6, 399.6])), g = sampleMoney(f, a).giveaway!;
    expect(g.perPack).toBe(0); expect(g.gbpShift).toBe(0);
    expect(moneySays(sampleMoney(f, a), f, a)!.text).toBe('No give-away: the mean (399.6 g) is not over the nominal.');
  });
  it('3 a unit that is not a weight says so and gives the give-away in the unit only', () => {
    const a: AgreedReadings = { kind: 'limits', unit: 'mm', nominal: 12, lower: 11, upper: 13, count: 30, packsPerShift: 10000, costPerKg: 18 };
    const f = sample(a, rs([12.4, 12.4])), g = sampleMoney(f, a).giveaway!;
    expect(g.perPack.toFixed(1)).toBe('0.4'); expect(g.kgShift).toBeUndefined(); expect(g.missing).toEqual([MISSING_WEIGHT]);
  });
  it('4 pass or fail: 2 of 20 failed, one waste and one reworked, at 10,000 a shift, £0.25 materials, £0.12 a rework → 500 waste £125, 500 reworked £60, £185 a shift, £925 a week', () => {
    const a: AgreedReadings = { kind: 'ticks', count: 20, allowFail: 2, packsPerShift: 10000, shiftsPerWeek: 5, materialsPerPack: 0.25, reworkPerPack: 0.12 };
    const readings: StudyReading[] = Array.from({ length: 20 }, (_, i) => ({ id: `t${i}`, ok: i !== 4 && i !== 11, at: i, ...(i === 11 ? { fate: 'rework' as const } : {}) }));
    const f = sample(a, readings), r = sampleMoney(f, a).rejects!;
    expect(f.ticks!.fates).toEqual({ waste: 1, rework: 1, recovered: 0 });
    expect(r.shift).toEqual({ failed: 1000, waste: 500, rework: 500, recovered: 0, wasteGbp: 125, reworkGbp: 60, gbp: 185 });
    expect(r.weekGbp).toBe(925); expect(r.missing).toEqual([]);
    expect(moneySays(sampleMoney(f, a), f, a)).toEqual({ text: 'Rejects: 2 of 20 failed — 1 waste, 1 reworked — at 10,000 a shift that is 500 to waste (£125), 500 reworked (£60), £185 a shift, £925 a week.', tone: 'a' });
  });
  it('5 one recovered by hand of 20: 500 recovered a shift, nothing priced, said so', () => {
    const a: AgreedReadings = { kind: 'ticks', count: 20, allowFail: 1, packsPerShift: 10000, materialsPerPack: 0.25 };
    const readings: StudyReading[] = Array.from({ length: 20 }, (_, i) => ({ id: `t${i}`, ok: i !== 7, at: i, ...(i === 7 ? { fate: 'recovered' as const } : {}) }));
    const f = sample(a, readings), r = sampleMoney(f, a).rejects!;
    expect(r.shift).toEqual({ failed: 500, waste: 0, rework: 0, recovered: 500, gbp: 0 });
    expect(moneySays(sampleMoney(f, a), f, a)!.text).toBe('Rejects: 1 of 20 failed — 1 recovered by hand — at 10,000 a shift that is 500 recovered by hand, not priced, £0 a shift.');
  });
  it('6 no packs a shift: no money, the tile says what to give; a failed item with no fate reads as waste; a cost missing is named', () => {
    const a: AgreedReadings = { kind: 'ticks', count: 20 };
    const readings: StudyReading[] = Array.from({ length: 20 }, (_, i) => ({ id: `t${i}`, ok: i !== 7, at: i }));
    const f = sample(a, readings), r = sampleMoney(f, a).rejects!;
    expect(r.fates.waste).toBe(1); expect(r.shift).toBeUndefined(); expect(r.missing).toEqual([MISSING_PACKS]);
    const b: AgreedReadings = { ...a, packsPerShift: 10000 };
    expect(sampleMoney(sample(b, readings), b).rejects!.missing).toEqual(['give a pack’s materials to say it in money']);
    const g: AgreedReadings = { kind: 'packers', unit: 'g', nominal: 400, count: 30, packsPerShift: 10000 };
    expect(sampleMoney(sample(g, heavy), g).giveaway!.missing).toEqual([MISSING_KG]);
    expect(sampleMoney(sample({ kind: 'ticks', count: 20 }, readings.map(r => ({ ...r, ok: true }))), { kind: 'ticks', count: 20 })).toEqual({});
  });
});

/* W1 — THE MODES (knowledge/specs/FC-094-capability.md parts 2–4, criteria 23–27): every number from
   scripts/knowledge/cases-w1.py and cases-spc.py (SciPy), run 24 October. */
import { modeAgreedWords, modeProblem, RUNS_FROM } from '../modes';
const RUNS: [number, number][] = [[4800, 24], [5100, 31], [4650, 19], [5000, 28], [4900, 41], [5200, 22]];
const runRs = (rows: [number, number][]): StudyReading[] => rows.map(([made, rejected], i) => ({ id: `n${i + 1}`, made, rejected, at: i }));
describe('rejects out of what was made (FC-098, FC-088, FC-102)', () => {
  const A: AgreedReadings = { kind: 'rejects', count: 6, maxShare: 1 };
  const f = sample(A, runRs(RUNS));
  it('the pooled rate, its bounds, per million, Z — and met against 1%', () => {
    const r = f.runs!;
    expect([r.made, r.rejected]).toEqual([29650, 165]);
    expect(r.p).toBeCloseTo(0.00556, 5);
    expect(r.lo).toBeCloseTo(0.00475, 5); expect(r.hi).toBeCloseTo(0.00648, 5); expect(r.upper).toBeCloseTo(0.00633, 5);
    expect(Math.round(r.perMillion)).toBe(5565);
    expect(r.z!.z).toBeCloseTo(2.54, 2); expect(r.z!.ppkEq).toBeCloseTo(0.85, 2); expect(r.z!.sigma).toBeCloseTo(4.04, 2);
    expect(r.verdict).toBe('met');
    expect(r.runs.filter(x => x.out)).toEqual([]);
    expect(r.sigmaZ).toBeCloseTo(1.913, 2); expect(r.laney).toBe(true);
  });
  it('the sentences as the module says them', () => {
    const s = sampleSays(f, A);
    expect(s.text).toBe('165 rejected of 29,650 made — 0.56% (5,565 per million), 95% confident between 0.48% and 0.65%; at most 1% agreed — Met.');
    expect([s.tone, s.verdict]).toEqual(['g', 'Met']);
    expect(s.capability!.text).toBe('Every run inside the chart’s limits — one process, run to run. Runs this large vary more than the count alone says (σz 1.9): Laney’s limits are drawn. Compared with a measurement: Z 2.54, about Ppk 0.85 (a comparison only).');
  });
  it('against 0.5% not met; against 0.6% not shown yet with about how many more', () => {
    const s = sampleSays(sample({ ...A, maxShare: 0.5 }, runRs(RUNS)), { ...A, maxShare: 0.5 });
    expect(s.verdict).toBe('Not met'); expect(s.text).toContain('at most 5.0 in 1,000 agreed — Not met: 0.56% is above it.');
    const g = sample({ ...A, maxShare: 0.6 }, runRs(RUNS));
    expect(g.runs!.verdict).toBe('notShown'); expect(g.runs!.moreToShow).toBeGreaterThan(0);
    expect(sampleSays(g, { ...A, maxShare: 0.6 }).text).toContain('Not shown yet: the bound is 0.63%');
  });
  it('fewer than three runs: the bounds wait; none: nothing counted', () => {
    expect(sampleSays(sample(A, runRs(RUNS.slice(0, 2))), A).text).toBe(`55 rejected of 9,900 made — 0.56% (5,556 per million); the bounds are said from ${RUNS_FROM} runs — 2 so far.`);
    expect(sampleSays(sample(A, []), A)).toMatchObject({ verdict: 'Not counted', tone: 'n' });
  });
  it('zero rejected in 2,000: the bound 0.15%; a struck run counts for nothing', () => {
    const f0 = sample(A, runRs([[1000, 0], [500, 0], [500, 0]]));
    expect(f0.runs!.upper).toBeCloseTo(0.00150, 5); expect(f0.runs!.z).toBeUndefined();
    const list = runRs(RUNS); list[4].struck = true;
    expect(sample(A, list).runs!.made).toBe(29650 - 4900);
  });
  it('money by the pooled share at the packs a shift', () => {
    const m = sampleMoney(f, { ...A, packsPerShift: 20000, materialsPerPack: 0.25, shiftsPerWeek: 10 }).runs!;
    expect(Math.round(m.rejectsShift!)).toBe(111); expect(m.gbpShift).toBeCloseTo(27.82, 1); expect(m.gbpWeek).toBeCloseTo(278.2, 0);
    expect(sampleMoney(f, A).runs!.missing.length).toBe(2);
  });
  it('agreed words and the problems', () => {
    expect(modeAgreedWords(A)).toBe('rejects out of what was made, 6 runs — at most 1% rejected');
    expect(modeProblem({ kind: 'rejects', count: 0 })).toBe('How many runs — at least 1.');
    expect(modeProblem({ kind: 'rejects', count: 6, maxShare: 100 })).toContain('below 100');
  });
});

const INSP: [number, number, Record<string, number>][] = [[200, 9, { 'Open seal': 4, 'Light pack': 5 }], [200, 14, { 'Open seal': 6, 'Light pack': 7, 'Mis-label': 1 }], [250, 11, { 'Open seal': 5, 'Light pack': 6 }], [200, 6, { 'Light pack': 4, Crushed: 2 }], [300, 17, { 'Open seal': 8, 'Light pack': 9 }]];
const inspRs = (rows: [number, number, Record<string, number>][]): StudyReading[] => rows.map(([inspected, faults, kinds], i) => ({ id: `i${i + 1}`, inspected, faults, kinds, at: i }));
describe('faults found on each item (FC-099, FC-089, FC-124, FC-125)', () => {
  const A: AgreedReadings = { kind: 'faults', count: 5, maxShare: 2, faultKinds: ['Open seal', 'Light pack', 'Mis-label', 'Crushed', 'Wrong date'] };
  const f = sample(A, inspRs(INSP));
  it('DPU, its bounds, the share with a fault, the chart, the tally', () => {
    const q = f.faults!;
    expect([q.items, q.faults]).toEqual([1150, 57]);
    expect(q.dpu).toBeCloseTo(0.0496, 4); expect(q.lo).toBeCloseTo(0.0375, 4); expect(q.hi).toBeCloseTo(0.0642, 4); expect(q.upper).toBeCloseTo(0.0618, 4);
    expect(q.shareAny).toBeCloseTo(0.0484, 4);
    /* σz 1.31 on these five — outside the band, so Laney widens the limits (cases-w1.py) */
    expect(q.sigmaZ).toBeCloseTo(1.31, 2); expect(q.laney).toBe(true);
    expect(q.insp[0].lcl).toBe(0); expect(q.insp[0].ucl).toBeCloseTo(0.0496 + 3 * Math.sqrt(0.0496 / 200) * q.sigmaZ!, 3);
    expect(q.insp.filter(x => x.out)).toEqual([]); expect(q.equal).toBe(false);
    expect(q.tally.map(t => [t.kind, t.count])).toEqual([['Light pack', 31], ['Open seal', 23], ['Crushed', 2], ['Mis-label', 1]]);
    expect(q.tally[1].cum).toBeCloseTo(54 / 57, 4);
    expect(q.verdict).toBe('notMet');
  });
  it('DPMO with 6 opportunities, none without', () => {
    expect(f.faults!.dpmo).toBeUndefined();
    const g = sample({ ...A, opportunities: 6 }, inspRs(INSP)).faults!.dpmo!;
    expect(Math.round(g.dpmo)).toBe(8261); expect(g.z!.z).toBeCloseTo(2.40, 2); expect(g.z!.sigma).toBeCloseTo(3.90, 2);
  });
  it('the sentences', () => {
    const s = sampleSays(f, A);
    expect(s.text).toBe('57 faults on 1,150 items — 0.050 an item (5.0 per 100), 95% confident 0.038–0.064; about 4.8% of items carry a fault; at most 2 per 100 agreed — Not met: 5.0 per 100 is above it.');
    expect(s.verdict).toBe('Not met');
    expect(s.capability!.text).toBe('Light pack and open seal are 95% of the faults. Inspections this large vary more than the count alone says (σz 1.3): Laney’s limits are drawn.');
    const g = sampleSays(sample({ ...A, opportunities: 6 }, inspRs(INSP)), { ...A, opportunities: 6 });
    expect(g.capability!.text).toContain('8,261 per million opportunities (6 an item) — Z 2.4, a 3.9-sigma process by the 1.5-shift convention.');
  });
  it('faults not tallied by kind fall to Other; equal inspections are the c-chart’s case', () => {
    const g = sample(A, inspRs([[200, 9, { 'Open seal': 4 }], [200, 14, {}], [200, 6, { Crushed: 2 }]])).faults!;
    expect(g.tally.find(t => t.kind === 'Other')!.count).toBe(23); expect(g.equal).toBe(true);
    expect(sampleSays(sample(A, []), A)).toMatchObject({ verdict: 'Not counted' });
  });
});

const MINUTES = [60, 58, 61, 63, 65, 62, 60, 55, 54, 67, 63, 58, 59, 67, 63, 57, 62, 59, 60, 61, 60, 64, 62, 60, 63];
describe('held at a rate for a time (FC-083)', () => {
  const A: AgreedReadings = { kind: 'rate', count: 25, lower: 60, unit: 'packs', intervalMin: 1 };
  const f = sample(A, rs(MINUTES));
  it('met 18 of 25, the stretch 7, made 1,523 of 1,500, Ppk 0.10 — held with gaps', () => {
    const r = f.rate!;
    expect([r.met, r.stretchMin, r.made, r.expected]).toEqual([18, 7, 1523, 1500]);
    expect(r.share).toBeCloseTo(0.72, 2); expect(r.ratio).toBeCloseTo(1.015, 3);
    expect(r.mean).toBeCloseTo(60.92, 2); expect(r.ppk).toBeCloseTo(0.10, 2);
    expect(r.held).toBe('not');
  });
  it('the sentence: 72% met is under the 90% agreed, so not held; the dip named', () => {
    const s = sampleSays(f, A);
    expect(s.text).toBe('At least 60 packs a minute for 25 minutes: met 18 of 25 (72%), the longest stretch 7 minutes, 1,523 made against 1,500 — Not held: only 72% met, under the 90% agreed; 7 intervals missed.');
    expect(s.capability!.text).toContain('One-sided Ppk on the rates 0.10');
    expect(s.capability!.tone).toBe('a');
  });
  it('held with gaps at a 70% rule; held when every minute meets; a ceiling the other way', () => {
    expect(sampleSays(sample({ ...A, heldShare: 70 }, rs(MINUTES)), { ...A, heldShare: 70 }).verdict).toBe('Held with gaps');
    const all = rs(MINUTES.map(v => Math.max(v, 60)));
    expect(sampleSays(sample(A, all), A).verdict).toBe('Held');
    const C: AgreedReadings = { kind: 'rate', count: 25, upper: 62, unit: 'packs' };
    const g = sample(C, rs(MINUTES)).rate!;
    expect(g.side).toBe('most'); expect(g.met).toBe(MINUTES.filter(v => v <= 62).length);
  });
  it('two-minute intervals double the time; fewer intervals than agreed say so; words and problems', () => {
    const B: AgreedReadings = { kind: 'rate', count: 10, lower: 120, intervalMin: 2 };
    const g = sample(B, rs([250, 230, 260, 240, 245]));
    expect(g.rate!.intervals[0].rate).toBe(125); expect(g.rate!.held).toBe('none');
    expect(sampleSays(g, B).verdict).toBe('5 of 10 intervals');
    expect(modeAgreedWords(B)).toBe('at least 120 a minute for 20 minutes (10 intervals of 2)');
    expect(modeProblem({ kind: 'rate', count: 10 })).toBe('The rate — at least or at most what, a minute?');
  });
});

describe('machine capability (FC-084) and the lowest legal fill (FC-157)', () => {
  it('Cm and Cmk on consecutive parts against 1.67 — not accepted', () => {
    const vals = Array.from({ length: 50 }, (_, i) => 400.29 + 0.773 * Math.sin(i * 1.7) * 1.4);
    const A: AgreedReadings = { kind: 'limits', unit: 'g', lower: 398, upper: 403, count: 50, question: 'machine' };
    const f = sample(A, rs(vals));
    expect(f.machine).toBeDefined(); expect(f.machine!.agreed).toBe(1.67); expect(f.machine!.accepted).toBe(false);
    const note = modeNotes(f, A).find(n => n.k === 'machine')!;
    expect(note.text).toMatch(/^Cm \d\.\d\d, Cmk \d\.\d\d on 50 consecutive parts against 1.67 agreed — Not accepted/);
    expect(sample({ ...A, question: undefined }, rs(vals)).machine).toBeUndefined();
  });
  it('the fill: rule 1 binds at this spread, the give-away above the nominal, in money by £/kg', () => {
    const vals = THIRTY.map(v => Math.round((v + 1.3) * 10) / 10);
    const A: AgreedReadings = { kind: 'packers', unit: 'g', nominal: 400, count: 30, costPerKg: 3.4 };
    const f = sample(A, rs(vals));
    expect(f.fill).toBeDefined(); expect(f.fill!.binds).toBe(1); expect(f.fill!.lowest).toBe(400);
    expect(f.fill!.giveaway).toBeCloseTo(f.mean! - 400, 6);
    expect(f.fill!.gbpPer100).toBeCloseTo((f.mean! - 400) / 1000 * 3.4 * 100, 6);
    const note = modeNotes(f, A).find(n => n.k === 'fill')!;
    expect(note.text).toContain('the lowest target that keeps the three rules is 400.0 g (the average rule binds)');
  });
});

/* ---- W1 part 4: the questions that are a measurement with a limit (cases-w1.py) ---- */
describe('oxygen, a seal and a CCP against their limits (FC-167, FC-165, FC-169)', () => {
  it('residual oxygen: the highest pack, how many over, read as measured', () => {
    const f = sample({ kind: 'limits', question: 'oxygen', unit: '%', upper: 2, count: 30, limitSource: 'the MAP spec' }, rs(OXYGEN.slice(0, 30)));
    expect(f.question).toMatchObject({ q: 'oxygen', side: 'most', limit: 2, worst: 1.41, over: 0, n: 30 });
    const note = modeNotes(f, { kind: 'limits', question: 'oxygen', unit: '%', upper: 2, count: 30, limitSource: 'the MAP spec' }).find(n => n.k === 'question')!;
    expect(note.text).toBe('Residual oxygen: the highest pack 1.41 % against at most 2.00 % (the MAP spec) — all 30 under it. The set leans high by design, so the share outside is read as measured, never from a bell; a high pack goes to the leak test.');
    expect(note.tone).toBe('n');
    const g = sample({ kind: 'limits', question: 'oxygen', unit: '%', upper: 0.6, count: 30 }, rs(OXYGEN.slice(0, 30)));
    expect(g.question!.over).toBe(4);
    expect(modeNotes(g, { kind: 'limits', question: 'oxygen', unit: '%', upper: 0.6, count: 30 })[0]).toMatchObject({ k: 'question', tone: 'r' });
  });
  it('seal strength: the weakest against the minimum, leaks a study of their own', () => {
    const A: AgreedReadings = { kind: 'limits', question: 'seal', unit: 'N', lower: 12, count: 30, limitSource: 'the distribution trial' };
    const f = sample(A, rs(SEAL.slice(0, 30)));
    expect(f.question).toMatchObject({ q: 'seal', side: 'least', limit: 12, worst: Math.min(...SEAL.slice(0, 30)), over: 0 });
    const note = modeNotes(f, A).find(n => n.k === 'question')!;
    expect(note.text).toMatch(/^Seal strength: the weakest \d+\.\d N against at least 12\.0 N \(the distribution trial\) — a margin of \d\.\d N at the weakest\. Leaks are counted pass or fail in a study of their own: none leaking in n packs shows at most about 3 ÷ n, 95% confident\.$/);
  });
  it('a CCP: the margin, the probe’s guard band, a deviation — as cases-w1.py says', () => {
    const CCP = [75.7, 76.9, 78.2, 77.4, 75.1, 79.0, 76.3, 75.08, 77.7, 74.8];
    const A: AgreedReadings = { kind: 'limits', question: 'ccp', unit: '°C', lower: 75, count: 40, probeBias: 0.14, limitSource: 'the HACCP plan' };
    const f = sample(A, rs(CCP));
    expect(f.question).toMatchObject({ q: 'ccp', side: 'least', limit: 75, worst: 74.8, over: 1, bias: 0.14, guard: 2 });
    expect(f.question!.margin).toBeCloseTo(-0.2, 6); expect(f.question!.trueMargin).toBeCloseTo(-0.34, 6); expect(f.question!.mustRead).toBeCloseTo(75.14, 6);
    const note = modeNotes(f, A).find(n => n.k === 'question')!;
    expect(note.text).toBe('CCP: the critical limit is at least 75.00 °C (the HACCP plan); 1 deviation — the product since the last good check is held. With the probe reading +0.14 °C at the limit, a check must read 75.14 °C to be sure of 75.00 °C — 2 readings sit inside that guard band, not shown safe.');
    expect(note.tone).toBe('r');
    /* no deviation as read — but the lowest, 75.08, is truly 74.94 once the probe's bias is taken off: red, the true margin said */
    const g = sample(A, rs(CCP.filter(x => x >= 75)));
    const n2 = modeNotes(g, A).find(n => n.k === 'question')!;
    expect(n2.tone).toBe('r');
    /* the same readings with a probe reading 0.05 high: the lowest is truly 75.03 — nothing inside the guard band, met */
    expect(modeNotes(sample({ ...A, probeBias: 0.05 }, rs(CCP.filter(x => x >= 75))), { ...A, probeBias: 0.05 }).find(n => n.k === 'question')).toMatchObject({ tone: 'n', text: 'CCP: the critical limit is at least 75.00 °C (the HACCP plan); the lowest reading 75.08 °C sits 0.08 °C above it. With the probe reading +0.05 °C at the limit, a check must read 75.05 °C to be sure of 75.00 °C; the true margin is 0.03 °C.' });
    expect(n2.text).toBe('CCP: the critical limit is at least 75.00 °C (the HACCP plan); the lowest reading 75.08 °C sits 0.08 °C above it. With the probe reading +0.14 °C at the limit, a check must read 75.14 °C to be sure of 75.00 °C; the true margin is -0.06 °C — 2 readings sit inside that guard band, not shown safe.');
  });
});

describe('a weigher’s heads (FC-158) and a volume pack checked by weight (FC-163)', () => {
  const HEADS: Record<number, number[]> = { 1: [37.2, 37.9, 37.4, 38.1, 36.8], 2: [37.6, 37.1, 38.0, 37.3, 37.7], 3: [43.1, 43.8, 43.4, 43.9, 43.3], 4: [37.5, 36.9, 37.8, 37.2, 37.6] };
  const headRs = (hs: Record<number, number[]>): StudyReading[] => Object.entries(hs).flatMap(([h, xs]) => xs.map((value, i) => ({ id: `h${h}-${i}`, value, head: Number(h), at: i })));
  const A: AgreedReadings = { kind: 'limits', question: 'weigher', unit: 'g', lower: 30, upper: 50, count: 20 };
  it('the head means, the far head and the ANOVA as SciPy says them', () => {
    const f = sample(A, headRs(HEADS));
    const w = f.weigher!;
    expect(w.heads.map(h => h.head)).toEqual([1, 2, 3, 4]);
    expect(w.far!.head).toBe(3); expect(w.far!.diff).toBeCloseTo(6.03, 2); expect(w.far!.others).toBeCloseTo(37.47, 2);
    expect(w.anova!.f).toBeCloseTo(283.858, 1); expect(w.anova!.p).toBeLessThan(0.001);
    expect(modeNotes(f, A).find(n => n.k === 'weigher')).toEqual({ k: 'weigher', tone: 'a', text: 'Heads: 4 heads read (5 each); head 3 runs 6.0 g heavy (43.5 against 37.5 on the others) — the heads differ (ANOVA p < 0.001) — the fix is that head’s feeder, not the target.' });
  });
  it('agreeing heads agree; a reading with no head is said; one head alone asks for the heads', () => {
    const g = sample(A, [...headRs({ 1: HEADS[1], 2: HEADS[2], 4: HEADS[4] }), { id: 'x', value: 37.5, at: 99 }]);
    const n = modeNotes(g, A).find(x => x.k === 'weigher')!;
    expect(n.tone).toBe('n');
    expect(n.text).toMatch(/^Heads: 3 heads read \(5 each\), 1 reading with no head; head \d runs \d\.\d g (heavy|light) \(\d+\.\d against \d+\.\d on the others\) — the heads agree \(ANOVA p 0\.87\)\.$/);
    const one = sample(A, headRs({ 2: HEADS[2] }));
    expect(modeNotes(one, A).find(x => x.k === 'weigher')!.text).toBe('Heads: only head 2 has readings — type the head with each reading to compare them.');
  });
  it('400 ml at 1.03 g/ml: the nominal and the TNE in grams, the rules in grams', () => {
    const P: AgreedReadings = { kind: 'packers', unit: 'g', nominal: 412, nominalMl: 400, density: 1.03, count: 30 };
    const f = sample(P, rs([412.5, 411.9, 413.1, 412.2, 410.8]));
    expect(f.packers!.tne).toBeCloseTo(12.36, 6);
    expect(packersTne(P)).toBeCloseTo(12.36, 6);
    expect(packersTne({ nominal: 528, unit: 'g', nominalMl: 480, density: 1.1 })).toBeCloseTo(15.84, 6);   // the volume table's band, not the weight's (15 g)
    expect(packersTne({ nominal: 528, unit: 'g' })).toBe(15);
    expect(modeNotes(f, P).find(n => n.k === 'density')!.text).toBe('Sold by volume, checked by weight: 400 ml at 1.03 g/ml is 412.0 g; the tolerable negative error 12 ml is 12.36 g — the three rules run in grams (T1 399.64 g, T2 387.28 g). The density is the product’s at the temperature it is packed.');
  });
});
