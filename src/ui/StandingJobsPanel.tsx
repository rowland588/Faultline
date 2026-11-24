/* Standing jobs — weekly briefing for a customer (G7, docs/LUNA-AGENT.md). */
import { useEffect, useState } from 'react';
import { listStandingJobs, onDataChange, putStandingJob, removeStandingJob } from '../db';
import { useClientScope } from '../lib/activeClient';
import { customerKey } from '../lib/customers';
import { now, uid } from '../lib/ids';
import type { StandingJobRow } from '../lib/standingJob/types';
import { runStandingJob } from '../lib/standingJob/run';

const DAY = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function StandingJobsPanel() {
  const cs = useClientScope();
  const [jobs, setJobs] = useState<StandingJobRow[] | null>(null);
  const [said, setSaid] = useState('');
  const client = cs.filtering ? cs.client : (cs.clients[0] ?? '');
  const load = () => void listStandingJobs().then(setJobs);
  useEffect(() => { load(); return onDataChange(load); }, []);
  const mine = (jobs ?? []).filter(j => !client || customerKey(j.client) === customerKey(client));

  const add = async (schedule: 'weekly' | 'daily') => {
    if (!client) { setSaid('Choose a customer in the top bar first.'); return; }
    if (mine.some(j => j.kind === 'weekly_digest' && j.schedule === schedule)) { setSaid(`This customer already has a ${schedule} briefing.`); return; }
    const t = now();
    await putStandingJob({
      id: uid(), client, kind: 'weekly_digest', schedule, weekday: 1, enabled: true,
      templatePrompt: `Tell me what moved — ${schedule} briefing.`,
      scope: { picture: true, files: true, problems: true, variance: true },
      createdAt: t, updatedAt: t,
    });
    setSaid(`${schedule === 'weekly' ? 'Weekly' : 'Daily'} briefing added. It runs when Luna opens and is due.`);
    load();
  };

  const runNow = async (job: StandingJobRow) => {
    await runStandingJob({ ...job, lastPeriodKey: undefined });
    setSaid(`Briefing run for ${job.client} — open Luna to read it.`);
    load();
  };

  return (
    <div className="standing-jobs" data-standing-jobs>
      <p className="sub">A briefing of what moved — problems, files and the factory picture. Runs when Luna opens and is due, in London time.</p>
      {said && <p className="sub" role="status">{said}</p>}
      <ul className="lt-li">
        {mine.map(j => (
          <li key={j.id} className="standing-job-row">
            <b>{j.client}</b> · {j.schedule === 'weekly' ? `Every ${DAY[(j.weekday || 1) - 1]}` : 'Every day'}
            {j.lastPeriodKey ? <span className="sub"> · last {j.lastPeriodKey}</span> : <span className="sub"> · not run yet</span>}
            <div className="row-inline">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void runNow(j)}>Run now</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void putStandingJob({ ...j, enabled: !j.enabled, updatedAt: now() }).then(load)}>{j.enabled ? 'Pause' : 'Resume'}</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void removeStandingJob(j.id).then(() => { setSaid('Briefing removed.'); load(); })}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="row-inline"><button type="button" className="btn btn-primary btn-sm" disabled={!client} onClick={() => void add('weekly')}>Weekly</button><button type="button" className="btn btn-sm" disabled={!client} onClick={() => void add('daily')}>Daily</button></div>
    </div>
  );
}
