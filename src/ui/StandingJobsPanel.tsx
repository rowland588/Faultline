/* Standing jobs — weekly briefing for a customer (G7, docs/LUNA-AGENT.md). */
import { useEffect, useState } from 'react';
import { listStandingJobs, onDataChange, putStandingJob, removeStandingJob } from '../db';
import { useClientScope } from '../lib/activeClient';
import { customerKey } from '../lib/customers';
import { now, uid } from '../lib/ids';
import type { StandingJobRow } from '../lib/standingJob/types';
import { periodKey } from '../lib/standingJob/schedule';
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

  const addWeekly = async () => {
    if (!client) { setSaid('Choose a customer in the top bar first.'); return; }
    if (mine.some(j => j.kind === 'weekly_digest' && j.schedule === 'weekly')) { setSaid('This customer already has a weekly briefing.'); return; }
    const t = now();
    await putStandingJob({
      id: uid(), client, kind: 'weekly_digest', schedule: 'weekly', weekday: 1, enabled: true,
      templatePrompt: 'Tell me what moved — weekly briefing.',
      scope: { picture: true, files: true, problems: true, variance: true },
      createdAt: t, updatedAt: t,
    });
    setSaid('Weekly briefing added — it runs on this device when due (until Luna works shut on the server).');
    load();
  };

  const runNow = async (job: StandingJobRow) => {
    await runStandingJob({ ...job, lastPeriodKey: undefined });
    setSaid(`Briefing run for ${job.client} — open Luna to read it.`);
    load();
  };

  return (
    <div className="standing-jobs" data-standing-jobs>
      <p className="sub">Every Monday (London time), a briefing of what moved — open problems, file headlines, how the customer stands — worked in code, not invented.</p>
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
      <button type="button" className="btn btn-primary btn-sm" disabled={!client} onClick={() => void addWeekly()}>Add weekly briefing</button>
      <p className="sub">Due this period for {client || '—'}: {client ? periodKey('weekly') : '—'}</p>
    </div>
  );
}