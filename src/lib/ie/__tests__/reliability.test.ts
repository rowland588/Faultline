import { describe, expect, it } from 'vitest';
import {
  chi2Quantile, clockAt, compareReliability, costWords, countersOf, eventsOf, relAll, relRows, studyReliabilitySays, FIRST_COUNT, countedEvents, plural, relCost, reliability, reliabilityInsights, reliabilitySays, runningRun, span, watchedSpans,
} from '../reliability';
import { relClosing, relClosings, relTiles, relTrend } from '../reliabilityLean';
import type { AgreedReliability, RelEvent, WatchRun } from '../../study';
import type { RelSubject } from '../reliability';

const H = 3_600_000, MIN = 60_000;
const T0 = new Date(2026, 9, 20, 8, 0, 0).getTime();
const ev = (at: number, extra: Partial<RelEvent> = {}): RelEvent => ({ id: `e${at}`, at, ...extra });

describe('the chi-square quantiles the bounds use', () => {
  it('match the tables', () => {
    expect(chi2Quantile(0.95, 2)).toBeCloseTo(5.991, 2);
    expect(chi2Quantile(0.9, 2)).toBeCloseTo(4.605, 2);
    expect(chi2Quantile(0.05, 2)).toBeCloseTo(0.1026, 3);
    expect(chi2Quantile(0.95, 12)).toBeCloseTo(21.026, 2);
    expect(chi2Quantile(0.05, 10)).toBeCloseTo(3.94, 2);
    expect(chi2Quantile(0.95, 202)).toBeCloseTo(236.4, 0);
  });
});

describe('the watch', () => {
  it('counts the stretches it ran, overlaps once, one still running to now', () => {
    const runs: WatchRun[] = [
      { id: 'a', from: T0, to: T0 + H },
      { id: 'b', from: T0 + 30 * MIN, to: T0 + 90 * MIN }, // a second phone, overlapping
      { id: 'c', from: T0 + 3 * H },
      { id: 'x', from: T0 + 10 * H, to: T0 + 11 * H, struck: true },
    ];
    const sp = watchedSpans(runs, T0 + 4 * H);
    expect(sp).toEqual([[T0, T0 + 90 * MIN], [T0 + 3 * H, T0 + 4 * H]]);
    expect(runningRun(runs)?.id).toBe('c');
    expect(clockAt(sp, T0 + 3 * H + 30 * MIN)).toBe(120 * MIN);
  });

  it('counts an event only while the watch ran, and never a struck one', () => {
    const sp = watchedSpans([{ id: 'a', from: T0, to: T0 + H }], T0 + 5 * H);
    const got = countedEvents([ev(T0 + MIN), ev(T0 + 2 * H), ev(T0 + 5 * MIN, { struck: true })], sp);
    expect(got.map(e => e.at)).toEqual([T0 + MIN]);
  });
});

describe('MTBF and the failure rate', () => {
  const a: RelSubject = { event: 'stop' };
  /* two days: 4 h with 8 stops, then 2 h with 2 */
  const runs: WatchRun[] = [
    { id: 'd1', from: T0, to: T0 + 4 * H },
    { id: 'd2', from: T0 + 24 * H, to: T0 + 26 * H },
  ];
  const events = [
    ...[20, 50, 80, 110, 140, 170, 200, 230].map(m => ev(T0 + m * MIN, { kind: m < 100 ? 'jam' : 'misfeed' })),
    ev(T0 + 24 * H + 40 * MIN, { kind: 'jam' }), ev(T0 + 24 * H + 100 * MIN),
  ];
  const f = reliability(a, runs, events, T0 + 30 * H);

  it('is the watched time over the events, and its inverse', () => {
    expect(f.hours).toBeCloseTo(6, 6);
    expect(f.n).toBe(10);
    expect(f.mtbfH).toBeCloseTo(0.6, 6);
    expect(f.rate).toBeCloseTo(10 / 6, 6);
    expect(f.enough).toBe('enough');
  });

  it('carries the 90% bounds of a time-ended test', () => {
    /* 2T/χ²(0.95; 22) = 12/33.924 and 2T/χ²(0.05; 20) = 12/10.851 */
    expect(f.lo).toBeCloseTo(12 / 33.924, 3);
    expect(f.hi).toBeCloseTo(12 / 10.851, 3);
    expect(f.rateLo).toBeCloseTo(1 / (f.hi as number), 9);
  });

  it('says the gaps in watched time, across the days, and an hour clear', () => {
    expect(f.gaps?.n).toBe(9);
    /* the gap across the night is watched time only: 230 → 240 min on day one, then 40 */
    expect(f.points[8].h).toBeCloseTo((240 + 40) / 60, 6);
    expect(f.gaps?.minH).toBeCloseTo(0.5, 6);
    expect(f.hourClear).toBeCloseTo(Math.exp(-1 / 0.6), 6);
    expect(f.b10H).toBeCloseTo(0.6 * -Math.log(0.9), 6);
  });

  it('by kind, top first, the untold named', () => {
    expect(f.kinds.map(k => [k.kind, k.n])).toEqual([['jam', 4], ['misfeed', 5], ['not said', 1]].sort((x, y) => (y[1] as number) - (x[1] as number)));
    expect(f.kinds[0]).toMatchObject({ kind: 'misfeed', n: 5 });
    expect(f.kinds[0].mtbfH).toBeCloseTo(6 / 5, 6);
  });

  it('day by day', () => {
    expect(f.days.map(d => [d.n, +d.hours.toFixed(3)])).toEqual([[8, 4], [2, 2]]);
    expect(f.days[0].mtbfH).toBeCloseTo(0.5, 6);
  });

  it('says it in words', () => {
    const said = reliabilitySays(a, f);
    expect(said.verdict).toBe('MTBF 36 min');
    expect(said.text).toContain('10 stops in 6 h of watched running: one every 36 min');
    expect(said.tone).toBe('n');
  });
});

