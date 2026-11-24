/* LUNA ON THE SERVER — parked jobs carried on while the app is shut (24 November 2026, docs/LUNA-G6-SERVER.md G6 job slice).
 *
 * Pure rules: what may be handed off, how a gateway response moves status, and the overnight bounds (not the device's ten-minute
 * JOB_MS). The edge worker `colleague-job` and the device client (`serverJobClient`) share this module; tests prove what the cloud
 * runs. plan_job and job_step run on the server against the snapshot; reads that need the device wait; writes never auto-approve. */
import type { CapCall, ColleagueJob, ColleagueThread, JobStatus } from '../capabilities/types';
import type { GatewayTurn } from './conversation';
import { JOB_MS, MAX_LEGS, MAX_ROUNDS } from './colleagueAsk';
import { jobOpen, jobStands, nextOf, planJob, stepJob, stepSaid } from './job';

export { MAX_LEGS, JOB_MS, MAX_ROUNDS };

/** Overnight — a job handed over at five is still in time in the morning. Not the device loop's ten minutes. */
export const SERVER_JOB_MS = 12 * 60 * 60_000;
/** Gateway rounds the server may spend on one hand-off (one device go of six, four goes). */
export const SERVER_JOB_MAX_LEGS = MAX_LEGS * MAX_ROUNDS;
/** Rounds in one worker invocation — the same as one device go. */
export const SERVER_JOB_ROUNDS = MAX_ROUNDS;

export type ServerJobStatus = 'queued' | 'running' | 'waiting_device' | 'done' | 'stopped' | 'failed';

/** What the server holds to resume the gateway without the open tab. */
export interface ServerJobSnapshot {
  turns: GatewayTurn[];
  focus: string;
  today: string;
  conversationId: string;
  threadId: string;
  client: string;
  preferences?: string;
  images?: { photo: string; data: string }[];
  job?: ColleagueJob;
  /** Pending carry + results between gateway rounds — same shape as colleagueAsk. */
  pending?: { assistant: unknown; results: ServerJobCallResult[] };
  /** Capability calls the device must run before the next gateway round (reads that need this device). */
  proposedCalls?: CapCall[];
  /** The colleague's words from the last round that finished without device steps (merged on done). */
  reply?: string;
  suggestions?: string[];
  unsure?: string[];
}

export type ServerJobCallResult = {
  id: string;
  ok: boolean;
  says: string;
  data?: unknown;
  declined?: boolean;
};

export type ServerJobRow = {
  id: string;
  owner_id: string;
  conversation_id: string;
  thread_id: string;
  client: string;
  status: ServerJobStatus;
  snapshot: ServerJobSnapshot;
  legs: number;
  max_legs: number;
  deadline_at: string;
  started_at: string | null;
  finished_at: string | null;
  merged_at?: string | null;
  last_error: string | null;
  created_at?: string;
};

export const SERVER_JOB_MOST = 2;

/** A thread may be handed off when it is parked with an open job and the person asked the server to carry on. */
export function mayHandToServer(thread: ColleagueThread | undefined): boolean {
  return !!(thread?.handToServer && thread.status === 'parked' && thread.job && jobOpen(thread.job));
}

/** When to start the hand-off: an open job, and either the page is dying (pagehide) or she is not mid-ask on a live tab. */
export function shouldHandOff(
  thread: ColleagueThread | undefined,
  o: { asking: boolean; leaving: boolean },
): boolean {
  if (!thread?.job || !jobOpen(thread.job)) return false;
  if (o.asking && !o.leaving) return false;
  return true;
}

/** When the hand-off is accepted — started now, overnight bound, not the device's ten minutes. */
export function jobDeadline(startedMs: number): Date {
  return new Date(startedMs + SERVER_JOB_MS);
}

export function jobMaxLegs(): number {
  return SERVER_JOB_MAX_LEGS;
}

/** Rows the cron worker may pick — not past deadline, not waiting on the device. */
export function pickableJobs(
  rows: readonly ServerJobRow[],
  now: number,
): ServerJobRow[] {
  return rows.filter(r =>
    (r.status === 'queued' || r.status === 'running')
    && new Date(r.deadline_at).getTime() > now
    && r.legs < r.max_legs);
}

export function allowanceGone(why: string): boolean {
  return /allowance|spent|answers in AI Mode today/i.test(why);
}

type GatewayLeg = {
  ok: boolean;
  why?: string;
  reply?: string;
  calls?: CapCall[];
  assistant?: unknown;
  suggestions?: string[];
  unsure?: string[];
};

