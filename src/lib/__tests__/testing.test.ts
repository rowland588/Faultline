/* THE CYCLE, AND THE FEW RULES IN IT.
 *
 * There is one record and two lists under it, so there is not much to test —
 * which is the point. What IS worth pinning down is the handful of decisions
 * that five earlier rebuilds kept getting wrong:
 *
 *   the plan is not rewritten by the day
 *   "didn't run" is a real answer, and not the same as still being planned
 *   the sentence at the top is derived, and says what a person would say
 *   a next step becomes the next test, and that link survives
 */
import { describe, it, expect } from 'vitest';
import {
  OUTCOME_WORD, byWhenPlanned, byWhenRun, hasRun, isOpen, isOverdue, itemsOf,
  nextFrom, standing, standsAt, weeksTo,
  type Test, type TestItem,
} from '../testing';

const DAY = 86_400_000;
const iso = (d: number) => new Date(Date.now() + d * DAY).toISOString().slice(0, 10);

let n = 0;
const test = (over: Partial<Test> = {}): Test => {
  n += 1;
  return {
    id: `t${n}`, projectId: 'p1', title: `Test ${n}`,
    outcome: 'planned', sort: n, createdAt: 1, updatedAt: 1, ...over,
  };
};
const item = (testId: string, over: Partial<TestItem> = {}): TestItem => {
  n += 1;
  return {
    id: `i${n}`, projectId: 'p1', testId, kind: 'found', what: `Item ${n}`,
    sort: n, createdAt: 1, updatedAt: 1, ...over,
  };
};

describe('a test is planned, then the day happens', () => {
  it('is not run until it says so, and planned is not an outcome the day gave', () => {
    expect(hasRun(test())).toBe(false);
    expect(hasRun(test({ outcome: 'passed' }))).toBe(true);
    expect(hasRun(test({ outcome: 'failed' }))).toBe(true);
    // "The day came and it did not happen" is a real answer about a real day.
    expect(hasRun(test({ outcome: 'notRun' }))).toBe(true);
    expect(OUTCOME_WORD.notRun).toBe('Didn’t run');
  });

  it('KEEPS THE PLAN AND THE DAY APART', () => {
    /* The day is fluid: it slips, and what goes down the machine is often not
       what was written down. Both are recorded rather than corrected, because
       the gap between them is usually the story — and one field that quietly
       followed the result around would always report that everything went to
       plan. */
    const t = test({
      plannedFor: iso(-5), planned: 'Finest Red 2kg',
      ranOn: iso(-2), product: 'Jacks Piper 2kg',
      outcome: 'passed',
    });
    expect(t.plannedFor).not.toBe(t.ranOn);
    expect(t.planned).not.toBe(t.product);
  });

  it('is overdue only when the day has gone and it still has not run', () => {
    expect(isOverdue(test({ plannedFor: iso(-3) }))).toBe(true);
    expect(isOverdue(test({ plannedFor: iso(3) }))).toBe(false);
    // It ran late rather than being overdue — the day happened.
    expect(isOverdue(test({ plannedFor: iso(-3), ranOn: iso(-1), outcome: 'passed' }))).toBe(false);
    // No date is not late. Nothing to be late against.
    expect(isOverdue(test({}))).toBe(false);
  });

  it('says where it stands in its own terms', () => {
    expect(standsAt(test({ passesIf: '65 ppm for 30 minutes' }))).toBe('Passes if: 65 ppm for 30 minutes');
    expect(standsAt(test({ outcome: 'passed', result: '68 ppm' }))).toBe('68 ppm');
    expect(standsAt(test({ outcome: 'notRun' }))).toBe('The day came and it did not happen');
  });

  it('reads past tests backwards and planned ones forwards', () => {
    /* A list of what happened reads back from today; a list of what is coming
       reads forwards. The same order in both would put the thing you are about
       to do at the bottom of the screen. */
    const older = test({ ranOn: '2026-09-01', outcome: 'passed' });
    const newer = test({ ranOn: '2026-09-10', outcome: 'passed' });
    expect([older, newer].sort(byWhenRun).map(t => t.ranOn)).toEqual(['2026-09-10', '2026-09-01']);

    const soon = test({ plannedFor: '2026-09-22' });
    const later = test({ plannedFor: '2026-10-05' });
    expect([later, soon].sort(byWhenPlanned).map(t => t.plannedFor)).toEqual(['2026-09-22', '2026-10-05']);

    // A planned test with no date sorts last rather than first.
    const undated = test({});
    expect([undated, soon].sort(byWhenPlanned)[0].plannedFor).toBe('2026-09-22');
  });
});

