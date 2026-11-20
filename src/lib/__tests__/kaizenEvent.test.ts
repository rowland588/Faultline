import { describe, expect, it } from 'vitest';
import { checkOf, dayCount, dayDates, daysOf, eventSays, holdingOf, readingsOf } from '../kaizenEvent';
import { fieldsOf } from '../methodSheet';

describe('the Kaizen event week', () => {
  it('has five days by default and grows only when a later day holds words or one is added', () => {
    expect(dayCount({})).toBe(5);
    expect(dayCount({ 'day-see@6': 'x' })).toBe(6);
    expect(dayCount({}, 1)).toBe(6);
    expect(dayCount({}, 9)).toBe(7);
  });
  it('dates working days from the start, skipping the weekend', () => {
    // 2026-11-05 is a Thursday
    expect(dayDates('2026-11-05', 5)).toEqual(['2026-11-05', '2026-11-06', '2026-11-09', '2026-11-10', '2026-11-11']);
    expect(dayDates('2026-11-07', 2)).toEqual(['2026-11-09', '2026-11-10']);
    expect(dayDates(undefined, 2)).toEqual([undefined, undefined]);
  });
  it('says each day in words', () => {
    const d = daysOf({ 'day-see@1': 'a', 'day-change@1': 'b', 'day-measure@1': 'c', 'day-see@2': 'a' });
    expect(d.map(x => x.word)).toEqual(['Written', 'Under way', 'Not written', 'Not written', 'Not written']);
  });
  it('suggests the check thirty days after the fifth day, and reads it against today', () => {
    const a = { start: '2026-11-02' }; // Monday; day 5 is Friday 6 Nov; +30 = Sunday 6 Dec, so Monday 7 Dec
    expect(checkOf(a, '2026-11-01').suggested).toBe('2026-12-07');
    expect(checkOf(a, '2026-11-01').says).toMatch(/not booked/);
    expect(checkOf({ ...a, 'check-date': '2026-12-06' }, '2026-12-01').says).toMatch(/in 5 days/);
    const late = checkOf({ ...a, 'check-date': '2026-12-06' }, '2026-12-09');
    expect(late.says).toMatch(/3 days ago/); expect(late.tone).toBe('r');
    const v = checkOf({ ...a, 'check-date': '2026-12-06', 'check-verdict': 'Slipping' }, '2026-12-09');
    expect(v.verdict).toBe('Slipping'); expect(v.tone).toBe('a');
  });
  it('ignores a verdict it does not know and says the week in one line', () => {
    expect(checkOf({ 'check-verdict': 'Fine' }, '2026-11-01').verdict).toBeUndefined();
    expect(eventSays({ 'day-see@1': 'x' }, '2026-11-01')).toMatch(/^0 of 5 days written, 1 under way\./);
  });
  it('keeps every earlier question id and keeps the board-only ids out of the sheet', () => {
    const ids = ['Prepare', 'Observe', 'Improve', 'Standardise', 'Sustain'].flatMap(s => fieldsOf('kaizen-event', s).map(x => x.id));
    for (const old of ['charter', 'team', 'baseline', 'waste', 'tried', 'written', 'open', 'holding']) expect(ids).toContain(old);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some(i => i.startsWith('day-') || i.startsWith('check-'))).toBe(false);
    expect(ids).not.toContain('better');
  });
});

/* IS THE GAIN HOLDING (knowledge/specs/FC-016-kaizen-event.md, criterion 4) — the independent cases: the record's six changeovers
 * (scripts/knowledge/cases-lean.py) and SciPy 1.18's spearmanr, run by hand on 20 November:
 *   spearmanr(range(1, 7), [25, 24, 28, 31, 30, 33]) → ρ 0.885714, p 0.018845; mean 28.5
 *   spearmanr(range(1, 7), [33, 30, 31, 28, 24, 25]) → ρ −0.885714, p 0.018845
 *   spearmanr(range(1, 7), [24, 25, 24, 26, 25, 24]) → ρ 0.123443, p 0.815776
 *   spearmanr(range(1, 5), [25, 24, 28, 31])         → ρ 0.8, p 0.2 */
