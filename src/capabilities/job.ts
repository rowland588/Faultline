/* A JOB TAKEN AND KEPT UP (21 November 2026, docs/LUNA-AGENT.md; the plan itself is colleague/job).
 *
 *   plan_job   local  the piece of work the person handed over, and Luna's own plan of it: the goal in their words and two to eight
 *                     steps of hers. Kept on the conversation's current subject and drawn as the list the person watches. Planned
 *                     again half-way, it keeps what each step had already come to.
 *   job_step   local  one step moved — doing, done (with what it found), blocked (with why) or skipped — and the next step said back,
 *                     so she goes on to it. When nothing is left to do the job is finished and she is told to give the result.
 *
 * Nothing is written but the conversation's own subject: no record of the business is read or changed here, so neither asks the
 * person anything. The work of each step is done through the app's other capabilities, exactly as before — writes the job proposes
 * are gathered on one card (G5, colleague/jobWrites); after one yes the rest of the job go in as receipts except consequential steps. */
import { patchStudy } from '../db';
import type { ToolStudy } from '../lib/study';
import { JOB_LIMITS, jobOpen, jobStands, nextOf, planJob, stepJob, stepSaid } from '../colleague/job';
import { checkObject } from './check';
import { anyone } from './access';
import { conversation } from './draftStore';
import type { CapCtx, CapResult, Capability, ColleagueJob, ColleagueThread, JobStatus } from './types';

const threadsOf = (s: Pick<ToolStudy, 'facts'>): ColleagueThread[] => {
  const t = (s.facts as { threads?: unknown }).threads;
  return Array.isArray(t) ? t as ColleagueThread[] : [];
};

/** The job written onto the conversation's current subject — and, where nothing is the subject yet, the job becomes it. */
async function keepJob(ctx: CapCtx, id: string, change: (was: ColleagueJob | undefined) => ColleagueJob | string): Promise<ColleagueJob | string> {
  let out: ColleagueJob | string = 'The conversation is not on this device any more.';
  await patchStudy(id, s => {
    const ts = threadsOf(s);
    const cur = ts.find(t => t.status === 'current');
    out = change(cur?.job);
    if (typeof out === 'string') return {};
    const job = out;
    const next: ColleagueThread[] = cur
      ? ts.map(t => (t.id === cur.id ? { ...t, job, ...(t.objective ? {} : { objective: job.goal }) } : t))
      : [...ts, { id: `t-${ctx.now.toString(36)}`, title: job.goal.slice(0, 80), status: 'current', scope: {}, notes: [], refs: [], at: ctx.now, objective: job.goal, job }];
    return { facts: { ...s.facts, threads: next } as ToolStudy['facts'] };
  });
  return out;
}

interface PlanIn { goal: string; steps: string[] }
export const planJobCap: Capability = {
  name: 'plan_job', title: 'Plan the job', kind: 'local',
  validate: raw => {
    const v = checkObject(raw, {
      goal: { kind: 'string', label: 'the job, in the person’s words', required: true, max: JOB_LIMITS.goal },
      steps: { kind: 'strings', label: 'your steps', required: true, max: JOB_LIMITS.steps },
    });
    return v.ok ? v : { ok: false, why: v.why.replace('must be a list of ids', 'must be a list — each step a few words, in the order you will do them') };
  },
  allowed: anyone,
  async run(ctx, input: PlanIn): Promise<CapResult> {
    const c = await conversation(ctx);
    if (!c.ok) return { ok: false, why: c.why };
    const job = await keepJob(ctx, c.s.id, was => planJob(input.goal, input.steps, ctx.now, was));
    if (typeof job === 'string') return { ok: false, why: job };
    const kept = job.steps.filter(s => s.status !== 'todo').length;
    return {
      ok: true, refs: [], data: { job },
      says: `Job taken: “${job.goal}” — ${job.steps.length} steps: ${job.steps.map((s, i) => `${i + 1}. ${s.what}`).join('; ')}.${kept ? ` ${jobStands(job)} already.` : ''} Start on step ${nextOf(job)} now, in this same go; job_step each one as it is done, and do not stop until every step is done, blocked or skipped.`,
    };
  },
};

interface StepIn { step: number; status: JobStatus; note?: string }
const STATES: readonly JobStatus[] = ['doing', 'done', 'blocked', 'skipped', 'todo'];
export const jobStepCap: Capability = {
  name: 'job_step', title: 'Tick a step of the job', kind: 'local',
  validate: raw => checkObject(raw, {
    step: { kind: 'int', label: 'the step’s number', required: true, min: 1, max: JOB_LIMITS.steps },
    status: { kind: 'enum', label: 'the step’s state', required: true, values: STATES },
    note: { kind: 'string', label: 'what it found, or why it is blocked — a few words', max: JOB_LIMITS.note },
  }),
  allowed: anyone,
  async run(ctx, input: StepIn): Promise<CapResult> {
    const c = await conversation(ctx);
    if (!c.ok) return { ok: false, why: c.why };
    const job = await keepJob(ctx, c.s.id, was => (was ? stepJob(was, input.step, input.status, input.note, ctx.now) : 'No job is planned on this subject — plan_job first, with the goal and your steps.'));
    if (typeof job === 'string') return { ok: false, why: job };
    return { ok: true, refs: [], data: { job, finished: !jobOpen(job) }, says: stepSaid(job, input.step) };
  },
};

export const JOB: readonly Capability[] = [planJobCap, jobStepCap];

/** G5: the person said yes on the job's one card — later writes in this job skip their own cards (consequential ones still ask). */
export async function approveJobWrites(id: string): Promise<void> {
  await patchStudy(id, s => {
    const ts = threadsOf(s);
    const cur = ts.find(t => t.status === 'current');
    if (!cur?.job || !jobOpen(cur.job)) return {};
    const job: ColleagueJob = { ...cur.job, writesApproved: true };
    return { facts: { ...s.facts, threads: ts.map(t => (t.id === cur.id ? { ...t, job } : t)) } as ToolStudy['facts'] };
  });
}
