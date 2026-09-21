/* THE RULES A PROGRAM IS READ BY.
 *
 * Every one of these is a decision that could quietly go the other way in a
 * refactor and take a month to notice on a real line — chiefly the one the
 * whole model rests on: PROVED NEEDS A DATE. A row that says it is proved and
 * cannot say when is a program somebody felt good about, and reading it as
 * signed off is how a line runs product on an unproven program.
 */
import { describe, it, expect } from 'vitest';
import {
  byUrgency, daysOverdue, fillIn, isProved, readProgramPaste, standingOf,
  stateOf, tally, testedIn, weeksFor,
  type Program, type ProgramState,
} from '../programs';

const TODAY = '2026-09-21';   // a Monday

let n = 0;
const prog = (p: Partial<Program> = {}): Program => ({
  id: `p${++n}`, projectId: 'proj', what: `P-${n}`,
  state: 'needed', sort: n, createdAt: 1, updatedAt: 1, ...p,
});

describe('where it has got to', () => {
  it('reads the three states off the record', () => {
    expect(stateOf(prog({ state: 'needed' }))).toBe('needed');
    expect(stateOf(prog({ state: 'onMachine' }))).toBe('onMachine');
    expect(stateOf(prog({ state: 'proved', provedOn: '2026-09-14' }))).toBe('proved');
  });

  /* THE RULE THE MODEL RESTS ON. */
  it('refuses to call a program proved without a date', () => {
    const p = prog({ state: 'proved' });          // the word, and nothing behind it
    expect(stateOf(p)).toBe('onMachine');
    expect(isProved(p)).toBe(false);
  });

  it('takes the date as the fact even when the word disagrees', () => {
    // A row that went backwards on one device and was proved on another: the
    // date wins, and LWW on updatedAt settles which record is current.
    expect(stateOf(prog({ state: 'onMachine', provedOn: '2026-09-14' }))).toBe('proved');
  });
});

describe('when we find out', () => {
  it('is booked when the day is still ahead', () => {
    expect(standingOf(prog({ state: 'onMachine', testOn: '2026-09-29' }), TODAY)).toBe('booked');
  });

  it('is overdue when the day has gone and it is still not proved', () => {
    expect(standingOf(prog({ state: 'onMachine', testOn: '2026-09-15' }), TODAY)).toBe('overdue');
    expect(daysOverdue(prog({ state: 'onMachine', testOn: '2026-09-15' }), TODAY)).toBe(6);
  });

  it('counts the day itself as still booked, not overdue', () => {
    // A test happening this morning is not a failure at 09:00.
    expect(standingOf(prog({ state: 'onMachine', testOn: TODAY }), TODAY)).toBe('booked');
  });

  it('calls no date agreed what it is, rather than inventing one', () => {
    expect(standingOf(prog({ state: 'needed' }), TODAY)).toBe('undated');
    expect(daysOverdue(prog({ state: 'needed' }), TODAY)).toBeUndefined();
  });

  it('is never overdue once it is proved, whatever date it carried', () => {
    const p = prog({ state: 'proved', provedOn: '2026-09-18', testOn: '2026-09-01' });
    expect(standingOf(p, TODAY)).toBe('proved');
    expect(daysOverdue(p, TODAY)).toBeUndefined();
  });
});

