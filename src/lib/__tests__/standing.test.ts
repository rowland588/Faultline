/* THE ONE SOURCE. Three surfaces read it — the project page, the phone and the
 * client report — so a mistake here is the same mistake in three places, one of
 * which gets emailed to a client.
 *
 * Every rule below is a decision that could quietly go the other way in a
 * refactor. The ones that matter most: LATE MEANS THE DAY HAS GONE, not "not
 * finished"; an OBSERVATION IS NEVER LATE, because nobody ever agreed a day for
 * it; and WHOSE comes off the record, because naming the OEM is what turns a
 * confession into a document you can hand over.
 */
import { describe, it, expect } from 'vitest';
import { standing, type StandingInput } from '../standing';
import type { Asset, Test, TestItem } from '../testing';
import type { Material } from '../materials';
import type { Program } from '../programs';

const TODAY = '2026-09-22';

let n = 0;
const test = (o: Partial<Test> = {}): Test => ({
  id: `t${++n}`, projectId: 'p', title: `Trial ${n}`, outcome: 'planned',
  sort: n, createdAt: 1, updatedAt: 1, ...o,
});
const item = (o: Partial<TestItem> = {}): TestItem => ({
  id: `i${++n}`, projectId: 'p', testId: 't1', kind: 'found', what: `Item ${n}`,
  sort: n, createdAt: 1, updatedAt: 1, ...o,
});
const mat = (o: Partial<Material> = {}): Material => ({
  id: `m${++n}`, projectId: 'p', what: `Material ${n}`,
  sort: n, createdAt: 1, updatedAt: 1, ...o,
});
const prog = (o: Partial<Program> = {}): Program => ({
  id: `g${++n}`, projectId: 'p', what: `P-${n}`, state: 'needed',
  sort: n, createdAt: 1, updatedAt: 1, ...o,
});
const asset = (o: Partial<Asset> = {}): Asset => ({
  id: `a${++n}`, projectId: 'p', name: `Machine ${n}`, state: 'awaited',
  sort: n, updatedAt: 1, ...o,
});

const IN: StandingInput = {
  tests: [], items: [], materials: [], programs: [], assets: [], today: TODAY,
};
const at = (o: Partial<StandingInput> = {}) => standing({ ...IN, ...o });
const row = (s: ReturnType<typeof standing>, key: string) => s.rows.find(r => r.key === key);

describe('what is outstanding', () => {
  it('counts a test as open until the day has actually happened', () => {
    const s = at({ tests: [test(), test({ outcome: 'passed' })] });
    expect(row(s, 'tests')?.open).toBe(1);
  });

  it('counts a machine as outstanding until it is RUNNING, not merely installed', () => {
    /* Installed is not the job. A line that cannot run is not commissioned. */
    const s = at({ assets: [asset({ state: 'installed' }), asset({ state: 'running' })] });
    expect(row(s, 'machines')?.open).toBe(1);
  });

  it('leaves a list out entirely when it has nothing outstanding', () => {
    expect(row(at({ materials: [mat({ here: true })] }), 'materials')).toBeUndefined();
  });

  it('ignores anything deleted, on every list', () => {
    const s = at({
      tests: [test({ deletedAt: 5 })],
      materials: [mat({ deletedAt: 5 })],
      programs: [prog({ deletedAt: 5 })],
      assets: [asset({ deletedAt: 5 })],
    });
    expect(s.rows).toEqual([]);
    expect(s.outstanding).toBe(0);
  });

  it('does not count an item whose trial has been deleted', () => {
    /* Otherwise deleting a trial leaves its actions counted against the job
       forever, with no screen that can show them. */
    const s = at({ tests: [test({ id: 't9', deletedAt: 3 })], items: [item({ testId: 't9', kind: 'next' })] });
    expect(row(s, 'actions')).toBeUndefined();
  });
});

