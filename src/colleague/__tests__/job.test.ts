/* A JOB — Luna's own plan of a piece of work (colleague/job; docs/LUNA-AGENT.md G1): the plan made and made again, a step moved, the
 * job ended when nothing is left, and the words each is said in — to the person (the list) and to Luna every round (focusText). */
import { describe, expect, it } from 'vitest';
import { JOB_LIMITS, JOB_WORD, jobCounts, jobOpen, jobSaid, jobStands, nextOf, planJob, stepJob, stepSaid, stepsOpenSaid } from '../job';
import { focusText, type Thread } from '../conversation';
import type { ColleagueJob } from '../../capabilities/types';

const GOAL = 'Find out why October missed plan and put it in a report for the director';
const STEPS = ['Find the workbook and its sheets', 'Find where the variance sits', 'Look for the why in the downtime log', 'Price it', 'Build the report'];
const plan = (now = 1000): ColleagueJob => planJob(GOAL, STEPS, now) as ColleagueJob;
const move = (j: ColleagueJob, n: number, st: Parameters<typeof stepJob>[2], note?: string, now = 2000): ColleagueJob => stepJob(j, n, st, note, now) as ColleagueJob;

describe('the plan', () => {
  it('is the goal in their words and her steps, all to do, begun now', () => {
    const j = plan();
    expect(j).toEqual({ goal: GOAL, steps: STEPS.map(what => ({ what, status: 'todo' })), startedAt: 1000 });
    expect(jobOpen(j)).toBe(true);
    expect(nextOf(j)).toBe(1);
    expect(jobStands(j)).toBe('0 of 5 done');
  });
  it('needs a goal and two to eight steps; the same step twice is one', () => {
    expect(planJob('  ', STEPS, 1)).toMatch(/needs its goal/);
    expect(planJob(GOAL, ['Only one'], 1)).toMatch(/at least 2 steps/);
    expect(planJob(GOAL, Array.from({ length: 9 }, (_, i) => `Step ${i}`), 1)).toMatch(/at most 8 steps/);
    expect((planJob(GOAL, ['Find it', 'find  IT', 'Price it'], 1) as ColleagueJob).steps.map(s => s.what)).toEqual(['Find it', 'Price it']);
    expect((planJob(GOAL, ['x'.repeat(400), 'two'], 1) as ColleagueJob).steps[0].what).toHaveLength(JOB_LIMITS.what);
  });
  it('planned again half-way keeps what each step had come to; a new goal or a finished job starts clean', () => {
    const half = move(move(plan(), 1, 'done', 'three sheets'), 2, 'doing');
    const again = planJob(GOAL, ['Find the workbook and its sheets', 'Find where the variance sits', 'Join the stops to the product running', 'Build the report'], 5000, half) as ColleagueJob;
    expect(again.startedAt).toBe(1000);
    expect(again.steps.map(s => [s.what, s.status, s.note])).toEqual([
      ['Find the workbook and its sheets', 'done', 'three sheets'], ['Find where the variance sits', 'doing', undefined],
      ['Join the stops to the product running', 'todo', undefined], ['Build the report', 'todo', undefined]]);
    expect((planJob('Something else entirely', ['a', 'b'], 5000, half) as ColleagueJob)).toMatchObject({ startedAt: 5000, steps: [{ status: 'todo' }, { status: 'todo' }] });
    const ended = STEPS.reduce((j, _s, i) => move(j, i + 1, 'done'), plan());
    expect((planJob(GOAL, STEPS, 9000, ended) as ColleagueJob).steps.every(s => s.status === 'todo')).toBe(true);
  });
});

