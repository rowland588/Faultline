import type { StandingJobRow, StandingJobRunRow } from '../lib/standingJob/types';
import { getDB, signalWrite } from './core';
import { recordTombstones } from './sync';
import { now } from '../lib/ids';

export async function listStandingJobs(): Promise<StandingJobRow[]> {
  return (await (await getDB()).getAll('standing_jobs')).filter(j => !j.deletedAt).sort((a, b) => a.client.localeCompare(b.client) || a.createdAt - b.createdAt);
}

export async function getStandingJob(id: string): Promise<StandingJobRow | undefined> {
  const j = await (await getDB()).get('standing_jobs', id);
  return j && !j.deletedAt ? j : undefined;
}

export async function putStandingJob(j: StandingJobRow): Promise<void> {
  await (await getDB()).put('standing_jobs', { ...j, updatedAt: now() });
  signalWrite();
}

export async function removeStandingJob(id: string): Promise<void> {
  const db = await getDB();
  const cur = await db.get('standing_jobs', id);
  if (!cur) return;
  const t = now();
  await db.put('standing_jobs', { ...cur, deletedAt: t, updatedAt: t });
  await recordTombstones('standing_jobs', [id]);
  signalWrite();
}

export async function listStandingRuns(jobId?: string): Promise<StandingJobRunRow[]> {
  const rows = (await (await getDB()).getAll('standing_job_runs')).filter(r => !r.deletedAt);
  return (jobId ? rows.filter(r => r.jobId === jobId) : rows).sort((a, b) => b.at - a.at);
}

export async function putStandingRun(r: StandingJobRunRow): Promise<void> {
  await (await getDB()).put('standing_job_runs', { ...r, updatedAt: now() });
  signalWrite();
}