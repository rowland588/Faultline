import { describe, expect, it } from 'vitest';
import {
  callFigures, callInsights, callsByShift, callSays, callTiles, fitterCost, fitterWords, medianRank, parseDuration, percentile, repairFigures, repairInsights, repairSays, repairTiles, shiftAt, stopsOf, type TimedStop,
} from '../repair';
import { relAll, relCost, runningSpans } from '../reliability';
import type { AgreedReliability, RelEvent, WatchRun } from '../../../lib/study';

const MIN = 60_000, H = 3_600_000;
const T0 = new Date(2026, 9, 20, 8, 0, 0).getTime();

/* The independent numbers are scripts/knowledge/cases-w5.py's (NumPy percentile, SciPy binom): twelve timed stops,
   called → running again 2, 3.5, 1.5, 5, 4, 2.5, 21, 4, 2, 9, 3, 7.5 min, help after 0.5, 1, 0.5, 2, 1.5, 0.5, 6, 1, 0.5, 3, 1, 2.5. */
const FIXED = [2.0, 3.5, 1.5, 5.0, 4.0, 2.5, 21.0, 4.0, 2.0, 9.0, 3.0, 7.5];
const ARRIVE = [0.5, 1.0, 0.5, 2.0, 1.5, 0.5, 6.0, 1.0, 0.5, 3.0, 1.0, 2.5];
const stops = (est = false): TimedStop[] => FIXED.map((m, i) => ({ id: `s${i}`, at: T0 + i * 10 * MIN, arrivedAt: T0 + i * 10 * MIN + ARRIVE[i] * MIN, fixedAt: T0 + i * 10 * MIN + m * MIN, ...(est && i < 3 ? { est: true } : {}), open: false }));
/* 14 stops in 5.6 running hours: MTBF 24 min, 2.5 an hour; the MTBF's 90% bounds as the study would say them */
const BASIS = { n: 14, hours: 5.6, rate: 2.5, mtbfH: 0.4, lo: 0.4 * 0.7, hi: 0.4 * 1.5 };

describe('a time said (FC-059)', () => {
  it('parses what a person says: seconds, minutes, m:ss, hours, a bare number of minutes', () => {
    expect(parseDuration('40 s')).toBe(40_000);
    expect(parseDuration('90 sec')).toBe(90_000);
    expect(parseDuration('1.5 min')).toBe(90_000);
    expect(parseDuration('1,5 min')).toBe(90_000);
    expect(parseDuration('1:30')).toBe(90_000);
    expect(parseDuration('2')).toBe(120_000);
    expect(parseDuration('2 h')).toBe(7_200_000);
    expect(parseDuration('  3 minutes ')).toBe(180_000);
  });
  it('refuses what is not one, under a second, over a day, a bad m:ss', () => {
    for (const bad of ['', 'abc', '0', '0 s', '1500 min', '25 h', '1:75', '-3', '12 parsecs']) expect(parseDuration(bad), bad).toBeUndefined();
  });
});

