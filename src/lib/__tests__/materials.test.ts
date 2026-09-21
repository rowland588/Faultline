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
  byUrgency, coveredIn, daysBetween, daysLate, isHere, mondayOf, readDate,
  readMaterialPaste, stateOf, tally, todayISO, weeksFor,
  type Material,
} from '../materials';

const TODAY = '2026-09-21';          // the Monday the sheet was photographed

let n = 0;
const mat = (m: Partial<Material> & { what: string }): Material => ({
  id: `m${++n}`, projectId: 'p1', sort: n * 10, createdAt: 0, updatedAt: 0, ...m,
});

/* The sheet, pasted the way Excel puts it on the clipboard: the merged title on
 * its own row, a heading row, then the films — "In stock" in one column or a
 * date in the next, and the week columns beyond them. */
const SHEET = [
  'LINE 2 NEW PERFORATION PLAN\t\t\t\t\t\t',
  '\tPlanned for arrival\tWK3\tWK4\tWK5\tWK1\tWK2',
  'TESC03167B Jacks Piper 2kg\t\t09-Oct\t\t\t\t',
  'TESC03185B Jacks White 2kg\tIn stock\t\t\t\t\t',
  'TESC03421B Express All Rounder 1.25kg\t\t05-Oct\t\t\t\t',
  'TESC03368B Express Piper 1.25kg\t\t02-Oct\t\t\t\t',
  'TESC03186B Express Finest All Rounder 1.75kg\tIn stock\t\t\t\t\t',
  'BRAN00009 Nanna Tate 2kg\tIn stock\t\t\t\t\t',
  'TESC03182C All Rounder 2kg\tIn stock\t\t\t\t\t',
  'TESC03293C Baking Potatoes 2kg\t\t28-Sep\t\t\t\t',
  'TESC03294B British Red 2kg\tIn stock\t\t\t\t\t',
  'TESC03169A Finest All Rounder 2kg\tIn stock\t\t\t\t\t',
  'TESC03163A Finest Red 2kg\t\t21-Sep\t\t\t\t',
  'TESC03401A Finest Nemo 2kg\t\t21-Sep\t\t\t\t',
  'TESC03295B King Edward 2kg\tIn stock\t\t\t\t\t',
  'TESC03170B Piper 1.25kg\t\t21-Sep\t\t\t\t',
  'TESC03290B Piper 2kg\tIn stock\t\t\t\t\t',
].join('\n');

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

describe('reading a date off a sheet', () => {
  it('takes what a British spreadsheet actually writes', () => {
    expect(readDate('09-Oct', TODAY)).toBe('2026-10-09');
    expect(readDate('21-Sep', TODAY)).toBe('2026-09-21');
    expect(readDate('21 Sep', TODAY)).toBe('2026-09-21');
    expect(readDate('Oct 9', TODAY)).toBe('2026-10-09');
    expect(readDate('28/09/2026', TODAY)).toBe('2026-09-28');
    expect(readDate('2026-10-05', TODAY)).toBe('2026-10-05');
  });

  it('rolls a bare day-and-month forward rather than reading it as overdue', () => {
    // a plan pasted in December, for January
    expect(readDate('09-Jan', '2026-12-15')).toBe('2027-01-09');
    // but a date days behind is just that — a delivery that has slipped
    expect(readDate('09-Dec', '2026-12-15')).toBe('2026-12-09');
  });

  it('says nothing rather than guessing', () => {
    expect(readDate('WK3', TODAY)).toBeUndefined();
    expect(readDate('soon', TODAY)).toBeUndefined();
    expect(readDate('', TODAY)).toBeUndefined();
  });
});

describe('pasting the perforation plan', () => {
  const rows = readMaterialPaste(SHEET, TODAY);
  const ok = rows.filter(r => !r.problem);

  it('takes all fifteen films and nothing else', () => {
    expect(ok).toHaveLength(15);
    expect(ok[0].what).toBe('TESC03167B Jacks Piper 2kg');
    expect(ok[14].what).toBe('TESC03290B Piper 2kg');
  });

  it('leaves the title and the headings out, because they are not materials', () => {
    const skipped = rows.filter(r => r.problem).map(r => r.what);
    expect(skipped).toContain('LINE 2 NEW PERFORATION PLAN');
    expect(skipped).toContain('Planned for arrival');
  });

  it('reads "In stock" as here, with no landing date invented for it', () => {
    const white = ok.find(r => r.what.includes('Jacks White'))!;
    expect(white.here).toBe(true);
    expect(white.due).toBeUndefined();
    expect(ok.filter(r => r.here)).toHaveLength(8);
  });

  it('reads the arrival dates', () => {
    const due = Object.fromEntries(ok.filter(r => r.due).map(r => [r.what.slice(0, 10), r.due]));
    expect(due).toEqual({
      TESC03167B: '2026-10-09',
      TESC03421B: '2026-10-05',
      TESC03368B: '2026-10-02',
      TESC03293C: '2026-09-28',
      TESC03163A: '2026-09-21',
      TESC03401A: '2026-09-21',
      TESC03170B: '2026-09-21',
    });
  });

  it('ignores the week columns to the right of the useful ones', () => {
    // WK3/WK4/WK5 are neither a date nor "in stock", and must not become one
    expect(ok.every(r => r.due === undefined || /^\d{4}-\d{2}-\d{2}$/.test(r.due))).toBe(true);
  });

  it('gives a plan that reads correctly once it is in', () => {
    const imported = ok.map(r => mat({ what: r.what, due: r.due, here: r.here }));
    const t = tally(imported, TODAY);
    expect(t.total).toBe(15);
    expect(t.here, 'the eight in stock').toBe(8);
    expect(t.waiting, 'the seven still coming').toBe(7);
    expect(t.late, 'nothing is late — the soonest three are due today').toBe(0);
    expect(t.nextDue).toBe('2026-09-21');
    expect(imported.filter(isHere)).toHaveLength(8);
  });

  it('takes a comma-separated paste too', () => {
    const csv = 'Finest Red 2kg,,21-Sep\nJacks White 2kg,In stock';
    const read = readMaterialPaste(csv, TODAY).filter(r => !r.problem);
    expect(read.map(r => [r.what, r.due ?? 'in'])).toEqual([
      ['Finest Red 2kg', '2026-09-21'],
      ['Jacks White 2kg', 'in'],
    ]);
  });

  it('is fine with an empty paste', () => {
    expect(readMaterialPaste('', TODAY)).toEqual([]);
    expect(readMaterialPaste('   \n  ', TODAY)).toEqual([]);
  });
});

describe('today', () => {
  it('is the reader’s own day, not a UTC midnight', () => {
    expect(todayISO(new Date(2026, 8, 21, 23, 30))).toBe('2026-09-21');
  });
});
