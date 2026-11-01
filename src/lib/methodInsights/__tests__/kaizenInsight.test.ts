/* The Kaizen event's own reading — hand-worked. The week starts Monday 2 Nov 2026, so its five days are 2–6 Nov and thirty days after
 * Friday 6 Nov is Sunday 6 Dec, moved to Monday 7 Dec. */
import { describe, expect, it } from 'vitest';
import { kaizenInsight } from '../kaizen-event';
import { actionsOf, weekOf } from '../../kaizenEvent';

const full: Record<string, string> = {
  start: '2026-11-02', baseline: '42 min, 8 changeovers', after: '24 min, 8 changeovers', written: 'Sequence on the wall', trained: 'All three shifts',
  'day-see@1': 'x', 'day-change@1': 'x', 'day-measure@1': 'x', 'day-see@2': 'x', 'day-change@2': 'x', 'day-measure@2': 'x', 'day-see@3': 'x', 'day-change@3': 'x', 'day-measure@3': 'x',
  'day-see@4': 'x', 'day-change@4': 'x', 'day-measure@4': 'x', 'day-see@5': 'x', 'day-change@5': 'x', 'day-measure@5': 'x',
};
const run = (a: Record<string, string>, today: string, owed: { kind: string; what: string; owner?: string; due?: string; doneAt?: number | null }[] = []) =>
  kaizenInsight({ answers: a, studies: [], owed, today });
const texts = (r: ReturnType<typeof run>) => (r.attention ?? []).map(x => x.text);

describe('the week and the actions', () => {
  it('knows when the week has started, ended and which days passed empty', () => {
    const w = weekOf({ start: '2026-11-02', 'day-see@1': 'x' }, '2026-11-04');
    expect(w.started).toBe(true); expect(w.ended).toBe(false); expect(w.endDay).toBe('2026-11-06');
    expect(w.missed.map(d => d.n)).toEqual([2]);                    // day 1 is 2 Nov (written), day 2 is 3 Nov (gone, empty), day 3 is today
  });
  it('is not started before its first day, and ended the day after the fifth', () => {
    expect(weekOf({ start: '2026-11-02' }, '2026-11-01').started).toBe(false);
    expect(weekOf({ start: '2026-11-02' }, '2026-11-06').ended).toBe(false);
    expect(weekOf({ start: '2026-11-02' }, '2026-11-07').ended).toBe(true);
  });
  it('counts raised, closed (8 of 11 = 73%), open, late and nobody', () => {
    const owed = [
      ...Array.from({ length: 8 }, (_, i) => ({ kind: 'next', what: `done ${i}`, owner: 'A', doneAt: 1 })),
      { kind: 'next', what: 'late', owner: 'B', due: '2026-11-10' }, { kind: 'next', what: 'nobody', due: '2026-12-30' }, { kind: 'found', what: 'ok', owner: 'C', due: '2026-12-30' },
      { kind: 'next', what: 'answer', testId: 'method:kaizen-event:open' },
    ];
    expect(actionsOf(owed, '2026-11-20')).toEqual({ raised: 11, closed: 8, open: 3, late: 1, noOwner: 1, share: 73 });
    expect(actionsOf([], '2026-11-20').share).toBeNull();
  });
});