describe('the figures of twelve timed stops', () => {
  const r = repairFigures(stops(), BASIS, T0 + 24 * H);

  it('1 — n, mean, median, the 90th percentile and the longest are NumPy’s', () => {
    expect(r.timed).toBe(12);
    expect(r.meanMin).toBeCloseTo(5.4167, 4);
    expect(r.medianMin).toBeCloseTo(3.75, 6);
    expect(r.p90Min).toBeCloseTo(8.85, 6);
    expect(r.maxMin).toBe(21);
    expect(r.enough).toBe('enough');
  });

  it('2 — the median’s exact 90% interval is the 3rd and 10th smallest; n = 5, 4 and 20', () => {
    expect(r.medianLo).toBe(2.0);
    expect(r.medianHi).toBe(7.5);
    expect(medianRank(5)).toBe(1);
    expect(medianRank(4)).toBe(0);
    expect(medianRank(3)).toBe(0);
    expect(medianRank(6)).toBe(1);
    expect(medianRank(8)).toBe(2);
    expect(medianRank(10)).toBe(2);
    expect(medianRank(20)).toBe(6);
  });

  it('3 — waiting and fixing apart: medians 1.0 and 2.5, waiting 30.77% of the time', () => {
    expect(r.helped).toBe(12);
    expect(r.waitMedianMin).toBeCloseTo(1.0, 6);
    expect(r.fixMedianMin).toBeCloseTo(2.5, 6);
    expect(r.waitMeanMin).toBeCloseTo(1.6667, 4);
    expect(r.fixMeanMin).toBeCloseTo(3.75, 6);
    expect(r.waitShare).toBeCloseTo(0.3077, 4);
  });

  it('4 — availability from the MTBF: 0.8159, halved 0.8986; 13.54 min lost an hour, 6.77 given back', () => {
    expect(r.availability).toBeCloseTo(0.8159, 4);
    expect(r.availHalf).toBeCloseTo(0.8986, 4);
    expect(r.lostMinPerH).toBeCloseTo(13.5417, 4);
    expect(r.halfBackMinPerH).toBeCloseTo(6.7708, 4);
    expect(r.availLo).toBeCloseTo(0.28 / (0.28 + 5.4167 / 60), 4);
    expect(r.availHi).toBeCloseTo(0.6 / (0.6 + 5.4167 / 60), 4);
  });

  it('5 — a fitter at £30 an hour on the 3.75 min of fixing: £1.875 a repair, £4.6875 an hour of running', () => {
    const c = fitterCost(r, BASIS.rate, 30);
    expect(c?.basis).toBe('fixing');
    expect(c?.perRepair).toBeCloseTo(1.875, 6);
    expect(c?.perHour).toBeCloseTo(4.6875, 6);
    expect(fitterWords(c)).toContain('£1.88 a repair, £4.69 an hour of running');
    expect(fitterCost(r, BASIS.rate, undefined)?.missing).toBe('Give a fitter’s rate to say the repairs in money');
    expect(fitterWords(fitterCost(r, BASIS.rate, undefined))).toContain('Give a fitter’s rate to say the repairs in money');
  });

  it('without a help stamp the whole time is the fitter’s, and it says so', () => {
    const plain = stops().map(s => ({ ...s, arrivedAt: undefined }));
    const rr = repairFigures(plain, BASIS, T0 + 24 * H);
    expect(rr.helped).toBe(0);
    const c = fitterCost(rr, BASIS.rate, 30);
    expect(c?.basis).toBe('whole');
    expect(c?.perRepair).toBeCloseTo((5.4167 / 60) * 30, 3);
    expect(fitterWords(c)).toContain('the whole time counted as the fitter’s');
  });

  it('percentile is the linear one', () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(percentile([5], 0.9)).toBe(5);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9)).toBeCloseTo(9.1, 9);
  });

  it('the money: the measured mean replaces the typed minutes from 3 timed — labour £13.54, 812.5 packs, £81.25', () => {
    const f = { hours: 5.6, rate: 2.5, n: 14 } as Parameters<typeof relCost>[0];
    const line = { name: 'L', crew: 4, labourRatePerHour: 12, labourBurden: 1.25, packsPerMin: 60, marginPerPack: 0.1, shifts: [] };
    const c = relCost(f, { event: 'stop', downMin: 3, measuredMin: r.meanMin, measuredN: r.timed }, line, undefined);
    expect(c.downMinPerH).toBeCloseTo(13.5417, 4);
    expect(c.labourPerH).toBeCloseTo(13.5417, 4);
    expect(c.packsPerH).toBeCloseTo(812.5, 3);
    expect(c.contributionPerH).toBeCloseTo(81.25, 3);
    expect(c.basis).toBe('measured');
    /* two timed are too few: the typed minutes stand */
    expect(relCost(f, { event: 'stop', downMin: 3, measuredMin: 9, measuredN: 2 }, line, undefined).downEachMin).toBe(3);
    /* nothing typed and nothing timed: the minutes asked, as before */
    expect(relCost(f, { event: 'stop' }, line, undefined).missing[0]).toContain('minutes the line stands');
  });
});