describe('with nothing seen yet, and too few', () => {
  it('only a floor with no event', () => {
    const f = reliability({ event: 'failure' }, [{ id: 'a', from: T0, to: T0 + 8 * H }], [], T0 + 9 * H);
    expect(f.mtbfH).toBeUndefined();
    expect(f.lo).toBeCloseTo(16 / 4.605, 2);
    expect(reliabilitySays({ event: 'failure' }, f).text).toContain('No failures in 8 h');
  });
  it('rough under five', () => {
    const f = reliability({ event: 'pick' }, [{ id: 'a', from: T0, to: T0 + H }], [ev(T0 + MIN), ev(T0 + 2 * MIN)], T0 + 2 * H);
    expect(f.enough).toBe('rough');
    expect(reliabilitySays({ event: 'pick' }, f).text).toContain('rough: 2 picks so far');
    expect(f.trend).toBeUndefined();
  });
  it('not watched, not set up', () => {
    expect(reliabilitySays(undefined, reliability(undefined)).verdict).toBe('Not set up');
    expect(reliabilitySays({ event: 'stop' }, reliability({ event: 'stop' })).verdict).toBe('Not watched yet');
  });
});

describe('the trend, Laplace', () => {
  const runs: WatchRun[] = [{ id: 'a', from: T0, to: T0 + 10 * H }];
  it('events bunched late: getting worse', () => {
    const late = [9.0, 9.2, 9.4, 9.6, 9.8, 9.9].map(h => ev(T0 + h * H));
    expect(reliability({ event: 'stop' }, runs, late, T0 + 11 * H).trend?.says).toBe('worse');
  });
  it('bunched early: getting better', () => {
    const early = [0.1, 0.2, 0.4, 0.6, 0.8, 1.0].map(h => ev(T0 + h * H));
    expect(reliability({ event: 'stop' }, runs, early, T0 + 11 * H).trend?.says).toBe('better');
  });
  it('spread evenly: steady, and regular gaps said so', () => {
    const even = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(h => ev(T0 + h * H));
    const f = reliability({ event: 'stop' }, runs, even, T0 + 11 * H);
    expect(f.trend?.says).toBe('steady');
    expect(f.gaps?.pattern).toBe('regular');
    expect(reliabilityInsights({ event: 'stop' }, f).map(x => x.text).join(' ')).toContain('fairly regularly');
  });
});

describe('against the MTBF wanted', () => {
  const runs: WatchRun[] = [{ id: 'a', from: T0, to: T0 + 20 * H }];
  const twenty = Array.from({ length: 20 }, (_, i) => ev(T0 + (i + 0.5) * H));
  it('met when the lower bound clears it', () => {
    expect(reliability({ event: 'stop', targetMin: 30 }, runs, twenty, T0 + 21 * H).verdict).toBe('met');
  });
  it('not yet sure either side', () => {
    expect(reliability({ event: 'stop', targetMin: 55 }, runs, twenty, T0 + 21 * H).verdict).toBe('met-unsure');
    expect(reliability({ event: 'stop', targetMin: 70 }, runs, twenty, T0 + 21 * H).verdict).toBe('short-unsure');
  });
  it('short when the upper bound is under it, said red', () => {
    const f = reliability({ event: 'stop', targetMin: 120 }, runs, twenty, T0 + 21 * H);
    expect(f.verdict).toBe('short');
    expect(reliabilitySays({ event: 'stop', targetMin: 120 }, f).tone).toBe('r');
  });
});

