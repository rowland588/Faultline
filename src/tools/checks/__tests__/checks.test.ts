/* THE CHECK LOG'S ARITHMETIC against independent cases (scripts/knowledge/cases-checks.py — the schedule walked a
 * minute at a time, scipy's quantiles, the knowledge records' own worked cases). The numbers below are the
 * script's, written to cases.json; none is the module's own output. */
import { describe, expect, it } from 'vitest';
import cases from './cases.json';
import { checkProblem, checkState, cleanBound, complianceOf, failuresOf, freqWords, graceOf, intervalOf, valueTrend, valueSays, verdictOf, when, span, MIN, HOUR, DAY } from '../checks';
import type { LogCheck, LogResult } from '../../../lib/study';

const chk = (over: Partial<LogCheck> = {}): LogCheck => ({ id: 'c', name: 'Check', when: { every: 60, unit: 'min' }, kind: 'passfail', ...over });
const res = (at: number, over: Partial<LogResult> = {}): LogResult => ({ id: `r${at}`, checkId: 'c', at: at * MIN, outcome: 'pass', ...over });

describe('the interval and the grace', () => {
  it('reads every N minutes, hours, shifts, days and weeks; an event has none', () => {
    expect(intervalOf({ every: 30, unit: 'min' })).toBe(30 * MIN);
    expect(intervalOf({ every: 2, unit: 'hour' })).toBe(2 * HOUR);
    expect(intervalOf({ every: 1, unit: 'shift' })).toBe(8 * HOUR);
    expect(intervalOf({ every: 1, unit: 'shift' }, 12)).toBe(12 * HOUR);
    expect(intervalOf({ every: 1, unit: 'day' })).toBe(DAY);
    expect(intervalOf({ every: 1, unit: 'week' })).toBe(7 * DAY);
    expect(intervalOf({ when: 'startup' })).toBeUndefined();
    expect(intervalOf({ every: 0, unit: 'min' })).toBeUndefined();
  });
  it('is a quarter of the interval, at least five minutes, at most twelve hours (the cases script’s rule)', () => {
    expect(graceOf(10 * MIN)).toBe(5 * MIN);
    expect(graceOf(60 * MIN)).toBe(15 * MIN);
    expect(graceOf(8 * HOUR)).toBe(2 * HOUR);
    expect(graceOf(7 * DAY)).toBe(12 * HOUR);
  });
  it('says a frequency in words', () => {
    expect(freqWords({ every: 1, unit: 'hour' })).toBe('every hour');
    expect(freqWords({ every: 30, unit: 'min' })).toBe('every 30 minutes');
    expect(freqWords({ every: 1, unit: 'shift' })).toBe('every shift');
    expect(freqWords({ when: 'startup' })).toBe('at start-up');
    expect(freqWords({ when: 'changeover' })).toBe('after a changeover');
    expect(freqWords({ when: 'trigger', note: 'the run ends' })).toBe('when the run ends');
  });
  it('says a length of time and a moment', () => {
    expect(span(35 * MIN)).toBe('35 min');
    expect(span(65 * MIN)).toBe('1 h 5 min');
    expect(span(3 * DAY)).toBe('3 days');
    const ref = new Date(2026, 9, 14, 12, 0).getTime();
    expect(when(new Date(2026, 9, 14, 9, 10).getTime(), ref)).toBe('09:10');
    expect(when(new Date(2026, 9, 13, 9, 10).getTime(), ref)).toBe('yesterday 09:10');
  });
});