describe('the order the list reads in', () => {
  it('puts what has slipped first and what is done last', () => {
    const rows = [
      prog({ what: 'proved', state: 'proved', provedOn: '2026-09-10' }),
      prog({ what: 'undated', state: 'onMachine' }),
      prog({ what: 'booked', state: 'onMachine', testOn: '2026-09-29' }),
      prog({ what: 'overdue', state: 'onMachine', testOn: '2026-09-10' }),
    ];
    expect(byUrgency(rows, TODAY).map(p => p.what))
      .toEqual(['overdue', 'booked', 'undated', 'proved']);
  });

  it('puts the soonest test first inside the booked group', () => {
    const rows = [
      prog({ what: 'later', state: 'onMachine', testOn: '2026-10-20' }),
      prog({ what: 'sooner', state: 'onMachine', testOn: '2026-09-29' }),
    ];
    expect(byUrgency(rows, TODAY).map(p => p.what)).toEqual(['sooner', 'later']);
  });

  /* Both are waiting on somebody to name a day. One is also waiting on
     somebody to write it, which is the longer pole. */
  it('puts a program nobody has written before one that merely needs proving', () => {
    const rows = [
      prog({ what: 'exists', state: 'onMachine' }),
      prog({ what: 'missing', state: 'needed' }),
    ];
    expect(byUrgency(rows, TODAY).map(p => p.what)).toEqual(['missing', 'exists']);
  });

  it('leaves out the deleted', () => {
    const rows = [prog({ what: 'gone', deletedAt: 5 }), prog({ what: 'here' })];
    expect(byUrgency(rows, TODAY).map(p => p.what)).toEqual(['here']);
  });
});

describe('the counts', () => {
  const rows = [
    prog({ state: 'proved', provedOn: '2026-09-14' }),
    prog({ state: 'proved', provedOn: '2026-09-18' }),
    prog({ state: 'onMachine', testOn: '2026-09-29' }),
    prog({ state: 'onMachine' }),
    prog({ state: 'needed', testOn: '2026-09-10' }),   // the day has gone
    prog({ state: 'needed' }),
  ];

  it('counts each state by what the record says, not by the word', () => {
    const t = tally(rows, TODAY);
    expect(t.total).toBe(6);
    expect(t.proved).toBe(2);
    expect(t.onMachine).toBe(2);
    expect(t.needed).toBe(2);
  });

  it('counts a test day that has gone, separately from everything else', () => {
    expect(tally(rows, TODAY).overdue).toBe(1);
  });

  it('names the next test that is actually still ahead', () => {
    expect(tally(rows, TODAY).nextTest).toBe('2026-09-29');
  });

  it('counts a proved-without-a-date row as on the machine', () => {
    const t = tally([prog({ state: 'proved' })], TODAY);
    expect(t.proved).toBe(0);
    expect(t.onMachine).toBe(1);
  });
});

describe('the grid', () => {
  const weeks = weeksFor([prog({ state: 'onMachine', testOn: '2026-10-06' })], TODAY);

  it('starts at this week and covers the last test booked', () => {
    expect(weeks[0].start).toBe('2026-09-21');
    expect(weeks.some(w => '2026-10-06' >= w.start && '2026-10-06' <= w.end)).toBe(true);
  });

  it('goes green from the week it was proved, and stays green', () => {
    const p = prog({ state: 'proved', provedOn: '2026-10-01' });
    expect(fillIn(p, weeks[0])).toBe('none');        // proved after this week
    const w = weeks.find(x => '2026-10-01' <= x.end);
    expect(w && fillIn(p, w)).toBe('proved');
    expect(fillIn(p, weeks[weeks.length - 1])).toBe('proved');
  });

  it('is green all the way across for something proved long ago', () => {
    const p = prog({ state: 'proved', provedOn: '2026-03-02' });
    expect(weeks.every(w => fillIn(p, w) === 'proved')).toBe(true);
  });

  /* Amber everywhere, not amber up to its test date: it can run today and it
     could equally be wrong today, and that does not change on a Monday. */
  it('is amber all the way across while it is on the machine', () => {
    const p = prog({ state: 'onMachine', testOn: '2026-10-06' });
    expect(weeks.every(w => fillIn(p, w) === 'machine')).toBe(true);
  });

  it('is hollow all the way across while nobody has written it', () => {
    const p = prog({ state: 'needed', testOn: '2026-10-06' });
    expect(weeks.every(w => fillIn(p, w) === 'none')).toBe(true);
  });

  it('rings the week the test is booked in, and only that one', () => {
    const p = prog({ state: 'onMachine', testOn: '2026-10-06' });
    expect(weeks.filter(w => testedIn(p, w))).toHaveLength(1);
  });

  /* The ring is a question. A proved program has answered it. */
  it('draws no ring on something already proved', () => {
    const p = prog({ state: 'proved', provedOn: '2026-09-22', testOn: '2026-10-06' });
    expect(weeks.some(w => testedIn(p, w))).toBe(false);
  });
});

