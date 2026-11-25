import { supabase } from '../../cloud/client';
import { getStandingJob, putStandingJob, removeStandingJob } from '../../db/standingJobs';
import type { StandingJobRow } from '../standingJob/types';
import type { GraphMail } from '../microsoft/mail';

export async function lunaMailStatus(userId?: string) {
  if (!userId || !supabase) return { ready: false, allowed: false };
  const { data, error } = await supabase.functions.invoke('luna-mail', { body: { action: 'status' } });
  if (error) throw new Error('Could not check the Luna sender. Reconnect and try again.');
  return { ready: data?.ready === true, allowed: data?.allowed === true };
}

export async function sendWithLuna(id: string, mail: GraphMail) {
  if (!supabase) return { ok: false as const, why: 'Sign in to use Luna email.' };
  const { data, error } = await supabase.functions.invoke('luna-mail', { body: { action: 'send', id, mail } });
  if (!error && data?.accepted) return { ok: true as const };
  const response = error?.context;
  const result = response instanceof Response ? await response.json().catch(() => null) : null;
  return { ok: false as const, why: String(result?.error ?? 'Email acceptance is unknown. Check Resend before creating another email.') };
}

/** Commit recurring delivery settings online before claiming they are in force with the device closed. */
export async function saveMailSchedule(job: StandingJobRow, owner: string, remove = false) {
  if (!supabase || !owner || (job.ownerId && job.ownerId !== owner)) throw new Error('Sign in as the schedule owner.');
  const existing = await getStandingJob(job.id);
  const stamp = Date.now();
  const email = job.scope.email;
  const old = existing?.scope.email;
  const edited = !existing?.enabled || !old || old.to !== email?.to || old.message !== email?.message ||
    old.subject !== email?.subject || existing.hour !== job.hour || existing.minute !== job.minute ||
    existing.weekday !== job.weekday || existing.schedule !== job.schedule;
  const scope = email ? { ...job.scope, email: { ...email, enabledAt: edited ? stamp : old?.enabledAt ?? stamp } } : job.scope;
  const row = { id: job.id, owner_id: owner, client: job.client, kind: job.kind, schedule: job.schedule, weekday: job.weekday,
    scope, enabled: job.enabled, hour: job.hour ?? 7, minute: job.minute ?? 0,
    created_at: job.createdAt, updated_at: stamp, deleted_at: remove ? stamp : null };
  const { error } = await supabase.from('standing_jobs').upsert(row, { onConflict: 'id', defaultToNull: false });
  if (error) throw new Error('Could not save the schedule online. Check the connection and try again.');
  if (remove && existing) await removeStandingJob(job.id);
  else if (!remove) await putStandingJob({ ...job, scope, ownerId: owner, updatedAt: stamp });
}