describe('boundaries', () => {
  it('one timed stop: its length, rough, no interval, no 90th', () => {
    const r = repairFigures(stops().slice(0, 1), { ...BASIS, n: 1 }, T0 + 24 * H);
    expect(r.timed).toBe(1);
    expect(r.enough).toBe('rough');
    expect(r.medianLo).toBeUndefined();
    expect(r.p90Min).toBeUndefined();
    expect(repairSays('stop', { n: 1, mtbfH: 0.4 }, r).text).toContain('rough: 1 timed so far, 5 before it is said firmly');
  });
  it('4 timed: no interval; 5: one; 9: no 90th; 10: a 90th', () => {
    expect(repairFigures(stops().slice(0, 4), BASIS, T0).medianLo).toBeUndefined();
    expect(repairFigures(stops().slice(0, 5), BASIS, T0).medianLo).toBeDefined();
    expect(repairFigures(stops().slice(0, 9), BASIS, T0).p90Min).toBeUndefined();
    expect(repairFigures(stops().slice(0, 10), BASIS, T0).p90Min).toBeDefined();
  });
  it('none timed: asks for the stamp; one open: not yet cleared, stale after 4 hours', () => {
    const none = repairFigures([], BASIS, T0);
    expect(repairSays('stop', { n: 3, mtbfH: 0.4 }, none).text).toContain('None of the 3 stops is timed yet');
    const open: TimedStop = { id: 'o', at: T0, open: true };
    const fresh = repairFigures([open], BASIS, T0 + 10 * MIN);
    expect(fresh.open).toBe(1);
    expect(fresh.stale).toBe(0);
    expect(repairSays('stop', { n: 1 }, fresh).text).toContain('1 stop not yet cleared');
    const old = repairFigures([open], BASIS, T0 + 5 * H);
    expect(old.stale).toBe(1);
    expect(repairSays('stop', { n: 1 }, old).tone).toBe('a');
    expect(repairInsights('stop', { n: 1 }, old).some(i => i.tone === 'a' && /open for more than 4 hours/.test(i.text))).toBe(true);
  });
  it('equal times: median = mean = every one', () => {
    const eq = [1, 2, 3, 4, 5, 6].map(i => ({ id: `e${i}`, at: T0 + i * MIN, fixedAt: T0 + i * MIN + 3 * MIN, open: false }));
    const r = repairFigures(eq, BASIS, T0 + H);
    expect(r.medianMin).toBe(3); expect(r.meanMin).toBe(3); expect(r.maxMin).toBe(3);
    expect(repairInsights('stop', { n: 6 }, r).some(i => /A few long ones/.test(i.text))).toBe(false);
  });
  it('a stamp before the tap, or out of order, is not read', () => {
    const [a, b] = stopsOf([
      { id: 'a', at: T0, fixedAt: T0 - MIN },
      { id: 'b', at: T0, arrivedAt: T0 + 5 * MIN, fixedAt: T0 + 3 * MIN },
    ]);
    expect(a.open).toBe(true); expect(a.fixedAt).toBeUndefined();
    expect(b.fixedAt).toBe(T0 + 3 * MIN); expect(b.arrivedAt).toBeUndefined();
  });
  it('a few long ones pull the mean — said at a quarter above the median; times said not clocked are counted', () => {
    const r = repairFigures(stops(true), BASIS, T0 + 24 * H);
    const ins = repairInsights('stop', BASIS, r).map(i => i.text);
    expect(ins.some(t => t.includes('A few long ones pull the mean (5.4 min) above the typical (3.8 min)'))).toBe(true);
    expect(ins.some(t => t.includes('3 of the 12 times were said, not clocked'))).toBe(true);
    expect(ins.some(t => t.includes('Waiting for help is 31% of the time'))).toBe(true);
  });
  it('words: the sentence and the two tiles', () => {
    const r = repairFigures(stops(), BASIS, T0 + 24 * H);
    const t = repairSays('stop', BASIS, r).text;
    expect(t).toContain('12 of 14 stops timed: typically 3.8 min (90% sure 2 min–7.5 min) to clear (mean 5.4 min, 1 in 10 over 8.9 min, longest 21 min).');
    expect(t).toContain('Available 82% of the time — MTBF 24 min ÷ (MTBF + 5.4 min to repair).');
    expect(t).toContain('Halving the repair time would make it 90% and give back 6.8 min of every hour of running.');
    expect(repairTiles('stop', BASIS, r).map(x => [x.k, x.v])).toEqual([['Repair time', '3.8 min'], ['Available', '82%']]);
    expect(repairTiles('stop', BASIS, repairFigures([], BASIS, T0)).map(x => x.v)).toEqual(['—', '—']);
  });
});

