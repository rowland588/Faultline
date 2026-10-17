/* THE CASE FOR THE CHANGE (docs/CASE.md) — what a job is for in money, from
 * the one cost model (a line's shifts less their breaks × its margin a
 * pack, lib/lineLoss lineDay), and what it is measured at once it starts. */
import { describe, expect, it } from 'vitest';
import { caseSays, readCase, type CaseLineFacts } from '../businessCase';

const shifts = [{ name: 'Days', start: '06:00', end: '14:00', breakMin: 30 }, { name: 'Lates', start: '14:00', end: '22:00', breakMin: 30 }];
const line2: CaseLineFacts = { id: 'w2', name: 'Line 2', facts: { name: 'Line 2', packsPerMin: 120, marginPerPack: 0.12, shifts } };
const today = '2026-10-17';

describe('what the case is worth', () => {
  it('from 0 to its rated speed × 900 running minutes × 12p a pack, five days a week', () => {
    const r = readCase({ why: 'The 4-pack contract', lines: [{ lineId: 'w2', from: 0 }], daysAWeek: 5, startsOn: '2026-12-01' }, [line2], today);
    expect(r.lines[0]).toMatchObject({ from: 0, fromSays: 'typed', to: 120, toSays: 'its rated speed', minutes: 900, perPack: 0.12, day: 12960 });
    expect([r.day, r.week, r.started, r.missing]).toEqual([12960, 64800, false, []]);
    expect(caseSays(r)).toEqual({ why: 'The 4-pack contract', worth: '£64.8k a week of margin — Line 2 from 0 to 120 a minute, 5 days a week, from 1 Dec', tone: 'n' });
  });

  it('offered from the job: its first reading the rate before, its target the rate it is for', () => {
    const l = { ...line2, series: { points: [{ at: '2026-09-20', value: 40 }, { at: '2026-10-10', value: 52 }], target: 60 } };
    const r = readCase({ why: 'Line 2 to 60 a minute', daysAWeek: 5 }, [l], today);
    expect(r.lines[0]).toMatchObject({ from: 40, fromSays: 'its first reading', to: 60, toSays: 'its target', day: 20 * 900 * 0.12 });
  });

  it('once started: the latest reading since the start, and its share of the case — under it in amber, at it in green', () => {
    const l = { ...line2, series: { points: [{ at: '2026-09-20', value: 0 }, { at: '2026-10-10', value: 90 }] } };
    const c = { why: 'The 4-pack contract', lines: [{ lineId: 'w2', from: 0, to: 120 }], daysAWeek: 5, startsOn: '2026-10-01' };
    const r = readCase(c, [l], today);
    expect(r.measured).toEqual({ day: 9720, week: 48600, share: 0.75, of: 12960 });
    expect(caseSays(r)).toMatchObject({ measured: 'Measured since 1 Oct: £48.6k a week — 75% of the case', tone: 'a' });
    const at = readCase(c, [{ ...l, series: { points: [{ at: '2026-10-12', value: 121 }] } }], today);
    expect(caseSays(at)?.tone).toBe('g');
    expect(caseSays(readCase(c, [{ ...l, series: { points: [{ at: '2026-09-20', value: 50 }] } }], today))?.measured)
      .toBe('Nothing measured since 1 Oct — take a reading on the line to say what it is making');
  });

  it('the start is the agreed handover when no day is given', () => {
    const r = readCase({ lines: [{ lineId: 'w2', from: 0 }], daysAWeek: 5 }, [line2], today, '2026-10-01');
    expect([r.startsOn, r.started]).toEqual(['2026-10-01', true]);
  });

  it('anything missing is named with where to give it — never a blank, never a guess; no days, a day not a week', () => {
    const bare: CaseLineFacts = { id: 'w3', name: 'Line 3', facts: { name: 'Line 3' } };
    const r = readCase({ why: 'Faster', lines: [{ lineId: 'w2', from: 0 }] }, [line2, bare], today);
    expect(r.missing).toEqual(['Line 3: its rate before and the rate it is for in the case and its shifts and its margin a pack in Your factory', 'the days it runs a week, in the case']);
    expect([r.day, r.week]).toEqual([12960, undefined]);
    expect(caseSays(r)?.worth).toBe('£13.0k a day of margin — Line 2 from 0 to 120 a minute · still to give: Line 3: its rate before and the rate it is for in the case and its shifts and its margin a pack in Your factory and the days it runs a week, in the case');
    expect(caseSays(readCase(undefined, [line2], today))).toBeUndefined();
    expect(caseSays(readCase({ why: 'Faster' }, [], today))?.worth).toBe('Not priced yet — the job has no line from Your factory yet');
  });
});
