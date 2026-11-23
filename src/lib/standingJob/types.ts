export type StandingJobKind = 'weekly_digest';
export type StandingSchedule = 'weekly' | 'daily';

export interface StandingJobScope {
  picture?: boolean;
  files?: boolean;
  problems?: boolean;
  variance?: boolean;
}

export interface StandingJobRow {
  id: string;
  ownerId?: string;
  client: string;
  kind: StandingJobKind;
  schedule: StandingSchedule;
  /** ISO weekday 1=Mon for weekly jobs. */
  weekday: number;
  enabled: boolean;
  templatePrompt?: string;
  scope: StandingJobScope;
  lastRunAt?: number;
  lastPeriodKey?: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface StandingJobRunRow {
  id: string;
  jobId: string;
  ownerId?: string;
  client: string;
  periodKey: string;
  at: number;
  title: string;
  digest: string;
  sections: { title: string; lines: string[] }[];
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}