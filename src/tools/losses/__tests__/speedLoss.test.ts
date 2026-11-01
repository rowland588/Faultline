/* FC-056 speed loss: slow running told from short stops, in packs, money and how often — proved on the record's shift, worked
 * by plain arithmetic in scripts/knowledge/cases-toc.py (net operating time, Nakajima):
 *   planned 450, stops 62 → run 388; ideal 120, running speed timed 108, 38,200 good packs
 *   net operating time 38,200 ÷ 108 = 353.70; at ideal the packs take 318.33
 *   speed loss 69.67 = slow running 35.37 + short stops 34.30; in packs at 120: 4,244 + 4,116 = 8,360
 *   108 is 90% of 120; 41 short stops in the 388-minute run = 6.34 an hour, 0.836 min (50 s) each
 *   at 30p a pack: slow £1,273.33, short £1,234.67; crew £60 an hour: idle labour £35.37 and £34.30
 *   the crew's labour a pack: 60 ÷ (120 × 60) = 0.83p at the ideal, 60 ÷ (108 × 60) = 0.93p at the speed it ran. */
import { describe, expect, it } from 'vitest';
import { lossFigures } from '../losses';
import { lengthWords, shortStopOffers, speedLoss } from '../speedLoss';
import type { LossCount, RunTiming, ToolStudy } from '../../../lib/study';
import type { Observation } from '../../../types';

const from = Date.UTC(2026, 9, 10, 6, 0), to = from + 8 * 3_600_000;
const COUNT: LossCount = { from, to, plannedMin: 450, made: 38_200, rejects: 0, ratePerMin: 120, rateFrom: 'plate', rateMachine: 'Bagger' };
const STOP: Observation = { id: 's', workspaceId: 'w', category: 'Breakdown', asset: 'Bagger', startedAt: from + 3_600_000, durationMs: 62 * 60_000, timing: 'stopwatch', count: 1, media: [], createdAt: 0, updatedAt: 0 };
const timing = (perMin: number): RunTiming[] => [{ id: 't', at: from, packs: perMin * 10, sec: 600 }];
const COST = { crew: 4, labourRatePerHour: 15, labourBurden: 1, marginPerPack: 0.3 };
const figures = (o: { timings?: RunTiming[]; cost?: typeof COST | undefined; count?: Partial<LossCount> } = {}) => lossFigures({ ...COUNT, ...o.count }, [STOP], 'cost' in o ? o.cost : COST, o.timings ?? timing(108));
const r2 = (n?: number) => Math.round((n ?? 0) * 100) / 100;

describe('the record’s shift', () => {
  const s = speedLoss(figures(), { n: 41, watchedMin: 388 });
  it('slow running and short stops, told by the net operating time', () => {
    expect(s?.told).toBe(true);
    expect(r2(s?.slowMin)).toBe(35.37);
    expect(r2(s?.shortMin)).toBe(34.3);
    expect(r2((s?.slowMin ?? 0) + (s?.shortMin ?? 0))).toBe(69.67);
  });
  it('in packs at the ideal speed', () => {
    expect([Math.round(s?.slowPacks ?? 0), Math.round(s?.shortPacks ?? 0), Math.round(s?.lumpPacks ?? 0)]).toEqual([4244, 4116, 8360]);
    expect(r2(s?.runningPct)).toBe(0.9);
  });
  it('the two are within 5% of each other: said to cost about the same', () => {
    expect(s?.bigger).toBe('level');
    expect(s?.says).toBe('Speed loss 69.7 min: 35.4 min of slow running (4,244 packs — it ran at 108 a minute against the plate speed of 120, 10% under) and 34.3 min of short stops (4,116 packs). Slow running and short stops cost about the same — fix both, the speed setting and the jams.');
  });
  it('slow running clearly the bigger: timed at 105, the speed setting or the product', () => {
    /* net 363.81, slow 45.48, short 24.19 */
    const t = speedLoss(figures({ timings: timing(105) }));
    expect([r2(t?.slowMin), r2(t?.shortMin), t?.bigger]).toEqual([45.48, 24.19, 'slow']);
    expect(t?.says).toMatch(/Slow running costs more than the short stops — the speed setting, or the product\.$/);
  });
  it('how often and how long: 41 in the run is 6.34 an hour, 50 seconds each', () => {
    expect(r2(s?.perHour)).toBe(6.34);
    expect(Math.round((s?.meanMin ?? 0) * 1000) / 1000).toBe(0.836);
    expect(lengthWords(s?.meanMin ?? 0)).toBe('50 s');
    expect(s?.lines.join(' ')).toContain('41 short stops counted in 6.5 h of running: 6.3 an hour — 50 s each.');
  });
  it('in money, the two parts apart: contribution at 30p a pack and the crew’s idle labour', () => {
    expect([r2(s?.slowMoney?.contribution), r2(s?.shortMoney?.contribution)]).toEqual([1273.33, 1234.67]);
    expect([r2(s?.slowMoney?.labour), r2(s?.shortMoney?.labour)]).toEqual([35.37, 34.3]);
    expect(s?.money).toBe('slow running £1,273 of lost contribution and £35 of idle labour; short stops £1,235 of lost contribution and £34 of idle labour — at the plate speed, where a minute is a minute of the line, if it cannot be made up.');
  });
  it('the crew’s labour a pack goes up when it runs under the plate', () => {
    expect([r2((s?.labourPerPack?.ideal ?? 0) * 100), r2((s?.labourPerPack?.running ?? 0) * 100)]).toEqual([0.83, 0.93]);
    expect(s?.lines.join(' ')).toContain('puts the crew\'s labour up from 0.83p to 0.93p a pack');
  });
  it('one line for the paper from the same figures', () => {
    expect(s?.paper).toBe('69.7 min — 35.4 min slow running (4,244 packs, 10% under the plate speed), 34.3 min short stops (4,116 packs, 6.3 an hour, 50 s each); about equal.');
  });
});