describe('late means the day has gone', () => {
  it('is late only once the day it was wanted is behind us', () => {
    const s = at({ materials: [mat({ due: '2026-09-20' }), mat({ due: '2026-09-29' })] });
    expect(row(s, 'materials')).toMatchObject({ open: 2, late: 1 });
  });

  it('counts today itself as not yet late', () => {
    expect(row(at({ materials: [mat({ due: TODAY })] }), 'materials')?.late).toBe(0);
  });

  it('is never late when nobody ever agreed a day', () => {
    const s = at({ materials: [mat()], programs: [prog()], assets: [asset()] });
    expect(s.late).toBe(0);
    expect(s.outstanding).toBe(3);
  });

  /* THE RULE THE WHOLE READING RESTS ON. An observation is waiting on somebody
     to say whether it matters. Calling that "late" is what made a list of
     things noticed read as a list of things going wrong. */
  it('never calls an observation late, however old it is', () => {
    const s = at({ tests: [test({ id: 't1' })], items: [item({ testId: 't1' })] });
    expect(row(s, 'observations')).toMatchObject({ open: 1, late: 0 });
  });

  it('never reports more late than open', () => {
    const s = at({
      tests: [test({ plannedFor: '2026-09-01' })],
      materials: [mat({ due: '2026-09-01' })],
      assets: [asset({ dueOn: '2026-09-01' })],
    });
    for (const r of s.rows) expect(r.late).toBeLessThanOrEqual(r.open);
  });
});

describe('whose it is', () => {
  it('names the one who owns most of it, and how many', () => {
    const s = at({
      materials: [mat({ from: 'Brilopak' }), mat({ from: 'Brilopak' }), mat({ from: 'Ilapak UK' })],
    });
    expect(row(s, 'materials')?.whose).toBe('Brilopak × 2');
  });

  it('names a single owner without a count', () => {
    expect(row(at({ materials: [mat({ from: 'Brilopak' })] }), 'materials')?.whose).toBe('Brilopak');
  });

  it('says nothing when nobody is named', () => {
    expect(row(at({ materials: [mat()] }), 'materials')?.whose).toBeUndefined();
  });

  it('reads a machine’s owner off the OEM', () => {
    expect(row(at({ assets: [asset({ oem: 'Ishida Europe' })] }), 'machines')?.whose).toBe('Ishida Europe');
  });
});

describe('the plan', () => {
  it('puts everything that carries a date on one axis, in order', () => {
    const s = at({
      tests: [test({ plannedFor: '2026-09-29' })],
      materials: [mat({ due: '2026-09-24' })],
      programs: [prog({ testOn: '2026-10-06' })],
      assets: [asset({ dueOn: '2026-09-20' })],
    });
    expect(s.plan.map(p => p.kind)).toEqual(['machine', 'material', 'test', 'program']);
  });

  it('leaves out anything with no date rather than inventing one', () => {
    expect(at({ tests: [test()], materials: [mat()], programs: [prog()] }).plan).toEqual([]);
  });

  /* The day it ACTUALLY happened beats the day it was meant to. The gap between
     them is the story, and the plan should show where things really landed. */
  it('draws a thing on the day it actually happened, not the day it was planned', () => {
    const s = at({ tests: [test({ plannedFor: '2026-09-20', ranOn: '2026-09-21', outcome: 'passed' })] });
    expect(s.plan[0]).toMatchObject({ at: '2026-09-21', tone: 'done' });
  });

  it('gives a machine an end date so it draws as a bar, not a point', () => {
    const s = at({ assets: [asset({ state: 'running', onSiteOn: '2026-09-15', runningOn: '2026-09-20' })] });
    expect(s.plan[0]).toMatchObject({ kind: 'machine', at: '2026-09-15', until: '2026-09-20', tone: 'done' });
  });

  it('marks a machine late when its day has gone and it never turned up', () => {
    expect(at({ assets: [asset({ dueOn: '2026-09-01' })] }).plan[0].tone).toBe('late');
  });

  it('calls a test that did not run what it is — the day has gone — rather than still booked or failed', () => {
    const s = at({ tests: [test({ ranOn: '2026-09-16', outcome: 'notRun' })] });
    expect(s.plan[0].tone).toBe('late');
  });

  /* Page 1 of the client report said NOT PROVED for the run that had happened
     and not been called; the chart on page 2 drew it hollow blue — "still
     ahead". It happened, so it is filled; nobody has said whether it was good,
     so it is neither green nor red. */
  it('draws a test that ran and has no verdict yet as its own thing, not as still ahead', () => {
    const s = at({ tests: [test({ plannedFor: '2026-09-20', ranOn: '2026-09-21', result: 'reached 90%' })] });
    expect(s.plan[0]).toMatchObject({ at: '2026-09-21', tone: 'ran' });
  });
});

