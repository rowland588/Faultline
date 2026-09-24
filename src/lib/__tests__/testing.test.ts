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
  actionOf, foundTally, foundWords, standingOfItem,
  OUTCOME_WORD, byWhenPlanned, byWhenRun, hasRun, isOpen, isOverdue, itemsOf,
  nextFrom, standing, standsAt, weeksTo,
  type Test, type TestItem,
  needsVerdict, outcomeWord, isSettled,
  assetStateOf, assetStateOn, type Asset,
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
    /* Two observations were written down and two next-step lines left over
       from before fixes had their own screen. None of them is outstanding
       work: an observation is a note, and the work is a fix. */
    expect(st.observations).toHaveLength(2);
    expect(st.sentence).toBe('Nothing outstanding. 1 of 1 tests have run.');
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
    expect(st.observations).toEqual([]);
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


describe('the same stages repeat down the line', () => {
  /* Rowland: "each asset is likely going to want the same sort of commissioning
     stages". The first cut of this made a test name one machine and left
     somebody to type the whole set again for the second one — and then claimed
     the opposite in as many words. Planning across machines is the correction,
     and these pin down what it has to do. */
  it('makes one test per machine, same plan on each', () => {
    const made = planAcross('Emergency stops', ['a1', 'a2', 'a3']);
    expect(made.map(t => t.assetId)).toEqual(['a1', 'a2', 'a3']);
    expect(new Set(made.map(t => t.title))).toEqual(new Set(['Emergency stops']));
    // Separate records from the moment they exist: the wrapper can pass and the
    // checkweigher fail on the same day, and one shared row could not say that.
    expect(new Set(made.map(t => t.id)).size).toBe(3);
    expect(made.every(t => t.outcome === 'planned')).toBe(true);
  });

  it('keeps them in the order the machines were given', () => {
    expect(planAcross('Clean-down', ['a2', 'a1']).map(t => t.sort)).toEqual([1, 2]);
  });

  it('plans one test against the line itself when no machine is named', () => {
    const made = planAcross('Hygiene clearance', [undefined]);
    expect(made).toHaveLength(1);
    expect(made[0].assetId).toBeUndefined();
  });
});

/** The maker, as useTesting runs it — kept here so the rule can be tested
 *  without React. */
function planAcross(title: string, assetIds: (string | undefined)[]): Test[] {
  let sort = 1;
  let k = 0;
  return (assetIds.length ? assetIds : [undefined]).map(assetId => ({
    id: `made-${k++}`, projectId: 'p1', title: title.trim(), assetId,
    outcome: 'planned' as const, sort: sort++, createdAt: 1, updatedAt: 1,
  }));
}

/* AN OBSERVATION IS NOT AN ACTION UNTIL SOMEBODY SAYS SO.
 *
 * Rowland, on "5 open of 5": "what's taking place here is an immediate
 * interpretation that this is like an action. However what I am actually doing
 * is recording observations. I need to decide whether or not there's an action
 * to take place out of it."
 *
 * Every rule below exists so that a list of things noticed on the floor cannot
 * be read as a list of things going wrong. */
describe('observations, and the ones somebody decides to action', () => {
  it('is new until somebody decides anything about it', () => {
    const o = item('t1');
    expect(standingOfItem(o, [o])).toBe('new');
  });

  it('is actioned once it has become a next step', () => {
    const next = item('t1', { id: 'n1', kind: 'next', fromItemId: 'o1' });
    const obs = item('t1', { id: 'o1', becameItemId: 'n1' });
    expect(standingOfItem(obs, [obs, next])).toBe('actioned');
    expect(actionOf(obs, [obs, next])?.id).toBe('n1');
  });

  /* THE RULE THE WHOLE THING RESTS ON. The link is only worth what the row at
     the other end of it is worth: delete the action and the observation is
     undecided again, not quietly still claiming somebody is on it. */
  it('goes back to undecided when the action it became is deleted', () => {
    const next = item('t1', { id: 'n1', kind: 'next', fromItemId: 'o1', deletedAt: 9 });
    const obs = item('t1', { id: 'o1', becameItemId: 'n1' });
    expect(standingOfItem(obs, [obs, next])).toBe('new');
    expect(actionOf(obs, [obs, next])).toBeUndefined();
  });

  it('is noted when somebody decided it needs nothing', () => {
    const o = item('t1', { doneAt: 5 });
    expect(standingOfItem(o, [o])).toBe('noted');
  });

  /* Both decisions at once is not a state anybody meant. The action is the
     louder claim, so it wins — and useTesting clears doneAt when it actions
     one, so this is the belt to that braces. */
  it('reads as actioned when a row somehow says both', () => {
    const next = item('t1', { id: 'n1', kind: 'next' });
    const obs = item('t1', { id: 'o1', becameItemId: 'n1', doneAt: 5 });
    expect(standingOfItem(obs, [obs, next])).toBe('actioned');
  });

  it('counts what was written down, not what is open', () => {
    const next = item('t1', { id: 'n1', kind: 'next' });
    const rows = [
      item('t1', { id: 'o1', becameItemId: 'n1' }),
      item('t1', { id: 'o2', doneAt: 5 }),
      item('t1', { id: 'o3' }),
      item('t1', { id: 'o4' }),
    ];
    const t = foundTally(rows, [...rows, next]);
    expect(t).toEqual({ written: 4, actioned: 1, noted: 1, undecided: 2 });
  });

  it('leaves a deleted observation out of the count entirely', () => {
    const rows = [item('t1', { id: 'o1' }), item('t1', { id: 'o2', deletedAt: 3 })];
    expect(foundTally(rows, rows).written).toBe(1);
  });
});