describe('the Kaizen insight', () => {
  it('says nothing when the week is whole and the check is ahead', () => {
    const r = run({ ...full, 'check-date': '2026-12-07' }, '2026-11-20');
    expect(r).toEqual({});
  });
  it('an unrecorded check past its day is red and is the next thing', () => {
    const r = run({ ...full, 'check-date': '2026-11-10' }, '2026-11-20');
    expect(r.attention?.[0]).toEqual({ kind: 'finding', tone: 'r', text: 'The 30-day check was due 10 Nov 2026 — 10 days ago — and is not recorded. Take the same measure again and record whether the gain is holding.' });
    expect(r.next).toBe('Hold the 30-day check: take the same measure again and record Holding, Slipping or Lost.');
  });
  it('slipping is amber and points at the open actions; lost is red', () => {
    const owed = [{ kind: 'next', what: 'trolley', owner: 'Sam', due: '2026-11-10' }, { kind: 'next', what: 'jig', owner: 'Ann', due: '2026-12-30' }];
    const s = run({ ...full, 'check-date': '2026-11-20', 'check-verdict': 'Slipping', holding: '28.5 min and rising' }, '2026-11-20', owed);
    expect(texts(s)).toEqual(['The 30-day check says the gain is slipping. The open actions are the first place to look (2 actions open, 1 late).']);
    expect(s.attention?.[0]?.tone).toBe('a');
    expect(s.next).toBe('The gain is slipping: go through the open actions and decide what brings it back.');
    const l = run({ ...full, 'check-date': '2026-11-20', 'check-verdict': 'Lost', holding: '41 min' }, '2026-11-20');
    expect(l.attention?.[0]?.tone).toBe('r');
    expect(l.next).toContain('lost');
  });
  it('Holding with no measure at 30 days is questioned', () => {
    const r = run({ ...full, 'check-date': '2026-11-20', 'check-verdict': 'Holding' }, '2026-11-20');
    expect(texts(r)).toEqual(['The check says Holding, but the measure at 30 days is not written. Write the number that shows it.']);
    expect(run({ ...full, 'check-date': '2026-11-20', 'check-verdict': 'Holding', holding: '25 min' }, '2026-11-20')).toEqual({});
  });
  it('a week over with no check booked names the day thirty days on', () => {
    const r = run(full, '2026-11-20');
    expect(texts(r)).toEqual(['The week is over and the 30-day check is not booked. Thirty days after the week is Mon 7 Dec 2026.']);
    expect(r.next).toBe('Book the 30-day check for Mon 7 Dec 2026.');
  });
  it('an empty week that is over: no baseline, no result, days missed — and the next thing is the result', () => {
    const r = run({ start: '2026-11-02' }, '2026-11-20');
    expect(texts(r)).toEqual([
      'The week is over and the 30-day check is not booked. Thirty days after the week is Mon 7 Dec 2026.',
      'The week is over but the measure after the changes is not written. Without it the week has no result to set against the baseline.',
      'No baseline is written. The week has nothing to be compared with — a baseline is taken before the week, not remembered.',
      'Day 1, Day 2, Day 3, Day 4 and Day 5 of the week have nothing written.',
    ]);
    expect(r.next).toBe('Write the measure after the changes — the same measure as the baseline, taken the same way.');
  });
  it('mid-week, the days gone by with nothing written come first', () => {
    const r = run({ start: '2026-11-02', baseline: '42 min', 'day-see@1': 'x', 'day-change@1': 'x', 'day-measure@1': 'x' }, '2026-11-05');
    expect(texts(r)).toEqual(['Day 2 and Day 3 of the week have nothing written.']);
    expect(r.next).toBe('Write up Day 2 (Tue 3 Nov 2026): what was seen, what was changed, the measure at the close.');
  });
  it('a standard nobody was taught, and an action nobody owns', () => {
    const r = run({ ...full, trained: '', 'check-date': '2026-12-07' }, '2026-11-20', [{ kind: 'next', what: 'jig', due: '2026-12-30' }]);
    expect(texts(r)).toEqual([
      'The new way is written, but nobody is recorded as trained in it. A standard nobody was taught is not one.',
      '1 open action names nobody. An action nobody owns is the usual way an event\'s gain is lost.',
    ]);
    expect(r.attention?.every(x => x.tone === 'a')).toBe(true);
  });
  it('is quiet before the week starts', () => {
    expect(run({ start: '2026-11-02' }, '2026-10-30')).toEqual({});
    expect(run({}, '2026-11-20')).toEqual({});
  });
});
