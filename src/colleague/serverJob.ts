/* LUNA ON THE SERVER — parked jobs carried on while the app is shut (23 November 2026, docs/LUNA-G6-SERVER.md G6 job slice).
 *
 * Pure rules: what may be handed off, how a gateway response moves status, and the bounds (same as colleagueAsk). The edge worker
 * `colleague-job` and the device client (`serverJobClient`) share this module; tests prove what the cloud runs. */
import type { CapCall, ColleagueJob, ColleagueThread } from '../capabilities/types';
import type { GatewayTurn } from './conversation';
import { JOB_MS, MAX_LEGS } from './colleagueAsk';
import { jobOpen } from './job';

export { MAX_LEGS, JOB_MS };

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
  /** Capability calls the device must run before the next gateway round (phase 1). */
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

/** When the hand-off is accepted — started now, same bounds as the device loop. */
export function jobDeadline(startedMs: number): Date {
  return new Date(startedMs + JOB_MS);
}

export function jobMaxLegs(): number {
  return MAX_LEGS;
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

/** After one gateway answer — store calls for the device or advance toward done. */
export function afterGatewayLeg(
  snap: ServerJobSnapshot,
  leg: GatewayLeg,
  legsSoFar: number,
): { snapshot: ServerJobSnapshot; status: ServerJobStatus; legs: number; error?: string } {
  if (!leg.ok) {
    const failed = allowanceGone(leg.why ?? '') ? 'failed' as const : 'failed' as const;
    return { snapshot: { ...snap, reply: leg.why }, status: failed, legs: legsSoFar, error: leg.why };
  }
  const reply = (leg.reply ?? '').trim();
  if (leg.calls?.length) {
    return {
      snapshot: {
        ...snap,
        proposedCalls: leg.calls,
        pending: { assistant: leg.assistant ?? null, results: snap.pending?.results ?? [] },
        ...(reply ? { reply: [snap.reply, reply].filter(Boolean).join('\n\n') } : {}),
      },
      status: 'waiting_device',
      legs: legsSoFar + 1,
    };
  }
  const job = snap.job;
  const next: ServerJobSnapshot = {
    ...snap,
    proposedCalls: undefined,
    pending: undefined,
    ...(reply ? { reply: [snap.reply, reply].filter(Boolean).join('\n\n') } : {}),
    ...(leg.suggestions?.length ? { suggestions: leg.suggestions } : {}),
    ...(leg.unsure?.length ? { unsure: leg.unsure } : {}),
  };
  const done = job ? !jobOpen(job) : !!reply;
  if (done || legsSoFar + 1 >= MAX_LEGS) {
    return { snapshot: next, status: 'done', legs: legsSoFar + 1 };
  }
  return { snapshot: next, status: 'running', legs: legsSoFar + 1 };
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
  if (row.status === 'failed' || row.status === 'stopped') return row.last_error ?? row.snapshot.reply ?? 'Luna could not finish this job on the server.';
  if (row.status === 'waiting_device' || row.status === 'running') {
    return row.snapshot.reply?.trim()
      ? `${row.snapshot.reply.trim()}\n\nShe is still working — open Luna and she will carry on from here.`
      : 'Luna is still working on this job — open Luna and she will carry on from here.';
  }
  return 'Luna is carrying this job on while you are away.';
}