describe('what it costs — the one cost model', () => {
  const a: RelSubject = { event: 'stop', downMin: 3 };
  const f = reliability(a, [{ id: 'a', from: T0, to: T0 + 2 * H }], [ev(T0 + 30 * MIN), ev(T0 + 60 * MIN), ev(T0 + 90 * MIN), ev(T0 + 100 * MIN)], T0 + 3 * H);
  const line = { name: 'Line 7', crew: 4, labourRatePerHour: 12, labourBurden: 1.25, packsPerMin: 60, marginPerPack: 0.1,
    shifts: [{ id: 's1', name: 'Shift 1', start: '06:00', end: '14:00', breakMin: 30 }] };
  it('the minutes stood an hour, the crew’s time, the packs and their margin', () => {
    const c = relCost(f, a, line as never);
    expect(c.downMinPerH).toBeCloseTo(6, 6);
    expect(c.labourPerH).toBeCloseTo(4 * 12 * 1.25 * (6 / 60), 6);
    expect(c.packsPerH).toBeCloseTo(360, 6);
    expect(c.marginPerH).toBeCloseTo(36, 6);
    expect(costWords(c)).toContain('6 min stood an hour of running');
  });
  it('names what is missing, never guesses', () => {
    const c = relCost(f, { event: 'stop' });
    expect(c.downMinPerH).toBeUndefined();
    expect(c.missing.join(' ')).toContain('minutes the line stands for each stop');
    expect(c.missing.join(' ')).toContain('a line');
  });
});

describe('the lean page’s parts', () => {
  const a: RelSubject = { event: 'jam', targetMin: 30 };
  const runs: WatchRun[] = [{ id: 'd1', from: T0, to: T0 + 2 * H }, { id: 'd2', from: T0 + 24 * H, to: T0 + 26 * H }];
  const events = [10, 40, 70, 100].map(m => ev(T0 + m * MIN)).concat([20, 80].map(m => ev(T0 + 24 * H + m * MIN)));
  const f = reliability(a, runs, events, T0 + 27 * H);
  it('tiles: MTBF first with its bounds and since the day before', () => {
    const tiles = relTiles(a, f, relCost(f, a));
    expect(tiles.map(x => x.k)).toEqual(['MTBF', 'Failure rate', 'Watched', 'Jams', 'What it costs']);
    expect(tiles[0].v).toBe('40 min');
    expect(tiles[0].change?.dir).toBe('up');
    expect(tiles[4].v).toBe('—');
  });
  it('a trend once two days have events, and a closing line', () => {
    expect(relTrend(a, f)?.points.map(p => p.v)).toEqual([30, 60]);
    expect(relClosing(a, f, relCost(f, a), reliabilitySays(a, f)).text).toBe('One jam every 40 min of running, 1.5 an hour.');
  });
});

describe('a watch left on', () => {
  it('is asked about past a long shift, never before', () => {
    const runs: WatchRun[] = [{ id: 'a', from: T0 }];
    const evs = [ev(T0 + H), ev(T0 + 2 * H)];
    const on = reliability({ event: 'stop' }, runs, evs, T0 + 13 * H);
    expect(on.runningH).toBeCloseTo(13, 6);
    expect(reliabilityInsights({ event: 'stop' }, on).some(x => x.tone === 'a' && x.text.includes('if it was left on, stop it at the last stop'))).toBe(true);
    const short = reliability({ event: 'stop' }, runs, evs, T0 + 3 * H);
    expect(reliabilityInsights({ event: 'stop' }, short).some(x => x.text.includes('left on'))).toBe(false);
    expect(reliabilityInsights({ event: 'stop' }, reliability({ event: 'stop' }, runs, [], T0 + 14 * H))[0].text).toContain('left on');
  });
});

describe('before → after', () => {
  const watch = (h: number): WatchRun[] => [{ id: 'w', from: T0, to: T0 + h * H }];
  const every = (h: number, n: number) => Array.from({ length: n }, (_, i) => ev(T0 + (i + 0.5) * (h / n) * H));
  it('longer, sure only when the bounds part', () => {
    const before = reliability({ event: 'stop' }, watch(10), every(10, 30), T0 + 11 * H);   // 20 min
    const after = reliability({ event: 'stop' }, watch(10), every(10, 6), T0 + 11 * H);     // 100 min
    const c = compareReliability(before, after, 'stop');
    expect(c.tone).toBe('g');
    expect(c.text).toMatch(/^MTBF 20 min → 100 min — longer between stops/);
  });
  it('not yet sure while they overlap', () => {
    const before = reliability({ event: 'stop' }, watch(2), every(2, 4), T0 + 3 * H);
    const after = reliability({ event: 'stop' }, watch(2), every(2, 3), T0 + 3 * H);
    expect(compareReliability(before, after, 'stop')).toMatchObject({ tone: 'n' });
    expect(compareReliability(before, after, 'stop').text).toContain('not yet sure');
  });
  it('shorter, said red', () => {
    const before = reliability({ event: 'jam' }, watch(10), every(10, 5), T0 + 11 * H);
    const after = reliability({ event: 'jam' }, watch(10), every(10, 40), T0 + 11 * H);
    expect(compareReliability(before, after, 'jam').tone).toBe('r');
  });
});

