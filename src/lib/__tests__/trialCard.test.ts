/* READING ONE TRIAL BACK, WHOLE.
 *
 * The card and the client report both draw from this, so a mistake here is a
 * mistake in two documents that go to two different rooms. Every rule below is
 * one the drawing cannot check for itself.
 */
import { describe, it, expect } from 'vitest';
import { trialCard, verdictLine, headlineNext } from '../trialCard';
import type { Asset, Test, TestItem } from '../testing';

const test = (over: Partial<Test> = {}): Test => ({
  id: 't1', projectId: 'p1', title: 'Run the BU at 75 a minute for 1 hr',
  outcome: 'planned', sort: 1, createdAt: 1, updatedAt: 1, ...over,
});

let n = 0;
const item = (over: Partial<TestItem> = {}): TestItem => {
  n += 1;
  return {
    id: `i${n}`, projectId: 'p1', testId: 't1', kind: 'found', what: `Item ${n}`,
    sort: n, createdAt: 1, updatedAt: 1, ...over,
  };
};

const asset = (id: string, name: string): Asset =>
  ({ id, projectId: 'p1', name, state: 'running', sort: 1, updatedAt: 1 });

describe('what a trial card carries', () => {
  it('keeps the plan and the day as two separate readings', () => {
    /* THE RULE THE WHOLE MODEL RESTS ON. The gap between what you meant to run
       and what you ran is usually the story; a card that folded them together
       would report that every day went to plan. */
    const c = trialCard(test({
      outcome: 'failed', plannedFor: '2026-09-20', ranOn: '2026-09-21',
      planned: 'Finest Red 2kg', product: 'All Rounder 2kg',
      passesIf: '0 leaks in 20', result: '3 leaked in 20',
    }), [], [], []);
    expect(c.plannedFor).toBe('2026-09-20');
    expect(c.ranOn).toBe('2026-09-21');
    expect(c.plannedProduct).toBe('Finest Red 2kg');
    expect(c.product).toBe('All Rounder 2kg');
  });

  it('falls back to the planned product when nobody said what actually ran', () => {
    const c = trialCard(test({ planned: 'Finest Red 2kg' }), [], [], []);
    expect(c.product).toBe('Finest Red 2kg');
  });

  it('names the machine, or says it was the line', () => {
    expect(trialCard(test({ assetId: 'a1' }), [], [], [asset('a1', 'Ilapak')]).machine).toBe('Ilapak');
    expect(trialCard(test(), [], [], []).machine).toBe('the line');
  });

  it('leaves another trial’s observations out of it', () => {
    const rows = [item({ testId: 't1' }), item({ testId: 't2' })];
    expect(trialCard(test(), [], rows, []).findings).toHaveLength(1);
  });

  it('leaves a deleted observation out of it', () => {
    const rows = [item(), item({ deletedAt: 9 })];
    expect(trialCard(test(), [], rows, []).findings).toHaveLength(1);
  });
});

describe('what somebody decided about each observation', () => {
  it('says which FIX an observation became, by name', () => {
    const mine = test({ id: 't1' });
    const fix = test({ id: 'f1', kind: 'fix', title: 'Fit the new jaw heater', fromTestId: 't1' });
    const obs = item({ id: 'o1', testId: 't1', what: 'Jaw running cold', becameTestId: 'f1' });
    const c = trialCard(mine, [mine, fix], [obs], []);
    const f = c.findings.find(x => x.what === 'Jaw running cold')!;
    expect(f.decision).toBe('a fix');
    expect(f.action).toBe('Fit the new jaw heater');
  });

  /* An observation you turned into a fix is DECIDED. It only ever followed the
     old line-under-a-test link, so a finding already dealt with went on being
     counted under "observations to decide on". */
  it('does not still call it undecided once it became a fix', () => {
    const mine = test({ id: 't1' });
    const fix = test({ id: 'f1', kind: 'fix', title: 'Fit it', fromTestId: 't1' });
    const obs = item({ id: 'o1', testId: 't1', becameTestId: 'f1' });
    expect(trialCard(mine, [mine, fix], [obs], []).found.undecided).toBe(0);
  });

  it('calls an undecided one what it is, rather than open', () => {
    expect(trialCard(test(), [], [item({ what: 'Seal drifting' })], []).findings[0].decision)
      .toBe('to decide');
  });

  it('says it was not a problem when somebody decided that', () => {
    expect(trialCard(test(), [], [item({ doneAt: 5 })], []).findings[0].decision)
      .toBe('not a problem');
  });

  it('counts what was written down, not what is open', () => {
    const next = item({ id: 'n1', kind: 'next' });
    const rows = [
      item({ id: 'o1', becameItemId: 'n1' }),
      item({ id: 'o2', doneAt: 5 }),
      item({ id: 'o3' }),
    ];
    expect(trialCard(test(), [], [...rows, next], []).found)
      .toEqual({ written: 3, actioned: 1, undecided: 1 });
  });
});

