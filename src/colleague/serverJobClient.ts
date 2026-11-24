/* PARKED JOBS ON THE SERVER — hand-off, device legs, and merge back (23 November 2026, docs/LUNA-G6-SERVER.md). */
import { supabase } from '../cloud/client';
import type { CapCtx, ColleagueThread } from '../capabilities/types';
import { capabilityByName } from '../capabilities/registry';
import type { GatewayTurn } from './conversation';
import {
  afterDeviceResults, jobDeadline, jobMaxLegs, mayHandToServer, serverJobSaid, shouldHandOff,
  type ServerJobCallResult, type ServerJobRow, type ServerJobSnapshot,
} from './serverJob';

export type { ServerJobRow, ServerJobSnapshot, ServerJobCallResult } from './serverJob';
export { shouldHandOff, serverJobSaid };

declare global {
  interface Window { __faultlineServerJobs?: ServerJobRow[] }
}

const TABLE = 'luna_server_jobs';

export type HandOff = {
  turns: GatewayTurn[];
  focus: string;
  today: string;
  conversationId: string;
  thread: ColleagueThread;
  client: string;
  preferences?: string;
};

/** Insert a queued row — the cron worker or an immediate assist kick picks it up. */
export async function enqueueServerJob(h: HandOff): Promise<string | undefined> {
  if (!mayHandToServer(h.thread)) return undefined;
  const snap: ServerJobSnapshot = {
    turns: h.turns,
    focus: h.focus,
    today: h.today,
    conversationId: h.conversationId,
    threadId: h.thread.id,
    client: h.client,
    job: h.thread.job,
    ...(h.preferences ? { preferences: h.preferences } : {}),
  };
  const started = Date.now();
  if (typeof window !== 'undefined' && window.__faultlineServerJobs) {
    const id = `mock-${started}`;
    window.__faultlineServerJobs.push({
      id, owner_id: 'mock', conversation_id: h.conversationId, thread_id: h.thread.id,
      client: h.client, status: 'done', snapshot: { ...snap, reply: 'Finished on the server while you were away.' },
      legs: 1, max_legs: jobMaxLegs(), deadline_at: jobDeadline(started).toISOString(),
      started_at: new Date(started).toISOString(), finished_at: new Date().toISOString(), last_error: null,
    });
    return id;
  }
  if (!supabase) return undefined;
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return undefined;
  const { data: existing } = await supabase.from(TABLE)
    .select('id, status')
    .eq('conversation_id', h.conversationId)
    .eq('thread_id', h.thread.id)
    .is('merged_at', null)
    .in('status', ['queued', 'running', 'waiting_device'])
    .maybeSingle();
  if (existing?.id) {
    void kickServerJob(existing.id);
    return existing.id as string;
  }
  const { data, error } = await supabase.from(TABLE).insert({
    owner_id: me.user.id,
    conversation_id: h.conversationId,
    thread_id: h.thread.id,
    client: h.client,
    status: 'queued',
    snapshot: snap,
    max_legs: jobMaxLegs(),
    deadline_at: jobDeadline(started).toISOString(),
    started_at: new Date(started).toISOString(),
  }).select('id').single();
  if (error) {
    console.warn('server job not queued', error.message);
    return undefined;
  }
  const id = (data as { id: string }).id;
  void kickServerJob(id);
  return id;
}

export async function fetchOpenServerJobs(): Promise<ServerJobRow[]> {
  if (typeof window !== 'undefined' && window.__faultlineServerJobs) return [...window.__faultlineServerJobs];
  if (!supabase) return [];
  const { data, error } = await supabase.from(TABLE)
    .select('*')
    .is('merged_at', null)
    .in('status', ['waiting_device', 'running', 'done', 'stopped', 'failed'])
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('server jobs could not be read', error.message);
    return [];
  }
  return (data ?? []) as ServerJobRow[];
}

/** Run proposed capability calls on the device, then queue the next server round. */
export async function runDeviceLeg(
  row: ServerJobRow,
  _ctx: CapCtx,
  run: (call: { id: string; name: string; input: unknown }) => Promise<{ id: string; ok: boolean; says: string; data?: unknown; declined?: boolean }>,
): Promise<void> {
  const calls = row.snapshot.proposedCalls ?? [];
  if (!calls.length || row.status !== 'waiting_device') return;
  const results: ServerJobCallResult[] = [];
  for (const c of calls) {
    const cap = capabilityByName(c.name);
    if (!cap || cap.kind === 'write') {
      results.push({ id: c.id, ok: false, declined: true, says: 'Writes still need you — nothing was written while you were away.' });
      continue;
    }
    const r = await run(c);
    results.push({ id: r.id, ok: r.ok, says: r.says, ...(r.data !== undefined ? { data: r.data } : {}), ...(r.declined ? { declined: true } : {}) });
  }
  const snapshot = afterDeviceResults(row.snapshot, results);
  if (typeof window !== 'undefined' && window.__faultlineServerJobs) {
    const i = window.__faultlineServerJobs.findIndex(x => x.id === row.id);
    if (i >= 0) window.__faultlineServerJobs[i] = { ...row, snapshot, status: 'queued', legs: row.legs };
    return;
  }
  if (!supabase) return;
  await supabase.from(TABLE).update({ snapshot, status: 'queued', legs: row.legs }).eq('id', row.id);
  void kickServerJob(row.id);
}

async function kickServerJob(jobId: string): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.functions.invoke('colleague-job', { body: { jobId } });
  } catch {
    /* cron will pick it up */
  }
}

export async function finishServerJob(row: ServerJobRow): Promise<void> {
  if (typeof window !== 'undefined' && window.__faultlineServerJobs) {
    window.__faultlineServerJobs = window.__faultlineServerJobs.filter(x => x.id !== row.id);
    return;
  }
  if (!supabase) return;
  await supabase.from(TABLE).update({ merged_at: new Date().toISOString() }).eq('id', row.id);
}