describe('the other way round, and level', () => {
  it('a machine nearly at its plate speed with long short stops: the short stops are the bigger — the jams', () => {
    /* 38,200 at timed 119: net 321.0, slow 321.01 − 318.33 = 2.68; short 388 − 321.01 = 66.99 */
    const s = speedLoss(figures({ timings: timing(119) }));
    expect(r2(s?.slowMin)).toBe(2.68);
    expect(r2(s?.shortMin)).toBe(66.99);
    expect(s?.bigger).toBe('short');
    expect(s?.says).toMatch(/Short stops cost more than slow running — the jams: count them by reason\.$/);
  });
  it('about equal within 5% of the total says so', () => {
    /* timed 108.6: net 351.75, slow 33.42, short 36.25 — a 4% gap of the total */
    const s = speedLoss(figures({ timings: timing(108.6) }));
    expect(s?.bigger).toBe('level');
    expect(s?.says).toMatch(/cost about the same — fix both/);
  });
  it('timed above the plate speed: no slow running, said, and amber', () => {
    const s = speedLoss(figures({ timings: timing(125) }));
    expect(s?.told).toBe(true);
    expect(s?.slowMin).toBe(0);
    expect(s?.says).toContain('no slow running');
    expect(s?.lines[0]).toBe('Timed above the plate speed — no slow running; check the plate speed or the timing.');
    expect(s?.tone).toBe('a');
  });
});

describe('what it does not claim', () => {
  it('no running speed timed: one lump, not told apart, and what to do', () => {
    const s = speedLoss(lossFigures(COUNT, [STOP], COST, []));
    expect(s?.told).toBe(false);
    expect(Math.round(s?.lumpMin ?? 0)).toBe(70);
    expect(s?.says).toMatch(/not yet told apart\. Time the running speed while the machine runs to split them\.$/);
    expect(s?.slowMin).toBeUndefined();
  });
  it('no cost on the line: the packs said and the two missing inputs named — nothing invented', () => {
    const s = speedLoss(figures({ cost: undefined }));
    expect(s?.money).toBeUndefined();
    expect(s?.missing).toEqual(['Give the line a margin a pack (Set up the line) to say the lost packs in money.', 'Give the line its crew and a wage (Set up the line) to say the idle labour.']);
    expect(Math.round(s?.slowPacks ?? 0)).toBe(4244);
  });
  it('short stops not counted: how often is not said, and what to do', () => {
    const s = speedLoss(figures());
    expect(s?.perHour).toBeUndefined();
    expect(s?.lines.join(' ')).toContain('needs the short stops counted over a watched stretch');
  });
  it('a count that is not finished, or without the stops, says nothing', () => {
    expect(speedLoss(lossFigures({ ...COUNT, made: undefined }, [STOP], COST, timing(108)))).toBeUndefined();
    expect(speedLoss(lossFigures(COUNT, undefined, COST, timing(108)))).toBeUndefined();
  });
  it('no loss left over after the stops: no speed loss, said', () => {
    const s = speedLoss(figures({ count: { made: 450 * 120 - 62 * 120 } }));
    expect(s?.verdict).toBe('No speed loss');
    expect(s?.says).toMatch(/^No speed loss:/);
  });
  it('a watch shorter than the run is extrapolated and said "about"', () => {
    const s = speedLoss(figures(), { n: 10, watchedMin: 120 });
    expect(s?.lines.join(' ')).toContain('10 short stops counted in 2 h of running: 5 an hour, about 32 in the 388 min run — 64 s each');
  });
  it('a stop count timed one at a time is set beside the count’s own mean', () => {
    const s = speedLoss(figures(), { n: 41, watchedMin: 388, meanMin: 0.75 });
    expect(s?.lines.join(' ')).toContain('Timed one at a time they averaged 45 s; the count leaves 50 s each — close.');
  });
});

describe('short stops offered from a reliability study', () => {
  const rel = (name: string, event: string, o: Partial<ToolStudy> = {}): ToolStudy => ({
    id: name, tool: 'reliability', name, workspaceId: 'w', uses: [], startedAt: 1, createdAt: 1, updatedAt: 1,
    agreed: { reliability: { counts: [{ id: 'a', name: event }] } },
    facts: { watch: [{ id: 'w1', from: 0, to: 6 * 3_600_000 }], events: Array.from({ length: 30 }, (_, i) => ({ id: `e${i}`, at: (i + 1) * 600_000, count: 'a' })) },
    ...o,
  } as ToolStudy);
  it('a count named for short stops: how many in how long a watch', () => {
    const got = shortStopOffers([rel('Wrapper stops', 'Short stop'), rel('Films', 'Film break')], 1e12);
    expect(got.map(x => [x.study, x.count, x.tally.n, x.tally.watchedMin])).toEqual([['Wrapper stops', 'Short stop', 30, 360]]);
    expect(got[0].says).toBe('30 Short stop in 6 h watched');
  });
  it('another machine’s study is not offered', () => {
    expect(shortStopOffers([rel('Wrapper stops', 'Jam', { machine: 'Ilapak' })], 1e12, 'Bagger')).toEqual([]);
    expect(shortStopOffers([rel('Wrapper stops', 'Jam', { machine: 'Bagger' })], 1e12, 'bagger')).toHaveLength(1);
  });
});
