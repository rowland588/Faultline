/* Run standing jobs on this device until G6 runs them on the server (docs/LUNA-G6-SERVER.md). */
import { buildWeeklyDigest, digestDataFor } from './digest';
import { periodKey, scheduleDue } from './schedule';
import type { StandingJobRow, StandingJobRunRow } from './types';
import { listStandingJobs, listStandingRuns, putStandingJob, putStandingRun } from '../../db/standingJobs';
import { now, uid } from '../ids';
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
    return scheduleDue(j.schedule, j.lastPeriodKey, j.weekday, t);
  });
}

/** Build and store a run; update the job's last period. Pure facts only. */
export async function runStandingJob(job: StandingJobRow, t = Date.now()): Promise<StandingJobRunRow> {
  const period = periodKey(job.schedule, t);
  const data = await digestDataFor(job.client, t);
  const built = buildWeeklyDigest({ ...data, scope: job.scope, now: t });
  const run: StandingJobRunRow = {
    id: uid(),
    jobId: job.id,
    client: job.client,
    periodKey: period,
    at: t,
    title: built.title,
    digest: built.text,
    sections: built.sections,
    createdAt: t,
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
    const due = scheduleDue(job.schedule, job.lastPeriodKey, job.weekday, t);
    if (existing) {
      if (job.lastPeriodKey !== period || job.lastRunAt !== existing.at) await putStandingJob({ ...job, lastPeriodKey: period, lastRunAt: existing.at, updatedAt: now() });
      out.push({ job: { ...job, lastPeriodKey: period, lastRunAt: existing.at }, run: existing });
      continue;
    }
    if (!due) continue;
    const run = await runStandingJob(job, t);
    out.push({ job: { ...job, lastPeriodKey: period, lastRunAt: t }, run });
  }
  return out;
}
