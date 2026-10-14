/* Getting a new job running: the steps, in order, done when the thing exists. */
import { describe, it, expect } from 'vitest';
import { nextStep, ownProblems, readyToRun, startSteps, type StartInput } from '../startHere';

const none: StartInput = { model: 'board', lines: 0, measures: 0, targets: 0, readings: 0, problems: 0, treeNodes: 0 };

describe('getting a new job running', () => {
  it('a new 6M job starts at the line and ends at the first problem', () => {
    const s = startSteps(none);
    expect(s.map(x => x.key)).toEqual(['line', 'measure', 'target', 'now', 'problem']);
    expect(nextStep(s)?.key).toBe('line');
    expect(readyToRun(s)).toBe(false);
  });
  it('ticks each step off the record it reads, and says what is next', () => {
    const s = startSteps({ ...none, lines: 1, measures: 1 });
    expect(s.filter(x => x.done).map(x => x.key)).toEqual(['line', 'measure']);
    expect(nextStep(s)?.key).toBe('target');
  });
  it('is ready to run when every step is done', () => {
    const s = startSteps({ ...none, lines: 2, measures: 1, targets: 4, readings: 3, problems: 1 });
    expect(readyToRun(s)).toBe(true);
    expect(nextStep(s)).toBeUndefined();
  });
  it('a lever tree job ends at the outcome, not a problem', () => {
    expect(startSteps({ ...none, model: 'tree' }).slice(-1)[0]?.key).toBe('outcome');
  });
  it('a stage-gate job has no list — Install is its start', () => {
    expect(startSteps({ ...none, model: 'commissioning' })).toEqual([]);
    expect(readyToRun([])).toBe(true);
  });
});

describe("the job's own problems (FLOW-AUDIT.md, 19)", () => {
  it('counts a problem named for the job, and one with no job opened on its line since it started — never an older one', () => {
    expect(ownProblems([
      { projectId: 'p', openedAt: 500 },        // its own, whenever opened
      { projectId: 'other', openedAt: 2_000 },  // another job's
      { openedAt: 200 },                        // a case on the line from before the job
      { openedAt: 1_500 },                      // opened on its line since it started
    ], 'p', 1_000)).toBe(2);
  });
});