describe('pasting a list', () => {
  it('reads name, product and a date off one row', () => {
    const [r] = readProgramPaste('P-121 perforation\tAll Rounder 2kg\t29-Sep', TODAY);
    expect(r.what).toBe('P-121 perforation');
    expect(r.runs).toBe('All Rounder 2kg');
    expect(r.testOn).toBe('2026-09-29');
    expect(r.state).toBe('needed');
  });

  it('takes a word for proved as proved, and dates it', () => {
    const [r] = readProgramPaste('P-104\tFinest Red 2kg\tproved', TODAY);
    expect(r.state).toBe('proved');
    expect(r.provedOn).toBe(TODAY);     // the sheet knows it is; it does not know when
    expect(r.testOn).toBeUndefined();
  });

  it('uses the date on the row when a proved row has one', () => {
    const [r] = readProgramPaste('P-104\tvalidated\t14-Sep', TODAY);
    expect(r.provedOn).toBe('2026-09-14');
  });

  it('reads the words a real sheet uses for on the machine', () => {
    for (const word of ['on machine', 'loaded', 'written', 'untested']) {
      expect(readProgramPaste(`P-1\t${word}`, TODAY)[0].state).toBe('onMachine');
    }
  });

  /* The commonest row on a list like this is a name and nothing else. A paste
     that refused them would be useless on exactly the list it is for. */
  it('takes a bare name as a program that is needed, with no date', () => {
    const [r] = readProgramPaste('P-141 perforation', TODAY);
    expect(r.problem).toBeUndefined();
    expect(r.state).toBe('needed');
    expect(r.testOn).toBeUndefined();
  });

  /* Two different kinds of empty, handled differently on purpose. A blank
     line is nothing at all and is dropped before it is counted — numbering the
     gaps in a pasted block would make every row number in the preview wrong.
     A row of separators with no words in it IS a row, so it is reported rather
     than silently swallowed. */
  it('drops a blank line without numbering it', () => {
    const rows = readProgramPaste('P-1\tproved\n   \nP-2\tloaded', TODAY);
    expect(rows.map(r => r.what)).toEqual(['P-1', 'P-2']);
    expect(rows.map(r => r.rowNo)).toEqual([1, 2]);
  });

  it('reports a row that has separators but no words', () => {
    const rows = readProgramPaste(',,\nP-1,proved', TODAY);
    expect(rows[0].problem).toBe('Nothing on this row');
    expect(rows[1].problem).toBeUndefined();
  });

  it('reads commas when there are no tabs', () => {
    const [r] = readProgramPaste('P-1,Finest Red 2kg,29-Sep', TODAY);
    expect(r.what).toBe('P-1');
    expect(r.runs).toBe('Finest Red 2kg');
    expect(r.testOn).toBe('2026-09-29');
  });

  it('reads a real-looking block end to end', () => {
    const rows = readProgramPaste([
      'PROGRAM\tPRODUCT\tSTATUS',                       // the heading row
      'P-104 perforation\tFinest Red 2kg\tproved',
      'P-121 perforation\tAll Rounder 2kg\t29-Sep',
      'P-141 perforation\tExpress Piper 1.25kg',
    ].join('\n'), TODAY);

    expect(rows).toHaveLength(4);
    // The heading row is a program called PROGRAM with a product called
    // PRODUCT — it cannot be told apart from a real row by reading alone, and
    // the preview shows it so somebody can delete it before pressing Add.
    expect(rows[0].what).toBe('PROGRAM');
    const states = rows.slice(1).map(r => r.state as ProgramState);
    expect(states).toEqual(['proved', 'needed', 'needed']);
    expect(rows[2].testOn).toBe('2026-09-29');
  });
});
