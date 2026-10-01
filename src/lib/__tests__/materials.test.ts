/* WHAT WE ARE WAITING ON.
 *
 * The fixture is the real sheet — LINE 2 NEW PERFORATION PLAN, as it was
 * photographed off the screen it lives on. Fifteen films, eight in stock, seven
 * with a planned arrival written "21-Sep" or "09-Oct", and a merged title above
 * a heading row. If the reader cannot take THAT, it cannot take the thing it
 * was built for, and every other fixture is a fixture about itself.
 *
 * The three that are silent when wrong, and so are pinned here:
 *
 *   LATE IS DERIVED, from the date and today, and nothing writes it down. A
 *   stored "late" flag is a lie the morning after.
 *
 *   IN STOCK IS NOT A DATE. The sheet knows those films are here and does not
 *   know when they landed; inventing a landing date for them would read as a
 *   fact somebody could plan against.
 *
 *   THE GREEN RUNS FORWARD. A thing that has arrived does not un-arrive the
 *   following week, and a thing that is late is not green in the week its date
 *   was in — the date passed and it still is not here.
 */
import { describe, it, expect } from 'vitest';
import {
  byUrgency, coveredIn, daysBetween, daysLate, mondayOf,
  stateOf, tally, todayISO, weeksFor,
  type Material,
} from '../materials';

const TODAY = '2026-09-21';          // the Monday the sheet was photographed

let n = 0;
const mat = (m: Partial<Material> & { what: string }): Material => ({
  id: `m${++n}`, projectId: 'p1', sort: n * 10, createdAt: 0, updatedAt: 0, ...m,
});

describe('where a thing has got to', () => {
  it('tells apart here, late, waiting and nobody-has-said', () => {
    expect(stateOf(mat({ what: 'film', here: true }), TODAY)).toBe('here');
    expect(stateOf(mat({ what: 'film', inOn: '2026-09-12' }), TODAY)).toBe('here');
    expect(stateOf(mat({ what: 'film', due: '2026-09-18' }), TODAY)).toBe('late');
    expect(stateOf(mat({ what: 'film', due: '2026-09-28' }), TODAY)).toBe('waiting');
    expect(stateOf(mat({ what: 'film' }), TODAY)).toBe('undated');
  });

  it('counts a thing due TODAY as still coming, not as late', () => {
    expect(stateOf(mat({ what: 'film', due: TODAY }), TODAY)).toBe('waiting');
    expect(daysLate(mat({ what: 'film', due: TODAY }), TODAY)).toBeUndefined();
  });

  it('never calls something late once it is here, however old the date', () => {
    const m = mat({ what: 'film', due: '2026-01-01', here: true, inOn: '2026-09-12' });
    expect(stateOf(m, TODAY)).toBe('here');
    expect(daysLate(m, TODAY)).toBeUndefined();
  });

  it('counts the days late off the date, not off a stored flag', () => {
    expect(daysLate(mat({ what: 'film', due: '2026-09-18' }), TODAY)).toBe(3);
    expect(daysLate(mat({ what: 'film', due: '2026-09-20' }), TODAY)).toBe(1);
  });

  it('reads a day as a day, either side of midnight', () => {
    expect(daysBetween('2026-09-18', '2026-09-21')).toBe(3);
    expect(daysBetween('2026-10-24', '2026-10-27')).toBe(3);   // the clocks go back
  });
});

describe('the order the list reads in', () => {
  it('puts what is holding you up first and what is in last', () => {
    const rows = [
      mat({ what: 'in stock', here: true }),
      mat({ what: 'no date' }),
      mat({ what: 'due later', due: '2026-10-09' }),
      mat({ what: 'late', due: '2026-09-18' }),
      mat({ what: 'due soon', due: '2026-09-28' }),
    ];
    expect(byUrgency(rows, TODAY).map(m => m.what))
      .toEqual(['late', 'due soon', 'due later', 'no date', 'in stock']);
  });

  it('counts the late ones as still waiting, so nobody has to add two numbers', () => {
    const t = tally([
      mat({ what: 'a', due: '2026-09-18' }),
      mat({ what: 'b', due: '2026-09-28' }),
      mat({ what: 'c', here: true }),
      mat({ what: 'd' }),
    ], TODAY);
    expect(t).toMatchObject({ total: 4, late: 1, waiting: 2, here: 1, undated: 1 });
    expect(t.nextDue, 'the soonest thing still to come').toBe('2026-09-28');
  });

  it('leaves out what has been deleted', () => {
    const rows = [mat({ what: 'gone', deletedAt: 1 }), mat({ what: 'here', here: true })];
    expect(byUrgency(rows, TODAY).map(m => m.what)).toEqual(['here']);
    expect(tally(rows, TODAY).total).toBe(1);
  });
});

describe('the weeks across the top', () => {
  it('starts on the Monday of the week we are in', () => {
    expect(mondayOf('2026-09-21')).toBe('2026-09-21');   // a Monday
    expect(mondayOf('2026-09-24')).toBe('2026-09-21');   // the Thursday after
    expect(mondayOf('2026-09-20')).toBe('2026-09-14');   // the Sunday before
  });

  it('runs far enough to cover the last thing on order', () => {
    const rows = [mat({ what: 'film', due: '2026-10-09' })];
    const weeks = weeksFor(rows, TODAY);
    expect(weeks[0].start).toBe('2026-09-21');
    expect(weeks.some(w => w.start <= '2026-10-09' && '2026-10-09' <= w.end)).toBe(true);
  });

  it('shows a window even when nothing is on order, and never a thousand columns', () => {
    expect(weeksFor([], TODAY)).toHaveLength(6);
    const daft = [mat({ what: 'typo', due: '2126-01-01' })];
    expect(weeksFor(daft, TODAY).length).toBeLessThanOrEqual(14);
  });

  it('names the month over its weeks', () => {
    const weeks = weeksFor([mat({ what: 'film', due: '2026-10-09' })], TODAY);
    expect(weeks[0].month).toBe('September');
    expect(weeks.some(w => w.month === 'October')).toBe(true);
  });
});

describe('the green', () => {
  const weeks = weeksFor([mat({ what: 'x', due: '2026-10-09' })], TODAY);

  it('runs all the way across for something in stock', () => {
    const m = mat({ what: 'Jacks White 2kg', here: true });
    expect(weeks.map(w => coveredIn(m, w, TODAY)).every(Boolean)).toBe(true);
  });

  it('starts at the week the thing lands, and stays on', () => {
    const m = mat({ what: 'Baking Potatoes 2kg', due: '2026-09-28' });
    const on = weeks.map(w => coveredIn(m, w, TODAY));
    expect(on[0], 'this week, before it lands').toBe(false);
    expect(on[1], 'the week it lands').toBe(true);
    expect(on.slice(1).every(Boolean), 'and every week after it').toBe(true);
  });

  it('is nowhere for something already late — the date passed and it is not here', () => {
    const m = mat({ what: 'Finest Red 2kg', due: '2026-09-18' });
    expect(weeks.map(w => coveredIn(m, w, TODAY)).some(Boolean)).toBe(false);
  });
});

describe('today', () => {
  it('is the reader’s own day, not a UTC midnight', () => {
    expect(todayISO(new Date(2026, 8, 21, 23, 30))).toBe('2026-09-21');
  });
});