/* THE SAME RULE AS PAGE 1. The report's first sheet counts a test that did not
   run as still owed and past its day. The second sheet used to drop it —
   isSettled calls the day settled — so one document said "3 past the day" and
   then "2 of them, and they are all Ishida's". */
describe('a test that did not run', () => {
  it('is still to run, and late', () => {
    const s = at({ tests: [test({ plannedFor: '2026-09-18', outcome: 'notRun', withWhom: 'Ilapak UK' })] });
    expect(row(s, 'tests')).toMatchObject({ open: 1, late: 1, whose: 'Ilapak UK' });
  });

  it('is never more late than open', () => {
    const s = at({ tests: [
      test({ plannedFor: '2026-09-18', outcome: 'notRun' }),
      test({ plannedFor: '2026-09-29' }),
    ] });
    expect(row(s, 'tests')).toMatchObject({ open: 2, late: 1 });
  });
});

describe('a fix that did not fix it', () => {
  /* Rowland: "if I change the status from fixed to not fixed, because that's
     what happens, it still falls under done." */
  it('is still outstanding, because the problem is still there', () => {
    const s = at({ tests: [test({
      kind: 'fix', plannedFor: '2026-09-20', ranOn: '2026-09-20', outcome: 'failed',
    })] });
    expect(row(s, 'fixes')?.open).toBe(1);
    expect(s.outstanding).toBe(1);
  });

  it('is late once the day has gone, the same as one never attempted', () => {
    const s = at({ tests: [test({
      kind: 'fix', plannedFor: '2026-09-15', ranOn: '2026-09-15', outcome: 'failed',
    })] });
    expect(row(s, 'fixes')?.late).toBe(1);
  });

  it('drops off the list only when it is actually fixed', () => {
    const s = at({ tests: [test({
      kind: 'fix', plannedFor: '2026-09-20', ranOn: '2026-09-20', outcome: 'passed',
    })] });
    expect(s.rows.find(r => r.key === 'fixes')).toBeUndefined();
    expect(s.outstanding).toBe(0);
  });

  it('did not happen at all — also still outstanding', () => {
    const s = at({ tests: [test({ kind: 'fix', plannedFor: '2026-09-20', outcome: 'notRun' })] });
    expect(row(s, 'fixes')?.open).toBe(1);
  });

  /* A TEST is the other way round and stays that way: it ran, it told you
     something, and what you do about it is a new record. */
  it('leaves a failed TEST settled, which is not the same question', () => {
    const s = at({ tests: [test({ plannedFor: '2026-09-20', ranOn: '2026-09-20', outcome: 'failed' })] });
    expect(s.rows.find(r => r.key === 'tests')).toBeUndefined();
  });
});

describe('one noun, not two', () => {
  /* Rowland, on action versus fix: "I don't think there is a difference — as a
     matter of fact they're just fixes." The table has one row for them now, so
     the same obligation cannot appear in two. */
  it('has no actions row at all', () => {
    const s = at({
      tests: [test({ id: 't1', ranOn: '2026-09-10', outcome: 'passed' })],
      items: [item({ kind: 'next', testId: 't1', what: 'a leftover line' })],
    });
    expect(s.rows.map(r => r.key)).not.toContain('actions');
  });

  it('counts a fix that came out of a test once, under fixes', () => {
    const s = at({
      tests: [
        test({ id: 't1', ranOn: '2026-09-10', outcome: 'passed' }),
        test({ id: 'f1', kind: 'fix', fromTestId: 't1', plannedFor: '2026-10-06' }),
      ],
    });
    expect(row(s, 'fixes')?.open).toBe(1);
    expect(s.outstanding).toBe(1);
  });
});