describe('a step moved', () => {
  it('doing, then done with what it found; the step in hand follows', () => {
    let j = move(plan(), 1, 'doing');
    expect(nextOf(j)).toBe(1);
    j = move(j, 1, 'done', 'Plant performance October 2026 — Production, Downtime log, Products');
    expect(j.steps[0]).toEqual({ what: STEPS[0], status: 'done', note: 'Plant performance October 2026 — Production, Downtime log, Products', at: 2000 });
    expect(nextOf(j)).toBe(2);
    expect(jobStands(j)).toBe('1 of 5 done');
    expect(stepSaid(j, 1)).toBe('Step 1 of 5 done — Plant performance October 2026 — Production, Downtime log, Products. Next: step 2 — Find where the variance sits.');
    expect(stepSaid(move(j, 2, 'doing'), 2)).toBe('Step 2 of 5 doing. Carry it through, then mark it done with what it found.');
  });
  it('a blocked step says why; a step that is not there is refused', () => {
    expect(stepJob(plan(), 3, 'blocked', undefined, 1)).toMatch(/says why/);
    expect(stepJob(plan(), 6, 'done', undefined, 1)).toBe('There is no step 6 — the job has 5.');
    expect(stepJob(plan(), 0, 'done', undefined, 1)).toMatch(/no step 0/);
    const j = move(plan(), 3, 'blocked', 'the downtime log has no shift column');
    expect(j.steps[2]).toMatchObject({ status: 'blocked', note: 'the downtime log has no shift column' });
    expect(jobOpen(j)).toBe(true);
  });
  it('the job ends when nothing is left to do or being done — and says what could not be done', () => {
    let j = plan();
    for (const n of [1, 2]) j = move(j, n, 'done', 'found');
    j = move(j, 3, 'blocked', 'the log has no reasons');
    j = move(j, 4, 'skipped');
    expect(j.endedAt).toBeUndefined();
    j = move(j, 5, 'done', 'October against plan — report R1', 7000);
    expect(j.endedAt).toBe(7000);
    expect(jobOpen(j)).toBe(false);
    expect(nextOf(j)).toBe(0);
    expect(jobCounts(j)).toEqual({ total: 5, done: 3, blocked: 1, skipped: 1, left: 0 });
    expect(jobStands(j)).toBe('Finished — 3 of 5 done · 1 blocked · 1 skipped');
    expect(stepSaid(j, 5)).toBe('Step 5 of 5 done — October against plan — report R1. Nothing is left to do: 3 of 5 done · 1 blocked · 1 skipped — blocked: step 3 (the log has no reasons). The job is finished — give the person the result in at most 160 words: name the report by its title, one sentence on the main finding, what is established against what is still only a hypothesis; say plainly what could not be done and why; do not repeat the report section by section or list figures already in it.');
    /* a step taken up again opens the job again */
    expect(move(j, 3, 'doing').endedAt).toBeUndefined();
  });
  it('every state has its word', () => {
    expect(JOB_WORD).toEqual({ todo: 'To do', doing: 'Doing', done: 'Done', blocked: 'Blocked', skipped: 'Skipped' });
  });
});

describe('the job as Luna is told it every round', () => {
  const thread = (job: ColleagueJob): Thread => ({ id: 't1', title: 'October', status: 'current', scope: {}, notes: [], refs: [], at: 1, job } as Thread);
  it('an open job: its goal, each step with where it stands, and the step in hand', () => {
    const j = move(move(plan(), 1, 'done', 'three sheets'), 2, 'doing');
    expect(jobSaid(j)).toEqual([
      `  JOB IN HAND: ${GOAL} — 1 of 5 done. Finish it: work the steps in order, job_step as each is done; do not start again or repeat a step that is done.`,
      '    1. [Done] Find the workbook and its sheets — three sheets',
      '    2. [Doing] Find where the variance sits   ← the step in hand',
      '    3. [To do] Look for the why in the downtime log',
      '    4. [To do] Price it',
      '    5. [To do] Build the report',
    ]);
    const said = focusText([thread(j)]);
    expect(said).toContain('JOB IN HAND: Find out why October missed plan');
    expect(said).toContain('2. [Doing] Find where the variance sits   ← the step in hand');
  });
  it('a finished job is one line, and a new piece of work is a new plan', () => {
    const j = STEPS.reduce((x, _s, i) => move(x, i + 1, 'done'), plan());
    expect(jobSaid(j)).toEqual([`  Job (finished): ${GOAL} — 5 of 5 done. A new piece of work is a new plan_job.`]);
  });
  it('the steps still open are said by number, in their word — nothing once the job has ended or has none (the second look)', () => {
    const job = (x: ColleagueJob | string): ColleagueJob => { if (typeof x === 'string') throw new Error(x); return x; };
    const j = job(planJob('Find out why and write it up', ['Read the workbook', 'Find where it sits', 'Write the report'], 1000));
    expect(stepsOpenSaid(j)).toBe('1 “Read the workbook” (to do); 2 “Find where it sits” (to do); 3 “Write the report” (to do)');
    const one = job(stepJob(job(stepJob(j, 1, 'done', 'read', 1100)), 2, 'doing', undefined, 1200));
    expect(stepsOpenSaid(one)).toBe('2 “Find where it sits” (doing); 3 “Write the report” (to do)');
    const ended = job(stepJob(job(stepJob(one, 2, 'done', 'Line 3', 1300)), 3, 'skipped', 'not wanted', 1400));
    expect(ended.endedAt).toBe(1400);
    expect(stepsOpenSaid(ended)).toBeUndefined();
    expect(stepsOpenSaid(undefined)).toBeUndefined();
  });
});