describe('the readings since the week, read for a trend', () => {
  const R = '25, 24, 28, 31, 30, 33';
  it('the record’s six changeovers: rising, Spearman’s ρ 0.886 (p 0.0188) — the wrong way when lower is better', () => {
    const h = holdingOf({ 'check-readings': R, better: 'lower' });
    expect(h.values).toEqual([25, 24, 28, 31, 30, 33]);
    expect(h.mean).toBe(28.5);
    expect(h.rho).toBeCloseTo(0.885714, 5);
    expect(h.p).toBeCloseTo(0.018845, 5);
    expect([h.trend, h.way, h.tone]).toEqual(['rising', 'wrong', 'a']);
    expect(h.says).toBe('6 readings since the week: mean 28.5, rising (Spearman’s ρ 0.89 on their order, p 0.02) — the wrong way for this measure: the gain is creeping back.');
  });
  it('the same rise is the right way when higher is better; with no way said the reading of it is asked', () => {
    const up = holdingOf({ 'check-readings': R, better: 'higher' });
    expect([up.way, up.tone]).toEqual(['right', 'g']);
    expect(up.says).toMatch(/— the right way for this measure\.$/);
    const none = holdingOf({ 'check-readings': R, better: 'sideways' });
    expect(none.better).toBeUndefined(); expect(none.way).toBeUndefined(); expect(none.tone).toBe('n');
    expect(none.says).toMatch(/say which way is better for this measure to read it\.$/);
  });
  it('reversed: falling, ρ −0.886 — creeping back when higher is better', () => {
    const h = holdingOf({ 'check-readings': '33 30 31 28 24 25', better: 'higher' });
    expect(h.rho).toBeCloseTo(-0.885714, 5); expect(h.p).toBeCloseTo(0.018845, 5);
    expect([h.trend, h.way]).toEqual(['falling', 'wrong']);
  });
  it('no steady trend when p is 0.05 or more; four readings are enough to read, three are not; all equal is no trend', () => {
    const flatish = holdingOf({ 'check-readings': '24, 25, 24, 26, 25, 24', better: 'lower' });
    expect(flatish.rho).toBeCloseTo(0.123443, 5); expect(flatish.p).toBeCloseTo(0.815776, 5);
    expect([flatish.trend, flatish.way, flatish.tone]).toEqual(['none', undefined, 'n']);
    expect(flatish.says).toBe('6 readings since the week: mean 24.7, no steady trend (Spearman’s ρ 0.12 on their order, p 0.82).');
    const four = holdingOf({ 'check-readings': '25, 24, 28, 31' });
    expect(four.rho).toBeCloseTo(0.8, 10); expect(four.p).toBeCloseTo(0.2, 10); expect(four.trend).toBe('none');
    expect(holdingOf({ 'check-readings': '25, 24, 28' }).says).toBe('3 readings since the week (mean 25.7) — a trend needs 4 or more.');
    expect(holdingOf({ 'check-readings': '24 24 24 24' }).says).toBe('4 readings since the week, all 24 — no trend.');
  });
  it('nothing written is said; a word among the readings is named and left out, never guessed', () => {
    const e = holdingOf({});
    expect([e.trend, e.n]).toEqual(['empty', 0]);
    expect(e.says).toMatch(/^No readings since the week are written yet/);
    const w = holdingOf({ 'check-readings': '25 min, 24 min, 28, 31, 30, 33', better: 'lower' });
    expect(w.values).toEqual([25, 24, 28, 31, 30, 33]);
    expect(w.bad).toEqual(['min']);
    expect(w.says).toMatch(/creeping back\. Left out, not a number: min\.$/);
    expect(readingsOf('1.5;2\n-3  +4').values).toEqual([1.5, 2, -3, 4]);
  });
});