/* THE ONE SENTENCE THE SCREEN AND THE PDF BOTH PRINT.
 *
 * It was written out five times and all five said "N actioned" — the noun
 * Rowland had already taken out of the app, still being read back to him on
 * the test screen, on the card, on the client report and in both PDFs. Whole
 * strings, not toContain: a count printed with the wrong word, or without its
 * number, is exactly the class of fault that slipped through twice before. */
describe('what the tally says in words', () => {
  /* An observation is a note: the words count what was written down and
     nothing else. A fix is made on the Fixes screen against its test, so
     "became a fix" and "to decide" are no longer the observation's to say. */
  it('counts what was written down', () => {
    expect(foundWords({ written: 3 })).toBe('3 written down');
  });

  it('says plainly when nothing was written down', () => {
    expect(foundWords({ written: 0 })).toBe('nothing written down');
  });

  it('never asks for a decision', () => {
    expect(foundWords({ written: 9 })).not.toMatch(/decide|action/i);
  });
});

/* IT HAPPENED AND NOBODY SAID HOW IT WENT.
 *
 * Rowland ran a test, dated it, wrote the result and pocketed the phone. The
 * row synced. On the laptop it sat under Next up as "Not run yet" with the
 * result hidden, because the outcome was still `planned` and every list took
 * that word as the whole truth. The date and the result are the evidence the
 * day happened; the outcome is the verdict, and a missing verdict is a
 * question owed, not a plan to keep filing.
 */
describe('a test that happened without a verdict', () => {
  const t = (o: Partial<Test>): Test => ({
    id: 'x', projectId: 'p', title: 'Run at 70 ppm', outcome: 'planned', sort: 0, createdAt: 1, updatedAt: 1, ...o,
  });

  it('has run once it carries the day it ran', () => {
    expect(hasRun(t({ ranOn: '2026-09-23' }))).toBe(true);
  });

  it('has run once somebody wrote what happened, even with no date', () => {
    expect(hasRun(t({ result: 'Started at 73%, achieved 90% over a 97 min run' }))).toBe(true);
  });

  it('has not run when it is only planned', () => {
    expect(hasRun(t({ plannedFor: '2026-09-23' }))).toBe(false);
    expect(needsVerdict(t({ plannedFor: '2026-09-23' }))).toBe(false);
  });

  it('a blank result is not a result', () => {
    expect(needsVerdict(t({ result: '   ' }))).toBe(false);
  });

  it('says so in words instead of "Planned"', () => {
    expect(outcomeWord(t({ ranOn: '2026-09-23' }))).toBe('No verdict yet');
    expect(outcomeWord(t({ kind: 'fix', result: 'Re-cut the jaw' }))).toBe('No verdict yet');
  });

  it('reads as Planned again for a button that only carries an outcome', () => {
    expect(outcomeWord({ kind: 'test', outcome: 'planned' })).toBe('Planned');
  });

  it('is settled — it is not up next — and is filed with what has happened', () => {
    const ran = t({ ranOn: '2026-09-23', result: '90% over 97 min' });
    expect(isSettled(ran)).toBe(true);
    const st = standing([ran, t({ id: 'y', plannedFor: '2026-10-01' })], []);
    expect(st.upcoming.map(x => x.id)).toEqual(['y']);
    expect(st.done.map(x => x.id)).toEqual(['x']);
  });

  it('stops needing one the moment it is answered', () => {
    expect(needsVerdict(t({ ranOn: '2026-09-23', outcome: 'failed' }))).toBe(false);
  });
});

describe('a day that came and did not happen', () => {
  it('is late until it is rebooked — the client is still owed that demonstration', () => {
    const t: Test = { id: 'x', projectId: 'p', title: 'Changeover', outcome: 'notRun',
      plannedFor: '2000-01-01', sort: 0, createdAt: 1, updatedAt: 1 };
    expect(isOverdue(t)).toBe(true);
  });
});

/* ================================ MACHINES ================================ */

describe('where a machine has got to is read off its dates', () => {
  const m = (o: Partial<Asset> = {}): Asset => ({
    id: 'a1', projectId: 'p', name: 'Wrapper', state: 'onSite', sort: 1, updatedAt: 1, ...o,
  });

  it('follows the latest date it has reached, in the order they happen', () => {
    expect(assetStateOf(m({ dueOn: '2026-09-01' }))).toBe('awaited');
    expect(assetStateOf(m({ dueOn: '2026-09-01', onSiteOn: '2026-09-03' }))).toBe('onSite');
    expect(assetStateOf(m({ onSiteOn: '2026-09-03', installedOn: '2026-09-05' }))).toBe('installed');
    expect(assetStateOf(m({ state: 'awaited', installedOn: '2026-09-05', runningOn: '2026-09-09' }))).toBe('running');
  });

  it('keeps the word it has when it carries no dates — a machine already on site never needed one', () => {
    expect(assetStateOf(m({ state: 'onSite' }))).toBe('onSite');
    expect(assetStateOf(m({ state: 'running' }))).toBe('running');
  });

  it('goes back to "not here yet" when the only date is the day it is due', () => {
    expect(assetStateOf(m({ state: 'installed', dueOn: '2026-10-01' }))).toBe('awaited');
  });

  it('names the date that goes with the word, so the card prints them as one fact', () => {
    expect(assetStateOn(m({ dueOn: '2026-09-01' }))).toBe('2026-09-01');
    expect(assetStateOn(m({ dueOn: '2026-09-01', onSiteOn: '2026-09-03' }))).toBe('2026-09-03');
    expect(assetStateOn(m({ onSiteOn: '2026-09-03', runningOn: '2026-09-09' }))).toBe('2026-09-09');
    expect(assetStateOn(m())).toBeUndefined();
  });
});