describe('what we do next', () => {
  /* WHAT COMES NEXT IS A LIST OF RECORDS NOW. An agreed next step is a FIX with
     its own days and its own page, so the card reads the tests that came out of
     this one rather than lines underneath it. */
  it('says where each one came from, and which are fixes', () => {
    const mine = test({ id: 't1' });
    const typed = test({ id: 'f1', kind: 'fix', title: 'Typed in', fromTestId: 't1', sort: 1 });
    const found = test({ id: 'f2', kind: 'fix', title: 'From a finding', fromTestId: 't1', sort: 2 });
    const retest = test({ id: 't2', title: 'Became a test', fromTestId: 't1', sort: 3 });
    const obs = item({ id: 'o1', kind: 'found', testId: 't1', becameTestId: 'f2' });
    const c = trialCard(mine, [mine, typed, found, retest], [obs], []);
    expect(c.next.map(x => [x.what, x.fromFinding, x.becameTest])).toEqual([
      ['Typed in', false, false],
      ['From a finding', true, false],
      ['Became a test', false, true],
    ]);
  });

  it('counts only what is still to do', () => {
    const mine = test({ id: 't1' });
    const out = [
      test({ id: 'f1', kind: 'fix', fromTestId: 't1' }),
      test({ id: 'f2', kind: 'fix', fromTestId: 't1', ranOn: '2026-09-10', outcome: 'passed' }),
    ];
    expect(trialCard(mine, [mine, ...out], [], []).openNext).toBe(1);
  });

  it('carries whose it is and the day it is wanted by', () => {
    const mine = test({ id: 't1' });
    const fix = test({
      id: 'f1', kind: 'fix', fromTestId: 't1',
      withWhom: 'Ilapak UK', plannedFor: '2026-10-05', plannedTo: '2026-10-09',
    });
    /* The day it is wanted BY is the LAST of a block, not the first. */
    expect(trialCard(mine, [mine, fix], [], []).next[0])
      .toMatchObject({ owner: 'Ilapak UK', due: '2026-10-09' });
  });

  /* The headline is what HAPPENS next, so one already done is not it. */
  it('leads on the first one still outstanding', () => {
    const mine = test({ id: 't1' });
    const out = [
      test({ id: 'f1', kind: 'fix', title: 'Already done', fromTestId: 't1', ranOn: '2026-09-01', outcome: 'passed', sort: 1 }),
      test({ id: 'f2', kind: 'fix', title: 'Still to do', fromTestId: 't1', sort: 2 }),
    ];
    expect(headlineNext(trialCard(mine, [mine, ...out], [], []))?.what).toBe('Still to do');
  });

  it('falls back to a done one rather than saying nothing is next', () => {
    const mine = test({ id: 't1' });
    const done = test({ id: 'f1', kind: 'fix', title: 'Already done', fromTestId: 't1', ranOn: '2026-09-01', outcome: 'passed' });
    expect(headlineNext(trialCard(mine, [mine, done], [], []))?.what).toBe('Already done');
  });
});

describe('the loop', () => {
  it('reads backwards to what it followed and forwards to what came of it', () => {
    const before = test({ id: 't0', title: 'First go' });
    const mine = test({ id: 't1', fromTestId: 't0' });
    const after = test({ id: 't2', title: 'Re-test', fromTestId: 't1' });
    const c = trialCard(mine, [before, mine, after], [], []);
    expect(c.follows).toBe('First go');
    expect(c.ledTo).toEqual(['Re-test']);
  });

  it('does not follow a trial that has been deleted', () => {
    const before = test({ id: 't0', title: 'First go', deletedAt: 4 });
    const mine = test({ id: 't1', fromTestId: 't0' });
    expect(trialCard(mine, [before, mine], [], []).follows).toBeUndefined();
  });
});

describe('the one line a client reads', () => {
  /* "Didn't pass" on its own is a verdict nobody can check. What it was meant
     to do, or what it actually did, is the line that means something. */
  /* The card already prints the expectation on the line above, and the day it
     is booked for on its own meta line. Repeating the expectation here read as
     the report having nothing to say, twice. */
  it('says a trial that has not happened has not happened', () => {
    expect(verdictLine(trialCard(test({ passesIf: 'Holds 75 ppm for an hour' }), [], [], [])))
      .toBe('Not run yet');
  });

  it('gives what happened once the day has happened', () => {
    expect(verdictLine(trialCard(test({ outcome: 'failed', result: '3 leaked in 20' }), [], [], [])))
      .toBe('3 leaked in 20');
  });

  it('says the day did not happen, rather than calling it a result', () => {
    expect(verdictLine(trialCard(test({ outcome: 'notRun' }), [], [], [])))
      .toBe('The day came and it did not happen');
  });

  it('falls back to the outcome word when nobody wrote anything down', () => {
    expect(verdictLine(trialCard(test({ outcome: 'passed' }), [], [], [])))
      .toBe('Passed');
  });

});