describe('what hangs off a test', () => {
  it('keeps what we found and what we do next apart, in their own order', () => {
    const items = [
      item('t-a', { kind: 'next', what: 'Fit the heater', sort: 2 }),
      item('t-a', { kind: 'found', what: 'Jaw drifting', sort: 1 }),
      item('t-a', { kind: 'next', what: 'Re-track the film', sort: 1 }),
      item('t-b', { kind: 'found', what: 'Not this test', sort: 1 }),
    ];
    expect(itemsOf(items, 't-a', 'found').map(i => i.what)).toEqual(['Jaw drifting']);
    expect(itemsOf(items, 't-a', 'next').map(i => i.what)).toEqual(['Re-track the film', 'Fit the heater']);
  });

  it('is open until it is done', () => {
    expect(isOpen(item('t1'))).toBe(true);
    expect(isOpen(item('t1', { doneAt: 5 }))).toBe(false);
  });

  it('leaves deleted rows out', () => {
    const items = [item('t1', { what: 'Real' }), item('t1', { what: 'Gone', deletedAt: 9 })];
    expect(itemsOf(items, 't1', 'found').map(i => i.what)).toEqual(['Real']);
  });
});

describe('where are we — the sentence, derived', () => {
  it('says so plainly when there is nothing yet', () => {
    expect(standing([], []).sentence).toBe('Nothing planned yet. Plan the first test.');
  });

  it('counts what is open, not what has been recorded', () => {
    const t = test({ outcome: 'failed' });
    const st = standing([t], [
      item(t.id, { kind: 'found' }),
      item(t.id, { kind: 'found', doneAt: 5 }),
      item(t.id, { kind: 'next' }),
      item(t.id, { kind: 'next', doneAt: 5 }),
    ]);
    expect(st.openFindings).toHaveLength(1);
    expect(st.openNext).toHaveLength(1);
    expect(st.sentence).toBe('1 issue still open and 1 next step outstanding are in the way. 1 of 1 tests have run.');
  });

  it('says nothing is outstanding when nothing is', () => {
    const t = test({ outcome: 'passed' });
    expect(standing([t], []).sentence).toBe('Nothing outstanding. 1 of 1 tests have run.');
  });

  it('says how many are planned before any have run', () => {
    expect(standing([test(), test()], []).sentence).toBe('2 tests planned, none run yet.');
  });

  it('ignores items whose test has been deleted', () => {
    /* Otherwise deleting a test leaves its findings counted against a job
       forever, with no screen that can show them. */
    const gone = test({ deletedAt: 3, outcome: 'failed' });
    const st = standing([gone], [item(gone.id, { kind: 'found' })]);
    expect(st.openFindings).toEqual([]);
    expect(st.total).toBe(0);
  });

  it('splits what is coming from what has happened', () => {
    const st = standing([
      test({ outcome: 'passed', ranOn: iso(-2) }),
      test({ plannedFor: iso(4) }),
      test({ outcome: 'notRun', ranOn: iso(-1) }),
    ], []);
    expect(st.ran).toBe(2);
    expect(st.passed).toBe(1);
    expect(st.upcoming).toHaveLength(1);
  });
});

describe('the loop — a test comes out of the last one', () => {
  it('carries the machine, the product and the expectation forward', () => {
    const done = test({
      title: 'Seal integrity', assetId: 'a1', withWhom: 'Ilapak UK',
      planned: 'Finest Red 2kg', product: 'Jacks Piper 2kg',
      passesIf: '0 leaks in 20', outcome: 'failed',
    });
    const next = nextFrom(done, () => 'new-id', 500);

    expect(next.assetId).toBe('a1');
    expect(next.withWhom).toBe('Ilapak UK');
    expect(next.passesIf).toBe('0 leaks in 20');
    // What ACTUALLY ran carries forward, not what was planned to: the re-test is
    // of the thing that failed.
    expect(next.planned).toBe('Jacks Piper 2kg');
    expect(next.fromTestId).toBe(done.id);
    expect(next.outcome).toBe('planned');
    // And nothing from the day comes with it.
    expect(next.ranOn).toBeUndefined();
    expect(next.product).toBeUndefined();
    expect(next.result).toBeUndefined();
  });

  it('falls back to the planned product when the day never happened', () => {
    const skipped = test({ planned: 'Finest Red 2kg', outcome: 'notRun' });
    expect(nextFrom(skipped, () => 'x', 1).planned).toBe('Finest Red 2kg');
  });

  it('lets a next step become a test IN ITS OWN WORDS', () => {
    /* "Re-track the film — re-test" is not a thing anybody agreed to do. The
       step becoming a test is that work, not a re-run of the test that found it;
       only a plain re-test gets named one. */
    const failed = test({ title: 'Seal integrity', outcome: 'failed' });
    expect(nextFrom(failed, () => 'x', 1, 'Re-track the film and re-splice').title)
      .toBe('Re-track the film and re-splice');
    expect(nextFrom(failed, () => 'x', 1).title).toBe('Seal integrity — re-test');
    // Whitespace is not a title.
    expect(nextFrom(failed, () => 'x', 1, '   ').title).toBe('Seal integrity — re-test');
  });
});

describe('the arithmetic a heading is made of', () => {
  it('counts whole weeks to a date, and says when it has gone', () => {
    const today = new Date('2026-09-20T09:00:00Z');
    expect(weeksTo('2026-10-25', today)).toBe(5);
    expect(weeksTo('2026-09-13', today)).toBe(-1);
    expect(weeksTo(undefined, today)).toBeUndefined();
  });
});