describe('a fix is the same record wearing different words', () => {
  it('is counted apart from a test, because it is owed by different people', () => {
    const s = at({ tests: [
      test({ plannedFor: '2026-10-06', withWhom: 'Ilapak UK' }),
      test({ kind: 'fix', plannedFor: '2026-10-06', withWhom: 'Brilopak' }),
    ] });
    expect(row(s, 'tests')?.open).toBe(1);
    expect(row(s, 'fixes')?.open).toBe(1);
    expect(row(s, 'tests')?.whose).toBe('Ilapak UK');
    expect(row(s, 'fixes')?.whose).toBe('Brilopak');
  });

  it('goes on the plan in its own lane', () => {
    const s = at({ tests: [test({ kind: 'fix', plannedFor: '2026-10-06' })] });
    expect(s.plan.map(p => p.kind)).toEqual(['fix']);
  });
});

describe('a plan that is a block of days, not one day', () => {
  /* Rowland: "sometimes it's a block, it's like a week commencing." */
  it('is not late until the LAST day has gone', () => {
    const inside = at({ tests: [test({ plannedFor: '2026-09-21', plannedTo: '2026-09-25' })] });
    expect(row(inside, 'tests')?.late).toBe(0);

    const past = at({ tests: [test({ plannedFor: '2026-09-15', plannedTo: '2026-09-19' })] });
    expect(row(past, 'tests')?.late).toBe(1);
  });

  it('would have been late on the old single-date rule, and is not now', () => {
    /* today is 2026-09-22 in these tests: the 21st has gone, the 25th has not. */
    const s = at({ tests: [test({ plannedFor: '2026-09-21', plannedTo: '2026-09-25' })] });
    expect(s.late).toBe(0);
    expect(s.sentence).toContain('none of it late');
  });

  it('draws as a bar on the plan — the shape a machine already uses', () => {
    const s = at({ tests: [test({ plannedFor: '2026-09-21', plannedTo: '2026-09-25' })] });
    expect(s.plan[0]).toMatchObject({ at: '2026-09-21', until: '2026-09-25' });
  });

  it('draws the days it TOOK once it has run, not the ones it was booked for', () => {
    const s = at({ tests: [test({
      plannedFor: '2026-09-01', plannedTo: '2026-09-05',
      ranOn: '2026-09-08', ranTo: '2026-09-10', outcome: 'passed',
    })] });
    expect(s.plan[0]).toMatchObject({ at: '2026-09-08', until: '2026-09-10' });
  });

  it('is a point, not a bar, when the window is one day', () => {
    const s = at({ tests: [test({ plannedFor: '2026-09-21', plannedTo: '2026-09-21' })] });
    expect(s.plan[0]!.until).toBeUndefined();
  });
});

describe('a machine and the day it was wanted', () => {
  /* `dueOn` is the day it was expected ON SITE. The plan and the table read
     the same record, and for a while they disagreed about this one. */
  it('is not late once it has landed, however far off running it is', () => {
    const s = at({ assets: [asset({ state: 'installed', dueOn: '2026-09-01', onSiteOn: '2026-09-03' })] });
    const row = s.rows.find(r => r.key === 'machines')!;
    expect(row.open).toBe(1);
    expect(row.late).toBe(0);
    expect(s.late).toBe(0);
  });

  it('is late when the day has gone and it has not arrived', () => {
    const s = at({ assets: [asset({ state: 'awaited', dueOn: '2026-09-01' })] });
    expect(s.rows.find(r => r.key === 'machines')!.late).toBe(1);
  });

  it('draws it on the plan the same way the table counts it', () => {
    const s = at({ assets: [asset({ state: 'installed', dueOn: '2026-09-01', onSiteOn: '2026-09-03' })] });
    expect(s.plan.find(m => m.kind === 'machine')!.tone).toBe('booked');
    expect(s.rows.find(r => r.key === 'machines')!.late).toBe(0);
  });
});

