/* READING ONE TRIAL BACK, WHOLE.
 *
 * The card and the GM report both draw from this, so a mistake here is a
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
  it('says which action an observation became, by name', () => {
    const next = item({ id: 'n1', kind: 'next', what: 'Fit the new jaw heater' });
    const obs = item({ id: 'o1', what: 'Jaw running cold', becameItemId: 'n1' });
    const c = trialCard(test(), [], [obs, next], []);
    const f = c.findings.find(x => x.what === 'Jaw running cold')!;
    expect(f.decision).toBe('actioned');
    expect(f.action).toBe('Fit the new jaw heater');
  });

  it('calls an undecided one what it is, rather than open', () => {
    expect(trialCard(test(), [], [item({ what: 'Seal drifting' })], []).findings[0].decision)
      .toBe('to decide');
  });

  it('says no action needed when somebody decided that', () => {
    expect(trialCard(test(), [], [item({ doneAt: 5 })], []).findings[0].decision)
      .toBe('no action needed');
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
  it('says where each one came from', () => {
    const rows = [
      item({ id: 'n1', kind: 'next', what: 'Typed in', sort: 1 }),
      item({ id: 'n2', kind: 'next', what: 'From a finding', fromItemId: 'o1', sort: 2 }),
      item({ id: 'n3', kind: 'next', what: 'Became a trial', becameTestId: 't9', sort: 3 }),
    ];
    const c = trialCard(test(), [], rows, []);
    expect(c.next.map(x => [x.fromFinding, x.becameTest]))
      .toEqual([[false, false], [true, false], [false, true]]);
  });

  it('counts only what is still to do', () => {
    const rows = [item({ kind: 'next' }), item({ kind: 'next', doneAt: 5 })];
    expect(trialCard(test(), [], rows, []).openNext).toBe(1);
  });

  /* The headline is what HAPPENS next, so a step already done is not it. */
  it('leads on the first step still outstanding', () => {
    const rows = [
      item({ kind: 'next', what: 'Already done', doneAt: 5, sort: 1 }),
      item({ kind: 'next', what: 'Still to do', sort: 2 }),
    ];
    expect(headlineNext(trialCard(test(), [], rows, []))?.what).toBe('Still to do');
  });

  it('falls back to a done one rather than saying nothing is next', () => {
    const rows = [item({ kind: 'next', what: 'Already done', doneAt: 5 })];
    expect(headlineNext(trialCard(test(), [], rows, []))?.what).toBe('Already done');
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

describe('the one line a GM reads', () => {
  /* "Didn't pass" on its own is a verdict nobody can check. What it was meant
     to do, or what it actually did, is the line that means something. */
  it('gives the expectation while it is still only planned', () => {
    expect(verdictLine(trialCard(test({ passesIf: 'Holds 75 ppm for an hour' }), [], [], [])))
      .toBe('Passes if holds 75 ppm for an hour');
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

  /* An expectation typed as a proper noun keeps its capital: lowercasing
     "BU holds 75" to "bU holds 75" would look like a bug in the report. */
  it('leaves an acronym alone when it folds the expectation into a sentence', () => {
    expect(verdictLine(trialCard(test({ passesIf: 'BU holds 75 ppm' }), [], [], [])))
      .toBe('Passes if BU holds 75 ppm');
  });
});