describe('the state of a check now, against the cases script', () => {
  it.each(cases.states)('last $last, now $now, every $interval min, bad $bad → $expect', c => {
    const check = chk({ when: { every: c.interval, unit: 'min' } });
    const results = c.last === null ? [] : [res(c.last, c.bad ? { outcome: 'fail' } : {})];
    const s = checkState(check, { since: c.since * MIN }, results, c.now * MIN);
    expect(s.key).toBe(c.expect);
  });
  it('colours them as the house does: done green, soon and due amber, overdue and failed red, an event grey', () => {
    const log = { since: 0 };
    expect(checkState(chk(), log, [res(0)], 10 * MIN).tone).toBe('g');
    expect(checkState(chk(), log, [res(0)], 50 * MIN).tone).toBe('a');
    expect(checkState(chk(), log, [res(0)], 61 * MIN).tone).toBe('a');
    expect(checkState(chk(), log, [res(0)], 90 * MIN).tone).toBe('r');
    expect(checkState(chk(), log, [res(0, { outcome: 'fail' })], 10 * MIN).tone).toBe('r');
    expect(checkState(chk({ when: { when: 'startup' } }), log, [], 10 * MIN)).toMatchObject({ key: 'event', tone: 'n' });
    expect(checkState(chk({ removed: true }), log, [], 10 * MIN)).toMatchObject({ key: 'off', tone: 'n' });
  });
  it('a struck result counts for nothing: the check is still due', () => {
    const s = checkState(chk(), { since: 0 }, [res(0, { struck: true })], 90 * MIN);
    expect(s.key).toBe('overdue');
    expect(s.last).toBeUndefined();
  });
  it('an event check that failed is failed until one passes, and is never overdue', () => {
    const ev = chk({ when: { when: 'changeover' } });
    expect(checkState(ev, { since: 0 }, [res(5, { outcome: 'fail' })], 10_000 * MIN).key).toBe('failed');
    expect(checkState(ev, { since: 0 }, [res(5, { outcome: 'fail' }), res(9)], 10_000 * MIN).key).toBe('event');
  });
});

describe('compliance, against the schedule walked a minute at a time', () => {
  it.each(cases.compliance.map((c, i) => [i, c] as const))('case %i', (_i, c) => {
    const check = chk({ when: { every: c.interval, unit: 'min' } });
    const got = complianceOf(check, { since: c.since * MIN }, c.results.map(m => res(m)), c.frm * MIN, c.to * MIN);
    expect({ expected: got.expected, onTime: got.onTime, missed: got.missed }).toEqual(c.expect);
  });
  it('the hand-worked case: hourly from 08:00, done at 5, 63, 121 and 250 minutes, looked at after 300 → 5 due, 4 on time, 1 missed, 80%', () => {
    const got = complianceOf(chk(), { since: 0 }, [5, 63, 121, 250].map(m => res(m)), 0, 300 * MIN);
    expect(got).toMatchObject({ expected: 5, onTime: 4, missed: 1, pct: 80 });
    expect(got.longestGapMin).toBe(129);
  });
  it('an event check has no due moments, and nothing is expected of a check taken off', () => {
    expect(complianceOf(chk({ when: { when: 'startup' } }), { since: 0 }, [res(5)], 0, 100 * MIN)).toEqual({ expected: 0, onTime: 0, missed: 0 });
    expect(complianceOf(chk({ removed: true }), { since: 0 }, [], 0, 100 * MIN).expected).toBe(0);
  });
  it('a check added later is due from when it was added: at 120 and again at 180, both missed by 200', () => {
    const got = complianceOf(chk({ addedAt: 120 * MIN }), { since: 0 }, [], 0, 200 * MIN);
    expect(got).toMatchObject({ expected: 2, missed: 2 });
  });
  it('a result done early meets the due moment it is early for, and the schedule follows the floor', () => {
    const got = complianceOf(chk(), { since: 0 }, [0, 30, 60, 90].map(m => res(m)), 0, 100 * MIN);
    expect(got).toMatchObject({ expected: 4, onTime: 4, missed: 0 });
  });
});

describe('what a failure holds', () => {
  const h = cases.hold;
  it('is the minutes since the last good check — the knowledge record’s run: good at 10:00, failed at 11:00, 110 a minute = 6,600', () => {
    const [f] = failuresOf(chk(), { since: 0 }, [res(h.lastGood), res(h.failedAt, { outcome: 'fail' })]);
    expect(f.windowMin).toBe(h.windowMin);
    expect(f.windowMin * h.ratePerMin).toBe(h.packs);
    expect(f.noGoodYet).toBe(false);
  });
  it('a re-test that fails again continues the failure and holds nothing more; a later good check ends the run', () => {
    const results = cases.runs.seq.map(([kind, t]) => res(t as number, kind === 'fail' ? { outcome: 'fail' } : {}));
    const got = failuresOf(chk(), { since: 0 }, results);
    expect(got.map(f => [f.result.at / MIN, f.windowMin])).toEqual(cases.runs.runs.map(r => [r.at, r.windowMin]));
    expect(got[1].continues).toBe(got[0].result.id);
    expect(got[2].continues).toBeUndefined();
  });
  it('with no good check yet, the window runs from the start of the log, and says so', () => {
    const [f] = failuresOf(chk(), { since: 10 * MIN }, [res(70, { outcome: 'fail' })]);
    expect(f).toMatchObject({ windowMin: 60, noGoodYet: true });
  });
  it('a struck failure holds nothing', () => {
    expect(failuresOf(chk(), { since: 0 }, [res(70, { outcome: 'fail', struck: true })])).toEqual([]);
  });
});