/* fourteen calls: reason, minutes to help, minutes to running again (cases-w5.py) */
const CALLS: [string, number, number][] = [['film change', 1.0, 6.0], ['film change', 2.0, 7.0], ['film change', 1.5, 8.0], ['film change', 3.0, 9.5], ['jam', 0.5, 2.0], ['jam', 1.0, 3.0], ['jam', 4.0, 6.0],
  ['QA check', 5.0, 9.0], ['QA check', 11.0, 14.0], ['label', 2.5, 6.5], ['film change', 1.0, 5.0], ['jam', 0.5, 1.5], ['label', 3.5, 8.0], ['material short', 9.0, 19.0]];
const callStops = (): TimedStop[] => CALLS.map(([reason, a, z], i) => ({ id: `c${i}`, at: T0 + i * 20 * MIN, arrivedAt: T0 + i * 20 * MIN + a * MIN, fixedAt: T0 + i * 20 * MIN + z * MIN, reason, open: false }));

describe('andon calls (FC-015)', () => {
  const k = callFigures(callStops(), 3, T0 + 24 * H);
  it('1 — response and resolution: medians, the 90th, the slowest', () => {
    expect(k.calls).toBe(14);
    expect(k.respMedianMin).toBeCloseTo(2.25, 6);
    expect(k.respMeanMin).toBeCloseTo(3.25, 6);
    expect(k.respP90Min).toBeCloseTo(7.8, 6);
    expect(k.respMaxMin).toBe(11);
    expect(k.resMedianMin).toBeCloseTo(6.75, 6);
    expect(k.resP90Min).toBeCloseTo(12.65, 6);
  });
  it('2 — within 3 minutes: 9 of 14', () => {
    expect(k.within).toBe(9);
    expect(k.shareWithin).toBeCloseTo(0.6429, 4);
  });
  it('3 — the waiting in all is 45.5 min, the clearing 104.5', () => {
    expect(k.waitTotalMin).toBeCloseTo(45.5, 6);
    expect(k.clearTotalMin).toBeCloseTo(104.5, 6);
  });
  it('4 — the reasons ranked by the minutes waited, not by how many: QA first, film change (the most) third', () => {
    expect(k.reasons.map(r => [r.reason, r.n, +r.waitMin.toFixed(2), +r.clearMin.toFixed(2)])).toEqual([
      ['QA check', 2, 16, 23], ['material short', 1, 9, 19], ['film change', 5, 8.5, 35.5], ['jam', 4, 6, 12.5], ['label', 2, 6, 14.5]]);
    expect(k.topWaiting?.reason).toBe('QA check');
    expect(k.mostFrequent?.reason).toBe('film change');
    const ins = callInsights('call', k, true).map(i => i.text);
    expect(ins[0]).toContain('The most waited for is QA check (2 calls, 16 min); the most frequent is film change (5, 8.5 min). The biggest total, not the most frequent, is first.');
    expect(ins.some(t => t.includes('9 of 14 answered calls had help within 3 min (64%)'))).toBe(true);
  });
  it('5 — over 8 running hours, 13.06 min stood an hour of running, £13.06 an hour at £60/h', () => {
    const f = { hours: 8, rate: 14 / 8, n: 14 } as Parameters<typeof relCost>[0];
    const line = { name: 'L', crew: 4, labourRatePerHour: 12, labourBurden: 1.25, packsPerMin: 60, marginPerPack: 0.1, shifts: [] };
    const c = relCost(f, { event: 'call', measuredMin: k.resMeanMin, measuredN: k.cleared }, line, undefined);
    expect(c.downMinPerH).toBeCloseTo(13.0625, 4);
    expect(c.labourPerH).toBeCloseTo(13.0625, 4);
  });
  it('the sentence names no person and says it is counted by reason and by shift', () => {
    const t = callSays('call', k).text;
    expect(t).toContain('14 calls: help came in 2.3 min typically, 1 in 10 over 7.8 min; the line ran again in 6.8 min typically, 1 in 10 over 13 min.');
    expect(t).toContain('46 min waited in all — QA check, 2 calls, is 16 min of it.');
    expect(t).toContain('9 of 14 answered within the 3 min wanted.');
    expect(callInsights('call', k, true).some(i => i.text === 'Calls are counted by reason and by shift, never by person.')).toBe(true);
    expect(callTiles('call', k).map(x => [x.k, x.v])).toEqual([['Help in', '2.3 min'], ['Cleared in', '6.8 min']]);
  });
  it('under 10 calls the slowest stands in for the 90th; none answered asks for the stamp; no reason listed is said', () => {
    const few = callFigures(callStops().slice(0, 9), undefined, T0 + H);
    expect(few.respP90Min).toBeUndefined();
    expect(callSays('call', few).text).toContain('slowest');
    expect(callInsights('call', few, false).some(i => /List the reasons/.test(i.text))).toBe(true);
    expect(callSays('call', callFigures([{ id: 'x', at: T0, open: true }], 3, T0 + MIN)).text).toContain('none with help arrived stamped yet');
    expect(callSays('call', callFigures([], undefined, T0)).text).toContain('No calls yet');
  });
  it('a call without a reason is “not said”', () => {
    const s = callStops().slice(0, 2).map(x => ({ ...x, reason: undefined }));
    expect(callFigures(s, undefined, T0).reasons[0].reason).toBe('not said');
  });
});

