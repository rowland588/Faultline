/* A JOB TAKEN AND KEPT UP, through the capabilities (capabilities/job; docs/LUNA-AGENT.md G1), on a conversation in a fake IndexedDB:
 * plan_job keeps the goal and her steps on the conversation's current subject (and makes the subject when there is none), job_step
 * moves one and says the next, both run with no card — nothing of the business is read or changed. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { CapCtx, ColleagueJob, ColleagueThread } from '../types';

vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.resetModules(); });
const call = (name: string, input: unknown) => ({ id: `c-${name}`, name, input });
const GOAL = 'Find out why October missed plan and put it in a report';
const STEPS = ['Find the workbook', 'Find where the variance sits', 'Build the report'];

async function seed(threads: ColleagueThread[] = []) {
  const db = await import('../../db'); const reg = await import('../registry');
  const t = Date.now();
  await db.putStudy({ id: 'conv', tool: 'talk', name: 'Talk', facts: { colleague: true, turns: [], threads } as never, uses: [], startedAt: t, createdAt: t, updatedAt: t });
  const ctx = (o: Partial<CapCtx> = {}): CapCtx => ({ now: 5000, conversationId: 'conv', me: 'Rowland', ...o });
  const job = async (): Promise<ColleagueJob | undefined> => ((await db.getStudy('conv'))?.facts as unknown as { threads: ColleagueThread[] }).threads.find(x => x.status === 'current')?.job;
  const threadsNow = async () => ((await db.getStudy('conv'))?.facts as unknown as { threads: ColleagueThread[] }).threads;
  return { db, reg, ctx, job, threadsNow };
}

describe('plan_job and job_step', () => {
  it('are hers to run with no card — they change nothing of the business', async () => {
    const { reg } = await seed();
    expect(reg.capabilityByName('plan_job')).toMatchObject({ kind: 'local', title: 'Plan the job' });
    expect(reg.capabilityByName('job_step')).toMatchObject({ kind: 'local', title: 'Tick a step of the job' });
  });

  it('the plan is kept on the current subject, said back with every step, and told to start', async () => {
    const { reg, ctx, job, threadsNow } = await seed([{ id: 't1', title: 'October', status: 'current', scope: { lineId: 'L3' }, notes: [], refs: [], at: 1 }]);
    const r = await reg.runCall(ctx(), call('plan_job', { goal: GOAL, steps: STEPS }), { confirmed: false });
    expect(r.ok && r.says).toBe(`Job taken: “${GOAL}” — 3 steps: 1. Find the workbook; 2. Find where the variance sits; 3. Build the report. Start on step 1 now, in this same go; job_step each one as it is done, and do not stop until every step is done, blocked or skipped.`);
    expect(await job()).toEqual({ goal: GOAL, steps: STEPS.map(what => ({ what, status: 'todo' })), startedAt: 5000 });
    /* the subject keeps its place and takes the goal as its aim when it had none */
    expect((await threadsNow())[0]).toMatchObject({ id: 't1', scope: { lineId: 'L3' }, objective: GOAL });
  });

  it('with no subject yet the job becomes it', async () => {
    const { reg, ctx, threadsNow } = await seed();
    await reg.runCall(ctx(), call('plan_job', { goal: GOAL, steps: STEPS }), { confirmed: false });
    const ts = await threadsNow();
    expect(ts).toHaveLength(1);
    expect(ts[0]).toMatchObject({ status: 'current', title: GOAL, objective: GOAL, job: { goal: GOAL } });
  });

  it('a step moved is kept and the next is named; the last one ends the job and asks for the result', async () => {
    const { reg, ctx, job } = await seed();
    await reg.runCall(ctx(), call('plan_job', { goal: GOAL, steps: STEPS }), { confirmed: false });
    const one = await reg.runCall(ctx({ now: 6000 }), call('job_step', { step: 1, status: 'done', note: 'Plant performance October 2026' }), { confirmed: false });
    expect(one.ok && one.says).toBe('Step 1 of 3 done — Plant performance October 2026. Next: step 2 — Find where the variance sits.');
    expect((await job())?.steps[0]).toEqual({ what: 'Find the workbook', status: 'done', note: 'Plant performance October 2026', at: 6000 });
    await reg.runCall(ctx(), call('job_step', { step: 2, status: 'blocked', note: 'the plan column is empty' }), { confirmed: false });
    const last = await reg.runCall(ctx({ now: 9000 }), call('job_step', { step: 3, status: 'done', note: 'October against plan — report R1' }), { confirmed: false });
    expect(last.ok && last.says).toBe('Step 3 of 3 done — October against plan — report R1. Nothing is left to do: 2 of 3 done · 1 blocked — blocked: step 2 (the plan column is empty). The job is finished — give the person the result in strictly at most 160 words (the job exam counts them): name the report by its title, one sentence on the main finding, what is established against what is still only a hypothesis; say plainly what could not be done and why; do not repeat the report section by section or list figures already in it.');
    expect(last.ok && last.data).toMatchObject({ finished: true });
    expect((await job())?.endedAt).toBe(9000);
  });

  it('planned again half-way it keeps what was done; refusals are said in words', async () => {
    const { reg, ctx, job } = await seed();
    expect(await reg.runCall(ctx(), call('job_step', { step: 1, status: 'done' }), { confirmed: false })).toMatchObject({ ok: false, why: 'No job is planned on this subject — plan_job first, with the goal and your steps.' });
    await reg.runCall(ctx(), call('plan_job', { goal: GOAL, steps: STEPS }), { confirmed: false });
    await reg.runCall(ctx(), call('job_step', { step: 1, status: 'done', note: 'found' }), { confirmed: false });
    const again = await reg.runCall(ctx({ now: 8000 }), call('plan_job', { goal: GOAL, steps: ['Find the workbook', 'Join the stops to the product', 'Build the report'] }), { confirmed: false });
    expect(again.ok && again.says).toMatch(/3 steps: 1\. Find the workbook; 2\. Join the stops to the product; 3\. Build the report\. 1 of 3 done already\. Start on step 2 now/);
    expect((await job())?.steps.map(s => s.status)).toEqual(['done', 'todo', 'todo']);
    expect((await job())?.startedAt).toBe(5000);
    expect(await reg.runCall(ctx(), call('job_step', { step: 7, status: 'done' }), { confirmed: false })).toMatchObject({ ok: false, why: 'There is no step 7 — the job has 3.' });
    expect(await reg.runCall(ctx(), call('job_step', { step: 2, status: 'blocked' }), { confirmed: false })).toMatchObject({ ok: false });
    expect(await reg.runCall(ctx(), call('job_step', { step: 2, status: 'finished' }), { confirmed: false })).toMatchObject({ ok: false });
    expect(await reg.runCall(ctx(), call('plan_job', { goal: GOAL, steps: ['only one'] }), { confirmed: false })).toMatchObject({ ok: false, why: 'A job is at least 2 steps — a single step is just done, with no plan.' });
    expect(await reg.runCall(ctx({ conversationId: undefined }), call('plan_job', { goal: GOAL, steps: STEPS }), { confirmed: false })).toMatchObject({ ok: false });
  });
});
