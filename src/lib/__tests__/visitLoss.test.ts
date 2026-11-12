import { describe, it, expect } from 'vitest';
import { lossRowSaid, visitLoss, visitWhatIf, type LossLine, type VisitLoss } from '../visitLoss';

/* Worked by hand. Line 3: crew 4 at £15 an hour (no on-costs) = £60 an hour; 100 packs a minute; 35p a pack.
 *   Bagger — Jam: 12 + 10 + 9 = 31 min;  Wrapper — Film break: 10 min;  Bagger — Changeover: 6 min.  Total 47 min.
 *   Bottleneck not known → every stop stops the line: 47 × 100 = 4,700 packs × £0.35 = £1,645; labour 47/60 × £60 = £47.
 *   Bottleneck the Bagger → 37 min stop the line: 3,700 packs = £1,295; labour still £47 (every stop). */
const L3: LossLine = { id: 'l3', name: 'Line 3', crew: 4, labourRatePerHour: 15, packsPerMin: 100, marginPerPack: 0.35 };
const stop = (asset: string, category: string, min: number, at = 0) => ({ workspaceId: 'l3', asset, category, durationMs: min * 60_000, timing: 'stopwatch' as const, startedAt: at });
const day = [stop('Bagger', 'Jam', 12), stop('Wrapper', 'Film break', 10), stop('Bagger', 'Jam', 10), stop('Bagger', 'Changeover', 6), stop('Bagger', 'Jam', 9)];

describe('what the stops timed on a visit cost', () => {
  it('ranks by the minutes and prices the two parts apart — the bottleneck not known', () => {
    const v = visitLoss(day, [L3], () => undefined);
    expect(v?.timed).toBe(5);
    expect(v?.minutes).toBeCloseTo(47, 6);
    expect(v?.rows.map(r => [r.machine, r.reason, r.stops, Math.round(r.minutes)])).toEqual([['Bagger', 'Jam', 3, 31], ['Wrapper', 'Film break', 1, 10], ['Bagger', 'Changeover', 1, 6]]);
    expect(v?.rows[0].share).toBeCloseTo(31 / 47, 6);
    expect(v?.packs).toBeCloseTo(4700, 6);
    expect(v?.contribution).toBeCloseTo(1645, 6);
    expect(v?.labour).toBeCloseTo(47, 6);
    expect(v?.says).toBe('5 stops timed on Line 3 on the visit: 47 min lost, 31 min of it (66%) Bagger — Jam. 4,700 packs not made — £1.6k of contribution; £47 of the crew’s labour stood.');
    expect(v?.how).toContain('every stop counted as stopping the line');
    expect(v?.how).toContain('never added');
    expect(lossRowSaid(v!.rows[0], false)).toBe('3 stops · 31 min · 66% · £1.1k contribution · £31 labour');
  });
  it('with the bottleneck known, a stop elsewhere costs its labour and no packs', () => {
    const v = visitLoss(day, [L3], () => ({ names: ['Bagger'] }));
    expect(v?.packs).toBeCloseTo(3700, 6);
    expect(v?.contribution).toBeCloseTo(1295, 6);
    expect(v?.labour).toBeCloseTo(47, 6);
    expect(v?.rows[1].packs).toBe(0);
    expect(v?.how).toContain('a stop elsewhere costs its labour only');
  });
  it('a missing input is named, the rest still said — never a figure made up', () => {
    const v = visitLoss(day, [{ id: 'l3', name: 'Line 3', packsPerMin: 100 }], () => undefined);
    expect(v?.labour).toBeUndefined();
    expect(v?.contribution).toBeUndefined();
    expect(v?.packs).toBeCloseTo(4700, 6);
    expect(v?.says).toContain('4,700 packs not made.');
    expect(v?.says).not.toContain('£');
    expect(v?.how).toContain('Line 3: the crew and wage, the margin a pack');
    const none = visitLoss(day, [{ id: 'l3', name: 'Line 3' }], () => undefined);
    expect(none?.says).toBe('5 stops timed on Line 3 on the visit: 47 min lost, 31 min of it (66%) Bagger — Jam.');
    expect(none?.how).toContain('Line 3: the crew and wage, the speed');
  });
  it('a stop counted with no time is counted apart and given no minutes', () => {
    const v = visitLoss([...day, { workspaceId: 'l3', asset: 'Bagger', category: 'Jam', durationMs: 0, timing: 'instant' as const, startedAt: 9 }], [L3], () => undefined);
    expect(v?.timed).toBe(5);
    expect(v?.counted).toBe(1);
    expect(v?.minutes).toBeCloseTo(47, 6);
    expect(v?.says.endsWith('1 more stop counted with no time.')).toBe(true);
    const only = visitLoss([{ workspaceId: 'l3', asset: 'Bagger', category: 'Jam', durationMs: 0, timing: 'instant' as const, startedAt: 9 }], [L3], () => undefined);
    expect(only?.says).toBe('1 stop counted on Line 3 on the visit, none of them timed — no minutes and no money can be said.');
  });
  it('nothing timed is nothing said; another customer\'s line is never in it; one cause says "all"', () => {
    expect(visitLoss([], [L3], () => undefined)).toBeUndefined();
    expect(visitLoss([{ ...stop('Bagger', 'Jam', 5), workspaceId: 'other' }], [L3], () => undefined)).toBeUndefined();
    expect(visitLoss([stop('Bagger', 'Jam', 5)], [L3], () => undefined)?.says.startsWith('1 stop timed on Line 3 on the visit: 5 min lost, all Bagger — Jam.')).toBe(true);
  });
});

