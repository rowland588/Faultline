/* THE BRAIN'S HOMEWORK, B1 — each question against cases worked by hand, and the exact test against SciPy's binomtest
 * (scipy.stats.binomtest(k, n, 0.25).pvalue: 7/10 → 0.003506, 3/12 → 1.0, 10/14 → 0.000342, 2/8 → 1.0). */
import { describe, it, expect } from 'vitest';
import { binomTwoSided, homework, inputsOf, DESCRIPTION_NOT_CAUSE } from '../engine';
import type { Observation } from '../../../types';

const NOW = Date.UTC(2026, 10, 12, 12);
const DAY = 86_400_000;
let n = 0;
const stop = (daysAgo: number, min: number, asset: string, category: string, ws = 'L1'): Observation => ({
  id: `o${++n}`, workspaceId: ws, category, asset, startedAt: NOW - daysAgo * DAY, durationMs: min * 60_000, timing: 'stopwatch', count: 1, media: [], createdAt: 0, updatedAt: 0,
});
const LINE = { id: 'L1', name: 'Line 1' };

describe('the exact conditional test of two rates', () => {
  it('equals SciPy’s binomtest', () => {
    expect(binomTwoSided(7, 10, 0.25)).toBeCloseTo(0.003506, 5);
    expect(binomTwoSided(3, 12, 0.25)).toBeCloseTo(1, 5);
    expect(binomTwoSided(10, 14, 0.25)).toBeCloseTo(0.000342, 5);
    expect(binomTwoSided(2, 8, 0.25)).toBeCloseTo(1, 5);
  });
});

describe('where the time went — a Pareto of the timed minutes', () => {
  it('names the biggest pair, its share and the vital few, and says thin under ten stops', () => {
    // Jam on the Bagger 10 + 5 + 15 = 30; Film on the Wrapper 12; Label on the Labeller 3 → 45 min in 5 stops
    const obs = [stop(1, 10, 'Bagger', 'Jam'), stop(2, 5, 'Bagger', 'Jam'), stop(20, 15, 'Bagger', 'Jam'), stop(3, 12, 'Wrapper', 'Film'), stop(4, 3, 'Labeller', 'Label')];
    const f = homework(LINE, obs, NOW).findings.find(x => x.kind === 'where')!;
    expect(f.figures).toMatchObject({ minutes: 45, stops: 5, topMinutes: 30, topShare: 67, vitalFew: 2, groups: 3 });
    expect(f.sure).toBe('thin');
    expect(f.says).toBe('Over the last 28 days 45 min of stops were timed on Line 1 in 5 stops; Jam on the Bagger was 67% of it (30 min in 3), and 2 machine-and-reason pairs carry 80% of the time. Too few stops to rank with confidence.');
    expect(f.limits.join(' ')).toMatch(/a day nobody timed looks like a day with no stops/);
  });
  it('ignores other lines, deleted stops, counts with no time and stops older than 28 days', () => {
    const obs = [stop(1, 10, 'Bagger', 'Jam'), stop(1, 99, 'Bagger', 'Jam', 'L2'), { ...stop(1, 50, 'Bagger', 'Jam'), deletedAt: 1 }, stop(1, 0, 'Bagger', 'Jam'), stop(40, 70, 'Bagger', 'Jam')];
    expect(homework(LINE, obs, NOW).findings.find(x => x.kind === 'where')!.figures.minutes).toBe(10);
  });
});