describe('calls by shift', () => {
  const shifts = [{ name: 'Days', start: '06:00', end: '14:00' }, { name: 'Lates', start: '14:00', end: '22:00' }, { name: 'Nights', start: '22:00', end: '06:00' }];
  it('a moment’s time of day falls in one shift, overnight included', () => {
    expect(shiftAt(shifts, new Date(2026, 9, 20, 7, 0).getTime())).toBe('Days');
    expect(shiftAt(shifts, new Date(2026, 9, 20, 14, 0).getTime())).toBe('Lates');
    expect(shiftAt(shifts, new Date(2026, 9, 20, 23, 30).getTime())).toBe('Nights');
    expect(shiftAt(shifts, new Date(2026, 9, 21, 2, 0).getTime())).toBe('Nights');
    expect(shiftAt([{ start: '06:00', end: '14:00' }], new Date(2026, 9, 20, 20, 0).getTime())).toBeUndefined();
  });
  it('rows in the line’s order, the median only from 3 answered; none for fewer than two shifts', () => {
    const at = (h: number, m = 0, resp?: number): TimedStop => ({ id: `${h}${m}${resp}`, at: new Date(2026, 9, 20, h, m).getTime(), ...(resp !== undefined ? { arrivedAt: new Date(2026, 9, 20, h, m).getTime() + resp * MIN, fixedAt: new Date(2026, 9, 20, h, m).getTime() + (resp + 2) * MIN } : {}), open: resp === undefined });
    const rows = callsByShift([at(7, 0, 1), at(8, 0, 2), at(9, 0, 3), at(15, 0, 4), at(23, 0, 5), at(23, 30)], shifts);
    expect(rows).toEqual([{ name: 'Days', calls: 3, answered: 3, respMedianMin: 2 }, { name: 'Lates', calls: 1, answered: 1 }, { name: 'Nights', calls: 2, answered: 1 }]);
    expect(callsByShift([at(7, 0, 1)], [shifts[0]])).toEqual([]);
    expect(callsByShift([at(7, 0, 1)], undefined)).toEqual([]);
  });
});

