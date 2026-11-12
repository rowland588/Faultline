import { describe, it, expect } from 'vitest';
import { lossRowSaid, visitLoss, type LossLine } from '../visitLoss';

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