describe('did it change — the last 7 days against the 21 before', () => {
  it('7 stops in the last week against 3 in the three before is unlikely chance (p 0.0035)', () => {
    const obs = [...Array.from({ length: 7 }, (_, i) => stop(i % 6 + 0.5, 2, 'Bagger', 'Jam')), stop(10, 2, 'Bagger', 'Jam'), stop(15, 2, 'Bagger', 'Jam'), stop(25, 2, 'Bagger', 'Jam')];
    const f = homework(LINE, obs, NOW).findings.find(x => x.kind === 'changed')!;
    expect(f.figures).toMatchObject({ lastWeekPerDay: 1, beforePerDay: 0.1 });
    expect(f.p).toBeCloseTo(0.004, 3);
    expect(f.sure).toBe('significant');
    expect(f.says).toMatch(/more stops; unlikely to be chance \(p = 0\.004\)/);
  });
  it('3 against 9 is the same rate — not distinguishable from chance', () => {
    const obs = [...Array.from({ length: 3 }, (_, i) => stop(i + 1, 2, 'Bagger', 'Jam')), ...Array.from({ length: 9 }, (_, i) => stop(8 + i * 2, 2, 'Bagger', 'Jam'))];
    const f = homework(LINE, obs, NOW).findings.find(x => x.kind === 'changed')!;
    expect(f.p).toBe(1);
    expect(f.sure).toBe('suggestive');
    expect(f.says).toMatch(/no change; not distinguishable from chance/);
  });
  it('under five stops it says nothing can be said', () => {
    const f = homework(LINE, [stop(1, 2, 'Bagger', 'Jam'), stop(9, 2, 'Bagger', 'Jam')], NOW).findings.find(x => x.kind === 'changed')!;
    expect(f.sure).toBe('thin');
    expect(f.says).toBe('Too few stops timed on Line 1 in four weeks (2) to say whether it is stopping more or less.');
  });
});

describe('recurring, and the recorded reason that is not a cause', () => {
  it('three of one reason on one machine in 14 days is a pattern; two is not', () => {
    const fs = homework(LINE, [stop(1, 4, 'Bagger', 'Jam'), stop(5, 4, 'Bagger', 'Jam'), stop(13, 4, 'Bagger', 'Jam'), stop(2, 4, 'Wrapper', 'Film'), stop(3, 4, 'Wrapper', 'Film')], NOW).findings.filter(x => x.kind === 'recurs');
    expect(fs).toHaveLength(1);
    expect(fs[0].says).toBe('Jam on the Bagger has come back 3 times in 14 days (12 min) — a recurring pattern worth a cause, not a one-off.');
  });
  it('“operator issue” is said to describe, not explain, when it is a fifth or more of the time', () => {
    const f = homework(LINE, [stop(1, 6, 'Bagger', 'Operator issue'), stop(2, 4, 'Bagger', 'other'), stop(3, 10, 'Wrapper', 'Film')], NOW).findings.find(x => x.kind === 'recorded')!;
    expect(f.figures).toMatchObject({ minutes: 10, share: 50 });
    expect(f.says).toMatch(/50% of the stop time on Line 1 in four weeks \(10 min\) is booked to “Operator issue”, “other” — a description, not a cause/);
    expect(DESCRIPTION_NOT_CAUSE.test('Film jam')).toBe(false);
  });
});

describe('money, and doing the homework once', () => {
  it('the cost model names what is missing rather than inventing a figure', () => {
    const f = homework(LINE, [stop(1, 28, 'Bagger', 'Jam')], NOW).findings.find(x => x.kind === 'where')!;
    expect(f.money?.words ?? '').toMatch(/wage|rate|margin|people|speed/i);
    expect(f.money?.perDay).toBeUndefined();
  });
  it('with the line’s crew and wage, the labour of a minute a day is priced', () => {
    const f = homework({ ...LINE, crew: 4, labourRatePerHour: 15 }, [stop(1, 28, 'Bagger', 'Jam')], NOW).findings.find(x => x.kind === 'where')!;
    expect(f.money?.perDay).toBeCloseTo(1, 5);   // 1 min a day × 4 people × £15 an hour / 60 = £1
  });
  it('the same records give the same fingerprint; a changed stop a new one', () => {
    const a = [stop(1, 4, 'Bagger', 'Jam')];
    expect(inputsOf(a)).toBe(inputsOf([...a]));
    expect(inputsOf([{ ...a[0], durationMs: 1 }])).not.toBe(inputsOf(a));
  });
});
