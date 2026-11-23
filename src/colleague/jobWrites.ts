/* G5 — ONE YES FOR A PLAN (23 November 2026, docs/LUNA-AGENT.md). While a job is open, the writes it proposes are gathered on one
 * card when they come in together; once the person says yes, the rest of the job's writes (except consequential ones) go in as
 * receipts — nothing writes without a yes, and archive · continue customer and the like still ask every time. */
import type { ColleagueJob } from '../capabilities/types';
import { jobOpen } from './job';

/** Writes that always ask on their own card — even during a job, and never covered by job approval. */
export const JOB_WRITE_ALWAYS_ASK: ReadonlySet<string> = new Set([
  'archive_customer', 'continue_customer', 'work_within',
  'raise_problem', 'close_problem', 'reassign_problem', 'decide_hold', 'raise_hold',
  'start_project', 'link_to_project', 'replace_machine', 'add_department',
  'note_meaning', 'forget_meaning', 'remember_preference', 'start_visit', 'end_visit',
  'file_photo', 'make_record', 'start_measurement',
]);

export const jobWritesApproved = (j?: ColleagueJob | null): boolean => !!(j?.writesApproved && jobOpen(j));

/** May this write skip its own card because the job was approved once? */
export const jobWriteMayAuto = (j: ColleagueJob | null | undefined, name: string): boolean =>
  jobWritesApproved(j) && !JOB_WRITE_ALWAYS_ASK.has(name);

/** May this write be gathered with others on the job's one card this round? */
export const jobWriteMayBatch = (j: ColleagueJob | null | undefined, name: string): boolean =>
  !!(j && jobOpen(j) && !j.writesApproved && !JOB_WRITE_ALWAYS_ASK.has(name));

/** What the one card says — the goal, then each proposed change. */
export function jobBatchPreview(goal: string, items: readonly { title: string; preview: string }[]): string {
  const head = `For the job “${goal.trim()}”, Luna will:`;
  const lines = items.map((x, i) => `${i + 1}. ${x.title} — ${(x.preview || x.title).trim()}`);
  return [head, ...lines].join('\n');
}

/** The title on the card — one primary, as minimal v2 asks. */
export const JOB_BATCH_TITLE = 'Do what the job needs';