describe('several things counted at once (22 October)', () => {
  const a: AgreedReliability = { counts: [
    { id: 's', name: 'stop', targetMin: 30, downMin: 2 },
    { id: 'f', name: 'failure', targetMin: 120 },
    { id: 'b', name: 'bottle down' },
    { id: 'x', name: 'alarm', removed: true },
  ] };
  const runs: WatchRun[] = [{ id: 'w', from: T0, to: T0 + 2 * H }];
  const events: RelEvent[] = [
    ...[10, 30, 50, 70, 90, 110].map(m => ev(T0 + m * MIN, { count: 's' })),
    ev(T0 + 60 * MIN, { count: 'f' }),
    ev(T0 + 20 * MIN, { count: 'b' }), ev(T0 + 80 * MIN, { count: 'b' }),
    ev(T0 + 40 * MIN, { count: 'x' }),
  ];
  it('each thing counted is its own, on the one watch', () => {
    expect(countersOf(a).map(c => c.event)).toEqual(['stop', 'failure', 'bottle down']);
    expect(countersOf(a, true).map(c => c.id)).toEqual(['s', 'f', 'b', 'x']);
    const items = relAll(a, runs, events, T0 + 3 * H);
    expect(items.map(i => [i.c.event, i.f.n, i.f.hours])).toEqual([['stop', 6, 2], ['failure', 1, 2], ['bottle down', 2, 2]]);
    expect(items[0].f.mtbfH).toBeCloseTo(20 / 60, 9);
    expect(items[2].f.mtbfH).toBeCloseTo(1, 9);
    /* each against its own target */
    expect(items[0].f.verdict).toBeDefined();
    expect(items[2].f.verdict).toBeUndefined();
  });
  it('the study said for every count: each MTBF in a line, the most abnormal tone, each sentence', () => {
    const said = studyReliabilitySays(a, runs, events, T0 + 3 * H);
    expect(said.verdict).toBe('Stops 20 min · Failures 2 h · Bottle downs 60 min');
    expect(said.text).toContain('6 stops in 2 h');
    expect(said.text).toContain('1 failure in 2 h');
    expect(said.text).toContain('2 bottle downs in 2 h');
  });
  it('counted side by side, a row each', () => {
    const rows = relRows(relAll(a, runs, events, T0 + 3 * H));
    expect(rows.map(r => [r.title, r.n, r.mtbf])).toEqual([['Stops', 6, '20 min'], ['Failures', 1, '2 h'], ['Bottle downs', 2, '60 min']]);
    expect(rows[2].against).toBe('no target');
  });
  it('the closing line names each count in turn', () => {
    const c = relClosings(relAll(a, runs, events, T0 + 3 * H));
    expect(c.text).toMatch(/^Stops: one stop every 20 min of running, 3 an hour; Failures: one failure every 2 h/);
  });
  it('a study set up before then is one count, its taps the first count’s', () => {
    const old: AgreedReliability = { event: 'stop', kinds: ['jam'], targetMin: 45, downMin: 3 };
    expect(countersOf(old)).toEqual([{ id: FIRST_COUNT, event: 'stop', targetMin: 45, downMin: 3 }]);
    const evs = [ev(T0 + MIN, { kind: 'jam' }), ev(T0 + 2 * MIN)];
    expect(eventsOf(evs, FIRST_COUNT, FIRST_COUNT)).toHaveLength(2);
    const [one] = relAll(old, runs, evs, T0 + 3 * H);
    expect(one.f.n).toBe(2);
    expect(one.f.kinds.map(k => k.kind)).toEqual(['jam', 'not said']);
    expect(studyReliabilitySays(old, runs, evs, T0 + 3 * H).verdict).toMatch(/^MTBF 60 min/);
  });
  it('re-saved as counts, the first keeps the old taps', () => {
    const resaved: AgreedReliability = { counts: [{ id: FIRST_COUNT, name: 'stop' }, { id: 'f', name: 'failure' }] };
    const evs = [ev(T0 + MIN), ev(T0 + 2 * MIN, { count: 'f' })];
    expect(relAll(resaved, runs, evs, T0 + 3 * H).map(i => i.f.n)).toEqual([1, 1]);
  });
});

describe('words', () => {
  it('plurals and spans', () => {
    expect([plural('stop'), plural('batch'), plural('delay'), plural('fly'), plural('stop', 1)]).toEqual(['stops', 'batches', 'delays', 'flies', 'stop']);
    expect([span(0.005), span(0.6), span(2.5), span(30)]).toEqual(['18 s', '36 min', '2.5 h', '30 h']);
  });
});
