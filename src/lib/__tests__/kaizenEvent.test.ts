import { describe, expect, it } from 'vitest';
import { checkOf, dayCount, dayDates, daysOf, eventSays } from '../kaizenEvent';
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
  });
});