describe('what a clean record proves, against scipy’s beta quantile', () => {
  it.each(cases.zero)('$n checks, none failed → at most $bound', z => {
    expect(cleanBound(z.n, z.conf)).toBeCloseTo(z.bound, 9);
  });
  it('says nothing without a check', () => { expect(cleanBound(0)).toBeUndefined(); });
});

describe('a value against its limits, trended', () => {
  const v = cases.trend;
  const check = chk({ kind: 'value', lo: v.lo, hi: v.hi, unit: '°C', when: { every: 1, unit: 'day' } });
  const rs = v.values.map((x, i) => res(i * 1440, { outcome: 'value', value: x }));
  it('judges inside the limits good, either side bad, and with no limit not at all', () => {
    expect(verdictOf(check, res(0, { outcome: 'value', value: 40 }))).toBe('good');
    expect(verdictOf(check, res(0, { outcome: 'value', value: 75 }))).toBe('good');
    expect(verdictOf(check, res(0, { outcome: 'value', value: 75.1 }))).toBe('bad');
    expect(verdictOf(check, res(0, { outcome: 'value', value: 39.9 }))).toBe('bad');
    expect(verdictOf(chk({ kind: 'value' }), res(0, { outcome: 'value', value: 1e9 }))).toBe('info');
    expect(verdictOf(chk({ kind: 'value', hi: 5 }), res(0, { outcome: 'value', value: 4 }))).toBe('good');
  });
  it('sees the latest nearing the upper limit and the trend rising (Mann–Kendall S, tau and Sen’s slope)', () => {
    const t = valueTrend(check, rs);
    expect(t.latest).toBe(70);
    expect(t.headroomPct).toBeCloseTo(v.headroomPct, 9);
    expect(t.nearing).toBe('hi');
    expect(t.trend?.dir).toBe('up');
    expect(t.trend?.slope).toBeCloseTo(v.sen, 9);
    expect(valueSays(check, t)).toBe('70 °C — 14% of the band from the upper limit — rising 1.31 °C a reading');
  });
  it('with fewer than eight readings says no trend, and with one limit no headroom', () => {
    const t = valueTrend(check, rs.slice(0, 5));
    expect(t.trend).toBeUndefined();
    expect(valueTrend(chk({ kind: 'value', hi: 75 }), rs).headroomPct).toBeUndefined();
  });
});

describe('a count in a slot and a pass or fail', () => {
  it('a count at its target is good, under it bad, with no target not judged', () => {
    const c = chk({ kind: 'count', target: 100 });
    expect(verdictOf(c, res(0, { outcome: 'count', count: 100 }))).toBe('good');
    expect(verdictOf(c, res(0, { outcome: 'count', count: 99 }))).toBe('bad');
    expect(verdictOf(chk({ kind: 'count' }), res(0, { outcome: 'count', count: 5 }))).toBe('info');
  });
});

describe('a check as agreed', () => {
  it('needs a name, a real frequency, limits the right way round and its questions', () => {
    expect(checkProblem({ name: ' ' })).toMatch(/what is checked/);
    expect(checkProblem({ name: 'x', when: { every: 0, unit: 'min' } })).toMatch(/how often/);
    expect(checkProblem({ name: 'x', kind: 'value', lo: 5, hi: 1 })).toMatch(/lower limit is above/);
    expect(checkProblem({ name: 'x', kind: 'scored' })).toMatch(/questions/);
    expect(checkProblem({ name: 'x', kind: 'scored', items: [{ id: '1', name: 'q' }], passPct: 120 })).toMatch(/percentage/);
    expect(checkProblem({ name: 'x', kind: 'passfail', when: { every: 1, unit: 'hour' } })).toBeUndefined();
  });
});
