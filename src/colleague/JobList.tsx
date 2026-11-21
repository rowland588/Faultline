/* THE JOB, AS THE PERSON WATCHES IT (21 November 2026, docs/LUNA-AGENT.md): the goal in their words and Luna's own steps, each saying
 * where it stands in a word — To do · Doing · Done · Blocked · Skipped — with what came of it beside it. Drawn in her turn while she
 * works (the step in hand marked), kept folded under her answer once she has finished, and on the context panel while the job is
 * the subject. The plan and its words are colleague/job; nothing here decides anything. */
import type { ColleagueJob } from '../capabilities/types';
import { JOB_WORD, jobOpen, jobStands, nextOf } from './job';

export function JobList({ job, live }: { job: ColleagueJob; /** She is working it now: the step in hand is marked. */ live?: boolean }) {
  const next = live ? nextOf(job) : 0;
  return (
    <div className="ai-job" data-ai-job data-job-open={jobOpen(job) ? '1' : '0'}>
      <p className="ai-job-h"><b>The job</b> <span className="sub" data-job-stands>{jobStands(job)}</span></p>
      <p className="ai-job-goal">{job.goal}</p>
      <ol className="ai-task-steps ai-job-steps">
        {job.steps.map((s, i) => (
          <li key={`${i}-${s.what}`} className={`ai-task-step ai-job-step is-${s.status}${i + 1 === next ? ' is-next' : ''}`} data-job-step={i + 1} data-job-status={s.status}>
            <span className="ai-task-word">{JOB_WORD[s.status]}</span>
            <span className="ai-task-body">{s.what}{s.note ? <span className="sub"> — {s.note}</span> : null}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