/** plan_job and job_step — they change only the snapshot's job, never a business record. */
export function applyServerLocalCalls(
  snap: ServerJobSnapshot,
  calls: readonly CapCall[],
  now: number,
): { snapshot: ServerJobSnapshot; results: ServerJobCallResult[]; leftover: CapCall[] } {
  const results: ServerJobCallResult[] = [];
  const leftover: CapCall[] = [];
  let job = snap.job;
  for (const c of calls) {
    if (c.name === 'plan_job') {
      const raw = c.input && typeof c.input === 'object' ? c.input as { goal?: unknown; steps?: unknown } : {};
      const goal = typeof raw.goal === 'string' ? raw.goal : '';
      const steps = Array.isArray(raw.steps) ? raw.steps.map(s => String(s)) : [];
      const out = planJob(goal, steps, now, job);
      if (typeof out === 'string') {
        results.push({ id: c.id, ok: false, says: out });
        continue;
      }
      job = out;
      results.push({
        id: c.id, ok: true, data: { job },
        says: `Job taken: “${job.goal}” — ${job.steps.length} steps: ${job.steps.map((s, i) => `${i + 1}. ${s.what}`).join('; ')}. Start on step ${nextOf(job)} now, in this same go; job_step each one as it is done.`,
      });
      continue;
    }
    if (c.name === 'job_step') {
      if (!job) {
        results.push({ id: c.id, ok: false, says: 'No job is planned on this subject — plan_job first, with the goal and your steps.' });
        continue;
      }
      const raw = c.input && typeof c.input === 'object' ? c.input as { step?: unknown; status?: unknown; note?: unknown } : {};
      const step = typeof raw.step === 'number' ? raw.step : Number(raw.step);
      const status = String(raw.status ?? '') as JobStatus;
      const note = typeof raw.note === 'string' ? raw.note : undefined;
      const out = stepJob(job, step, status, note, now);
      if (typeof out === 'string') {
        results.push({ id: c.id, ok: false, says: out });
        continue;
      }
      job = out;
      results.push({ id: c.id, ok: true, data: { job, finished: !jobOpen(job) }, says: stepSaid(job, step) });
      continue;
    }
    leftover.push(c);
  }
  return { snapshot: { ...snap, ...(job ? { job } : {}) }, results, leftover };
}

/** After one gateway answer — run local job steps here; leave device reads; never auto-approve a write. */
export function afterGatewayLeg(
  snap: ServerJobSnapshot,
  leg: GatewayLeg,
  legsSoFar: number,
  now = Date.now(),
): { snapshot: ServerJobSnapshot; status: ServerJobStatus; legs: number; error?: string; continueRound?: boolean } {
  if (!leg.ok) {
    return { snapshot: { ...snap, reply: leg.why }, status: 'failed', legs: legsSoFar, error: leg.why };
  }
  const reply = (leg.reply ?? '').trim();
  const withReply = reply ? { reply: [snap.reply, reply].filter(Boolean).join('\n\n') } : {};
  if (leg.calls?.length) {
    const applied = applyServerLocalCalls(
      { ...snap, pending: { assistant: leg.assistant ?? null, results: snap.pending?.results ?? [] }, ...withReply },
      leg.calls,
      now,
    );
    const assistant = applied.snapshot.pending?.assistant ?? leg.assistant ?? null;
    if (applied.leftover.length) {
      return {
        snapshot: {
          ...applied.snapshot,
          proposedCalls: applied.leftover,
          pending: { assistant, results: [...(applied.snapshot.pending?.results ?? []).filter(r => !applied.results.some(x => x.id === r.id)), ...applied.results] },
        },
        status: 'waiting_device',
        legs: legsSoFar + 1,
      };
    }
    return {
      snapshot: {
        ...applied.snapshot,
        proposedCalls: undefined,
        pending: { assistant, results: applied.results },
        ...(leg.suggestions?.length ? { suggestions: leg.suggestions } : {}),
        ...(leg.unsure?.length ? { unsure: leg.unsure } : {}),
      },
      status: 'running',
      legs: legsSoFar + 1,
      continueRound: true,
    };
  }
  const job = snap.job;
  const next: ServerJobSnapshot = {
    ...snap,
    proposedCalls: undefined,
    pending: undefined,
    ...withReply,
    ...(leg.suggestions?.length ? { suggestions: leg.suggestions } : {}),
    ...(leg.unsure?.length ? { unsure: leg.unsure } : {}),
  };
  const done = job ? !jobOpen(job) : !!reply;
  if (done || legsSoFar + 1 >= SERVER_JOB_MAX_LEGS) {
    return { snapshot: next, status: 'done', legs: legsSoFar + 1 };
  }
  return { snapshot: next, status: 'running', legs: legsSoFar + 1, continueRound: true };
}

/** The device ran the proposed calls — results go into pending for the next gateway round. */
export function afterDeviceResults(
  snap: ServerJobSnapshot,
  results: readonly ServerJobCallResult[],
): ServerJobSnapshot {
  const assistant = snap.pending?.assistant ?? null;
  return {
    ...snap,
    proposedCalls: undefined,
    pending: { assistant, results: [...(snap.pending?.results ?? []), ...results] },
  };
}

/** What the person should read when they open Luna again. */
export function serverJobSaid(row: ServerJobRow): string {
  const r = row.snapshot.reply?.trim();
  if (row.status === 'done' && r) return r;
  if (row.status === 'failed' || row.status === 'stopped') {
    const far = row.last_error ?? r;
    return far
      ? `${far}${r && far !== r ? `\n\nHow far she got: ${r}` : ''}`
      : 'Luna could not finish this job on the server.';
  }
  if (row.status === 'waiting_device' || row.status === 'running') {
    const stands = row.snapshot.job ? jobStands(row.snapshot.job) : '';
    return r
      ? `${r}\n\nShe is still working${stands ? ` — ${stands}` : ''} — open Luna and she will carry on from here.`
      : `Luna is still working on this job${stands ? ` (${stands})` : ''} — open Luna and she will carry on from here.`;
  }
  return 'Luna is carrying this job on while you are away.';
}
