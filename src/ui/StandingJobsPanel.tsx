/* Standing jobs — weekly briefing for a customer (G7, docs/LUNA-AGENT.md). */
import { useEffect, useState } from 'react';
import { listStandingJobs, onDataChange, putStandingJob, removeStandingJob } from '../db';
import { useProfile } from '../cloud/admin';
import { lunaMailStatus, saveMailSchedule } from '../lib/mail/luna';
import { EMAIL } from '../lib/mail/people';
import { useClientScope } from '../lib/activeClient';
import { customerKey } from '../lib/customers';
import { now, uid } from '../lib/ids';
import type { StandingJobRow } from '../lib/standingJob/types';
import { runStandingJob } from '../lib/standingJob/run';

const DAY = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function StandingJobsPanel() {
  const cs = useClientScope();
  const { profile } = useProfile();
  const [editing, setEditing] = useState('');
  const [address, setAddress] = useState('');
  const [time, setTime] = useState('07:00');
  const [busy, setBusy] = useState(false);
  const [jobs, setJobs] = useState<StandingJobRow[] | null>(null);
  const [said, setSaid] = useState('');
  const client = cs.filtering ? cs.client : cs.clients.length === 1 ? cs.clients[0] : '';
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
    setSaid('Briefing added.');
    load();
  };

  const runNow = async (job: StandingJobRow) => {
    await runStandingJob({ ...job, lastPeriodKey: undefined });
    setSaid(`Briefing run for ${job.client} — open Luna to read it.`);
    load();
  };

  const save = async (job: StandingJobRow, remove = false) => {
    if (busy) return;
    setBusy(true);
    try {
      if (job.scope.email || mine.find(j => j.id === job.id)?.scope.email) {
        await saveMailSchedule(job, profile?.id ?? '', remove);
      } else if (remove) await removeStandingJob(job.id);
      else await putStandingJob(job);
      setEditing('');
      setSaid(remove ? 'Schedule removed.' : 'Schedule saved.');
      load();
    } catch (e) { setSaid((e as Error).message); } finally { setBusy(false); }
  };
  const editEmail = async (job: StandingJobRow) => {
    const to = address.trim();
    if (to && !EMAIL.test(to)) { setSaid('Enter one email address.'); return; }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) { setSaid('Choose a time.'); return; }
    if (to) {
      try { if (!(await lunaMailStatus(profile?.id)).ready) { setSaid('Finish Resend setup in Supabase to enable email.'); return; } }
      catch (e) { setSaid((e as Error).message); return; }
    }
    const [hour, minute] = time.split(':').map(Number);
    const scope = { ...job.scope };
    if (to) scope.email = { ...scope.email, to };
    else delete scope.email;
    await save({ ...job, scope, hour, minute, updatedAt: now() });
  };

  return (
    <div className="standing-jobs" data-standing-jobs>
      <p className="sub">Read the briefing in Luna. Add an email recipient to send a scheduled update while the app is closed. Times are in London.</p>
      {said && <p className="sub" role="status">{said}</p>}
      <ul className="lt-li">
        {mine.map(j => (
          <li key={j.id} className="standing-job-row">
            <b>{j.client}</b> · {j.schedule === 'weekly' ? `Every ${DAY[(j.weekday || 1) - 1]}` : 'Every day'}
            {' · ' + String(j.hour ?? 7).padStart(2, '0') + ':' + String(j.minute ?? 0).padStart(2, '0')}
            {j.scope.email && <p className="sub">{j.scope.email.subject || 'Line and problem briefing'} → {j.scope.email.to}</p>}
            {j.lastPeriodKey && <span className="sub">Last run {j.lastPeriodKey}{j.lastStatus && j.lastStatus !== 'queued' ? ' · ' + j.lastStatus : ''}</span>}
            {editing === j.id && <form onSubmit={e => { e.preventDefault(); void editEmail(j); }}>
              <label>Email recipient<input type="email" value={address} placeholder="name@company.com" onChange={e => setAddress(e.target.value)} /></label>
              <label>London time<input type="time" required value={time} onChange={e => setTime(e.target.value)} /></label>
              <p className="sub">{j.scope.email?.message || 'Sends this customer’s synced lines and open problems.'} Clear the address to turn email off.</p>
              <button className="btn btn-primary btn-sm" disabled={busy}>Save</button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditing('')}>Cancel</button>
            </form>}
            <div className="row-inline">
              {profile?.is_super && (!j.ownerId || j.ownerId === profile.id) && editing !== j.id && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAddress(j.scope.email?.to ?? ''); setTime(String(j.hour ?? 7).padStart(2, '0') + ':' + String(j.minute ?? 0).padStart(2, '0')); setEditing(j.id); }}>{j.scope.email ? 'Edit email' : 'Add email'}</button>}
              {!j.scope.email?.message && <button type="button" className="btn btn-ghost btn-sm" onClick={() => void runNow(j)}>Preview briefing</button>}
              <button type="button" disabled={busy} className="btn btn-ghost btn-sm" onClick={() => void save({ ...j, enabled: !j.enabled, updatedAt: now() })}>{j.enabled ? 'Pause' : 'Resume'}</button>
              <button type="button" disabled={busy} className="btn btn-ghost btn-sm" onClick={() => void save(j, true)}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="row-inline"><button type="button" className="btn btn-primary btn-sm" disabled={!client} onClick={() => void add('weekly')}>Weekly</button><button type="button" className="btn btn-sm" disabled={!client} onClick={() => void add('daily')}>Daily</button></div>
    </div>
  );
}