/* Worked by hand, on the day above (5 stops, 47 min; £1,645 of contribution and £47 of labour with the bottleneck not known).
 *   Watched 180 min, the line runs 40 h a week: 2,400 ÷ 180 = 13.333 times the watching.
 *   47 × 13.333 = 626.7 min = 10.4 h a week; £1,645 × 13.333 = £21,933; £47 × 13.333 = £626.67.
 *   The exact 95% interval for a Poisson count of 5 is 1.6235 to 11.6683 (the published table; SciPy chi2.ppf(.025, 10)/2 and
 *   chi2.ppf(.975, 12)/2) — 0.3247 to 2.3337 of the count: 203.5 to 1,462.4 min; £7,122 to £51,184; £203 to £1,462. */
describe('what if every week ran like the time watched', () => {
  const loss = visitLoss(day, [L3], () => undefined) as VisitLoss;
  it('carries the loss forward in proportion to time, with the range the stops seen allow', () => {
    const w = visitWhatIf(loss, { watchedMin: 180, hoursPerWeek: 40 });
    expect(w.ok).toBe(true);
    expect(w.factor).toBeCloseTo(13.3333, 3);
    expect(w.minutes?.value).toBeCloseTo(626.667, 2);
    expect(w.minutes?.lo).toBeCloseTo(47 * 13.33333 * (1.62349 / 5), 0);
    expect(w.minutes?.hi).toBeCloseTo(47 * 13.33333 * (11.66833 / 5), 0);
    expect(w.contribution?.value).toBeCloseTo(21933.33, 1);
    expect(w.contribution?.lo).toBeCloseTo(21933.33 * 0.324698, -1);
    expect(w.contribution?.hi).toBeCloseTo(21933.33 * 2.333666, -1);
    expect(w.labour?.value).toBeCloseTo(626.67, 1);
    expect(w.firm).toBe('Rough');
    expect(w.need?.stops).toBe(66);
    expect(w.says).toBe('If a week ran like the 3 h watched, at 40 hours a week: 10.4 h lost in a week — between 3.4 h and 24.4 h. £21.9k of contribution (£7.1k to £51.2k); £627 of the crew’s labour (£203 to £1.5k).');
    expect(w.how).toContain('An “if”, not a forecast: 5 stops seen in 3 h');
    expect(w.how).toContain('rough: 66 stops would make it firm');
  });
  it('weeks of the same multiply it; the range keeps its proportion', () => {
    const w = visitWhatIf(loss, { watchedMin: 180, hoursPerWeek: 40, weeks: 4 });
    expect(w.minutes?.value).toBeCloseTo(626.667 * 4, 1);
    expect(w.says.startsWith('If each of 4 weeks ran like the 3 h watched, at 40 hours a week: 41.8 h lost in 4 weeks')).toBe(true);
  });
  it('nothing is assumed: a missing input is asked for, and an impossible one refused in words', () => {
    expect(visitWhatIf(loss, {}).why).toBe('Give how long the line was watched and the hours it runs a week — neither is assumed.');
    expect(visitWhatIf(loss, { watchedMin: 180 }).why).toBe('Give the hours it runs a week — neither is assumed.');
    expect(visitWhatIf(loss, { watchedMin: 30, hoursPerWeek: 40 }).why).toContain('the watching must be at least as long');
    expect(visitWhatIf(loss, { watchedMin: 180, hoursPerWeek: 200 }).why).toBe('A week has 168 hours.');
  });
  it('a line with no money carries its minutes only', () => {
    const bare = visitLoss(day, [{ id: 'l3', name: 'Line 3' }], () => undefined) as VisitLoss;
    const w = visitWhatIf(bare, { watchedMin: 180, hoursPerWeek: 40 });
    expect(w.contribution).toBeUndefined();
    expect(w.says).toBe('If a week ran like the 3 h watched, at 40 hours a week: 10.4 h lost in a week — between 3.4 h and 24.4 h.');
  });
});
