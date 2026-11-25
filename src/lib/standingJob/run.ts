/* Run standing jobs on this device until G6 runs them on the server (docs/LUNA-G6-SERVER.md). */
import { buildWeeklyDigest, digestDataFor } from './digest';
import { periodKey, scheduleDue } from './schedule';
import type { StandingJobRow, StandingJobRunRow } from './types';
import { listStandingJobs, listStandingRuns, putStandingJob, putStandingRun } from '../../db/standingJobs';
import { now } from '../ids';
import { customerKey } from '../customers';

const shownKey = (jobId: string, period: string) => `faultline.standing.digest.${jobId}.${period}`;

export function digestAcked(jobId: string, periodKey: string): boolean {
  try { return localStorage.getItem(shownKey(jobId, periodKey)) === '1'; } catch { return false; }
}

export function ackDigest(jobId: string, periodKey: string): void {
  try { localStorage.setItem(shownKey(jobId, periodKey), '1'); } catch { /* private mode */ }
}

export interface PendingDigest { job: StandingJobRow; run: StandingJobRunRow }

/** Jobs due for the customer in hand (or all enabled when client is ''). */
export async function dueStandingJobs(clientInHand: string, t = Date.now()): Promise<StandingJobRow[]> {
  const jobs = (await listStandingJobs()).filter(j => j.enabled && !j.deletedAt);
  return jobs.filter(j => {
    if (clientInHand && customerKey(j.client) !== customerKey(clientInHand)) return false;
    return scheduleDue(j.schedule, j.lastPeriodKey, j.weekday, t, j.hour ?? 7, j.minute ?? 0);
  });
}

/** Build and store a run; update the job's last period. Pure facts only. */
export async function runStandingJob(job: StandingJobRow, t = Date.now()): Promise<StandingJobRunRow> {
  const period = periodKey(job.schedule, t);
  const existing = (await listStandingRuns(job.id)).find(r => r.periodKey === period);
  const email = job.scope.email;
  const built = email?.message
    ? { title: email.subject || 'Scheduled message', text: email.message, sections: [{ title: 'Message', lines: [email.message] }] }
    : buildWeeklyDigest({ ...await digestDataFor(job.client, t), scope: job.scope, now: t, schedule: job.schedule });
  const run: StandingJobRunRow = {
    id: existing?.id ?? job.id + ':' + period,
    ownerId: job.ownerId,
    jobId: job.id,
    client: job.client,
    periodKey: period,
    at: t,
    title: built.title,
    digest: built.text,
    sections: built.sections,
    createdAt: existing?.createdAt ?? t,
    updatedAt: t,
  };
  await putStandingRun(run);
  await putStandingJob({ ...job, lastRunAt: t, lastPeriodKey: period, updatedAt: t });
  return run;
}

/** Due jobs for the customer, run each once per period on this device; also offers unacknowledged runs already made. */
export async function runDueStandingJobs(clientInHand: string, t = Date.now()): Promise<PendingDigest[]> {
  const jobs = (await listStandingJobs()).filter(j => j.enabled && !j.deletedAt && (!clientInHand || customerKey(j.client) === customerKey(clientInHand)));
  const out: PendingDigest[] = [];
  for (const job of jobs) {
    const period = periodKey(job.schedule, t);
    const existing = (await listStandingRuns(job.id)).find(r => r.periodKey === period && !r.deletedAt);
    const due = scheduleDue(job.schedule, job.lastPeriodKey, job.weekday, t, job.hour ?? 7, job.minute ?? 0);
    if (existing?.digest.trim()) {
      if (job.lastPeriodKey !== period || job.lastRunAt !== existing.at) await putStandingJob({ ...job, lastPeriodKey: period, lastRunAt: existing.at, updatedAt: now() });
      out.push({ job: { ...job, lastPeriodKey: period, lastRunAt: existing.at }, run: existing });
      continue;
    }
    if (!due && !existing) continue;
    const run = await runStandingJob(job, t);
    out.push({ job: { ...job, lastPeriodKey: period, lastRunAt: t }, run });
  }
  return out;
}