describe('the sentence', () => {
  it('leads on the date, because that is the question that was asked', () => {
    const s = at({ materials: [mat({ due: '2026-09-29' })], expectedAt: '2026-10-06' });
    expect(s.sentence).toBe('14 days to go, with 1 thing outstanding — none of it late.');
  });

  it('names the one who owns the late work', () => {
    const s = at({
      materials: [mat({ due: '2026-09-01', from: 'Brilopak' }), mat({ due: '2026-09-02', from: 'Brilopak' })],
      expectedAt: '2026-10-06',
    });
    expect(s.sentence).toBe(
      '14 days to go, with 2 things outstanding — 2 of them are past the day it was wanted, and they are all Brilopak’s.',
    );
  });

  /* A whole-string assertion on purpose. Every late case here was written with
     `toContain`, and that is exactly how the dashboard came to read "1 one is
     past the day it was wanted" without a test going red. */
  it('counts one late thing in words, not "1 one"', () => {
    const s = at({ materials: [mat({ due: '2026-09-01', from: 'Brilopak' })], expectedAt: '2026-10-06' });
    expect(s.sentence).toBe(
      '14 days to go, with 1 thing outstanding — one is past the day it was wanted, and it is Brilopak’s.',
    );
  });

  it('is one day past the date, not "1 days"', () => {
    const s = at({ materials: [mat({ due: '2026-09-29' })], expectedAt: '2026-09-21' });
    expect(s.sentence).toContain('1 day past the date');
    expect(s.sentence).not.toContain('1 days');
  });

  /* Ishida owned three of the four open tests; the one late one was Ilapak's.
     The headline read "and they are all Ishida Europe's", off who owned most
     of the OPEN work. The late name is the one the sentence is about. */
  it('blames whoever owns the LATE work, not whoever owns most of the open work', () => {
    const s = at({
      tests: [
        test({ plannedFor: '2026-09-18', outcome: 'notRun', withWhom: 'Ilapak UK' }),
        test({ plannedFor: '2026-09-29', withWhom: 'Ishida Europe' }),
        test({ plannedFor: '2026-09-30', withWhom: 'Ishida Europe' }),
        test({ plannedFor: '2026-10-01', withWhom: 'Ishida Europe' }),
      ],
      expectedAt: '2026-10-06',
    });
    expect(row(s, 'tests')).toMatchObject({ whose: 'Ishida Europe × 3', lateWhose: 'Ilapak UK' });
    expect(s.sentence).toBe(
      '14 days to go, with 4 things outstanding — one is past the day it was wanted, and it is Ilapak UK’s.',
    );
  });

  it('names nobody when the late work in one row is split', () => {
    const s = at({
      tests: [
        test({ plannedFor: '2026-09-18', outcome: 'notRun', withWhom: 'Ilapak UK' }),
        test({ plannedFor: '2026-09-17', outcome: 'notRun', withWhom: 'Ilapak UK' }),
        test({ plannedFor: '2026-09-16', outcome: 'notRun', withWhom: 'Ishida Europe' }),
      ],
    });
    expect(s.sentence).toContain('3 of them are past the day it was wanted.');
    expect(s.sentence).not.toContain('Ilapak');
  });

  it('does not name anybody when the late work is spread between them', () => {
    const s = at({
      materials: [mat({ due: '2026-09-01', from: 'Brilopak' })],
      programs: [prog({ testOn: '2026-09-01', from: 'Ilapak UK' })],
    });
    expect(s.sentence).not.toContain('Brilopak');
    expect(s.sentence).toContain('past the day');
  });

  it('says the date has gone rather than counting backwards to it', () => {
    const s = at({ materials: [mat({ due: '2026-09-29' })], expectedAt: '2026-09-15' });
    expect(s.sentence).toContain('7 days past the date');
  });

  it('says nothing is outstanding when nothing is', () => {
    const s = at({ tests: [test({ outcome: 'passed' })] });
    expect(s.sentence).toBe('Nothing outstanding. 1 of 1 tests have run.');
  });

  it('does not pretend there is a job when nothing has been planned', () => {
    expect(at().sentence).toBe('Nothing outstanding, and nothing planned yet.');
  });

  /* The baseline is written once and never follows the forecast around — see
     types.ts. The gap between them IS the slip, and it is the number a client
     asks about second. */
  it('measures the slip from the baseline, not from today', () => {
    const s = at({ plannedAt: '2026-09-29', expectedAt: '2026-10-06' });
    expect(s.slipDays).toBe(7);
  });

  it('has no slip to report when only one of the two dates is set', () => {
    expect(at({ expectedAt: '2026-10-06' }).slipDays).toBeUndefined();
  });
});