describe('the running time is the watch less the stops’ minutes (FC-059)', () => {
  it('6 — a 2 h watch with two 6 min stops inside is 1.8 h', () => {
    const sp: [number, number][] = [[T0, T0 + 2 * H]];
    const out = runningSpans(sp, [[T0 + 10 * MIN, T0 + 16 * MIN], [T0 + 60 * MIN, T0 + 66 * MIN]]);
    expect(out.reduce((s, [a, b]) => s + (b - a), 0) / H).toBeCloseTo(1.8, 9);
    expect(out.length).toBe(3);
  });
  it('overlapping stops count once; a stop outside the watch takes nothing; one over the end is cut', () => {
    const sp: [number, number][] = [[T0, T0 + H]];
    expect(runningSpans(sp, [[T0 + 10 * MIN, T0 + 30 * MIN], [T0 + 20 * MIN, T0 + 40 * MIN]]).reduce((s, [a, b]) => s + (b - a), 0)).toBe(30 * MIN);
    expect(runningSpans(sp, [[T0 + 2 * H, T0 + 3 * H]]).reduce((s, [a, b]) => s + (b - a), 0)).toBe(H);
    expect(runningSpans(sp, [[T0 + 50 * MIN, T0 + 3 * H]]).reduce((s, [a, b]) => s + (b - a), 0)).toBe(50 * MIN);
    expect(runningSpans(sp, [])).toEqual(sp);
  });

  const stopId = 'stop', failId = 'fail';
  const agreed: AgreedReliability = { counts: [{ id: stopId, name: 'stop', timed: 'stop', targetMin: 30, fitterRate: 30 }, { id: failId, name: 'failure' }] };
  const runs: WatchRun[] = [{ id: 'w', from: T0, to: T0 + 2 * H }];
  const events: RelEvent[] = [
    { id: 'a', at: T0 + 10 * MIN, count: stopId, arrivedAt: T0 + 12 * MIN, fixedAt: T0 + 16 * MIN },
    { id: 'b', at: T0 + 60 * MIN, count: stopId, fixedAt: T0 + 66 * MIN },
    { id: 'c', at: T0 + 90 * MIN, count: failId },
  ];
  it('every count’s MTBF is of the running time; the untimed count too', () => {
    const items = relAll(agreed, runs, events, T0 + 3 * H);
    expect(items[0].f.hours).toBeCloseTo(1.8, 9);
    expect(items[1].f.hours).toBeCloseTo(1.8, 9);
    expect(items[0].f.watchedH).toBeCloseTo(2, 9);
    expect(items[0].f.downH).toBeCloseTo(0.2, 9);
    expect(items[0].f.mtbfH).toBeCloseTo(0.9, 9);
    expect(items[1].f.mtbfH).toBeCloseTo(1.8, 9);
    /* the failure at 90 min of the wall clock: two 6 min stops had stood the machine by then, so 78 min of running */
    expect(items[1].f.points[0].h).toBeCloseTo(78 / 60, 9);
  });
  it('the timed count carries its repair figures and the measured minutes only from 3 timed', () => {
    const [stop] = relAll(agreed, runs, events, T0 + 3 * H);
    expect(stop.r?.timed).toBe(2);
    expect(stop.r?.meanMin).toBe(6);
    expect(stop.c.measuredMin).toBe(6);
    expect(stop.c.measuredN).toBe(2);
  });
  it('a study with no timed count is exactly as it was', () => {
    const plain: AgreedReliability = { counts: [{ id: stopId, name: 'stop' }] };
    const [one] = relAll(plain, runs, events, T0 + 3 * H);
    expect(one.f.hours).toBe(2);
    expect(one.f.downH).toBeUndefined();
    expect(one.r).toBeUndefined();
    expect(one.stops).toBeUndefined();
  });
  it('a stop still open is down until now, inside the watch only', () => {
    const open: RelEvent[] = [{ id: 'o', at: T0 + 60 * MIN, count: stopId }];
    const [still] = relAll(agreed, runs, open, T0 + 90 * MIN);
    /* the watch ended at 120 min, “now” is 90 min: down from 60 to 90 */
    expect(still.f.hours).toBeCloseTo(1.5, 9);
    const [later] = relAll(agreed, runs, open, T0 + 5 * H);
    expect(later.f.hours).toBeCloseTo(1, 9);
  });
});
